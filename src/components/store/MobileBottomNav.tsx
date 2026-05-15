'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Search, ShoppingCart, User, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStoreUrl } from '@/hooks/use-store-url';
import { useCart } from '@/contexts/cart-context';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { getStoreUrl } = useStoreUrl();
  const { cartCount } = useCart();

  const navItems = [
    {
      label: 'Home',
      icon: Home,
      href: getStoreUrl('/store'),
      active: pathname.endsWith('/store') || pathname.endsWith('/store/'),
    },
    {
      label: 'Categories',
      icon: LayoutGrid,
      href: getStoreUrl('/store/categories'),
      active: pathname.includes('/store/categories') || pathname.includes('/store/shop'),
    },
    {
        label: 'Search',
        icon: Search,
        href: getStoreUrl('/store/search'),
        active: pathname.includes('/store/search'),
    },
    {
      label: 'Cart',
      icon: ShoppingCart,
      href: getStoreUrl('/store/cart'),
      active: pathname.includes('/store/cart'),
      badge: cartCount,
    },
    {
      label: 'Me',
      icon: User,
      href: getStoreUrl('/store/account'),
      active: pathname.includes('/store/account'),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-black/5 dark:border-white/5 pb-2">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 gap-1 transition-all duration-300",
              item.active ? "text-primary scale-110" : "text-slate-500 dark:text-slate-400"
            )}
          >
            <div className="relative">
              <item.icon className={cn("h-6 w-6", item.active && "fill-current")} strokeWidth={item.active ? 2.5 : 2} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-primary text-white text-[10px] flex items-center justify-center rounded-full font-bold border-2 border-white dark:border-black animate-in zoom-in duration-300">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-tight uppercase">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
