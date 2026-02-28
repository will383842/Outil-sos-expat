/**
 * GroupAdminProfile - Profile settings for Group Administrators
 *
 * Shows personal info, group info, affiliate codes, and payment settings.
 * Includes photo upload to Firebase Storage + updateGroupAdminProfile callable.
 */

import React, { useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useGroupAdmin } from '@/hooks/useGroupAdmin';
import { storage, functionsAffiliate } from '@/config/firebase';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import { User, Users, Settings, CreditCard, Shield, Loader2, Camera, Upload } from 'lucide-react';
import { GROUP_TYPE_LABELS, GROUP_SIZE_LABELS, GroupType, GroupSizeTier } from '@/types/groupAdmin';
import { useAuth } from '@/contexts/AuthContext';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

// ----------------------------------------------------------------------------
// PhotoAvatar
// ----------------------------------------------------------------------------
interface PhotoAvatarProps {
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  uploading: boolean;
  onChangeClick: () => void;
}

const PhotoAvatar: React.FC<PhotoAvatarProps> = ({
  photoUrl,
  firstName,
  lastName,
  uploading,
  onChangeClick,
}) => {
  const initials =
    `${(firstName ?? '').charAt(0)}${(lastName ?? '').charAt(0)}`.toUpperCase() || '?';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-indigo-500/30 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40 select-none">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Photo de profil"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {initials}
            </span>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>

        {!uploading && (
          <button
            onClick={onChangeClick}
            aria-label="Modifier la photo de profil"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center shadow-lg transition-colors"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      <button
        onClick={onChangeClick}
        disabled={uploading}
        className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <FormattedMessage id="groupAdmin.profile.photo.uploading" defaultMessage="Envoi en cours..." />
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <FormattedMessage id="groupAdmin.profile.photo.change" defaultMessage="Modifier la photo" />
          </>
        )}
      </button>
    </div>
  );
};

