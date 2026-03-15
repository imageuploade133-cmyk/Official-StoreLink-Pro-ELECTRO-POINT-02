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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Landmark, Banknote, CalendarIcon, X, AlertTriangle, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { Alert } from '../ui/alert';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import type { PaymentMethod } from '@/lib/types';

export interface CashDepositFormValues {
  amount: number;
  destinationMethod: string;
  depositDate: Date;
  notes?: string;
}

interface CashDepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CashDepositFormValues) => Promise<void>;
  paymentMethods: PaymentMethod[];
  isSubmitting?: boolean;
  currencySymbol: string;
  cashBalance: number;
  allBalances: Record<string, number>;
}

export function CashDepositDialog({
  isOpen,
  onClose,
  onSubmit,
  paymentMethods,
  isSubmitting = false,
  currencySymbol,
  cashBalance,
  allBalances
}: CashDepositDialogProps) {
  const { toast } = useToast();
  const [formState, setFormState] = useState<Omit<CashDepositFormValues, 'amount'> & { amount: string }>({
    amount: '',
    destinationMethod: '',
    depositDate: new Date(),
    notes: '',
  });

  const amountFloat = useMemo(() => parseFloat(formState.amount) || 0, [formState.amount]);
  const isInsufficientCash = amountFloat > cashBalance;

  useEffect(() => {
    if (isOpen) {
      setFormState({
        amount: '',
        destinationMethod: paymentMethods[0]?.name || '',
        depositDate: new Date(),
        notes: '',
      });
    }
  }, [isOpen, paymentMethods]);

  const handleInputChange = (field: keyof typeof formState, value: any) => {
    setFormState(prev => ({...prev, [field]: value}));
  };

  const handleSubmit = () => {
    if (amountFloat <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a positive amount to deposit.' });
      return;
    }
    if (!formState.destinationMethod) {
      toast({ variant: 'destructive', title: 'Destination Missing', description: 'Please select a destination bank account.' });
      return;
    }
    if (!formState.depositDate) {
      toast({ variant: 'destructive', title: 'Date Missing', description: 'Please select a deposit date.' });
      return;
    }
    if (isInsufficientCash) {
       toast({ variant: 'destructive', title: 'Insufficient Cash', description: 'Deposit amount exceeds available cash balance.' });
       return;
    }

    onSubmit({
      amount: amountFloat,
      destinationMethod: formState.destinationMethod,
      depositDate: formState.depositDate,
      notes: formState.notes,
    });
  };

  const destinationBalance = allBalances[formState.destinationMethod] ?? 0;
  const newDestinationBalance = destinationBalance + amountFloat;
  const newCashBalance = cashBalance - amountFloat;

  const isSubmitDisabled = isSubmitting || !formState.amount || amountFloat <= 0 || isInsufficientCash;

  const getButtonTooltip = () => {
    if (isSubmitting) return "Processing...";
    if (!formState.amount || amountFloat <= 0) return "Please enter a valid deposit amount.";
    if (isInsufficientCash) return "Deposit amount exceeds available cash.";
    return "Submit the deposit transaction.";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <DialogContent className="max-w-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Landmark className="h-6 w-6 text-primary" />
            Record Cash Deposit
          </DialogTitle>
          <DialogDescription>
            Transfer funds from your 'Cash' balance to a bank account. This will update both balances.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Column: Form Inputs */}
            <div className="space-y-4">
                 <div className="space-y-1.5">
                    <Label htmlFor="depositAmount">Amount to Deposit</Label>
                    <Input
                    id="depositAmount"
                    type="number"
                    value={formState.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    disabled={isSubmitting}
                    className="h-11 text-base"
                    />
                     {isInsufficientCash && (
                        <Alert variant="destructive" className="p-2 text-xs flex items-center gap-2"><AlertTriangle className="h-4 w-4"/>Amount exceeds available cash.</Alert>
                     )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="destinationMethod">To (Bank Account)</Label>
                        <Select value={formState.destinationMethod} onValueChange={(v) => handleInputChange('destinationMethod', v)} disabled={isSubmitting}>
                        <SelectTrigger id="destinationMethod">
                            <SelectValue placeholder="Select destination..." />
                        </SelectTrigger>
                        <SelectContent>
                            {paymentMethods.map(method => (
                            <SelectItem key={method.id} value={method.name}>{method.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                    <Label htmlFor="depositDate">Deposit Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSubmitting}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formState.depositDate ? format(formState.depositDate, "PPP") : "Pick a date"}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={formState.depositDate}
                            onSelect={(d) => handleInputChange('depositDate', d)}
                            disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="depositNotes">Notes (Optional)</Label>
                    <Textarea
                    id="depositNotes"
                    placeholder="e.g., Bank deposit slip #55123"
                    value={formState.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    disabled={isSubmitting}
                    rows={2}
                    />
                </div>
            </div>

            {/* Right Column: Transaction Summary */}
            <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 space-y-2">
                    <h4 className="font-semibold text-center text-sm text-red-600 dark:text-red-400">Source Account (Debit)</h4>
                     <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><Banknote className="h-4 w-4" /> Cash Balance</span>
                        <span className="font-mono">{formatCurrency(cashBalance, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><TrendingDown className="h-4 w-4"/> Amount Depositing</span>
                        <span className="font-mono text-destructive">-{formatCurrency(amountFloat, currencySymbol)}</span>
                    </div>
                    <Separator/>
                    <div className="flex justify-between items-center font-bold text-base">
                        <span>New Cash Balance</span>
                        <span className="font-mono">{formatCurrency(newCashBalance, currencySymbol)}</span>
                    </div>
                </div>

                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20 space-y-2">
                    <h4 className="font-semibold text-center text-sm text-green-700 dark:text-green-400">Destination Account (Credit)</h4>
                    <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><Landmark className="h-4 w-4" /> {formState.destinationMethod || 'Bank'} Balance</span>
                        <span className="font-mono">{formatCurrency(destinationBalance, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground"><TrendingUp className="h-4 w-4" /> Amount Depositing</span>
                        <span className="font-mono text-green-600">+{formatCurrency(amountFloat, currencySymbol)}</span>
                    </div>
                    <Separator/>
                    <div className="flex justify-between items-center font-bold text-base">
                        <span>New {formState.destinationMethod || 'Bank'} Balance</span>
                        <span className="font-mono">{formatCurrency(newDestinationBalance, currencySymbol)}</span>
                    </div>
                </div>
            </div>
        </div>
        </ScrollArea>
        

        <DialogFooter className="p-6 pt-4 border-t gap-2 bg-background shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              <X className="mr-2 h-4 w-4"/> Cancel
            </Button>
          </DialogClose>
          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div> 
                        <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Confirm Deposit
                        </Button>
                    </div>
                </TooltipTrigger>
                {isSubmitDisabled && <TooltipContent><p>{getButtonTooltip()}</p></TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
