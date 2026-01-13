/**
 * Notification Components for AI Assistant
 *
 * Provides a complete notification system with:
 * - NotificationBadge: Count display with pulse animation
 * - NotificationDot: Small indicator dot
 * - UrgentIndicator: Warning triangle with glow effect
 * - InlineAlert: Dismissible alerts with action buttons
 * - Toast: Custom styled wrapper for react-hot-toast
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast, { Toaster, Toast as HotToast } from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '../../../../../utils/cn';

// ============================================================================
// TYPES
// ============================================================================

type ColorVariant = 'red' | 'amber' | 'blue' | 'green' | 'gray';
type AlertVariant = 'success' | 'warning' | 'error' | 'info';
type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface NotificationBadgeProps {
  /** The count to display */
  count: number;
  /** Maximum value before showing "+" (default: 99) */
  maxCount?: number;
  /** Show only a dot instead of count */
  dotOnly?: boolean;
  /** Color variant */
  variant?: ColorVariant;
  /** Show pulse animation for new notifications */
  pulse?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

interface NotificationDotProps {
  /** Color variant */
  variant?: ColorVariant;
  /** Show pulse animation */
  pulse?: boolean;
  /** Position relative to parent */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md';
}

interface UrgentIndicatorProps {
  /** Tooltip text on hover */
  tooltip?: string;
  /** Color (default: red) */
  color?: 'red' | 'amber' | 'orange';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Show glow effect */
  glow?: boolean;
}

interface InlineAlertProps {
  /** Alert variant */
  variant: AlertVariant;
  /** Alert title */
  title?: string;
  /** Alert message */
  message: string;
  /** Allow dismissing the alert */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Action button configuration */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
  /** Icon override */
  icon?: React.ReactNode;
}

interface ToastConfig {
  /** Toast type */
  type: ToastType;
  /** Toast message */
  message: string;
  /** Toast title (optional) */
  title?: string;
  /** Duration in milliseconds (default: 4000) */
  duration?: number;
  /** Show progress bar */
  showProgress?: boolean;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLOR_CLASSES: Record<ColorVariant, { bg: string; text: string; ring: string }> = {
  red: {
    bg: 'bg-red-500',
    text: 'text-white',
    ring: 'ring-red-300',
  },
  amber: {
    bg: 'bg-amber-500',
    text: 'text-white',
    ring: 'ring-amber-300',
  },
  blue: {
    bg: 'bg-blue-500',
    text: 'text-white',
    ring: 'ring-blue-300',
  },
  green: {
    bg: 'bg-green-500',
    text: 'text-white',
    ring: 'ring-green-300',
  },
  gray: {
    bg: 'bg-gray-500',
    text: 'text-white',
    ring: 'ring-gray-300',
  },
};

const ALERT_STYLES: Record<AlertVariant, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: <XCircle className="w-5 h-5 text-red-500" />,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: <Info className="w-5 h-5 text-blue-500" />,
  },
};

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
  loading: <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />,
};

// ============================================================================
// NOTIFICATION BADGE
// ============================================================================

/**
 * NotificationBadge - Displays notification count with optional animations
 *
 * @example
 * <NotificationBadge count={5} variant="red" pulse />
 * <NotificationBadge count={150} maxCount={99} /> // Shows "99+"
 * <NotificationBadge count={3} dotOnly /> // Shows just a dot
 */
export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  dotOnly = false,
  variant = 'red',
  pulse = false,
  className,
  size = 'md',
}) => {
  // Don't render if count is 0 or negative
  if (count <= 0) return null;

  const colors = COLOR_CLASSES[variant];

  const sizeClasses = {
    sm: dotOnly ? 'w-2 h-2' : 'min-w-[16px] h-4 text-[10px] px-1',
    md: dotOnly ? 'w-2.5 h-2.5' : 'min-w-[20px] h-5 text-xs px-1.5',
    lg: dotOnly ? 'w-3 h-3' : 'min-w-[24px] h-6 text-sm px-2',
  };

  const displayValue = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <span
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-full font-bold',
        colors.bg,
        colors.text,
        sizeClasses[size],
        // Pulse animation
        pulse && 'animate-pulse',
        // Ring effect for emphasis
        pulse && `ring-2 ${colors.ring}`,
        className
      )}
      role="status"
      aria-label={`${count} notifications`}
    >
      {!dotOnly && displayValue}
    </span>
  );
};

// ============================================================================
// NOTIFICATION DOT
// ============================================================================

