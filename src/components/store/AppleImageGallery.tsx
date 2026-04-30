'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppleImageGalleryProps {
  images: string[];
  activeIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  productName?: string;
  alt?: string;
}

export function AppleImageGallery({
  images,
  activeIndex,
  isOpen,
  onClose,
  onNext,
  onPrev,
  productName = 'Product',
  alt = 'Product image',
}: AppleImageGalleryProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([activeIndex]));
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsZoomed(false);
      setShowControls(true);
      setLoadedImages(prev => new Set(prev).add(activeIndex));
    }
  }, [isOpen, activeIndex]);

  // Preload adjacent images
  useEffect(() => {
    const preloadIndices = [activeIndex - 1, activeIndex + 1];
    preloadIndices.forEach(idx => {
      if (idx >= 0 && idx < images.length && !loadedImages.has(idx)) {
        setLoadedImages(prev => new Set(prev).add(idx));
      }
    });
  }, [activeIndex, images.length, loadedImages]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (isZoomed) {
            setIsZoomed(false);
          } else {
            onClose();
          }
          break;
        case 'ArrowLeft':
          if (!isZoomed) onPrev();
          break;
        case 'ArrowRight':
          if (!isZoomed) onNext();
          break;
        case ' ':
          e.preventDefault();
          if (isZoomed) {
            setIsZoomed(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isZoomed, onClose, onNext, onPrev]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (isOpen && !isZoomed) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [isOpen, isZoomed]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !imageContainerRef.current) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  }, [isZoomed]);

  const handleImageClick = useCallback(() => {
    if (!isZoomed) {
      setIsZoomed(true);
      setShowControls(true);
    } else {
      setIsZoomed(false);
    }
    setShowControls(true);
  }, [isZoomed]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart || e.changedTouches.length === 0) return;
    
    const deltaX = e.changedTouches[0].clientX - touchStart.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.y;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        onPrev();
      } else {
        onNext();
      }
    }
    
    setTouchStart(null);
  }, [touchStart, onPrev, onNext]);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(images[activeIndex]);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${productName.replace(/\s+/g, '-')}-${activeIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [images, activeIndex, productName]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: `View ${productName} image ${activeIndex + 1} of ${images.length}`,
          url: images[activeIndex],
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(images[activeIndex]);
    }
  }, [images, activeIndex, productName]);

  if (!isOpen) return null;

  const currentImage = images[activeIndex];
  const hasMultipleImages = images.length > 1;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/98 backdrop-blur-xl animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isZoomed) {
          onClose();
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header Controls */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-50 px-4 py-4 flex items-center justify-between transition-all duration-300",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        )}
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-3 text-white">
          <span className="text-sm font-medium opacity-90">
            {activeIndex + 1} of {images.length}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all hover:bg-white/20 active:scale-95"
            aria-label="Share image"
          >
            <Share2 className="h-5 w-5 text-white" />
          </button>
          
          <button
            onClick={handleDownload}
            className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all hover:bg-white/20 active:scale-95"
            aria-label="Download image"
          >
            <Download className="h-5 w-5 text-white" />
          </button>
          
          <button
            onClick={onClose}
            className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all hover:bg-white/20 active:scale-95"
            aria-label="Close gallery"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div
        className={cn(
          "absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 transition-all duration-300",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '9999px',
          padding: '8px 16px',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-95",
            isZoomed ? "bg-white/30" : "hover:bg-white/10"
          )}
          aria-label={isZoomed ? "Zoom out" : "Zoom in"}
        >
          {isZoomed ? (
            <ZoomOut className="h-5 w-5 text-white" />
          ) : (
            <ZoomIn className="h-5 w-5 text-white" />
          )}
        </button>
        
        <div className="w-px h-6 bg-white/30 mx-1" />
        
        <button
          onClick={() => setIsZoomed(false)}
          disabled={!isZoomed}
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-95",
            !isZoomed && "opacity-40 cursor-not-allowed"
          )}
          aria-label="Reset zoom"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white">
            <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.3" />
          </svg>
        </button>
      </div>

      {/* Navigation Arrows - Desktop */}
      {hasMultipleImages && !isZoomed && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            disabled={activeIndex === 0}
            className={cn(
              "hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full items-center justify-center transition-all duration-300 z-50",
              showControls ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none",
              "bg-white/10 backdrop-blur-xl border border-white/20",
              "hover:bg-white/20 active:scale-95",
              "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-7 w-7 text-white" />
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            disabled={activeIndex === images.length - 1}
            className={cn(
              "hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full items-center justify-center transition-all duration-300 z-50",
              showControls ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none",
              "bg-white/10 backdrop-blur-xl border border-white/20",
              "hover:bg-white/20 active:scale-95",
              "disabled:opacity-30 disabled:cursor-not-allowed"
            )}
            aria-label="Next image"
          >
            <ChevronRight className="h-7 w-7 text-white" />
          </button>
        </>
      )}

      {/* Main Image Container */}
      <div
        ref={imageContainerRef}
        className={cn(
          "absolute inset-0 flex items-center justify-center cursor-zoom-in",
          isZoomed && "cursor-zoom-out"
        )}
        onClick={handleImageClick}
        onMouseMove={handleMouseMove}
      >
        {/* Loading Indicator */}
        {!loadedImages.has(activeIndex) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 rounded-full border-3 border-white/20 border-t-white animate-spin" />
          </div>
        )}

        <Image
          src={currentImage}
          alt={`${alt} ${activeIndex + 1}`}
          fill
          priority
          className={cn(
            "object-contain transition-all duration-300 ease-out",
            isZoomed ? "scale-150" : "scale-100",
            isZoomed && "origin-center",
            !loadedImages.has(activeIndex) && "opacity-0",
            loadedImages.has(activeIndex) && "opacity-100"
          )}
          style={
            isZoomed
              ? {
                  transform: 'scale(2)',
                  transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                }
              : undefined
          }
          unoptimized
          quality={100}
          draggable={false}
        />

        {/* Zoom indicator */}
        {showControls && !isZoomed && (
          <div
            className={cn(
              "absolute bottom-4 right-4 md:bottom-8 md:right-8 flex items-center gap-2 text-white/60 transition-all duration-300",
              showControls ? "opacity-100" : "opacity-0"
            )}
            style={{
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(10px)',
              borderRadius: '9999px',
              padding: '6px 12px',
            }}
          >
            <ZoomIn className="h-4 w-4" />
            <span className="text-xs font-medium">Tap to zoom</span>
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {hasMultipleImages && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-50 transition-all duration-300",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
          )}
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
            padding: '40px 16px 24px',
          }}
        >
          <div className="flex items-center justify-center gap-2 max-w-2xl mx-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  if (idx !== activeIndex) {
                    setIsZoomed(false);
                    if (idx > activeIndex) {
                      onNext();
                    } else {
                      onPrev();
                    }
                  }
                }}
                className={cn(
                  "relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden transition-all duration-200",
                  activeIndex === idx
                    ? "ring-2 ring-white scale-105 shadow-lg"
                    : "opacity-50 hover:opacity-80 active:scale-95"
                )}
              >
                <Image
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
          
          {/* Progress Dots - Mobile */}
          <div className="flex items-center justify-center gap-1.5 mt-4 md:hidden">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  activeIndex === idx ? "w-6 bg-white" : "w-1.5 bg-white/40"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tap areas for mobile navigation */}
      {hasMultipleImages && !isZoomed && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            disabled={activeImageIndex === 0}
            className={cn(
              "md:hidden absolute left-0 top-0 bottom-0 w-1/3 z-40"
            )}
            aria-label="Previous image"
          />
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            disabled={activeImageIndex === images.length - 1}
            className={cn(
              "md:hidden absolute right-0 top-0 bottom-0 w-1/3 z-40"
            )}
            aria-label="Next image"
          />
        </>
      )}
    </div>
  );
}