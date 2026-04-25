'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ImageIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  className?: string;
  containerClassName?: string;
  unoptimized?: boolean;
  priority?: boolean;
  sizes?: string;
  showBadge?: boolean;
  minimal?: boolean;
}

export function ProductImage({
  src,
  alt,
  fill = true,
  className,
  containerClassName,
  unoptimized = true,
  priority = false,
  sizes,
  showBadge = false,
  minimal = false,
}: ProductImageProps) {
  const [error, setError] = useState(false);

  const hasImage = src && src.trim() !== '' && !error;

  if (hasImage) {
    return (
      <div className={cn("relative w-full h-full overflow-hidden", containerClassName)}>
        <Image
          src={src as string}
          alt={alt}
          fill={fill}
          className={cn("object-cover", className)}
          unoptimized={unoptimized}
          priority={priority}
          sizes={sizes}
          onError={() => setError(true)}
        />
      </div>
    );
  }

  if (minimal) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-slate-100 dark:bg-slate-800 w-full h-full relative",
        fill ? "absolute inset-0" : "relative aspect-square",
        containerClassName
      )}>
        <ImageIcon className="w-1/2 h-1/2 opacity-20 text-slate-400" />
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 w-full h-full p-4 text-center relative group overflow-hidden",
      fill ? "absolute inset-0" : "relative aspect-square",
      containerClassName
    )}>
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center justify-center gap-3 transition-transform duration-500 group-hover:scale-110">
        <div className="relative">
          <div className="p-4 rounded-3xl bg-white/50 dark:bg-black/20 backdrop-blur-sm shadow-sm ring-1 ring-black/5 dark:ring-white/5">
            <ImageIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="absolute -top-1 -right-1 p-1.5 rounded-full bg-primary text-white shadow-lg animate-pulse">
            <Sparkles className="w-3 h-3" />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 leading-none">
            GENERATED
          </p>
          <p className="text-[12px] font-black uppercase tracking-[0.3em] text-primary leading-none">
            VARIANTS
          </p>
        </div>
        
        <p className="text-[8px] font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 max-w-[80%] line-clamp-1 opacity-60">
          {alt}
        </p>
      </div>

      {showBadge && (
        <div className="absolute bottom-3 left-3">
          <div className="px-2 py-1 rounded-full bg-black/10 dark:bg-white/10 backdrop-blur-md border border-white/20 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
            AI Placeholder
          </div>
        </div>
      )}
    </div>
  );
}
