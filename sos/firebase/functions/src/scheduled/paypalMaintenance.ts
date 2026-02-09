/**
 * paypalMaintenance.ts
 *
 * Fonctions de maintenance PayPal:
 * - P1-5: Nettoyage des orders PayPal non capturés (> 24h) avec annulation active via API
 * - P1-4: Trigger pour envoyer un email après succès payout
 *
 * Ces fonctions assurent l'intégrité des données PayPal et la notification des providers.
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as nodemailer from "nodemailer";

import { EMAIL_USER, EMAIL_PASS, EMAIL_SECRETS, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } from "../lib/secrets";
import { maskEmail } from "../utils/logs/maskSensitiveData";
import { PayPalManager } from "../PayPalManager";

// ============================================================================
// P1-5: CLEANUP DES ORDERS PAYPAL NON CAPTURÉS
// ============================================================================

/**
 * Nettoie les orders PayPal non capturés de plus de 24 heures.
 * Exécuté toutes les 6 heures pour éviter la pollution de la base.
 *
 * Un order est considéré comme "non capturé" si:
 * - status = "CREATED" ou "APPROVED" (pas COMPLETED)
 * - createdAt > 24 heures
 *
 * Ces orders sont:
 * 1. Annulés activement via l'API PayPal (void authorization)
 * 2. Marqués comme "EXPIRED" et archivés
 */
export const cleanupUncapturedPayPalOrders = onSchedule(
  {
    schedule: "0 */6 * * *", // Toutes les 6 heures
    region: "europe-west3",
    timeZone: "Europe/Paris",
    timeoutSeconds: 300, // 5 minutes pour traiter les annulations API
    memory: "512MiB",
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET],
  },
  async () => {
    console.log("[PayPalCleanup] Starting cleanup of uncaptured orders...");

    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const twentyFourHoursAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 24 * 60 * 60 * 1000
    );

    const results = {
      voided: 0,
      expired: 0,
      alreadyVoided: 0,
      errors: 0,
    };

    try {
      // Récupérer les orders non capturés de plus de 24h
      const uncapturedOrders = await db
        .collection("paypal_orders")
        .where("status", "in", ["CREATED", "APPROVED", "PAYER_ACTION_REQUIRED"])
        .where("createdAt", "<", twentyFourHoursAgo)
        .limit(50) // Limiter pour éviter les timeouts (API calls)
        .get();

      if (uncapturedOrders.empty) {
        console.log("[PayPalCleanup] No uncaptured orders to clean up");
        return;
      }

      console.log(`[PayPalCleanup] Found ${uncapturedOrders.size} uncaptured orders to process`);

      // Instancier PayPalManager pour annuler les autorisations
      const paypalManager = new PayPalManager(db);

      for (const doc of uncapturedOrders.docs) {
        const orderData = doc.data();
        const orderId = doc.id;

        try {
          // 1. Essayer d'annuler l'autorisation via l'API PayPal
          console.log(`[PayPalCleanup] Voiding order ${orderId}...`);
          const voidResult = await paypalManager.voidAuthorization(
            orderId,
            "Automatic cleanup - order expired after 24 hours without capture"
          );

          if (voidResult.success) {
            if (voidResult.status === "ALREADY_VOIDED") {
              results.alreadyVoided++;
            } else {
              results.voided++;
            }
            console.log(`[PayPalCleanup] Order ${orderId} voided: ${voidResult.status}`);
          } else {
            // L'annulation a échoué mais on continue le cleanup
            console.warn(`[PayPalCleanup] Could not void ${orderId}: ${voidResult.message}`);

            // Marquer manuellement comme expiré si l'API échoue
            await doc.ref.update({
              status: "EXPIRED",
              expiredAt: now,
              expiredReason: `Cleanup failed to void via API: ${voidResult.message}`,
              updatedAt: now,
            });
            results.expired++;
          }

          // 2. Archiver l'order
          const archiveRef = db.collection("paypal_orders_archived").doc(orderId);
          await archiveRef.set({
            ...orderData,
            originalStatus: orderData.status,
            archivedReason: "UNCAPTURED_EXPIRED",
            archivedAt: now,
            voidResult: voidResult,
          });

        } catch (orderError) {
          console.error(`[PayPalCleanup] Error processing order ${orderId}:`, orderError);
          results.errors++;

          // Marquer comme expiré même en cas d'erreur
          try {
            await doc.ref.update({
              status: "EXPIRED",
              expiredAt: now,
              expiredReason: `Cleanup error: ${orderError instanceof Error ? orderError.message : "Unknown"}`,
              updatedAt: now,
            });
          } catch {
            // Ignorer les erreurs de mise à jour
          }
        }
      }

      console.log(`[PayPalCleanup] Cleanup completed:`, results);

      // Créer une alerte admin avec les résultats
      const totalProcessed = results.voided + results.expired + results.alreadyVoided + results.errors;
      if (totalProcessed > 0) {
        await db.collection("admin_alerts").add({
          type: "paypal_orders_cleanup",
          priority: results.errors > 0 ? "medium" : "low",
          title: "Orders PayPal expirés nettoyés",
          message: `Traité: ${totalProcessed} orders. Annulés: ${results.voided}, Déjà annulés: ${results.alreadyVoided}, Expirés: ${results.expired}, Erreurs: ${results.errors}`,
          results,
          read: false,
          createdAt: now,
        });
      }
    } catch (error) {
      console.error("[PayPalCleanup] Error during cleanup:", error);

      // Alerter en cas d'erreur
      await db.collection("admin_alerts").add({
        type: "paypal_cleanup_error",
        priority: "high",
        title: "Erreur nettoyage orders PayPal",
        message: `Erreur lors du nettoyage des orders: ${error instanceof Error ? error.message : "Unknown"}`,
        read: false,
        createdAt: now,
      });
    }
  }
);

