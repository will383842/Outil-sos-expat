/**
 * AdminGroupAdminDetail - Detailed view for a specific GroupAdmin
 * Features: Profile info, group info, commissions history, actions
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  ArrowLeft,
  User,
  Mail,
  Globe,
  Calendar,
  DollarSign,
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Play,
  Pause,
  Ban,
  Shield,
  ShieldCheck,
  ExternalLink,
  Facebook,
  Copy,
  RefreshCw,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
    success: "bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all",
  },
} as const;

interface GroupAdminDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country: string;
  language: string;
  status: string;
  adminNotes?: string;
  suspensionReason?: string;

  // Group info
  groupUrl: string;
  groupName: string;
  groupType: string;
  groupSize: string;
  groupCountry: string;
  groupLanguage: string;
  groupDescription?: string;
  isGroupVerified: boolean;
  groupVerifiedAt?: string;

  // Affiliate codes
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;

  // Balances
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalWithdrawn: number;

  // Stats
  totalClients: number;
  totalRecruits: number;
  totalCommissions: number;
  currentMonthStats: {
    clients: number;
    recruits: number;
    earnings: number;
    month: string;
  };
  currentMonthRank: number | null;

  // Badges
  badges: string[];

  // Timestamps
  createdAt: string;
  lastLoginAt?: string;
}

interface Commission {
  id: string;
  type: string;
  amount: number;
  status: string;
  sourceType?: string;
  description?: string;
  createdAt: string;
}

interface Recruit {
  id: string;
  recruitedId: string;
  recruitedName: string;
  recruitedEmail: string;
  recruitedGroupName: string;
  recruitedAt: string;
  commissionWindowEnd: string;
  commissionPaid: boolean;
  recruitedTotalEarned: number;
  threshold: number;
  progressPercent: number;
  computedStatus: 'pending' | 'eligible' | 'paid' | 'expired';
}

const AdminGroupAdminDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const intl = useIntl();
  const functions = getFunctions(undefined, 'europe-west2');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<GroupAdminDetail | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'recruits'>('overview');
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [recruitsLoading, setRecruitsLoading] = useState(false);

  // Fetch admin details
  const fetchDetails = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const getDetail = httpsCallable(functions, 'adminGetGroupAdminDetail');
      const result = await getDetail({ groupAdminId: id });
      const data = result.data as { groupAdmin: GroupAdminDetail; commissions: Commission[] };
      setAdmin(data.groupAdmin);
      setCommissions(data.commissions || []);
    } catch (err) {
      console.error('Error fetching group admin:', err);
      setError(intl.formatMessage({ id: 'groupAdmin.admin.detail.error' }));
    } finally {
      setLoading(false);
    }
  };

  const fetchRecruits = async () => {
    if (!id) return;
    setRecruitsLoading(true);
    try {
      const getRecruits = httpsCallable(functions, 'adminGetGroupAdminRecruits');
      const result = await getRecruits({ recruiterId: id });
      const data = result.data as { recruits: Recruit[] };
      setRecruits(data.recruits || []);
    } catch (err) {
      console.error('Error fetching recruits:', err);
    } finally {
      setRecruitsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'recruits' && recruits.length === 0 && !recruitsLoading) {
      fetchRecruits();
    }
  }, [activeTab]);

  // Update status
  const handleStatusChange = async (newStatus: 'active' | 'suspended' | 'blocked', reason?: string) => {
    if (!admin) return;

    setActionLoading(true);
    try {
      const updateStatus = httpsCallable(functions, 'adminUpdateGroupAdminStatus');
      await updateStatus({
        groupAdminId: admin.id,
        status: newStatus,
        reason,
      });
      fetchDetails();
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Verify group
  const handleVerifyGroup = async () => {
    if (!admin) return;

    setActionLoading(true);
    try {
      const verifyGroup = httpsCallable(functions, 'adminVerifyGroup');
      await verifyGroup({ groupAdminId: admin.id });
      fetchDetails();
    } catch (err) {
      console.error('Error verifying group:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            {intl.formatMessage({ id: 'groupAdmin.status.active' })}
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-4 h-4" />
            {intl.formatMessage({ id: 'groupAdmin.status.suspended' })}
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
            {intl.formatMessage({ id: 'groupAdmin.status.blocked' })}
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !admin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-screen text-red-500">
          <AlertTriangle className="w-12 h-12 mb-4" />
          <p>{error || intl.formatMessage({ id: 'groupAdmin.admin.detail.notFound' })}</p>
          <button
            onClick={() => navigate('/admin/group-admins')}
            className={`${UI.button.secondary} px-4 py-2 mt-4`}
          >
            {intl.formatMessage({ id: 'groupAdmin.admin.detail.backToList' })}
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/group-admins')}
            className={`${UI.button.secondary} p-2`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Facebook className="w-6 h-6 text-blue-500" />
              {admin.firstName} {admin.lastName}
            </h1>
            <p className="text-gray-500">{admin.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(admin.status)}
            <button onClick={fetchDetails} className={`${UI.button.secondary} p-2`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-white/10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {intl.formatMessage({ id: 'groupAdmin.admin.detail.overview' })}
          </button>
          <button
            onClick={() => setActiveTab('recruits')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'recruits'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            {intl.formatMessage({ id: 'groupAdmin.admin.detail.recruits' })}
            {admin.totalRecruits > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                {admin.totalRecruits}
              </span>
            )}
          </button>
        </div>

        {/* Recruits Tab */}
        {activeTab === 'recruits' && (
          <div className={UI.card + " p-6"}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              {intl.formatMessage({ id: 'groupAdmin.admin.detail.recruitedAdmins' })}
            </h2>
            {recruitsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : recruits.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{intl.formatMessage({ id: 'groupAdmin.admin.detail.noRecruits' })}</p>
            ) : (
              <div className="space-y-3">
                {recruits.map(recruit => (
                  <div key={recruit.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{recruit.recruitedName}</p>
                        <p className="text-sm text-gray-500">{recruit.recruitedEmail}</p>
                        {recruit.recruitedGroupName && (
                          <p className="text-xs text-gray-400">{recruit.recruitedGroupName}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {recruit.computedStatus === 'paid' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" /> {intl.formatMessage({ id: 'groupAdmin.admin.detail.recruitStatus.paid' })}
                          </span>
                        )}
                        {recruit.computedStatus === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400">
                            <Clock className="w-3 h-3" /> {intl.formatMessage({ id: 'groupAdmin.admin.detail.recruitStatus.pending' })}
                          </span>
                        )}
                        {recruit.computedStatus === 'eligible' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            <CheckCircle className="w-3 h-3" /> {intl.formatMessage({ id: 'groupAdmin.admin.detail.recruitStatus.eligible' })}
                          </span>
                        )}
                        {recruit.computedStatus === 'expired' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <AlertTriangle className="w-3 h-3" /> {intl.formatMessage({ id: 'groupAdmin.admin.detail.recruitStatus.expired' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{intl.formatMessage({ id: 'groupAdmin.admin.detail.progress' }, { earned: formatAmount(recruit.recruitedTotalEarned), threshold: formatAmount(recruit.threshold) })}</span>
                        <span>{recruit.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            recruit.progressPercent >= 100
                              ? 'bg-green-500'
                              : recruit.progressPercent >= 50
                                ? 'bg-blue-500'
                                : 'bg-orange-400'
                          }`}
                          style={{ width: `${recruit.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{intl.formatMessage({ id: 'groupAdmin.admin.detail.recruited' }, { date: formatDate(recruit.recruitedAt) })}</span>
                      <span>{intl.formatMessage({ id: 'groupAdmin.admin.detail.windowEnds' }, { date: formatDate(recruit.commissionWindowEnd) })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Group */}
          <div className="lg:col-span-2 space-y-6">
            {/* Group Information */}
            <div className={UI.card + " p-6"}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Facebook className="w-5 h-5 text-blue-500" />
                  {intl.formatMessage({ id: 'groupAdmin.admin.detail.groupInfo' })}
                </h2>
                {admin.isGroupVerified ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                    <ShieldCheck className="w-4 h-4" />
                    {intl.formatMessage({ id: 'groupAdmin.admin.detail.verified' })}
                  </span>
                ) : (
                  <button
                    onClick={handleVerifyGroup}
                    disabled={actionLoading}
                    className={`${UI.button.primary} px-3 py-1 text-sm flex items-center gap-1`}
                  >
                    <Shield className="w-4 h-4" />
                    {intl.formatMessage({ id: 'groupAdmin.admin.detail.verifyGroup' })}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.groupName' })}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.groupName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.groupUrl' })}</p>
                  <a
                    href={admin.groupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {intl.formatMessage({ id: 'groupAdmin.admin.detail.viewOnFacebook' })}
                  </a>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.groupType' })}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.groupType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.groupSize' })}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.groupSize}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.targetCountry' })}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.groupCountry}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.groupLanguage' })}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.groupLanguage}</p>
                </div>
                {admin.groupDescription && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.description' })}</p>
                    <p className="text-gray-900 dark:text-white">{admin.groupDescription}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Information */}
            <div className={UI.card + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                {intl.formatMessage({ id: 'groupAdmin.admin.detail.personalInfo' })}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.fullName' })}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.firstName} {admin.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.email' })}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.country' })}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.country}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.language' })}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.language}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.joined' })}</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(admin.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.lastLogin' })}</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : intl.formatMessage({ id: 'groupAdmin.admin.detail.never' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Affiliate Codes */}
            <div className={UI.card + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {intl.formatMessage({ id: 'groupAdmin.admin.detail.affiliateCodes' })}
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.clientCode' })}</p>
                    <p className="font-mono font-medium text-gray-900 dark:text-white">{admin.affiliateCodeClient}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(admin.affiliateCodeClient, 'client')}
                    className={`${UI.button.secondary} p-2`}
                  >
                    {copied === 'client' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.recruitmentCode' })}</p>
                    <p className="font-mono font-medium text-gray-900 dark:text-white">{admin.affiliateCodeRecruitment}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(admin.affiliateCodeRecruitment, 'recruit')}
                    className={`${UI.button.secondary} p-2`}
                  >
                    {copied === 'recruit' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Commissions */}
            <div className={UI.card + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {intl.formatMessage({ id: 'groupAdmin.admin.detail.recentCommissions' })}
              </h2>
              {commissions.length > 0 ? (
                <div className="space-y-2">
                  {commissions.slice(0, 10).map(commission => (
                    <div key={commission.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{commission.type}</p>
                        <p className="text-sm text-gray-500">{formatDate(commission.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">{formatAmount(commission.amount)}</p>
                        <p className="text-xs text-gray-500">{commission.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">{intl.formatMessage({ id: 'groupAdmin.admin.detail.noCommissions' })}</p>
              )}
            </div>
          </div>

          {/* Right Column - Stats & Actions */}
          <div className="space-y-6">
            {/* Balance Card */}
            <div className={UI.card + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                {intl.formatMessage({ id: 'groupAdmin.admin.detail.earnings' })}
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.totalEarned' })}</span>
                  <span className="font-bold text-xl text-gray-900 dark:text-white">{formatAmount(admin.totalEarned)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.available' })}</span>
                  <span className="font-medium text-green-600">{formatAmount(admin.availableBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.pending' })}</span>
                  <span className="font-medium text-yellow-600">{formatAmount(admin.pendingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.validated' })}</span>
                  <span className="font-medium text-blue-600">{formatAmount(admin.validatedBalance)}</span>
                </div>
                <hr className="border-gray-200 dark:border-white/10" />
                <div className="flex justify-between">
                  <span className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.withdrawn' })}</span>
                  <span className="font-medium text-gray-600">{formatAmount(admin.totalWithdrawn)}</span>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className={UI.card + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                {intl.formatMessage({ id: 'groupAdmin.admin.detail.statistics' })}
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.totalClients' })}</span>
                  <span className="font-bold text-xl text-gray-900 dark:text-white">{admin.totalClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.adminsRecruited' })}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{admin.totalRecruits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.totalCommissions' })}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{admin.totalCommissions}</span>
                </div>
                {admin.currentMonthRank && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.monthlyRank' })}</span>
                    <span className="font-medium text-purple-600">#{admin.currentMonthRank}</span>
                  </div>
                )}
              </div>
            </div>

            {/* This Month */}
            <div className={UI.card + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {intl.formatMessage({ id: 'groupAdmin.admin.detail.thisMonth' }, { month: admin.currentMonthStats.month })}
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.clients' })}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{admin.currentMonthStats.clients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.recruits' })}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{admin.currentMonthStats.recruits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.detail.earnings' })}</span>
                  <span className="font-medium text-green-600">{formatAmount(admin.currentMonthStats.earnings)}</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            {admin.badges.length > 0 && (
              <div className={UI.card + " p-6"}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {intl.formatMessage({ id: 'groupAdmin.admin.detail.badges' })}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {admin.badges.map(badge => (
                    <span key={badge} className="px-3 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={UI.card + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {intl.formatMessage({ id: 'groupAdmin.admin.detail.actions' })}
              </h2>
              <div className="space-y-2">
                {admin.status !== 'active' && (
                  <button
                    onClick={() => handleStatusChange('active')}
                    disabled={actionLoading}
                    className={`${UI.button.success} w-full px-4 py-2 flex items-center justify-center gap-2`}
                  >
                    <Play className="w-4 h-4" />
                    {intl.formatMessage({ id: 'groupAdmin.admin.detail.activate' })}
                  </button>
                )}
                {admin.status !== 'suspended' && (
                  <button
                    onClick={() => {
                      const reason = window.prompt(intl.formatMessage({ id: 'groupAdmin.admin.detail.suspensionPrompt' }));
                      handleStatusChange('suspended', reason || undefined);
                    }}
                    disabled={actionLoading}
                    className={`${UI.button.secondary} w-full px-4 py-2 flex items-center justify-center gap-2`}
                  >
                    <Pause className="w-4 h-4" />
                    {intl.formatMessage({ id: 'groupAdmin.admin.detail.suspend' })}
                  </button>
                )}
                {admin.status !== 'blocked' && (
                  <button
                    onClick={() => {
                      if (window.confirm(intl.formatMessage({ id: 'groupAdmin.admin.detail.blockConfirm' }))) {
                        handleStatusChange('blocked');
                      }
                    }}
                    disabled={actionLoading}
                    className={`${UI.button.danger} w-full px-4 py-2 flex items-center justify-center gap-2`}
                  >
                    <Ban className="w-4 h-4" />
                    {intl.formatMessage({ id: 'groupAdmin.admin.detail.block' })}
                  </button>
                )}
              </div>

              {admin.suspensionReason && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>{intl.formatMessage({ id: 'groupAdmin.admin.detail.suspensionReason' })}</strong> {admin.suspensionReason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>}
      </div>
    </AdminLayout>
  );
};

export default AdminGroupAdminDetail;
