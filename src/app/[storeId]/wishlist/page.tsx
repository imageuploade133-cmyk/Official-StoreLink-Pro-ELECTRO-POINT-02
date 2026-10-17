'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/contexts/wishlist-context';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, documentId, orderBy } from 'firebase/firestore';
import type { Product, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { HeartCrack } from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { useSettings } from '@/contexts/settings-context';
import { ProductCardSkeleton } from '@/components/store/ProductCardSkeleton';
import { useStoreUrl } from '@/hooks/use-store-url';

export default function WishlistPage() {
  const { wishlistProductIds, isLoadingWishlist } = useWishlist();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { getStoreUrl } = useStoreUrl();
  const currencySymbol = settings?.currency || '$';
  
  const productIds = useMemo(() => Array.from(wishlistProductIds), [wishlistProductIds]);

  const productsQuery = useMemo(() => {
    if (!firestore || productIds.length === 0) return null;
    
    // Firestore 'in' query is limited to 30 elements.
    if (productIds.length > 30) {
        console.warn("Wishlist contains more than 30 items, only fetching the first 30.");
        return query(collection(firestore, 'products'), where(documentId(), 'in', productIds.slice(0, 30)));
    }
    
    return query(collection(firestore, 'products'), where(documentId(), 'in', productIds));
  }, [firestore, productIds]);
  
  const categoriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'categories'), orderBy('name'));
  }, [firestore]);

  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const isLoading = isLoadingWishlist || (productIds.length > 0 && isLoadingProducts);
  
  const categoryMap = useMemo(() => {
    if (!categories) return new Map();
    return new Map(categories.map(c => [c.id, c.name]));
  }, [categories]);

  const enrichedProducts = useMemo(() => {
    if (!products) return [];
    return products.map(p => ({
        ...p,
        categoryName: categoryMap.get(p.categoryId || '') || 'General Collection'
    }));
  }, [products, categoryMap]);
  
  return (
    <div className="bg-background">
      <header className="py-12 bg-muted dark:bg-slate-900/50 border-b dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">My Wishlist</h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-500">
            Your collection of favorite items. Don't let them get away!
          </p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {!products || products.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <HeartCrack className="mx-auto h-16 w-16 text-muted-foreground" />
            <h3 className="mt-6 text-xl font-semibold">Your Wishlist is Empty</h3>
            <p className="mt-2 text-muted-foreground">
              Looks like you haven't added anything yet.
            </p>
            <Button asChild className="mt-8">
              <Link href={getStoreUrl('/store/shop')}>Start Exploring</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {enrichedProducts.map(product => (
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
    </div>
  );
}
