
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/settings-context';

interface StockBarProps {
  stock: number;
  lowStockThreshold: number;
  className?: string;
  showLabels?: boolean;
  forceVisible?: boolean; // For previews
  forceHealthyLabel?: string;
  forceLowLabel?: string;
  forceOutLabel?: string;
  forceHealthyColor?: string;
  forceLowColor?: string;
  forceOutColor?: string;
}

/**
 * StockBar - A premium inventory visualization component.
 * Displays a dynamic progress bar that shifts colors based on stock levels.
 * Reacts to global visibility settings, custom labels, and custom colors.
 */
export function StockBar({ 
  stock, 
  lowStockThreshold, 
  className, 
  showLabels = true,
  forceVisible = false,
  forceHealthyLabel,
  forceLowLabel,
  forceOutLabel,
  forceHealthyColor,
  forceLowColor,
  forceOutColor
}: StockBarProps) {
  const { settings } = useSettings();

  const isVisible = forceVisible || (settings?.showStockBar !== false);
  if (!isVisible) return null;

  const isActualLowStock = stock > 0 && stock <= lowStockThreshold;
  const isActualOutOfStock = stock <= 0;

  // Resolve Labels from Settings or Previews
  const healthyLabel = forceHealthyLabel || settings?.stockBarHealthyLabel || 'Stock Level: Healthy';
  const lowLabel = forceLowLabel || settings?.stockBarLowLabel || 'Limited Availability';
  const outLabel = forceOutLabel || settings?.stockBarOutLabel || 'Currently Sold Out';

  const statusLabel = isActualOutOfStock ? outLabel : isActualLowStock ? lowLabel : healthyLabel;

  // Resolve Colors from Settings or Previews
  const healthyColor = forceHealthyColor || settings?.stockBarHealthyColor || '';
  const lowColor = forceLowColor || settings?.stockBarLowColor || '';
  const outColor = forceOutColor || settings?.stockBarOutColor || '';

  const activeColor = isActualOutOfStock ? outColor : isActualLowStock ? lowColor : healthyColor;

  // Default color logic matching the "items left" image style (Orange for low/selling)
  const barColorClass = !activeColor ? (
    isActualOutOfStock 
      ? "bg-destructive" 
      : isActualLowStock 
        ? "bg-orange-500" 
        : "bg-primary"
  ) : "";

  // Calculate percentage for display (capped at 100%)
  // Image style uses a more literal progress. We'll use lowStockThreshold * 5 as a capacity baseline
  const stockPercentage = isActualOutOfStock ? 0 : Math.min((stock / (lowStockThreshold * 5)) * 100, 100);

  return (
    <div className={cn("space-y-2", className)}>
      {showLabels && (
        <div className="flex justify-between items-center text font-black uppercase tracking-widest">
          <span 
            className={cn(
                "opacity-80",
                !activeColor && (isActualOutOfStock ? "text-destructive" : isActualLowStock ? "text-orange-600" : "text-primary/60")
            )}
            style={{ color: activeColor || undefined }}
          >
            {stock} items left
          </span>
        </div>
      )}
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-in-out",
            barColorClass
          )} 
          style={{ 
            width: `${stockPercentage}%`,
            backgroundColor: activeColor || undefined,
            boxShadow: activeColor ? `0 0 10px ${activeColor}66` : undefined
          }}
        />
      </div>
    </div>
  );
}
