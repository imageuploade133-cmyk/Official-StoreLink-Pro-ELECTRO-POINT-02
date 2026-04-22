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
    <div className={cn('flex items-start gap-4', className)}>
      <div className="rounded-xl border bg-card p-2.5 dark:border-border/50">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold md:text-3xl tracking-tight dark:text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground dark:text-foreground/70 leading-relaxed">{description}</p>
        {children}
      </div>
    </div>
  );
}
