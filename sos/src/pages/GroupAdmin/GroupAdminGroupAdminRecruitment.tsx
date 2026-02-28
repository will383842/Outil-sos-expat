/**
 * GroupAdminGroupAdminRecruitment - GroupAdmin-to-GroupAdmin Referral Program
 *
 * Shows:
 * - Recruitment link to share with other group admins
 * - List of recruited admins with progress towards $200 threshold
 * - $50 bonus status for each recruit
 * - Summary stats
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import SEOHead from '@/components/layout/SEOHead';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import toast from 'react-hot-toast';
import {
  Users,
  DollarSign,
  Copy,
  Loader2,
  CheckCircle,
  Clock,
  TrendingUp,
  Gift,
  Calendar,
  ExternalLink,
  Info,
  AlertCircle,
} from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

interface GroupAdminRecruitInfo {
  recruitId: string;
  recruitedId: string;
  recruitedName: string;
  recruitedEmail: string;
  recruitedGroupName: string;
  recruitedAt: string;
  commissionWindowEnd: string;
  isActive: boolean;
  totalDirectEarnings: number;
  progressPercent: number;
  threshold: number;
  bonusPaid: boolean;
  bonusAmount: number;
  bonusPaidAt: string | null;
  commissionId: string | null;
}

interface GetGroupAdminRecruitsResponse {
  success: boolean;
  recruits: GroupAdminRecruitInfo[];
  summary: {
    totalRecruits: number;
    activeRecruits: number;
    bonusesPaid: number;
    bonusesPending: number;
    totalBonusEarned: number;
  };
  threshold: number;
  bonusAmount: number;
}

const GroupAdminGroupAdminRecruitment: React.FC = () => {
  const intl = useIntl();
  const [recruits, setRecruits] = useState<GroupAdminRecruitInfo[]>([]);
  const [summary, setSummary] = useState({
    totalRecruits: 0,
    activeRecruits: 0,
    bonusesPaid: 0,
    bonusesPending: 0,
    totalBonusEarned: 0,
  });
  const [threshold, setThreshold] = useState(20000); // $200
  const [bonusAmount, setBonusAmount] = useState(5000); // $50
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recruitmentLink, setRecruitmentLink] = useState('');
  const [copied, setCopied] = useState(false);

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch recruits
      const getGroupAdminRecruits = httpsCallable<void, GetGroupAdminRecruitsResponse>(
        functionsAffiliate,
        'getGroupAdminRecruits'
      );
      const response = await getGroupAdminRecruits();
      const data = response.data;

      setRecruits(data.recruits);
      setSummary(data.summary);
      setThreshold(data.threshold);
      setBonusAmount(data.bonusAmount);

      // Fetch recruitment link
      const getDashboard = httpsCallable(functionsAffiliate, 'getGroupAdminDashboard');
      const dashboardResult = await getDashboard({});
      const dashboardData = dashboardResult.data as { profile: { affiliateCodeRecruitment: string } };
      const code = dashboardData.profile.affiliateCodeRecruitment;
      setRecruitmentLink(`${window.location.origin}/group-admin/inscription?ref=${code}`);
    } catch (err) {
      console.error('Error fetching recruits:', err);
      setError(intl.formatMessage({ id: 'groupAdmin.groupAdminRecruitment.error' }));
      toast.error(intl.formatMessage({ id: 'groupAdmin.groupAdminRecruitment.error' }));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(recruitmentLink);
      setCopied(true);
      toast.success(intl.formatMessage({ id: 'groupAdmin.groupAdminRecruitment.linkCopied' }));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(intl.formatMessage({ id: 'groupAdmin.groupAdminRecruitment.copyError' }));
    }
  };

  if (loading) {
    return (
      <GroupAdminDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </GroupAdminDashboardLayout>
    );
  }

  return (
    <GroupAdminDashboardLayout>
      <SEOHead
        title={intl.formatMessage({ id: 'groupAdmin.groupAdminRecruitment.title' })}
        description={intl.formatMessage({ id: 'groupAdmin.groupAdminRecruitment.subtitle' })}
      />

      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            <FormattedMessage id="groupAdmin.groupAdminRecruitment.title" />
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            <FormattedMessage id="groupAdmin.groupAdminRecruitment.subtitle" />
          </p>
        </div>

        {/* How It Works */}
        <div className={`${UI.card} p-6 mb-6`}>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Info className="w-6 h-6 text-purple-500" />
            <FormattedMessage id="groupAdmin.groupAdminRecruitment.howItWorks.title" />
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <p className="flex items-start gap-2">
              <span className="font-bold text-purple-600 dark:text-purple-400">1.</span>
              <FormattedMessage id="groupAdmin.groupAdminRecruitment.howItWorks.step1" />
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold text-purple-600 dark:text-purple-400">2.</span>
              <FormattedMessage id="groupAdmin.groupAdminRecruitment.howItWorks.step2" />
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold text-purple-600 dark:text-purple-400">3.</span>
              <FormattedMessage id="groupAdmin.groupAdminRecruitment.howItWorks.step3" />
            </p>
            <p className="text-sm italic text-amber-600 dark:text-amber-500 mt-4">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              <FormattedMessage id="groupAdmin.groupAdminRecruitment.howItWorks.note" />
            </p>
          </div>
        </div>

        {/* Recruitment Link */}
        <div className={`${UI.card} p-6 mb-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white`}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Gift className="w-6 h-6" />
            <FormattedMessage id="groupAdmin.groupAdminRecruitment.linkTitle" />
          </h2>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3 mb-4">
            <input
              type="text"
              readOnly
              value={recruitmentLink}
              className="flex-1 bg-transparent text-white font-mono text-sm outline-none"
            />
            <button
              onClick={copyLink}
              className="bg-white text-purple-600 p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              title={intl.formatMessage({ id: 'groupAdmin.groupAdminRecruitment.copyLink' })}
            >
              {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={recruitmentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white text-purple-600 font-semibold py-3 px-4 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              <FormattedMessage id="groupAdmin.groupAdminRecruitment.viewPage" />
            </a>
            <button
              onClick={copyLink}
              className="flex-1 bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <FormattedMessage id="groupAdmin.groupAdminRecruitment.linkCopied" />
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <FormattedMessage id="groupAdmin.groupAdminRecruitment.copyLink" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <FormattedMessage id="groupAdmin.groupAdminRecruitment.stats.total" />
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalRecruits}</p>
              </div>
              <Users className="w-10 h-10 text-purple-500 opacity-50" />
            </div>
          </div>

          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <FormattedMessage id="groupAdmin.groupAdminRecruitment.stats.active" />
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.activeRecruits}</p>
              </div>
              <Clock className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </div>

          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <FormattedMessage id="groupAdmin.groupAdminRecruitment.stats.bonusesPaid" />
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.bonusesPaid}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <FormattedMessage id="groupAdmin.groupAdminRecruitment.stats.totalEarned" />
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.totalBonusEarned)}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-amber-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Recruits List */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-500" />
            <FormattedMessage id="groupAdmin.groupAdminRecruitment.table.title" />
          </h2>

          {recruits.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                <FormattedMessage id="groupAdmin.groupAdminRecruitment.empty" />
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                <FormattedMessage id="groupAdmin.groupAdminRecruitment.emptyHint" />
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-white/10">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <FormattedMessage id="groupAdmin.groupAdminRecruitment.table.admin" />
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <FormattedMessage id="groupAdmin.groupAdminRecruitment.table.joined" />
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <FormattedMessage id="groupAdmin.groupAdminRecruitment.table.progress" />
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <FormattedMessage id="groupAdmin.groupAdminRecruitment.table.earnings" />
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <FormattedMessage id="groupAdmin.groupAdminRecruitment.table.bonus" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recruits.map((recruit) => (
                    <tr key={recruit.recruitId} className="border-b dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-4 px-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{recruit.recruitedName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{recruit.recruitedGroupName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{recruit.recruitedEmail}</p>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          {formatDate(recruit.recruitedAt)}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{recruit.progressPercent}%</span>
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {formatCurrency(recruit.totalDirectEarnings)} / {formatCurrency(recruit.threshold)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                recruit.progressPercent === 100
                                  ? 'bg-green-500'
                                  : recruit.progressPercent >= 75
                                  ? 'bg-blue-500'
                                  : recruit.progressPercent >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-purple-500'
                              }`}
                              style={{ width: `${recruit.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(recruit.totalDirectEarnings)}
                        </p>
                      </td>
                      <td className="py-4 px-2">
                        {recruit.bonusPaid ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
                              <CheckCircle className="w-4 h-4" />
                              <FormattedMessage id="groupAdmin.groupAdminRecruitment.bonusPaid" />
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatCurrency(recruit.bonusAmount)}
                            </span>
                          </div>
                        ) : recruit.isActive ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            <FormattedMessage id="groupAdmin.groupAdminRecruitment.bonusPending" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium">
                            <AlertCircle className="w-4 h-4" />
                            <FormattedMessage id="groupAdmin.groupAdminRecruitment.windowExpired" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminGroupAdminRecruitment;
