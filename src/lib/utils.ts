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
