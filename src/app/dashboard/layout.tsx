
'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Menu,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  FolderTree,
  Users,
  Shield,
  Printer,
  ShoppingCart,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  List,
  Undo2,
  Receipt,
  Globe,
  MessageSquare,
  UserCircle,
  FilePlus,
  BookCopy,
  GalleryHorizontal,
  Columns,
  ListChecks,
  History,
  Landmark,
  ShoppingBag,
  UsersRound,
  BellRing,
  Truck,
  Sparkles,
  PackagePlus,
  LayoutGrid,
  MousePointerClick,
  Ticket,
  Wallet,
  Activity,
  Zap,
  Volume2,
  EyeOff,
  ClipboardList,
  SquarePlus,
  FileText,
  FileCog,
  Coins,
  ZoomIn,
  Palette
} from 'lucide-react';
import { PageSpinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { UserNav } from '@/components/UserNav';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ElysiumLogo } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { safeStorage } from '@/lib/storage-utils';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, permissions, isLoading, isCustomer, store, staffMember } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const firestore = useFirestore();
  const pendingOrdersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    // Only fetch for the user's store
    const storeId = staffMember?.store_id || store?.id;
    if (!storeId) return null;
    return query(collection(firestore, 'orders'), where('store_id', '==', storeId), where('status', '==', 'pending'));
  }, [firestore, user, staffMember, store]);
  const { data: pendingOrders } = useCollection<Order>(pendingOrdersQuery);
  const pendingCount = pendingOrders?.length || 0;

  // Restore zoom level from localStorage on mount
  useEffect(() => {
    const savedZoom = safeStorage.getItem('dashboard-zoom');
    if (savedZoom) {
      const parsedZoom = parseInt(savedZoom, 10);
      if (!isNaN(parsedZoom) && parsedZoom >= 0 && parsedZoom <= 200) {
        setZoomLevel(parsedZoom);
      }
    }
  }, []);

  // Apply zoom level using font-size scaling (affects all rem/em units proportionally)
  useEffect(() => {
    const baseFontSize = 16;
    const newFontSize = (baseFontSize * zoomLevel) / 100;
    document.documentElement.style.fontSize = newFontSize + 'px';
    
    // Persist to localStorage
    safeStorage.setItem('dashboard-zoom', zoomLevel.toString());
  }, [zoomLevel]);
  
  const navItems = [
    { heading: 'Core' },
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', perm: 'view_dashboard' },
    { href: '/pos', icon: ShoppingCart, label: 'POS', perm: 'canAccessPOS' },
    { href: '/dashboard/profile', icon: UserCircle, label: 'My Profile', perm: 'view_dashboard' }, 
    { heading: 'Invoicing' },
    { href: '/dashboard/invoices', icon: FileText, label: 'Manage Invoices', perm: 'manage_settings' },
    { href: '/dashboard/invoices/generate', icon: FilePlus, label: 'Generate Invoice', perm: 'manage_settings' },
    { href: '/dashboard/invoicing-settings', icon: FileCog, label: 'Invoicing Settings', perm: 'manage_settings' },
    { heading: 'Reports' },
    { href: '/dashboard/my-sales', icon: History, label: 'My Sales', perm: 'view_my_sales' },
    { href: '/dashboard/sales-history', icon: BarChart3, label: 'Sales History', perm: 'view_sales_history' },
    { href: '/dashboard/returns', icon: Undo2, label: 'Refunds', perm: 'canProcessReturns' },
    { href: '/dashboard/product-sales', icon: TrendingUp, label: 'Product Sales', perm: 'canViewProductSales' },
    { href: '/dashboard/expenses', icon: Receipt, label: 'Expense Management', perm: 'canManageExpenses' },
    { heading: 'Financials' },
    { href: '/dashboard/flexible-payments', icon: Wallet, label: 'Pay Small Small', perm: 'manage_flexible_payments' },
    { heading: 'E-Commerce' },
    { href: '/dashboard/orders', icon: ShoppingBag, label: 'Website Orders', perm: 'manage_orders' },
    { href: '/dashboard/order-alerts', icon: BellRing, label: 'Order Alerts', perm: 'manage_settings' },
    { href: '/dashboard/online-customers', icon: UsersRound, label: 'Online Customers', perm: 'view_online_customers' },
    { heading: 'Inventory' },
    { href: '/dashboard/inventory', icon: Package, label: 'Inventory', perm: 'view_inventory' },
    { href: '/dashboard/categories', icon: FolderTree, label: 'Categories', perm: 'view_categories' },
    { href: '/dashboard/stock-audit', icon: ClipboardList, label: 'Stock Audit Log', perm: 'view_stock_audit' },
    { href: '/dashboard/stock-alerts', icon: AlertTriangle, label: 'View Stock Alerts', perm: 'view_stock_alerts' },
    { href: '/dashboard/restock-history', icon: ListChecks, label: 'Restock History', perm: 'transfer_stock' },
    { href: '/dashboard/print-barcodes', icon: Printer, label: 'Print Barcodes', perm: 'canPrintBarcodes' },
    { href: '/dashboard/bulk-add-products', icon: List, label: 'Bulk Import', perm: 'canBulkAddProducts' },
    { heading: 'Management' },
    { href: '/dashboard/customers', icon: Users, label: 'Customers', perm: 'canViewCustomers' },
    { href: '/dashboard/staff', icon: Users, label: 'Staff', perm: 'manage_staff' },
    { heading: 'Marketing' },
    { href: '/dashboard/earn-money-ads', icon: Coins, label: 'Earn Money – Ads', perm: 'manage_ads' },
    { href: '/dashboard/welcome-credit-settings', icon: Coins, label: 'Welcome Bonus', perm: 'manage_settings' },
    { href: '/dashboard/whatsapp', icon: MessageSquare, label: 'WhatsApp', perm: 'canSendMarketingWhatsapp' },
    { heading: 'Website' },
    { href: '/dashboard/flash-hub-manager', icon: Zap, label: 'Flash Hub Manager', perm: 'manage_website_content' },
    { href: '/dashboard/category-gallery-settings', icon: LayoutGrid, label: 'Category Section Settings', perm: 'manage_settings' },
    { href: '/dashboard/voice-settings', icon: Volume2, label: 'Voice Experience Settings', perm: 'manage_settings' },
    { href: '/dashboard/add-store-product', icon: PackagePlus, label: 'Add Store Product', perm: 'manage_website_content' },
    { href: '/dashboard/manage-web-catalog', icon: LayoutGrid, label: 'Manage Web Catalog', perm: 'manage_website_content' },
    { href: '/dashboard/manage-coupons', icon: Ticket, label: 'Promo Codes', perm: 'manage_coupons' },
    { href: '/dashboard/stock-bar-settings', icon: Activity, label: 'Stock Bar Settings', perm: 'manage_settings' },
    { href: '/dashboard/product-card-designer', icon: Palette, label: 'Product Card Designer', perm: 'manage_settings' },
    { href: '/dashboard/public-web-settings', icon: Globe, label: 'General Web Settings', perm: 'manage_settings' },
    { href: '/dashboard/settings/domain', icon: Globe, label: 'Domain Settings', perm: 'manage_settings' },
    { href: '/dashboard/shop-collection-settings', icon: ShoppingBag, label: 'Shop Our Collection', perm: 'manage_settings' },
    { href: '/dashboard/public-visibility-settings', icon: EyeOff, label: 'Global Section Visibility', perm: 'manage_settings' },
    { href: '/dashboard/store-navigation-settings', icon: List, label: 'Navigation Bar Settings', perm: 'manage_settings' },
    { href: '/dashboard/shopping-experience-settings', icon: MousePointerClick, label: 'Shopping Buttons', perm: 'manage_settings' },
    { href: '/dashboard/website-payment', icon: Landmark, label: 'Website Payment Method', perm: 'manage_settings' },
    { href: '/dashboard/logistics-settings', icon: Truck, label: 'Logistics Settings', perm: 'manage_settings' },
    { href: '/dashboard/delivery-settings', icon: Truck, label: 'Delivery Settings', perm: 'manage_settings' },
    { href: '/dashboard/recommendations-settings', icon: Sparkles, label: 'Product Recommendations', perm: 'manage_settings' },
    { href: '/dashboard/create-web-page', icon: FilePlus, label: 'Create Web Page', perm: 'manage_website_content' },
    { href: '/dashboard/manage-web-pages', icon: BookCopy, label: 'Manage Web Pages', perm: 'manage_website_content' },
    { href: '/dashboard/web-slide-show', icon: GalleryHorizontal, label: 'Web Slide Show', perm: 'manage_website_content' },
    { href: '/dashboard/homepage-sections', icon: Columns, label: 'Manage Homepage Sections', perm: 'manage_website_content' },
    { heading: 'Administration' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings', perm: 'manage_settings' },
    { href: '/dashboard/permissions', icon: Shield, label: 'Permissions', perm: 'view_permissions' },
  ];

  const permissibleLinks = useMemo(() => {
    return navItems.filter(item => {
      if (item.heading) return false;
      if (item.href === '/dashboard/profile') return !!user;
      return !!permissions[item.perm as keyof typeof permissions];
    });
  }, [permissions, user]);

  const showSidebar = useMemo(() => permissibleLinks.length > 1, [permissibleLinks]);

  const visibleNavItems = useMemo(() => {
    if (!showSidebar) return [];
    
    const finalNavItems: (typeof navItems[0])[] = [];

    navItems.forEach((item, index) => {
      if (item.heading) {
        const nextHeadingIndex = navItems.findIndex((nextItem, nextIndex) => nextIndex > index && nextItem.heading);
        const sectionItems = navItems.slice(index + 1, nextHeadingIndex === -1 ? navItems.length : nextHeadingIndex);
        
        const hasVisibleLinkInSection = sectionItems.some(sectionItem => 
          permissibleLinks.some(permissibleLink => permissibleLink.href === sectionItem.href)
        );

        if (hasVisibleLinkInSection) {
          finalNavItems.push(item);
        }
      } else {
        if (permissibleLinks.some(permissibleLink => permissibleLink.href === item.href)) {
          finalNavItems.push(item);
        }
      }
    });

    return finalNavItems;
  }, [permissions, user, showSidebar, permissibleLinks]);


  const [isGracePeriodActive, setIsGracePeriodActive] = useState(true);

  useEffect(() => {
    // If we're loading or have a store, we don't need a grace period
    if (isLoading || store || staffMember) {
      if (store || staffMember) setIsGracePeriodActive(false);
      return;
    }

    // If we are not loading but have no store, start a grace period
    const timer = setTimeout(() => {
      setIsGracePeriodActive(false);
    }, 4000); // 4 second grace period for Firestore propagation/loading

    return () => clearTimeout(timer);
  }, [isLoading, store, staffMember]);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (isCustomer) {
        // Explicitly block customers from the dashboard
        router.replace('/store/account');
      } else if (!store && !staffMember && !isGracePeriodActive && pathname !== '/signup-merchant') {
        // No store or staff record yet, and grace period has expired
        console.log("No store found after grace period, redirecting to signup-merchant");
        router.replace('/signup-merchant');
      }
    }
  }, [user, isLoading, isCustomer, store, staffMember, router, pathname, isGracePeriodActive]);

  if (isLoading || !user || isCustomer || (!store && !staffMember)) {
    const subLabel = (!store && !staffMember) ? "Locating your store..." : "Authenticating your account…";
    return <PageSpinner label="StoreLink Pro" subLabel={subLabel} />;
  }

  return (
    <div
      className={cn(
        'grid h-[100dvh] w-full overflow-hidden',
        showSidebar && 'transition-[grid-template-columns] duration-300 ease-in-out',
        showSidebar && (isMinimized
          ? 'md:grid-cols-[80px_1fr]'
          : 'md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]'),
        !showSidebar && 'grid-cols-1'
      )}
    >
      {/* Sidebar */}
      {showSidebar && (
        <aside className="hidden border-r bg-sidebar-background md:flex md:flex-col overflow-hidden dark:bg-sidebar-background dark:border-sidebar-border">
          <div
            className={cn(
              'flex h-14 shrink-0 items-center border-b dark:border-sidebar-border lg:h-[60px]',
              isMinimized ? 'justify-center px-2' : 'px-4 lg:px-6'
            )}
          >
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <ElysiumLogo className="h-6 w-6" />
              <span className={cn(isMinimized && 'sr-only')}>
                StoreLink-Pro
              </span>
            </Link>
          </div>

          <ScrollArea className="flex-1">
            <TooltipProvider delayDuration={0}>
              <nav
                className={cn(
                  'grid items-start gap-1 py-4 text-sm font-medium',
                  isMinimized ? 'justify-center px-2' : 'px-4'
                )}
              >
                {visibleNavItems.map((item, index) => {

                  if (item.heading) {
                    return (<React.Fragment key={`heading-${index}`}>
                        {index > 0 && <Separator className={cn('my-2', isMinimized && 'mx-auto w-3/4')} />}
                        {!isMinimized && (
                          <h4 className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                            {item.heading}
                          </h4>
                        )}
                      </React.Fragment>);
                  }
                  
                  const isOrdersLink = item.href === '/dashboard/orders';
                  const showBadge = isOrdersLink && pendingCount > 0;

                  if (isMinimized) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href!}
                            className={cn(
                              'relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors dark:text-foreground/70 dark:hover:text-primary dark:hover:bg-popover',
                              (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href!))) ? 'bg-muted text-primary dark:bg-popover dark:text-primary' : 'text-muted-foreground hover:text-primary'
                            )}
                          >
                            <item.icon className="h-5 w-5 dark:text-foreground/70 dark:[&.active]:text-primary" />
                            {showBadge && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                              </span>
                            )}
                            <span className="sr-only">{item.label}</span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.label} {showBadge && `(${pendingCount} pending)`}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href!}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 transition-all dark:text-foreground/70 dark:hover:bg-popover dark:hover:text-primary',
                        (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href!))) ? 'bg-muted text-primary dark:bg-popover dark:text-primary' : 'text-muted-foreground hover:bg-muted hover:text-primary'
                      )}
                    >
                      <item.icon className="h-4 w-4 dark:text-foreground/70" />
                      {item.label}
                      {showBadge && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full px-0 text-[10px] animate-pulse"
                        >
                          {pendingCount}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </TooltipProvider>
          </ScrollArea>
        </aside>
      )}

      {/* Content Area */}
      <div className="flex flex-col overflow-hidden dark:bg-black">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 dark:bg-card dark:border-border/50">
          {showSidebar && (
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 md:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="flex flex-col p-0">
                <SheetHeader>
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    A list of links to navigate to different parts of the application.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex h-14 items-center border-b dark:border-sidebar-border px-6">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-lg font-semibold"
                  >
                    <ElysiumLogo className="h-6 w-6" />
                    <span>StoreLink-Pro</span>
                  </Link>
                </div>

                <ScrollArea className="flex-1">
                  <nav className="grid gap-2 p-6 text-lg font-medium">
                    {visibleNavItems.map((item, index) => {
                      if (item.heading) {
                          return (<React.Fragment key={`mobile-heading-${index}`}>
                            {index > 0 && <Separator className="my-4" />}
                            <h4 className="px-3 text-sm font-semibold uppercase text-muted-foreground tracking-wider">
                              {item.heading}
                            </h4>
                          </React.Fragment>);
                        }
                        
                        const isOrdersLink = item.href === '/dashboard/orders';
                        const showBadge = isOrdersLink && pendingCount > 0;

                        return (
                          <Link
                            key={item.href}
                            href={item.href!}
                            className={cn(
                              'flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground',
                              (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href!))) ? 'bg-muted text-foreground' : ''
                            )}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <div className="flex items-center gap-4">
                              <item.icon className="h-5 w-5" />
                              {item.label}
                            </div>
                            {showBadge && (
                              <Badge 
                                variant="destructive" 
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full px-0 text-xs animate-pulse"
                              >
                                {pendingCount}
                              </Badge>
                            )}
                          </Link>
                        );
                    })}
                  </nav>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          )}

          {showSidebar && (
            <Button
              size="icon"
              variant="outline"
              onClick={() => setIsMinimized(!isMinimized)}
              className="hidden md:flex"
            >
              {isMinimized ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          )}

          <div className="flex-1" />

          {/* Zoom Control */}
          <Popover>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="relative"
                    >
                      <ZoomIn className="h-5 w-5" />
                      <span className="sr-only">Zoom control</span>
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Adjust zoom level: {zoomLevel}%</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PopoverContent align="end" className="w-64">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Zoom Level</label>
                    <span className="text-lg font-semibold text-primary">
                      {zoomLevel}%
                    </span>
                  </div>
                  <Slider
                    value={[zoomLevel]}
                    onValueChange={(value) => setZoomLevel(value[0])}
                    min={0}
                    max={200}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>100%</span>
                    <span>200%</span>
                  </div>
                </div>

                {/* Quick zoom buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={zoomLevel === 75 ? "default" : "outline"}
                    onClick={() => setZoomLevel(75)}
                    className="text-xs"
                  >
                    75%
                  </Button>
                  <Button
                    size="sm"
                    variant={zoomLevel === 100 ? "default" : "outline"}
                    onClick={() => setZoomLevel(100)}
                    className="text-xs"
                  >
                    100%
                  </Button>
                  <Button
                    size="sm"
                    variant={zoomLevel === 125 ? "default" : "outline"}
                    onClick={() => setZoomLevel(125)}
                    className="text-xs"
                  >
                    125%
                  </Button>
                  <Button
                    size="sm"
                    variant={zoomLevel === 150 ? "default" : "outline"}
                    onClick={() => setZoomLevel(150)}
                    className="text-xs"
                  >
                    150%
                  </Button>
                  <Button
                    size="sm"
                    variant={zoomLevel === 175 ? "default" : "outline"}
                    onClick={() => setZoomLevel(175)}
                    className="text-xs"
                  >
                    175%
                  </Button>
                  <Button
                    size="sm"
                    variant={zoomLevel === 200 ? "default" : "outline"}
                    onClick={() => setZoomLevel(200)}
                    className="text-xs"
                  >
                    200%
                  </Button>
                </div>

                {/* Reset button */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setZoomLevel(100)}
                  className="w-full"
                >
                  Reset to 100%
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <ThemeToggle variant="outline" className="hidden md:inline-flex" />

          <UserNav />
        </header>

        {/* Main Content (ONLY SCROLL HERE) */}
        <ScrollArea className="flex-1 h-full dark:bg-black" viewportProps={{ style: { scrollBehavior: 'smooth' } }}>
          <main className="p-4 lg:p-6 pb-20 dark:bg-black">
            {children}
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
