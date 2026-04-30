"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  className?: string;
  onImageClick?: (index: number) => void;
}

export function ProductImageGallery({
  images,
  productName,
  className,
  onImageClick,
}: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const goToSlide = useCallback((index: number) => {
    setDirection(index > activeIndex ? "right" : "left");
    setActiveIndex(index);
    if (onImageClick) onImageClick(index);
  }, [activeIndex, onImageClick]);

  const goNext = useCallback(() => {
    if (activeIndex < images.length - 1) {
      setDirection("right");
      setActiveIndex((prev) => prev + 1);
    }
  }, [activeIndex, images.length]);

  const goPrev = useCallback(() => {
    if (activeIndex > 0) {
      setDirection("left");
      setActiveIndex((prev) => prev - 1);
    }
  }, [activeIndex]);

  if (images.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative aspect-square bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-2xl md:rounded-3xl lg:rounded-[2.5rem] overflow-hidden group/main">
        <Image
          src={images[activeIndex]}
          alt={`${productName} - Image ${activeIndex + 1}`}
          fill
          className={cn(
            "object-cover transition-all duration-500 ease-in-out",
            "transform",
            direction === "right" && "animate-slide-left",
            direction === "left" && "animate-slide-right"
          )}
          priority={activeIndex === 0}
          unoptimized
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              disabled={activeIndex === 0}
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full",
                "bg-white/80 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10",
                "flex items-center justify-center",
                "opacity-0 group-hover/main:opacity-100 transition-all duration-300",
                "hover:scale-110 active:scale-95",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                activeIndex === 0 && "md:opacity-0"
              )}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            <button
              onClick={goNext}
              disabled={activeIndex === images.length - 1}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 rounded-full",
                "bg-white/80 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10",
                "flex items-center justify-center",
                "opacity-0 group-hover/main:opacity-100 transition-all duration-300",
                "hover:scale-110 active:scale-95",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                activeIndex === images.length - 1 && "md:opacity-0"
              )}
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-1.5 rounded-full flex items-center gap-2 pointer-events-none">
              <span className="text-xs font-medium">
                {activeIndex + 1} / {images.length}
              </span>
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((url, index) => (
            <button
              key={`${url}-${index}`}
              onClick={() => goToSlide(index)}
              className={cn(
                "relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-lg md:rounded-2xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 active:scale-95",
                activeIndex === index
                  ? "border-primary shadow-lg ring-2 ring-primary/20 scale-110"
                  : "border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100"
              )}
            >
              <Image
                src={url}
                alt={`Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
