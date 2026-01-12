/**
 * =============================================================================
 * ON PROVIDER CREATED - AUTOMATIC PAYMENT ACCOUNT SETUP (STRIPE OR PAYPAL)
 * =============================================================================
 *
 * Ce trigger configure automatiquement le compte de paiement lorsqu'un provider
 * (lawyer ou expat) est créé dans la collection sos_profiles.
 *
 * FONCTIONNALITÉS:
 *
 * STRIPE (46 pays supportés):
 * - Création automatique du compte Stripe Express après inscription
 * - Configuration des capabilities (card_payments, transfers)
 * - Sauvegarde du stripeAccountId dans Firestore
 * - Status initial: stripeAccountStatus = 'pending_verification'
 * - Provider NON visible jusqu'à approbation admin (isVisible = false)
 *
 * PAYPAL (151+ pays non supportés par Stripe):
 * - Pas de création automatique de compte
 * - Provider NON visible jusqu'à connexion PayPal
 * - Status initial: paypalAccountStatus = 'not_connected'
 * - Rappels envoyés pour inciter à connecter PayPal
 *
 * ARCHITECTURE:
 * - Trigger sur: sos_profiles/{uid}
 * - Condition: type = 'lawyer' ou 'expat'
 * - Détermination gateway: basée sur le pays du provider
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import { defineSecret, defineString } from "firebase-functions/params";
import { getStorage } from "firebase-admin/storage";
import { META_CAPI_TOKEN, trackCAPILead, UserData } from "../metaConversionsApi";

// Secrets Stripe
const STRIPE_SECRET_KEY_TEST = defineSecret("STRIPE_SECRET_KEY_TEST");
const STRIPE_SECRET_KEY_LIVE = defineSecret("STRIPE_SECRET_KEY_LIVE");
const STRIPE_MODE = defineString("STRIPE_MODE");

// =============================================================================
// SLUG GENERATION UTILITIES (SEO URLs)
// =============================================================================

const SHORT_ID_CHARS = '23456789abcdefghjkmnpqrstuvwxyz';

function generateShortId(firebaseUid: string): string {
  let hash = 0;
  for (let i = 0; i < firebaseUid.length; i++) {
    const char = firebaseUid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const absHash = Math.abs(hash);
  let shortId = '';
  let remaining = absHash;
  for (let i = 0; i < 6; i++) {
    shortId += SHORT_ID_CHARS[remaining % SHORT_ID_CHARS.length];
    remaining = Math.floor(remaining / SHORT_ID_CHARS.length);
  }
  return shortId;
}

function slugify(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

const ROLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  lawyer: { fr: 'avocat', en: 'lawyer', es: 'abogado', pt: 'advogado', de: 'anwalt', ru: 'advokat', zh: 'lawyer', ar: 'lawyer', hi: 'lawyer' },
  expat: { fr: 'expatrie', en: 'expat', es: 'expatriado', pt: 'expatriado', de: 'expat', ru: 'expat', zh: 'expat', ar: 'expat', hi: 'expat' },
};

const COUNTRY_TRANSLATIONS: Record<string, Record<string, string>> = {
  'France': { fr: 'france', en: 'france', es: 'francia', de: 'frankreich' },
  'Thaïlande': { fr: 'thailande', en: 'thailand', es: 'tailandia', de: 'thailand' },
  'Thailand': { fr: 'thailande', en: 'thailand', es: 'tailandia', de: 'thailand' },
  'Allemagne': { fr: 'allemagne', en: 'germany', es: 'alemania', de: 'deutschland' },
  'Germany': { fr: 'allemagne', en: 'germany', es: 'alemania', de: 'deutschland' },
};

const DEFAULT_LOCALES: Record<string, string> = {
  'fr': 'fr', 'en': 'us', 'es': 'es', 'de': 'de', 'pt': 'br',
  'ru': 'ru', 'zh': 'cn', 'ar': 'sa', 'hi': 'in'
};

function getRoleTranslation(role: string, lang: string): string {
  return ROLE_TRANSLATIONS[role]?.[lang] || (role === 'lawyer' ? 'lawyer' : 'expat');
}

function getCountryTranslation(country: string, lang: string): string {
  return COUNTRY_TRANSLATIONS[country]?.[lang] || slugify(country);
}

function generateSlugForLang(firstName: string, role: string, country: string, specialty: string, shortId: string, lang: string): string {
  const roleWord = getRoleTranslation(role, lang);
  const countryWord = getCountryTranslation(country, lang);
  const categoryCountry = `${roleWord}-${countryWord}`;
  const firstNameSlug = slugify(firstName);
  const specialtySlug = slugify(specialty).substring(0, 15);
  const localeRegion = DEFAULT_LOCALES[lang] || lang;
  const langLocale = `${lang}-${localeRegion}`;
  let namePart = specialtySlug ? `${firstNameSlug}-${specialtySlug}` : firstNameSlug;
  const maxNameLength = 70 - langLocale.length - categoryCountry.length - shortId.length - 4;
  if (namePart.length > maxNameLength) namePart = firstNameSlug;
  return `${langLocale}/${categoryCountry}/${namePart}-${shortId}`;
}

function generateMultilingualSlugs(firstName: string, role: string, country: string, specialty: string, shortId: string): Record<string, string> {
  const langs = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];
  const slugs: Record<string, string> = {};
  for (const lang of langs) {
    slugs[lang] = generateSlugForLang(firstName, role, country, specialty, shortId, lang);
  }
  return slugs;
}

// Interface pour les données du profil provider
interface ProviderProfileData {
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  type?: "lawyer" | "expat" | string;
  role?: string;
  country?: string;
  currentCountry?: string;
  residenceCountry?: string;
  // Specialties
  specialties?: string[];
  helpTypes?: string[];
  // Photo fields
  profilePhoto?: string;
  photoURL?: string;
  avatar?: string;
  // Contact fields
  phone?: string;
  phoneNumber?: string;
  city?: string;
  // Stripe fields (peuvent déjà exister si créé manuellement)
  stripeAccountId?: string;
  stripeAccountStatus?: string;
  // AAA Profile fields (profils gérés en interne)
  isAAA?: boolean;
  isTestProfile?: boolean;
  isSOS?: boolean;
  aaaPayoutMode?: string;
  kycDelegated?: boolean;
  // Meta/Facebook tracking fields
  fbp?: string;
  fbc?: string;
  fbclid?: string;
}

// Mapping pays vers code Stripe
const COUNTRY_CODE_MAP: Record<string, string> = {
  "france": "FR",
  "germany": "DE",
  "spain": "ES",
  "italy": "IT",
  "portugal": "PT",
  "belgium": "BE",
  "netherlands": "NL",
  "switzerland": "CH",
  "austria": "AT",
  "united kingdom": "GB",
  "uk": "GB",
  "ireland": "IE",
  "poland": "PL",
  "czech republic": "CZ",
  "hungary": "HU",
  "romania": "RO",
  "bulgaria": "BG",
  "croatia": "HR",
  "greece": "GR",
  "sweden": "SE",
  "norway": "NO",
  "denmark": "DK",
  "finland": "FI",
  "luxembourg": "LU",
  "united states": "US",
  "usa": "US",
  "canada": "CA",
  "australia": "AU",
  "new zealand": "NZ",
  "japan": "JP",
  "singapore": "SG",
  "hong kong": "HK",
  "india": "IN",
  "brazil": "BR",
  "mexico": "MX",
};

// Pays supportés par Stripe Connect Express (46 pays)
// Ces pays peuvent avoir un compte Stripe Express créé automatiquement
const STRIPE_SUPPORTED_COUNTRIES = new Set([
  "AU", "AT", "BE", "BG", "BR", "CA", "HR", "CY", "CZ", "DK",
  "EE", "FI", "FR", "DE", "GI", "GR", "HK", "HU", "IE", "IT",
  "JP", "LV", "LI", "LT", "LU", "MY", "MT", "MX", "NL", "NZ",
  "NO", "PL", "PT", "RO", "SG", "SK", "SI", "ES", "SE", "CH",
  "TH", "AE", "GB", "US",
]);

// Pays où SEUL PayPal est disponible (Stripe non supporté)
// Ces pays nécessitent une connexion PayPal AVANT d'être visibles
// Liste synchronisée avec PayPalManager.ts
const PAYPAL_ONLY_COUNTRIES = new Set([
  // ===== AFRIQUE (54 pays) =====
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG", "CD",
  "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE",
  "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG",
  "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG",
  "ZM", "ZW",

  // ===== ASIE (35 pays - non couverts par Stripe) =====
  "AF", "BD", "BT", "IN", "KH", "LA", "MM", "NP", "PK", "LK", "TJ", "TM", "UZ", "VN",
  "MN", "KP", "KG", "PS", "YE", "OM", "QA", "KW", "BH", "JO", "LB", "AM", "AZ", "GE",
  "MV", "BN", "TL", "PH", "ID", "TW", "KR",

  // ===== AMERIQUE LATINE & CARAIBES (25 pays) =====
  "BO", "CU", "EC", "SV", "GT", "HN", "NI", "PY", "SR", "VE",
  "HT", "DO", "JM", "TT", "BB", "BS", "BZ", "GY", "PA", "CR",
  "AG", "DM", "GD", "KN", "LC", "VC",

  // ===== EUROPE DE L'EST & BALKANS (15 pays non Stripe) =====
  "BY", "MD", "UA", "RS", "BA", "MK", "ME", "AL", "XK", "RU",
  "GI", "AD", "MC", "SM", "VA",

  // ===== OCEANIE & PACIFIQUE (15 pays) =====
  "FJ", "PG", "SB", "VU", "WS", "TO", "KI", "FM", "MH", "PW",
  "NR", "TV", "NC", "PF", "GU",

  // ===== MOYEN-ORIENT (7 pays restants) =====
  "IQ", "IR", "SY", "SA", "LY", "TM", "AF",
]);

/**
 * Migre l'image de profil de registration_temp vers profilePhotos/{userId}
 * - Copie le fichier vers le nouvel emplacement
 * - Met à jour les URLs dans Firestore
 * - Supprime l'ancien fichier
 *
 * @returns La nouvelle URL ou null si pas de migration nécessaire
 */
