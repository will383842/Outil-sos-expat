import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import {
  Check,
  X,
  AlertCircle,
  Clock,
  UserCheck,
  Scale,
  Globe,
  Mail,
  Phone,
  Languages,
  Calendar,
  Award,
  Filter,
  RefreshCw
} from 'lucide-react';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../contexts/types';

interface PendingProfile extends Omit<User, 'createdAt' | 'approvalStatus'> {
  id: string;
  createdAt: Timestamp;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

type FilterType = 'all' | 'lawyer' | 'expat';
type SortType = 'recent' | 'oldest' | 'name';

const ProfileValidation: React.FC = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);
  const { user: currentUser } = useAuth();
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [selectedProfile, setSelectedProfile] = useState<PendingProfile | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Charger les profils en attente
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', 'in', ['lawyer', 'expat']),
      where('approvalStatus', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const profiles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PendingProfile[];
        
        setPendingProfiles(profiles);
        setLoading(false);
      },
      (error) => {
        console.error('Erreur lors du chargement des profils:', error);
        setErrorMessage(t('profileValidation.loadingError'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Approuver un profil - synchronise users ET sos_profiles
  const approveProfile = async (profileId: string) => {
    if (!currentUser) return;

    setProcessingId(profileId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const batch = writeBatch(db);

      // Données communes pour l'approbation
      const approvalData = {
        isApproved: true,
        isVisible: true,
        isVisibleOnMap: true,
        approvalStatus: 'approved' as const,
        status: 'active' as const,
        isActive: true,
        approvedAt: serverTimestamp(),
        approvedBy: currentUser.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Nettoyer les anciens champs de rejet si existants
        rejectedAt: deleteField(),
        rejectionReason: deleteField(),
      };

      // Mettre à jour users
      batch.update(doc(db, 'users', profileId), approvalData);

      // Mettre à jour sos_profiles (même ID)
      batch.update(doc(db, 'sos_profiles', profileId), approvalData);

      await batch.commit();

      setSuccessMessage('✅ ' + t('profileValidation.approveSuccess'));
    } catch (error) {
      console.error('Erreur lors de l\'approbation:', error);
      setErrorMessage('❌ ' + t('profileValidation.approveError'));
    } finally {
      setProcessingId(null);
    }
  };

  // Rejeter un profil - synchronise users ET sos_profiles
  const rejectProfile = async () => {
    if (!currentUser || !selectedProfile) return;

    setProcessingId(selectedProfile.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const batch = writeBatch(db);

      // Données communes pour le rejet
      const rejectionData = {
        isApproved: false,
        isVisible: false,
        isVisibleOnMap: false,
        approvalStatus: 'rejected' as const,
        status: 'rejected' as const,
        isActive: false,
        rejectionReason: rejectionReason || 'Non spécifiée',
        rejectedAt: serverTimestamp(),
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser.uid,
        updatedAt: serverTimestamp(),
      };

      // Mettre à jour users
      batch.update(doc(db, 'users', selectedProfile.id), rejectionData);

      // Mettre à jour sos_profiles (même ID)
      batch.update(doc(db, 'sos_profiles', selectedProfile.id), rejectionData);

      await batch.commit();

      setSuccessMessage('❌ ' + t('profileValidation.rejectSuccess'));
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedProfile(null);
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      setErrorMessage(t('profileValidation.rejectError'));
    } finally {
      setProcessingId(null);
    }
  };

  // Formater la date
  const formatDate = (timestamp: Timestamp | Date | undefined): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Filtrer et trier les profils
  const filteredAndSortedProfiles = pendingProfiles
    .filter(profile => {
      if (filter === 'all') return true;
      return profile.role === filter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        case 'oldest':
          return a.createdAt.toMillis() - b.createdAt.toMillis();
        case 'name':
          return (a.fullName || '').localeCompare(b.fullName || '');
        default:
          return 0;
      }
    });

  const lawyerCount = pendingProfiles.filter(p => p.role === 'lawyer').length;
  const expatCount = pendingProfiles.filter(p => p.role === 'expat').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('profileValidation.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Messages de notification */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="text-green-600 hover:text-green-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="text-red-600 hover:text-red-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-blue-600" />
              {t('profileValidation.title')}
            </h1>
            <p className="text-gray-600 mt-2">
              {t('profileValidation.subtitle', { defaultValue: 'Approuvez ou rejetez les nouveaux profils avant leur mise en ligne' })}
            </p>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
            <div className="text-3xl font-bold">{pendingProfiles.length}</div>
            <div className="text-sm opacity-90">{t('profileValidation.pending', { defaultValue: 'en attente' })}</div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total en attente</p>
                <p className="text-2xl font-bold text-gray-900">{pendingProfiles.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avocats</p>
                <p className="text-2xl font-bold text-gray-900">{lawyerCount}</p>
              </div>
              <Scale className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expatriés aidants</p>
                <p className="text-2xl font-bold text-gray-900">{expatCount}</p>
              </div>
              <Globe className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et tri */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Filtres par type */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtrer :</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tous ({pendingProfiles.length})
              </button>
              <button
                onClick={() => setFilter('lawyer')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'lawyer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⚖️ Avocats ({lawyerCount})
              </button>
              <button
                onClick={() => setFilter('expat')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'expat'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🌍 Expatriés ({expatCount})
              </button>
            </div>
          </div>

          {/* Tri */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{t('profileValidation.sortBy')}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="recent">{t('profileValidation.sortRecent')}</option>
              <option value="oldest">{t('profileValidation.sortOldest')}</option>
              <option value="name">{t('profileValidation.sortName')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des profils */}
      {filteredAndSortedProfiles.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('profileValidation.noPending')}
          </h3>
          <p className="text-gray-600">
            {t('profileValidation.allProcessed')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAndSortedProfiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white rounded-lg border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              {/* Badge en attente */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t('profileValidation.pendingBadge')}
                </span>
                <span className="text-xs opacity-90">
                  {formatDate(profile.createdAt)}
                </span>
              </div>

              <div className="p-6">
                {/* En-tête du profil */}
                <div className="flex gap-4 mb-4">
                  <img
                    src={profile.profilePhoto || '/default-avatar.png'}
                    alt={profile.fullName}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    loading="lazy"
                    decoding="async"
                    width={80}
                    height={80}
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {profile.fullName || `${profile.firstName} ${profile.lastName}`}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        profile.role === 'lawyer'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {profile.role === 'lawyer' ? (
                          <>
                            <Scale className="w-3 h-3 mr-1" />
                            {t('profileValidation.lawyer')}
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3 mr-1" />
                            {t('profileValidation.expat')}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Globe className="w-4 h-4 mr-1" />
                      {profile.country || 'Non spécifié'}
                    </div>
                  </div>
                </div>

                {/* Informations détaillées */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{profile.email}</span>
                  </div>

                  {profile.phone && (
                    <div className="flex items-start gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        {profile.phoneCountryCode} {profile.phone}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-2 text-sm">
                    <Languages className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">
                      {profile.languages?.join(', ') || profile.languagesSpoken?.join(', ') || 'Non spécifié'}
                    </span>
                  </div>

                  {profile.specialties && profile.specialties.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Award className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        {profile.specialties.join(', ')}
                      </span>
                    </div>
                  )}

                  {profile.helpTypes && profile.helpTypes.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Award className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        {profile.helpTypes.join(', ')}
                      </span>
                    </div>
                  )}

                  {profile.yearsOfExperience && (
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">
                        {profile.yearsOfExperience} {t('profileValidation.yearsExp')}
                      </span>
                    </div>
                  )}

                  {profile.description && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                      <p className="line-clamp-3">{profile.description}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => approveProfile(profile.id)}
                    disabled={processingId === profile.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-5 h-5" />
                    {processingId === profile.id ? t('profileValidation.processing') : t('profileValidation.approve')}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProfile(profile);
                      setShowRejectModal(true);
                    }}
                    disabled={processingId === profile.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-5 h-5" />
                    {t('profileValidation.reject')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de rejet */}
      {showRejectModal && selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {t('profileValidation.rejectTitle')}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedProfile.fullName}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('profileValidation.rejectReason')}
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('profileValidation.rejectPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedProfile(null);
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-lg font-medium transition-colors"
              >
                {t('profileValidation.cancel')}
              </button>
              <button
                onClick={rejectProfile}
                disabled={processingId === selectedProfile.id}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === selectedProfile.id ? t('profileValidation.processing') : t('profileValidation.confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileValidation;