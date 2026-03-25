'use client';

import { PublicNavbar } from '@/components/store/PublicNavbar';
import { PublicFooter } from '@/components/store/PublicFooter';
import { useGlobalLoading } from '@/contexts/global-loading-context';
import { PublicPageSkeleton } from '@/components/store/PublicPageSkeleton';
import { useSettings } from '@/contexts/settings-context';
import { BackgroundVideoPlayer } from '@/components/store/BackgroundVideoPlayer';
import { useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, runTransaction, increment } from 'firebase/firestore';
import { format } from 'date-fns';

function WebsiteTracker() {
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore) return;

    const trackVisit = async () => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const trafficRef = doc(firestore, 'analytics', 'websiteTraffic');

      try {
        await runTransaction(firestore, async (transaction) => {
          const trafficDoc = await transaction.get(trafficRef);
          
          if (!trafficDoc.exists()) {
            transaction.set(trafficRef, {
              totalViews: 1,
              todayViews: 1,
              lastDailyUpdate: todayStr
            });
          } else {
            const data = trafficDoc.data();
            const isNewDay = data.lastDailyUpdate !== todayStr;
            
            transaction.update(trafficRef, {
              totalViews: increment(1),
              todayViews: isNewDay ? 1 : increment(1),
              lastDailyUpdate: todayStr
            });
          }
        });
      } catch (error) {
        console.error("Traffic tracking failed:", error);
      }
    };

    trackVisit();
  }, [firestore]);

  return null;
}

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isInitialLoadComplete } = useGlobalLoading();
  const { settings } = useSettings();

  const storeLogoWidth = settings?.storeLogoWidth || 120;
  // Proportional scaling: Logo height is ~33% of width (typical logo aspect ratio)
  // Navbar padding scales with logo height to maintain visual balance
  const logoContainerHeight = Math.max(32, Math.round(storeLogoWidth * 0.33));
  const navbarPadding = Math.max(16, Math.round(logoContainerHeight * 0.5));
  const navbarHeight = logoContainerHeight + (navbarPadding * 2);

  if (!isInitialLoadComplete) {
    return <PublicPageSkeleton />;
  }

  return (
    <>
      <WebsiteTracker />
      {settings?.backgroundStyle === 'video' && settings.backgroundVideoUrl && <BackgroundVideoPlayer />}
      <PublicNavbar />
      
      <main className="relative z-10 dark:bg-black" style={{ paddingTop: `${navbarHeight}px` }}>{children}</main>

      <PublicFooter />
    </>
  );
}
