'use client';

import React, { useMemo } from 'react';
import { useSettings } from '@/contexts/settings-context';
import { cn, isWhiteOrTransparent } from '@/lib/utils';
import { useTheme } from 'next-themes';

export function NewsletterSection() {
  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const showNewsletterSection = settings?.showNewsletterSection ?? true;
  const title = settings?.newsletterSectionTitle || 'Join Our Newsletter';
  const description = settings?.newsletterSectionDescription || 'Subscribe to receive updates, access to exclusive deals, and more.';
  const backgroundColor = settings?.newsletterSectionBackgroundColor;

  const buttonStyle = useMemo(() => {
    const style = settings?.storeBtnStyle || 'standard';
    if (style === 'apple') {
      const color = settings?.storeBtnColor || '#007AFF';
      return {
        background: `linear-gradient(180deg, ${color} 0%, ${color}ee 100%)`,
        color: 'white',
        border: '0.5px solid rgba(0,0,0,0.15)',
        boxShadow: `0 8px 20px -4px ${color}60, inset 0 1px 1px rgba(255, 255, 255, 0.25)`,
        fontWeight: '600',
        letterSpacing: '-0.02em',
      };
    }
    if (style === 'gradient') {
      return {
        background: `linear-gradient(to right, ${settings?.storeBtnGradientStart || '#3b82f6'}, ${settings?.storeBtnGradientEnd || '#1d4ed8'})`,
        color: 'white',
        border: 'none'
      };
    }
    return {
      backgroundColor: settings?.storeBtnColor || '#3b82f6',
      color: 'white',
      border: 'none'
    };
  }, [settings]);

  const buttonClasses = useMemo(() => {
    const shape = settings?.storeBtnShape || 'md';
    const shadow = settings?.storeBtnShadow || 'sm';
    
    const shapeClasses: Record<string, string> = {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-2xl',
      full: 'rounded-full'
    };

    const shadowClasses: Record<string, string> = {
      none: 'shadow-none',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
      '2xl': 'shadow-2xl',
      inner: 'shadow-inner'
    };

    let shapeClass = shapeClasses[shape] || 'rounded-md';
    let shadowClass = shadowClasses[shadow as keyof typeof shadowClasses] || 'shadow-sm';

    if (settings?.storeBtnStyle === 'apple') {
      shapeClass = 'rounded-xl';
      shadowClass = 'shadow-none';
    }

    return `${shapeClass} ${shadowClass}`;
  }, [settings]);

  if (!showNewsletterSection) {
    return null;
  }

  // A simple check for light/dark color to adjust text color for better contrast
  const checkIsDarkBg = (color: string) => {
    if (!color || !color.startsWith('#')) return false;
    const hex = color.replace('#', '');
    if (hex.length !== 6 && hex.length !== 3) return false;
    
    let r, g, b;
    if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    } else {
        r = parseInt(hex.substring(0, 1) + hex.substring(0, 1), 16);
        g = parseInt(hex.substring(1, 2) + hex.substring(1, 2), 16);
        b = parseInt(hex.substring(2, 3) + hex.substring(2, 3), 16);
    }
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  };

  const isDefaultBg = !backgroundColor || backgroundColor === '#f1f5f9';
  const isCustomBgDark = backgroundColor ? checkIsDarkBg(backgroundColor) : false;
  
  // We should use the dark theme if either the site is in dark mode OR the custom background is dark
  const isActuallyDark = isDark || isCustomBgDark;
  
  // Determine if we should use Tailwind classes for background or the inline style
  // Use theme classes if it's default, or if it's white/transparent, 
  // OR if we are in dark mode and the custom color is NOT dark (override light custom bg in dark mode)
  const shouldUseThemeBg = isDefaultBg || isWhiteOrTransparent(backgroundColor) || (isDark && !isCustomBgDark);

  const textColorClass = isActuallyDark ? 'text-slate-400' : 'text-slate-600';
  const titleColorClass = isActuallyDark ? 'text-white' : 'text-slate-900';

  return (
    <section 
        className={cn(
            "py-24 md:py-32 transition-all duration-700 relative overflow-hidden",
            shouldUseThemeBg ? "bg-[#f8f9fa] dark:bg-black" : ""
        )} 
        style={!shouldUseThemeBg && backgroundColor ? { backgroundColor: backgroundColor } : {}}
    >
        {/* Decorative elements for premium feel */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
            <div className={cn(
                "absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full blur-[120px] transition-opacity duration-1000",
                isActuallyDark ? "bg-primary/10 opacity-40" : "bg-primary/5 opacity-30"
            )} />
            <div className={cn(
                "absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full blur-[120px] transition-opacity duration-1000",
                isActuallyDark ? "bg-primary/10 opacity-40" : "bg-primary/5 opacity-30"
            )} />
        </div>

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center justify-center p-2 mb-6 rounded-full bg-primary/10 text-primary animate-bounce">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
            </div>
            
            <h2 className={cn("text-4xl md:text-6xl font-black mb-6 tracking-tight transition-colors duration-500 leading-tight", titleColorClass)}>
                {title}
            </h2>
            <p className={cn("text-lg md:text-xl mb-12 max-w-2xl mx-auto transition-colors duration-500 leading-relaxed font-medium", textColorClass)}>
                {description}
            </p>
            
            <form className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto" onSubmit={(e) => e.preventDefault()}>
                <div className="relative flex-1 group">
                    <input 
                        className={cn(
                            "w-full px-6 py-5 rounded-2xl border transition-all duration-300 outline-none text-base shadow-sm",
                            isActuallyDark 
                                ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:bg-white/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5" 
                                : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10"
                        )} 
                        placeholder="Enter your email address" 
                        type="email"
                        required
                    />
                </div>
                <button 
                    style={buttonStyle} 
                    className={cn(
                        "px-12 py-5 font-black uppercase tracking-widest text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2",
                        buttonClasses
                    )}
                    type="submit"
                >
                    Subscribe Now
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /></svg>
                </button>
            </form>
            
            <div className={cn("mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors duration-500", isActuallyDark ? "text-slate-500" : "text-slate-400")}>
                <span className="flex items-center gap-2"><svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg> No Spam, Ever</span>
                <span className="flex items-center gap-2"><svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg> Unsubscribe Anytime</span>
            </div>
        </div>
    </section>
  );
}
