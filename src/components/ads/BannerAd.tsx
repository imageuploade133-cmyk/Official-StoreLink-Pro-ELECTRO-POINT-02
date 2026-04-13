'use client';

import React, { useEffect, useRef } from 'react';
import { useAds } from '@/contexts/ad-context';
import { cn } from '@/lib/utils';

interface BannerAdProps {
  location: string;
  className?: string;
}

export function BannerAd({ location, className }: BannerAdProps) {
  const { activeAds, recordAdView, recordAdClick } = useAds();
  const containerRef = useRef<HTMLDivElement>(null);

  const banner = activeAds.find(
    ad => ad.adType === 'banner' && ad.bannerLocation === location && ad.status === 'active'
  );

  useEffect(() => {
    if (banner?.adScript && containerRef.current) {
      // Record view
      recordAdView(banner.id);

      // Clear container
      containerRef.current.innerHTML = '';
      
      // Create a temporary element to parse the script
      const div = document.createElement('div');
      div.innerHTML = banner.adScript;
      
      // Execute scripts in the embedded HTML
      const scripts = div.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        const script = document.createElement('script');
        const oldScript = scripts[i];
        
        // Copy attributes
        for (let j = 0; j < oldScript.attributes.length; j++) {
          const attr = oldScript.attributes[j];
          script.setAttribute(attr.name, attr.value);
        }
        
        // Copy content
        script.textContent = oldScript.textContent;
        
        // Replace old script with new one that will actually execute
        oldScript.parentNode?.replaceChild(script, oldScript);
      }
      
      // Append the processed HTML to container
      containerRef.current.appendChild(div);

      // Add click listener to container to track clicks on the banner
      const handleBannerClick = () => {
        recordAdClick(banner.id);
      };

      containerRef.current.addEventListener('click', handleBannerClick);

      return () => {
        containerRef.current?.removeEventListener('click', handleBannerClick);
      };
    }
  }, [banner, recordAdView, recordAdClick]);

  if (!banner) return null;

  return (
    <div 
      ref={containerRef} 
      className={cn("ad-banner-container overflow-hidden flex justify-center items-center my-4", className)}
    />
  );
}
