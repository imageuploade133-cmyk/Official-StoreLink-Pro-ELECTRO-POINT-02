import { NextRequest, NextResponse } from 'next/server';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  getDoc,
  doc,
} from 'firebase/firestore';
import type { QueryConstraint } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import type { ProductReview } from '@/lib/types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

const isVisibleReview = (review: ProductReview) => review.isHidden !== true && review.isApproved !== false;

const toMillis = (value: any): number => {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return 0;
};

const computeStats = (reviews: ProductReview[]) => {
  if (!reviews.length) {
    return {
      averageRating: 0,
      totalCount: 0,
      distribution: [0, 0, 0, 0, 0],
    };
  }

  const distributionCounts = [0, 0, 0, 0, 0];
  let sum = 0;

  reviews.forEach((review) => {
    const normalized = Math.max(1, Math.min(5, Math.round(Number(review.rating) || 0)));
    distributionCounts[5 - normalized] += 1;
    sum += Number(review.rating) || 0;
  });

  return {
    averageRating: Number((sum / reviews.length).toFixed(1)),
    totalCount: reviews.length,
    distribution: distributionCounts.map((count) => Math.round((count / reviews.length) * 100)),
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const { searchParams } = new URL(request.url);
    const pageSize = Math.min(25, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const lastDocId = searchParams.get('lastId');
    const storeId = searchParams.get('storeId');
    const alternateProductId = searchParams.get('alternateProductId');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const db = getFirestore();
    const productIds = new Set<string>([productId]);
    if (alternateProductId) {
      productIds.add(alternateProductId);
    }

    if (storeId) {
      try {
        const slugMatchQuery = query(
          collection(db, 'products'),
          where('store_id', '==', storeId),
          where('slug', '==', productId),
          limit(1)
        );
        const slugMatchSnapshot = await getDocs(slugMatchQuery);
        if (!slugMatchSnapshot.empty) {
          productIds.add(slugMatchSnapshot.docs[0].id);
        }
      } catch (slugError) {
        console.warn('[Reviews API] Slug match failed (likely missing index):', slugError);
        // Continue without the resolved ID, the query might still find reviews by slug or ID
      }
    }

    const productIdList = Array.from(productIds).slice(0, 10);
    const reviewsRef = collection(db, 'store_reviews');

    let reviews: ProductReview[] = [];
    let hasMore = false;
    let lastVisibleId: string | null = null;
    let stats = {
      averageRating: 0,
      totalCount: 0,
      distribution: [0, 0, 0, 0, 0],
    };

    try {
      // Query: where productId IN [...] orderBy createdAt desc
      const constraints: QueryConstraint[] = [
        where('productId', 'in', productIdList),
        orderBy('createdAt', 'desc'),
        limit(pageSize * 2 + 10) // Fetch more than requested to allow for in-memory filtering
      ];

      if (lastDocId) {
        const cursorDoc = await getDoc(doc(db, 'store_reviews', lastDocId));
        if (cursorDoc.exists()) {
          constraints.push(startAfter(cursorDoc));
        }
      }

      const pageSnapshot = await getDocs(query(reviewsRef, ...constraints));
      let fetched = pageSnapshot.docs.map((reviewDoc) => ({
        ...reviewDoc.data(),
        id: reviewDoc.id,
      })) as ProductReview[];

      // Filter by store_id in-memory if storeId is provided
      if (storeId) {
        fetched = fetched.filter(r => r.store_id === storeId);
      }

      const visibleFetched = fetched.filter(isVisibleReview);
      reviews = visibleFetched.slice(0, pageSize);
      hasMore = visibleFetched.length > pageSize || pageSnapshot.docs.length > (pageSize * 2 + 9);
      lastVisibleId = reviews.length > 0 ? reviews[reviews.length - 1].id : null;

      // For stats, fetch reviews and filter
      let statsReviews: ProductReview[] = [];
      try {
        const statsSnapshot = await getDocs(query(reviewsRef, where('productId', 'in', productIdList)));
        statsReviews = statsSnapshot.docs
          .map((reviewDoc) => ({ ...reviewDoc.data(), id: reviewDoc.id } as ProductReview))
          .filter(isVisibleReview);
        
        if (storeId) {
          statsReviews = statsReviews.filter(r => r.store_id === storeId);
        }
      } catch (statsError) {
        console.warn('[Reviews API] Stats query failed:', statsError);
      }
      
      stats = computeStats(statsReviews);
    } catch (queryError) {
      console.error('[Reviews API] Query failed, trying fallback:', queryError);

      // Fallback: Try nested product reviews subcollection (legacy storage)
      const allFallbackReviews: ProductReview[] = [];

      await Promise.all(
        productIdList.map(async (id) => {
          try {
            const nestedReviewsRef = collection(db, 'products', id, 'reviews');
            // Try with orderBy, if it fails, try without it
            let nestedSnapshot;
            try {
              nestedSnapshot = await getDocs(query(nestedReviewsRef, orderBy('createdAt', 'desc'), limit(100)));
            } catch (e) {
              console.warn(`[Reviews API] Fallback orderBy failed for ${id}, trying without orderBy`);
              nestedSnapshot = await getDocs(query(nestedReviewsRef, limit(100)));
            }
            
            nestedSnapshot.docs.forEach((reviewDoc) => {
              allFallbackReviews.push({
                ...reviewDoc.data(),
                id: reviewDoc.id,
              } as ProductReview);
            });
          } catch (nestedError) {
            console.warn(`[Reviews API] Fallback failed for product ${id}:`, nestedError);
          }
        })
      );

      const merged = allFallbackReviews
        .filter(isVisibleReview)
        .filter(r => !storeId || r.store_id === storeId) // Respect storeId in fallback
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

      reviews = merged.slice(0, pageSize);
      hasMore = merged.length > pageSize;
      lastVisibleId = reviews.length > 0 ? reviews[reviews.length - 1].id : null;
      stats = computeStats(merged);
    }

    return NextResponse.json(
      {
        success: true,
        data: reviews,
        count: reviews.length,
        lastId: lastVisibleId,
        hasMore,
        stats,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('[Reviews API] Fatal error fetching reviews:', error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        count: 0,
        stats: {
          averageRating: 0,
          totalCount: 0,
          distribution: [0, 0, 0, 0, 0],
        },
        error: error instanceof Error ? error.message : 'Failed to fetch reviews',
      },
      { status: 500 }
    );
  }
}
