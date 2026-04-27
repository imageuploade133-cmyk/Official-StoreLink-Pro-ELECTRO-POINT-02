import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const convertToDateSafely = (date: any, fieldName?: string, docId?: string): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (date instanceof Timestamp) return date.toDate();
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (typeof date === 'object' && 'seconds' in date && 'nanoseconds' in date) {
    return new Timestamp(date.seconds, date.nanoseconds).toDate();
  }
  if (fieldName && docId) {
    console.warn(`Could not parse date for field '${fieldName}' in document '${docId}'. Value:`, date);
  }
  return null;
};

export function isWhiteOrTransparent(color?: string): boolean {
  if (!color || color === 'transparent' || color === 'white') return true;
  const normalized = color.toLowerCase().trim();
  return normalized === '#ffffff' || normalized === '#fff' || normalized === 'rgb(255,255,255)' || normalized === 'rgba(255,255,255,0)' || normalized === 'transparent';
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars
    .replace(/--+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')       // Trim - from start of text
    .replace(/-+$/, '');      // Trim - from end of text
}

export function getCollectionBackgroundStyle(settings: any) {
  if (!settings) return {};
  
  if (settings.ourCollectionBackgroundType === 'gradient') {
    return {
      background: `linear-gradient(${settings.ourCollectionGradientDirection || 'to bottom'}, ${settings.ourCollectionGradientStart || '#ffffff'}, ${settings.ourCollectionGradientEnd || '#f1f5f9'})`
    };
  } else if (settings.ourCollectionBackgroundType === 'image' && settings.ourCollectionBackgroundImageUrl) {
    return {
      backgroundImage: `url(${settings.ourCollectionBackgroundImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    };
  } else if (settings.ourCollectionBackgroundColor && !isWhiteOrTransparent(settings.ourCollectionBackgroundColor)) {
    return { backgroundColor: settings.ourCollectionBackgroundColor };
  }
  return {};
}

