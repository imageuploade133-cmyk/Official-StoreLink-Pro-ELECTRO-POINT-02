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
  className?: string;
}

export function PageSpinner({
  label = 'StoreLink Pro',
  className,
}: PageSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className={cn(
        'fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3 bg-background/30 backdrop-blur-sm transition-all duration-300 animate-in fade-in-0',
        className
      )}
    >
      {/* Slowly bouncing logo */}
      <div style={{ animation: 'bounce 2s infinite' }}>
        <StoreLinkLogo className="h-14 w-14 text-primary drop-shadow-md" />
      </div>

      {/* Project Name Only */}
      <p className="text-base font-bold tracking-tight text-foreground">
        {label || 'StoreLink Pro'}
      </p>
    </div>
  );
}
