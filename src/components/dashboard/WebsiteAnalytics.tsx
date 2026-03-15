
'use client';

import React from 'react';
import { StatCard } from '@/components/StatCard';
import { Globe, Activity, ShoppingBasket, ShoppingBag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WebsiteAnalyticsProps {
  isLoading: boolean;
  totalViews: number;
  todayViews: number;
  totalOrders: number;
  todayOrders: number;
}

export function WebsiteAnalytics({
  isLoading,
  totalViews,
  todayViews,
  totalOrders,
  todayOrders,
}: WebsiteAnalyticsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <StatCard
        title="Total Website Views"
        value={totalViews.toLocaleString()}
        icon={Globe}
        description="Cumulative visits to your public store."
        className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30"
        titleClassName="text-indigo-600 dark:text-indigo-400"
        iconClassName="text-indigo-500"
        valueClassName="text-indigo-700 dark:text-indigo-300"
      />
      <StatCard
        title="Today's Website Views"
        value={todayViews.toLocaleString()}
        icon={Activity}
        description="Unique page views recorded today."
        className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30"
        titleClassName="text-emerald-600 dark:text-emerald-400"
        iconClassName="text-emerald-500"
        valueClassName="text-emerald-700 dark:text-emerald-300"
      />
      <StatCard
        title="Today's Online Orders"
        value={todayOrders.toLocaleString()}
        icon={ShoppingBag}
        description="Orders received in the last 24 hours."
        className="bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30"
        titleClassName="text-rose-600 dark:text-rose-400"
        iconClassName="text-rose-500"
        valueClassName="text-rose-700 dark:text-rose-300"
      />
      <StatCard
        title="Total Online Orders"
        value={totalOrders.toLocaleString()}
        icon={ShoppingBasket}
        description="Successful orders placed via the website."
        className="bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30"
        titleClassName="text-amber-600 dark:text-amber-400"
        iconClassName="text-amber-500"
        valueClassName="text-amber-700 dark:text-amber-300"
      />
    </div>
  );
}
