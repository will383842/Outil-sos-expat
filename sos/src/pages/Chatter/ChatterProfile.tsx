/**
 * ChatterProfile - 2026 Design System
 * Profile settings with glassmorphism cards, photo upload,
 * payment methods management, and Telegram connection.
 */

import React, { useRef, useState, useCallback, lazy } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { useAuth } from '@/contexts/useAuth';
import { ChatterDashboardLayout } from '@/components/Chatter/Layout';
const UnifiedAffiliateLink = lazy(() => import('@/components/unified/UnifiedAffiliateLink'));
import { User, Camera, Loader2, CheckCircle, Shield, Globe, Mail, MapPin, CreditCard, Plus, MessageCircle, ExternalLink, Trash2, ChevronDown, ChevronUp, Copy, Pencil, Check, X, LogOut, Phone, Facebook, Instagram, Linkedin } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functionsAffiliate } from '@/config/firebase';
import { UI, SPACING, CHATTER_THEME, TYPOGRAPHY, ANIMATION } from '@/components/Chatter/designTokens';
import { usePaymentMethods, type PaymentDetails } from '@/hooks/usePayment';
import { PaymentMethodForm, PaymentMethodCard } from '@/components/payment';
import { copyToClipboard } from '@/utils/clipboard';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import type { ChatterPlatform } from '@/types/chatter';

