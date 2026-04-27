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
  GalleryHorizontal,
  ImageIcon,
  Video,
  Upload,
  X,
  Plus,
  Maximize,
  Monitor,
  RotateCcw,
  RefreshCcw
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from 'next/image';

const ourCollectionSchema = z.object({
  ourCollectionTitle: z.string().min(1, 'Title is required').default('Our Collection'),
  ourCollectionDescription: z.string().optional().default('Discover our latest additions and favorite picks'),
  ourCollectionLayout: z.enum(['carousel', 'grid']).default('grid'),
  ourCollectionAlignment: z.enum(['left', 'center']).default('center'),
  ourCollectionBackgroundColor: z.string().optional().default(''),
  ourCollectionBackgroundType: z.enum(['solid', 'gradient', 'image']).default('solid'),
  ourCollectionGradientStart: z.string().optional().default('#ffffff'),
  ourCollectionGradientEnd: z.string().optional().default('#f1f5f9'),
  ourCollectionGradientDirection: z.string().optional().default('to bottom'),
  ourCollectionBackgroundImageUrl: z.string().optional().default(''),
  ourCollectionBackgroundApplyTo: z.array(z.enum(['homepage', 'collection', 'global', 'product'])).default(['collection']),
  ourCollectionShow: z.boolean().default(true),
  ourCollectionMediaType: z.enum(['none', 'image', 'video', 'slideshow']).default('none'),
  ourCollectionImageUrl: z.string().optional().default(''),
  ourCollectionVideoUrl: z.string().optional().default(''),
  ourCollectionVideoPosterUrl: z.string().optional().default(''),
  ourCollectionOverlayTitle: z.string().optional().default(''),
  ourCollectionOverlaySubtitle: z.string().optional().default(''),
  ourCollectionButtonText: z.string().optional().default(''),
  ourCollectionLinkUrl: z.string().optional().default(''),
  ourCollectionShowOverlay: z.boolean().default(false),
  ourCollectionTextColor: z.string().optional().default('#FFFFFF'),
  ourCollectionFullWidth: z.boolean().default(false),
  ourCollectionSlides: z.array(z.object({
    imageUrl: z.string().min(1, 'Image URL is required'),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    linkUrl: z.string().optional(),
    buttonText: z.string().optional(),
  })).optional().default([]),
});

type FormValues = z.infer<typeof ourCollectionSchema>;

