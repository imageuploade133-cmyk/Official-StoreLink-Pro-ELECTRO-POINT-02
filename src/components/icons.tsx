
import * as React from 'react';
import { cn } from '@/lib/utils';

export const V9Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("drop-shadow-lg transition-all duration-500 hover:scale-110 hover:brightness-110 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]", props.className)}
    {...props}
  >
    <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
        </linearGradient>
    </defs>
    <rect width="40" height="40" rx="12" fill="url(#logo-gradient)" />
    <path
      d="M10 12L20 28L30 12"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="28" cy="28" r="6" fill="white" />
    <text x="25" y="32" fill="hsl(var(--primary))" fontSize="10" fontWeight="bold">9</text>
  </svg>
);

