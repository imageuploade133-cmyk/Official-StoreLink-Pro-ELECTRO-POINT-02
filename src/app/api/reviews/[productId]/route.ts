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
    
    // Build query - simplified to just filter by non-hidden, approved reviews
    // Order by createdAt descending to get newest first
    let q = query(
      reviewsRef,
      where('isHidden', '==', false),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    // Also filter for approved reviews if the field exists
    // Note: isApproved check is optional since we auto-approve on submission
    // Adding it only if it doesn't cause index issues

    if (lastDocId) {
      const lastDocRef = doc(db, 'products', productId, 'reviews', lastDocId);
      const lastDocSnap = await getDoc(lastDocRef);
      if (lastDocSnap.exists()) {
        q = query(
          reviewsRef,
          where('isHidden', '==', false),
          orderBy('createdAt', 'desc'),
          startAfter(lastDocSnap),
          limit(pageSize)
        );
      }
    }

    const snapshot = await getDocs(q);
    const reviews: ProductReview[] = snapshot.docs.map(doc => {
      const data = doc.data();
      // Only include approved reviews (filter out any unapproved ones as a safety measure)
      if (data.isApproved === false) return null;
      return {
        ...data,
        id: doc.id,
      };
    }).filter(Boolean) as ProductReview[];

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

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
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('[Reviews API] Error fetching reviews:', error);
    
    // Check if it's an index-related error
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      // Fallback: try querying without filters if composite index is missing
      try {
        const { productId } = await params;
        const db = getFirestore();
        const reviewsRef = collection(db, 'products', productId, 'reviews');
        
        const fallbackQuery = query(
          reviewsRef,
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        
        const snapshot = await getDocs(fallbackQuery);
        const reviews: ProductReview[] = snapshot.docs.map(doc => {
          const data = doc.data();
          if (data.isHidden === true || data.isApproved === false) return null;
          return { ...data, id: doc.id };
        }).filter(Boolean) as ProductReview[];

        return NextResponse.json(
          {
            success: true,
            data: reviews,
            count: reviews.length,
            lastId: snapshot.docs[snapshot.docs.length - 1]?.id || null,
            hasMore: reviews.length === 10,
            note: 'Using fallback query - some filtering may be client-side',
          },
          {
            headers: {
              'Cache-Control': 'no-store, max-age=0',
            },
          }
        );
      } catch (fallbackError) {
        console.error('[Reviews API] Fallback query also failed:', fallbackError);
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
