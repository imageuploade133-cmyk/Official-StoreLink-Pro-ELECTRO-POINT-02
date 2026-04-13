
'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { AdLink } from '@/lib/types';
import { safeStorage, safeSessionStorage } from '@/lib/storage-utils';

interface AdContextType {
  activeAds: AdLink[];
  triggerAd: (placement: AdLink['placement']) => void;
  rewardAdClicked: boolean;
  setRewardAdClicked: (clicked: boolean) => void;
  applyRewardDiscount: (price: number, ad: AdLink) => number;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export function AdProvider({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const [rewardAdClicked, setRewardAdClicked] = useState(false);

  const adsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'adLinks'), where('status', '==', 'active'));
  }, [firestore]);

  const { data: activeAds } = useCollection<AdLink>(adsQuery);

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
      window.open(ad.adLink, '_blank');
    });
  }, [activeAds]);

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
