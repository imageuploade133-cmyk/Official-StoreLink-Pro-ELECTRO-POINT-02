'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Home, LayoutGrid, Search, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStoreUrl } from '@/hooks/use-store-url';
import { useCart } from '@/contexts/cart-context';

export function MobileBottomNav() {
  const pathname = usePathname() || '';
  const params = useParams();
  const { storeId, getStoreUrl } = useStoreUrl();
  const { cartCount } = useCart();

  const currentStoreId = (params?.storeId as string) || storeId;

  // Extract relative path by stripping currentStoreId prefix if present
  let subPath = pathname;
  if (currentStoreId && subPath.startsWith(`/${currentStoreId}`)) {
    subPath = subPath.substring(currentStoreId.length + 1);
  }
  if (!subPath) subPath = '/';

  const isHome = subPath === '/';
  const isCategories = subPath.startsWith('/categories') || (subPath.startsWith('/shop') && !subPath.startsWith('/search'));
  const isSearch = subPath.startsWith('/search');
  const isCart = subPath.startsWith('/cart') || subPath.startsWith('/checkout');
  const isAccount =
    subPath.startsWith('/account') ||
    subPath.startsWith('/login') ||
    subPath.startsWith('/signup') ||
    subPath.startsWith('/wishlist') ||
    subPath.startsWith('/recently-viewed') ||
    subPath.startsWith('/orders');

  const navItems = [
    {
      label: 'Home',
      icon: Home,
      href: getStoreUrl('/store'),
      active: isHome,
    },
    {
      label: 'Categories',
      icon: LayoutGrid,
      href: getStoreUrl('/store/categories'),
      active: isCategories,
    },
    {
      label: 'Search',
      icon: Search,
      href: getStoreUrl('/store/search'),
      active: isSearch,
    },
    {
      label: 'Cart',
      icon: ShoppingCart,
      href: getStoreUrl('/store/cart'),
      active: isCart,
      badge: cartCount,
    },
    {
      label: 'Me',
      icon: User,
      href: getStoreUrl('/store/account'),
      active: isAccount,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-t border-slate-200/60 dark:border-slate-800/60 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around h-16 px-1 relative">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 relative transition-all duration-300 rounded-2xl group",
              item.active
                ? "text-primary font-black scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            {/* Top Active Glow Line Indicator */}
            {item.active && (
              <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-in fade-in zoom-in-50 duration-300" />
            )}

            {/* Active Pill Container */}
            <div className={cn(
              "relative px-3 py-1 rounded-xl transition-all duration-300 flex items-center justify-center",
              item.active && "bg-primary/10 dark:bg-primary/20 shadow-inner"
            )}>
              <item.icon className={cn(
                "h-5 w-5 transition-all duration-300",
                item.active ? "fill-primary stroke-primary scale-110" : "stroke-current"
              )} strokeWidth={item.active ? 2.5 : 2} />

              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-600 text-white text-[9px] flex items-center justify-center rounded-full font-black border-2 border-white dark:border-slate-950 animate-in zoom-in-75 duration-300 shadow-md">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>

            <span className={cn(
              "text-[9px] font-extrabold tracking-tight uppercase transition-all duration-300",
              item.active ? "text-primary" : "text-slate-500 dark:text-slate-400"
            )}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
