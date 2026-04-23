import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  className?: string;
  titleClassName?: string;
  valueClassName?: string;
  iconClassName?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  titleClassName,
  valueClassName,
  iconClassName,
}: StatCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 group",
      className
    )}>
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="h-12 w-12" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className={cn("text-sm font-medium", titleClassName)}>{title}</CardTitle>
        <div className={cn("p-2 rounded-lg bg-background/50", iconClassName)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className={cn("text-2xl font-bold tracking-tight", valueClassName)}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
      <div className="absolute bottom-0 left-0 h-1 w-full bg-primary/10 group-hover:bg-primary/30 transition-colors" />
    </Card>
  );
}
