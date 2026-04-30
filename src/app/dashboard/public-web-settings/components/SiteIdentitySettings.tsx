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
import { Loader2, Building, Upload, Maximize, MonitorUp, ArrowUpDown, Ruler, Share2, Share, ExternalLink, Link as LinkIcon, Send, RotateCcw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const shareIconOptions = [
  { name: 'Share2', icon: Share2 },
  { name: 'Share', icon: Share },
  { name: 'ExternalLink', icon: ExternalLink },
  { name: 'LinkIcon', icon: LinkIcon },
  { name: 'Send', icon: Send },
];

const siteIdentitySchema = z.object({
  storeName: z.string().min(2, 'Store name is required.').max(200, 'Store name is too long.'),
  invoiceLogoUrl: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
  storeLogoUrl: z.string().url('Must be a valid URL.').or(z.literal('')).optional(),
  storeLogoWidth: z.coerce.number().min(20).max(200).optional(),
  webMaxContainerWidth: z.coerce.number().min(1000).max(2500).default(1520),
  footerDescription: z.string().max(200, "Description is too long (max 200 chars).").optional(),
  showFooterDescription: z.boolean().optional(),
  showPublicStoreName: z.boolean().optional(),
  showMainSiteLogo: z.boolean().optional(),
  enableProductSharing: z.boolean().optional(),
  productSharingIcon: z.string().optional(),
});

type FormValues = z.infer<typeof siteIdentitySchema>;

interface SiteIdentitySettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

const defaultIdentityValues: FormValues = {
  storeName: 'V9 POS System',
  invoiceLogoUrl: '',
  storeLogoUrl: '',
  storeLogoWidth: 120,
  webMaxContainerWidth: 1520,
  footerDescription: '',
  showFooterDescription: true,
  showPublicStoreName: true,
  showMainSiteLogo: true,
  enableProductSharing: true,
  productSharingIcon: 'Share2',
};

export function SiteIdentitySettings({ settingsData, isLoading, storeId }: SiteIdentitySettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(siteIdentitySchema),
    defaultValues: defaultIdentityValues
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        storeName: settingsData.storeName || 'V9 POS System',
        invoiceLogoUrl: settingsData.invoiceLogoUrl || '',
        storeLogoUrl: settingsData.storeLogoUrl || '',
        storeLogoWidth: settingsData.storeLogoWidth || 120,
        webMaxContainerWidth: settingsData.webMaxContainerWidth || 1520,
        footerDescription: settingsData.footerDescription || '',
        showFooterDescription: settingsData.showFooterDescription ?? true,
        showPublicStoreName: settingsData.showPublicStoreName ?? true,
        showMainSiteLogo: settingsData.showMainSiteLogo ?? true,
        enableProductSharing: settingsData.enableProductSharing ?? true,
        productSharingIcon: settingsData.productSharingIcon || 'Share2',
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
      toast({ title: 'Success', description: 'Site identity settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    form.reset(defaultIdentityValues);
    toast({ title: 'Settings Reset', description: 'Site identity settings have been reset to default. Click "Sync Site Configuration" to save.' });
  };
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: 'invoiceLogoUrl' | 'storeLogoUrl') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit for logos
      toast({ variant: "destructive", title: "File too large", description: "Image must be smaller than 2MB." });
      return;
    }

    setUploadingField(fieldName);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri, storeId });
        form.setValue(fieldName, result.display_url, { shouldValidate: true });
        toast({ title: "Image Uploaded", description: `Your new logo has been set.` });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not upload image." });
      } finally {
        setUploadingField(null);
      }
    };
    reader.onerror = () => {
        toast({ variant: "destructive", title: "File Read Error" });
        setUploadingField(null);
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
            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" /> Site Identity & Layout</CardTitle>
            <CardDescription>Manage your public website's name, logos, and global layout width.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <FormField
              control={form.control}
              name="storeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Public Store Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSaving}/>
                  </FormControl>
                  {field.value && field.value.length > 20 && (
                    <FormDescription className="text-amber-600 dark:text-amber-400 font-medium italic">
                      Note: This name is quite long. It will be automatically wrapped on your public store for better readability, but you can still save it.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="border-dashed" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <FormField
                    control={form.control}
                    name="webMaxContainerWidth"
                    render={({ field }) => (
                    <FormItem className="space-y-4">
                        <div className="flex justify-between items-center">
                            <FormLabel className="font-bold flex items-center gap-2 text-primary">
                                <Maximize className="h-4 w-4" /> Site Container Width
                            </FormLabel>
                            <Badge variant="outline" className="font-mono">{field.value}px</Badge>
                        </div>
                        <FormControl>
                        <Slider
                            value={[field.value || 1520]}
                            onValueChange={(value) => field.onChange(value[0])}
                            min={1000}
                            max={2500}
                            step={10}
                            disabled={isSaving}
                            className="py-4"
                        />
                        </FormControl>
                        <FormDescription className="text-[10px]">
                            Adjust the expansive width of the storefront. 1520px is the premium wide standard.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="storeLogoWidth"
                    render={({ field }) => {
                        const logoWidth = field.value || 120;
                        // Calculate proportional navbar height based on logo width
                        const logoHeight = Math.max(32, Math.round(logoWidth * 0.33));
                        const navbarPadding = Math.max(16, Math.round(logoHeight * 0.5));
                        const navbarHeight = logoHeight + (navbarPadding * 2);
                        
                        return (
                        <FormItem className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <MonitorUp className="h-4 w-4 text-primary" />
                                    <FormLabel className="font-bold">Header Logo Width</FormLabel>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="outline" className="font-mono cursor-help">{logoWidth}px</Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Current logo width</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                            
                            {/* Live Preview */}
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-4 border">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Ruler className="h-3 w-3" /> Live Preview
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        Header Height: ~{navbarHeight}px
                                    </span>
                                </div>
                                <div 
                                    className="bg-white dark:bg-slate-950 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center transition-all duration-300 overflow-hidden"
                                    style={{ height: `${navbarHeight}px` }}
                                >
                                    {form.watch('invoiceLogoUrl') ? (
                                        <div 
                                            className="relative transition-all duration-300"
                                            style={{ width: `${logoWidth}px`, height: `${logoHeight}px` }}
                                        >
                                            <Image
                                                src={form.watch('invoiceLogoUrl')}
                                                alt="Logo Preview"
                                                fill
                                                className="object-contain"
                                                unoptimized
                                            />
                                        </div>
                                    ) : (
                                        <div 
                                            className="bg-primary/10 rounded flex items-center justify-center transition-all duration-300"
                                            style={{ width: `${logoWidth}px`, height: `${logoHeight}px` }}
                                        >
                                            <span className="text-[10px] font-bold text-primary">{logoWidth}px</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <FormControl>
                                <Slider
                                    value={[logoWidth]}
                                    onValueChange={(value) => field.onChange(value[0])}
                                    min={40}
                                    max={250}
                                    step={5}
                                    disabled={isSaving || !!uploadingField}
                                    className="py-2"
                                />
                            </FormControl>
                            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                                <span>40px</span>
                                <span className="flex items-center gap-1 text-primary">
                                    <ArrowUpDown className="h-3 w-3" />
                                    Auto-scales with header height
                                </span>
                                <span>250px</span>
                            </div>
                            <FormDescription className="text-xs">
                                Adjust your store logo size. The header top bar automatically scales proportionally to maintain visual balance.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        );
                    }}
                />
            </div>

            <Separator className="border-dashed" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="invoiceLogoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Site/Invoice Logo</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl><Input {...field} placeholder="https://example.com/logo-large.png" disabled={isSaving || !!uploadingField} /></FormControl>
                         <Button asChild variant="outline" size="icon" disabled={isSaving || !!uploadingField}>
                            <label htmlFor="invoice-logo-upload" className="cursor-pointer">
                              {uploadingField === 'invoiceLogoUrl' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                              <span className="sr-only">Upload Invoice Logo</span>
                            </label>
                        </Button>
                        <Input id="invoice-logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'invoiceLogoUrl')} disabled={isSaving || !!uploadingField} />
                      </div>
                      <FormDescription>Used for the public website header and A4 invoices.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="storeLogoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Small Receipt Logo</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl><Input {...field} placeholder="https://example.com/logo-small.png" disabled={isSaving || !!uploadingField} /></FormControl>
                        <Button asChild variant="outline" size="icon" disabled={isSaving || !!uploadingField}>
                            <label htmlFor="receipt-logo-upload" className="cursor-pointer">
                              {uploadingField === 'storeLogoUrl' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4" />}
                              <span className="sr-only">Upload Receipt Logo</span>
                            </label>
                        </Button>
                        <Input id="receipt-logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'storeLogoUrl')} disabled={isSaving || !!uploadingField} />
                      </div>
                       <FormDescription>A smaller logo for thermal receipts.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="footerDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Footer Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A short description of your store for the footer..." {...field} value={field.value || ''} disabled={isSaving}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="showFooterDescription"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                  <div className="space-y-0.5">
                    <FormLabel>Show Footer Description</FormLabel>
                    <FormDescription>
                      Display the short description below your logo in the site footer.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSaving}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="showPublicStoreName"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                  <div className="space-y-0.5">
                    <FormLabel>Show Public Store Name</FormLabel>
                    <FormDescription>
                      Display the store name text in the public website header and footer.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSaving}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="showMainSiteLogo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                  <div className="space-y-0.5">
                    <FormLabel>Show Main Site Logo</FormLabel>
                    <FormDescription>
                      Display the main site logo in the public website header and footer.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSaving}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator className="border-dashed" />

            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" /> Product Sharing Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="enableProductSharing"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 bg-muted/10 rounded-lg border">
                      <div className="space-y-0.5">
                        <FormLabel>Enable Product Sharing</FormLabel>
                        <FormDescription>
                          Allow users to share product links from the inventory and store.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSaving}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productSharingIcon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sharing Icon</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a share icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shareIconOptions.map((opt) => (
                            <SelectItem key={opt.name} value={opt.name}>
                              <div className="flex items-center gap-2">
                                <opt.icon className="h-4 w-4" />
                                <span>{opt.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between">
            <Button type="submit" disabled={isSaving || !!uploadingField} className="px-8 font-bold">
              {(isSaving || !!uploadingField) && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Sync Site Configuration
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving || !!uploadingField}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset to Default
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
