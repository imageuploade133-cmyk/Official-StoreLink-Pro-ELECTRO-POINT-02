
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { collection, getDocs, Timestamp, query as firestoreQuery, orderBy, where, doc } from 'firebase/firestore';
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfWeek,
  endOfWeek,
  isBefore,
  differenceInMilliseconds,
  addDays,
} from 'date-fns';

import type { SaleTransaction, Product, StockTransfer as StockTransferType, SaleReturn, WebsiteTraffic, Order, Settings, AdLink } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { convertToDateSafely } from "@/lib/utils";
import { useSettings } from '@/contexts/settings-context';
import { PageHeader } from '@/components/PageHeader';

import AccessDenied from '@/components/staff-management/AccessDenied';
import { Loader2, LayoutDashboard } from 'lucide-react';
import { TooltipProvider } from "@/components/ui/tooltip";

import { WebsiteAnalytics } from '@/components/dashboard/WebsiteAnalytics';
import { ExtendedStats } from '@/components/dashboard/ExtendedStats';
import { StaticStats } from '@/components/dashboard/StaticStats';
import { PeriodAnalysis } from '@/components/dashboard/PeriodAnalysis';
import { InventoryStats } from '@/components/dashboard/InventoryStats';
import { SalesTrendChart } from '@/components/dashboard/SalesTrendChart';
import { PopularProducts } from '@/components/dashboard/PopularProducts';
import { DueCreditSales } from '@/components/dashboard/DueCreditSales';
import { RecentTransfers } from '@/components/dashboard/RecentTransfers';
import { type DateRange } from 'react-day-picker';

