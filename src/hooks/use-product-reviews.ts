import { useState, useEffect, useCallback } from 'react';
import type { ProductReview } from '@/lib/types';

interface UseProductReviewsOptions {
  storeId?: string;
  alternateProductId?: string;
}

interface ReviewsStats {
  averageRating: number;
  totalCount: number;
  distribution: number[];
}

const EMPTY_STATS: ReviewsStats = {
  averageRating: 0,
  totalCount: 0,
  distribution: [0, 0, 0, 0, 0],
};

export function useProductReviews(productId: string, options?: UseProductReviewsOptions) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState<ReviewsStats>(EMPTY_STATS);

  const fetchReviews = useCallback(async (params?: { isNextPage?: boolean; cursorId?: string | null }) => {
    if (!productId) return;

    const isNextPage = params?.isNextPage ?? false;
    const cursorId = params?.cursorId ?? null;

    try {
      setIsLoading(true);
      setError(null);

      const url = new URL(`/api/reviews/${productId}`, window.location.origin);
      if (isNextPage && cursorId) {
        url.searchParams.set('lastId', cursorId);
      }
      url.searchParams.set('limit', '10');
      if (options?.storeId) {
        url.searchParams.set('storeId', options.storeId);
      }
      if (options?.alternateProductId) {
        url.searchParams.set('alternateProductId', options.alternateProductId);
      }

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

      setStats({
        averageRating: Number(data?.stats?.averageRating) || 0,
        totalCount: Number(data?.stats?.totalCount) || 0,
        distribution: Array.isArray(data?.stats?.distribution) ? data.stats.distribution : [0, 0, 0, 0, 0],
      });
      setLastId(data.lastId || null);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('[ProductReviews] Failed to fetch reviews:', err);
      if (!isNextPage) {
        setReviews([]);
        setStats(EMPTY_STATS);
      }
      setError(err instanceof Error ? err : new Error('Failed to fetch reviews'));
    } finally {
      setIsLoading(false);
    }
  }, [productId, options?.storeId, options?.alternateProductId]);

  useEffect(() => {
    setReviews([]);
    setLastId(null);
    setHasMore(false);
    setStats(EMPTY_STATS);
    fetchReviews();
  }, [fetchReviews]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchReviews({ isNextPage: true, cursorId: lastId });
    }
  }, [hasMore, isLoading, fetchReviews, lastId]);

  const refresh = useCallback(async () => {
    setLastId(null);
    setHasMore(false);
    await fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    stats,
  };
}
