'use client';

import React, { useEffect, useMemo, useReducer } from 'react';
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DollarSign,
  Loader2,
  Save,
  X,
  Info,
  ChevronLeft,
  ChevronRight,
  Banknote,
  CreditCard,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import type { SaleTransaction, PaymentRecord, CreditPaymentReceiptInfo, StaffMember, PaymentMethod } from '@/lib/types';
import { doc, runTransaction, Timestamp, increment, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatUtils';
import { convertToDateSafely, cn } from '@/lib/utils';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [{ id: 'cash', name: 'Cash' }];
const DEFAULT_STORE_NAME = 'StoreLink Pro';

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleTransaction;
  customerId: string;
  onPaymentRecorded: (args: { success: boolean; receiptInfo?: CreditPaymentReceiptInfo }) => void;
  currencySymbol: string;
  staffMap: Map<string, StaffMember>;
}

type State = {
  step: 1 | 2;
  amount: string;
  paymentMethod: string;
  notes: string;
  isSubmitting: boolean;
};

type Action =
  | { type: 'SET_FIELD'; field: keyof State; value: any }
  | { type: 'SET_STEP'; step: 1 | 2 }
  | { type: 'START_SUBMIT' }
  | { type: 'RESET'; payload: Partial<State> };

const initialState: State = {
  step: 1,
  amount: '0.00',
  paymentMethod: 'Cash',
  notes: '',
  isSubmitting: false,
};

function paymentReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'START_SUBMIT':
      return { ...state, isSubmitting: true };
    case 'RESET':
      return { ...initialState, ...action.payload, isSubmitting: false };
    default:
      return state;
  }
}

const getPaymentMethodIcon = (method: string) => {
  const lowerMethod = method.toLowerCase();
  if (lowerMethod.includes('cash')) return <Banknote className="h-5 w-5 text-green-600" />;
  if (lowerMethod.includes('card')) return <CreditCard className="h-5 w-5 text-blue-600" />;
  if (lowerMethod.includes('transfer')) return <Wallet className="h-5 w-5 text-purple-600" />;
  return <DollarSign className="h-5 w-5 text-muted-foreground" />;
};

