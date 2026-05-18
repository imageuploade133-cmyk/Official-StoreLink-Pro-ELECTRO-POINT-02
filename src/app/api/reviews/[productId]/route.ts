import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, orderBy, limit, startAfter, doc, getDoc } from 'firebase/firestore';
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
    const searchParams = request.nextUrl.searchParams;
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const lastDocId = searchParams.get('lastDocId');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const reviewsRef = collection(db, 'products', productId, 'reviews');
    
    // Base query: approved and non-hidden reviews, ordered by createdAt
    let qConstraints: any[] = [
      where('isApproved', '==', true),
      where('isHidden', '==', false),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    ];

    if (lastDocId) {
      const lastDocRef = doc(db, 'products', productId, 'reviews', lastDocId);
      const lastDocSnap = await getDoc(lastDocRef);
      if (lastDocSnap.exists()) {
        qConstraints.push(startAfter(lastDocSnap));
      }
    }

    const q = query(reviewsRef, ...qConstraints);
    const snapshot = await getDocs(q);
    
    const reviews: ProductReview[] = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as ProductReview[];

    return NextResponse.json(
      {
        success: true,
        data: reviews,
        count: reviews.length,
        lastDocId: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
        hasMore: reviews.length === pageSize
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[Reviews API] Error fetching reviews:', error);
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
