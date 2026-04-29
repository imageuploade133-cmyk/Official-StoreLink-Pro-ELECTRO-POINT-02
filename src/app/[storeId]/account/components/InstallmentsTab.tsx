'use client';

import React, { useMemo, useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { InstallmentRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/formatUtils';
import { Loader2, CreditCard, History, Calendar, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function InstallmentsTab({ user }: { user: any }) {
  const firestore = useFirestore();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';
  const [selectedRecord, setSelectedRecord] = useState<InstallmentRecord | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const installmentsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'installmentRecords'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: installments, isLoading: isLoadingInstallments } = useCollection<InstallmentRecord>(installmentsQuery);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-blue-500 text-white gap-1.5"><Clock className="h-3 w-3" /> Active</Badge>;
      case 'completed': return <Badge className="bg-green-500 text-white gap-1.5"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case 'overdue': return <Badge className="bg-red-500 text-white gap-1.5"><AlertCircle className="h-3 w-3" /> Overdue</Badge>;
      case 'cancelled': return <Badge className="bg-gray-500 text-white gap-1.5"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (isLoadingInstallments) {
    return (
      <div className="flex h-[30vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Pay Small Small Plans
          </CardTitle>
          <CardDescription>Track your installment payments and remaining balance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Financials</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments && installments.length > 0 ? (
                    installments.map((record) => {
                      const paidAmount = record.totalAmount - record.remainingBalance;
                      const progress = (paidAmount / record.totalAmount) * 100;
                      
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <p className="font-bold">{record.productName}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">Started {format(record.createdAt.toDate(), 'PP')}</p>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                                <p className="font-bold">Total: {formatCurrency(record.totalAmount, currencySymbol)}</p>
                                <p className="text-xs text-muted-foreground">Balance: {formatCurrency(record.remainingBalance, currencySymbol)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold uppercase">
                                    <span>{Math.round(progress)}% Paid</span>
                                </div>
                                <Progress value={progress} className="h-1.5" />
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(record.status)}
                          </TableCell>
                          <TableCell className="text-right">
                             <Button variant="outline" size="sm" onClick={() => { setSelectedRecord(record); setIsHistoryOpen(true); }} className="h-8 gap-1">
                               <History className="h-3.5 w-3.5"/>
                               History
                             </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="text-center py-16">
                          <CreditCard className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                          <h3 className="mt-4 text-lg font-semibold">No Installment Plans</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            You don&apos;t have any active Pay Small Small plans at the moment.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              Viewing your payments for {selectedRecord?.productName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                {selectedRecord?.paymentHistory && selectedRecord.paymentHistory.length > 0 ? (
                    [...selectedRecord.paymentHistory].reverse().map((payment, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex justify-between items-center group hover:bg-muted/50 transition-colors">
                            <div className="flex gap-3 items-center">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-black text-sm">{formatCurrency(payment.amountPaid, currencySymbol)}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{format(payment.paymentDate.toDate(), 'PPP p')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <Badge variant="secondary" className="text-[9px] font-black uppercase">{payment.paymentMethod}</Badge>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <History className="h-12 w-12 mx-auto opacity-10 mb-2" />
                        <p className="font-bold">No payments recorded yet.</p>
                    </div>
                )}
            </div>
            <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-muted-foreground">Total Paid</span>
                    <span className="font-black text-green-600">{selectedRecord && formatCurrency(selectedRecord.totalAmount - selectedRecord.remainingBalance, currencySymbol)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                    <span className="font-bold text-muted-foreground">Remaining</span>
                    <span className="font-black text-primary">{selectedRecord && formatCurrency(selectedRecord.remainingBalance, currencySymbol)}</span>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)} className="w-full h-12 rounded-xl font-bold">
                Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
