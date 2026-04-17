'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Info, DollarSign, Wallet } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import type { SaleTransaction, Customer, PaymentRecord, CreditPaymentReceiptInfo } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { doc, Timestamp, collection, query, where, getDocs, orderBy, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatUtils';
import { logCustomerActivity } from '@/lib/logger';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const bulkPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be positive.'),
  paymentMethod: z.string().min(1, 'Payment method is required.'),
  notes: z.string().optional(),
});

type BulkPaymentFormValues = z.infer<typeof bulkPaymentSchema>;

interface BulkPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: (Customer & { totalPaid?: number }) | null;
  onPaymentRecorded?: (args: { success: boolean; receiptInfo?: CreditPaymentReceiptInfo }) => void;
  currencySymbol: string;
}

const DEFAULT_STORE_NAME = 'StoreLink Pro';

export function BulkPaymentDialog({
  isOpen,
  onOpenChange,
  customer,
  onPaymentRecorded,
  currencySymbol
}: BulkPaymentDialogProps) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, store, staffMember } = useAuth();
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BulkPaymentFormValues>({
    resolver: zodResolver(bulkPaymentSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: '',
      notes: '',
    }
  });

  const availablePaymentMethods = useMemo(() => {
    return settings?.paymentMethods?.map(pm => pm.name) || ['Cash', 'Card', 'Transfer'];
  }, [settings]);

  useEffect(() => {
    if (isOpen && customer) {
      form.reset({
        amount: customer.outstandingCredit > 0 ? Number(customer.outstandingCredit.toFixed(2)) : 0,
        paymentMethod: availablePaymentMethods[0] || 'Cash',
        notes: '',
      });
    }
  }, [isOpen, customer, form, availablePaymentMethods]);

  const onSubmit = async (values: BulkPaymentFormValues) => {
    const paymentAmount = values.amount;
    if (!customer || !user || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "Missing required dependencies." });
      return;
    }
    
    if (paymentAmount > customer.outstandingCredit + 0.01) {
      form.setError("amount", { message: `Payment exceeds total debt of ${formatCurrency(customer.outstandingCredit, currencySymbol)}.`});
      return;
    }

    setIsSubmitting(true);

    try {
        let receiptInfo: CreditPaymentReceiptInfo | undefined;

        // 1. Fetch all unpaid credit sales for this customer, oldest first
        const salesQuery = query(
            collection(firestore, "saleTransactions"),
            where("customerId", "==", customer.id),
            where("isCreditSale", "==", true),
            where("isPaid", "==", false),
            orderBy("createdAt", "asc")
        );
        const snapshot = await getDocs(salesQuery);
        const outstandingSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleTransaction));
        
        const batch = writeBatch(firestore);
        let remainingToDistribute = paymentAmount;
        const processedSalesIds: string[] = [];

        // 2. Sequentially apply the bulk payment
        for (const sale of outstandingSales) {
            if (remainingToDistribute <= 0.001) break;

            const totalOriginalDue = (sale.grandTotal || 0) - (sale.returnedAmount || 0);
            const alreadyPaid = (sale.amountPaidTowardsCredit || 0);
            const currentDueOnSale = totalOriginalDue - alreadyPaid;

            if (currentDueOnSale <= 0.001) continue;

            const paymentForThisSale = Math.min(remainingToDistribute, currentDueOnSale);
            
            const newPaymentRecord: PaymentRecord = {
                paymentDate: Timestamp.now(),
                amountPaid: paymentForThisSale,
                paymentMethod: values.paymentMethod,
                notes: `Bulk payment application. ${values.notes || ''}`.trim(),
            };
            
            const newTotalPaidOnSale = alreadyPaid + paymentForThisSale;
            const isNowFullyPaid = newTotalPaidOnSale >= totalOriginalDue - 0.001;

            batch.update(doc(firestore, "saleTransactions", sale.id), {
                paymentHistory: [...(sale.paymentHistory || []), newPaymentRecord],
                amountPaidTowardsCredit: newTotalPaidOnSale,
                isPaid: isNowFullyPaid,
                updatedAt: serverTimestamp(),
            });
            
            remainingToDistribute -= paymentForThisSale;
            processedSalesIds.push(sale.id);
        }

        // 3. Create a primary credit payment record for the ledger/auditing
        const paymentLogRef = doc(collection(firestore, "creditPayments"));
        batch.set(paymentLogRef, {
            customerId: customer.id,
            customerName: customer.name,
            store_id: currentStoreId!,
            amount: paymentAmount,
            paymentDate: serverTimestamp(),
            paymentMethod: values.paymentMethod,
            notes: values.notes || null,
            staffId: user.uid,
            appliedToSalesCount: processedSalesIds.length,
            isBulkPayment: true
        });

        // 4. Update the customer's master outstanding balance
        const customerRef = doc(firestore, 'customers', customer.id);
        const newOutstanding = Math.max(0, (customer.outstandingCredit || 0) - paymentAmount);

        batch.update(customerRef, {
            outstandingCredit: newOutstanding,
            updatedAt: serverTimestamp(),
        });
        
        // 5. Construct receipt info
        receiptInfo = {
            id: paymentLogRef.id,
            storeName: settings?.storeName || DEFAULT_STORE_NAME,
            customerName: customer.name,
            saleIdPaidAgainst: processedSalesIds.length > 0 ? processedSalesIds[0] : 'BULK-SETTLE',
            originalSaleDate: Timestamp.now(),
            items: [], 
            paymentRecord: {
                paymentDate: Timestamp.now(),
                amountPaid: paymentAmount,
                paymentMethod: values.paymentMethod,
                notes: values.notes || null
            },
            saleTotalAmount: paymentAmount,
            saleAmountPreviouslyPaid: 0,
            saleRemainingBalance: newOutstanding,
            customerTotalOutstandingAfterPayment: newOutstanding,
            reprintCount: 0
        };

        await batch.commit();

        // 6. Log activity
        await logCustomerActivity(firestore, {
          action: 'PAYMENT',
          store_id: currentStoreId!,
          entityId: customer.id,
          entityDescription: customer.name,
          userId: user.uid,
          userName: user.email || 'System',
          beforeData: { outstandingCredit: customer.outstandingCredit },
          afterData: { outstandingCredit: newOutstanding },
          details: `Bulk payment of ${formatCurrency(paymentAmount, currencySymbol)} applied to ${processedSalesIds.length} invoice(s) via ${values.paymentMethod}.`
        });

        toast({ title: "Payment Recorded", description: `${formatCurrency(paymentAmount, currencySymbol)} successfully applied.` });
        
        if (onPaymentRecorded) {
            onPaymentRecorded({ success: true, receiptInfo });
        }
        onOpenChange(false);

    } catch (error: any) {
        console.error("Bulk payment error:", error);
        toast({ variant: "destructive", title: "Operation Failed", description: error.message || "Failed to process bulk payment." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onOpenChange(open)}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden h-full sm:h-auto max-h flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b shrink-0 bg-background">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
            <Wallet className="h-7 w-7 text-primary" />
            Bulk Payment
          </DialogTitle>
          <DialogDescription>
            Record a single payment to settle {customer.name}&apos;s debt.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <Card className="bg-primary/5 border-primary/10 ">
              <CardContent className="pt-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text font-black uppercase text-primary tracking-widest mb-1">Total Debt Owed</p>
                    <p className="text-3xl font-black tracking-tighter text-primary">{formatCurrency(customer.outstandingCredit, currencySymbol)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text font-black uppercase text-muted-foreground tracking-widest mb-1">Account ID</p>
                    <p className="text-xs font-mono font-bold">#{customer.id.substring(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Payment Amount ({currencySymbol})</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input 
                            type="number" 
                            step="0.01" 
                            {...field} 
                            className="pl-10 text-xl font-black h-12" 
                            disabled={isSubmitting} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availablePaymentMethods.map((method) => (
                              <SelectItem key={method} value={method}>{method}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Transaction Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., Full settlement of outstanding invoices" 
                          {...field} 
                          value={field.value || ''} 
                          disabled={isSubmitting} 
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-800 space-y-2">
                  <div className="flex items-center gap-2 font-black text uppercase tracking-widest">
                    <Info className="h-4 w-4" />
                    Auto-Allocation Logic
                  </div>
                  <p className="text-xs leading-relaxed font-medium">
                    Payments are applied sequentially to the oldest outstanding invoices first. Fully paid invoices will be closed automatically.
                  </p>
                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-background shrink-0 flex-row justify-between items-center">
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting} className="h-11">
              Cancel
            </Button>
          </DialogClose>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSubmitting || !form.formState.isValid}
            className="h-11 px-8 font-black uppercase tracking-tighter  "
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Post Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}