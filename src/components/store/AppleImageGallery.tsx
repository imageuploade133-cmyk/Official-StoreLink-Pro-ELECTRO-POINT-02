'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
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
  onNavigate?: (index: number) => void;
}

function ImageSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative w-full h-full overflow-hidden bg-zinc-900/60">
        <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
        </div>
      </div>
    </div>
  );
}

function ThumbSkeleton() {
  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden bg-zinc-800">
      <div className="h-full w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12" />
    </div>
  );
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
  onNavigate,
}: AppleImageGalleryProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [loadedImage, setLoadedImage] = useState(false);
  const [loadedThumbs, setLoadedThumbs] = useState<Set<number>>(new Set([activeIndex]));
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mountAnim, setMountAnim] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prevActiveIndexRef = useRef(activeIndex);

  // Reset zoom and loading state when active image changes
  useEffect(() => {
    if (isOpen && prevActiveIndexRef.current !== activeIndex) {
      prevActiveIndexRef.current = activeIndex;
      requestAnimationFrame(() => {
        setIsZoomed(false);
        setLoadedImage(false);
        setImageLoadError(false);
        setLoadedThumbs(prev => new Set(prev).add(activeIndex));
      });
    }
  }, [activeIndex, isOpen]);

  // Mount/unmount animation - uses rAF to avoid synchronous setState in effects
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setMountAnim(true));
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    } else {
      requestAnimationFrame(() => {
        setMountAnim(false);
        setIsZoomed(false);
      });
    }
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen]);

  // Preload adjacent images
  useEffect(() => {
    if (!isOpen) return;
    const indices = [activeIndex - 2, activeIndex - 1, activeIndex, activeIndex + 1, activeIndex + 2];
    indices.forEach(idx => {
      if (idx >= 0 && idx < images.length && !loadedThumbs.has(idx)) {
        const img = new window.Image();
        img.src = images[idx];
        img.onload = () => setLoadedThumbs(prev => new Set(prev).add(idx));
        img.onerror = () => setLoadedThumbs(prev => new Set(prev).add(idx));
      }
    });
  }, [activeIndex, images, isOpen, loadedThumbs]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!isOpen || !thumbnailContainerRef.current) return;
    const container = thumbnailContainerRef.current;
    const activeThumb = container.children[activeIndex] as HTMLElement;
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeIndex, isOpen]);

  // Keyboard navigation
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
          e.preventDefault();
          if (!isZoomed) onPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (!isZoomed) onNext();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isZoomed, onClose, onNext, onPrev]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  }, [isZoomed]);

  const handleImageClick = useCallback(() => {
    setIsZoomed(prev => !prev);
  }, []);

  const handleThumbnailClick = useCallback((index: number) => {
    if (isTransitioning || index === activeIndex) return;
    setIsTransitioning(true);
    if (onNavigate) {
      onNavigate(index);
    } else {
      if (index > activeIndex) {
        for (let i = activeIndex; i < index; i++) onNext();
      } else {
        for (let i = activeIndex; i > index; i--) onPrev();
      }
    }
    setTimeout(() => setIsTransitioning(false), 300);
  }, [activeIndex, isTransitioning, onNavigate, onNext, onPrev]);

  // Touch swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isZoomed) return;
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, [isZoomed]);

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

  const hasMultipleImages = images.length > 1;
  const thumbnailList = useMemo(() => images, [images]);

  if (!isOpen) return null;

  const currentImage = images[activeIndex];

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col md:flex-row",
        "transition-all duration-500 ease-out",
        mountAnim ? "opacity-100" : "opacity-0"
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={`Image gallery for ${productName}`}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/95 backdrop-blur-2xl",
          "transition-opacity duration-500 ease-out",
          mountAnim ? "opacity-100" : "opacity-0"
        )}
        onClick={() => !isZoomed && onClose()}
        aria-hidden="true"
      />

      {/* Close button - fixed top-right */}
      <button
        ref={closeButtonRef}
        onClick={onClose}
        className={cn(
          "fixed z-50 top-4 right-4 md:top-6 md:right-6",
          "h-12 w-12 md:h-14 md:w-14 rounded-full",
          "bg-white/10 backdrop-blur-xl border border-white/20",
          "flex items-center justify-center",
          "transition-all duration-300 ease-out",
          "hover:bg-white/20 hover:scale-110 active:scale-95",
          "shadow-2xl shadow-black/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
          mountAnim ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        )}
        aria-label="Close gallery"
      >
        <X className="h-6 w-6 md:h-7 md:w-7 text-white" />
      </button>

      {/* Main content area */}
      <div className="relative flex-1 flex flex-col items-center justify-center min-h-0 px-4 md:px-0">
        {/* Counter badge */}
        {hasMultipleImages && (
          <div
            className={cn(
              "absolute top-4 left-4 md:top-6 md:left-6 z-40",
              "px-4 py-2 rounded-full",
              "bg-white/10 backdrop-blur-xl border border-white/10",
              "transition-all duration-500 delay-150 ease-out",
              mountAnim ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            )}
          >
            <span className="text-sm font-medium tracking-wider text-white/90 tabular-nums">
              {String(activeIndex + 1).padStart(2, '0')} <span className="text-white/30 mx-1">/</span> {String(images.length).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Zoom indicator */}
        {isZoomed && (
          <div
            className={cn(
              "absolute top-4 right-20 md:top-6 md:right-24 z-40",
              "px-3 py-1.5 rounded-full",
              "bg-primary/20 backdrop-blur-xl border border-primary/30",
              "flex items-center gap-2",
              "animate-in fade-in zoom-in duration-300"
            )}
          >
            <ZoomOut className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-medium text-white">Zoomed In</span>
          </div>
        )}

        {/* Image container */}
        <div
          ref={imageContainerRef}
          className={cn(
            "relative w-full h-full flex items-center justify-center",
            "transition-all duration-700 ease-out",
            "max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw]",
            hasMultipleImages && "md:max-w-[75vw] lg:max-w-[65vw]",
            "max-h-[55vh] md:max-h-[75vh]"
          )}
        >
          {/* Loading skeleton */}
          {!loadedImage && !imageLoadError && <ImageSkeleton />}

          {/* Image load error */}
          {imageLoadError && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
              <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center">
                <span className="text-2xl">📷</span>
              </div>
              <p className="text-sm text-zinc-500 font-medium">Failed to load image</p>
            </div>
          )}

          {/* Use key=activeIndex to force Image remount on navigation */}
          <Image
            key={`main-img-${activeIndex}`}
            src={currentImage}
            alt={`${alt} ${activeIndex + 1}`}
            fill
            priority
            className={cn(
              "object-contain transition-all duration-500 ease-out select-none",
              loadedImage ? "opacity-100" : "opacity-0",
              imageLoadError && "opacity-0",
              isZoomed && "cursor-zoom-out",
              !isZoomed && "cursor-zoom-in"
            )}
            style={
              isZoomed
                ? {
                    transform: 'scale(2.5)',
                    transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                  }
                : undefined
            }
            unoptimized
            quality={100}
            draggable={false}
            onClick={handleImageClick}
            onMouseMove={handleMouseMove}
            onLoad={() => {
              setLoadedImage(true);
              setImageLoadError(false);
            }}
            onError={() => {
              setImageLoadError(true);
              setLoadedImage(true);
            }}
            sizes="(max-width: 768px) 100vw, 70vw"
          />

          {/* Zoom hint */}
          {!isZoomed && loadedImage && (
            <div
              className={cn(
                "absolute bottom-4 right-4 z-30",
                "px-3 py-1.5 rounded-full",
                "bg-black/40 backdrop-blur-md border border-white/10",
                "flex items-center gap-2 pointer-events-none",
                "transition-all duration-300",
                mountAnim ? "opacity-100" : "opacity-0"
              )}
            >
              <ZoomIn className="h-3.5 w-3.5 text-white/60" />
              <span className="text-[11px] text-white/60 font-medium hidden sm:inline">
                Click to zoom
              </span>
              <span className="text-[11px] text-white/60 font-medium sm:hidden">
                Tap to zoom
              </span>
            </div>
          )}
        </div>

        {/* Navigation arrows - Desktop */}
        {hasMultipleImages && !isZoomed && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              disabled={activeIndex === 0}
              className={cn(
                "hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-40",
                "h-14 w-14 rounded-full items-center justify-center",
                "bg-white/10 backdrop-blur-xl border border-white/20",
                "shadow-2xl shadow-black/30",
                "transition-all duration-300 ease-out",
                "hover:bg-white/20 hover:scale-110 active:scale-95",
                "disabled:opacity-0 disabled:cursor-default disabled:scale-90",
                "group",
                mountAnim ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              )}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-7 w-7 text-white transition-transform duration-300 group-hover:-translate-x-0.5" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              disabled={activeIndex === images.length - 1}
              className={cn(
                "hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-40",
                "h-14 w-14 rounded-full items-center justify-center",
                "bg-white/10 backdrop-blur-xl border border-white/20",
                "shadow-2xl shadow-black/30",
                "transition-all duration-300 ease-out",
                "hover:bg-white/20 hover:scale-110 active:scale-95",
                "disabled:opacity-0 disabled:cursor-default disabled:scale-90",
                "group",
                mountAnim ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
              )}
              aria-label="Next image"
            >
              <ChevronRight className="h-7 w-7 text-white transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
          </>
        )}

        {/* Mobile touch navigation areas */}
        {hasMultipleImages && !isZoomed && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              disabled={activeIndex === 0}
              className="md:hidden absolute left-0 top-0 bottom-0 w-1/3 z-40"
              aria-label="Previous image"
            />
            <button
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              disabled={activeIndex === images.length - 1}
              className="md:hidden absolute right-0 top-0 bottom-0 w-1/3 z-40"
              aria-label="Next image"
            />
          </>
        )}

        {/* Mobile action bar */}
        <div
          className={cn(
            "md:hidden flex items-center justify-center gap-4 z-40 mt-4",
            "transition-all duration-500 delay-200 ease-out",
            mountAnim ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <button
            onClick={onPrev}
            disabled={activeIndex === 0}
            className={cn(
              "h-12 w-12 rounded-full",
              "bg-white/10 backdrop-blur-xl border border-white/20",
              "flex items-center justify-center",
              "transition-all active:scale-90",
              "disabled:opacity-20"
            )}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>

          <div
            className={cn(
              "h-12 px-4 rounded-full flex items-center gap-2",
              "bg-white/10 backdrop-blur-xl border border-white/20"
            )}
          >
            <ZoomIn className="h-5 w-5 text-white/70" />
            <button
              onClick={handleImageClick}
              className="text-sm font-medium text-white/70 active:text-white transition-colors"
            >
              {isZoomed ? 'Reset' : 'Zoom'}
            </button>
          </div>

          <button
            onClick={onNext}
            disabled={activeIndex === images.length - 1}
            className={cn(
              "h-12 w-12 rounded-full",
              "bg-white/10 backdrop-blur-xl border border-white/20",
              "flex items-center justify-center",
              "transition-all active:scale-90",
              "disabled:opacity-20"
            )}
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>

      {/* Thumbnails Panel */}
      {hasMultipleImages && (
        <div
          className={cn(
            "relative z-40 flex-shrink-0",
            "border-t md:border-t-0 md:border-l border-white/10",
            "bg-black/60 backdrop-blur-2xl",
            "transition-all duration-500 delay-200 ease-out",
            mountAnim ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 md:translate-y-0 md:translate-x-8"
          )}
        >
          {/* Thumbnail Header */}
          <div className="hidden md:flex items-center justify-between px-5 py-3 border-b border-white/10">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-white/40">
              Gallery
            </h3>
            <span className="text-[11px] text-white/30 font-medium tabular-nums">
              {activeIndex + 1}/{images.length}
            </span>
          </div>

          {/* Thumbnails container */}
          <div className="relative">
            {/* Scroll gradient left */}
            {activeIndex > 0 && (
              <div className="hidden md:block absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none bg-gradient-to-r from-black/60 to-transparent" />
            )}

            <div
              ref={thumbnailContainerRef}
              className="flex gap-2 p-4 overflow-x-auto overflow-y-hidden scrollbar-hide md:flex-col md:overflow-y-auto md:overflow-x-hidden md:gap-2 md:p-3 items-center md:h-[calc(100vh-4rem)] scroll-smooth"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {thumbnailList.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => handleThumbnailClick(idx)}
                  className={cn(
                    "relative flex-shrink-0 group",
                    "w-16 h-16 md:w-[72px] md:h-[72px]",
                    "rounded-xl overflow-hidden",
                    "transition-all duration-300 ease-out",
                    "hover:scale-105 active:scale-95",
                    idx === activeIndex
                      ? "ring-2 ring-white/80 ring-offset-2 ring-offset-black/40 scale-105 shadow-xl shadow-black/40"
                      : "opacity-50 hover:opacity-100 ring-0"
                  )}
                  aria-label={`View image ${idx + 1}`}
                  aria-current={idx === activeIndex ? 'true' : undefined}
                >
                  {/* Loading state for thumbnail */}
                  {!loadedThumbs.has(idx) && <ThumbSkeleton />}

                  <Image
                    key={`thumb-${idx}`}
                    src={img}
                    alt={`${productName} thumbnail ${idx + 1}`}
                    fill
                    className={cn(
                      "object-cover transition-all duration-300",
                      loadedThumbs.has(idx) ? "opacity-100" : "opacity-0"
                    )}
                    unoptimized
                    sizes="80px"
                    draggable={false}
                    onLoad={() => setLoadedThumbs(prev => new Set(prev).add(idx))}
                    onError={() => setLoadedThumbs(prev => new Set(prev).add(idx))}
                  />

                  {/* Active indicator */}
                  {idx === activeIndex && (
                    <div className="absolute inset-0 bg-white/5 ring-1 ring-inset ring-white/20" />
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                </button>
              ))}
            </div>

            {/* Scroll gradient for bottom (mobile) / right (desktop) */}
            {activeIndex < images.length - 1 && (
              <div className="absolute pointer-events-none z-10 bottom-0 left-0 right-0 h-12 md:hidden bg-gradient-to-t from-black/60 to-transparent" />
            )}

            {/* Progress dots - Mobile only */}
            <div className="md:hidden flex items-center justify-center gap-1.5 pb-3 pt-1">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handleThumbnailClick(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    idx === activeIndex
                      ? "w-6 bg-white/80"
                      : "w-1.5 bg-white/30 hover:bg-white/50"
                  )}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}