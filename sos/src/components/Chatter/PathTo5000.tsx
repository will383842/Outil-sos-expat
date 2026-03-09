/**
 * PathTo5000 - 2026 Design System
 * Visual roadmap with glassmorphism cards and indigo/violet palette.
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Target,
  Users,
  Crown,
  Rocket,
  TrendingUp,
  CheckCircle,
  DollarSign,
  Clock,
  Zap,
  Star,
  Trophy,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { UI, ANIMATION, CHATTER_THEME, TYPOGRAPHY } from '@/components/Chatter/designTokens';

// Default commission constants (in cents) — overridden by backend config
const DEFAULT_COMMISSIONS = {
  CLIENT_CALL: 400,         // ~$3-5 average (lawyer=$5, expat=$3)
  N1_CALL: 100,             // $1
  N2_CALL: 50,              // $0.50
  ACTIVATION_BONUS: 500,    // $5
  TIER_5: 1500,             // $15
  TIER_10: 3500,            // $35
  TIER_20: 7500,            // $75
  TIER_50: 25000,           // $250
  TIER_100: 60000,          // $600
  TIER_500: 400000,         // $4,000
};

// Milestones to $5000 (500000 cents)
const DEFAULT_MILESTONES = [
  { amount: 10000, label: '$100', emoji: '🎯', description: '10 clients' },
  { amount: 50000, label: '$500', emoji: '🔥', description: '50 clients ou 5 filleuls actifs' },
  { amount: 100000, label: '$1,000', emoji: '⭐', description: '100 clients ou 10 filleuls actifs' },
  { amount: 250000, label: '$2,500', emoji: '💎', description: 'Équipe de 25 personnes + bonus tiers' },
  { amount: 500000, label: '$5,000', emoji: '🚀', description: '50+ filleuls qualifiés = Bonus $4,000 !' },
];

interface PathTo5000Props {
  variant?: 'landing' | 'dashboard' | 'compact';
  currentEarnings?: number;  // Current total earnings in cents
  currentClients?: number;
  currentRecruits?: number;
  onCTAClick?: () => void;
  /** Commission rates from backend config (cents) */
  commissionRates?: {
    clientCallAmount?: number;
    n1CallAmount?: number;
    n2CallAmount?: number;
    activationBonusAmount?: number;
  };
  /** Recruitment milestone bonuses from backend config */
  recruitmentMilestones?: Array<{ count: number; bonus: number }>;
  className?: string;
}

