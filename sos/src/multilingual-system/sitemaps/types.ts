/**
 * Shared types for sitemap generation
 */

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: Array<{ hreflang: string; href: string }>;
}

export interface StaticRoute {
  path: string;
  translated?: string;
  priority: number;
  changefreq: SitemapUrl['changefreq'];
}

export interface Language {
  code: string;
  country: string;
}

export interface SitemapGenerationResult {
  filename: string;
  content: string;
  size: number; // in bytes (gzipped)
  path: string; // relative path in dist/sitemaps/
}

export interface GenerationSummary {
  level1Count: number;
  level2Count: number;
  totalFiles: number;
  totalSize: number;
  duration: number;
  errors?: string[];
}


