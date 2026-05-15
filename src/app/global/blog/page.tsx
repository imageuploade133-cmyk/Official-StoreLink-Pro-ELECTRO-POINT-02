'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  ArrowRight,
  Calendar,
  User,
  Tag
} from 'lucide-react';

export default function BlogPage() {
  const posts = [
    {
      title: 'How to scale your e-commerce business in 2024',
      excerpt: 'Discover the latest strategies for taking your online store to the next level, from AI-driven marketing to global logistics.',
      author: 'Sarah Jenkins',
      date: 'May 12, 2024',
      category: 'Growth',
      image: 'https://images.unsplash.com/photo-1556742049-139402343997?auto=format&fit=crop&q=80&w=800'
    },
    {
      title: 'The future of POS: Beyond the checkout counter',
      excerpt: 'Modern POS systems are becoming much more than just a way to take payments. Learn about the features that matter.',
      author: 'David Chen',
      date: 'May 08, 2024',
      category: 'Retail',
      image: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&q=80&w=800'
    },
    {
      title: 'Simplifying multi-channel inventory management',
      excerpt: 'Stop losing sales due to stockouts. Here is how to keep your inventory in sync across all your sales channels.',
      author: 'Michael Rodriguez',
      date: 'May 03, 2024',
      category: 'Operations',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800'
    }
  ];

  return (
    <div className="pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6">
              The StoreLink <span className="text-primary">Blog</span>
            </h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed">
              Insights, guides, and stories from the front lines of global commerce.
            </p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search articles..." 
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
        </div>

        {/* Featured Post */}
        <div className="mb-24 group cursor-pointer">
          <div className="relative rounded-[2.5rem] overflow-hidden aspect-[21/9] mb-8">
            <Image 
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1600" 
              alt="Featured" 
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-10 left-10 right-10">
              <div className="inline-block px-4 py-1.5 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest mb-4">
                Featured
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4 max-w-3xl leading-tight">
                Announcing StoreLink AI: The next frontier in automated retail management
              </h2>
              <div className="flex items-center gap-6 text-white/80 font-medium">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Alex Rivers
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  May 15, 2024
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {posts.map((post, i) => (
            <article key={i} className="group cursor-pointer">
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3] mb-6">
                <Image 
                  src={post.image} 
                  alt={post.title} 
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized
                />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-xs font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">
                  {post.category}
                </span>
                <span className="text-sm text-slate-400 font-bold">{post.date}</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4 group-hover:text-primary transition-colors leading-snug">
                {post.title}
              </h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-6 line-clamp-2">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-2 font-bold text-slate-900 group-hover:gap-4 transition-all">
                Read Article <ArrowRight className="h-5 w-5" />
              </div>
            </article>
          ))}
        </div>

        <div className="mt-24 text-center">
          <Button size="lg" variant="outline" className="rounded-full px-12 h-14 font-black">
            Load More Articles
          </Button>
        </div>
      </div>
    </div>
  );
}
