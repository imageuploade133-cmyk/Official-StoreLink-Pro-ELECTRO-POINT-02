'use client';

import React from 'react';
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  MapPin,
  Clock,
  Send,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="pt-32 pb-24">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-6">
            Get in touch with <br />
            <span className="text-primary">our expert team.</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium">
            Have questions about our platform or need a custom solution? We&apos;re here to help you scale your business.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Contact Form */}
          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm">
            {submitted ? (
              <div className="text-center py-12">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4">Message Sent!</h2>
                <p className="text-slate-500 font-medium mb-8">
                  Thank you for reaching out. A member of our team will get back to you within 24 hours.
                </p>
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                    <Input placeholder="John Doe" required className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                    <Input type="email" placeholder="john@example.com" required className="h-12 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Subject</label>
                  <Input placeholder="How can we help?" required className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Message</label>
                  <Textarea placeholder="Tell us more about your business needs..." required className="min-h-[150px] rounded-2xl p-4" />
                </div>
                <Button type="submit" className="w-full h-14 rounded-full font-bold text-lg shadow-lg shadow-primary/20">
                  Send Message <Send className="h-5 w-5 ml-2" />
                </Button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-12 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                 <Mail className="h-8 w-8 text-primary mb-4" />
                 <h3 className="font-black text-slate-900 mb-2">Email Us</h3>
                 <p className="text-slate-500 text-sm font-medium">For general inquiries</p>
                 <p className="text-primary font-bold mt-2">hello@storelinkpro.com</p>
               </div>
               <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                 <Phone className="h-8 w-8 text-primary mb-4" />
                 <h3 className="font-black text-slate-900 mb-2">Call Us</h3>
                 <p className="text-slate-500 text-sm font-medium">Mon-Fri from 9am-6pm</p>
                 <p className="text-primary font-bold mt-2">+1 (555) 000-0000</p>
               </div>
            </div>

            <div className="space-y-6">
               <h3 className="text-2xl font-black text-slate-900">Global Offices</h3>
               <div className="space-y-4">
                 <div className="flex gap-4 p-6 rounded-3xl bg-white border border-slate-100">
                   <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                     <MapPin className="h-6 w-6 text-indigo-600" />
                   </div>
                   <div>
                     <p className="font-bold text-slate-900">San Francisco</p>
                     <p className="text-slate-500 text-sm font-medium">100 Market St, San Francisco, CA 94105</p>
                   </div>
                 </div>
                 <div className="flex gap-4 p-6 rounded-3xl bg-white border border-slate-100">
                   <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                     <MapPin className="h-6 w-6 text-amber-600" />
                   </div>
                   <div>
                     <p className="font-bold text-slate-900">London</p>
                     <p className="text-slate-500 text-sm font-medium">20-22 Wenlock Rd, London N1 7GU, UK</p>
                   </div>
                 </div>
               </div>
            </div>

            <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10">
               <div className="flex items-center gap-2 text-primary font-bold mb-4 uppercase tracking-widest text-xs">
                 <Clock className="h-4 w-4" /> Support Hours
               </div>
               <p className="text-slate-700 font-medium leading-relaxed">
                 Our technical support team is available <span className="font-bold">24/7</span> for merchants on our Enterprise and Growth plans. Standard support is available Mon-Fri.
               </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
