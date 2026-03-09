/**
 * MotivationWidget - Motivation & Tips widget for Chatter dashboard
 * Displays rotating tips, motivational content, quick actions, and personalized insights
 * to keep chatters engaged and help them earn more
 */

import React, { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Lightbulb,
  Star,
  Copy,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Trophy,
  TrendingUp,
  Clock,
  Users,
  MessageCircle,
  Target,
  Zap,
  Sparkles,
  Share2,
} from 'lucide-react';
import { formatCurrencyLocale } from './currencyUtils';
import { UI } from '@/components/Chatter/designTokens';
import { copyToClipboard } from '@/utils/clipboard';

// ============================================================================
// TYPES
// ============================================================================

interface Tip {
  id: string;
  category: 'clients' | 'timing' | 'messages' | 'team' | 'general';
  icon: React.ReactNode;
}

interface PersonalizedInsight {
  id: string;
  type: 'progress' | 'bestDay' | 'suggestion';
  icon: React.ReactNode;
  value?: string | number;
  target?: string | number;
}

interface MotivationWidgetProps {
  // Chatter data for personalized insights
  level?: number;
  totalEarned?: number;
  nextLevelThreshold?: number;
  monthlyRank?: number;
  totalChatters?: number;
  bestDayOfWeek?: string;
  currentStreak?: number;
  // Share URLs
  clientShareUrl?: string;
  recruitmentShareUrl?: string;
  // Event handlers
  onCopyLink?: (url: string) => void;
  onShareWhatsApp?: (url: string) => void;
  onViewLeaderboard?: () => void;
  // Loading state
  loading?: boolean;
  // Collapsible state
  defaultExpanded?: boolean;
}

// ============================================================================
// TIPS POOL (20+ tips)
// ============================================================================

const TIPS_POOL: Tip[] = [
  // Finding Clients (category: 'clients')
  { id: 'tip.clients.facebook', category: 'clients', icon: <Users className="w-4 h-4" /> },
  { id: 'tip.clients.whatsapp', category: 'clients', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'tip.clients.expat.groups', category: 'clients', icon: <Users className="w-4 h-4" /> },
  { id: 'tip.clients.local.events', category: 'clients', icon: <Target className="w-4 h-4" /> },
  { id: 'tip.clients.linkedin', category: 'clients', icon: <Users className="w-4 h-4" /> },

  // Best Times (category: 'timing')
  { id: 'tip.timing.evening', category: 'timing', icon: <Clock className="w-4 h-4" /> },
  { id: 'tip.timing.weekend', category: 'timing', icon: <Clock className="w-4 h-4" /> },
  { id: 'tip.timing.payday', category: 'timing', icon: <Clock className="w-4 h-4" /> },
  { id: 'tip.timing.morning', category: 'timing', icon: <Clock className="w-4 h-4" /> },
  { id: 'tip.timing.consistency', category: 'timing', icon: <TrendingUp className="w-4 h-4" /> },

  // Message Tips (category: 'messages')
  { id: 'tip.messages.personal', category: 'messages', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'tip.messages.story', category: 'messages', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'tip.messages.urgency', category: 'messages', icon: <Zap className="w-4 h-4" /> },
  { id: 'tip.messages.benefits', category: 'messages', icon: <Star className="w-4 h-4" /> },
  { id: 'tip.messages.testimonial', category: 'messages', icon: <MessageCircle className="w-4 h-4" /> },

  // Growing Team (category: 'team')
  { id: 'tip.team.recruit.active', category: 'team', icon: <Users className="w-4 h-4" /> },
  { id: 'tip.team.train.referrals', category: 'team', icon: <Target className="w-4 h-4" /> },
  { id: 'tip.team.share.success', category: 'team', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'tip.team.mentorship', category: 'team', icon: <Star className="w-4 h-4" /> },

  // General Tips (category: 'general')
  { id: 'tip.general.consistency', category: 'general', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'tip.general.track.results', category: 'general', icon: <Target className="w-4 h-4" /> },
  { id: 'tip.general.level.up', category: 'general', icon: <Zap className="w-4 h-4" /> },
  { id: 'tip.general.quality', category: 'general', icon: <Star className="w-4 h-4" /> },
];

// ============================================================================
// COMPONENT
// ============================================================================

