/**
 * ReviewSchema Component
 * Generates JSON-LD structured data for individual reviews
 * These are essential for Google Rich Snippets with stars
 *
 * @see https://schema.org/Review
 * @see https://developers.google.com/search/docs/appearance/structured-data/review-snippet
 */

import React, { useMemo } from 'react';

export interface ReviewAuthor {
  name: string;
  /** Optional URL to author profile */
  url?: string;
  /** Optional author image */
  image?: string;
}

export interface ReviewRating {
  ratingValue: number;
  bestRating?: number;
  worstRating?: number;
}

export interface ReviewItem {
  /** Unique review ID */
  id: string;
  /** Review author information */
  author: ReviewAuthor;
  /** Review rating (1-5) */
  rating: ReviewRating;
  /** Review text content */
  reviewBody: string;
  /** Date published (ISO format) */
  datePublished: string;
  /** Optional date modified (ISO format) */
  dateModified?: string;
  /** Review headline/title */
  headline?: string;
  /** Language of the review */
  inLanguage?: string;
}

export interface ReviewedItem {
  /** Type of item being reviewed */
  type: 'Organization' | 'Service' | 'Product' | 'LocalBusiness' | 'ProfessionalService';
  /** Name of the reviewed item */
  name: string;
  /** URL of the reviewed item */
  url?: string;
  /** Image of the reviewed item */
  image?: string;
  /** Description of the reviewed item */
  description?: string;
}

interface ReviewSchemaProps {
  /** Single review or array of reviews */
  reviews: ReviewItem | ReviewItem[];
  /** Item being reviewed */
  itemReviewed?: ReviewedItem;
  /** Base URL for generating @ids */
  baseUrl?: string;
  /** Include aggregate rating summary */
  includeAggregateRating?: boolean;
}

/**
 * Generates Review JSON-LD schema
 * Can be used for single or multiple reviews
 *
 * @example
 * <ReviewSchema
 *   reviews={[
 *     {
 *       id: '1',
 *       author: { name: 'Jean D.' },
 *       rating: { ratingValue: 5 },
 *       reviewBody: 'Service excellent...',
 *       datePublished: '2024-12-15'
 *     }
 *   ]}
 *   itemReviewed={{
 *     type: 'Organization',
 *     name: 'SOS Expat & Travelers'
 *   }}
 * />
 */
const ReviewSchema: React.FC<ReviewSchemaProps> = ({
  reviews,
  itemReviewed = {
    type: 'Organization',
    name: 'SOS Expat & Travelers',
    url: 'https://sos-expat.com',
    description: 'Assistance juridique et expatriation en urgence - Service d\'aide rapide 24/7 pour expatriés et voyageurs dans 197 pays.'
  },
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sos-expat.com',
  includeAggregateRating = true
}) => {
  const schema = useMemo(() => {
    const reviewArray = Array.isArray(reviews) ? reviews : [reviews];

    if (reviewArray.length === 0) return null;

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');

    // Generate individual review schemas
    const reviewSchemas = reviewArray.map((review, index) => ({
      '@type': 'Review',
      '@id': `${cleanBaseUrl}/#review-${review.id || index}`,
      author: {
        '@type': 'Person',
        name: review.author.name,
        ...(review.author.url && { url: review.author.url }),
        ...(review.author.image && { image: review.author.image })
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating.ratingValue,
        bestRating: review.rating.bestRating || 5,
        worstRating: review.rating.worstRating || 1
      },
      reviewBody: review.reviewBody,
      datePublished: review.datePublished,
      ...(review.dateModified && { dateModified: review.dateModified }),
      ...(review.headline && { headline: review.headline }),
      ...(review.inLanguage && { inLanguage: review.inLanguage }),
      itemReviewed: {
        '@type': itemReviewed.type,
        '@id': `${cleanBaseUrl}/#${itemReviewed.type.toLowerCase()}`,
        name: itemReviewed.name,
        ...(itemReviewed.url && { url: itemReviewed.url }),
        ...(itemReviewed.image && { image: itemReviewed.image }),
        ...(itemReviewed.description && { description: itemReviewed.description })
      }
    }));

    // Calculate aggregate rating if requested
    let aggregateRatingSchema = null;
    if (includeAggregateRating && reviewArray.length > 0) {
      const totalRating = reviewArray.reduce((sum, r) => sum + r.rating.ratingValue, 0);
      const averageRating = totalRating / reviewArray.length;

      aggregateRatingSchema = {
        '@type': itemReviewed.type,
        '@id': `${cleanBaseUrl}/#${itemReviewed.type.toLowerCase()}`,
        name: itemReviewed.name,
        ...(itemReviewed.url && { url: itemReviewed.url }),
        ...(itemReviewed.description && { description: itemReviewed.description }),
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: averageRating.toFixed(1),
          ratingCount: reviewArray.length,
          reviewCount: reviewArray.length,
          bestRating: 5,
          worstRating: 1
        },
        review: reviewSchemas.map(r => ({
          '@type': 'Review',
          author: r.author,
          reviewRating: r.reviewRating,
          reviewBody: r.reviewBody,
          datePublished: r.datePublished
        }))
      };
    }

    // Return appropriate schema structure
    if (aggregateRatingSchema) {
      return {
        '@context': 'https://schema.org',
        ...aggregateRatingSchema
      };
    }

    // If only reviews without aggregate
    if (reviewSchemas.length === 1) {
      return {
        '@context': 'https://schema.org',
        ...reviewSchemas[0]
      };
    }

    return {
      '@context': 'https://schema.org',
      '@graph': reviewSchemas
    };
  }, [reviews, itemReviewed, baseUrl, includeAggregateRating]);

  if (!schema) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
};

