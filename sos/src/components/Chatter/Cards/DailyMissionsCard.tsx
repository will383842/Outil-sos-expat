/**
 * DailyMissionsCard - Daily tasks/missions widget for Chatter dashboard
 * Shows gamified daily tasks that reset every 24h to motivate chatters
 *
 * Features:
 * - 5 daily tasks with XP rewards
 * - Progress bar showing completion
 * - Streak counter for consecutive days
 * - Bonus reward for completing all tasks
 * - Confetti celebration on completion
 * - Mobile-first swipeable design
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Facebook,
  MessageCircle,
  Users,
  Trophy,
  UserPlus,
  Sparkles,
  Clock,
  Zap,
} from 'lucide-react';

// Design tokens - matching existing Chatter card styles
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl transition-shadow duration-300",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
  },
} as const;

// Task definitions with XP rewards
interface DailyTask {
  id: string;
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
    id: 'facebook_share',
    icon: Facebook,
    titleKey: 'chatter.dailyMissions.facebook.title',
    defaultTitle: 'Share on Facebook',
    descriptionKey: 'chatter.dailyMissions.facebook.desc',
    defaultDescription: 'Share your link on 3 Facebook groups',
    xp: 50,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'whatsapp_status',
    icon: MessageCircle,
    titleKey: 'chatter.dailyMissions.whatsapp.title',
    defaultTitle: 'WhatsApp Status',
    descriptionKey: 'chatter.dailyMissions.whatsapp.desc',
    defaultDescription: 'Post on WhatsApp status',
    xp: 30,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 'help_expats',
    icon: Users,
    titleKey: 'chatter.dailyMissions.help.title',
    defaultTitle: 'Help Expats',
    descriptionKey: 'chatter.dailyMissions.help.desc',
    defaultDescription: 'Reply to 5 expat questions online',
    xp: 75,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    id: 'check_leaderboard',
    icon: Trophy,
    titleKey: 'chatter.dailyMissions.leaderboard.title',
    defaultTitle: 'Check Leaderboard',
    descriptionKey: 'chatter.dailyMissions.leaderboard.desc',
    defaultDescription: 'View the leaderboard',
    xp: 15,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  {
    id: 'invite_chatter',
    icon: UserPlus,
    titleKey: 'chatter.dailyMissions.invite.title',
    defaultTitle: 'Invite a Chatter',
    descriptionKey: 'chatter.dailyMissions.invite.desc',
    defaultDescription: 'Invite 1 new chatter to join',
    xp: 100,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
];

const COMPLETION_BONUS_XP = 150;
const SWIPE_THRESHOLD = 50;

interface DailyMissionsCardProps {
  /** Initial completed task IDs (from localStorage or server) */
  initialCompletedTasks?: string[];
  /** Current streak count */
  streak?: number;
  /** Best streak achieved */
  bestStreak?: number;
  /** Callback when a task is completed */
  onTaskComplete?: (taskId: string) => void;
  /** Callback when all tasks are completed */
  onAllComplete?: () => void;
  /** Loading state */
  loading?: boolean;
}

