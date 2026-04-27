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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Sparkles, 
  Loader2, 
  Save, 
  AlignLeft,
  AlignCenter,
  Type,
  FileText,
  Palette,
  LayoutGrid,
  GalleryHorizontal
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ourCollectionSchema = z.object({
  ourCollectionTitle: z.string().min(1, 'Title is required').default('Our Collection'),
  ourCollectionDescription: z.string().optional().default('Discover our latest additions and favorite picks'),
  ourCollectionLayout: z.enum(['carousel', 'grid']).default('grid'),
  ourCollectionAlignment: z.enum(['left', 'center']).default('center'),
  ourCollectionBackgroundColor: z.string().optional().default(''),
  ourCollectionShow: z.boolean().default(true),
});

type FormValues = z.infer<typeof ourCollectionSchema>;

export default function OurCollectionSettingsPage() {
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

  const { data: settingsData, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(ourCollectionSchema),
    defaultValues: {
      ourCollectionTitle: 'Our Collection',
      ourCollectionDescription: 'Discover our latest additions and favorite picks',
      ourCollectionLayout: 'grid',
      ourCollectionAlignment: 'center',
      ourCollectionBackgroundColor: '',
      ourCollectionShow: true,
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        ourCollectionTitle: settingsData.ourCollectionTitle || 'Our Collection',
        ourCollectionDescription: settingsData.ourCollectionDescription || 'Discover our latest additions and favorite picks',
        ourCollectionLayout: settingsData.ourCollectionLayout || 'grid',
        ourCollectionAlignment: settingsData.ourCollectionAlignment || 'center',
        ourCollectionBackgroundColor: settingsData.ourCollectionBackgroundColor || '',
        ourCollectionShow: settingsData.ourCollectionShow !== false,
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
      toast({ title: 'Success', description: 'Our Collection settings have been saved.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingSettings;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Sparkles} title="Our Collection" description="Loading..." />
        <div className="space-y-6">
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
        icon={Sparkles}
        title="Manage Our Collection"
        description="Customize the 'Our Collection' section on your homepage"
      />

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <CardTitle className="text-lg font-bold">Section Content</CardTitle>
                    <CardDescription className="mt-1">Configure the heading, description and visibility of the collection section</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-bold">Show Section</FormLabel>
                    <FormDescription>Toggle visibility of the "Our Collection" section on the homepage</FormDescription>
                  </div>
                  <FormField
                    control={form.control}
                    name="ourCollectionShow"
                    render={({ field }) => (
                      <FormItem>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="ourCollectionTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-base flex items-center gap-2">
                          <Type className="h-4 w-4 text-primary" />
                          Section Title
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Our Collection" {...field} />
                        </FormControl>
                        <FormDescription>
                          The main heading for this section
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ourCollectionDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-base flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Section Description
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Discover our latest additions..." {...field} />
                        </FormControl>
                        <FormDescription>
                          The subtext displayed below the title
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="ourCollectionLayout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-base">Layout Style</FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => field.onChange('grid')}
                            className={cn(
                              "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                              field.value === 'grid'
                                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                : 'border-slate-200 dark:border-slate-800 hover:border-primary/30 bg-card'
                            )}
                          >
                            <div className={cn(
                                "p-2 rounded-lg transition-colors",
                                field.value === 'grid' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            )}>
                              <LayoutGrid className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-bold">Grid</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange('carousel')}
                            className={cn(
                              "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                              field.value === 'carousel'
                                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                : 'border-slate-200 dark:border-slate-800 hover:border-primary/30 bg-card'
                            )}
                          >
                            <div className={cn(
                                "p-2 rounded-lg transition-colors",
                                field.value === 'carousel' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            )}>
                              <GalleryHorizontal className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-bold">Carousel</span>
                          </button>
                        </div>
                        <FormDescription className="text-xs pt-2">
                          Choose how products are displayed in this section.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ourCollectionAlignment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-base">Text Alignment</FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => field.onChange('left')}
                            className={cn(
                              "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                              field.value === 'left'
                                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                : 'border-slate-200 dark:border-slate-800 hover:border-primary/30 bg-card'
                            )}
                          >
                            <div className={cn(
                                "p-2 rounded-lg transition-colors",
                                field.value === 'left' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            )}>
                              <AlignLeft className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-bold">Left</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange('center')}
                            className={cn(
                              "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200",
                              field.value === 'center'
                                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                : 'border-slate-200 dark:border-slate-800 hover:border-primary/30 bg-card'
                            )}
                          >
                            <div className={cn(
                                "p-2 rounded-lg transition-colors",
                                field.value === 'center' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            )}>
                              <AlignCenter className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-bold">Center</span>
                          </button>
                        </div>
                        <FormDescription className="text-xs pt-2">
                          Align title and description text.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ourCollectionBackgroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-base flex items-center gap-2">
                        <Palette className="h-4 w-4 text-primary" />
                        Background Color
                      </FormLabel>
                      <div className="flex gap-4 items-center">
                        <FormControl>
                          <Input placeholder="#ffffff" {...field} className="max-w-[200px]" />
                        </FormControl>
                        <div 
                          className="h-10 w-10 rounded-lg border shadow-sm" 
                          style={{ backgroundColor: field.value || 'white' }}
                        />
                      </div>
                      <FormDescription>
                        Custom background color for this section (hex code). Leave empty for default.
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
      </div>
    </div>
  );
}