// ============================================================================
// P1-4: EMAIL DE NOTIFICATION APRÈS SUCCÈS PAYOUT
// ============================================================================

/**
 * Envoie un email au provider quand son payout PayPal réussit.
 * Déclenché par la mise à jour du status à "SUCCESS" dans paypal_payouts.
 */
export const sendPayoutSuccessEmail = onDocumentUpdated(
  {
    document: "paypal_payouts/{payoutId}",
    region: "europe-west3",
    secrets: EMAIL_SECRETS,
  },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    // Vérifier si le status vient de passer à SUCCESS
    if (!beforeData || !afterData) return;
    if (beforeData.status === "SUCCESS" || afterData.status !== "SUCCESS") return;

    console.log(`[PayoutEmail] Payout ${event.params.payoutId} succeeded, sending email...`);

    const db = admin.firestore();
    const providerId = afterData.providerId;
    const amount = afterData.amount;
    const currency = afterData.currency || "EUR";

    if (!providerId) {
      console.warn("[PayoutEmail] No providerId in payout document, skipping email");
      return;
    }

    try {
      // Récupérer les infos du provider
      const providerDoc = await db.collection("sos_profiles").doc(providerId).get();
      const providerData = providerDoc.data();

      if (!providerData?.email) {
        console.warn(`[PayoutEmail] No email found for provider ${providerId}`);
        return;
      }

      const providerEmail = providerData.email;
      const providerName = providerData.fullName || providerData.displayName || "Cher partenaire";
      const locale = providerData.locale || "fr";

      // Créer le transporteur email
      const transporter = nodemailer.createTransport({
        host: "smtp.zoho.eu",
        port: 465,
        secure: true,
        auth: {
          user: EMAIL_USER.value().trim(),
          pass: EMAIL_PASS.value().trim(),
        },
      });

      // Templates d'email - Ton fun et sympathique, couleurs de la marque SOS Expat
      // Couleur primaire: #2563eb (bleu), secondaire: #1d4ed8 (bleu foncé)
      const templates: Record<string, { subject: string; html: string }> = {
        fr: {
          subject: `Ka-ching ! ${amount} ${currency} en route vers votre PayPal`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
              <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://sos-expat.com/logo.png" alt="SOS Expat" style="height: 50px;" />
                </div>

                <h2 style="color: #2563eb; text-align: center; font-size: 24px;">C'est payday !</h2>

                <p style="color: #334155; line-height: 1.6;">Hey ${providerName} !</p>

                <p style="color: #334155; line-height: 1.6;">On a une super nouvelle pour vous : votre paiement vient d'arriver !</p>

                <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #2563eb; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                  <span style="font-size: 32px; font-weight: bold; color: #2563eb;">${amount} ${currency}</span>
                  <p style="color: #1d4ed8; margin-top: 10px; font-size: 14px;">Direction votre compte PayPal !</p>
                </div>

                <p style="color: #334155; line-height: 1.6;">Merci d'aider nos expatries au quotidien - vous faites un travail incroyable ! Le virement devrait apparaitre sur votre PayPal d'ici quelques heures.</p>

                <p style="color: #334155; line-height: 1.6;">Une question ? On est la pour vous, n'hesitez pas !</p>

                <p style="margin-top: 30px; color: #334155;">A tres vite,<br/><strong style="color: #2563eb;">La team SOS Expat</strong></p>
              </div>

              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
                © ${new Date().getFullYear()} SOS Expat - Fait avec amour pour les expats
              </p>
            </div>
          `,
        },
        en: {
          subject: `Ka-ching! ${amount} ${currency} heading to your PayPal`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
              <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://sos-expat.com/logo.png" alt="SOS Expat" style="height: 50px;" />
                </div>

                <h2 style="color: #2563eb; text-align: center; font-size: 24px;">It's payday!</h2>

                <p style="color: #334155; line-height: 1.6;">Hey ${providerName}!</p>

                <p style="color: #334155; line-height: 1.6;">We've got great news for you: your payment just landed!</p>

                <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #2563eb; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                  <span style="font-size: 32px; font-weight: bold; color: #2563eb;">${amount} ${currency}</span>
                  <p style="color: #1d4ed8; margin-top: 10px; font-size: 14px;">On its way to your PayPal!</p>
                </div>

                <p style="color: #334155; line-height: 1.6;">Thanks for helping our expats every day - you're doing an amazing job! The transfer should show up in your PayPal within a few hours.</p>

                <p style="color: #334155; line-height: 1.6;">Got questions? We're here for you, just reach out!</p>

                <p style="margin-top: 30px; color: #334155;">Catch you later,<br/><strong style="color: #2563eb;">The SOS Expat crew</strong></p>
              </div>

              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
                © ${new Date().getFullYear()} SOS Expat - Made with love for expats
              </p>
            </div>
          `,
        },
        es: {
          subject: `Ka-ching! ${amount} ${currency} en camino a tu PayPal`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
              <div style="background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://sos-expat.com/logo.png" alt="SOS Expat" style="height: 50px;" />
                </div>

                <h2 style="color: #2563eb; text-align: center; font-size: 24px;">Es dia de pago!</h2>

                <p style="color: #334155; line-height: 1.6;">Hey ${providerName}!</p>

                <p style="color: #334155; line-height: 1.6;">Tenemos buenas noticias: tu pago acaba de llegar!</p>

                <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #2563eb; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                  <span style="font-size: 32px; font-weight: bold; color: #2563eb;">${amount} ${currency}</span>
                  <p style="color: #1d4ed8; margin-top: 10px; font-size: 14px;">En camino a tu PayPal!</p>
                </div>

                <p style="color: #334155; line-height: 1.6;">Gracias por ayudar a nuestros expatriados cada dia - estas haciendo un trabajo increible! La transferencia deberia aparecer en tu PayPal en unas horas.</p>

                <p style="color: #334155; line-height: 1.6;">Tienes preguntas? Estamos aqui para ayudarte!</p>

                <p style="margin-top: 30px; color: #334155;">Hasta pronto,<br/><strong style="color: #2563eb;">El equipo SOS Expat</strong></p>
              </div>

              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
                © ${new Date().getFullYear()} SOS Expat - Hecho con amor para los expats
              </p>
            </div>
          `,
        },
      };

      const template = templates[locale] || templates["fr"];

      await transporter.sendMail({
        from: `"SOS Expat" <${EMAIL_USER.value().trim()}>`,
        to: providerEmail,
        subject: template.subject,
        html: template.html,
      });

      // Marquer que l'email a été envoyé
      await event.data?.after.ref.update({
        emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        emailSentTo: providerEmail,
      });

      // P0-8: Masquer l'email dans les logs
      console.log(`[PayoutEmail] Email sent to ${maskEmail(providerEmail)} for payout ${event.params.payoutId}`);

    } catch (error) {
      console.error(`[PayoutEmail] Error sending email:`, error);

      // Ne pas faire échouer le trigger, mais logger l'erreur
      await db.collection("admin_alerts").add({
        type: "payout_email_failed",
        priority: "low",
        title: "Échec envoi email payout",
        message: `L'email de notification de payout n'a pas pu être envoyé pour ${event.params.payoutId}`,
        payoutId: event.params.payoutId,
        providerId,
        error: error instanceof Error ? error.message : "Unknown",
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);
