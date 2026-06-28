"use client";
import * as React from "react";

import { PublicNavbar } from '@/components/store/PublicNavbar';
import { PublicFooter } from '@/components/store/PublicFooter';
import { MobileBottomNav } from '@/components/store/MobileBottomNav';
import { useGlobalLoading } from '@/contexts/global-loading-context';
import { PublicPageSkeleton } from '@/components/store/PublicPageSkeleton';
import { useSettings } from '@/contexts/settings-context';
import { BackgroundVideoPlayer } from '@/components/store/BackgroundVideoPlayer';
import { cn, getCollectionBackgroundStyle } from "@/lib/utils";
import { AdSystem } from '@/components/store/AdSystem';
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BannerAd } from '@/components/ads/BannerAd';
import { useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { doc, runTransaction, increment } from 'firebase/firestore';
import { format } from 'date-fns';
import { useParams, usePathname } from 'next/navigation';
import { OfflineDetector } from "@/components/OfflineDetector";
import { getStoreUrl } from "@/lib/domain";

function WebsiteTracker() {
  const firestore = useFirestore();
  const params = useParams();
  const storeId = params?.storeId as string;

  useEffect(() => {
    if (!firestore || !storeId) return;

    const trackVisit = async () => {
      // Prevent multiple tracking calls in the same session to reduce contention
      const sessionKey = `vst_${storeId}`;
      if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) {
        return;
      }

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      // Store-specific traffic tracking
      const trafficRef = doc(firestore, 'stores', storeId, 'analytics', 'websiteTraffic');

      try {
        await runTransaction(firestore, async (transaction) => {
          const trafficDoc = await transaction.get(trafficRef);
          
          if (!trafficDoc.exists()) {
            transaction.set(trafficRef, {
              totalViews: 1,
              todayViews: 1,
              lastDailyUpdate: todayStr,
              store_id: storeId
            });
          } else {
            const data = trafficDoc.data();
            const isNewDay = data.lastDailyUpdate !== todayStr;
            
            if (isNewDay) {
              transaction.update(trafficRef, {
                totalViews: increment(1),
                todayViews: 1,
                lastDailyUpdate: todayStr
              });
            } else {
              transaction.update(trafficRef, {
                totalViews: increment(1),
                todayViews: increment(1)
              });
            }
          }
        });

        if (typeof window !== 'undefined') {
          sessionStorage.setItem(sessionKey, 'true');
        }
      } catch (error) {
        // Silently fail for traffic tracking to avoid breaking the UI
        console.warn("Traffic tracking failed:", error);
      }
    };

    trackVisit();
  }, [firestore, storeId]);

  return null;
}

