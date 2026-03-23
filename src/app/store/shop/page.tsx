'use client';

import React, { useState, useMemo, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { ProductCard } from '@/components/store/ProductCard';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, RotateCcw, PackageSearch, Sparkles, Loader2 } from 'lucide-react';
import { ProductCardSkeleton } from '@/components/store/ProductCardSkeleton';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 12;

function ShopPageContent() {
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // URL-driven state
    const categoryFromUrl = searchParams.get('category') || 'all';
    const qFromUrl = searchParams.get('q') || '';

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

    const [searchTerm, setSearchTerm] = useState(qFromUrl);
    
    // Pagination State
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);
    const [totalProductsCount, setTotalProductsCount] = useState(0);

    // Scroll state for header hide/show
    const [showHeader, setShowHeader] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    // Search suggestions state
    const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Category auto-switch notification
    const [categoryNotification, setCategoryNotification] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

    const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
    const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

    // Fetch categories for the filter dropdown
    const categoriesQuery = useMemo(() => firestore ? query(collection(firestore, 'categories'), orderBy('name')) : null, [firestore]);
    const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

    const categoryMap = useMemo(() => {
        if (!categories) return new Map();
        return new Map(categories.map(c => [c.id, c.name]));
    }, [categories]);

    // Fetch search suggestions
    const fetchSuggestions = useCallback(async (term: string) => {
        if (!firestore || !term.trim() || term.length < 1) {
            setSearchSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsLoadingSuggestions(true);
        try {
            const searchTerm = term.toLowerCase().trim();
            
            // Fetch all visible products without orderBy to avoid index issues
            const q = query(
                collection(firestore, 'products'),
                where('isVisibleOnWeb', '==', true),
                limit(500) // Fetch larger batch for local filtering
            );

            const snapshot = await getDocs(q);
            const allProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
            
            // Filter by search term locally with flexible matching
            const filtered = allProducts.filter(p =>
                (p.name && p.name.toLowerCase().includes(searchTerm)) ||
                (p.sku && p.sku.toLowerCase().includes(searchTerm)) ||
                (p.description && p.description.toLowerCase().includes(searchTerm))
            ).slice(0, 8); // Show up to 8 suggestions

            console.log("[v0] Suggestions - Search term:", searchTerm, "Total products:", allProducts.length, "Filtered:", filtered.length);
            
            setSearchSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            console.log("[v0] Error details:", error);
            setSearchSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [firestore]);

    // Debounce search suggestions
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.trim()) {
                fetchSuggestions(searchTerm);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, fetchSuggestions]);

    const fetchProducts = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
        if (!firestore) return;
        setIsLoadingProducts(true);

        try {
            // Build base query with only required filters
            let q = query(
                collection(firestore, 'products'), 
                where('isVisibleOnWeb', '==', true)
            );

            if (categoryFromUrl !== 'all') {
                q = query(
                    collection(firestore, 'products'),
                    where('isVisibleOnWeb', '==', true),
                    where('categoryId', '==', categoryFromUrl)
                );
            }

            // Fetch a larger batch for local filtering
            const snapshot = await getDocs(query(q, limit(1000)));
            let allProducts = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as Product));

            // Apply search filter locally for flexible matching
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                allProducts = allProducts.filter(p =>
                    p.name.toLowerCase().includes(term) ||
                    p.sku?.toLowerCase().includes(term) ||
                    p.description?.toLowerCase().includes(term)
                );
            }

            // Sort by creation date descending
            allProducts.sort((a, b) => {
                const aDate = a.createdAt instanceof Date ? a.createdAt.getTime() : 
                             typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0;
                const bDate = b.createdAt instanceof Date ? b.createdAt.getTime() : 
                             typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0;
                return bDate - aDate;
            });

            setTotalProductsCount(allProducts.length);

            // Handle pagination
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const paginatedProducts = allProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

            if (paginatedProducts.length > 0) {
                const list = paginatedProducts.map(product => ({
                    ...product,
                    categoryName: categoryMap.get(product.categoryId || '') || 'Uncategorized'
                }));

                setProducts(list);
                setIsLastPage(startIndex + ITEMS_PER_PAGE >= allProducts.length);
                
                if (direction === 'next') setCurrentPage(p => p + 1);
                else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
                else setCurrentPage(1);
            } else {
                if (direction === 'initial') {
                    setProducts([]);
                    setIsLastPage(true);
                }
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setIsLoadingProducts(false);
        }
    }, [firestore, categoryFromUrl, searchTerm, categoryMap, currentPage]);

    useEffect(() => {
        fetchProducts('initial');
    }, [fetchProducts]);

    // Handle header visibility on scroll
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            // Show header when scrolling up or at the top
            if (currentScrollY < lastScrollY || currentScrollY < 100) {
                setShowHeader(true);
            } 
            // Hide header when scrolling down
            else if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setShowHeader(false);
            }
            
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const handleCategoryChange = (value: string, isAutoSwitch: boolean = false) => {
        if (isAutoSwitch && value !== 'all') {
            const categoryName = categoryMap.get(value) || 'Category';
            setCategoryNotification({ 
                show: true, 
                message: `Auto-switched to ${categoryName}` 
            });
            setTimeout(() => setCategoryNotification({ show: false, message: '' }), 3000);
        }
        router.push(`?category=${value}`);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (searchTerm.trim()) {
            params.set('q', searchTerm.trim());
        } else {
            params.delete('q');
        }
        params.delete('page');
        router.push(`/store/shop?${params.toString()}`);
    };

    const totalPages = Math.ceil(totalProductsCount / ITEMS_PER_PAGE);
    const isLoading = isLoadingProducts || isLoadingCategories;

    return (
        <div className="bg-background min-h-screen">
            {/* Category Auto-Switch Notification */}
            {categoryNotification.show && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                        <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold">{categoryNotification.message}</span>
                    </div>
                </div>
            )}

            <header className={cn(
                "sticky top-0 z-30 transition-all duration-300 ease-in-out overflow-hidden",
                "py-8 sm:py-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800",
                showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
            )}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Shop Our Collection</h1>
                    <p className="mt-2 sm:mt-4 max-w-2xl mx-auto text-xs sm:text-sm text-slate-500">
                        Discover products that are crafted with quality and designed for life.
                    </p>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-8 sm:mb-12">
                    <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground flex-shrink-0 z-10" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (!e.target.value.trim()) {
                                    setShowSuggestions(false);
                                }
                            }}
                            onFocus={() => searchTerm.trim() && setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            className="pl-10 h-10 rounded-lg text-sm w-full"
                        />
                        
                        {/* Search Suggestions Dropdown */}
                        {(showSuggestions || isLoadingSuggestions) && searchTerm.trim() && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                                {isLoadingSuggestions ? (
                                    <div className="p-4 text-center">
                                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-primary" />
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Searching products...</p>
                                    </div>
                                ) : searchSuggestions.length > 0 ? (
                                    <>
                                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {searchSuggestions.map(product => (
                                                <button
                                                    key={product.id}
                            onClick={() => {
                                                setSearchTerm(product.name);
                                                setShowSuggestions(false);
                                                // Auto-switch category if product is in a different category
                                                if (product.categoryId && product.categoryId !== categoryFromUrl) {
                                                    handleCategoryChange(product.categoryId, true);
                                                } else {
                                                    handleSearchSubmit({ preventDefault: () => {} } as any);
                                                }
                                            }}
                                                    className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3 group"
                                                >
                                                    {product.imageUrl && (
                                                        <img 
                                                            src={product.imageUrl} 
                                                            alt={product.name}
                                                            className="h-10 w-10 rounded object-cover flex-shrink-0"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                            {product.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                            {currencySymbol}{product.sellingPrice.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 text-center border-t border-slate-100 dark:border-slate-800">
                                            {searchSuggestions.length} product{searchSuggestions.length !== 1 ? 's' : ''} found
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-4 text-center">
                                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">No products match</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">"{searchTerm}"</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Try a different search term</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <Select value={categoryFromUrl} onValueChange={handleCategoryChange} disabled={isLoadingCategories}>
                            <SelectTrigger className="flex-1 sm:flex-none sm:w-[200px] h-10 rounded-lg text-sm">
                                <SelectValue placeholder="Filter category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories?.map(category => (
                                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => fetchProducts('initial')} disabled={isLoading} className="h-10 w-10 rounded-lg flex-shrink-0">
                            <RotateCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {isLoading && products.length === 0 ? (
                    <div className={cn("grid gap-4 sm:gap-6", gridClasses)}>
                        {Array.from({ length: 8 }).map((_, i) => (
                           <ProductCardSkeleton key={i} />
                        ))}
                    </div>
                ) : products.length > 0 ? (
                    <div className="space-y-8 sm:space-y-12">
                        <div className={cn("grid gap-4 sm:gap-6", gridClasses)}>
                            {products.map(product => (
                                <ProductCard 
                                  key={product.id} 
                                  product={product} 
                                  category={categories?.find(c => c.id === product.categoryId)}
                                  currencySymbol={currencySymbol} 
                                />
                            ))}
                        </div>
                        
                        {/* Pagination Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 sm:pt-12 border-t border-slate-200 dark:border-slate-800 gap-4 sm:gap-6">
                            <p className="text-xs font-black uppercase text-muted-foreground tracking-[0.2em] text-center sm:text-left">
                                Page {currentPage} of {totalPages || 1} • {totalProductsCount} Items
                            </p>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => fetchProducts('prev')} 
                                    disabled={currentPage === 1 || isLoading}
                                    className="rounded-lg h-10 px-3 text-sm"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Previous</span>
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => fetchProducts('next')} 
                                    disabled={isLastPage || isLoading}
                                    className="rounded-lg h-10 px-3 text-sm"
                                >
                                    <span className="hidden sm:inline">Next</span> <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 sm:py-20 px-4 border-2 border-dashed rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900">
                        <PackageSearch className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-slate-300 mb-4 sm:mb-6" />
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight">No Products Found</h3>
                        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                            {searchTerm || categoryFromUrl !== 'all' ? 'Try adjusting your search or filters.' : 'There are no products to display right now.'}
                        </p>
                        <Button variant="outline" className="mt-6 sm:mt-8 rounded-lg h-10 sm:h-12 px-6 text-sm font-bold" onClick={() => { setSearchTerm(''); handleCategoryChange('all'); }}>
                            Clear All Filters
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>}>
      <ShopPageContent />
    </Suspense>
  );
}
