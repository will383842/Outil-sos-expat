// src/pages/RegisterExpat.tsx
// Thin shell: SEO (JSON-LD, meta, OG) + orchestration → ExpatRegisterForm wizard

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEOHead from '../components/layout/SEOHead';
import { useLocaleNavigate } from '../multilingual-system';
import { getLocaleString, getTranslatedRouteSlug } from '../multilingual-system/core/routing/localeRoutes';
import { Heart, Shield } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useIntl, FormattedMessage } from 'react-intl';
import { useLocalePath } from '../multilingual-system';
import useAntiBot from '@/hooks/useAntiBot';
import { trackMetaCompleteRegistration, trackMetaStartRegistration } from '../utils/metaPixel';
import { trackAdRegistration } from '../services/adAttributionService';
import { getStoredReferralTracking } from '../hooks/useAffiliate';
import { getStoredReferralCode, getBestAvailableReferralCode } from '../utils/referralStorage';

import BreadcrumbSchema from '../components/seo/BreadcrumbSchema';
import ExpatRegisterForm from '../components/registration/expat/ExpatRegisterForm';
import { getTheme } from '../components/registration/shared/theme';
import { WhatsAppGroupScreen } from '../whatsapp-groups';

const theme = getTheme('expat');

const RegisterExpat: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const getLocalePath = useLocalePath();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const prefillEmail = searchParams.get('email') || '';
  // FIX: Also read window.location.search (replaceState from AffiliateRefSync + iOS Safari)
  const referralCode = searchParams.get('ref')
    || (() => { try { return new URLSearchParams(window.location.search).get('ref'); } catch { return null; } })()
    || getStoredReferralCode('client') || getBestAvailableReferralCode('client') || '';
  const { register, isLoading, user } = useAuth();
  const { language } = useApp();
  const lang = language as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'hi' | 'pt' | 'ch' | 'ar';

  const { honeypotValue, setHoneypotValue, validateHuman, stats } = useAntiBot();

  // WhatsApp screen state
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [registrationData, setRegistrationData] = useState<{ language: string; country: string } | null>(null);

  const handleRegistrationSuccess = useCallback((data: { language: string; country: string }) => {
    setRegistrationData(data);
    setShowWhatsApp(true);
  }, []);

  const handleWhatsAppContinue = useCallback(() => {
    setShowWhatsApp(false);
    navigate(redirect, { replace: true });
  }, [navigate, redirect]);

  // Meta Pixel: Track StartRegistration
  useEffect(() => {
    trackMetaStartRegistration({ content_name: 'expat_registration' });
  }, []);

  // SEO: canonical URL + JSON-LD structured data
  const canonicalUrl = useMemo(
    () => `https://sos-expat.com/${getLocaleString(lang)}/${getTranslatedRouteSlug('register-expat', lang)}`,
    [lang]
  );

  const structuredData = useMemo(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': canonicalUrl,
        url: canonicalUrl,
        name: intl.formatMessage({ id: 'registerExpat.seo.title' }),
        description: intl.formatMessage({ id: 'registerExpat.seo.description' }),
        inLanguage: lang,
        isPartOf: {
          '@type': 'WebSite',
          '@id': 'https://sos-expat.com/#website',
          url: 'https://sos-expat.com',
          name: 'SOS-Expat',
          publisher: { '@type': 'Organization', '@id': 'https://sos-expat.com/#organization' },
        },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: intl.formatMessage({ id: 'registerExpat.seo.breadcrumb.home' }), item: 'https://sos-expat.com' },
            { '@type': 'ListItem', position: 2, name: intl.formatMessage({ id: 'registerExpat.seo.breadcrumb.register' }), item: canonicalUrl },
          ],
        },
      },
      {
        '@type': 'Organization',
        '@id': 'https://sos-expat.com/#organization',
        name: 'SOS-Expat',
        url: 'https://sos-expat.com',
        logo: { '@type': 'ImageObject', url: 'https://sos-expat.com/logo.png', width: 512, height: 512 },
        sameAs: [
          'https://www.facebook.com/sosexpat',
          'https://twitter.com/sosexpat',
          'https://www.linkedin.com/company/sos-expat',
          'https://www.instagram.com/sosexpat',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: intl.formatMessage({ id: 'registerExpat.seo.contactType' }),
          availableLanguage: ['fr', 'en', 'es', 'de', 'ru', 'hi', 'pt', 'zh', 'ar'],
        },
      },
      {
        '@type': 'Service',
        serviceType: intl.formatMessage({ id: 'registerExpat.seo.serviceType' }),
        provider: { '@type': 'Organization', '@id': 'https://sos-expat.com/#organization' },
        areaServed: { '@type': 'Country', name: intl.formatMessage({ id: 'registerExpat.seo.areaServed' }) },
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: canonicalUrl,
          servicePhone: intl.formatMessage({ id: 'registerExpat.seo.servicePhone' }),
          availableLanguage: { '@type': 'Language', name: lang },
        },
      },
    ],
  }), [intl, lang, canonicalUrl]);

  // WhatsApp screen after registration
  if (showWhatsApp && user && registrationData) {
    return (
      <WhatsAppGroupScreen
        userId={user.id || (user as any).uid}
        role="expat"
        language={registrationData.language}
        country={registrationData.country}
        onContinue={handleWhatsAppContinue}
      />
    );
  }

  return (
    <Layout>
      <SEOHead
        title={intl.formatMessage({ id: 'registerExpat.seo.title' })}
        description={intl.formatMessage({ id: 'registerExpat.seo.description' })}
        canonicalUrl={canonicalUrl}
        ogImage="https://sos-expat.com/images/og-register-expat.jpg"
        ogType="website"
        twitterCard="summary_large_image"
        twitterSite="@SOSExpat"
        keywords={intl.formatMessage({ id: 'registerExpat.seo.keywords' })}
        author="Manon"
        locale={lang === 'fr' ? 'fr_FR' : lang === 'en' ? 'en_US' : `${lang}_${lang.toUpperCase()}`}
        siteName="SOS-Expat"
        structuredData={structuredData}
      />
      <BreadcrumbSchema items={[
        { name: intl.formatMessage({ id: 'breadcrumb.home', defaultMessage: 'Home' }), url: '/' },
        { name: intl.formatMessage({ id: 'breadcrumb.register', defaultMessage: 'Register' }), url: '/register' },
        { name: intl.formatMessage({ id: 'breadcrumb.registerExpat', defaultMessage: 'Expat Registration' }) }
      ]} />

      <div className={`min-h-screen bg-gradient-to-b ${theme.bgGradient}`}>
        {/* Header */}
        <header className="pt-8 pb-6 px-4 text-center border-b border-white/10">
          <div className="max-w-2xl mx-auto">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${theme.accentGradient} mb-5 shadow-xl`}
              role="img"
              aria-label={intl.formatMessage({ id: 'registerExpat.ui.logoAlt' })}
            >
              <Heart className="w-8 h-8 text-white" aria-hidden="true" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
              <FormattedMessage id="registerExpat.ui.heroTitle" />
            </h1>

            <p className="text-base text-gray-400 mb-5 font-medium">
              <FormattedMessage id="registerExpat.ui.heroSubtitle" />
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-400 mb-4">
              <Shield className="w-4 h-4" aria-hidden="true" />
              <span>Formulaire sécurisé par reCAPTCHA</span>
            </div>

            <div className="text-sm text-gray-400">
              <FormattedMessage id="registerExpat.ui.already" />{' '}
              <Link
                to={`/login?redirect=${encodeURIComponent(redirect)}`}
                className={`font-bold ${theme.linkColor} ${theme.linkHover} underline`}
                aria-label={intl.formatMessage({ id: 'registerExpat.ui.loginAriaLabel' })}
              >
                <FormattedMessage id="registerExpat.ui.login" />
              </Link>
            </div>
          </div>
        </header>

        {/* Form */}
        <main className="max-w-2xl mx-auto px-4 py-8">
          <ExpatRegisterForm
            onRegister={register}
            isLoading={isLoading}
            language={lang}
            prefillEmail={prefillEmail}
            referralCode={referralCode}
            redirect={redirect}
            navigate={navigate}
            validateHuman={validateHuman}
            honeypotValue={honeypotValue}
            setHoneypotValue={setHoneypotValue}
            stats={stats}
            trackMetaComplete={trackMetaCompleteRegistration}
            trackAdRegistration={trackAdRegistration}
            getStoredReferralTracking={getStoredReferralTracking}
            onSuccess={handleRegistrationSuccess}
          />

        </main>

        {/* Footer */}
        <footer className="text-center py-8 px-4 border-t border-white/10">
          <nav aria-label={intl.formatMessage({ id: 'registerExpat.footer.navigation' })}>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 font-medium">
              <Link to={getLocalePath("/politique-confidentialite")} className={`${theme.linkHover} transition-colors`}>
                <FormattedMessage id="registerExpat.footer.privacy" />
              </Link>
              <Link to={getLocalePath("/cgu-expatries")} className={`${theme.linkHover} transition-colors`}>
                <FormattedMessage id="registerExpat.footer.terms" />
              </Link>
              <Link to={getLocalePath("/contact")} className={`${theme.linkHover} transition-colors`}>
                <FormattedMessage id="registerExpat.footer.contact" />
              </Link>
            </div>
          </nav>
        </footer>
      </div>
    </Layout>
  );
};

export default RegisterExpat;
