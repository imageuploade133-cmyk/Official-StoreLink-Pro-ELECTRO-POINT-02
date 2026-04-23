
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { 
  History, 
  Search, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Eye, 
  Printer, 
  RotateCcw,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Undo2,
  Filter,
  CheckCircle2,
  CreditCard,
  MoreHorizontal,
  ShoppingCart,
  Wallet,
  ChevronDown
} from "lucide-react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { useFirestore } from '@/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  limit, 
  orderBy, 
  startAfter, 
  endBefore, 
  limitToLast,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import type { SaleTransaction, StaffMember, CreditPaymentReceiptInfo } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { SaleDetailsModal } from '@/components/dialogs/sale-details-modal';
import { ReceiptModal } from '@/components/dialogs/receipt-modal';
import { ActionModal } from '@/components/dialogs/ActionModal';
import { SaleReturnDialog } from '@/components/dialogs/sale-return-dialog';
import { RecordPaymentDialog } from '@/components/dialogs/RecordPaymentDialog';
import { CreditPaymentReceiptModal } from '@/components/dialogs/credit-payment-receipt-modal';
import { formatCurrency } from '@/lib/formatUtils';
import { convertToDateSafely, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useSettings } from '@/contexts/settings-context';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

const ITEMS_PER_PAGE = 15;

type SalesTypeFilter = 'all' | 'sales' | 'credit' | 'refunds';

