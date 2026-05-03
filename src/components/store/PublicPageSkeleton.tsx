'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { StoreLinkLogo } from '../icons';
import { useSettings } from '@/contexts/settings-context';
import { cn } from '@/lib/utils';

export function PublicPageSkeleton() {
  const { settings } = useSettings();

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f5f7] dark:bg-[#000000] overflow-hidden" suppressHydrationWarning>
      {/* Premium Apple-style Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-[2px] bg-black/5 dark:bg-white/5 z-[100]">
        <div className="h-full bg-primary animate-progress-loading shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
      </div>

      {/* Header Skeleton - Clean Apple Style */}
      <header className="fixed top-0 z-50 w-full bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-b border-black/[0.05] dark:border-white/[0.05]" suppressHydrationWarning>
        <div className="max-w-[1400px] mx-auto px-6" suppressHydrationWarning>
          <div className="flex justify-between items-center h-16" suppressHydrationWarning>
            <div className="flex items-center gap-8" suppressHydrationWarning>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center animate-pulse">
                  <StoreLinkLogo className="h-5 w-5 text-primary/40" />
                </div>
                <Skeleton className="h-4 w-24 rounded-full opacity-50" />
              </div>
              <div className="hidden md:flex space-x-8 items-center" suppressHydrationWarning>
                <Skeleton className="h-3 w-12 rounded-full opacity-30" />
                <Skeleton className="h-3 w-16 rounded-full opacity-30" />
                <Skeleton className="h-3 w-14 rounded-full opacity-30" />
              </div>
            </div>
            <div className="flex items-center space-x-4" suppressHydrationWarning>
              <Skeleton className="h-8 w-8 rounded-full opacity-30" />
              <Skeleton className="h-8 w-20 rounded-full opacity-40" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="flex-1 pt-16" suppressHydrationWarning>
        <div className="space-y-16 pb-24" suppressHydrationWarning>
          
          {/* Hero Section Skeleton - More "Apple" feel */}
          <section className="px-6 pt-8 animate-in fade-in duration-1000">
            <div className="max-w-[1400px] mx-auto">
              <div className="relative aspect-[21/9] w-full overflow-hidden rounded-[2.5rem] bg-white dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] shadow-sm">
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-6">
                    <Skeleton className="h-12 w-3/4 max-w-2xl rounded-2xl opacity-40" />
                    <Skeleton className="h-6 w-1/2 max-w-md rounded-xl opacity-20" />
                    <div className="flex gap-4 pt-4">
                        <Skeleton className="h-12 w-40 rounded-full opacity-50" />
                        <Skeleton className="h-12 w-40 rounded-full opacity-20" />
                    </div>
                 </div>
                 {/* Shimmer overlay */}
                 <div className="absolute inset-0 skeleton-shimmer opacity-30" />
              </div>
            </div>
          </section>

          {/* Centered Logo Loading State - Robust & Perfect */}
          <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
             <div className="relative">
                <div className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl animate-pulse" />
                <div className="relative h-20 w-20 rounded-3xl bg-white dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.05] shadow-2xl flex items-center justify-center overflow-hidden">
                    <StoreLinkLogo className="h-10 w-10 text-primary animate-pulse" />
                    <div className="absolute inset-0 skeleton-shimmer opacity-20" />
                </div>
             </div>
             <div className="flex flex-col items-center space-y-3">
                <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <div 
                            key={i} 
                            className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" 
                            style={{ animationDelay: `${i * 0.15}s` }} 
                        />
                    ))}
                </div>
                <Skeleton className="h-3 w-32 rounded-full opacity-20" />
             </div>
          </div>

          {/* Minimal Section Layouts (No Cards as requested) */}
          <section className="max-w-[1400px] mx-auto px-6 space-y-12">
            <div className="flex flex-col items-start space-y-4">
              <Skeleton className="h-8 w-48 rounded-xl opacity-40" />
              <div className="w-full h-px bg-black/[0.05] dark:bg-white/[0.05]" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="h-64 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] skeleton-shimmer opacity-20" />
               <div className="h-64 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] skeleton-shimmer opacity-20" />
            </div>
          </section>

        </div>
      </main>

      {/* Footer Skeleton - Ultra Clean */}
      <footer className="bg-white dark:bg-black py-20 border-t border-black/[0.05] dark:border-white/[0.05]" suppressHydrationWarning>
        <div className="max-w-[1400px] mx-auto px-6" suppressHydrationWarning>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12" suppressHydrationWarning>
            <div className="col-span-2 space-y-6">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                        <StoreLinkLogo className="h-3 w-3 text-primary/40" />
                    </div>
                    <Skeleton className="h-4 w-32 rounded-full opacity-40" />
                </div>
                <div className="space-y-3">
                    <Skeleton className="h-3 w-full max-w-xs rounded-full opacity-20" />
                    <Skeleton className="h-3 w-full max-w-sm rounded-full opacity-20" />
                    <Skeleton className="h-3 w-2/3 rounded-full opacity-20" />
                </div>
            </div>
            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-6">
                    <Skeleton className="h-4 w-20 rounded-full opacity-40" />
                    <div className="space-y-4">
                        <Skeleton className="h-3 w-24 rounded-full opacity-20" />
                        <Skeleton className="h-3 w-28 rounded-full opacity-20" />
                        <Skeleton className="h-3 w-20 rounded-full opacity-20" />
                    </div>
                </div>
            ))}
          </div>
          <div className="mt-20 pt-8 border-t border-black/[0.05] dark:border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-6">
            <Skeleton className="h-3 w-48 rounded-full opacity-20" />
            <div className="flex gap-8">
              <Skeleton className="h-3 w-20 rounded-full opacity-20" />
              <Skeleton className="h-3 w-20 rounded-full opacity-20" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
