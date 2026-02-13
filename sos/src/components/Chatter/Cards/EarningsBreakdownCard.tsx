/**
 * EarningsBreakdownCard - Earnings breakdown donut chart for Chatter dashboard
 *
 * Shows where chatter earnings come from with an interactive donut chart:
 * - Client referrals (client_call, client_referral)
 * - Team recruitment (activation_bonus, n1_recruit_bonus, recruitment)
 * - Tier bonuses (tier_bonus)
 * - Streak bonuses (bonus_streak, bonus_level)
 * - Recurring commissions (n1_call, n2_call, recurring_5pct)
 *
 * Features:
 * - Pure SVG donut chart (no external library)
 * - Animated segments on load
 * - Hover to enlarge segment
 * - Click segment to filter
 * - Legend with percentages
 * - Empty state placeholder
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart,
  Users,
  UserPlus,
  Award,
  Flame,
  RefreshCw,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { ChatterCommissionType } from '@/types/chatter';

// ============================================================================
// TYPES
// ============================================================================

export interface EarningsByCategory {
  clientReferrals: number;
  teamRecruitment: number;
  tierBonuses: number;
  streakBonuses: number;
  recurringCommissions: number;
}

interface EarningsBreakdownCardProps {
  /** Earnings breakdown by category (in cents) */
  earnings: EarningsByCategory;
  /** Total earnings (in cents) - used for center display */
  totalEarnings?: number;
  /** Callback when a segment is clicked */
  onSegmentClick?: (category: keyof EarningsByCategory) => void;
  /** Currently selected/filtered category */
  selectedCategory?: keyof EarningsByCategory | null;
  /** Loading state */
  loading?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

interface SegmentConfig {
  key: keyof EarningsByCategory;
  labelKey: string;
  defaultLabel: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: React.ElementType;
  commissionTypes: ChatterCommissionType[];
}

const SEGMENT_CONFIG: SegmentConfig[] = [
  {
    key: 'clientReferrals',
    labelKey: 'chatter.earnings.clientReferrals',
    defaultLabel: 'Client Referrals',
    color: '#3B82F6', // blue-500
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    icon: Users,
    commissionTypes: ['client_call', 'client_referral'],
  },
  {
    key: 'teamRecruitment',
    labelKey: 'chatter.earnings.teamRecruitment',
    defaultLabel: 'Team Recruitment',
    color: '#22C55E', // green-500
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    icon: UserPlus,
    commissionTypes: ['activation_bonus', 'n1_recruit_bonus', 'recruitment'],
  },
  {
    key: 'tierBonuses',
    labelKey: 'chatter.earnings.tierBonuses',
    defaultLabel: 'Tier Bonuses',
    color: '#EF4444', // red-500
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400',
    icon: Award,
    commissionTypes: ['tier_bonus', 'bonus_top3'],
  },
  {
    key: 'streakBonuses',
    labelKey: 'chatter.earnings.streakBonuses',
    defaultLabel: 'Streak Bonuses',
    color: '#F97316', // orange-500
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-600 dark:text-orange-400',
    icon: Flame,
    commissionTypes: ['bonus_streak', 'bonus_level', 'bonus_zoom'],
  },
  {
    key: 'recurringCommissions',
    labelKey: 'chatter.earnings.recurringCommissions',
    defaultLabel: 'Recurring',
    color: '#14B8A6', // teal-500
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    textColor: 'text-teal-600 dark:text-teal-400',
    icon: RefreshCw,
    commissionTypes: ['n1_call', 'n2_call', 'recurring_5pct'],
  },
];

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl transition-shadow duration-300",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
} as const;

// Chart dimensions
const CHART_SIZE = 200;
const CHART_RADIUS = 80;
const CHART_INNER_RADIUS = 55;
const CHART_CENTER = CHART_SIZE / 2;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate SVG arc path for a donut segment
 */
function describeArc(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  // Convert angles from degrees to radians
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;

  // Calculate outer arc points
  const x1 = cx + outerRadius * Math.cos(startRad);
  const y1 = cy + outerRadius * Math.sin(startRad);
  const x2 = cx + outerRadius * Math.cos(endRad);
  const y2 = cy + outerRadius * Math.sin(endRad);

  // Calculate inner arc points
  const x3 = cx + innerRadius * Math.cos(endRad);
  const y3 = cy + innerRadius * Math.sin(endRad);
  const x4 = cx + innerRadius * Math.cos(startRad);
  const y4 = cy + innerRadius * Math.sin(startRad);

  // Determine if the arc should be drawn the long way
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  // Build the path
  return [
    `M ${x1} ${y1}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

/**
 * Format currency from cents to dollars
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format currency compactly
 */
function formatCurrencyCompact(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${dollars.toFixed(0)}`;
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Single donut segment with animation and interaction
 */
interface DonutSegmentProps {
  config: SegmentConfig;
  startAngle: number;
  endAngle: number;
  value: number;
  percentage: number;
  isHovered: boolean;
  isSelected: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  index: number;
}

const DonutSegment: React.FC<DonutSegmentProps> = ({
  config,
  startAngle,
  endAngle,
  value,
  percentage,
  isHovered,
  isSelected,
  onMouseEnter,
  onMouseLeave,
  onClick,
  index,
}) => {
  // Calculate scaling for hover/select effect
  const scale = isHovered || isSelected ? 1.05 : 1;
  const outerRadius = CHART_RADIUS * scale;
  const innerRadius = CHART_INNER_RADIUS * scale;

  // Calculate the path
  const path = describeArc(
    CHART_CENTER,
    CHART_CENTER,
    outerRadius,
    innerRadius,
    startAngle,
    endAngle
  );

  // Animate the segment drawing
  const pathLength = 1000; // Approximate path length for animation

  return (
    <motion.path
      d={path}
      fill={config.color}
      stroke="white"
      strokeWidth={2}
      className="cursor-pointer"
      style={{
        filter: isHovered || isSelected ? 'brightness(1.1)' : 'none',
        transformOrigin: `${CHART_CENTER}px ${CHART_CENTER}px`,
      }}
      initial={{
        opacity: 0,
        scale: 0.8,
        strokeDasharray: pathLength,
        strokeDashoffset: pathLength,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        strokeDasharray: pathLength,
        strokeDashoffset: 0,
      }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: 'easeOut',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    />
  );
};

/**
 * Tooltip showing segment details
 */
interface TooltipProps {
  config: SegmentConfig;
  value: number;
  percentage: number;
  position: { x: number; y: number };
}

const Tooltip: React.FC<TooltipProps> = ({ config, value, percentage, position }) => {
  const intl = useIntl();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="absolute z-50 pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-xl px-4 py-3 shadow-xl mb-2">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="font-medium text-sm">
            {intl.formatMessage({
              id: config.labelKey,
              defaultMessage: config.defaultLabel,
            })}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold">{formatCurrency(value)}</span>
          <span className="text-gray-600 dark:text-gray-400">({percentage.toFixed(1)}%)</span>
        </div>
        {/* Arrow */}
        <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45" />
      </div>
    </motion.div>
  );
};

/**
 * Legend item
 */
interface LegendItemProps {
  config: SegmentConfig;
  value: number;
  percentage: number;
  isSelected: boolean;
  onClick: () => void;
}

const LegendItem: React.FC<LegendItemProps> = ({
  config,
  value,
  percentage,
  isSelected,
  onClick,
}) => {
  const intl = useIntl();
  const Icon = config.icon;

  if (value === 0) return null;

  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center gap-3 p-2 rounded-xl transition-all w-full text-left ${
        isSelected
          ? `${config.bgColor} ring-2 ring-offset-1`
          : 'hover:bg-gray-50 dark:hover:bg-white/5'
      }`}
      style={{
        // Ring color is handled via Tailwind classes
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={`w-8 h-8 rounded-lg${config.bgColor}flex items-center justify-center`}
      >
        <Icon className={`w-4 h-4 ${config.textColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm dark:text-white font-medium truncate">
          {intl.formatMessage({
            id: config.labelKey,
            defaultMessage: config.defaultLabel,
          })}
        </p>
        <p className="text-xs dark:text-gray-400">
          {formatCurrency(value)} ({percentage.toFixed(1)}%)
        </p>
      </div>
      {isSelected && (
        <ChevronRight className={`w-4 h-4 ${config.textColor} flex-shrink-0`} />
      )}
    </motion.button>
  );
};

/**
 * Empty state when no earnings
 */
const EmptyState: React.FC = () => {
  const intl = useIntl();

  return (
    <div className="flex items-center justify-center py-8 px-4 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 dark:from-gray-800 to-gray-200 dark:to-gray-700 flex items-center justify-center mb-4"
      >
        <PieChart className="w-10 h-10 text-gray-400 dark:text-gray-300" />
      </motion.div>
      <h4 className="text-lg dark:text-gray-300 font-semibold mb-2">
        <FormattedMessage
          id="chatter.earnings.emptyTitle"
          defaultMessage="No earnings yet"
        />
      </h4>
      <p className="text-sm dark:text-gray-400 max-w-xs">
        <FormattedMessage
          id="chatter.earnings.emptyDescription"
          defaultMessage="Start earning to see your breakdown. Share your link to get your first commission!"
        />
      </p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 flex items-center gap-2 text-sm dark:text-blue-400"
      >
        <TrendingUp className="w-4 h-4" />
        <FormattedMessage
          id="chatter.earnings.startEarning"
          defaultMessage="Start earning today"
        />
      </motion.div>
    </div>
  );
};

/**
 * Loading skeleton
 */
const LoadingSkeleton: React.FC = () => {
  return (
    <div className={`${UI.card} p-4 sm:p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`${UI.skeleton} w-10 h-10 rounded-xl`} />
        <div className={`${UI.skeleton} h-6 w-40`} />
      </div>
      <div className="flex sm:flex-row items-center gap-6">
        <div className={`${UI.skeleton} w-[200px] h-[200px] rounded-full`} />
        <div className="flex-1 space-y-3 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`${UI.skeleton} h-12 w-full rounded-xl`} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const EarningsBreakdownCard = memo(function EarningsBreakdownCard({
  earnings,
  totalEarnings,
  onSegmentClick,
  selectedCategory,
  loading = false,
}: EarningsBreakdownCardProps) {
  const intl = useIntl();
  const [hoveredSegment, setHoveredSegment] = useState<keyof EarningsByCategory | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Calculate total and segment data
  const { segments, total, hasEarnings } = useMemo(() => {
    const segmentData: {
      config: SegmentConfig;
      value: number;
      percentage: number;
      startAngle: number;
      endAngle: number;
    }[] = [];

    // Calculate total
    let totalAmount = 0;
    SEGMENT_CONFIG.forEach((config) => {
      totalAmount += earnings[config.key] || 0;
    });

    // If custom total is provided, use it
    const displayTotal = totalEarnings !== undefined ? totalEarnings : totalAmount;

    // Build segments
    let currentAngle = 0;
    SEGMENT_CONFIG.forEach((config) => {
      const value = earnings[config.key] || 0;
      if (value > 0) {
        const percentage = totalAmount > 0 ? (value / totalAmount) * 100 : 0;
        const sweepAngle = (percentage / 100) * 360;

        segmentData.push({
          config,
          value,
          percentage,
          startAngle: currentAngle,
          endAngle: currentAngle + sweepAngle,
        });

        currentAngle += sweepAngle;
      }
    });

    return {
      segments: segmentData,
      total: displayTotal,
      hasEarnings: totalAmount > 0,
    };
  }, [earnings, totalEarnings]);

  // Handle segment hover
  const handleSegmentHover = useCallback(
    (key: keyof EarningsByCategory | null, event?: React.MouseEvent) => {
      setHoveredSegment(key);
      if (event && key) {
        const rect = event.currentTarget.closest('svg')?.getBoundingClientRect();
        if (rect) {
          setTooltipPosition({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 10,
          });
        }
      }
    },
    []
  );

  // Handle segment click
  const handleSegmentClick = useCallback(
    (key: keyof EarningsByCategory) => {
      onSegmentClick?.(key);
    },
    [onSegmentClick]
  );

  // Loading state
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Get hovered segment data for tooltip
  const hoveredData = hoveredSegment
    ? segments.find((s) => s.config.key === hoveredSegment)
    : null;

  return (
    <div className={`${UI.card} ${UI.cardHover} overflow-hidden`}>
      {/* Header */}
      <div className="p-4 sm:p-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
            <PieChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">
              <FormattedMessage
                id="chatter.earnings.breakdownTitle"
                defaultMessage="Earnings Breakdown"
              />
            </h3>
            <p className="text-xs dark:text-gray-400">
              <FormattedMessage
                id="chatter.earnings.breakdownSubtitle"
                defaultMessage="See where your money comes from"
              />
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {!hasEarnings ? (
        <EmptyState />
      ) : (
        <div className="p-4 sm:p-6 pt-2">
          <div className="flex lg:flex-row items-center gap-6">
            {/* Donut Chart */}
            <div className="relative flex-shrink-0">
              <svg
                width={CHART_SIZE}
                height={CHART_SIZE}
                viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
                className="transform -rotate-90"
              >
                {/* Background circle */}
                <circle
                  cx={CHART_CENTER}
                  cy={CHART_CENTER}
                  r={CHART_RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={CHART_RADIUS - CHART_INNER_RADIUS}
                  className="text-gray-100 dark:text-white/5"
                />

                {/* Segments */}
                {segments.map((segment, index) => (
                  <DonutSegment
                    key={segment.config.key}
                    config={segment.config}
                    startAngle={segment.startAngle}
                    endAngle={segment.endAngle}
                    value={segment.value}
                    percentage={segment.percentage}
                    isHovered={hoveredSegment === segment.config.key}
                    isSelected={selectedCategory === segment.config.key}
                    onMouseEnter={() => handleSegmentHover(segment.config.key)}
                    onMouseLeave={() => handleSegmentHover(null)}
                    onClick={() => handleSegmentClick(segment.config.key)}
                    index={index}
                  />
                ))}
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-center"
                >
                  <p className="text-xs dark:text-gray-400 uppercase tracking-wider">
                    <FormattedMessage
                      id="chatter.earnings.total"
                      defaultMessage="Total"
                    />
                  </p>
                  <p className="text-2xl dark:text-white font-bold">
                    {formatCurrencyCompact(total)}
                  </p>
                </motion.div>
              </div>

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredData && (
                  <Tooltip
                    config={hoveredData.config}
                    value={hoveredData.value}
                    percentage={hoveredData.percentage}
                    position={tooltipPosition}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Legend */}
            <div className="flex-1 w-full grid sm:grid-cols-2 lg:grid-cols-1 gap-1">
              {segments.map((segment) => (
                <LegendItem
                  key={segment.config.key}
                  config={segment.config}
                  value={segment.value}
                  percentage={segment.percentage}
                  isSelected={selectedCategory === segment.config.key}
                  onClick={() => handleSegmentClick(segment.config.key)}
                />
              ))}
            </div>
          </div>

          {/* Selected filter indicator */}
          <AnimatePresence>
            {selectedCategory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t dark:border-white/10"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm dark:text-gray-400">
                    <FormattedMessage
                      id="chatter.earnings.filterActive"
                      defaultMessage="Filtering by category"
                    />
                  </p>
                  <button
                    onClick={() => onSegmentClick?.(selectedCategory)}
                    className="text-sm dark:text-blue-400 hover:underline"
                  >
                    <FormattedMessage
                      id="chatter.earnings.clearFilter"
                      defaultMessage="Clear filter"
                    />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
});

export default EarningsBreakdownCard;