export default function MySalesHistoryPage() {
  const { user, staffMember, store, isAdmin, permissions, isLoading: isAuthLoading } = useAuth();
  const { settings } = useSettings();
  const firestore = useFirestore();
  const { toast } = useToast();
  const currencySymbol = settings?.currency || '$';

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<SalesTypeFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Pagination cursors using Refs to ensure stable fetchMySales
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [incomePeriod, setIncomePeriod] = useState<'today' | 'yesterday'>('today');
  const [incomeStats, setIncomeStats] = useState({ todayTotal: 0, yesterdayTotal: 0 });

  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<SaleTransaction | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<SaleTransaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedSaleForActions, setSelectedSaleForActions] = useState<SaleTransaction | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [saleForReturnRequest, setSaleForReturnRequest] = useState<SaleTransaction | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [saleForPayment, setSaleForPayment] = useState<SaleTransaction | null>(null);
  const [paymentReceiptInfo, setPaymentReceiptInfo] = useState<CreditPaymentReceiptInfo | null>(null);
  const [isPaymentReceiptOpen, setIsPaymentReceiptOpen] = useState(false);

  useEffect(() => {
    // Client-side initialization to avoid hydration mismatch
    setDateRange({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date())
    });
  }, []);

  const staffMap = useMemo(() => {
    const map = new Map<string, StaffMember>();
    if (user && staffMember) {
      map.set(user.uid, staffMember);
    } else if (isAdmin && user) {
      map.set(user.uid, {
        id: user.uid,
        uid: user.uid,
        name: user.displayName || user.email || 'Admin User',
        email: user.email || 'N/A',
        role: 'admin',
        status: 'Active',
        permissions: { pages: [] },
      } as any);
    }
    return map;
  }, [user, staffMember, isAdmin]);

  const fetchMySales = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !user || !dateRange?.from || !currentStoreId) return;
    setIsLoading(true);
    setError(null);

    try {
      let q = query(
        collection(firestore, "saleTransactions"),
        where("store_id", "==", currentStoreId),
        where("staffId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      // Server-side filtering
      if (dateRange?.from) q = query(q, where("createdAt", ">=", startOfDay(dateRange.from)));
      if (dateRange?.to) q = query(q, where("createdAt", "<=", endOfDay(dateRange.to)));

      if (activeTab === 'sales') q = query(q, where("isCreditSale", "==", false));
      else if (activeTab === 'credit') q = query(q, where("isCreditSale", "==", true));
      else if (activeTab === 'refunds') q = query(q, where("returnStatus", "in", ["partiallyReturned", "fullyReturned"]));

      // Pagination using refs
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
        firstDocRef.current = docs[0];
        lastDocRef.current = docs[docs.length - 1];
        setIsLastPage(docs.length < ITEMS_PER_PAGE);

        const salesData = docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertToDateSafely(doc.data().createdAt),
          grandTotal: doc.data().grandTotal || 0,
          returnedAmount: doc.data().returnedAmount || 0,
        } as SaleTransaction));

        setSales(salesData);
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') setSales([]);
        setIsLastPage(true);
      }
    } catch (e: any) {
      console.error("Error fetching my sales:", e);
      setError("Failed to load your sales history. Please check your network or Firestore indexes.");
    } finally {
      setIsLoading(false);
    }
  }, [firestore, user, currentStoreId, dateRange, activeTab]);

  // Fetch Income Stats (Limited query for dashboard accuracy)
  const fetchIncomeStats = useCallback(async () => {
    if (!firestore || !user || !currentStoreId) return;
    try {
      const todayStart = startOfDay(new Date());
      const yesterdayStart = startOfDay(subDays(new Date(), 1));
      const yesterdayEnd = endOfDay(subDays(new Date(), 1));

      const todayQuery = query(
        collection(firestore, "saleTransactions"),
        where("store_id", "==", currentStoreId),
        where("staffId", "==", user.uid),
        where("createdAt", ">=", todayStart)
      );

      const yesterdayQuery = query(
        collection(firestore, "saleTransactions"),
        where("store_id", "==", currentStoreId),
        where("staffId", "==", user.uid),
        where("createdAt", ">=", yesterdayStart),
        where("createdAt", "<=", yesterdayEnd)
      );

      const [todaySnap, yesterdaySnap] = await Promise.all([
        getDocs(todayQuery),
        getDocs(yesterdayQuery)
      ]);

      const todayTotal = todaySnap.docs.reduce((sum, d) => sum + ((d.data().grandTotal || 0) - (d.data().returnedAmount || 0)), 0);
      const yesterdayTotal = yesterdaySnap.docs.reduce((sum, d) => sum + ((d.data().grandTotal || 0) - (d.data().returnedAmount || 0)), 0);

      setIncomeStats({ todayTotal, yesterdayTotal });
    } catch (e) {
      console.error("Income stats error:", e);
    }
  }, [firestore, user, currentStoreId]);

  useEffect(() => {
    if (user && !isAuthLoading && dateRange?.from && currentStoreId) {
      fetchMySales('initial');
      fetchIncomeStats();
    }
  }, [user, isAuthLoading, currentStoreId, dateRange, activeTab, fetchMySales, fetchIncomeStats]);

  const filteredItemsForSearch = useMemo(() => {
    if (!searchTerm.trim()) return sales;
    const term = searchTerm.toLowerCase().trim();
    return sales.filter(s => 
      s.id.toLowerCase().includes(term) ||
      (s.customerName && s.customerName.toLowerCase().includes(term)) ||
      (s.paymentMethod && s.paymentMethod.toLowerCase().includes(term))
    );
  }, [sales, searchTerm]);

  const handleNextPage = () => fetchMySales('next');
  const handlePrevPage = () => fetchMySales('prev');

  const handleViewDetails = (sale: SaleTransaction) => {
    setSelectedSaleForDetails(sale);
    setIsDetailsModalOpen(true);
  };

  const handleReprint = (sale: SaleTransaction) => {
    setSelectedSaleForReprint(sale);
    setIsReceiptModalOpen(true);
  };

  const handleOpenActions = (sale: SaleTransaction) => {
    setSelectedSaleForActions(sale);
    setIsActionModalOpen(true);
  };

  const handleRecordPayment = (sale: SaleTransaction) => {
    setSaleForPayment(sale);
    setIsRecordPaymentOpen(true);
    setIsActionModalOpen(false);
  };

  const onPaymentSuccess = (args: { success: boolean; receiptInfo?: CreditPaymentReceiptInfo }) => {
    if (args.success && args.receiptInfo) {
        setPaymentReceiptInfo(args.receiptInfo);
        setIsPaymentReceiptOpen(true);
    }
    fetchMySales('initial');
  };

  const handleReturnSuccess = () => {
    fetchMySales('initial');
  };

  if (isAuthLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          icon={History}
          title="My Sales History"
          description="Incremental fetching active to save costs and improve performance."
        />
        <div className="flex items-center gap-2">
          {permissions.canAccessPOS && (
            <Button asChild variant="ghost" className="btn-back">
              <Link href="/pos">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Back to POS
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => fetchMySales('initial')} disabled={isLoading}>
            <RotateCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Sync Registry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-0 font-black uppercase tracking-widest text-[10px] text-primary hover:bg-transparent">
                  {incomePeriod === 'today' ? "Today's Income" : "Yesterday's Income"}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setIncomePeriod('today')}>Today's Income</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIncomePeriod('yesterday')}>Yesterday's Income</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {formatCurrency(incomePeriod === 'today' ? incomeStats.todayTotal : incomeStats.yesterdayTotal, currencySymbol)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Net Personal Earnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Volume in View</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales.length}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Transactions on current page</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Average Net</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {formatCurrency(sales.length > 0 ? sales.reduce((s, d) => s + (d.grandTotal - (d.returnedAmount || 0)), 0) / sales.length : 0, currencySymbol)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Per transaction in view</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Registry Mode</CardTitle>
            <Filter className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{activeTab}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Active filter strategy</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SalesTypeFilter)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="all" className="flex items-center gap-2">All Registry</TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">Standard Sales</TabsTrigger>
            <TabsTrigger value="credit" className="flex items-center gap-2">Credit Sales</TabsTrigger>
            <TabsTrigger value="refunds" className="flex items-center gap-2">Return Log</TabsTrigger>
        </TabsList>

        <Card className="mb-6">
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Local search in current set..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
                />
            </div>
            <Popover>
                <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal h-10", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                    dateRange.to ? (
                        <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                    ) : (
                        format(dateRange.from, "LLL dd, y")
                    )
                    ) : (
                    <span>Pick a date range</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
            </CardContent>
        </Card>

        <Card className="shadow-lg overflow-hidden border-none ring-1 ring-border">
            <CardContent className="p-0">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[120px]">Date & Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Net Total</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell>
                    </TableRow>
                    ))
                ) : error ? (
                    <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                        <AlertTriangle className="mx-auto h-10 w-10 text-destructive/30 mb-4" />
                        <p className="text-destructive font-medium">{error}</p>
                        <Button variant="link" onClick={() => fetchMySales('initial')}>Try reloading</Button>
                    </TableCell>
                    </TableRow>
                ) : filteredItemsForSearch.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center text-muted-foreground">
                        <History className="mx-auto h-16 w-16 opacity-10 mb-4" />
                        <p className="text-lg font-medium">No results found</p>
                        <p className="text-sm">Try adjusting your sync period or local search.</p>
                    </TableCell>
                    </TableRow>
                ) : (
                    filteredItemsForSearch.map((sale) => {
                    const saleDate = convertToDateSafely(sale.createdAt);
                    const net = (sale.grandTotal || 0) - (sale.returnedAmount || 0);
                    return (
                        <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell className="font-medium text-[10px] py-4">
                            <div className="font-bold">{saleDate ? format(saleDate, 'MMM dd, yyyy') : 'N/A'}</div>
                            <div className="text-muted-foreground">{saleDate ? format(saleDate, 'h:mm a') : ''}</div>
                        </TableCell>
                        <TableCell>
                            <div className="font-semibold text-sm truncate max-w-[180px]">{sale.customerName || 'Walk-in'}</div>
                            <div className="text-[10px] font-mono text-muted-foreground uppercase">#{sale.id.substring(0, 8)}</div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm">
                            {formatCurrency(net, currencySymbol)}
                        </TableCell>
                        <TableCell className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">{sale.paymentMethod}</TableCell>
                        <TableCell>
                            {sale.isCreditSale && !sale.isPaid ? (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-black uppercase px-2 py-0">Credit</Badge>
                            ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] font-black uppercase px-2 py-0">Paid</Badge>
                            )}
                            {sale.returnedAmount && sale.returnedAmount > 0 ? (
                                <Badge variant="destructive" className="ml-1 text-[9px] px-1 py-0 h-4">RET</Badge>
                            ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenActions(sale)}>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </TableCell>
                        </TableRow>
                    );
                    })
                )}
                </TableBody>
            </Table>
            </CardContent>
            <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/10 gap-4">
                <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                    Page {currentPage} <span className="mx-2">|</span> Personal Registry
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} className="font-bold">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={isLastPage || isLoading} className="font-bold">
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
      </Tabs>

      {/* Detail & Action Modals */}
      {selectedSaleForDetails && (
        <SaleDetailsModal
          isOpen={isDetailsModalOpen}
          onOpenChange={setIsDetailsModalOpen}
          saleTransaction={selectedSaleForDetails}
          currencySymbol={currencySymbol}
          staffMap={staffMap}
          onRecordPayment={(s) => handleRecordPayment(s)}
        />
      )}

      {selectedSaleForReprint && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setSelectedSaleForReprint(null)}
          saleTransaction={selectedSaleForReprint}
          staffMap={staffMap}
        />
      )}

      {selectedSaleForActions && (
        <ActionModal
          isOpen={isActionModalOpen}
          onOpenChange={setIsActionModalOpen}
          title={`Actions for Sale #${selectedSaleForActions.id.substring(0,8)}`}
        >
            <Button variant="outline" onClick={() => { handleViewDetails(selectedSaleForActions!); setIsActionModalOpen(false); }}>
                <Eye className="mr-2 h-4 w-4" /> View Details
            </Button>
            <Button variant="outline" onClick={() => { handleReprint(selectedSaleForActions!); setIsActionModalOpen(false); }}>
                <Printer className="mr-2 h-4 w-4" /> Reprint Receipt
            </Button>
            {selectedSaleForActions.isCreditSale && !selectedSaleForActions.isPaid && (
                <Button 
                    variant="outline" 
                    className="bg-primary/5 hover:bg-primary/10 border-primary/20"
                    onClick={() => handleRecordPayment(selectedSaleForActions!)}
                >
                    <Wallet className="mr-2 h-4 w-4 text-primary" /> Record Payment
                </Button>
            )}
            {permissions.canProcessReturns && selectedSaleForActions.returnStatus !== 'fullyReturned' && (
                <Button
                    variant="outline"
                    onClick={() => { setSaleForReturnRequest(selectedSaleForActions!); setIsReturnModalOpen(true); setIsActionModalOpen(false); }}
                    className="text-orange-600 border-orange-400 hover:bg-orange-100"
                >
                    <Undo2 className="mr-2 h-4 w-4" /> Return Items
                </Button>
            )}
        </ActionModal>
      )}

      {saleForReturnRequest && user && settings && (
        <SaleReturnDialog
          isOpen={isReturnModalOpen}
          onOpenChange={setIsReturnModalOpen}
          saleTransaction={saleForReturnRequest}
          currencySymbol={currencySymbol}
          onReturnSuccess={handleReturnSuccess}
        />
      )}

      {saleForPayment && (
        <RecordPaymentDialog
            isOpen={isRecordPaymentOpen}
            onClose={() => { setIsRecordPaymentOpen(false); setSaleForPayment(null); }}
            sale={saleForPayment}
            customerId={saleForPayment.customerId || ''}
            onPaymentRecorded={onPaymentSuccess}
            currencySymbol={currencySymbol}
            staffMap={staffMap}
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
