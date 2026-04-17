
"use client";

import * as React from "react";
import { useFirestore } from "@/firebase";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductSalesTable } from "@/components/product-sales/product-sales-table";
import { ProductSalesDetailsModal } from "@/components/product-sales/product-sales-details-modal";
import { DailySalesPerformanceTab } from "@/components/product-sales/daily-sales-performance-tab";
import type { AggregatedProductSale, SaleTransaction, StaffMember, Product } from "@/lib/types";
import {
  TrendingUp,
  Search as SearchIcon,
  Loader2,
  Calendar as CalendarIcon,
  Undo2,
  DollarSign,
  Archive,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  BarChart3,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/settings-context";
import { formatCurrency } from '@/lib/formatUtils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn, convertToDateSafely } from "@/lib/utils";
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/contexts/auth-context';
import AccessDenied from '@/components/staff-management/AccessDenied';
import { PageHeader } from "@/components/PageHeader";

const ITEMS_PER_PAGE = 10;
const MAX_TRANSACTIONS_FETCH = 1000; // Limit to save reads on summary cards

export default function ProductSalesPage() {
  const { toast } = useToast();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';
  const { permissions, isLoading: authLoading, store, staffMember } = useAuth();
  const firestore = useFirestore();

  const currentStoreId = React.useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [loading, setLoading] = React.useState(true);
  const [aggregatedSales, setAggregatedSales] = React.useState<AggregatedProductSale[]>([]);
  const [allTransactions, setAllTransactions] = React.useState<SaleTransaction[]>([]);
  const [staffMap, setStaffMap] = React.useState<Map<string, StaffMember>>(new Map());

  const [searchTerm, setSearchTerm] = React.useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isLastPage, setIsLastPage] = React.useState(false);
  const [totalProductsInRegistry, setTotalProductsInRegistry] = React.useState(0);

  // Stable cursors and data refs to avoid loops
  const firstDocRef = React.useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = React.useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const transactionsRef = React.useRef<SaleTransaction[]>([]);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = React.useState<AggregatedProductSale | null>(null);

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [activePreset, setActivePreset] = React.useState<'last7' | 'last30' | 'custom'>('last30');
  
  React.useEffect(() => {
    // Set initial date range on client-side to avoid hydration mismatch
    setDateRange({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
  }, []);

  // 1. Fetch transactions for the period (Cached in ref for aggregation)
  const fetchSummaryData = React.useCallback(async (range: DateRange | undefined) => {
    if (!range?.from || !firestore || !currentStoreId) return;
    
    try {
      const salesConstraints: any[] = [
        where("store_id", "==", currentStoreId),
        where("createdAt", ">=", startOfDay(range.from)),
        where("createdAt", "<=", endOfDay(range.to ? range.to : range.from)),
        orderBy("createdAt", "desc"),
        limit(MAX_TRANSACTIONS_FETCH)
      ];

      const salesQuery = query(collection(firestore, "saleTransactions"), ...salesConstraints);
      const staffQuery = query(collection(firestore, "staff"), where("store_id", "==", currentStoreId));

      const [salesSnapshot, staffSnapshot] = await Promise.all([
        getDocs(salesQuery),
        getDocs(staffQuery),
      ]);

      const salesData: SaleTransaction[] = salesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, ...data,
          items: Array.isArray(data.items) ? data.items : [],
          createdAt: convertToDateSafely(data.createdAt),
          grandTotal: typeof data.grandTotal === 'number' ? data.grandTotal : 0,
          returnedAmount: typeof data.returnedAmount === 'number' ? data.returnedAmount : 0,
          returns: Array.isArray(data.returns) ? data.returns : [],
        } as SaleTransaction;
      });
      
      transactionsRef.current = salesData;
      setAllTransactions(salesData);
      
      const staffDataMap = new Map<string, StaffMember>();
      staffSnapshot.docs.forEach(doc => {
        const data = doc.data();
        staffDataMap.set(data.uid || doc.id, { id: doc.id, ...data } as StaffMember);
      });
      setStaffMap(staffDataMap);

    } catch (e: any) {
      console.error("Error fetching summary data:", e);
      toast({ variant: 'destructive', title: "Summary Error", description: "Failed to load period statistics." });
    }
  }, [firestore, toast, currentStoreId]);

  // 2. Fetch paginated products and merge with sales data
  const fetchProductBatch = React.useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !currentStoreId) return;
    setLoading(true);

    try {
      const productsCol = collection(firestore, "products");
      let q = query(productsCol, where('store_id', '==', currentStoreId), where('isVisibleOnWeb', '==', true), orderBy("name", "asc"));

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        q = query(q, where("name", ">=", term), where("name", "<=", term + '\uf8ff'));
      }

      if (direction === 'initial') {
        const countSnapshot = await getCountFromServer(q);
        setTotalProductsInRegistry(countSnapshot.data().count);
      }

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

        const productsData = docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        
        // Aggregate sales using the ref to avoid dependency loop
        const aggregated: AggregatedProductSale[] = productsData.map(product => {
          const stats = {
            totalQuantitySold: 0,
            totalRevenueGenerated: 0,
            totalProfit: 0,
          };

          transactionsRef.current.forEach(sale => {
            sale.items.forEach(item => {
              if (item.productId === product.id) {
                const purchasePrice = product.purchasePrice ?? 0;
                stats.totalQuantitySold += item.quantity;
                stats.totalRevenueGenerated += item.totalPrice;
                stats.totalProfit += (item.unitPrice - purchasePrice) * item.quantity;
              }
            });
            
            if (sale.returns) {
              sale.returns.forEach(returnRecord => {
                returnRecord.items.forEach((returnedItem: any) => {
                  if(returnedItem.productId === product.id) {
                    const costPrice = product.purchasePrice ?? 0;
                    stats.totalQuantitySold -= returnedItem.quantity;
                    stats.totalRevenueGenerated -= returnedItem.totalPrice;
                    stats.totalProfit -= (returnedItem.unitPrice - costPrice) * returnedItem.quantity;
                  }
                });
              });
            }
          });

          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            imageUrl: product.imageUrl,
            dataAiHint: product.dataAiHint,
            currentStock: product.stock,
            ...stats
          };
        });

        setAggregatedSales(aggregated);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        setAggregatedSales([]);
        setIsLastPage(true);
      }

    } catch (e: any) {
      console.error("Error fetching product batch:", e);
      toast({ variant: 'destructive', title: "Catalog Error", description: "Failed to load product list." });
    } finally {
      setLoading(false);
    }
  }, [firestore, searchTerm, toast, currentStoreId]);

  // Initial Data Load
  React.useEffect(() => {
    if(!authLoading && permissions.canViewProductSales && dateRange && currentStoreId) {
        fetchSummaryData(dateRange).then(() => fetchProductBatch('initial'));
    }
  }, [authLoading, permissions.canViewProductSales, dateRange, fetchSummaryData, fetchProductBatch, currentStoreId]);

  const handleRefresh = () => {
    fetchSummaryData(dateRange).then(() => fetchProductBatch('initial'));
  };

  const handleNextPage = () => fetchProductBatch('next');
  const handlePrevPage = () => fetchProductBatch('prev');

  const handleDatePresetChange = (preset: 'last7' | 'last30') => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === 'last7') {
      setDateRange({ from: subDays(now, 6), to: now });
    } else if (preset === 'last30') {
      setDateRange({ from: subDays(now, 29), to: now });
    }
  };

  const handleCustomDateChange = (newDate: DateRange | undefined) => {
    setDateRange(newDate);
    setActivePreset('custom');
  };

  const { grossRevenue, totalRefunds } = React.useMemo(() => {
    let grossRev = 0;
    let refunds = 0;
    allTransactions.forEach(sale => {
        grossRev += sale.grandTotal || 0;
        refunds += sale.returnedAmount || 0;
    });
    return { grossRevenue: grossRev, totalRefunds: refunds };
  }, [allTransactions]);
  
  const getDateRangeTitle = () => {
    if (!dateRange?.from) return "";
    const fromStr = format(dateRange.from, "MMM dd");
    const toStr = dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy");
    if (fromStr === toStr.split(',')[0]) return `for ${toStr}`;
    return `from ${fromStr} to ${toStr}`;
  };

  const totalPagesInRegistry = Math.ceil(totalProductsInRegistry / ITEMS_PER_PAGE);

  if (authLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }
  
  if (!permissions.canViewProductSales) {
      return <AccessDenied />;
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 bg-slate-50 min-h-[calc(100vh-theme(spacing.14))] sm:min-h-[calc(100vh-theme(spacing.16))]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <PageHeader
          icon={TrendingUp}
          title="Product Sales Tracking"
          description="Analyze sales performance and profit metrics for each product."
        />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={loading} size="sm">
                <RotateCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Sync Data
            </Button>
            <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                <Button variant={activePreset === 'last7' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 text-xs" onClick={() => handleDatePresetChange('last7')}>7 Days</Button>
                <Button variant={activePreset === 'last30' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 text-xs" onClick={() => handleDatePresetChange('last30')}>30 Days</Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                  <Button id="date" variant={"outline"} className={cn("w-full sm:w justify-start text-left font-normal h-9", !dateRange && "text-muted-foreground", activePreset === 'custom' && "border-primary ring-1 ring-primary")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                  <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={handleCustomDateChange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          <Card className="bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Net Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(grossRevenue - totalRefunds, currencySymbol)}</div>
              <p className="text-xs text-muted-foreground">{allTransactions.length === MAX_TRANSACTIONS_FETCH ? `Aggregated over latest ${MAX_TRANSACTIONS_FETCH} sales` : 'Full period totals'}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Transactions</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{allTransactions.length.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Volume in selected view</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400">Total Refunds</CardTitle>
              <Undo2 className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(totalRefunds, currencySymbol)}</div>
              <p className="text-xs text-muted-foreground">Historical returns in period</p>
            </CardContent>
          </Card>
          <Card className="bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Product Registry</CardTitle>
              <Archive className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{totalProductsInRegistry.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Active products cataloged</p>
            </CardContent>
          </Card>
      </div>

      <Tabs defaultValue="allProducts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs sm:max-w-md mb-4">
            <TabsTrigger value="allProducts">By Product</TabsTrigger>
            <TabsTrigger value="dailySalesPerformance">Daily Trends</TabsTrigger>
        </TabsList>
        <TabsContent value="allProducts">
            <Card className=" rounded-lg overflow-hidden border-none ring-1 ring-border">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-3 bg-white dark:bg-slate-900 border-b">
                    <div>
                        <CardTitle className="text-lg">Product Performance Ranking</CardTitle>
                        <CardDescription>Sales summary for the period {getDateRangeTitle()}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-grow sm:w">
                            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name or SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchProductBatch('initial')}
                                className="pl-8 h-10"
                            />
                        </div>
                        <Button size="icon" variant="secondary" onClick={() => fetchProductBatch('initial')} className="h-10 w-10">
                            <SearchIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : (
                        <ProductSalesTable
                            products={aggregatedSales}
                            onViewDetails={(p) => { setSelectedProductForDetails(p); setIsDetailsModalOpen(true); }}
                            currencySymbol={currencySymbol}
                        />
                    )}
                </CardContent>
                <CardFooter className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/5">
                    <div className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                        Page {currentPage} of {totalPagesInRegistry || 1}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1 || loading} className="font-bold">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleNextPage} disabled={isLastPage || loading} className="font-bold">
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </TabsContent>
        <TabsContent value="dailySalesPerformance">
           <DailySalesPerformanceTab 
              transactions={allTransactions}
              products={[]} 
              currencySymbol={currencySymbol}
           />
        </TabsContent>
      </Tabs>

      <ProductSalesDetailsModal
        isOpen={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        product={selectedProductForDetails}
        allSalesTransactions={allTransactions}
        staffMap={staffMap}
        currencySymbol={currencySymbol}
      />
    </main>
  );
}
