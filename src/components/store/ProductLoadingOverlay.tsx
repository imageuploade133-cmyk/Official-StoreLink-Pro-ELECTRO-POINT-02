'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductLoadingOverlayProps {
  isVisible: boolean;
  productName?: string;
}

export function ProductLoadingOverlay({ isVisible, productName }: ProductLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm transition-opacity duration-300",
      isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4 animate-in fade-in scale-in duration-300">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <div className="text-center space-y-2">
          <h3 className="font-black text-lg text-slate-900 dark:text-white">
            Loading Product
          </h3>
          {productName && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {productName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
