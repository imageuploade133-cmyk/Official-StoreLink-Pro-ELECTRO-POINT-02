'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import Image from 'next/image';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Palette, RotateCcw, LayoutPanelTop, Save, Upload, Image as ImageIcon, Layout, Maximize2, Minimize2, Type, RotateCw, Scaling } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const footerSettingsSchema = z.object({
  footerBackgroundStyle: z.enum(['solid', 'gradient']).optional(),
  footerColorBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  footerBackgroundGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  footerBackgroundGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  footerTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  footerDesign: z.enum(['standard', 'modern', 'minimal']).optional(),
  footerBannerUrl: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
  footerBannerSize: z.union([z.enum(['small', 'big']), z.coerce.number()]).optional(),
  footerBgType: z.enum(['text', 'image', 'none']).optional(),
  footerBgText: z.string().optional(),
  footerBgImageUrl: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
  footerBgSize: z.coerce.number().optional(),
  footerBgRotation: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof footerSettingsSchema>;

const defaultValues: FormValues = {
  footerBackgroundStyle: 'solid',
  footerColorBackground: '#101622',
  footerBackgroundGradientStart: '#101622',
  footerBackgroundGradientEnd: '#1e293b',
  footerTextColor: '#94a3b8',
  footerDesign: 'standard',
  footerBannerUrl: '',
  footerBannerSize: 'small',
  footerBgType: 'none',
  footerBgText: 'FOOTER',
  footerBgImageUrl: '',
  footerBgSize: 100,
  footerBgRotation: 0,
};

interface FooterSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

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

