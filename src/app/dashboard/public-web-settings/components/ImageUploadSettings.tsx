
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ImagePlus, Save, Info, Check, ShieldCheck, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

const imageSettingsSchema = z.object({
  imageUploadQuality: z.coerce.number().min(10, "Quality too low.").max(100, "Quality max is 100."),
  imageMaxWidth: z.coerce.number().min(400, "Dimension too small.").max(4000, "Dimension too large."),
  imageMaxFileSizeMb: z.coerce.number().min(1, "Minimum 1MB required.").max(20, "Maximum 20MB allowed."),
});

type FormValues = z.infer<typeof imageSettingsSchema>;

interface ImageUploadSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

const defaultImageValues: FormValues = {
  imageUploadQuality: 80,
  imageMaxWidth: 1920,
  imageMaxFileSizeMb: 5,
};

export function ImageUploadSettings({ settingsData, isLoading, storeId }: ImageUploadSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(imageSettingsSchema),
    defaultValues: defaultImageValues
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        imageUploadQuality: settingsData.imageUploadQuality || 80,
        imageMaxWidth: settingsData.imageMaxWidth || 1920,
        imageMaxFileSizeMb: settingsData.imageMaxFileSizeMb || 5,
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
      toast({ title: 'Success', description: 'Image optimization settings saved.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    form.reset(defaultImageValues);
    toast({ title: 'Settings Reset', description: 'Image optimization settings have been reset to default. Click "Save Optimization Profile" to save.' });
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <Card className=" border-none ring-1 ring-border overflow-hidden">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-3 text-xl">
                <ImagePlus className="h-6 w-6 text-primary" />
                Image Optimization Engine
            </CardTitle>
            <CardDescription>Configure how images are processed and compressed on the client-side before being uploaded.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-10 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                    <FormField
                        control={form.control}
                        name="imageMaxFileSizeMb"
                        render={({ field }) => (
                            <FormItem className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-primary">Max Upload Size ({field.value}MB)</FormLabel>
                                    <Badge variant="outline" className="font-mono">{field.value}MB</Badge>
                                </div>
                                <FormControl>
                                    <Slider
                                        value={[field.value || 5]}
                                        onValueChange={(value) => field.onChange(value[0])}
                                        min={1}
                                        max={20}
                                        step={1}
                                        className="py-4"
                                    />
                                </FormControl>
                                <FormDescription className="text-[10px]">Files larger than this will be rejected instantly to save bandwidth.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="imageUploadQuality"
                        render={({ field }) => (
                            <FormItem className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-primary">Target Quality ({field.value}%)</FormLabel>
                                    <Badge variant="outline" className="font-mono">{field.value}%</Badge>
                                </div>
                                <FormControl>
                                    <Slider
                                        value={[field.value || 80]}
                                        onValueChange={(value) => field.onChange(value[0])}
                                        min={10}
                                        max={100}
                                        step={5}
                                        className="py-4"
                                    />
                                </FormControl>
                                <FormDescription className="text-[10px]">Higher quality results in larger file sizes and slower load times.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="imageMaxWidth"
                        render={({ field }) => (
                            <FormItem className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <FormLabel className="text-sm font-black uppercase tracking-widest text-primary">Max Width ({field.value}px)</FormLabel>
                                    <Badge variant="outline" className="font-mono">{field.value}px</Badge>
                                </div>
                                <FormControl>
                                    <Slider
                                        value={[field.value || 1920]}
                                        onValueChange={(value) => field.onChange(value[0])}
                                        min={400}
                                        max={4000}
                                        step={100}
                                        className="py-4"
                                    />
                                </FormControl>
                                <FormDescription className="text-[10px]">Images wider than this will be scaled down automatically.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 space-y-4">
                    <div className="flex items-center gap-3 text-primary">
                        <Info className="h-5 w-5" />
                        <h4 className="font-bold text-sm uppercase tracking-wider">Optimization Intelligence</h4>
                    </div>
                    <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                        <li className="flex gap-2">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span><strong>Universal Support:</strong> The engine automatically converts any format (PNG, WEBP, BMP) to highly compressed JPEG.</span>
                        </li>
                        <li className="flex gap-2">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span><strong>Hard Limits:</strong> Size validation occurs before processing, protecting your system from unoptimized payload attacks.</span>
                        </li>
                        <li className="flex gap-2">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span><strong>Recommended:</strong> 5MB limit at 80% quality provides an elite user experience with fast loading.</span>
                        </li>
                    </ul>
                </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <Button type="submit" disabled={isSaving} className="font-black uppercase tracking-widest text-xs h-12 px-8  shadow-primary/20">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
              Save Optimization Profile
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving} className="font-bold uppercase tracking-widest text-[10px]">
              <RotateCcw className="mr-2 h-4 w-4" /> Reset to Default
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