export default function DashboardPage() {
  const { permissions, isLoading: isAuthLoading, store, staffMember } = useAuth();
  const firestore = useFirestore();
  const { settings, isLoadingSettings } = useSettings();
  const currencySymbol = settings?.currency || '$';
  const globalLowStockThreshold = settings?.lowStockThreshold ?? 10;

  const currentStoreId = useMemo(() => staffMember?.store_id || store?.id, [staffMember, store]);

  const [allSales, setAllSales] = useState<SaleTransaction[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allTransfers, setAllTransfers] = useState<StockTransferType[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [today, setToday] = useState<Date | null>(null);
  
  const [_, setMidnightTicker] = useState(0);

  // Traffic Stats
  const trafficRef = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return doc(firestore, 'stores', currentStoreId, 'analytics', 'websiteTraffic');
  }, [firestore, currentStoreId]);
  const { data: trafficData, isLoading: isLoadingTraffic } = useDoc<WebsiteTraffic>(trafficRef);

  // Online Orders Count
  const ordersQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return firestoreQuery(collection(firestore, 'orders'), where('store_id', '==', currentStoreId));
  }, [firestore, currentStoreId]);
  const { data: ordersData, isLoading: isLoadingOrders } = useCollection<Order>(ordersQuery);

  // Ads Data
  const adsQuery = useMemo(() => {
    if (!firestore || !currentStoreId) return null;
    return firestoreQuery(collection(firestore, 'ads'), where('store_id', '==', currentStoreId));
  }, [firestore, currentStoreId]);
  const { data: adsData, isLoading: isLoadingAds } = useCollection<AdLink>(adsQuery);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setDateRange({ from: subDays(now, 6), to: now });
    
    const msUntilMidnight = differenceInMilliseconds(addDays(startOfDay(now), 1), now);
    const timeout = setTimeout(() => {
        setMidnightTicker(tick => tick + 1);
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  const fetchAllDashboardData = useCallback(async () => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);
    setGlobalError(null);

    try {
      const salesCollectionRef = collection(firestore, 'saleTransactions');
      const productsCollectionRef = collection(firestore, 'products');
      const stockTransfersCollectionRef = collection(firestore, 'stockTransfers');
      
      const salesQuery = firestoreQuery(salesCollectionRef, where('store_id', '==', currentStoreId));
      const productsQuery = firestoreQuery(productsCollectionRef, where('store_id', '==', currentStoreId));
      const stockTransfersQuery = firestoreQuery(stockTransfersCollectionRef, where('store_id', '==', currentStoreId));

      const [salesSnapshot, productsSnapshot, stockTransfersSnapshot] = await Promise.all([
          getDocs(salesQuery),
          getDocs(productsQuery),
          getDocs(stockTransfersQuery),
      ]);

      const salesData: SaleTransaction[] = salesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, ...data,
          items: Array.isArray(data.items) ? data.items : [],
          createdAt: convertToDateSafely(data.createdAt, 'createdAt', doc.id),
          dueDate: convertToDateSafely(data.dueDate, 'dueDate', doc.id),
          grandTotal: typeof data.grandTotal === 'number' ? data.grandTotal : 0,
          returnedAmount: typeof data.returnedAmount === 'number' ? data.returnedAmount : 0,
          returns: Array.isArray(data.returns) ? data.returns.map((r: any) => ({...r, returnDate: convertToDateSafely(r.returnDate)})) : [],
        } as unknown as SaleTransaction;
        });
      salesData.sort((a, b) => (convertToDateSafely(b.createdAt)?.getTime() ?? 0) - (convertToDateSafely(a.createdAt)?.getTime() ?? 0));

      const productsData: Product[] = productsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id,
              ...data,
              purchasePrice: typeof data.purchasePrice === 'number' ? data.purchasePrice : 0,
              expiryDate: convertToDateSafely(data.expiryDate, 'expiryDate', doc.id),
          } as Product;
      });

      const transfersData: StockTransferType[] = stockTransfersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
              id: doc.id, ...data,
              transferDate: convertToDateSafely(data.transferDate, 'transferDate', doc.id),
          } as StockTransferType;
      });
      transfersData.sort((a, b) => (convertToDateSafely(b.transferDate)?.getTime() ?? 0) - (convertToDateSafely(a.transferDate)?.getTime() ?? 0));

      setAllSales(salesData);
      setAllProducts(productsData);
      setAllTransfers(transfersData);

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      errorEmitter.emit('firestore-error', error);
      setGlobalError(`Failed to load dashboard data: ${error.message}`);
      toast({
        variant: "destructive",
        title: "Dashboard Data Error",
        description: error.message || "Could not fetch dashboard data. Please try refreshing.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, firestore, currentStoreId]);
  
  useEffect(() => {
    if(permissions.view_dashboard && firestore) {
      fetchAllDashboardData();
    }
  }, [fetchAllDashboardData, permissions.view_dashboard, firestore]);

  const {
    staticStats,
    periodStats,
    salesTrendData,
    popularProductsData,
    dueCreditSales,
    recentStockTransfers,
    availableYears,
    todayOrdersCount,
    totalAdClicks,
    todayAdClicks
  } = useMemo(() => {
    // --- STATIC STATS (independent of dateRange picker) ---
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    
    let todaySales = 0, yesterdaySales = 0, weekSales = 0, allTimeProfit = 0, monthSales = 0;
    
    const productsMap = new Map(allProducts.map(p => [p.id, p]));
    const years = new Set<number>();
    const productQuantities: { [productId: string]: { name: string, quantity: number } } = {};

    allSales.forEach(sale => {
        const saleDate = convertToDateSafely(sale.createdAt);
        if (!saleDate) return;

        years.add(saleDate.getFullYear());
        const netSale = (sale.grandTotal || 0) - (sale.returnedAmount || 0);
        
        if (saleDate >= todayStart && saleDate <= todayEnd) todaySales += netSale;
        if (saleDate >= yesterdayStart && saleDate <= yesterdayEnd) yesterdaySales += netSale;
        if (saleDate >= weekStart) weekSales += netSale;
        if (saleDate >= monthStart) monthSales += netSale;
        
        let saleProfit = 0;
        if (sale.items) {
          sale.items.forEach(item => {
              const product = productsMap.get(item.productId);
              const purchasePrice = product?.purchasePrice ?? 0;
              saleProfit += (item.unitPrice - purchasePrice) * item.quantity;

              const productName = item.productName || product?.name || 'Unknown Product';
              if (productQuantities[item.productId]) {
                productQuantities[item.productId].quantity += item.quantity;
              } else {
                productQuantities[item.productId] = { name: productName, quantity: item.quantity };
              }
          });
        }
        if (sale.returns) {
            sale.returns.forEach((ret: SaleReturn) => {
                ret.items.forEach(item => {
                    const product = productsMap.get(item.productId);
                    const purchasePrice = product?.purchasePrice ?? 0;
                    saleProfit -= (item.unitPrice - purchasePrice) * item.quantity;
                });
            });
        }
        allTimeProfit += saleProfit;
    });

    const lowStockCount = allProducts.filter(p => {
        const threshold = p.lowStockThreshold ?? globalLowStockThreshold;
        return p.stock > 0 && p.stock <= threshold;
    }).length;

    const outOfStockCount = allProducts.filter(p => p.stock <= 0).length;
    const expiredProductCount = allProducts.filter(p => {
      const expiryDate = convertToDateSafely(p.expiryDate);
      return expiryDate && isBefore(expiryDate, startOfDay(now));
    }).length;
    
    const outstandingCreditSales = allSales.filter(s => s.isCreditSale && !s.isPaid && ((s.grandTotal || 0) - (s.amountPaidTowardsCredit || 0) - (s.returnedAmount || 0) > 0.001));

    // Calculate today's online orders
    const todayOrdersCount = ordersData ? ordersData.filter(order => {
      const orderDate = convertToDateSafely(order.createdAt);
      return orderDate && orderDate >= todayStart && orderDate <= todayEnd;
    }).length : 0;

    // Calculate ad clicks
    const totalAdClicks = adsData ? adsData.reduce((sum, ad) => sum + (ad.clicks || 0), 0) : 0;
    const todayAdClicks = adsData ? adsData.reduce((sum, ad) => {
      // For simplicity, we count all clicks as today clicks since we don't have click timestamps
      // In a real implementation, you would track click timestamps
      return sum + (ad.clicks || 0);
    }, 0) : 0;

    // --- PERIOD STATS (dependent on dateRange picker) ---
    const filteredSales = !dateRange?.from ? [] : allSales.filter(sale => {
      const saleDate = convertToDateSafely(sale.createdAt);
      if (!saleDate) return false;
      const from = startOfDay(dateRange.from!);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());
      return saleDate >= from && saleDate <= to;
    });
    
    let periodRevenue = 0, periodTransactions = filteredSales.length, periodReturns = 0, periodProfit = 0;
    filteredSales.forEach(sale => {
        periodRevenue += (sale.grandTotal || 0) - (sale.returnedAmount || 0);
        periodReturns += sale.returnedAmount || 0;
    });

    // --- CHART DATA ---
    const salesByDay: { [key: string]: number } = {};
    if (dateRange?.from) {
      let currentDate = startOfDay(dateRange.from);
      const endDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());
      while (currentDate <= endDate) {
        salesByDay[format(currentDate, 'MMM dd')] = 0;
        currentDate = addDays(currentDate, 1);
      }
      filteredSales.forEach(sale => {
        const saleDate = convertToDateSafely(sale.createdAt);
        if (!saleDate) return;
        const key = format(saleDate, 'MMM dd');
        salesByDay[key] = (salesByDay[key] || 0) + ((sale.grandTotal || 0) - (sale.returnedAmount || 0));
      });
    }

    return {
      staticStats: {
        todaySales, yesterdaySales, weekSales, monthSales, allTimeProfit,
        allTimeTransactions: allSales.length, lowStockCount, outOfStockCount,
        expiredProductCount, 
        dueCreditCount: outstandingCreditSales.length,
        totalOutstandingAmount: outstandingCreditSales.reduce((acc, sale) => acc + ((sale.grandTotal || 0) - (sale.amountPaidTowardsCredit || 0) - (sale.returnedAmount || 0)), 0),
      },
      periodStats: {
        totalRevenue: periodRevenue, totalTransactions: periodTransactions, totalReturns: periodReturns, totalProfit: periodProfit
      },
      salesTrendData: Object.entries(salesByDay).map(([date, sales]) => ({ date, sales })),
      popularProductsData: Object.entries(productQuantities).map(([id, data]) => ({ id, product: data.name, quantity: data.quantity })).sort((a, b) => b.quantity - a.quantity).slice(0, 5),
      dueCreditSales: outstandingCreditSales.map(sale => ({ ...sale, amountActuallyDue: (sale.grandTotal || 0) - (sale.amountPaidTowardsCredit || 0) - (sale.returnedAmount || 0), isOverdue: sale.dueDate ? isBefore(convertToDateSafely(sale.dueDate)!, startOfDay(now)) : false})).sort((a,b) => (convertToDateSafely(a.dueDate)?.getTime() ?? 0) - (convertToDateSafely(a.dueDate)?.getTime() ?? 0)).slice(0, 5),
      recentStockTransfers: allTransfers.slice(0, 3).map(t => ({...t, transferDateDisplay: convertToDateSafely(t.transferDate) ? format(convertToDateSafely(t.transferDate)!, 'PP p') : 'N/A'})),
      availableYears: Array.from(years).sort((a,b) => b-a),
      todayOrdersCount,
      totalAdClicks,
      todayAdClicks
    };
  }, [allSales, allProducts, allTransfers, dateRange, globalLowStockThreshold, _, ordersData, adsData]);

  const totalLoading = isAuthLoading || isLoadingSettings;

  if (totalLoading) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  // Super Admin view for invitation management
  if (user?.email === 'abdulkadir123shaba@gmail.com' && !currentStoreId) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full">
                <LayoutDashboard className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Platform Super Admin</h1>
            <p className="text-muted-foreground max-w-md">
                Welcome back. You are currently in platform management mode.
                Use the direct URL to access the invitation manager.
            </p>
            <div className="pt-4">
                <Link href="/dashboard/invitations">
                    <Button>Open Invitation Manager</Button>
                </Link>
            </div>
        </div>
    );
  }

  if (!permissions.view_dashboard) {
    return <AccessDenied />;
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
       <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="An overview of your store's performance."
      />

      <WebsiteAnalytics 
        isLoading={isLoadingTraffic || isLoadingOrders}
        totalViews={trafficData?.totalViews || 0}
        todayViews={trafficData?.todayViews || 0}
        totalOrders={ordersData?.length || 0}
        todayOrders={todayOrdersCount}
      />
      
      <ExtendedStats
        isLoading={isLoading || isLoadingAds}
        allSales={allSales}
        todayAdClicks={todayAdClicks}
        totalAdClicks={totalAdClicks}
      />
      
      <StaticStats
        isLoading={isLoading}
        today={today}
        staticStats={staticStats}
        allSales={allSales}
        availableYears={availableYears}
      />

      <PeriodAnalysis 
        dateRange={dateRange}
        onDateChange={setDateRange}
        stats={periodStats}
        currencySymbol={currencySymbol}
      />

      <InventoryStats stats={staticStats} isLoading={isLoading} />
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <SalesTrendChart 
            isLoading={isLoading} 
            salesTrendData={salesTrendData} 
            dateRange={dateRange}
        />
        <PopularProducts 
            isLoading={isLoading} 
            popularProductsData={popularProductsData} 
        />
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DueCreditSales 
            isLoading={isLoading}
            dueCreditSales={dueCreditSales}
        />
        <RecentTransfers 
            isLoading={isLoading}
            recentStockTransfers={recentStockTransfers}
        />
       </div>

    </div>
    </TooltipProvider>
  );
}
