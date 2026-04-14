'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  ShoppingBag, 
  Loader2, 
  Save, 
  Upload, 
  X, 
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  Link2,
  Type,
  FileText
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { WebStoreGridSettings } from '@/components/dashboard/settings/WebStoreGridSettings';
import { ProductCardSizeSettings } from '@/components/dashboard/settings/ProductCardSizeSettings';

const shopSettingsSchema = z.object({
  shopBannerImageUrl: z.string().url().or(z.literal('')).optional(),
  shopProductsAlignment: z.enum(['left', 'center']).default('left'),
  shopCollectionTitle: z.string().min(1, 'Title is required').default('Shop Our Collection'),
  shopCollectionDescription: z.string().optional().default('Discover products that are crafted with quality and designed for life.'),
});

type FormValues = z.infer<typeof shopSettingsSchema>;

export default function ShopCollectionSettingsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const settingsRef = useMemo(
    () => (firestore ? doc(firestore, 'settings', 'global') : null),
    [firestore]
  );

  const { data: settingsData, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(shopSettingsSchema),
    defaultValues: {
      shopBannerImageUrl: '',
      shopProductsAlignment: 'left',
      shopCollectionTitle: 'Shop Our Collection',
      shopCollectionDescription: 'Discover products that are crafted with quality and designed for life.',
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        shopBannerImageUrl: settingsData.shopBannerImageUrl || '',
        shopProductsAlignment: settingsData.shopProductsAlignment || 'left',
        shopCollectionTitle: settingsData.shopCollectionTitle || 'Shop Our Collection',
        shopCollectionDescription: settingsData.shopCollectionDescription || 'Discover products that are crafted with quality and designed for life.',
      });
    }
  }, [settingsData, form]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please select an image smaller than 5MB.',
      });
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue('shopBannerImageUrl', result.display_url, { shouldValidate: true });
        toast({
          title: 'Banner Uploaded',
          description: 'Your shop banner image has been set.',
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: error.message || 'Could not upload image. Please try again.',
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read the selected file.' });
      setIsUploading(false);
    };
  };

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Success', description: 'Your shop collection settings have been saved.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isLoadingSettings) {
    return (
      <div className="space-y-6">
        <PageHeader icon={ShoppingBag} title="Shop Our Collection" description="Loading..." />
        <div className="space-y-6">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        icon={ShoppingBag}
        title="Shop Our Collection Settings"
        description="Customize the appearance of your main shop page"
      />

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <CardTitle className="text-lg font-bold">Banner & Layout</CardTitle>
                    <CardDescription className="mt-1">Configure the top banner and product alignment for the shop page</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="shopCollectionTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-base flex items-center gap-2">
                          <Type className="h-4 w-4 text-primary" />
                          Shop Page Title
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Shop Our Collection" {...field} />
                        </FormControl>
                        <FormDescription>
                          The main heading displayed at the top of your shop page
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shopCollectionDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-base flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Shop Page Description
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Discover products that are crafted..." {...field} />
                        </FormControl>
                        <FormDescription>
                          The subtext displayed below the title
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="shopBannerImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-base">Shop Banner Image</FormLabel>
                      <div className="space-y-4">
                        {field.value ? (
                          <div className="relative aspect-[21/9] w-full rounded-xl overflow-hidden border-2 border-primary/20 bg-muted group shadow-inner">
                            <img
                              src={field.value}
                              alt="Shop Banner"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => field.onChange('')}
                                className="gap-2 shadow-lg"
                              >
                                <X className="h-4 w-4" /> Remove Banner
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-[21/9] w-full rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-3 transition-colors">
                            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                                <ImageIcon className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">No banner image set</p>
                          </div>
                        )}
                        
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              disabled={isUploading}
                              className="shadow-sm"
                            >
                              <label htmlFor="banner-upload" className="cursor-pointer">
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                {field.value ? 'Change Banner' : 'Upload Banner'}
                              </label>
                            </Button>
                            <Input
                              id="banner-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                              disabled={isUploading}
                            />
                            <div className="flex-1 relative">
                              <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Or paste image URL here..."
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="h-9 pl-9"
                                disabled={isUploading}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded w-fit">Recommended: 1920x600px. Max 5MB.</p>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shopProductsAlignment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-base">Product Grid Alignment</FormLabel>
                      <div className="grid grid-cols-2 gap-4 max-w-md">
                        <button
                          type="button"
                          onClick={() => field.onChange('left')}
                          className={cn(
                            "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200",
                            field.value === 'left'
                              ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                              : 'border-slate-200 dark:border-slate-800 hover:border-primary/30 bg-card'
                          )}
                        >
                          <div className={cn(
                              "p-3 rounded-lg transition-colors",
                              field.value === 'left' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          )}>
                            <AlignLeft className="h-6 w-6" />
                          </div>
                          <span className="text-sm font-bold">Left Aligned</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange('center')}
                          className={cn(
                            "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200",
                            field.value === 'center'
                              ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                              : 'border-slate-200 dark:border-slate-800 hover:border-primary/30 bg-card'
                          )}
                        >
                          <div className={cn(
                              "p-3 rounded-lg transition-colors",
                              field.value === 'center' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          )}>
                            <AlignCenter className="h-6 w-6" />
                          </div>
                          <span className="text-sm font-bold">Center Aligned</span>
                        </button>
                      </div>
                      <FormDescription className="text-xs pt-2">
                        Choose how products are aligned on the shop page. Center alignment is recommended for shops with few categories.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button type="submit" disabled={isSaving} className="gap-2 min-w-[140px] shadow-lg">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <WebStoreGridSettings settingsData={settingsData} isLoading={isLoadingSettings} />
        <ProductCardSizeSettings settingsData={settingsData} isLoading={isLoadingSettings} />
      </div>
    </div>
  );
}
