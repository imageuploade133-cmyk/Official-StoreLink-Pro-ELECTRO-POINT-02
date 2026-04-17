
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  limit, 
  getDocs, 
  startAfter, 
  endBefore, 
  limitToLast,
  documentId,
  orderBy,
  type QueryDocumentSnapshot,
  type DocumentData 
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { ProductCard } from '@/components/store/ProductCard';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  ArrowRight, 
  ArrowLeft,
  Loader2, 
  Zap, 
  ChevronRight, 
  Timer, 
  ChevronLeft, 
  RotateCcw,
  ShoppingCart,
  ShoppingBag,
  Plus,
  Check,
  CheckCircle2,
  Package,
  CreditCard,
  CircleArrowLeft,
  CircleArrowRight
} from 'lucide-react';

const iconMap: Record<string, any> = {
  ShoppingCart, ShoppingBag, Plus, Check, CheckCircle2, Zap, CreditCard, 
  ArrowRight, Package
};
import type { HomepageSection, Product, Category } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import { cn, convertToDateSafely } from '@/lib/utils';
import { useStoreUrl } from '@/hooks/use-store-url';

interface ProductSectionProps {
  section: HomepageSection;
  categories: Category[];
}

const BATCH_SIZE = 12;

function SectionCountdown({ endDate }: { endDate: Date }) {
    const [timeLeft, setTimeLeft] = useState<{ h: string; m: string; s: string } | null>(null);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            const diff = endDate.getTime() - now.getTime();
            if (diff <= 0) return setTimeLeft(null);

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff / (1000 * 60)) % 60);
            const s = Math.floor((diff / 1000) % 60);

            setTimeLeft({
                h: String(h).padStart(2, '0'),
                m: String(m).padStart(2, '0'),
                s: String(s).padStart(2, '0')
            });
        };

        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [endDate]);

    if (!timeLeft) return null;

    return (
        <div className="flex items-center gap-1.5 md:gap-3 text-white font-black">
            <span className="text-[10px] md:text-sm uppercase opacity-80 tracking-widest hidden sm:inline">Time Left:</span>
            <div className="flex items-center gap-1 md:gap-2 text-sm md:text-2xl tracking-tighter">
                <span className="bg-black/20 px-1.5 py-0.5 rounded-md">{timeLeft.h}h</span>
                <span className="opacity-50">:</span>
                <span className="bg-black/20 px-1.5 py-0.5 rounded-md">{timeLeft.m}m</span>
                <span className="opacity-50">:</span>
                <span className="bg-black/20 px-1.5 py-0.5 rounded-md text-white">{timeLeft.s}s</span>
            </div>
        </div>
    );
}

