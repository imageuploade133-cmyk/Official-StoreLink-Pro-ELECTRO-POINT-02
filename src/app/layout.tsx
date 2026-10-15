import React from "react";
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { Inter, Space_Grotesk } from 'next/font/google';
import { ClientProviders } from '@/components/layout/client-providers';
import { headers } from 'next/headers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'StoreLink Pro',
  description: 'Modern Point of Sale System',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const storeId = headerList.get('x-store-id');

  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} min-h-screen`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head />
      <body
        className="bg-background text-foreground antialiased font-display min-h-screen overflow-x-auto"
        suppressHydrationWarning={true}
      >
        <ClientProviders storeId={storeId}>
          {children}
          <Toaster />
        </ClientProviders>
      </body>
    </html>
  );
}
