'use client';

import React, { useState, useEffect } from 'react';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  X, 
  Printer, 
  Wallet,
  FileText
} from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';
import { convertToDateSafely, cn } from '@/lib/utils';
import type { Customer, CreditPayment, CreditPaymentReceiptInfo } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { useSettings } from '@/contexts/settings-context';
import Link from 'next/link';

interface CustomerDepositsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  currencySymbol: string;
  onViewReceipt: (info: CreditPaymentReceiptInfo) => void;
}

export function CustomerDepositsModal({
  isOpen,
  onClose,
  customer,
  currencySymbol,
  onViewReceipt
}: CustomerDepositsModalProps) {
  const firestore = useFirestore();
  const { settings } = useSettings();
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && customer && firestore) {
      const fetchPayments = async () => {
        setIsLoading(true);
        try {
          const q = query(
            collection(firestore, 'creditPayments'),
            where('customerId', '==', customer.id),
            orderBy('paymentDate', 'desc')
          );
          const snapshot = await getDocs(q);
          const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditPayment));
          setPayments(paymentsData);
        } catch (error) {
          console.error('Error fetching customer payments:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchPayments();
    }
  }, [isOpen, customer, firestore]);

  const handlePrintReceipt = (payment: CreditPayment) => {
    const receiptInfo: CreditPaymentReceiptInfo = {
      id: payment.id,
      storeName: settings?.storeName || 'StoreLink Pro',
      customerName: customer.name,
      saleIdPaidAgainst: payment.saleId || 'MULTI-BAL',
      originalSaleDate: payment.paymentDate,
      items: [], 
      paymentRecord: {
        paymentDate: payment.paymentDate,
        amountPaid: payment.amount,
        paymentMethod: payment.paymentMethod,
        notes: payment.notes
      },
      saleTotalAmount: payment.amount,
      saleAmountPreviouslyPaid: 0,
      saleRemainingBalance: customer.outstandingCredit || 0,
      customerTotalOutstandingAfterPayment: customer.outstandingCredit || 0,
      reprintCount: 0
    };
    onViewReceipt(receiptInfo);
  };

  const statementPath = customer.uid 
    ? `/dashboard/online-customers/${customer.id}/statement`
    : `/dashboard/customers/${customer.id}/statement`;

  // Safe numeric values to prevent NaN
  const outstanding = customer.outstandingCredit || 0;
  const balance = customer.creditBalance || 0;
  const netPosition = balance - outstanding;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <History className="h-7 w-7 text-primary" />
            <DialogTitle className="text-2xl font-bold tracking-tight">Account Activity: {customer.name}</DialogTitle>
          </div>
          <DialogDescription>
            Audit log of all deposits and partial payments received.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 bg-primary/5 border-b flex justify-between items-center">
            <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Net Position</p>
                <p className={cn("text-xl font-black tracking-tighter", outstanding > 0 ? "text-red-600" : "text-green-600")}>
                    {formatCurrency(netPosition, currencySymbol)}
                </p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Lifetime Deposits</p>
                <p className="text-xl font-black tracking-tighter text-primary">
                    {formatCurrency(payments.reduce((s, p) => s + (p.amount || 0), 0), currencySymbol)}
                </p>
            </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-3xl">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-10" />
                <p className="font-bold">No payment history found.</p>
                <p className="text-sm">Start by recording a new deposit for this customer.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Method</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Amount Paid</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const date = convertToDateSafely(payment.paymentDate);
                    return (
                      <TableRow key={payment.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="py-4">
                          <div className="font-bold text-sm">
                            {date ? format(date, 'EEEE - MMM- dd- yyyy') : 'N/A'}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase">{date ? format(date, 'h:mm a') : ''}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-black uppercase px-2 h-5 bg-background ">
                            {payment.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-black text-primary text-base">
                            {formatCurrency(payment.amount || 0, currencySymbol)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 gap-2 font-black text-[10px] uppercase tracking-tighter hover:bg-primary/10 hover:text-primary rounded-lg"
                            onClick={() => handlePrintReceipt(payment)}
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-background shrink-0 flex flex-row justify-between items-center">
          <Button variant="ghost" className="h-11 font-black uppercase tracking-widest text-[10px] gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-white" asChild>
            <Link href={statementPath}>
                <FileText className="h-4 w-4" /> Full Statement of Account
            </Link>
          </Button>
          <DialogClose asChild>
            <Button variant="outline" className="h-11 px-8 font-bold">
              <X className="mr-2 h-4 w-4" /> Close Hub
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
