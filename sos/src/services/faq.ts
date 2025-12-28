// src/services/faq.ts
// Service centralisé pour la gestion des FAQ (aligné sur helpCenter.ts)

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  DocumentData,
  updateDoc,
  where,
  orderBy,
  increment,
} from "firebase/firestore";
import { db } from "../config/firebase";

// Les 9 langues supportées
export const SUPPORTED_LANGUAGES = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "ch", name: "中文", flag: "🇨🇳" },
] as const;

export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGES[number]["code"];

// Catégories de FAQ (6 catégories principales - traduites en 9 langues)
export const FAQ_CATEGORIES = [
  {
    id: "discover",
    name: {
      fr: "Découvrir SOS-Expat",
      en: "Discover SOS-Expat",
      es: "Descubrir SOS-Expat",
      de: "SOS-Expat entdecken",
      pt: "Descobrir SOS-Expat",
      ru: "Узнать о SOS-Expat",
      hi: "SOS-Expat के बारे में जानें",
      ar: "اكتشف SOS-Expat",
      ch: "了解SOS-Expat"
    },
    icon: "globe",
    order: 1
  },
  {
    id: "clients",
    name: {
      fr: "Je cherche de l'aide",
      en: "I need help",
      es: "Necesito ayuda",
      de: "Ich brauche Hilfe",
      pt: "Preciso de ajuda",
      ru: "Мне нужна помощь",
      hi: "मुझे मदद चाहिए",
      ar: "أحتاج مساعدة",
      ch: "我需要帮助"
    },
    icon: "user",
    order: 2
  },
  {
    id: "providers",
    name: {
      fr: "Je suis prestataire",
      en: "I'm a provider",
      es: "Soy proveedor",
      de: "Ich bin Anbieter",
      pt: "Sou prestador",
      ru: "Я провайдер",
      hi: "मैं प्रदाता हूं",
      ar: "أنا مقدم خدمة",
      ch: "我是服务提供商"
    },
    icon: "briefcase",
    order: 3
  },
  {
    id: "payments",
    name: {
      fr: "Paiements & Tarifs",
      en: "Payments & Pricing",
      es: "Pagos y Tarifas",
      de: "Zahlungen & Preise",
      pt: "Pagamentos e Preços",
      ru: "Платежи и цены",
      hi: "भुगतान और मूल्य",
      ar: "المدفوعات والأسعار",
      ch: "付款和价格"
    },
    icon: "credit-card",
    order: 4
  },
  {
    id: "account",
    name: {
      fr: "Compte & Inscription",
      en: "Account & Registration",
      es: "Cuenta e Inscripción",
      de: "Konto & Registrierung",
      pt: "Conta e Cadastro",
      ru: "Аккаунт и регистрация",
      hi: "खाता और पंजीकरण",
      ar: "الحساب والتسجيل",
      ch: "账户和注册"
    },
    icon: "users",
    order: 5
  },
  {
    id: "technical",
    name: {
      fr: "Technique & Sécurité",
      en: "Technical & Security",
      es: "Técnico y Seguridad",
      de: "Technik & Sicherheit",
      pt: "Técnico e Segurança",
      ru: "Техника и безопасность",
      hi: "तकनीकी और सुरक्षा",
      ar: "التقنية والأمان",
      ch: "技术和安全"
    },
    icon: "shield",
    order: 6
  },
] as const;

export type FAQCategoryId = typeof FAQ_CATEGORIES[number]["id"];

// Interface pour une FAQ
export interface FAQ {
  id: string;
  question: Record<string, string>;    // Multilingue: {fr: "...", en: "...", ...}
  answer: Record<string, string>;      // Multilingue
  slug: Record<string, string>;        // Multilingue
  category: FAQCategoryId | string;
  tags: string[];
  order: number;
  isActive: boolean;
  isFooter?: boolean;                  // Afficher dans le footer
  views?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Type pour la création/mise à jour
export type FAQInput = Omit<FAQ, "id" | "createdAt" | "updatedAt" | "views">;

type TimestampLike = Timestamp | { toDate: () => Date };

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as TimestampLike).toDate === "function"
  ) {
    return (value as TimestampLike).toDate();
  }
  return undefined;
};

// Helper to get value from Record<string, string>
export const getTranslatedValue = (
  value: Record<string, string> | string | undefined,
  locale: string,
  fallback: string = ""
): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value[locale] ?? value["fr"] ?? value["en"] ?? Object.values(value)[0] ?? fallback;
  }
  return fallback;
};

