
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
        className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent dark:from-indigo-950/40 dark:via-indigo-900/10 dark:to-background border-2 border-indigo-500/20 hover:border-indigo-500/40"
        titleClassName="text-indigo-600 dark:text-indigo-400 font-bold"
        iconClassName="text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-900/40"
        valueClassName="text-indigo-700 dark:text-indigo-300 font-black"
      />
      <StatCard
        title="Today's Website Views"
        value={todayViews.toLocaleString()}
        icon={Activity}
        description="Unique page views recorded today."
        className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-900/10 dark:to-background border-2 border-emerald-500/20 hover:border-emerald-500/40"
        titleClassName="text-emerald-600 dark:text-emerald-400 font-bold"
        iconClassName="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-900/40"
        valueClassName="text-emerald-700 dark:text-emerald-300 font-black"
      />
      <StatCard
        title="Today's Online Orders"
        value={todayOrders.toLocaleString()}
        icon={ShoppingBag}
        description="Orders received in the last 24 hours."
        className="bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-950/40 dark:via-rose-900/10 dark:to-background border-2 border-rose-500/20 hover:border-rose-500/40"
        titleClassName="text-rose-600 dark:text-rose-400 font-bold"
        iconClassName="text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-900/40"
        valueClassName="text-rose-700 dark:text-rose-300 font-black"
        href="/dashboard/orders"
      />
      <StatCard
        title="Total Online Orders"
        value={totalOrders.toLocaleString()}
        icon={ShoppingBasket}
        description="Successful orders placed via the website."
        className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-amber-900/10 dark:to-background border-2 border-amber-500/20 hover:border-amber-500/40"
        titleClassName="text-amber-600 dark:text-amber-400 font-bold"
        iconClassName="text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-900/40"
        valueClassName="text-amber-700 dark:text-amber-300 font-black"
        href="/dashboard/orders"
      />
    </div>
  );
}
