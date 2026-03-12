/**
 * NextActionCard - Conditional CTA card based on chatter profile
 * Shows the single most important next action for active chatters
 */

import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Copy, Users, Send, Trophy, TrendingUp, Sparkles, Share2 } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { UI } from '@/components/Chatter/designTokens';

interface NextActionCardProps {
  onCopyLink: () => void;
  onShareLink: () => void;
  onNavigateToRecruit?: () => void;
  onNavigateToTelegram?: () => void;
  className?: string;
}

const NextActionCard: React.FC<NextActionCardProps> = ({
  onCopyLink,
  onShareLink,
  onNavigateToRecruit,
  onNavigateToTelegram,
  className = '',
}) => {
  const { dashboardData } = useChatterData();
  const intl = useIntl();
  const chatter = dashboardData?.chatter;
  const config = dashboardData?.config;

  const action = useMemo(() => {
    if (!chatter) return null;

    const totalClients = chatter.totalClients || 0;
    const totalRecruits = chatter.totalRecruits || 0;
    const qualifiedReferrals = chatter.qualifiedReferralsCount || 0;
    const telegramLinked = chatter.telegramOnboardingCompleted === true;
    const level = chatter.level || 1;
    const totalEarned = (chatter.totalEarned || 0) / 100;
    const isCaptain = chatter.role === 'captainChatter';

    // Dynamic commission amounts from config (cents → dollars)
    const minCallAmount = Math.min(
      (config?.commissionClientCallAmountExpat ?? 1000),
      (config?.commissionClientCallAmountLawyer ?? 1000)
    ) / 100;
    const maxCallAmount = Math.max(
      (config?.commissionClientCallAmountExpat ?? 1000),
      (config?.commissionClientCallAmountLawyer ?? 1000)
    ) / 100;
    const callAmountRange = minCallAmount === maxCallAmount
      ? `$${minCallAmount}`
      : `$${minCallAmount}-${maxCallAmount}`;
    const n1CallAmount = (config?.commissionN1CallAmount ?? 100) / 100;

    // Get first tier bonus from recruitmentMilestones
    const milestones = config?.recruitmentMilestones ?? [
      { count: 5, bonus: 1500 }, { count: 10, bonus: 3500 },
    ];
    const firstTierBonus = milestones.length > 0 ? milestones[0].bonus / 100 : 15;
    const firstTierCount = milestones.length > 0 ? milestones[0].count : 5;

    // Telegram bonus from piggy bank data
    const telegramBonusAmount = (dashboardData?.piggyBank?.totalPending ?? 5000) / 100;

    // Priority cascade
    if (totalClients === 0) {
      return {
        icon: <Share2 className="w-5 h-5" />,
        title: intl.formatMessage({ id: 'chatter.nextAction.shareClientLink', defaultMessage: 'Partagez votre lien client' }),
        subtitle: intl.formatMessage({ id: 'chatter.nextAction.shareClientLinkSub', defaultMessage: 'pour gagner {amount} par appel !' }, { amount: callAmountRange }),
        ctaLabel: intl.formatMessage({ id: 'chatter.nextAction.copyLink', defaultMessage: 'Copier mon lien' }),
        ctaAction: onCopyLink,
        borderColor: 'border-l-green-500',
        iconColor: 'text-green-500',
        glowColor: 'shadow-green-500/20',
      };
    }

    if (totalRecruits === 0) {
      return {
        icon: <Users className="w-5 h-5" />,
        title: intl.formatMessage({ id: 'chatter.nextAction.recruitFirst', defaultMessage: 'Recrutez votre premier affilié' }),
        subtitle: intl.formatMessage({ id: 'chatter.nextAction.recruitFirstSub', defaultMessage: 'et gagnez {amount} à chaque appel qu\'il génère !' }, { amount: `$${n1CallAmount}` }),
        ctaLabel: intl.formatMessage({ id: 'chatter.nextAction.inviteSomeone', defaultMessage: 'Inviter quelqu\'un' }),
        ctaAction: onNavigateToRecruit || onShareLink,
        borderColor: 'border-l-blue-500',
        iconColor: 'text-blue-500',
        glowColor: 'shadow-blue-500/20',
      };
    }

    if (qualifiedReferrals < firstTierCount) {
      const remaining = firstTierCount - qualifiedReferrals;
      return {
        icon: <Users className="w-5 h-5" />,
        title: intl.formatMessage({ id: 'chatter.nextAction.moreReferrals', defaultMessage: 'Plus que {count} filleul(s) qualifié(s)' }, { count: remaining }),
        subtitle: intl.formatMessage({ id: 'chatter.nextAction.moreReferralsSub', defaultMessage: 'pour débloquer {amount} de bonus !' }, { amount: `$${firstTierBonus}` }),
        ctaLabel: intl.formatMessage({ id: 'chatter.nextAction.recruitMore', defaultMessage: 'Recruter plus' }),
        ctaAction: onNavigateToRecruit || onShareLink,
        borderColor: 'border-l-blue-500',
        iconColor: 'text-blue-500',
        glowColor: 'shadow-blue-500/20',
      };
    }

    if (!telegramLinked) {
      return {
        icon: <Send className="w-5 h-5" />,
        title: intl.formatMessage({ id: 'chatter.nextAction.linkTelegram', defaultMessage: 'Liez Telegram' }),
        subtitle: intl.formatMessage({ id: 'chatter.nextAction.linkTelegramSub', defaultMessage: 'et débloquez {amount} de bonus !' }, { amount: `$${telegramBonusAmount}` }),
        ctaLabel: intl.formatMessage({ id: 'chatter.nextAction.linkNow', defaultMessage: 'Lier maintenant' }),
        ctaAction: onNavigateToTelegram || onShareLink,
        borderColor: 'border-l-indigo-500',
        iconColor: 'text-indigo-500',
        glowColor: 'shadow-indigo-500/20',
      };
    }

    // Level progression (thresholds from config, in cents → dollars)
    const lt = config?.levelThresholds ?? { level2: 10000, level3: 50000, level4: 200000, level5: 500000 };
    const levelThresholds: Record<number, { target: number; name: string; bonus: string }> = {
      1: { target: lt.level2 / 100, name: 'Intermediaire', bonus: '+10%' },
      2: { target: lt.level3 / 100, name: 'Avance', bonus: '+20%' },
      3: { target: lt.level4 / 100, name: 'Expert', bonus: '+35%' },
      4: { target: lt.level5 / 100, name: 'Elite', bonus: '+50%' },
    };

    const nextLevel = levelThresholds[level];
    if (nextLevel && totalEarned < nextLevel.target) {
      const remaining = (nextLevel.target - totalEarned).toFixed(0);
      return {
        icon: <TrendingUp className="w-5 h-5" />,
        title: intl.formatMessage({ id: 'chatter.nextAction.levelUp', defaultMessage: 'Encore {amount} pour {level}' }, { amount: `$${remaining}`, level: nextLevel.name }),
        subtitle: intl.formatMessage({ id: 'chatter.nextAction.levelUpSub', defaultMessage: 'Débloquez {bonus} de bonus sur vos commissions !' }, { bonus: nextLevel.bonus }),
        ctaLabel: intl.formatMessage({ id: 'chatter.nextAction.shareToEarn', defaultMessage: 'Partager pour gagner' }),
        ctaAction: onShareLink,
        borderColor: 'border-l-violet-500',
        iconColor: 'text-violet-500',
        glowColor: 'shadow-violet-500/20',
      };
    }

    // Captain tier progression
    if (isCaptain && chatter.captainCurrentTier) {
      return {
        icon: <Trophy className="w-5 h-5" />,
        title: intl.formatMessage({ id: 'chatter.nextAction.motivateTeam', defaultMessage: 'Motivez votre équipe !' }),
        subtitle: intl.formatMessage({ id: 'chatter.nextAction.motivateTeamSub', defaultMessage: 'Plus votre équipe appelle, plus vos bonus montent' }),
        ctaLabel: intl.formatMessage({ id: 'chatter.nextAction.viewTeam', defaultMessage: 'Voir mon équipe' }),
        ctaAction: onShareLink,
        borderColor: 'border-l-amber-500',
        iconColor: 'text-amber-500',
        glowColor: 'shadow-amber-500/20',
      };
    }

    // Default
    return {
      icon: <Sparkles className="w-5 h-5" />,
      title: intl.formatMessage({ id: 'chatter.nextAction.keepSharing', defaultMessage: 'Continuez à partager !' }),
      subtitle: intl.formatMessage({ id: 'chatter.nextAction.keepSharingSub', defaultMessage: 'Chaque appel = {amount} dans votre poche' }, { amount: callAmountRange }),
      ctaLabel: intl.formatMessage({ id: 'chatter.nextAction.shareMyLink', defaultMessage: 'Partager mon lien' }),
      ctaAction: onShareLink,
      borderColor: 'border-l-green-500',
      iconColor: 'text-green-500',
      glowColor: 'shadow-green-500/20',
    };
  }, [chatter, config, dashboardData?.piggyBank, onCopyLink, onShareLink, onNavigateToRecruit, onNavigateToTelegram, intl]);

  if (!action) return null;

  return (
    <div className={`bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl border-l-4 ${action.borderColor} p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center ${action.iconColor} shadow-lg ${action.glowColor}`}>
          {action.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {action.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {action.subtitle}
          </p>
          <button
            onClick={action.ctaAction}
            className={`mt-3 ${UI.button.primary} px-4 py-2 text-sm inline-flex items-center gap-2`}
          >
            {action.ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(NextActionCard);
