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
    <div className={cn('flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8', className)}>
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border bg-white dark:bg-card p-3 shadow-sm dark:border-border/50 transition-all duration-300 hover:shadow-md">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold md:text-3xl tracking-tight dark:text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground dark:text-foreground/70 leading-relaxed max-w-2xl">{description}</p>
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {children}
        </div>
      )}
    </div>
  );
}
