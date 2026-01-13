// src/hooks/useShareAnalytics.ts
// Hook for tracking social sharing analytics

import { useCallback } from 'react';
import { logAnalyticsEvent } from '../utils/firestore';
import type { ShareAnalyticsEvent, SocialPlatform } from '../components/provider/SocialShare';

/**
 * Custom hook for tracking social share events
 * Integrates with Firebase Analytics and provides tracking utilities
 */
export const useShareAnalytics = () => {
  /**
   * Track a share event to analytics
   */
  const trackShare = useCallback(async (event: ShareAnalyticsEvent) => {
    try {
      // Log to Firebase Analytics
      await logAnalyticsEvent({
        eventType: 'share',
        eventData: {
          method: event.platform,
          content_type: 'provider_profile',
          content_id: event.providerId,
          provider_type: event.providerType,
          share_url: event.url,
          timestamp: event.timestamp.toISOString(),
        },
      });

      // Additional custom tracking for share funnel
      await logAnalyticsEvent({
        eventType: 'provider_share',
        eventData: {
          platform: event.platform,
          provider_id: event.providerId,
          provider_type: event.providerType,
          user_agent: event.userAgent,
          referrer: event.referrer,
        },
      });
    } catch (error) {
      // Non-blocking - don't disrupt UX for analytics failures
      console.warn('[ShareAnalytics] Failed to track share:', error);
    }
  }, []);

  /**
   * Track when user opens the share sheet
   */
  const trackShareSheetOpen = useCallback(async (providerId: string, providerType: 'lawyer' | 'expat') => {
    try {
      await logAnalyticsEvent({
        eventType: 'share_sheet_open',
        eventData: {
          provider_id: providerId,
          provider_type: providerType,
        },
      });
    } catch (error) {
      console.warn('[ShareAnalytics] Failed to track share sheet open:', error);
    }
  }, []);

  /**
   * Track when user copies the share message
   */
  const trackMessageEdit = useCallback(async (providerId: string, platform: SocialPlatform) => {
    try {
      await logAnalyticsEvent({
        eventType: 'share_message_edit',
        eventData: {
          provider_id: providerId,
          platform,
        },
      });
    } catch (error) {
      console.warn('[ShareAnalytics] Failed to track message edit:', error);
    }
  }, []);

  /**
   * Track QR code generation/download
   */
  const trackQRCodeAction = useCallback(async (
    action: 'view' | 'download',
    providerId: string
  ) => {
    try {
      await logAnalyticsEvent({
        eventType: 'qr_code_action',
        eventData: {
          action,
          provider_id: providerId,
        },
      });
    } catch (error) {
      console.warn('[ShareAnalytics] Failed to track QR action:', error);
    }
  }, []);

  /**
   * Track when native share API is used
   */
  const trackNativeShare = useCallback(async (
    providerId: string,
    success: boolean,
    error?: string
  ) => {
    try {
      await logAnalyticsEvent({
        eventType: 'native_share',
        eventData: {
          provider_id: providerId,
          success,
          error: error || null,
        },
      });
    } catch (err) {
      console.warn('[ShareAnalytics] Failed to track native share:', err);
    }
  }, []);

  return {
    trackShare,
    trackShareSheetOpen,
    trackMessageEdit,
    trackQRCodeAction,
    trackNativeShare,
  };
};

export default useShareAnalytics;
