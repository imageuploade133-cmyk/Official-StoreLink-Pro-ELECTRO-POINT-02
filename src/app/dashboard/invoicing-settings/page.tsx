
'use client';

import React, { useMemo, useState, useEffect } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Loader2, 
  Save, 
  Stamp, 
  PenTool, 
  Type, 
  ImageIcon, 
  Upload, 
  X,
  Palette,
  Maximize,
  RotateCcw,
  CheckCircle2,
  Info,
  ShieldCheck,
  MessageSquare,
  Landmark,
  Eye,
  EyeOff,
  Layout,
  Building
} from 'lucide-react';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadImage } from '@/ai/flows/image-upload-flow';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { InvoiceTrustAssets } from '@/components/invoices/InvoiceTrustAssets';

const invoicingSchema = z.object({
  invoiceAccentColor: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').default('#0b50da'),
  invoiceFooterText: z.string().optional().or(z.literal('')),
  invoiceBankDetails: z.string().optional().or(z.literal('')),
  invoiceEnableTextWatermark: z.boolean().default(false),
  invoiceWatermarkType: z.enum(['text', 'image']).default('text'),
  invoiceWatermarkText: z.string().optional().or(z.literal('')),
  invoiceWatermarkImageUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  invoiceWatermarkColor: z.string().regex(/^#[0-9a-fA{6}$/i, 'Must be a valid hex color').default('#000000'),
  invoiceWatermarkOpacity: z.coerce.number().min(0).max(1).default(0.05),
  invoiceWatermarkFontSize: z.coerce.number().min(10).max(300).default(120),
  invoiceWatermarkImageWidth: z.coerce.number().min(50).max(1000).default(400),
  invoiceWatermarkRotation: z.coerce.number().min(-360).max(360).default(-45),
  invoiceStampUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  invoiceSignatureUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  invoiceSignatureLabel: z.string().optional().or(z.literal('')),
  invoiceHideStamp: z.boolean().default(false),
  invoiceHideSignature: z.boolean().default(false),
  invoiceHideBankDetails: z.boolean().default(false),
  invoiceHideStoreInfo: z.boolean().default(false),
  invoiceTopBannerUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  invoiceShowTopBanner: z.boolean().default(false),
  invoiceBackgroundUrl: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  invoiceShowBackground: z.boolean().default(false),
});

type FormValues = z.infer<typeof invoicingSchema>;

export default function InvoicingSettingsPage() {
  const firestore = useFirestore();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const settingsRef = useMemo(
    () => (firestore ? doc(firestore, 'settings', 'global') : null),
    [firestore]
  );

  const { data: settingsData, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(invoicingSchema),
    defaultValues: {
      invoiceAccentColor: '#0b50da',
      invoiceFooterText: '',
      invoiceBankDetails: '',
      invoiceEnableTextWatermark: false,
      invoiceWatermarkType: 'text',
      invoiceWatermarkText: 'OFFICIAL DOCUMENT',
      invoiceWatermarkImageUrl: '',
      invoiceWatermarkColor: '#000000',
      invoiceWatermarkOpacity: 0.05,
      invoiceWatermarkFontSize: 120,
      invoiceWatermarkImageWidth: 400,
      invoiceWatermarkRotation: -45,
      invoiceStampUrl: '',
      invoiceSignatureUrl: '',
      invoiceSignatureLabel: 'Authorized Operational Signature',
      invoiceHideStamp: false,
      invoiceHideSignature: false,
      invoiceHideBankDetails: false,
      invoiceHideStoreInfo: false,
      invoiceTopBannerUrl: '',
      invoiceShowTopBanner: false,
      invoiceBackgroundUrl: '',
      invoiceShowBackground: false,
    }
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        invoiceAccentColor: settingsData.invoiceAccentColor || '#0b50da',
        invoiceFooterText: settingsData.invoiceFooterText || '',
        invoiceBankDetails: settingsData.invoiceBankDetails || '',
        invoiceEnableTextWatermark: settingsData.invoiceEnableTextWatermark ?? false,
        invoiceWatermarkType: settingsData.invoiceWatermarkType || 'text',
        invoiceWatermarkText: settingsData.invoiceWatermarkText || 'OFFICIAL DOCUMENT',
        invoiceWatermarkImageUrl: settingsData.invoiceWatermarkImageUrl || '',
        invoiceWatermarkColor: settingsData.invoiceWatermarkColor || '#000000',
        invoiceWatermarkOpacity: settingsData.invoiceWatermarkOpacity ?? 0.05,
        invoiceWatermarkFontSize: settingsData.invoiceWatermarkFontSize || 120,
        invoiceWatermarkImageWidth: settingsData.invoiceWatermarkImageWidth || 400,
        invoiceWatermarkRotation: settingsData.invoiceWatermarkRotation ?? -45,
        invoiceStampUrl: settingsData.invoiceStampUrl || '',
        invoiceSignatureUrl: settingsData.invoiceSignatureUrl || '',
        invoiceSignatureLabel: settingsData.invoiceSignatureLabel || 'Authorized Operational Signature',
        invoiceHideStamp: settingsData.invoiceHideStamp ?? false,
        invoiceHideSignature: settingsData.invoiceHideSignature ?? false,
        invoiceHideBankDetails: settingsData.invoiceHideBankDetails ?? false,
        invoiceHideStoreInfo: settingsData.invoiceHideStoreInfo ?? false,
        invoiceTopBannerUrl: settingsData.invoiceTopBannerUrl || '',
        invoiceShowTopBanner: settingsData.invoiceShowTopBanner ?? false,
        invoiceBackgroundUrl: settingsData.invoiceBackgroundUrl || '',
        invoiceShowBackground: settingsData.invoiceShowBackground ?? false,
      });
    }
  }, [settingsData, form]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: keyof FormValues) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Image must be smaller than 2MB." });
      return;
    }

    setUploadingField(field);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri });
        form.setValue(field, result.display_url as any, { shouldValidate: true });
        toast({ title: "Asset Synchronized", description: "Your brand imagery has been updated." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message });
      } finally {
        setUploadingField(null);
      }
    };
  };

  const onSubmit = async (data: FormValues) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await saveGlobalSettings(firestore, data);
      toast({ title: 'Protocol Updated', description: 'Invoicing visual settings are now live.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isLoadingSettings) {
    return (
      <div className="space-y-6">
        <PageHeader icon={FileText} title="Invoicing Protocol" description="Loading registry..." />
        <Skeleton className="h w-full rounded-3xl" />
      </div>
    );
  }

  if (!permissions.manage_settings) return <AccessDenied />;

  const watermarkEnabled = form.watch('invoiceEnableTextWatermark');
  const watermarkType = form.watch('invoiceWatermarkType');
  const showTopBanner = form.watch('invoiceShowTopBanner');
  const showBackground = form.watch('invoiceShowBackground');

  const simulatedSettings = {
      ...settingsData,
      ...form.getValues()
  } as AppSettings;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          icon={FileText} 
          title="Invoicing Visual Protocol" 
          description="Manage official stamps, signatures, and document watermarks."
        />
        <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving || !!uploadingField}
            className="h-12 px-8 font-black uppercase tracking-widest   transition-all active:scale-95"
        >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Sync Protocol
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Form {...form}>
            <form className="space-y-8">
              {/* Top Banner Section */}
              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Layout className="h-5 w-5 text-primary" /> Document Letterhead (Top Banner)
                            </CardTitle>
                            <CardDescription>A full-width brand banner that sits at the absolute top of every invoice.</CardDescription>
                        </div>
                        <FormField
                            control={form.control}
                            name="invoiceShowTopBanner"
                            render={({ field }) => (
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            )}
                        />
                    </div>
                </CardHeader>
                <CardContent className={cn("pt-8 space-y-6 transition-all", !showTopBanner && "opacity-40 grayscale pointer-events-none")}>
                    <FormField
                        control={form.control}
                        name="invoiceTopBannerUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Banner Media URL (Transparent PNG recommended)</FormLabel>
                                <div className="flex flex-col gap-4">
                                    {field.value && (
                                        <div className="relative w-full aspect rounded-2xl overflow-hidden border-2 bg-slate-50 flex items-center justify-center group">
                                            <Image src={field.value} alt="Top Banner" fill className="object-contain p-2" unoptimized />
                                            <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity " onClick={() => field.onChange('')}><X className="h-4 w-4" /></Button>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <FormControl><Input placeholder="https://example.com/letterhead.png" {...field} value={field.value || ''} disabled={!showTopBanner || !!uploadingField} /></FormControl>
                                        <Button asChild variant="outline" size="icon" className="shrink-0 h-10 w-10" disabled={!showTopBanner || !!uploadingField}>
                                            <label htmlFor="banner-upload" className="cursor-pointer">
                                                {uploadingField === 'invoiceTopBannerUrl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                            </label>
                                        </Button>
                                        <input id="banner-upload" type="file" accept="image/png" className="hidden" onChange={(e) => handleImageUpload(e, 'invoiceTopBannerUrl')} />
                                    </div>
                                    <FormDescription className="text">Ideal size: 1200x200px. This banner will be centered at the very top of the A4 layout.</FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />
                </CardContent>
              </Card>

              {/* Full Background Section */}
              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-primary" /> Full Document Background (Letterhead)
                            </CardTitle>
                            <CardDescription>Upload a design that covers the entire A4 canvas behind your content.</CardDescription>
                        </div>
                        <FormField
                            control={form.control}
                            name="invoiceShowBackground"
                            render={({ field }) => (
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            )}
                        />
                    </div>
                </CardHeader>
                <CardContent className={cn("pt-8 space-y-6 transition-all", !showBackground && "opacity-40 grayscale pointer-events-none")}>
                    <FormField
                        control={form.control}
                        name="invoiceBackgroundUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold">Background Asset URL</FormLabel>
                                <div className="flex flex-col gap-4">
                                    {field.value && (
                                        <div className="relative w-full aspect max-w rounded-2xl overflow-hidden border-2 bg-slate-50 flex items-center justify-center group  mx-auto">
                                            <Image src={field.value} alt="Full Background" fill className="object-cover" unoptimized />
                                            <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity " onClick={() => field.onChange('')}><X className="h-4 w-4" /></Button>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <FormControl><Input placeholder="https://example.com/full-hb.png" {...field} value={field.value || ''} disabled={!showBackground || !!uploadingField} /></FormControl>
                                        <Button asChild variant="outline" size="icon" className="shrink-0 h-10 w-10" disabled={!showBackground || !!uploadingField}>
                                            <label htmlFor="bg-upload" className="cursor-pointer">
                                                {uploadingField === 'invoiceBackgroundUrl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                            </label>
                                        </Button>
                                        <input id="bg-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'invoiceBackgroundUrl')} />
                                    </div>
                                    <FormDescription className="text">Recommended: A4 aspect ratio (2480x3508px) for maximum precision.</FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />
                </CardContent>
              </Card>

              {/* Branding Section */}
              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-xl flex items-center gap-3">
                        <Palette className="h-5 w-5 text-primary" /> Visual Identity & Visibility
                    </CardTitle>
                    <CardDescription>Fundamental styling and visibility protocols for generated A4 documents.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <FormField
                            control={form.control}
                            name="invoiceAccentColor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold text-xs uppercase tracking-widest text-primary">Global Accent Color</FormLabel>
                                    <div className="flex items-center gap-3">
                                        <FormControl>
                                            <Input type="color" {...field} className="p-1 h-12 w-16 cursor-pointer rounded-xl border-2" />
                                        </FormControl>
                                        <span className="text-sm font-mono font-bold text-muted-foreground">{field.value}</span>
                                    </div>
                                    <FormDescription className="text">Applies to headings and magnitude totals.</FormDescription>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="invoiceHideStoreInfo"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 border rounded-2xl bg-muted/10">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                            <Building className="h-3.5 w-3.5" /> Header Identity Visibility
                                        </FormLabel>
                                        <p className="text font-bold text-muted-foreground uppercase">Show store name & contact in header</p>
                                    </div>
                                    <FormControl>
                                        <div className="flex flex-col items-center gap-1">
                                            <Switch checked={!field.value} onCheckedChange={(val) => field.onChange(!val)} />
                                            <span className="text font-black uppercase">{!field.value ? 'Visible' : 'Hidden'}</span>
                                        </div>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
              </Card>

              {/* Settlement Section */}
              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Landmark className="h-5 w-5 text-primary" /> Settlement Registry
                            </CardTitle>
                            <CardDescription>Provide bank account details for manual transfers.</CardDescription>
                        </div>
                        <FormField
                            control={form.control}
                            name="invoiceHideBankDetails"
                            render={({ field }) => (
                                <FormControl>
                                    <div className="flex flex-col items-center gap-1">
                                        <Switch checked={!field.value} onCheckedChange={(val) => field.onChange(!val)} />
                                        <span className="text font-black uppercase">{!field.value ? 'Visible' : 'Hidden'}</span>
                                    </div>
                                </FormControl>
                            )}
                        />
                    </div>
                </CardHeader>
                <CardContent className="pt-8">
                    <FormField
                        control={form.control}
                        name="invoiceBankDetails"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold text-gray-700">Bank Account Details</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder="e.g., Bank: Zenith Bank | Acc: 1234567890 | Name: A.B.D.K Store" 
                                        rows={3}
                                        {...field}
                                        value={field.value || ''}
                                        className="rounded-xl border-slate-200"
                                    />
                                </FormControl>
                                <FormDescription className="text-xs">
                                    This information will appear automatically on Draft and Unpaid invoices to facilitate payment.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
              </Card>

              {/* Stamp & Signature Section */}
              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Stamp className="h-5 w-5 text-primary" /> Trust Assets
                    </CardTitle>
                    <CardDescription>Authorized stamps and signatures for document verification.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Stamp Upload */}
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="invoiceHideStamp"
                                render={({ field }) => (
                                    <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/5">
                                        <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                            <Stamp className="h-3.5 w-3.5" /> Stamp Visibility
                                        </Label>
                                        <div className="flex flex-col items-center gap-1">
                                            <Switch checked={!field.value} onCheckedChange={(val) => field.onChange(!val)} />
                                            <span className="text font-black uppercase">{!field.value ? 'Visible' : 'Hidden'}</span>
                                        </div>
                                    </div>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="invoiceStampUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold flex items-center gap-2">Official Stamp (Transparent PNG)</FormLabel>
                                        <div className="space-y-4">
                                            {field.value ? (
                                                <div className="relative w-full aspect-square max-w rounded-2xl overflow-hidden border-2 border-dashed bg-slate-50 flex items-center justify-center p-4 group">
                                                    <Image src={field.value} alt="Stamp" width={120} height={120} className="object-contain" unoptimized />
                                                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity " onClick={() => field.onChange('')}><X className="h-4 w-4" /></Button>
                                                </div>
                                            ) : (
                                                <div className="w-full aspect-square max-w rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                                                    <Stamp className="h-8 w-8 opacity-20 mb-2" />
                                                    <span className="text font-black uppercase tracking-widest">Stamp Missing</span>
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <FormControl><Input placeholder="Stamp URL..." {...field} value={field.value || ''} disabled={!!uploadingField} /></FormControl>
                                                <Button asChild variant="outline" size="icon" className="shrink-0 h-10 w-10" disabled={!!uploadingField}>
                                                    <label htmlFor="stamp-upload" className="cursor-pointer">
                                                        {uploadingField === 'invoiceStampUrl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                                    </label>
                                                </Button>
                                                <input id="stamp-upload" type="file" accept="image/png" className="hidden" onChange={(e) => handleImageUpload(e, 'invoiceStampUrl')} />
                                            </div>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Signature Upload */}
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="invoiceHideSignature"
                                render={({ field }) => (
                                    <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/5">
                                        <Label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                            <PenTool className="h-3.5 w-3.5" /> Signature Visibility
                                        </Label>
                                        <div className="flex flex-col items-center gap-1">
                                            <Switch checked={!field.value} onCheckedChange={(val) => field.onChange(!val)} />
                                            <span className="text font-black uppercase">{!field.value ? 'Visible' : 'Hidden'}</span>
                                        </div>
                                    </div>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="invoiceSignatureUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold flex items-center gap-2">Authorized Signature</FormLabel>
                                        <div className="space-y-4">
                                            {field.value ? (
                                                <div className="relative w-full aspect max-w rounded-2xl overflow-hidden border-2 border-dashed bg-slate-50 flex items-center justify-center p-4 group">
                                                    <Image src={field.value} alt="Signature" width={200} height={60} className="object-contain" unoptimized />
                                                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity " onClick={() => field.onChange('')}><X className="h-4 w-4" /></Button>
                                                </div>
                                            ) : (
                                                <div className="w-full aspect max-w rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                                                    <PenTool className="h-8 w-8 opacity-20 mb-2" />
                                                    <span className="text font-black uppercase tracking-widest">Signature Missing</span>
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <FormControl><Input placeholder="Signature URL..." {...field} value={field.value || ''} disabled={!!uploadingField} /></FormControl>
                                                <Button asChild variant="outline" size="icon" className="shrink-0 h-10 w-10" disabled={!!uploadingField}>
                                                    <label htmlFor="sig-upload" className="cursor-pointer">
                                                        {uploadingField === 'invoiceSignatureUrl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                                    </label>
                                                </Button>
                                                <input id="sig-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'invoiceSignatureUrl')} />
                                            </div>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="invoiceSignatureLabel"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold text-slate-500 uppercase tracking-widest">Signature Authorization Label</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Authorized Operational Signature" {...field} value={field.value || ''} className="h-11 font-black uppercase text-xs tracking-wider" />
                                        </FormControl>
                                        <FormDescription className="text">Customize the fine print below the signature line.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </CardContent>
              </Card>

              {/* Watermark Section */}
              <Card className=" border-none ring-1 ring-border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Type className="h-5 w-5 text-primary" /> Brand Watermark Protocol
                            </CardTitle>
                            <CardDescription>A subtle visual layer projected across the document background.</CardDescription>
                        </div>
                        <FormField
                            control={form.control}
                            name="invoiceEnableTextWatermark"
                            render={({ field }) => (
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            )}
                        />
                    </div>
                </CardHeader>
                <CardContent className={cn("pt-8 space-y-10 transition-all duration-500", !watermarkEnabled && "opacity-40 grayscale pointer-events-none")}>
                    <FormField
                      control={form.control}
                      name="invoiceWatermarkType"
                      render={({ field }) => (
                        <FormItem className="space-y-4">
                          <FormLabel className="text-xs font-black uppercase tracking text-primary">Watermark Media Type</FormLabel>
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
                            {watermarkType === 'text' ? (
                                <FormField
                                    control={form.control}
                                    name="invoiceWatermarkText"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">Watermark Message</FormLabel>
                                            <FormControl><Input placeholder="e.g., OFFICIAL RECORD" {...field} value={field.value || ''} className="h-12 font-bold" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="invoiceWatermarkImageUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">Logo Asset</FormLabel>
                                            <div className="flex gap-2">
                                                <FormControl><Input placeholder="Logo URL..." {...field} value={field.value || ''} disabled={!!uploadingField} /></FormControl>
                                                <Button asChild variant="outline" size="icon" className="shrink-0 h-10 w-10" disabled={!!uploadingField}>
                                                    <label htmlFor="watermark-img-upload" className="cursor-pointer">
                                                        {uploadingField === 'invoiceWatermarkImageUrl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                                    </label>
                                                </Button>
                                                <input id="watermark-img-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'invoiceWatermarkImageUrl')} />
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="invoiceWatermarkOpacity"
                                    render={({ field }) => (
                                        <FormItem className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <FormLabel className="text font-black uppercase tracking-widest">Opacity ({Math.round(field.value * 100)}%)</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Slider
                                                    value={[field.value ?? 0.05]}
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
                                    name="invoiceWatermarkRotation"
                                    render={({ field }) => (
                                        <FormItem className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <FormLabel className="text font-black uppercase tracking-widest">Rotation ({field.value}°)</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Slider
                                                    value={[field.value ?? -45]}
                                                    onValueChange={(val) => field.onChange(val[0])}
                                                    min={-180}
                                                    max={180}
                                                    step={5}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name={watermarkType === 'text' ? 'invoiceWatermarkFontSize' : 'invoiceWatermarkImageWidth'}
                                render={({ field }) => (
                                    <FormItem className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <FormLabel className="text font-black uppercase tracking-widest">
                                                {watermarkType === 'text' ? `Font Size (${field.value}px)` : `Logo Width (${field.value}px)`}
                                            </FormLabel>
                                        </div>
                                        <FormControl>
                                            <Slider
                                                value={[field.value ?? (watermarkType === 'text' ? 120 : 400)]}
                                                onValueChange={(val) => field.onChange(val[0])}
min={watermarkType === 'text' ? 20 : 50}
                                                max={watermarkType === 'text' ? 300 : 1000}
                                                step={5}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4">
                            <h4 className="text font-black uppercase text-slate-400 tracking-widest">Simulation View</h4>
                            <div className="aspect-video bg-muted/5 rounded border-2 border-dashed flex items-center justify-center relative overflow-hidden">
                                <div 
                                    className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none z-30 transition-all duration-75"
                                    style={{
                                        opacity: form.watch('invoiceWatermarkOpacity'),
                                        transform: `rotate(${form.watch('invoiceWatermarkRotation')}deg)`
                                    }}
                                >
                                    {watermarkType === 'text' ? (
                                        <span style={{ fontSize: `${form.watch('invoiceWatermarkFontSize') / 4}px` }} className="font-black whitespace-nowrap">
                                            {form.watch('invoiceWatermarkText') || 'WATERMARK'}
                                        </span>
                                    ) : (
                                        form.watch('invoiceWatermarkImageUrl') && (
                                            <img src={form.watch('invoiceWatermarkImageUrl')} alt="Preview" className="w-32 h-auto object-contain" />
                                        )
                                    )}
                                </div>
                                <p className="relative z-10 text font-black uppercase bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full border">Watermark Projection Area</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <Card className="bg-primary text-primary-foreground border-none  rounded overflow-hidden">
                <CardHeader className="pt-10 px-8">
                    <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tighter">Document Integrity</CardTitle>
                    <CardDescription className="text-primary-foreground/70">Building authority through elite branding.</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-10 space-y-6">
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                        <p className="text font-black uppercase tracking-widest mb-4 opacity-60">Live Simulation Hub</p>
                        <div className="bg-white rounded-xl overflow-hidden scale-90 -mx-4 ">
                            <div className="p-4 min-h flex flex-col justify-end relative">
                                <InvoiceTrustAssets 
                                    settings={simulatedSettings} 
                                    status="draft" 
                                    invoiceAccentColor={form.watch('invoiceAccentColor')}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <CheckCircle2 className="h-5 w-5 shrink-0 mt-1" />
                            <p className="text-sm font-medium leading-relaxed">
                                <strong>Trust Assets:</strong> Toggle the visibility of stamps and signatures to match your operational verification requirements.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <CheckCircle2 className="h-5 w-5 shrink-0 mt-1" />
                            <p className="text-sm font-medium leading-relaxed">
                                <strong>Contextual Settlement:</strong> Bank details are intelligently filtered—manifesting only on documents requiring payment.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="p-8 border-2 border-dashed rounded bg-muted/10 space-y-4 group transition-all hover:bg-muted/20 hover:border-primary/20">
                <div className="size-16 rounded-full bg-background border-2 border-muted flex items-center justify-center mx-auto transition-transform duration-500 group-hover:scale-110 ">
                    <Info className="h-8 w-8 text-primary/40" />
                </div>
                <h4 className="font-black text-lg tracking-tight uppercase">Registry Tip</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    Hiding assets creates a minimalist aesthetic, while visible stamps and signatures reinforce the legal magnitude of the document.
                </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
