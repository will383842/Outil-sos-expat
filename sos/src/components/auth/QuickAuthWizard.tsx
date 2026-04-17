// src/components/auth/QuickAuthWizard.tsx
// Wizard d'authentification rapide pour une UX sans friction
// Flow: Email → Password → Auto Login/Register (sans confirmation)
// NOTE: Google Auth volontairement absent de ce wizard (flux réservation).
// Sur mobile, Google affiche un QR code passkey pour certains comptes ce qui
// crée une friction majeure en plein milieu d'une transaction. Email+mdp = zéro friction.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { X, Mail, Lock, ArrowRight, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { devLog } from '../../utils/devLog';

type WizardStep = 'email' | 'password' | 'loading' | 'success';

interface QuickAuthWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  providerName?: string;
}

const QuickAuthWizard: React.FC<QuickAuthWizardProps> = ({
  isOpen,
  onClose,
  onSuccess,
  providerName,
}) => {
  const intl = useIntl();
  const { login, register, user, authInitialized, isFullyReady } = useAuth();

  // 🔍 [BOOKING_AUTH_DEBUG] Log QuickAuthWizard render
  devLog('[BOOKING_AUTH_DEBUG] 🧙 QuickAuthWizard RENDER', {
    isOpen,
    providerName,
    user: user ? { id: user.id, email: user.email } : null,
    authInitialized,
    isFullyReady,
    selectedProviderInSession: sessionStorage.getItem('selectedProvider') ?
      JSON.parse(sessionStorage.getItem('selectedProvider')!).id : 'NULL',
  });

  // Form state
  const [step, setStep] = useState<WizardStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [pendingSuccess, setPendingSuccess] = useState(false);

  // Refs
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FIX: Track previous isOpen state to only reset on actual modal open (false→true transition)
  const wasOpenRef = useRef(false);
  // FIX: Refs pour avoir les valeurs actuelles dans le polling (éviter stale closures)
  const userRef = useRef(user);
  const authInitializedRef = useRef(authInitialized);
  const isOpenRef = useRef(isOpen);
  // FIX: Track previous user state to detect authentication transition
  const prevUserRef = useRef<typeof user>(null);
  // FIX: Flag to prevent multiple onSuccess calls
  const successCalledRef = useRef(false);
  // FIX: Flag to track if an auth attempt is in progress (Google or email/password)
  // Using sessionStorage instead of ref because refs are reset when component remounts during Google popup
  const AUTH_ATTEMPTED_KEY = 'sos_quickauth_attempted';

  // Helper to check if auth was attempted (survives component remount)
  // P1 FIX: Utilise un timestamp pour expirer les flags stale (>60s)
  // Empêche les faux positifs si le composant est remonté longtemps après un ancien attempt
  const getAuthAttempted = useCallback(() => {
    try {
      const value = sessionStorage.getItem(AUTH_ATTEMPTED_KEY);
      if (!value) return false;
      const timestamp = parseInt(value, 10);
      if (isNaN(timestamp)) return false;
      // Expirer après 60s — un Google popup/redirect devrait finir bien avant
      const isExpired = Date.now() - timestamp > 60000;
      if (isExpired) {
        sessionStorage.removeItem(AUTH_ATTEMPTED_KEY);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // Helper to set auth attempted flag with timestamp
  const setAuthAttempted = useCallback((value: boolean) => {
    try {
      if (value) {
        sessionStorage.setItem(AUTH_ATTEMPTED_KEY, String(Date.now()));
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
    isOpenRef.current = isOpen;
  }, [user, authInitialized, isOpen]);

  // Cleanup: Clear authAttempted flag when modal closes without successful auth
  // FIX: Ne PAS effacer le flag si l'utilisateur est déjà authentifié
  // Cela évite le reset du wizard si l'auth a réussi mais le modal s'est fermé prématurément
  useEffect(() => {
    if (!isOpen) {
      // Modal is closing - clean up the sessionStorage flag if auth wasn't successful
      // This prevents stale flags from affecting future modal opens
      // FIX: Vérifier aussi que l'utilisateur n'est PAS authentifié avant de nettoyer
      const wasAuthAttempted = getAuthAttempted();
      const isUserAuthenticated = !!userRef.current;
      if (wasAuthAttempted && !successCalledRef.current && !isUserAuthenticated) {
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

    // FIX: Si l'utilisateur est déjà authentifié, appeler onSuccess directement
    // Cela gère le cas où l'auth a réussi pendant que le modal était fermé
    if (isOpen && !wasOpen && user && authInitialized && !successCalledRef.current) {
      successCalledRef.current = true;
      setAuthAttempted(false);
      setTimeout(() => {
        onSuccess();
      }, 100);
      return; // Ne pas reset le wizard
    }

    // FIX: Ne PAS reset si une auth était en cours OU si l'utilisateur est authentifié
    if (isOpen && !wasOpen && !authAttemptedFlag && !user) {
      setStep('email');
      setEmail('');
      setPassword('');
      setError(null);
      setShowPassword(false);
      setIsSubmitting(false);
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
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, [isOpen, user, authInitialized, onSuccess, getAuthAttempted, setAuthAttempted]);

  // ✅ FIX PRINCIPAL: Détecter quand user passe de null à truthy pendant que le modal est ouvert
  // Cette approche est plus robuste car elle ne dépend pas de isGoogleLoading ou pendingSuccess
  // qui peuvent être désynchronisés à cause du batching React
  useEffect(() => {
    const prevUser = prevUserRef.current;
    const authAttemptedFlag = getAuthAttempted();

    // 🔍 [BOOKING_AUTH_DEBUG] Log auth detection useEffect
    devLog('[BOOKING_AUTH_DEBUG] 🔍 QuickAuthWizard AUTH DETECTION useEffect', {
      isOpen,
      prevUser: prevUser ? 'EXISTS' : 'NULL',
      user: user ? { id: user.id, email: user.email } : null,
      authInitialized,
      authAttemptedFlag,
      successCalledRef: successCalledRef.current,
      selectedProviderInSession: sessionStorage.getItem('selectedProvider') ?
        JSON.parse(sessionStorage.getItem('selectedProvider')!).id : 'NULL',
    });

    // CONDITION 1: Transition null→truthy détectée via prevUserRef
    // Si le modal est ouvert ET user vient de passer de null/undefined à truthy
    // ET on n'a pas encore appelé onSuccess => l'authentification vient de réussir
    const isNullToTruthyTransition = isOpen && !prevUser && user && authInitialized && !successCalledRef.current;

    // CONDITION 2: Auth attempt flag + user exists (backup pour les cas où prevUserRef est réinitialisé)
    // Cela gère le cas où le composant est remonté pendant le popup Google
    // Now using sessionStorage which survives component remount!
    const isAuthAttemptCompleted = isOpen && authAttemptedFlag && user && authInitialized && !successCalledRef.current;

    devLog('[BOOKING_AUTH_DEBUG] 🔍 QuickAuthWizard conditions:', {
      isNullToTruthyTransition,
      isAuthAttemptCompleted,
    });

    if (isNullToTruthyTransition || isAuthAttemptCompleted) {
      devLog('[BOOKING_AUTH_DEBUG] ✅ QuickAuthWizard AUTH SUCCESS DETECTED - calling onSuccess()');
      successCalledRef.current = true; // Prevent multiple calls
      setAuthAttempted(false); // Reset auth attempt flag in sessionStorage
      // Clear any pending states
      setPendingSuccess(false);
      // Small delay to ensure UI shows success briefly
      setTimeout(() => {
        devLog('[BOOKING_AUTH_DEBUG] 🚀 QuickAuthWizard calling onSuccess() NOW');
        onSuccess();
      }, 100);
      return;
    }

    // Update prevUserRef for next render
    prevUserRef.current = user;
  }, [isOpen, user, authInitialized, isFullyReady, onSuccess, step, pendingSuccess, getAuthAttempted, setAuthAttempted]);

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
    // Timeout 30s (60 attempts * 500ms) — aligned with AuthContext's 30s max
    const maxAttempts = 60;

    const pollInterval = setInterval(() => {
      // Check if success was already called by another effect
      if (successCalledRef.current) {
        clearInterval(pollInterval);
        return;
      }

      // FIX: Arrêter le polling si le modal est fermé
      if (!isOpenRef.current) {
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
        // FIX: Ne PAS fermer le modal sur timeout - revenir à l'étape password
        // pour permettre à l'utilisateur de réessayer ou voir l'erreur
        clearInterval(pollInterval);
        setPendingSuccess(false);
        setStep('password');
        setError(intl.formatMessage({ id: 'auth.wizard.error.timeout' }));
        // NE PAS appeler onClose() - cela causait le reset du wizard
      }
    }, 500);

    return () => {
      clearInterval(pollInterval);
    };
  }, [pendingSuccess, step, onSuccess, intl]);

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
  // FIX: Firebase "Email Enumeration Protection" empêche de vérifier si un email existe
  // Donc on essaie login → si échec → on essaie register → si email-already-in-use → mauvais mot de passe
  const handlePasswordSubmit = useCallback(async () => {
    if (!password) {
      setError(intl.formatMessage({ id: 'auth.wizard.passwordRequired' }));
      return;
    }
    if (password.length < 8) {
      setError(intl.formatMessage({ id: 'auth.wizard.passwordTooShort' }));
      return;
    }

    // 🔍 [BOOKING_AUTH_DEBUG] Log email/password submit
    devLog('[BOOKING_AUTH_DEBUG] 📝 QuickAuthWizard EMAIL/PASSWORD SUBMIT', {
      email,
      selectedProviderInSession: sessionStorage.getItem('selectedProvider') ?
        JSON.parse(sessionStorage.getItem('selectedProvider')!).id : 'NULL',
    });

    // FIX: Mark that an auth attempt is in progress
    // Using sessionStorage so it survives component remounts
    setAuthAttempted(true);
    setIsSubmitting(true);
    setError(null);

    // Helper: feedback UX complet après une erreur d'auth
    // (toast visible partout, focus + clear du champ password, vibration mobile)
    const surfaceAuthError = (msg: string) => {
      setError(msg);
      try { toast.error(msg, { duration: 5000 }); } catch {}
      try { (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate?.(80); } catch {}
      setPassword('');
      window.requestAnimationFrame(() => {
        passwordInputRef.current?.focus();
        passwordInputRef.current?.select?.();
      });
    };

    try {
      // Try to login first — rememberMe=true pour persistance longue durée (Option C)
      devLog('[BOOKING_AUTH_DEBUG] 🔐 QuickAuthWizard calling login()...');
      await login(email, password, true);
      devLog('[BOOKING_AUTH_DEBUG] ✅ QuickAuthWizard login() SUCCESS');
      setIsSubmitting(false);
      setStep('success');
      // FIX: Attendre que user Firestore soit chargé avant de naviguer
      setPendingSuccess(true);
    } catch (err) {
      const errorCode = (err as { code?: string }).code;

      // FIX: Firebase "Email Enumeration Protection" fait que auth/invalid-credential
      // peut signifier soit "user n'existe pas" soit "mauvais mot de passe"
      // On ne peut pas distinguer les deux côté client.
      // Solution: On essaie de s'inscrire. Si l'email existe déjà, Firebase retournera
      // auth/email-already-in-use, ce qui confirme que c'était un mauvais mot de passe.

      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
        // Essayer l'auto-inscription
        devLog('[BOOKING_AUTH_DEBUG] 🔐 QuickAuthWizard login failed, trying REGISTER...', { errorCode });
        try {
          setIsNewUser(true);
          devLog('[BOOKING_AUTH_DEBUG] 📝 QuickAuthWizard calling register()...');
          await register({
            email: email,
            role: 'client',
          }, password);
          // Inscription réussie = nouvel utilisateur créé
          devLog('[BOOKING_AUTH_DEBUG] ✅ QuickAuthWizard register() SUCCESS');
          setIsSubmitting(false);
          setStep('success');
          setPendingSuccess(true);
        } catch (regErr) {
          const regErrorCode = (regErr as { code?: string }).code;
          setIsSubmitting(false);
          setIsNewUser(false);

          if (regErrorCode === 'auth/email-already-in-use') {
            // L'email existe déjà = c'était bien un mauvais mot de passe lors du login
            surfaceAuthError(intl.formatMessage({
              id: 'auth.wizard.wrongPassword',
              defaultMessage: "Mot de passe incorrect. Réessayez ou cliquez sur « Mot de passe oublié ».",
            }));
          } else if (regErrorCode === 'auth/weak-password') {
            surfaceAuthError(intl.formatMessage({ id: 'auth.wizard.weakPassword', defaultMessage: "Mot de passe trop faible (minimum 8 caractères)." }));
          } else {
            surfaceAuthError(intl.formatMessage({ id: 'auth.wizard.error.register', defaultMessage: "Erreur lors de l'inscription. Réessayez." }));
          }
        }
      } else if (errorCode === 'auth/too-many-requests') {
        setIsSubmitting(false);
        surfaceAuthError(intl.formatMessage({ id: 'auth.wizard.tooManyAttempts', defaultMessage: "Trop de tentatives. Réessayez dans quelques minutes." }));
      } else if (errorCode === 'auth/network-request-failed') {
        setIsSubmitting(false);
        surfaceAuthError(intl.formatMessage({ id: 'auth.networkError', defaultMessage: "Problème de connexion réseau. Vérifiez votre internet." }));
      } else {
        setIsSubmitting(false);
        surfaceAuthError(intl.formatMessage({ id: 'auth.wizard.error.login', defaultMessage: "Erreur de connexion. Réessayez." }));
      }
    }
  }, [email, password, login, register, intl, onSuccess, setAuthAttempted]);

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
                  disabled={isSubmitting}
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
                disabled={!email || isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
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
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
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
                    terms: (chunks) => <a href="/terms-clients" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">{chunks}</a>,
                    privacy: (chunks) => <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">{chunks}</a>,
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
