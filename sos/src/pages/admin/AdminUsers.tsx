import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
  getDoc,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db, functions, functionsAffiliate } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminErrorState from '../../components/admin/AdminErrorState';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { logError } from '../../utils/logging';
import { getCountryName, getCountryFlag } from '../../utils/formatters';

// ============================================================================
// TYPES
// ============================================================================

type Role = 'client' | 'lawyer' | 'expat' | 'admin' | 'chatter' | 'influencer' | 'blogger' | 'groupAdmin' | 'partner';
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

type AdvancedFilters = {
  onlineStatus: 'all' | 'online' | 'offline';
  bannedStatus: 'all' | 'banned' | 'active';
  emailVerified: 'all' | 'verified' | 'unverified';
  approvalStatus: 'all' | 'approved' | 'pending' | 'rejected';
  visibilityStatus: 'all' | 'visible' | 'hidden';
  language: string;
};

type MinimalCurrentUser = { id: string; role: Role };

// ============================================================================
// CONSTANTS
// ============================================================================

const USERS_PER_PAGE = 20;

const ROLE_CONFIG: Record<Role, { label: string; color: string; dot: string; bg: string }> = {
  client:     { label: 'Client',       color: 'text-blue-700',    dot: 'bg-blue-500',    bg: 'bg-blue-50 border-blue-200' },
  lawyer:     { label: 'Avocat',       color: 'text-purple-700',  dot: 'bg-purple-500',  bg: 'bg-purple-50 border-purple-200' },
  expat:      { label: 'Expert',       color: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
  admin:      { label: 'Admin',        color: 'text-amber-700',   dot: 'bg-amber-500',   bg: 'bg-amber-50 border-amber-200' },
  chatter:    { label: 'Chatter',      color: 'text-pink-700',    dot: 'bg-pink-500',    bg: 'bg-pink-50 border-pink-200' },
  influencer: { label: 'Influenceur',  color: 'text-orange-700',  dot: 'bg-orange-500',  bg: 'bg-orange-50 border-orange-200' },
  blogger:    { label: 'Blogueur',     color: 'text-teal-700',    dot: 'bg-teal-500',    bg: 'bg-teal-50 border-teal-200' },
  groupAdmin: { label: 'Group Admin',  color: 'text-indigo-700',  dot: 'bg-indigo-500',  bg: 'bg-indigo-50 border-indigo-200' },
  partner:    { label: 'Partenaire',   color: 'text-cyan-700',    dot: 'bg-cyan-500',    bg: 'bg-cyan-50 border-cyan-200' },
};

const AFFILIATE_CLICK_COLLECTIONS: Partial<Record<Role, { collection: string; field: string }>> = {
  chatter:    { collection: 'chatter_affiliate_clicks',    field: 'chatterId' },
  influencer: { collection: 'influencer_affiliate_clicks', field: 'influencerId' },
  blogger:    { collection: 'blogger_affiliate_clicks',    field: 'bloggerId' },
  groupAdmin: { collection: 'group_admin_affiliate_clicks', field: 'groupAdminId' },
  partner:    { collection: 'partner_affiliate_clicks',    field: 'partnerId' },
  client:     { collection: 'affiliate_clicks',            field: 'referrerId' },
  lawyer:     { collection: 'affiliate_clicks',            field: 'referrerId' },
  expat:      { collection: 'affiliate_clicks',            field: 'referrerId' },
};

const PROVIDER_ROLES: Role[] = ['lawyer', 'expat', 'chatter', 'influencer', 'blogger'];

// ============================================================================
// HELPERS
// ============================================================================

/** Relative time: "il y a 2h", "il y a 3j", etc. */
function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 0 || date.getTime() === 0) return '—';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "A l'instant";
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
  if (date.getTime() === 0) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function formatDateShort(date: Date): string {
  if (date.getTime() === 0) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(date);
}

