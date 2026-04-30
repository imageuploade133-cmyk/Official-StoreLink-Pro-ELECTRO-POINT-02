'use client';

import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  User, 
  Heart, 
  ShoppingBag, 
  Menu, 
  LogOut, 
  LayoutDashboard, 
  Loader2, 
  UserCircle, 
  ChevronDown, 
  Search, 
  ChevronRight, 
  ArrowRight,
  X,
  Zap,
  TrendingUp,
  History,
  Coins,
  Wallet,
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ElysiumLogo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/settings-context';
import { useAuth as useFirebaseAuthInstance, useFirestore, useCollection, useDoc } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { collection, query, orderBy, where, limit, doc } from 'firebase/firestore';
import type { Category, Product, Customer } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/cart-context';
import { useWishlist } from '@/contexts/wishlist-context';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatUtils';
import { calculateEffectivePrice } from '@/lib/pos-utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStoreUrl } from '@/hooks/use-store-url';
import { SearchOverlay } from '@/components/store/SearchOverlay';

export function PublicNavbar() {
    const { settings } = useSettings();
    const [scrolled, setScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, staffMember, isLoading } = useAuth();
    const authInstance = useFirebaseAuthInstance();
    const { toast } = useToast();
    const router = useRouter();
    const { cartCount } = useCart();
    const { wishlistCount } = useWishlist();
    const firestore = useFirestore();
    const { storeId, getStoreUrl } = useStoreUrl();

    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Fetch customer record for balance display
    const customerRef = useMemo(() => (user && firestore) ? doc(firestore, 'customers', user.uid) : null, [user, firestore]);
    const { data: customer } = useDoc<Customer>(customerRef);

    // Fetch categories for the dropdown and search enrichment
    const categoriesQuery = useMemo(() => {
        if (!firestore || !storeId) return null;
        return query(collection(firestore, 'categories'), where('store_id', '==', storeId), orderBy('name'));
    }, [firestore, storeId]);

    const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 10;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [scrolled]);

    useEffect(() => {
        if (isSearchFocused) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [isSearchFocused]);

    const storeName = settings?.storeName || 'StoreLink-Pro';
    const logoUrl = settings?.invoiceLogoUrl;
    const storeLogoWidth = settings?.storeLogoWidth || 120;
    const storeNameFontSize = settings?.storeNameFontSize || 24;
    const showPublicStoreName = settings?.showPublicStoreName ?? true;
    const showMainSiteLogo = settings?.showMainSiteLogo ?? true;

    const navbarStyle = settings?.navbarStyle || 'standard';
    const navbarShowSearch = settings?.navbarShowSearch ?? true;
    const navbarShowWishlist = settings?.navbarShowWishlist ?? true;
    const navbarShowCart = settings?.navbarShowCart ?? true;
    const navbarShowAccount = settings?.navbarShowAccount ?? true;
    const navbarShowThemeToggle = settings?.navbarShowThemeToggle ?? true;
    const navbarShowCreditBadge = settings?.navbarShowCreditBadge ?? true;
    const navbarShowShopLink = settings?.navbarShowShopLink ?? true;
    const navbarShowFlashSalesLink = settings?.navbarShowFlashSalesLink ?? true;
    const navbarShowCollectionsLink = settings?.navbarShowCollectionsLink ?? true;
    const navbarLogoPosition = settings?.navbarLogoPosition || 'left';
    const navbarSticky = settings?.navbarSticky || 'fixed';
    const navbarShadow = settings?.navbarShadow || 'none';
    const navbarBlurEffect = settings?.navbarBlurEffect ?? true;
    const navbarMenuStyle = settings?.navbarMenuStyle || 'dropdown';
    
    const logoContainerHeight = Math.max(32, Math.round(storeLogoWidth * 0.33));
    const navbarPadding = Math.max(16, Math.round(logoContainerHeight * 0.5));
    
    const heightMap = { compact: 48, default: 64, expanded: 80, full: 100 };
    const navbarHeight = settings?.navbarHeight ? (heightMap[settings.navbarHeight as keyof typeof heightMap] || 64) : (logoContainerHeight + (navbarPadding * 2));

    const Logo = () => (
      <Link href={getStoreUrl('/store')} className="flex items-center gap-3 text-lg font-semibold group" onClick={() => setIsMenuOpen(false)}>
        {showMainSiteLogo && logoUrl ? (
          <div style={{ width: `${storeLogoWidth}px`, height: `${logoContainerHeight}px` }} className="relative flex items-center">
            <Image 
                src={logoUrl} 
                alt={storeName}
                fill
                sizes={`${storeLogoWidth}px`}
                className={cn(
                    "object-contain transition-transform duration-500",
                    settings?.enableHoverZoom !== false && "group-hover:scale-105"
                )}
                unoptimized
            />
        </div>
        ) : showMainSiteLogo ? (
          <ElysiumLogo className="h-8 w-8 text-[#0071e3]" />
        ) : null}
        {showPublicStoreName && (
          <span 
              className={'font-black tracking-tighter text-[#1d1d1f] dark:text-white group-hover:opacity-80 transition-opacity whitespace-pre-wrap break-words leading-tight max-w-[150px] sm:max-w-[200px] md:max-w-[250px]'}
              style={{ fontSize: `${storeNameFontSize}px` }}
          >
            {storeName}
          </span>
        )}
      </Link>
    );

    const getInitials = (email?: string | null) => {
        if (!email) return 'U';
        const parts = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').split(' ').filter(Boolean);
        return parts.length > 1 ? (parts[0][0] + (parts[1][0] || '')).toUpperCase() : email.substring(0, 2).toUpperCase();
    };

    const handleLogout = async () => {
        await signOut(authInstance);
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push(getStoreUrl('/store'));
    };

    const getNavbarClasses = () => {
        const baseClasses = "z-50 w-full border-b transition-all duration-500 ease-in-out";
        const positionClass = navbarSticky === 'fixed' ? 'fixed top-0' : navbarSticky === 'sticky' ? 'sticky top-0' : 'relative';
        const blurClass = navbarBlurEffect ? "backdrop-blur-xl" : "";
        const shadowClass = navbarShadow !== 'none' ? `shadow-${navbarShadow}` : 'shadow-none';

        let styleClasses = "";
        if (scrolled || navbarStyle === 'glass' || navbarStyle === 'solid') {
            if (navbarStyle === 'solid') {
                styleClasses = "bg-white dark:bg-black border-black/[0.05] dark:border-white/[0.05]";
            } else {
                styleClasses = `bg-white/70 dark:bg-black/70 ${blurClass} border-black/[0.05] dark:border-white/[0.05] ${shadowClass}`;
            }
        } else if (navbarStyle === 'transparent') {
            styleClasses = "bg-transparent border-transparent shadow-none";
        } else if (navbarStyle === 'minimal') {
            styleClasses = scrolled ? "bg-white/70 dark:bg-black/70 border-b border-black/[0.05] dark:border-white/[0.05] shadow-sm" : "bg-transparent border-transparent";
        } else {
            styleClasses = scrolled 
                ? `bg-white/70 dark:bg-black/70 ${blurClass} border-black/[0.05] dark:border-white/[0.05] ${shadowClass}`
                : "bg-transparent border-transparent shadow-none";
        }

        return cn(baseClasses, positionClass, styleClasses);
    };

    return (
        <nav className={getNavbarClasses()}>
          <div className="max-w-site-container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center relative" style={{ height: `${navbarHeight}px` }}>
                  <div className={cn(
                      "flex-shrink-0 flex items-center pr-4 transition-all duration-500",
                      navbarLogoPosition === 'center' ? "absolute left-1/2 -translate-x-1/2" : 
                      navbarLogoPosition === 'right' ? "order-3 pl-4 pr-0" : "order-1"
                  )}>
                    <Logo />
                  </div>
                  
                  {navbarShowSearch && (
                      <div className={cn(
                          "hidden lg:flex flex-1 max-w-md mx-12 relative",
                          navbarLogoPosition === 'center' ? "order-1" : "order-2"
                      )} ref={searchContainerRef}>
                        <div className="w-full relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                                <Search className="h-4 w-4" strokeWidth={2.5} />
                            </div>
                            <Input 
                                readOnly
                                className="w-full pl-11 pr-12 bg-black/[0.03] dark:bg-white/[0.03] border-[1.5px] border-black/5 dark:border-white/5 rounded-full h-10 text-xs font-medium tracking-tight cursor-pointer transition-all hover:bg-white dark:hover:bg-black hover:border-[#0071e3]/30 hover:shadow-md active:scale-[0.98]"
                                placeholder="Search"
                                onClick={() => setIsSearchFocused(true)}
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center">
                                <div className="h-5 px-1.5 rounded-md border border-black/[0.05] dark:border-white/[0.05] bg-white dark:bg-black flex items-center justify-center text-[9px] font-bold text-slate-400 opacity-60 shadow-sm pointer-events-none uppercase tracking-tighter">
                                    /
                                </div>
                            </div>
                        </div>
                      </div>
                  )}

                  <div className={cn(
                      "flex items-center gap-3",
                      navbarLogoPosition === 'center' ? "order-3 ml-auto" : "order-3"
                  )}>
                    <div className="hidden lg:flex items-center gap-6 mr-6 font-semibold text-[13px] tracking-tight">
                        {navbarShowShopLink && (
                            <Link className="text-[#1d1d1f] dark:text-[#f5f5f7] hover:text-[#0071e3] dark:hover:text-[#0071e3] transition-colors py-2" href={getStoreUrl('/store/shop')} onClick={() => setIsMenuOpen(false)}>
                            Shop
                            </Link>
                        )}
                        
                        {navbarShowFlashSalesLink && (
                            <Link className="text-[#1d1d1f] dark:text-[#f5f5f7] hover:text-rose-600 transition-colors py-2" href={getStoreUrl('/store/flash-sales')} onClick={() => setIsMenuOpen(false)}>
                            Flash Sales
                            </Link>
                        )}

                        {navbarShowCollectionsLink && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="text-[#1d1d1f] dark:text-[#f5f5f7] hover:text-[#0071e3] dark:hover:text-[#0071e3] transition-colors p-0 h-auto font-semibold text-[13px] tracking-tight flex items-center gap-1.5 group">
                                        Collections
                                        <ChevronDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-transform group-data-[state=open]:rotate-180" strokeWidth={2.5} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                    align="start" 
                                    sideOffset={12}
                                    className="w-72 p-4 rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.2)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.6)] border-[3px] border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-3xl animate-in fade-in slide-in-from-top-3 duration-500"
                                >
                                    <div className="max-h-[480px] overflow-y-auto py-1 pr-1 custom-scrollbar">
                                        {isLoadingCategories ? (
                                            <div className="p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                                <Loader2 className="h-5 w-5 animate-spin text-[#0071e3]" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Updating Registry</span>
                                            </div>
                                        ) : (
                                            categories?.map(category => (
                                                <DropdownMenuItem key={category.id} asChild className="cursor-pointer p-2.5 hover:bg-[#0071e3]/5 focus:bg-[#0071e3]/5 rounded-[1.5rem] mx-1 my-1 transition-all duration-300 group/item border border-transparent hover:border-[#0071e3]/10 focus:border-[#0071e3]/10">
                                                    <Link href={getStoreUrl(`/store/shop?category=${category.id}`)} className="flex items-center gap-4 w-full" onClick={() => setIsMenuOpen(false)}>
                                                        <div className="relative h-11 w-11 rounded-[1rem] overflow-hidden bg-slate-100 dark:bg-slate-900 flex-shrink-0 shadow-sm border border-black/5 dark:border-white/5 transition-all duration-500 group-hover/item:scale-110 group-hover/item:rotate-2">
                                                            <Image
                                                                src={category.imageUrl || `https://picsum.photos/seed/${category.id}/100/100`}
                                                                alt={category.name}
                                                                fill
                                                                className="object-cover"
                                                                unoptimized
                                                            />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-black text-[14px] tracking-tight text-slate-800 dark:text-slate-100 group-hover/item:text-[#0071e3] transition-colors truncate">{category.name}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-0 group-hover/item:opacity-100 transition-all -translate-y-1 group-hover:translate-y-0">Discover</span>
                                                        </div>
                                                    </Link>
                                                </DropdownMenuItem>
                                            ))
                                        )}
                                    </div>
                                    <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10 mx-2 my-3 h-[2px]" />
                                    <DropdownMenuItem asChild className="cursor-pointer p-3 focus:bg-[#0071e3] focus:text-white rounded-2xl m-1 transition-all group/all">
                                        <Link href={getStoreUrl('/store/categories')} className="flex items-center justify-between font-black uppercase text-[9px] tracking-widest w-full text-[#0071e3] group-hover/all:text-white" onClick={() => setIsMenuOpen(false)}>
                                            View All Collections <ChevronRight className="h-3 w-3 transition-transform group-hover/all:translate-x-1" />
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5">
                        {navbarShowCreditBadge && user && customer && (
                            <Link 
                                href={getStoreUrl('/store/account')}
                                className="hidden md:flex items-center gap-2 bg-[#0071e3]/10 text-[#0071e3] px-3 py-1 rounded-full border border-[#0071e3]/10 shadow-sm hover:bg-[#0071e3] hover:text-white transition-all duration-300 group/credit active:scale-95"
                            >
                                <Coins className="h-3.5 w-3.5 group-hover/credit:rotate-12 transition-transform" strokeWidth={2.5} />
                                <span className="text-[10px] font-bold uppercase tracking-tight">
                                    {formatCurrency(customer.creditBalance || 0, settings?.currency || '$')}
                                </span>
                            </Link>
                        )}
                        {navbarShowAccount && (
                            <UserButton isLoading={isLoading} user={user} staffMember={staffMember} router={router} handleLogout={handleLogout} getInitials={getInitials} getStoreUrl={getStoreUrl} />
                        )}
                        {navbarShowSearch && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="lg:hidden h-10 w-10 rounded-full text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                                onClick={() => setIsSearchFocused(true)}
                            >
                                <Search className="h-5 w-5" strokeWidth={2} />
                            </Button>
                        )}

                        {navbarShowWishlist && (
                            <Button asChild variant="ghost" size="icon" className="group hidden sm:inline-flex h-10 w-10 rounded-full text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] relative transition-all">
                                <Link href={getStoreUrl('/store/wishlist')}>
                                    <Heart className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", wishlistCount > 0 && "fill-current text-rose-500")} />
                                    {wishlistCount > 0 && (
                                        <span className="absolute top-1 right-1 h-3.5 w-3.5 bg-rose-500 text-white text-[8px] flex items-center justify-center rounded-full font-bold border-2 border-white dark:border-black animate-in zoom-in duration-300">
                                            {wishlistCount}
                                        </span>
                                    )}
                                </Link>
                            </Button>
                        )}
                        {navbarShowCart && (
                            <Button asChild variant="ghost" size="icon" className="group h-10 w-10 rounded-full text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] relative transition-all">
                            <Link href={getStoreUrl('/store/cart')}>
                                <ShoppingBag className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", cartCount > 0 && "text-[#0071e3]")} />
                                {cartCount > 0 && (
                                    <span className="absolute top-1 right-1 h-3.5 w-3.5 bg-[#0071e3] text-white text-[8px] flex items-center justify-center rounded-full font-bold border-2 border-white dark:border-black animate-in zoom-in duration-300">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                            </Button>
                        )}

                        {navbarShowThemeToggle && (
                            <ThemeToggle className="h-10 w-10 rounded-full text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-all" />
                        )}
                        
                        {(navbarMenuStyle !== 'none') && (
                            <div className="md:hidden">
                            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                                <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]">
                                    <Menu className="h-5 w-5" strokeWidth={2} />
                                    <span className="sr-only">Open menu</span>
                                </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="w-full sm:w-[400px] border-none shadow-2xl p-0 overflow-hidden bg-white/95 dark:bg-black/95 backdrop-blur-xl">
                                <div className="h-full flex flex-col px-10 py-16">
                                    <SheetHeader className="p-0 text-left mb-10">
                                        <SheetTitle className="text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-white">Menu</SheetTitle>
                                        <SheetDescription className="sr-only">Access categories, shop items, and your account settings.</SheetDescription>
                                    </SheetHeader>
                                    
                                    <ScrollArea className="flex-1 -mx-4 px-4">
                                        <nav className="flex flex-col space-y-4">
                                            <Link className="text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white hover:text-[#0071e3] dark:hover:text-[#0071e3] transition-colors" href={getStoreUrl("/store")} onClick={() => setIsMenuOpen(false)}>
                                                Home
                                            </Link>
                                            {navbarShowShopLink && (
                                                <Link className="text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white hover:text-[#0071e3] dark:hover:text-[#0071e3] transition-colors" href={getStoreUrl("/store/shop")} onClick={() => setIsMenuOpen(false)}>
                                                    Shop
                                                </Link>
                                            )}
                                            {navbarShowFlashSalesLink && (
                                                <Link className="text-2xl font-semibold tracking-tight text-rose-600 hover:text-rose-500 transition-colors" href={getStoreUrl("/store/flash-sales")} onClick={() => setIsMenuOpen(false)}>
                                                    Flash Sales
                                                </Link>
                                            )}
                                            <Link className="text-2xl font-semibold tracking-tight text-[#1d1d1f] dark:text-white hover:text-[#0071e3] dark:hover:text-[#0071e3] transition-colors" href={getStoreUrl("/store/account")} onClick={() => setIsMenuOpen(false)}>
                                                Account
                                            </Link>
                                        </nav>
                                        
                                        {navbarShowCollectionsLink && (
                                            <div className="mt-12">
                                                <div className="flex items-center justify-between mb-6">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0071e3]">Collections</p>
                                                    <Link href={getStoreUrl('/store/categories')} className="text-[10px] font-black uppercase tracking-widest text-slate-400" onClick={() => setIsMenuOpen(false)}>View All</Link>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    {categories?.slice(0, 10).map(cat => (
                                                        <Link 
                                                            key={cat.id} 
                                                            href={getStoreUrl(`/store/shop?category=${cat.id}`)} 
                                                            className="flex items-center gap-4 py-3 border-b border-black/[0.03] dark:border-white/[0.03] last:border-0 group px-2 -mx-2 active:bg-black/[0.02] dark:active:bg-white/[0.02] rounded-xl transition-colors" 
                                                            onClick={() => setIsMenuOpen(false)}
                                                        >
                                                            <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0 shadow-sm">
                                                                <Image
                                                                    src={cat.imageUrl || `https://picsum.photos/seed/${cat.id}/100/100`}
                                                                    alt={cat.name}
                                                                    width={48}
                                                                    height={48}
                                                                    className="object-cover h-full w-full"
                                                                    unoptimized
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[17px] font-bold tracking-tight text-[#1d1d1f] dark:text-white group-active:text-[#0071e3] transition-colors">{cat.name}</span>
                                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Shop Collection</span>
                                                            </div>
                                                            <ChevronRight className="h-4 w-4 ml-auto text-slate-300 group-active:text-[#0071e3] transition-all" />
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </ScrollArea>

                                    <div className="mt-auto pt-10">
                                        {navbarShowAccount && !user ? (
                                            <div className="flex flex-col gap-4">
                                                <Button asChild className="w-full h-12 rounded-full font-bold bg-[#0071e3] text-white" onClick={() => setIsMenuOpen(false)}>
                                                    <Link href={getStoreUrl("/store/signup")}>Join StoreLink Pro</Link>
                                                </Button>
                                                <Button asChild variant="ghost" className="w-full h-12 rounded-full font-bold text-[#0071e3]" onClick={() => setIsMenuOpen(false)}>
                                                    <Link href={getStoreUrl("/store/login")}>Sign In</Link>
                                                </Button>
                                            </div>
                                        ) : user && (
                                            <Button onClick={() => {handleLogout(); setIsMenuOpen(false);}} variant="ghost" className="w-full h-12 rounded-full font-bold text-rose-600 justify-start px-0">
                                                <LogOut className="mr-2 h-5 w-5" /> Sign Out
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                </SheetContent>
                            </Sheet>
                            </div>
                        )}
                    </div>
                  </div>
              </div>
          </div>

          <SearchOverlay open={isSearchFocused} onOpenChange={setIsSearchFocused} />
        </nav>
    );
}

function UserButton({ isLoading, user, staffMember, router, handleLogout, getInitials, getStoreUrl }: { 
    isLoading: boolean, 
    user: any, 
    staffMember: any, 
    router: any, 
    handleLogout: () => void, 
    getInitials: (email?: string | null) => string,
    getStoreUrl: (path: string) => string
}) {
    if (isLoading) {
        return <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-slate-600 dark:text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></Button>
    }
    if (user) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hidden sm:inline-flex rounded-full border-2 border-transparent hover:border-[#0071e3]/20 p-0.5 transition-all">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} className="object-cover" />
                            <AvatarFallback className="font-bold text-xs">{getInitials(user.email)}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-black/[0.05] dark:border-white/[0.05] bg-white/90 dark:bg-black/90 backdrop-blur-xl">
                    <DropdownMenuLabel className="p-4">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-black leading-none">{user.displayName || 'You'}</p>
                            <p className="text-[10px] font-medium leading-none text-muted-foreground uppercase tracking-widest mt-1">
                            {user.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-black/[0.05] dark:bg-white/[0.05]" />
                    <DropdownMenuItem onClick={() => router.push(getStoreUrl('/store/account'))} className="cursor-pointer p-3 focus:bg-[#0071e3]/10 rounded-xl mx-1 my-1">
                        <UserCircle className="mr-3 h-4 w-4 text-[#0071e3]" />
                        <span className="font-bold">My Account</span>
                    </DropdownMenuItem>
                    {staffMember && (
                        <DropdownMenuItem onClick={() => router.push('/dashboard')} className="cursor-pointer p-3 focus:bg-[#0071e3]/10 rounded-xl mx-1 my-1">
                            <LayoutDashboard className="mr-3 h-4 w-4 text-[#0071e3]" />
                            <span className="font-bold">Staff Dashboard</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-black/[0.05] dark:bg-white/[0.05]" />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer p-3 focus:bg-destructive/5 text-destructive rounded-xl mx-1 my-1">
                        <LogOut className="mr-3 h-4 w-4" />
                        <span className="font-bold">Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }
    return (
        <div className="hidden sm:flex items-center gap-3 ml-2">
            <Button variant="ghost" asChild className="text-[12px] font-bold tracking-tight h-8 px-3 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] rounded-full">
                <Link href={getStoreUrl('/store/login')}>Sign In</Link>
            </Button>
            <Button asChild className="bg-[#0071e3] text-white hover:bg-[#0077ed] rounded-full px-4 font-bold text-[12px] tracking-tight h-8 shadow-sm">
                <Link href={getStoreUrl('/store/signup')}>Sign Up</Link>
            </Button>
        </div>
    )
}
