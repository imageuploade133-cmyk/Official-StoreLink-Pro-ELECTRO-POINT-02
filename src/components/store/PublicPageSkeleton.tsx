'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ElysiumLogo } from '../icons';

export function PublicPageSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black" suppressHydrationWarning>
      {/* Header Skeleton */}
      <header className="fixed top-0 z-50 w-full border-b border-black/[0.05] dark:border-white/[0.05] bg-white/80 dark:bg-black/80 backdrop-blur-xl" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
          <div className="flex justify-between items-center h-20" suppressHydrationWarning>
            <div className="flex items-center gap-3" suppressHydrationWarning>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                 <div className="h-6 w-6 rounded-lg bg-primary/20" />
              </div>
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <div className="hidden md:flex space-x-10 items-center" suppressHydrationWarning>
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
            <div className="flex items-center space-x-4" suppressHydrationWarning>
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 pt-20" suppressHydrationWarning>
        <div className="space-y-24 pb-24" suppressHydrationWarning>
          {/* Hero Carousel Skeleton */}
          <section className="px-4 sm:px-6 lg:px-8 pt-8">
            <div className="max-w-[1400px] mx-auto">
              <Skeleton className="aspect-[21/9] w-full rounded-[3rem] shadow-2xl" />
            </div>
          </section>

          {/* Brand Values Skeleton */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center text-center p-8 rounded-[2.5rem] border border-black/[0.05] dark:border-white/[0.05] space-y-4">
                  <Skeleton className="h-16 w-16 rounded-2xl" />
                  <Skeleton className="h-5 w-32 rounded-full" />
                  <Skeleton className="h-4 w-48 rounded-full opacity-60" />
                </div>
              ))}
            </div>
          </section>

          {/* Grid section placeholder (e.g. Products) */}
          <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12" suppressHydrationWarning>
            <div className="flex flex-col items-center space-y-4 text-center">
              <Skeleton className="h-12 w-64 rounded-full" />
              <Skeleton className="h-5 w-96 rounded-full opacity-60" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 md:gap-8" suppressHydrationWarning>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="aspect-square w-full rounded-[2rem]" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-2/3 rounded-full" />
                            <Skeleton className="h-4 w-full rounded-full" />
                            <div className="flex justify-between items-center pt-2">
                                <Skeleton className="h-6 w-16 rounded-full" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer Skeleton */}
      <footer className="bg-[#f5f5f7] dark:bg-[#1c1c1e] pt-24 pb-12 border-t border-black/[0.05] dark:border-white/[0.05]" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-16" suppressHydrationWarning>
            <div className="space-y-6" suppressHydrationWarning>
              <Skeleton className="h-8 w-40 rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-3/4 rounded-full" />
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-6" suppressHydrationWarning>
                <Skeleton className="h-5 w-24 rounded-full" />
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32 rounded-full" />
                  <Skeleton className="h-4 w-28 rounded-full" />
                  <Skeleton className="h-4 w-36 rounded-full" />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-black/[0.05] dark:border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-6">
            <Skeleton className="h-4 w-64 rounded-full" />
            <div className="flex gap-6">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
