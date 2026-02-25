/**
 * =============================================================================
 * PROVIDER CATALOG FEED FOR META DYNAMIC ADS
 * =============================================================================
 *
 * Cloud Function HTTP qui genere un feed catalogue de prestataires
 * au format Facebook Product Catalog pour les Dynamic Ads.
 *
 * URL: https://europe-west1-sos-expat.cloudfunctions.net/providerCatalogFeed
 *
 * Format: CSV avec les colonnes requises par Facebook:
 * - id, title, description, availability, condition, price, link,
 *   image_link, brand, google_product_category, custom_label_0/1/2
 *
 * FONCTIONNALITES:
 * - Lecture des prestataires actifs depuis Firestore (collection sos_profiles)
 * - Filtrage: isVisible=true, isBanned=false, isAdmin=false
 * - Support des types: lawyer et expat
 * - Tarification fixe: Avocats 49 EUR, Expats 19 EUR
 * - Custom labels: Pays, Ville, Langues
 *
 * DOCUMENTATION:
 * - Facebook Product Catalog: https://developers.facebook.com/docs/marketing-api/catalog/reference
 */

import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { onRequest } from "firebase-functions/v2/https";

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

// Configuration
const SITE_URL = "https://sos-expat.com";
const BRAND_NAME = "SOS Expat";

// Prix fixes par type de prestataire (en EUR)
const PRICING: Record<string, { price: number; duration: string }> = {
  lawyer: { price: 49, duration: "20 min" },
  expat: { price: 19, duration: "30 min" },
};

// Google Product Category for services
// 5032: Business & Industrial > Business Services
const GOOGLE_PRODUCT_CATEGORY = "Business & Industrial > Professional Services";

// Interface pour les donnees du profil prestataire
interface ProviderData {
  // Identification
  type?: "lawyer" | "expat" | string;
  role?: string;

  // Nom
  fullName?: string;
  name?: string;
  firstName?: string;
  lastName?: string;

  // Description
  bio?: string;
  description?: string;
  shortBio?: string;
  expertise?: string[];
  specialties?: string[];

  // Localisation
  country?: string;
  currentCountry?: string;
  city?: string;
  region?: string;

  // Langues
  languages?: string[];
  spokenLanguages?: string[];

  // Photo
  profilePhoto?: string;
  photoURL?: string;
  avatar?: string;

  // Slug pour URL
  slug?: string;

  // Visibilite
  isVisible?: boolean;
  isBanned?: boolean;
  isAdmin?: boolean;
  isApproved?: boolean;

  // Timestamps
  updatedAt?: admin.firestore.Timestamp;
  createdAt?: admin.firestore.Timestamp;
}

/**
 * Echappe les caracteres speciaux pour le format CSV
 * @param value - Valeur a echapper
 * @returns Valeur echappee pour CSV
 */
