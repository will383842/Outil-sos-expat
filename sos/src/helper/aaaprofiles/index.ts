// src/helper/aaaprofiles/index.ts

import admin_aaa_fr from "./admin_aaa_fr.json";
import admin_aaa_en from "./admin_aaa_en.json";
import admin_aaa_es from "./admin_aaa_es.json";
import admin_aaa_de from "./admin_aaa_de.json";
import admin_aaa_ru from "./admin_aaa_ru.json";
import admin_aaa_pt from "./admin_aaa_pt.json";
import admin_aaa_zh from "./admin_aaa_zh.json";
import admin_aaa_ar from "./admin_aaa_ar.json";
import admin_aaa_hi from "./admin_aaa_hi.json";

// Langues gérées pour AAA
export type AaaLanguage =
  | "fr"
  | "en"
  | "es"
  | "de"
  | "ru"
  | "pt"
  | "zh"
  | "ar"
  | "hi";

// Type explicite plutôt qu'inféré
type AaaJsonShape = {
  admin: {
    loading: string;
    aaa: Record<string, any>; // Structure flexible
  };
};

type AaaTranslationsByLocale = Record<AaaLanguage, AaaJsonShape>;

// Objet brut (imbriqué) par langue - avec assertion de type
export const aaaProfilesTranslations: AaaTranslationsByLocale = {
  fr: admin_aaa_fr as AaaJsonShape,
  en: admin_aaa_en as AaaJsonShape,
  es: admin_aaa_es as AaaJsonShape,
  de: admin_aaa_de as AaaJsonShape,
  ru: admin_aaa_ru as AaaJsonShape,
  pt: admin_aaa_pt as AaaJsonShape,
  zh: admin_aaa_zh as AaaJsonShape,
  ar: admin_aaa_ar as AaaJsonShape,
  hi: admin_aaa_hi as AaaJsonShape,
};

// Type des messages plats attendus par react-intl
export type FlatMessages = Record<string, string>;

// { admin: { aaa: { title: "X" } } } → { "admin.aaa.title": "X" }
function flattenMessages(
  obj: Record<string, any>,
  prefix = ""
): FlatMessages {
  const result: FlatMessages = {};

  Object.entries(obj).forEach(([key, value]) => {
    const id = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenMessages(value as Record<string, any>, id)
      );
    } else {
      result[id] = String(value);
    }
  });

  return result;
}

// On garde toutes les clés existantes
// + on ajoute les clés AAA aplaties (admin.aaa.*)
export function mergeAaaTranslations(
  baseTranslations: FlatMessages,
  aaaTranslations: AaaJsonShape
): FlatMessages {
  const flatAaa = flattenMessages(aaaTranslations as Record<string, any>);
  return {
    ...baseTranslations,
    ...flatAaa,
  };
}