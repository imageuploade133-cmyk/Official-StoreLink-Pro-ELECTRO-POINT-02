"use client";
import React from "react";

import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { StoreFirestoreProvider } from '@/contexts/store-firestore-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeContextProvider } from '@/contexts/theme-context';
import { CartProvider } from '@/contexts/cart-context';
import { WishlistProvider } from '@/contexts/wishlist-context';
import { GlobalLoadingProvider } from '@/contexts/global-loading-context';
import { RecentlyViewedProvider } from '@/contexts/recently-viewed-context';
import { AdProvider } from '@/contexts/ad-context';
import { UIBackgroundShadowManager } from './UIBackgroundShadowManager';
import { NavigationLoadingOverlay } from './NavigationLoadingOverlay';

export function ClientProviders({ children, storeId }: { children: React.ReactNode, storeId?: string | null }) {
  return (
    <FirebaseClientProvider>
      <ThemeContextProvider>
        <AuthProvider>
          <StoreFirestoreProvider>
            <SettingsProvider storeId={storeId}>
                <GlobalLoadingProvider>
                  <AdProvider>
                  <CartProvider>
                    <WishlistProvider>
                      <RecentlyViewedProvider>
                        <NavigationLoadingOverlay />
                        <UIBackgroundShadowManager />
                        <ThemeProvider>{children}</ThemeProvider>
                      </RecentlyViewedProvider>
                    </WishlistProvider>
                  </CartProvider>
                  </AdProvider>
                </GlobalLoadingProvider>
            </SettingsProvider>
          </StoreFirestoreProvider>
        </AuthProvider>
      </ThemeContextProvider>
    </FirebaseClientProvider>
  );
}
