'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Heart, 
  Plus,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/contexts/cart-context';
import { useWishlist } from '@/contexts/wishlist-context';
import { useSettings } from '@/contexts/settings-context';
import { formatCurrency } from '@/lib/formatUtils';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { ProductLoadingOverlay } from './ProductLoadingOverlay';
import { StockBar } from './StockBar';
import { ProductRating } from './ProductRating';
import { calculateRatingStats } from '@/lib/rating-utils';
import { useProductReviews } from '@/hooks/use-product-reviews';
import { Product, Category, AppSettings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useStoreUrl } from '@/hooks/use-store-url';

interface ProductCardProps {
  product: Product;
  category?: Category;
  currencySymbol: string;
  overrideSettings?: Partial<AppSettings>;
}

export function ProductCard({ product, category, currencySymbol, overrideSettings }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isProductInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { settings: globalSettings } = useSettings();
  const { getStoreUrl } = useStoreUrl();
  const [today, setToday] = useState<Date | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const { reviews } = useProductReviews(product.id);

  const settings = overrideSettings || globalSettings;

  useEffect(() => {
    setToday(new Date());
  }, []);

  const isInWishlist = isProductInWishlist(product.id);

  // Calculate rating stats from reviews
  const ratingStats = useMemo(() => calculateRatingStats(reviews), [reviews]);

  // Pricing Engine logic
  const effectivePrice = useMemo(() =>
    calculateEffectivePrice(product as any, today, category),
    [product, today, category]
  );

  const isDiscounted = effectivePrice < product.sellingPrice;
  const isOutOfStock = product.stock <= 0;

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

  // Product Card Designer Settings
  const cardStyle = settings?.productCardStyle || 'default';
  const borderRadius = settings?.productCardBorderRadius || 'full';
  const shadow = settings?.productCardShadow || 'md';
  const borderWidth = settings?.productCardBorderWidth || 'thin';
  const borderColor = settings?.productCardBorderColor || (cardStyle === 'modern' ? 'rgba(255,255,255,0.2)' : '');
  const bgColor = settings?.productCardBgColor || (cardStyle === 'modern' ? 'rgba(255,255,255,0.05)' : '');
  const hoverEffect = settings?.productCardHoverEffect || 'lift';
  const imageRatio = settings?.productCardImageRatio || 'portrait';
  const titleLines = settings?.productCardTitleLines || 2;
  const titleAlign = settings?.productCardTitleAlign || 'left';
  const priceAlign = settings?.productCardPriceAlign || 'left';
  const cardHeight = settings?.productCardHeight;

  const borderRadiusMap: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-[32px]',
  };

  const shadowMap: Record<string, string> = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  const borderWidthMap: Record<string, string> = {
    none: 'border-0',
    thin: 'border',
    medium: 'border-2',
    thick: 'border-4',
  };

  const hoverEffectMap: Record<string, string> = {
    none: '',
    lift: 'hover:-translate-y-2 hover:shadow-xl transition-all duration-300',
    zoom: '', // handled on image
    glow: 'hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300',
    border: 'hover:border-primary transition-all duration-300',
  };

  const imageRatioMap: Record<string, string> = {
    square: 'aspect-square',
    portrait: 'aspect-[4/5]',
    landscape: 'aspect-[4/3]',
  };

  const processCustomHtml = (html: string) => {
    if (!html) return '';
    return html
      .replace(/\{\{product\.name\}\}/g, product.name)
      .replace(/\{\{product\.id\}\}/g, product.id)
      .replace(/\{\{product\.price\}\}/g, effectivePrice.toFixed(2))
      .replace(/\{\{product\.originalPrice\}\}/g, product.sellingPrice.toFixed(2))
      .replace(/\{\{product\.imageUrl\}\}/g, product.imageUrl || '')
      .replace(/\{\{product\.category\}\}/g, category?.name || product.categoryName || 'General')
      .replace(/\{\{product\.stock\}\}/g, product.stock.toString())
      .replace(/\{\{product\.stockPercentage\}\}/g, Math.min((product.stock / 50) * 100, 100).toString())
      .replace(/\{\{product\.stockLabel\}\}/g, product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock')
      .replace(/\{\{product\.reviewCount\}\}/g, ratingStats.totalReviews.toString())
      .replace(/\{\{product\.isNew\}\}/g, product.isNewArrival ? 'true' : 'false')
      .replace(/\{\{product\.isPopular\}\}/g, product.isPopular ? 'true' : 'false')
      .replace(/\{\{product\.isOfficial\}\}/g, product.isOfficialBrand ? 'true' : 'false')
      .replace(/\{\{product\.discount\}\}/g, isDiscounted ? Math.round((1 - effectivePrice / product.sellingPrice) * 100).toString() : '0')
      .replace(/\{\{currency\}\}/g, currencySymbol)
      .replace(/\{\{cardHeight\}\}/g, (cardHeight || 380).toString())
      // Handle simple #if blocks
      .replace(/\{\{#if product\.isOfficial\}\}([\s\S]*?)\{\{\/if\}\}/g, product.isOfficialBrand ? '$1' : '')
      .replace(/\{\{#if product\.isNew\}\}([\s\S]*?)\{\{\/if\}\}/g, product.isNewArrival ? '$1' : '')
      .replace(/\{\{#if product\.isPopular\}\}([\s\S]*?)\{\{\/if\}\}/g, product.isPopular ? '$1' : '')
      .replace(/\{\{#if product\.discount\}\}([\s\S]*?)\{\{\/if\}\}/g, isDiscounted ? '$1' : '')
      .replace(/\{\{#if product\.originalPrice\}\}([\s\S]*?)\{\{\/if\}\}/g, isDiscounted ? '$1' : '');
  };

  const handleCustomClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button');
    if (button) {
      const text = button.textContent || '';
      if (text.includes('Add') || text.includes('🛒')) {
        handleAddToCart(e);
      } else if (text.includes('♡') || text.includes('Wishlist')) {
        handleWishlistToggle(e);
      }
    }
  };

  if (cardStyle === 'custom' && settings?.productCardCustomHtml) {
      return (
          <div 
            onClick={handleCustomClick}
            className="cursor-pointer"
            dangerouslySetInnerHTML={{ __html: processCustomHtml(settings.productCardCustomHtml) }} 
          />
      );
  }

  // Grid Button Style
  const gridBtnStyle = useMemo(() => {
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
    } else if (style === 'apple') {
        const color = settings?.storeGridCartColor || '#007AFF';
        return {
            backgroundColor: color,
            color: 'white',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
            fontWeight: '600',
            letterSpacing: '-0.01em',
        };
    }

    return {
        backgroundColor: settings?.storeGridCartColor || '#10b981',
        color: 'white',
        border: 'none'
    };
  }, [settings]);

  const gridBtnClasses = useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const size = useIndividual
        ? (settings?.storeGridCartSize || 'md')
        : (settings?.storeBtnSize || 'md');
    
    const shape = useIndividual
        ? (settings?.storeGridCartShape || 'md')
        : (settings?.storeBtnShape || 'md');

    const shadow = useIndividual
        ? (settings?.storeGridCartShadow || 'sm')
        : 'sm';

    const sizeClasses: Record<string, string> = {
        sm: 'h-8 text-[10px] px-3',
        md: 'h-10 text-xs px-4',
        lg: 'h-12 text-sm px-6',
        xl: 'h-14 text-base px-8'
    };

    const shapeClasses: Record<string, string> = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-2xl',
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

    const sizeClass = sizeClasses[size] || sizeClasses.md;
    let shapeClass = shapeClasses[shape] || 'rounded-md';
    let shadowClass = shadowClasses[shadow as keyof typeof shadowClasses] || 'shadow-sm';

    const style = useIndividual
        ? (settings?.storeGridCartStyle || 'standard')
        : (settings?.storeBtnStyle || 'standard');

    if (style === 'apple') {
        shapeClass = 'rounded-xl';
        shadowClass = 'shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)]';
    }

    return `${sizeClass} ${shapeClass} ${shadowClass}`;
  }, [settings]);

  const gridCartText = settings?.storeGridCartText || 'Add to Bag';
  const gridCartIcon = settings?.storeGridCartIcon;

  return (
    <>
      <ProductLoadingOverlay isVisible={isLoadingProduct} productName={product.name} />
      <div
        className={cn(
          "group relative flex flex-col transition-all duration-500 overflow-hidden",
          cardStyle === 'modern' ? "backdrop-blur-xl border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" : "bg-white dark:bg-[#111111] border-black/[0.08] dark:border-white/[0.12]",
          cardStyle === 'classic' && "shadow-none hover:shadow-lg",
          borderRadiusMap[borderRadius] || borderRadiusMap.full,
          shadowMap[shadow] || shadowMap.md,
          borderWidthMap[borderWidth] || borderWidthMap.thin,
          hoverEffectMap[hoverEffect],
          isOutOfStock && "opacity-80",
          cardStyle === 'minimal' && "border-none shadow-none bg-transparent"
        )}
        style={{
            borderColor: borderColor || undefined,
            backgroundColor: bgColor || undefined,
            height: cardHeight ? `${cardHeight}px` : '100%',
        }}
      >
        {/* Media Area */}
        {settings?.productCardShowImage !== false && (
          <Link
            href={getStoreUrl(`/store/product/${product.id}`)}
            onClick={handleProductClick}
            className={cn(
                "block relative overflow-hidden bg-[#f5f5f7] dark:bg-[#0a0a0a]",
                imageRatioMap[imageRatio] || imageRatioMap.portrait
            )}
          >
            <Image
              src={product.imageUrl || settings?.defaultProductImageUrl || 'https://placehold.co/600x600.png'}
              alt={product.name}
              fill
              className={cn(
                "object-cover transition-transform duration-[1.5s] ease-out",
                hoverEffect === 'zoom' && "group-hover:scale-110",
                isOutOfStock && "grayscale"
              )}
              unoptimized
            />

            {/* Badges */}
            {settings?.productCardShowBadges !== false && (
                <div className="absolute top-5 left-5 flex flex-col gap-2 z-10 pointer-events-none">
                {product.isOfficialBrand && (
                    <Badge className="bg-[#0071e3] text-white font-semibold text-[9px] px-3 py-1 rounded-full border-none shadow-sm uppercase tracking-wider">
                    Official
                    </Badge>
                )}
                {isDiscounted && !isOutOfStock && (
                    <Badge className="bg-[#e11d48] text-white font-semibold text-[9px] px-3 py-1 rounded-full border-none shadow-sm uppercase tracking-wider">
                    Offer
                    </Badge>
                )}
                </div>
            )}

            {/* Wishlist Button */}
            {settings?.productCardShowWishlist !== false && (
                <button
                className={cn(
                    "absolute top-5 right-5 h-10 w-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-xl shadow-xl transition-all duration-500 z-10 border border-black/[0.03] dark:border-white/[0.03] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
                    isInWishlist ? "text-rose-500 opacity-100 translate-y-0" : "text-black dark:text-white"
                )}
                onClick={handleWishlistToggle}
                >
                <Heart className={cn("h-4 w-4 transition-all duration-500", isInWishlist && "fill-current")} />
                </button>
            )}

            {/* Quick Add Overlay */}
            {!isOutOfStock && settings?.productCardShowQuickAdd !== false && (
                <div className="absolute inset-x-0 bottom-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-700 hidden md:block z-20">
                <Button
                    onClick={handleAddToCart}
                    style={gridBtnStyle}
                    className={cn(
                        "w-full font-semibold tracking-tight transition-all active:scale-95",
                        gridBtnClasses
                    )}
                >
                    {gridCartText}
                </Button>
                </div>
            )}
          </Link>
        )}

        {/* Content Area */}
        <div className={cn(
            "flex flex-col flex-1 p-6 space-y-4",
            cardStyle === 'minimal' && "p-4 px-0"
        )}>
          <div className="flex-1 space-y-1">
            <div className={cn(
                "flex justify-between items-center",
                titleAlign === 'center' && "flex-col gap-1"
            )}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#86868b]">
                  {category?.name || product.categoryName || 'Collection'}
              </p>
              {settings?.productCardShowRating !== false && ratingStats.totalReviews > 0 && (
                <ProductRating
                  averageRating={ratingStats.averageRating}
                  totalReviews={ratingStats.totalReviews}
                  size="xs"
                  showLabel={false}
                />
              )}
            </div>

            <h3 className={cn(
                "text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] leading-tight tracking-tight transition-colors duration-300",
                titleAlign === 'center' && "text-center",
                titleLines === 1 && "line-clamp-1",
                titleLines === 2 && "line-clamp-2",
                titleLines === 3 && "line-clamp-3"
            )}>
              {product.name}
            </h3>
          </div>

          <div className="space-y-3">
            {settings?.productCardShowStockBar !== false && (
                <StockBar
                    stock={product.stock}
                    lowStockThreshold={product.lowStockThreshold || 10}
                />
            )}

            <div className={cn(
                "flex items-center justify-between pt-1",
                priceAlign === 'center' && "flex-col gap-2 justify-center"
            )}>
                <div className={cn(
                    "flex flex-col",
                    priceAlign === 'center' && "items-center"
                )}>
                    <span className={cn(
                        "text-xl font-semibold tracking-tight",
                        isDiscounted ? "text-[#e11d48]" : "text-[#1d1d1f] dark:text-[#f5f5f7]"
                    )}>
                        {formatCurrency(effectivePrice, currencySymbol)}
                    </span>
                    {isDiscounted && (
                        <span className="text-xs text-[#86868b] line-through font-medium tracking-tight">
                        {formatCurrency(product.sellingPrice, currencySymbol)}
                        </span>
                    )}
                </div>

                {/* Mobile Quick Add */}
                {settings?.productCardShowQuickAdd !== false && (
                    <div className="md:hidden">
                    <Button
                        size="icon"
                        style={gridBtnStyle}
                        className={cn(
                            "h-10 w-10 rounded-full active:scale-90 transition-transform shadow-sm flex items-center justify-center",
                            gridBtnClasses
                        )}
                        onClick={handleAddToCart}
                        disabled={isOutOfStock}
                    >
                        <Plus className="h-5 w-5" />
                    </Button>
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