async function migrateProfileImage(
  uid: string,
  photoUrl: string | undefined,
  providerType: string
): Promise<string | null> {
  // Vérifier si migration nécessaire
  if (!photoUrl || !photoUrl.includes("registration_temp")) {
    console.log(`[migrateProfileImage] Pas de migration nécessaire pour ${uid}`);
    return null;
  }

  console.log(`[migrateProfileImage] Migration de l'image pour ${uid}...`);

  try {
    const bucket = getStorage().bucket();

    // Extraire le chemin du fichier depuis l'URL Firebase Storage
    // URL format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?...
    const urlObj = new URL(photoUrl);
    const encodedPath = urlObj.pathname.split("/o/")[1]?.split("?")[0];

    if (!encodedPath) {
      console.error(`[migrateProfileImage] Impossible d'extraire le chemin depuis: ${photoUrl}`);
      return null;
    }

    const oldPath = decodeURIComponent(encodedPath);
    const fileName = oldPath.split("/").pop();

    if (!fileName) {
      console.error(`[migrateProfileImage] Impossible d'extraire le nom de fichier depuis: ${oldPath}`);
      return null;
    }

    const newPath = `profilePhotos/${uid}/${fileName}`;

    console.log(`[migrateProfileImage] Copie: ${oldPath} -> ${newPath}`);

    // Vérifier que le fichier source existe
    const [sourceExists] = await bucket.file(oldPath).exists();
    if (!sourceExists) {
      console.warn(`[migrateProfileImage] Fichier source introuvable: ${oldPath}`);
      return null;
    }

    // Copier le fichier vers le nouvel emplacement
    await bucket.file(oldPath).copy(bucket.file(newPath));

    // Rendre le nouveau fichier public (comme l'ancien)
    await bucket.file(newPath).makePublic();

    // Construire la nouvelle URL
    const bucketName = bucket.name;
    const newUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(newPath)}?alt=media`;

    console.log(`[migrateProfileImage] Nouvelle URL: ${newUrl}`);

    // Mettre à jour Firestore avec la nouvelle URL
    const updateData = {
      profilePhoto: newUrl,
      photoURL: newUrl,
      avatar: newUrl,
      profilePhotoMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const batch = admin.firestore().batch();

    // Mettre à jour sos_profiles
    batch.update(admin.firestore().collection("sos_profiles").doc(uid), updateData);

    // Mettre à jour la collection spécifique (lawyers ou expats)
    const collectionName = providerType === "lawyer" ? "lawyers" : "expats";
    batch.set(
      admin.firestore().collection(collectionName).doc(uid),
      updateData,
      { merge: true }
    );

    // Mettre à jour users
    batch.set(
      admin.firestore().collection("users").doc(uid),
      updateData,
      { merge: true }
    );

    await batch.commit();

    console.log(`[migrateProfileImage] Firestore mis à jour pour ${uid}`);

    // Supprimer l'ancien fichier (en arrière-plan, sans bloquer)
    bucket.file(oldPath).delete().then(() => {
      console.log(`[migrateProfileImage] Ancien fichier supprimé: ${oldPath}`);
    }).catch((err) => {
      // Log mais ne pas échouer si la suppression échoue
      console.warn(`[migrateProfileImage] Échec suppression ancien fichier: ${oldPath}`, err);
    });

    console.log(`[migrateProfileImage] ✅ Migration réussie pour ${uid}`);
    return newUrl;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[migrateProfileImage] ❌ Erreur migration pour ${uid}: ${errorMessage}`, error);
    // Ne pas échouer le trigger entier si la migration échoue
    // L'ancienne URL fonctionne toujours
    return null;
  }
}

