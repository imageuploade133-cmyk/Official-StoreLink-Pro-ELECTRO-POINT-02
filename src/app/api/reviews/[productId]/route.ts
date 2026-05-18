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
import { initializeApp, getApps } from 'firebase/app';
import type { ProductReview } from '@/lib/types';

// Initialize Firebase with public config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Ensure Firebase is initialized
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get('limit') || '10');
    const lastDocId = searchParams.get('lastId');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const reviewsRef = collection(db, 'products', productId, 'reviews');

    // Build the base query - fetch visible, approved reviews
    // Note: Some older reviews may not have isApproved/isHidden fields set,
    // so we use two separate queries and merge, OR handle with a fallback approach.
    // The safest approach: query by isHidden == false (covers most cases),
    // then also query without that filter for older reviews.

    if (lastDocId) {
      // Pagination: fetch next page after lastDocId
      const lastDocRef = doc(db, 'products', productId, 'reviews', lastDocId);
      const lastDocSnap = await getDoc(lastDocRef);

      if (!lastDocSnap.exists()) {
        // lastDoc not found, start from beginning
        return await fetchFirstPage(reviewsRef, pageSize);
      }

      const q = query(
        reviewsRef,
        where('isHidden', '==', false),
        orderBy('createdAt', 'desc'),
        startAfter(lastDocSnap),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      const reviews = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id,
      })) as ProductReview[];

      // Filter out any reviews where isApproved is explicitly false
      const filteredReviews = reviews.filter(r => r.isApproved !== false);
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];

      return NextResponse.json(
        {
          success: true,
          data: filteredReviews,
          count: filteredReviews.length,
          lastId: lastVisible ? lastVisible.id : null,
          hasMore: snapshot.docs.length === pageSize,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        }
      );
    } else {
      return await fetchFirstPage(reviewsRef, pageSize);
    }
  } catch (error) {
    console.error('[Reviews API] Error fetching reviews:', error);

    // If the compound query fails (e.g. missing composite index), fall back to a simpler query
    const { productId } = await params;
    if (productId) {
      try {
        return await fetchReviewsFallback(productId, parseInt(new URL(request.url).searchParams.get('limit') || '10'));
      } catch (fallbackError) {
        console.error('[Reviews API] Fallback also failed:', fallbackError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        data: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch reviews',
      },
      { status: 500 }
    );
  }
}

async function fetchFirstPage(reviewsRef: ReturnType<typeof collection>, pageSize: number) {
  try {
    // Primary query: isHidden == false (most reviews will have this set)
    const q = query(
      reviewsRef,
      where('isHidden', '==', false),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map(d => ({
      ...d.data(),
      id: d.id,
    })) as ProductReview[];

    // Filter out explicitly rejected reviews
    const filteredReviews = reviews.filter(r => r.isApproved !== false);
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return NextResponse.json(
      {
        success: true,
        data: filteredReviews,
        count: filteredReviews.length,
        lastId: lastVisible ? lastVisible.id : null,
        hasMore: snapshot.docs.length === pageSize,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (err: any) {
    // If the isHidden index doesn't exist, fall back to a simple orderBy query
    if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
      console.warn('[Reviews API] Composite index missing, using fallback query');
      const q = query(
        reviewsRef,
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      const snapshot = await getDocs(q);
      // Filter in memory since we can't do compound query
      const reviews = snapshot.docs
        .map(d => ({ ...d.data(), id: d.id } as ProductReview))
        .filter(r => r.isHidden !== true && r.isApproved !== false);

      const lastVisible = snapshot.docs[snapshot.docs.length - 1];

      return NextResponse.json(
        {
          success: true,
          data: reviews,
          count: reviews.length,
          lastId: lastVisible ? lastVisible.id : null,
          hasMore: snapshot.docs.length === pageSize,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        }
      );
    }
    throw err;
  }
}

async function fetchReviewsFallback(productId: string, pageSize: number) {
  const db = getFirestore();
  const reviewsRef = collection(db, 'products', productId, 'reviews');

  const q = query(
    reviewsRef,
    orderBy('createdAt', 'desc'),
    limit(pageSize * 2) // fetch more to compensate for in-memory filtering
  );

  const snapshot = await getDocs(q);
  const reviews = snapshot.docs
    .map(d => ({ ...d.data(), id: d.id } as ProductReview))
    .filter(r => r.isHidden !== true && r.isApproved !== false)
    .slice(0, pageSize);

  const lastVisible = reviews.length > 0 ? reviews[reviews.length - 1] : null;

  return NextResponse.json(
    {
      success: true,
      data: reviews,
      count: reviews.length,
      lastId: lastVisible ? lastVisible.id : null,
      hasMore: reviews.length === pageSize,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