const MotivationWidget = memo(function MotivationWidget({
  totalEarned = 0,
  nextLevelThreshold = 10000,
  totalChatters = 0,
  bestDayOfWeek,
  currentStreak = 0,
  clientShareUrl = '',
  recruitmentShareUrl = '',
  onCopyLink,
  onShareWhatsApp,
  onViewLeaderboard,
  loading = false,
  defaultExpanded = true,
}: MotivationWidgetProps) {
  const intl = useIntl();

  // State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get daily tip based on date (rotates daily)
  const dailyTips = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    // Shuffle tips based on day and return 3 tips for the day
    const shuffled = [...TIPS_POOL].sort((a, b) => {
      const hashA = (a.id.charCodeAt(0) * dayOfYear) % 100;
      const hashB = (b.id.charCodeAt(0) * dayOfYear) % 100;
      return hashA - hashB;
    });
    return shuffled.slice(0, 5);
  }, []);

  // Current tip
  const currentTip = dailyTips[currentTipIndex];

  // Calculate personalized insights
  const insights = useMemo((): PersonalizedInsight[] => {
    const result: PersonalizedInsight[] = [];

    // Progress to next level
    if (nextLevelThreshold > totalEarned) {
      const progressPercent = Math.round((totalEarned / nextLevelThreshold) * 100);
      const remaining = nextLevelThreshold - totalEarned;
      result.push({
        id: 'insight.level.progress',
        type: 'progress',
        icon: <TrendingUp className="w-4 h-4" />,
        value: progressPercent,
        target: remaining,
      });
    }

    // Best day insight
    if (bestDayOfWeek) {
      result.push({
        id: 'insight.best.day',
        type: 'bestDay',
        icon: <Star className="w-4 h-4" />,
        value: bestDayOfWeek,
      });
    }

    // Posting time suggestion
    result.push({
      id: 'insight.posting.time',
      type: 'suggestion',
      icon: <Clock className="w-4 h-4" />,
    });

    return result;
  }, [totalEarned, nextLevelThreshold, bestDayOfWeek]);

  // Weekly earnings stat (mock - in real app, this would come from props)
  const weeklyEarningsStat = useMemo(() => {
    // This would be calculated from actual data in production
    const mockActiveChatters = totalChatters || 150;
    const mockWeeklyTotal = 250000; // In cents (USD) - $2500
    return {
      chatters: mockActiveChatters,
      total: mockWeeklyTotal,
    };
  }, [totalChatters]);

  // Navigate to next tip with animation
  const handleNextTip = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentTipIndex((prev) => (prev + 1) % dailyTips.length);
      setIsAnimating(false);
    }, 300);
  }, [dailyTips.length]);

  // Navigate to previous tip
  const handlePrevTip = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentTipIndex((prev) => (prev - 1 + dailyTips.length) % dailyTips.length);
      setIsAnimating(false);
    }, 300);
  }, [dailyTips.length]);

  // Auto-rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      handleNextTip();
    }, 8000); // Rotate every 8 seconds

    return () => clearInterval(interval);
  }, [handleNextTip]);

  // Touch handlers for mobile swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextTip();
    } else if (isRightSwipe) {
      handlePrevTip();
    }
  };

  // Copy link handler
  const handleCopyLink = async () => {
    const linkToCopy = clientShareUrl || recruitmentShareUrl;
    if (!linkToCopy) return;

    const success = await copyToClipboard(linkToCopy);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopyLink?.(linkToCopy);
    }
  };

  // Share on WhatsApp handler
  const handleShareWhatsApp = () => {
    const linkToShare = clientShareUrl || recruitmentShareUrl;
    if (!linkToShare) return;

    const message = intl.formatMessage({
      id: 'motivation.share.whatsapp.message',
      defaultMessage: "Need legal or administrative help? Contact an expat expert on SOS-Expat! {url}",
    }, { url: linkToShare });

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    onShareWhatsApp?.(linkToShare);
  };

  // Format amount in cents to USD display
  const formatAmount = (cents: number) => {
    return formatCurrencyLocale(cents, intl.locale);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="animate-pulse">
            <div className="h-6 w-40 bg-gray-200 dark:bg-white/10 rounded mb-4" />
            <div className="h-20 bg-gray-200 dark:bg-white/10 rounded-xl mb-4" />
            <div className="grid gap-2">
              <div className="h-10 bg-gray-200 dark:bg-white/10 rounded-xl" />
              <div className="h-10 bg-gray-200 dark:bg-white/10 rounded-xl" />
              <div className="h-10 bg-gray-200 dark:bg-white/10 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Header with collapse toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 dark:from-indigo-500/20 via-violet-500/10 dark:via-violet-500/20 to-purple-500/10 dark:to-purple-500/20 hover:from-indigo-500/20 hover:via-violet-500/20 hover:to-purple-500/20 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl shadow-lg">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="motivation.title" defaultMessage="Tips & Motivation" />
            </h3>
            <p className="text-xs dark:text-gray-400">
              <FormattedMessage id="motivation.subtitle" defaultMessage="Astuces pour gagner plus" />
            </p>
          </div>
        </div>
        <div className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </button>

      {/* Collapsible content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 sm:p-6 space-y-5">
          {/* Daily Tip Section - Swipeable */}
          <div
            ref={containerRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-50 dark:from-indigo-900/20 via-violet-50 dark:via-violet-900/20 to-purple-50 dark:to-purple-900/20 border dark:border-indigo-800/30 p-4">
              {/* Tip content with fade animation */}
              <div
                className={`transition-opacity duration-300 ${
                  isAnimating ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white/80 dark:bg-white/10 rounded-lg text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    {currentTip?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm dark:text-white font-medium">
                      <FormattedMessage
                        id={currentTip?.id}
                        defaultMessage={getTipDefaultMessage(currentTip?.id || '')}
                      />
                    </p>
                    <p className="text-xs dark:text-gray-400 mt-1 capitalize">
                      <FormattedMessage
                        id={`motivation.category.${currentTip?.category}`}
                        defaultMessage={currentTip?.category}
                      />
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation dots and arrows */}
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={handlePrevTip}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
                  aria-label={intl.formatMessage({ id: 'chatter.motivation.previousTip', defaultMessage: 'Previous tip' })}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1.5">
                  {dailyTips.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setIsAnimating(true);
                        setTimeout(() => {
                          setCurrentTipIndex(index);
                          setIsAnimating(false);
                        }, 300);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentTipIndex
                          ? 'bg-indigo-500 w-4'
                          : 'bg-gray-300 dark:bg-gray-600 hover:bg-indigo-400'
                      }`}
                      aria-label={intl.formatMessage({ id: 'chatter.motivation.goToTip', defaultMessage: 'Go to tip {number}' }, { number: index + 1 })}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNextTip}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
                  aria-label={intl.formatMessage({ id: 'chatter.motivation.nextTip', defaultMessage: 'Next tip' })}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Swipe hint for mobile */}
            <p className="text-[10px] dark:text-gray-300 mt-1.5 sm:hidden">
              <FormattedMessage id="motivation.swipe.hint" defaultMessage="Glissez pour plus de conseils" />
            </p>
          </div>

          {/* Motivational Quote / Weekly Stats */}
          <div className="p-4 bg-gradient-to-r from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 rounded-xl border dark:border-green-800/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs dark:text-green-400 font-medium uppercase tracking-wider">
                <FormattedMessage id="motivation.weekly.highlight" defaultMessage="Cette semaine" />
              </span>
            </div>
            <p className="text-sm dark:text-white">
              <FormattedMessage
                id="motivation.weekly.earnings"
                defaultMessage="{count} chatters ont gagne {amount} cette semaine !"
                values={{
                  count: weeklyEarningsStat.chatters,
                  amount: formatAmount(weeklyEarningsStat.total),
                }}
              />
            </p>
          </div>

          {/* Personalized Insights */}
          {insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs dark:text-gray-400 font-medium uppercase tracking-wider">
                <FormattedMessage id="motivation.insights.title" defaultMessage="Vos insights" />
              </p>
              <div className="space-y-2">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl"
                  >
                    <div className="p-1.5 bg-white dark:bg-white/10 rounded-lg text-gray-600 dark:text-gray-400">
                      {insight.icon}
                    </div>
                    <p className="text-sm dark:text-gray-300 flex-1">
                      {insight.type === 'progress' && (
                        <FormattedMessage
                          id="motivation.insight.level.progress"
                          defaultMessage="Vous etes a {percent}% du niveau suivant ({remaining} restants)"
                          values={{
                            percent: insight.value,
                            remaining: formatAmount(Number(insight.target) || 0),
                          }}
                        />
                      )}
                      {insight.type === 'bestDay' && (
                        <FormattedMessage
                          id="motivation.insight.best.day"
                          defaultMessage="Votre meilleur jour est le {day}"
                          values={{ day: insight.value }}
                        />
                      )}
                      {insight.type === 'suggestion' && (
                        <FormattedMessage
                          id="motivation.insight.posting.time"
                          defaultMessage="Essayez de poster a 19h pour de meilleurs resultats"
                        />
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions - Touch-friendly with 48px+ targets */}
          <div className="space-y-2">
            <p className="text-xs dark:text-gray-400 font-medium uppercase tracking-wider">
              <FormattedMessage id="motivation.actions.title" defaultMessage="Actions rapides" />
            </p>
            <div className="grid gap-2 sm:gap-3">
              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                disabled={!clientShareUrl && !recruitmentShareUrl}
                className={`flex items-center justify-center gap-1.5 p-3 rounded-xl min-h-[72px] transition-all active:scale-[0.98] touch-manipulation ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {copied ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
                <span className="text-[10px] sm:text-xs font-medium leading-tight">
                  {copied ? (
                    <FormattedMessage id="common.copied" defaultMessage="Copie !" />
                  ) : (
                    <FormattedMessage id="motivation.action.copy" defaultMessage="Copier lien" />
                  )}
                </span>
              </button>

              {/* Share on WhatsApp */}
              <button
                onClick={handleShareWhatsApp}
                disabled={!clientShareUrl && !recruitmentShareUrl}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl min-h-[72px] bg-green-500 hover:bg-green-600 text-white transition-all active:scale-[0.98] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-[10px] sm:text-xs font-medium leading-tight">
                  <FormattedMessage id="motivation.action.whatsapp" defaultMessage="WhatsApp" />
                </span>
              </button>

              {/* View Leaderboard */}
              <button
                onClick={onViewLeaderboard}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl min-h-[72px] bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white transition-all active:scale-[0.98] touch-manipulation"
              >
                <Trophy className="w-5 h-5" />
                <span className="text-[10px] sm:text-xs font-medium leading-tight">
                  <FormattedMessage id="motivation.action.leaderboard" defaultMessage="Top Chatters" />
                </span>
              </button>
            </div>
          </div>

          {/* Current Streak Motivation */}
          {currentStreak > 0 && (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 dark:from-indigo-900/20 to-violet-50 dark:to-violet-900/20 rounded-xl border dark:border-indigo-800/30">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-violet-500" />
                <span className="text-sm dark:text-white font-medium">
                  <FormattedMessage
                    id="motivation.streak"
                    defaultMessage="Streak de {days} jours !"
                    values={{ days: currentStreak }}
                  />
                </span>
              </div>
              <span className="text-xs dark:text-violet-400">
                <FormattedMessage id="motivation.streak.keep" defaultMessage="Continuez !" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Returns default message for tip IDs (used as fallback)
 */
function getTipDefaultMessage(tipId: string): string {
  const messages: Record<string, string> = {
    // Finding Clients
    'tip.clients.facebook': "Join Facebook groups for expats in your target country",
    'tip.clients.whatsapp': "Share your link in community WhatsApp groups",
    'tip.clients.expat.groups': "Expat forums are a goldmine for potential clients",
    'tip.clients.local.events': "Attend local expat events to build contacts",
    'tip.clients.linkedin': "LinkedIn is ideal for reaching expat professionals",

    // Best Times
    'tip.timing.evening': "The best times to post are between 6pm and 9pm",
    'tip.timing.weekend': "Sunday evening is ideal for reaching expats",
    'tip.timing.payday': "Post at the beginning of the month when people get paid",
    'tip.timing.morning': "Morning posts (7-9am) reach people before work",
    'tip.timing.consistency': "Consistency is key: post at least 3 times per week",

    // Message Tips
    'tip.messages.personal': "Personalize your messages - avoid generic copy-paste",
    'tip.messages.story': "Tell a success story of a helped client",
    'tip.messages.urgency': "Create urgency with limited-time offers",
    'tip.messages.benefits': "Focus on benefits, not features",
    'tip.messages.testimonial': "Share testimonials from satisfied clients",

    // Growing Team
    'tip.team.recruit.active': "Recruit people who are active on social media",
    'tip.team.train.referrals': "Train your referrals to maximize their performance",
    'tip.team.share.success': "Share your successes to motivate your team",
    'tip.team.mentorship': "Become a mentor for your most promising recruits",

    // General
    'tip.general.consistency': "Consistency beats intensity: be regular",
    'tip.general.track.results': "Track your results to identify what works",
    'tip.general.level.up': "Level up to unlock higher bonuses",
    'tip.general.quality': "A satisfied client brings 3 more - prioritize quality",
  };

  return messages[tipId] || "Tip of the day";
}

export default MotivationWidget;
