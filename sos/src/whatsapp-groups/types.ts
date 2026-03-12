/**
 * WhatsApp Groups - Types
 * Module isolé et scalable pour la gestion des groupes WhatsApp
 * Supporte tous les rôles : chatter, influencer, blogger, groupAdmin, client, lawyer, expat
 *
 * Logique de résolution (priorité, 6 niveaux) :
 *   1. Continent + langue exacte (ex: "Chatter 🌍 Afrique 🇫🇷")
 *   2. Continent + langue déduite du pays (ex: CM → fr → "Chatter 🌍 Afrique 🇫🇷")
 *   3. Groupe langue du user (fallback, ex: "Influencer Français 🇫🇷")
 *   4. Groupe langue déduite du pays (fallback)
 *   5. Groupe par défaut du rôle (defaultGroupIds)
 *   6. Premier groupe enabled du rôle
 */

import type { Timestamp, FieldValue } from 'firebase/firestore';

/** Rôles supportés par le système de groupes WhatsApp */
export type WhatsAppRole = 'chatter' | 'influencer' | 'blogger' | 'groupAdmin' | 'client' | 'lawyer' | 'expat';

/**
 * Catégories de rôles (pour les messages différenciés)
 * - affiliate : chatters, influencers, bloggers, groupAdmins (gagnent de l'argent)
 * - client : clients expatriés (communauté, entraide)
 * - provider : avocats, expatriés aidants (réseau pro, visibilité)
 */
export type WhatsAppRoleCategory = 'affiliate' | 'client' | 'provider';

/** Mapping rôle → catégorie */
export const ROLE_CATEGORY: Record<WhatsAppRole, WhatsAppRoleCategory> = {
  chatter: 'affiliate',
  influencer: 'affiliate',
  blogger: 'affiliate',
  groupAdmin: 'affiliate',
  client: 'client',
  lawyer: 'provider',
  expat: 'provider',
};

/** Type de groupe : continent ou fallback langue */
export type WhatsAppGroupType = 'continent' | 'language';

/** Manager assigné à un groupe WhatsApp */
export interface WhatsAppGroupManager {
  /** UID Firestore du manager */
  uid: string;
  /** Nom complet */
  displayName: string;
  /** Email */
  email: string;
  /** Téléphone (optionnel) */
  phone?: string;
  /** Date d'assignation */
  assignedAt?: Timestamp | FieldValue;
  /** UID de l'admin qui a assigné */
  assignedBy?: string;
}

/** Un groupe WhatsApp */
export interface WhatsAppGroup {
  /** Identifiant unique (ex: "chatter_continent_AF", "chatter_lang_fr") */
  id: string;
  /** Nom affiché du groupe (ex: "Chatters 🌍 Afrique") */
  name: string;
  /** Lien d'invitation WhatsApp (ex: "https://chat.whatsapp.com/XXXX") */
  link: string;
  /** Code langue du groupe (ex: "fr", "en", "es") */
  language: string;
  /** Rôle ciblé */
  role: WhatsAppRole;
  /** Type : groupe par continent ou fallback par langue */
  type: WhatsAppGroupType;
  /** Code continent (uniquement pour type "continent", ex: "AF", "EU") */
  continentCode?: string;
  /** Actif ou non */
  enabled: boolean;
  /** Managers assignés au groupe */
  managers?: WhatsAppGroupManager[];
}

/** Config Firestore: admin_config/whatsapp_groups */
export interface WhatsAppGroupsConfig {
  /** Liste de tous les groupes (tous rôles confondus) */
  groups: WhatsAppGroup[];
  /** ID du groupe par défaut si aucun match (par rôle) */
  defaultGroupIds: Record<WhatsAppRole, string>;
  /** Dernière mise à jour */
  updatedAt?: any;
  /** Mis à jour par (admin uid) */
  updatedBy?: string;
}

/** Champs WhatsApp ajoutés aux docs affiliés (chatters, influencers, etc.) */
export interface WhatsAppTracking {
  whatsappGroupClicked: boolean;
  whatsappGroupClickedAt: Timestamp | FieldValue;
  whatsappGroupCountry?: string;
  whatsappGroupId?: string;
}

