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

      {/* Spinner with centered logo */}
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
        {/* Main spinner ring - rotates around logo */}
        <svg
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            animation: 'spin 2s linear infinite',
          }}
          viewBox="0 0 120 120"
          fill="none"
        >
          <circle
            cx="60"
            cy="60"
            r="55"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.1"
          />
          <circle
            cx="60"
            cy="60"
            r="55"
            stroke="url(#gradient)"
            strokeWidth="2.5"
            strokeDasharray="172.7 172.7"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0071e3" stopOpacity="1" />
              <stop offset="100%" stopColor="#0071e3" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>

        {/* Logo perfectly centered inside spinner */}
        <div
          className="absolute flex items-center justify-center rounded-xl bg-black/30 backdrop-blur-md border border-white/10"
          style={{ width: 56, height: 56 }}
        >
          <ElysiumLogo className="h-7 w-7 text-blue-500" />
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
