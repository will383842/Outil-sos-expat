/**
 * ArticleSchema Component
 *
 * Generates JSON-LD structured data for Article schema.
 * Used for help center articles, blog posts, and informational content.
 *
 * @see https://schema.org/Article
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface ArticleSchemaProps {
  /** Article title/headline */
  title: string;
  /** Article description/summary */
  description: string;
  /** Author name or organization */
  author?: string;
  /** Publication date in ISO 8601 format */
  datePublished: string;
  /** Last modification date in ISO 8601 format */
  dateModified?: string;
  /** Featured image URL */
  image?: string;
  /** Canonical URL of the article */
  url: string;
  /** Article section/category */
  articleSection?: string;
  /** Keywords/tags */
  keywords?: string[];
  /** Word count (optional) */
  wordCount?: number;
}

/**
 * Generate Article schema object
 */
export function generateArticleSchema(props: ArticleSchemaProps): object {
  const {
    title,
    description,
    author = 'SOS Expat',
    datePublished,
    dateModified,
    image,
    url,
    articleSection,
    keywords,
    wordCount,
  } = props;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    author: {
      '@type': 'Organization',
      name: author,
      url: 'https://sos-expat.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SOS Expat',
      url: 'https://sos-expat.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sos-expat.com/sos-logo.webp',
        width: 512,
        height: 512,
      },
    },
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };

  if (image) {
    schema.image = {
      '@type': 'ImageObject',
      url: image,
    };
  }

  if (articleSection) {
    schema.articleSection = articleSection;
  }

  if (keywords && keywords.length > 0) {
    schema.keywords = keywords.join(', ');
  }

  if (wordCount) {
    schema.wordCount = wordCount;
  }

  return schema;
}

/**
 * ArticleSchema component for help center articles and blog posts
 */
const ArticleSchema: React.FC<ArticleSchemaProps> = (props) => {
  const schema = generateArticleSchema(props);

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

export default ArticleSchema;
