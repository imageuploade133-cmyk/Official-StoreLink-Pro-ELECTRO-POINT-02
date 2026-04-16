'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import type { WishlistItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useStoreUrl } from '@/hooks/use-store-url';

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  wishlistProductIds: Set<string>;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isProductInWishlist: (productId: string) => boolean;
  wishlistCount: number;
  isLoadingWishlist: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { storeId } = useStoreUrl();

  const wishlistQuery = useMemo(() => {
    if (user && firestore && storeId) {
      return query(
          collection(firestore, 'users', user.uid, 'wishlist'),
          where('store_id', '==', storeId)
      );
    }
    return null;
  }, [user, firestore, storeId]);

  const { data: wishlistItems, isLoading: isLoadingWishlist } = useCollection<WishlistItem>(wishlistQuery);
  
  const wishlistProductIds = useMemo(() => {
    return new Set(wishlistItems?.map(item => item.productId) ?? []);
  }, [wishlistItems]);

  const addToWishlist = useCallback(async (productId: string) => {
    if (!user || !firestore || !storeId) {
      toast({
        variant: 'destructive',
        title: 'Please log in',
        description: 'You need to be logged in to add items to your wishlist.',
      });
      return;
    }
    try {
      // Use productId as doc ID within user's store-specific wishlist
      const wishlistItemRef = doc(firestore, 'users', user.uid, 'wishlist', `${storeId}_${productId}`);
      await setDoc(wishlistItemRef, {
        productId: productId,
        store_id: storeId,
        addedAt: serverTimestamp(),
      });
      toast({ title: 'Added to Wishlist' });
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add item to wishlist.' });
    }
  }, [user, firestore, toast, storeId]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    if (!user || !firestore || !storeId) return;
    try {
      const wishlistItemRef = doc(firestore, 'users', user.uid, 'wishlist', `${storeId}_${productId}`);
      await deleteDoc(wishlistItemRef);
      toast({ title: 'Removed from Wishlist' });
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove item from wishlist.' });
    }
  }, [user, firestore, toast, storeId]);

  const isProductInWishlist = useCallback((productId: string) => {
    return wishlistProductIds.has(productId);
  }, [wishlistProductIds]);

  const value = {
    wishlistItems: wishlistItems || [],
    wishlistProductIds,
    addToWishlist,
    removeFromWishlist,
    isProductInWishlist,
    wishlistCount: wishlistItems?.length ?? 0,
    isLoadingWishlist,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
