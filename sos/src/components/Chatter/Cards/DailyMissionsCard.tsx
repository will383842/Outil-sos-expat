/**
 * DailyMissionsCard - Daily tasks/missions widget for Chatter dashboard
 * Shows gamified daily tasks that reset every 24h to motivate chatters
 *
 * Features:
 * - 5 daily tasks with XP rewards (AUTO-TRACKED)
 * - Progress bar showing completion
 * - Streak counter for consecutive days
 * - Bonus reward for completing all tasks
 * - Confetti celebration on completion
 * - Mobile-first swipeable design
 *
 * TRACKABLE MISSIONS (not manual checkboxes):
 * - Share link 3x: tracked via ShareButtons clicks
 * - Login: auto-tracked on dashboard load
 * - Send team message: tracked via TeamMessagesCard
 * - Watch training video: tracked on video completion
 * - Generate client call: tracked server-side
 */

import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import Confetti from 'react-confetti';
import {
  Target,
  Flame,
  Gift,
  Check,
  ChevronLeft,
  ChevronRight,
  Share2,
  LogIn,
  MessageCircle,
  PlayCircle,
  Phone,
  Sparkles,
  Clock,
  Zap,
  Lock,
} from 'lucide-react';
import { useChatterMissions, type Mission } from '@/hooks/useChatterMissions';

// Design tokens - matching existing Chatter card styles
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl transition-shadow duration-300",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
  },
} as const;

// Task definitions with XP rewards - mapped to useChatterMissions
interface DailyTask {
  id: string;
  missionId: string; // Maps to useChatterMissions mission id
  icon: React.ElementType;
  titleKey: string;
  defaultTitle: string;
  descriptionKey: string;
  defaultDescription: string;
  xp: number;
  color: string;
  bgColor: string;
}

