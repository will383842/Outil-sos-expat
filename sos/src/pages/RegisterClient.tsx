// RegisterClient.tsx - Thin shell: SEO, auth orchestration, booking flow redirect
// Form UI delegated to ClientRegisterForm

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import SEOHead from '../components/layout/SEOHead';
import { useLocaleNavigate } from '../multilingual-system';
import { useIntl } from 'react-intl';
import { getLocaleString, getTranslatedRouteSlug } from '../multilingual-system/core/routing/localeRoutes';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { doc, updateDoc } from 'firebase/firestore';
import type { Provider } from '../types/provider';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { trackMetaCompleteRegistration, trackMetaStartRegistration, getMetaIdentifiers, setMetaPixelUserData } from '../utils/metaPixel';
import { trackAdRegistration } from '../services/adAttributionService';
import { trackGoogleAdsSignUp, setGoogleAdsUserData } from '../utils/googleAds';
import { generateEventIdForType } from '../utils/sharedEventId';
import { getStoredReferralTracking, clearStoredReferral } from '../hooks/useAffiliate';
import { getUnifiedReferralCode, clearUnifiedReferral } from '../utils/referralStorage';

import BreadcrumbSchema from '../components/seo/BreadcrumbSchema';
import ClientRegisterForm from '../components/registration/client/ClientRegisterForm';
import { WhatsAppGroupScreen } from '../whatsapp-groups';

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
  const referralCode = searchParams.get('ref') || getUnifiedReferralCode() || '';
  const partnerInviteToken = searchParams.get('partnerInviteToken') || '';

  const { register, loginWithGoogle, isLoading, error, user, isFullyReady } = useAuth();
  const { language } = useApp();
  const currentLang = (language || 'fr') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'hi' | 'pt' | 'ch' | 'ar';

  // Google auth state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const googleTimeoutRef = useRef<number | null>(null);

  // WhatsApp screen state
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [registrationData, setRegistrationData] = useState<{ language: string; country: string } | null>(null);

  // ===========================================================================
  // Meta Pixel: Track StartRegistration on mount
  // ===========================================================================
  useEffect(() => {
    trackMetaStartRegistration({ content_name: 'client_registration' });
  }, []);

  // ===========================================================================
  // SEO: Canonical URL + JSON-LD structured data (rendered via Helmet in JSX)
  // ===========================================================================
  const baseUrl = 'https://sos-expat.com';
  const canonicalUrl = `${baseUrl}/${getLocaleString(currentLang as any)}/${getTranslatedRouteSlug('register-client', currentLang as any)}`;

  const structuredData = useMemo(() => {
    const availableLanguages = intl.formatMessage({ id: 'registerClient.seo.availableLanguages' }).split(', ');
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': intl.formatMessage({ id: 'registerClient.seo.schemaType.webpage' }),
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
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
              { '@type': 'ListItem', position: 2, name: intl.formatMessage({ id: 'registerClient.seo.breadcrumb.register' }), item: canonicalUrl },
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
          '@type': intl.formatMessage({ id: 'registerClient.seo.schemaType.service' }),
          serviceType: intl.formatMessage({ id: 'registerClient.seo.serviceType' }),
          provider: {
            '@type': intl.formatMessage({ id: 'registerClient.seo.schemaType.organization' }),
            '@id': `${baseUrl}/#organization`,
          },
          areaServed: { '@type': 'Country', name: intl.formatMessage({ id: 'registerClient.seo.areaServed' }) },
          availableChannel: {
            '@type': 'ServiceChannel',
            serviceUrl: canonicalUrl,
            availableLanguage: { '@type': 'Language', name: currentLang },
          },
        },
      ],
    };
  }, [intl, currentLang, canonicalUrl]);

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

  // Redirect if already logged in (but NOT during active registration)
  // FIX: Track whether registration was initiated to prevent premature redirect
  // during createUserWithEmailAndPassword → onAuthStateChanged race condition
  const isRegisteringRef = React.useRef(false);
  useEffect(() => {
    if (isFullyReady && user && !isRegisteringRef.current && !showWhatsApp) {
      sessionStorage.removeItem('loginRedirect');
      navigate(redirect, { replace: true });
    }
  }, [isFullyReady, user, navigate, redirect, showWhatsApp]);

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

      const googleMetaEventId = generateEventIdForType('registration');
      trackMetaCompleteRegistration({ content_name: 'client_registration_google', status: 'completed', eventID: googleMetaEventId });
      trackAdRegistration({ contentName: 'client_registration_google' });
      if (auth.currentUser?.email) {
        setMetaPixelUserData({ email: auth.currentUser.email });
        // Google Ads: Enhanced Conversions + SignUp tracking
        await setGoogleAdsUserData({ email: auth.currentUser.email, firstName: auth.currentUser.displayName?.split(' ')[0] });
      }
      trackGoogleAdsSignUp({ method: 'google', content_name: 'client_registration_google' });
      clearStoredReferral();
      clearUnifiedReferral();
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
    isRegisteringRef.current = true;
    await setPersistence(auth, browserLocalPersistence);
    await register(userData as Parameters<typeof register>[0], password);
    clearStoredReferral();
    clearUnifiedReferral();
  }, [register]);

  // ===========================================================================
  // WhatsApp success handler
  // ===========================================================================
  const handleRegistrationSuccess = useCallback((data: { language: string; country: string }) => {
    setRegistrationData(data);
    setShowWhatsApp(true);
  }, []);

  const handleWhatsAppContinue = useCallback(() => {
    setShowWhatsApp(false);
    navigate(redirect, { replace: true });
  }, [navigate, redirect]);

  // ===========================================================================
  // RENDER: WhatsApp screen after registration
  // ===========================================================================
  if (showWhatsApp && user && registrationData) {
    return (
      <WhatsAppGroupScreen
        userId={user.id || user.uid || ''}
        role="client"
        language={registrationData.language}
        country={registrationData.country}
        onContinue={handleWhatsAppContinue}
      />
    );
  }

  // ===========================================================================
  // RENDER: Loading
  // ===========================================================================
  const effectiveLoading = isLoading || googleLoading;
  // FIX: Ne pas afficher le spinner pendant l'inscription (isRegistering) pour éviter de démonter le formulaire
  if (effectiveLoading && !user && !error && !googleError && !isRegisteringRef.current) {
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
      <SEOHead
        title={intl.formatMessage({ id: 'registerClient.seo.title' })}
        description={intl.formatMessage({ id: 'registerClient.seo.description' })}
        canonicalUrl={canonicalUrl}
        ogImage={`${baseUrl}${intl.formatMessage({ id: 'registerClient.seo.ogImagePath' }).replace('{lang}', currentLang)}`}
        ogType="website"
        twitterCard="summary_large_image"
        twitterSite={intl.formatMessage({ id: 'registerClient.seo.twitterHandle' })}
        twitterCreator={intl.formatMessage({ id: 'registerClient.seo.twitterHandle' })}
        keywords={intl.formatMessage({ id: 'registerClient.seo.keywords' })}
        author="Manon"
        locale={intl.formatMessage({ id: `registerClient.seo.localeCode.${currentLang}` })}
        siteName={intl.formatMessage({ id: 'registerClient.seo.siteName' })}
        structuredData={structuredData}
      />
      <BreadcrumbSchema items={[
        { name: intl.formatMessage({ id: 'breadcrumb.home', defaultMessage: 'Home' }), url: '/' },
        { name: intl.formatMessage({ id: 'breadcrumb.register', defaultMessage: 'Register' }), url: '/register' },
        { name: intl.formatMessage({ id: 'breadcrumb.registerClient', defaultMessage: 'Client Registration' }) }
      ]} />
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
          partnerInviteToken={partnerInviteToken}
          redirect={redirect}
          navigate={navigate}
          authError={error || googleError || undefined}
          trackMetaComplete={trackMetaCompleteRegistration}
          trackAdRegistration={trackAdRegistration}
          getStoredReferralTracking={getStoredReferralTracking}
          onSuccess={handleRegistrationSuccess}
        />
      </main>
    </Layout>
  );
};

export default React.memo(RegisterClient);
