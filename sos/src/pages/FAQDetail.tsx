import React, { useEffect, useState, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useLocaleNavigate } from '../multilingual-system';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/layout/Layout';
import SEOHead from '../components/layout/SEOHead';
import { BreadcrumbSchema, generateBreadcrumbs, FAQPageSchema } from '../components/seo';
import { useApp } from '../contexts/AppContext';
import { getLocaleString, parseLocaleFromPath, getTranslatedRouteSlug } from '../multilingual-system';
import { ChevronRight, Home, HelpCircle } from 'lucide-react';
import { FAQ_CATEGORIES, getTranslatedValue } from '../services/faq';

interface FAQ {
  id: string;
  question: Record<string, string>;
  answer: Record<string, string>;
  category: string;
  slug: Record<string, string>;
  order: number;
  isActive: boolean;
  isFooter: boolean;
  tags: string[];
  views?: number;
}

const FAQDetail: React.FC = () => {
  const intl = useIntl();
  const params = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const [faq, setFaq] = useState<FAQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedFAQs, setRelatedFAQs] = useState<FAQ[]>([]);
  const [show404, setShow404] = useState(false); // Delay 404 display to allow ref to be set
  const loadedSlugRef = useRef<string | null>(null); // Track which slug we've loaded
  const faqDataRef = useRef<FAQ | null>(null); // Track FAQ data in ref for immediate access
  

  // Extract slug from params and decode it (handles Unicode characters)
  let slug = params.slug || '';
  try {
    slug = decodeURIComponent(slug);
  } catch (e) {
    // If decoding fails, use as-is (might already be decoded)
  }
  
  // Extract locale from pathname (e.g., /fr-FR/faq/slug or /en-US/faq/slug)
  const { locale: localeFromPath, lang } = parseLocaleFromPath(location.pathname);

  // Determine language from URL path or context
  const currentLang = lang || language || 'fr';
  const langCode = currentLang.split('-')[0]; // Extract 'fr' from 'fr-FR'

  // Current locale preserves the country from URL (e.g., "fr-ar", "en-de")
  const currentLocale = localeFromPath || getLocaleString(language as any);
  
  // CRITICAL: Watch for ref changes and sync to state
  // This ensures that when ref is set, state is updated to trigger a re-render
  useEffect(() => {
    if (faqDataRef.current && loadedSlugRef.current === slug && !faq) {
      setFaq(faqDataRef.current);
      setError(null);
      setLoading(false);
      setShow404(false); // Cancel 404 if ref has data
    }
  }, [slug, faq]); // Re-run when slug changes or when faq is null
  
  // Delay 404 display to give ref time to be set (setTimeout approach)
  useEffect(() => {
    if (!loading && !faq && !faqDataRef.current) {
      // Only show 404 after a delay to allow ref to be set
      const timer = setTimeout(() => {
        // Double-check ref before showing 404
        if (!faqDataRef.current && !faq) {
          setShow404(true);
        } else {
          setShow404(false);
        }
      }, 10); // 10ms delay to allow ref to be set
      
      return () => clearTimeout(timer);
    } else {
      setShow404(false); // Cancel 404 if we have data
    }
  }, [loading, faq]);

  // Signal to Puppeteer that FAQ detail is loaded
  useEffect(() => {
    if (faq && !loading) {
      document.documentElement.setAttribute('data-article-loaded', 'true');
    }
    if (show404) {
      document.documentElement.setAttribute('data-page-not-found', 'true');
    }
    return () => {
      document.documentElement.removeAttribute('data-article-loaded');
      document.documentElement.removeAttribute('data-page-not-found');
    };
  }, [faq, loading, show404]);

  useEffect(() => {
    const loadFAQ = async () => {
      // Declare variables outside try block for use in finally
      let faqWasSet = false;
      let snapshot: any = { docs: [], empty: true };
      let foundFAQ: any = null;
      
      // Check if we've already loaded this exact slug - prevent unnecessary re-loads
      if (loadedSlugRef.current === slug && faq) {
        return;
      }
      
      try {
        setLoading(true);
        setError(null);

        if (!slug) {
          setError('Invalid FAQ slug');
          setLoading(false);
          return;
        }

        if (!db) {
          setError('Database not initialized');
          setLoading(false);
          return;
        }

        // Query FAQ by slug in current language
        const faqsRef = collection(db, 'app_faq');
        
        // Clean the slug first
        const cleanedSlugForIdCheck = slug.trim();
        
        // Check if slug looks like a Firestore document ID (alphanumeric, typically 20 chars)
        // Firestore IDs are usually 20 characters long and alphanumeric
        const looksLikeDocId = /^[a-zA-Z0-9]{20,}$/.test(cleanedSlugForIdCheck);
        
        // First, try to get document directly by ID if it looks like one
        if (looksLikeDocId) {
          try {
            const docRef = doc(db, 'app_faq', cleanedSlugForIdCheck);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              // Only use if active
              if (data.isActive !== false) {
                const faqData = { id: docSnap.id, ...data } as FAQ;
                faqDataRef.current = faqData; // Set ref first (synchronous)
                setFaq(faqData); // Then set state (asynchronous)
                loadedSlugRef.current = slug;
                faqWasSet = true;
                
                // Increment view count
                try {
                  await updateDoc(docRef, {
                    views: increment(1)
                  });
                } catch (err) {
                  // Error incrementing views - non-critical
                }
                
                // Load related FAQs
                if (faqData.category) {
                  const relatedQuery = query(
                    faqsRef,
                    where('category', '==', faqData.category),
                    where('isActive', '==', true)
                  );
                  const relatedSnapshot = await getDocs(relatedQuery);
                  const related = relatedSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as FAQ))
                    .filter(f => f.id !== faqData.id)
                    .slice(0, 5);
                  setRelatedFAQs(related);
                }
                setLoading(false);
                return;
              }
            }
          } catch (err) {
            // Error fetching by document ID - continue to slug search
          }
        }
        
        // Clean the slug - remove any extra whitespace (define early for use in fallback)
        const cleanedSlug = slug.trim();
        
        // Always query all active FAQs and search manually for better reliability
        // This handles cases where Firestore queries might fail due to indexing or slug structure
        snapshot = { docs: [], empty: true };
        foundFAQ = null;
        
        try {
          // Query all active FAQs
          const allFAQsQuery = query(
            faqsRef,
            where('isActive', '==', true)
          );
          const allSnapshot = await getDocs(allFAQsQuery);
          
          // Helper function to normalize a slug for comparison
          // For Latin scripts: lowercase and normalize accents
          // For non-Latin scripts: keep as-is
          const normalizeSlugForComparison = (slugText: string, isLatin: boolean): string => {
            if (!slugText) return '';
            let normalized = String(slugText).trim();
            
            if (isLatin) {
              // For Latin scripts: normalize accents (NFD) and lowercase
              normalized = normalized
                .normalize('NFD') // Decompose accented characters (ó -> o + ́)
                .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                .toLowerCase();
            }
            // For non-Latin scripts, keep as-is (no normalization)
            
            return normalized;
          };
          
          // Check if it's a Latin script (includes accented characters like ó, é, ñ, etc.)
          // Latin scripts include: a-z, A-Z, accented Latin characters, numbers, and common punctuation
          const isLatinScript = /^[\u0000-\u024F\u1E00-\u1EFF\s\-.,!?'":;()0-9]+$/.test(cleanedSlug) && 
                                 !/[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u4E00-\u9FFF\u0C80-\u0DFF]/.test(cleanedSlug);
          
          // Normalize slug for comparison
          const normalizedSlug = normalizeSlugForComparison(cleanedSlug, isLatinScript);
          
          const matchingFAQ = allSnapshot.docs.find(doc => {
            const data = doc.data();
            const slugData = data.slug || {};
            
            // Strategy 1: Exact match in current language (character-by-character)
            const directSlug = slugData[langCode];
            if (directSlug) {
              const directSlugStr = String(directSlug).trim();
              
              // Try exact match first (CRITICAL for all scripts)
              if (cleanedSlug === directSlugStr) {
                return true;
              }
              
              // For Latin scripts, also try normalized comparison (handles accents)
              if (isLatinScript) {
                const normalizedDirect = normalizeSlugForComparison(directSlugStr, true);
                if (normalizedSlug === normalizedDirect) {
                  return true;
                }
              }
            }
            
            // Strategy 2: Check all languages - exact match first
            for (const [key, value] of Object.entries(slugData)) {
              if (!value) continue;
              const slugValue = String(value).trim();
              
              // Try exact match first (most reliable)
              if (cleanedSlug === slugValue) {
                return true;
              }
              
              // For Latin scripts, also try normalized comparison (handles accents)
              if (isLatinScript) {
                const normalizedValue = normalizeSlugForComparison(slugValue, true);
                if (normalizedSlug === normalizedValue) {
                  return true;
                }
              }
            }
            
            // Strategy 3: Check common fallback languages (fr, en)
            const frSlug = slugData['fr'];
            const enSlug = slugData['en'];
            if (frSlug) {
              const frSlugStr = String(frSlug).trim();
              if (cleanedSlug === frSlugStr) {
                return true;
              }
              if (isLatinScript) {
                const normalizedFr = normalizeSlugForComparison(frSlugStr, true);
                if (normalizedSlug === normalizedFr) {
                  return true;
                }
              }
            }
            if (enSlug) {
              const enSlugStr = String(enSlug).trim();
              if (cleanedSlug === enSlugStr) {
                return true;
              }
              if (isLatinScript) {
                const normalizedEn = normalizeSlugForComparison(enSlugStr, true);
                if (normalizedSlug === normalizedEn) {
                  return true;
                }
              }
            }
            
            // Strategy 4: Check if document ID matches (for backward compatibility)
            if (doc.id === slug || doc.id === cleanedSlug) {
              return true;
            }
            
            return false;
          });
          
          if (matchingFAQ) {
            foundFAQ = matchingFAQ;
            snapshot = { docs: [matchingFAQ], empty: false };
          }
        } catch (err) {
          // Error querying FAQs - continue to fallback
        }

        // If we found the FAQ directly, use it instead of checking snapshot
        if (foundFAQ) {
          try {
            const faqData = { id: foundFAQ.id, ...foundFAQ.data() } as FAQ;
            faqDataRef.current = faqData; // Set ref first (synchronous)
            setFaq(faqData); // Then set state (asynchronous)
            loadedSlugRef.current = slug;
            
            // Increment view count
            try {
              await updateDoc(doc(db, 'app_faq', faqData.id), {
                views: increment(1)
              });
            } catch (err) {
              // Error incrementing views - non-critical
            }
            
            // Load related FAQs
            if (faqData.category) {
              try {
                const relatedQuery = query(
                  faqsRef,
                  where('category', '==', faqData.category),
                  where('isActive', '==', true)
                );
                const relatedSnapshot = await getDocs(relatedQuery);
                const related = relatedSnapshot.docs
                  .map(doc => ({ id: doc.id, ...doc.data() } as FAQ))
                  .filter(f => f.id !== faqData.id)
                  .slice(0, 5);
                setRelatedFAQs(related);
                } catch (err) {
                  // Error loading related FAQs - non-critical
                }
            }
            
            // CRITICAL: Set ref FIRST for immediate access (synchronous)
            faqDataRef.current = faqData;
            loadedSlugRef.current = slug;
            faqWasSet = true;
            
            // Then set state (asynchronous, but ref is already set)
            // IMPORTANT: Set all state updates together to trigger a single re-render
            setFaq(faqData);
            setError(null);
            setLoading(false);
            
            return; // Exit early since we've set the FAQ
          } catch (err) {
            // Error processing foundFAQ - try to use snapshot instead
          }
        }
        
        if (snapshot.empty) {
          // Last resort: Try to find by document ID if slug looks like an ID
          const looksLikeDocId = /^[a-zA-Z0-9]{20,}$/.test(cleanedSlug);
          if (looksLikeDocId) {
            try {
              const docRef = doc(db, 'app_faq', cleanedSlug);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists() && docSnap.data().isActive !== false) {
                const faqData = { id: docSnap.id, ...docSnap.data() } as FAQ;
                faqDataRef.current = faqData; // Set ref first (synchronous)
                setFaq(faqData); // Then set state (asynchronous)
                loadedSlugRef.current = slug;
                
                // Increment view count
                try {
                  await updateDoc(docRef, {
                    views: increment(1)
                  });
                } catch (err) {
                  // Error incrementing views - non-critical
                }
                
                // Load related FAQs
                if (faqData.category) {
                  const relatedQuery = query(
                    faqsRef,
                    where('category', '==', faqData.category),
                    // where('isActive', '==', true),
                    // orderBy('order', 'asc')
                  );
                  const relatedSnapshot = await getDocs(relatedQuery);
                  const related = relatedSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as FAQ))
                    .filter(f => f.id !== faqData.id)
                    .slice(0, 5);
                  setRelatedFAQs(related);
                }
                
                setLoading(false);
                return;
              }
            } catch (err) {
              // Error fetching by document ID as last resort
            }
          }
          
          setError('FAQ not found');
          setLoading(false);
          return;
        }

        // If we reach here and snapshot is not empty, process it
        if (!snapshot.empty && snapshot.docs && snapshot.docs.length > 0) {
          const faqDoc = snapshot.docs[0];
          const faqData = { id: faqDoc.id, ...faqDoc.data() } as FAQ;
          faqDataRef.current = faqData; // Set ref first (synchronous)
          loadedSlugRef.current = slug;
          setFaq(faqData); // Then set state (asynchronous)
          setError(null); // Clear any previous errors

          // Increment view count
          try {
            await updateDoc(doc(db, 'app_faq', faqDoc.id), {
              views: increment(1)
            });
          } catch (err) {
            // Error incrementing views - non-critical, continue
          }

          // Load related FAQs (same category) - wrapped in try-catch to not break main flow
          if (faqData.category) {
            try {
              const relatedQuery = query(
                faqsRef,
                where('category', '==', faqData.category),
                where('isActive', '==', true)
              );
              const relatedSnapshot = await getDocs(relatedQuery);
              const related = relatedSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as FAQ))
                .filter(f => f.id !== faqData.id)
                .slice(0, 5);
              setRelatedFAQs(related);
            } catch (err) {
              // Error loading related FAQs - non-critical
            }
          }
          
          // CRITICAL: Set ref FIRST for immediate access (synchronous)
          faqDataRef.current = faqData;
          loadedSlugRef.current = slug;
          faqWasSet = true;
          
          // Then set state (asynchronous, but ref is already set)
          setFaq(faqData);
          setError(null);
          setLoading(false);
          
          return; // Exit after successfully setting FAQ
        }
      } catch (err) {
        // Only set error if FAQ hasn't been set
        if (!faqWasSet) {
          setError('Failed to load FAQ');
        }
      } finally {
        // Only set loading to false if we haven't already returned
        if (!faqWasSet) {
          setLoading(false);
        }
      }
    };

    if (slug && db) {
      loadFAQ();
    } else if (!slug) {
      setError('No FAQ slug provided');
      setLoading(false);
    } else if (!db) {
      setError('Database not initialized');
      setLoading(false);
    }
  }, [slug, langCode]); // Removed faq from dependencies to prevent re-runs when FAQ state changes

  // Handle language change from header - redirect to translated slug
  // This ensures SEO-friendly URLs when user changes language while viewing a FAQ
  // Extract country from current URL to preserve it when changing language
  const { country: currentCountry } = parseLocaleFromPath(location.pathname);

  useEffect(() => {
    const currentFaq = faqDataRef.current || faq;
    if (!currentFaq || !language) return;

    // Get the new language code from context (strip region, e.g., "fr-FR" -> "fr")
    const newLangCode = language.split('-')[0];

    // If URL language matches context language, no need to redirect
    if (newLangCode === langCode) return;

    // Get the slug for the new language
    const newSlug = currentFaq.slug[newLangCode] || currentFaq.slug['fr'] || currentFaq.slug['en'] || currentFaq.id;

    // Build new URL preserving the current country
    // e.g., if user is on /fr-ar/faq/... and changes to English, go to /en-ar/faq/...
    const countryCode = currentCountry || getLocaleString(language as any).split('-')[1] || 'fr';
    const newLocale = `${newLangCode}-${countryCode}`;
    const newUrl = `/${newLocale}/faq/${newSlug}`;

    // Navigate to the new URL (replace to avoid back button issues)
    navigate(newUrl, { replace: true });
  }, [language, langCode, faq, navigate, currentCountry]);

  // Redirect cross-language slug to correct slug for current language
  // e.g., /fr-fr/faq/wie-funktioniert-die-plattform → /fr-fr/faq/comment-fonctionne-la-plateforme
  useEffect(() => {
    const currentFaq = faqDataRef.current || faq;
    if (!currentFaq || !slug || loading) return;
    const correctSlug = currentFaq.slug?.[langCode] || currentFaq.slug?.['fr'] || currentFaq.slug?.['en'];
    if (correctSlug && correctSlug !== slug) {
      const faqRouteSlug = getTranslatedRouteSlug('faq', langCode as any);
      navigate(`/${currentLocale}/${faqRouteSlug}/${correctSlug}`, { replace: true });
    }
  }, [faq, slug, langCode, currentLocale, loading, navigate]);

  // CRITICAL: Check ref FIRST before any other render decisions
  // Ref is set synchronously, so it's the most reliable source of truth
  const hasFaqInRef = !!faqDataRef.current && loadedSlugRef.current === slug;
  const effectiveFaq = faqDataRef.current || faq;
  
  // If ref has data, skip loading and 404 - go straight to content
  // This is CRITICAL: ref is set synchronously, so we can use it immediately
  if (hasFaqInRef) {
    // If state hasn't updated yet, update it from ref (this will trigger a re-render)
    // But for THIS render, we'll use ref data
    if (!faq || loading) {
      // Use requestAnimationFrame to update state after current render completes
      requestAnimationFrame(() => {
        if (faqDataRef.current) {
          setFaq(faqDataRef.current);
          setError(null);
          setLoading(false);
        }
      });
    }
    // Continue to render with ref data (will be handled below - skip to content rendering)
    // Don't return here - let it fall through to content rendering
  } else if (loading) {
    // Only show loading if ref doesn't have data
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </Layout>
    );
  } else if (!loading && (error || (!effectiveFaq && show404))) {
    // No ref data and no state data - show 404 (only after delay)
    return (
      <Layout>
        <SEOHead
          title={`${intl.formatMessage({ id: 'faq.detail.notFound.title', defaultMessage: 'FAQ Not Found' })} | SOS Expat`}
          description={intl.formatMessage({ id: 'faq.detail.notFound.description', defaultMessage: 'The requested FAQ could not be found.' })}
        />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{intl.formatMessage({ id: 'faq.detail.notFound.title', defaultMessage: 'FAQ Not Found' })}</h1>
            <p className="text-gray-600 mb-6">{intl.formatMessage({ id: 'faq.detail.notFound.description', defaultMessage: 'The requested FAQ could not be found.' })}</p>
            <div className="flex gap-4 justify-center">
              <Link
                to={`/${currentLocale}/faq`}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
              >
                <Home className="w-5 h-5" />
                {intl.formatMessage({ id: 'faq.detail.notFound.backToFaq', defaultMessage: 'Back to FAQ' })}
              </Link>
              <Link
                to={`/${currentLocale}`}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                {intl.formatMessage({ id: 'faq.detail.notFound.goHome', defaultMessage: 'Go Home' })}
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Use effective FAQ (state or ref) - this ensures we have FAQ data even if state hasn't updated
  const displayFaq = effectiveFaq || faq;
  
  if (!displayFaq) {
    return null; // Should not happen due to checks above, but safety net
  }
  
  const question = displayFaq.question?.[langCode] || displayFaq.question?.['fr'] || displayFaq.question?.['en'] || 'Untitled FAQ';
  const answer = displayFaq.answer?.[langCode] || displayFaq.answer?.['fr'] || displayFaq.answer?.['en'] || 'No answer available';

  // Strip HTML for plain-text uses (JSON-LD, meta description, TL;DR)
  const plainAnswer = answer.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // First sentence for TL;DR / featured snippet (snippet 0)
  const firstSentenceRaw = plainAnswer.split(/(?<=[.!?])\s+/)[0] || plainAnswer.substring(0, 200);
  const firstSentence = firstSentenceRaw.length > 280 ? firstSentenceRaw.substring(0, 277) + '…' : firstSentenceRaw;

  // Build canonical URL with locale prefix
  const CANONICAL_LOCALES: Record<string, string> = {
    fr: 'fr-fr', en: 'en-us', es: 'es-es', de: 'de-de', ru: 'ru-ru',
    pt: 'pt-pt', ch: 'zh-cn', hi: 'hi-in', ar: 'ar-sa',
  };
  const LANG_DEFAULT_COUNTRY: Record<string, string> = {
    fr: 'fr', en: 'us', es: 'es', de: 'de', ru: 'ru', pt: 'pt', ch: 'cn', hi: 'in', ar: 'sa',
  };
  const HREFLANG_CODES: Record<string, string> = {
    fr: 'fr', en: 'en', es: 'es', de: 'de', ru: 'ru', pt: 'pt', ch: 'zh-Hans', hi: 'hi', ar: 'ar',
  };
  const defaultLocale = CANONICAL_LOCALES[langCode] || 'fr-fr';
  const currentSlug = displayFaq.slug?.[langCode] || displayFaq.slug?.['fr'] || displayFaq.slug?.['en'] || displayFaq.id;
  const faqRouteSlug = getTranslatedRouteSlug('faq' as any, langCode as any) || 'faq';
  const canonicalUrl = `https://sos-expat.com/${defaultLocale}/${faqRouteSlug}/${currentSlug}`;

  // Meta description: truncate at last "." before 160 chars for clean sentences
  const metaDescription = plainAnswer.length <= 160
    ? plainAnswer
    : (plainAnswer.substring(0, 160).replace(/\.[^.]*$/, '') || plainAnswer.substring(0, 157)) + '…';

  // Detect untranslated FAQ: if langCode has no own content and falls back to FR/EN → noindex
  const hasOwnTranslation = !!(displayFaq.question?.[langCode] && displayFaq.answer?.[langCode]);
  // noindex for non-canonical locale variants (fr-ma, fr-be…) — only canonical per language is indexed
  const isNonCanonicalLocale = currentLocale.toLowerCase() !== defaultLocale.toLowerCase();
  const noIndex = (!hasOwnTranslation && langCode !== 'fr') || isNonCanonicalLocale;

  // Per-article hreflang using translated slugs (global hreflang in App.tsx doesn't know translated slugs)
  // Only include languages that have their own translated content AND slug — no fallback to avoid misleading Google
  const ALL_LANGS = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'] as const;
  const faqHreflang = ALL_LANGS
    .filter(lang => displayFaq.slug?.[lang] && displayFaq.question?.[lang] && displayFaq.answer?.[lang])
    .map(lang => {
      const country = LANG_DEFAULT_COUNTRY[lang];
      const artSlug = displayFaq.slug?.[lang];
      const langFaqSlug = getTranslatedRouteSlug('faq' as any, lang as any) || 'faq';
      return {
        lang: HREFLANG_CODES[lang],
        url: `https://sos-expat.com/${lang === 'ch' ? 'zh' : lang}-${country}/${langFaqSlug}/${artSlug}`,
      };
    });

  return (
    <Layout>
      {/* Per-article hreflang + noindex + QAPage + Speakable + Article JSON-LD */}
      <Helmet>
        {faqHreflang.map(alt => (
          <link key={alt.lang} rel="alternate" hrefLang={alt.lang} href={alt.url} />
        ))}
        <link rel="alternate" hrefLang="x-default" href={`https://sos-expat.com/fr-fr/faq/${displayFaq.slug?.['fr'] || displayFaq.id}`} />
        {/* robots géré exclusivement par SEOHead (noindex={noIndex}) — pas de doublon ici */}

        {/* QAPage JSON-LD — plus précis que FAQPage pour une page détail unique */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "QAPage",
          "url": canonicalUrl,
          "inLanguage": langCode === 'ch' ? 'zh' : langCode,
          "mainEntity": {
            "@type": "Question",
            "name": question,
            "text": question,
            "answerCount": 1,
            "dateCreated": (displayFaq as any).createdAt?.toDate?.()?.toISOString?.() || "2024-01-01T00:00:00.000Z",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": plainAnswer,
              "url": canonicalUrl,
              "upvoteCount": (displayFaq.views || 0),
              "author": {
                "@type": "Organization",
                "name": "SOS Expat & Travelers",
                "url": "https://sos-expat.com"
              }
            }
          }
        })}</script>

        {/* Article JSON-LD — signaux E-E-A-T pour Google + LLM crawlers */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": question,
          "description": metaDescription,
          "articleBody": plainAnswer,
          "inLanguage": langCode === 'ch' ? 'zh' : langCode,
          "url": canonicalUrl,
          "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl },
          "datePublished": (displayFaq as any).createdAt?.toDate?.()?.toISOString?.() || "2024-01-01T00:00:00.000Z",
          "dateModified": (displayFaq as any).updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          "author": {
            "@type": "Organization",
            "name": "SOS Expat & Travelers",
            "url": "https://sos-expat.com",
            "sameAs": ["https://sos-expat.com"]
          },
          "publisher": {
            "@type": "Organization",
            "name": "SOS Expat",
            "url": "https://sos-expat.com",
            "logo": { "@type": "ImageObject", "url": "https://sos-expat.com/logo.png", "width": 250, "height": 60 }
          },
          "keywords": [question, displayFaq.category, ...(displayFaq.tags || [])].join(', '),
          "about": { "@type": "Thing", "name": "Expatriation, droit international, assistance aux expatriés" },
          "isPartOf": { "@type": "WebSite", "@id": "https://sos-expat.com", "name": "SOS Expat" }
        })}</script>

        {/* Speakable JSON-LD — Google Assistant + AEO (LLMs) */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": canonicalUrl,
          "url": canonicalUrl,
          "name": question,
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["h1", ".faq-tldr", ".faq-answer"]
          }
        })}</script>
      </Helmet>
      <SEOHead
        title={`${question} | SOS Expat`}
        description={metaDescription}
        keywords={[question.split(' ').slice(0, 6).join(' '), displayFaq.category, 'FAQ', 'SOS Expat', ...(displayFaq.tags || [])].join(', ')}
        canonicalUrl={canonicalUrl}
        noindex={noIndex}
        ogType="article"
        contentType="FAQPage"
        author="SOS Expat & Travelers"
        expertise="Legal Services, Expat Assistance, International Law"
        trustworthiness="verified_lawyers, gdpr_compliant, 197_countries"
        contentQuality={hasOwnTranslation ? 'high' : 'medium'}
        lastReviewed={new Date().toISOString().split('T')[0]}
        readingTime={`${Math.max(1, Math.ceil(answer.split(/\s+/).length / 200))} min`}
        aiSummary={plainAnswer.substring(0, 300)}
        locale={currentLang === 'fr' ? 'fr_FR' :
                currentLang === 'en' ? 'en_US' :
                currentLang === 'es' ? 'es_ES' :
                currentLang === 'ru' ? 'ru_RU' :
                currentLang === 'de' ? 'de_DE' :
                currentLang === 'hi' ? 'hi_IN' :
                currentLang === 'pt' ? 'pt_PT' :
                currentLang === 'ch' ? 'zh_CN' :
                currentLang === 'ar' ? 'ar_SA' : 'fr_FR'}
      />

      {/* BreadcrumbList JSON-LD */}
      <BreadcrumbSchema
        items={generateBreadcrumbs.faqDetail(
          intl.formatMessage({ id: 'breadcrumb.home', defaultMessage: 'Home' }),
          intl.formatMessage({ id: 'breadcrumb.faq', defaultMessage: 'FAQ' }),
          question,
          displayFaq.slug?.[langCode] || displayFaq.slug?.['fr'],
          `/${currentLocale}/${faqRouteSlug}`
        )}
      />

      <article className="max-w-4xl mx-auto px-4 py-8 sm:py-12 min-h-[70vh]" >
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-600 flex items-center gap-2" aria-label="Breadcrumb">
          <Link to={`/${currentLocale}`} className="hover:text-red-600 transition-colors">
            {intl.formatMessage({ id: 'breadcrumb.home', defaultMessage: 'Home' })}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link to={`/${currentLocale}/${faqRouteSlug}`} className="hover:text-red-600 transition-colors">
            {intl.formatMessage({ id: 'breadcrumb.faq', defaultMessage: 'FAQ' })}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium truncate max-w-xs sm:max-w-md">
            {question}
          </span>
        </nav>

        {/* FAQ Content */}
        <header className="mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-start flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium capitalize">
              {(() => {
                const cat = FAQ_CATEGORIES.find(c => c.id === displayFaq.category);
                return cat ? getTranslatedValue(cat.name, langCode, cat.name.en) : displayFaq.category;
              })()}
            </span>
            {displayFaq.views !== undefined && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                {intl.formatMessage({ id: 'faq.detail.views', defaultMessage: '{count} views' }, { count: displayFaq.views })}
              </span>
            )}
            {/* E-E-A-T signal: reading time visible dans le contenu */}
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm">
              {Math.max(1, Math.ceil(answer.split(/\s+/).length / 200))} min
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 leading-tight"
            itemProp="headline"
          >
            {question}
          </h1>
          {/* E-E-A-T : auteur + date + organisation visible = signal fort pour Google */}
          <p className="text-sm text-gray-500 mt-2 flex flex-wrap gap-x-3 gap-y-1 items-center">
            <span itemProp="author" itemScope itemType="https://schema.org/Organization">
              <span itemProp="name" className="font-medium text-gray-700">SOS Expat & Travelers</span>
            </span>
            <span aria-hidden="true">·</span>
            <time
              dateTime={(displayFaq as any).updatedAt?.toDate?.()?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0]}
              itemProp="dateModified"
            >
              {((displayFaq as any).updatedAt?.toDate?.() || new Date()).toLocaleDateString(
                langCode === 'fr' ? 'fr-FR' : langCode === 'ar' ? 'ar-SA' : langCode === 'de' ? 'de-DE' : langCode === 'es' ? 'es-ES' : langCode === 'pt' ? 'pt-PT' : 'en-US',
                { year: 'numeric', month: 'long', day: 'numeric' }
              )}
            </time>
            <span aria-hidden="true">·</span>
            <span className="text-blue-600">
              {Math.max(1, Math.ceil(plainAnswer.split(/\s+/).length / 200))} min
            </span>
          </p>
        </header>

        {/* TL;DR / Snippet 0 — première phrase mise en avant pour featured snippet Google */}
        {firstSentence && (
          <div className="faq-tldr bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg" role="note" aria-label="Résumé">
            <p className="font-semibold text-red-800 text-sm uppercase mb-1 tracking-wide">
              {intl.formatMessage({ id: 'faq.detail.summary', defaultMessage: 'En résumé' })}
            </p>
            <p className="text-red-900 font-medium leading-snug">{firstSentence}</p>
          </div>
        )}

        {/* Réponse complète — HTML rendu nativement (ul, li, strong, a) */}
        <div
          className="faq-answer prose prose-lg max-w-none mb-10 prose-ul:pl-6 prose-li:my-1 prose-strong:font-semibold prose-a:text-red-600 prose-a:underline"
          itemProp="text"
          dangerouslySetInnerHTML={{ __html: answer }}
        />

        {/* Tags — maillage sémantique interne */}
        {displayFaq.tags && displayFaq.tags.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {intl.formatMessage({ id: 'faq.detail.tags', defaultMessage: 'Sujets liés' })}
            </h2>
            <div className="flex flex-wrap gap-2" aria-label="Tags">
              {displayFaq.tags.map(tag => (
                <Link
                  key={tag}
                  to={`/${currentLocale}/${faqRouteSlug}?tag=${encodeURIComponent(tag)}`}
                  className="px-3 py-1 bg-gray-100 hover:bg-red-50 hover:text-red-700 text-gray-700 rounded-full text-sm border border-gray-200 transition-colors"
                  rel="tag"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA — conversion appel */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 sm:p-8 mb-12 text-white">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            {intl.formatMessage({ id: 'faq.detail.cta.title', defaultMessage: 'Besoin d\'aide immédiate ?' })}
          </h2>
          <p className="text-red-100 mb-4 text-sm sm:text-base">
            {intl.formatMessage({ id: 'faq.detail.cta.subtitle', defaultMessage: 'Un expert local vous rappelle en moins de 5 minutes. 197 pays, 24h/24, 7j/7.' })}
          </p>
          <Link
            to={`/${currentLocale}`}
            className="inline-flex items-center gap-2 bg-white text-red-700 font-semibold px-6 py-3 rounded-lg hover:bg-red-50 transition-colors"
          >
            {intl.formatMessage({ id: 'faq.detail.cta.button', defaultMessage: 'Trouver un expert' })}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Questions liées — maillage interne */}
        {relatedFAQs.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {intl.formatMessage({ id: 'faq.detail.relatedQuestions', defaultMessage: 'Questions fréquentes liées' })}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {intl.formatMessage({ id: 'faq.detail.relatedSubtitle', defaultMessage: 'Ces questions peuvent aussi vous intéresser' })}
            </p>
            <ul className="space-y-3" aria-label="FAQ liées">
              {relatedFAQs.map(relatedFaq => {
                const relatedQuestion = relatedFaq.question?.[langCode] || relatedFaq.question?.['fr'] || relatedFaq.question?.['en'];
                const relatedSlug = relatedFaq.slug?.[langCode] || relatedFaq.slug?.['fr'] || relatedFaq.slug?.['en'] || relatedFaq.id;
                const relatedAnswerPlain = (relatedFaq.answer?.[langCode] || relatedFaq.answer?.['fr'] || relatedFaq.answer?.['en'] || '')
                  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                return (
                  <li key={relatedFaq.id}>
                    <Link
                      to={`/${currentLocale}/${faqRouteSlug}/${relatedSlug}`}
                      className="block p-4 bg-gray-50 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors border border-gray-200 group"
                    >
                      <h3 className="font-semibold text-gray-900 group-hover:text-red-700 mb-1 flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                        {relatedQuestion}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2 ml-6">{relatedAnswerPlain.substring(0, 120)}…</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Retour */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            to={`/${currentLocale}/${faqRouteSlug}`}
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            {intl.formatMessage({ id: 'faq.detail.backToAll', defaultMessage: 'Toutes les FAQ' })}
          </Link>
        </div>

        {/* FAQPage schema — composant dédié, rendu dans <head> via Helmet */}
        <FAQPageSchema
          faqs={[{ question, answer }]}
          inLanguage={langCode === 'ch' ? 'zh' : langCode}
        />
      </article>
    </Layout>
  );
};

export default FAQDetail;

