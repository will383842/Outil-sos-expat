/**
 * CommissionWaterfall - Visual cascade view of commission relationships
 *
 * Shows the chain of how commissions flow through the network:
 * - Client calls -> Chatter earns $10
 * - N1 referral calls -> Parrain N1 earns $1
 * - N2 referral calls -> Parrain N2 earns $0.50
 *
 * Includes links to related entities and detailed breakdown.
 */

import React from 'react';
import {
  X,
  Phone,
  User,
  Users,
  DollarSign,
  ArrowDown,
  ArrowRight,
  Clock,
  CheckCircle,
  CreditCard,
  AlertCircle,
  XCircle,
  ExternalLink,
  Calculator,
  TrendingUp,
  Gift,
  Star,
  Zap,
  Flame,
} from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    ghost: "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl transition-all",
  },
  badge: {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
    validated: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
    available: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
    paid: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  },
} as const;

// Types
interface CommissionDetailed {
  id: string;
  chatterId: string;
  chatterEmail: string;
  chatterName: string;
  chatterCode: string;
  type: string;
  sourceId: string | null;
  sourceType: string | null;
  sourceDetails?: Record<string, unknown>;
  baseAmount: number;
  levelBonus: number;
  top3Bonus: number;
  zoomBonus: number;
  streakBonus?: number;
  monthlyTopMultiplier?: number;
  amount: number;
  currency: string;
  calculationDetails: string;
  status: 'pending' | 'validated' | 'available' | 'paid' | 'cancelled';
  createdAt: string;
  validatedAt: string | null;
  availableAt: string | null;
  paidAt: string | null;
  withdrawalId: string | null;
  description: string;
  relatedChatter?: {
    id: string;
    name: string;
    email: string;
    code: string;
  };
  callSession?: {
    id: string;
    clientEmail?: string;
    duration?: number;
    connectionFee?: number;
  };
}

interface CommissionWaterfallProps {
  commission: CommissionDetailed;
  onClose: () => void;
}

// Helper functions
const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'client_call':
      return <Phone className="w-5 h-5" />;
    case 'n1_call':
      return <Users className="w-5 h-5" />;
    case 'n2_call':
      return <Users className="w-5 h-5" />;
    case 'activation_bonus':
      return <Gift className="w-5 h-5" />;
    case 'n1_recruit_bonus':
      return <Star className="w-5 h-5" />;
    case 'provider_call':
      return <User className="w-5 h-5" />;
    case 'bonus_level':
      return <TrendingUp className="w-5 h-5" />;
    case 'bonus_streak':
      return <Flame className="w-5 h-5" />;
    case 'bonus_top3':
      return <Star className="w-5 h-5" />;
    default:
      return <DollarSign className="w-5 h-5" />;
  }
};

