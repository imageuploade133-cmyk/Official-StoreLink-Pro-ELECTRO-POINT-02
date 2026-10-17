'use client';

import * as React from 'react';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Sparkles,
  Command as CommandIcon,
  Trash2,
  Eye,
  SearchCode
} from 'lucide-react';
import { 
  Command,
  CommandList, 
  CommandEmpty, 
  CommandGroup, 
  CommandItem,
  CommandSeparator
} from '@/components/ui/command';
import { 
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Drawer, 
  DrawerContent,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { useStoreUrl } from '@/hooks/use-store-url';
import { useSettings } from '@/contexts/settings-context';
import type { Product, Category } from '@/lib/types';
import { formatCurrency } from '@/lib/formatUtils';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

interface SearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RECENT_SEARCHES_KEY = 'store_recent_searches';

export function SearchOverlay({ open, onOpenChange }: SearchOverlayProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'categories'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
    return [];
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { storeId, getStoreUrl } = useStoreUrl();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const isMobile = useIsMobile();

  const saveRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    const newSearches = [
      term.trim(),
      ...recentSearches.filter(s => s.toLowerCase() !== term.trim().toLowerCase())
    ].slice(0, 5);
    setRecentSearches(newSearches);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
  }, [recentSearches]);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const removeRecentSearch = (termToRemove: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = recentSearches.filter(s => s !== termToRemove);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch categories
  const categoriesQuery = useMemo(() => {
    if (!firestore || !storeId) return null;
    return query(collection(firestore, 'categories'), where('store_id', '==', storeId), orderBy('name'));
  }, [firestore, storeId]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  // Fetch products (limit to 100 for client-side search performance)
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

  const { searchResults, categoryMatches, trendingProducts } = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    
    // Get trending products (just some visible products when search is empty)
    const trending = (products || []).slice(0, 4);

    if (!term || !products) return { searchResults: [], categoryMatches: [], trendingProducts: trending };

    const directMatches = products.filter(p => {
      const termLower = term.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(termLower);
      const skuMatch = p.sku?.toLowerCase().includes(termLower);
      const tagMatch = p.tags?.some(tag => tag.toLowerCase().includes(termLower));
      const aiHintMatch = p.dataAiHint?.toLowerCase().includes(termLower);
      
      // Also match against category name if product has category_id
      const categoryMatch = categories?.find(c => c.id === p.category_id)?.name.toLowerCase().includes(termLower);

      return nameMatch || skuMatch || tagMatch || aiHintMatch || categoryMatch;
    });

    const catMatches = (categories || []).filter(c => 
      c.name.toLowerCase().includes(term)
    );

    return { 
      searchResults: directMatches.slice(0, 8), 
      categoryMatches: catMatches.slice(0, 4),
      trendingProducts: trending
    };
  }, [debouncedSearch, products, categories]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (search.trim()) {
      saveRecentSearch(search.trim());
      router.push(getStoreUrl(`/store/search?q=${encodeURIComponent(search.trim())}`));
      onOpenChange(false);
    }
  };

  const handleItemClick = (url: string, term?: string) => {
    if (term) saveRecentSearch(term);
    router.push(getStoreUrl(url));
    onOpenChange(false);
  };

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearch('');
    }
    onOpenChange(newOpen);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (value.trim()) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
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

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="text-primary font-bold">{part}</span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const searchContent = (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Search Input Header - Premium Look */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-2xl border-b border-border/50">
        <div className="relative flex items-center px-5 py-5">
          <Search className={cn(
            "h-6 w-6 shrink-0 transition-colors duration-300",
            isSearching ? "text-primary animate-pulse" : "text-muted-foreground"
          )} strokeWidth={2.5} />
          <form onSubmit={handleSearch} className="flex-1 ml-4">
            <input
              ref={inputRef}
              value={search}
              onChange={handleSearchChange}
              className="w-full bg-transparent text-lg sm:text-xl font-bold outline-none placeholder:text-muted-foreground/40 disabled:cursor-not-allowed text-foreground"
              placeholder="Search products, collections, tags..."
              autoComplete="off"
              spellCheck="false"
            />
          </form>
          <div className="flex items-center gap-2">
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-muted transition-all duration-200"
                onClick={() => setSearch('')}
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </Button>
            )}
            {!isMobile && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl border border-border bg-muted/50 text-[10px] font-mono font-bold text-muted-foreground">
                <span>ESC</span>
              </div>
            )}
          </div>
        </div>

        {/* Category / Scope Filter Tabs */}
        {search && (
          <div className="flex items-center gap-2 px-5 pb-3 pt-1 border-t border-border/30 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap",
                activeTab === 'all'
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              All ({searchResults.length + categoryMatches.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap",
                activeTab === 'products'
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Products ({searchResults.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap",
                activeTab === 'categories'
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Collections ({categoryMatches.length})
            </button>
          </div>
        )}
      </div>

      {/* Search Results Container */}
      <CommandList className="flex-1 overflow-y-auto scrollbar-hide">
        {isSearching && search && (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isSearching && (
          <>
            <CommandEmpty className="py-20 flex flex-col items-center justify-center">
              <div className="rounded-2xl bg-muted/50 p-6 mb-4">
                <Search className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold">No products found</h3>
              <p className="text-sm text-muted-foreground mt-1 px-8 text-center">
                We couldn&apos;t find anything matching &quot;{search}&quot;. Try different keywords or browse our collections.
              </p>
              <Button 
                variant="outline" 
                className="mt-6 rounded-full px-6"
                onClick={() => setSearch('')}
              >
                Clear search
              </Button>
            </CommandEmpty>

            {/* Initial State - Recent & Trending */}
            {!search && (
              <div className="py-6 space-y-8">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="px-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                        <History className="h-3.5 w-3.5" />
                        <span>Recent Searches</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearRecentSearches}
                        className="h-7 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term) => (
                        <div
                          key={term}
                          onClick={() => setSearch(term)}
                          className="group flex items-center gap-2 px-4 py-2 rounded-full bg-muted/60 hover:bg-primary/10 hover:text-primary cursor-pointer transition-all duration-300 text-sm font-bold border border-transparent hover:border-primary/20"
                        >
                          <span>{term}</span>
                          <button
                            type="button"
                            onClick={(e) => removeRecentSearch(term, e)}
                            className="text-muted-foreground/50 hover:text-destructive p-0.5 rounded-full transition-colors ml-1"
                            title="Remove item"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Products */}
                <div className="px-6">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Trending Now</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {trendingProducts.map((product) => (
                      <div 
                        key={product.id}
                        onClick={() => handleItemClick(`/store/product/${product.slug || product.id}`)}
                        className="group flex items-center gap-4 p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-primary/5 cursor-pointer transition-all duration-300 border border-transparent hover:border-primary/10"
                      >
                        <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-background shadow-sm group-hover:scale-105 transition-transform duration-500">
                          <Image 
                            src={product.imageUrl || 'https://placehold.co/100x100.png'} 
                            alt={product.name} 
                            fill 
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{product.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatCurrency(calculateEffectivePrice(product as any, new Date()), settings?.currency || '$')}
                          </p>
                        </div>
                        <Eye className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Popular Collections */}
                <div className="px-6">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Popular Collections</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categories?.slice(0, 6).map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleItemClick(`/store/shop?category=${cat.id}`)}
                        className="group relative flex flex-col items-center justify-center p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-primary/5 transition-all duration-300 border border-transparent hover:border-primary/10 overflow-hidden"
                      >
                        <div className="relative h-12 w-12 rounded-full overflow-hidden mb-2 border-2 border-background shadow-sm group-hover:scale-110 transition-transform duration-500">
                          <Image 
                            src={cat.imageUrl || `https://picsum.photos/seed/${cat.id}/100/100`} 
                            alt={cat.name} 
                            fill 
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <span className="text-xs font-bold text-center truncate w-full">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search Results */}
            {search && (
              <div className="pb-6 space-y-4">
                {/* Category Results */}
                {categoryMatches.length > 0 && (activeTab === 'all' || activeTab === 'categories') && (
                  <CommandGroup heading="Collections" className="px-4">
                    {categoryMatches.map((cat) => (
                      <CommandItem
                        key={cat.id}
                        onSelect={() => handleItemClick(`/store/shop?category=${cat.id}`, search)}
                        className="rounded-2xl p-2.5 mb-1 cursor-pointer transition-colors hover:bg-primary/5"
                      >
                        <div className="flex items-center gap-4 w-full p-1">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <LayoutGrid className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-sm text-foreground truncate">{highlightMatch(cat.name, search)}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">Explore Collection</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Product Results */}
                {searchResults.length > 0 && (activeTab === 'all' || activeTab === 'products') && (
                  <CommandGroup heading="Products" className="px-4">
                    <div className="grid grid-cols-1 gap-2">
                      {searchResults.map((product) => {
                        const effectivePrice = calculateEffectivePrice(product as any, new Date());
                        const originalPrice = product.price || product.sellingPrice;
                        const hasDiscount = effectivePrice < originalPrice && originalPrice > 0;
                        const categoryName = categories?.find(c => c.id === product.category_id || c.id === product.categoryId)?.name;
                        
                        return (
                          <CommandItem
                            key={product.id}
                            onSelect={() => handleItemClick(`/store/product/${product.slug || product.id}`, search)}
                            className="rounded-2xl p-2.5 cursor-pointer group transition-all border border-transparent hover:border-primary/20 hover:bg-primary/5"
                          >
                            <div className="flex items-center gap-4 w-full">
                              <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-muted shadow-sm shrink-0 border border-border">
                                <Image 
                                  src={product.imageUrl || 'https://placehold.co/100x100.png'} 
                                  alt={product.name} 
                                  fill 
                                  className="object-cover group-hover:scale-110 transition-transform duration-500" 
                                  unoptimized 
                                />
                                {hasDiscount && (
                                  <div className="absolute top-1 left-1 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter shadow-sm">
                                    Sale
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {categoryName && (
                                    <span className="text-[9px] font-black text-primary/80 uppercase tracking-widest">{categoryName}</span>
                                  )}
                                  {product.sku && (
                                    <span className="text-[9px] font-medium text-muted-foreground/60 font-mono">SKU: {highlightMatch(product.sku, search)}</span>
                                  )}
                                </div>
                                <span className="font-extrabold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                                  {highlightMatch(product.name, search)}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm font-black text-foreground">
                                    {formatCurrency(effectivePrice, settings?.currency || '$')}
                                  </span>
                                  {hasDiscount && (
                                    <span className="text-xs text-muted-foreground line-through decoration-rose-500/40">
                                      {formatCurrency(originalPrice, settings?.currency || '$')}
                                    </span>
                                  )}
                                  <div className="ml-auto">
                                    {product.stock !== undefined && (
                                      <span className={cn(
                                        "text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border",
                                        product.stock > 10 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400" :
                                        product.stock > 0 ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400" : "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400"
                                      )}>
                                        {product.stock > 10 ? 'In Stock' : 
                                         product.stock > 0 ? `${product.stock} Left` : 'Out of Stock'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </div>
                  </CommandGroup>
                )}

                {/* View All Button */}
                {(categoryMatches.length > 0 || searchResults.length > 0) && (
                  <div className="p-6">
                    <Button
                      className="w-full justify-center gap-3 rounded-2xl h-14 text-base font-bold bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all duration-300 active:scale-[0.98] group"
                      onClick={handleSearch}
                    >
                      Explore all results for &quot;{search}&quot;
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CommandList>

      {/* Footer - Apple Inspired */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-black/5 dark:border-white/5 bg-secondary/30 backdrop-blur-md mt-auto">
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          <div className="flex items-center gap-1.5">
            <kbd className="flex h-5 w-5 items-center justify-center rounded border bg-background shadow-sm">↵</kbd>
            <span>Select</span>
          </div>
          {!isMobile && (
            <div className="flex items-center gap-1.5">
              <div className="flex flex-col">
                <kbd className="flex h-4 w-4 items-center justify-center rounded border bg-background shadow-sm mb-0.5">↑</kbd>
                <kbd className="flex h-4 w-4 items-center justify-center rounded border bg-background shadow-sm">↓</kbd>
              </div>
              <span>Navigate</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          <SearchCode className="h-3.5 w-3.5" />
          <span>Smart Search</span>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="h-[95vh] p-0 overflow-hidden">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Search Store</DrawerTitle>
          </DrawerHeader>
          <Command className="h-full rounded-none border-none">
            {searchContent}
          </Command>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[800px] p-0 overflow-hidden border-none shadow-2xl bg-transparent">
        <DialogTitle className="sr-only">Search Store</DialogTitle>
        <DialogDescription className="sr-only">
          Search for products, categories and collections.
        </DialogDescription>
        <Command className="h-full rounded-2xl overflow-hidden border shadow-2xl">
          {searchContent}
        </Command>
      </DialogContent>
    </Dialog>
  );
}
