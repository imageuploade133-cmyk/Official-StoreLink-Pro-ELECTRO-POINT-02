'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/theme-context';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ThemeToggle({ 
  className, 
  variant = 'ghost',
  size = 'icon'
}: ThemeToggleProps) {
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
        <Button variant={variant} size={size} className={cn('opacity-0', className)} disabled>
            <Moon className="h-5 w-5" />
        </Button>
    );
  }

  return (
    <Button
      onClick={toggleTheme}
      variant={variant}
      size={size}
      className={cn('transition-all duration-300 hover:scale-110 active:scale-95', className)}
      title={`Current: ${theme === 'system' ? `System (${resolvedTheme})` : theme}. Click to switch.`}
      aria-label={`Switch theme (currently ${theme})`}
    >
      {resolvedTheme === 'light' ? (
        <Moon className="h-5 w-5 transition-transform group-hover:rotate-12" />
      ) : (
        <Sun className="h-5 w-5 transition-transform group-hover:rotate-90" />
      )}
      {theme === 'system' && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-20"></span>
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
        </span>
      )}
    </Button>
  );
}
