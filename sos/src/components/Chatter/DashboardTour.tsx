/**
 * DashboardTour - Interactive onboarding tour for new chatters
 *
 * Features:
 * - Step-by-step walkthrough with spotlight effect
 * - Animated tooltips with arrows
 * - Dark overlay on non-focused areas
 * - Progress indicator
 * - Mobile-responsive positioning
 * - LocalStorage persistence
 * - Confetti celebration on completion
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useChatterData } from '@/contexts/ChatterDataContext';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Wallet,
  Target,
  Share2,
  Users,
  PiggyBank,
  Trophy,
  Zap,
  Bell,
  PartyPopper,
  Sparkles,
} from 'lucide-react';
import { ConfettiCelebration } from '@/components/ui/SuccessFeedback';

// ============================================================================
// TYPES
// ============================================================================

interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlight?: boolean;
}

interface DashboardTourProps {
  /** Whether the chatter is new (no commissions or first login) */
  isNewChatter: boolean;
  /** Total commissions count to detect new chatters */
  totalCommissions?: number;
  /** Callback when tour is completed */
  onComplete?: () => void;
  /** Callback when tour is skipped */
  onSkip?: () => void;
  /** Force show the tour (for restart from settings) */
  forceShow?: boolean;
}

// ============================================================================
// TOUR STEPS CONFIGURATION
// ============================================================================

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetSelector: '', // No target, center modal
    title: 'Welcome to Your Dashboard!',
    description: 'Let us show you around and help you start earning money. This quick tour will guide you through all the features.',
    icon: <Rocket className="w-8 h-8 text-indigo-500" />,
    position: 'center',
    highlight: true,
  },
  {
    id: 'balance',
    targetSelector: '[data-tour="balance-card"]',
    title: 'Track Your Earnings',
    description: 'This is your piggy bank! Watch your earnings grow here. Once you reach $20, you can withdraw your money.',
    icon: <Wallet className="w-6 h-6 text-green-500" />,
    position: 'left',
  },
  {
    id: 'missions',
    targetSelector: '[data-tour="missions-card"]',
    title: 'Daily Missions',
    description: 'Complete daily missions to earn bonus rewards and build your streak. The longer your streak, the bigger your bonuses!',
    icon: <Target className="w-6 h-6 text-orange-500" />,
    position: 'bottom',
  },
  {
    id: 'affiliate-links',
    targetSelector: '[data-tour="affiliate-links"]',
    title: 'Your Affiliate Links',
    description: 'Share these links on social media. You earn {{callAmountRange}} for every client who books a call through your link!',
    icon: <Share2 className="w-6 h-6 text-blue-500" />,
    position: 'bottom',
  },
  {
    id: 'team',
    targetSelector: '[data-tour="team-card"]',
    title: 'Build Your Team',
    description: 'Recruit other chatters and earn passive income! Get {{n1Amount}} for every call your N1 recruits make, and {{n2Amount}} for N2.',
    icon: <Users className="w-6 h-6 text-indigo-500" />,
    position: 'top',
  },
  {
    id: 'piggy-bank',
    targetSelector: '[data-tour="piggy-bank"]',
    title: 'Your Piggy Bank',
    description: 'Your Telegram bonus and other bonuses are stored here. Once you reach the sales threshold, you can claim them!',
    icon: <PiggyBank className="w-6 h-6 text-pink-500" />,
    position: 'left',
  },
  {
    id: 'leaderboard',
    targetSelector: '[data-tour="leaderboard"]',
    title: 'Compete & Win',
    description: 'Check the leaderboard to see how you rank. Top 3 chatters each month win cash prizes ($200, $100, $50)!',
    icon: <Trophy className="w-6 h-6 text-yellow-500" />,
    position: 'bottom',
  },
  {
    id: 'quick-actions',
    targetSelector: '[data-tour="quick-actions"]',
    title: 'Quick Actions',
    description: 'Use this floating button for quick access to share your link, view earnings, invite team members, and more.',
    icon: <Zap className="w-6 h-6 text-amber-500" />,
    position: 'top',
  },
  {
    id: 'notifications',
    targetSelector: '[data-tour="notifications"]',
    title: 'Stay Updated',
    description: 'Check your notifications here. We\'ll alert you about new commissions, bonuses, and important updates.',
    icon: <Bell className="w-6 h-6 text-indigo-500" />,
    position: 'bottom',
  },
  {
    id: 'complete',
    targetSelector: '',
    title: 'You\'re All Set!',
    description: 'Start sharing your links and earn money today. Good luck, and welcome to the team!',
    icon: <PartyPopper className="w-8 h-8 text-indigo-500" />,
    position: 'center',
    highlight: true,
  },
];

