import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  deleteField,
  getDocs,
  limit // ✅ OPTIMISATION: Ajout de limit pour réduire les lectures
} from 'firebase/firestore';
import {
  Check,
  X,
  Eye,
  EyeOff,
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
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../contexts/types';
import AdminLayout from '../../components/admin/AdminLayout';
import Modal from '../../components/common/Modal';

interface PendingProfile extends Omit<User, 'createdAt' | 'approvalStatus'> {
  id: string;
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  rejectedAt?: Timestamp;
  reviewedAt?: Timestamp;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  status?: 'active' | 'suspended' | 'pending' | 'banned';
  rejectionReason?: string;
}

type FilterType = 'all' | 'lawyer' | 'expat';
type SortType = 'recent' | 'oldest' | 'name';
type StatusTab = 'pending' | 'approved' | 'rejected';


  const AdminApprovals: React.FC = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values);
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<PendingProfile[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [statusTab, setStatusTab] = useState<StatusTab>('pending');
  const [selectedProfile, setSelectedProfile] = useState<PendingProfile | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'block' | 'unblock' | 'hide' | 'show'>('block');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());
  const [isFixingData, setIsFixingData] = useState(false);
  const [fixedCount, setFixedCount] = useState<number | null>(null);

  // ✅ CORRECTION 1: Charger les profils depuis sos_profiles
  useEffect(() => {
    let q;

    // ✅ OPTIMISATION: Ajout de limit(100) pour réduire les lectures Firestore
    // Économie estimée: ~5-10€/mois
    if (statusTab === 'pending') {
      q = query(
        collection(db, 'sos_profiles'),
        where('type', 'in', ['lawyer', 'expat']),
        where('approvalStatus', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(100) // ✅ OPTIMISATION
      );
    } else if (statusTab === 'approved') {
      q = query(
        collection(db, 'sos_profiles'),
        where('type', 'in', ['lawyer', 'expat']),
        where('approvalStatus', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(100) // ✅ OPTIMISATION
      );
    } else {
      q = query(
        collection(db, 'sos_profiles'),
        where('type', 'in', ['lawyer', 'expat']),
        where('approvalStatus', '==', 'rejected'),
        orderBy('createdAt', 'desc'),
        limit(100) // ✅ OPTIMISATION
      );
    }

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const profilesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PendingProfile[];
        
        setProfiles(profilesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading profiles:', error);
        setErrorMessage(t('admin.approvals.error.loading'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [statusTab]);

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

  // ✅ CORRECTION 2: Approuver un profil avec TOUS les champs (SYNC users + sos_profiles)
  const approveProfile = async (profileId: string) => {
    if (!currentUser) return;

    setProcessingId(profileId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // 🔒 SYNCHRONISATION: Mise à jour des DEUX collections atomiquement
      const batch = writeBatch(db);

      const approvalData = {
        // ===== APPROBATION =====
        isApproved: true,
        approvalStatus: 'approved',

        // ===== TIMESTAMPS =====
        approvedAt: serverTimestamp(),
        approvedBy: currentUser.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // ===== NETTOYAGE DES ANCIENS REJETS =====
        rejectedAt: deleteField(),
        rejectionReason: deleteField(),
      };

      // Mise à jour sos_profiles (profil complet)
      batch.update(doc(db, 'sos_profiles', profileId), {
        ...approvalData,
        // ===== VÉRIFICATION =====
        verificationStatus: 'pending',
        // ===== VISIBILITÉ =====
        isVisible: true,
        isVisibleOnMap: true,
        // ===== STATUT =====
        status: 'active',
        isActive: true,
      });

      // 🔒 SYNC: Mise à jour users (pour AuthContext)
      batch.update(doc(db, 'users', profileId), approvalData);

      await batch.commit();

      setSuccessMessage(t('admin.approvals.success.approved'));
    } catch (error) {
      console.error('Error approving profile:', error);
      setErrorMessage(t('admin.approvals.error.approving'));
    } finally {
      setProcessingId(null);
    }
  };

  // ✅ CORRECTION 3: Rejeter un profil avec TOUS les champs (SYNC users + sos_profiles)
  const rejectProfile = async () => {
    if (!currentUser || !selectedProfile) return;

    setProcessingId(selectedProfile.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // 🔒 SYNCHRONISATION: Mise à jour des DEUX collections atomiquement
      const batch = writeBatch(db);

      const rejectionData = {
        // ===== REJET =====
        isApproved: false,
        approvalStatus: 'rejected',
        // ===== RAISON + TIMESTAMPS =====
        rejectionReason: rejectionReason || t('admin.approvals.modal.notSpecified'),
        rejectedAt: serverTimestamp(),
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      };

      // Mise à jour sos_profiles (profil complet)
      batch.update(doc(db, 'sos_profiles', selectedProfile.id), {
        ...rejectionData,
        // ===== VÉRIFICATION =====
        verificationStatus: 'rejected',
        // ===== VISIBILITÉ =====
        isVisible: false,
        isVisibleOnMap: false,
        // ===== STATUT =====
        status: 'pending',
        isActive: false,
      });

      // 🔒 SYNC: Mise à jour users (pour AuthContext)
      batch.update(doc(db, 'users', selectedProfile.id), rejectionData);

      await batch.commit();

      setSuccessMessage(t('admin.approvals.success.rejected'));
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedProfile(null);
    } catch (error) {
      console.error('Error rejecting profile:', error);
      setErrorMessage(t('admin.approvals.error.rejecting'));
    } finally {
      setProcessingId(null);
    }
  };

  // ✅ CORRECTION 4: Toggle visibilité
  const toggleVisibility = async (profileId: string, currentVisibility: boolean) => {
    setProcessingId(profileId);
    try {
      await updateDoc(doc(db, 'sos_profiles', profileId), {  // ✅ CORRIGÉ
        isVisible: !currentVisibility,
        isVisibleOnMap: !currentVisibility,
        updatedAt: serverTimestamp()
      });
      setSuccessMessage(currentVisibility ? t('admin.approvals.success.hidden') : t('admin.approvals.success.visible'));
    } catch (error) {
      console.error('Error toggle visibility:', error);
      setErrorMessage(t('admin.approvals.error.visibility'));
    } finally {
      setProcessingId(null);
    }
  };

  // ✅ CORRECTION 5: Bloquer/Débloquer
  const toggleBlockStatus = async (profileId: string, currentStatus?: string) => {
    setProcessingId(profileId);
    try {
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
      await updateDoc(doc(db, 'sos_profiles', profileId), {  // ✅ CORRIGÉ
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setSuccessMessage(newStatus === 'suspended' ? t('admin.approvals.success.blocked') : t('admin.approvals.success.unblocked'));
      setShowActionModal(false);
      setSelectedProfile(null);
    } catch (error) {
      console.error('Error toggle block:', error);
      setErrorMessage(t('admin.approvals.error.blocking'));
    } finally {
      setProcessingId(null);
    }
  };

  // ✅ CORRECTION 6: Réparer les données incohérentes (approvedAt présent mais isApproved: false)
  const fixInconsistentData = async () => {
    if (!currentUser) return;

    setIsFixingData(true);
    setErrorMessage('');
    setSuccessMessage('');
    setFixedCount(null);

    try {
      // Chercher tous les profils qui ont approvedAt mais isApproved !== true
      const sosProfilesSnapshot = await getDocs(
        query(
          collection(db, 'sos_profiles'),
          where('type', 'in', ['lawyer', 'expat'])
        )
      );

      const profilesToFix: string[] = [];

      sosProfilesSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        // Profil incohérent: a approvedAt mais isApproved n'est pas true
        if (data.approvedAt && data.isApproved !== true) {
          profilesToFix.push(docSnap.id);
        }
        // Profil incohérent: a approvedBy mais isApproved n'est pas true
        else if (data.approvedBy && data.isApproved !== true) {
          profilesToFix.push(docSnap.id);
        }
        // Profil incohérent: approvalStatus est 'approved' mais isApproved n'est pas true
        else if (data.approvalStatus === 'approved' && data.isApproved !== true) {
          profilesToFix.push(docSnap.id);
        }
        // Profil incohérent: isApproved est true mais isVisible n'est pas true
        else if (data.isApproved === true && data.isVisible !== true) {
          profilesToFix.push(docSnap.id);
        }
      });

      if (profilesToFix.length === 0) {
        setSuccessMessage(t('admin.approvals.success.noInconsistency'));
        setFixedCount(0);
        return;
      }

      // Corriger par lots de 500 (limite Firestore)
      const batchSize = 450; // un peu moins que 500 pour sécurité
      let totalFixed = 0;

      for (let i = 0; i < profilesToFix.length; i += batchSize) {
        const batchProfiles = profilesToFix.slice(i, i + batchSize);
        const batch = writeBatch(db);

        for (const profileId of batchProfiles) {
          // Correction des données dans sos_profiles
          batch.update(doc(db, 'sos_profiles', profileId), {
            isApproved: true,
            isVisible: true,
            isVisibleOnMap: true,
            approvalStatus: 'approved',
            status: 'active',
            isActive: true,
            updatedAt: serverTimestamp(),
            // Nettoyer les anciens rejets
            rejectedAt: deleteField(),
            rejectionReason: deleteField(),
          });

          // Correction des données dans users
          batch.update(doc(db, 'users', profileId), {
            isApproved: true,
            isVisible: true,
            approvalStatus: 'approved',
            updatedAt: serverTimestamp(),
            rejectedAt: deleteField(),
            rejectionReason: deleteField(),
          });
        }

        await batch.commit();
        totalFixed += batchProfiles.length;
      }

      setFixedCount(totalFixed);
      setSuccessMessage(t('admin.approvals.success.fixedProfiles', { count: totalFixed }));
    } catch (error) {
      console.error('Error fixing data:', error);
      setErrorMessage(t('admin.approvals.error.fixingData'));
    } finally {
      setIsFixingData(false);
    }
  };

  // ✅ CORRECTION 6: Actions en lot - Approuver
  const handleBulkApprove = async () => {
    if (selectedProfiles.length === 0) {
      setErrorMessage(t('admin.approvals.error.selectProfile'));
      return;
    }

    if (!confirm(t('admin.approvals.confirm.approve', { count: selectedProfiles.length }))) return;

    try {
      for (const profileId of selectedProfiles) {
        await approveProfile(profileId);
      }
      setSelectedProfiles([]);
      setSuccessMessage(t('admin.approvals.success.bulkApproved', { count: selectedProfiles.length }));
    } catch (error) {
      console.error('Error bulk action:', error);
      setErrorMessage(t('admin.approvals.error.bulkAction'));
    }
  };

  // ✅ CORRECTION 7: Actions en lot - Rejeter (SYNC users + sos_profiles)
  const handleBulkReject = async () => {
    if (selectedProfiles.length === 0) {
      setErrorMessage(t('admin.approvals.error.selectProfile'));
      return;
    }

    const reason = prompt(t('admin.approvals.prompt.rejectionReason'));
    if (!reason) return;

    if (!confirm(t('admin.approvals.confirm.reject', { count: selectedProfiles.length }))) return;

    try {
      // 🔒 SYNCHRONISATION: Batch pour toutes les mises à jour
      const batch = writeBatch(db);

      for (const profileId of selectedProfiles) {
        const rejectionData = {
          isApproved: false,
          approvalStatus: 'rejected',
          rejectionReason: reason,
          rejectedAt: serverTimestamp(),
          reviewedAt: serverTimestamp(),
          reviewedBy: currentUser?.uid,
          updatedAt: serverTimestamp()
        };

        // Mise à jour sos_profiles
        batch.update(doc(db, 'sos_profiles', profileId), {
          ...rejectionData,
          isVisible: false,
          isVisibleOnMap: false,
          verificationStatus: 'rejected',
          status: 'pending',
          isActive: false,
        });

        // 🔒 SYNC: Mise à jour users
        batch.update(doc(db, 'users', profileId), rejectionData);
      }

      await batch.commit();
      setSelectedProfiles([]);
      setSuccessMessage(t('admin.approvals.success.bulkRejected', { count: selectedProfiles.length }));
    } catch (error) {
      console.error('Error bulk action:', error);
      setErrorMessage(t('admin.approvals.error.bulkAction'));
    }
  };

  // ✅ CORRECTION 8: Actions en lot - Toggle visibilité
  const handleBulkToggleVisibility = async (makeVisible: boolean) => {
    if (selectedProfiles.length === 0) {
      setErrorMessage(t('admin.approvals.error.selectProfile'));
      return;
    }

    if (!confirm(makeVisible ? t('admin.approvals.confirm.makeVisible', { count: selectedProfiles.length }) : t('admin.approvals.confirm.hide', { count: selectedProfiles.length }))) return;

    try {
      for (const profileId of selectedProfiles) {
        await updateDoc(doc(db, 'sos_profiles', profileId), {  // ✅ CORRIGÉ
          isVisible: makeVisible,
          isVisibleOnMap: makeVisible,
          updatedAt: serverTimestamp()
        });
      }
      setSelectedProfiles([]);
      setSuccessMessage(makeVisible ? t('admin.approvals.success.bulkVisible', { count: selectedProfiles.length }) : t('admin.approvals.success.bulkHidden', { count: selectedProfiles.length }));
    } catch (error) {
      console.error('Error bulk action:', error);
      setErrorMessage(t('admin.approvals.error.bulkAction'));
    }
  };

  // ✅ CORRECTION 9: Actions en lot - Bloquer
  const handleBulkBlock = async () => {
    if (selectedProfiles.length === 0) {
      setErrorMessage(t('admin.approvals.error.selectProfile'));
      return;
    }

    if (!confirm(t('admin.approvals.confirm.block', { count: selectedProfiles.length }))) return;

    try {
      for (const profileId of selectedProfiles) {
        await updateDoc(doc(db, 'sos_profiles', profileId), {  // ✅ CORRIGÉ
          status: 'suspended',
          updatedAt: serverTimestamp()
        });
      }
      setSelectedProfiles([]);
      setSuccessMessage(t('admin.approvals.success.bulkBlocked', { count: selectedProfiles.length }));
    } catch (error) {
      console.error('Error bulk action:', error);
      setErrorMessage(t('admin.approvals.error.bulkAction'));
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
  const filteredAndSortedProfiles = profiles
    .filter(profile => {
      if (filter === 'all') return true;
      return profile.role === filter || profile.type === filter;  // ✅ Supporte role ET type
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          const dateA = statusTab === 'approved' ? a.approvedAt : a.createdAt;
          const dateB = statusTab === 'approved' ? b.approvedAt : b.createdAt;
          return (dateB?.toMillis() || 0) - (dateA?.toMillis() || 0);
        case 'oldest':
          const dateAOld = statusTab === 'approved' ? a.approvedAt : a.createdAt;
          const dateBOld = statusTab === 'approved' ? b.approvedAt : b.createdAt;
          return (dateAOld?.toMillis() || 0) - (dateBOld?.toMillis() || 0);
        case 'name':
          return (a.fullName || '').localeCompare(b.fullName || '');
        default:
          return 0;
      }
    });

  const lawyerCount = profiles.filter(p => p.role === 'lawyer' || p.type === 'lawyer').length;
  const expatCount = profiles.filter(p => p.role === 'expat' || p.type === 'expat').length;

  const toggleProfileExpansion = (profileId: string) => {
    setExpandedProfiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">{t('admin.approvals.loading')}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Messages de notification */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center">
              <Check className="w-5 h-5 mr-2" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-green-600 hover:text-green-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-red-600 hover:text-red-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-blue-600" />
              {t('admin.approvals.title')}
            </h1>
            <p className="text-gray-600 mt-2">
              {t('admin.approvals.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Bouton de correction des données incohérentes */}
            <button
              onClick={fixInconsistentData}
              disabled={isFixingData}
              className="flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('admin.approvals.repairData')}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFixingData ? 'animate-spin' : ''}`} />
              {isFixingData ? t('admin.approvals.repairing') : t('admin.approvals.repairData')}
              {fixedCount !== null && fixedCount > 0 && (
                <span className="ml-2 bg-white text-amber-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {fixedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('admin.approvals.filters')}
            </button>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
              <div className="text-3xl font-bold">{profiles.length}</div>
              <div className="text-sm opacity-90">
                {statusTab === 'pending' ? t('admin.approvals.pending') : statusTab === 'approved' ? t('admin.approvals.approved') : t('admin.approvals.rejected')}
              </div>
            </div>
          </div>
        </div>

        {/* Onglets de statut */}
        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setStatusTab('pending')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                statusTab === 'pending'
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-500'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Clock className="w-5 h-5" />
              {t('admin.approvals.tabPending')}
            </button>
            <button
              onClick={() => setStatusTab('approved')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                statusTab === 'approved'
                  ? 'bg-green-100 text-green-700 border-2 border-green-500'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              {t('admin.approvals.tabApproved')}
            </button>
            <button
              onClick={() => setStatusTab('rejected')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                statusTab === 'rejected'
                  ? 'bg-red-100 text-red-700 border-2 border-red-500'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <XCircle className="w-5 h-5" />
              {t('admin.approvals.tabRejected')}
            </button>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">{t('admin.approvals.total')}</h3>
                <p className="text-2xl font-bold text-gray-900">{profiles.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Scale className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">{t('admin.approvals.lawyers')}</h3>
                <p className="text-2xl font-bold text-gray-900">{lawyerCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Globe className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">{t('admin.approvals.expats')}</h3>
                <p className="text-2xl font-bold text-gray-900">{expatCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et tri */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">{t('admin.approvals.filterTitle')}</h3>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Filtres par type */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{t('admin.approvals.filterBy')}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('admin.approvals.all')} ({profiles.length})
                  </button>
                  <button
                    onClick={() => setFilter('lawyer')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                      filter === 'lawyer'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Scale className="w-4 h-4 mr-1" />
                    {t('admin.approvals.lawyers')} ({lawyerCount})
                  </button>
                  <button
                    onClick={() => setFilter('expat')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                      filter === 'expat'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Globe className="w-4 h-4 mr-1" />
                    {t('admin.approvals.expats')} ({expatCount})
                  </button>
                </div>
              </div>

              {/* Tri */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{t('admin.approvals.sortBy')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="recent">{t('admin.approvals.sortRecent')}</option>
                  <option value="oldest">{t('admin.approvals.sortOldest')}</option>
                  <option value="name">{t('admin.approvals.sortName')}</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Actions en lot */}
        {selectedProfiles.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-orange-800 font-medium">
                {t('admin.approvals.selectedProfiles', { count: selectedProfiles.length })}
              </p>
              <div className="flex space-x-2 flex-wrap gap-2">
                {statusTab === 'pending' && (
                  <>
                    <button
                      onClick={handleBulkApprove}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center text-sm"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {t('action.approve')}
                    </button>
                    <button
                      onClick={handleBulkReject}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center text-sm"
                    >
                      <X className="w-4 h-4 mr-1" />
                      {t('action.reject')}
                    </button>
                  </>
                )}
                {statusTab === 'approved' && (
                  <>
                    <button
                      onClick={() => handleBulkToggleVisibility(true)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center text-sm"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {t('admin.approvals.makeVisible')}
                    </button>
                    <button
                      onClick={() => handleBulkToggleVisibility(false)}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center text-sm"
                    >
                      <EyeOff className="w-4 h-4 mr-1" />
                      {t('admin.approvals.hide')}
                    </button>
                    <button
                      onClick={handleBulkBlock}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center text-sm"
                    >
                      <Lock className="w-4 h-4 mr-1" />
                      {t('action.block')}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedProfiles([])}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {t('action.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des profils */}
        {filteredAndSortedProfiles.length === 0 ? (
          <div className="bg-white p-12 rounded-lg border border-gray-200 text-center shadow-sm">
            <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {statusTab === 'pending' ? t('admin.approvals.empty.pending') : statusTab === 'approved' ? t('admin.approvals.empty.approved') : t('admin.approvals.empty.rejected')}
            </h3>
            <p className="text-gray-600">
              {statusTab === 'pending'
                ? t('admin.approvals.empty.allProcessed')
                : t('admin.approvals.empty.noProfileYet', { status: statusTab === 'approved' ? t('admin.approvals.approved') : t('admin.approvals.rejected') })
              }
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedProfiles.length === filteredAndSortedProfiles.length && filteredAndSortedProfiles.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProfiles(filteredAndSortedProfiles.map(p => p.id));
                          } else {
                            setSelectedProfiles([]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.approvals.table.profile')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.approvals.table.type')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.approvals.table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.approvals.table.country')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {statusTab === 'approved' ? t('admin.approvals.table.validatedAt') : t('admin.approvals.table.registeredAt')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.approvals.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedProfiles.map((profile) => (
                    <React.Fragment key={profile.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedProfiles.includes(profile.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProfiles(prev => [...prev, profile.id]);
                              } else {
                                setSelectedProfiles(prev => prev.filter(id => id !== profile.id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {profile.profilePhoto ? (
                                <img
                                  src={profile.profilePhoto}
                                  alt={profile.fullName}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                                  {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {profile.fullName || `${profile.firstName} ${profile.lastName}`}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {profile.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (profile.role === 'lawyer' || profile.type === 'lawyer')
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {(profile.role === 'lawyer' || profile.type === 'lawyer') ? (
                              <>
                                <Scale className="w-3 h-3 mr-1" />
                                {t('admin.approvals.lawyer')}
                              </>
                            ) : (
                              <>
                                <Globe className="w-3 h-3 mr-1" />
                                {t('admin.approvals.expat')}
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {/* Statut de blocage */}
                            {profile.status === 'suspended' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <Lock className="w-3 h-3 mr-1" />
                                {t('admin.approvals.blocked')}
                              </span>
                            )}
                            {/* Visibilité */}
                            {!profile.isVisible && statusTab === 'approved' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <EyeOff className="w-3 h-3 mr-1" />
                                {t('admin.approvals.hidden')}
                              </span>
                            )}
                            {profile.isVisible && statusTab === 'approved' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Eye className="w-3 h-3 mr-1" />
                                {t('admin.approvals.visible')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Globe className="w-4 h-4 mr-2 text-gray-400" />
                            {profile.country || t('admin.approvals.notSpecified')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {statusTab === 'approved' 
                              ? formatDate(profile.approvedAt || profile.createdAt)
                              : formatDate(profile.createdAt)
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => toggleProfileExpansion(profile.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title={t('admin.approvals.viewDetails')}
                            >
                              {expandedProfiles.has(profile.id) ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                            
                            {statusTab === 'pending' && (
                              <>
                                <button
                                  onClick={() => approveProfile(profile.id)}
                                  disabled={processingId === profile.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                  title={t('action.approve')}
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedProfile(profile);
                                    setShowRejectModal(true);
                                  }}
                                  disabled={processingId === profile.id}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                  title={t('action.reject')}
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            
                            {statusTab === 'approved' && (
                              <>
                                <button
                                  onClick={() => toggleVisibility(profile.id, profile.isVisible || false)}
                                  disabled={processingId === profile.id}
                                  className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                  title={profile.isVisible ? t('admin.approvals.hide') : t('admin.approvals.makeVisible')}
                                >
                                  {profile.isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedProfile(profile);
                                    setActionType(profile.status === 'suspended' ? 'unblock' : 'block');
                                    setShowActionModal(true);
                                  }}
                                  disabled={processingId === profile.id}
                                  className={`${
                                    profile.status === 'suspended'
                                      ? 'text-green-600 hover:text-green-900'
                                      : 'text-red-600 hover:text-red-900'
                                  } disabled:opacity-50`}
                                  title={profile.status === 'suspended' ? t('action.unblock') : t('action.block')}
                                >
                                  {profile.status === 'suspended' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedProfiles.has(profile.id) && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {/* Informations personnelles */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 text-sm">{t('admin.approvals.personalInfo')}</h4>
                                {profile.phone && (
                                  <div className="text-sm text-gray-600 flex items-center">
                                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                    {profile.phoneCountryCode} {profile.phone}
                                  </div>
                                )}
                                {profile.yearsOfExperience && (
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">{t('admin.approvals.experience')}</span> {profile.yearsOfExperience} ans
                                  </div>
                                )}
                                {statusTab === 'rejected' && profile.rejectionReason && (
                                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                    <span className="font-medium">{t('admin.approvals.rejectionReason')}</span> {profile.rejectionReason}
                                  </div>
                                )}
                              </div>

                              {/* Spécialités */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 text-sm">
                                  {(profile.role === 'lawyer' || profile.type === 'lawyer') ? t('admin.approvals.legalSpecialties') : t('admin.approvals.helpTypes')}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {(profile.specialties || profile.helpTypes || []).map((specialty, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      {specialty}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Langues */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 text-sm">{t('admin.approvals.spokenLanguages')}</h4>
                                <div className="flex flex-wrap gap-2">
                                  {(profile.languages || profile.languagesSpoken || []).map((lang, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                                    >
                                      {lang}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Actions rapides dans le panneau étendu */}
                            {statusTab === 'pending' && (
                              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                                <button
                                  onClick={() => approveProfile(profile.id)}
                                  disabled={processingId === profile.id}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Check className="w-5 h-5" />
                                  {processingId === profile.id ? t('admin.approvals.processing') : t('action.approve')}
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
                                  {t('action.reject')}
                                </button>
                              </div>
                            )}

                            {statusTab === 'approved' && (
                              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                                <button
                                  onClick={() => toggleVisibility(profile.id, profile.isVisible || false)}
                                  disabled={processingId === profile.id}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                  {profile.isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  {profile.isVisible ? t('admin.approvals.hide') : t('admin.approvals.makeVisible')}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedProfile(profile);
                                    setActionType(profile.status === 'suspended' ? 'unblock' : 'block');
                                    setShowActionModal(true);
                                  }}
                                  disabled={processingId === profile.id}
                                  className={`flex-1 ${
                                    profile.status === 'suspended'
                                      ? 'bg-green-600 hover:bg-green-700'
                                      : 'bg-red-600 hover:bg-red-700'
                                  } text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
                                >
                                  {profile.status === 'suspended' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                  {profile.status === 'suspended' ? t('action.unblock') : t('action.block')}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de rejet */}
        <Modal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setRejectionReason('');
            setSelectedProfile(null);
          }}
          title={t('admin.approvals.modal.rejectTitle')}
          size="medium"
        >
          {selectedProfile && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{t('admin.approvals.modal.warning')}</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>
                        {t('admin.approvals.modal.aboutToReject')}
                        <br />
                        <strong>{selectedProfile.fullName || `${selectedProfile.firstName} ${selectedProfile.lastName}`}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.approvals.modal.rejectionReasonLabel')}
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t('admin.approvals.modal.rejectionReasonPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setSelectedProfile(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-lg font-medium transition-colors"
                >
                  {t('action.cancel')}
                </button>
                <button
                  onClick={rejectProfile}
                  disabled={processingId === selectedProfile.id}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {processingId === selectedProfile.id ? (
                    <>
                      <RefreshCw className="animate-spin w-4 h-4 mr-2" />
                      {t('admin.approvals.processing')}
                    </>
                  ) : (
                    t('admin.approvals.modal.confirmReject')
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal d'action (bloquer/débloquer) */}
        <Modal
          isOpen={showActionModal}
          onClose={() => {
            setShowActionModal(false);
            setSelectedProfile(null);
          }}
          title={actionType === 'block' ? t('admin.approvals.modal.blockTitle') : t('admin.approvals.modal.unblockTitle')}
          size="small"
        >
          {selectedProfile && (
            <div className="space-y-4">
              <div className={`${
                actionType === 'block' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
              } border rounded-lg p-4`}>
                <div className="flex">
                  <AlertTriangle className={`h-5 w-5 ${actionType === 'block' ? 'text-red-400' : 'text-green-400'}`} />
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${actionType === 'block' ? 'text-red-800' : 'text-green-800'}`}>
                      {t('admin.approvals.modal.confirmation')}
                    </h3>
                    <div className={`mt-2 text-sm ${actionType === 'block' ? 'text-red-700' : 'text-green-700'}`}>
                      <p>
                        {actionType === 'block' ? t('admin.approvals.modal.aboutToBlock') : t('admin.approvals.modal.aboutToUnblock')}
                        <br />
                        <strong>{selectedProfile.fullName || `${selectedProfile.firstName} ${selectedProfile.lastName}`}</strong>
                      </p>
                      {actionType === 'block' && (
                        <p className="mt-2 text-xs">
                          {t('admin.approvals.modal.blockWarning')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowActionModal(false);
                    setSelectedProfile(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-4 rounded-lg font-medium transition-colors"
                >
                  {t('action.cancel')}
                </button>
                <button
                  onClick={() => toggleBlockStatus(selectedProfile.id, selectedProfile.status)}
                  disabled={processingId === selectedProfile.id}
                  className={`flex-1 ${
                    actionType === 'block'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white py-2.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
                >
                  {processingId === selectedProfile.id ? (
                    <>
                      <RefreshCw className="animate-spin w-4 h-4 mr-2" />
                      {t('admin.approvals.processing')}
                    </>
                  ) : (
                    <>
                      {actionType === 'block' ? <Lock className="w-4 h-4 mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
                      {t('action.confirm')}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default AdminApprovals;