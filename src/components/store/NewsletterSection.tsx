'use client';

import React, { useMemo } from 'react';
import { useSettings } from '@/contexts/settings-context';

export function NewsletterSection() {
  const { settings } = useSettings();

  const showNewsletterSection = settings?.showNewsletterSection ?? true;
  const title = settings?.newsletterSectionTitle || 'Join Our Newsletter';
  const description = settings?.newsletterSectionDescription || 'Subscribe to receive updates, access to exclusive deals, and more.';
  const backgroundColor = settings?.newsletterSectionBackgroundColor || '#f1f5f9'; // fallback to a light gray

  const buttonStyle = useMemo(() => {
    const style = settings?.storeBtnStyle || 'standard';
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

  if (!showNewsletterSection) {
    return null;
  }

  // A simple check for light/dark color to adjust text color for better contrast
  const isDarkBg = () => {
    if (!backgroundColor.startsWith('#')) return false;
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  };
  const textColorClass = isDarkBg() ? 'text-slate-200' : 'text-slate-600';
  const titleColorClass = isDarkBg() ? 'text-white' : 'text-slate-900';


  return (
    <section 
        className={cn(
            "py-20 transition-colors duration-500",
            (!backgroundColor || backgroundColor === '#f1f5f9' || backgroundColor === 'transparent') ? "bg-slate-100 dark:bg-black" : ""
        )} 
        style={(backgroundColor && backgroundColor !== '#f1f5f9' && backgroundColor !== 'transparent') ? { backgroundColor: backgroundColor } : {}}
    >
        <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className={`text-3xl font-bold mb-4 ${titleColorClass}`}>{title}</h2>
            <p className={`${textColorClass} mb-8`}>{description}</p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                <input className="flex-1 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-slate-800 outline-none" placeholder="Enter your email" type="email"/>
                <button style={buttonStyle} className="px-8 py-3 rounded-lg font-bold transition-colors" type="submit">Subscribe</button>
            </form>
            <p className="text-[10px] text-slate-500 mt-4">By subscribing, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
    </section>
  );
}
