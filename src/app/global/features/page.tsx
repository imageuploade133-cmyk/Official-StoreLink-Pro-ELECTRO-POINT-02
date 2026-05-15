'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ShoppingBag, 
  Smartphone, 
  Zap, 
  Globe, 
  Shield, 
  CheckCircle2, 
  BarChart3, 
  Users, 
  Layers, 
  Cpu, 
  MousePointer2, 
  MessageSquare, 
  CreditCard, 
  Package, 
  Clock, 
  Star,
  Sparkles,
  Search,
  Layout,
  Settings,
  Bell,
  History,
  ChevronRight,
  Image as ImageIcon
} from 'lucide-react';

const features = [
  {
    category: "Storefront & E-commerce",
    description: "Build a world-class shopping experience that reflects your brand.",
    items: [
      {
        icon: <ShoppingBag className="h-6 w-6 text-indigo-600" />,
        title: "Unified Storefront",
        description: "Manage multiple storefronts from a single dashboard. Use subdomains or your own custom domains."
      },
      {
        icon: <Layout className="h-6 w-6 text-blue-600" />,
        title: "Theme Customization",
        description: "Fine-tune your store's appearance with flexible themes, custom colors, fonts, and layouts."
      },
      {
        icon: <Search className="h-6 w-6 text-emerald-600" />,
        title: "Smart Search",
        description: "Lightning-fast product search with filters to help customers find what they need instantly."
      },
      {
        icon: <Sparkles className="h-6 w-6 text-amber-500" />,
        title: "Flash Sales",
        description: "Drive urgency and increase sales with built-in flash sale and countdown features."
      }
    ]
  },
  {
    category: "Point of Sale (POS)",
    description: "Sell anywhere, in-person or on the go, with our powerful POS system.",
    items: [
      {
        icon: <Smartphone className="h-6 w-6 text-rose-600" />,
        title: "Hybrid Cloud POS",
        description: "Professional-grade POS that works on tablets, phones, or desktops. Synced in real-time."
      },
      {
        icon: <Zap className="h-6 w-6 text-amber-600" />,
        title: "Barcode Scanning",
        description: "Use your device camera or a hardware scanner to ring up products in milliseconds."
      },
      {
        icon: <Clock className="h-6 w-6 text-blue-500" />,
        title: "Held Sales",
        description: "Save carts for later and resume them on any device without missing a beat."
      },
      {
        icon: <CreditCard className="h-6 w-6 text-purple-600" />,
        title: "Split Payments",
        description: "Accept multiple payment methods for a single transaction (e.g., half cash, half card)."
      }
    ]
  },
  {
    category: "AI & Innovation",
    description: "Leverage cutting-edge AI to save time and boost conversions.",
    items: [
      {
        icon: <ImageIcon className="h-6 w-6 text-fuchsia-600" />,
        title: "AI Background Removal",
        description: "Professional product photos in seconds. Automatically remove messy backgrounds from your shots."
      },
      {
        icon: <MessageSquare className="h-6 w-6 text-blue-600" />,
        title: "AI Marketing Content",
        description: "Generate compelling product descriptions and marketing copy with a single click."
      },
      {
        icon: <Cpu className="h-6 w-6 text-slate-700" />,
        title: "Smart Recommendations",
        description: "AI-driven product suggestions based on customer behavior and browsing history."
      },
      {
        icon: <Layers className="h-6 w-6 text-indigo-500" />,
        title: "Visual Page Builder",
        description: "Drag and drop components to create unique landing pages and content without coding."
      }
    ]
  },
  {
    category: "Marketing & Growth",
    description: "Expand your reach and keep your customers coming back.",
    items: [
      {
        icon: <MessageSquare className="h-6 w-6 text-green-600" />,
        title: "WhatsApp Marketing",
        description: "Reach your customers where they are. Send bulk marketing messages and automated receipts via WhatsApp."
      },
      {
        icon: <CreditCard className="h-6 w-6 text-blue-600" />,
        title: "Flexible Payments",
        description: "Offer 'Pay Small Small' installment plans to make high-ticket items more accessible to your customers."
      },
      {
        icon: <Zap className="h-6 w-6 text-yellow-500" />,
        title: "Ads System",
        description: "Monetize your storefront by showing banner ads and earning revenue from your traffic."
      },
      {
        icon: <Users className="h-6 w-6 text-indigo-600" />,
        title: "Customer CRM",
        description: "Keep track of your customers, their purchase history, and preferences to provide a personalized service."
      }
    ]
  },
  {
    category: "Inventory & Operations",
    description: "Stay on top of your business with robust management tools.",
    items: [
      {
        icon: <Package className="h-6 w-6 text-orange-600" />,
        title: "Advanced Inventory",
        description: "Bulk CSV imports, stock tracking, and multi-location support for your entire product catalog."
      },
      {
        icon: <Bell className="h-6 w-6 text-amber-500" />,
        title: "Low Stock Alerts",
        description: "Get notified before you run out. Set custom thresholds for every product variant."
      },
      {
        icon: <History className="h-6 w-6 text-slate-500" />,
        title: "Stock Audit Trail",
        description: "Trace every inventory movement. See who added, removed, or sold what and when."
      },
      {
        icon: <Shield className="h-6 w-6 text-green-600" />,
        title: "Granular Permissions",
        description: "Manage your team with 40+ specific permissions across 12 different modules."
      }
    ]
  }
];

