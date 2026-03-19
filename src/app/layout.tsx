import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { Inter, Space_Grotesk } from 'next/font/google';
import { ClientProviders } from '@/components/layout/client-providers';

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedZoom = localStorage.getItem('dashboard-zoom');
                if (savedZoom) {
                  const zoomLevel = parseInt(savedZoom, 10);
                  const zoomScale = zoomLevel / 100;
                  const html = document.documentElement;
                  html.style.transformOrigin = '0 0';
                  html.style.transform = 'scale(' + zoomScale + ')';
                  html.style.width = (100 / zoomScale) + '%';
                  html.style.height = (100 / zoomScale) + '%';
                  document.body.style.overflow = 'hidden';
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className="bg-background text-foreground antialiased font-display h-full"
        suppressHydrationWarning={true}
      >
        <ClientProviders>
          {children}
          <Toaster />
        </ClientProviders>
      </body>
    </html>
  );
}
