'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Heart, ShoppingCart, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/settings-context';

interface StickyProductBarProps {
  productName: string;
  productPrice: string;
  isInWishlist: boolean;
  isOutOfStock: boolean;
  onAddToCart: () => void;
  onToggleWishlist: () => void;
  addToCartText?: string;
  productImage?: string;
}

export function StickyProductBar({
  productName,
  productPrice,
  isInWishlist,
  isOutOfStock,
  onAddToCart,
  onToggleWishlist,
  addToCartText = 'Add to Bag',
  productImage
}: StickyProductBarProps) {
  const { settings } = useSettings();
  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    // Determine if user is scrolling up or down
    const scrollingUp = currentScrollY < lastScrollY;
    setIsScrollingUp(scrollingUp);
    
    // Show bar when:
    // 1. User has scrolled past 300px (product details are out of view)
    // 2. AND user is scrolling up (revealing the bar)
    const shouldShow = currentScrollY > 300 && (scrollingUp || lastScrollY > 300);
    
    setIsVisible(shouldShow);
    setLastScrollY(currentScrollY);

    // Debounce to reduce updates
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      // Small delay for smoother transitions
    }, 50);
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

  // Dynamic Button Style
  const buttonStyle = React.useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const style = useIndividual 
      ? (settings?.storeAddToCartStyle || 'standard')
      : (settings?.storeBtnStyle || 'standard');
    
    const getColor = () => {
      if (style === 'gradient') {
        return {
          background: `linear-gradient(135deg, ${settings?.storeAddToCartGradientStart || '#3b82f6'}, ${settings?.storeAddToCartGradientEnd || '#1d4ed8'})`,
          color: 'white',
          border: 'none'
        };
      } else if (style === 'image' && settings?.storeAddToCartImageUrl) {
        return {
          backgroundImage: `url('${settings.storeAddToCartImageUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          border: 'none'
        };
      } else if (style === 'outline') {
        return {
          backgroundColor: 'transparent',
          color: settings?.storeAddToCartColor || '#3b82f6',
          border: `2px solid ${settings?.storeAddToCartColor || '#3b82f6'}`
        };
      } else if (style === 'ghost') {
        return {
          backgroundColor: 'transparent',
          color: settings?.storeAddToCartColor || '#3b82f6',
          border: 'none'
        };
      } else if (style === 'apple') {
        const color = settings?.storeAddToCartColor || '#007AFF';
        return {
          background: `linear-gradient(180deg, ${color} 0%, ${color}ee 100%)`,
          color: 'white',
          border: '0.5px solid rgba(0,0,0,0.15)',
          boxShadow: `0 8px 20px -4px ${color}60, inset 0 1px 1px rgba(255, 255, 255, 0.25)`,
          fontWeight: '600',
          letterSpacing: '-0.02em',
        };
      }
      return {
        backgroundColor: settings?.storeAddToCartColor || '#3b82f6',
        color: 'white',
        border: 'none'
      };
    };
    
    return getColor();
  }, [settings]);

  // Button shape and size classes
  const buttonClasses = React.useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const shape = useIndividual 
      ? (settings?.storeAddToCartShape || 'lg')
      : (settings?.storeBtnShape || 'lg');
    const size = useIndividual
      ? (settings?.storeAddToCartSize || 'lg')
      : (settings?.storeBtnSize || 'md');
    const shadow = useIndividual
      ? (settings?.storeAddToCartShadow || 'sm')
      : 'sm';
    
    const sizeClasses: Record<string, string> = {
      sm: 'px-3 py-2 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-5 py-3 text-sm',
      xl: 'px-6 py-4 text-base'
    };

    const shapeClasses: Record<string, string> = {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full'
    };

    const shadowClasses: Record<string, string> = {
      none: 'shadow-none',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
      '2xl': 'shadow-2xl',
      inner: 'shadow-inner'
    };
    
    const sizeClass = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.lg;
    let shapeClass = shapeClasses[shape] || 'rounded-2xl';
    let shadowClass = shadowClasses[shadow as keyof typeof shadowClasses] || 'shadow-sm';

    const style = useIndividual 
      ? (settings?.storeAddToCartStyle || 'standard')
      : (settings?.storeBtnStyle || 'standard');

    if (style === 'apple') {
        shapeClass = 'rounded-xl';
        shadowClass = 'shadow-none';
    }

    return `${shapeClass} ${sizeClass} ${shadowClass}`;
  }, [settings]);

  return (
    /* Overlay bar - no spacer needed, content scrolls under it */
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-t-2 border-black/[0.06] dark:border-white/[0.1] transition-all duration-300 ease-out",
      isVisible ? "translate-y-0 opacity-100 shadow-2xl shadow-black/10" : "translate-y-full opacity-0 pointer-events-none"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4">
        {/* Product Info with Image */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Product Image */}
          {productImage && (
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 border-primary/20 dark:border-primary/30 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-sm hover:shadow-md transition-shadow">
              <Image
                src={productImage}
                alt={productName}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 56px, 64px"
                priority
              />
            </div>
          )}
          {/* Product Details */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-semibold text-[#86868b] truncate uppercase tracking-widest">
              {productName}
            </p>
            <p className="text-lg sm:text-xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
              {productPrice}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Wishlist Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleWishlist}
            className={cn(
              "h-10 w-10 sm:h-12 sm:w-12 rounded-full transition-all duration-300 hover:bg-black/5 dark:hover:bg-white/5",
              isInWishlist ? "text-rose-500" : "text-[#1d1d1f] dark:text-[#f5f5f7]"
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
            style={buttonStyle}
            className={cn(
              "font-semibold text-xs sm:text-sm tracking-tight transition-all duration-300 flex items-center gap-1.5 shrink-0 border-none shadow-sm active:scale-[0.98]",
              buttonClasses,
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
      {isVisible && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex justify-center">
          <ChevronUp className="h-5 w-5 text-primary/60 dark:text-primary/50 animate-bounce" />
        </div>
      )}
    </div>
  );
}
