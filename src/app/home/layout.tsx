'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StoreLinkLogo } from '@/components/icons';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-primary selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="bg-primary rounded-xl p-1.5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-primary/20">
              <StoreLinkLogo className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              StoreLink<span className="text-primary font-black">Pro</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-10">
            <Link href="/home/features" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Features</Link>
            <Link href="/home/blog" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Blog</Link>
            <Link href="/home/careers" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Careers</Link>
            <Link href="/home/contact" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href={user ? "/dashboard" : "/login"} className="hidden sm:block text-sm font-bold text-slate-600 hover:text-primary transition-colors">
              {user ? "View Dashboard" : "Login"}
            </Link>
            <Button className="rounded-full px-6 font-bold shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all active:scale-95" asChild>
              <Link href={user ? "/dashboard" : "/signup-merchant"}>
                {user ? "active account" : "Start Free Trial"}
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <main>{children}</main>

      {/* Footer */}
      <footer className="py-24 bg-[#fafafa] border-t border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-1 md:col-span-1">
              <Link href="/home" className="flex items-center gap-2.5 mb-6">
                <StoreLinkLogo className="h-8 w-8 text-primary" />
                <span className="font-black text-2xl tracking-tighter">StoreLink Pro</span>
              </Link>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                The operating system for modern commerce. Unified, global, and ready for whatever comes next.
              </p>
            </div>
            
            <div>
              <h5 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-xs">Product</h5>
              <ul className="space-y-4">
                <li><Link href="/home/features" className="text-slate-500 hover:text-primary transition-colors font-medium">Features</Link></li>
                <li><Link href="/home/features" className="text-slate-500 hover:text-primary transition-colors font-medium">POS System</Link></li>
                <li><Link href="/home/features" className="text-slate-500 hover:text-primary transition-colors font-medium">Inventory</Link></li>
                <li><Link href="/home/features" className="text-slate-500 hover:text-primary transition-colors font-medium">Analytics</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-xs">Company</h5>
              <ul className="space-y-4">
                <li><Link href="/home/about" className="text-slate-500 hover:text-primary transition-colors font-medium">About Us</Link></li>
                <li><Link href="/home/careers" className="text-slate-500 hover:text-primary transition-colors font-medium">Careers</Link></li>
                <li><Link href="/home/blog" className="text-slate-500 hover:text-primary transition-colors font-medium">Blog</Link></li>
                <li><Link href="/home/contact" className="text-slate-500 hover:text-primary transition-colors font-medium">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-xs">Legal</h5>
              <ul className="space-y-4">
                <li><Link href="/home/privacy-policy" className="text-slate-500 hover:text-primary transition-colors font-medium">Privacy Policy</Link></li>
                <li><Link href="/home/terms-of-service" className="text-slate-500 hover:text-primary transition-colors font-medium">Terms of Service</Link></li>
                <li><Link href="/home/cookie-policy" className="text-slate-500 hover:text-primary transition-colors font-medium">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">
              © {new Date().getFullYear()} StoreLink Pro. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
               <div className="h-8 w-8 rounded-full bg-slate-200" />
               <div className="h-8 w-8 rounded-full bg-slate-200" />
               <div className="h-8 w-8 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