const DAILY_TASKS: DailyTask[] = [
  {
    id: 'share_link',
    missionId: 'share',
    icon: Share2,
    titleKey: 'chatter.dailyMissions.share.title',
    defaultTitle: 'Partage ton lien 3 fois',
    descriptionKey: 'chatter.dailyMissions.share.desc',
    defaultDescription: 'Partage ton lien sur les reseaux sociaux',
    xp: 50,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'daily_login',
    missionId: 'login',
    icon: LogIn,
    titleKey: 'chatter.dailyMissions.login.title',
    defaultTitle: 'Connecte-toi a l\'app',
    descriptionKey: 'chatter.dailyMissions.login.desc',
    defaultDescription: 'Connexion quotidienne completee',
    xp: 15,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 'team_message',
    missionId: 'message',
    icon: MessageCircle,
    titleKey: 'chatter.dailyMissions.message.title',
    defaultTitle: 'Envoie 1 message a un equipier',
    descriptionKey: 'chatter.dailyMissions.message.desc',
    defaultDescription: 'Motive ton equipe avec un message',
    xp: 30,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    id: 'watch_video',
    missionId: 'video',
    icon: PlayCircle,
    titleKey: 'chatter.dailyMissions.video.title',
    defaultTitle: 'Regarde la video formation',
    descriptionKey: 'chatter.dailyMissions.video.desc',
    defaultDescription: 'Apprends les techniques de vente',
    xp: 25,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  {
    id: 'generate_call',
    missionId: 'call',
    icon: Phone,
    titleKey: 'chatter.dailyMissions.call.title',
    defaultTitle: 'Genere 1 appel client',
    descriptionKey: 'chatter.dailyMissions.call.desc',
    defaultDescription: 'Fais passer un client a l\'action',
    xp: 100,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
];

const COMPLETION_BONUS_XP = 150;
const SWIPE_THRESHOLD = 50;

interface DailyMissionsCardProps {
  /** Current streak count */
  streak?: number;
  /** Best streak achieved */
  bestStreak?: number;
  /** Callback when all tasks are completed */
  onAllComplete?: () => void;
  /** Loading state (overrides internal loading) */
  loading?: boolean;
}

const DailyMissionsCard = memo(function DailyMissionsCard({
  streak = 0,
  bestStreak = 0,
  onAllComplete,
  loading: externalLoading = false,
}: DailyMissionsCardProps) {
  const intl = useIntl();
  const {
    missions,
    completedCount,
    totalXP,
    isLoading: missionsLoading,
  } = useChatterMissions();

  const [showCelebration, setShowCelebration] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasShownCelebrationRef = useRef(false);

  // Window size for confetti
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 400,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  const loading = externalLoading || missionsLoading;

  // Create a map of missions by id for easy lookup
  const missionMap = useMemo(() => {
    const map = new Map<string, Mission>();
    missions.forEach(m => map.set(m.id, m));
    return map;
  }, [missions]);

  // Calculate derived values
  const totalTasks = DAILY_TASKS.length;
  const progressPercent = (completedCount / totalTasks) * 100;
  const allCompleted = completedCount === totalTasks;

  const totalXpEarned = useMemo(() => {
    let xp = totalXP;
    if (allCompleted) {
      xp += COMPLETION_BONUS_XP;
    }
    return xp;
  }, [totalXP, allCompleted]);

  const totalPossibleXp = useMemo(() => {
    return DAILY_TASKS.reduce((sum, task) => sum + task.xp, 0) + COMPLETION_BONUS_XP;
  }, []);

  // Time until reset (midnight)
  const [timeUntilReset, setTimeUntilReset] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeUntilReset(`${hours}h ${minutes}m`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle window resize for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check for all tasks completion
  useEffect(() => {
    if (allCompleted && !hasShownCelebrationRef.current) {
      hasShownCelebrationRef.current = true;
      setShowCelebration(true);
      onAllComplete?.();

      // Auto-dismiss celebration after 4 seconds
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [allCompleted, onAllComplete]);

  // Swipe handling for mobile
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD && currentCardIndex < totalTasks - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else if (info.offset.x > SWIPE_THRESHOLD && currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const goToCard = (index: number) => {
    setCurrentCardIndex(Math.max(0, Math.min(totalTasks - 1, index)));
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`${UI.skeleton} h-6 w-32`} />
          <div className={`${UI.skeleton} h-6 w-20`} />
        </div>
        <div className={`${UI.skeleton} h-2 w-full rounded-full mb-4`} />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`${UI.skeleton} h-16 w-full rounded-xl`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Confetti Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <Confetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={false}
              numberOfPieces={300}
              gravity={0.25}
              colors={['#ef4444', '#f97316', '#f43f5e', '#22c55e', '#3b82f6', '#a855f7', '#eab308']}
            />

            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
                transition: { type: 'spring', damping: 15, stiffness: 300 },
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 mx-6 text-center shadow-2xl pointer-events-auto"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl dark:text-white font-bold mb-2"
              >
                <FormattedMessage
                  id="chatter.dailyMissions.allComplete.title"
                  defaultMessage="All Missions Complete!"
                />
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gray-600 dark:text-gray-400 mb-4"
              >
                <FormattedMessage
                  id="chatter.dailyMissions.allComplete.desc"
                  defaultMessage="You earned a bonus reward!"
                />
              </motion.p>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full text-white font-bold"
              >
                <Zap className="w-5 h-5" />
                +{COMPLETION_BONUS_XP} XP
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card */}
      <div className={`${UI.card} ${UI.cardHover} overflow-hidden`}>
        {/* Header */}
        <div className="p-4 sm:p-6 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  <FormattedMessage
                    id="chatter.dailyMissions.title"
                    defaultMessage="Daily Missions"
                  />
                </h3>
                <div className="flex items-center gap-1 text-xs dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>
                    <FormattedMessage
                      id="chatter.dailyMissions.resetIn"
                      defaultMessage="Resets in {time}"
                      values={{ time: timeUntilReset }}
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* Streak Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-50 dark:from-orange-900/20 to-red-50 dark:to-red-900/20">
              <Flame className={`w-4 h-4 ${streak > 0 ? 'text-orange-500' : 'text-gray-600 dark:text-gray-400'}`} />
              <span className="text-sm dark:text-white font-bold">{streak}</span>
              <span className="text-xs dark:text-gray-400">
                <FormattedMessage id="chatter.dailyMissions.streak" defaultMessage="streak" />
              </span>
            </div>
          </div>

          {/* Progress Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-600 dark:text-gray-400">
                <FormattedMessage
                  id="chatter.dailyMissions.progress"
                  defaultMessage="{completed}/{total} completed"
                  values={{ completed: completedCount, total: totalTasks }}
                />
              </span>
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <Zap className="w-4 h-4" />
                <span className="font-bold">{totalXpEarned}</span>
                <span className="text-gray-600 dark:text-gray-400">/ {totalPossibleXp} XP</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>

            {/* Bonus Indicator */}
            {!allCompleted && (
              <div className="flex items-center gap-1.5 mt-2 text-xs dark:text-gray-400">
                <Gift className="w-3.5 h-3.5 text-red-500" />
                <FormattedMessage
                  id="chatter.dailyMissions.bonusHint"
                  defaultMessage="Complete all for +{xp} XP bonus!"
                  values={{ xp: COMPLETION_BONUS_XP }}
                />
              </div>
            )}

            {allCompleted && (
              <div className="flex items-center gap-1.5 mt-2 text-xs dark:text-green-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                <FormattedMessage
                  id="chatter.dailyMissions.bonusEarned"
                  defaultMessage="Bonus earned! Come back tomorrow."
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Swipeable Cards */}
        <div className="block sm:hidden px-4 pb-4">
          <div
            ref={containerRef}
            className="relative overflow-hidden"
          >
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              style={{ x, opacity }}
              className="cursor-grab active:cursor-grabbing"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCardIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2 }}
                >
                  <TaskCard
                    task={DAILY_TASKS[currentCardIndex]}
                    mission={missionMap.get(DAILY_TASKS[currentCardIndex].missionId)}
                    intl={intl}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Navigation Arrows - 44px minimum touch targets */}
            <button
              onClick={() => goToCard(currentCardIndex - 1)}
              disabled={currentCardIndex === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10 touch-manipulation active:scale-95"
              aria-label={intl.formatMessage({ id: 'chatter.missions.previousTask', defaultMessage: 'Previous task' })}
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <button
              onClick={() => goToCard(currentCardIndex + 1)}
              disabled={currentCardIndex === totalTasks - 1}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-11 h-11 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10 touch-manipulation active:scale-95"
              aria-label={intl.formatMessage({ id: 'chatter.missions.nextTask', defaultMessage: 'Next task' })}
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Pagination Dots - Larger touch targets */}
          <div className="flex justify-center gap-2 mt-4">
            {DAILY_TASKS.map((task, index) => {
              const mission = missionMap.get(task.missionId);
              const isCompleted = mission?.completed ?? false;
              return (
                <button
                  key={task.id}
                  onClick={() => goToCard(index)}
                  className={`min-w-[44px] flex items-center justify-center touch-manipulation`}
                  aria-label={intl.formatMessage({ id: 'chatter.missions.goToTask', defaultMessage: 'Go to task {number}' }, { number: index + 1 })}
                >
                  <span className={`block rounded-full transition-all ${
                    index === currentCardIndex
                      ? 'w-6 h-2.5 bg-gradient-to-r from-red-500 to-orange-500'
                      : isCompleted
                        ? 'w-2.5 h-2.5 bg-green-500'
                        : 'w-2.5 h-2.5 bg-gray-300 dark:bg-gray-600'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop/Tablet List View */}
        <div className="hidden sm:block px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-2">
            {DAILY_TASKS.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                mission={missionMap.get(task.missionId)}
                isExpanded={isExpanded}
                intl={intl}
              />
            ))}
          </div>

          {/* Expand/Collapse for compact view (optional) */}
          {DAILY_TASKS.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-3 py-2 text-sm dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {isExpanded ? (
                <FormattedMessage id="chatter.dailyMissions.showLess" defaultMessage="Show less" />
              ) : (
                <FormattedMessage id="chatter.dailyMissions.showMore" defaultMessage="Show all missions" />
              )}
            </button>
          )}
        </div>

        {/* Best Streak Footer */}
        {bestStreak > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-orange-50 dark:from-orange-900/10 to-red-50 dark:to-red-900/10 border-t dark:border-orange-900/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                <FormattedMessage id="chatter.dailyMissions.bestStreak" defaultMessage="Best streak" />
              </span>
              <div className="flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400">
                <Flame className="w-4 h-4" />
                {bestStreak} <FormattedMessage id="chatter.dailyMissions.days" defaultMessage="days" />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

// Task Card for Mobile Swipe View
interface TaskCardProps {
  task: DailyTask;
  mission?: Mission;
  intl: ReturnType<typeof useIntl>;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  mission,
  intl,
}) => {
  const Icon = task.icon;
  const isCompleted = mission?.completed ?? false;
  const current = mission?.current ?? 0;
  const target = mission?.target ?? 1;
  const showProgress = target > 1;

  return (
    <motion.div
      className={`relative p-5 rounded-2xl border-2 transition-all ${
        isCompleted
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl${task.bgColor}flex items-center justify-center`}>
          <Icon className={`w-7 h-7 ${task.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold mb-1 ${isCompleted ? 'text-green-700 dark:text-green-300 line-through' : 'text-gray-900 dark:text-white'}`}>
            {intl.formatMessage({ id: task.titleKey, defaultMessage: task.defaultTitle })}
          </h4>
          <p className="text-sm dark:text-gray-400 mb-3">
            {intl.formatMessage({ id: task.descriptionKey, defaultMessage: task.defaultDescription })}
          </p>

          {/* Progress indicator for multi-step missions */}
          {showProgress && !isCompleted && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs dark:text-gray-400 mb-1">
                <span>{current}/{target}</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-red-500 rounded-full transition-all duration-300"
                  style={{ width: `${(current / target) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* XP Badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              isCompleted
                ? 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300'
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
            }`}>
              <Zap className="w-3 h-3" />
              {isCompleted ? '+' : ''}{task.xp} XP
            </span>
          </div>
        </div>
      </div>

      {/* Auto-tracked status indicator */}
      <div
        className={`mt-4 w-full min-h-[48px] rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
          isCompleted
            ? 'bg-green-500 text-white'
            : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
        }`}
      >
        {isCompleted ? (
          <>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <Check className="w-5 h-5" />
            </motion.div>
            <FormattedMessage id="chatter.dailyMissions.completed" defaultMessage="Completed" />
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            <FormattedMessage
              id="chatter.dailyMissions.autoTracked"
              defaultMessage="Auto-tracked"
            />
          </>
        )}
      </div>
    </motion.div>
  );
};

// Task List Item for Desktop View
interface TaskListItemProps {
  task: DailyTask;
  mission?: Mission;
  isExpanded: boolean;
  intl: ReturnType<typeof useIntl>;
}

const TaskListItem: React.FC<TaskListItemProps> = ({
  task,
  mission,
  intl,
}) => {
  const Icon = task.icon;
  const isCompleted = mission?.completed ?? false;
  const current = mission?.current ?? 0;
  const target = mission?.target ?? 1;
  const showProgress = target > 1;

  return (
    <motion.div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
        isCompleted
          ? 'bg-green-50 dark:bg-green-900/20'
          : 'bg-gray-50 dark:bg-white/5'
      }`}
      animate={isCompleted ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {/* Checkbox / Status indicator */}
      <div
        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all${
          isCompleted
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Icon */}
      <div className={`w-9 h-9 rounded-lg${task.bgColor}flex items-center justify-center`}>
        <Icon className={`w-4.5 h-4.5 ${task.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          isCompleted ? 'text-green-700 dark:text-green-300 line-through' : 'text-gray-900 dark:text-white'
        }`}>
          {intl.formatMessage({ id: task.titleKey, defaultMessage: task.defaultTitle })}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs dark:text-gray-400 truncate">
            {intl.formatMessage({ id: task.descriptionKey, defaultMessage: task.defaultDescription })}
          </p>
          {/* Progress indicator for multi-step missions */}
          {showProgress && (
            <span className={`text-xs font-medium ${
              isCompleted
                ? 'text-green-600 dark:text-green-400'
                : 'text-blue-600 dark:text-blue-400'
            }`}>
              ({current}/{target})
            </span>
          )}
        </div>
      </div>

      {/* XP Badge */}
      <div className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1${
        isCompleted
          ? 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300'
          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
      }`}>
        <Zap className="w-3 h-3" />
        {task.xp}
      </div>
    </motion.div>
  );
};

export default DailyMissionsCard;
