'use client';

import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromoCountdownProps {
  endDate: Date;
  className?: string;
}

export function PromoCountdown({ endDate, className }: PromoCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
    days: string;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();
      
      if (difference <= 0) {
        return null;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      return {
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      };
    };

    // Initial calculation after mount to avoid hydration mismatch
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const nextTime = calculateTimeLeft();
      setTimeLeft(nextTime);
      
      if (!nextTime) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  if (!timeLeft) return null;

  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-1 duration-500 mb-4",
      className
    )}>
      <div className="flex items-center gap-2 text font-black uppercase tracking text-primary whitespace-nowrap">
        <Timer className="h-3.5 w-3.5 animate-pulse" />
        Time Left:
      </div>
      <div className="flex items-center gap-1.5 font-mono text-lg font-black tracking-tight text-slate-900 dark:text-white">
        {parseInt(timeLeft.days) > 0 && (
          <>
            <span className="tabular-nums">{timeLeft.days}d</span>
            <span className="text-primary/30 mx-0.5">:</span>
          </>
        )}
        <span className="tabular-nums">{timeLeft.hours}h</span>
        <span className="text-primary/30 mx-0.5">:</span>
        <span className="tabular-nums">{timeLeft.minutes}m</span>
        <span className="text-primary/30 mx-0.5">:</span>
        <span className="text-primary tabular-nums">{timeLeft.seconds}s</span>
      </div>
    </div>
  );
}
