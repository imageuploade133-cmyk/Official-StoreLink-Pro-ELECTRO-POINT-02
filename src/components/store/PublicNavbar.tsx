'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { cn, convertToDateSafely } from '@/lib/utils';
import { useSettings } from '@/contexts/settings-context';
import { useAuth as useFirebaseAuthInstance, useFirestore, useCollection, useDoc } from '@/firebase';
import { useAuth } from '@/contexts/auth-context';
import { collection, query, orderBy, where, limit, doc } from 'firebase/firestore';
import type { Category, Product, HomepageSection, Customer } from '@/lib/types';
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

    const [navbarSearch, setNavbarSearch] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // Fetch customer record for balance display
    const customerRef = useMemo(() => (user && firestore) ? doc(firestore, 'customers', user.uid) : null, [user, firestore]);
    const { data: customer } = useDoc<Customer>(customerRef);

    // Fetch categories for the dropdown and search enrichment
    const categoriesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'categories'), orderBy('name'));
    }, [firestore]);

    const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);

    // Fetch products for live search - Substring Discovery Active
    const productsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'products'), 
            where('isVisibleOnWeb', '==', true),
            limit(1000) 
        );
    }, [firestore]);

    const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

    // ROBUST SEARCH ENGINE: Substring matching + Semantic Tag Recognition
    const { searchResults, categoryMatches, similarSuggestions } = useMemo(() => {
        const term = navbarSearch.toLowerCase().trim();
        if (!term || !products) return { searchResults: [], categoryMatches: [], similarSuggestions: [] };

        let directMatches: Product[] = [];

        // Semantic Switch: Check for pre-defined tags
        if (term === 'new arrivals') {
            directMatches = products.filter(p => p.isNewArrival);
        } else if (term === 'best sellers') {
            directMatches = products.filter(p => p.isPopular);
        } else if (term === 'clearance') {
            directMatches = products.filter(p => p.isOldStock);
        } else if (term === 'flash hub') {
            directMatches = products.filter(p => p.promo?.isActive);
        } else if (term === 'luxury') {
            directMatches = products.filter(p => p.isOfficialBrand || p.dataAiHint?.toLowerCase().includes('luxury'));
        } else if (term === 'essential') {
            directMatches = products.filter(p => p.dataAiHint?.toLowerCase().includes('essential') || p.description?.toLowerCase().includes('essential'));
        } else {
            // Standard Substring Discovery
            directMatches = products.filter(p => 
                p.name.toLowerCase().includes(term) || 
                p.sku?.toLowerCase().includes(term) ||
                p.dataAiHint?.toLowerCase().includes(term)
            );
        }

        // 2. Category Matches
        const catMatches = (categories || []).filter(c => 
            c.name.toLowerCase().includes(term)
        );

        // 3. Similar Suggestions (Correlation via Category)
        let suggestions: Product[] = [];
        if (directMatches.length > 0) {
            const topCategory = directMatches[0].categoryId;
            suggestions = products.filter(p => 
                p.categoryId === topCategory && 
                !directMatches.find(dm => dm.id === p.id)
            ).slice(0, 4);
        } else if (catMatches.length > 0) {
            const catId = catMatches[0].id;
            suggestions = products.filter(p => p.categoryId === catId).slice(0, 4);
        }

        return { 
            searchResults: directMatches.slice(0, 10), 
            categoryMatches: catMatches.slice(0, 3),
            similarSuggestions: suggestions
        };
    }, [navbarSearch, products, categories]);

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

    // Prevent body scroll when search is focused
    useEffect(() => {
        if (isSearchFocused) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isSearchFocused]);

    const storeName = settings?.storeName || 'StoreLink-Pro';
    const logoUrl = settings?.invoiceLogoUrl;
    const storeLogoWidth = settings?.storeLogoWidth || 120;
    const storeNameFontSize = settings?.storeNameFontSize || 24;
    const showPublicStoreName = settings?.showPublicStoreName ?? true;
    const showMainSiteLogo = settings?.showMainSiteLogo ?? true;
    
    // Proportional scaling: Logo height is ~33% of width (typical logo aspect ratio)
    // Navbar padding scales with logo height to maintain visual balance
    const logoContainerHeight = Math.max(32, Math.round(storeLogoWidth * 0.33));
    const navbarPadding = Math.max(16, Math.round(logoContainerHeight * 0.5));
    const navbarHeight = logoContainerHeight + (navbarPadding * 2);

    const handleNavbarSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (navbarSearch.trim()) {
            router.push(`/store/search?q=${encodeURIComponent(navbarSearch.trim())}`);
            setIsSearchFocused(false);
            setNavbarSearch('');
        }
    };

    const Logo = () => (
      <Link href="/store" className="flex items-center gap-3 text-lg font-semibold group" onClick={() => setIsMenuOpen(false)}>
        {showMainSiteLogo && logoUrl ? (
          <div style={{ width: `${storeLogoWidth}px`, height: `${logoContainerHeight}px` }} className="relative flex items-center">
            <Image 
                src={logoUrl} 
                alt={storeName}
                fill
                sizes={`${storeLogoWidth}px`}
                className="object-contain transition-transform duration-500 group-hover:scale-105"
                unoptimized
            />
        </div>
        ) : showMainSiteLogo ? (
          <ElysiumLogo className="h-8 w-8 text-primary" />
        ) : null}
        {showPublicStoreName && (
          <span 
              className={'font-black tracking-tighter text-primary group-hover:opacity-80 transition-opacity'}
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
         if (parts.length > 1) {
            return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
        }
        if (parts.length === 1 && parts[0].length > 1) {
          return parts[0].substring(0,2).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    };

    const handleLogout = async () => {
        await signOut(authInstance);
        toast({
            title: "Logged Out",
            description: "You have been successfully logged out.",
        });
        router.push('/store');
    };

    return (
        <nav className={cn(
            "fixed top-0 z-50 w-full border-b transition-all duration-500 ease-in-out",
            scrolled 
                ? "border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-xl" 
                : "border-transparent bg-transparent"
        )}>
          <div className="max-w-site-container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center" style={{ height: `${navbarHeight}px` }}>
                  <div className="flex-shrink-0 flex items-center pr-4">
                    <Logo />
                  </div>
                  
                  <div className="hidden lg:flex flex-1 max-w-lg mx-12 relative" ref={searchContainerRef}>
                    <div className="w-full relative group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400">
                            <Search className="h-5 w-5" strokeWidth={2.5} />
                        </div>
                        <Input 
                            readOnly
                            className="w-full pl-14 pr-12 bg-slate-100/40 dark:bg-slate-800/40 border-2 border-primary/10 animate-border-glow hover:border-primary/40 rounded-[2rem] h-12 text-sm font-bold tracking-tight cursor-pointer shadow-inner"
                            placeholder="Find products, categories or SKUs..."
                            onClick={() => setIsSearchFocused(true)}
                        />
                        <div className="absolute inset-y-0 right-4 flex items-center">
                            <div className="h-6 w-10 rounded-md border bg-white dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 opacity-50 shadow-sm pointer-events-none uppercase tracking-tighter">
                                Click
                            </div>
                        </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden lg:flex items-center gap-8 mr-8 font-black text-xs uppercase tracking-[0.2em]">
                        <Link className="hover:text-primary transition-colors relative group py-2" href="/store/shop" onClick={() => setIsMenuOpen(false)}>
                        Shop
                        <span className="absolute bottom-0 left-0 h-0.5 bg-primary w-0 transition-all duration-300 ease-out group-hover:w-full rounded-full"></span>
                        </Link>
                        
                        <Link className="hover:text-rose-600 transition-colors relative group py-2 flex items-center gap-2" href="/store/flash-sales" onClick={() => setIsMenuOpen(false)}>
                        Flash Sales
                        <span className="absolute bottom-0 left-0 h-0.5 bg-rose-600 w-0 transition-all duration-300 ease-out group-hover:w-full rounded-full"></span>
                        </Link>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="hover:text-primary transition-colors p-0 m-0 h-auto font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                                    Collections
                                    <ChevronDown className="h-3.5 w-3.5 opacity-50" strokeWidth={3} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-72 p-2 rounded-3xl shadow-2xl border-slate-200 dark:border-slate-800">
                                <DropdownMenuLabel className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Discover</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <div className="max-h-[400px] overflow-y-auto py-2">
                                    {isLoadingCategories ? (
                                        <div className="p-4 flex items-center gap-3 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-xs font-bold uppercase">Syncing...</span>
                                        </div>
                                    ) : (
                                        categories?.map(category => (
                                            <DropdownMenuItem key={category.id} asChild className="cursor-pointer p-3 focus:bg-primary/5 rounded-2xl mx-1 my-0.5">
                                                <Link href={`/store/shop?category=${category.id}`} className="flex items-center gap-4 w-full" onClick={() => setIsMenuOpen(false)}>
                                                    <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-muted flex-shrink-0 shadow-sm">
                                                        <Image
                                                            src={category.imageUrl || `https://picsum.photos/seed/${category.id}/100/100`}
                                                            alt={category.name}
                                                            fill
                                                            className="object-cover"
                                                            unoptimized
                                                        />
                                                    </div>
                                                    <span className="font-bold text-sm tracking-tight">{category.name}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        ))
                                    )}
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="cursor-pointer p-4 focus:bg-primary text-primary focus:text-white rounded-2xl m-1 transition-all">
                                    <Link href="/store/categories" className="flex items-center justify-between font-black uppercase text-[10px] tracking-widest w-full" onClick={() => setIsMenuOpen(false)}>
                                        View All Collections <ChevronRight className="h-3 w-3" />
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                        {user && customer && (
                            <Link 
                                href="/store/account"
                                className="hidden md:flex items-center gap-2.5 bg-primary/10 text-primary px-4 py-1.5 rounded-full border border-primary/20 shadow-sm hover:bg-primary hover:text-white transition-all duration-500 group/credit active:scale-95"
                            >
                                <Coins className="h-3.5 w-3.5 group-hover/credit:rotate-12 transition-transform" strokeWidth={3} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    Bonus: {formatCurrency(customer.creditBalance || 0, settings?.currency || '$')}
                                </span>
                            </Link>
                        )}
                        <UserButton isLoading={isLoading} user={user} staffMember={staffMember} router={router} handleLogout={handleLogout} getInitials={getInitials} />
                        <Button asChild variant="ghost" size="icon" className="group hidden sm:inline-flex h-11 w-11 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 relative transition-all">
                            <Link href="/store/wishlist">
                                <Heart className={cn("h-5.5 w-5.5 transition-transform duration-300 group-hover:scale-110", wishlistCount > 0 && "fill-current text-rose-500")} />
                                {wishlistCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-rose-500 text-white text-[9px] flex items-center justify-center rounded-full font-black border-2 border-white dark:border-slate-900 animate-in zoom-in duration-300">
                                        {wishlistCount}
                                    </span>
                                )}
                            </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon" className="group h-11 w-11 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/5 relative transition-all">
                        <Link href="/store/cart">
                            <ShoppingBag className={cn("h-5.5 w-5.5 transition-transform duration-300 group-hover:scale-110", cartCount > 0 && "text-primary")} />
                            {cartCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-primary text-white text-[9px] flex items-center justify-center rounded-full font-black border-2 border-white dark:border-slate-900 animate-in zoom-in duration-300">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                        </Button>
                        
                        <div className="md:hidden">
                        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                            <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl hover:bg-primary/5 hover:text-primary">
                                <Menu className="h-6 w-6" strokeWidth={2.5} />
                                <span className="sr-only">Open menu</span>
                            </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-full sm:w-[400px] rounded-r-[3rem] border-none shadow-2xl p-0 overflow-hidden">
                            <div className="h-full flex flex-col">
                                <SheetHeader className="p-8 border-b bg-muted/20">
                                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                                    <SheetDescription className="sr-only">Access categories, shop items, and your account settings.</SheetDescription>
                                    <div className="flex justify-between items-center mb-8">
                                        <Logo />
                                    </div>
                                     <Button 
                                        variant="outline"
                                        className="w-full pl-12 pr-4 rounded-2xl bg-white dark:bg-slate-900 border-none h-12 font-bold shadow-sm justify-start relative text-slate-400"
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setIsSearchFocused(true);
                                        }}
                                    >
                                        <Search className="absolute left-4 h-5 w-5" strokeWidth={3} />
                                        Find premium items...
                                    </Button>
                                    
                                    {customer && (
                                        <div className="mt-6 p-5 bg-primary text-white rounded-[2rem] shadow-xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <Wallet className="h-16 w-16" />
                                            </div>
                                            <div className="relative z-10 space-y-1">
                                                <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-70">Account Credit</p>
                                                <p className="text-2xl font-black tracking-tighter">{formatCurrency(customer.creditBalance || 0, settings?.currency || '$')}</p>
                                            </div>
                                        </div>
                                    )}
                                </SheetHeader>
                                
                                <ScrollArea className="flex-1 px-8 py-10">
                                    <nav className="flex flex-col space-y-8">
                                        <Link className="text-3xl font-black tracking-tighter hover:text-primary transition-colors flex items-center justify-between group" href="/store" onClick={() => setIsMenuOpen(false)}>
                                            Home <ChevronRight className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                                        </Link>
                                        <Link className="text-3xl font-black tracking-tighter hover:text-primary transition-colors flex items-center justify-between group" href="/store/shop" onClick={() => setIsMenuOpen(false)}>
                                            The Catalog <ChevronRight className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                                        </Link>
                                        <Link className="text-3xl font-black tracking-tighter hover:text-rose-600 transition-colors flex items-center justify-between group" href="/store/flash-sales" onClick={() => setIsMenuOpen(false)}>
                                            Flash Hub <ChevronRight className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                                        </Link>
                                        <div className="pt-4 border-t border-slate-100">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Collections</p>
                                            <div className="grid grid-cols-1 gap-4">
                                                {isLoadingCategories ? (
                                                    <div className="p-4 flex items-center gap-3 text-muted-foreground">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        <span className="text-xs font-bold uppercase">Syncing...</span>
                                                    </div>
                                                ) : (
                                                    categories?.slice(0, 6).map(cat => (
                                                        <Link key={cat.id} href={`/store/shop?category=${cat.id}`} className="flex items-center gap-4 group" onClick={() => setIsMenuOpen(false)}>
                                                            <div className="relative h-12 w-12 rounded-2xl bg-muted overflow-hidden border shadow-sm shrink-0">
                                                                <Image src={cat.imageUrl || `https://picsum.photos/seed/${cat.id}/100/100`} alt={cat.name} fill className="object-cover" unoptimized/>
                                                            </div>
                                                            <span className="font-bold text-lg group-hover:text-primary transition-colors">{cat.name}</span>
                                                        </Link>
                                                    ))
                                                )}
                                                <Link href="/store/categories" className="flex items-center gap-4 text-primary font-black uppercase text-[10px] tracking-widest pt-2" onClick={() => setIsMenuOpen(false)}>
                                                    Browse All <ArrowRight className="h-3 w-3" strokeWidth={3} />
                                                </Link>
                                            </div>
                                        </div>
                                    </nav>
                                </ScrollArea>

                                <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t flex flex-col gap-4">
                                    {user ? (
                                        <Button asChild size="lg" className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest gap-3 shadow-xl" onClick={() => setIsMenuOpen(false)}>
                                            <Link href="/store/account">
                                                <UserCircle className="h-5 w-5" /> My Account
                                            </Link>
                                        </Button>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <Button asChild variant="outline" size="lg" className="rounded-2xl font-black uppercase text-[10px] tracking-widest h-14" onClick={() => setIsMenuOpen(false)}>
                                                <Link href="/store/login">Log In</Link>
                                            </Button>
                                            <Button asChild size="lg" className="rounded-2xl font-black uppercase text-[10px] tracking-widest h-14 shadow-xl" onClick={() => setIsMenuOpen(false)}>
                                                <Link href="/store/signup">Join Now</Link>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            </SheetContent>
                        </Sheet>
                        </div>
                    </div>
                  </div>
              </div>
          </div>

          {/* Full Screen Immersive Search Overlay */}
          {isSearchFocused && (
            <div className="fixed inset-0 z-[100] bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-500 flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
                
                <div className="max-w-site-container mx-auto w-full px-6 sm:px-10 lg:px-12 flex flex-col h-full py-10 md:py-20 relative z-10">
                    <div className="flex items-center justify-between gap-8 mb-16 md:mb-24">
                        <div className="flex-1 max-w-3xl relative">
                            <form onSubmit={handleNavbarSearch} className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-primary" strokeWidth={3} />
                                <Input 
                                    autoFocus
                                    className="w-full pl-14 pr-12 bg-slate-100/50 dark:bg-slate-800/50 border-2 border-primary/20 focus:bg-white dark:focus:bg-slate-900 rounded-3xl h-16 text-xl md:text-2xl font-bold tracking-tight transition-all shadow-inner"
                                    placeholder="Search products, collections or SKUs..."
                                    value={navbarSearch}
                                    onChange={(e) => setNavbarSearch(e.target.value)}
                                />
                                {navbarSearch && (
                                    <button 
                                        type="button"
                                        onClick={() => setNavbarSearch('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                    >
                                        <X className="h-5 w-5 text-slate-400" />
                                    </button>
                                )}
                            </form>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                                setIsSearchFocused(false);
                                setNavbarSearch('');
                            }}
                            className="h-16 w-16 rounded-full border-2 border-slate-100 dark:border-slate-800 hover:border-primary/20 hover:bg-primary/5 transition-all group shrink-0 shadow-sm active:scale-95 flex items-center justify-center"
                        >
                            <X className="h-8 w-8 text-slate-400 group-hover:text-primary group-hover:rotate-90 transition-all duration-500" strokeWidth={3} />
                        </Button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-16 overflow-hidden">
                        <div className="lg:col-span-8 flex flex-col min-h-0">
                            <div className="flex items-baseline justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                                    {navbarSearch ? 'Universal Registry Matches' : 'Discovery Feed'}
                                </h3>
                                {navbarSearch && (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                                        {searchResults.length + categoryMatches.length} Matches Found
                                    </span>
                                )}
                            </div>

                            <ScrollArea className="flex-1 -mx-4 px-4">
                                {navbarSearch ? (
                                    (searchResults.length > 0 || categoryMatches.length > 0) ? (
                                        <div className="space-y-10 pb-10">
                                            {/* Category Results */}
                                            {categoryMatches.length > 0 && (
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                        <LayoutGrid className="h-3 w-3" /> Related Collections
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                        {categoryMatches.map(cat => (
                                                            <Link 
                                                                key={cat.id}
                                                                href={`/store/shop?category=${cat.id}`}
                                                                className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all"
                                                                onClick={() => setIsSearchFocused(false)}
                                                            >
                                                                <div className="relative h-10 w-10 rounded-xl bg-muted overflow-hidden shrink-0">
                                                                    <Image src={cat.imageUrl || `https://picsum.photos/seed/${cat.id}/100/100`} alt="" fill className="object-cover" unoptimized />
                                                                </div>
                                                                <span className="font-bold text-sm truncate">{cat.name}</span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Product Results */}
                                            {searchResults.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    {searchResults.map(product => (
                                                        <Link 
                                                            key={product.id}
                                                            href={`/store/product/${product.id}`}
                                                            className="flex items-center gap-6 p-6 bg-white dark:bg-slate-900 rounded-[2rem] transition-all border border-slate-100 dark:border-slate-800 hover:border-primary/30 group shadow-lg hover:shadow-2xl active:scale-[0.98]"
                                                            onClick={() => setIsSearchFocused(false)}
                                                        >
                                                            <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden border bg-white flex-shrink-0 shadow-sm">
                                                                <Image 
                                                                    src={product.imageUrl || 'https://placehold.co/200x200.png'} 
                                                                    alt={product.name} 
                                                                    fill 
                                                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                                                    unoptimized
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                <p className="text-lg md:text-xl font-black text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors tracking-tight leading-tight">
                                                                    {product.name}
                                                                </p>
                                                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                                    {categories?.find(c => c.id === product.categoryId)?.name || 'Premium Registry'}
                                                                </p>
                                                                <p className="text-base font-black text-primary tracking-tight mt-2">
                                                                    {formatCurrency(calculateEffectivePrice(product as any, new Date()), settings?.currency || '$')}
                                                                </p>
                                                            </div>
                                                            <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl group-hover:translate-x-2 shrink-0">
                                                                <ArrowRight className="h-5 w-5" strokeWidth={3} />
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-10 text-center opacity-40">
                                                    <p className="text-xs font-black uppercase tracking-widest">No exact product matches</p>
                                                </div>
                                            )}

                                            {/* Smart Suggestions: Similar Products */}
                                            {similarSuggestions.length > 0 && (
                                                <div className="pt-10 border-t border-slate-100 dark:border-slate-800 space-y-6">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                        <Sparkles className="h-3.5 w-3.5 text-amber-500" /> AI Suggestions & Related
                                                    </h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                        {similarSuggestions.map(p => (
                                                            <Link 
                                                                key={p.id}
                                                                href={`/store/product/${p.id}`}
                                                                className="group block space-y-3"
                                                                onClick={() => setIsSearchFocused(false)}
                                                            >
                                                                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border bg-slate-50">
                                                                    <Image src={p.imageUrl || ''} alt="" fill className="object-cover transition-transform group-hover:scale-110" unoptimized />
                                                                </div>
                                                                <p className="text-xs font-bold truncate px-1">{p.name}</p>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center space-y-6 animate-in zoom-in-95 duration-500">
                                            <div className="h-32 w-32 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Search className="h-12 w-12 text-slate-300" strokeWidth={1.5}/>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">No items found</p>
                                                <p className="text-slate-500 mt-2 font-medium">Try searching for generic terms like "iron", "solar" or "battery".</p>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="space-y-16 py-10">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div className="space-y-6">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2">
                                                    <TrendingUp className="h-3 w-3" /> Popular Registry Requests
                                                </h4>
                                                <div className="flex flex-col gap-4">
                                                    {products?.slice(0, 5).map((p, idx) => (
                                                        <Link 
                                                            key={p.id} 
                                                            href={`/store/product/${p.id}`}
                                                            className="group flex items-center gap-4 text-xl font-bold hover:text-primary transition-colors tracking-tight"
                                                            onClick={() => setIsSearchFocused(false)}
                                                        >
                                                            <span className="text-slate-200 dark:text-slate-800 font-black text-3xl group-hover:text-primary/20 transition-colors italic">0{idx + 1}</span>
                                                            {p.name}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2">
                                                    <History className="h-3 w-3" /> Direct Access
                                                </h4>
                                                <div className="flex flex-wrap gap-3">
                                                    {['New Arrivals', 'Clearance', 'Flash Hub', 'Best Sellers', 'Luxury', 'Essential'].map(tag => (
                                                        <Button 
                                                            key={tag} 
                                                            variant="outline" 
                                                            className="rounded-full px-6 py-6 font-black text-[10px] uppercase tracking-widest border-slate-200 dark:border-slate-800 hover:border-primary hover:text-primary transition-all bg-white dark:bg-slate-900 shadow-sm active:scale-95"
                                                            onClick={() => {
                                                                setNavbarSearch(tag);
                                                            }}
                                                        >
                                                            {tag}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </ScrollArea>
                            
                            {navbarSearch && (searchResults.length > 0 || categoryMatches.length > 0) && (
                                <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                                    <Button 
                                        className="w-full h-16 rounded-[1.5rem] bg-primary text-white font-black uppercase text-xs tracking-[0.25em] shadow-2xl shadow-primary/20 hover:scale-[1.01] transition-transform"
                                        asChild
                                    >
                                        <Link href={`/store/search?q=${encodeURIComponent(navbarSearch)}`} onClick={() => setIsSearchFocused(false)}>
                                            Enter Full Registry Search <ArrowRight className="ml-4 h-5 w-5" strokeWidth={3}/>
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-4 hidden lg:flex flex-col space-y-10 border-l border-slate-100 dark:border-slate-800 pl-16">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Premium Collections</h3>
                                <div className="space-y-4">
                                    {categories?.slice(0, 10).map(cat => (
                                        <Link 
                                            key={cat.id} 
                                            href={`/store/shop?category=${cat.id}`}
                                            className="block group"
                                            onClick={() => setIsSearchFocused(false)}
                                        >
                                            <div className="flex items-center justify-between group-hover:translate-x-2 transition-transform duration-500">
                                                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase group-hover:text-primary transition-colors">
                                                    {cat.name}
                                                </span>
                                                <ArrowRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </nav>
    );
}

function UserButton({ isLoading, user, staffMember, router, handleLogout, getInitials }: { 
    isLoading: boolean, 
    user: any, 
    staffMember: any, 
    router: any, 
    handleLogout: () => void, 
    getInitials: (email?: string | null) => string 
}) {
    if (isLoading) {
        return <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-slate-600 dark:text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></Button>
    }
    if (user) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hidden sm:inline-flex rounded-full border-2 border-transparent hover:border-primary/20 p-0.5 transition-all">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} className="object-cover" />
                            <AvatarFallback className="font-bold text-xs">{getInitials(user.email)}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800">
                    <DropdownMenuLabel className="p-4">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-black leading-none">{user.displayName || 'Valued Customer'}</p>
                            <p className="text-[10px] font-medium leading-none text-muted-foreground uppercase tracking-widest mt-1">
                            {user.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/store/account')} className="cursor-pointer p-3 focus:bg-primary/5 rounded-xl mx-1 my-1">
                        <UserCircle className="mr-3 h-4 w-4 text-primary" />
                        <span className="font-bold">My Account</span>
                    </DropdownMenuItem>
                    {staffMember && (
                        <DropdownMenuItem onClick={() => router.push('/dashboard')} className="cursor-pointer p-3 focus:bg-primary/5 rounded-xl mx-1 my-1">
                            <LayoutDashboard className="mr-3 h-4 w-4 text-primary" />
                            <span className="font-bold">Staff Dashboard</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
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
            <Button variant="ghost" asChild className="group relative overflow-hidden text-xs font-black uppercase tracking-[0.2em] h-10">
                <Link href="/store/login">
                    Log In
                    <span className="absolute bottom-0 left-0 h-0.5 bg-primary w-0 transition-all duration-300 ease-out group-hover:w-full"></span>
                </Link>
            </Button>
            <Button asChild className="rounded-full px-8 font-black uppercase text-[10px] tracking-[0.25em] h-10 shadow-lg shadow-primary/20">
                <Link href="/store/signup">Sign Up</Link>
            </Button>
        </div>
    )
}