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

// Client-side cache for upload config
let clientConfigCache: Record<string, { apiKey: string; storeName: string; timestamp: number }> = {};
const CLIENT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes on client

/**
 * Uploads an image to ImgBB.
 * Performs upload from client if in browser, or via server flow if on server.
 */
export async function uploadImage(input: UploadImageInput): Promise<UploadImageOutput> {
  // Check if we are on the client side
  if (typeof window !== 'undefined') {
    try {
      const cacheKey = input.storeId || 'GLOBAL';
      const now = Date.now();
      let config;

      // 1. Get config (check cache first)
      if (clientConfigCache[cacheKey] && (now - clientConfigCache[cacheKey].timestamp < CLIENT_CACHE_TTL)) {
        config = clientConfigCache[cacheKey];
      } else {
        config = await getUploadConfig(input.storeId);
        clientConfigCache[cacheKey] = { ...config, timestamp: now };
      }

      const { apiKey, storeName } = config;
      
      // 2. Prepare data
      const base64Data = input.imageDataUri.split(',')[1];
      const uniqueName = `${storeName} - ${input.storeId || 'GLOBAL'} - ${Date.now()}`;
      
      // 3. Upload directly from client to ImgBB (bypasses Vercel timeout)
      const formData = new FormData();
      formData.append('image', base64Data);
      formData.append('name', uniqueName);

      // Add a timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

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

        // 4. Log metadata back to server (non-blocking if possible)
        // We don't 'await' this so the UI can continue immediately
        logUploadMetadata({
          storeId: input.storeId || 'GLOBAL',
          storeName,
          imageUrl,
          deleteUrl
        }).catch(err => console.warn('Failed to log metadata (non-critical):', err));

        return {
          display_url: imageUrl,
        };
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Upload timed out after 60 seconds.');
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error('Client-side upload failed, falling back to server flow:', error);
      
      // If the image is too large, server flow might also fail with 413 or 504
      // but it's our last resort.
      // Only fallback if the payload isn't massive
      if (input.imageDataUri.length < 3 * 1024 * 1024) { 
        return uploadImageFlow(input);
      }
      
      throw error;
    }
  }

  // If on server, use the server flow directly
  return uploadImageFlow(input);
}
