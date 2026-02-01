/**
 * Animation utilities for the dashboard
 *
 * These utilities provide consistent animation classes and variants
 * for use with Tailwind CSS and Framer Motion.
 */

// Stagger delay calculation (in ms)
export const getStaggerDelay = (index: number, baseDelay = 50): number => {
  return index * baseDelay;
};

// CSS class for staggered fade-in animation
export const getStaggeredFadeInClass = (index: number, baseDelay = 50): string => {
  const delay = getStaggerDelay(index, baseDelay);
  return `animate-fade-in-up opacity-0 [animation-fill-mode:forwards]`;
};

// Style object for staggered animation delay
export const getStaggeredStyle = (index: number, baseDelay = 50): React.CSSProperties => ({
  animationDelay: `${getStaggerDelay(index, baseDelay)}ms`,
});

// Framer Motion variants for staggered children
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 300,
    },
  },
};

// Card hover animation classes
export const cardHoverClasses = `
  transition-all duration-300 ease-out
  hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5
  hover:-translate-y-1
  active:scale-[0.98]
`;

// Progress bar animation styles
export const progressBarClasses = `
  transition-all duration-700 ease-out
`;

// Pulse animation for milestones
export const milestonePulseClasses = `
  animate-pulse-subtle
`;

// Number change animation
export const numberChangeClasses = `
  transition-all duration-300
`;

// Success celebration animation
export const successAnimationClasses = `
  animate-bounce-in
`;

// Shimmer effect for loading states (Tailwind class)
export const shimmerClasses = `
  animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent
`;

// Toast animation variants
export const toastVariants = {
  initial: {
    opacity: 0,
    y: 50,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 400,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

// Confetti trigger helper
export interface ConfettiConfig {
  particleCount: number;
  spread: number;
  origin: { x: number; y: number };
  colors: string[];
}

export const defaultConfettiConfig: ConfettiConfig = {
  particleCount: 100,
  spread: 70,
  origin: { x: 0.5, y: 0.6 },
  colors: ['#ef4444', '#f97316', '#22c55e', '#3b82f6', '#a855f7', '#eab308'],
};

// Keyframe animation definitions (for inline styles)
export const keyframes = {
  fadeInUp: `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
  shimmer: `
    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
  `,
  bounceIn: `
    @keyframes bounceIn {
      0% {
        opacity: 0;
        transform: scale(0.3);
      }
      50% {
        transform: scale(1.05);
      }
      70% {
        transform: scale(0.9);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
  pulseSubtle: `
    @keyframes pulseSubtle {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }
  `,
  countUp: `
    @keyframes countUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `,
};

// Helper to apply entrance animation
export const applyEntranceAnimation = (
  element: HTMLElement,
  delay = 0,
  duration = 500
) => {
  element.style.opacity = '0';
  element.style.transform = 'translateY(20px)';

  setTimeout(() => {
    element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
    element.style.opacity = '1';
    element.style.transform = 'translateY(0)';
  }, delay);
};

// CSS custom properties for animations
export const animationCSSVariables = `
  :root {
    --animation-duration-fast: 150ms;
    --animation-duration-normal: 300ms;
    --animation-duration-slow: 500ms;
    --animation-easing-default: cubic-bezier(0.4, 0, 0.2, 1);
    --animation-easing-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
    --animation-easing-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);
  }
`;
