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
import { Loader2, GalleryHorizontal, Save, Clock, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const heroSettingsSchema = z.object({
  slideShowDuration: z.coerce.number().min(1000, "Minimum 1 second.").max(20000, "Maximum 20 seconds."),
});

type FormValues = z.infer<typeof heroSettingsSchema>;

interface HeroCarouselSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

const defaultHeroValues: FormValues = {
  slideShowDuration: 7000,
};

export function HeroCarouselSettings({ settingsData, isLoading, storeId }: HeroCarouselSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(heroSettingsSchema),
    defaultValues: defaultHeroValues
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        slideShowDuration: settingsData.slideShowDuration || 7000,
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
      toast({ title: 'Success', description: 'Hero carousel settings saved.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    form.reset(defaultHeroValues);
    toast({ title: 'Settings Reset', description: 'Hero carousel settings have been reset to default. Click "Save Carousel Timing" to save.' });
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  return (
    <Card className=" border-none ring-1 ring-border overflow-hidden">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-3 text-xl">
                <GalleryHorizontal className="h-6 w-6 text-primary" />
                Hero Carousel Engine
            </CardTitle>
            <CardDescription>Configure the timing and behavior of your homepage slideshow.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-10">
            <FormField
                control={form.control}
                name="slideShowDuration"
                render={({ field }) => (
                    <FormItem className="space-y-4">
                        <div className="flex justify-between items-center">
                            <FormLabel className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Slide Duration ({(field.value / 1000).toFixed(1)}s)
                            </FormLabel>
                            <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                                {field.value}ms
                            </span>
                        </div>
                        <FormControl>
                            <Slider
                                value={[field.value || 7000]}
                                onValueChange={(value) => field.onChange(value[0])}
                                min={1000}
                                max={20000}
                                step={500}
                                className="py-4"
                            />
                        </FormControl>
                        <FormDescription className="text-[10px]">Adjust how long each slide stays on screen before transitioning.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <Button type="submit" disabled={isSaving} className="font-black uppercase tracking-widest text-xs h-12 px-8  shadow-primary/20">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
              Save Carousel Timing
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