/**
 * AdminChatterDetail - Admin page for viewing and managing a single chatter
 * Shows detailed info, commissions, withdrawals, and admin actions
 */

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from "@/config/firebase";
import {
  ArrowLeft,
  User,
  Star,
  Flame,
  Wallet,
  Users,
  Phone,
  Mail,
  Globe,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Ban,
  PlayCircle,
  Loader2,
  RefreshCw,
  Crown,
  Shield,
  UserPlus,
  X,
  Search,
  ChevronDown,
  Pencil,
  Save,
  MessageCircle,
  Copy,
  Check,
  Link2,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import AdminErrorState from '@/components/admin/AdminErrorState';
import { copyToClipboard as clipboardCopy } from '@/utils/clipboard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { StatusType } from '@/components/admin/StatusBadge';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
    success: "bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all",
  },
} as const;

interface CaptainOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
}

interface ChatterDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  country: string;
  language?: string;
  languages: string[];
  status: string;
  level?: number;
  role?: string;
  captainId?: string | null;
  captainInfo?: { id: string; firstName: string; lastName: string; email: string } | null;
  captainQualityBonusEnabled?: boolean;
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalClients?: number;
  totalRecruits?: number;
  totalClientCalls?: number;
  totalClientConversions: number;
  totalRecruitmentConversions: number;
  currentStreak: number;
  bestStreak: number;
  affiliateCode?: string;
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
  recruitedByCode?: string;
  suspendedAt?: string;
  suspendReason?: string;
  createdAt: string;
  quizPassedAt?: string;
  commissions: any[];
  withdrawals: any[];
  lockedRates?: Record<string, number>;
  individualRates?: Record<string, number>;
  commissionPlanName?: string;
  rateLockDate?: string;
  bio?: string;
  adminNotes?: string;
  hasTelegram?: boolean;
  telegramUsername?: string;
}

const RATE_FIELDS = [
  { key: 'commissionClientCallAmount', label: 'Client (générique)', default: 300 },
  { key: 'commissionClientCallAmountLawyer', label: 'Client (avocat)', default: 500 },
  { key: 'commissionClientCallAmountExpat', label: 'Client (expat)', default: 300 },
  { key: 'commissionN1CallAmount', label: 'N1 (filleul)', default: 100 },
  { key: 'commissionN2CallAmount', label: 'N2 (filleul N2)', default: 50 },
  { key: 'commissionActivationBonusAmount', label: 'Bonus activation', default: 500 },
  { key: 'commissionN1RecruitBonusAmount', label: 'Bonus recrutement N1', default: 100 },
  { key: 'commissionProviderCallAmount', label: 'Recrutement prestataire', default: 500 },
] as const;

