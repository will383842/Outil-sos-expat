/**
 * InfluencerRegister - Registration page for influencers
 * Dark theme with red accent - Harmonized with ChatterRegister pattern
 * Features: role conflict check, email-already-exists UI, referral code banner
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import { trackMetaStartRegistration } from '@/utils/metaPixel';
import HreflangLinks from '@/multilingual-system/components/HrefLang/HreflangLinks';
import InfluencerRegisterForm from '@/components/Influencer/Forms/InfluencerRegisterForm';
import { Gift, Megaphone, ArrowLeft, LogIn, Mail } from 'lucide-react';
import { storeReferralCode, getUnifiedReferralCode } from '@/utils/referralStorage';
import { WhatsAppGroupScreen } from '@/whatsapp-groups';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

const UI = {
  card: "bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg",
} as const;

const InfluencerRegister: React.FC = () => {
  const intl = useIntl();
  const location = useLocation();
  const navigate = useLocaleNavigate();
  const [searchParams] = useSearchParams();
  const { user, authInitialized, isLoading: authLoading } = useAuth();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  const [existingEmail, setExistingEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [registrationData, setRegistrationData] = useState<{ language: string; country: string } | null>(null);

  // Referral code handling — useState + useEffect to handle AffiliateRefSync timing
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState(() => {
    try {
      const bp = new URLSearchParams(window.location.search);
      const code = bp.get('ref') || bp.get('referralCode') || bp.get('code') || bp.get('sponsor') || '';
      if (code) { storeReferralCode(code, 'influencer', 'recruitment'); return code; }
    } catch { /* SSR */ }
    return getUnifiedReferralCode() || '';
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const bp = new URLSearchParams(window.location.search);
        const code = bp.get('ref') || bp.get('referralCode') || bp.get('code') || bp.get('sponsor') || '';
        if (code && code !== referralCodeFromUrl) {
          storeReferralCode(code, 'influencer', 'recruitment');
          setReferralCodeFromUrl(code);
        }
      } catch { /* ignore */ }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const landingRoute = `/${getTranslatedRouteSlug('influencer-landing' as RouteKey, langCode)}`;
  const telegramRoute = `/${getTranslatedRouteSlug('influencer-telegram' as RouteKey, langCode)}`;
  const dashboardRoute = `/${getTranslatedRouteSlug('influencer-dashboard' as RouteKey, langCode)}`;
  const loginRoute = `/${getTranslatedRouteSlug('login' as RouteKey, langCode)}`;

  // WhatsApp continue handler → navigate to Telegram onboarding
  const handleWhatsAppContinue = useCallback(() => {
    navigate(telegramRoute, { replace: true });
  }, [navigate, telegramRoute]);

  // Success handler from InfluencerRegisterForm → show WhatsApp screen
  const handleRegistrationSuccess = useCallback((data: { language: string; country: string }) => {
    setRegistrationData(data);
    setShowWhatsApp(true);
  }, []);

  // Role check
  const userRole = user?.role;
  const hasExistingRole = userRole && ['blogger', 'chatter', 'influencer', 'groupAdmin', 'lawyer', 'expat', 'client'].includes(userRole);
  const isAlreadyInfluencer = userRole === 'influencer';

  useEffect(() => {
    trackMetaStartRegistration({ content_name: 'influencer_registration' });
  }, []);

  // IMPORTANT: !isRegistering prevents premature redirect during registration
  // Without it, register() sets role='influencer' → isAlreadyInfluencer becomes true →
  // useEffect fires and navigates to dashboard BEFORE registerInfluencer() Cloud Function is called
  // !showWhatsApp prevents redirect while WhatsApp group screen is shown post-registration
  useEffect(() => {
    if (authInitialized && !authLoading && !isRegistering && !showWhatsApp && isAlreadyInfluencer) {
      navigate(dashboardRoute, { replace: true });
    }
  }, [authInitialized, authLoading, isRegistering, showWhatsApp, isAlreadyInfluencer, navigate, dashboardRoute]);

  // Role conflict
  if (authInitialized && !authLoading && hasExistingRole && !isAlreadyInfluencer) {
    const roleLabels: Record<string, string> = {
      blogger: 'Blogger',
      chatter: 'Chatter',
      groupAdmin: 'Group Admin',
      lawyer: intl.formatMessage({ id: 'role.lawyer', defaultMessage: 'Lawyer' }),
      expat: intl.formatMessage({ id: 'role.expat', defaultMessage: 'Expat Helper' }),
      client: intl.formatMessage({ id: 'role.client', defaultMessage: 'Client' }),
    };

    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-red-950 via-gray-950 to-black">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 border rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">&#9888;&#65039;</span>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-white">
              <FormattedMessage id="influencer.register.roleConflict.title" defaultMessage="Registration Not Allowed" />
            </h1>
            <p className="text-gray-300 mb-6">
              <FormattedMessage
                id="influencer.register.roleConflict.message"
                defaultMessage="You are already registered as {role}. Each account can only have one role."
                values={{ role: roleLabels[userRole] || userRole }}
              />
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full px-6 py-3 min-h-[48px] bg-gradient-to-r from-red-500 to-rose-500 text-white font-extrabold rounded-xl transition-all hover:shadow-lg"
            >
              <FormattedMessage id="influencer.register.roleConflict.button" defaultMessage="Go to My Dashboard" />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // WhatsApp screen after successful registration
  if (showWhatsApp && user) {
    return (
      <WhatsAppGroupScreen
        userId={user.uid || ''}
        role="influencer"
        language={registrationData?.language ?? 'en'}
        country={registrationData?.country ?? ''}
        onContinue={handleWhatsAppContinue}
      />
    );
  }

  const seoTitle = intl.formatMessage({ id: 'influencer.register.seo.title', defaultMessage: 'Inscription Influenceur SOS-Expat' });
  const seoDescription = intl.formatMessage({ id: 'influencer.register.seo.description', defaultMessage: 'Inscrivez-vous au programme Influenceur SOS-Expat.' });

  return (
    <Layout>
      <SEOHead title={seoTitle} description={seoDescription} ogImage="/og-influencer-register.jpg" ogType="website" />
      <BreadcrumbSchema items={[
        { name: intl.formatMessage({ id: 'breadcrumb.home', defaultMessage: 'Home' }), url: '/' },
        { name: 'Become Influencer', url: '/devenir-influenceur' },
        { name: 'Register' }
      ]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': 'https://sos-expat.com/#organization',
        name: 'SOS-Expat',
        url: 'https://sos-expat.com',
        logo: { '@type': 'ImageObject', url: 'https://sos-expat.com/logo.png', width: 512, height: 512 },
        sameAs: ['https://www.facebook.com/sosexpat', 'https://twitter.com/sosexpat', 'https://www.linkedin.com/company/sos-expat', 'https://www.instagram.com/sosexpat'],
        contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', availableLanguage: ['fr','en','es','de','ru','hi','pt','zh','ar'] },
      }) }} />
      {/* HreflangLinks removed: handled globally in App.tsx L1086 */}

      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-950 to-black pb-16 px-4 pt-6 sm:pt-8">
        {/* Radial glow */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(239,68,68,0.08),transparent_50%)] pointer-events-none" />

        <div className="max-w-xl mx-auto relative z-10">
          {/* Back Button — compact */}
          <button
            onClick={() => navigate(landingRoute)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors mb-4 min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <FormattedMessage id="common.back" defaultMessage="Retour" />
          </button>

          {/* Header — concis, mobile-first */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg">
              <Megaphone className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
              <FormattedMessage id="influencer.register.title" defaultMessage="Devenir Influenceur" />
            </h1>
            <p className="text-sm sm:text-base text-gray-300">
              <FormattedMessage id="influencer.register.subtitle" defaultMessage="Inscription gratuite, activation immédiate" />
            </p>
          </div>

          {/* Email Already Exists */}
          {emailAlreadyExists ? (
            <div className={`${UI.card} p-6 sm:p-8 text-center`}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">
                <FormattedMessage id="influencer.register.emailExists.title" defaultMessage="You already have an account!" />
              </h2>
              <p className="text-gray-300 mb-2">
                <FormattedMessage
                  id="influencer.register.emailExists.message"
                  defaultMessage="The email {email} is already registered."
                  values={{ email: <strong className="text-white">{existingEmail}</strong> }}
                />
              </p>
              <p className="text-gray-400 mb-6 text-sm">
                <FormattedMessage id="influencer.register.emailExists.hint" defaultMessage="Log in to continue." />
              </p>
              <button
                onClick={() => navigate(loginRoute)}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity mb-3 min-h-[52px]"
              >
                <LogIn className="w-5 h-5" />
                <FormattedMessage id="influencer.register.emailExists.loginButton" defaultMessage="Log in" />
              </button>
              <button
                onClick={() => { setEmailAlreadyExists(false); setExistingEmail(''); }}
                className="text-gray-400 text-sm hover:text-white underline min-h-[40px]"
              >
                <FormattedMessage id="influencer.register.emailExists.tryDifferent" defaultMessage="Use a different email" />
              </button>
            </div>
          ) : (
            <div className={`${UI.card} p-4 sm:p-6`}>
              {/* Referral code banner — compact */}
              {referralCodeFromUrl && (
                <div className="mb-5 p-3 bg-green-500/10 rounded-xl border border-green-500/20 flex items-center gap-3">
                  <Gift className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-green-300 font-semibold">
                      <FormattedMessage id="influencer.register.referralDetected" defaultMessage="Vous avez été parrainé" />
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      <FormattedMessage
                        id="influencer.register.referralCode.applied"
                        defaultMessage="Code {code} appliqué automatiquement"
                        values={{ code: <strong className="text-green-300">{referralCodeFromUrl}</strong> }}
                      />
                    </p>
                  </div>
                </div>
              )}

              <InfluencerRegisterForm
                referralCode={referralCodeFromUrl}
                onEmailAlreadyExists={(email: string) => {
                  setEmailAlreadyExists(true);
                  setExistingEmail(email);
                }}
                onRegistrationStateChange={setIsRegistering}
                onSuccess={handleRegistrationSuccess}
              />

              {/* Already registered — discreet link at the bottom */}
              <p className="mt-6 text-center text-sm text-gray-400">
                <FormattedMessage id="influencer.register.alreadyRegistered" defaultMessage="Déjà inscrit ?" />{' '}
                <button
                  onClick={() => navigate(loginRoute)}
                  className="text-red-400 hover:text-red-300 font-medium underline underline-offset-2"
                >
                  <FormattedMessage id="influencer.register.loginLink" defaultMessage="Connectez-vous" />
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default InfluencerRegister;
