/**
 * PathTo5000 - Visual roadmap showing how to reach $5000 in earnings
 *
 * Displays 3 clear paths with specific actions and timelines:
 * - Path A: Solo (direct clients only)
 * - Path B: Small Team (10 active members)
 * - Path C: Big Team (50+ members with tier bonus)
 *
 * Used in: ChatterLanding, ChatterDashboard, ChatterRefer
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

// Commission constants (in cents)
const COMMISSIONS = {
  CLIENT_CALL: 1000,        // $10
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
const MILESTONES = [
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
  className?: string;
}

const PathTo5000: React.FC<PathTo5000Props> = ({
  variant = 'landing',
  currentEarnings = 0,
  currentClients = 0,
  currentRecruits = 0,
  onCTAClick,
  className = '',
}) => {
  const intl = useIntl();
  const [expandedPath, setExpandedPath] = useState<'solo' | 'small' | 'big' | null>('small');
  const [showAllMilestones, setShowAllMilestones] = useState(false);

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
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
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
      <div className={`bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-4 ${className}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Objectif $5,000</h3>
            <p className="text-xs text-gray-500">{formatAmount(currentEarnings)} / $5,000</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Prochain palier: {nextMilestone.emoji} {nextMilestone.label}
        </p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full mb-4">
          <Rocket className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
            Plan d'Action
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🚀 Comment Atteindre <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">$5,000</span>
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          3 chemins possibles selon votre style. Choisissez celui qui vous convient le mieux.
        </p>
      </div>

      {/* Progress (if dashboard variant) */}
      {variant === 'dashboard' && currentEarnings > 0 && (
        <div className="mb-8 p-4 bg-white/80 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Votre progression</span>
            <span className="text-sm font-bold text-purple-600">{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000 relative"
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
                className={`flex flex-col items-center ${
                  currentEarnings >= milestone.amount ? 'text-purple-600' : 'text-gray-400'
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
              relative rounded-2xl border-2 transition-all duration-300 cursor-pointer
              ${path.borderColor}
              ${expandedPath === path.id
                ? `${path.bgColor} shadow-lg scale-[1.02]`
                : 'bg-white/50 dark:bg-white/5 hover:shadow-md'
              }
            `}
            onClick={() => setExpandedPath(expandedPath === path.id ? null : path.id)}
          >
            {/* Recommended badge */}
            {path.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg">
                <Star className="w-3 h-3" />
                RECOMMANDÉ
              </div>
            )}

            <div className="p-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${path.color} flex items-center justify-center text-white shadow-lg`}>
                  {path.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white">{path.title}</h3>
                  <p className="text-xs text-gray-500">{path.subtitle}</p>
                </div>
                {expandedPath === path.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* Key stats */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 p-2 bg-gray-100 dark:bg-white/10 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Durée</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{path.timeline}</p>
                </div>
                <div className="flex-1 p-2 bg-gray-100 dark:bg-white/10 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Objectif</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{path.monthlyTarget}</p>
                </div>
              </div>

              {/* Expanded content */}
              {expandedPath === path.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 animate-fade-in">
                  {/* Steps */}
                  <div className="space-y-2 mb-4">
                    {path.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${path.color} flex items-center justify-center text-white flex-shrink-0`}>
                          {step.icon}
                        </div>
                        <span className="flex-1 text-gray-700 dark:text-gray-300">{step.action}</span>
                        {step.earnings && (
                          <span className="font-bold text-green-600 dark:text-green-400 text-xs">{step.earnings}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pros & Cons */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="font-semibold text-green-600 mb-1">✅ Avantages</p>
                      {path.pros.map((pro, idx) => (
                        <p key={idx} className="text-gray-600 dark:text-gray-400">• {pro}</p>
                      ))}
                    </div>
                    <div>
                      <p className="font-semibold text-orange-600 mb-1">⚠️ À savoir</p>
                      {path.cons.map((con, idx) => (
                        <p key={idx} className="text-gray-600 dark:text-gray-400">• {con}</p>
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
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-6 mb-8">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          Bonus de Paliers (Filleuls Qualifiés)
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
              className={`p-3 rounded-xl text-center ${
                tier.highlight
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg'
                  : 'bg-white dark:bg-white/10'
              }`}
            >
              <p className={`text-xs ${tier.highlight ? 'text-white/80' : 'text-gray-500'}`}>{tier.count} filleuls</p>
              <p className={`text-lg font-bold ${tier.highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{tier.bonus}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          * Filleul qualifié = a gagné $20+ en commissions directes
        </p>
      </div>

      {/* CTA */}
      {onCTAClick && (
        <div className="text-center">
          <button
            onClick={onCTAClick}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-purple-500/30 transition-all hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-5 h-5" />
            Commencer Mon Chemin vers $5,000
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PathTo5000;
