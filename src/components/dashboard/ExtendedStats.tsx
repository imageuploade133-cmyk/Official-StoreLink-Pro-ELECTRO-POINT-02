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

      // Calculate Tax
      if (sale.taxRate && sale.taxRate > 0) {
        const taxAmount = sale.taxAmountCalculated || 0;
        if (saleDate >= todayStart && saleDate <= todayEnd) {
          todayTax += taxAmount;
        }
        if (saleDate >= monthStart && saleDate <= monthEnd) {
          monthTax += taxAmount;
        }
      }

      // Calculate Credit Payments from payment history
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
        className="bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/20 dark:to-background border border-orange-100/50 dark:border-orange-900/30"
        titleClassName="text-orange-600 dark:text-orange-400"
        iconClassName="text-orange-500 bg-orange-100 dark:bg-orange-900/50"
        valueClassName="text-orange-700 dark:text-orange-300"
      />
      <StatCard
        title="This Month's Tax/VAT"
        value={formatCurrency(monthTax, currencySymbol)}
        icon={Receipt}
        description="Tax collected this month."
        className="bg-gradient-to-br from-cyan-50/50 to-white dark:from-cyan-950/20 dark:to-background border border-cyan-100/50 dark:border-cyan-900/30"
        titleClassName="text-cyan-600 dark:text-cyan-400"
        iconClassName="text-cyan-500 bg-cyan-100 dark:bg-cyan-900/50"
        valueClassName="text-cyan-700 dark:text-cyan-300"
      />
      <StatCard
        title="Today's Credit Payments"
        value={formatCurrency(todayCreditPayments, currencySymbol)}
        icon={CreditCard}
        description="Payments received from credit sales today."
        className="bg-gradient-to-br from-teal-50/50 to-white dark:from-teal-950/20 dark:to-background border border-teal-100/50 dark:border-teal-900/30"
        titleClassName="text-teal-600 dark:text-teal-400"
        iconClassName="text-teal-500 bg-teal-100 dark:bg-teal-900/50"
        valueClassName="text-teal-700 dark:text-teal-300"
      />
      <StatCard
        title="This Month's Credit Payments"
        value={formatCurrency(monthCreditPayments, currencySymbol)}
        icon={CreditCard}
        description="Payments received from credit sales this month."
        className="bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-950/20 dark:to-background border border-violet-100/50 dark:border-violet-900/30"
        titleClassName="text-violet-600 dark:text-violet-400"
        iconClassName="text-violet-500 bg-violet-100 dark:bg-violet-900/50"
        valueClassName="text-violet-700 dark:text-violet-300"
      />
      <StatCard
        title="Today's Ad Clicks"
        value={todayAdClicks.toLocaleString()}
        icon={MousePointerClick}
        description="Ad clicks recorded today."
        className="bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-950/20 dark:to-background border border-pink-100/50 dark:border-pink-900/30"
        titleClassName="text-pink-600 dark:text-pink-400"
        iconClassName="text-pink-500 bg-pink-100 dark:bg-pink-900/50"
        valueClassName="text-pink-700 dark:text-pink-300"
      />
      <StatCard
        title="Total Ad Clicks"
        value={totalAdClicks.toLocaleString()}
        icon={MousePointerClick}
        description="Total ad clicks recorded."
        className="bg-gradient-to-br from-fuchsia-50/50 to-white dark:from-fuchsia-950/20 dark:to-background border border-fuchsia-100/50 dark:border-fuchsia-900/30"
        titleClassName="text-fuchsia-600 dark:text-fuchsia-400"
        iconClassName="text-fuchsia-500 bg-fuchsia-100 dark:bg-fuchsia-900/50"
        valueClassName="text-fuchsia-700 dark:text-fuchsia-300"
      />
    </div>
  );
}