/**
 * Type de gateway de paiement recommandé
 */
type PaymentGateway = "stripe" | "paypal";

/**
 * Détermine le gateway de paiement approprié pour un pays
 */
function getPaymentGateway(countryCode: string): PaymentGateway {
  const normalized = countryCode.toUpperCase();

  // Si le pays supporte Stripe Connect, utiliser Stripe
  if (STRIPE_SUPPORTED_COUNTRIES.has(normalized)) {
    return "stripe";
  }

  // Log si c'est un pays PayPal-only connu vs inconnu
  if (PAYPAL_ONLY_COUNTRIES.has(normalized)) {
    console.log(`[getPaymentGateway] ${normalized} est un pays PayPal-only connu`);
  } else {
    console.log(`[getPaymentGateway] ${normalized} n'est pas dans la liste Stripe, utilisation de PayPal par défaut`);
  }

  // Sinon, utiliser PayPal
  return "paypal";
}

/**
 * Normalise le code pays pour Stripe
 */
function normalizeCountryCode(country?: string): string {
  if (!country) return "FR"; // Default: France

  // Si déjà un code ISO à 2 lettres
  if (country.length === 2) {
    return country.toUpperCase();
  }

  // Chercher dans le mapping
  const normalized = country.toLowerCase().trim();
  return COUNTRY_CODE_MAP[normalized] || "FR";
}

