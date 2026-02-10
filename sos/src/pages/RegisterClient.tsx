// RegisterClient.tsx - Thin shell: SEO, auth orchestration, booking flow redirect
// Form UI delegated to ClientRegisterForm

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useLocaleNavigate } from '../multilingual-system';
import { useIntl } from 'react-intl';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import type { Provider } from '../types/provider';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { trackMetaCompleteRegistration, trackMetaStartRegistration } from '../utils/metaPixel';
import { trackAdRegistration } from '../services/adAttributionService';
import { getStoredReferralTracking, clearStoredReferral } from '../hooks/useAffiliate';
import { getStoredReferralCode as getStoredRefCode } from '../utils/referralStorage';

import ClientRegisterForm from '../components/registration/client/ClientRegisterForm';

// =============================================================================
// SECURITY: Redirect whitelist
// =============================================================================
const isAllowedRedirect = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith('/')) return !url.startsWith('//');
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
};

// =============================================================================
// CONSTANTS
// =============================================================================
const GOOGLE_TIMEOUT = 5000;

const FAQ_KEYS = [
  { q: 'registerClient.faq.q1', a: 'registerClient.faq.a1' },
  { q: 'registerClient.faq.q2', a: 'registerClient.faq.a2' },
  { q: 'registerClient.faq.q3', a: 'registerClient.faq.a3' },
  { q: 'registerClient.faq.q4', a: 'registerClient.faq.a4' },
  { q: 'registerClient.faq.q5', a: 'registerClient.faq.a5' },
  { q: 'registerClient.faq.q6', a: 'registerClient.faq.a6' },
  { q: 'registerClient.faq.q7', a: 'registerClient.faq.a7' },
  { q: 'registerClient.faq.q8', a: 'registerClient.faq.a8' },
] as const;

// =============================================================================
// HELPERS
// =============================================================================
function isProviderLike(v: unknown): v is Provider {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.name === 'string' && (o.type === 'lawyer' || o.type === 'expat');
}

