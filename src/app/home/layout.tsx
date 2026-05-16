'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StoreLinkLogo } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] font-sans selection:bg-[#0071e3] selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-[#d2d2d7]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2 group cursor-pointer">
            <StoreLinkLogo className="h-5 w-5 text-[#1d1d1f]" />
            <span className="font-semibold text-lg tracking-tight text-[#1d1d1f]">
              StoreLink<span className="font-bold">Pro</span>
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="/home/features" className="text-xs font-normal text-[#1d1d1f]/80 hover:text-[#0071e3] transition-colors">Features</Link>
            <Link href="/home/blog" className="text-xs font-normal text-[#1d1d1f]/80 hover:text-[#0071e3] transition-colors">Blog</Link>
            <Link href="/home/careers" className="text-xs font-normal text-[#1d1d1f]/80 hover:text-[#0071e3] transition-colors">Careers</Link>
            <Link href="/home/contact" className="text-xs font-normal text-[#1d1d1f]/80 hover:text-[#0071e3] transition-colors">Contact</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href={user ? "/dashboard" : "/login"} className="hidden sm:block text-xs font-normal text-[#1d1d1f]/80 hover:text-[#0071e3] transition-colors">
              {user ? "Dashboard" : "Login"}
            </Link>
            <Link 
              href={user ? "/dashboard" : "/signup-merchant"}
              className="bg-[#0071e3] text-white text-[11px] font-semibold px-3 py-1 rounded-full hover:bg-[#0077ed] transition-colors"
            >
              {user ? "Account" : "Try Free"}
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-12">{children}</main>

      {/* Footer */}
      <footer className="py-20 bg-[#f5f5f7] border-t border-[#d2d2d7]/50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div>
              <h5 className="font-semibold text-[#1d1d1f] mb-4 text-xs">Product</h5>
              <ul className="space-y-2">
                <li><Link href="/home/features" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">Features</Link></li>
                <li><Link href="/home/features" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">POS System</Link></li>
                <li><Link href="/home/features" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">Inventory</Link></li>
                <li><Link href="/home/features" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">Analytics</Link></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold text-[#1d1d1f] mb-4 text-xs">Company</h5>
              <ul className="space-y-2">
                <li><Link href="/home/about" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">About Us</Link></li>
                <li><Link href="/home/careers" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">Careers</Link></li>
                <li><Link href="/home/blog" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">Blog</Link></li>
                <li><Link href="/home/contact" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-semibold text-[#1d1d1f] mb-4 text-xs">Support</h5>
              <ul className="space-y-2">
                <li><Link href="/home/contact" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">Help Center</Link></li>
                <li><Link href="/home/contact" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">Sales</Link></li>
                <li><Link href="/home/contact" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">Status</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-semibold text-[#1d1d1f] mb-4 text-xs">Legal</h5>
              <ul className="space-y-2">
                <li><Link href="/home/privacy-policy" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">Privacy</Link></li>
                <li><Link href="/home/terms-of-service" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">Terms</Link></li>
                <li><Link href="/home/cookie-policy" className="text-[#86868b] hover:text-[#1d1d1f] hover:underline transition-colors text-xs">Cookies</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-[#d2d2d7] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[#86868b] text-[11px]">
              Copyright © {new Date().getFullYear()} StoreLink Pro Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-[#86868b] text-[11px]">
               <Link href="/home/privacy-policy" className="hover:text-[#1d1d1f] hover:underline">Privacy Policy</Link>
               <span className="w-px h-3 bg-[#d2d2d7]" />
               <Link href="/home/terms-of-service" className="hover:text-[#1d1d1f] hover:underline">Terms of Use</Link>
               <span className="w-px h-3 bg-[#d2d2d7]" />
               <Link href="/home" className="hover:text-[#1d1d1f] hover:underline">United States</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
