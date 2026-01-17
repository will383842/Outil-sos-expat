// src/components/auth/QuickAuthWizard.tsx
// Wizard d'authentification rapide pour une UX sans friction
// Flow: Email → Password → Auto Login/Register (sans confirmation)

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { X, Mail, Lock, ArrowRight, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Google Icon SVG
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

type WizardStep = 'email' | 'password' | 'loading' | 'success';

interface QuickAuthWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  providerName?: string;
  /** URL to redirect to after Google login (for booking flow) */
  bookingRedirectUrl?: string;
}

const QuickAuthWizard: React.FC<QuickAuthWizardProps> = ({
  isOpen,
  onClose,
  onSuccess,
  providerName,
  bookingRedirectUrl,
}) => {
  const intl = useIntl();
  const { login, loginWithGoogle, register, user, authInitialized, isFullyReady } = useAuth();

  // Form state
  const [step, setStep] = useState<WizardStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [pendingSuccess, setPendingSuccess] = useState(false);

  // Refs
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const googleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FIX: Track previous isOpen state to only reset on actual modal open (false→true transition)
  const wasOpenRef = useRef(false);
  // FIX: Refs pour avoir les valeurs actuelles dans le polling (éviter stale closures)
  const userRef = useRef(user);
  const authInitializedRef = useRef(authInitialized);
  // FIX: Track previous user state to detect authentication transition
  const prevUserRef = useRef<typeof user>(null);
  // FIX: Flag to prevent multiple onSuccess calls
  const successCalledRef = useRef(false);
  // FIX: Flag to track if an auth attempt is in progress (Google or email/password)
  // Using sessionStorage instead of ref because refs are reset when component remounts during Google popup
  const AUTH_ATTEMPTED_KEY = 'sos_quickauth_attempted';

  // Helper to check if auth was attempted (survives component remount)
  const getAuthAttempted = useCallback(() => {
    try {
      return sessionStorage.getItem(AUTH_ATTEMPTED_KEY) === 'true';
    } catch {
      return false;
    }
  }, []);

  // Helper to set auth attempted flag
  const setAuthAttempted = useCallback((value: boolean) => {
    try {
      if (value) {
        sessionStorage.setItem(AUTH_ATTEMPTED_KEY, 'true');
      } else {
        sessionStorage.removeItem(AUTH_ATTEMPTED_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Mettre à jour les refs à chaque render
  useEffect(() => {
    userRef.current = user;
    authInitializedRef.current = authInitialized;
  }, [user, authInitialized]);

  // Cleanup: Clear authAttempted flag when modal closes without successful auth
  useEffect(() => {
    if (!isOpen) {
      // Modal is closing - clean up the sessionStorage flag if auth wasn't successful
      // This prevents stale flags from affecting future modal opens
      const wasAuthAttempted = getAuthAttempted();
      if (wasAuthAttempted && !successCalledRef.current) {
        setAuthAttempted(false);
      }
    }
  }, [isOpen, getAuthAttempted, setAuthAttempted]);

  // Reset ONLY when modal transitions from closed to open (not on re-renders while open)
  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;

    // Only reset if transitioning from closed (false) to open (true)
    // This prevents losing form data during re-renders while the modal is open
    // IMPORTANT: Also check that we're not in the middle of an auth attempt
    // (the component can remount during Google popup, which would falsely trigger a reset)
    const authAttemptedFlag = getAuthAttempted();

    if (isOpen && !wasOpen && !authAttemptedFlag) {
      setStep('email');
      setEmail('');
      setPassword('');
      setError(null);
      setShowPassword(false);
      setIsSubmitting(false);
      setIsGoogleLoading(false);
      setIsNewUser(false);
      setPendingSuccess(false);
      // Reset success flag when modal opens
      successCalledRef.current = false;
      setAuthAttempted(false);
      prevUserRef.current = user; // Capture current user state at modal open
      // Focus email input after animation
      setTimeout(() => emailInputRef.current?.focus(), 300);
    }
    // Cleanup timeouts on close
    return () => {
      if (googleTimeoutRef.current) {
        clearTimeout(googleTimeoutRef.current);
      }
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, [isOpen, user, getAuthAttempted, setAuthAttempted]);

  // ✅ FIX PRINCIPAL: Détecter quand user passe de null à truthy pendant que le modal est ouvert
  // Cette approche est plus robuste car elle ne dépend pas de isGoogleLoading ou pendingSuccess
  // qui peuvent être désynchronisés à cause du batching React
  useEffect(() => {
    const prevUser = prevUserRef.current;
    const authAttemptedFlag = getAuthAttempted();

    // CONDITION 1: Transition null→truthy détectée via prevUserRef
    // Si le modal est ouvert ET user vient de passer de null/undefined à truthy
    // ET on n'a pas encore appelé onSuccess => l'authentification vient de réussir
    const isNullToTruthyTransition = isOpen && !prevUser && user && authInitialized && !successCalledRef.current;

    // CONDITION 2: Auth attempt flag + user exists (backup pour les cas où prevUserRef est réinitialisé)
    // Cela gère le cas où le composant est remonté pendant le popup Google
    // Now using sessionStorage which survives component remount!
    const isAuthAttemptCompleted = isOpen && authAttemptedFlag && user && authInitialized && !successCalledRef.current;

    if (isNullToTruthyTransition || isAuthAttemptCompleted) {
      successCalledRef.current = true; // Prevent multiple calls
      setAuthAttempted(false); // Reset auth attempt flag in sessionStorage
      // Clear any pending states
      setIsGoogleLoading(false);
      setPendingSuccess(false);
      // Small delay to ensure UI shows success briefly
      setTimeout(() => {
        onSuccess();
      }, 100);
      return;
    }

    // Update prevUserRef for next render
    prevUserRef.current = user;
  }, [isOpen, user, authInitialized, isFullyReady, onSuccess, step, isGoogleLoading, pendingSuccess, getAuthAttempted, setAuthAttempted]);

  // Fallback: gérer le cas où pendingSuccess est true (login email/password classique)
  useEffect(() => {
    // Si pendingSuccess est true, step est 'success', et user est authentifié
    // ET on n'a pas encore appelé onSuccess
    if (pendingSuccess && step === 'success' && user && authInitialized && !successCalledRef.current) {
      successCalledRef.current = true;
      setPendingSuccess(false);
      setTimeout(() => {
        onSuccess();
      }, 300);
    }
  }, [pendingSuccess, step, user, authInitialized, isFullyReady, onSuccess]);

  // ✅ FIX BUG: Polling de secours pour détecter l'authentification
  // React peut parfois ne pas re-render quand les valeurs du contexte changent
  // Ce polling vérifie toutes les 500ms si l'utilisateur est authentifié
  // On utilise les refs pour avoir les valeurs actuelles (éviter stale closures)
  useEffect(() => {
    // Ne pas démarrer le polling si success déjà appelé
    if (successCalledRef.current) {
      return;
    }

    if (!pendingSuccess || step !== 'success') {
      return;
    }

    // Déjà authentifié? L'effet principal s'en chargera
    if (userRef.current && authInitializedRef.current) {
      return;
    }

    let attempts = 0;
    const maxAttempts = 20; // 10 secondes max

    const pollInterval = setInterval(() => {
      // Check if success was already called by another effect
      if (successCalledRef.current) {
        clearInterval(pollInterval);
        return;
      }

      attempts++;
      const currentUser = userRef.current;
      const currentAuthInitialized = authInitializedRef.current;

      // Vérifier les valeurs actuelles via les refs
      if (currentUser && currentAuthInitialized) {
        clearInterval(pollInterval);
        successCalledRef.current = true;
        setPendingSuccess(false);
        onSuccess();
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        setPendingSuccess(false);
        // Fermer le popup même en cas de timeout pour éviter qu'il reste bloqué
        onClose();
      }
    }, 500);

    return () => {
      clearInterval(pollInterval);
    };
  }, [pendingSuccess, step, onSuccess, onClose]);

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim().toLowerCase());
  };

  // Handle email submission - move to password step
  const handleEmailSubmit = useCallback(() => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      setError(intl.formatMessage({ id: 'auth.wizard.invalidEmail' }));
      return;
    }

    setEmail(trimmedEmail);
    setError(null);
    setStep('password');
    setTimeout(() => passwordInputRef.current?.focus(), 100);
  }, [email, intl]);

  // Handle password submission - try login first, then register if needed
  const handlePasswordSubmit = useCallback(async () => {
    if (!password) {
      setError(intl.formatMessage({ id: 'auth.wizard.passwordRequired' }));
      return;
    }
    if (password.length < 6) {
      setError(intl.formatMessage({ id: 'auth.wizard.passwordTooShort' }));
      return;
    }

    // FIX: Mark that an auth attempt is in progress
    // Using sessionStorage so it survives component remounts
    setAuthAttempted(true);
    setIsSubmitting(true);
    setError(null);

    try {
      // Try to login first
      await login(email, password);
      setIsSubmitting(false);
      setStep('success');
      // FIX: Attendre que user Firestore soit chargé avant de naviguer
      setPendingSuccess(true);
    } catch (err) {
      // FIX: auth/invalid-credential peut signifier:
      // 1. User n'existe pas (devrait être auth/user-not-found mais Firebase renvoie parfois invalid-credential)
      // 2. Mauvais mot de passe
      // On ne peut pas distinguer les deux, donc on affiche un message générique
      // et on ne tente PAS l'auto-inscription (qui créerait un compte non voulu)

      if ((err as { code?: string }).code === 'auth/user-not-found') {
        // User n'existe clairement pas - auto register
        try {
          setIsNewUser(true);
          await register({
            email: email,
            role: 'client',
          }, password);
          setIsSubmitting(false);
          setStep('success');
          setPendingSuccess(true);
        } catch (regErr) {
          setIsSubmitting(false);
          setIsNewUser(false);

          if ((regErr as { code?: string }).code === 'auth/weak-password') {
            setError(intl.formatMessage({ id: 'auth.wizard.weakPassword' }));
          } else {
            setError(intl.formatMessage({ id: 'auth.wizard.error.register' }));
          }
        }
      } else if ((err as { code?: string }).code === 'auth/invalid-credential' || (err as { code?: string }).code === 'auth/wrong-password') {
        // FIX: Traiter invalid-credential comme mauvais mot de passe (plus sûr)
        setIsSubmitting(false);
        setError(intl.formatMessage({ id: 'auth.wizard.wrongPassword' }));
      } else if ((err as { code?: string }).code === 'auth/too-many-requests') {
        setIsSubmitting(false);
        setError(intl.formatMessage({ id: 'auth.wizard.tooManyAttempts' }));
      } else {
        setIsSubmitting(false);
        setError(intl.formatMessage({ id: 'auth.wizard.error.login' }));
      }
    }
  }, [email, password, login, register, intl, onSuccess, setAuthAttempted]);

  // Handle Google login with timeout protection
  const handleGoogleLogin = useCallback(async () => {
    // FIX: Mark that an auth attempt is in progress
    // Using sessionStorage so it survives component remounts during Google popup
    setAuthAttempted(true);
    setIsGoogleLoading(true);
    setError(null);

    // Set a timeout to reset loading state after 30 seconds
    googleTimeoutRef.current = setTimeout(() => {
      setIsGoogleLoading(false);
      setError(intl.formatMessage({ id: 'auth.wizard.error.timeout' }));
    }, 30000);

    try {
      // FIX: Ne PAS sauvegarder dans sessionStorage pour le popup!
      // AuthContext ferait window.location.href qui entre en conflit avec onSuccess()
      // On sauvegarde seulement si popup échoue et fallback vers redirect (voir catch ci-dessous)
      // Le callback onSuccess() gère la navigation pour le cas popup
      await loginWithGoogle(true);
      // Clear timeout on success
      if (googleTimeoutRef.current) {
        clearTimeout(googleTimeoutRef.current);
      }
      setIsGoogleLoading(false);
      setStep('success');
      // FIX: Attendre que user Firestore soit chargé avant de naviguer
      setPendingSuccess(true);
    } catch (err) {
      // Clear timeout on error
      if (googleTimeoutRef.current) {
        clearTimeout(googleTimeoutRef.current);
      }
      setIsGoogleLoading(false);

      if ((err as { code?: string }).code === 'auth/popup-closed-by-user') {
        // User closed popup - no error needed
        return;
      }
      if ((err as { code?: string }).code === 'auth/popup-blocked') {
        setError(intl.formatMessage({ id: 'auth.wizard.popupBlocked' }));
      } else if ((err as { code?: string }).code === 'auth/cancelled-popup-request') {
        // Another popup was opened - ignore
        return;
      } else if ((err as { code?: string }).code === 'auth/network-request-failed') {
        setError(intl.formatMessage({ id: 'auth.wizard.error.network' }));
      } else {
        setError(intl.formatMessage({ id: 'auth.wizard.error.google' }));
      }
    }
  }, [loginWithGoogle, intl, setAuthAttempted]);

  // Handle form submit based on current step
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (step === 'email') {
      handleEmailSubmit();
    } else if (step === 'password') {
      handlePasswordSubmit();
    }
  }, [step, handleEmailSubmit, handlePasswordSubmit]);

  // Go back to email step
  const goBack = useCallback(() => {
    setStep('email');
    setPassword('');
    setError(null);
    setIsNewUser(false);
    setTimeout(() => emailInputRef.current?.focus(), 100);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-md bg-gradient-to-b from-gray-900 to-gray-950 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-slide-up sm:animate-fade-in"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          {/* Back button for password step */}
          {step === 'password' && (
            <button
              onClick={goBack}
              className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label={intl.formatMessage({ id: 'action.back' })}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label={intl.formatMessage({ id: 'common.close' })}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {step === 'success' ? (
                <FormattedMessage id="auth.wizard.success.title" />
              ) : step === 'password' ? (
                <FormattedMessage id="auth.wizard.password.title" defaultMessage="Entrez votre mot de passe" />
              ) : (
                <FormattedMessage id="auth.wizard.title" />
              )}
            </h2>
            {step === 'email' && providerName && (
              <p className="text-gray-400 text-sm">
                <FormattedMessage
                  id="auth.wizard.subtitle"
                  values={{ provider: providerName }}
                />
              </p>
            )}
            {step === 'password' && (
              <p className="text-gray-400 text-sm mt-1">{email}</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-8">
          {/* Success State */}
          {step === 'success' && (
            <div className="flex flex-col items-center py-8">
              {pendingSuccess && !user ? (
                // Attente que les données Firestore soient chargées
                <>
                  <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
                  <p className="text-gray-400 text-sm">
                    <FormattedMessage id="auth.wizard.success.loading" defaultMessage="Chargement de votre profil..." />
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <p className="text-white font-medium">
                    {isNewUser ? (
                      <FormattedMessage id="auth.wizard.success.registered" defaultMessage="Compte créé avec succès !" />
                    ) : (
                      <FormattedMessage id="auth.wizard.success.message" />
                    )}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Loading State */}
          {step === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
              <p className="text-gray-400">
                <FormattedMessage id="auth.wizard.loading" />
              </p>
            </div>
          )}

          {/* Email Step */}
          {step === 'email' && (
            <form onSubmit={handleSubmit} className="space-y-4" id="quick-auth-email-form">
              {/* Google Button - Primary */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-4 px-4 bg-white hover:bg-gray-100 text-gray-800 font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 min-h-[56px]"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon />
                    <FormattedMessage id="auth.wizard.continueGoogle" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center py-2">
                <div className="flex-1 border-t border-white/20" />
                <span className="px-4 text-gray-500 text-sm">
                  <FormattedMessage id="auth.wizard.or" />
                </span>
                <div className="flex-1 border-t border-white/20" />
              </div>

              {/* Email Input */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={emailInputRef}
                  id="quick-auth-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder={intl.formatMessage({ id: 'auth.wizard.emailPlaceholder' })}
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 transition-colors min-h-[56px]"
                  autoComplete="email"
                  disabled={isSubmitting || isGoogleLoading}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!email || isSubmitting || isGoogleLoading}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
              >
                <FormattedMessage id="auth.wizard.continueEmail" defaultMessage="Continuer avec l'email" />
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <form onSubmit={handleSubmit} className="space-y-4" id="quick-auth-password-form">
              {/* Password Input */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={passwordInputRef}
                  id="quick-auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder={intl.formatMessage({ id: 'auth.wizard.passwordPlaceholder' })}
                  className="w-full pl-12 pr-12 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 transition-colors min-h-[56px]"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Helper text */}
              <p className="text-gray-500 text-xs text-center">
                <FormattedMessage
                  id="auth.wizard.password.helper"
                  defaultMessage="Si vous n'avez pas de compte, un nouveau sera créé automatiquement"
                />
              </p>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!password || isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <FormattedMessage id="auth.wizard.continue" defaultMessage="Continuer" />
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Forgot Password Link */}
              <p className="text-center">
                <a
                  href="/password-reset"
                  className="text-gray-400 hover:text-white text-sm underline"
                >
                  <FormattedMessage id="auth.wizard.forgotPassword" />
                </a>
              </p>

              {/* Terms - shown since account might be created */}
              <p className="text-center text-gray-500 text-xs">
                <FormattedMessage
                  id="auth.wizard.terms"
                  values={{
                    terms: (chunks) => <a href="/terms-clients" className="text-red-400 hover:underline">{chunks}</a>,
                    privacy: (chunks) => <a href="/privacy" className="text-red-400 hover:underline">{chunks}</a>,
                  }}
                />
              </p>
            </form>
          )}
        </div>

        {/* Safe area padding for mobile */}
        <div className="h-safe-area-inset-bottom" />
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fade-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .h-safe-area-inset-bottom {
          height: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </div>
  );
};

export default QuickAuthWizard;
