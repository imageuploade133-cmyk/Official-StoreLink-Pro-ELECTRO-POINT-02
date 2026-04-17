import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PagePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PagePlaceholder({ icon: Icon, title, description }: PagePlaceholderProps) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed ">
      <div className="flex flex-col items-center gap-2 text-center">
        <Icon className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
