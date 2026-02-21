/**
 * InfluencerProfile - Profile settings with photo upload
 */

import React, { useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useInfluencer } from '@/hooks/useInfluencer';
import { useAuth } from '@/contexts/useAuth';
import type { InfluencerPlatform } from '@/types/influencer';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import { User, Globe, CreditCard, Settings, Camera, Loader2, CheckCircle } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functionsWest2 } from '@/config/firebase';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const InfluencerProfile: React.FC = () => {
  const intl = useIntl();
  const { dashboardData: dashboard, refreshDashboard } = useInfluencer();
  const { user } = useAuth();
  const influencer = dashboard?.influencer;

  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayedPhoto = localPhotoUrl ?? influencer?.photoUrl ?? null;

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

    const previousPhoto = localPhotoUrl ?? influencer?.photoUrl ?? null;

    try {
      // 1. Upload to Firebase Storage
      const storageRef = ref(storage, `influencer_photos/${user.uid}/profile.jpg`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Optimistic update
      setLocalPhotoUrl(downloadURL);

      // 3. Save to Firestore via callable
      const updateProfile = httpsCallable(functionsWest2, 'updateInfluencerProfile');
      await updateProfile({ photoUrl: downloadURL });

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);

      if (refreshDashboard) refreshDashboard();
    } catch (err) {
      console.error('[InfluencerProfile] Photo upload error:', err);
      setLocalPhotoUrl(previousPhoto);
      setUploadError('Erreur lors du téléchargement. Veuillez réessayer.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <InfluencerDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="influencer.profile.title" defaultMessage="Mon profil" />
          </h1>
          <p className="text-gray-700 dark:text-gray-400">
            <FormattedMessage id="influencer.profile.subtitle" defaultMessage="Gérez vos informations personnelles et paramètres de paiement" />
          </p>
        </div>

        {/* Photo Card */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Camera className="w-5 h-5 text-red-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              Photo de profil
            </h2>
          </div>
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {displayedPhoto ? (
                <img
                  src={displayedPhoto}
                  alt="Photo de profil"
                  className="w-20 h-20 rounded-full object-cover border-2 border-red-500/30"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-orange-700 flex items-center justify-center border-2 border-red-500/30">
                  <span className="text-white font-bold text-2xl">
                    {influencer ? (influencer.firstName.charAt(0) + influencer.lastName.charAt(0)).toUpperCase() : '?'}
                  </span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Upload controls */}
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
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Téléchargement...</>
                ) : (
                  <><Camera className="w-4 h-4" /> Changer la photo</>
                )}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                JPG, PNG ou WebP • Max 5 MB • Visible dans le répertoire public
              </p>
              {uploadSuccess && (
                <div className="flex items-center gap-1.5 mt-2 text-green-500 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Photo mise à jour !</span>
                </div>
              )}
              {uploadError && (
                <p className="mt-2 text-sm text-red-500">{uploadError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-red-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="influencer.profile.personal" defaultMessage="Informations personnelles" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm dark:text-gray-400">
                <FormattedMessage id="influencer.profile.name" defaultMessage="Nom" />
              </label>
              <p className="text-gray-900 dark:text-white">{influencer?.firstName} {influencer?.lastName}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-400">
                <FormattedMessage id="influencer.profile.email" defaultMessage="Email" />
              </label>
              <p className="text-gray-900 dark:text-white">{influencer?.email}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-400">
                <FormattedMessage id="influencer.profile.country" defaultMessage="Pays" />
              </label>
              <p className="text-gray-900 dark:text-white">{influencer?.country}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-400">
                <FormattedMessage id="influencer.profile.language" defaultMessage="Langue" />
              </label>
              <p className="text-gray-900 dark:text-white">{influencer?.language}</p>
            </div>
          </div>
        </div>

        {/* Platforms */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="influencer.profile.platforms" defaultMessage="Plateformes" />
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {influencer?.platforms?.map((platform: InfluencerPlatform) => (
              <span
                key={platform}
                className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm"
              >
                {platform}
              </span>
            ))}
          </div>
          {influencer?.bio && (
            <div className="mt-4">
              <label className="text-sm dark:text-gray-400 block mb-1">
                <FormattedMessage id="influencer.profile.bio" defaultMessage="Bio" />
              </label>
              <p className="text-gray-700 dark:text-gray-300">{influencer.bio}</p>
            </div>
          )}
        </div>

        {/* Affiliate Codes */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="influencer.profile.codes" defaultMessage="Codes d'affiliation" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm dark:text-gray-400">
                <FormattedMessage id="influencer.profile.clientCode" defaultMessage="Code client (5% remise)" />
              </label>
              <p className="text-xl dark:text-red-400 font-mono">
                {influencer?.affiliateCodeClient}
              </p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-400">
                <FormattedMessage id="influencer.profile.recruitCode" defaultMessage="Code recrutement" />
              </label>
              <p className="text-xl dark:text-purple-400 font-mono">
                {influencer?.affiliateCodeRecruitment}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-green-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="influencer.profile.payment" defaultMessage="Paramètres de paiement" />
            </h2>
          </div>
          <p className="text-gray-700 dark:text-gray-400">
            <FormattedMessage
              id="influencer.profile.paymentInfo"
              defaultMessage="Configurez votre méthode de paiement lors de votre première demande de retrait."
            />
          </p>
        </div>
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerProfile;
