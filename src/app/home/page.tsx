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
  Star
} from 'lucide-react';

export default function HomeLandingPage() {
  const { user } = useAuth();
  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] -z-10 opacity-40">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-full bg-[radial-gradient(50%_50%_at_50%_50%,#e2e8f0_0%,rgba(255,255,255,0)_100%)]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 text-xs font-bold mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="uppercase tracking-wider">New: AI-Powered Inventory is live</span>
            <ChevronRight className="h-3 w-3" />
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 mb-8 leading-[0.9] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
            One platform.<br />
            <span className="text-primary">Infinite possibilities.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            The all-in-one OS for modern retail. Unified commerce, lightning POS, and global scale—built for the next generation of merchants.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <Button size="lg" className="h-14 px-10 rounded-full text-lg font-bold shadow-2xl shadow-primary/30" asChild>
              <Link href={user ? "/dashboard" : "/signup-merchant"}>
                {user ? "active account" : "Get Started for Free"}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-10 rounded-full text-lg font-bold border-2 bg-white" asChild>
              <Link href={user ? "/dashboard" : "/login"}>
                {user ? "View Dashboard" : "View Live Demo"}
              </Link>
            </Button>
          </div>
          
          {/* Main App Mockup */}
          <div className="mt-24 relative max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-1000 delay-500">
            <div className="relative rounded-[2rem] p-2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_20px_50px_rgba(0,0,0,0.1)]">
              <div className="relative rounded-[1.5rem] overflow-hidden bg-white aspect-[16/10] border border-slate-200">
                <div className="absolute inset-0">
                  <Image 
                    src="https://emakemrnd.com.ng/D1.png" 
                    alt="StoreLink Pro Dashboard" 
                    fill
                    priority
                    className="object-contain"
                  />
                </div>
                
                {/* Floating Elements */}
                <div className="absolute top-1/4 left-10 p-5 bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-white flex items-center gap-4 animate-bounce-slow z-10">
                  <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue</p>
                    <p className="text-xl font-black text-slate-900">+$12,450.00</p>
                  </div>
                </div>

                <div className="absolute bottom-1/4 right-10 p-5 bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-white flex items-center gap-4 animate-float z-10">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Customers</p>
                    <p className="text-xl font-black text-slate-900">+48</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Visual background element */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-50 grayscale">
          <div className="font-black text-2xl tracking-tighter italic">RETAILFLOW</div>
          <div className="font-black text-2xl tracking-tighter">MERCHLY</div>
          <div className="font-black text-2xl tracking-tighter italic underline decoration-primary">SPEEDSHOP</div>
          <div className="font-black text-2xl tracking-tighter">CORE</div>
          <div className="font-black text-2xl tracking-tighter italic">VANTAGE</div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 relative bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-24">
            <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em] mb-4">Core Capabilities</h2>
            <h3 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Everything you need to <br />run your business.
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <ShoppingBag className="h-6 w-6 text-primary" />,
                title: "Unified Storefront",
                description: "One back-office to manage beautiful online stores across multiple subdomains and custom domains.",
                gradient: "from-blue-50 to-indigo-50"
              },
              {
                icon: <Smartphone className="h-6 w-6 text-blue-600" />,
                title: "Hybrid Cloud POS",
                description: "A professional-grade POS system that works on any device, syncing real-time with your online store.",
                gradient: "from-slate-50 to-blue-50"
              },
              {
                icon: <Zap className="h-6 w-6 text-amber-500" />,
                title: "Instant Analytics",
                description: "Real-time insights into your sales, staff performance, and customer trends from anywhere in the world.",
                gradient: "from-amber-50 to-orange-50"
              },
              {
                icon: <Globe className="h-6 w-6 text-emerald-600" />,
                title: "Global Payments",
                description: "Accept any currency with native integrations for Stripe, PayPal, Paystack, and Flutterwave.",
                gradient: "from-emerald-50 to-teal-50"
              },
              {
                icon: <Shield className="h-6 w-6 text-indigo-600" />,
                title: "Enterprise Security",
                description: "Bank-grade encryption, secure checkout, and granular staff permissions for total peace of mind.",
                gradient: "from-indigo-50 to-purple-50"
              },
              {
                icon: <CheckCircle2 className="h-6 w-6 text-rose-600" />,
                title: "Smart Inventory",
                description: "Automated stock tracking, bulk imports, and low-stock alerts to keep your business running smoothly.",
                gradient: "from-rose-50 to-pink-50"
              }
            ].map((feature, index) => (
              <div key={index} className={`group relative p-10 rounded-[2rem] border border-slate-100 bg-gradient-to-br ${feature.gradient} transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1`}>
                <div className="mb-8 h-14 w-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
                  {feature.icon}
                </div>
                <h4 className="text-2xl font-black text-slate-900 mb-4">{feature.title}</h4>
                <p className="text-slate-500 leading-relaxed font-medium">{feature.description}</p>
                <div className="mt-8 flex items-center text-sm font-bold text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Link href="/home/features" className="flex items-center">
                    Learn more <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-32 bg-[#09090b] text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center">
            <div className="flex gap-1 mb-8">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 fill-primary text-primary" />)}
            </div>
            <blockquote className="text-3xl md:text-5xl font-black tracking-tight max-w-4xl mb-12 leading-tight">
              &quot;StoreLink Pro transformed how we manage our 12 locations. The POS is lightning fast and the multi-store management is a game changer.&quot;
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-slate-800" />
              <div className="text-left">
                <p className="font-bold text-lg">Marcus Chen</p>
                <p className="text-slate-500 text-sm">Founder, Urban Collective</p>
              </div>
            </div>
          </div>
        </div>
        {/* Background Decorative */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/10 rounded-full blur-[120px] -z-0" />
      </section>

      {/* Voice Description Feature Showcase */}
      <section className="py-32 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em] mb-4">Innovation</h2>
              <h3 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-8">
                Your products, <br /><span className="text-primary">with a voice.</span>
              </h3>
              <p className="text-xl text-slate-500 font-medium leading-relaxed mb-8">
                Bring your products to life with integrated voice descriptions. Give your customers an immersive shopping experience with expert insights and audio pitches.
              </p>
              <div className="space-y-4">
                {[
                  "Immersive audio signatures for every product",
                  "Explain complex features with expert narration",
                  "Increase accessibility for all customers",
                  "Build trust through personal audio pitches"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-700 font-bold">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2 relative">
              <div className="relative bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Audio Experience</p>
                    <p className="text-xl font-bold">Listen to Audio Signature</p>
                  </div>
                </div>
                
                <div className="h-2 w-full bg-slate-100 rounded-full mb-4 overflow-hidden">
                  <div className="h-full bg-primary w-2/3 rounded-full" />
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-8">
                  <span>1:24</span>
                  <span>2:10</span>
                </div>
                
                <div className="flex justify-center gap-6">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-slate-400 rotate-180" />
                  </div>
                  <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                    <Zap className="h-8 w-8 fill-current" />
                  </div>
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-slate-400" />
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Create Website Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-8 leading-[0.9]">
            Your brand. Your store.<br />
            <span className="text-primary">Your way.</span>
          </h2>
          <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
            Create your stunning e-commerce website in minutes. With StoreLink Pro, you have the tools to build a global brand from day one.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                title: "Custom Domains",
                description: "Connect your own domain or use our high-speed subdomains."
              },
              {
                title: "Beautiful Themes",
                description: "Choose from professional designs optimized for conversion."
              },
              {
                title: "Global Reach",
                description: "Sell to customers anywhere in the world with ease."
              }
            ].map((item, i) => (
              <div key={i} className="p-10 rounded-[2rem] bg-slate-50 border border-slate-100">
                <h4 className="text-2xl font-black mb-4">{item.title}</h4>
                <p className="text-slate-500 font-medium">{item.description}</p>
              </div>
            ))}
          </div>
          <Button size="lg" className="h-16 px-12 rounded-full text-xl font-black shadow-2xl shadow-primary/30" asChild>
            <Link href="/signup-merchant">Create Your Store Now</Link>
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto bg-primary rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden shadow-3xl shadow-primary/30">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tighter">Ready to scale?</h2>
            <p className="text-white/80 text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
              Join thousands of merchants who are growing their business with the world&apos;s most flexible commerce platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button size="lg" className="h-16 px-12 rounded-full text-xl font-black bg-white text-primary hover:bg-slate-50 transition-all active:scale-95" asChild>
                  <Link href={user ? "/dashboard" : "/signup-merchant"}>
                    {user ? "active account" : "Start Free Trial"}
                  </Link>
                </Button>
                <Link href={user ? "/dashboard" : "/login"} className="text-white font-bold hover:underline transition-all flex items-center gap-2 text-lg">
                    {user ? "View Dashboard" : "Speak with Sales"} <ArrowRight className="h-5 w-5" />
                </Link>
            </div>
          </div>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
        </div>
      </section>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-10px) translateX(5px); }
          66% { transform: translateY(5px) translateX(-5px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 6s ease-in-out infinite;
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
