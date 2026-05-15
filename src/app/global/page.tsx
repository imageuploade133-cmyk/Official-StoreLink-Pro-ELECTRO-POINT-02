'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StoreLinkLogo } from '@/components/icons';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShoppingBag, 
  PieChart, 
  Smartphone, 
  Globe, 
  Shield,
  Zap,
  Layout,
  BarChart3,
  Users
} from 'lucide-react';
import Image from 'next/image';

export default function GlobalLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-primary/10 selection:text-primary">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-primary rounded-lg p-1 transition-transform group-hover:rotate-12">
              <StoreLinkLogo className="h-7 w-7 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              StoreLink Pro
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors">Features</Link>
            <Link href="#solutions" className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors">Solutions</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="font-bold text-slate-600 hover:text-primary" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button className="font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" asChild>
              <Link href="/signup-merchant">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Zap className="h-4 w-4 fill-primary" />
            <span>The Future of Retail is Here</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-75">
            One Platform.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Infinite Possibilities.</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            StoreLink Pro is the comprehensive multi-tenant e-commerce and POS platform designed for modern retailers. Scale your business with powerful inventory, sales, and customer management.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <Button size="lg" className="h-14 px-10 text-lg font-bold shadow-xl shadow-primary/25" asChild>
              <Link href="/signup-merchant">
                Launch Your Store <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold border-2" asChild>
              <Link href="/login">Merchant Dashboard</Link>
            </Button>
          </div>
          
          {/* Dashboard Preview Mockup */}
          <div className="mt-20 relative mx-auto max-w-5xl animate-in fade-in zoom-in duration-1000 delay-300">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-900 aspect-[16/9]">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                 <div className="text-slate-500 flex flex-col items-center gap-4">
                    <Layout className="h-20 w-20 opacity-20" />
                    <p className="font-bold tracking-widest uppercase opacity-20">StoreLink Pro Interface</p>
                 </div>
              </div>
              {/* Floating UI Elements */}
              <div className="absolute top-10 left-10 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl animate-bounce-slow">
                 <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <div className="absolute bottom-10 right-10 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl animate-pulse">
                 <Users className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-slate-50 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Built for Growth</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg font-medium leading-relaxed">
              Every tool you need to manage your retail empire, from a single storefront to a global network of shops.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <ShoppingBag className="h-8 w-8 text-white" />,
                title: "Multi-Storefront",
                description: "Launch beautiful, high-converting online stores for each of your brands under one central account.",
                color: "bg-primary"
              },
              {
                icon: <Smartphone className="h-8 w-8 text-white" />,
                title: "Cloud POS",
                description: "Seamlessly integrate your physical and online sales with our lightning-fast Point of Sale system.",
                color: "bg-blue-600"
              },
              {
                icon: <PieChart className="h-8 w-8 text-white" />,
                title: "Real-time Analytics",
                description: "Gain deep insights into your sales, inventory, and customer behavior with interactive reports.",
                color: "bg-indigo-600"
              },
              {
                icon: <Globe className="h-8 w-8 text-white" />,
                title: "Custom Domains",
                description: "Full SSL-protected custom domains or subdomains for a completely branded customer experience.",
                color: "bg-emerald-600"
              },
              {
                icon: <Shield className="h-8 w-8 text-white" />,
                title: "Secure Payments",
                description: "Accept payments globally via Stripe, PayPal, Paystack, and more with 100% secure processing.",
                color: "bg-amber-600"
              },
              {
                icon: <CheckCircle2 className="h-8 w-8 text-white" />,
                title: "Smart Inventory",
                description: "Auto-sync stock levels across all channels, set low-stock alerts, and manage bulk transfers.",
                color: "bg-rose-600"
              }
            ].map((feature, index) => (
              <div key={index} className="group bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <div className={`mb-8 p-4 ${feature.color} rounded-2xl inline-block shadow-lg group-hover:rotate-6 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed font-medium">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto bg-slate-900 rounded-[3.5rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter">Ready to revolutionize<br />your business?</h2>
            <p className="text-slate-400 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
              Join the new generation of merchants who are scaling faster with StoreLink Pro&apos;s all-in-one ecosystem.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="h-16 px-12 text-xl font-black bg-white text-slate-900 hover:bg-slate-100" asChild>
                <Link href="/signup-merchant">Get Started Now</Link>
                </Button>
                <Link href="/login" className="text-white font-bold hover:text-primary transition-colors flex items-center gap-2">
                    Or Sign In to Dashboard <ArrowRight className="h-5 w-5" />
                </Link>
            </div>
          </div>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex flex-col items-center md:items-start gap-4">
                <div className="flex items-center gap-2">
                    <StoreLinkLogo className="h-8 w-8 text-primary" />
                    <span className="font-black text-2xl tracking-tighter">StoreLink Pro</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">Empowering commerce everywhere.</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
                <Link href="#features" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors uppercase tracking-widest">Features</Link>
                <Link href="/signup-merchant" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors uppercase tracking-widest">Sign Up</Link>
                <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors uppercase tracking-widest">Merchant Login</Link>
            </div>
          </div>
          
          <div className="mt-20 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-xs font-bold">© {new Date().getFullYear()} STORELINK PRO. ALL RIGHTS RESERVED.</p>
            <div className="flex items-center gap-8">
                <span className="text-slate-400 text-xs font-bold cursor-pointer hover:text-slate-600">PRIVACY POLICY</span>
                <span className="text-slate-400 text-xs font-bold cursor-pointer hover:text-slate-600">TERMS OF SERVICE</span>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