function escapeCSV(value: string | undefined | null): string {
  if (!value) return "";

  // Convertir en string et nettoyer
  let escaped = String(value).trim();

  // Remplacer les retours a la ligne par des espaces
  escaped = escaped.replace(/[\r\n]+/g, " ");

  // Si la valeur contient des virgules, guillemets ou espaces, l'entourer de guillemets
  if (escaped.includes(",") || escaped.includes('"') || escaped.includes(" ")) {
    // Echapper les guillemets doubles en les doublant
    escaped = escaped.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return escaped;
}

/**
 * Genere le nom complet du prestataire
 */
function getProviderName(data: ProviderData): string {
  if (data.fullName) return data.fullName;
  if (data.name) return data.name;
  if (data.firstName && data.lastName) {
    return `${data.firstName} ${data.lastName}`;
  }
  if (data.firstName) return data.firstName;
  return "Expert SOS Expat";
}

/**
 * Genere le titre pour le catalogue (nom + type)
 */
function getProviderTitle(data: ProviderData, _id: string): string {
  const name = getProviderName(data);
  const type = data.type || data.role || "expert";

  if (type === "lawyer") {
    return `${name} - Avocat`;
  } else if (type === "expat") {
    return `${name} - Expat Aidant`;
  }

  return `${name} - Expert`;
}

/**
 * Genere la description du service
 */
function getProviderDescription(data: ProviderData): string {
  // Priorite: bio > description > shortBio > expertise
  if (data.bio) return data.bio.substring(0, 500);
  if (data.description) return data.description.substring(0, 500);
  if (data.shortBio) return data.shortBio.substring(0, 500);

  // Generer une description par defaut
  const type = data.type || data.role || "expert";
  const name = getProviderName(data);
  const country = data.country || data.currentCountry || "";
  const city = data.city || "";
  const location = [city, country].filter(Boolean).join(", ");

  if (type === "lawyer") {
    const expertise = data.expertise?.join(", ") || data.specialties?.join(", ") || "droit international";
    return `Consultation juridique avec ${name}, avocat specialise en ${expertise}${location ? ` base a ${location}` : ""}. Premier contact rapide de 20 minutes pour repondre a vos questions juridiques.`;
  } else if (type === "expat") {
    return `Echange avec ${name}, expatrie experimente${location ? ` vivant a ${location}` : ""}. 30 minutes de conseils pratiques et partage d'experience pour reussir votre expatriation.`;
  }

  return `Consultation avec ${name}${location ? ` base a ${location}` : ""}. Service d'aide et de conseil pour expatries via SOS Expat.`;
}

/**
 * Genere l'URL du profil prestataire
 */
function getProviderUrl(data: ProviderData, id: string): string {
  const type = data.type || data.role || "expert";
  const routeType = type === "lawyer" ? "avocat" : "expatrie";

  // Generer le slug
  const name = getProviderName(data);
  const nameSlug =
    data.slug ||
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  // Ajouter l'ID si pas deja dans le slug
  const finalSlug = nameSlug.includes(id) ? nameSlug : `${nameSlug}-${id}`;

  // URL par defaut en francais
  return `${SITE_URL}/fr-fr/${routeType}/${finalSlug}`;
}

/**
 * Obtient l'URL de l'image du prestataire
 */
function getProviderImageUrl(data: ProviderData): string {
  // Priorite: profilePhoto > photoURL > avatar
  const imageUrl = data.profilePhoto || data.photoURL || data.avatar;

  if (imageUrl && imageUrl.startsWith("http")) {
    return imageUrl;
  }

  // Image par defaut si pas de photo
  // Utiliser une image generique du site
  return `${SITE_URL}/assets/images/default-provider-avatar.png`;
}

/**
 * Obtient le prix du service
 */
function getProviderPrice(data: ProviderData): string {
  const type = data.type || data.role || "expat";
  const pricing = PRICING[type] || PRICING.expat;
  return `${pricing.price}.00 EUR`;
}

/**
 * Formate les langues pour le custom label
 */
function getLanguagesLabel(data: ProviderData): string {
  const languages = data.languages || data.spokenLanguages || [];
  if (languages.length === 0) return "";

  // Prendre les 3 premieres langues
  return languages.slice(0, 3).join("|");
}

/**
 * Recupere tous les prestataires publics depuis Firestore
 * Avec pagination pour gerer les grandes collections
 */
async function getPublicProviders(): Promise<Array<{ id: string; data: ProviderData }>> {
  const db = admin.firestore();
  const allProviders: Array<{ id: string; data: ProviderData }> = [];
  let lastDoc: admin.firestore.DocumentSnapshot | null = null;
  const batchSize = 500;

  console.log("[providerCatalogFeed] Fetching public providers in batches...");

  while (true) {
    let query = db.collection("sos_profiles").limit(batchSize);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      break;
    }

    // Filtrer les prestataires publics
    const batch = snapshot.docs
      .filter((doc) => {
        const data = doc.data() as ProviderData;

        // Skip admins
        if (data.isAdmin === true) {
          return false;
        }

        // Check type (lawyer ou expat)
        const type = data.type || data.role;
        if (!type || !["lawyer", "expat"].includes(type)) {
          return false;
        }

        // isVisible: treat undefined/null as visible
        if (data.isVisible === false) {
          return false;
        }

        // isBanned: treat undefined/null as not banned
        if (data.isBanned === true) {
          return false;
        }

        return true;
      })
      .map((doc) => ({
        id: doc.id,
        data: doc.data() as ProviderData,
      }));

    allProviders.push(...batch);
    lastDoc = snapshot.docs[snapshot.docs.length - 1];

    console.log(`[providerCatalogFeed] Fetched ${batch.length} providers (total: ${allProviders.length})`);

    if (snapshot.docs.length < batchSize) {
      break;
    }
  }

  console.log(`[providerCatalogFeed] Total providers fetched: ${allProviders.length}`);
  return allProviders;
}

/**
 * Genere le feed CSV pour le catalogue Facebook
 */
function generateCSVFeed(providers: Array<{ id: string; data: ProviderData }>): string {
  // En-tetes du CSV selon les specs Facebook Product Catalog
  const headers = [
    "id",
    "title",
    "description",
    "availability",
    "condition",
    "price",
    "link",
    "image_link",
    "brand",
    "google_product_category",
    "custom_label_0",
    "custom_label_1",
    "custom_label_2",
  ];

  // Lignes du CSV
  const rows: string[] = [headers.join(",")];

  for (const { id, data } of providers) {
    const row = [
      escapeCSV(id), // id (required)
      escapeCSV(getProviderTitle(data, id)), // title (required)
      escapeCSV(getProviderDescription(data)), // description
      "in stock", // availability
      "new", // condition
      getProviderPrice(data), // price
      escapeCSV(getProviderUrl(data, id)), // link
      escapeCSV(getProviderImageUrl(data)), // image_link
      escapeCSV(BRAND_NAME), // brand
      escapeCSV(GOOGLE_PRODUCT_CATEGORY), // google_product_category
      escapeCSV(data.country || data.currentCountry || ""), // custom_label_0: Pays
      escapeCSV(data.city || ""), // custom_label_1: Ville
      escapeCSV(getLanguagesLabel(data)), // custom_label_2: Langues
    ];

    rows.push(row.join(","));
  }

  return rows.join("\n");
}

