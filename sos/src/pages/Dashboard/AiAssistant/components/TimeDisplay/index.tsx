/**
 * TimeDisplay Components
 *
 * A collection of time and date display components with i18n support.
 * Uses date-fns for formatting and react-intl for internationalization.
 *
 * Components:
 * - TimeAgo: Relative time display with auto-update
 * - Countdown: Days/hours/minutes remaining with animated changes
 * - DateBadge: Formatted date with calendar icon
 * - DurationDisplay: Time span display with clock icon
 * - LiveClock: Real-time clock with timezone support
 *
 * Utilities:
 * - getTimeAgo: Get relative time string
 * - formatDuration: Format milliseconds to readable string
 * - formatDate: Format date with locale support
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useIntl, IntlShape } from 'react-intl';
import {
  format,
  formatDistanceToNow,
  isValid,
  parseISO,
} from 'date-fns';
import { enUS, fr, de, es, pt, ru, zhCN, hi, ar } from 'date-fns/locale';
import type { Locale } from 'date-fns/locale';
import { Calendar, Clock, Timer, AlertTriangle } from 'lucide-react';
import { cn } from '../../../../../utils/cn';

// ============================================================================
// TYPES
// ============================================================================

/** Supported locale codes */
type LocaleCode = 'en' | 'fr' | 'de' | 'es' | 'pt' | 'ru' | 'ch' | 'hi' | 'ar';

/** Date input types - supports various formats */
type DateInput = Date | number | string | { toDate?: () => Date; seconds?: number } | null | undefined;

/** Duration format options */
type DurationFormat = 'short' | 'medium' | 'long' | 'compact';

/** Date format options */
type DateFormat = 'short' | 'medium' | 'long' | 'full' | 'relative';

/** Countdown status */
type CountdownStatus = 'active' | 'warning' | 'critical' | 'expired';

// ============================================================================
// LOCALE MAPPING
// ============================================================================

/** Map language codes to date-fns locales */
const DATE_FNS_LOCALES: Record<LocaleCode, Locale> = {
  en: enUS,
  fr: fr,
  de: de,
  es: es,
  pt: pt,
  ru: ru,
  ch: zhCN,
  hi: hi,
  ar: ar,
};

/** Get date-fns locale from language code */
const getDateFnsLocale = (locale: string): Locale => {
  const code = locale.split('-')[0] as LocaleCode;
  return DATE_FNS_LOCALES[code] || enUS;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert various date formats to Date object
 */
export function toDate(date: DateInput): Date | null {
  if (!date && date !== 0) return null;

  // Firestore Timestamp with toDate method
  if (typeof date === 'object' && date !== null && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate();
  }

  // Firestore Timestamp with seconds property
  if (typeof date === 'object' && date !== null && 'seconds' in date && typeof date.seconds === 'number') {
    return new Date(date.seconds * 1000);
  }

  // Date object
  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }

  // Number (milliseconds or seconds)
  if (typeof date === 'number') {
    // If less than year 2000 in milliseconds, assume it's seconds
    const timestamp = date < 946684800000 ? date * 1000 : date;
    const dateObj = new Date(timestamp);
    return isValid(dateObj) ? dateObj : null;
  }

  // String - try ISO parsing first, then Date constructor
  if (typeof date === 'string') {
    let dateObj = parseISO(date);
    if (!isValid(dateObj)) {
      dateObj = new Date(date);
    }
    return isValid(dateObj) ? dateObj : null;
  }

  return null;
}

/**
 * Get relative time string (e.g., "5 minutes ago", "in 2 hours")
 */
export function getTimeAgo(
  date: DateInput,
  locale: string = 'en',
  intl?: IntlShape
): string {
  const dateObj = toDate(date);
  if (!dateObj) return '—';

  const dateFnsLocale = getDateFnsLocale(locale);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(Math.abs(diffMs) / (1000 * 60));
  const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
  const diffDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));

  // Use intl for custom translations if available
  if (intl) {
    if (diffMins < 1) {
      return intl.formatMessage({ id: 'time.justNow', defaultMessage: 'Just now' });
    }
    if (diffMins < 60) {
      return intl.formatMessage(
        { id: 'time.minutesAgo', defaultMessage: '{count} min ago' },
        { count: diffMins }
      );
    }
    if (diffHours < 24) {
      return intl.formatMessage(
        { id: 'time.hoursAgo', defaultMessage: '{count}h ago' },
        { count: diffHours }
      );
    }
    if (diffDays < 7) {
      return intl.formatMessage(
        { id: 'time.daysAgo', defaultMessage: '{count}d ago' },
        { count: diffDays }
      );
    }
  }

  // Fallback to date-fns formatDistanceToNow
  try {
    return formatDistanceToNow(dateObj, {
      addSuffix: true,
      locale: dateFnsLocale,
    });
  } catch {
    // Ultimate fallback
    return format(dateObj, 'PP', { locale: dateFnsLocale });
  }
}

