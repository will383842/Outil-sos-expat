/**
 * SuccessFeedback - Success celebration components
 *
 * Features:
 * - Confetti burst for achievements
 * - Sparkle effect for earnings
 * - Toast notifications for milestones
 * - Animated checkmarks
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { Check, Award, DollarSign, Star, Sparkles, X } from 'lucide-react';

// ============================================================================
// CONFETTI CELEBRATION
// ============================================================================

interface ConfettiCelebrationProps {
  show: boolean;
  duration?: number;
  pieces?: number;
  onComplete?: () => void;
}

export const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({
  show,
  duration = 4000,
  pieces = 200,
  onComplete,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 400,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  useEffect(() => {
    if (show) {
      setIsActive(true);
      const timer = setTimeout(() => {
        setIsActive(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

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

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        numberOfPieces={pieces}
        recycle={false}
        gravity={0.25}
        colors={['#ef4444', '#f97316', '#f43f5e', '#22c55e', '#3b82f6', '#a855f7', '#eab308']}
      />
    </div>
  );
};

// ============================================================================
// SPARKLE EFFECT
// ============================================================================

interface SparkleProps {
  show: boolean;
  className?: string;
}

export const SparkleEffect: React.FC<SparkleProps> = ({ show, className = '' }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`absolute inset-0 pointer-events-none ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{
                opacity: 1,
                scale: 0,
                x: '50%',
                y: '50%',
              }}
              animate={{
                opacity: [1, 1, 0],
                scale: [0, 1, 0.5],
                x: `${50 + (Math.random() - 0.5) * 100}%`,
                y: `${50 + (Math.random() - 0.5) * 100}%`,
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.1,
                ease: 'easeOut',
              }}
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// TOAST NOTIFICATION
// ============================================================================

type ToastType = 'success' | 'achievement' | 'earning' | 'milestone';

interface ToastProps {
  show: boolean;
  type?: ToastType;
  title: string;
  message?: string;
  amount?: string;
  duration?: number;
  onClose?: () => void;
}

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <Check className="w-5 h-5 text-white" />,
  achievement: <Award className="w-5 h-5 text-white" />,
  earning: <DollarSign className="w-5 h-5 text-white" />,
  milestone: <Star className="w-5 h-5 text-white" />,
};

const toastGradients: Record<ToastType, string> = {
  success: 'from-green-500 to-emerald-600',
  achievement: 'from-purple-500 to-pink-600',
  earning: 'from-green-500 to-teal-600',
  milestone: 'from-yellow-500 to-orange-600',
};

export const Toast: React.FC<ToastProps> = ({
  show,
  type = 'success',
  title,
  message,
  amount,
  duration = 4000,
  onClose,
}) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-4 right-4 z-[101] max-w-sm"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 400 }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              {/* Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${toastGradients[type]} flex items-center justify-center shadow-lg`}>
                {toastIcons[type]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-sm">
                  {title}
                </p>
                {message && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {message}
                  </p>
                )}
                {amount && (
                  <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                    {amount}
                  </p>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Progress bar */}
            <motion.div
              className={`h-1 bg-gradient-to-r ${toastGradients[type]}`}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// ANIMATED CHECKMARK
// ============================================================================

interface AnimatedCheckProps {
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const AnimatedCheck: React.FC<AnimatedCheckProps> = ({
  show,
  size = 'md',
  color = 'text-green-500',
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ type: 'spring', damping: 15, stiffness: 400 }}
        >
          <Check className={`${sizes[size]} ${color}`} strokeWidth={3} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// SUCCESS FEEDBACK MANAGER (Hook)
// ============================================================================

interface FeedbackState {
  confetti: boolean;
  sparkle: boolean;
  toast: {
    show: boolean;
    type: ToastType;
    title: string;
    message?: string;
    amount?: string;
  };
}

export const useSuccessFeedback = () => {
  const [state, setState] = useState<FeedbackState>({
    confetti: false,
    sparkle: false,
    toast: {
      show: false,
      type: 'success',
      title: '',
    },
  });

  const showConfetti = useCallback((duration = 4000) => {
    setState((prev) => ({ ...prev, confetti: true }));
    setTimeout(() => {
      setState((prev) => ({ ...prev, confetti: false }));
    }, duration);
  }, []);

  const showSparkle = useCallback((duration = 1000) => {
    setState((prev) => ({ ...prev, sparkle: true }));
    setTimeout(() => {
      setState((prev) => ({ ...prev, sparkle: false }));
    }, duration);
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, amount?: string) => {
      setState((prev) => ({
        ...prev,
        toast: { show: true, type, title, message, amount },
      }));
    },
    []
  );

  const hideToast = useCallback(() => {
    setState((prev) => ({
      ...prev,
      toast: { ...prev.toast, show: false },
    }));
  }, []);

  const celebrateCommission = useCallback((amount: string) => {
    showSparkle();
    showToast('earning', 'Commission Earned!', 'Great job!', amount);
  }, [showSparkle, showToast]);

  const celebrateAchievement = useCallback((title: string, message: string) => {
    showConfetti();
    showToast('achievement', title, message);
  }, [showConfetti, showToast]);

  const celebrateMilestone = useCallback((title: string, message: string) => {
    showConfetti(6000);
    showToast('milestone', title, message);
  }, [showConfetti, showToast]);

  return {
    state,
    showConfetti,
    showSparkle,
    showToast,
    hideToast,
    celebrateCommission,
    celebrateAchievement,
    celebrateMilestone,
  };
};

// ============================================================================
// EXPORT COMBINED COMPONENT
// ============================================================================

interface SuccessFeedbackProps {
  confetti?: boolean;
  sparkle?: boolean;
  toast?: {
    show: boolean;
    type?: ToastType;
    title: string;
    message?: string;
    amount?: string;
    onClose?: () => void;
  };
}

const SuccessFeedback: React.FC<SuccessFeedbackProps> = ({
  confetti = false,
  sparkle = false,
  toast,
}) => {
  return (
    <>
      <ConfettiCelebration show={confetti} />
      <SparkleEffect show={sparkle} />
      {toast && (
        <Toast
          show={toast.show}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          amount={toast.amount}
          onClose={toast.onClose}
        />
      )}
    </>
  );
};

export default SuccessFeedback;
