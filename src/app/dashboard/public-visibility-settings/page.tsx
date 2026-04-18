'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { EyeOff, Loader2, Save, ListChecks, Truck, Star, Info, ShieldCheck } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const visibilitySchema = z.object({
  globalShowTechnicalSpecs: z.boolean().default(true),
  globalShowLogisticsInfo: z.boolean().default(true),
  globalShowVerifiedReviews: z.boolean().default(true),
});

type FormValues = z.infer<typeof visibilitySchema>;

export default function GlobalVisibilitySettingsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const settingsRef = useMemo(
    () => {
        if (!firestore) return null;
        if (currentStoreId) {
            return doc(firestore, 'stores', currentStoreId, 'settings', 'config');
        }
        return doc(firestore, 'settings', 'global');
    },
    [firestore, currentStoreId]
  );

  // Fallback for old stores
  const oldSettingsRef = useMemo(
    () => (firestore && currentStoreId) ? doc(firestore, 'settings', currentStoreId) : null,
    [firestore, currentStoreId]
  );

  const { data: mainSettingsData, isLoading: isLoadingMainSettings } = useDoc<AppSettings>(settingsRef);
  const { data: oldSettingsData, isLoading: isLoadingOldSettings } = useDoc<AppSettings>(oldSettingsRef);

  const settingsData = mainSettingsData || oldSettingsData;
  const isLoadingSettings = isLoadingMainSettings && (currentStoreId ? isLoadingOldSettings : true);

  const form = useForm<FormValues>({
    resolver: zodResolver(visibilitySchema),
    defaultValues: {
      globalShowTechnicalSpecs: true,
      globalShowLogisticsInfo: true,
      globalShowVerifiedReviews: true,
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        globalShowTechnicalSpecs: settingsData.globalShowTechnicalSpecs ?? true,
        globalShowLogisticsInfo: settingsData.globalShowLogisticsInfo ?? true,
        globalShowVerifiedReviews: settingsData.globalShowVerifiedReviews ?? true,
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
      toast({ title: 'Global Settings Saved', description: 'Public store visibility has been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update global settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingSettings;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={EyeOff} title="Global Visibility" description="Loading..." />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
            icon={EyeOff}
            title="Global Section Visibility"
            description="Control the visibility of major product sections across the entire public store."
        />
        <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving}
            className="h-12 px-8 font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
        >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Global Visibility
        </Button>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        <Form {...form}>
          <form className="space-y-8">
            <Card className="shadow-2xl border-none ring-1 ring-destructive/20 overflow-hidden">
              <CardHeader className="bg-destructive/5 border-b border-destructive/10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl text-destructive">Master Visibility Switches</CardTitle>
                        <CardDescription>
                            These switches override all product-level settings. If turned OFF here, the section will be hidden on ALL products.
                        </CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                <FormField
                  control={form.control}
                  name="globalShowTechnicalSpecs"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-6 border border-destructive/10 rounded-3xl bg-destructive/5 transition-all hover:bg-destructive/10 group">
                      <div className="space-y-1">
                        <FormLabel className="font-black text-sm uppercase tracking-widest flex items-center gap-2 text-destructive">
                            <ListChecks className="h-4 w-4" /> Global Technical Specs
                        </FormLabel>
                        <FormDescription className="text-xs">
                            Hides/Shows specifications, variations, and sizing charts globally.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-destructive"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="globalShowLogisticsInfo"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-6 border border-destructive/10 rounded-3xl bg-destructive/5 transition-all hover:bg-destructive/10 group">
                      <div className="space-y-1">
                        <FormLabel className="font-black text-sm uppercase tracking-widest flex items-center gap-2 text-destructive">
                            <Truck className="h-4 w-4" /> Global Logistics Info
                        </FormLabel>
                        <FormDescription className="text-xs">
                            Hides/Shows the shipping & returns information globally.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-destructive"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="globalShowVerifiedReviews"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between p-6 border border-destructive/10 rounded-3xl bg-destructive/5 transition-all hover:bg-destructive/10 group">
                      <div className="space-y-1">
                        <FormLabel className="font-black text-sm uppercase tracking-widest flex items-center gap-2 text-destructive">
                            <Star className="h-4 w-4" /> Global Verified Reviews
                        </FormLabel>
                        <FormDescription className="text-xs">
                            Hides/Shows customer reviews and ratings globally.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-destructive"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="bg-muted/30 border-t p-6">
                <div className="flex items-start gap-3 text-xs text-muted-foreground leading-relaxed">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p>
                        <strong>Note:</strong> Product-level settings still allow you to hide these sections for specific products even if the global switch is ON. However, if the global switch is OFF, the section is hidden regardless of individual product settings.
                    </p>
                </div>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}
