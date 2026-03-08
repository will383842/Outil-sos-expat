/**
 * MicroObjectiveCard - Shows ONE progressive objective at a time with progress bar
 * Cascade of 10 objectives after first gain
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Target, ArrowRight, DollarSign, Users, Trophy, Send } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { UI } from '@/components/Chatter/designTokens';

interface Objective {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  ctaLabel: string;
  ctaAction: 'share' | 'withdraw' | 'recruit' | 'telegram' | 'none';
  icon: React.ReactNode;
  color: string;
}

interface MicroObjectiveCardProps {
  onShareLink: () => void;
  onNavigateToWithdraw?: () => void;
  onNavigateToRecruit?: () => void;
  onNavigateToTelegram?: () => void;
}

const MicroObjectiveCard: React.FC<MicroObjectiveCardProps> = ({
  onShareLink,
  onNavigateToWithdraw,
  onNavigateToRecruit,
  onNavigateToTelegram,
}) => {
  const { dashboardData } = useChatterData();
  const chatter = dashboardData?.chatter;

  const objective = useMemo((): Objective | null => {
    if (!chatter) return null;

    const totalEarned = (chatter.totalEarned || 0) / 100;
    const availableBalance = (chatter.availableBalance || 0) / 100;
    const totalRecruits = chatter.totalRecruits || 0;
    const qualifiedReferrals = chatter.qualifiedReferralsCount || 0;
    const telegramLinked = chatter.telegramOnboardingCompleted === true;
    const level = chatter.level || 1;
    const hasWithdrawn = (chatter as any).totalWithdrawn > 0 || false;

    // 1. First withdrawal possible ($30)
    if (availableBalance < 30 && totalEarned > 0) {
      return {
        id: 'first_withdrawal',
        title: 'Premier retrait',
        current: availableBalance,
        target: 30,
        unit: '$',
        ctaLabel: 'Partager pour gagner',
        ctaAction: 'share',
        icon: <DollarSign className="w-5 h-5" />,
        color: 'text-green-500',
      };
    }

    // 2. Can withdraw now
    if (availableBalance >= 30 && !hasWithdrawn) {
      return {
        id: 'withdraw_now',
        title: 'Retirer votre argent !',
        current: 30,
        target: 30,
        unit: '$',
        ctaLabel: `Retirer $${availableBalance.toFixed(0)}`,
        ctaAction: 'withdraw',
        icon: <DollarSign className="w-5 h-5" />,
        color: 'text-green-500',
      };
    }

    // 3. First recruit
    if (totalRecruits === 0) {
      return {
        id: 'first_recruit',
        title: 'Recruter votre premier filleul',
        current: 0,
        target: 1,
        unit: 'filleul',
        ctaLabel: 'Inviter quelqu\'un',
        ctaAction: 'recruit',
        icon: <Users className="w-5 h-5" />,
        color: 'text-blue-500',
      };
    }

    // 4. 5 qualified referrals ($15 bonus)
    if (qualifiedReferrals < 5) {
      return {
        id: 'tier_5',
        title: '5 filleuls qualifies = $15 bonus',
        current: qualifiedReferrals,
        target: 5,
        unit: 'filleuls',
        ctaLabel: 'Recruter plus',
        ctaAction: 'recruit',
        icon: <Users className="w-5 h-5" />,
        color: 'text-blue-500',
      };
    }

    // 5. Level 2 ($100)
    if (level < 2) {
      return {
        id: 'level_2',
        title: 'Niveau 2 (+10% bonus)',
        current: totalEarned,
        target: 100,
        unit: '$',
        ctaLabel: 'Partager pour gagner',
        ctaAction: 'share',
        icon: <Trophy className="w-5 h-5" />,
        color: 'text-blue-500',
      };
    }

    // 6. Telegram link ($50 bonus)
    if (!telegramLinked) {
      return {
        id: 'telegram_bonus',
        title: 'Liez Telegram = $50 bonus',
        current: 0,
        target: 1,
        unit: '',
        ctaLabel: 'Lier Telegram',
        ctaAction: 'telegram',
        icon: <Send className="w-5 h-5" />,
        color: 'text-indigo-500',
      };
    }

    // 7. 10 qualified referrals ($35 bonus)
    if (qualifiedReferrals < 10) {
      return {
        id: 'tier_10',
        title: '10 filleuls qualifies = $35 bonus',
        current: qualifiedReferrals,
        target: 10,
        unit: 'filleuls',
        ctaLabel: 'Recruter plus',
        ctaAction: 'recruit',
        icon: <Users className="w-5 h-5" />,
        color: 'text-blue-500',
      };
    }

    // 8. Level 3 ($500)
    if (level < 3) {
      return {
        id: 'level_3',
        title: 'Niveau 3 Avance (+20% bonus)',
        current: totalEarned,
        target: 500,
        unit: '$',
        ctaLabel: 'Partager pour gagner',
        ctaAction: 'share',
        icon: <Trophy className="w-5 h-5" />,
        color: 'text-violet-500',
      };
    }

    // 9. 20 qualified referrals ($75 bonus)
    if (qualifiedReferrals < 20) {
      return {
        id: 'tier_20',
        title: '20 filleuls qualifies = $75 bonus',
        current: qualifiedReferrals,
        target: 20,
        unit: 'filleuls',
        ctaLabel: 'Recruter plus',
        ctaAction: 'recruit',
        icon: <Users className="w-5 h-5" />,
        color: 'text-blue-500',
      };
    }

    // 10. Level 4 ($2000)
    if (level < 4) {
      return {
        id: 'level_4',
        title: 'Niveau 4 Expert (+35% bonus)',
        current: totalEarned,
        target: 2000,
        unit: '$',
        ctaLabel: 'Continuer a gagner',
        ctaAction: 'share',
        icon: <Trophy className="w-5 h-5" />,
        color: 'text-orange-500',
      };
    }

    // Default: keep sharing
    return {
      id: 'keep_going',
      title: 'Continuez a gagner !',
      current: totalEarned,
      target: 5000,
      unit: '$',
      ctaLabel: 'Partager mon lien',
      ctaAction: 'share',
      icon: <Target className="w-5 h-5" />,
      color: 'text-red-500',
    };
  }, [chatter]);

  if (!objective) return null;

  const progressPercent = Math.min((objective.current / objective.target) * 100, 100);
  const remaining = Math.max(objective.target - objective.current, 0);

  const handleCta = () => {
    switch (objective.ctaAction) {
      case 'share':
        onShareLink();
        break;
      case 'withdraw':
        onNavigateToWithdraw?.();
        break;
      case 'recruit':
        onNavigateToRecruit?.();
        break;
      case 'telegram':
        onNavigateToTelegram?.();
        break;
    }
  };

  return (
    <div className={`${UI.card} p-4 sm:p-5 border-l-4 ${
      objective.ctaAction === 'share' ? 'border-l-green-500' : 'border-l-blue-500'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={objective.color}>{objective.icon}</div>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <FormattedMessage id="chatter.objective.next" defaultMessage="Prochain objectif" />
        </span>
      </div>

      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
        {objective.title}
      </h3>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-2.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
          {objective.unit === '$' ? `$${objective.current.toFixed(0)}` : objective.current} / {objective.unit === '$' ? `$${objective.target}` : objective.target}
        </span>
      </div>

      {/* Remaining + CTA */}
      <div className="flex items-center justify-between mt-3">
        {remaining > 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <FormattedMessage
              id="chatter.objective.remaining"
              defaultMessage="Encore {amount} pour y arriver !"
              values={{ amount: objective.unit === '$' ? `$${remaining.toFixed(0)}` : `${remaining} ${objective.unit}` }}
            />
          </p>
        ) : (
          <p className="text-xs text-green-500 font-medium">
            <FormattedMessage id="chatter.objective.reached" defaultMessage="Objectif atteint !" />
          </p>
        )}
        <button
          onClick={handleCta}
          className={`${UI.button.primary} px-4 py-2 text-sm inline-flex items-center gap-1.5`}
        >
          {objective.ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default MicroObjectiveCard;
