/**
 * CLOUD FUNCTION: Migration des slugs prestataires
 * =================================================
 *
 * Migre les slugs existants vers le nouveau format SEO optimise.
 * Format: /{lang}/{role-pays}/{prenom-specialite-shortid}
 *
 * USAGE:
 * - Appeler via HTTP: POST /migrateProviderSlugs
 * - Body: { "dryRun": true, "batchSize": 50 }
 */

import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

// Caracteres alphanumeriques pour shortId (sans caracteres ambigus)
const SHORT_ID_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";

/**
 * Genere un shortId de 6 caracteres a partir d'un Firebase UID
 */
function generateShortId(firebaseUid: string): string {
  let hash = 0;
  for (let i = 0; i < firebaseUid.length; i++) {
    const char = firebaseUid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const absHash = Math.abs(hash);
  let shortId = "";
  let remaining = absHash;

  for (let i = 0; i < 6; i++) {
    shortId += SHORT_ID_CHARS[remaining % SHORT_ID_CHARS.length];
    remaining = Math.floor(remaining / SHORT_ID_CHARS.length);
  }

  return shortId;
}

// Traductions des roles
const ROLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  lawyer: {
    fr: "avocat", en: "lawyer", es: "abogado", pt: "advogado", de: "anwalt",
    ru: "advokat", zh: "lawyer", ar: "lawyer", hi: "lawyer",
  },
  expat: {
    fr: "expatrie", en: "expat", es: "expatriado", pt: "expatriado", de: "expat",
    ru: "expat", zh: "expat", ar: "expat", hi: "expat",
  },
};

// Traductions des pays (simplifiees)
const COUNTRY_TRANSLATIONS: Record<string, Record<string, string>> = {
  "France": { fr: "france", en: "france", es: "francia", pt: "franca", de: "frankreich", ru: "frantsiya", zh: "france", ar: "france", hi: "france" },
  "Thaïlande": { fr: "thailande", en: "thailand", es: "tailandia", pt: "tailandia", de: "thailand", ru: "tailand", zh: "thailand", ar: "thailand", hi: "thailand" },
  "Allemagne": { fr: "allemagne", en: "germany", es: "alemania", pt: "alemanha", de: "deutschland", ru: "germaniya", zh: "germany", ar: "germany", hi: "germany" },
  "Espagne": { fr: "espagne", en: "spain", es: "espana", pt: "espanha", de: "spanien", ru: "ispaniya", zh: "spain", ar: "spain", hi: "spain" },
  "États-Unis": { fr: "etats-unis", en: "united-states", es: "estados-unidos", pt: "estados-unidos", de: "vereinigte-staaten", ru: "ssha", zh: "usa", ar: "usa", hi: "usa" },
  "Canada": { fr: "canada", en: "canada", es: "canada", pt: "canada", de: "kanada", ru: "kanada", zh: "canada", ar: "canada", hi: "canada" },
  "Royaume-Uni": { fr: "royaume-uni", en: "united-kingdom", es: "reino-unido", pt: "reino-unido", de: "vereinigtes-koenigreich", ru: "velikobritaniya", zh: "uk", ar: "uk", hi: "uk" },
  "Maroc": { fr: "maroc", en: "morocco", es: "marruecos", pt: "marrocos", de: "marokko", ru: "marokko", zh: "morocco", ar: "morocco", hi: "morocco" },
  "Japon": { fr: "japon", en: "japan", es: "japon", pt: "japao", de: "japan", ru: "yaponiya", zh: "japan", ar: "japan", hi: "japan" },
  "Chine": { fr: "chine", en: "china", es: "china", pt: "china", de: "china", ru: "kitai", zh: "china", ar: "china", hi: "china" },
};

/**
 * Slugifier une chaine
 */
