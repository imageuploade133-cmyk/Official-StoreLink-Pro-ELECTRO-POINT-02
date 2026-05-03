
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, Link as LinkIcon, MapPin } from 'lucide-react';
import { StoreLinkLogo } from '@/components/icons';
import { useSettings } from '@/contexts/settings-context';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { Category, PublicPage } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

import { useStoreUrl } from '@/hooks/use-store-url';
import { SafeHtml } from '../SafeHtml';

export function PublicFooter() {
  const { settings } = useSettings();
  const { storeId, getStoreUrl } = useStoreUrl();
  const firestore = useFirestore();
  const storeName = settings?.storeName || 'StoreLink Pro';
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
    if (footerDesign === 'apple') {
      return {
        backgroundColor: '#f5f5f7',
        color: '#6e6e73'
      };
    }
    return { color: '#94a3b8' };
  }, [settings, footerDesign]);

  const hasCustomBg = !!(settings?.footerColorBackground || (settings?.footerBackgroundStyle === 'gradient' && settings.footerBackgroundGradientStart));
  const textColor = settings?.footerTextColor || '#94a3b8';

  return (
    <footer 
        className={cn(
          "pt-20 pb-10 transition-all duration-700 relative z-0 overflow-hidden", 
          !hasCustomBg && (footerDesign === 'apple' ? "bg-[#f5f5f7] dark:bg-[#161617] text-[#6e6e73] dark:text-[#a1a1a6]" : "bg-background-dark text-slate-400")
        )} 
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
                {settings.webWatermarkText || 'StoreLink Pro'}
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

      <div className="max-w-site-container mx-auto px-4 sm:px-6 lg:px-8 relative z-0">
        {footerDesign === 'apple' ? (
          <div className="flex flex-col">
            {/* Apple Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-5 gap-8 mb-10">
              <div className="space-y-8">
                <div className="space-y-3">
                  <h4 className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Shop</h4>
                  <ul className="space-y-2 text-[12px]">
                    <li><Link className="hover:underline" href={getStoreUrl('/store/shop')}>All Products</Link></li>
                    <li><Link className="hover:underline" href={getStoreUrl('/store/categories')}>All Categories</Link></li>
                    {isLoadingCategories ? (
                      <li className="pt-1 space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-24" /></li>
                    ) : (
                      categories?.slice(0, 6).map(c => (
                        <li key={c.id}><Link className="hover:underline" href={getStoreUrl(`/store/shop?category=${c.id}`)}>{c.name}</Link></li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <h4 className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Support</h4>
                  <ul className="space-y-2 text-[12px]">
                    <li><Link className="hover:underline" href={getStoreUrl('/store/logistics')}>Logistics & Shipping</Link></li>
                    <li><Link className="hover:underline" href={getStoreUrl('/store/logistics')}>Returns Policy</Link></li>
                    {isLoadingPages ? (
                      <li className="pt-1"><Skeleton className="h-3 w-20" /></li>
                    ) : (
                      supportPages.map(p => (
                        <li key={p.id}><Link className="hover:underline" href={getStoreUrl(`/store/pages/${p.slug}`)}>{p.title}</Link></li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <h4 className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Company</h4>
                  <ul className="space-y-2 text-[12px]">
                    {isLoadingPages ? (
                      <li className="pt-1"><Skeleton className="h-3 w-20" /></li>
                    ) : (
                      companyPages.map(p => (
                        <li key={p.id}><Link className="hover:underline" href={getStoreUrl(`/store/pages/${p.slug}`)}>{p.title}</Link></li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <h4 className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Account</h4>
                  <ul className="space-y-2 text-[12px]">
                    <li><Link className="hover:underline" href={getStoreUrl('/store/account')}>Manage Account</Link></li>
                    <li><Link className="hover:underline" href={getStoreUrl('/store/login')}>Login</Link></li>
                    <li><Link className="hover:underline" href={getStoreUrl('/store/signup')}>Create Account</Link></li>
                  </ul>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <h4 className="text-[12px] font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Contact & Social</h4>
                  <ul className="space-y-2 text-[12px]">
                    {storePhone && <li><a href={`tel:${storePhone}`} className="hover:underline">{storePhone}</a></li>}
                    {storeEmail && <li><a href={`mailto:${storeEmail}`} className="hover:underline">{storeEmail}</a></li>}
                  </ul>
                  <div className="flex gap-4 pt-2">
                    {settings?.socialMediaLinks?.map((link) => (
                      <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity">
                        {link.iconUrl ? (
                          <Image src={link.iconUrl} alt={link.name} width={18} height={18} className="h-[18px] w-[18px] grayscale dark:invert" unoptimized />
                        ) : (
                          <LinkIcon className="h-[18px] w-[18px]" />
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Apple Mobile Accordion */}
            <div className="md:hidden mb-10 border-t border-black/5 dark:border-white/5">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="shop" className="border-b border-black/5 dark:border-white/5">
                  <AccordionTrigger className="text-[12px] py-4 hover:no-underline font-normal text-[#1d1d1f] dark:text-[#f5f5f7]">Shop</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-3 pb-4 pl-4 text-[12px]">
                      <li><Link href={getStoreUrl('/store/shop')}>All Products</Link></li>
                      <li><Link href={getStoreUrl('/store/categories')}>All Categories</Link></li>
                      {categories?.map(c => <li key={c.id}><Link href={getStoreUrl(`/store/shop?category=${c.id}`)}>{c.name}</Link></li>)}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="support" className="border-b border-black/5 dark:border-white/5">
                  <AccordionTrigger className="text-[12px] py-4 hover:no-underline font-normal text-[#1d1d1f] dark:text-[#f5f5f7]">Support</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-3 pb-4 pl-4 text-[12px]">
                      <li><Link href={getStoreUrl('/store/logistics')}>Shipping</Link></li>
                      <li><Link href={getStoreUrl('/store/logistics')}>Returns</Link></li>
                      {supportPages.map(p => <li key={p.id}><Link href={getStoreUrl(`/store/pages/${p.slug}`)}>{p.title}</Link></li>)}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="company" className="border-b border-black/5 dark:border-white/5">
                  <AccordionTrigger className="text-[12px] py-4 hover:no-underline font-normal text-[#1d1d1f] dark:text-[#f5f5f7]">Company</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-3 pb-4 pl-4 text-[12px]">
                      {companyPages.map(p => <li key={p.id}><Link href={getStoreUrl(`/store/pages/${p.slug}`)}>{p.title}</Link></li>)}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="account" className="border-b border-black/5 dark:border-white/5">
                  <AccordionTrigger className="text-[12px] py-4 hover:no-underline font-normal text-[#1d1d1f] dark:text-[#f5f5f7]">Account</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-3 pb-4 pl-4 text-[12px]">
                      <li><Link href={getStoreUrl('/store/account')}>Manage Account</Link></li>
                      <li><Link href={getStoreUrl('/store/login')}>Login</Link></li>
                      <li><Link href={getStoreUrl('/store/signup')}>Create Account</Link></li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="text-[12px] text-[#86868b] mb-4">
              <p>More ways to shop: <Link href={getStoreUrl('/store/shop')} className="text-[#0066cc] dark:text-[#2997ff] hover:underline">Find a product</Link> or <Link href={getStoreUrl('/store/categories')} className="text-[#0066cc] dark:text-[#2997ff] hover:underline">browse categories</Link>. Or call {storePhone || 'our support'}.</p>
            </div>
            <Separator className="bg-black/10 dark:bg-white/10 mb-6" />
            <div className="flex flex-col md:flex-row justify-between gap-4 text-[12px] text-[#86868b] pb-10">
              <div className="flex flex-col md:flex-row gap-4 md:items-center">
                <p>Copyright © {new Date().getFullYear()} {storeName}. All rights reserved.</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <Link href="#" className="hover:underline">Privacy Policy</Link>
                  <Separator orientation="vertical" className="h-3 bg-black/10 dark:bg-white/10 hidden md:block" />
                  <Link href="#" className="hover:underline">Terms of Use</Link>
                  <Separator orientation="vertical" className="h-3 bg-black/10 dark:bg-white/10 hidden md:block" />
                  <Link href="#" className="hover:underline">Sales Policy</Link>
                  <Separator orientation="vertical" className="h-3 bg-black/10 dark:bg-white/10 hidden md:block" />
                  <Link href="#" className="hover:underline">Legal</Link>
                  <Separator orientation="vertical" className="h-3 bg-black/10 dark:bg-white/10 hidden md:block" />
                  <Link href="#" className="hover:underline">Site Map</Link>
                </div>
              </div>
              <p className="md:text-right">{storeAddress || 'Global'}</p>
            </div>
          </div>
        ) : (
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
                  <StoreLinkLogo className="h-6 w-6" style={{ color: textColor }} />
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
        )}

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

        {footerDesign !== 'apple' && (
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-xs mb-4 md:mb-0" style={{ color: textColor, opacity: 0.6 }}>© {new Date().getFullYear()} {showPublicStoreName ? `${storeName}. All rights reserved.` : 'All rights reserved.'}</p>
            <div className="flex items-center gap-4">
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
