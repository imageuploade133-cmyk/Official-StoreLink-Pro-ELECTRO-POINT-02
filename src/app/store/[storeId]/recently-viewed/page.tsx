'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRecentlyViewed } from '@/contexts/recently-viewed-context';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, documentId, orderBy } from 'firebase/firestore';
import type { Product, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { History, ArrowLeft, Trash2, ShoppingBag } from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { useSettings } from '@/contexts/settings-context';
import { ProductCardSkeleton } from '@/components/store/ProductCardSkeleton';
import { DeleteConfirmationDialog } from '@/components/dialogs/delete-confirmation-dialog';

export default function RecentlyViewedPage() {
  const { viewedProductIds, clearHistory } = useRecentlyViewed();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  
  const currencySymbol = settings?.currency || '$';
  
  const productsQuery = useMemo(() => {
    if (!firestore || viewedProductIds.length === 0) return null;
    return query(collection(firestore, 'products'), where(documentId(), 'in', viewedProductIds.slice(0, 20)));
  }, [firestore, viewedProductIds]);
  
  const categoriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'categories'), orderBy('name'));
  }, [firestore]);

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const categoryMap = useMemo(() => {
    if (!categories) return new Map();
    return new Map(categories.map(c => [c.id, c.name]));
  }, [categories]);

  // Maintain original order
  const orderedProducts = useMemo(() => {
    if (!products) return [];
    return viewedProductIds
      .map(id => {
        const p = products.find(prod => prod.id === id);
        if (!p) return null;
        return {
          ...p,
          categoryName: categoryMap.get(p.categoryId || '') || 'General Collection'
        };
      })
      .filter(Boolean) as (Product & { categoryName: string })[];
  }, [products, viewedProductIds, categoryMap]);

  const handleConfirmClear = () => {
    clearHistory();
    setIsClearDialogOpen(false);
  };

  return (
    <div className="bg-background">
      <header className="py-12 bg-muted dark:bg-slate-900/50 border-b dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
                <Link href="/store/shop" className="text-xs font-black uppercase text-primary tracking-widest flex items-center justify-center md:justify-start gap-2 mb-4 hover:underline">
                    <ArrowLeft className="h-3 w-3" /> Back to Shop
                </Link>
                <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center md:justify-start gap-4">
                    <History className="h-10 w-10 text-primary" />
                    Browsing History
                </h1>
                <p className="mt-2 text-slate-500 font-medium">Items you've viewed during your recent visit.</p>
            </div>
            
            {viewedProductIds.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsClearDialogOpen(true)} 
                  className="rounded-xl font-bold border-red-200 text-red-600 hover:bg-red-50 gap-2"
                >
                    <Trash2 className="h-4 w-4" /> Clear History
                </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {isLoadingProducts && viewedProductIds.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : viewedProductIds.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed rounded-[3rem] bg-muted/10">
            <ShoppingBag className="mx-auto h-16 w-16 text-slate-300 mb-6" />
            <h3 className="text-2xl font-black tracking-tight">Your history is empty</h3>
            <p className="mt-2 text-muted-foreground max-w-sm mx-auto">Start exploring our collection to keep track of items you love.</p>
            <Button asChild size="lg" className="mt-8 px-10 rounded-2xl font-bold">
              <Link href="/store/shop">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {orderedProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                category={categories?.find(c => c.id === product.categoryId)}
                currencySymbol={currencySymbol} 
              />
            ))}
          </div>
        )}
      </main>

      <DeleteConfirmationDialog 
        isOpen={isClearDialogOpen}
        onOpenChange={setIsClearDialogOpen}
        onConfirm={handleConfirmClear}
        isDeleting={false}
        itemName="your entire browsing history"
        itemType="history"
        dialogTitle="Clear Browsing History?"
        dialogDescription="Are you sure you want to delete your recently viewed items? This action cannot be undone."
        confirmButtonText="Yes, Clear History"
      />
    </div>
  );
}
