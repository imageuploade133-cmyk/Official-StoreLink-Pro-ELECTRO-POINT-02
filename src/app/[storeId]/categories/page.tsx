'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
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
import type { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ArrowRight, ArrowLeft, Loader2, Sparkles, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import { useStoreUrl } from '@/hooks/use-store-url';

import { useSettings } from '@/contexts/settings-context';

const ITEMS_PER_PAGE = 12;

function CategoryCard({ category }: { category: Category }) {
    const { getStoreUrl } = useStoreUrl();
    const { settings } = useSettings();
    return (
        <Link 
            href={getStoreUrl(`/store/shop?category=${category.id}`)}
            className="group relative rounded-xl overflow-hidden border dark:border-slate-800 hover:shadow-xl transition-shadow duration-300 h-full block"
        >
            <div className="aspect-w-1 aspect-h-1 h-96 relative">
                <Image
                    alt={category.name}
                    className={cn(
                        "object-cover transition-transform duration-500",
                        settings?.enableHoverZoom !== false && "group-hover:scale-110"
                    )}
                    src={category.imageUrl || `https://placehold.co/400x500.png?text=${encodeURIComponent(category.name)}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    data-ai-hint={category.dataAiHint || "fashion style"}
                    unoptimized
                />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-xl font-bold mb-1">{category.name}</h3>
                {category.description && (
                  <div 
                    className="text-slate-200 text-sm mb-4 line-clamp-2 overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: category.description }}
                  />
                )}
                <div className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 text-xs font-medium transition-all group-hover:bg-white group-hover:text-black">
                    Shop Now <ArrowRight className="ml-2 h-4 w-4" />
                </div>
            </div>
        </Link>
    );
}

export default function AllCategoriesPage() {
    const firestore = useFirestore();
    const router = useRouter();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLastPage, setIsLastPage] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
    const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

    const fetchCategories = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
        if (!firestore) return;
        setIsLoading(true);

        try {
            let q = query(collection(firestore, 'categories'), orderBy('name', 'asc'));

            if (searchTerm.trim()) {
                const term = searchTerm.trim();
                q = query(q, where('name', '>=', term), where('name', '<=', term + '\uf8ff'));
            }

            if (direction === 'initial') {
                const countSnap = await getCountFromServer(q);
                setTotalCount(countSnap.data().count);
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

                const list = docs.map(d => ({ id: d.id, ...d.data() } as Category));
                setCategories(list);
                
                if (direction === 'next') setCurrentPage(p => p + 1);
                else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
                else setCurrentPage(1);
            } else {
                if (direction === 'initial') {
                    setCategories([]);
                    setIsLastPage(true);
                }
            }
        } catch (error) {
            console.error("Error fetching all categories:", error);
        } finally {
            setIsLoading(false);
        }
    }, [firestore, searchTerm]);

    useEffect(() => {
        fetchCategories('initial');
    }, [searchTerm, firestore, fetchCategories]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="bg-background min-h-screen">
            <header className="py-12 bg-muted dark:bg-slate-900/50 border-b dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
                    <Button 
                        variant="outline"
                        size="icon"
                        className="absolute top-1/2 -translate-y-1/2 left-0 sm:left-4 h-10 w-10 rounded-full"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Go back</span>
                    </Button>
                    <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">Shop by Category</h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-500">
                        Find exactly what you're looking for by browsing our curated collections.
                    </p>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-4">
                     <div className="relative w-full max-w-md">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search categories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 rounded-xl"
                          />
                     </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => fetchCategories('initial')} disabled={isLoading} className="rounded-xl h-11 px-4">
                            <RotateCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                            Sync
                        </Button>
                     </div>
                </div>

                {isLoading && categories.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array.from({ length: 6 }).map((_, i) => (
                           <Skeleton key={i} className="h-96 rounded-xl" />
                        ))}
                    </div>
                ) : categories.length > 0 ? (
                    <div className="space-y-12">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {categories.map(category => (
                                <CategoryCard key={category.id} category={category} />
                            ))}
                        </div>

                        {/* Pagination Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between pt-12 border-t border-dashed gap-6">
                            <p className="text-xs font-black uppercase text-muted-foreground tracking-[0.2em]">
                                Page {currentPage} of {totalPages || 1} <span className="mx-2 text-slate-200">|</span> {totalCount} Collections
                            </p>
                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="outline" 
                                    size="lg" 
                                    onClick={() => fetchCategories('prev')} 
                                    disabled={currentPage === 1 || isLoading}
                                    className="rounded-xl font-bold gap-2"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Previous
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="lg" 
                                    onClick={() => fetchCategories('next')} 
                                    disabled={isLastPage || isLoading}
                                    className="rounded-xl font-bold gap-2"
                                >
                                    Next <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-32 border-2 border-dashed rounded-[3rem] bg-muted/10">
                        <Sparkles className="mx-auto h-16 w-16 text-slate-300 mb-6" />
                        <h3 className="text-2xl font-black tracking-tight">No Collections Found</h3>
                        <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
                            {searchTerm ? `Your search for "${searchTerm}" did not match any categories.` : "It looks like there are no categories to display."}
                        </p>
                        <Button variant="outline" className="mt-8 rounded-xl font-bold" onClick={() => setSearchTerm('')}>
                            Clear Search
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}