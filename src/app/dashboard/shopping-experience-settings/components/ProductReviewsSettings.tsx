'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Firestore } from 'firebase/firestore';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Star, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const reviewsSchema = z.object({
  showProductReviews: z.boolean().default(true),
  showReviewRatingOnCard: z.boolean().default(true),
});

type FormValues = z.infer<typeof reviewsSchema>;

interface ProductReviewsSettingsProps {
  settingsData: AppSettings | null;
  firestore: Firestore;
}

export function ProductReviewsSettings({
  settingsData,
  firestore,
}: ProductReviewsSettingsProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(reviewsSchema),
    defaultValues: {
      showProductReviews: true,
      showReviewRatingOnCard: true,
    },
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        showProductReviews: settingsData.showProductReviews ?? true,
        showReviewRatingOnCard: settingsData.showReviewRatingOnCard ?? true,
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;

    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({
        title: 'Settings Updated',
        description: 'Product review settings have been saved.',
      });
    } catch (error) {
      console.error('Error saving review settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update review settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
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
              control={form.control}
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

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={isSaving}
                size="lg"
                className="min-w-[200px] h-12 text-base font-bold"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Saving...' : <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
