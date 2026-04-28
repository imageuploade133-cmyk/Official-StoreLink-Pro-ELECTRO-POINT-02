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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
  RefreshCcw,
  Layout,
  Settings2
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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [activeTab, setActiveTab] = useState('general');

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
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          icon={Sparkles}
          title="Manage Our Collection"
          description="Customize the 'Our Collection' section on your homepage"
        />
        
        <div className="flex gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 rounded-xl">
                <RotateCcw className="h-4 w-4" />
                Reset Defaults
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all settings on this page to their default values. This action cannot be undone unless you have saved your previous settings.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                  Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving || isUploading}
            className="gap-2 min-w-[150px] rounded-xl shadow-lg shadow-primary/20"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All Changes
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto p-1.5 bg-muted/50 rounded-2xl border border-primary/5">
              <TabsTrigger 
                value="general" 
                className="rounded-xl py-4 flex items-center gap-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              >
                <Layout className="h-4 w-4" />
                General Settings
              </TabsTrigger>
              <TabsTrigger 
                value="background" 
                className="rounded-xl py-4 flex items-center gap-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              >
                <Palette className="h-4 w-4" />
                Background Style
              </TabsTrigger>
              <TabsTrigger 
                value="media" 
                className="rounded-xl py-4 flex items-center gap-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              >
                <Monitor className="h-4 w-4" />
                High-Impact Media
              </TabsTrigger>
            </TabsList>

            <div className="mt-8">
              {/* General Settings Tab */}
              <TabsContent value="general" className="focus-visible:outline-none animate-in fade-in-50 duration-500">
                <Card className="border-none shadow-xl bg-gradient-to-br from-background to-muted/20">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Settings2 className="h-5 w-5 text-primary" /> Core Configuration
                    </CardTitle>
                    <CardDescription>Control the visibility and basic text of your collection section.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="flex items-center justify-between p-6 bg-primary/5 rounded-2xl border border-primary/10">
                      <div className="space-y-1">
                        <FormLabel className="text-base font-bold">Show Section on Homepage</FormLabel>
                        <FormDescription>Toggle visibility of the "Our Collection" section</FormDescription>
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
                            <FormLabel className="font-bold flex items-center gap-2">
                              <Type className="h-4 w-4 text-primary" /> Section Title
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Our Collection" {...field} className="h-12 rounded-xl bg-background/50" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ourCollectionDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" /> Section Description
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Discover our latest additions..." {...field} className="h-12 rounded-xl bg-background/50" />
                            </FormControl>
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
                            <FormLabel className="font-bold">Layout Style</FormLabel>
                            <div className="grid grid-cols-2 gap-4">
                              <button
                                type="button"
                                onClick={() => field.onChange('grid')}
                                className={cn(
                                  "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300",
                                  field.value === 'grid'
                                    ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                                    : 'border-muted hover:border-primary/30 bg-background/50'
                                )}
                              >
                                <div className={cn(
                                    "p-3 rounded-xl transition-colors",
                                    field.value === 'grid' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                )}>
                                  <LayoutGrid className="h-6 w-6" />
                                </div>
                                <span className="font-bold text-sm">Grid Layout</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => field.onChange('carousel')}
                                className={cn(
                                  "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300",
                                  field.value === 'carousel'
                                    ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                                    : 'border-muted hover:border-primary/30 bg-background/50'
                                )}
                              >
                                <div className={cn(
                                    "p-3 rounded-xl transition-colors",
                                    field.value === 'carousel' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                )}>
                                  <GalleryHorizontal className="h-6 w-6" />
                                </div>
                                <span className="font-bold text-sm">Carousel Slider</span>
                              </button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ourCollectionAlignment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">Text Alignment</FormLabel>
                            <div className="grid grid-cols-2 gap-4">
                              <button
                                type="button"
                                onClick={() => field.onChange('left')}
                                className={cn(
                                  "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300",
                                  field.value === 'left'
                                    ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                                    : 'border-muted hover:border-primary/30 bg-background/50'
                                )}
                              >
                                <div className={cn(
                                    "p-3 rounded-xl transition-colors",
                                    field.value === 'left' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                )}>
                                  <AlignLeft className="h-6 w-6" />
                                </div>
                                <span className="font-bold text-sm">Align Left</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => field.onChange('center')}
                                className={cn(
                                  "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300",
                                  field.value === 'center'
                                    ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                                    : 'border-muted hover:border-primary/30 bg-background/50'
                                )}
                              >
                                <div className={cn(
                                    "p-3 rounded-xl transition-colors",
                                    field.value === 'center' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                )}>
                                  <AlignCenter className="h-6 w-6" />
                                </div>
                                <span className="font-bold text-sm">Center Focus</span>
                              </button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Background Style Tab */}
              <TabsContent value="background" className="focus-visible:outline-none animate-in fade-in-50 duration-500">
                <Card className="border-none shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" /> Section Canvas
                    </CardTitle>
                    <CardDescription>Design the backdrop for your collections.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-10">
                    <FormField
                      control={form.control}
                      name="ourCollectionBackgroundType"
                      render={({ field }) => (
                        <FormItem className="space-y-4">
                          <FormLabel className="font-bold">Background Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-1 md:grid-cols-3 gap-4"
                            >
                              <Label
                                htmlFor="bg-solid"
                                className={cn(
                                  "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer",
                                  field.value === 'solid' ? "border-primary bg-primary/5 shadow-md" : "border-muted hover:bg-muted/30"
                                )}
                              >
                                <RadioGroupItem value="solid" id="bg-solid" className="sr-only" />
                                <div className="h-10 w-10 rounded-full bg-primary" />
                                <span className="font-bold">Solid Color</span>
                              </Label>
                              
                              <Label
                                htmlFor="bg-gradient"
                                className={cn(
                                  "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer",
                                  field.value === 'gradient' ? "border-primary bg-primary/5 shadow-md" : "border-muted hover:bg-muted/30"
                                )}
                              >
                                <RadioGroupItem value="gradient" id="bg-gradient" className="sr-only" />
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                                <span className="font-bold">Gradient</span>
                              </Label>

                              <Label
                                htmlFor="bg-image"
                                className={cn(
                                  "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer",
                                  field.value === 'image' ? "border-primary bg-primary/5 shadow-md" : "border-muted hover:bg-muted/30"
                                )}
                              >
                                <RadioGroupItem value="image" id="bg-image" className="sr-only" />
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <span className="font-bold">Image Backdrop</span>
                              </Label>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-6 p-6 rounded-2xl bg-muted/30 border border-muted/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { id: 'collection', label: 'Section Only' },
                                { id: 'homepage', label: 'Entire Homepage' },
                                { id: 'product', label: 'Product Pages' },
                                { id: 'global', label: 'All Pages' },
                            ].map((item) => (
                                <FormField
                                    key={item.id}
                                    control={form.control}
                                    name="ourCollectionBackgroundApplyTo"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-4 border rounded-xl bg-background/50">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes(item.id as any)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                            ? field.onChange([...(field.value || []), item.id])
                                                            : field.onChange(field.value?.filter((value) => value !== item.id))
                                                    }}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-bold cursor-pointer">{item.label}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    {backgroundType === 'solid' && (
                      <FormField
                        control={form.control}
                        name="ourCollectionBackgroundColor"
                        render={({ field }) => (
                          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <FormLabel className="font-bold">Background Color</FormLabel>
                            <div className="flex gap-4 items-center">
                                <FormControl>
                                  <Input type="color" {...field} className="w-20 h-12 p-1 rounded-xl cursor-pointer" />
                                </FormControl>
                                <Input placeholder="#ffffff" {...field} className="h-12 rounded-xl bg-background/50 font-mono" />
                                <div className="h-12 w-12 rounded-xl border-2 shadow-sm" style={{ backgroundColor: field.value || 'white' }} />
                            </div>
                          </div>
                        )}
                      />
                    )}

                    {backgroundType === 'gradient' && (
                      <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="ourCollectionGradientStart"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold text-xs uppercase tracking-widest opacity-70">Start Color</FormLabel>
                                        <div className="flex gap-3">
                                            <FormControl><Input type="color" {...field} className="w-12 h-10 p-1 rounded-lg" /></FormControl>
                                            <Input {...field} className="h-10 rounded-lg bg-background/50 font-mono" />
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ourCollectionGradientEnd"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold text-xs uppercase tracking-widest opacity-70">End Color</FormLabel>
                                        <div className="flex gap-3">
                                            <FormControl><Input type="color" {...field} className="w-12 h-10 p-1 rounded-lg" /></FormControl>
                                            <Input {...field} className="h-10 rounded-lg bg-background/50 font-mono" />
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="ourCollectionGradientDirection"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold">Flow Direction</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 rounded-xl bg-background/50">
                                                <SelectValue placeholder="Select direction" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="to bottom">To Bottom ↓</SelectItem>
                                            <SelectItem value="to top">To Top ↑</SelectItem>
                                            <SelectItem value="to right">To Right →</SelectItem>
                                            <SelectItem value="to left">To Left ←</SelectItem>
                                            <SelectItem value="to bottom right">Diagonal ↘</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <div 
                            className="h-24 w-full rounded-2xl shadow-inner border-2 border-dashed" 
                            style={{ background: `linear-gradient(${gradDir}, ${gradStart}, ${gradEnd})` }} 
                        />
                      </div>
                    )}

                    {backgroundType === 'image' && (
                      <FormField
                        control={form.control}
                        name="ourCollectionBackgroundImageUrl"
                        render={({ field }) => (
                          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <FormLabel className="font-bold">Asset Upload</FormLabel>
                            <div className="flex flex-col md:flex-row gap-6">
                                {backgroundImageUrl ? (
                                    <div className="relative w-full md:w-64 aspect-video rounded-2xl overflow-hidden border-2 border-primary shadow-xl shrink-0">
                                        <Image src={backgroundImageUrl} alt="Bg" fill className="object-cover" unoptimized />
                                        <button onClick={() => field.onChange('')} className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full shadow-lg">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-full md:w-64 aspect-video rounded-2xl border-2 border-dashed flex items-center justify-center bg-muted/20 shrink-0">
                                        <ImageIcon className="h-10 w-10 opacity-10" />
                                    </div>
                                )}
                                <div className="flex-1 space-y-4">
                                    <FormControl><Input placeholder="Image URL" {...field} className="h-12 rounded-xl bg-background/50" /></FormControl>
                                    <Button asChild variant="outline" className="w-full h-12 rounded-xl border-2 border-dashed border-primary/30" disabled={isUploading}>
                                        <label className="cursor-pointer">
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'ourCollectionBackgroundImageUrl')} />
                                            {isUploading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
                                            Upload Texture or Image
                                        </label>
                                    </Button>
                                </div>
                            </div>
                          </div>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Media Assets Tab */}
              <TabsContent value="media" className="focus-visible:outline-none animate-in fade-in-50 duration-500">
                <Card className="border-none shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-primary" /> Visual Banner Experience
                    </CardTitle>
                    <CardDescription>Enhance your collection with high-impact media banners.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-10">
                    <FormField
                      control={form.control}
                      name="ourCollectionMediaType"
                      render={({ field }) => (
                        <FormItem className="space-y-4">
                          <FormLabel className="font-bold">Media Type</FormLabel>
                          <FormControl>
                            <RadioGroup 
                              onValueChange={field.onChange} 
                              value={field.value} 
                              className="grid grid-cols-2 md:grid-cols-4 gap-4"
                            >
                              {[
                                { id: 'none', label: 'None', icon: X },
                                { id: 'image', label: 'Image', icon: ImageIcon },
                                { id: 'video', label: 'Video', icon: Video },
                                { id: 'slideshow', label: 'Slides', icon: GalleryHorizontal },
                              ].map((item) => (
                                <Label
                                    key={item.id}
                                    htmlFor={`media-${item.id}`}
                                    className={cn(
                                        "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer h-full justify-center text-center",
                                        field.value === item.id ? "border-primary bg-primary/5 shadow-md scale-105" : "border-muted hover:bg-muted/30"
                                    )}
                                >
                                    <RadioGroupItem value={item.id} id={`media-${item.id}`} className="sr-only" />
                                    <item.icon className={cn("h-8 w-8", field.value === item.id ? "text-primary" : "text-muted-foreground/50")} />
                                    <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>
                                </Label>
                              ))}
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {mediaType !== 'none' && (
                      <div className="space-y-10 animate-in slide-in-from-top-4 duration-500">
                        <Separator className="border-dashed" />

                        {mediaType === 'image' && (
                          <FormField
                            control={form.control}
                            name="ourCollectionImageUrl"
                            render={({ field }) => (
                              <FormItem className="space-y-4">
                                <FormLabel className="font-bold">Primary Hero Asset</FormLabel>
                                <div className="flex flex-col md:flex-row gap-6">
                                  {imageUrl ? (
                                    <div className="relative w-full md:w-64 aspect-video rounded-2xl overflow-hidden border-2 border-primary shadow-2xl shrink-0">
                                      <Image src={imageUrl} alt="Preview" fill className="object-cover" unoptimized />
                                    </div>
                                  ) : (
                                    <div className="w-full md:w-64 aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/20 shrink-0">
                                      <ImageIcon className="h-10 w-10 opacity-10" />
                                    </div>
                                  )}
                                  <div className="flex-1 space-y-4">
                                    <FormControl><Input placeholder="https://example.com/banner.jpg" {...field} className="h-12 rounded-xl bg-background/50" /></FormControl>
                                    <Button asChild variant="outline" className="w-full h-12 rounded-xl border-2 border-dashed border-primary/30" disabled={isUploading}>
                                      <label className="cursor-pointer">
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'ourCollectionImageUrl')} />
                                        {isUploading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Upload className="h-5 w-5 mr-2" />}
                                        Select Banner Image
                                      </label>
                                    </Button>
                                  </div>
                                </div>
                              </FormItem>
                            )}
                          />
                        )}

                        {mediaType === 'video' && (
                          <div className="grid grid-cols-1 gap-8">
                            <FormField
                              control={form.control}
                              name="ourCollectionVideoUrl"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="font-bold">Direct MP4 Video Link</FormLabel>
                                  <FormControl><Input placeholder="https://example.com/cinematic.mp4" {...field} className="h-12 rounded-xl bg-background/50" /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="ourCollectionVideoPosterUrl"
                              render={({ field }) => (
                                <FormItem className="space-y-4">
                                  <FormLabel className="font-bold text-xs uppercase tracking-widest">Video Thumbnail (Poster)</FormLabel>
                                  <div className="flex flex-col md:flex-row gap-6">
                                    {videoPosterUrl ? (
                                      <div className="relative w-full md:w-64 aspect-video rounded-2xl overflow-hidden border-2 border-primary shadow-xl shrink-0">
                                        <Image src={videoPosterUrl} alt="Preview" fill className="object-cover" unoptimized />
                                      </div>
                                    ) : (
                                      <div className="w-full md:w-64 aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/20 shrink-0">
                                        <ImageIcon className="h-10 w-10 opacity-10" />
                                      </div>
                                    )}
                                    <div className="flex-1 space-y-4">
                                      <FormControl><Input placeholder="https://example.com/poster.jpg" {...field} className="h-12 rounded-xl bg-background/50" /></FormControl>
                                      <Button asChild variant="outline" className="w-full h-12 rounded-xl border-2 border-dashed border-primary/30" disabled={isUploading}>
                                        <label className="cursor-pointer">
                                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'ourCollectionVideoPosterUrl')} />
                                          {isUploading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Upload className="h-5 w-5 mr-2" />}
                                          Upload Thumbnail
                                        </label>
                                      </Button>
                                    </div>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {mediaType === 'slideshow' && (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-xl font-black tracking-tight">Slide Collection</FormLabel>
                              <Button type="button" variant="outline" size="sm" onClick={addSlide} className="gap-2 rounded-lg bg-primary/5 border-primary/20 text-primary">
                                <Plus className="h-4 w-4" /> New Slide
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {slides.map((slide, index) => (
                                <div key={index} className="p-6 border rounded-2xl bg-muted/20 space-y-6 relative group border-primary/10 hover:border-primary/30 transition-all">
                                  <Button 
                                    type="button" 
                                    variant="destructive" 
                                    size="icon" 
                                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeSlide(index)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>

                                  <div className="space-y-4">
                                    <div className="flex gap-4">
                                        {slide.imageUrl ? (
                                            <div className="relative h-20 aspect-video rounded-xl overflow-hidden border-2 border-primary shadow-md shrink-0">
                                                <Image src={slide.imageUrl} alt="Slide" fill className="object-cover" unoptimized />
                                            </div>
                                        ) : (
                                            <div className="h-20 aspect-video rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/50 shrink-0">
                                                <ImageIcon className="h-6 w-6 opacity-10" />
                                            </div>
                                        )}
                                        <div className="flex-1 space-y-2">
                                            <Input 
                                                placeholder="Image URL" 
                                                value={slide.imageUrl} 
                                                onChange={(e) => {
                                                    const newSlides = [...slides];
                                                    newSlides[index].imageUrl = e.target.value;
                                                    form.setValue('ourCollectionSlides', newSlides);
                                                }}
                                                className="h-9 text-xs rounded-lg bg-background/50"
                                            />
                                            <Button asChild variant="outline" className="w-full h-8 text-[10px] rounded-lg" disabled={isUploading}>
                                                <label className="cursor-pointer">
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, `ourCollectionSlides.${index}.imageUrl`)} />
                                                    Upload
                                                </label>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <Input 
                                            placeholder="Slide Title" 
                                            value={slide.title} 
                                            onChange={(e) => {
                                                const newSlides = [...slides];
                                                newSlides[index].title = e.target.value;
                                                form.setValue('ourCollectionSlides', newSlides);
                                            }}
                                            className="h-10 rounded-lg bg-background/50 font-bold"
                                        />
                                        <Input 
                                            placeholder="Subtitle Text" 
                                            value={slide.subtitle} 
                                            onChange={(e) => {
                                                const newSlides = [...slides];
                                                newSlides[index].subtitle = e.target.value;
                                                form.setValue('ourCollectionSlides', newSlides);
                                            }}
                                            className="h-10 rounded-lg bg-background/50 text-sm"
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input 
                                                placeholder="Button: Shop Now" 
                                                value={slide.buttonText} 
                                                onChange={(e) => {
                                                    const newSlides = [...slides];
                                                    newSlides[index].buttonText = e.target.value;
                                                    form.setValue('ourCollectionSlides', newSlides);
                                                }}
                                                className="h-10 rounded-lg bg-background/50 text-xs"
                                            />
                                            <Input 
                                                placeholder="Link: /store/all" 
                                                value={slide.linkUrl} 
                                                onChange={(e) => {
                                                    const newSlides = [...slides];
                                                    newSlides[index].linkUrl = e.target.value;
                                                    form.setValue('ourCollectionSlides', newSlides);
                                                }}
                                                className="h-10 rounded-lg bg-background/50 text-xs"
                                            />
                                        </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(mediaType === 'image' || mediaType === 'video') && (
                          <div className="p-8 rounded-3xl bg-muted/40 border-2 border-dashed border-muted-foreground/10 space-y-8">
                            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary">Content Overlay Design</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <FormField
                                control={form.control}
                                name="ourCollectionOverlayTitle"
                                render={({ field }) => (
                                  <FormItem><FormLabel className="font-bold">Heading Label</FormLabel><FormControl><Input placeholder="e.g., NEW ARRIVALS" {...field} className="h-12 rounded-xl bg-background/50" /></FormControl></FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="ourCollectionOverlaySubtitle"
                                render={({ field }) => (
                                  <FormItem><FormLabel className="font-bold">Lead Text</FormLabel><FormControl><Input placeholder="e.g., Summer Collection 2024" {...field} className="h-12 rounded-xl bg-background/50" /></FormControl></FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <FormField
                                control={form.control}
                                name="ourCollectionButtonText"
                                render={({ field }) => (
                                  <FormItem><FormLabel className="font-bold">Action Button Text</FormLabel><FormControl><Input placeholder="Shop Collection" {...field} className="h-12 rounded-xl bg-background/50" /></FormControl></FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="ourCollectionLinkUrl"
                                render={({ field }) => (
                                  <FormItem><FormLabel className="font-bold">Destination URL</FormLabel><FormControl><Input placeholder="/store/collections" {...field} className="h-12 rounded-xl bg-background/50" /></FormControl></FormItem>
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
                                      <Palette className="h-3.5 w-3.5" /> Overlay Text Color
                                    </FormLabel>
                                    <div className="flex items-center gap-4">
                                      <FormControl><Input type="color" {...field} className="p-1 h-12 w-20 cursor-pointer rounded-xl border-none shadow-xl" /></FormControl>
                                      <span className="text-sm font-mono font-black">{field.value}</span>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="ourCollectionShowOverlay"
                                render={({ field }) => (
                                  <FormItem className="flex items-center justify-between p-4 px-6 border rounded-2xl bg-background/50 shadow-sm">
                                    <div className="space-y-0.5">
                                      <FormLabel className="font-bold">Glass Backdrop Overlay</FormLabel>
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Increase text legibility</p>
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
                            <FormItem className="flex items-center justify-between p-6 border-2 border-primary/20 rounded-3xl bg-primary/5 shadow-inner">
                              <div className="space-y-1">
                                <FormLabel className="font-black flex items-center gap-2 text-lg">
                                  <Maximize className="h-5 w-5 text-primary" /> Full-Width Presentation
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">Remove all container padding for an edge-to-edge cinematic experience.</p>
                              </div>
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
