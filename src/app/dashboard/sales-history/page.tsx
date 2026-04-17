
'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  MoreHorizontal, 
  AlertTriangle, 
  Info, 
  RotateCcw, 
  DollarSign, 
  Users, 
  BarChart3, 
  Filter, 
  Printer, 
  ChevronLeft, 
  ChevronRight, 
  Search as SearchIcon, 
  Calendar as CalendarIcon, 
  XCircle, 
  Undo2, 
  CheckCircle2, 
  Clock, 
  Eye, 
  UserCircle,
  Wallet,
  Loader2,
  ShoppingBag,
  TrendingUp,
  ChevronDown,
  X,
  History,
  CreditCard
} from "lucide-react";
import { format, startOfDay as dfnsStartOfDay, endOfDay as dfnsEndOfDay, isBefore, subDays } from "date-fns";
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where, 
  limit, 
  startAfter, 
  endBefore, 
  limitToLast,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore'; 
import type { SaleTransaction, StaffMember, CreditPaymentReceiptInfo } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { SaleDetailsModal } from '@/components/dialogs/sale-details-modal';
import { ReceiptModal } from '@/components/dialogs/receipt-modal';
import { SaleReturnDialog } from '@/components/dialogs/sale-return-dialog';
import { RecordPaymentDialog } from '@/components/dialogs/RecordPaymentDialog';
import { CreditPaymentReceiptModal } from '@/components/dialogs/credit-payment-receipt-modal';
import { cn, convertToDateSafely } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettings } from '@/contexts/settings-context';
import { StaffSalesModal } from '@/components/sales-history/staff-sales-modal';
import type { DateRange } from 'react-day-picker';
import { ActionModal } from '@/components/dialogs/ActionModal';
import { StatCard } from '@/components/StatCard';


type SalesFilterTab = 'all' | 'paid' | 'credit' | 'outstanding' | 'returns';
const ITEMS_PER_PAGE = 20;

