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
    const settingsRef = doc(firestore, 'settings', 'global');
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
        throw new Error('Global settings document not found in Firestore.');
    }
    
    const settings = settingsSnap.data() as AppSettings;
    const apiKey = settings.imgbbApiKey;

    if (!apiKey) {
      throw new Error('ImgBB API Key is not configured. Please set it in the application settings.');
    }

    // The API expects the base64 data without the data URI prefix.
    const base64Data = input.imageDataUri.split(',')[1];
    
    // Generate a unique name to avoid filename collisions on the server.
    const uniqueName = `image-${Date.now()}`;

    const formData = new FormData();
    formData.append('image', base64Data);
    formData.append('name', uniqueName);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
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
