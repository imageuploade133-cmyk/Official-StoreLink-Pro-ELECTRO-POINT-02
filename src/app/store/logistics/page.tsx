'use client';

import React from 'react';
import { useSettings } from '@/contexts/settings-context';
import { 
  Truck, 
  RotateCcw, 
  Globe, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Package, 
  HelpCircle,
  ArrowRight,
  Mail,
  Phone,
  CheckCircle2,
  EyeOff,
  Zap,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '@/lib/utils';

export default function LogisticsPage() {
  const { settings } = useSettings();
  const storeName = settings?.storeName || 'StoreLink Pro';
  const isVisible = settings?.showLogisticsOnPublicSite !== false;

  const defaultFaqs = [
    { 
        question: 'How do I monitor my order trajectory?', 
        answer: `Upon dispatch, you will receive a high-priority notification via Email and WhatsApp. This includes a unique tracking signature and a direct link to our carrier's real-time telemetry portal.` 
    },
    { 
        question: 'What defines your global reach?', 
        answer: `${storeName} maintains strategic hubs across three continents. We currently facilitate secure delivery to over 65 sovereign territories, with customs clearance pre-authorized for major regions.` 
    },
    { 
        question: 'Protocol for compromised shipments?', 
        answer: `In the rare event of transit complications, our Priority Support team takes command. Every shipment is fully insured, guaranteeing immediate resolution or replacement at no additional cost.` 
    }
  ];

  const faqs = settings?.logisticsFaq && settings.logisticsFaq.length > 0 
    ? settings.logisticsFaq 
    : defaultFaqs;

  if (!isVisible) {
    return (
        <div className="bg-background min-h-screen flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="h-32 w-32 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl rotate-3">
                    <EyeOff className="h-14 w-14 text-slate-300 dark:text-slate-700" />
                </div>
                <div className="space-y-3">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Registry Syncing</h1>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Our logistics and fulfillment protocols are currently being optimized for your region. Please check back shortly for the updated schedule.
                    </p>
                </div>
                <div className="pt-6">
                    <Button asChild size="lg" className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                        <Link href="/store/shop">Explore Catalog <ArrowRight className="ml-3 h-4 w-4" /></Link>
                    </Button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-background min-h-screen selection:bg-primary/20">
      {/* Immersive Header */}
      <header className="bg-slate-950 py-24 md:py-32 text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 relative z-10 text-center space-y-8">
          <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full animate-in slide-in-from-top-4 duration-700">
            <Truck className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Global Logistics Protocol</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-4 leading-none text-white animate-in slide-in-from-bottom-6 duration-1000">
            Fulfillment <span className="text-primary italic">&</span> Reach
          </h1>
          <p className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed opacity-90">
            Discover the infrastructure behind every {storeName} delivery. From our automated vaults to your doorstep.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-20 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 py-10 items-center justify-items-center">
            {[
                { icon: Clock, title: '24H Processing', desc: 'Meticulous dispatch', color: 'text-blue-500' },
                { icon: Zap, title: 'Edge Routing', desc: 'Direct carrier links', color: 'text-amber-500' },
                { icon: RotateCcw, title: 'Total Guarantee', desc: '30-day return policy', color: 'text-green-500' },
            ].map((stat, i) => (
                <Card key={i} className="w-full border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] transition-all duration-500 hover:-translate-y-3 hover:shadow-primary/10">
                    <CardContent className="pt-10 pb-8 flex flex-col items-center text-center space-y-4">
                        <div className={cn("h-16 w-16 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-inner", stat.color)}>
                            <stat.icon className="h-8 w-8" strokeWidth={2.5} />
                        </div>
                        <div className="space-y-1">
                            <p className="font-black text-xl tracking-tight uppercase">{stat.title}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.desc}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Detailed Narratives */}
          <div className="lg:col-span-8 space-y-20">
            <section className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-1000">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
                    <Package className="h-7 w-7" />
                </div>
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Global Shipping</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mt-1">Infrastructure & reach</p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-900/50 rounded-[3rem] p-8 md:p-12 border-2 border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                    <Globe className="h-64 w-64 -mr-20 -mt-20" />
                </div>
                <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 leading-relaxed text-lg font-medium relative z-10">
                    <div className="rich-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                            {settings?.shippingPolicy || "We leverage a network of elite global carriers to ensure your order arrives with absolute precision. Domestic shipments are typically finalized within 3-5 business days."}
                        </ReactMarkdown>
                    </div>
                </div>
                
                {settings?.logisticsImageUrl && (
                    <div className="mt-12 relative aspect-video rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 hover:scale-[1.02] transition-transform duration-700">
                        <Image 
                            src={settings.logisticsImageUrl} 
                            alt="Logistics network visualization" 
                            fill 
                            className="object-cover"
                            unoptimized
                        />
                    </div>
                )}
              </div>
            </section>

            <section className="space-y-8 pt-12 animate-in fade-in slide-in-from-left-4 duration-1000 delay-200">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-green-600 text-white flex items-center justify-center shadow-xl shadow-green-600/20">
                    <RotateCcw className="h-7 w-7" />
                </div>
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Return Policy</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-green-600/60 mt-1">Total customer protection</p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-900/50 rounded-[3rem] p-8 md:p-12 border-2 border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute bottom-0 right-0 p-8 opacity-5">
                    <ShieldCheck className="h-64 w-64 -mr-20 -mb-20" />
                </div>
                <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 leading-relaxed text-lg relative z-10 font-medium">
                    <div className="rich-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                            {settings?.returnsPolicy || "Our commitment to quality is absolute. If your purchase doesn't meet our exacting standards, we provide a seamless 30-day return protocol."}
                        </ReactMarkdown>
                    </div>
                </div>
              </div>
            </section>

            <section className="space-y-10 pt-12 border-t border-slate-100 dark:border-slate-800">
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                <HelpCircle className="h-8 w-8 text-primary" /> Logistics Intelligence FAQ
              </h2>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`} className="border rounded-2xl px-6 bg-white dark:bg-slate-900">
                        <AccordionTrigger className="text-lg font-bold hover:no-underline py-6">{faq.question}</AccordionTrigger>
                        <AccordionContent className="text-slate-500 pb-6 leading-relaxed">
                            <div className="rich-content prose-sm max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                    {faq.answer}
                                </ReactMarkdown>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
              </Accordion>
            </section>
          </div>

          {/* Elite Interaction Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-24 space-y-8">
                <Card className="bg-primary text-primary-foreground border-none shadow-2xl rounded-[3rem] overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                        <HelpCircle className="h-48 w-48 -mr-16 -mt-16" />
                    </div>
                    <CardHeader className="pt-12 px-10">
                        <CardTitle className="text-3xl font-black tracking-tighter uppercase">Protocol Assistance</CardTitle>
                        <CardDescription className="text-primary-foreground/70 font-bold uppercase tracking-widest text-[10px] pt-2">Direct lines to fulfillment control</CardDescription>
                    </CardHeader>
                    <CardContent className="px-10 pb-12 space-y-8 relative z-10">
                        <p className="text-primary-foreground/80 text-sm font-medium leading-relaxed">
                            Require clarification on international routing or high-volume logistics? Our specialists are on standby.
                        </p>
                        <div className="space-y-4">
                            {settings?.storeEmail && (
                                <a href={`mailto:${settings.storeEmail}`} className="flex items-center gap-4 bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md transition-all group/link">
                                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center group-hover/link:bg-white group-hover/link:text-primary transition-colors">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <span className="text-sm font-black truncate">{settings.storeEmail}</span>
                                </a>
                            )}
                            {settings?.storePhone && (
                                <a href={`tel:${settings.storePhone}`} className="flex items-center gap-4 bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md transition-all group/link">
                                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center group-hover/link:bg-white group-hover/link:text-primary transition-colors">
                                        <Phone className="h-5 w-5" />
                                    </div>
                                    <span className="text-sm font-black tracking-widest">{settings.storePhone}</span>
                                </a>
                            )}
                        </div>
                        <Button variant="outline" className="w-full bg-white text-primary hover:bg-slate-100 border-none h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-[0.98]" asChild>
                            <Link href="/store/shop">Return to Catalog <ArrowRight className="ml-3 h-4 w-4" /></Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