// Helper to get first available translation
export const getFirstAvailableTranslation = (
  translations: Record<string, string> | undefined,
  fallback: string = ""
): string => {
  if (!translations) return fallback;
  for (const lang of SUPPORTED_LANGUAGES) {
    if (translations[lang.code] && translations[lang.code].trim().length > 0) {
      return translations[lang.code];
    }
  }
  return fallback;
};

// Helper to get first available language code
export const getFirstAvailableLanguageCode = (
  translations: Record<string, string> | undefined,
  fallback: string = "fr"
): string => {
  if (!translations) return fallback;
  for (const lang of SUPPORTED_LANGUAGES) {
    if (translations[lang.code] && translations[lang.code].trim().length > 0) {
      return lang.code;
    }
  }
  return fallback;
};

// Mapper Firestore document to FAQ
const mapFAQ = (snap: DocumentData & { id: string }): FAQ => {
  return {
    id: snap.id,
    question: snap.question || {},
    answer: snap.answer || {},
    slug: snap.slug || {},
    category: snap.category || "general",
    tags: Array.isArray(snap.tags) ? snap.tags : [],
    order: Number(snap.order ?? 999),
    isActive: Boolean(snap.isActive ?? true),
    isFooter: Boolean(snap.isFooter ?? false),
    views: Number(snap.views ?? 0),
    createdAt: toDate(snap.createdAt),
    updatedAt: toDate(snap.updatedAt),
  };
};

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Liste toutes les FAQ
 */
export const listFAQs = async (options?: {
  category?: string;
  onlyActive?: boolean;
  locale?: string;
}): Promise<FAQ[]> => {
  const faqsCol = collection(db, "faqs");
  const constraints = [];

  if (options?.category) {
    constraints.push(where("category", "==", options.category));
  }
  if (options?.onlyActive) {
    constraints.push(where("isActive", "==", true));
  }

  const q = query(faqsCol, ...constraints);
  const snap = await getDocs(q);

  let faqs = snap.docs
    .map((d) => mapFAQ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.order - b.order);

  // Si locale spécifiée, filtrer les FAQ qui ont du contenu dans cette langue
  if (options?.locale) {
    faqs = faqs.filter((faq) => {
      const hasQuestion = faq.question[options.locale!]?.trim().length > 0;
      const hasAnswer = faq.answer[options.locale!]?.trim().length > 0;
      return hasQuestion && hasAnswer;
    });
  }

  return faqs;
};

/**
 * Récupérer une FAQ par ID
 */
