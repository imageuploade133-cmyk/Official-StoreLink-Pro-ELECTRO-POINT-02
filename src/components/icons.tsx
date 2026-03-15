
import * as React from 'react';
import { cn } from '@/lib/utils';

export const ElysiumLogo = (props: React.SVGProps<SVGSVGElement>) => (
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
      d="M12 12H28V15.5H16.5V18.5H26V21.5H16.5V24.5H28V28H12V12Z"
      fill="white"
    />
    <path
      d="M30 10L32 12M32 10L30 12"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="opacity-40"
    />
  </svg>
);
