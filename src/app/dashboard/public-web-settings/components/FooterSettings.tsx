'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Palette, RotateCcw, LayoutPanelTop, Save } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const footerSettingsSchema = z.object({
  footerBackgroundStyle: z.enum(['solid', 'gradient']).optional(),
  footerColorBackground: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  footerBackgroundGradientStart: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  footerBackgroundGradientEnd: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
  footerTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/i, 'Must be a valid hex color').optional(),
});

type FormValues = z.infer<typeof footerSettingsSchema>;

const defaultValues: FormValues = {
  footerBackgroundStyle: 'solid',
  footerColorBackground: '#101622',
  footerBackgroundGradientStart: '#101622',
  footerBackgroundGradientEnd: '#1e293b',
  footerTextColor: '#94a3b8',
};

interface FooterSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
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

export function FooterSettings({ settingsData, isLoading }: FooterSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

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
      });
    }
  }, [settingsData, form]);

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
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
                        <Label className="font-bold cursor-pointer">Solid Color Fill</Label>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-2xl border p-4 bg-muted/10 transition-colors hover:bg-muted/20">
                        <FormControl><RadioGroupItem value="gradient" /></FormControl>
                        <Label className="font-bold cursor-pointer">Linear Gradient Flow</Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            
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

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Real-time Insight</h4>
                    <div className="p-6 rounded-[2rem] border-2 border-dashed bg-muted/5 flex flex-col items-center justify-center text-center gap-4">
                        <div 
                            className="w-full h-24 rounded-2xl border shadow-inner flex items-center justify-center overflow-hidden"
                            style={footerBackgroundStyle === 'solid' 
                                ? { backgroundColor: form.watch('footerColorBackground') } 
                                : { backgroundImage: `linear-gradient(to bottom right, ${form.watch('footerBackgroundGradientStart')}, ${form.watch('footerBackgroundGradientEnd')})` }
                            }
                        >
                            <span className="font-black text-xs uppercase tracking-widest" style={{ color: form.watch('footerTextColor') }}>PREVIEW CONTENT</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium max-w-[200px]">The preview above approximates how the footer background will interact with your text color.</p>
                    </div>
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
