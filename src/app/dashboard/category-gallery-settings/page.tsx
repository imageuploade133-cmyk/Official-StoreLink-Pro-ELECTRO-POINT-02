
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  LayoutGrid, 
  Loader2, 
  Save, 
  Info, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Palette,
  ChevronRight,
  Type
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const categorySettingsSchema = z.object({
  showCategorySection: z.boolean().default(true),
  showCategorySectionPreTitle: z.boolean().default(true),
  categorySectionPreTitle: z.string().min(2, 'Pre-title is too short.').max(40, 'Pre-title is too long.'),
  categorySectionTitle: z.string().min(2, 'Title is too short.').max(40, 'Title is too long.'),
  categorySectionDescription: z.string().min(2, 'Description is too short.').max(200, 'Description is too long.'),
  categorySectionBackgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#FFFFFF'),
  categorySectionTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#000000'),
});

type FormValues = z.infer<typeof categorySettingsSchema>;

const ColorInput = ({ field, label }: { field: any; label: string }) => (
    <FormItem>
        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</FormLabel>
        <div className="relative flex items-center">
             <FormControl>
                <Input type="color" {...field} value={field.value || '#000000'} className="p-1 h-10 w-12 cursor-pointer rounded-lg border-2" />
            </FormControl>
            <span className="absolute left-14 text-sm text-muted-foreground font-mono">{field.value}</span>
        </div>
        <FormMessage />
    </FormItem>
);

export default function CategoryGallerySettingsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);

  const settingsRef = useMemo(
    () => (firestore ? doc(firestore, 'settings', 'global') : null),
    [firestore]
  );

  const { data: settingsData, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(categorySettingsSchema),
    defaultValues: {
      showCategorySection: true,
      showCategorySectionPreTitle: true,
      categorySectionPreTitle: 'Featured Collections',
      categorySectionTitle: 'Browse Categories',
      categorySectionDescription: 'Explore our meticulously curated selections designed to elevate your lifestyle.',
      categorySectionBackgroundColor: '#FFFFFF',
      categorySectionTextColor: '#000000',
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        showCategorySection: settingsData.showCategorySection ?? true,
        showCategorySectionPreTitle: settingsData.showCategorySectionPreTitle ?? true,
        categorySectionPreTitle: settingsData.categorySectionPreTitle || 'Featured Collections',
        categorySectionTitle: settingsData.categorySectionTitle || 'Browse Categories',
        categorySectionDescription: settingsData.categorySectionDescription || 'Explore our meticulously curated selections designed to elevate your lifestyle.',
        categorySectionBackgroundColor: settingsData.categorySectionBackgroundColor || '#FFFFFF',
        categorySectionTextColor: settingsData.categorySectionTextColor || '#000000',
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Settings Saved', description: 'Category Section configuration has been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update configuration.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingSettings;
  const isEnabled = form.watch('showCategorySection');
  const isPreTitleEnabled = form.watch('showCategorySectionPreTitle');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={LayoutGrid} title="Category Section Settings" description="Loading configuration..." />
        <Skeleton className="h-[500px] w-full rounded-3xl" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        icon={LayoutGrid}
        title="Category Section Management"
        description="Configure the header text and styling for the category showcase on your homepage."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card className={cn("shadow-xl border-none ring-1 ring-border overflow-hidden", !isEnabled && "opacity-60 grayscale-[0.5]")}>
                <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Content & Visibility</CardTitle>
                    <CardDescription>Adjust the labels and status of the category gallery.</CardDescription>
                  </div>
                  <FormField
                    control={form.control}
                    name="showCategorySection"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0 rounded-full border px-4 py-2 bg-background shadow-lg">
                        <div className="flex items-center gap-2">
                            {field.value ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest">{field.value ? 'Visible' : 'Hidden'}</FormLabel>
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
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="categorySectionPreTitle"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="text-xs font-black uppercase tracking-widest text-primary">Micro-Label (Pre-Title)</FormLabel>
                                        <FormField
                                            control={form.control}
                                            name="showCategorySectionPreTitle"
                                            render={({ field: subField }) => (
                                                <FormItem className="flex items-center gap-2 space-y-0">
                                                    <FormLabel className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{subField.value ? 'Active' : 'Off'}</FormLabel>
                                                    <FormControl><Switch checked={subField.value} onCheckedChange={subField.onChange} className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3" /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormControl><Input placeholder="e.g., Featured Collections" {...field} className={cn("h-11 font-bold", !isPreTitleEnabled && "opacity-50")} disabled={!isPreTitleEnabled} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="categorySectionTitle"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-primary">Main Section Heading</FormLabel>
                                <FormControl><Input placeholder="e.g., Browse Categories" {...field} className="h-11 font-black text-lg" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="categorySectionDescription"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-primary">Section Narrative / Description</FormLabel>
                            <FormControl><Input placeholder="Explain the value of your collections..." {...field} className="h-11" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                  />

                  <Separator className="border-dashed" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField 
                        control={form.control} 
                        name="categorySectionBackgroundColor" 
                        render={({ field }) => <ColorInput field={field} label="Section Background Color" />} 
                    />
                    <FormField 
                        control={form.control} 
                        name="categorySectionTextColor" 
                        render={({ field }) => <ColorInput field={field} label="Text & Narrative Color" />} 
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 border-t p-6">
                  <Button type="submit" disabled={isSaving} className="font-black uppercase tracking-widest text-xs h-12 px-8 shadow-xl shadow-primary/20">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Sync Category Configuration
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className="shadow-lg border-none ring-1 ring-border">
                <CardHeader className="bg-muted/10">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4" /> Live Simulation
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-8">
                    <div 
                        className="p-8 rounded-[2.5rem] border-2 border-dashed flex flex-col space-y-4 transition-colors duration-500"
                        style={{ backgroundColor: form.watch('categorySectionBackgroundColor') }}
                    >
                        <div className="space-y-3">
                            {isPreTitleEnabled && (
                                <div 
                                    className="inline-flex items-center gap-2 font-black text-[8px] uppercase tracking-widest animate-in fade-in slide-in-from-left-4"
                                    style={{ color: form.watch('categorySectionTextColor') }}
                                >
                                    <LayoutGrid className="h-3 w-3" />
                                    {form.watch('categorySectionPreTitle')}
                                </div>
                            )}
                            <h2 
                                className="text-xl font-black tracking-tighter uppercase leading-none"
                                style={{ color: form.watch('categorySectionTextColor') }}
                            >
                                {form.watch('categorySectionTitle')}
                            </h2>
                            <p 
                                className="font-medium text-[10px] leading-relaxed max-w-xs opacity-70"
                                style={{ color: form.watch('categorySectionTextColor') }}
                            >
                                {form.watch('categorySectionDescription')}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <div className="h-16 w-16 rounded-xl bg-muted animate-pulse" />
                            <div className="h-16 w-16 rounded-xl bg-muted animate-pulse" />
                            <div className="h-16 w-16 rounded-xl bg-muted animate-pulse opacity-50" />
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-black uppercase text-center mt-4 tracking-widest">Storefront Header Preview</p>
                </CardContent>
            </Card>

            <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-dashed border-primary/10 flex gap-4 items-start">
                <Palette className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-2">
                    <p className="font-bold text-primary uppercase tracking-wider">Visual Merchandising</p>
                    <p className="text-muted-foreground leading-relaxed font-medium">
                        The Category Section acts as a primary navigation hub. Use high-contrast text against your background to ensure smooth visitor flow.
                    </p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