export default function FeaturesPage() {
  return (
    <div className="bg-white dark:bg-[#000000] transition-colors duration-500">
      {/* Hero Section */}
      <section className="relative pt-48 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-black mb-8 premium-card border-none animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="h-4 w-4" />
            <span>The Retail Singularity is here</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 dark:text-white mb-8 leading-[0.9] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
            The complete <br /><span className="text-primary text-glow-blue">retail OS.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto mb-12 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Everything you need to sell online and in-person, manage inventory, and grow your business with AI-powered architecture.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
            <Button size="lg" className="h-16 px-12 rounded-full text-xl font-black shadow-2xl shadow-primary/30 group relative overflow-hidden" asChild>
              <Link href="/signup-merchant">
                <span className="relative z-10">Start Deployment</span>
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-16 px-12 rounded-full text-xl font-black bg-white dark:bg-white/5 backdrop-blur-md dark:text-white border-2 border-slate-200 dark:border-white/10" asChild>
              <Link href="/login">Explore Demo</Link>
            </Button>
          </div>
        </div>
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-0" />
      </section>

      {/* Main Features Sections */}
      {features.map((section, idx) => (
        <section key={idx} className={`py-32 relative ${idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-white/[0.02]' : 'bg-white dark:bg-transparent'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="mb-20 text-center max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">{section.category}</h2>
              <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{section.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} className="premium-card moving-border-glow p-10 bg-white/50 dark:bg-white/[0.03] group">
                  <div className="h-16 w-16 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center mb-8 shadow-lg border border-slate-100 dark:border-white/10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    {item.icon}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed text-lg">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Global Payments Section */}
      <section className="py-40 bg-[#050505] text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="lg:w-1/2">
              <h2 className="text-5xl md:text-8xl font-black mb-10 leading-[0.9] tracking-tighter">
                Global payments.<br />
                <span className="text-primary text-glow-blue">Unified Flow.</span>
              </h2>
              <p className="text-2xl text-slate-400 font-medium mb-12 leading-relaxed">
                Accept any currency from any customer, anywhere. StoreLink Pro integrates with the world&apos;s leading acquirers for frictionless commerce.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  "Stripe Global Connect",
                  "PayPal Enterprise",
                  "Paystack & Flutterwave",
                  "Direct SWIFT/IBAN",
                  "Adyen Unified Commerce",
                  "Split & Multi-currency"
                ].map((payment, i) => (
                  <div key={i} className="flex items-center gap-4 font-black premium-card p-4 bg-white/5 border-none shadow-none text-lg">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                    {payment}
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2 grid grid-cols-2 gap-6 relative">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="premium-card moving-border-glow aspect-square bg-white/5 backdrop-blur-xl flex items-center justify-center p-10 group overflow-hidden">
                   <CreditCard className="h-16 w-16 text-primary opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                   <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                </div>
              ))}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -z-0" />
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Showcase */}
      <section className="py-40 bg-white dark:bg-[#000000] overflow-hidden relative transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-20">
            <div className="lg:w-1/2">
              <h2 className="text-5xl md:text-8xl font-black text-slate-900 dark:text-white mb-10 leading-[0.9] tracking-tighter">
                Data-driven <br /><span className="text-primary text-glow-blue">Omniscience.</span>
              </h2>
              <p className="text-2xl text-slate-500 dark:text-slate-400 font-medium mb-12 leading-relaxed">
                Real-time insights across every channel. Track every cent, monitor every staff member, and predict customer behavior with deep neural analytics.
              </p>
              <ul className="space-y-6">
                {[
                  "Real-time edge dashboard",
                  "Deep expense tracking",
                  "AI product performance",
                  "Staff KPI monitoring",
                  "Automated financial logic"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-slate-800 dark:text-slate-200 font-black text-xl">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-1/2 relative">
              <div className="premium-card moving-border-glow p-12 bg-white/50 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Global Revenue Flow</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white">$142,500.00</p>
                  </div>
                  <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <BarChart3 className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                </div>
                <div className="space-y-6">
                  {[70, 90, 60, 95, 80].map((h, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-tighter">
                        <span>Cluster {i+1}</span>
                        <span>{h}% Efficiency</span>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                          style={{ width: `${h}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -top-10 -left-10 w-48 h-48 bg-primary/10 rounded-full blur-[80px]" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto premium-card moving-border-glow bg-primary p-16 md:p-32 text-center relative overflow-hidden shadow-3xl shadow-primary/30 group">
          <div className="relative z-10">
            <h2 className="text-5xl md:text-8xl font-black text-white mb-10 tracking-tighter">Ready to dominate?</h2>
            <p className="text-white/80 text-xl md:text-2xl mb-16 max-w-3xl mx-auto font-medium leading-relaxed">
              The future of retail is already here. Don&apos;t get left behind. Deploy your global commerce OS today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                <Button size="lg" className="h-20 px-16 rounded-full text-2xl font-black bg-white text-primary hover:bg-slate-50 hover:scale-105 transition-all active:scale-95 shadow-2xl" asChild>
                  <Link href="/signup-merchant">Initialize Store</Link>
                </Button>
                <Link href="/login" className="text-white font-bold hover:underline transition-all flex items-center gap-3 text-xl group/cta">
                    Explore Advanced Config <ChevronRight className="h-6 w-6 group-hover/cta:translate-x-2 transition-transform" />
                </Link>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors duration-1000" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-black/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 group-hover:bg-black/30 transition-colors duration-1000" />
        </div>
      </section>
    </div>
  );
}