const DEFAULT_VALUES: FormValues = {
  ourCollectionTitle: 'Our Collection',
  ourCollectionDescription: 'Discover our latest additions and favorite picks',
  ourCollectionLayout: 'grid',
  ourCollectionAlignment: 'center',
  ourCollectionBackgroundColor: '',
  ourCollectionBackgroundType: 'solid',
  ourCollectionGradientStart: '#ffffff',
  ourCollectionGradientEnd: '#f1f5f9',
  ourCollectionGradientDirection: 'to bottom',
  ourCollectionBackgroundImageUrl: '',
  ourCollectionBackgroundApplyTo: ['collection'],
  ourCollectionShow: true,
  ourCollectionMediaType: 'none',
  ourCollectionImageUrl: '',
  ourCollectionVideoUrl: '',
  ourCollectionVideoPosterUrl: '',
  ourCollectionOverlayTitle: '',
  ourCollectionOverlaySubtitle: '',
  ourCollectionButtonText: 'Shop Now',
  ourCollectionLinkUrl: '',
  ourCollectionShowOverlay: false,
  ourCollectionTextColor: '#FFFFFF',
  ourCollectionFullWidth: false,
  ourCollectionSlides: [],
};

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
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(ourCollectionSchema),
    defaultValues: DEFAULT_VALUES
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        ourCollectionTitle: settingsData.ourCollectionTitle || DEFAULT_VALUES.ourCollectionTitle,
        ourCollectionDescription: settingsData.ourCollectionDescription || DEFAULT_VALUES.ourCollectionDescription,
        ourCollectionLayout: settingsData.ourCollectionLayout || DEFAULT_VALUES.ourCollectionLayout,
        ourCollectionAlignment: settingsData.ourCollectionAlignment || DEFAULT_VALUES.ourCollectionAlignment,
        ourCollectionBackgroundColor: settingsData.ourCollectionBackgroundColor || DEFAULT_VALUES.ourCollectionBackgroundColor,
        ourCollectionBackgroundType: settingsData.ourCollectionBackgroundType || DEFAULT_VALUES.ourCollectionBackgroundType,
        ourCollectionGradientStart: settingsData.ourCollectionGradientStart || DEFAULT_VALUES.ourCollectionGradientStart,
        ourCollectionGradientEnd: settingsData.ourCollectionGradientEnd || DEFAULT_VALUES.ourCollectionGradientEnd,
        ourCollectionGradientDirection: settingsData.ourCollectionGradientDirection || DEFAULT_VALUES.ourCollectionGradientDirection,
        ourCollectionBackgroundImageUrl: settingsData.ourCollectionBackgroundImageUrl || DEFAULT_VALUES.ourCollectionBackgroundImageUrl,
        ourCollectionBackgroundApplyTo: settingsData.ourCollectionBackgroundApplyTo || DEFAULT_VALUES.ourCollectionBackgroundApplyTo,
        ourCollectionShow: settingsData.ourCollectionShow !== false,
        ourCollectionMediaType: settingsData.ourCollectionMediaType || DEFAULT_VALUES.ourCollectionMediaType,
        ourCollectionImageUrl: settingsData.ourCollectionImageUrl || DEFAULT_VALUES.ourCollectionImageUrl,
        ourCollectionVideoUrl: settingsData.ourCollectionVideoUrl || DEFAULT_VALUES.ourCollectionVideoUrl,
        ourCollectionVideoPosterUrl: settingsData.ourCollectionVideoPosterUrl || DEFAULT_VALUES.ourCollectionVideoPosterUrl,
        ourCollectionOverlayTitle: settingsData.ourCollectionOverlayTitle || DEFAULT_VALUES.ourCollectionOverlayTitle,
        ourCollectionOverlaySubtitle: settingsData.ourCollectionOverlaySubtitle || DEFAULT_VALUES.ourCollectionOverlaySubtitle,
        ourCollectionButtonText: settingsData.ourCollectionButtonText || DEFAULT_VALUES.ourCollectionButtonText,
        ourCollectionLinkUrl: settingsData.ourCollectionLinkUrl || DEFAULT_VALUES.ourCollectionLinkUrl,
        ourCollectionShowOverlay: settingsData.ourCollectionShowOverlay || DEFAULT_VALUES.ourCollectionShowOverlay,
        ourCollectionTextColor: settingsData.ourCollectionTextColor || DEFAULT_VALUES.ourCollectionTextColor,
        ourCollectionFullWidth: settingsData.ourCollectionFullWidth || DEFAULT_VALUES.ourCollectionFullWidth,
        ourCollectionSlides: settingsData.ourCollectionSlides || DEFAULT_VALUES.ourCollectionSlides,
      });
    }
  }, [settingsData, form]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: keyof FormValues | string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const result = await uploadImage({ imageDataUri: reader.result as string, storeId: currentStoreId });
        if (fieldName.includes('.')) {
          // Handle nested slide fields
          const [arrayName, indexStr, subFieldName] = fieldName.split('.');
          const index = parseInt(indexStr);
          const currentSlides = [...(form.getValues('ourCollectionSlides') || [])];
          currentSlides[index] = { ...currentSlides[index], [subFieldName]: result.display_url };
          form.setValue('ourCollectionSlides', currentSlides, { shouldValidate: true });
        } else {
          form.setValue(fieldName as any, result.display_url, { shouldValidate: true });
        }
        toast({ title: "Asset Uploaded", description: "Image is ready." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message });
      } finally {
        setIsUploading(false);
      }
    };
  };

  const addSlide = () => {
    const currentSlides = form.getValues('ourCollectionSlides') || [];
    form.setValue('ourCollectionSlides', [...currentSlides, { imageUrl: '', title: '', subtitle: '', linkUrl: '', buttonText: 'Shop Now' }]);
  };

  const removeSlide = (index: number) => {
    const currentSlides = form.getValues('ourCollectionSlides') || [];
    form.setValue('ourCollectionSlides', currentSlides.filter((_, i) => i !== index));
  };

  const mediaType = form.watch('ourCollectionMediaType');
  const backgroundType = form.watch('ourCollectionBackgroundType');
  const gradStart = form.watch('ourCollectionGradientStart');
  const gradEnd = form.watch('ourCollectionGradientEnd');
  const gradDir = form.watch('ourCollectionGradientDirection');
  const slides = form.watch('ourCollectionSlides');
  const imageUrl = form.watch('ourCollectionImageUrl');
  const backgroundImageUrl = form.watch('ourCollectionBackgroundImageUrl');
  const videoPosterUrl = form.watch('ourCollectionVideoPosterUrl');

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

  const resetSectionContent = () => {
    form.setValue('ourCollectionShow', DEFAULT_VALUES.ourCollectionShow);
    form.setValue('ourCollectionTitle', DEFAULT_VALUES.ourCollectionTitle);
    form.setValue('ourCollectionDescription', DEFAULT_VALUES.ourCollectionDescription);
    form.setValue('ourCollectionLayout', DEFAULT_VALUES.ourCollectionLayout);
    form.setValue('ourCollectionAlignment', DEFAULT_VALUES.ourCollectionAlignment);
    form.setValue('ourCollectionBackgroundType', DEFAULT_VALUES.ourCollectionBackgroundType);
    form.setValue('ourCollectionBackgroundApplyTo', DEFAULT_VALUES.ourCollectionBackgroundApplyTo);
    form.setValue('ourCollectionBackgroundColor', DEFAULT_VALUES.ourCollectionBackgroundColor);
    form.setValue('ourCollectionGradientStart', DEFAULT_VALUES.ourCollectionGradientStart);
    form.setValue('ourCollectionGradientEnd', DEFAULT_VALUES.ourCollectionGradientEnd);
    form.setValue('ourCollectionGradientDirection', DEFAULT_VALUES.ourCollectionGradientDirection);
    form.setValue('ourCollectionBackgroundImageUrl', DEFAULT_VALUES.ourCollectionBackgroundImageUrl);
    toast({ title: "Section Reset", description: "Section content settings have been reset to default." });
  };

  const resetMediaContent = () => {
    form.setValue('ourCollectionMediaType', DEFAULT_VALUES.ourCollectionMediaType);
    form.setValue('ourCollectionImageUrl', DEFAULT_VALUES.ourCollectionImageUrl);
    form.setValue('ourCollectionVideoUrl', DEFAULT_VALUES.ourCollectionVideoUrl);
    form.setValue('ourCollectionVideoPosterUrl', DEFAULT_VALUES.ourCollectionVideoPosterUrl);
    form.setValue('ourCollectionSlides', DEFAULT_VALUES.ourCollectionSlides);
    form.setValue('ourCollectionOverlayTitle', DEFAULT_VALUES.ourCollectionOverlayTitle);
    form.setValue('ourCollectionOverlaySubtitle', DEFAULT_VALUES.ourCollectionOverlaySubtitle);
    form.setValue('ourCollectionButtonText', DEFAULT_VALUES.ourCollectionButtonText);
    form.setValue('ourCollectionLinkUrl', DEFAULT_VALUES.ourCollectionLinkUrl);
    form.setValue('ourCollectionTextColor', DEFAULT_VALUES.ourCollectionTextColor);
    form.setValue('ourCollectionShowOverlay', DEFAULT_VALUES.ourCollectionShowOverlay);
    form.setValue('ourCollectionFullWidth', DEFAULT_VALUES.ourCollectionFullWidth);
    toast({ title: "Media Reset", description: "Media settings have been reset to default." });
  };

  const resetAll = () => {
    form.reset(DEFAULT_VALUES);
    toast({ title: "Settings Reset", description: "All settings have been reset to default." });
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
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
              <RotateCcw className="h-4 w-4" />
              Reset All to Default
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all settings in this page to their default values. This action cannot be undone unless you have saved your previous settings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Reset Everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>

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

                <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border rounded-xl">
                  <Accordion type="single" collapsible defaultValue="background" className="w-full">
                    <AccordionItem value="background" className="border-none">
                      <AccordionTrigger className="py-2 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Palette className="h-5 w-5 text-primary" />
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Section Background</h3>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-6 pt-4">
                        <FormField
                          control={form.control}
                          name="ourCollectionBackgroundType"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-sm font-semibold">Background Type</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="grid grid-cols-3 gap-4"
                                >
                                  <div>
                                    <RadioGroupItem value="solid" id="bg-solid" className="peer sr-only" />
                                    <Label
                                      htmlFor="bg-solid"
                                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                    >
                                      Solid
                                    </Label>
                                  </div>
                                  <div>
                                    <RadioGroupItem value="gradient" id="bg-gradient" className="peer sr-only" />
                                    <Label
                                      htmlFor="bg-gradient"
                                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                    >
                                      Gradient
                                    </Label>
                                  </div>
                                  <div>
                                    <RadioGroupItem value="image" id="bg-image" className="peer sr-only" />
                                    <Label
                                      htmlFor="bg-image"
                                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                    >
                                      Image
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="ourCollectionBackgroundApplyTo"
                          render={() => (
                            <FormItem className="space-y-4">
                              <div className="mb-4">
                                <FormLabel className="text-sm font-semibold">Apply Background To</FormLabel>
                                <FormDescription>
                                  Select where you want this background to be applied.
                                </FormDescription>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                  { id: 'collection', label: 'Collection Section Only' },
                                  { id: 'homepage', label: 'Complete Home Page' },
                                  { id: 'product', label: 'Product Page Only' },
                                  { id: 'global', label: 'Global (All Pages)' },
                                ].map((item) => (
                                  <FormField
                                    key={item.id}
                                    control={form.control}
                                    name="ourCollectionBackgroundApplyTo"
                                    render={({ field }) => {
                                      return (
                                        <FormItem
                                          key={item.id}
                                          className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors bg-white dark:bg-slate-900"
                                        >
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value?.includes(item.id)}
                                              onCheckedChange={(checked) => {
                                                return checked
                                                  ? field.onChange([...(field.value || []), item.id])
                                                  : field.onChange(
                                                      field.value?.filter(
                                                        (value) => value !== item.id
                                                      )
                                                    )
                                              }}
                                            />
                                          </FormControl>
                                          <div className="space-y-1 leading-none">
                                            <FormLabel className="text-sm font-medium cursor-pointer">
                                              {item.label}
                                            </FormLabel>
                                          </div>
                                        </FormItem>
                                      )
                                    }}
                                  />
                                ))}
                              </div>
                            </FormItem>
                          )}
                        />

                        {backgroundType === 'solid' && (
                          <FormField
                            control={form.control}
                            name="ourCollectionBackgroundColor"
                            render={({ field }) => (
                              <FormItem className="animate-in fade-in slide-in-from-top-2">
                                <FormLabel className="text-sm font-semibold">Background Color</FormLabel>
                                <div className="flex gap-4 items-center">
                                  <FormControl>
                                    <div className="flex-1 flex gap-2">
                                      <Input type="color" {...field} className="w-12 h-10 p-1 cursor-pointer" />
                                      <Input placeholder="#ffffff" {...field} className="flex-1" />
                                    </div>
                                  </FormControl>
                                  <div 
                                    className="h-10 w-10 rounded-lg border shadow-sm" 
                                    style={{ backgroundColor: field.value || 'white' }}
                                  />
                                </div>
                                <FormDescription>
                                  Pick a solid color for the section background.
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        )}

                        {backgroundType === 'gradient' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                            <FormField
                              control={form.control}
                              name="ourCollectionGradientStart"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-semibold">Start Color</FormLabel>
                                  <div className="flex gap-3">
                                    <FormControl><Input type="color" {...field} className="w-12 p-1" /></FormControl>
                                    <Input {...field} className="flex-1" />
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="ourCollectionGradientEnd"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-semibold">End Color</FormLabel>
                                  <div className="flex gap-3">
                                    <FormControl><Input type="color" {...field} className="w-12 p-1" /></FormControl>
                                    <Input {...field} className="flex-1" />
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="ourCollectionGradientDirection"
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel className="text-sm font-semibold">Direction</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select direction" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="to bottom">To Bottom</SelectItem>
                                      <SelectItem value="to top">To Top</SelectItem>
                                      <SelectItem value="to right">To Right</SelectItem>
                                      <SelectItem value="to left">To Left</SelectItem>
                                      <SelectItem value="to bottom right">To Bottom Right</SelectItem>
                                      <SelectItem value="45deg">45 Degrees</SelectItem>
                                      <SelectItem value="135deg">135 Degrees</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <div 
                              className="md:col-span-2 h-20 rounded-xl border shadow-inner" 
                              style={{ 
                                background: `linear-gradient(${gradDir}, ${gradStart}, ${gradEnd})` 
                              }}
                            />
                          </div>
                        )}

                        {backgroundType === 'image' && (
                          <FormField
                            control={form.control}
                            name="ourCollectionBackgroundImageUrl"
                            render={({ field }) => (
                              <FormItem className="animate-in fade-in slide-in-from-top-2">
                                <FormLabel className="text-sm font-semibold">Background Image</FormLabel>
                                <div className="flex items-start gap-4">
                                  {backgroundImageUrl ? (
                                    <div className="relative w-32 aspect-video rounded-lg overflow-hidden border shadow-sm shrink-0">
                                      <Image src={backgroundImageUrl} alt="Bg" fill className="object-cover" unoptimized />
                                    </div>
                                  ) : (
                                    <div className="w-32 aspect-video rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/20 shrink-0">
                                      <ImageIcon className="h-6 w-6 opacity-20" />
                                    </div>
                                  )}
                                  <div className="flex-grow space-y-2">
                                    <FormControl><Input placeholder="Image URL" {...field} /></FormControl>
                                    <Button asChild variant="outline" size="sm" disabled={isUploading}>
                                      <label className="cursor-pointer">
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'ourCollectionBackgroundImageUrl')} />
                                        Upload Image
                                      </label>
                                    </Button>
                                  </div>
                                </div>
                              </FormItem>
                            )}
                          />
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={resetSectionContent} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset Section
                  </Button>
                  <Button type="submit" disabled={isSaving} className="gap-2 min-w-[140px] shadow-lg">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <CardTitle className="text-lg font-bold">Media & High-Impact Visuals</CardTitle>
                    <CardDescription className="mt-1">Add a banner, video, or slideshow to the top of this section</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="ourCollectionMediaType"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="font-black text-xs uppercase tracking-widest text-primary">Media Protocol</FormLabel>
                      <FormControl>
                        <RadioGroup 
                          onValueChange={field.onChange} 
                          value={field.value} 
                          className="grid grid-cols-1 md:grid-cols-4 gap-4"
                        >
                          <div className="relative">
                            <RadioGroupItem value="none" id="media-none" className="peer sr-only" />
                            <Label htmlFor="media-none" className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 bg-muted/5 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all h-full justify-center">
                              <X className="h-6 w-6" />
                              <span className="font-bold text-xs uppercase">None</span>
                            </Label>
                          </div>
                          <div className="relative">
                            <RadioGroupItem value="image" id="media-image" className="peer sr-only" />
                            <Label htmlFor="media-image" className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 bg-muted/5 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all h-full justify-center">
                              <ImageIcon className="h-6 w-6" />
                              <span className="font-bold text-xs uppercase">Image</span>
                            </Label>
                          </div>
                          <div className="relative">
                            <RadioGroupItem value="video" id="media-video" className="peer sr-only" />
                            <Label htmlFor="media-video" className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 bg-muted/5 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all h-full justify-center">
                              <Video className="h-6 w-6" />
                              <span className="font-bold text-xs uppercase">Video</span>
                            </Label>
                          </div>
                          <div className="relative">
                            <RadioGroupItem value="slideshow" id="media-slideshow" className="peer sr-only" />
                            <Label htmlFor="media-slideshow" className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 bg-muted/5 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all h-full justify-center">
                              <GalleryHorizontal className="h-6 w-6" />
                              <span className="font-bold text-xs uppercase">Slideshow</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {mediaType !== 'none' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-500">
                    <Separator className="border-dashed" />

                    {mediaType === 'image' && (
                      <FormField
                        control={form.control}
                        name="ourCollectionImageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">Primary Design Asset</FormLabel>
                            <div className="flex items-start gap-6">
                              {imageUrl ? (
                                <div className="relative w-48 aspect-video rounded-2xl overflow-hidden border shadow-xl bg-white shrink-0">
                                  <Image src={imageUrl} alt="Preview" fill className="object-cover" unoptimized />
                                </div>
                              ) : (
                                <div className="w-48 aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/20 shrink-0">
                                  <ImageIcon className="h-8 w-8 opacity-20" />
                                </div>
                              )}
                              <div className="flex-grow space-y-3">
                                <FormControl><Input placeholder="https://example.com/banner.jpg" {...field} className="h-11" /></FormControl>
                                <Button asChild variant="outline" size="sm" disabled={isUploading}>
                                  <label className="cursor-pointer">
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'ourCollectionImageUrl')} />
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                    Upload Banner
                                  </label>
                                </Button>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {mediaType === 'video' && (
                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="ourCollectionVideoUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">Video URL</FormLabel>
                              <FormControl><Input placeholder="https://example.com/video.mp4" {...field} className="h-11" /></FormControl>
                              <FormDescription>Direct link to MP4 video file.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="ourCollectionVideoPosterUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold">Video Poster (Thumbnail)</FormLabel>
                              <div className="flex items-start gap-6">
                                {videoPosterUrl ? (
                                  <div className="relative w-48 aspect-video rounded-2xl overflow-hidden border shadow-xl bg-white shrink-0">
                                    <Image src={videoPosterUrl} alt="Preview" fill className="object-cover" unoptimized />
                                  </div>
                                ) : (
                                  <div className="w-48 aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/20 shrink-0">
                                    <ImageIcon className="h-8 w-8 opacity-20" />
                                  </div>
                                )}
                                <div className="flex-grow space-y-3">
                                  <FormControl><Input placeholder="https://example.com/poster.jpg" {...field} className="h-11" /></FormControl>
                                  <Button asChild variant="outline" size="sm" disabled={isUploading}>
                                    <label className="cursor-pointer">
                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'ourCollectionVideoPosterUrl')} />
                                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                      Upload Poster
                                    </label>
                                  </Button>
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {mediaType === 'slideshow' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <FormLabel className="font-bold">Slideshow Asset Collection</FormLabel>
                          <Button type="button" variant="outline" size="sm" onClick={addSlide} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Slide
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          {slides.map((slide, index) => (
                            <div key={index} className="p-6 border rounded-2xl bg-muted/10 space-y-4 relative group">
                              <Button 
                                type="button" 
                                variant="destructive" 
                                size="icon" 
                                className="absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeSlide(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Slide Image</FormLabel>
                                    <div className="flex items-center gap-4">
                                      {slide.imageUrl ? (
                                        <div className="relative h-20 aspect-video rounded-lg overflow-hidden border">
                                          <Image src={slide.imageUrl} alt="Slide" fill className="object-cover" unoptimized />
                                        </div>
                                      ) : (
                                        <div className="h-20 aspect-video rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/20">
                                          <ImageIcon className="h-6 w-6 opacity-20" />
                                        </div>
                                      )}
                                      <div className="flex-grow space-y-2">
                                        <Input 
                                          placeholder="Image URL" 
                                          value={slide.imageUrl} 
                                          onChange={(e) => {
                                            const newSlides = [...slides];
                                            newSlides[index].imageUrl = e.target.value;
                                            form.setValue('ourCollectionSlides', newSlides);
                                          }}
                                          className="h-9 text-xs"
                                        />
                                        <Button asChild variant="outline" size="sm" className="h-8 text-[10px]" disabled={isUploading}>
                                          <label className="cursor-pointer">
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, `ourCollectionSlides.${index}.imageUrl`)} />
                                            Upload
                                          </label>
                                        </Button>
                                      </div>
                                    </div>
                                  </FormItem>
                                </div>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Title</FormLabel>
                                      <Input 
                                        placeholder="Heading" 
                                        value={slide.title} 
                                        onChange={(e) => {
                                          const newSlides = [...slides];
                                          newSlides[index].title = e.target.value;
                                          form.setValue('ourCollectionSlides', newSlides);
                                        }}
                                        className="h-9 text-xs"
                                      />
                                    </FormItem>
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Subtitle</FormLabel>
                                      <Input 
                                        placeholder="Subtext" 
                                        value={slide.subtitle} 
                                        onChange={(e) => {
                                          const newSlides = [...slides];
                                          newSlides[index].subtitle = e.target.value;
                                          form.setValue('ourCollectionSlides', newSlides);
                                        }}
                                        className="h-9 text-xs"
                                      />
                                    </FormItem>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Btn Label</FormLabel>
                                      <Input 
                                        placeholder="e.g., Shop Now" 
                                        value={slide.buttonText} 
                                        onChange={(e) => {
                                          const newSlides = [...slides];
                                          newSlides[index].buttonText = e.target.value;
                                          form.setValue('ourCollectionSlides', newSlides);
                                        }}
                                        className="h-9 text-xs"
                                      />
                                    </FormItem>
                                    <FormItem>
                                      <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-50">Link URL</FormLabel>
                                      <Input 
                                        placeholder="/store/shop" 
                                        value={slide.linkUrl} 
                                        onChange={(e) => {
                                          const newSlides = [...slides];
                                          newSlides[index].linkUrl = e.target.value;
                                          form.setValue('ourCollectionSlides', newSlides);
                                        }}
                                        className="h-9 text-xs"
                                      />
                                    </FormItem>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(mediaType === 'image' || mediaType === 'video') && (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormField
                            control={form.control}
                            name="ourCollectionOverlayTitle"
                            render={({ field }) => (
                              <FormItem><FormLabel className="font-bold">Overlay Heading</FormLabel><FormControl><Input placeholder="e.g., NEW LUXURY ARRIVALS" {...field} /></FormControl></FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ourCollectionOverlaySubtitle"
                            render={({ field }) => (
                              <FormItem><FormLabel className="font-bold">Overlay Subtitle</FormLabel><FormControl><Input placeholder="e.g., Discover our new arrivals" {...field} /></FormControl></FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormField
                            control={form.control}
                            name="ourCollectionButtonText"
                            render={({ field }) => (
                              <FormItem><FormLabel className="font-bold">Button Label</FormLabel><FormControl><Input placeholder="Shop Now" {...field} /></FormControl></FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ourCollectionLinkUrl"
                            render={({ field }) => (
                              <FormItem><FormLabel className="font-bold">Link URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl></FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <FormField
                            control={form.control}
                            name="ourCollectionTextColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="font-bold flex items-center gap-2">
                                  <Palette className="h-3.5 w-3.5" /> Text Color
                                </FormLabel>
                                <div className="flex items-center gap-3">
                                  <FormControl><Input type="color" {...field} className="p-1 h-10 w-12 cursor-pointer border-none shadow-sm" /></FormControl>
                                  <span className="text-xs font-mono font-bold text-muted-foreground">{field.value}</span>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ourCollectionShowOverlay"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-muted/5">
                                <div className="space-y-0.5">
                                  <FormLabel className="font-bold">Enable Glass Overlay</FormLabel>
                                  <p className="text-[10px] text-muted-foreground uppercase">Darkens background for readability</p>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="ourCollectionFullWidth"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-primary/5">
                          <div className="space-y-0.5">
                            <FormLabel className="font-bold flex items-center gap-2">
                              <Maximize className="h-4 w-4" /> Edge-to-Edge Media
                            </FormLabel>
                            <p className="text-[10px] text-muted-foreground uppercase">Remove container padding from media</p>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={resetMediaContent} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset Media
                  </Button>
                  <Button type="submit" disabled={isSaving || isUploading} className="gap-2 min-w-[140px] shadow-lg">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Media Changes
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
