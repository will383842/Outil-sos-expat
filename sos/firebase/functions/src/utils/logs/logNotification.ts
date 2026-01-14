import { db, FieldValue } from '../firebase';
import { NotificationLogData } from '../types';

export async function logNotification(data: NotificationLogData) {
  try {
    // ÉCONOMIE: Ajout TTL de 14 jours pour les logs de notification
    const now = Date.now();
    const logData = {
      ...data,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date(),
      environment: process.env.NODE_ENV || 'development',
      // TTL: Firestore supprimera ce document après 14 jours
      expireAt: new Date(now + 14 * 24 * 60 * 60 * 1000)
    };

    await db.collection('notification_logs').add(logData);

    console.log(`[NOTIFICATION] ${data.channel.toUpperCase()} to ${data.to}: ${data.status}`);

    if (data.status === 'failed' && data.errorMessage) {
      // ÉCONOMIE: Ajout TTL de 30 jours pour les logs d'erreur
      await db.collection('error_logs').add({
        context: `notification_${data.channel}`,
        message: data.errorMessage,
        timestamp: FieldValue.serverTimestamp(),
        severity: 'medium',
        additionalData: {
          to: data.to,
          channel: data.channel,
          type: data.type
        },
        // TTL: Firestore supprimera ce document après 30 jours
        expireAt: new Date(now + 30 * 24 * 60 * 60 * 1000)
      });
    }

  } catch (error) {
    console.error('Failed to log notification:', error);
    console.error('Notification data:', data);
  }
}
