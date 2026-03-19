'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRatingColor, getRatingBgColor, formatRating } from '@/lib/rating-utils';

interface ProductRatingProps {
  averageRating: number;
  totalReviews: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ProductRating({
  averageRating,
  totalReviews,
  size = 'md',
  showLabel = true,
  className
}: ProductRatingProps) {
  if (averageRating === 0 && totalReviews === 0) {
    return null;
  }

  // Calculate full stars and half star
  const fullStars = Math.floor(averageRating);
  const hasHalfStar = averageRating % 1 >= 0.5;

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Stars */}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="relative">
            {/* Background star */}
            <Star
              className={cn(
                sizeClasses[size],
                'text-slate-300 dark:text-slate-600'
              )}
            />
            {/* Filled star */}
            {i < fullStars && (
              <Star
                className={cn(
                  sizeClasses[size],
                  getRatingColor(averageRating),
                  'absolute top-0 left-0 fill-current'
                )}
              />
            )}
            {/* Half star */}
            {i === fullStars && hasHalfStar && (
              <div className="absolute top-0 left-0 overflow-hidden w-1/2">
                <Star
                  className={cn(
                    sizeClasses[size],
                    getRatingColor(averageRating),
                    'fill-current'
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rating Text */}
      {showLabel && (
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'font-bold',
            getRatingColor(averageRating),
            textSizeClasses[size]
          )}>
            {formatRating(averageRating)}
          </span>
          <span className={cn(
            'text-slate-500 dark:text-slate-400',
            textSizeClasses[size]
          )}>
            ({totalReviews})
          </span>
        </div>
      )}
    </div>
  );
}
