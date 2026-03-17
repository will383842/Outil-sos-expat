import React, { useEffect, useMemo, useState, useRef } from 'react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAdminTranslations } from '../../utils/adminTranslations';
import {
  Search,
  Phone,
  Mail,
  Ban,
  MapPin,
  AlertTriangle,
  Filter,
  Download,
  RefreshCw,
  Globe,
  Eye,
  EyeOff,
  Languages,
  MoreHorizontal,
  X,
  ExternalLink,
  Edit3,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Link as LinkIcon,
  Clock,
  Calendar,
  Shield,
  UserPlus,
  Star,
  Scale,
  ClipboardCopy,
} from 'lucide-react';

import { httpsCallable } from 'firebase/functions';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  Timestamp,
  QueryConstraint,
  writeBatch,
} from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminErrorState from '../../components/admin/AdminErrorState';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import TranslationModal from '../../components/admin/TranslationModal';
import { logError } from '../../utils/logging';
import { getCountryName, getCountryFlag, getLanguageName } from '../../utils/formatters';
import { copyToClipboard } from '@/utils/clipboard';

// ============================================================================
// TYPES
// ============================================================================

type UserStatus = 'active' | 'pending' | 'blocked' | 'suspended';
type KycStatus = 'pending' | 'verified' | 'rejected' | 'requested';
type ValidationStatus = 'validated' | 'rejected' | 'pending';

type FirestoreLawyerDoc = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  profilePhoto?: string;
  photoURL?: string;
  phone?: string;
  phoneCountryCode?: string;
  country?: string;
  city?: string;
  status?: string;
  isBanned?: boolean;
  banReason?: string;
  emailVerified?: boolean;
  isOnline?: boolean;
  isVisibleOnMap?: boolean;
  isVisible?: boolean;
  isFeatured?: boolean;
  barId?: string;
  barCountry?: string;
  isValidated?: boolean;
  validationStatus?: ValidationStatus;
  validationReason?: string;
  kycStatus?: KycStatus;
  kycProvider?: 'stripe' | 'manual';
  kycStripeAccountId?: string;
  kycLastSyncAt?: Timestamp;
  specialties?: string[];
  languages?: string[];
  rating?: number;
  reviewsCount?: number;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
  updatedAt?: Timestamp;
};

type Lawyer = {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  profilePhoto?: string;
  photoURL?: string;
  phone?: string;
  phoneCountryCode?: string;
  country?: string;
  city?: string;
  status: UserStatus;
  isBanned: boolean;
  banReason?: string;
  emailVerified: boolean;
  isOnline: boolean;
  isVisibleOnMap: boolean;
  isVisible: boolean;
  isFeatured: boolean;
  barId?: string;
  barCountry?: string;
  isValidated: boolean;
  validationStatus: ValidationStatus;
  validationReason?: string;
  kycStatus: KycStatus;
  kycProvider?: 'stripe' | 'manual';
  kycStripeAccountId?: string;
  kycLastSyncAt?: Date;
  specialties: string[];
  languages: string[];
  rating?: number;
  reviewsCount?: number;
  createdAt: Date;
  lastLoginAt: Date;
  updatedAt: Date;
};

type AdvancedFilters = {
  status: 'all' | UserStatus;
  emailVerified: 'all' | 'verified' | 'unverified';
  validation: 'all' | 'validated' | 'pending' | 'rejected';
  kyc: 'all' | KycStatus;
  speciality: string;
  language: string;
  barId: string;
};

type MinimalCurrentUser = { id: string; role: string };

// ============================================================================
// CONSTANTS
// ============================================================================

const LAWYERS_PER_PAGE = 20;

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

// ============================================================================
// COMPONENT
// ============================================================================

