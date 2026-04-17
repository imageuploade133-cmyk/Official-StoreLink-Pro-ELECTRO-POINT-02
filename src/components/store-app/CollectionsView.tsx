'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { 
  collection, 
  query, 
  where,
  limit, 
  getDocs, 
  startAfter, 
  orderBy,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData 
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LayoutGrid, 
  Search, 
  ChevronRight, 
  Loader2, 
  Shirt, 
  RotateCcw,
  Plus,
  X,
  ArrowLeft
} from 'lucide-react';
import type { Category } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

import { useStoreUrl } from '@/hooks/use-store-url';

const BATCH_SIZE = 12;

interface CollectionsViewProps {
    onSelectCategory: (id: string) => void;
}

export function CollectionsView({ onSelectCategory }: CollectionsViewProps) {
    const firestore = useFirestore();
    const { settings } = useSettings();
    const { storeId } = useStoreUrl();
    const [searchTerm, setSearchTerm] = useState('');
    
    // UI State
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Refs for stable pagination logic to prevent infinite update loops
    const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
    const hasMoreRef = useRef(true);

    const fetchCategories = useCallback(async (isNextPage = false) => {
        if (!firestore || (isNextPage && !hasMoreRef.current)) return;

        if (isNextPage) setIsLoadingMore(true);
        else {
            setIsLoading(true);
            lastDocRef.current = null;
            hasMoreRef.current = true;
        }

        try {
            let q = query(
                collection(firestore, 'categories'),
                where('store_id', '==', storeId),
                orderBy('name', 'asc'),
                limit(BATCH_SIZE)
            );

            if (isNextPage && lastDocRef.current) {
                q = query(q, startAfter(lastDocRef.current));
            }

            if (!isNextPage) {
                const countSnap = await getCountFromServer(query(collection(firestore, 'categories'), where('store_id', '==', storeId)));
                setTotalCount(countSnap.data().count);
            }

            const snapshot = await getDocs(q);
            const categoryList = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
            } as Category));

            setCategories(prev => isNextPage ? [...prev, ...categoryList] : categoryList);
            
            const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
            const newHasMore = snapshot.docs.length === BATCH_SIZE;
            
            lastDocRef.current = newLastDoc;
            hasMoreRef.current = newHasMore;
            setHasMore(newHasMore);
        } catch (error) {
            console.error("Registry sync failed:", error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [firestore, storeId]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const filteredCategories = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return categories;
        return categories.filter(c => c.name.toLowerCase().includes(term));
    }, [categories, searchTerm]);

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-black animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-black/80 backdrop-blur-md px-4 py-6 justify-between border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => window.history.back()}
                        className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                    >
                        <ArrowLeft className="h-5 w-5" strokeWidth={3} />
                    </button>
                    <h1 className="text-xl font-black leading-tight tracking-tighter uppercase">Collections</h1>
                </div>
                <Badge variant="secondary" className="font-black h-8 px-4 rounded-full shadow-sm">All</Badge>
            </header>

            <div className="px-6 pt-12 space-y-8">
                <div className="space-y-3 text-center">
                    <div className="inline-flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.3em] text-primary bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Master Registry
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Discovery</h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto leading-relaxed">
                        Discover meticulously curated essentials through our automated discovery engine.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" strokeWidth={2.5} />
                        <Input 
                            placeholder="Filter registry..." 
                            className="h-14 pl-12 pr-4 rounded-[1.5rem] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-xl text-lg font-bold tracking-tight focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                            >
                                <X className="h-4 w-4 text-slate-400" />
                            </button>
                        )}
                    </div>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => fetchCategories()} 
                        disabled={isLoading}
                        className="h-14 w-14 rounded-[1.5rem] bg-white dark:bg-slate-800 border-none shadow-xl active:scale-90 transition-all"
                    >
                        <RotateCcw className={cn("h-5 w-5", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 mt-10">
                <div className="px-6 pb-32 space-y-6">
                    {isLoading && categories.length === 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-48 w-full bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] animate-pulse" />
                            ))}
                        </div>
                    ) : filteredCategories.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredCategories.map((category) => (
                                <button 
                                    key={category.id}
                                    onClick={() => onSelectCategory(category.id)}
                                    className="relative group w-full aspect-[16/9] rounded-[2.5rem] overflow-hidden shadow-xl transition-all active:scale-[0.98] border-2 border-slate-200 dark:border-slate-700 hover:border-primary/30"
                                >
                                    <Image 
                                        src={category.imageUrl || `https://picsum.photos/seed/${category.id}/600/400`}
                                        alt={category.name}
                                        fill
                                        className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                    
                                    <div className="absolute inset-0 p-8 flex flex-col justify-end items-start text-white">
                                        <div className="space-y-1 transform transition-transform duration-500 group-hover:-translate-y-2">
                                            <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">{category.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Browse Collection</span>
                                                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}

                            {hasMore && !searchTerm && (
                                <div className="pt-6">
                                    <Button 
                                        onClick={() => fetchCategories(true)}
                                        disabled={isLoadingMore}
                                        variant="ghost"
                                        className="w-full h-20 rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/5 font-black uppercase text-[10px] tracking-[0.3em] gap-3 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all active:scale-[0.98]"
                                    >
                                        {isLoadingMore ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <><Plus className="h-5 w-5" /> Load more Collections</>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-24 text-center space-y-6 animate-in zoom-in-95 duration-700">
                            <div className="h-32 w-32 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto shadow-inner group">
                                <Shirt className="h-14 w-14 text-slate-300 group-hover:rotate-12 transition-transform duration-500" strokeWidth={1.5} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tight uppercase">Registry Empty</h3>
                                <p className="text-sm text-slate-500 font-medium max-w-[220px] mx-auto leading-relaxed">No collections match your filter or the registry is currently empty.</p>
                            </div>
                            <Button 
                                variant="outline" 
                                className="rounded-xl font-black uppercase text-[10px] tracking-widest px-8 h-12 shadow-sm" 
                                onClick={() => { setSearchTerm(''); fetchCategories(); }}
                            >
                                Synchronize Registry
                            </Button>
                        </div>
                    )}

                    {totalCount > 0 && (
                        <div className="text-center py-10 opacity-40">
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                                {categories.length} of {totalCount} Collections Loaded
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
