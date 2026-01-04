import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useLocaleNavigate } from '../multilingual-system';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, increment, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import Layout from '../components/layout/Layout';
import SEOHead from '../components/layout/SEOHead';
import { BreadcrumbSchema, generateBreadcrumbs } from '../components/seo';
import { useApp } from '../contexts/AppContext';
import { getLocaleString, parseLocaleFromPath } from '../multilingual-system';
import { ChevronRight, Home, HelpCircle } from 'lucide-react';

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
        const faqsRef = collection(db, 'faqs');
        
        // Clean the slug first
        const cleanedSlugForIdCheck = slug.trim();
        
        // Check if slug looks like a Firestore document ID (alphanumeric, typically 20 chars)
        // Firestore IDs are usually 20 characters long and alphanumeric
        const looksLikeDocId = /^[a-zA-Z0-9]{20,}$/.test(cleanedSlugForIdCheck);
        
        // First, try to get document directly by ID if it looks like one
        if (looksLikeDocId) {
          try {
            const docRef = doc(db, 'faqs', cleanedSlugForIdCheck);
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
              await updateDoc(doc(db, 'faqs', faqData.id), {
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
              const docRef = doc(db, 'faqs', cleanedSlug);
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
            await updateDoc(doc(db, 'faqs', faqDoc.id), {
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
          title="FAQ Not Found | SOS Expat"
          description="The requested FAQ could not be found."
        />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">FAQ Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The requested FAQ could not be found.'}</p>
            <div className="flex gap-4 justify-center">
              <Link
                to={`/${currentLocale}/faq`}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
              >
                <Home className="w-5 h-5" />
                Back to FAQ
              </Link>
              <Link
                to={`/${currentLocale}`}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Home
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
  
  const question = displayFaq.question[langCode] || displayFaq.question['fr'] || displayFaq.question['en'] || 'Untitled FAQ';
  const answer = displayFaq.answer[langCode] || displayFaq.answer['fr'] || displayFaq.answer['en'] || 'No answer available';

  // Format answer with line breaks
  const formattedAnswer = answer.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line}
      {i < answer.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));

  // Build canonical URL with locale prefix
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sos-expat.com';
  const currentSlug = displayFaq.slug[langCode] || displayFaq.slug['fr'] || displayFaq.slug['en'] || displayFaq.id;
  const canonicalUrl = `${baseUrl}/${currentLocale}/faq/${currentSlug}`;

  // Generate alternate language URLs for hreflang tags
  // Map language codes to their locale strings for URLs (using getLocaleString format: lowercase with hyphen)
  // For hreflang, we use ISO format (e.g., "en-US"), but for URLs we use lowercase (e.g., "en-us")
  const localeMap: Record<string, { urlLocale: string; hreflangLocale: string }> = {
    'fr': { urlLocale: 'fr-fr', hreflangLocale: 'fr-FR' },
    'en': { urlLocale: 'en-us', hreflangLocale: 'en-US' },
    'es': { urlLocale: 'es-es', hreflangLocale: 'es-ES' },
    'ru': { urlLocale: 'ru-ru', hreflangLocale: 'ru-RU' },
    'de': { urlLocale: 'de-de', hreflangLocale: 'de-DE' },
    'hi': { urlLocale: 'hi-in', hreflangLocale: 'hi-IN' },
    'pt': { urlLocale: 'pt-pt', hreflangLocale: 'pt-PT' },
    'ch': { urlLocale: 'zh-cn', hreflangLocale: 'zh-Hans' },
    'ar': { urlLocale: 'ar-sa', hreflangLocale: 'ar-SA' }
  };

  const supportedLanguages = ['fr', 'en', 'es', 'ru', 'de', 'hi', 'pt', 'ch', 'ar'];

  const alternateLanguages = supportedLanguages
    .filter(langCode => {
      // Only include languages where the FAQ has content
      const hasQuestion = displayFaq.question[langCode] && displayFaq.question[langCode].trim().length > 0;
      const hasAnswer = displayFaq.answer[langCode] && displayFaq.answer[langCode].trim().length > 0;
      return hasQuestion && hasAnswer;
    })
    .map(langCode => {
      const slug = displayFaq.slug[langCode] || displayFaq.slug['fr'] || displayFaq.slug['en'] || displayFaq.id;
      const localeInfo = localeMap[langCode] || { urlLocale: `${langCode}-${langCode}`, hreflangLocale: `${langCode}-${langCode.toUpperCase()}` };
      return {
        lang: localeInfo.hreflangLocale, // Use ISO format for hreflang
        url: `${baseUrl}/${localeInfo.urlLocale}/faq/${slug}` // Use lowercase for URL
      };
    });

  return (
    <Layout>
      <SEOHead
        title={`${question} - FAQ | SOS Expat`}
        description={answer.substring(0, 160).replace(/\n/g, ' ')}
        keywords={[displayFaq.category, 'FAQ', 'help', ...(displayFaq.tags || [])].join(', ')}
        canonicalUrl={canonicalUrl}
        alternateLanguages={alternateLanguages}
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
          'Accueil',
          'FAQ',
          question,
          displayFaq.slug[langCode] || displayFaq.slug['fr']
        )}
      />

      <article className="max-w-4xl mx-auto px-4 py-8 sm:py-12 min-h-[70vh]" >
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-600 flex items-center gap-2" aria-label="Breadcrumb">
          <Link to={`/${currentLocale}`} className="hover:text-red-600 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link to={`/${currentLocale}/faq`} className="hover:text-red-600 transition-colors">
            FAQ
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium truncate max-w-xs sm:max-w-md">
            {question}
          </span>
        </nav>

        {/* FAQ Content */}
        <header className="mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-start gap-3 mb-4">
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium capitalize">
              {displayFaq.category}
            </span>
            {displayFaq.views !== undefined && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                {displayFaq.views} views
              </span>
            )}
          </div>
          <h1 
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight"
            itemProp="headline"
          >
            {question}
          </h1>
        </header>

        <div 
          className="prose prose-lg max-w-none mb-12"
          itemProp="text"
        >
          <div className="text-gray-700 leading-relaxed whitespace-pre-line">
            {formattedAnswer}
          </div>
        </div>

        {/* Related FAQs */}
        {relatedFAQs.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Questions</h2>
            <div className="space-y-4">
              {relatedFAQs.map(relatedFaq => {
                const relatedQuestion = relatedFaq.question[langCode] || relatedFaq.question['fr'] || relatedFaq.question['en'];
                const relatedSlug = relatedFaq.slug[langCode] || relatedFaq.slug['fr'] || relatedFaq.slug['en'];
                return (
                  <Link
                    key={relatedFaq.id}
                    to={`/${currentLocale}/faq/${relatedSlug}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">{relatedQuestion}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {relatedFaq.answer[langCode] || relatedFaq.answer['fr'] || relatedFaq.answer['en']}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Back to FAQ Link */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            to={`/${currentLocale}/faq`}
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to all FAQs
          </Link>
        </div>

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              'mainEntity': {
                '@type': 'Question',
                'name': question,
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text': answer
                }
              }
            })
          }}
        />
      </article>
    </Layout>
  );
};

export default FAQDetail;

