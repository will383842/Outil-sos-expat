/**
 * AdminChattersList - Admin page for managing chatters worldwide
 * Enhanced for international scale: 197 countries, 9 languages
 * Features: Country filter, export, bulk actions, statistics
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate, functions } from "@/config/firebase";
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Filter,
  ChevronRight,
  Star,
  Flame,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  Globe,
  Languages,
  TrendingUp,
  DollarSign,
  UserPlus,
  MoreVertical,
  Ban,
  Play,
  Pause,
  Mail,
  X,
  Check,
  Trash2,
  ShieldOff,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Edit3,
  Phone,
  Save,
  MessageCircle,
  GitBranch,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import AdminErrorState from '@/components/admin/AdminErrorState';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { KPICard } from '@/components/admin/KPICard';
import type { StatusType } from '@/components/admin/StatusBadge';
import { getWhatsAppGroupsConfig, findGroupForUser } from '@/whatsapp-groups';
import type { WhatsAppGroupsConfig } from '@/whatsapp-groups';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500",
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500",
} as const;

// Countries list (ISO 3166-1) - comprehensive list for 197+ countries
const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' }, { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua' },
  { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' }, { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' }, { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' }, { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' }, { code: 'BE', name: 'Belgium' }, { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' }, { code: 'BT', name: 'Bhutan' }, { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia' }, { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' }, { code: 'CV', name: 'Cabo Verde' }, { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' }, { code: 'CA', name: 'Canada' }, { code: 'CF', name: 'Central African Rep.' },
  { code: 'TD', name: 'Chad' }, { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' }, { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'DR Congo' }, { code: 'CR', name: 'Costa Rica' }, { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' }, { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czechia' }, { code: 'DK', name: 'Denmark' }, { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Dominican Rep.' }, { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' }, { code: 'SV', name: 'El Salvador' }, { code: 'GQ', name: 'Eq. Guinea' },
  { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' }, { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' }, { code: 'FJ', name: 'Fiji' }, { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }, { code: 'GA', name: 'Gabon' }, { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' }, { code: 'DE', name: 'Germany' }, { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' }, { code: 'GD', name: 'Grenada' }, { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' }, { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' }, { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' }, { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' }, { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' }, { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' }, { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' }, { code: 'KI', name: 'Kiribati' }, { code: 'KP', name: 'North Korea' },
  { code: 'KR', name: 'South Korea' }, { code: 'KW', name: 'Kuwait' }, { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' }, { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' }, { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' }, { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' }, { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' }, { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' }, { code: 'MR', name: 'Mauritania' }, { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' }, { code: 'FM', name: 'Micronesia' }, { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' }, { code: 'MN', name: 'Mongolia' }, { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' }, { code: 'MZ', name: 'Mozambique' }, { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' }, { code: 'NR', name: 'Nauru' }, { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' }, { code: 'NZ', name: 'New Zealand' }, { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' }, { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' }, { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' }, { code: 'PA', name: 'Panama' }, { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' }, { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' }, { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts' }, { code: 'LC', name: 'Saint Lucia' }, { code: 'VC', name: 'Saint Vincent' },
  { code: 'WS', name: 'Samoa' }, { code: 'SM', name: 'San Marino' }, { code: 'ST', name: 'São Tomé' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' }, { code: 'SL', name: 'Sierra Leone' }, { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' }, { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' }, { code: 'ZA', name: 'South Africa' }, { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' }, { code: 'LK', name: 'Sri Lanka' }, { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' }, { code: 'SE', name: 'Sweden' }, { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' }, { code: 'TW', name: 'Taiwan' }, { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' }, { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' }, { code: 'TO', name: 'Tonga' }, { code: 'TT', name: 'Trinidad' },
  { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turkey' }, { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' }, { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'UAE' }, { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' }, { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican' }, { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' },
].sort((a, b) => a.name.localeCompare(b.name));

// Supported languages
const LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ru', name: 'Русский' },
  { code: 'pt', name: 'Português' },
  { code: 'ch', name: '中文' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
];

interface Chatter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: string;
  level: number;
  totalEarned: number;
  totalClients: number;
  totalRecruits: number;
  currentStreak: number;
  country?: string;
  language?: string;
  createdAt: string;
  lastLoginAt?: string | null;
  isFeatured?: boolean;
  isVisible?: boolean;
  whatsappGroupClicked?: boolean;
  whatsappGroupId?: string | null;
  whatsappGroupCountry?: string | null;
  recruitedBy?: string | null;
  recruitedByName?: string | null;
  captainId?: string | null;
  captainName?: string | null;
  role?: string | null;
}

interface BalanceInfo {
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalEarned: number;
  piggyBankBalance: number;
  piggyBankIsUnlocked: boolean;
  pendingWithdrawals: number;
  pendingWithdrawalsCount: number;
  hasActiveFunds: boolean;
}

interface ManageChatterResponse {
  success: boolean;
  message: string;
  balanceInfo: BalanceInfo;
  actionApplied: string;
  warning?: string;
}

type ManageAction = 'block' | 'restrict' | 'reactivate' | 'delete' | 'getBalanceInfo';

interface ActionModalState {
  isOpen: boolean;
  chatter: Chatter | null;
  action: ManageAction | null;
  balanceInfo: BalanceInfo | null;
  balanceLoading: boolean;
  reason: string;
  confirmText: string;
}

interface ChatterListResponse {
  chatters: Chatter[];
  total: number;
  page: number;
  limit: number;
  stats?: {
    totalActive: number;
    totalPending: number;
    totalSuspended: number;
    totalEarnings: number;
    newThisMonth: number;
    topCountries: Array<{ country: string; count: number }>;
  };
}

type StatusFilter = 'all' | 'active' | 'pending' | 'quiz_required' | 'suspended' | 'banned';

const AdminChattersList: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  // State
  const [chatters, setChatters] = useState<Chatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [featuredLoading, setFeaturedLoading] = useState<string | null>(null);
  const [visibilityLoading, setVisibilityLoading] = useState<Map<string, boolean>>(new Map());
  const [waConfig, setWaConfig] = useState<WhatsAppGroupsConfig | null>(null);

  const toggleFeatured = async (id: string, current: boolean) => {
    setFeaturedLoading(id);
    try {
      const fn = httpsCallable(functions, 'setProviderBadge');
      await fn({ providerId: id, isFeatured: !current });
      setChatters((prev) => prev.map((c) => c.id === id ? { ...c, isFeatured: !current } : c));
      toast.success(!current ? 'Badge attribué ✓' : 'Badge retiré');
    } catch {
      toast.error('Erreur lors de la mise à jour du badge');
    } finally {
      setFeaturedLoading(null);
    }
  };
  const [stats, setStats] = useState<ChatterListResponse['stats']>();

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  // Action modal
  const [actionModal, setActionModal] = useState<ActionModalState>({
    isOpen: false,
    chatter: null,
    action: null,
    balanceInfo: null,
    balanceLoading: false,
    reason: '',
    confirmText: '',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Edit profile modal
  interface EditProfileState {
    isOpen: boolean;
    chatter: Chatter | null;
    fields: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      whatsapp: string;
      country: string;
      language: string;
      bio: string;
      adminNotes: string;
    };
  }
  const [editModal, setEditModal] = useState<EditProfileState>({
    isOpen: false,
    chatter: null,
    fields: { firstName: '', lastName: '', email: '', phone: '', whatsapp: '', country: '', language: '', bio: '', adminNotes: '' },
  });
  const [editLoading, setEditLoading] = useState(false);

  // Reassignment modal
  const [reassignModal, setReassignModal] = useState<{
    chatter: any;
  } | null>(null);
  const [reassignNewParent, setReassignNewParent] = useState('');
  const [reassignParentSearch, setReassignParentSearch] = useState('');
  const [reassignParentDropdownOpen, setReassignParentDropdownOpen] = useState(false);
  const [reassignNewCaptain, setReassignNewCaptain] = useState('');
  const [reassignCaptainSearch, setReassignCaptainSearch] = useState('');
  const [reassignCaptainDropdownOpen, setReassignCaptainDropdownOpen] = useState(false);
  const [reassignReason, setReassignReason] = useState('');
  const [reassignLoading, setReassignLoading] = useState(false);

  const openEditModal = useCallback((chatter: Chatter) => {
    setOpenDropdownId(null);
    setEditModal({
      isOpen: true,
      chatter,
      fields: {
        firstName: chatter.firstName || '',
        lastName: chatter.lastName || '',
        email: chatter.email || '',
        phone: (chatter as any).phone || '',
        whatsapp: (chatter as any).whatsapp || '',
        country: chatter.country || '',
        language: chatter.language || '',
        bio: (chatter as any).bio || '',
        adminNotes: (chatter as any).adminNotes || '',
      },
    });
  }, []);

  const handleEditField = useCallback((field: string, value: string) => {
    setEditModal(prev => ({
      ...prev,
      fields: { ...prev.fields, [field]: value },
    }));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdownId) return;
    const handler = () => setOpenDropdownId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openDropdownId]);

  // Open action modal and fetch balance info
  const openActionModal = useCallback(async (chatter: Chatter, action: ManageAction) => {
    setOpenDropdownId(null);
    setActionModal({
      isOpen: true,
      chatter,
      action,
      balanceInfo: null,
      balanceLoading: true,
      reason: '',
      confirmText: '',
    });

    try {
      const fn = httpsCallable<any, ManageChatterResponse>(functionsAffiliate, 'adminManageChatter');
      const result = await fn({ chatterId: chatter.id, action: 'getBalanceInfo' });
      setActionModal((prev) => ({
        ...prev,
        balanceInfo: result.data.balanceInfo,
        balanceLoading: false,
      }));
    } catch (err) {
      console.error('Error fetching balance:', err);
      setActionModal((prev) => ({
        ...prev,
        balanceLoading: false,
      }));
    }
  }, []);

  const limit = 20;

  // Fetch chatters
  const fetchChatters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetChattersList = httpsCallable<any, ChatterListResponse>(
        functionsAffiliate,
        'adminGetChattersList'
      );

      const result = await adminGetChattersList({
        page,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        country: countryFilter === 'all' ? undefined : countryFilter,
        language: languageFilter === 'all' ? undefined : languageFilter,
        search: searchQuery || undefined,
        includeStats: page === 1,
      });

      setChatters(result.data.chatters);
      setTotal(result.data.total);
      if (result.data.stats) {
        setStats(result.data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching chatters:', err);
      setError(err.message || 'Failed to load chatters');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, countryFilter, languageFilter, searchQuery]);

  const handleSaveProfile = useCallback(async () => {
    if (!editModal.chatter) return;
    setEditLoading(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateChatterProfile');
      const updates: Record<string, string> = { chatterId: editModal.chatter.id };

      // Only send changed fields
      const original = editModal.chatter as any;
      if (editModal.fields.firstName !== (original.firstName || '')) updates.firstName = editModal.fields.firstName;
      if (editModal.fields.lastName !== (original.lastName || '')) updates.lastName = editModal.fields.lastName;
      if (editModal.fields.email !== (original.email || '')) updates.email = editModal.fields.email;
      if (editModal.fields.phone !== (original.phone || '')) updates.phone = editModal.fields.phone;
      if (editModal.fields.whatsapp !== (original.whatsapp || '')) updates.whatsapp = editModal.fields.whatsapp;
      if (editModal.fields.country !== (original.country || '')) updates.country = editModal.fields.country;
      if (editModal.fields.language !== (original.language || '')) updates.language = editModal.fields.language;
      if (editModal.fields.bio !== (original.bio || '')) updates.bio = editModal.fields.bio;
      if (editModal.fields.adminNotes !== (original.adminNotes || '')) updates.adminNotes = editModal.fields.adminNotes;

      if (Object.keys(updates).length <= 1) {
        toast.error('Aucune modification détectée');
        setEditLoading(false);
        return;
      }

      await fn(updates);
      toast.success('Profil mis à jour avec succès');
      setEditModal(prev => ({ ...prev, isOpen: false }));
      fetchChatters();
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setEditLoading(false);
    }
  }, [editModal, fetchChatters]);

  // Execute action
  const executeAction = useCallback(async () => {
    if (!actionModal.chatter || !actionModal.action) return;
    if (['block', 'restrict', 'delete'].includes(actionModal.action) && !actionModal.reason.trim()) {
      toast.error('Veuillez entrer une raison');
      return;
    }
    if (actionModal.action === 'delete' && actionModal.confirmText !== 'SUPPRIMER') {
      toast.error('Tapez SUPPRIMER pour confirmer');
      return;
    }

    setActionLoading(true);
    try {
      const fn = httpsCallable<any, ManageChatterResponse>(functionsAffiliate, 'adminManageChatter');
      const result = await fn({
        chatterId: actionModal.chatter.id,
        action: actionModal.action,
        reason: actionModal.reason,
        confirmDeletion: actionModal.action === 'delete' ? true : undefined,
      });

      toast.success(result.data.message);
      setActionModal((prev) => ({ ...prev, isOpen: false }));
      fetchChatters();
    } catch (err: any) {
      console.error('Error executing action:', err);
      toast.error(err.message || 'Erreur lors de l\'action');
    } finally {
      setActionLoading(false);
    }
  }, [actionModal, fetchChatters]);

  // Reassign hierarchy
  const handleReassign = useCallback(async () => {
    if (!reassignModal) return;
    if (!reassignNewParent && !reassignNewCaptain) {
      toast.error('Veuillez spécifier un nouveau parrain ou capitaine');
      return;
    }
    setReassignLoading(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminReassignChatter');
      const payload: any = {
        chatterId: reassignModal.chatter.id,
        reason: reassignReason || 'Réassignation admin',
      };
      if (reassignNewParent) payload.newRecruitedBy = reassignNewParent;
      if (reassignNewCaptain) payload.newCaptainId = reassignNewCaptain;
      await fn(payload);
      toast.success('Hiérarchie réassignée avec succès');
      setReassignModal(null);
      setReassignNewParent('');
      setReassignParentSearch('');
      setReassignNewCaptain('');
      setReassignCaptainSearch('');
      setReassignReason('');
      fetchChatters();
    } catch (err: any) {
      console.error('Error reassigning chatter:', err);
      toast.error('Erreur: ' + (err.message || err));
    } finally {
      setReassignLoading(false);
    }
  }, [reassignModal, reassignNewParent, reassignNewCaptain, reassignReason, fetchChatters]);

  useEffect(() => {
    fetchChatters();
  }, [page, statusFilter, countryFilter, languageFilter]);

  // Load WhatsApp groups config once
  useEffect(() => {
    getWhatsAppGroupsConfig().then(setWaConfig).catch(() => {});
  }, []);

  /** Build a wa.me link with pre-filled message for a chatter who hasn't joined yet */
  const getWhatsAppInviteLink = useCallback((chatter: Chatter): string | null => {
    if (!waConfig || !chatter.phone) return null;
    const group = findGroupForUser(waConfig, 'chatter', chatter.language || 'en', chatter.country || '');
    if (!group) return null;

    // Clean phone: remove spaces, dashes, parentheses
    const cleanPhone = chatter.phone.replace(/[\s\-()]/g, '').replace(/^\+/, '');

    // Build message in the chatter's language — fun, engaging, post-registration tone
    const messages: Record<string, string> = {
      fr: `Hey ${chatter.firstName} ! 🎉\n\nSuite à ton inscription sur SOS-Expat, on t'invite à rejoindre notre groupe WhatsApp ! 💬\n\nC'est LA communauté des Chatters — on partage des astuces simples pour gagner de l'argent avec juste son téléphone 📱💰\n\nC'est gratuit, c'est fun, et tu vas adorer l'ambiance !\n\n👉 ${group.link}\n\nÀ tout de suite ! 🚀`,
      en: `Hey ${chatter.firstName}! 🎉\n\nFollowing your registration on SOS-Expat, we'd love you to join our WhatsApp group! 💬\n\nIt's THE Chatters community — we share simple tips to earn money with just your phone 📱💰\n\nIt's free, it's fun, and you'll love the vibe!\n\n👉 ${group.link}\n\nSee you there! 🚀`,
      es: `¡Hey ${chatter.firstName}! 🎉\n\nTras tu registro en SOS-Expat, te invitamos a unirte a nuestro grupo WhatsApp! 💬\n\nEs LA comunidad de Chatters — compartimos trucos simples para ganar dinero solo con tu teléfono 📱💰\n\nEs gratis, es divertido, ¡te va a encantar!\n\n👉 ${group.link}\n\n¡Nos vemos! 🚀`,
      pt: `Hey ${chatter.firstName}! 🎉\n\nApós seu cadastro no SOS-Expat, te convidamos a entrar no nosso grupo WhatsApp! 💬\n\nÉ A comunidade dos Chatters — compartilhamos dicas simples pra ganhar dinheiro só com o celular 📱💰\n\nÉ grátis, é divertido, e você vai amar!\n\n👉 ${group.link}\n\nTe esperamos! 🚀`,
      de: `Hey ${chatter.firstName}! 🎉\n\nNach deiner Anmeldung bei SOS-Expat laden wir dich in unsere WhatsApp-Gruppe ein! 💬\n\nDIE Chatters-Community — wir teilen einfache Tipps, um mit dem Handy Geld zu verdienen 📱💰\n\nKostenlos, macht Spaß, und die Stimmung ist super!\n\n👉 ${group.link}\n\nBis gleich! 🚀`,
      ar: `مرحباً ${chatter.firstName}! 🎉\n\nبعد تسجيلك في SOS-Expat، ندعوك للانضمام إلى مجموعتنا على واتساب! 💬\n\nمجتمع Chatters — نشارك نصائح بسيطة لكسب المال من هاتفك فقط 📱💰\n\nمجاني، ممتع، وستحب الأجواء!\n\n👉 ${group.link}\n\nنراك هناك! 🚀`,
      ru: `Привет ${chatter.firstName}! 🎉\n\nПосле регистрации на SOS-Expat приглашаем тебя в наш WhatsApp-чат! 💬\n\nЭто сообщество Chatters — делимся простыми способами заработка прямо с телефона 📱💰\n\nБесплатно, весело, и атмосфера огонь!\n\n👉 ${group.link}\n\nДо встречи! 🚀`,
      hi: `हे ${chatter.firstName}! 🎉\n\nSOS-Expat पर रजिस्ट्रेशन के बाद, हम आपको अपने WhatsApp ग्रुप में आमंत्रित करते हैं! 💬\n\nयह Chatters कम्युनिटी है — सिर्फ फोन से पैसे कमाने के आसान टिप्स 📱💰\n\nफ्री है, मज़ेदार है, आपको पसंद आएगा!\n\n👉 ${group.link}\n\nवहाँ मिलते हैं! 🚀`,
      zh: `嗨 ${chatter.firstName}！🎉\n\n注册SOS-Expat后，我们邀请你加入WhatsApp群！💬\n\n这是Chatters社区——分享用手机赚钱的简单技巧 📱💰\n\n免费、有趣，氛围超棒！\n\n👉 ${group.link}\n\n我们等你！🚀`,
    };
    const msg = messages[chatter.language || 'fr'] || messages['fr'];
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  }, [waConfig]);

  // Debounced search — reset selection when query changes
  useEffect(() => {
    setSelectedIds(new Set());
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchChatters();
      } else {
        setPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Format amount
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Map chatter status to StatusType for the unified StatusBadge
  const mapChatterStatus = (status: string): StatusType => {
    switch (status) {
      case 'active': return 'active';
      case 'pending': return 'pending';
      case 'quiz_required': return 'quiz_required';
      case 'suspended': return 'suspended';
      case 'banned': return 'banned';
      default: return 'inactive';
    }
  };

  // Get level name
  const getLevelName = (level: number) => {
    const levels: Record<number, string> = {
      1: 'Bronze',
      2: 'Silver',
      3: 'Gold',
      4: 'Platinum',
      5: 'Diamond',
    };
    return levels[level] || 'Unknown';
  };

  // Get country name
  const getCountryName = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country?.name || code;
  };

  const handleToggleVisibility = useCallback(async (chatterId: string, currentVisible: boolean) => {
    setVisibilityLoading(prev => new Map(prev).set(chatterId, true));
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminToggleChatterVisibility');
      await fn({ chatterId, isVisible: !currentVisible });
      setChatters(prev => prev.map(c => c.id === chatterId ? { ...c, isVisible: !currentVisible } : c));
      toast.success(!currentVisible ? 'Chatter visible dans le répertoire' : 'Chatter masqué du répertoire');
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      toast.error('Erreur lors de la mise à jour de la visibilité');
    } finally {
      setVisibilityLoading(prev => { const m = new Map(prev); m.delete(chatterId); return m; });
    }
  }, []);

  // Export to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const adminExportChatters = httpsCallable<any, { csv: string }>(
        functionsAffiliate,
        'adminExportChatters'
      );

      const result = await adminExportChatters({
        status: statusFilter === 'all' ? undefined : statusFilter,
        country: countryFilter === 'all' ? undefined : countryFilter,
        language: languageFilter === 'all' ? undefined : languageFilter,
        search: searchQuery || undefined,
      });

      // Download CSV
      const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `chatters_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('Export CSV téléchargé');
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err.message || 'Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: 'suspend' | 'activate' | 'email') => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    try {
      const adminBulkChatterAction = httpsCallable(functionsAffiliate, 'adminBulkChatterAction');
      await adminBulkChatterAction({
        chatterIds: Array.from(selectedIds),
        action,
      });

      setSelectedIds(new Set());
      setShowBulkActions(false);
      fetchChatters();
    } catch (err: any) {
      console.error('Bulk action error:', err);
      setError(err.message || 'Bulk action failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all on page
  const toggleSelectAll = () => {
    if (selectedIds.size === chatters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(chatters.map(c => c.id)));
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
            <FormattedMessage id="admin.chatters.title" defaultMessage="Gestion des Chatters" />
          </h1>
          <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="admin.chatters.subtitle"
              defaultMessage="{count} chatters dans {countries} pays"
              values={{ count: total, countries: stats?.topCountries?.length || 0 }}
            />
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              <FormattedMessage id="admin.chatters.export" defaultMessage="Exporter CSV" />
            </span>
          </button>
          <button
            onClick={fetchChatters}
            className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
            </span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <KPICard
            title={intl.formatMessage({ id: 'admin.chatters.stats.active', defaultMessage: 'Actifs' })}
            value={stats.totalActive}
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
            colorTheme="green"
            variant="glass"
          />
          <KPICard
            title={intl.formatMessage({ id: 'admin.chatters.stats.pending', defaultMessage: 'En attente' })}
            value={stats.totalPending}
            icon={<Clock className="w-5 h-5 text-red-600" />}
            colorTheme="red"
            variant="glass"
          />
          <KPICard
            title={intl.formatMessage({ id: 'admin.chatters.stats.newMonth', defaultMessage: 'Nouveaux (mois)' })}
            value={stats.newThisMonth}
            icon={<UserPlus className="w-5 h-5 text-purple-600" />}
            colorTheme="purple"
            variant="glass"
          />
          <KPICard
            title={intl.formatMessage({ id: 'admin.chatters.stats.suspended', defaultMessage: 'Suspendus' })}
            value={stats.totalSuspended}
            icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
            colorTheme="red"
            variant="glass"
          />
          <KPICard
            title={intl.formatMessage({ id: 'admin.chatters.stats.earnings', defaultMessage: 'Total versé' })}
            value={stats.totalEarnings / 100}
            isCurrency
            currency="USD"
            icon={<DollarSign className="w-5 h-5 text-green-600" />}
            colorTheme="green"
            variant="glass"
          />
        </div>
      )}

      {/* Filters */}
      <div className={`${UI.card} p-3 sm:p-4`}>
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Search Row */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={intl.formatMessage({ id: 'admin.chatters.search', defaultMessage: 'Rechercher par nom, email, code...' })}
              className={`${UI.input} pl-10 text-sm sm:text-base`}
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className={`${UI.select} text-sm flex-1 sm:flex-none`}
              >
                <option value="all">{intl.formatMessage({ id: 'admin.chatters.filter.all', defaultMessage: 'Tous statuts' })}</option>
                <option value="active">{intl.formatMessage({ id: 'admin.chatters.filter.active', defaultMessage: 'Actifs' })}</option>
                <option value="pending">{intl.formatMessage({ id: 'admin.chatters.filter.pending', defaultMessage: 'En attente' })}</option>
                <option value="quiz_required">{intl.formatMessage({ id: 'admin.chatters.filter.quizRequired', defaultMessage: 'Quiz requis' })}</option>
                <option value="suspended">{intl.formatMessage({ id: 'admin.chatters.filter.suspended', defaultMessage: 'Suspendus' })}</option>
                <option value="banned">{intl.formatMessage({ id: 'admin.chatters.filter.banned', defaultMessage: 'Bannis' })}</option>
              </select>
            </div>

            {/* Country Filter */}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className={`${UI.select} text-sm flex-1 sm:flex-none`}
              >
                <option value="all">{intl.formatMessage({ id: 'admin.chatters.filter.allCountries', defaultMessage: 'Tous les pays' })}</option>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Language Filter */}
            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <Languages className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className={`${UI.select} text-sm flex-1 sm:flex-none`}
              >
                <option value="all">{intl.formatMessage({ id: 'admin.chatters.filter.allLanguages', defaultMessage: 'Toutes langues' })}</option>
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className={`${UI.card} p-3 sm:p-4 bg-red-50 dark:bg-red-900/20`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              <FormattedMessage
                id="admin.chatters.bulkSelected"
                defaultMessage="{count} chatter(s) sélectionné(s)"
                values={{ count: selectedIds.size }}
              />
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                disabled={bulkActionLoading}
                className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
              >
                <Play className="w-4 h-4" />
                <FormattedMessage id="admin.chatters.bulk.activate" defaultMessage="Activer" />
              </button>
              <button
                onClick={() => handleBulkAction('suspend')}
                disabled={bulkActionLoading}
                className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
              >
                <Pause className="w-4 h-4" />
                <FormattedMessage id="admin.chatters.bulk.suspend" defaultMessage="Suspendre" />
              </button>
              <button
                onClick={() => handleBulkAction('email')}
                disabled={bulkActionLoading}
                className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
              >
                <Mail className="w-4 h-4" />
                <FormattedMessage id="admin.chatters.bulk.email" defaultMessage="Envoyer email" />
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <AdminErrorState error={error} onRetry={fetchChatters} />}

      {/* Directory info banner */}
      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
        Activez la visibilité de chaque chatter pour qu'il apparaisse sur{' '}
        <a href="/nos-chatters" target="_blank" className="underline font-medium">la page répertoire publique</a>.
        {' '}La page doit aussi être activée dans <strong>Configuration</strong>.
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Chatters List */}
          <div className={`${UI.card} overflow-hidden`}>
            {chatters.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="admin.chatters.empty" defaultMessage="Aucun chatter trouvé" />
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === chatters.length && chatters.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                        />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Chatter
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                        <FormattedMessage id="admin.chatters.col.country" defaultMessage="Pays" />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <FormattedMessage id="admin.chatters.col.status" defaultMessage="Statut" />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                        Affiliation
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                        <FormattedMessage id="admin.chatters.col.level" defaultMessage="Niveau" />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                        <FormattedMessage id="admin.chatters.col.earnings" defaultMessage="Gains" />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                        <span title="Clients / Recrut\u00e9s"><FormattedMessage id="admin.chatters.col.conversions" defaultMessage="Conv." /></span>
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">
                        <FormattedMessage id="admin.chatters.col.lastLogin" defaultMessage="Dernière connexion" />
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell" title="WhatsApp Group">WA</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Répertoire</th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {chatters.map((chatter) => (
                      <tr
                        key={chatter.id}
                        className={`hover:bg-gray-50 dark:hover:bg-white/5 ${
                          selectedIds.has(chatter.id) ? 'bg-red-50 dark:bg-red-900/10' : ''
                        }`}
                      >
                        <td className="px-3 sm:px-4 py-3 sm:py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(chatter.id)}
                            onChange={() => toggleSelection(chatter.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                          />
                        </td>
                        <td
                          className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap cursor-pointer"
                          onClick={() => navigate(`/admin/chatters/${chatter.id}`)}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                              {chatter.firstName?.[0]}{chatter.lastName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                {chatter.firstName} {chatter.lastName}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-[200px]">
                                {chatter.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">{chatter.country ? getFlagEmoji(chatter.country) : '🌍'}</span>
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {chatter.country ? getCountryName(chatter.country) : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <StatusBadge status={mapChatterStatus(chatter.status)} label={chatter.status} size="sm" />
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="flex flex-col gap-0.5">
                            {chatter.recruitedBy ? (
                              <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400" title={`Parrain: ${chatter.recruitedByName || chatter.recruitedBy}`}>
                                <GitBranch className="w-3 h-3" />
                                <span className="truncate max-w-[130px]">{chatter.recruitedByName || 'Parrain'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                <GitBranch className="w-3 h-3" />
                                <span>Orphelin</span>
                              </span>
                            )}
                            {chatter.captainId && (
                              <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400" title={`Captain: ${chatter.captainName || chatter.captainId}`}>
                                <Star className="w-3 h-3 fill-purple-500 text-purple-500" />
                                <span className="truncate max-w-[130px]">{chatter.captainName || 'Captain'}</span>
                              </span>
                            )}
                            {chatter.role === 'captainChatter' && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                Captain
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                            <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                              {getLevelName(chatter.level)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                          <span className="font-medium text-green-600 dark:text-green-400 text-sm">
                            {formatAmount(chatter.totalEarned)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-xs sm:text-sm">
                            <span className="text-gray-900 dark:text-white">{chatter.totalClients}</span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span className="text-gray-600 dark:text-gray-400">{chatter.totalRecruits}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden xl:table-cell">
                          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            {chatter.lastLoginAt
                              ? new Date(chatter.lastLoginAt).toLocaleDateString(intl.locale, { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center hidden md:table-cell">
                          {chatter.whatsappGroupClicked ? (
                            <span
                              title={`Inscrit — ${chatter.whatsappGroupId || 'groupe inconnu'}${chatter.whatsappGroupCountry ? ` (${chatter.whatsappGroupCountry})` : ''}`}
                              className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366] cursor-help"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                          ) : (() => {
                            const waLink = getWhatsAppInviteLink(chatter);
                            return waLink ? (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Envoyer invitation WhatsApp à ${chatter.firstName}`}
                                className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white transition-colors cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                              </a>
                            ) : (
                              <span
                                title={chatter.phone ? 'Pas de groupe WhatsApp configuré' : 'Pas de numéro de téléphone'}
                                className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-help text-xs"
                              >
                                —
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          {visibilityLoading.get(chatter.id) ? (
                            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 opacity-60">
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" />
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggleVisibility(chatter.id, chatter.isVisible ?? false)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                chatter.isVisible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                              title={chatter.isVisible ? 'Masquer du répertoire' : 'Afficher dans le répertoire'}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                chatter.isVisible ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); void toggleFeatured(chatter.id, !!chatter.isFeatured); }}
                              disabled={featuredLoading === chatter.id}
                              title={chatter.isFeatured ? 'Retirer le badge Recommandé' : 'Attribuer le badge Recommandé'}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            >
                              {featuredLoading === chatter.id
                                ? <span className="animate-spin inline-block w-4 h-4 border border-current rounded-full border-t-transparent" />
                                : <Star className={`w-4 h-4 ${chatter.isFeatured ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                              }
                            </button>
                            <button
                              onClick={() => navigate(`/admin/chatters/${chatter.id}`)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                              title="Voir détails"
                            >
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                            {/* Actions dropdown */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(openDropdownId === chatter.id ? null : chatter.id);
                                }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Actions"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                              </button>
                              {openDropdownId === chatter.id && (
                                <div
                                  className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Dashboard & Edit */}
                                  <button
                                    onClick={() => { setOpenDropdownId(null); window.open(`/chatter/tableau-de-bord?userId=${chatter.id}`, '_blank'); }}
                                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-blue-600"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    Voir le dashboard
                                  </button>
                                  <button
                                    onClick={() => openEditModal(chatter)}
                                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-indigo-600"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    Modifier le profil
                                  </button>
                                  <button
                                    onClick={() => { setOpenDropdownId(null); setReassignModal({ chatter }); }}
                                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-purple-600"
                                  >
                                    <GitBranch className="w-4 h-4" />
                                    Réassigner hiérarchie
                                  </button>
                                  <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                  {chatter.status === 'active' && (
                                    <>
                                      <button
                                        onClick={() => openActionModal(chatter, 'restrict')}
                                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-yellow-600"
                                      >
                                        <Pause className="w-4 h-4" />
                                        Suspendre
                                      </button>
                                      <button
                                        onClick={() => openActionModal(chatter, 'block')}
                                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-orange-600"
                                      >
                                        <Ban className="w-4 h-4" />
                                        Bloquer (bannir)
                                      </button>
                                    </>
                                  )}
                                  {chatter.status === 'suspended' && (
                                    <>
                                      <button
                                        onClick={() => openActionModal(chatter, 'reactivate')}
                                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-green-600"
                                      >
                                        <ShieldCheck className="w-4 h-4" />
                                        Réactiver
                                      </button>
                                      <button
                                        onClick={() => openActionModal(chatter, 'block')}
                                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-orange-600"
                                      >
                                        <Ban className="w-4 h-4" />
                                        Bloquer (bannir)
                                      </button>
                                    </>
                                  )}
                                  {chatter.status === 'banned' && (
                                    <button
                                      onClick={() => openActionModal(chatter, 'reactivate')}
                                      className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-green-600"
                                    >
                                      <ShieldCheck className="w-4 h-4" />
                                      Débloquer / Réactiver
                                    </button>
                                  )}
                                  <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                  <button
                                    onClick={() => openActionModal(chatter, 'delete')}
                                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Supprimer
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="admin.chatters.pagination"
                  defaultMessage="Page {page} sur {total} ({count} chatters)"
                  values={{ page, total: totalPages, count: total }}
                />
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  «
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <FormattedMessage id="common.previous" defaultMessage="Préc." />
                </button>
                <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <FormattedMessage id="common.next" defaultMessage="Suiv." />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {/* ========== ACTION CONFIRMATION MODAL ========== */}
      {actionModal.isOpen && actionModal.chatter && actionModal.action && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between ${
              actionModal.action === 'delete' ? 'bg-red-50 dark:bg-red-900/20' :
              actionModal.action === 'block' ? 'bg-orange-50 dark:bg-orange-900/20' :
              actionModal.action === 'restrict' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
              'bg-green-50 dark:bg-green-900/20'
            }`}>
              <div className="flex items-center gap-3">
                {actionModal.action === 'delete' && <Trash2 className="w-5 h-5 text-red-600" />}
                {actionModal.action === 'block' && <Ban className="w-5 h-5 text-orange-600" />}
                {actionModal.action === 'restrict' && <ShieldOff className="w-5 h-5 text-yellow-600" />}
                {actionModal.action === 'reactivate' && <ShieldCheck className="w-5 h-5 text-green-600" />}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {actionModal.action === 'delete' && 'Supprimer le chatter'}
                  {actionModal.action === 'block' && 'Bloquer (bannir) le chatter'}
                  {actionModal.action === 'restrict' && 'Suspendre le chatter'}
                  {actionModal.action === 'reactivate' && 'Réactiver le chatter'}
                </h3>
              </div>
              <button
                onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chatter Info */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  {actionModal.chatter.firstName?.[0]}{actionModal.chatter.lastName?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {actionModal.chatter.firstName} {actionModal.chatter.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{actionModal.chatter.email}</p>
                </div>
                <StatusBadge status={mapChatterStatus(actionModal.chatter.status)} label={actionModal.chatter.status} size="sm" />
              </div>

              {/* Balance Info */}
              <div className={`rounded-xl p-4 mb-4 ${
                actionModal.balanceLoading ? 'bg-gray-50 dark:bg-gray-800' :
                actionModal.balanceInfo?.hasActiveFunds ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' :
                'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              }`}>
                {actionModal.balanceLoading ? (
                  <div className="flex items-center gap-2 justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Chargement des soldes...</span>
                  </div>
                ) : actionModal.balanceInfo ? (
                  <>
                    {actionModal.balanceInfo.hasActiveFunds && (
                      <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-300">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold text-sm">Ce chatter a des fonds actifs !</span>
                      </div>
                    )}
                    {!actionModal.balanceInfo.hasActiveFunds && (
                      <div className="flex items-center gap-2 mb-3 text-green-700 dark:text-green-300">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold text-sm">Aucun fonds actif</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Disponible:</span>
                        <span className={`font-medium ${actionModal.balanceInfo.availableBalance > 0 ? 'text-green-600' : ''}`}>
                          {formatAmount(actionModal.balanceInfo.availableBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">En attente:</span>
                        <span className={`font-medium ${actionModal.balanceInfo.pendingBalance > 0 ? 'text-yellow-600' : ''}`}>
                          {formatAmount(actionModal.balanceInfo.pendingBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Validé:</span>
                        <span className="font-medium">{formatAmount(actionModal.balanceInfo.validatedBalance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total gagné:</span>
                        <span className="font-medium">{formatAmount(actionModal.balanceInfo.totalEarned)}</span>
                      </div>
                      {actionModal.balanceInfo.piggyBankBalance > 0 && (
                        <div className="flex justify-between col-span-2 pt-1 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-gray-500">Tirelire ({actionModal.balanceInfo.piggyBankIsUnlocked ? 'débloquée' : 'verrouillée'}):</span>
                          <span className="font-medium text-purple-600">{formatAmount(actionModal.balanceInfo.piggyBankBalance)}</span>
                        </div>
                      )}
                      {actionModal.balanceInfo.pendingWithdrawalsCount > 0 && (
                        <div className="flex justify-between col-span-2 pt-1 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-gray-500">Retraits en cours ({actionModal.balanceInfo.pendingWithdrawalsCount}):</span>
                          <span className="font-medium text-red-600">{formatAmount(actionModal.balanceInfo.pendingWithdrawals)}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 text-center">Impossible de charger les soldes</p>
                )}
              </div>

              {/* Reason input */}
              {['block', 'restrict', 'delete'].includes(actionModal.action) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Raison *
                  </label>
                  <textarea
                    value={actionModal.reason}
                    onChange={(e) => setActionModal((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Entrez la raison de cette action..."
                    className={`${UI.input} min-h-[80px] resize-y`}
                    rows={3}
                  />
                </div>
              )}

              {/* Delete confirmation */}
              {actionModal.action === 'delete' && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-300 mb-2 font-medium">
                    Cette action est irréversible ! Toutes les données du chatter seront supprimées :
                    commissions, retraits, badges, liens de parrainage, compte Firebase Auth.
                  </p>
                  <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                    Tapez <span className="font-bold">SUPPRIMER</span> pour confirmer :
                  </label>
                  <input
                    type="text"
                    value={actionModal.confirmText}
                    onChange={(e) => setActionModal((prev) => ({ ...prev, confirmText: e.target.value }))}
                    placeholder="SUPPRIMER"
                    className={`${UI.input} border-red-300 dark:border-red-700`}
                  />
                </div>
              )}

              {/* Action description */}
              {actionModal.action === 'block' && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Le chatter sera banni et son compte Firebase Auth désactivé. Il ne pourra plus se connecter.
                </p>
              )}
              {actionModal.action === 'restrict' && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Le chatter sera suspendu temporairement. Ses commissions continueront d'être comptabilisées mais il ne pourra pas retirer.
                </p>
              )}
              {actionModal.action === 'reactivate' && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Le chatter sera réactivé et pourra de nouveau se connecter et utiliser la plateforme.
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                className={`${UI.button.secondary} px-4 py-2 text-sm`}
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button
                onClick={executeAction}
                disabled={
                  actionLoading ||
                  actionModal.balanceLoading ||
                  (['block', 'restrict', 'delete'].includes(actionModal.action) && !actionModal.reason.trim()) ||
                  (actionModal.action === 'delete' && actionModal.confirmText !== 'SUPPRIMER')
                }
                className={`${
                  actionModal.action === 'delete' ? UI.button.danger :
                  actionModal.action === 'reactivate' ? UI.button.primary :
                  UI.button.danger
                } px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {actionModal.action === 'delete' && 'Supprimer définitivement'}
                {actionModal.action === 'block' && 'Bloquer'}
                {actionModal.action === 'restrict' && 'Suspendre'}
                {actionModal.action === 'reactivate' && 'Réactiver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== EDIT PROFILE MODAL ========== */}
      {editModal.isOpen && editModal.chatter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Modifier le profil — {editModal.chatter.firstName} {editModal.chatter.lastName}
                </h3>
              </div>
              <button
                onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-4 space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={editModal.fields.firstName}
                    onChange={(e) => handleEditField('firstName', e.target.value)}
                    className={UI.input}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                  <input
                    type="text"
                    value={editModal.fields.lastName}
                    onChange={(e) => handleEditField('lastName', e.target.value)}
                    className={UI.input}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Mail className="w-3.5 h-3.5 inline mr-1" />Email
                </label>
                <input
                  type="email"
                  value={editModal.fields.email}
                  onChange={(e) => handleEditField('email', e.target.value)}
                  className={UI.input}
                />
              </div>

              {/* Phone row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Phone className="w-3.5 h-3.5 inline mr-1" />Téléphone
                  </label>
                  <input
                    type="tel"
                    value={editModal.fields.phone}
                    onChange={(e) => handleEditField('phone', e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className={UI.input}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <MessageCircle className="w-3.5 h-3.5 inline mr-1" />WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={editModal.fields.whatsapp}
                    onChange={(e) => handleEditField('whatsapp', e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className={UI.input}
                  />
                </div>
              </div>

              {/* Country & Language */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Globe className="w-3.5 h-3.5 inline mr-1" />Pays
                  </label>
                  <select
                    value={editModal.fields.country}
                    onChange={(e) => handleEditField('country', e.target.value)}
                    className={UI.select}
                  >
                    <option value="">— Sélectionner —</option>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Languages className="w-3.5 h-3.5 inline mr-1" />Langue
                  </label>
                  <select
                    value={editModal.fields.language}
                    onChange={(e) => handleEditField('language', e.target.value)}
                    className={UI.select}
                  >
                    <option value="">— Sélectionner —</option>
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                <textarea
                  value={editModal.fields.bio}
                  onChange={(e) => handleEditField('bio', e.target.value)}
                  className={`${UI.input} min-h-[60px] resize-y`}
                  rows={2}
                  placeholder="Bio du chatter..."
                />
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1" />Notes admin (internes)
                </label>
                <textarea
                  value={editModal.fields.adminNotes}
                  onChange={(e) => handleEditField('adminNotes', e.target.value)}
                  className={`${UI.input} min-h-[80px] resize-y`}
                  rows={3}
                  placeholder="Notes visibles uniquement par les admins..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
                className={`${UI.button.secondary} px-4 py-2 text-sm`}
                disabled={editLoading}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={editLoading}
                className={`${UI.button.primary} px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reassignment Modal */}
      {reassignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-1">Réassigner la hiérarchie</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {reassignModal.chatter.firstName} {reassignModal.chatter.lastName}
              {reassignModal.chatter.recruitedBy && (
                <span> — Parrain actuel: <strong className="text-indigo-600 dark:text-indigo-400">{reassignModal.chatter.recruitedByName || reassignModal.chatter.recruitedBy}</strong></span>
              )}
              {reassignModal.chatter.captainId && (
                <span> — Capitaine actuel: <strong className="text-purple-600 dark:text-purple-400">{reassignModal.chatter.captainName || reassignModal.chatter.captainId}</strong></span>
              )}
            </p>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nouveau parrain</label>
                {reassignNewParent ? (
                  <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-xl">
                    <span className="text-sm text-gray-900 dark:text-white flex-1 truncate">
                      {(() => { const f = chatters.find(c => c.id === reassignNewParent); return f ? `${f.firstName} ${f.lastName} (${f.email})` : reassignNewParent; })()}
                    </span>
                    <button onClick={() => { setReassignNewParent(''); setReassignParentSearch(''); }} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className={UI.input}
                      value={reassignParentSearch}
                      onChange={e => { setReassignParentSearch(e.target.value); setReassignParentDropdownOpen(true); }}
                      onFocus={() => setReassignParentDropdownOpen(true)}
                      placeholder="Rechercher par nom, email ou ID..."
                    />
                    {reassignParentDropdownOpen && reassignParentSearch.length >= 2 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
                        {chatters
                          .filter(c => {
                            if (reassignModal && c.id === reassignModal.chatter.id) return false;
                            const q = reassignParentSearch.toLowerCase();
                            return c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
                          })
                          .slice(0, 15)
                          .map(c => (
                            <button key={c.id} onClick={() => { setReassignNewParent(c.id); setReassignParentSearch(''); setReassignParentDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">{c.firstName} {c.lastName}</span>
                              <span className="text-gray-400 text-xs truncate">{c.email}</span>
                            </button>
                          ))
                        }
                        {chatters.filter(c => { if (reassignModal && c.id === reassignModal.chatter.id) return false; const q = reassignParentSearch.toLowerCase(); return c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.id.toLowerCase().includes(q); }).length === 0 && (
                          <p className="px-3 py-2 text-sm text-gray-400">Aucun résultat</p>
                        )}
                      </div>
                    )}
                  </>
                )}
                <p className="text-xs text-gray-400 mt-1">Change recruitedBy et recalcule toute la chaîne N2</p>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nouveau capitaine</label>
                {reassignNewCaptain ? (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl">
                    <span className="text-sm text-gray-900 dark:text-white flex-1 truncate">
                      {(() => { const f = chatters.find(c => c.id === reassignNewCaptain); return f ? `${f.firstName} ${f.lastName} (${f.email})` : reassignNewCaptain; })()}
                    </span>
                    <button onClick={() => { setReassignNewCaptain(''); setReassignCaptainSearch(''); }} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className={UI.input}
                      value={reassignCaptainSearch}
                      onChange={e => { setReassignCaptainSearch(e.target.value); setReassignCaptainDropdownOpen(true); }}
                      onFocus={() => setReassignCaptainDropdownOpen(true)}
                      placeholder="Rechercher un capitaine..."
                    />
                    {reassignCaptainDropdownOpen && reassignCaptainSearch.length >= 2 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
                        {chatters
                          .filter(c => {
                            if (c.role !== 'captainChatter') return false;
                            if (reassignModal && c.id === reassignModal.chatter.id) return false;
                            const q = reassignCaptainSearch.toLowerCase();
                            return c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
                          })
                          .slice(0, 15)
                          .map(c => (
                            <button key={c.id} onClick={() => { setReassignNewCaptain(c.id); setReassignCaptainSearch(''); setReassignCaptainDropdownOpen(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">{c.firstName} {c.lastName}</span>
                              <span className="text-gray-400 text-xs truncate">{c.email}</span>
                            </button>
                          ))
                        }
                        {chatters.filter(c => { if (c.role !== 'captainChatter') return false; const q = reassignCaptainSearch.toLowerCase(); return c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.id.toLowerCase().includes(q); }).length === 0 && (
                          <p className="px-3 py-2 text-sm text-gray-400">Aucun capitaine trouvé</p>
                        )}
                      </div>
                    )}
                  </>
                )}
                <p className="text-xs text-gray-400 mt-1">Réassigne à un autre Captain Chatter</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raison</label>
                <textarea
                  className={`${UI.input} min-h-[60px] resize-y`}
                  rows={2}
                  value={reassignReason}
                  onChange={e => setReassignReason(e.target.value)}
                  placeholder="Raison de la réassignation..."
                />
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>Attention :</strong> Changer le parrain recalcule automatiquement les parrains N2 de tous les filleuls directs. Les commissions futures suivront la nouvelle hiérarchie.
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => { setReassignModal(null); setReassignNewParent(''); setReassignParentSearch(''); setReassignParentDropdownOpen(false); setReassignNewCaptain(''); setReassignCaptainSearch(''); setReassignCaptainDropdownOpen(false); setReassignReason(''); }}
                className={`${UI.button.secondary} px-4 py-2 text-sm`}
              >
                Annuler
              </button>
              <button
                onClick={handleReassign}
                disabled={reassignLoading || (!reassignNewParent && !reassignNewCaptain)}
                className={`${UI.button.primary} px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {reassignLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
                Réassigner
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </AdminLayout>
  );
};

// Helper function to get country flag emoji from ISO code
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default AdminChattersList;
