'use client';

import React, { useMemo, useState } from 'react';
import { useRecentlyViewed } from '@/contexts/recently-viewed-context';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, documentId, orderBy } from 'firebase/firestore';
import type { Product, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { History, ArrowLeft, Filter, X } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStoreUrl } from '@/hooks/use-store-url';
import { StoreAppProductCard } from './StoreAppProductCard';

interface RecentlyViewedViewProps {
    onClose: () => void;
    onSelectProduct: (id: string) => void;
}

export function RecentlyViewedView({ onClose, onSelectProduct }: RecentlyViewedViewProps) {
    const { viewedProductIds, clearHistory, removeViewedProduct } = useRecentlyViewed();
    const firestore = useFirestore();
    const { storeId } = useStoreUrl();
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
    
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
                    <div className="grid grid-cols-2 gap-x-5 gap-y-10 px-6 py-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="space-y-4">
                                <div className="aspect-[3/4] bg-slate-100/50 dark:bg-slate-900/50 rounded-[2.5rem] animate-pulse" />
                                <div className="space-y-2 px-2">
                                    <div className="h-2 w-1/2 bg-slate-100/50 dark:bg-slate-900/50 rounded-full animate-pulse" />
                                    <div className="h-4 w-full bg-slate-100/50 dark:bg-slate-900/50 rounded-full animate-pulse" />
                                </div>
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
                    <div className="grid grid-cols-2 gap-x-5 gap-y-10 px-6 py-6">
                        {orderedProducts.map((product) => (
                            <StoreAppProductCard 
                                key={product.id} 
                                product={product} 
                                categoryName={product.categoryName}
                                onProductClick={onSelectProduct}
                            />
                        ))}
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
