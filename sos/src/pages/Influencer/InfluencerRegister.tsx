/**
 * InfluencerRegister - Registration page for influencers
 * Dark theme with red accent - Harmonized with ChatterRegister pattern
 * Features: role conflict check, email-already-exists UI, referral code banner
 */

import React, { useState, useMemo, useEffect } from 'react';
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
import { CheckCircle, Gift, Users, Image, Megaphone, ArrowLeft, LogIn, Mail } from 'lucide-react';
import { storeReferralCode, getStoredReferralCode } from '@/utils/referralStorage';

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

  // Referral code handling
  const referralCodeFromUrl = useMemo(() => {
    const fromUrl = searchParams.get('ref')
      || searchParams.get('referralCode')
      || searchParams.get('code')
      || searchParams.get('sponsor')
      || '';

    if (fromUrl) {
      storeReferralCode(fromUrl, 'influencer', 'recruitment');
      return fromUrl;
    }

    return getStoredReferralCode('influencer') || '';
  }, [searchParams]);

  const landingRoute = `/${getTranslatedRouteSlug('influencer-landing' as RouteKey, langCode)}`;
  const dashboardRoute = `/${getTranslatedRouteSlug('influencer-dashboard' as RouteKey, langCode)}`;
  const loginRoute = `/${getTranslatedRouteSlug('login' as RouteKey, langCode)}`;

  // Role check
  const userRole = user?.role;
  const hasExistingRole = userRole && ['blogger', 'chatter', 'influencer', 'groupAdmin', 'lawyer', 'expat', 'client'].includes(userRole);
  const isAlreadyInfluencer = userRole === 'influencer';

  useEffect(() => {
    trackMetaStartRegistration({ content_name: 'influencer_registration' });
  }, []);

  useEffect(() => {
    if (authInitialized && !authLoading && isAlreadyInfluencer) {
      navigate(dashboardRoute, { replace: true });
    }
  }, [authInitialized, authLoading, isAlreadyInfluencer, navigate, dashboardRoute]);

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

  const seoTitle = intl.formatMessage({ id: 'influencer.register.seo.title', defaultMessage: 'Inscription Influenceur SOS-Expat' });
  const seoDescription = intl.formatMessage({ id: 'influencer.register.seo.description', defaultMessage: 'Inscrivez-vous au programme Influenceur SOS-Expat.' });

  const benefits = [
    { icon: <Gift className="w-5 h-5 text-red-400" />, text: intl.formatMessage({ id: 'influencer.register.benefit1', defaultMessage: '$10 par appel référé' }) },
    { icon: <Users className="w-5 h-5 text-purple-400" />, text: intl.formatMessage({ id: 'influencer.register.benefit2.v3', defaultMessage: '$5 par appel à vos partenaires avocats ou expatriés aidants' }) },
    { icon: <Image className="w-5 h-5 text-blue-400" />, text: intl.formatMessage({ id: 'influencer.register.benefit3', defaultMessage: 'Bannieres, widgets, QR codes inclus' }) },
    { icon: <CheckCircle className="w-5 h-5 text-green-400" />, text: intl.formatMessage({ id: 'influencer.register.benefit4', defaultMessage: 'Activation immediate (pas de quiz)' }) },
  ];

  return (
    <Layout>
      <SEOHead title={seoTitle} description={seoDescription} ogImage="/og-influencer-register.jpg" ogType="website" />
      <HreflangLinks pathname={location.pathname} />

      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-950 to-black py-12 px-4">
        {/* Radial glow */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(239,68,68,0.08),transparent_50%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Back Button */}
          <button
            onClick={() => navigate(landingRoute)}
            className="flex items-center gap-2 text-gray-300 hover:text-red-400 transition-colors mb-6 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <FormattedMessage id="common.back" defaultMessage="Retour" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg">
              <Megaphone className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              <FormattedMessage id="influencer.register.title" defaultMessage="Devenir Influenceur SOS-Expat" />
            </h1>
            <p className="text-lg max-w-2xl mx-auto text-gray-300">
              <FormattedMessage id="influencer.register.subtitle" defaultMessage="Creez votre compte et commencez a gagner immediatement" />
            </p>
          </div>

          {/* Email Already Exists */}
          {emailAlreadyExists ? (
            <div className="max-w-lg mx-auto">
              <div className={`${UI.card} p-8 text-center`}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 border flex items-center justify-center">
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
                <p className="text-gray-400 mb-6">
                  <FormattedMessage id="influencer.register.emailExists.hint" defaultMessage="Log in to continue." />
                </p>
                <button
                  onClick={() => navigate(loginRoute)}
                  className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity mb-4"
                >
                  <LogIn className="w-5 h-5" />
                  <FormattedMessage id="influencer.register.emailExists.loginButton" defaultMessage="Log in" />
                </button>
                <button
                  onClick={() => { setEmailAlreadyExists(false); setExistingEmail(''); }}
                  className="text-gray-400 text-sm hover:text-white underline"
                >
                  <FormattedMessage id="influencer.register.emailExists.tryDifferent" defaultMessage="Use a different email" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Benefits Sidebar */}
              <div className="lg:col-span-1">
                <div className={`${UI.card} p-6 sticky top-24`}>
                  <h2 className="font-semibold text-white mb-4">
                    <FormattedMessage id="influencer.register.benefits.title" defaultMessage="Ce que vous obtenez" />
                  </h2>
                  <div className="space-y-4">
                    {benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        {benefit.icon}
                        <span className="text-sm text-gray-300">{benefit.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="text-sm text-gray-400">
                      <FormattedMessage id="influencer.register.info" defaultMessage="L'inscription est gratuite. Votre compte sera active immediatement." />
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Form */}
              <div className="lg:col-span-2">
                <div className={`${UI.card} p-6`}>
                  {/* Already registered link */}
                  <div className="mb-6 p-3 bg-blue-500/10 rounded-xl border text-center">
                    <p className="text-sm text-gray-300">
                      <FormattedMessage id="influencer.register.alreadyRegistered" defaultMessage="Already registered?" />{' '}
                      <button
                        onClick={() => navigate(loginRoute)}
                        className="text-blue-400 hover:text-blue-300 font-medium underline"
                      >
                        <FormattedMessage id="influencer.register.loginLink" defaultMessage="Log in here" />
                      </button>
                    </p>
                  </div>

                  {/* Referral code banner */}
                  {referralCodeFromUrl && (
                    <div className="mb-6 p-4 bg-green-500/10 rounded-xl border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 border rounded-full flex items-center justify-center">
                          <Gift className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-300">
                            <FormattedMessage id="influencer.register.referralDetected" defaultMessage="You've been referred!" />
                          </p>
                          <p className="text-sm text-gray-300">
                            <FormattedMessage
                              id="influencer.register.referralCode.applied"
                              defaultMessage="Referral code {code} will be applied automatically"
                              values={{ code: <strong className="text-green-300">{referralCodeFromUrl}</strong> }}
                            />
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <InfluencerRegisterForm
                    referralCode={referralCodeFromUrl}
                    onEmailAlreadyExists={(email: string) => {
                      setEmailAlreadyExists(true);
                      setExistingEmail(email);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default InfluencerRegister;
