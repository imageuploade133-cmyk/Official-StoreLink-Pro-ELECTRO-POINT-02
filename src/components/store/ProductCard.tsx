
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Heart, CheckCircle2, Zap, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/contexts/cart-context';
import { useWishlist } from '@/contexts/wishlist-context';
import { useSettings } from '@/contexts/settings-context';
import { formatCurrency } from '@/lib/formatUtils';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { StockBar } from './StockBar';
import { ProductRating } from './ProductRating';
import { ProductLoadingOverlay } from './ProductLoadingOverlay';
import type { Product, Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { calculateRatingStats } from '@/lib/rating-utils';
import { useProductReviews } from '@/hooks/use-product-reviews';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  category?: Category;
  currencySymbol: string;
}

export function ProductCard({ product, category, currencySymbol }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isProductInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { settings } = useSettings();
  const [today, setToday] = useState<Date | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const { reviews } = useProductReviews(product.id);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const isInWishlist = isProductInWishlist(product.id);

  // Calculate rating stats from reviews
  const ratingStats = calculateRatingStats(reviews);

  // Pricing Engine logic
  const effectivePrice = useMemo(() => 
    calculateEffectivePrice(product as any, today, category), 
    [product, today, category]
  );

  const isDiscounted = effectivePrice < product.sellingPrice;
  const isOutOfStock = product.stock <= 0;

  const discountPercentage = useMemo(() => {
    if (!isDiscounted) return 0;
    return Math.round(((product.sellingPrice - effectivePrice) / product.sellingPrice) * 100);
  }, [isDiscounted, product.sellingPrice, effectivePrice]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, effectivePrice);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product.id);
    }
  };

  const handleProductClick = () => {
    setIsLoadingProduct(true);
  };

  // Dynamic Button Style
  const buttonStyle = useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const style = useIndividual 
      ? (settings?.storeGridCartStyle || 'standard')
      : (settings?.storeBtnStyle || 'standard');
    
    const getColor = () => {
      if (useIndividual) {
        if (style === 'gradient') {
          return {
            background: `linear-gradient(135deg, ${settings?.storeGridCartGradientStart || '#10b981'}, ${settings?.storeGridCartGradientEnd || '#059669'})`,
            color: 'white',
            border: 'none'
          };
        }
        return {
          backgroundColor: settings?.storeGridCartColor || '#10b981',
          color: 'white',
          border: 'none'
        };
      }
      // Global settings
      if (style === 'gradient') {
        return {
          background: `linear-gradient(135deg, ${settings?.storeBtnGradientStart || '#3b82f6'}, ${settings?.storeBtnGradientEnd || '#1d4ed8'})`,
          color: 'white',
          border: 'none'
        };
      }
      return {
        backgroundColor: settings?.storeBtnColor || '#3b82f6',
        color: 'white',
        border: 'none'
      };
    };
    
    return getColor();
  }, [settings]);

  // Button shape and size classes
  const buttonClasses = useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const shape = useIndividual 
      ? (settings?.storeGridCartShape || 'rounded-lg')
      : (settings?.storeBtnShape || 'rounded-xl');
    const size = useIndividual
      ? (settings?.storeGridCartSize || 'md')
      : (settings?.storeBtnSize || 'md');
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-sm',
      xl: 'px-6 py-3 text-base'
    };
    
    return `${shape} ${sizeClasses[size]}`;
  }, [settings]);

  // Calculate media area height based on card height setting (60% of total height)
  const totalCardHeight = settings?.productCardHeight || 380;
  const mediaHeight = Math.round((totalCardHeight * 60) / 100);

  return (
    <>
      <ProductLoadingOverlay isVisible={isLoadingProduct} productName={product.name} />
      <div 
        className={`group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all duration-500 hover:border-primary/30 overflow-hidden h-full ${styles.cardContainer}`}
        style={{ height: `${totalCardHeight}px` }}
      >
        {/* Media Area with Enhanced Hover */}
        <Link href={`/store/product/${product.id}`} onClick={handleProductClick} className={`block relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 ${styles.mediaArea}`} style={{ height: `${mediaHeight}px` }}>
        <Image
          src={product.imageUrl || settings?.defaultProductImageUrl || 'https://placehold.co/600x600.png'}
          alt={product.name}
          fill
          className={cn(
            `object-cover transition-all duration-700 ${styles.productImage}`,
            isOutOfStock && "opacity-40 grayscale"
          )}
          unoptimized
        />
        
        {/* Enhanced Badges with Animations */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
          {product.isOfficialBrand && (
            <Badge className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1.5 shadow-lg border-none rounded-full w-fit ${styles.badgeSlide}`}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-2 fill-current" /> Official
            </Badge>
          )}
          
          {isDiscounted && !isOutOfStock && today && (
            <Badge 
              className={`text-white font-black text-[10px] uppercase tracking-widest px-3 py-1.5 shadow-lg border-none rounded-full w-fit ${styles.discountBadge}`}
              style={{ 
                  background: `linear-gradient(135deg, ${settings?.flashHubColor || '#e11d48'}, ${settings?.flashHubColor || '#e11d48'}dd)`,
                  boxShadow: `0 8px 16px ${settings?.flashHubColor || '#e11d48'}44`
              }}
            >
              <Zap 
                  className="h-3 w-3 mr-1 fill-current" 
                  style={{ color: settings?.flashHubIconColor || '#fbbf24' }}
              /> 
              -{discountPercentage}%
            </Badge>
          )}
        </div>

        {/* Enhanced Wishlist Button with Pulse */}
        <button
          className={cn(
            `absolute top-4 right-4 h-11 w-11 flex items-center justify-center rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-lg transition-all duration-300 z-10 border border-white/30 dark:border-slate-600 hover:scale-110 active:scale-95 dark:hover:border-rose-500`,
            isInWishlist && `text-rose-500 ${styles.wishlistPulse}`
          )}
          onClick={handleWishlistToggle}
        >
          <Heart className={cn("h-5.5 w-5.5 transition-all duration-300 dark:text-slate-300", isInWishlist && "fill-current text-rose-500")} />
        </button>

        {/* Enhanced Quick Add Bottom Bar (MD+) */}
        <div className={`absolute inset-x-0 bottom-0 p-5 translate-y-full group-hover:translate-y-0 transition-all duration-500 hidden md:block z-20 ${styles.quickAddBar}`}>
          <Button 
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            style={buttonStyle}
            className={`w-full font-black text-sm uppercase tracking-wide shadow-xl transition-all active:scale-95 ${styles.cartButton} ${buttonClasses} hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ShoppingCart className={`h-5 w-5 mr-2 transition-all ${styles.cartIcon}`} />
            {settings?.storeGridCartText || 'Add to Bag'}
          </Button>
        </div>
      </Link>

      {/* Content Area with Smooth Transitions */}
      <div className={`flex flex-col flex-1 p-5 space-y-4 ${styles.contentArea}`}>
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-start gap-2">
            <p className={`text-[10px] font-black uppercase tracking-widest text-primary/60 truncate flex-1 transition-colors ${styles.categoryText}`}>
                {category?.name || product.categoryName || 'Collection'}
            </p>
            {isOutOfStock && (
              <Badge variant="destructive" className="text-[8px] h-5 uppercase font-black tracking-wider px-2 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">
                Sold Out
              </Badge>
            )}
          </div>
          
          <h3 className={`text-sm sm:text-base font-black text-slate-900 dark:text-white line-clamp-2 leading-snug tracking-tight transition-colors duration-300 h-12 break-words ${styles.productName}`}>
            {product.name}
          </h3>

          {/* Product Rating Display */}
          {settings?.showReviewRatingOnCard && ratingStats.totalReviews > 0 && (
            <div className="flex items-center -ml-2">
              <ProductRating
                averageRating={ratingStats.averageRating}
                totalReviews={ratingStats.totalReviews}
                size="sm"
                showLabel={true}
              />
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {product.isNewArrival && (
              <Badge variant="secondary" className={`bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 text-indigo-700 dark:text-indigo-300 text-[9px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-700 rounded-full h-5 px-2.5 ${styles.badgeNew}`}>
                <Sparkles className="h-3 w-3 mr-1" /> New
              </Badge>
            )}
            {product.isPopular && (
              <Badge variant="secondary" className={`bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 text-rose-700 dark:text-rose-300 text-[9px] font-black uppercase tracking-widest border border-rose-200 dark:border-rose-700 rounded-full h-5 px-2.5 ${styles.badgePopular}`}>
                <TrendingUp className="h-3 w-3 mr-1" /> Best
              </Badge>
            )}
          </div>
        </div>

        <div className={`space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 ${styles.priceSection}`}>
          <StockBar 
            stock={product.stock} 
            lowStockThreshold={product.lowStockThreshold || 10} 
          />

          <div className="flex items-end justify-between">
            <div className="flex flex-col flex-1 min-w-0 pr-3">
              {!today ? (
                <Skeleton className="h-8 w-24 rounded-lg" suppressHydrationWarning />
              ) : (
                <div className="flex flex-col overflow-hidden">
                  <span className={cn(
                    `text-lg sm:text-xl font-black tracking-tight leading-none truncate transition-colors duration-300`,
                    isDiscounted ? "text-amber-600 dark:text-amber-500" : "text-slate-900 dark:text-white"
                  )}>
                    {formatCurrency(effectivePrice, currencySymbol)}
                  </span>
                  {isDiscounted && (
                    <span className={`text-[10px] text-slate-400 dark:text-slate-500 line-through font-bold mt-1.5 truncate transition-colors ${styles.originalPrice}`}>
                      {formatCurrency(product.sellingPrice, currencySymbol)}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Mobile Quick Add with Enhanced Button */}
            <div className="md:hidden shrink-0">
              <Button 
                size="icon" 
                style={buttonStyle}
                className={`shadow-lg shadow-primary/30 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses} ${styles.mobileCartButton}`}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <ShoppingCart className={`h-5 w-5 transition-all ${styles.mobileCartIcon}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
