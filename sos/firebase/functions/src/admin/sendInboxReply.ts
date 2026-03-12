/**
 * Generic inbox reply — sends an email reply and updates any Firestore collection
 * Replaces the need for per-collection reply functions
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { sendZoho } from '../notificationPipeline/providers/email/zohoSmtp';
import { EMAIL_USER, EMAIL_PASS } from '../lib/secrets';

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

const ALLOWED_COLLECTIONS = [
  'contact_messages',
  'user_feedback',
  'captain_applications',
  'partner_applications',
  'payment_withdrawals',
] as const;

type AllowedCollection = typeof ALLOWED_COLLECTIONS[number];

interface InboxReplyRequest {
  collection: string;
  docId: string;
  to: string; // email
  recipientName: string;
  originalMessage: string;
  adminReply: string;
}

function generateReplyHtml(recipientName: string, originalMessage: string, adminReply: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SOS Expat</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Réponse à votre message</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Bonjour <strong>${recipientName}</strong>,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Merci de nous avoir contactés. Voici notre réponse :
              </p>
              <div style="background-color: #f3f4f6; border-left: 4px solid #9ca3af; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Votre message :</p>
                <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${originalMessage}</p>
              </div>
              <div style="background-color: #fef2f2; border-left: 4px solid #DC2626; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #991b1b; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Notre réponse :</p>
                <p style="color: #1f2937; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;"><strong>${adminReply}</strong></p>
              </div>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Si vous avez d'autres questions, n'hésitez pas à nous recontacter.
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Cordialement,<br><strong>L'équipe SOS Expat</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} SOS Expat - WorldExpat OÜ</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export const sendInboxReply = onCall<InboxReplyRequest>(
  {
    region: 'europe-west1',
    memory: '256MiB',
    secrets: [EMAIL_USER, EMAIL_PASS],
  },
  async (request) => {
    ensureInitialized();
    const db = getFirestore();

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise');
    }

    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin' || userData?.role === 'admin';
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Accès réservé aux administrateurs');
    }

    const { collection: collName, docId, to, recipientName, originalMessage, adminReply } = request.data;

    if (!collName || !docId || !to || !adminReply) {
      throw new HttpsError('invalid-argument', 'Champs requis: collection, docId, to, adminReply');
    }

    if (!ALLOWED_COLLECTIONS.includes(collName as AllowedCollection)) {
      throw new HttpsError('invalid-argument', `Collection non autorisée: ${collName}`);
    }

    try {
      const html = generateReplyHtml(recipientName || 'there', originalMessage || '', adminReply);
      const subject = '📬 Réponse à votre message - SOS Expat';

      const emailId = await sendZoho(to, subject, html);

      // Update the source document
      await db.collection(collName).doc(docId).update({
        adminReply: adminReply,
        adminRepliedAt: FieldValue.serverTimestamp(),
        adminRepliedBy: request.auth.uid,
        isRead: true,
      });

      await db.collection('email_logs').add({
        type: 'inbox_reply',
        collection: collName,
        to,
        docId,
        subject,
        status: 'sent',
        emailId,
        sentAt: FieldValue.serverTimestamp(),
        sentBy: request.auth.uid,
      });

      return { success: true, emailId };
    } catch (error) {
      console.error('[sendInboxReply] Error:', error);

      await db.collection('email_logs').add({
        type: 'inbox_reply',
        collection: collName,
        to,
        docId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        sentAt: FieldValue.serverTimestamp(),
        sentBy: request.auth.uid,
      });

      throw new HttpsError('internal', "Erreur lors de l'envoi de l'email");
    }
  }
);