function CanonicalLink() {
    const { store } = useSettings();
    const pathname = usePathname();
    const params = useParams();
    const storeId = params?.storeId as string;

    const canonicalUrl = useMemo(() => {
        if (!store || !storeId) return null;
        
        const baseUrl = getStoreUrl(
            store.id, 
            store.plan || 'free', 
            store.customDomain, 
            store.subdomain, 
            store.primaryDomainType
        );
        
        let path = pathname;
        if (path.startsWith(`/${storeId}`)) {
            path = path.replace(`/${storeId}`, '');
        }
        
        // Ensure path starts with / if not empty, but if it is empty, make it empty string
        // so we don't end up with trailing slash if not needed, or we can ensure it has one.
        if (path === '/') path = '';
        
        return `${baseUrl}${path}`;
    }, [store, storeId, pathname]);

    useEffect(() => {
        if (!canonicalUrl) return;
        
        let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
        if (link) {
            link.setAttribute('href', canonicalUrl);
        } else {
            link = document.createElement('link');
            link.setAttribute('rel', 'canonical');
            link.setAttribute('href', canonicalUrl);
            document.head.appendChild(link);
        }
    }, [canonicalUrl]);

    return null;
}

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isInitialLoadComplete } = useGlobalLoading();
  const { settings, store } = useSettings();

  const isExpired = useMemo(() => {
    if (!store?.planExpiresAt) return false;
    try {
        const expiryDate = typeof store.planExpiresAt === 'string'
            ? new Date(store.planExpiresAt)
            : (store.planExpiresAt as any).toDate();
        return expiryDate < new Date();
    } catch (e) {
        return false;
    }
  }, [store]);

  const storeLogoWidth = settings?.storeLogoWidth || 120;
  const logoContainerHeight = Math.max(32, Math.round(storeLogoWidth * 0.33));
  const navbarPadding = Math.max(16, Math.round(logoContainerHeight * 0.5));
  
  const heightMap = {
      compact: 48,
      default: 64,
      expanded: 80,
      full: 100,
  };
  
  const navbarHeight = settings?.navbarHeight ? (heightMap[settings.navbarHeight as keyof typeof heightMap] || 64) : (logoContainerHeight + (navbarPadding * 2));
  const navbarSticky = settings?.navbarSticky || 'fixed';
  
  const globalBgStyle = useMemo(() => {
    if (settings?.ourCollectionBackgroundApplyTo?.includes('global')) {
      return getCollectionBackgroundStyle(settings);
    }
    return {};
  }, [settings]);

  const hasGlobalBg = !!(globalBgStyle.backgroundColor || globalBgStyle.backgroundImage || globalBgStyle.background);

  if (!isInitialLoadComplete) {
    return <PublicPageSkeleton />;
  }

  return (
    <OfflineDetector>
      <WebsiteTracker />
      {isExpired && (
        <div className="fixed inset-0 z-[200] bg-background flex items-center justify-center p-6 text-center">
            <Card className="max-w-md w-full border-2 border-primary/20 shadow-none animate-in fade-in zoom-in duration-500">
                <CardContent className="pt-12 pb-12 space-y-8">
                    <div className="size-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto border-2 border-primary/20 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <ShieldAlert className="size-12 text-primary" strokeWidth={2} />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-black tracking-tight uppercase">Store Suspended</h2>
                        <div className="h-1.5 w-16 bg-primary mx-auto rounded-full" />
                        <p className="text-muted-foreground font-medium text-lg px-4 leading-relaxed">
                            This store is temporarily unavailable. We&apos;ll be back shortly!
                        </p>
                    </div>
                    <div className="pt-4 space-y-4">
                        <div className="p-4 bg-muted/50 rounded-2xl border border-border/50">
                            <p className="text-sm font-bold text-foreground mb-1">Store Owner?</p>
                            <p className="text-xs text-muted-foreground">Please renew your subscription plan via the dashboard to reactivate your website.</p>
                        </div>
                        <Button variant="outline" className="w-full h-14 rounded-2xl font-bold border-2 text-base hover:bg-primary hover:text-primary-foreground transition-all duration-300" asChild>
                            <a href={`mailto:abdulkadir123shaba@gmail.com?subject=Inquiry about Store: ${store?.name || 'Unknown'}`}>
                                <Mail className="mr-2 size-5" /> Contact Administrator
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
      <CanonicalLink />
      <AdSystem />
      {settings?.backgroundStyle === 'video' && settings.backgroundVideoUrl && <BackgroundVideoPlayer />}
      <PublicNavbar />
      
      <main 
        className={cn(
            "relative z-10 transition-shadow duration-300 overflow-x-auto pb-20 md:pb-0",
            !hasGlobalBg && "dark:bg-black",
            (settings?.enableBackgroundShadow ?? true) && "shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(255,255,255,0.05)]"
        )} 
        style={{ 
          paddingTop: navbarSticky !== 'static' ? `${navbarHeight}px` : '0px',
          ...globalBgStyle
        }}
      >
        <BannerAd location="top_of_page" />
        {children}
        <BannerAd location="bottom_of_page" />
      </main>

      <PublicFooter />
      <MobileBottomNav />
    </OfflineDetector>
  );
}
