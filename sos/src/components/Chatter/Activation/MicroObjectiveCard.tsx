/**
 * MicroObjectiveCard - Shows ONE progressive objective at a time with progress bar
 * Cascade of 10 objectives after first gain
 */

import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Target, ArrowRight, DollarSign, Users, Send } from 'lucide-react';
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
  const { dashboardData, minimumWithdrawal } = useChatterData();
  const chatter = dashboardData?.chatter;
  const config = dashboardData?.config;
  const intl = useIntl();

  // Dynamic values from config
  const minWithdrawalDollars = (minimumWithdrawal || config?.minimumWithdrawalAmount || 3000) / 100;
  const telegramBonusAmount = (config?.telegramBonusAmount || 5000) / 100;
  const telegramUnlockThreshold = (config?.piggyBankUnlockThreshold || 15000) / 100;

  // Tier bonuses from config
  const milestones = config?.recruitmentMilestones ?? [
    { count: 5, bonus: 1500 }, { count: 10, bonus: 3500 }, { count: 20, bonus: 7500 },
    { count: 50, bonus: 25000 }, { count: 100, bonus: 60000 }, { count: 500, bonus: 400000 },
  ];
  const tierBonus = (count: number) => {
    const m = milestones.find(t => t.count === count);
    return m ? `$${(m.bonus / 100).toLocaleString()}` : `$${count}`;
  };


  const objective = useMemo((): Objective | null => {
    if (!chatter) return null;

    const totalEarned = (chatter.totalEarned || 0) / 100;
    const availableBalance = (chatter.availableBalance || 0) / 100;
    const totalRecruits = chatter.totalRecruits || 0;
    const qualifiedReferrals = chatter.qualifiedReferralsCount || 0;
    const telegramLinked = chatter.telegramOnboardingCompleted === true;
    const hasWithdrawn = (chatter as any).totalWithdrawn > 0 || false;

    // 1. First withdrawal possible
    if (availableBalance < minWithdrawalDollars && totalEarned > 0) {
      return {
        id: 'first_withdrawal',
        title: intl.formatMessage({ id: 'chatter.objective.firstWithdrawal.title', defaultMessage: 'First withdrawal' }),
        current: availableBalance,
        target: minWithdrawalDollars,
        unit: '$',
        ctaLabel: intl.formatMessage({ id: 'chatter.objective.shareToEarn', defaultMessage: 'Share to earn' }),
        ctaAction: 'share',
        icon: <DollarSign className="w-5 h-5" />,
        color: 'text-green-500',
      };
    }

    // 2. Can withdraw now
    if (availableBalance >= minWithdrawalDollars && !hasWithdrawn) {
      return {
        id: 'withdraw_now',
        title: intl.formatMessage({ id: 'chatter.objective.withdrawNow.title', defaultMessage: 'Withdraw your money!' }),
        current: minWithdrawalDollars,
        target: minWithdrawalDollars,
        unit: '$',
        ctaLabel: intl.formatMessage({ id: 'chatter.objective.withdrawAmount', defaultMessage: 'Withdraw ${amount}' }, { amount: availableBalance.toFixed(0) }),
        ctaAction: 'withdraw',
        icon: <DollarSign className="w-5 h-5" />,
        color: 'text-green-500',
      };
    }

    // 3. First recruit
    if (totalRecruits === 0) {
      return {
        id: 'first_recruit',
        title: intl.formatMessage({ id: 'chatter.objective.firstRecruit.title', defaultMessage: 'Recruit your first referral' }),
        current: 0,
        target: 1,
        unit: intl.formatMessage({ id: 'chatter.objective.unit.referral', defaultMessage: 'referral' }),
        ctaLabel: intl.formatMessage({ id: 'chatter.objective.inviteSomeone', defaultMessage: 'Invite someone' }),
        ctaAction: 'recruit',
        icon: <Users className="w-5 h-5" />,
        color: 'text-blue-500',
      };
    }

    // 4. 5 qualified referrals
    if (qualifiedReferrals < 5) {
      return {
        id: 'tier_5',
        title: intl.formatMessage({ id: 'chatter.objective.tier5.title', defaultMessage: '5 qualified referrals = {bonus} bonus' }, { bonus: tierBonus(5) }),
        current: qualifiedReferrals,
        target: 5,
        unit: intl.formatMessage({ id: 'chatter.objective.unit.referrals', defaultMessage: 'referrals' }),
        ctaLabel: intl.formatMessage({ id: 'chatter.objective.recruitMore', defaultMessage: 'Recruit more' }),
        ctaAction: 'recruit',
        icon: <Users className="w-5 h-5" />,
        color: 'text-blue-500',
      };
    }

    // 5. Telegram link
    if (!telegramLinked) {
      return {
        id: 'telegram_bonus',
        title: intl.formatMessage({ id: 'chatter.objective.telegramBonus.title', defaultMessage: 'Link Telegram = {bonus} bonus' }, { bonus: `$${telegramBonusAmount}` }),
        current: 0,
        target: 1,
        unit: '',
        ctaLabel: intl.formatMessage({ id: 'chatter.objective.linkTelegram', defaultMessage: 'Link Telegram' }),
        ctaAction: 'telegram',
        icon: <Send className="w-5 h-5" />,
        color: 'text-indigo-500',
      };
    }

    // 7. 10 qualified referrals
    if (qualifiedReferrals < 10) {
      return {
        id: 'tier_10',
        title: intl.formatMessage({ id: 'chatter.objective.tier10.title', defaultMessage: '10 qualified referrals = {bonus} bonus' }, { bonus: tierBonus(10) }),
        current: qualifiedReferrals,
        target: 10,
        unit: intl.formatMessage({ id: 'chatter.objective.unit.referrals', defaultMessage: 'referrals' }),
        ctaLabel: intl.formatMessage({ id: 'chatter.objective.recruitMore', defaultMessage: 'Recruit more' }),
        ctaAction: 'recruit',
        icon: <Users className="w-5 h-5" />,
        color: 'text-blue-500',
      };
    }

    // 8. 20 qualified referrals
    if (qualifiedReferrals < 20) {
      return {
        id: 'tier_20',
        title: intl.formatMessage({ id: 'chatter.objective.tier20.title', defaultMessage: '20 qualified referrals = {bonus} bonus' }, { bonus: tierBonus(20) }),
        current: qualifiedReferrals,
        target: 20,
        unit: intl.formatMessage({ id: 'chatter.objective.unit.referrals', defaultMessage: 'referrals' }),
        ctaLabel: intl.formatMessage({ id: 'chatter.objective.recruitMore', defaultMessage: 'Recruit more' }),
        ctaAction: 'recruit',
        icon: <Users className="w-5 h-5" />,
        color: 'text-blue-500',
      };
    }

    // Default: keep sharing
    return {
      id: 'keep_going',
      title: intl.formatMessage({ id: 'chatter.objective.keepGoing.title', defaultMessage: 'Keep earning!' }),
      current: totalEarned,
      target: 500,
      unit: '$',
      ctaLabel: intl.formatMessage({ id: 'chatter.objective.shareMyLink', defaultMessage: 'Share my link' }),
      ctaAction: 'share',
      icon: <Target className="w-5 h-5" />,
      color: 'text-violet-500',
    };
  }, [chatter, intl, minWithdrawalDollars, telegramBonusAmount, milestones]);

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
    <div className={`backdrop-blur-xl border border-white/[0.06] rounded-2xl bg-white/80 dark:bg-white/[0.03] shadow-sm shadow-indigo-500/[0.03] p-4 sm:p-5 border-l-4 ${
      objective.ctaAction === 'share' ? 'border-l-indigo-500' : 'border-l-violet-500'
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
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
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
