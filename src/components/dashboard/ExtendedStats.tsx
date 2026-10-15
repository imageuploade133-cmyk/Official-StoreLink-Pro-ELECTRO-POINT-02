'use client';

import React, { useMemo } from 'react';
import { StatCard } from '@/components/StatCard';
import { Receipt, MousePointerClick, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { Skeleton } from '@/components/ui/skeleton';
import type { SaleTransaction } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { convertToDateSafely } from '@/lib/utils';

interface ExtendedStatsProps {
  isLoading: boolean;
  allSales: SaleTransaction[];
  todayAdClicks: number;
  totalAdClicks: number;
}

export function ExtendedStats({
  isLoading,
  allSales,
  todayAdClicks,
  totalAdClicks,
}: ExtendedStatsProps) {
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  const { todayTax, monthTax, todayCreditPayments, monthCreditPayments } = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    let todayTax = 0;
    let monthTax = 0;
    let todayCreditPayments = 0;
    let monthCreditPayments = 0;

    allSales.forEach(sale => {
      const saleDate = convertToDateSafely(sale.createdAt);
      if (!saleDate) return;

      if (sale.taxRate && sale.taxRate > 0) {
        const taxAmount = sale.taxAmountCalculated || 0;
        if (saleDate >= todayStart && saleDate <= todayEnd) {
          todayTax += taxAmount;
        }
        if (saleDate >= monthStart && saleDate <= monthEnd) {
          monthTax += taxAmount;
        }
      }

      if (sale.paymentHistory && Array.isArray(sale.paymentHistory)) {
        sale.paymentHistory.forEach(payment => {
          const paymentDate = convertToDateSafely(payment.paymentDate);
          if (!paymentDate) return;

          if (paymentDate >= todayStart && paymentDate <= todayEnd) {
            todayCreditPayments += payment.amountPaid;
          }
          if (paymentDate >= monthStart && paymentDate <= monthEnd) {
            monthCreditPayments += payment.amountPaid;
          }
        });
      }
    });

    return {
      todayTax,
      monthTax,
      todayCreditPayments,
      monthCreditPayments
    };
  }, [allSales]);

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6 mb-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
      <StatCard
        title="Today's Tax/VAT"
        value={formatCurrency(todayTax, currencySymbol)}
        icon={Receipt}
        description="Tax collected from today's sales."
        className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent dark:from-orange-950/40 dark:via-orange-900/10 dark:to-background border-2 border-orange-500/20 hover:border-orange-500/40"
        titleClassName="text-orange-600 dark:text-orange-400 font-bold"
        iconClassName="text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-900/40"
        valueClassName="text-orange-700 dark:text-orange-300 font-black"
        href="/dashboard/tax-vat"
      />
      <StatCard
        title="This Month's Tax/VAT"
        value={formatCurrency(monthTax, currencySymbol)}
        icon={Receipt}
        description="Tax collected this month."
        className="bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent dark:from-cyan-950/40 dark:via-cyan-900/10 dark:to-background border-2 border-cyan-500/20 hover:border-cyan-500/40"
        titleClassName="text-cyan-600 dark:text-cyan-400 font-bold"
        iconClassName="text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 dark:bg-cyan-900/40"
        valueClassName="text-cyan-700 dark:text-cyan-300 font-black"
        href="/dashboard/tax-vat"
      />
      <StatCard
        title="Today's Credit Payments"
        value={formatCurrency(todayCreditPayments, currencySymbol)}
        icon={CreditCard}
        description="Payments received from credit sales today."
        className="bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent dark:from-teal-950/40 dark:via-teal-900/10 dark:to-background border-2 border-teal-500/20 hover:border-teal-500/40"
        titleClassName="text-teal-600 dark:text-teal-400 font-bold"
        iconClassName="text-teal-600 dark:text-teal-400 bg-teal-500/10 dark:bg-teal-900/40"
        valueClassName="text-teal-700 dark:text-teal-300 font-black"
        href="/dashboard/my-sales"
      />
      <StatCard
        title="This Month's Credit Payments"
        value={formatCurrency(monthCreditPayments, currencySymbol)}
        icon={CreditCard}
        description="Payments received from credit sales this month."
        className="bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent dark:from-violet-950/40 dark:via-violet-900/10 dark:to-background border-2 border-violet-500/20 hover:border-violet-500/40"
        titleClassName="text-violet-600 dark:text-violet-400 font-bold"
        iconClassName="text-violet-600 dark:text-violet-400 bg-violet-500/10 dark:bg-violet-900/40"
        valueClassName="text-violet-700 dark:text-violet-300 font-black"
        href="/dashboard/my-sales"
      />
      <StatCard
        title="Today's Ad Clicks"
        value={todayAdClicks.toLocaleString()}
        icon={MousePointerClick}
        description="Ad clicks recorded today."
        className="bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-transparent dark:from-pink-950/40 dark:via-pink-900/10 dark:to-background border-2 border-pink-500/20 hover:border-pink-500/40"
        titleClassName="text-pink-600 dark:text-pink-400 font-bold"
        iconClassName="text-pink-600 dark:text-pink-400 bg-pink-500/10 dark:bg-pink-900/40"
        valueClassName="text-pink-700 dark:text-pink-300 font-black"
        href="/dashboard/earn-money-ads"
      />
      <StatCard
        title="Total Ad Clicks"
        value={totalAdClicks.toLocaleString()}
        icon={MousePointerClick}
        description="Total ad clicks recorded."
        className="bg-gradient-to-br from-fuchsia-500/10 via-fuchsia-500/5 to-transparent dark:from-fuchsia-950/40 dark:via-fuchsia-900/10 dark:to-background border-2 border-fuchsia-500/20 hover:border-fuchsia-500/40"
        titleClassName="text-fuchsia-600 dark:text-fuchsia-400 font-bold"
        iconClassName="text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/10 dark:bg-fuchsia-900/40"
        valueClassName="text-fuchsia-700 dark:text-fuchsia-300 font-black"
        href="/dashboard/earn-money-ads"
      />
    </div>
  );
}
