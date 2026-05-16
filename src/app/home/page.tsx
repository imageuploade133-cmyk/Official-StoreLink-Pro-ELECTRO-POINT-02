'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { StoreLinkLogo } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShoppingBag, 
  Smartphone, 
  Globe, 
  Shield,
  Zap,
  BarChart3,
  Users,
  ChevronRight,
  Star,
  Sparkles,
  Layout,
  MousePointer2,
  CreditCard,
  Package
} from 'lucide-react';

export default function HomeLandingPage() {
  const { user } = useAuth();
  
  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f]">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#d2d2d7] shadow-sm text-[#1d1d1f] text-sm font-medium mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <span className="flex h-2 w-2 rounded-full bg-[#0071e3]" />
            <span>AI-Powered Commerce is here.</span>
            <ChevronRight className="h-4 w-4 text-[#86868b]" />
          </div>
          
          <h1 className="text-5xl md:text-8xl font-semibold tracking-tight text-[#1d1d1f] mb-8 leading-[1.05] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
            One platform.<br />
            <span className="text-[#0071e3]">Everything retail.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-[#86868b] max-w-2xl mx-auto mb-12 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            The unified OS for modern commerce. Lightning-fast POS, beautiful online stores, and global scale.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <Button size="lg" className="h-12 px-8 rounded-full text-base font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white" asChild>
              <Link href={user ? "/dashboard" : "/signup-merchant"}>
                {user ? "Go to Dashboard" : "Start Free Trial"}
              </Link>
            </Button>
            <Link href={user ? "/dashboard" : "/login"} className="text-[#0066cc] font-semibold hover:underline flex items-center gap-1 group text-lg">
              {user ? "View Activity" : "Learn more"} <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          
          {/* Hero Device Mockup */}
          <div className="mt-20 relative max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-1000 delay-500">
            <div className="relative rounded-[2.5rem] p-3 bg-white shadow-[0_20px_80px_rgba(0,0,0,0.1)] border border-[#d2d2d7]/30">
              <div className="relative rounded-[2rem] overflow-hidden bg-[#f5f5f7] aspect-[16/10] border border-[#d2d2d7]/50">
                <Image 
                  src="https://emakemrnd.com.ng/D1.png" 
                  alt="StoreLink Pro Dashboard" 
                  fill
                  className="object-cover object-top"
                  unoptimized
                />
              </div>
            </div>
            
            {/* Ambient glows */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#0071e3]/5 rounded-full blur-[100px] -z-10" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#5ac8fa]/5 rounded-full blur-[100px] -z-10" />
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-lg font-semibold text-[#0071e3] mb-4">Capabilities</h2>
            <h3 className="text-4xl md:text-6xl font-semibold text-[#1d1d1f] tracking-tight">
              Built for what&apos;s next.
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[24rem]">
            {/* Large Card - POS */}
            <div className="md:col-span-8 group relative overflow-hidden rounded-[2.5rem] bg-[#1d1d1f] border border-white/10 p-10 transition-all duration-500 hover:shadow-2xl hover:border-white/20">
              <div className="relative z-20 max-w-md">
                <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-sm mb-6">
                  <Smartphone className="h-6 w-6 text-[#0071e3]" />
                </div>
                <h4 className="text-3xl font-semibold mb-4 tracking-tight text-white">Hybrid Cloud POS</h4>
                <p className="text-white/60 text-lg font-medium leading-relaxed">
                  Professional-grade Point of Sale that works on any device. Online or offline, your data stays perfectly in sync.
                </p>
              </div>
              <div className="absolute bottom-0 right-0 w-[75%] h-[75%] translate-x-10 translate-y-10 group-hover:translate-x-5 group-hover:translate-y-5 transition-transform duration-700 z-10">
                 <Image 
                    src="https://emakemrnd.com.ng/D1.png" 
                    alt="POS Mockup" 
                    fill
                    className="object-cover rounded-tl-3xl shadow-2xl"
                    unoptimized
                  />
                  {/* Premium Dark Fade Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1d1d1f] via-[#1d1d1f]/40 to-transparent z-10" />
                  <div className="absolute inset-0 bg-gradient-to-l from-[#1d1d1f] via-transparent to-transparent z-10" />
              </div>
              
              {/* Subtle background glow */}
              <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-[#0071e3]/10 rounded-full blur-[100px] z-0" />
            </div>

            {/* Small Card - Security */}
            <div className="md:col-span-4 group relative overflow-hidden rounded-[2.5rem] bg-[#1d1d1f] p-10 transition-all duration-500 hover:shadow-xl">
              <div className="relative z-10 text-white">
                <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                  <Shield className="h-6 w-6 text-[#0071e3]" />
                </div>
                <h4 className="text-2xl font-semibold mb-4 tracking-tight text-white">Bank-Grade Security</h4>
                <p className="text-white/60 font-medium leading-relaxed">
                  Enterprise security features to protect your business and your customers&apos; data.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#0071e3]/20 rounded-full blur-3xl" />
            </div>

            {/* Small Card - Analytics */}
            <div className="md:col-span-4 group relative overflow-hidden rounded-[2.5rem] bg-[#f5f5f7] border border-[#d2d2d7]/50 p-10 transition-all duration-500 hover:shadow-xl">
              <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm mb-6">
                  <BarChart3 className="h-6 w-6 text-[#34c759]" />
                </div>
                <h4 className="text-2xl font-semibold mb-4 tracking-tight">Real-time Insights</h4>
                <p className="text-[#86868b] font-medium leading-relaxed">
                  Advanced analytics to help you make informed decisions about your growth.
                </p>
              </div>
            </div>

            {/* Medium Card - Global Payments */}
            <div className="md:col-span-8 group relative overflow-hidden rounded-[2.5rem] bg-[#f5f5f7] border border-[#d2d2d7]/50 p-10 transition-all duration-500 hover:shadow-xl">
              <div className="flex flex-col md:flex-row h-full gap-8">
                <div className="flex-1 relative z-10">
                   <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm mb-6">
                    <Globe className="h-6 w-6 text-[#5856d6]" />
                  </div>
                  <h4 className="text-3xl font-semibold mb-4 tracking-tight">Global Payments</h4>
                  <p className="text-[#86868b] text-lg font-medium leading-relaxed">
                    Accept payments in any currency with native integrations for Stripe, PayPal, and more.
                  </p>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-2xl flex items-center justify-center p-6 shadow-sm group-hover:scale-105 transition-transform duration-500">
                            <Image 
                                src={`https://emakemrnd.com.ng/${i}.png`}
                                alt={`Payment Provider ${i}`}
                                width={80}
                                height={40}
                                className="object-contain max-h-12 w-auto"
                            />
                        </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full Width Feature Section */}
      <section className="py-32 bg-[#f5f5f7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="lg:w-1/2">
               <h2 className="text-lg font-semibold text-[#0071e3] mb-4">Design First</h2>
              <h3 className="text-4xl md:text-6xl font-semibold text-[#1d1d1f] tracking-tight leading-tight mb-8">
                Your store,<br />your way.
              </h3>
              <p className="text-xl text-[#86868b] font-medium leading-relaxed mb-10">
                Choose from a library of stunning, high-conversion themes. Customize every detail to match your brand identity without writing a single line of code.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { icon: <Layout />, text: "Visual Page Builder" },
                  { icon: <MousePointer2 />, text: "Drag & Drop UI" },
                  { icon: <Sparkles />, text: "AI Image Tools" },
                  { icon: <CheckCircle2 />, text: "Mobile Optimized" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 font-semibold text-[#1d1d1f]">
                    <span className="text-[#0071e3]">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2">
                <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#d2d2d7]/50 aspect-[4/3]">
                    <Image 
                        src="https://emakemrnd.com.ng/D2.png" 
                        alt="Customization Preview" 
                        fill
                        className="object-cover"
                        unoptimized
                    />
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Card */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-[3rem] bg-[#f5f5f7] p-12 md:p-24 text-center border border-[#d2d2d7]/30">
            <div className="flex justify-center gap-0.5 mb-10">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-6 w-6 fill-[#ff9500] text-[#ff9500]" />)}
            </div>
            <blockquote className="text-3xl md:text-5xl font-semibold tracking-tight text-[#1d1d1f] mb-12 leading-tight">
              &quot;The most polished commerce platform we&apos;ve used. It just works, beautifully.&quot;
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 shadow-inner" />
              <div className="text-left">
                <p className="font-bold text-xl text-[#1d1d1f]">David Richards</p>
                <p className="text-[#86868b] font-medium">Founder, Artisan Goods</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Card */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-[3rem] bg-[#0071e3] p-12 md:p-24 text-center">
            <div className="relative z-10">
                <h2 className="text-4xl md:text-7xl font-semibold text-white mb-8 tracking-tight">Ready to scale?</h2>
                <p className="text-white/80 text-xl md:text-2xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
                Join 10,000+ merchants building the future of retail on StoreLink Pro.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <Button size="lg" className="h-14 px-10 rounded-full text-lg font-semibold bg-white text-[#0071e3] hover:bg-[#f5f5f7] transition-all" asChild>
                        <Link href={user ? "/dashboard" : "/signup-merchant"}>
                        {user ? "Go to Dashboard" : "Start Free Trial"}
                        </Link>
                    </Button>
                    <Link href="/home/contact" className="text-white font-semibold hover:underline text-lg flex items-center gap-1 group">
                        Speak with sales <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </div>
            {/* Abstract background patterns */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-black/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
          </div>
        </div>
      </section>

      <style jsx global>{`
        @font-face {
          font-family: 'SF Pro Display';
          src: url('https://sf-static.b-cdn.net/font/SF-Pro-Display-Regular.woff2') format('woff2');
          font-weight: 400;
        }
        @font-face {
          font-family: 'SF Pro Display';
          src: url('https://sf-static.b-cdn.net/font/SF-Pro-Display-Semibold.woff2') format('woff2');
          font-weight: 600;
        }
        @font-face {
          font-family: 'SF Pro Display';
          src: url('https://sf-static.b-cdn.net/font/SF-Pro-Display-Bold.woff2') format('woff2');
          font-weight: 700;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </div>
  );
}