type NavState = Readonly<{ selectedProvider?: Provider }>;

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const RegisterClient: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Redirect computation
  const redirectFromStorage = sessionStorage.getItem('loginRedirect');
  const redirectFromParams = searchParams.get('redirect');
  const rawRedirect = redirectFromStorage || redirectFromParams || '/dashboard';
  const redirect = isAllowedRedirect(rawRedirect) ? rawRedirect : '/dashboard';
  const prefillEmail = searchParams.get('email') || '';
  const referralCode = searchParams.get('ref') || getStoredRefCode('client') || '';

  const { register, loginWithGoogle, isLoading, error, user, isFullyReady } = useAuth();
  const { language } = useApp();
  const currentLang = (language || 'fr') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'hi' | 'pt' | 'ch' | 'ar';

  // Google auth state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const googleTimeoutRef = useRef<number | null>(null);

  // ===========================================================================
  // Meta Pixel: Track StartRegistration on mount
  // ===========================================================================
  useEffect(() => {
    trackMetaStartRegistration({ content_name: 'client_registration' });
  }, []);

  // ===========================================================================
  // SEO: Meta tags, JSON-LD, Canonical, Hreflang
  // ===========================================================================
  useEffect(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sos-expat.com';
    const currentUrl = `${baseUrl}${window.location.pathname}`;

    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    const setLink = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
      let el = document.querySelector(selector) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        if (hreflang) el.hreflang = hreflang;
        document.head.appendChild(el);
      }
      el.href = href;
    };

    document.title = intl.formatMessage({ id: 'registerClient.seo.title' });

    // Basic meta
    setMeta('name', 'description', intl.formatMessage({ id: 'registerClient.seo.description' }));
    setMeta('name', 'keywords', intl.formatMessage({ id: 'registerClient.seo.keywords' }));
    setMeta('name', 'robots', intl.formatMessage({ id: 'registerClient.seo.metaRobots' }));
    setMeta('name', 'author', intl.formatMessage({ id: 'registerClient.seo.author' }));
    setMeta('name', 'viewport', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    setMeta('name', 'language', currentLang);

    // Open Graph
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', intl.formatMessage({ id: 'registerClient.seo.siteName' }));
    setMeta('property', 'og:title', intl.formatMessage({ id: 'registerClient.seo.ogTitle' }));
    setMeta('property', 'og:description', intl.formatMessage({ id: 'registerClient.seo.ogDescription' }));
    setMeta('property', 'og:url', currentUrl);
    setMeta('property', 'og:image', `${baseUrl}${intl.formatMessage({ id: 'registerClient.seo.ogImagePath' }).replace('{lang}', currentLang)}`);
    setMeta('property', 'og:image:alt', intl.formatMessage({ id: 'registerClient.seo.imageAlt' }));
    setMeta('property', 'og:image:width', intl.formatMessage({ id: 'registerClient.seo.ogImageWidth' }));
    setMeta('property', 'og:image:height', intl.formatMessage({ id: 'registerClient.seo.ogImageHeight' }));
    setMeta('property', 'og:locale', intl.formatMessage({ id: `registerClient.seo.localeCode.${currentLang}` }));

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:site', intl.formatMessage({ id: 'registerClient.seo.twitterHandle' }));
    setMeta('name', 'twitter:creator', intl.formatMessage({ id: 'registerClient.seo.twitterHandle' }));
    setMeta('name', 'twitter:title', intl.formatMessage({ id: 'registerClient.seo.twitterTitle' }));
    setMeta('name', 'twitter:description', intl.formatMessage({ id: 'registerClient.seo.twitterDescription' }));
    setMeta('name', 'twitter:image', `${baseUrl}${intl.formatMessage({ id: 'registerClient.seo.twitterImagePath' }).replace('{lang}', currentLang)}`);
    setMeta('name', 'twitter:image:alt', intl.formatMessage({ id: 'registerClient.seo.twitterImageAlt' }));

    // Mobile app
    setMeta('name', 'apple-mobile-web-app-capable', 'yes');
    setMeta('name', 'apple-mobile-web-app-status-bar-style', intl.formatMessage({ id: 'registerClient.seo.appleStatusBar' }));
    setMeta('name', 'mobile-web-app-capable', 'yes');
    setMeta('name', 'theme-color', intl.formatMessage({ id: 'registerClient.seo.themeColor' }));

    // AI crawlers
    setMeta('name', 'googlebot', intl.formatMessage({ id: 'registerClient.seo.metaGooglebot' }));
    setMeta('name', 'bingbot', intl.formatMessage({ id: 'registerClient.seo.metaBingbot' }));

    // Geo
    setMeta('name', 'geo.region', intl.formatMessage({ id: 'registerClient.seo.geoRegion' }));
    setMeta('name', 'geo.placename', intl.formatMessage({ id: 'registerClient.seo.geoPlacename' }));

    // Canonical
    setLink('canonical', currentUrl);

    // Hreflang
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    const langs = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ar', 'hi', 'zh'];
    langs.forEach(lang => setLink('alternate', `${baseUrl}/${lang}/register`, lang));
    setLink('alternate', `${baseUrl}/en/register`, 'x-default');

    // JSON-LD
    const availableLanguages = intl.formatMessage({ id: 'registerClient.seo.availableLanguages' }).split(', ');
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': intl.formatMessage({ id: 'registerClient.seo.schemaType.webpage' }),
          '@id': `${currentUrl}#webpage`,
          url: currentUrl,
          name: intl.formatMessage({ id: 'registerClient.seo.title' }),
          description: intl.formatMessage({ id: 'registerClient.seo.description' }),
          inLanguage: currentLang,
          isPartOf: {
            '@type': 'WebSite',
            '@id': `${baseUrl}/#website`,
            url: baseUrl,
            name: intl.formatMessage({ id: 'registerClient.seo.siteName' }),
            publisher: { '@id': `${baseUrl}/#organization` },
          },
          breadcrumb: {
            '@type': intl.formatMessage({ id: 'registerClient.seo.schemaType.breadcrumb' }),
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: intl.formatMessage({ id: 'registerClient.seo.breadcrumb.home' }), item: baseUrl },
              { '@type': 'ListItem', position: 2, name: intl.formatMessage({ id: 'registerClient.seo.breadcrumb.register' }), item: currentUrl },
            ],
          },
        },
        {
          '@type': intl.formatMessage({ id: 'registerClient.seo.schemaType.organization' }),
          '@id': `${baseUrl}/#organization`,
          name: intl.formatMessage({ id: 'registerClient.seo.organizationName' }),
          url: baseUrl,
          logo: {
            '@type': 'ImageObject',
            url: `${baseUrl}${intl.formatMessage({ id: 'registerClient.seo.logoUrl' })}`,
            width: intl.formatMessage({ id: 'registerClient.seo.logoWidth' }),
            height: intl.formatMessage({ id: 'registerClient.seo.logoHeight' }),
          },
          sameAs: [
            intl.formatMessage({ id: 'registerClient.seo.socialMedia.facebook' }),
            intl.formatMessage({ id: 'registerClient.seo.socialMedia.twitter' }),
            intl.formatMessage({ id: 'registerClient.seo.socialMedia.linkedin' }),
            intl.formatMessage({ id: 'registerClient.seo.socialMedia.instagram' }),
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: intl.formatMessage({ id: 'registerClient.seo.contactType' }),
            email: intl.formatMessage({ id: 'registerClient.seo.supportEmail' }),
            telephone: intl.formatMessage({ id: 'registerClient.seo.supportPhone' }),
            availableLanguage: availableLanguages,
          },
        },
        {
          '@type': intl.formatMessage({ id: 'registerClient.seo.schemaType.faqPage' }),
          '@id': `${currentUrl}#faq`,
          mainEntity: FAQ_KEYS.map(faq => ({
            '@type': intl.formatMessage({ id: 'registerClient.seo.schemaType.question' }),
            name: intl.formatMessage({ id: faq.q }),
            acceptedAnswer: {
              '@type': intl.formatMessage({ id: 'registerClient.seo.schemaType.answer' }),
              text: intl.formatMessage({ id: faq.a }),
            },
          })),
        },
        {
          '@type': intl.formatMessage({ id: 'registerClient.seo.schemaType.service' }),
          serviceType: intl.formatMessage({ id: 'registerClient.seo.serviceType' }),
          provider: {
            '@type': intl.formatMessage({ id: 'registerClient.seo.schemaType.organization' }),
            '@id': `${baseUrl}/#organization`,
          },
          areaServed: { '@type': 'Country', name: intl.formatMessage({ id: 'registerClient.seo.areaServed' }) },
          availableChannel: {
            '@type': 'ServiceChannel',
            serviceUrl: currentUrl,
            availableLanguage: { '@type': 'Language', name: currentLang },
          },
        },
      ],
    };

    let scriptTag = document.querySelector('script[type="application/ld+json"]#register-client-jsonld') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script') as HTMLScriptElement;
      scriptTag.type = 'application/ld+json';
      scriptTag.id = 'register-client-jsonld';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

    return () => {
      document.querySelector('#register-client-jsonld')?.remove();
    };
  }, [intl, currentLang]);

  // ===========================================================================
  // EFFECTS
  // ===========================================================================

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (googleTimeoutRef.current) window.clearTimeout(googleTimeoutRef.current);
    };
  }, []);

  // Preserve provider from booking flow
  useEffect(() => {
    const rawState: unknown = location.state;
    const state = (rawState ?? null) as NavState | null;
    const sp = state?.selectedProvider;
    if (isProviderLike(sp)) {
      try {
        sessionStorage.setItem('selectedProvider', JSON.stringify(sp));
      } catch { /* ignore */ }
    }
  }, [location.state]);

  // Redirect if already logged in
  useEffect(() => {
    if (isFullyReady && user) {
      sessionStorage.removeItem('loginRedirect');
      navigate(redirect, { replace: true });
    }
  }, [isFullyReady, user, navigate, redirect]);

  // ===========================================================================
  // Google signup handler (kept in shell for auth context access)
  // ===========================================================================
  const handleGoogleSignup = useCallback(async () => {
    try {
      setGoogleLoading(true);
      setGoogleError('');
      await setPersistence(auth, browserLocalPersistence);

      if (referralCode) {
        sessionStorage.setItem('pendingReferralCode', referralCode.toUpperCase().trim());
      }

      googleTimeoutRef.current = window.setTimeout(() => {
        setGoogleLoading(false);
      }, GOOGLE_TIMEOUT);

      await loginWithGoogle();

      if (googleTimeoutRef.current) {
        window.clearTimeout(googleTimeoutRef.current);
        googleTimeoutRef.current = null;
      }
      setGoogleLoading(false);

      // Save referral code for Google user
      const storedCode = sessionStorage.getItem('pendingReferralCode') || (referralCode ? referralCode.toUpperCase().trim() : '');
      if (storedCode && auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, { pendingReferralCode: storedCode });
          sessionStorage.removeItem('pendingReferralCode');
        } catch { /* warn silently */ }
      }

      trackMetaCompleteRegistration({ content_name: 'client_registration_google', status: 'completed' });
      trackAdRegistration({ contentName: 'client_registration_google' });
      clearStoredReferral();
    } catch (err) {
      if (googleTimeoutRef.current) {
        window.clearTimeout(googleTimeoutRef.current);
        googleTimeoutRef.current = null;
      }
      setGoogleLoading(false);

      const errorMessage = err instanceof Error ? err.message : '';
      const errorCode = (err as { code?: string })?.code || '';
      const isCancelled =
        errorMessage.includes('popup-closed') ||
        errorMessage.includes('cancelled') ||
        errorCode === 'auth/popup-closed-by-user' ||
        errorCode === 'auth/cancelled-popup-request';

      if (!isCancelled) {
        setGoogleError(intl.formatMessage({ id: 'registerClient.errors.googleFailed' }));
      }
    }
  }, [loginWithGoogle, intl, referralCode]);

  // ===========================================================================
  // Register handler (passed to form)
  // ===========================================================================
  const handleRegister = useCallback(async (userData: Record<string, unknown>, password: string) => {
    await setPersistence(auth, browserLocalPersistence);
    await register(userData as Parameters<typeof register>[0], password);
    clearStoredReferral();
  }, [register]);

  // ===========================================================================
  // RENDER: Loading
  // ===========================================================================
  const effectiveLoading = isLoading || googleLoading;
  if (effectiveLoading && !user && !error && !googleError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-gray-950 to-black px-4"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <LoadingSpinner size="large" color="blue" />
          <p className="mt-4 text-gray-400 font-medium">
            {intl.formatMessage({ id: 'registerClient.ui.loading' })}
          </p>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // RENDER: Main
  // ===========================================================================
  return (
    <Layout>
      <main
        className="min-h-screen bg-gradient-to-br from-blue-950 via-gray-950 to-black flex flex-col items-center justify-start px-4 py-8 sm:py-12"
        role="main"
        id="main-content"
        aria-label={intl.formatMessage({ id: 'registerClient.ui.aria_main' })}
      >
        <ClientRegisterForm
          onRegister={handleRegister}
          onGoogleSignup={handleGoogleSignup}
          isLoading={isLoading}
          googleLoading={googleLoading}
          language={currentLang}
          prefillEmail={prefillEmail}
          referralCode={referralCode}
          redirect={redirect}
          navigate={navigate}
          authError={error || googleError || undefined}
          trackMetaComplete={trackMetaCompleteRegistration}
          trackAdRegistration={trackAdRegistration}
          getStoredReferralTracking={getStoredReferralTracking}
        />
      </main>
    </Layout>
  );
};

export default React.memo(RegisterClient);
