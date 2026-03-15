'use client';

import React, { useState, useMemo, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  startAfter, 
  endBefore, 
  limitToLast,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData 
} from 'firebase/firestore';
import type { Product, Category } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  ChevronRight, 
  Zap, 
  ShoppingBag as BagIcon, 
  Loader2, 
  RotateCcw, 
  ChevronLeft, 
  X,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { ProductCardSkeleton } from '@/components/store/ProductCardSkeleton';
import { cn, convertToDateSafely } from '@/lib/utils';

const ITEMS_PER_PAGE = 12;

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';

  // URL State
  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';

  // Filter State
  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categoryParam ? [categoryParam] : []);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000]);
  const [onlyOnSale, setOnlyOnSale] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  
  // Pagination & List State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);

  // Sync state with URL
  useEffect(() => {
    setSearchTerm(queryParam);
  }, [queryParam]);

  // Data Fetching
  const categoriesQuery = useMemo(() => firestore ? query(collection(firestore, 'categories'), orderBy('name')) : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const categoryMap = useMemo(() => {
    if (!categories) return new Map();
    return new Map(categories.map(c => [c.id, c.name]));
  }, [categories]);

  const fetchFilteredProducts = useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      // ROBUST UNIVERSAL SEARCH ARCHITECTURE
      // Fetch a larger chunk of active products to simulate advanced filtering locally
      let q = query(
        collection(firestore, 'products'), 
        where('isVisibleOnWeb', '==', true),
        limit(1000) 
      );

      const snapshot = await getDocs(q);
      let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));

      // 1. Keyword/Substring + Semantic Tag Filter
      const term = searchTerm.toLowerCase().trim();
      if (term) {
        if (term === 'new arrivals') {
            list = list.filter(p => p.isNewArrival);
        } else if (term === 'best sellers') {
            list = list.filter(p => p.isPopular);
        } else if (term === 'clearance') {
            list = list.filter(p => p.isOldStock);
        } else if (term === 'flash hub') {
            list = list.filter(p => p.promo?.isActive);
        } else if (term === 'luxury') {
            list = list.filter(p => p.isOfficialBrand || p.dataAiHint?.toLowerCase().includes('luxury'));
        } else if (term === 'essential') {
            list = list.filter(p => p.dataAiHint?.toLowerCase().includes('essential') || p.description?.toLowerCase().includes('essential'));
        } else {
            list = list.filter(p => 
                p.name.toLowerCase().includes(term) || 
                p.sku?.toLowerCase().includes(term) ||
                p.description?.toLowerCase().includes(term)
            );
        }
      }

      // 2. Category Filter
      if (selectedCategories.length > 0) {
        list = list.filter(p => selectedCategories.includes(p.categoryId || ''));
      }

      // 3. Price Range Filter
      list = list.filter(p => p.sellingPrice >= priceRange[0] && p.sellingPrice <= priceRange[1]);

      // 4. On Sale Filter
      if (onlyOnSale) {
        list = list.filter(p => p.promo?.isActive);
      }

      // 5. Sorting
      if (sortBy === 'price-low') list.sort((a, b) => a.sellingPrice - b.sellingPrice);
      else if (sortBy === 'price-high') list.sort((a, b) => b.sellingPrice - a.sellingPrice);
      else list.sort((a, b) => (convertToDateSafely(b.createdAt)?.getTime() || 0) - (convertToDateSafely(a.createdAt)?.getTime() || 0));

      setTotalFilteredCount(list.length);
      
      // Pagination Simulation
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const paginatedList = list.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      
      setProducts(paginatedList.map(p => ({
          ...p,
          categoryName: categoryMap.get(p.categoryId || '') || 'General'
      })));
      
      setIsLastPage(startIndex + ITEMS_PER_PAGE >= list.length);

    } catch (error) {
      console.error("Search engine sync error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, searchTerm, selectedCategories, priceRange, sortBy, onlyOnSale, currentPage, categoryMap]);

  useEffect(() => {
    fetchFilteredProducts();
  }, [fetchFilteredProducts]);

  const handleCategoryToggle = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalFilteredCount / ITEMS_PER_PAGE);

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <nav className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-widest mb-6">
            <Link href="/store" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-primary">Registry Search</span>
          </nav>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
                {queryParam ? `Matches: "${queryParam}"` : 'Universal Registry'}
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Showing <span className="text-primary font-bold">{totalFilteredCount}</span> premium items found in the discovery engine.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => { setCurrentPage(1); fetchFilteredProducts(); }} className="h-11 rounded-xl px-4">
                <RotateCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} /> Resync
              </Button>
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sort:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 cursor-pointer"
                >
                  <option value="newest">Latest Discovery</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-72 shrink-0 space-y-10">
            <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-[0.2em] text-primary">Direct Search</Label>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Keyword or SKU..." 
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="pl-10 h-11 rounded-xl shadow-inner border-none bg-slate-50 dark:bg-slate-800"
                    />
                </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-6">Collections</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                {categories?.map(cat => (
                  <label key={cat.id} className="flex items-center gap-3 cursor-pointer group">
                    <Checkbox 
                      checked={selectedCategories.includes(cat.id)}
                      onCheckedChange={() => handleCategoryToggle(cat.id)}
                      className="border-slate-300 dark:border-slate-700 data-[state=checked]:bg-primary"
                    />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-6">Magnitude Limit</h3>
              <div className="px-2 space-y-6">
                <Slider
                  value={priceRange}
                  onValueChange={(val) => { setPriceRange(val as [number, number]); setCurrentPage(1); }}
                  max={5000000}
                  step={1000}
                  className="py-4"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-primary">{currencySymbol}{priceRange[0].toLocaleString()}</span>
                  <span className="text-xs font-black text-primary">{currencySymbol}{priceRange[1].toLocaleString()}+</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-6">Flash Deals</h3>
              <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-100 dark:border-amber-900/30 transition-all">
                <Checkbox 
                  checked={onlyOnSale}
                  onCheckedChange={(checked) => { setOnlyOnSale(!!checked); setCurrentPage(1); }}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase">On Sale Only</span>
                </div>
                <Zap className="ml-auto h-4 w-4 text-amber-500 fill-current" />
              </label>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest border-2"
              onClick={() => {
                setSelectedCategories([]);
                setPriceRange([0, 5000000]);
                setOnlyOnSale(false);
                setSearchTerm('');
                setCurrentPage(1);
                router.push('/store/search');
              }}
            >
              Flush All Filters
            </Button>
          </aside>

          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length > 0 ? (
              <div className="space-y-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                  {products.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      category={categories?.find(c => c.id === product.categoryId)}
                      currencySymbol={currencySymbol} 
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between pt-12 border-t border-dashed gap-6">
                        <p className="text-xs font-black uppercase text-muted-foreground tracking-[0.2em]">
                            Page {currentPage} of {totalPages} <span className="mx-2 text-slate-200">|</span> Discovery Mode Active
                        </p>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="lg" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-xl font-bold">
                                <ChevronLeft className="h-4 w-4 mr-2" /> Prev
                            </Button>
                            <Button variant="outline" size="lg" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-xl font-bold">
                                Next <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center mb-6">
                  <BagIcon className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-black tracking-tight">No registry matches found</h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto">Try using broader keywords like "iron" or "solar". Substring matching is now active.</p>
                <Button className="mt-8 rounded-full px-10 h-14 font-black uppercase text-[10px]" onClick={() => { setSearchTerm(''); setSelectedCategories([]); }}>
                  Clear Discovery Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>}>
      <SearchPageContent />
    </Suspense>
  );
}