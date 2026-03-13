/**
 * Seed WhatsApp Groups Config → Firestore
 * Transforme le JSON exporté (format admin) vers le format attendu par le service.
 *
 * Usage: importer et appeler seedWhatsAppGroupsFromJson(adminUid) depuis la console admin
 * ou un bouton temporaire.
 *
 * Mapping des champs:
 *   JSON               → Firestore (WhatsAppGroup)
 *   inviteLink          → link
 *   active              → enabled
 *   lang                → language
 *   type: "langue"      → type: "language"
 *   type: "continent"   → type: "continent"
 *   continent           → continentCode
 *   role (display)      → role (code)
 */

import { saveWhatsAppGroupsConfig } from './whatsappGroupsService';
import type { WhatsAppGroup, WhatsAppGroupsConfig, WhatsAppRole } from './types';

/** Mapping role display name → code */
const ROLE_DISPLAY_TO_CODE: Record<string, WhatsAppRole> = {
  'Chatter': 'chatter',
  'Influencer': 'influencer',
  'Blogger': 'blogger',
  'Group Admin': 'groupAdmin',
  'Client': 'client',
  'Avocat': 'lawyer',
  'Expatrié Aidant': 'expat',
};

interface RawGroup {
  id: string;
  role: string;
  type: string;
  name: string;
  lang: string;
  inviteLink: string | null;
  active: boolean;
  isDefault: boolean;
  continent?: string;
}

interface RawConfig {
  groups: Record<string, RawGroup>;
}

/**
 * Transforme un groupe du format JSON export vers le format Firestore
 */
function transformGroup(raw: RawGroup): WhatsAppGroup {
  const role = ROLE_DISPLAY_TO_CODE[raw.role] || (raw.role.toLowerCase() as WhatsAppRole);

  return {
    id: raw.id,
    name: raw.name,
    link: raw.inviteLink || '',
    language: raw.lang,
    role,
    type: raw.type === 'langue' ? 'language' : (raw.type as 'continent' | 'language'),
    ...(raw.continent ? { continentCode: raw.continent } : {}),
    enabled: raw.active && !!raw.inviteLink,
  };
}

/**
 * Transforme le JSON complet et sauvegarde dans Firestore.
 * @param adminUid - UID de l'admin qui effectue le seed
 * @param rawJson - Le JSON brut (objet parsé) au format export
 */
export async function seedWhatsAppGroupsFromJson(
  adminUid: string,
  rawJson: RawConfig
): Promise<{ total: number; enabled: number; disabled: number }> {
  const groups: WhatsAppGroup[] = [];
  const defaultGroupIds: Record<string, string> = {};

  for (const [, raw] of Object.entries(rawJson.groups)) {
    const group = transformGroup(raw);
    groups.push(group);

    // Capturer les defaults
    if (raw.isDefault) {
      defaultGroupIds[group.role] = group.id;
    }
  }

  const config: WhatsAppGroupsConfig = {
    groups,
    defaultGroupIds: defaultGroupIds as Record<WhatsAppRole, string>,
  };

  await saveWhatsAppGroupsConfig(config, adminUid);

  const enabled = groups.filter((g) => g.enabled).length;
  return {
    total: groups.length,
    enabled,
    disabled: groups.length - enabled,
  };
}

/**
 * Données WhatsApp Groups — 68 groupes (68 configurés avec liens)
 * Mis à jour le 12/03/2026
 */
