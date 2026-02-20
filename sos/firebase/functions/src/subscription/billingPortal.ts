/**
 * Stripe Billing Portal - Accès au portail de facturation
 *
 * Le Billing Portal Stripe permet au provider de:
 * - Voir ses factures
 * - Télécharger les PDFs des factures
 * - Mettre à jour sa carte bancaire
 * - Voir l'historique des paiements
 *
 * CONFIGURATION STRIPE BILLING PORTAL (Dashboard):
 * ================================================
 * Aller dans: Stripe Dashboard > Settings > Billing > Customer portal
 *
 * Configurer les fonctionnalités autorisées:
 * - invoice_history: true (voir les factures)
 * - payment_method_update: true (mettre à jour la carte)
 * - subscription_cancel: false (on gère nous-mêmes la résiliation)
 * - subscription_update: false (on gère nous-mêmes les changements de plan)
 *
 * Personnaliser le branding:
 * - Logo de l'entreprise
 * - Couleurs
 * - URL de retour par défaut
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getStripe } from "../index";
import { APP_URLS } from "./constants";

// ============================================================================
// TYPES
// ============================================================================

interface BillingPortalRequest {
  returnUrl?: string;
}

interface BillingPortalResponse {
  url: string;
}

// ============================================================================
// HELPER: Detect Stripe Locale
// ============================================================================

/**
 * Mappe les 9 langues supportées par SOS-Expat vers les locales Stripe
 *
 * Langues supportées par SOS-Expat:
 * - fr (Français)
 * - en (English)
 * - es (Español)
 * - de (Deutsch)
 * - pt (Português)
 * - ru (Русский)
 * - ch (中文 - Chinese)
 * - hi (हिन्दी - Hindi)
 * - ar (العربية - Arabic)
 *
 * Locales Stripe supportées:
 * @see https://stripe.com/docs/api/checkout/sessions/create#create_checkout_session-locale
 */
export function detectStripeLocale(
  language: string | undefined | null
): string {
  if (!language) {
    return "fr"; // Français par défaut
  }

  // Normaliser la langue (minuscule, premiers 2 caractères)
  const lang = language.toLowerCase().slice(0, 2);

  // Mapping SOS-Expat -> Stripe locales
  const localeMap: Record<string, string> = {
    fr: "fr", // Français
    en: "en", // English
    es: "es", // Español
    de: "de", // Deutsch
    pt: "pt-BR", // Português (Stripe utilise pt-BR pour le portugais)
    ru: "ru", // Русский
    ch: "zh", // 中文 (Chinese) - Stripe utilise 'zh' pour le chinois
    hi: "en", // हिन्दी (Hindi) - Pas supporté par Stripe, fallback en anglais
    ar: "ar", // العربية (Arabic)
  };

  return localeMap[lang] || "en"; // Fallback anglais si langue inconnue
}

// ============================================================================
// GET BILLING PORTAL URL
// ============================================================================

/**
 * Génère une URL vers le Stripe Billing Portal pour le provider authentifié
 *
 * @param returnUrl - URL de retour après fermeture du portal (optionnel)
 * @returns { url: string } - L'URL du Billing Portal Stripe
 *
 * Erreurs possibles:
 * - unauthenticated: L'utilisateur n'est pas connecté
 * - not-found: Pas d'abonnement trouvé pour ce provider
 * - internal: Erreur Stripe ou système
 */
