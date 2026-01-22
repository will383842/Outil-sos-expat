// src/components/feedback/FeedbackForm.tsx
// Formulaire de feedback complet avec validation
import React, { useState, useRef } from 'react';
import {
  Bug,
  Frown,
  Lightbulb,
  HelpCircle,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { useIntl } from 'react-intl';
import { useAuth } from '../../contexts/AuthContext';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { useFeedback } from '../../hooks/useFeedback';
import type { UserRole as FeedbackUserRole, FeedbackData } from '../../services/feedback';
import dashboardLog from '../../utils/dashboardLogger';

interface FeedbackFormProps {
  onClose: () => void;
  pageContext?: string;
}

type FeedbackType = 'bug' | 'ux_friction' | 'suggestion' | 'other';
type PriorityLevel = 'blocking' | 'annoying' | 'minor';

const FEEDBACK_TYPES: { value: FeedbackType; icon: React.ElementType; labelKey: string }[] = [
  { value: 'bug', icon: Bug, labelKey: 'feedback.type.bug' },
  { value: 'ux_friction', icon: Frown, labelKey: 'feedback.type.uxFriction' },
  { value: 'suggestion', icon: Lightbulb, labelKey: 'feedback.type.suggestion' },
  { value: 'other', icon: HelpCircle, labelKey: 'feedback.type.other' },
];

const PRIORITY_LEVELS: { value: PriorityLevel; labelKey: string; descKey: string }[] = [
  { value: 'blocking', labelKey: 'feedback.priority.blocking', descKey: 'feedback.priority.blocking.desc' },
  { value: 'annoying', labelKey: 'feedback.priority.annoying', descKey: 'feedback.priority.annoying.desc' },
  { value: 'minor', labelKey: 'feedback.priority.minor', descKey: 'feedback.priority.minor.desc' },
];

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onClose, pageContext }) => {
  const intl = useIntl();
  const { user } = useAuth();
  const { submitFeedback, isSubmitting } = useFeedback();
  const {
    isMobile,
    isTablet,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    screenWidth,
    screenHeight,
    breakpoint
  } = useDeviceDetection();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États du formulaire
  const [email, setEmail] = useState(user?.email || '');
  const [feedbackType, setFeedbackType] = useState<FeedbackType | ''>('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel | ''>('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // États UI
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isDescriptionValid = description.trim().length >= 10;
  // Email TOUJOURS obligatoire (requis par Firestore rules)
  const isFormValid = email && isEmailValid && feedbackType && isDescriptionValid;

  // Gestion du screenshot
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(intl.formatMessage({
          id: 'feedback.error.fileTooLarge',
          defaultMessage: 'Le fichier est trop volumineux (max 5MB)'
        }));
        return;
      }

      // Vérifier le type
      if (!file.type.startsWith('image/')) {
        setError(intl.formatMessage({
          id: 'feedback.error.invalidFileType',
          defaultMessage: 'Seules les images sont acceptées'
        }));
        return;
      }

      setScreenshot(file);
      setError(null);

      // Créer la preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ============= DEBUG LOGS - FEEDBACK FORM =============
    console.log('%c📝 [FeedbackForm] SUBMIT CLICKED', 'background: #9C27B0; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold; font-size: 14px;');
    console.log('%c📝 [FeedbackForm] Form State at Submit', 'background: #673AB7; color: white; padding: 2px 6px; border-radius: 3px;', {
      isFormValid,
      email: email ? email.substring(0, 15) + '...' : 'EMPTY',
      isEmailValid,
      feedbackType: feedbackType || 'NOT_SELECTED',
      descriptionLength: description.length,
      isDescriptionValid,
      priority: priority || 'NOT_SET',
      hasScreenshot: !!screenshot,
      pageContext,
      userLoggedIn: !!user,
      userId: user?.uid || user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
    });

    dashboardLog.click('FeedbackForm: Submit button clicked');
    dashboardLog.group('Feedback Form Submission');

    dashboardLog.state('Form validation state', {
      isFormValid,
      email,
      isEmailValid,
      feedbackType,
      descriptionLength: description.length,
      isDescriptionValid,
    });

    if (!isFormValid) {
      console.warn('%c⚠️ [FeedbackForm] VALIDATION FAILED', 'background: #FF9800; color: black; padding: 2px 6px; border-radius: 3px;', {
        emailMissing: !email,
        emailInvalid: email && !isEmailValid,
        feedbackTypeMissing: !feedbackType,
        descriptionTooShort: !isDescriptionValid,
        descriptionLength: description.length,
      });
      dashboardLog.warn('Form validation failed - submission aborted', {
        email: !!email,
        isEmailValid,
        feedbackType: !!feedbackType,
        isDescriptionValid,
      });
      dashboardLog.groupEnd();
      return;
    }

    console.log('%c✅ [FeedbackForm] Validation PASSED - proceeding with submission', 'background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px;');

    setError(null);
    dashboardLog.state('Form is valid - proceeding with submission');

    // Construire les données de contexte
    const deviceType: 'mobile' | 'tablet' | 'desktop' = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    const deviceInfo = {
      type: deviceType,
      os: isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop',
      browser: isSafari ? 'Safari' : isChrome ? 'Chrome' : 'Other',
      screenResolution: `${screenWidth}x${screenHeight}`,
      connectionType: (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType || 'unknown',
    };

    // Mapper le rôle utilisateur vers le type FeedbackUserRole
    const mapUserRole = (role?: string): FeedbackUserRole => {
      if (role === 'client' || role === 'lawyer' || role === 'expat' || role === 'admin') {
        return role;
      }
      return 'visitor';
    };

    // Construire l'objet feedback en évitant les valeurs undefined
    const feedbackData: Record<string, unknown> = {
      email,
      type: feedbackType as FeedbackType,
      description: description.trim(),
      pageUrl: window.location.href,
      pageName: pageContext || document.title,
      device: deviceInfo,
      locale: intl.locale,
      userRole: mapUserRole(user?.role),
    };

    // Ajouter les champs optionnels seulement s'ils ont une valeur
    if (priority) {
      feedbackData.priority = priority;
    }
    if (user?.id || user?.uid) {
      feedbackData.userId = user.id || user.uid;
    }
    if (user?.firstName) {
      feedbackData.userName = `${user.firstName} ${user.lastName || ''}`.trim();
    }

    console.log('%c📤 [FeedbackForm] Prepared feedbackData object', 'background: #2196F3; color: white; padding: 2px 6px; border-radius: 3px;', feedbackData);
    dashboardLog.api('Preparing to submit feedback', { feedbackData, hasScreenshot: !!screenshot });

    try {
      console.log('%c🚀 [FeedbackForm] Calling submitFeedback()...', 'background: #FF5722; color: white; padding: 2px 6px; border-radius: 3px;');
      dashboardLog.time('Feedback submission');
      const result = await submitFeedback(feedbackData as unknown as FeedbackData, screenshot || undefined);
      dashboardLog.timeEnd('Feedback submission');
      console.log('%c✅ [FeedbackForm] SUBMISSION SUCCESS', 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;', {
        feedbackId: result,
        timestamp: new Date().toISOString(),
      });
      dashboardLog.api('Feedback submitted successfully', { result });
      setIsSuccess(true);

      // Fermer après 2 secondes
      setTimeout(() => {
        dashboardLog.nav('Closing feedback form after success');
        dashboardLog.groupEnd();
        onClose();
      }, 2000);
    } catch (err) {
      // ============= DETAILED ERROR LOGGING =============
      console.error('%c❌ [FeedbackForm] SUBMISSION FAILED', 'background: #f44336; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold; font-size: 14px;');
      console.error('❌ [FeedbackForm] Error object:', err);

      // Log all error properties
      if (err && typeof err === 'object') {
        console.error('❌ [FeedbackForm] Error details:', {
          message: (err as Error).message,
          name: (err as Error).name,
          code: (err as { code?: string }).code,
          stack: (err as Error).stack?.substring(0, 500),
        });

        // Check for specific Firestore error codes
        const errorCode = (err as { code?: string }).code;
        const errorMessage = (err as Error).message?.toLowerCase() || '';

        if (errorCode === 'permission-denied' || errorMessage.includes('permission')) {
          console.error('%c🔒 [FeedbackForm] PERMISSION DENIED - Firestore rules issue', 'background: #f44336; color: white; padding: 2px 6px; border-radius: 3px;');
          console.error('🔒 Check these common causes:');
          console.error('   1. Firestore rules not deployed');
          console.error('   2. Email validation failing in rules');
          console.error('   3. Collection "user_feedback" does not allow writes');
        }

        if (errorMessage.includes('network') || errorMessage.includes('unavailable')) {
          console.error('%c🌐 [FeedbackForm] NETWORK ERROR', 'background: #FF9800; color: black; padding: 2px 6px; border-radius: 3px;');
        }
      }

      console.error('❌ [FeedbackForm] Data that failed to submit:', {
        email: feedbackData.email,
        type: feedbackData.type,
        descriptionLength: (feedbackData.description as string)?.length,
        pageUrl: feedbackData.pageUrl,
        userRole: feedbackData.userRole,
      });

      dashboardLog.error('Feedback submission FAILED', err);
      dashboardLog.groupEnd();
      setError(intl.formatMessage({
        id: 'feedback.error.submitFailed',
        defaultMessage: 'Une erreur est survenue. Veuillez réessayer.'
      }));
    }
  };

  // Écran de succès
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {intl.formatMessage({ id: 'feedback.success.title', defaultMessage: 'Merci pour votre retour !' })}
        </h3>
        <p className="text-gray-500 text-sm max-w-xs">
          {intl.formatMessage({
            id: 'feedback.success.message',
            defaultMessage: 'Nous avons bien reçu votre feedback et nous allons l\'examiner rapidement.'
          })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email */}
      <div>
        <label
          htmlFor="feedback-email"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {intl.formatMessage({ id: 'feedback.field.email', defaultMessage: 'Email' })}
          <span className="text-red-500 ml-0.5">*</span>
        </label>
        <input
          id="feedback-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={intl.formatMessage({
            id: 'feedback.field.email.placeholder',
            defaultMessage: 'votre@email.com'
          })}
          className={`
            w-full px-4 py-3 rounded-xl border
            text-base sm:text-sm
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
            ${email && !isEmailValid
              ? 'border-red-300 bg-red-50'
              : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
            }
          `}
          disabled={!!user?.email}
        />
        {email && !isEmailValid && (
          <p className="mt-1 text-xs text-red-500">
            {intl.formatMessage({ id: 'feedback.error.invalidEmail', defaultMessage: 'Email invalide' })}
          </p>
        )}
      </div>

      {/* Type de problème */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {intl.formatMessage({ id: 'feedback.field.type', defaultMessage: 'Type de problème' })}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FEEDBACK_TYPES.map(({ value, icon: Icon, labelKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFeedbackType(value)}
              className={`
                flex items-center gap-2 p-3 rounded-xl border-2
                transition-all duration-200
                text-left text-sm
                ${feedbackType === value
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                }
              `}
            >
              <Icon size={18} className={feedbackType === value ? 'text-red-500' : 'text-gray-400'} />
              <span className="font-medium">
                {intl.formatMessage({ id: labelKey, defaultMessage: value })}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="feedback-description"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          {intl.formatMessage({ id: 'feedback.field.description', defaultMessage: 'Description' })}
        </label>
        <textarea
          id="feedback-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={intl.formatMessage({
            id: 'feedback.field.description.placeholder',
            defaultMessage: 'Décrivez le problème rencontré...'
          })}
          rows={4}
          maxLength={2000}
          className={`
            w-full px-4 py-3 rounded-xl border
            text-base sm:text-sm
            resize-none
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
            ${description && !isDescriptionValid
              ? 'border-amber-300 bg-amber-50'
              : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
            }
          `}
        />
        <div className="flex justify-between mt-1">
          {description && !isDescriptionValid ? (
            <p className="text-xs text-amber-600">
              {intl.formatMessage({
                id: 'feedback.error.descriptionTooShort',
                defaultMessage: 'Minimum 10 caractères'
              })}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400">
            {description.length}/2000
          </span>
        </div>
      </div>

      {/* Options avancées (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <span>{showAdvanced ? '−' : '+'}</span>
          {intl.formatMessage({
            id: 'feedback.advanced.toggle',
            defaultMessage: 'Options supplémentaires'
          })}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-xl">
            {/* Capture d'écran */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {intl.formatMessage({ id: 'feedback.field.screenshot', defaultMessage: 'Capture d\'écran' })}
                <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
              </label>

              {screenshotPreview ? (
                <div className="relative inline-block">
                  <img
                    src={screenshotPreview}
                    alt="Preview"
                    className="max-w-full h-32 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={removeScreenshot}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="
                    flex items-center gap-2 px-4 py-3
                    border-2 border-dashed border-gray-300 rounded-xl
                    text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400
                    transition-colors duration-200
                    w-full justify-center
                  "
                >
                  <ImageIcon size={18} />
                  {intl.formatMessage({ id: 'feedback.field.screenshot.add', defaultMessage: 'Ajouter une image' })}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Priorité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {intl.formatMessage({ id: 'feedback.field.priority', defaultMessage: 'Urgence' })}
                <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
              </label>
              <div className="space-y-2">
                {PRIORITY_LEVELS.map(({ value, labelKey, descKey }) => (
                  <label
                    key={value}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border cursor-pointer
                      transition-all duration-200
                      ${priority === value
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={value}
                      checked={priority === value}
                      onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                      className="mt-0.5 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        {intl.formatMessage({ id: labelKey, defaultMessage: value })}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {intl.formatMessage({ id: descKey, defaultMessage: '' })}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Bouton de soumission */}
      <button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className={`
          w-full py-4 px-6 rounded-xl font-medium text-base
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
          ${isFormValid && !isSubmitting
            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin" />
            {intl.formatMessage({ id: 'feedback.submit.sending', defaultMessage: 'Envoi en cours...' })}
          </span>
        ) : (
          intl.formatMessage({ id: 'feedback.submit.button', defaultMessage: 'Envoyer le feedback' })
        )}
      </button>
    </form>
  );
};

export default FeedbackForm;
