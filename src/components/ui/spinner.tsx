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
    xs: 'h-3 w-3 border',
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
          className="absolute inset rounded-full border-2 border-primary/10 border-b-primary/60"
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[hsl(222,30%,5%)]"
    >
      {/* Ambient glow — background radial */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 60%, hsl(217 91% 60% / 0.08) 0%, transparent 70%)',
        }}
      />

      {/* Spinner ring assembly */}
      <div className="relative flex items-center justify-center">
        {/* Ring 1 — outermost, slow */}
        <span
          aria-hidden="true"
          className="absolute rounded-full border border-primary/10 border-t-primary/50"
          style={{
            width: 96,
            height: 96,
            animation: 'spin 2s linear infinite',
          }}
        />
        {/* Ring 2 — middle, medium */}
        <span
          aria-hidden="true"
          className="absolute rounded-full border border-primary/20 border-t-primary/70"
          style={{
            width: 72,
            height: 72,
            animation: 'spin 1.4s linear infinite reverse',
          }}
        />
        {/* Ring 3 — inner, fast */}
        <span
          aria-hidden="true"
          className="absolute rounded-full border-2 border-primary/10 border-t-primary"
          style={{
            width: 52,
            height: 52,
            animation: 'spin 0.9s linear infinite',
          }}
        />
        {/* Logo centered */}
        <div
          className="relative z-10 flex items-center justify-center rounded-xl bg-[hsl(220,25%,10%)] "
          style={{ width: 36, height: 36 }}
        >
          <ElysiumLogo className="h-6 w-6" />
        </div>
      </div>

      {/* Text section */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-semibold tracking-wide text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 animate-pulse">{subLabel}</p>
      </div>

      {/* Pulsing dots */}
      <div aria-hidden="true" className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary/60"
            style={{
              animation: `pulse-dot 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
