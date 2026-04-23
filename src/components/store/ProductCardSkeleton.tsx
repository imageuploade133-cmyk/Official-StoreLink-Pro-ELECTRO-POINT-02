
'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-white dark:bg-[#1d1d1f] rounded-3xl border border-black/[0.05] dark:border-white/[0.05] overflow-hidden h-full shadow-sm">
      <Skeleton className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800" />
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-1/3 rounded-full" />
          <Skeleton className="h-6 w-full rounded-full" />
          <Skeleton className="h-6 w-2/3 rounded-full" />
        </div>
        <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
