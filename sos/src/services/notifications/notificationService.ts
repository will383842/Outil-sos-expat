// src/services/notificationService.ts
//
// TODO: BACKEND FUNCTIONS MISSING (2026-02-20)
// =============================================
// This service references two Cloud Functions that DO NOT EXIST in the backend:
//   - 'sendNotification' (used by sendMultiChannelNotification)
//   - 'sendPushNotification' (used by sendPushNotification)
//
// Neither function is exported from sos/firebase/functions/src/index.ts.
// Calling these methods will always fail with a "not-found" error.
//
// Additionally:
//   - The toast system (showToast/closeToast) dispatches 'show-toast'/'close-toast'
//     CustomEvents, but NO component in the codebase listens for them.
//   - The exported helpers (sosNotifications, NotificationEventType) are not imported
//     anywhere outside this file.
//   - The only consumer is AdminNotifications.tsx (sendMultiChannelNotification).
//
// Action needed: Either implement the backend Cloud Functions, or remove this
// service and refactor AdminNotifications.tsx to use a different approach
// (e.g., direct Firestore writes, Telegram notifications, or backend email triggers).
// =============================================

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

export interface NotificationData {
  type: 'success' | 'error' | 'info' | 'warning' | 'sos';
  title: string;
  message: string;
  timestamp?: Date;
  read?: boolean;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  autoClose?: boolean;
}

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface MultiChannelNotification {
  type: string;
  recipientEmail?: string;
  recipientName?: string;
  recipientCountry?: string;
  emailSubject?: string;
  emailHtml?: string;
}

interface MultiChannelResponse {
  success: boolean;
  results: Array<{
    channel: 'email' | 'push';
    success: boolean;
    error?: string;
  }>;
}

interface PushResponse {
  success: boolean;
  successCount: number;
  failureCount: number;
}

class NotificationService {
  private notifications: NotificationData[] = [];
  private listeners: ((notifications: NotificationData[]) => void)[] = [];

  // AUDIT-FIX C1: These Cloud Functions do NOT exist in the backend — calls will fail with "not-found"
  // Kept as references but sendMultiChannelNotification/sendPushNotification now return early
  private sendNotificationFn = httpsCallable(functions, 'sendNotification');
  private sendPushNotificationFn = httpsCallable(functions, 'sendPushNotification');

  /**
   * Affiche une notification toast dans l'interface
   * NOTE: Dispatches 'show-toast' CustomEvent but no component listens for it -- effectively a no-op
   */
  showToast(notification: Omit<ToastNotification, 'id'>): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: ToastNotification = {
      id,
      duration: 5000,
      autoClose: true,
      ...notification
    };

    window.dispatchEvent(new CustomEvent('show-toast', { detail: toast }));
    return id;
  }

  /**
   * Ferme une notification toast
   * NOTE: Dispatches 'close-toast' CustomEvent but no component listens for it -- effectively a no-op
   */
  closeToast(id: string): void {
    window.dispatchEvent(new CustomEvent('close-toast', { detail: { id } }));
  }

  /**
   * Ajoute une notification système
   */
  addNotification(notification: Omit<NotificationData, 'timestamp'>): void {
    const newNotification: NotificationData = {
      ...notification,
      timestamp: new Date(),
      read: false
    };

    this.notifications.unshift(newNotification);
    this.notifyListeners();
  }

  markAsRead(index: number): void {
    if (this.notifications[index]) {
      this.notifications[index].read = true;
      this.notifyListeners();
    }
  }

  removeNotification(index: number): void {
    this.notifications.splice(index, 1);
    this.notifyListeners();
  }

  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  getNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  subscribe(listener: (notifications: NotificationData[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Envoie une notification multi-canaux via Cloud Function
   * AUDIT-FIX C1: 'sendNotification' Cloud Function does not exist in backend — returns false immediately
   */
  async sendMultiChannelNotification(_data: MultiChannelNotification): Promise<boolean> {
    console.warn('[NotificationService] sendMultiChannelNotification: Backend function "sendNotification" does not exist');
    return false;
  }

  /**
   * Envoie une notification push
   * AUDIT-FIX C1: 'sendPushNotification' Cloud Function does not exist in backend — returns false immediately
   */
  async sendPushNotification(_data: PushNotificationPayload): Promise<boolean> {
    console.warn('[NotificationService] sendPushNotification: Backend function "sendPushNotification" does not exist');
    return false;
  }

  /**
   * Notifications prédéfinies pour les événements SOS Expat
   */
  notifyNewSOS(clientName: string, location: string, urgency?: string): void {
    this.addNotification({
      type: 'sos',
      title: '🚨 Nouveau SOS',
      message: `${clientName} a besoin d'aide à ${location} (Urgence: ${urgency ?? 'N/A'})`,
      metadata: { clientName, location, urgency, priority: 'urgent' }
    });

    this.showToast({
      type: 'error',
      title: '🚨 Nouveau SOS',
      message: `${clientName} - ${location} (Urgence: ${urgency ?? 'N/A'})`,
      duration: 10000
    });
  }

  notifyCallCompleted(clientName: string, providerName: string, duration: number): void {
    this.addNotification({
      type: 'success',
      title: '✅ Appel terminé',
      message: `Appel entre ${clientName} et ${providerName} (${Math.round(duration/60)}min)`,
      metadata: { clientName, providerName, duration }
    });
  }

  notifyPaymentReceived(amount: number, clientName: string): void {
    this.addNotification({
      type: 'success',
      title: '💰 Paiement reçu',
      message: `${amount}€ de ${clientName}`,
      metadata: { amount, clientName }
    });
  }

  notifySystemError(error: string, context?: string): void {
    this.addNotification({
      type: 'error',
      title: '⚠️ Erreur système',
      message: error,
      metadata: { context, timestamp: new Date().toISOString() }
    });

    this.showToast({
      type: 'error',
      title: 'Erreur système',
      message: error,
      duration: 8000
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  async requestBrowserNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Ce navigateur ne supporte pas les notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  showBrowserNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icons/sos-expat-icon-192.png',
        badge: '/icons/sos-expat-badge-72.png',
        ...options
      });
      setTimeout(() => notification.close(), 5000);
    }
  }
}

// Instance singleton
export const notificationService = new NotificationService();

export type NotificationEventType = 
  | 'new-sos'
  | 'call-completed' 
  | 'payment-received'
  | 'system-error'
  | 'user-registered'
  | 'provider-online'
  | 'provider-offline';

export const sosNotifications = {
  newEmergency: (
    clientName: string,
    location: string,
    urgency: 'low' | 'medium' | 'high' | 'critical'
  ) => 
    notificationService.notifyNewSOS(clientName, location, urgency),
    
  callStarted: (clientName: string, providerName: string) =>
    notificationService.addNotification({
      type: 'info',
      title: '📞 Appel en cours',
      message: `${clientName} ↔ ${providerName}`
    }),
    
  paymentFailed: (clientName: string, amount: number, reason: string) =>
    notificationService.addNotification({
      type: 'error',
      title: '💳 Échec paiement',
      message: `${amount}€ - ${clientName}: ${reason}`
    }),
    
  newReview: (rating: number, clientName: string, providerName: string) =>
    notificationService.addNotification({
      type: 'info',
      title: '⭐ Nouvel avis',
      message: `${rating}/5 étoiles - ${clientName} → ${providerName}`
    })
};

export default notificationService;
