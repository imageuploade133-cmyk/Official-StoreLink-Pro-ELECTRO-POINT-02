
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/ai/flows/image-upload-flow';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Stamp, Save, Upload, Type, Image as ImageIcon, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const watermarkSchema = z.object({
  webWatermarkEnabled: z.boolean().default(false),
  webWatermarkType: z.enum(['text', 'image']).default('text'),
  webWatermarkText: z.string().optional().or(z.literal('')),
  webWatermarkImageUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  webWatermarkOpacity: z.coerce.number().min(0).max(1).default(0.1),
  webWatermarkFontSize: z.coerce.number().min(10).max(300).default(120),
  webWatermarkImageWidth: z.coerce.number().min(20).max(1000).default(400),
  webWatermarkRotation: z.coerce.number().min(-360).max(360).default(-30),
});

type FormValues = z.infer<typeof watermarkSchema>;

interface WatermarkSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

const defaultWatermarkValues: FormValues = {
  webWatermarkEnabled: false,
  webWatermarkType: 'text',
  webWatermarkText: 'STORELINK PRO',
  webWatermarkImageUrl: '',
  webWatermarkOpacity: 0.1,
  webWatermarkFontSize: 120,
  webWatermarkImageWidth: 400,
  webWatermarkRotation: -30,
};

