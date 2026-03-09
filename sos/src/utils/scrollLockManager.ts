/**
 * ScrollLockManager - Centralized scroll lock for overlays
 *
 * Prevents race conditions when multiple components (drawer, bottom sheet,
 * modals) independently try to lock/unlock body scroll.
 *
 * Uses a reference counter: scroll is only unlocked when ALL locks are released.
 * Saves and restores scroll position to prevent the page from jumping.
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
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScrollY);
  }
};

/**
 * Force reset all locks (safety valve for edge cases)
 */
export const forceUnlockScroll = (): void => {
  lockCount = 0;
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
};
