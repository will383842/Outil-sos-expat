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

const AdminGroupAdminDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const intl = useIntl();
  const functions = getFunctions(undefined, 'europe-west1');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<GroupAdminDetail | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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
      setError('Failed to load group admin details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

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
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-4 h-4" />
            Suspended
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
            Blocked
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
          <p>{error || 'GroupAdmin not found'}</p>
          <button
            onClick={() => navigate('/admin/group-admins')}
            className={`${UI.button.secondary} px-4 py-2 mt-4`}
          >
            Back to List
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Group */}
          <div className="lg:col-span-2 space-y-6">
            {/* Group Information */}
            <div className={UI.card + " p-6"}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Facebook className="w-5 h-5 text-blue-500" />
                  Group Information
                </h2>
                {admin.isGroupVerified ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                    <ShieldCheck className="w-4 h-4" />
                    Verified
                  </span>
                ) : (
                  <button
                    onClick={handleVerifyGroup}
                    disabled={actionLoading}
                    className={`${UI.button.primary} px-3 py-1 text-sm flex items-center gap-1`}
                  >
                    <Shield className="w-4 h-4" />
                    Verify Group
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Group Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.groupName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Group URL</p>
                  <a
                    href={admin.groupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Facebook
                  </a>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Group Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.groupType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Group Size</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.groupSize}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Target Country</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.groupCountry}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Group Language</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.groupLanguage}</p>
                </div>
                {admin.groupDescription && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-gray-900 dark:text-white">{admin.groupDescription}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Information */}
            <div className={UI.card + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.firstName} {admin.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Country</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.country}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Language</p>
                  <p className="font-medium text-gray-900 dark:text-white">{admin.language}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Joined</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(admin.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {/* Affiliate Codes */}
            <div className={UI.card + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Affiliate Codes
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Client Code</p>
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
                    <p className="text-sm text-gray-500">Recruitment Code</p>
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
                Recent Commissions
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
                <p className="text-gray-500 text-center py-4">No commissions yet</p>
              )}
            </div>
          </div>

          {/* Right Column - Stats & Actions */}
          <div className="space-y-6">
            {/* Balance Card */}
            <div className={UI.card + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Earnings
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Earned</span>
                  <span className="font-bold text-xl text-gray-900 dark:text-white">{formatAmount(admin.totalEarned)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Available</span>
                  <span className="font-medium text-green-600">{formatAmount(admin.availableBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pending</span>
                  <span className="font-medium text-yellow-600">{formatAmount(admin.pendingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Validated</span>
                  <span className="font-medium text-blue-600">{formatAmount(admin.validatedBalance)}</span>
                </div>
                <hr className="border-gray-200 dark:border-white/10" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Withdrawn</span>
                  <span className="font-medium text-gray-600">{formatAmount(admin.totalWithdrawn)}</span>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className={UI.card + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Statistics
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Clients</span>
                  <span className="font-bold text-xl text-gray-900 dark:text-white">{admin.totalClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Admins Recruited</span>
                  <span className="font-medium text-gray-900 dark:text-white">{admin.totalRecruits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Commissions</span>
                  <span className="font-medium text-gray-900 dark:text-white">{admin.totalCommissions}</span>
                </div>
                {admin.currentMonthRank && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Monthly Rank</span>
                    <span className="font-medium text-purple-600">#{admin.currentMonthRank}</span>
                  </div>
                )}
              </div>
            </div>

            {/* This Month */}
            <div className={UI.card + " p-6"}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                This Month ({admin.currentMonthStats.month})
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Clients</span>
                  <span className="font-medium text-gray-900 dark:text-white">{admin.currentMonthStats.clients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Recruits</span>
                  <span className="font-medium text-gray-900 dark:text-white">{admin.currentMonthStats.recruits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Earnings</span>
                  <span className="font-medium text-green-600">{formatAmount(admin.currentMonthStats.earnings)}</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            {admin.badges.length > 0 && (
              <div className={UI.card + " p-6"}>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Badges
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
                Actions
              </h2>
              <div className="space-y-2">
                {admin.status !== 'active' && (
                  <button
                    onClick={() => handleStatusChange('active')}
                    disabled={actionLoading}
                    className={`${UI.button.success} w-full px-4 py-2 flex items-center justify-center gap-2`}
                  >
                    <Play className="w-4 h-4" />
                    Activate
                  </button>
                )}
                {admin.status !== 'suspended' && (
                  <button
                    onClick={() => {
                      const reason = window.prompt('Suspension reason (optional):');
                      handleStatusChange('suspended', reason || undefined);
                    }}
                    disabled={actionLoading}
                    className={`${UI.button.secondary} w-full px-4 py-2 flex items-center justify-center gap-2`}
                  >
                    <Pause className="w-4 h-4" />
                    Suspend
                  </button>
                )}
                {admin.status !== 'blocked' && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to block this GroupAdmin?')) {
                        handleStatusChange('blocked');
                      }
                    }}
                    disabled={actionLoading}
                    className={`${UI.button.danger} w-full px-4 py-2 flex items-center justify-center gap-2`}
                  >
                    <Ban className="w-4 h-4" />
                    Block
                  </button>
                )}
              </div>

              {admin.suspensionReason && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>Suspension Reason:</strong> {admin.suspensionReason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminGroupAdminDetail;
