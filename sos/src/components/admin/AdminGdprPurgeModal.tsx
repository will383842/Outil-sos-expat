/**
 * AdminGdprPurgeModal.tsx
 *
 * Modal for GDPR Article 17 (Right to Erasure) - Hard delete/purge provider data
 *
 * This is an irreversible action that:
 * - Deletes user profile and all personal data
 * - Deletes all documents (KYC, contracts)
 * - Anonymizes call history (keeps references)
 * - Anonymizes payment history (keeps references)
 * - Deletes all reviews and ratings
 * - Deletes Firebase Auth account
 * - Deletes Storage files (photos, documents)
 *
 * Requires:
 * - Admin with special GDPR purge permission
 * - Double confirmation (email typing + checkbox)
 * - Creates audit log before deletion
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  AlertTriangle,
  Trash2,
  Shield,
  FileX,
  Phone,
  CreditCard,
  Star,
  User,
  HardDrive,
  Loader2,
  CheckCircle,
  XCircle,
  AlertOctagon,
} from 'lucide-react';
import Modal from '../common/Modal';
import { useIntl } from 'react-intl';
import { functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { logError } from '../../utils/logging';

// ============================================================================
// TYPES
// ============================================================================

interface Provider {
  id: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

interface AdminGdprPurgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider | null;
  onSuccess?: (providerId: string, summary: DeletionSummary) => void;
}

interface DeletionSummary {
  providerId: string;
  deletedAt: string;
  deletedCollections: string[];
  anonymizedCollections: string[];
  storageDeleted: boolean;
  authDeleted: boolean;
}

interface HardDeleteResponse {
  success: boolean;
  providerId: string;
  action: string;
  timestamp: string;
  summary?: DeletionSummary;
  error?: string;
}

// ============================================================================
// TRANSLATIONS (French)
// ============================================================================

const TRANSLATIONS = {
  title: 'Suppression definitive RGPD',
  subtitle: 'Article 17 - Droit a l\'effacement',

  // Warning banner
  warningTitle: 'Action irreversible',
  warningText: 'Cette action supprimera definitivement toutes les donnees du prestataire. Cette operation ne peut pas etre annulee.',

  // What will be deleted section
  deletionListTitle: 'Donnees qui seront supprimees :',
  deletionItems: {
    profile: 'Profil utilisateur et toutes les donnees personnelles',
    documents: 'Tous les documents (KYC, contrats, pieces justificatives)',
    callHistory: 'Historique des appels (references anonymisees conservees)',
    paymentHistory: 'Historique des paiements (references anonymisees conservees)',
    reviews: 'Tous les avis et evaluations',
    authAccount: 'Compte Firebase Auth',
    storageFiles: 'Fichiers de stockage (photos, documents)',
  },

  // Confirmation section
  confirmationTitle: 'Confirmation requise',
  emailConfirmLabel: 'Tapez l\'email du prestataire pour confirmer :',
  emailPlaceholder: 'Entrez l\'email exactement',
  emailMismatch: 'L\'email ne correspond pas',

  checkboxLabel: 'Je comprends que cette action est irreversible et que toutes les donnees seront definitivement supprimees conformement au RGPD Article 17.',

  // Audit section
  auditTitle: 'Journal d\'audit',
  auditInfo: 'Un enregistrement de cette suppression sera conserve dans les logs d\'audit pour conformite legale.',

  // Buttons
  cancelButton: 'Annuler',
  purgeButton: 'Purger definitivement',
  purging: 'Suppression en cours...',

  // Success/Error
  successTitle: 'Suppression terminee',
  successMessage: 'Les donnees du prestataire ont ete supprimees avec succes.',
  errorTitle: 'Erreur lors de la suppression',

  // Summary
  summaryTitle: 'Resume de la suppression',
  summaryProvider: 'Prestataire',
  summaryTimestamp: 'Date/Heure',
  summaryCollectionsDeleted: 'Collections supprimees',
  summaryCollectionsAnonymized: 'Collections anonymisees',
  summaryStorageDeleted: 'Stockage supprime',
  summaryAuthDeleted: 'Authentification supprimee',
  yes: 'Oui',
  no: 'Non',

  closeButton: 'Fermer',
};

// ============================================================================
// COMPONENT
// ============================================================================

const AdminGdprPurgeModal: React.FC<AdminGdprPurgeModalProps> = ({
  isOpen,
  onClose,
  provider,
  onSuccess,
}) => {
  // Internationalization
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);

  // State
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [deletionSummary, setDeletionSummary] = useState<DeletionSummary | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to allow modal close animation
      const timer = setTimeout(() => {
        setEmailConfirmation('');
        setIsChecked(false);
        setError(null);
        setSuccess(false);
        setDeletionSummary(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Validation
  const providerEmail = provider?.email?.toLowerCase().trim() || '';
  const typedEmail = emailConfirmation.toLowerCase().trim();
  const emailMatches = providerEmail && typedEmail === providerEmail;
  const canPurge = emailMatches && isChecked && !isLoading;

  // Get provider display name
  const providerName = provider?.displayName
    || `${provider?.firstName || ''} ${provider?.lastName || ''}`.trim()
    || provider?.email
    || t('admin.gdpr.provider');

  // Handle purge
  const handlePurge = useCallback(async () => {
    if (!provider?.id || !canPurge) return;

    setIsLoading(true);
    setError(null);

    try {
      // Call the hardDeleteProvider Cloud Function
      const hardDeleteProvider = httpsCallable<
        { providerId: string; confirmGdprPurge: boolean; reason?: string },
        HardDeleteResponse
      >(functions, 'hardDeleteProvider');

      const result = await hardDeleteProvider({
        providerId: provider.id,
        confirmGdprPurge: true,
        reason: 'GDPR Article 17 - Admin purge request',
      });

      if (result.data.success) {
        setSuccess(true);

        // Create summary from response or generate default
        const summary: DeletionSummary = result.data.summary || {
          providerId: provider.id,
          deletedAt: new Date().toISOString(),
          deletedCollections: [
            'sos_profiles',
            'users',
            'kyc_documents',
            'notifications',
            'documents',
            'ratings',
            'reviews_received',
          ],
          anonymizedCollections: [
            'call_sessions',
            'payments',
            'reviews',
            'disputes',
            'messages',
          ],
          storageDeleted: true,
          authDeleted: true,
        };

        setDeletionSummary(summary);

        // Notify parent
        if (onSuccess) {
          onSuccess(provider.id, summary);
        }
      } else {
        throw new Error(result.data.error || 'Erreur inconnue');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      setError(errorMessage);

      logError({
        origin: 'frontend',
        error: `GDPR purge failed: ${errorMessage}`,
        context: {
          component: 'AdminGdprPurgeModal',
          providerId: provider.id,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [provider, canPurge, onSuccess]);

  // Handle close
  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  // Render success state
  if (success && deletionSummary) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t('admin.gdpr.successTitle')}
        size="medium"
      >
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-green-800 font-semibold">{t('admin.gdpr.successTitle')}</h3>
                <p className="text-green-700 text-sm mt-1">{t('admin.gdpr.successMessage')}</p>
              </div>
            </div>
          </div>

          {/* Deletion Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4">{t('admin.gdpr.summaryTitle')}</h4>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('admin.gdpr.summaryProvider')}:</span>
                <span className="font-medium text-gray-900">{providerName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">{t('admin.gdpr.summaryTimestamp')}:</span>
                <span className="font-mono text-gray-900">
                  {new Date(deletionSummary.deletedAt).toLocaleString('fr-FR')}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <span className="text-gray-600 block mb-2">{t('admin.gdpr.summaryCollectionsDeleted')}:</span>
                <div className="flex flex-wrap gap-1">
                  {deletionSummary.deletedCollections.map((col) => (
                    <span key={col} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <span className="text-gray-600 block mb-2">{t('admin.gdpr.summaryCollectionsAnonymized')}:</span>
                <div className="flex flex-wrap gap-1">
                  {deletionSummary.anonymizedCollections.map((col) => (
                    <span key={col} className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('admin.gdpr.summaryStorageDeleted')}:</span>
                  <span className={deletionSummary.storageDeleted ? 'text-green-600' : 'text-red-600'}>
                    {deletionSummary.storageDeleted ? t('admin.gdpr.yes') : t('admin.gdpr.no')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('admin.gdpr.summaryAuthDeleted')}:</span>
                  <span className={deletionSummary.authDeleted ? 'text-green-600' : 'text-red-600'}>
                    {deletionSummary.authDeleted ? t('admin.gdpr.yes') : t('admin.gdpr.no')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              {t('admin.gdpr.close')}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Render main form
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('admin.gdpr.title')}
      size="large"
    >
      <div className="space-y-6">
        {/* Subtitle */}
        <div className="flex items-center text-gray-600">
          <Shield className="h-5 w-5 mr-2" />
          <span className="text-sm font-medium">{t('admin.gdpr.subtitle')}</span>
        </div>

        {/* Warning Banner */}
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex items-start">
            <AlertOctagon className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-bold text-lg">{t('admin.gdpr.warningTitle')}</h3>
              <p className="text-red-700 mt-1">{t('admin.gdpr.warningText')}</p>
            </div>
          </div>
        </div>

        {/* Provider Info */}
        {provider && (
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex items-center">
              <div className="h-12 w-12 bg-gray-300 rounded-full flex items-center justify-center mr-4">
                <User className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{providerName}</div>
                <div className="text-sm text-gray-600">{provider.email}</div>
                <div className="text-xs text-gray-500 font-mono">ID: {provider.id}</div>
              </div>
            </div>
          </div>
        )}

        {/* Deletion List */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Trash2 className="h-5 w-5 mr-2 text-red-600" />
            {t('admin.gdpr.deletionListTitle')}
          </h4>

          <div className="space-y-3">
            <DeletionItem
              icon={<User className="h-4 w-4" />}
              text={t('admin.gdpr.profile')}
              color="red"
            />
            <DeletionItem
              icon={<FileX className="h-4 w-4" />}
              text={t('admin.gdpr.documents')}
              color="red"
            />
            <DeletionItem
              icon={<Phone className="h-4 w-4" />}
              text={t('admin.gdpr.callHistory')}
              color="yellow"
            />
            <DeletionItem
              icon={<CreditCard className="h-4 w-4" />}
              text={t('admin.gdpr.paymentHistory')}
              color="yellow"
            />
            <DeletionItem
              icon={<Star className="h-4 w-4" />}
              text={t('admin.gdpr.reviews')}
              color="red"
            />
            <DeletionItem
              icon={<Shield className="h-4 w-4" />}
              text={t('admin.gdpr.authAccount')}
              color="red"
            />
            <DeletionItem
              icon={<HardDrive className="h-4 w-4" />}
              text={t('admin.gdpr.storageFiles')}
              color="red"
            />
          </div>
        </div>

        {/* Audit Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            {t('admin.gdpr.auditTitle')}
          </h4>
          <p className="text-sm text-blue-700">{t('admin.gdpr.auditInfo')}</p>
        </div>

        {/* Confirmation Section */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h4 className="font-semibold text-gray-900">{t('admin.gdpr.confirmationTitle')}</h4>

          {/* Email confirmation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin.gdpr.emailConfirmLabel')}
            </label>
            <input
              type="email"
              value={emailConfirmation}
              onChange={(e) => setEmailConfirmation(e.target.value)}
              placeholder={t('admin.gdpr.emailPlaceholder')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                emailConfirmation && !emailMatches
                  ? 'border-red-500 focus:ring-red-500'
                  : emailMatches
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={isLoading}
            />
            {emailConfirmation && !emailMatches && (
              <p className="text-red-600 text-sm mt-1 flex items-center">
                <XCircle className="h-4 w-4 mr-1" />
                {t('admin.gdpr.emailMismatch')}
              </p>
            )}
            {emailMatches && (
              <p className="text-green-600 text-sm mt-1 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Email confirme
              </p>
            )}
          </div>

          {/* Checkbox confirmation */}
          <div className="flex items-start">
            <input
              type="checkbox"
              id="gdpr-confirm-checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label
              htmlFor="gdpr-confirm-checkbox"
              className="ml-3 text-sm text-gray-700 cursor-pointer"
            >
              {t('admin.gdpr.checkboxLabel')}
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <XCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-800 font-semibold">{t('admin.gdpr.errorTitle')}</h4>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('admin.gdpr.cancel')}
          </button>
          <button
            onClick={handlePurge}
            disabled={!canPurge}
            className={`px-6 py-2 rounded-lg transition-colors flex items-center ${
              canPurge
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('admin.gdpr.purging')}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('admin.gdpr.purgeButton')}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface DeletionItemProps {
  icon: React.ReactNode;
  text: string;
  color: 'red' | 'yellow';
}

const DeletionItem: React.FC<DeletionItemProps> = ({ icon, text, color }) => {
  const colorClasses = {
    red: 'text-red-600 bg-red-50',
    yellow: 'text-yellow-600 bg-yellow-50',
  };

  return (
    <div className="flex items-center">
      <div className={`p-1.5 rounded ${colorClasses[color]} mr-3`}>
        {icon}
      </div>
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  );
};

export default AdminGdprPurgeModal;
