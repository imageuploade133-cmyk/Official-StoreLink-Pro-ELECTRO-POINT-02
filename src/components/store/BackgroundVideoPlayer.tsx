'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Pause, Play } from 'lucide-react';

export function BackgroundVideoPlayer() {
    const { settings } = useSettings();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);

        // Attempt reliable background play
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Background video auto-play blocked:", error);
                setIsPlaying(false);
            });
        }

        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, [settings?.backgroundVideoUrl]);

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play().catch(err => console.log("Manual background play failed:", err));
            } else {
                videoRef.current.pause();
            }
        }
    };

    if (!settings?.backgroundVideoUrl) return null;

    return (
        <>
            <div className="fixed top-0 left-0 w-full h-full -z-20 bg-black">
                <video
                    ref={videoRef}
                    key={settings.backgroundVideoUrl}
                    src={settings.backgroundVideoUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster={settings.backgroundVideoImageUrl || ''}
                    className="absolute top-0 left-0 w-full h-full object-cover opacity-80"
                />
            </div>
            <Button
                variant="outline"
                size="icon"
                onClick={handlePlayPause}
                className="fixed bottom-5 right-5 z-50 rounded-full h-12 w-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/50 transition-all active:scale-95"
            >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                <span className="sr-only">{isPlaying ? 'Pause video' : 'Play video'}</span>
            </Button>
        </>
    );
}
