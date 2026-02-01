/**
 * AnimatedNumber - Count-up animation for numbers
 *
 * Features:
 * - Smooth count-up animation from 0 to target value
 * - Configurable duration and easing
 * - Supports currency formatting
 * - Triggers on visibility (IntersectionObserver)
 * - Re-animates when value changes
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Easing functions for smooth animations
const easings = {
  easeOutQuart: (t: number): number => 1 - Math.pow(1 - t, 4),
  easeOutExpo: (t: number): number => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  linear: (t: number): number => t,
};

type EasingType = keyof typeof easings;

interface AnimatedNumberProps {
  /** The target value to animate to */
  value: number;
  /** Duration of the animation in milliseconds */
  duration?: number;
  /** Easing function to use */
  easing?: EasingType;
  /** Number of decimal places to show */
  decimals?: number;
  /** Prefix to show before the number (e.g., "$") */
  prefix?: string;
  /** Suffix to show after the number (e.g., "%") */
  suffix?: string;
  /** Whether to format with thousand separators */
  formatThousands?: boolean;
  /** Locale for formatting (default: browser locale) */
  locale?: string;
  /** Whether to format as currency (in cents) */
  isCurrency?: boolean;
  /** Currency code (e.g., "USD", "XOF") */
  currencyCode?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to animate on every value change */
  animateOnChange?: boolean;
  /** Start animation only when element is visible */
  animateOnVisible?: boolean;
  /** Delay before starting animation (ms) */
  delay?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 1500,
  easing = 'easeOutExpo',
  decimals = 0,
  prefix = '',
  suffix = '',
  formatThousands = true,
  locale,
  isCurrency = false,
  currencyCode = 'USD',
  className = '',
  animateOnChange = true,
  animateOnVisible = true,
  delay = 0,
  onComplete,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isVisible, setIsVisible] = useState(!animateOnVisible);
  const elementRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);

  // Intersection Observer for visibility detection
  useEffect(() => {
    if (!animateOnVisible || !elementRef.current) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [animateOnVisible]);

  // Animation logic
  const animate = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    startValueRef.current = animateOnChange ? displayValue : 0;
    startTimeRef.current = null;

    const step = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easings[easing](progress);

      const currentValue = startValueRef.current + (value - startValueRef.current) * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
        setHasAnimated(true);
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(step);
  }, [value, duration, easing, displayValue, animateOnChange, onComplete]);

  // Trigger animation when visible and value changes
  useEffect(() => {
    if (!isVisible) return;

    if (!hasAnimated || animateOnChange) {
      const timeoutId = setTimeout(() => {
        animate();
      }, delay);

      return () => {
        clearTimeout(timeoutId);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isVisible, value, hasAnimated, animateOnChange, animate, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Format the displayed value
  const formattedValue = React.useMemo(() => {
    const browserLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

    if (isCurrency) {
      // Value is in cents, convert to currency
      return new Intl.NumberFormat(browserLocale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: currencyCode === 'XOF' ? 0 : 2,
        maximumFractionDigits: currencyCode === 'XOF' ? 0 : 2,
      }).format(displayValue / 100);
    }

    if (formatThousands) {
      return new Intl.NumberFormat(browserLocale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(displayValue);
    }

    return displayValue.toFixed(decimals);
  }, [displayValue, isCurrency, currencyCode, formatThousands, decimals, locale]);

  return (
    <span
      ref={elementRef}
      className={`tabular-nums ${className}`}
      aria-label={`${prefix}${formattedValue}${suffix}`}
    >
      {isCurrency ? formattedValue : `${prefix}${formattedValue}${suffix}`}
    </span>
  );
};

export default AnimatedNumber;

// Hook version for more control
export const useCountUp = (
  targetValue: number,
  options: {
    duration?: number;
    easing?: EasingType;
    decimals?: number;
    startOnMount?: boolean;
  } = {}
) => {
  const {
    duration = 1500,
    easing = 'easeOutExpo',
    decimals = 0,
    startOnMount = true,
  } = options;

  const [value, setValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);

  const start = useCallback((from = 0) => {
    setIsAnimating(true);
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easings[easing](progress);

      const currentValue = from + (targetValue - from) * easedProgress;
      setValue(Number(currentValue.toFixed(decimals)));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setValue(Number(targetValue.toFixed(decimals)));
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [targetValue, duration, easing, decimals]);

  const reset = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setValue(0);
    setIsAnimating(false);
  }, []);

  useEffect(() => {
    if (startOnMount) {
      start();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [startOnMount, start]);

  return { value, isAnimating, start, reset };
};
