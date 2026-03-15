
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Heart, CheckCircle2, Zap, Sparkles, TrendingUp, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/contexts/cart-context';
import { useWishlist } from '@/contexts/wishlist-context';
import { useSettings } from '@/contexts/settings-context';
import { formatCurrency } from '@/lib/formatUtils';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { StockBar } from './StockBar';
import type { Product, Category } from '@/lib/types';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    setToday(new Date());
  }, []);

  const isInWishlist = isProductInWishlist(product.id);

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

  return (
    <div className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-300 dark:border-slate-700 transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 overflow-hidden h-full">
      {/* Media Area */}
      <Link href={`/store/product/${product.id}`} className="block relative aspect-[4/5] overflow-hidden bg-slate-50 dark:bg-slate-800">
        <Image
          src={product.imageUrl || settings?.defaultProductImageUrl || 'https://placehold.co/600x600.png'}
          alt={product.name}
          fill
          className={cn(
            "object-cover transition-transform duration-1000 group-hover:scale-110",
            isOutOfStock && "opacity-50 grayscale"
          )}
          unoptimized
        />
        
        {/* Badges Container */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
          {product.isOfficialBrand && (
            <Badge className="bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1.5 shadow-xl border-none rounded-xl w-fit">
              <CheckCircle2 className="h-3.5 w-3.5 mr-2 fill-current" /> Official
            </Badge>
          )}
          
          {isDiscounted && !isOutOfStock && today && (
            <Badge 
              className="text-white font-black text-[10px] uppercase tracking-widest px-3 py-1.5 shadow-xl border-none rounded-xl animate-pulse w-fit"
              style={{ 
                  backgroundColor: settings?.flashHubColor || '#e11d48',
                  boxShadow: `0 15px 30px -5px ${settings?.flashHubColor || '#e11d48'}44`
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

        {/* Floating Actions */}
        <button
          className={cn(
            "absolute top-4 right-4 h-11 w-11 flex items-center justify-center rounded-[1.25rem] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg transition-all duration-500 z-10 border border-white/20",
            isInWishlist ? "text-rose-500 scale-110" : "text-slate-400 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100"
          )}
          onClick={handleWishlistToggle}
        >
          <Heart className={cn("h-5.5 w-5.5", isInWishlist && "fill-current")} />
        </button>

        {/* Quick Add Bottom Bar (MD+) */}
        <div className="absolute inset-x-0 bottom-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500 hidden md:block z-20">
          <Button 
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-black text-xs uppercase tracking-widest py-7 rounded-2xl shadow-2xl transition-all active:scale-95"
          >
            <ShoppingCart className="h-5 w-5 mr-3" />
            {settings?.storeGridCartText || 'Add to Bag'}
          </Button>
        </div>
      </Link>

      {/* Content Area */}
      <div className="flex flex-col flex-1 p-6 space-y-4">
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-start gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/60 truncate flex-1">
                {category?.name || product.categoryName || 'Collection'}
            </p>
            {isOutOfStock && <Badge variant="destructive" className="text-[8px] h-4 uppercase font-black tracking-tighter px-1.5">Sold Out</Badge>}
          </div>
          
          <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 dark:text-white line-clamp-2 leading-tight tracking-tight group-hover:text-primary transition-colors h-12 break-words">
            {product.name}
          </h3>
          
          <div className="flex flex-wrap gap-2">
            {product.isNewArrival && (
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-widest border-indigo-100 rounded-lg h-5 px-2">
                <Sparkles className="h-3 w-3 mr-1" /> New
              </Badge>
            )}
            {product.isPopular && (
              <Badge variant="secondary" className="bg-rose-50 text-rose-700 text-[9px] font-black uppercase tracking-widest border-rose-100 rounded-lg h-5 px-2">
                <TrendingUp className="h-3 w-3 mr-1" /> Best
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <StockBar 
            stock={product.stock} 
            lowStockThreshold={product.lowStockThreshold || 10} 
          />

          <div className="flex items-center justify-between">
            <div className="flex flex-col flex-1 min-w-0 pr-2">
              {!today ? (
                <Skeleton className="h-8 w-24 rounded-full" suppressHydrationWarning />
              ) : (
                <div className="flex flex-col overflow-hidden">
                  <span className={cn(
                    "text-base sm:text-lg lg:text-xl font-black tracking-tighter leading-none truncate",
                    isDiscounted ? "text-amber-600" : "text-slate-900 dark:text-white"
                  )}>
                    {formatCurrency(effectivePrice, currencySymbol)}
                  </span>
                  {isDiscounted && (
                    <span className="text-[9px] text-slate-400 line-through font-bold mt-1 truncate">
                      {formatCurrency(product.sellingPrice, currencySymbol)}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Mobile Quick Add */}
            <div className="md:hidden shrink-0">
              <Button 
                size="icon" 
                className="h-12 w-12 rounded-[1.5rem] shadow-xl shadow-primary/20 active:scale-90 transition-transform"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <ShoppingCart className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
