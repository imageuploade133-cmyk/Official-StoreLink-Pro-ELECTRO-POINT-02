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
      <div className="rounded-lg border bg-card p-2 shadow-sm dark:border-border">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl tracking-tight dark:text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground dark:text-foreground/70">{description}</p>
        {children}
      </div>
    </div>
  );
}
