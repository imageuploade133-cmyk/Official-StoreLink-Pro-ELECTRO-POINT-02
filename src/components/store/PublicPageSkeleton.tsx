'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ElysiumLogo } from '../icons';

export function PublicPageSkeleton() {
  return (
    <div className="flex flex-col min-h-screen" suppressHydrationWarning>
      {/* Header Skeleton */}
      <header className="fixed top-0 z-50 w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
          <div className="flex justify-between items-center h-16" suppressHydrationWarning>
            <div className="flex items-center gap-2" suppressHydrationWarning>
              <ElysiumLogo className="h-6 w-6" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="hidden md:flex space-x-8 items-center" suppressHydrationWarning>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center space-x-2" suppressHydrationWarning>
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 pt-16" suppressHydrationWarning>
        <div className="max-w mx-auto px-4 sm:px-6 lg:px-8 py-16" suppressHydrationWarning>
          <div className="space-y-16" suppressHydrationWarning>
            {/* Fluid aspect ratio skeleton for hero */}
            <Skeleton className="aspect-video w-full rounded-3xl" />

            {/* Grid section placeholder */}
            <div className="space-y-8" suppressHydrationWarning>
                <Skeleton className="h-10 w-1/3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-8" suppressHydrationWarning>
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Skeleton */}
      <footer className="bg-background-dark pt-20 pb-10" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12" suppressHydrationWarning>
            <div className="space-y-4" suppressHydrationWarning>
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="space-y-4" suppressHydrationWarning>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-4" suppressHydrationWarning>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-4" suppressHydrationWarning>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
