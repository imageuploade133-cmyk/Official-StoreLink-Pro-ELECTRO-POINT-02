'use server';
/**
 * @fileOverview An image upload flow using the ImgBB API.
 *
 * - uploadImage - A function that handles uploading an image.
 * - UploadImageInput - The input type for the uploadImage function.
 * - UploadImageOutput - The return type for the uploadImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeFirebase } from '@/firebase/init';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { AppSettings } from '@/lib/types';


const GLOBAL_IMGBB_API_KEY = '0d1a390cb385b632d952db08a3479005';

const UploadImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  storeId: z.string().optional().describe("Optional store ID to use store-specific ImgBB API key."),
});
export type UploadImageInput = z.infer<typeof UploadImageInputSchema>;

const UploadImageOutputSchema = z.object({
  display_url: z.string().describe('The URL of the uploaded image.'),
});
export type UploadImageOutput = z.infer<typeof UploadImageOutputSchema>;

export async function uploadImage(input: UploadImageInput): Promise<UploadImageOutput> {
  return uploadImageFlow(input);
}

const uploadImageFlow = ai.defineFlow(
  {
    name: 'uploadImageFlow',
    inputSchema: UploadImageInputSchema,
    outputSchema: UploadImageOutputSchema,
  },
  async (input) => {
    
    // Initialize firebase to get firestore instance
    const { firestore, firebaseApp } = initializeFirebase();
    let targetFirestore = firestore;
    
    // Start with the hardcoded global API key
    let apiKey = GLOBAL_IMGBB_API_KEY;

    // Try to get the global API key from Firestore if it exists
    try {
      const globalSettingsRef = doc(firestore, 'settings', 'global');
      const globalSettingsSnap = await getDoc(globalSettingsRef);
      if (globalSettingsSnap.exists() && globalSettingsSnap.data().imgbbApiKey) {
        apiKey = globalSettingsSnap.data().imgbbApiKey;
      }
    } catch (error) {
      console.warn('Failed to fetch global API key from Firestore, using hardcoded default:', error);
    }

    let storeName = 'Default Store';
    let storeId = input.storeId || 'GLOBAL';

    // Fetch store name and check for store-specific API key if storeId is provided
    if (input.storeId) {
      try {
        // 1. Check current store settings path
        const settingsRef = doc(firestore, 'stores', input.storeId, 'settings', 'config');
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists() && settingsSnap.data().imgbbApiKey) {
          apiKey = settingsSnap.data().imgbbApiKey;
        } else {
          // 2. Check old store settings path for backward compatibility
          const oldSettingsRef = doc(firestore, 'settings', input.storeId);
          const oldSettingsSnap = await getDoc(oldSettingsRef);
          if (oldSettingsSnap.exists() && oldSettingsSnap.data().imgbbApiKey) {
            apiKey = oldSettingsSnap.data().imgbbApiKey;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch store-specific API key, falling back to global:', error);
      }

      try {
        const storeRef = doc(firestore, 'stores', input.storeId);
        const storeSnap = await getDoc(storeRef);
        if (storeSnap.exists()) {
          const storeData = storeSnap.data();
          storeName = storeData.name || 'Unnamed Store';
          
          // If the store uses a separate database, we should save the metadata there
          const databaseId = storeData.databaseId;
          if (databaseId && databaseId !== '(default)') {
            try {
              const { getFirestore } = await import('firebase/firestore');
              targetFirestore = getFirestore(firebaseApp, databaseId);
            } catch (dbError) {
              console.warn('Failed to initialize separate database firestore, falling back to default:', dbError);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch store info:', error);
      }
    }

    // The API expects the base64 data without the data URI prefix.
    const base64Data = input.imageDataUri.split(',')[1];
    
    // Generate a descriptive unique name using store info to organize images on ImgBB
    const uniqueName = `${storeName} - ${storeId} - ${Date.now()}`;

    const body = new URLSearchParams();
    body.append('image', base64Data);
    body.append('name', uniqueName); // Add the unique name to the request

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ImgBB API Error:', errorText);
      throw new Error(`Failed to upload image. Status: ${response.status}`);
    }

    const jsonResponse = await response.json();

    if (!jsonResponse.success) {
      console.error('ImgBB API Error:', jsonResponse);
      throw new Error('ImgBB API returned an error.');
    }

    const imageUrl = jsonResponse.data.display_url;
    const deleteUrl = jsonResponse.data.delete_url;

    // Save metadata in database as requested
    try {
      const uploadMetadata = {
        storeName: storeName,
        storeId: storeId,
        imageUrl: imageUrl,
        deleteUrl: deleteUrl,
        uploadedAt: serverTimestamp(),
      };

      // Each store manages its own uploaded images
      const uploadsRef = collection(targetFirestore, 'stores', storeId, 'uploads');
      await addDoc(uploadsRef, uploadMetadata);
      
      // Also save to a global collection for universal tracking if needed, 
      // but following the requirement "Each store should only manage/view its own uploaded images"
      // we primarily use the subcollection.
    } catch (dbError) {
      console.error('Failed to save image metadata:', dbError);
      // We don't throw here to avoid failing the upload if only metadata saving fails,
      // but given the requirements, it might be better to ensure it's saved.
    }

    return {
      display_url: imageUrl,
    };
  }
);