// ----------------------------------------------------------------------------
// GroupAdminProfile
// ----------------------------------------------------------------------------
const GroupAdminProfile: React.FC = () => {
  const { profile, isLoading, refresh } = useGroupAdmin();
  const { user } = useAuth();
  const intl = useIntl();
  const locale = (intl.locale?.split('-')[0] || 'fr') as 'en' | 'fr' | 'es';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);

  const displayedPhoto = localPhotoUrl ?? profile?.photoUrl ?? null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(intl.formatMessage({
        id: 'groupAdmin.profile.photo.errorType',
        defaultMessage: 'Format invalide. Utilisez JPG, PNG ou WebP.',
      }));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(intl.formatMessage(
        { id: 'groupAdmin.profile.photo.errorSize', defaultMessage: 'Fichier trop volumineux (max {max} Mo).' },
        { max: MAX_FILE_SIZE_MB }
      ));
      return;
    }

    if (!user?.uid) {
      toast.error('Utilisateur non authentifié.');
      return;
    }

    try {
      setUploading(true);

      const storageRef = ref(storage, `group_admin_photos/${user.uid}/profile.jpg`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadURL = await getDownloadURL(storageRef);

      setLocalPhotoUrl(downloadURL);

      const updateProfile = httpsCallable(functionsAffiliate, 'updateGroupAdminProfile');
      await updateProfile({ photoUrl: downloadURL });

      refresh().catch(() => {});

      toast.success(intl.formatMessage({
        id: 'groupAdmin.profile.photo.success',
        defaultMessage: 'Photo mise à jour avec succès.',
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[GroupAdminProfile] Photo upload failed:', msg);
      setLocalPhotoUrl(null);
      toast.error(intl.formatMessage(
        { id: 'groupAdmin.profile.photo.error', defaultMessage: "Échec de l'envoi : {msg}" },
        { msg }
      ));
    } finally {
      setUploading(false);
    }
  };

  const openFilePicker = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <GroupAdminDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </GroupAdminDashboardLayout>
    );
  }

  return (
    <GroupAdminDashboardLayout>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="groupAdmin.profile.title" defaultMessage="Mon profil" />
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            <FormattedMessage id="groupAdmin.profile.subtitle" defaultMessage="Vos informations personnelles et paramètres" />
          </p>
        </div>

        {/* Photo */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-5">
            <Camera className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="groupAdmin.profile.photo.title" defaultMessage="Photo de profil" />
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <PhotoAvatar
              photoUrl={displayedPhoto}
              firstName={profile?.firstName}
              lastName={profile?.lastName}
              uploading={uploading}
              onChangeClick={openFilePicker}
            />
            <div className="text-center sm:text-left">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                <FormattedMessage
                  id="groupAdmin.profile.photo.hint"
                  defaultMessage="Votre photo apparaîtra dans votre profil et sur le classement."
                />
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                <FormattedMessage
                  id="groupAdmin.profile.photo.formats"
                  defaultMessage="Formats acceptés : JPG, PNG, WebP — max {max} Mo"
                  values={{ max: MAX_FILE_SIZE_MB }}
                />
              </p>
            </div>
          </div>
        </div>

        {/* Informations personnelles */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="groupAdmin.profile.personal" defaultMessage="Informations personnelles" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                <FormattedMessage id="groupAdmin.profile.name" defaultMessage="Nom" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.firstName} {profile?.lastName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                <FormattedMessage id="groupAdmin.profile.email" defaultMessage="Email" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                <FormattedMessage id="groupAdmin.profile.country" defaultMessage="Pays" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.country}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                <FormattedMessage id="groupAdmin.profile.language" defaultMessage="Langue" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.language}</p>
            </div>
            {profile?.phone && (
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                  <FormattedMessage id="groupAdmin.profile.phone" defaultMessage="Téléphone" />
                </label>
                <p className="text-gray-900 dark:text-white">{profile.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Informations du groupe */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="groupAdmin.profile.groupInfo" defaultMessage="Informations du groupe" />
            </h2>
            {profile?.isGroupVerified && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                <Shield className="w-3 h-3" />
                <FormattedMessage id="groupAdmin.profile.verified" defaultMessage="Vérifié" />
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                <FormattedMessage id="groupAdmin.profile.groupName" defaultMessage="Nom du groupe" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.groupName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                <FormattedMessage id="groupAdmin.profile.groupUrl" defaultMessage="URL du groupe" />
              </label>
              <p className="text-gray-900 dark:text-white truncate">
                {profile?.groupUrl ? (
                  <a
                    href={profile.groupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {profile.groupUrl}
                  </a>
                ) : '-'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                <FormattedMessage id="groupAdmin.profile.groupType" defaultMessage="Type de groupe" />
              </label>
              <p className="text-gray-900 dark:text-white">
                {profile?.groupType
                  ? (GROUP_TYPE_LABELS[profile.groupType as GroupType]?.[locale]
                      ?? GROUP_TYPE_LABELS[profile.groupType as GroupType]?.fr
                      ?? profile.groupType)
                  : '-'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                <FormattedMessage id="groupAdmin.profile.groupSize" defaultMessage="Taille du groupe" />
              </label>
              <p className="text-gray-900 dark:text-white">
                {profile?.groupSize
                  ? GROUP_SIZE_LABELS[profile.groupSize as GroupSizeTier] || profile.groupSize
                  : '-'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                <FormattedMessage id="groupAdmin.profile.groupCountry" defaultMessage="Pays du groupe" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.groupCountry || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                <FormattedMessage id="groupAdmin.profile.groupLanguage" defaultMessage="Langue du groupe" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.groupLanguage || '-'}</p>
            </div>
          </div>
          {profile?.groupDescription && (
            <div className="mt-4">
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="groupAdmin.profile.groupDescription" defaultMessage="Description" />
              </label>
              <p className="text-gray-700 dark:text-gray-300">{profile.groupDescription}</p>
            </div>
          )}
        </div>

        {/* Codes d'affiliation */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="groupAdmin.profile.codes" defaultMessage="Codes d'affiliation" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                <FormattedMessage id="groupAdmin.profile.clientCode" defaultMessage="Code client ($5 remise)" />
              </label>
              <p className="text-xl text-indigo-600 dark:text-indigo-400 font-mono">
                {profile?.affiliateCodeClient || '-'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-0.5">
                <FormattedMessage id="groupAdmin.profile.recruitCode" defaultMessage="Code recrutement" />
              </label>
              <p className="text-xl text-purple-600 dark:text-purple-400 font-mono">
                {profile?.affiliateCodeRecruitment || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Paiement */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-green-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="groupAdmin.profile.payment" defaultMessage="Paramètres de paiement" />
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            <FormattedMessage
              id="groupAdmin.profile.paymentInfo"
              defaultMessage="Configurez votre méthode de paiement lors de votre première demande de retrait."
            />
          </p>
        </div>
      </div>
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminProfile;
