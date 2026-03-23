// src/pages/RegisterLawyer.tsx
// Thin shell: SEO (JSON-LD, meta, OG) + orchestration → LawyerRegisterForm wizard

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import BreadcrumbSchema from '../components/seo/BreadcrumbSchema';
import { useLocaleNavigate } from '../multilingual-system';
import { Scale, Shield } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useIntl, FormattedMessage } from 'react-intl';
import { useLocalePath } from '../multilingual-system';
import { getLocaleString, getTranslatedRouteSlug } from '../multilingual-system/core/routing/localeRoutes';
import useAntiBot from '@/hooks/useAntiBot';
import { trackMetaCompleteRegistration, trackMetaStartRegistration } from '../utils/metaPixel';
import { trackAdRegistration } from '../services/adAttributionService';
import { getStoredReferralTracking } from '../hooks/useAffiliate';
import { getUnifiedReferralCode } from '../utils/referralStorage';

import LawyerRegisterForm from '../components/registration/lawyer/LawyerRegisterForm';
import { getTheme } from '../components/registration/shared/theme';
import { WhatsAppGroupScreen } from '../whatsapp-groups';

const theme = getTheme('lawyer');

const RegisterLawyer: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const getLocalePath = useLocalePath();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const prefillEmail = searchParams.get('email') || '';
  const referralCode = searchParams.get('ref') || getUnifiedReferralCode() || '';
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
    trackMetaStartRegistration({ content_name: 'lawyer_registration' });
  }, []);

  // SEO: canonical URL + structured data (rendered via Helmet in JSX)
  const canonicalUrl = useMemo(
    () => `https://sos-expat.com/${getLocaleString(lang)}/${getTranslatedRouteSlug('register-lawyer', lang)}`,
    [lang]
  );

  const structuredData = useMemo(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': canonicalUrl,
        url: canonicalUrl,
        name: intl.formatMessage({ id: 'registerLawyer.seo.title' }),
        description: intl.formatMessage({ id: 'registerLawyer.seo.description' }),
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
            { '@type': 'ListItem', position: 1, name: intl.formatMessage({ id: 'registerLawyer.seo.breadcrumb.home' }), item: 'https://sos-expat.com' },
            { '@type': 'ListItem', position: 2, name: intl.formatMessage({ id: 'registerLawyer.seo.breadcrumb.register' }), item: canonicalUrl },
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
          contactType: intl.formatMessage({ id: 'registerLawyer.seo.contactType' }),
          availableLanguage: ['fr', 'en', 'es', 'de', 'ru', 'hi', 'pt', 'zh', 'ar'],
        },
      },
      {
        '@type': 'Service',
        serviceType: intl.formatMessage({ id: 'registerLawyer.seo.serviceType' }),
        provider: { '@type': 'Organization', '@id': 'https://sos-expat.com/#organization' },
        areaServed: { '@type': 'Country', name: intl.formatMessage({ id: 'registerLawyer.seo.areaServed' }) },
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: canonicalUrl,
          servicePhone: intl.formatMessage({ id: 'registerLawyer.seo.servicePhone' }),
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
        role="lawyer"
        language={registrationData.language}
        country={registrationData.country}
        onContinue={handleWhatsAppContinue}
      />
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>{intl.formatMessage({ id: 'registerLawyer.seo.title' })}</title>
        <meta name="description" content={intl.formatMessage({ id: 'registerLawyer.seo.description' })} />
        <meta name="keywords" content={intl.formatMessage({ id: 'registerLawyer.seo.keywords' })} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={intl.formatMessage({ id: 'registerLawyer.seo.ogTitle' })} />
        <meta property="og:description" content={intl.formatMessage({ id: 'registerLawyer.seo.ogDescription' })} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content="https://sos-expat.com/images/og-register-lawyer.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={intl.formatMessage({ id: 'registerLawyer.seo.ogImageAlt' })} />
        <meta property="og:site_name" content="SOS-Expat" />
        <meta property="og:locale" content={lang === 'fr' ? 'fr_FR' : lang === 'en' ? 'en_US' : `${lang}_${lang.toUpperCase()}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={intl.formatMessage({ id: 'registerLawyer.seo.twitterTitle' })} />
        <meta name="twitter:description" content={intl.formatMessage({ id: 'registerLawyer.seo.twitterDescription' })} />
        <meta name="twitter:image" content="https://sos-expat.com/images/twitter-register-lawyer.jpg" />
        <meta name="twitter:site" content="@SOSExpat" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      <BreadcrumbSchema items={[
        { name: intl.formatMessage({ id: 'breadcrumb.home', defaultMessage: 'Home' }), url: '/' },
        { name: intl.formatMessage({ id: 'breadcrumb.register', defaultMessage: 'Register' }), url: '/register' },
        { name: intl.formatMessage({ id: 'breadcrumb.lawyerRegistration', defaultMessage: 'Lawyer Registration' }) }
      ]} />
      <div className={`min-h-screen bg-gradient-to-b ${theme.bgGradient}`}>
        {/* Header */}
        <header className="pt-8 pb-6 px-4 text-center border-b border-white/10">
          <div className="max-w-2xl mx-auto">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${theme.accentGradient} mb-5 shadow-xl`}
              role="img"
              aria-label={intl.formatMessage({ id: 'registerLawyer.ui.logoAlt' })}
            >
              <Scale className="w-8 h-8 text-white" aria-hidden="true" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
              <FormattedMessage id="registerLawyer.ui.heroTitle" />
            </h1>

            <p className="text-base text-gray-400 mb-5 font-medium">
              <FormattedMessage id="registerLawyer.ui.heroSubtitle" />
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-400 mb-4">
              <Shield className="w-4 h-4" aria-hidden="true" />
              <span>Formulaire sécurisé par reCAPTCHA</span>
            </div>

            <div className="text-sm text-gray-400">
              <FormattedMessage id="registerLawyer.ui.already" />{' '}
              <Link
                to={`/login?redirect=${encodeURIComponent(redirect)}`}
                className={`font-bold ${theme.linkColor} ${theme.linkHover} underline`}
                aria-label={intl.formatMessage({ id: 'registerLawyer.ui.loginAriaLabel' })}
              >
                <FormattedMessage id="registerLawyer.ui.login" />
              </Link>
            </div>
          </div>
        </header>

        {/* Form */}
        <main className="max-w-2xl mx-auto px-4 py-8">
          <LawyerRegisterForm
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
          <nav aria-label={intl.formatMessage({ id: 'registerLawyer.footer.navigation' })}>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 font-medium">
              <Link to={getLocalePath("/politique-confidentialite")} className={`${theme.linkHover} transition-colors`}>
                <FormattedMessage id="registerLawyer.footer.privacy" />
              </Link>
              <Link to={getLocalePath("/cgu-avocats")} className={`${theme.linkHover} transition-colors`}>
                <FormattedMessage id="registerLawyer.footer.terms" />
              </Link>
              <Link to={getLocalePath("/contact")} className={`${theme.linkHover} transition-colors`}>
                <FormattedMessage id="registerLawyer.footer.contact" />
              </Link>
            </div>
          </nav>
        </footer>
      </div>
    </Layout>
  );
};

export default RegisterLawyer;
