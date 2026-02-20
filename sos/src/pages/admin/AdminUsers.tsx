import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminTranslations } from '../../utils/adminTranslations';
import {
  User,
  Search,
  Scale,
  UserCheck,
  Shield,
  Calendar,
  Clock,
  Phone,
  Mail,
  Ban,
  UserCog,
  MapPin,
  AlertTriangle,
  Filter,
  Download,
  CheckSquare,
  Square,
  RefreshCw,
  Globe,
  Eye,
  EyeOff,
  Star,
  Wifi,
  WifiOff,
  Languages,
  MoreHorizontal,
  X,
  MessageCircle,
  Megaphone,
  FileText,
  Users as UsersIcon,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  getDoc,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { logError } from '../../utils/logging';
import { getCountryName, getCountryFlag } from '../../utils/formatters';

type Role = 'client' | 'lawyer' | 'expat' | 'admin' | 'chatter' | 'influencer' | 'blogger' | 'groupAdmin';
type Availability = 'available' | 'offline';

type FirestoreUser = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  profilePhoto?: string;
  photoURL?: string;
  phone?: string;
  phoneCountryCode?: string;
  country?: string;
  currentCountry?: string;
  role: Role;
  status?: string;
  isBanned?: boolean;
  banReason?: string;
  isTestProfile?: boolean;
  isApproved?: boolean;
  emailVerified?: boolean;
  isVerifiedEmail?: boolean;
  isOnline?: boolean;
  availability?: Availability;
  isVisibleOnMap?: boolean;
  isVisible?: boolean;
  featured?: boolean;
  languages?: string[];
  spokenLanguages?: string[];
  validationStatus?: string;
  kycStatus?: string;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  updatedAt?: Timestamp;
};

type AdminUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  profilePhoto?: string;
  photoURL?: string;
  phone?: string;
  phoneCountryCode?: string;
  country?: string;
  currentCountry?: string;
  role: Role;
  status?: string;
  isBanned: boolean;
  banReason?: string;
  isTestProfile?: boolean;
  isApproved?: boolean;
  emailVerified?: boolean;
  isVerifiedEmail?: boolean;
  isOnline?: boolean;
  availability?: Availability;
  isVisibleOnMap?: boolean;
  isVisible?: boolean;
  featured?: boolean;
  languages?: string[];
  spokenLanguages?: string[];
  validationStatus?: string;
  kycStatus?: string;
  createdAt: Date;
  lastLoginAt: Date;
  updatedAt: Date;
};

// Filtres avancés
type AdvancedFilters = {
  onlineStatus: 'all' | 'online' | 'offline';
  bannedStatus: 'all' | 'banned' | 'active';
  emailVerified: 'all' | 'verified' | 'unverified';
  approvalStatus: 'all' | 'approved' | 'pending' | 'rejected';
  visibilityStatus: 'all' | 'visible' | 'hidden';
  language: string;
};

type MinimalCurrentUser = {
  id: string;
  role: Role;
};

