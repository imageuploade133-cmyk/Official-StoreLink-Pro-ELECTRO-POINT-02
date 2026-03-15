'use client';

import { FirebaseClientProvider } from '@/firebase/client-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { ThemeProvider } from '@/components/ThemeProvider';
import { CartProvider } from '@/contexts/cart-context';
import { WishlistProvider } from '@/contexts/wishlist-context';
import { GlobalLoadingProvider } from '@/contexts/global-loading-context';
import { RecentlyViewedProvider } from '@/contexts/recently-viewed-context';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <SettingsProvider>
        <AuthProvider>
            <GlobalLoadingProvider>
              <CartProvider>
                <WishlistProvider>
                  <RecentlyViewedProvider>
                    <ThemeProvider>{children}</ThemeProvider>
                  </RecentlyViewedProvider>
                </WishlistProvider>
              </CartProvider>
            </GlobalLoadingProvider>
        </AuthProvider>
      </SettingsProvider>
    </FirebaseClientProvider>
  );
}
