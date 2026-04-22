'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, BadgePercent } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const taxSettingsSchema = z.object({
  enableTax: z.boolean().default(false),
  taxName: z.string().min(1, "Tax name is required").default("VAT"),
  taxRate: z.coerce.number().min(0, "Tax rate cannot be negative").max(100, "Tax rate cannot exceed 100%").default(0),
});

type FormValues = z.infer<typeof taxSettingsSchema>;

interface TaxSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string;
}

export function TaxSettings({ settingsData, isLoading, storeId }: TaxSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { store, staffMember } = useAuth();
  const currentStoreId = storeId || staffMember?.store_id || store?.id;
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(taxSettingsSchema),
    defaultValues: {
      enableTax: false,
      taxName: 'VAT',
      taxRate: 0,
    },
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        enableTax: settingsData.enableTax ?? false,
        taxName: settingsData.taxName || 'VAT',
        taxRate: settingsData.taxRate || 0,
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (currentStoreId) {
          await saveStoreSettings(firestore, currentStoreId, data);
      } else {
          await saveGlobalSettings(firestore, data);
      }
      
      toast({ title: 'Success', description: 'Tax settings have been updated.' });
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
              <BadgePercent className="h-5 w-5 text-primary"/> Tax & VAT Settings
            </CardTitle>
            <CardDescription>Configure tax and VAT for your public store and POS system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-8">
            <FormField
              control={form.control}
              name="enableTax"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-4 bg-muted/30 rounded-xl border border-dashed">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-bold">Enable Tax/VAT</FormLabel>
                    <FormDescription>
                      If enabled, tax will be applied to all sales in POS and Public Store.
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

            {form.watch('enableTax') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="taxName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Tax Name</FormLabel>
                      <FormControl>
                        <Input placeholder="VAT, GST, Service Tax, etc." {...field} />
                      </FormControl>
                      <FormDescription>The label that will appear on receipts and checkout.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormDescription>The percentage of tax to be applied.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-6">
            <Button type="submit" disabled={isSaving} className="font-bold h-11 px-8">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Tax Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
