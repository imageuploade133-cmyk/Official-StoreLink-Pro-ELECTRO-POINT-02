import { useState, useEffect, useCallback } from 'react';
import type { ProductReview } from '@/lib/types';

export function useProductReviews(productId: string, pageSize: number = 10) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchReviews = useCallback(async (isLoadMore = false) => {
    if (!productId) return;

    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const url = new URL(`/api/reviews/${productId}`, window.location.origin);
      url.searchParams.set('pageSize', pageSize.toString());
      if (isLoadMore && lastDocId) {
        url.searchParams.set('lastDocId', lastDocId);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (isLoadMore) {
        setReviews(prev => [...prev, ...(result.data || [])]);
      } else {
        setReviews(result.data || []);
      }
      
      setLastDocId(result.lastDocId || null);
      setHasMore(result.hasMore || false);
    } catch (err) {
      console.error('[ProductReviews] Failed to fetch reviews:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch reviews'));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [productId, pageSize, lastDocId]);

  useEffect(() => {
    setReviews([]);
    setLastDocId(null);
    setHasMore(false);
    fetchReviews(false);
  }, [productId]); // Only re-fetch when productId changes

  const loadMore = () => {
    if (hasMore && !isLoadingMore) {
      fetchReviews(true);
    }
  };

  return { reviews, isLoading, isLoadingMore, error, hasMore, loadMore, refresh: () => fetchReviews(false) };
}
