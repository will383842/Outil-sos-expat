import { db, FieldValue } from '../firebase';
import { CallRecordData } from '../types';
import { logError } from '../logs/logError';
import { truncateId, safeLogData } from './truncateId';

// ✅ UNE SEULE fonction qui gère les deux cas
export async function logCallRecord(data: {
  callId: string;
  status: string;
  retryCount: number;
  additionalData?: Record<string, unknown>;
  duration?: number;
  errorMessage?: string;
}) {
  try {
    const {
      callId,
      status,
      retryCount,
      additionalData = {},
      duration,
      errorMessage
    } = data;

    if (!callId || !status) {
      throw new Error('callId and status are required for call record logging');
    }

    // Firestore does not accept undefined values. Sanitize additional data.
    const sanitizedAdditional = Object.fromEntries(
      Object.entries(additionalData || {}).map(([key, value]) => [key, value === undefined ? null : value])
    );

    const recordData = {
      callId,
      status,
      retryCount: retryCount || 0,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date(),
      duration: duration || null,
      errorMessage: errorMessage || null,
      environment: process.env.NODE_ENV || 'development',
      ...sanitizedAdditional
    };

    await db.collection('call_records').add(recordData);

    const significantStatuses = [
      'scheduled',
      'provider_connected',
      'client_connected',
      'both_connected',
      'completed',
      'failed',
      'cancelled'
    ];

    if (significantStatuses.includes(status)) {
      const callSessionRef = db.collection('call_sessions').doc(callId);
      await callSessionRef.update({
        lastRecordedStatus: status,
        lastRecordedAt: FieldValue.serverTimestamp(),
        retryCount: retryCount
      });
    }

    // P2-2 FIX: Tronquer l'ID dans les logs
    console.log(`[CALL RECORD] ${truncateId(callId)}: ${status} (retry: ${retryCount})`);

  } catch (error) {
    console.error('Failed to log call record:', error);
    // P2-2 FIX: Masquer les données sensibles dans les logs d'erreur
    console.error('Call record data:', safeLogData(data as Record<string, unknown>));
    
    try {
      await logError('logCallRecord:failure', error);
    } catch (logErrorFailure) {
      console.error('Failed to log call record error:', logErrorFailure);
    }
  }
}

export async function getCallRecords(callId: string): Promise<CallRecordData[]> {
  try {
    const snapshot = await db.collection('call_records')
      .where('callId', '==', callId)
      .orderBy('timestamp', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CallRecordData & { id: string }));
  } catch (error) {
    console.error('Failed to get call records:', error);
    await logError('getCallRecords:failure', error);
    return [];
  }
}
