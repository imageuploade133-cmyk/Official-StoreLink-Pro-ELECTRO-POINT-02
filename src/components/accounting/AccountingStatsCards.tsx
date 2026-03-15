'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, ShoppingBag, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';

interface AccountingStatsCardsProps {
    stats: {
        totalRevenue: number;
        totalProfit: number;
        totalTransactions: number;
        avgSaleValue: number;
    },
    currencySymbol: string;
}

export function AccountingStatsCards({ stats, currencySymbol }: AccountingStatsCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-5 w-5 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue, currencySymbol)}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Profit</CardTitle><TrendingUp className="h-5 w-5 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stats.totalProfit, currencySymbol)}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Sales Transactions</CardTitle><ShoppingBag className="h-5 w-5 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg. Sale Value</CardTitle><Receipt className="h-5 w-5 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stats.avgSaleValue, currencySymbol)}</div></CardContent></Card>
        </div>
    )
}