function SalesHistoryContent() {
  const { settings, isLoading: isLoadingSettings } = useSettings();
  const { user, staffMember, store, isLoading: isAuthLoading, isAdmin, permissions } = useAuth();
  const currencySymbol = settings?.currency || '$';
  const firestore = useFirestore();

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const searchParams = useSearchParams();
  const initialSearchTerm = searchParams.get('search') || '';
  
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [staffMap, setStaffMap] = useState<Map<string, StaffMember>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<SalesFilterTab>('all');
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [activePreset, setActivePreset] = React.useState<'last7' | 'last30' | 'custom'>('last30');

  // Pagination cursors
  const [firstDoc, setFirstDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [isLastPage, setIsLastPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Period Analytics State
  const [periodAnalytics, setPeriodAnalytics] = useState({
    netRevenue: 0,
    volume: 0,
    refunds: 0,
    isLoading: true
  });

  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<SaleTransaction | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<SaleTransaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [saleForReturnRequest, setSaleForReturnRequest] = useState<SaleTransaction | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedSaleForActions, setSelectedSaleForActions] = useState<SaleTransaction | null>(null);
  
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [saleForPayment, setSaleForPayment] = useState<SaleTransaction | null>(null);
  const [paymentReceiptInfo, setPaymentReceiptInfo] = useState<CreditPaymentReceiptInfo | null>(null);
  const [isPaymentReceiptOpen, setIsPaymentReceiptOpen] = useState(false);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setHasMounted(true);
    const now = new Date();
    setToday(now);
    setDateRange({
      from: dfnsStartOfDay(subDays(now, 29)),
      to: dfnsEndOfDay(now),
    });
  }, []);
  
  const { toast } = useToast();
  
  const canModify = isAdmin || staffMember?.role === 'manager';

  const fetchPeriodAnalytics = useCallback(async (currentRange: DateRange | undefined, tab: SalesFilterTab) => {
    if (!firestore || !currentRange?.from || !currentStoreId) return;
    setPeriodAnalytics(prev => ({ ...prev, isLoading: true }));

    try {
        const salesCol = collection(firestore, "saleTransactions");
        let q = query(salesCol, where("store_id", "==", currentStoreId), orderBy("createdAt", "desc"));

        if (currentRange.from) q = query(q, where("createdAt", ">=", dfnsStartOfDay(currentRange.from)));
        if (currentRange.to) q = query(q, where("createdAt", "<=", dfnsEndOfDay(currentRange.to)));

        if (tab === 'paid') q = query(q, where("isPaid", "==", true));
        else if (tab === 'credit') q = query(q, where("isCreditSale", "==", true));
        else if (tab === 'outstanding') q = query(q, where("isCreditSale", "==", true), where("isPaid", "==", false));
        else if (tab === 'returns') q = query(q, where("returnStatus", "in", ['partiallyReturned', 'fullyReturned']));

        const countSnap = await getCountFromServer(q);
        
        // Fetch items for revenue sum calculation (limited to save reads)
        const summarySnap = await getDocs(query(q, limit(1000)));
        let revenue = 0;
        let refunds = 0;

        summarySnap.docs.forEach(doc => {
            const data = doc.data();
            revenue += (data.grandTotal || 0) - (data.returnedAmount || 0);
            refunds += (data.returnedAmount || 0);
        });

        setPeriodAnalytics({
            revenue,
            volume: countSnap.data().count,
            refunds,
            isLoading: false
        });
    } catch (e) {
        console.error("Analytics fetch error:", e);
        setPeriodAnalytics(prev => ({ ...prev, isLoading: false }));
    }
  }, [firestore, currentStoreId]);

  const fetchSales = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !dateRange?.from || !user || !currentStoreId) return;
    
    setIsLoading(true);
    setError(null);

    try {
        // Fetch staff first for mapping (only if map is empty)
        if (staffMap.size === 0) {
            const staffQuery = query(collection(firestore, "staff"), where("store_id", "==", currentStoreId));
            const staffSnapshot = await getDocs(staffQuery);
            const staffDataMap = new Map<string, StaffMember>();
            staffSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const s: StaffMember = { id: doc.id, uid: data.uid || doc.id, ...data } as StaffMember;
                staffDataMap.set(s.uid, s);
                if (doc.id !== data.uid) staffDataMap.set(doc.id, s);
            });
            if (user && !staffDataMap.has(user.uid)) {
                staffDataMap.set(user.uid, {
                    id: user.uid, uid: user.uid, name: user.displayName || user.email || 'Admin',
                    email: user.email || 'N/A', role: 'admin', status: 'Active',
                    permissions: { pages: [], branches: [] },
                    store_id: currentStoreId
                } as any);
            }
            setStaffMap(staffDataMap);
        }

        const salesCol = collection(firestore, "saleTransactions");
        let q = query(salesCol, where("store_id", "==", currentStoreId), orderBy("createdAt", "desc"));

        // Server-side filtering
        if (dateRange?.from) q = query(q, where("createdAt", ">=", dfnsStartOfDay(dateRange.from)));
        if (dateRange?.to) q = query(q, where("createdAt", "<=", dfnsEndOfDay(dateRange.to)));

        if (activeTab === 'paid') q = query(q, where("isPaid", "==", true));
        else if (activeTab === 'credit') q = query(q, where("isCreditSale", "==", true));
        else if (activeTab === 'outstanding') {
            q = query(q, where("isCreditSale", "==", true), where("isPaid", "==", false));
        } else if (activeTab === 'returns') {
            q = query(q, where("returnStatus", "in", ['partiallyReturned', 'fullyReturned']));
        }

        // Apply Cursor for "Infinity" saving reads
        if (direction === 'next' && lastDoc) {
            q = query(q, startAfter(lastDoc), limit(ITEMS_PER_PAGE));
        } else if (direction === 'prev' && firstDoc) {
            q = query(q, endBefore(firstDoc), limitToLast(ITEMS_PER_PAGE));
        } else {
            q = query(q, limit(ITEMS_PER_PAGE));
        }

        const snapshot = await getDocs(q);
        const docs = snapshot.docs;

        if (docs.length > 0) {
            setFirstDoc(docs[0]);
            setLastDoc(docs[docs.length - 1]);
            setIsLastPage(docs.length < ITEMS_PER_PAGE);

            const salesList = docs.map(docSnapshot => {
                const data = docSnapshot.data();
                return {
                    id: docSnapshot.id, ...data,
                    createdAt: convertToDateSafely(data.createdAt), 
                    updatedAt: convertToDateSafely(data.updatedAt),
                    dueDate: convertToDateSafely(data.dueDate), 
                    isPaid: data.isPaid ?? (data.isCreditSale ? false : true),
                    isCreditSale: data.isCreditSale ?? false, 
                    grandTotal: data.grandTotal ?? 0,
                    amountPaidTowardsCredit: data.amountPaidTowardsCredit ?? 0, 
                    returnedAmount: data.returnedAmount || 0,
                    paymentHistory: (data.paymentHistory || []).map((ph: any) => ({
                        ...ph,
                        paymentDate: convertToDateSafely(ph.paymentDate),
                    })),
                    returns: (data.returns || []),
                    paymentDetails: data.paymentDetails || null,
                } as SaleTransaction;
            });

            setSales(salesList);
            if (direction === 'next') setCurrentPage(p => p + 1);
            else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
            else setCurrentPage(1);
        } else {
            if (direction === 'initial') {
                setSales([]);
                setIsLastPage(true);
            } else if (direction === 'next') {
                setIsLastPage(true);
            }
        }
        
    } catch (e: any) {
        console.error("Error fetching sales history:", e);
        setError("Failed to load sales history. You may need to create a Firestore index if applying multiple filters.");
    } finally {
        setIsLoading(false);
    }
  }, [firestore, dateRange, user, currentStoreId, activeTab, firstDoc, lastDoc, staffMap.size]);

  useEffect(() => {
    if (user && !isAuthLoading && firestore && dateRange?.from && currentStoreId) {
      fetchSales('initial');
      fetchPeriodAnalytics(dateRange, activeTab);
    }
  }, [user, isAuthLoading, firestore, currentStoreId, dateRange, activeTab]);

  const handlePrevPage = () => fetchSales('prev');
  const handleNextPage = () => fetchSales('next');

  const clearFilters = () => {
    setSearchTerm('');
    const now = new Date();
    setDateRange({ from: dfnsStartOfDay(subDays(now, 29)), to: dfnsEndOfDay(now) });
    setActivePreset('last30');
    setActiveTab('all');
  };
  
  const getSaleStatusInfo = useCallback((sale: SaleTransaction): { text: string; icon: React.ElementType; colorClasses: string; tooltip: string; } => {
    if (sale.isPaid || ((sale.grandTotal || 0) - (sale.amountPaidTowardsCredit || 0) - (sale.returnedAmount || 0)) <= 0.001) return { text: "Paid", icon: CheckCircle2, colorClasses: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', tooltip: 'This sale has been fully paid.'};
    const saleDueDate = convertToDateSafely(sale.dueDate);
    if (hasMounted && today && saleDueDate && isBefore(dfnsStartOfDay(saleDueDate), dfnsStartOfDay(today))) return { text: `Overdue`, icon: AlertTriangle, colorClasses: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', tooltip: `Payment was due on ${format(saleDueDate, 'PP')}`};
    return {text: saleDueDate ? `Due ${format(saleDueDate, 'PP')}` : "Outstanding", icon: Clock, colorClasses: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', tooltip: `Payment due on ${saleDueDate ? format(saleDueDate, 'PP') : 'N/A'}`};
  }, [today, hasMounted]);
  
  const handleViewDetails = (sale: SaleTransaction) => { setSelectedSaleForDetails(sale); setIsDetailsModalOpen(true); };
  const handleReprintReceipt = (sale: SaleTransaction) => { setSelectedSaleForReprint(sale); setIsReceiptModalOpen(true); };
  const handleReturnSuccess = () => { fetchSales('initial'); };

  const handleOpenActionsModal = (sale: SaleTransaction) => {
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
    fetchSales('initial');
  };
  
  const getDateRangeTitle = () => {
    if (!dateRange?.from) return "for all time";
    const fromStr = format(dateRange.from, "MMM dd, yyyy");
    const toStr = dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy");
    if (fromStr === toStr) return `for ${toStr}`;
    return `from ${fromStr} to ${toStr}`;
  };

  const handleDatePresetChange = (preset: 'last7' | 'last30') => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === 'last7') {
      setDateRange({ from: dfnsStartOfDay(subDays(now, 6)), to: dfnsEndOfDay(now) });
    } else if (preset === 'last30') {
      setDateRange({ from: dfnsStartOfDay(subDays(now, 29)), to: dfnsEndOfDay(now) });
    }
  };

  const handleCustomDateChange = (newDate: DateRange | undefined) => {
    setDateRange(newDate);
    setActivePreset('custom');
  };

  const filteredItemsForSearch = useMemo(() => {
    if (!searchTerm.trim()) return sales;
    const term = searchTerm.toLowerCase().trim();
    return sales.filter(s => 
      s.id.toLowerCase().includes(term) ||
      (s.customerName && s.customerName.toLowerCase().includes(term)) ||
      (s.paymentMethod && s.paymentMethod.toLowerCase().includes(term))
    );
  }, [sales, searchTerm]);

  if (isAuthLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PageHeader
            icon={BarChart3}
            title="Sales History"
            description="Manage and audit all business transactions. Incremental batching active."
        />
        <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setIsStaffModalOpen(true)}>
                <Users className="mr-2 h-4 w-4" /> Staff Audit
            </Button>
            <Button variant="outline" onClick={() => { fetchSales('initial'); fetchPeriodAnalytics(dateRange, activeTab); }} disabled={isLoading || periodAnalytics.isLoading}>
                <RotateCcw className={cn("mr-2 h-4 w-4", (isLoading || periodAnalytics.isLoading) && "animate-spin")} />
                Sync Hub
            </Button>
        </div>
      </div>

      {/* Period Analytics Command Center */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
            title="Net Period Revenue"
            value={periodAnalytics.isLoading ? '...' : formatCurrency(periodAnalytics.revenue, currencySymbol)}
            icon={TrendingUp}
            description={getDateRangeTitle()}
            className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100"
            valueClassName="text-indigo-600 font-black"
        />
        <StatCard
            title="Transaction Volume"
            value={periodAnalytics.isLoading ? '...' : periodAnalytics.volume.toLocaleString()}
            icon={ShoppingBag}
            description="Successful sales in batch"
            className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100"
            valueClassName="text-emerald-600 font-black"
        />
        <StatCard
            title="Average Sale Value"
            value={periodAnalytics.isLoading ? '...' : formatCurrency(periodAnalytics.volume > 0 ? periodAnalytics.revenue / periodAnalytics.volume : 0, currencySymbol)}
            icon={DollarSign}
            description="Mean value per record"
            className="bg-blue-50 dark:bg-blue-950/20 border-blue-100"
            valueClassName="text-blue-600 font-black"
        />
        <StatCard
            title="Refund Attrition"
            value={periodAnalytics.isLoading ? '...' : formatCurrency(periodAnalytics.refunds, currencySymbol)}
            icon={Undo2}
            description="Value of returned items"
            className="bg-rose-50 dark:bg-rose-950/20 border-rose-100"
            valueClassName="text-rose-600 font-black"
        />
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="font-headline text-xl flex items-center">
                    <Filter className="mr-2 h-5 w-5 text-primary"/> Registry Filters
                </CardTitle>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={clearFilters} size="sm" className="h-8">
                        <X className="mr-2 h-4 w-4" /> Reset Filters
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input 
                        type="search" 
                        placeholder="Search ID, Customer, Method..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-10 h-10 w-full"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-10", !dateRange && "text-muted-foreground", activePreset === 'custom' && "border-primary ring-1 ring-primary")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Date Range</span>)}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <div className="p-3 border-b space-y-3">
                                <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                                    <Button variant={activePreset === 'last7' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 text-xs flex-1" onClick={() => handleDatePresetChange('last7')}>7D</Button>
                                    <Button variant={activePreset === 'last30' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 text-xs flex-1" onClick={() => handleDatePresetChange('last30')}>30D</Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text font-black uppercase text-muted-foreground">From</Label>
                                        <Input type="date" className="h-8 text-xs" value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''} onChange={(e) => handleCustomDateChange({ ...dateRange, from: e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text font-black uppercase text-muted-foreground">To</Label>
                                        <Input type="date" className="h-8 text-xs" value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''} onChange={(e) => handleCustomDateChange({ ...dateRange, to: e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined })} />
                                    </div>
                                </div>
                            </div>
                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={handleCustomDateChange} numberOfMonths={2} />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SalesFilterTab)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="paid">Paid</TabsTrigger>
                    <TabsTrigger value="credit">Credit</TabsTrigger>
                    <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
                    <TabsTrigger value="returns"><Undo2 className="mr-1.5 h-4 w-4" /> Returns</TabsTrigger>
                </TabsList>
            </Tabs>
        </CardContent>
    </Card>

      <Card className=" overflow-hidden border-none ring-1 ring-border">
        <CardContent className="p-0">
          <ScrollArea className="h"> 
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 ">
                <TableRow>
                    <TableHead className="w">Sale ID</TableHead>
                    <TableHead className="w">Date & Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-right w">Net Total</TableHead>
                    <TableHead className="w">Payment</TableHead>
                    <TableHead className="w">Status</TableHead>
                    <TableHead className="w text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(ITEMS_PER_PAGE)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                        <AlertTriangle className="mx-auto h-10 w-10 text-destructive/30 mb-4" />
                        <p className="text-destructive font-medium">{error}</p>
                        <Button variant="link" onClick={() => fetchSales('initial')}>Try reloading</Button>
                    </TableCell>
                  </TableRow>
                ) : filteredItemsForSearch.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-64 text-center text-muted-foreground">
                      <History className="mx-auto h-16 w-16 opacity-10 mb-4" />
                      <p className="text-lg font-bold">No results found</p>
                      <p className="text-sm">Try adjusting your filters or sync period.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItemsForSearch.map((sale) => {
                    const statusInfo = getSaleStatusInfo(sale);
                    const IconComponent = statusInfo.icon;
                    const netTotal = (sale.grandTotal || 0) - (sale.returnedAmount || 0);
                    const saleDate = convertToDateSafely(sale.createdAt);
                    const processedByStaff = staffMap.get(sale.staffId);
                    
                    return (
                      <TableRow key={sale.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell className="font-mono text font-bold text-primary">#{sale.id.substring(0, 8).toUpperCase()}</TableCell>
                        <TableCell className="text py-4">
                          <div className="font-black">{saleDate ? format(saleDate, 'MMM dd, yyyy') : 'N/A'}</div>
                          <div className="text-muted-foreground font-medium">{saleDate ? format(saleDate, 'h:mm a') : ''}</div>
                        </TableCell>
                        <TableCell className="text-sm truncate max-w" title={sale.customerName || 'N/A'}>
                            <p className="font-bold leading-none">{sale.customerName || 'Walk-in'}</p>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5" title={processedByStaff?.name || sale.staffId}>
                            <UserCircle className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w font-medium">{processedByStaff?.name || 'Admin'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-black text-sm">
                          <div className="flex flex-col items-end">
                            {formatCurrency(netTotal, currencySymbol)}
                            {sale.returnedAmount && sale.returnedAmount > 0 ? (
                                <span className="text text-orange-600 font-bold uppercase tracking-tighter">Refunded: {formatCurrency(sale.returnedAmount, currencySymbol)}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text font-bold uppercase tracking-widest text-muted-foreground">{sale.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge variant={"outline"} className={cn("text font-black uppercase", statusInfo.colorClasses)}>
                            <IconComponent className="mr-1 h-3 w-3" />{statusInfo.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenActionsModal(sale)}>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="py-4 border-t flex flex-col sm:flex-row sm:justify-between items-center bg-muted/10 gap-4">
            <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                Page {currentPage} <span className="mx-2">|</span> Registry Batching
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
            onClose={() => setIsReceiptModalOpen(false)}
            saleTransaction={selectedSaleForReprint}
            staffMap={staffMap}
        />
      )}
      
      {selectedSaleForActions && (
        <ActionModal
          isOpen={isActionModalOpen}
          onOpenChange={setIsActionModalOpen}
          title={`Sale #${selectedSaleForActions.id.substring(0,8)}`}
          description={selectedSaleForActions.customerName || 'Transaction Actions'}
        >
            <Button variant="outline" className="justify-start h-11" onClick={() => { handleViewDetails(selectedSaleForActions!); setIsActionModalOpen(false); }}>
                <Eye className="mr-2 h-4 w-4" /> View Details
            </Button>
            <Button variant="outline" className="justify-start h-11" onClick={() => { handleReprintReceipt(selectedSaleForActions!); setIsActionModalOpen(false); }}>
                <Printer className="mr-2 h-4 w-4" /> Print Receipt
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
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
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

      {isStaffModalOpen && (
          <StaffSalesModal
            isOpen={isStaffModalOpen}
            onOpenChange={setIsStaffModalOpen}
            allSales={sales}
            staffMap={staffMap}
            currencySymbol={currencySymbol}
          />
      )}
    </div>
  );
}

export default function SalesHistoryPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
        <SalesHistoryContent />
    </Suspense>
  );
}
