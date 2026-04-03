/**
 * ChatterHowToEarn - "Comment gagner" page
 * Step-by-step guide showing chatters (and captains) exactly how the system works,
 * with real commission amounts from config, progress bars, and motivational design.
 * NO SPAM policy clearly stated.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import {
  Lightbulb,
  DollarSign,
  Users,
  Share2,
  Phone,
  Crown,
  Shield,
  Star,
  Award,
  Gem,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Zap,
  Copy,
  CheckCheck,
  Target,
  Briefcase,
  Trophy,
  MessageCircle,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { functionsAffiliate, db } from '@/config/firebase';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';
import { copyToClipboard } from '@/utils/clipboard';
import type { ChatterDashboardData } from '@/types/chatter';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
};

// ============================================================================
// TYPES
// ============================================================================

interface CaptainDashboardData {
  captainInfo: {
    captainMonthlyTeamCalls: number;
    captainQualityBonusEnabled: boolean;
  };
  qualityBonusStatus: {
    activeN1Count: number;
    minRecruits: number;
    monthlyTeamCommissions: number;
    minCommissions: number;
    criteriaMet: boolean;
    adminOverride: boolean;
    qualified: boolean;
    bonusAmount: number;
  };
  tierProgression: {
    currentTier: { name: string; bonus: number } | null;
    nextTier: { name: string; bonus: number; minCalls: number } | null;
    callsToNext: number;
    progressPercent: number;
  };
  tiers: Array<{ name: string; minCalls: number; bonus: number }>;
  n1Recruits: unknown[];
  n2Recruits: unknown[];
  monthlyCommissions: unknown[];
  recentCommissions: unknown[];
  archives: unknown[];
  captainConfig?: {
    commissionCaptainCallAmountLawyer: number;
    commissionCaptainCallAmountExpat: number;
  };
}

const CAPTAIN_TIER_ICONS: Record<string, React.ReactNode> = {
  Bronze: <Shield className="h-5 w-5" />,
  Argent: <Star className="h-5 w-5" />,
  Or: <Award className="h-5 w-5" />,
  Platine: <Crown className="h-5 w-5" />,
  Diamant: <Gem className="h-5 w-5" />,
};

const CAPTAIN_TIER_COLORS: Record<string, string> = {
  Bronze: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
  Argent: "text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/20",
  Or: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  Platine: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20",
  Diamant: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
};

// ============================================================================
// HELPERS
// ============================================================================

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

// ============================================================================
// SKELETON
// ============================================================================

function HowToEarnSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-1/2 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEP COMPONENT
// ============================================================================

function Step({
  number,
  icon,
  title,
  description,
  highlight,
  color = "text-indigo-500",
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: string;
  color?: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-lg`}>
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={color}>{icon}</span>
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
        {highlight && (
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            {highlight}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMMISSION CARD
// ============================================================================

function CommissionCard({
  icon,
  label,
  amount,
  sublabel,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  amount: string;
  sublabel?: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-center">
      <span className={color}>{icon}</span>
      <span className={`text-2xl font-black mt-1 ${color}`}>{amount}</span>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-0.5">{label}</span>
      {sublabel && <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{sublabel}</span>}
    </div>
  );
}

// ============================================================================
// COMMISSION ROW (list format, clearer than cards)
// ============================================================================

function CommissionRow({
  icon,
  label,
  amount,
  detail,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  amount: string;
  detail?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-white/5">
      <span className={`flex-shrink-0 ${color}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
        {detail && (
          <span className="text-xs text-gray-400 dark:text-gray-500 block sm:inline sm:ml-2">— {detail}</span>
        )}
      </div>
      <span className={`text-lg font-black flex-shrink-0 ${color}`}>{amount}</span>
    </div>
  );
}

// ============================================================================
// YOUR NEXT GOAL
// ============================================================================

function YourNextGoal({
  dashboardData,
}: {
  dashboardData: ChatterDashboardData | null;
}) {
  const intl = useIntl();
  const chatter = dashboardData?.chatter;
  const referralStats = dashboardData?.referralStats;
  const piggyBank = dashboardData?.piggyBank;

  let goalMessage = '';
  let goalReward = '';
  let goalIcon = <Target className="h-5 w-5" />;
  let goalColor = 'text-orange-500';
  let progressPercent: number | null = null;

  const config = dashboardData?.config;
  const goalLawyerAmount = config?.commissionClientCallAmountLawyer ?? config?.commissionClientCallAmount ?? 500;
  const goalExpatAmount = config?.commissionClientCallAmountExpat ?? config?.commissionClientCallAmount ?? 300;

  if (chatter?.totalClients === 0) {
    const minAmount = formatCents(Math.min(goalLawyerAmount, goalExpatAmount));
    const maxAmount = formatCents(Math.max(goalLawyerAmount, goalExpatAmount));
    const amountRange = minAmount === maxAmount ? minAmount : `${minAmount}-${maxAmount}`;
    goalMessage = intl.formatMessage(
      { id: 'chatter.howToEarn.nextGoal.firstCall', defaultMessage: 'Partagez votre lien et gagnez vos premiers {amount} !' },
      { amount: amountRange }
    );
    goalReward = amountRange;
    goalIcon = <Phone className="h-5 w-5" />;
    goalColor = 'text-green-500';
  } else if (!chatter?.hasTelegram) {
    const tgBonus = formatCents(config?.telegramBonusAmount || 5000);
    goalMessage = intl.formatMessage({ id: 'chatter.howToEarn.nextGoal.telegram', defaultMessage: 'Liez Telegram pour débloquer {bonus} de bonus' }, { bonus: tgBonus });
    goalReward = tgBonus;
    goalIcon = <MessageCircle className="h-5 w-5" />;
    goalColor = 'text-blue-500';
  } else if (referralStats?.nextTierBonus && referralStats.nextTierBonus.filleulsNeeded <= 5) {
    goalMessage = intl.formatMessage(
      { id: 'chatter.howToEarn.nextGoal.tierBonus', defaultMessage: 'Encore {count} recrues pour {bonus}' },
      { count: referralStats.nextTierBonus.filleulsNeeded, bonus: formatCents(referralStats.nextTierBonus.bonusAmount) }
    );
    goalReward = formatCents(referralStats.nextTierBonus.bonusAmount);
    goalIcon = <TrendingUp className="h-5 w-5" />;
    goalColor = 'text-indigo-500';
  } else if (chatter?.currentMonthRank != null && chatter.currentMonthRank > 3 && chatter.currentMonthRank <= 10) {
    const placesToClimb = chatter.currentMonthRank - 3;
    const compPrizes = config?.monthlyCompetitionPrizes ?? { first: 20000, second: 10000, third: 5000 };
    const prizeRange = `$${(compPrizes.third / 100).toFixed(0)}-${(compPrizes.first / 100).toFixed(0)}`;
    goalMessage = intl.formatMessage(
      { id: 'chatter.howToEarn.nextGoal.top3', defaultMessage: 'Top {rank} — montez de {count} places pour {prizes} !' },
      { rank: chatter.currentMonthRank, count: placesToClimb, prizes: prizeRange }
    );
    goalReward = prizeRange;
    goalIcon = <Trophy className="h-5 w-5" />;
    goalColor = 'text-yellow-500';
  } else if (piggyBank && piggyBank.progressPercent >= 60 && !piggyBank.isUnlocked) {
    const tgBonus2 = formatCents(config?.telegramBonusAmount || 5000);
    goalMessage = intl.formatMessage(
      { id: 'chatter.howToEarn.nextGoal.piggyBank', defaultMessage: 'Encore {amount} pour débloquer votre tirelire de {bonus}' },
      { amount: formatCents(piggyBank.amountToUnlock), bonus: tgBonus2 }
    );
    goalReward = tgBonus2;
    goalIcon = <Zap className="h-5 w-5" />;
    goalColor = 'text-purple-500';
    progressPercent = piggyBank.progressPercent;
  } else if (chatter?.level != null && (chatter.level || 1) < 5) {
    // Level goal — only shown if level data exists (levels removed from backend)
    const nextLevel = (chatter.level || 1) + 1;
    goalMessage = intl.formatMessage(
      { id: 'chatter.howToEarn.nextGoal.nextLevel', defaultMessage: 'Continuez — niveau {level} à portée ({progress}%)' },
      { level: nextLevel, progress: chatter?.levelProgress || 0 }
    );
    goalReward = intl.formatMessage({ id: 'chatter.howToEarn.nextGoal.levelShort', defaultMessage: 'Niv. {level}' }, { level: nextLevel });
    goalIcon = <Star className="h-5 w-5" />;
    progressPercent = chatter?.levelProgress || 0;
  } else {
    // No applicable goal to display
    return null;
  }

  return (
    <div className={`${UI.card} p-4 border-l-4 border-violet-400`}>
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 ${goalColor}`}>
          {goalIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">
            <FormattedMessage id="chatter.howToEarn.nextGoal.label" defaultMessage="Votre prochain objectif" />
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{goalMessage}</p>
        </div>
        <div className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-black ${goalColor} bg-gray-50 dark:bg-white/5`}>
          {goalReward}
        </div>
      </div>
      {progressPercent != null && (
        <div className="mt-2 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PROVIDER RECRUITMENT SECTION
// ============================================================================

function ProviderRecruitmentSection({
  recruitmentShareUrl,
  providerCallAmount = 500,
}: {
  recruitmentShareUrl: string;
  providerCallAmount?: number;
}) {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(recruitmentShareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [recruitmentShareUrl]);

  if (!recruitmentShareUrl) return null;

  return (
    <div className={`${UI.card} p-4 sm:p-6 border-l-4 border-green-500`}>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <Briefcase className="h-5 w-5 text-green-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          <FormattedMessage id="chatter.howToEarn.provider.title" defaultMessage="Recrutement de prestataires" />
        </h2>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 uppercase">
          <FormattedMessage id="chatter.howToEarn.provider.badge" defaultMessage="Revenu premium" />
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
        <FormattedMessage id="chatter.howToEarn.provider.desc" defaultMessage="Recrutez des avocats sur la plateforme. Pour chaque appel payant qu'ils reçoivent, vous touchez {amount} pendant 6 mois." values={{ amount: formatCents(providerCallAmount) }} />
      </p>

      {/* Concrete example */}
      <div className="mt-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30">
        <p className="text-xs font-bold text-green-800 dark:text-green-300 mb-1">
          <FormattedMessage id="chatter.howToEarn.provider.example.title" defaultMessage="Exemple concret" />
        </p>
        <p className="text-sm font-semibold text-green-700 dark:text-green-400">
          <FormattedMessage id="chatter.howToEarn.provider.example.text" defaultMessage="1 avocat recruté × 3 appels/jour = {daily}/jour pour VOUS. Sur 6 mois = {total} !" values={{ daily: formatCents(providerCallAmount * 3), total: formatCents(providerCallAmount * 3 * 180) }} />
        </p>
      </div>

      {/* Copy recruitment link */}
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-white/5 rounded-lg text-xs text-gray-600 dark:text-gray-400 truncate border border-gray-200 dark:border-white/10">
          {recruitmentShareUrl}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center gap-1"
        >
          {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied
            ? intl.formatMessage({ id: 'chatter.howToEarn.copied', defaultMessage: 'Copié !' })
            : intl.formatMessage({ id: 'chatter.howToEarn.copy', defaultMessage: 'Copier' })
          }
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MONTHLY COMPETITION SECTION
// ============================================================================

