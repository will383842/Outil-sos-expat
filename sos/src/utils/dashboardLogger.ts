/**
 * Dashboard Logger - Centralized logging utility for debugging
 * Logs are always visible in development, and can be enabled in production via localStorage
 *
 * To enable in production: localStorage.setItem('debug_dashboard', 'true')
 */

const LOG_PREFIX = '[Dashboard]';

// Check if logging is enabled
const isLoggingEnabled = (): boolean => {
  // Always log in development
  if (import.meta.env.DEV) return true;

  // Check localStorage for production debugging
  try {
    return localStorage.getItem('debug_dashboard') === 'true';
  } catch {
    return false;
  }
};

// Color coding for different log types
const COLORS = {
  nav: '#3B82F6',      // Blue - Navigation
  tab: '#8B5CF6',      // Purple - Tab changes
  click: '#10B981',    // Green - Button clicks
  api: '#F59E0B',      // Amber - API calls
  stripe: '#6366F1',   // Indigo - Stripe
  paypal: '#0070BA',   // PayPal blue
  kyc: '#059669',      // Emerald - KYC/Onboarding
  auth: '#EF4444',     // Red - Auth
  render: '#6B7280',   // Gray - Render cycles
  error: '#DC2626',    // Red - Errors
  warn: '#F59E0B',     // Amber - Warnings
  state: '#EC4899',    // Pink - State changes
};

type LogType = keyof typeof COLORS;

// Format timestamp
const getTimestamp = (): string => {
  const now = new Date();
  return `${now.toLocaleTimeString()}.${now.getMilliseconds().toString().padStart(3, '0')}`;
};

// Main logging function
const log = (type: LogType, message: string, data?: unknown): void => {
  if (!isLoggingEnabled()) return;

  const color = COLORS[type];
  const timestamp = getTimestamp();

  const style = `color: ${color}; font-weight: bold;`;
  const styleReset = 'color: inherit; font-weight: normal;';

  if (data !== undefined) {
    console.log(
      `%c${LOG_PREFIX}%c [${timestamp}] %c[${type.toUpperCase()}]%c ${message}`,
      'color: #EF4444; font-weight: bold;',
      styleReset,
      style,
      styleReset,
      data
    );
  } else {
    console.log(
      `%c${LOG_PREFIX}%c [${timestamp}] %c[${type.toUpperCase()}]%c ${message}`,
      'color: #EF4444; font-weight: bold;',
      styleReset,
      style,
      styleReset
    );
  }
};

// Specific loggers
export const dashboardLog = {
  // Navigation
  nav: (message: string, data?: unknown) => log('nav', message, data),

  // Tab switching
  tab: (message: string, data?: unknown) => log('tab', message, data),

  // Button clicks
  click: (message: string, data?: unknown) => log('click', message, data),

  // API calls
  api: (message: string, data?: unknown) => log('api', message, data),

  // Stripe operations
  stripe: (message: string, data?: unknown) => log('stripe', message, data),

  // PayPal operations
  paypal: (message: string, data?: unknown) => log('paypal', message, data),

  // KYC/Onboarding operations
  kyc: (message: string, data?: unknown) => log('kyc', message, data),

  // Auth operations
  auth: (message: string, data?: unknown) => log('auth', message, data),

  // Render cycles
  render: (message: string, data?: unknown) => log('render', message, data),

  // State changes
  state: (message: string, data?: unknown) => log('state', message, data),

  // Errors
  error: (message: string, data?: unknown) => {
    log('error', message, data);
    // Also log to console.error for stack traces
    if (isLoggingEnabled() && data instanceof Error) {
      console.error(data);
    }
  },

  // Warnings
  warn: (message: string, data?: unknown) => log('warn', message, data),

  // Generic log with custom type
  custom: (type: LogType, message: string, data?: unknown) => log(type, message, data),

  // Group logs
  group: (label: string) => {
    if (isLoggingEnabled()) {
      console.group(`%c${LOG_PREFIX} ${label}`, 'color: #EF4444; font-weight: bold;');
    }
  },

  groupEnd: () => {
    if (isLoggingEnabled()) {
      console.groupEnd();
    }
  },

  // Time measurement
  time: (label: string) => {
    if (isLoggingEnabled()) {
      console.time(`${LOG_PREFIX} ${label}`);
    }
  },

  timeEnd: (label: string) => {
    if (isLoggingEnabled()) {
      console.timeEnd(`${LOG_PREFIX} ${label}`);
    }
  },

  // Enable/disable logging in production
  enable: () => {
    try {
      localStorage.setItem('debug_dashboard', 'true');
      console.log('%c[Dashboard] Logging ENABLED. Refresh page to see all logs.', 'color: #10B981; font-weight: bold;');
    } catch {
      console.error('Could not enable dashboard logging');
    }
  },

  disable: () => {
    try {
      localStorage.removeItem('debug_dashboard');
      console.log('%c[Dashboard] Logging DISABLED.', 'color: #EF4444; font-weight: bold;');
    } catch {
      console.error('Could not disable dashboard logging');
    }
  },
};

// Export for global access in console
if (typeof window !== 'undefined') {
  (window as any).dashboardLog = dashboardLog;
}

export default dashboardLog;