const PathTo5000: React.FC<PathTo5000Props> = ({
  variant = 'landing',
  currentEarnings = 0,
  currentClients = 0,
  currentRecruits = 0,
  onCTAClick,
  commissionRates,
  recruitmentMilestones,
  className = '',
}) => {
  const intl = useIntl();
  const [expandedPath, setExpandedPath] = useState<'solo' | 'small' | 'big' | null>('small');
  const [showAllMilestones, setShowAllMilestones] = useState(false);

  // Build effective commissions from backend config or defaults
  const COMMISSIONS = {
    CLIENT_CALL: commissionRates?.clientCallAmount ?? DEFAULT_COMMISSIONS.CLIENT_CALL,
    N1_CALL: commissionRates?.n1CallAmount ?? DEFAULT_COMMISSIONS.N1_CALL,
    N2_CALL: commissionRates?.n2CallAmount ?? DEFAULT_COMMISSIONS.N2_CALL,
    ACTIVATION_BONUS: commissionRates?.activationBonusAmount ?? DEFAULT_COMMISSIONS.ACTIVATION_BONUS,
    TIER_5: DEFAULT_COMMISSIONS.TIER_5,
    TIER_10: DEFAULT_COMMISSIONS.TIER_10,
    TIER_20: DEFAULT_COMMISSIONS.TIER_20,
    TIER_50: DEFAULT_COMMISSIONS.TIER_50,
    TIER_100: DEFAULT_COMMISSIONS.TIER_100,
    TIER_500: DEFAULT_COMMISSIONS.TIER_500,
  };

  // Override tier bonuses from backend if available
  if (recruitmentMilestones && recruitmentMilestones.length > 0) {
    for (const m of recruitmentMilestones) {
      const key = `TIER_${m.count}` as keyof typeof COMMISSIONS;
      if (key in COMMISSIONS) {
        (COMMISSIONS as Record<string, number>)[key] = m.bonus;
      }
    }
  }

  const MILESTONES = DEFAULT_MILESTONES;

  // Calculate progress
  const progressPercent = Math.min(100, (currentEarnings / 500000) * 100);
  const currentMilestoneIndex = MILESTONES.findIndex(m => m.amount > currentEarnings);
  const nextMilestone = MILESTONES[currentMilestoneIndex] || MILESTONES[MILESTONES.length - 1];

  // Format currency
  const formatAmount = (cents: number) => `$${(cents / 100).toLocaleString()}`;

  // The 3 paths to $5000
  const paths = [
    {
      id: 'solo' as const,
      icon: <Target className="w-6 h-6" />,
      title: 'Solo',
      subtitle: 'Clients directs uniquement',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      timeline: '12-18 mois',
      monthlyTarget: '$400-500/mois',
      steps: [
        { action: 'Trouver 40-50 clients/mois', earnings: '$400-500', icon: <Users className="w-4 h-4" /> },
        { action: 'Partager sur 5+ groupes Facebook/jour', earnings: '', icon: <Zap className="w-4 h-4" /> },
        { action: 'Utiliser WhatsApp Status quotidiennement', earnings: '', icon: <Clock className="w-4 h-4" /> },
        { action: 'Total après 12 mois', earnings: '$5,000+', icon: <Trophy className="w-4 h-4" /> },
      ],
      pros: ['100% de vos gains', 'Pas besoin de recruter', 'Simple à comprendre'],
      cons: ['Plus long', 'Pas de revenus passifs', 'Dépend de votre temps'],
    },
    {
      id: 'small' as const,
      icon: <Users className="w-6 h-6" />,
      title: 'Petite Équipe',
      subtitle: '10 membres actifs',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      timeline: '6-9 mois',
      monthlyTarget: '$600-800/mois',
      recommended: true,
      steps: [
        { action: 'Recruter 10 personnes motivées', earnings: '+$50 bonus activation', icon: <Users className="w-4 h-4" /> },
        { action: 'Chacun fait 20 clients/mois', earnings: '+$1/appel N1', icon: <TrendingUp className="w-4 h-4" /> },
        { action: 'Vous faites 20 clients/mois', earnings: '+$200 direct', icon: <Target className="w-4 h-4" /> },
        { action: 'Bonus tier 10 filleuls qualifiés', earnings: '+$35', icon: <Star className="w-4 h-4" /> },
        { action: 'Total mensuel estimé', earnings: '$400-600', icon: <DollarSign className="w-4 h-4" /> },
      ],
      pros: ['Revenus passifs dès le départ', 'Croissance exponentielle', 'Bonus de paliers'],
      cons: ['Besoin de recruter et former', 'Résultats dépendent de l\'équipe'],
    },
    {
      id: 'big' as const,
      icon: <Crown className="w-6 h-6" />,
      title: 'Grande Équipe',
      subtitle: '50+ filleuls qualifiés',
      color: 'from-indigo-500 to-violet-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      timeline: '3-6 mois',
      monthlyTarget: '$1,000+/mois',
      steps: [
        { action: 'Construire équipe de 50 personnes', earnings: '', icon: <Users className="w-4 h-4" /> },
        { action: 'Bonus tier 50 filleuls qualifiés', earnings: '+$250', icon: <Trophy className="w-4 h-4" /> },
        { action: '50 filleuls x $1/appel client', earnings: '+$500 passif', icon: <TrendingUp className="w-4 h-4" /> },
        { action: 'Viser Top 3 mensuel', earnings: 'x2 commissions!', icon: <Crown className="w-4 h-4" /> },
        { action: 'Bonus tier 100 puis 500', earnings: '+$600 puis +$4,000!', icon: <Rocket className="w-4 h-4" /> },
      ],
      pros: ['Revenus massifs passifs', 'Bonus $4,000 au tier 500', 'Potentiel illimité'],
      cons: ['Demande du leadership', 'Investissement temps initial'],
    },
  ];

  // Compact version for dashboard
  if (variant === 'compact') {
    return (
      <div className={`${UI.card} bg-gradient-to-br from-indigo-500/5 to-violet-500/5 dark:from-indigo-500/10 dark:to-violet-500/10 p-4 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${CHATTER_THEME.accentBg} flex items-center justify-center shadow-md shadow-indigo-500/25`}>
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">
              <FormattedMessage id="chatter.pathTo5000.goal" defaultMessage="Objectif $5,000" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatAmount(currentEarnings)} / $5,000</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full ${CHATTER_THEME.accentBg} rounded-full transition-all duration-500`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          <FormattedMessage id="chatter.pathTo5000.nextMilestone" defaultMessage="Prochain palier:" /> {nextMilestone.emoji} {nextMilestone.label}
        </p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 dark:bg-indigo-500/15 backdrop-blur-lg rounded-full mb-4 border border-indigo-500/20">
          <Rocket className="w-5 h-5 text-indigo-500" />
          <span className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">
            <FormattedMessage id="chatter.pathTo5000.badge" defaultMessage="Plan d'Action" />
          </span>
        </div>
        <h2 className="text-2xl text-slate-900 dark:text-white md:text-3xl font-bold mb-2">
          <FormattedMessage
            id="chatter.pathTo5000.title"
            defaultMessage="Comment Atteindre {amount}"
            values={{ amount: <span className={CHATTER_THEME.accentText}>$5,000</span> }}
          />
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          <FormattedMessage id="chatter.pathTo5000.subtitle" defaultMessage="3 chemins possibles selon votre style. Choisissez celui qui vous convient le mieux." />
        </p>
      </div>

      {/* Progress (if dashboard variant) */}
      {variant === 'dashboard' && currentEarnings > 0 && (
        <div className={`mb-8 ${UI.card} p-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              <FormattedMessage id="chatter.pathTo5000.progress" defaultMessage="Votre progression" />
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full ${CHATTER_THEME.accentBg} rounded-full transition-all duration-1000 relative`}
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          {/* Milestones markers */}
          <div className="flex justify-between text-xs">
            {MILESTONES.map((milestone, idx) => (
              <div
                key={idx}
                className={`flex items-center ${
                  currentEarnings >= milestone.amount ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className="text-lg">{milestone.emoji}</span>
                <span className="font-medium">{milestone.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 Paths */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {paths.map((path) => (
          <div
            key={path.id}
            className={`
              relative ${UI.card} border-2 transition-all ${ANIMATION.slow} cursor-pointer
              ${expandedPath === path.id
                ? `${path.bgColor} shadow-lg shadow-indigo-500/[0.06] scale-[1.02] ${path.borderColor}`
                : `hover:shadow-md ${path.borderColor}`
              }
            `}
            onClick={() => setExpandedPath(expandedPath === path.id ? null : path.id)}
          >
            {/* Recommended badge */}
            {path.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg shadow-emerald-500/25">
                <Star className="w-3 h-3" />
                <FormattedMessage id="chatter.pathTo5000.recommended" defaultMessage="RECOMMANDE" />
              </div>
            )}

            <div className="p-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${path.color} flex items-center justify-center text-white shadow-lg`}>
                  {path.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-white">{path.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{path.subtitle}</p>
                </div>
                {expandedPath === path.id ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* Key stats */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 p-2 bg-slate-100 dark:bg-white/[0.05] rounded-lg text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400"><FormattedMessage id="chatter.pathTo5000.duration" defaultMessage="Duree" /></p>
                  <p className="text-sm text-slate-900 dark:text-white font-bold">{path.timeline}</p>
                </div>
                <div className="flex-1 p-2 bg-slate-100 dark:bg-white/[0.05] rounded-lg text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400"><FormattedMessage id="chatter.pathTo5000.objective" defaultMessage="Objectif" /></p>
                  <p className="text-sm text-slate-900 dark:text-white font-bold">{path.monthlyTarget}</p>
                </div>
              </div>

              {/* Expanded content */}
              {expandedPath === path.id && (
                <div className={`mt-4 pt-4 border-t border-slate-200/60 dark:border-white/[0.06] ${ANIMATION.fadeIn}`}>
                  {/* Steps */}
                  <div className="space-y-2 mb-4">
                    {path.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${path.color} flex items-center justify-center text-white flex-shrink-0`}>
                          {step.icon}
                        </div>
                        <span className="flex-1 text-slate-700 dark:text-slate-300">{step.action}</span>
                        {step.earnings && (
                          <span className="font-bold text-emerald-500">{step.earnings}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pros & Cons */}
                  <div className="grid gap-2 text-xs">
                    <div>
                      <p className="font-semibold text-emerald-500 mb-1"><FormattedMessage id="chatter.pathTo5000.advantages" defaultMessage="Avantages" /></p>
                      {path.pros.map((pro, idx) => (
                        <p key={idx} className="text-slate-600 dark:text-slate-400">• {pro}</p>
                      ))}
                    </div>
                    <div>
                      <p className="font-semibold text-amber-500 mb-1"><FormattedMessage id="chatter.pathTo5000.toKnow" defaultMessage="A savoir" /></p>
                      {path.cons.map((con, idx) => (
                        <p key={idx} className="text-slate-600 dark:text-slate-400">• {con}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tier Bonuses Summary */}
      <div className={`${UI.card} bg-gradient-to-r from-amber-500/5 to-violet-500/5 dark:from-amber-500/[0.03] dark:to-violet-500/[0.03] p-6 mb-8`}>
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <FormattedMessage id="chatter.pathTo5000.tierBonuses" defaultMessage="Bonus de Paliers (Filleuls Qualifies)" />
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { count: 5, bonus: '$15' },
            { count: 10, bonus: '$35' },
            { count: 20, bonus: '$75' },
            { count: 50, bonus: '$250' },
            { count: 100, bonus: '$600' },
            { count: 500, bonus: '$4,000', highlight: true },
          ].map((tier) => (
            <div
              key={tier.count}
              className={`p-3 rounded-xl text-center transition-all ${ANIMATION.normal} ${
                tier.highlight
                  ? `${CHATTER_THEME.accentBg} text-white shadow-lg shadow-indigo-500/25`
                  : 'bg-slate-100 dark:bg-white/[0.05]'
              }`}
            >
              <p className={`text-xs ${tier.highlight ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{tier.count} filleuls</p>
              <p className={`text-lg font-bold ${tier.highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{tier.bonus}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          <FormattedMessage id="chatter.pathTo5000.qualifiedNote" defaultMessage="* Filleul qualifie = a gagne $20+ en commissions directes" />
        </p>
      </div>

      {/* CTA */}
      {onCTAClick && (
        <div className="text-center">
          <button
            onClick={onCTAClick}
            className={`${UI.button.primary} inline-flex items-center gap-3 px-8 py-4 text-lg`}
          >
            <Sparkles className="w-5 h-5" />
            <FormattedMessage id="chatter.pathTo5000.cta" defaultMessage="Commencer Mon Chemin vers $5,000" />
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PathTo5000;
