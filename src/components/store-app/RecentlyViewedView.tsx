'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRecentlyViewed } from '@/contexts/recently-viewed-context';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, documentId, orderBy } from 'firebase/firestore';
import type { Product, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { 
    History, 
    ChevronLeft, 
    Trash2, 
    ShoppingBag, 
    Loader2, 
    Heart, 
    ShoppingCart, 
    Star,
    X,
    Filter,
    ArrowLeft
} from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { useCart } from '@/contexts/cart-context';
import { useWishlist } from '@/contexts/wishlist-context';
import { formatCurrency } from '@/lib/formatUtils';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useStoreUrl } from '@/hooks/use-store-url';

interface RecentlyViewedViewProps {
    onClose: () => void;
    onSelectProduct: (id: string) => void;
}

export function RecentlyViewedView({ onClose, onSelectProduct }: RecentlyViewedViewProps) {
    const { viewedProductIds, clearHistory, removeViewedProduct } = useRecentlyViewed();
    const firestore = useFirestore();
    const { settings } = useSettings();
    const { storeId } = useStoreUrl();
    const { addToCart } = useCart();
    const { wishlistProductIds, addToWishlist, removeFromWishlist } = useWishlist();
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
    
    const currencySymbol = settings?.currency || '$';
    const defaultImageUrl = settings?.defaultProductImageUrl || 'https://placehold.co/400x500.png';
    
    const targetIds = useMemo(() => viewedProductIds.slice(0, 20), [viewedProductIds]);

    const productsQuery = useMemo(() => {
        if (!firestore || targetIds.length === 0 || !storeId) return null;
        return query(
            collection(firestore, 'products'), 
            where('store_id', '==', storeId),
            where(documentId(), 'in', targetIds)
        );
    }, [firestore, targetIds, storeId]);
    
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

    // Maintain original viewing order (most recent first)
    const orderedProducts = useMemo(() => {
        if (!products) return [];
        return targetIds
            .map(id => {
                const p = products.find(prod => prod.id === id);
                if (!p) return null;
                return {
                    ...p,
                    categoryName: categoryMap.get(p.categoryId || '') || 'Collection'
                };
            })
            .filter(Boolean) as (Product & { categoryName: string })[];
    }, [products, targetIds, categoryMap]);

    const handleConfirmClear = () => {
        clearHistory();
        setIsClearDialogOpen(false);
    };

    const handleRemoveItem = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        removeViewedProduct(id);
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
                    <h1 className="text-xl font-black leading-tight tracking-tighter uppercase">Memory</h1>
                </div>
                <button 
                    onClick={() => setIsClearDialogOpen(true)}
                    disabled={viewedProductIds.length === 0}
                    className="text-primary text-xs font-black uppercase tracking-widest hover:opacity-80 transition-opacity disabled:opacity-30"
                >
                    Clear All
                </button>
            </header>

            <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Discovery Registry</p>
                    <p className="text-sm font-bold">{viewedProductIds.length} Items Found</p>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
                    <Filter className="h-3.5 w-3.5" strokeWidth={3} />
                    Filter
                </button>
            </div>

            <ScrollArea className="flex-1 px-4 pb-32">
                {isLoading && viewedProductIds.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 p-2 py-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="space-y-3">
                                <div className="aspect-[4/5] w-full bg-slate-200 dark:bg-slate-800 rounded-[2rem] animate-pulse" />
                                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : viewedProductIds.length === 0 ? (
                    <div className="py-32 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                        <div className="h-32 w-32 bg-slate-100 dark:bg-slate-800/50 rounded-[3rem] flex items-center justify-center mx-auto shadow-inner group">
                            <History className="h-14 w-14 text-slate-300 group-hover:rotate-180 transition-transform duration-1000" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tight uppercase">Registry Empty</h3>
                            <p className="text-sm text-slate-500 font-medium max-w-[220px] mx-auto leading-relaxed">Your browsing history will be archived here for instant retrieval.</p>
                        </div>
                        <Button onClick={onClose} size="lg" className="rounded-2xl font-black uppercase text-[10px] tracking-widest px-10 h-14 shadow-xl active:scale-95 transition-transform">Begin Exploration</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 p-2">
                        {orderedProducts.map((product) => {
                            const price = calculateEffectivePrice(product as any, new Date());
                            
                            return (
                                <div 
                                    key={product.id}
                                    className="group relative flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500"
                                >
                                    <div 
                                        className="relative w-full aspect-[4/5] overflow-hidden rounded-[2rem] bg-white dark:bg-slate-800 shadow-lg border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all"
                                        onClick={() => onSelectProduct(product.id)}
                                    >
                                        <Image 
                                            src={product.imageUrl || defaultImageUrl} 
                                            alt={product.name} 
                                            fill 
                                            className="object-cover transition-transform duration-1000 group-hover:scale-110" 
                                            unoptimized 
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-primary/5 transition-colors duration-500" />
                                        
                                        <button 
                                            onClick={(e) => handleRemoveItem(e, product.id)}
                                            className="absolute top-3 right-3 size-9 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl text-slate-400 hover:text-rose-500 hover:scale-110 transition-all active:scale-90 z-30 border border-white/50"
                                        >
                                            <X className="h-5 w-5" strokeWidth={3} />
                                        </button>

                                        {product.promo?.isActive && (
                                            <div className="absolute bottom-3 left-3">
                                                <Badge className="bg-rose-500 text-white font-black text-2xs uppercase tracking-widest px-2 py-0.5 border-none shadow-lg">On Offer</Badge>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1 px-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 truncate">{product.categoryName}</p>
                                        <h4 className="font-black text-sm text-slate-900 dark:text-white truncate leading-tight tracking-tight">{product.name}</h4>
                                        <p className="text-primary font-black text-base tracking-tighter mt-0.5">{formatCurrency(price, currencySymbol)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>

            <DeleteConfirmationDialog 
                isOpen={isClearDialogOpen}
                onOpenChange={setIsClearDialogOpen}
                onConfirm={handleConfirmClear}
                isDeleting={false}
                itemName="your entire discovery history"
                itemType="history"
                dialogTitle="Purge All Records?"
                dialogDescription="This will permanently delete the local log of all items you've explored. Your wishlist and bag will remain intact."
                confirmButtonText="Yes, Purge History"
            />
        </div>
    );
}
