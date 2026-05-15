'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useStoreUrl } from '@/hooks/use-store-url';
import type { Category } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export function TopCategoryBar() {
  const firestore = useFirestore();
  const { storeId, getStoreUrl } = useStoreUrl();

  const categoriesQuery = React.useMemo(() => {
    if (!firestore || !storeId) return null;
    return query(
      collection(firestore, 'categories'),
      where('store_id', '==', storeId),
      orderBy('name', 'asc'),
      limit(10)
    );
  }, [firestore, storeId]);

  const { data: categories, isLoading } = useCollection<Category>(categoriesQuery);

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 overflow-x-auto py-4 px-4 no-scrollbar bg-white dark:bg-black">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 shrink-0">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) return null;

  return (
    <div className="bg-white dark:bg-black border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-6 overflow-x-auto py-6 px-4 no-scrollbar max-w-site-container mx-auto">
        {categories.map((category) => (
            <Link
            key={category.id}
            href={getStoreUrl(`/store/shop?category=${category.id}`)}
            className="flex flex-col items-center gap-2 shrink-0 group"
            >
            <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-900 border-2 border-transparent group-hover:border-primary transition-all duration-300 shadow-sm">
                <Image
                src={category.imageUrl || `https://picsum.photos/seed/${category.id}/100/100`}
                alt={category.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                unoptimized
                />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors truncate max-w-[64px] sm:max-w-[80px]">
                {category.name}
            </span>
            </Link>
        ))}
        </div>
        <style jsx>{`
            .no-scrollbar::-webkit-scrollbar {
                display: none;
            }
            .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
        `}</style>
    </div>
  );
}