const DailyMissionsCard: React.FC<DailyMissionsCardProps> = ({
  initialCompletedTasks = [],
  streak = 0,
  bestStreak = 0,
  onTaskComplete,
  onAllComplete,
  loading = false,
}) => {
  const intl = useIntl();
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(
    new Set(initialCompletedTasks)
  );
  const [showCelebration, setShowCelebration] = useState(false);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Window size for confetti
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 400,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  // Calculate derived values
  const completedCount = completedTasks.size;
  const totalTasks = DAILY_TASKS.length;
  const progressPercent = (completedCount / totalTasks) * 100;
  const allCompleted = completedCount === totalTasks;

  const totalXpEarned = useMemo(() => {
    let xp = 0;
    DAILY_TASKS.forEach(task => {
      if (completedTasks.has(task.id)) {
        xp += task.xp;
      }
    });
    if (allCompleted) {
      xp += COMPLETION_BONUS_XP;
    }
    return xp;
  }, [completedTasks, allCompleted]);

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
    if (allCompleted && !showCelebration) {
      setShowCelebration(true);
      onAllComplete?.();

      // Auto-dismiss celebration after 4 seconds
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [allCompleted, showCelebration, onAllComplete]);

  // Toggle task completion
  const toggleTask = useCallback((taskId: string) => {
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
        setJustCompleted(taskId);
        onTaskComplete?.(taskId);

        // Clear animation after delay
        setTimeout(() => setJustCompleted(null), 600);
      }
      return newSet;
    });
  }, [onTaskComplete]);

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
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  <FormattedMessage
                    id="chatter.dailyMissions.title"
                    defaultMessage="Daily Missions"
                  />
                </h3>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
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
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
              <Flame className={`w-4 h-4 ${streak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
              <span className="text-sm font-bold text-gray-900 dark:text-white">{streak}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
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
                <span className="text-gray-400">/ {totalPossibleXp} XP</span>
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
              <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <Gift className="w-3.5 h-3.5 text-purple-500" />
                <FormattedMessage
                  id="chatter.dailyMissions.bonusHint"
                  defaultMessage="Complete all for +{xp} XP bonus!"
                  values={{ xp: COMPLETION_BONUS_XP }}
                />
              </div>
            )}

            {allCompleted && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
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
                    isCompleted={completedTasks.has(DAILY_TASKS[currentCardIndex].id)}
                    justCompleted={justCompleted === DAILY_TASKS[currentCardIndex].id}
                    onToggle={() => toggleTask(DAILY_TASKS[currentCardIndex].id)}
                    intl={intl}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Navigation Arrows */}
            <button
              onClick={() => goToCard(currentCardIndex - 1)}
              disabled={currentCardIndex === 0}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10"
              aria-label="Previous task"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            <button
              onClick={() => goToCard(currentCardIndex + 1)}
              disabled={currentCardIndex === totalTasks - 1}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg disabled:opacity-30 disabled:cursor-not-allowed z-10"
              aria-label="Next task"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Pagination Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {DAILY_TASKS.map((task, index) => (
              <button
                key={task.id}
                onClick={() => goToCard(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentCardIndex
                    ? 'w-6 bg-gradient-to-r from-red-500 to-orange-500'
                    : completedTasks.has(task.id)
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-label={`Go to task ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop/Tablet List View */}
        <div className="hidden sm:block px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-2">
            {DAILY_TASKS.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                isCompleted={completedTasks.has(task.id)}
                justCompleted={justCompleted === task.id}
                onToggle={() => toggleTask(task.id)}
                isExpanded={isExpanded}
                intl={intl}
              />
            ))}
          </div>

          {/* Expand/Collapse for compact view (optional) */}
          {DAILY_TASKS.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
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
          <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 border-t border-orange-100 dark:border-orange-900/20">
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
};

// Task Card for Mobile Swipe View
interface TaskCardProps {
  task: DailyTask;
  isCompleted: boolean;
  justCompleted: boolean;
  onToggle: () => void;
  intl: ReturnType<typeof useIntl>;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isCompleted,
  justCompleted,
  onToggle,
  intl,
}) => {
  const Icon = task.icon;

  return (
    <motion.div
      className={`relative p-5 rounded-2xl border-2 transition-all ${
        isCompleted
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10'
      }`}
      animate={justCompleted ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl ${task.bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-7 h-7 ${task.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold mb-1 ${isCompleted ? 'text-green-700 dark:text-green-300 line-through' : 'text-gray-900 dark:text-white'}`}>
            {intl.formatMessage({ id: task.titleKey, defaultMessage: task.defaultTitle })}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {intl.formatMessage({ id: task.descriptionKey, defaultMessage: task.defaultDescription })}
          </p>

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

      {/* Complete Button */}
      <button
        onClick={onToggle}
        className={`mt-4 w-full min-h-[48px] rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
          isCompleted
            ? 'bg-green-500 text-white'
            : 'bg-gradient-to-r from-red-500 to-orange-500 text-white active:scale-[0.98]'
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
          <FormattedMessage id="chatter.dailyMissions.markComplete" defaultMessage="Mark as Complete" />
        )}
      </button>
    </motion.div>
  );
};

// Task List Item for Desktop View
interface TaskListItemProps {
  task: DailyTask;
  isCompleted: boolean;
  justCompleted: boolean;
  onToggle: () => void;
  isExpanded: boolean;
  intl: ReturnType<typeof useIntl>;
}

const TaskListItem: React.FC<TaskListItemProps> = ({
  task,
  isCompleted,
  justCompleted,
  onToggle,
  intl,
}) => {
  const Icon = task.icon;

  return (
    <motion.div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group ${
        isCompleted
          ? 'bg-green-50 dark:bg-green-900/20'
          : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
      }`}
      onClick={onToggle}
      animate={justCompleted ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.3 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
    >
      {/* Checkbox */}
      <div
        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isCompleted
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 dark:border-gray-600 group-hover:border-red-400'
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
      <div className={`w-9 h-9 rounded-lg ${task.bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4.5 h-4.5 ${task.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${
          isCompleted ? 'text-green-700 dark:text-green-300 line-through' : 'text-gray-900 dark:text-white'
        }`}>
          {intl.formatMessage({ id: task.titleKey, defaultMessage: task.defaultTitle })}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {intl.formatMessage({ id: task.descriptionKey, defaultMessage: task.defaultDescription })}
        </p>
      </div>

      {/* XP Badge */}
      <div className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 flex-shrink-0 ${
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