const getTypeColor = (type: string): string => {
  switch (type) {
    case 'client_call':
      return 'from-green-500 to-emerald-600';
    case 'n1_call':
      return 'from-blue-500 to-indigo-600';
    case 'n2_call':
      return 'from-indigo-500 to-purple-600';
    case 'activation_bonus':
      return 'from-orange-500 to-red-500';
    case 'n1_recruit_bonus':
      return 'from-yellow-500 to-orange-500';
    case 'provider_call':
      return 'from-purple-500 to-pink-600';
    case 'bonus_level':
      return 'from-teal-500 to-cyan-500';
    case 'bonus_streak':
      return 'from-red-500 to-orange-500';
    case 'bonus_top3':
      return 'from-yellow-400 to-yellow-600';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    client_call: 'Client Call Commission',
    n1_call: 'N1 Referral Commission',
    n2_call: 'N2 Referral Commission',
    activation_bonus: 'Activation Bonus',
    n1_recruit_bonus: 'N1 Recruit Bonus',
    provider_call: 'Provider Call Commission',
    bonus_level: 'Level Up Bonus',
    bonus_streak: 'Streak Bonus',
    bonus_top3: 'Top 3 Monthly Bonus',
    tier_bonus: 'Tier Milestone Bonus',
    manual_adjustment: 'Manual Adjustment',
  };
  return labels[type] || type;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4" />;
    case 'validated':
      return <CheckCircle className="w-4 h-4" />;
    case 'available':
      return <DollarSign className="w-4 h-4" />;
    case 'paid':
      return <CreditCard className="w-4 h-4" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

// WaterfallNode Component
const WaterfallNode: React.FC<{
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ReactNode;
  color: string;
  link?: string;
  isStart?: boolean;
  isEnd?: boolean;
}> = ({ label, value, sublabel, icon, color, link, isStart, isEnd }) => (
  <div className="flex flex-col items-center">
    {!isStart && (
      <div className="h-8 w-0.5 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500" />
    )}
    <div
      className={`relative p-4 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg min-w-[200px]`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-xl">{icon}</div>
        <div className="flex-1">
          <div className="font-semibold">{label}</div>
          <div className="text-lg font-bold">{value}</div>
          {sublabel && <div className="text-xs opacity-80">{sublabel}</div>}
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
    {!isEnd && (
      <div className="h-8 w-0.5 bg-gradient-to-b from-gray-400 to-gray-300 dark:from-gray-500 dark:to-gray-600" />
    )}
  </div>
);

// Bonus Badge Component
const BonusBadge: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => {
  if (value <= 1) return null;
  const percentage = Math.round((value - 1) * 100);
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-500/20 dark:to-orange-500/20 rounded-full">
      {icon}
      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
        {label}: +{percentage}%
      </span>
    </div>
  );
};

// Main Component
const CommissionWaterfall: React.FC<CommissionWaterfallProps> = ({
  commission,
  onClose,
}) => {
  const hasMultipliers =
    commission.levelBonus > 1 ||
    commission.top3Bonus > 1 ||
    commission.zoomBonus > 1 ||
    (commission.streakBonus && commission.streakBonus > 1) ||
    (commission.monthlyTopMultiplier && commission.monthlyTopMultiplier > 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={UI.card + " max-w-2xl w-full max-h-[90vh] overflow-y-auto"}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Commission Details
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              ID: {commission.id.slice(0, 12)}...
            </p>
          </div>
          <button
            onClick={onClose}
            className={UI.button.ghost + " p-2"}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Commission Type Header */}
          <div
            className={`p-6 rounded-2xl bg-gradient-to-br ${getTypeColor(
              commission.type
            )} text-white`}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                {getTypeIcon(commission.type)}
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold">
                  {getTypeLabel(commission.type)}
                </div>
                <div className="text-3xl font-bold mt-1">
                  {formatCurrency(commission.amount)}
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  UI.badge[commission.status]
                }`}
              >
                <div className="flex items-center gap-1">
                  {getStatusIcon(commission.status)}
                  {commission.status.charAt(0).toUpperCase() +
                    commission.status.slice(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Cascade Visualization */}
          <div className="flex flex-col items-center py-4">
            {/* Source (Call Session or Trigger) */}
            {commission.callSession && (
              <WaterfallNode
                label="Call Session"
                value={`${Math.round(
                  (commission.callSession.duration || 0) / 60
                )} min`}
                sublabel={commission.callSession.clientEmail}
                icon={<Phone className="w-5 h-5" />}
                color="from-blue-500 to-cyan-500"
                link={`/admin/calls/sessions?id=${commission.callSession.id}`}
                isStart
              />
            )}

            {/* Related Chatter (for N1/N2) */}
            {commission.relatedChatter && (
              <WaterfallNode
                label={
                  commission.type === 'n1_call'
                    ? 'Your N1 Referral'
                    : commission.type === 'n2_call'
                    ? 'Your N2 Referral'
                    : 'Related Chatter'
                }
                value={commission.relatedChatter.name}
                sublabel={commission.relatedChatter.code}
                icon={<Users className="w-5 h-5" />}
                color="from-purple-500 to-pink-500"
                link={`/admin/chatters/${commission.relatedChatter.id}`}
                isStart={!commission.callSession}
              />
            )}

            {/* Main Commission Recipient */}
            <WaterfallNode
              label="Commission Earned By"
              value={commission.chatterName}
              sublabel={commission.chatterCode}
              icon={<DollarSign className="w-5 h-5" />}
              color={getTypeColor(commission.type)}
              link={`/admin/chatters/${commission.chatterId}`}
              isStart={!commission.callSession && !commission.relatedChatter}
              isEnd={!commission.withdrawalId}
            />

            {/* Withdrawal (if paid) */}
            {commission.withdrawalId && (
              <WaterfallNode
                label="Included in Withdrawal"
                value={commission.withdrawalId.slice(0, 12) + '...'}
                sublabel={
                  commission.paidAt ? formatDate(commission.paidAt) : undefined
                }
                icon={<CreditCard className="w-5 h-5" />}
                color="from-green-500 to-emerald-600"
                link={`/admin/payments/chatter/${commission.withdrawalId}`}
                isEnd
              />
            )}
          </div>

          {/* Bonus Multipliers */}
          {hasMultipliers && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Applied Bonuses
              </h3>
              <div className="flex flex-wrap gap-2">
                <BonusBadge
                  label="Level"
                  value={commission.levelBonus}
                  icon={<TrendingUp className="w-4 h-4 text-yellow-700" />}
                />
                <BonusBadge
                  label="Top 3"
                  value={commission.top3Bonus}
                  icon={<Star className="w-4 h-4 text-yellow-700" />}
                />
                <BonusBadge
                  label="Zoom"
                  value={commission.zoomBonus}
                  icon={<Users className="w-4 h-4 text-yellow-700" />}
                />
                {commission.streakBonus && (
                  <BonusBadge
                    label="Streak"
                    value={commission.streakBonus}
                    icon={<Flame className="w-4 h-4 text-yellow-700" />}
                  />
                )}
                {commission.monthlyTopMultiplier && (
                  <BonusBadge
                    label="Monthly Top"
                    value={commission.monthlyTopMultiplier}
                    icon={<Star className="w-4 h-4 text-yellow-700" />}
                  />
                )}
              </div>
            </div>
          )}

          {/* Calculation Breakdown */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-500" />
              Calculation Details
            </h3>
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Base Amount
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(commission.baseAmount)}
                </span>
              </div>
              {commission.levelBonus > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Level Bonus (x{commission.levelBonus.toFixed(2)})
                  </span>
                  <span className="font-medium text-green-600">
                    +
                    {formatCurrency(
                      commission.baseAmount * (commission.levelBonus - 1)
                    )}
                  </span>
                </div>
              )}
              {commission.top3Bonus > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Top 3 Bonus (x{commission.top3Bonus.toFixed(2)})
                  </span>
                  <span className="font-medium text-green-600">
                    +
                    {formatCurrency(
                      commission.baseAmount *
                        commission.levelBonus *
                        (commission.top3Bonus - 1)
                    )}
                  </span>
                </div>
              )}
              {commission.zoomBonus > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Zoom Bonus (x{commission.zoomBonus.toFixed(2)})
                  </span>
                  <span className="font-medium text-green-600">
                    +
                    {formatCurrency(
                      commission.baseAmount *
                        commission.levelBonus *
                        commission.top3Bonus *
                        (commission.zoomBonus - 1)
                    )}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Final Amount
                </span>
                <span className="font-bold text-lg text-green-600">
                  {formatCurrency(commission.amount)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              {commission.calculationDetails}
            </p>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Timeline
            </h3>
            <div className="space-y-3">
              <TimelineItem
                label="Created"
                date={commission.createdAt}
                icon={<DollarSign className="w-4 h-4" />}
                color="bg-blue-500"
              />
              {commission.validatedAt && (
                <TimelineItem
                  label="Validated"
                  date={commission.validatedAt}
                  icon={<CheckCircle className="w-4 h-4" />}
                  color="bg-yellow-500"
                />
              )}
              {commission.availableAt && (
                <TimelineItem
                  label="Available"
                  date={commission.availableAt}
                  icon={<DollarSign className="w-4 h-4" />}
                  color="bg-green-500"
                />
              )}
              {commission.paidAt && (
                <TimelineItem
                  label="Paid"
                  date={commission.paidAt}
                  icon={<CreditCard className="w-4 h-4" />}
                  color="bg-purple-500"
                />
              )}
            </div>
          </div>

          {/* Description */}
          <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {commission.description}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3">
          <a
            href={`/admin/chatters/${commission.chatterId}`}
            className={UI.button.secondary + " px-4 py-2 flex items-center gap-2"}
          >
            <User className="w-4 h-4" />
            View Chatter
          </a>
          <button
            onClick={onClose}
            className={UI.button.secondary + " px-4 py-2"}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Timeline Item Component
const TimelineItem: React.FC<{
  label: string;
  date: string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, date, icon, color }) => (
  <div className="flex items-center gap-3">
    <div className={`p-2 rounded-full ${color} text-white`}>{icon}</div>
    <div className="flex-1">
      <div className="text-sm font-medium text-gray-900 dark:text-white">
        {label}
      </div>
      <div className="text-xs text-gray-500">{formatDate(date)}</div>
    </div>
  </div>
);

export default CommissionWaterfall;
