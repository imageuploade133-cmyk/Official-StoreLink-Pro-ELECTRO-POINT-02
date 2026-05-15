import React from 'react';
import { 
  Users, 
  Target, 
  Rocket, 
  Heart,
  Globe,
  Zap,
  Shield,
  MessageSquare
} from 'lucide-react';

export default function AboutUsPage() {
  return (
    <div className="pt-32 pb-24">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-24">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-8">
          We&apos;re on a mission to <br />
          <span className="text-primary">democratize commerce.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed">
          StoreLink Pro was born out of a simple idea: that every merchant, regardless of size or location, should have access to world-class retail technology.
        </p>
      </section>

      {/* Story Section */}
      <section className="bg-white py-24 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-slate-600 font-medium leading-relaxed">
                <p>
                  Founded in 2023, StoreLink Pro started in a small garage with a big vision. We saw how traditional retail systems were fragmented, expensive, and difficult to use. Online stores didn&apos;t talk to physical registers, and managing inventory across multiple locations was a nightmare.
                </p>
                <p>
                  We built StoreLink Pro to be the &quot;Operating System for Modern Commerce&quot;—a unified platform that brings together POS, e-commerce, inventory, and analytics into one seamless experience.
                </p>
                <p>
                  Today, thousands of merchants across the globe trust StoreLink Pro to power their businesses, from boutique fashion labels to multi-location retail chains.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-slate-100 rounded-3xl overflow-hidden relative">
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="h-32 w-32 text-slate-300" />
                 </div>
              </div>
              <div className="absolute -bottom-8 -left-8 p-8 bg-primary rounded-2xl text-white shadow-xl">
                 <p className="text-4xl font-black">10k+</p>
                 <p className="font-bold opacity-80 uppercase tracking-widest text-xs">Active Merchants</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Our Core Values</h2>
            <p className="text-slate-500 font-medium">The principles that guide everything we do.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Heart className="h-8 w-8 text-rose-500" />,
                title: "Merchant First",
                description: "We win when our merchants win. Every feature we build is designed to help you grow."
              },
              {
                icon: <Zap className="h-8 w-8 text-amber-500" />,
                title: "Radical Simplicity",
                description: "Commerce is complex; our software shouldn't be. We strive for intuitive, elegant solutions."
              },
              {
                icon: <Shield className="h-8 w-8 text-indigo-500" />,
                title: "Built to Last",
                description: "We prioritize security, stability, and performance so you can focus on your business."
              }
            ].map((value, i) => (
              <div key={i} className="p-10 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-6">{value.icon}</div>
                <h3 className="text-xl font-black text-slate-900 mb-4">{value.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section Placeholder */}
      <section className="bg-slate-900 text-white py-24 rounded-[3rem] mx-4 sm:mx-6 lg:mx-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-8">Join our global team</h2>
          <p className="text-slate-400 max-w-2xl mx-auto mb-12 font-medium">
            We&apos;re a distributed team of engineers, designers, and retail experts working together to build the future of commerce.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
             {[1,2,3,4].map(i => (
               <div key={i} className="space-y-4">
                 <div className="aspect-square bg-slate-800 rounded-2xl" />
                 <div className="text-left">
                   <div className="h-4 w-24 bg-slate-800 rounded mb-2" />
                   <div className="h-3 w-16 bg-slate-800 rounded opacity-50" />
                 </div>
               </div>
             ))}
          </div>
        </div>
      </section>
    </div>
  );
}
