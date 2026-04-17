'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, X, HandCoins, Info, DollarSign, Wallet, CheckCircle2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { doc, runTransaction, serverTimestamp, collection, query, where, orderBy, getDocs, writeBatch, increment, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatUtils';
import type { Customer, SaleTransaction, PaymentRecord, CreditPaymentReceiptInfo } from '@/lib/types';
import { logCustomerActivity } from '@/lib/logger';

interface RecordDepositDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  currencySymbol: string;
  onSuccess?: (args: { success: boolean; receiptInfo?: CreditPaymentReceiptInfo }) => void;
}

const DEFAULT_STORE_NAME = 'StoreLink Pro';

export function RecordDepositDialog({
  isOpen,
  onOpenChange,
  customer,
  currencySymbol,
  onSuccess
}: RecordDepositDialogProps) {
  const firestore = useFirestore();
  const { user, store, staffMember } = useAuth();
  const currentStoreId = React.useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);
  const { settings } = useSettings();
  const { toast } = useToast();

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableMethods = useMemo(() => 
    settings?.paymentMethods?.map(m => m.name) || ['Cash', 'Bank Transfer', 'Card'],
  [settings]);

  React.useEffect(() => {
    if (isOpen) {
      setAmount('');
      setPaymentMethod(availableMethods[0] || 'Cash');
      setNotes('');
    }
  }, [isOpen, availableMethods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !firestore || !user) return;

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a positive deposit amount.' });
      return;
    }

    setIsSubmitting(true);

    try {
      let receiptInfo: CreditPaymentReceiptInfo | undefined;

      await runTransaction(firestore, async (transaction) => {
        // 1. Fetch current customer state
        const customerRef = doc(firestore, 'customers', customer.id);
        const customerDoc = await transaction.get(customerRef);
        if (!customerDoc.exists()) throw new Error('Customer not found.');
        
        const currentCustomer = customerDoc.data() as Customer;
        const currentDebt = currentCustomer.outstandingCredit || 0;
        const currentCredit = currentCustomer.creditBalance || 0;

        let remainingToApply = depositAmount;
        let debtReduction = 0;
        let newCreditAddition = 0;

        // 2. Fetch outstanding credit sales to apply funds if debt exists
        if (currentDebt > 0) {
            const salesQuery = query(
                collection(firestore, 'saleTransactions'),
                where('customerId', '==', customer.id),
                where('isCreditSale', '==', true),
                where('isPaid', '==', false),
                orderBy('createdAt', 'asc')
            );
            const salesSnapshot = await getDocs(salesQuery);
            const outstandingSales = salesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as SaleTransaction));

            for (const sale of outstandingSales) {
                if (remainingToApply <= 0.001) break;

                const totalDueOnSale = (sale.grandTotal || 0) - (sale.returnedAmount || 0);
                const paidOnSale = sale.amountPaidTowardsCredit || 0;
                const balanceOnSale = totalDueOnSale - paidOnSale;

                if (balanceOnSale <= 0.001) continue;

                const paymentForThisSale = Math.min(remainingToApply, balanceOnSale);
                
                const newPaymentRecord: PaymentRecord = {
                    paymentDate: Timestamp.now(),
                    amountPaid: paymentForThisSale,
                    paymentMethod: paymentMethod,
                    notes: `Deposit application. ${notes}`.trim(),
                };

                const newTotalPaid = paidOnSale + paymentForThisSale;
                const isNowPaid = newTotalPaid >= totalDueOnSale - 0.001;

                transaction.update(doc(firestore, 'saleTransactions', sale.id), {
                    paymentHistory: [...(sale.paymentHistory || []), newPaymentRecord],
                    amountPaidTowardsCredit: newTotalPaid,
                    isPaid: isNowPaid,
                    updatedAt: serverTimestamp()
                });

                remainingToApply -= paymentForThisSale;
                debtReduction += paymentForThisSale;
            }
        }

        // 3. Any leftover amount goes to Credit Balance
        if (remainingToApply > 0.001) {
            newCreditAddition = remainingToApply;
        }

        // 4. Update Customer record
        const finalOutstanding = Math.max(0, currentDebt - debtReduction);
        transaction.update(customerRef, {
            outstandingCredit: finalOutstanding,
            creditBalance: currentCredit + newCreditAddition,
            updatedAt: serverTimestamp()
        });

        // 5. Create primary payment log
        const paymentLogRef = doc(collection(firestore, 'creditPayments'));
        const paymentLogData = {
            customerId: customer.id,
            customerName: currentCustomer.name,
            store_id: currentStoreId!,
            amount: depositAmount,
            paymentDate: serverTimestamp(),
            paymentMethod: paymentMethod,
            notes: notes || null,
            staffId: user.uid,
            isDeposit: true,
            debtSettled: debtReduction,
            creditAdded: newCreditAddition
        };
        transaction.set(paymentLogRef, paymentLogData);

        // 6. Build Receipt Info
        receiptInfo = {
            id: paymentLogRef.id,
            storeName: settings?.storeName || DEFAULT_STORE_NAME,
            customerName: currentCustomer.name,
            saleIdPaidAgainst: 'MULTI-BAL',
            originalSaleDate: Timestamp.now(), // Reference for current transaction
            items: [], 
            paymentRecord: {
                paymentDate: Timestamp.now(),
                amountPaid: depositAmount,
                paymentMethod: paymentMethod,
                notes: notes || null
            },
            saleTotalAmount: depositAmount,
            saleAmountPreviouslyPaid: 0,
            saleRemainingBalance: finalOutstanding,
            customerTotalOutstandingAfterPayment: finalOutstanding,
            reprintCount: 0
        };
      });

      await logCustomerActivity(firestore, {
        action: 'PAYMENT',
        store_id: currentStoreId!,
        entityId: customer.id,
        entityDescription: customer.name,
        userId: user.uid,
        userName: user.email || 'System',
        details: `Customer deposited ${formatCurrency(depositAmount, currencySymbol)} via ${paymentMethod}. Pay Small Small account updated.`
      });

      toast({ title: 'Deposit Successful', description: `${formatCurrency(depositAmount, currencySymbol)} has been credited to ${customer.name}.` });
      if (onSuccess) onSuccess({ success: true, receiptInfo });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Deposit error:', error);
      toast({ variant: 'destructive', title: 'Operation Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <HandCoins className="h-6 w-6 text-primary" />
            Accept Flexible Payment
          </DialogTitle>
          <DialogDescription>
            Record a deposit or installment for <strong>{customer.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deposit-amount" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Amount to Deposit ({currencySymbol})</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
                <Input 
                  id="deposit-amount" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  className="pl-10 h-12 text-2xl font-black"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isSubmitting}>
                <SelectTrigger id="payment-method" className="h-11">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {availableMethods.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit-notes" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notes (Optional)</Label>
              <Textarea 
                id="deposit-notes"
                placeholder="e.g., Weekly contribution towards new TV"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Deposits will first be used to clear any outstanding debts. Excess funds will be saved as a credit balance for future use.
            </p>
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11 font-bold">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || !amount} className="h-11 px-8 font-black uppercase tracking-widest  ">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Post Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}