export const getFAQById = async (id: string): Promise<FAQ | null> => {
  const docRef = doc(db, "faqs", id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return mapFAQ({ id: snap.id, ...snap.data() });
};

/**
 * Récupérer une FAQ par slug (cherche dans toutes les langues)
 */
export const getFAQBySlug = async (slug: string, locale?: string): Promise<FAQ | null> => {
  const faqs = await listFAQs({ onlyActive: true });

  const cleanedSlug = slug.trim();

  // Chercher par slug exact d'abord
  let found = faqs.find((faq) => {
    // Vérifier dans la langue demandée
    if (locale && faq.slug[locale] === cleanedSlug) {
      return true;
    }
    // Vérifier dans toutes les langues
    return Object.values(faq.slug).includes(cleanedSlug);
  });

  // Si pas trouvé, essayer une comparaison normalisée (pour les accents)
  if (!found) {
    const normalizedSlug = cleanedSlug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    found = faqs.find((faq) => {
      return Object.values(faq.slug).some((s) => {
        const normalizedFaqSlug = s
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return normalizedFaqSlug === normalizedSlug;
      });
    });
  }

  return found || null;
};

/**
 * Créer une nouvelle FAQ
 */
export const createFAQ = async (data: FAQInput): Promise<FAQ> => {
  const faqsCol = collection(db, "faqs");
  const payload = {
    ...data,
    views: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(faqsCol, payload);
  const createdSnap = await getDoc(docRef);
  const createdData = createdSnap.data() ?? {};
  return mapFAQ({ id: docRef.id, ...createdData });
};

/**
 * Mettre à jour une FAQ
 */
export const updateFAQ = async (
  id: string,
  data: Partial<FAQInput>
): Promise<void> => {
  await updateDoc(doc(db, "faqs", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Supprimer une FAQ
 */
export const deleteFAQ = (id: string): Promise<void> =>
  deleteDoc(doc(db, "faqs", id));

/**
 * Incrémenter le compteur de vues
 */
export const incrementFAQViews = async (id: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "faqs", id), {
      views: increment(1),
    });
  } catch (error) {
    console.warn("[incrementFAQViews] Error:", error);
  }
};

// ============================================================================
// Translation Helpers
// ============================================================================

/**
 * Générer un slug à partir du texte avec support Unicode (translittération)
 */
export const generateSlug = (text: string): string => {
  if (!text || text.trim().length === 0) {
    return "untitled";
  }

  // Translittération cyrillique (russe)
  const cyrillicMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };

  // Translittération arabe
  const arabicMap: Record<string, string> = {
    'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's',
    'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
    'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
    'ء': '', 'ة': 'a', 'ى': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ؤ': 'w', 'ئ': 'y'
  };

  // Pinyin simplifié chinois
  const chineseMap: Record<string, string> = {
    '什': 'shen', '么': 'me', '是': 'shi', '的': 'de', '我': 'wo', '你': 'ni',
    '他': 'ta', '她': 'ta', '们': 'men', '这': 'zhe', '那': 'na', '有': 'you',
    '在': 'zai', '不': 'bu', '了': 'le', '和': 'he', '与': 'yu', '为': 'wei',
    '如': 'ru', '何': 'he', '可': 'ke', '以': 'yi', '能': 'neng', '会': 'hui',
    '要': 'yao', '就': 'jiu', '都': 'dou', '也': 'ye', '到': 'dao', '说': 'shuo',
    '问': 'wen', '题': 'ti', '答': 'da', '案': 'an', '帮': 'bang', '助': 'zhu',
    '服': 'fu', '务': 'wu', '支': 'zhi', '付': 'fu', '费': 'fei', '用': 'yong',
    '语': 'yu', '言': 'yan', '持': 'chi', '哪': 'na', '些': 'xie',
    '平': 'ping', '台': 'tai', '律': 'lv', '师': 'shi', '专': 'zhuan', '家': 'jia',
    '安': 'an', '全': 'quan', '数': 'shu', '据': 'ju', '保': 'bao', '护': 'hu',
    '账': 'zhang', '户': 'hu', '注': 'zhu', '册': 'ce', '登': 'deng', '录': 'lu',
    '怎': 'zen', '样': 'yang', '工': 'gong', '作': 'zuo', '吗': 'ma', '呢': 'ne'
  };

  // Translittération Hindi (Devanagari)
  const hindiMap: Record<string, string> = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'क': 'k', 'ख': 'kh',
    'ग': 'g', 'घ': 'gh', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't',
    'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n', 'प': 'p', 'फ': 'ph',
    'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l',
    'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h', 'ा': 'a',
    'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'े': 'e', 'ै': 'ai',
    'ो': 'o', 'ौ': 'au', '्': '', 'ं': 'n', 'ः': 'h', '़': '',
    '।': '', 'ँ': 'n', 'ृ': 'ri', 'ङ': 'ng', 'ञ': 'ny'
  };

  let processedText = text.toLowerCase();

  // Cyrillique
  if (/[\u0400-\u04FF]/.test(processedText)) {
    processedText = processedText.split('').map(char => cyrillicMap[char] || char).join('');
  }

  // Arabe
  if (/[\u0600-\u06FF]/.test(processedText)) {
    processedText = processedText.split('').map(char => arabicMap[char] || char).join('');
  }

  // Chinois
  if (/[\u4E00-\u9FFF]/.test(processedText)) {
    processedText = processedText.split('').map(char => chineseMap[char] || char).join('');
  }

  // Hindi
  if (/[\u0900-\u097F]/.test(processedText)) {
    processedText = processedText.split('').map(char => hindiMap[char] || char).join('');
  }

  let slug = processedText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 100);

  if (!slug || slug.trim().length === 0) {
    slug = "untitled";
  }
  return slug;
};

/**
 * Détecter la langue d'un texte
 */
