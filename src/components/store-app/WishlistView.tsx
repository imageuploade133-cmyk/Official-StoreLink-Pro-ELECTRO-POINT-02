'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { ProductImage } from '@/components/ProductImage';
import { useWishlist } from '@/contexts/wishlist-context';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, documentId, orderBy } from 'firebase/firestore';
import type { Product, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { 
    Heart, 
    ArrowLeft, 
    Trash2, 
    ShoppingBag, 
    Loader2, 
    ShoppingCart, 
    X,
    Filter,
    ArrowRight,
    Sparkles,
    CheckCircle2,
    Zap,
    Plus
} from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { useCart } from '@/contexts/cart-context';
import { formatCurrency } from '@/lib/formatUtils';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useStoreUrl } from '@/hooks/use-store-url';

interface WishlistViewProps {
    onClose: () => void;
    onSelectProduct: (id: string) => void;
}

export function WishlistView({ onClose, onSelectProduct }: WishlistViewProps) {
    const { wishlistProductIds, removeFromWishlist, wishlistCount } = useWishlist();
    const firestore = useFirestore();
    const { settings } = useSettings();
    const { storeId } = useStoreUrl();
    const { addToCart } = useCart();
    
    const [today, setToday] = useState<Date | null>(null);
    useEffect(() => { setToday(new Date()); }, []);

    const currencySymbol = settings?.currency || '$';
    const defaultImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/400x500.png';
    
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
            sm: 'h-8 text-[8px] px-3',
            md: 'h-10 text-[9px] px-4',
            lg: 'h-12 text-[10px] px-6',
            xl: 'h-14 text-[11px] px-8'
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
        
        const sizeClass = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.lg;
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

    const GridCartIcon = useMemo(() => {
        const iconName = settings?.storeGridCartIcon || 'ShoppingCart';
        const iconMap: Record<string, any> = {
            ShoppingCart, ShoppingBag, Plus, Zap, Heart, Sparkles, CheckCircle2
        };
        return iconMap[iconName] || ShoppingCart;
    }, [settings?.storeGridCartIcon]);
    
    const productIds = useMemo(() => Array.from(wishlistProductIds), [wishlistProductIds]);

    const productsQuery = useMemo(() => {
        if (!firestore || productIds.length === 0 || !storeId) return null;
        return query(
            collection(firestore, 'products'), 
            where('store_id', '==', storeId),
            where(documentId(), 'in', productIds.slice(0, 30))
        );
    }, [firestore, productIds, storeId]);
    
    const categoriesQuery = useMemo(() => {
        if (!firestore || !storeId) return null;
        return query(
            collection(firestore, 'categories'), 
            where('store_id', '==', storeId),
            orderBy('name')
        );
    }, [firestore, storeId]);

    const { data: products, isLoading } = useCollection<Product>(productsQuery);
    const { data: categories } = useCollection<Category>(categoriesQuery);

    const categoryMap = useMemo(() => {
        if (!categories) return new Map();
        return new Map(categories.map(c => [c.id, c.name]));
    }, [categories]);

    const handleAddToCart = (e: React.MouseEvent, product: Product, price: number) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product, price);
    };

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-black animate-in slide-in-from-right-4 duration-500">
            <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-black/80 backdrop-blur-md px-4 py-6 justify-between border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                    >
                        <ArrowLeft className="h-5 w-5" strokeWidth={3} />
                    </button>
                    <h1 className="text-xl font-black leading-tight tracking-tighter uppercase">My Favorites</h1>
                </div>
                <Badge variant="secondary" className="font-black h-8 px-4 rounded-full shadow-sm">{wishlistCount}</Badge>
            </header>

            <ScrollArea className="flex-1 px-4 pb-32">
                {isLoading && wishlistCount > 0 ? (
                    <div className="grid grid-cols-2 gap-4 p-2 py-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="space-y-3">
                                <div className="aspect-[4/5] w-full bg-slate-200 dark:bg-slate-800 rounded-[2rem] animate-pulse" />
                                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : wishlistCount === 0 ? (
                    <div className="py-32 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                        <div className="h-32 w-32 bg-slate-100 dark:bg-slate-800/50 rounded-[3rem] flex items-center justify-center mx-auto shadow-inner group">
                            <Heart className="h-14 w-14 text-slate-300 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tight uppercase">Registry Empty</h3>
                            <p className="text-sm text-slate-500 font-medium max-w-[220px] mx-auto leading-relaxed">Save the premium items you love for instant retrieval here.</p>
                        </div>
                        <Button onClick={onClose} size="lg" className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-10 h-14 shadow-xl active:scale-95 transition-transform">Start Curating</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 p-2 py-6">
                        {products?.map((product) => {
                            const price = calculateEffectivePrice(product as any, today);
                            const isOutOfStock = product.stock <= 0;
                            const catName = categoryMap.get(product.categoryId || '') || 'Collection';
                            
                            return (
                                <div 
                                    key={product.id}
                                    className="group relative flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500"
                                >
                                    <div 
                                        className="relative w-full aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all"
                                        onClick={() => onSelectProduct(product.id)}
                                    >
                                        <ProductImage 
                                            src={product.imageUrl} 
                                            alt={product.name} 
                                            fill 
                                            className={cn(
                                                "object-cover transition-transform duration-1000",
                                                settings?.enableHoverZoom !== false && "group-hover:scale-110",
                                                isOutOfStock && "grayscale opacity-50"
                                            )} 
                                            unoptimized 
                                        />
                                        
                                        {/* Action Overlays */}
                                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeFromWishlist(product.id); }}
                                                className="size-9 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl text-rose-500 border border-white/50 z-30"
                                            >
                                                <X className="h-5 w-5" strokeWidth={3} />
                                            </button>
                                        </div>

                                        <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-30">
                                            <Button 
                                                onClick={(e) => handleAddToCart(e, product, price)}
                                                disabled={isOutOfStock}
                                                style={gridCartButtonStyle}
                                                className={cn("w-full font-black uppercase tracking-widest active:scale-95 border-none", gridCartButtonClasses)}
                                            >
                                                <GridCartIcon className="h-4 w-4 mr-2" /> Move to Bag
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 px-2">
                                        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-primary/60 truncate">{catName}</p>
                                        <h4 className="font-black text-sm text-slate-900 dark:text-white truncate leading-tight tracking-tight">{product.name}</h4>
                                        <div className="flex items-center justify-between mt-1">
                                            <p className="text-primary font-black text-base tracking-tighter">{formatCurrency(price, currencySymbol)}</p>
                                            {isOutOfStock && <Badge variant="destructive" className="text-[8px] h-4 uppercase font-black tracking-tighter">Depleted</Badge>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
