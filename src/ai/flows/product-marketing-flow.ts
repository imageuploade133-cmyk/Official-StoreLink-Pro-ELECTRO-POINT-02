
'use server';
/**
 * @fileOverview A professional marketing content generator for products.
 *
 * - generateMarketingContent - Generates product descriptions and selling points.
 * - MarketingInput - The input type for the flow.
 * - MarketingOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MarketingInputSchema = z.object({
  name: z.string().describe('The name of the product.'),
  categoryName: z.string().describe('The category the product belongs to.'),
});
export type MarketingInput = z.infer<typeof MarketingInputSchema>;

const MarketingOutputSchema = z.object({
  description: z.string().describe('A high-end, engaging product description for a public website.'),
  aiHint: z.string().describe('One or two high-quality image keywords for Unsplash (e.g., "silk dress", "modern armchair").'),
});
export type MarketingOutput = z.infer<typeof MarketingOutputSchema>;

export const maxDuration = 60;

export async function generateMarketingContent(input: MarketingInput): Promise<MarketingOutput> {
  return productMarketingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productMarketingPrompt',
  input: { schema: MarketingInputSchema },
  output: { schema: MarketingOutputSchema },
  prompt: `You are a high-end luxury e-commerce copywriter.
  
Generate a compelling, professional, and elegant product description for the following product.
Focus on quality, lifestyle integration, and emotional appeal. Use at least 3-4 sentences.

Also, provide one or two perfect search keywords for an AI image generator to find a beautiful photo of this product.

Product Name: {{{name}}}
Category: {{{categoryName}}}`,
});

const productMarketingFlow = ai.defineFlow(
  {
    name: 'productMarketingFlow',
    inputSchema: MarketingInputSchema,
    outputSchema: MarketingOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('Failed to generate marketing content.');
    return output;
  }
);
