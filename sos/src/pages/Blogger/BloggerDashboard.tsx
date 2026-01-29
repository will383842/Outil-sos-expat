/**
 * BloggerDashboard - Main dashboard page for bloggers
 */

import React, { useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { BloggerDashboardLayout } from '@/components/Blogger';
import { useBlogger } from '@/hooks/useBlogger';
import {
  DollarSign,
  Users,
  TrendingUp,
  Trophy,
  Copy,
  ExternalLink,
  ArrowRight,
  Clock,
  CheckCircle,
  Loader2,
} from 'lucide-react';

const BloggerDashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const {
    dashboardData,
    blogger,
    commissions,
    isLoading,
    error,
    isBlogger,
    clientShareUrl,
    recruitmentShareUrl,
    totalBalance,
    canWithdraw,
  } = useBlogger();

  // Redirect if not a blogger
  useEffect(() => {
    if (!isLoading && !isBlogger) {
      navigate('/blogger/inscription');
    }
  }, [isLoading, isBlogger, navigate]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Show toast notification
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isLoading) {
    return (
      <BloggerDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </BloggerDashboardLayout>
    );
  }

  if (error) {
    return (
      <BloggerDashboardLayout>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </BloggerDashboardLayout>
    );
  }

  if (!blogger) return null;

  const stats = dashboardData?.monthlyStats || { earnings: 0, clients: 0, recruits: 0, rank: null };

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            <FormattedMessage
              id="blogger.dashboard.welcome"
              defaultMessage="Bonjour, {name} !"
              values={{ name: blogger.firstName }}
            />
          </h1>
          <p className="text-purple-100">
            <FormattedMessage
              id="blogger.dashboard.welcomeSubtitle"
              defaultMessage="Bienvenue dans votre espace blogueur partenaire"
            />
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Balance */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                <FormattedMessage id="blogger.dashboard.balance" defaultMessage="Solde disponible" />
              </span>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${(blogger.availableBalance / 100).toFixed(2)}
            </p>
            {canWithdraw && (
              <button
                onClick={() => navigate('/blogger/paiements')}
                className="text-sm text-purple-600 hover:text-purple-700 mt-2 flex items-center gap-1"
              >
                <FormattedMessage id="blogger.dashboard.withdraw" defaultMessage="Retirer" />
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Monthly Earnings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                <FormattedMessage id="blogger.dashboard.monthlyEarnings" defaultMessage="Gains ce mois" />
              </span>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${(stats.earnings / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <FormattedMessage
                id="blogger.dashboard.monthlyTotal"
                defaultMessage="Total: ${total}"
                values={{ total: (blogger.totalEarned / 100).toFixed(2) }}
              />
            </p>
          </div>

          {/* Clients */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                <FormattedMessage id="blogger.dashboard.clients" defaultMessage="Clients référés" />
              </span>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.clients}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <FormattedMessage
                id="blogger.dashboard.totalClients"
                defaultMessage="Total: {total}"
                values={{ total: blogger.totalClients }}
              />
            </p>
          </div>

          {/* Rank */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                <FormattedMessage id="blogger.dashboard.rank" defaultMessage="Classement" />
              </span>
              <Trophy className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.rank ? `#${stats.rank}` : '-'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <FormattedMessage id="blogger.dashboard.top10" defaultMessage="Top 10 mensuel" />
            </p>
          </div>
        </div>

        {/* Affiliate Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="blogger.dashboard.affiliateLinks" defaultMessage="Vos liens d'affiliation" />
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Client Link */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FormattedMessage id="blogger.dashboard.clientLink" defaultMessage="Lien client (10$/appel)" />
                </span>
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded">
                  {blogger.affiliateCodeClient}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={clientShareUrl}
                  readOnly
                  className="flex-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
                />
                <button
                  onClick={() => copyToClipboard(clientShareUrl)}
                  className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={clientShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Recruitment Link */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FormattedMessage id="blogger.dashboard.recruitLink" defaultMessage="Lien recrutement (5$/appel, 6 mois)" />
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded">
                  {blogger.affiliateCodeRecruitment}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={recruitmentShareUrl}
                  readOnly
                  className="flex-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
                />
                <button
                  onClick={() => copyToClipboard(recruitmentShareUrl)}
                  className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={recruitmentShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Commissions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="blogger.dashboard.recentCommissions" defaultMessage="Commissions récentes" />
            </h2>
            <button
              onClick={() => navigate('/blogger/gains')}
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <FormattedMessage id="blogger.dashboard.viewAll" defaultMessage="Voir tout" />
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {dashboardData?.recentCommissions && dashboardData.recentCommissions.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.recentCommissions.slice(0, 5).map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      commission.status === 'available' ? 'bg-green-100 dark:bg-green-900/30' :
                      commission.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {commission.status === 'available' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {commission.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-green-600">
                    +${(commission.amount / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              <FormattedMessage
                id="blogger.dashboard.noCommissions"
                defaultMessage="Aucune commission pour le moment. Partagez vos liens pour commencer à gagner !"
              />
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/blogger/ressources')}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-5 text-left hover:from-purple-600 hover:to-purple-700 transition-all"
          >
            <h3 className="font-semibold mb-1">
              <FormattedMessage id="blogger.dashboard.resourcesCta" defaultMessage="Ressources exclusives" />
            </h3>
            <p className="text-sm text-purple-100">
              <FormattedMessage
                id="blogger.dashboard.resourcesDesc"
                defaultMessage="Logos, images et textes prêts à l'emploi"
              />
            </p>
          </button>

          <button
            onClick={() => navigate('/blogger/guide')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-5 text-left hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            <h3 className="font-semibold mb-1">
              <FormattedMessage id="blogger.dashboard.guideCta" defaultMessage="Guide d'intégration" />
            </h3>
            <p className="text-sm text-blue-100">
              <FormattedMessage
                id="blogger.dashboard.guideDesc"
                defaultMessage="Templates d'articles et textes à copier"
              />
            </p>
          </button>
        </div>
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerDashboard;
