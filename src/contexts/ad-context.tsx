
'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc, increment } from 'firebase/firestore';
import type { AdLink } from '@/lib/types';
import { safeStorage, safeSessionStorage } from '@/lib/storage-utils';
import { usePathname } from 'next/navigation';

interface AdContextType {
  activeAds: AdLink[];
  triggerAd: (placement: AdLink['placement']) => void;
  recordAdClick: (adId: string) => Promise<void>;
  recordAdView: (adId: string) => Promise<void>;
  rewardAdClicked: boolean;
  setRewardAdClicked: (clicked: boolean) => void;
  applyRewardDiscount: (price: number, ad: AdLink) => number;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export function AdProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const [rewardAdClicked, setRewardAdClicked] = useState(false);
  const pathname = usePathname();

  const storeId = useMemo(() => {
      const parts = pathname.split('/');
      // Check if we are in /store/[storeId] or /store-app/[storeId]
      if ((parts[1] === 'store' || parts[1] === 'store-app') && parts[2]) {
          return parts[2];
      }
      return null;
  }, [pathname]);

  const adsQuery = useMemo(() => {
    if (!firestore || !storeId) return null;
    return query(
        collection(firestore, 'adLinks'), 
        where('store_id', '==', storeId),
        where('status', '==', 'active')
    );
  }, [firestore, storeId]);

  const { data: activeAds } = useCollection<AdLink>(adsQuery);

  const recordAdClick = useCallback(async (adId: string) => {
    if (!firestore) return;
    try {
      const adRef = doc(firestore, 'adLinks', adId);
      await updateDoc(adRef, {
        clicks: increment(1)
      });
    } catch (error) {
      console.error("Error recording ad click:", error);
    }
  }, [firestore]);

  const recordAdView = useCallback(async (adId: string) => {
    if (!firestore) return;
    try {
      const adRef = doc(firestore, 'adLinks', adId);
      await updateDoc(adRef, {
        views: increment(1)
      });
    } catch (error) {
      console.error("Error recording ad view:", error);
    }
  }, [firestore]);

  const triggerAd = useCallback((placement: AdLink['placement']) => {
    if (!activeAds) return;

    const adsToTrigger = activeAds.filter(ad => ad.placement === placement);
    
    adsToTrigger.forEach(ad => {
      // Check frequency
      if (ad.frequency === 'once_per_session') {
        const lastUpdated = ad.updatedAt ? ad.updatedAt.toMillis() : (ad.createdAt?.toMillis() || 0);
        const sessionKey = `ad_triggered_${ad.id}_${lastUpdated}`;
        if (safeSessionStorage.getItem(sessionKey)) return;
        safeSessionStorage.setItem(sessionKey, 'true');
      }

      // Check device targeting
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (ad.deviceTargeting === 'mobile_only' && !isMobile) return;
      if (ad.deviceTargeting === 'desktop_only' && isMobile) return;

      // Trigger
      recordAdClick(ad.id); // Record the click
      window.open(ad.adLink, '_blank');
    });
  }, [activeAds, recordAdClick]);

  // Handle Background Ads with Frequency Time (Auto-click)
  React.useEffect(() => {
    if (!activeAds) return;

    const backgroundAds = activeAds.filter(
      ad => ad.status === 'active' && 
            ad.adType === 'background' && 
            ad.frequencyTime && 
            ad.frequencyTime > 0
    );

    const intervals: NodeJS.Timeout[] = [];

    backgroundAds.forEach(ad => {
      const handleTrigger = () => {
        // Check frequency for once_per_session
        if (ad.frequency === 'once_per_session') {
          const lastUpdated = ad.updatedAt ? ad.updatedAt.toMillis() : (ad.createdAt?.toMillis() || 0);
          const sessionKey = `ad_triggered_${ad.id}_${lastUpdated}`;
          if (safeSessionStorage.getItem(sessionKey)) return;
          safeSessionStorage.setItem(sessionKey, 'true');
        }

        // Check device targeting
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (ad.deviceTargeting === 'mobile_only' && !isMobile) return;
        if (ad.deviceTargeting === 'desktop_only' && isMobile) return;

        // Auto-click (Open link)
        try {
          recordAdClick(ad.id); // Record the click
          window.open(ad.adLink, '_blank');
        } catch (e) {
          console.error("Auto-click ad failed (likely blocked by popup blocker):", e);
        }
      };

      if (ad.frequency === 'every_time') {
        const intervalId = setInterval(handleTrigger, (ad.frequencyTime || 7) * 1000);
        intervals.push(intervalId);
      } else if (ad.frequency === 'once_per_session') {
        // For once_per_session with a delay
        const timeoutId = setTimeout(handleTrigger, (ad.frequencyTime || 7) * 1000);
        intervals.push(timeoutId);
      }
    });

    return () => {
      intervals.forEach(id => {
        clearInterval(id);
        clearTimeout(id);
      });
    };
  }, [activeAds]);

  const applyRewardDiscount = useCallback((price: number, ad: AdLink) => {
    if (ad.rewardDiscountType === 'percentage') {
      return price * (1 - (ad.rewardDiscountValue || 0) / 100);
    } else {
      return Math.max(0, price - (ad.rewardDiscountValue || 0));
    }
  }, []);

  const value = {
    activeAds: activeAds || [],
    triggerAd,
    recordAdClick,
    recordAdView,
    rewardAdClicked,
    setRewardAdClicked,
    applyRewardDiscount
  };

  return (
    <AdContext.Provider value={value}>
      {children}
    </AdContext.Provider>
  );
}

export function useAds() {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAds must be used within an AdProvider');
  }
  return context;
}
