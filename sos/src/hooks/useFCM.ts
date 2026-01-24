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
          const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js'),
          });

          if (token) {
            // Sauvegarde le token FCM dans Firestore
            await setDoc(doc(db, 'fcm_tokens', user.id), {
              uid: user.id,
              token,
              updatedAt: new Date(),
              role: user.role,
            });

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
      // Notification reçue pendant l'utilisation de l'app
    });

    // Cleanup: unsubscribe when component unmounts or user changes
    return () => {
      unsubscribe();
    };
  }, [user]);
}
