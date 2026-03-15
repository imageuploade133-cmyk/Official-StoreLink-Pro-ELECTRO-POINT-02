'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';

interface SummaryCardsProps {
    isLoading: boolean;
    totalRevenue: number;
    totalExpenses: number;
    netBalance: number;
    currencySymbol: string;
}

export function SummaryCards({ isLoading, totalRevenue, totalExpenses, netBalance, currencySymbol }: SummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-600">All-Time Revenue</CardTitle>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-40"/> : <div className="text-3xl font-bold text-green-600">{formatCurrency(totalRevenue, currencySymbol)}</div>}
                    <p className="text-xs text-muted-foreground">Total sales minus returns.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-600">All-Time Expenses</CardTitle>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-40"/> : <div className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenses, currencySymbol)}</div>}
                    <p className="text-xs text-muted-foreground">Excludes internal cash deposits.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-primary">Net Balance</CardTitle>
                    <DollarSign className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-8 w-40"/> : <div className="text-3xl font-bold text-primary">{formatCurrency(netBalance, currencySymbol)}</div>}
                    <p className="text-xs text-muted-foreground">Revenue minus expenses.</p>
                </CardContent>
            </Card>
        </div>
    );
}
