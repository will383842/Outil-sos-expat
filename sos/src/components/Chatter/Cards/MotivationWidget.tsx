/**
 * MotivationWidget - Motivation & Tips widget for Chatter dashboard
 * Displays rotating tips, motivational content, quick actions, and personalized insights
 * to keep chatters engaged and help them earn more
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

// Design tokens - consistent with other Chatter components
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl transition-shadow duration-300",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
} as const;

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

const MotivationWidget: React.FC<MotivationWidgetProps> = ({
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
}) => {
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
    const mockWeeklyTotal = 2500000; // In XOF
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

    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopyLink?.(linkToCopy);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Share on WhatsApp handler
  const handleShareWhatsApp = () => {
    const linkToShare = clientShareUrl || recruitmentShareUrl;
    if (!linkToShare) return;

    const message = intl.formatMessage({
      id: 'motivation.share.whatsapp.message',
      defaultMessage: "Besoin d'aide juridique ou administrative ? Contactez un expert expatrie sur SOS-Expat ! {url}",
    }, { url: linkToShare });

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    onShareWhatsApp?.(linkToShare);
  };

  // Format amount
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${UI.card} overflow-hidden`}>
        <div className="p-4 sm:p-6">
          <div className="animate-pulse">
            <div className="h-6 w-40 bg-gray-200 dark:bg-white/10 rounded mb-4" />
            <div className="h-20 bg-gray-200 dark:bg-white/10 rounded-xl mb-4" />
            <div className="grid grid-cols-3 gap-2">
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
    <div className={`${UI.card} overflow-hidden`}>
      {/* Header with collapse toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-6 py-4 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-red-500/20 hover:from-amber-500/20 hover:via-orange-500/20 hover:to-red-500/20 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg shadow-orange-500/30">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="motivation.title" defaultMessage="Tips & Motivation" />
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
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
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20 border border-amber-200/50 dark:border-amber-800/30 p-4">
              {/* Tip content with fade animation */}
              <div
                className={`transition-opacity duration-300 ${
                  isAnimating ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white/80 dark:bg-white/10 rounded-lg text-amber-600 dark:text-amber-400 flex-shrink-0">
                    {currentTip?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      <FormattedMessage
                        id={currentTip?.id}
                        defaultMessage={getTipDefaultMessage(currentTip?.id || '')}
                      />
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
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
                  className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
                  aria-label="Previous tip"
                >
                  <ChevronLeft className="w-4 h-4" />
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
                          ? 'bg-amber-500 w-4'
                          : 'bg-gray-300 dark:bg-gray-600 hover:bg-amber-400'
                      }`}
                      aria-label={`Go to tip ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNextTip}
                  className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400"
                  aria-label="Next tip"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Swipe hint for mobile */}
            <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-1.5 sm:hidden">
              <FormattedMessage id="motivation.swipe.hint" defaultMessage="Glissez pour plus de conseils" />
            </p>
          </div>

          {/* Motivational Quote / Weekly Stats */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/50 dark:border-green-800/30">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wider">
                <FormattedMessage id="motivation.weekly.highlight" defaultMessage="Cette semaine" />
              </span>
            </div>
            <p className="text-sm text-gray-900 dark:text-white">
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
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
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

          {/* Quick Actions */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <FormattedMessage id="motivation.actions.title" defaultMessage="Actions rapides" />
            </p>
            <div className="grid grid-cols-3 gap-2">
              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                disabled={!clientShareUrl && !recruitmentShareUrl}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl min-h-[72px] transition-all active:scale-[0.98] ${
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
                <span className="text-xs font-medium text-center leading-tight">
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
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl min-h-[72px] bg-green-500 hover:bg-green-600 text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-xs font-medium text-center leading-tight">
                  <FormattedMessage id="motivation.action.whatsapp" defaultMessage="WhatsApp" />
                </span>
              </button>

              {/* View Leaderboard */}
              <button
                onClick={onViewLeaderboard}
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl min-h-[72px] bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white transition-all active:scale-[0.98]"
              >
                <Trophy className="w-5 h-5" />
                <span className="text-xs font-medium text-center leading-tight">
                  <FormattedMessage id="motivation.action.leaderboard" defaultMessage="Top Chatters" />
                </span>
              </button>
            </div>
          </div>

          {/* Current Streak Motivation */}
          {currentStreak > 0 && (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border border-orange-200/50 dark:border-orange-800/30">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  <FormattedMessage
                    id="motivation.streak"
                    defaultMessage="Streak de {days} jours !"
                    values={{ days: currentStreak }}
                  />
                </span>
              </div>
              <span className="text-xs text-orange-600 dark:text-orange-400">
                <FormattedMessage id="motivation.streak.keep" defaultMessage="Continuez !" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Returns default message for tip IDs (used as fallback)
 */
function getTipDefaultMessage(tipId: string): string {
  const messages: Record<string, string> = {
    // Finding Clients
    'tip.clients.facebook': "Rejoignez les groupes Facebook d'expatries de votre pays cible",
    'tip.clients.whatsapp': "Partagez votre lien dans les groupes WhatsApp communautaires",
    'tip.clients.expat.groups': "Les forums d'expatries sont une mine d'or de clients potentiels",
    'tip.clients.local.events': "Assistez aux evenements locaux d'expatries pour creer des contacts",
    'tip.clients.linkedin': "LinkedIn est ideal pour toucher des professionnels expatries",

    // Best Times
    'tip.timing.evening': "Les meilleurs moments pour poster sont entre 18h et 21h",
    'tip.timing.weekend': "Le dimanche soir est ideal pour toucher les expatries",
    'tip.timing.payday': "Postez en debut de mois quand les gens recoivent leur salaire",
    'tip.timing.morning': "Les posts du matin (7h-9h) touchent les gens avant le travail",
    'tip.timing.consistency': "La regularite est cle : postez au moins 3 fois par semaine",

    // Message Tips
    'tip.messages.personal': "Personnalisez vos messages - evitez le copier-coller generique",
    'tip.messages.story': "Racontez une histoire de reussite d'un client aide",
    'tip.messages.urgency': "Creez un sentiment d'urgence avec des offres limitees",
    'tip.messages.benefits': "Focalisez sur les benefices, pas sur les fonctionnalites",
    'tip.messages.testimonial': "Partagez des temoignages de clients satisfaits",

    // Growing Team
    'tip.team.recruit.active': "Recrutez des personnes actives sur les reseaux sociaux",
    'tip.team.train.referrals': "Formez vos filleuls pour maximiser leurs performances",
    'tip.team.share.success': "Partagez vos succes pour motiver votre equipe",
    'tip.team.mentorship': "Devenez mentor pour vos recrues les plus prometteurs",

    // General
    'tip.general.consistency': "La constance bat l'intensite : soyez regulier",
    'tip.general.track.results': "Suivez vos resultats pour identifier ce qui fonctionne",
    'tip.general.level.up': "Montez de niveau pour debloquer des bonus plus eleves",
    'tip.general.quality': "Un client satisfait en amene 3 autres - privilegiez la qualite",
  };

  return messages[tipId] || "Astuce du jour";
}

export default MotivationWidget;
