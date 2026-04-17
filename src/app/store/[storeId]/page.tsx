
'use client';

import React, { useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { BrandValue, Category, HomepageSection } from '@/lib/types';
import { ArrowRight, Truck, ShieldCheck, Headset, Leaf, Sparkles, Gift } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { HeroCarousel } from './HeroCarousel';
import Autoplay from "embla-carousel-autoplay";
import { NewsletterSection } from '@/components/store/NewsletterSection';
import { ProductSection } from '@/components/store/ProductSection';
import { CustomUISection } from '@/components/store/CustomUISection';
import { CategoryGallery } from '@/components/store/CategoryGallery';
import { BannerAd } from '@/components/ads/BannerAd';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const iconComponents = { Truck, ShieldCheck, Headset, Leaf, Sparkles, Gift };
const DynamicIcon = ({ name }: { name: string }) => {
    const Icon = iconComponents[name as keyof typeof iconComponents];
    return Icon ? <Icon className="h-7 w-7" /> : null;
};

export default function StoreHomePage() {
  const firestore = useFirestore();
  const { settings } = useSettings();
  const currencySymbol = settings?.currency || '$';
  const params = useParams();
  const storeId = params?.storeId as string;

  // Fetch Categories once for name mapping across all sections
  const categoriesQuery = useMemo(() => {
    if (!firestore || !storeId) return null;
    return query(collection(firestore, 'categories'), where('store_id', '==', storeId), orderBy('name'));
  }, [firestore, storeId]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  // Fetch Homepage Sections (Product & Custom UI)
  const sectionsQuery = useMemo(() => {
    if (!firestore || !storeId) return null;
    return query(collection(firestore, 'homepageSections'), where('store_id', '==', storeId), where('published', '==', true), orderBy('order', 'asc'));
  }, [firestore, storeId]);
  const { data: sections } = useCollection<HomepageSection>(sectionsQuery);
  
  const defaultValues: BrandValue[] = [
    { icon: 'Truck', title: 'Free Shipping', description: `On all orders over ${currencySymbol}600` },
    { icon: 'ShieldCheck', title: 'Secure Payment', description: '100% secure payment' },
    { icon: 'Headset', title: '24/7 Support', description: 'Dedicated assistance' },
    { icon: 'Leaf', title: 'Eco-friendly', description: 'Sustainable packaging' },
  ];

  const brandValues = settings?.brandValues?.length === 4 ? settings.brandValues : defaultValues;
  const brandValuesBg = settings?.brandValuesBackgroundColor || 'transparent';
  
  const showCategorySection = settings?.showCategorySection ?? true;

  const valuesAutoplay = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })
  )

  return (
    <>
      <HeroCarousel />
      
      {settings?.showBrandValues !== false && (
        <section 
          className="relative group/values" 
          style={{ 
            backgroundColor: brandValuesBg,
            paddingTop: `${settings?.brandValuesVerticalPadding ?? 80}px`,
            paddingBottom: `${settings?.brandValuesVerticalPadding ?? 80}px`
          }}
        >
          <div 
            className="mx-auto px-4 sm:px-6 lg:px-8"
            style={{ 
              maxWidth: settings?.brandValuesMaxWidth ? `${settings.brandValuesMaxWidth}px` : 'var(--container-width)' 
            }}
          >
            <Carousel
              plugins={[valuesAutoplay.current]}
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4 md:-ml-8">
                {brandValues.map((value, index) => (
                  <CarouselItem key={index} className="pl-4 md:pl-8 basis-full sm:basis-1/2 lg:basis-1/4">
                    <div 
                      className={cn(
                        "flex flex-col items-center text-center p-8 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all duration-500 group h-full",
                        settings?.brandValuesEnableShadow !== false && "",
                        settings?.brandValuesEnableZoom !== false && "hover:-translate-y-1.5"
                      )}
                    >
                      <div className={cn(
                        "h-16 w-16 mb-6 rounded-2xl bg-primary/5 flex items-center justify-center text-primary transition-all duration-500 ",
                        settings?.brandValuesEnableZoom !== false && "group-hover:scale-110 group-hover:bg-primary group-hover:text-white"
                      )}>
                        <DynamicIcon name={value.icon} />
                      </div>
                      <h4 className="font-black text-xs md:text-sm uppercase tracking mb-2 text-slate-900 dark:text-white">
                        {value.title}
                      </h4>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 leading-relaxed uppercase tracking-tighter">
                        {value.description}
                      </p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              
              {/* Premium Integrated Controls */}
              <div className="flex justify-center items-center gap-6 mt-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <CarouselPrevious 
                    className="static translate-y-0 h-12 w-12 rounded-full border border-primary/20 bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 " 
                />
                <div className="h-1 w-12 rounded-full bg-primary/10" />
                <CarouselNext 
                    className="static translate-y-0 h-12 w-12 rounded-full border border-primary/20 bg-background/80 backdrop-blur-sm hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 " 
                />
              </div>
            </Carousel>
          </div>
        </section>
      )}

      {/* DYNAMIC CATEGORY GALLERY WITH INFINITE SCROLL */}
      {showCategorySection && <CategoryGallery />}

      <BannerAd location="after_first_row" />

      {/* RENDER DYNAMIC HOMEPAGE SECTIONS */}
      {sections?.map(section => (
          section.selectionType === 'custom-ui' ? (
            <CustomUISection key={section.id} section={section} />
          ) : (
            <ProductSection 
                key={section.id} 
                section={section}
                categories={categories || []}
            />
          )
      ))}

      <NewsletterSection />
    </>
  );
}
