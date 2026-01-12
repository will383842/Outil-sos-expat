// src/pages/PasswordResetConfirm.tsx
/**
 * Password Reset Confirmation Page
 *
 * Handles the oobCode from Firebase password reset emails.
 * Users land here after clicking the reset link in their email.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocaleNavigate } from '../multilingual-system';
import { Lock, CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff, Shield } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import { useApp } from '../contexts/AppContext';
import { auth } from '../config/firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';

interface FormData {
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

// Translation hook
const useTranslation = () => {
  const { language } = useApp();

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      'title': {
        fr: 'Nouveau mot de passe',
        en: 'New Password'
      },
      'subtitle': {
        fr: 'Choisis un mot de passe solide pour ton compte',
        en: 'Choose a strong password for your account'
      },
      'password_label': {
        fr: 'Nouveau mot de passe',
        en: 'New password'
      },
      'password_placeholder': {
        fr: 'Minimum 6 caracteres',
        en: 'Minimum 6 characters'
      },
      'confirm_label': {
        fr: 'Confirmer le mot de passe',
        en: 'Confirm password'
      },
      'confirm_placeholder': {
        fr: 'Retape ton mot de passe',
        en: 'Retype your password'
      },
      'submit_button': {
        fr: 'Changer mon mot de passe',
        en: 'Change my password'
      },
      'submitting': {
        fr: 'Modification en cours...',
        en: 'Changing password...'
      },
      'success_title': {
        fr: 'Mot de passe modifie !',
        en: 'Password changed!'
      },
      'success_message': {
        fr: 'Tu peux maintenant te connecter avec ton nouveau mot de passe.',
        en: 'You can now login with your new password.'
      },
      'go_to_login': {
        fr: 'Aller a la connexion',
        en: 'Go to login'
      },
      'error.invalid_code': {
        fr: 'Ce lien a expire ou est invalide. Demande un nouveau lien de reinitialisation.',
        en: 'This link has expired or is invalid. Request a new reset link.'
      },
      'error.expired_code': {
        fr: 'Ce lien a expire. Demande un nouveau lien de reinitialisation.',
        en: 'This link has expired. Request a new reset link.'
      },
      'error.weak_password': {
        fr: 'Le mot de passe doit contenir au moins 6 caracteres.',
        en: 'Password must be at least 6 characters.'
      },
      'error.passwords_mismatch': {
        fr: 'Les mots de passe ne correspondent pas.',
        en: 'Passwords do not match.'
      },
      'error.generic': {
        fr: 'Une erreur est survenue. Reessaie.',
        en: 'An error occurred. Please try again.'
      },
      'request_new_link': {
        fr: 'Demander un nouveau lien',
        en: 'Request a new link'
      },
      'verifying': {
        fr: 'Verification du lien...',
        en: 'Verifying link...'
      },
      'back_to_login': {
        fr: 'Retour a la connexion',
        en: 'Back to login'
      }
    };

    const lang = language?.startsWith('fr') ? 'fr' : 'en';
    return translations[key]?.[lang] || key;
  };

  return { t, language };
};

const PasswordResetConfirm: React.FC = React.memo(() => {
  const navigate = useLocaleNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  // States
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [codeValid, setCodeValid] = useState(false);

  // Get oobCode from URL
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  // Verify the reset code on mount
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setFormErrors({ general: t('error.invalid_code') });
        setIsVerifying(false);
        return;
      }

      try {
        // Verify the code and get the associated email
        const email = await verifyPasswordResetCode(auth, oobCode);
        setUserEmail(email);
        setCodeValid(true);
      } catch (error: unknown) {
        const err = error as { code?: string };
        console.error('Code verification error:', err);

        if (err.code === 'auth/expired-action-code') {
          setFormErrors({ general: t('error.expired_code') });
        } else if (err.code === 'auth/invalid-action-code') {
          setFormErrors({ general: t('error.invalid_code') });
        } else {
          setFormErrors({ general: t('error.invalid_code') });
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifyCode();
  }, [oobCode, t]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    if (!formData.password || formData.password.length < 6) {
      errors.password = t('error.weak_password');
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('error.passwords_mismatch');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, t]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !oobCode) return;

    setIsLoading(true);
    setFormErrors({});

    try {
      // Confirm the password reset with Firebase
      await confirmPasswordReset(auth, oobCode, formData.password);
      setIsSuccess(true);

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);

    } catch (error: unknown) {
      const err = error as { code?: string };
      console.error('Password reset error:', err);

      if (err.code === 'auth/expired-action-code') {
        setFormErrors({ general: t('error.expired_code') });
      } else if (err.code === 'auth/invalid-action-code') {
        setFormErrors({ general: t('error.invalid_code') });
      } else if (err.code === 'auth/weak-password') {
        setFormErrors({ password: t('error.weak_password') });
      } else {
        setFormErrors({ general: t('error.generic') });
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData, oobCode, validateForm, navigate, t]);

  // Handle input changes
  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear field error on change
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Loading state while verifying code
  if (isVerifying) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-white/80">{t('verifying')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state - invalid or expired code
  if (!codeValid && !isSuccess) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-4">
                {t('error.invalid_code').split('.')[0]}
              </h1>

              <p className="text-white/70 mb-8">
                {formErrors.general}
              </p>

              <div className="space-y-4">
                <Button
                  onClick={() => navigate('/password-reset')}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                >
                  {t('request_new_link')}
                </Button>

                <button
                  onClick={() => navigate('/login')}
                  className="w-full text-white/60 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} />
                  {t('back_to_login')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-4">
                {t('success_title')}
              </h1>

              <p className="text-white/70 mb-8">
                {t('success_message')}
              </p>

              <Button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              >
                {t('go_to_login')}
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Main form
  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 px-4 py-12">
        <div className="max-w-md w-full">
          {/* Back link */}
          <button
            onClick={() => navigate('/login')}
            className="mb-8 text-white/60 hover:text-white transition-colors flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={16} />
            {t('back_to_login')}
          </button>

          {/* Main card */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {t('title')}
              </h1>
              <p className="text-white/60">
                {t('subtitle')}
              </p>
              {userEmail && (
                <p className="text-white/40 text-sm mt-2">
                  {userEmail}
                </p>
              )}
            </div>

            {/* Error message */}
            {formErrors.general && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{formErrors.general}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Password field */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  {t('password_label')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange('password')}
                    placeholder={t('password_placeholder')}
                    className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${
                      formErrors.password ? 'border-red-500/50' : 'border-white/20'
                    }`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="mt-2 text-sm text-red-400">{formErrors.password}</p>
                )}
              </div>

              {/* Confirm password field */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  {t('confirm_label')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    placeholder={t('confirm_placeholder')}
                    className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all ${
                      formErrors.confirmPassword ? 'border-red-500/50' : 'border-white/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-400">{formErrors.confirmPassword}</p>
                )}
              </div>

              {/* Security note */}
              <div className="flex items-start gap-3 text-white/50 text-xs">
                <Shield size={16} className="flex-shrink-0 mt-0.5" />
                <p>Ton mot de passe est chiffre et securise. Nous ne le stockons jamais en clair.</p>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 py-3"
              >
                {isLoading ? t('submitting') : t('submit_button')}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
});

PasswordResetConfirm.displayName = 'PasswordResetConfirm';

export default PasswordResetConfirm;
