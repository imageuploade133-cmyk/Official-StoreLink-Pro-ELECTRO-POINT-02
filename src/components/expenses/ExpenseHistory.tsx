
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, CalendarIcon, MoreHorizontal, Undo2 } from 'lucide-react';
import { format as formatDate, startOfDay, endOfDay, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { cn, convertToDateSafely } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import type { Expense } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';

const ITEMS_PER_PAGE = 10;

interface ExpenseHistoryProps {
  expenses: Expense[];
  isLoading: boolean;
  isAdmin: boolean;
  onReturnExpense: (expense: Expense) => void;
}

export function ExpenseHistory({ expenses, isLoading, isAdmin, onReturnExpense }: ExpenseHistoryProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 29), to: new Date() });
  const [activePreset, setActivePreset] = useState<'last7' | 'last30' | 'custom'>('last30');
  const [currentPage, setCurrentPage] = useState(1);
  const { settings } = useSettings();

  const filteredExpenses = useMemo(() => {
    if (!dateRange?.from) return expenses;
    const fromDate = startOfDay(dateRange.from);
    const toDate = dateRange.to ? endOfDay(dateRange.to) : new Date();
    return expenses.filter(expense => {
        const expenseDate = convertToDateSafely(expense.expenseDate);
        if (!expenseDate) return false;
        return expenseDate >= fromDate && expenseDate <= toDate;
    });
  }, [expenses, dateRange]);

  const currentExpensesForPage = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredExpenses, currentPage]);

  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);

  const handleDatePresetChange = (preset: 'last7' | 'last30') => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === 'last7') {
      setDateRange({ from: subDays(now, 6), to: now });
    } else {
      setDateRange({ from: subDays(now, 29), to: now });
    }
  };

  const handleCustomDateChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange);
    setActivePreset('custom');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense History</CardTitle>
        <CardDescription>
          A log of all recorded expenses. Use the filters below to narrow down the results.
        </CardDescription>
        <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                <Button variant={activePreset === 'last7' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 text-xs" onClick={() => handleDatePresetChange('last7')}>Last 7 Days</Button>
                <Button variant={activePreset === 'last30' ? 'default' : 'ghost'} size="sm" className="h-8 px-3 text-xs" onClick={() => handleDatePresetChange('last30')}>Last 30 Days</Button>
            </div>
            <Popover>
                <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full sm:w-[260px] justify-start text-left font-normal h-9", !dateRange && "text-muted-foreground", activePreset === 'custom' && "border-primary ring-1 ring-primary")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<>{formatDate(dateRange.from, "LLL dd, y")} - {formatDate(dateRange.to, "LLL dd, y")}</>) : (formatDate(dateRange.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
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
                                    value={dateRange?.from ? formatDate(dateRange.from, 'yyyy-MM-dd') : ''} 
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
                                    value={dateRange?.to ? formatDate(dateRange.to, 'yyyy-MM-dd') : ''} 
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
      </CardHeader>
      <CardContent>
        {isLoading && currentExpensesForPage.length === 0 ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground"><Info className="mx-auto h-12 w-12 mb-2" /><p>No expenses recorded for the selected period.</p></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Date</TableHead>
                <TableHead className="text-left">Description</TableHead>
                <TableHead className="text-left">Category</TableHead>
                <TableHead className="text-left">Amount</TableHead>
                <TableHead className="text-left">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentExpensesForPage.map(expense => (
                <TableRow key={expense.id} className={expense.status === 'Returned' ? 'bg-gray-100 text-muted-foreground line-through' : ''}>
                  <TableCell className="text-left text-xs">{expense.expenseDate instanceof Date ? formatDate(expense.expenseDate, 'PP') : 'N/A'}</TableCell>
                  <TableCell className="text-left font-medium text-sm">{expense.description}</TableCell>
                  <TableCell className="text-left"><Badge variant="outline">{expense.category}</Badge></TableCell>
                  <TableCell className="text-left font-semibold text-red-600 financial-value">{formatCurrency(expense.amount, settings?.currency || '$')}</TableCell>
                  <TableCell className="text-left">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!isAdmin || expense.status === 'Returned' || expense.category === 'Cash Deposit'}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onReturnExpense(expense)} className="text-orange-600 focus:text-orange-600 focus:bg-orange-50">
                          <Undo2 className="mr-2 h-4 w-4" /> Return Transaction
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="justify-end gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
        </CardFooter>
      )}
    </Card>
  );
}
