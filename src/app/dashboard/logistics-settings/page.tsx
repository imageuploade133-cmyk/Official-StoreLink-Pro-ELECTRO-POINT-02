'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Truck, Loader2, Save, Info, Upload, Image as ImageIcon, X, Eye, EyeOff, CheckCircle2, MessageSquare, ShieldCheck, HelpCircle, Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Separator } from '@/components/ui/separator';

const logisticsSchema = z.object({
  shippingPolicy: z.string().min(10, 'Shipping policy must be at least 10 characters.'),
  returnsPolicy: z.string().min(10, 'Returns policy must be at least 10 characters.'),
  logisticsImageUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  showLogisticsOnPublicSite: z.boolean().default(true),
  logisticsFaq: z.array(z.object({
    question: z.string().min(5, 'Question is too short.'),
    answer: z.string().min(10, 'Answer is too short.'),
  })).optional().default([]),
});

type FormValues = z.infer<typeof logisticsSchema>;

export default function LogisticsSettingsPage() {
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
  const isLoadingSettings = isLoadingMainSettings && (currentStoreId ? isLoadingOldSettings : true);

  const form = useForm<FormValues>({
    resolver: zodResolver(logisticsSchema),
    defaultValues: {
      shippingPolicy: '',
      returnsPolicy: '',
      logisticsImageUrl: '',
      showLogisticsOnPublicSite: true,
      logisticsFaq: [],
    }
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "logisticsFaq"
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        shippingPolicy: settingsData.shippingPolicy || 'Orders are processed within 24 hours. Domestic delivery typically arrives in 3-5 business days. International options available at checkout.',
        returnsPolicy: settingsData.returnsPolicy || 'Not the perfect fit? Return any unused item in its original condition within 30 days for a full refund or exchange. No questions asked.',
        logisticsImageUrl: settingsData.logisticsImageUrl || '',
        showLogisticsOnPublicSite: settingsData.showLogisticsOnPublicSite ?? true,
        logisticsFaq: settingsData.logisticsFaq || [],
      });
    }
  }, [settingsData, form]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ variant: "destructive", title: "File too large", description: "Image must be smaller than 5MB." });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue('logisticsImageUrl', result.display_url, { shouldValidate: true });
        toast({ title: "Image Uploaded", description: "Logistics reference image has been set." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload image." });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
        toast({ variant: "destructive", title: "File Error", description: "Could not read the selected file."});
        setIsUploading(false);
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
      toast({ title: 'Settings Saved', description: 'Your logistics preferences have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isAuthLoading || isLoadingSettings;
  const currentImageUrl = form.watch('logisticsImageUrl');
  const isLogisticsVisible = form.watch('showLogisticsOnPublicSite');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={Truck} title="Logistics Settings" description="Loading..." />
        <Skeleton className="h w-full" />
      </div>
    );
  }

  if (!permissions.manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
            icon={Truck}
            title="Logistics & Fulfillment"
            description="Master configuration for shipping, returns, and delivery visuals."
        />
        <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving || isUploading}
            className="h-12 px-8 font-black uppercase tracking-widest   transition-all active:scale-95"
        >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Fulfillment Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Form {...form}>
            <form className="space-y-8">
              <Card className={cn(" border-none ring-1 ring-border overflow-hidden", !isLogisticsVisible && "opacity-60 grayscale")}>
                <CardHeader className="bg-muted/30 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-xl">Visibility & Brand Assets</CardTitle>
                        <CardDescription>Manage how logistics information is presented to the public.</CardDescription>
                    </div>
                    <FormField
                        control={form.control}
                        name="showLogisticsOnPublicSite"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-full border px-4 py-2 bg-background ">
                            <div className="flex items-center gap-2">
                                {field.value ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                                <FormLabel className="text font-black uppercase tracking-widest">{field.value ? 'Live on Web' : 'Hidden'}</FormLabel>
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
                <CardContent className="pt-8 space-y-8">
                  <FormField
                    control={form.control}
                    name="logisticsImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                            <ImageIcon className="h-4 w-4" /> Logistics Asset / Map Image
                        </FormLabel>
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                            {currentImageUrl ? (
                              <div className="relative w-full sm:w-64 aspect-video rounded-3xl overflow-hidden border-4 border-white  bg-white flex-shrink-0 group">
                                <Image 
                                    src={currentImageUrl} 
                                    alt="Logistics preview" 
                                    fill 
                                    className="object-cover" 
                                    unoptimized
                                />
                                <Button 
                                    type="button" 
                                    variant="destructive" 
                                    size="icon" 
                                    className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity "
                                    onClick={() => form.setValue('logisticsImageUrl', '')}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="w-full sm:w-64 aspect-video rounded-3xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center text-muted-foreground bg-primary/5 flex-shrink-0">
                                <ImageIcon className="h-10 w-10 opacity-20 mb-2" />
                                <span className="text font-black uppercase tracking text-primary/40">Media Pending</span>
                              </div>
                            )}
                            <div className="flex-grow space-y-4 w-full">
                                <FormControl>
                                    <Input placeholder="Direct URL to image (or upload below)" {...field} value={field.value || ''} disabled={isSaving || isUploading} className="h-11 font-medium bg-muted/20" />
                                </FormControl>
                                <div className="flex items-center gap-3">
                                    <Button asChild variant="outline" size="lg" className="rounded-2xl h-12 px-6 font-bold gap-2 border-primary/30 text-primary hover:bg-primary/5" disabled={isSaving || isUploading}>
                                        <label htmlFor="logistics-image-upload" className="cursor-pointer">
                                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}
                                            Upload Media Asset
                                        </label>
                                    </Button>
                                    <Input id="logistics-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isSaving || isUploading} />
                                    <p className="text font-bold text-muted-foreground uppercase tracking-tighter">Recommended: 1200x600 PNG or JPG</p>
                                </div>
                            </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-xl">Fulfillment Policies</CardTitle>
                    <CardDescription>Use the designer below to craft authoritative logistics documentation.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-10">
                  <FormField
                    control={form.control}
                    name="shippingPolicy"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormLabel className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                            <Truck className="h-4 w-4" /> Global Shipping Narrative
                        </FormLabel>
                        <FormControl>
                          <RichTextEditor 
                            value={field.value || ''} 
                            onChange={field.onChange}
                            placeholder="Explain your shipping speeds, carrier networks, and global reach..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator className="border-dashed" />

                  <FormField
                    control={form.control}
                    name="returnsPolicy"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormLabel className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" /> Global Returns Guarantee
                        </FormLabel>
                        <FormControl>
                          <RichTextEditor 
                            value={field.value || ''} 
                            onChange={field.onChange}
                            placeholder="Detail your return windows, conditions for refund, and exchange protocols..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b flex flex-row justify-between items-center pr-6">
                    <div>
                        <CardTitle className="text-xl">Question & Answer Registry</CardTitle>
                        <CardDescription>Manage the logistics FAQs displayed on the public landing page.</CardDescription>
                    </div>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="rounded-full gap-2 font-bold text-xs"
                        onClick={() => append({ question: '', answer: '' })}
                    >
                        <Plus className="h-4 w-4" /> Add FAQ
                    </Button>
                </CardHeader>
                <CardContent className="pt-8">
                    <div className="space-y-6">
                        {fields.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded bg-muted/5">
                                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No custom FAQs yet</p>
                                <Button 
                                    type="button" 
                                    variant="link" 
                                    onClick={() => append({ question: '', answer: '' })}
                                >
                                    Click here to add your first dynamic question
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="p-6 border rounded bg-muted/10 space-y-4 relative group transition-all hover:border-primary/20">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        
                                        <div className="flex gap-4">
                                            <div className="flex flex-col items-center gap-1 pt-2 shrink-0">
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 p-0 hover:text-primary disabled:opacity-30"
                                                    onClick={() => move(index, index - 1)}
                                                    disabled={index === 0}
                                                >
                                                    <ChevronUp className="h-4 w-4" />
                                                </Button>
                                                <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 p-0 hover:text-primary disabled:opacity-30"
                                                    onClick={() => move(index, index + 1)}
                                                    disabled={index === fields.length - 1}
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <FormField
                                                    control={form.control}
                                                    name={`logisticsFaq.${index}.question`}
                                                    render={({ field: qField }) => (
                                                        <FormItem className="space-y-1">
                                                            <FormLabel className="text font-black uppercase text-primary tracking">Question</FormLabel>
                                                            <FormControl><Input placeholder="e.g., How do I monitor my order trajectory?" {...qField} className="h-11 font-bold bg-background" /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`logisticsFaq.${index}.answer`}
                                                    render={({ field: aField }) => (
                                                        <FormItem className="space-y-1">
                                                            <FormLabel className="text font-black uppercase text-primary tracking">Answer</FormLabel>
                                                            <FormControl><RichTextEditor value={aField.value} onChange={aField.onChange} placeholder="Provide a clear, detailed explanation..." className="min-h" /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className="bg-primary text-primary-foreground border-none  overflow-hidden rounded">
                <CardHeader className="pt-10 px-8">
                    <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
                        <Info className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tight">Executive Guide</CardTitle>
                    <CardDescription className="text-primary-foreground/70">Building authority through transparency.</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-10 space-y-6">
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <CheckCircle2 className="h-5 w-5 shrink-0 mt-1" />
                            <p className="text-sm font-medium leading-relaxed">
                                <strong>Clear Windows:</strong> Specify exact processing times (e.g., "24-hour dispatch") to manage customer expectations.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <CheckCircle2 className="h-5 w-5 shrink-0 mt-1" />
                            <p className="text-sm font-medium leading-relaxed">
                                <strong>Trust Badges:</strong> Mention your shipping partners (DHL, FedEx, UPS) by name in your policy.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <CheckCircle2 className="h-5 w-5 shrink-0 mt-1" />
                            <p className="text-sm font-medium leading-relaxed">
                                <strong>Visual Aid:</strong> An uploaded shipping zone map significantly reduces support tickets regarding delivery times.
                            </p>
                        </div>
                    </div>
                    <Separator className="bg-white/20" />
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                        <p className="text font-black uppercase tracking-widest mb-2 opacity-60">Status Check</p>
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full animate-pulse", isLogisticsVisible ? "bg-green-400" : "bg-red-400")} />
                            <span className="text-xs font-bold">{isLogisticsVisible ? 'Fulfillment Page is LIVE' : 'Fulfillment Page is HIDDEN'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="p-8 border-2 border-dashed rounded bg-muted/10 space-y-4 text-center group transition-all hover:bg-muted/20 hover:border-primary/20">
                <div className="h-16 w-16 rounded-full bg-background border-2 border-muted flex items-center justify-center mx-auto transition-transform duration-500 group-hover:scale-110">
                    <MessageSquare className="h-8 w-8 text-primary/40" />
                </div>
                <h4 className="font-black text-lg tracking-tight uppercase">Support Integration</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    Changes saved here are instantly distributed to global edge regions, ensuring your customers always see the latest logistics protocols.
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
