'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  query, 
  where,
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
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import type { Category } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, isWhiteOrTransparent } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useStoreUrl } from '@/hooks/use-store-url';

const BATCH_SIZE = 15;

export function CategoryGallery() {
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { storeId, getStoreUrl } = useStoreUrl();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Refs for stable pagination cursors to avoid infinite update loops
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const hasMoreRef = useRef(true);

  const fetchCategories = useCallback(async (isNextPage = false) => {
    if (!firestore || !storeId || (isNextPage && !hasMoreRef.current)) return;

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
  }, [firestore, storeId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (isLoading && categories.length === 0) {
    return (
      <section className="py-12 bg-white dark:bg-black">
        <div className="max-w-site-container mx-auto px-6">
          <div className="flex gap-6 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-32 md:w-44 space-y-3">
                <Skeleton className="aspect-[4/5] w-full rounded-[2rem]" />
                <Skeleton className="h-4 w-3/4 mx-auto rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0 && !isLoading) return null;

  const sectionPreTitle = settings?.categorySectionPreTitle || 'Collections';
  const showPreTitle = settings?.showCategorySectionPreTitle !== false;
  const sectionTitle = settings?.categorySectionTitle || 'Browse Categories';
  const sectionDescription = settings?.categorySectionDescription || 'Explore our meticulously curated selections.';
  const sectionBgColor = settings?.categorySectionBackgroundColor || '#FFFFFF';
  const sectionTextColor = settings?.categorySectionTextColor || '#000000';

  return (
    <section 
        className={cn(
            "py-16 md:py-24 overflow-hidden group/gallery transition-colors duration-500",
            isWhiteOrTransparent(sectionBgColor) ? "bg-white dark:bg-black" : ""
        )} 
        style={!isWhiteOrTransparent(sectionBgColor) ? { backgroundColor: sectionBgColor } : {}}
    >
      <div className="max-w-site-container mx-auto px-6 mb-10 md:mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
            {showPreTitle && sectionPreTitle && (
                <div 
                    className={cn(
                        "inline-flex items-center gap-2 font-medium text-xs md:text-sm tracking-tight animate-in fade-in slide-in-from-left-4 duration-700 opacity-50",
                        (!sectionTextColor || sectionTextColor === '#000000') ? "text-black dark:text-white" : ""
                    )}
                    style={(!sectionTextColor || sectionTextColor === '#000000') ? {} : { color: sectionTextColor }}
                >
                    {sectionPreTitle}
                </div>
            )}
            <h2 
                className={cn(
                    "text-4xl md:text-6xl font-semibold tracking-tight animate-in fade-in slide-in-from-left-6 duration-1000",
                    (!sectionTextColor || sectionTextColor === '#000000') ? "text-black dark:text-white" : ""
                )}
                style={(!sectionTextColor || sectionTextColor === '#000000') ? {} : { color: sectionTextColor }}
            >
                {sectionTitle}
            </h2>
            <p 
                className={cn(
                    "font-normal text-base md:text-xl max-w-2xl animate-in fade-in slide-in-from-left-8 duration-1000 delay-100 opacity-40",
                    (!sectionTextColor || sectionTextColor === '#000000') ? "text-black dark:text-white" : ""
                )}
                style={(!sectionTextColor || sectionTextColor === '#000000') ? {} : { color: sectionTextColor }}
            >
                {sectionDescription}
            </p>
        </div>
        <Button asChild variant="ghost" className={cn("font-medium text-sm md:text-base gap-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full px-6 animate-in fade-in zoom-in-95 duration-1000 delay-200", (!sectionTextColor || sectionTextColor === '#000000') ? "text-black dark:text-white" : "")} style={(!sectionTextColor || sectionTextColor === '#000000') ? {} : { color: sectionTextColor }}>
            <Link href={getStoreUrl('/store/categories')}>
                View All <ChevronRight className="h-4 w-4" strokeWidth={2} />
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
          <CarouselContent className="-ml-4 md:-ml-8">
            {categories.map((category) => (
              <CarouselItem key={category.id} className="pl-4 md:pl-8 basis-[45%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                <Link 
                  href={getStoreUrl(`/store/shop?category=${category.id}`)}
                  className="flex flex-col items-center group/item"
                >
                  <div className="relative aspect-[4/5] w-full rounded-[2.5rem] overflow-hidden bg-slate-50 dark:bg-slate-900 transition-all duration-700 group-hover/item:scale-[1.02]">
                    <Image
                      alt={category.name}
                      src={category.imageUrl || `https://picsum.photos/seed/${category.id}/400/500`}
                      fill
                      className={cn(
                        "object-cover transition-transform duration-1000 ease-in-out",
                        settings?.enableHoverZoom !== false && "group-hover/item:scale-110"
                      )}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      data-ai-hint="category tile"
                      unoptimized
                    />
                  </div>
                  <span 
                    className={cn(
                        "mt-6 text-sm md:text-base font-medium text-center line-clamp-1 transition-colors tracking-tight opacity-80 group-hover/item:opacity-100",
                        (!sectionTextColor || sectionTextColor === '#000000') ? "text-black dark:text-white" : ""
                    )}
                    style={(!sectionTextColor || sectionTextColor === '#000000') ? {} : { color: sectionTextColor }}
                  >
                    {category.name}
                  </span>
                </Link>
              </CarouselItem>
            ))}
            
            {hasMore && (
                <CarouselItem className="pl-4 md:pl-8 basis-[45%] sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                    <button 
                        onClick={() => fetchCategories(true)}
                        disabled={isLoadingMore}
                        className="flex flex-col items-center group/more w-full h-full"
                    >
                        <div className="relative aspect-[4/5] w-full rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-4 transition-all duration-700 group-hover/more:bg-slate-100 dark:group-hover:bg-slate-800 group-hover/more:scale-[1.02]">
                            {isLoadingMore ? (
                                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                            ) : (
                                <div className="h-14 w-14 rounded-full bg-white dark:bg-black flex items-center justify-center">
                                    <Plus className="h-6 w-6 text-black dark:text-white transition-transform group-hover/more:rotate-90 duration-500" />
                                </div>
                            )}
                            <span className="text-sm font-medium text-slate-500 tracking-tight">
                                {isLoadingMore ? 'Syncing...' : 'Browse More'}
                            </span>
                        </div>
                    </button>
                </CarouselItem>
            )}
          </CarouselContent>
          
          <div className="hidden md:block">
            <CarouselPrevious className="absolute -left-6 top-[40%] h-12 w-12 rounded-full border-none bg-white/80 dark:bg-black/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-500 hover:bg-white dark:hover:bg-black disabled:hidden" />
            <CarouselNext className="absolute -right-6 top-[40%] h-12 w-12 rounded-full border-none bg-white/80 dark:bg-black/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-500 hover:bg-white dark:hover:bg-black disabled:hidden" />
          </div>
        </Carousel>
      </div>
    </section>
  );
}
