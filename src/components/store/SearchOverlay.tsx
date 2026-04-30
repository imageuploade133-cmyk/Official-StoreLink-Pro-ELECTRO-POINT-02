'use client';

import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  ArrowRight, 
  LayoutGrid, 
  TrendingUp, 
  History,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { 
  CommandDialog, 
  CommandInput, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem 
} from '@/components/ui/command';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { useStoreUrl } from '@/hooks/use-store-url';
import { useSettings } from '@/contexts/settings-context';
import type { Product, Category } from '@/lib/types';
import { formatCurrency } from '@/lib/formatUtils';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchOverlay({ open, onOpenChange }: SearchOverlayProps) {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { storeId, getStoreUrl } = useStoreUrl();
  const firestore = useFirestore();
  const { settings } = useSettings();

  // Fetch categories
  const categoriesQuery = useMemo(() => {
    if (!firestore || !storeId) return null;
    return query(collection(firestore, 'categories'), where('store_id', '==', storeId), orderBy('name'));
  }, [firestore, storeId]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  // Fetch products
  const productsQuery = useMemo(() => {
    if (!firestore || !storeId) return null;
    return query(
      collection(firestore, 'products'), 
      where('store_id', '==', storeId),
      where('isVisibleOnWeb', '==', true),
      limit(100) // Reduced limit for better performance in overlay
    );
  }, [firestore, storeId]);
  const { data: products } = useCollection<Product>(productsQuery);

  const { searchResults, categoryMatches } = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term || !products) return { searchResults: [], categoryMatches: [] };

    const directMatches = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.sku?.toLowerCase().includes(term) ||
      p.dataAiHint?.toLowerCase().includes(term)
    );

    const catMatches = (categories || []).filter(c => 
      c.name.toLowerCase().includes(term)
    );

    return { 
      searchResults: directMatches.slice(0, 6), 
      categoryMatches: catMatches.slice(0, 3)
    };
  }, [search, products, categories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(getStoreUrl(`/store/search?q=${encodeURIComponent(search.trim())}`));
      onOpenChange(false);
    }
  };

  const handleItemClick = (url: string) => {
    router.push(getStoreUrl(url));
    onOpenChange(false);
  };

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <form onSubmit={handleSearch} className="flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search products, collections..."
          />
        </form>
        {search && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => setSearch('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <CommandList className="max-h-[80vh] sm:max-h-[500px]">
        <CommandEmpty className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">No results found for "{search}"</p>
          </div>
        </CommandEmpty>

        {!search && (
          <>
            <CommandGroup heading="Popular Searches">
              {['New Arrivals', 'Best Sellers', 'Flash Sales', 'Collections'].map((item) => (
                <CommandItem
                  key={item}
                  onSelect={() => {
                    setSearch(item);
                  }}
                  className="cursor-pointer"
                >
                  <TrendingUp className="mr-2 h-4 w-4 text-slate-400" />
                  <span>{item}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Collections">
              {categories?.slice(0, 5).map((cat) => (
                <CommandItem
                  key={cat.id}
                  onSelect={() => handleItemClick(`/store/shop?category=${cat.id}`)}
                  className="cursor-pointer"
                >
                  <LayoutGrid className="mr-2 h-4 w-4 text-slate-400" />
                  <span>{cat.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {search && (
          <>
            {categoryMatches.length > 0 && (
              <CommandGroup heading="Collections">
                {categoryMatches.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    onSelect={() => handleItemClick(`/store/shop?category=${cat.id}`)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="relative h-8 w-8 rounded bg-slate-100 overflow-hidden">
                        <Image 
                          src={cat.imageUrl || `https://picsum.photos/seed/${cat.id}/100/100`} 
                          alt="" 
                          fill 
                          className="object-cover" 
                          unoptimized 
                        />
                      </div>
                      <span className="font-medium">{cat.name}</span>
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {searchResults.length > 0 && (
              <CommandGroup heading="Products">
                {searchResults.map((product) => (
                  <CommandItem
                    key={product.id}
                    onSelect={() => handleItemClick(`/store/product/${product.slug || product.id}`)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className="relative h-12 w-12 rounded-md border bg-white overflow-hidden shrink-0">
                        <Image 
                          src={product.imageUrl || 'https://placehold.co/100x100.png'} 
                          alt={product.name} 
                          fill 
                          className="object-cover" 
                          unoptimized 
                        />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-bold text-sm truncate">{product.name}</span>
                        <span className="text-xs text-slate-500 font-medium">
                          {formatCurrency(calculateEffectivePrice(product as any, new Date()), settings?.currency || '$')}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#0071e3] opacity-0 group-aria-selected:opacity-100 transition-opacity" />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <div className="p-4 border-t">
              <Button 
                className="w-full justify-center gap-2 rounded-xl h-11 font-bold"
                onClick={handleSearch}
              >
                View all results for "{search}"
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