// LocalStorage key for tour completion
const TOUR_STORAGE_KEY = 'chatter_dashboard_tour_completed';
const TOUR_VERSION = '1.0'; // Increment to reset tour for all users

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if tour has been completed
 */
const isTourCompleted = (): boolean => {
  try {
    const stored = localStorage.getItem(TOUR_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return data.version === TOUR_VERSION && data.completed === true;
    }
  } catch (e) {
    console.warn('Failed to read tour state from localStorage', e);
  }
  return false;
};

/**
 * Mark tour as completed
 */
const markTourCompleted = (): void => {
  try {
    localStorage.setItem(
      TOUR_STORAGE_KEY,
      JSON.stringify({
        version: TOUR_VERSION,
        completed: true,
        completedAt: new Date().toISOString(),
      })
    );
  } catch (e) {
    console.warn('Failed to save tour state to localStorage', e);
  }
};

/**
 * Reset tour state (for restarting)
 */
export const resetTourState = (): void => {
  try {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to reset tour state', e);
  }
};

/**
 * Calculate optimal tooltip position based on element and viewport
 */
const calculatePosition = (
  element: DOMRect | null,
  preferredPosition: TourStep['position'],
  tooltipWidth: number,
  tooltipHeight: number
): { top: number; left: number; arrowPosition: 'top' | 'bottom' | 'left' | 'right' | 'none' } => {
  // Center position for welcome/completion screens
  if (!element || preferredPosition === 'center') {
    return {
      top: Math.max(100, (window.innerHeight - tooltipHeight) / 2),
      left: Math.max(20, (window.innerWidth - tooltipWidth) / 2),
      arrowPosition: 'none',
    };
  }

  const padding = 16;
  const arrowSize = 12;
  let top = 0;
  let left = 0;
  let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';

  // Calculate center of target element
  const elementCenterX = element.left + element.width / 2;
  const elementCenterY = element.top + element.height / 2;

  // Try preferred position first, then fallback
  const positions = [preferredPosition, 'bottom', 'top', 'right', 'left'];

  for (const pos of positions) {
    let fits = false;

    switch (pos) {
      case 'bottom':
        top = element.bottom + arrowSize + padding;
        left = elementCenterX - tooltipWidth / 2;
        arrowPosition = 'top';
        fits = top + tooltipHeight < window.innerHeight - padding;
        break;
      case 'top':
        top = element.top - tooltipHeight - arrowSize - padding;
        left = elementCenterX - tooltipWidth / 2;
        arrowPosition = 'bottom';
        fits = top > padding;
        break;
      case 'right':
        top = elementCenterY - tooltipHeight / 2;
        left = element.right + arrowSize + padding;
        arrowPosition = 'left';
        fits = left + tooltipWidth < window.innerWidth - padding;
        break;
      case 'left':
        top = elementCenterY - tooltipHeight / 2;
        left = element.left - tooltipWidth - arrowSize - padding;
        arrowPosition = 'right';
        fits = left > padding;
        break;
    }

    if (fits) break;
  }

  // Clamp to viewport bounds
  left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
  top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

  return { top, left, arrowPosition };
};

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