/**
 * Format duration in milliseconds to readable string
 */
export function formatDuration(
  ms: number,
  formatType: DurationFormat = 'medium',
  locale: string = 'en'
): string {
  if (ms < 0) ms = Math.abs(ms);

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  switch (formatType) {
    case 'compact':
      // e.g., "2d 5h" or "3h 45m" or "12m"
      if (days > 0) return `${days}d ${remainingHours}h`;
      if (hours > 0) return `${hours}h ${remainingMinutes}m`;
      if (minutes > 0) return `${minutes}m`;
      return `${seconds}s`;

    case 'short':
      // e.g., "02:05:30" or "05:30"
      if (days > 0) {
        return `${days}d ${String(remainingHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
      }
      if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
      }
      return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

    case 'long':
      // Full words
      const parts: string[] = [];
      if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
      if (remainingHours > 0) parts.push(`${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'}`);
      if (remainingMinutes > 0) parts.push(`${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`);
      if (parts.length === 0) parts.push(`${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`);
      return parts.join(', ');

    case 'medium':
    default:
      // e.g., "2d 5h 30m" or "5h 30m 15s"
      const mediumParts: string[] = [];
      if (days > 0) mediumParts.push(`${days}d`);
      if (remainingHours > 0 || days > 0) mediumParts.push(`${remainingHours}h`);
      if (remainingMinutes > 0 || hours > 0) mediumParts.push(`${remainingMinutes}m`);
      if (days === 0 && hours === 0) mediumParts.push(`${remainingSeconds}s`);
      return mediumParts.join(' ');
  }
}

/**
 * Format date with locale support
 */
export function formatDate(
  date: DateInput,
  formatType: DateFormat = 'medium',
  locale: string = 'en'
): string {
  const dateObj = toDate(date);
  if (!dateObj) return '—';

  const dateFnsLocale = getDateFnsLocale(locale);

  try {
    switch (formatType) {
      case 'short':
        // e.g., "1/13/26" or "13/01/26"
        return format(dateObj, 'P', { locale: dateFnsLocale });

      case 'long':
        // e.g., "January 13, 2026" or "13 janvier 2026"
        return format(dateObj, 'PPP', { locale: dateFnsLocale });

      case 'full':
        // e.g., "Monday, January 13, 2026"
        return format(dateObj, 'PPPP', { locale: dateFnsLocale });

      case 'relative':
        return formatDistanceToNow(dateObj, {
          addSuffix: true,
          locale: dateFnsLocale,
        });

      case 'medium':
      default:
        // e.g., "Jan 13, 2026"
        return format(dateObj, 'PP', { locale: dateFnsLocale });
    }
  } catch {
    return '—';
  }
}

// ============================================================================
// TIMEAGO COMPONENT
// ============================================================================

interface TimeAgoProps {
  /** Date to display relative time for */
  date: DateInput;
  /** Auto-update interval in seconds (0 to disable) */
  autoUpdate?: number;
  /** Show tooltip with full date on hover */
  showTooltip?: boolean;
  /** Custom className */
  className?: string;
  /** Locale override (uses intl locale by default) */
  locale?: string;
}

/**
 * TimeAgo - Displays relative time (e.g., "5 minutes ago")
 *
 * Features:
 * - Auto-updates at configurable intervals
 * - Tooltip with full date on hover
 * - i18n support via react-intl
 */
export const TimeAgo: React.FC<TimeAgoProps> = ({
  date,
  autoUpdate = 60,
  showTooltip = true,
  className,
  locale: localeProp,
}) => {
  const intl = useIntl();
  const locale = localeProp || intl.locale || 'en';
  const [timeAgo, setTimeAgo] = useState(() => getTimeAgo(date, locale, intl));
  const dateObj = toDate(date);

  // Update time ago string
  const updateTimeAgo = useCallback(() => {
    setTimeAgo(getTimeAgo(date, locale, intl));
  }, [date, locale, intl]);

  // Auto-update effect
  useEffect(() => {
    updateTimeAgo();

    if (autoUpdate > 0) {
      const interval = setInterval(updateTimeAgo, autoUpdate * 1000);
      return () => clearInterval(interval);
    }
  }, [autoUpdate, updateTimeAgo]);

  // Full date for tooltip
  const fullDate = dateObj ? formatDate(dateObj, 'full', locale) : '';
  const fullDateTime = dateObj
    ? `${fullDate} ${format(dateObj, 'HH:mm', { locale: getDateFnsLocale(locale) })}`
    : '';

  return (
    <span
      className={cn('text-gray-500', className)}
      title={showTooltip ? fullDateTime : undefined}
    >
      {timeAgo}
    </span>
  );
};

// ============================================================================
// COUNTDOWN COMPONENT
// ============================================================================

interface CountdownProps {
  /** Target date/time to count down to */
  targetDate: DateInput;
  /** Callback when countdown reaches zero */
  onComplete?: () => void;
  /** Warning threshold in seconds (default: 1 hour) */
  warningThreshold?: number;
  /** Critical threshold in seconds (default: 5 minutes) */
  criticalThreshold?: number;
  /** Show animated number changes */
  animated?: boolean;
  /** Custom className */
  className?: string;
  /** Format type for display */
  format?: DurationFormat;
  /** Show icon */
  showIcon?: boolean;
}

/**
 * Countdown - Displays time remaining until a target date
 *
 * Features:
 * - Days/hours/minutes/seconds display
 * - Animated number changes
 * - Warning colors when time is low
 * - Completion callback
 */
export const Countdown: React.FC<CountdownProps> = ({
  targetDate,
  onComplete,
  warningThreshold = 3600, // 1 hour
  criticalThreshold = 300, // 5 minutes
  animated = true,
  className,
  format: formatType = 'medium',
  showIcon = true,
}) => {
  const intl = useIntl();
  const targetDateObj = toDate(targetDate);
  const onCompleteRef = useRef(onComplete);
  const hasCalledComplete = useRef(false);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [timeRemaining, setTimeRemaining] = useState(() => {
    if (!targetDateObj) return 0;
    return Math.max(0, targetDateObj.getTime() - Date.now());
  });

  const [status, setStatus] = useState<CountdownStatus>('active');

  // Update countdown
  useEffect(() => {
    if (!targetDateObj) return;

    const updateCountdown = () => {
      const remaining = Math.max(0, targetDateObj.getTime() - Date.now());
      const remainingSeconds = Math.floor(remaining / 1000);

      setTimeRemaining(remaining);

      // Update status
      if (remaining <= 0) {
        setStatus('expired');
        if (!hasCalledComplete.current && onCompleteRef.current) {
          hasCalledComplete.current = true;
          onCompleteRef.current();
        }
      } else if (remainingSeconds <= criticalThreshold) {
        setStatus('critical');
      } else if (remainingSeconds <= warningThreshold) {
        setStatus('warning');
      } else {
        setStatus('active');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDateObj, warningThreshold, criticalThreshold]);

  // Status colors
  const statusColors: Record<CountdownStatus, string> = {
    active: 'text-gray-700',
    warning: 'text-amber-600',
    critical: 'text-red-600',
    expired: 'text-red-700',
  };

  const statusBgColors: Record<CountdownStatus, string> = {
    active: 'bg-gray-50',
    warning: 'bg-amber-50',
    critical: 'bg-red-50',
    expired: 'bg-red-100',
  };

  if (!targetDateObj) {
    return <span className={cn('text-gray-400', className)}>—</span>;
  }

  const formattedTime = status === 'expired'
    ? intl.formatMessage({ id: 'time.expired', defaultMessage: 'Expired' })
    : formatDuration(timeRemaining, formatType);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-sm transition-colors',
        statusBgColors[status],
        statusColors[status],
        animated && status !== 'expired' && 'tabular-nums',
        className
      )}
    >
      {showIcon && (
        status === 'critical' || status === 'expired' ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Timer className="w-4 h-4" />
        )
      )}
      <span className={cn(animated && 'transition-all duration-300')}>
        {formattedTime}
      </span>
    </span>
  );
};

