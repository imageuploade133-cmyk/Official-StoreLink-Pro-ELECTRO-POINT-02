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
      <div className="rounded-lg border bg-card p-2 shadow-sm">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        {children}
      </div>
    </div>
  );
}
