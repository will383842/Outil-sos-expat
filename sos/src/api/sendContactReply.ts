// src/api/sendContactReply.ts

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

export interface SendContactReplyParams {
  to: string;
  firstName: string;
  userMessage: string;
  adminReply: string;
  messageId: string;
}

interface SendContactReplyResponse {
  success: boolean;
  emailId?: string;
}

export const sendContactReply = async ({
  to,
  firstName,
  userMessage,
  adminReply,
  messageId,
}: SendContactReplyParams): Promise<{ success: boolean; error?: string }> => {
  try {
    const functions = getFunctions(app, 'europe-west1');
    const sendContactReplyFn = httpsCallable<SendContactReplyParams, SendContactReplyResponse>(
      functions,
      'sendContactReply'
    );

    const result = await sendContactReplyFn({
      to,
      firstName,
      userMessage,
      adminReply,
      messageId,
    });

    if (result.data.success) {
      return { success: true };
    } else {
      return { success: false, error: 'Erreur lors de l\'envoi' };
    }
  } catch (err: unknown) {
    console.error('[sendContactReply] Error:', err);
    if (err instanceof Error) {
      // Firebase functions error format
      const message = err.message.includes('internal')
        ? 'Erreur lors de l\'envoi de l\'email'
        : err.message;
      return { success: false, error: message };
    }
    return { success: false, error: 'Erreur inconnue' };
  }
};