export const getBillingPortalUrl = onCall<BillingPortalRequest>(
  {
    region: "europe-west3",
    // Pas besoin de secrets supplémentaires, getStripe() gère déjà ça
  },
  async (request): Promise<BillingPortalResponse> => {
    // 1. Vérifier authentification du provider
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Vous devez être connecté pour accéder au portail de facturation"
      );
    }

    const providerId = request.auth.uid;
    const { returnUrl } = request.data || {};

    try {
      const db = admin.firestore();
      const stripe = getStripe();

      if (!stripe) {
        throw new HttpsError(
          "internal",
          "Stripe n'est pas configuré. Contactez le support."
        );
      }

      // 2. Récupérer stripeCustomerId depuis subscriptions/{providerId}
      const subscriptionDoc = await db
        .doc(`subscriptions/${providerId}`)
        .get();

      let stripeCustomerId: string | undefined;

      if (subscriptionDoc.exists) {
        stripeCustomerId = subscriptionDoc.data()?.stripeCustomerId;
      }

      // 3. Si pas de customer, créer un nouveau Stripe Customer
      if (!stripeCustomerId) {
        // Récupérer les infos du provider pour créer le customer
        const providerDoc = await db.doc(`providers/${providerId}`).get();

        if (!providerDoc.exists) {
          // Essayer dans users si pas dans providers
          const userDoc = await db.doc(`users/${providerId}`).get();

          if (!userDoc.exists) {
            throw new HttpsError(
              "not-found",
              "Profil provider non trouvé. Veuillez compléter votre profil."
            );
          }

          const userData = userDoc.data()!;

          // Créer le customer Stripe
          const customer = await stripe.customers.create({
            email: userData.email,
            name:
              userData.displayName ||
              `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
              userData.email,
            metadata: {
              providerId,
              source: "sos-expat",
              createdFrom: "billing-portal",
            },
          }, {
            idempotencyKey: `cust_create_${providerId}_billing_user`.substring(0, 255),
          });

          stripeCustomerId = customer.id;

          // Sauvegarder le customerId dans subscriptions
          await db.doc(`subscriptions/${providerId}`).set(
            {
              providerId,
              stripeCustomerId: customer.id,
              createdAt: admin.firestore.Timestamp.now(),
              updatedAt: admin.firestore.Timestamp.now(),
            },
            { merge: true }
          );

          console.log(
            `Created new Stripe customer ${customer.id} for provider ${providerId}`
          );
        } else {
          const providerData = providerDoc.data()!;

          // Créer le customer Stripe
          const customer = await stripe.customers.create({
            email: providerData.email,
            name:
              providerData.displayName ||
              `${providerData.firstName || ""} ${providerData.lastName || ""}`.trim() ||
              providerData.email,
            metadata: {
              providerId,
              source: "sos-expat",
              createdFrom: "billing-portal",
            },
          }, {
            idempotencyKey: `cust_create_${providerId}_billing_provider`.substring(0, 255),
          });

          stripeCustomerId = customer.id;

          // Sauvegarder le customerId dans subscriptions
          await db.doc(`subscriptions/${providerId}`).set(
            {
              providerId,
              stripeCustomerId: customer.id,
              createdAt: admin.firestore.Timestamp.now(),
              updatedAt: admin.firestore.Timestamp.now(),
            },
            { merge: true }
          );

          console.log(
            `Created new Stripe customer ${customer.id} for provider ${providerId}`
          );
        }
      }

      // 4. Récupérer la langue préférée du provider pour la locale
      let preferredLanguage = "fr";
      try {
        const providerDoc = await db.doc(`providers/${providerId}`).get();
        if (providerDoc.exists) {
          preferredLanguage =
            providerDoc.data()?.preferredLanguage ||
            providerDoc.data()?.language ||
            "fr";
        } else {
          const userDoc = await db.doc(`users/${providerId}`).get();
          if (userDoc.exists) {
            preferredLanguage =
              userDoc.data()?.preferredLanguage ||
              userDoc.data()?.language ||
              "fr";
          }
        }
      } catch (langError) {
        console.warn("Could not fetch provider language, using default fr");
      }

      // 5. Créer une session Billing Portal
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url:
          returnUrl || APP_URLS.SUBSCRIPTION_DASHBOARD,
        locale: detectStripeLocale(preferredLanguage) as any,
      });

      console.log(
        `Billing portal session created for provider ${providerId}: ${session.id}`
      );

      // 6. Retourner l'URL
      return { url: session.url };
    } catch (error: any) {
      console.error("Error creating billing portal session:", error);

      // Gérer les erreurs Stripe spécifiques
      if (error.type === "StripeInvalidRequestError") {
        if (error.code === "resource_missing") {
          throw new HttpsError(
            "not-found",
            "Le client Stripe n'existe plus. Veuillez contacter le support."
          );
        }
      }

      // Si c'est déjà une HttpsError, la relancer
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        error.message || "Erreur lors de la création de la session de facturation"
      );
    }
  }
);
