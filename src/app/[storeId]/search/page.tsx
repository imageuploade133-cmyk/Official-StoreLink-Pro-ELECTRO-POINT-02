'use client';

import * as React from 'react';
import { useState, useMemo, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
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
  Loader2, 
  RotateCcw, 
  ChevronLeft, 
  X,
  SlidersHorizontal,
  LayoutGrid,
  ArrowRight,
  Filter
} from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';
import { ProductCardSkeleton } from '@/components/store/ProductCardSkeleton';
import { cn, convertToDateSafely } from '@/lib/utils';
import { useStoreUrl } from '@/hooks/use-store-url';

const ITEMS_PER_PAGE = 12;

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const storeId = params?.storeId as string;
  const { getStoreUrl } = useStoreUrl();
  const firestore = useFirestore();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';
  
  // Get grid column settings and convert to Tailwind classes
  const getGridClasses = () => {
    const defaultClass = (() => {
      const cols = settings?.storeGridColumnsDefault || 2;
      return cols === 3 ? 'grid-cols-3' : 'grid-cols-2';
    })();
    
    const smClass = (() => {
      const cols = settings?.storeGridColumnsSm || 2;
      return cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
    })();
    
    const mdClass = (() => {
      const cols = settings?.storeGridColumnsMd || 3;
      if (cols === 2) return 'md:grid-cols-2';
      if (cols === 4) return 'md:grid-cols-4';
      return 'md:grid-cols-3';
    })();
    
    const lgClass = (() => {
      const cols = settings?.storeGridColumnsLg;
      if (cols === 3) return 'lg:grid-cols-3';
      if (cols === 4) return 'lg:grid-cols-4';
      if (cols === 'custom') {
        const customCols = settings?.storeGridColumnsCustom || 4;
        if (customCols === 2) return 'lg:grid-cols-2';
        if (customCols === 3) return 'lg:grid-cols-3';
        if (customCols === 5) return 'lg:grid-cols-5';
        if (customCols === 6) return 'lg:grid-cols-6';
        if (customCols === 7) return 'lg:grid-cols-7';
        if (customCols === 8) return 'lg:grid-cols-8';
      }
      return 'lg:grid-cols-4';
    })();
    
    return `${defaultClass} ${smClass} ${mdClass} ${lgClass}`;
  };
  
  const gridClasses = getGridClasses();

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
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Sync state with URL
  useEffect(() => {
    setSearchTerm(queryParam);
  }, [queryParam]);

  // Data Fetching
  const categoriesQuery = useMemo(() => firestore && storeId ? query(collection(firestore, 'categories'), where('store_id', '==', storeId), orderBy('name')) : null, [firestore, storeId]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const categoryMap = useMemo(() => {
    if (!categories) return new Map();
    return new Map(categories.map(c => [c.id, c.name]));
  }, [categories]);

  const fetchFilteredProducts = useCallback(async () => {
    if (!firestore || !storeId) return;
    setIsLoading(true);

    try {
      let q = query(
        collection(firestore, 'products'), 
        where('store_id', '==', storeId),
        where('isVisibleOnWeb', '==', true),
        limit(1000) 
      );

      const snapshot = await getDocs(q);
      let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));

      // Keyword/Substring + Semantic Tag Filter
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

      // Category Filter
      if (selectedCategories.length > 0) {
        list = list.filter(p => selectedCategories.includes(p.categoryId || ''));
      }

      // Price Range Filter
      list = list.filter(p => p.sellingPrice >= priceRange[0] && p.sellingPrice <= priceRange[1]);

      // On Sale Filter
      if (onlyOnSale) {
        list = list.filter(p => p.promo?.isActive);
      }

      // Sorting
      if (sortBy === 'price-low') list.sort((a, b) => a.sellingPrice - b.sellingPrice);
      else if (sortBy === 'price-high') list.sort((a, b) => b.sellingPrice - a.sellingPrice);
      else list.sort((a, b) => {
          const bDate = convertToDateSafely(b.createdAt)?.getTime() || 0;
          const aDate = convertToDateSafely(a.createdAt)?.getTime() || 0;
          return bDate - aDate;
      });

      setTotalFilteredCount(list.length);
      
      // Pagination
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const paginatedList = list.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      
      setProducts(paginatedList.map(p => ({
          ...p,
          categoryName: categoryMap.get(p.categoryId || '') || 'General'
      })));

    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, storeId, searchTerm, selectedCategories, priceRange, sortBy, onlyOnSale, currentPage, categoryMap]);

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
  
  const activeFilters = (selectedCategories.length > 0 ? 1 : 0) + 
                        (priceRange[0] > 0 || priceRange[1] < 5000000 ? 1 : 0) + 
                        (onlyOnSale ? 1 : 0);

  const resetFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, 5000000]);
    setOnlyOnSale(false);
    setSearchTerm('');
    setCurrentPage(1);
    router.push(getStoreUrl('/store/search'));
  };

  return (
    <div className="bg-[#fcfcfc] dark:bg-black min-h-screen pb-20">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-site-container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
              {queryParam ? `Results for "${queryParam}"` : 'Search our products'}
            </h1>
            <div className="w-full relative max-w-lg group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#0071e3] transition-colors" />
              <Input 
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 rounded-2xl border-2 border-slate-100 focus:border-[#0071e3] transition-all text-lg shadow-sm"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
              {totalFilteredCount} items found in our registry
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-site-container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 shrink-0 space-y-10">
            {/* Desktop Filters */}
            <div className="hidden lg:block space-y-10">
              {/* Category Filter */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white flex items-center gap-2">
                  Collections
                </h3>
                <div className="space-y-2.5">
                  {categories?.map(cat => (
                    <label key={cat.id} className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative flex items-center">
                        <Checkbox 
                          checked={selectedCategories.includes(cat.id)}
                          onCheckedChange={() => handleCategoryToggle(cat.id)}
                          className="border-slate-300 dark:border-slate-700 data-[state=checked]:bg-[#0071e3] data-[state=checked]:border-[#0071e3]"
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-[#0071e3] transition-colors">
                        {cat.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                  Price
                </h3>
                <Slider
                  value={priceRange}
                  onValueChange={(val) => { setPriceRange(val as [number, number]); setCurrentPage(1); }}
                  max={5000000}
                  step={1000}
                  className="py-2"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0071e3] bg-[#0071e3]/5 px-2 py-1 rounded">
                    {currencySymbol}{priceRange[0].toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-[#0071e3] bg-[#0071e3]/5 px-2 py-1 rounded">
                    {currencySymbol}{priceRange[1].toLocaleString()}+
                  </span>
                </div>
              </div>

              {/* Sorting Filter */}
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                  Sort By
                </h3>
                <select 
                  value={sortBy} 
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-[#0071e3] cursor-pointer"
                >
                  <option value="newest">Latest arrivals</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              {/* Reset */}
              {activeFilters > 0 && (
                <Button 
                  variant="ghost" 
                  className="w-full text-xs font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  onClick={resetFilters}
                >
                  Clear all filters
                </Button>
              )}
            </div>

            {/* Mobile Filter Trigger */}
            <div className="lg:hidden flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-2xl gap-2 font-bold"
                onClick={() => setShowFilters(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilters > 0 && (
                  <span className="bg-[#0071e3] text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full ml-1">
                    {activeFilters}
                  </span>
                )}
              </Button>
              <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center px-4">
                <select 
                  value={sortBy} 
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-transparent border-none text-sm font-bold focus:ring-0"
                >
                  <option value="newest">Sort</option>
                  <option value="price-low">Price ↑</option>
                  <option value="price-high">Price ↓</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <main className="flex-1">
            {isLoading ? (
              <div className={cn("grid gap-6 sm:gap-8", gridClasses)}>
                {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length > 0 ? (
              <div className="space-y-12">
                <div className={cn("grid gap-6 sm:gap-8", gridClasses)}>
                  {products.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      category={categories?.find(c => c.id === product.categoryId)}
                      currencySymbol={currencySymbol} 
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-12 border-t border-slate-100 dark:border-slate-800">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1} 
                      className="rounded-xl h-12 w-12"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-sm font-bold px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl">
                      {currentPage} / {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages} 
                      className="rounded-xl h-12 w-12"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 px-6">
                <div className="h-24 w-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-8">
                  <Search className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-4">NO MATCHES FOUND</h3>
                <p className="text-slate-500 max-w-sm mx-auto mb-10 font-medium">
                  We couldn't find any products matching your search. Try adjusting your filters or search terms.
                </p>
                <Button 
                  className="rounded-full px-10 h-14 font-black uppercase text-sm tracking-widest bg-[#0071e3] hover:bg-[#0077ed]" 
                  onClick={resetFilters}
                >
                  Reset all filters
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-slate-950 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-black uppercase tracking-tight">Filters</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-10">
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0071e3]">Collections</h3>
              <div className="grid grid-cols-1 gap-3">
                {categories?.map(cat => (
                  <label key={cat.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900">
                    <Checkbox 
                      checked={selectedCategories.includes(cat.id)}
                      onCheckedChange={() => handleCategoryToggle(cat.id)}
                    />
                    <span className="font-bold text-sm">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0071e3]">Price Range</h3>
              <Slider
                value={priceRange}
                onValueChange={(val) => setPriceRange(val as [number, number])}
                max={5000000}
                step={1000}
              />
              <div className="flex justify-between font-bold">
                <span>{currencySymbol}{priceRange[0].toLocaleString()}</span>
                <span>{currencySymbol}{priceRange[1].toLocaleString()}+</span>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/80 backdrop-blur-xl">
            <Button 
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest bg-[#0071e3]"
              onClick={() => setShowFilters(false)}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}
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
