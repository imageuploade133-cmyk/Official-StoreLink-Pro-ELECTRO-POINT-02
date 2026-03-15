'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Boxes, Truck, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';

interface RestockStatsProps {
  isLoading: boolean;
  totalItems?: number;
  totalValue?: number;
  todayItems?: number;
  currencySymbol: string;
}

export function RestockStats({ 
  isLoading, 
  totalItems = 0, 
  totalValue = 0, 
  todayItems = 0, 
  currencySymbol 
}: RestockStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Restocked Items</CardTitle>
                <Boxes className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{(totalItems || 0).toLocaleString()}</div>}
                <p className="text-xs text-muted-foreground">Total units added to stock all time.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Restocks</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{(todayItems || 0).toLocaleString()}</div>}
                 <p className="text-xs text-muted-foreground">Units added to stock today.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Restock Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{formatCurrency(totalValue || 0, currencySymbol)}</div>}
                 <p className="text-xs text-muted-foreground">Based on cost price of latest records.</p>
            </CardContent>
        </Card>
    </div>
  );
}
