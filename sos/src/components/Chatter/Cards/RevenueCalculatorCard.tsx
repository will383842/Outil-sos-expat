/**
 * RevenueCalculatorCard
 *
 * Interactive revenue calculator for the Chatter dashboard.
 * Features:
 * - Current situation overview (personal calls, N1/N2 team earnings)
 * - Recruitment simulation with bonus calculations
 * - Goal-based reverse calculator with multiple options
 * - Glassmorphism design with animations
 */

import React, { useState, useMemo, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Calculator,
  DollarSign,
  Users,
  UserPlus,
  Target,
  TrendingUp,
  Rocket,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Zap,
  Gift,
  Award,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface RevenueCalculatorCardProps {
  currentCalls: number;
  n1TeamSize: number;
  n1TeamCalls: number;
  n2TeamSize: number;
  n2TeamCalls: number;
  paidTierBonuses: number[];
  onRecruit?: () => void;
  loading?: boolean;
}

// ============================================================================
// CONSTANTS - GAINS VALUES
// ============================================================================

const GAINS = {
  CLIENT_CALL: 1000,        // 10$ in cents
  N1_CALL: 100,             // 1$ in cents
  N2_CALL: 50,              // 0.50$ in cents
  ACTIVATION_BONUS: 500,    // 5$ in cents
  TIER_BONUSES: {
    5: 2500,                // 25$ in cents
    10: 7500,               // 75$ in cents
    25: 20000,              // 200$ in cents
    50: 50000,              // 500$ in cents
    100: 150000,            // 1500$ in cents
  } as Record<number, number>,
} as const;

const TIER_THRESHOLDS = [5, 10, 25, 50, 100];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCents = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

const formatCentsShort = (cents: number): string => {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${dollars.toFixed(0)}`;
};

// ============================================================================
// ANIMATED NUMBER COMPONENT
// ============================================================================

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  return (
    <span className={`tabular-nums transition-all duration-300 ${className}`}>
      {prefix}{(value / 100).toFixed(2)}{suffix}
    </span>
  );
};

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  gradient: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  collapsible?: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  subtitle,
  gradient,
  isExpanded = true,
  onToggle,
  collapsible = false,
}) => {
  const content = (
    <div className="flex items-center gap-3">
      <div className={`flex-shrink-0 p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {subtitle}
          </p>
        )}
      </div>
      {collapsible && (
        <div className="flex-shrink-0 text-gray-400">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      )}
    </div>
  );

  if (collapsible && onToggle) {
    return (
      <button
        onClick={onToggle}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-1 -m-1"
      >
        {content}
      </button>
    );
  }

  return content;
};

// ============================================================================
// STAT LINE COMPONENT
// ============================================================================

interface StatLineProps {
  label: React.ReactNode;
  value: string;
  subValue?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}

