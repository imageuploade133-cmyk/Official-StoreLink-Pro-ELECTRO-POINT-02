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
import { useGlobalLoading } from '@/contexts/global-loading-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, RotateCcw, PackageSearch, Loader2, SlidersHorizontal, ArrowUpDown, LayoutGrid } from 'lucide-react';
import { ProductCardSkeleton } from '@/components/store/ProductCardSkeleton';
import { cn, getCollectionBackgroundStyle } from '@/lib/utils';
import { useStoreUrl } from '@/hooks/use-store-url';
import { getLowestVariantPrice } from '@/lib/pos-utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 12;

function ShopPageContent() {
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const storeId = params?.storeId as string;
    const { getStoreUrl } = useStoreUrl();
    const { setPageDataLoaded } = useGlobalLoading();
    
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
                    const aPrice = (a.hasVariants && a.variants && a.variants.length > 0) ? getLowestVariantPrice(a.variants) : (a.sellingPrice || 0);
                    const bPrice = (b.hasVariants && b.variants && b.variants.length > 0) ? getLowestVariantPrice(b.variants) : (b.sellingPrice || 0);
                    return aPrice - bPrice;
                }
                if (sortFromUrl === 'price-high') {
                    const aPrice = (a.hasVariants && a.variants && a.variants.length > 0) ? getLowestVariantPrice(a.variants) : (a.sellingPrice || 0);
                    const bPrice = (b.hasVariants && b.variants && b.variants.length > 0) ? getLowestVariantPrice(b.variants) : (b.sellingPrice || 0);
                    return bPrice - aPrice;
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

    useEffect(() => {
        if (!isLoading) {
            setPageDataLoaded(true);
        }
    }, [isLoading, setPageDataLoaded]);

    const currentCategory = useMemo(() => {
        if (categoryFromUrl === 'all' || !categories) return null;
        return categories.find(c => c.id === categoryFromUrl);
    }, [categoryFromUrl, categories]);

    const isAppliedGlobally = settings?.ourCollectionBackgroundApplyTo?.includes('global');

    return (
        <div className={cn("min-h-screen", !isAppliedGlobally && "bg-white dark:bg-[#000000]")}>
            {/* Category Auto-Switch Notification */}
            {categoryNotification.show && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-black/5 dark:border-white/5 text-black dark:text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
                        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-bold tracking-tight">{categoryNotification.message}</span>
                    </div>
                </div>
            )}

            {/* Premium Hero Section */}
            <div className="relative h-[40vh] min-h-[300px] w-full overflow-hidden bg-[#f5f5f7] dark:bg-[#1d1d1f]">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white dark:via-black/50 dark:to-black z-10" />
                    <img
                        src={currentCategory?.imageUrl || settings?.shopBannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop"}
                        alt="Shop Hero"
                        className="w-full h-full object-cover animate-in fade-in duration-1000"
                    />
                </div>

                <div className={cn(
                    "relative z-20 h-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-between py-8 sm:py-12",
                    settings?.shopProductsAlignment === 'center' ? "items-center text-center" : "items-start"
                )}>
                    <Button 
                        onClick={() => router.back()}
                        variant="ghost" 
                        size="sm"
                        className="h-10 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.2em] bg-white/20 dark:bg-black/20 backdrop-blur-md hover:bg-white/40 dark:hover:bg-black/40 text-black dark:text-white border border-black/5 dark:border-white/10 transition-all shadow-lg group active:scale-95"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" /> 
                        Back
                    </Button>

                    <div className={cn(
                        "max-w-3xl animate-in slide-in-from-bottom-8 duration-1000 ease-out",
                        settings?.shopProductsAlignment === 'center' ? "flex flex-col items-center" : ""
                    )}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-[1px] w-8 bg-blue-500" />
                            <span className="text-blue-500 text-xs font-black uppercase tracking-[0.2em]">
                                {currentCategory ? "Collection" : "Our Shop"}
                            </span>
                            {settings?.shopProductsAlignment === 'center' && <div className="h-[1px] w-8 bg-blue-500" />}
                        </div>
                        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter text-black dark:text-white mb-6">
                            {currentCategory ? currentCategory.name : (settings?.shopCollectionTitle || 'Shop Our Collection')}
                        </h1>
                        {(currentCategory?.description || settings?.shopCollectionDescription) && (
                            <div
                                className="text-[#86868b] dark:text-[#a1a1a6] text-lg sm:text-xl font-medium leading-relaxed max-w-2xl line-clamp-3"
                                dangerouslySetInnerHTML={{ __html: currentCategory?.description || settings?.shopCollectionDescription || '' }}
                            />
                        )}
                    </div>
                </div>
            </div>

            <header className={cn(
                "sticky top-0 z-40 transition-all duration-500 ease-in-out",
                isAppliedGlobally ? "bg-transparent backdrop-blur-xl border-b border-black/5 dark:border-white/5" : "bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5",
                showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
            )}>
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-4 flex flex-col gap-6">
                        {/* Modern Search and Filters Row */}
                        <div className={cn(
                            "flex flex-col lg:flex-row gap-4 items-center justify-between",
                            settings?.shopProductsAlignment === 'center' && "lg:justify-center lg:gap-8"
                        )}>
                            <div className="flex items-center gap-4 w-full lg:w-auto">
                                <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-[400px]">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#86868b] flex-shrink-0 z-10" />
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
                                        className="pl-10 h-12 rounded-2xl text-sm w-full bg-white dark:bg-black border-[1.5px] border-black/10 dark:border-white/10 hover:border-blue-500/30 hover:shadow-lg focus-visible:border-blue-500/50 focus-visible:ring-4 focus-visible:ring-blue-500/10 transition-all duration-300"
                                    />

                                    {/* Suggestions Dropdown */}
                                    {(showSuggestions || isLoadingSuggestions) && searchTerm.trim() && (
                                        <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 dark:bg-black/95 border-[1.5px] border-black/10 dark:border-white/10 rounded-[2rem] shadow-2xl z-50 max-h-80 overflow-y-auto backdrop-blur-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                            {isLoadingSuggestions ? (
                                                <div className="p-8 text-center">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                                                    <p className="text-xs text-[#86868b] mt-3 font-medium">Searching...</p>
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
                                                            className="w-full p-3 text-left hover:bg-blue-500/5 dark:hover:bg-blue-500/10 rounded-2xl transition-all flex items-center gap-4 group border border-transparent hover:border-blue-500/10"
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
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </form>
                            </div>

                            <div className="flex items-center gap-3 w-full lg:w-auto">
                                <Select value={categoryFromUrl} onValueChange={(val) => handleCategoryChange(val)}>
                                    <SelectTrigger className="flex-1 lg:w-[200px] h-12 rounded-2xl bg-white dark:bg-black border-[1.5px] border-black/10 dark:border-white/10 hover:border-blue-500/30 hover:shadow-lg focus:ring-4 focus:ring-blue-500/10 transition-all duration-300">
                                        <LayoutGrid className="h-4 w-4 mr-2 text-[#86868b]" />
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-3xl border-[1.5px] border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-2xl bg-white/95 dark:bg-black/95">
                                        <SelectItem value="all" className="rounded-xl">All Products</SelectItem>
                                        {categories?.map(category => (
                                            <SelectItem key={category.id} value={category.id} className="rounded-xl">
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={sortFromUrl} onValueChange={handleSortChange}>
                                    <SelectTrigger className="flex-1 lg:w-[200px] h-12 rounded-2xl bg-white dark:bg-black border-[1.5px] border-black/10 dark:border-white/10 hover:border-blue-500/30 hover:shadow-lg focus:ring-4 focus:ring-blue-500/10 transition-all duration-300">
                                        <ArrowUpDown className="h-4 w-4 mr-2 text-[#86868b]" />
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-3xl border-[1.5px] border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-2xl bg-white/95 dark:bg-black/95">
                                        <SelectItem value="newest" className="rounded-xl">Newest First</SelectItem>
                                        <SelectItem value="price-low" className="rounded-xl">Price: Low to High</SelectItem>
                                        <SelectItem value="price-high" className="rounded-xl">Price: High to Low</SelectItem>
                                        <SelectItem value="name" className="rounded-xl">Name: A to Z</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="h-12 w-[1px] bg-black/5 dark:bg-white/5 mx-1 hidden sm:block" />

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => fetchProducts('initial')}
                                    disabled={isLoading}
                                    className="h-12 w-12 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0"
                                >
                                    <RotateCcw className={cn("h-4 w-4 text-[#86868b]", isLoading && "animate-spin")} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col gap-8">
                    {/* Active Filters & Info */}
                    <div className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                        settings?.shopProductsAlignment === 'center' && "sm:justify-center sm:gap-12"
                    )}>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-black dark:text-white uppercase tracking-[0.15em]">
                                {totalProductsCount} Products Found
                            </span>
                            {searchTerm && (
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-none rounded-full px-4 py-1 font-bold text-[10px] uppercase tracking-wider">
                                    Search: {searchTerm}
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-4 text-[#86868b] text-[11px] font-bold uppercase tracking-widest">
                            <span>Grid View</span>
                            <div className="flex gap-1">
                                <div className="h-3 w-3 rounded-sm bg-black dark:bg-white" />
                                <div className="h-3 w-3 rounded-sm bg-black/20 dark:bg-white/20" />
                            </div>
                        </div>
                    </div>

                    <div className="w-full">
                        {isLoading && products.length === 0 ? (
                            <div className={cn("grid gap-6 sm:gap-10", gridClasses)}>
                                {Array.from({ length: 8 }).map((_, i) => (
                                   <ProductCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : products.length > 0 ? (
                            <div className="space-y-20">
                                <div className={cn("grid gap-6 sm:gap-10", gridClasses)}>
                                    {products.map((product, idx) => (
                                        <div
                                            key={product.id}
                                            className="animate-in fade-in slide-in-from-bottom-12 duration-700 fill-mode-both"
                                            style={{ animationDelay: `${idx * 100}ms` }}
                                        >
                                            <ProductCard
                                                product={product}
                                                category={categories?.find(c => c.id === product.categoryId)}
                                                currencySymbol={currencySymbol}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Refined Pagination */}
                                <div className="flex flex-col sm:flex-row items-center justify-between py-12 border-t border-black/5 dark:border-white/5 gap-8">
                                    <div className="flex flex-col gap-1.5 text-center sm:text-left">
                                        <p className="text-xs font-black text-black dark:text-white uppercase tracking-[0.2em]">
                                            Showing {products.length} of {totalProductsCount}
                                        </p>
                                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                                            {Array.from({ length: totalPages }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "h-1 rounded-full transition-all duration-300",
                                                        currentPage === i + 1 ? "w-8 bg-blue-500" : "w-2 bg-black/10 dark:bg-white/10"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => fetchProducts('prev')}
                                            disabled={currentPage === 1 || isLoading}
                                            className="rounded-2xl h-14 px-8 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-2" /> Back
                                        </Button>
                                        <Button
                                            onClick={() => fetchProducts('next')}
                                            disabled={isLastPage || isLoading}
                                            className="rounded-2xl h-14 px-10 text-xs font-black uppercase tracking-widest bg-black text-white dark:bg-white dark:text-black hover:scale-105 active:scale-95 transition-all shadow-xl"
                                        >
                                            Next Page <ChevronRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-32 px-4 bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[50px] border border-black/5 dark:border-white/5">
                                <div className="h-24 w-24 bg-white dark:bg-black rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                                    <PackageSearch className="h-10 w-10 text-blue-500" />
                                </div>
                                <h3 className="text-3xl font-black tracking-tight text-black dark:text-white">Nothing matches your search</h3>
                                <p className="mt-4 text-[#86868b] font-medium max-w-sm mx-auto text-lg">
                                    Try adjusting your filters or search terms to find what you&apos;re looking for.
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-12 rounded-full h-14 px-10 text-xs font-black uppercase tracking-widest border-black/10 dark:border-white/10 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                                    onClick={() => { setSearchTerm(''); handleCategoryChange('all'); }}
                                >
                                    Reset All Filters
                                </Button>
                            </div>
                        )}
                    </div>
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
