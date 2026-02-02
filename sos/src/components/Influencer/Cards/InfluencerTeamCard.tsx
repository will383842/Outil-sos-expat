/**
 * InfluencerTeamCard - Displays the influencer's team (recruited influencers, lawyers, helpers) with their performance
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Users, UserPlus, TrendingUp, ChevronRight, Award } from 'lucide-react';

// Types
export interface TeamMember {
  id: string;
  firstName: string;
  lastName?: string;
  type: 'influencer' | 'lawyer' | 'helper';
  totalCalls: number;
  yourEarnings: number; // in cents
  isActive: boolean;
  joinedAt: string;
}

export interface InfluencerTeamCardProps {
  teamMembers: TeamMember[];
  totalN1Earnings: number; // in cents
  totalN2Earnings: number; // in cents
  isLoading?: boolean;
  onViewAll?: () => void;
  className?: string;
}

// Type badge colors
const typeBadgeColors: Record<TeamMember['type'], { bg: string; text: string }> = {
  influencer: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
  },
  lawyer: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
  },
  helper: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
  },
};

// Avatar colors based on first letter
const getAvatarColor = (letter: string): string => {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
  ];
  const index = letter.toUpperCase().charCodeAt(0) % colors.length;
  return colors[index];
};

// Loading skeleton component
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    {/* Header skeleton */}
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
    </div>

    {/* Stats skeleton */}
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-2" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-8" />
        </div>
      ))}
    </div>

    {/* Members skeleton */}
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
          <div className="text-right">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-1" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-8" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Empty state component
const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
      <UserPlus className="w-8 h-8 text-gray-400 dark:text-gray-500" />
    </div>
    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
      <FormattedMessage
        id="influencer.team.empty.title"
        defaultMessage="No team members yet"
      />
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
      <FormattedMessage
        id="influencer.team.empty.description"
        defaultMessage="Recruit lawyers, helpers, or other influencers to build your team and earn passive income."
      />
    </p>
  </div>
);

// Team member row component
interface TeamMemberRowProps {
  member: TeamMember;
  formatCurrency: (cents: number) => string;
}

const TeamMemberRow: React.FC<TeamMemberRowProps> = memo(({ member, formatCurrency }) => {
  const intl = useIntl();
  const firstLetter = member.firstName.charAt(0).toUpperCase();
  const displayName = member.lastName
    ? `${member.firstName} ${member.lastName.charAt(0)}.`
    : member.firstName;

  const typeLabel = {
    influencer: intl.formatMessage({ id: 'influencer.team.type.influencer', defaultMessage: 'Influencer' }),
    lawyer: intl.formatMessage({ id: 'influencer.team.type.lawyer', defaultMessage: 'Lawyer' }),
    helper: intl.formatMessage({ id: 'influencer.team.type.helper', defaultMessage: 'Helper' }),
  };

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Avatar */}
      <div className="relative">
        <div
          className={`w-10 h-10 rounded-full ${getAvatarColor(firstLetter)} flex items-center justify-center text-white font-semibold text-sm`}
        >
          {firstLetter}
        </div>
        {member.isActive && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
        )}
      </div>

      {/* Name and type */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {displayName}
        </p>
        <span
          className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded ${typeBadgeColors[member.type].bg} ${typeBadgeColors[member.type].text}`}
        >
          {typeLabel[member.type]}
        </span>
      </div>

      {/* Performance */}
      <div className="text-right">
        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
          {formatCurrency(member.yourEarnings)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {member.totalCalls}{' '}
          <FormattedMessage
            id="influencer.team.calls"
            defaultMessage="calls"
          />
        </p>
      </div>
    </div>
  );
});

TeamMemberRow.displayName = 'TeamMemberRow';

// Main component
const InfluencerTeamCard: React.FC<InfluencerTeamCardProps> = ({
  teamMembers,
  totalN1Earnings,
  totalN2Earnings,
  isLoading = false,
  onViewAll,
  className = '',
}) => {
  const intl = useIntl();

  // Format currency helper
  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalTeamSize = teamMembers.length;
    const activeThisMonth = teamMembers.filter((m) => m.isActive).length;
    const totalPassiveEarnings = totalN1Earnings + totalN2Earnings;

    return {
      totalTeamSize,
      activeThisMonth,
      totalPassiveEarnings,
    };
  }, [teamMembers, totalN1Earnings, totalN2Earnings]);

  // Get top 5 members sorted by earnings
  const topMembers = useMemo(() => {
    return [...teamMembers]
      .sort((a, b) => b.yourEarnings - a.yourEarnings)
      .slice(0, 5);
  }, [teamMembers]);

  return (
    <div
      className={`bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-4 sm:p-6 shadow-lg ${className}`}
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage
                  id="influencer.team.title"
                  defaultMessage="Your Team"
                />
              </h3>
            </div>
            {teamMembers.length > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full">
                {teamMembers.length}{' '}
                <FormattedMessage
                  id="influencer.team.members"
                  defaultMessage="members"
                />
              </span>
            )}
          </div>

          {teamMembers.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {/* Total team size */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {stats.totalTeamSize}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="influencer.team.stats.total"
                      defaultMessage="Total"
                    />
                  </p>
                </div>

                {/* Active this month */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                  </div>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {stats.activeThisMonth}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="influencer.team.stats.active"
                      defaultMessage="Active"
                    />
                  </p>
                </div>

                {/* Passive earnings */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Award className="w-3.5 h-3.5 text-yellow-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(stats.totalPassiveEarnings)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="influencer.team.stats.earnings"
                      defaultMessage="Earnings"
                    />
                  </p>
                </div>
              </div>

              {/* Top members list */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {topMembers.map((member) => (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>

              {/* View all button */}
              {onViewAll && teamMembers.length > 5 && (
                <button
                  onClick={onViewAll}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-colors"
                >
                  <FormattedMessage
                    id="influencer.team.viewAll"
                    defaultMessage="View all team members"
                  />
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

// Memoized export
export const InfluencerTeamCardMemo = memo(InfluencerTeamCard);
export { InfluencerTeamCard };
export default memo(InfluencerTeamCard);
