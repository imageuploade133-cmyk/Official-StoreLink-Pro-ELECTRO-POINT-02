'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { SaleTransactionItem, Customer, PaymentMethod, PaymentDetails } from '@/lib/types';
import { Loader2, CreditCard, Banknote, Landmark, AlertTriangle, DollarSign, CalendarDays, Wallet, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useSettings } from '@/contexts/settings-context';
import { formatCurrency } from '@/lib/formatUtils';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

interface SaleDataForDialog {
    items: SaleTransactionItem[];
    grandTotal: number;
    subtotal: number;
    discountAmount?: number;
    customer: Customer | null;
    notes: string;
    isCreditSale: boolean;
    dueDate?: Date | null;
    initialPaymentAtSale?: number | null;
    initialPaymentMethod?: string;
}

interface ConfirmPaymentDialogProps {
  isOpen: boolean;
  onClose: (action: 'confirm' | 'back' | 'cancel') => void;
  saleData: SaleDataForDialog | null;
  onConfirmSale: (
    paymentMethod: string, 
    paymentDetails?: PaymentDetails,
    initialPaymentAtSale?: number | null
  ) => Promise<boolean>;
  currencySymbol: string;
}

const getPaymentMethodIcon = (method: string) => {
  if (method === 'Multiple') return <Wallet className="mr-2 h-4 w-4" />;
  const lowerMethod = method.toLowerCase();
  if (lowerMethod.includes('cash')) return <Banknote className="mr-2 h-4 w-4" />;
  if (lowerMethod.includes('card')) return <CreditCard className="mr-2 h-4 w-4" />;
  if (lowerMethod.includes('transfer')) return <Landmark className="mr-2 h-4 w-4" />;
  return <DollarSign className="mr-2 h-4 w-4" />;
};


