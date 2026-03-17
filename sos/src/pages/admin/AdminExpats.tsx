// src/pages/admin/AdminExpats.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  collection,
  query as fsQuery,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  serverTimestamp,
} from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  Search,
  Filter,
  Download,
  Trash2,
  AlertTriangle,
  Globe,
  MapPin,
  Eye,
  EyeOff,
  MoreHorizontal,
  X,
  Star,
  Shield,
  Ban,
  UserPlus,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Clock,
  Calendar,
  Mail,
  Phone,
  Languages,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react';
import { useAdminTranslations } from '../../utils/adminTranslations';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminErrorState from '../../components/admin/AdminErrorState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import AdminMapVisibilityToggle from '../../components/admin/AdminMapVisibilityToggle';
import { getCountryName, getCountryFlag, getLanguageName } from '../../utils/formatters';
import TranslationModal from '../../components/admin/TranslationModal';
import { logError } from '../../utils/logging';

// ============================================================================
// TYPES
// ============================================================================

type ExpatStatus = 'active' | 'suspended' | 'pending' | 'banned';
type ValidationStatus = 'pending' | 'approved' | 'rejected';

interface Expat {
  id: string;
  email: string;
  emailVerified?: boolean;
  firstName: string;
  lastName: string;
  phone?: string;
  country: string;
  city?: string;
  originCountry?: string;
  status: ExpatStatus;
  validationStatus: ValidationStatus;
  createdAt: Date;
  lastLoginAt: Date;
  callsCount: number;
  totalEarned: number;
  rating: number;
  reviewsCount: number;
  specialities: string[];
  languages: string[];
  expatSince?: Date;
  yearsInCountry: number;
  isVisible: boolean;
  isVisibleOnMap: boolean;
  isOnline: boolean;
  isFeatured: boolean;
  profileComplete: number;
  helpDomains: string[];
  description?: string;
  hourlyRate?: number;
  profilePhoto?: string;
  photoURL?: string;
  isBanned: boolean;
  banReason?: string;
}

type FirestoreExpatDoc = {
  serviceType?: string;
  email?: string;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  currentCountry?: string;
  city?: string;
  originCountry?: string;
  countryOfOrigin?: string;
  nationalite?: string;
  status?: ExpatStatus;
  validationStatus?: ValidationStatus;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  callsCount?: number;
  completedCalls?: number;
  totalEarned?: number;
  earnings?: number;
  averageRating?: number;
  rating?: number;
  reviewsCount?: number;
  totalReviews?: number;
  specialities?: string[];
  expertise?: string[];
  languages?: string[];
  spokenLanguages?: string[];
  expatSince?: Timestamp;
  movedToCountryAt?: Timestamp;
  yearsInCountry?: number;
  isVisibleOnMap?: boolean;
  isOnline?: boolean;
  isVisible?: boolean;
  isFeatured?: boolean;
  isBanned?: boolean;
  banReason?: string;
  helpDomains?: string[];
  expertiseDomains?: string[];
  servicesOffered?: string[];
  description?: string;
  bio?: string | object;
  hourlyRate?: number;
  pricePerHour?: number;
  profilePhoto?: string;
  photoURL?: string;
};

type AdvancedFilters = {
  status: 'all' | ExpatStatus;
  validationStatus: 'all' | ValidationStatus;
  country: string;
  originCountry: string;
  helpDomain: string;
  language: string;
  minRating: 'all' | string;
  dateRange: 'all' | 'today' | 'week' | 'month';
};

// ============================================================================
// CONSTANTS
// ============================================================================

const EXPATS_PER_PAGE = 20;

// ============================================================================
// HELPERS
// ============================================================================

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 0 || date.getTime() === 0) return '\u2014';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "\u00C0 l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)}an${Math.floor(months / 12) > 1 ? 's' : ''}`;
}

