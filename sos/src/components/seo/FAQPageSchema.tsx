/**
 * FAQPageSchema Component
 *
 * Generates JSON-LD structured data for FAQPage schema.
 * Used for FAQ pages to get rich results in Google Search.
 *
 * @see https://schema.org/FAQPage
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface FAQItem {
  /** The question */
  question: string;
  /** The answer (can include HTML) */
  answer: string;
}

export interface FAQPageSchemaProps {
  /** List of FAQ items */
  faqs: FAQItem[];
  /** Page title (optional, for SEO) */
  pageTitle?: string;
  /** Page URL (optional) */
  pageUrl?: string;
}

/**
 * Generate FAQPage schema object
 */
export function generateFAQPageSchema(props: FAQPageSchemaProps): object {
  const { faqs, pageUrl } = props;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  if (pageUrl) {
    schema.url = pageUrl;
  }

  return schema;
}

/**
 * FAQPageSchema component for FAQ pages
 *
 * @example
 * ```tsx
 * <FAQPageSchema
 *   faqs={[
 *     { question: "How does SOS Expat work?", answer: "Connect with a lawyer in under 5 minutes..." },
 *     { question: "What countries do you cover?", answer: "We cover 197 countries worldwide..." }
 *   ]}
 * />
 * ```
 */
const FAQPageSchema: React.FC<FAQPageSchemaProps> = (props) => {
  // Don't render FAQPage schema if there are no FAQs (mainEntity would be empty)
  if (!props.faqs || props.faqs.length === 0) {
    return null;
  }

  const schema = generateFAQPageSchema(props);

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

export default FAQPageSchema;
