import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-muted/30 to-transparent border-2 border-primary/10 shadow-sm', className)}>
      <div className="flex items-center gap-4">
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/10 dark:bg-primary/20 p-3.5 shadow-sm transition-all duration-300 hover:scale-105">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black md:text-3xl tracking-tight dark:text-foreground">
              {title}
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Live System
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground dark:text-foreground/70 leading-relaxed max-w-2xl">{description}</p>
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2.5">
          {children}
        </div>
      )}
    </div>
  );
}
