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
          <CardContent>
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
                        placeholder="Enter your ImgBB API key" 
                        {...field} 
                        disabled={isSaving}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowApiKey(!showApiKey)}
                      disabled={isSaving}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showApiKey ? 'Hide API Key' : 'Show API Key'}</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save API Keys
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