function slugify(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

/**
 * Traduit le role selon la langue
 */
function getRoleTranslation(role: "lawyer" | "expat", lang: string): string {
  return ROLE_TRANSLATIONS[role]?.[lang] || (role === "lawyer" ? "lawyer" : "expat");
}

/**
 * Traduit le pays selon la langue
 */
function getCountryTranslation(country: string, lang: string): string {
  const translation = COUNTRY_TRANSLATIONS[country]?.[lang];
  if (translation) return translation;
  return slugify(country);
}

// Mapping lang -> default locale region
const DEFAULT_LOCALES: Record<string, string> = {
  "fr": "fr", "en": "us", "es": "es", "de": "de", "pt": "br",
  "ru": "ru", "zh": "cn", "ar": "sa", "hi": "in"
};

/**
 * Genere un slug pour une langue donnee
 * Format: {lang}-{locale}/{role-pays}/{prenom-specialite-shortid}
 * Ex: fr-fr/avocat-thailande/julien-visa-k7m2p9
 */
function generateSlugForLang(
  firstName: string,
  role: "lawyer" | "expat",
  country: string,
  specialty: string,
  shortId: string,
  lang: string,
  userCountry?: string
): string {
  const roleWord = getRoleTranslation(role, lang);
  const countryWord = getCountryTranslation(country, lang);
  const categoryCountry = `${roleWord}-${countryWord}`;
  const firstNameSlug = slugify(firstName);
  const specialtySlug = slugify(specialty).substring(0, 15);

  // Determiner le locale (region) - utiliser le pays du provider ou default
  const localeRegion = userCountry
    ? slugify(userCountry).substring(0, 2)
    : DEFAULT_LOCALES[lang] || lang;
  const langLocale = `${lang}-${localeRegion}`;

  let namePart = specialtySlug ? `${firstNameSlug}-${specialtySlug}` : firstNameSlug;

  // Truncate if needed (compte pour le format lang-locale)
  const maxNameLength = 70 - langLocale.length - categoryCountry.length - shortId.length - 4;
  if (namePart.length > maxNameLength) {
    namePart = firstNameSlug;
  }

  return `${langLocale}/${categoryCountry}/${namePart}-${shortId}`;
}

/**
 * Genere les slugs multilingues avec format {lang}-{locale}
 */
function generateMultilingualSlugs(
  firstName: string,
  role: "lawyer" | "expat",
  country: string,
  specialty: string,
  shortId: string,
  userCountry?: string
): Record<string, string> {
  const langs = ["fr", "en", "es", "de", "pt", "ru", "zh", "ar", "hi"];
  const slugs: Record<string, string> = {};

  for (const lang of langs) {
    slugs[lang] = generateSlugForLang(firstName, role, country, specialty, shortId, lang, userCountry);
  }

  return slugs;
}

/**
 * Cloud Function HTTP pour la migration
 */
export const migrateProviderSlugs = functions.onRequest(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 540,
    maxInstances: 1,
  },
  async (req, res) => {
    // Verifier la methode
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed. Use POST." });
      return;
    }

    // Verifier l'authentification admin (via token ou header secret)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized. Provide Bearer token." });
      return;
    }

    const token = authHeader.substring(7);
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      // Verifier que c'est un admin
      const userDoc = await admin.firestore().collection("sos_profiles").doc(decodedToken.uid).get();
      if (!userDoc.exists || userDoc.data()?.type !== "admin") {
        res.status(403).json({ error: "Forbidden. Admin access required." });
        return;
      }
    } catch (authError) {
      logger.error("Auth error:", authError);
      res.status(401).json({ error: "Invalid token." });
      return;
    }

    const { dryRun = true, batchSize = 50, limit: maxLimit = 0 } = req.body || {};

    logger.info("Starting migration", { dryRun, batchSize, maxLimit });

    const result = {
      total: 0,
      migrated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    try {
      const db = admin.firestore();
      let queryRef = db.collection("sos_profiles").where("isActive", "==", true);

      if (maxLimit > 0) {
        queryRef = queryRef.limit(maxLimit);
      }

      const snapshot = await queryRef.get();
      result.total = snapshot.size;

      logger.info(`Found ${result.total} providers to migrate`);

      const batch = db.batch();
      let batchCount = 0;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const providerId = docSnap.id;

        try {
          // Skip if already has shortId
          if (data.shortId && data.shortId.length === 6) {
            result.skipped++;
            continue;
          }

          const shortId = generateShortId(providerId);
          const role = data.type === "lawyer" ? "lawyer" : "expat";
          const specialty = role === "lawyer"
            ? (Array.isArray(data.specialties) ? data.specialties[0] : "")
            : (Array.isArray(data.helpTypes) ? data.helpTypes[0] : "");

          const providerCountry = data.country || data.residenceCountry || "";
          const slugs = generateMultilingualSlugs(
            data.firstName || "profil",
            role,
            providerCountry,
            specialty || "",
            shortId,
            providerCountry // userCountry pour le locale
          );

          logger.info(`Provider ${providerId}:`, {
            name: `${data.firstName} ${data.lastName?.charAt(0) || ""}.`,
            shortId,
            slugFr: slugs.fr,
            slugEn: slugs.en,
          });

          if (!dryRun) {
            batch.update(docSnap.ref, {
              shortId,
              slugs,
              slugsUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            batchCount++;

            if (batchCount >= batchSize) {
              await batch.commit();
              logger.info(`Committed batch of ${batchCount}`);
              batchCount = 0;
            }
          }

          result.migrated++;
        } catch (err) {
          const errorMsg = `Error for ${providerId}: ${err instanceof Error ? err.message : "Unknown"}`;
          logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Commit remaining
      if (!dryRun && batchCount > 0) {
        await batch.commit();
        logger.info(`Committed final batch of ${batchCount}`);
      }

      logger.info("Migration complete", result);
      res.json({
        success: true,
        dryRun,
        ...result,
      });
    } catch (err) {
      logger.error("Migration failed:", err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
        ...result,
      });
    }
  }
);
