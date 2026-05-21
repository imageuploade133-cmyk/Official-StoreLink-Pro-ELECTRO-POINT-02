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
      const constraints: QueryConstraint[] = [where('productId', 'in', productIdList)];
      if (storeId) {
        constraints.push(where('store_id', '==', storeId));
      }
      constraints.push(orderBy('createdAt', 'desc'));
      constraints.push(limit(pageSize + 8));

      if (lastDocId) {
        const cursorDoc = await getDoc(doc(db, 'store_reviews', lastDocId));
        if (cursorDoc.exists()) {
          constraints.push(startAfter(cursorDoc));
        }
      }

      const pageSnapshot = await getDocs(query(reviewsRef, ...constraints));
      const fetched = pageSnapshot.docs.map((reviewDoc) => ({
        ...reviewDoc.data(),
        id: reviewDoc.id,
      })) as ProductReview[];

      const visibleFetched = fetched.filter(isVisibleReview);
      reviews = visibleFetched.slice(0, pageSize);
      hasMore = visibleFetched.length > pageSize || pageSnapshot.docs.length > pageSize;
      lastVisibleId = reviews.length > 0 ? reviews[reviews.length - 1].id : null;

      const statsConstraints: QueryConstraint[] = [where('productId', 'in', productIdList)];
      if (storeId) {
        statsConstraints.push(where('store_id', '==', storeId));
      }

      const statsSnapshot = await getDocs(query(reviewsRef, ...statsConstraints));
      const allStatsReviews = statsSnapshot.docs
        .map((reviewDoc) => ({ ...reviewDoc.data(), id: reviewDoc.id } as ProductReview))
        .filter(isVisibleReview);
      stats = computeStats(allStatsReviews);
    } catch (queryError) {
      console.error('[Reviews API] Primary query failed, using fallback:', queryError);

      const allFallbackReviews: ProductReview[] = [];

      await Promise.all(
        productIdList.map(async (id) => {
          try {
            const nestedReviewsRef = collection(db, 'products', id, 'reviews');
            const nestedSnapshot = await getDocs(query(nestedReviewsRef, orderBy('createdAt', 'desc'), limit(200)));
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