/**
 * Détermine le business_type basé sur le type de provider
 */
function getBusinessType(providerType?: string): Stripe.AccountCreateParams.BusinessType {
  // Les lawyers sont généralement des professionnels indépendants
  // Les expats peuvent être des particuliers ou indépendants
  switch (providerType) {
    case "lawyer":
      return "individual"; // Avocat = professionnel individuel
    case "expat":
      return "individual"; // Expat = particulier
    default:
      return "individual";
  }
}

/**
 * Initialise Stripe avec la bonne clé selon le mode
 */
function initStripe(): Stripe | null {
  const mode = (STRIPE_MODE.value() || "test").toLowerCase();
  const secretKey = mode === "live"
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST;

  if (!secretKey || !secretKey.startsWith("sk_")) {
    console.error("[onProviderCreated] Stripe secret key not configured or invalid");
    return null;
  }

  return new Stripe(secretKey, {
    apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
  });
}

/**
 * Trigger: sos_profiles/{uid} - onCreate
 * Crée automatiquement un compte Stripe Express pour les nouveaux providers
 */
export const onProviderCreated = onDocumentCreated(
  {
    document: "sos_profiles/{uid}",
    region: "europe-west1",
    secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE, META_CAPI_TOKEN],
  },
  async (event) => {
    const uid = event.params.uid;
    const data = event.data?.data() as ProviderProfileData | undefined;

    console.log(`[onProviderCreated] Nouveau profil créé: ${uid}`);

    if (!data) {
      console.warn("[onProviderCreated] Pas de données pour:", uid);
      return;
    }

    // Vérifier le type de provider
    const providerType = data.type || data.role;
    if (providerType !== "lawyer" && providerType !== "expat") {
      console.log(`[onProviderCreated] Type non éligible: ${providerType} pour: ${uid}`);
      return;
    }

    // ========== META CAPI TRACKING ==========
    // Track Lead event for provider signup (lawyer or expat registration)
    try {
      const userData: UserData = {
        external_id: uid,
      };

      // Email
      if (data.email) {
        userData.em = data.email.toLowerCase().trim();
      }

      // Phone
      if (data.phone || data.phoneNumber) {
        userData.ph = (data.phone || data.phoneNumber)?.replace(/[^0-9+]/g, "");
      }

      // Names
      if (data.firstName) {
        userData.fn = data.firstName.toLowerCase().trim();
      }
      if (data.lastName) {
        userData.ln = data.lastName.toLowerCase().trim();
      }

      // Location
      if (data.country || data.residenceCountry || data.currentCountry) {
        userData.country = (data.country || data.residenceCountry || data.currentCountry)?.toLowerCase().trim();
      }
      if (data.city) {
        userData.ct = data.city.toLowerCase().trim();
      }

      // Facebook identifiers (if captured during registration)
      if (data.fbp) userData.fbp = data.fbp;
      if (data.fbc) userData.fbc = data.fbc;
      if (data.fbclid) userData.fbc = `fb.1.${Date.now()}.${data.fbclid}`;

      const capiResult = await trackCAPILead({
        userData,
        contentName: `${providerType}_signup`,
        contentCategory: providerType,
        eventSourceUrl: "https://sos-expat.com/become-provider",
      });

      if (capiResult.success) {
        console.log(`✅ [CAPI Provider] Lead tracked for ${providerType} ${uid}`, {
          eventId: capiResult.eventId,
        });

        // Store CAPI tracking info
        await admin.firestore().collection("sos_profiles").doc(uid).update({
          "capiTracking.signupLeadEventId": capiResult.eventId,
          "capiTracking.signupTrackedAt": admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        console.warn(`⚠️ [CAPI Provider] Failed to track lead for ${uid}:`, capiResult.error);
      }
    } catch (capiError) {
      // Don't fail the trigger if CAPI tracking fails
      console.error(`❌ [CAPI Provider] Error tracking lead for ${uid}:`, capiError);
    }
    // ========== END META CAPI TRACKING ==========

    // ⚠️ CORRECTION CRITIQUE: Définir les Custom Claims Firebase pour le provider
    // Sans cela, les Firestore Rules qui utilisent request.auth.token.role ne fonctionnent pas
    try {
      await admin.auth().setCustomUserClaims(uid, { role: providerType });
      console.log(`[onProviderCreated] ✅ Custom Claims définis: role=${providerType} pour: ${uid}`);
    } catch (claimsError) {
      console.error(`[onProviderCreated] ❌ Erreur définition Custom Claims pour ${uid}:`, claimsError);
      // Continuer même si les claims échouent - on peut les définir manuellement plus tard
    }

    // 🔗 GÉNÉRATION AUTOMATIQUE DES SLUGS SEO
    // Format: {lang}-{locale}/{role-pays}/{prenom-specialite-shortid}
    try {
      const shortId = generateShortId(uid);
      const specialty = providerType === 'lawyer'
        ? (Array.isArray(data.specialties) ? data.specialties[0] : '')
        : (Array.isArray(data.helpTypes) ? data.helpTypes[0] : '');
      const slugs = generateMultilingualSlugs(
        data.firstName || 'profil',
        providerType,
        data.country || data.residenceCountry || '',
        specialty || '',
        shortId
      );
      await admin.firestore().collection("sos_profiles").doc(uid).update({
        shortId,
        slugs,
        slugsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[onProviderCreated] ✅ Slugs SEO générés pour: ${uid}`);
      console.log(`[onProviderCreated] 🇫🇷 FR: ${slugs.fr}`);
      console.log(`[onProviderCreated] 🇺🇸 EN: ${slugs.en}`);
    } catch (slugError) {
      console.error(`[onProviderCreated] ❌ Erreur génération slugs pour ${uid}:`, slugError);
      // Non-bloquant: le profil peut fonctionner sans slugs SEO
    }

    // 📸 Migrer l'image de profil de registration_temp vers profilePhotos/{userId}
    // Cette opération est non-bloquante : si elle échoue, l'ancienne URL fonctionne toujours
    const photoUrl = data.profilePhoto || data.photoURL || data.avatar;
    await migrateProfileImage(uid, photoUrl, providerType);

    // ⚠️ PROFILS AAA: Ignorer la création automatique de compte Stripe/PayPal
    // Les profils AAA (gérés en interne par SOS-Expat) utilisent le système de paiement consolidé
    // Ils ont kycDelegated=true et kycStatus='not_required'
    const isAaaProfile = data.isAAA === true ||
                         data.isTestProfile === true ||
                         data.isSOS === true ||
                         uid.startsWith("aaa_");
    if (isAaaProfile) {
      console.log(`[onProviderCreated] ⚠️ Profil AAA détecté: ${uid} - Skip création compte paiement automatique`);
      console.log(`[onProviderCreated] ✅ Profil AAA prêt avec système de paiement consolidé`);
      return;
    }

    // Vérifier si un compte Stripe existe déjà
    if (data.stripeAccountId) {
      console.log(`[onProviderCreated] Compte Stripe déjà existant: ${data.stripeAccountId} pour: ${uid}`);
      return;
    }

    // Vérifier l'email
    if (!data.email) {
      console.error(`[onProviderCreated] Email manquant pour: ${uid}`);
      // Marquer le profil comme nécessitant attention
      await admin.firestore().collection("sos_profiles").doc(uid).update({
        stripeAccountStatus: "error_missing_email",
        stripeError: "Email is required to create Stripe account",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    // Initialiser Stripe
    const stripe = initStripe();
    if (!stripe) {
      console.error("[onProviderCreated] Stripe non configuré");
      await admin.firestore().collection("sos_profiles").doc(uid).update({
        stripeAccountStatus: "error_stripe_config",
        stripeError: "Stripe is not configured",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    // Normaliser le pays
    const countryCode = normalizeCountryCode(data.country || data.currentCountry);
    console.log(`[onProviderCreated] Pays normalisé: ${countryCode}`);

    // Déterminer le gateway de paiement approprié
    const paymentGateway = getPaymentGateway(countryCode);
    console.log(`[onProviderCreated] Gateway de paiement: ${paymentGateway} pour ${providerType}: ${uid}`);

    // Déterminer la collection spécifique
    const collectionName = providerType === "lawyer" ? "lawyers" : "expats";

    if (paymentGateway === "stripe") {
      // ===== STRIPE: Création automatique du compte Express =====
      await handleStripeProvider(uid, data, providerType, countryCode, collectionName, stripe);
    } else {
      // ===== PAYPAL: Pas de création automatique, provider non visible =====
      await handlePayPalProvider(uid, data, providerType, countryCode, collectionName);
    }
  }
);

/**
 * Gère la création d'un provider Stripe
 * - Crée automatiquement le compte Stripe Express
 * - Provider visible immédiatement
 */
async function handleStripeProvider(
  uid: string,
  data: ProviderProfileData,
  providerType: string,
  countryCode: string,
  collectionName: string,
  stripe: Stripe
): Promise<void> {
  try {
    console.log(`[onProviderCreated] Création compte Stripe Express pour ${providerType}: ${uid}`);

    // Créer le compte Stripe Express
    const account = await stripe.accounts.create({
      type: "express",
      country: countryCode,
      email: data.email!,
      business_type: getBusinessType(providerType),
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: {
        platform: "sos-expat",
        userId: uid,
        userType: providerType,
        createdBy: "onProviderCreated_trigger",
        createdAt: new Date().toISOString(),
      },
      settings: {
        payouts: {
          schedule: {
            interval: "manual", // Les payouts seront déclenchés manuellement par la plateforme
          },
        },
      },
    });

    console.log(`[onProviderCreated] Compte Stripe créé avec succès: ${account.id}`);

    // Données Stripe à sauvegarder
    // ⚠️ CORRECTION: isVisible = false jusqu'à approbation admin
    // Les providers ne doivent pas être visibles avant validation manuelle
    const stripeData = {
      stripeAccountId: account.id,
      stripeAccountType: "express",
      stripeAccountStatus: "pending_verification",
      kycStatus: "not_started",
      stripeOnboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      paymentGateway: "stripe" as const,
      isVisible: false, // ⚠️ Provider NON visible jusqu'à approbation admin
      stripeCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Mettre à jour toutes les collections pertinentes
    const batch = admin.firestore().batch();

    // 1. sos_profiles (source)
    batch.update(admin.firestore().collection("sos_profiles").doc(uid), stripeData);

    // 2. Collection spécifique (lawyers ou expats)
    batch.set(
      admin.firestore().collection(collectionName).doc(uid),
      {
        ...stripeData,
        email: data.email,
        type: providerType,
      },
      { merge: true }
    );

    // 3. users (si existe)
    batch.set(
      admin.firestore().collection("users").doc(uid),
      stripeData,
      { merge: true }
    );

    await batch.commit();

    console.log(`[onProviderCreated] Données Stripe sauvegardées dans sos_profiles, ${collectionName}, et users pour: ${uid}`);

    // Log d'audit
    await admin.firestore().collection("stripe_account_logs").add({
      userId: uid,
      stripeAccountId: account.id,
      action: "created",
      providerType: providerType,
      country: countryCode,
      trigger: "onProviderCreated",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[onProviderCreated] Compte Stripe Express créé avec succès pour ${providerType}: ${uid}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const stripeErrorCode = (error as any)?.code || "unknown";

    console.error(`[onProviderCreated] Erreur création compte Stripe: ${errorMessage}`, error);

    // Sauvegarder l'erreur dans le profil
    await admin.firestore().collection("sos_profiles").doc(uid).update({
      stripeAccountStatus: "error",
      stripeError: errorMessage,
      stripeErrorCode: stripeErrorCode,
      stripeErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log d'erreur
    await admin.firestore().collection("stripe_account_logs").add({
      userId: uid,
      action: "creation_failed",
      error: errorMessage,
      errorCode: stripeErrorCode,
      providerType: providerType,
      trigger: "onProviderCreated",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Gère la configuration d'un provider PayPal
 * - Pas de création automatique de compte
 * - Provider NON visible jusqu'à connexion PayPal
 * - Premier rappel programmé
 */
async function handlePayPalProvider(
  uid: string,
  data: ProviderProfileData,
  providerType: string,
  countryCode: string,
  collectionName: string
): Promise<void> {
  console.log(`[onProviderCreated] Configuration PayPal pour ${providerType}: ${uid} (pays: ${countryCode})`);

  // Données PayPal à sauvegarder
  // IMPORTANT: isVisible = false car le provider doit d'abord connecter son compte PayPal
  const paypalData = {
    paymentGateway: "paypal" as const,
    paypalAccountStatus: "not_connected",
    paypalMerchantId: null,
    paypalOnboardingComplete: false,
    paypalPaymentsReceivable: false,
    paypalRemindersCount: 0,
    paypalLastReminderAt: null,
    isVisible: false, // ⚠️ Provider PayPal NON visible jusqu'à connexion
    isPaymentAccountRequired: true,
    paymentAccountRequiredReason: "PayPal connection required before receiving payments",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Mettre à jour toutes les collections pertinentes
  const batch = admin.firestore().batch();

  // 1. sos_profiles (source)
  batch.update(admin.firestore().collection("sos_profiles").doc(uid), paypalData);

  // 2. Collection spécifique (lawyers ou expats)
  batch.set(
    admin.firestore().collection(collectionName).doc(uid),
    {
      ...paypalData,
      email: data.email,
      type: providerType,
    },
    { merge: true }
  );

  // 3. users (si existe)
  batch.set(
    admin.firestore().collection("users").doc(uid),
    paypalData,
    { merge: true }
  );

  await batch.commit();

  console.log(`[onProviderCreated] Données PayPal sauvegardées pour: ${uid}`);

  // Créer une notification pour le provider
  await admin.firestore().collection("notifications").add({
    userId: uid,
    type: "paypal_connection_required",
    title: "Connexion PayPal requise",
    message: "Pour recevoir des paiements et être visible sur la plateforme, " +
      "veuillez connecter votre compte PayPal. " +
      "Cela ne prend que quelques minutes.",
    data: {
      action: "connect_paypal",
      priority: "high",
    },
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Log d'audit
  await admin.firestore().collection("paypal_account_logs").add({
    userId: uid,
    action: "paypal_required",
    providerType: providerType,
    country: countryCode,
    trigger: "onProviderCreated",
    message: "Provider created in PayPal-only country, connection required",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Programmer le premier rappel PayPal (sera géré par PayPalReminderManager)
  await admin.firestore().collection("paypal_reminder_queue").add({
    userId: uid,
    email: data.email,
    providerType: providerType,
    country: countryCode,
    reminderNumber: 1,
    scheduledFor: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 heures
    ),
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[onProviderCreated] Provider PayPal configuré, rappel programmé pour: ${uid}`);
}
