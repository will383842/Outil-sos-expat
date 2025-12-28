// Schema.org JSON-LD components
export { default as BreadcrumbSchema, generateBreadcrumbs } from './BreadcrumbSchema';
export type { BreadcrumbItem } from './BreadcrumbSchema';

export { default as ProfessionalServiceSchema, generateProviderSchema } from './ProfessionalServiceSchema';
export type { ServiceProvider } from './ProfessionalServiceSchema';

// Re-export SEOHead from layout for convenience
export { default as SEOHead } from '../layout/SEOHead';

// Types pour faciliter l'import
export type { RouteMetadata } from '../../config/routes';