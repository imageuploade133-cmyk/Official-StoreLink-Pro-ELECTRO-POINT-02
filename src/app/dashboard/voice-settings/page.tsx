
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { saveGlobalSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Volume2, 
  Loader2, 
  Save, 
  Info, 
  Palette, 
  Upload, 
  X, 
  CheckCircle2, 
  Play, 
  Square,
  Undo2
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const voiceSettingsSchema = z.object({
  voiceExperiencePreTitle: z.string().min(2, 'Pre-title is too short.').max(40, 'Pre-title is too long.'),
  voiceExperienceTitle: z.string().min(2, 'Title is too short.').max(60, 'Title is too long.'),
  voiceExperienceColor: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').default('#3b82f6'),
  voiceExperienceIconUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof voiceSettingsSchema>;

const ColorInput = ({ field, label }: { field: any; label: string }) => (
    <FormItem>
        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</FormLabel>
        <div className="relative flex items-center">
             <FormControl>
                <Input type="color" {...field} value={field.value || '#3b82f6'} className="p-1 h-10 w-12 cursor-pointer rounded-lg border-2" />
            </FormControl>
            <span className="absolute left-14 text-sm text-muted-foreground font-mono">{field.value}</span>
        </div>
        <FormMessage />
    </FormItem>
);

export default function VoiceSettingsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  // Fallback for old stores
  const oldSettingsRef = useMemo(
    () => (firestore && currentStoreId) ? doc(firestore, 'settings', currentStoreId) : null,
    [firestore, currentStoreId]
  );

  const { data: mainSettingsData, isLoading: isLoadingMainSettings } = useDoc<AppSettings>(settingsRef);
  const { data: oldSettingsData, isLoading: isLoadingOldSettings } = useDoc<AppSettings>(oldSettingsRef);

  const settingsData = mainSettingsData || oldSettingsData;

  const form = useForm<FormValues>({
    resolver: zodResolver(voiceSettingsSchema),
    defaultValues: {
      voiceExperiencePreTitle: 'Listen to Audio Signature',
      voiceExperienceTitle: 'Expert Insights & Detailed Pitch',
      voiceExperienceColor: '#3b82f6',
      voiceExperienceIconUrl: '',
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        voiceExperiencePreTitle: settingsData.voiceExperiencePreTitle || 'Listen to Audio Signature',
        voiceExperienceTitle: settingsData.voiceExperienceTitle || 'Expert Insights & Detailed Pitch',
        voiceExperienceColor: settingsData.voiceExperienceColor || '#3b82f6',
        voiceExperienceIconUrl: settingsData.voiceExperienceIconUrl || '',
      });
    }
  }, [settingsData, form]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { 
      toast({ variant: "destructive", title: "File too large", description: "Icon image should be smaller than 2MB." });
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue('voiceExperienceIconUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Icon Updated", description: "The custom voice signature icon has been set." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message });
      } finally {
        setIsUploading(false);
      }
    };
  };

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      if (currentStoreId) {
        await saveStoreSettings(firestore, currentStoreId, data);
      } else {
        await saveGlobalSettings(firestore, data);
      }
      toast({ title: 'Settings Saved', description: 'Voice signature branding has been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update configuration.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingMainSettings || (currentStoreId ? isLoadingOldSettings : false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Volume2} title="Voice Experience Settings" description="Loading configuration..." />
        <Skeleton className="h w-full rounded-3xl" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  const iconUrl = form.watch('voiceExperienceIconUrl');
  const cardColor = form.watch('voiceExperienceColor');

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        icon={Volume2}
        title="Voice Experience Settings"
        description="Customize the branding, labels, and visuals for product voice signatures."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-xl">Display Text & Branding</CardTitle>
                    <CardDescription>Adjust the labels and primary color of the audio player.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                        control={form.control}
                        name="voiceExperiencePreTitle"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text font-black uppercase tracking-widest text-primary">Micro-Label (Pre-Title)</FormLabel>
                                <FormControl><Input placeholder="e.g., Listen to Audio Signature" {...field} className="h-11 font-bold" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="voiceExperienceTitle"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text font-black uppercase tracking-widest text-primary">Main Experience Heading</FormLabel>
                                <FormControl><Input placeholder="e.g., Expert Insights & Detailed Pitch" {...field} className="h-11 font-black" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField 
                        control={form.control} 
                        name="voiceExperienceColor" 
                        render={({ field }) => <ColorInput field={field} label="Player Background Color" />} 
                    />
                    
                    <FormField
                        control={form.control}
                        name="voiceExperienceIconUrl"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text font-black uppercase tracking-widest text-primary">Custom Player Icon (Optional)</FormLabel>
                            <div className="flex flex-col gap-4">
                                {iconUrl && (
                                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border bg-white group">
                                        <Image src={iconUrl} alt="Custom Icon" fill className="object-cover" unoptimized />
                                        <Button 
                                            type="button" 
                                            variant="destructive" 
                                            size="icon" 
                                            className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => form.setValue('voiceExperienceIconUrl', '')}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <FormControl><Input placeholder="https://example.com/icon.png" {...field} value={field.value || ''} /></FormControl>
                                    <Button asChild variant="outline" size="icon" className="shrink-0 h-10 w-10" disabled={isUploading}>
                                        <label htmlFor="voice-icon-upload" className="cursor-pointer">
                                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                                        </label>
                                    </Button>
                                    <input id="voice-icon-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                </div>
                            </div>
                            <FormDescription className="text">Recommended: 200x200px PNG with transparency.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 border-t p-6">
                  <Button type="submit" disabled={isSaving} className="font-black uppercase tracking-widest text-xs h-12 px-8  ">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Sync Voice Configuration
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className=" border-none ring-1 ring-border">
                <CardHeader className="bg-muted/10">
                    <CardTitle className="text-sm font-black uppercase tracking text-primary flex items-center gap-2">
                        <Volume2 className="h-4 w-4" /> Real-time Insight
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-8">
                    {/* The Simulation */}
                    <div 
                        className="bg-primary text-white p-6 rounded  flex items-center gap-4 relative overflow-hidden transition-colors duration-500"
                        style={{ backgroundColor: cardColor }}
                    >
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                        <div className="absolute -right-4 -top-4 opacity-10">
                            {iconUrl ? (
                                <div className="relative h-24 w-24 rounded-xl overflow-hidden grayscale brightness">
                                    <Image src={iconUrl} alt="Icon" fill className="object-cover" unoptimized />
                                </div>
                            ) : (
                                <Volume2 className="h-24 w-24" />
                            )}
                        </div>
                        
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md text-white border-2 border-white/30  relative z-10 flex-shrink-0"
                        >
                            <Play className="h-6 w-6 fill-current ml-1" />
                        </Button>
                        
                        <div className="relative z-10 space-y-0.5 overflow-hidden">
                            <span className="text font-black uppercase tracking opacity-80 block truncate">
                                {form.watch('voiceExperiencePreTitle')}
                            </span>
                            <h4 className="text-sm font-black tracking-tight leading-tight truncate">
                                {form.watch('voiceExperienceTitle')}
                            </h4>
                        </div>
                    </div>
                    <p className="text text-muted-foreground font-black uppercase text-center mt-4 tracking-widest">Storefront Preview Simulation</p>
                </CardContent>
            </Card>

            <div className="p-6 bg-primary/5 rounded border-2 border-dashed border-primary/10 flex gap-4 items-start">
                <Palette className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-2">
                    <p className="font-bold text-primary uppercase tracking-wider">Multimedia Branding</p>
                    <p className="text-muted-foreground leading-relaxed font-medium">
                        The Voice Signature is an elite merchandising tool. Use high-contrast colors and professional labels to increase engagement with your audio pitches.
                    </p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
