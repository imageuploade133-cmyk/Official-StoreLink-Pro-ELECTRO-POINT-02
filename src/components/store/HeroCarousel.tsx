'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { SlideShow } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useStoreUrl } from '@/hooks/use-store-url';
import { useSettings } from '@/contexts/settings-context';

export function HeroCarousel() {
  const firestore = useFirestore();
  const { storeId, getStoreUrl } = useStoreUrl();
  const { settings, isLoadingSettings } = useSettings();

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

  const autoplay = useRef(
    Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: 'start',
      skipSnaps: false,
      duration: 35,
      watchSlides: true,
    }, 
    [autoplay.current]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [slidesInView, setSlidesInView] = useState<number[]>([]);

  const updateSlidesInView = useCallback(() => {
    if (!emblaApi) return;
    setSlidesInView(emblaApi.slidesInView());
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => emblaApi && emblaApi.scrollTo(index),
    [emblaApi]
  );

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

  // Hero Button Style
  const heroBtnStyle = useMemo(() => {
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
    } else if (style === 'glass') {
        return {
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: settings?.storeHeroBtnColor || '#8b5cf6',
            border: '1px solid rgba(255, 255, 255, 0.5)'
        };
    }

    return {
        backgroundColor: settings?.storeHeroBtnColor || '#8b5cf6',
        color: 'white',
        border: 'none'
    };
  }, [settings]);

  const heroBtnClasses = useMemo(() => {
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

    const sizeClasses: Record<string, string> = {
        sm: 'h-10 text-xs px-4',
        md: 'h-12 text-sm px-6',
        lg: 'h-14 text-sm px-8',
        xl: 'h-16 text-base px-10'
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

    const sizeClass = sizeClasses[size] || sizeClasses.lg;
    const shapeClass = shapeClasses[shape] || 'rounded-2xl';
    const shadowClass = shadowClasses[shadow as keyof typeof shadowClasses] || 'shadow-md';

    return `${sizeClass} ${shapeClass} ${shadowClass}`;
  }, [settings]);

  if (isLoading || isLoadingSettings) {
    return (
      <div className="w-full aspect-[21/7]">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (settings?.showGlobalSlideShow === false) {
    return null;
  }

  if (!slides || slides.length === 0) {
    return (
      <section className="w-full aspect-[21/7] bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-3xl font-bold">Welcome to Our Store</h2>
          <p className="mt-2 text-slate-300">New content coming soon!</p>
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
                className="relative flex-[0_0_100%] min-w-0 aspect-[21/7]"
              >
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
                </div>

                <div className="absolute inset-0 z-10 flex items-center">
                  <div className="max-w-7xl mx-auto px-10 w-full">
                    <div className="max-w-2xl">
                      {slide.pretitle && (
                        <p className="text-white/60 text-xs font-bold tracking-[0.3em] uppercase mb-4 animate-in slide-in-from-left duration-700">
                          {slide.pretitle}
                        </p>
                      )}
                      {slide.title && (
                        <h1 className="text-white text-5xl md:text-7xl font-extrabold mb-8 leading-[1.1] tracking-tight">
                          {slide.title.split(',').map((part, i) => (
                            <React.Fragment key={i}>
                              {part.trim()}
                              {i < slide.title.split(',').length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </h1>
                      )}
                      {slide.description && (
                        <p className="text-slate-300 text-lg md:text-xl font-light mb-10 max-w-lg leading-relaxed">
                          {slide.description}
                        </p>
                      )}
                      {slide.showActionButton && (
                        <Button 
                          asChild 
                          style={heroBtnStyle}
                          className={cn(
                            "group relative overflow-hidden font-bold tracking-widest uppercase transition-all duration-300 hover:pr-12 active:scale-95",
                            heroBtnClasses
                          )}
                        >
                          <Link href={getStoreUrl('/store/shop')}>
                            <span className="relative z-10">{settings?.storeHeroBtnText || 'Shop Collection'}</span>
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                               <ArrowRight className="h-4 w-4" strokeWidth={2.5}/>
                            </span>
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-12 right-12 z-20 flex items-center space-x-6">
        <Button 
          onClick={scrollPrev}
          variant="outline"
          size="icon"
          className="group flex items-center justify-center w-12 h-12 rounded-full border-white/20 text-white bg-transparent hover:bg-white/10 transition-all"
          aria-label="Previous Slide"
        >
          <ArrowLeft className="group-hover:-translate-x-1 transition-transform h-5 w-5" />
        </Button>
        <Button 
          onClick={scrollNext}
          variant="outline"
          size="icon"
          className="group flex items-center justify-center w-12 h-12 rounded-full border-white/20 text-white bg-transparent hover:bg-white/10 transition-all"
          aria-label="Next Slide"
        >
          <ArrowRight className="group-hover:translate-x-1 transition-transform h-5 w-5" />
        </Button>
      </div>

      <div className="absolute bottom-12 left-10 z-20 flex items-end space-x-3">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className="group relative h-8 w-1 flex items-end"
            aria-label={`Go to slide ${index + 1}`}
          >
            <div 
              className={`w-full transition-all duration-500 ease-out ${
                index === selectedIndex ? 'h-full bg-white' : 'h-2 bg-white/20 group-hover:bg-white/40'
              }`} 
            />
          </button>
        ))}
        <div className="pl-4 text-[10px] font-bold tracking-widest text-white/40 uppercase">
          {String(selectedIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
        </div>
      </div>

      <div className="absolute top-0 left-10 w-[1px] h-full bg-white/5 z-10" />
    </div>
  );
}