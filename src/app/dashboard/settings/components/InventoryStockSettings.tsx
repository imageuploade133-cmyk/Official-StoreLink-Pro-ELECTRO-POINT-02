'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/ai/flows/image-upload-flow';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Boxes, Upload } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const inventorySettingsSchema = z.object({
    preventManualStockReduction: z.boolean().optional(),
    allowStockDeduction: z.boolean().optional(),
    lowStockThreshold: z.coerce.number().min(0).optional(),
    defaultProductImageUrl: z.string().url().or(z.literal('')).optional(),
    enableLowStockAlerts: z.boolean().optional(),
    lowStockAlertPhoneNumber: z.string().optional(),
    lowStockAlertMessage: z.string().optional(),
    outOfStockAlertMessage: z.string().optional(),
});

type FormValues = z.infer<typeof inventorySettingsSchema>;

interface InventoryStockSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

export function InventoryStockSettings({ settingsData, isLoading, storeId }: InventoryStockSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(inventorySettingsSchema),
    defaultValues: {
      preventManualStockReduction: false,
      allowStockDeduction: true,
      lowStockThreshold: 10,
      defaultProductImageUrl: '',
      enableLowStockAlerts: false,
      lowStockAlertPhoneNumber: '',
      lowStockAlertMessage: 'LOW STOCK: {productName} is now at {currentStock} units.',
      outOfStockAlertMessage: 'URGENT: {productName} is now OUT OF STOCK!',
    },
  });
  
  const enableLowStockAlerts = form.watch('enableLowStockAlerts');

  useEffect(() => {
    if (settingsData) {
      form.reset({
        preventManualStockReduction: settingsData.preventManualStockReduction || false,
        allowStockDeduction: settingsData.allowStockDeduction ?? true,
        lowStockThreshold: settingsData.lowStockThreshold || 10,
        defaultProductImageUrl: settingsData.defaultProductImageUrl || '',
        enableLowStockAlerts: settingsData.enableLowStockAlerts || false,
        lowStockAlertPhoneNumber: settingsData.lowStockAlertPhoneNumber || '',
        lowStockAlertMessage: settingsData.lowStockAlertMessage || 'LOW STOCK: {productName} is now at {currentStock} units.',
        outOfStockAlertMessage: settingsData.outOfStockAlertMessage || 'URGENT: {productName} is now OUT OF STOCK!',
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
      toast({ title: 'Success', description: 'Inventory settings have been updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 2MB.",
      });
      return;
    }

    setIsUploading(true);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const imageDataUri = reader.result as string;
        const result = await uploadImage({ imageDataUri, storeId });
        form.setValue('defaultProductImageUrl', result.display_url, { shouldValidate: true });
        toast({
          title: "Image Uploaded",
          description: "Your new default product image has been set.",
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: error.message || "Could not upload image. Please try again.",
        });
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({ variant: "destructive", title: "File Read Error", description: "Could not read the selected file."});
        setIsUploading(false);
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
            <CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5"/> Inventory & Stock Alerts</CardTitle>
            <CardDescription>Configure inventory controls, product defaults, and automated stock notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="preventManualStockReduction"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="font-semibold">Prevent Manual Stock Reduction (Product Form)</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Block users from manually lowering stock in the product edit form. Stock should be reduced via Sales or Transfers.
                    </p>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowStockDeduction"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="font-semibold">Allow Stock Deduction (Restocking Page)</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Allow users to enter a negative quantity on the Restocking page to deduct stock for wastage, etc.
                    </p>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lowStockThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Global Low Stock Threshold</FormLabel>
                  <FormControl><Input type="number" min="0" {...field} /></FormControl>
                  <p className="text-xs text-muted-foreground">
                      Products at or below this stock level will be flagged as "low stock". Can be overridden per-product.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultProductImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Product Image URL</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl><Input {...field} placeholder="https://example.com/default-image.png"  /></FormControl>
                    <Button asChild variant="outline" loading={isSaving || isUploading}>
                        <label htmlFor="product-image-upload" className="cursor-pointer">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                            <Input id="product-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload}  />
                        </label>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                      This image will be used for products that do not have a specific image URL.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <h4 className="font-semibold text-base">WhatsApp Stock Alerts</h4>
            <FormField
              control={form.control}
              name="enableLowStockAlerts"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="font-semibold">Enable Low/Out-of-Stock Alerts via WhatsApp</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Automatically send a message when product stock gets low or reaches zero.
                    </p>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            {enableLowStockAlerts && (
              <div className="p-4 border rounded-md space-y-4 bg-muted/30">
                <FormField
                  control={form.control}
                  name="lowStockAlertPhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alert Phone Number</FormLabel>
                      <FormControl><Input type="tel" {...field} placeholder="e.g., +2348012345678" /></FormControl>
                      <p className="text-xs text-muted-foreground">Enter the full phone number including country code to receive stock alerts.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lowStockAlertMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low Stock Message Template</FormLabel>
                      <FormControl><Textarea {...field} /></FormControl>
                      <p className="text-xs text-muted-foreground">Available placeholders: {`{productName}`}, {`{currentStock}`}, {`{lowStockThreshold}`}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="outOfStockAlertMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Out of Stock Message Template</FormLabel>
                      <FormControl><Textarea {...field} /></FormControl>
                      <p className="text-xs text-muted-foreground">Available placeholders: {`{productName}`}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" loading={isSaving || isUploading}>

              Save Inventory & Alert Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
