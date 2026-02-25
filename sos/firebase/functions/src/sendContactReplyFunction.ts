/**
 * Cloud Function: sendContactReply
 * Envoie une réponse email à un message de contact et met à jour Firestore
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { sendZoho } from './notificationPipeline/providers/email/zohoSmtp';

const db = getFirestore();

interface ContactReplyRequest {
  to: string;
  firstName: string;
  userMessage: string;
  adminReply: string;
  messageId: string;
}

/**
 * Génère le HTML de l'email de réponse
 */
function generateReplyHtml(firstName: string, userMessage: string, adminReply: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réponse à votre message - SOS Expat</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SOS Expat</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Réponse à votre message</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Bonjour <strong>${firstName}</strong>,
              </p>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Merci de nous avoir contactés. Voici notre réponse à votre message :
              </p>

              <!-- Original message -->
              <div style="background-color: #f3f4f6; border-left: 4px solid #9ca3af; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Votre message :</p>
                <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${userMessage}</p>
              </div>

              <!-- Admin reply -->
              <div style="background-color: #fef2f2; border-left: 4px solid #DC2626; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #991b1b; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Notre réponse :</p>
                <p style="color: #1f2937; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;"><strong>${adminReply}</strong></p>
              </div>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Si vous avez d'autres questions, n'hésitez pas à nous recontacter.
              </p>

              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                Cordialement,<br>
                <strong>L'équipe SOS Expat</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} SOS Expat - WorldExpat OÜ
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0 0;">
                Cet email a été envoyé en réponse à votre message de contact.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Cloud Function pour envoyer une réponse à un message de contact
 */
export const sendContactReply = onCall<ContactReplyRequest>(
  {
    region: 'europe-west1',
    memory: '256MiB',
  },
  async (request) => {
    // Vérifier l'authentification admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise');
    }

    // Vérifier le rôle admin
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    // P1 FIX: Check both claim formats for backward compatibility
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin' || userData?.role === 'admin';

    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Accès réservé aux administrateurs');
    }

    const { to, firstName, userMessage, adminReply, messageId } = request.data;

    // Validation des champs
    if (!to || !firstName || !userMessage || !adminReply || !messageId) {
      throw new HttpsError('invalid-argument', 'Tous les champs sont requis');
    }

    try {
      // Générer le HTML
      const html = generateReplyHtml(firstName, userMessage, adminReply);
      const subject = '📬 Réponse à votre message - SOS Expat';

      // Envoyer l'email
      const emailId = await sendZoho(to, subject, html);

      // Mettre à jour le document Firestore
      await db.collection('contact_messages').doc(messageId).update({
        reply: adminReply,
        repliedAt: FieldValue.serverTimestamp(),
        isRead: true,
        responded: true,
        replyStatus: 'success',
        replyEmailId: emailId,
      });

      // Logger l'envoi
      await db.collection('email_logs').add({
        type: 'contact_reply',
        to,
        messageId,
        subject,
        status: 'sent',
        emailId,
        sentAt: FieldValue.serverTimestamp(),
        sentBy: request.auth.uid,
      });

      return { success: true, emailId };
    } catch (error) {
      console.error('[sendContactReply] Error:', error);

      // Logger l'erreur
      await db.collection('email_logs').add({
        type: 'contact_reply',
        to,
        messageId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        sentAt: FieldValue.serverTimestamp(),
        sentBy: request.auth.uid,
      });

      // Mettre à jour le status d'erreur
      await db.collection('contact_messages').doc(messageId).update({
        replyStatus: 'error',
        replyError: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new HttpsError('internal', 'Erreur lors de l\'envoi de l\'email');
    }
  }
);
