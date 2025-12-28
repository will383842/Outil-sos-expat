// src/hooks/pwa/index.ts
/**
 * PWA Hooks - Centralized exports for all PWA-related hooks
 *
 * This module provides easy access to all Progressive Web App functionality.
 */

// Installation
export { usePWAInstall } from '../usePWAInstall';

// Web Share API
export { useWebShare } from '../useWebShare';

// App Badging
export { useBadging, setAppBadge, clearAppBadge } from '../useBadging';

// Re-export types
export type { default as useWebShareReturn } from '../useWebShare';
export type { default as useBadgingReturn } from '../useBadging';
