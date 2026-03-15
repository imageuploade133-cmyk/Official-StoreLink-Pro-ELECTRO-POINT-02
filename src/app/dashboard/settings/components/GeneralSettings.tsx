
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
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Store, Globe, Smartphone, Copy, CheckCircle2, Info } from 'lucide-react';
import regions from '@/lib/regions.json';
import { Separator } from '@/components/ui/separator';

const generalSettingsSchema = z.object({
  storeAddress: z.string().optional(),
  storePhone: z.string().optional(),
  storeEmail: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal('')),
  currency: z.string().optional(),
  country: z.string().optional(),
  countryCode: z.string().optional(),
});

type FormValues = z.infer<typeof generalSettingsSchema>;

interface GeneralSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
}

export function GeneralSettings({ settingsData, isLoading }: GeneralSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [origin, setOrigin] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      storeAddress: '',
      storePhone: '',
      storeEmail: '',
      currency: '$',
      country: 'US',
      countryCode: '+1',
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (settingsData) {
      form.reset({
        storeAddress: settingsData.storeAddress || '',
        storePhone: settingsData.storePhone || '',
        storeEmail: settingsData.storeEmail || '',
        currency: settingsData.currency || '$',
        country: settingsData.country || 'US',
        countryCode: settingsData.countryCode || '+1',
      });
    }
  }, [settingsData, form]);

  const copyToClipboard = (path: string, label: string) => {
    const fullUrl = `${origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: "Signature Copied",
      description: `${label} has been added to your clipboard.`,
    });
  };

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      const selectedRegion = regions.find(r => r.name === data.country);
      const settingsToUpdate = {
        ...data,
        countryCode: data.country === 'Other' 
          ? data.countryCode 
          : selectedRegion?.dialCode || '',
      };
      await saveGlobalSettings(firestore, settingsToUpdate);
      toast({ title: 'Success', description: 'General settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-none ring-1 ring-border overflow-hidden">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5 text-primary"/> Business & Regional Settings</CardTitle>
              <CardDescription>Configure your business's contact info and localization.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                      control={form.control}
                      name="storePhone"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel className="font-bold">Store Phone Number</FormLabel>
                          <FormControl><Input type="tel" {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="storeEmail"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel className="font-bold">Store Email Address</FormLabel>
                          <FormControl><Input type="email" {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
              </div>
              <FormField
                control={form.control}
                name="storeAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Office/Store Address</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Currency Symbol</FormLabel>
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                  />
                   <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">Country / Region</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a region" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {regions.map((r) => (
                                <SelectItem key={r.code} value={r.name}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-6">
              <Button type="submit" disabled={isSaving} className="font-bold h-11 px-8">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Save General Settings
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {/* Public Access Hub */}
      <Card className="shadow-lg border-none ring-1 ring-border overflow-hidden">
        <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                <Globe className="h-5 w-5 text-primary" />
                Public Access Registry
            </CardTitle>
            <CardDescription>Direct digital signatures for your storefront and application entry points.</CardDescription>
        </CardHeader>
        <CardContent className="pt-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Storefront Link */}
                <div className="p-6 rounded-[2rem] border-2 border-dashed border-primary/10 bg-white dark:bg-slate-900 flex flex-col justify-between gap-6 transition-all hover:border-primary/30 group">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div className="space-y-0.5">
                            <h4 className="font-black text-sm uppercase tracking-wider">Web Storefront</h4>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Public Catalog & Shopping</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="bg-muted/30 p-3 rounded-xl border font-mono text-[10px] truncate opacity-60">
                            {origin}/store
                        </div>
                        <Button 
                            variant="secondary" 
                            className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg active:scale-95 transition-all"
                            onClick={() => copyToClipboard('/store', 'Storefront URL')}
                        >
                            <Copy className="h-3.5 w-3.5" />
                            Copy Store Link
                        </Button>
                    </div>
                </div>

                {/* Store-App Link */}
                <div className="p-6 rounded-[2rem] border-2 border-dashed border-primary/10 bg-white dark:bg-slate-900 flex flex-col justify-between gap-6 transition-all hover:border-primary/30 group">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                            <Smartphone className="h-6 w-6" />
                        </div>
                        <div className="space-y-0.5">
                            <h4 className="font-black text-sm uppercase tracking-wider">App Interface</h4>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Mobile-Optimized Experience</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="bg-muted/30 p-3 rounded-xl border font-mono text-[10px] truncate opacity-60">
                            {origin}/store-app
                        </div>
                        <Button 
                            variant="secondary" 
                            className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg active:scale-95 transition-all"
                            onClick={() => copyToClipboard('/store-app', 'Store-App URL')}
                        >
                            <Copy className="h-3.5 w-3.5" />
                            Copy App Link
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    These links provide direct access to your public-facing assets. Share them with your customers or use them to preview your brand&apos;s digital experience.
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
