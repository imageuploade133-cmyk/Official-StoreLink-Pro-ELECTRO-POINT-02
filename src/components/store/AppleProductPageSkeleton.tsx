'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function AppleProductPageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white dark:bg-black min-h-screen">
      <div className="flex flex-col gap-8">
        {/* Breadcrumb skeleton */}
        <Skeleton className="h-4 w-64 rounded-full opacity-40" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-pulse">
          {/* Left column - Image gallery */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main image */}
            <Skeleton className="aspect-square w-full rounded-[2.5rem] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800" />
            
            {/* Thumbnail gallery */}
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          </div>
          
          {/* Right column - Product info */}
          <div className="lg:col-span-5 space-y-6">
            {/* Rating skeleton */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-800" />
                ))}
              </div>
              <Skeleton className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
            
            {/* Product title */}
            <Skeleton className="h-12 w-3/4 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            
            {/* Price section */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-32 rounded-xl bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-5 w-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
            
            {/* Variant selectors */}
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-3 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Quantity & Add to cart */}
            <div className="space-y-4 pt-6">
              <Skeleton className="h-4 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="flex gap-4">
                <Skeleton className="h-14 w-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <Skeleton className="h-14 flex-1 rounded-2xl bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700" />
              </div>
            </div>
            
            {/* Wishlist & Share */}
            <div className="flex gap-4 pt-4">
              <Skeleton className="h-12 flex-1 rounded-full bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
            
            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-4 pt-6">
              <Skeleton className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
