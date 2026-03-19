import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { ProductReview } from '@/lib/types';

export function useProductReviews(productId: string) {
  const firestore = useFirestore();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore || !productId) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const reviewsRef = collection(firestore, 'productReviews');
        const q = query(
          reviewsRef,
          where('productId', '==', productId),
          where('isApproved', '==', true)
        );
        const snapshot = await getDocs(q);
        const reviewsData = snapshot.docs.map(doc => doc.data() as ProductReview);
        setReviews(reviewsData);
      } catch (err) {
        console.error('[ProductReviews] Failed to fetch reviews:', err);
        setReviews([]);
        setError(err instanceof Error ? err : new Error('Failed to fetch reviews'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [firestore, productId]);

  return { reviews, isLoading, error };
}
