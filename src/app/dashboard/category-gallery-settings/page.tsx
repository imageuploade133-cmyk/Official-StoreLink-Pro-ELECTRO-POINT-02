
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings, Category } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
  Type,
  Layers,
  Sparkles,
  Sliders
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const categorySettingsSchema = z.object({
  // Slideshow Quick Category Bar (Under Slideshow)
  showTopCategoryBar: z.boolean().default(true),
  topCategoryBarShape: z.enum(['circle', 'rounded', 'square']).default('circle'),
  topCategoryBarBackgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#FFFFFF'),
  topCategoryBarTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').default('#000000'),
  topCategoryBarCategoryIds: z.array(z.string()).default([]),

  // Main Category Showcase
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

  const categoriesQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return query(
      collection(firestore, 'categories'),
      where('store_id', '==', currentStoreId),
      orderBy('name', 'asc')
    );
  }, [firestore, currentStoreId]);

  const { data: categories } = useCollection<Category>(categoriesQuery);

  const settingsData = mainSettingsData || oldSettingsData;

  const form = useForm<FormValues>({
    resolver: zodResolver(categorySettingsSchema),
    defaultValues: {
      showTopCategoryBar: true,
      topCategoryBarShape: 'circle',
      topCategoryBarBackgroundColor: '#FFFFFF',
      topCategoryBarTextColor: '#000000',
      topCategoryBarCategoryIds: [],
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
        showTopCategoryBar: settingsData.showTopCategoryBar ?? true,
        topCategoryBarShape: settingsData.topCategoryBarShape || 'circle',
        topCategoryBarBackgroundColor: settingsData.topCategoryBarBackgroundColor || '#FFFFFF',
        topCategoryBarTextColor: settingsData.topCategoryBarTextColor || '#000000',
        topCategoryBarCategoryIds: settingsData.topCategoryBarCategoryIds || [],
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
      if (currentStoreId) {
        await saveStoreSettings(firestore, currentStoreId, data);
      } else {
        await saveGlobalSettings(firestore, data);
      }
      toast({ title: 'Settings Saved', description: 'Category Section configuration has been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update configuration.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingMainSettings || (currentStoreId ? isLoadingOldSettings : false);
  const isTopBarEnabled = form.watch('showTopCategoryBar');
  const isSectionEnabled = form.watch('showCategorySection');
  const isPreTitleEnabled = form.watch('showCategorySectionPreTitle');
  const topBarShape = form.watch('topCategoryBarShape');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={LayoutGrid} title="Category Section Management" description="Loading configuration..." />
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
        description="Manage public website categories displayed under the home slideshow and customize the homepage category showcase."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">

              {/* SECTION 1: PUBLIC WEBSITE CATEGORY BAR UNDER SLIDESHOW */}
              <Card className={cn("shadow-xl border-2 transition-all duration-300 overflow-hidden", !isTopBarEnabled && "opacity-60 grayscale-[0.5]")}>
                <CardHeader className="bg-gradient-to-r from-primary/10 via-background to-muted/30 border-b flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">Slideshow Quick Category Bar</CardTitle>
                    </div>
                    <CardDescription>
                      Category icons displayed directly below the home slideshow on your public store.
                    </CardDescription>
                  </div>
                  <FormField
                    control={form.control}
                    name="showTopCategoryBar"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0 rounded-full border px-4 py-2 bg-background shadow-lg">
                        <div className="flex items-center gap-2">
                          {field.value ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">{field.value ? 'Enabled' : 'Disabled'}</FormLabel>
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
                  {/* Shape Selector */}
                  <FormField
                    control={form.control}
                    name="topCategoryBarShape"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-primary">Icon Avatar Shape</FormLabel>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { id: 'circle', label: 'Circular', shapeClass: 'rounded-full' },
                            { id: 'rounded', label: 'Rounded', shapeClass: 'rounded-2xl' },
                            { id: 'square', label: 'Square', shapeClass: 'rounded-lg' },
                          ].map((shapeOption) => (
                            <button
                              key={shapeOption.id}
                              type="button"
                              onClick={() => field.onChange(shapeOption.id)}
                              className={cn(
                                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 gap-2 transition-all duration-200",
                                field.value === shapeOption.id
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <div className={cn("h-10 w-10 bg-primary/20 border-2 border-primary", shapeOption.shapeClass)} />
                              <span className="text-xs font-bold uppercase tracking-wider">{shapeOption.label}</span>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Colors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="topCategoryBarBackgroundColor"
                      render={({ field }) => <ColorInput field={field} label="Bar Background Color" />}
                    />
                    <FormField
                      control={form.control}
                      name="topCategoryBarTextColor"
                      render={({ field }) => <ColorInput field={field} label="Category Label Text Color" />}
                    />
                  </div>

                  <Separator className="border-dashed" />

                  {/* Category Filter Selection */}
                  <FormField
                    control={form.control}
                    name="topCategoryBarCategoryIds"
                    render={({ field }) => {
                      const selectedIds: string[] = field.value || [];
                      const isAll = selectedIds.length === 0;

                      return (
                        <FormItem className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-primary">Featured Categories Filter</FormLabel>
                              <FormDescription className="text-xs">
                                Choose specific categories to show under the slideshow, or leave empty to automatically display all categories.
                              </FormDescription>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => field.onChange([])}
                              className={cn("text-xs font-bold rounded-full", isAll && "border-primary bg-primary/10 text-primary")}
                            >
                              {isAll ? "Showing All Categories" : "Reset to Show All"}
                            </Button>
                          </div>

                          {categories && categories.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-4 rounded-2xl border bg-muted/10">
                              {categories.map((cat) => {
                                const checked = selectedIds.includes(cat.id);
                                return (
                                  <label
                                    key={cat.id}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none text-xs font-medium",
                                      checked
                                        ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                                        : "border-border hover:bg-muted/50"
                                    )}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(isChecked) => {
                                        if (isChecked) {
                                          field.onChange([...selectedIds, cat.id]);
                                        } else {
                                          field.onChange(selectedIds.filter((id) => id !== cat.id));
                                        }
                                      }}
                                    />
                                    <span className="truncate">{cat.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 text-center text-xs text-muted-foreground border rounded-2xl">
                              No store categories found. Create categories under Dashboard &gt; Categories first.
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </CardContent>
              </Card>

              {/* SECTION 2: MAIN HOMEPAGE CATEGORY SHOWCASE SECTION */}
              <Card className={cn("shadow-xl border-2 transition-all duration-300 overflow-hidden", !isSectionEnabled && "opacity-60 grayscale-[0.5]")}>
                <CardHeader className="bg-gradient-to-r from-primary/10 via-background to-muted/30 border-b flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">Homepage Category Gallery Showcase</CardTitle>
                    </div>
                    <CardDescription>
                      Configure the main featured category gallery section with header text and narrative.
                    </CardDescription>
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
              </Card>

              {/* SAVE BUTTON */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving} className="font-black uppercase tracking-widest text-xs h-14 px-10 shadow-xl shadow-primary/20 rounded-2xl text-sm">
                  {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Save All Category Settings
                </Button>
              </div>
            </div>

            {/* LIVE SIMULATION SIDEBAR */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <Card className="shadow-lg border-2 ring-1 ring-border overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Storefront Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Slideshow Simulation Box */}
                    <div className="w-full h-24 rounded-2xl bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 flex items-center justify-center text-white font-black text-xs uppercase tracking-widest shadow-inner">
                      Hero Slideshow Banner
                    </div>

                    {/* Preview 1: Slideshow Category Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Category Bar (Under Slideshow)</span>
                        <span className={isTopBarEnabled ? "text-green-600" : "text-amber-600"}>{isTopBarEnabled ? "Visible" : "Hidden"}</span>
                      </div>
                      {isTopBarEnabled ? (
                        <div
                          className="p-3 rounded-2xl border flex items-center justify-around gap-2 overflow-x-auto transition-colors duration-300"
                          style={{ backgroundColor: form.watch('topCategoryBarBackgroundColor') }}
                        >
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                              <div
                                className={cn(
                                  "h-9 w-9 bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-[10px] font-bold",
                                  topBarShape === 'square' ? 'rounded-md' : topBarShape === 'rounded' ? 'rounded-xl' : 'rounded-full'
                                )}
                              />
                              <span
                                className="text-[8px] font-bold truncate max-w-[40px]"
                                style={{ color: form.watch('topCategoryBarTextColor') }}
                              >
                                Cat {i}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl border border-dashed text-center text-[10px] text-muted-foreground uppercase font-bold">
                          Quick Category Bar Hidden
                        </div>
                      )}
                    </div>

                    <Separator className="border-dashed" />

                    {/* Preview 2: Category Showcase Gallery */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Category Showcase Gallery</span>
                        <span className={isSectionEnabled ? "text-green-600" : "text-amber-600"}>{isSectionEnabled ? "Visible" : "Hidden"}</span>
                      </div>
                      {isSectionEnabled ? (
                        <div
                          className="p-5 rounded-2xl border flex flex-col space-y-3 transition-colors duration-300"
                          style={{ backgroundColor: form.watch('categorySectionBackgroundColor') }}
                        >
                          <div className="space-y-1">
                            {isPreTitleEnabled && (
                              <div
                                className="font-bold text-[8px] uppercase tracking-widest opacity-80"
                                style={{ color: form.watch('categorySectionTextColor') }}
                              >
                                {form.watch('categorySectionPreTitle')}
                              </div>
                            )}
                            <h2
                              className="text-sm font-black tracking-tight uppercase leading-none"
                              style={{ color: form.watch('categorySectionTextColor') }}
                            >
                              {form.watch('categorySectionTitle')}
                            </h2>
                            <p
                              className="font-normal text-[9px] leading-tight line-clamp-2 opacity-70"
                              style={{ color: form.watch('categorySectionTextColor') }}
                            >
                              {form.watch('categorySectionDescription')}
                            </p>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <div className="h-14 w-12 rounded-xl bg-muted animate-pulse" />
                            <div className="h-14 w-12 rounded-xl bg-muted animate-pulse" />
                            <div className="h-14 w-12 rounded-xl bg-muted animate-pulse opacity-50" />
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl border border-dashed text-center text-[10px] text-muted-foreground uppercase font-bold">
                          Category Gallery Section Hidden
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="p-5 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/10 flex gap-3 items-start">
                  <Palette className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-primary uppercase tracking-wider">Visual Merchandising</p>
                    <p className="text-muted-foreground leading-relaxed font-medium text-[11px]">
                      The Category Bar gives shoppers instant access to key product lines right under the slideshow banner.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
