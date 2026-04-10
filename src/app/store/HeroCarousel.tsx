
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
  
  const slidesQuery = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'slideShows'), where('published', '==', true), orderBy('order', 'asc'), limit(5));
  }, [firestore]);
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
      duration: 40
    }, 
    [autoplayPlugin]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
        if (emblaApi) {
          emblaApi.off('select', onSelect);
        }
    };
  }, [emblaApi, onSelect]);

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

  if (isLoading) {
    return (
      <div className="max-w-site-container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Skeleton className="aspect-video w-full rounded-3xl" />
      </div>
    );
  }

  if (!slides || slides.length === 0) {
    return (
      <section className="aspect-video w-full bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white p-6">
          <h2 className="text-4xl font-black">Welcome to Our Store</h2>
          <p className="mt-4 text-slate-300 text-lg">New premium content coming soon!</p>
        </div>
      </section>
    );
  }

  return (
    <div className="relative w-full overflow-hidden bg-slate-950">
      <div className="overflow-hidden w-full" ref={emblaRef}>
        <div className="flex embla__container">
          {slides.map((slide, index) => (
            <div 
              key={slide.id} 
              className="relative flex-[0_0_100%] min-w-0"
            >
              {/* Proportional Media Container */}
              <div className="relative z-0 w-full">
                {slide.mediaType === 'video' && slide.videoUrl ? (
                  <div className="aspect-video w-full overflow-hidden">
                    <video
                      key={slide.id}
                      autoPlay
                      muted
                      loop
                      playsInline
                      poster={slide.videoPosterUrl || ''}
                      className="w-full h-full object-cover"
                    >
                      <source src={slide.videoUrl} type="video/mp4" />
                    </video>
                  </div>
                ) : (
                  <Image
                    src={slide.imageUrl || 'https://placehold.co/1920x1080.png'}
                    alt={slide.title || 'Slide background'}
                    width={1920}
                    height={800}
                    sizes="100vw"
                    className="w-full h-auto select-none block"
                    draggable={false}
                    priority={index === 0}
                    unoptimized
                  />
                )}
                
                {slide.showOverlay === true && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                )}

                {/* Content Overlay - Centered within the proportional media */}
                <div className="absolute inset-0 z-10 flex items-center">
                  <div className="max-w-site-container mx-auto px-6 sm:px-10 lg:px-12 w-full">
                    <div className="max-w-4xl text-center mx-auto space-y-2 md:space-y-10">
                      {slide.pretitle && (
                        <p className="text-white/80 text-[8px] md:text-sm font-black tracking-[0.2em] md:tracking-[0.4em] uppercase animate-in fade-in slide-in-from-bottom-4 duration-700">
                          {slide.pretitle}
                        </p>
                      )}
                      {slide.title && (
                        <h1 className="text-white text-xl sm:text-4xl md:text-6xl lg:text-8xl font-black mb-1 md:mb-4 leading-tight tracking-tighter animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
                          {slide.title}
                        </h1>
                      )}
                      {slide.description && (
                        <p className="text-slate-200 text-[10px] sm:text-lg md:text-2xl font-medium max-w-2xl leading-tight md:leading-relaxed mx-auto opacity-90 line-clamp-2 sm:line-clamp-none animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                          {slide.description}
                        </p>
                      )}
                      {slide.showActionButton && (
                        <div className="pt-2 md:pt-10 animate-in fade-in zoom-in-95 duration-1000 delay-300">
                          <Button asChild size="lg" style={buttonStyle} className="group relative overflow-hidden px-4 md:px-14 py-2 md:py-8 font-black text-[10px] md:text-sm tracking-widest md:tracking-[0.25em] uppercase transition-all duration-500 rounded-full shadow-2xl active:scale-95 h-8 md:h-auto border-none">
                            <Link href="/store/shop">
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
          ))}
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
                index === selectedIndex ? 'h-full bg-primary shadow-[0_0_20px_rgba(59,130,246,0.8)]' : 'h-2 md:h-3 bg-white/20 group-hover:bg-white/40'
              }`)} 
            />
          </button>
        ))}
        <div className="pl-2 md:pl-6 text-[8px] md:text-xs font-black tracking-[0.2em] md:tracking-[0.3em] text-white/40 uppercase flex items-center gap-2 md:gap-3">
          <span className="text-white text-xs md:text-base">{String(selectedIndex + 1).padStart(2, '0')}</span>
          <span className="opacity-20 text-sm md:text-lg">/</span>
          <span>{String(slides.length).padStart(2, '0')}</span>
        </div>
      </div>

      {/* Design Decoration */}
      <div className="absolute top-0 left-4 md:left-16 w-[1px] h-full bg-white/10 z-10" />
    </div>
  );
}
