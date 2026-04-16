'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { hslStringToHex } from '@/lib/color-utils';
import { uploadImage } from '@/ai/flows/image-upload-flow';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Palette, RotateCcw, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

const colorSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  colorPrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  colorSuccess: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  colorDestructive: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  backgroundStyle: z.enum(['solid', 'gradient', 'image']).optional(),
  colorBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  backgroundGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  backgroundGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  backgroundImageUrl: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
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
};

interface ColorSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

const ColorInput = ({ field, label }: { field: any; label: string }) => (
    <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="relative flex items-center">
             <FormControl>
                <Input type="color" {...field} className="p-1 h-10 w-12 cursor-pointer" />
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

export function ColorSettings({ settingsData, isLoading, storeId }: ColorSettingsProps) {
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
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (storeId) {
        await saveStoreSettings(firestore, storeId, data);
      } else {
        await saveGlobalSettings(firestore, data);
      }
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
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        form.setValue('backgroundImageUrl', result.display_url, { shouldValidate: true });
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
              <h4 className="font-semibold text-base">Background Style</h4>
              
              <FormField
                control={form.control}
                name="backgroundStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Background Type</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { value: 'solid', label: 'Solid Color', icon: '■' },
                          { value: 'gradient', label: 'Gradient', icon: '⊔' },
                          { value: 'image', label: 'Image', icon: '🖼' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 sm:p-4 cursor-pointer transition-all ${
                              field.value === option.value
                                ? 'border-primary bg-primary/10 shadow-md'
                                : 'border-border hover:border-primary/50 hover:bg-card/50'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xl">{option.icon}</span>
                              <span className="text-sm font-medium">{option.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Solid Color Options */}
              {backgroundStyle === 'solid' && (
                <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span className="text-sm font-medium">Solid Color Settings</span>
                  </div>
                  <FormField 
                    control={form.control} 
                    name="colorBackground" 
                    render={({ field }) => <ColorInput field={field} label="Background Color" />} 
                  />
                </div>
              )}

              {/* Gradient Options */}
              {backgroundStyle === 'gradient' && (
                <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gradient-to-r from-primary to-secondary" />
                    <span className="text-sm font-medium">Gradient Settings</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField 
                      control={form.control} 
                      name="backgroundGradientStart" 
                      render={({ field }) => <ColorInput field={field} label="Gradient Start Color" />} 
                    />
                    <FormField 
                      control={form.control} 
                      name="backgroundGradientEnd" 
                      render={({ field }) => <ColorInput field={field} label="Gradient End Color" />} 
                    />
                  </div>
                </div>
              )}

              {/* Image Options */}
              {backgroundStyle === 'image' && (
                <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">🖼 Image Settings</span>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="backgroundImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Image URL</FormLabel>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <FormControl className="flex-1">
                            <Input 
                              {...field} 
                              placeholder="https://example.com/background.png" 
                              disabled={isUploading}
                              className="dark:bg-popover dark:border-border"
                            />
                          </FormControl>
                          <Button 
                            asChild 
                            variant="outline" 
                            disabled={isUploading}
                            className="w-full sm:w-auto"
                          >
                            <label htmlFor="image-upload" className="cursor-pointer justify-center">
                              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                              {isUploading ? 'Uploading...' : 'Upload'}
                              <Input 
                                id="image-upload" 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleImageUpload} 
                                disabled={isUploading} 
                              />
                            </label>
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Paste a URL or click Upload to add your image</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <FormField 
                    control={form.control} 
                    name="colorBackground" 
                    render={({ field }) => <ColorInput field={field} label="UI Overlay Color" />} 
                  />
                  <p className="text-xs text-muted-foreground">This color is used for cards and popovers on top of your background image for better readability.</p>
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
