/**
 * ChatterReferrals - Unified Team page (fusion of Referrals + Refer + ReferralEarnings)
 * 4 sub-tabs: Mon Reseau | Parrainer | Gains | Captain (if applicable)
 * Uses useChatterData() Context + useChatterReferrals() + useViralKit()
 */

import React, { useMemo, useCallback, lazy, Suspense } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Users, Share2, DollarSign, Crown, UserPlus, RefreshCw } from 'lucide-react';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';
import SwipeTabContainer from '@/components/Chatter/Layout/SwipeTabContainer';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { useChatterReferrals, getNextTierInfo, formatTierBonus } from '@/hooks/useChatterReferrals';
import { ReferralStatsCard } from '@/components/Chatter/Cards/ReferralStatsCard';
import { MilestoneProgressCard } from '@/components/Chatter/Cards/MilestoneProgressCard';
import EmptyStateCard from '@/components/Chatter/Activation/EmptyStateCard';
import { UI, SPACING } from '@/components/Chatter/designTokens';
import toast from 'react-hot-toast';
import { copyToClipboard } from '@/utils/clipboard';

// Lazy load heavier components
const ShareButtons = lazy(() =>
  import('@/components/Chatter/ViralKit/ShareButtons').then(m => ({ default: m.ShareButtons }))
);
const ShareMessageSelector = lazy(() =>
  import('@/components/Chatter/ViralKit/ShareMessageSelector').then(m => ({ default: m.ShareMessageSelector }))
);
const QRCodeDisplay = lazy(() =>
  import('@/components/Chatter/ViralKit/QRCodeDisplay').then(m => ({ default: m.QRCodeDisplay }))
);
const ReferralCommissionsTable = lazy(() =>
  import('@/components/Chatter/Tables/ReferralCommissionsTable').then(m => ({ default: m.ReferralCommissionsTable }))
);
const ReferralTreeCard = lazy(() =>
  import('@/components/Chatter/Cards/ReferralTreeCard').then(m => ({ default: m.ReferralTreeCard }))
);

export default function ChatterReferrals() {
  return (
    <ChatterDashboardLayout activeKey="team">
      <ChatterReferralsContent />
    </ChatterDashboardLayout>
  );
}

