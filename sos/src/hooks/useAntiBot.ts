/**
 * useAntiBot - Reusable anti-bot hook with reCAPTCHA v3
 *
 * Features:
 * - reCAPTCHA v3 token generation
 * - Honeypot field detection
 * - Minimum form fill time check
 * - Mouse movement tracking
 * - Keystroke tracking
 */

import { useState, useRef, useEffect, useCallback } from 'react';

// reCAPTCHA site key from environment
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

// Minimum time in seconds for form fill (bots fill forms too fast)
const MIN_FORM_FILL_TIME = 10;

// TypeScript declaration for grecaptcha
declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => Promise<void>;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export interface AntiBotValidationResult {
  isValid: boolean;
  reason?: string;
  recaptchaToken?: string | null;
  securityMeta: {
    formFillTime: number;
    mouseMovements: number;
    keystrokes: number;
    userAgent: string;
    timestamp: number;
    recaptchaToken?: string | null;
  };
}

export interface UseAntiBotReturn {
  honeypotValue: string;
  setHoneypotValue: (value: string) => void;
  validateHuman: (action: string) => Promise<AntiBotValidationResult>;
  recaptchaLoaded: boolean;
  recaptchaEnabled: boolean;
  stats: {
    mouseMovements: number;
    keystrokes: number;
    timeSpent: number;
  };
}

export const useAntiBot = (): UseAntiBotReturn => {
  const formStartTime = useRef<number>(Date.now());
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const [honeypotValue, setHoneypotValue] = useState('');
  const [mouseMovements, setMouseMovements] = useState(0);
  const [keystrokes, setKeystrokes] = useState(0);

  // Check if reCAPTCHA is configured
  const recaptchaEnabled = Boolean(RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY !== '6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

  // Load reCAPTCHA v3 script
  useEffect(() => {
    if (!recaptchaEnabled) {
      console.log('[useAntiBot] reCAPTCHA not configured, skipping');
      return;
    }

    if (typeof window !== 'undefined' && !window.grecaptcha) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('[useAntiBot] reCAPTCHA v3 loaded');
        setRecaptchaLoaded(true);
      };
      script.onerror = () => {
        console.warn('[useAntiBot] reCAPTCHA load error');
      };
      document.head.appendChild(script);
    } else if (window.grecaptcha) {
      setRecaptchaLoaded(true);
    }
  }, [recaptchaEnabled]);

  // Track mouse movements (bots typically don't have mouse movement)
  useEffect(() => {
    const handleMouseMove = () => {
      setMouseMovements((prev) => prev + 1);
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Track keystrokes
  useEffect(() => {
    const handleKeyDown = () => {
      setKeystrokes((prev) => prev + 1);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Execute reCAPTCHA
  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      if (!recaptchaEnabled || !recaptchaLoaded || !window.grecaptcha) {
        console.log('[useAntiBot] reCAPTCHA not available');
        return null;
      }

      try {
        await window.grecaptcha.ready(() => {});
        const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
        return token;
      } catch (error) {
        console.error('[useAntiBot] reCAPTCHA error:', error);
        return null;
      }
    },
    [recaptchaEnabled, recaptchaLoaded]
  );

  // Validate if the user is human
  const validateHuman = useCallback(
    async (action: string): Promise<AntiBotValidationResult> => {
      const timeSpent = (Date.now() - formStartTime.current) / 1000;

      const securityMeta = {
        formFillTime: Math.floor(timeSpent),
        mouseMovements,
        keystrokes,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: Date.now(),
        recaptchaToken: null as string | null,
      };

      // 1. Check honeypot (hidden field that bots fill)
      if (honeypotValue) {
        console.warn('[useAntiBot] Honeypot triggered');
        return {
          isValid: false,
          reason: 'Suspicious activity detected',
          securityMeta,
        };
      }

      // 2. Check minimum fill time
      if (timeSpent < MIN_FORM_FILL_TIME) {
        console.warn(`[useAntiBot] Form filled too fast: ${timeSpent}s`);
        return {
          isValid: false,
          reason: 'Please take your time to fill the form',
          securityMeta,
        };
      }

      // 3. Log warnings for suspicious behavior (but don't block)
      if (mouseMovements < 5) {
        console.warn(`[useAntiBot] Low mouse movement: ${mouseMovements}`);
      }
      if (keystrokes < 10) {
        console.warn(`[useAntiBot] Low keystrokes: ${keystrokes}`);
      }

      // 4. Execute reCAPTCHA v3
      const recaptchaToken = await executeRecaptcha(action);
      securityMeta.recaptchaToken = recaptchaToken;

      return {
        isValid: true,
        recaptchaToken,
        securityMeta,
      };
    },
    [honeypotValue, mouseMovements, keystrokes, executeRecaptcha]
  );

  return {
    honeypotValue,
    setHoneypotValue,
    validateHuman,
    recaptchaLoaded,
    recaptchaEnabled,
    stats: {
      mouseMovements,
      keystrokes,
      timeSpent: Math.floor((Date.now() - formStartTime.current) / 1000),
    },
  };
};

export default useAntiBot;
