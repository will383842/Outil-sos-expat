/**
 * GroupAdminRegister - Registration page for Group & Community Administrators
 * Dark theme with indigo accent - Harmonized with ChatterRegister pattern
 * Features: role conflict check, email-already-exists UI, referral code banner, terms tracking
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { useSearchParams } from 'react-router-dom';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import GroupAdminRegisterForm from '@/components/GroupAdmin/Forms/GroupAdminRegisterForm';
import type { GroupAdminRegistrationData } from '@/components/GroupAdmin/Forms/GroupAdminRegisterForm';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { Users, ArrowLeft, ArrowRight, CheckCircle, Gift, LogIn, Mail } from 'lucide-react';
import { storeReferralCode, getStoredReferralCode, getStoredReferral, clearStoredReferral } from '@/utils/referralStorage';
import { trackMetaCompleteRegistration, trackMetaStartRegistration, getMetaIdentifiers, setMetaPixelUserData } from '@/utils/metaPixel';
import { trackAdRegistration } from '@/services/adAttributionService';
import { generateEventIdForType } from '@/utils/sharedEventId';

const UI = {
  card: "bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg",
} as const;

const GroupAdminRegister: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useApp();
  const { user, authInitialized, isLoading: authLoading, register, refreshUser } = useAuth();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  const [existingEmail, setExistingEmail] = useState('');
  const [affiliateCodes, setAffiliateCodes] = useState<{ client: string; recruitment: string } | null>(null);

  // Referral code handling
  const referralCodeFromUrl = useMemo(() => {
    const fromUrl = searchParams.get('ref')
      || searchParams.get('referralCode')
      || searchParams.get('code')
      || searchParams.get('sponsor')
      || '';

    if (fromUrl) {
      storeReferralCode(fromUrl, 'groupAdmin', 'recruitment');
      return fromUrl;
    }

    return getStoredReferralCode('groupAdmin') || '';
  }, [searchParams]);

  // Routes
  const landingRoute = `/${getTranslatedRouteSlug('groupadmin-landing' as RouteKey, langCode)}`;
  const dashboardRoute = `/${getTranslatedRouteSlug('groupadmin-dashboard' as RouteKey, langCode)}`;
  const loginRoute = `/${getTranslatedRouteSlug('login' as RouteKey, langCode)}`;

  // ============================================================================
  // ROLE CHECK
  // ============================================================================
  const userRole = user?.role;
  const hasExistingRole = userRole && ['blogger', 'chatter', 'influencer', 'groupAdmin', 'lawyer', 'expat', 'client'].includes(userRole);
  const isAlreadyGroupAdmin = userRole === 'groupAdmin';

  useEffect(() => {
    if (authInitialized && !authLoading && !loading && isAlreadyGroupAdmin && !success) {
      navigate(dashboardRoute, { replace: true });
    }
  }, [authInitialized, authLoading, loading, isAlreadyGroupAdmin, navigate, dashboardRoute, success]);

  // Meta Pixel: Track StartRegistration on mount
  useEffect(() => {
    trackMetaStartRegistration({ content_name: 'groupadmin_registration' });
  }, []);

  // Show role conflict
  if (authInitialized && !authLoading && hasExistingRole && !isAlreadyGroupAdmin) {
    const roleLabels: Record<string, string> = {
      blogger: 'Blogger',
      chatter: 'Chatter',
      influencer: 'Influencer',
      lawyer: intl.formatMessage({ id: 'role.lawyer', defaultMessage: 'Lawyer' }),
      expat: intl.formatMessage({ id: 'role.expat', defaultMessage: 'Expat Helper' }),
      client: intl.formatMessage({ id: 'role.client', defaultMessage: 'Client' }),
    };

    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-indigo-950 via-gray-950 to-black">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-indigo-500/20 border rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">&#9888;&#65039;</span>
            </div>
            <h1 className="text-2xl font-bold mb-4">
              <FormattedMessage id="groupadmin.register.roleConflict.title" defaultMessage="Registration Not Allowed" />
            </h1>
            <p className="text-gray-300 mb-6">
              <FormattedMessage
                id="groupadmin.register.roleConflict.message"
                defaultMessage="You are already registered as {role}. Each account can only have one role."
                values={{ role: roleLabels[userRole] || userRole }}
              />
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full px-6 py-3 min-h-[48px] bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-extrabold rounded-xl transition-all hover:shadow-lg"
            >
              <FormattedMessage id="groupadmin.register.roleConflict.button" defaultMessage="Go to My Dashboard" />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Handle form submission
  const handleSubmit = async (data: GroupAdminRegistrationData) => {
    setLoading(true);
    setError(null);
    setEmailAlreadyExists(false);
    setExistingEmail(data.email);

    // Meta Pixel: Generate event ID for deduplication + get fbp/fbc
    const metaEventId = generateEventIdForType('registration');
    const metaIds = getMetaIdentifiers();

    try {
      // Step 1: Create Firebase Auth account
      if (!user) {
        await register({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'groupAdmin',
          termsAccepted: data.acceptTerms,
          termsAcceptedAt: data.termsAcceptedAt,
          termsVersion: data.termsVersion,
          termsType: data.termsType,
          termsAcceptanceMeta: data.termsAcceptanceMeta,
          // Meta Pixel/CAPI tracking identifiers (filter undefined to avoid Firestore error)
          ...(metaIds.fbp && { fbp: metaIds.fbp }),
          ...(metaIds.fbc && { fbc: metaIds.fbc }),
          country: data.country,
          metaEventId,
        }, data.password);
      }

      // Step 2: Call Cloud Function
      const registerGroupAdmin = httpsCallable(functions, 'registerGroupAdmin');
      const result = await registerGroupAdmin({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        country: data.country.toUpperCase(),
        language: data.language,
        groupUrl: data.groupUrl,
        groupName: data.groupName,
        groupType: data.groupType,
        groupSize: data.groupSize,
        groupCountry: data.groupCountry.toUpperCase(),
        groupLanguage: data.groupLanguage,
        groupDescription: data.groupDescription || undefined,
        recruitmentCode: data.referralCode || referralCodeFromUrl || undefined,
        referralCapturedAt: getStoredReferral('groupAdmin')?.capturedAt || new Date().toISOString(),
        acceptTerms: data.acceptTerms,
        termsAcceptedAt: data.termsAcceptedAt,
        termsVersion: data.termsVersion,
        termsType: data.termsType,
        termsAcceptanceMeta: data.termsAcceptanceMeta,
      });

      const responseData = result.data as { success: boolean; affiliateCodeClient: string; affiliateCodeRecruitment: string };

      if (responseData.success) {
        clearStoredReferral('groupAdmin');
        await refreshUser();
        setAffiliateCodes({ client: responseData.affiliateCodeClient, recruitment: responseData.affiliateCodeRecruitment });
        setSuccess(true);

        // Meta Pixel: Track CompleteRegistration + Ad Attribution + Advanced Matching
        trackMetaCompleteRegistration({
          content_name: 'groupadmin_registration',
          status: 'completed',
          country: data.country,
          eventID: metaEventId,
        });
        trackAdRegistration({ contentName: 'groupadmin_registration' });
        setMetaPixelUserData({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          country: data.country,
        });

        setTimeout(() => {
          navigate(dashboardRoute, { replace: true });
        }, 3000);
      }
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      const errorCode = e.code || '';
      const message = e.message?.toLowerCase() || '';

      if (errorCode === 'auth/email-already-in-use' || message.includes('email-already-in-use')) {
        setEmailAlreadyExists(true);
        setLoading(false);
        return;
      }

      let errorMessage = intl.formatMessage({ id: 'form.error.generic', defaultMessage: 'An error occurred' });

      if (errorCode === 'auth/weak-password' || message.includes('weak-password')) {
        errorMessage = intl.formatMessage({ id: 'groupadmin.register.error.weakPassword', defaultMessage: 'Password is too weak.' });
      } else if (errorCode === 'auth/invalid-email' || message.includes('invalid-email')) {
        errorMessage = intl.formatMessage({ id: 'groupadmin.register.error.invalidEmail', defaultMessage: 'Invalid email address.' });
      } else if (message.includes('network')) {
        errorMessage = intl.formatMessage({ id: 'form.error.network', defaultMessage: 'Network error. Please try again.' });
      } else if (e.message) {
        errorMessage = e.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (!authInitialized) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-950 via-gray-950 to-black">
          <div className="w-10 h-10 border-4 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <html lang={langCode === 'ch' ? 'zh' : langCode} />
        <title>{intl.formatMessage({ id: 'groupadmin.register.seo.title', defaultMessage: 'Group Admin Registration | SOS-Expat' })}</title>
        <meta name="description" content={intl.formatMessage({ id: 'groupadmin.register.seo.description', defaultMessage: 'Register as a Group Admin to earn $10 per call referred.' })} />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#312e81" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-gray-950 to-black py-12 px-4">
        {/* Radial glow */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />

        <div className="max-w-lg mx-auto relative z-10">
          {/* Back Button */}
          <button
            onClick={() => navigate(landingRoute)}
            className="flex items-center gap-2 text-gray-300 hover:text-indigo-400 transition-colors mb-6 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <FormattedMessage id="common.back" defaultMessage="Retour" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black mb-2">
              <FormattedMessage id="groupadmin.register.title" defaultMessage="Group Admin Registration" />
            </h1>
            <p className="text-gray-300">
              <FormattedMessage id="groupadmin.register.subtitle" defaultMessage="Earn $10 per call referred from your group" />
            </p>
          </div>

          {/* Success State */}
          {success ? (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-950 via-gray-950 to-black px-4">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <h2 className="text-3xl font-bold text-white mb-3">✅ Inscription réussie !</h2>
                <p className="text-lg text-gray-300 mb-2">Votre compte Admin de Groupe a été créé avec succès.</p>
                <p className="text-sm text-gray-400">Redirection vers votre tableau de bord...</p>
              </div>
            </div>
          ) : emailAlreadyExists ? (
            /* Email Already Exists */
            <div className={`${UI.card} p-8 text-center`}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 border flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">
                <FormattedMessage id="groupadmin.register.emailExists.title" defaultMessage="You already have an account!" />
              </h2>
              <p className="text-gray-300 mb-2">
                <FormattedMessage
                  id="groupadmin.register.emailExists.message"
                  defaultMessage="The email {email} is already registered."
                  values={{ email: <strong className="text-white">{existingEmail}</strong> }}
                />
              </p>
              <p className="text-gray-400 mb-6">
                <FormattedMessage id="groupadmin.register.emailExists.hint" defaultMessage="Log in to continue your registration." />
              </p>
              <button
                onClick={() => navigate(loginRoute)}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity mb-4"
              >
                <LogIn className="w-5 h-5" />
                <FormattedMessage id="groupadmin.register.emailExists.loginButton" defaultMessage="Log in" />
              </button>
              <button
                onClick={() => { setEmailAlreadyExists(false); setExistingEmail(''); }}
                className="text-sm hover:text-white underline"
              >
                <FormattedMessage id="groupadmin.register.emailExists.tryDifferent" defaultMessage="Use a different email" />
              </button>
            </div>
          ) : (
            /* Registration Form */
            <div className={`${UI.card} p-6`}>
              {/* Already registered link */}
              <div className="mb-6 p-3 bg-blue-500/10 rounded-xl border text-center">
                <p className="text-sm">
                  <FormattedMessage id="groupadmin.register.alreadyRegistered" defaultMessage="Already registered?" />{' '}
                  <button
                    onClick={() => navigate(loginRoute)}
                    className="text-blue-400 hover:text-blue-300 font-medium underline"
                  >
                    <FormattedMessage id="groupadmin.register.loginLink" defaultMessage="Log in here" />
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
                        <FormattedMessage id="groupadmin.register.referralDetected" defaultMessage="You've been referred!" />
                      </p>
                      <p className="text-sm">
                        <FormattedMessage
                          id="groupadmin.register.referralCode.applied"
                          defaultMessage="Referral code {code} will be applied automatically"
                          values={{ code: <strong className="text-green-300">{referralCodeFromUrl}</strong> }}
                        />
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <GroupAdminRegisterForm
                onSubmit={handleSubmit}
                initialData={{
                  firstName: user?.firstName || '',
                  lastName: user?.lastName || '',
                  email: user?.email || '',
                  country: user?.country || '',
                  referralCode: referralCodeFromUrl,
                }}
                loading={loading}
                error={error}
                onErrorClear={() => setError(null)}
                isLoggedIn={!!user}
              />
            </div>
          )}

          {/* Info footer */}
          {!success && (
            <p className="text-center mt-6">
              <FormattedMessage
                id="groupadmin.register.info"
                defaultMessage="By registering, you accept the Group Admin program terms"
              />
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default GroupAdminRegister;
