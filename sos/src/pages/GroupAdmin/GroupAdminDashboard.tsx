/**
 * GroupAdminDashboard - Main Dashboard for Facebook Group Administrators
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { useAuth } from '@/contexts/AuthContext';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import SEOHead from '@/components/layout/SEOHead';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import {
  DollarSign,
  Users,
  TrendingUp,
  Copy,
  CheckCircle,
  ExternalLink,
  Bell,
  ArrowRight,
  Loader2,
  Award,
  Image,
  FileText,
  CreditCard,
  BarChart3,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import {
  GroupAdmin,
  GroupAdminCommission,
  GroupAdminRecruit,
  GroupAdminNotification,
  GroupAdminLeaderboardEntry,
  GroupAdminDashboardResponse,
  formatGroupAdminAmount,
  getGroupAdminAffiliateLink,
  getGroupAdminRecruitmentLink,
  GROUP_ADMIN_BADGES,
} from '@/types/groupAdmin';

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================
const CardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-white/5 rounded-xl p-6 shadow-sm dark:shadow-none dark:border dark:border-white/10 animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/3 mb-4" />
    <div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-1/2 mb-2" />
    <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-2/3" />
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const GroupAdminDashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<GroupAdminDashboardResponse | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const getDashboard = httpsCallable(functions, 'getGroupAdminDashboard');
      const result = await getDashboard({});
      setDashboardData(result.data as GroupAdminDashboardResponse);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <GroupAdminDashboardLayout>
        <SEOHead title={intl.formatMessage({ id: 'groupAdmin.dashboard.loading', defaultMessage: 'Loading Dashboard...' })} description="Group Admin Dashboard - SOS-Expat" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </GroupAdminDashboardLayout>
    );
  }

  if (error || !dashboardData) {
    return (
      <GroupAdminDashboardLayout>
        <div className="flex items-center justify-center p-4 min-h-[60vh]">
          <div className="bg-white dark:bg-white/5 rounded-xl p-8 max-w-md w-full text-center shadow-lg dark:shadow-none dark:border dark:border-white/10">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <FormattedMessage id="groupAdmin.dashboard.error.title" defaultMessage="Error Loading Dashboard" />
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={fetchDashboard}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg"
            >
              <FormattedMessage id="groupAdmin.dashboard.error.retry" defaultMessage="Retry" />
            </button>
          </div>
        </div>
      </GroupAdminDashboardLayout>
    );
  }

  const { profile, recentCommissions, recentRecruits, notifications, leaderboard } = dashboardData;
  const affiliateLink = getGroupAdminAffiliateLink(profile.affiliateCodeClient);
  const recruitmentLink = getGroupAdminRecruitmentLink(profile.affiliateCodeRecruitment);

  return (
    <GroupAdminDashboardLayout>
      <SEOHead title={intl.formatMessage({ id: 'groupAdmin.dashboard.title', defaultMessage: 'Dashboard | SOS-Expat Group Admin' })} description="Manage your Facebook group and earn commissions with SOS-Expat" />

      <div>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              <FormattedMessage
                id="groupAdmin.dashboard.welcome"
                defaultMessage="Welcome, {name}!"
                values={{ name: profile.firstName }}
              />
            </h1>
            <p className="text-gray-600">
              <FormattedMessage
                id="groupAdmin.dashboard.groupInfo"
                defaultMessage="Managing {groupName}"
                values={{ groupName: profile.groupName }}
              />
              {profile.isGroupVerified && (
                <span className="inline-flex items-center gap-1 ml-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <FormattedMessage id="groupAdmin.dashboard.verified" defaultMessage="Verified" />
                </span>
              )}
            </p>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Available Balance */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-green-100">
                  <FormattedMessage id="groupAdmin.dashboard.availableBalance" defaultMessage="Available Balance" />
                </span>
                <DollarSign className="w-6 h-6 text-green-200" />
              </div>
              <div className="text-3xl font-bold mb-2">{formatGroupAdminAmount(profile.availableBalance)}</div>
              <button
                onClick={() => navigate('/group-admin/paiements')}
                className="text-sm text-green-100 hover:text-white flex items-center gap-1"
              >
                <FormattedMessage id="groupAdmin.dashboard.withdraw" defaultMessage="Withdraw" />
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Pending Balance */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500">
                  <FormattedMessage id="groupAdmin.dashboard.pendingBalance" defaultMessage="Pending" />
                </span>
                <TrendingUp className="w-6 h-6 text-amber-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{formatGroupAdminAmount(profile.pendingBalance)}</div>
              <p className="text-sm text-gray-500">
                <FormattedMessage id="groupAdmin.dashboard.pendingInfo" defaultMessage="Processing..." />
              </p>
            </div>

            {/* Total Earned */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500">
                  <FormattedMessage id="groupAdmin.dashboard.totalEarned" defaultMessage="Total Earned" />
                </span>
                <Award className="w-6 h-6 text-purple-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{formatGroupAdminAmount(profile.totalEarned)}</div>
              <p className="text-sm text-gray-500">
                {profile.totalClients} <FormattedMessage id="groupAdmin.dashboard.clients" defaultMessage="clients" /> · {profile.totalRecruits} <FormattedMessage id="groupAdmin.dashboard.recruits" defaultMessage="recruits" />
              </p>
            </div>
          </div>

          {/* Affiliate Links */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
            <h2 className="text-lg font-bold mb-4">
              <FormattedMessage id="groupAdmin.dashboard.affiliateLinks" defaultMessage="Your Affiliate Links" />
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Client Link */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-2">
                  <FormattedMessage id="groupAdmin.dashboard.clientLink" defaultMessage="Client link ($15 per client)" />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={affiliateLink}
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(affiliateLink, 'client')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg"
                  >
                    {copiedCode === 'client' ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Recruitment Link */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-2">
                  <FormattedMessage id="groupAdmin.dashboard.recruitLink" defaultMessage="Recruitment link ($5 per recruit)" />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={recruitmentLink}
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(recruitmentLink, 'recruit')}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg"
                  >
                    {copiedCode === 'recruit' ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <button
              onClick={() => navigate('/group-admin/ressources')}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-2"
            >
              <Image className="w-8 h-8 text-blue-500" />
              <span className="text-sm font-medium">
                <FormattedMessage id="groupAdmin.dashboard.resources" defaultMessage="Resources" />
              </span>
            </button>
            <button
              onClick={() => navigate('/group-admin/posts')}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-2"
            >
              <FileText className="w-8 h-8 text-green-500" />
              <span className="text-sm font-medium">
                <FormattedMessage id="groupAdmin.dashboard.posts" defaultMessage="Posts" />
              </span>
            </button>
            <button
              onClick={() => navigate('/group-admin/classement')}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-2"
            >
              <BarChart3 className="w-8 h-8 text-purple-500" />
              <span className="text-sm font-medium">
                <FormattedMessage id="groupAdmin.dashboard.leaderboard" defaultMessage="Leaderboard" />
              </span>
            </button>
            <button
              onClick={() => navigate('/group-admin/guide')}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-2"
            >
              <BookOpen className="w-8 h-8 text-amber-500" />
              <span className="text-sm font-medium">
                <FormattedMessage id="groupAdmin.dashboard.guide" defaultMessage="Guide" />
              </span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Recent Commissions */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">
                  <FormattedMessage id="groupAdmin.dashboard.recentCommissions" defaultMessage="Recent Commissions" />
                </h3>
                <button onClick={() => navigate('/group-admin/paiements')} className="text-indigo-600 text-sm hover:underline">
                  <FormattedMessage id="groupAdmin.dashboard.viewAll" defaultMessage="View all" />
                </button>
              </div>
              {recentCommissions.length > 0 ? (
                <div className="space-y-3">
                  {recentCommissions.slice(0, 5).map((commission) => (
                    <div key={commission.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="font-medium text-sm">{commission.description}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(commission.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`font-bold ${commission.status === 'available' ? 'text-green-600' : 'text-amber-600'}`}>
                        {formatGroupAdminAmount(commission.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  <FormattedMessage id="groupAdmin.dashboard.noCommissions" defaultMessage="No commissions yet. Share your link!" />
                </p>
              )}
            </div>

            {/* Leaderboard Preview */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">
                  <FormattedMessage id="groupAdmin.dashboard.leaderboardPreview" defaultMessage="Monthly Leaderboard" />
                </h3>
                <button onClick={() => navigate('/group-admin/classement')} className="text-indigo-600 text-sm hover:underline">
                  <FormattedMessage id="groupAdmin.dashboard.viewAll" defaultMessage="View all" />
                </button>
              </div>
              {leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.slice(0, 5).map((entry) => (
                    <div key={entry.groupAdminId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                          entry.rank === 2 ? 'bg-gray-100 text-gray-700' :
                          entry.rank === 3 ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {entry.rank}
                        </div>
                        <span className="font-medium text-sm">{entry.groupAdminName}</span>
                      </div>
                      <div className="font-bold text-green-600">{formatGroupAdminAmount(entry.earnings)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  <FormattedMessage id="groupAdmin.dashboard.noLeaderboard" defaultMessage="Leaderboard not available yet" />
                </p>
              )}
              {profile.currentMonthRank && (
                <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-center">
                  <span className="text-sm text-indigo-700">
                    <FormattedMessage
                      id="groupAdmin.dashboard.yourRank"
                      defaultMessage="Your rank: #{rank}"
                      values={{ rank: profile.currentMonthRank }}
                    />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          {profile.badges.length > 0 && (
            <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold mb-4">
                <FormattedMessage id="groupAdmin.dashboard.badges" defaultMessage="Your Badges" />
              </h3>
              <div className="flex flex-wrap gap-3">
                {profile.badges.map((badgeType) => {
                  const badge = GROUP_ADMIN_BADGES[badgeType];
                  return (
                    <div
                      key={badgeType}
                      className="bg-gray-50 rounded-lg px-4 py-2 flex items-center gap-2"
                      title={badge.description}
                    >
                      <span className="text-xl">{badge.icon}</span>
                      <span className="font-medium text-sm">{badge.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminDashboard;
