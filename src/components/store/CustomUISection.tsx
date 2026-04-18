
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HomepageSection } from '@/lib/types';
import { useSettings } from '@/contexts/settings-context';

interface CustomUISectionProps {
  section: HomepageSection;
}

export function CustomUISection({ section }: CustomUISectionProps) {
  const { settings } = useSettings();
  if (!section.published) return null;

  const isHTML = section.uiType === 'html';
  const isVideo = section.uiType === 'video';
  const isCenter = section.alignment === 'center';

  return (
    <section 
        className={cn(
            "relative overflow-hidden py-12 md:py-24",
            section.fullWidth ? "w-full" : "max-w-site-container mx-auto px-4 sm:px-6 lg:px-8"
        )}
        style={{ backgroundColor: section.backgroundColor || 'transparent' }}
    >
      {isHTML ? (
        <div 
            className="w-full"
            dangerouslySetInnerHTML={{ __html: section.htmlContent || '' }}
        />
      ) : (
        <div className="relative group overflow-hidden rounded-[3rem] shadow-2xl">
            {isVideo ? (
                <div className="relative aspect-video md:aspect-[21/9] w-full overflow-hidden">
                    <video
                        src={section.videoUrl}
                        poster={section.videoPosterUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] transition-opacity group-hover:opacity-40" />
                </div>
            ) : section.imageUrl && (
                <div className="relative aspect-video md:aspect-[21/9] w-full overflow-hidden">
                    <Image 
                        src={section.imageUrl} 
                        alt={section.title} 
                        fill 
                        className={cn(
                            "object-cover transition-transform duration-700",
                            settings?.enableHoverZoom !== false && "group-hover:scale-110"
                        )} 
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] transition-opacity group-hover:opacity-40" />
                </div>
            )}

            <div className={cn(
                "absolute inset-0 z-10 flex items-center p-8 md:p-20",
                isCenter ? "justify-center text-center" : "justify-start text-left"
            )}>
                <div className="max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    {section.overlayTitle && (
                        <h2 className="text-3xl md:text-7xl font-black text-white leading-none tracking-tighter uppercase whitespace-pre-line">
                            {section.overlayTitle}
                        </h2>
                    )}
                    {section.overlaySubtitle && (
                        <p className="text-lg md:text-2xl text-white/90 font-medium leading-relaxed max-w-xl mx-auto">
                            {section.overlaySubtitle}
                        </p>
                    )}
                    {(section.buttonText && section.linkUrl) && (
                        <div className="pt-4">
                            <Button asChild size="lg" className="rounded-full h-14 md:h-16 px-10 md:px-14 font-black uppercase text-xs tracking-[0.25em] shadow-2xl shadow-primary/30 group/btn transition-all active:scale-95">
                                <Link href={section.linkUrl}>
                                    {section.buttonText}
                                    <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover/btn:translate-x-2" strokeWidth={3} />
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </section>
  );
}
