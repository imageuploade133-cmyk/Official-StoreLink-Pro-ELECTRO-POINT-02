import type { ProductReview } from './types';

export interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

/**
 * Calculate average rating and stats from product reviews
 */
export function calculateRatingStats(reviews: ProductReview[]): RatingStats {
  if (!reviews || reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }

  const distribution: RatingStats['ratingDistribution'] = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let totalRating = 0;

  reviews.forEach(review => {
    const rating = Math.round(review.rating) as keyof typeof distribution;
    if (rating >= 1 && rating <= 5) {
      distribution[rating]++;
      totalRating += review.rating;
    }
  });

  return {
    averageRating: reviews.length > 0 ? Math.round((totalRating / reviews.length) * 10) / 10 : 0,
    totalReviews: reviews.length,
    ratingDistribution: distribution
  };
}

/**
 * Format rating to display (e.g., "4.5 out of 5")
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * Get color based on rating value
 */
export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-green-600';
  if (rating >= 4) return 'text-green-500';
  if (rating >= 3.5) return 'text-blue-600';
  if (rating >= 3) return 'text-yellow-500';
  if (rating >= 2) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get background color for rating badge
 */
export function getRatingBgColor(rating: number): string {
  if (rating >= 4.5) return 'bg-green-50 dark:bg-green-950/30';
  if (rating >= 4) return 'bg-green-50 dark:bg-green-950/30';
  if (rating >= 3.5) return 'bg-blue-50 dark:bg-blue-950/30';
  if (rating >= 3) return 'bg-yellow-50 dark:bg-yellow-950/30';
  if (rating >= 2) return 'bg-orange-50 dark:bg-orange-950/30';
  return 'bg-red-50 dark:bg-red-950/30';
}
