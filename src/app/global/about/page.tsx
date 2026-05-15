'use client';

import React from 'react';
import { 
  Users, 
  Target, 
  Rocket, 
  Heart,
  Globe,
  Zap,
  Shield,
  MessageSquare,
  ChevronRight
} from 'lucide-react';

export default function AboutUsPage() {
  return (
    <div className="pt-48 pb-24 transition-colors duration-500 selection:bg-primary/30 selection:text-primary">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-32 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black mb-10 premium-card border-none animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Rocket className="h-4 w-4" />
          <span>Our Mission: Democratizing Retail Power</span>
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 dark:text-white mb-10 leading-[0.9] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
          One engine for <br />
          <span className="text-primary text-glow-blue">Infinite Growth.</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          StoreLink Pro was born out of a simple idea: that every merchant, regardless of size or location, should have access to world-class retail technology.
        </p>
      </section>

      {/* Story Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-6">Our Origin</h2>
              <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-10 tracking-tight leading-tight">The Story Behind the Engine.</h3>
              <div className="space-y-8 text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-lg">
                <p>
                  Founded in 2023, StoreLink Pro started with a big vision. We saw how traditional retail systems were fragmented, expensive, and difficult to use. Online stores didn&apos;t talk to physical registers, and managing inventory across multiple locations was a nightmare.
                </p>
                <p>
                  We built StoreLink Pro to be the &quot;Operating System for Modern Commerce&quot;—a unified platform that brings together POS, e-commerce, inventory, and analytics into one seamless experience.
                </p>
                <p>
                  Today, thousands of merchants across the globe trust StoreLink Pro to power their businesses, from boutique fashion labels to multi-location retail chains.
                </p>
              </div>
            </div>
            <div className="relative group">
              <div className="premium-card moving-border-glow p-4 bg-white/50 dark:bg-white/[0.03]">
                <div className="aspect-square bg-slate-100 dark:bg-[#0a0a0b] rounded-[2rem] overflow-hidden relative border border-slate-200 dark:border-white/10">
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Users className="h-40 w-40 text-slate-200 dark:text-white/5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700" />
                   </div>
                </div>
              </div>
              <div className="absolute -bottom-10 -left-10 p-10 premium-card moving-border-glow bg-primary text-white shadow-3xl shadow-primary/40">
                 <p className="text-6xl font-black mb-2">10k+</p>
                 <p className="font-black opacity-80 uppercase tracking-[0.2em] text-sm">Active Merchants</p>
              </div>
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/10 rounded-full blur-[80px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-6">Our DNA</h2>
            <h3 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Guided by Evolution.</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                icon: <Heart className="h-10 w-10 text-rose-500" />,
                title: "Merchant First",
                description: "We win when our merchants win. Every line of code we write is designed to help you dominate your market."
              },
              {
                icon: <Zap className="h-10 w-10 text-amber-500" />,
                title: "Radical Simplicity",
                description: "Commerce is complex; our OS isn't. We strive for high-fidelity, intuitive, and elegant solutions."
              },
              {
                icon: <Shield className="h-10 w-10 text-indigo-500" />,
                title: "Distributed Resilience",
                description: "We prioritize military-grade security and 99.9% uptime so you can scale without boundaries."
              }
            ].map((value, i) => (
              <div key={i} className="premium-card moving-border-glow p-12 bg-white/50 dark:bg-white/[0.03] group">
                <div className="mb-8 h-16 w-16 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 dark:border-white/10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                  {value.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 group-hover:text-primary transition-colors">{value.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed text-lg">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section Placeholder */}
      <section className="py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto premium-card moving-border-glow bg-[#050505] p-16 md:p-32 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-sm font-black text-primary uppercase tracking-[0.4em] mb-6">The Collective</h2>
            <h3 className="text-4xl md:text-7xl font-black text-white mb-10 tracking-tighter leading-tight">Join the Global Team.</h3>
            <p className="text-slate-400 max-w-3xl mx-auto mb-20 font-medium text-xl leading-relaxed">
              We&apos;re a distributed engine of engineers, designers, and retail experts working together to build the singularity of commerce.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
               {[1,2,3,4].map(i => (
                 <div key={i} className="space-y-6 group">
                   <div className="aspect-square bg-white/[0.03] rounded-[2rem] border border-white/5 group-hover:border-primary/30 transition-all duration-700 overflow-hidden relative">
                      <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                   </div>
                   <div className="text-left px-2">
                     <div className="h-5 w-32 bg-white/10 rounded-full mb-3 group-hover:bg-primary/20 transition-colors" />
                     <div className="h-4 w-20 bg-white/5 rounded-full" />
                   </div>
                 </div>
               ))}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2" />
        </div>
      </section>
    </div>
  );
}
