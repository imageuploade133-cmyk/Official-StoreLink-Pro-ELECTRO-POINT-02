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
            <header className="py-12 bg-muted dark:bg-slate-900/50 border-b dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Shop Our Collection</h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-500">
                        Discover products that are crafted with quality and designed for life.
                    </p>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
                    <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 rounded-xl"
                        />
                    </form>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Select value={categoryFromUrl} onValueChange={handleCategoryChange} disabled={isLoadingCategories}>
                            <SelectTrigger className="w-full md:w-[240px] h-11 rounded-xl">
                                <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories?.map(category => (
                                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => fetchProducts('initial')} disabled={isLoading} className="h-11 w-11 rounded-xl shrink-0">
                            <RotateCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {isLoading && products.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {Array.from({ length: 8 }).map((_, i) => (
                           <ProductCardSkeleton key={i} />
                        ))}
                    </div>
                ) : products.length > 0 ? (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
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
                        <div className="flex flex-col sm:flex-row items-center justify-between pt-12 border-t border-dashed gap-6">
                            <p className="text-xs font-black uppercase text-muted-foreground tracking-[0.2em]">
                                Page {currentPage} of {totalPages || 1} <span className="mx-2 text-slate-200">|</span> {totalProductsCount} Items
                            </p>
                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="outline" 
                                    size="lg" 
                                    onClick={() => fetchProducts('prev')} 
                                    disabled={currentPage === 1 || isLoading}
                                    className="rounded-xl font-bold gap-2"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Previous
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="lg" 
                                    onClick={() => fetchProducts('next')} 
                                    disabled={isLastPage || isLoading}
                                    className="rounded-xl font-bold gap-2"
                                >
                                    Next <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-[3rem] bg-muted/10">
                        <PackageSearch className="mx-auto h-16 w-16 text-slate-300 mb-6" />
                        <h3 className="text-2xl font-black tracking-tight">No Products Found</h3>
                        <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
                            {searchTerm || categoryFromUrl !== 'all' ? 'Try adjusting your search or filters.' : 'There are no products to display right now.'}
                        </p>
                        <Button variant="outline" className="mt-8 rounded-xl font-bold" onClick={() => { setSearchTerm(''); handleCategoryChange('all'); }}>
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
