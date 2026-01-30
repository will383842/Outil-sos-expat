/**
 * ChatterRegister - Registration page for new chatters
 * Handles the sign-up process with form validation
 */

import React, { useState, useEffect, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { useSearchParams } from 'react-router-dom';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import ChatterRegisterForm from '@/components/Chatter/Forms/ChatterRegisterForm';
import type { ChatterRegistrationData } from '@/components/Chatter/Forms/ChatterRegisterForm';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Star, ArrowLeft, CheckCircle, Gift } from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const ChatterRegister: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useApp();
  const { user, authInitialized, isLoading: authLoading } = useAuth();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const functions = getFunctions(undefined, 'europe-west1');

  // Get referral code from URL params (supports: ref, referralCode, code, sponsor)
  const referralCodeFromUrl = useMemo(() => {
    return searchParams.get('ref')
      || searchParams.get('referralCode')
      || searchParams.get('code')
      || searchParams.get('sponsor')
      || '';
  }, [searchParams]);

  // Routes
  const landingRoute = `/${getTranslatedRouteSlug('chatter-landing' as RouteKey, langCode)}`;
  const presentationRoute = `/${getTranslatedRouteSlug('chatter-presentation' as RouteKey, langCode)}`;
  const dashboardRoute = `/${getTranslatedRouteSlug('chatter-dashboard' as RouteKey, langCode)}`;

  // ============================================================================
  // ROLE CHECK: Redirect if user already has a role
  // ============================================================================
  const userRole = user?.role;
  const hasExistingRole = userRole && ['blogger', 'chatter', 'influencer', 'lawyer', 'expat', 'client'].includes(userRole);
  const isAlreadyChatter = userRole === 'chatter';

  // Redirect chatters to their dashboard
  useEffect(() => {
    if (authInitialized && !authLoading && isAlreadyChatter) {
      navigate(dashboardRoute);
    }
  }, [authInitialized, authLoading, isAlreadyChatter, navigate, dashboardRoute]);

  // Show error if user has another role
  if (authInitialized && !authLoading && hasExistingRole && !isAlreadyChatter) {
    const roleLabels: Record<string, string> = {
      blogger: 'Blogger',
      influencer: 'Influencer',
      lawyer: intl.formatMessage({ id: 'role.lawyer', defaultMessage: 'Lawyer' }),
      expat: intl.formatMessage({ id: 'role.expat', defaultMessage: 'Expat Helper' }),
      client: intl.formatMessage({ id: 'role.client', defaultMessage: 'Client' }),
    };

    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="chatter.register.roleConflict.title" defaultMessage="Registration Not Allowed" />
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              <FormattedMessage
                id="chatter.register.roleConflict.message"
                defaultMessage="You are already registered as {role}. Each account can only have one role."
                values={{ role: roleLabels[userRole] || userRole }}
              />
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
            >
              <FormattedMessage id="chatter.register.roleConflict.button" defaultMessage="Go to My Dashboard" />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Handle registration
  const handleSubmit = async (data: ChatterRegistrationData) => {
    setLoading(true);
    setError(null);

    try {
      const registerChatterFn = httpsCallable(functions, 'registerChatter');
      await registerChatterFn({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        // Phone is collected later after quiz, not at registration
        country: data.country,
        languages: data.languages,
        recruiterCode: data.referralCode || undefined,
      });

      setSuccess(true);

      // Redirect to presentation after short delay
      setTimeout(() => {
        navigate(presentationRoute);
      }, 2000);
    } catch (err: unknown) {
      console.error('[ChatterRegister] Error:', err);
      const errorMessage = err instanceof Error ? err.message : intl.formatMessage({ id: 'chatter.register.error.generic', defaultMessage: 'Une erreur est survenue' });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (!authInitialized) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-red-50/20 to-white dark:from-gray-950 dark:via-gray-950 dark:to-black py-12 px-4">
        <div className="max-w-lg mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate(landingRoute)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <FormattedMessage id="common.back" defaultMessage="Retour" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              <FormattedMessage id="chatter.register.title" defaultMessage="Inscription Chatter" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.register.subtitle" defaultMessage="Rejoignez notre programme ambassadeur" />
            </p>
          </div>

          {/* Success State */}
          {success ? (
            <div className={`${UI.card} p-8 text-center`}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                <FormattedMessage id="chatter.register.success.title" defaultMessage="Inscription réussie !" />
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                <FormattedMessage id="chatter.register.success.subtitle" defaultMessage="Vous allez être redirigé vers la présentation..." />
              </p>
              <div className="w-6 h-6 mx-auto border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            /* Registration Form */
            <div className={`${UI.card} p-6`}>
              {/* Referral code banner if present */}
              {referralCodeFromUrl && (
                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <Gift className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-300">
                        <FormattedMessage id="chatter.register.referralDetected" defaultMessage="You've been referred!" />
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        <FormattedMessage
                          id="chatter.register.referralCode.applied"
                          defaultMessage="Referral code {code} will be applied automatically"
                          values={{ code: <strong>{referralCodeFromUrl}</strong> }}
                        />
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <ChatterRegisterForm
                onSubmit={handleSubmit}
                initialData={{
                  firstName: user?.firstName || '',
                  lastName: user?.lastName || '',
                  email: user?.email || '',
                  referralCode: referralCodeFromUrl,
                }}
                loading={loading}
                error={error}
              />
            </div>
          )}

          {/* Info */}
          {!success && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              <FormattedMessage
                id="chatter.register.info"
                defaultMessage="En vous inscrivant, vous acceptez les conditions du programme Chatter"
              />
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ChatterRegister;
