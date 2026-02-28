import { useEffect, useRef } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

// VAPID key from environment variable
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export function useFCM() {
  const { user } = useAuth();
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    // P1 FIX: Reset lastTokenRef when user changes (logout or switch user).
    // Without this, User B wouldn't get notifications if same FCM token as User A.
    if (!user) {
      lastTokenRef.current = null;
      return;
    }

    // Guard: no Notification API (SSR, react-snap, etc.)
    if (typeof Notification === 'undefined') return;

    // Guard: Service Workers require secure context (HTTPS or localhost)
    if (!('serviceWorker' in navigator)) return;

    // Guard: VAPID key must be configured
    if (!vapidKey) {
      console.warn('[FCM] VITE_FIREBASE_VAPID_KEY is not set — push notifications disabled');
      return;
    }

    let cancelled = false;

    const currentUser = user; // capture in closure for TS narrowing

    async function registerToken() {
      try {
        if (!currentUser) return;
        const permission = await Notification.requestPermission();
        if (permission !== 'granted' || cancelled) return;

        const app = getApp();
        const messaging = getMessaging(app);

        // P0-2 FIX: Use firebase-messaging-sw.js (which has onBackgroundMessage handler)
        // instead of sw.js (which is disabled and only cleans caches)
        let swRegistration = await navigator.serviceWorker.getRegistration('/');

        // If no SW is registered OR the current one is the disabled sw.js, register the FCM SW
        if (!swRegistration || swRegistration.active?.scriptURL?.endsWith('/sw.js')) {
          swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
        }
        await navigator.serviceWorker.ready;
        if (cancelled) return;

        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: swRegistration,
        });

        if (!token || cancelled) return;

        // Skip write if token hasn't changed since last registration
        if (token === lastTokenRef.current) return;
        lastTokenRef.current = token;

        // P0-4 FIX: Multi-device support — store each token as a sub-document
        // instead of overwriting a single document per user.
        const tokensCol = collection(db, 'fcm_tokens', currentUser.id, 'tokens');
        const existing = await getDocs(query(tokensCol, where('token', '==', token)));
        if (cancelled) return;

        if (existing.empty) {
          const tokenDoc = doc(tokensCol);
          await setDoc(tokenDoc, {
            token,
            platform: 'web',
            userAgent: navigator.userAgent,
            createdAt: serverTimestamp(),
            lastUsedAt: serverTimestamp(),
            isValid: true,
          });
        } else {
          const existingDoc = existing.docs[0];
          await setDoc(existingDoc.ref, { lastUsedAt: serverTimestamp(), isValid: true }, { merge: true });
        }

        console.log('[FCM] Token registered');
      } catch (error) {
        // Non-blocking: don't crash the app if FCM fails
        console.error('[FCM] Token registration error:', error);
      }
    }

    registerToken();

    // Foreground message handler
    let unsubscribe: (() => void) | undefined;
    try {
      const app = getApp();
      const messaging = getMessaging(app);
      unsubscribe = onMessage(messaging, (payload) => {
        if (payload.notification && Notification.permission === 'granted') {
          const { title, body } = payload.notification;
          new Notification(title || 'SOS Expat', {
            body: body || '',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: payload.data?.type || 'sos-foreground',
            data: payload.data,
          });
        }
      });
    } catch {
      // getMessaging can fail if browser doesn't support it
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user]);
}
