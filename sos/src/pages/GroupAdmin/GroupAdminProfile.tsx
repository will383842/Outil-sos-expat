/**
 * GroupAdminProfile - Profile settings for Group Administrators
 *
 * Shows personal info, group info, affiliate codes, and payment settings.
 * Modeled after InfluencerProfile.tsx with indigo color theme.
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useGroupAdmin } from '@/hooks/useGroupAdmin';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import { User, Users, Settings, CreditCard, Shield, Loader2 } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const GROUP_TYPE_LABELS: Record<string, string> = {
  travel: 'Voyage',
  expat: 'Expatriation',
  digital_nomad: 'Digital Nomad',
  immigration: 'Immigration',
  relocation: 'Relocation',
  language: 'Langue',
  country_specific: 'Pays specifique',
  profession: 'Profession',
  family: 'Famille',
  student: 'Etudiant',
  retirement: 'Retraite',
  other: 'Autre',
};

const GROUP_SIZE_LABELS: Record<string, string> = {
  lt1k: '< 1 000',
  '1k-5k': '1 000 - 5 000',
  '5k-10k': '5 000 - 10 000',
  '10k-25k': '10 000 - 25 000',
  '25k-50k': '25 000 - 50 000',
  '50k-100k': '50 000 - 100 000',
  gt100k: '100 000+',
};

const GroupAdminProfile: React.FC = () => {
  const { profile, isLoading } = useGroupAdmin();

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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="groupAdmin.profile.title" defaultMessage="Mon profil" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="groupAdmin.profile.subtitle" defaultMessage="Vos informations personnelles et parametres" />
          </p>
        </div>

        {/* Personal Info */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="groupAdmin.profile.personal" defaultMessage="Informations personnelles" />
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="groupAdmin.profile.name" defaultMessage="Nom" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.firstName} {profile?.lastName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="groupAdmin.profile.email" defaultMessage="Email" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="groupAdmin.profile.country" defaultMessage="Pays" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.country}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="groupAdmin.profile.language" defaultMessage="Langue" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.language}</p>
            </div>
            {profile?.phone && (
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="groupAdmin.profile.phone" defaultMessage="Telephone" />
                </label>
                <p className="text-gray-900 dark:text-white">{profile.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Group Info */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="groupAdmin.profile.groupInfo" defaultMessage="Informations du groupe" />
            </h2>
            {profile?.isGroupVerified && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                <Shield className="w-3 h-3" />
                <FormattedMessage id="groupAdmin.profile.verified" defaultMessage="Verifie" />
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="groupAdmin.profile.groupName" defaultMessage="Nom du groupe" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.groupName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="groupAdmin.profile.groupUrl" defaultMessage="URL du groupe" />
              </label>
              <p className="text-gray-900 dark:text-white truncate">
                {profile?.groupUrl ? (
                  <a href={profile.groupUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    {profile.groupUrl}
                  </a>
                ) : '-'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="groupAdmin.profile.groupType" defaultMessage="Type de groupe" />
              </label>
              <p className="text-gray-900 dark:text-white">
                {profile?.groupType ? GROUP_TYPE_LABELS[profile.groupType] || profile.groupType : '-'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="groupAdmin.profile.groupSize" defaultMessage="Taille du groupe" />
              </label>
              <p className="text-gray-900 dark:text-white">
                {profile?.groupSize ? GROUP_SIZE_LABELS[profile.groupSize] || profile.groupSize : '-'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="groupAdmin.profile.groupCountry" defaultMessage="Pays du groupe" />
              </label>
              <p className="text-gray-900 dark:text-white">{profile?.groupCountry || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
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

        {/* Affiliate Codes */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="groupAdmin.profile.codes" defaultMessage="Codes d'affiliation" />
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="groupAdmin.profile.clientCode" defaultMessage="Code client ($5 remise)" />
              </label>
              <p className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {profile?.affiliateCodeClient || '-'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="groupAdmin.profile.recruitCode" defaultMessage="Code recrutement" />
              </label>
              <p className="text-xl font-mono font-bold text-purple-600 dark:text-purple-400">
                {profile?.affiliateCodeRecruitment || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="groupAdmin.profile.payment" defaultMessage="Parametres de paiement" />
            </h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="groupAdmin.profile.paymentInfo"
              defaultMessage="Configurez votre methode de paiement lors de votre premiere demande de retrait."
            />
          </p>
        </div>
      </div>
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminProfile;
