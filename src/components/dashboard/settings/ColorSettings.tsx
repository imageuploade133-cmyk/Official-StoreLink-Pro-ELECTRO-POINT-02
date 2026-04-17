'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { hslStringToHex } from '@/lib/color-utils';
import { uploadImage } from '@/ai/flows/image-upload-flow';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Palette, RotateCcw, Upload, Video, Info, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

const colorSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  colorPrimary: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').optional(),
  colorSuccess: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').optional(),
  colorDestructive: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').optional(),
  backgroundStyle: z.enum(['solid', 'gradient', 'image', 'video']).optional(),
  colorBackground: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').optional(),
  backgroundGradientStart: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').optional(),
  backgroundGradientEnd: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').optional(),
  backgroundImageUrl: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
  backgroundVideoUrl: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
  backgroundVideoImageUrl: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
});

type FormValues = z.infer<typeof colorSettingsSchema>;

const defaultThemeValues: FormValues = {
  theme: 'system',
  colorPrimary: '#3b82f6',
  colorSuccess: '#22c55e',
  colorDestructive: '#ef4444',
  backgroundStyle: 'solid',
  colorBackground: '#ffffff',
  backgroundGradientStart: '#ffffff',
  backgroundGradientEnd: '#f1f5f9',
  backgroundImageUrl: '',
  backgroundVideoUrl: '',
  backgroundVideoImageUrl: '',
};

interface ColorSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
}

const ColorInput = ({ field, label }: { field: any; label: string }) => (
    <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="relative flex items-center">
             <FormControl>
                <Input type="color" {...field} value={field.value || ''} className="p-1 h-10 w-12 cursor-pointer" />
            </FormControl>
            <span className="absolute left-14 text-sm text-muted-foreground font-mono">{field.value}</span>
        </div>
        <FormMessage />
    </FormItem>
);

const toHex = (colorString: string | undefined, fallback: string): string => {
  if (!colorString) return fallback;
  if (colorString.startsWith('#')) return colorString;
  if (colorString.includes('%')) return hslStringToHex(colorString);
  return fallback;
};

