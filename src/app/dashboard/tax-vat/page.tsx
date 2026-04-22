'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BadgePercent, 
  RotateCcw, 
  Calendar as CalendarIcon, 
  History,
  TrendingUp,
  ShoppingBag,
  Globe,
  Loader2
} from "lucide-react";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { useFirestore } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit
} from 'firebase/firestore'; 
import type { SaleTransaction, Order } from '@/lib/types';
import { convertToDateSafely, cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/contexts/settings-context';
import { StatCard } from '@/components/StatCard';

export default function TaxVatPage() {
  const { settings } = useSettings();
  const { store, staffMember, isLoading: isAuthLoading } = useAuth();
  const currencySymbol = settings?.currency || '$';
  const firestore = useFirestore();
  const currentStoreId = staffMember?.store_id || store?.id;

  const [isLoading, setIsLoading] = useState(true);
  const [posSales, setPosSales] = useState<SaleTransaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const fetchTaxData = useCallback(async () => {
    if (!firestore || !currentStoreId) return;
    setIsLoading(true);

    try {
      // Fetch POS Sales with tax
      const salesQuery = query(
        collection(firestore, "saleTransactions"),
        where("store_id", "==", currentStoreId),
        orderBy("createdAt", "desc"),
        limit(1000) // Adjust limit as needed
      );
      const salesSnap = await getDocs(salesQuery);
      const salesList = salesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertToDateSafely(doc.data().createdAt)
      })) as SaleTransaction[];
      setPosSales(salesList);

      // Fetch Website Orders with tax
      const ordersQuery = query(
        collection(firestore, "orders"),
        where("store_id", "==", currentStoreId),
        orderBy("createdAt", "desc"),
        limit(1000)
      );
      const ordersSnap = await getDocs(ordersQuery);
      const ordersList = ordersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertToDateSafely(doc.data().createdAt)
      })) as Order[];
      setOrders(ordersList);

    } catch (e) {
      console.error("Error fetching tax data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, currentStoreId]);

  useEffect(() => {
    if (currentStoreId && firestore) {
      fetchTaxData();
    }
  }, [currentStoreId, firestore, fetchTaxData]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const calculateStats = (items: (SaleTransaction | Order)[]) => {
      let todayTax = 0;
      let monthTax = 0;
      let totalTax = 0;

      items.forEach(item => {
        const tax = (item as any).taxAmountCalculated || 0;
        const date = convertToDateSafely(item.createdAt);
        
        if (date) {
          if (date >= todayStart && date <= todayEnd) {
            todayTax += tax;
          }
          if (date >= monthStart && date <= monthEnd) {
            monthTax += tax;
          }
          totalTax += tax;
        }
      });

      return { todayTax, monthTax, totalTax };
    };

    const posStats = calculateStats(posSales);
    const orderStats = calculateStats(orders);

    return {
      today: posStats.todayTax + orderStats.todayTax,
      month: posStats.monthTax + orderStats.monthTax,
      total: posStats.totalTax + orderStats.totalTax,
      posTotal: posStats.totalTax,
      webTotal: orderStats.totalTax
    };
  }, [posSales, orders]);

  const allTransactions = useMemo(() => {
    const combined = [
      ...posSales.map(s => ({ ...s, type: 'POS' as const })),
      ...orders.map(o => ({ ...o, type: 'Web' as const }))
    ];
    return combined
      .filter(item => (item as any).taxAmountCalculated > 0)
      .sort((a, b) => {
        const dateA = convertToDateSafely(a.createdAt)?.getTime() || 0;
        const dateB = convertToDateSafely(b.createdAt)?.getTime() || 0;
        return dateB - dateA;
      });
  }, [posSales, orders]);

  if (isAuthLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PageHeader
            icon={BadgePercent}
            title="Tax & VAT Report"
            description="Overview of taxes collected from POS and Online Store."
        />
        <Button variant="outline" onClick={fetchTaxData} disabled={isLoading}>
            <RotateCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
            title="Today's Tax"
            value={isLoading ? '...' : formatCurrency(stats.today, currencySymbol)}
            icon={CalendarIcon}
            description={format(new Date(), "MMMM dd, yyyy")}
            className="bg-blue-50 dark:bg-blue-950/20 border-blue-100"
            valueClassName="text-blue-600 font-black"
        />
        <StatCard
            title="This Month's Tax"
            value={isLoading ? '...' : formatCurrency(stats.month, currencySymbol)}
            icon={TrendingUp}
            description={format(new Date(), "MMMM yyyy")}
            className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100"
            valueClassName="text-emerald-600 font-black"
        />
        <StatCard
            title="Total Tax Collected"
            value={isLoading ? '...' : formatCurrency(stats.total, currencySymbol)}
            icon={BadgePercent}
            description="Lifetime collected tax"
            className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100"
            valueClassName="text-indigo-600 font-black"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-primary" /> POS Tax Contribution
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.posTotal, currencySymbol)}</div>
                <p className="text-xs text-muted-foreground">Total tax from Point of Sale transactions</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Web Tax Contribution
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.webTotal, currencySymbol)}</div>
                <p className="text-xs text-muted-foreground">Total tax from Online Store orders</p>
            </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg overflow-hidden border-none ring-1 ring-border">
        <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
                <History className="mr-2 h-5 w-5 text-primary"/> Recent Tax Transactions
            </CardTitle>
            <CardDescription>Recent transactions that included tax calculations.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]"> 
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead className="text-right">Tax Rate</TableHead>
                    <TableHead className="text-right">Tax Amount</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                  ))
                ) : allTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      <History className="mx-auto h-12 w-12 opacity-10 mb-4" />
                      <p className="text-lg font-bold">No tax transactions found</p>
                      <p className="text-sm">Taxes will appear here once sales are made with tax enabled.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  allTransactions.map((item) => {
                    const date = convertToDateSafely(item.createdAt);
                    const taxRate = (item as any).taxRate || 0;
                    const taxAmount = (item as any).taxAmountCalculated || 0;
                    const totalAmount = item.totalAmount || (item as any).grandTotal || 0;
                    
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs">
                          {date ? format(date, 'MMM dd, yyyy HH:mm') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.type === 'POS' ? 'default' : 'outline'} className="text-[10px]">
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-[10px]">
                          #{item.id.substring(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {taxRate}%
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(taxAmount, currencySymbol)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(totalAmount, currencySymbol)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
