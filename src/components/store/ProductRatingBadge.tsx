'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRatingColor, getRatingBgColor, formatRating } from '@/lib/rating-utils';

interface ProductRatingBadgeProps {
  averageRating: number;
  totalReviews: number;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

/**
 * A badge-style rating display for product cards
 * variant='default': Shows stars with rating and count
 * variant='compact': Shows only rating number
 * variant='detailed': Shows stars, rating, count in a larger format
 */
export function ProductRatingBadge({
  averageRating,
  totalReviews,
  variant = 'default',
  className
}: ProductRatingBadgeProps) {
  if (averageRating === 0 && totalReviews === 0) {
    return null;
  }

  const fullStars = Math.floor(averageRating);
  const hasHalfStar = averageRating % 1 >= 0.5;

  if (variant === 'compact') {
    return (
      <div className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
        getRatingBgColor(averageRating),
        getRatingColor(averageRating),
        className
      )}>
        <Star className="h-3 w-3 fill-current" />
        <span>{formatRating(averageRating)}</span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn(
        'flex flex-col gap-2 p-3 rounded-lg',
        getRatingBgColor(averageRating),
        className
      )}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="relative">
                <Star className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                {i < fullStars && (
                  <Star className={cn(
                    'h-4 w-4 absolute top-0 left-0 fill-current',
                    getRatingColor(averageRating)
                  )} />
                )}
                {i === fullStars && hasHalfStar && (
                  <div className="absolute top-0 left-0 overflow-hidden w-1/2">
                    <Star className={cn(
                      'h-4 w-4 fill-current',
                      getRatingColor(averageRating)
                    )} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <span className={cn('text-sm font-bold', getRatingColor(averageRating))}>
            {formatRating(averageRating)}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
        </p>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
      getRatingBgColor(averageRating),
      className
    )}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="relative">
            <Star className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
            {i < fullStars && (
              <Star className={cn(
                'h-3.5 w-3.5 absolute top-0 left-0 fill-current',
                getRatingColor(averageRating)
              )} />
            )}
            {i === fullStars && hasHalfStar && (
              <div className="absolute top-0 left-0 overflow-hidden w-1/2">
                <Star className={cn(
                  'h-3.5 w-3.5 fill-current',
                  getRatingColor(averageRating)
                )} />
              </div>
            )}
          </div>
        ))}
      </div>
      <span className={cn('text-xs font-bold', getRatingColor(averageRating))}>
        {formatRating(averageRating)}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        ({totalReviews})
      </span>
    </div>
  );
}
