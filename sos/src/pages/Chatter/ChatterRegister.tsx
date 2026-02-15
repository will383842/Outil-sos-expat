/**
 * ChatterRegister - Registration page for new chatters
 * Handles the sign-up process with form validation
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
import ChatterRegisterForm from '@/components/Chatter/Forms/ChatterRegisterForm';
import type { ChatterRegistrationData } from '@/components/Chatter/Forms/ChatterRegisterForm';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '@/config/firebase';
import { Star, ArrowLeft, CheckCircle, Gift, LogIn, Mail } from 'lucide-react';
import { storeReferralCode, getStoredReferralCode, getStoredReferral, clearStoredReferral } from '@/utils/referralStorage';
import { trackMetaCompleteRegistration, trackMetaStartRegistration, getMetaIdentifiers, setMetaPixelUserData } from '@/utils/metaPixel';
import { trackAdRegistration } from '@/services/adAttributionService';
import { generateEventIdForType } from '@/utils/sharedEventId';

// Design tokens - Harmonized with ChatterLanding dark theme
const UI = {
  card: "bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg",
} as const;

const ChatterRegister: React.FC = () => {
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
  const [existingEmail, setExistingEmail] = useState<string>('');

  // Get referral code from URL params (supports: ref, referralCode, code, sponsor)
  // If found in URL, persist to localStorage with 30-day expiration
  // Otherwise, fallback to stored code
  const referralCodeFromUrl = useMemo(() => {
    const fromUrl = searchParams.get('ref')
      || searchParams.get('referralCode')
      || searchParams.get('code')
      || searchParams.get('sponsor')
      || '';

    if (fromUrl) {
      storeReferralCode(fromUrl, 'chatter', 'recruitment');
      return fromUrl;
    }

    // Fallback to localStorage (returns null if expired)
    return getStoredReferralCode('chatter') || '';
  }, [searchParams]);

  // Routes
  const landingRoute = `/${getTranslatedRouteSlug('chatter-landing' as RouteKey, langCode)}`;
  const telegramRoute = `/${getTranslatedRouteSlug('chatter-telegram' as RouteKey, langCode)}`;
  const dashboardRoute = `/${getTranslatedRouteSlug('chatter-dashboard' as RouteKey, langCode)}`;
  const loginRoute = `/${getTranslatedRouteSlug('login' as RouteKey, langCode)}`;

  // ============================================================================
  // ROLE CHECK: Redirect if user already has a role
  // ============================================================================
  const userRole = user?.role;
  const hasExistingRole = userRole && ['blogger', 'chatter', 'influencer', 'lawyer', 'expat', 'client'].includes(userRole);
  const isAlreadyChatter = userRole === 'chatter';

  // Redirect chatters appropriately:
  // - If Telegram onboarding not completed → go to Telegram page
  // - Otherwise → go to Dashboard
  // IMPORTANT: Also check !loading to avoid redirecting during registration process
  useEffect(() => {
    if (authInitialized && !authLoading && !loading && isAlreadyChatter && !success) {
      // Check if Telegram onboarding is complete
      if (!user?.telegramOnboardingCompleted) {
        navigate(telegramRoute, { replace: true });
      } else {
        navigate(dashboardRoute, { replace: true });
      }
    }
  }, [authInitialized, authLoading, loading, isAlreadyChatter, user?.telegramOnboardingCompleted, navigate, telegramRoute, dashboardRoute, success]);

  // Meta Pixel: Track StartRegistration on mount
  useEffect(() => {
    trackMetaStartRegistration({ content_name: 'chatter_registration' });
  }, []);

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
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-red-950 via-gray-950 to-black">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-500/20 border rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold mb-4">
              <FormattedMessage id="chatter.register.roleConflict.title" defaultMessage="Registration Not Allowed" />
            </h1>
            <p className="text-gray-400 mb-6">
              <FormattedMessage
                id="chatter.register.roleConflict.message"
                defaultMessage="You are already registered as {role}. Each account can only have one role."
                values={{ role: roleLabels[userRole] || userRole }}
              />
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full px-6 py-3 min-h-[48px] bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold rounded-xl transition-all hover:shadow-lg"
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
    setEmailAlreadyExists(false);
    setExistingEmail(data.email); // Save email for "already exists" UI

    try {
      // Meta Pixel: Generate event ID for deduplication + get fbp/fbc
      const metaEventId = generateEventIdForType('registration');
      const metaIds = getMetaIdentifiers();

      // Step 1: Create Firebase Auth account with role 'chatter'
      // This creates the user in Firebase Auth AND in Firestore users collection
      await register(
        {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'chatter',
          // Include terms acceptance data
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
        },
        data.password
      );

      // Step 2: Now that user is authenticated, call registerChatter Cloud Function
      // to create the chatter profile with additional data
      const registerChatterFn = httpsCallable(functions, 'registerChatter');
      try {
        await registerChatterFn({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          country: data.country,
          interventionCountries: data.interventionCountries,
          language: data.language,
          additionalLanguages: data.additionalLanguages,
          recruitmentCode: data.referralCode || undefined,
          referralCapturedAt: getStoredReferral('chatter')?.capturedAt || new Date().toISOString(),
          // ✅ TRACKING CGU - Preuve légale d'acceptation (eIDAS/RGPD)
          acceptTerms: data.acceptTerms,
          termsAcceptedAt: data.termsAcceptedAt,
          termsVersion: data.termsVersion,
          termsType: data.termsType,
          termsAcceptanceMeta: data.termsAcceptanceMeta,
        });
      } catch (cfError) {
        // CRITICAL: If Cloud Function fails, delete the orphaned Firebase Auth user
        // to prevent accounts without chatter profiles
        try {
          const { deleteUser } = await import('firebase/auth');
          const currentUser = auth.currentUser;
          if (currentUser) {
            await deleteUser(currentUser);
          }
        } catch (deleteErr) {
          console.error('[ChatterRegister] Failed to cleanup orphaned auth user:', deleteErr);
        }
        throw cfError; // Re-throw to be caught by outer catch
      }

      // Clear stored referral code after successful registration
      clearStoredReferral('chatter');

      // Refresh user data BEFORE showing success to avoid loading flicker
      await refreshUser();

      setSuccess(true);

      // Meta Pixel: Track CompleteRegistration + Ad Attribution + Advanced Matching
      trackMetaCompleteRegistration({
        content_name: 'chatter_registration',
        status: 'completed',
        country: data.country,
        eventID: metaEventId,
      });
      trackAdRegistration({ contentName: 'chatter_registration' });
      setMetaPixelUserData({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        country: data.country,
      });

      // Redirect to Telegram onboarding after short delay (mandatory step)
      setTimeout(() => {
        navigate(telegramRoute, { replace: true });
      }, 2000);
    } catch (err: unknown) {
      console.error('[ChatterRegister] Error:', err);

      // Handle specific Firebase Auth and Cloud Function errors
      let errorMessage = intl.formatMessage({ id: 'chatter.register.error.generic', defaultMessage: 'An error occurred' });

      if (err instanceof Error) {
        const errorCode = (err as { code?: string })?.code || '';
        const message = err.message.toLowerCase();
        const originalMessage = err.message;

        // Firebase Auth errors
        if (errorCode === 'auth/email-already-in-use' || message.includes('email-already-in-use')) {
          // Show special UI for existing email instead of just error message
          setEmailAlreadyExists(true);
          setLoading(false);
          return; // Don't set error, show special UI instead
        } else if (errorCode === 'auth/weak-password' || message.includes('weak-password') || message.includes('6 characters')) {
          errorMessage = intl.formatMessage({
            id: 'chatter.register.error.weakPassword',
            defaultMessage: 'Password is too weak. Please use at least 8 characters.'
          });
        } else if (errorCode === 'auth/invalid-email' || message.includes('invalid-email')) {
          errorMessage = intl.formatMessage({
            id: 'chatter.register.error.invalidEmail',
            defaultMessage: 'Invalid email address.'
          });
        } else if (errorCode === 'auth/network-request-failed' || message.includes('network')) {
          errorMessage = intl.formatMessage({
            id: 'chatter.register.error.network',
            defaultMessage: 'Network error. Please check your connection and try again.'
          });
        }
        // Cloud Function errors (from registerChatter)
        else if (message.includes('avocat') || message.includes('lawyer')) {
          errorMessage = intl.formatMessage({
            id: 'chatter.register.error.isLawyer',
            defaultMessage: 'This email is registered as a lawyer account. Chatters must use a dedicated account. Please use a different email.'
          });
        } else if (message.includes('expatri') || message.includes('expat')) {
          errorMessage = intl.formatMessage({
            id: 'chatter.register.error.isExpat',
            defaultMessage: 'This email is registered as an expat helper account. Chatters must use a dedicated account. Please use a different email.'
          });
        } else if (message.includes('client') && message.includes('plateforme')) {
          errorMessage = intl.formatMessage({
            id: 'chatter.register.error.isActiveClient',
            defaultMessage: 'This email belongs to an active client account. Please use a different email to register as a Chatter.'
          });
        } else if (message.includes('already registered') || message.includes('chatter already')) {
          errorMessage = intl.formatMessage({
            id: 'chatter.register.error.alreadyChatter',
            defaultMessage: 'You already have a Chatter account! Please log in instead.'
          });
        } else if (message.includes('banned')) {
          errorMessage = intl.formatMessage({
            id: 'chatter.register.error.banned',
            defaultMessage: 'This account has been suspended. Please contact support.'
          });
        } else if (message.includes('country') && message.includes('not supported')) {
          errorMessage = intl.formatMessage({
            id: 'chatter.register.error.countryNotSupported',
            defaultMessage: 'Registration is not yet available in your country. Please try again later.'
          });
        } else if (message.includes('registration') && (message.includes('disabled') || message.includes('closed'))) {
          errorMessage = intl.formatMessage({
            id: 'chatter.register.error.registrationDisabled',
            defaultMessage: 'New registrations are temporarily closed. Please try again later.'
          });
        } else if (message.includes('blocked') || message.includes('fraud')) {
          errorMessage = intl.formatMessage({
            id: 'chatter.register.error.blocked',
            defaultMessage: 'Registration blocked. If this is an error, please contact support.'
          });
        } else if (originalMessage) {
          // Use original message if no specific translation
          errorMessage = originalMessage;
        }
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-950 via-gray-950 to-black">
          <div className="w-10 h-10 border-4 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <html lang={langCode === 'ch' ? 'zh' : langCode} />
        <title>{intl.formatMessage({ id: 'chatter.register.seo.title', defaultMessage: 'Chatter Registration | SOS-Expat' })}</title>
        <meta name="description" content={intl.formatMessage({ id: 'chatter.register.seo.description', defaultMessage: 'Sign up as a Chatter to earn money helping travelers. Free registration.' })} />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#991B1B" />
      </Helmet>

      {/* Écran de redirection après inscription réussie */}
      {success ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-red-950 via-gray-950 to-black px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-3xl font-bold text-white mb-3">✅ Inscription réussie !</h2>
            <p className="text-lg text-gray-300 mb-2">Votre compte Chatter a été créé avec succès.</p>
            <p className="text-sm text-gray-400">Redirection vers l'activation Telegram...</p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-950 to-black py-12 px-4">
        {/* Radial glow effect matching landing */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(251,191,36,0.08),transparent_50%)] pointer-events-none" />

        <div className="max-w-lg mx-auto relative z-10">
          {/* Back Button */}
          <button
            onClick={() => navigate(landingRoute)}
            className="flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors mb-6 min-h-[44px]"
            aria-label={intl.formatMessage({ id: 'common.back', defaultMessage: 'Back' })}
          >
            <ArrowLeft className="w-4 h-4" />
            <FormattedMessage id="common.back" defaultMessage="Retour" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center shadow-lg">
              <Star className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-2xl font-black mb-2">
              <FormattedMessage id="chatter.register.title" defaultMessage="Inscription Chatter" />
            </h1>
            <p className="text-gray-400">
              <FormattedMessage id="chatter.register.subtitle" defaultMessage="Rejoignez notre programme ambassadeur" />
            </p>
          </div>

          {/* Success State */}
          {success ? (
            <div className={`${UI.card} p-8 text-center`}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 border flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">
                <FormattedMessage id="chatter.register.success.title" defaultMessage="Inscription réussie !" />
              </h2>
              <p className="text-gray-400 mb-4">
                <FormattedMessage id="chatter.register.success.subtitle" defaultMessage="Vous allez être redirigé vers la configuration Telegram..." />
              </p>
              <div className="w-6 h-6 mx-auto border-2 rounded-full animate-spin" />
            </div>
          ) : emailAlreadyExists ? (
            /* Email Already Exists - Show Login Prompt */
            <div className={`${UI.card} p-8 text-center`}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 border flex items-center justify-center">
                <Mail className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">
                <FormattedMessage id="chatter.register.emailExists.title" defaultMessage="Vous avez déjà un compte !" />
              </h2>
              <p className="text-gray-400 mb-2">
                <FormattedMessage
                  id="chatter.register.emailExists.message"
                  defaultMessage="L'email {email} est déjà enregistré."
                  values={{ email: <strong className="text-white">{existingEmail}</strong> }}
                />
              </p>
              <p className="text-gray-500 mb-6">
                <FormattedMessage
                  id="chatter.register.emailExists.hint"
                  defaultMessage="Connectez-vous pour continuer votre inscription et recevoir votre bonus de $50."
                />
              </p>

              {/* Login Button */}
              <button
                onClick={() => navigate(loginRoute)}
                className="w-full py-4 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-bold rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity mb-4"
              >
                <LogIn className="w-5 h-5" />
                <FormattedMessage id="chatter.register.emailExists.loginButton" defaultMessage="Se connecter" />
              </button>

              {/* Try Different Email */}
              <button
                onClick={() => {
                  setEmailAlreadyExists(false);
                  setExistingEmail('');
                }}
                className="text-sm hover:text-white underline"
              >
                <FormattedMessage id="chatter.register.emailExists.tryDifferent" defaultMessage="Utiliser un autre email" />
              </button>
            </div>
          ) : (
            /* Registration Form */
            <div className={`${UI.card} p-6`}>
              {/* Already registered link */}
              <div className="mb-6 p-3 bg-blue-500/10 rounded-xl border text-center">
                <p className="text-sm">
                  <FormattedMessage id="chatter.register.alreadyRegistered" defaultMessage="Déjà inscrit ?" />{' '}
                  <button
                    onClick={() => navigate(loginRoute)}
                    className="text-blue-400 hover:text-blue-300 font-medium underline"
                  >
                    <FormattedMessage id="chatter.register.loginLink" defaultMessage="Connectez-vous ici" />
                  </button>
                </p>
              </div>

              {/* Referral code banner if present */}
              {referralCodeFromUrl && (
                <div className="mb-6 p-4 bg-green-500/10 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 border rounded-full flex items-center justify-center">
                      <Gift className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-300">
                        <FormattedMessage id="chatter.register.referralDetected" defaultMessage="You've been referred!" />
                      </p>
                      <p className="text-sm">
                        <FormattedMessage
                          id="chatter.register.referralCode.applied"
                          defaultMessage="Referral code {code} will be applied automatically"
                          values={{ code: <strong className="text-green-300">{referralCodeFromUrl}</strong> }}
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
                onErrorClear={() => setError(null)}
                darkMode
              />
            </div>
          )}

          {/* Info */}
          {!success && (
            <p className="text-center mt-6">
              <FormattedMessage
                id="chatter.register.info"
                defaultMessage="En vous inscrivant, vous acceptez les conditions du programme Chatter"
              />
            </p>
          )}
        </div>
      </div>
      )}
    </Layout>
  );
};

export default ChatterRegister;
