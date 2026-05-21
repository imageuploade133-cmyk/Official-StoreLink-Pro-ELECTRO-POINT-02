'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { calculateEffectivePrice, getLowestVariantPrice } from '@/lib/pos-utils';
import { ProductLoadingOverlay } from './ProductLoadingOverlay';
import { StockBar } from './StockBar';
import { ProductRating } from './ProductRating';
import { Product, Category, AppSettings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useStoreUrl } from '@/hooks/use-store-url';

interface ProductCardProps {
  product: Product;
  category?: Category;
  currencySymbol: string;
  overrideSettings?: Partial<AppSettings>;
  recommendationButtonStyle?: React.CSSProperties;
}

export function ProductCard({ product, category, currencySymbol, overrideSettings, recommendationButtonStyle }: ProductCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isProductInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { settings: globalSettings } = useSettings();
  const { getStoreUrl } = useStoreUrl();
  const [today, setToday] = useState<Date | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  const settings = overrideSettings || globalSettings;

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClient(true);
      setToday(new Date());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const isInWishlist = isProductInWishlist(product.id);

  const effectivePrice = useMemo(() =>
    calculateEffectivePrice(product as any, isClient ? today : null, category),
    [product, today, category, isClient]
  );

  const effectiveVariantRange = useMemo(() => {
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const activeVariants = product.variants.filter(v => v.isActive !== false);
      if (activeVariants.length === 0) return null;
      const effectivePrices = activeVariants.map(v => 
        calculateEffectivePrice({ ...product, sellingPrice: Number(v.sellingPrice || v.price || 0) } as any, isClient ? today : null, category)
      );
      return {
        min: Math.min(...effectivePrices),
        max: Math.max(...effectivePrices)
      };
    }
    return null;
  }, [product, today, category, isClient]);

  const originalVariantRange = useMemo(() => {
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const activeVariants = product.variants.filter(v => v.isActive !== false);
      if (activeVariants.length === 0) return null;
      const prices = activeVariants.map(v => Number(v.sellingPrice || v.price || 0));
      return {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
    }
    return null;
  }, [product]);

  const displayPrice = useMemo(() => {
    if (product.hasVariants) {
      return effectiveVariantRange?.min || 0;
    }
    return effectivePrice;
  }, [product.hasVariants, effectiveVariantRange, effectivePrice]);

  const salesCount = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < product.id.length; i++) {
        hash = product.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 5000) + 100;
  }, [product.id]);

  const isDiscounted = useMemo(() => {
    if (product.hasVariants) {
      if (!effectiveVariantRange || !originalVariantRange) return false;
      return effectiveVariantRange.min < originalVariantRange.min;
    }
    return effectivePrice < product.sellingPrice;
  }, [product.hasVariants, effectiveVariantRange, originalVariantRange, effectivePrice, product.sellingPrice]);

  const originalPrice = useMemo(() => {
    if (product.hasVariants) {
      return originalVariantRange?.min || 0;
    }
    return product.sellingPrice;
  }, [product.hasVariants, originalVariantRange, product.sellingPrice]);
  
  const isOutOfStock = useMemo(() => {
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const activeVariants = product.variants.filter(v => v.isActive !== false);
      if (activeVariants.length === 0) return true;
      return activeVariants.every(v => (Number(v.stock) || 0) <= 0);
    }
    return (Number(product.stock) || 0) <= 0;
  }, [product]);

  const stockValue = useMemo(() => {
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      return product.variants.reduce((acc, v) => acc + (v.isActive !== false ? (Number(v.stock) || 0) : 0), 0);
    }
    return Number(product.stock) || 0;
  }, [product]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.hasVariants) {
      router.push(getStoreUrl(`/store/product/${product.slug || product.id}`));
      return;
    }
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

  const cardStyle = settings?.productCardStyle || 'default';
  const borderRadius = settings?.productCardBorderRadius || 'full';
  const shadow = settings?.productCardShadow || 'md';
  const borderWidth = settings?.productCardBorderWidth || 'thin';
  const borderColor = settings?.productCardBorderColor || '';
  const bgColor = settings?.productCardBgColor || '';
  const hoverEffect = settings?.productCardHoverEffect || 'lift';
  const imageRatio = settings?.productCardImageRatio || 'portrait';
  const titleAlign = settings?.productCardTitleAlign || 'left';
  const priceAlign = settings?.productCardPriceAlign || 'left';
  const cardHeight = settings?.productCardHeight;

  const borderRadiusMap: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-[24px]',
  };

  const shadowMap: Record<string, string> = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-[0_10px_40px_rgba(0,0,0,0.04)]',
    lg: 'shadow-[0_20px_50px_rgba(0,0,0,0.08)]',
    xl: 'shadow-[0_30px_60px_rgba(0,0,0,0.12)]',
  };

  const borderWidthMap: Record<string, string> = {
    none: 'border-0',
    thin: 'border',
    medium: 'border-2',
    thick: 'border-4',
  };

  const hoverEffectMap: Record<string, string> = {
    none: '',
    lift: 'hover:-translate-y-1.5 hover:shadow-xl transition-all duration-500 ease-apple',
    zoom: '', 
    glow: 'transition-all duration-500',
    border: 'hover:border-primary transition-all duration-300',
  };

  const imageRatioMap: Record<string, string> = {
    square: 'aspect-square',
    portrait: 'aspect-[4/5]',
    landscape: 'aspect-[4/3]',
  };

  const gridBtnStyle = useMemo(() => {
    // Use recommendation button style if provided (for product recommendations section)
    if (recommendationButtonStyle) {
      return recommendationButtonStyle;
    }
    
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const style = useIndividual
        ? (settings?.storeGridCartStyle || 'standard')
        : (settings?.storeBtnStyle || 'standard');

    if (style === 'apple') {
        const color = settings?.storeGridCartColor || '#0071e3';
        return {
            backgroundColor: color,
            color: 'white',
            border: 'none',
            fontWeight: '600',
        };
    }

    return {
        backgroundColor: settings?.storeGridCartColor || '#0071e3',
        color: 'white',
        border: 'none'
    };
  }, [settings, recommendationButtonStyle]);

  const gridBtnClasses = useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const size = useIndividual
        ? (settings?.storeGridCartSize || 'md')
        : (settings?.storeBtnSize || 'md');
    
    const shape = useIndividual
        ? (settings?.storeGridCartShape || 'full')
        : (settings?.storeBtnShape || 'full');

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
        lg: 'rounded-xl',
        full: 'rounded-full'
    };

    const sizeClass = sizeClasses[size] || sizeClasses.md;
    let shapeClass = shapeClasses[shape] || 'rounded-full';

    return `${sizeClass} ${shapeClass}`;
  }, [settings]);

  const gridCartText = product.hasVariants ? 'Select Options' : (settings?.storeGridCartText || 'Add to Bag');

  return (
    <>
      <ProductLoadingOverlay 
        isVisible={isLoadingProduct} 
        productName={product.name}
        productImage={product.imageUrl || settings?.defaultProductImageUrl}
      />
      <div
        className={cn(
          "group relative flex flex-col transition-all duration-500 overflow-hidden",
          "bg-white dark:bg-[#1d1d1f] border-[#d2d2d7]/30 dark:border-[#424245]/30",
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
            href={getStoreUrl(`/store/product/${product.slug || product.id}`)}
            onClick={handleProductClick}
            className={cn(
                "block relative overflow-hidden bg-[#f5f5f7] dark:bg-[#000000]",
                imageRatioMap[imageRatio] || imageRatioMap.portrait
            )}
          >
            <Image
              src={product.imageUrl || settings?.defaultProductImageUrl || 'https://placehold.co/600x600.png'}
              alt={product.name}
              fill
              className={cn(
                "object-cover transition-transform duration-[1200ms] ease-apple",
                hoverEffect === 'zoom' && "group-hover:scale-105",
                isOutOfStock && "grayscale"
              )}
              unoptimized
            />

            {/* Badges */}
            {settings?.productCardShowBadges !== false && (
                <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
                {product.isOfficialBrand && (
                    <Badge className="bg-[#0071e3] text-white font-semibold text-[9px] px-2 py-0.5 rounded-full border-none shadow-sm uppercase tracking-tight">
                    Choice
                    </Badge>
                )}
                {isDiscounted && !isOutOfStock && (
                    <Badge className="bg-[#ff2d55] text-white font-bold text-[10px] px-2 py-0.5 rounded-full border-none shadow-sm">
                    {product.hasVariants ? (
                        effectiveVariantRange && originalVariantRange && originalVariantRange.min > 0
                        ? `${Math.round((1 - effectiveVariantRange.min / originalVariantRange.min) * 100)}% OFF`
                        : 'SALE'
                    ) : (
                        `${Math.round((1 - displayPrice / originalPrice) * 100)}% OFF`
                    )}
                    </Badge>
                )}
                </div>
            )}

            {/* Wishlist Button */}
            {settings?.productCardShowWishlist !== false && (
                <button
                className={cn(
                    "absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-xl shadow-sm transition-all duration-500 z-10 border border-black/[0.05] dark:border-white/[0.05] opacity-0 group-hover:opacity-100",
                    isInWishlist ? "text-[#ff2d55] opacity-100" : "text-[#1d1d1f] dark:text-white"
                )}
                onClick={handleWishlistToggle}
                >
                <Heart className={cn("h-4 w-4 transition-all duration-500", isInWishlist && "fill-current")} />
                </button>
            )}

            {/* Quick Add Overlay */}
            {!isOutOfStock && settings?.productCardShowQuickAdd !== false && (
                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 hidden md:block z-20">
                <Button
                    onClick={handleAddToCart}
                    style={gridBtnStyle}
                    className={cn(
                        "w-full font-semibold tracking-tight transition-all active:scale-95 shadow-lg",
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
            "flex flex-col flex-1 p-4 space-y-3",
            cardStyle === 'minimal' && "px-0"
        )}>
          <div className="flex-1 space-y-1.5">
            <h3 className={cn(
                "text-[15px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] leading-tight tracking-tight line-clamp-2 transition-colors duration-300",
                titleAlign === 'center' && "text-center",
            )}>
              {product.name}
            </h3>
            
            <div className={cn(
                "flex items-center gap-2",
                titleAlign === 'center' && "justify-center"
            )}>
                {settings?.productCardShowRating !== false && (
                    <div className="flex items-center text-[12px] font-semibold text-[#ff9500]">
                        <Star className="h-3 w-3 fill-current mr-1" />
                        {product.averageRating ? product.averageRating.toFixed(1) : '0.0'}
                    </div>
                )}
                <span className="text-[11px] text-[#86868b] font-medium">{(product.totalSold || 0) >= 1000 ? `${((product.totalSold || 0) / 1000).toFixed(1)}k+` : (product.totalSold || 0)} sold</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className={cn(
                "flex items-center justify-between",
                priceAlign === 'center' && "flex-col gap-1 justify-center"
            )}>
                <div className={cn(
                    "flex items-baseline gap-2",
                    priceAlign === 'center' && "items-center"
                )}>
                    <span className={cn(
                        "text-[17px] font-semibold tracking-tight text-[#1d1d1f] dark:text-white",
                    )}>
                        {product.hasVariants ? (
                            effectiveVariantRange ? (
                                effectiveVariantRange.min === effectiveVariantRange.max
                                    ? formatCurrency(effectiveVariantRange.min, currencySymbol)
                                    : `From ${formatCurrency(effectiveVariantRange.min, currencySymbol)}`
                            ) : 'Select Options'
                        ) : (
                            formatCurrency(displayPrice, currencySymbol)
                        )}
                    </span>
                </div>

                <div className="hidden sm:block">
                    <span className="text-[10px] font-semibold text-[#34c759] bg-[#34c759]/10 px-2 py-0.5 rounded-full">Free Shipping</span>
                </div>
            </div>

            {/* Mobile/Quick Add Button */}
            {settings?.productCardShowQuickAdd !== false && !isOutOfStock && (
                <Button
                    size="sm"
                    onClick={handleAddToCart}
                    className="w-full h-9 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[12px] font-semibold transition-all active:scale-95 md:hidden"
                >
                    Add to Bag
                </Button>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .ease-apple {
            transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1.0);
        }
      `}</style>
    </>
  );
}
