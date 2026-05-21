import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, orderBy, limit, startAfter, getDoc, doc } from 'firebase/firestore';
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
    
    // Better Solution: 
    // We'll use a simpler query first to avoid index issues if they occur
    // and handle filtering of hidden/unapproved reviews in memory for small batches
    // OR try the filtered query and fallback gracefully.
    
    let reviews: ProductReview[] = [];
    let lastVisible: any = null;
    let hasMore = false;

    try {
      // Primary query: newest first, limited to pageSize + 1 to check for hasMore
      let q = query(
        reviewsRef,
        orderBy('createdAt', 'desc'),
        limit(pageSize + 5) // Fetch a few more to account for in-memory filtering
      );

      if (lastDocId) {
        const lastDocRef = doc(db, 'products', productId, 'reviews', lastDocId);
        const lastDocSnap = await getDoc(lastDocRef);
        if (lastDocSnap.exists()) {
          q = query(
            reviewsRef,
            orderBy('createdAt', 'desc'),
            startAfter(lastDocSnap),
            limit(pageSize + 5)
          );
        }
      }

      const snapshot = await getDocs(q);
      
      const allFetchedReviews = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as ProductReview[];

      // Filter in-memory to be inclusive of undefined fields
      reviews = allFetchedReviews.filter(r => {
        const isHidden = r.isHidden === true;
        const isApproved = r.isApproved !== false; // Default to true if undefined
        return !isHidden && isApproved;
      });

      // Truncate to pageSize and determine hasMore
      if (reviews.length > pageSize) {
        hasMore = true;
        reviews = reviews.slice(0, pageSize);
      } else if (allFetchedReviews.length > pageSize) {
        // We might have more if we fetched more than pageSize but filtered some out
        hasMore = true;
      }
      
      lastVisible = snapshot.docs[Math.min(reviews.length - 1, snapshot.docs.length - 1)];

    } catch (queryError: any) {
      console.error('[Reviews API] Primary query failed, using simplified fallback:', queryError);
      // Fallback: Extremely simple query
      const fallbackQuery = query(reviewsRef, limit(50));
      const snapshot = await getDocs(fallbackQuery);
      reviews = snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id } as ProductReview))
        .filter(r => r.isHidden !== true && r.isApproved !== false)
        .sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;
            return dateB - dateA;
        })
        .slice(0, pageSize);
      
      hasMore = snapshot.docs.length > pageSize;
      lastVisible = snapshot.docs[reviews.length - 1];
    }

    return NextResponse.json(
      {
        success: true,
        data: reviews,
        count: reviews.length,
        lastId: lastVisible ? lastVisible.id : null,
        hasMore: hasMore,
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
        error: error instanceof Error ? error.message : 'Failed to fetch reviews',
      },
      { status: 500 }
    );
  }
}
