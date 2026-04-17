'use client';

import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { AlertTriangle, Search } from 'lucide-react';
import { ProductCard } from '@/components/pos/ProductCard';
import type { DisplayProduct } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';

const ProductCardSkeleton = () => {
    return (
      <Card className="overflow-hidden  flex flex-col">
        <Skeleton className="relative w-full aspect-[4/3] bg-muted/50" />
        <CardHeader className="p-4">
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-grow space-y-2">
          <Skeleton className="h-8 w-1/3 mb-1" /> 
          <Skeleton className="h-5 w-1/4" /> 
          <Skeleton className="h-4 w-1/2 mt-1" /> 
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Skeleton className="h-11 w-full" />
        </CardFooter>
      </Card>
    );
};

interface ProductGridProps {
    products: DisplayProduct[];
    loading: boolean;
    error: string | null;
    onAddToCart: (product: DisplayProduct, priceForSale: number) => void;
    currencySymbol: string;
    isGlobalPriceModificationDisabled: boolean;
    defaultImageUrl: string;
    globalLowStockThreshold: number;
    today: Date | null;
    onRetry: () => void;
    allProductsCount: number;
}

export function ProductGrid({
    products,
    loading,
    error,
    onAddToCart,
    currencySymbol,
    isGlobalPriceModificationDisabled,
    defaultImageUrl,
    globalLowStockThreshold,
    today,
    onRetry,
    allProductsCount,
}: ProductGridProps) {
    const { settings } = useSettings();
    
    const gridColsClass = useMemo(() => {
        const size = settings?.posProductSize || 'big';
        const customCols = settings?.posCustomColumns || 2;
        
        if (size === 'big') return 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2';
        if (size === 'small') return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
        
        if (size === 'custom') {
            switch(customCols) {
                case 1: return 'grid-cols-1';
                case 2: return 'grid-cols-2';
                case 3: return 'grid-cols-2 sm:grid-cols-3';
                case 4: return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
                case 5: return 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5';
                case 6: return 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6';
                default: return 'grid-cols-2';
            }
        }
        return 'grid-cols-2';
    }, [settings?.posProductSize, settings?.posCustomColumns]);

    return (
        <ScrollArea className="flex-1 -mx-4 px-4">
        {loading && (
          <div className={`grid gap-3 sm:gap-6 pr-1 sm:pr-2 pb-4 ${gridColsClass}`}>
            {Array.from({ length: 6 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        )}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-destructive">
            <AlertTriangle className="h-10 w-10 mb-2" />
            <p className="font-semibold">{error}</p>
            <p>Please check your connection or try refreshing.</p>
            <Button onClick={onRetry} variant="outline" className="mt-4">Retry</Button>
          </div>
        )}
        {!loading && !error && products.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
            <Search className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No Products Found</p>
            <p className="text-sm">Try adjusting your search or filter.</p>
            {allProductsCount === 0 && <p className="text-xs mt-2">Your product inventory is empty. Add products in the Inventory section.</p>}
          </div>
        )}
        {!loading && !error && products.length > 0 && (
           <div className={`grid gap-3 sm:gap-6 pr-1 sm:pr-2 pb-4 ${gridColsClass}`}>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                priority={index < 6} 
                currencySymbol={currencySymbol}
                isGlobalPriceModificationDisabled={isGlobalPriceModificationDisabled}
                defaultImageUrl={defaultImageUrl}
                lowStockThreshold={product.lowStockThreshold ?? globalLowStockThreshold}
                today={today}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    )
}
