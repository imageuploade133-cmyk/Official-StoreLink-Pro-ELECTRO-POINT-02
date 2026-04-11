'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { safeStorage } from '@/lib/storage-utils';

interface RecentlyViewedContextType {
  viewedProductIds: string[];
  addViewedProduct: (productId: string) => void;
  removeViewedProduct: (productId: string) => void;
  clearHistory: () => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(undefined);

const MAX_HISTORY = 20;

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [viewedProductIds, setViewedProductIds] = useState<string[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const saved = safeStorage.getItem('recentlyViewed');
    if (saved) {
      try {
        setViewedProductIds(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recently viewed history", e);
        safeStorage.removeItem('recentlyViewed');
      }
    }
  }, []);

  // Sync to local storage on change
  useEffect(() => {
    if (viewedProductIds.length > 0 || safeStorage.getItem('recentlyViewed')) {
      safeStorage.setItem('recentlyViewed', JSON.stringify(viewedProductIds));
    }
  }, [viewedProductIds]);

  const addViewedProduct = useCallback((productId: string) => {
    setViewedProductIds(prev => {
      // Remove if already exists to move it to the front
      const filtered = prev.filter(id => id !== productId);
      const updated = [productId, ...filtered].slice(0, MAX_HISTORY);
      return updated;
    });
  }, []);

  const removeViewedProduct = useCallback((productId: string) => {
    setViewedProductIds(prev => prev.filter(id => id !== productId));
  }, []);

  const clearHistory = useCallback(() => {
    setViewedProductIds([]);
    safeStorage.removeItem('recentlyViewed');
  }, []);

  const value = useMemo(() => ({
    viewedProductIds,
    addViewedProduct,
    removeViewedProduct,
    clearHistory
  }), [viewedProductIds, addViewedProduct, removeViewedProduct, clearHistory]);

  return (
    <RecentlyViewedContext.Provider value={value}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  const context = useContext(RecentlyViewedContext);
  if (context === undefined) {
    throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider');
  }
  return context;
}
