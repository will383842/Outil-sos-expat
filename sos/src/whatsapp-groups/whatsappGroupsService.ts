/**
 * WhatsApp Groups - Service
 * Lecture/écriture Firestore pour les groupes WhatsApp
 * Scalable pour tous les rôles : chatter, influencer, blogger, groupAdmin
 *
 * Résolution du groupe (priorité, 6 niveaux) :
 *   1. Groupe continent + langue exacte du user (ex: "Chatter Afrique FR")
 *   2. Groupe continent + langue déduite du pays (ex: pays=CM → langue=fr)
 *   3. Groupe langue du user (type: "language", fallback)
 *   4. Groupe langue déduite du pays (via COUNTRY_TO_LANGUAGE)
 *   5. Groupe par défaut du rôle (defaultGroupIds[role])
 *   6. Premier groupe enabled du rôle
 *
 * Aucune Cloud Function nécessaire — accès direct Firestore
 */

import { doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, startAt, endAt, getDocs, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { WhatsAppGroupsConfig, WhatsAppGroup, WhatsAppRole, WhatsAppGroupManager } from './types';
import { COUNTRY_TO_LANGUAGE, COUNTRY_TO_CONTINENT, ALL_CONTINENTS, SUPPORTED_LANGUAGES, ROLE_LABELS } from './types';
import { buildConfigFromSeedData } from './seedWhatsAppGroups';

const CONFIG_DOC_PATH = 'admin_config/whatsapp_groups';

/** Collection Firestore par rôle (pour écrire le tracking) */
const ROLE_COLLECTION: Record<WhatsAppRole, string> = {
  chatter: 'chatters',
  influencer: 'influencers',
  blogger: 'bloggers',
  groupAdmin: 'group_admins',
  client: 'users',
  lawyer: 'users',
  expat: 'users',
};

// ============================================================================
// LECTURE CONFIG
// ============================================================================

/** Récupère la config des groupes WhatsApp depuis Firestore.
 *  Auto-seed: si le document est absent ou incomplet (< 68 groupes),
 *  écrit automatiquement les 68 groupes seed dans Firestore puis les retourne.
 *  Cela garantit que le système est toujours opérationnel en production.
 */
export async function getWhatsAppGroupsConfig(): Promise<WhatsAppGroupsConfig | null> {
  try {
    const snap = await getDoc(doc(db, CONFIG_DOC_PATH));
    const seedConfig = buildConfigFromSeedData();

    if (!snap.exists()) {
      console.warn('[WhatsApp Groups] Firestore doc missing — auto-seeding 68 groups');
      await autoSeedIfNeeded(seedConfig);
      return seedConfig;
    }

    const firestoreConfig = snap.data() as WhatsAppGroupsConfig;

    // Auto-heal: if Firestore has fewer groups than seed (partial config), re-seed
    const enabledCount = firestoreConfig.groups?.filter((g) => g.enabled && g.link).length || 0;
    const seedEnabledCount = seedConfig.groups.filter((g) => g.enabled && g.link).length;
    if (enabledCount < seedEnabledCount * 0.5) {
      console.warn(`[WhatsApp Groups] Firestore has only ${enabledCount} active groups vs ${seedEnabledCount} in seed — auto-healing`);
      await autoSeedIfNeeded(seedConfig);
      return seedConfig;
    }

    return firestoreConfig;
  } catch (err) {
    console.error('[WhatsApp Groups] Error fetching config, falling back to seed data:', err);
    return buildConfigFromSeedData();
  }
}

/** Auto-seed Firestore with hardcoded data (fire-and-forget, non-blocking) */
async function autoSeedIfNeeded(config: WhatsAppGroupsConfig): Promise<void> {
  try {
    await setDoc(doc(db, CONFIG_DOC_PATH), {
      ...config,
      updatedAt: serverTimestamp(),
      updatedBy: 'auto_seed',
    });
    console.info(`[WhatsApp Groups] Auto-seeded ${config.groups.length} groups into Firestore`);
  } catch (err) {
    console.error('[WhatsApp Groups] Auto-seed failed (will use in-memory fallback):', err);
  }
}

/**
 * Trouve le bon groupe WhatsApp pour un utilisateur.
 *
 * Logique de résolution (priorité, 9 niveaux) :
 *   1.  Continent + langue exacte (ex: "Chatter Afrique FR" pour un user FR en Afrique)
 *   2.  Continent + langue déduite du pays (ex: pays=CM → langue=fr)
 *   2b. Continent + EN (lingua franca — ex: chatter ES en Europe → "Chatter Europe EN")
 *   2c. Continent + FR (deuxième fallback continent)
 *   3.  Groupe langue du user (type "language", fallback)
 *   4.  Groupe langue déduite du pays (type "language", fallback)
 *   4b. Groupe EN (lingua franca, type "language")
 *   5.  Groupe par défaut du rôle (defaultGroupIds[role])
 *   6.  Premier groupe enabled du rôle
 */
export function findGroupForUser(
  config: WhatsAppGroupsConfig,
  role: WhatsAppRole,
  language: string,
  country: string
): WhatsAppGroup | null {
  const roleGroups = config.groups.filter((g) => g.role === role && g.enabled);
  if (roleGroups.length === 0) return null;

  // Normalise ch→zh (app uses "ch" for Chinese, WhatsApp groups use "zh")
  const lang = language === 'ch' ? 'zh' : language;
  const upperCountry = country?.toUpperCase();
  const continent = COUNTRY_TO_CONTINENT[upperCountry];
  const countryLang = COUNTRY_TO_LANGUAGE[upperCountry];

  // 1. Continent + langue exacte du user
  if (continent) {
    const exactMatch = roleGroups.find(
      (g) => g.type === 'continent' && g.continentCode === continent && g.language === lang
    );
    if (exactMatch) return exactMatch;
  }

  // 2. Continent + langue déduite du pays
  if (continent && countryLang && countryLang !== lang) {
    const countryLangMatch = roleGroups.find(
      (g) => g.type === 'continent' && g.continentCode === continent && g.language === countryLang
    );
    if (countryLangMatch) return countryLangMatch;
  }

  // 2b. Continent + EN (lingua franca) — ex: chatter hispanophone en Europe → "Chatter Europe EN"
  if (continent && lang !== 'en') {
    const continentEnMatch = roleGroups.find(
      (g) => g.type === 'continent' && g.continentCode === continent && g.language === 'en'
    );
    if (continentEnMatch) return continentEnMatch;
  }

  // 2c. Continent + FR (deuxième fallback) — ex: chatter arabophone en Afrique → "Chatter Afrique FR"
  if (continent && lang !== 'fr' && lang !== 'en') {
    const continentFrMatch = roleGroups.find(
      (g) => g.type === 'continent' && g.continentCode === continent && g.language === 'fr'
    );
    if (continentFrMatch) return continentFrMatch;
  }

  // 3. Groupe langue du user (fallback type "language")
  const langGroup = roleGroups.find(
    (g) => g.type === 'language' && g.language === lang
  );
  if (langGroup) return langGroup;

  // 4. Groupe langue déduite du pays (fallback type "language")
  if (countryLang && countryLang !== lang) {
    const countryLangGroup = roleGroups.find(
      (g) => g.type === 'language' && g.language === countryLang
    );
    if (countryLangGroup) return countryLangGroup;
  }

  // 4b. Groupe EN (lingua franca, fallback type "language")
  if (lang !== 'en') {
    const enFallback = roleGroups.find(
      (g) => g.type === 'language' && g.language === 'en'
    );
    if (enFallback) return enFallback;
  }

  // 5. Groupe par défaut du rôle
  const defaultId = config.defaultGroupIds?.[role];
  if (defaultId) {
    const defaultGroup = roleGroups.find((g) => g.id === defaultId);
    if (defaultGroup) return defaultGroup;
  }

  // 6. Premier groupe available
  return roleGroups[0] || null;
}

// ============================================================================
// TRACKING (frontend — écriture sur le doc de l'affilié)
// ============================================================================

/** Marque que l'utilisateur a cliqué sur "Rejoindre le groupe WhatsApp" */
export async function trackWhatsAppGroupClick(
  role: WhatsAppRole,
  userId: string,
  groupId?: string,
  country?: string
): Promise<void> {
  const roleCollection = ROLE_COLLECTION[role];
  try {
    await setDoc(doc(db, roleCollection, userId), {
      whatsappGroupClicked: true,
      whatsappGroupClickedAt: serverTimestamp(),
      ...(groupId && { whatsappGroupId: groupId }),
      ...(country && { whatsappGroupCountry: country }),
    }, { merge: true });
  } catch (err) {
    console.error(`[WhatsApp Groups] Error tracking click for ${role}:`, err);
  }
}

// ============================================================================
// RECHERCHE MANAGERS (admin — recherche dans la collection chatters)
// ============================================================================

/** Recherche des chatters par email pour les assigner comme managers */
export async function searchChattersForManager(searchTerm: string): Promise<WhatsAppGroupManager[]> {
  const term = searchTerm.toLowerCase().trim();
  if (term.length < 2) return [];

  try {
    const chattersRef = collection(db, 'chatters');
    const q = query(
      chattersRef,
      orderBy('email'),
      startAt(term),
      endAt(term + '\uf8ff'),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Sans nom',
        email: data.email || '',
        phone: data.phone || '',
      };
    });
  } catch (err) {
    console.error('[WhatsApp Groups] Error searching chatters:', err);
    return [];
  }
}

