'use client';

import * as React from 'react';
import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue } from 'react';
import { startTransition } from 'react';
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
  ChevronRight,
  Package,
  Sparkles
} from 'lucide-react';
import { 
  CommandDialog, 
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem,
  CommandSeparator
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
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(open);
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
      limit(100)
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

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // Reset search when dialog closes
  useEffect(() => {
    if (wasOpenRef.current && !open && search) {
      startTransition(() => {
        setSearch('');
      });
    }
    wasOpenRef.current = open;
  }, [open, search]);

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

  const popularSearches = ['New Arrivals', 'Best Sellers', 'Flash Sales', 'Collections'];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      {/* Search Input Header */}
      <div className="relative flex items-center border-b border-black/5 dark:border-white/5 bg-gradient-to-b from-white/80 to-white/40 dark:from-black/80 dark:to-black/40">
        <div className="flex-1 flex items-center px-4 h-14">
          <Search className="h-5 w-5 shrink-0 text-[#0071e3] mr-3" strokeWidth={2.5} />
          <form onSubmit={handleSearch} className="flex-1">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
              placeholder="Search products, categories, collections..."
              autoComplete="off"
              spellCheck="false"
            />
          </form>
        </div>
        {search && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2 h-8 w-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5" 
            onClick={() => setSearch('')}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
        <div className="pr-4">
          <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded-md border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
            ESC
          </kbd>
        </div>
      </div>

      {/* Search Results Container */}
      <CommandList className="max-h-[min(80vh,600px)] overflow-y-auto overscroll-contain">
        {/* Empty State */}
        <CommandEmpty className="py-16">
          <div className="flex flex-col items-center justify-center space-y-4 px-4">
            <div className="relative">
              <div className="rounded-full bg-gradient-to-br from-[#0071e3]/10 to-[#0071e3]/5 dark:from-[#0071e3]/20 dark:to-[#0071e3]/10 p-5">
                <Search className="h-10 w-10 text-[#0071e3]" />
              </div>
              <div className="absolute -bottom-1 -right-1 rounded-full bg-white dark:bg-black p-1.5 shadow-sm">
                <Package className="h-3.5 w-3.5 text-[#0071e3]" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-foreground">No results found</p>
              <p className="text-xs text-muted-foreground">Try searching for &quot;{search}&quot; with different keywords</p>
            </div>
          </div>
        </CommandEmpty>

        {/* Default State - No Search */}
        {!search && (
          <div className="py-4">
            {/* Popular Searches */}
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-3">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Popular Searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((item) => (
                  <button
                    key={item}
                    onClick={() => setSearch(item)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/[0.03] dark:bg-white/[0.03] hover:bg-[#0071e3]/10 hover:text-[#0071e3] border border-black/5 dark:border-white/5 hover:border-[#0071e3]/20 text-xs font-medium text-foreground transition-all duration-200"
                  >
                    <Sparkles className="h-3 w-3" />
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <CommandSeparator className="my-4" />

            {/* Collections */}
            <CommandGroup heading={
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Collections</span>
              </div>
            }>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-1">
                {categories?.slice(0, 6).map((cat) => (
                  <CommandItem
                    key={cat.id}
                    onSelect={() => handleItemClick(`/store/shop?category=${cat.id}`)}
                    className="cursor-pointer flex items-center gap-3 p-3 rounded-xl hover:bg-[#0071e3]/5 active:bg-[#0071e3]/10 transition-all duration-200 aspect-square sm:aspect-auto"
                  >
                    <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-sm border border-black/5 dark:border-white/5">
                      <Image 
                        src={cat.imageUrl || `https://picsum.photos/seed/${cat.id}/100/100`} 
                        alt="" 
                        fill 
                        className="object-cover" 
                        unoptimized 
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-sm truncate">{cat.name}</span>
                      <span className="text-[10px] text-muted-foreground">Browse collection</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  </CommandItem>
                ))}
              </div>
            </CommandGroup>
          </div>
        )}

        {/* Search Results State */}
        {search && (
          <div className="py-2">
            {/* Category Matches */}
            {categoryMatches.length > 0 && (
              <CommandGroup heading={
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Collections</span>
                </div>
              }>
                <div className="px-1 py-1">
                  {categoryMatches.map((cat) => (
                    <CommandItem
                      key={cat.id}
                      onSelect={() => handleItemClick(`/store/shop?category=${cat.id}`)}
                      className="cursor-pointer w-full"
                    >
                      <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#0071e3]/5 active:bg-[#0071e3]/10 transition-all duration-200 group">
                        <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-sm border border-black/5 dark:border-white/5 transition-transform group-hover:scale-105">
                          <Image 
                            src={cat.imageUrl || `https://picsum.photos/seed/${cat.id}/100/100`} 
                            alt="" 
                            fill 
                            className="object-cover" 
                            unoptimized 
                          />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-semibold text-sm truncate">{cat.name}</span>
                          <span className="text-xs text-muted-foreground">View collection</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-[#0071e3] opacity-0 group-aria-selected:opacity-100 transition-opacity shrink-0" />
                      </div>
                    </CommandItem>
                  ))}
                </div>
              </CommandGroup>
            )}

            {/* Product Matches */}
            {searchResults.length > 0 && (
              <CommandGroup heading={
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                  <Package className="h-3.5 w-3.5" />
                  <span>Products</span>
                </div>
              }>
                <div className="px-1 py-1">
                  {searchResults.map((product) => {
                    const effectivePrice = calculateEffectivePrice(product as any, new Date());
                    const originalPrice = product.price;
                    const hasDiscount = effectivePrice < originalPrice && originalPrice > 0;
                    
                    return (
                      <CommandItem
                        key={product.id}
                        onSelect={() => handleItemClick(`/store/product/${product.slug || product.id}`)}
                        className="cursor-pointer w-full"
                      >
                        <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#0071e3]/5 active:bg-[#0071e3]/10 transition-all duration-200 group">
                          <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shrink-0 shadow-sm border border-black/5 dark:border-white/5 transition-transform group-hover:scale-105">
                            <Image 
                              src={product.imageUrl || 'https://placehold.co/100x100.png'} 
                              alt={product.name} 
                              fill 
                              className="object-cover" 
                              unoptimized 
                            />
                            {hasDiscount && (
                              <div className="absolute top-1 left-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                                -{Math.round((1 - effectivePrice / originalPrice) * 100)}%
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-semibold text-sm truncate">{product.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm font-bold text-[#0071e3]">
                                {formatCurrency(effectivePrice, settings?.currency || '$')}
                              </span>
                              {hasDiscount && (
                                <span className="text-xs text-muted-foreground line-through">
                                  {formatCurrency(originalPrice, settings?.currency || '$')}
                                </span>
                              )}
                            </div>
                            {product.stock !== undefined && (
                              <span className={cn(
                                "text-[10px] font-medium mt-0.5",
                                product.stock > 10 ? "text-emerald-600" : 
                                product.stock > 0 ? "text-amber-600" : "text-rose-600"
                              )}>
                                {product.stock > 10 ? 'In Stock' : 
                                 product.stock > 0 ? `Only ${product.stock} left` : 'Out of Stock'}
                              </span>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-[#0071e3] opacity-0 group-aria-selected:opacity-100 transition-opacity shrink-0" />
                        </div>
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            )}

            {/* Search CTA */}
            {(categoryMatches.length > 0 || searchResults.length > 0) && (
              <div className="p-4 mt-2">
                <Button 
                  className="w-full justify-center gap-2.5 rounded-xl h-12 text-sm font-semibold bg-gradient-to-r from-[#0071e3] to-[#0077ed] hover:from-[#0077ed] hover:to-[#0071e3] text-white shadow-lg shadow-[#0071e3]/20 transition-all duration-300 active:scale-[0.98]"
                  onClick={handleSearch}
                >
                  View all results for &quot;{search}&quot;
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Quick Tips when no results */}
            {search && categoryMatches.length === 0 && searchResults.length === 0 && (
              <div className="px-4 py-6 space-y-3">
                <p className="text-xs font-medium text-muted-foreground text-center">Quick tips:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Use generic keywords', 'Check spelling', 'Try shorter terms', 'Browse categories'].map((tip) => (
                    <div key={tip} className="flex items-center gap-2 text-xs text-muted-foreground/70 bg-black/[0.02] dark:bg-white/[0.02] rounded-lg px-3 py-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#0071e3]/50" />
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CommandList>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-[10px] text-muted-foreground/60">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-5 select-none items-center rounded border border-black/10 dark:border-white/10 bg-white dark:bg-black px-1.5 font-mono text-[9px] font-medium shadow-sm">
              ↵

            </kbd>
            <span>to search</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-5 select-none items-center rounded border border-black/10 dark:border-white/10 bg-white dark:bg-black px-1.5 font-mono text-[9px] font-medium shadow-sm">
              ↑
            </kbd>
            <kbd className="inline-flex h-5 select-none items-center rounded border border-black/10 dark:border-white/10 bg-white dark:bg-black px-1.5 font-mono text-[9px] font-medium shadow-sm">
              ↓
            </kbd>
            <span>to navigate</span>
          </span>
        </div>
        <span className="hidden sm:block">Press ESC to close</span>
      </div>
    </CommandDialog>
  );
}
