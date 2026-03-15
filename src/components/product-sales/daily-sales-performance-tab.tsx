'use client';

import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfDay, endOfDay } from 'date-fns';
import { PackageSearch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SaleTransaction, Product } from '@/lib/types';
import Image from 'next/image';
import { formatCurrency } from '@/lib/formatUtils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/contexts/settings-context';
import { convertToDateSafely } from '@/lib/utils';

interface DailySalesData {
  date: string;
  fullDate: string;
  revenue: number;
  profit: number;
  salesCount: number;
}

interface SoldItemInfo {
  id: string;
  name: string;
  imageUrl?: string | null;
  dataAiHint?: string | null;
  quantitySold: number;
  availableStock: number;
  stockBeforeSales: number;
}

interface DailySalesPerformanceTabProps {
  transactions: SaleTransaction[];
  products: Product[];
  currencySymbol: string;
}

export function DailySalesPerformanceTab({ transactions, products, currencySymbol }: DailySalesPerformanceTabProps) {
  const [showTodayOnly, setShowTodayOnly] = React.useState(false);
  const { settings } = useSettings();
  const defaultImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/400x300.png';

  const filteredTransactions = React.useMemo(() => {
    if (!showTodayOnly) {
      return transactions;
    }
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    return transactions.filter(t => {
      const saleDate = convertToDateSafely(t.createdAt);
      return saleDate && saleDate >= todayStart && saleDate <= todayEnd;
    });
  }, [transactions, showTodayOnly]);
  
  const dailyAggregatedData = React.useMemo(() => {
    if (filteredTransactions.length === 0) return [];
    
    const productsMap = new Map(products.map(p => [p.id, p]));
    const dailyDataMap = new Map<string, { revenue: number; profit: number; salesCount: number }>();
    
    filteredTransactions.forEach(transaction => {
      const saleDate = convertToDateSafely(transaction.createdAt);
      if (!saleDate) return;

      const dateStr = format(saleDate, 'yyyy-MM-dd');
      let dayData = dailyDataMap.get(dateStr);
      if (!dayData) {
        dayData = { revenue: 0, profit: 0, salesCount: 0 };
      }

      const netTotalForSale = (transaction.grandTotal || 0) - (transaction.returnedAmount || 0);
      dayData.revenue += netTotalForSale;

      let transactionProfit = 0;
      // Calculate gross profit from items sold
      for (const item of transaction.items) {
        const productInfo = productsMap.get(item.productId);
        const purchasePrice = productInfo?.purchasePrice ?? 0;
        transactionProfit += (item.unitPrice - purchasePrice) * item.quantity;
      }

      // Subtract profit from returned items
      if (transaction.returns) {
          for (const aReturn of transaction.returns) {
              for (const item of aReturn.items) {
                  const productInfo = productsMap.get(item.productId);
                  const purchasePrice = productInfo?.purchasePrice ?? 0;
                  transactionProfit -= (item.unitPrice - purchasePrice) * item.quantity;
              }
          }
      }
      dayData.profit += transactionProfit;
      dayData.salesCount += 1;

      dailyDataMap.set(dateStr, dayData);
    });
    
    if (dailyDataMap.size === 0) return [];
    
    const finalData: DailySalesData[] = [];
    const sortedMap = new Map([...dailyDataMap.entries()].sort());
    
    sortedMap.forEach((data, dateStr) => {
        finalData.push({
            date: format(new Date(dateStr + 'T00:00:00'), 'MMM dd'),
            fullDate: dateStr,
            ...data
        });
    });

    return finalData;

  }, [filteredTransactions, products]);
  
  const soldItemsListData = React.useMemo(() => {
    if (!filteredTransactions) return [];

    const soldItemsMap = new Map<string, { productInfo: Product; quantitySold: number }>();

    for (const transaction of filteredTransactions) {
      for (const item of transaction.items) {
        const existingEntry = soldItemsMap.get(item.productId);
        if (existingEntry) {
          existingEntry.quantitySold += item.quantity;
        } else {
          const productInfo = products.find(p => p.id === item.productId);
          if (productInfo) {
            soldItemsMap.set(item.productId, {
              productInfo,
              quantitySold: item.quantity,
            });
          }
        }
      }

      // Subtract returns
      if (transaction.returns) {
        for (const aReturn of transaction.returns) {
          for (const item of aReturn.items) {
            const existingEntry = soldItemsMap.get(item.productId);
            if (existingEntry) {
              existingEntry.quantitySold -= item.quantity;
            }
          }
        }
      }
    }

    const result: SoldItemInfo[] = Array.from(soldItemsMap.values())
    .filter(entry => entry.quantitySold > 0) // Only show products with net positive sales
    .map(entry => ({
      id: entry.productInfo.id,
      name: entry.productInfo.name,
      imageUrl: entry.productInfo.imageUrl,
      dataAiHint: entry.productInfo.dataAiHint,
      quantitySold: entry.quantitySold,
      availableStock: entry.productInfo.stock,
      stockBeforeSales: entry.productInfo.stock + entry.quantitySold, // Approximation
    }));

    return result.sort((a,b) => b.quantitySold - a.quantitySold);
  }, [filteredTransactions, products]);

  const yAxisTickFormatter = (value: number) => {
    if (value >= 1_000_000) return `${currencySymbol}${value / 1_000_000}M`;
    if (value >= 1_000) return `${currencySymbol}${value / 1_000}k`;
    return `${currencySymbol}${value}`;
  };

  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader>
        <CardTitle>Daily Sales Performance</CardTitle>
        <CardDescription>
          {showTodayOnly
            ? "Showing sales performance for today only."
            : "Visualize revenue and profit, and see items sold over the selected period."
          }
        </CardDescription>
        <div className="flex items-center space-x-2 pt-2">
          <Switch id="today-filter" checked={showTodayOnly} onCheckedChange={setShowTodayOnly} />
          <Label htmlFor="today-filter">Show Today's Performance Only</Label>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
         <div>
          <h3 className="text-lg font-semibold mb-2">Sales & Profit Chart</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={dailyAggregatedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={yAxisTickFormatter} />
                <Tooltip
                contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                }}
                formatter={(value: number, name: string) => [formatCurrency(value, currencySymbol), name.charAt(0).toUpperCase() + name.slice(1)]}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
            </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">
            Items Sold {showTodayOnly ? "Today" : "in Selected Period"}
          </h3>
          <Card className="border">
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {soldItemsListData.length > 0 ? (
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 z-10">
                      <TableRow>
                        <TableHead className="w-[70px] px-4">Image</TableHead>
                        <TableHead className="px-4">Product Name</TableHead>
                        <TableHead className="text-center px-4">Stock Before</TableHead>
                        <TableHead className="text-center text-destructive px-4">Qty Sold</TableHead>
                        <TableHead className="text-center text-green-600 px-4">Stock Now</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {soldItemsListData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="px-4">
                            <Image
                              src={item.imageUrl || defaultImageUrl}
                              alt={item.name}
                              width={40}
                              height={40}
                              className="rounded-md object-cover aspect-square"
                              data-ai-hint={item.dataAiHint || item.name.toLowerCase().split(' ').slice(0,2).join(' ')}
                            />
                          </TableCell>
                          <TableCell className="font-medium px-4">{item.name}</TableCell>
                          <TableCell className="text-center px-4">{item.stockBeforeSales}</TableCell>
                          <TableCell className="text-center font-semibold text-destructive px-4">-{item.quantitySold}</TableCell>
                          <TableCell className="text-center font-bold text-green-600 px-4">{item.availableStock}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-10 text-muted-foreground text-center">
                    <PackageSearch className="h-16 w-16 mb-4 text-gray-300" />
                    <p className="font-medium">No Items Sold</p>
                    <p className="text-sm">There were no sales recorded for the selected period.</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        <div>
            <h3 className="text-lg font-semibold mb-2">Daily Data Breakdown</h3>
            <ScrollArea className="h-[400px] border rounded-md">
                 <Table>
                    <TableHeader className="sticky top-0 bg-muted/95 z-10">
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Sales Count</TableHead>
                            <TableHead className="text-right">Total Revenue</TableHead>
                            <TableHead className="text-right">Total Profit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dailyAggregatedData.length > 0 ? [...dailyAggregatedData].reverse().map((day) => (
                            <TableRow key={day.date}>
                                <TableCell>{day.date}</TableCell>
                                <TableCell className="text-right">{day.salesCount}</TableCell>
                                <TableCell className="text-right">{formatCurrency(day.revenue, currencySymbol)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(day.profit, currencySymbol)}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">No data for selected period.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
