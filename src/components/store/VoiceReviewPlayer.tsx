'use client';

import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceReviewPlayerProps {
  dataUri: string;
}

export function VoiceReviewPlayer({ dataUri }: VoiceReviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!dataUri) return null;

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(dataUri);
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-sky-50 border border-sky-100 max-w-fit animate-in fade-in slide-in-from-left-2 duration-500">
      <Button
        variant="secondary"
        size="icon"
        className="h-8 w-8 rounded-full bg-sky-500 text-white hover:bg-sky-600 shrink-0"
        onClick={togglePlay}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex flex-col pr-4">
        <span className="text-[9px] font-black uppercase text-sky-600 tracking-[0.2em] leading-none">Voice Comment</span>
        <div className="flex items-center gap-1 mt-1">
            <Volume2 className="h-2 w-2 text-sky-400" />
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div 
                        key={i} 
                        className={cn(
                            "w-0.5 rounded-full bg-sky-300/40",
                            i % 2 === 0 ? "h-2" : "h-3",
                            isPlaying && "animate-pulse"
                        )} 
                        style={{ animationDelay: `${i * 0.1}s` }}
                    />
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
