
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from "@/components/ui/calendar";
import { DollarSign, TrendingUp, ListChecks, Undo2, Calendar as CalendarIcon } from 'lucide-react';
import { formatCurrency } from "@/lib/formatUtils";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface PeriodStats {
  totalRevenue: number;
  totalProfit: number;
  totalTransactions: number;
  totalReturns: number;
}

interface PeriodAnalysisProps {
  dateRange: DateRange | undefined;
  onDateChange: (range: DateRange | undefined) => void;
  stats: PeriodStats;
  currencySymbol: string;
}

export function PeriodAnalysis({ dateRange, onDateChange, stats, currencySymbol }: PeriodAnalysisProps) {
  const [activePreset, setActivePreset] = React.useState<'last7' | 'last30' | 'custom'>('last7');

  const handleDatePresetChange = (preset: 'last7' | 'last30') => {
    const { subDays } = require('date-fns');
    setActivePreset(preset);
    const now = new Date();
    if (preset === 'last7') {
      onDateChange({ from: subDays(now, 6), to: now });
    } else if (preset === 'last30') {
      onDateChange({ from: subDays(now, 29), to: now });
    }
  };

  const handleCustomDateChange = (newDateRange: DateRange | undefined) => {
    onDateChange(newDateRange);
    setActivePreset('custom');
  };

  const getDateRangeTitle = () => {
    if (!dateRange?.from) return "for all time";
    const fromStr = format(dateRange.from, "MMM dd, yyyy");
    const toStr = dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy");
    if (fromStr === toStr) return `for ${toStr}`;
    return `from ${fromStr} to ${toStr}`;
  };

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Period Analysis</CardTitle>
          <CardDescription>Select a date range to analyze sales performance for a specific period.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-md bg-muted p-1">
              <Button variant={activePreset === 'last7' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 text-xs" onClick={() => handleDatePresetChange('last7')}>Last 7 Days</Button>
              <Button variant={activePreset === 'last30' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 text-xs" onClick={() => handleDatePresetChange('last30')}>Last 30 Days</Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full sm:w-[260px] justify-start text-left font-normal h-9", !dateRange && "text-muted-foreground", activePreset === 'custom' && "border-primary ring-1 ring-primary")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b bg-muted/20">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="manual-from" className="text-[10px] font-bold uppercase text-muted-foreground">From</Label>
                            <Input 
                                id="manual-from" 
                                type="date" 
                                value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''} 
                                onChange={(e) => {
                                    const d = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                                    handleCustomDateChange({ ...dateRange, from: d });
                                }}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="manual-to" className="text-[10px] font-bold uppercase text-muted-foreground">To</Label>
                            <Input 
                                id="manual-to" 
                                type="date" 
                                value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''} 
                                onChange={(e) => {
                                    const d = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                                    handleCustomDateChange({ ...dateRange, to: d });
                                }}
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>
                </div>
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={handleCustomDateChange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (Period)</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue, currencySymbol)}</div>
            <p className="text-xs text-muted-foreground">{getDateRangeTitle()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit (Period)</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalProfit, currencySymbol)}</div>
            <p className="text-xs text-muted-foreground">Net profit in selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-500">Returns (Period)</CardTitle>
            <Undo2 className="h-5 w-5 text-orange-600 dark:text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalReturns, currencySymbol)}</div>
            <p className="text-xs text-muted-foreground">Value of returns in period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions (Period)</CardTitle>
            <ListChecks className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Number of sales in period</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
