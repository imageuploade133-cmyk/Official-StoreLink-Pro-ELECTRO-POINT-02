
import * as React from 'react';
import { cn } from '@/lib/utils';

export const StoreLinkLogo = (props: React.SVGProps<SVGSVGElement>) => {
  const id = React.useId();
  const gradientId = `logo-gradient-${id}`;

  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("drop-shadow-lg transition-all duration-500 hover:scale-110 hover:brightness-110 group-hover:drop-shadow-[0_0_8px_rgba(0,113,227,0.5)]", props.className)}
      {...props}
    >
      <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.85" />
          </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${gradientId})`} />
      <path
        d="M12 20C12 15.5817 15.5817 12 20 12H28V16H20C17.7909 16 16 17.7909 16 20C16 22.2091 17.7909 24 20 24H28V28H20C15.5817 28 12 24.4183 12 20Z"
        fill="white"
      />
      <path
        d="M28 20C28 24.4183 24.4183 28 20 28H12V24H20C22.2091 24 24 22.2091 24 20C24 17.7909 22.2091 16 20 16H12V12H20C24.4183 12 28 15.5817 28 20Z"
        fill="white"
        fillOpacity="0.8"
      />
    </svg>
  );
};
