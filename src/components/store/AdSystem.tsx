
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
    const handleClick = (e: MouseEvent) => {
      // Don't trigger ads if clicking on a button, link, or any interactive element
      // Also respect data-no-ad-click attribute for special regions like carousels
      const target = e.target as HTMLElement;
      if (
        target.closest('button') || 
        target.closest('a') || 
        target.closest('[role="button"]') ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('[data-no-ad-click="true"]')
      ) {
        return;
      }
      triggerAd('click_anywhere');
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [triggerAd]);

  return null;
}