export function FooterSettings({ settingsData, isLoading, storeId }: FooterSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingBgImage, setIsUploadingBgImage] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(footerSettingsSchema),
    defaultValues: defaultValues,
  });
  
  const footerBackgroundStyle = form.watch('footerBackgroundStyle');

  useEffect(() => {
    if (settingsData) {
      form.reset({
        footerBackgroundStyle: settingsData.footerBackgroundStyle || 'solid',
        footerColorBackground: settingsData.footerColorBackground || '#101622',
        footerBackgroundGradientStart: settingsData.footerBackgroundGradientStart || '#101622',
        footerBackgroundGradientEnd: settingsData.footerBackgroundGradientEnd || '#1e293b',
        footerTextColor: settingsData.footerTextColor || '#94a3b8',
        footerDesign: settingsData.footerDesign || 'standard',
        footerBannerUrl: settingsData.footerBannerUrl || '',
        footerBannerSize: settingsData.footerBannerSize || 'small',
        footerBgType: settingsData.footerBgType || 'none',
        footerBgText: settingsData.footerBgText || 'FOOTER',
        footerBgImageUrl: settingsData.footerBgImageUrl || '',
        footerBgSize: settingsData.footerBgSize || 100,
        footerBgRotation: settingsData.footerBgRotation || 0,
      });
    }
  }, [settingsData, form]);

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Banner image must be smaller than 5MB." });
      return;
    }

    setIsUploadingBanner(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue('footerBannerUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Banner Uploaded", description: "Footer banner image has been updated." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload banner." });
      } finally {
        setIsUploadingBanner(false);
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "File Read Error" });
      setIsUploadingBanner(false);
    };
  };

  const handleBgImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Background image must be smaller than 5MB." });
      return;
    }

    setIsUploadingBgImage(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue('footerBgImageUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Background Image Uploaded", description: "Footer background image has been updated." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload background image." });
      } finally {
        setIsUploadingBgImage(false);
      }
    };
    reader.onerror = () => {
      toast({ variant: "destructive", title: "File Read Error" });
      setIsUploadingBgImage(false);
    };
  };

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (storeId) {
        await saveStoreSettings(firestore, storeId, data);
      } else {
        await saveGlobalSettings(firestore, data);
      }
      toast({ title: 'Success', description: 'Footer styling updated successfully.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update styling.' });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    form.reset(defaultValues);
    toast({ title: 'Styling Reset', description: 'Default values applied. Save to sync.' });
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  return (
    <Card className="shadow-xl border-none ring-1 ring-border overflow-hidden">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-3 text-xl">
                <LayoutPanelTop className="h-6 w-6 text-primary" />
                Footer Styling Suite
            </CardTitle>
            <CardDescription>Design an immersive experience for the bottom of your public storefront.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-10 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <ImageIcon className="h-3.5 w-3.5" /> Footer Banner Asset
                    </h4>
                    
                    <FormField
                      control={form.control}
                      name="footerBannerUrl"
                      render={({ field }) => (
                        <FormItem className="space-y-4">
                          <FormLabel className="text-sm font-bold">Banner Image</FormLabel>
                          <div className="flex flex-col gap-4">
                            {field.value && (
                              <div
                                className="relative w-full rounded-xl overflow-hidden border shadow-inner bg-muted/20 transition-all duration-500"
                                style={{
                                  height: typeof form.watch('footerBannerSize') === 'number'
                                    ? `${Math.min(form.watch('footerBannerSize') as number / 2, 200)}px`
                                    : form.watch('footerBannerSize') === 'big' ? '120px' : '80px'
                                }}
                              >
                                <Image src={field.value} alt="Footer Banner" fill className="object-cover" unoptimized />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-8 w-8 rounded-full"
                                  onClick={() => form.setValue('footerBannerUrl', '')}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Input {...field} placeholder="https://example.com/banner.png" disabled={isSaving || isUploadingBanner} />
                              </FormControl>
                              <Button asChild variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-xl" disabled={isSaving || isUploadingBanner}>
                                <label htmlFor="footer-banner-upload" className="cursor-pointer">
                                  {isUploadingBanner ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                                  <span className="sr-only">Upload Banner</span>
                                </label>
                              </Button>
                              <Input id="footer-banner-upload" type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={isSaving || isUploadingBanner} />
                            </div>
                          </div>
                          <FormDescription className="text-[10px]">A promotional banner displayed at the very bottom of your footer.</FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="footerBannerSize"
                      render={({ field }) => {
                        const val = typeof field.value === 'number' 
                          ? field.value 
                          : field.value === 'big' ? 288 : 160;

                        return (
                          <FormItem className="space-y-4">
                            <div className="flex justify-between">
                              <FormLabel className="text-sm font-bold flex items-center gap-2">
                                <Scaling className="h-4 w-4" /> Banner Height
                              </FormLabel>
                              <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{val}px</span>
                            </div>
                            <FormControl>
                              <Slider 
                                min={50} 
                                max={800} 
                                step={10} 
                                value={[val]} 
                                onValueChange={(vals) => field.onChange(vals[0])} 
                              />
                            </FormControl>
                            <FormDescription>Adjust the vertical height of your footer promotional banner.</FormDescription>
                          </FormItem>
                        );
                      }}
                    />
                </div>

                <div className="space-y-8">
                    <FormField
                      control={form.control}
                      name="footerDesign"
                      render={({ field }) => (
                        <FormItem className="space-y-4">
                          <FormLabel className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Layout className="h-4 w-4" /> Footer UI Design
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-2xl border-2 transition-all hover:border-primary">
                                <SelectValue placeholder="Select a design" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="standard">Standard (Classic)</SelectItem>
                              <SelectItem value="modern">Modern (Spacious)</SelectItem>
                              <SelectItem value="minimal">Minimal (Clean)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Choose the structural layout of your footer links and info.</FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="footerBackgroundStyle"
                      render={({ field }) => (
                        <FormItem className="space-y-4">
                          <FormLabel className="text-xs font-black uppercase tracking-[0.2em] text-primary">Background Mode</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid grid-cols-2 gap-4"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0 rounded-2xl border p-4 bg-muted/10 transition-colors hover:bg-muted/20">
                                <FormControl><RadioGroupItem value="solid" /></FormControl>
                                <Label className="font-bold cursor-pointer">Solid Fill</Label>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0 rounded-2xl border p-4 bg-muted/10 transition-colors hover:bg-muted/20">
                                <FormControl><RadioGroupItem value="gradient" /></FormControl>
                                <Label className="font-bold cursor-pointer">Gradient</Label>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                </div>
            </div>
            
            <Separator className="border-dashed" />

            <div className="space-y-8">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <ImageIcon className="h-3.5 w-3.5" /> Footer Background Branding (Text/Image)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="footerBgType"
                          render={({ field }) => (
                            <FormItem className="space-y-4">
                              <FormLabel className="text-sm font-bold">Background Type</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="flex gap-4"
                                >
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="none" /></FormControl>
                                    <Label className="font-medium cursor-pointer">None</Label>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="text" /></FormControl>
                                    <Label className="font-medium cursor-pointer flex items-center gap-1.5"><Type className="h-3.5 w-3.5"/> Text</Label>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="image" /></FormControl>
                                    <Label className="font-medium cursor-pointer flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5"/> Image</Label>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {form.watch('footerBgType') === 'text' && (
                          <FormField
                            control={form.control}
                            name="footerBgText"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-bold">Background Text</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Enter background text" />
                                </FormControl>
                                <FormDescription>Large background text for the footer.</FormDescription>
                              </FormItem>
                            )}
                          />
                        )}

                        {form.watch('footerBgType') === 'image' && (
                          <FormField
                            control={form.control}
                            name="footerBgImageUrl"
                            render={({ field }) => (
                              <FormItem className="space-y-4">
                                <FormLabel className="text-sm font-bold">Background Image</FormLabel>
                                <div className="flex flex-col gap-4">
                                  {field.value && (
                                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border shadow-inner bg-muted/20">
                                      <Image src={field.value} alt="Footer BG" fill className="object-contain" unoptimized />
                                      <Button 
                                        type="button" 
                                        variant="destructive" 
                                        size="icon" 
                                        className="absolute top-2 right-2 h-8 w-8 rounded-full"
                                        onClick={() => form.setValue('footerBgImageUrl', '')}
                                      >
                                        <RotateCcw className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <FormControl>
                                      <Input {...field} placeholder="https://example.com/bg.png" disabled={isSaving || isUploadingBgImage} />
                                    </FormControl>
                                    <Button asChild variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-xl" disabled={isSaving || isUploadingBgImage}>
                                      <label htmlFor="footer-bg-upload" className="cursor-pointer">
                                        {isUploadingBgImage ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                                        <span className="sr-only">Upload Background Image</span>
                                      </label>
                                    </Button>
                                    <Input id="footer-bg-upload" type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} disabled={isSaving || isUploadingBgImage} />
                                  </div>
                                </div>
                              </FormItem>
                            )}
                          />
                        )}
                    </div>

                    {(form.watch('footerBgType') === 'text' || form.watch('footerBgType') === 'image') && (
                      <div className="space-y-8">
                        <FormField
                          control={form.control}
                          name="footerBgSize"
                          render={({ field }) => (
                            <FormItem className="space-y-4">
                              <div className="flex justify-between">
                                <FormLabel className="text-sm font-bold flex items-center gap-2">
                                  <Scaling className="h-4 w-4" /> Size Scale
                                </FormLabel>
                                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{field.value}px</span>
                              </div>
                              <FormControl>
                                <Slider 
                                  min={10} 
                                  max={1000} 
                                  step={10} 
                                  value={[field.value || 100]} 
                                  onValueChange={(val) => field.onChange(val[0])} 
                                />
                              </FormControl>
                              <FormDescription>Adjust the size of the background element.</FormDescription>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="footerBgRotation"
                          render={({ field }) => (
                            <FormItem className="space-y-4">
                              <div className="flex justify-between">
                                <FormLabel className="text-sm font-bold flex items-center gap-2">
                                  <RotateCw className="h-4 w-4" /> Rotation
                                </FormLabel>
                                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{field.value}°</span>
                              </div>
                              <FormControl>
                                <Slider 
                                  min={-180} 
                                  max={180} 
                                  step={1} 
                                  value={[field.value || 0]} 
                                  onValueChange={(val) => field.onChange(val[0])} 
                                />
                              </FormControl>
                              <FormDescription>Rotate the background element.</FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                </div>
            </div>
            
            <Separator className="border-dashed" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Palette className="h-3.5 w-3.5" /> Color Merchandising
                    </h4>
                    {footerBackgroundStyle === 'solid' ? (
                        <FormField control={form.control} name="footerColorBackground" render={({ field }) => <ColorInput field={field} label="Main Background" />} />
                    ) : (
                        <div className="space-y-6">
                            <FormField control={form.control} name="footerBackgroundGradientStart" render={({ field }) => <ColorInput field={field} label="Gradient Start" />} />
                            <FormField control={form.control} name="footerBackgroundGradientEnd" render={({ field }) => <ColorInput field={field} label="Gradient End" />} />
                        </div>
                    )}
                    <FormField control={form.control} name="footerTextColor" render={({ field }) => <ColorInput field={field} label="Text & Description Color" />} />
                </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-6 flex justify-between items-center">
            <Button type="submit" disabled={isSaving} size="lg" className="px-10 h-12 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
              Apply Footer Styles
            </Button>
            <Button type="button" variant="ghost" onClick={resetToDefault} className="text-xs font-bold text-muted-foreground hover:text-primary gap-2">
                <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
