'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { Category, Product, SlideShow, HomepageSection } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';
import { useWishlist } from '@/contexts/wishlist-context';
import { useCart } from '@/contexts/cart-context';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { formatCurrency } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
    LayoutGrid, 
    Heart, 
    Shirt, 
    Zap, 
    TrendingUp, 
    ChevronRight, 
    ArrowLeft, 
    ArrowRight,
    ShoppingCart,
    ShoppingBag,
    Plus,
    Monitor
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

import { useStoreUrl } from '@/hooks/use-store-url';
import { CustomUISection } from '@/components/store/CustomUISection';
import { ProductSection } from '@/components/store/ProductSection';

interface HomeViewProps {
    onSelectProduct: (id: string) => void;
    onViewAllCollections: () => void;
}

export function HomeView({ onSelectProduct, onViewAllCollections }: HomeViewProps) {
    const firestore = useFirestore();
    const { settings } = useSettings();
    const { storeId } = useStoreUrl();
    const { wishlistProductIds, addToWishlist, removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();
    const { toast } = useToast();
    const currencySymbol = settings?.currency || '$';

    const heroButtonStyle = useMemo(() => {
        const useIndividual = settings?.useIndividualBtnSettings !== false;
        const style = useIndividual 
            ? (settings?.storeHeroBtnStyle || 'gradient')
            : (settings?.storeBtnStyle || 'standard');
        
        if (style === 'gradient') {
            return {
                background: `linear-gradient(135deg, ${settings?.storeHeroBtnGradientStart || '#8b5cf6'}, ${settings?.storeHeroBtnGradientEnd || '#7c3aed'})`,
                color: 'white',
                border: 'none'
            };
        } else if (style === 'image' && settings?.storeHeroBtnImageUrl) {
            return {
                backgroundImage: `url('${settings.storeHeroBtnImageUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: 'white',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                border: 'none'
            };
        } else if (style === 'outline') {
            return {
                backgroundColor: 'transparent',
                color: settings?.storeHeroBtnColor || '#8b5cf6',
                border: `2px solid ${settings?.storeHeroBtnColor || '#8b5cf6'}`
            };
        } else if (style === 'ghost') {
            return {
                backgroundColor: 'transparent',
                color: settings?.storeHeroBtnColor || '#8b5cf6',
                border: 'none'
            };
        } else if (style === 'apple') {
            const color = settings?.storeHeroBtnColor || '#007AFF';
            return {
                background: `linear-gradient(180deg, ${color} 0%, ${color}ee 100%)`,
                color: 'white',
                border: '0.5px solid rgba(0,0,0,0.15)',
                boxShadow: `0 8px 20px -4px ${color}60, inset 0 1px 1px rgba(255, 255, 255, 0.25)`,
                fontWeight: '600',
                letterSpacing: '-0.02em',
            };
        }
        
        return {
            backgroundColor: settings?.storeHeroBtnColor || '#8b5cf6',
            color: 'white',
            border: 'none'
        };
    }, [settings]);

    const heroButtonClasses = useMemo(() => {
        const useIndividual = settings?.useIndividualBtnSettings !== false;
        const size = useIndividual
            ? (settings?.storeHeroBtnSize || 'lg')
            : (settings?.storeBtnSize || 'lg');
        const shape = useIndividual
            ? (settings?.storeHeroBtnShape || 'lg')
            : (settings?.storeBtnShape || 'lg');
        const shadow = useIndividual
            ? (settings?.storeHeroBtnShadow || 'md')
            : 'md';

        const sizeClasses = {
            sm: 'h-8 px-4 text-[8px]',
            md: 'h-10 px-6 text-[10px]',
            lg: 'h-12 px-8 text-xs',
            xl: 'h-14 px-10 text-sm'
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
            sm: 'shadow-sm',
            md: 'shadow-md',
            lg: 'shadow-lg',
            xl: 'shadow-xl',
            '2xl': 'shadow-2xl',
            inner: 'shadow-inner'
        };

        const sizeClass = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.lg;
        let shapeClass = shapeClasses[shape] || 'rounded-2xl';
        let shadowClass = shadowClasses[shadow as keyof typeof shadowClasses] || 'shadow-md';

        const style = useIndividual 
            ? (settings?.storeHeroBtnStyle || 'gradient')
            : (settings?.storeBtnStyle || 'standard');

        if (style === 'apple') {
            shapeClass = 'rounded-xl';
            shadowClass = 'shadow-none';
        }

        return `${sizeClass} ${shapeClass} ${shadowClass}`;
    }, [settings]);

    const gridCartButtonStyle = useMemo(() => {
        const useIndividual = settings?.useIndividualBtnSettings !== false;
        const style = useIndividual 
            ? (settings?.storeGridCartStyle || 'standard')
            : (settings?.storeBtnStyle || 'standard');
        
        if (style === 'gradient') {
            return {
                background: `linear-gradient(135deg, ${settings?.storeGridCartGradientStart || '#10b981'}, ${settings?.storeGridCartGradientEnd || '#059669'})`,
                color: 'white',
                border: 'none'
            };
        } else if (style === 'image' && settings?.storeGridCartImageUrl) {
            return {
                backgroundImage: `url('${settings.storeGridCartImageUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: 'white',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                border: 'none'
            };
        } else if (style === 'outline') {
            return {
                backgroundColor: 'transparent',
                color: settings?.storeGridCartColor || '#10b981',
                border: `2px solid ${settings?.storeGridCartColor || '#10b981'}`
            };
        } else if (style === 'ghost') {
            return {
                backgroundColor: 'transparent',
                color: settings?.storeGridCartColor || '#10b981',
                border: 'none'
            };
        } else if (style === 'apple') {
            const color = settings?.storeGridCartColor || '#007AFF';
            return {
                background: `linear-gradient(180deg, ${color} 0%, ${color}ee 100%)`,
                color: 'white',
                border: '0.5px solid rgba(0,0,0,0.15)',
                boxShadow: `0 8px 20px -4px ${color}60, inset 0 1px 1px rgba(255, 255, 255, 0.25)`,
                fontWeight: '600',
                letterSpacing: '-0.02em',
            };
        }
        
        return {
            backgroundColor: settings?.storeGridCartColor || '#10b981',
            color: 'white',
            border: 'none'
        };
    }, [settings]);

    const gridCartButtonClasses = useMemo(() => {
        const useIndividual = settings?.useIndividualBtnSettings !== false;
        const size = useIndividual
            ? (settings?.storeGridCartSize || 'md')
            : (settings?.storeBtnSize || 'md');
        const shape = useIndividual
            ? (settings?.storeGridCartShape || 'md')
            : (settings?.storeBtnShape || 'md');
        const shadow = useIndividual
            ? (settings?.storeGridCartShadow || 'sm')
            : 'sm';
        
        const sizeClasses = {
            sm: 'h-8 w-8',
            md: 'h-10 w-10',
            lg: 'h-12 w-12',
            xl: 'h-14 w-14'
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
            sm: 'shadow-sm',
            md: 'shadow-md',
            lg: 'shadow-lg',
            xl: 'shadow-xl',
            '2xl': 'shadow-2xl',
            inner: 'shadow-inner'
        };
        
        const sizeClass = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md;
        let shapeClass = shapeClasses[shape] || 'rounded-2xl';
        let shadowClass = shadowClasses[shadow as keyof typeof shadowClasses] || 'shadow-sm';

        const style = useIndividual 
            ? (settings?.storeGridCartStyle || 'standard')
            : (settings?.storeBtnStyle || 'standard');

        if (style === 'apple') {
            shapeClass = 'rounded-xl';
            shadowClass = 'shadow-none';
        }

        return `${sizeClass} ${shapeClass} ${shadowClass}`;
    }, [settings]);

    const heroButtonText = settings?.storeHeroBtnText || 'Explore Collection';
    const gridCartIconName = settings?.storeGridCartIcon || 'ShoppingCart';
    
    const iconMapForGrid: Record<string, any> = {
        ShoppingCart, ShoppingBag, Plus, Zap, Heart, TrendingUp
    };
    const GridCartIcon = iconMapForGrid[gridCartIconName] || ShoppingCart;

    // 1. Fetch Dynamic Slide Show Data from Firestore
    const slidesQuery = useMemo(() => {
        if (!firestore || !storeId) return null;
        return query(
            collection(firestore, 'slideShows'),
            where('store_id', '==', storeId),
            where('published', '==', true),
            orderBy('order', 'asc'),
            limit(5)
        );
    }, [firestore, storeId]);
    const { data: slides, isLoading: isLoadingSlides } = useCollection<SlideShow>(slidesQuery);

    // 2. Fetch Categories for Registry Access
    const categoriesQuery = useMemo(() => {
        if (!firestore || !storeId) return null;
        return query(
            collection(firestore, 'categories'), 
            where('store_id', '==', storeId),
            orderBy('name'), 
            limit(10)
        );
    }, [firestore, storeId]);
    const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

    // 3. Fetch Trending Products for Discovery Feed
    const productsQuery = useMemo(() => {
        if (!firestore || !storeId) return null;
        return query(
            collection(firestore, 'products'), 
            where('store_id', '==', storeId),
            where('isVisibleOnWeb', '==', true), 
            orderBy('createdAt', 'desc'), 
            limit(20)
        );
    }, [firestore, storeId]);
    const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

    // 4. Fetch Dynamic Homepage Sections
    const sectionsQuery = useMemo(() => {
        if (!firestore || !storeId) return null;
        return query(
            collection(firestore, 'homepageSections'), 
            where('store_id', '==', storeId),
            where('published', '==', true),
            orderBy('order', 'asc')
        );
    }, [firestore, storeId]);
    const { data: sections } = useCollection<HomepageSection>(sectionsQuery);

    const coveredCategoryIds = useMemo(() => {
        return sections
            ?.filter(s => s.selectionType === 'category' && s.categoryId)
            .map(s => s.categoryId as string) || [];
    }, [sections]);

    const hasAllProductsSection = useMemo(() => {
        return sections?.some(s => s.selectionType === 'all');
    }, [sections]);

    const categoryMap = useMemo(() => {
        if (!categories) return new Map();
        return new Map(categories.map(c => [c.id, c.name]));
    }, [categories]);

    // Carousel Configuration Protocol
    const autoplayPlugin = useMemo(() => Autoplay({ delay: 5000, stopOnInteraction: false }), []);
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [autoplayPlugin]);
    
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        
        const onInit = () => {
            setScrollSnaps(emblaApi.scrollSnapList());
            onSelect();
        };

        onInit();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onInit);
    }, [emblaApi, onSelect]);

    const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
    const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20">
          
          {/* Full Bleed Dynamic Slide Show Hero */}
          {settings?.showGlobalSlideShow !== false && (
            <div className="w-full">
              <div className="overflow-hidden relative bg-slate-950" data-no-ad-click="true">
                <div className="overflow-hidden w-full" ref={emblaRef}>
                    <div className="flex embla__container">
                        {isLoadingSlides ? (
                            <div className="flex-[0_0_100%] min-w-0 aspect-[21/7]">
                                <Skeleton className="w-full h-full" />
                            </div>
                        ) : slides && slides.length > 0 ? (
                            slides.map((slide) => (
                                <div key={slide.id} className="relative flex-[0_0_100%] min-w-0 group aspect-[21/7]">
                                    {slide.mediaType === 'video' && slide.videoUrl ? (
                                        <div className="w-full h-full overflow-hidden">
                                            <video
                                                autoPlay muted loop playsInline
                                                poster={slide.videoPosterUrl || ''}
                                                className="w-full h-full object-cover block"
                                            >
                                                <source src={slide.videoUrl} type="video/mp4" />
                                            </video>
                                        </div>
                                    ) : (
                                        <img
                                            alt={slide.title || 'Slide'}
                                            className={cn(
                                                "w-full h-full object-cover block transition-transform duration-1000",
                                                settings?.enableHoverZoom !== false && "group-hover:scale-105"
                                            )}
                                            src={slide.imageUrl || 'https://placehold.co/800x500.png'}
                                        />
                                    )}
                                    
                                    <div className="absolute inset-0 flex items-end">
                                        {slide.showOverlay !== false && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                                        )}

                                        <div className="relative p-8 w-full space-y-3 z-10">
                                            {slide.pretitle && (
                                                <span className="inline-block px-4 py-1.5 text-[8px] font-black uppercase tracking-[0.3em] bg-primary text-white rounded-full shadow-2xl border border-white/20 animate-pulse">
                                                    {slide.pretitle}
                                                </span>
                                            )}
                                            {slide.title && (
                                                <h2 className="text-3xl font-black text-white leading-none tracking-tighter uppercase whitespace-pre-line">
                                                    {slide.title}
                                                </h2>
                                            )}
                                            {slide.description && (
                                                <p className="text-slate-200 text-sm font-medium opacity-90 max-w-[240px] leading-relaxed line-clamp-2">
                                                    {slide.description}
                                                </p>
                                            )}
                                            {slide.showActionButton && (
                                                <div className="pt-2">
                                                    <Button 
                                                        asChild 
                                                        style={heroButtonStyle}
                                                        className={cn(
                                                            "font-black uppercase tracking-widest transition-all active:scale-90 border-none",
                                                            heroButtonClasses
                                                        )}
                                                    >
                                                        <Link href="/store/shop">{heroButtonText}</Link>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="relative flex-[0_0_100%] min-w-0 aspect-[21/7] flex items-end">
                                <Image 
                                    alt="Default Banner" 
                                    className="absolute inset-0 w-full h-full object-cover" 
                                    src="https://images.pexels.com/photos/14146828/pexels-photo-14146828.jpeg" 
                                    fill
                                    unoptimized
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                                <div className="relative p-8 w-full space-y-3">
                                    <span className="inline-block px-4 py-1.5 text-[8px] font-black uppercase tracking-[0.3em] bg-primary text-white rounded-full shadow-2xl border border-white/20 animate-pulse">Registry Active</span>
                                    <h2 className="text-3xl font-black text-white leading-none tracking-tighter uppercase">Elite Discovery <br/>Waitlist</h2>
                                    <p className="text-slate-200 text-sm font-medium opacity-90 max-w-[240px] leading-relaxed">No slides configured. Add premium content via the admin dashboard.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Arrows */}
                {slides && slides.length > 1 && (
                    <div className="absolute bottom-6 right-6 z-20 flex items-center space-x-3">
                        <Button 
                            onClick={scrollPrev}
                            variant="outline"
                            size="icon"
                            className="w-10 h-10 rounded-full border-white/20 text-white bg-black/20 backdrop-blur-xl hover:bg-white hover:text-black transition-all active:scale-90"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                            onClick={scrollNext}
                            variant="outline"
                            size="icon"
                            className="w-10 h-10 rounded-full border-white/20 text-white bg-black/20 backdrop-blur-xl hover:bg-white hover:text-black transition-all active:scale-90"
                        >
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Progress Indicators & Text Counter */}
                {slides && slides.length > 1 && (
                    <div className="absolute bottom-6 left-6 z-20 flex items-end space-x-3">
                        {scrollSnaps.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => scrollTo(index)}
                                className="group relative h-6 w-1 flex items-end"
                                aria-label={`Go to slide ${index + 1}`}
                            >
                                <div 
                                    className={cn(`w-full rounded-full transition-all duration-700 ease-out ${
                                        index === selectedIndex ? 'h-full bg-primary shadow-[0_0_15px_rgba(59,130,246,0.8)]' : 'h-1.5 bg-white/20'
                                    }`)} 
                                />
                            </button>
                        ))}
                        <div className="pl-3 text-[10px] font-black tracking-widest text-white/40 uppercase">
                            <span className="text-white">{String(selectedIndex + 1).padStart(2, '0')}</span>
                            <span className="mx-1 opacity-20">/</span>
                            <span>{String(slides.length).padStart(2, '0')}</span>
                        </div>
                    </div>
                )}
            </div>
          </div>
          )}

          {/* Dynamic Homepage Sections */}
          {sections?.map(section => (
            <div key={section.id} className="px-0">
                {section.selectionType === 'custom-ui' ? (
                    <CustomUISection section={section} />
                ) : (
                    <ProductSection 
                        section={section}
                        categories={categories || []}
                    />
                )}
            </div>
          ))}

          {/* CATCH-ALL SECTION FOR PRODUCTS NOT IN ANY SPECIFIC CATEGORY SECTION */}
          {!hasAllProductsSection && (
            <div className="px-0">
                <ProductSection 
                    section={{
                        id: 'catch-all',
                        title: 'Our Collection',
                        description: 'Discover our latest additions and favorite picks',
                        selectionType: 'all',
                        layout: 'grid',
                        published: true,
                        order: 9999,
                        createdAt: null as any,
                        updatedAt: null as any,
                        alignment: 'center'
                    }}
                    categories={categories || []}
                    excludeCategoryIds={coveredCategoryIds}
                />
            </div>
          )}

          {/* Quick Registry Access (Horizontal Categories) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                    <h3 className="text-lg font-black tracking-tighter uppercase leading-none">Collections</h3>
                </div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Curated Registry</p>
              </div>
              <button 
                onClick={onViewAllCollections}
                className="flex items-center gap-2 text-[10px] font-black uppercase text-primary tracking-[0.2em] px-4 py-2 rounded-full border-2 border-primary/20 bg-primary/5 hover:bg-primary hover:text-white transition-all duration-300 shadow-sm active:scale-95 group"
              >
                View all <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" strokeWidth={3} />
              </button>
            </div>
            
            <div className="flex gap-5 px-6 overflow-x-auto hide-scrollbar pb-4">
              <button 
                onClick={onViewAllCollections}
                className="flex flex-col items-center gap-3 shrink-0 group active:scale-90 transition-transform"
              > 
                <div className="w-16 h-16 rounded-[1.5rem] bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 border-2 border-primary/20 ring-4 ring-primary/5">
                  <LayoutGrid className="h-7 w-7" strokeWidth={2.5} /> 
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">Explore All</span>
              </button>

              {isLoadingCategories ? (
                [...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-3 shrink-0">
                        <Skeleton className="w-16 h-16 rounded-[1.5rem]" />
                        <Skeleton className="h-2 w-10 rounded-full" />
                    </div>
                ))
              ) : categories?.map(category => (
                <button 
                    key={category.id} 
                    onClick={() => {
                        onViewAllCollections(); 
                    }}
                    className="flex flex-col items-center gap-3 shrink-0 group active:scale-90 transition-transform"
                >
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white dark:bg-slate-800 flex items-center justify-center border-2 border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all shadow-lg overflow-hidden relative">
                    {category.imageUrl ? (
                        <Image src={category.imageUrl} alt={category.name} fill className="object-cover opacity-90 group-hover:scale-110 transition-transform duration-500" unoptimized />
                    ) : (
                        <Shirt className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors" strokeWidth={2.5} />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-primary/5 transition-colors" />
                  </div>
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter truncate max-w-[64px] group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{category.name}</span>
                </button>
               ))}
            </div>
          </div>

          {/* Trending Registry Feed */}
          <div className="px-6 pb-32 space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <h3 className="text-xl font-black tracking-tighter uppercase leading-none">Trending Now</h3>
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Global Demand Insights</p>
                </div>
                <Badge variant="outline" className="h-6 border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest px-2.5">
                    Real-time
                </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-x-5 gap-y-10">
              {isLoadingProducts ? (
                [...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-4">
                        <Skeleton className="aspect-[3/4] w-full rounded-[2.5rem]" />
                        <div className="space-y-2 px-2">
                            <Skeleton className="h-3 w-1/2 rounded-full" />
                            <Skeleton className="h-5 w-full rounded-full" />
                        </div>
                    </div>
                ))
              ) : products?.map((product) => {
                const effectivePrice = calculateEffectivePrice(product as any, new Date());
                const catName = categoryMap.get(product.categoryId || '') || 'Premium Series'; 
                const isLiked = wishlistProductIds.has(product.id);

                return (
                  <div key={product.id} className="group relative">
                    <div 
                        onClick={() => onSelectProduct(product.id)} 
                        className="block w-full text-left cursor-pointer"
                    >
                        <div className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-800 mb-5 border-2 border-slate-200 dark:border-slate-700 shadow-2xl transition-all active:scale-[0.98] hover:border-primary/20">
                            <Image 
                                alt={product.name}  
                                className={cn(
                                    "w-full h-full object-cover transition-transform duration-1000",
                                    settings?.enableHoverZoom !== false && "group-hover:scale-110"
                                )}
                                src={product.imageUrl || 'https://placehold.co/400x600.png'}
                                fill
                                unoptimized
                            />
                            
                            {/* Actions & Badges */}
                            <div 
                                className={cn(
                                    "absolute top-4 right-4 w-10 h-10 flex items-center justify-center backdrop-blur-xl rounded-2xl shadow-2xl transition-all active:scale-90 z-10 border border-white/20",
                                    isLiked ? "bg-rose-500 text-white border-rose-400" : "bg-white/90 dark:bg-slate-900/90 text-slate-400"
                                )}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    isLiked ? removeFromWishlist(product.id) : addToWishlist(product.id);
                                }}
                            >
                                <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                            </div> 

                            {/* Add to Cart Quick Action */}
                            <div className="absolute bottom-4 right-4 z-10">
                                <Button 
                                    size="icon" 
                                    style={gridCartButtonStyle}
                                    className={cn(
                                        "text-white hover:scale-110 transition-transform active:scale-90 border-none",
                                        gridCartButtonClasses
                                    )}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        addToCart(product, effectivePrice);
                                        toast({ title: "Bag Updated", description: `${product.name} successfully added.` });
                                    }}
                                    disabled={product.stock <= 0}
                                >
                                    <GridCartIcon className="h-5 w-5" />
                                </Button>
                            </div>
                            
                            {product.promo?.isActive && (
                                <div className="absolute bottom-4 left-4">
                                    <Badge className="bg-rose-500 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 border-none shadow-2xl animate-pulse">
                                        <Zap className="h-3 w-3 mr-1.5 fill-current text-yellow-400" /> Special Offer
                                    </Badge>
                                </div>
                            )}
                        </div>
                        
                        <div className="space-y-1.5 px-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/60">{catName}</p>
                            <h4 className ="font-black text-sm text-slate-900 dark:text-white truncate leading-tight tracking-tight uppercase group-hover:text-primary transition-colors">{product.name}</h4>
                            <div className="flex items-baseline gap-2 pt-1">
                                <p className="text-primary font-black text-base tracking-tighter">{formatCurrency(effectivePrice, currencySymbol)}</p>
                                {effectivePrice < product.sellingPrice && (
                                    <span className="text-[10px] text-slate-400 line-through font-bold opacity-60">{formatCurrency(product.sellingPrice, currencySymbol)}</span> 
                                )}
                            </div>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
    );
}