/**
 * NotificationDot - Small indicator dot positioned relative to parent
 *
 * @example
 * <div className="relative">
 *   <Icon />
 *   <NotificationDot position="top-right" pulse />
 * </div>
 */
export const NotificationDot: React.FC<NotificationDotProps> = ({
  variant = 'red',
  pulse = false,
  position = 'top-right',
  className,
  size = 'sm',
}) => {
  const colors = COLOR_CLASSES[variant];

  const sizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  const positionClasses = {
    'top-right': '-top-0.5 -right-0.5',
    'top-left': '-top-0.5 -left-0.5',
    'bottom-right': '-bottom-0.5 -right-0.5',
    'bottom-left': '-bottom-0.5 -left-0.5',
  };

  return (
    <span
      className={cn(
        'absolute rounded-full',
        colors.bg,
        sizeClasses[size],
        positionClasses[position],
        // Pulse animation with ring
        pulse && 'animate-ping',
        className
      )}
      aria-hidden="true"
    >
      {/* Inner static dot for ping effect */}
      {pulse && (
        <span
          className={cn(
            'absolute inset-0 rounded-full',
            colors.bg
          )}
        />
      )}
    </span>
  );
};

/**
 * NotificationDotWrapper - Wrapper component for proper ping animation
 * Use this when you need the ping animation effect
 */
export const NotificationDotWrapper: React.FC<NotificationDotProps & { children?: React.ReactNode }> = ({
  variant = 'red',
  pulse = false,
  position = 'top-right',
  className,
  size = 'sm',
  children,
}) => {
  const colors = COLOR_CLASSES[variant];

  const sizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  };

  const positionClasses = {
    'top-right': '-top-0.5 -right-0.5',
    'top-left': '-top-0.5 -left-0.5',
    'bottom-right': '-bottom-0.5 -right-0.5',
    'bottom-left': '-bottom-0.5 -left-0.5',
  };

  return (
    <span className={cn('absolute', positionClasses[position], className)}>
      {/* Ping animation layer */}
      {pulse && (
        <span
          className={cn(
            'absolute rounded-full opacity-75 animate-ping',
            colors.bg,
            sizeClasses[size]
          )}
        />
      )}
      {/* Static dot */}
      <span
        className={cn(
          'relative block rounded-full',
          colors.bg,
          sizeClasses[size]
        )}
      />
      {children}
    </span>
  );
};

// ============================================================================
// URGENT INDICATOR
// ============================================================================

/**
 * UrgentIndicator - Warning triangle with continuous pulse and glow effect
 *
 * @example
 * <UrgentIndicator tooltip="Urgent request pending" glow />
 */
export const UrgentIndicator: React.FC<UrgentIndicatorProps> = ({
  tooltip,
  color = 'red',
  size = 'md',
  className,
  glow = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const colorClasses = {
    red: {
      icon: 'text-red-500',
      glow: 'shadow-red-500/50',
      bg: 'bg-red-50',
    },
    amber: {
      icon: 'text-amber-500',
      glow: 'shadow-amber-500/50',
      bg: 'bg-amber-50',
    },
    orange: {
      icon: 'text-orange-500',
      glow: 'shadow-orange-500/50',
      bg: 'bg-orange-50',
    },
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const containerSizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const colors = colorClasses[color];

  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Animated container */}
      <div
        className={cn(
          'rounded-full animate-pulse',
          containerSizeClasses[size],
          colors.bg,
          glow && `shadow-lg ${colors.glow}`
        )}
      >
        <AlertTriangle
          className={cn(
            sizeClasses[size],
            colors.icon,
            'animate-pulse'
          )}
        />
      </div>

      {/* Glow ring effect */}
      {glow && (
        <div
          className={cn(
            'absolute inset-0 rounded-full animate-ping opacity-30',
            colors.bg
          )}
          style={{ animationDuration: '1.5s' }}
        />
      )}

      {/* Tooltip */}
      {tooltip && showTooltip && (
        <div
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
            'px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md',
            'whitespace-nowrap z-50',
            'animate-fade-in'
          )}
          role="tooltip"
        >
          {tooltip}
          {/* Tooltip arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px"
            style={{
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid rgb(17, 24, 39)',
            }}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// INLINE ALERT
// ============================================================================

/**
 * InlineAlert - Alert component with icon, message, dismiss, and action button
 *
 * @example
 * <InlineAlert
 *   variant="warning"
 *   title="Attention"
 *   message="Your quota is running low"
 *   dismissible
 *   action={{ label: 'Upgrade', onClick: handleUpgrade }}
 * />
 */
export const InlineAlert: React.FC<InlineAlertProps> = ({
  variant,
  title,
  message,
  dismissible = false,
  onDismiss,
  action,
  className,
  icon,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 200);
  }, [onDismiss]);

  if (!isVisible) return null;

  const styles = ALERT_STYLES[variant];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border transition-all duration-200',
        styles.bg,
        styles.border,
        isExiting && 'opacity-0 scale-95',
        className
      )}
      role="alert"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {icon || styles.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={cn('font-semibold mb-0.5', styles.text)}>
            {title}
          </h4>
        )}
        <p className={cn('text-sm', styles.text, !title && 'font-medium')}>
          {message}
        </p>

        {/* Action button */}
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              'mt-2 text-sm font-semibold underline underline-offset-2',
              'hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded',
              variant === 'success' && 'text-green-700 focus:ring-green-500',
              variant === 'warning' && 'text-amber-700 focus:ring-amber-500',
              variant === 'error' && 'text-red-700 focus:ring-red-500',
              variant === 'info' && 'text-blue-700 focus:ring-blue-500'
            )}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className={cn(
            'flex-shrink-0 p-1 rounded-lg transition-colors',
            'hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2',
            variant === 'success' && 'text-green-500 focus:ring-green-500',
            variant === 'warning' && 'text-amber-500 focus:ring-amber-500',
            variant === 'error' && 'text-red-500 focus:ring-red-500',
            variant === 'info' && 'text-blue-500 focus:ring-blue-500'
          )}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// ============================================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================================

