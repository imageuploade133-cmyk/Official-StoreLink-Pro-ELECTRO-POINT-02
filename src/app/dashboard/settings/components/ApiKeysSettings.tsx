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
import { Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';

const apiKeysSchema = z.object({
  imgbbApiKey: z.string().optional(),
});

type FormValues = z.infer<typeof apiKeysSchema>;

interface ApiKeysSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

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
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (storeId) {
        await saveStoreSettings(firestore, storeId, { imgbbApiKey: data.imgbbApiKey });
      } else {
        await saveGlobalSettings(firestore, { imgbbApiKey: data.imgbbApiKey });
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
                <KeyRound className="h-4 w-4" /> Global Image Upload System
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A universal image upload system is active for all stores. Images are automatically organized by store name and ID.
              </p>
            </div>
            
            <FormField
              control={form.control}
              name="imgbbApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ImgBB API Key</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type={showApiKey ? 'text' : 'password'} 
                        placeholder="0d1a390cb385b632d952db08a3479005" 
                        {...field} 
                        value={field.value || '0d1a390cb385b632d952db08a3479005'}
                        readOnly
                        className="bg-muted"
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
                    This is the global API key used for all stores. Manual setup is not required.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={true} className="opacity-50 cursor-not-allowed">
              Save API Keys (Locked)
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
