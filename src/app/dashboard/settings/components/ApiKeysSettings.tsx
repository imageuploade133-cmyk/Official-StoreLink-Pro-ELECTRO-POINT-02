'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Loader2, KeyRound, Eye, EyeOff, RotateCcw } from 'lucide-react';

const apiKeysSchema = z.object({
  imgbbApiKey: z.string().optional(),
  integrationApiKey: z.string().optional(),
});

type FormValues = z.infer<typeof apiKeysSchema>;

interface ApiKeysSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

const GLOBAL_DEFAULT_KEY = '0d1a390cb385b632d952db08a3479005';

export function ApiKeysSettings({ settingsData, isLoading, storeId }: ApiKeysSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(apiKeysSchema),
    defaultValues: {
      imgbbApiKey: '',
    },
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        imgbbApiKey: settingsData.imgbbApiKey || '',
        integrationApiKey: settingsData.integrationApiKey || '',
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (storeId) {
        await saveStoreSettings(firestore, storeId, { 
          imgbbApiKey: data.imgbbApiKey,
          integrationApiKey: data.integrationApiKey
        });
      } else {
        await saveGlobalSettings(firestore, { 
          imgbbApiKey: data.imgbbApiKey,
          integrationApiKey: data.integrationApiKey
        });
      }
      toast({ title: 'Success', description: 'API Key settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update API key settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5"/> API Keys</CardTitle>
            <CardDescription>Manage third-party API keys for your application integrations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
              <h4 className="text-sm font-bold text-primary flex items-center gap-2 mb-1">
                <KeyRound className="h-4 w-4" /> {storeId ? "Image Upload System" : "Global Image Upload System"}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {storeId 
                  ? "You can use your own ImgBB API key for image uploads. If not provided, the system will use the global default."
                  : "A universal image upload system is active for all stores. Images are automatically organized by store name and ID."}
              </p>
            </div>
            
            <FormField
              control={form.control}
              name="integrationApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-bold">
                      v9 POS Integration API Key
                      <span className="text-[10px] font-normal px-2 py-0.5 bg-primary/10 rounded-full">Secure</span>
                    </div>
                    {field.value && (
                       <Button 
                       type="button"
                       variant="ghost" 
                       size="sm" 
                       className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-primary"
                       onClick={() => {
                         const newKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                         form.setValue('integrationApiKey', newKey);
                       }}
                     >
                       Regenerate
                     </Button>
                    )}
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        placeholder="Enter or generate a secure key for v9 POS sync" 
                        {...field} 
                      />
                    </FormControl>
                    {!field.value && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                        onClick={() => {
                          const newKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                          form.setValue('integrationApiKey', newKey);
                        }}
                      >
                        Generate Key
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Use this key in your v9 POS settings to connect this store. Keep it secret.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />

            <FormField
              control={form.control}
              name="imgbbApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      ImgBB API Key
                      {storeId && <span className="text-[10px] font-normal px-2 py-0.5 bg-muted rounded-full">Optional</span>}
                    </div>
                    {storeId && field.value && (
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-primary"
                        onClick={() => form.setValue('imgbbApiKey', '')}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset to default
                      </Button>
                    )}
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type={showApiKey ? 'text' : 'password'} 
                        placeholder={storeId ? "Leave empty to use global default" : GLOBAL_DEFAULT_KEY} 
                        {...field} 
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showApiKey ? 'Hide API Key' : 'Show API Key'}</span>
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {storeId 
                      ? "Your images will be uploaded to your own ImgBB account if you provide a key."
                      : `Default global key: ${GLOBAL_DEFAULT_KEY}. This is used when a store doesn't provide its own.`}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save API Keys'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
