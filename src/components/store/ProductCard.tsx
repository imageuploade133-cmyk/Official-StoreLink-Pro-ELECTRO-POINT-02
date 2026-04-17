
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Heart, 
  CheckCircle2, 
  Zap, 
  Sparkles, 
  TrendingUp,
  ShoppingBag,
  Plus,
  Check,
  ArrowRight,
  Package
} from 'lucide-react';
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
import { useStoreUrl } from '@/hooks/use-store-url';

interface ProductCardProps {
  product: Product;
  category?: Category;
  currencySymbol: string;
}

export function ProductCard({ product, category, currencySymbol }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isProductInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { settings } = useSettings();
  const { getStoreUrl } = useStoreUrl();
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

  const GridCartIcon = useMemo(() => {
    const iconName = settings?.storeGridCartIcon || 'ShoppingCart';
    const iconMap: Record<string, any> = {
      ShoppingCart, ShoppingBag, Plus, Check, CheckCircle2, Zap, ArrowRight, Package
    };
    return iconMap[iconName] || ShoppingCart;
  }, [settings?.storeGridCartIcon]);

  // Dynamic Button Style
  const buttonStyle = useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const style = useIndividual 
      ? (settings?.storeGridCartStyle || 'standard')
      : (settings?.storeBtnStyle || 'standard');
    
    if (style === 'gradient') {
      return {
        background: `linear-gradient(135deg, ${settings?.storeGridCartGradientStart || '#10b981'}, ${settings?.storeGridCartGradientEnd || '#059669'})`,
        color: 'white',
        border: 'none'
      };
    } else if (style === 'image' && settings?.storeGridCartImageUrl) {
      return {
        backgroundImage: `url('${settings.storeGridCartImageUrl}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        border: 'none'
      };
    } else if (style === 'outline') {
      return {
        backgroundColor: 'transparent',
        color: settings?.storeGridCartColor || '#10b981',
        border: `2px solid ${settings?.storeGridCartColor || '#10b981'}`
      };
    } else if (style === 'ghost') {
      return {
        backgroundColor: 'transparent',
        color: settings?.storeGridCartColor || '#10b981',
        border: 'none'
      };
    }
    
    return {
      backgroundColor: settings?.storeGridCartColor || '#10b981',
      color: 'white',
      border: 'none'
    };
  }, [settings]);

  // Button shape and size classes
  const buttonClasses = useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const shape = useIndividual 
      ? (settings?.storeGridCartShape || 'lg')
      : (settings?.storeBtnShape || 'lg');
    const size = useIndividual
      ? (settings?.storeGridCartSize || 'md')
      : (settings?.storeBtnSize || 'md');
    
    const sizeClasses: Record<string, string> = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-sm',
      xl: 'px-6 py-3 text-base'
    };

    const shapeClasses: Record<string, string> = {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-2xl',
      full: 'rounded-full'
    };
    
    const sizeClass = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md;
    const shapeClass = shapeClasses[shape] || 'rounded-2xl';
    const shadowClass = '';

    return `${shapeClass} ${sizeClass} ${shadowClass}`;
  }, [settings]);

  // Calculate media area height based on card height setting (60% of total height)
  const totalCardHeight = settings?.productCardHeight || 380;
  const mediaHeight = Math.round((totalCardHeight * 60) / 100);

  // Get card designer settings with defaults
  const cardStyle = settings?.productCardStyle || 'default';
  const borderRadius = settings?.productCardBorderRadius || 'lg';
  const borderWidth = settings?.productCardBorderWidth || 'thin';
  const borderColor = settings?.productCardBorderColor || '#e2e8f0';
  const bgColor = settings?.productCardBgColor || '#ffffff';
  const hoverEffect = settings?.productCardHoverEffect || 'lift';
  const showImage = settings?.productCardShowImage !== false;
  const showBadges = settings?.productCardShowBadges !== false;
  const showRating = settings?.productCardShowRating !== false;
  const showStockBar = settings?.productCardShowStockBar !== false;
  const showWishlist = settings?.productCardShowWishlist !== false;
  const showQuickAdd = settings?.productCardShowQuickAdd !== false;
  const titleLines = settings?.productCardTitleLines || 2;

  // Map border radius to Tailwind class
  const borderRadiusClass = {
    'none': 'rounded-none',
    'sm': 'rounded-sm',
    'md': 'rounded-md',
    'lg': 'rounded-lg',
    'xl': 'rounded-xl',
    'full': 'rounded-3xl',
  }[borderRadius] || 'rounded-lg';

  const shadowClass = '';

  // Map border width to Tailwind class
  const borderWidthClass = {
    'none': 'border-0',
    'thin': 'border',
    'medium': 'border-2',
    'thick': 'border-4',
  }[borderWidth] || 'border';

  // Hover effect classes
  const hoverEffectClass = {
    'none': '',
    'lift': 'hover:-translate-y-2',
    'zoom': '',
    'glow': '',
    'border': 'hover:border-primary',
  }[hoverEffect] || 'hover:-translate-y-2';

  // Custom HTML template rendering
  if (cardStyle === 'custom' && settings?.productCardCustomHtml) {
    return (
      <>
        <ProductLoadingOverlay isVisible={isLoadingProduct} productName={product.name} />
        <CustomHtmlCard
          html={settings.productCardCustomHtml}
          product={product}
          category={category}
          currencySymbol={currencySymbol}
          effectivePrice={effectivePrice}
          isDiscounted={isDiscounted}
          discountPercentage={discountPercentage}
          isOutOfStock={isOutOfStock}
          isInWishlist={isInWishlist}
          onWishlistToggle={handleWishlistToggle}
          onAddToCart={handleAddToCart}
          onProductClick={handleProductClick}
          ratingStats={ratingStats}
          settings={settings}
          getStoreUrl={getStoreUrl}
        />
      </>
    );
  }

  return (
    <>
      <ProductLoadingOverlay isVisible={isLoadingProduct} productName={product.name} />
      <div 
        className={cn(
          `group relative flex flex-col dark:bg-slate-900 transition-all duration-500 overflow-hidden h-full ${styles.cardContainer}`,
          borderRadiusClass,
          shadowClass,
          borderWidthClass,
          hoverEffectClass
        )}
        style={{ 
          minHeight: `${totalCardHeight}px`,
          height: 'auto',
          borderColor: borderColor,
          backgroundColor: bgColor,
        }}
      >
        {/* Media Area with Enhanced Hover */}
        {showImage && (
        <Link href={getStoreUrl(`/store/product/${product.id}`)} onClick={handleProductClick} className={`block relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 ${styles.mediaArea}`} style={{ height: `${mediaHeight}px` }}>
        <Image
          src={product.imageUrl || settings?.defaultProductImageUrl || 'https://placehold.co/600x600.png'}
          alt={product.name}
          fill
          className={cn(
            `object-cover transition-all duration-700 ${styles.productImage}`,
            isOutOfStock && "opacity-40 grayscale",
            hoverEffect === 'zoom' && 'group-hover:scale-110'
          )}
          unoptimized
        />
        
        {/* Enhanced Badges with Animations */}
        {showBadges && (
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
          {product.isOfficialBrand && (
            <Badge className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text uppercase tracking-widest px-3 py-1.5  border-none rounded-full w-fit ${styles.badgeSlide}`}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-2 fill-current" /> Official
            </Badge>
          )}
          
          {isDiscounted && !isOutOfStock && today && (
            <Badge 
              className={`text-white font-black text uppercase tracking-widest px-3 py-1.5  border-none rounded-full w-fit ${styles.discountBadge}`}
              style={{ 
                  background: `linear-gradient(135deg, ${settings?.flashHubColor || '#e11d48'}, ${settings?.flashHubColor || '#e11d48'}dd)`,
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
        )}

        {/* Enhanced Wishlist Button with Pulse */}
        {showWishlist && (
        <button
          className={cn(
            `absolute top-4 right-4 h-11 w-11 flex items-center justify-center rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl  transition-all duration-300 z-10 border border-white/30 dark:border-slate-600 hover:scale-110 active:scale-95 dark:hover:border-rose-500`,
            isInWishlist && `text-rose-500 ${styles.wishlistPulse}`
          )}
          onClick={handleWishlistToggle}
        >
          <Heart className={cn("h-5.5 w-5.5 transition-all duration-300 dark:text-slate-300", isInWishlist && "fill-current text-rose-500")} />
        </button>
        )}

        {/* Enhanced Quick Add Bottom Bar (MD+) */}
        {showQuickAdd && (
        <div className={`absolute inset-x-0 bottom-0 p-5 translate-y-full group-hover:translate-y-0 transition-all duration-500 hidden md:block z-20 ${styles.quickAddBar}`}>
          <Button 
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            style={buttonStyle}
            className={`w-full font-black text-sm uppercase tracking-wide  transition-all active:scale-95 ${styles.cartButton} ${buttonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <GridCartIcon className={`h-5 w-5 mr-2 transition-all ${styles.cartIcon}`} />
            {settings?.storeGridCartText || 'Add to Bag'}
          </Button>
        </div>
        )}
      </Link>
        )}

      {/* Content Area with Smooth Transitions */}
      <div className={`flex flex-col flex-1 p-5 space-y-4 ${styles.contentArea}`}>
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-start gap-2">
            <p className={`text font-black uppercase tracking-widest text-primary/60 truncate flex-1 transition-colors ${styles.categoryText}`}>
                {category?.name || product.categoryName || 'Collection'}
            </p>
            {isOutOfStock && (
              <Badge variant="destructive" className="text h-5 uppercase font-black tracking-wider px-2 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900">
                Sold Out
              </Badge>
            )}
          </div>
          
          <h3 className={cn(
            `text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug tracking-tight transition-colors duration-300 break-words ${styles.productName}`,
            titleLines === 1 && 'line-clamp-1',
            titleLines === 2 && 'line-clamp-2',
            titleLines === 3 && 'line-clamp-3'
          )}>
            {product.name}
          </h3>

          {/* Product Rating Display */}
          {showRating && settings?.showReviewRatingOnCard && ratingStats.totalReviews > 0 && (
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
              <Badge variant="secondary" className={`bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 text-indigo-700 dark:text-indigo-300 text font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-700 rounded-full h-5 px-2.5 ${styles.badgeNew}`}>
                <Sparkles className="h-3 w-3 mr-1" /> New
              </Badge>
            )}
            {product.isPopular && (
              <Badge variant="secondary" className={`bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 text-rose-700 dark:text-rose-300 text font-black uppercase tracking-widest border border-rose-200 dark:border-rose-700 rounded-full h-5 px-2.5 ${styles.badgePopular}`}>
                <TrendingUp className="h-3 w-3 mr-1" /> Best
              </Badge>
            )}
          </div>
        </div>

        <div className={`space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 ${styles.priceSection}`}>
          {showStockBar && (
          <StockBar 
            stock={product.stock} 
            lowStockThreshold={product.lowStockThreshold || 10} 
          />
          )}

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
                    <span className={`text text-slate-400 dark:text-slate-500 line-through font-bold mt-1.5 truncate transition-colors ${styles.originalPrice}`}>
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
                className={`  active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses} ${styles.mobileCartButton}`}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <GridCartIcon className={`h-5 w-5 transition-all ${styles.mobileCartIcon}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// Custom HTML Card Component
interface CustomHtmlCardProps {
  html: string;
  product: Product;
  category?: Category;
  currencySymbol: string;
  effectivePrice: number;
  isDiscounted: boolean;
  discountPercentage: number;
  isOutOfStock: boolean;
  isInWishlist: boolean;
  onWishlistToggle: (e: React.MouseEvent) => void;
  onAddToCart: (e: React.MouseEvent) => void;
  onProductClick: () => void;
  ratingStats: { averageRating: number; totalReviews: number };
  settings: any;
  getStoreUrl: (path: string) => string;
}

function CustomHtmlCard({
  html,
  product,
  category,
  currencySymbol,
  effectivePrice,
  isDiscounted,
  discountPercentage,
  isOutOfStock,
  isInWishlist,
  onWishlistToggle,
  onAddToCart,
  onProductClick,
  ratingStats,
  settings,
  getStoreUrl,
}: CustomHtmlCardProps) {
  // Simple placeholder replacement
  const processedHtml = html
    .replace(/\{\{product\.id\}\}/g, product.id)
    .replace(/\{\{product\.name\}\}/g, product.name)
    .replace(/\{\{product\.price\}\}/g, effectivePrice.toFixed(2))
    .replace(/\{\{product\.originalPrice\}\}/g, product.sellingPrice.toFixed(2))
    .replace(/\{\{product\.imageUrl\}\}/g, product.imageUrl || settings?.defaultProductImageUrl || 'https://placehold.co/600x600.png')
    .replace(/\{\{product\.category\}\}/g, category?.name || product.categoryName || 'General')
    .replace(/\{\{product\.stock\}\}/g, product.stock.toString())
    .replace(/\{\{product\.isNew\}\}/g, product.isNewArrival ? 'true' : 'false')
    .replace(/\{\{product\.isPopular\}\}/g, product.isPopular ? 'true' : 'false')
    .replace(/\{\{product\.isOfficial\}\}/g, product.isOfficialBrand ? 'true' : 'false')
    .replace(/\{\{product\.isOutOfStock\}\}/g, isOutOfStock ? 'true' : 'false')
    .replace(/\{\{product\.discount\}\}/g, discountPercentage.toString())
    .replace(/\{\{product\.rating\}\}/g, ratingStats.averageRating.toFixed(1))
    .replace(/\{\{product\.reviewCount\}\}/g, ratingStats.totalReviews.toString())
    .replace(/\{\{currency\}\}/g, currencySymbol)
    .replace(/\{\{cardHeight\}\}/g, (settings?.productCardHeight || 380).toString())
    .replace(/\{\{isInWishlist\}\}/g, isInWishlist ? 'true' : 'false')
    .replace(/\{\{product\.url\}\}/g, getStoreUrl(`/store/product/${product.id}`));

  return (
    <div 
      className="custom-html-card-wrapper"
      onClick={(e) => {
        // Handle custom HTML click events
        const target = e.target as HTMLElement;
        if (target.closest('[data-action="wishlist"]')) {
          onWishlistToggle(e);
        } else if (target.closest('[data-action="add-to-cart"]')) {
          onAddToCart(e);
        } else if (target.closest('[data-action="view-product"]')) {
          onProductClick();
        }
      }}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
}