export function ConfirmPaymentDialog({
  isOpen,
  onClose,
  saleData, 
  onConfirmSale,
  currencySymbol
}: ConfirmPaymentDialogProps) {
  const { settings } = useSettings();
  
  const allowedPaymentMethods = useMemo(() => {
    return Array.isArray(settings?.paymentMethods) && settings.paymentMethods.length > 0 
      ? settings.paymentMethods
      : [{ id: 'cash', name: 'Cash' }];
  }, [settings]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [useSplitPayment, setUseSplitPayment] = useState(false);
  const [singlePayment, setSinglePayment] = useState({ method: allowedPaymentMethods[0]?.name || 'Cash', amount: '' });
  const [splitPayments, setSplitPayments] = useState<Record<string, string>>({});
  
  const grandTotal = saleData?.grandTotal ?? 0;
  
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setUseSplitPayment(false);
      
      const defaultMethod = allowedPaymentMethods[0]?.name || 'Cash';
      setSinglePayment({ method: defaultMethod, amount: grandTotal > 0 ? grandTotal.toFixed(2) : '' });

      const initialSplit: Record<string, string> = {};
      allowedPaymentMethods.forEach(method => { initialSplit[method.name] = ''; });
      setSplitPayments(initialSplit);
    }
  }, [isOpen, saleData, grandTotal, allowedPaymentMethods]);

  const handleSplitPaymentChange = (method: string, value: string) => {
    setSplitPayments(prev => ({...prev, [method]: value }));
  };
  
  const totalSplitAmount = useMemo(() => {
    return Object.values(splitPayments).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
  }, [splitPayments]);

  const changeDue = useMemo(() => {
    if (useSplitPayment) {
        const diff = totalSplitAmount - grandTotal;
        return diff > 0.001 ? diff : 0;
    }
    const tendered = parseFloat(singlePayment.amount) || 0;
    const diff = tendered - grandTotal;
    return diff > 0.001 ? diff : 0;
  }, [useSplitPayment, totalSplitAmount, singlePayment, grandTotal]);
  
  const remainingToPay = useMemo(() => {
    if (useSplitPayment) {
      const diff = grandTotal - totalSplitAmount;
      return diff > 0.001 ? diff : 0;
    }
    return 0; // Not applicable for single payment as button is disabled if amount is less
  }, [grandTotal, totalSplitAmount, useSplitPayment]);


  const handleConfirm = async () => {
    if (!saleData) return;
    setIsProcessing(true);
    let success = false;
    
    if (saleData.isCreditSale) {
        // Handle credit sale confirmation
        success = await onConfirmSale(
            saleData.initialPaymentMethod || 'Credit',
            {}, 
            saleData.initialPaymentAtSale
        );
    } else if (useSplitPayment) {
        if (remainingToPay > 0.001) {
             alert("The total tendered amount is less than the grand total.");
             setIsProcessing(false);
             return;
        }
        
        const paymentDetails: PaymentDetails = {
            methods: Object.entries(splitPayments)
              .filter(([, amount]) => parseFloat(amount) > 0)
              .map(([method, amount]) => ({ method: method, amount: parseFloat(amount) })),
            amountTendered: totalSplitAmount,
            changeGiven: totalSplitAmount - grandTotal > 0.001 ? totalSplitAmount - grandTotal : 0
        };
        
        success = await onConfirmSale('Multiple', paymentDetails);

    } else { // Single Payment
        const singleMethod = singlePayment.method;
        const singleAmount = parseFloat(singlePayment.amount) || 0;
        
        if (singleAmount < grandTotal - 0.001) {
            alert("The amount entered is less than the grand total.");
            setIsProcessing(false);
            return;
        }

        const paymentDetails: PaymentDetails = {
            amountTendered: singleAmount,
            changeGiven: singleAmount - grandTotal > 0.001 ? singleAmount - grandTotal : 0
        };
        success = await onConfirmSale(singleMethod, paymentDetails);
    }
    
    setIsProcessing(false);
    if (success) {
      onClose('confirm');
    }
  };
  
  const formatCurrencyDisplay = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!isOpen || !saleData) return null;

  if (saleData.isCreditSale) {
      return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isProcessing) onClose('cancel'); }}>
            <DialogContent className="max-w-lg h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden border-none sm:border" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader className="p-4 sm:p-6 pb-4 border-b shrink-0 bg-background">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <AlertTriangle className="text-orange-500 h-6 w-6"/> Confirm Credit Sale
                        </DialogTitle>
                        <DialogClose asChild className="sm:hidden">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogClose>
                    </div>
                    <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-2 text-left">
                        Review details for <span className="font-extrabold text-primary">{saleData.customer?.name || 'this sale'}</span> before finalizing.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1">
                    <div className="p-4 sm:p-6 space-y-6">
                        <Card className="border-2 border-green-200 bg-green-50 shadow-none sm:shadow-sm">
                            <CardContent className="pt-6 space-y-4">
                                {saleData.discountAmount && saleData.discountAmount > 0 ? (
                                    <>
                                    <div className="flex justify-between items-center text-gray-700">
                                        <span className="text-sm sm:text-lg font-medium">Subtotal:</span>
                                        <span className="font-bold text-sm sm:text-lg">{formatCurrencyDisplay(saleData.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-red-600">
                                        <span className="text-sm sm:text-lg font-medium">Discount:</span>
                                        <span className="font-bold text-sm sm:text-lg">-{formatCurrencyDisplay(saleData.discountAmount)}</span>
                                    </div>
                                    </>
                                ) : null}
                                {saleData.taxAmount && saleData.taxAmount > 0 ? (
                                    <div className="flex justify-between items-center text-blue-600">
                                        <span className="text-sm sm:text-lg font-medium">{settings?.taxName || 'Tax'} ({saleData.taxRate}%):</span>
                                        <span className="font-bold text-sm sm:text-lg">+{formatCurrencyDisplay(saleData.taxAmount)}</span>
                                    </div>
                                ) : null}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm sm:text-lg font-medium text-gray-700 flex items-center gap-2"><DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600"/> Total:</span> 
                                    <span className="font-black text-xl sm:text-2xl text-green-700">{formatCurrencyDisplay(grandTotal)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm sm:text-lg font-medium text-gray-700 flex items-center gap-2"><Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600"/> Paid Now:</span> 
                                    <span className="font-bold text-lg sm:text-xl text-blue-700">{formatCurrencyDisplay(saleData.initialPaymentAtSale ?? 0)}</span>
                                </div>
                                <Separator className="my-4 bg-gray-200" />
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-lg sm:text-xl text-red-700 flex items-center gap-2"><CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-red-600"/> On Credit:</span>
                                    <span className="font-black text-xl sm:text-2xl text-red-700">{formatCurrencyDisplay(grandTotal - (saleData.initialPaymentAtSale ?? 0))}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-2 border-gray-200 bg-gray-50 shadow-none sm:shadow-sm">
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm sm:text-lg font-medium text-gray-700 flex items-center gap-2"><CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600"/> Due Date:</span> 
                                    <span className="font-bold text-sm sm:text-lg">{saleData.dueDate ? format(saleData.dueDate, 'PPP') : 'N/A'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-4 sm:p-6 border-t bg-background shrink-0 flex flex-row justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onClose('back')} disabled={isProcessing} className="h-10 px-6">Back</Button>
                    <Button onClick={handleConfirm} size="sm" disabled={isProcessing} className="h-10 px-6 bg-orange-600 hover:bg-orange-700">
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isProcessing) onClose('cancel'); }}>
      <DialogContent className="max-w-lg h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[95vh] flex flex-col p-0 overflow-hidden border-none sm:border" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b shrink-0 bg-background">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-green-600" /> Finalize Payment
            </DialogTitle>
            <DialogClose asChild className="sm:hidden">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <X className="h-4 w-4" />
                </Button>
            </DialogClose>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-2 text-left">
            {saleData.discountAmount && saleData.discountAmount > 0 && (
                <span className="block mb-1">
                    Subtotal: {formatCurrencyDisplay(saleData.subtotal)}
                    <span className="text-red-500 ml-2">(-{formatCurrencyDisplay(saleData.discountAmount)})</span>
                </span>
            )}
            Total Due: <span className="font-black text-green-600 text-lg sm:text-xl">{formatCurrencyDisplay(grandTotal)}</span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
        <div className="p-4 sm:p-6 space-y-6">
          <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="split-payment-toggle" className="text-base font-bold">Split Payment</Label>
                <p className="text-xs text-muted-foreground">Pay using multiple methods</p>
              </div>
              <Switch id="split-payment-toggle" checked={useSplitPayment} onCheckedChange={setUseSplitPayment} />
          </div>
          
          {useSplitPayment ? (
            <div className="space-y-4">
              {allowedPaymentMethods.map(method => (
                <div key={method.id} className="flex items-center gap-3 bg-muted/20 p-3 rounded-lg border border-transparent hover:border-primary/20 transition-colors">
                  <Label htmlFor={`split-${method.name}`} className="flex-1 flex items-center text-sm font-medium">{getPaymentMethodIcon(method.name)} {method.name}</Label>
                  <Input 
                    id={`split-${method.name}`} 
                    type="number" 
                    placeholder="0.00"
                    value={splitPayments[method.name] || ''}
                    onChange={(e) => handleSplitPaymentChange(method.name, e.target.value)}
                    className="h-10 w-32 sm:w-40 font-bold"
                  />
                </div>
              ))}
              <Separator />
               <div className="text-right space-y-2 bg-muted/30 p-4 rounded-xl">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Tendered: <span className="text-foreground ml-2 font-black">{formatCurrencyDisplay(totalSplitAmount)}</span></p>
                  <p className={`text-base font-black ${remainingToPay > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {remainingToPay > 0 ? `Remaining: ${formatCurrencyDisplay(remainingToPay)}` : `Change: ${formatCurrencyDisplay(-remainingToPay)}`}
                  </p>
               </div>
            </div>
          ) : (
            <div className="space-y-6">
               <div className="space-y-2">
                  <Label htmlFor="single-payment-method" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Payment Method</Label>
                   <Select value={singlePayment.method} onValueChange={(v) => setSinglePayment(p => ({...p, method: v}))}>
                      <SelectTrigger id="single-payment-method" className="h-12 text-lg font-medium">
                          <SelectValue placeholder="Select method"/>
                      </SelectTrigger>
                      <SelectContent>
                          {allowedPaymentMethods.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
               </div>
              <div className="space-y-2">
                <Label htmlFor="single-payment-amount" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Amount Received</Label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground">{currencySymbol}</span>
                    <Input
                        id="single-payment-amount"
                        type="number"
                        value={singlePayment.amount || ''}
                        onChange={(e) => setSinglePayment(p => ({...p, amount: e.target.value}))}
                        className="h-14 pl-10 text-2xl font-black"
                    />
                </div>
              </div>
              {changeDue > 0 && (
                <div className="text-right bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Change Due: <span className="text-2xl ml-2">{formatCurrencyDisplay(changeDue)}</span></p>
                </div>
              )}
            </div>
          )}
        </div>
        </ScrollArea>
        <DialogFooter className="p-4 sm:p-6 border-t mt-auto bg-background shrink-0 flex flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onClose('cancel')} disabled={isProcessing} className="h-10 px-6 font-bold">
            Cancel
          </Button>
          <Button onClick={handleConfirm} size="sm" disabled={isProcessing} className="h-10 px-8 font-black bg-green-600 hover:bg-green-700 text-white shadow-lg">
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
