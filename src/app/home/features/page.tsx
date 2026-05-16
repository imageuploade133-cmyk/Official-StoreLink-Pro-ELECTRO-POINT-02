'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-slate-50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-full bg-[radial-gradient(50%_50%_at_50%_50%,#cbd5e1_0%,rgba(255,255,255,0)_100%)]" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold mb-8">
            <Sparkles className="h-4 w-4" />
            <span>Powering the next generation of retail</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6">
            The complete <span className="text-primary">retail OS.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto mb-10 font-medium">
            Everything you need to sell online and in-person, manage inventory, and grow your business with AI-powered tools.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-14 px-10 rounded-full text-lg font-bold shadow-xl shadow-primary/20" asChild>
              <Link href="/signup-merchant">Create your store now</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-10 rounded-full text-lg font-bold bg-white" asChild>
              <Link href="/login">Explore Demo</Link>
            </Button>
          </div>

          {/* Visual Mockup with Revenue and Ticket Images */}
          <div className="mt-20 relative max-w-4xl mx-auto">
            <div className="relative rounded-[2rem] p-2 bg-white shadow-2xl border border-slate-200 overflow-hidden">
              <div className="aspect-[16/9] bg-white rounded-[1.5rem] relative overflow-hidden">
                <Image 
                  src="https://emakemrnd.com.ng/D2.png" 
                  alt="StoreLink Pro Features Dashboard" 
                  fill
                  priority
                  className="object-contain"
                />

                {/* Revenue Element */}
                <div className="absolute top-1/4 left-10 p-5 bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4 animate-bounce-slow z-10">
                  <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue</p>
                    <p className="text-xl font-black text-slate-900">+$12,450.00</p>
                  </div>
                </div>

                {/* Customers Element */}
                <div className="absolute bottom-1/4 right-10 p-5 bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4 animate-float z-10">
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
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-10px) translateX(5px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 5s ease-in-out infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

      {/* Main Features Sections */}
      {features.map((section, idx) => (
        <section key={idx} className={`py-24 ${idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">{section.category}</h2>
              <p className="text-lg text-slate-500 font-medium">{section.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">
                    {item.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Global Payments Section */}
      <section className="py-24 bg-[#09090b] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                Global payments.<br />
                <span className="text-primary">Local experience.</span>
              </h2>
              <p className="text-xl text-slate-400 font-medium mb-10 leading-relaxed">
                Accept payments from customers anywhere in the world. StoreLink Pro integrates with the industry&apos;s leading payment providers.
              </p>
              <div className="grid grid-cols-2 gap-6">
                {[
                  "Stripe Integration",
                  "PayPal Support",
                  "Paystack & Flutterwave",
                  "Manual Bank Transfers",
                  "Adyen Integration",
                  "Split Payments"
                ].map((payment, i) => (
                  <div key={i} className="flex items-center gap-3 font-bold">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    {payment}
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2 grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center p-8">
                   <CreditCard className="h-12 w-12 text-primary opacity-50" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Showcase */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-8 leading-tight">
                Data-driven <br />growth.
              </h2>
              <p className="text-xl text-slate-500 font-medium mb-8 leading-relaxed">
                Get real-time insights into your business performance. Track sales, monitor expenses, and understand customer behavior with beautiful, interactive charts.
              </p>
              <ul className="space-y-4">
                {[
                  "Real-time sales dashboard",
                  "Detailed expense tracking",
                  "Product performance analytics",
                  "Staff performance reports",
                  "Exportable financial statements"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-bold">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:w-1/2 relative">
              <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-2xl relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Monthly Revenue</p>
                    <p className="text-3xl font-black text-slate-900">$42,500.00</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-4">
                  {[60, 80, 45, 90, 70].map((h, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-12 text-xs font-bold text-slate-400">Week {i+1}</div>
                      <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-1000" 
                          style={{ width: `${h}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl -z-0" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial / Social Proof */}
      <section className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex justify-center gap-1 mb-8">
            {[1,2,3,4,5].map(i => <Star key={i} className="h-6 w-6 fill-amber-400 text-amber-400" />)}
          </div>
          <blockquote className="text-2xl md:text-4xl font-black text-slate-900 mb-10 leading-tight">
            &quot;StoreLink Pro is the most comprehensive platform we&apos;ve ever used. It replaced four different tools for us, and the AI features are simply magic.&quot;
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <div className="h-14 w-14 rounded-full bg-slate-200" />
            <div className="text-left">
              <p className="font-bold text-slate-900">Sarah Jenkins</p>
              <p className="text-slate-500 text-sm">CEO, Modra Styles</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto bg-primary rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-primary/40">
          <div className="relative z-10">
            <h2 className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tighter">Ready to take control?</h2>
            <p className="text-white/80 text-xl mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
              Join the future of retail today. Set up your store in minutes and start selling everywhere.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button size="lg" className="h-16 px-12 rounded-full text-xl font-black bg-white text-primary hover:bg-slate-50 transition-all active:scale-95" asChild>
                  <Link href="/signup-merchant">Start your free trial</Link>
                </Button>
                <Link href="/login" className="text-white font-bold hover:underline transition-all text-lg">
                    Already have an account? Log in
                </Link>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
        </div>
      </section>
    </div>
  );
}