interface TourTooltipProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  callAmountRange: string;
  n1Amount: string;
  n2Amount: string;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const TourTooltip: React.FC<TourTooltipProps> = ({
  step,
  currentStep,
  totalSteps,
  targetRect,
  callAmountRange,
  n1Amount,
  n2Amount,
  onNext,
  onPrev,
  onSkip,
  isFirstStep,
  isLastStep,
}) => {
  const intl = useIntl();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; arrowPosition: 'top' | 'bottom' | 'left' | 'right' | 'none' }>({ top: 0, left: 0, arrowPosition: 'none' });

  // Calculate position on mount and when target changes
  useEffect(() => {
    const calculateAndSetPosition = () => {
      const tooltipWidth = Math.min(360, window.innerWidth - 40);
      const tooltipHeight = step.position === 'center' ? 300 : 220;
      const pos = calculatePosition(targetRect, step.position, tooltipWidth, tooltipHeight);
      setPosition(pos);
    };

    calculateAndSetPosition();
    window.addEventListener('resize', calculateAndSetPosition);
    return () => window.removeEventListener('resize', calculateAndSetPosition);
  }, [targetRect, step.position]);

  const title = intl.formatMessage({ id: `chatter.tour.${step.id}.title`, defaultMessage: step.title });
  const description = intl.formatMessage({ id: `chatter.tour.${step.id}.description`, defaultMessage: step.description })
    .replace(/\{\{callAmountRange\}\}/g, callAmountRange)
    .replace(/\{\{n1Amount\}\}/g, n1Amount)
    .replace(/\{\{n2Amount\}\}/g, n2Amount);

  // Arrow styles based on position
  const arrowStyles: Record<string, string> = {
    top: 'absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-900 rotate-45 border-l border-t border-gray-200 dark:border-gray-700',
    bottom: 'absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-900 rotate-45 border-r border-b border-gray-200 dark:border-gray-700',
    left: 'absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-gray-900 rotate-45 border-l border-b border-gray-200 dark:border-gray-700',
    right: 'absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-gray-900 rotate-45 border-r border-t border-gray-200 dark:border-gray-700',
    none: 'hidden',
  };

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[10002] w-[90vw] max-w-[360px] animate-fade-in transition-all duration-300"
      style={{ top: position.top, left: position.left }}
    >
      {/* Tooltip Card */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border dark:border-gray-700 overflow-hidden">
        {/* Arrow */}
        <div className={arrowStyles[position.arrowPosition]} />

        {/* Header with gradient */}
        <div className={`p-4 ${step.highlight ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${step.highlight ? 'bg-white/20' : 'bg-white dark:bg-gray-800 shadow-md'}`}>
              {step.icon}
            </div>
            <div className="flex-1">
              <h3 className={`font-bold text-lg ${step.highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {title}
              </h3>
              {/* Progress indicator */}
              <div className="flex items-center gap-1.5 mt-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? `w-4 ${step.highlight ? 'bg-white' : 'bg-indigo-500'}`
                        : i < currentStep
                        ? `w-1.5 ${step.highlight ? 'bg-white/60' : 'bg-indigo-300 dark:bg-indigo-700'}`
                        : `w-1.5 ${step.highlight ? 'bg-white/30' : 'bg-gray-300 dark:bg-gray-600'}`
                    }`}
                  />
                ))}
              </div>
            </div>
            {/* Skip button */}
            <button
              onClick={onSkip}
              className={`p-2 rounded-lg transition-colors ${
                step.highlight
                  ? 'hover:bg-white/20 text-white/80 hover:text-white'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              aria-label={intl.formatMessage({ id: 'chatter.tour.skipTour', defaultMessage: 'Skip tour' })}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {description}
          </p>

          {/* Sparkles for highlight steps */}
          {step.highlight && (
            <div className="flex justify-center gap-1 mt-3">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" style={{ animationDelay: '150ms' }} />
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        <div className="px-4 pb-4 flex items-center justify-between gap-3">
          {/* Step counter */}
          <span className="text-xs dark:text-gray-500">
            {currentStep + 1} / {totalSteps}
          </span>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-3 py-2 text-sm dark:text-gray-300 font-medium hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {intl.formatMessage({ id: 'chatter.tour.previous', defaultMessage: 'Previous' })}
                </span>
              </button>
            )}
            <button
              onClick={onNext}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              <span>
                {isLastStep
                  ? intl.formatMessage({ id: 'chatter.tour.getStarted', defaultMessage: 'Get Started!' })
                  : intl.formatMessage({ id: 'chatter.tour.next', defaultMessage: 'Next' })
                }
              </span>
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SPOTLIGHT OVERLAY COMPONENT
// ============================================================================

interface SpotlightOverlayProps {
  targetRect: DOMRect | null;
  isVisible: boolean;
}

const SpotlightOverlay: React.FC<SpotlightOverlayProps> = ({ targetRect, isVisible }) => {
  if (!isVisible) return null;

  // For center/welcome steps, just show dark overlay
  if (!targetRect) {
    return (
      <div
        className="fixed inset-0 z-[10000] bg-black/60 animate-fade-in"
      />
    );
  }

  // Spotlight padding
  const padding = 8;
  const borderRadius = 16;

  return (
    <div
      className="fixed inset-0 z-[10000] pointer-events-none animate-fade-in"
    >
      {/* Dark overlay with spotlight cutout using SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'auto' }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - padding}
              y={targetRect.top - padding}
              width={targetRect.width + padding * 2}
              height={targetRect.height + padding * 2}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Animated border around spotlight */}
      <div
        className="absolute border-2 rounded-2xl animate-spotlight-pulse"
        style={{
          top: targetRect.top - padding,
          left: targetRect.left - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
        }}
      />
      <style>{`
        @keyframes spotlightPulse {
          0%, 100% { opacity: 0.5; box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          50% { opacity: 1; box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
        }
        .animate-spotlight-pulse { animation: spotlightPulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DashboardTour: React.FC<DashboardTourProps> = ({
  isNewChatter,
  totalCommissions = 0,
  onComplete,
  onSkip,
  forceShow = false,
}) => {
  const intl = useIntl();
  const { dashboardData } = useChatterData();
  const configData = dashboardData?.config;

  // Dynamic commission amounts from config (cents → dollars)
  const { callAmountRange, n1Amount, n2Amount } = useMemo(() => {
    const expatAmt = (configData?.commissionClientCallAmountExpat ?? 300) / 100;
    const lawyerAmt = (configData?.commissionClientCallAmountLawyer ?? 500) / 100;
    const minAmt = Math.min(expatAmt, lawyerAmt);
    const maxAmt = Math.max(expatAmt, lawyerAmt);
    const range = minAmt === maxAmt ? `$${minAmt}` : `$${minAmt}-${maxAmt}`;
    const n1 = `$${((configData?.commissionN1CallAmount ?? 100) / 100).toFixed(2).replace(/\.00$/, '')}`;
    const n2 = `$${((configData?.commissionN2CallAmount ?? 50) / 100).toFixed(2)}`;
    return { callAmountRange: range, n1Amount: n1, n2Amount: n2 };
  }, [configData]);

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  // Determine if tour should show
  useEffect(() => {
    if (forceShow) {
      setIsActive(true);
      setCurrentStep(0);
      return;
    }

    // Check if already completed
    if (isTourCompleted()) {
      return;
    }

    // Show for new chatters (no commissions or first login indicator)
    if (isNewChatter || totalCommissions === 0) {
      // Small delay to let dashboard render first
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [forceShow, isNewChatter, totalCommissions]);

  // Find and highlight target element
  useEffect(() => {
    if (!isActive || !step.targetSelector) {
      setTargetRect(null);
      return;
    }

    const findTarget = () => {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);

        // Scroll element into view if needed
        const isInViewport =
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth;

        if (!isInViewport) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Recalculate after scroll
          setTimeout(() => {
            setTargetRect(element.getBoundingClientRect());
          }, 500);
        }
      } else {
        setTargetRect(null);
      }
    };

    findTarget();

    // Recalculate on scroll/resize
    const handleUpdate = () => {
      if (step.targetSelector) {
        const element = document.querySelector(step.targetSelector);
        if (element) {
          setTargetRect(element.getBoundingClientRect());
        }
      }
    };

    window.addEventListener('scroll', handleUpdate, { capture: true, passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isActive, currentStep, step.targetSelector]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (isLastStep) {
      // Complete the tour
      setShowConfetti(true);
      markTourCompleted();

      setTimeout(() => {
        setIsActive(false);
        setShowConfetti(false);
        onComplete?.();
      }, 3000);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete]);

  // Handle previous step
  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  // Handle skip
  const handleSkip = useCallback(() => {
    markTourCompleted();
    setIsActive(false);
    onSkip?.();
  }, [onSkip]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'Escape':
          handleSkip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleNext, handlePrev, handleSkip]);

  // Don't render if not active
  if (!isActive && !showConfetti) return null;

  // Render in portal
  return createPortal(
    <>
      <>
        {isActive && (
          <>
            {/* Spotlight overlay */}
            <SpotlightOverlay
              targetRect={targetRect}
              isVisible={isActive}
            />

            {/* Tooltip */}
            <TourTooltip
              key={step.id}
              step={step}
              currentStep={currentStep}
              totalSteps={TOUR_STEPS.length}
              targetRect={targetRect}
              callAmountRange={callAmountRange}
              n1Amount={n1Amount}
              n2Amount={n2Amount}
              onNext={handleNext}
              onPrev={handlePrev}
              onSkip={handleSkip}
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
            />
          </>
        )}
      </>

      {/* Confetti celebration */}
      <ConfettiCelebration show={showConfetti} pieces={300} duration={3000} />
    </>,
    document.body
  );
};

export default DashboardTour;

// Named export for the reset function
export { resetTourState as resetDashboardTour };
