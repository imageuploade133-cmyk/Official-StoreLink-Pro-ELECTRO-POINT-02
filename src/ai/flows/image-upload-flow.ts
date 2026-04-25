// @ts-nocheck
/**
 * @fileOverview An image upload flow using the ImgBB API.
 * 
 * This version is optimized to perform the actual upload from the client
 * to avoid Vercel's Server Action timeout and body size limits.
 */

import { z } from 'zod';
import { getUploadConfig, logUploadMetadata, uploadImageFlow } from './image-upload-server';

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

/**
 * Uploads an image to ImgBB.
 * Performs upload from client if in browser, or via server flow if on server.
 */
export async function uploadImage(input: UploadImageInput): Promise<UploadImageOutput> {
  // Check if we are on the client side
  if (typeof window !== 'undefined') {
    try {
      // 1. Get config from server (fast)
      const { apiKey, storeName } = await getUploadConfig(input.storeId);
      
      // 2. Prepare data
      const base64Data = input.imageDataUri.split(',')[1];
      const uniqueName = `${storeName} - ${input.storeId || 'GLOBAL'} - ${Date.now()}`;
      
      // 3. Upload directly from client to ImgBB (bypasses Vercel timeout)
      const formData = new FormData();
      formData.append('image', base64Data);
      formData.append('name', uniqueName);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ImgBB Client Upload Error:', errorText);
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const jsonResponse = await response.json();
      if (!jsonResponse.success) {
        throw new Error('ImgBB API returned success:false');
      }

      const imageUrl = jsonResponse.data.display_url;
      const deleteUrl = jsonResponse.data.delete_url;

      // 4. Log metadata back to server (async, don't wait for it if not necessary, 
      // but here we wait to ensure consistency)
      await logUploadMetadata({
        storeId: input.storeId || 'GLOBAL',
        storeName,
        imageUrl,
        deleteUrl
      }).catch(err => console.warn('Failed to log metadata:', err));

      return {
        display_url: imageUrl,
      };
    } catch (error: any) {
      console.error('Client-side upload failed, falling back to server flow:', error);
      // Fallback to server flow if client upload fails for some reason (e.g., CORS)
      return uploadImageFlow(input);
    }
  }

  // If on server, use the server flow directly
  return uploadImageFlow(input);
}
