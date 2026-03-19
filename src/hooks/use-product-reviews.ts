import { useState, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, getDocs, Firestore } from 'firebase/firestore';
import type { ProductReview } from '@/lib/types';

export function useProductReviews(productId: string) {
  const firestore = useFirestore();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore || !productId) {
      setIsLoading(false);
      return;
    }

    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        const reviewsRef = collection(firestore, 'productReviews');
        const q = query(
          reviewsRef,
          where('productId', '==', productId),
          where('isApproved', '==', true) // Only approved reviews
        );
        const snapshot = await getDocs(q);
        const reviewsData = snapshot.docs.map(doc => doc.data() as ProductReview);
        setReviews(reviewsData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch product reviews:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setReviews([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [firestore, productId]);

  return { reviews, isLoading, error };
}
