// src/pages/RegisterExpat.tsx
// Thin shell: SEO (JSON-LD, meta, OG) + orchestration → ExpatRegisterForm wizard

import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLocaleNavigate } from '../multilingual-system';
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

import ExpatRegisterForm from '../components/registration/expat/ExpatRegisterForm';
import FAQSection from '../components/registration/shared/FAQSection';
import { getTheme } from '../components/registration/shared/theme';

const theme = getTheme('expat');

const RegisterExpat: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const getLocalePath = useLocalePath();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const prefillEmail = searchParams.get('email') || '';
  const referralCode = searchParams.get('ref') || '';
  const { register, isLoading } = useAuth();
  const { language } = useApp();
  const lang = language as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'hi' | 'pt' | 'ch' | 'ar';

  const { honeypotValue, setHoneypotValue, validateHuman, stats } = useAntiBot();

  // Meta Pixel: Track StartRegistration
  useEffect(() => {
    trackMetaStartRegistration({ content_name: 'expat_registration' });
  }, []);

  // SEO: meta tags, OG, JSON-LD
  useEffect(() => {
    const baseUrl = window.location.origin;
    const currentUrl = `${baseUrl}${window.location.pathname}`;

    document.title = intl.formatMessage({ id: 'registerExpat.seo.title' });

    const ensureMeta = (name: string, content: string, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        if (prop) el.setAttribute('property', name);
        else el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    const ensureLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = href;
    };

    ensureMeta('description', intl.formatMessage({ id: 'registerExpat.seo.description' }));
    ensureMeta('keywords', intl.formatMessage({ id: 'registerExpat.seo.keywords' }));
    ensureMeta('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    ensureLink('canonical', currentUrl);

    ensureMeta('og:title', intl.formatMessage({ id: 'registerExpat.seo.ogTitle' }), true);
    ensureMeta('og:description', intl.formatMessage({ id: 'registerExpat.seo.ogDescription' }), true);
    ensureMeta('og:type', 'website', true);
    ensureMeta('og:url', currentUrl, true);
    ensureMeta('og:image', `${baseUrl}/images/og-register-expat.jpg`, true);
    ensureMeta('og:image:width', '1200', true);
    ensureMeta('og:image:height', '630', true);
    ensureMeta('og:image:alt', intl.formatMessage({ id: 'registerExpat.seo.ogImageAlt' }), true);
    ensureMeta('og:site_name', 'SOS-Expat', true);
    ensureMeta('og:locale', lang === 'fr' ? 'fr_FR' : lang === 'en' ? 'en_US' : `${lang}_${lang.toUpperCase()}`, true);

    ensureMeta('twitter:card', 'summary_large_image');
    ensureMeta('twitter:title', intl.formatMessage({ id: 'registerExpat.seo.twitterTitle' }));
    ensureMeta('twitter:description', intl.formatMessage({ id: 'registerExpat.seo.twitterDescription' }));
    ensureMeta('twitter:image', `${baseUrl}/images/twitter-register-expat.jpg`);
    ensureMeta('twitter:image:alt', intl.formatMessage({ id: 'registerExpat.seo.twitterImageAlt' }));
    ensureMeta('twitter:site', '@SOSExpat');
    ensureMeta('twitter:creator', '@SOSExpat');

    ensureMeta('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    ensureMeta('googlebot', 'index, follow');
    ensureMeta('bingbot', 'index, follow');
    ensureMeta('author', 'SOS-Expat');
    ensureMeta('language', lang);
    ensureMeta('geo.region', intl.formatMessage({ id: 'registerExpat.seo.geoRegion' }));
    ensureMeta('geo.placename', intl.formatMessage({ id: 'registerExpat.seo.geoPlacename' }));

    ensureMeta('apple-mobile-web-app-capable', 'yes');
    ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    ensureMeta('mobile-web-app-capable', 'yes');
    ensureMeta('theme-color', '#10b981');

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': currentUrl,
          url: currentUrl,
          name: intl.formatMessage({ id: 'registerExpat.seo.title' }),
          description: intl.formatMessage({ id: 'registerExpat.seo.description' }),
          inLanguage: lang,
          isPartOf: {
            '@type': 'WebSite',
            '@id': `${baseUrl}/#website`,
            url: baseUrl,
            name: 'SOS-Expat',
            publisher: { '@type': 'Organization', '@id': `${baseUrl}/#organization` },
          },
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: intl.formatMessage({ id: 'registerExpat.seo.breadcrumb.home' }), item: baseUrl },
              { '@type': 'ListItem', position: 2, name: intl.formatMessage({ id: 'registerExpat.seo.breadcrumb.register' }), item: currentUrl },
            ],
          },
        },
        {
          '@type': 'Organization',
          '@id': `${baseUrl}/#organization`,
          name: 'SOS-Expat',
          url: baseUrl,
          logo: { '@type': 'ImageObject', url: `${baseUrl}/logo.png`, width: 512, height: 512 },
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
          '@type': 'FAQPage',
          mainEntity: Array.from({ length: 8 }, (_, i) => ({
            '@type': 'Question',
            name: intl.formatMessage({ id: `registerExpat.faq.q${i + 1}` }),
            acceptedAnswer: { '@type': 'Answer', text: intl.formatMessage({ id: `registerExpat.faq.a${i + 1}` }) },
          })),
        },
        {
          '@type': 'Service',
          serviceType: intl.formatMessage({ id: 'registerExpat.seo.serviceType' }),
          provider: { '@type': 'Organization', '@id': `${baseUrl}/#organization` },
          areaServed: { '@type': 'Country', name: intl.formatMessage({ id: 'registerExpat.seo.areaServed' }) },
          availableChannel: {
            '@type': 'ServiceChannel',
            serviceUrl: currentUrl,
            servicePhone: intl.formatMessage({ id: 'registerExpat.seo.servicePhone' }),
            availableLanguage: { '@type': 'Language', name: lang },
          },
        },
      ],
    };

    let scriptTag = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script') as HTMLScriptElement;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(jsonLd);
  }, [intl, lang]);

  return (
    <Layout>
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
          />

          <FAQSection theme={theme} intl={intl} />
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
