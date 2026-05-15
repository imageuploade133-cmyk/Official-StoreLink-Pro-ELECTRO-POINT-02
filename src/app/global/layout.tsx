import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StoreLinkLogo } from '@/components/icons';
import { ChevronRight } from 'lucide-react';

export default function GlobalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#000000] text-slate-900 dark:text-slate-100 font-sans selection:bg-primary selection:text-white transition-colors duration-500">
      {/* Background Grid and Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/global" className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-primary rounded-[1rem] p-2 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-xl shadow-primary/30">
              <StoreLinkLogo className="h-6 w-6 text-white" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-slate-900 dark:text-white">
              StoreLink<span className="text-primary">Pro</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-10">
            <Link href="/global/features" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-all uppercase tracking-widest">Features</Link>
            <Link href="/global/blog" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-all uppercase tracking-widest">Blog</Link>
            <Link href="/global/careers" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-all uppercase tracking-widest">Careers</Link>
            <Link href="/global/contact" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-all uppercase tracking-widest">Contact</Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hidden sm:block text-sm font-black text-slate-600 dark:text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">
              Login
            </Link>
            <Button className="rounded-full px-8 h-12 font-black shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all active:scale-95 group relative overflow-hidden" asChild>
              <Link href="/signup-merchant">
                <span className="relative z-10">Get Started</span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">{children}</main>

      {/* Footer */}
      <footer className="relative z-10 py-32 bg-white dark:bg-[#050505] border-t border-slate-200 dark:border-white/5 px-4 sm:px-6 lg:px-8 overflow-hidden transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
            <div className="col-span-1 md:col-span-1">
              <Link href="/global" className="flex items-center gap-3 mb-8 group">
                <div className="bg-primary/10 rounded-xl p-2 group-hover:scale-110 transition-transform">
                  <StoreLinkLogo className="h-8 w-8 text-primary" />
                </div>
                <span className="font-black text-3xl tracking-tighter dark:text-white">StoreLink Pro</span>
              </Link>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-10 text-lg">
                The futuristic operating system for modern commerce. Unified, global, and ready for whatever comes next.
              </p>
            </div>
            
            <div>
              <h5 className="font-black text-slate-900 dark:text-white mb-8 uppercase tracking-[0.2em] text-sm">Product</h5>
              <ul className="space-y-5">
                <li><Link href="/global/features" className="text-slate-500 dark:text-slate-400 hover:text-primary transition-all font-bold">Features</Link></li>
                <li><Link href="/global/features" className="text-slate-500 dark:text-slate-400 hover:text-primary transition-all font-bold">Hybrid POS</Link></li>
                <li><Link href="/global/features" className="text-slate-500 dark:text-slate-400 hover:text-primary transition-all font-bold">AI Analytics</Link></li>
                <li><Link href="/global/features" className="text-slate-500 dark:text-slate-400 hover:text-primary transition-all font-bold">Global Scale</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-black text-slate-900 dark:text-white mb-8 uppercase tracking-[0.2em] text-sm">Company</h5>
              <ul className="space-y-5">
                <li><Link href="/global/about" className="text-slate-500 dark:text-slate-400 hover:text-primary transition-all font-bold">Our Vision</Link></li>
                <li><Link href="/global/careers" className="text-slate-500 dark:text-slate-400 hover:text-primary transition-all font-bold">Careers</Link></li>
                <li><Link href="/global/blog" className="text-slate-500 dark:text-slate-400 hover:text-primary transition-all font-bold">Insights</Link></li>
                <li><Link href="/global/contact" className="text-slate-500 dark:text-slate-400 hover:text-primary transition-all font-bold">Support</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="font-black text-slate-900 dark:text-white mb-8 uppercase tracking-[0.2em] text-sm">Legal</h5>
              <ul className="space-y-5">
                <li><Link href="/global/privacy-policy" className="text-slate-500 dark:text-slate-400 hover:text-primary transition-all font-bold">Privacy</Link></li>
                <li><Link href="/global/terms-of-service" className="text-slate-500 dark:text-slate-400 hover:text-primary transition-all font-bold">Terms</Link></li>
                <li><Link href="/global/cookie-policy" className="text-slate-500 dark:text-slate-400 hover:text-primary transition-all font-bold">Cookies</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-12 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-10">
            <p className="text-slate-400 dark:text-slate-500 text-sm font-black tracking-[0.2em] uppercase">
              © {new Date().getFullYear()} StoreLink Pro. Unified Commerce Engine.
            </p>
            <div className="flex items-center gap-8">
               <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary transition-colors cursor-pointer" />
               <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary transition-colors cursor-pointer" />
               <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] translate-y-1/2 translate-x-1/2" />
      </footer>
    </div>
  );
}
