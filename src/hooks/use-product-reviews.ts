import { useState, useEffect, useCallback } from 'react';
import type { ProductReview } from '@/lib/types';

export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchReviews = useCallback(async (isNextPage = false) => {
    if (!productId) return;

    try {
      setIsLoading(true);
      setError(null);

      const url = new URL(`/api/reviews/${productId}`, window.location.origin);
      if (isNextPage && lastId) {
        url.searchParams.set('lastId', lastId);
      }
      url.searchParams.set('limit', '10');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (isNextPage) {
        setReviews(prev => [...prev, ...(data.data || [])]);
      } else {
        setReviews(data.data || []);
      }
      
      setLastId(data.lastId || null);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('[ProductReviews] Failed to fetch reviews:', err);
      if (!isNextPage) setReviews([]);
      setError(err instanceof Error ? err : new Error('Failed to fetch reviews'));
    } finally {
      setIsLoading(false);
    }
  }, [productId, lastId]);

  useEffect(() => {
    setReviews([]);
    setLastId(null);
    setHasMore(false);
    fetchReviews(false);
  }, [productId]); // Reset and fetch on productId change

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchReviews(true);
    }
  }, [hasMore, isLoading, fetchReviews]);

  const refresh = useCallback(async () => {
    setLastId(null);
    setHasMore(false);
    await fetchReviews(false);
  }, [fetchReviews]);

  return { reviews, isLoading, error, hasMore, loadMore, refresh };
}