function FlashSaleMarquee() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 flex items-center whitespace-nowrap select-none">
            <div className="animate-marquee inline-block font-black text-6xl md:text-9xl text-white uppercase italic">
                FLASH SALE LIVE • FLASH SALE LIVE • FLASH SALE LIVE • FLASH SALE LIVE • FLASH SALE LIVE • FLASH SALE LIVE • 
            </div>
            <div className="animate-marquee inline-block font-black text-6xl md:text-9xl text-white uppercase italic">
                FLASH SALE LIVE • FLASH SALE LIVE • FLASH SALE LIVE • FLASH SALE LIVE • FLASH SALE LIVE • FLASH SALE LIVE • 
            </div>
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 60s linear infinite;
                }
            `}</style>
        </div>
    );
}

export function ProductSection({ section, categories }: ProductSectionProps) {
  const firestore = useFirestore();
  const { settings } = useSettings();
  const { storeId, getStoreUrl } = useStoreUrl();
  const currencySymbol = settings?.currency || '$';

  // Guard: Custom UI Sections are handled by a different component
  if (section.selectionType === 'custom-ui') return null;

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  
  const autoplay = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true, stopOnMouseEnter: true })
  );
  
  // Pagination State for Products
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  
  // Refs for stable logic to prevent infinite update depth errors
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const currentPageRef = useRef(1);
  const sectionRef = useRef<HTMLElement>(null);

  // Lazy Load Observer
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasEnteredView(true);
        observer.disconnect();
      }
    }, { threshold: 0.05 });

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [section.id]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c.name]));
  }, [categories]);

  const fetchProducts = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore || !hasEnteredView || !storeId) return;
    setIsLoading(true);

    const page = currentPageRef.current;

    try {
      let productsList: Product[] = [];
      let docs: QueryDocumentSnapshot<DocumentData>[] = [];

      if (section.selectionType === 'category' && section.categoryId) {
        let q = query(
          collection(firestore, 'products'),
          where('store_id', '==', storeId),
          where('categoryId', '==', section.categoryId),
          where('isVisibleOnWeb', '==', true),
          orderBy('createdAt', 'desc')
        );

        if (direction === 'next' && lastDocRef.current) {
          q = query(q, startAfter(lastDocRef.current), limit(BATCH_SIZE));
        } else if (direction === 'prev' && firstDocRef.current) {
          q = query(q, endBefore(firstDocRef.current), limitToLast(BATCH_SIZE));
        } else {
          q = query(q, limit(BATCH_SIZE));
        }

        const snapshot = await getDocs(q);
        docs = snapshot.docs;
        productsList = docs.map(d => ({
          id: d.id,
          ...d.data(),
          categoryName: categoryMap.get(d.data().categoryId || '') || 'General'
        } as Product));
        
        if (docs.length > 0) {
            firstDocRef.current = docs[0];
            lastDocRef.current = docs[docs.length - 1];
            setIsLastPage(docs.length < BATCH_SIZE);
        } else {
            setIsLastPage(true);
        }
      } 
      else if (section.selectionType === 'manual' && section.productIds && section.productIds.length > 0) {
        const startIndex = direction === 'next' ? page * BATCH_SIZE : direction === 'prev' ? (page - 2) * BATCH_SIZE : 0;
        const nextIds = section.productIds.slice(startIndex, startIndex + BATCH_SIZE);
        
        if (nextIds.length > 0) {
            const q = query(
                collection(firestore, 'products'),
                where('store_id', '==', storeId),
                where(documentId(), 'in', nextIds)
            );
            const snapshot = await getDocs(q);
            const fetched = snapshot.docs.reduce((acc, d) => {
                acc[d.id] = { id: d.id, ...d.data(), categoryName: categoryMap.get(d.data().categoryId || '') || 'General' } as Product;
                return acc;
            }, {} as Record<string, Product>);
            
            productsList = nextIds.map(id => fetched[id]).filter(Boolean);
            setIsLastPage(startIndex + nextIds.length >= section.productIds.length);
        } else {
            setIsLastPage(true);
        }
      }

      setProducts(productsList);
      
      if (direction === 'next') {
          currentPageRef.current += 1;
          setCurrentPage(currentPageRef.current);
      } else if (direction === 'prev') {
          currentPageRef.current = Math.max(1, currentPageRef.current - 1);
          setCurrentPage(currentPageRef.current);
      } else {
          currentPageRef.current = 1;
          setCurrentPage(1);
      }

    } catch (error) {
      console.error("Error fetching section products:", error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, section, hasEnteredView, categoryMap, storeId]);

  useEffect(() => {
    if (hasEnteredView) {
        fetchProducts('initial');
    }
  }, [hasEnteredView, fetchProducts]);

  const isPromoActive = useMemo(() => {
    if (!section.isFlashSale) return false;
    const now = new Date();
    const startDate = convertToDateSafely(section.flashSaleStartDate);
    const endDate = convertToDateSafely(section.flashSaleEndDate);
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    return true;
  }, [section.isFlashSale, section.flashSaleStartDate, section.flashSaleEndDate]);

  const displayProducts = useMemo(() => {
    if (!isPromoActive || !section.flashSaleDiscountValue) return products;
    return products.map(p => ({
        ...p,
        promo: {
            type: section.flashSaleDiscountType || 'percentage',
            value: section.flashSaleDiscountValue || 0,
            isActive: true,
            startDate: null as any,
            endDate: null as any
        }
    }));
  }, [products, isPromoActive, section.flashSaleDiscountType, section.flashSaleDiscountValue]);

  const alignment = section.alignment || 'center';
  const backgroundColor = section.backgroundColor;
  const endDate = convertToDateSafely(section.flashSaleEndDate);
  
  const hubColor = settings?.flashHubColor || '#e11d48';
  const hubIconColor = settings?.flashHubIconColor || '#fbbf24';
  const cornerRadius = settings?.flashHubCornerRadius ?? 24;

  const buttonStyle = useMemo(() => {
    if (settings?.useIndividualBtnSettings && settings?.storeExploreBtnStyle) {
      const style = settings.storeExploreBtnStyle;
      if (style === 'gradient') {
        return {
          background: `linear-gradient(to right, ${settings.storeExploreBtnGradientStart || '#3b82f6'}, ${settings.storeExploreBtnGradientEnd || '#1d4ed8'})`,
          color: 'white',
          border: 'none'
        };
      } else if (style === 'image' && settings.storeExploreBtnImageUrl) {
        return {
          backgroundImage: `url('${settings.storeExploreBtnImageUrl}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
          border: 'none',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        };
      } else if (style === 'outline') {
        return {
          backgroundColor: 'transparent',
          color: settings.storeExploreBtnColor || '#3b82f6',
          border: `2px solid ${settings.storeExploreBtnColor || '#3b82f6'}`
        };
      } else if (style === 'ghost') {
        return {
          backgroundColor: 'transparent',
          color: settings.storeExploreBtnColor || '#3b82f6',
          border: 'none'
        };
      }
      return {
        backgroundColor: settings.storeExploreBtnColor || '#3b82f6',
        color: 'white',
        border: 'none'
      };
    }

    const style = settings?.storeBtnStyle || 'standard';
    if (style === 'gradient') {
      return {
        background: `linear-gradient(to right, ${settings?.storeBtnGradientStart || '#3b82f6'}, ${settings?.storeBtnGradientEnd || '#1d4ed8'})`,
        color: 'white',
        border: 'none'
      };
    }
    return {
      backgroundColor: settings?.storeBtnColor || '#3b82f6',
      color: 'white',
      border: 'none'
    };
  }, [settings]);

  const buttonClasses = useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const size = useIndividual
        ? (settings?.storeExploreBtnSize || 'lg')
        : (settings?.storeBtnSize || 'lg');
    const shape = useIndividual
        ? (settings?.storeExploreBtnShape || 'full')
        : (settings?.storeBtnShape || 'full');
    const shadow = useIndividual
        ? (settings?.storeExploreBtnShadow || 'sm')
        : 'sm';

    const sizeClasses = {
        sm: 'h-10 px-8 text-[10px]',
        md: 'h-12 px-10 text-[10px]',
        lg: 'h-14 px-12 text-[10px] md:text-xs',
        xl: 'h-16 px-14 text-sm'
    };

    const shapeClasses: Record<string, string> = {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-2xl',
        full: 'rounded-full'
    };

    const shadowClasses: Record<string, string> = {
        none: 'shadow-none',
        sm: '',
        md: '',
        lg: '',
        xl: '',
        '2xl': '',
        inner: 'shadow-inner'
    };

    const sizeClass = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.lg;
    const shapeClass = shapeClasses[shape] || 'rounded-full';
    const shadowClass = shadowClasses[shadow as keyof typeof shadowClasses] || '';

    return `${sizeClass} ${shapeClass} ${shadowClass}`;
  }, [settings]);

  const exploreText = useMemo(() => {
    if (isPromoActive) return `Enter the ${section.title} Event`;
    if (settings?.useIndividualBtnSettings && settings?.storeExploreBtnText) {
      return settings.storeExploreBtnText;
    }
    return `Explore ${section.title}`;
  }, [isPromoActive, section.title, settings]);

  const IconComponent = useMemo(() => {
    if (settings?.useIndividualBtnSettings && settings?.storeExploreBtnIcon) {
        return iconMap[settings.storeExploreBtnIcon] || ArrowRight;
    }
    return ArrowRight;
  }, [settings]);

  const NavIcons = useMemo(() => {
    switch (section.slideIcon) {
      case 'arrow':
        return { prev: ArrowLeft, next: ArrowRight };
      case 'circle':
        return { prev: CircleArrowLeft, next: CircleArrowRight };
      case 'chevron':
      default:
        return { prev: ChevronLeft, next: ChevronRight };
    }
  }, [section.slideIcon]);

  const navButtonClasses = useMemo(() => {
    const base = "static translate-y-0 h-14 w-14 transition-all duration-300  hover:scale-110 active:scale-95 border-[3px]";
    let styleClasses = "";
    
    switch (section.slideStyle) {
      case 'rounded':
        styleClasses = "rounded-2xl";
        break;
      case 'square':
        styleClasses = "rounded-none";
        break;
      case 'outline':
        styleClasses = "rounded-full bg-transparent";
        break;
      case 'ghost':
        styleClasses = "rounded-full bg-transparent border-none shadow-none";
        break;
      case 'default':
      default:
        styleClasses = "rounded-full";
        break;
    }
    
    const colorClasses = isPromoActive 
      ? "bg-white/10 text-white border-white/60 hover:bg-white hover:text-black dark:text-white dark:hover:text-black" 
      : "bg-background border-primary/20 hover:bg-primary hover:text-white dark:text-black dark:hover:text-white";
      
    return cn(base, colorClasses, styleClasses);
  }, [section.slideStyle, isPromoActive]);

  const handleNextPage = () => fetchProducts('next');
  const handlePrevPage = () => fetchProducts('prev');

  return (
    <section ref={sectionRef} className="py-12 md:py-24 overflow-hidden relative dark:bg-black" style={backgroundColor ? { backgroundColor } : {}}>
      <div className={cn("max-w-site-container mx-auto px-4 sm:px-6 lg:px-8")}>
        <Carousel 
            plugins={section.autoScroll ? [autoplay.current] : []}
            opts={{ 
                align: 'start', 
                loop: section.autoScroll || displayProducts.length > 2,
                dragFree: true
            }} 
            className="w-full"
        >
            {isPromoActive ? (
                <div 
                    className="px-6 md:px-10 py-6 md:py-8 mb-12 flex flex-col md:flex-row items-center justify-between  group relative overflow-hidden gap-6"
                    style={{ 
                        backgroundColor: hubColor,
                        boxShadow: `0 25px 50px -12px ${hubColor}33`,
                        borderRadius: `${cornerRadius}px`
                    }}
                >
                    <FlashSaleMarquee />
                    
                    <div className="flex items-center gap-3 md:gap-5 relative z-10">
                        <div 
                            className="p-2.5 rounded-xl  rotate-3 group-hover:rotate-12 transition-transform duration-500"
                            style={{ backgroundColor: hubIconColor }}
                        >
                            <Zap 
                                className="h-6 w-6 md:h-8 md:w-8 fill-current" 
                                style={{ color: hubColor }}
                            />
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">
                            {section.title}
                        </h2>
                    </div>

                    <div className="flex items-center gap-8 relative z-10 w-full md:w-auto justify-between md:justify-end">
                        {endDate && <SectionCountdown endDate={endDate} />}

                        <div className="flex items-center">
                            <Link 
                                href={getStoreUrl('/store/flash-sales')}
                                className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest hover:translate-x-1 transition-transform bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/20"
                            >
                                See All <ChevronRight className="h-4 w-4" strokeWidth={3} />
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={cn(
                    "mb-10 md:mb-16 flex flex-col md:flex-row gap-6",
                    alignment === 'left' ? 'items-start text-left justify-between' : 'items-center text-center justify-center'
                )}>
                    <div className="space-y-3">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight uppercase">
                            {section.title}
                        </h2>
                        {section.description && (
                            <p className={cn(
                                "text-sm md:text-lg text-slate-500 dark:text-slate-300 max-w-2xl font-medium leading-relaxed opacity-90 dark:opacity-90",
                                alignment === 'center' && "mx-auto"
                            )}>
                                {section.description}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {section.layout === 'carousel' ? (
                <>
                    <CarouselContent className="-ml-4 md:-ml-8">
                    {isLoading && displayProducts.length === 0 ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <CarouselItem key={i} className="pl-4 md:pl-8 basis-[75%] md:basis-1/3 lg:basis-1/4 xl:basis-1/5 2xl:basis-1/6">
                                <ProductCardSkeleton />
                            </CarouselItem>
                        ))
                    ) : (
                        displayProducts.map(product => (
                            <CarouselItem key={product.id} className="pl-4 md:pl-8 basis-[75%] md:basis-1/3 lg:basis-1/4 xl:basis-1/5 2xl:basis-1/6">
                                <div className="h-full py-2">
                                    <ProductCard 
                                    product={product} 
                                    category={categories?.find(c => c.id === product.categoryId)}
                                    currencySymbol={currencySymbol} 
                                    />
                                </div>
                            </CarouselItem>
                        ))
                    )}
                    </CarouselContent>
                    
                    {!isLoading && displayProducts.length > 0 && (
                        <div className="flex justify-center items-center gap-6 mt-16">
                            <CarouselPrevious 
                                className={navButtonClasses} 
                                style={isPromoActive ? { color: 'inherit' } : {}}
                            >
                                <NavIcons.prev className="h-6 w-6" />
                            </CarouselPrevious>
                            <div className={cn("h-1 w-16 rounded-full", isPromoActive ? "bg-white/40" : "bg-primary/10")} />
                            <CarouselNext 
                                className={navButtonClasses}
                                style={isPromoActive ? { color: 'inherit' } : {}}
                            >
                                <NavIcons.next className="h-6 w-6" />
                            </CarouselNext>
                        </div>
                    )}
                </>
            ) : (
              <div className="space-y-16">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 md:gap-10">
                    {isLoading ? (
                        Array.from({ length: BATCH_SIZE }).map((_, i) => <ProductCardSkeleton key={i} />)
                    ) : (
                        displayProducts.map(product => (
                            <ProductCard 
                              key={product.id} 
                              product={product} 
                              category={categories?.find(c => c.id === product.categoryId)}
                              currencySymbol={currencySymbol} 
                            />
                        ))
                    )}
                </div>
                
                {!isLoading && (section.productIds?.length || 0) > BATCH_SIZE && (
                    <div className="flex flex-col sm:flex-row items-center justify-between pt-12 border-t border-dashed gap-6">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                            Registry Page {currentPage} <span className="mx-2 text-slate-200">|</span> Batch discovery active
                        </p>
                        <div className="flex items-center gap-6">
                            <Button 
                                variant="outline" 
                                size="lg" 
                                onClick={handlePrevPage} 
                                disabled={currentPage === 1 || isLoading}
                                className={cn(
                                    "static translate-y-0 h-14 w-14 rounded-full border-[3px] transition-all duration-300  hover:scale-110",
                                    isPromoActive 
                                        ? "bg-white/10 text-white border-white/60 hover:bg-white hover:text-black dark:text-white dark:hover:text-black" 
                                        : "bg-background border-primary/20 hover:bg-primary hover:text-white dark:text-black dark:hover:text-white"
                                )}
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <Button 
                                variant="outline" 
                                size="lg" 
                                onClick={handleNextPage} 
                                disabled={isLastPage || isLoading}
                                className={cn(
                                    "static translate-y-0 h-14 w-14 rounded-full border-[3px] transition-all duration-300  hover:scale-110",
                                    isPromoActive 
                                        ? "bg-white/10 text-white border-white/60 hover:bg-white hover:text-black dark:text-white dark:hover:text-black" 
                                        : "bg-background border-primary/20 hover:bg-primary hover:text-white dark:text-black dark:hover:text-white"
                                )}
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>
                )}
              </div>
            )}
        </Carousel>
        
        {section.selectionType === 'category' && section.categoryId && (
             <div className={cn("mt-12 md:mt-20", alignment === 'left' ? 'text-left' : 'text-center')}>
                <Button
                    asChild
                    className={cn(
                        "font-black uppercase tracking-[0.25em]  transition-all hover:-translate-y-1 active:translate-y-0 border-none",
                        buttonClasses
                    )}
                    style={isPromoActive ? {
                        backgroundColor: hubColor,
                        boxShadow: `0 20px 40px -5px ${hubColor}44`
                    } : buttonStyle}
                >
                    <Link href={getStoreUrl(`/store/shop?category=${section.categoryId}`)}>
                        {exploreText} <IconComponent className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={3} />
                    </Link>
                </Button>
            </div>
        )}
      </div>
    </section>
  );
}