// ── CollapsibleSection ──────────────────────────────────────────────
interface CollapsibleSectionProps {
  title: React.ReactNode;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  defaultOpen = true,
  children,
  headerRight,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={UI.card}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between ${SPACING.cardPadding} min-h-[48px] cursor-pointer select-none`}
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className={TYPOGRAPHY.sectionTitle}>{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          {open ? (
            <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-200" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-200" />
          )}
        </div>
      </button>
      {open && (
        <div className={`px-4 pb-4 sm:px-5 sm:pb-5`}>
          {children}
        </div>
      )}
    </div>
  );
};

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
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const chatter = dashboardData?.chatter;

  // Inline editing
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingField, setSavingField] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Platform toggles
  const [togglingPlatform, setTogglingPlatform] = useState<string | null>(null);
  const [localPlatforms, setLocalPlatforms] = useState<ChatterPlatform[] | null>(null);

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValues((prev) => ({ ...prev, [field]: currentValue }));
  };

  const cancelEditing = () => {
    setEditingField(null);
  };

  const saveField = useCallback(async (field: string) => {
    const value = editValues[field]?.trim();
    if (!value) {
      toast.error(intl.formatMessage({ id: 'chatter.profile.fieldRequired', defaultMessage: 'This field is required' }));
      return;
    }
    setSavingField(true);
    try {
      const updateProfile = httpsCallable(functionsAffiliate, 'updateChatterProfile');
      await updateProfile({ [field]: value });
      setEditingField(null);
      toast.success(intl.formatMessage({ id: 'chatter.profile.fieldSaved', defaultMessage: 'Updated successfully' }));
      // Refresh to get updated data
      refreshUser?.();
    } catch (err) {
      console.error('[ChatterProfile] Field update failed:', err);
      toast.error(intl.formatMessage({ id: 'chatter.profile.fieldError', defaultMessage: 'Update failed. Please try again.' }));
    } finally {
      setSavingField(false);
    }
  }, [editValues, intl, refreshUser]);

  const handleEditKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveField(field);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('[ChatterProfile] Logout failed:', err);
      toast.error(intl.formatMessage({ id: 'chatter.profile.logoutError', defaultMessage: 'Logout failed' }));
    } finally {
      setLoggingOut(false);
    }
  }, [logout, navigate, intl]);

  // Platform toggle definitions
  const PLATFORM_LIST: { id: ChatterPlatform; icon: React.ReactNode; labelId: string; labelDefault: string }[] = [
    { id: 'whatsapp', icon: <MessageCircle className="w-5 h-5" />, labelId: 'chatter.profile.platform.whatsapp', labelDefault: 'WhatsApp' },
    { id: 'facebook', icon: <Facebook className="w-5 h-5" />, labelId: 'chatter.profile.platform.facebook', labelDefault: 'Facebook' },
    { id: 'instagram', icon: <Instagram className="w-5 h-5" />, labelId: 'chatter.profile.platform.instagram', labelDefault: 'Instagram' },
    { id: 'tiktok', icon: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.18 8.18 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.12z"/></svg>, labelId: 'chatter.profile.platform.tiktok', labelDefault: 'TikTok' },
    { id: 'linkedin', icon: <Linkedin className="w-5 h-5" />, labelId: 'chatter.profile.platform.linkedin', labelDefault: 'LinkedIn' },
  ];

  const activePlatforms = localPlatforms ?? chatter?.platforms ?? [];

  const handleTogglePlatform = useCallback(async (platformId: ChatterPlatform) => {
    if (!chatter || togglingPlatform) return;

    setTogglingPlatform(platformId);
    const current = localPlatforms ?? chatter.platforms ?? [];
    const isActive = current.includes(platformId);
    const updated = isActive
      ? current.filter((p) => p !== platformId)
      : [...current, platformId];

    // Optimistic update
    setLocalPlatforms(updated);

    try {
      const updateProfile = httpsCallable(functionsAffiliate, 'updateChatterProfile');
      await updateProfile({ platforms: updated });
      toast.success(
        intl.formatMessage(
          { id: 'chatter.profile.platform.updated', defaultMessage: 'Platforms updated' }
        )
      );
    } catch (err) {
      console.error('[ChatterProfile] Platform toggle failed:', err);
      // Revert optimistic update
      setLocalPlatforms(current);
      toast.error(
        intl.formatMessage(
          { id: 'chatter.profile.platform.error', defaultMessage: 'Failed to update platforms' }
        )
      );
    } finally {
      setTogglingPlatform(null);
    }
  }, [chatter, localPlatforms, togglingPlatform, intl]);

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
        <CollapsibleSection
          title={<FormattedMessage id="chatter.profile.photo" defaultMessage="Photo de profil" />}
          icon={<Camera className="w-5 h-5 text-indigo-500" />}
          defaultOpen={true}
        >
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
        </CollapsibleSection>

        {/* Personal Info */}
        <CollapsibleSection
          title={<FormattedMessage id="chatter.profile.personal" defaultMessage="Informations personnelles" />}
          icon={<User className="w-5 h-5 text-indigo-500" />}
          defaultOpen={true}
        >
          <div className="grid md:grid-cols-2 gap-4">
            {/* First Name — editable */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <label className={`${TYPOGRAPHY.label} block`}>
                  <FormattedMessage id="chatter.profile.firstName" defaultMessage="Prénom" />
                </label>
                {editingField === 'firstName' ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      autoFocus
                      type="text"
                      value={editValues.firstName ?? ''}
                      onChange={(e) => setEditValues((v) => ({ ...v, firstName: e.target.value }))}
                      onKeyDown={(e) => handleEditKeyDown(e, 'firstName')}
                      onBlur={() => saveField('firstName')}
                      disabled={savingField}
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {savingField && <Loader2 className="w-4 h-4 animate-spin text-indigo-500 flex-shrink-0" />}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="text-slate-900 dark:text-white font-medium">{chatter.firstName}</p>
                    <button type="button" onClick={() => startEditing('firstName', chatter.firstName)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors" aria-label="Edit">
                      <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Last Name — editable */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <label className={`${TYPOGRAPHY.label} block`}>
                  <FormattedMessage id="chatter.profile.lastName" defaultMessage="Nom" />
                </label>
                {editingField === 'lastName' ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      autoFocus
                      type="text"
                      value={editValues.lastName ?? ''}
                      onChange={(e) => setEditValues((v) => ({ ...v, lastName: e.target.value }))}
                      onKeyDown={(e) => handleEditKeyDown(e, 'lastName')}
                      onBlur={() => saveField('lastName')}
                      disabled={savingField}
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {savingField && <Loader2 className="w-4 h-4 animate-spin text-indigo-500 flex-shrink-0" />}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="text-slate-900 dark:text-white font-medium">{chatter.lastName}</p>
                    <button type="button" onClick={() => startEditing('lastName', chatter.lastName)} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors" aria-label="Edit">
                      <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Email — read-only */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <label className={`${TYPOGRAPHY.label} block`}>
                  <FormattedMessage id="chatter.profile.email" defaultMessage="Email" />
                </label>
                <p className="text-slate-900 dark:text-white font-medium">{chatter.email}</p>
              </div>
            </div>
            {/* Phone / WhatsApp — editable */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <label className={`${TYPOGRAPHY.label} block`}>
                  <FormattedMessage id="chatter.profile.phone" defaultMessage="Téléphone / WhatsApp" />
                </label>
                {editingField === 'phone' ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      autoFocus
                      type="tel"
                      value={editValues.phone ?? ''}
                      onChange={(e) => setEditValues((v) => ({ ...v, phone: e.target.value }))}
                      onKeyDown={(e) => handleEditKeyDown(e, 'phone')}
                      onBlur={() => saveField('phone')}
                      disabled={savingField}
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {savingField && <Loader2 className="w-4 h-4 animate-spin text-indigo-500 flex-shrink-0" />}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <p className="text-slate-900 dark:text-white font-medium">
                      {(chatter as any).phone || (chatter as any).whatsapp || (chatter as any).phoneNumber || '—'}
                    </p>
                    <button type="button" onClick={() => startEditing('phone', (chatter as any).phone || (chatter as any).whatsapp || (chatter as any).phoneNumber || '')} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors" aria-label="Edit">
                      <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Country — read-only */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <label className={`${TYPOGRAPHY.label} block`}>
                  <FormattedMessage id="chatter.profile.country" defaultMessage="Pays" />
                </label>
                <p className="text-slate-900 dark:text-white font-medium">{chatter.country}</p>
              </div>
            </div>
            {/* Language — read-only */}
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
        </CollapsibleSection>

        {/* Telegram Connection */}
        <CollapsibleSection
          title={<FormattedMessage id="chatter.profile.telegram" defaultMessage="Telegram" />}
          icon={<MessageCircle className="w-5 h-5 text-indigo-500" />}
          defaultOpen={false}
        >
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
        </CollapsibleSection>

        {/* Unified Affiliate Link */}
        <CollapsibleSection
          title={<FormattedMessage id="chatter.profile.affiliateLink" defaultMessage="Mon lien affilié" />}
          icon={<Copy className="w-5 h-5 text-indigo-500" />}
          defaultOpen={false}
        >
          {chatter?.affiliateCodeClient && (
            <React.Suspense fallback={<div className="h-20 animate-pulse bg-slate-100 dark:bg-white/5 rounded-xl" />}>
              <UnifiedAffiliateLink code={chatter.affiliateCodeClient} />
            </React.Suspense>
          )}
        </CollapsibleSection>

        {/* Platforms */}
        <CollapsibleSection
          title={<FormattedMessage id="chatter.profile.platforms" defaultMessage="Plateformes" />}
          icon={<Globe className="w-5 h-5 text-indigo-500" />}
          defaultOpen={false}
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            <FormattedMessage id="chatter.profile.platform.hint" defaultMessage="Select the platforms where you promote SOS-Expat" />
          </p>
          <div className="space-y-2">
            {PLATFORM_LIST.map(({ id, icon, labelId, labelDefault }) => {
              const isActive = activePlatforms.includes(id);
              const isToggling = togglingPlatform === id;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`${isActive ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'} transition-colors duration-200`}>
                      {icon}
                    </span>
                    <span className={`text-sm font-medium ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'} transition-colors duration-200`}>
                      <FormattedMessage id={labelId} defaultMessage={labelDefault} />
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    aria-label={intl.formatMessage({ id: labelId, defaultMessage: labelDefault })}
                    disabled={!!togglingPlatform}
                    onClick={() => handleTogglePlatform(id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                      isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
                    } ${togglingPlatform ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isToggling ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      </span>
                    ) : (
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Payment Methods */}
        <CollapsibleSection
          title={<FormattedMessage id="chatter.profile.paymentMethods" defaultMessage="Payment methods" />}
          icon={<CreditCard className="w-5 h-5 text-indigo-500" />}
          defaultOpen={true}
          headerRight={
            !showPaymentMethodForm ? (
              <button
                onClick={(e) => { e.stopPropagation(); setShowPaymentMethodForm(true); }}
                className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <FormattedMessage id="chatter.profile.addMethod" defaultMessage="Add" />
              </button>
            ) : undefined
          }
        >
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
        </CollapsibleSection>

        {/* Legal */}
        <CollapsibleSection
          title={<FormattedMessage id="chatter.profile.legal" defaultMessage="Légal" />}
          icon={<Shield className="w-5 h-5 text-indigo-500" />}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              {(chatter as any).termsVersion && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                  <label className={`${TYPOGRAPHY.label} block`}>
                    <FormattedMessage id="chatter.profile.termsVersion" defaultMessage="Version CGU" />
                  </label>
                  <p className="text-slate-900 dark:text-white font-medium">
                    {(chatter as any).termsVersion as string}
                  </p>
                </div>
              )}
              {(chatter as any).termsAcceptedAt && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                  <label className={`${TYPOGRAPHY.label} block`}>
                    <FormattedMessage id="chatter.profile.termsAcceptedAt" defaultMessage="Acceptées le" />
                  </label>
                  <p className="text-slate-900 dark:text-white font-medium">
                    {new Intl.DateTimeFormat(intl.locale, { dateStyle: 'long' }).format(
                      new Date((chatter as any).termsAcceptedAt as string)
                    )}
                  </p>
                </div>
              )}
              {(chatter as any).termsType && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                  <label className={`${TYPOGRAPHY.label} block`}>
                    <FormattedMessage id="chatter.profile.termsType" defaultMessage="Type" />
                  </label>
                  <p className="text-slate-900 dark:text-white font-medium">
                    {(chatter as any).termsType as string}
                  </p>
                </div>
              )}
            </div>
            <Link
              to="/cgu-chatters"
              className="inline-flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-400 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <FormattedMessage id="chatter.profile.viewTerms" defaultMessage="Consulter les CGU" />
            </Link>
          </div>
        </CollapsibleSection>

        {/* Logout */}
        <div className={`${UI.card} ${SPACING.cardPadding}`}>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            <FormattedMessage id="chatter.profile.logout" defaultMessage="Déconnexion" />
          </button>
        </div>
      </div>
  );
};

export default ChatterProfile;
