'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, ShoppingCart, ChevronUp } from 'lucide-react';
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
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    // Show bar when scrolling down past 400px or anytime after that
    const shouldShow = currentScrollY > 400;
    
    setIsVisible(shouldShow);
    setLastScrollY(currentScrollY);

    // Debounce to reduce updates
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      // Small delay for smoother transitions
    }, 100);
  }, [lastScrollY]);

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
    /* Overlay bar - no spacer needed, content scrolls under it */
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-all duration-300 ease-out",
      isVisible ? "translate-y-0 opacity-100 shadow-lg shadow-slate-900/10" : "translate-y-full opacity-0 pointer-events-none"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between gap-3 sm:gap-4">
        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 truncate uppercase tracking-wide">
            {productName}
          </p>
          <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {productPrice}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Wishlist Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleWishlist}
            className={cn(
              "h-12 w-12 rounded-2xl transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800",
              isInWishlist ? "text-rose-500" : "text-slate-600 dark:text-slate-400"
            )}
          >
            <Heart className={cn(
              "h-5 w-5 transition-all duration-300",
              isInWishlist && "fill-current"
            )} />
          </Button>

          {/* Add to Cart Button */}
          <Button
            onClick={onAddToCart}
            disabled={isOutOfStock}
            className={cn(
              "px-4 sm:px-6 py-3 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wide transition-all duration-300 flex items-center gap-1.5 shrink-0",
              isOutOfStock && "opacity-50 cursor-not-allowed"
            )}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">{addToCartText}</span>
            <span className="sm:hidden text-xs">Add</span>
          </Button>
        </div>
      </div>
      
      {/* Visual indicator */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex justify-center">
        <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-600 animate-bounce" />
      </div>
    </div>
  );
}
