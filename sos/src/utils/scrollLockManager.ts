/**
 * ScrollLockManager - Centralized scroll lock for overlays
 *
 * Prevents race conditions when multiple components (drawer, bottom sheet,
 * modals) independently try to lock/unlock body scroll.
 *
 * Uses a reference counter: scroll is only unlocked when ALL locks are released.
 * Saves and restores scroll position to prevent the page from jumping.
 *
 * FIX 2026-03-10: forceUnlockScroll now restores scroll position from body.style.top
 * to prevent the page from jumping to top when navigating between pages.
 */

let lockCount = 0;
let savedScrollY = 0;

export const lockScroll = (): void => {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
  }
  lockCount++;
};

export const unlockScroll = (): void => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    // Read the scroll position from body.style.top before clearing styles
    const scrollY = savedScrollY;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, scrollY);
  }
};

/**
 * Force reset all locks (safety valve for edge cases).
 * Restores scroll position if body was in a locked (position:fixed) state.
 */
export const forceUnlockScroll = (): void => {
  // If body is currently locked, recover scroll position from its top offset
  const wasLocked = document.body.style.position === 'fixed';
  const recoveredScrollY = wasLocked
    ? Math.abs(parseInt(document.body.style.top || '0', 10))
    : window.scrollY;

  lockCount = 0;
  savedScrollY = 0;
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';

  // Restore scroll position so the page doesn't jump to top
  if (wasLocked) {
    window.scrollTo(0, recoveredScrollY);
  }
};
