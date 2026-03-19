import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
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

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const reviewsRef = collection(db, 'productReviews');
    
    // Query only approved reviews for the product
    const q = query(
      reviewsRef,
      where('productId', '==', productId),
      where('isApproved', '==', true)
    );

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
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
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