// ============================================================================
// DATEBADGE COMPONENT
// ============================================================================

interface DateBadgeProps {
  /** Date to display */
  date: DateInput;
  /** Display variant */
  variant?: 'compact' | 'full';
  /** Custom className */
  className?: string;
  /** Show calendar icon */
  showIcon?: boolean;
  /** Date format type */
  format?: DateFormat;
}

/**
 * DateBadge - Displays a formatted date with calendar icon
 *
 * Features:
 * - Compact and full variants
 * - Calendar icon
 * - Locale-aware formatting
 */
export const DateBadge: React.FC<DateBadgeProps> = ({
  date,
  variant = 'compact',
  className,
  showIcon = true,
  format: formatType,
}) => {
  const intl = useIntl();
  const locale = intl.locale || 'en';
  const dateObj = toDate(date);

  if (!dateObj) {
    return <span className={cn('text-gray-400', className)}>—</span>;
  }

  const defaultFormat: DateFormat = variant === 'compact' ? 'short' : 'medium';
  const formattedDate = formatDate(dateObj, formatType || defaultFormat, locale);
  const dateFnsLocale = getDateFnsLocale(locale);

  // For compact, show just day/month
  const displayDate = variant === 'compact'
    ? format(dateObj, 'd MMM', { locale: dateFnsLocale })
    : formattedDate;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        variant === 'compact'
          ? 'text-sm text-gray-600'
          : 'px-2.5 py-1 bg-gray-100 rounded-md text-gray-700',
        className
      )}
      title={formatDate(dateObj, 'full', locale)}
    >
      {showIcon && (
        <Calendar className={cn('text-gray-400', variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      )}
      <span>{displayDate}</span>
    </span>
  );
};