// ============================================================================
// ADMIN — Sauvegarde config
// ============================================================================

/** Sauvegarde la config des groupes WhatsApp (admin uniquement) */
export async function saveWhatsAppGroupsConfig(
  config: WhatsAppGroupsConfig,
  adminUid: string
): Promise<void> {
  await setDoc(doc(db, CONFIG_DOC_PATH), {
    ...config,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid,
  });
}

// ============================================================================
// AUTO-SEED — Génère les groupes par défaut
// ============================================================================

/** Génère les groupes fallback par langue pour un rôle (liens vides, disabled) */
export function generateLanguageFallbackGroups(role: WhatsAppRole): WhatsAppGroup[] {
  return SUPPORTED_LANGUAGES.map((lang) => ({
    id: `${role}_lang_${lang.code}`,
    name: `${ROLE_LABELS[role]} ${lang.name} ${lang.flag}`,
    link: '',
    language: lang.code,
    role,
    type: 'language' as const,
    enabled: false,
  }));
}

/**
 * Génère les groupes continent × langue pour un rôle (7 continents × 9 langues = 63 groupes).
 * Chaque groupe combine un continent et une langue (ex: "Chatter 🌍 Afrique 🇫🇷").
 * Tous générés disabled et sans lien — l'admin active ceux qu'il veut.
 */
export function generateContinentGroups(role: WhatsAppRole): WhatsAppGroup[] {
  const groups: WhatsAppGroup[] = [];
  for (const c of ALL_CONTINENTS) {
    for (const lang of SUPPORTED_LANGUAGES) {
      groups.push({
        id: `${role}_continent_${c.code}_${lang.code}`,
        name: `${ROLE_LABELS[role]} ${c.emoji} ${c.name} ${lang.flag}`,
        link: '',
        language: lang.code,
        role,
        type: 'continent' as const,
        continentCode: c.code,
        enabled: false,
      });
    }
  }
  return groups;
}

/** Génère un groupe continent + langue individuel pour un rôle */
export function createContinentGroup(
  role: WhatsAppRole,
  continentCode: string,
  languageCode: string = 'en',
): WhatsAppGroup {
  const continent = ALL_CONTINENTS.find((c) => c.code === continentCode);
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);
  return {
    id: `${role}_continent_${continentCode}_${languageCode}`,
    name: `${ROLE_LABELS[role]} ${continent?.emoji || '🌐'} ${continent?.name || continentCode} ${lang?.flag || ''}`,
    link: '',
    language: languageCode,
    role,
    type: 'continent',
    continentCode,
    enabled: false,
  };
}
