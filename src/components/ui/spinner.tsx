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
  label = 'Loading...',
  subLabel,
}: PageSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-background/60 dark:bg-black/60 backdrop-blur-md transition-all duration-300 animate-in fade-in-0"
    >
      {/* Subtle radial glow overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0, 113, 227, 0.12) 0%, transparent 70%)',
        }}
      />

      {/* Spinner with centered logo */}
      <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
        {/* Animated gradient spinning ring around logo */}
        <svg
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            animation: 'spin 1.5s linear infinite',
          }}
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="currentColor"
            strokeWidth="3"
            className="text-primary/15"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="url(#page-spinner-gradient)"
            strokeWidth="3"
            strokeDasharray="138.2 138.2"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="page-spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
            </linearGradient>
          </defs>
        </svg>

        {/* Project Logo centered inside ring */}
        <div className="absolute flex items-center justify-center p-3 rounded-2xl bg-background/80 dark:bg-black/80 shadow-lg border border-primary/20 backdrop-blur-sm animate-pulse">
          <StoreLinkLogo className="h-9 w-9 text-primary" />
        </div>
      </div>

      {/* Text Feedback */}
      <div className="flex flex-col items-center gap-1 text-center max-w-xs px-4">
        <p className="text-sm font-bold tracking-tight text-foreground">{label}</p>
        {subLabel && <p className="text-xs font-medium text-muted-foreground">{subLabel}</p>}
      </div>
    </div>
  );
}
