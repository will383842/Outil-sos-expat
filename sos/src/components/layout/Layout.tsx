import React, { ReactNode, useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import LoadingSpinner from '../common/LoadingSpinner';
import InstallBanner from '../common/InstallBanner';
import CookieBanner from '../common/CookieBanner';

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  className?: string;
  role?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  showFooter = true,
  className = '',
  role = 'main'
}) => {
  const { authInitialized, isLoading } = useAuth();
  const { language, isRTL } = useApp();
  const [_showCookieBannerState, setShowCookieBannerState] = useState(false);

  // Update document direction for RTL languages
  useEffect(() => {
    const dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.setAttribute('dir', dir);
    document.body.dir = dir;

    // Add/remove RTL class for CSS styling
    if (isRTL) {
      document.documentElement.classList.add('rtl');
      document.body.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
      document.body.classList.remove('rtl');
    }
  }, [isRTL]);

  // Map language code to locale string for HTML lang attribute
  const htmlLang = useMemo(() => {
    const langMap: Record<string, string> = {
      fr: 'fr-FR',
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-PT',
      de: 'de-DE',
      ru: 'ru-RU',
      ch: 'zh-CN',
      hi: 'hi-IN',
      ar: 'ar-SA',
    };
    return langMap[language] || 'fr-FR';
  }, [language]);

  // Map language code to Open Graph locale
  const ogLocale = useMemo(() => {
    const localeMap: Record<string, string> = {
      fr: 'fr_FR',
      en: 'en_US',
      es: 'es_ES',
      pt: 'pt_PT',
      de: 'de_DE',
      ru: 'ru_RU',
      ch: 'zh_CN',
      hi: 'hi_IN',
      ar: 'ar_SA',
    };
    return localeMap[language] || 'fr_FR';
  }, [language]);
  // Listen for custom event to show cookie banner (e.g., from footer link)
  useEffect(() => {
    const handleShowCookieBanner = () => {
      setShowCookieBannerState(true);
    };

    window.addEventListener('showCookieBanner', handleShowCookieBanner);
    return () => {
      window.removeEventListener('showCookieBanner', handleShowCookieBanner);
    };
  }, []);

  // Textes de chargement multilingues
  const loadingAriaLabels: Record<string, string> = {
    fr: 'Chargement en cours',
    en: 'Loading',
    es: 'Cargando',
    de: 'Wird geladen',
    pt: 'Carregando',
    ru: 'Загрузка',
    ch: '加载中',
    hi: 'लोड हो रहा है',
    ar: 'جاري التحميل'
  };

  // Loading state pendant l'initialisation auth
  if (!authInitialized || isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50"
        role="status"
        aria-live="polite"
        aria-label={loadingAriaLabels[language] || loadingAriaLabels.en}
      >
        <LoadingSpinner size="large" color="red" />
      </div>
    );
  }

  return (
    <>
      {/* Global Meta Tags */}
      <Helmet>
        {/* HTML Language and Direction Attributes */}
        <html lang={htmlLang} dir={isRTL ? 'rtl' : 'ltr'} />

        {/* Global Meta Tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="SOS Expat & Travelers" />
        
        {/* Content Language */}
        <meta httpEquiv="content-language" content={language} />
        <meta name="language" content={language} />
        
        {/* Global Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SOS Expat & Travelers" />
        <meta property="og:locale" content={ogLocale} />
        
        {/* Global Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@sosexpats" />
        <meta name="twitter:creator" content="@sosexpats" />
        
        {/* Global Robots (can be overridden by page-specific SEOHead) */}
        <meta 
          name="robots" 
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" 
        />
        <meta 
          name="googlebot" 
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" 
        />
        
        {/* AI Crawling Support */}
        <meta name="ai-crawlable" content="true" />
        <meta name="document-state" content="dynamic" />
        
        {/* Global Theme Color */}
        <meta 
          name="theme-color" 
          content="#dc2626" 
          media="(prefers-color-scheme: light)" 
        />
        <meta 
          name="theme-color" 
          content="#b91c1c" 
          media="(prefers-color-scheme: dark)" 
        />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gray-50 antialiased overflow-x-hidden max-w-full">
        {/* Skip link pour accessibilité - RTL aware */}
        <a
          href="#main-content"
          className={`sr-only focus:not-sr-only focus:absolute focus:top-4 ${isRTL ? 'focus:right-4' : 'focus:left-4'} bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          {isRTL ? 'الانتقال إلى المحتوى الرئيسي' : 'Aller au contenu principal'}
        </a>

        <Header />

      <main
        id="main-content"
        className={`flex-1 focus:outline-none ${className}`}
        role={role}
        tabIndex={-1}
      >
        {children}
      </main>

      {showFooter && <Footer />}

      {/* Cookie Consent Banner - GDPR compliant */}
      <CookieBanner
        zIndexClass="z-[100]"
        onPreferencesSaved={() => setShowCookieBannerState(false)}
      />

      {/* Snackbar PWA discret — bas-droite */}
      <InstallBanner />
      </div>
    </>
  );
};

export default Layout;