function MonthlyCompetitionSection({
  currentMonthRank,
  competitionPrizes,
  competitionEligibilityMinimum,
}: {
  currentMonthRank: number | null;
  competitionPrizes?: { first: number; second: number; third: number };
  competitionEligibilityMinimum?: number;
}) {
  const intl = useIntl();

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();

  const p = competitionPrizes ?? { first: 20000, second: 10000, third: 5000 };
  const prizes = [
    { position: 1, amount: `$${(p.first / 100).toFixed(0)}`, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' },
    { position: 2, amount: `$${(p.second / 100).toFixed(0)}`, color: 'text-gray-400 dark:text-gray-300', bg: 'bg-gray-50 dark:bg-gray-800/30 border-gray-300 dark:border-gray-600' },
    { position: 3, amount: `$${(p.third / 100).toFixed(0)}`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' },
  ];

  return (
    <div className={`${UI.card} p-4 sm:p-6`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="chatter.howToEarn.competition.title" defaultMessage="Compétition mensuelle — Top 3" />
          </h2>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
          <FormattedMessage id="chatter.howToEarn.competition.daysLeft" defaultMessage="{count}j restants" values={{ count: daysLeft }} />
        </span>
      </div>

      {/* Prize grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {prizes.map(({ position, amount, color, bg }) => (
          <div key={position} className={`p-4 rounded-xl border-2 text-center ${bg}`}>
            <Trophy className={`h-6 w-6 mx-auto ${color}`} />
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
              <FormattedMessage id="chatter.howToEarn.competition.topRank" defaultMessage="Top {rank}" values={{ rank: position }} />
            </div>
            <div className={`text-2xl font-black ${color} mt-1`}>{amount}</div>
          </div>
        ))}
      </div>

      {/* Current rank */}
      {currentMonthRank != null && currentMonthRank > 0 && (
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          <FormattedMessage id="chatter.howToEarn.competition.yourRank" defaultMessage="Votre position : #{rank}" values={{ rank: currentMonthRank }} />
        </p>
      )}

      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
        <FormattedMessage id="chatter.howToEarn.competition.eligibility" defaultMessage="Minimum {amount} de commissions cumulées (vous + votre équipe) pour être éligible" values={{ amount: formatCents(competitionEligibilityMinimum || 20000) }} />
      </p>
    </div>
  );
}

// ============================================================================
// CAPTAIN TIER PROGRESS
// ============================================================================

function CaptainTierProgress({
  captainData,
}: {
  captainData: CaptainDashboardData;
}) {
  const intl = useIntl();
  const { tierProgression, tiers, captainInfo } = captainData;

  return (
    <div className={`${UI.card} p-4 sm:p-6`}>
      <div className="flex items-center gap-2 mb-1">
        <Crown className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          <FormattedMessage id="chatter.howToEarn.captain.tiersTitle" defaultMessage="Vos paliers Capitaine" />
        </h2>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        <FormattedMessage id="chatter.howToEarn.captain.tiersSubtitle" defaultMessage="Plus votre équipe appelle, plus vous gagnez de bonus mensuels" />
      </p>

      {/* Current progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>
            <FormattedMessage
              id="chatter.howToEarn.captain.monthCalls"
              defaultMessage="{count} appels ce mois"
              values={{ count: captainInfo.captainMonthlyTeamCalls }}
            />
          </span>
          {tierProgression.nextTier && (
            <span>
              <FormattedMessage
                id="chatter.howToEarn.captain.nextAt"
                defaultMessage="Prochain : {tier} à {count} appels"
                values={{ tier: tierProgression.nextTier.name, count: tierProgression.nextTier.minCalls }}
              />
            </span>
          )}
        </div>
        <div className="relative h-3 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-700"
            style={{ width: `${tierProgression.progressPercent}%` }}
          />
        </div>
      </div>

      {/* Tiers grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-4">
        {tiers.map((t) => {
          const isCurrent = tierProgression.currentTier?.name === t.name;
          const isReached = captainInfo.captainMonthlyTeamCalls >= t.minCalls;
          const colors = CAPTAIN_TIER_COLORS[t.name] || "text-gray-500 bg-gray-50 dark:bg-white/5";

          return (
            <div
              key={t.name}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                isCurrent
                  ? `${colors} border-current ring-2 ring-current ring-offset-1 dark:ring-offset-gray-900`
                  : isReached
                    ? `${colors} border-transparent opacity-70`
                    : 'bg-gray-50 dark:bg-white/5 border-transparent text-gray-400 dark:text-gray-600 opacity-50'
              }`}
            >
              <div className="flex justify-center">{CAPTAIN_TIER_ICONS[t.name] || <Shield className="h-5 w-5" />}</div>
              <div className="font-bold text-sm mt-1">{t.name}</div>
              <div className="text-[10px] opacity-70">
                <FormattedMessage id="chatter.howToEarn.captain.minCalls" defaultMessage="{count}+ appels" values={{ count: t.minCalls }} />
              </div>
              <div className="font-black text-sm mt-1">{formatCents(t.bonus)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ChatterHowToEarn() {
  const intl = useIntl();
  const { user } = useAuth();
  const { dashboardData, isLoading, clientShareUrl } = useChatterData();
  const [copied, setCopied] = useState(false);

  // Captain state
  const [isCaptain, setIsCaptain] = useState(false);
  const [captainData, setCaptainData] = useState<CaptainDashboardData | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "chatters", user.uid)).then((snap) => {
      if (snap.exists() && snap.data()?.role === 'captainChatter') {
        setIsCaptain(true);
      }
    }).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (!isCaptain) return;
    const callable = httpsCallable<void, CaptainDashboardData>(functionsAffiliate, 'getCaptainDashboard');
    callable().then((r) => setCaptainData(r.data)).catch(() => {});
  }, [isCaptain]);

  // Config-based amounts (use lockedRates/config from backend, fallback to defaults)
  const config = dashboardData?.config;
  const clientCallAmountLawyer = config?.commissionClientCallAmountLawyer ?? config?.commissionClientCallAmount ?? 500;
  const clientCallAmountExpat = config?.commissionClientCallAmountExpat ?? config?.commissionClientCallAmount ?? 300;
  const n1CallAmount = config?.commissionN1CallAmount ?? 100;
  const n2CallAmount = config?.commissionN2CallAmount ?? 50;
  const providerCallAmount = config?.commissionProviderCallAmount ?? config?.commissionRecruitmentAmount ?? 500;
  const activationBonusAmount = config?.commissionActivationBonusAmount ?? 500;
  const recruitBonusAmount = config?.commissionN1RecruitBonusAmount ?? 100;

  const handleCopy = useCallback(async () => {
    if (!clientShareUrl) return;
    const success = await copyToClipboard(clientShareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [clientShareUrl]);

  if (isLoading && !dashboardData) return <HowToEarnSkeleton />;

  const qualified = dashboardData?.referralStats?.qualifiedFilleulsN1 ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
          <FormattedMessage id="chatter.howToEarn.title" defaultMessage="Comment gagner" />
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <FormattedMessage id="chatter.howToEarn.subtitle" defaultMessage="Tout ce que vous devez savoir pour commencer à gagner" />
        </p>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: YOUR NEXT GOAL */}
      {/* ============================================================ */}
      {dashboardData && (
        <YourNextGoal dashboardData={dashboardData} />
      )}

      {/* ============================================================ */}
      {/* SECTION 2: STEPS - 3 + 1 optional */}
      {/* ============================================================ */}
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="flex items-center gap-2 mb-5">
          <Zap className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="chatter.howToEarn.steps.title" defaultMessage="3 étapes simples" />
          </h2>
        </div>

        <div className="space-y-5">
          <Step
            number={1}
            icon={<Copy className="h-4 w-4" />}
            title={intl.formatMessage({ id: 'chatter.howToEarn.step1.title', defaultMessage: 'Copiez votre lien' })}
            description={intl.formatMessage({ id: 'chatter.howToEarn.step1.desc', defaultMessage: 'Votre lien unique est prêt. Copiez-le en un clic.' })}
            color="text-blue-500"
          />

          {/* Inline copy button */}
          {clientShareUrl && (
            <div className="ml-14 flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-white/5 rounded-lg text-xs text-gray-600 dark:text-gray-400 truncate border border-gray-200 dark:border-white/10">
                {clientShareUrl}
              </code>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold hover:from-indigo-600 hover:to-violet-600 transition-all flex items-center gap-1"
              >
                {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied
                  ? intl.formatMessage({ id: 'chatter.howToEarn.copied', defaultMessage: 'Copié !' })
                  : intl.formatMessage({ id: 'chatter.howToEarn.copy', defaultMessage: 'Copier' })
                }
              </button>
            </div>
          )}

          <Step
            number={2}
            icon={<Share2 className="h-4 w-4" />}
            title={intl.formatMessage({ id: 'chatter.howToEarn.step2.title', defaultMessage: 'Partagez-le' })}
            description={intl.formatMessage({ id: 'chatter.howToEarn.step2.desc', defaultMessage: 'Partagez votre lien dans des groupes Facebook, WhatsApp, Telegram, forums d\'expatriés... Partout où des expatriés cherchent de l\'aide juridique ou administrative.' })}
            color="text-green-500"
          />

          <Step
            number={3}
            icon={<Phone className="h-4 w-4" />}
            title={intl.formatMessage({ id: 'chatter.howToEarn.step3.title', defaultMessage: 'Quelqu\'un appelle → Vous gagnez' })}
            description={intl.formatMessage({
              id: 'chatter.howToEarn.step3.desc',
              defaultMessage: 'Quand une personne clique sur votre lien et fait un appel payant, vous recevez automatiquement votre commission. C\'est tout !',
            })}
            highlight={intl.formatMessage({
              id: 'chatter.howToEarn.step3.highlight',
              defaultMessage: '{amount} par appel',
            }, { amount: `${formatCents(clientCallAmountLawyer)}/${formatCents(clientCallAmountExpat)}` })}
            color="text-purple-500"
          />

          {/* Step 4: Optional - recruit provider */}
          {clientShareUrl && (
            <Step
              number={4}
              icon={<Briefcase className="h-4 w-4" />}
              title={intl.formatMessage({ id: 'chatter.howToEarn.step4.title', defaultMessage: 'Recrutez un prestataire' })}
              description={intl.formatMessage({ id: 'chatter.howToEarn.step4.desc', defaultMessage: 'Recrutez un avocat sur la plateforme. Vous gagnez {amount} par appel qu\'il reçoit pendant 6 mois !' }, { amount: formatCents(providerCallAmount) })}
              highlight={intl.formatMessage({ id: 'chatter.howToEarn.step4.highlight', defaultMessage: '{amount} par appel pendant 6 mois' }, { amount: formatCents(providerCallAmount) })}
              color="text-emerald-500"
            />
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 3: ALL COMMISSIONS - grouped rows */}
      {/* ============================================================ */}
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="flex items-center gap-2 mb-5">
          <DollarSign className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="chatter.howToEarn.commissions.title" defaultMessage="Toutes vos sources de revenus" />
          </h2>
        </div>

        <div className="space-y-5">
          {/* Category 1: Direct commissions */}
          <div>
            <h3 className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-2">
              <FormattedMessage id="chatter.howToEarn.comm.category.calls" defaultMessage="Commissions directes" />
            </h3>
            <div className="space-y-1.5">
              <CommissionRow
                icon={<Phone className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'chatter.howToEarn.comm.clientCallLawyer', defaultMessage: 'Appel client (avocat)' })}
                amount={formatCents(clientCallAmountLawyer)}
                detail={intl.formatMessage({ id: 'chatter.howToEarn.comm.perCall', defaultMessage: 'par appel' })}
                color="text-green-600 dark:text-green-400"
              />
              <CommissionRow
                icon={<Phone className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'chatter.howToEarn.comm.clientCallExpat', defaultMessage: 'Appel client (expatrié aidant)' })}
                amount={formatCents(clientCallAmountExpat)}
                detail={intl.formatMessage({ id: 'chatter.howToEarn.comm.perCall', defaultMessage: 'par appel' })}
                color="text-green-600 dark:text-green-400"
              />
              {isCaptain ? (
                <>
                  <CommissionRow
                    icon={<Crown className="h-4 w-4" />}
                    label={intl.formatMessage({ id: 'chatter.howToEarn.comm.captainCallLawyer', defaultMessage: 'Appel équipe (avocat)' })}
                    amount={`$${((captainData?.captainConfig?.commissionCaptainCallAmountLawyer ?? 300) / 100).toFixed(0)}`}
                    detail={intl.formatMessage({ id: 'chatter.howToEarn.comm.captainCallLawyerDesc', defaultMessage: 'par appel de votre équipe' })}
                    color="text-purple-600 dark:text-purple-400"
                  />
                  <CommissionRow
                    icon={<Crown className="h-4 w-4" />}
                    label={intl.formatMessage({ id: 'chatter.howToEarn.comm.captainCallExpat', defaultMessage: 'Appel équipe (expatrié)' })}
                    amount={`$${((captainData?.captainConfig?.commissionCaptainCallAmountExpat ?? 200) / 100).toFixed(0)}`}
                    detail={intl.formatMessage({ id: 'chatter.howToEarn.comm.captainCallExpatDesc', defaultMessage: 'par appel de votre équipe' })}
                    color="text-purple-600 dark:text-purple-400"
                  />
                </>
              ) : (
                <>
                  <CommissionRow
                    icon={<Users className="h-4 w-4" />}
                    label={intl.formatMessage({ id: 'chatter.howToEarn.comm.n1Call', defaultMessage: 'Appel filleul N1' })}
                    amount={formatCents(n1CallAmount)}
                    detail={intl.formatMessage({ id: 'chatter.howToEarn.comm.passive', defaultMessage: 'revenu passif' })}
                    color="text-blue-600 dark:text-blue-400"
                  />
                  <CommissionRow
                    icon={<Users className="h-4 w-4" />}
                    label={intl.formatMessage({ id: 'chatter.howToEarn.comm.n2Call', defaultMessage: 'Appel filleul N2' })}
                    amount={formatCents(n2CallAmount)}
                    detail={intl.formatMessage({ id: 'chatter.howToEarn.comm.passive', defaultMessage: 'revenu passif' })}
                    color="text-indigo-600 dark:text-indigo-400"
                  />
                </>
              )}
            </div>
          </div>

          {/* Category 2: Referral bonuses */}
          <div>
            <h3 className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-2">
              <FormattedMessage id="chatter.howToEarn.comm.category.referral" defaultMessage="Parrainage" />
            </h3>
            <div className="space-y-1.5">
              <CommissionRow
                icon={<Target className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'chatter.howToEarn.comm.activation', defaultMessage: 'Bonus activation' })}
                amount={formatCents(activationBonusAmount)}
                detail={intl.formatMessage({ id: 'chatter.howToEarn.comm.activationDesc', defaultMessage: 'filleul actif (2 appels)' })}
                color="text-orange-600 dark:text-orange-400"
              />
              <CommissionRow
                icon={<Share2 className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'chatter.howToEarn.comm.recruitBonus', defaultMessage: 'Bonus recrutement équipe' })}
                amount={formatCents(recruitBonusAmount)}
                detail={intl.formatMessage({ id: 'chatter.howToEarn.comm.recruitDesc', defaultMessage: 'filleul recrute qqun' })}
                color="text-teal-600 dark:text-teal-400"
              />
              <CommissionRow
                icon={<TrendingUp className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'chatter.howToEarn.comm.tierBonuses', defaultMessage: 'Bonus paliers' })}
                amount={(() => {
                  const ms = config?.recruitmentMilestones ?? [{ count: 5, bonus: 1500 }, { count: 500, bonus: 400000 }];
                  const first = ms[0]; const last = ms[ms.length - 1];
                  return `$${(first.bonus / 100).toFixed(0)}→$${((last.bonus / 100) / 1000).toFixed(0)}K`;
                })()}
                detail={intl.formatMessage({ id: 'chatter.howToEarn.comm.tierDesc', defaultMessage: '5 à 500 recrues' })}
                color="text-indigo-600 dark:text-indigo-400"
              />
            </div>
          </div>

          {/* Category 3: Premium */}
          <div>
            <h3 className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-2">
              <FormattedMessage id="chatter.howToEarn.comm.category.premium" defaultMessage="Premium" />
            </h3>
            <div className="space-y-1.5">
              <CommissionRow
                icon={<Briefcase className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'chatter.howToEarn.comm.providerCall', defaultMessage: 'Recrutement prestataire' })}
                amount={formatCents(providerCallAmount)}
                detail={intl.formatMessage({ id: 'chatter.howToEarn.comm.providerCallDesc', defaultMessage: 'par appel pendant 6 mois' })}
                color="text-emerald-600 dark:text-emerald-400"
              />
              <CommissionRow
                icon={<Trophy className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'chatter.howToEarn.comm.top3', defaultMessage: 'Top 3 mensuel' })}
                amount={(() => {
                  const p = config?.monthlyCompetitionPrizes;
                  return p
                    ? `$${(p.third / 100).toFixed(0)}→$${(p.first / 100).toFixed(0)}`
                    : '$50→$200';
                })()}
                detail={intl.formatMessage({ id: 'chatter.howToEarn.comm.top3Desc', defaultMessage: 'prix chaque mois' })}
                color="text-yellow-600 dark:text-yellow-400"
              />
              <CommissionRow
                icon={<MessageCircle className="h-4 w-4" />}
                label={intl.formatMessage({ id: 'chatter.howToEarn.comm.telegram', defaultMessage: 'Bonus Telegram' })}
                amount={formatCents(config?.telegramBonusAmount || 5000)}
                detail={intl.formatMessage({ id: 'chatter.howToEarn.comm.telegramDesc', defaultMessage: 'lier Telegram + {threshold} ventes' }, { threshold: formatCents(config?.piggyBankUnlockThreshold || 15000) })}
                color="text-sky-600 dark:text-sky-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 4: PROVIDER RECRUITMENT */}
      {/* ============================================================ */}
      <ProviderRecruitmentSection recruitmentShareUrl={clientShareUrl} providerCallAmount={providerCallAmount} />

      {/* ============================================================ */}
      {/* SECTION 5: MONTHLY COMPETITION */}
      {/* ============================================================ */}
      <MonthlyCompetitionSection
        currentMonthRank={dashboardData?.chatter?.currentMonthRank ?? null}
        competitionPrizes={config?.monthlyCompetitionPrizes}
        competitionEligibilityMinimum={config?.competitionEligibilityMinimum}
      />

      {/* ============================================================ */}
      {/* SECTION 6: RECRUITMENT MILESTONES */}
      {/* ============================================================ */}
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="chatter.howToEarn.tiers.title" defaultMessage="Bonus de recrutement" />
          </h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          <FormattedMessage id="chatter.howToEarn.tiers.subtitle" defaultMessage="Recrutez d'autres chatters et débloquez des bonus uniques" />
        </p>

        {/* Qualified count */}
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          <FormattedMessage
            id="chatter.howToEarn.tiers.qualifiedCount"
            defaultMessage="Vous avez {count} filleuls qualifiés"
            values={{ count: qualified }}
          />
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(config?.recruitmentMilestones ?? [
            { count: 5, bonus: 1500 }, { count: 10, bonus: 3500 }, { count: 20, bonus: 7500 },
            { count: 50, bonus: 25000 }, { count: 100, bonus: 60000 }, { count: 500, bonus: 400000 },
          ]).map((tier) => {
            const isReached = qualified >= tier.count;
            return (
              <div
                key={tier.count}
                className={`p-3 rounded-xl text-center border-2 transition-all ${
                  isReached
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                    : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400'
                }`}
              >
                {isReached && <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-500" />}
                <div className="font-black text-lg">${(tier.bonus / 100).toLocaleString()}</div>
                <div className="text-[10px] font-medium">
                  <FormattedMessage id="chatter.howToEarn.tiers.recruitCount" defaultMessage="{count} recrues" values={{ count: tier.count }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 7: CAPTAIN SECTION (conditional) */}
      {/* ============================================================ */}
      {isCaptain && (
        <div className={`${UI.card} p-4 sm:p-6 border-l-4 border-orange-500`}>
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="chatter.howToEarn.captain.title" defaultMessage="Vos revenus Capitaine" />
            </h2>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            <FormattedMessage
              id="chatter.howToEarn.captain.desc"
              defaultMessage="En tant que capitaine, vous gagnez des commissions sur chaque appel généré par votre équipe (vos chatters N1 et N2). Plus vous recrutez, motivez et accompagnez vos chatters, plus ils sont actifs, et plus vous gagnez."
            />
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <CommissionCard
              icon={<Phone className="h-5 w-5" />}
              label={intl.formatMessage({ id: 'chatter.howToEarn.captain.perCallLawyer', defaultMessage: 'Par appel avocat' })}
              amount={`$${((captainData?.captainConfig?.commissionCaptainCallAmountLawyer ?? 300) / 100).toFixed(0)}`}
              sublabel={intl.formatMessage({ id: 'chatter.howToEarn.captain.teamCall', defaultMessage: 'appel de votre équipe' })}
              color="text-orange-600 dark:text-orange-400"
            />
            <CommissionCard
              icon={<Phone className="h-5 w-5" />}
              label={intl.formatMessage({ id: 'chatter.howToEarn.captain.perCallExpat', defaultMessage: 'Par appel expatrié' })}
              amount={`$${((captainData?.captainConfig?.commissionCaptainCallAmountExpat ?? 200) / 100).toFixed(0)}`}
              sublabel={intl.formatMessage({ id: 'chatter.howToEarn.captain.teamCall', defaultMessage: 'appel de votre équipe' })}
              color="text-amber-600 dark:text-amber-400"
            />
          </div>

          {/* Quality bonus */}
          {captainData?.qualityBonusStatus && (
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-purple-500" />
                <span className="font-bold text-sm text-purple-800 dark:text-purple-300">
                  <FormattedMessage id="chatter.howToEarn.captain.qualityBonus.title" defaultMessage="Bonus qualité" />
                </span>
                <span className="ml-auto text-lg font-black text-purple-600 dark:text-purple-400">
                  <FormattedMessage
                    id="chatter.howToEarn.captain.qualityBonus.amountPerMonth"
                    defaultMessage="{amount}/mois"
                    values={{ amount: formatCents(captainData.qualityBonusStatus.bonusAmount) }}
                  />
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  {captainData.qualityBonusStatus.activeN1Count >= captainData.qualityBonusStatus.minRecruits
                    ? <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    : <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                  }
                  <span className="text-gray-600 dark:text-gray-400">
                    <FormattedMessage
                      id="chatter.howToEarn.captain.qualityBonus.criteria1"
                      defaultMessage="N1 actifs : {current}/{min}"
                      values={{ current: captainData.qualityBonusStatus.activeN1Count, min: captainData.qualityBonusStatus.minRecruits }}
                    />
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {captainData.qualityBonusStatus.monthlyTeamCommissions >= captainData.qualityBonusStatus.minCommissions
                    ? <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    : <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                  }
                  <span className="text-gray-600 dark:text-gray-400">
                    <FormattedMessage
                      id="chatter.howToEarn.captain.qualityBonus.criteria2"
                      defaultMessage="Commissions équipe : ${current}/${min}"
                      values={{
                        current: (captainData.qualityBonusStatus.monthlyTeamCommissions / 100).toFixed(0),
                        min: (captainData.qualityBonusStatus.minCommissions / 100).toFixed(0),
                      }}
                    />
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 text-sm text-orange-800 dark:text-orange-300 mb-4">
            <p className="font-semibold mb-1">
              <FormattedMessage id="chatter.howToEarn.captain.role" defaultMessage="Votre rôle de capitaine :" />
            </p>
            <ul className="list-disc list-inside text-xs space-y-1 text-orange-700 dark:text-orange-400">
              <li><FormattedMessage id="chatter.howToEarn.captain.role1" defaultMessage="Recrutez des chatters motivés" /></li>
              <li><FormattedMessage id="chatter.howToEarn.captain.role2" defaultMessage="Aidez-les à démarrer et à comprendre le système" /></li>
              <li><FormattedMessage id="chatter.howToEarn.captain.role3" defaultMessage="Motivez-les régulièrement (sans spam !)" /></li>
              <li><FormattedMessage id="chatter.howToEarn.captain.role4" defaultMessage="Suivez leur activité et accompagnez-les" /></li>
            </ul>
          </div>
        </div>
      )}

      {/* SECTION 8: Captain tier progress (conditional) */}
      {isCaptain && captainData && (
        <CaptainTierProgress captainData={captainData} />
      )}

      {/* ============================================================ */}
      {/* SECTION 9: ANTI-SPAM WARNING */}
      {/* ============================================================ */}
      <div className={`${UI.card} p-5 border-l-4 border-red-500`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-700 dark:text-red-400 mb-1">
              <FormattedMessage id="chatter.howToEarn.noSpam.title" defaultMessage="Spam = Suspension immédiate" />
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <FormattedMessage
                id="chatter.howToEarn.noSpam.desc"
                defaultMessage="Le spam est strictement interdit. Ne postez pas le même message en boucle, ne faites pas de copier-coller massif, ne harceler personne. Partagez votre lien de manière naturelle et utile dans des conversations pertinentes. Le spam nuit à la réputation de tous et entraîne une suspension immédiate et définitive."
              />
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 10: TIPS */}
      {/* ============================================================ */}
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="chatter.howToEarn.tips.title" defaultMessage="Conseils pour réussir" />
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              icon: <CheckCircle className="h-4 w-4 text-green-500" />,
              text: intl.formatMessage({ id: 'chatter.howToEarn.tip1', defaultMessage: 'Ciblez les groupes d\'expatriés sur Facebook, WhatsApp et Telegram — c\'est là que sont vos futurs clients' }),
            },
            {
              icon: <CheckCircle className="h-4 w-4 text-green-500" />,
              text: intl.formatMessage({ id: 'chatter.howToEarn.tip2', defaultMessage: 'Répondez aux questions des gens naturellement, puis proposez votre lien comme solution' }),
            },
            {
              icon: <CheckCircle className="h-4 w-4 text-green-500" />,
              text: intl.formatMessage({ id: 'chatter.howToEarn.tip3', defaultMessage: 'Recrutez d\'autres chatters — chaque appel de vos filleuls vous rapporte aussi' }),
            },
            {
              icon: <CheckCircle className="h-4 w-4 text-green-500" />,
              text: intl.formatMessage({ id: 'chatter.howToEarn.tip4', defaultMessage: 'Soyez actif régulièrement — la régularité est la clé du succès' }),
            },
            {
              icon: <CheckCircle className="h-4 w-4 text-green-500" />,
              text: intl.formatMessage({ id: 'chatter.howToEarn.tip5', defaultMessage: 'Recrutez des avocats — c\'est votre source de revenus passifs la plus puissante ({amount}/appel pendant 6 mois)' }, { amount: formatCents(providerCallAmount) }),
            },
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
              {tip.icon}
              <span>{tip.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE EXPORT
// ============================================================================

export default function ChatterHowToEarnPage() {
  return (
    <ChatterDashboardLayout activeKey="howToEarn">
      <ChatterHowToEarn />
    </ChatterDashboardLayout>
  );
}
