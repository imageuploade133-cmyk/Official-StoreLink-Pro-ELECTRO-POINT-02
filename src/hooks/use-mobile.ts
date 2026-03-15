'use client';

import { useState, useEffect } from 'react';

// A simple hook to detect if the screen is mobile-sized.
export function useIsMobile(query: string = '(max-width: 768px)'): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    // Set the initial value
    const handleResize = () => setIsMobile(mediaQuery.matches);
    handleResize();

    // Add listener for changes
    mediaQuery.addEventListener('change', handleResize);
    
    // Cleanup listener on component unmount
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, [query]);

  return isMobile;
}
