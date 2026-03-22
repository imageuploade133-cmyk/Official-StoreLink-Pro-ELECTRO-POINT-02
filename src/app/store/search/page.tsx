'use client';

import React, { useState, useMemo, useEffect, Suspense, useCallback } from 'react';
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
  SlidersHorizontal
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
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

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
      let q = query(
        collection(firestore, 'products'), 
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
      else list.sort((a, b) => (convertToDateSafely(b.createdAt)?.getTime() || 0) - (convertToDateSafely(a.createdAt)?.getTime() || 0));

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
  
  const activeFilters = (selectedCategories.length > 0 ? 1 : 0) + 
                        (priceRange[0] > 0 || priceRange[1] < 5000000 ? 1 : 0) + 
                        (onlyOnSale ? 1 : 0);

  // Loading state messaging
  const getLoadingMessage = () => {
    if (searchTerm && !isLoading) return `Searched for "${searchTerm}"`;
    if (activeFilters > 0 && !isLoading) return `${activeFilters} filter${activeFilters > 1 ? 's' : ''} applied`;
    return 'Loading products';
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen pb-20">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-widest mb-4 sm:mb-6">
            <Link href="/store" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-primary">Registry Search</span>
          </nav>
          
          {/* Title and Controls */}
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase break-words">
                {queryParam ? `Matches: "${queryParam}"` : 'Universal Registry'}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Showing <span className="text-primary font-bold">{totalFilteredCount}</span> items found
                </p>
                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 sm:ml-4 sm:pl-4 sm:border-l border-slate-200 dark:border-slate-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="font-medium">{getLoadingMessage()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls Bar - Responsive Layout */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              {/* Filter Toggle Button */}
              <Button 
                variant={showFilters ? "default" : "outline"} 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)} 
                className="lg:hidden w-full sm:w-auto h-10 rounded-lg px-4 gap-2 relative text-sm"
              >
                <SlidersHorizontal className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{showFilters ? 'Hide' : 'Show'} Filters</span>
                {activeFilters > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 w-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0">
                    {activeFilters}
                  </span>
                )}
              </Button>

              {/* Resync Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => { setCurrentPage(1); fetchFilteredProducts(); }} 
                disabled={isLoading}
                className="h-10 rounded-lg px-4 text-sm flex-shrink-0 transition-all"
              >
                <RotateCcw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} /> 
                <span className="hidden sm:inline">{isLoading ? 'Searching' : 'Resync'}</span>
              </Button>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm flex-shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 hidden sm:inline">Sort:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 cursor-pointer"
                >
                  <option value="newest">Latest</option>
                  <option value="price-low">Low Price</option>
                  <option value="price-high">High Price</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Backdrop */}
      {showFilters && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowFilters(false)}
        />
      )}

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar Filters - Modal on mobile, sidebar on desktop */}
          <aside className={cn(
            "lg:col-span-1 space-y-6",
            "fixed lg:relative inset-y-0 left-0 w-full sm:w-80 lg:w-auto lg:sticky lg:top-32",
            "transition-transform duration-300 ease-in-out",
            "bg-white dark:bg-slate-900 lg:bg-transparent",
            "overflow-y-auto lg:overflow-visible",
            "p-6 sm:p-8 lg:p-0 z-50 lg:z-auto",
            "top-0 h-screen sm:h-auto lg:h-auto",
            "-translate-x-full lg:translate-x-0",
            showFilters && "translate-x-0"
          )}>
            {/* Mobile Close Button */}
            {showFilters && (
              <div className="flex lg:hidden items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-black text-lg">Filters</h2>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Search Filter */}
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-[0.2em] text-primary">Direct Search</Label>
              <div className="relative group">
                {isLoading ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin flex-shrink-0" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors flex-shrink-0" />
                )}
                <Input 
                  placeholder="Keyword or SKU..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-10 h-10 rounded-lg text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Categories Filter */}
            <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Collections</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {categories?.map(cat => (
                  <label key={cat.id} className="flex items-center gap-3 cursor-pointer group">
                    <Checkbox 
                      checked={selectedCategories.includes(cat.id)}
                      onCheckedChange={() => handleCategoryToggle(cat.id)}
                      className="border-slate-300 dark:border-slate-700 data-[state=checked]:bg-primary flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors truncate">
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Price Range</h3>
              <Slider
                value={priceRange}
                onValueChange={(val) => { setPriceRange(val as [number, number]); setCurrentPage(1); }}
                max={5000000}
                step={1000}
                className="py-4"
              />
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-black text-primary truncate">{currencySymbol}{priceRange[0].toLocaleString()}</span>
                <span className="font-black text-primary truncate">{currencySymbol}{priceRange[1].toLocaleString()}+</span>
              </div>
            </div>

            {/* Sale Filter */}
            <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Flash Deals</h3>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 transition-all">
                <Checkbox 
                  checked={onlyOnSale}
                  onCheckedChange={(checked) => { setOnlyOnSale(!!checked); setCurrentPage(1); }}
                  className="flex-shrink-0"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase truncate">On Sale Only</span>
                </div>
                <Zap className="h-4 w-4 text-amber-500 fill-current flex-shrink-0" />
              </label>
            </div>

            {/* Reset Button */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-6">
              <Button 
                variant="outline" 
                className="w-full h-10 rounded-lg font-black text-xs uppercase tracking-widest"
                onClick={() => {
                  setSelectedCategories([]);
                  setPriceRange([0, 5000000]);
                  setOnlyOnSale(false);
                  setSearchTerm('');
                  setCurrentPage(1);
                  router.push('/store/search');
                }}
              >
                Reset Filters
              </Button>

              {/* Mobile Close After Filters */}
              <Button 
                className="w-full lg:hidden h-10 rounded-lg font-black text-xs uppercase tracking-widest"
                onClick={() => setShowFilters(false)}
              >
                View Products
              </Button>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="lg:col-span-3 w-full relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    {searchTerm ? `Searching for "${searchTerm}"...` : 'Filtering products...'}
                  </p>
                </div>
              </div>
            )}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length > 0 ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-slate-200 dark:border-slate-800 gap-4 sm:gap-6">
                    <p className="text-xs font-black uppercase text-muted-foreground tracking-[0.2em] text-center sm:text-left">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1} 
                        className="rounded-lg h-10 px-3 text-sm"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> 
                        <span className="hidden sm:inline">Prev</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages} 
                        className="rounded-lg h-10 px-3 text-sm"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 px-4 sm:px-8">
                <div className="h-16 w-16 sm:h-24 sm:w-24 bg-muted rounded-full flex items-center justify-center mb-4 sm:mb-6 flex-shrink-0">
                  <BagIcon className="h-8 w-8 sm:h-10 sm:w-10 text-slate-300" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">No matches found</h3>
                <p className="text-slate-500 mt-2 text-sm sm:text-base max-w-sm mx-auto">Try using broader keywords or adjust your filters</p>
                <Button 
                  className="mt-6 rounded-full px-6 sm:px-10 h-10 sm:h-14 font-black uppercase text-xs sm:text-sm" 
                  onClick={() => { 
                    setSearchTerm(''); 
                    setSelectedCategories([]); 
                    setPriceRange([0, 5000000]);
                    setOnlyOnSale(false);
                  }}
                >
                  Clear Filters
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
