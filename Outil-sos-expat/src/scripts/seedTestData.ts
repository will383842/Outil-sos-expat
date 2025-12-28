/**
 * =============================================================================
 * SEED TEST DATA - Données de test pour développement
 * =============================================================================
 *
 * Ce script crée des données de test dans Firestore :
 * - Prestataires (avocats et experts)
 * - Pays configurés
 * - Utilisateur multi-prestataires
 *
 * Usage : Importer et appeler seedTestData() depuis la console du navigateur
 * ou créer un bouton temporaire dans l'admin.
 */

import {
  collection,
  doc,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// =============================================================================
// DONNÉES DE TEST - PRESTATAIRES
// =============================================================================

export const TEST_PROVIDERS = [
  {
    id: "provider_lawyer_paris",
    name: "Cabinet Maître Dupont",
    email: "contact@cabinet-dupont.fr",
    type: "lawyer",
    country: "FR",
    city: "Paris",
    phone: "+33 1 42 00 00 00",
    specialties: ["immigration", "family", "tax"],
    languages: ["fr", "en"],
    active: true,
    verified: true,
    description: "Cabinet spécialisé en droit international des expatriés depuis 15 ans.",
    photoURL: null,
    rating: 4.8,
    reviewCount: 127,
    createdAt: Timestamp.now(),
  },
  {
    id: "provider_lawyer_lyon",
    name: "SCP Martin & Associés",
    email: "contact@martin-avocats.fr",
    type: "lawyer",
    country: "FR",
    city: "Lyon",
    phone: "+33 4 72 00 00 00",
    specialties: ["work", "immigration", "criminal"],
    languages: ["fr", "en", "es"],
    active: true,
    verified: true,
    description: "Avocats spécialisés en droit du travail international et immigration.",
    photoURL: null,
    rating: 4.6,
    reviewCount: 89,
    createdAt: Timestamp.now(),
  },
  {
    id: "provider_lawyer_bangkok",
    name: "Thai Legal Partners",
    email: "contact@thai-legal.com",
    type: "lawyer",
    country: "TH",
    city: "Bangkok",
    phone: "+66 2 000 0000",
    specialties: ["immigration", "inheritance", "tax"],
    languages: ["en", "th", "fr"],
    active: true,
    verified: true,
    description: "Cabinet franco-thaï expert en visas et investissements.",
    photoURL: null,
    rating: 4.9,
    reviewCount: 203,
    createdAt: Timestamp.now(),
  },
  {
    id: "provider_expert_bali",
    name: "Bali Expat Services",
    email: "hello@bali-expat.com",
    type: "expert",
    country: "ID",
    city: "Bali",
    phone: "+62 361 000 000",
    specialties: ["housing", "admin", "digital_nomad"],
    languages: ["en", "fr", "id"],
    active: true,
    verified: true,
    description: "Accompagnement complet pour digital nomads et expatriés à Bali.",
    photoURL: null,
    rating: 4.7,
    reviewCount: 156,
    createdAt: Timestamp.now(),
  },
  {
    id: "provider_expert_dubai",
    name: "Dubai Relocation Pro",
    email: "info@dubai-relocation.ae",
    type: "expert",
    country: "AE",
    city: "Dubai",
    phone: "+971 4 000 0000",
    specialties: ["housing", "finance", "admin"],
    languages: ["en", "ar", "fr"],
    active: true,
    verified: true,
    description: "Installation clé en main pour expatriés à Dubai et aux Emirats.",
    photoURL: null,
    rating: 4.5,
    reviewCount: 78,
    createdAt: Timestamp.now(),
  },
  {
    id: "provider_expert_lisbon",
    name: "Portugal Welcome",
    email: "contact@portugal-welcome.pt",
    type: "expert",
    country: "PT",
    city: "Lisbonne",
    phone: "+351 21 000 0000",
    specialties: ["housing", "admin", "health", "education"],
    languages: ["pt", "fr", "en"],
    active: true,
    verified: true,
    description: "Experts en expatriation au Portugal, visa D7 et NHR.",
    photoURL: null,
    rating: 4.8,
    reviewCount: 234,
    createdAt: Timestamp.now(),
  },
];

// =============================================================================
// DONNÉES DE TEST - PAYS
// =============================================================================

export const TEST_COUNTRIES = [
  {
    id: "FR",
    code: "FR",
    name: "France",
    nameFr: "France",
    nameEn: "France",
    flag: "🇫🇷",
    phonePrefix: "+33",
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Paris",
    active: true,
    lawyersAvailable: true,
    expertsAvailable: true,
  },
  {
    id: "TH",
    code: "TH",
    name: "Thaïlande",
    nameFr: "Thaïlande",
    nameEn: "Thailand",
    flag: "🇹🇭",
    phonePrefix: "+66",
    currency: "THB",
    currencySymbol: "฿",
    timezone: "Asia/Bangkok",
    active: true,
    lawyersAvailable: true,
    expertsAvailable: true,
  },
  {
    id: "ID",
    code: "ID",
    name: "Indonésie",
    nameFr: "Indonésie",
    nameEn: "Indonesia",
    flag: "🇮🇩",
    phonePrefix: "+62",
    currency: "IDR",
    currencySymbol: "Rp",
    timezone: "Asia/Jakarta",
    active: true,
    lawyersAvailable: false,
    expertsAvailable: true,
  },
  {
    id: "AE",
    code: "AE",
    name: "Émirats Arabes Unis",
    nameFr: "Émirats Arabes Unis",
    nameEn: "United Arab Emirates",
    flag: "🇦🇪",
    phonePrefix: "+971",
    currency: "AED",
    currencySymbol: "د.إ",
    timezone: "Asia/Dubai",
    active: true,
    lawyersAvailable: true,
    expertsAvailable: true,
  },
  {
    id: "PT",
    code: "PT",
    name: "Portugal",
    nameFr: "Portugal",
    nameEn: "Portugal",
    flag: "🇵🇹",
    phonePrefix: "+351",
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Lisbon",
    active: true,
    lawyersAvailable: true,
    expertsAvailable: true,
  },
  {
    id: "ES",
    code: "ES",
    name: "Espagne",
    nameFr: "Espagne",
    nameEn: "Spain",
    flag: "🇪🇸",
    phonePrefix: "+34",
    currency: "EUR",
    currencySymbol: "€",
    timezone: "Europe/Madrid",
    active: true,
    lawyersAvailable: true,
    expertsAvailable: true,
  },
  {
    id: "US",
    code: "US",
    name: "États-Unis",
    nameFr: "États-Unis",
    nameEn: "United States",
    flag: "🇺🇸",
    phonePrefix: "+1",
    currency: "USD",
    currencySymbol: "$",
    timezone: "America/New_York",
    active: true,
    lawyersAvailable: true,
    expertsAvailable: true,
  },
  {
    id: "CA",
    code: "CA",
    name: "Canada",
    nameFr: "Canada",
    nameEn: "Canada",
    flag: "🇨🇦",
    phonePrefix: "+1",
    currency: "CAD",
    currencySymbol: "C$",
    timezone: "America/Toronto",
    active: true,
    lawyersAvailable: true,
    expertsAvailable: true,
  },
];

// =============================================================================
// FONCTION DE SEED
// =============================================================================

export async function seedTestData(): Promise<{
  providers: number;
  countries: number;
}> {
  console.log("🌱 Début du seeding des données de test...");

  const batch = writeBatch(db);
  let providersCount = 0;
  let countriesCount = 0;

  // Ajouter les prestataires
  for (const provider of TEST_PROVIDERS) {
    const { id, ...data } = provider;
    const ref = doc(db, "providers", id);
    batch.set(ref, {
      ...data,
      updatedAt: Timestamp.now(),
    });
    providersCount++;
    console.log(`  ✓ Provider: ${provider.name}`);
  }

  // Ajouter les pays
  for (const country of TEST_COUNTRIES) {
    const { id, ...data } = country;
    const ref = doc(db, "countryConfigs", id);
    batch.set(ref, {
      ...data,
      updatedAt: Timestamp.now(),
    });
    countriesCount++;
    console.log(`  ✓ Country: ${country.name}`);
  }

  // Exécuter le batch
  await batch.commit();

  console.log(`✅ Seeding terminé!`);
  console.log(`   - ${providersCount} prestataires créés`);
  console.log(`   - ${countriesCount} pays configurés`);

  return {
    providers: providersCount,
    countries: countriesCount,
  };
}

// =============================================================================
// FONCTION POUR LIER UN UTILISATEUR À DES PRESTATAIRES
// =============================================================================

export async function linkUserToProviders(
  userId: string,
  providerIds: string[]
): Promise<void> {
  const userRef = doc(db, "users", userId);
  await setDoc(
    userRef,
    {
      linkedProviders: providerIds,
      isMultiProvider: providerIds.length > 1,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  console.log(`✅ Utilisateur ${userId} lié à ${providerIds.length} prestataires`);
}

// Exporter pour usage global (window)
if (typeof window !== "undefined") {
  (window as any).seedTestData = seedTestData;
  (window as any).linkUserToProviders = linkUserToProviders;
  (window as any).TEST_PROVIDERS = TEST_PROVIDERS;
  console.log("🔧 Fonctions de test disponibles:");
  console.log("   - seedTestData() : Créer les données de test");
  console.log("   - linkUserToProviders(userId, providerIds) : Lier un user à des providers");
}
