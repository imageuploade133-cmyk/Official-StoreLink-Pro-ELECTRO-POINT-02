'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, getDocs, limit, startAfter, endBefore, QueryDocumentSnapshot, QueryConstraint } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { 
  CreditCard, 
  Search, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle,
  Download,
  History,
  HandCoins,
  Loader2,
  Send,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw
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
  DialogTitle 
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { formatCurrency } from '@/lib/formatUtils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { InstallmentRecord } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { recordInstallmentPaymentAction, sendInstallmentReminderAction, markAllInstallmentsAsReadAction } from '@/app/actions/installments';
import { Check } from 'lucide-react';

const PAGE_SIZE = 50;

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Pagination state
  const [records, setRecords] = useState<InstallmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [firstDoc, setFirstDoc] = useState<QueryDocumentSnapshot | null>(null);

  const fetchRecords = useCallback(async (cursorDoc?: QueryDocumentSnapshot | null, isPrev = false) => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);

    try {
      let constraints: QueryConstraint[] = [
        where('store_id', '==', currentStoreId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      ];

      if (cursorDoc) {
        if (isPrev) {
          constraints = [
            where('store_id', '==', currentStoreId),
            orderBy('createdAt', 'asc'),
            limit(PAGE_SIZE)
          ];
          constraints.push(endBefore(cursorDoc));
        } else {
          constraints.push(startAfter(cursorDoc));
        }
      }

      const q = query(collection(firestore, 'installmentRecords'), ...constraints);
      const snapshot = await getDocs(q);
      
      let newRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InstallmentRecord[];

      // Reverse if fetching previous page
      if (isPrev && cursorDoc) {
        newRecords = newRecords.reverse();
      }

      setRecords(newRecords);

      // Update pagination state
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setFirstDoc(snapshot.docs[0]);
      }
      
      setHasNext(snapshot.docs.length === PAGE_SIZE);
      if (cursorDoc && isPrev) {
        setHasPrev(false);
      } else if (cursorDoc) {
        setHasPrev(true);
      }

      if (snapshot.docs.length > 0 && !isPrev) {
        setFirstDoc(snapshot.docs[0]);
      }

    } catch (error) {
      console.error('Error fetching installment records:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load installment records.' });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, currentStoreId, toast]);

  // Initial fetch
  useEffect(() => {
    if (currentStoreId && firestore) {
      fetchRecords();
    }
  }, [currentStoreId, firestore, fetchRecords]);

  const goToNextPage = useCallback(async () => {
    if (!hasNext || isLoading) return;
    setCurrentPage(prev => prev + 1);
    await fetchRecords(lastDoc, false);
  }, [hasNext, isLoading, lastDoc, fetchRecords]);

  const goToPrevPage = useCallback(async () => {
    if (!hasPrev || isLoading || !firstDoc) return;
    setCurrentPage(prev => Math.max(1, prev - 1));
    await fetchRecords(firstDoc, true);
  }, [hasPrev, isLoading, firstDoc, fetchRecords]);

  const handleRefresh = useCallback(async () => {
    setCurrentPage(1);
    setHasPrev(false);
    setLastDoc(null);
    setFirstDoc(null);
    await fetchRecords();
  }, [fetchRecords]);

  const stats = useMemo(() => {
    if (!records) return { totalIncome: 0, todayIncome: 0, totalCompleted: 0, todayCompleted: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalIncome = 0;
    let todayIncome = 0;
    let totalCompleted = 0;
    let todayCompleted = 0;

    records.forEach(record => {
      record.paymentHistory?.forEach(payment => {
        const paymentDate = payment.paymentDate?.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
        totalIncome += payment.amountPaid;
        if (paymentDate >= today) {
          todayIncome += payment.amountPaid;
        }
      });

      if (record.status === 'completed') {
        totalCompleted++;
        const completedAt = record.completedAt?.toDate ? record.completedAt.toDate() : record.updatedAt?.toDate ? record.updatedAt.toDate() : null;
        if (completedAt && completedAt >= today) {
          todayCompleted++;
        }
      }
    });

    return { totalIncome, todayIncome, totalCompleted, todayCompleted };
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return records.filter(r => {
      const matchesSearch = r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           r.productName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const handleMarkAllAsRead = async () => {
    if (!currentStoreId) return;
    setIsMarkingRead(true);
    try {
      const result = await markAllInstallmentsAsReadAction(currentStoreId);
      if (result.success) {
        toast({ title: "Success", description: "All installment orders marked as read." });
        await handleRefresh();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsMarkingRead(false);
    }
  };

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
              await handleRefresh();
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
          r.nextDueDate?.toDate ? format(r.nextDueDate.toDate(), 'yyyy-MM-dd') : 'N/A'
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
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading} className="font-bold">
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                Refresh
            </Button>
            <Button 
                variant="outline" 
                onClick={handleMarkAllAsRead} 
                disabled={isMarkingRead || !records?.some(r => r.isRead === false)}
                className="font-bold"
            >
                {isMarkingRead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Mark all as read
            </Button>
            <Button variant="outline" onClick={exportToCsv} disabled={filteredRecords.length === 0} className="font-bold">
                <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-none ring-1 ring-border bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest">Total Income</CardDescription>
            <CardTitle className="text-2xl font-black">{formatCurrency(stats.totalIncome, currencySymbol)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-sm border-none ring-1 ring-border bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-green-600">Today's Income</CardDescription>
            <CardTitle className="text-2xl font-black text-green-600">{formatCurrency(stats.todayIncome, currencySymbol)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-sm border-none ring-1 ring-border bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-blue-600">Total Completed</CardDescription>
            <CardTitle className="text-2xl font-black text-blue-600">{stats.totalCompleted}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-sm border-none ring-1 ring-border bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-purple-600">Today Completed</CardDescription>
            <CardTitle className="text-2xl font-black text-purple-600">{stats.todayCompleted}</CardTitle>
          </CardHeader>
        </Card>
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
                <TableHead className="font-black uppercase text-[10px] tracking-widest pl-6 text-left">Customer & Product</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-left">Financials</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-left">Progress</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-left">Next Due Date</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-left pr-6">Actions</TableHead>
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
                      <TableCell className="py-4 pl-6 text-left">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-black text-gray-900">{record.customerName}</p>
                                {record.isRead === false && <Badge className="h-4 px-1.5 text-[8px] bg-destructive text-destructive-foreground animate-pulse">NEW</Badge>}
                            </div>
                            <p className="text-xs text-primary font-bold">{record.productName}</p>
                            <div className="mt-1">{getStatusBadge(record.status)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="space-y-1">
                            <p className="text-sm font-bold">Total: <span className="financial-value">{formatCurrency(record.totalAmount, currencySymbol)}</span></p>
                            <p className="text-xs text-muted-foreground">Owed: <span className="financial-value">{formatCurrency(record.remainingBalance, currencySymbol)}</span></p>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[150px] text-left">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-black uppercase gap-4">
                                <span>{Math.round(progress)}% Paid</span>
                                <span className="financial-value">{formatCurrency(paidAmount, currencySymbol)}</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className={cn(
                                "text-sm font-bold whitespace-nowrap",
                                record.status === 'overdue' ? "text-red-600" : ""
                            )}>
                                {record.nextDueDate?.toDate ? format(record.nextDueDate.toDate(), 'PPP') : 'N/A'}
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
                            <DropdownMenuItem onClick={() => { setSelectedRecord(record); setIsHistoryOpen(true); }} className="gap-2 cursor-pointer font-bold">
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
        <div className="flex justify-between items-center py-3 px-6 border-t bg-muted/5">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPrevPage} 
              disabled={!hasPrev || isLoading}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextPage} 
              disabled={!hasNext || isLoading}
              className="gap-1"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
            {hasNext ? `${PAGE_SIZE}+ records` : `${records.length} records`} loaded per fetch
          </p>
        </div>
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

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              Viewing payments for {selectedRecord?.customerName}&apos;s {selectedRecord?.productName} plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center px-2">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Recent Payments</span>
                <Badge variant="outline" className="font-bold">{selectedRecord?.paymentHistory?.length || 0} Payments</Badge>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                {selectedRecord?.paymentHistory && selectedRecord.paymentHistory.length > 0 ? (
                    [...selectedRecord.paymentHistory].reverse().map((payment, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex justify-between items-center group hover:bg-muted/50 transition-colors">
                            <div className="flex gap-3 items-center">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <HandCoins className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-black text-sm">{formatCurrency(payment.amountPaid, currencySymbol)}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                                      {payment.paymentDate?.toDate ? format(payment.paymentDate.toDate(), 'PPP p') : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <Badge variant="secondary" className="text-[9px] font-black uppercase">{payment.paymentMethod}</Badge>
                                {payment.notes && <p className="text-[9px] text-muted-foreground mt-1 max-w-[150px] truncate">{payment.notes}</p>}
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
                Close History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
