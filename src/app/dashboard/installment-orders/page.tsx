
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, doc, updateDoc, Timestamp, addDoc } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { 
  CreditCard, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle,
  Download,
  Eye,
  History,
  HandCoins,
  Loader2,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { formatCurrency } from '@/lib/formatUtils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { InstallmentRecord, PaymentRecord } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { recordInstallmentPaymentAction, sendInstallmentReminderAction } from '@/app/actions/installments';

export default function InstallmentOrdersPage() {
  const firestore = useFirestore();
  const { store, staffMember } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  const currencySymbol = settings?.currency || '$';
  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [selectedRecord, setSelectedRecord] = useState<InstallmentRecord | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const installmentQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    let q = query(collection(firestore, 'installmentRecords'), where('store_id', '==', currentStoreId), orderBy('createdAt', 'desc'));
    return q;
  }, [firestore, currentStoreId]);

  const { data: records, isLoading } = useCollection<InstallmentRecord>(installmentQuery);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return records.filter(r => {
      const matchesSearch = r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           r.productName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  const handleRecordPayment = async () => {
      if (!selectedRecord || !paymentAmount) return;
      setIsSubmittingPayment(true);
      try {
          const result = await recordInstallmentPaymentAction(
              selectedRecord.id, 
              parseFloat(paymentAmount), 
              'Manual Admin Entry', 
              paymentNotes
          );
          if (result.success) {
              toast({ title: "Payment Recorded", description: "The installment record has been updated." });
              setIsRecordPaymentOpen(false);
              setPaymentAmount('');
              setPaymentNotes('');
          } else {
              throw new Error(result.error);
          }
      } catch (error: any) {
          toast({ variant: "destructive", title: "Error", description: error.message });
      } finally {
          setIsSubmittingPayment(false);
      }
  };

  const handleSendReminder = async (record: InstallmentRecord) => {
      try {
          const result = await sendInstallmentReminderAction(record.id, currentStoreId!);
          if (result.success) {
              toast({ title: "Reminder Sent", description: `WhatsApp reminder sent to ${record.customerName}.` });
          } else {
              throw new Error(result.error);
          }
      } catch (error: any) {
          toast({ variant: "destructive", title: "Failed to send reminder", description: error.message });
      }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-blue-500 text-white gap-1.5"><Clock className="h-3 w-3" /> Active</Badge>;
      case 'completed': return <Badge className="bg-green-500 text-white gap-1.5"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case 'overdue': return <Badge className="bg-red-500 text-white gap-1.5"><AlertCircle className="h-3 w-3" /> Overdue</Badge>;
      case 'cancelled': return <Badge className="bg-gray-500 text-white gap-1.5"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const exportToCsv = () => {
      if (!filteredRecords.length) return;
      const headers = ['Customer', 'Product', 'Total Amount', 'Paid', 'Remaining', 'Status', 'Next Due Date'];
      const rows = filteredRecords.map(r => [
          r.customerName,
          r.productName,
          r.totalAmount,
          r.totalAmount - r.remainingBalance,
          r.remainingBalance,
          r.status,
          format(r.nextDueDate.toDate(), 'yyyy-MM-dd')
      ]);
      
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `installment_orders_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          icon={CreditCard} 
          title="Installment Orders" 
          description="Track and manage customer Pay Small Small plans."
        />
        <Button variant="outline" onClick={exportToCsv} disabled={filteredRecords.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by customer or product..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10 h-11"
          />
        </div>
        <div className="flex gap-2">
            <Button 
                variant={statusFilter === 'all' ? 'default' : 'outline'} 
                onClick={() => setStatusFilter('all')}
                className="h-11 px-6 rounded-xl font-bold"
            >All</Button>
            <Button 
                variant={statusFilter === 'active' ? 'default' : 'outline'} 
                onClick={() => setStatusFilter('active')}
                className="h-11 px-6 rounded-xl font-bold"
            >Active</Button>
            <Button 
                variant={statusFilter === 'overdue' ? 'default' : 'outline'} 
                onClick={() => setStatusFilter('overdue')}
                className="h-11 px-6 rounded-xl font-bold"
            >Overdue</Button>
        </div>
      </div>

      <Card className="shadow-xl border-none ring-1 ring-border overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest pl-6">Customer & Product</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Financials</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Progress</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Next Due Date</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5} className="py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                ))
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-60 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard className="h-12 w-12 opacity-10" />
                      <p className="font-bold">No installment records found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => {
                  const paidAmount = record.totalAmount - record.remainingBalance;
                  const progress = (paidAmount / record.totalAmount) * 100;
                  
                  return (
                    <TableRow key={record.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="py-4 pl-6">
                        <div>
                            <p className="font-black text-gray-900">{record.customerName}</p>
                            <p className="text-xs text-primary font-bold">{record.productName}</p>
                            <div className="mt-1">{getStatusBadge(record.status)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                            <p className="text-sm font-bold">Total: {formatCurrency(record.totalAmount, currencySymbol)}</p>
                            <p className="text-xs text-muted-foreground">Owed: {formatCurrency(record.remainingBalance, currencySymbol)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-black uppercase">
                                <span>{Math.round(progress)}% Paid</span>
                                <span>{formatCurrency(paidAmount, currencySymbol)}</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className={cn(
                                "text-sm font-bold",
                                record.status === 'overdue' ? "text-red-600" : ""
                            )}>
                                {format(record.nextDueDate.toDate(), 'PPP')}
                            </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-primary/10">
                            <DropdownMenuLabel>Order Management</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setSelectedRecord(record); setIsRecordPaymentOpen(true); }} className="gap-2 cursor-pointer font-bold">
                                <HandCoins className="h-4 w-4 text-green-600" /> Record Payment
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendReminder(record)} className="gap-2 cursor-pointer">
                                <Send className="h-4 w-4 text-primary" /> Send WhatsApp Reminder
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer">
                                <History className="h-4 w-4 text-blue-600" /> Payment History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 font-bold">
                                <XCircle className="h-4 w-4" /> Cancel Plan
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Record Installment Payment</DialogTitle>
            <DialogDescription>
              Adding a payment for {selectedRecord?.customerName}. This will update the remaining balance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Remaining Balance</span>
                    <span className="font-black text-primary">{selectedRecord && formatCurrency(selectedRecord.remainingBalance, currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Installment Size</span>
                    <span className="font-bold">{selectedRecord && formatCurrency(selectedRecord.remainingBalance / (selectedRecord.numberOfPayments - selectedRecord.paymentHistory.length + 1), currencySymbol)}</span>
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount" className="font-bold">Payment Amount ({currencySymbol})</Label>
              <Input 
                id="amount" 
                type="number" 
                value={paymentAmount} 
                onChange={(e) => setPaymentAmount(e.target.value)} 
                placeholder="0.00"
                className="h-12 text-lg font-black"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="font-bold">Internal Notes (Optional)</Label>
              <Input 
                id="notes" 
                value={paymentNotes} 
                onChange={(e) => setPaymentNotes(e.target.value)} 
                placeholder="Receipt number, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
                onClick={handleRecordPayment} 
                disabled={isSubmittingPayment || !paymentAmount}
                className="w-full h-12 rounded-xl font-bold"
            >
                {isSubmittingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Post Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
