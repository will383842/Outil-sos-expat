/**
 * GroupAdminLeaderboard - Monthly leaderboard page with badges display
 */

import React, { useState, useEffect, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import Layout from '@/components/layout/Layout';
import SEOHead from '@/components/layout/SEOHead';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { Trophy, Medal, Award, Loader2, ChevronLeft, ChevronRight, Filter, X, Calendar, Clock } from 'lucide-react';
import { GroupAdminLeaderboardEntry, GroupAdminBadgeType, GROUP_ADMIN_BADGES, formatGroupAdminAmount } from '@/types/groupAdmin';

const GroupAdminLeaderboard: React.FC = () => {
  const intl = useIntl();
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [isAllTime, setIsAllTime] = useState(false);
  const [rankings, setRankings] = useState<GroupAdminLeaderboardEntry[]>([]);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [badgeFilter, setBadgeFilter] = useState<GroupAdminBadgeType | null>(null);
  const [showBadgeFilterDropdown, setShowBadgeFilterDropdown] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, [month, isAllTime]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const getLeaderboard = httpsCallable(functions, 'getGroupAdminLeaderboard');
      const result = await getLeaderboard({ month: isAllTime ? 'all-time' : month });
      const data = result.data as {
        rankings: GroupAdminLeaderboardEntry[];
        currentAdminRank: number | null;
        totalParticipants: number;
      };
      setRankings(data.rankings);
      setCurrentRank(data.currentAdminRank);
      setTotalParticipants(data.totalParticipants);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter rankings by badge
  const filteredRankings = useMemo(() => {
    if (!badgeFilter) return rankings;
    return rankings.filter((entry) => entry.badges?.includes(badgeFilter));
  }, [rankings, badgeFilter]);

  // Available badges for filtering (only show badges that exist in current rankings)
  const availableBadges = useMemo(() => {
    const badgeSet = new Set<GroupAdminBadgeType>();
    rankings.forEach((entry) => {
      entry.badges?.forEach((badge) => badgeSet.add(badge));
    });
    return Array.from(badgeSet).sort((a, b) =>
      GROUP_ADMIN_BADGES[a].order - GROUP_ADMIN_BADGES[b].order
    );
  }, [rankings]);

  const changeMonth = (direction: number) => {
    const date = new Date(month + '-01');
    date.setMonth(date.getMonth() + direction);
    const newMonth = date.toISOString().substring(0, 7);
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (newMonth <= currentMonth) {
      setMonth(newMonth);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return null;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
      case 2: return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
      case 3: return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
      default: return 'bg-white border-gray-100';
    }
  };

  const monthLabel = isAllTime
    ? intl.formatMessage({ id: 'groupAdmin.leaderboard.allTime', defaultMessage: 'All Time' })
    : new Date(month + '-01').toLocaleDateString(intl.locale, { month: 'long', year: 'numeric' });

  // Render badges for an entry
  const renderBadges = (badges?: GroupAdminBadgeType[]) => {
    if (!badges || badges.length === 0) return null;

    // Show max 3 badges, with a +N indicator if more
    const displayBadges = badges.slice(0, 3);
    const remaining = badges.length - 3;

    return (
      <div className="flex items-center gap-1 mt-1">
        {displayBadges.map((badge) => {
          const badgeInfo = GROUP_ADMIN_BADGES[badge];
          return (
            <span
              key={badge}
              title={badgeInfo.name}
              className="text-sm cursor-help"
              style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' }}
            >
              {badgeInfo.icon}
            </span>
          );
        })}
        {remaining > 0 && (
          <span className="text-xs text-gray-400 ml-1">+{remaining}</span>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <SEOHead title={intl.formatMessage({ id: 'groupAdmin.leaderboard.title', defaultMessage: 'Leaderboard | SOS-Expat Group Admin' })} />

      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 text-center">
            <FormattedMessage id="groupAdmin.leaderboard.heading" defaultMessage="Leaderboard" />
          </h1>

          {/* Time Period Toggle */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setIsAllTime(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                !isAllTime
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <FormattedMessage id="groupAdmin.leaderboard.monthly" defaultMessage="Monthly" />
            </button>
            <button
              onClick={() => setIsAllTime(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isAllTime
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <FormattedMessage id="groupAdmin.leaderboard.allTime" defaultMessage="All Time" />
            </button>
          </div>

          {/* Month Selector (only for monthly view) */}
          {!isAllTime && (
            <div className="flex items-center justify-center gap-4 mb-4">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-lg font-medium min-w-[180px] text-center">{monthLabel}</span>
              <button
                onClick={() => changeMonth(1)}
                disabled={month >= new Date().toISOString().substring(0, 7)}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Badge Filter */}
          {availableBadges.length > 0 && (
            <div className="relative mb-6">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setShowBadgeFilterDropdown(!showBadgeFilterDropdown)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    badgeFilter
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  {badgeFilter ? (
                    <>
                      <span>{GROUP_ADMIN_BADGES[badgeFilter].icon}</span>
                      <span className="text-sm">{GROUP_ADMIN_BADGES[badgeFilter].name}</span>
                    </>
                  ) : (
                    <span className="text-sm">
                      <FormattedMessage id="groupAdmin.leaderboard.filterByBadge" defaultMessage="Filter by Badge" />
                    </span>
                  )}
                </button>
                {badgeFilter && (
                  <button
                    onClick={() => setBadgeFilter(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Badge Filter Dropdown */}
              {showBadgeFilterDropdown && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-2 min-w-[200px]">
                  {availableBadges.map((badge) => {
                    const badgeInfo = GROUP_ADMIN_BADGES[badge];
                    return (
                      <button
                        key={badge}
                        onClick={() => {
                          setBadgeFilter(badge);
                          setShowBadgeFilterDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors ${
                          badgeFilter === badge ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <span className="text-lg">{badgeInfo.icon}</span>
                        <span className="text-sm text-gray-700">{badgeInfo.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Current Rank Banner */}
          {currentRank && (
            <div className="bg-indigo-600 text-white rounded-xl p-4 mb-6 text-center">
              <p className="text-indigo-200 text-sm">Your Rank</p>
              <p className="text-3xl font-bold">#{currentRank}</p>
              <p className="text-indigo-200 text-sm">of {totalParticipants} participants</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredRankings.length > 0 ? (
            <div className="space-y-3">
              {badgeFilter && (
                <p className="text-sm text-gray-500 text-center mb-4">
                  <FormattedMessage
                    id="groupAdmin.leaderboard.showingWithBadge"
                    defaultMessage="Showing {count} {count, plural, one {admin} other {admins}} with {badge} badge"
                    values={{
                      count: filteredRankings.length,
                      badge: GROUP_ADMIN_BADGES[badgeFilter].name
                    }}
                  />
                </p>
              )}
              {filteredRankings.map((entry) => (
                <div
                  key={entry.groupAdminId}
                  className={`rounded-xl border p-4 ${getRankStyle(entry.rank)}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center">
                      {getRankIcon(entry.rank) || (
                        <span className="text-2xl font-bold text-gray-400">#{entry.rank}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{entry.groupAdminName}</p>
                      {entry.groupName && (
                        <p className="text-sm text-gray-500 truncate">{entry.groupName}</p>
                      )}
                      {renderBadges(entry.badges)}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-green-600">{formatGroupAdminAmount(entry.earnings)}</p>
                      {entry.clients !== undefined && entry.clients > 0 && (
                        <p className="text-xs text-gray-500">
                          {entry.clients} {intl.formatMessage({ id: 'groupAdmin.leaderboard.clients', defaultMessage: 'clients' })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : badgeFilter ? (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                <FormattedMessage
                  id="groupAdmin.leaderboard.noAdminsWithBadge"
                  defaultMessage="No admins found with the {badge} badge"
                  values={{ badge: GROUP_ADMIN_BADGES[badgeFilter].name }}
                />
              </p>
              <button
                onClick={() => setBadgeFilter(null)}
                className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                <FormattedMessage id="groupAdmin.leaderboard.clearFilter" defaultMessage="Clear filter" />
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {isAllTime ? (
                  <FormattedMessage id="groupAdmin.leaderboard.noRankingsAllTime" defaultMessage="No rankings yet" />
                ) : (
                  <FormattedMessage id="groupAdmin.leaderboard.noRankings" defaultMessage="No rankings for this month yet" />
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default GroupAdminLeaderboard;
