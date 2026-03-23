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

    const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
    const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

    // Fetch categories for the filter dropdown
    const categoriesQuery = useMemo(() => firestore ? query(collection(firestore, 'categories'), orderBy('name')) : null, [firestore]);
    const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

    const categoryMap = useMemo(() => {
        if (!categories) return new Map();
        return new Map(categories.map(c => [c.id, c.name]));
    }, [categories]);

    const fetchProducts = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
        if (!firestore) return;
        setIsLoadingProducts(true);

        try {
            let q = query(
                collection(firestore, 'products'), 
                where('isVisibleOnWeb', '==', true),
                orderBy('createdAt', 'desc')
            );

            if (categoryFromUrl !== 'all') {
                q = query(q, where('categoryId', '==', categoryFromUrl));
            }

            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                q = query(q, where('name', '>=', term), where('name', '<=', term + '\uf8ff'));
            }

            if (direction === 'initial') {
                const countSnap = await getCountFromServer(q);
                setTotalProductsCount(countSnap.data().count);
            }

            if (direction === 'next' && lastDocRef.current) {
                q = query(q, startAfter(lastDocRef.current), limit(ITEMS_PER_PAGE));
            } else if (direction === 'prev' && firstDocRef.current) {
                q = query(q, endBefore(firstDocRef.current), limitToLast(ITEMS_PER_PAGE));
            } else {
                q = query(q, limit(ITEMS_PER_PAGE));
            }

            const snapshot = await getDocs(q);
            const docs = snapshot.docs;

            if (docs.length > 0) {
                firstDocRef.current = docs[0];
                lastDocRef.current = docs[docs.length - 1];
                setIsLastPage(docs.length < ITEMS_PER_PAGE);

                const list = docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    categoryName: categoryMap.get(d.data().categoryId || '') || 'Uncategorized'
                } as Product));

                setProducts(list);
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
    }, [firestore, categoryFromUrl, searchTerm, categoryMap]);

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

    const handleCategoryChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'all') {
            params.delete('category');
        } else {
            params.set('category', value);
        }
        // Reset page on filter change
        params.delete('page'); 
        router.push(`/store/shop?${params.toString()}`);
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
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Input
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-10 rounded-lg text-sm"
                        />
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
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                           <ProductCardSkeleton key={i} />
                        ))}
                    </div>
                ) : products.length > 0 ? (
                    <div className="space-y-8 sm:space-y-12">
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
