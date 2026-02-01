/**
 * ReferralTreeCard
 *
 * Visual referral tree component showing N1 and N2 network.
 * Features:
 * - Visual tree structure with YOU at top, N1 direct referrals, N2 indirect
 * - SVG connecting lines between nodes
 * - Expandable/collapsible branches
 * - Node information: name/initial, status, qualified badge, earnings
 * - Statistics summary (total N1, N2, qualified, network size, earnings)
 * - Interactive tooltips on hover
 * - Filters: Show all / Qualified only / Active only
 * - Mobile view: Simpler list with swipeable cards
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Users,
  User,
  ChevronDown,
  ChevronRight,
  Star,
  Check,
  X,
  Filter,
  DollarSign,
  TrendingUp,
  Eye,
  EyeOff,
  RefreshCw,
  Crown,
  Sparkles,
  Activity,
  ChevronLeft,
  Circle,
} from 'lucide-react';
import {
  ChatterFilleulN1,
  ChatterFilleulN2,
  ChatterReferralStats,
} from '@/types/chatter';

// ============================================================================
// TYPES
// ============================================================================

type FilterType = 'all' | 'qualified' | 'active';

interface ReferralNode {
  id: string;
  name: string;
  level: 1 | 2;
  isQualified: boolean;
  isActive: boolean;
  earnings: number;
  joinedAt: string;
  parrainN1Id?: string;
  parrainN1Name?: string;
  children?: ReferralNode[];
}

interface TooltipData {
  node: ReferralNode;
  x: number;
  y: number;
}

interface ReferralTreeCardProps {
  stats: ChatterReferralStats | null;
  filleulsN1: ChatterFilleulN1[];
  filleulsN2: ChatterFilleulN2[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onViewMember?: (memberId: string) => void;
  /** Earnings threshold for qualified status (in cents) - default $20 = 2000 */
  qualifiedThreshold?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const NODE_COLORS = {
  you: {
    bg: 'from-red-500 to-orange-500',
    ring: 'ring-red-300 dark:ring-red-700',
    text: 'text-white',
  },
  n1: {
    active: {
      bg: 'from-blue-500 to-indigo-500',
      ring: 'ring-blue-300 dark:ring-blue-700',
      text: 'text-white',
    },
    inactive: {
      bg: 'from-gray-400 to-gray-500',
      ring: 'ring-gray-300 dark:ring-gray-600',
      text: 'text-white',
    },
    qualified: {
      bg: 'from-emerald-500 to-green-500',
      ring: 'ring-emerald-300 dark:ring-emerald-700',
      text: 'text-white',
    },
  },
  n2: {
    active: {
      bg: 'from-purple-500 to-pink-500',
      ring: 'ring-purple-300 dark:ring-purple-700',
      text: 'text-white',
    },
    inactive: {
      bg: 'from-gray-300 to-gray-400',
      ring: 'ring-gray-200 dark:ring-gray-600',
      text: 'text-gray-700',
    },
    qualified: {
      bg: 'from-teal-500 to-cyan-500',
      ring: 'ring-teal-300 dark:ring-teal-700',
      text: 'text-white',
    },
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getNodeColors(level: 1 | 2 | 'you', isQualified: boolean, isActive: boolean) {
  if (level === 'you') return NODE_COLORS.you;
  const levelColors = level === 1 ? NODE_COLORS.n1 : NODE_COLORS.n2;
  if (isQualified) return levelColors.qualified;
  if (isActive) return levelColors.active;
  return levelColors.inactive;
}

// ============================================================================
// NODE TOOLTIP COMPONENT
// ============================================================================

interface NodeTooltipProps {
  data: TooltipData;
  onClose: () => void;
  onView?: (id: string) => void;
}

const NodeTooltip: React.FC<NodeTooltipProps> = ({ data, onClose, onView }) => {
  const intl = useIntl();
  const { node, x, y } = data;

  return (
    <div
      className="fixed z-50 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 min-w-[200px] max-w-[280px] animate-in fade-in zoom-in-95 duration-200"
      style={{
        left: Math.min(x, window.innerWidth - 300),
        top: Math.min(y + 10, window.innerHeight - 200),
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getNodeColors(node.level, node.isQualified, node.isActive).bg} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
          {getInitials(node.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
            {node.name}
          </h4>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${node.level === 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'}`}>
              N{node.level}
            </span>
            {node.isQualified && (
              <span className="flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                <Star className="w-3 h-3 fill-current" />
                <FormattedMessage id="referralTree.qualified" defaultMessage="Qualified" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="referralTree.earnings" defaultMessage="Earnings" />
          </span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(node.earnings)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="referralTree.status" defaultMessage="Status" />
          </span>
          <span className={`font-medium ${node.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {node.isActive
              ? intl.formatMessage({ id: 'referralTree.active', defaultMessage: 'Active' })
              : intl.formatMessage({ id: 'referralTree.inactive', defaultMessage: 'Inactive' })
            }
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="referralTree.joined" defaultMessage="Joined" />
          </span>
          <span className="text-gray-700 dark:text-gray-300">
            {new Date(node.joinedAt).toLocaleDateString(intl.locale)}
          </span>
        </div>
        {node.parrainN1Name && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="referralTree.referredBy" defaultMessage="Referred by" />
            </span>
            <span className="text-gray-700 dark:text-gray-300 truncate ml-2">
              {node.parrainN1Name}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {onView && (
        <button
          onClick={() => onView(node.id)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
        >
          <Eye className="w-4 h-4" />
          <FormattedMessage id="referralTree.viewProfile" defaultMessage="View Profile" />
        </button>
      )}
    </div>
  );
};

// ============================================================================
// TREE NODE COMPONENT (Desktop)
// ============================================================================

interface TreeNodeProps {
  node: ReferralNode;
  isExpanded: boolean;
  onToggle: () => void;
  onClick: (e: React.MouseEvent, node: ReferralNode) => void;
  hasChildren: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  isExpanded,
  onToggle,
  onClick,
  hasChildren,
}) => {
  const colors = getNodeColors(node.level, node.isQualified, node.isActive);
  const nodeSize = node.level === 1 ? 'w-14 h-14' : 'w-11 h-11';
  const fontSize = node.level === 1 ? 'text-sm' : 'text-xs';

  return (
    <div className="flex flex-col items-center">
      {/* Node */}
      <button
        onClick={(e) => onClick(e, node)}
        className={`
          relative ${nodeSize} rounded-full bg-gradient-to-br ${colors.bg}
          flex items-center justify-center ${colors.text} font-bold ${fontSize}
          shadow-lg ring-2 ${colors.ring} ring-offset-2 ring-offset-white dark:ring-offset-gray-900
          transition-all duration-200 hover:scale-110 hover:shadow-xl
          cursor-pointer
        `}
      >
        {getInitials(node.name)}

        {/* Qualified badge */}
        {node.isQualified && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
            <Star className="w-3 h-3 text-yellow-800 fill-current" />
          </div>
        )}

        {/* Active indicator */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${node.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
      </button>

      {/* Name label */}
      <span className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300 text-center max-w-[80px] truncate">
        {node.name.split(' ')[0]}
      </span>

      {/* Earnings */}
      <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
        {formatCurrency(node.earnings)}
      </span>

      {/* Expand button for N1 with children */}
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="mt-1 p-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
        </button>
      )}
    </div>
  );
};

// ============================================================================
// MOBILE CARD COMPONENT
// ============================================================================

interface MobileCardProps {
  node: ReferralNode;
  onClick: () => void;
}

const MobileCard: React.FC<MobileCardProps> = ({ node, onClick }) => {
  const intl = useIntl();
  const colors = getNodeColors(node.level, node.isQualified, node.isActive);

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[140px] p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="flex flex-col items-center">
        {/* Avatar */}
        <div className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center text-white font-bold text-sm shadow-lg mb-2`}>
          {getInitials(node.name)}
          {node.isQualified && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
              <Star className="w-2.5 h-2.5 text-yellow-800 fill-current" />
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${node.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
        </div>

        {/* Name */}
        <span className="text-sm font-medium text-gray-900 dark:text-white text-center truncate w-full">
          {node.name.split(' ')[0]}
        </span>

        {/* Level badge */}
        <span className={`mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${node.level === 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'}`}>
          N{node.level}
        </span>

        {/* Earnings */}
        <span className="mt-1 text-xs font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(node.earnings)}
        </span>
      </div>
    </button>
  );
};

// ============================================================================
// STATISTICS SUMMARY COMPONENT
// ============================================================================

interface StatsSummaryProps {
  totalN1: number;
  qualifiedN1: number;
  totalN2: number;
  totalNetworkSize: number;
  networkEarnings: number;
}

const StatsSummary: React.FC<StatsSummaryProps> = ({
  totalN1,
  qualifiedN1,
  totalN2,
  totalNetworkSize,
  networkEarnings,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Total N1 */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">N1</span>
        </div>
        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
          {totalN1}
        </p>
        <p className="text-[10px] text-gray-500 dark:text-gray-500">
          {qualifiedN1} <FormattedMessage id="referralTree.qualifiedShort" defaultMessage="qualified" />
        </p>
      </div>

      {/* Total N2 */}
      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">N2</span>
        </div>
        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
          {totalN2}
        </p>
        <p className="text-[10px] text-gray-500 dark:text-gray-500">
          <FormattedMessage id="referralTree.indirect" defaultMessage="indirect" />
        </p>
      </div>

      {/* Total Network */}
      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            <FormattedMessage id="referralTree.total" defaultMessage="Total" />
          </span>
        </div>
        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
          {totalNetworkSize}
        </p>
        <p className="text-[10px] text-gray-500 dark:text-gray-500">
          <FormattedMessage id="referralTree.members" defaultMessage="members" />
        </p>
      </div>

      {/* Network Earnings */}
      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            <FormattedMessage id="referralTree.earnings" defaultMessage="Earnings" />
          </span>
        </div>
        <p className="text-xl font-bold text-green-600 dark:text-green-400">
          {formatCurrency(networkEarnings)}
        </p>
        <p className="text-[10px] text-gray-500 dark:text-gray-500">
          <FormattedMessage id="referralTree.fromNetwork" defaultMessage="from network" />
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// FILTER BUTTONS COMPONENT
// ============================================================================

interface FilterButtonsProps {
  currentFilter: FilterType;
  onChange: (filter: FilterType) => void;
  counts: { all: number; qualified: number; active: number };
}

const FilterButtons: React.FC<FilterButtonsProps> = ({ currentFilter, onChange, counts }) => {
  const filters: { key: FilterType; labelId: string; defaultLabel: string; count: number }[] = [
    { key: 'all', labelId: 'referralTree.filter.all', defaultLabel: 'All', count: counts.all },
    { key: 'qualified', labelId: 'referralTree.filter.qualified', defaultLabel: 'Qualified', count: counts.qualified },
    { key: 'active', labelId: 'referralTree.filter.active', defaultLabel: 'Active', count: counts.active },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="w-4 h-4 text-gray-400" />
      {filters.map(filter => (
        <button
          key={filter.key}
          onClick={() => onChange(filter.key)}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-medium transition-all
            ${currentFilter === filter.key
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }
          `}
        >
          <FormattedMessage id={filter.labelId} defaultMessage={filter.defaultLabel} />
          <span className="ml-1 opacity-70">({filter.count})</span>
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// SVG TREE VISUALIZATION (Desktop)
// ============================================================================

interface TreeVisualizationProps {
  nodes: ReferralNode[];
  expandedNodes: Set<string>;
  onToggleNode: (nodeId: string) => void;
  onNodeClick: (e: React.MouseEvent, node: ReferralNode) => void;
}

const TreeVisualization: React.FC<TreeVisualizationProps> = ({
  nodes,
  expandedNodes,
  onToggleNode,
  onNodeClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  const n1Nodes = nodes.filter(n => n.level === 1);
  const n2Nodes = nodes.filter(n => n.level === 2);

  // Calculate dimensions based on container
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const expandedN1Count = n1Nodes.filter(n => expandedNodes.has(n.id)).length;
        const maxN2InRow = Math.max(...n1Nodes.map(n1 =>
          n2Nodes.filter(n2 => n2.parrainN1Id === n1.id).length
        ), 0);

        setDimensions({
          width: rect.width,
          height: Math.max(320, expandedN1Count > 0 ? 420 : 320),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [n1Nodes.length, n2Nodes.length, expandedNodes]);

  const { width, height } = dimensions;
  const centerX = width / 2;
  const youY = 60;
  const n1Y = 180;
  const n2Y = 320;

  // Calculate N1 positions
  const n1Spacing = Math.min(120, (width - 100) / Math.max(n1Nodes.length, 1));
  const n1StartX = centerX - ((n1Nodes.length - 1) * n1Spacing) / 2;
  const n1Positions = n1Nodes.map((_, i) => ({
    x: n1StartX + i * n1Spacing,
    y: n1Y,
  }));

  // Calculate N2 positions grouped by their N1 parent
  const getN2Positions = () => {
    const positions: { [id: string]: { x: number; y: number } } = {};

    n1Nodes.forEach((n1, n1Index) => {
      if (!expandedNodes.has(n1.id)) return;

      const childN2s = n2Nodes.filter(n2 => n2.parrainN1Id === n1.id);
      const parentX = n1Positions[n1Index]?.x || centerX;
      const spacing = Math.min(80, (width - 100) / Math.max(childN2s.length * n1Nodes.length, 1));
      const startX = parentX - ((childN2s.length - 1) * spacing) / 2;

      childN2s.forEach((n2, i) => {
        positions[n2.id] = {
          x: startX + i * spacing,
          y: n2Y,
        };
      });
    });

    return positions;
  };

  const n2Positions = getN2Positions();

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      <svg width={width} height={height} className="min-w-[400px]">
        <defs>
          {/* Gradient for lines */}
          <linearGradient id="lineGradientN1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="lineGradientN2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.4" />
          </linearGradient>

          {/* Glow effect */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Lines from YOU to N1 */}
        {n1Positions.map((pos, i) => (
          <g key={`line-you-n1-${i}`}>
            <path
              d={`M ${centerX} ${youY + 30} Q ${centerX} ${(youY + pos.y) / 2 + 20} ${pos.x} ${pos.y - 35}`}
              fill="none"
              stroke="url(#lineGradientN1)"
              strokeWidth="2"
              strokeDasharray="6 4"
              className="animate-[dash_1s_linear_infinite]"
            />
            {/* Animated dot */}
            <circle r="3" fill="#EF4444" opacity="0.8">
              <animateMotion
                dur="2s"
                repeatCount="indefinite"
                path={`M ${centerX} ${youY + 30} Q ${centerX} ${(youY + pos.y) / 2 + 20} ${pos.x} ${pos.y - 35}`}
              />
            </circle>
          </g>
        ))}

        {/* Lines from N1 to N2 */}
        {Object.entries(n2Positions).map(([n2Id, pos]) => {
          const n2Node = n2Nodes.find(n => n.id === n2Id);
          if (!n2Node) return null;

          const parentN1Index = n1Nodes.findIndex(n => n.id === n2Node.parrainN1Id);
          const parentPos = n1Positions[parentN1Index];
          if (!parentPos) return null;

          return (
            <g key={`line-n1-n2-${n2Id}`}>
              <path
                d={`M ${parentPos.x} ${parentPos.y + 35} Q ${(parentPos.x + pos.x) / 2} ${(parentPos.y + pos.y) / 2} ${pos.x} ${pos.y - 28}`}
                fill="none"
                stroke="url(#lineGradientN2)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.7"
              />
            </g>
          );
        })}

        {/* YOU node */}
        <g transform={`translate(${centerX}, ${youY})`} className="cursor-pointer">
          <circle r="30" className="fill-[url(#lineGradientN1)]" filter="url(#glow)" />
          <circle r="32" fill="none" stroke="#EF4444" strokeWidth="2" opacity="0.5">
            <animate attributeName="r" from="32" to="40" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
          </circle>
          <text y="5" textAnchor="middle" className="fill-white font-bold text-sm">
            YOU
          </text>
          <g transform="translate(-12, -45)">
            <Crown className="w-6 h-6 text-yellow-400 fill-yellow-400" />
          </g>
        </g>
      </svg>

      {/* N1 Nodes (positioned over SVG) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {n1Nodes.map((node, i) => {
          const pos = n1Positions[i];
          if (!pos) return null;

          const childN2s = n2Nodes.filter(n2 => n2.parrainN1Id === node.id);
          const hasChildren = childN2s.length > 0;

          return (
            <div
              key={node.id}
              className="absolute pointer-events-auto"
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <TreeNode
                node={node}
                isExpanded={expandedNodes.has(node.id)}
                onToggle={() => onToggleNode(node.id)}
                onClick={onNodeClick}
                hasChildren={hasChildren}
              />
            </div>
          );
        })}

        {/* N2 Nodes */}
        {Object.entries(n2Positions).map(([n2Id, pos]) => {
          const node = n2Nodes.find(n => n.id === n2Id);
          if (!node) return null;

          return (
            <div
              key={node.id}
              className="absolute pointer-events-auto"
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <TreeNode
                node={node}
                isExpanded={false}
                onToggle={() => {}}
                onClick={onNodeClick}
                hasChildren={false}
              />
            </div>
          );
        })}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -12;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// MOBILE CAROUSEL VIEW
// ============================================================================

interface MobileCarouselProps {
  title: string;
  nodes: ReferralNode[];
  onNodeClick: (node: ReferralNode) => void;
  emptyMessage?: string;
}

const MobileCarousel: React.FC<MobileCarouselProps> = ({
  title,
  nodes,
  onNodeClick,
  emptyMessage,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [checkScroll, nodes]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -160 : 160;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
        {emptyMessage || 'No members'}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Title */}
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 px-1">
        {title} ({nodes.length})
      </h4>

      {/* Scroll buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 mt-2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 mt-2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Cards container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {nodes.map(node => (
          <MobileCard
            key={node.id}
            node={node}
            onClick={() => onNodeClick(node)}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ReferralTreeCard: React.FC<ReferralTreeCardProps> = ({
  stats,
  filleulsN1,
  filleulsN2,
  isLoading = false,
  onRefresh,
  onViewMember,
  qualifiedThreshold = 2000, // $20 default
}) => {
  const intl = useIntl();
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Convert filleuls to referral nodes
  const allNodes: ReferralNode[] = useMemo(() => {
    const n1Nodes: ReferralNode[] = filleulsN1.map(f => ({
      id: f.id,
      name: f.name,
      level: 1 as const,
      isQualified: f.clientEarnings >= qualifiedThreshold,
      isActive: f.isActive,
      earnings: f.clientEarnings,
      joinedAt: f.joinedAt,
    }));

    const n2Nodes: ReferralNode[] = filleulsN2.map(f => {
      // Find the parent N1
      const parentN1 = filleulsN1.find(n1 => n1.name === f.parrainN1Name);
      return {
        id: f.id,
        name: f.name,
        level: 2 as const,
        isQualified: f.threshold50Reached,
        isActive: true, // N2 doesn't have isActive field, default to true if in list
        earnings: 0, // N2 earnings not tracked directly
        joinedAt: f.joinedAt,
        parrainN1Id: parentN1?.id,
        parrainN1Name: f.parrainN1Name,
      };
    });

    return [...n1Nodes, ...n2Nodes];
  }, [filleulsN1, filleulsN2, qualifiedThreshold]);

  // Apply filter
  const filteredNodes = useMemo(() => {
    switch (filter) {
      case 'qualified':
        return allNodes.filter(n => n.isQualified);
      case 'active':
        return allNodes.filter(n => n.isActive);
      default:
        return allNodes;
    }
  }, [allNodes, filter]);

  // Calculate filter counts
  const filterCounts = useMemo(() => ({
    all: allNodes.length,
    qualified: allNodes.filter(n => n.isQualified).length,
    active: allNodes.filter(n => n.isActive).length,
  }), [allNodes]);

  // Calculate stats
  const totalN1 = filleulsN1.length;
  const qualifiedN1 = filleulsN1.filter(f => f.clientEarnings >= qualifiedThreshold).length;
  const totalN2 = filleulsN2.length;
  const totalNetworkSize = totalN1 + totalN2;
  const networkEarnings = stats?.totalReferralEarnings || 0;

  // Toggle node expansion
  const handleToggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Handle node click (show tooltip)
  const handleNodeClick = useCallback((e: React.MouseEvent, node: ReferralNode) => {
    e.stopPropagation();
    setTooltip({
      node,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  // Handle mobile node click
  const handleMobileNodeClick = useCallback((node: ReferralNode) => {
    // On mobile, use a centered tooltip
    setTooltip({
      node,
      x: window.innerWidth / 2 - 100,
      y: window.innerHeight / 2 - 100,
    });
  }, []);

  // Close tooltip
  const handleCloseTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltip) {
        handleCloseTooltip();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [tooltip, handleCloseTooltip]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`${UI.card} p-6`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  // Empty state
  if (totalNetworkSize === 0) {
    return (
      <div className={`${UI.card} p-6`}>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            <FormattedMessage id="referralTree.empty.title" defaultMessage="No Network Yet" />
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            <FormattedMessage
              id="referralTree.empty.description"
              defaultMessage="Start recruiting chatters to build your network and earn passive income!"
            />
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Tooltip */}
      {tooltip && (
        <NodeTooltip
          data={tooltip}
          onClose={handleCloseTooltip}
          onView={onViewMember}
        />
      )}

      <div className={`${UI.card} overflow-hidden`}>
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200/50 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  <FormattedMessage id="referralTree.title" defaultMessage="My Referral Network" />
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="referralTree.subtitle"
                    defaultMessage="Visual tree of your N1 & N2 team"
                  />
                </p>
              </div>
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors self-end sm:self-auto"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Statistics Summary */}
          <StatsSummary
            totalN1={totalN1}
            qualifiedN1={qualifiedN1}
            totalN2={totalN2}
            totalNetworkSize={totalNetworkSize}
            networkEarnings={networkEarnings}
          />

          {/* Filter Buttons */}
          <FilterButtons
            currentFilter={filter}
            onChange={setFilter}
            counts={filterCounts}
          />

          {/* Tree Visualization or Mobile View */}
          {isMobile ? (
            <div className="space-y-6">
              {/* YOU indicator */}
              <div className="flex justify-center">
                <div className="flex flex-col items-center">
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-xl ring-4 ring-red-200 dark:ring-red-900">
                    YOU
                    <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 text-yellow-400 fill-yellow-400" />
                  </div>
                  <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="referralTree.you" defaultMessage="Your Position" />
                  </span>
                </div>
              </div>

              {/* N1 Carousel */}
              <MobileCarousel
                title={intl.formatMessage({ id: 'referralTree.level.n1', defaultMessage: 'N1 - Direct Referrals' })}
                nodes={filteredNodes.filter(n => n.level === 1)}
                onNodeClick={handleMobileNodeClick}
                emptyMessage={intl.formatMessage({ id: 'referralTree.noN1', defaultMessage: 'No direct referrals yet' })}
              />

              {/* N2 Carousel */}
              <MobileCarousel
                title={intl.formatMessage({ id: 'referralTree.level.n2', defaultMessage: 'N2 - Indirect Referrals' })}
                nodes={filteredNodes.filter(n => n.level === 2)}
                onNodeClick={handleMobileNodeClick}
                emptyMessage={intl.formatMessage({ id: 'referralTree.noN2', defaultMessage: 'No indirect referrals yet' })}
              />
            </div>
          ) : (
            <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-xl p-4 min-h-[350px]">
              <TreeVisualization
                nodes={filteredNodes}
                expandedNodes={expandedNodes}
                onToggleNode={handleToggleNode}
                onNodeClick={handleNodeClick}
              />
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-gray-200/50 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span><FormattedMessage id="referralTree.legend.active" defaultMessage="Active" /></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span><FormattedMessage id="referralTree.legend.inactive" defaultMessage="Inactive" /></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span><FormattedMessage id="referralTree.legend.qualified" defaultMessage="Qualified ($20+)" /></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>N1</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span>N2</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReferralTreeCard;