/**
 * Cloud Function HTTP pour generer le feed catalogue des prestataires
 *
 * Usage:
 *   GET https://europe-west1-sos-expat.cloudfunctions.net/providerCatalogFeed
 *
 * Parametres de requete optionnels:
 *   - type: Filtrer par type (lawyer, expat)
 *   - country: Filtrer par pays
 *   - format: Format de sortie (csv par defaut, xml pour future extension)
 *
 * Response:
 *   - Content-Type: text/csv
 *   - Content-Disposition: attachment; filename="sos-expat-provider-catalog.csv"
 */
export const providerCatalogFeed = onRequest(
  {
    region: "europe-west1", // Changed from us-central1 to reduce egress costs
    timeoutSeconds: 300, // 5 minutes max
    memory: "512MiB",
    cpu: 0.083,
    maxInstances: 5,
    minInstances: 0,
    concurrency: 1,
    cors: true, // Permettre les requetes cross-origin pour Meta
  },
  async (req: Request, res: Response) => {
    ensureInitialized();
    const startTime = Date.now();
    console.log("[providerCatalogFeed] Feed generation started");

    try {
      // Parametres de requete optionnels
      const filterType = req.query.type as string | undefined;
      const filterCountry = req.query.country as string | undefined;
      const format = (req.query.format as string) || "csv";

      console.log(`[providerCatalogFeed] Filters: type=${filterType}, country=${filterCountry}, format=${format}`);

      // Recuperer tous les prestataires publics
      let providers = await getPublicProviders();

      // Appliquer les filtres optionnels
      if (filterType) {
        providers = providers.filter((p) => {
          const type = p.data.type || p.data.role;
          return type === filterType;
        });
        console.log(`[providerCatalogFeed] After type filter: ${providers.length} providers`);
      }

      if (filterCountry) {
        providers = providers.filter((p) => {
          const country = (p.data.country || p.data.currentCountry || "").toLowerCase();
          return country.includes(filterCountry.toLowerCase());
        });
        console.log(`[providerCatalogFeed] After country filter: ${providers.length} providers`);
      }

      // Generer le feed
      if (format === "xml") {
        // Future extension: format XML
        res.status(501).json({
          success: false,
          error: "XML format not yet implemented. Use CSV format.",
        });
        return;
      }

      // Generer le CSV
      const csvContent = generateCSVFeed(providers);

      // Headers de reponse pour le download
      const filename = `sos-expat-provider-catalog-${new Date().toISOString().split("T")[0]}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "public, max-age=3600"); // Cache 1 heure
      res.setHeader("X-Provider-Count", providers.length.toString());
      res.setHeader("X-Generation-Time-Ms", (Date.now() - startTime).toString());

      // Log de succes
      const duration = Date.now() - startTime;
      console.log(
        `[providerCatalogFeed] Feed generated successfully: ${providers.length} providers, ${csvContent.length} bytes, ${duration}ms`
      );

      // Log dans Firestore pour monitoring (async, non-bloquant)
      admin
        .firestore()
        .collection("catalog_feed_logs")
        .add({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          providerCount: providers.length,
          filterType: filterType || null,
          filterCountry: filterCountry || null,
          format: format,
          durationMs: duration,
          contentLength: csvContent.length,
          success: true,
          userAgent: req.headers["user-agent"] || null,
          ip: req.ip || null,
        })
        .catch((err) => {
          console.warn("[providerCatalogFeed] Failed to log to Firestore:", err);
        });

      // Envoyer la reponse
      res.status(200).send(csvContent);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[providerCatalogFeed] Error generating feed: ${errorMessage}`, error);

      // Log l'erreur dans Firestore
      admin
        .firestore()
        .collection("catalog_feed_logs")
        .add({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          success: false,
          error: errorMessage,
          durationMs: Date.now() - startTime,
          userAgent: req.headers["user-agent"] || null,
          ip: req.ip || null,
        })
        .catch((err) => {
          console.warn("[providerCatalogFeed] Failed to log error to Firestore:", err);
        });

      res.status(500).json({
        success: false,
        error: "Failed to generate provider catalog feed",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * Export par defaut pour usage dans index.ts
 */
export { providerCatalogFeed as generateProviderFeed };
