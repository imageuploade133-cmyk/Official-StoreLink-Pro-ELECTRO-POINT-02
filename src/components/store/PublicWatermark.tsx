
'use client';

import React from 'react';
import { useSettings } from '@/contexts/settings-context';
import { cn } from '@/lib/utils';

/**
 * PublicWatermark - Immersive Brand Overlay
 * Projects a subtle brand signature across the public storefront.
 */
export function PublicWatermark() {
  const { settings, isLoadingSettings } = useSettings();

  if (isLoadingSettings || !settings?.webWatermarkEnabled) return null;

  const isText = settings.webWatermarkType === 'text';
  const opacity = settings.webWatermarkOpacity ?? 0.1;
  const rotation = settings.webWatermarkRotation ?? -30;

  return (
    <div className="fixed inset-0 pointer-events-none z-[5] flex items-center justify-center overflow-hidden select-none">
      <div 
        style={{ 
          opacity, 
          transform: `rotate(${rotation}deg)`,
          width: isText ? 'auto' : `${settings.webWatermarkImageWidth ?? 400}px`,
          height: 'auto'
        }}
        className="transition-all duration-1000 ease-in-out"
      >
        {isText ? (
          <span 
            className="font-black whitespace-nowrap leading-none tracking-tighter"
            style={{ 
                fontSize: `${settings.webWatermarkFontSize ?? 120}px`, 
                color: 'currentColor' 
            }}
          >
            {settings.webWatermarkText || 'STORELINK PRO'}
          </span>
        ) : (
          settings.webWatermarkImageUrl && (
            <img 
              src={settings.webWatermarkImageUrl} 
              alt="" 
              className="w-full h-auto object-contain"
              draggable={false}
            />
          )
        )}
      </div>
    </div>
  );
}
