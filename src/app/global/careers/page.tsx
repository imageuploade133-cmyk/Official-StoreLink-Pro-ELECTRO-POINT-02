'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  ArrowRight,
  Globe,
  Heart,
  Zap,
  Coffee
} from 'lucide-react';

export default function CareersPage() {
  const jobs = [
    {
      title: 'Senior Frontend Engineer',
      department: 'Engineering',
      location: 'Remote / Lagos',
      type: 'Full-time'
    },
    {
      title: 'Product Designer',
      department: 'Product',
      location: 'Remote / London',
      type: 'Full-time'
    },
    {
      title: 'Customer Success Manager',
      department: 'Operations',
      location: 'Remote / Nairobi',
      type: 'Full-time'
    },
    {
      title: 'Growth Marketing Lead',
      department: 'Marketing',
      location: 'Remote / New York',
      type: 'Full-time'
    }
  ];

  return (
    <div className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center mb-24">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-8">
            Help us build the <br />
            <span className="text-primary">future of commerce.</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
            We&apos;re a global team of builders, designers, and thinkers working to empower merchants everywhere.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-32">
          {[
            {
              icon: <Globe className="h-6 w-6 text-blue-600" />,
              title: "Remote-First",
              description: "Work from anywhere in the world. We believe talent is global."
            },
            {
              icon: <Heart className="h-6 w-6 text-rose-600" />,
              title: "Inclusive Culture",
              description: "Join a diverse team where everyone's voice is heard and valued."
            },
            {
              icon: <Zap className="h-6 w-6 text-amber-500" />,
              title: "Rapid Growth",
              description: "We're scaling fast. There's plenty of room to grow your career."
            },
            {
              icon: <Coffee className="h-6 w-6 text-emerald-600" />,
              title: "Work-Life Balance",
              description: "Unlimited PTO and a focus on sustainable productivity."
            }
          ].map((benefit, i) => (
            <div key={i} className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm">
              <div className="mb-6 h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                {benefit.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
              <p className="text-slate-500 font-medium">{benefit.description}</p>
            </div>
          ))}
        </div>

        {/* Open Roles */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-black tracking-tight">Open Roles</h2>
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              {jobs.length} Positions
            </div>
          </div>

          <div className="space-y-4">
            {jobs.map((job, i) => (
              <Link 
                key={i} 
                href="#" 
                className="group flex flex-col md:flex-row md:items-center justify-between p-8 rounded-3xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all"
              >
                <div>
                  <div className="text-xs font-black text-primary uppercase tracking-widest mb-2">{job.department}</div>
                  <h3 className="text-2xl font-bold mb-4 md:mb-0">{job.title}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <Clock className="h-4 w-4" />
                    {job.type}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-slate-500 font-medium mb-6">
              Don&apos;t see a role that fits? We&apos;re always looking for great talent.
            </p>
            <Button variant="outline" className="rounded-full px-8 font-bold" asChild>
              <Link href="mailto:careers@storelinkpro.com">General Application</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
