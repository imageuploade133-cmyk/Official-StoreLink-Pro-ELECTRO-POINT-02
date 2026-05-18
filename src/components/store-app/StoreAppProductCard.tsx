'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/contexts/cart-context';
import { useWishlist } from '@/contexts/wishlist-context';
import { useSettings } from '@/contexts/settings-context';
import { calculateEffectivePrice, getLowestVariantPrice } from '@/lib/pos-utils';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Heart, 
    Zap, 
    ShoppingCart, 
    ShoppingBag, 
    Plus,
    TrendingUp
} from 'lucide-react';
import type { Product, Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface StoreAppProductCardProps {
    product: Product;
    category?: Category | string;
    onProductClick: (id: string) => void;
    /** Optional category name override string (e.g. from categoryMap) */
    categoryName?: string;
}

export function StoreAppProductCard({ 
    product, 
    category, 
    onProductClick, 
    categoryName 
}: StoreAppProductCardProps) {
    const { settings } = useSettings();
    const { addToCart } = useCart();
    const { wishlistProductIds, addToWishlist, removeFromWishlist } = useWishlist();
    const { toast } = useToast();
    const currencySymbol = settings?.currency || '$';
    const [today] = useState(() => new Date());

    const effectivePrice = useMemo(
        () => calculateEffectivePrice(product as any, today, category as any),
        [product, today, category]
    );

    const displayPrice = useMemo(() => {
        if (product.hasVariants && product.variants && product.variants.length > 0) {
            const cheapest = getLowestVariantPrice(product.variants);
            return calculateEffectivePrice({ ...product, sellingPrice: cheapest } as any, today, category as any);
        }
        return effectivePrice;
    }, [product, effectivePrice, today, category]);

    const isDiscounted = displayPrice < (product.hasVariants && product.variants && product.variants.length > 0 ? getLowestVariantPrice(product.variants) : product.sellingPrice) || effectivePrice < product.sellingPrice;
    const originalPrice = (product.hasVariants && product.variants && product.variants.length > 0) ? getLowestVariantPrice(product.variants) : product.sellingPrice;

    const isLiked = wishlistProductIds.has(product.id);
    const catName = categoryName 
        ?? (typeof category === 'string' ? category : category?.name)
        ?? 'Premium Series';

    // Grid Cart Button Style
    const gridCartButtonStyle = useMemo(() => {
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

    const gridCartButtonClasses = useMemo(() => {
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
        
        const sizeClasses = {
            sm: 'h-8 w-8',
            md: 'h-10 w-10',
            lg: 'h-12 w-12',
            xl: 'h-14 w-14'
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
        
        const sizeClass = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md;
        let shapeClass = shapeClasses[shape] || 'rounded-2xl';
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

    const gridCartIconName = settings?.storeGridCartIcon || 'ShoppingCart';
    const iconMapForGrid: Record<string, any> = {
        ShoppingCart, ShoppingBag, Plus, Zap, Heart, TrendingUp
    };
    const GridCartIcon = iconMapForGrid[gridCartIconName] || ShoppingCart;

    return (
        <div className="group relative">
            <div 
                onClick={() => onProductClick(product.id)} 
                className="block w-full text-left cursor-pointer"
            >
                {/* Image Container */}
                <div 
                    className={cn(
                        "relative aspect-[3/4] rounded-[2.5rem] overflow-hidden",
                        "bg-white dark:bg-slate-800 mb-5",
                        "border-2 border-slate-200 dark:border-slate-700",
                        "shadow-2xl transition-all active:scale-[0.98]",
                        "hover:border-primary/20"
                    )}
                >
                    <Image 
                        alt={product.name}  
                        className={cn(
                            "w-full h-full object-cover transition-transform duration-1000",
                            settings?.enableHoverZoom !== false && "group-hover:scale-110"
                        )}
                        src={product.imageUrl || 'https://placehold.co/400x600.png'}
                        fill
                        unoptimized
                    />
                    
                    {/* Wishlist / Heart Button */}
                    <div 
                        className={cn(
                            "absolute top-4 right-4 w-10 h-10 flex items-center justify-center",
                            "backdrop-blur-xl rounded-2xl shadow-2xl",
                            "transition-all active:scale-90 z-10",
                            "border border-white/20",
                            isLiked ? "bg-rose-500 text-white border-rose-400" : "bg-white/90 dark:bg-slate-900/90 text-slate-400"
                        )}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            isLiked ? removeFromWishlist(product.id) : addToWishlist(product.id);
                        }}
                    >
                        <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                    </div> 

                    {/* Add to Cart Button */}
                    <div className="absolute bottom-4 right-4 z-10">
                        <Button 
                            size="icon" 
                            style={gridCartButtonStyle}
                            className={cn(
                                "rounded-2xl text-white shadow-2xl",
                                "hover:scale-110 transition-transform active:scale-90",
                                "border-none",
                                gridCartButtonClasses
                            )}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (product.hasVariants) {
                                    onProductClick(product.id);
                                    return;
                                }
                                addToCart(product, effectivePrice);
                                toast({ title: "Bag Updated", description: `${product.name} successfully added.` });
                            }}
                            disabled={product.stock <= 0}
                        >
                            <GridCartIcon className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Promo Badge */}
                    {product.promo?.isActive && (
                        <div className="absolute bottom-4 left-4">
                            <Badge className="bg-rose-500 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 border-none shadow-2xl animate-pulse">
                                <Zap className="h-3 w-3 mr-1.5 fill-current text-yellow-400" /> Special Offer
                            </Badge>
                        </div>
                    )}
                </div>
                
                {/* Product Info */}
                <div className="space-y-1.5 px-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/60">{catName}</p>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white truncate leading-tight tracking-tight uppercase group-hover:text-primary transition-colors">{product.name}</h4>
                    <div className="flex items-baseline gap-2 pt-1">
                        <p className="text-primary font-black text-base tracking-tighter">
                            {product.hasVariants && product.variants && product.variants.length > 0 ? 'From ' : ''}
                            {formatCurrency(displayPrice, currencySymbol)}
                        </p>
                        {isDiscounted && (
                            <span className="text-[10px] text-slate-400 line-through font-bold opacity-60">{formatCurrency(originalPrice, currencySymbol)}</span> 
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function StoreAppProductCardSkeleton() {
    return (
        <div className="space-y-4">
            <Skeleton className="aspect-[3/4] w-full rounded-[2.5rem]" />
            <div className="space-y-2 px-2">
                <Skeleton className="h-2 w-1/2 rounded-full" />
                <Skeleton className="h-4 w-full rounded-full" />
            </div>
        </div>
    );
}
