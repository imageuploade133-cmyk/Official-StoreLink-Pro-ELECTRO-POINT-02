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
          "group relative flex flex-col bg-white dark:bg-[#1d1d1f] transition-all duration-500 overflow-hidden h-full rounded-3xl border border-black/[0.05] dark:border-white/[0.05] hover:shadow-2xl hover:shadow-black/5 dark:hover:shadow-white/5",
          isOutOfStock && "opacity-80"
        )}
      >
        {/* Media Area */}
        <Link href={getStoreUrl(`/store/product/${product.id}`)} onClick={handleProductClick} className="block relative aspect-square overflow-hidden bg-[#f5f5f7] dark:bg-black">
        <Image
          src={product.imageUrl || settings?.defaultProductImageUrl || 'https://placehold.co/600x600.png'}
          alt={product.name}
          fill
          className={cn(
            "object-cover transition-transform duration-1000 group-hover:scale-105",
            isOutOfStock && "grayscale"
          )}
          unoptimized
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
          {product.isOfficialBrand && (
            <Badge className="bg-[#0071e3] text-white font-bold text-[10px] px-3 py-1 rounded-full border-none shadow-sm uppercase tracking-wider">
              Official
            </Badge>
          )}
          {isDiscounted && !isOutOfStock && (
             <Badge className="bg-rose-600 text-white font-bold text-[10px] px-3 py-1 rounded-full border-none shadow-sm uppercase tracking-wider">
               Offer
             </Badge>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          className={cn(
            "absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-sm transition-all duration-300 z-10 border border-black/[0.05] dark:border-white/[0.05] hover:scale-110 active:scale-95",
            isInWishlist ? "text-rose-500" : "text-[#1d1d1f] dark:text-white"
          )}
          onClick={handleWishlistToggle}
        >
          <Heart className={cn("h-4.5 w-4.5 transition-all duration-300", isInWishlist && "fill-current")} />
        </button>

        {/* Quick Add Overlay */}
        {!isOutOfStock && (
        <div className="absolute inset-x-0 bottom-0 p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-500 hidden md:block z-20">
          <Button 
            onClick={handleAddToCart}
            className="w-full store-btn-primary h-12 text-sm shadow-xl"
          >
            Add to Bag
          </Button>
        </div>
        )}
      </Link>

      {/* Content Area */}
      <div className="flex flex-col flex-1 p-6 space-y-4">
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between items-start gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#86868b]">
                {category?.name || product.categoryName || 'Collection'}
            </p>
            {ratingStats.totalReviews > 0 && (
              <ProductRating
                averageRating={ratingStats.averageRating}
                totalReviews={ratingStats.totalReviews}
                size="sm"
                showLabel={false}
              />
            )}
          </div>
          
          <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white leading-tight tracking-tight line-clamp-2">
            {product.name}
          </h3>
        </div>

        <div className="space-y-3">
          <StockBar 
            stock={product.stock} 
            lowStockThreshold={product.lowStockThreshold || 10} 
          />

          <div className="flex items-center justify-between pt-2">
              <div className="flex flex-col">
                    <span className={cn(
                      "text-lg font-bold tracking-tight",
                      isDiscounted ? "text-rose-600" : "text-[#1d1d1f] dark:text-white"
                    )}>
                      {formatCurrency(effectivePrice, currencySymbol)}
                    </span>
                    {isDiscounted && (
                      <span className="text-[12px] text-[#86868b] line-through font-medium">
                        {formatCurrency(product.sellingPrice, currencySymbol)}
                      </span>
                    )}
              </div>
              
              {/* Mobile Quick Add */}
              <div className="md:hidden">
                <Button 
                  size="icon" 
                  className="h-10 w-10 rounded-full bg-[#0071e3] text-white active:scale-90 transition-transform shadow-lg"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
