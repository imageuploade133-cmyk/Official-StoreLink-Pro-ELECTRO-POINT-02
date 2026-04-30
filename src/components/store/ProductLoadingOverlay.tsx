'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ProductLoadingOverlayProps {
  isVisible: boolean;
  productName?: string;
  productImage?: string;
}

export function ProductLoadingOverlay({ isVisible, productName, productImage }: ProductLoadingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setProgress(0);
      setShowContent(false);
      
      // Staggered content reveal
      const contentTimer = setTimeout(() => setShowContent(true), 100);
      
      // Simulate progress with Apple-style easing
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          // Ease-out progress - fast at first, slow at end
          const remaining = 100 - prev;
          const increment = remaining * 0.08 + Math.random() * 2;
          return Math.min(prev + increment, 100);
        });
      }, 50);
      
      return () => {
        clearTimeout(contentTimer);
        clearInterval(progressInterval);
      };
    } else {
      setProgress(0);
      setShowContent(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      {/* Backdrop blur overlay */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-500",
          isVisible ? "opacity-100" : "opacity-0"
        )}
      />
      
      {/* Ambient glow effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-full blur-3xl animate-pulse" />
      </div>
      
      {/* Loading card */}
      <div 
        className={cn(
          "relative flex flex-col items-center gap-6 transition-all duration-500 ease-out",
          showContent 
            ? "opacity-100 translate-y-0 scale-100" 
            : "opacity-0 translate-y-8 scale-95"
        )}
      >
        {/* Product image preview with blur */}
        {productImage && (
          <div className="relative w-40 h-40 rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/20">
            <Image 
              src={productImage} 
              alt="" 
              fill 
              className="object-cover blur-sm scale-110"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        
        {/* Apple-style activity indicator */}
        <div className="relative flex flex-col items-center gap-4">
          {/* Multi-layer Apple activity indicator */}
          <div className="relative">
            {/* Outer ring */}
            <div className="absolute -inset-6 rounded-full border border-primary/20 animate-pulse" />
            
            {/* Inner activity indicator */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[3px] border-primary/20" />
              <div 
                className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary animate-spin"
                style={{ 
                  animationDuration: '1.2s',
                  animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }} 
              />
              <div 
                className="absolute inset-[6px] rounded-full border-[2px] border-transparent border-t-primary/50 animate-spin"
                style={{ 
                  animationDuration: '0.8s',
                  animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  animationDirection: 'reverse'
                }} 
              />
            </div>
          </div>
          
          {/* Progress bar - Apple style pill */}
          <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Text content */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h3 className="text-white/90 font-semibold text-lg tracking-tight">
            {productName ? (
              <span className="line-clamp-1">{productName}</span>
            ) : (
              'Loading Product'
            )}
          </h3>
          <p className="text-white/50 text-sm font-medium">
            Preparing your experience...
          </p>
        </div>
        
        {/* Floating dots animation */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/30 animate-bounce"
              style={{ 
                animationDelay: `${i * 0.15}s`,
                animationDuration: '0.6s'
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Corner decorations */}
      <div className="absolute top-20 left-20 w-32 h-32 border border-white/10 rounded-full opacity-20" />
      <div className="absolute bottom-20 right-20 w-48 h-48 border border-white/10 rounded-full opacity-10" />
      <div className="absolute top-40 right-40 w-4 h-4 bg-white/5 rounded-full" />
      <div className="absolute bottom-40 left-40 w-3 h-3 bg-white/5 rounded-full" />
    </div>
  );
}