export function ColorSettings({ settingsData, isLoading }: ColorSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(colorSettingsSchema),
    defaultValues: defaultThemeValues,
  });
  
  const backgroundStyle = form.watch('backgroundStyle');

  useEffect(() => {
    if (settingsData) {
      form.reset({
        theme: settingsData.theme || 'system',
        colorPrimary: toHex(settingsData.colorPrimary, '#3b82f6'),
        colorSuccess: toHex(settingsData.colorSuccess, '#22c55e'),
        colorDestructive: toHex(settingsData.colorDestructive, '#ef4444'),
        backgroundStyle: settingsData.backgroundStyle || 'solid',
        colorBackground: toHex(settingsData.colorBackground, '#ffffff'),
        backgroundGradientStart: toHex(settingsData.backgroundGradientStart, '#ffffff'),
        backgroundGradientEnd: toHex(settingsData.backgroundGradientEnd, '#f1f5f9'),
        backgroundImageUrl: settingsData.backgroundImageUrl || '',
        backgroundVideoUrl: settingsData.backgroundVideoUrl || '',
        backgroundVideoImageUrl: settingsData.backgroundVideoImageUrl || '',
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Success', description: 'Color & Theme settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    form.reset(defaultThemeValues);
    toast({ title: 'Theme Reset', description: 'Theme settings have been reset to default. Click "Save Theme Settings" to apply.' });
  };
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: 'backgroundImageUrl' | 'backgroundVideoImageUrl') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
      });
      return;
    }

    setIsUploading(true);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue(fieldName, result.display_url, { shouldValidate: true });
        toast({
          title: "Image Uploaded",
          description: "Your new background image has been set.",
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: error.message || "Could not upload image. Please try again.",
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({ variant: "destructive", title: "File Read Error", description: "Could not read the selected file."});
        setIsUploading(false);
    };
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5"/> Theme & Colors</CardTitle>
            <CardDescription>Customize the look and feel of your application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Appearance Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a theme" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System Default</SelectItem>
                        </SelectContent>
                    </Select>
                </FormItem>
              )}
            />
            <Separator />
            <h4 className="font-semibold text-base">Brand Colors</h4>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="colorPrimary" render={({ field }) => <ColorInput field={field} label="Primary Color" />} />
                <FormField control={form.control} name="colorSuccess" render={({ field }) => <ColorInput field={field} label="Success Color" />} />
                <FormField control={form.control} name="colorDestructive" render={({ field }) => <ColorInput field={field} label="Destructive Color" />} />
             </div>
            <Separator />
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-base mb-1">Background Style</h4>
                <p className="text-sm text-muted-foreground">Choose how you want to style your background</p>
              </div>
              
              <FormField
                control={form.control}
                name="backgroundStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
                      >
                        {/* Solid Color Option */}
                        <FormItem className="flex-1">
                          <FormControl>
                            <RadioGroupItem value="solid" id="style-solid" className="sr-only"/>
                          </FormControl>
                          <FormLabel 
                            htmlFor="style-solid" 
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-4 text-center transition-all ${
                              field.value === 'solid' 
                                ? 'border-primary bg-primary/5' 
                                : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg bg-blue-500 mb-2" />
                            <span className="text-sm font-semibold">Solid Color</span>
                            {field.value === 'solid' && <CheckCircle2 className="h-4 w-4 text-primary mt-1" />}
                          </FormLabel>
                        </FormItem>
                        
                        {/* Gradient Option */}
                        <FormItem className="flex-1">
                          <FormControl>
                            <RadioGroupItem value="gradient" id="style-gradient" className="sr-only"/>
                          </FormControl>
                          <FormLabel 
                            htmlFor="style-gradient"
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-4 text-center transition-all ${
                              field.value === 'gradient'
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-purple-400 to-pink-400 mb-2" />
                            <span className="text-sm font-semibold">Gradient</span>
                            {field.value === 'gradient' && <CheckCircle2 className="h-4 w-4 text-primary mt-1" />}
                          </FormLabel>
                        </FormItem>
                        
                        {/* Image Option */}
                        <FormItem className="flex-1">
                          <FormControl>
                            <RadioGroupItem value="image" id="style-image" className="sr-only"/>
                          </FormControl>
                          <FormLabel 
                            htmlFor="style-image"
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-4 text-center transition-all ${
                              field.value === 'image'
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-300 to-yellow-300 mb-2" />
                            <span className="text-sm font-semibold">Image</span>
                            {field.value === 'image' && <CheckCircle2 className="h-4 w-4 text-primary mt-1" />}
                          </FormLabel>
                        </FormItem>
                        
                        {/* Video Option */}
                        <FormItem className="flex-1">
                          <FormControl>
                            <RadioGroupItem value="video" id="style-video" className="sr-only"/>
                          </FormControl>
                          <FormLabel 
                            htmlFor="style-video"
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-4 text-center transition-all ${
                              field.value === 'video'
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-b from-cyan-400 to-teal-400 mb-2" />
                            <span className="text-sm font-semibold">Video</span>
                            {field.value === 'video' && <CheckCircle2 className="h-4 w-4 text-primary mt-1" />}
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Solid Color Configuration */}
              {backgroundStyle === 'solid' && (
                <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">Choose a solid color for your website background</p>
                  </div>
                  <FormField control={form.control} name="colorBackground" render={({ field }) => <ColorInput field={field} label="Background Color" />} />
                </div>
              )}

              {/* Gradient Configuration */}
              {backgroundStyle === 'gradient' && (
                <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">Select two colors for a smooth gradient transition</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="backgroundGradientStart" render={({ field }) => <ColorInput field={field} label="Gradient Start Color" />} />
                    <FormField control={form.control} name="backgroundGradientEnd" render={({ field }) => <ColorInput field={field} label="Gradient End Color" />} />
                  </div>
                  <div className="h-24 rounded-lg border border-slate-300 dark:border-slate-600" style={{
                    background: `linear-gradient(135deg, ${form.watch('backgroundGradientStart')} 0%, ${form.watch('backgroundGradientEnd')} 100%)`
                  }} />
                </div>
              )}

              {/* Image Configuration */}
              {backgroundStyle === 'image' && (
                <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">Upload or paste an image URL. For best results, use high-quality, optimized images (2-5MB)</p>
                  </div>
                  <FormField
                    control={form.control}
                    name="backgroundImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Image</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value ?? ''} 
                              placeholder="https://example.com/background.png" 
                              disabled={isUploading}
                            />
                          </FormControl>
                          <Button asChild variant="outline" disabled={isUploading} className="flex-shrink-0">
                            <label htmlFor="image-upload" className="cursor-pointer">
                              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                              Upload
                              <Input 
                                id="image-upload" 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleImageUpload(e, 'backgroundImageUrl')} 
                                disabled={isUploading} 
                              />
                            </label>
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="colorBackground" render={({ field }) => <ColorInput field={field} label="UI Background Color" />} />
                  <p className="text-xs text-muted-foreground italic">The UI color is used for cards, modals, and popovers displayed over the background image</p>
                </div>
              )}

              {/* Video Configuration */}
              {backgroundStyle === 'video' && (
                <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">Add a background video with an optional poster image for faster loading</p>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="backgroundVideoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Video URL</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''} 
                            placeholder="https://example.com/background.mp4" 
                            disabled={isUploading} 
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">Recommended: MP4 format, 5-15MB, 1920x1080 resolution</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="backgroundVideoImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video Poster Image (Optional)</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value ?? ''} 
                              placeholder="https://example.com/poster.jpg" 
                              disabled={isUploading} 
                            />
                          </FormControl>
                          <Button asChild variant="outline" disabled={isUploading} className="flex-shrink-0">
                            <label htmlFor="video-poster-upload" className="cursor-pointer">
                              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                              Upload
                            </label>
                          </Button>
                          <Input 
                            id="video-poster-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleImageUpload(e, 'backgroundVideoImageUrl')} 
                            disabled={isUploading} 
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Shown while the video is loading. Same dimensions as video recommended</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField control={form.control} name="colorBackground" render={({ field }) => <ColorInput field={field} label="UI Background Color" />} />
                  <p className="text-xs text-muted-foreground italic">The UI color is used for cards, modals, and popovers displayed over the video</p>
                </div>
              )}
            </div>
            
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <Button type="submit" disabled={isSaving || isUploading}>
              {(isSaving || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {isSaving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Theme Settings'}
            </Button>
            <Button type="button" variant="ghost" onClick={handleReset} disabled={isSaving || isUploading}>
              <RotateCcw className="mr-2 h-4 w-4"/>
              Reset to Default
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