const StatLine: React.FC<StatLineProps> = ({
  label,
  value,
  subValue,
  highlight = false,
  icon,
}) => {
  return (
    <div className={`flex items-center justify-between py-2 ${highlight ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 -mx-3 px-3 rounded-lg' : ''}`}>
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="text-right">
        <span className={`font-semibold ${highlight ? 'text-green-600 dark:text-green-400 text-lg' : 'text-gray-900 dark:text-white'}`}>
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            ({subValue})
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// INPUT SLIDER COMPONENT
// ============================================================================

interface InputSliderProps {
  label: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  gradient: string;
}

const InputSlider: React.FC<InputSliderProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  gradient,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className={`text-lg font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
          {value}{unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-gradient-to-r
            [&::-webkit-slider-thumb]:from-blue-500
            [&::-webkit-slider-thumb]:to-purple-500
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-gradient-to-r
            [&::-moz-range-thumb]:from-blue-500
            [&::-moz-range-thumb]:to-purple-500
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3B82F6 0%, #8B5CF6 ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`,
          }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// GOAL INPUT COMPONENT
// ============================================================================

interface GoalInputProps {
  value: number;
  onChange: (value: number) => void;
}

const GoalInput: React.FC<GoalInputProps> = ({ value, onChange }) => {
  const intl = useIntl();
  const presets = [100, 500, 1000, 2000, 5000];

  return (
    <div className="space-y-3">
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          placeholder={intl.formatMessage({
            id: 'calculator.goal.placeholder',
            defaultMessage: 'Enter your goal',
          })}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-lg font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          /month
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-all touch-manipulation active:scale-95 ${
              value === preset
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            ${preset}
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// OPTION CARD COMPONENT
// ============================================================================

interface OptionCardProps {
  option: string;
  title: React.ReactNode;
  description: React.ReactNode;
  metrics: Array<{
    label: React.ReactNode;
    value: string;
  }>;
  gradient: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

const OptionCard: React.FC<OptionCardProps> = ({
  option,
  title,
  description,
  metrics,
  gradient,
  icon,
  recommended = false,
}) => {
  return (
    <div className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-lg ${
      recommended
        ? 'border-green-400 dark:border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-white/5'
    }`}>
      {recommended && (
        <div className="absolute -top-3 left-4 px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <FormattedMessage id="calculator.recommended" defaultMessage="Recommended" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-md`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
              {option}
            </span>
          </div>
          <h4 className="font-bold text-gray-900 dark:text-white mb-1">
            {title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {description}
          </p>
          <div className="space-y-1">
            {metrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{metric.label}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TIER BONUS INDICATOR
// ============================================================================

interface TierBonusIndicatorProps {
  currentCount: number;
  simulatedCount: number;
  paidTiers: number[];
}

const TierBonusIndicator: React.FC<TierBonusIndicatorProps> = ({
  currentCount,
  simulatedCount,
  paidTiers,
}) => {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {TIER_THRESHOLDS.map((tier) => {
        const isPaid = paidTiers.includes(tier);
        const willUnlock = !isPaid && simulatedCount >= tier;
        const isNext = !isPaid && currentCount < tier && simulatedCount < tier;

        return (
          <div
            key={tier}
            className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              isPaid
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 line-through'
                : willUnlock
                ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white shadow-md animate-pulse'
                : isNext
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
            }`}
          >
            {willUnlock && <Gift className="w-3 h-3" />}
            <span>{tier}</span>
            <span className="opacity-75">
              {formatCentsShort(GAINS.TIER_BONUSES[tier])}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RevenueCalculatorCard: React.FC<RevenueCalculatorCardProps> = ({
  currentCalls,
  n1TeamSize,
  n1TeamCalls,
  n2TeamSize,
  n2TeamCalls,
  paidTierBonuses,
  onRecruit,
  loading = false,
}) => {
  const intl = useIntl();

  // State for sections
  const [expandedSections, setExpandedSections] = useState({
    current: true,
    simulation: true,
    objective: true,
  });

  // State for simulation
  const [recruitSimulation, setRecruitSimulation] = useState(5);

  // State for goal calculator
  const [goalAmount, setGoalAmount] = useState(500);

  // Toggle section
  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Calculate current earnings
  const currentEarnings = useMemo(() => {
    const ownCalls = currentCalls * GAINS.CLIENT_CALL;
    const n1Earnings = n1TeamCalls * GAINS.N1_CALL;
    const n2Earnings = n2TeamCalls * GAINS.N2_CALL;
    const total = ownCalls + n1Earnings + n2Earnings;

    return {
      ownCalls,
      n1Earnings,
      n2Earnings,
      total,
    };
  }, [currentCalls, n1TeamCalls, n2TeamCalls]);

  // Calculate simulation results
  const simulationResults = useMemo(() => {
    const newTeamSize = n1TeamSize + recruitSimulation;
    const activationBonus = recruitSimulation * GAINS.ACTIVATION_BONUS;

    // Calculate tier bonuses that would be unlocked
    let tierBonusTotal = 0;
    const unlockedTiers: number[] = [];

    TIER_THRESHOLDS.forEach((tier) => {
      if (!paidTierBonuses.includes(tier) && newTeamSize >= tier && n1TeamSize < tier) {
        tierBonusTotal += GAINS.TIER_BONUSES[tier];
        unlockedTiers.push(tier);
      }
    });

    // Estimate new passive income (assuming each recruit does 5 calls/month average)
    const estimatedNewCalls = recruitSimulation * 5;
    const newPassiveIncome = estimatedNewCalls * GAINS.N1_CALL;

    // New total estimate
    const newMonthlyEstimate = currentEarnings.total + newPassiveIncome;
    const oneTimeBonus = activationBonus + tierBonusTotal;

    return {
      newTeamSize,
      activationBonus,
      tierBonusTotal,
      unlockedTiers,
      newPassiveIncome,
      newMonthlyEstimate,
      oneTimeBonus,
    };
  }, [recruitSimulation, n1TeamSize, paidTierBonuses, currentEarnings.total]);

  // Calculate goal options
  const goalOptions = useMemo(() => {
    const goalCents = goalAmount * 100;

    // Option A: Solo (only own calls)
    const soloCallsNeeded = Math.ceil(goalCents / GAINS.CLIENT_CALL);

    // Option B: Small team (you + 5 active people)
    const smallTeamSize = 5;
    const smallTeamPassive = smallTeamSize * 5 * GAINS.N1_CALL; // 5 calls each
    const smallTeamOwnCalls = Math.ceil(Math.max(0, goalCents - smallTeamPassive) / GAINS.CLIENT_CALL);

    // Option C: Bigger team (mostly passive)
    const targetPassivePercent = 0.8;
    const targetPassive = goalCents * targetPassivePercent;
    const teamNeeded = Math.ceil(targetPassive / (5 * GAINS.N1_CALL));
    const bigTeamOwnCalls = Math.ceil((goalCents - targetPassive) / GAINS.CLIENT_CALL);

    return {
      solo: {
        callsNeeded: soloCallsNeeded,
        callsPerDay: Math.ceil(soloCallsNeeded / 30),
      },
      smallTeam: {
        teamSize: smallTeamSize,
        ownCalls: smallTeamOwnCalls,
        passiveIncome: smallTeamPassive,
      },
      bigTeam: {
        teamSize: teamNeeded,
        ownCalls: bigTeamOwnCalls,
        passivePercent: Math.round(targetPassivePercent * 100),
      },
    };
  }, [goalAmount]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200/50 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="calculator.title" defaultMessage="Revenue Calculator" />
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="calculator.subtitle" defaultMessage="Simulate your earnings potential" />
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* ================================================================== */}
        {/* SECTION 1: CURRENT SITUATION */}
        {/* ================================================================== */}
        <div className="space-y-4">
          <SectionHeader
            icon={<DollarSign className="w-5 h-5" />}
            title={<FormattedMessage id="calculator.current.title" defaultMessage="Current Situation" />}
            subtitle={<FormattedMessage id="calculator.current.subtitle" defaultMessage="Your monthly earnings breakdown" />}
            gradient="from-blue-500 to-blue-600"
            isExpanded={expandedSections.current}
            onToggle={() => toggleSection('current')}
            collapsible
          />

          {expandedSections.current && (
            <div className="space-y-2 pl-2 animate-in slide-in-from-top-2 duration-300">
              <StatLine
                label={
                  <FormattedMessage
                    id="calculator.current.ownCalls"
                    defaultMessage="Your calls this month"
                  />
                }
                value={`${currentCalls} ${intl.formatMessage({ id: 'calculator.calls', defaultMessage: 'calls' })}`}
                subValue={formatCents(currentEarnings.ownCalls)}
                icon={<Zap className="w-4 h-4" />}
              />

              <StatLine
                label={
                  <FormattedMessage
                    id="calculator.current.n1Team"
                    defaultMessage="Your N1 team"
                  />
                }
                value={`${n1TeamSize} ${intl.formatMessage({ id: 'calculator.people', defaultMessage: 'people' })}, ${n1TeamCalls} ${intl.formatMessage({ id: 'calculator.calls', defaultMessage: 'calls' })}`}
                subValue={formatCents(currentEarnings.n1Earnings)}
                icon={<Users className="w-4 h-4" />}
              />

              <StatLine
                label={
                  <FormattedMessage
                    id="calculator.current.n2Team"
                    defaultMessage="Your N2 team"
                  />
                }
                value={`${n2TeamSize} ${intl.formatMessage({ id: 'calculator.people', defaultMessage: 'people' })}, ${n2TeamCalls} ${intl.formatMessage({ id: 'calculator.calls', defaultMessage: 'calls' })}`}
                subValue={formatCents(currentEarnings.n2Earnings)}
                icon={<Users className="w-4 h-4" />}
              />

              <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

              <StatLine
                label={
                  <FormattedMessage
                    id="calculator.current.total"
                    defaultMessage="TOTAL CURRENT"
                  />
                }
                value={`${formatCents(currentEarnings.total)}/month`}
                highlight
                icon={<Award className="w-4 h-4 text-green-500" />}
              />

              {/* Rate reminder */}
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <FormattedMessage
                      id="calculator.rates.info"
                      defaultMessage="Rates: Your calls = $10 | N1 calls = $1 | N2 calls = $0.50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* SECTION 2: SIMULATION */}
        {/* ================================================================== */}
        <div className="space-y-4">
          <SectionHeader
            icon={<UserPlus className="w-5 h-5" />}
            title={<FormattedMessage id="calculator.simulation.title" defaultMessage="If You Recruit More" />}
            subtitle={<FormattedMessage id="calculator.simulation.subtitle" defaultMessage="Simulate your growth" />}
            gradient="from-purple-500 to-pink-600"
            isExpanded={expandedSections.simulation}
            onToggle={() => toggleSection('simulation')}
            collapsible
          />

          {expandedSections.simulation && (
            <div className="space-y-4 pl-2 animate-in slide-in-from-top-2 duration-300">
              <InputSlider
                label={
                  <FormattedMessage
                    id="calculator.simulation.recruitInput"
                    defaultMessage="Recruit X more people"
                  />
                }
                value={recruitSimulation}
                onChange={setRecruitSimulation}
                min={1}
                max={50}
                gradient="from-purple-500 to-pink-500"
              />

              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl space-y-3">
                <StatLine
                  label={
                    <FormattedMessage
                      id="calculator.simulation.activationBonus"
                      defaultMessage="Activation bonus"
                    />
                  }
                  value={`${recruitSimulation} x $5 = ${formatCents(simulationResults.activationBonus)}`}
                  icon={<Gift className="w-4 h-4 text-purple-500" />}
                />

                {/* Tier Bonuses */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <FormattedMessage
                      id="calculator.simulation.tierBonuses"
                      defaultMessage="Tier bonuses"
                    />
                  </div>
                  <TierBonusIndicator
                    currentCount={n1TeamSize}
                    simulatedCount={simulationResults.newTeamSize}
                    paidTiers={paidTierBonuses}
                  />
                  {simulationResults.tierBonusTotal > 0 && (
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      +{formatCents(simulationResults.tierBonusTotal)} <FormattedMessage id="calculator.simulation.tierUnlock" defaultMessage="in tier bonuses!" />
                    </p>
                  )}
                </div>

                <StatLine
                  label={
                    <FormattedMessage
                      id="calculator.simulation.newPassive"
                      defaultMessage="New passive income estimate"
                    />
                  }
                  value={`+${formatCents(simulationResults.newPassiveIncome)}/month`}
                  icon={<TrendingUp className="w-4 h-4 text-green-500" />}
                />

                <div className="h-px bg-purple-200 dark:bg-purple-800/50" />

                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 dark:text-white">
                    <FormattedMessage
                      id="calculator.simulation.newTotal"
                      defaultMessage="NEW MONTHLY TOTAL"
                    />
                  </span>
                  <div className="text-right">
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {formatCents(simulationResults.newMonthlyEstimate)}/month
                    </p>
                    {simulationResults.oneTimeBonus > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        +{formatCents(simulationResults.oneTimeBonus)} <FormattedMessage id="calculator.simulation.oneTime" defaultMessage="one-time bonus" />
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* SECTION 3: OBJECTIVE CALCULATOR */}
        {/* ================================================================== */}
        <div className="space-y-4">
          <SectionHeader
            icon={<Target className="w-5 h-5" />}
            title={<FormattedMessage id="calculator.objective.title" defaultMessage="Objective Calculator" />}
            subtitle={<FormattedMessage id="calculator.objective.subtitle" defaultMessage="How to reach your income goal" />}
            gradient="from-orange-500 to-red-600"
            isExpanded={expandedSections.objective}
            onToggle={() => toggleSection('objective')}
            collapsible
          />

          {expandedSections.objective && (
            <div className="space-y-4 pl-2 animate-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FormattedMessage
                    id="calculator.objective.goalLabel"
                    defaultMessage="I want to earn..."
                  />
                </label>
                <GoalInput value={goalAmount} onChange={setGoalAmount} />
              </div>

              <div className="space-y-3">
                <OptionCard
                  option="A"
                  title={<FormattedMessage id="calculator.option.solo.title" defaultMessage="Solo" />}
                  description={<FormattedMessage id="calculator.option.solo.desc" defaultMessage="Reach your goal with your own calls only" />}
                  metrics={[
                    {
                      label: <FormattedMessage id="calculator.option.solo.calls" defaultMessage="Calls needed" />,
                      value: `${goalOptions.solo.callsNeeded}/month`,
                    },
                    {
                      label: <FormattedMessage id="calculator.option.solo.perDay" defaultMessage="Per day" />,
                      value: `~${goalOptions.solo.callsPerDay} calls`,
                    },
                  ]}
                  gradient="from-blue-500 to-cyan-500"
                  icon={<Zap className="w-5 h-5" />}
                />

                <OptionCard
                  option="B"
                  title={<FormattedMessage id="calculator.option.smallTeam.title" defaultMessage="Small Team" />}
                  description={<FormattedMessage id="calculator.option.smallTeam.desc" defaultMessage="Build a team of 5 active members" />}
                  metrics={[
                    {
                      label: <FormattedMessage id="calculator.option.smallTeam.passive" defaultMessage="Passive income" />,
                      value: formatCents(goalOptions.smallTeam.passiveIncome),
                    },
                    {
                      label: <FormattedMessage id="calculator.option.smallTeam.ownCalls" defaultMessage="Your calls" />,
                      value: `${goalOptions.smallTeam.ownCalls}/month`,
                    },
                  ]}
                  gradient="from-purple-500 to-pink-500"
                  icon={<Users className="w-5 h-5" />}
                  recommended
                />

                <OptionCard
                  option="C"
                  title={<FormattedMessage id="calculator.option.bigTeam.title" defaultMessage="Big Team" />}
                  description={<FormattedMessage id="calculator.option.bigTeam.desc" defaultMessage="Mostly passive income" />}
                  metrics={[
                    {
                      label: <FormattedMessage id="calculator.option.bigTeam.teamSize" defaultMessage="Team size needed" />,
                      value: `${goalOptions.bigTeam.teamSize} people`,
                    },
                    {
                      label: <FormattedMessage id="calculator.option.bigTeam.passive" defaultMessage="Passive" />,
                      value: `${goalOptions.bigTeam.passivePercent}%`,
                    },
                    {
                      label: <FormattedMessage id="calculator.option.bigTeam.ownCalls" defaultMessage="Your calls" />,
                      value: `${goalOptions.bigTeam.ownCalls}/month`,
                    },
                  ]}
                  gradient="from-green-500 to-emerald-500"
                  icon={<TrendingUp className="w-5 h-5" />}
                />
              </div>
            </div>
          )}
        </div>

        {/* ================================================================== */}
        {/* CTA BUTTON - Mobile sticky at bottom consideration */}
        {/* ================================================================== */}
        {onRecruit && (
          <button
            onClick={onRecruit}
            className="w-full flex items-center justify-center gap-2 sm:gap-3 min-h-[56px] p-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 active:scale-[0.98] transition-all touch-manipulation group"
          >
            <Rocket className="w-5 h-5 sm:w-6 sm:h-6 group-hover:animate-bounce flex-shrink-0" />
            <span className="truncate">
              <FormattedMessage
                id="calculator.cta"
                defaultMessage="RECRUIT NOW"
              />
            </span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
};

export default RevenueCalculatorCard;
