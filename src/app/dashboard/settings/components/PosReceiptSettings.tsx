
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore } from '@/firebase';
import { saveGlobalSettings, saveStoreSettings } from '@/firebase/firestore/settings';
import type { AppSettings, SaleTransaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ReceiptModal } from "@/components/dialogs/receipt-modal";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Receipt, Palette } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';

const posSettingsSchema = z.object({
  disablePriceModification: z.boolean().optional(),
  enableExternalPrinter: z.boolean().optional(),
  receiptFooterMessage: z.string().optional(),
  creditPaymentInstructions: z.string().optional(),
});

type FormValues = z.infer<typeof posSettingsSchema>;

interface PosReceiptSettingsProps {
  settingsData: AppSettings | null;
  isLoading: boolean;
  storeId?: string | null;
}

export function PosReceiptSettings({ settingsData, isLoading, storeId }: PosReceiptSettingsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(posSettingsSchema),
    defaultValues: {
      disablePriceModification: false,
      enableExternalPrinter: true,
      receiptFooterMessage: '',
      creditPaymentInstructions: '',
    },
  });

  useEffect(() => {
    if (settingsData) {
      form.reset({
        disablePriceModification: settingsData.disablePriceModification || false,
        enableExternalPrinter: settingsData.enableExternalPrinter ?? true,
        receiptFooterMessage: settingsData.receiptFooterMessage || '',
        creditPaymentInstructions: settingsData.creditPaymentInstructions || '',
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
      toast({ title: 'Success', description: 'POS & Receipt settings updated.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const mockSaleTransaction: SaleTransaction | null = useMemo(() => ({
    id: 'PREVIEW12345',
    items: [
      { productId: 'mock-prod-1', productName: 'Sample Product 1', quantity: 2, unitPrice: 10.00, totalPrice: 20.00 },
      { productId: 'mock-prod-2', productName: 'Sample Product 2 Long Name', quantity: 1, unitPrice: 25.50, totalPrice: 25.50 },
    ],
    grandTotal: 45.50,
    subtotal: 45.50,
    customerName: 'Preview Customer',
    notes: 'This is a preview invoice.',
    isCreditSale: true,
    paymentMethod: 'Cash',
    paymentDetails: {},
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) as any,
    staffId: 'mock-staff',
    branchId: 'mock-branch',
    reprintCount: 0,
    paymentHistory: [],
  }), []);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5"/> POS &amp; Receipt Configuration</CardTitle>
            <CardDescription>Customize the Point of Sale interface and thermal receipt behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="disablePriceModification"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4 bg-muted/10">
                  <div>
                    <FormLabel className="font-semibold">Globally Disable Price Modification in POS</FormLabel>
                    <p className="text-xs text-muted-foreground">Prevents price changes on the POS screen for all products.</p>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="enableExternalPrinter"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4 bg-muted/10">
                  <div>
                      <FormLabel className="font-semibold">Enable Dedicated Thermal Printer Mode</FormLabel>
                      <p className="text-xs text-muted-foreground dark:text-black">
                      Turn ON for dedicated 80mm printers. Turn OFF for standard browser PDF printing.
                      </p>
                  </div>
                   <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <Separator/>
            <h4 className="font-semibold text-base">Terminal Content</h4>
            <div className="space-y-4">
               <FormField
                  control={form.control}
                  name="receiptFooterMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt Footer Message</FormLabel>
                      <FormControl><Textarea {...field} placeholder="Thank you for your patronage!" /></FormControl>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="creditPaymentInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Sale Footer Instructions</FormLabel>
                       <FormControl><Textarea {...field} placeholder="e.g., Bank details for manual payback settlement." rows={3} /></FormControl>
                    </FormItem>
                  )}
                />
            </div>
          </CardContent>
          <CardFooter className="flex-col items-start gap-4">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save POS Settings
            </Button>
            <Button variant="outline" type="button" onClick={() => setIsPreviewOpen(true)}>
              Preview Thermal Receipt
            </Button>
            {isPreviewOpen && mockSaleTransaction && (
              <ReceiptModal 
                isOpen={isPreviewOpen} 
                onClose={() => setIsPreviewOpen(false)} 
                saleTransaction={mockSaleTransaction} 
              />
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
