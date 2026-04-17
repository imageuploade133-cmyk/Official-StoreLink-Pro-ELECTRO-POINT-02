'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRecentlyViewed } from '@/contexts/recently-viewed-context';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, documentId, orderBy } from 'firebase/firestore';
import type { Product, Category } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { Skeleton } from '../ui/skeleton';
import { History, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { useSettings } from '@/contexts/settings-context';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { useStoreUrl } from '@/hooks/use-store-url';

interface RecentlyViewedSectionProps {
  excludeId?: string;
  onViewAll?: () => void; // Added for app-mode integration
}

export function RecentlyViewedSection({ excludeId, onViewAll }: RecentlyViewedSectionProps) {
  const { viewedProductIds } = useRecentlyViewed();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { storeId, getStoreUrl } = useStoreUrl();
  const currencySymbol = settings?.currency || '$';

  // Filter out current product and limit to 10 for the slider
  const targetIds = useMemo(() => {
    return viewedProductIds
      .filter(id => id !== excludeId)
      .slice(0, 10);
  }, [viewedProductIds, excludeId]);

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

  // Maintain the original viewing order (Firestore 'in' doesn't guarantee order)
  const orderedProducts = useMemo(() => {
    if (!products) return [];
    return targetIds
      .map(id => {
        const p = products.find(prod => prod.id === id);
        if (!p) return null;
        return {
          ...p,
          categoryName: categoryMap.get(p.categoryId || '') || 'General Collection'
        };
      })
      .filter(Boolean) as (Product & { categoryName: string })[];
  }, [products, targetIds, categoryMap]);

  if (!isLoading && orderedProducts.length === 0) return null;

  return (
    <section className="py-20 border-t border-slate-100 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row items-baseline justify-between mb-12 gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <History className="h-7 w-7 text-primary" />
            Recently Viewed
          </h2>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pick up where you left off</p>
        </div>
        
        {onViewAll ? (
          <Button 
            variant="ghost" 
            className="font-black text-[10px] uppercase tracking-widest text-primary p-0 h-auto hover:bg-transparent"
            onClick={onViewAll}
          >
            View Full History <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button asChild variant="ghost" className="font-black text-[10px] uppercase tracking-widest text-primary p-0 h-auto hover:bg-transparent">
            <Link href={getStoreUrl('/store/recently-viewed')} className="flex items-center gap-2">
              View Full History <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square w-full rounded-2xl" />)}
        </div>
      ) : (
        <Carousel 
          opts={{ 
            align: 'start', 
            loop: orderedProducts.length > 2,
            dragFree: true
          }} 
          className="w-full"
        >
          <CarouselContent className="-ml-4 md:-ml-6">
            {orderedProducts.map((product) => (
              <CarouselItem key={product.id} className="pl-4 md:pl-6 basis-[75%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <ProductCard product={product} currencySymbol={currencySymbol} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="hidden sm:block">
            <CarouselPrevious className="-left-12" />
            <CarouselNext className="-right-12" />
          </div>
        </Carousel>
      )}
    </section>
  );
}
