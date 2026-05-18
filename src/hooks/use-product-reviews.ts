import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProductReview } from '@/lib/types';

export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Use a ref for lastId so fetchReviews doesn't become stale
  const lastIdRef = useRef<string | null>(null);

  const fetchReviews = useCallback(async (isNextPage = false) => {
    if (!productId) return;

    try {
      setIsLoading(true);
      setError(null);

      const url = new URL(`/api/reviews/${productId}`, window.location.origin);
      if (isNextPage && lastIdRef.current) {
        url.searchParams.set('lastId', lastIdRef.current);
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

      const newLastId = data.lastId || null;
      lastIdRef.current = newLastId;
      setLastId(newLastId);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('[ProductReviews] Failed to fetch reviews:', err);
      if (!isNextPage) setReviews([]);
      setError(err instanceof Error ? err : new Error('Failed to fetch reviews'));
    } finally {
      setIsLoading(false);
    }
  }, [productId]); // Only depend on productId, not lastId

  useEffect(() => {
    if (!productId) return;
    // Reset state when productId changes
    setReviews([]);
    setLastId(null);
    lastIdRef.current = null;
    setHasMore(false);
    setError(null);
    fetchReviews(false);
  }, [productId, fetchReviews]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchReviews(true);
    }
  }, [hasMore, isLoading, fetchReviews]);

  return { reviews, isLoading, error, hasMore, loadMore };
}
