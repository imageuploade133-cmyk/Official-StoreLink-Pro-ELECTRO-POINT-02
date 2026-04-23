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
            className="group relative rounded-[2.5rem] overflow-hidden transition-all duration-700 h-full block bg-slate-50 dark:bg-slate-900"
        >
            <div className="aspect-[3/4] relative overflow-hidden">
                <Image
                    alt={category.name}
                    className={cn(
                        "object-cover transition-transform duration-1000 ease-in-out",
                        settings?.enableHoverZoom !== false && "group-hover:scale-110"
                    )}
                    src={category.imageUrl || `https://placehold.co/600x800.png?text=${encodeURIComponent(category.name)}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    data-ai-hint={category.dataAiHint || "fashion style"}
                    unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <h3 className="text-2xl font-semibold tracking-tight mb-2">{category.name}</h3>
                {category.description && (
                  <div 
                    className="text-white/70 text-sm mb-6 line-clamp-2 overflow-hidden font-normal leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: category.description }}
                  />
                )}
                <div className="inline-flex items-center justify-center rounded-full px-6 py-2.5 bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-xl border border-white/30 text-sm font-medium transition-all duration-500">
                    Explore Collection <ArrowRight className="ml-2 h-4 w-4" />
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
            <header className="py-20 bg-white dark:bg-black">
                <div className="max-w-7xl mx-auto px-6 text-center relative">
                    <Button 
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 left-0 h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-900"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Go back</span>
                    </Button>
                    <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-slate-900 dark:text-white">Shop by Category</h1>
                    <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-slate-500 dark:text-slate-400 font-normal">
                        Find exactly what you&apos;re looking for by browsing our curated collections.
                    </p>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-16 gap-6">
                     <div className="relative w-full max-w-xl">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <Input
                            placeholder="Search categories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-14 rounded-2xl border-none bg-slate-50 dark:bg-slate-900 text-lg focus-visible:ring-1 focus-visible:ring-slate-200 dark:focus-visible:ring-slate-800 transition-all"
                          />
                     </div>
                     <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => fetchCategories('initial')} disabled={isLoading} className="rounded-full h-14 px-8 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-base font-medium">
                            <RotateCcw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                            Sync
                        </Button>
                     </div>
                </div>

                {isLoading && categories.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                        {Array.from({ length: 6 }).map((_, i) => (
                           <Skeleton key={i} className="aspect-[3/4] rounded-[2.5rem]" />
                        ))}
                    </div>
                ) : categories.length > 0 ? (
                    <div className="space-y-20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                            {categories.map(category => (
                                <CategoryCard key={category.id} category={category} />
                            ))}
                        </div>

                        {/* Pagination Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between pt-16 border-t border-slate-100 dark:border-slate-900 gap-8">
                            <p className="text-sm font-medium text-slate-400 tracking-tight">
                                Showing Page {currentPage} of {totalPages || 1} <span className="mx-3 text-slate-200 dark:text-slate-800">|</span> {totalCount} Collections
                            </p>
                            <div className="flex items-center gap-4">
                                <Button 
                                    variant="ghost" 
                                    size="lg" 
                                    onClick={() => fetchCategories('prev')} 
                                    disabled={currentPage === 1 || isLoading}
                                    className="rounded-full bg-slate-50 dark:bg-slate-900 px-8 h-12 font-medium gap-2"
                                >
                                    <ChevronLeft className="h-4 w-4" /> Previous
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="lg" 
                                    onClick={() => fetchCategories('next')} 
                                    disabled={isLastPage || isLoading}
                                    className="rounded-full bg-slate-50 dark:bg-slate-900 px-8 h-12 font-medium gap-2"
                                >
                                    Next <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-40 rounded-[3rem] bg-slate-50 dark:bg-slate-900/50">
                        <Sparkles className="mx-auto h-20 w-20 text-slate-200 dark:text-slate-800 mb-8" />
                        <h3 className="text-3xl font-semibold tracking-tight">No Collections Found</h3>
                        <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-lg">
                            {searchTerm ? `Your search for "${searchTerm}" did not match any categories.` : "It looks like there are no categories to display."}
                        </p>
                        <Button variant="outline" className="mt-10 rounded-full px-8 h-12 font-medium" onClick={() => setSearchTerm('')}>
                            Clear Search
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
