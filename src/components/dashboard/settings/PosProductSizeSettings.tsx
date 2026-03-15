
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Maximize, LayoutGrid, MonitorSmartphone, MousePointer2, Info, Save } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const posProductSizeSchema = z.object({
  posProductSize: z.enum(['small', 'big', 'custom']).default('big'),
  posCustomColumns: z.coerce.number().min(1).max(6).default(2),
});

type FormValues = z.infer<typeof posProductSizeSchema>;

interface PosProductSizeSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
}

export function PosProductSizeSettings({ settingsData, isLoading }: PosProductSizeSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(posProductSizeSchema),
    defaultValues: {
      posProductSize: 'big',
      posCustomColumns: 2,
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        posProductSize: settingsData.posProductSize || 'big',
        posCustomColumns: settingsData.posCustomColumns || 2,
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Success', description: 'POS layout settings updated successfully.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update POS layout settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const currentSize = form.watch('posProductSize');

  return (
    <Card className="shadow-lg border-none ring-1 ring-border">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
                <MonitorSmartphone className="h-6 w-6 text-primary" />
                POS Product Grid Display
            </CardTitle>
            <CardDescription>Configure how products are sized and arranged in the Point of Sale interface.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <FormField
              control={form.control}
              name="posProductSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 block">Select Layout Mode</FormLabel>
                  <FormControl>
                    <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-muted/50 border">
                            <TabsTrigger value="big" className="text-xs font-bold gap-2">
                                <Maximize className="h-3.5 w-3.5" /> Big (2 Cols)
                            </TabsTrigger>
                            <TabsTrigger value="small" className="text-xs font-bold gap-2">
                                <LayoutGrid className="h-3.5 w-3.5" /> Small (4 Cols)
                            </TabsTrigger>
                            <TabsTrigger value="custom" className="text-xs font-bold gap-2">
                                <MousePointer2 className="h-3.5 w-3.5" /> Customized
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {currentSize === 'custom' && (
                <div className="p-6 rounded-2xl border-2 border-dashed bg-muted/20 animate-in fade-in slide-in-from-top-2">
                    <FormField
                        control={form.control}
                        name="posCustomColumns"
                        render={({ field }) => (
                            <FormItem className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <FormLabel className="text-base font-bold">Custom Column Count</FormLabel>
                                        <FormDescription>Set precisely how many product cards fit in a row.</FormDescription>
                                    </div>
                                    <div className="h-12 w-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center text-xl font-black shadow-lg">
                                        {field.value}
                                    </div>
                                </div>
                                <FormControl>
                                    <Slider
                                        value={[field.value || 2]}
                                        onValueChange={(value) => field.onChange(value[0])}
                                        min={1}
                                        max={6}
                                        step={1}
                                        className="py-4"
                                    />
                                </FormControl>
                                <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground tracking-tighter">
                                    <span>Single Focus (1)</span>
                                    <span>Max Density (6)</span>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}

            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex gap-4 items-start">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                    <p className="font-bold text-primary">Responsive Design Note</p>
                    <p className="text-muted-foreground leading-relaxed">
                        Pre-defined sizes are optimized for standard tablets and desktops. "Big" mode is recommended for 
                        touch-screen operations, while "Small" is better for high-density mouse navigation.
                    </p>
                </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-6">
            <Button type="submit" disabled={isSaving} className="font-bold min-w-[180px]">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
              Save Layout Changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