const AdminChatterDetail: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { chatterId } = useParams<{ chatterId: string }>();

  const [chatter, setChatter] = useState<ChatterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [ratesEditing, setRatesEditing] = useState(false);
  const [ratesForm, setRatesForm] = useState<Record<string, number>>({});
  const [ratesSaving, setRatesSaving] = useState(false);

  // Profile editing state
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState<Record<string, string>>({});
  const [profileSaving, setProfileSaving] = useState(false);

  // Captain assignment state
  const [captainDropdownOpen, setCaptainDropdownOpen] = useState(false);
  const [captainSearch, setCaptainSearch] = useState('');
  const [availableCaptains, setAvailableCaptains] = useState<CaptainOption[]>([]);
  const [captainsLoading, setCaptainsLoading] = useState(false);
  const [captainAssigning, setCaptainAssigning] = useState(false);
  const captainDropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside handler for captain dropdown
  useEffect(() => {
    if (!captainDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (captainDropdownRef.current && !captainDropdownRef.current.contains(e.target as Node)) {
        setCaptainDropdownOpen(false);
        setCaptainSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [captainDropdownOpen]);

  // Fetch chatter detail
  const fetchChatter = async () => {
    if (!chatterId) return;

    setLoading(true);
    setError(null);

    try {
      const adminGetChatterDetail = httpsCallable<{ chatterId: string }, ChatterDetail>(
        functionsAffiliate,
        'adminGetChatterDetail'
      );

      const result = await adminGetChatterDetail({ chatterId });
      setChatter(result.data);
    } catch (err: any) {
      console.error('Error fetching chatter:', err);
      setError(err.message || 'Failed to load chatter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatter();
  }, [chatterId]);

  // Format amount
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
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

  // Handle status change
  const handleStatusChange = async (newStatus: string, reason?: string) => {
    if (!chatterId || !chatter) return;

    setActionLoading(true);

    try {
      const adminUpdateChatterStatus = httpsCallable(functionsAffiliate, 'adminUpdateChatterStatus');
      await adminUpdateChatterStatus({
        chatterId,
        status: newStatus,
        reason,
      });

      // Refresh data
      await fetchChatter();
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast.error(err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch available captains for dropdown
  const fetchAvailableCaptains = async () => {
    setCaptainsLoading(true);
    try {
      const fn = httpsCallable<Record<string, never>, { captains: CaptainOption[] }>(
        functionsAffiliate,
        'adminGetAvailableCaptains'
      );
      const result = await fn({});
      setAvailableCaptains(result.data.captains);
    } catch (err: any) {
      console.error('Error fetching captains:', err);
    } finally {
      setCaptainsLoading(false);
    }
  };

  // Assign/unassign captain
  const handleAssignCaptain = async (captainId: string | null) => {
    if (!chatterId) return;
    setCaptainAssigning(true);
    try {
      const fn = httpsCallable<{ chatterId: string; captainId: string | null }, { success: boolean; captainName: string | null }>(
        functionsAffiliate,
        'adminAssignChatterCaptain'
      );
      const result = await fn({ chatterId, captainId });
      toast.success(
        captainId
          ? `Capitaine ${result.data.captainName} assigne`
          : 'Capitaine retire'
      );
      setCaptainDropdownOpen(false);
      setCaptainSearch('');
      await fetchChatter();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'assignation');
    } finally {
      setCaptainAssigning(false);
    }
  };

  // Open captain dropdown and load captains
  const openCaptainDropdown = () => {
    setCaptainDropdownOpen(true);
    if (availableCaptains.length === 0) {
      fetchAvailableCaptains();
    }
  };

  // Handle locked rates save
  const handleSaveRates = async () => {
    if (!chatterId) return;
    setRatesSaving(true);
    try {
      const fn = httpsCallable<{ chatterId: string; lockedRates: Record<string, number> }, { success: boolean }>(
        functionsAffiliate,
        'adminUpdateChatterLockedRates'
      );
      await fn({ chatterId, lockedRates: ratesForm });
      toast.success('Taux mis à jour');
      setRatesEditing(false);
      await fetchChatter();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setRatesSaving(false);
    }
  };

  const startEditRates = () => {
    const currentRates: Record<string, number> = {};
    for (const field of RATE_FIELDS) {
      currentRates[field.key] = chatter?.individualRates?.[field.key] ?? chatter?.lockedRates?.[field.key] ?? field.default;
    }
    setRatesForm(currentRates);
    setRatesEditing(true);
  };

  // Profile editing
  const startEditProfile = () => {
    if (!chatter) return;
    setProfileForm({
      firstName: chatter.firstName || '',
      lastName: chatter.lastName || '',
      email: chatter.email || '',
      phone: chatter.phone || '',
      whatsapp: chatter.whatsapp || '',
      country: chatter.country || '',
      language: chatter.language || '',
      bio: chatter.bio || '',
      adminNotes: chatter.adminNotes || '',
    });
    setProfileEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!chatterId || !chatter) return;
    setProfileSaving(true);
    try {
      const fn = httpsCallable<Record<string, string>, { success: boolean; message: string }>(
        functionsAffiliate,
        'adminUpdateChatterProfile'
      );

      // Only send changed fields
      const updates: Record<string, string> = { chatterId };
      const editableFields = ['firstName', 'lastName', 'email', 'phone', 'whatsapp', 'country', 'language', 'bio', 'adminNotes'];
      for (const field of editableFields) {
        const original = (chatter as any)[field] || '';
        if (profileForm[field] !== undefined && profileForm[field] !== original) {
          updates[field] = profileForm[field];
        }
      }

      if (Object.keys(updates).length <= 1) {
        toast('Aucune modification');
        setProfileEditing(false);
        setProfileSaving(false);
        return;
      }

      await fn(updates);
      toast.success('Profil mis à jour');
      setProfileEditing(false);
      await fetchChatter();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setProfileSaving(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    );
  }

  if (error || !chatter) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/admin/chatters')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <FormattedMessage id="common.back" defaultMessage="Retour" />
        </button>

        <AdminErrorState error={error || 'Chatter not found'} onRetry={fetchChatter} />
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/chatters')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="w-4 h-4" />
        <FormattedMessage id="common.back" defaultMessage="Retour" />
      </button>

      {/* Header */}
      <div className={`${UI.card} p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
              {chatter.firstName?.[0]}{chatter.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {chatter.firstName} {chatter.lastName}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={mapChatterStatus(chatter.status)} label={chatter.status} size="sm" />
                {chatter.level != null && (
                  <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Star className="w-4 h-4 text-red-500" />
                    {getLevelName(chatter.level)}
                  </span>
                )}
                {(chatter as any).role === 'captainChatter' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    <Crown className="w-3.5 h-3.5" />
                    Capitaine
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchChatter}
              className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {chatter.status === 'active' && (
              <button
                onClick={() => {
                  const reason = prompt('Raison de la suspension:');
                  if (reason) handleStatusChange('suspended', reason);
                }}
                disabled={actionLoading}
                className={`${UI.button.danger} px-4 py-2 flex items-center gap-2`}
              >
                <Ban className="w-4 h-4" />
                <FormattedMessage id="admin.chatters.suspend" defaultMessage="Suspendre" />
              </button>
            )}

            {chatter.status === 'suspended' && (
              <button
                onClick={() => handleStatusChange('active')}
                disabled={actionLoading}
                className={`${UI.button.success} px-4 py-2 flex items-center gap-2`}
              >
                <PlayCircle className="w-4 h-4" />
                <FormattedMessage id="admin.chatters.reactivate" defaultMessage="Réactiver" />
              </button>
            )}

            {chatter.status !== 'banned' && (
              <button
                onClick={() => {
                  // TODO: Replace window.confirm with a proper confirmation Dialog component
                  if (window.confirm('Êtes-vous sûr de vouloir bannir ce chatter ?')) {
                    handleStatusChange('banned', 'Banni par admin');
                  }
                }}
                disabled={actionLoading}
                className={`${UI.button.danger} px-4 py-2 flex items-center gap-2`}
              >
                <XCircle className="w-4 h-4" />
                <FormattedMessage id="admin.chatters.ban" defaultMessage="Bannir" />
              </button>
            )}

            {/* Captain Actions */}
            {chatter.status === 'active' && (chatter as any).role !== 'captainChatter' && (
              <button
                onClick={async () => {
                  if (!window.confirm('Promouvoir ce chatter en Capitaine Chatter ?')) return;
                  try {
                    const fn = httpsCallable(functionsAffiliate, 'adminPromoteToCaptain');
                    await fn({ chatterId: chatter.id });
                    toast.success('Chatter promu capitaine !');
                    fetchChatter();
                  } catch (err: any) {
                    toast.error(err.message || 'Erreur');
                  }
                }}
                disabled={actionLoading}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-xl transition-all px-4 py-2 flex items-center gap-2"
              >
                <Crown className="w-4 h-4" />
                <FormattedMessage id="admin.chatters.promoteCaptain" defaultMessage="Promote Captain" />
              </button>
            )}

            {(chatter as any).role === 'captainChatter' && (
              <>
                <button
                  onClick={async () => {
                    try {
                      const fn = httpsCallable(functionsAffiliate, 'adminToggleCaptainQualityBonus');
                      await fn({ chatterId: chatter.id, enabled: !(chatter as any).captainQualityBonusEnabled });
                      toast.success('Bonus qualité mis à jour');
                      fetchChatter();
                    } catch (err: any) {
                      toast.error(err.message || 'Erreur');
                    }
                  }}
                  disabled={actionLoading}
                  className={`${(chatter as any).captainQualityBonusEnabled ? UI.button.success : UI.button.secondary} px-4 py-2 flex items-center gap-2`}
                >
                  <Shield className="w-4 h-4" />
                  {(chatter as any).captainQualityBonusEnabled ? 'Bonus Qualité ON' : 'Bonus Qualité OFF'}
                </button>
                <button
                  onClick={async () => {
                    if (!window.confirm('Révoquer le statut de capitaine ?')) return;
                    try {
                      const fn = httpsCallable(functionsAffiliate, 'adminRevokeCaptain');
                      await fn({ chatterId: chatter.id });
                      toast.success('Statut capitaine révoqué');
                      fetchChatter();
                    } catch (err: any) {
                      toast.error(err.message || 'Erreur');
                    }
                  }}
                  disabled={actionLoading}
                  className={`${UI.button.danger} px-4 py-2 flex items-center gap-2`}
                >
                  <Crown className="w-4 h-4" />
                  <FormattedMessage id="admin.chatters.revokeCaptain" defaultMessage="Revoke Captain" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.chatters.contact" defaultMessage="Contact" />
            </h3>
            {!profileEditing ? (
              <button onClick={startEditProfile} className={`${UI.button.secondary} px-2 py-1 text-xs flex items-center gap-1`}>
                <Pencil className="w-3 h-3" /> Modifier
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={() => setProfileEditing(false)}
                  className={`${UI.button.secondary} px-2 py-1 text-xs`}
                  disabled={profileSaving}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveProfile}
                  className={`${UI.button.primary} px-2 py-1 text-xs flex items-center gap-1`}
                  disabled={profileSaving}
                >
                  {profileSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Sauver
                </button>
              </div>
            )}
          </div>

          {profileEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Prénom</label>
                <input
                  type="text"
                  value={profileForm.firstName || ''}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Nom</label>
                <input
                  type="text"
                  value={profileForm.lastName || ''}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Email</label>
                <input
                  type="email"
                  value={profileForm.email || ''}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Téléphone
                </label>
                <input
                  type="tel"
                  value={profileForm.phone || ''}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </label>
                <input
                  type="tel"
                  value={profileForm.whatsapp || ''}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Pays</label>
                <input
                  type="text"
                  value={profileForm.country || ''}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Langue</label>
                <input
                  type="text"
                  value={profileForm.language || ''}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, language: e.target.value }))}
                  placeholder="fr, en, es..."
                  className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Notes admin</label>
                <textarea
                  value={profileForm.adminNotes || ''}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, adminNotes: e.target.value }))}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 text-sm bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{chatter.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{chatter.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  {chatter.whatsapp ? `WhatsApp: ${chatter.whatsapp}` : 'WhatsApp: -'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{chatter.country}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  {new Date(chatter.createdAt).toLocaleDateString(intl.locale)}
                </span>
              </div>
              {chatter.hasTelegram && chatter.telegramUsername && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.97 9.269c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.054 5.56-5.023c.242-.213-.054-.334-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.832.954z"/></svg>
                  <span className="text-gray-700 dark:text-gray-300">@{chatter.telegramUsername}</span>
                </div>
              )}
              {chatter.adminNotes && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">Notes admin</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{chatter.adminNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Balance */}
        <div className={`${UI.card} p-6`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="admin.chatters.balance" defaultMessage="Solde" />
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Disponible</span>
              <span className="font-semibold text-green-600">{formatAmount(chatter.availableBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Validé</span>
              <span className="font-medium">{formatAmount(chatter.validatedBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">En attente</span>
              <span className="font-medium text-red-600">{formatAmount(chatter.pendingBalance)}</span>
            </div>
            <hr className="border-gray-200 dark:border-white/10" />
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Total gagné</span>
              <span className="font-bold text-lg">{formatAmount(chatter.totalEarned)}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={`${UI.card} p-6`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="admin.chatters.stats" defaultMessage="Statistiques" />
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Clients convertis</span>
              <span className="font-semibold">{chatter.totalClients || chatter.totalClientConversions || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Partenaires</span>
              <span className="font-semibold">{chatter.totalRecruits || chatter.totalRecruitmentConversions || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">Streak actuel</span>
              <span className="flex items-center gap-1 font-semibold">
                <Flame className={`w-4 h-4 ${chatter.currentStreak > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
                {chatter.currentStreak}j
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Record streak</span>
              <span className="font-semibold">{chatter.bestStreak}j</span>
            </div>
          </div>
        </div>
      </div>

      {/* Affiliate Link (Unified) */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-red-500" />
          <FormattedMessage id="admin.chatters.codes" defaultMessage="Lien d'affiliation" />
        </h3>
        <div className="space-y-3">
          <div className="p-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Code unifié</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400 font-mono tracking-wider">
              {chatter.affiliateCode || chatter.affiliateCodeClient || '-'}
            </p>
          </div>
          {(chatter.affiliateCode || chatter.affiliateCodeClient) && (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 dark:bg-white/5 px-3 py-2 rounded-lg text-xs overflow-x-auto">
                https://sos-expat.com/r/{chatter.affiliateCode || chatter.affiliateCodeClient}
              </code>
              <button
                onClick={() => {
                  clipboardCopy(`https://sos-expat.com/r/${chatter.affiliateCode || chatter.affiliateCodeClient}`);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
              >
                <Copy className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>
        {chatter.recruitedByCode && (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Recruté par: <span className="font-medium">{chatter.recruitedByCode}</span>
          </p>
        )}
      </div>

      {/* Captain Assignment */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          <FormattedMessage id="admin.chatters.captain.assigned" defaultMessage="Assigned Captain" />
        </h3>

        {/* Current captain display */}
        {(chatter as any).captainInfo ? (
          <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                {(chatter as any).captainInfo.firstName?.[0]}{(chatter as any).captainInfo.lastName?.[0]}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {(chatter as any).captainInfo.firstName} {(chatter as any).captainInfo.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(chatter as any).captainInfo.email}
                </p>
              </div>
              <Crown className="w-4 h-4 text-yellow-500 ml-1" />
            </div>
            <button
              onClick={() => handleAssignCaptain(null)}
              disabled={captainAssigning}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title={intl.formatMessage({ id: 'admin.chatters.captain.remove', defaultMessage: 'Remove captain' })}
            >
              {captainAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </button>
          </div>
        ) : (chatter as any).captainId ? (
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl mb-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Capitaine ID: <span className="font-mono text-xs">{(chatter as any).captainId}</span>
            </p>
            <button
              onClick={() => handleAssignCaptain(null)}
              disabled={captainAssigning}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title={intl.formatMessage({ id: 'admin.chatters.captain.remove', defaultMessage: 'Remove captain' })}
            >
              {captainAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">
            <FormattedMessage id="admin.chatters.captain.none" defaultMessage="No captain assigned" />
          </p>
        )}

        {/* Captain selector dropdown */}
        <div className="relative" ref={captainDropdownRef}>
          <button
            onClick={openCaptainDropdown}
            className={`${UI.button.secondary} px-4 py-2.5 w-full flex items-center justify-between gap-2 text-sm`}
          >
            <span className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              {(chatter as any).captainInfo
                ? intl.formatMessage({ id: 'admin.chatters.captain.change', defaultMessage: 'Change captain' })
                : intl.formatMessage({ id: 'admin.chatters.captain.assign', defaultMessage: 'Assign a captain' })}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${captainDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {captainDropdownOpen && (
            <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="p-3 border-b border-gray-100 dark:border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={captainSearch}
                    onChange={(e) => setCaptainSearch(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'admin.chatters.captain.search', defaultMessage: 'Search for a captain...' })}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Options list */}
              <div className="max-h-60 overflow-y-auto">
                {captainsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                  </div>
                ) : (
                  <>
                    {availableCaptains
                      .filter((c) => {
                        if (!captainSearch) return true;
                        const q = captainSearch.toLowerCase();
                        return (
                          c.firstName.toLowerCase().includes(q) ||
                          c.lastName.toLowerCase().includes(q) ||
                          c.email.toLowerCase().includes(q) ||
                          c.country?.toLowerCase().includes(q)
                        );
                      })
                      .filter((c) => c.id !== chatter.id) // Don't show self
                      .map((captain) => {
                        const isCurrentCaptain = (chatter as any).captainId === captain.id;
                        return (
                          <button
                            key={captain.id}
                            onClick={() => handleAssignCaptain(captain.id)}
                            disabled={captainAssigning || isCurrentCaptain}
                            className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                              isCurrentCaptain
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 cursor-default'
                                : 'hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                              {captain.firstName?.[0]}{captain.lastName?.[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                {captain.firstName} {captain.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {captain.email} {captain.country ? `· ${captain.country}` : ''}
                              </p>
                            </div>
                            {isCurrentCaptain && (
                              <CheckCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            )}
                            {captainAssigning && !isCurrentCaptain && (
                              <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}

                    {availableCaptains.length === 0 && !captainsLoading && (
                      <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        <FormattedMessage id="admin.chatters.captain.noneAvailable" defaultMessage="No captain available" />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Close button */}
              <div className="p-2 border-t border-gray-100 dark:border-white/10">
                <button
                  onClick={() => { setCaptainDropdownOpen(false); setCaptainSearch(''); }}
                  className="w-full px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-center"
                >
                  <FormattedMessage id="admin.chatters.captain.close" defaultMessage="Close" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Locked Rates (Commission Plan Override) */}
      <div className={`${UI.card} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Taux de commission (individualRates)
          </h3>
          {!ratesEditing ? (
            <button
              onClick={startEditRates}
              className={`${UI.button.secondary} px-3 py-1.5 text-sm`}
            >
              Modifier
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setRatesEditing(false)}
                className={`${UI.button.secondary} px-3 py-1.5 text-sm`}
                disabled={ratesSaving}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveRates}
                className={`${UI.button.primary} px-3 py-1.5 text-sm`}
                disabled={ratesSaving}
              >
                {ratesSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sauvegarder'}
              </button>
            </div>
          )}
        </div>
        {chatter.commissionPlanName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Plan: {chatter.commissionPlanName} {chatter.rateLockDate && `(verrouillé le ${new Date(chatter.rateLockDate).toLocaleDateString(intl.locale)})`}
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {RATE_FIELDS.map(field => {
            const currentValue = chatter.individualRates?.[field.key] ?? chatter.lockedRates?.[field.key];
            return (
              <div key={field.key} className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <p className="text-[10px] uppercase font-medium text-gray-400 dark:text-gray-500 mb-1">{field.label}</p>
                {ratesEditing ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={(ratesForm[field.key] / 100).toFixed(2)}
                      onChange={(e) => setRatesForm(prev => ({
                        ...prev,
                        [field.key]: Math.round(parseFloat(e.target.value || '0') * 100),
                      }))}
                      className="w-full px-2 py-1 text-sm bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg"
                    />
                  </div>
                ) : (
                  <p className={`text-lg font-bold ${currentValue != null ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {currentValue != null ? formatAmount(currentValue) : `(${formatAmount(field.default)})`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {!chatter.individualRates && !chatter.lockedRates && !ratesEditing && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Pas de taux verrouillés — utilise la config globale (entre parenthèses)
          </p>
        )}
      </div>

      {/* Recent Commissions */}
      <div className={`${UI.card} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            <FormattedMessage id="admin.chatters.recentCommissions" defaultMessage="Commissions récentes" />
          </h3>
        </div>
        {chatter.commissions?.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <FormattedMessage id="admin.chatters.noCommissions" defaultMessage="Aucune commission" />
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {chatter.commissions?.slice(0, 10).map((c: any) => (
              <div key={c.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {c.type === 'client' ? 'Commission Client' : 'Commission Recrutement'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString(intl.locale)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">+{formatAmount(c.amount)}</p>
                  <StatusBadge status={mapChatterStatus(c.status)} label={c.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </AdminLayout>
  );
};

export default AdminChatterDetail;