// ============================================================================
// COMPONENT
// ============================================================================

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const adminT = useAdminTranslations();
  const { user: rawCurrentUser } = useAuth() as { user?: MinimalCurrentUser | null };
  const currentUser: MinimalCurrentUser | null | undefined = rawCurrentUser;

  // --- State ---
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'all' | Role>(() => {
    const p = location.pathname;
    if (p.includes('/users/chatters')) return 'chatter';
    if (p.includes('/users/influencers')) return 'influencer';
    if (p.includes('/users/bloggers')) return 'blogger';
    if (p.includes('/users/group-admins')) return 'groupAdmin';
    return 'all';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortField, setSortField] = useState<'createdAt' | 'lastLoginAt' | 'fullName'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [countries, setCountries] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    onlineStatus: 'all', bannedStatus: 'all', emailVerified: 'all',
    approvalStatus: 'all', visibilityStatus: 'all', language: 'all',
  });
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Edit profile
  interface EditProfileFields {
    firstName: string; lastName: string; email: string; phone: string;
    phoneCountryCode: string; country: string; currentCountry: string;
    languages: string; adminNotes: string;
  }
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFields, setEditFields] = useState<EditProfileFields>({
    firstName: '', lastName: '', email: '', phone: '', phoneCountryCode: '',
    country: '', currentCountry: '', languages: '', adminNotes: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editTargetUser, setEditTargetUser] = useState<AdminUser | null>(null);

  // Affiliate click
  const [lastAffiliateClick, setLastAffiliateClick] = useState<Date | null>(null);
  const [affiliateClickLoading, setAffiliateClickLoading] = useState(false);

  // Delete
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0 });

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

  // --- Sync role from URL ---
  useEffect(() => {
    const p = location.pathname;
    if (p.includes('/users/chatters')) setSelectedRole('chatter');
    else if (p.includes('/users/influencers')) setSelectedRole('influencer');
    else if (p.includes('/users/bloggers')) setSelectedRole('blogger');
    else if (p.includes('/users/group-admins')) setSelectedRole('groupAdmin');
  }, [location.pathname]);

  // --- Fetch users ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') { navigate('/admin/login'); return; }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const qc: QueryConstraint[] = [];
        if (selectedRole !== 'all') qc.push(where('role', '==', selectedRole));
        if (selectedCountry !== 'all') qc.push(where('country', '==', selectedCountry));
        qc.push(orderBy(sortField, sortDirection));
        qc.push(limit(page * USERS_PER_PAGE));

        const snap = await getDocs(query(collection(db, 'users'), ...qc));
        const data: AdminUser[] = snap.docs.map((d) => {
          const raw = d.data() as FirestoreUser;
          return {
            id: d.id, ...raw,
            isBanned: Boolean(raw.isBanned),
            languages: raw.languages || raw.spokenLanguages || [],
            createdAt: raw.createdAt?.toDate() || new Date(0),
            lastLoginAt: raw.lastLoginAt?.toDate() || new Date(0),
            updatedAt: raw.updatedAt?.toDate() || new Date(0),
          };
        });

        const uniqueCountries = Array.from(new Set(data.map((u) => u.country ?? u.currentCountry ?? '')))
          .filter(Boolean).sort((a, b) => a.localeCompare(b));
        const allLangs = new Set<string>();
        data.forEach((u) => (u.languages || []).forEach((l) => allLangs.add(l)));
        setAvailableLanguages(Array.from(allLangs).sort());
        setUsers(data);
        setCountries(uniqueCountries);
        setHasMore(snap.docs.length === page * USERS_PER_PAGE);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Error loading users:', err);
        logError({ origin: 'frontend', error: `Error loading users: ${msg}`, context: { component: 'AdminUsers' } });
        setError('Erreur lors du chargement. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    void fetchUsers();
  }, [currentUser, navigate, selectedRole, selectedCountry, sortField, sortDirection, page]);

  // --- Handlers ---
  const handleEditUser = (user: AdminUser) => {
    setEditTargetUser(user);
    setEditFields({
      firstName: user.firstName || '', lastName: user.lastName || '',
      email: user.email || '', phone: user.phone || '',
      phoneCountryCode: user.phoneCountryCode || '',
      country: user.country || '', currentCountry: user.currentCountry || '',
      languages: (user.languages || user.spokenLanguages || []).join(', '),
      adminNotes: (user as any).adminNotes || '',
    });
    setShowEditModal(true);
    setOpenActionMenuId(null);
  };

  const handleSaveProfile = async () => {
    if (!editTargetUser) return;
    setEditLoading(true);
    try {
      const role = editTargetUser.role;
      if (['client', 'lawyer', 'expat'].includes(role)) {
        const fn = httpsCallable(functions, 'adminUpdateUserProfile');
        const updates: Record<string, any> = { userId: editTargetUser.id, role };
        if (editFields.firstName !== (editTargetUser.firstName || '')) updates.firstName = editFields.firstName;
        if (editFields.lastName !== (editTargetUser.lastName || '')) updates.lastName = editFields.lastName;
        if (editFields.email !== (editTargetUser.email || '')) updates.email = editFields.email;
        if (editFields.phone !== (editTargetUser.phone || '')) updates.phone = editFields.phone;
        if (editFields.phoneCountryCode !== (editTargetUser.phoneCountryCode || '')) updates.phoneCountryCode = editFields.phoneCountryCode;
        if (editFields.country !== (editTargetUser.country || '')) updates.country = editFields.country;
        if (editFields.currentCountry !== (editTargetUser.currentCountry || '')) updates.currentCountry = editFields.currentCountry;
        const newLangs = editFields.languages.split(',').map(s => s.trim()).filter(Boolean);
        const oldLangs = editTargetUser.languages || editTargetUser.spokenLanguages || [];
        if (JSON.stringify(newLangs) !== JSON.stringify(oldLangs)) updates.languages = newLangs;
        if (editFields.adminNotes !== ((editTargetUser as any).adminNotes || '')) updates.adminNotes = editFields.adminNotes;
        if (Object.keys(updates).length <= 2) { toast.error('Aucune modification'); setEditLoading(false); return; }
        await fn(updates);
      } else {
        const userRef = doc(db, 'users', editTargetUser.id);
        const updates: Record<string, any> = {};
        if (editFields.firstName !== (editTargetUser.firstName || '')) updates.firstName = editFields.firstName;
        if (editFields.lastName !== (editTargetUser.lastName || '')) updates.lastName = editFields.lastName;
        if (editFields.email !== (editTargetUser.email || '')) updates.email = editFields.email;
        if (editFields.phone !== (editTargetUser.phone || '')) updates.phone = editFields.phone;
        if (editFields.country !== (editTargetUser.country || '')) updates.country = editFields.country;
        if (editFields.adminNotes !== ((editTargetUser as any).adminNotes || '')) updates.adminNotes = editFields.adminNotes;
        if (Object.keys(updates).length === 0) { toast.error('Aucune modification'); setEditLoading(false); return; }
        updates.updatedAt = serverTimestamp();
        await updateDoc(userRef, updates);
      }
      toast.success('Profil mis a jour');
      setShowEditModal(false);
      setPage(1);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error(err.message || 'Erreur lors de la mise a jour');
    } finally { setEditLoading(false); }
  };

  const handleViewDashboard = (user: AdminUser) => {
    let url = '';
    switch (user.role) {
      case 'lawyer': case 'expat': case 'client': url = `/dashboard?adminView=${user.id}`; break;
      case 'chatter': url = `/chatter/tableau-de-bord?adminView=${user.id}`; break;
      case 'influencer': url = `/influencer/tableau-de-bord?adminView=${user.id}`; break;
      case 'blogger': url = `/blogger/tableau-de-bord?adminView=${user.id}`; break;
      case 'groupAdmin': url = `/group-admin/tableau-de-bord?adminView=${user.id}`; break;
      case 'partner': url = `/admin/partners/${user.id}`; break;
      default: return;
    }
    window.open(url, '_blank');
    setOpenActionMenuId(null);
  };

  const fetchLastAffiliateClick = async (user: AdminUser) => {
    setLastAffiliateClick(null);
    const config = AFFILIATE_CLICK_COLLECTIONS[user.role];
    if (!config) return;
    setAffiliateClickLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, config.collection),
        where(config.field, '==', user.id),
        orderBy('clickedAt', 'desc'),
        limit(1),
      ));
      if (!snap.empty) {
        const clickedAt = snap.docs[0].data().clickedAt;
        setLastAffiliateClick(clickedAt?.toDate?.() || null);
      }
    } catch { /* collection may not exist */ }
    finally { setAffiliateClickLoading(false); }
  };

  const handleDeleteUser = (user: AdminUser) => {
    setSelectedUser(user); setDeleteReason(''); setDeleteConfirmText(''); setShowDeleteModal(true); setOpenActionMenuId(null);
  };

  const handleBanUser = (user: AdminUser) => {
    setSelectedUser(user); setBanReason(''); setShowBanModal(true); setOpenActionMenuId(null);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;
    setIsActionLoading(true);
    try {
      const result = await httpsCallable(functions, 'adminDeleteUser')({ userId: selectedUser.id, reason: deleteReason || undefined });
      const data = result.data as { success: boolean; message: string; deletedSubDocs: number };
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setSelectedUserIds((prev) => { const n = new Set(prev); n.delete(selectedUser.id); return n; });
      setShowDeleteModal(false); setSelectedUser(null); setDeleteReason(''); setDeleteConfirmText('');
      toast.success(data.message || 'Utilisateur supprime');
    } catch (err) {
      toast.error(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
      logError({ origin: 'frontend', error: `Error deleting user: ${err instanceof Error ? err.message : String(err)}`, context: { userId: selectedUser.id } });
    } finally { setIsActionLoading(false); }
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.size === 0) return;
    setBulkDeleteReason(''); setBulkDeleteConfirmText(''); setBulkDeleteProgress({ current: 0, total: 0 }); setShowBulkDeleteModal(true);
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
    setUsers((prev) => prev.filter((u) => !deletedIds.has(u.id)));
    setSelectedUserIds(new Set()); setShowBulkDeleteModal(false); setIsActionLoading(false);
    if (errors.length > 0) toast.error(`${ids.length - errors.length}/${ids.length} supprimes.`);
    else toast.success(`${ids.length} utilisateur(s) supprimes`);
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) => { const n = new Set(prev); n.has(userId) ? n.delete(userId) : n.add(userId); return n; });
  };
  const toggleSelectAll = () => {
    setSelectedUserIds(selectedUserIds.size === filteredUsers.length ? new Set() : new Set(filteredUsers.map((u) => u.id)));
  };

  const confirmBanUser = async () => {
    if (!selectedUser) return;
    setIsActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), { isBanned: true, banReason, updatedAt: serverTimestamp() });
      if (PROVIDER_ROLES.includes(selectedUser.role)) {
        await updateDoc(doc(db, 'sos_profiles', selectedUser.id), { isBanned: true, isVisible: false, isVisibleOnMap: false, isOnline: false, updatedAt: serverTimestamp() });
      }
      setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, isBanned: true, banReason } : u));
      setShowBanModal(false); setSelectedUser(null);
      await addDoc(collection(db, 'logs'), { type: 'user_banned', userId: selectedUser.id, bannedBy: currentUser?.id ?? null, reason: banReason, timestamp: serverTimestamp() });
    } catch (err) {
      toast.error("Erreur lors du bannissement");
      logError({ origin: 'frontend', error: `Error banning user: ${err instanceof Error ? err.message : String(err)}`, context: { userId: selectedUser.id } });
    } finally { setIsActionLoading(false); }
  };

  const handleUnbanUser = async (userId: string) => {
    setIsActionLoading(true); setOpenActionMenuId(null);
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: false, banReason: '', updatedAt: serverTimestamp() });
      const userDoc = await getDoc(doc(db, 'users', userId));
      const role = (userDoc.data()?.role ?? '') as Role;
      if (PROVIDER_ROLES.includes(role)) {
        await updateDoc(doc(db, 'sos_profiles', userId), { isBanned: false, isVisible: true, isVisibleOnMap: true, updatedAt: serverTimestamp() });
      }
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isBanned: false, banReason: '' } : u));
      await addDoc(collection(db, 'logs'), { type: 'user_unbanned', userId, unbannedBy: currentUser?.id ?? null, timestamp: serverTimestamp() });
      toast.success('Utilisateur reactived');
    } catch (err) {
      toast.error("Erreur lors de la reactivation");
      logError({ origin: 'frontend', error: `Error unbanning: ${err instanceof Error ? err.message : String(err)}`, context: { userId } });
    } finally { setIsActionLoading(false); }
  };

  const handleToggleOnlineStatus = async (userId: string, isCurrentlyOnline: boolean) => {
    setIsActionLoading(true); setOpenActionMenuId(null);
    try {
      const newAvail: Availability = !isCurrentlyOnline ? 'available' : 'offline';
      await updateDoc(doc(db, 'users', userId), { isOnline: !isCurrentlyOnline, availability: newAvail, updatedAt: serverTimestamp() });
      const userDoc = await getDoc(doc(db, 'users', userId));
      const role = (userDoc.data()?.role ?? '') as Role;
      if (PROVIDER_ROLES.includes(role)) {
        await updateDoc(doc(db, 'sos_profiles', userId), { isOnline: !isCurrentlyOnline, availability: newAvail, updatedAt: serverTimestamp() });
      }
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isOnline: !isCurrentlyOnline, availability: newAvail } : u));
      await addDoc(collection(db, 'logs'), { type: !isCurrentlyOnline ? 'user_set_online' : 'user_set_offline', userId, changedBy: currentUser?.id ?? null, timestamp: serverTimestamp() });
    } catch (err) {
      toast.error('Erreur changement statut');
      logError({ origin: 'frontend', error: `Error toggling online: ${err instanceof Error ? err.message : String(err)}`, context: { userId } });
    } finally { setIsActionLoading(false); }
  };

  const handleToggleVisibility = async (userId: string, isCurrentlyVisible: boolean) => {
    setIsActionLoading(true); setOpenActionMenuId(null);
    try {
      await updateDoc(doc(db, 'sos_profiles', userId), { isVisible: !isCurrentlyVisible, isVisibleOnMap: !isCurrentlyVisible, updatedAt: serverTimestamp() });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isVisible: !isCurrentlyVisible, isVisibleOnMap: !isCurrentlyVisible } : u));
      await addDoc(collection(db, 'logs'), { type: !isCurrentlyVisible ? 'user_set_visible' : 'user_set_invisible', userId, changedBy: currentUser?.id ?? null, timestamp: serverTimestamp() });
    } catch (err) {
      toast.error('Erreur changement visibilite');
      logError({ origin: 'frontend', error: `Error toggling visibility: ${err instanceof Error ? err.message : String(err)}`, context: { userId } });
    } finally { setIsActionLoading(false); }
  };

  const handleToggleFeatured = async (userId: string, isCurrentlyFeatured: boolean) => {
    setIsActionLoading(true); setOpenActionMenuId(null);
    try {
      await updateDoc(doc(db, 'sos_profiles', userId), { featured: !isCurrentlyFeatured, updatedAt: serverTimestamp() });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, featured: !isCurrentlyFeatured } : u));
      await addDoc(collection(db, 'logs'), { type: !isCurrentlyFeatured ? 'user_set_featured' : 'user_unset_featured', userId, changedBy: currentUser?.id ?? null, timestamp: serverTimestamp() });
    } catch (err) {
      toast.error('Erreur changement mise en avant');
      logError({ origin: 'frontend', error: `Error toggling featured: ${err instanceof Error ? err.message : String(err)}`, context: { userId } });
    } finally { setIsActionLoading(false); }
  };

  const handleSortChange = (field: 'createdAt' | 'lastLoginAt' | 'fullName') => {
    if (sortField === field) setSortDirection((p) => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDirection('desc'); }
  };

  const exportCsv = () => {
    const rows = [
      '\uFEFF' + ['ID', 'Prenom', 'Nom', 'Email', 'Role', 'Pays', 'En ligne', 'Banni', 'Inscription', 'Derniere connexion'].join(','),
      ...filteredUsers.map((u) => [
        u.id, u.firstName || '', u.lastName || '', u.email || '', ROLE_CONFIG[u.role]?.label || u.role,
        u.country || u.currentCountry || '', u.isOnline ? 'Oui' : 'Non', u.isBanned ? 'Oui' : 'Non',
        formatDateFull(u.createdAt), u.lastLoginAt.getTime() > 0 ? formatDateFull(u.lastLoginAt) : '',
      ].join(',')),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // --- Filters ---
  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      if (selectedRole !== 'all' && u.role !== selectedRole) return false;
      if (term.length > 0 && !u.firstName?.toLowerCase().includes(term) && !u.lastName?.toLowerCase().includes(term) && !u.email?.toLowerCase().includes(term) && !u.id.toLowerCase().includes(term)) return false;
      if (advancedFilters.onlineStatus !== 'all' && ((advancedFilters.onlineStatus === 'online') !== !!u.isOnline)) return false;
      if (advancedFilters.bannedStatus !== 'all' && ((advancedFilters.bannedStatus === 'banned') !== u.isBanned)) return false;
      if (advancedFilters.emailVerified !== 'all' && ((advancedFilters.emailVerified === 'verified') !== !!(u.emailVerified || u.isVerifiedEmail))) return false;
      if (advancedFilters.approvalStatus === 'approved' && !u.isApproved) return false;
      if (advancedFilters.approvalStatus === 'pending' && (u.isApproved || u.validationStatus)) return false;
      if (advancedFilters.approvalStatus === 'rejected' && u.validationStatus !== 'rejected') return false;
      if (advancedFilters.visibilityStatus !== 'all' && ((advancedFilters.visibilityStatus === 'visible') !== !!u.isVisible)) return false;
      if (advancedFilters.language !== 'all' && !(u.languages || []).includes(advancedFilters.language)) return false;
      return true;
    });
  }, [users, selectedRole, searchTerm, advancedFilters]);

  const userCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length };
    for (const u of users) counts[u.role] = (counts[u.role] || 0) + 1;
    return counts;
  }, [users]);

  const activeFilterCount = useMemo(() => Object.values(advancedFilters).filter((v) => v !== 'all').length, [advancedFilters]);

  // --- Sort icon helper ---
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400" />;
    return sortDirection === 'desc' ? <ChevronDown size={14} className="text-red-600" /> : <ChevronUp size={14} className="text-red-600" />;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && users.length === 0) {
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
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Utilisateurs</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filteredUsers.length} resultat{filteredUsers.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download size={15} />
              Export
            </button>
          </div>
        </div>

        {error && <AdminErrorState error={error} onRetry={() => setPage(1)} />}

        {/* ===== ROLE PILLS ===== */}
        <div className="flex flex-wrap gap-1.5">
          {([
            { key: 'all', label: 'Tous', count: userCounts.all },
            { key: 'client', label: 'Clients', count: userCounts.client || 0 },
            { key: 'lawyer', label: 'Avocats', count: userCounts.lawyer || 0 },
            { key: 'expat', label: 'Experts', count: userCounts.expat || 0 },
            { key: 'chatter', label: 'Chatters', count: userCounts.chatter || 0 },
            { key: 'influencer', label: 'Influenceurs', count: userCounts.influencer || 0 },
            { key: 'blogger', label: 'Blogueurs', count: userCounts.blogger || 0 },
            { key: 'groupAdmin', label: 'Group Admin', count: userCounts.groupAdmin || 0 },
            { key: 'partner', label: 'Partenaires', count: userCounts.partner || 0 },
            { key: 'admin', label: 'Admins', count: userCounts.admin || 0 },
          ] as { key: 'all' | Role; label: string; count: number }[]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => { setSelectedRole(key); setPage(1); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedRole === key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {key !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${ROLE_CONFIG[key as Role]?.dot || 'bg-gray-400'}`} />}
              {label}
              <span className={`${selectedRole === key ? 'text-gray-300' : 'text-gray-400'}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* ===== SEARCH + FILTERS BAR ===== */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou ID..."
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
              onChange={(e) => { const [f, d] = e.target.value.split('-') as ['createdAt'|'lastLoginAt'|'fullName','asc'|'desc']; setSortField(f); setSortDirection(d); setPage(1); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 min-w-[160px]">
              <option value="createdAt-desc">Plus recents</option>
              <option value="createdAt-asc">Plus anciens</option>
              <option value="lastLoginAt-desc">Connexion recente</option>
              <option value="fullName-asc">Nom A-Z</option>
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
              <h3 className="text-sm font-semibold text-gray-700">Filtres avances</h3>
              <button onClick={() => setAdvancedFilters({ onlineStatus: 'all', bannedStatus: 'all', emailVerified: 'all', approvalStatus: 'all', visibilityStatus: 'all', language: 'all' })}
                className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1">
                <RefreshCw size={12} /> Reinitialiser
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { key: 'onlineStatus' as const, label: 'Statut', options: [['all','Tous'],['online','En ligne'],['offline','Hors ligne']] },
                { key: 'bannedStatus' as const, label: 'Compte', options: [['all','Tous'],['active','Actif'],['banned','Banni']] },
                { key: 'emailVerified' as const, label: 'Email', options: [['all','Tous'],['verified','Verifie'],['unverified','Non verifie']] },
                { key: 'approvalStatus' as const, label: 'Approbation', options: [['all','Tous'],['approved','Approuve'],['pending','En attente'],['rejected','Rejete']] },
                { key: 'visibilityStatus' as const, label: 'Visibilite', options: [['all','Tous'],['visible','Visible'],['hidden','Masque']] },
              ].map(({ key, label, options }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <select value={advancedFilters[key]} onChange={(e) => setAdvancedFilters((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Langue</label>
                <select value={advancedFilters.language} onChange={(e) => setAdvancedFilters((p) => ({ ...p, language: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option value="all">Toutes</option>
                  {availableLanguages.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ===== BULK ACTIONS BAR ===== */}
        {selectedUserIds.size > 0 && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-red-800">
              {selectedUserIds.size} selectionne{selectedUserIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedUserIds(new Set())} className="text-sm text-red-600 hover:text-red-800 font-medium">
                Deselectionner
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
                    <input type="checkbox" checked={filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length}
                      onChange={toggleSelectAll} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Pays</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700" onClick={() => handleSortChange('createdAt')}>
                    <span className="inline-flex items-center gap-1">Inscription <SortIcon field="createdAt" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 hidden lg:table-cell" onClick={() => handleSortChange('lastLoginAt')}>
                    <span className="inline-flex items-center gap-1">Derniere connexion <SortIcon field="lastLoginAt" /></span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center"><LoadingSpinner text={adminT.loading} /></td></tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className={`group transition-colors hover:bg-gray-50/80 ${selectedUserIds.has(u.id) ? 'bg-red-50/50' : ''}`}>
                      {/* Checkbox */}
                      <td className="pl-4 pr-2 py-3">
                        <input type="checkbox" checked={selectedUserIds.has(u.id)} onChange={() => toggleSelectUser(u.id)}
                          className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer" />
                      </td>

                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div className="relative flex-shrink-0">
                            <img
                              src={u.photoURL || u.profilePhoto || '/default-avatar.png'}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }}
                            />
                            {/* Online dot */}
                            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${u.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => { setSelectedUser(u); setShowUserModal(true); fetchLastAffiliateClick(u); }}
                              className="text-sm font-medium text-gray-900 hover:text-red-600 transition-colors truncate block max-w-[180px]"
                              title={`${u.firstName || ''} ${u.lastName || ''}`}
                            >
                              {u.firstName || ''} {u.lastName || ''}
                            </button>
                            <p className="text-xs text-gray-500 truncate max-w-[180px]">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${ROLE_CONFIG[u.role]?.bg || 'bg-gray-50 border-gray-200'} ${ROLE_CONFIG[u.role]?.color || 'text-gray-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${ROLE_CONFIG[u.role]?.dot || 'bg-gray-400'}`} />
                          {ROLE_CONFIG[u.role]?.label || u.role}
                        </span>
                      </td>

                      {/* Country */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-gray-600">
                          {u.country || u.currentCountry ? `${getCountryFlag(u.country || u.currentCountry || '')} ${getCountryName(u.country || u.currentCountry || '', 'fr') || u.country || u.currentCountry}` : '—'}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600" title={formatDateFull(u.createdAt)}>{formatDateShort(u.createdAt)}</span>
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-gray-500" title={u.lastLoginAt.getTime() > 0 ? formatDateFull(u.lastLoginAt) : 'Jamais connecte'}>
                          {timeAgo(u.lastLoginAt)}
                        </span>
                      </td>

                      {/* Status badges */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.isBanned && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">BANNI</span>
                          )}
                          {u.featured && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">VEDETTE</span>
                          )}
                          {u.isApproved === false && !u.isBanned && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700">EN ATTENTE</span>
                          )}
                          {!u.isBanned && u.isApproved !== false && !u.featured && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                              {u.isOnline ? 'En ligne' : 'Hors ligne'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions dropdown */}
                      <td className="px-3 py-3">
                        <div className="relative" ref={openActionMenuId === u.id ? actionMenuRef : undefined}>
                          <button
                            onClick={() => setOpenActionMenuId(openActionMenuId === u.id ? null : u.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {openActionMenuId === u.id && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-1">
                              {u.role !== 'admin' && (
                                <button onClick={() => handleViewDashboard(u)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                  <ExternalLink size={14} className="text-cyan-600" /> Voir le dashboard
                                </button>
                              )}
                              <button onClick={() => handleEditUser(u)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                <Edit3 size={14} className="text-gray-500" /> Modifier le profil
                              </button>
                              <button onClick={() => void handleToggleOnlineStatus(u.id, Boolean(u.isOnline))}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                {u.isOnline ? <EyeOff size={14} className="text-gray-500" /> : <Eye size={14} className="text-emerald-600" />}
                                {u.isOnline ? 'Mettre hors ligne' : 'Mettre en ligne'}
                              </button>
                              {PROVIDER_ROLES.includes(u.role) && (
                                <>
                                  <button onClick={() => void handleToggleVisibility(u.id, Boolean(u.isVisibleOnMap))}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                    <MapPin size={14} className="text-gray-500" />
                                    {u.isVisibleOnMap ? 'Masquer carte' : 'Montrer carte'}
                                  </button>
                                  <button onClick={() => void handleToggleFeatured(u.id, Boolean(u.featured))}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                    <Shield size={14} className="text-amber-500" />
                                    {u.featured ? 'Retirer vedette' : 'Mettre en vedette'}
                                  </button>
                                </>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              {u.isBanned ? (
                                <button onClick={() => void handleUnbanUser(u.id)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors">
                                  <UserPlus size={14} /> Reactiver le compte
                                </button>
                              ) : (
                                <button onClick={() => handleBanUser(u)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 transition-colors">
                                  <Ban size={14} /> Bannir
                                </button>
                              )}
                              <button onClick={() => handleDeleteUser(u)}
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
                  <tr><td colSpan={8} className="py-16 text-center text-gray-400 text-sm">Aucun utilisateur trouve</td></tr>
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
      {/* MODAL: USER DETAIL                                                */}
      {/* ================================================================== */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Detail utilisateur" size="large">
        {selectedUser && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={selectedUser.photoURL || selectedUser.profilePhoto || '/default-avatar.png'} alt=""
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-100"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/default-avatar.png'; }} />
                <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${selectedUser.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${ROLE_CONFIG[selectedUser.role]?.bg} ${ROLE_CONFIG[selectedUser.role]?.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ROLE_CONFIG[selectedUser.role]?.dot}`} />
                    {ROLE_CONFIG[selectedUser.role]?.label}
                  </span>
                  {selectedUser.isBanned && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-xs font-semibold">BANNI</span>}
                  {selectedUser.isTestProfile && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">Test</span>}
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
                    <span className="text-sm text-gray-900 break-all">{selectedUser.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900">{selectedUser.phoneCountryCode} {selectedUser.phone || 'Non renseigne'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Globe size={15} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900">
                      {selectedUser.country || selectedUser.currentCountry
                        ? `${getCountryFlag(selectedUser.country || selectedUser.currentCountry || '')} ${getCountryName(selectedUser.country || selectedUser.currentCountry || '', 'fr') || selectedUser.country || selectedUser.currentCountry}`
                        : 'Non renseigne'}
                    </span>
                  </div>
                  {selectedUser.languages && selectedUser.languages.length > 0 && (
                    <div className="flex items-center gap-2.5">
                      <Languages size={15} className="text-gray-400 flex-shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {selectedUser.languages.map((l) => (
                          <span key={l} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{l}</span>
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
                    <span className="text-sm font-medium text-gray-900">{formatDateShort(selectedUser.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Clock size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Derniere connexion</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900" title={selectedUser.lastLoginAt.getTime() > 0 ? formatDateFull(selectedUser.lastLoginAt) : ''}>
                      {selectedUser.lastLoginAt.getTime() > 0 ? timeAgo(selectedUser.lastLoginAt) : 'Jamais'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <LinkIcon size={15} className="text-gray-400" />
                      <span className="text-sm text-gray-600">Dernier clic affilie</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {affiliateClickLoading ? (
                        <span className="text-gray-400">...</span>
                      ) : lastAffiliateClick ? (
                        <span title={formatDateFull(lastAffiliateClick)}>{timeAgo(lastAffiliateClick)}</span>
                      ) : 'Aucun'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account status */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Compte</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Email verifie', value: !!(selectedUser.emailVerified || selectedUser.isVerifiedEmail), yes: 'Oui', no: 'Non' },
                  { label: 'Approuve', value: !!selectedUser.isApproved, yes: 'Oui', no: 'En attente' },
                  { label: 'En ligne', value: !!selectedUser.isOnline, yes: 'En ligne', no: 'Hors ligne' },
                  ...(PROVIDER_ROLES.includes(selectedUser.role)
                    ? [
                        { label: 'Visible carte', value: !!selectedUser.isVisibleOnMap, yes: 'Oui', no: 'Non' },
                        { label: 'Vedette', value: !!selectedUser.featured, yes: 'Oui', no: 'Non' },
                      ]
                    : []),
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

            {selectedUser.isBanned && selectedUser.banReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Raison du bannissement</h4>
                <p className="text-sm text-red-700">{selectedUser.banReason}</p>
              </div>
            )}

            {/* ID */}
            <div className="text-xs text-gray-400 font-mono select-all">ID: {selectedUser.id}</div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button onClick={() => setShowUserModal(false)} variant="outline" size="small">Fermer</Button>
              {selectedUser.role !== 'admin' && (
                <Button size="small" onClick={() => { setShowUserModal(false); handleViewDashboard(selectedUser); }}
                  className="bg-cyan-600 hover:bg-cyan-700">
                  <ExternalLink size={14} className="mr-1.5" /> Dashboard
                </Button>
              )}
              <Button size="small" onClick={() => { setShowUserModal(false); handleEditUser(selectedUser); }}
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
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Supprimer l'utilisateur" size="small">
        {selectedUser && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Action irreversible</h3>
                  <p className="mt-1 text-sm text-red-700">
                    <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> ({ROLE_CONFIG[selectedUser.role]?.label}) sera supprime definitivement avec toutes ses donnees.
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
              <Button onClick={confirmDeleteUser} variant="danger" size="small" loading={isActionLoading} disabled={deleteConfirmText !== 'SUPPRIMER'}>
                <Trash2 size={14} className="mr-1.5" /> Supprimer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: BULK DELETE                                                 */}
      {/* ================================================================== */}
      <Modal isOpen={showBulkDeleteModal} onClose={() => setShowBulkDeleteModal(false)} title={`Supprimer ${selectedUserIds.size} utilisateur${selectedUserIds.size > 1 ? 's' : ''}`} size="small">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">Suppression en lot irreversible</h3>
                <p className="mt-1 text-sm text-red-700">{selectedUserIds.size} utilisateur{selectedUserIds.size > 1 ? 's' : ''} seront supprimes.</p>
                <div className="mt-2 max-h-24 overflow-y-auto space-y-0.5">
                  {Array.from(selectedUserIds).map((id) => {
                    const u = users.find((user) => user.id === id);
                    return <div key={id} className="text-xs text-red-600">{u ? `${u.firstName || ''} ${u.lastName || ''} (${ROLE_CONFIG[u.role]?.label})` : id}</div>;
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
      <Modal isOpen={showBanModal} onClose={() => setShowBanModal(false)} title="Bannir l'utilisateur" size="small">
        {selectedUser && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex gap-3">
                <Ban className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-orange-800">Bannissement</h3>
                  <p className="mt-1 text-sm text-orange-700">
                    <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> ne pourra plus se connecter.
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
              <Button onClick={confirmBanUser} size="small" loading={isActionLoading} className="bg-orange-600 hover:bg-orange-700">
                <Ban size={14} className="mr-1.5" /> Bannir
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================== */}
      {/* MODAL: EDIT PROFILE                                                */}
      {/* ================================================================== */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Modifier — ${editTargetUser?.firstName || ''} ${editTargetUser?.lastName || ''}`}>
        {editTargetUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Prenom</label>
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Telephone</label>
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Pays d'origine</label>
                <input type="text" value={editFields.country} onChange={(e) => setEditFields((p) => ({ ...p, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pays actuel</label>
                <input type="text" value={editFields.currentCountry} onChange={(e) => setEditFields((p) => ({ ...p, currentCountry: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Langues (separees par virgule)</label>
              <input type="text" value={editFields.languages} onChange={(e) => setEditFields((p) => ({ ...p, languages: e.target.value }))} placeholder="fr, en, es"
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
    </AdminLayout>
  );
};

export default AdminUsers;
