
'use client';

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  startAfter, 
  endBefore, 
  limitToLast,
  getCountFromServer,
  type QueryDocumentSnapshot,
  type DocumentData 
} from 'firebase/firestore';
import type { HomepageSection, Category, SlideShow } from '@/lib/types';
import { ProductSection } from '@/components/store/ProductSection';
import { Zap, ArrowLeft, ShoppingBag, Loader2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/contexts/settings-context';
import { cn, convertToDateSafely } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const SECTIONS_PER_PAGE = 5;

/**
 * HubHero - Specific slideshow/banner for the Flash Hub
 */
function HubHero({ slides, settings }: { slides: SlideShow[], settings: any }) {
    const slideDuration = settings?.slideShowDuration || 7000;
    const hubColor = settings?.flashHubColor || '#e11d48';
    const iconColor = settings?.flashHubIconColor || '#fbbf24';
    const iconUrl = settings?.flashHubIconUrl;

    const autoplayPlugin = useMemo(
        () => Autoplay({ delay: slideDuration, stopOnInteraction: false, stopOnMouseEnter: true }),
        [slideDuration]
    );

    const [emblaRef, emblaApi] = useEmblaCarousel({ 
        loop: true, 
        align: 'start',
        watchSlides: true
    }, [autoplayPlugin]);

    const [slidesInView, setSlidesInView] = useState<number[]>([]);

    const updateSlidesInView = useCallback(() => {
        if (!emblaApi) return;
        setSlidesInView(emblaApi.slidesInView());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        
        const onInit = () => {
            updateSlidesInView();
        };

        onInit();
        emblaApi.on('select', onInit);
        emblaApi.on('reInit', onInit);
        emblaApi.on('slidesInView', updateSlidesInView);
        return () => {
            if (emblaApi) {
                emblaApi.off('select', onInit);
                emblaApi.off('reInit', onInit);
                emblaApi.off('slidesInView', updateSlidesInView);
            }
        };
    }, [emblaApi, updateSlidesInView]);

    if (slides.length === 0) {
        const bannerImg = settings?.flashHubBannerImageUrl;
        const bannerVid = settings?.flashHubBannerVideoUrl;
        const bannerPoster = settings?.flashHubBannerVideoPosterUrl;

        return (
            <header 
                className="relative py-24 md:py-32 text-white overflow-hidden"
                style={{ backgroundColor: hubColor }}
            >
                <div className="absolute inset-0 z-0">
                    {bannerVid ? (
                        <video autoPlay muted loop playsInline poster={bannerPoster || ''} className="w-full h-full object-cover opacity-40">
                            <source src={bannerVid} type="video/mp4" />
                        </video>
                    ) : bannerImg ? (
                        <Image src={bannerImg} alt="Sales Hub" fill className="object-cover opacity-40" />
                    ) : (
                        <>
                            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
                            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-black/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
                        </>
                    )}
                    <div 
                        className="absolute inset-0 bg-gradient-to-t via-transparent to-transparent" 
                        style={{ 
                            backgroundImage: `linear-gradient(to top, ${hubColor}, rgba(0,0,0,0.2), transparent)` 
                        }}
                    />
                </div>
                
                <div className="max-w-site-container mx-auto px-6 relative z-10 text-center space-y-8">
                    <Link href="/store/shop" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                        <ArrowLeft className="h-3 w-3" /> Back to Catalog
                    </Link>
                    <div className="flex justify-center">
                        <div className="bg-white/10 p-3 rounded-2xl shadow-2xl rotate-3 animate-bounce border border-white/20 backdrop-blur-md">
                            {iconUrl ? (
                                <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-white">
                                    <Image src={iconUrl} alt="Sale Icon" fill className="object-cover" />
                                </div>
                            ) : (
                                <Zap className="h-10 w-10 fill-current" style={{ color: iconColor }} />
                            )}
                        </div>
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-4 leading-none uppercase">
                        {settings?.flashHubTitle || 'FLASH HUB'}
                    </h1>
                    <p className="text-lg md:text-2xl text-white/90 max-w-3xl mx-auto font-medium leading-relaxed">
                        {settings?.flashHubDescription || 'Every active section-wide deal consolidated. High-demand items, limited windows.'}
                    </p>
                </div>
            </header>
        );
    }

    return (
        <div className="relative w-full bg-slate-950 overflow-hidden" ref={emblaRef} data-no-ad-click="true">
            <div className="flex embla__container">
                {slides.map((slide, index) => {
                    const isLoaded = slidesInView.includes(index) || 
                                   slidesInView.includes(index - 1) || 
                                   slidesInView.includes(index + 1) ||
                                   (index === 0 && slidesInView.includes(slides.length - 1)) ||
                                   (index === slides.length - 1 && slidesInView.includes(0));

                    return (
                        <div key={slide.id} className="relative flex-[0_0_100%] min-w-0 aspect-[16/9] md:aspect-[21/7]">
                            <div className="relative w-full h-full">
                                {isLoaded ? (
                                    <>
                                        {slide.mediaType === 'video' && slide.videoUrl ? (
                                            <video autoPlay muted loop playsInline poster={slide.videoPosterUrl || ''} className="w-full h-full object-cover block">
                                                <source src={slide.videoUrl} type="video/mp4" />
                                            </video>
                                        ) : (
                                            <img src={slide.imageUrl || ''} alt="" className="w-full h-full object-cover block" />
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full bg-slate-900" />
                                )}
                                {slide.showOverlay && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />}
                                
                                <div className="absolute inset-0 flex items-center">
                                    <div className="max-w-site-container mx-auto px-10 w-full text-center space-y-6">
                                        {slide.pretitle && <p className="text-white/80 text-[10px] md:text-sm font-black tracking-[0.4em] uppercase">{slide.pretitle}</p>}
                                        {slide.title && <h1 className="text-white text-3xl md:text-7xl font-black tracking-tighter leading-none">{slide.title}</h1>}
                                        {slide.description && <p className="text-slate-200 text-sm md:text-xl font-medium max-w-2xl mx-auto">{slide.description}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function AllFlashSalesPage() {
  const firestore = useFirestore();
  const { settings } = useSettings();
  const [today, setToday] = useState<Date | null>(null);

  // Pagination State for Sections
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalSectionCount, setTotalSectionCount] = useState(0);
  
  const firstDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const categoriesQuery = useMemo(() => firestore ? query(collection(firestore, 'categories'), orderBy('name')) : null, [firestore]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const fetchSections = useCallback(async (direction: 'initial' | 'next' | 'prev' = 'initial') => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      let q = query(
        collection(firestore, 'homepageSections'), 
        where('isFlashSale', '==', true),
        where('published', '==', true), 
        orderBy('order', 'asc')
      );

      if (direction === 'initial') {
        const countSnap = await getCountFromServer(q);
        setTotalSectionCount(countSnap.data().count);
      }

      if (direction === 'next' && lastDocRef.current) {
        q = query(q, startAfter(lastDocRef.current), limit(SECTIONS_PER_PAGE));
      } else if (direction === 'prev' && firstDocRef.current) {
        q = query(q, endBefore(firstDocRef.current), limitToLast(SECTIONS_PER_PAGE));
      } else {
        q = query(q, limit(SECTIONS_PER_PAGE));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      if (docs.length > 0) {
        firstDocRef.current = docs[0];
        lastDocRef.current = docs[docs.length - 1];
        setIsLastPage(docs.length < SECTIONS_PER_PAGE);

        const sectionsData = docs.map(d => ({ id: d.id, ...d.data() } as HomepageSection));
        setSections(sectionsData);
        
        if (direction === 'next') setCurrentPage(p => p + 1);
        else if (direction === 'prev') setCurrentPage(p => Math.max(1, p - 1));
        else setCurrentPage(1);
      } else {
        if (direction === 'initial') {
          setSections([]);
          setIsLastPage(true);
        }
      }
    } catch (error) {
      console.error("Error fetching flash sale sections:", error);
    } finally {
      setIsLoading(false);
    }
  }, [firestore]);

  useEffect(() => {
    fetchSections('initial');
  }, [fetchSections]);

  const slidesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'slideShows'),
        where('placement', '==', 'flash-hub'),
        where('published', '==', true),
        orderBy('order', 'asc')
    );
  }, [firestore]);
  const { data: hubSlides } = useCollection<SlideShow>(slidesQuery);

  const activeSections = useMemo(() => {
    if (!sections || !today) return [];
    return sections.filter(section => {
      const startDate = convertToDateSafely(section.flashSaleStartDate);
      const endDate = convertToDateSafely(section.flashSaleEndDate);
      if (startDate && today < startDate) return false;
      if (endDate && today > endDate) return false;
      return true;
    });
  }, [sections, today]);

  if (!today) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Synchronizing Hub...</p>
      </div>
    );
  }

  const totalPages = Math.ceil(totalSectionCount / SECTIONS_PER_PAGE);

  return (
    <div className="bg-background min-h-screen">
      <HubHero slides={hubSlides || []} settings={settings} />

      <main className="pb-20">
        {isLoading && sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Retrieving Live Events...</p>
            </div>
        ) : activeSections.length > 0 ? (
          <div className="space-y-4">
            {activeSections.map(section => (
                <ProductSection 
                key={section.id} 
                section={section} 
                categories={categories || []}
                />
            ))}

            {/* Section Pagination Footer */}
            {totalPages > 1 && (
                <div className="max-w-site-container mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between border-t border-dashed gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Zap className="h-5 w-5 fill-current" />
                        </div>
                        <p className="text-xs font-black uppercase text-muted-foreground tracking-[0.2em]">
                            Registry Page {currentPage} of {totalPages} <span className="mx-2 text-slate-200">|</span> {totalSectionCount} Active Events
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="lg" 
                            onClick={() => fetchSections('prev')} 
                            disabled={currentPage === 1 || isLoading}
                            className="rounded-xl font-bold gap-2 h-12"
                        >
                            <ChevronLeft className="h-4 w-4" /> Previous Events
                        </Button>
                        <Button 
                            variant="outline" 
                            size="lg" 
                            onClick={() => fetchSections('next')} 
                            disabled={isLastPage || isLoading}
                            className="rounded-xl font-bold gap-2 h-12"
                        >
                            Next Events <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-6 py-32 text-center">
            <div className="bg-muted h-32 w-32 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <ShoppingBag className="h-14 w-14 text-slate-300" />
            </div>
            <h2 className="text-3xl font-black tracking-tight uppercase">No Active Flash Sales</h2>
            <p className="text-slate-500 mt-4 text-lg font-medium">
              Our automated merchandising engine is currently preparing the next round of exclusive events. Check back shortly.
            </p>
            <Button asChild size="lg" className="mt-10 rounded-2xl h-14 px-10 font-black uppercase text-xs tracking-widest shadow-xl">
                <Link href="/store/shop">Explore Catalog</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
