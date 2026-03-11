/**
 * WhatsApp Groups - Module isolé et scalable
 * Gestion des groupes WhatsApp pour tous les rôles affiliés
 *
 * Structure :
 *   types.ts                  → Types, constantes, mappings pays→langue/continent
 *   whatsappGroupsService.ts  → Service Firestore (0 Cloud Function)
 *   WhatsAppGroupScreen.tsx   → Écran post-inscription (mobile-first)
 *   AdminWhatsAppGroups.tsx   → Page admin (groupes continent + fallback langue)
 *
 * Logique de résolution (6 niveaux) :
 *   1. Continent + langue exacte du user
 *   2. Continent + langue déduite du pays (via COUNTRY_TO_LANGUAGE)
 *   3. Groupe langue du user (type "language", fallback)
 *   4. Groupe langue déduite du pays (type "language", fallback)
 *   5. Groupe par défaut du rôle (defaultGroupIds)
 *   6. Premier groupe enabled du rôle
 */

export { default as WhatsAppGroupScreen, WhatsAppIcon } from './WhatsAppGroupScreen';
export { default as WhatsAppBanner } from './WhatsAppBanner';
export { default as AdminWhatsAppGroups } from './AdminWhatsAppGroups';
export { default as AdminWhatsAppSupervision } from './AdminWhatsAppSupervision';
export {
  getWhatsAppGroupsConfig,
  findGroupForUser,
  trackWhatsAppGroupClick,
  saveWhatsAppGroupsConfig,
  generateLanguageFallbackGroups,
  generateContinentGroups,
  createContinentGroup,
  searchChattersForManager,
} from './whatsappGroupsService';
export type {
  WhatsAppGroup,
  WhatsAppGroupsConfig,
  WhatsAppTracking,
  WhatsAppRole,
  WhatsAppGroupType,
  WhatsAppGroupManager,
  WhatsAppRoleCategory,
} from './types';
export { seedWhatsAppGroups, seedWhatsAppGroupsFromJson } from './seedWhatsAppGroups';
export {
  COUNTRY_TO_LANGUAGE,
  COUNTRY_TO_CONTINENT,
  ALL_CONTINENTS,
  SUPPORTED_LANGUAGES,
  ROLE_LABELS,
  ROLE_CATEGORY,
} from './types';
