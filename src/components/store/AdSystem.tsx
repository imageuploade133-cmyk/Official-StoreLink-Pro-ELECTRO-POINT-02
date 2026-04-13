
'use client';

import { useEffect } from 'react';
import { useAds } from '@/contexts/ad-context';
import { usePathname } from 'next/navigation';

export function AdSystem() {
  const { triggerAd } = useAds();
  const pathname = usePathname();

  useEffect(() => {
    // Trigger page_visit ad whenever the pathname changes (new page visited)
    triggerAd('page_visit');
  }, [pathname, triggerAd]);

  useEffect(() => {
    const handleClick = () => {
      triggerAd('click_anywhere');
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [triggerAd]);

  return null;
}
