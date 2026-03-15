'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  query, 
  limit, 
  getDocs, 
  startAfter, 
  orderBy,
  type QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Loader2, LayoutGrid, ArrowRight, Plus } from 'lucide-react';
import type { Category } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const BATCH_SIZE = 15;

export function CategoryGallery() {
  const firestore = useFirestore();
  const { settings } = useSettings();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Refs for stable pagination cursors to avoid infinite update loops
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
        orderBy('name', 'asc'),
        limit(BATCH_SIZE)
      );

      if (isNextPage && lastDocRef.current) {
        q = query(q, startAfter(lastDocRef.current));
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
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [firestore]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (isLoading && categories.length === 0) {
    return (
      <section className="py-12 bg-white dark:bg-slate-950/50">
        <div className="max-w-site-container mx-auto px-6">
          <div className="flex gap-6 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-32 md:w-44 space-y-3">
                <Skeleton className="aspect-square w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4 mx-auto rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0 && !isLoading) return null;

  const sectionPreTitle = settings?.categorySectionPreTitle || 'Featured Collections';
  const showPreTitle = settings?.showCategorySectionPreTitle !== false;
  const sectionTitle = settings?.categorySectionTitle || 'Browse Categories';
  const sectionDescription = settings?.categorySectionDescription || 'Explore our meticulously curated selections designed to elevate your lifestyle.';
  const sectionBgColor = settings?.categorySectionBackgroundColor || '#FFFFFF';
  const sectionTextColor = settings?.categorySectionTextColor || '#000000';

  return (
    <section 
        className="py-20 md:py-28 border-y border-slate-100 dark:border-slate-900 overflow-hidden group/gallery transition-colors duration-500" 
        style={{ backgroundColor: sectionBgColor }}
    >
      <div className="max-w-site-container mx-auto px-6 mb-12 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
            {showPreTitle && sectionPreTitle && (
                <div 
                    className="inline-flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.3em] animate-in fade-in slide-in-from-left-4 duration-700"
                    style={{ color: sectionTextColor }}
                >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    {sectionPreTitle}
                </div>
            )}
            <h2 
                className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none animate-in fade-in slide-in-from-left-6 duration-1000"
                style={{ color: sectionTextColor }}
            >
                {sectionTitle}
            </h2>
            <p 
                className="font-medium text-sm md:text-lg max-w-xl animate-in fade-in slide-in-from-left-8 duration-1000 delay-100 opacity-70"
                style={{ color: sectionTextColor }}
            >
                {sectionDescription}
            </p>
        </div>
        <Button asChild variant="ghost" className="font-black text-[10px] uppercase tracking-[0.2em] gap-3 hover:bg-primary/5 p-0 h-auto group/btn self-start md:self-auto animate-in fade-in zoom-in-95 duration-1000 delay-200" style={{ color: sectionTextColor }}>
            <Link href="/store/categories">
                View All Collections <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" strokeWidth={3} />
            </Link>
        </Button>
      </div>

      <div className="max-w-site-container mx-auto px-6 relative group">
        <Carousel
          opts={{
            align: "start",
            loop: false,
            dragFree: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4 md:-ml-6">
            {categories.map((category) => (
              <CarouselItem key={category.id} className="pl-4 md:pl-6 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6 xl:basis-[12.5%]">
                <Link 
                  href={`/store/shop?category=${category.id}`}
                  className="flex flex-col items-center group/item"
                >
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-500 group-hover/item:shadow-2xl group-hover/item:border-primary/30 group-hover/item:-translate-y-2 group-hover/item:ring-4 group-hover/item:ring-primary/5">
                    <Image
                      alt={category.name}
                      src={category.imageUrl || `https://picsum.photos/seed/${category.id}/300/300`}
                      fill
                      className="object-cover transition-transform duration-1000 ease-in-out group-hover/item:scale-110"
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 15vw"
                      data-ai-hint="category tile"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/item:bg-primary/10 transition-colors duration-500" />
                  </div>
                  <span 
                    className="mt-4 text-[10px] md:text-xs font-black text-center line-clamp-1 group-hover/item:text-primary transition-colors uppercase tracking-[0.1em]"
                    style={{ color: sectionTextColor }}
                  >
                    {category.name}
                  </span>
                </Link>
              </CarouselItem>
            ))}
            
            {hasMore && (
                <CarouselItem className="pl-4 md:pl-6 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6 xl:basis-[12.5%]">
                    <button 
                        onClick={() => fetchCategories(true)}
                        disabled={isLoadingMore}
                        className="flex flex-col items-center group/more w-full h-full"
                    >
                        <div className="relative aspect-square w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-2 transition-all duration-500 group-hover/more:border-primary group-hover/more:bg-primary/5 group-hover/more:-translate-y-2 group-hover/more:shadow-xl">
                            {isLoadingMore ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            ) : (
                                <Plus className="h-8 w-8 text-slate-400 group-hover/more:text-primary transition-transform group-hover/more:rotate-90 duration-500" />
                            )}
                            <span className="text-[8px] font-black uppercase text-slate-400 group-hover/more:text-primary tracking-[0.2em]">
                                {isLoadingMore ? 'Syncing' : 'Load More'}
                            </span>
                        </div>
                        <span 
                            className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-60"
                            style={{ color: sectionTextColor }}
                        >
                            Discover All
                        </span>
                    </button>
                </CarouselItem>
            )}
          </CarouselContent>
          
          <div className="hidden md:block">
            <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full border-2 border-slate-200 bg-white/90 backdrop-blur-md shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 hover:scale-110 hover:bg-white active:scale-95 disabled:hidden" />
            <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full border-2 border-slate-200 bg-white/90 backdrop-blur-md shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 hover:scale-110 hover:bg-white active:scale-95 disabled:hidden" />
          </div>
        </Carousel>
      </div>
    </section>
  );
}