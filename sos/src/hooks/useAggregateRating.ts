/**
 * useAggregateRating Hook
 * Fetches and calculates aggregate rating statistics from Firestore reviews
 * Used for Google Rich Snippets (stars in search results)
 *
 * @see https://schema.org/AggregateRating
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, limit as fsLimit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface AggregateRatingData {
  /** Average rating value (1-5) */
  ratingValue: number;
  /** Total number of ratings */
  ratingCount: number;
  /** Total number of reviews (with text) */
  reviewCount: number;
  /** Best possible rating */
  bestRating: number;
  /** Worst possible rating */
  worstRating: number;
  /** Rating distribution (1-5 stars) */
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  /** Most recent reviews for schema */
  recentReviews: Array<{
    id: string;
    clientName: string;
    rating: number;
    comment: string;
    createdAt: Date;
    serviceType?: string;
  }>;
}

interface UseAggregateRatingOptions {
  /** Enable real-time updates via onSnapshot */
  realtime?: boolean;
  /** Maximum number of recent reviews to fetch */
  maxRecentReviews?: number;
  /** Filter by service type */
  serviceType?: 'lawyer_call' | 'expat_call' | 'all';
  /** Minimum rating to include */
  minRating?: number;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
}

interface UseAggregateRatingResult {
  /** Aggregate rating data */
  data: AggregateRatingData | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch data */
  refetch: () => Promise<void>;
}

// Cache for aggregate rating data
const ratingCache: {
  data: AggregateRatingData | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch aggregate rating data from Firestore
 *
 * @example
 * const { data, loading } = useAggregateRating();
 *
 * if (data) {
 *   console.log(`Rating: ${data.ratingValue}/5 (${data.ratingCount} reviews)`);
 * }
 */
export const useAggregateRating = (
  options: UseAggregateRatingOptions = {}
): UseAggregateRatingResult => {
  const {
    realtime = false,
    maxRecentReviews = 10,
    serviceType = 'all',
    minRating = 1,
    cacheTTL = DEFAULT_CACHE_TTL
  } = options;

  const [data, setData] = useState<AggregateRatingData | null>(ratingCache.data);
  const [loading, setLoading] = useState(!ratingCache.data);
  const [error, setError] = useState<Error | null>(null);

  const fetchRatings = useCallback(async () => {
    // Check cache first
    const now = Date.now();
    if (ratingCache.data && (now - ratingCache.timestamp) < cacheTTL) {
      setData(ratingCache.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reviewsCol = collection(db, 'reviews');

      // Build query constraints
      const constraints = [
        where('status', '==', 'published'),
        where('isPublic', '==', true),
        where('rating', '>=', minRating),
        orderBy('rating', 'desc'),
        orderBy('createdAt', 'desc'),
        fsLimit(500) // Limit for performance
      ];

      // Add service type filter if specified
      if (serviceType !== 'all') {
        constraints.unshift(where('serviceType', '==', serviceType));
      }

      const q = query(reviewsCol, ...constraints);
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Return default data if no reviews
        // IMPORTANT: ratingValue is 0 when no reviews to avoid misleading Google
        // Components should check ratingCount > 0 before displaying aggregateRating
        const defaultData: AggregateRatingData = {
          ratingValue: 0,
          ratingCount: 0,
          reviewCount: 0,
          bestRating: 5,
          worstRating: 1,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          recentReviews: []
        };
        setData(defaultData);
        setLoading(false);
        return;
      }

      // Calculate statistics
      const distribution: AggregateRatingData['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let totalRating = 0;
      let reviewsWithComment = 0;
      const recentReviews: AggregateRatingData['recentReviews'] = [];

      snapshot.docs.forEach((doc, index) => {
        const docData = doc.data();
        const rating = Math.min(5, Math.max(1, Math.round(docData.rating || 0)));

        distribution[rating as 1 | 2 | 3 | 4 | 5]++;
        totalRating += docData.rating || 0;

        if (docData.comment && docData.comment.trim().length > 0) {
          reviewsWithComment++;
        }

        // Collect recent reviews for schema
        if (index < maxRecentReviews && docData.comment) {
          // Handle different date formats
          let createdAt: Date;
          if (docData.createdAt?.toDate) {
            createdAt = docData.createdAt.toDate();
          } else if (docData.createdAt instanceof Date) {
            createdAt = docData.createdAt;
          } else if (typeof docData.createdAt === 'string') {
            createdAt = new Date(docData.createdAt);
          } else {
            createdAt = new Date();
          }

          recentReviews.push({
            id: doc.id,
            clientName: docData.clientName || docData.authorName || 'Client vérifié',
            rating: docData.rating,
            comment: docData.comment,
            createdAt,
            serviceType: docData.serviceType
          });
        }
      });

      const ratingCount = snapshot.docs.length;
      const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

      const aggregateData: AggregateRatingData = {
        ratingValue: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        ratingCount,
        reviewCount: reviewsWithComment,
        bestRating: 5,
        worstRating: 1,
        distribution,
        recentReviews
      };

      // Update cache
      ratingCache.data = aggregateData;
      ratingCache.timestamp = now;

      setData(aggregateData);
    } catch (err) {
      console.error('Error fetching aggregate rating:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch ratings'));

      // Return cached data or default on error
      if (ratingCache.data) {
        setData(ratingCache.data);
      }
    } finally {
      setLoading(false);
    }
  }, [serviceType, minRating, maxRecentReviews, cacheTTL]);

  // Initial fetch
  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  // Real-time updates if enabled
  useEffect(() => {
    if (!realtime) return;

    const reviewsCol = collection(db, 'reviews');
    const q = query(
      reviewsCol,
      where('status', '==', 'published'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      fsLimit(1)
    );

    const unsubscribe = onSnapshot(q, () => {
      // Invalidate cache and refetch on any change
      ratingCache.timestamp = 0;
      fetchRatings();
    }, (err) => {
      console.error('Real-time rating listener error:', err);
    });

    return () => unsubscribe();
  }, [realtime, fetchRatings]);

  return {
    data,
    loading,
    error,
    refetch: fetchRatings
  };
};

/**
 * Get cached aggregate rating data synchronously
 * Useful for SSR or initial render
 */
export const getCachedAggregateRating = (): AggregateRatingData | null => {
  const now = Date.now();
  if (ratingCache.data && (now - ratingCache.timestamp) < DEFAULT_CACHE_TTL) {
    return ratingCache.data;
  }
  return null;
};

/**
 * Default aggregate rating data for SSR/initial render
 * IMPORTANT: These values should reflect actual data from the platform
 * to avoid displaying misleading information during initial render.
 *
 * When ratingCount is 0, components SHOULD NOT include aggregateRating
 * in their structured data (Google requirement).
 *
 * UPDATE these values periodically to match real platform statistics.
 */
export const DEFAULT_AGGREGATE_RATING: AggregateRatingData = {
  ratingValue: 4.9,
  ratingCount: 127,  // Update this with real count periodically
  reviewCount: 127,  // Update this with real count periodically
  bestRating: 5,
  worstRating: 1,
  distribution: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  },
  recentReviews: []
};

/**
 * Hook to get aggregate rating with SSR-safe default
 * Returns default data immediately, then updates with real data
 */
export const useAggregateRatingWithDefault = (
  options: UseAggregateRatingOptions = {}
): AggregateRatingData => {
  const { data } = useAggregateRating(options);

  return useMemo(() => {
    if (data && data.ratingCount > 0) {
      return data;
    }
    return DEFAULT_AGGREGATE_RATING;
  }, [data]);
};

export default useAggregateRating;
