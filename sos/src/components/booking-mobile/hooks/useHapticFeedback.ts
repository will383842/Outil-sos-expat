import { useCallback } from 'react';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

interface HapticPatterns {
  [key: string]: number | number[];
}

const hapticPatterns: HapticPatterns = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10, 50, 30], // Double tap + long
  warning: [30, 50, 30],
  error: [50, 30, 50, 30, 50], // Triple pulse
};

export const useHapticFeedback = () => {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const trigger = useCallback((type: HapticType = 'light') => {
    if (!isSupported) return false;

    const pattern = hapticPatterns[type] || hapticPatterns.light;

    try {
      navigator.vibrate(pattern);
      return true;
    } catch {
      return false;
    }
  }, [isSupported]);

  // Convenience methods
  const light = useCallback(() => trigger('light'), [trigger]);
  const medium = useCallback(() => trigger('medium'), [trigger]);
  const heavy = useCallback(() => trigger('heavy'), [trigger]);
  const success = useCallback(() => trigger('success'), [trigger]);
  const warning = useCallback(() => trigger('warning'), [trigger]);
  const error = useCallback(() => trigger('error'), [trigger]);

  // Stop any ongoing vibration
  const cancel = useCallback(() => {
    if (isSupported) {
      try {
        navigator.vibrate(0);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, [isSupported]);

  return {
    isSupported,
    trigger,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    cancel,
  };
};

export default useHapticFeedback;
