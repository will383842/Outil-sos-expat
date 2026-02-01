/**
 * TeamManagementCard
 *
 * Exceptional team management component for the Chatter dashboard.
 * Features:
 * - Visual Team Tree with N1/N2 network visualization
 * - Animated connections and status indicators
 * - Team Stats Dashboard with animated counters
 * - Milestone celebrations and progress tracking
 * - Member cards with quick actions
 * - Mobile-first responsive design with glassmorphism
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Users,
  UserPlus,
  TrendingUp,
  DollarSign,
  Trophy,
  Target,
  Crown,
  Star,
  Sparkles,
  MessageCircle,
  Eye,
  ChevronRight,
  ChevronDown,
  Check,
  Clock,
  Zap,
  Gift,
  PartyPopper,
  Lightbulb,
  Share2,
  X,
  RefreshCw,
} from 'lucide-react';
import { ChatterFilleulN1, ChatterFilleulN2, ChatterReferralStats } from '@/types/chatter';

// ============================================================================
// TYPES
// ============================================================================

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string;
  status: 'active' | 'inactive' | 'pending';
  level: 1 | 2;
  earnings: number;
  joinedAt: string;
  isQualified: boolean;
  parrainN1Name?: string;
}

interface TeamManagementCardProps {
  stats: ChatterReferralStats | null;
  filleulsN1: ChatterFilleulN1[];
  filleulsN2: ChatterFilleulN2[];
  qualifiedCount: number;
  paidTiers: number[];
  isLoading?: boolean;
  onInvite?: () => void;
  onViewMember?: (memberId: string) => void;
  onMessageMember?: (memberId: string) => void;
  onRefresh?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MILESTONES = [5, 10, 25, 50];
const MILESTONE_REWARDS = {
  5: { label: 'Bronze', bonus: 25, color: 'from-amber-600 to-amber-700' },
  10: { label: 'Silver', bonus: 75, color: 'from-gray-400 to-gray-500' },
  25: { label: 'Gold', bonus: 200, color: 'from-yellow-400 to-yellow-600' },
  50: { label: 'Platinum', bonus: 500, color: 'from-purple-400 to-purple-600' },
} as const;

const GROWTH_TIPS = [
  { id: 'share', icon: Share2, key: 'team.tips.shareDaily' },
  { id: 'personal', icon: MessageCircle, key: 'team.tips.personalMessage' },
  { id: 'success', icon: TrendingUp, key: 'team.tips.shareSuccess' },
  { id: 'train', icon: Lightbulb, key: 'team.tips.trainTeam' },
];

// ============================================================================
// ANIMATED COUNTER HOOK
// ============================================================================

function useAnimatedCounter(
  targetValue: number,
  duration: number = 1500,
  shouldAnimate: boolean = true
): number {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayValue(targetValue);
      return;
    }

    const startValue = prevValueRef.current;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = targetValue;
      }
    };

    requestAnimationFrame(animate);
  }, [targetValue, duration, shouldAnimate]);

  return displayValue;
}

// ============================================================================
// INTERSECTION OBSERVER HOOK
// ============================================================================

function useInView(threshold: number = 0.1): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return [ref as React.RefObject<HTMLDivElement>, isInView];
}

// ============================================================================
// CELEBRATION MODAL
// ============================================================================

interface CelebrationModalProps {
  milestone: number;
  onClose: () => void;
}

const CelebrationModal: React.FC<CelebrationModalProps> = ({ milestone, onClose }) => {
  const reward = MILESTONE_REWARDS[milestone as keyof typeof MILESTONE_REWARDS];

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md p-8 text-center bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Confetti Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][i % 5],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1.5 + Math.random()}s`,
              }}
            />
          ))}
        </div>

        <div className="relative">
          <div className={`mx-auto w-20 h-20 rounded-full bg-gradient-to-br ${reward.color} flex items-center justify-center mb-6 shadow-lg animate-bounce-slow`}>
            <PartyPopper className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            <FormattedMessage
              id="team.celebration.title"
              defaultMessage="Congratulations!"
            />
          </h2>

          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            <FormattedMessage
              id="team.celebration.milestone"
              defaultMessage="You reached {count} team members!"
              values={{ count: milestone }}
            />
          </p>

          <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${reward.color} text-white font-bold shadow-lg`}>
            <Trophy className="w-5 h-5" />
            <span>{reward.label}</span>
            <span>+${reward.bonus}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TEAM TREE VISUALIZATION
// ============================================================================

interface TeamTreeProps {
  members: TeamMember[];
  onViewMember?: (memberId: string) => void;
}

const TeamTree: React.FC<TeamTreeProps> = ({ members, onViewMember }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Split members by level
  const n1Members = members.filter(m => m.level === 1);
  const n2Members = members.filter(m => m.level === 2);

  // Calculate dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: Math.max(300, (n1Members.length + n2Members.length) * 30 + 150) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [n1Members.length, n2Members.length]);

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
        <Users className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-center">
          <FormattedMessage
            id="team.tree.empty"
            defaultMessage="Your team will appear here"
          />
        </p>
      </div>
    );
  }

  const centerX = dimensions.width / 2;
  const youY = 60;
  const n1Y = 160;
  const n2Y = 280;

  // Calculate positions for N1 members
  const n1Positions = n1Members.map((_, i) => {
    const total = n1Members.length;
    const spacing = Math.min(100, (dimensions.width - 100) / Math.max(total, 1));
    const startX = centerX - ((total - 1) * spacing) / 2;
    return { x: startX + i * spacing, y: n1Y };
  });

  // Calculate positions for N2 members
  const n2Positions = n2Members.map((_, i) => {
    const total = n2Members.length;
    const spacing = Math.min(80, (dimensions.width - 100) / Math.max(total, 1));
    const startX = centerX - ((total - 1) * spacing) / 2;
    return { x: startX + i * spacing, y: n2Y };
  });

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'active': return '#22C55E';
      case 'inactive': return '#EF4444';
      case 'pending': return '#F59E0B';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="min-w-[300px]"
      >
        <defs>
          {/* Gradient for connections */}
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.4" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Animated dash pattern */}
          <pattern id="animatedDash" patternUnits="userSpaceOnUse" width="12" height="1">
            <line x1="0" y1="0" x2="8" y2="0" stroke="url(#connectionGradient)" strokeWidth="2">
              <animate
                attributeName="x1"
                from="0"
                to="12"
                dur="1s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                from="8"
                to="20"
                dur="1s"
                repeatCount="indefinite"
              />
            </line>
          </pattern>
        </defs>

        {/* Draw connections from YOU to N1 */}
        {n1Positions.map((pos, i) => (
          <g key={`n1-connection-${i}`}>
            <path
              d={`M ${centerX} ${youY + 25} Q ${centerX} ${(youY + pos.y) / 2} ${pos.x} ${pos.y - 25}`}
              fill="none"
              stroke="url(#connectionGradient)"
              strokeWidth="2"
              strokeDasharray="6 4"
              className="animate-dash"
            />
            {/* Animated dot */}
            <circle r="3" fill="#3B82F6" filter="url(#glow)">
              <animateMotion
                dur="2s"
                repeatCount="indefinite"
                path={`M ${centerX} ${youY + 25} Q ${centerX} ${(youY + pos.y) / 2} ${pos.x} ${pos.y - 25}`}
              />
            </circle>
          </g>
        ))}

        {/* Draw connections from N1 to N2 */}
        {n2Members.map((member, i) => {
          const n2Pos = n2Positions[i];
          // Find parent N1
          const parentN1Index = n1Members.findIndex(n1 => {
            // Match by parrainN1Name or use first available
            return member.parrainN1Name && n1Members.some(m => m.name === member.parrainN1Name);
          });
          const n1Pos = n1Positions[Math.max(0, parentN1Index)] || n1Positions[i % n1Positions.length];

          if (!n1Pos) return null;

          return (
            <g key={`n2-connection-${i}`}>
              <path
                d={`M ${n1Pos.x} ${n1Pos.y + 20} Q ${(n1Pos.x + n2Pos.x) / 2} ${(n1Pos.y + n2Pos.y) / 2} ${n2Pos.x} ${n2Pos.y - 20}`}
                fill="none"
                stroke="url(#connectionGradient)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                strokeOpacity="0.6"
                className="animate-dash-slow"
              />
            </g>
          );
        })}

        {/* YOU node (center) */}
        <g transform={`translate(${centerX}, ${youY})`} className="cursor-pointer">
          <circle r="30" className="fill-gradient-primary" filter="url(#glow)" />
          <circle
            r="32"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            className="animate-pulse-ring"
          />
          <text
            y="5"
            textAnchor="middle"
            className="fill-white font-bold text-sm"
          >
            YOU
          </text>
        </g>

        {/* N1 Member nodes */}
        {n1Members.map((member, i) => {
          const pos = n1Positions[i];
          return (
            <g
              key={member.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer transition-transform hover:scale-110"
              onClick={() => onViewMember?.(member.id)}
            >
              {/* Avatar circle */}
              <circle r="22" className="fill-white dark:fill-gray-700 stroke-blue-400 stroke-2" />

              {/* Status indicator */}
              <circle
                cx="16"
                cy="-16"
                r="6"
                fill={getStatusColor(member.status)}
                className={member.status === 'active' ? 'animate-pulse' : ''}
              />

              {/* Initials or icon */}
              <text
                y="5"
                textAnchor="middle"
                className="fill-gray-700 dark:fill-gray-200 font-semibold text-xs"
              >
                {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </text>

              {/* N1 badge */}
              <rect
                x="-12"
                y="26"
                width="24"
                height="14"
                rx="7"
                className="fill-blue-500"
              />
              <text
                y="36"
                textAnchor="middle"
                className="fill-white text-[10px] font-bold"
              >
                N1
              </text>

              {/* Qualified star */}
              {member.isQualified && (
                <g transform="translate(-20, -18)">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </g>
              )}
            </g>
          );
        })}

        {/* N2 Member nodes */}
        {n2Members.map((member, i) => {
          const pos = n2Positions[i];
          return (
            <g
              key={member.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer transition-transform hover:scale-110"
              onClick={() => onViewMember?.(member.id)}
            >
              {/* Avatar circle (smaller) */}
              <circle r="18" className="fill-white dark:fill-gray-700 stroke-purple-400 stroke-2" />

              {/* Status indicator */}
              <circle
                cx="12"
                cy="-12"
                r="5"
                fill={getStatusColor(member.status)}
              />

              {/* Initials */}
              <text
                y="4"
                textAnchor="middle"
                className="fill-gray-600 dark:fill-gray-300 font-medium text-[10px]"
              >
                {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </text>

              {/* N2 badge */}
              <rect
                x="-10"
                y="20"
                width="20"
                height="12"
                rx="6"
                className="fill-purple-500"
              />
              <text
                y="29"
                textAnchor="middle"
                className="fill-white text-[8px] font-bold"
              >
                N2
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(10, ${dimensions.height - 30})`}>
          <circle cx="0" cy="0" r="5" fill="#22C55E" />
          <text x="10" y="4" className="fill-gray-500 text-[10px]">Active</text>

          <circle cx="60" cy="0" r="5" fill="#F59E0B" />
          <text x="70" y="4" className="fill-gray-500 text-[10px]">Pending</text>

          <circle cx="130" cy="0" r="5" fill="#EF4444" />
          <text x="140" y="4" className="fill-gray-500 text-[10px]">Inactive</text>
        </g>
      </svg>

      <style>{`
        .fill-gradient-primary {
          fill: url(#connectionGradient);
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -12;
          }
        }
        .animate-dash {
          animation: dash 1s linear infinite;
        }
        .animate-dash-slow {
          animation: dash 2s linear infinite;
        }
        @keyframes pulseRing {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }
        .animate-pulse-ring {
          animation: pulseRing 2s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes confetti {
          0% {
            transform: translateY(-100%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 2s ease-out forwards;
        }
        @keyframes bounceSlow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounceSlow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subValue?: string;
  gradient: string;
  animate?: boolean;
  prefix?: string;
  suffix?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subValue,
  gradient,
  animate = true,
  prefix = '',
  suffix = '',
}) => {
  const [ref, isInView] = useInView();
  const animatedValue = useAnimatedCounter(
    typeof value === 'number' ? value : 0,
    1500,
    animate && isInView
  );

  return (
    <div
      ref={ref}
      className={`
        relative overflow-hidden p-4 rounded-2xl
        bg-white/80 dark:bg-white/5 backdrop-blur-xl
        border border-white/20 dark:border-white/10
        shadow-lg hover:shadow-xl transition-all duration-300
        group hover:scale-[1.02]
      `}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />

      <div className="relative flex items-start gap-3">
        <div className={`flex-shrink-0 p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {prefix}
            {typeof value === 'number' ? animatedValue.toLocaleString() : value}
            {suffix}
          </p>
          {subValue && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MEMBER CARD COMPONENT
// ============================================================================

interface MemberCardProps {
  member: TeamMember;
  onView?: () => void;
  onMessage?: () => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, onView, onMessage }) => {
  const intl = useIntl();

  const statusConfig = {
    active: {
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      dot: 'bg-green-500',
      label: intl.formatMessage({ id: 'team.status.active', defaultMessage: 'Active' }),
    },
    inactive: {
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      dot: 'bg-red-500',
      label: intl.formatMessage({ id: 'team.status.inactive', defaultMessage: 'Inactive' }),
    },
    pending: {
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      dot: 'bg-amber-500',
      label: intl.formatMessage({ id: 'team.status.pending', defaultMessage: 'Pending' }),
    },
  };

  const config = statusConfig[member.status];

  return (
    <div className="flex items-center gap-4 p-4 bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl border border-white/20 dark:border-white/10 hover:shadow-lg transition-all group">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={member.name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-gray-700 shadow-md"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-gray-700 shadow-md">
            {member.name.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Status dot */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${config.dot} ring-2 ring-white dark:ring-gray-800`} />

        {/* Level badge */}
        <div className={`absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${member.level === 1 ? 'bg-blue-500' : 'bg-purple-500'}`}>
          N{member.level}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
            {member.name}
          </h4>
          {member.isQualified && (
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <FormattedMessage
            id="team.member.joined"
            defaultMessage="Joined {date}"
            values={{ date: new Date(member.joinedAt).toLocaleDateString(intl.locale) }}
          />
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            ${(member.earnings / 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onMessage && (
          <button
            onClick={onMessage}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
            title={intl.formatMessage({ id: 'team.action.message', defaultMessage: 'Message' })}
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        )}
        {onView && (
          <button
            onClick={onView}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
            title={intl.formatMessage({ id: 'team.action.viewProfile', defaultMessage: 'View profile' })}
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// GOAL PROGRESS COMPONENT
// ============================================================================

interface GoalProgressProps {
  current: number;
  paidTiers: number[];
  onCelebrate?: (milestone: number) => void;
}

const GoalProgress: React.FC<GoalProgressProps> = ({ current, paidTiers, onCelebrate }) => {
  const intl = useIntl();

  // Find the next milestone
  const nextMilestone = MILESTONES.find(m => current < m && !paidTiers.includes(m)) || MILESTONES[MILESTONES.length - 1];
  const prevMilestone = MILESTONES.filter(m => m <= current).pop() || 0;
  const progress = Math.min(100, ((current - prevMilestone) / (nextMilestone - prevMilestone)) * 100);

  // Check for celebration
  useEffect(() => {
    if (MILESTONES.includes(current) && !paidTiers.includes(current)) {
      onCelebrate?.(current);
    }
  }, [current, paidTiers, onCelebrate]);

  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-gray-900 dark:text-white">
            <FormattedMessage
              id="team.goal.title"
              defaultMessage="Team Goal"
            />
          </span>
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {current} / {nextMilestone}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
        {/* Milestone markers */}
        {MILESTONES.map(milestone => {
          const position = ((milestone - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
          if (position > 100 || position < 0) return null;
          const isAchieved = current >= milestone || paidTiers.includes(milestone);

          return (
            <div
              key={milestone}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${position}%` }}
            >
              <div className={`w-3 h-3 rounded-full ${isAchieved ? 'bg-green-500' : 'bg-white dark:bg-gray-600'} ring-2 ring-white dark:ring-gray-800`} />
            </div>
          );
        })}
      </div>

      {/* Milestone labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
        {MILESTONES.slice(0, 4).map(milestone => {
          const isAchieved = current >= milestone || paidTiers.includes(milestone);
          const reward = MILESTONE_REWARDS[milestone as keyof typeof MILESTONE_REWARDS];

          return (
            <div key={milestone} className={`flex flex-col items-center ${isAchieved ? 'text-green-600 dark:text-green-400' : ''}`}>
              <span className="font-medium">{milestone}</span>
              <span className="text-[10px]">${reward.bonus}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// BEST PERFORMER HIGHLIGHT
// ============================================================================

interface BestPerformerProps {
  member: TeamMember | null;
}

const BestPerformerHighlight: React.FC<BestPerformerProps> = ({ member }) => {
  if (!member) return null;

  return (
    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl border border-yellow-200/50 dark:border-yellow-500/20">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <Crown className="absolute -top-2 -right-1 w-6 h-6 text-yellow-500 fill-yellow-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
              <FormattedMessage id="team.bestPerformer" defaultMessage="Best Performer" />
            </span>
          </div>
          <h4 className="font-bold text-gray-900 dark:text-white mt-1">{member.name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-green-600 dark:text-green-400">
              ${(member.earnings / 100).toFixed(2)}
            </span>
            {' '}
            <FormattedMessage id="team.earningsGenerated" defaultMessage="earnings generated" />
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// GROWTH TIPS COMPONENT
// ============================================================================

const GrowthTips: React.FC = () => {
  const intl = useIntl();
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % GROWTH_TIPS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const tip = GROWTH_TIPS[currentTip];
  const TipIcon = tip.icon;

  return (
    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
            <FormattedMessage id="team.tips.title" defaultMessage="Growth Tip" />
          </p>
          <div className="flex items-center gap-2">
            <TipIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {intl.formatMessage({ id: tip.key, defaultMessage: 'Share your success story to inspire others!' })}
            </p>
          </div>
        </div>
      </div>
      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {GROWTH_TIPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentTip(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentTip ? 'bg-emerald-500 w-4' : 'bg-emerald-300 dark:bg-emerald-700'}`}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TeamManagementCard: React.FC<TeamManagementCardProps> = ({
  stats,
  filleulsN1,
  filleulsN2,
  qualifiedCount,
  paidTiers = [],
  isLoading = false,
  onInvite,
  onViewMember,
  onMessageMember,
  onRefresh,
}) => {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState<'tree' | 'list'>('tree');
  const [celebratingMilestone, setCelebratingMilestone] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<'stats' | 'members' | 'tips' | null>('stats');

  // Convert filleuls to team members
  const teamMembers: TeamMember[] = useMemo(() => {
    const n1Members: TeamMember[] = filleulsN1.map(f => ({
      id: f.id,
      name: f.name,
      email: f.email,
      status: f.threshold50Reached ? 'active' : f.isActive ? 'pending' : 'inactive',
      level: 1 as const,
      earnings: f.clientEarnings,
      joinedAt: f.joinedAt,
      isQualified: f.threshold50Reached,
    }));

    const n2Members: TeamMember[] = filleulsN2.map(f => ({
      id: f.id,
      name: f.name,
      status: f.threshold50Reached ? 'active' : 'pending',
      level: 2 as const,
      earnings: 0, // N2 doesn't show direct earnings
      joinedAt: f.joinedAt,
      isQualified: f.threshold50Reached,
      parrainN1Name: f.parrainN1Name,
    }));

    return [...n1Members, ...n2Members];
  }, [filleulsN1, filleulsN2]);

  // Find best performer
  const bestPerformer = useMemo(() => {
    return teamMembers
      .filter(m => m.level === 1)
      .sort((a, b) => b.earnings - a.earnings)[0] || null;
  }, [teamMembers]);

  // Calculate stats
  const totalTeamSize = (stats?.totalFilleulsN1 || 0) + (stats?.totalFilleulsN2 || 0);
  const activeMembers = teamMembers.filter(m => m.status === 'active').length;
  const inactiveMembers = teamMembers.filter(m => m.status !== 'active').length;
  const recurringEarnings = (stats?.totalReferralEarnings || 0) * 0.05; // 5% recurring

  // Handle celebration
  const handleCelebrate = useCallback((milestone: number) => {
    setCelebratingMilestone(milestone);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Celebration Modal */}
      {celebratingMilestone && (
        <CelebrationModal
          milestone={celebratingMilestone}
          onClose={() => setCelebratingMilestone(null)}
        />
      )}

      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200/50 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  <FormattedMessage id="team.title" defaultMessage="Team Management" />
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="team.subtitle"
                    defaultMessage="{count} members in your network"
                    values={{ count: totalTeamSize }}
                  />
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
              {onInvite && (
                <button
                  onClick={onInvite}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="hidden sm:inline">
                    <FormattedMessage id="team.inviteMore" defaultMessage="Invite More" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Stats Section */}
          <div>
            <button
              onClick={() => setExpandedSection(expandedSection === 'stats' ? null : 'stats')}
              className="flex items-center justify-between w-full text-left mb-4"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <FormattedMessage id="team.stats.title" defaultMessage="Team Stats" />
              </h3>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSection === 'stats' ? 'rotate-180' : ''}`} />
            </button>

            {expandedSection === 'stats' && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in slide-in-from-top-2">
                <StatCard
                  icon={<Users className="w-5 h-5" />}
                  label={intl.formatMessage({ id: 'team.stats.totalSize', defaultMessage: 'Total Team' })}
                  value={totalTeamSize}
                  subValue={`N1: ${stats?.totalFilleulsN1 || 0} | N2: ${stats?.totalFilleulsN2 || 0}`}
                  gradient="from-blue-500 to-blue-600"
                />
                <StatCard
                  icon={<Zap className="w-5 h-5" />}
                  label={intl.formatMessage({ id: 'team.stats.active', defaultMessage: 'Active' })}
                  value={activeMembers}
                  subValue={`${inactiveMembers} ${intl.formatMessage({ id: 'team.stats.inactive', defaultMessage: 'inactive' })}`}
                  gradient="from-green-500 to-emerald-600"
                />
                <StatCard
                  icon={<DollarSign className="w-5 h-5" />}
                  label={intl.formatMessage({ id: 'team.stats.earnings', defaultMessage: 'Team Earnings' })}
                  value={(stats?.totalReferralEarnings || 0) / 100}
                  prefix="$"
                  subValue={intl.formatMessage({ id: 'team.stats.recurring', defaultMessage: '5% recurring' })}
                  gradient="from-emerald-500 to-teal-600"
                />
                <StatCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  label={intl.formatMessage({ id: 'team.stats.thisMonth', defaultMessage: 'This Month' })}
                  value={(stats?.monthlyReferralEarnings || 0) / 100}
                  prefix="$"
                  gradient="from-purple-500 to-pink-600"
                />
              </div>
            )}
          </div>

          {/* Goal Progress */}
          <GoalProgress
            current={qualifiedCount}
            paidTiers={paidTiers}
            onCelebrate={handleCelebrate}
          />

          {/* Best Performer */}
          {bestPerformer && (
            <BestPerformerHighlight member={bestPerformer} />
          )}

          {/* Team Tree / List Toggle */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <FormattedMessage id="team.network.title" defaultMessage="Your Network" />
              </h3>
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('tree')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'tree'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <FormattedMessage id="team.view.tree" defaultMessage="Tree" />
                </button>
                <button
                  onClick={() => setActiveTab('list')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'list'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <FormattedMessage id="team.view.list" defaultMessage="List" />
                </button>
              </div>
            </div>

            {activeTab === 'tree' ? (
              <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-xl p-4 min-h-[300px]">
                <TeamTree members={teamMembers} onViewMember={onViewMember} />
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {teamMembers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>
                      <FormattedMessage
                        id="team.list.empty"
                        defaultMessage="No team members yet"
                      />
                    </p>
                    <button
                      onClick={onInvite}
                      className="mt-4 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      <FormattedMessage
                        id="team.list.startInviting"
                        defaultMessage="Start inviting people!"
                      />
                    </button>
                  </div>
                ) : (
                  teamMembers.map(member => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      onView={() => onViewMember?.(member.id)}
                      onMessage={() => onMessageMember?.(member.id)}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Growth Tips */}
          <GrowthTips />

          {/* Invite CTA (Mobile prominent) */}
          <div className="sm:hidden">
            <button
              onClick={onInvite}
              className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-purple-500/30 active:scale-[0.98] transition-transform"
            >
              <Gift className="w-6 h-6" />
              <FormattedMessage id="team.cta.growTeam" defaultMessage="Grow Your Team" />
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeamManagementCard;
