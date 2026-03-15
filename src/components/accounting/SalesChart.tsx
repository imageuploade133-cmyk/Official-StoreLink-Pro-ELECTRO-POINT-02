'use client';

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatUtils';
import { BarChart } from 'lucide-react';

interface AggregatedSalesData {
  date: string;
  revenue: number;
  profit: number;
}
interface SalesChartProps {
    data: AggregatedSalesData[],
    currencySymbol: string;
}

export function SalesChart({ data, currencySymbol }: SalesChartProps) {

    const yAxisTickFormatter = (value: number) => {
        if (value >= 1_000_000) return `${currencySymbol}${value / 1_000_000}M`;
        if (value >= 1_000) return `${currencySymbol}${value / 1_000}k`;
        return `${currencySymbol}${value}`;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart/> Sales & Profit Trend</CardTitle>
                <CardDescription>Daily performance for the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={yAxisTickFormatter} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} formatter={(value: number, name: string) => [formatCurrency(value, currencySymbol), name.charAt(0).toUpperCase() + name.slice(1)]} />
                        <Legend />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" fill="hsl(var(--chart-2))" name="Profit" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
