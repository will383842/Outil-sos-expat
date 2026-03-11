import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

export interface SendInboxReplyParams {
  collection: string;
  docId: string;
  to: string;
  recipientName: string;
  originalMessage: string;
  adminReply: string;
}

interface SendInboxReplyResponse {
  success: boolean;
  emailId?: string;
}

export const sendInboxReply = async (params: SendInboxReplyParams): Promise<{ success: boolean; error?: string }> => {
  try {
    const functions = getFunctions(app, 'europe-west1');
    const fn = httpsCallable<SendInboxReplyParams, SendInboxReplyResponse>(functions, 'sendInboxReply');
    const result = await fn(params);
    return result.data.success ? { success: true } : { success: false, error: "Erreur lors de l'envoi" };
  } catch (err: unknown) {
    console.error('[sendInboxReply] Error:', err);
    if (err instanceof Error) {
      const message = err.message.includes('internal') ? "Erreur lors de l'envoi de l'email" : err.message;
      return { success: false, error: message };
    }
    return { success: false, error: 'Erreur inconnue' };
  }
};
