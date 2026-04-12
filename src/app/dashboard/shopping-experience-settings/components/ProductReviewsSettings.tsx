'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Star, Info } from 'lucide-react';

export function ProductReviewsSettings() {
  const { control } = useFormContext();

  return (
    <Card className="shadow-lg border-none ring-1 ring-border">
      <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/40">
            <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Product Reviews & Ratings</CardTitle>
            <CardDescription>Display customer review ratings on your store</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="space-y-6">
          <FormField
            control={control}
            name="showProductReviews"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/20">
                <div className="space-y-0.5 flex-1">
                  <FormLabel className="text-base font-bold">
                    Enable Product Reviews
                  </FormLabel>
                  <FormDescription className="text-sm">
                    Allow customers to leave reviews and ratings on product pages
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="showReviewRatingOnCard"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/20">
                <div className="space-y-0.5 flex-1">
                  <FormLabel className="text-base font-bold">
                    Show Rating on Product Cards
                  </FormLabel>
                  <FormDescription className="text-sm">
                    Display star ratings and review count on product cards
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-2">How Product Ratings Work</p>
              <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                <li>Ratings are calculated from customer reviews</li>
                <li>Star ratings build trust and increase conversions</li>
                <li>Reviews can be moderated before appearing</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