export const WHATSAPP_GROUPS_SEED_DATA: RawConfig = {
  groups: {
    // ========== CHATTERS (14 groupes continent × FR/EN) ==========
    chatter_af_fr: { id: "chatter_af_fr", role: "Chatter", type: "continent", name: "Chatter 🌍 Afrique 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/BYgasir1XX8F07kCDU4qC8", active: true, isDefault: false, continent: "AF" },
    chatter_af_en: { id: "chatter_af_en", role: "Chatter", type: "continent", name: "Chatter 🌍 Afrique 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/DuSCD7rwPtvIINnA7dzg7x", active: true, isDefault: false, continent: "AF" },
    chatter_as_fr: { id: "chatter_as_fr", role: "Chatter", type: "continent", name: "Chatter 🌏 Asie 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/Ct8UZyO5bSR10uhvDkihNV", active: true, isDefault: false, continent: "AS" },
    chatter_as_en: { id: "chatter_as_en", role: "Chatter", type: "continent", name: "Chatter 🌏 Asie 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/DeRfOv1caxJKbw8kz0CkBP", active: true, isDefault: false, continent: "AS" },
    chatter_eu_fr: { id: "chatter_eu_fr", role: "Chatter", type: "continent", name: "Chatter 🇪🇺 Europe 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/DbN8nrqfEQH01qRHlsCLXF", active: true, isDefault: false, continent: "EU" },
    chatter_eu_en: { id: "chatter_eu_en", role: "Chatter", type: "continent", name: "Chatter 🇪🇺 Europe 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/IDPOwu6UD5F4BQvjXOvixT", active: true, isDefault: true, continent: "EU" },
    chatter_na_fr: { id: "chatter_na_fr", role: "Chatter", type: "continent", name: "Chatter 🌎 Amérique du Nord 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/Jxs5Eci7anEAxCaiHpAdU0", active: true, isDefault: false, continent: "NA" },
    chatter_na_en: { id: "chatter_na_en", role: "Chatter", type: "continent", name: "Chatter 🌎 Amérique du Nord 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/CTbLbaEEFiw4I4jldIJRl8", active: true, isDefault: false, continent: "NA" },
    chatter_sa_fr: { id: "chatter_sa_fr", role: "Chatter", type: "continent", name: "Chatter 🌎 Amérique du Sud 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/LokkAcMRDPd4FzdqbRG19C", active: true, isDefault: false, continent: "SA" },
    chatter_sa_en: { id: "chatter_sa_en", role: "Chatter", type: "continent", name: "Chatter 🌎 Amérique du Sud 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/GkQSaGhyV6BCekMyvtEFZ6", active: true, isDefault: false, continent: "SA" },
    chatter_oc_fr: { id: "chatter_oc_fr", role: "Chatter", type: "continent", name: "Chatter 🌏 Océanie 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/LOYOOhxOk63LkOQGlWM5nO", active: true, isDefault: false, continent: "OC" },
    chatter_oc_en: { id: "chatter_oc_en", role: "Chatter", type: "continent", name: "Chatter 🌏 Océanie 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/JOHS0H7eHsk9m1DrrXcOtS", active: true, isDefault: false, continent: "OC" },
    chatter_me_fr: { id: "chatter_me_fr", role: "Chatter", type: "continent", name: "Chatter 🕌 Moyen-Orient 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/LsWB4KtEvuT6jRG8z0lxHK", active: true, isDefault: false, continent: "ME" },
    chatter_me_en: { id: "chatter_me_en", role: "Chatter", type: "continent", name: "Chatter 🕌 Moyen-Orient 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/DLq6Dqfni1qB3ow3z264n7", active: true, isDefault: false, continent: "ME" },

    // ========== INFLUENCERS (9 groupes par langue) ==========
    influencer_lang_fr: { id: "influencer_lang_fr", role: "Influencer", type: "langue", name: "Influencer Français 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/HDklfyXDxnlBbytRhlOFr7", active: true, isDefault: false },
    influencer_lang_en: { id: "influencer_lang_en", role: "Influencer", type: "langue", name: "Influencer English 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/EADHIewYh2UAIt5dl1VNm3", active: true, isDefault: true },
    influencer_lang_es: { id: "influencer_lang_es", role: "Influencer", type: "langue", name: "Influencer Español 🇪🇸", lang: "es", inviteLink: "https://chat.whatsapp.com/IPnhUIprj4OIMebCRUkgNn", active: true, isDefault: false },
    influencer_lang_pt: { id: "influencer_lang_pt", role: "Influencer", type: "langue", name: "Influencer Português 🇧🇷", lang: "pt", inviteLink: "https://chat.whatsapp.com/Eg5ZmcjYLbiBiCs9iedWta", active: true, isDefault: false },
    influencer_lang_de: { id: "influencer_lang_de", role: "Influencer", type: "langue", name: "Influencer Deutsch 🇩🇪", lang: "de", inviteLink: "https://chat.whatsapp.com/CieFk5FMULhCedwc5eE6WM", active: true, isDefault: false },
    influencer_lang_ru: { id: "influencer_lang_ru", role: "Influencer", type: "langue", name: "Influencer Russkiy 🇷🇺", lang: "ru", inviteLink: "https://chat.whatsapp.com/GnoruhuaQvd2ZUHC3KyRE2", active: true, isDefault: false },
    influencer_lang_ar: { id: "influencer_lang_ar", role: "Influencer", type: "langue", name: "Influencer Al-Arabiyya 🇸🇦", lang: "ar", inviteLink: "https://chat.whatsapp.com/IPDcxDXEHma7pPERfEGXgb", active: true, isDefault: false },
    influencer_lang_zh: { id: "influencer_lang_zh", role: "Influencer", type: "langue", name: "Influencer Zhongwen 🇨🇳", lang: "zh", inviteLink: "https://chat.whatsapp.com/D1VKYOvX5FoI79hpAsaRuA", active: true, isDefault: false },
    influencer_lang_hi: { id: "influencer_lang_hi", role: "Influencer", type: "langue", name: "Influencer Hindi 🇮🇳", lang: "hi", inviteLink: "https://chat.whatsapp.com/DHCUBSd6fkZ4NTOMn9WuDP", active: true, isDefault: false },

    // ========== BLOGGERS (9 groupes par langue) ==========
    blogger_lang_fr: { id: "blogger_lang_fr", role: "Blogger", type: "langue", name: "Blogger Français 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/GqLo6X9OBNQ173rIggOznO", active: true, isDefault: false },
    blogger_lang_en: { id: "blogger_lang_en", role: "Blogger", type: "langue", name: "Blogger English 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/Ex3h1uCAB36HWbQyEiK3RK", active: true, isDefault: true },
    blogger_lang_es: { id: "blogger_lang_es", role: "Blogger", type: "langue", name: "Blogger Español 🇪🇸", lang: "es", inviteLink: "https://chat.whatsapp.com/EETaTdkvkuqEj3mI1QqftP", active: true, isDefault: false },
    blogger_lang_pt: { id: "blogger_lang_pt", role: "Blogger", type: "langue", name: "Blogger Português 🇧🇷", lang: "pt", inviteLink: "https://chat.whatsapp.com/G1RMkDtmGRcJeeXyAZqCmD", active: true, isDefault: false },
    blogger_lang_de: { id: "blogger_lang_de", role: "Blogger", type: "langue", name: "Blogger Deutsch 🇩🇪", lang: "de", inviteLink: "https://chat.whatsapp.com/LjPgMUiwVzUC7LIobVKbiR", active: true, isDefault: false },
    blogger_lang_ru: { id: "blogger_lang_ru", role: "Blogger", type: "langue", name: "Blogger Russkiy 🇷🇺", lang: "ru", inviteLink: "https://chat.whatsapp.com/H6cIpeLF7Vm2MGp2fXI3Yk", active: true, isDefault: false },
    blogger_lang_ar: { id: "blogger_lang_ar", role: "Blogger", type: "langue", name: "Blogger Al-Arabiyya 🇸🇦", lang: "ar", inviteLink: "https://chat.whatsapp.com/JJZGZGcSPXIFVpPP7rrMes", active: true, isDefault: false },
    blogger_lang_zh: { id: "blogger_lang_zh", role: "Blogger", type: "langue", name: "Blogger Zhongwen 🇨🇳", lang: "zh", inviteLink: "https://chat.whatsapp.com/HgFNzqjYLWqH5jBZhCAmEb", active: true, isDefault: false },
    blogger_lang_hi: { id: "blogger_lang_hi", role: "Blogger", type: "langue", name: "Blogger Hindi 🇮🇳", lang: "hi", inviteLink: "https://chat.whatsapp.com/BrbIZ71SuJ0HdsZmZHTda0", active: true, isDefault: false },

    // ========== GROUP ADMINS (9 groupes par langue) ==========
    groupAdmin_lang_fr: { id: "groupAdmin_lang_fr", role: "Group Admin", type: "langue", name: "Group Admin Français 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/DnrWMG0vvozLEr3lKSXcgX", active: true, isDefault: false },
    groupAdmin_lang_en: { id: "groupAdmin_lang_en", role: "Group Admin", type: "langue", name: "Group Admin English 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/BpaFoRN2JWeE7PFEZCC15n", active: true, isDefault: true },
    groupAdmin_lang_es: { id: "groupAdmin_lang_es", role: "Group Admin", type: "langue", name: "Group Admin Español 🇪🇸", lang: "es", inviteLink: "https://chat.whatsapp.com/DD9qehOncPz3cCf2xPFH4P", active: true, isDefault: false },
    groupAdmin_lang_pt: { id: "groupAdmin_lang_pt", role: "Group Admin", type: "langue", name: "Group Admin Português 🇧🇷", lang: "pt", inviteLink: "https://chat.whatsapp.com/Gvo57KayELA1xhdqgdVWqA", active: true, isDefault: false },
    groupAdmin_lang_de: { id: "groupAdmin_lang_de", role: "Group Admin", type: "langue", name: "Group Admin Deutsch 🇩🇪", lang: "de", inviteLink: "https://chat.whatsapp.com/Hu8FYSscMtzFI5tluhLGUn", active: true, isDefault: false },
    groupAdmin_lang_ru: { id: "groupAdmin_lang_ru", role: "Group Admin", type: "langue", name: "Group Admin Russkiy 🇷🇺", lang: "ru", inviteLink: "https://chat.whatsapp.com/KhZZcsmROSpG0liiRb1vIg", active: true, isDefault: false },
    groupAdmin_lang_ar: { id: "groupAdmin_lang_ar", role: "Group Admin", type: "langue", name: "Group Admin Al-Arabiyya 🇸🇦", lang: "ar", inviteLink: "https://chat.whatsapp.com/FMzUAzGtSh7LTvXxluRyzy", active: true, isDefault: false },
    groupAdmin_lang_zh: { id: "groupAdmin_lang_zh", role: "Group Admin", type: "langue", name: "Group Admin Zhongwen 🇨🇳", lang: "zh", inviteLink: "https://chat.whatsapp.com/H8axTEUiGWo9yyKQnw7dah", active: true, isDefault: false },
    groupAdmin_lang_hi: { id: "groupAdmin_lang_hi", role: "Group Admin", type: "langue", name: "Group Admin Hindi 🇮🇳", lang: "hi", inviteLink: "https://chat.whatsapp.com/BmCPXwQrVEmEXp4AhAeJE2", active: true, isDefault: false },

    // ========== CLIENTS (9 groupes par langue) ==========
    client_lang_fr: { id: "client_lang_fr", role: "Client", type: "langue", name: "Client Français 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/LGqbyYqDKBo5oKuVL7VyPv", active: true, isDefault: false },
    client_lang_en: { id: "client_lang_en", role: "Client", type: "langue", name: "Client English 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/LPn67ly7GaKCmkGTslfzbS", active: true, isDefault: true },
    client_lang_es: { id: "client_lang_es", role: "Client", type: "langue", name: "Client Español 🇪🇸", lang: "es", inviteLink: "https://chat.whatsapp.com/LnoZHwVLtq2Dn8vDCY1lUS", active: true, isDefault: false },
    client_lang_pt: { id: "client_lang_pt", role: "Client", type: "langue", name: "Client Português 🇧🇷", lang: "pt", inviteLink: "https://chat.whatsapp.com/J77OETpgVp8IWc9IuhscqX", active: true, isDefault: false },
    client_lang_de: { id: "client_lang_de", role: "Client", type: "langue", name: "Client Deutsch 🇩🇪", lang: "de", inviteLink: "https://chat.whatsapp.com/HO6IO5wANuQ2BzDg5e8jJs", active: true, isDefault: false },
    client_lang_ru: { id: "client_lang_ru", role: "Client", type: "langue", name: "Client Russkiy 🇷🇺", lang: "ru", inviteLink: "https://chat.whatsapp.com/EqEyTtQN9lm1OzD2cxhB0g", active: true, isDefault: false },
    client_lang_ar: { id: "client_lang_ar", role: "Client", type: "langue", name: "Client Al-Arabiyya 🇸🇦", lang: "ar", inviteLink: "https://chat.whatsapp.com/Egwdyu1Pw4gFIIZ31gXEkJ", active: true, isDefault: false },
    client_lang_zh: { id: "client_lang_zh", role: "Client", type: "langue", name: "Client Zhongwen 🇨🇳", lang: "zh", inviteLink: "https://chat.whatsapp.com/Cj6StuEbg1lCIn5uiEK9wM", active: true, isDefault: false },
    client_lang_hi: { id: "client_lang_hi", role: "Client", type: "langue", name: "Client Hindi 🇮🇳", lang: "hi", inviteLink: "https://chat.whatsapp.com/Jk5m17BCxJREaYOqWyKMvr", active: true, isDefault: false },

    // ========== AVOCATS (9 groupes par langue) ==========
    lawyer_lang_fr: { id: "lawyer_lang_fr", role: "Avocat", type: "langue", name: "Avocat Français 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/KwKVJILGvIY7FYutvJYlVc", active: true, isDefault: false },
    lawyer_lang_en: { id: "lawyer_lang_en", role: "Avocat", type: "langue", name: "Avocat English 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/KPVBNRJU9RSBhLwoFnHOYj", active: true, isDefault: true },
    lawyer_lang_es: { id: "lawyer_lang_es", role: "Avocat", type: "langue", name: "Avocat Español 🇪🇸", lang: "es", inviteLink: "https://chat.whatsapp.com/BjjDAw1lkbbEB7T0w8Okbp", active: true, isDefault: false },
    lawyer_lang_pt: { id: "lawyer_lang_pt", role: "Avocat", type: "langue", name: "Avocat Português 🇧🇷", lang: "pt", inviteLink: "https://chat.whatsapp.com/EbOouSl6OIELTPIIvdivvx", active: true, isDefault: false },
    lawyer_lang_de: { id: "lawyer_lang_de", role: "Avocat", type: "langue", name: "Avocat Deutsch 🇩🇪", lang: "de", inviteLink: "https://chat.whatsapp.com/DoK1HV7IgPw1wRY0PugiGX", active: true, isDefault: false },
    lawyer_lang_ru: { id: "lawyer_lang_ru", role: "Avocat", type: "langue", name: "Avocat Russkiy 🇷🇺", lang: "ru", inviteLink: "https://chat.whatsapp.com/GfXMxwQ9IreANeL9L6PvlQ", active: true, isDefault: false },
    lawyer_lang_ar: { id: "lawyer_lang_ar", role: "Avocat", type: "langue", name: "Avocat Al-Arabiyya 🇸🇦", lang: "ar", inviteLink: "https://chat.whatsapp.com/LefbhJ3PtZLHFgMt2WJgob", active: true, isDefault: false },
    lawyer_lang_zh: { id: "lawyer_lang_zh", role: "Avocat", type: "langue", name: "Avocat Zhongwen 🇨🇳", lang: "zh", inviteLink: "https://chat.whatsapp.com/DSyOW8ULYJy1mNGdLp6YyW", active: true, isDefault: false },
    lawyer_lang_hi: { id: "lawyer_lang_hi", role: "Avocat", type: "langue", name: "Avocat Hindi 🇮🇳", lang: "hi", inviteLink: "https://chat.whatsapp.com/IwOY12dm4KQ8ATZNXULLCC", active: true, isDefault: false },

    // ========== EXPATRIÉS AIDANTS (9 groupes par langue) ==========
    expat_lang_fr: { id: "expat_lang_fr", role: "Expatrié Aidant", type: "langue", name: "Expatrié Aidant Français 🇫🇷", lang: "fr", inviteLink: "https://chat.whatsapp.com/CxspzVb4HRBGNTzzNu9giT", active: true, isDefault: false },
    expat_lang_en: { id: "expat_lang_en", role: "Expatrié Aidant", type: "langue", name: "Expatrié Aidant English 🇬🇧", lang: "en", inviteLink: "https://chat.whatsapp.com/KcuVqyIx2Mg9HOeOmVaKEc", active: true, isDefault: true },
    expat_lang_es: { id: "expat_lang_es", role: "Expatrié Aidant", type: "langue", name: "Expatrié Aidant Español 🇪🇸", lang: "es", inviteLink: "https://chat.whatsapp.com/EhGJL62Ie7J6xK1AbDXEGb", active: true, isDefault: false },
    expat_lang_pt: { id: "expat_lang_pt", role: "Expatrié Aidant", type: "langue", name: "Expatrié Aidant Português 🇧🇷", lang: "pt", inviteLink: "https://chat.whatsapp.com/DIRSNWNTIeg9syWxa2LH6L", active: true, isDefault: false },
    expat_lang_de: { id: "expat_lang_de", role: "Expatrié Aidant", type: "langue", name: "Expatrié Aidant Deutsch 🇩🇪", lang: "de", inviteLink: "https://chat.whatsapp.com/Hn2o0nBap2cFirFClbmKtF", active: true, isDefault: false },
    expat_lang_ru: { id: "expat_lang_ru", role: "Expatrié Aidant", type: "langue", name: "Expatrié Aidant Russkiy 🇷🇺", lang: "ru", inviteLink: "https://chat.whatsapp.com/KuDbakUqANNJ8OtoOIdLP1", active: true, isDefault: false },
    expat_lang_ar: { id: "expat_lang_ar", role: "Expatrié Aidant", type: "langue", name: "Expatrié Aidant Al-Arabiyya 🇸🇦", lang: "ar", inviteLink: "https://chat.whatsapp.com/Ke3O0Kqc29JG2kEpFhQU5t", active: true, isDefault: false },
    expat_lang_zh: { id: "expat_lang_zh", role: "Expatrié Aidant", type: "langue", name: "Expatrié Aidant Zhongwen 🇨🇳", lang: "zh", inviteLink: "https://chat.whatsapp.com/BhIxBmI17yWH6bLrFC1yzJ", active: true, isDefault: false },
    expat_lang_hi: { id: "expat_lang_hi", role: "Expatrié Aidant", type: "langue", name: "Expatrié Aidant Hindi 🇮🇳", lang: "hi", inviteLink: "https://chat.whatsapp.com/L6QT0JKJM0sKr4RcqWngFi", active: true, isDefault: false },
  },
};

/**
 * Construit la config WhatsApp à partir des données seed hardcodées.
 * Utilisé comme fallback quand le document Firestore n'existe pas encore.
 * Ne fait AUCUNE écriture Firestore — pure function.
 */
export function buildConfigFromSeedData(): WhatsAppGroupsConfig {
  const groups: WhatsAppGroup[] = [];
  const defaultGroupIds: Record<string, string> = {};

  for (const [, raw] of Object.entries(WHATSAPP_GROUPS_SEED_DATA.groups)) {
    const group = transformGroup(raw);
    groups.push(group);
    if (raw.isDefault) {
      defaultGroupIds[group.role] = group.id;
    }
  }

  return {
    groups,
    defaultGroupIds: defaultGroupIds as Record<WhatsAppRole, string>,
  };
}

/**
 * Seed avec les données intégrées (appel simple depuis l'admin)
 */
export async function seedWhatsAppGroups(adminUid: string) {
  return seedWhatsAppGroupsFromJson(adminUid, WHATSAPP_GROUPS_SEED_DATA);
}
