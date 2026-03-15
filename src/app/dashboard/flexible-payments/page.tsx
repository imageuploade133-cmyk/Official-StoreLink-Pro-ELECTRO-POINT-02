'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  limit, 
  startAfter, 
  endBefore, 
  limitToLast, 
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { 
  Wallet, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Users, 
  Loader2, 
  PiggyBank,
  HandCoins,
  FileText,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';
import type { Customer, CreditPaymentReceiptInfo } from '@/lib/types';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { RecordDepositDialog } from '@/components/dialogs/RecordDepositDialog';
import { CreditPaymentReceiptModal } from '@/components/dialogs/credit-payment-receipt-modal';
import { CustomerDepositsModal } from '@/components/dialogs/CustomerDepositsModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositAuditTab } from '@/components/tabs/DepositAuditTab';
import Link from 'next/link';

const ITEMS_PER_PAGE = 15;

export default function FlexiblePaymentsPage() {
  const firestore = useFirestore();
  const { user, permissions, isLoading: isAuthLoading } = useAuth();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('registry');
  
  // Pagination State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalCustomerCount, setTotalCustomerCount] = useState(0);

  // Stable cursors using refs
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Modal States
  const [selectedCustomerForDeposit, setSelectedCustomerForDeposit] = useState<Customer | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Receipt Modal State
  const [paymentReceiptInfo, setPaymentReceiptInfo] = useState<CreditPaymentReceiptInfo | null>(null);
  const [isPaymentReceiptOpen, setIsPaymentReceiptOpen] = useState(false);

  const fetchCustomers = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore) return;
    setIsLoadingCustomers(true);

    try {
      let q = query(collection(firestore, 'customers'), orderBy('name', 'asc'));

      // 1. Initial count (Cost Efficient)
      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalCustomerCount(countSnap.data().count);
      }

      // 2. Apply cursors from refs
      if (direction === 'next' && lastDocRef.current) {
        q = query(q, startAfter(lastDocRef.current), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstDocRef.current) {
        q = query(q, endBefore(firstDocRef.current), limitToLast(ITEMS_PER_PAGE));
      } else {
        q = query(q, limit(ITEMS_PER_PAGE));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        // Update refs for next call
        firstDocRef.current = docs[0];
        lastDocRef.current = docs[docs.length - 1];
        
        setIsLastPage(docs.length < ITEMS_PER_PAGE);

        const customerData = docs.map(d => ({ 
            id: d.id, 
            ...d.data()
        } as Customer));
        setCustomers(customerData);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setCustomers([]);
          setIsLastPage(true);
        } else if (direction === 'next') {
          setIsLastPage(true);
        }
      }
    } catch (error: any) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [firestore]);

  useEffect(() => {
    if (firestore && !isAuthLoading && permissions.manage_flexible_payments) {
      fetchCustomers('initial');
    }
  }, [firestore, isAuthLoading, permissions.manage_flexible_payments, fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const term = searchTerm.toLowerCase().trim();
    return customers.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.phone?.includes(term) || 
      c.email?.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const stats = useMemo(() => {
    if (!customers) return { totalOwed: 0, totalDeposits: 0, activeAccounts: 0 };
    return customers.reduce((acc, c) => {
      acc.totalOwed += (c.outstandingCredit || 0);
      acc.totalDeposits += (c.creditBalance || 0);
      if ((c.outstandingCredit || 0) > 0 || (c.creditBalance || 0) > 0) {
        acc.activeAccounts += 1;
      }
      return acc;
    }, { totalOwed: 0, totalDeposits: 0, activeAccounts: 0 });
  }, [customers]);

  const handleOpenDeposit = (customer: Customer) => {
    setSelectedCustomerForDeposit(customer);
    setIsDepositOpen(true);
  };

  const handleOpenHistory = (customer: Customer) => {
    setSelectedCustomerForHistory(customer);
    setIsHistoryOpen(true);
  };

  const handleDepositSuccess = (args: { success: boolean; receiptInfo?: CreditPaymentReceiptInfo }) => {
    if (args.success && args.receiptInfo) {
        setPaymentReceiptInfo(args.receiptInfo);
        setIsPaymentReceiptOpen(true);
    }
    setSelectedCustomerForDeposit(null);
    fetchCustomers('initial'); // Refresh current state
  };

  const handleViewReceiptFromHistory = (receiptInfo: CreditPaymentReceiptInfo) => {
    setPaymentReceiptInfo(receiptInfo);
    setIsPaymentReceiptOpen(true);
  };

  if (isAuthLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!permissions.manage_flexible_payments) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          icon={Wallet} 
          title="Flexible Accounts (Pay Small Small)" 
          description="Manage customer installment plans and pre-paid deposits."
        />
        <Button variant="outline" onClick={() => fetchCustomers('initial')} disabled={isLoadingCustomers}>
            <RotateCcw className={cn("mr-2 h-4 w-4", isLoadingCustomers && "animate-spin")} />
            Sync Registry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-orange-50 border-orange-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-orange-600 flex items-center justify-between">
                Current Batch Debt <ArrowUpRight className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-700">{formatCurrency(stats.totalOwed, currencySymbol)}</div>
            <p className="text-[10px] text-orange-600/70 font-bold uppercase mt-1">Sum of active credit sales in view</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-green-600 flex items-center justify-between">
                Current Batch Balances <ArrowDownLeft className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-700">{formatCurrency(stats.totalDeposits, currencySymbol)}</div>
            <p className="text-[10px] text-green-600/70 font-bold uppercase mt-1">Unallocated funds in view</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center justify-between">
                Total Registry Members <Users className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-700">{totalCustomerCount.toLocaleString()}</div>
            <p className="text-[10px] text-blue-600/70 font-bold uppercase mt-1">Registered accounts in database</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-12 p-1 bg-muted/50 rounded-2xl border">
          <TabsTrigger value="registry" className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2">
            <Users className="h-3.5 w-3.5" /> Account Registry
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2">
            <History className="h-3.5 w-3.5" /> Deposit Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="shadow-lg border-none ring-1 ring-border overflow-hidden">
            <CardHeader className="border-b bg-muted/10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <CardTitle>Customer Account Manager</CardTitle>
                    <CardDescription>Accept deposits and view statements. Incremental fetching active.</CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search within current batch..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest pl-6">Customer</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Debt Due</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Credit Bal</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest">Net Position</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest pr-6">Account Tools</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingCustomers && customers.length === 0 ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={5} className="py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                    ))
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <PiggyBank className="h-12 w-12 opacity-10" />
                          <p className="font-medium">No matching accounts found in this batch.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => {
                      const debt = customer.outstandingCredit || 0;
                      const credit = customer.creditBalance || 0;
                      const net = credit - debt;
                      
                      const statementPath = customer.uid 
                        ? `/dashboard/online-customers/${customer.id}/statement`
                        : `/dashboard/customers/${customer.id}/statement`;

                      return (
                        <TableRow key={customer.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="py-4 pl-6">
                            <p className="font-bold text-gray-900">{customer.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{customer.phone || customer.email || 'No contact info'}</p>
                          </TableCell>
                          <TableCell className="text-right font-bold text-orange-600">
                            {debt > 0 ? formatCurrency(debt, currencySymbol) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {credit > 0 ? formatCurrency(credit, currencySymbol) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={cn(
                                "font-black text-[9px] uppercase px-2 h-5",
                                net >= 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                            )}>
                                {net >= 0 ? `CREDIT: ${formatCurrency(net, currencySymbol)}` : `OWED: ${formatCurrency(Math.abs(net), currencySymbol)}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-tighter gap-1.5 border-primary/20 hover:bg-primary/5 text-primary" onClick={() => handleOpenDeposit(customer)}>
                                    <HandCoins className="h-3.5 w-3.5" /> Deposit
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-tighter gap-1.5" onClick={() => handleOpenHistory(customer)}>
                                    <History className="h-3.5 w-3.5" /> History
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-tighter gap-1.5 bg-primary/5 text-primary hover:bg-primary hover:text-white" asChild>
                                    <Link href={statementPath}>
                                        <FileText className="h-3.5 w-3.5" /> Statement
                                    </Link>
                                </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/5 gap-4">
                <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                    Page {currentPage} <span className="mx-2">|</span> {totalCustomerCount} Total Records
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchCustomers('prev')} disabled={currentPage === 1 || isLoadingCustomers} className="h-10 font-bold">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => fetchCustomers('next')} disabled={isLastPage || isLoadingCustomers} className="h-10 font-bold">
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <DepositAuditTab currencySymbol={currencySymbol} />
        </TabsContent>
      </Tabs>

      {selectedCustomerForDeposit && (
        <RecordDepositDialog
          isOpen={isDepositOpen}
          onOpenChange={setIsDepositOpen}
          customer={selectedCustomerForDeposit}
          currencySymbol={currencySymbol}
          onSuccess={handleDepositSuccess}
        />
      )}

      {selectedCustomerForHistory && (
        <CustomerDepositsModal
          isOpen={isHistoryOpen}
          onClose={() => { setIsHistoryOpen(false); setSelectedCustomerForHistory(null); }}
          customer={selectedCustomerForHistory}
          currencySymbol={currencySymbol}
          onViewReceipt={handleViewReceiptFromHistory}
        />
      )}

      {paymentReceiptInfo && (
        <CreditPaymentReceiptModal
            isOpen={isPaymentReceiptOpen}
            onClose={() => { setIsPaymentReceiptOpen(false); setPaymentReceiptInfo(null); }}
            paymentInfo={paymentReceiptInfo}
            currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}
