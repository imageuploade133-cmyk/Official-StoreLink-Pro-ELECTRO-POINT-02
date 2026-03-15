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
            <DialogContent className="sm:max-w-lg p-6 bg-white rounded-lg shadow-xl" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500 h-6 w-6"/> Confirm Credit Sale
                    </DialogTitle>
                    <DialogDescription className="text-lg text-gray-600 mt-2">Review the details for <span className="font-extrabold text-primary">{saleData.customer?.name || 'this credit sale'}</span> before finalizing.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4 text-base">
                    <Card className="border-2 border-green-200 bg-green-50 shadow-sm">
                        <CardContent className="pt-6 space-y-4">
                            {saleData.discountAmount && saleData.discountAmount > 0 ? (
                                <>
                                <div className="flex justify-between items-center text-gray-700">
                                    <span className="text-lg font-medium">Subtotal:</span>
                                    <span className="font-bold text-lg">{formatCurrencyDisplay(saleData.subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-600">
                                    <span className="text-lg font-medium">Discount:</span>
                                    <span className="font-bold text-lg">-{formatCurrencyDisplay(saleData.discountAmount)}</span>
                                </div>
                                <Separator className="my-2" />
                                </>
                            ) : null}
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-medium text-gray-700 flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600"/> Sale Total:</span> 
                                <span className="font-extrabold text-2xl text-green-700">{formatCurrencyDisplay(grandTotal)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-medium text-gray-700 flex items-center gap-2"><Wallet className="h-5 w-5 text-blue-600"/> Initial Payment:</span> 
                                <span className="font-bold text-xl text-blue-700">{formatCurrencyDisplay(saleData.initialPaymentAtSale ?? 0)}</span>
                            </div>
                            <Separator className="my-4 bg-gray-200" />
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-xl text-red-700 flex items-center gap-2"><CreditCard className="h-5 w-5 text-red-600"/> Amount on Credit:</span>
                                <span className="font-extrabold text-2xl text-red-700">{formatCurrencyDisplay(grandTotal - (saleData.initialPaymentAtSale ?? 0))}</span>
                            </div>
                        </CardContent>
                    </Card>
                     <Card className="border-2 border-gray-200 bg-gray-50 shadow-sm">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-medium text-gray-700 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-purple-600"/> Payment Due Date:</span> 
                                <span className="font-bold text-lg">{saleData.dueDate ? format(saleData.dueDate, 'PPP') : 'N/A'}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => onClose('back')} disabled={isProcessing} className="px-6 py-3 text-base">Back</Button>
                    <Button onClick={handleConfirm} disabled={isProcessing} className="px-6 py-3 text-base bg-orange-600 hover:bg-orange-700">
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirm Sale
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isProcessing) onClose('cancel'); }}>
      <DialogContent className="sm:max-w-lg p-0 h-auto max-h-[90vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" /> Finalize Payment
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-600 mt-2">
            {saleData.discountAmount && saleData.discountAmount > 0 && (
                <span className="text-sm block">
                    Subtotal: {formatCurrencyDisplay(saleData.subtotal)}
                    <span className="text-red-500 ml-2">(-{formatCurrencyDisplay(saleData.discountAmount)})</span>
                </span>
            )}
            Total Due: <span className="font-extrabold text-green-600">{formatCurrencyDisplay(grandTotal)}</span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center space-x-2 rounded-lg border p-3">
              <Switch id="split-payment-toggle" checked={useSplitPayment} onCheckedChange={setUseSplitPayment} />
              <Label htmlFor="split-payment-toggle" className="font-medium">Split Payment</Label>
          </div>
          
          {useSplitPayment ? (
            <div className="space-y-3">
              {allowedPaymentMethods.map(method => (
                <div key={method.id} className="flex items-center gap-3">
                  <Label htmlFor={`split-${method.name}`} className="w-24 flex items-center text-sm">{getPaymentMethodIcon(method.name)} {method.name}</Label>
                  <Input 
                    id={`split-${method.name}`} 
                    type="number" 
                    placeholder="0.00"
                    value={splitPayments[method.name] || ''}
                    onChange={(e) => handleSplitPaymentChange(method.name, e.target.value)}
                    className="h-9"
                  />
                </div>
              ))}
              <Separator />
               <div className="text-right space-y-1">
                  <p className="text-sm">Total Tendered: <span className="font-semibold">{formatCurrencyDisplay(totalSplitAmount)}</span></p>
                  <p className={`text-sm font-semibold ${remainingToPay > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {remainingToPay > 0 ? `Remaining: ${formatCurrencyDisplay(remainingToPay)}` : `Change: ${formatCurrencyDisplay(-remainingToPay)}`}
                  </p>
               </div>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="space-y-1.5">
                  <Label htmlFor="single-payment-method" className="text-base font-medium">Payment Method</Label>
                   <Select value={singlePayment.method} onValueChange={(v) => setSinglePayment(p => ({...p, method: v}))}>
                      <SelectTrigger id="single-payment-method" className="h-10">
                          <SelectValue placeholder="Select method"/>
                      </SelectTrigger>
                      <SelectContent>
                          {allowedPaymentMethods.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
               </div>
              <div className="space-y-1.5">
                <Label htmlFor="single-payment-amount" className="text-base font-medium">Amount Received</Label>
                <Input
                  id="single-payment-amount"
                  type="number"
                  value={singlePayment.amount || ''}
                  onChange={(e) => setSinglePayment(p => ({...p, amount: e.target.value}))}
                  className="h-10 text-lg"
                />
              </div>
              {changeDue > 0 && (
                <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600">Change Due: {formatCurrencyDisplay(changeDue)}</p>
                </div>
              )}
            </div>
          )}
        </div>
        </ScrollArea>
        <DialogFooter className="p-6 border-t mt-auto">
          <Button variant="outline" onClick={() => onClose('cancel')} disabled={isProcessing} className="px-6 py-3 text-base">
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing} className="px-6 py-3 text-base bg-green-600 hover:bg-green-700">
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