export function WatermarkSettings({ settingsData, isLoading, storeId }: WatermarkSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(watermarkSchema),
    defaultValues: defaultWatermarkValues
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        webWatermarkEnabled: settingsData.webWatermarkEnabled || false,
        webWatermarkType: settingsData.webWatermarkType || 'text',
        webWatermarkText: settingsData.webWatermarkText || 'STORELINK PRO',
        webWatermarkImageUrl: settingsData.webWatermarkImageUrl || '',
        webWatermarkOpacity: settingsData.webWatermarkOpacity ?? 0.1,
        webWatermarkFontSize: settingsData.webWatermarkFontSize || 120,
        webWatermarkImageWidth: settingsData.webWatermarkImageWidth || 400,
        webWatermarkRotation: settingsData.webWatermarkRotation ?? -30,
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
      toast({ title: 'Success', description: 'Brand watermark settings updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    form.reset(defaultWatermarkValues);
    toast({ title: 'Settings Reset', description: 'Watermark settings have been reset to default. Click "Synchronize Watermark" to save.' });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({ variant: "destructive", title: "File too large", description: "Watermark image should be smaller than 2MB." });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue('webWatermarkImageUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Image Uploaded", description: "New watermark logo has been set." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload image." });
      } finally {
        setIsUploading(false);
      }
    };
  };

  const isEnabled = form.watch('webWatermarkEnabled');
  const type = form.watch('webWatermarkType');

  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  return (
    <Card className=" border-none ring-1 ring-border overflow-hidden">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="bg-muted/30 border-b">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Stamp className="h-6 w-6 text-primary" />
                    <div>
                        <CardTitle className="text-xl">Storefront Brand Watermark</CardTitle>
                        <CardDescription>Project a subtle brand signature across your public storefront.</CardDescription>
                    </div>
                </div>
                <FormField
                    control={form.control}
                    name="webWatermarkEnabled"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-full border px-4 py-2 bg-background ">
                        <div className="flex items-center gap-2">
                            {field.value ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest dark:text-black">{field.value ? 'Watermark ON' : 'Watermark OFF'}</FormLabel>
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
          <CardContent className={cn("space-y-10 pt-8 transition-opacity duration-500", !isEnabled && "opacity-40 grayscale-[0.5] pointer-events-none")}>
            <FormField
              control={form.control}
              name="webWatermarkType"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-xs font-black uppercase tracking-[0.2em] text-primary">Watermark Media Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-2xl border p-4 bg-muted/10 transition-colors hover:bg-muted/20 cursor-pointer">
                        <FormControl><RadioGroupItem value="text" /></FormControl>
                        <Label className="font-bold flex items-center gap-2 cursor-pointer"><Type className="h-4 w-4" /> Stylized Text</Label>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-2xl border p-4 bg-muted/10 transition-colors hover:bg-muted/20 cursor-pointer">
                        <FormControl><RadioGroupItem value="image" /></FormControl>
                        <Label className="font-bold flex items-center gap-2 cursor-pointer"><ImageIcon className="h-4 w-4" /> High-Res Logo</Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                    {type === 'text' ? (
                        <FormField
                            control={form.control}
                            name="webWatermarkText"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Watermark Text</FormLabel>
                                    <FormControl><Input placeholder="e.g., OFFICIAL STORE" {...field} value={field.value || ''} className="h-12 font-bold text-lg" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ) : (
                        <FormField
                            control={form.control}
                            name="webWatermarkImageUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Logo Asset</FormLabel>
                                    <div className="flex flex-col gap-4">
                                        {field.value && (
                                            <div className="relative w-full h-32 rounded-2xl border bg-muted/5 p-4 flex items-center justify-center">
                                                <Image src={field.value} alt="Watermark preview" width={100} height={100} className="object-contain max-h-full" unoptimized />
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <FormControl><Input placeholder="Direct URL or upload..." {...field} value={field.value || ''} className="h-11" /></FormControl>
                                            <Button asChild variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0" disabled={isUploading}>
                                                <label htmlFor="watermark-upload" className="cursor-pointer">
                                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                                </label>
                                            </Button>
                                            <input id="watermark-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                        </div>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="webWatermarkOpacity"
                            render={({ field }) => (
                                <FormItem className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Opacity ({Math.round(field.value * 100)}%)</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Slider
                                            value={[field.value ?? 0.1]}
                                            onValueChange={(val) => field.onChange(val[0])}
                                            min={0.01}
                                            max={0.5}
                                            step={0.01}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="webWatermarkRotation"
                            render={({ field }) => (
                                <FormItem className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <FormLabel className="text-[10px] font-black uppercase tracking-widest">Rotation ({field.value}°)</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Slider
                                            value={[field.value ?? -30]}
                                            onValueChange={(val) => field.onChange(val[0])}
                                            min={-180}
                                            max={180}
                                            step={1}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name={type === 'text' ? 'webWatermarkFontSize' : 'webWatermarkImageWidth'}
                        render={({ field }) => (
                            <FormItem className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                                        {type === 'text' ? `Font Size (${field.value}px)` : `Logo Width (${field.value}px)`}
                                    </FormLabel>
                                </div>
                                <FormControl>
                                    <Slider
                                        value={[field.value ?? (type === 'text' ? 120 : 400)]}
                                        onValueChange={(val) => field.onChange(val[0])}
                                        min={type === 'text' ? 20 : 50}
                                        max={type === 'text' ? 300 : 1000}
                                        step={5}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Internal Simulation</h4>
                    <div className="p-8 rounded-[2.5rem] border-2 border-dashed bg-muted/5 flex flex-col items-center justify-center text-center relative overflow-hidden aspect-video">
                        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-50">
                            <div 
                                style={{ 
                                    opacity: form.watch('webWatermarkOpacity'),
                                    transform: `rotate(${form.watch('webWatermarkRotation')}deg)`,
                                    width: type === 'text' ? 'auto' : `${form.watch('webWatermarkImageWidth') / 4}px`
                                }}
                            >
                                {type === 'text' ? (
                                    <span style={{ fontSize: `${form.watch('webWatermarkFontSize') / 4}px` }} className="font-black whitespace-nowrap">
                                        {form.watch('webWatermarkText') || 'WATERMARK'}
                                    </span>
                                ) : (
                                    form.watch('webWatermarkImageUrl') && (
                                        <img src={form.watch('webWatermarkImageUrl')} alt="Preview" className="w-full h-auto object-contain" />
                                    )
                                )}
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-black uppercase relative z-10 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border">Watermark Preview Area</p>
                    </div>
                </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <Button type="submit" disabled={isSaving || isUploading} size="lg" className="px-10 h-12 font-black uppercase text-xs tracking-widest  shadow-primary/20 transition-all active:scale-95">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
              Synchronize Watermark
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving || isUploading} className="font-bold uppercase tracking-widest text-[10px]">
              <RotateCcw className="mr-2 h-4 w-4" /> Reset to Default
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
