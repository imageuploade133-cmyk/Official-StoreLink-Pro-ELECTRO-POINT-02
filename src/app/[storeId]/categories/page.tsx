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
import { Search, ArrowRight, ArrowLeft, Loader2, Sparkles, ChevronLeft, ChevronRight, RotateCcw, LayoutGrid } from 'lucide-react';
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
            className="group relative rounded-[2.5rem] overflow-hidden transition-all duration-700 h-full block bg-slate-50 dark:bg-slate-900 shadow-sm hover:shadow-2xl hover:-translate-y-1"
        >
            <div className="aspect-[4/5] relative overflow-hidden">
                <Image
                    alt={category.name}
                    className={cn(
                        "object-cover transition-transform duration-1000 ease-in-out",
                        settings?.enableHoverZoom !== false && "group-hover:scale-110"
                    )}
                    src={category.imageUrl || `https://placehold.co/600x800.png?text=${encodeURIComponent(category.name)}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-700" />
            </div>
            
            <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                <div className="space-y-3 transition-transform duration-500">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Explore Collection</span>
                    <h3 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight">{category.name}</h3>
                    {category.description && (
                      <div 
                        className="text-white/80 text-sm sm:text-base line-clamp-2 overflow-hidden font-medium leading-relaxed max-w-sm"
                        dangerouslySetInnerHTML={{ __html: category.description }}
                      />
                    )}
                    <div className="pt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest group-hover:translate-x-2 transition-transform duration-500">
                        View Products <ChevronRight className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default function AllCategoriesPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { settings } = useSettings();
    
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
        <div className="bg-white dark:bg-black min-h-screen">
            {/* Apple Style Hero Header */}
            <div className="relative pt-20 pb-20 md:pt-32 md:pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-slate-50/50 dark:bg-white/[0.02]" />
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex flex-col items-center text-center">
                        <Button 
                            onClick={() => router.back()}
                            variant="ghost" 
                            size="sm"
                            className="mb-12 btn-back"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" /> 
                            Back
                        </Button>

                        <div className="flex items-center gap-2 mb-6">
                            <div className="h-[1px] w-8 bg-blue-500" />
                            <span className="text-blue-500 text-xs font-black uppercase tracking-[0.2em]">Our Collections</span>
                            <div className="h-[1px] w-8 bg-blue-500" />
                        </div>

                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-black dark:text-white mb-8">
                            Shop by Category
                        </h1>
                        <p className="max-w-2xl text-[#86868b] dark:text-[#a1a1a6] text-lg md:text-xl font-medium leading-relaxed">
                            Discover products that are crafted with quality and designed for life. Browse our curated collections to find your perfect match.
                        </p>
                    </div>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                {/* Immersive Filter Bar */}
                <div className="sticky top-0 z-40 mb-16 py-6 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="relative w-full max-w-2xl group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#86868b] group-focus-within:text-blue-500 transition-colors" />
                            <Input
                                placeholder="Search our collections..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-14 h-14 rounded-2xl border-none bg-black/[0.03] dark:bg-white/[0.03] text-lg font-medium focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all"
                            />
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="h-14 px-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center gap-3">
                                <LayoutGrid className="h-4 w-4 text-[#86868b]" />
                                <span className="text-xs font-black uppercase tracking-widest text-[#86868b]">{totalCount} Collections</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => fetchCategories('initial')} 
                                disabled={isLoading} 
                                className="h-14 w-14 rounded-2xl hover:bg-black/[0.05] dark:hover:bg-white/[0.05] border-none"
                            >
                                <RotateCcw className={cn("h-5 w-5 text-[#86868b]", isLoading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>
                </div>

                {isLoading && categories.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                        {Array.from({ length: 6 }).map((_, i) => (
                           <Skeleton key={i} className="aspect-[4/5] rounded-[2.5rem]" />
                        ))}
                    </div>
                ) : categories.length > 0 ? (
                    <div className="space-y-24">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                            {categories.map((category, idx) => (
                                <div 
                                    key={category.id}
                                    className="animate-in fade-in slide-in-from-bottom-12 duration-1000 fill-mode-both"
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <CategoryCard category={category} />
                                </div>
                            ))}
                        </div>

                        {/* Pagination Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between py-16 border-t border-black/5 dark:border-white/5 gap-8">
                            <div className="flex flex-col gap-1.5 text-center sm:text-left">
                                <p className="text-xs font-black text-black dark:text-white uppercase tracking-[0.2em]">
                                    Showing page {currentPage} of {totalPages || 1}
                                </p>
                                <div className="flex items-center gap-2 justify-center sm:justify-start">
                                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
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
                                    onClick={() => fetchCategories('prev')} 
                                    disabled={currentPage === 1 || isLoading}
                                    className="rounded-2xl h-14 px-8 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-2" /> Back
                                </Button>
                                <Button 
                                    onClick={() => fetchCategories('next')} 
                                    disabled={isLastPage || isLoading}
                                    className="rounded-2xl h-14 px-10 text-xs font-black uppercase tracking-widest bg-black text-white dark:bg-white dark:text-black hover:scale-105 active:scale-95 transition-all shadow-xl"
                                >
                                    Next Page <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-40 rounded-[50px] bg-[#f5f5f7] dark:bg-[#1d1d1f] border border-black/5 dark:border-white/5">
                        <div className="h-24 w-24 bg-white dark:bg-black rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                            <Sparkles className="h-10 w-10 text-blue-500" />
                        </div>
                        <h3 className="text-3xl font-black tracking-tighter text-black dark:text-white">No collections found</h3>
                        <p className="mt-4 text-[#86868b] font-medium max-w-sm mx-auto text-lg leading-relaxed">
                            {searchTerm ? `Your search for "${searchTerm}" did not match any categories.` : "It looks like there are no categories to display."}
                        </p>
                        <Button 
                            variant="outline" 
                            className="mt-12 rounded-full h-14 px-10 text-xs font-black uppercase tracking-widest border-black/10 dark:border-white/10 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all" 
                            onClick={() => setSearchTerm('')}
                        >
                            Reset Search
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
