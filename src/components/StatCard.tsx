import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
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
  href?: string;
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
  href,
}: StatCardProps) {
  const content = (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 border-2",
      href && "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className={cn("text-sm font-medium", titleClassName)}>{title}</CardTitle>
        <div className={cn("p-2 rounded-xl bg-background/50 backdrop-blur-sm shadow-sm", iconClassName)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className={cn("text-2xl font-bold tracking-tight", valueClassName)}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}
