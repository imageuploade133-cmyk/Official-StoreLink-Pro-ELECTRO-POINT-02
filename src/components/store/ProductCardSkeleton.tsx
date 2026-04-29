
'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-white dark:bg-[#1c1c1e] rounded-[2rem] border border-black/[0.05] dark:border-white/[0.08] overflow-hidden h-full shadow-sm group">
      {/* Image Placeholder */}
      <Skeleton className="relative aspect-square w-full bg-slate-100 dark:bg-slate-900/50" />
      
      <div className="p-5 space-y-5 flex-1 flex flex-col">
        <div className="space-y-3 flex-1">
          {/* Category Placeholder */}
          <Skeleton className="h-3 w-1/4 rounded-full opacity-60" />
          
          {/* Title Placeholder */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-full rounded-full" />
            <Skeleton className="h-5 w-4/5 rounded-full" />
          </div>
          
          {/* Rating/Meta Placeholder */}
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-3 rounded-full opacity-40" />
            ))}
          </div>
        </div>
        
        {/* Footer Placeholder */}
        <div className="pt-4 border-t border-black/[0.03] dark:border-white/[0.03] space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
               <Skeleton className="h-3 w-12 rounded-full opacity-40" />
               <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <Skeleton className="h-12 w-12 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
