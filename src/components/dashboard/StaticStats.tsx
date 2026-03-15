'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatUtils";
import { ShoppingBag, MoreHorizontal, ChevronDown } from "lucide-react";
import { format, startOfMonth } from 'date-fns';
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
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-0 -ml-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                {todayYesterdayPeriod === 'today' ? "Today's Sales" : "Yesterday's Sales"}
                <ChevronDown className="h-4 w-4 ml-1 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setTodayYesterdayPeriod('today')}>Today's Sales</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTodayYesterdayPeriod('yesterday')}>Yesterday's Sales</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ShoppingBag className="h-5 w-5 text-blue-500" />
        </CardHeader>
        <CardContent>
          {isLoading || !today ? (
            <Skeleton className="h-8 w-3/4 my-1" />
          ) : (
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(todayYesterdayPeriod === 'today' ? staticStats.todaySales : staticStats.yesterdaySales, currencySymbol)}
            </div>
          )}
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Net sales for {todayYesterdayPeriod}
          </p>
        </CardContent>
      </Card>
      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Sales Snapshot</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 -mr-2 text-xs text-green-600 dark:text-green-400">
                {{ week: 'This Week', month: 'This Month' }[salesSnapshotPeriod]}
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setSalesSnapshotPeriod('week')}>This Week</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSalesSnapshotPeriod('month')}>This Month</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          {isLoading || !today ? <Skeleton className="h-8 w-3/4 my-1" /> : <div className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(salesSnapshotValue, currencySymbol)}</div>}
          <p className="text-xs text-green-600 dark:text-green-400">
            Net sales for {{ week: 'this week', month: 'this month' }[salesSnapshotPeriod]}
          </p>
        </CardContent>
      </Card>
      <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">Monthly Sales for {selectedYear ?? '...'}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 -mr-2 text-xs text-purple-600 dark:text-purple-400">
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
        </CardHeader>
        <CardContent>
          {isLoading || !today ? <Skeleton className="h-8 w-3/4 my-1" /> : <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(salesForSelectedMonth, currencySymbol)}</div>}
          <p className="text-xs text-purple-600 dark:text-purple-400">Net sales for {today && selectedYear !== null && selectedMonth !== null ? format(new Date(selectedYear, selectedMonth), 'MMMM yyyy') : '...'}</p>
        </CardContent>
      </Card>
      <Card className="bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-pink-600 dark:text-pink-400">Sales for {selectedYear ?? '...'}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 -mt-1 -mr-2 text-pink-600 dark:text-pink-400">
                <MoreHorizontal className="h-4 w-4" />
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
        </CardHeader>
        <CardContent>
          {isLoading || !today ? <Skeleton className="h-8 w-3/4 my-1" /> : <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">{formatCurrency(salesForSelectedYear, currencySymbol)}</div>}
          <p className="text-xs text-pink-600 dark:text-pink-400">Net sales for the selected year</p>
        </CardContent>
      </Card>
    </div>
  );
}
