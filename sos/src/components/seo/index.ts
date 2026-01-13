// Schema.org JSON-LD components
export { default as BreadcrumbSchema, generateBreadcrumbs } from './BreadcrumbSchema';
export type { BreadcrumbItem } from './BreadcrumbSchema';

export { default as ProfessionalServiceSchema, generateProviderSchema } from './ProfessionalServiceSchema';
export type { ServiceProvider } from './ProfessionalServiceSchema';

// Organization schema with AggregateRating for Google Stars
export { default as OrganizationSchema, generateOrganizationSchema } from './OrganizationSchema';
export type { OrganizationSchemaProps, OrganizationRating, SocialProfile, ContactPoint } from './OrganizationSchema';

// Review schema for individual reviews
export {
  default as ReviewSchema,
  generateReviewSchema,
  firestoreToReviewItem,
  generateReviewsWithAggregate
} from './ReviewSchema';
export type { ReviewItem, ReviewAuthor, ReviewRating, ReviewedItem } from './ReviewSchema';

// LocalBusiness schema with AggregateRating for Google Stars
export { default as LocalBusinessSchema, generateLocalBusinessSchema } from './LocalBusinessSchema';
export type { LocalBusinessSchemaProps, LocalBusinessRating, LocalBusinessReview } from './LocalBusinessSchema';

// Article schema for help center and blog posts
export { default as ArticleSchema, generateArticleSchema } from './ArticleSchema';
export type { ArticleSchemaProps } from './ArticleSchema';

// Service schema for pricing page
export { default as ServiceSchema, generateServiceSchema } from './ServiceSchema';
export type { ServiceSchemaProps, ServiceOffer } from './ServiceSchema';

// FAQPage schema for FAQ pages
export { default as FAQPageSchema, generateFAQPageSchema } from './FAQPageSchema';
export type { FAQPageSchemaProps, FAQItem } from './FAQPageSchema';

// Re-export SEOHead from layout for convenience
export { default as SEOHead } from '../layout/SEOHead';

// Types pour faciliter l'import
export type { RouteMetadata } from '../../config/routes';