export default ReviewSchema;

/**
 * Generates a single Review schema object
 * Useful for embedding in other schemas
 */
export const generateReviewSchema = (review: ReviewItem): Record<string, unknown> => ({
  '@type': 'Review',
  author: {
    '@type': 'Person',
    name: review.author.name
  },
  reviewRating: {
    '@type': 'Rating',
    ratingValue: review.rating.ratingValue,
    bestRating: review.rating.bestRating || 5,
    worstRating: review.rating.worstRating || 1
  },
  reviewBody: review.reviewBody,
  datePublished: review.datePublished,
  ...(review.headline && { headline: review.headline })
});

/**
 * Helper to convert Firestore review to ReviewItem format
 */
export const firestoreToReviewItem = (doc: {
  id: string;
  clientName?: string;
  authorName?: string;
  rating: number;
  comment?: string;
  createdAt: Date | { toDate: () => Date } | string;
  title?: string;
}): ReviewItem => {
  // Handle different date formats
  let dateStr: string;
  if (doc.createdAt instanceof Date) {
    dateStr = doc.createdAt.toISOString().split('T')[0];
  } else if (typeof doc.createdAt === 'object' && 'toDate' in doc.createdAt) {
    dateStr = doc.createdAt.toDate().toISOString().split('T')[0];
  } else if (typeof doc.createdAt === 'string') {
    dateStr = doc.createdAt.split('T')[0];
  } else {
    dateStr = new Date().toISOString().split('T')[0];
  }

  return {
    id: doc.id,
    author: {
      name: doc.clientName || doc.authorName || 'Client vérifié'
    },
    rating: {
      ratingValue: doc.rating,
      bestRating: 5,
      worstRating: 1
    },
    reviewBody: doc.comment || '',
    datePublished: dateStr,
    headline: doc.title
  };
};

/**
 * Helper to generate review schema with aggregate for a list of Firestore reviews
 */
export const generateReviewsWithAggregate = (
  firestoreReviews: Array<{
    id: string;
    clientName?: string;
    authorName?: string;
    rating: number;
    comment?: string;
    createdAt: Date | { toDate: () => Date } | string;
    title?: string;
  }>,
  itemReviewed: ReviewedItem
): Record<string, unknown> | null => {
  if (!firestoreReviews || firestoreReviews.length === 0) return null;

  const reviewItems = firestoreReviews.map(firestoreToReviewItem);
  const totalRating = reviewItems.reduce((sum, r) => sum + r.rating.ratingValue, 0);
  const averageRating = totalRating / reviewItems.length;

  return {
    '@context': 'https://schema.org',
    '@type': itemReviewed.type,
    name: itemReviewed.name,
    url: itemReviewed.url,
    description: itemReviewed.description,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: averageRating.toFixed(1),
      ratingCount: reviewItems.length,
      reviewCount: reviewItems.length,
      bestRating: 5,
      worstRating: 1
    },
    review: reviewItems.slice(0, 10).map(r => ({ // Limit to 10 reviews for schema
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author.name },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating.ratingValue,
        bestRating: 5,
        worstRating: 1
      },
      reviewBody: r.reviewBody,
      datePublished: r.datePublished,
      ...(r.headline && { headline: r.headline })
    }))
  };
};
