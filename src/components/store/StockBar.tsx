
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
      ? "bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.4)]" 
      : isActualLowStock 
        ? "bg-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" 
        : "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.3)]"
  ) : "";

  // Calculate percentage for display (capped at 100%)
  // Image style uses a more literal progress. We'll use lowStockThreshold * 5 as a capacity baseline
  const stockPercentage = isActualOutOfStock ? 0 : Math.min((stock / (lowStockThreshold * 5)) * 100, 100);

  return (
    <div className={cn("space-y-2.5", className)}>
      {showLabels && (
        <div className="flex justify-between items-center text-[11px] font-medium tracking-tight">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "h-1.5 w-1.5 rounded-full",
              isActualOutOfStock ? "bg-destructive" : isActualLowStock ? "bg-[#e11d48] animate-pulse" : "bg-[#34c759]"
            )} />
            <span className={cn(
                "text-[#86868b]",
                isActualOutOfStock && "text-destructive font-semibold",
                isActualLowStock && "text-[#e11d48] font-semibold"
            )}>
              {isActualOutOfStock ? outLabel : isActualLowStock ? `${stock} items remaining` : "Available in Stock"}
            </span>
          </div>
          {!isActualOutOfStock && !isActualLowStock && (
            <span className="text-[#86868b] opacity-60 font-medium">{stock}+ units</span>
          )}
        </div>
      )}
      <div className="h-1.5 w-full bg-black/[0.08] dark:bg-white/[0.15] rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-in-out",
            !activeColor ? (
              isActualOutOfStock 
                ? "bg-destructive" 
                : isActualLowStock 
                  ? "bg-[#e11d48]" 
                  : "bg-[#0071e3]"
            ) : ""
          )} 
          style={{ 
            width: `${stockPercentage}%`,
            backgroundColor: activeColor || undefined,
          }}
        />
      </div>
    </div>
  );
}