// ============================================================================
// DURATIONDISPLAY COMPONENT
// ============================================================================

interface DurationDisplayProps {
  /** Duration in milliseconds */
  duration: number;
  /** Custom className */
  className?: string;
  /** Show clock icon */
  showIcon?: boolean;
  /** Format type */
  format?: DurationFormat;
}

/**
 * DurationDisplay - Displays a time span/duration
 *
 * Features:
 * - Multiple format options
 * - Clock icon
 * - Locale-aware formatting
 */
export const DurationDisplay: React.FC<DurationDisplayProps> = ({
  duration,
  className,
  showIcon = true,
  format: formatType = 'medium',
}) => {
  const intl = useIntl();
  const locale = intl.locale || 'en';

  if (typeof duration !== 'number' || isNaN(duration)) {
    return <span className={cn('text-gray-400', className)}>—</span>;
  }

  const formattedDuration = formatDuration(duration, formatType, locale);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-gray-600',
        className
      )}
    >
      {showIcon && <Clock className="w-4 h-4 text-gray-400" />}
      <span className="font-mono text-sm">{formattedDuration}</span>
    </span>
  );
};

// ============================================================================
// LIVECLOCK COMPONENT
// ============================================================================

interface LiveClockProps {
  /** Time format (12h or 24h) */
  format?: '12h' | '24h';
  /** Show seconds */
  showSeconds?: boolean;
  /** Show date */
  showDate?: boolean;
  /** Timezone (IANA timezone string, e.g., "America/New_York") */
  timezone?: string;
  /** Custom className */
  className?: string;
  /** Update interval in milliseconds */
  updateInterval?: number;
}

/**
 * LiveClock - Real-time clock display
 *
 * Features:
 * - Configurable 12h/24h format
 * - Optional seconds display
 * - Timezone support
 * - Date display option
 */
export const LiveClock: React.FC<LiveClockProps> = ({
  format: timeFormat = '24h',
  showSeconds = false,
  showDate = false,
  timezone,
  className,
  updateInterval = 1000,
}) => {
  const intl = useIntl();
  const locale = intl.locale || 'en';
  const dateFnsLocale = getDateFnsLocale(locale);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, updateInterval);
    return () => clearInterval(interval);
  }, [updateInterval]);

  // Format time based on options
  const formattedTime = useMemo(() => {
    let dateToFormat = currentTime;

    // Handle timezone
    if (timezone) {
      try {
        const options: Intl.DateTimeFormatOptions = {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
          ...(showSeconds && { second: '2-digit' }),
          hour12: timeFormat === '12h',
        };
        return currentTime.toLocaleTimeString(locale, options);
      } catch {
        // Fallback if timezone is invalid
        dateToFormat = currentTime;
      }
    }

    // Format without timezone conversion
    const pattern = timeFormat === '12h'
      ? (showSeconds ? 'h:mm:ss a' : 'h:mm a')
      : (showSeconds ? 'HH:mm:ss' : 'HH:mm');

    return format(dateToFormat, pattern, { locale: dateFnsLocale });
  }, [currentTime, timezone, timeFormat, showSeconds, locale, dateFnsLocale]);

  // Format date
  const formattedDate = useMemo(() => {
    if (!showDate) return null;

    if (timezone) {
      try {
        return currentTime.toLocaleDateString(locale, {
          timeZone: timezone,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        // Fallback
      }
    }

    return format(currentTime, 'EEE, MMM d', { locale: dateFnsLocale });
  }, [currentTime, showDate, timezone, locale, dateFnsLocale]);

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <span className="font-mono text-lg tabular-nums">
        {formattedTime}
      </span>
      {showDate && formattedDate && (
        <span className="text-xs text-gray-500 mt-0.5">
          {formattedDate}
        </span>
      )}
      {timezone && (
        <span className="text-xs text-gray-400 mt-0.5">
          {timezone.replace('_', ' ')}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  TimeAgo,
  Countdown,
  DateBadge,
  DurationDisplay,
  LiveClock,
  // Utilities
  getTimeAgo,
  formatDuration,
  formatDate,
  toDate,
};
