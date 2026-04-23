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
import type { Product, Category } from '@/lib/types';
import { cn } from '@/lib/utils';
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

  return (
    <>
      <ProductLoadingOverlay isVisible={isLoadingProduct} productName={product.name} />
      <div 
        className={cn(
          "group relative flex flex-col bg-white dark:bg-[#111111] transition-all duration-700 overflow-hidden h-full rounded-[32px] border border-black/[0.03] dark:border-white/[0.03] hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_32px_64px_-16px_rgba(255,255,255,0.05)]",
          isOutOfStock && "opacity-80"
        )}
      >
        {/* Media Area */}
        <Link href={getStoreUrl(`/store/product/${product.id}`)} onClick={handleProductClick} className="block relative aspect-[4/5] overflow-hidden bg-[#f5f5f7] dark:bg-[#0a0a0a]">
        <Image
          src={product.imageUrl || settings?.defaultProductImageUrl || 'https://placehold.co/600x600.png'}
          alt={product.name}
          fill
          className={cn(
            "object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110",
            isOutOfStock && "grayscale"
          )}
          unoptimized
        />
        
        {/* Badges */}
        <div className="absolute top-5 left-5 flex flex-col gap-2 z-10 pointer-events-none">
          {product.isOfficialBrand && (
            <Badge className="bg-blue-600 text-white font-black text-[9px] px-3 py-1 rounded-full border-none shadow-lg uppercase tracking-[0.1em]">
              Official
            </Badge>
          )}
          {isDiscounted && !isOutOfStock && (
             <Badge className="bg-rose-500 text-white font-black text-[9px] px-3 py-1 rounded-full border-none shadow-lg uppercase tracking-[0.1em]">
               Special Offer
             </Badge>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          className={cn(
            "absolute top-5 right-5 h-10 w-10 flex items-center justify-center rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-xl shadow-xl transition-all duration-500 z-10 border border-black/[0.03] dark:border-white/[0.03] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0",
            isInWishlist ? "text-rose-500 opacity-100 translate-y-0" : "text-black dark:text-white"
          )}
          onClick={handleWishlistToggle}
        >
          <Heart className={cn("h-4 w-4 transition-all duration-500", isInWishlist && "fill-current")} />
        </button>

        {/* Quick Add Overlay */}
        {!isOutOfStock && (
        <div className="absolute inset-x-0 bottom-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-700 hidden md:block z-20">
          <Button 
            onClick={handleAddToCart}
            className="w-full bg-white text-black dark:bg-white dark:text-black hover:bg-white/90 font-black text-xs uppercase tracking-widest h-14 rounded-2xl shadow-2xl transition-all active:scale-95"
          >
            Add to Bag
          </Button>
        </div>
        )}
      </Link>

      {/* Content Area */}
      <div className="flex flex-col flex-1 p-7 space-y-5">
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#86868b]">
                {category?.name || product.categoryName || 'Collection'}
            </p>
            {ratingStats.totalReviews > 0 && (
              <ProductRating
                averageRating={ratingStats.averageRating}
                totalReviews={ratingStats.totalReviews}
                size="xs"
                showLabel={false}
              />
            )}
          </div>
          
          <h3 className="text-xl font-bold text-black dark:text-white leading-tight tracking-tight line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
            {product.name}
          </h3>
        </div>

        <div className="space-y-4">
          <StockBar 
            stock={product.stock} 
            lowStockThreshold={product.lowStockThreshold || 10} 
          />

          <div className="flex items-center justify-between pt-2">
              <div className="flex flex-col">
                    <span className={cn(
                      "text-2xl font-black tracking-tighter",
                      isDiscounted ? "text-rose-500" : "text-black dark:text-white"
                    )}>
                      {formatCurrency(effectivePrice, currencySymbol)}
                    </span>
                    {isDiscounted && (
                      <span className="text-xs text-[#86868b] line-through font-bold tracking-tight">
                        {formatCurrency(product.sellingPrice, currencySymbol)}
                      </span>
                    )}
              </div>
              
              {/* Mobile Quick Add */}
              <div className="md:hidden">
                <Button 
                  size="icon" 
                  className="h-12 w-12 rounded-2xl bg-black text-white dark:bg-white dark:text-black active:scale-90 transition-transform shadow-xl"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