const USERS_PER_PAGE = 20;

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const adminT = useAdminTranslations();

  // `useAuth` n'expose pas de types ici : on contraint juste ce qu'on utilise
  const { user: rawCurrentUser } = useAuth() as { user?: MinimalCurrentUser | null };
  const currentUser: MinimalCurrentUser | null | undefined = rawCurrentUser;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRole, setSelectedRole] = useState<'all' | Role>(() => {
    const path = location.pathname;
    if (path.includes('/users/chatters')) return 'chatter';
    if (path.includes('/users/influencers')) return 'influencer';
    if (path.includes('/users/bloggers')) return 'blogger';
    if (path.includes('/users/group-admins')) return 'groupAdmin';
    return 'all';
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showBanModal, setShowBanModal] = useState<boolean>(false);
  const [banReason, setBanReason] = useState<string>('');
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [sortField, setSortField] = useState<'createdAt' | 'lastLoginAt' | 'fullName'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [countries, setCountries] = useState<string[]>([]);

  // Nouveaux états pour filtres avancés
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    onlineStatus: 'all',
    bannedStatus: 'all',
    emailVerified: 'all',
    approvalStatus: 'all',
    visibilityStatus: 'all',
    language: 'all',
  });
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);

  // États pour sélection multiple et bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState<boolean>(false);

  // État pour édition rapide dans le modal
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editedUser, setEditedUser] = useState<Partial<AdminUser>>({});

  // Sync selectedRole when navigating between /users/chatters, /users/influencers, etc.
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/users/chatters')) setSelectedRole('chatter');
    else if (path.includes('/users/influencers')) setSelectedRole('influencer');
    else if (path.includes('/users/bloggers')) setSelectedRole('blogger');
    else if (path.includes('/users/group-admins')) setSelectedRole('groupAdmin');
  }, [location.pathname]);

  // Roles that have profiles in sos_profiles collection
  const providerRoles: Role[] = ['lawyer', 'expat', 'chatter', 'influencer', 'blogger'];

  useEffect(() => {
    // Vérification d’accès admin
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);

        // Construction sûre des contraintes de requête (sans `any`)
        const queryConstraints: QueryConstraint[] = [];

        if (selectedRole !== 'all') {
          queryConstraints.push(where('role', '==', selectedRole));
        }

        if (selectedCountry !== 'all') {
          queryConstraints.push(where('country', '==', selectedCountry));
        }

        // Tri et pagination
        queryConstraints.push(orderBy(sortField, sortDirection));
        queryConstraints.push(limit(page * USERS_PER_PAGE));

        const usersQuery = query(collection(db, 'users'), ...queryConstraints);
        const usersSnapshot = await getDocs(usersQuery);

        const usersData: AdminUser[] = usersSnapshot.docs.map((d) => {
          const data = d.data() as FirestoreUser;
          return {
            id: d.id,
            ...data,
            isBanned: Boolean(data.isBanned),
            languages: data.languages || data.spokenLanguages || [],
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(0),
            lastLoginAt: data.lastLoginAt ? data.lastLoginAt.toDate() : new Date(0),
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(0),
          };
        });

        const uniqueCountries = Array.from(
          new Set(
            usersData.map((u) => u.country ?? u.currentCountry ?? 'Non spécifié')
          )
        )
          .filter((c): c is string => Boolean(c))
          .sort((a, b) => a.localeCompare(b));

        // Collecter toutes les langues uniques
        const allLanguages = new Set<string>();
        usersData.forEach((u) => {
          (u.languages || []).forEach((lang) => allLanguages.add(lang));
        });
        setAvailableLanguages(Array.from(allLanguages).sort());

        setUsers(usersData);
        setCountries(uniqueCountries);
        setHasMore(usersSnapshot.docs.length === page * USERS_PER_PAGE);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
         
        console.error('Erreur lors du chargement des utilisateurs :', err);
        logError({
          origin: 'frontend',
          error: `Error loading users: ${message}`,
          context: { component: 'AdminUsers' },
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchUsers();
  }, [currentUser, navigate, selectedRole, selectedCountry, sortField, sortDirection, page]);

  const handleEditUser = (userId: string) => {
    navigate(`/admin/users/${userId}/edit`);
  };

  const handleViewDashboard = (user: AdminUser) => {
    // Navigate to the appropriate dashboard based on role
    // Routes must match App.tsx path definitions (FR default paths)
    switch (user.role) {
      case 'lawyer':
      case 'expat':
      case 'client':
        navigate(`/dashboard?userId=${user.id}`);
        break;
      case 'chatter':
        navigate(`/chatter/tableau-de-bord?userId=${user.id}`);
        break;
      case 'influencer':
        navigate(`/influencer/tableau-de-bord?userId=${user.id}`);
        break;
      case 'blogger':
        navigate(`/blogger/tableau-de-bord?userId=${user.id}`);
        break;
      case 'groupAdmin':
        navigate(`/group-admin/tableau-de-bord?userId=${user.id}`);
        break;
      default:
        navigate(`/admin/users/${user.id}/edit`);
    }
  };

  const getRoleLabel = (role: Role): string => {
    const roleLabels: Record<Role, string> = {
      client: 'Client',
      lawyer: 'Avocat',
      expat: 'Expatrié',
      admin: 'Admin',
      chatter: 'Chatter',
      influencer: 'Influenceur',
      blogger: 'Blogueur',
      groupAdmin: 'Groupe Admin',
    };
    return roleLabels[role] || role;
  };

  const getRoleBadgeColor = (role: Role): string => {
    const colors: Record<Role, string> = {
      client: 'bg-blue-100 text-blue-800',
      lawyer: 'bg-purple-100 text-purple-800',
      expat: 'bg-green-100 text-green-800',
      admin: 'bg-yellow-100 text-yellow-800',
      chatter: 'bg-pink-100 text-pink-800',
      influencer: 'bg-orange-100 text-orange-800',
      blogger: 'bg-teal-100 text-teal-800',
      groupAdmin: 'bg-indigo-100 text-indigo-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const handleDeleteUser = (user: AdminUser) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleBanUser = (user: AdminUser) => {
    setSelectedUser(user);
    setBanReason('');
    setShowBanModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    setIsActionLoading(true);

    try {
      if (providerRoles.includes(selectedUser.role)) {
        await deleteDoc(doc(db, 'sos_profiles', selectedUser.id));
      }

      await deleteDoc(doc(db, 'users', selectedUser.id));

      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));

      setShowDeleteModal(false);
      setSelectedUser(null);

      await addDoc(collection(db, 'logs'), {
        type: 'user_deleted',
        userId: selectedUser.id,
        deletedBy: currentUser?.id ?? null,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
       
      toast.error("Erreur lors de la suppression de l'utilisateur");
      logError({
        origin: 'frontend',
        error: `Error deleting user: ${message}`,
        context: { userId: selectedUser.id },
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const confirmBanUser = async () => {
    if (!selectedUser) return;

    setIsActionLoading(true);

    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        isBanned: true,
        banReason,
        updatedAt: serverTimestamp(),
      });

      if (providerRoles.includes(selectedUser.role)) {
        await updateDoc(doc(db, 'sos_profiles', selectedUser.id), {
          isBanned: true,
          isVisible: false,
          isVisibleOnMap: false,
          isOnline: false,
          updatedAt: serverTimestamp(),
        });
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, isBanned: true, banReason } : u
        )
      );

      setShowBanModal(false);
      setSelectedUser(null);

      await addDoc(collection(db, 'logs'), {
        type: 'user_banned',
        userId: selectedUser.id,
        bannedBy: currentUser?.id ?? null,
        reason: banReason,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
       
      toast.error("Erreur lors du bannissement de l'utilisateur");
      logError({
        origin: 'frontend',
        error: `Error banning user: ${message}`,
        context: { userId: selectedUser.id },
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setIsActionLoading(true);

    try {
      await updateDoc(doc(db, 'users', userId), {
        isBanned: false,
        banReason: '',
        updatedAt: serverTimestamp(),
      });

      const userDoc = await getDoc(doc(db, 'users', userId));
      const role = (userDoc.data()?.role ?? '') as Role;
      if (providerRoles.includes(role)) {
        await updateDoc(doc(db, 'sos_profiles', userId), {
          isBanned: false,
          isVisible: true,
          isVisibleOnMap: true,
          updatedAt: serverTimestamp(),
        });
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isBanned: false, banReason: '' } : u
        )
      );

      await addDoc(collection(db, 'logs'), {
        type: 'user_unbanned',
        userId,
        unbannedBy: currentUser?.id ?? null,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
       
      toast.error("Erreur lors de la réactivation de l'utilisateur");
      logError({
        origin: 'frontend',
        error: `Error unbanning user: ${message}`,
        context: { userId },
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleOnlineStatus = async (userId: string, isCurrentlyOnline: boolean) => {
    setIsActionLoading(true);

    try {
      const newAvailability: Availability = !isCurrentlyOnline ? 'available' : 'offline';

      await updateDoc(doc(db, 'users', userId), {
        isOnline: !isCurrentlyOnline,
        availability: newAvailability,
        updatedAt: serverTimestamp(),
      });

      const userDoc = await getDoc(doc(db, 'users', userId));
      const role = (userDoc.data()?.role ?? '') as Role;
      if (providerRoles.includes(role)) {
        await updateDoc(doc(db, 'sos_profiles', userId), {
          isOnline: !isCurrentlyOnline,
          availability: newAvailability,
          updatedAt: serverTimestamp(),
        });
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, isOnline: !isCurrentlyOnline, availability: newAvailability }
            : u
        )
      );

      await addDoc(collection(db, 'logs'), {
        type: !isCurrentlyOnline ? 'user_set_online' : 'user_set_offline',
        userId,
        changedBy: currentUser?.id ?? null,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
       
      toast.error('Erreur lors de la modification du statut en ligne');
      logError({
        origin: 'frontend',
        error: `Error toggling online status: ${message}`,
        context: { userId },
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleVisibility = async (userId: string, isCurrentlyVisible: boolean) => {
    setIsActionLoading(true);

    try {
      await updateDoc(doc(db, 'sos_profiles', userId), {
        isVisible: !isCurrentlyVisible,
        isVisibleOnMap: !isCurrentlyVisible,
        updatedAt: serverTimestamp(),
      });

      setUsers((prev) =>
        prev.map((u) =>
            u.id === userId
              ? { ...u, isVisible: !isCurrentlyVisible, isVisibleOnMap: !isCurrentlyVisible }
              : u
        )
      );

      await addDoc(collection(db, 'logs'), {
        type: !isCurrentlyVisible ? 'user_set_visible' : 'user_set_invisible',
        userId,
        changedBy: currentUser?.id ?? null,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
       
      toast.error('Erreur lors de la modification de la visibilité');
      logError({
        origin: 'frontend',
        error: `Error toggling visibility: ${message}`,
        context: { userId },
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleFeatured = async (userId: string, isCurrentlyFeatured: boolean) => {
    setIsActionLoading(true);

    try {
      await updateDoc(doc(db, 'sos_profiles', userId), {
        featured: !isCurrentlyFeatured,
        updatedAt: serverTimestamp(),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, featured: !isCurrentlyFeatured } : u))
      );

      await addDoc(collection(db, 'logs'), {
        type: !isCurrentlyFeatured ? 'user_set_featured' : 'user_unset_featured',
        userId,
        changedBy: currentUser?.id ?? null,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
       
      toast.error('Erreur lors de la modification du statut mis en avant');
      logError({
        origin: 'frontend',
        error: `Error toggling featured status: ${message}`,
        context: { userId },
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLoadMore = () => setPage((prev) => prev + 1);

  const handleSortChange = (field: 'createdAt' | 'lastLoginAt' | 'fullName') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      // Filtre par rôle
      const matchesRole = selectedRole === 'all' || u.role === selectedRole;

      // Filtre par recherche
      const matchesSearch =
        term.length === 0 ||
        u.firstName?.toLowerCase().includes(term) ||
        u.lastName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.id.toLowerCase().includes(term);

      // Filtres avancés
      const matchesOnlineStatus =
        advancedFilters.onlineStatus === 'all' ||
        (advancedFilters.onlineStatus === 'online' && u.isOnline) ||
        (advancedFilters.onlineStatus === 'offline' && !u.isOnline);

      const matchesBannedStatus =
        advancedFilters.bannedStatus === 'all' ||
        (advancedFilters.bannedStatus === 'banned' && u.isBanned) ||
        (advancedFilters.bannedStatus === 'active' && !u.isBanned);

      const matchesEmailVerified =
        advancedFilters.emailVerified === 'all' ||
        (advancedFilters.emailVerified === 'verified' && (u.emailVerified || u.isVerifiedEmail)) ||
        (advancedFilters.emailVerified === 'unverified' && !(u.emailVerified || u.isVerifiedEmail));

      const matchesApprovalStatus =
        advancedFilters.approvalStatus === 'all' ||
        (advancedFilters.approvalStatus === 'approved' && u.isApproved) ||
        (advancedFilters.approvalStatus === 'pending' && !u.isApproved && !u.validationStatus) ||
        (advancedFilters.approvalStatus === 'rejected' && u.validationStatus === 'rejected');

      const matchesVisibility =
        advancedFilters.visibilityStatus === 'all' ||
        (advancedFilters.visibilityStatus === 'visible' && u.isVisible) ||
        (advancedFilters.visibilityStatus === 'hidden' && !u.isVisible);

      const matchesLanguage =
        advancedFilters.language === 'all' ||
        (u.languages || []).includes(advancedFilters.language);

      return (
        matchesRole &&
        matchesSearch &&
        matchesOnlineStatus &&
        matchesBannedStatus &&
        matchesEmailVerified &&
        matchesApprovalStatus &&
        matchesVisibility &&
        matchesLanguage
      );
    });
  }, [users, selectedRole, searchTerm, advancedFilters]);

  const userCounts = useMemo(
    () => ({
      all: users.length,
      client: users.filter((u) => u.role === 'client').length,
      lawyer: users.filter((u) => u.role === 'lawyer').length,
      expat: users.filter((u) => u.role === 'expat').length,
      admin: users.filter((u) => u.role === 'admin').length,
      chatter: users.filter((u) => u.role === 'chatter').length,
      influencer: users.filter((u) => u.role === 'influencer').length,
      blogger: users.filter((u) => u.role === 'blogger').length,
      groupAdmin: users.filter((u) => u.role === 'groupAdmin').length,
    }),
    [users]
  );

  if (loading && users.length === 0) return <div>{adminT.loading}</div>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-6 h-6 text-red-600" /> Gestion des utilisateurs
            </h1>
            <p className="text-sm text-gray-500">Vue globale de tous les utilisateurs de la plateforme</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Tous les pays</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {getCountryFlag(country)} {getCountryName(country, 'fr') || country}
                </option>
              ))}
            </select>

            <select
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-') as [
                  'createdAt' | 'lastLoginAt' | 'fullName',
                  'asc' | 'desc'
                ];
                setSortField(field);
                setSortDirection(direction);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="createdAt-desc">Récent</option>
              <option value="createdAt-asc">Ancien</option>
              <option value="lastLoginAt-desc">Connexion récente</option>
              <option value="fullName-asc">Nom A-Z</option>
            </select>

            <Button
              variant="secondary"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={showAdvancedFilters ? 'bg-red-100' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtres
              {Object.values(advancedFilters).some((v) => v !== 'all') && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {Object.values(advancedFilters).filter((v) => v !== 'all').length}
                </span>
              )}
            </Button>

            <button
              onClick={() => {
                const csvContent = [
                  ['ID', 'Prénom', 'Nom', 'Email', 'Rôle', 'Pays', 'En ligne', 'Banni', 'Inscription'].join(','),
                  ...filteredUsers.map((u) =>
                    [
                      u.id,
                      u.firstName || '',
                      u.lastName || '',
                      u.email || '',
                      u.role,
                      u.country || u.currentCountry || '',
                      u.isOnline ? 'Oui' : 'Non',
                      u.isBanned ? 'Oui' : 'Non',
                      formatDate(u.createdAt),
                    ].join(',')
                  ),
                ].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
              }}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center space-x-2 text-sm"
            >
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Cards synthèse - Ligne 1: Principaux */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-xs font-medium text-gray-500">Total</h3>
                <p className="text-xl font-bold text-gray-900">{userCounts.all}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-xs font-medium text-gray-500">Clients</h3>
                <p className="text-xl font-bold text-gray-900">{userCounts.client}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Scale className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-xs font-medium text-gray-500">Avocats</h3>
                <p className="text-xl font-bold text-gray-900">{userCounts.lawyer}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-xs font-medium text-gray-500">Expatriés</h3>
                <p className="text-xl font-bold text-gray-900">{userCounts.expat}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Shield className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-xs font-medium text-gray-500">Admins</h3>
                <p className="text-xl font-bold text-gray-900">{userCounts.admin}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cards synthèse - Ligne 2: Nouveaux rôles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-pink-100 rounded-lg">
                <MessageCircle className="w-5 h-5 text-pink-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-xs font-medium text-gray-500">Chatters</h3>
                <p className="text-xl font-bold text-gray-900">{userCounts.chatter}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Megaphone className="w-5 h-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-xs font-medium text-gray-500">Influenceurs</h3>
                <p className="text-xl font-bold text-gray-900">{userCounts.influencer}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-teal-100 rounded-lg">
                <FileText className="w-5 h-5 text-teal-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-xs font-medium text-gray-500">Blogueurs</h3>
                <p className="text-xl font-bold text-gray-900">{userCounts.blogger}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-xs font-medium text-gray-500">Groupe Admin</h3>
                <p className="text-xl font-bold text-gray-900">{userCounts.groupAdmin}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche et filtres rapides */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par nom, email, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedRole('all')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedRole === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setSelectedRole('client')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedRole === 'client' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Clients
              </button>
              <button
                onClick={() => setSelectedRole('lawyer')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedRole === 'lawyer' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Avocats
              </button>
              <button
                onClick={() => setSelectedRole('expat')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedRole === 'expat' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Expatriés
              </button>
              <button
                onClick={() => setSelectedRole('admin')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedRole === 'admin' ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Admins
              </button>
              <button
                onClick={() => setSelectedRole('chatter')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedRole === 'chatter' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Chatters
              </button>
              <button
                onClick={() => setSelectedRole('influencer')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedRole === 'influencer' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Influenceurs
              </button>
              <button
                onClick={() => setSelectedRole('blogger')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedRole === 'blogger' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Blogueurs
              </button>
              <button
                onClick={() => setSelectedRole('groupAdmin')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedRole === 'groupAdmin' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Groupe Admin
              </button>
            </div>
          </div>
        </div>

        {/* Panneau filtres avancés */}
        {showAdvancedFilters && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                <Filter size={18} />
                Filtres avancés
              </h3>
              <button
                onClick={() => {
                  setAdvancedFilters({
                    onlineStatus: 'all',
                    bannedStatus: 'all',
                    emailVerified: 'all',
                    approvalStatus: 'all',
                    visibilityStatus: 'all',
                    language: 'all',
                  });
                }}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <RefreshCw size={14} />
                Réinitialiser
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Statut en ligne */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Wifi size={14} />
                  Statut en ligne
                </label>
                <select
                  value={advancedFilters.onlineStatus}
                  onChange={(e) =>
                    setAdvancedFilters((prev) => ({
                      ...prev,
                      onlineStatus: e.target.value as AdvancedFilters['onlineStatus'],
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous</option>
                  <option value="online">En ligne</option>
                  <option value="offline">Hors ligne</option>
                </select>
              </div>

              {/* Statut banni */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Ban size={14} />
                  Statut compte
                </label>
                <select
                  value={advancedFilters.bannedStatus}
                  onChange={(e) =>
                    setAdvancedFilters((prev) => ({
                      ...prev,
                      bannedStatus: e.target.value as AdvancedFilters['bannedStatus'],
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous</option>
                  <option value="active">Actif</option>
                  <option value="banned">Banni</option>
                </select>
              </div>

              {/* Email vérifié */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Mail size={14} />
                  Email vérifié
                </label>
                <select
                  value={advancedFilters.emailVerified}
                  onChange={(e) =>
                    setAdvancedFilters((prev) => ({
                      ...prev,
                      emailVerified: e.target.value as AdvancedFilters['emailVerified'],
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous</option>
                  <option value="verified">Vérifié</option>
                  <option value="unverified">Non vérifié</option>
                </select>
              </div>

              {/* Statut approbation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <UserCheck size={14} />
                  Approbation
                </label>
                <select
                  value={advancedFilters.approvalStatus}
                  onChange={(e) =>
                    setAdvancedFilters((prev) => ({
                      ...prev,
                      approvalStatus: e.target.value as AdvancedFilters['approvalStatus'],
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous</option>
                  <option value="approved">Approuvé</option>
                  <option value="pending">En attente</option>
                  <option value="rejected">Rejeté</option>
                </select>
              </div>

              {/* Visibilité (prestataires) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Eye size={14} />
                  Visibilité
                </label>
                <select
                  value={advancedFilters.visibilityStatus}
                  onChange={(e) =>
                    setAdvancedFilters((prev) => ({
                      ...prev,
                      visibilityStatus: e.target.value as AdvancedFilters['visibilityStatus'],
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous</option>
                  <option value="visible">Visible</option>
                  <option value="hidden">Masqué</option>
                </select>
              </div>

              {/* Langue parlée */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Languages size={14} />
                  Langue
                </label>
                <select
                  value={advancedFilters.language}
                  onChange={(e) =>
                    setAdvancedFilters((prev) => ({
                      ...prev,
                      language: e.target.value,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Toutes</option>
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Résumé des filtres actifs */}
            {Object.values(advancedFilters).some((v) => v !== 'all') && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600">Filtres actifs :</span>
                  {advancedFilters.onlineStatus !== 'all' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1">
                      {advancedFilters.onlineStatus === 'online' ? 'En ligne' : 'Hors ligne'}
                      <X
                        size={12}
                        className="cursor-pointer"
                        onClick={() => setAdvancedFilters((prev) => ({ ...prev, onlineStatus: 'all' }))}
                      />
                    </span>
                  )}
                  {advancedFilters.bannedStatus !== 'all' && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs flex items-center gap-1">
                      {advancedFilters.bannedStatus === 'banned' ? 'Banni' : 'Actif'}
                      <X
                        size={12}
                        className="cursor-pointer"
                        onClick={() => setAdvancedFilters((prev) => ({ ...prev, bannedStatus: 'all' }))}
                      />
                    </span>
                  )}
                  {advancedFilters.emailVerified !== 'all' && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center gap-1">
                      Email {advancedFilters.emailVerified === 'verified' ? 'vérifié' : 'non vérifié'}
                      <X
                        size={12}
                        className="cursor-pointer"
                        onClick={() => setAdvancedFilters((prev) => ({ ...prev, emailVerified: 'all' }))}
                      />
                    </span>
                  )}
                  {advancedFilters.approvalStatus !== 'all' && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center gap-1">
                      {advancedFilters.approvalStatus === 'approved'
                        ? 'Approuvé'
                        : advancedFilters.approvalStatus === 'pending'
                        ? 'En attente'
                        : 'Rejeté'}
                      <X
                        size={12}
                        className="cursor-pointer"
                        onClick={() => setAdvancedFilters((prev) => ({ ...prev, approvalStatus: 'all' }))}
                      />
                    </span>
                  )}
                  {advancedFilters.visibilityStatus !== 'all' && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center gap-1">
                      {advancedFilters.visibilityStatus === 'visible' ? 'Visible' : 'Masqué'}
                      <X
                        size={12}
                        className="cursor-pointer"
                        onClick={() => setAdvancedFilters((prev) => ({ ...prev, visibilityStatus: 'all' }))}
                      />
                    </span>
                  )}
                  {advancedFilters.language !== 'all' && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs flex items-center gap-1">
                      {advancedFilters.language}
                      <X
                        size={12}
                        className="cursor-pointer"
                        onClick={() => setAdvancedFilters((prev) => ({ ...prev, language: 'all' }))}
                      />
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compteur de résultats */}
        <div className="mb-4 text-sm text-gray-600">
          {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
          {Object.values(advancedFilters).some((v) => v !== 'all') && ' (filtré)'}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pays
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inscription
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                      </div>
                      <p className="mt-2 text-gray-500">{adminT.loading}</p>
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 rounded-full bg-gray-100 overflow-hidden border">
                            <img
                              src={u.photoURL || u.profilePhoto || '/default-avatar.png'}
                              alt={`Photo de ${u.firstName || 'utilisateur'}`}
                              className="h-12 w-12 object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = '/default-avatar.png';
                              }}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {u.firstName} {u.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{u.status ?? (u.isBanned ? 'Banni' : u.isOnline ? 'En ligne' : 'Hors ligne')}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{u.country ?? u.currentCountry ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="small"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(u);
                              setShowUserModal(true);
                            }}
                          >
                            Voir
                          </Button>
                          {/* Bouton Dashboard - Accès au dashboard du profil */}
                          {u.role !== 'admin' && u.role !== 'groupAdmin' && (
                            <Button
                              size="small"
                              variant="outline"
                              className="border-cyan-500 text-cyan-700 hover:bg-cyan-50"
                              onClick={() => handleViewDashboard(u)}
                            >
                              <ExternalLink size={14} className="mr-1" />
                              Dashboard
                            </Button>
                          )}
                          <Button
                            size="small"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleEditUser(u.id)}
                          >
                            Modifier
                          </Button>
                          {u.isBanned ? (
                            <Button size="small" onClick={() => void handleUnbanUser(u.id)}>
                              Réactiver
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              className="bg-orange-600 hover:bg-orange-700"
                              onClick={() => handleBanUser(u)}
                            >
                              Bannir
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outline"
                            className="border-red-600 text-red-700"
                            onClick={() => handleDeleteUser(u)}
                          >
                            Supprimer
                          </Button>
                          {/* Exemples d'actions directes */}
                          <Button
                            size="small"
                            variant="outline"
                            onClick={() => void handleToggleOnlineStatus(u.id, Boolean(u.isOnline))}
                          >
                            {u.isOnline ? 'Mettre hors ligne' : 'Mettre en ligne'}
                          </Button>
                          {(u.role === 'lawyer' || u.role === 'expat' || u.role === 'chatter' || u.role === 'influencer' || u.role === 'blogger') && (
                            <>
                              <Button
                                size="small"
                                variant="outline"
                                onClick={() => void handleToggleVisibility(u.id, Boolean(u.isVisibleOnMap))}
                              >
                                {u.isVisibleOnMap ? 'Masquer carte' : 'Montrer carte'}
                              </Button>
                              <Button
                                size="small"
                                variant="outline"
                                onClick={() => void handleToggleFeatured(u.id, Boolean(u.featured))}
                              >
                                {u.featured ? 'Retirer "à la une"' : 'Mettre "à la une"'}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Button onClick={handleLoadMore} disabled={loading} fullWidth>
                {loading ? adminT.loading : adminT.loadMore}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de détails utilisateur */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Détails de l'utilisateur"
        size="large"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium overflow-hidden">
                {selectedUser.profilePhoto || selectedUser.photoURL ? (
                  <img
                    src={selectedUser.profilePhoto || selectedUser.photoURL || ''}
                    alt={selectedUser.firstName || 'utilisateur'}
                    className="h-16 w-16 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = '/default-avatar.png';
                    }}
                  />
                ) : (
                  selectedUser.firstName?.[0] || selectedUser.email?.[0] || 'U'
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(selectedUser.role)}`}>
                    {getRoleLabel(selectedUser.role)}
                  </span>
                  {selectedUser.isBanned && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      Banni
                    </span>
                  )}
                  {selectedUser.isTestProfile && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      Profil de test
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Informations personnelles</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900">{selectedUser.email}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900">
                      {selectedUser.phoneCountryCode} {selectedUser.phone || 'Non renseigné'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900">
                      {selectedUser.country || selectedUser.currentCountry || 'Non renseigné'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900">Inscrit le {formatDate(selectedUser.createdAt)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900">
                      Dernière connexion le {formatDate(selectedUser.lastLoginAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Paramètres du compte</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Email vérifié</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedUser.emailVerified || selectedUser.isVerifiedEmail
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedUser.emailVerified || selectedUser.isVerifiedEmail ? 'Oui' : 'Non'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Compte approuvé</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedUser.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {selectedUser.isApproved ? 'Oui' : 'En attente'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Statut en ligne</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedUser.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedUser.isOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>

                  {(selectedUser.role === 'lawyer' || selectedUser.role === 'expat' || selectedUser.role === 'chatter' || selectedUser.role === 'influencer' || selectedUser.role === 'blogger') && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Visible sur la carte</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedUser.isVisibleOnMap ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {selectedUser.isVisibleOnMap ? 'Oui' : 'Non'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Mis en avant</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedUser.featured ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {selectedUser.featured ? 'Oui' : 'Non'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {selectedUser.isBanned && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Raison du bannissement</h4>
                <p className="text-red-700">{selectedUser.banReason || 'Aucune raison spécifiée'}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button onClick={() => setShowUserModal(false)} variant="outline">
                Fermer
              </Button>

              {selectedUser.role !== 'admin' && selectedUser.role !== 'groupAdmin' && (
                <Button
                  onClick={() => {
                    setShowUserModal(false);
                    handleViewDashboard(selectedUser);
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <ExternalLink size={16} className="mr-2" />
                  Dashboard
                </Button>
              )}

              <Button
                onClick={() => {
                  setShowUserModal(false);
                  handleEditUser(selectedUser.id);
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <UserCog size={16} className="mr-2" />
                Modifier
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmer la suppression"
        size="small"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Attention : Cette action est irréversible</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Vous êtes sur le point de supprimer définitivement l'utilisateur :
                      <br />
                      <strong>
                        {selectedUser.firstName} {selectedUser.lastName}
                      </strong>
                    </p>
                    <p className="mt-1">Toutes les données associées seront également supprimées.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button onClick={() => setShowDeleteModal(false)} variant="outline" disabled={isActionLoading}>
                Annuler
              </Button>
              <Button onClick={confirmDeleteUser} className="bg-red-600 hover:bg-red-700" loading={isActionLoading}>
                Confirmer la suppression
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de bannissement */}
      <Modal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        title="Bannir l'utilisateur"
        size="small"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
              <div className="flex">
                <Ban className="h-5 w-5 text-orange-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800">Bannissement d'utilisateur</h3>
                  <div className="mt-2 text-sm text-orange-700">
                    <p>
                      Vous êtes sur le point de bannir l'utilisateur :
                      <br />
                      <strong>
                        {selectedUser.firstName} {selectedUser.lastName}
                      </strong>
                    </p>
                    <p className="mt-1">L'utilisateur ne pourra plus se connecter ni utiliser la plateforme.</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="banReason" className="block text-sm font-medium text-gray-700 mb-1">
                Raison du bannissement
              </label>
              <textarea
                id="banReason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Expliquez la raison du bannissement..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button onClick={() => setShowBanModal(false)} variant="outline" disabled={isActionLoading}>
                Annuler
              </Button>
              <Button onClick={confirmBanUser} className="bg-orange-600 hover:bg-orange-700" loading={isActionLoading}>
                Bannir l'utilisateur
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
};

export default AdminUsers;
