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
  Image as ImageIcon,
  ChevronRight
} from 'lucide-react';

const features = [
  {
    category: "Storefront & E-commerce",
    description: "Build a world-class shopping experience that reflects your brand.",
    items: [
      {
        icon: <ShoppingBag className="h-6 w-6 text-[#0071e3]" />,
        title: "Unified Storefront",
        description: "Manage multiple storefronts from a single dashboard. Use subdomains or your own custom domains."
      },
      {
        icon: <Layout className="h-6 w-6 text-[#5856d6]" />,
        title: "Theme Customization",
        description: "Fine-tune your store's appearance with flexible themes, custom colors, fonts, and layouts."
      },
      {
        icon: <Search className="h-6 w-6 text-[#34c759]" />,
        title: "Smart Search",
        description: "Lightning-fast product search with filters to help customers find what they need instantly."
      },
      {
        icon: <Sparkles className="h-6 w-6 text-[#ff9500]" />,
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
        icon: <Smartphone className="h-6 w-6 text-[#ff2d55]" />,
        title: "Hybrid Cloud POS",
        description: "Professional-grade POS that works on tablets, phones, or desktops. Synced in real-time."
      },
      {
        icon: <Zap className="h-6 w-6 text-[#ffcc00]" />,
        title: "Barcode Scanning",
        description: "Use your device camera or a hardware scanner to ring up products in milliseconds."
      },
      {
        icon: <Clock className="h-6 w-6 text-[#0071e3]" />,
        title: "Held Sales",
        description: "Save carts for later and resume them on any device without missing a beat."
      },
      {
        icon: <CreditCard className="h-6 w-6 text-[#af52de]" />,
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
        icon: <ImageIcon className="h-6 w-6 text-[#ff375f]" />,
        title: "AI Background Removal",
        description: "Professional product photos in seconds. Automatically remove messy backgrounds from your shots."
      },
      {
        icon: <MessageSquare className="h-6 w-6 text-[#0071e3]" />,
        title: "AI Marketing Content",
        description: "Generate compelling product descriptions and marketing copy with a single click."
      },
      {
        icon: <Cpu className="h-6 w-6 text-[#1d1d1f]" />,
        title: "Smart Recommendations",
        description: "AI-driven product suggestions based on customer behavior and browsing history."
      },
      {
        icon: <Layers className="h-6 w-6 text-[#5856d6]" />,
        title: "Visual Page Builder",
        description: "Drag and drop components to create unique landing pages and content without coding."
      }
    ]
  }
];

export default function FeaturesPage() {
  return (
    <div className="bg-[#fbfbfd] text-[#1d1d1f]">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#d2d2d7] shadow-sm text-[#1d1d1f] text-xs font-semibold mb-8">
            <Sparkles className="h-4 w-4 text-[#0071e3]" />
            <span>Powering the next generation of retail</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-[#1d1d1f] mb-6">
            The complete <span className="text-[#0071e3]">retail OS.</span>
          </h1>
          <p className="text-xl md:text-2xl text-[#86868b] max-w-3xl mx-auto mb-10 font-medium leading-relaxed">
            Everything you need to sell online and in-person, manage inventory, and grow your business with AI-powered tools.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Button size="lg" className="h-12 px-8 rounded-full text-base font-semibold bg-[#0071e3] hover:bg-[#0077ed]" asChild>
              <Link href="/signup-merchant">Create your store</Link>
            </Button>
            <Link href="/login" className="text-[#0066cc] font-semibold hover:underline flex items-center gap-1 group text-lg">
              Explore Demo <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="relative rounded-[2.5rem] p-3 bg-white shadow-[0_20px_80px_rgba(0,0,0,0.1)] border border-[#d2d2d7]/30">
              <div className="relative rounded-[2rem] overflow-hidden bg-[#f5f5f7] aspect-[16/9] border border-[#d2d2d7]/50">
                <Image 
                  src="https://emakemrnd.com.ng/D1.png" 
                  alt="StoreLink Pro Dashboard" 
                  fill
                  className="object-cover object-top"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Sections */}
      {features.map((section, idx) => (
        <section key={idx} className={`py-24 ${idx % 2 === 1 ? 'bg-[#f5f5f7]' : 'bg-white'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-semibold text-[#1d1d1f] mb-4 tracking-tight">{section.category}</h2>
              <p className="text-lg text-[#86868b] font-medium leading-relaxed">{section.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} className="bg-white p-10 rounded-[2.5rem] border border-[#d2d2d7]/50 shadow-sm hover:shadow-xl transition-all duration-500 group">
                  <div className="h-14 w-14 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                    {item.icon}
                  </div>
                  <h3 className="text-2xl font-semibold text-[#1d1d1f] mb-4 tracking-tight">{item.title}</h3>
                  <p className="text-[#86868b] font-medium leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Global Payments Section */}
      <section className="py-24 bg-[#1d1d1f] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="lg:w-1/2">
              <h2 className="text-4xl md:text-6xl font-semibold mb-8 leading-tight tracking-tight text-white">
                Global payments.<br />
                <span className="text-[#0071e3]">Local experience.</span>
              </h2>
              <p className="text-xl text-[#86868b] font-medium mb-10 leading-relaxed">
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
                  <div key={i} className="flex items-center gap-3 font-semibold text-white/90">
                    <CheckCircle2 className="h-5 w-5 text-[#34c759]" />
                    {payment}
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2 grid grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-white/5 rounded-[2.5rem] border border-white/10 flex items-center justify-center p-8 transition-colors hover:bg-white/10 group">
                   <Image 
                      src={`https://emakemrnd.com.ng/${i}.png`}
                      alt={`Payment Provider ${i}`}
                      width={120}
                      height={60}
                      className="object-contain max-h-20 w-auto group-hover:scale-110 transition-transform duration-500"
                   />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-white text-center">
        <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-7xl font-semibold text-[#1d1d1f] mb-8 tracking-tight">Ready to take control?</h2>
            <p className="text-[#86868b] text-xl md:text-2xl mb-12 font-medium leading-relaxed">
                Join the future of retail today. Set up your store in minutes and start selling everywhere.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button size="lg" className="h-14 px-10 rounded-full text-lg font-semibold bg-[#0071e3] hover:bg-[#0077ed]" asChild>
                    <Link href="/signup-merchant">Start your free trial</Link>
                </Button>
                <Link href="/login" className="text-[#0066cc] font-semibold hover:underline text-lg">
                    Already have an account? Log in
                </Link>
            </div>
        </div>
      </section>

      <style jsx global>{`
        body {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </div>
  );
}
