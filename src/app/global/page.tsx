'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StoreLinkLogo } from '@/components/icons';
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

export default function GlobalLandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#000000] selection:bg-primary/30 selection:text-primary transition-colors duration-500">
      {/* Background Grid and Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] opacity-50 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] opacity-40 animate-pulse" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-40 pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-xl text-slate-600 dark:text-slate-300 text-xs font-bold mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="uppercase tracking-widest">AI-Powered Unified Commerce OS</span>
              <ChevronRight className="h-3 w-3" />
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 dark:text-white mb-8 leading-[0.9] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
              The Future of <br />
              <span className="text-primary text-glow-blue">Modern Retail.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-12 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              One platform. Infinite possibilities. Unified commerce, hybrid cloud POS, and global scale—built for the next generation.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
              <Button size="lg" className="h-16 px-10 rounded-full text-lg font-bold shadow-2xl shadow-primary/30 group relative overflow-hidden" asChild>
                <Link href="/signup-merchant">
                  <span className="relative z-10">Start Scaling Now</span>
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-16 px-10 rounded-full text-lg font-bold border-2 bg-white/50 dark:bg-white/5 backdrop-blur-md dark:text-white border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-all" asChild>
                <Link href="/login">Explore Demo</Link>
              </Button>
            </div>
            
            {/* Main App Mockup */}
            <div className="mt-24 relative max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-1000 delay-500">
              <div className="premium-card moving-border-glow p-2">
                <div className="relative rounded-[1.8rem] overflow-hidden bg-slate-50 dark:bg-[#0a0a0b] aspect-[16/10] border border-slate-200 dark:border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#0a0a0b] dark:to-[#161618] flex items-center justify-center">
                     <div className="flex flex-col items-center gap-6 opacity-20 scale-150">
                        <StoreLinkLogo className="h-24 w-24 text-primary" />
                        <div className="h-2 w-48 bg-slate-300 dark:bg-white/10 rounded-full" />
                        <div className="h-2 w-32 bg-slate-300 dark:bg-white/10 rounded-full" />
                     </div>
                  </div>
                  
                  {/* Floating Elements */}
                  <div className="absolute top-1/4 left-10 p-6 premium-card moving-border-glow flex items-center gap-4 animate-bounce-slow">
                    <div className="h-14 w-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                      <BarChart3 className="h-7 w-7 text-green-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">+$12,450.00</p>
                    </div>
                  </div>

                  <div className="absolute bottom-1/4 right-10 p-6 premium-card moving-border-glow flex items-center gap-4 animate-float">
                    <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <Users className="h-7 w-7 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Storefronts</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">+1,248</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-20 border-y border-slate-100 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale dark:invert">
            <div className="font-black text-3xl tracking-tighter italic">RETAILFLOW</div>
            <div className="font-black text-3xl tracking-tighter">MERCHLY</div>
            <div className="font-black text-3xl tracking-tighter italic underline decoration-primary">SPEEDSHOP</div>
            <div className="font-black text-3xl tracking-tighter">CORE</div>
            <div className="font-black text-3xl tracking-tighter italic">VANTAGE</div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-24">
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-4">Core Ecosystem</h2>
              <h3 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                Everything you need to <br />dominate commerce.
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <ShoppingBag className="h-7 w-7 text-primary" />,
                  title: "Unified Storefront",
                  description: "One back-office to manage beautiful online stores across multiple subdomains and custom domains.",
                  gradient: "from-blue-500/5 to-indigo-500/5"
                },
                {
                  icon: <Smartphone className="h-7 w-7 text-blue-500" />,
                  title: "Hybrid Cloud POS",
                  description: "A professional-grade POS system that works on any device, syncing real-time with your inventory.",
                  gradient: "from-slate-500/5 to-blue-500/5"
                },
                {
                  icon: <Zap className="h-7 w-7 text-amber-500" />,
                  title: "Real-time Edge Analytics",
                  description: "Instant insights into sales, staff performance, and global customer trends at the speed of light.",
                  gradient: "from-amber-500/5 to-orange-500/5"
                },
                {
                  icon: <Globe className="h-7 w-7 text-emerald-500" />,
                  title: "Global Multi-Acquirer",
                  description: "Accept any currency with native integrations for Stripe, PayPal, Paystack, and international transfers.",
                  gradient: "from-emerald-500/5 to-teal-500/5"
                },
                {
                  icon: <Shield className="h-7 w-7 text-indigo-500" />,
                  title: "Military-Grade Security",
                  description: "Quantum-ready encryption, secure checkout, and granular RBAC staff permissions for total control.",
                  gradient: "from-indigo-500/5 to-purple-500/5"
                },
                {
                  icon: <CheckCircle2 className="h-7 w-7 text-rose-500" />,
                  title: "Smart Inventory AI",
                  description: "Automated stock tracking, predictive restock, and bulk imports to keep your business frictionless.",
                  gradient: "from-rose-500/5 to-pink-500/5"
                }
              ].map((feature, index) => (
                <div key={index} className="premium-card moving-border-glow p-10 group bg-white/50 dark:bg-white/[0.03]">
                  <div className="mb-8 h-16 w-16 bg-white dark:bg-white/10 rounded-[1.5rem] flex items-center justify-center shadow-lg border border-slate-100 dark:border-white/10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    {feature.icon}
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-primary transition-colors">{feature.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-8">{feature.description}</p>
                  <Link href="/global/features" className="inline-flex items-center text-sm font-bold text-slate-900 dark:text-white group/link">
                    Explore Capability <ChevronRight className="h-4 w-4 ml-1 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial Section */}
        <section className="py-40 relative overflow-hidden bg-[#050505]">
          <div className="absolute inset-0 bg-primary/5 opacity-30" />
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="flex flex-col items-center text-center">
              <div className="flex gap-1 mb-10">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-6 w-6 fill-primary text-primary" />)}
              </div>
              <blockquote className="text-3xl md:text-6xl font-black tracking-tight text-white max-w-5xl mb-16 leading-tight">
                &quot;StoreLink Pro transformed how we manage our 12 locations. The POS is lightning fast and the multi-store management is a game changer.&quot;
              </blockquote>
              <div className="flex items-center gap-6 p-4 premium-card moving-border-glow bg-white/5 backdrop-blur-xl">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-blue-600 p-0.5">
                  <div className="h-full w-full rounded-full bg-slate-900 overflow-hidden">
                    {/* Placeholder for avatar */}
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-bold text-xl text-white">Marcus Chen</p>
                  <p className="text-slate-400 text-sm">Founder, Urban Collective</p>
                </div>
              </div>
            </div>
          </div>
          {/* Background Decorative */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-primary/20 rounded-full blur-[160px] -z-0 opacity-40" />
        </section>

        {/* Voice Description Feature Showcase */}
        <section className="py-32 overflow-hidden bg-slate-50 dark:bg-[#08080a] transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-20">
              <div className="lg:w-1/2">
                <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-4">Sonic Experience</h2>
                <h3 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-10">
                  Your products, <br /><span className="text-primary text-glow-blue">with a voice.</span>
                </h3>
                <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-10">
                  Bring your products to life with integrated AI voice signatures. Immersive shopping experiences with high-fidelity expert narration.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    "Spatial audio signatures",
                    "AI Expert Narration",
                    "Accessibility-first UX",
                    "Trusted Audio Pitches"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 text-slate-800 dark:text-slate-200 font-bold premium-card p-4 bg-white/50 dark:bg-white/5 border-none shadow-none">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:w-1/2 relative">
                <div className="premium-card moving-border-glow p-10 bg-white/80 dark:bg-[#0c0c0e]">
                  <div className="flex items-center gap-6 mb-12">
                    <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Zap className="h-10 w-10 text-primary animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Sonic Signature</p>
                      <p className="text-2xl font-bold dark:text-white">Active Product Pitch</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-2/3 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    </div>
                    <div className="flex justify-between text-xs font-black text-slate-400">
                      <span>01:24</span>
                      <span>03:45</span>
                    </div>
                    
                    <div className="flex justify-center items-center gap-10">
                      <button className="h-14 w-14 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                        <ArrowRight className="h-7 w-7 rotate-180" />
                      </button>
                      <button className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all">
                        <Zap className="h-10 w-10 fill-current" />
                      </button>
                      <button className="h-14 w-14 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                        <ArrowRight className="h-7 w-7" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/20 rounded-full blur-[80px] animate-pulse" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] animate-pulse" />
              </div>
            </div>
          </div>
        </section>

        {/* Global Infrastructure Section */}
        <section className="py-40 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-white dark:bg-[#000000]">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-5xl md:text-8xl font-black tracking-tight text-slate-900 dark:text-white mb-10 leading-[0.9]">
              Built for <br />
              <span className="text-primary text-glow-blue">Global Scale.</span>
            </h2>
            <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-4xl mx-auto mb-20 font-medium leading-relaxed">
              Create your stunning e-commerce empire in minutes. We provide the tools, you provide the vision. Build a brand that spans continents.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              {[
                {
                  title: "Any Sub/Custom Domain",
                  description: "Connect unlimited domains with instant global propagation and SSL.",
                  icon: <Globe className="h-6 w-6 text-primary" />
                },
                {
                  title: "Liquid-Fast UI",
                  description: "Themes optimized for sub-second LCP and maximum customer conversion.",
                  icon: <Zap className="h-6 w-6 text-amber-500" />
                },
                {
                  title: "Infinite Resilience",
                  description: "Distributed infrastructure with 99.99% uptime guarantee for peak sale events.",
                  icon: <Shield className="h-6 w-6 text-emerald-500" />
                }
              ].map((item, i) => (
                <div key={i} className="premium-card moving-border-glow p-12 bg-white/50 dark:bg-white/[0.03] text-left">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center mb-8">
                    {item.icon}
                  </div>
                  <h4 className="text-2xl font-black mb-4 dark:text-white">{item.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">{item.description}</p>
                </div>
              ))}
            </div>
            <Button size="lg" className="h-20 px-16 rounded-full text-2xl font-black shadow-3xl shadow-primary/40 group relative overflow-hidden" asChild>
              <Link href="/signup-merchant">
                <span className="relative z-10">Claim Your Store Domain</span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-40 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto premium-card moving-border-glow bg-primary p-16 md:p-32 text-center relative overflow-hidden shadow-3xl shadow-primary/30 group">
            <div className="relative z-10">
              <h2 className="text-5xl md:text-8xl font-black text-white mb-10 tracking-tighter">Ready to evolve?</h2>
              <p className="text-white/80 text-xl md:text-2xl mb-16 max-w-3xl mx-auto font-medium leading-relaxed">
                Join the elite league of merchants who have upgraded to the most powerful commerce OS ever built.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                  <Button size="lg" className="h-20 px-16 rounded-full text-2xl font-black bg-white text-primary hover:bg-slate-50 hover:scale-105 transition-all active:scale-95 shadow-2xl" asChild>
                    <Link href="/signup-merchant">Deploy Now</Link>
                  </Button>
                  <Link href="/login" className="text-white font-bold hover:underline transition-all flex items-center gap-3 text-xl group/sales">
                      Speak with Scale Team <ArrowRight className="h-6 w-6 group-hover/sales:translate-x-2 transition-transform" />
                  </Link>
              </div>
            </div>
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors duration-1000" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-black/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 group-hover:bg-black/30 transition-colors duration-1000" />
          </div>
        </section>
      </div>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(10px) translateX(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 8s ease-in-out infinite;
        }
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
