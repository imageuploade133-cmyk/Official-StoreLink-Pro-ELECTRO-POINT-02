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
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Loader2, Save, Info, Eye, EyeOff, Palette } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const recommendationsSchema = z.object({
  showRelatedProducts: z.boolean().default(true),
  relatedProductsBackgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#f8fafc'),
  relatedProductsTitle: z.string().min(3, 'Title must be at least 3 characters.'),
  relatedProductsDescription: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof recommendationsSchema>;

export default function RecommendationsSettingsPage() {
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

  const form = useForm<FormValues>({
    resolver: zodResolver(recommendationsSchema),
    defaultValues: {
      showRelatedProducts: true,
      relatedProductsBackgroundColor: '#f8fafc',
      relatedProductsTitle: 'You Might Also Like',
      relatedProductsDescription: 'Specially curated items from the same collection.',
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        showRelatedProducts: settingsData.showRelatedProducts ?? true,
        relatedProductsBackgroundColor: settingsData.relatedProductsBackgroundColor || '#f8fafc',
        relatedProductsTitle: settingsData.relatedProductsTitle || 'You Might Also Like',
        relatedProductsDescription: settingsData.relatedProductsDescription || 'Specially curated items from the same collection.',
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
      toast({ title: 'Settings Saved', description: 'Product recommendation preferences updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingMainSettings || (currentStoreId ? isLoadingOldSettings : false);
  const isVisible = form.watch('showRelatedProducts');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Sparkles} title="Recommendation Settings" description="Loading..." />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        title="Product Recommendations"
        description="Manage the dynamic 'You Might Also Like' section displayed on product detail pages."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card className={cn(!isVisible && "border-orange-200 bg-orange-50/30")}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Display & Styling</CardTitle>
                        <CardDescription>Control the appearance of related products.</CardDescription>
                    </div>
                    <FormField
                        control={form.control}
                        name="showRelatedProducts"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-full border px-4 py-2 bg-background ">
                            <div className="flex items-center gap-2">
                                {field.value ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                                <FormLabel className="text-xs font-bold uppercase tracking-widest">{field.value ? 'Visible' : 'Hidden'}</FormLabel>
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
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="relatedProductsTitle"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Section Title</FormLabel>
                            <FormControl>
                            <Input placeholder="e.g., You Might Also Like" {...field} disabled={!isVisible} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="relatedProductsBackgroundColor"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Background Color</FormLabel>
                            <div className="flex items-center gap-3">
                                <FormControl>
                                    <Input 
                                        type="color" 
                                        {...field} 
                                        className="p-1 h-10 w-12 cursor-pointer rounded-md" 
                                        disabled={!isVisible}
                                    />
                                </FormControl>
                                <span className="text-sm font-mono text-muted-foreground">{field.value}</span>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => field.onChange('#f8fafc')}
                                    disabled={!isVisible}
                                >
                                    Reset
                                </Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="relatedProductsDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagline / Description</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Specially curated items from the same collection" 
                            {...field} 
                            disabled={!isVisible}
                          />
                        </FormControl>
                        <FormDescription>Small text displayed below the title.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="border-t pt-6">
                  <Button type="submit" disabled={isSaving} size="lg" className="min-w-[200px] font-bold">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Recommendation Settings
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-primary/5 border-primary/20 shadow-none sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary uppercase tracking-widest">
                <Info className="h-4 w-4" /> Recommendation Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4 text-muted-foreground leading-relaxed">
              <p>The "You Might Also Like" section uses a smart fallback algorithm:</p>
              <ul className="list-disc pl-5 space-y-2 font-medium">
                <li>First, it finds products in the **same category**.</li>
                <li>It then **randomizes** them to provide a fresh experience.</li>
                <li>If the category is empty, it displays your **newest products**.</li>
              </ul>
              <Separator className="bg-primary/10" />
              <p className="text-xs italic">
                Turning this section OFF will remove it entirely from all individual product pages.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
