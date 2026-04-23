'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { useParams } from 'next/navigation';

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
    const params = useParams();
    const storeId = params?.storeId as string;
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

    const categoriesQuery = useMemo(() => firestore && storeId ? query(collection(firestore, 'categories'), where('store_id', '==', storeId), orderBy('name')) : null, [firestore, storeId]);
    const { data: categories } = useCollection<Category>(categoriesQuery);

    const fetchResults = useCallback(async (isNextPage = false) => {
        if (!firestore || !storeId) return;

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
                where('store_id', '==', storeId),
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
    }, [firestore, storeId, searchQuery, selectedCategoryId, results.length]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchResults();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedCategoryId, fetchResults]);

    useEffect(() => {
        if (initialCategoryId) setSelectedCategoryId(initialCategoryId);
    }, [initialCategoryId]);

    return (
            <div className="flex flex-col h-full bg-background-light dark:bg-black animate-in fade-in duration-500">
            <header className="sticky top-0 z-50 flex items-center bg-background/80 dark:bg-black/80 backdrop-blur-xl px-4 py-4 justify-between border-b border-border/40">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onClose}
                        className="flex size-10 items-center justify-center rounded-full bg-secondary/50 dark:bg-slate-900/50 hover:bg-secondary transition-all active:scale-90"
                    >
                        <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <h1 className="text-lg font-bold tracking-tight">Search</h1>
                </div>
            </header>

            <div className="flex flex-col h-full overflow-hidden">
                {/* Search Header */}
                <div className="px-6 py-4 space-y-4 flex-shrink-0 bg-background dark:bg-black">
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10 transition-colors group-focus-within:text-primary">
                            <SearchIcon className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <Input 
                            autoFocus={!initialCategoryId}
                            placeholder="Search products by name or SKU..." 
                            className="h-12 pl-11 pr-10 rounded-2xl bg-secondary/50 dark:bg-slate-900/50 border-none shadow-none text-base font-medium placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-muted dark:bg-slate-800 rounded-full text-muted-foreground hover:text-foreground transition-all active:scale-90"
                            >
                                <X className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    {selectedCategoryId && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
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
                </div>

                {/* Scrollable Content */}
                <ScrollArea className="flex-1">
                    <div className="px-6 pt-6 space-y-6">
                        <div className="pb-32 space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                            {searchQuery || selectedCategoryId ? 'Top Match Results' : 'Trending Registry'}
                        </h3>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest border px-2 py-0.5 rounded-full">{totalFound} items matching</span>
                    </div>
                    
                    {isLoading && results.length === 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-24 w-full bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : results.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {results.map((p) => (
                                <div 
                                    key={p.id} 
                                    onClick={() => onSelectProduct(p.id)} 
                                    className="flex items-center gap-4 p-3 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 transition-all active:scale-[0.98] w-full text-left group cursor-pointer hover:shadow-md"
                                >
                                    <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                                        <Image 
                                            src={p.imageUrl || 'https://placehold.co/200x200.png'} 
                                            alt={p.name} 
                                            fill 
                                            className={cn(
                                                "object-cover transition-transform duration-700",
                                                settings?.enableHoverZoom !== false && "group-hover:scale-105"
                                            )}
                                            unoptimized 
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-bold uppercase text-primary tracking-wide mb-0.5 opacity-80">
                                            {categories?.find(c => c.id === p.categoryId)?.name || 'Premium Series'}
                                        </p>
                                        <p className="font-bold text-base text-slate-900 dark:text-slate-100 truncate leading-tight tracking-tight">{p.name}</p>
                                        <p className="text-primary font-bold text-sm mt-0.5">{formatCurrency(calculateEffectivePrice(p as any, new Date()), currencySymbol)}</p>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary" strokeWidth={2.5} />
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
                            <div className="h-24 w-24 bg-slate-100 dark:bg-slate-900/50 rounded-full flex items-center justify-center mx-auto group">
                                <SearchIcon className="h-10 w-10 text-slate-300 group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold tracking-tight">No Results Found</h3>
                                <p className="text-sm text-muted-foreground max-w-[220px] mx-auto leading-relaxed">We couldn't find any matches for your search. Try different keywords.</p>
                            </div>
                            <Button 
                                variant="outline" 
                                className="rounded-full font-bold px-8 h-12 border-slate-200 dark:border-slate-800" 
                                onClick={() => { setSearchTerm(''); setSelectedCategoryId(null); if (onClearCategory) onClearCategory(); }}
                            >
                                Reset Search
                            </Button>
                        </div>
                    )}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