function SaleSummaryCard({ sale, remainingDue, currencySymbol }: { sale: SaleTransaction, remainingDue: number, currencySymbol: string }) {
  return (
    <Card className="bg-muted/50 border-none shadow-none">
      <CardHeader className="flex-row items-center justify-between p-4">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Sale Context</CardTitle>
        <span className="text-[10px] font-mono text-muted-foreground bg-white px-2 py-0.5 rounded border">ID: {sale.id.substring(0, 8).toUpperCase()}</span>
      </CardHeader>
      <CardContent className="text-sm space-y-2 p-4 pt-0">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Customer:</span>
          <span className="font-bold">{sale.customerName || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sale Total:</span>
          <span className="font-semibold">{formatCurrency(sale.grandTotal, currencySymbol)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Paid to date:</span>
          <span className="font-semibold text-green-600">{formatCurrency(sale.amountPaidTowardsCredit || 0, currencySymbol)}</span>
        </div>
        <div className="flex justify-between items-center text-lg font-black text-primary border-t border-dashed pt-2 mt-2">
          <span>Current Due:</span>
          <span>{formatCurrency(remainingDue, currencySymbol)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentInputForm({ state, dispatch, remainingDue, currencySymbol, paymentMethods }: {
  state: State,
  dispatch: React.Dispatch<Action>,
  remainingDue: number,
  currencySymbol: string,
  paymentMethods: any[]
}) {
  const typedAmount = parseFloat(state.amount) || 0;
  const isOverpayment = typedAmount > remainingDue + 0.01 && state.paymentMethod.toLowerCase() !== 'cash';
  const newBalance = Math.max(0, remainingDue - typedAmount);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="paymentAmount" className="text-sm font-bold">Payment Amount <span className="text-destructive">*</span></Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground font-bold">{currencySymbol}</span>
          <Input
            id="paymentAmount"
            type="number"
            value={state.amount}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'amount', value: e.target.value })}
            placeholder="0.00"
            className="pl-8 text-xl font-black h-12"
            min="0.01"
            step="0.01"
          />
        </div>
        <div className="flex justify-between items-center px-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                New Balance: <span className={cn("ml-1", newBalance > 0.01 ? "text-primary" : "text-green-600")}>{formatCurrency(newBalance, currencySymbol)}</span>
            </p>
            {isOverpayment && (
                <p className="text-[10px] font-black uppercase text-orange-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Limit Exceeded</p>
            )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentMethod" className="text-sm font-bold">Payment Method <span className="text-destructive">*</span></Label>
        <Select
          value={state.paymentMethod}
          onValueChange={(value) => dispatch({ type: 'SET_FIELD', field: 'paymentMethod', value })}
        >
          <SelectTrigger id="paymentMethod" className="h-11">
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map((method) => (
              <SelectItem key={method.id} value={method.name}>{method.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 pb-10 sm:pb-0">
        <Label htmlFor="paymentNotes" className="text-sm font-bold">Notes (Optional)</Label>
        <Textarea
          id="paymentNotes"
          placeholder="e.g., Partial payment..."
          value={state.notes}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'notes', value: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}

function PaymentConfirmationView({ state, remainingDue, changeDue, currencySymbol }: {
  state: State,
  remainingDue: number,
  changeDue: number,
  currencySymbol: string,
}) {
  const paymentAmount = parseFloat(state.amount) || 0;
  const newRemainingDue = Math.max(0, remainingDue - paymentAmount + (state.paymentMethod.toLowerCase() === 'cash' ? changeDue : 0));

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none bg-primary/5 p-6 space-y-4">
        <div className="flex items-baseline justify-between pb-4 border-b border-primary/10">
          <p className="text-sm font-black uppercase text-muted-foreground tracking-widest">Amount Paying:</p>
          <p className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(paymentAmount, currencySymbol)}</p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Via Method:</span>
            <div className="flex items-center gap-2 font-bold bg-white px-3 py-1 rounded-full border shadow-sm">
                {getPaymentMethodIcon(state.paymentMethod)}
                <span>{state.paymentMethod}</span>
            </div>
          </div>
          {state.notes.trim() && (
            <div className="pt-2">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Payment Note:</span>
              <p className="italic text-muted-foreground mt-1 bg-white/50 p-2 rounded border">"{state.notes}"</p>
            </div>
          )}
        </div>

        {changeDue > 0 && (
          <div className="flex items-baseline justify-between pt-4 border-t border-dashed border-orange-200 text-orange-600 font-bold">
              <p className="text-xs uppercase font-black">Change Due:</p>
              <p className="text-xl font-black">{formatCurrency(changeDue, currencySymbol)}</p>
          </div>
        )}

        <div className="flex items-baseline justify-between pt-4 border-t-2 border-double border-primary/20 text-primary font-black text-xl">
            <p className="text-xs uppercase font-black">Final Balance Due:</p>
            <p className="tracking-tighter">{formatCurrency(newRemainingDue, currencySymbol)}</p>
        </div>
      </Card>

      <div className="flex items-start gap-3 p-3 border border-yellow-500/50 bg-yellow-500/10 rounded-md text-yellow-700 dark:text-yellow-300 pb-10 sm:pb-0">
          <Info className="h-5 w-5 shrink-0 mt-0.5"/>
          <p className="text-xs leading-relaxed font-medium">This will finalize the payment and update the financial records for both this sale and the customer account.</p>
      </div>
    </div>
  );
}

export function RecordPaymentDialog({
  isOpen,
  onClose,
  sale,
  customerId,
  onPaymentRecorded,
  currencySymbol,
  staffMap
}: RecordPaymentDialogProps) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentStaffAuth } = useAuth();
  const [state, dispatch] = useReducer(paymentReducer, initialState);

  const paymentMethods = useMemo(() => settings?.paymentMethods || DEFAULT_PAYMENT_METHODS, [settings]);

  const remainingDue = useMemo(() => {
    return (sale.grandTotal || 0) - (sale.amountPaidTowardsCredit || 0) - (sale.returnedAmount || 0);
  }, [sale]);

  const changeDue = useMemo(() => {
    const received = parseFloat(state.amount);
    if (isNaN(received) || state.paymentMethod.toLowerCase() !== 'cash') return 0;
    const change = received - remainingDue;
    return change > 0 ? change : 0;
  }, [state.amount, state.paymentMethod, remainingDue]);

  useEffect(() => {
    if (isOpen && sale) {
      const defaultAmount = Math.max(0, remainingDue);
      const defaultMethod = paymentMethods.find(pm => pm.name.toLowerCase() === 'cash')?.name || (paymentMethods[0]?.name || 'Cash');
      dispatch({ 
        type: 'RESET', 
        payload: { amount: defaultAmount.toFixed(2), paymentMethod: defaultMethod }
      });
    }
  }, [isOpen, sale, remainingDue, paymentMethods]);

  const handleNextStep = () => {
    const paymentAmount = parseFloat(state.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Enter a positive payment amount." });
      return;
    }
    dispatch({ type: 'SET_STEP', step: 2 });
  };

  const handleConfirmPayment = async () => {
    if (!firestore || !currentStaffAuth) return;
    const paymentAmount = parseFloat(state.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) return;

    dispatch({ type: 'START_SUBMIT' });

    try {
      const saleRef = doc(firestore, "saleTransactions", sale.id);
      const customerRef = doc(firestore, "customers", customerId);
      const creditPaymentLogRef = collection(firestore, "creditPayments");

      const effectivePaymentForBalance = Math.min(paymentAmount, remainingDue);

      const newPaymentRecord: any = {
        paymentDate: Timestamp.now(),
        amountPaid: paymentAmount,
        paymentMethod: state.paymentMethod,
        notes: state.notes.trim() || '',
      };

      let receiptInfo: CreditPaymentReceiptInfo | undefined;

      await runTransaction(firestore, async (transaction) => {
        const saleDoc = await transaction.get(saleRef);
        const customerDoc = await transaction.get(customerRef);

        if (!saleDoc.exists() || !customerDoc.exists()) throw new Error("Reference missing.");

        const currentSaleData = saleDoc.data() as SaleTransaction;
        const currentCustomerData = customerDoc.data() as any;

        const finalSaleAmountPaid = (currentSaleData.amountPaidTowardsCredit || 0) + effectivePaymentForBalance;
        const finalSaleIsPaid = finalSaleAmountPaid >= ((currentSaleData.grandTotal || 0) - (currentSaleData.returnedAmount || 0)) - 0.001;
        const customerOutstandingBefore = currentCustomerData.outstandingCredit || 0;
        const finalCustomerOutstanding = Math.max(0, customerOutstandingBefore - effectivePaymentForBalance);

        transaction.update(saleRef, {
          paymentHistory: [...(currentSaleData.paymentHistory || []), newPaymentRecord],
          amountPaidTowardsCredit: increment(effectivePaymentForBalance),
          isPaid: finalSaleIsPaid,
          updatedAt: serverTimestamp(),
        });

        transaction.update(customerRef, {
          outstandingCredit: finalCustomerOutstanding,
          updatedAt: serverTimestamp(),
        });

        const newPaymentLogRef = doc(creditPaymentLogRef);
        transaction.set(newPaymentLogRef, {
            customerId: customerId,
            customerName: currentCustomerData.name,
            amount: paymentAmount,
            paymentDate: serverTimestamp(),
            paymentMethod: state.paymentMethod,
            notes: state.notes.trim() || null,
            staffId: currentStaffAuth.uid,
            saleId: sale.id,
            store_id: sale.store_id || null,
        });

        const originalSaleDate = convertToDateSafely(sale.createdAt);
        
        receiptInfo = {
          id: newPaymentLogRef.id,
          storeName: settings?.storeName || DEFAULT_STORE_NAME,
          customerName: sale.customerName || 'Valued Customer',
          saleIdPaidAgainst: sale.id,
          originalSaleDate: originalSaleDate as any,
          items: sale.items,
          paymentRecord: { ...newPaymentRecord, paymentDate: new Date() as any },
          saleTotalAmount: sale.grandTotal,
          saleAmountPreviouslyPaid: currentSaleData.amountPaidTowardsCredit || 0,
          saleRemainingBalance: Math.max(0, sale.grandTotal - finalSaleAmountPaid - (sale.returnedAmount || 0)),
          customerTotalOutstandingAfterPayment: finalCustomerOutstanding,
          reprintCount: sale.reprintCount || 0
        };
      });

      onPaymentRecorded({ success: true, receiptInfo }); 
      onClose();

    } catch (error: any) {
      console.error("Payment error:", error);
      toast({ variant: "destructive", title: "Process Failed", description: error.message });
      dispatch({ type: 'SET_FIELD', field: 'isSubmitting', value: false });
    }
  };

  const isNextDisabled = state.isSubmitting || isNaN(parseFloat(state.amount)) || parseFloat(state.amount) <= 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !state.isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-md h-full sm:h-auto max-h-[100dvh] sm:max-h-[95vh] flex flex-col p-0 overflow-hidden" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader className="p-6 pb-4 border-b shrink-0 bg-background">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-primary" />
            {state.step === 1 ? 'Record Payment' : 'Verify Details'}
          </DialogTitle>
          <DialogDescription>Apply a payment towards this specific invoice.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-6">
            {state.step === 1 && <SaleSummaryCard sale={sale} remainingDue={remainingDue} currencySymbol={currencySymbol} />}
            {state.step === 1 
              ? <PaymentInputForm state={state} dispatch={dispatch} remainingDue={remainingDue} currencySymbol={currencySymbol} paymentMethods={paymentMethods} />
              : <PaymentConfirmationView state={state} remainingDue={remainingDue} changeDue={changeDue} currencySymbol={currencySymbol} />
            }
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t flex flex-row justify-between items-center shrink-0 bg-background shadow-[0_-4px_10px_rgba(0,0,0,0.03)] mt-auto">
          {state.step === 1 ? (
             <DialogClose asChild>
                <Button variant="outline" disabled={state.isSubmitting} className="h-11">Cancel</Button>
            </DialogClose>
          ) : (
             <Button variant="outline" onClick={() => dispatch({ type: 'SET_STEP', step: 1 })} disabled={state.isSubmitting} className="h-11 btn-back">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
             </Button>
          )}

          {state.step === 1 ? (
            <Button onClick={handleNextStep} disabled={isNextDisabled} className="h-11 px-8 font-bold">
              Review Payment <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirmPayment}
              disabled={state.isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white font-bold h-11 px-8 shadow-md"
            >
              {state.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Post Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
