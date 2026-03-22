
'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { 
  ShoppingBag, 
  Search, 
  Bell, 
  Home, 
  ShoppingCart, 
  User,
  Loader2,
  LayoutGrid,
  History,
  Heart,
  Coins
} from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { useCart } from '@/contexts/cart-context';
import { useWishlist } from '@/contexts/wishlist-context';
import { cn } from '@/lib/utils';
import { HomeView } from '@/components/store-app/HomeView';
import { SearchView } from '@/components/store-app/SearchView';
import { CartView } from '@/components/store-app/CartView';
import { ProfileView } from '@/components/store-app/ProfileView';
import { ProductDetailView } from '@/components/store-app/ProductDetailView';
import { CollectionsView } from '@/components/store-app/CollectionsView';
import { RecentlyViewedView } from '@/components/store-app/RecentlyViewedView';
import { CheckoutView } from '@/components/store-app/CheckoutView';
import { WishlistView } from '@/components/store-app/WishlistView';
import { OrdersView } from '@/components/store-app/OrdersView';
import { ProfileSettingsView } from '@/components/store-app/ProfileSettingsView';
import { NotificationsView } from '@/components/store-app/NotificationsView';
import { LoginView } from '@/components/store-app/LoginView';
import { SignupView } from '@/components/store-app/SignupView';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc } from 'firebase/firestore';
import type { Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/formatUtils';
import { ThemeToggle } from '@/components/theme-toggle';
import { ProductLoadingOverlay } from '@/components/store/ProductLoadingOverlay';

type AppTab = 'home' | 'collections' | 'search' | 'cart' | 'profile' | 'recently-viewed' | 'checkout' | 'wishlist' | 'orders' | 'profile-settings' | 'notifications' | 'login' | 'signup';

export default function StoreAppPage() {
    const [activeTab, setActiveTab] = useState<AppTab>('home');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [preSelectedCategoryId, setPreSelectedCategoryId] = useState<string | null>(null);
    const [isLoadingProduct, setIsLoadingProduct] = useState(false);
    
    const { settings, isLoadingSettings } = useSettings();
    const { cartCount } = useCart();
    const { wishlistCount } = useWishlist();
    const { user } = useUser();
    const firestore = useFirestore();

    // Fetch customer record for bonus display
    const customerRef = useMemo(() => (user && firestore) ? doc(firestore, 'customers', user.uid) : null, [user, firestore]);
    const { data: customer } = useDoc<Customer>(customerRef);

    const onSelectProduct = (id: string) => {
        setIsLoadingProduct(true);
        setSelectedProductId(id);
        // Hide loading after transition completes
        setTimeout(() => setIsLoadingProduct(false), 500);
    };

    const onNavigateToHome = () => {
        setSelectedProductId(null);
        setActiveTab('home');
    };

    const handleSelectCollection = (categoryId: string) => {
        setPreSelectedCategoryId(categoryId);
        setActiveTab('search');
    };

    const handleViewRecentlyViewed = () => {
        setSelectedProductId(null);
        setActiveTab('recently-viewed');
    };

    const handleStartCheckout = () => {
        setActiveTab('checkout');
    };

    const handleCloseCheckout = () => {
        setActiveTab('cart');
    };

    const handleNavigate = (tab: string) => {
        setActiveTab(tab as AppTab);
    };

    const getInitials = (email?: string | null) => {
        if (!email) return 'U';
        const parts = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').split(' ').filter(Boolean);
        return parts.length > 1 ? (parts[0][0] + (parts[1][0] || '')).toUpperCase() : email.substring(0, 2).toUpperCase();
    };

    if (isLoadingSettings) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    // Navigation visibility logic
    const isFocusedSubView = ['search', 'orders', 'profile-settings', 'recently-viewed', 'notifications', 'login', 'signup'].includes(activeTab);
    const showNav = !selectedProductId && activeTab !== 'checkout' && !isFocusedSubView;

    return (
        <>
            <ProductLoadingOverlay isVisible={isLoadingProduct} />
            <div className="bg-background-light dark:bg-background-dark min-h-screen">
              <div className="relative flex flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl min-h-screen border-x">
            
            {showNav && (
                <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl transition-all duration-500 border-b border-slate-200/50 dark:border-slate-800/50">
                    <div className="flex items-center justify-between px-6 py-4">
                        {/* Left Action: Search */}
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setActiveTab('search')}
                                className="flex items-center justify-center size-10 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border-2 border-primary/30 animate-border-glow hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                            >
                                <Search className="h-5 w-5" strokeWidth={2.5} />
                            </button>
                            
                            {/* App Bonus Balance Display */}
                            {user && customer && (
                                <button 
                                    onClick={() => setActiveTab('profile')}
                                    className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-xl border border-primary/20 animate-in fade-in zoom-in-95 duration-500"
                                >
                                    <Coins className="h-3.5 w-3.5" strokeWidth={3} />
                                    <span className="text-[10px] font-black uppercase tracking-tight">
                                        {formatCurrency(customer.creditBalance || 0, settings?.currency || '$')}
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Center: Brand Identity */}
                        <div className="flex flex-col items-center justify-center gap-1.5 px-4 min-w-0 flex-1">
                            {settings?.invoiceLogoUrl ? (
                                <div className="relative h-8 w-full max-w-[140px]">
                                    <Image 
                                        src={settings.invoiceLogoUrl} 
                                        alt={settings.storeName || 'Store Logo'} 
                                        fill 
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <div className="bg-primary p-1.5 rounded-xl shadow-lg shadow-primary/20 rotate-3">
                                    <ShoppingBag className="text-white h-4 w-4" strokeWidth={3} />
                                </div>
                            )}
                            <h1 className="text-[10px] font-black tracking-[0.25em] uppercase leading-none text-slate-900 dark:text-white truncate w-full text-center">
                                {settings?.storeName || 'LUXE'}
                            </h1>
                        </div>

                        {/* Right Actions: Theme Toggle & Notifications */}
                        <div className="flex items-center gap-2">
                            <ThemeToggle 
                                variant="ghost"
                                size="icon"
                                className="size-10 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border-2 border-primary/30 hover:bg-primary/10 hover:text-primary"
                            />
                            <div className="relative">
                                <button 
                                    onClick={() => setActiveTab('notifications')}
                                    className="flex items-center justify-center size-10 rounded-2xl bg-white dark:bg-slate-800 shadow-lg border-2 border-primary/30 animate-border-glow hover:bg-primary/10 hover:text-primary transition-all active:scale-90"
                                >
                                    <Bell className="h-5 w-5" strokeWidth={2.5} />
                                </button>
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-background-light dark:border-background-dark animate-pulse"></span>
                            </div>
                        </div>
                    </div>
                </header>
            )}

            <main className={cn("flex-1 overflow-y-auto hide-scrollbar", showNav && "pb-24")}>
                {selectedProductId ? (
                    <ProductDetailView 
                        id={selectedProductId} 
                        onClose={() => setSelectedProductId(null)} 
                        onNavigateToCart={() => {
                            setActiveTab('cart');
                            setSelectedProductId(null);
                        }}
                        onNavigateToRecentlyViewed={() => {
                            setSelectedProductId(null);
                            setActiveTab('recently-viewed');
                        }}
                    />
                ) : (
                    <>
                        {activeTab === 'home' && (
                            <HomeView 
                                onSelectProduct={onSelectProduct} 
                                onViewAllCollections={() => setActiveTab('collections')}
                            />
                        )}
                        {activeTab === 'collections' && (
                            <CollectionsView 
                                onSelectCategory={handleSelectCollection} 
                            />
                        )}
                        {activeTab === 'search' && (
                            <SearchView 
                                onClose={() => setActiveTab('home')}
                                onSelectProduct={onSelectProduct} 
                                initialCategoryId={preSelectedCategoryId}
                                onClearCategory={() => setPreSelectedCategoryId(null)}
                            />
                        )}
                        {activeTab === 'recently-viewed' && (
                            <RecentlyViewedView 
                                onClose={() => setActiveTab('profile')} 
                                onSelectProduct={onSelectProduct}
                            />
                        )}
                        {activeTab === 'wishlist' && (
                            <WishlistView 
                                onClose={() => setActiveTab('home')} 
                                onSelectProduct={onSelectProduct}
                            />
                        )}
                        {activeTab === 'orders' && (
                            <OrdersView 
                                onClose={() => setActiveTab('profile')} 
                                onNavigate={handleNavigate}
                            />
                        )}
                        {activeTab === 'notifications' && (
                            <NotificationsView 
                                onClose={() => setActiveTab('home')} 
                                onNavigate={handleNavigate}
                            />
                        )}
                        {activeTab === 'profile-settings' && (
                            <ProfileSettingsView 
                                onClose={() => setActiveTab('profile')} 
                            />
                        )}
                        {activeTab === 'login' && (
                            <LoginView 
                                onClose={() => setActiveTab('profile')}
                                onNavigate={handleNavigate}
                            />
                        )}
                        {activeTab === 'signup' && (
                            <SignupView 
                                onClose={() => setActiveTab('login')}
                                onNavigate={handleNavigate}
                            />
                        )}
                        {activeTab === 'cart' && <CartView onNavigateToHome={onNavigateToHome} onStartCheckout={handleStartCheckout} />}
                        {activeTab === 'profile' && (
                            <ProfileView 
                                onNavigate={handleNavigate}
                            />
                        )}
                        {activeTab === 'checkout' && (
                            <CheckoutView onClose={handleCloseCheckout} />
                        )}
                    </>
                )}
            </main>

            {showNav && (
                <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-[420px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-[2.5rem] px-2 py-2 flex items-center justify-around z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all">
                {[
                    { id: 'home', icon: Home, label: 'Home' },
                    { id: 'collections', icon: LayoutGrid, label: 'Registry' },
                    { id: 'wishlist', icon: Heart, label: 'Saved', badge: wishlistCount },
                    { id: 'cart', icon: ShoppingBag, label: 'Bag', badge: cartCount },
                    { id: 'profile', icon: User, label: 'Profile' }
                ].map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    
                    return (
                    <button 
                        key={item.id}
                        onClick={() => {
                            setActiveTab(item.id as AppTab);
                            if (item.id !== 'search') setPreSelectedCategoryId(null);
                        }}
                        className={cn(
                            "flex flex-col items-center justify-center transition-all duration-500 relative py-2.5 px-1 rounded-[1.75rem] min-w-[64px] group",
                            isActive ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105" : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                        )}
                    >
                        <div className="relative">
                            {item.id === 'profile' && user ? (
                                <Avatar className={cn("h-6 w-6 border-2 transition-all duration-500", isActive ? "border-white" : "border-slate-200 dark:border-slate-700")}>
                                    <AvatarImage src={user.photoURL || undefined} className="object-cover" />
                                    <AvatarFallback className="text-[8px] font-black uppercase bg-muted text-muted-foreground">{getInitials(user.email)}</AvatarFallback>
                                </Avatar>
                            ) : (
                                <Icon className={cn("h-6 w-6 transition-all duration-500", isActive && "scale-110")} strokeWidth={isActive ? 3 : 2} />
                            )}
                            {item.badge !== undefined && item.badge > 0 && (
                                <span className={cn(
                                    "absolute -top-2 -right-2 min-w-[18px] h-[18px] text-[8px] flex items-center justify-center rounded-full font-black border-2 transition-all duration-500",
                                    isActive ? "bg-white text-primary border-primary" : "bg-primary text-white border-white dark:border-slate-900"
                                )}>
                                    {item.badge}
                                </span>
                            )}
                        </div>
                        
                        <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest leading-none mt-1 transition-all duration-500 overflow-hidden whitespace-nowrap",
                            isActive ? "max-h-4 opacity-100 transform translate-y-0" : "max-h-0 opacity-0 transform translate-y-2"
                        )}>
                            {item.label}
                        </span>

                        {isActive && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-in fade-in zoom-in duration-500" />
                        )}
                    </button>
                    )
                })}
                </nav>
            )}
          </div>

          <style jsx global>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            body { overscroll-behavior-y: contain; }
          `}</style>
        </div>
        </>
    );
}
