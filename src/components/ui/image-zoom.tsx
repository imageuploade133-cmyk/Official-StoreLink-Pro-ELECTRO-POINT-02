"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ZoomIn } from "lucide-react";

interface ImageZoomProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  zoomLevel?: number;
  lensSize?: number;
}

export function ImageZoom({
  src,
  alt,
  className,
  containerClassName,
  zoomLevel = 2.5,
  lensSize = 150,
}: ImageZoomProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      setPosition({ x, y });
    },
    []
  );

  const handleMouseEnter = () => setIsZoomed(true);
  const handleMouseLeave = () => setIsZoomed(false);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-2xl cursor-zoom-in group",
        containerClassName
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative w-full h-full">
        <Image
          src={src}
          alt={alt}
          fill
          className={cn("object-cover transition-transform duration-300", className)}
          unoptimized
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-200 pointer-events-none",
          "bg-white dark:bg-black",
          isZoomed ? "opacity-0" : "opacity-0"
        )}
      />

      <div
        className={cn(
          "absolute border-2 border-white/50 dark:border-white/50 rounded-xl shadow-2xl pointer-events-none transition-opacity duration-200 bg-no-repeat",
          isZoomed ? "opacity-100" : "opacity-0"
        )}
        style={{
          width: `${lensSize}px`,
          height: `${lensSize}px`,
          left: `calc(${position.x}% - ${lensSize / 2}px)`,
          top: `calc(${position.y}% - ${lensSize / 2}px)`,
          backgroundImage: `url(${src})`,
          backgroundSize: `${zoomLevel * 100}%`,
          backgroundPosition: `${position.x}% ${position.y}%`,
          zIndex: 50,
        }}
      />

      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <ZoomIn className="h-4 w-4" />
        <span className="text-xs font-medium">Hover to zoom</span>
      </div>
    </div>
  );
}