function formatDateFull(date: Date): string {
  if (date.getTime() === 0) return '\u2014';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function formatDateShort(date: Date): string {
  if (date.getTime() === 0) return '\u2014';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(date);
}

const fmtMoney = (n: number) => `${(n / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\u20AC`;

// ============================================================================
// COMPONENT
// ============================================================================

const AdminExpats: React.FC = () => {
  const adminT = useAdminTranslations();

  // --- State ---
  const [expats, setExpats] = useState<Expat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortField, setSortField] = useState<'createdAt' | 'lastLoginAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [countries, setCountries] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    status: 'all', validationStatus: 'all', country: 'all', originCountry: 'all',
    helpDomain: '', language: '', minRating: 'all', dateRange: 'all',
  });
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [originCountries, setOriginCountries] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Selected expat for modals
  const [selectedExpat, setSelectedExpat] = useState<Expat | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0 });

  // Featured badge loading
  const [featuredLoading, setFeaturedLoading] = useState<string | null>(null);

  // Translation modal
  const [translationModalOpen, setTranslationModalOpen] = useState(false);
  const [translationProviderId, setTranslationProviderId] = useState<string | null>(null);

  // --- Close action menu on outside click ---
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // --- Helpers ---
  const calculateYearsInCountry = (expatSince: Date): number => {
    const now = new Date();
    const diffYears = (now.getTime() - expatSince.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, Math.floor(diffYears));
  };

  const calculateProfileCompleteness = (data: FirestoreExpatDoc): number => {
    const fields: (keyof FirestoreExpatDoc)[] = [
      'firstName', 'lastName', 'email', 'phone', 'country', 'city',
      'originCountry', 'helpDomains', 'languages', 'description',
    ];
    const completed = fields.filter((f) => {
      const v = (data as any)[f];
      if (Array.isArray(v)) return v.length > 0;
      return v !== undefined && String(v || '').trim() !== '';
    }).length;
    return Math.round((completed / fields.length) * 100);
  };

  const mapDoc = (d: QueryDocumentSnapshot<DocumentData>): Expat => {
    const data = d.data() as FirestoreExpatDoc;
    const expatSince = data.expatSince?.toDate() || data.movedToCountryAt?.toDate();
    const yearsInCountry = expatSince ? calculateYearsInCountry(expatSince) : data.yearsInCountry || 0;

    return {
      id: d.id,
      email: data.email || '',
      emailVerified: !!data.emailVerified,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      phone: data.phone || '',
      country: data.country || data.currentCountry || '',
      city: data.city || '',
      originCountry: data.originCountry || data.countryOfOrigin || data.nationalite || '',
      status: (data.status || 'pending') as ExpatStatus,
      validationStatus: (data.validationStatus || 'pending') as ValidationStatus,
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(0),
      lastLoginAt: data.lastLoginAt ? data.lastLoginAt.toDate() : new Date(0),
      callsCount: data.callsCount || data.completedCalls || 0,
      totalEarned: data.totalEarned || data.earnings || 0,
      rating: data.averageRating || data.rating || 0,
      reviewsCount: data.reviewsCount || data.totalReviews || 0,
      specialities: data.specialities || data.expertise || [],
      languages: data.languages || data.spokenLanguages || [],
      expatSince,
      yearsInCountry,
      isVisible: data.isVisible ?? false,
      isVisibleOnMap: data.isVisibleOnMap ?? true,
      isOnline: data.isOnline ?? false,
      isFeatured: data.isFeatured ?? false,
      isBanned: !!data.isBanned,
      banReason: data.banReason || '',
      profileComplete: calculateProfileCompleteness(data),
      helpDomains: data.helpDomains || data.expertiseDomains || data.servicesOffered || [],
      description: (typeof data.bio === 'string' ? data.bio : data.description) || '',
      hourlyRate: data.hourlyRate || data.pricePerHour,
      profilePhoto: data.profilePhoto,
      photoURL: data.photoURL,
    };
  };

  // --- Fetch expats ---
  useEffect(() => {
    const fetchExpats = async () => {
      try {
        setLoading(true);
        setError(null);

        const constraints: any[] = [where('role', '==', 'expat')];

        if (selectedCountry !== 'all') constraints.push(where('country', '==', selectedCountry));

        constraints.push(orderBy(sortField, sortDirection));
        constraints.push(limit(page * EXPATS_PER_PAGE));

        const snap = await getDocs(fsQuery(collection(db, 'users'), ...constraints));
        const data = snap.docs.map(mapDoc);

        // Extract unique countries
        const uniqueCountries = Array.from(new Set(data.map((e) => e.country).filter(Boolean))).sort();
        const uniqueOriginCountries = Array.from(new Set(data.map((e) => e.originCountry).filter((c): c is string => Boolean(c)))).sort();
        const allLangs = new Set<string>();
        data.forEach((e) => (e.languages || []).forEach((l) => allLangs.add(l)));

        setExpats(data);
        setCountries(uniqueCountries);
        setOriginCountries(uniqueOriginCountries);
        setAvailableLanguages(Array.from(allLangs).sort());
        setHasMore(snap.docs.length === page * EXPATS_PER_PAGE);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Error loading expats:', err);
        logError({ origin: 'frontend', error: `Error loading expats: ${msg}`, context: { component: 'AdminExpats' } });
        setError('Erreur lors du chargement. Veuillez r\u00E9essayer.');
      } finally {
        setLoading(false);
      }
    };
    void fetchExpats();
  }, [selectedCountry, sortField, sortDirection, page]);

  // --- Handlers ---
  const handleToggleOnlineStatus = async (id: string, isCurrentlyOnline: boolean) => {
    setIsActionLoading(true);
    setOpenActionMenuId(null);
    try {
      const newAvail = !isCurrentlyOnline ? 'available' : 'offline';
      await updateDoc(doc(db, 'users', id), { isOnline: !isCurrentlyOnline, availability: newAvail, updatedAt: serverTimestamp() });
      await updateDoc(doc(db, 'sos_profiles', id), { isOnline: !isCurrentlyOnline, availability: newAvail, updatedAt: serverTimestamp() });
      setExpats((prev) => prev.map((e) => e.id === id ? { ...e, isOnline: !isCurrentlyOnline } : e));
      toast.success(!isCurrentlyOnline ? 'Mis en ligne' : 'Mis hors ligne');
    } catch (err) {
      toast.error('Erreur changement statut');
      logError({ origin: 'frontend', error: `Error toggling online: ${err instanceof Error ? err.message : String(err)}`, context: { userId: id } });
    } finally { setIsActionLoading(false); }
  };

  const handleToggleVisibility = async (id: string, isCurrentlyVisible: boolean) => {
    setIsActionLoading(true);
    setOpenActionMenuId(null);
    try {
      await updateDoc(doc(db, 'sos_profiles', id), { isVisible: !isCurrentlyVisible, isVisibleOnMap: !isCurrentlyVisible, updatedAt: serverTimestamp() });
      setExpats((prev) => prev.map((e) => e.id === id ? { ...e, isVisible: !isCurrentlyVisible, isVisibleOnMap: !isCurrentlyVisible } : e));
      toast.success(!isCurrentlyVisible ? 'Rendu visible' : 'Masqu\u00E9');
    } catch (err) {
      toast.error('Erreur changement visibilit\u00E9');
      logError({ origin: 'frontend', error: `Error toggling visibility: ${err instanceof Error ? err.message : String(err)}`, context: { userId: id } });
    } finally { setIsActionLoading(false); }
  };

  const handleToggleFeatured = async (id: string, isCurrentlyFeatured: boolean) => {
    setFeaturedLoading(id);
    setOpenActionMenuId(null);
    try {
      const fn = httpsCallable(functions, 'setProviderBadge');
      await fn({ providerId: id, isFeatured: !isCurrentlyFeatured });
      setExpats((prev) => prev.map((e) => e.id === id ? { ...e, isFeatured: !isCurrentlyFeatured } : e));
      toast.success(!isCurrentlyFeatured ? 'Badge attribu\u00E9' : 'Badge retir\u00E9');
    } catch (err) {
      toast.error('Erreur changement mise en avant');
      logError({ origin: 'frontend', error: `Error toggling featured: ${err instanceof Error ? err.message : String(err)}`, context: { userId: id } });
    } finally { setFeaturedLoading(null); }
  };

  const handleValidationChange = async (id: string, validationStatus: ValidationStatus) => {
    setOpenActionMenuId(null);
    try {
      const updates: any = { validationStatus, updatedAt: serverTimestamp() };
      if (validationStatus === 'approved') {
        updates.status = 'active';
        updates.approvedAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'users', id), updates);
      setExpats((prev) => prev.map((e) => e.id === id ? { ...e, validationStatus, status: validationStatus === 'approved' ? 'active' : e.status } : e));
      toast.success('Validation mise \u00E0 jour');
    } catch (err) {
      toast.error('Erreur changement validation');
      logError({ origin: 'frontend', error: `Error changing validation: ${err instanceof Error ? err.message : String(err)}`, context: { userId: id } });
    }
  };

  const handleStatusChange = async (id: string, status: ExpatStatus) => {
    setOpenActionMenuId(null);
    try {
      await updateDoc(doc(db, 'users', id), { status, updatedAt: serverTimestamp() });
      setExpats((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
      toast.success('Statut mis \u00E0 jour');
    } catch (err) {
      toast.error('Erreur changement statut');
    }
  };

  const handleDeleteExpat = (expat: Expat) => {
    setSelectedExpat(expat);
    setDeleteReason('');
    setDeleteConfirmText('');
    setShowDeleteModal(true);
    setOpenActionMenuId(null);
  };

  const handleBanExpat = (expat: Expat) => {
    setSelectedExpat(expat);
    setBanReason('');
    setShowBanModal(true);
    setOpenActionMenuId(null);
  };

  const confirmDeleteExpat = async () => {
    if (!selectedExpat) return;
    setIsActionLoading(true);
    try {
      const result = await httpsCallable(functions, 'adminDeleteUser')({ userId: selectedExpat.id, reason: deleteReason || undefined });
      const data = result.data as { success: boolean; message: string };
      setExpats((prev) => prev.filter((e) => e.id !== selectedExpat.id));
      setSelectedUserIds((prev) => { const n = new Set(prev); n.delete(selectedExpat.id); return n; });
      setShowDeleteModal(false);
      setSelectedExpat(null);
      toast.success(data.message || 'Expatri\u00E9 supprim\u00E9');
    } catch (err) {
      toast.error(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
      logError({ origin: 'frontend', error: `Error deleting expat: ${err instanceof Error ? err.message : String(err)}`, context: { userId: selectedExpat.id } });
    } finally { setIsActionLoading(false); }
  };

  const confirmBanExpat = async () => {
    if (!selectedExpat) return;
    setIsActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', selectedExpat.id), { isBanned: true, banReason, status: 'banned', updatedAt: serverTimestamp() });
      await updateDoc(doc(db, 'sos_profiles', selectedExpat.id), { isBanned: true, isVisible: false, isVisibleOnMap: false, isOnline: false, updatedAt: serverTimestamp() });
      setExpats((prev) => prev.map((e) => e.id === selectedExpat.id ? { ...e, isBanned: true, banReason, status: 'banned' as ExpatStatus } : e));
      setShowBanModal(false);
      setSelectedExpat(null);
      toast.success('Expatri\u00E9 banni');
    } catch (err) {
      toast.error('Erreur lors du bannissement');
      logError({ origin: 'frontend', error: `Error banning expat: ${err instanceof Error ? err.message : String(err)}`, context: { userId: selectedExpat.id } });
    } finally { setIsActionLoading(false); }
  };

  const handleUnbanExpat = async (id: string) => {
    setIsActionLoading(true);
    setOpenActionMenuId(null);
    try {
      await updateDoc(doc(db, 'users', id), { isBanned: false, banReason: '', status: 'active', updatedAt: serverTimestamp() });
      await updateDoc(doc(db, 'sos_profiles', id), { isBanned: false, isVisible: true, isVisibleOnMap: true, updatedAt: serverTimestamp() });
      setExpats((prev) => prev.map((e) => e.id === id ? { ...e, isBanned: false, banReason: '', status: 'active' as ExpatStatus } : e));
      toast.success('Expatri\u00E9 r\u00E9activ\u00E9');
    } catch (err) {
      toast.error('Erreur lors de la r\u00E9activation');
      logError({ origin: 'frontend', error: `Error unbanning: ${err instanceof Error ? err.message : String(err)}`, context: { userId: id } });
    } finally { setIsActionLoading(false); }
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.size === 0) return;
    setBulkDeleteReason('');
    setBulkDeleteConfirmText('');
    setBulkDeleteProgress({ current: 0, total: 0 });
    setShowBulkDeleteModal(true);
  };

  const executeBulkDelete = async () => {
    const ids = Array.from(selectedUserIds);
    setBulkDeleteProgress({ current: 0, total: ids.length });
    setIsActionLoading(true);
    const deleteFn = httpsCallable(functions, 'adminDeleteUser');
    const errors: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      try {
        await deleteFn({ userId: ids[i], reason: bulkDeleteReason || 'Suppression en lot' });
        setBulkDeleteProgress({ current: i + 1, total: ids.length });
      } catch (err) { errors.push(`${ids[i]}: ${err instanceof Error ? err.message : String(err)}`); }
    }
    const deletedIds = new Set(ids.filter((id) => !errors.some((e) => e.startsWith(id))));
    setExpats((prev) => prev.filter((e) => !deletedIds.has(e.id)));
    setSelectedUserIds(new Set());
    setShowBulkDeleteModal(false);
    setIsActionLoading(false);
    if (errors.length > 0) toast.error(`${ids.length - errors.length}/${ids.length} supprim\u00E9s.`);
    else toast.success(`${ids.length} expatri\u00E9(s) supprim\u00E9(s)`);
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) => { const n = new Set(prev); n.has(userId) ? n.delete(userId) : n.add(userId); return n; });
  };
  const toggleSelectAll = () => {
    setSelectedUserIds(selectedUserIds.size === filteredExpats.length ? new Set() : new Set(filteredExpats.map((e) => e.id)));
  };

  const handleSortChange = (field: 'createdAt' | 'lastLoginAt') => {
    if (sortField === field) setSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDirection('desc'); }
  };

  const exportCsv = () => {
    const rows = [
      '\uFEFF' + ['ID', 'Pr\u00E9nom', 'Nom', 'Email', 'Pays', 'Origine', 'Note', 'Avis', 'Appels', 'Gains', 'Statut', 'Validation', 'En ligne', 'Visible', 'Inscription', 'Derni\u00E8re connexion'].join(','),
      ...filteredExpats.map((e) => [
        e.id, e.firstName, e.lastName, e.email, e.country, e.originCountry || '',
        e.rating.toFixed(1), e.reviewsCount, e.callsCount, (e.totalEarned / 100).toFixed(2),
        e.status, e.validationStatus, e.isOnline ? 'Oui' : 'Non', e.isVisible ? 'Oui' : 'Non',
        formatDateFull(e.createdAt), e.lastLoginAt.getTime() > 0 ? formatDateFull(e.lastLoginAt) : '',
      ].join(',')),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expatries_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // --- Filters ---
  const filteredExpats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return expats.filter((e) => {
      if (term.length > 0 && !e.firstName?.toLowerCase().includes(term) && !e.lastName?.toLowerCase().includes(term) && !e.email?.toLowerCase().includes(term) && !e.id.toLowerCase().includes(term) && !(e.city || '').toLowerCase().includes(term)) return false;

      // Status filter
      if (advancedFilters.status !== 'all' && e.status !== advancedFilters.status) return false;

      // Validation filter
      if (advancedFilters.validationStatus !== 'all' && e.validationStatus !== advancedFilters.validationStatus) return false;

      // Origin country filter
      if (advancedFilters.originCountry !== 'all' && advancedFilters.originCountry.trim() !== '' && e.originCountry !== advancedFilters.originCountry) return false;

      // Help domain filter (partial match)
      if (advancedFilters.helpDomain && !e.helpDomains.some((d) => d.toLowerCase().includes(advancedFilters.helpDomain.toLowerCase()))) return false;

      // Language filter
      if (advancedFilters.language !== '' && advancedFilters.language !== 'all' && !(e.languages || []).some((l) => l.toLowerCase().includes(advancedFilters.language.toLowerCase()))) return false;

      // Min rating
      if (advancedFilters.minRating !== 'all' && e.rating < parseFloat(advancedFilters.minRating)) return false;

      // Date range filter
      if (advancedFilters.dateRange !== 'all') {
        const now = new Date();
        const from = new Date();
        if (advancedFilters.dateRange === 'today') from.setHours(0, 0, 0, 0);
        else if (advancedFilters.dateRange === 'week') from.setDate(now.getDate() - 7);
        else if (advancedFilters.dateRange === 'month') from.setMonth(now.getMonth() - 1);
        if (e.createdAt < from) return false;
      }

      return true;
    });
  }, [expats, searchTerm, advancedFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.status !== 'all') count++;
    if (advancedFilters.validationStatus !== 'all') count++;
    if (advancedFilters.originCountry !== 'all' && advancedFilters.originCountry.trim() !== '') count++;
    if (advancedFilters.helpDomain.trim() !== '') count++;
    if (advancedFilters.language.trim() !== '' && advancedFilters.language !== 'all') count++;
    if (advancedFilters.minRating !== 'all') count++;
    if (advancedFilters.dateRange !== 'all') count++;
    return count;
  }, [advancedFilters]);

  // --- Sort icon helper ---
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400" />;
    return sortDirection === 'desc' ? <ChevronDown size={14} className="text-red-600" /> : <ChevronUp size={14} className="text-red-600" />;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && expats.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="large" color="red" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-6 space-y-5 max-w-[1600px] mx-auto">

        {/* ===== HEADER ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Expatri\u00E9s</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filteredExpats.length} r\u00E9sultat{filteredExpats.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={15} />
              Export
            </button>
          </div>
        </div>

        {error && <AdminErrorState error={error} onRetry={() => setPage(1)} />}

        {/* ===== SEARCH + FILTERS BAR ===== */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher par nom, email, ville ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 min-w-[140px]">
              <option value="all">Tous les pays</option>
              {countries.map((c) => <option key={c} value={c}>{getCountryFlag(c)} {getCountryName(c, 'fr') || c}</option>)}
            </select>

            <select value={`${sortField}-${sortDirection}`}
              onChange={(e) => { const [f, d] = e.target.value.split('-') as ['createdAt'|'lastLoginAt','asc'|'desc']; setSortField(f); setSortDirection(d); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 min-w-[160px]">
              <option value="createdAt-desc">Plus r\u00E9cents</option>
              <option value="createdAt-asc">Plus anciens</option>
              <option value="lastLoginAt-desc">Connexion r\u00E9cente</option>
            </select>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                activeFilterCount > 0
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter size={15} />
              Filtres
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full">{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* ===== ADVANCED FILTERS PANEL ===== */}
        {showAdvancedFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Filtres avanc\u00E9s</h3>
              <button onClick={() => setAdvancedFilters({ status: 'all', validationStatus: 'all', country: 'all', originCountry: 'all', helpDomain: '', language: '', minRating: 'all', dateRange: 'all' })}
                className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1">
                <RefreshCw size={12} /> R\u00E9initialiser
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
                <select value={advancedFilters.status} onChange={(e) => setAdvancedFilters((p) => ({ ...p, status: e.target.value as any }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option value="all">Tous</option>
                  <option value="active">Actif</option>
                  <option value="suspended">Suspendu</option>
                  <option value="banned">Banni</option>
                </select>
              </div>

              {/* Validation */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Validation</label>
                <select value={advancedFilters.validationStatus} onChange={(e) => setAdvancedFilters((p) => ({ ...p, validationStatus: e.target.value as any }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option value="all">Tous</option>
                  <option value="approved">Approuv\u00E9</option>
                  <option value="pending">En attente</option>
                  <option value="rejected">Rejet\u00E9</option>
                </select>
              </div>

              {/* Origin Country */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pays d'origine</label>
                <select value={advancedFilters.originCountry} onChange={(e) => setAdvancedFilters((p) => ({ ...p, originCountry: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option value="all">Tous</option>
                  {originCountries.map((c) => <option key={c} value={c}>{getCountryFlag(c)} {getCountryName(c, 'fr') || c}</option>)}
                </select>
              </div>

              {/* Help domain */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Domaine d'aide</label>
                <input value={advancedFilters.helpDomain} onChange={(e) => setAdvancedFilters((p) => ({ ...p, helpDomain: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  placeholder="logement, papiers..." />
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Langue</label>
                <select value={advancedFilters.language || 'all'} onChange={(e) => setAdvancedFilters((p) => ({ ...p, language: e.target.value === 'all' ? '' : e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option value="all">Toutes</option>
                  {availableLanguages.map((l) => <option key={l} value={l}>{getLanguageName(l, 'fr') || l}</option>)}
                </select>
              </div>

              {/* Min rating */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Note min</label>
                <select value={advancedFilters.minRating} onChange={(e) => setAdvancedFilters((p) => ({ ...p, minRating: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option value="all">Toutes</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="4.5">4.5+</option>
                  <option value="5">5</option>
                </select>
              </div>

              {/* Date range */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">P\u00E9riode</label>
                <select value={advancedFilters.dateRange} onChange={(e) => setAdvancedFilters((p) => ({ ...p, dateRange: e.target.value as any }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option value="all">Toutes</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="week">7 derniers jours</option>
                  <option value="month">30 derniers jours</option>
                </select>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500 mr-1">Actifs :</span>
                {advancedFilters.status !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {advancedFilters.status === 'active' ? 'Actif' : advancedFilters.status === 'suspended' ? 'Suspendu' : 'Banni'}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, status: 'all' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.validationStatus !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {advancedFilters.validationStatus === 'approved' ? 'Approuv\u00E9' : advancedFilters.validationStatus === 'pending' ? 'En attente' : 'Rejet\u00E9'}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, validationStatus: 'all' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.originCountry !== 'all' && advancedFilters.originCountry.trim() !== '' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {getCountryFlag(advancedFilters.originCountry)} {getCountryName(advancedFilters.originCountry, 'fr') || advancedFilters.originCountry}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, originCountry: 'all' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.helpDomain.trim() !== '' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {advancedFilters.helpDomain}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, helpDomain: '' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.language !== '' && advancedFilters.language !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {getLanguageName(advancedFilters.language, 'fr') || advancedFilters.language}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, language: '' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.minRating !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    Note {advancedFilters.minRating}+
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, minRating: 'all' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.dateRange !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {advancedFilters.dateRange === 'today' ? "Aujourd'hui" : advancedFilters.dateRange === 'week' ? '7 jours' : '30 jours'}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, dateRange: 'all' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== BULK ACTIONS BAR ===== */}
        {selectedUserIds.size > 0 && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-red-800">
              {selectedUserIds.size} s\u00E9lectionn\u00E9{selectedUserIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedUserIds(new Set())} className="text-sm text-red-600 hover:text-red-800 font-medium">
                D\u00E9s\u00E9lectionner
              </button>
              <button onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        )}

        {/* ===== TABLE ===== */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pl-4 pr-2 py-3 w-10">
                    <input type="checkbox" checked={filteredExpats.length > 0 && selectedUserIds.size === filteredExpats.length}
                      onChange={toggleSelectAll} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expatri\u00E9</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Pays</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Origine</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSortChange('createdAt')}>
                    <span className="inline-flex items-center gap-1">Inscription <SortIcon field="createdAt" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 hidden lg:table-cell" onClick={() => handleSortChange('lastLoginAt')}>
                    <span className="inline-flex items-center gap-1">Derni\u00E8re connexion <SortIcon field="lastLoginAt" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Validation</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={9} className="py-16 text-center"><LoadingSpinner text={adminT.loading} /></td></tr>
                ) : filteredExpats.length > 0 ? (
                  filteredExpats.map((e) => (
                    <tr key={e.id} className={`group transition-colors hover:bg-gray-50/80 ${selectedUserIds.has(e.id) ? 'bg-red-50/50' : ''}`}>
                      {/* Checkbox */}
                      <td className="pl-4 pr-2 py-3">
                        <input type="checkbox" checked={selectedUserIds.has(e.id)} onChange={() => toggleSelectUser(e.id)}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                      </td>

                      {/* Expatri\u00E9 (avatar + name + email) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="relative flex-shrink-0">
                            <img
                              src={e.photoURL || e.profilePhoto || '/default-avatar.png'}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
                              onError={(ev) => { (ev.target as HTMLImageElement).src = '/default-avatar.png'; }}
                            />
                            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${e.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => { setSelectedExpat(e); setShowUserModal(true); }}
                              className="text-sm font-medium text-gray-900 hover:text-red-600 transition-colors truncate block max-w-[180px]"
                              title={`${e.firstName} ${e.lastName}`}
                            >
                              {e.firstName} {e.lastName}
                            </button>
                            <p className="text-xs text-gray-500 truncate max-w-[180px]">{e.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Pays */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-gray-600">
                          {e.country ? `${getCountryFlag(e.country)} ${getCountryName(e.country, 'fr') || e.country}` : '\u2014'}
                        </span>
                      </td>

                      {/* Origine */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-gray-600">
                          {e.originCountry ? `${getCountryFlag(e.originCountry)} ${getCountryName(e.originCountry, 'fr') || e.originCountry}` : '\u2014'}
                        </span>
                      </td>

                      {/* Inscription */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600" title={formatDateFull(e.createdAt)}>{formatDateShort(e.createdAt)}</span>
                      </td>

                      {/* Derni\u00E8re connexion */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-gray-500" title={e.lastLoginAt.getTime() > 0 ? formatDateFull(e.lastLoginAt) : 'Jamais connect\u00E9'}>
                          {timeAgo(e.lastLoginAt)}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {e.isBanned ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">BANNI</span>
                          ) : e.status === 'suspended' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700">SUSPENDU</span>
                          ) : e.status === 'active' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">ACTIF</span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700">EN ATTENTE</span>
                          )}
                          {!e.isBanned && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${e.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                              {e.isOnline ? 'En ligne' : 'Hors ligne'}
                            </span>
                          )}
                          {e.isFeatured && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">VEDETTE</span>
                          )}
                        </div>
                      </td>

                      {/* Validation */}
                      <td className="px-4 py-3">
                        {e.validationStatus === 'rejected' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">Refus\u00E9</span>
                        ) : e.validationStatus === 'approved' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">Approuv\u00E9</span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700">En attente</span>
                        )}
                      </td>

                      {/* Actions dropdown */}
                      <td className="px-3 py-3">
                        <div className="relative" ref={openActionMenuId === e.id ? actionMenuRef : undefined}>
                          <button
                            onClick={() => setOpenActionMenuId(openActionMenuId === e.id ? null : e.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {openActionMenuId === e.id && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-1">
                              <button onClick={() => { setSelectedExpat(e); setShowUserModal(true); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Eye size={14} className="text-cyan-600" /> Voir le profil
                              </button>
                              <button onClick={() => { setTranslationProviderId(e.id); setTranslationModalOpen(true); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Languages size={14} className="text-blue-500" /> Traductions
                              </button>
                              <button onClick={() => void handleToggleOnlineStatus(e.id, e.isOnline)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                {e.isOnline ? <EyeOff size={14} className="text-gray-500" /> : <Eye size={14} className="text-emerald-600" />}
                                {e.isOnline ? 'Mettre hors ligne' : 'Mettre en ligne'}
                              </button>
                              <button onClick={() => void handleToggleVisibility(e.id, e.isVisible)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <MapPin size={14} className="text-gray-500" />
                                {e.isVisible ? 'Masquer' : 'Rendre visible'}
                              </button>
                              <button onClick={() => void handleToggleFeatured(e.id, e.isFeatured)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                disabled={featuredLoading === e.id}>
                                <Shield size={14} className="text-amber-500" />
                                {e.isFeatured ? 'Retirer vedette' : 'Mettre en vedette'}
                              </button>
                              {/* Validation quick actions */}
                              {e.validationStatus !== 'approved' && (
                                <button onClick={() => void handleValidationChange(e.id, 'approved')}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors">
                                  <Star size={14} /> Approuver
                                </button>
                              )}
                              {e.validationStatus !== 'rejected' && (
                                <button onClick={() => void handleValidationChange(e.id, 'rejected')}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 transition-colors">
                                  <X size={14} /> Rejeter
                                </button>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              {e.isBanned ? (
                                <button onClick={() => void handleUnbanExpat(e.id)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors">
                                  <UserPlus size={14} /> R\u00E9activer le compte
                                </button>
                              ) : (
                                <button onClick={() => handleBanExpat(e)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 transition-colors">
                                  <Ban size={14} /> Bannir
                                </button>
                              )}
                              <button onClick={() => handleDeleteExpat(e)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors">
                                <Trash2 size={14} /> Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={9} className="py-16 text-center text-gray-400 text-sm">Aucun expatri\u00E9 trouv\u00E9</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="border-t border-gray-100 px-4 py-3">
              <button onClick={() => setPage((p) => p + 1)} disabled={loading}
                className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50">
                {loading ? 'Chargement...' : 'Charger plus'}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ================================================================== */}
      {/* MODAL: EXPAT DETAIL                                                */}
      {/* ================================================================== */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="D\u00E9tail expatri\u00E9" size="large">
        {selectedExpat && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={selectedExpat.photoURL || selectedExpat.profilePhoto || '/default-avatar.png'} alt=""
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100"
                  onError={(ev) => { (ev.target as HTMLImageElement).src = '/default-avatar.png'; }} />
                <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${selectedExpat.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedExpat.firstName} {selectedExpat.lastName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-emerald-50 border-emerald-200 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Expatri\u00E9
                  </span>
                  {selectedExpat.isBanned && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-xs font-semibold">BANNI</span>}
                  {selectedExpat.isFeatured && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-xs font-semibold">VEDETTE</span>}
                </div>
              </div>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <Mail size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900 break-all">{selectedExpat.email || '\u2014'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900">{selectedExpat.phone || 'Non renseign\u00E9'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Globe size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900">
                      {selectedExpat.country ? `${getCountryFlag(selectedExpat.country)} ${getCountryName(selectedExpat.country, 'fr') || selectedExpat.country}` : 'Non renseign\u00E9'}
                      {selectedExpat.city ? `, ${selectedExpat.city}` : ''}
                    </span>
                  </div>
                  {selectedExpat.originCountry && (
                    <div className="flex items-center gap-2.5">
                      <MapPin size={15} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900">
                        Origine: {getCountryFlag(selectedExpat.originCountry)} {getCountryName(selectedExpat.originCountry, 'fr') || selectedExpat.originCountry}
                      </span>
                    </div>
                  )}
                  {selectedExpat.languages && selectedExpat.languages.length > 0 && (
                    <div className="flex items-center gap-2.5">
                      <Languages size={15} className="text-gray-400 flex-shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {selectedExpat.languages.map((l) => (
                          <span key={l} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{getLanguageName(l, 'fr') || l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Activity */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Activit\u00E9</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Calendar size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Inscription</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatDateShort(selectedExpat.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Clock size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Derni\u00E8re connexion</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900" title={selectedExpat.lastLoginAt.getTime() > 0 ? formatDateFull(selectedExpat.lastLoginAt) : ''}>
                      {selectedExpat.lastLoginAt.getTime() > 0 ? timeAgo(selectedExpat.lastLoginAt) : 'Jamais'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Phone size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Appels</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{selectedExpat.callsCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Star size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Note</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{selectedExpat.rating > 0 ? `${selectedExpat.rating.toFixed(1)} (${selectedExpat.reviewsCount} avis)` : 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <LinkIcon size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Gains totaux</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{fmtMoney(selectedExpat.totalEarned)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expertise */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Expertise</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Exp\u00E9rience', value: selectedExpat.yearsInCountry > 0 ? `${selectedExpat.yearsInCountry} an${selectedExpat.yearsInCountry > 1 ? 's' : ''}` : '\u2014' },
                  { label: 'Visible', value: selectedExpat.isVisible ? 'Oui' : 'Non', isPositive: selectedExpat.isVisible },
                  { label: 'Carte', value: selectedExpat.isVisibleOnMap ? 'Oui' : 'Non', isPositive: selectedExpat.isVisibleOnMap },
                  { label: 'Profil', value: `${selectedExpat.profileComplete}%`, isPositive: selectedExpat.profileComplete >= 80 },
                ].map(({ label, value, isPositive }) => (
                  <div key={label} className="flex flex-col items-center bg-white rounded-lg p-2.5 border border-gray-100">
                    <span className="text-[10px] font-medium text-gray-400 uppercase">{label}</span>
                    <span className={`mt-1 text-xs font-semibold ${isPositive !== undefined ? (isPositive ? 'text-emerald-600' : 'text-gray-500') : 'text-gray-900'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              {selectedExpat.helpDomains.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-gray-500">Domaines d'aide:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedExpat.helpDomains.map((d) => (
                      <span key={d} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{d}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Visibilit\u00E9 carte:</span>
                <AdminMapVisibilityToggle userId={selectedExpat.id} className="text-xs" />
              </div>
            </div>

            {selectedExpat.isBanned && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Raison du bannissement</h4>
                <p className="text-sm text-red-700">{selectedExpat.banReason || 'Aucune raison sp\u00E9cifi\u00E9e'}</p>
              </div>
            )}

            {/* ID */}
            <div className="text-xs text-gray-400 font-mono select-all">ID: {selectedExpat.id}</div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button onClick={() => setShowUserModal(false)} variant="outline" size="small">Fermer</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: DELETE                                                      */}
      {/* ================================================================== */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Supprimer l'expatri\u00E9" size="small">
        {selectedExpat && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Action irr\u00E9versible</h3>
                  <p className="mt-1 text-sm text-red-700">
                    <strong>{selectedExpat.firstName} {selectedExpat.lastName}</strong> (Expatri\u00E9) sera supprim\u00E9 d\u00E9finitivement avec toutes ses donn\u00E9es.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison (optionnelle)</label>
              <textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none" placeholder="..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tapez <strong className="text-red-600">SUPPRIMER</strong> pour confirmer</label>
              <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" placeholder="SUPPRIMER" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setShowDeleteModal(false)} variant="outline" size="small" disabled={isActionLoading}>Annuler</Button>
              <Button onClick={confirmDeleteExpat} variant="danger" size="small" loading={isActionLoading} disabled={deleteConfirmText !== 'SUPPRIMER'}>
                <Trash2 size={14} className="mr-1.5" /> Supprimer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: BULK DELETE                                                 */}
      {/* ================================================================== */}
      <Modal isOpen={showBulkDeleteModal} onClose={() => setShowBulkDeleteModal(false)} title={`Supprimer ${selectedUserIds.size} expatri\u00E9${selectedUserIds.size > 1 ? 's' : ''}`} size="small">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Suppression en lot irr\u00E9versible</h3>
                <p className="mt-1 text-sm text-red-700">{selectedUserIds.size} expatri\u00E9{selectedUserIds.size > 1 ? 's' : ''} seront supprim\u00E9s.</p>
                <div className="mt-2 max-h-24 overflow-y-auto space-y-0.5">
                  {Array.from(selectedUserIds).map((id) => {
                    const e = expats.find((ex) => ex.id === id);
                    return <div key={id} className="text-xs text-red-600">{e ? `${e.firstName} ${e.lastName}` : id}</div>;
                  })}
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Raison</label>
            <textarea value={bulkDeleteReason} onChange={(e) => setBulkDeleteReason(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tapez <strong className="text-red-600">SUPPRIMER</strong></label>
            <input type="text" value={bulkDeleteConfirmText} onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" placeholder="SUPPRIMER" />
          </div>
          {bulkDeleteProgress.total > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progression</span><span>{bulkDeleteProgress.current}/{bulkDeleteProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-red-600 h-1.5 rounded-full transition-all" style={{ width: `${(bulkDeleteProgress.current / bulkDeleteProgress.total) * 100}%` }} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setShowBulkDeleteModal(false)} variant="outline" size="small" disabled={isActionLoading}>Annuler</Button>
            <Button onClick={executeBulkDelete} variant="danger" size="small" loading={isActionLoading} disabled={bulkDeleteConfirmText !== 'SUPPRIMER'}>
              <Trash2 size={14} className="mr-1.5" /> Supprimer {selectedUserIds.size}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: BAN                                                         */}
      {/* ================================================================== */}
      <Modal isOpen={showBanModal} onClose={() => setShowBanModal(false)} title="Bannir l'expatri\u00E9" size="small">
        {selectedExpat && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex gap-3">
                <Ban className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-orange-800">Bannissement</h3>
                  <p className="mt-1 text-sm text-orange-700">
                    <strong>{selectedExpat.firstName} {selectedExpat.lastName}</strong> ne pourra plus se connecter.
                  </p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raison du bannissement</label>
              <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none" placeholder="Raison..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setShowBanModal(false)} variant="outline" size="small" disabled={isActionLoading}>Annuler</Button>
              <Button onClick={confirmBanExpat} size="small" loading={isActionLoading} className="bg-orange-600 hover:bg-orange-700">
                <Ban size={14} className="mr-1.5" /> Bannir
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: TRANSLATION                                                 */}
      {/* ================================================================== */}
      {translationModalOpen && (
        <TranslationModal
          isOpen={translationModalOpen}
          onClose={() => {
            setTranslationModalOpen(false);
            setTranslationProviderId(null);
          }}
          providerId={translationProviderId}
          t={(k: string) => k}
        />
      )}
    </AdminLayout>
  );
};

export default AdminExpats;
