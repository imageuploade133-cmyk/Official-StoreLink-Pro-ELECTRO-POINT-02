
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  startAfter, 
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData 
} from 'firebase/firestore';
import type { Product, Category } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    Search as SearchIcon, 
    ChevronRight, 
    X, 
    Filter, 
    Sparkles, 
    TrendingUp, 
    Loader2, 
    Plus,
    RotateCcw,
    ArrowLeft
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const BATCH_SIZE = 12;

interface SearchViewProps {
    onClose: () => void;
    onSelectProduct: (id: string) => void;
    initialCategoryId?: string | null;
    onClearCategory?: () => void;
}

export function SearchView({ onClose, onSelectProduct, initialCategoryId, onClearCategory }: SearchViewProps) {
    const firestore = useFirestore();
    const { settings } = useSettings();
    const [searchQuery, setSearchTerm] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCategoryId || null);
    const currencySymbol = settings?.currency || '$';

    const [results, setResults] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [totalFound, setTotalFound] = useState(0);

    // Refs for stable pagination cursors
    const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
    const hasMoreRef = useRef(true);

    const categoriesQuery = useMemo(() => firestore ? query(collection(firestore, 'categories'), orderBy('name')) : null, [firestore]);
    const { data: categories } = useCollection<Category>(categoriesQuery);

    const fetchResults = useCallback(async (isNextPage = false) => {
        if (!firestore) return;

        if (isNextPage) setIsLoadingMore(true);
        else {
            setIsLoading(true);
            lastDocRef.current = null;
            hasMoreRef.current = true;
        }

        try {
            // ROBUST CLIENT-SIDE FILTERING SIMULATION
            // Since Firestore doesn't support 'contains', we fetch a larger metadata set and filter locally
            let q = query(
                collection(firestore, 'products'),
                where('isVisibleOnWeb', '==', true),
                orderBy('createdAt', 'desc'),
                limit(500) // Increased limit for broader reach
            );

            if (selectedCategoryId) {
                q = query(q, where('categoryId', '==', selectedCategoryId));
            }

            const snapshot = await getDocs(q);
            const allProducts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));

            const term = searchQuery.toLowerCase().trim();
            let filtered = allProducts;

            if (term) {
                filtered = allProducts.filter(p => 
                    p.name.toLowerCase().includes(term) || 
                    p.sku?.toLowerCase().includes(term) ||
                    p.description?.toLowerCase().includes(term)
                );
            }

            setTotalFound(filtered.length);
            
            // Simple pagination simulation for local filter
            const startIndex = isNextPage ? results.length : 0;
            const pageResults = filtered.slice(startIndex, startIndex + BATCH_SIZE);

            setResults(prev => isNextPage ? [...prev, ...pageResults] : pageResults);
            setHasMore(startIndex + BATCH_SIZE < filtered.length);
            
        } catch (error) {
            console.error("Discovery Registry Sync Failed:", error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [firestore, searchQuery, selectedCategoryId, results.length]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchResults();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategoryId]); // Removed fetchResults from deps to avoid loop

    useEffect(() => {
        if (initialCategoryId) setSelectedCategoryId(initialCategoryId);
    }, [initialCategoryId]);

    return (
        <div className="flex flex-col h-full bg-background-light dark:bg-background-dark animate-in fade-in duration-500">
            <header className="sticky top-0 z-50 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-6 justify-between border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800 hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                    >
                        <ArrowLeft className="h-5 w-5" strokeWidth={3} />
                    </button>
                    <h1 className="text-xl font-black leading-tight tracking-tighter uppercase">Exploration</h1>
                </div>
            </header>

            <ScrollArea className="flex-1 overflow-hidden">
                <div className="px-6 pt-12 space-y-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.3em] text-primary">
                            <Sparkles className="h-3.5 w-3.5" />
                            Discovery Suite
                        </div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Search</h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Robust substring discovery across the entire catalog.</p>
                    </div>

                    <div className="relative group sticky top-0 z-40 pt-2 pb-4 bg-gradient-to-b from-background-light dark:from-background-dark to-transparent">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 z-10 transition-colors group-focus-within:text-primary">
                            <SearchIcon className="h-6 w-6" strokeWidth={3} />
                        </div>
                        <Input 
                            autoFocus={!initialCategoryId}
                            placeholder="Type name, iron, solar, etc..." 
                            className="h-16 pl-14 pr-12 rounded-[1.5rem] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-2xl text-lg font-bold tracking-tight focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                            >
                                <X className="h-4 w-4" strokeWidth={3} />
                            </button>
                        )}
                    </div>

                    {selectedCategoryId && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300 -mt-4">
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-2 rounded-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-sm">
                                <Filter className="h-3 w-3" />
                                {categories?.find(c => c.id === selectedCategoryId)?.name || 'Filtered Collection'}
                                <button 
                                    onClick={() => {
                                        setSelectedCategoryId(null);
                                        if (onClearCategory) onClearCategory();
                                    }}
                                    className="ml-2 p-0.5 hover:bg-primary/20 rounded-md transition-colors"
                                >
                                    <X className="h-3 w-3" strokeWidth={3} />
                                </button>
                            </Badge>
                        </div>
                    )}

                    <div className="pb-32 space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                            {searchQuery || selectedCategoryId ? 'Top Match Results' : 'Trending Registry'}
                        </h3>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest border px-2 py-0.5 rounded-full">{totalFound} items matching</span>
                    </div>
                    
                    {isLoading && results.length === 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-32 w-full bg-white dark:bg-slate-800 rounded-[2rem] animate-pulse" />
                            ))}
                        </div>
                    ) : results.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {results.map((p) => (
                                <div 
                                    key={p.id} 
                                    onClick={() => onSelectProduct(p.id)} 
                                    className="flex items-center gap-5 p-5 bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border-2 border-slate-200 dark:border-slate-700 transition-all active:scale-[0.98] w-full text-left group cursor-pointer"
                                >
                                    <div className="relative h-20 w-20 rounded-2xl overflow-hidden shrink-0 border bg-muted shadow-sm">
                                        <Image 
                                            src={p.imageUrl || 'https://placehold.co/200x200.png'} 
                                            alt={p.name} 
                                            fill 
                                            className="object-cover group-hover:scale-110 transition-transform duration-700" 
                                            unoptimized 
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <p className="text-[8px] font-black uppercase text-primary/60 tracking-widest">
                                            {categories?.find(c => c.id === p.categoryId)?.name || 'Premium Series'}
                                        </p>
                                        <p className="font-black text-lg text-slate-900 dark:text-white truncate leading-tight tracking-tight">{p.name}</p>
                                        <p className="text-primary font-black text-sm mt-1">{formatCurrency(calculateEffectivePrice(p as any, new Date()), currencySymbol)}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                                        <ChevronRight className="h-5 w-5" strokeWidth={3} />
                                    </div>
                                </div>
                            ))}

                            {hasMore && (
                                <div className="pt-6">
                                    <Button 
                                        onClick={() => fetchResults(true)}
                                        disabled={isLoadingMore}
                                        variant="ghost"
                                        className="w-full h-20 rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/5 font-black uppercase text-[10px] tracking-[0.3em] gap-3 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all active:scale-[0.98]"
                                    >
                                        {isLoadingMore ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <><Plus className="h-5 w-5" /> Load more Results</>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-24 text-center space-y-6 animate-in zoom-in-95 duration-700">
                            <div className="h-32 w-32 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto shadow-inner group">
                                <SearchIcon className="h-14 w-14 text-slate-300 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tight uppercase">No matches found</h3>
                                <p className="text-sm font-medium text-slate-500 max-w-[220px] mx-auto leading-relaxed">Search uses robust substring logic. Try "solar" instead of "portable solar".</p>
                            </div>
                            <Button 
                                variant="outline" 
                                className="rounded-xl font-black uppercase text-[10px] tracking-widest px-8 h-12 shadow-sm" 
                                onClick={() => { setSearchTerm(''); setSelectedCategoryId(null); if (onClearCategory) onClearCategory(); }}
                            >
                                Reset Registry Exploration
                            </Button>
                        </div>
                    )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
