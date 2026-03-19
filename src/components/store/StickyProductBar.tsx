'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StickyProductBarProps {
  productName: string;
  productPrice: string;
  isInWishlist: boolean;
  isOutOfStock: boolean;
  onAddToCart: () => void;
  onToggleWishlist: () => void;
  addToCartText?: string;
}

export function StickyProductBar({
  productName,
  productPrice,
  isInWishlist,
  isOutOfStock,
  onAddToCart,
  onToggleWishlist,
  addToCartText = 'Add to Bag'
}: StickyProductBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const handleScroll = useCallback(() => {
    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Show bar if scrolled more than 400px
    const shouldShow = window.scrollY > 400;
    setIsVisible(shouldShow);

    // Debounce scroll handler to prevent excessive updates
    scrollTimeoutRef.current = setTimeout(() => {
      // Cleanup after scroll ends
    }, 150);
  }, []);

  useEffect(() => {
    // Use passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  return (
    <>
      {/* Spacer to prevent layout shift */}
      <div className={cn(
        "h-0 transition-all duration-300",
        isVisible && "h-20"
      )} />

      {/* Sticky Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100 shadow-2xl" : "translate-y-full opacity-0 pointer-events-none"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">
              {productName}
            </p>
            <p className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              {productPrice}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Wishlist Button */}
            <Button
              size="icon"
              variant="outline"
              onClick={onToggleWishlist}
              className={cn(
                "h-11 w-11 sm:h-12 sm:w-12 rounded-full transition-all duration-300",
                isInWishlist ? "bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800" : ""
              )}
            >
              <Heart className={cn(
                "h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-300",
                isInWishlist ? "fill-rose-500 text-rose-500" : "text-slate-600 dark:text-slate-400"
              )} />
            </Button>

            {/* Add to Cart Button */}
            <Button
              onClick={onAddToCart}
              disabled={isOutOfStock}
              className={cn(
                "px-4 sm:px-6 py-2 sm:py-3 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 flex items-center gap-2 whitespace-nowrap",
                isOutOfStock && "opacity-50 cursor-not-allowed"
              )}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden sm:inline">{addToCartText}</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
