'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ElysiumLogo } from '@/components/icons';

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
  label = 'Loading StoreLink Pro',
  subLabel = 'Setting up your workspace…',
}: PageSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading application"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black"
    >
      {/* Subtle radial gradient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(0, 113, 227, 0.05) 0%, transparent 60%)',
        }}
      />

      {/* Minimal spinner - single rotating ring */}
      <div className="relative flex items-center justify-center">
        {/* Main spinner ring */}
        <svg
          aria-hidden="true"
          className="absolute"
          style={{
            width: 48,
            height: 48,
            animation: 'spin 1s linear infinite',
          }}
          viewBox="0 0 48 48"
          fill="none"
        >
          <circle
            cx="24"
            cy="24"
            r="22"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.1"
          />
          <circle
            cx="24"
            cy="24"
            r="22"
            stroke="url(#gradient)"
            strokeWidth="2"
            strokeDasharray="138 138"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0071e3" stopOpacity="1" />
              <stop offset="100%" stopColor="#0071e3" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>

        {/* Logo centered */}
        <div
          className="relative z-10 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm border border-white/5"
          style={{ width: 40, height: 40 }}
        >
          <ElysiumLogo className="h-5 w-5 text-blue-500" />
        </div>
      </div>

      {/* Text section */}
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-base font-semibold tracking-normal text-white/95">{label}</p>
        <p className="text-xs text-white/60">{subLabel}</p>
      </div>
    </div>
  );
}
