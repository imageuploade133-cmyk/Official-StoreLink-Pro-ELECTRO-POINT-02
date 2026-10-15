'use client';

import React from 'react';
import { FolderOpen, Plus, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyTableStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ElementType;
  className?: string;
}

export function EmptyTableState({
  title = "No data found",
  description = "There are no records matching your current criteria or filter.",
  actionLabel,
  onAction,
  icon: Icon = FolderOpen,
  className,
}: EmptyTableStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center my-2 rounded-2xl border-2 border-dashed border-primary/20 bg-gradient-to-b from-primary/5 via-muted/20 to-transparent", className)}>
      <div className="relative mb-4">
        <div className="absolute -inset-2 bg-primary/10 rounded-full blur-xl animate-pulse" />
        <div className="relative size-16 rounded-2xl bg-white dark:bg-card border-2 border-primary/20 shadow-md flex items-center justify-center">
          <Icon className="size-8 text-primary" strokeWidth={1.75} />
        </div>
      </div>
      <h3 className="text-lg font-black tracking-tight text-foreground mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="btn-action-primary h-11 px-6 rounded-xl font-bold text-xs uppercase tracking-wider gap-2"
        >
          <Sparkles className="size-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
