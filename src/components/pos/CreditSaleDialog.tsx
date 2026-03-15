'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, addDays, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/types';

interface CreditSaleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { dueDate: Date, initialPaymentAmount: number }) => void;
  totalAmount: number;
  customer: Customer | null;
  isSubmitting?: boolean;
  currencySymbol: string;
}

export function CreditSaleDialog({
  isOpen,
  onClose,
  onConfirm,
  totalAmount,
  customer,
  isSubmitting = false,
  currencySymbol,
}: CreditSaleDialogProps) {
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setDueDate(addDays(new Date(), 30));
      setInitialPaymentAmount('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!dueDate) {
      alert("Please select a due date.");
      return;
    }
    const amountPaidNow = parseFloat(initialPaymentAmount) || 0;
    onConfirm({ dueDate, initialPaymentAmount: amountPaidNow });
  };
  
  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Credit Sale Details</DialogTitle>
          <DialogDescription>
            Set due date and initial payment for {customer.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Sale Amount</p>
            <p className="text-3xl font-bold text-primary">{currencySymbol}{totalAmount.toFixed(2)}</p>
          </div>
          <div>
            <Label htmlFor="initialPayment">Initial Payment (Optional)</Label>
             <Input
              id="initialPayment"
              type="number"
              placeholder="0.00"
              value={initialPaymentAmount}
              onChange={(e) => setInitialPaymentAmount(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date: Date) => date < startOfDay(new Date()) || isSubmitting}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !dueDate}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            Proceed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
