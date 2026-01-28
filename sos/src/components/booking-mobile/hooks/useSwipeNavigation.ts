import { useEffect, useRef, useCallback } from 'react';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance for a swipe
  restraint?: number; // Maximum perpendicular distance
  allowedTime?: number; // Maximum time for a swipe
  enabled?: boolean;
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
}

export const useSwipeNavigation = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  restraint = 75,
  allowedTime = 300,
  enabled = true,
}: SwipeConfig) => {
  const touchDataRef = useRef<TouchData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    const touch = e.changedTouches[0];
    touchDataRef.current = {
      startX: touch.pageX,
      startY: touch.pageY,
      startTime: Date.now(),
    };
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !touchDataRef.current) return;

    const touch = e.changedTouches[0];
    const { startX, startY, startTime } = touchDataRef.current;

    const distX = touch.pageX - startX;
    const distY = touch.pageY - startY;
    const elapsedTime = Date.now() - startTime;

    // Check if it's a valid horizontal swipe
    if (elapsedTime <= allowedTime) {
      if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
        // Horizontal swipe detected
        if (distX < 0) {
          // Swipe left (next)
          onSwipeLeft?.();
        } else {
          // Swipe right (back)
          onSwipeRight?.();
        }
      }
    }

    touchDataRef.current = null;
  }, [enabled, threshold, restraint, allowedTime, onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return { containerRef };
};

export default useSwipeNavigation;
