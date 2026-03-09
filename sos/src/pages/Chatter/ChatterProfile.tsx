/**
 * ChatterProfile - 2026 Design System
 * Profile settings with glassmorphism cards, photo upload,
 * payment methods management, and Telegram connection.
 */

import React, { useRef, useState, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { useAuth } from '@/contexts/useAuth';
import { ChatterDashboardLayout } from '@/components/Chatter/Layout';
import { User, Camera, Loader2, CheckCircle, Shield, Globe, Mail, MapPin, CreditCard, Plus, MessageCircle, ExternalLink, Trash2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functionsAffiliate } from '@/config/firebase';
import { UI, SPACING, CHATTER_THEME, TYPOGRAPHY, ANIMATION } from '@/components/Chatter/designTokens';
import { usePaymentMethods, type PaymentDetails } from '@/hooks/usePayment';
import { PaymentMethodForm, PaymentMethodCard } from '@/components/payment';
import toast from 'react-hot-toast';

const ChatterProfile: React.FC = () => {
  return (
    <ChatterDashboardLayout activeKey="profile">
      <ChatterProfileContent />
    </ChatterDashboardLayout>
  );
};

const ChatterProfileContent: React.FC = () => {
  const intl = useIntl();
  const { dashboardData, isLoading } = useChatterData();
  const { user, refreshUser } = useAuth();
  const chatter = dashboardData?.chatter;

  // Photo
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payment methods
  const {
    methods,
    defaultMethodId,
    loading: methodsLoading,
    saveMethod,
    deleteMethod,
    setDefaultMethod,
    refresh: refreshMethods,
  } = usePaymentMethods();
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);
  const [saveMethodError, setSaveMethodError] = useState<string | null>(null);
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null);

  const displayedPhoto = localPhotoUrl ?? chatter?.photoUrl ?? null;

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Payment method handlers
  const handleSavePaymentMethod = useCallback(
    async (details: PaymentDetails) => {
      setSavingMethod(true);
      setSaveMethodError(null);
      try {
        await saveMethod(details, methods.length === 0);
        setShowPaymentMethodForm(false);
        await refreshMethods();
        toast.success(intl.formatMessage({ id: 'chatter.profile.methodSaved', defaultMessage: 'Payment method saved' }));
      } catch (err) {
        const message = err instanceof Error ? err.message : intl.formatMessage({ id: 'chatter.profile.methodError', defaultMessage: 'Error saving payment method' });
        setSaveMethodError(message);
        throw err;
      } finally {
        setSavingMethod(false);
      }
    },
    [saveMethod, methods.length, refreshMethods, intl]
  );

  const handleDeleteMethod = useCallback(
    async (methodId: string) => {
      setDeletingMethodId(methodId);
      try {
        await deleteMethod(methodId);
        await refreshMethods();
        toast.success(intl.formatMessage({ id: 'chatter.profile.methodDeleted', defaultMessage: 'Payment method deleted' }));
      } catch (err) {
        toast.error(intl.formatMessage({ id: 'chatter.profile.methodDeleteError', defaultMessage: 'Failed to delete payment method' }));
      } finally {
        setDeletingMethodId(null);
      }
    },
    [deleteMethod, refreshMethods, intl]
  );

  const handleSetDefaultMethod = useCallback(
    async (methodId: string) => {
      try {
        await setDefaultMethod(methodId);
        toast.success(intl.formatMessage({ id: 'chatter.profile.methodDefault', defaultMessage: 'Default method updated' }));
      } catch (err) {
        toast.error(intl.formatMessage({ id: 'chatter.profile.methodDefaultError', defaultMessage: 'Failed to set default method' }));
      }
    },
    [setDefaultMethod, intl]
  );

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Veuillez sélectionner une image (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image trop grande (max 5 MB)');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    const previousPhoto = localPhotoUrl ?? chatter?.photoUrl ?? null;

    try {
      const storageRef = ref(storage, `chatter_photos/${user.uid}/profile.jpg`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadURL = await getDownloadURL(storageRef);

      setLocalPhotoUrl(downloadURL);

      const updateProfile = httpsCallable(functionsAffiliate, 'updateChatterProfile');
      await updateProfile({ photoUrl: downloadURL });

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error('[ChatterProfile] Photo upload failed:', err);
      setLocalPhotoUrl(previousPhoto);
      setUploadError('Échec du téléchargement. Veuillez réessayer.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!chatter) return null;

  return (
      <div className={`${SPACING.pagePadding} py-4 space-y-4 sm:space-y-6`}>

        {/* Header with gradient accent */}
        <div className={`${UI.card} ${SPACING.cardPadding} bg-gradient-to-r from-indigo-500/5 to-violet-500/5 dark:from-indigo-500/10 dark:to-violet-500/10`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${CHATTER_THEME.accentBg} flex items-center justify-center shadow-md shadow-indigo-500/25`}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={TYPOGRAPHY.sectionTitle}>
                <FormattedMessage id="chatter.profile.title" defaultMessage="Mon profil" />
              </h1>
              <p className={TYPOGRAPHY.sectionSubtitle}>
                <FormattedMessage id="chatter.profile.subtitle" defaultMessage="Vos informations personnelles et statistiques" />
              </p>
            </div>
          </div>
        </div>

        {/* Photo upload card */}
        <div className={`${UI.card} ${SPACING.cardPadding}`}>
          <div className="flex items-center gap-3 mb-4">
            <Camera className="w-5 h-5 text-indigo-500" />
            <h2 className={TYPOGRAPHY.sectionTitle}>
              <FormattedMessage id="chatter.profile.photo" defaultMessage="Photo de profil" />
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              {displayedPhoto ? (
                <img
                  src={displayedPhoto}
                  alt="Photo de profil"
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-500/30"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-2xl">
                  {chatter.firstName[0]}{chatter.lastName[0]}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}
              >
                <Camera className="w-4 h-4" />
                <FormattedMessage id="chatter.profile.photo.change" defaultMessage="Changer la photo" />
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">JPG, PNG, WebP — max 5 MB</p>
              {uploadSuccess && (
                <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Photo mise à jour !</span>
                </div>
              )}
              {uploadError && (
                <p className="text-red-500 text-sm mt-1">{uploadError}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            <FormattedMessage
              id="chatter.profile.photo.hint"
              defaultMessage="Cette photo sera visible dans le répertoire public des chatters si votre profil est activé."
            />
          </p>
        </div>

        {/* Personal Info */}
        <div className={`${UI.card} ${SPACING.cardPadding}`}>
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-indigo-500" />
            <h2 className={TYPOGRAPHY.sectionTitle}>
              <FormattedMessage id="chatter.profile.personal" defaultMessage="Informations personnelles" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <label className={`${TYPOGRAPHY.label} block`}>
                  <FormattedMessage id="chatter.profile.name" defaultMessage="Nom" />
                </label>
                <p className="text-slate-900 dark:text-white font-medium">{chatter.firstName} {chatter.lastName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <label className={`${TYPOGRAPHY.label} block`}>
                  <FormattedMessage id="chatter.profile.email" defaultMessage="Email" />
                </label>
                <p className="text-slate-900 dark:text-white font-medium">{chatter.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <label className={`${TYPOGRAPHY.label} block`}>
                  <FormattedMessage id="chatter.profile.country" defaultMessage="Pays" />
                </label>
                <p className="text-slate-900 dark:text-white font-medium">{chatter.country}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
              <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <label className={`${TYPOGRAPHY.label} block`}>
                  <FormattedMessage id="chatter.profile.language" defaultMessage="Langue" />
                </label>
                <p className="text-slate-900 dark:text-white font-medium">{chatter.language}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Telegram Connection */}
        <div className={`${UI.card} ${SPACING.cardPadding}`}>
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="w-5 h-5 text-indigo-500" />
            <h2 className={TYPOGRAPHY.sectionTitle}>
              <FormattedMessage id="chatter.profile.telegram" defaultMessage="Telegram" />
            </h2>
          </div>
          {chatter.telegramId ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">
                  <FormattedMessage id="chatter.profile.telegramConnected" defaultMessage="Telegram connected" />
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  <FormattedMessage id="chatter.profile.telegramId" defaultMessage="ID: {id}" values={{ id: chatter.telegramId }} />
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
              <MessageCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-700 dark:text-amber-300">
                  <FormattedMessage id="chatter.profile.telegramNotConnected" defaultMessage="Telegram not connected" />
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  <FormattedMessage id="chatter.profile.telegramHint" defaultMessage="Connect Telegram to withdraw and get your $50 bonus" />
                </p>
              </div>
              <a
                href="/chatter/telegram"
                className={`${UI.button.primary} px-4 py-2 flex items-center gap-2 flex-shrink-0`}
              >
                <ExternalLink className="w-4 h-4" />
                <FormattedMessage id="chatter.profile.telegramConnect" defaultMessage="Connect" />
              </a>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className={`${UI.card} ${SPACING.cardPadding}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-indigo-500" />
              <h2 className={TYPOGRAPHY.sectionTitle}>
                <FormattedMessage id="chatter.profile.paymentMethods" defaultMessage="Payment methods" />
              </h2>
            </div>
            {!showPaymentMethodForm && (
              <button
                onClick={() => setShowPaymentMethodForm(true)}
                className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <FormattedMessage id="chatter.profile.addMethod" defaultMessage="Add" />
              </button>
            )}
          </div>

          {/* Payment method form */}
          {showPaymentMethodForm && (
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  <FormattedMessage id="chatter.profile.addMethodTitle" defaultMessage="Add a payment method" />
                </h3>
                <button
                  onClick={() => { setShowPaymentMethodForm(false); setSaveMethodError(null); }}
                  className="px-3 py-1.5 text-sm rounded-xl bg-white/10 backdrop-blur border border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-white/20 transition-all"
                >
                  <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
                </button>
              </div>
              <PaymentMethodForm
                onSubmit={handleSavePaymentMethod}
                loading={savingMethod}
                error={saveMethodError}
              />
            </div>
          )}

          {/* Existing methods list */}
          {methodsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : methods.length === 0 && !showPaymentMethodForm ? (
            <div className="text-center py-6">
              <CreditCard className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                <FormattedMessage id="chatter.profile.noMethods" defaultMessage="No payment method registered" />
              </p>
              <button
                onClick={() => setShowPaymentMethodForm(true)}
                className={`${UI.button.primary} px-4 py-2 inline-flex items-center gap-2`}
              >
                <Plus className="w-4 h-4" />
                <FormattedMessage id="chatter.profile.addMethodTitle" defaultMessage="Add a payment method" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {methods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  showActions
                  onDelete={() => handleDeleteMethod(method.id)}
                  onSelect={method.isDefault ? undefined : () => handleSetDefaultMethod(method.id)}
                  className="dark:bg-white/5 dark:border-white/8"
                />
              ))}
            </div>
          )}
        </div>
      </div>
  );
};

export default ChatterProfile;