/** Mapping automatique pays → langue par défaut */
export const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  // Francophone
  FR: 'fr', BE: 'fr', CH: 'fr', CA: 'fr', LU: 'fr',
  MA: 'fr', TN: 'fr', DZ: 'fr', SN: 'fr', CM: 'fr',
  CI: 'fr', CD: 'fr', CG: 'fr', MG: 'fr', ML: 'fr',
  BF: 'fr', NE: 'fr', TD: 'fr', GN: 'fr', BJ: 'fr',
  TG: 'fr', GA: 'fr', DJ: 'fr', KM: 'fr', CF: 'fr',
  RW: 'fr', BI: 'fr', MU: 'fr', SC: 'fr', HT: 'fr',
  MC: 'fr', GQ: 'fr',
  // Anglophone
  US: 'en', GB: 'en', AU: 'en', NZ: 'en', IE: 'en',
  NG: 'en', GH: 'en', KE: 'en', ZA: 'en', TZ: 'en',
  UG: 'en', ZW: 'en', ZM: 'en', BW: 'en', NA: 'en',
  JM: 'en', TT: 'en', SG: 'en', PH: 'en', UA: 'en',
  PK: 'en', BD: 'en', LK: 'en', MY: 'en', SL: 'en',
  LR: 'en', MW: 'en', GM: 'en', FJ: 'en', MT: 'en',
  TH: 'en', VN: 'en', KH: 'en', MM: 'en', LA: 'en',
  // Hispanophone
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es',
  CL: 'es', EC: 'es', VE: 'es', GT: 'es', CU: 'es',
  BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es',
  NI: 'es', CR: 'es', PA: 'es', UY: 'es',
  // Lusophone
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt',
  GW: 'pt', ST: 'pt', TL: 'pt',
  // Germanophone
  DE: 'de', AT: 'de', LI: 'de',
  // Russophone
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru', TJ: 'ru',
  UZ: 'ru', TM: 'ru', MD: 'ru',
  // Arabophone
  SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', JO: 'ar',
  LB: 'ar', SY: 'ar', YE: 'ar', OM: 'ar', KW: 'ar',
  BH: 'ar', QA: 'ar', LY: 'ar', SD: 'ar', SO: 'ar',
  MR: 'ar', PS: 'ar',
  // Hindi
  IN: 'hi',
  // Sinophone
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh',
};

