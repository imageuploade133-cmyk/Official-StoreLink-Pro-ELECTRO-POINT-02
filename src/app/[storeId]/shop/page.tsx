'use client';

import React, { useState, useMemo, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import type { Product, Category } from '@/lib/types';
import { ProductCard } from '@/components/store/ProductCard';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, RotateCcw, PackageSearch, Loader2, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { ProductCardSkeleton } from '@/components/store/ProductCardSkeleton';
import { BannerAd } from '@/components/ads/BannerAd';
import { cn } from '@/lib/utils';
import { useStoreUrl } from '@/hooks/use-store-url';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 12;

function ShopPageContent() {
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const storeId = params?.storeId as string;
    const { getStoreUrl } = useStoreUrl();
    
    // URL-driven state
    const categoryFromUrl = searchParams.get('category') || 'all';
    const qFromUrl = searchParams.get('q') || '';
    const sortFromUrl = searchParams.get('sort') || 'newest';

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

    // Fetch categories for the filter dropdown
    const categoriesQuery = useMemo(() => firestore && storeId ? query(collection(firestore, 'categories'), where('store_id', '==', storeId), orderBy('name')) : null, [firestore, storeId]);
    const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

    const categoryMap = useMemo(() => {
        if (!categories) return new Map();
        return new Map(categories.map(c => [c.id, c.name]));
    }, [categories]);

    // Fetch search suggestions
    const fetchSuggestions = useCallback(async (term: string) => {
        if (!firestore || !storeId || !term.trim() || term.length < 1) {
            setSearchSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsLoadingSuggestions(true);
        try {
            const searchTerm = term.toLowerCase().trim();
            
            const q = query(
                collection(firestore, 'products'),
                where('store_id', '==', storeId),
                where('isVisibleOnWeb', '==', true),
                limit(500)
            );

            const snapshot = await getDocs(q);
            const allProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
            
            const filtered = allProducts.filter(p =>
                (p.name && p.name.toLowerCase().includes(searchTerm)) ||
                (p.sku && p.sku.toLowerCase().includes(searchTerm)) ||
                (p.description && p.description.toLowerCase().includes(searchTerm))
            ).slice(0, 8);

            setSearchSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            setSearchSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [firestore, storeId]);

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
        if (!firestore || !storeId) return;
        setIsLoadingProducts(true);

        try {
            let q = query(
                collection(firestore, 'products'), 
                where('store_id', '==', storeId),
                where('isVisibleOnWeb', '==', true)
            );

            if (categoryFromUrl !== 'all') {
                q = query(
                    collection(firestore, 'products'),
                    where('store_id', '==', storeId),
                    where('isVisibleOnWeb', '==', true),
                    where('categoryId', '==', categoryFromUrl)
                );
            }

            const snapshot = await getDocs(query(q, limit(1000)));
            let allProducts = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as Product));

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                allProducts = allProducts.filter(p =>
                    p.name.toLowerCase().includes(term) ||
                    p.sku?.toLowerCase().includes(term) ||
                    p.description?.toLowerCase().includes(term)
                );
            }

            // Apply Sorting
            allProducts.sort((a, b) => {
                if (sortFromUrl === 'price-low') {
                    return (a.sellingPrice || 0) - (b.sellingPrice || 0);
                }
                if (sortFromUrl === 'price-high') {
                    return (b.sellingPrice || 0) - (a.sellingPrice || 0);
                }
                if (sortFromUrl === 'name') {
                    return a.name.localeCompare(b.name);
                }
                
                // Default: Newest
                const aDate = a.createdAt instanceof Date ? a.createdAt.getTime() : 
                             (a.createdAt as any)?.toDate?.()?.getTime() || 
                             (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0);
                const bDate = b.createdAt instanceof Date ? b.createdAt.getTime() : 
                             (b.createdAt as any)?.toDate?.()?.getTime() ||
                             (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0);
                return bDate - aDate;
            });

            setTotalProductsCount(allProducts.length);

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
                setProducts([]);
                setIsLastPage(true);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setIsLoadingProducts(false);
        }
    }, [firestore, storeId, categoryFromUrl, searchTerm, categoryMap, currentPage, sortFromUrl]);

    useEffect(() => {
        fetchProducts('initial');
    }, [fetchProducts]);

    // Handle header visibility on scroll
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY < lastScrollY || currentScrollY < 100) {
                setShowHeader(true);
            } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
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
        
        const params = new URLSearchParams(searchParams.toString());
        params.set('category', value);
        params.delete('page');
        router.push(`?${params.toString()}`);
    };

    const handleSortChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', value);
        params.delete('page');
        router.push(`?${params.toString()}`);
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
        router.push(getStoreUrl(`/store/shop?${params.toString()}`));
    };

    const totalPages = Math.ceil(totalProductsCount / ITEMS_PER_PAGE);
    const isLoading = isLoadingProducts || isLoadingCategories;

    const currentCategory = useMemo(() => {
        if (categoryFromUrl === 'all' || !categories) return null;
        return categories.find(c => c.id === categoryFromUrl);
    }, [categoryFromUrl, categories]);

    return (
        <div className="bg-[#f5f5f7] dark:bg-[#000000] min-h-screen">
            {/* Category Auto-Switch Notification */}
            {categoryNotification.show && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/5 text-black dark:text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-bold tracking-tight">{categoryNotification.message}</span>
                    </div>
                </div>
            )}

            <header className={cn(
                "sticky top-0 z-40 transition-all duration-500 ease-in-out",
                "bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5",
                showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
            )}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black dark:text-white">
                                {currentCategory ? currentCategory.name : (settings?.shopCollectionTitle || 'Shop Our Collection')}
                            </h1>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => fetchProducts('initial')} 
                                    disabled={isLoading} 
                                    className="h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    <RotateCcw className={cn("h-4 w-4 text-[#86868b]", isLoading && "animate-spin")} />
                                </Button>
                            </div>
                        </div>

                        {/* Modern Search and Filters */}
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868b] flex-shrink-0 z-10" />
                                <Input
                                    ref={searchInputRef}
                                    placeholder="Search products, styles, collections..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        if (!e.target.value.trim()) {
                                            setShowSuggestions(false);
                                        }
                                    }}
                                    onFocus={() => searchTerm.trim() && setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    className="pl-10 h-12 rounded-2xl text-sm w-full bg-black/[0.03] dark:bg-white/[0.03] border-none focus-visible:ring-1 focus-visible:ring-black/10 dark:focus-visible:ring-white/10 transition-all"
                                />
                                
                                {/* Suggestions Dropdown */}
                                {(showSuggestions || isLoadingSuggestions) && searchTerm.trim() && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1d1d1f] border border-black/5 dark:border-white/5 rounded-3xl shadow-2xl z-50 max-h-80 overflow-y-auto backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        {isLoadingSuggestions ? (
                                            <div className="p-8 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                                                <p className="text-xs text-[#86868b] mt-3 font-medium">Searching our collection...</p>
                                            </div>
                                        ) : searchSuggestions.length > 0 ? (
                                            <div className="p-2">
                                                {searchSuggestions.map(product => (
                                                    <button
                                                        key={product.id}
                                                        onClick={() => {
                                                            setSearchTerm(product.name);
                                                            setShowSuggestions(false);
                                                            if (product.categoryId && product.categoryId !== categoryFromUrl) {
                                                                handleCategoryChange(product.categoryId, true);
                                                            } else {
                                                                handleSearchSubmit({ preventDefault: () => {} } as any);
                                                            }
                                                        }}
                                                        className="w-full p-3 text-left hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all flex items-center gap-4 group"
                                                    >
                                                        <div className="h-12 w-12 rounded-xl bg-black/5 dark:bg-white/5 overflow-hidden flex-shrink-0">
                                                            {product.imageUrl && (
                                                                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-black dark:text-white truncate group-hover:text-blue-500 transition-colors">
                                                                {product.name}
                                                            </p>
                                                            <p className="text-xs text-[#86868b] font-medium">
                                                                {currencySymbol}{product.sellingPrice.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center">
                                                <p className="text-sm text-black dark:text-white font-bold">No results found</p>
                                                <p className="text-xs text-[#86868b] mt-1 font-medium">Try a different search term</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <Select value={sortFromUrl} onValueChange={handleSortChange}>
                                    <SelectTrigger className="flex-1 md:w-[180px] h-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none focus:ring-0">
                                        <ArrowUpDown className="h-4 w-4 mr-2 text-[#86868b]" />
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-3xl border-black/5 dark:border-white/5 shadow-2xl backdrop-blur-xl">
                                        <SelectItem value="newest" className="rounded-xl">Newest First</SelectItem>
                                        <SelectItem value="price-low" className="rounded-xl">Price: Low to High</SelectItem>
                                        <SelectItem value="price-high" className="rounded-xl">Price: High to Low</SelectItem>
                                        <SelectItem value="name" className="rounded-xl">Name: A to Z</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="hidden md:flex h-12 w-[1px] bg-black/5 dark:bg-white/5 mx-2" />
                                
                                <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none md:hidden">
                                    <SlidersHorizontal className="h-4 w-4 text-[#86868b]" />
                                </Button>
                            </div>
                        </div>

                        {/* Category Chips */}
                        <ScrollArea className="w-full whitespace-nowrap -mx-4 px-4 pb-2">
                            <div className="flex w-max space-x-2 py-1">
                                <button
                                    onClick={() => handleCategoryChange('all')}
                                    className={cn(
                                        "px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 border",
                                        categoryFromUrl === 'all' 
                                            ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-lg" 
                                            : "bg-white text-black border-black/5 dark:bg-[#1d1d1f] dark:text-white dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"
                                    )}
                                >
                                    All Products
                                </button>
                                {categories?.map(category => (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategoryChange(category.id)}
                                        className={cn(
                                            "px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 border",
                                            categoryFromUrl === category.id 
                                                ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-lg" 
                                                : "bg-white text-black border-black/5 dark:bg-[#1d1d1f] dark:text-white dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"
                                        )}
                                    >
                                        {category.name}
                                    </button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" className="hidden" />
                        </ScrollArea>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Banner/Category Info */}
                {!isLoading && (
                    <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {currentCategory?.description && (
                            <div className="max-w-3xl">
                                <p className="text-blue-500 text-xs font-bold uppercase tracking-widest mb-3">Collection</p>
                                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-black dark:text-white mb-4">
                                    {currentCategory.name}
                                </h2>
                                <div 
                                    className="text-[#86868b] text-base sm:text-lg font-medium leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: currentCategory.description }}
                                />
                            </div>
                        )}
                    </div>
                )}

                <div className={cn(
                    "flex flex-col gap-8",
                    settings?.shopProductsAlignment === 'center' ? "items-center" : "lg:flex-row"
                )}>
                    <div className={cn(
                        "flex-1 w-full",
                        settings?.shopProductsAlignment === 'center' && "max-w-5xl"
                    )}>
                        {isLoading && products.length === 0 ? (
                            <div className={cn("grid gap-6 sm:gap-8", gridClasses)}>
                                {Array.from({ length: 8 }).map((_, i) => (
                                   <ProductCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : products.length > 0 ? (
                            <div className="space-y-12 sm:space-y-16">
                                <div className={cn("grid gap-6 sm:gap-8", gridClasses)}>
                                    {products.map((product, idx) => (
                                        <div 
                                            key={product.id}
                                            className="animate-in fade-in slide-in-from-bottom-8 duration-500 fill-mode-both"
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                        >
                                            <ProductCard 
                                                product={product} 
                                                category={categories?.find(c => c.id === product.categoryId)}
                                                currencySymbol={currencySymbol} 
                                            />
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Pagination */}
                                <div className="flex flex-col sm:flex-row items-center justify-between pt-12 border-t border-black/5 dark:border-white/5 gap-8">
                                    <div className="flex flex-col gap-1 text-center sm:text-left">
                                        <p className="text-sm font-black text-black dark:text-white uppercase tracking-wider">
                                            Displaying {products.length} of {totalProductsCount} products
                                        </p>
                                        <p className="text-xs text-[#86868b] font-medium">
                                            Page {currentPage} of {totalPages || 1}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => fetchProducts('prev')}
                                            disabled={currentPage === 1 || isLoading}
                                            className="rounded-full h-12 px-8 text-sm font-bold bg-white dark:bg-[#1d1d1f] border border-black/5 dark:border-white/5 hover:scale-105 active:scale-95 transition-all shadow-sm"
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-2" /> Previous
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => fetchProducts('next')}
                                            disabled={isLastPage || isLoading}
                                            className="rounded-full h-12 px-8 text-sm font-bold bg-white dark:bg-[#1d1d1f] border border-black/5 dark:border-white/5 hover:scale-105 active:scale-95 transition-all shadow-sm"
                                        >
                                            Next <ChevronRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-24 px-4 bg-white dark:bg-[#1d1d1f] rounded-[40px] border border-black/5 dark:border-white/5 shadow-2xl shadow-black/5">
                                <div className="h-24 w-24 bg-black/[0.03] dark:bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-8">
                                    <PackageSearch className="h-10 w-10 text-[#86868b]" />
                                </div>
                                <h3 className="text-2xl font-black tracking-tight text-black dark:text-white">No Products Found</h3>
                                <p className="mt-3 text-[#86868b] font-medium max-w-sm mx-auto">
                                    {searchTerm || categoryFromUrl !== 'all' 
                                        ? "We couldn't find anything matching your current filters. Try broadening your search." 
                                        : "Our collection is currently empty. Check back soon for new arrivals!"}
                                </p>
                                <Button 
                                    variant="outline" 
                                    className="mt-10 rounded-full h-12 px-8 text-sm font-bold border-black/10 dark:border-white/10 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all" 
                                    onClick={() => { setSearchTerm(''); handleCategoryChange('all'); }}
                                >
                                    View All Products
                                </Button>
                            </div>
                        )}
                    </div>
                    
                    {/* Sidebar for Ads */}
                    {settings?.shopProductsAlignment !== 'center' && (
                        <aside className="hidden lg:block w-72 flex-shrink-0">
                            <div className="sticky top-40 space-y-8">
                                <BannerAd location="sidebar" />
                                {currentCategory && (
                                    <div className="p-8 rounded-[32px] bg-white dark:bg-[#1d1d1f] border border-black/5 dark:border-white/5 shadow-sm">
                                        <h4 className="text-sm font-black uppercase tracking-widest mb-4">About This Collection</h4>
                                        <p className="text-xs text-[#86868b] font-medium leading-relaxed">
                                            Discover our curated selection of {currentCategory.name}. Every item is chosen for quality and style.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </aside>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-black">
            <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                </div>
            </div>
        </div>
    }>
      <ShopPageContent />
    </Suspense>
  );
}
