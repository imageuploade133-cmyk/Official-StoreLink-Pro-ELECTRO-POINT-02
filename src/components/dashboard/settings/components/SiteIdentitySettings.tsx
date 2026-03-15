'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/ai/flows/image-upload-flow';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Building, Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';


const siteIdentitySchema = z.object({
  storeName: z.string().min(2, 'Store name is required.').max(50, 'Store name is too long.'),
  storeNameFontSize: z.coerce.number().min(12).max(72).optional(),
  invoiceLogoUrl: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
  storeLogoUrl: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
  storeLogoWidth: z.coerce.number().min(20).optional(),
  footerLogoWidth: z.coerce.number().min(20).optional(),
  footerDescription: z.string().max(200, "Description is too long (max 200 chars).").optional(),
  showFooterDescription: z.boolean().optional(),
});

type FormValues = z.infer<typeof siteIdentitySchema>;

interface SiteIdentitySettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
}

export function SiteIdentitySettings({ settingsData, isLoading }: SiteIdentitySettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(siteIdentitySchema),
    defaultValues: {
      storeName: 'StoreLink-Pro',
      storeNameFontSize: 24,
      invoiceLogoUrl: '',
      storeLogoUrl: '',
      storeLogoWidth: 120,
      footerLogoWidth: 100,
      footerDescription: '',
      showFooterDescription: true,
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        storeName: settingsData.storeName || 'StoreLink-Pro',
        storeNameFontSize: settingsData.storeNameFontSize || 24,
        invoiceLogoUrl: settingsData.invoiceLogoUrl || '',
        storeLogoUrl: settingsData.storeLogoUrl || '',
        storeLogoWidth: settingsData.storeLogoWidth || 120,
        footerLogoWidth: settingsData.footerLogoWidth || 100,
        footerDescription: settingsData.footerDescription || '',
        showFooterDescription: settingsData.showFooterDescription ?? true,
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Success', description: 'Site identity settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: 'invoiceLogoUrl' | 'storeLogoUrl') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit for logos
      toast({ variant: "destructive", title: "File too large", description: "Image must be smaller than 2MB." });
      return;
    }

    setUploadingField(fieldName);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue(fieldName, result.display_url, { shouldValidate: true });
        toast({ title: "Image Uploaded", description: `Your new logo has been set.` });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload image." });
      } finally {
        setUploadingField(null);
      }
    };
    reader.onerror = () => {
        toast({ variant: "destructive", title: "File Read Error" });
        setUploadingField(null);
    };
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" /> Site Identity</CardTitle>
            <CardDescription>Manage your public website's name, logos, and footer description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Public Store Name</FormLabel>
                    <FormControl>
                        <Input {...field} disabled={isSaving}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="storeNameFontSize"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Store Name Font Size ({field.value || 24}px)</FormLabel>
                            <FormControl>
                                <Input
                                type="number"
                                placeholder="e.g., 24"
                                min="12"
                                max="72"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                disabled={isSaving}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="invoiceLogoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Site/Invoice Logo</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://example.com/logo-large.png" disabled={isSaving || !!uploadingField} /></FormControl>
                         <Button asChild variant="outline" size="icon" disabled={isSaving || !!uploadingField}>
                            <label htmlFor="invoice-logo-upload" className="cursor-pointer">
                              {uploadingField === 'invoiceLogoUrl' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                              <span className="sr-only">Upload Invoice Logo</span>
                            </label>
                        </Button>
                        <Input id="invoice-logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'invoiceLogoUrl')} disabled={isSaving || !!uploadingField} />
                      </div>
                      <FormDescription>Used for the public website header and A4 invoices.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="storeLogoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Small Receipt Logo</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl><Input {...field} value={field.value ?? ''} placeholder="https://example.com/logo-small.png" disabled={isSaving || !!uploadingField} /></FormControl>
                        <Button asChild variant="outline" size="icon" disabled={isSaving || !!uploadingField}>
                            <label htmlFor="receipt-logo-upload" className="cursor-pointer">
                              {uploadingField === 'storeLogoUrl' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                              <span className="sr-only">Upload Receipt Logo</span>
                            </label>
                        </Button>
                        <Input id="receipt-logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'storeLogoUrl')} disabled={isSaving || !!uploadingField} />
                      </div>
                       <FormDescription>A smaller, often monochrome logo for thermal receipts.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="storeLogoWidth"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Header Logo Display Width ({field.value || 120}px)</FormLabel>
                    <FormControl>
                        <Input
                        type="number"
                        placeholder="e.g., 120"
                        min="20"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        disabled={isSaving || !!uploadingField}
                        />
                    </FormControl>
                    <FormDescription>Controls the width of the main logo in the public website header.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="footerLogoWidth"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Footer Logo Display Width ({field.value || 100}px)</FormLabel>
                    <FormControl>
                        <Input
                        type="number"
                        placeholder="e.g., 100"
                        min="20"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        disabled={isSaving || !!uploadingField}
                        />
                    </FormControl>
                    <FormDescription>Controls the width of the logo in the public website footer.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="footerDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Footer Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A short description of your store for the footer..." {...field} value={field.value ?? ''} disabled={isSaving}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="showFooterDescription"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Show Footer Description</FormLabel>
                    <FormDescription>
                      Display the short description below your logo in the site footer.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSaving}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving || !!uploadingField}>
              {(isSaving || !!uploadingField) && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Site Identity
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
