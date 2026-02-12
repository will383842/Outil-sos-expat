/**
 * onInvoiceCreatedSendEmail.ts
 *
 * P2 FIX 2026-02-12: Automatic Invoice Email Delivery (Multilingual)
 *
 * Automatically sends invoice email to client when an invoice is generated.
 * Supports 9 languages: FR, EN, ES, DE, PT, RU, ZH, HI, AR
 *
 * Trigger: invoice_records/{invoiceId} - onCreate
 * Action: Creates message_event for email delivery with invoice attachment
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { logError } from "../utils/logs/logError";
import { getInvoiceTranslations } from "../utils/invoiceTranslations";

/**
 * Trigger: When a new invoice is created, send it via email
 */
export const onInvoiceCreatedSendEmail = onDocumentCreated(
  {
    document: "invoice_records/{invoiceId}",
    region: "europe-west3",
    memory: "256MiB",
  },
  async (event) => {
    const invoiceData = event.data?.data();
    const invoiceId = event.params.invoiceId;

    if (!invoiceData) {
      console.warn(`⚠️ [onInvoiceCreatedSendEmail] No data for invoice ${invoiceId}`);
      return;
    }

    console.log(`📧 [onInvoiceCreatedSendEmail] Processing invoice: ${invoiceId}`);

    const db = admin.firestore();

    try {
      // Extract client info
      const clientId = invoiceData.clientId;
      const clientEmail = invoiceData.clientEmail;
      const clientName = invoiceData.clientName || "Client";

      // Skip if no email address
      if (!clientEmail) {
        console.warn(`⚠️ [onInvoiceCreatedSendEmail] No email for invoice ${invoiceId} - skipping`);
        return;
      }

      // Get client's preferred language
      let locale = "en"; // Default to English
      if (clientId) {
        try {
          const userDoc = await db.collection("users").doc(clientId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            locale = userData?.preferredLanguage || userData?.language || "en";
          }
        } catch (langError) {
          console.warn(`⚠️ [onInvoiceCreatedSendEmail] Could not get client language:`, langError);
        }
      }

      // Get translations
      const t = getInvoiceTranslations(locale);

      // Build email context
      const emailContext = {
        clientName,
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.amount || 0,
        currency: invoiceData.currency || "EUR",
        downloadUrl: invoiceData.downloadUrl || "",
        callSessionId: invoiceData.callSessionId || invoiceData.callId,
        invoiceType: invoiceData.type, // 'platform' or 'provider'
      };

      // Create message_event for email delivery
      const messageEventData = {
        eventId: "invoice.created",
        locale,
        to: {
          uid: clientId || null,
          email: clientEmail,
        },
        context: emailContext,
        // Email-specific configuration
        channels: {
          email: true,
          sms: false,
          push: false,
          inapp: false,
        },
        email: {
          subject: t.emailSubject,
          template: "invoice_delivery", // Will be created in email template system
          attachments: invoiceData.downloadUrl
            ? [
                {
                  filename: `${invoiceData.invoiceNumber}.html`,
                  url: invoiceData.downloadUrl,
                  contentType: "text/html",
                },
              ]
            : [],
        },
        metadata: {
          invoiceId,
          invoiceNumber: invoiceData.invoiceNumber,
          source: "onInvoiceCreatedSendEmail",
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "pending",
      };

      const messageEventRef = await db.collection("message_events").add(messageEventData);

      console.log(`✅ [onInvoiceCreatedSendEmail] Email event created: ${messageEventRef.id}`);
      console.log(`   → Recipient: ${clientEmail}`);
      console.log(`   → Locale: ${locale}`);
      console.log(`   → Invoice: ${invoiceData.invoiceNumber}`);
      console.log(`   → Subject: ${t.emailSubject}`);

      // Update invoice with email sent flag
      await db
        .collection("invoice_records")
        .doc(invoiceId)
        .update({
          emailSent: true,
          emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
          emailEventId: messageEventRef.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Create audit log
      await db.collection("audit_logs").add({
        action: "invoice_email_sent",
        resourceType: "invoice",
        resourceId: invoiceId,
        invoiceNumber: invoiceData.invoiceNumber,
        clientId,
        clientEmail,
        locale,
        messageEventId: messageEventRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        triggeredBy: "onInvoiceCreatedSendEmail",
      });

      console.log(`✅ [onInvoiceCreatedSendEmail] Successfully processed invoice ${invoiceId}`);
    } catch (error) {
      console.error(
        `❌ [onInvoiceCreatedSendEmail] Error processing invoice ${invoiceId}:`,
        error
      );
      await logError("onInvoiceCreatedSendEmail", {
        invoiceId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * Manual trigger to resend invoice email (admin function)
 */
export const resendInvoiceEmail = async (
  invoiceId: string,
  locale?: string
): Promise<{ success: boolean; messageEventId?: string; error?: string }> => {
  const db = admin.firestore();

  try {
    // Get invoice data
    const invoiceDoc = await db.collection("invoice_records").doc(invoiceId).get();

    if (!invoiceDoc.exists) {
      return { success: false, error: "Invoice not found" };
    }

    const invoiceData = invoiceDoc.data()!;

    if (!invoiceData.clientEmail) {
      return { success: false, error: "No client email address" };
    }

    // Use provided locale or get from user
    let emailLocale = locale || "en";
    if (invoiceData.clientId) {
      try {
        const userDoc = await db.collection("users").doc(invoiceData.clientId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          emailLocale = locale || userData?.preferredLanguage || userData?.language || "en";
        }
      } catch {
        // Use default locale
      }
    }

    // Get translations
    const t = getInvoiceTranslations(emailLocale);

    // Create message_event
    const messageEventData = {
      eventId: "invoice.resent",
      locale: emailLocale,
      to: {
        uid: invoiceData.clientId || null,
        email: invoiceData.clientEmail,
      },
      context: {
        clientName: invoiceData.clientName || "Client",
        invoiceNumber: invoiceData.invoiceNumber,
        amount: invoiceData.amount || 0,
        currency: invoiceData.currency || "EUR",
        downloadUrl: invoiceData.downloadUrl || "",
      },
      channels: {
        email: true,
        sms: false,
        push: false,
        inapp: false,
      },
      email: {
        subject: t.emailSubject,
        template: "invoice_delivery",
        attachments: invoiceData.downloadUrl
          ? [
              {
                filename: `${invoiceData.invoiceNumber}.html`,
                url: invoiceData.downloadUrl,
                contentType: "text/html",
              },
            ]
          : [],
      },
      metadata: {
        invoiceId,
        invoiceNumber: invoiceData.invoiceNumber,
        source: "resendInvoiceEmail",
        isResend: true,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
    };

    const messageEventRef = await db.collection("message_events").add(messageEventData);

    // Update invoice
    await db
      .collection("invoice_records")
      .doc(invoiceId)
      .update({
        emailResent: true,
        emailResentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastEmailEventId: messageEventRef.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log(`✅ [resendInvoiceEmail] Resent invoice ${invoiceId} to ${invoiceData.clientEmail}`);

    return { success: true, messageEventId: messageEventRef.id };
  } catch (error) {
    console.error(`❌ [resendInvoiceEmail] Error resending invoice ${invoiceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