/** Mapping automatique pays → continent */
export const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // Afrique
  DZ: 'AF', AO: 'AF', BJ: 'AF', BW: 'AF', BF: 'AF', BI: 'AF', CV: 'AF',
  CM: 'AF', CF: 'AF', TD: 'AF', KM: 'AF', CG: 'AF', CD: 'AF', CI: 'AF',
  DJ: 'AF', EG: 'AF', GQ: 'AF', ER: 'AF', SZ: 'AF', ET: 'AF', GA: 'AF',
  GM: 'AF', GH: 'AF', GN: 'AF', GW: 'AF', KE: 'AF', LS: 'AF', LR: 'AF',
  LY: 'AF', MG: 'AF', MW: 'AF', ML: 'AF', MR: 'AF', MU: 'AF', MA: 'AF',
  MZ: 'AF', NA: 'AF', NE: 'AF', NG: 'AF', RW: 'AF', ST: 'AF', SN: 'AF',
  SC: 'AF', SL: 'AF', SO: 'AF', ZA: 'AF', SS: 'AF', SD: 'AF', TZ: 'AF',
  TG: 'AF', TN: 'AF', UG: 'AF', ZM: 'AF', ZW: 'AF',
  // Asie
  AF: 'AS', AM: 'AS', AZ: 'AS', BD: 'AS', BT: 'AS', BN: 'AS', KH: 'AS',
  CN: 'AS', GE: 'AS', IN: 'AS', ID: 'AS', JP: 'AS', KZ: 'AS', KG: 'AS',
  LA: 'AS', MY: 'AS', MV: 'AS', MN: 'AS', MM: 'AS', NP: 'AS', KP: 'AS',
  KR: 'AS', PK: 'AS', PH: 'AS', SG: 'AS', LK: 'AS', TW: 'AS', TJ: 'AS',
  TH: 'AS', TL: 'AS', TM: 'AS', UZ: 'AS', VN: 'AS', HK: 'AS', MO: 'AS',
  // Europe
  AL: 'EU', AD: 'EU', AT: 'EU', BY: 'EU', BE: 'EU', BA: 'EU', BG: 'EU',
  HR: 'EU', CY: 'EU', CZ: 'EU', DK: 'EU', EE: 'EU', FI: 'EU', FR: 'EU',
  DE: 'EU', GR: 'EU', HU: 'EU', IS: 'EU', IE: 'EU', IT: 'EU', LV: 'EU',
  LI: 'EU', LT: 'EU', LU: 'EU', MT: 'EU', MD: 'EU', MC: 'EU', ME: 'EU',
  NL: 'EU', MK: 'EU', NO: 'EU', PL: 'EU', PT: 'EU', RO: 'EU', RU: 'EU',
  SM: 'EU', RS: 'EU', SK: 'EU', SI: 'EU', ES: 'EU', SE: 'EU', CH: 'EU',
  UA: 'EU', GB: 'EU', VA: 'EU',
  // Amérique du Nord
  AG: 'NA', BS: 'NA', BB: 'NA', BZ: 'NA', CA: 'NA', CR: 'NA', CU: 'NA',
  DM: 'NA', DO: 'NA', SV: 'NA', GD: 'NA', GT: 'NA', HT: 'NA', HN: 'NA',
  JM: 'NA', MX: 'NA', NI: 'NA', PA: 'NA', KN: 'NA', LC: 'NA', VC: 'NA',
  TT: 'NA', US: 'NA',
  // Amérique du Sud
  AR: 'SA', BO: 'SA', BR: 'SA', CL: 'SA', CO: 'SA', EC: 'SA', GY: 'SA',
  PY: 'SA', PE: 'SA', SR: 'SA', UY: 'SA', VE: 'SA',
  // Océanie
  AU: 'OC', FJ: 'OC', KI: 'OC', MH: 'OC', FM: 'OC', NR: 'OC', NZ: 'OC',
  PW: 'OC', PG: 'OC', WS: 'OC', SB: 'OC', TO: 'OC', TV: 'OC', VU: 'OC',
  // Moyen-Orient
  BH: 'ME', IR: 'ME', IQ: 'ME', IL: 'ME', JO: 'ME', KW: 'ME', LB: 'ME',
  OM: 'ME', PS: 'ME', QA: 'ME', SA: 'ME', SY: 'ME', TR: 'ME', AE: 'ME',
  YE: 'ME',
};

/** Liste des continents avec labels et emojis */
export const ALL_CONTINENTS = [
  { code: 'AF', name: 'Afrique', emoji: '🌍' },
  { code: 'AS', name: 'Asie', emoji: '🌏' },
  { code: 'EU', name: 'Europe', emoji: '🇪🇺' },
  { code: 'NA', name: 'Amérique du Nord', emoji: '🌎' },
  { code: 'SA', name: 'Amérique du Sud', emoji: '🌎' },
  { code: 'OC', name: 'Océanie', emoji: '🌏' },
  { code: 'ME', name: 'Moyen-Orient', emoji: '🕌' },
] as const;

/** Langues supportées avec leurs labels */
export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Russkiy', flag: '🇷🇺' },
  { code: 'ar', name: 'Al-Arabiyya', flag: '🇸🇦' },
  { code: 'zh', name: 'Zhongwen', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
] as const;

/** Labels des rôles */
export const ROLE_LABELS: Record<WhatsAppRole, string> = {
  chatter: 'Chatter',
  influencer: 'Influencer',
  blogger: 'Blogger',
  groupAdmin: 'Group Admin',
  client: 'Client',
  lawyer: 'Avocat',
  expat: 'Expatrié Aidant',
};
