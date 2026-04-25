'use server';
/**
 * @fileOverview A background removal flow using the remove.bg API.
 *
 * - removeBackground - A function that handles removing the background from an image.
 * - RemoveBackgroundInput - The input type for the removeBackground function.
 * - RemoveBackgroundOutput - The return type for the removeBackground function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RemoveBackgroundInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RemoveBackgroundInput = z.infer<typeof RemoveBackgroundInputSchema>;

const RemoveBackgroundOutputSchema = z.object({
  display_url: z.string().describe('The URL of the image with background removed.'),
});
export type RemoveBackgroundOutput = z.infer<typeof RemoveBackgroundOutputSchema>;

export async function removeBackground(input: RemoveBackgroundInput): Promise<RemoveBackgroundOutput> {
  return removeBackgroundFlow(input);
}

const removeBackgroundFlow = ai.defineFlow(
  {
    name: 'removeBackgroundFlow',
    inputSchema: RemoveBackgroundInputSchema,
    outputSchema: RemoveBackgroundOutputSchema,
  },
  async (input) => {
    // The API expects the base64 data without the data URI prefix.
    const base64Data = input.imageDataUri.split(',')[1];

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.REMOVE_BG_API_KEY || '',
      },
      body: JSON.stringify({
        image_file_b64: base64Data,
        size: 'auto',
        type: 'auto',
        type_level: '1',
        format: 'auto',
        roi: '0,0,100,100',
        crop: false,
        crop_margin: '0',
        scale: 'original',
        position: 'original',
        channels: 'rgba',
        shadow: false,
        semitransparency: true,
        bg_color: '',
        bg_image_file: '',
    }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('remove.bg API Error:', errorText);
      throw new Error(`Failed to remove background. Status: ${response.status}. ${errorText}`);
    }

    // Get the image data from the response
    const imageBuffer = await response.arrayBuffer();
    const base64Result = Buffer.from(imageBuffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/png';

    // Return as a data URI URL
    const dataUri = `data:${mimeType};base64,${base64Result}`;

    return {
      display_url: dataUri,
    };
  }
);