const AdminLawyers: React.FC = () => {
  const navigate = useNavigate();
  const adminT = useAdminTranslations();
  const { user: rawCurrentUser } = useAuth() as { user?: MinimalCurrentUser | null };
  const currentUser: MinimalCurrentUser | null | undefined = rawCurrentUser;

  // --- State ---
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [showLawyerModal, setShowLawyerModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortField, setSortField] = useState<'createdAt' | 'lastLoginAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [countries, setCountries] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    status: 'all', emailVerified: 'all', validation: 'all',
    kyc: 'all', speciality: '', language: 'all', barId: '',
  });
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
  const [selectedLawyerIds, setSelectedLawyerIds] = useState<Set<string>>(new Set());
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Edit profile
  interface EditProfileFields {
    firstName: string; lastName: string; email: string; phone: string;
    phoneCountryCode: string; country: string; city: string;
    languages: string; specialties: string; barId: string; barCountry: string;
    adminNotes: string;
  }
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFields, setEditFields] = useState<EditProfileFields>({
    firstName: '', lastName: '', email: '', phone: '', phoneCountryCode: '',
    country: '', city: '', languages: '', specialties: '', barId: '', barCountry: '',
    adminNotes: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editTargetLawyer, setEditTargetLawyer] = useState<Lawyer | null>(null);

  // Delete
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0 });

  // Reason modal (for reject/suspend/kycRequest)
  const [reasonOpen, setReasonOpen] = useState<null | { type: 'suspend' | 'delete' | 'reject' | 'kycRequest'; ids: string[] }>(null);
  const [reasonText, setReasonText] = useState('');

  // Translation modal
  const [translationOpen, setTranslationOpen] = useState<{ open: boolean; lawyerId: string | null }>({
    open: false, lawyerId: null,
  });

  // Featured loading
  const [featuredLoading, setFeaturedLoading] = useState<string | null>(null);

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

  // --- Fetch lawyers ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') { navigate('/admin/login'); return; }

    const fetchLawyers = async () => {
      try {
        setLoading(true);
        setError(null);
        const qc: QueryConstraint[] = [where('role', '==', 'lawyer')];
        if (selectedCountry !== 'all') qc.push(where('country', '==', selectedCountry));
        qc.push(orderBy(sortField, sortDirection));
        qc.push(limit(page * LAWYERS_PER_PAGE));

        const snap = await getDocs(query(collection(db, 'users'), ...qc));
        const data: Lawyer[] = snap.docs.map((d) => {
          const raw = d.data() as FirestoreLawyerDoc;
          return {
            id: d.id,
            firstName: raw.firstName ?? '',
            lastName: raw.lastName ?? '',
            fullName: raw.fullName,
            email: raw.email ?? '',
            profilePhoto: raw.profilePhoto,
            photoURL: raw.photoURL,
            phone: raw.phone,
            phoneCountryCode: raw.phoneCountryCode,
            country: raw.country,
            city: raw.city,
            status: (raw.status ?? 'active') as UserStatus,
            isBanned: Boolean(raw.isBanned),
            banReason: raw.banReason,
            emailVerified: !!raw.emailVerified,
            isOnline: !!raw.isOnline,
            isVisibleOnMap: raw.isVisibleOnMap ?? raw.isVisible ?? false,
            isVisible: raw.isVisible ?? false,
            isFeatured: raw.isFeatured ?? false,
            barId: raw.barId,
            barCountry: raw.barCountry,
            isValidated: !!raw.isValidated,
            validationStatus: raw.validationStatus ?? 'pending',
            validationReason: raw.validationReason,
            kycStatus: raw.kycStatus ?? 'pending',
            kycProvider: raw.kycProvider,
            kycStripeAccountId: raw.kycStripeAccountId,
            kycLastSyncAt: raw.kycLastSyncAt?.toDate(),
            specialties: Array.isArray(raw.specialties) ? raw.specialties : [],
            languages: Array.isArray(raw.languages) ? raw.languages : [],
            rating: typeof raw.rating === 'number' ? raw.rating : undefined,
            reviewsCount: typeof raw.reviewsCount === 'number' ? raw.reviewsCount : undefined,
            createdAt: raw.createdAt?.toDate() || new Date(0),
            lastLoginAt: raw.lastLoginAt?.toDate() || new Date(0),
            updatedAt: raw.updatedAt?.toDate() || new Date(0),
          };
        });

        const uniqueCountries = Array.from(new Set(data.map((l) => l.country ?? '').filter(Boolean))).sort((a, b) => a.localeCompare(b));
        const allLangs = new Set<string>();
        const allSpecs = new Set<string>();
        data.forEach((l) => {
          (l.languages || []).forEach((lang) => allLangs.add(lang));
          (l.specialties || []).forEach((spec) => allSpecs.add(spec));
        });
        setAvailableLanguages(Array.from(allLangs).sort());
        setAvailableSpecialties(Array.from(allSpecs).sort());
        setLawyers(data);
        setCountries(uniqueCountries);
        setHasMore(snap.docs.length === page * LAWYERS_PER_PAGE);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Error loading lawyers:', err);
        logError({ origin: 'frontend', error: `Error loading lawyers: ${msg}`, context: { component: 'AdminLawyers' } });
        setError('Erreur lors du chargement. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    void fetchLawyers();
  }, [currentUser, navigate, selectedCountry, sortField, sortDirection, page]);

  // --- Action Handlers ---

  const handleEditLawyer = (lawyer: Lawyer) => {
    setEditTargetLawyer(lawyer);
    setEditFields({
      firstName: lawyer.firstName || '', lastName: lawyer.lastName || '',
      email: lawyer.email || '', phone: lawyer.phone || '',
      phoneCountryCode: lawyer.phoneCountryCode || '',
      country: lawyer.country || '', city: lawyer.city || '',
      languages: (lawyer.languages || []).join(', '),
      specialties: (lawyer.specialties || []).join(', '),
      barId: lawyer.barId || '', barCountry: lawyer.barCountry || '',
      adminNotes: (lawyer as any).adminNotes || '',
    });
    setShowEditModal(true);
    setOpenActionMenuId(null);
  };

  const handleSaveProfile = async () => {
    if (!editTargetLawyer) return;
    setEditLoading(true);
    try {
      const fn = httpsCallable(functions, 'adminUpdateUserProfile');
      const updates: Record<string, any> = { userId: editTargetLawyer.id, role: 'lawyer' };
      if (editFields.firstName !== (editTargetLawyer.firstName || '')) updates.firstName = editFields.firstName;
      if (editFields.lastName !== (editTargetLawyer.lastName || '')) updates.lastName = editFields.lastName;
      if (editFields.email !== (editTargetLawyer.email || '')) updates.email = editFields.email;
      if (editFields.phone !== (editTargetLawyer.phone || '')) updates.phone = editFields.phone;
      if (editFields.phoneCountryCode !== (editTargetLawyer.phoneCountryCode || '')) updates.phoneCountryCode = editFields.phoneCountryCode;
      if (editFields.country !== (editTargetLawyer.country || '')) updates.country = editFields.country;
      if (editFields.city !== (editTargetLawyer.city || '')) updates.city = editFields.city;
      if (editFields.barId !== (editTargetLawyer.barId || '')) updates.barId = editFields.barId;
      if (editFields.barCountry !== (editTargetLawyer.barCountry || '')) updates.barCountry = editFields.barCountry;
      const newLangs = editFields.languages.split(',').map(s => s.trim()).filter(Boolean);
      const oldLangs = editTargetLawyer.languages || [];
      if (JSON.stringify(newLangs) !== JSON.stringify(oldLangs)) updates.languages = newLangs;
      const newSpecs = editFields.specialties.split(',').map(s => s.trim()).filter(Boolean);
      const oldSpecs = editTargetLawyer.specialties || [];
      if (JSON.stringify(newSpecs) !== JSON.stringify(oldSpecs)) updates.specialties = newSpecs;
      if (editFields.adminNotes !== ((editTargetLawyer as any).adminNotes || '')) updates.adminNotes = editFields.adminNotes;
      if (Object.keys(updates).length <= 2) { toast.error('Aucune modification'); setEditLoading(false); return; }
      await fn(updates);
      toast.success('Profil mis a jour');
      setShowEditModal(false);
      setPage(1);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error(err.message || 'Erreur lors de la mise a jour');
    } finally { setEditLoading(false); }
  };

  const handleViewDashboard = (lawyer: Lawyer) => {
    window.open(`/dashboard?adminView=${lawyer.id}`, '_blank');
    setOpenActionMenuId(null);
  };

  const handleDeleteLawyer = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer); setDeleteReason(''); setDeleteConfirmText(''); setShowDeleteModal(true); setOpenActionMenuId(null);
  };

  const handleBanLawyer = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer); setBanReason(''); setShowBanModal(true); setOpenActionMenuId(null);
  };

  const confirmDeleteLawyer = async () => {
    if (!selectedLawyer) return;
    setIsActionLoading(true);
    try {
      const result = await httpsCallable(functions, 'adminDeleteUser')({ userId: selectedLawyer.id, reason: deleteReason || undefined });
      const data = result.data as { success: boolean; message: string; deletedSubDocs: number };
      setLawyers((prev) => prev.filter((l) => l.id !== selectedLawyer.id));
      setSelectedLawyerIds((prev) => { const n = new Set(prev); n.delete(selectedLawyer.id); return n; });
      setShowDeleteModal(false); setSelectedLawyer(null); setDeleteReason(''); setDeleteConfirmText('');
      toast.success(data.message || 'Avocat supprime');
    } catch (err) {
      toast.error(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
      logError({ origin: 'frontend', error: `Error deleting lawyer: ${err instanceof Error ? err.message : String(err)}`, context: { userId: selectedLawyer.id } });
    } finally { setIsActionLoading(false); }
  };

  const handleBulkDelete = () => {
    if (selectedLawyerIds.size === 0) return;
    setBulkDeleteReason(''); setBulkDeleteConfirmText(''); setBulkDeleteProgress({ current: 0, total: 0 }); setShowBulkDeleteModal(true);
  };

  const executeBulkDelete = async () => {
    const ids = Array.from(selectedLawyerIds);
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
    setLawyers((prev) => prev.filter((l) => !deletedIds.has(l.id)));
    setSelectedLawyerIds(new Set()); setShowBulkDeleteModal(false); setIsActionLoading(false);
    if (errors.length > 0) toast.error(`${ids.length - errors.length}/${ids.length} supprimes.`);
    else toast.success(`${ids.length} avocat(s) supprimes`);
  };

  const toggleSelectLawyer = (lawyerId: string) => {
    setSelectedLawyerIds((prev) => { const n = new Set(prev); n.has(lawyerId) ? n.delete(lawyerId) : n.add(lawyerId); return n; });
  };
  const toggleSelectAll = () => {
    setSelectedLawyerIds(selectedLawyerIds.size === filteredLawyers.length ? new Set() : new Set(filteredLawyers.map((l) => l.id)));
  };

  const confirmBanLawyer = async () => {
    if (!selectedLawyer) return;
    setIsActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', selectedLawyer.id), { isBanned: true, banReason, updatedAt: serverTimestamp() });
      await updateDoc(doc(db, 'sos_profiles', selectedLawyer.id), { isBanned: true, isVisible: false, isVisibleOnMap: false, isOnline: false, updatedAt: serverTimestamp() });
      setLawyers((prev) => prev.map((l) => l.id === selectedLawyer.id ? { ...l, isBanned: true, banReason } : l));
      setShowBanModal(false); setSelectedLawyer(null);
      await addDoc(collection(db, 'logs'), { type: 'user_banned', userId: selectedLawyer.id, bannedBy: currentUser?.id ?? null, reason: banReason, timestamp: serverTimestamp() });
    } catch (err) {
      toast.error('Erreur lors du bannissement');
      logError({ origin: 'frontend', error: `Error banning lawyer: ${err instanceof Error ? err.message : String(err)}`, context: { userId: selectedLawyer.id } });
    } finally { setIsActionLoading(false); }
  };

  const handleUnbanLawyer = async (lawyerId: string) => {
    setIsActionLoading(true); setOpenActionMenuId(null);
    try {
      await updateDoc(doc(db, 'users', lawyerId), { isBanned: false, banReason: '', updatedAt: serverTimestamp() });
      await updateDoc(doc(db, 'sos_profiles', lawyerId), { isBanned: false, isVisible: true, isVisibleOnMap: true, updatedAt: serverTimestamp() });
      setLawyers((prev) => prev.map((l) => l.id === lawyerId ? { ...l, isBanned: false, banReason: '' } : l));
      await addDoc(collection(db, 'logs'), { type: 'user_unbanned', userId: lawyerId, unbannedBy: currentUser?.id ?? null, timestamp: serverTimestamp() });
      toast.success('Avocat reactive');
    } catch (err) {
      toast.error('Erreur lors de la reactivation');
      logError({ origin: 'frontend', error: `Error unbanning lawyer: ${err instanceof Error ? err.message : String(err)}`, context: { userId: lawyerId } });
    } finally { setIsActionLoading(false); }
  };

  const handleToggleOnlineStatus = async (lawyerId: string, isCurrentlyOnline: boolean) => {
    setIsActionLoading(true); setOpenActionMenuId(null);
    try {
      const newAvail = !isCurrentlyOnline ? 'available' : 'offline';
      await updateDoc(doc(db, 'users', lawyerId), { isOnline: !isCurrentlyOnline, availability: newAvail, updatedAt: serverTimestamp() });
      await updateDoc(doc(db, 'sos_profiles', lawyerId), { isOnline: !isCurrentlyOnline, availability: newAvail, updatedAt: serverTimestamp() });
      setLawyers((prev) => prev.map((l) => l.id === lawyerId ? { ...l, isOnline: !isCurrentlyOnline } : l));
      await addDoc(collection(db, 'logs'), { type: !isCurrentlyOnline ? 'user_set_online' : 'user_set_offline', userId: lawyerId, changedBy: currentUser?.id ?? null, timestamp: serverTimestamp() });
    } catch (err) {
      toast.error('Erreur changement statut');
      logError({ origin: 'frontend', error: `Error toggling online: ${err instanceof Error ? err.message : String(err)}`, context: { userId: lawyerId } });
    } finally { setIsActionLoading(false); }
  };

  const handleToggleVisibility = async (lawyerId: string, isCurrentlyVisible: boolean) => {
    setIsActionLoading(true); setOpenActionMenuId(null);
    try {
      await updateDoc(doc(db, 'sos_profiles', lawyerId), { isVisible: !isCurrentlyVisible, isVisibleOnMap: !isCurrentlyVisible, updatedAt: serverTimestamp() });
      setLawyers((prev) => prev.map((l) => l.id === lawyerId ? { ...l, isVisible: !isCurrentlyVisible, isVisibleOnMap: !isCurrentlyVisible } : l));
      await addDoc(collection(db, 'logs'), { type: !isCurrentlyVisible ? 'user_set_visible' : 'user_set_invisible', userId: lawyerId, changedBy: currentUser?.id ?? null, timestamp: serverTimestamp() });
    } catch (err) {
      toast.error('Erreur changement visibilite');
      logError({ origin: 'frontend', error: `Error toggling visibility: ${err instanceof Error ? err.message : String(err)}`, context: { userId: lawyerId } });
    } finally { setIsActionLoading(false); }
  };

  const handleToggleFeatured = async (lawyerId: string, isCurrentlyFeatured: boolean) => {
    setFeaturedLoading(lawyerId); setOpenActionMenuId(null);
    try {
      const fn = httpsCallable(functions, 'setProviderBadge');
      await fn({ providerId: lawyerId, isFeatured: !isCurrentlyFeatured });
      setLawyers((prev) => prev.map((l) => l.id === lawyerId ? { ...l, isFeatured: !isCurrentlyFeatured } : l));
      toast.success(!isCurrentlyFeatured ? 'Badge attribue' : 'Badge retire');
    } catch (err) {
      console.error('toggleFeatured error', err);
      toast.error('Erreur lors de la mise a jour du badge');
    } finally { setFeaturedLoading(null); }
  };

  const setValidation = async (id: string, status: ValidationStatus, reason?: string) => {
    setOpenActionMenuId(null);
    try {
      const payload: Record<string, unknown> = {
        validationStatus: status,
        isValidated: status === 'validated',
        updatedAt: serverTimestamp(),
      };
      if (status === 'rejected') payload.validationReason = reason || null;
      if (status === 'validated') payload.validationReason = null;
      await updateDoc(doc(db, 'users', id), payload);
      setLawyers((prev) => prev.map((l) => l.id === id ? { ...l, validationStatus: status, isValidated: status === 'validated' } : l));
      toast.success('Validation mise a jour');
    } catch (e) {
      console.error('setValidation error', e);
      toast.error('Erreur lors de la mise a jour');
    }
  };

  const setKyc = async (id: string, next: KycStatus, message?: string) => {
    setOpenActionMenuId(null);
    try {
      const row = lawyers.find((r) => r.id === id);
      if (row?.kycProvider === 'stripe') return;
      const payload: Record<string, unknown> = { kycStatus: next, updatedAt: serverTimestamp() };
      if (message) payload.kycMessage = message;
      await updateDoc(doc(db, 'users', id), payload);
      setLawyers((prev) => prev.map((l) => l.id === id ? { ...l, kycStatus: next } : l));
      toast.success('KYC mise a jour');
    } catch (e) {
      console.error('setKyc error', e);
      toast.error('Erreur lors de la mise a jour');
    }
  };

  const setStatus = async (id: string, status: UserStatus, reason?: string) => {
    setOpenActionMenuId(null);
    try {
      const payload: Record<string, unknown> = { status, updatedAt: serverTimestamp() };
      if (status === 'suspended' && reason) {
        payload.suspendedReason = reason;
        payload.suspendedAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'users', id), payload);
      setLawyers((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
      toast.success('Statut mis a jour');
    } catch (e) {
      console.error('setStatus error', e);
      toast.error('Erreur lors de la mise a jour');
    }
  };

  // Bulk actions
  const onBulk = (action: 'approve' | 'reject' | 'suspend' | 'delete') => {
    if (selectedLawyerIds.size === 0) { toast.error('Selection vide.'); return; }
    const ids = Array.from(selectedLawyerIds);
    if (action === 'reject' || action === 'suspend' || action === 'delete') {
      setReasonOpen({ type: action === 'reject' ? 'reject' : action === 'suspend' ? 'suspend' : 'delete', ids });
      setReasonText('');
      return;
    }
    // approve
    Promise.all(ids.map((id) => updateDoc(doc(db, 'users', id), { validationStatus: 'validated', isValidated: true, updatedAt: serverTimestamp() })))
      .then(() => {
        setSelectedLawyerIds(new Set());
        setLawyers((prev) => prev.map((l) => ids.includes(l.id) ? { ...l, validationStatus: 'validated' as ValidationStatus, isValidated: true } : l));
        toast.success('Avocats approuves');
      })
      .catch(() => toast.error('Erreur lors de la mise a jour'));
  };

  const handleSortChange = (field: 'createdAt' | 'lastLoginAt') => {
    if (sortField === field) setSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDirection('desc'); }
  };

  // CSV Export
  const exportCsv = () => {
    const rows = [
      '\uFEFF' + ['ID', 'Prénom', 'Nom', 'Email', 'Pays', 'Barreau', 'Pays Barreau', 'Spécialités', 'Langues', 'Note', 'Avis', 'Statut', 'Validation', 'KYC', 'En ligne', 'Inscription', 'Dernière connexion'].join(','),
      ...filteredLawyers.map((l) => [
        l.id, l.firstName || '', l.lastName || '', l.email || '',
        l.country || '', l.barId || '', l.barCountry || '',
        (l.specialties || []).join('|'), (l.languages || []).join('|'),
        l.rating ?? '', l.reviewsCount ?? '',
        l.status, l.validationStatus, l.kycStatus,
        l.isOnline ? 'Oui' : 'Non',
        formatDateFull(l.createdAt), l.lastLoginAt.getTime() > 0 ? formatDateFull(l.lastLoginAt) : '',
      ].join(',')),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `avocats_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // --- Filters ---
  const filteredLawyers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return lawyers.filter((l) => {
      if (term.length > 0
        && !l.firstName?.toLowerCase().includes(term)
        && !l.lastName?.toLowerCase().includes(term)
        && !l.email?.toLowerCase().includes(term)
        && !l.id.toLowerCase().includes(term)
        && !(l.barId || '').toLowerCase().includes(term)
      ) return false;
      if (advancedFilters.status !== 'all' && l.status !== advancedFilters.status) return false;
      if (advancedFilters.emailVerified !== 'all' && ((advancedFilters.emailVerified === 'verified') !== l.emailVerified)) return false;
      if (advancedFilters.validation === 'validated' && !l.isValidated) return false;
      if (advancedFilters.validation === 'pending' && l.validationStatus !== 'pending') return false;
      if (advancedFilters.validation === 'rejected' && l.validationStatus !== 'rejected') return false;
      if (advancedFilters.kyc !== 'all' && l.kycStatus !== advancedFilters.kyc) return false;
      if (advancedFilters.speciality && !(l.specialties || []).join(' ').toLowerCase().includes(advancedFilters.speciality.toLowerCase())) return false;
      if (advancedFilters.language !== 'all' && !(l.languages || []).includes(advancedFilters.language)) return false;
      if (advancedFilters.barId && !(l.barId || '').toLowerCase().includes(advancedFilters.barId.toLowerCase())) return false;
      return true;
    });
  }, [lawyers, searchTerm, advancedFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.status !== 'all') count++;
    if (advancedFilters.emailVerified !== 'all') count++;
    if (advancedFilters.validation !== 'all') count++;
    if (advancedFilters.kyc !== 'all') count++;
    if (advancedFilters.speciality) count++;
    if (advancedFilters.language !== 'all') count++;
    if (advancedFilters.barId) count++;
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

  if (loading && lawyers.length === 0) {
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
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Avocats</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filteredLawyers.length} résultat{filteredLawyers.length > 1 ? 's' : ''}</p>
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
              placeholder="Rechercher par nom, email, ID ou barreau..."
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
              <option value="createdAt-desc">Plus récents</option>
              <option value="createdAt-asc">Plus anciens</option>
              <option value="lastLoginAt-desc">Connexion recente</option>
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
              <h3 className="text-sm font-semibold text-gray-700">Filtres avancés</h3>
              <button onClick={() => setAdvancedFilters({ status: 'all', emailVerified: 'all', validation: 'all', kyc: 'all', speciality: '', language: 'all', barId: '' })}
                className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1">
                <RefreshCw size={12} /> Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
                <select value={advancedFilters.status} onChange={(e) => setAdvancedFilters((p) => ({ ...p, status: e.target.value as any }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option value="all">Tous</option>
                  <option value="active">Actif</option>
                  <option value="suspended">Suspendu</option>
                  <option value="blocked">Bloque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <select value={advancedFilters.emailVerified} onChange={(e) => setAdvancedFilters((p) => ({ ...p, emailVerified: e.target.value as any }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option value="all">Tous</option>
                  <option value="verified">Verifie</option>
                  <option value="unverified">Non vérifié</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Validation</label>
                <select value={advancedFilters.validation} onChange={(e) => setAdvancedFilters((p) => ({ ...p, validation: e.target.value as any }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option value="all">Tous</option>
                  <option value="validated">Valide</option>
                  <option value="pending">En attente</option>
                  <option value="rejected">Rejete</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">KYC</label>
                <select value={advancedFilters.kyc} onChange={(e) => setAdvancedFilters((p) => ({ ...p, kyc: e.target.value as any }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option value="all">Tous</option>
                  <option value="pending">En attente</option>
                  <option value="verified">Verifie</option>
                  <option value="rejected">Rejete</option>
                  <option value="requested">Demande</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Spécialité</label>
                <input type="text" value={advancedFilters.speciality} onChange={(e) => setAdvancedFilters((p) => ({ ...p, speciality: e.target.value }))}
                  placeholder="droit fiscal..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Langue</label>
                <select value={advancedFilters.language} onChange={(e) => setAdvancedFilters((p) => ({ ...p, language: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option value="all">Toutes</option>
                  {availableLanguages.map((l) => <option key={l} value={l}>{getLanguageName(l, 'fr') || l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Barreau</label>
                <input type="text" value={advancedFilters.barId} onChange={(e) => setAdvancedFilters((p) => ({ ...p, barId: e.target.value }))}
                  placeholder="N. barreau"
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500 mr-1">Actifs :</span>
                {advancedFilters.status !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {advancedFilters.status === 'active' ? 'Actif' : advancedFilters.status === 'suspended' ? 'Suspendu' : 'Bloque'}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, status: 'all' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.emailVerified !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    Email {advancedFilters.emailVerified === 'verified' ? 'vérifié' : 'non vérifié'}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, emailVerified: 'all' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.validation !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {advancedFilters.validation === 'validated' ? 'Valide' : advancedFilters.validation === 'pending' ? 'En attente' : 'Rejete'}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, validation: 'all' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.kyc !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    KYC: {advancedFilters.kyc}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, kyc: 'all' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.speciality && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {advancedFilters.speciality}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, speciality: '' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.language !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    {getLanguageName(advancedFilters.language, 'fr') || advancedFilters.language}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, language: 'all' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
                {advancedFilters.barId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700">
                    Barreau: {advancedFilters.barId}
                    <button onClick={() => setAdvancedFilters((p) => ({ ...p, barId: '' }))} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== BULK ACTIONS BAR ===== */}
        {selectedLawyerIds.size > 0 && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-red-800">
              {selectedLawyerIds.size} sélectionné{selectedLawyerIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedLawyerIds(new Set())} className="text-sm text-red-600 hover:text-red-800 font-medium">
                Désélectionner
              </button>
              <button onClick={() => onBulk('approve')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                Approuver
              </button>
              <button onClick={() => onBulk('reject')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                Rejeter
              </button>
              <button onClick={() => onBulk('suspend')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                Suspendre
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
                    <input type="checkbox" checked={filteredLawyers.length > 0 && selectedLawyerIds.size === filteredLawyers.length}
                      onChange={toggleSelectAll} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Avocat</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Barreau</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Pays</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSortChange('createdAt')}>
                    <span className="inline-flex items-center gap-1">Inscription <SortIcon field="createdAt" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 hidden lg:table-cell" onClick={() => handleSortChange('lastLoginAt')}>
                    <span className="inline-flex items-center gap-1">Dernière connexion <SortIcon field="lastLoginAt" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Validation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">KYC</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={10} className="py-16 text-center"><LoadingSpinner text={adminT.loading} /></td></tr>
                ) : filteredLawyers.length > 0 ? (
                  filteredLawyers.map((l) => (
                    <tr key={l.id} className={`group transition-colors hover:bg-gray-50/80 ${selectedLawyerIds.has(l.id) ? 'bg-red-50/50' : ''}`}>
                      {/* Checkbox */}
                      <td className="pl-4 pr-2 py-3">
                        <input type="checkbox" checked={selectedLawyerIds.has(l.id)} onChange={() => toggleSelectLawyer(l.id)}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                      </td>

                      {/* Lawyer (avatar + name + email) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="relative flex-shrink-0">
                            <img
                              src={l.photoURL || l.profilePhoto || '/default-avatar.png'}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                            />
                            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${l.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => { setSelectedLawyer(l); setShowLawyerModal(true); }}
                              className="text-sm font-medium text-gray-900 hover:text-red-600 transition-colors truncate block max-w-[180px]"
                              title={`${l.firstName || ''} ${l.lastName || ''}`}
                            >
                              {l.firstName || ''} {l.lastName || ''}
                            </button>
                            <p className="text-xs text-gray-500 truncate max-w-[180px]">{l.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Barreau */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-sm text-gray-600">
                          {l.barId ? (
                            <div>
                              <span className="font-medium">{l.barId}</span>
                              {l.barCountry && (
                                <span className="text-gray-400 ml-1">{getCountryFlag(l.barCountry)} {getCountryName(l.barCountry, 'fr') || l.barCountry}</span>
                              )}
                            </div>
                          ) : '\u2014'}
                        </div>
                      </td>

                      {/* Country */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-gray-600">
                          {l.country ? `${getCountryFlag(l.country)} ${getCountryName(l.country, 'fr') || l.country}` : '\u2014'}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600" title={formatDateFull(l.createdAt)}>{formatDateShort(l.createdAt)}</span>
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-gray-500" title={l.lastLoginAt.getTime() > 0 ? formatDateFull(l.lastLoginAt) : 'Jamais connecte'}>
                          {timeAgo(l.lastLoginAt)}
                        </span>
                      </td>

                      {/* Status badges */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {l.isBanned && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">BANNI</span>
                          )}
                          {l.status === 'suspended' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700">SUSPENDU</span>
                          )}
                          {l.isFeatured && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">VEDETTE</span>
                          )}
                          {!l.isBanned && l.status !== 'suspended' && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${l.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                              {l.isOnline ? 'En ligne' : 'Hors ligne'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Validation */}
                      <td className="px-4 py-3">
                        {l.validationStatus === 'rejected' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">Rejete</span>
                        ) : l.isValidated ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">Valide</span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700">En attente</span>
                        )}
                      </td>

                      {/* KYC */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {l.kycStatus === 'verified' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">Verifie</span>
                        ) : l.kycStatus === 'rejected' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">Rejete</span>
                        ) : l.kycStatus === 'requested' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">Demande</span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700">En attente</span>
                        )}
                      </td>

                      {/* Actions dropdown */}
                      <td className="px-3 py-3">
                        <div className="relative" ref={openActionMenuId === l.id ? actionMenuRef : undefined}>
                          <button
                            onClick={() => setOpenActionMenuId(openActionMenuId === l.id ? null : l.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {openActionMenuId === l.id && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-1">
                              <button onClick={() => handleViewDashboard(l)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <ExternalLink size={14} className="text-cyan-600" /> Voir le dashboard
                              </button>
                              <button onClick={() => handleEditLawyer(l)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Edit3 size={14} className="text-gray-500" /> Modifier le profil
                              </button>
                              <button onClick={() => { setTranslationOpen({ open: true, lawyerId: l.id }); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Languages size={14} className="text-purple-500" /> Traductions
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              <button onClick={() => void handleToggleOnlineStatus(l.id, l.isOnline)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                {l.isOnline ? <EyeOff size={14} className="text-gray-500" /> : <Eye size={14} className="text-emerald-600" />}
                                {l.isOnline ? 'Mettre hors ligne' : 'Mettre en ligne'}
                              </button>
                              <button onClick={() => void handleToggleVisibility(l.id, l.isVisible)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <MapPin size={14} className="text-gray-500" />
                                {l.isVisible ? 'Masquer carte' : 'Montrer carte'}
                              </button>
                              <button onClick={() => void handleToggleFeatured(l.id, l.isFeatured)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Shield size={14} className="text-amber-500" />
                                {l.isFeatured ? 'Retirer vedette' : 'Mettre en vedette'}
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              {/* Validation actions */}
                              {!l.isValidated && (
                                <button onClick={() => setValidation(l.id, 'validated')}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors">
                                  <Scale size={14} /> Valider
                                </button>
                              )}
                              {l.validationStatus !== 'rejected' && (
                                <button onClick={() => { setReasonOpen({ type: 'reject', ids: [l.id] }); setReasonText(''); setOpenActionMenuId(null); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 transition-colors">
                                  <Scale size={14} /> Rejeter validation
                                </button>
                              )}
                              {/* KYC actions */}
                              <button onClick={() => setKyc(l.id, 'verified')}
                                disabled={l.kycProvider === 'stripe'}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                                <Shield size={14} className="text-emerald-500" /> KYC Valide
                              </button>
                              <button onClick={() => { setReasonOpen({ type: 'kycRequest', ids: [l.id] }); setReasonText(''); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Shield size={14} className="text-blue-500" /> Demander KYC
                              </button>
                              {/* Status */}
                              {l.status !== 'active' && (
                                <button onClick={() => setStatus(l.id, 'active')}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors">
                                  <UserPlus size={14} /> Activer
                                </button>
                              )}
                              {l.status === 'active' && (
                                <button onClick={() => { setReasonOpen({ type: 'suspend', ids: [l.id] }); setReasonText(''); setOpenActionMenuId(null); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-yellow-700 hover:bg-yellow-50 transition-colors">
                                  <Ban size={14} /> Suspendre
                                </button>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              {l.isBanned ? (
                                <button onClick={() => void handleUnbanLawyer(l.id)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors">
                                  <UserPlus size={14} /> Reactiver le compte
                                </button>
                              ) : (
                                <button onClick={() => handleBanLawyer(l)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 transition-colors">
                                  <Ban size={14} /> Bannir
                                </button>
                              )}
                              <button onClick={() => handleDeleteLawyer(l)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors">
                                <Trash2 size={14} /> Supprimer
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              <button onClick={async () => { await copyToClipboard(l.email); toast.success('Email copie'); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <ClipboardCopy size={14} className="text-gray-400" /> Copier email
                              </button>
                              <button onClick={async () => { await copyToClipboard(l.id); toast.success('ID copie'); setOpenActionMenuId(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <ClipboardCopy size={14} className="text-gray-400" /> Copier ID
                              </button>
                              <a href={`/admin/validation-avocats?lawyerId=${l.id}`} onClick={() => setOpenActionMenuId(null)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <LinkIcon size={14} className="text-gray-400" /> Page validation
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={10} className="py-16 text-center text-gray-400 text-sm">Aucun avocat trouve</td></tr>
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
      {/* MODAL: LAWYER DETAIL                                               */}
      {/* ================================================================== */}
      <Modal isOpen={showLawyerModal} onClose={() => setShowLawyerModal(false)} title="Detail avocat" size="large">
        {selectedLawyer && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={selectedLawyer.photoURL || selectedLawyer.profilePhoto || '/default-avatar.png'} alt=""
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }} />
                <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${selectedLawyer.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedLawyer.firstName} {selectedLawyer.lastName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-purple-50 border-purple-200 text-purple-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    Avocat
                  </span>
                  {selectedLawyer.isBanned && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-xs font-semibold">BANNI</span>}
                  {selectedLawyer.isFeatured && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-xs font-semibold">VEDETTE</span>}
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
                    <span className="text-sm text-gray-900 break-all">{selectedLawyer.email || '\u2014'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900">{selectedLawyer.phoneCountryCode} {selectedLawyer.phone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Globe size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900">
                      {selectedLawyer.country
                        ? `${getCountryFlag(selectedLawyer.country)} ${getCountryName(selectedLawyer.country, 'fr') || selectedLawyer.country}`
                        : 'Non renseigné'}
                    </span>
                  </div>
                  {selectedLawyer.languages && selectedLawyer.languages.length > 0 && (
                    <div className="flex items-center gap-2.5">
                      <Languages size={15} className="text-gray-400 flex-shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {selectedLawyer.languages.map((lang) => (
                          <span key={lang} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{getLanguageName(lang, 'fr') || lang}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dates & Activity */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Activite</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Calendar size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Inscription</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatDateShort(selectedLawyer.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Clock size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Dernière connexion</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900" title={selectedLawyer.lastLoginAt.getTime() > 0 ? formatDateFull(selectedLawyer.lastLoginAt) : ''}>
                      {selectedLawyer.lastLoginAt.getTime() > 0 ? timeAgo(selectedLawyer.lastLoginAt) : 'Jamais'}
                    </span>
                  </div>
                  {selectedLawyer.rating !== undefined && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Star size={15} className="text-gray-400" />
                        <span className="text-sm text-gray-600">Note</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{selectedLawyer.rating.toFixed(1)} ({selectedLawyer.reviewsCount ?? 0} avis)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bar & Specialties */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Barreau & Spécialités</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-500">N. Barreau</span>
                  <p className="text-sm font-medium text-gray-900">{selectedLawyer.barId || '\u2014'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Pays du Barreau</span>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedLawyer.barCountry ? `${getCountryFlag(selectedLawyer.barCountry)} ${getCountryName(selectedLawyer.barCountry, 'fr') || selectedLawyer.barCountry}` : '\u2014'}
                  </p>
                </div>
              </div>
              {selectedLawyer.specialties && selectedLawyer.specialties.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500">Spécialités</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedLawyer.specialties.map((spec) => (
                      <span key={spec} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{spec}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Account status */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Compte</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Email vérifié', value: selectedLawyer.emailVerified, yes: 'Oui', no: 'Non' },
                  { label: 'Validation', value: selectedLawyer.isValidated, yes: 'Valide', no: selectedLawyer.validationStatus === 'rejected' ? 'Rejete' : 'En attente' },
                  { label: 'KYC', value: selectedLawyer.kycStatus === 'verified', yes: 'Verifie', no: selectedLawyer.kycStatus },
                  { label: 'En ligne', value: selectedLawyer.isOnline, yes: 'En ligne', no: 'Hors ligne' },
                  { label: 'Visible carte', value: selectedLawyer.isVisibleOnMap, yes: 'Oui', no: 'Non' },
                  { label: 'Vedette', value: selectedLawyer.isFeatured, yes: 'Oui', no: 'Non' },
                ].map(({ label, value, yes, no }) => (
                  <div key={label} className="flex flex-col items-center bg-white rounded-lg p-2.5 border border-gray-100">
                    <span className="text-[10px] font-medium text-gray-400 uppercase">{label}</span>
                    <span className={`mt-1 text-xs font-semibold ${value ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {value ? yes : no}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedLawyer.isBanned && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Raison du bannissement</h4>
                <p className="text-sm text-red-700">{selectedLawyer.banReason || 'Aucune raison spécifiée'}</p>
              </div>
            )}

            {/* ID */}
            <div className="text-xs text-gray-400 font-mono select-all">ID: {selectedLawyer.id}</div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button onClick={() => setShowLawyerModal(false)} variant="outline" size="small">Fermer</Button>
              <Button size="small" onClick={() => { setShowLawyerModal(false); handleViewDashboard(selectedLawyer); }}
                className="bg-cyan-600 hover:bg-cyan-700">
                <ExternalLink size={14} className="mr-1.5" /> Dashboard
              </Button>
              <Button size="small" onClick={() => { setShowLawyerModal(false); handleEditLawyer(selectedLawyer); }}
                className="bg-gray-900 hover:bg-gray-800">
                <Edit3 size={14} className="mr-1.5" /> Modifier
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: DELETE                                                      */}
      {/* ================================================================== */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Supprimer l'avocat" size="small">
        {selectedLawyer && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Action irréversible</h3>
                  <p className="mt-1 text-sm text-red-700">
                    <strong>{selectedLawyer.firstName} {selectedLawyer.lastName}</strong> (Avocat) sera supprimé définitivement avec toutes ses données.
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
              <Button onClick={confirmDeleteLawyer} variant="danger" size="small" loading={isActionLoading} disabled={deleteConfirmText !== 'SUPPRIMER'}>
                <Trash2 size={14} className="mr-1.5" /> Supprimer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: BULK DELETE                                                 */}
      {/* ================================================================== */}
      <Modal isOpen={showBulkDeleteModal} onClose={() => setShowBulkDeleteModal(false)} title={`Supprimer ${selectedLawyerIds.size} avocat${selectedLawyerIds.size > 1 ? 's' : ''}`} size="small">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Suppression en lot irréversible</h3>
                <p className="mt-1 text-sm text-red-700">{selectedLawyerIds.size} avocat{selectedLawyerIds.size > 1 ? 's' : ''} seront supprimes.</p>
                <div className="mt-2 max-h-24 overflow-y-auto space-y-0.5">
                  {Array.from(selectedLawyerIds).map((id) => {
                    const l = lawyers.find((lawyer) => lawyer.id === id);
                    return <div key={id} className="text-xs text-red-600">{l ? `${l.firstName || ''} ${l.lastName || ''}` : id}</div>;
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
              <Trash2 size={14} className="mr-1.5" /> Supprimer {selectedLawyerIds.size}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: BAN                                                         */}
      {/* ================================================================== */}
      <Modal isOpen={showBanModal} onClose={() => setShowBanModal(false)} title="Bannir l'avocat" size="small">
        {selectedLawyer && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex gap-3">
                <Ban className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-orange-800">Bannissement</h3>
                  <p className="mt-1 text-sm text-orange-700">
                    <strong>{selectedLawyer.firstName} {selectedLawyer.lastName}</strong> ne pourra plus se connecter.
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
              <Button onClick={confirmBanLawyer} size="small" loading={isActionLoading} className="bg-orange-600 hover:bg-orange-700">
                <Ban size={14} className="mr-1.5" /> Bannir
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: REASON (reject/suspend/delete/kycRequest)                   */}
      {/* ================================================================== */}
      <Modal
        isOpen={!!reasonOpen}
        onClose={() => setReasonOpen(null)}
        title={
          reasonOpen?.type === 'suspend' ? 'Suspendre'
            : reasonOpen?.type === 'delete' ? 'Supprimer'
            : reasonOpen?.type === 'reject' ? 'Rejeter la validation'
            : 'Demander KYC'
        }
        size="small"
      >
        <div className="space-y-4">
          {reasonOpen?.type === 'delete' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Action irréversible</h3>
                  <p className="mt-1 text-sm text-red-700">{reasonOpen.ids.length} avocat(s) seront supprimés définitivement.</p>
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {reasonOpen?.type === 'kycRequest' ? 'Message (optionnel)' : 'Raison'}
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none"
              rows={3}
              value={reasonText}
              placeholder={reasonOpen?.type === 'kycRequest' ? 'Message optionnel...' : 'Raison...'}
              onChange={(e) => setReasonText(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="small" onClick={() => setReasonOpen(null)}>Annuler</Button>
            <Button
              variant={reasonOpen?.type === 'delete' ? 'danger' : 'primary'}
              size="small"
              onClick={async () => {
                const ids = reasonOpen?.ids || [];
                const msg = reasonText.trim();
                if (reasonOpen?.type !== 'kycRequest' && msg.length < 3) {
                  toast.error('Raison trop courte (min 3 caracteres)');
                  return;
                }

                try {
                  const batch = writeBatch(db);
                  if (reasonOpen?.type === 'suspend') {
                    ids.forEach((id) => {
                      batch.update(doc(db, 'users', id), {
                        status: 'suspended', suspendedReason: msg,
                        suspendedAt: serverTimestamp(), updatedAt: serverTimestamp(),
                      });
                    });
                  } else if (reasonOpen?.type === 'delete') {
                    ids.forEach((id) => { batch.delete(doc(db, 'users', id)); });
                  } else if (reasonOpen?.type === 'reject') {
                    ids.forEach((id) => {
                      batch.update(doc(db, 'users', id), {
                        validationStatus: 'rejected', isValidated: false,
                        validationReason: msg, updatedAt: serverTimestamp(),
                      });
                    });
                  } else if (reasonOpen?.type === 'kycRequest') {
                    ids.forEach((id) => {
                      batch.update(doc(db, 'users', id), {
                        kycStatus: 'requested', kycMessage: msg || null,
                        updatedAt: serverTimestamp(),
                      });
                    });
                  }
                  await batch.commit();

                  // Update local state
                  if (reasonOpen?.type === 'delete') {
                    setLawyers((prev) => prev.filter((l) => !ids.includes(l.id)));
                  } else if (reasonOpen?.type === 'suspend') {
                    setLawyers((prev) => prev.map((l) => ids.includes(l.id) ? { ...l, status: 'suspended' as UserStatus } : l));
                  } else if (reasonOpen?.type === 'reject') {
                    setLawyers((prev) => prev.map((l) => ids.includes(l.id) ? { ...l, validationStatus: 'rejected' as ValidationStatus, isValidated: false } : l));
                  } else if (reasonOpen?.type === 'kycRequest') {
                    setLawyers((prev) => prev.map((l) => ids.includes(l.id) ? { ...l, kycStatus: 'requested' as KycStatus } : l));
                  }

                  setReasonOpen(null);
                  setReasonText('');
                  setSelectedLawyerIds(new Set());
                  toast.success('Mise a jour effectuee');
                } catch (e) {
                  console.error('Reason action error', e);
                  toast.error('Erreur lors de la mise a jour');
                }
              }}
            >
              Confirmer
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: EDIT PROFILE                                                */}
      {/* ================================================================== */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Modifier \u2014 ${editTargetLawyer?.firstName || ''} ${editTargetLawyer?.lastName || ''}`}>
        {editTargetLawyer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Prénom</label>
                <input type="text" value={editFields.firstName} onChange={(e) => setEditFields((p) => ({ ...p, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nom</label>
                <input type="text" value={editFields.lastName} onChange={(e) => setEditFields((p) => ({ ...p, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="email" value={editFields.email} onChange={(e) => setEditFields((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone</label>
                <input type="tel" value={editFields.phone} onChange={(e) => setEditFields((p) => ({ ...p, phone: e.target.value }))} placeholder="+33 6 12 34 56 78"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Indicatif</label>
                <input type="text" value={editFields.phoneCountryCode} onChange={(e) => setEditFields((p) => ({ ...p, phoneCountryCode: e.target.value }))} placeholder="+33"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pays</label>
                <input type="text" value={editFields.country} onChange={(e) => setEditFields((p) => ({ ...p, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ville</label>
                <input type="text" value={editFields.city} onChange={(e) => setEditFields((p) => ({ ...p, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">N. Barreau</label>
                <input type="text" value={editFields.barId} onChange={(e) => setEditFields((p) => ({ ...p, barId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pays du Barreau</label>
                <input type="text" value={editFields.barCountry} onChange={(e) => setEditFields((p) => ({ ...p, barCountry: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Langues (séparées par virgule)</label>
              <input type="text" value={editFields.languages} onChange={(e) => setEditFields((p) => ({ ...p, languages: e.target.value }))} placeholder="fr, en, es"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Spécialités (séparées par virgule)</label>
              <input type="text" value={editFields.specialties} onChange={(e) => setEditFields((p) => ({ ...p, specialties: e.target.value }))} placeholder="droit fiscal, droit penal"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes admin (internes)</label>
              <textarea value={editFields.adminNotes} onChange={(e) => setEditFields((p) => ({ ...p, adminNotes: e.target.value }))}
                rows={3} placeholder="Notes visibles uniquement par les admins..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-y" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button onClick={() => setShowEditModal(false)} variant="outline" size="small" disabled={editLoading}>Annuler</Button>
              <Button onClick={handleSaveProfile} size="small" loading={editLoading} className="bg-gray-900 hover:bg-gray-800">
                <Save size={14} className="mr-1.5" /> Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Translation modal */}
      <TranslationModal
        isOpen={translationOpen.open}
        onClose={() => setTranslationOpen({ open: false, lawyerId: null })}
        providerId={translationOpen.lawyerId}
        t={(k: string) => k}
      />
    </AdminLayout>
  );
};

export default AdminLawyers;
