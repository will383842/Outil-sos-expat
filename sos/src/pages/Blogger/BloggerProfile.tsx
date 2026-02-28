/**
 * BloggerProfile - Profile settings with photo upload
 */

import React, { useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useBlogger } from '@/hooks/useBlogger';
import { useAuth } from '@/contexts/useAuth';
import { BloggerDashboardLayout } from '@/components/Blogger';
import { User, Globe, CreditCard, Settings, Badge, Camera, Loader2, CheckCircle } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functionsAffiliate } from '@/config/firebase';
import { BLOGGER_BADGE_INFO } from '@/types/blogger';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const BloggerProfile: React.FC = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intl = useIntl();
  const { blogger, dashboardData, isLoading } = useBlogger();
  const displayedPhoto = localPhotoUrl ?? blogger?.photoUrl ?? null;

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;


  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Veuillez selectionner une image (JPG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image trop grande (max 5 MB)");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    const previousPhoto = localPhotoUrl ?? blogger?.photoUrl ?? null;
    try {
      const storageRef = ref(storage, "blogger_photos/" + user.uid + "/profile.jpg");
      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadURL = await getDownloadURL(storageRef);
      setLocalPhotoUrl(downloadURL);
      const updateBloggerProfile = httpsCallable(functionsAffiliate, "updateBloggerProfile");
      await updateBloggerProfile({ photoUrl: downloadURL });
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error("[BloggerProfile] Photo upload failed:", err);
      setLocalPhotoUrl(previousPhoto);
      setUploadError("Echec du telechargement. Veuillez reessayer.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  if (isLoading) {
    return (
      <BloggerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </BloggerDashboardLayout>
    );
  }

  if (!blogger) return null;

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="blogger.profile.title" defaultMessage="Mon profil" />
          </h1>
          <p className="text-gray-700 dark:text-gray-700">
            <FormattedMessage id="blogger.profile.subtitle" defaultMessage="Gérez vos informations personnelles et paramètres" />
          </p>
        </div>

        {/* Photo Upload */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Camera className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="blogger.profile.photo" defaultMessage="Photo de profil" />
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                {displayedPhoto ? (
                  <img src={displayedPhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-2xl font-bold">
                    {blogger.firstName?.[0]?.toUpperCase() ?? "B"}
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
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Camera className="w-4 h-4" />
                <FormattedMessage id="blogger.profile.uploadPhoto" defaultMessage="Changer la photo" />
              </button>
              <p className="text-xs text-gray-500 mt-2">
                <FormattedMessage id="blogger.profile.photoHint" defaultMessage="JPG, PNG ou WebP. Max 5 MB." />
              </p>
              {uploadSuccess && (
                <div className="flex items-center gap-2 mt-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">
                    <FormattedMessage id="blogger.profile.photoSuccess" defaultMessage="Photo mise a jour avec succes" />
                  </span>
                </div>
              )}
              {uploadError && (
                <p className="text-sm text-red-600 mt-2">{uploadError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="blogger.profile.personal" defaultMessage="Informations personnelles" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.name" defaultMessage="Nom" />
              </label>
              <p className="text-gray-900 dark:text-white">{blogger.firstName} {blogger.lastName}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.email" defaultMessage="Email" />
              </label>
              <p className="text-gray-900 dark:text-white">{blogger.email}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.country" defaultMessage="Pays" />
              </label>
              <p className="text-gray-900 dark:text-white">{blogger.country}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.language" defaultMessage="Langue" />
              </label>
              <p className="text-gray-900 dark:text-white">{blogger.language}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.memberSince" defaultMessage="Membre depuis" />
              </label>
              <p className="text-gray-900 dark:text-white">
                {new Date(blogger.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.status" defaultMessage="Statut" />
              </label>
              <p className={`font-medium ${
                blogger.status === 'active' ? 'text-green-600' :
                blogger.status === 'suspended' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {blogger.status === 'active' ? 'Actif' : blogger.status === 'suspended' ? 'Suspendu' : 'Bloqué'}
              </p>
            </div>
          </div>
        </div>

        {/* Blog Info */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="blogger.profile.blogInfo" defaultMessage="Informations du blog" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.blogName" defaultMessage="Nom du blog" />
              </label>
              <p className="text-gray-900 dark:text-white">{blogger.blogName}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.blogUrl" defaultMessage="URL" />
              </label>
              <a
                href={blogger.blogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline"
              >
                {blogger.blogUrl}
              </a>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.blogTheme" defaultMessage="Thématique" />
              </label>
              <p className="text-gray-900 dark:text-white capitalize">{blogger.blogTheme?.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.blogTraffic" defaultMessage="Trafic mensuel" />
              </label>
              <p className="text-gray-900 dark:text-white">{blogger.blogTraffic}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.blogLanguage" defaultMessage="Langue du blog" />
              </label>
              <p className="text-gray-900 dark:text-white">{blogger.blogLanguage}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.blogCountry" defaultMessage="Pays ciblé" />
              </label>
              <p className="text-gray-900 dark:text-white">{blogger.blogCountry}</p>
            </div>
          </div>
          {blogger.blogDescription && (
            <div className="mt-4">
              <label className="text-sm dark:text-gray-700 block mb-1">
                <FormattedMessage id="blogger.profile.blogDescription" defaultMessage="Description" />
              </label>
              <p className="text-gray-700 dark:text-gray-700">{blogger.blogDescription}</p>
            </div>
          )}
        </div>

        {/* Affiliate Codes */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="blogger.profile.codes" defaultMessage="Codes d'affiliation" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.clientCode" defaultMessage="Code client ($10/appel)" />
              </label>
              <p className="text-xl dark:text-purple-400 font-mono">
                {blogger.affiliateCodeClient}
              </p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="blogger.profile.recruitCode" defaultMessage="Code recrutement ($5/appel)" />
              </label>
              <p className="text-xl dark:text-blue-400 font-mono">
                {blogger.affiliateCodeRecruitment}
              </p>
            </div>
          </div>
          <p className="text-xs dark:text-gray-600 mt-3">
            <FormattedMessage
              id="blogger.profile.noDiscount"
              defaultMessage="Note: Les blogueurs ne peuvent pas offrir de remise aux clients (commissions fixes uniquement)."
            />
          </p>
        </div>

        {/* Badges */}
        {blogger.badges && blogger.badges.length > 0 && (
          <div className={`${UI.card} p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <Badge className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg dark:text-white font-semibold">
                <FormattedMessage id="blogger.profile.badges" defaultMessage="Badges" />
              </h2>
            </div>
            <div className="flex gap-3">
              {blogger.badges.map((badge) => {
                const badgeInfo = BLOGGER_BADGE_INFO[badge as keyof typeof BLOGGER_BADGE_INFO];
                return (
                  <div
                    key={badge}
                    className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border dark:border-yellow-800 rounded-xl"
                  >
                    <span className="text-xl">{badgeInfo?.emoji || '🏆'}</span>
                    <div>
                      <p className="text-sm dark:text-yellow-200 font-medium">
                        {intl.locale === 'fr' ? badgeInfo?.labelFr : badgeInfo?.labelEn || badge}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-green-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="blogger.profile.stats" defaultMessage="Statistiques" />
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl dark:text-white font-bold">
                {formatCurrency(blogger.totalEarned)}
              </p>
              <p className="text-xs dark:text-gray-600">
                <FormattedMessage id="blogger.profile.totalEarned" defaultMessage="Total gagné" />
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl font-bold">
                {formatCurrency(blogger.availableBalance)}
              </p>
              <p className="text-xs dark:text-gray-600">
                <FormattedMessage id="blogger.profile.available" defaultMessage="Disponible" />
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl dark:text-white font-bold">
                {blogger.totalClients}
              </p>
              <p className="text-xs dark:text-gray-600">
                <FormattedMessage id="blogger.profile.clients" defaultMessage="Clients" />
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl dark:text-white font-bold">
                {blogger.totalRecruits}
              </p>
              <p className="text-xs dark:text-gray-600">
                <FormattedMessage id="blogger.profile.recruits" defaultMessage="Filleuls" />
              </p>
            </div>
          </div>
        </div>

        {/* Definitive Role Notice */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border dark:border-amber-800 rounded-xl p-4">
          <p className="text-sm dark:text-amber-300">
            <FormattedMessage
              id="blogger.profile.definitive"
              defaultMessage="Rappel: Votre statut de Blogueur Partenaire est définitif. Vous ne pouvez pas devenir Chatter ou Influenceur."
            />
          </p>
        </div>
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerProfile;
