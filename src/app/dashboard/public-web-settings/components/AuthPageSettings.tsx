'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/ai/flows/image-upload-flow';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Image as ImageIcon, Upload, RotateCcw } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';

const authPageSchema = z.object({
  loginImageUrl: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
});

type FormValues = z.infer<typeof authPageSchema>;

interface AuthPageSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

const defaultAuthPageValues: FormValues = {
  loginImageUrl: '',
};

export function AuthPageSettings({ settingsData, isLoading, storeId }: AuthPageSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const loginImagePlaceholder = placeholderImages['login-background'];

  const form = useForm<FormValues>({
    resolver: zodResolver(authPageSchema),
    defaultValues: defaultAuthPageValues
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        loginImageUrl: settingsData.loginImageUrl || '',
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (storeId) {
        await saveStoreSettings(firestore, storeId, data);
      } else {
        await saveGlobalSettings(firestore, data);
      }
      toast({ title: 'Success', description: 'Authentication page settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    form.reset(defaultAuthPageValues);
    toast({ title: 'Settings Reset', description: 'Authentication page settings have been reset to default. Click "Save Changes" to save.' });
  };
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ variant: "destructive", title: "File too large", description: "Image must be smaller than 5MB." });
      return;
    }

    setIsUploading(true);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri, storeId });
        form.setValue('loginImageUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Image Uploaded", description: `New background image has been set.` });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload image." });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
        toast({ variant: "destructive", title: "File Read Error" });
        setIsUploading(false);
    };
  };

  const loginImageUrl = form.watch('loginImageUrl');
  const displayImage = (loginImageUrl && loginImageUrl.startsWith('http'))
    ? loginImageUrl
    : loginImagePlaceholder.src;


  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Authentication Page Background</CardTitle>
            <CardDescription>Manage the background image for your public-facing login and sign-up pages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="loginImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Background Image</FormLabel>
                  <div className="flex items-start gap-4">
                      <Image 
                        src={displayImage}
                        alt="Login page background preview"
                        width={150}
                        height={100}
                        className="rounded-md object-cover border"
                      />
                      <div className="flex-grow space-y-2">
                        <div className="flex items-center gap-2">
                          <FormControl><Input {...field} value={field.value || ''} placeholder="https://example.com/background.png" disabled={isSaving || isUploading} /></FormControl>
                           <Button asChild variant="outline" size="icon" disabled={isSaving || isUploading}>
                              <label htmlFor="login-image-upload" className="cursor-pointer">
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                                <span className="sr-only">Upload Login Background</span>
                              </label>
                          </Button>
                           <Input id="login-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e)} disabled={isSaving || isUploading} />
                        </div>
                        <FormMessage />
                      </div>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between">
            <Button type="submit" disabled={isSaving || isUploading}>
              {(isSaving || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving || isUploading}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset to Default
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
