/**
 * ChatterProfile - Profile settings with photo upload
 */

import React, { useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useChatter } from '@/hooks/useChatter';
import { useAuth } from '@/contexts/useAuth';
import { ChatterDashboardLayout } from '@/components/Chatter/Layout';
import { User, Globe, Settings, Trophy, CreditCard, Badge, Camera, Loader2, CheckCircle } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functionsWest2 } from '@/config/firebase';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const ChatterProfile: React.FC = () => {
  const { dashboardData, isLoading } = useChatter();
  const { user } = useAuth();
  const chatter = dashboardData?.chatter;

  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayedPhoto = localPhotoUrl ?? chatter?.photoUrl ?? null;

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

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

      const updateProfile = httpsCallable(functionsWest2, 'updateChatterProfile');
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
      <ChatterDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      </ChatterDashboardLayout>
    );
  }

  if (!chatter) return null;

  return (
    <ChatterDashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="chatter.profile.title" defaultMessage="Mon profil" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.profile.subtitle" defaultMessage="Vos informations personnelles et statistiques" />
          </p>
        </div>

        {/* Photo upload card */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Camera className="w-5 h-5 text-red-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="chatter.profile.photo" defaultMessage="Photo de profil" />
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              {displayedPhoto ? (
                <img
                  src={displayedPhoto}
                  alt="Photo de profil"
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-red-500/30"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-bold text-2xl">
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
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <FormattedMessage id="chatter.profile.photo.change" defaultMessage="Changer la photo" />
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">JPG, PNG, WebP — max 5 MB</p>
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            <FormattedMessage
              id="chatter.profile.photo.hint"
              defaultMessage="Cette photo sera visible dans le répertoire public des chatters si votre profil est activé."
            />
          </p>
        </div>

        {/* Personal Info */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-red-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="chatter.profile.personal" defaultMessage="Informations personnelles" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.name" defaultMessage="Nom" />
              </label>
              <p className="text-gray-900 dark:text-white">{chatter.firstName} {chatter.lastName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.email" defaultMessage="Email" />
              </label>
              <p className="text-gray-900 dark:text-white">{chatter.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.country" defaultMessage="Pays" />
              </label>
              <p className="text-gray-900 dark:text-white">{chatter.country}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.language" defaultMessage="Langue" />
              </label>
              <p className="text-gray-900 dark:text-white">{chatter.language}</p>
            </div>
          </div>
        </div>
      </div>
    </ChatterDashboardLayout>
  );
};

export default ChatterProfile;
