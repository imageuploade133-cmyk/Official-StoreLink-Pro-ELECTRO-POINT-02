// @ts-nocheck
'use server';

import { ai } from '../genkit';
import { z } from 'genkit';
import { initializeFirebase } from '../../firebase/init';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const GLOBAL_IMGBB_API_KEY = '0d1a390cb385b632d952db08a3479005';

export async function getUploadConfig(storeId?: string) {
    const { firestore } = initializeFirebase();
    let apiKey = GLOBAL_IMGBB_API_KEY;
    let storeName = 'Default Store';

    const lookups = [];
    const globalSettingsRef = doc(firestore, 'settings', 'global');
    lookups.push(getDoc(globalSettingsRef));

    if (storeId && storeId !== 'GLOBAL') {
        const settingsRef = doc(firestore, 'stores', storeId, 'settings', 'config');
        lookups.push(getDoc(settingsRef));
        
        const oldSettingsRef = doc(firestore, 'settings', storeId);
        lookups.push(getDoc(oldSettingsRef));
        
        const storeRef = doc(firestore, 'stores', storeId);
        lookups.push(getDoc(storeRef));
    }

    try {
        const results = await Promise.all(lookups);
        const globalSettingsSnap = results[0];
        
        if (globalSettingsSnap?.exists() && globalSettingsSnap.data()?.imgbbApiKey) {
            apiKey = globalSettingsSnap.data()?.imgbbApiKey;
        }

        if (storeId && storeId !== 'GLOBAL' && results.length >= 4) {
            const settingsSnap = results[1];
            const oldSettingsSnap = results[2];
            const storeSnap = results[3];

            if (settingsSnap?.exists() && settingsSnap.data()?.imgbbApiKey) {
                apiKey = settingsSnap.data()?.imgbbApiKey;
            } else if (oldSettingsSnap?.exists() && oldSettingsSnap.data()?.imgbbApiKey) {
                apiKey = oldSettingsSnap.data()?.imgbbApiKey;
            }

            if (storeSnap?.exists()) {
                storeName = storeSnap.data()?.name || 'Unnamed Store';
            }
        }
    } catch (error) {
        console.warn('Error during Firestore lookups in getUploadConfig:', error);
    }

    return { apiKey, storeName };
}

export async function logUploadMetadata(data: {
    storeId: string;
    storeName: string;
    imageUrl: string;
    deleteUrl: string;
}) {
    const { firestore, firebaseApp } = initializeFirebase();
    let targetFirestore = firestore;

    try {
        // If we need to check for a separate database
        if (data.storeId && data.storeId !== 'GLOBAL') {
            const storeRef = doc(firestore, 'stores', data.storeId);
            const storeSnap = await getDoc(storeRef);
            if (storeSnap.exists()) {
                const databaseId = storeSnap.data()?.databaseId;
                if (databaseId && databaseId !== '(default)') {
                    const { getFirestore } = await import('firebase/firestore');
                    targetFirestore = getFirestore(firebaseApp, databaseId);
                }
            }
        }

        const uploadMetadata = {
            storeName: data.storeName,
            storeId: data.storeId,
            imageUrl: data.imageUrl,
            deleteUrl: data.deleteUrl,
            uploadedAt: serverTimestamp(),
        };

        const uploadsRef = collection(targetFirestore, 'stores', data.storeId, 'uploads');
        await addDoc(uploadsRef, uploadMetadata);
    } catch (error) {
        console.error('Failed to save image metadata:', error);
    }
}

// Keep the Genkit flow for server-side usage if needed
const UploadImageInputSchema = z.object({
  imageDataUri: z.string(),
  storeId: z.string().optional(),
});

const UploadImageOutputSchema = z.object({
  display_url: z.string(),
});

export const uploadImageFlow = ai.defineFlow(
  {
    name: 'uploadImageFlow',
    inputSchema: UploadImageInputSchema,
    outputSchema: UploadImageOutputSchema,
  },
  async (input) => {
    const { apiKey, storeName } = await getUploadConfig(input.storeId);
    
    const base64Data = input.imageDataUri.split(',')[1];
    const uniqueName = `${storeName} - ${input.storeId || 'GLOBAL'} - ${Date.now()}`;

    const formData = new FormData();
    formData.append('image', base64Data);
    formData.append('name', uniqueName);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload image. Status: ${response.status} - ${errorText}`);
    }

    const jsonResponse = await response.json();
    if (!jsonResponse.success) {
      throw new Error('ImgBB API returned an error.');
    }

    const imageUrl = jsonResponse.data.display_url;
    const deleteUrl = jsonResponse.data.delete_url;

    await logUploadMetadata({
        storeId: input.storeId || 'GLOBAL',
        storeName,
        imageUrl,
        deleteUrl
    });

    return { display_url: imageUrl };
  }
);
