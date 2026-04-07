'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ProductLoadingOverlayProps {
  isVisible: boolean;
  productName?: string;
}

export function ProductLoadingOverlay({ isVisible, productName }: ProductLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-opacity duration-300",
      isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <div className="bg-white/10 dark:bg-black/60 border border-white/10 rounded-3xl shadow-2xl p-10 flex flex-col items-center gap-5 max-w-xs mx-4 animate-in fade-in zoom-in-95 duration-300">
        {/* Multi-ring spinner */}
        <div className="relative flex items-center justify-center">
          {/* Outer ring */}
          <span
            className="absolute rounded-full border border-primary/20 border-t-primary/60"
            style={{ width: 64, height: 64, animation: 'spin 2s linear infinite' }}
          />
          {/* Middle ring */}
          <span
            className="absolute rounded-full border border-primary/10 border-b-primary/50"
            style={{ width: 46, height: 46, animation: 'spin 1.3s linear infinite reverse' }}
          />
          {/* Inner dot */}
          <span
            className="h-4 w-4 rounded-full bg-primary/80"
            style={{ animation: 'pulse-dot 1.2s ease-in-out infinite' }}
          />
        </div>

        <div className="text-center space-y-1">
          <h3 className="font-bold text-base text-white">
            Loading Product
          </h3>
          {productName && (
            <p className="text-xs text-white/60 line-clamp-2">{productName}</p>
          )}
        </div>
      </div>
    </div>
  );
}

