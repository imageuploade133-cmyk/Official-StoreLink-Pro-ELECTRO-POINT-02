
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ShoppingBag, AlignLeft, AlignCenter } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const shopSettingsSchema = z.object({
  shopBannerImageUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  shopProductsAlignment: z.enum(['left', 'center']).default('left'),
});

type FormValues = z.infer<typeof shopSettingsSchema>;

interface ShopSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
}

export function ShopSettings({ settingsData, isLoading }: ShopSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(shopSettingsSchema),
    defaultValues: {
      shopBannerImageUrl: '',
      shopProductsAlignment: 'left',
    },
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        shopBannerImageUrl: settingsData.shopBannerImageUrl || '',
        shopProductsAlignment: settingsData.shopProductsAlignment || 'left',
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Success', description: 'Shop settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <Card className="shadow-lg border-none ring-1 ring-border overflow-hidden">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary"/> Shop Our Collection Settings
            </CardTitle>
            <CardDescription>
              Customize the appearance of your main shop page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-8">
            <FormField
              control={form.control}
              name="shopBannerImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Shop Banner Image URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com/banner.jpg" 
                      {...field} 
                      value={field.value ?? ''} 
                    />
                  </FormControl>
                  {field.value && (
                    <div className="mt-2 rounded-lg overflow-hidden border h-24">
                      <img src={field.value} alt="Banner Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <FormDescription className="text-xs">
                    This image will appear at the top of the "Shop Our Collection" page.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shopProductsAlignment"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-bold">Products Alignment</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-3 space-y-0">
                        <RadioGroupItem value="left" id="left" />
                        <Label htmlFor="left" className="font-normal flex items-center gap-2">
                          <AlignLeft className="h-4 w-4" /> Left Aligned (with sidebar)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 space-y-0">
                        <RadioGroupItem value="center" id="center" />
                        <Label htmlFor="center" className="font-normal flex items-center gap-2">
                          <AlignCenter className="h-4 w-4" /> Centered (full width, no sidebar)
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription className="text-xs">
                    Choose how products are aligned on the shop page. Centered alignment will hide the sidebar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-6">
            <Button type="submit" disabled={isSaving} className="font-bold h-11 px-8">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Shop Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
