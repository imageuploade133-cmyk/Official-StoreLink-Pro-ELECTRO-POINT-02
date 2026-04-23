'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatUtils";
import { ShoppingBag, MoreHorizontal, ChevronDown } from "lucide-react";
import { format } from 'date-fns';
import type { SaleTransaction } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';

interface StaticStatsProps {
  isLoading: boolean;
  today: Date | null;
  staticStats: {
    todaySales: number;
    yesterdaySales: number;
    weekSales: number;
    monthSales: number;
  };
  allSales: SaleTransaction[];
  availableYears: number[];
}

export function StaticStats({
  isLoading,
  today,
  staticStats,
  allSales,
  availableYears,
}: StaticStatsProps) {
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  const [todayYesterdayPeriod, setTodayYesterdayPeriod] = useState<'today' | 'yesterday'>('today');
  const [salesSnapshotPeriod, setSalesSnapshotPeriod] = useState<'week' | 'month'>('week');
  const [selectedYear, setSelectedYear] = useState<number | null>(today ? today.getFullYear() : null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(today ? today.getMonth() : null);
  
  const salesForSelectedMonth = useMemo(() => {
    return allSales
        .filter(sale => {
            const saleDate = sale.createdAt instanceof Date ? sale.createdAt : sale.createdAt?.toDate();
            if (!saleDate || !(saleDate instanceof Date)) return false;
            return saleDate.getFullYear() === selectedYear && saleDate.getMonth() === selectedMonth;
        })
        .reduce((acc, sale) => acc + ((sale.grandTotal || 0) - (sale.returnedAmount || 0)), 0);
  }, [allSales, selectedYear, selectedMonth]);

  const salesForSelectedYear = useMemo(() => {
    return allSales
        .filter(sale => {
            const saleDate = sale.createdAt instanceof Date ? sale.createdAt : sale.createdAt?.toDate();
            return saleDate ? saleDate.getFullYear() === selectedYear : false;
        })
        .reduce((acc, sale) => acc + ((sale.grandTotal || 0) - (sale.returnedAmount || 0)), 0);
  }, [allSales, selectedYear]);

  const salesSnapshotValue = useMemo(() => {
    switch (salesSnapshotPeriod) {
      case 'week': return staticStats.weekSales;
      case 'month': return staticStats.monthSales;
      default: return 0;
    }
  }, [salesSnapshotPeriod, staticStats]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-background border-l-4 border-blue-500 border-t border-r border-b border-blue-200 dark:border-t-blue-800 dark:border-r-blue-800 dark:border-b-blue-800">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <ShoppingBag className="h-12 w-12 text-blue-500" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 -ml-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/50">
                {todayYesterdayPeriod === 'today' ? "Today's Sales" : "Yesterday's Sales"}
                <ChevronDown className="h-4 w-4 ml-1 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setTodayYesterdayPeriod('today')}>Today's Sales</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTodayYesterdayPeriod('yesterday')}>Yesterday's Sales</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 shadow-sm">
            <ShoppingBag className="h-4 w-4 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading || !today ? (
            <Skeleton className="h-8 w-3/4 my-1" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-300">
              {formatCurrency(todayYesterdayPeriod === 'today' ? staticStats.todaySales : staticStats.yesterdaySales, currencySymbol)}
            </div>
          )}
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Net sales for {todayYesterdayPeriod}
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-green-50/50 to-white dark:from-green-950/20 dark:to-background border-l-4 border-green-500 border-t border-r border-b border-green-200 dark:border-t-green-800 dark:border-r-green-800 dark:border-b-green-800">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <ShoppingBag className="h-12 w-12 text-green-500" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Sales Snapshot</CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-green-600 dark:text-green-400 hover:bg-green-100/50 dark:hover:bg-green-900/50">
                  {salesSnapshotPeriod === 'week' ? 'This Week' : 'This Month'}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setSalesSnapshotPeriod('week')}>This Week</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSalesSnapshotPeriod('month')}>This Month</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/50 shadow-sm">
              <ShoppingBag className="h-4 w-4 text-green-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading || !today ? (
            <Skeleton className="h-8 w-3/4 my-1" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-green-700 dark:text-green-300">
              {formatCurrency(salesSnapshotValue, currencySymbol)}
            </div>
          )}
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Net sales for {salesSnapshotPeriod === 'week' ? 'this week' : 'this month'}
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-background border-l-4 border-purple-500 border-t border-r border-b border-purple-200 dark:border-t-purple-800 dark:border-r-purple-800 dark:border-b-purple-800">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <ShoppingBag className="h-12 w-12 text-purple-500" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">Monthly Sales</CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-100/50 dark:hover:bg-purple-900/50">
                  {today && selectedYear !== null && selectedMonth !== null ? format(new Date(selectedYear, selectedMonth), 'MMMM') : '...'} <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Array.from({ length: 12 }).map((_, i) => (
                  <DropdownMenuItem key={i} onSelect={() => setSelectedMonth(i)}>
                    {selectedYear ? format(new Date(selectedYear, i), 'MMMM') : ''}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/50 shadow-sm">
              <ShoppingBag className="h-4 w-4 text-purple-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading || !today ? (
            <Skeleton className="h-8 w-3/4 my-1" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-purple-700 dark:text-purple-300">
              {formatCurrency(salesForSelectedMonth, currencySymbol)}
            </div>
          )}
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            Net sales for {today && selectedYear !== null && selectedMonth !== null ? format(new Date(selectedYear, selectedMonth), 'MMMM yyyy') : '...'}
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-950/20 dark:to-background border-l-4 border-pink-500 border-t border-r border-b border-pink-200 dark:border-t-pink-800 dark:border-r-pink-800 dark:border-b-pink-800">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <ShoppingBag className="h-12 w-12 text-pink-500" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-pink-600 dark:text-pink-400">Yearly Sales</CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-pink-600 dark:text-pink-400 hover:bg-pink-100/50 dark:hover:bg-pink-900/50">
                  {selectedYear ?? '...'} <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableYears.map(year => (
                  <DropdownMenuItem key={year} onSelect={() => setSelectedYear(year)}>
                    {year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-900/50 shadow-sm">
              <ShoppingBag className="h-4 w-4 text-pink-500" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          {isLoading || !today ? (
            <Skeleton className="h-8 w-3/4 my-1" />
          ) : (
            <div className="text-2xl font-bold tracking-tight text-pink-700 dark:text-pink-300">
              {formatCurrency(salesForSelectedYear, currencySymbol)}
            </div>
          )}
          <p className="text-xs text-pink-600 dark:text-pink-400 mt-1">Net sales for the year {selectedYear}</p>
        </CardContent>
      </Card>
    </div>
  );
}
