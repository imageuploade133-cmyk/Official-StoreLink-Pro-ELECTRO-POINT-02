'use server'

import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { ProductReview } from '@/lib/types';

export async function submitReviewAction(productId: string, reviewData: Omit<ProductReview, 'id' | 'createdAt'>) {
  try {
    const productRef = adminDb.collection('products').doc(productId);
    const reviewRef = adminDb.collection('products').doc(productId).collection('reviews').doc();
    const storeReviewRef = adminDb.collection('store_reviews').doc(reviewRef.id);

    await adminDb.runTransaction(async (transaction) => {
      const productDoc = await transaction.get(productRef);
      if (!productDoc.exists) {
        throw new Error('Product not found');
      }

      const product = productDoc.data() as any;
      const currentReviewCount = product.reviewCount || 0;
      const currentAverageRating = product.averageRating || 0;

      const newReviewCount = currentReviewCount + 1;
      const newAverageRating = (currentAverageRating * currentReviewCount + reviewData.rating) / newReviewCount;

      // Update product document
      transaction.update(productRef, {
        reviewCount: newReviewCount,
        averageRating: newAverageRating,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const fullReviewData = {
        ...reviewData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Add review to product sub-collection
      transaction.set(reviewRef, fullReviewData);

      // Duplicate to top-level collection for dashboard
      transaction.set(storeReviewRef, {
        ...fullReviewData,
        id: reviewRef.id,
      });
    });

    return { success: true, reviewId: reviewRef.id };
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return { success: false, error: error.message };
  }
}
