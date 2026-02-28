/**
 * BloggerDashboard - Main dashboard page for bloggers
 */

import React, { useEffect, lazy, Suspense } from 'react';
import { trackMetaViewContent, trackMetaLead } from '@/utils/metaPixel';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { BloggerDashboardLayout } from '@/components/Blogger';
import { useBlogger } from '@/hooks/useBlogger';
import toast from 'react-hot-toast';
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

const NotificationBell = lazy(() =>
  import('@/components/shared/NotificationBell').then(m => ({ default: m.NotificationBell }))
);

const BloggerDashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const { user } = useAuth();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const {
    dashboardData,
    blogger,
    commissions,
    notifications,
    isLoading,
    error,
    isBlogger,
    clientShareUrl,
    recruitmentShareUrl,
    totalBalance,
    canWithdraw,
    markNotificationRead,
    markAllNotificationsRead,
    unreadNotificationsCount,
  } = useBlogger();

  const telegramRoute = `/${getTranslatedRouteSlug('blogger-telegram' as RouteKey, langCode)}`;

  // Telegram onboarding check (mandatory for withdrawals)
  useEffect(() => {
    if (user && !user.telegramOnboardingCompleted) {
      navigate(telegramRoute, { replace: true });
    }
  }, [user, navigate, telegramRoute]);

  // Redirect if not a blogger
  useEffect(() => {
    if (!isLoading && !isBlogger) {
      navigate('/blogger/inscription');
    }
  }, [isLoading, isBlogger, navigate]);

  // Meta Pixel - ViewContent on dashboard mount
  useEffect(() => {
    trackMetaViewContent({ content_name: 'blogger_dashboard', content_category: 'affiliate' });
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(intl.formatMessage({ id: 'common.copied', defaultMessage: 'Copied!' }));
    } catch {
      toast.error(intl.formatMessage({ id: 'common.copyFailed', defaultMessage: 'Copy failed' }));
    }
  };

  if (isLoading) {
    return (
      <BloggerDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 dark:text-purple-400" />
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

  if (!blogger) return null;

  const stats = dashboardData?.monthlyStats || { earnings: 0, clients: 0, recruits: 0, rank: null };

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
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
            <Suspense fallback={<div className="w-10 h-10" />}>
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadNotificationsCount}
                onMarkAsRead={markNotificationRead}
                onMarkAllAsRead={markAllNotificationsRead}
              />
            </Suspense>
          </div>
        </div>

        {/* Stats Cards - Mobile optimized with 2x2 grid on mobile */}
        <div className="grid lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Balance */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-gray-700 dark:text-gray-700 sm:text-sm font-medium">
                <FormattedMessage id="blogger.dashboard.balance" defaultMessage="Solde disponible" />
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-xl dark:text-white sm:text-2xl font-bold">
              ${(blogger.availableBalance / 100).toFixed(2)}
            </p>
            {canWithdraw && (
              <button
                onClick={() => {
                  trackMetaLead({ content_name: 'withdrawal_intent', content_category: 'affiliate_withdrawal' });
                  navigate('/blogger/paiements');
                }}
                className="text-sm hover:text-purple-700 mt-2 flex items-center gap-1 min-h-[44px] active:opacity-70"
              >
                <FormattedMessage id="blogger.dashboard.withdraw" defaultMessage="Retirer" />
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Monthly Earnings */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-gray-700 dark:text-gray-700 sm:text-sm">
                <FormattedMessage id="blogger.dashboard.monthlyEarnings" defaultMessage="Gains ce mois" />
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xl dark:text-white sm:text-2xl font-bold">
              ${(stats.earnings / 100).toFixed(2)}
            </p>
            <p className="text-xs dark:text-gray-600 mt-1">
              <FormattedMessage
                id="blogger.dashboard.monthlyTotal"
                defaultMessage="Total: ${total}"
                values={{ total: (blogger.totalEarned / 100).toFixed(2) }}
              />
            </p>
          </div>

          {/* Clients */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-gray-700 dark:text-gray-700 sm:text-sm">
                <FormattedMessage id="blogger.dashboard.clients" defaultMessage="Clients référés" />
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-xl dark:text-white sm:text-2xl font-bold">
              {stats.clients}
            </p>
            <p className="text-xs dark:text-gray-600 mt-1">
              <FormattedMessage
                id="blogger.dashboard.totalClients"
                defaultMessage="Total: {total}"
                values={{ total: blogger.totalClients }}
              />
            </p>
          </div>

          {/* Rank */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-gray-700 dark:text-gray-700 sm:text-sm">
                <FormattedMessage id="blogger.dashboard.rank" defaultMessage="Classement" />
              </span>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-500" />
              </div>
            </div>
            <p className="text-xl dark:text-white sm:text-2xl font-bold">
              {stats.rank ? `#${stats.rank}` : '-'}
            </p>
            <p className="text-xs dark:text-gray-600 mt-1">
              <FormattedMessage id="blogger.dashboard.top10" defaultMessage="Top 10 mensuel" />
            </p>
          </div>
        </div>

        {/* Affiliate Links - Mobile optimized with 48px touch targets */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border dark:border-gray-700">
          <h2 className="text-lg dark:text-white font-semibold mb-4">
            <FormattedMessage id="blogger.dashboard.affiliateLinks" defaultMessage="Vos liens d'affiliation" />
          </h2>

          <div className="space-y-4 md:space-y-0 md:grid md:gap-4">
            {/* Client Link */}
            <div className="bg-gradient-to-br from-green-50 dark:from-green-900/20 to-green-100 dark:to-green-800/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm dark:text-white font-semibold">
                  <FormattedMessage id="blogger.dashboard.clientLink" defaultMessage="Lien client (10$/appel)" />
                </span>
                <span className="text-sm dark:text-green-300 font-bold bg-green-200 dark:bg-green-800/50 px-3 py-1.5 rounded-full">
                  {blogger.affiliateCodeClient}
                </span>
              </div>
              {/* Mobile: Stack vertically, Desktop: Row */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={clientShareUrl}
                  readOnly
                  className="w-full text-sm bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl px-4 py-3 min-h-[48px]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(clientShareUrl)}
                    className="flex-1 min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white rounded-xl items-center justify-center gap-2 font-medium transition-colors active:scale-[0.98]"
                  >
                    <Copy className="w-5 h-5" />
                    <span className="sm:inline">
                      <FormattedMessage id="common.copy" defaultMessage="Copier" />
                    </span>
                  </button>
                  <a
                    href={clientShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[48px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors active:scale-[0.98]"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Recruitment Link */}
            <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-blue-100 dark:to-blue-800/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm dark:text-white font-semibold">
                  <FormattedMessage id="blogger.dashboard.recruitLink" defaultMessage="Lien recrutement (5$/appel, 6 mois)" />
                </span>
                <span className="text-sm dark:text-blue-300 font-bold bg-blue-200 dark:bg-blue-800/50 px-3 py-1.5 rounded-full">
                  {blogger.affiliateCodeRecruitment}
                </span>
              </div>
              {/* Mobile: Stack vertically, Desktop: Row */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={recruitmentShareUrl}
                  readOnly
                  className="w-full text-sm bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl px-4 py-3 min-h-[48px]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(recruitmentShareUrl)}
                    className="flex-1 min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white rounded-xl items-center justify-center gap-2 font-medium transition-colors active:scale-[0.98]"
                  >
                    <Copy className="w-5 h-5" />
                    <span className="sm:inline">
                      <FormattedMessage id="common.copy" defaultMessage="Copier" />
                    </span>
                  </button>
                  <a
                    href={recruitmentShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[48px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors active:scale-[0.98]"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Commissions - Mobile optimized */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="blogger.dashboard.recentCommissions" defaultMessage="Commissions récentes" />
            </h2>
            <button
              onClick={() => navigate('/blogger/gains')}
              className="text-sm hover:text-purple-700 flex items-center gap-1 min-h-[44px] px-2 active:opacity-70"
            >
              <FormattedMessage id="blogger.dashboard.viewAll" defaultMessage="Voir tout" />
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {dashboardData?.recentCommissions && dashboardData.recentCommissions.length > 0 ? (
            <div className="space-y-2">
              {dashboardData.recentCommissions.slice(0, 5).map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 min-h-[64px]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center${
                      commission.status === 'available' ? 'bg-green-100 dark:bg-green-900/30' :
                      commission.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {commission.status === 'available' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm dark:text-white font-medium truncate">
                        {commission.description}
                      </p>
                      <p className="text-xs dark:text-gray-700">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-green-600 dark:text-green-400 ml-2 flex-shrink-0">
                    +${(commission.amount / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <DollarSign className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-700">
                <FormattedMessage
                  id="blogger.dashboard.noCommissions"
                  defaultMessage="Aucune commission pour le moment. Partagez vos liens pour commencer à gagner !"
                />
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions - Mobile optimized with 48px min height */}
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/blogger/ressources')}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl p-5 sm:p-6 hover:from-purple-600 hover:to-purple-700 transition-all min-h-[80px] active:scale-[0.98] shadow-lg"
          >
            <h3 className="font-semibold mb-1 text-base sm:text-lg">
              <FormattedMessage id="blogger.dashboard.resourcesCta" defaultMessage="Ressources exclusives" />
            </h3>
            <p className="text-sm opacity-90">
              <FormattedMessage
                id="blogger.dashboard.resourcesDesc"
                defaultMessage="Logos, images et textes prêts à l'emploi"
              />
            </p>
          </button>

          <button
            onClick={() => navigate('/blogger/guide')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-5 sm:p-6 hover:from-blue-600 hover:to-blue-700 transition-all min-h-[80px] active:scale-[0.98] shadow-lg"
          >
            <h3 className="font-semibold mb-1 text-base sm:text-lg">
              <FormattedMessage id="blogger.dashboard.guideCta" defaultMessage="Guide d'intégration" />
            </h3>
            <p className="text-sm opacity-90">
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
