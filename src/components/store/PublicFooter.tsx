
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, Link as LinkIcon, MapPin } from 'lucide-react';
import { ElysiumLogo } from '@/components/icons';
import { useSettings } from '@/contexts/settings-context';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { Category, PublicPage } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';

import { useStoreUrl } from '@/hooks/use-store-url';
import { SafeHtml } from '../SafeHtml';

export function PublicFooter() {
  const { settings } = useSettings();
  const { storeId, getStoreUrl } = useStoreUrl();
  const firestore = useFirestore();
  const storeName = settings?.storeName || 'StoreLink-Pro';
  const logoUrl = settings?.invoiceLogoUrl;
  const storePhone = settings?.storePhone;
  const storeEmail = settings?.storeEmail;
  const storeAddress = settings?.storeAddress;
  const showFooterDescription = settings?.showFooterDescription ?? true;
  const footerDescription = settings?.footerDescription || '';
  const footerLogoWidth = settings?.footerLogoWidth || 100;
  const logoContainerHeight = Math.max(24, (footerLogoWidth || 100) / 3.5);
  const showPublicStoreName = settings?.showPublicStoreName ?? true;
  const showMainSiteLogo = settings?.showMainSiteLogo ?? true;
  const footerDesign = settings?.footerDesign || 'standard';
  const footerBannerUrl = settings?.footerBannerUrl;
  const footerBannerSize = settings?.footerBannerSize || 'small';

  const categoriesQuery = useMemo(() => {
    if (!firestore || !storeId) return null;
    return query(
      collection(firestore, 'categories'), 
      where('store_id', '==', storeId),
      orderBy('name')
    );
  }, [firestore, storeId]);

  const publicPagesQuery = useMemo(() => {
    if (!firestore || !storeId) return null;
    return query(
      collection(firestore, 'publicPages'), 
      where('store_id', '==', storeId),
      where('published', '==', true), 
      orderBy('createdAt', 'asc')
    );
  }, [firestore, storeId]);

  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);
  const { data: publicPages, isLoading: isLoadingPages } = useCollection<PublicPage>(publicPagesQuery);

  const supportPages = useMemo(() => publicPages?.filter(p => p.footerSection === 'Support') || [], [publicPages]);
  const companyPages = useMemo(() => publicPages?.filter(p => p.footerSection === 'Company') || [], [publicPages]);

  const footerStyle = useMemo(() => {
    if (settings?.footerBackgroundStyle === 'gradient' && settings.footerBackgroundGradientStart && settings.footerBackgroundGradientEnd) {
      return { 
        backgroundImage: `linear-gradient(to bottom right, ${settings.footerBackgroundGradientStart}, ${settings.footerBackgroundGradientEnd})`,
        color: settings.footerTextColor || '#94a3b8'
      };
    }
    if (settings?.footerColorBackground) {
      return { 
        backgroundColor: settings.footerColorBackground,
        color: settings.footerTextColor || '#94a3b8'
      };
    }
    return { color: '#94a3b8' };
  }, [settings]);

  const hasCustomBg = !!(settings?.footerColorBackground || (settings?.footerBackgroundStyle === 'gradient' && settings.footerBackgroundGradientStart));
  const textColor = settings?.footerTextColor || '#94a3b8';

  return (
    <footer 
        className={cn("pt-20 pb-10 transition-all duration-700 relative overflow-hidden", !hasCustomBg && "bg-background-dark text-slate-400")} 
        style={footerStyle}
    >
      {/* Custom Footer Background Branding */}
      {settings?.footerBgType && settings.footerBgType !== 'none' && (
        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden select-none">
          <div 
            style={{ 
              opacity: 0.05, 
              transform: `rotate(${settings.footerBgRotation ?? 0}deg)`,
              width: settings.footerBgType === 'text' ? 'auto' : `${settings.footerBgSize ?? 400}px`,
            }}
            className="transition-all duration-700 ease-in-out"
          >
            {settings.footerBgType === 'text' ? (
              <span 
                className="font-black whitespace-nowrap leading-none tracking-tighter"
                style={{ fontSize: `${settings.footerBgSize ?? 200}px` }}
              >
                {settings.footerBgText || 'FOOTER'}
              </span>
            ) : (
              settings.footerBgImageUrl && (
                <img 
                  src={settings.footerBgImageUrl} 
                  alt="" 
                  className="w-full h-auto object-contain"
                  draggable={false}
                />
              )
            )}
          </div>
        </div>
      )}

      {/* Brand Watermark Overlay */}
      {settings?.webWatermarkEnabled && (
        <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden select-none">
          <div 
            style={{ 
              opacity: settings.webWatermarkOpacity ?? 0.1, 
              transform: `rotate(${settings.webWatermarkRotation ?? -30}deg)`,
              width: settings.webWatermarkType === 'text' ? 'auto' : `${settings.webWatermarkImageWidth ?? 400}px`,
            }}
            className="transition-all duration-1000 ease-in-out"
          >
            {settings.webWatermarkType === 'text' ? (
              <span 
                className="font-black whitespace-nowrap leading-none tracking-tighter"
                style={{ fontSize: `${settings.webWatermarkFontSize ?? 120}px` }}
              >
                {settings.webWatermarkText || 'STORELINK PRO'}
              </span>
            ) : (
              settings.webWatermarkImageUrl && (
                <img 
                  src={settings.webWatermarkImageUrl} 
                  alt="" 
                  className="w-full h-auto object-contain"
                  draggable={false}
                />
              )
            )}
          </div>
        </div>
      )}

      <div className="max-w-site-container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={cn(
            "grid grid-cols-1 gap-12 mb-16",
            footerDesign === 'standard' && "md:grid-cols-4",
            footerDesign === 'modern' && "md:grid-cols-5",
            footerDesign === 'minimal' && "md:grid-cols-2"
        )}>
          {/* Company Info */}
          <div className={cn(
            "col-span-1",
            footerDesign === 'modern' && "md:col-span-2"
          )}>
            <Link href={getStoreUrl('/store')} className="flex items-center gap-3 text-lg font-semibold mb-6">
              {showMainSiteLogo && logoUrl ? (
                 <div style={{ width: `${footerLogoWidth}px`, height: `${logoContainerHeight}px` }} className="relative">
                    <Image 
                        src={logoUrl} 
                        alt={storeName}
                        fill
                        sizes={`${footerLogoWidth}px`}
                        style={{ objectFit: 'contain' }}
                        unoptimized
                    />
                </div>
              ) : showMainSiteLogo ? (
                <ElysiumLogo className="h-6 w-6" style={{ color: textColor }} />
              ) : null}
              {showPublicStoreName && (
                <span className={'font-extrabold tracking-tighter text-2xl whitespace-pre-wrap break-words leading-tight max-w-[200px] sm:max-w-[250px]'} style={{ color: 'inherit' }}>{storeName}</span>
              )}
            </Link>
            {showFooterDescription && footerDescription && <p className="text-sm mb-6" style={{ color: textColor }}>{footerDescription}</p>}
            
            {(storePhone || storeEmail || storeAddress) && (
              <div className="space-y-3 mb-6">
                {storePhone && (
                  <a href={`tel:${storePhone}`} className="flex items-center text-sm hover:opacity-80 transition-colors dark:text-slate-300" style={{ color: textColor }}>
                    <Phone className="h-4 w-4 mr-3 flex-shrink-0 opacity-70 dark:text-slate-400 dark:p-0.5 dark:border dark:border-slate-600 dark:rounded-md" /> <span>{storePhone}</span>
                  </a>
                )}
                {storeEmail && (
                   <a href={`mailto:${storeEmail}`} className="flex items-center text-sm hover:opacity-80 transition-colors dark:text-slate-300" style={{ color: textColor }}>
                    <Mail className="h-4 w-4 mr-3 flex-shrink-0 opacity-70 dark:text-slate-400 dark:p-0.5 dark:border dark:border-slate-600 dark:rounded-md" /> <span>{storeEmail}</span>
                  </a>
                )}
                {storeAddress && (
                   <p className="flex items-start text-sm dark:text-slate-300" style={{ color: textColor }}>
                    <MapPin className="h-4 w-4 mr-3 mt-1 flex-shrink-0 opacity-70 dark:text-slate-400 dark:p-0.5 dark:border dark:border-slate-600 dark:rounded-md" /> <span>{storeAddress}</span>
                  </p>
                )}
              </div>
            )}
            
            <div className="flex space-x-4">
               {settings?.socialMediaLinks?.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.name}
                  className="hover:opacity-80 transition-opacity dark:text-slate-300 dark:border dark:border-slate-600 dark:p-1.5 dark:rounded-lg inline-flex items-center justify-center dark:hover:border-slate-500"
                  style={{ color: textColor }}
                >
                  {link.iconUrl ? (
                    <Image src={link.iconUrl} alt={link.name} width={24} height={24} className="h-6 w-6 object-contain dark:brightness-150" unoptimized />
                  ) : (
                    <LinkIcon className="h-6 w-6 opacity-70 dark:opacity-90 dark:text-slate-300" />
                  )}
                </a>
              ))}
            </div>
          </div>
          {/* Shop Links */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest mb-6" style={{ color: 'inherit', opacity: 0.9 }}>Shop</h4>
            <ul className="space-y-4 text-sm">
              <li><Link className="hover:opacity-80 transition-colors" href={getStoreUrl('/store/shop')} style={{ color: textColor }}>All Products</Link></li>
              <li><Link className="hover:opacity-80 transition-colors" href={getStoreUrl('/store/categories')} style={{ color: textColor }}>All Categories</Link></li>
              {isLoadingCategories ? (
                <>
                  <li className="mt-4"><Skeleton className="h-4 w-2/3 opacity-20" /></li>
                  <li><Skeleton className="h-4 w-1/2 opacity-20" /></li>
                </>
              ) : (
                categories?.slice(0, 4).map((category) => (
                  <li key={category.id}>
                    <Link className="hover:opacity-80 transition-colors" href={getStoreUrl(`/store/shop?category=${category.id}`)} style={{ color: textColor }}>
                      {category.name}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
          {/* Support Links */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest mb-6" style={{ color: 'inherit', opacity: 0.9 }}>Support</h4>
            <ul className="space-y-4 text-sm">
              <li><Link className="hover:opacity-80 transition-colors" href={getStoreUrl('/store/logistics')} style={{ color: textColor }}>Logistics & Shipping</Link></li>
              <li><Link className="hover:opacity-80 transition-colors" href={getStoreUrl('/store/logistics')} style={{ color: textColor }}>Returns Policy</Link></li>
              {isLoadingPages ? (
                <>
                   <li className="mt-4"><Skeleton className="h-4 w-2/3 opacity-20" /></li>
                </>
              ) : (
                supportPages.map(page => (
                  <li key={page.id}><Link className="hover:opacity-80 transition-colors" href={getStoreUrl(`/store/pages/${page.slug}`)} style={{ color: textColor }}>{page.title}</Link></li>
                ))
              )}
            </ul>
          </div>
          {/* Company Links */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest mb-6" style={{ color: 'inherit', opacity: 0.9 }}>Company</h4>
            <ul className="space-y-4 text-sm">
               {isLoadingPages ? (
                <>
                   <li className="mt-4"><Skeleton className="h-4 w-2/3 opacity-20" /></li>
                </>
              ) : (
                companyPages.map(page => (
                  <li key={page.id}><Link className="hover:opacity-80 transition-colors" href={getStoreUrl(`/store/pages/${page.slug}`)} style={{ color: textColor }}>{page.title}</Link></li>
                ))
              )}
            </ul>
          </div>
        </div>
        {footerBannerUrl && (
          <div 
            className={cn(
              "mb-10 w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl transition-all duration-500",
              (footerBannerSize === 'small' || (typeof footerBannerSize === 'number' && footerBannerSize <= 200)) && "max-w-4xl mx-auto"
            )}
            style={typeof footerBannerSize === 'number' ? { height: `${footerBannerSize}px` } : {}}
          >
            <img 
              src={footerBannerUrl} 
              alt="Footer Banner" 
              className={cn(
                "w-full object-cover",
                typeof footerBannerSize === 'number' ? "h-full" : (footerBannerSize === 'small' ? "h-32 md:h-40" : "h-48 md:h-72")
              )} 
              loading="lazy"
            />
          </div>
        )}

        {settings?.showFooterCustomHtml && settings?.footerCustomHtml && (
          <div className="mb-10 w-full overflow-hidden">
            <SafeHtml html={settings.footerCustomHtml} />
          </div>
        )}

        <div className="pt-8 flex flex-col md:flex-row justify-between items-center border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <p className="text-xs mb-4 md:mb-0" style={{ color: textColor, opacity: 0.6 }}>© {new Date().getFullYear()} {showPublicStoreName ? `${storeName}. All rights reserved.` : 'All rights reserved.'}</p>
          <div className="flex items-center gap-4">
          </div>
        </div>
      </div>
    </footer>
  );
}
