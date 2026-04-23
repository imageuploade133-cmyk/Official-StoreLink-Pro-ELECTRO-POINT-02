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
}

export function InventoryStats({
  isLoading,
  totalStock,
  totalStockValue,
  totalStockProfit,
  currencySymbol,
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
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        title="Total Stock Units"
        value={totalStock.toLocaleString()}
        description="Total quantity of all items in stock."
        icon={Boxes}
        className="bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-background border border-blue-100/50 dark:border-blue-900/30"
        titleClassName="text-blue-600 dark:text-blue-400"
        iconClassName="text-blue-500 bg-blue-100 dark:bg-blue-900/50"
        valueClassName="text-blue-700 dark:text-blue-300"
      />
      <StatCard
        title="Total Stock Value"
        value={formatCurrency(totalStockValue, currencySymbol)}
        description="Total cost value of all inventory."
        icon={Warehouse}
        className="bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-background border border-purple-100/50 dark:border-purple-900/30"
        titleClassName="text-purple-600 dark:text-purple-400"
        iconClassName="text-purple-500 bg-purple-100 dark:bg-purple-900/50"
        valueClassName="text-purple-700 dark:text-purple-300"
      />
      <StatCard
        title="Potential Profit"
        value={formatCurrency(totalStockProfit, currencySymbol)}
        description="Estimated profit from selling all stock."
        icon={TrendingUp}
        className="bg-gradient-to-br from-green-50/50 to-white dark:from-green-950/20 dark:to-background border border-green-100/50 dark:border-green-900/30"
        titleClassName="text-green-600 dark:text-green-400"
        iconClassName="text-green-500 bg-green-100 dark:bg-green-900/50"
        valueClassName="text-green-700 dark:text-green-300"
      />
    </div>
  );
}
