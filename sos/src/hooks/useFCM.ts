import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

// VAPID key from environment variable (P0 security fix)
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export function useFCM() {
  const { user } = useAuth();

  useEffect(() => {
    // Enable push notifications for all authenticated users (P2 fix - was excluding clients)
    if (!user) return;

    const app = getApp();
    const messaging = getMessaging(app);

    // Demande la permission au navigateur
    Notification.requestPermission().then(async (permission) => {
      if (permission === 'granted') {
        try {
          // P0 FIX: Use the main service worker instead of separate firebase-messaging-sw.js
          // This avoids conflicts between two SWs at the same scope
          // The main sw.js already handles push notifications
          let swRegistration = await navigator.serviceWorker.getRegistration('/');

          // If main SW not registered yet, register it
          if (!swRegistration) {
            swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            console.log('[FCM] Registered main service worker for push notifications');
          }

          // Wait for the SW to be ready
          await navigator.serviceWorker.ready;

          const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: swRegistration,
          });

          if (token) {
            // Sauvegarde le token FCM dans Firestore
            await setDoc(doc(db, 'fcm_tokens', user.id), {
              uid: user.id,
              token,
              updatedAt: new Date(),
              role: user.role,
            });
            console.log('[FCM] Token saved successfully');
          } else {
            console.warn('⚠️ Aucun token reçu');
          }
        } catch (error) {
          console.error('❌ Erreur lors du getToken FCM :', error);
        }
      } else {
        console.warn('⚠️ Permission de notification refusée');
      }
    });

    // Gère les messages reçus quand app est ouverte
    // SECURITY FIX: Store unsubscribe function to prevent memory leak
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);

      // Show notification when app is in foreground
      if (payload.notification) {
        const { title, body } = payload.notification;
        new Notification(title || 'SOS Expat', {
          body: body || '',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'sos-foreground',
          data: payload.data,
        });
      }
    });

    // Cleanup: unsubscribe when component unmounts or user changes
    return () => {
      unsubscribe();
    };
  }, [user]);
}
