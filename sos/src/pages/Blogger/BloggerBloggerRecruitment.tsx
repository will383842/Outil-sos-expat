/**
 * BloggerBloggerRecruitment - Blogger-to-Blogger Referral Program
 *
 * Shows:
 * - Recruitment link to share with other bloggers
 * - List of recruited bloggers with progress towards $200 threshold
 * - $50 bonus status for each recruit
 * - Summary stats
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { BloggerDashboardLayout } from '@/components/Blogger';
import { useBlogger } from '@/hooks/useBlogger';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
} from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

interface BloggerRecruitInfo {
  recruitId: string;
  recruitedId: string;
  recruitedName: string;
  recruitedEmail: string;
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

interface GetBloggerRecruitsResponse {
  success: boolean;
  recruits: BloggerRecruitInfo[];
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

const BloggerBloggerRecruitment: React.FC = () => {
  const intl = useIntl();
  const { blogger, isLoading: bloggerLoading, recruitmentShareUrl } = useBlogger();
  const [recruits, setRecruits] = useState<BloggerRecruitInfo[]>([]);
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

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  useEffect(() => {
    if (!bloggerLoading && blogger) {
      fetchRecruits();
    }
  }, [bloggerLoading, blogger]);

  const fetchRecruits = async () => {
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const getBloggerRecruits = httpsCallable<void, GetBloggerRecruitsResponse>(
        functions,
        'getBloggerRecruits'
      );

      const result = await getBloggerRecruits();

      if (result.data.success) {
        setRecruits(result.data.recruits);
        setSummary(result.data.summary);
        setThreshold(result.data.threshold);
        setBonusAmount(result.data.bonusAmount);
      } else {
        setError('Failed to load recruits');
      }
    } catch (err: any) {
      console.error('Error fetching recruits:', err);
      setError(err.message || 'Failed to load recruits');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(recruitmentShareUrl);
      toast.success(intl.formatMessage({ id: 'common.copied', defaultMessage: 'Copied!' }));
    } catch {
      toast.error(intl.formatMessage({ id: 'common.copyFailed', defaultMessage: 'Copy failed' }));
    }
  };

  if (bloggerLoading || loading) {
    return (
      <BloggerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </BloggerDashboardLayout>
    );
  }

  if (error) {
    return (
      <BloggerDashboardLayout>
        <div className="bg-red-50 dark:bg-red-900/20 border dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </BloggerDashboardLayout>
    );
  }

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage
              id="blogger.bloggerRecruitment.title"
              defaultMessage="Parrainez des Blogueurs"
            />
          </h1>
          <p className="text-gray-700 dark:text-gray-300">
            <FormattedMessage
              id="blogger.bloggerRecruitment.subtitle"
              defaultMessage="Gagnez $50 quand vos filleuls atteignent $200 de commissions"
            />
          </p>
        </div>

        {/* How it Works */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Gift className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-2">
                <FormattedMessage
                  id="blogger.bloggerRecruitment.howItWorks.title"
                  defaultMessage="Comment ça marche ?"
                />
              </h3>
              <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>
                    <FormattedMessage
                      id="blogger.bloggerRecruitment.howItWorks.step1"
                      defaultMessage="Partagez votre lien de parrainage avec d'autres blogueurs"
                    />
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>
                    <FormattedMessage
                      id="blogger.bloggerRecruitment.howItWorks.step2"
                      defaultMessage="Quand ils s'inscrivent avec votre lien, ils deviennent vos filleuls"
                    />
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>
                    <FormattedMessage
                      id="blogger.bloggerRecruitment.howItWorks.step3"
                      defaultMessage="Dès qu'un filleul atteint $200 en commissions directes (clients référés), vous recevez un bonus de $50 !"
                    />
                  </span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <FormattedMessage
                      id="blogger.bloggerRecruitment.howItWorks.note"
                      defaultMessage="Seules les commissions directes (clients référés par le blogueur filleul) comptent pour atteindre le seuil de $200. Le bonus de $50 est payé une seule fois par filleul."
                    />
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recruitment Link - Enhanced with action buttons */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6" />
            <span className="font-bold">
              <FormattedMessage
                id="blogger.bloggerRecruitment.linkTitle"
                defaultMessage="Votre lien de parrainage"
              />
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3 mb-4">
            <input
              type="text"
              readOnly
              value={recruitmentShareUrl}
              className="flex-1 bg-transparent text-white font-mono text-sm outline-none"
            />
            <button
              onClick={copyLink}
              className="bg-white text-purple-600 p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              title={intl.formatMessage({ id: 'common.copy', defaultMessage: 'Copier' })}
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <a
              href={recruitmentShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white text-purple-600 font-semibold py-3 px-4 rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              <FormattedMessage id="blogger.recruitment.viewInvitationPage" defaultMessage="Voir la page d'invitation" />
            </a>
            <button
              onClick={copyLink}
              className="flex-1 bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-lg hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-5 h-5" />
              <FormattedMessage id="common.copy" defaultMessage="Copier le lien" />
            </button>
          </div>

          <p className="text-purple-100 text-sm">
            <FormattedMessage
              id="blogger.bloggerRecruitment.shareLinkDesc"
              defaultMessage="Partagez ce lien avec d'autres blogueurs. Gagnez $50 quand ils atteignent $200 de commissions."
            />
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <FormattedMessage
                  id="blogger.bloggerRecruitment.stats.total"
                  defaultMessage="Total filleuls"
                />
              </span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl dark:text-white font-bold">{summary.totalRecruits}</p>
          </div>

          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <FormattedMessage
                  id="blogger.bloggerRecruitment.stats.active"
                  defaultMessage="Actifs (6 mois)"
                />
              </span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl dark:text-green-400 font-bold">{summary.activeRecruits}</p>
          </div>

          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <FormattedMessage
                  id="blogger.bloggerRecruitment.stats.bonusesPaid"
                  defaultMessage="Bonus payés"
                />
              </span>
              <Gift className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl dark:text-purple-400 font-bold">{summary.bonusesPaid}</p>
          </div>

          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <FormattedMessage
                  id="blogger.bloggerRecruitment.stats.totalEarned"
                  defaultMessage="Total gagné"
                />
              </span>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl dark:text-green-400 font-bold">
              {formatCurrency(summary.totalBonusEarned)}
            </p>
          </div>
        </div>

        {/* Recruits List */}
        <div className={`${UI.card} overflow-hidden`}>
          {recruits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider">
                      <FormattedMessage
                        id="blogger.bloggerRecruitment.table.blogger"
                        defaultMessage="Blogueur"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider">
                      <FormattedMessage
                        id="blogger.bloggerRecruitment.table.joined"
                        defaultMessage="Inscrit le"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider">
                      <FormattedMessage
                        id="blogger.bloggerRecruitment.table.progress"
                        defaultMessage="Progression"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider">
                      <FormattedMessage
                        id="blogger.bloggerRecruitment.table.earnings"
                        defaultMessage="Ses gains"
                      />
                    </th>
                    <th className="px-6 py-3 text-center text-xs text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider">
                      <FormattedMessage
                        id="blogger.bloggerRecruitment.table.bonus"
                        defaultMessage="Bonus $50"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {recruits.map((recruit) => (
                    <tr key={recruit.recruitId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-6 py-4">
                        <div className="text-sm dark:text-white font-medium">
                          {recruit.recruitedName}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                          {recruit.recruitedEmail}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(recruit.recruitedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span>{recruit.progressPercent}%</span>
                            <span>
                              {formatCurrency(recruit.totalDirectEarnings)} / {formatCurrency(recruit.threshold)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${recruit.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white font-medium">
                        {formatCurrency(recruit.totalDirectEarnings)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {recruit.bonusPaid ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
                              <CheckCircle className="w-4 h-4" />
                              <FormattedMessage
                                id="blogger.bloggerRecruitment.bonusPaid"
                                defaultMessage="Payé"
                              />
                            </span>
                            {recruit.bonusPaidAt && (
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {formatDate(recruit.bonusPaidAt)}
                              </span>
                            )}
                          </div>
                        ) : recruit.isActive ? (
                          <span className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 text-sm">
                            <Clock className="w-4 h-4" />
                            <FormattedMessage
                              id="blogger.bloggerRecruitment.bonusPending"
                              defaultMessage="En cours"
                            />
                          </span>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400 text-sm">
                            <FormattedMessage
                              id="blogger.bloggerRecruitment.windowExpired"
                              defaultMessage="Expiré"
                            />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                <FormattedMessage
                  id="blogger.bloggerRecruitment.empty"
                  defaultMessage="Vous n'avez pas encore parrainé de blogueur"
                />
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <FormattedMessage
                  id="blogger.bloggerRecruitment.emptyHint"
                  defaultMessage="Partagez votre lien de parrainage avec d'autres blogueurs pour commencer à gagner des bonus de $50 !"
                />
              </p>
            </div>
          )}
        </div>
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerBloggerRecruitment;
