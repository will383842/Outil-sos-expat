// src/hooks/useWebShare.ts
import { useCallback, useMemo } from 'react';

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'none';
  error?: Error;
}

interface UseWebShareReturn {
  /** Whether Web Share API is supported */
  isSupported: boolean;
  /** Whether file sharing is supported */
  canShareFiles: boolean;
  /** Share content using native share or fallback to clipboard */
  share: (data: ShareData) => Promise<ShareResult>;
  /** Copy text/URL to clipboard */
  copyToClipboard: (text: string) => Promise<boolean>;
  /** Share a provider profile */
  shareProvider: (provider: {
    name: string;
    specialty?: string;
    slug: string;
  }) => Promise<ShareResult>;
  /** Share the app for referral */
  shareApp: (referralCode?: string) => Promise<ShareResult>;
}

/**
 * Hook for Web Share API with fallbacks
 *
 * Features:
 * - Native share on supported devices
 * - Clipboard fallback on desktop
 * - File sharing support detection
 * - Pre-built share functions for common use cases
 */
export function useWebShare(): UseWebShareReturn {
  // Check if Web Share API is supported
  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'share' in navigator && typeof navigator.share === 'function';
  }, []);

  // Check if file sharing is supported
  const canShareFiles = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'canShare' in navigator && typeof navigator.canShare === 'function';
  }, []);

  // Copy to clipboard utility
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }

      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const success = document.execCommand('copy');
      document.body.removeChild(textArea);

      return success;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  // Main share function
  const share = useCallback(
    async (data: ShareData): Promise<ShareResult> => {
      // Validate data
      if (!data.title && !data.text && !data.url && !data.files?.length) {
        return {
          success: false,
          method: 'none',
          error: new Error('No content to share'),
        };
      }

      // Try native share first
      if (isSupported) {
        try {
          // Check if we can share files
          if (data.files?.length) {
            if (canShareFiles && navigator.canShare({ files: data.files })) {
              await navigator.share({
                title: data.title,
                text: data.text,
                url: data.url,
                files: data.files,
              });
              return { success: true, method: 'native' };
            }
            // Can't share files, remove them and try without
            delete data.files;
          }

          await navigator.share({
            title: data.title,
            text: data.text,
            url: data.url,
          });

          return { success: true, method: 'native' };
        } catch (error) {
          // User cancelled share is not an error
          if ((error as Error).name === 'AbortError') {
            return { success: false, method: 'native', error: error as Error };
          }

          // If native share failed, try clipboard fallback
          console.warn('Native share failed, trying clipboard:', error);
        }
      }

      // Fallback to clipboard
      const textToShare = [data.title, data.text, data.url].filter(Boolean).join('\n\n');

      if (textToShare) {
        const copied = await copyToClipboard(textToShare);
        return {
          success: copied,
          method: 'clipboard',
          error: copied ? undefined : new Error('Failed to copy to clipboard'),
        };
      }

      return {
        success: false,
        method: 'none',
        error: new Error('No shareable content'),
      };
    },
    [isSupported, canShareFiles, copyToClipboard]
  );

  // Share a provider profile
  const shareProvider = useCallback(
    async (provider: { name: string; specialty?: string; slug: string }): Promise<ShareResult> => {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sos-expat.com';
      const url = `${baseUrl}/provider/${provider.slug}`;

      return share({
        title: `${provider.name} - SOS Expat`,
        text: provider.specialty
          ? `Découvrez ${provider.name}, ${provider.specialty} sur SOS Expat - Assistance urgente pour expatriés`
          : `Découvrez ${provider.name} sur SOS Expat - Assistance urgente pour expatriés`,
        url,
      });
    },
    [share]
  );

  // Share the app for referral
  const shareApp = useCallback(
    async (referralCode?: string): Promise<ShareResult> => {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sos-expat.com';
      const url = referralCode ? `${baseUrl}/?ref=${referralCode}` : baseUrl;

      return share({
        title: 'SOS Expat - Assistance Urgente pour Expatriés',
        text: "J'utilise SOS Expat pour obtenir de l'aide juridique et administrative à l'étranger. Une app indispensable pour les expatriés !",
        url,
      });
    },
    [share]
  );

  return {
    isSupported,
    canShareFiles,
    share,
    copyToClipboard,
    shareProvider,
    shareApp,
  };
}

export default useWebShare;