/**
 * Custom Toast Component for react-hot-toast
 */
const CustomToast: React.FC<{
  t: HotToast;
  config: Omit<ToastConfig, 'duration'>;
}> = ({ t, config }) => {
  const [progress, setProgress] = useState(100);
  const duration = 4000; // Default duration

  useEffect(() => {
    if (!config.showProgress || !t.visible) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [t.visible, config.showProgress]);

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
    loading: 'bg-indigo-50 border-indigo-200',
  };

  const progressColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    loading: 'bg-indigo-500',
  };

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-amber-800',
    info: 'text-blue-800',
    loading: 'text-indigo-800',
  };

  return (
    <div
      className={cn(
        'max-w-sm w-full shadow-lg rounded-xl border overflow-hidden',
        'transform transition-all duration-300',
        t.visible ? 'animate-enter' : 'animate-leave',
        bgColors[config.type]
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            {TOAST_ICONS[config.type]}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {config.title && (
              <h4 className={cn('font-semibold text-sm', textColors[config.type])}>
                {config.title}
              </h4>
            )}
            <p className={cn('text-sm', textColors[config.type], config.title && 'mt-0.5')}>
              {config.message}
            </p>

            {/* Action button */}
            {config.action && (
              <button
                onClick={() => {
                  config.action?.onClick();
                  toast.dismiss(t.id);
                }}
                className={cn(
                  'mt-2 text-sm font-semibold underline underline-offset-2',
                  'hover:no-underline',
                  textColors[config.type]
                )}
              >
                {config.action.label}
              </button>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => toast.dismiss(t.id)}
            className={cn(
              'flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-black/5',
              textColors[config.type]
            )}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {config.showProgress && config.type !== 'loading' && (
        <div className="h-1 bg-black/5">
          <div
            className={cn('h-full transition-all duration-100', progressColors[config.type])}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Toast Notification Functions
 * Wrapper around react-hot-toast with custom styling
 */
export const showToast = {
  /**
   * Show a success toast
   */
  success: (message: string, options?: Partial<Omit<ToastConfig, 'type' | 'message'>>) => {
    return toast.custom(
      (t) => <CustomToast t={t} config={{ type: 'success', message, ...options }} />,
      { duration: options?.duration || 4000 }
    );
  },

  /**
   * Show an error toast
   */
  error: (message: string, options?: Partial<Omit<ToastConfig, 'type' | 'message'>>) => {
    return toast.custom(
      (t) => <CustomToast t={t} config={{ type: 'error', message, ...options }} />,
      { duration: options?.duration || 5000 }
    );
  },

  /**
   * Show a warning toast
   */
  warning: (message: string, options?: Partial<Omit<ToastConfig, 'type' | 'message'>>) => {
    return toast.custom(
      (t) => <CustomToast t={t} config={{ type: 'warning', message, ...options }} />,
      { duration: options?.duration || 4500 }
    );
  },

  /**
   * Show an info toast
   */
  info: (message: string, options?: Partial<Omit<ToastConfig, 'type' | 'message'>>) => {
    return toast.custom(
      (t) => <CustomToast t={t} config={{ type: 'info', message, ...options }} />,
      { duration: options?.duration || 4000 }
    );
  },

  /**
   * Show a loading toast (returns ID for later dismissal)
   */
  loading: (message: string, options?: Partial<Omit<ToastConfig, 'type' | 'message'>>) => {
    return toast.custom(
      (t) => <CustomToast t={t} config={{ type: 'loading', message, ...options }} />,
      { duration: Infinity }
    );
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId: string) => {
    toast.dismiss(toastId);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    toast.dismiss();
  },

  /**
   * Show a promise-based toast
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: Error) => string);
    },
    options?: Partial<Omit<ToastConfig, 'type' | 'message'>>
  ) => {
    const toastId = showToast.loading(messages.loading);

    promise
      .then((data) => {
        toast.dismiss(toastId);
        const successMessage = typeof messages.success === 'function'
          ? messages.success(data)
          : messages.success;
        showToast.success(successMessage, options);
        return data;
      })
      .catch((err) => {
        toast.dismiss(toastId);
        const errorMessage = typeof messages.error === 'function'
          ? messages.error(err)
          : messages.error;
        showToast.error(errorMessage, options);
      });

    return promise;
  },
};

/**
 * ToastProvider - Wrap your app with this to enable toast notifications
 *
 * @example
 * // In your App.tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 *
 * // Then anywhere in your app:
 * showToast.success('Operation completed!');
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        gutter={12}
        containerStyle={{
          top: 16,
          right: 16,
        }}
        toastOptions={{
          duration: 4000,
        }}
      />
    </>
  );
};

// ============================================================================
// COMPOUND COMPONENTS & UTILITIES
// ============================================================================

/**
 * NotificationBadgeWithDot - Badge with an additional pulsing dot
 * Useful for showing "new" state alongside count
 */
export const NotificationBadgeWithDot: React.FC<NotificationBadgeProps & { showDot?: boolean }> = ({
  showDot = false,
  ...props
}) => {
  return (
    <span className="relative inline-flex">
      <NotificationBadge {...props} />
      {showDot && (
        <NotificationDotWrapper
          position="top-right"
          pulse
          size="xs"
          variant="green"
        />
      )}
    </span>
  );
};

/**
 * AnimatedBadge - Badge that animates in when count changes
 */
export const AnimatedBadge: React.FC<NotificationBadgeProps> = (props) => {
  const [animate, setAnimate] = useState(false);
  const [prevCount, setPrevCount] = useState(props.count);

  useEffect(() => {
    if (props.count !== prevCount) {
      setAnimate(true);
      setPrevCount(props.count);
      const timer = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(timer);
    }
  }, [props.count, prevCount]);

  return (
    <span
      className={cn(
        'inline-flex transition-transform duration-300',
        animate && 'scale-125'
      )}
    >
      <NotificationBadge {...props} pulse={animate || props.pulse} />
    </span>
  );
};

// ============================================================================
// STYLES (Add to your global CSS or Tailwind config)
// ============================================================================

/**
 * Add these to your tailwind.config.js for animations:
 *
 * theme: {
 *   extend: {
 *     keyframes: {
 *       'fade-in': {
 *         '0%': { opacity: '0', transform: 'translateY(4px)' },
 *         '100%': { opacity: '1', transform: 'translateY(0)' },
 *       },
 *       enter: {
 *         '0%': { opacity: '0', transform: 'scale(0.95) translateY(-10px)' },
 *         '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
 *       },
 *       leave: {
 *         '0%': { opacity: '1', transform: 'scale(1) translateY(0)' },
 *         '100%': { opacity: '0', transform: 'scale(0.95) translateY(-10px)' },
 *       },
 *     },
 *     animation: {
 *       'fade-in': 'fade-in 0.2s ease-out',
 *       'enter': 'enter 0.3s ease-out',
 *       'leave': 'leave 0.2s ease-in forwards',
 *     },
 *   },
 * },
 */

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  NotificationBadge,
  NotificationDot,
  NotificationDotWrapper,
  UrgentIndicator,
  InlineAlert,
  ToastProvider,
  showToast,
  NotificationBadgeWithDot,
  AnimatedBadge,
};
