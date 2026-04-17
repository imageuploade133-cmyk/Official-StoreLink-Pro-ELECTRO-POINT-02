'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { formatCurrency } from '@/lib/formatUtils';
import { useSettings } from '@/contexts/settings-context';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

const chartConfig = {
  sales: {
    label: "Daily Sales",
    color: "hsl(var(--chart-1))",
  },
} satisfies Record<string, { label: string; color: string }>;

interface SalesTrendChartProps {
  isLoading: boolean;
  salesTrendData: { date: string; sales: number }[];
  dateRange: DateRange | undefined;
}

const yAxisTickFormatter = (value: number, symbol: string) => {
  if (value >= 1_000_000) return `${symbol}${value / 1_000_000}M`;
  if (value >= 1_000) return `${symbol}${value / 1_000}k`;
  return `${symbol}${value}`;
};

const getDateRangeTitle = (dateRange: DateRange | undefined) => {
    if (!dateRange?.from) return "for all time";
    const fromStr = format(dateRange.from, "MMM dd, yyyy");
    const toStr = dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : format(dateRange.from, "MMM dd, yyyy");
    if (fromStr === toStr) return `for ${toStr}`;
    return `from ${fromStr} to ${toStr}`;
};

export function SalesTrendChart({ isLoading, salesTrendData, dateRange }: SalesTrendChartProps) {
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="font-headline">Sales Trend ({getDateRangeTitle(dateRange)})</CardTitle>
        <CardDescription>Daily sales performance for the selected period.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {isLoading ? (
          <div className="h flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : salesTrendData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  tickFormatter={(value) => yAxisTickFormatter(value as number, currencySymbol)}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  width={60}
                  label={{ value: `Sales (${currencySymbol})`, angle: -90, position: 'insideLeft', offset: 0, style: { fontSize: '12px', fill: 'hsl(var(--muted-foreground))' } }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent
                    indicator="line"
                    formatter={(value) => formatCurrency(value as number, currencySymbol)}
                  />}
                />
                <Legend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }} activeDot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h flex items-center justify-center text-muted-foreground">No sales data for the selected period.</div>
        )}
      </CardContent>
    </Card>
  );
}
