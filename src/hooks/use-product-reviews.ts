import { useState, useEffect } from 'react';
import type { ProductReview } from '@/lib/types';

export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productId) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/reviews/${productId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch reviews: ${response.statusText}`);
        }

        const data = await response.json();
        setReviews(data.data || []);
      } catch (err) {
        console.error('[ProductReviews] Failed to fetch reviews:', err);
        setReviews([]);
        setError(err instanceof Error ? err : new Error('Failed to fetch reviews'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [productId]);

  return { reviews, isLoading, error };
}