function ChatterReferralsContent() {
  const intl = useIntl();
  const { dashboardData: chatterDashboard, recruitmentShareUrl, clientShareUrl } = useChatterData();
  const {
    stats,
    filleulsN1,
    filleulsN2,
    recentCommissions,
    tierProgress,
    isLoading,
    refreshDashboard,
  } = useChatterReferrals();

  const chatter = chatterDashboard?.chatter;
  const config = chatterDashboard?.config;
  const isCaptain = chatter?.role === 'captainChatter';
  const qualifiedCount = chatter?.qualifiedReferralsCount || 0;
  const paidTiers = (chatter as any)?.tierBonusesPaid || [];
  const totalRecruits = chatter?.totalRecruits || 0;

  // Parrain (recruiter) info
  const recruiterName = chatter?.recruiterName || null;
  const recruiterPhoto = chatter?.recruiterPhoto || null;
  const recruitedAt = chatter?.recruitedAt || null;
  const hasParrain = !!chatter?.recruitedBy;

  const handleCopyRecruitLink = useCallback(async () => {
    if (!recruitmentShareUrl) return;
    const success = await copyToClipboard(recruitmentShareUrl);
    if (success) {
      navigator.vibrate?.(50);
      toast.success(intl.formatMessage({ id: 'chatter.linkCopied', defaultMessage: 'Lien de recrutement copie !' }));
    }
  }, [recruitmentShareUrl, intl]);

  const handleShareRecruitLink = useCallback(async () => {
    if (!recruitmentShareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SOS Expat - Devenir Chatter',
          text: intl.formatMessage({ id: 'chatter.referrals.shareText', defaultMessage: 'Gagnez de l\'argent en partageant des liens ! Inscrivez-vous :' }),
          url: recruitmentShareUrl,
        });
      } catch { /* cancelled */ }
    } else {
      handleCopyRecruitLink();
    }
  }, [recruitmentShareUrl, intl, handleCopyRecruitLink]);

  // Next tier info
  const nextTier = useMemo(
    () => getNextTierInfo(qualifiedCount, paidTiers),
    [qualifiedCount, paidTiers]
  );

  // Tab 1: Mon Reseau
  const networkTab = (
    <div className="space-y-4">
      {/* Mon Parrain card */}
      {hasParrain && (
        <div className={`${UI.card} p-4`}>
          <div className="flex items-center gap-3">
            {recruiterPhoto ? (
              <img src={recruiterPhoto} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/30" />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center shadow-lg">
                <Crown className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                <FormattedMessage id="chatter.team.myParrain" defaultMessage="Mon Parrain" />
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {recruiterName || intl.formatMessage({ id: 'chatter.team.parrainAnonymous', defaultMessage: 'Chatter' })}
              </p>
              {recruitedAt && !isNaN(new Date(recruitedAt).getTime()) && (
                <p className="text-[10px] text-slate-500">
                  <FormattedMessage
                    id="chatter.team.recruitedOn"
                    defaultMessage="Recrute le {date}"
                    values={{ date: new Date(recruitedAt).toLocaleDateString(intl.locale) }}
                  />
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {totalRecruits === 0 ? (
        <EmptyStateCard
          icon={<Users className="w-7 h-7" />}
          title={<FormattedMessage id="chatter.team.emptyTitle" defaultMessage="Doublez vos revenus avec le parrainage !" />}
          description={
            <FormattedMessage
              id="chatter.team.emptyDesc"
              defaultMessage="Chaque prestataire (avocat ou expatrie) que vous recrutez vous rapporte $5 par appel de ses clients pendant 6 mois. Exemple : 10 prestataires x 2 appels/semaine = $400/mois"
            />
          }
          cta={{
            label: <FormattedMessage id="chatter.team.inviteWhatsApp" defaultMessage="Inviter quelqu'un sur WhatsApp" />,
            onClick: handleShareRecruitLink,
          }}
        />
      ) : (
        <>
          {/* Stats row */}
          <ReferralStatsCard stats={stats} isLoading={isLoading} />

          {/* Milestone progress */}
          <MilestoneProgressCard
            qualifiedCount={qualifiedCount}
            paidTiers={paidTiers}
            tierProgress={tierProgress}
          />

          {/* Visual Team Tree */}
          <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 dark:bg-white/5 rounded-xl" />}>
            <ReferralTreeCard
              stats={stats}
              filleulsN1={filleulsN1}
              filleulsN2={filleulsN2}
              isLoading={isLoading}
              onRefresh={refreshDashboard}
            />
          </Suspense>
        </>
      )}
    </div>
  );

  // Tab 2: Parrainer (Viral Kit)
  const sponsorTab = (
    <div className="space-y-4">
      <div className={`${UI.card} p-4 sm:p-5`}>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          <FormattedMessage id="chatter.sponsor.title" defaultMessage="Chaque personne recrutee = revenus passifs a VIE" />
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          <FormattedMessage id="chatter.sponsor.subtitle" defaultMessage="Partagez votre lien de recrutement" />
        </p>

        {/* Recruitment link */}
        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl mb-4">
          <p className="text-xs text-slate-400 mb-1">
            <FormattedMessage id="chatter.sponsor.recruitLink" defaultMessage="Votre lien de recrutement" />
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono font-bold text-slate-700 dark:text-slate-300 truncate">
              {chatter?.affiliateCodeRecruitment || '...'}
            </code>
            <button
              onClick={handleCopyRecruitLink}
              className={`${UI.button.primary} px-3 py-1.5 text-sm flex-shrink-0`}
            >
              <FormattedMessage id="common.copy" defaultMessage="Copier" />
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <Suspense fallback={<div className="h-24 animate-pulse bg-slate-100 dark:bg-white/5 rounded-xl" />}>
          <ShareButtons />
        </Suspense>
      </div>

      {/* Pre-written messages */}
      <Suspense fallback={null}>
        <ShareMessageSelector />
      </Suspense>

      {/* QR Code */}
      <Suspense fallback={null}>
        <QRCodeDisplay />
      </Suspense>

      {/* Commission rates reminder */}
      <div className={`${UI.card} p-4`}>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          <FormattedMessage id="chatter.sponsor.rates" defaultMessage="Vos gains par recrutement" />
        </h4>
        <div className="space-y-2 text-sm">
          {[
            { label: intl.formatMessage({ id: 'chatter.sponsor.rate.n1Call', defaultMessage: 'N1 call (your referral)' }), amount: `$${((config?.commissionN1CallAmount ?? 100) / 100).toFixed(2).replace(/\.00$/, '')}` },
            { label: intl.formatMessage({ id: 'chatter.sponsor.rate.n2Call', defaultMessage: 'N2 call (referral of referral)' }), amount: `$${((config?.commissionN2CallAmount ?? 50) / 100).toFixed(2)}` },
            { label: intl.formatMessage({ id: 'chatter.sponsor.rate.activationBonus', defaultMessage: 'N1 activation bonus' }), amount: `$${((config?.commissionActivationBonusAmount ?? 500) / 100).toFixed(2).replace(/\.00$/, '')}` },
            { label: intl.formatMessage({ id: 'chatter.sponsor.rate.recruitBonus', defaultMessage: 'N1 recruitment bonus' }), amount: `$${((config?.commissionN1RecruitBonusAmount ?? 100) / 100).toFixed(2).replace(/\.00$/, '')}` },
          ].map((rate) => (
            <div key={rate.label} className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">{rate.label}</span>
              <span className="font-bold text-green-500">{rate.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Tab 3: Gains parrainage
  const earningsTab = (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: intl.formatMessage({ id: 'chatter.referrals.totalReferral', defaultMessage: 'Total referral' }), value: stats ? `$${((stats.totalReferralEarnings || 0) / 100).toFixed(2)}` : '$0' },
          { label: intl.formatMessage({ id: 'chatter.referrals.thisMonth', defaultMessage: 'This month' }), value: stats ? `$${((stats.monthlyReferralEarnings || 0) / 100).toFixed(2)}` : '$0' },
          { label: intl.formatMessage({ id: 'chatter.referrals.qualified', defaultMessage: 'Qualified' }), value: String(qualifiedCount) },
        ].map((kpi) => (
          <div key={kpi.label} className={`${UI.card} p-3 text-center`}>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">{kpi.label}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Referral commissions table */}
      <Suspense fallback={<div className="h-48 animate-pulse bg-slate-100 dark:bg-white/5 rounded-xl" />}>
        <ReferralCommissionsTable commissions={recentCommissions} />
      </Suspense>
    </div>
  );

  // Tab 4: Captain (conditional)
  const captainTab = isCaptain ? (
    <div className="space-y-4">
      <div className={`${UI.card} p-4 text-center`}>
        <Crown className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          <FormattedMessage id="chatter.captain.title" defaultMessage="Captain Chatter" />
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          <FormattedMessage id="chatter.captain.tierCurrent" defaultMessage="Tier actuel : {tier}" values={{ tier: chatter?.captainCurrentTier || 'Bronze' }} />
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <FormattedMessage id="chatter.captain.teamCalls" defaultMessage="Appels equipe ce mois : {count}" values={{ count: chatter?.captainMonthlyTeamCalls || 0 }} />
        </p>
      </div>
    </div>
  ) : null;

  // Build tabs
  const tabs = [
    {
      key: 'network',
      label: <FormattedMessage id="chatter.team.tab.network" defaultMessage="Mon Reseau" />,
      content: networkTab,
    },
    {
      key: 'sponsor',
      label: <FormattedMessage id="chatter.team.tab.sponsor" defaultMessage="Parrainer" />,
      content: sponsorTab,
    },
    {
      key: 'earnings',
      label: <FormattedMessage id="chatter.team.tab.earnings" defaultMessage="Gains" />,
      content: earningsTab,
    },
    ...(isCaptain ? [{
      key: 'captain',
      label: <FormattedMessage id="chatter.team.tab.captain" defaultMessage="Captain" />,
      content: captainTab!,
    }] : []),
  ];

  return (
    <div className="px-4 py-4">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            <FormattedMessage id="chatter.team.title" defaultMessage="Equipe" />
          </h1>
          {totalRecruits > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <FormattedMessage
                id="chatter.team.socialProof"
                defaultMessage="Les chatters avec 10+ filleuls gagnent en moyenne $400/mois"
              />
            </p>
          )}
        </div>
        <button
          onClick={refreshDashboard}
          disabled={isLoading}
          className={`${UI.button.ghost} p-2 ${SPACING.touchTarget}`}
          aria-label="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <SwipeTabContainer tabs={tabs} />
    </div>
  );
}