export const detectLanguage = async (text: string): Promise<string> => {
  if (!text || text.trim().length === 0) {
    return "en";
  }
  try {
    const detectUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text.substring(0, 500))}`;
    const response = await fetch(detectUrl);
    if (response.ok) {
      const data = await response.json() as any;
      let detectedLang: string | null = null;
      if (typeof data === "string") {
        detectedLang = data;
      } else if (Array.isArray(data) && data.length > 2 && data[2]) {
        detectedLang = data[2];
      } else if (data && typeof data === "object" && data.src) {
        detectedLang = data.src;
      }
      if (detectedLang) {
        const langMap: Record<string, string> = {
          fr: "fr", en: "en", es: "es", pt: "pt", de: "de",
          ru: "ru", zh: "ch", "zh-CN": "ch", "zh-TW": "ch", "zh-cn": "ch",
          hi: "hi", ar: "ar",
        };
        const mappedLang = langMap[detectedLang.toLowerCase()] || langMap[detectedLang];
        if (mappedLang) {
          return mappedLang;
        }
      }
    }
  } catch (error) {
    console.warn("[detectLanguage] Error:", error);
  }
  // Fallback heuristics
  if (/[àâäéèêëïîôùûüÿç]/.test(text)) return "fr";
  if (/[ñáéíóúü¿¡]/.test(text)) return "es";
  if (/[äöüß]/.test(text)) return "de";
  if (/[а-яё]/.test(text)) return "ru";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u4e00-\u9fff]/.test(text)) return "ch";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[áàâãéêíóôõúç]/.test(text)) return "pt";
  return "en";
};

/**
 * Traduire un texte vers une langue cible
 */
export const translateText = async (
  text: string,
  fromLang: string,
  toLang: string
): Promise<string> => {
  if (!text || text.trim().length === 0) return text;
  if (fromLang === toLang) return text;

  const languageMap: Record<string, string> = {
    fr: "fr", en: "en", es: "es", pt: "pt", de: "de",
    ru: "ru", ch: "zh", hi: "hi", ar: "ar",
  };
  const targetLang = languageMap[toLang] || toLang;
  const sourceLang = languageMap[fromLang] || fromLang;

  // Try MyMemory API
  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    const response = await fetch(myMemoryUrl);
    if (response.ok) {
      const data = await response.json() as { responseData?: { translatedText?: string } };
      if (data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (error) {
    console.warn("[translateText] MyMemory error:", error);
  }

  // Fallback: Google Translate
  try {
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(googleUrl);
    if (response.ok) {
      const data = await response.json() as any;
      if (data && Array.isArray(data) && data[0] && Array.isArray(data[0])) {
        const translated = data[0].map((item: any[]) => item[0]).join("");
        if (translated) return translated;
      }
    }
  } catch (error) {
    console.warn("[translateText] Google error:", error);
  }

  return text;
};

/**
 * Traduire une FAQ vers toutes les langues
 */
export const translateFAQToAllLanguages = async (
  question: string,
  answer: string
): Promise<{
  question: Record<string, string>;
  answer: Record<string, string>;
  slug: Record<string, string>;
}> => {
  const sourceLang = await detectLanguage(question);
  console.log(`[translateFAQ] Detected source language: ${sourceLang}`);

  const translatedQuestion: Record<string, string> = {};
  const translatedAnswer: Record<string, string> = {};
  const slugMap: Record<string, string> = {};

  // Get English translation as fallback for non-Latin scripts
  let englishQuestion = question;
  if (sourceLang !== "en") {
    englishQuestion = await translateText(question, sourceLang, "en");
  }

  const translationPromises = SUPPORTED_LANGUAGES.map(async (lang) => {
    const [translatedQ, translatedA] = await Promise.all([
      translateText(question, sourceLang, lang.code),
      translateText(answer, sourceLang, lang.code),
    ]);

    translatedQuestion[lang.code] = translatedQ;
    translatedAnswer[lang.code] = translatedA;

    // Generate slug
    // For non-Latin scripts (ru, ar, ch, hi), always use English slug with language prefix
    // This ensures clean ASCII URLs and avoids transliteration issues
    const NON_LATIN_LANGUAGES = ["hi", "ru", "ar", "ch"];

    let generatedSlug: string;
    if (NON_LATIN_LANGUAGES.includes(lang.code)) {
      // Always use English slug with language prefix for non-Latin scripts
      // e.g., "ar-what-languages-are-supported", "ru-what-languages-are-supported"
      generatedSlug = `${lang.code}-${generateSlug(englishQuestion)}`;
    } else {
      // For Latin-based languages (fr, en, es, de, pt), generate slug from translated question
      const slugSource = translatedQ && translatedQ.trim().length > 0 ? translatedQ : question;
      generatedSlug = generateSlug(slugSource);
    }

    slugMap[lang.code] = generatedSlug;
  });

  await Promise.all(translationPromises);

  return { question: translatedQuestion, answer: translatedAnswer, slug: slugMap };
};
