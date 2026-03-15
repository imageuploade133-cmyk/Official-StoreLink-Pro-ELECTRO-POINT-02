'use client';

import { useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { PublicPage } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { format } from 'date-fns';
import { convertToDateSafely } from '@/lib/utils';

export default function DynamicPublicPage() {
  const params = useParams();
  const slug = params.slug as string;
  const firestore = useFirestore();

  const pageQuery = useMemo(() => {
    if (!firestore || !slug) return null;
    return query(collection(firestore, 'publicPages'), where('slug', '==', slug), limit(1));
  }, [firestore, slug]);

  const { data: pages, isLoading, error } = useCollection<PublicPage>(pageQuery);

  const page = useMemo(() => pages?.[0], [pages]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Skeleton className="h-[250px] w-full mb-8 rounded-3xl" />
        <Skeleton className="h-12 w-3/4 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-3/4 mt-6" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive/30 mx-auto mb-6" />
            <h1 className="text-3xl font-black tracking-tight text-destructive uppercase">Error Loading Page</h1>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Could not synchronize page content from our servers. Please try again later.</p>
        </div>
    )
  }

  if (!page) {
    notFound();
    return null;
  }

  const updatedAt = convertToDateSafely(page.updatedAt);

  return (
    <div className="bg-background min-h-screen">
        <header className="relative bg-slate-900 overflow-hidden">
            {page.bannerImageUrl ? (
                <div className="absolute inset-0">
                    <Image src={page.bannerImageUrl} alt={page.title} fill className="object-cover opacity-40" unoptimized/>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                </div>
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-slate-900 to-slate-950" />
            )}
            
            <div className="relative max-w-5xl mx-auto px-6 sm:px-10 lg:px-12 py-24 md:py-32 text-center space-y-6">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full mb-2">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                        Updated {updatedAt ? format(updatedAt, 'MMMM yyyy') : 'Recently'}
                    </span>
                </div>
                <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">{page.title}</h1>
                <div className="w-24 h-1.5 bg-primary mx-auto rounded-full" />
            </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-12 py-20">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-16 border-2 border-slate-50 dark:border-slate-800 shadow-2xl">
                <article className="prose dark:prose-invert lg:prose-xl max-w-none">
                    <div className="rich-content">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]} 
                            rehypePlugins={[rehypeRaw]}
                        >
                            {page.content}
                        </ReactMarkdown>
                    </div>
                </article>
            </div>
            
            <footer className="mt-16 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Official Documentation • {page.title}
                </p>
            </footer>
        </main>
    </div>
  );
}
