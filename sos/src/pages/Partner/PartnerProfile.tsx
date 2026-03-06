/**
 * PartnerProfile - Profile management page
 */

import React, { useState, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { usePartner } from '@/hooks/usePartner';
import { useAuth } from '@/contexts/AuthContext';
import { PartnerDashboardLayout } from '@/components/Partner';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';
import toast from 'react-hot-toast';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import {
  User,
  Globe,
  CreditCard,
  Settings,
  Camera,
  Loader2,
  CheckCircle,
  Mail,
  Phone,
  Building2,
  Lock,
  ExternalLink,
} from 'lucide-react';

const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
} as const;

const PartnerProfile: React.FC = () => {
  const intl = useIntl();
  const { user } = useAuth();
  const { partner, isLoading, updateProfile } = usePartner();

  // Photo upload state
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    phone: partner?.phone || '',
    contactName: partner?.contactName || '',
    contactEmail: partner?.contactEmail || '',
    contactPhone: partner?.contactPhone || '',
  });
  const [saving, setSaving] = useState(false);

  const displayedPhoto = localPhotoUrl ?? partner?.photoUrl ?? null;
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      setUploadError(intl.formatMessage({ id: 'partner.profile.photoInvalid', defaultMessage: 'Veuillez selectionner une image (JPG, PNG, WebP)' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(intl.formatMessage({ id: 'partner.profile.photoTooLarge', defaultMessage: 'Image trop grande (max 5 MB)' }));
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    const previousPhoto = localPhotoUrl ?? partner?.photoUrl ?? null;
    try {
      const storageRef = ref(storage, `partner_photos/${user.uid}/profile.jpg`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadURL = await getDownloadURL(storageRef);
      setLocalPhotoUrl(downloadURL);
      await updateProfile({ photoUrl: downloadURL });
      setUploadSuccess(true);
      toast.success(intl.formatMessage({ id: 'partner.profile.photoUpdated', defaultMessage: 'Photo mise a jour' }));
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch {
      setLocalPhotoUrl(previousPhoto);
      setUploadError(intl.formatMessage({ id: 'partner.profile.photoFailed', defaultMessage: 'Echec du telechargement' }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveContact = async () => {
    setSaving(true);
    try {
      const result = await updateProfile({
        phone: contactForm.phone || undefined,
        contactName: contactForm.contactName || undefined,
        contactEmail: contactForm.contactEmail || undefined,
        contactPhone: contactForm.contactPhone || undefined,
      });
      if (result.success) {
        toast.success(intl.formatMessage({ id: 'partner.profile.saved', defaultMessage: 'Profil mis a jour' }));
        setEditingContact(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error(intl.formatMessage({ id: 'partner.profile.saveFailed', defaultMessage: 'Echec de la sauvegarde' }));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PartnerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </PartnerDashboardLayout>
    );
  }

  if (!partner) return null;

  return (
    <PartnerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="partner.profile.title" defaultMessage="Mon profil" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="partner.profile.subtitle" defaultMessage="G\u00e9rez vos informations" />
          </p>
        </div>

        {/* Photo Upload */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Camera className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="partner.profile.photo" defaultMessage="Photo de profil" />
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                {displayedPhoto ? (
                  <img src={displayedPhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-2xl font-bold">
                    {partner.firstName?.[0]?.toUpperCase() ?? 'P'}
                  </span>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={uploading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors active:scale-[0.98]"
              >
                <Camera className="w-4 h-4" />
                <FormattedMessage id="partner.profile.uploadPhoto" defaultMessage="Changer la photo" />
              </button>
              <p className="text-xs text-gray-500 mt-2">
                <FormattedMessage id="partner.profile.photoHint" defaultMessage="JPG, PNG ou WebP. Max 5 MB." />
              </p>
              {uploadSuccess && (
                <div className="flex items-center gap-2 mt-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">
                    <FormattedMessage id="partner.profile.photoSuccess" defaultMessage="Photo mise a jour" />
                  </span>
                </div>
              )}
              {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
            </div>
          </div>
        </div>

        {/* Personal Info (read-only) */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="partner.profile.personal" defaultMessage="Informations personnelles" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="partner.profile.name" defaultMessage="Nom" />
              </label>
              <p className="text-gray-900 dark:text-white">{partner.firstName} {partner.lastName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="partner.profile.email" defaultMessage="Email" />
              </label>
              <p className="text-gray-900 dark:text-white">{partner.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="partner.profile.country" defaultMessage="Pays" />
              </label>
              <p className="text-gray-900 dark:text-white">{partner.country}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="partner.profile.memberSince" defaultMessage="Membre depuis" />
              </label>
              <p className="text-gray-900 dark:text-white">
                {new Date(partner.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="partner.profile.status" defaultMessage="Statut" />
              </label>
              <p className={`font-medium ${
                partner.status === 'active' ? 'text-green-600' :
                partner.status === 'suspended' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {partner.status === 'active'
                  ? intl.formatMessage({ id: 'partner.profile.statusActive', defaultMessage: 'Actif' })
                  : partner.status === 'suspended'
                  ? intl.formatMessage({ id: 'partner.profile.statusSuspended', defaultMessage: 'Suspendu' })
                  : intl.formatMessage({ id: 'partner.profile.statusBanned', defaultMessage: 'Bloqu\u00e9' })}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="partner.profile.affiliateCode" defaultMessage="Code affili\u00e9" />
              </label>
              <p className="text-lg text-blue-600 dark:text-blue-400 font-mono">{partner.affiliateCode}</p>
            </div>
          </div>
        </div>

        {/* Website Info (read-only) */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="partner.profile.websiteInfo" defaultMessage="Site partenaire" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="partner.profile.websiteName" defaultMessage="Nom du site" />
              </label>
              <p className="text-gray-900 dark:text-white">{partner.websiteName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="partner.profile.websiteUrl" defaultMessage="URL" />
              </label>
              <a
                href={partner.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {partner.websiteUrl}
              </a>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="partner.profile.category" defaultMessage="Cat\u00e9gorie" />
              </label>
              <p className="text-gray-900 dark:text-white capitalize">{partner.websiteCategory?.replace('_', ' ')}</p>
            </div>
            {partner.websiteTraffic && (
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="partner.profile.traffic" defaultMessage="Trafic" />
                </label>
                <p className="text-gray-900 dark:text-white">{partner.websiteTraffic}</p>
              </div>
            )}
          </div>
          {partner.websiteDescription && (
            <div className="mt-4">
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="partner.profile.websiteDescription" defaultMessage="Description" />
              </label>
              <p className="text-gray-600 dark:text-gray-400">{partner.websiteDescription}</p>
            </div>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            <FormattedMessage
              id="partner.profile.websiteReadonly"
              defaultMessage="Les informations du site sont g\u00e9r\u00e9es par l'administration. Contactez-nous pour toute modification."
            />
          </p>
        </div>

        {/* Contact Info (editable) */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg dark:text-white font-semibold">
                <FormattedMessage id="partner.profile.contactInfo" defaultMessage="Coordonn\u00e9es" />
              </h2>
            </div>
            {!editingContact && (
              <button
                onClick={() => {
                  setContactForm({
                    phone: partner.phone || '',
                    contactName: partner.contactName || '',
                    contactEmail: partner.contactEmail || '',
                    contactPhone: partner.contactPhone || '',
                  });
                  setEditingContact(true);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <FormattedMessage id="partner.profile.edit" defaultMessage="Modifier" />
              </button>
            )}
          </div>

          {editingContact ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                    <FormattedMessage id="partner.profile.phone" defaultMessage="T\u00e9l\u00e9phone" />
                  </label>
                  <input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full px-4 py-2 min-h-[48px] rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                    <FormattedMessage id="partner.profile.contactName" defaultMessage="Nom du contact" />
                  </label>
                  <input
                    type="text"
                    value={contactForm.contactName}
                    onChange={(e) => setContactForm({ ...contactForm, contactName: e.target.value })}
                    className="w-full px-4 py-2 min-h-[48px] rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                    <FormattedMessage id="partner.profile.contactEmail" defaultMessage="Email du contact" />
                  </label>
                  <input
                    type="email"
                    value={contactForm.contactEmail}
                    onChange={(e) => setContactForm({ ...contactForm, contactEmail: e.target.value })}
                    className="w-full px-4 py-2 min-h-[48px] rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                    <FormattedMessage id="partner.profile.contactPhone" defaultMessage="T\u00e9l\u00e9phone du contact" />
                  </label>
                  <input
                    type="tel"
                    value={contactForm.contactPhone}
                    onChange={(e) => setContactForm({ ...contactForm, contactPhone: e.target.value })}
                    className="w-full px-4 py-2 min-h-[48px] rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveContact}
                  disabled={saving}
                  className="px-6 py-2 min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors active:scale-[0.98] flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <FormattedMessage id="common.save" defaultMessage="Enregistrer" />
                </button>
                <button
                  onClick={() => setEditingContact(false)}
                  className="px-6 py-2 min-h-[48px] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors active:scale-[0.98]"
                >
                  <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="partner.profile.phone" defaultMessage="T\u00e9l\u00e9phone" />
                </label>
                <p className="text-gray-900 dark:text-white">{partner.phone || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="partner.profile.contactName" defaultMessage="Nom du contact" />
                </label>
                <p className="text-gray-900 dark:text-white">{partner.contactName || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="partner.profile.contactEmail" defaultMessage="Email du contact" />
                </label>
                <p className="text-gray-900 dark:text-white">{partner.contactEmail || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="partner.profile.contactPhone" defaultMessage="T\u00e9l\u00e9phone du contact" />
                </label>
                <p className="text-gray-900 dark:text-white">{partner.contactPhone || '-'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Company Info */}
        {(partner.companyName || partner.vatNumber) && (
          <div className={`${UI.card} p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg dark:text-white font-semibold">
                <FormattedMessage id="partner.profile.company" defaultMessage="Entreprise" />
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {partner.companyName && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="partner.profile.companyName" defaultMessage="Raison sociale" />
                  </label>
                  <p className="text-gray-900 dark:text-white">{partner.companyName}</p>
                </div>
              )}
              {partner.vatNumber && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="partner.profile.vatNumber" defaultMessage="N\u00b0 TVA" />
                  </label>
                  <p className="text-gray-900 dark:text-white">{partner.vatNumber}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-green-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="partner.profile.stats" defaultMessage="Statistiques" />
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl dark:text-white font-bold">{formatCurrency(partner.totalEarned)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                <FormattedMessage id="partner.profile.totalEarned" defaultMessage="Total gagn\u00e9" />
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl dark:text-white font-bold">{partner.totalClicks}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                <FormattedMessage id="partner.profile.totalClicks" defaultMessage="Clics totaux" />
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl dark:text-white font-bold">{partner.totalCalls}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                <FormattedMessage id="partner.profile.totalCalls" defaultMessage="Appels totaux" />
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl dark:text-white font-bold">{partner.conversionRate?.toFixed(1) || '0.0'}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                <FormattedMessage id="partner.profile.conversionRate" defaultMessage="Taux conversion" />
              </p>
            </div>
          </div>
        </div>

        {/* Commission Config */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="partner.profile.commissionConfig" defaultMessage="Configuration des commissions" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="partner.profile.commLawyer" defaultMessage="Commission/appel avocat" />
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {formatCurrency(partner.commissionConfig.commissionPerCallLawyer)}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="partner.profile.commExpat" defaultMessage="Commission/appel expat" />
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {formatCurrency(partner.commissionConfig.commissionPerCallExpat)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            <FormattedMessage
              id="partner.profile.commReadonly"
              defaultMessage="Les taux de commission sont d\u00e9finis par l'administration."
            />
          </p>
        </div>

        {/* Payment Section */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-green-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="partner.profile.payment" defaultMessage="Paiements" />
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            <FormattedMessage
              id="partner.profile.paymentDescription"
              defaultMessage="Gerez vos methodes de paiement et vos retraits."
            />
          </p>
          <a
            href="/partner/paiements"
            className="inline-flex items-center gap-2 px-6 py-3 min-h-[48px] bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all active:scale-[0.98]"
          >
            <ExternalLink className="w-4 h-4" />
            <FormattedMessage id="partner.profile.goToPayments" defaultMessage="Gerer les paiements" />
          </a>
        </div>

        {/* Security / Password */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="partner.profile.security" defaultMessage="Securite" />
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            <FormattedMessage
              id="partner.profile.securityDescription"
              defaultMessage="Un email de reinitialisation sera envoye a votre adresse email."
            />
          </p>
          <button
            onClick={async () => {
              try {
                const auth = getAuth();
                await sendPasswordResetEmail(auth, partner.email);
                toast.success(
                  intl.formatMessage({
                    id: 'partner.profile.passwordResetSent',
                    defaultMessage: 'Email de reinitialisation envoye a {email}',
                  }, { email: partner.email })
                );
              } catch {
                toast.error(
                  intl.formatMessage({
                    id: 'partner.profile.passwordResetFailed',
                    defaultMessage: 'Echec de l\'envoi. Reessayez.',
                  })
                );
              }
            }}
            className="inline-flex items-center gap-2 px-6 py-3 min-h-[48px] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all active:scale-[0.98]"
          >
            <Lock className="w-4 h-4" />
            <FormattedMessage id="partner.profile.changePassword" defaultMessage="Changer le mot de passe" />
          </button>
        </div>
      </div>
    </PartnerDashboardLayout>
  );
};

export default PartnerProfile;
