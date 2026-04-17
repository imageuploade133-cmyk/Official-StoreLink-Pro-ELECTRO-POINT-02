"use client";
import React from "react";

import { PublicNavbar } from '@/components/store/PublicNavbar';
import { PublicFooter } from '@/components/store/PublicFooter';
import { useGlobalLoading } from '@/contexts/global-loading-context';
import { PublicPageSkeleton } from '@/components/store/PublicPageSkeleton';
import { useSettings } from '@/contexts/settings-context';
import { BackgroundVideoPlayer } from '@/components/store/BackgroundVideoPlayer';
import { cn } from "@/lib/utils";
import { AdSystem } from '@/components/store/AdSystem';
import { BannerAd } from '@/components/ads/BannerAd';
import { useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, runTransaction, increment } from 'firebase/firestore';
import { format } from 'date-fns';
import { useParams } from 'next/navigation';
import { OfflineDetector } from "@/components/OfflineDetector";

function WebsiteTracker() {
  const firestore = useFirestore();
  const params = useParams();
  const storeId = params?.storeId as string;

  useEffect(() => {
    if (!firestore || !storeId) return;

    const trackVisit = async () => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      // Store-specific traffic tracking
      const trafficRef = doc(firestore, 'stores', storeId, 'analytics', 'websiteTraffic');

      try {
        await runTransaction(firestore, async (transaction) => {
          const trafficDoc = await transaction.get(trafficRef);
          
          if (!trafficDoc.exists()) {
            transaction.set(trafficRef, {
              totalViews: 1,
              todayViews: 1,
              lastDailyUpdate: todayStr,
              store_id: storeId
            });
          } else {
            const data = trafficDoc.data();
            const isNewDay = data.lastDailyUpdate !== todayStr;
            
            transaction.update(trafficRef, {
              totalViews: increment(1),
              todayViews: isNewDay ? 1 : increment(1),
              lastDailyUpdate: todayStr
            });
          }
        });
      } catch (error) {
        console.error("Traffic tracking failed:", error);
      }
    };

    trackVisit();
  }, [firestore, storeId]);

  return null;
}

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isInitialLoadComplete } = useGlobalLoading();
  const { settings } = useSettings();

  const storeLogoWidth = settings?.storeLogoWidth || 120;
  const logoContainerHeight = Math.max(32, Math.round(storeLogoWidth * 0.33));
  const navbarPadding = Math.max(16, Math.round(logoContainerHeight * 0.5));
  
  const heightMap = {
      compact: 48,
      default: 64,
      expanded: 80,
      full: 100,
  };
  
  const navbarHeight = settings?.navbarHeight ? (heightMap[settings.navbarHeight as keyof typeof heightMap] || 64) : (logoContainerHeight + (navbarPadding * 2));
  const navbarSticky = settings?.navbarSticky || 'fixed';

  if (!isInitialLoadComplete) {
    return <PublicPageSkeleton />;
  }

  return (
    <OfflineDetector>
      <WebsiteTracker />
      <AdSystem />
      {settings?.backgroundStyle === 'video' && settings.backgroundVideoUrl && <BackgroundVideoPlayer />}
      <PublicNavbar />
      
      <main 
        className={cn(
            "relative z-10 dark:bg-black transition-shadow duration-300",
            (settings?.enableBackgroundShadow ?? true) && "shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(255,255,255,0.05)]"
        )} 
        style={{ paddingTop: navbarSticky !== 'static' ? `${navbarHeight}px` : '0px' }}
      >
        <BannerAd location="top_of_page" />
        {children}
        <BannerAd location="bottom_of_page" />
      </main>

      <PublicFooter />
    </OfflineDetector>
  );
}
