
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { SlideShow } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  ArrowRight,
  ShoppingCart,
  ShoppingBag,
  Zap,
  Plus,
  Check,
  CheckCircle2,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/settings-context';
import { useParams } from 'next/navigation';

import { useStoreUrl } from '@/hooks/use-store-url';

const iconMap = {
  ShoppingCart,
  ShoppingBag,
  Zap,
  ArrowRight,
  Plus,
  Check,
  CheckCircle2,
  Package
};

export function HeroCarousel() {
  const firestore = useFirestore();
  const { settings } = useSettings();
  const params = useParams();
  const storeId = params?.storeId as string;
  const { getStoreUrl } = useStoreUrl();
  
  const slidesQuery = React.useMemo(() => {
    if (!firestore || !storeId) return null;
    return query(
      collection(firestore, 'slideShows'), 
      where('store_id', '==', storeId),
      where('published', '==', true), 
      orderBy('order', 'asc'), 
      limit(20)
    );
  }, [firestore, storeId]);
  const { data: slides, isLoading } = useCollection<SlideShow>(slidesQuery);

  const slideDuration = settings?.slideShowDuration || 7000;

  const autoplayPlugin = useMemo(
    () => Autoplay({ delay: slideDuration, stopOnInteraction: false, stopOnMouseEnter: true }),
    [slideDuration]
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: 'start',
      skipSnaps: false,
      duration: 40,
      watchSlides: true,
    }, 
    [autoplayPlugin]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [slidesInView, setSlidesInView] = useState<number[]>([]);

  const updateSlidesInView = useCallback(() => {
    if (!emblaApi) return;
    setSlidesInView(emblaApi.slidesInView());
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    updateSlidesInView();
  }, [emblaApi, updateSlidesInView]);

  useEffect(() => {
    if (!emblaApi) return;

    const onInit = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect();
    };

    onInit();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onInit);
    emblaApi.on('slidesInView', updateSlidesInView);
    return () => {
        if (emblaApi) {
          emblaApi.off('select', onSelect);
          emblaApi.off('reInit', onInit);
          emblaApi.off('slidesInView', updateSlidesInView);
        }
    };
  }, [emblaApi, onSelect, updateSlidesInView]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

  // Dynamic Button Settings
  const heroBtnText = settings?.storeHeroBtnText || 'Shop Collection';
  const HeroBtnIcon = iconMap[settings?.storeHeroBtnIcon as keyof typeof iconMap] || ArrowRight;

  const buttonStyle = useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const style = useIndividual 
      ? (settings?.storeHeroBtnStyle || 'gradient')
      : (settings?.storeBtnStyle || 'standard');
    
    const getColor = () => {
      if (useIndividual) {
        if (style === 'gradient') {
          return {
            background: `linear-gradient(135deg, ${settings?.storeHeroBtnGradientStart || '#8b5cf6'}, ${settings?.storeHeroBtnGradientEnd || '#7c3aed'})`,
            color: 'white',
            border: 'none'
          };
        }
        return {
          backgroundColor: settings?.storeHeroBtnColor || '#8b5cf6',
          color: 'white',
          border: 'none'
        };
      }
      // Global settings
      if (style === 'gradient') {
        return {
          background: `linear-gradient(135deg, ${settings?.storeBtnGradientStart || '#3b82f6'}, ${settings?.storeBtnGradientEnd || '#1d4ed8'})`,
          color: 'white',
          border: 'none'
        };
      }
      return {
        backgroundColor: settings?.storeBtnColor || '#3b82f6',
        color: 'white',
        border: 'none'
      };
    };
    
    return getColor();
  }, [settings]);

  // Button shape and size classes
  const buttonClasses = useMemo(() => {
    const useIndividual = settings?.useIndividualBtnSettings !== false;
    const shape = useIndividual 
      ? (settings?.storeHeroBtnShape || 'lg')
      : (settings?.storeBtnShape || 'lg');
    const size = useIndividual
      ? (settings?.storeHeroBtnSize || 'lg')
      : (settings?.storeBtnSize || 'md');
    const _shadow_removed = useIndividual
      ? (settings?.storeHeroBtnShadow || 'md')
      : 'md';
    
    const sizeClasses: Record<string, string> = {
      sm: 'px-4 py-2 text-xs',
      md: 'px-6 py-3 text-sm',
      lg: 'px-8 py-4 text-base',
      xl: 'px-10 py-5 text-lg'
    };

    const shapeClasses: Record<string, string> = {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded',
      full: 'rounded-full'
    };

    const shadowClasses: Record<string, string> = {
      none: '',
      sm: '',
      md: '',
      lg: '',
      xl: '',
      '2xl': '',
      inner: ''
    };
    
    const sizeClass = sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.lg;
    const shapeClass = shapeClasses[shape] || 'rounded';
    const shadowClass = shadowClasses[_shadow_removed as keyof typeof shadowClasses] || '';

    return `${shapeClass} ${sizeClass} ${shadowClass}`;
  }, [settings]);

  if (isLoading) {
    return (
      <div className="w-full aspect">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!slides || slides.length === 0) {
    return (
      <section className="w-full aspect bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white p-6">
          <h2 className="text-4xl font-black">Welcome to Our Store</h2>
          <p className="mt-4 text-slate-300 text-lg">New premium content coming soon!</p>
        </div>
      </section>
    );
  }

  return (
    <div className="relative w-full overflow-hidden bg-slate-950" data-no-ad-click="true">
      <div className="overflow-hidden w-full" ref={emblaRef}>
        <div className="flex embla__container">
          {slides.map((slide, index) => {
            const isLoaded = slidesInView.includes(index) || 
                           slidesInView.includes(index - 1) || 
                           slidesInView.includes(index + 1) ||
                           (index === 0 && slidesInView.includes(slides.length - 1)) ||
                           (index === slides.length - 1 && slidesInView.includes(0));

            return (
              <div 
                key={slide.id} 
                className="relative flex-[0_0_100%] min-w-0 aspect"
              >
                {/* Proportional Media Container */}
                <div className="relative z-0 w-full h-full">
                  {isLoaded ? (
                    <>
                      {slide.mediaType === 'video' && slide.videoUrl ? (
                        <div className="w-full h-full overflow-hidden">
                          <video
                            key={slide.id}
                            autoPlay
                            muted
                            loop
                            playsInline
                            poster={slide.videoPosterUrl || ''}
                            className="w-full h-full object-cover block"
                          >
                            <source src={slide.videoUrl} type="video/mp4" />
                          </video>
                        </div>
                      ) : (
                        <img
                          src={slide.imageUrl || 'https://placehold.co/1920x1080.png'}
                          alt={slide.title || 'Slide background'}
                          className="w-full h-full object-cover select-none block"
                          draggable={false}
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                       <Skeleton className="w-full h-full bg-slate-800" />
                    </div>
                  )}
                  
                  {slide.showOverlay === true && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur" />
                  )}

                  {/* Content Overlay - Centered within the proportional media */}
                  <div className="absolute inset-0 z-10 flex items-center">
                    <div className="max-w-site-container mx-auto px-6 sm:px-10 lg:px-12 w-full">
                      <div className="max-w-4xl text-center mx-auto space-y-2 md:space-y-10">
                        {slide.pretitle && (
                          <p className="text-white/80 text md:text-sm font-black tracking md:tracking uppercase animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {slide.pretitle}
                          </p>
                        )}
                        {slide.title && (
                          <h1 className="text-white text-xl sm:text-4xl md:text-6xl lg:text-8xl font-black mb-1 md:mb-4 leading-tight tracking-tighter animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
                            {slide.title}
                          </h1>
                        )}
                        {slide.description && (
                          <p className="text-slate-200 text sm:text-lg md:text-2xl font-medium max-w-2xl leading-tight md:leading-relaxed mx-auto opacity-90 line-clamp-2 sm:line-clamp-none animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                            {slide.description}
                          </p>
                        )}
                        {slide.showActionButton && (
                          <div className="pt-2 md:pt-10 animate-in fade-in zoom-in-95 duration-1000 delay-300">
                            <Button asChild style={buttonStyle} className={`group relative overflow-hidden font-black  active:scale-95 border-none transition-all duration-500 ${buttonClasses}`}>
                              <Link href={getStoreUrl('/store/shop')}>
                                <span className="relative z-10 flex items-center gap-2 md:gap-4">
                                  {heroBtnText}
                                  <HeroBtnIcon className="h-3.5 w-3.5 md:h-5 md:w-5 transition-transform duration-300 group-hover:translate-x-2" strokeWidth={3}/>
                                </span>
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows - Scaled for responsive layout */}
      <div className="absolute bottom-4 right-4 md:bottom-12 md:right-16 z-20 flex items-center space-x-2 md:space-x-6">
        <Button 
          onClick={scrollPrev}
          variant="outline"
          size="icon"
          className="group flex items-center justify-center w-8 h-8 md:w-16 md:h-16 rounded-full border-white/20 text-white bg-black/20 backdrop-blur-xl hover:bg-white hover:text-black transition-all duration-500 hover:scale-110"
          aria-label="Previous Slide"
        >
          <ArrowLeft className="group-hover:-translate-x-1 md:group-hover:-translate-x-2 transition-transform h-4 w-4 md:h-6 md:w-6" />
        </Button>
        <Button 
          onClick={scrollNext}
          variant="outline"
          size="icon"
          className="group flex items-center justify-center w-8 h-8 md:w-16 md:h-16 rounded-full border-white/20 text-white bg-black/20 backdrop-blur-xl hover:bg-white hover:text-black transition-all duration-500 hover:scale-110"
          aria-label="Next Slide"
        >
          <ArrowRight className="group-hover:translate-x-1 md:group-hover:translate-x-2 transition-transform h-4 w-4 md:h-6 md:w-6" />
        </Button>
      </div>

      {/* Progress Indicators - Adjusted for shorter mobile heights */}
      <div className="absolute bottom-4 left-4 md:bottom-12 md:left-16 z-20 flex items-end space-x-2 md:space-x-4">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className="group relative h-6 sm:h-12 w-1 sm:w-2 flex items-end"
            aria-label={`Go to slide ${index + 1}`}
          >
            <div 
              className={cn(`w-full rounded-full transition-all duration-700 ease-out ${
                index === selectedIndex ? 'h-full bg-primary' : 'h-2 md:h-3 bg-white/20 group-hover:bg-white/40'
              }`)} 
            />
          </button>
        ))}
        <div className="pl-2 md:pl-6 text md:text-xs font-black tracking md:tracking text-white/40 uppercase flex items-center gap-2 md:gap-3">
          <span className="text-white text-xs md:text-base">{String(selectedIndex + 1).padStart(2, '0')}</span>
          <span className="opacity-20 text-sm md:text-lg">/</span>
          <span>{String(slides.length).padStart(2, '0')}</span>
        </div>
      </div>

      {/* Design Decoration */}
      <div className="absolute top-0 left-4 md:left-16 w h-full bg-white/10 z-10" />
    </div>
  );
}
