/**
 * useSEOOptimized — Hook to read AI-generated SEO data for a provider profile
 *
 * Reads from Firestore collection: seo_optimized/{providerId}
 * Returns locale-specific SEO data with fallback chain: locale → 'en' → null
 *
 * Usage:
 *   const { data: seoData, isLoading } = useSEOOptimized(providerId, 'fr');
 *   if (seoData) {
 *     // Use seoData.metaTitle, seoData.faqs, etc.
 *   }
 */

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/** Single FAQ item */
interface SEOFaqItem {
  question: string;
  answer: string;
}

/** SEO data for a single locale */
export interface SEOLocaleData {
  metaTitle: string;
  metaDescription: string;
  faqs: SEOFaqItem[];
  ogTitle: string;
  ogDescription: string;
  aiSummary: string;
  aiKeyFacts: string[];
  profileDescription: string;
  breadcrumbLabel: string;
  structuredData: {
    knowsAbout: string[];
    serviceDescription: string;
  };
}

/** Full document shape */
interface SEOOptimizedDoc {
  locales: Record<string, SEOLocaleData>;
  originalDescription?: {
    corrected: string | null;
    detectedLanguage: string;
    qualityScore: number;
    correctionsMade: string[];
  };
  metadata?: {
    generatedAt: any;
    modelUsed: string;
    version: number;
  };
}

interface UseSEOOptimizedResult {
  data: SEOLocaleData | null;
  originalDescription: SEOOptimizedDoc['originalDescription'] | null;
  isLoading: boolean;
}

// Simple in-memory cache to avoid redundant reads
const cache = new Map<string, SEOOptimizedDoc | null>();

export function useSEOOptimized(
  providerId: string | null,
  locale: string
): UseSEOOptimizedResult {
  const [docData, setDocData] = useState<SEOOptimizedDoc | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!providerId) return;

    // Check cache first
    const cacheKey = providerId;
    if (cache.has(cacheKey)) {
      setDocData(cache.get(cacheKey) || null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getDoc(doc(db, 'seo_optimized', providerId))
      .then((snap) => {
        if (cancelled) return;
        const data = snap.exists() ? (snap.data() as SEOOptimizedDoc) : null;
        cache.set(cacheKey, data);
        setDocData(data);
      })
      .catch(() => {
        if (!cancelled) {
          cache.set(cacheKey, null);
          setDocData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [providerId]);

  // Resolve locale with fallback: requested locale → 'en' → null
  const localeKey = locale === 'ch' ? 'zh' : locale;
  const localeData = docData?.locales?.[localeKey]
    || docData?.locales?.['en']
    || null;

  return {
    data: localeData,
    originalDescription: docData?.originalDescription || null,
    isLoading,
  };
}
