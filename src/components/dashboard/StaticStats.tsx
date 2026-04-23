'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatUtils";
import { ChevronDown } from "lucide-react";
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
      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto px-0 py-1 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-transparent">
                {todayYesterdayPeriod === 'today' ? "Today's Sales" : "Yesterday's Sales"}
                <ChevronDown className="h-4 w-4 ml-1 text-slate-500 dark:text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setTodayYesterdayPeriod('today')}>Today's Sales</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTodayYesterdayPeriod('yesterday')}>Yesterday's Sales</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          {isLoading || !today ? (
            <Skeleton className="h-8 w-3/4 my-1" />
          ) : (
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(todayYesterdayPeriod === 'today' ? staticStats.todaySales : staticStats.yesterdaySales, currencySymbol)}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Net sales for {todayYesterdayPeriod}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sales Snapshot</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto px-1 py-1 text-xs text-slate-700 dark:text-slate-200 hover:bg-transparent">
                  {{ week: 'This Week', month: 'This Month' }[salesSnapshotPeriod]}
                  <ChevronDown className="h-4 w-4 ml-1 text-slate-500 dark:text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setSalesSnapshotPeriod('week')}>This Week</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSalesSnapshotPeriod('month')}>This Month</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !today ? (
            <Skeleton className="h-8 w-3/4 my-1" />
          ) : (
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(salesSnapshotValue, currencySymbol)}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Net sales for {{ week: 'this week', month: 'this month' }[salesSnapshotPeriod]}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">Monthly Sales</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto px-1 py-1 text-xs text-slate-700 dark:text-slate-200 hover:bg-transparent">
                  {today && selectedYear !== null && selectedMonth !== null ? format(new Date(selectedYear, selectedMonth), 'MMMM') : '...'} 
                  <ChevronDown className="h-4 w-4 ml-1 text-slate-500 dark:text-slate-400" />
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !today ? (
            <Skeleton className="h-8 w-3/4 my-1" />
          ) : (
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(salesForSelectedMonth, currencySymbol)}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Net sales for {today && selectedYear !== null && selectedMonth !== null ? format(new Date(selectedYear, selectedMonth), 'MMMM yyyy') : '...'}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">Yearly Sales</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto px-1 py-1 text-xs text-slate-700 dark:text-slate-200 hover:bg-transparent">
                  {selectedYear ?? '...'} 
                  <ChevronDown className="h-4 w-4 ml-1 text-slate-500 dark:text-slate-400" />
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !today ? (
            <Skeleton className="h-8 w-3/4 my-1" />
          ) : (
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {formatCurrency(salesForSelectedYear, currencySymbol)}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Net sales for the year {selectedYear}</p>
        </CardContent>
      </Card>
    </div>
  );
}
