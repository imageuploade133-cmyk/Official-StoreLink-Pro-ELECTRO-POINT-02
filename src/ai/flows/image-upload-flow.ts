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
import { doc, getDoc } from 'firebase/firestore';
import type { AppSettings } from '@/lib/types';


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
    const { firestore } = initializeFirebase();
    
    let apiKey = null;

    // 1. Try to get store-specific API key if storeId is provided
    if (input.storeId) {
      // Try new location
      const storeSettingsRef = doc(firestore, 'stores', input.storeId, 'settings', 'config');
      const storeSettingsSnap = await getDoc(storeSettingsRef);
      if (storeSettingsSnap.exists()) {
        apiKey = storeSettingsSnap.data().imgbbApiKey;
      }

      // If not found in new location, try old location
      if (!apiKey) {
        const oldStoreSettingsRef = doc(firestore, 'settings', input.storeId);
        const oldStoreSettingsSnap = await getDoc(oldStoreSettingsRef);
        if (oldStoreSettingsSnap.exists()) {
          apiKey = oldStoreSettingsSnap.data().imgbbApiKey;
        }
      }
    }

    // 2. Fallback to global API key if no store-specific key was found
    if (!apiKey) {
      const settingsRef = doc(firestore, 'settings', 'global');
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const settings = settingsSnap.data() as AppSettings;
        apiKey = settings.imgbbApiKey;
      }
    }

    if (!apiKey) {
      throw new Error('ImgBB API Key is not configured. Please set it in the application settings.');
    }

    // The API expects the base64 data without the data URI prefix.
    const base64Data = input.imageDataUri.split(',')[1];
    
    // Generate a unique name to avoid filename collisions on the server.
    const uniqueName = `image-${Date.now()}`;

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

    return {
      display_url: jsonResponse.data.display_url,
    };
  }
);
