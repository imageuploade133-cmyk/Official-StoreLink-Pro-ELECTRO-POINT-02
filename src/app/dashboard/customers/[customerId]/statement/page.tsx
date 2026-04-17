'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFirestore, useDoc } from '@/firebase';
import { 
  doc, 
  query, 
  collection, 
  where, 
  getDocs, 
  orderBy, 
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
  FileText, 
  Printer, 
  Download, 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Search, 
  History,
  Wallet,
  X,
  AlertTriangle,
  Receipt,
  Store,
  DollarSign,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSettings } from '@/contexts/settings-context';
import { formatCurrency } from '@/lib/formatUtils';
import { convertToDateSafely, cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import type { Customer, SaleTransaction, CreditPayment, StaffMember, CreditPaymentReceiptInfo } from '@/lib/types';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/contexts/auth-context';
import { RecordPaymentDialog } from '@/components/dialogs/RecordPaymentDialog';
import { CreditPaymentReceiptModal } from '@/components/dialogs/credit-payment-receipt-modal';

interface LedgerEntry {
  id: string;
  date: Date;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  type: 'sale' | 'payment' | 'refund';
  status?: string;
  isCreditSale?: boolean;
  originalSale?: SaleTransaction;
}

const ITEMS_PER_PAGE = 20;

export default function CustomerStatementPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { user: authUser, staffMember: currentStaff } = useAuth();
  const customerId = params.customerId as string;
  const currencySymbol = settings?.currency || '$';

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalSalesInDb, setTotalSalesInDb] = useState(0);
  const [totalPaymentsInDb, setTotalPaymentsInDb] = useState(0);
  const [paginatedSales, setPaginatedSales] = useState<SaleTransaction[]>([]);
  const [paginatedPayments, setPaginatedPayments] = useState<CreditPayment[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(true);

  // Stable cursors
  const salesFirstDoc = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const salesLastDoc = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const paymentsFirstDoc = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const paymentsLastDoc = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Payment Dialog States
  const [saleForPayment, setSaleForPayment] = useState<SaleTransaction | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentReceiptInfo, setPaymentReceiptInfo] = useState<CreditPaymentReceiptInfo | null>(null);
  const [isPaymentReceiptOpen, setIsPaymentReceiptOpen] = useState(false);

  // Fetch Core Data
  const customerRef = useMemo(() => firestore ? doc(firestore, 'customers', customerId) : null, [firestore, customerId]);
  const { data: customer, isLoading: isLoadingCustomer } = useDoc<Customer>(customerRef);

  const fetchLedgerData = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !customerId) return;
    setIsLoadingLedger(true);

    try {
      let salesQ = query(
        collection(firestore, 'saleTransactions'),
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc')
      );

      let paymentsQ = query(
        collection(firestore, 'creditPayments'),
        where('customerId', '==', customerId),
        orderBy('paymentDate', 'desc')
      );

      // Apply date filters to server queries if possible
      if (dateRange?.from) {
        salesQ = query(salesQ, where('createdAt', '>=', startOfDay(dateRange.from)));
        paymentsQ = query(paymentsQ, where('paymentDate', '>=', startOfDay(dateRange.from)));
        if (dateRange.to) {
          salesQ = query(salesQ, where('createdAt', '<=', endOfDay(dateRange.to)));
          paymentsQ = query(paymentsQ, where('paymentDate', '<=', endOfDay(dateRange.to)));
        }
      }

      // Initial counts
      if (direction === 'initial') {
        const [sCount, pCount] = await Promise.all([
          getCountFromServer(salesQ),
          getCountFromServer(paymentsQ)
        ]);
        setTotalSalesInDb(sCount.data().count);
        setTotalPaymentsInDb(pCount.data().count);
      }

      // Apply cursors
      let activeSalesQ = salesQ;
      let activePaymentsQ = paymentsQ;

      if (direction === 'next') {
        if (salesLastDoc.current) activeSalesQ = query(salesQ, startAfter(salesLastDoc.current), limit(ITEMS_PER_PAGE));
        if (paymentsLastDoc.current) activePaymentsQ = query(paymentsQ, startAfter(paymentsLastDoc.current), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev') {
        if (salesFirstDoc.current) activeSalesQ = query(salesQ, endBefore(salesFirstDoc.current), limitToLast(ITEMS_PER_PAGE));
        if (paymentsFirstDoc.current) activePaymentsQ = query(paymentsQ, endBefore(paymentsFirstDoc.current), limitToLast(ITEMS_PER_PAGE));
      } else {
        activeSalesQ = query(salesQ, limit(ITEMS_PER_PAGE));
        activePaymentsQ = query(paymentsQ, limit(ITEMS_PER_PAGE));
      }

      const [sSnap, pSnap] = await Promise.all([
        getDocs(activeSalesQ),
        getDocs(activePaymentsQ)
      ]);

      const sDocs = sSnap.docs;
      const pDocs = pSnap.docs;

      if (sDocs.length > 0 || pDocs.length > 0) {
        if (sDocs.length > 0) {
          salesFirstDoc.current = sDocs[0];
          salesLastDoc.current = sDocs[sDocs.length - 1];
        }
        if (pDocs.length > 0) {
          paymentsFirstDoc.current = pDocs[0];
          paymentsLastDoc.current = pDocs[pDocs.length - 1];
        }

        setPaginatedSales(sDocs.map(d => ({ id: d.id, ...d.data() } as SaleTransaction)));
        setPaginatedPayments(pDocs.map(d => ({ id: d.id, ...d.data() } as CreditPayment)));
        
        setIsLastPage(sDocs.length < ITEMS_PER_PAGE && pDocs.length < ITEMS_PER_PAGE);

        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setPaginatedSales([]);
          setPaginatedPayments([]);
          setIsLastPage(true);
        }
      }
    } catch (e: any) {
      console.error("Error fetching ledger data:", e);
    } finally {
      setIsLoadingLedger(false);
    }
  }, [firestore, customerId, dateRange]);

  useEffect(() => {
    if (firestore && customerId) {
      fetchLedgerData('initial');
    }
  }, [firestore, customerId, dateRange, fetchLedgerData]);

  // Build the Ledger from paginated chunks
  const ledger = useMemo(() => {
    const entries: LedgerEntry[] = [];

    // Add Sales
    for (const sale of paginatedSales) {
      const date = convertToDateSafely(sale.createdAt);
      if (date) {
        const creditValue = !sale.isCreditSale 
            ? (sale.grandTotal || 0) 
            : (sale.initialPaymentMadeAtTimeOfSale || 0);

        entries.push({
          id: sale.id,
          date,
          description: sale.items?.map(i => i.productName).join(', ') || 'POS Sale',
          reference: `POS #${sale.id.substring(0, 8).toUpperCase()}`,
          debit: sale.grandTotal || 0,
          credit: creditValue,
          type: 'sale',
          isCreditSale: sale.isCreditSale,
          status: sale.isPaid ? 'Settled' : 'Unpaid',
          originalSale: sale
        });

        if (sale.returnedAmount && sale.returnedAmount > 0) {
          entries.push({
            id: `ret-${sale.id}`,
            date: convertToDateSafely(sale.updatedAt) || date,
            description: 'Returned Items Refund',
            reference: `RET #${sale.id.substring(0, 8).toUpperCase()}`,
            debit: 0,
            credit: sale.returnedAmount,
            type: 'refund'
          });
        }
      }
    }

    // Add Payments
    for (const payment of paginatedPayments) {
      const date = convertToDateSafely(payment.paymentDate);
      if (date) {
        entries.push({
          id: payment.id,
          date,
          description: payment.isDeposit ? `Flexible Account Deposit - ${payment.paymentMethod}` : `Credit Settlement - ${payment.paymentMethod}`,
          reference: `RCPT #${payment.id.substring(0, 8).toUpperCase()}`,
          debit: 0,
          credit: payment.amount || 0,
          type: 'payment'
        });
      }
    }

    return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [paginatedSales, paginatedPayments]);

  const filteredLedger = useMemo(() => {
    if (!searchTerm.trim()) return ledger;
    const term = searchTerm.toLowerCase();
    return ledger.filter(e => 
      e.description.toLowerCase().includes(term) || 
      e.reference.toLowerCase().includes(term)
    );
  }, [ledger, searchTerm]);

  const isLoading = isLoadingCustomer || isLoadingLedger;

  const staffMap = useMemo(() => {
    const map = new Map<string, StaffMember>();
    if (authUser && !map.has(authUser.uid)) {
        map.set(authUser.uid, (currentStaff || { 
            id: authUser.uid,
            uid: authUser.uid,
            name: authUser.displayName || authUser.email || 'Admin',
            email: authUser.email || '' 
        }) as any);
    }
    return map;
  }, [authUser, currentStaff]);

  const handlePrint = () => window.print();

  const handleRecordPayment = (sale: SaleTransaction) => {
    setSaleForPayment(sale);
    setIsRecordPaymentOpen(true);
  };

  const onPaymentSuccess = (args: { success: boolean; receiptInfo?: CreditPaymentReceiptInfo }) => {
    if (args.success && args.receiptInfo) {
        setPaymentReceiptInfo(args.receiptInfo);
        setIsPaymentReceiptOpen(true);
    }
    fetchLedgerData('initial');
  };

  if (isLoading && ledger.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader icon={FileText} title="Statement of Account" description="Syncing ledger..." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
        </div>
        <Card><CardContent className="pt-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!customer && !isLoadingCustomer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="bg-red-100 p-4 rounded-full text-red-600"><X className="h-8 w-8" /></div>
        <h2 className="text-2xl font-bold">Customer Not Found</h2>
        <Button onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="no-print -mb-4">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Button>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b-2 border-primary/10">
        <div className="flex items-center gap-4">
          <div className="bg-primary p-3 rounded-xl  shadow-primary/20 flex items-center justify-center overflow-hidden w-16 h-16">
            {settings?.invoiceLogoUrl ? (
              <div className="relative w-full h-full">
                <Image 
                  src={settings.invoiceLogoUrl} 
                  alt={settings.storeName || 'Store Logo'} 
                  fill 
                  className="object-contain"
                />
              </div>
            ) : (
              <Store className="text-white h-8 w-8" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-primary uppercase">{settings?.storeName || 'StoreLink Pro'}</h1>
            <p className="text-sm font-semibold text-slate-500">Official Account Summary</p>
          </div>
        </div>
        <div className="flex flex-col md:items-end">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Statement of Account</h2>
          <div className="flex items-center gap-2 mt-2 text-sm font-medium text-slate-500">
            <CalendarIcon className="h-4 w-4" />
            <span>Period: {dateRange?.from ? format(dateRange.from, 'MMM dd, yyyy') : 'Start'} - {dateRange?.to ? format(dateRange.to, 'MMM dd, yyyy') : 'Current'}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 no-print bg-white dark:bg-slate-800 p-4 rounded-xl border ">
        <div className="flex items-center gap-4 flex-grow">
            <div className="relative flex-grow max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search references..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-11" />
            </div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 h-11">
                        <CalendarIcon className="h-4 w-4" />
                        Date Filter
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus />
                </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => fetchLedgerData('initial')} disabled={isLoading}>
                <RotateCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2 font-bold h-11">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 gap-2 font-bold  shadow-primary/20 h-11">
            <Download className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 border-slate-400  ring-1 ring-black/5">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gross Sales</p>
            <Receipt className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-2xl font-black tracking-tighter">{formatCurrency(customer?.totalSpent || 0, currencySymbol)}</p>
          <p className="text-[9px] text-slate-400 font-medium mt-2 uppercase">Lifetime Purchases</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 border-emerald-500  ring-1 ring-black/5">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Account Credit</p>
            <PiggyBank className="h-5 w-5 text-emerald-500/40" />
          </div>
          <p className="text-2xl font-black tracking-tighter text-emerald-600">{formatCurrency(customer?.creditBalance || 0, currencySymbol)}</p>
          <p className="text-[9px] text-slate-400 font-medium mt-2 uppercase">Unallocated Deposits</p>
        </div>

        <div className={cn("p-6 rounded-xl border-l-4  ring-1 ring-black/5", (customer?.outstandingCredit || 0) > 0.01 ? "bg-red-50 dark:bg-red-950/20 border-red-500" : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500")}>
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Outstanding Debt</p>
            <AlertTriangle className="h-5 w-5 text-red-500/40" />
          </div>
          <p className={cn("text-2xl font-black tracking-tighter", (customer?.outstandingCredit || 0) > 0.01 ? "text-red-600" : "text-emerald-600")}>
            {(customer?.outstandingCredit || 0) <= 0.01 ? "CLEARED" : formatCurrency(customer?.outstandingCredit || 0, currencySymbol)}
          </p>
          <p className="text-[9px] font-bold mt-2 uppercase">Active Pay-Small-Small</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border-l-4 border-primary  ring-1 ring-black/5">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sync Metrics</p>
            <History className="h-5 w-5 text-primary/40" />
          </div>
          <p className="text-2xl font-black tracking-tighter text-primary">BATCH {currentPage}</p>
          <p className="text-[9px] text-slate-400 font-medium mt-2 uppercase">Page {currentPage} of Ledger</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Transactional Ledger
        </h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700  bg-white dark:bg-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ref ID</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Description</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Type</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Debit (+)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Credit (-)</TableHead>
                <TableHead className="no-print text-center w-[100px] text-[10px] font-black uppercase text-slate-500 tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLedger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" /> : (
                        <>
                            <History className="h-12 w-12 mx-auto mb-4 opacity-10" />
                            No transactions found for this period.
                        </>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLedger.map((entry) => {
                  const showPayButton = entry.type === 'sale' && entry.isCreditSale && entry.originalSale && !entry.originalSale.isPaid;
                  
                  return (
                    <TableRow key={entry.id} className="hover:bg-primary/5 transition-colors group">
                      <TableCell className="text-xs font-bold whitespace-nowrap py-4">
                        {format(entry.date, 'EEEE - MMM- dd- yyyy')}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] font-bold text-primary">{entry.reference}</TableCell>
                      <TableCell className="text-sm font-medium max-w-xs truncate" title={entry.description}>{entry.description}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-tighter px-2", entry.type === 'sale' ? (entry.isCreditSale ? "bg-orange-50 text-orange-600 border-orange-200" : "bg-slate-100 text-slate-600") : "bg-emerald-50 text-emerald-600 border-emerald-200")}>
                          {entry.type === 'sale' ? (entry.isCreditSale ? 'Credit' : 'Paid') : entry.type === 'payment' ? 'Deposit' : entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-700">
                        {entry.debit > 0 ? formatCurrency(entry.debit, currencySymbol) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {entry.credit > 0 ? `-${formatCurrency(entry.credit, currencySymbol)}` : '-'}
                      </TableCell>
                      <TableCell className="no-print text-center">
                        {showPayButton && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-[10px] font-black uppercase bg-primary/10 text-primary hover:bg-primary hover:text-white"
                            onClick={() => entry.originalSale && handleRecordPayment(entry.originalSale)}
                          >
                            <DollarSign className="h-3 w-3 mr-1" /> Settle
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Footer */}
        <div className="flex items-center justify-between no-print pt-4">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                Page {currentPage} of Registry Batch
            </p>
            <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchLedgerData('prev')} 
                    disabled={currentPage === 1 || isLoading}
                    className="h-9 font-bold"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fetchLedgerData('next')} 
                    disabled={isLastPage || isLoading}
                    className="h-9 font-bold"
                >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </div>
      </div>

      <footer className="mt-16 pt-12 border-t text-center space-y-6">
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">End of Audit Report</p>
        <div className="flex justify-center items-center gap-8 text-[10px] font-bold text-slate-500 uppercase">
          <span className="flex items-center gap-1.5"><History className="h-3 w-3 text-primary" /> Generated {format(new Date(), 'PP p')}</span>
          <span className="flex items-center gap-1.5"><FileText className="h-3 w-3 text-primary" /> Ref: {customer?.name.substring(0, 3).toUpperCase() || 'GST'}-{format(new Date(), 'yyyyMMdd')}</span>
        </div>
      </footer>

      {saleForPayment && (
        <RecordPaymentDialog
            isOpen={isRecordPaymentOpen}
            onClose={() => { setIsRecordPaymentOpen(false); setSaleForPayment(null); }}
            sale={saleForPayment}
            customerId={customerId}
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

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          main, div { padding: 0 !important; margin: 0 !important; max-width: 100% !important; box-shadow: none !important; border: none !important; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
    </div>
  );
}
