'use client';

import { StatCard } from '@/components/StatCard';
import { Boxes, Warehouse, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface InventoryStatsProps {
  isLoading: boolean;
  totalStock: number;
  totalStockValue: number;
  totalStockProfit: number;
  currencySymbol: string;
  lowStockCount?: number;
  outOfStockCount?: number;
}

export function InventoryStats({
  isLoading,
  totalStock,
  totalStockValue,
  totalStockProfit,
  currencySymbol,
  lowStockCount = 0,
  outOfStockCount = 0,
}: InventoryStatsProps) {
  if (isLoading) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
        </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Stock Units"
        value={totalStock.toLocaleString()}
        description="Total quantity of all items."
        icon={Boxes}
        className="bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-background border border-blue-100/50 dark:border-blue-900/30"
        titleClassName="text-blue-600 dark:text-blue-400"
        iconClassName="text-blue-500 bg-blue-100 dark:bg-blue-900/50"
        valueClassName="text-blue-700 dark:text-blue-300"
      />
      <StatCard
        title="Inventory Value"
        value={formatCurrency(totalStockValue, currencySymbol)}
        description="Total cost of current stock."
        icon={Warehouse}
        className="bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-background border border-purple-100/50 dark:border-purple-900/30"
        titleClassName="text-purple-600 dark:text-purple-400"
        iconClassName="text-purple-500 bg-purple-100 dark:bg-purple-900/50"
        valueClassName="text-purple-700 dark:text-purple-300"
      />
      <StatCard
        title="Potential Profit"
        value={formatCurrency(totalStockProfit, currencySymbol)}
        description="Estimated margin from sales."
        icon={TrendingUp}
        className="bg-gradient-to-br from-green-50/50 to-white dark:from-green-950/20 dark:to-background border border-green-100/50 dark:border-green-900/30"
        titleClassName="text-green-600 dark:text-green-400"
        iconClassName="text-green-500 bg-green-100 dark:bg-green-900/50"
        valueClassName="text-green-700 dark:text-green-300"
      />
      <div className="flex flex-col gap-2">
        <div className="flex-1 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background border border-red-100 dark:border-red-900/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Out of Stock</span>
                <span className="text-2xl font-black text-red-700 dark:text-red-300">{outOfStockCount}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <Boxes className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
        </div>
        <div className="flex-1 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background border border-orange-100 dark:border-orange-900/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">Low Stock</span>
                <span className="text-2xl font-black text-orange-700 dark:text-orange-300">{lowStockCount}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
        </div>
      </div>
    </div>
  );
}
