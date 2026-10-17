'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { StoreLinkLogo } from '@/components/icons';

// ─────────────────────────────────────────────
// Inline / button spinner (replaces small Loader2)
// ─────────────────────────────────────────────
interface SpinnerProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

export function Spinner({ className, size = 'sm' }: SpinnerProps) {
  const sizeMap = {
    xs: 'h-3 w-3 border-[1.5px]',
    sm: 'h-4 w-4 border-2',
    md: 'h-5 w-5 border-2',
  };

  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block rounded-full border-current border-t-transparent animate-spin',
        sizeMap[size],
        className
      )}
    />
  );
}

// ─────────────────────────────────────────────
// Section-level spinner (replaces h-8 to h-10 Loader2)
// ─────────────────────────────────────────────
interface SectionSpinnerProps {
  className?: string;
  label?: string;
}

export function SectionSpinner({ className, label }: SectionSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn('flex flex-col items-center justify-center gap-3 py-10', className)}
    >
      {/* Dual ring */}
      <div className="relative h-10 w-10">
        {/* Outer ring */}
        <span className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        {/* Inner ring — counter spin */}
        <span
          className="absolute inset-[6px] rounded-full border-2 border-primary/10 border-b-primary/60"
          style={{ animation: 'spin 0.8s linear infinite reverse' }}
        />
      </div>
      {label && (
        <p className="text-xs text-muted-foreground animate-pulse">{label}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Full-page / app-level loading screen
// ─────────────────────────────────────────────
interface PageSpinnerProps {
  label?: string;
  subLabel?: string;
}

export function PageSpinner({
  label = 'StoreLink Pro',
  subLabel = 'Loading workspace...',
}: PageSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-black/40 dark:bg-black/60 backdrop-blur-2xl transition-all duration-300 animate-in fade-in-0"
    >
      {/* Dynamic ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Premium Glass Box containing Logo and Multi-ring Spinner */}
      <div className="relative flex flex-col items-center justify-center p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/80 border border-white/40 dark:border-zinc-800 shadow-2xl backdrop-blur-xl">
        <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
          {/* Outer primary spinning ring */}
          <svg
            aria-hidden="true"
            className="absolute inset-0"
            style={{ animation: 'spin 1.8s linear infinite' }}
            viewBox="0 0 110 110"
            fill="none"
          >
            <circle
              cx="55"
              cy="55"
              r="48"
              stroke="currentColor"
              strokeWidth="3.5"
              className="text-primary/10 dark:text-primary/20"
            />
            <circle
              cx="55"
              cy="55"
              r="48"
              stroke="url(#outer-spinner-gradient)"
              strokeWidth="3.5"
              strokeDasharray="150.7 150.7"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="outer-spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0071e3" stopOpacity="1" />
                <stop offset="100%" stopColor="#0071e3" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner counter-rotating ring */}
          <svg
            aria-hidden="true"
            className="absolute inset-3"
            style={{ animation: 'spin 1.2s linear infinite reverse' }}
            viewBox="0 0 86 86"
            fill="none"
          >
            <circle
              cx="43"
              cy="43"
              r="36"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary/10 dark:text-primary/20"
            />
            <circle
              cx="43"
              cy="43"
              r="36"
              stroke="#0071e3"
              strokeWidth="2"
              strokeDasharray="56.5 56.5"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
          </svg>

          {/* Logo center badge with subtle zoom effect */}
          <div className="relative z-10 flex items-center justify-center p-3.5 rounded-2xl bg-white dark:bg-black shadow-md border border-primary/20 dark:border-primary/30 transition-transform duration-300 hover:scale-105">
            <StoreLinkLogo className="h-10 w-10 text-primary drop-shadow-[0_0_12px_rgba(0,113,227,0.4)]" />
          </div>
        </div>

        {/* Labels & Progress indicator */}
        <div className="mt-5 flex flex-col items-center gap-1 text-center">
          <p className="text-base font-extrabold tracking-tight text-foreground">{label}</p>
          {subLabel && (
            <p className="text-xs font-medium text-muted-foreground animate-pulse">
              {subLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
