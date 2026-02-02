/**
 * InfluencerReferrals - Full implementation for recruited providers listing
 *
 * Features:
 * - Real-time data from useInfluencer hook
 * - Loading skeleton state
 * - Empty state with CTA
 * - Provider cards with stats
 * - Commission tracking per referral
 * - Mobile-first responsive design
 */

import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import { useInfluencer } from '@/hooks/useInfluencer';
import {
  Users,
  DollarSign,
  Phone,
  Clock,
  Scale,
  User,
  TrendingUp,
  Copy,
  Check,
  Share2,
  UserPlus,
  Sparkles,
} from 'lucide-react';

// Design tokens
const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  skeleton: 'animate-pulse bg-gray-200 dark:bg-white/10 rounded',
} as const;

/**
 * Format currency from cents to dollars
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format date to localized string
 */
function formatDate(isoString: string, locale: string): string {
  try {
    return new Date(isoString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

/**
 * Calculate days remaining until commission window ends
 */
function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Loading skeleton for referral cards
 */
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className={`${UI.card} p-4`}>
        <div className="flex items-start gap-4">
          <div className={`${UI.skeleton} w-12 h-12 rounded-xl`} />
          <div className="flex-1 space-y-2">
            <div className={`${UI.skeleton} h-5 w-32`} />
            <div className={`${UI.skeleton} h-4 w-24`} />
          </div>
          <div className={`${UI.skeleton} h-8 w-20 rounded-lg`} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((j) => (
            <div key={j} className={`${UI.skeleton} h-16 rounded-xl`} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

/**
 * Empty state component
 */
const EmptyState: React.FC<{ recruitmentShareUrl: string }> = ({ recruitmentShareUrl }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (recruitmentShareUrl) {
      await navigator.clipboard.writeText(recruitmentShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`${UI.card} p-8 text-center`}>
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
        <UserPlus className="w-10 h-10 text-purple-500" />
      </div>

      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        <FormattedMessage
          id="influencer.referrals.empty.title"
          defaultMessage="Aucun filleul pour le moment"
        />
      </h3>

      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
        <FormattedMessage
          id="influencer.referrals.empty.description"
          defaultMessage="Recrutez des avocats et helpers pour gagner $5 par appel qu'ils recoivent pendant 6 mois !"
        />
      </p>

      {/* Commission explanation */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 mb-6 max-w-sm mx-auto">
        <div className="flex items-center justify-center gap-2 mb-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <span className="font-bold text-green-700 dark:text-green-400">$5</span>
          <span className="text-green-600 dark:text-green-500 text-sm">
            <FormattedMessage id="influencer.referrals.perCall" defaultMessage="par appel" />
          </span>
        </div>
        <p className="text-xs text-green-600 dark:text-green-500">
          <FormattedMessage
            id="influencer.referrals.duration"
            defaultMessage="pendant 6 mois apres l'inscription"
          />
        </p>
      </div>

      {/* Share link */}
      {recruitmentShareUrl && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <FormattedMessage
              id="influencer.referrals.shareLink"
              defaultMessage="Partagez votre lien de recrutement :"
            />
          </p>

          <div className="flex items-center gap-2 max-w-md mx-auto">
            <div className="flex-1 bg-gray-100 dark:bg-white/10 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 truncate">
              {recruitmentShareUrl}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="text-sm">
                    <FormattedMessage id="common.copied" defaultMessage="Copie !" />
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-sm">
                    <FormattedMessage id="common.copy" defaultMessage="Copier" />
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Single referral card component
 */
interface ReferralCardProps {
  referral: {
    id: string;
    providerId: string;
    providerName?: string;
    providerRole?: 'lawyer' | 'expat';
    totalCallsReceived: number;
    totalCommissionsEarned: number;
    commissionWindowEnd: string;
    createdAt: string;
  };
  locale: string;
}

const ReferralCard: React.FC<ReferralCardProps> = ({ referral, locale }) => {
  const daysRemaining = getDaysRemaining(referral.commissionWindowEnd);
  const isActive = daysRemaining > 0;

  return (
    <div className={`${UI.card} p-4 ${!isActive ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            referral.providerRole === 'lawyer'
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : 'bg-orange-100 dark:bg-orange-900/30'
          }`}
        >
          {referral.providerRole === 'lawyer' ? (
            <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          ) : (
            <User className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
            {referral.providerName || (
              <FormattedMessage id="influencer.referrals.anonymous" defaultMessage="Prestataire" />
            )}
          </h4>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                referral.providerRole === 'lawyer'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
              }`}
            >
              {referral.providerRole === 'lawyer' ? (
                <FormattedMessage id="provider.type.lawyer" defaultMessage="Avocat" />
              ) : (
                <FormattedMessage id="provider.type.expat" defaultMessage="Helper" />
              )}
            </span>
            <span className="text-gray-400">-</span>
            <span className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="influencer.referrals.since" defaultMessage="depuis" />{' '}
              {formatDate(referral.createdAt, locale)}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <div
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isActive
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
          }`}
        >
          {isActive ? (
            <FormattedMessage id="influencer.referrals.active" defaultMessage="Actif" />
          ) : (
            <FormattedMessage id="influencer.referrals.expired" defaultMessage="Expire" />
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Calls received */}
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Phone className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {referral.totalCallsReceived}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <FormattedMessage id="influencer.referrals.calls" defaultMessage="appels" />
          </p>
        </div>

        {/* Commissions earned */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatCurrency(referral.totalCommissionsEarned)}
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">
            <FormattedMessage id="influencer.referrals.earned" defaultMessage="gagnes" />
          </p>
        </div>

        {/* Days remaining */}
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {daysRemaining}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <FormattedMessage id="influencer.referrals.daysLeft" defaultMessage="jours" />
          </p>
        </div>
      </div>

      {/* Progress indicator for commission window */}
      {isActive && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>
              <FormattedMessage
                id="influencer.referrals.windowProgress"
                defaultMessage="Fenetre de commission"
              />
            </span>
            <span>{Math.round((1 - daysRemaining / 180) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
              style={{ width: `${Math.round((1 - daysRemaining / 180) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Summary stats card
 */
interface SummaryStatsProps {
  totalReferrals: number;
  activeReferrals: number;
  totalCalls: number;
  totalEarned: number;
}

const SummaryStats: React.FC<SummaryStatsProps> = ({
  totalReferrals,
  activeReferrals,
  totalCalls,
  totalEarned,
}) => (
  <div className={`${UI.card} p-4`}>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{totalReferrals}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <FormattedMessage id="influencer.referrals.total" defaultMessage="Total filleuls" />
        </p>
      </div>

      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{activeReferrals}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <FormattedMessage id="influencer.referrals.activeCount" defaultMessage="Actifs" />
        </p>
      </div>

      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{totalCalls}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <FormattedMessage id="influencer.referrals.totalCalls" defaultMessage="Appels generes" />
        </p>
      </div>

      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-xl font-bold text-green-600 dark:text-green-400">
          {formatCurrency(totalEarned)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <FormattedMessage id="influencer.referrals.totalEarned" defaultMessage="Total gagne" />
        </p>
      </div>
    </div>
  </div>
);

/**
 * Main InfluencerReferrals page component
 */
const InfluencerReferrals: React.FC = () => {
  const intl = useIntl();
  const locale = intl.locale.split('-')[0];
  const { referrals, recruitmentShareUrl, isLoading, error } = useInfluencer();

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const now = Date.now();
    const activeReferrals = referrals.filter(
      (r) => new Date(r.commissionWindowEnd).getTime() > now
    );

    return {
      totalReferrals: referrals.length,
      activeReferrals: activeReferrals.length,
      totalCalls: referrals.reduce((sum, r) => sum + r.totalCallsReceived, 0),
      totalEarned: referrals.reduce((sum, r) => sum + r.totalCommissionsEarned, 0),
    };
  }, [referrals]);

  // Sort referrals: active first, then by creation date
  const sortedReferrals = useMemo(() => {
    const now = Date.now();
    return [...referrals].sort((a, b) => {
      const aActive = new Date(a.commissionWindowEnd).getTime() > now;
      const bActive = new Date(b.commissionWindowEnd).getTime() > now;

      if (aActive !== bActive) return bActive ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [referrals]);

  return (
    <InfluencerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="influencer.referrals.title" defaultMessage="Mes filleuls" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="influencer.referrals.subtitle"
              defaultMessage="Prestataires recrutes via votre lien"
            />
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : referrals.length === 0 ? (
          /* Empty state */
          <EmptyState recruitmentShareUrl={recruitmentShareUrl} />
        ) : (
          <>
            {/* Summary stats */}
            <SummaryStats {...summaryStats} />

            {/* Share link reminder */}
            {recruitmentShareUrl && (
              <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Share2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm text-purple-700 dark:text-purple-300">
                    <FormattedMessage
                      id="influencer.referrals.keepSharing"
                      defaultMessage="Continuez a partager pour recruter plus !"
                    />
                  </span>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(recruitmentShareUrl)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                >
                  <FormattedMessage id="common.copy" defaultMessage="Copier" />
                </button>
              </div>
            )}

            {/* Referrals list */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                <FormattedMessage
                  id="influencer.referrals.listTitle"
                  defaultMessage="Vos {count} filleuls"
                  values={{ count: referrals.length }}
                />
              </h2>

              {sortedReferrals.map((referral) => (
                <ReferralCard key={referral.id} referral={referral} locale={locale} />
              ))}
            </div>
          </>
        )}
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerReferrals;
