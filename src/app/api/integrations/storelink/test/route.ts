import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { storeId, testType } = await req.json();

    const results: Record<string, { status: string; message?: string; error?: string }> = {};

    // Test 1: Firestore connection
    try {
      const testDoc = await adminDb.collection('_health_checks').doc('storelink_test').get();
      results.firestore = {
        status: 'connected',
        message: 'Firestore connection verified',
      };
    } catch (firestoreError: any) {
      results.firestore = {
        status: 'failed',
        error: firestoreError.message || 'Firestore connection failed',
      };
    }

    // Test 2: Firebase Auth (list users - limited)
    try {
      const listResult = await adminAuth.listUsers(1);
      results.auth = {
        status: 'connected',
        message: 'Firebase Auth connection verified',
      };
    } catch (authError: any) {
      results.auth = {
        status: 'failed',
        error: authError.message || 'Firebase Auth connection failed',
      };
    }

    // Test 3: Store-specific access (if storeId provided)
    if (storeId) {
      try {
        const storeDoc = await adminDb.collection('stores').doc(storeId).get();
        if (storeDoc.exists) {
          results.storeAccess = {
            status: 'ok',
            message: `Store ${storeId} found`,
          };
        } else {
          results.storeAccess = {
            status: 'not_found',
            message: `Store ${storeId} does not exist`,
          };
        }
      } catch (storeError: any) {
        results.storeAccess = {
          status: 'failed',
          error: storeError.message || 'Store access check failed',
        };
      }
    }

    const allPassed = Object.values(results).every(
      (r) => r.status === 'connected' || r.status === 'ok' || r.status === 'not_found'
    );

    return NextResponse.json({
      success: allPassed,
      results,
      message: allPassed
        ? 'StoreLink integration test completed successfully'
        : 'Some StoreLink integration tests failed',
    });
  } catch (error: any) {
    console.error('StoreLink integration test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'StoreLink integration test failed',
      },
      { status: 500 }
    );
  }
}