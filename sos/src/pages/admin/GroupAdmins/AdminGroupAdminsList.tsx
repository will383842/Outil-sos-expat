/**
 * AdminGroupAdminsList - Admin page for managing Facebook group administrators
 * Features: Group type filter, group size filter, search, export, bulk actions, visibility toggle
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate, functions } from '@/config/firebase';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  Globe,
  DollarSign,
  UserPlus,
  X,
  Play,
  Pause,
  ExternalLink,
  Facebook,
  Shield,
  Star,
  Eye,
  Edit3,
  Phone,
  Save,
  AlertCircle,
  Mail,
  Languages,
  Ban as BanIcon,
  PlayCircle,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { StatusType } from '@/components/admin/StatusBadge';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
} as const;

const GROUP_TYPES = [
  { code: 'travel', name: 'Travel' },
  { code: 'expat', name: 'Expatriates' },
  { code: 'digital_nomad', name: 'Digital Nomads' },
  { code: 'immigration', name: 'Immigration' },
  { code: 'relocation', name: 'Relocation' },
  { code: 'language', name: 'Language Exchange' },
  { code: 'country_specific', name: 'Country Specific' },
  { code: 'profession', name: 'Profession' },
  { code: 'family', name: 'Family' },
  { code: 'student', name: 'Student' },
  { code: 'retirement', name: 'Retirement' },
  { code: 'other', name: 'Other' },
];

const GROUP_SIZES = [
  { code: 'lt1k', name: '< 1,000' },
  { code: '1k-5k', name: '1k - 5k' },
  { code: '5k-10k', name: '5k - 10k' },
  { code: '10k-25k', name: '10k - 25k' },
  { code: '25k-50k', name: '25k - 50k' },
  { code: '50k-100k', name: '50k - 100k' },
  { code: 'gt100k', name: '> 100k' },
];

// Countries list (ISO 3166-1)
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

interface GroupAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  totalEarned: number;
  totalClients: number;
  totalRecruits: number;
  groupUrl?: string;
  groupName?: string;
  groupType?: string;
  groupSize?: string;
  groupCountry?: string;
  isGroupVerified: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  isFeatured?: boolean;
  isVisible?: boolean;
}

interface GroupAdminListResponse {
  groupAdmins: GroupAdmin[];
  total: number;
  page: number;
  limit: number;
  stats?: {
    totalActive: number;
    totalSuspended: number;
    totalEarnings: number;
    newThisMonth: number;
    verifiedGroups: number;
  };
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'banned';

const AdminGroupAdminsList: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  const [groupAdmins, setGroupAdmins] = useState<GroupAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [groupTypeFilter, setGroupTypeFilter] = useState<string>('all');
  const [groupSizeFilter, setGroupSizeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<GroupAdminListResponse['stats']>();
  const [featuredLoading, setFeaturedLoading] = useState<string | null>(null);
  const [visibilityLoading, setVisibilityLoading] = useState<Map<string, boolean>>(new Map());
  // Edit profile modal
  interface EditProfileState {
    isOpen: boolean;
    admin: GroupAdmin | null;
    fields: {
      firstName: string; lastName: string; email: string; phone: string;
      country: string; language: string; groupName: string; groupUrl: string;
      groupType: string; groupSize: string; groupCountry: string; groupLanguage: string; adminNotes: string;
    };
  }
  const [editModal, setEditModal] = useState<EditProfileState>({
    isOpen: false, admin: null,
    fields: { firstName: '', lastName: '', email: '', phone: '', country: '', language: '', groupName: '', groupUrl: '', groupType: '', groupSize: '', groupCountry: '', groupLanguage: '', adminNotes: '' },
  });
  const [editLoading, setEditLoading] = useState(false);

  const openEditModal = useCallback((a: GroupAdmin) => {
    setEditModal({
      isOpen: true, admin: a,
      fields: {
        firstName: a.firstName || '', lastName: a.lastName || '', email: a.email || '',
        phone: (a as any).phone || '', country: (a as any).country || '', language: (a as any).language || '',
        groupName: a.groupName || '', groupUrl: a.groupUrl || '', groupType: a.groupType || '',
        groupSize: a.groupSize || '', groupCountry: a.groupCountry || '', groupLanguage: (a as any).groupLanguage || '',
        adminNotes: (a as any).adminNotes || '',
      },
    });
  }, []);

  const handleEditField = useCallback((field: string, value: string) => {
    setEditModal(prev => ({ ...prev, fields: { ...prev.fields, [field]: value } }));
  }, []);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Per-row moderation action modal
  const [actionModal, setActionModal] = useState<{
    groupAdmin: any;
    action: 'suspend' | 'ban' | 'reactivate' | 'delete';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionConfirmText, setActionConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const limit = 20;

  const toggleFeatured = async (id: string, current: boolean) => {
    setFeaturedLoading(id);
    try {
      const fn = httpsCallable(functions, 'setProviderBadge');
      await fn({ providerId: id, isFeatured: !current });
      setGroupAdmins((prev) => prev.map((x) => x.id === id ? { ...x, isFeatured: !current } : x));
      toast.success(!current ? 'Badge attribué ✓' : 'Badge retiré');
    } catch {
      toast.error('Erreur lors de la mise à jour du badge');
    } finally {
      setFeaturedLoading(null);
    }
  };

  const handleToggleVisibility = async (id: string, currentVisibility: boolean | undefined) => {
    const current = !!currentVisibility;
    setVisibilityLoading((prev) => new Map(prev).set(id, true));
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminToggleGroupAdminVisibility');
      await fn({ groupAdminId: id, isVisible: !current });
      setGroupAdmins((prev) =>
        prev.map((x) => x.id === id ? { ...x, isVisible: !current } : x)
      );
      toast.success(!current ? 'Visible dans le répertoire ✓' : 'Masqué du répertoire');
    } catch {
      toast.error('Erreur lors de la mise à jour de la visibilité');
    } finally {
      setVisibilityLoading((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const fetchGroupAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const adminGetGroupAdminsList = httpsCallable<unknown, GroupAdminListResponse>(
        functionsAffiliate,
        'adminGetGroupAdminsList'
      );
      const result = await adminGetGroupAdminsList({
        page,
        limit,
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        groupType: groupTypeFilter !== 'all' ? groupTypeFilter : undefined,
        groupSize: groupSizeFilter !== 'all' ? groupSizeFilter : undefined,
      });
      setGroupAdmins(result.data.groupAdmins);
      setTotal(result.data.total);
      setStats(result.data.stats);
    } catch (err) {
      console.error('Error fetching group admins:', err);
      setError(intl.formatMessage({ id: 'groupAdmin.admin.list.error' }));
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, groupTypeFilter, groupSizeFilter, intl]);

  const handleSaveProfile = useCallback(async () => {
    if (!editModal.admin) return;
    setEditLoading(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdateGroupAdminProfile');
      const updates: Record<string, any> = { groupAdminId: editModal.admin.id };
      const orig = editModal.admin as any;
      const f = editModal.fields;
      if (f.firstName !== (orig.firstName || '')) updates.firstName = f.firstName;
      if (f.lastName !== (orig.lastName || '')) updates.lastName = f.lastName;
      if (f.email !== (orig.email || '')) updates.email = f.email;
      if (f.phone !== (orig.phone || '')) updates.phone = f.phone;
      if (f.country !== (orig.country || '')) updates.country = f.country;
      if (f.language !== (orig.language || '')) updates.language = f.language;
      if (f.groupName !== (orig.groupName || '')) updates.groupName = f.groupName;
      if (f.groupUrl !== (orig.groupUrl || '')) updates.groupUrl = f.groupUrl;
      if (f.groupType !== (orig.groupType || '')) updates.groupType = f.groupType;
      if (f.groupSize !== (orig.groupSize || '')) updates.groupSize = f.groupSize;
      if (f.groupCountry !== (orig.groupCountry || '')) updates.groupCountry = f.groupCountry;
      if (f.groupLanguage !== (orig.groupLanguage || '')) updates.groupLanguage = f.groupLanguage;
      if (f.adminNotes !== (orig.adminNotes || '')) updates.adminNotes = f.adminNotes;

      if (Object.keys(updates).length <= 1) { toast.error('Aucune modification'); setEditLoading(false); return; }
      await fn(updates);
      toast.success('Profil mis à jour');
      setEditModal(prev => ({ ...prev, isOpen: false }));
      fetchGroupAdmins();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally { setEditLoading(false); }
  }, [editModal, fetchGroupAdmins]);

  useEffect(() => {
    fetchGroupAdmins();
  }, [fetchGroupAdmins]);

  useEffect(() => {
    if (!openDropdownId) return;
    const handler = () => setOpenDropdownId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openDropdownId]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === groupAdmins.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(groupAdmins.map(g => g.id)));
  };

  const handleBulkAction = async (action: 'activate' | 'suspend' | 'block') => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      for (const id of Array.from(selectedIds)) {
        const updateStatus = httpsCallable(functionsAffiliate, 'adminUpdateGroupAdminStatus');
        await updateStatus({ groupAdminId: id, status: action === 'activate' ? 'active' : action === 'suspend' ? 'suspended' : 'banned' });
      }
      setSelectedIds(new Set());
      fetchGroupAdmins();
    } catch (err) {
      console.error('Bulk action error:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportFn = httpsCallable(functionsAffiliate, 'adminExportGroupAdmins');
      const result = await exportFn({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        groupType: groupTypeFilter !== 'all' ? groupTypeFilter : undefined,
      });
      const csvData = result.data as string;
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `groupadmins-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    const { groupAdmin, action } = actionModal;

    if ((action === 'suspend' || action === 'ban' || action === 'delete') && !actionReason.trim()) {
      toast.error('Une raison est requise');
      return;
    }

    if (action === 'delete' && actionConfirmText !== 'SUPPRIMER') {
      toast.error('Tapez SUPPRIMER pour confirmer');
      return;
    }

    setActionLoading(true);
    try {
      if (action === 'delete') {
        const fn = httpsCallable(functionsAffiliate, 'adminDeleteGroupAdmin');
        await fn({ groupAdminId: groupAdmin.id, reason: actionReason.trim() });
        toast.success('GroupAdmin supprimé');
      } else {
        const fn = httpsCallable(functionsAffiliate, 'adminUpdateGroupAdminStatus');
        const newStatus = action === 'suspend' ? 'suspended' : action === 'ban' ? 'banned' : 'active';
        await fn({ groupAdminId: groupAdmin.id, status: newStatus, reason: actionReason });
        toast.success(
          action === 'suspend' ? 'GroupAdmin suspendu' :
          action === 'ban' ? 'GroupAdmin banni' :
          'GroupAdmin réactivé'
        );
      }
      setActionModal(null);
      setActionReason('');
      setActionConfirmText('');
      fetchGroupAdmins();
    } catch (err: any) {
      toast.error('Erreur: ' + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const getGroupAdminStatusBadge = (status: string) => {
    const statusMap: Record<string, { statusType: StatusType; labelKey: string; defaultLabel: string }> = {
      active: { statusType: 'active', labelKey: 'groupAdmin.status.active', defaultLabel: 'Active' },
      suspended: { statusType: 'suspended', labelKey: 'groupAdmin.status.suspended', defaultLabel: 'Suspended' },
      banned: { statusType: 'banned', labelKey: 'groupAdmin.status.banned', defaultLabel: 'Banned' },
    };
    const config = statusMap[status];
    if (!config) return null;
    return <StatusBadge status={config.statusType} label={intl.formatMessage({ id: config.labelKey, defaultMessage: config.defaultLabel })} size="sm" />;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Facebook className="w-6 h-6 text-blue-500" />
              <FormattedMessage id="groupAdmin.admin.title" defaultMessage="GroupAdmins Management" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {intl.formatMessage({ id: 'groupAdmin.admin.list.description' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchGroupAdmins} disabled={loading} className={`${UI.button.secondary} px-4 py-2`}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleExport} disabled={exporting} className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2`}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {intl.formatMessage({ id: 'groupAdmin.admin.list.export' })}
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg"><Users className="w-5 h-5 text-green-600 dark:text-green-400" /></div>
                <div><p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.list.stats.active' })}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalActive}</p></div>
              </div>
            </div>
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg"><Pause className="w-5 h-5 text-yellow-600 dark:text-yellow-400" /></div>
                <div><p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.list.stats.suspended' })}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalSuspended}</p></div>
              </div>
            </div>
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
                <div><p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.list.stats.totalEarnings' })}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{formatAmount(stats.totalEarnings)}</p></div>
              </div>
            </div>
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>
                <div><p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.list.stats.newThisMonth' })}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.newThisMonth}</p></div>
              </div>
            </div>
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg"><Shield className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /></div>
                <div><p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.list.stats.verifiedGroups' })}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{stats.verifiedGroups}</p></div>
              </div>
            </div>
          </div>
        )}

        {/* Bannière page publique */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-xl text-sm text-blue-700 dark:text-blue-300">
          <Globe className="w-4 h-4 flex-shrink-0" />
          <span>Répertoire public :</span>
          <a
            href="/groupes-communaute"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium underline hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
          >
            /groupes-communaute
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-blue-500 dark:text-blue-400 text-xs ml-auto">
            Seuls les groupes avec le toggle «&nbsp;Visible&nbsp;» activé apparaissent sur la page publique.
          </span>
        </div>

        {/* Filtres */}
        <div className={UI.card + " p-4"}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={intl.formatMessage({ id: 'groupAdmin.admin.search', defaultMessage: 'Search...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={UI.input + " pl-10"}
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className={UI.select}>
              <option value="all">{intl.formatMessage({ id: 'groupAdmin.admin.filter.all', defaultMessage: 'All Statuses' })}</option>
              <option value="active">{intl.formatMessage({ id: 'groupAdmin.admin.filter.active', defaultMessage: 'Active' })}</option>
              <option value="suspended">{intl.formatMessage({ id: 'groupAdmin.admin.filter.suspended', defaultMessage: 'Suspended' })}</option>
              <option value="banned">{intl.formatMessage({ id: 'groupAdmin.admin.filter.banned', defaultMessage: 'Banned' })}</option>
            </select>
            <select value={groupTypeFilter} onChange={(e) => setGroupTypeFilter(e.target.value)} className={UI.select}>
              <option value="all">{intl.formatMessage({ id: 'groupAdmin.admin.list.filter.allGroupTypes' })}</option>
              {GROUP_TYPES.map(type => (
                <option key={type.code} value={type.code}>{intl.formatMessage({ id: `groupAdmin.groupType.${type.code}` })}</option>
              ))}
            </select>
            <select value={groupSizeFilter} onChange={(e) => setGroupSizeFilter(e.target.value)} className={UI.select}>
              <option value="all">{intl.formatMessage({ id: 'groupAdmin.admin.list.filter.allSizes' })}</option>
              {GROUP_SIZES.map(size => (
                <option key={size.code} value={size.code}>{size.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions groupées */}
        {selectedIds.size > 0 && (
          <div className={UI.card + " p-4 flex items-center justify-between"}>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {intl.formatMessage({ id: 'groupAdmin.admin.list.selected' }, { count: selectedIds.size })}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => handleBulkAction('activate')} disabled={bulkActionLoading} className={`${UI.button.secondary} px-3 py-1 text-sm flex items-center gap-1`}>
                <Play className="w-4 h-4" /> {intl.formatMessage({ id: 'groupAdmin.admin.list.activate' })}
              </button>
              <button onClick={() => handleBulkAction('suspend')} disabled={bulkActionLoading} className={`${UI.button.secondary} px-3 py-1 text-sm flex items-center gap-1`}>
                <Pause className="w-4 h-4" /> {intl.formatMessage({ id: 'groupAdmin.admin.list.suspend' })}
              </button>
              <button onClick={() => handleBulkAction('block')} disabled={bulkActionLoading} className={`${UI.button.danger} px-3 py-1 text-sm flex items-center gap-1`}>
                <X className="w-4 h-4" /> {intl.formatMessage({ id: 'groupAdmin.admin.list.block' })}
              </button>
            </div>
          </div>
        )}

        {/* Tableau */}
        <div className={UI.card + " overflow-hidden"}>
          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : error ? (
            <div className="flex items-center justify-center p-12 text-red-500"><AlertTriangle className="w-6 h-6 mr-2" />{error}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input type="checkbox" checked={selectedIds.size === groupAdmins.length && groupAdmins.length > 0} onChange={selectAll} className="rounded" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{intl.formatMessage({ id: 'groupAdmin.admin.list.col.admin' })}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{intl.formatMessage({ id: 'groupAdmin.admin.list.col.group' })}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{intl.formatMessage({ id: 'groupAdmin.admin.list.col.typeSize' })}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{intl.formatMessage({ id: 'groupAdmin.admin.list.col.status' })}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" />Visible</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{intl.formatMessage({ id: 'groupAdmin.admin.list.col.clients' })}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{intl.formatMessage({ id: 'groupAdmin.admin.list.col.earnings' })}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">{intl.formatMessage({ id: 'groupAdmin.admin.list.col.lastLogin', defaultMessage: 'Dernière connexion' })}</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {groupAdmins.map(admin => (
                      <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer" onClick={() => navigate(`/admin/group-admins/${admin.id}`)}>
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(admin.id)} onChange={() => toggleSelection(admin.id)} className="rounded" />
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{admin.firstName} {admin.lastName}</p>
                            <p className="text-sm text-gray-500">{admin.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {admin.isGroupVerified && <span title="Verified"><Shield className="w-4 h-4 text-cyan-500" /></span>}
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{admin.groupName || intl.formatMessage({ id: 'groupAdmin.admin.list.na' })}</p>
                              {admin.groupUrl && (
                                <a href={admin.groupUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" />{intl.formatMessage({ id: 'groupAdmin.admin.list.viewGroup' })}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">{admin.groupType ? intl.formatMessage({ id: `groupAdmin.groupType.${admin.groupType}`, defaultMessage: admin.groupType }) : intl.formatMessage({ id: 'groupAdmin.admin.list.na' })}</p>
                            <p className="text-xs text-gray-500">{GROUP_SIZES.find(s => s.code === admin.groupSize)?.name || admin.groupSize || intl.formatMessage({ id: 'groupAdmin.admin.list.na' })}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">{getGroupAdminStatusBadge(admin.status)}</td>
                        {/* Toggle visibilité */}
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          {visibilityLoading.get(admin.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          ) : (
                            <button
                              onClick={() => handleToggleVisibility(admin.id, admin.isVisible)}
                              title={admin.isVisible ? 'Masquer du répertoire public' : 'Afficher dans le répertoire public'}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${admin.isVisible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${admin.isVisible ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-4"><p className="font-medium text-gray-900 dark:text-white">{admin.totalClients}</p></td>
                        <td className="px-4 py-4"><p className="font-medium text-green-600">{formatAmount(admin.totalEarned)}</p></td>
                        <td className="px-4 py-4 hidden xl:table-cell">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {admin.lastLoginAt
                              ? new Date(admin.lastLoginAt).toLocaleDateString(intl.locale, { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); void toggleFeatured(admin.id, !!admin.isFeatured); }}
                              disabled={featuredLoading === admin.id}
                              title={admin.isFeatured ? 'Retirer le badge Recommandé' : 'Attribuer le badge Recommandé'}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            >
                              {featuredLoading === admin.id
                                ? <span className="animate-spin inline-block w-3 h-3 border border-current rounded-full border-t-transparent" />
                                : <Star className={`w-4 h-4 ${admin.isFeatured ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                              }
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(admin); }}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                              title="Modifier le profil"
                            >
                              <Edit3 className="w-4 h-4 text-indigo-500" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/group-admin/tableau-de-bord?userId=${admin.id}`, '_blank'); }}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                              title="Voir le dashboard"
                            >
                              <ExternalLink className="w-4 h-4 text-blue-500" />
                            </button>
                            {/* Per-row moderation actions (dropdown) */}
                            <div className="relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === admin.id ? null : admin.id); }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Actions"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                              </button>
                              {openDropdownId === admin.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50" onClick={(e) => e.stopPropagation()}>
                                  {admin.status === 'active' && (
                                    <>
                                      <button
                                        onClick={() => { setOpenDropdownId(null); setActionModal({ groupAdmin: admin, action: 'suspend' }); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                                      >
                                        <Pause className="w-4 h-4" /> Suspendre
                                      </button>
                                      <button
                                        onClick={() => { setOpenDropdownId(null); setActionModal({ groupAdmin: admin, action: 'ban' }); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                      >
                                        <BanIcon className="w-4 h-4" /> Bannir
                                      </button>
                                    </>
                                  )}
                                  {admin.status === 'suspended' && (
                                    <>
                                      <button
                                        onClick={() => { setOpenDropdownId(null); setActionModal({ groupAdmin: admin, action: 'reactivate' }); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                      >
                                        <PlayCircle className="w-4 h-4" /> Réactiver
                                      </button>
                                      <button
                                        onClick={() => { setOpenDropdownId(null); setActionModal({ groupAdmin: admin, action: 'ban' }); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                      >
                                        <BanIcon className="w-4 h-4" /> Bannir
                                      </button>
                                    </>
                                  )}
                                  {admin.status === 'banned' && (
                                    <>
                                      <button
                                        onClick={() => { setOpenDropdownId(null); setActionModal({ groupAdmin: admin, action: 'reactivate' }); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                      >
                                        <PlayCircle className="w-4 h-4" /> Réactiver
                                      </button>
                                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                      <button
                                        onClick={() => { setOpenDropdownId(null); setActionModal({ groupAdmin: admin, action: 'delete' }); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" /> Supprimer
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-white/10">
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.list.showing' }, { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total })}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={`${UI.button.secondary} px-3 py-1 disabled:opacity-50`}>{intl.formatMessage({ id: 'groupAdmin.admin.list.previous' })}</button>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{intl.formatMessage({ id: 'groupAdmin.admin.list.page' }, { page, totalPages })}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={`${UI.button.secondary} px-3 py-1 disabled:opacity-50`}>{intl.formatMessage({ id: 'groupAdmin.admin.list.next' })}</button>
                  </div>
                </div>
              )}

              {groupAdmins.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                  <Users className="w-12 h-12 mb-4 opacity-50" />
                  <p>{intl.formatMessage({ id: 'groupAdmin.admin.list.noResults' })}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========== EDIT PROFILE MODAL ========== */}
      {editModal.isOpen && editModal.admin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Modifier — {editModal.admin.firstName} {editModal.admin.lastName}
                </h3>
              </div>
              <button onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
                  <input type="text" value={editModal.fields.firstName} onChange={(e) => handleEditField('firstName', e.target.value)} className={UI.input} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                  <input type="text" value={editModal.fields.lastName} onChange={(e) => handleEditField('lastName', e.target.value)} className={UI.input} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><Mail className="w-3.5 h-3.5 inline mr-1" />Email</label>
                  <input type="email" value={editModal.fields.email} onChange={(e) => handleEditField('email', e.target.value)} className={UI.input} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><Phone className="w-3.5 h-3.5 inline mr-1" />Téléphone</label>
                  <input type="tel" value={editModal.fields.phone} onChange={(e) => handleEditField('phone', e.target.value)} placeholder="+33 6 12 34 56 78" className={UI.input} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><Globe className="w-3.5 h-3.5 inline mr-1" />Pays</label>
                  <select value={editModal.fields.country} onChange={(e) => handleEditField('country', e.target.value)} className={UI.select}>
                    <option value="">— Sélectionner —</option>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><Languages className="w-3.5 h-3.5 inline mr-1" />Langue</label>
                  <select value={editModal.fields.language} onChange={(e) => handleEditField('language', e.target.value)} className={UI.select}>
                    <option value="">— Sélectionner —</option>
                  </select>
                </div>
              </div>
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 pt-2">Informations du groupe</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du groupe</label>
                  <input type="text" value={editModal.fields.groupName} onChange={(e) => handleEditField('groupName', e.target.value)} className={UI.input} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL du groupe</label>
                  <input type="url" value={editModal.fields.groupUrl} onChange={(e) => handleEditField('groupUrl', e.target.value)} placeholder="https://facebook.com/groups/..." className={UI.input} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type de groupe</label>
                  <select value={editModal.fields.groupType} onChange={(e) => handleEditField('groupType', e.target.value)} className={UI.select}>
                    <option value="">— Sélectionner —</option>
                    {GROUP_TYPES.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taille du groupe</label>
                  <select value={editModal.fields.groupSize} onChange={(e) => handleEditField('groupSize', e.target.value)} className={UI.select}>
                    <option value="">— Sélectionner —</option>
                    {GROUP_SIZES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pays du groupe</label>
                  <select value={editModal.fields.groupCountry} onChange={(e) => handleEditField('groupCountry', e.target.value)} className={UI.select}>
                    <option value="">— Sélectionner —</option>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Langue du groupe</label>
                  <input type="text" value={editModal.fields.groupLanguage} onChange={(e) => handleEditField('groupLanguage', e.target.value)} placeholder="fr, en..." className={UI.input} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"><AlertCircle className="w-3.5 h-3.5 inline mr-1" />Notes admin (internes)</label>
                <textarea value={editModal.fields.adminNotes} onChange={(e) => handleEditField('adminNotes', e.target.value)} className={`${UI.input} min-h-[80px] resize-y`} rows={3} placeholder="Notes visibles uniquement par les admins..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))} className={`${UI.button.secondary} px-4 py-2 text-sm`} disabled={editLoading}>Annuler</button>
              <button onClick={handleSaveProfile} disabled={editLoading} className={`${UI.button.primary} px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50`}>
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========== ACTION MODAL (Suspend / Ban / Reactivate / Delete) ========== */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between ${
              actionModal.action === 'delete' ? 'bg-red-50 dark:bg-red-900/20' :
              actionModal.action === 'ban' ? 'bg-red-50 dark:bg-red-900/20' :
              actionModal.action === 'suspend' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
              'bg-green-50 dark:bg-green-900/20'
            }`}>
              <div className="flex items-center gap-3">
                {actionModal.action === 'suspend' && <Pause className="w-5 h-5 text-yellow-600" />}
                {actionModal.action === 'ban' && <BanIcon className="w-5 h-5 text-red-600" />}
                {actionModal.action === 'reactivate' && <PlayCircle className="w-5 h-5 text-green-600" />}
                {actionModal.action === 'delete' && <Trash2 className="w-5 h-5 text-red-600" />}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {actionModal.action === 'suspend' && 'Suspendre le GroupAdmin'}
                  {actionModal.action === 'ban' && 'Bannir le GroupAdmin'}
                  {actionModal.action === 'reactivate' && 'Réactiver le GroupAdmin'}
                  {actionModal.action === 'delete' && 'Supprimer le GroupAdmin'}
                </h3>
              </div>
              <button onClick={() => { setActionModal(null); setActionReason(''); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {actionModal.action === 'suspend' && (
                  <>Vous allez suspendre <strong>{actionModal.groupAdmin.firstName} {actionModal.groupAdmin.lastName}</strong>. Ce GroupAdmin ne pourra plus accéder à son dashboard.</>
                )}
                {actionModal.action === 'ban' && (
                  <>Vous allez bannir <strong>{actionModal.groupAdmin.firstName} {actionModal.groupAdmin.lastName}</strong>. Ce GroupAdmin sera définitivement bloqué.</>
                )}
                {actionModal.action === 'reactivate' && (
                  <>Vous allez réactiver <strong>{actionModal.groupAdmin.firstName} {actionModal.groupAdmin.lastName}</strong>. Ce GroupAdmin pourra de nouveau accéder à son dashboard.</>
                )}
                {actionModal.action === 'delete' && (
                  <>Vous allez supprimer définitivement <strong>{actionModal.groupAdmin.firstName} {actionModal.groupAdmin.lastName}</strong>. Cette action est irréversible.</>
                )}
              </p>

              {actionModal.action === 'delete' && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    Attention : cette suppression est irréversible. Les documents group_admins et users seront supprimés.
                  </p>
                </div>
              )}

              {actionModal.action !== 'reactivate' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Raison <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className={`${UI.input} min-h-[80px] resize-y`}
                    rows={3}
                    placeholder={
                      actionModal.action === 'suspend' ? 'Ex: Non-respect des conditions, inactivité prolongée...' :
                      actionModal.action === 'ban' ? 'Ex: Fraude, spam, violation grave des CGU...' :
                      'Ex: Contenu inapproprié, compte frauduleux...'
                    }
                  />
                </div>
              )}

              {actionModal.action === 'reactivate' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raison (optionnelle)</label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className={`${UI.input} min-h-[60px] resize-y`}
                    rows={2}
                    placeholder="Ex: Après vérification, le compte est légitime..."
                  />
                </div>
              )}

              {actionModal.action === 'delete' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tapez <strong>SUPPRIMER</strong> pour confirmer
                  </label>
                  <input
                    type="text"
                    value={actionConfirmText}
                    onChange={(e) => setActionConfirmText(e.target.value)}
                    placeholder="SUPPRIMER"
                    className={`${UI.input} text-sm`}
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => { setActionModal(null); setActionReason(''); setActionConfirmText(''); }}
                className={`${UI.button.secondary} px-4 py-2 text-sm`}
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading || (actionModal.action === 'delete' && actionConfirmText !== 'SUPPRIMER')}
                className={`${
                  actionModal.action === 'reactivate' ? 'bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all' :
                  actionModal.action === 'suspend' ? 'bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-xl transition-all' :
                  UI.button.danger
                } px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50`}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    {actionModal.action === 'suspend' && <Pause className="w-4 h-4" />}
                    {actionModal.action === 'ban' && <BanIcon className="w-4 h-4" />}
                    {actionModal.action === 'reactivate' && <PlayCircle className="w-4 h-4" />}
                    {actionModal.action === 'delete' && <Trash2 className="w-4 h-4" />}
                  </>
                )}
                {actionModal.action === 'suspend' && 'Suspendre'}
                {actionModal.action === 'ban' && 'Bannir'}
                {actionModal.action === 'reactivate' && 'Réactiver'}
                {actionModal.action === 'delete' && 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminGroupAdminsList;
