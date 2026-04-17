'use client';

import React from 'react';
import { 
  Video, 
  Youtube, 
  Facebook, 
  Smartphone,
  Play,
  Maximize2
} from 'lucide-react';
import type { ProductVideo } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductVideoGalleryProps {
  videos: ProductVideo[];
  title?: string;
  description?: string;
}

/**
 * Robustly converts various social media URLs into their authorized embed formats.
 * Now supports raw iframe embed codes by extracting the src attribute.
 */
function getEmbedUrl(video: ProductVideo): string {
  const { type, url } = video;
  let processedUrl = url.trim();
  
  // Detect if the user pasted a raw HTML iframe tag and extract the src
  if (processedUrl.includes('<iframe') && processedUrl.includes('src=')) {
    const srcMatch = processedUrl.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      processedUrl = srcMatch[1];
    }
  }

  // Normalize protocol-relative URLs
  if (processedUrl.startsWith('//')) {
    processedUrl = 'https:' + processedUrl;
  }
  
  if (type === 'youtube') {
    // Regex covers: watch?v=, youtu.be/, embed/, v/, and mobile variants
    const match = processedUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match ? `https://www.youtube.com/embed/${match[1]}` : processedUrl;
  }
  
  if (type === 'facebook') {
    // Facebook requires full URL encoding for its plugin player
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(processedUrl)}&show_text=0&width=560`;
  }
  
  if (type === 'tiktok') {
    // Extract video ID for TikTok embed v2
    const match = processedUrl.match(/\/video\/(\d+)/);
    return match ? `https://www.tiktok.com/embed/v2/${match[1]}` : processedUrl;
  }
  
  return processedUrl;
}

export function ProductVideoGallery({ videos, title, description }: ProductVideoGalleryProps) {
  if (!videos || videos.length === 0) return null;

  return (
    <section className="mt-24 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Video className="h-6 w-6" />
            </div>
            <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                    {title || 'Multimedia Showcase'}
                </h2>
                <p className="text font-black uppercase tracking text-slate-400 mt-1">
                    {description || 'Cinematic product insights & social proof'}
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:gap-12 w-full">
        {videos.map((video, idx) => {
          const isVertical = video.type === 'tiktok';
          const embedUrl = getEmbedUrl(video);

          return (
            <div 
              key={video.id || idx} 
              className={cn(
                "group relative flex flex-col bg-white dark:bg-slate-900 rounded border-2 border-slate-100 dark:border-slate-800 overflow-hidden  transition-all duration-500 hover:border-primary/30 w-full",
              )}
            >
              {video.title && (
                <div className="px-8 py-5 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                    <span className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white truncate pr-4">
                        {video.title}
                    </span>
                    <div className="flex items-center gap-2">
                        {video.type === 'youtube' && <Youtube className="h-4 w-4 text-red-600" />}
                        {video.type === 'facebook' && <Facebook className="h-4 w-4 text-blue-600" />}
                        {video.type === 'tiktok' && <Smartphone className="h-4 w-4 text-purple-600" />}
                        {video.type === 'direct' && <Video className="h-4 w-4 text-primary" />}
                    </div>
                </div>
              )}

              <div className={cn(
                "relative w-full overflow-hidden bg-black",
                isVertical ? "aspect" : "aspect-video"
              )}>
                {video.type === 'direct' ? (
                  <video 
                    src={video.url} 
                    controls 
                    className="w-full h-full object-contain"
                    playsInline
                  />
                ) : (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}