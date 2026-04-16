'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Maximize, Printer, FileText } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const logoSizeSchema = z.object({
  invoiceLogoHeight: z.coerce.number().min(20).max(150).optional(),
  terminalLogoHeight: z.coerce.number().min(20).max(150).optional(),
});

type FormValues = z.infer<typeof logoSizeSchema>;

interface LogoSizeSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

export function LogoSizeSettings({ settingsData, isLoading, storeId }: LogoSizeSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(logoSizeSchema),
    defaultValues: {
      invoiceLogoHeight: 50,
      terminalLogoHeight: 60,
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        invoiceLogoHeight: settingsData.invoiceLogoHeight || 50,
        terminalLogoHeight: settingsData.terminalLogoHeight || 60,
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
      toast({ title: 'Success', description: 'Logo size settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Maximize className="h-5 w-5" /> Receipt Logo Sizes</CardTitle>
            <CardDescription>Adjust the height of your logo on printed and digital documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <FormField
              control={form.control}
              name="invoiceLogoHeight"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <FormLabel>A4 Invoice Logo Height ({field.value}px)</FormLabel>
                  </div>
                  <FormControl>
                    <Slider
                      value={[field.value || 50]}
                      onValueChange={(value) => field.onChange(value[0])}
                      min={20}
                      max={150}
                      step={1}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">Controls the logo size on A4 documents and PDFs.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="terminalLogoHeight"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2 mb-2">
                    <Printer className="h-4 w-4 text-muted-foreground" />
                    <FormLabel>Terminal Receipt Logo Height ({field.value}px)</FormLabel>
                  </div>
                  <FormControl>
                    <Slider
                      value={[field.value || 60]}
                      onValueChange={(value) => field.onChange(value[0])}
                      min={20}
                      max={150}
                      step={1}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">Controls the logo size on small thermal printer receipts.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Logo Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
