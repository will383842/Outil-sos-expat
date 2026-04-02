/**
 * Annuaire Expatriés — Redesign Premium 2026
 * Palette: Rouge #DC2626 / Noir #0F172A / Blanc
 * UX: personalised by nationality, smart category ordering, emergency-first
 * Route: /fr-fr/annuaire, /en-us/expat-directory, etc.
 * URL: ?pays=france  →  country detail view (bookmarkable)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import { phoneCodesData } from "@/data/phone-codes";
import {
  Search, MapPin, Phone, Mail, Clock, ExternalLink, Shield,
  ArrowLeft, X, AlertTriangle, Globe, ChevronRight, Sparkles,
  Building2, FileText, Heart, Home, Briefcase, Landmark, BookOpen,
  Train, Wifi, Receipt, Scale, Users, Siren,
} from "lucide-react";

// ============================================================
// CONFIG
// ============================================================

const MARKETING_API = (import.meta.env.VITE_MARKETING_API_URL || "https://influenceurs.life-expat.com").replace(/\/$/, "");
const BASE_URL = "https://sos-expat.com";

const SUPPORTED_LANGUAGES = ["fr", "en", "es", "de", "pt", "ru", "ch", "ar", "hi"] as const;
const CANONICAL_LOCALES: Record<string, string> = {
  fr: "fr-fr", en: "en-us", es: "es-es", de: "de-de", ru: "ru-ru",
  pt: "pt-pt", ch: "zh-cn", hi: "hi-in", ar: "ar-sa",
};
const ANNUAIRE_SLUGS: Record<string, string> = {
  fr: "annuaire", en: "expat-directory", es: "directorio-expat",
  de: "expat-verzeichnis", ru: "spravochnik-expat", pt: "diretorio-expat",
  ch: "zhinan-expat", hi: "nirdeshika-expat", ar: "dalil-expat",
};

const LS_NATIONALITY      = "annuaire_nationality";
const LS_NATIONALITY_NAME = "annuaire_nationality_name";
const LS_RECENT           = "annuaire_recent";
const LS_PICKER_DISMISSED = "annuaire_picker_dismissed";
const MAX_RECENT          = 6;

const POPULAR_CODES = ["FR", "ES", "PT", "MA", "CA", "AU", "DE", "BE", "CH", "GB", "US", "AE"];

const CATEGORY_ORDER = [
  "urgences", "ambassade", "immigration", "sante",
  "logement", "banque", "emploi", "education",
  "transport", "telecom", "fiscalite", "juridique", "communaute",
];

// ============================================================
// TYPES
// ============================================================

interface CountrySummary {
  country_code: string;
  country_name: string;
  country_slug: string;
  continent: string;
  total_links: number;
  official_links: number;
  with_address: number;
  with_phone: number;
  categories_count: number;
  emergency_number: string | null;
}

interface DirectoryEntry {
  id: number;
  country_code: string;
  category: string;
  sub_category: string | null;
  title: string;
  url: string;
  domain: string;
  description: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  opening_hours: string | null;
  latitude: number | null;
  longitude: number | null;
  emergency_number: string | null;
  trust_score: number;
  is_official: boolean;
  nationality_code: string | null;
  nationality_name: string | null;
  translations: Record<string, { title?: string; description?: string }> | null;
}

interface CountryDetail {
  country: {
    code: string;
    name: string;
    slug: string;
    continent: string;
    emergency_number: string | null;
  };
  entries: Record<string, DirectoryEntry[]>;
}

interface UserNationality {
  code: string;
  name: string;
}

// ============================================================
// ANIMATIONS
// ============================================================

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const cardHover = {
  whileHover: { scale: 1.02, y: -4 },
  transition: { type: "spring", stiffness: 300, damping: 20 },
};

// ============================================================
// COPY (i18n)
// ============================================================

const T: Record<string, Record<string, string>> = {
  pageTitle:         { fr: "Annuaire mondial de l'expatriation, voyageurs et vacanciers", en: "World Directory for Expats, Travelers & Vacationers", es: "Directorio Mundial de Expatriados, Viajeros y Turistas", de: "Weltverzeichnis für Expats, Reisende & Urlauber", ru: "Мировой справочник для экспатов, путешественников и туристов", pt: "Diretório Mundial de Expatriados, Viajantes e Turistas", ar: "الدليل العالمي للمغتربين والمسافرين والسياح", ch: "海外人员、旅行者和度假者世界指南", hi: "प्रवासियों, यात्रियों और पर्यटकों की विश्व निर्देशिका" },
  pageDesc:          { fr: "Ressources officielles, urgences et services vérifiés dans 200+ pays", en: "Official resources, emergency contacts and verified services in 200+ countries", es: "Recursos oficiales y contactos de emergencia en más de 200 países", de: "Offizielle Ressourcen und Notfallkontakte in über 200 Ländern", ru: "Официальные ресурсы и контакты экстренных служб в 200+ странах", pt: "Recursos oficiais e contactos de emergência em 200+ países", ar: "موارد رسمية وجهات اتصال الطوارئ في أكثر من 200 دولة", ch: "200+国家的官方资源和紧急联系方式", hi: "200+ देशों में आधिकारिक संसाधन और आपातकालीन संपर्क" },
  searchPlaceholder: { fr: "Rechercher un pays de destination…",         en: "Search a destination country…",          es: "Buscar un país de destino…",              de: "Zielland suchen…",                   ru: "Поиск страны назначения…",             pt: "Pesquisar um país de destino…",          ar: "ابحث عن بلد الوجهة…",          ch: "搜索目的地国家…",    hi: "गंतव्य देश खोजें…" },
  iAmFrom:           { fr: "Je suis",                                    en: "I am",                                   es: "Soy",                                     de: "Ich bin",                            ru: "Я",                                    pt: "Sou",                                    ar: "أنا من",                       ch: "我是",            hi: "मैं हूं" },
  myNationality:     { fr: "Ma nationalité",                             en: "My nationality",                         es: "Mi nacionalidad",                         de: "Meine Nationalität",                 ru: "Моя национальность",                   pt: "Minha nacionalidade",                    ar: "جنسيتي",                       ch: "我的国籍",          hi: "मेरी राष्ट्रीयता" },
  changeNat:         { fr: "Modifier",                                   en: "Change",                                 es: "Cambiar",                                 de: "Ändern",                             ru: "Изменить",                             pt: "Alterar",                                ar: "تغيير",                        ch: "更改",             hi: "बदलें" },
  personalizeExp:    { fr: "Personnalisez votre expérience",             en: "Personalize your experience",            es: "Personaliza tu experiencia",              de: "Erfahrung personalisieren",          ru: "Персонализируйте опыт",                pt: "Personalize a sua experiência",          ar: "خصص تجربتك",                   ch: "个性化您的体验",      hi: "अपना अनुभव वैयक्तिकृत करें" },
  personalizeDesc:   { fr: "Indiquez votre nationalité pour voir en premier votre ambassade, les visas requis et les ressources les plus pertinentes.", en: "Enter your nationality to see your embassy, required visas and the most relevant resources first.", es: "Indica tu nacionalidad para ver primero tu embajada y los visados requeridos.", de: "Geben Sie Ihre Nationalität ein, um Ihre Botschaft und relevante Ressourcen zuerst zu sehen.", ru: "Укажите свою национальность, чтобы увидеть своё посольство и наиболее важные ресурсы.", pt: "Indique a sua nacionalidade para ver a sua embaixada e os recursos mais relevantes.", ar: "أدخل جنسيتك لرؤية سفارتك والموارد الأكثر صلة أولاً.", ch: "输入您的国籍，优先查看您的大使馆和最相关的资源。", hi: "अपनी राष्ट्रीयता दर्ज करें ताकि पहले अपना दूतावास और सबसे प्रासंगिक संसाधन देखें।" },
  selectNat:         { fr: "Sélectionnez votre nationalité",             en: "Select your nationality",                es: "Seleccione su nacionalidad",              de: "Nationalität wählen",                ru: "Выберите национальность",              pt: "Selecione a sua nacionalidade",          ar: "اختر جنسيتك",                  ch: "选择您的国籍",       hi: "अपनी राष्ट्रीयता चुनें" },
  confirm:           { fr: "Confirmer",                                  en: "Confirm",                                es: "Confirmar",                               de: "Bestätigen",                         ru: "Подтвердить",                          pt: "Confirmar",                              ar: "تأكيد",                        ch: "确认",             hi: "पुष्टि करें" },
  skip:              { fr: "Passer",                                     en: "Skip",                                   es: "Omitir",                                  de: "Überspringen",                       ru: "Пропустить",                           pt: "Ignorar",                                ar: "تخطي",                         ch: "跳过",             hi: "छोड़ें" },
  myKit:             { fr: "Mon kit d'installation",                     en: "My Installation Kit",                   es: "Mi kit de instalación",                   de: "Mein Installations-Kit",             ru: "Мой стартовый пакет",                  pt: "O meu kit de instalação",                ar: "حزمة الاستقرار الخاصة بي",     ch: "我的安置套件",       hi: "मेरा इंस्टॉलेशन किट" },
  myKitDesc:         { fr: "Ressources prioritaires pour votre nationalité dans ce pays", en: "Priority resources for your nationality in this country", es: "Recursos prioritarios para su nacionalidad", de: "Prioritätsressourcen für Ihre Nationalität", ru: "Приоритетные ресурсы для вашей национальности", pt: "Recursos prioritários para a sua nacionalidade", ar: "الموارد ذات الأولوية لجنسيتك في هذا البلد", ch: "本国国籍优先资源", hi: "इस देश में आपकी राष्ट्रीयता के लिए प्राथमिकता संसाधन" },
  myEmbassy:         { fr: "Mon ambassade",                              en: "My embassy",                             es: "Mi embajada",                             de: "Meine Botschaft",                    ru: "Моё посольство",                       pt: "A minha embaixada",                      ar: "سفارتي",                       ch: "我的大使馆",         hi: "मेरा दूतावास" },
  noEmbassy:         { fr: "Ambassade non répertoriée",                  en: "Embassy not listed",                    es: "Embajada no listada",                     de: "Botschaft nicht aufgeführt",         ru: "Посольство не найдено",                pt: "Embaixada não listada",                  ar: "السفارة غير مدرجة",            ch: "未列出大使馆",       hi: "दूतावास सूचीबद्ध नहीं" },
  emergency:         { fr: "Urgences",                                   en: "Emergency",                              es: "Emergencias",                             de: "Notfall",                            ru: "Экстренные службы",                    pt: "Emergência",                             ar: "الطوارئ",                      ch: "紧急情况",          hi: "आपातकाल" },
  allEmbassies:      { fr: "Voir toutes les ambassades",                 en: "See all embassies",                     es: "Ver todas las embajadas",                 de: "Alle Botschaften anzeigen",          ru: "Все посольства",                       pt: "Ver todas as embaixadas",                ar: "عرض جميع السفارات",            ch: "查看所有大使馆",      hi: "सभी दूतावास देखें" },
  filterMyNat:       { fr: "Filtrer par ma nationalité",                 en: "Filter by my nationality",              es: "Filtrar por mi nacionalidad",             de: "Nach meiner Nationalität filtern",   ru: "По моей национальности",               pt: "Filtrar pela minha nacionalidade",       ar: "تصفية حسب جنسيتي",            ch: "按我的国籍筛选",     hi: "मेरी राष्ट्रीयता से फ़िल्टर करें" },
  setNatPrompt:      { fr: "Indiquez votre nationalité pour afficher uniquement votre ambassade", en: "Set your nationality to display only your embassy", es: "Indica tu nacionalidad para ver solo tu embajada", de: "Geben Sie Ihre Nationalität ein, um nur Ihre Botschaft anzuzeigen", ru: "Укажите национальность, чтобы видеть только своё посольство", pt: "Indique a sua nacionalidade para ver apenas a sua embaixada", ar: "حدد جنسيتك لعرض سفارتك فقط", ch: "设置国籍以仅显示您的大使馆", hi: "केवल अपना दूतावास देखने के लिए राष्ट्रीयता सेट करें" },
  setNatBtn:         { fr: "Définir ma nationalité",                     en: "Set my nationality",                    es: "Definir mi nacionalidad",                 de: "Nationalität festlegen",             ru: "Указать национальность",               pt: "Definir a minha nacionalidade",          ar: "تحديد جنسيتي",                ch: "设置我的国籍",       hi: "मेरी राष्ट्रीयता सेट करें" },
  recentlyViewed:    { fr: "Récemment consultés",                        en: "Recently viewed",                       es: "Vistos recientemente",                    de: "Zuletzt angesehen",                  ru: "Недавно просмотренные",                pt: "Vistos recentemente",                    ar: "شوهد مؤخراً",                  ch: "最近查看",          hi: "हाल में देखे गए" },
  popularDest:       { fr: "Destinations populaires",                    en: "Popular destinations",                  es: "Destinos populares",                      de: "Beliebte Ziele",                     ru: "Популярные направления",               pt: "Destinos populares",                     ar: "الوجهات الشائعة",              ch: "热门目的地",         hi: "लोकप्रिय गंतव्य" },
  allCountries:      { fr: "Tous les pays",                              en: "All countries",                         es: "Todos los países",                        de: "Alle Länder",                        ru: "Все страны",                           pt: "Todos os países",                        ar: "جميع الدول",                   ch: "所有国家",          hi: "सभी देश" },
  backToList:        { fr: "Retour à l'annuaire",                        en: "Back to directory",                     es: "Volver al directorio",                    de: "Zurück zum Verzeichnis",             ru: "Назад к справочнику",                  pt: "Voltar ao diretório",                    ar: "العودة إلى الدليل",            ch: "返回目录",          hi: "निर्देशिका पर वापस" },
  official:          { fr: "Officiel",                                   en: "Official",                              es: "Oficial",                                 de: "Offiziell",                          ru: "Офиц.",                                pt: "Oficial",                                ar: "رسمي",                         ch: "官方",             hi: "आधिकारिक" },
  resources:         { fr: "ressources",                                 en: "resources",                             es: "recursos",                                de: "Ressourcen",                         ru: "ресурсов",                             pt: "recursos",                               ar: "مورد",                         ch: "资源",             hi: "संसाधन" },
  countries:         { fr: "pays",                                       en: "countries",                             es: "países",                                  de: "Länder",                             ru: "стран",                                pt: "países",                                 ar: "دول",                          ch: "国家",             hi: "देश" },
  results:           { fr: "résultat(s)",                                en: "result(s)",                             es: "resultado(s)",                            de: "Ergebnis(se)",                       ru: "результат(ов)",                        pt: "resultado(s)",                           ar: "نتيجة",                        ch: "结果",             hi: "परिणाम" },
  noResults:         { fr: "Aucun pays trouvé pour",                     en: "No country found for",                  es: "Ningún país encontrado para",             de: "Kein Land gefunden für",             ru: "Нет стран для",                        pt: "Nenhum país encontrado para",            ar: "لا توجد دولة لـ",              ch: "未找到国家：",      hi: "के लिए कोई देश नहीं मिला" },
  noData:            { fr: "Aucune ressource disponible",                en: "No resources available",                es: "Sin recursos disponibles",                de: "Keine Ressourcen verfügbar",         ru: "Нет доступных ресурсов",               pt: "Sem recursos disponíveis",               ar: "لا توجد موارد متاحة",          ch: "暂无资源",          hi: "कोई संसाधन उपलब्ध नहीं" },
  verifiedResources: { fr: "ressources vérifiées",                       en: "verified resources",                    es: "recursos verificados",                    de: "verifizierte Ressourcen",            ru: "проверенных ресурсов",                 pt: "recursos verificados",                   ar: "موارد موثقة",                  ch: "已验证资源",         hi: "सत्यापित संसाधन" },
  categoriesCovered: { fr: "catégories couvertes",                       en: "categories covered",                    es: "categorías cubiertas",                    de: "abgedeckte Kategorien",              ru: "категорий",                            pt: "categorias cobertas",                    ar: "فئات مغطاة",                   ch: "涵盖类别",          hi: "श्रेणियां" },
};

function t(key: string, lang: string): string {
  return T[key]?.[lang] ?? T[key]?.["fr"] ?? key;
}

// ============================================================
// CATEGORY METADATA
// ============================================================

const CAT_LABEL: Record<string, Record<string, string>> = {
  ambassade:   { fr: "Ambassades",      en: "Embassies",    es: "Embajadas",  de: "Botschaften", ru: "Посольства",  pt: "Embaixadas",  ar: "السفارات", ch: "大使馆", hi: "दूतावास" },
  immigration: { fr: "Immigration",    en: "Immigration",  es: "Inmigración", de: "Einwanderung",ru: "Иммиграция",  pt: "Imigração",   ar: "الهجرة",   ch: "移民",   hi: "आव्रजन" },
  sante:       { fr: "Santé",          en: "Health",       es: "Salud",       de: "Gesundheit",  ru: "Здоровье",   pt: "Saúde",       ar: "الصحة",    ch: "健康",   hi: "स्वास्थ्य" },
  logement:    { fr: "Logement",       en: "Housing",      es: "Vivienda",    de: "Wohnen",      ru: "Жильё",      pt: "Habitação",   ar: "السكن",    ch: "住房",   hi: "आवास" },
  emploi:      { fr: "Emploi",         en: "Employment",   es: "Empleo",      de: "Arbeit",      ru: "Работа",     pt: "Emprego",     ar: "التوظيف",  ch: "就业",   hi: "रोजगार" },
  banque:      { fr: "Banque",         en: "Banking",      es: "Banca",       de: "Banken",      ru: "Банки",      pt: "Bancos",      ar: "البنوك",   ch: "银行",   hi: "बैंक" },
  fiscalite:   { fr: "Fiscalité",      en: "Tax",          es: "Impuestos",   de: "Steuern",     ru: "Налоги",     pt: "Impostos",    ar: "الضرائب",  ch: "税务",   hi: "कर" },
  education:   { fr: "Éducation",      en: "Education",    es: "Educación",   de: "Bildung",     ru: "Образование",pt: "Educação",    ar: "التعليم",  ch: "教育",   hi: "शिक्षा" },
  transport:   { fr: "Transport",      en: "Transport",    es: "Transporte",  de: "Transport",   ru: "Транспорт",  pt: "Transporte",  ar: "النقل",    ch: "交通",   hi: "परिवहन" },
  telecom:     { fr: "Télécom",        en: "Telecom",      es: "Telecom",     de: "Telekommun.", ru: "Телеком",    pt: "Telecom",     ar: "الاتصالات",ch: "通讯",   hi: "दूरसंचार" },
  urgences:    { fr: "Urgences",       en: "Emergency",    es: "Emergencias", de: "Notfall",     ru: "Экстренные", pt: "Emergência",  ar: "الطوارئ",  ch: "紧急",   hi: "आपातकाल" },
  communaute:  { fr: "Communauté",     en: "Community",    es: "Comunidad",   de: "Gemeinschaft",ru: "Сообщество", pt: "Comunidade",  ar: "المجتمع",  ch: "社区",   hi: "समुदाय" },
  juridique:   { fr: "Juridique",      en: "Legal",        es: "Legal",       de: "Rechtliches", ru: "Юридич.",    pt: "Jurídico",    ar: "القانوني", ch: "法律",   hi: "कानूनी" },
};

const CAT_ICON_COMPONENT: Record<string, React.ElementType> = {
  ambassade: Building2, immigration: FileText, sante: Heart, logement: Home,
  emploi: Briefcase, banque: Landmark, fiscalite: Receipt, education: BookOpen,
  transport: Train, telecom: Wifi, urgences: Siren, communaute: Users, juridique: Scale,
};

const CONTINENT_LABEL: Record<string, Record<string, string>> = {
  europe:          { fr: "Europe",          en: "Europe",        es: "Europa",        de: "Europa",       ru: "Европа",       pt: "Europa",         ar: "أوروبا",       ch: "欧洲",    hi: "यूरोप" },
  afrique:         { fr: "Afrique",         en: "Africa",        es: "África",        de: "Afrika",       ru: "Африка",       pt: "África",         ar: "أفريقيا",      ch: "非洲",    hi: "अफ्रीका" },
  "amerique-nord": { fr: "Amér. du Nord",   en: "North America", es: "América Norte", de: "Nordamerika",  ru: "Сев. Америка", pt: "América do Norte",ar: "أمريكا الشمالية",ch: "北美洲",  hi: "उत्तरी अमेरिका" },
  "amerique-sud":  { fr: "Amér. du Sud",    en: "South America", es: "América Sur",   de: "Südamerika",   ru: "Юж. Америка",  pt: "América do Sul", ar: "أمريكا الجنوبية",ch: "南美洲",  hi: "दक्षिण अमेरिका" },
  asie:            { fr: "Asie",            en: "Asia",          es: "Asia",          de: "Asien",        ru: "Азия",         pt: "Ásia",           ar: "آسيا",         ch: "亚洲",    hi: "एशिया" },
  "moyen-orient":  { fr: "Moyen-Orient",    en: "Middle East",   es: "Oriente Medio", de: "Naher Osten",  ru: "Ближний Восток",pt: "Médio Oriente",  ar: "الشرق الأوسط", ch: "中东",    hi: "मध्य पूर्व" },
  oceanie:         { fr: "Océanie",         en: "Oceania",       es: "Oceanía",       de: "Ozeanien",     ru: "Океания",      pt: "Oceania",        ar: "أوقيانوسيا",   ch: "大洋洲",  hi: "ओशिनिया" },
};

// ============================================================
// NATIONALITY ADJECTIVES (French)
// ============================================================

const NATIONALITY_ADJ_FR: Record<string, string> = {
  AD: "Andorrane", AE: "Émiratie", AF: "Afghane", AG: "Antiguaise",
  AL: "Albanaise", AM: "Arménienne", AO: "Angolaise", AR: "Argentine",
  AT: "Autrichienne", AU: "Australienne", AZ: "Azerbaïdjanaise",
  BA: "Bosnienne", BB: "Barbadienne", BD: "Bangladaise", BE: "Belge",
  BF: "Burkinabée", BG: "Bulgare", BH: "Bahreïnienne", BI: "Burundaise",
  BJ: "Béninoise", BN: "Brunéienne", BO: "Bolivienne", BR: "Brésilienne",
  BS: "Bahaméenne", BT: "Bhoutanaise", BW: "Botswanaise", BY: "Biélorusse",
  BZ: "Bélizienne", CA: "Canadienne", CD: "Congolaise (RDC)", CG: "Congolaise",
  CH: "Suisse", CI: "Ivoirienne", CL: "Chilienne", CM: "Camerounaise",
  CN: "Chinoise", CO: "Colombienne", CR: "Costaricaine", CU: "Cubaine",
  CV: "Cap-verdienne", CY: "Chypriote", CZ: "Tchèque",
  DE: "Allemande", DJ: "Djiboutienne", DK: "Danoise", DM: "Dominiquaise",
  DO: "Dominicaine", DZ: "Algérienne",
  EC: "Équatorienne", EE: "Estonienne", EG: "Égyptienne", ER: "Érythréenne",
  ES: "Espagnole", ET: "Éthiopienne", SZ: "Swazie",
  FI: "Finlandaise", FJ: "Fidjienne", FM: "Micronésienne", FR: "Française",
  GA: "Gabonaise", GB: "Britannique", GD: "Grenadienne", GE: "Géorgienne",
  GH: "Ghanéenne", GM: "Gambienne", GN: "Guinéenne", GQ: "Équato-guinéenne",
  GR: "Grecque", GT: "Guatémaltèque", GW: "Guinéo-bissauenne", GY: "Guyanienne",
  HN: "Hondurienne", HR: "Croate", HT: "Haïtienne", HU: "Hongroise",
  ID: "Indonésienne", IE: "Irlandaise", IL: "Israélienne", IN: "Indienne",
  IQ: "Irakienne", IR: "Iranienne", IS: "Islandaise", IT: "Italienne",
  JM: "Jamaïcaine", JO: "Jordanienne", JP: "Japonaise",
  KE: "Kényane", KG: "Kirghize", KH: "Cambodgienne", KI: "Kiribatienne",
  KM: "Comorienne", KN: "Kittitienne", KP: "Nord-coréenne", KR: "Sud-coréenne",
  KW: "Koweïtienne", KZ: "Kazakhstanaise",
  LA: "Laotienne", LB: "Libanaise", LC: "Saint-Lucienne", LI: "Liechtensteinoise",
  LK: "Sri-Lankaise", LR: "Libérienne", LS: "Lésothane", LT: "Lituanienne",
  LU: "Luxembourgeoise", LV: "Lettone", LY: "Libyenne",
  MA: "Marocaine", MC: "Monégasque", MD: "Moldave", ME: "Monténégrine",
  MG: "Malgache", MH: "Marshallaise", MK: "Macédonienne", ML: "Malienne",
  MM: "Birmane", MN: "Mongole", MR: "Mauritanienne", MT: "Maltaise",
  MU: "Mauricienne", MV: "Maldivienne", MW: "Malawienne", MX: "Mexicaine",
  MY: "Malaisienne", MZ: "Mozambicaine",
  NA: "Namibienne", NE: "Nigérienne", NG: "Nigériane", NI: "Nicaraguayenne",
  NL: "Néerlandaise", NO: "Norvégienne", NP: "Népalaise", NR: "Nauruane",
  NZ: "Néo-Zélandaise",
  OM: "Omanaise",
  PA: "Panaméenne", PE: "Péruvienne", PG: "Papouasienne", PH: "Philippinoise",
  PK: "Pakistanaise", PL: "Polonaise", PT: "Portugaise", PW: "Palaosienne",
  PY: "Paraguayenne",
  QA: "Qatarienne",
  RO: "Roumaine", RS: "Serbe", RU: "Russe", RW: "Rwandaise",
  SA: "Saoudienne", SB: "Salomonaise", SC: "Seychelloise", SD: "Soudanaise",
  SE: "Suédoise", SG: "Singapourienne", SI: "Slovène", SK: "Slovaque",
  SL: "Sierra-Léonaise", SM: "Saint-Marinaise", SN: "Sénégalaise",
  SO: "Somalienne", SR: "Surinamaise", SS: "Sud-soudanaise", ST: "Santoméenne",
  SV: "Salvadorienne", SY: "Syrienne",
  TD: "Tchadienne", TG: "Togolaise", TH: "Thaïlandaise", TJ: "Tadjike",
  TL: "Timoraise", TM: "Turkmène", TN: "Tunisienne", TO: "Tongienne",
  TR: "Turque", TT: "Trinidadienne", TV: "Tuvaluane", TZ: "Tanzanienne",
  UA: "Ukrainienne", UG: "Ougandaise", US: "Américaine", UY: "Uruguayenne",
  UZ: "Ouzbèke", VA: "Vaticane", VC: "Vincentaise", VE: "Vénézuélienne",
  VN: "Vietnamienne", VU: "Vanuataise",
  WS: "Samoane", XK: "Kosovare", YE: "Yéménite",
  ZA: "Sud-africaine", ZM: "Zambienne", ZW: "Zimbabwéenne",
};

// ============================================================
// FLAG IMAGE COMPONENT
// ============================================================

const FlagImg: React.FC<{ code: string; size: number; className?: string }> = ({ code, size, className = "" }) => {
  if (!code || code.length !== 2) {
    return <span style={{ fontSize: size, lineHeight: 1 }}>🌍</span>;
  }
  const w = size >= 48 ? 80 : size >= 28 ? 40 : 20;
  return (
    <img
      src={`https://flagcdn.com/w${w}/${code.toLowerCase()}.png`}
      alt={code.toUpperCase()}
      width={size}
      height={Math.round(size * 0.75)}
      className={`inline-block rounded-sm object-cover flex-shrink-0 ${className}`}
      loading="lazy"
      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
};

// ============================================================
// SKELETON COMPONENTS
// ============================================================

const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-8 h-6 bg-gray-200 rounded" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  </div>
);

const SkeletonHero: React.FC = () => (
  <div className="animate-pulse">
    <div className="h-10 bg-gray-200 rounded-lg w-3/4 mx-auto mb-4" />
    <div className="h-5 bg-gray-100 rounded w-1/2 mx-auto mb-8" />
    <div className="h-14 bg-gray-200 rounded-2xl max-w-xl mx-auto" />
  </div>
);

// ============================================================
// ANIMATED COUNTER
// ============================================================

const AnimatedCounter: React.FC<{ end: number; duration?: number; suffix?: string }> = ({ end, duration = 1500, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// ============================================================
// HELPERS
// ============================================================

function catLabel(cat: string, lang: string): string {
  return CAT_LABEL[cat]?.[lang] ?? CAT_LABEL[cat]?.["fr"] ?? cat;
}

function entryTitle(e: DirectoryEntry, lang: string): string {
  if (lang !== "fr" && e.translations?.[lang]?.title) return e.translations[lang].title!;
  return e.title;
}

function normalize(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const _intlCache = new Map<string, string>();
function localizedCountryName(code: string, lang: string): string {
  const key = `${code}:${lang}`;
  if (_intlCache.has(key)) return _intlCache.get(key)!;
  try {
    const locale = lang === "ch" ? "zh" : lang === "hi" ? "hi-IN" : lang;
    const dn = new Intl.DisplayNames([locale, "fr"], { type: "region" });
    const name = normalize(dn.of(code) ?? "");
    _intlCache.set(key, name);
    return name;
  } catch {
    _intlCache.set(key, "");
    return "";
  }
}

function saveRecent(c: CountrySummary) {
  try {
    const prev: CountrySummary[] = JSON.parse(localStorage.getItem(LS_RECENT) ?? "[]");
    const next = [c, ...prev.filter(r => r.country_code !== c.country_code)].slice(0, MAX_RECENT);
    localStorage.setItem(LS_RECENT, JSON.stringify(next));
  } catch { /* ignore */ }
}

function loadRecent(): CountrySummary[] {
  try { return JSON.parse(localStorage.getItem(LS_RECENT) ?? "[]"); } catch { return []; }
}

// ============================================================
// NATIONALITY PICKER MODAL
// ============================================================

const NationalityPicker: React.FC<{
  onSelect: (code: string, name: string) => void;
  onSkip: () => void;
  lang: string;
}> = ({ onSelect, onSkip, lang }) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ code: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const langKey = (lang === "ch" ? "zh" : ["fr","en","es","de","pt","ru","zh","ar","hi"].includes(lang) ? lang : "fr") as "fr"|"en"|"es"|"de"|"pt"|"ru"|"zh"|"ar"|"hi";

  const allNationalities = useMemo(() => {
    const getName = (code: string, entry: typeof phoneCodesData[0]) => {
      if (lang === "fr") return NATIONALITY_ADJ_FR[code] ?? entry.fr;
      return (entry[langKey] as string) || entry.fr;
    };
    const all = phoneCodesData.map(e => ({ code: e.code, name: getName(e.code, e) }));
    const popularSet = new Set(POPULAR_CODES);
    const popular = POPULAR_CODES
      .map(code => all.find(e => e.code === code))
      .filter(Boolean) as { code: string; name: string }[];
    const rest = all
      .filter(e => !popularSet.has(e.code))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...popular, ...rest];
  }, [lang, langKey]);

  useEffect(() => {
    const detected = (navigator.language || "").split("-")[1]?.toUpperCase();
    if (detected) {
      const match = allNationalities.find(c => c.code === detected);
      if (match) setSelected(match);
    }
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [allNationalities]);

  const filtered = useMemo(() => {
    if (!search) return allNationalities;
    const q = normalize(search);
    return allNationalities.filter(c =>
      normalize(c.name).includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [allNationalities, search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onSkip(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4"
        onClick={onSkip}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onSkip} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors">
            <X size={20} />
          </button>

          <div className="text-center mb-5">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Globe className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t("personalizeExp", lang)}</h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{t("personalizeDesc", lang)}</p>
          </div>

          <div className="relative mb-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("selectNat", lang)}
              aria-label={t("selectNat", lang)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-100 mb-5">
            {filtered.map(c => (
              <button
                key={c.code}
                onClick={() => setSelected(c)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                  selected?.code === c.code
                    ? "bg-red-50 text-red-700 font-semibold"
                    : "text-gray-700"
                }`}
              >
                <FlagImg code={c.code} size={20} />
                <span className="flex-1 text-left">{c.name}</span>
                {selected?.code === c.code && <span className="text-red-500 text-base">&#10003;</span>}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {t("skip", lang)}
            </button>
            <button
              onClick={() => selected && onSelect(selected.code, selected.name)}
              disabled={!selected}
              className="flex-1 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("confirm", lang)}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================
// ENTRY CARD (Resource card in country detail)
// ============================================================

const EntryCard: React.FC<{
  entry: DirectoryEntry;
  lang: string;
  highlighted?: boolean;
  index?: number;
}> = ({ entry, lang, highlighted, index = 0 }) => {
  const title = entryTitle(entry, lang);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`group bg-white rounded-2xl border p-4 hover:shadow-lg transition-all duration-300 ${
        highlighted
          ? "border-red-200 ring-1 ring-red-100 bg-red-50/30"
          : "border-gray-100 hover:border-red-100"
      }`}
    >
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gray-900 hover:text-red-600 text-sm leading-snug inline-flex items-center gap-1.5 group/link transition-colors"
          >
            <span>{title}</span>
            <ExternalLink size={11} className="shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity text-red-400" />
          </a>
          <p className="text-xs text-gray-400 mt-0.5">{entry.domain}</p>
        </div>
        {entry.is_official && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100 shrink-0">
            <Shield size={9} />
            {t("official", lang)}
          </span>
        )}
      </div>

      {entry.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{entry.description}</p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        {entry.city && (
          <span className="flex items-center gap-1"><MapPin size={10} />{entry.city}</span>
        )}
        {entry.phone && (
          <a href={`tel:${entry.phone}`} className="flex items-center gap-1 hover:text-red-600 font-medium transition-colors">
            <Phone size={10} />{entry.phone}
          </a>
        )}
        {entry.email && (
          <a href={`mailto:${entry.email}`} className="flex items-center gap-1 hover:text-red-600 max-w-[180px] truncate transition-colors">
            <Mail size={10} />{entry.email}
          </a>
        )}
        {entry.opening_hours && (
          <span className="flex items-center gap-1"><Clock size={10} />{entry.opening_hours}</span>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================
// COUNTRY CARD (list view)
// ============================================================

const CountryCard: React.FC<{
  country: CountrySummary;
  onClick: () => void;
  lang: string;
  index?: number;
}> = ({ country, onClick, lang, index = 0 }) => (
  <motion.button
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.03, ease: [0.25, 0.1, 0.25, 1] }}
    whileHover={{ scale: 1.02, y: -3 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="group w-full bg-white border border-gray-100 rounded-2xl p-4 text-left hover:shadow-xl hover:border-red-100 transition-all duration-300"
  >
    <div className="flex items-center gap-3">
      <div className="relative">
        <FlagImg code={country.country_code} size={36} className="shrink-0 shadow-sm" />
        <div className="absolute inset-0 rounded-sm ring-1 ring-black/5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm truncate group-hover:text-red-600 transition-colors">{country.country_name}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {country.total_links} {t("resources", lang)}
          <span className="text-gray-300 mx-1">·</span>
          {country.official_links} {t("official", lang).toLowerCase()}
        </div>
      </div>
      {country.emergency_number && (
        <span className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-bold group-hover:bg-red-600 group-hover:text-white group-hover:border-red-600 transition-all">
          <Siren size={12} />
          {country.emergency_number}
        </span>
      )}
      <ChevronRight size={16} className="text-gray-300 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all shrink-0" />
    </div>
  </motion.button>
);

// ============================================================
// PERSONALIZED KIT (country detail hero)
// ============================================================

const PersonalizedKit: React.FC<{
  nationality: UserNationality;
  entries: Record<string, DirectoryEntry[]>;
  lang: string;
}> = ({ nationality, entries, lang }) => {
  const myEmbassy = (entries.ambassade ?? []).find(e => e.nationality_code === nationality.code);
  const immigLinks = (entries.immigration ?? []).slice(0, 2);
  if (!myEmbassy && immigLinks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 rounded-2xl p-5 text-white mb-5 shadow-xl"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
          <FlagImg code={nationality.code} size={32} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-base leading-tight">{t("myKit", lang)}</p>
            <Sparkles size={14} className="text-amber-400" />
          </div>
          <p className="text-xs text-gray-300 mt-0.5">{t("myKitDesc", lang)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {myEmbassy ? (
          <a
            href={myEmbassy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-colors backdrop-blur-sm border border-white/5"
          >
            <Building2 size={18} className="text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{entryTitle(myEmbassy, lang)}</p>
              {myEmbassy.phone && <p className="text-xs text-gray-300 mt-0.5">{myEmbassy.phone}</p>}
            </div>
            <ExternalLink size={14} className="text-gray-400 shrink-0" />
          </a>
        ) : (
          <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 text-gray-300 text-sm border border-white/5">
            <Building2 size={18} className="shrink-0" />
            {t("noEmbassy", lang)}
          </div>
        )}

        {immigLinks.map(e => (
          <a
            key={e.id}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-colors backdrop-blur-sm border border-white/5"
          >
            <FileText size={18} className="text-red-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entryTitle(e, lang)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{catLabel("immigration", lang)}</p>
            </div>
            <ExternalLink size={14} className="text-gray-400 shrink-0" />
          </a>
        ))}
      </div>
    </motion.div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const Annuaire: React.FC = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useApp();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;
  const locale = CANONICAL_LOCALES[lang] ?? "fr-fr";

  // ── Nationality (persistent)
  const [userNat, setUserNat] = useState<UserNationality | null>(() => {
    try {
      const code = localStorage.getItem(LS_NATIONALITY);
      const name = localStorage.getItem(LS_NATIONALITY_NAME);
      return code && name ? { code, name } : null;
    } catch { return null; }
  });
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDismissed] = useState(() => {
    try { return !!localStorage.getItem(LS_NATIONALITY) || !!localStorage.getItem(LS_PICKER_DISMISSED); }
    catch { return false; }
  });

  // ── Data
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [errorList, setErrorList] = useState<string | null>(null);

  const [detail, setDetail] = useState<CountryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // ── List UI
  const hasInteracted = useRef(false);
  const search = searchParams.get("q") ?? "";
  const [continent, setContinent] = useState("all");
  const [recent, setRecent] = useState<CountrySummary[]>(loadRecent);

  const setSearch = useCallback((val: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (val) { next.set("q", val); } else { next.delete("q"); }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // ── Detail UI
  const [activeTab, setActiveTab] = useState<string>("");
  const [showAllEmbassies, setShowAllEmbassies] = useState(false);

  // ── URL param
  const paysSlug = searchParams.get("pays");
  const selectedCountry = paysSlug ? countries.find(c => c.country_slug === paysSlug) ?? null : null;

  // ── Fetch countries list
  useEffect(() => {
    fetch(`${MARKETING_API}/api/public/country-directory/countries`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: CountrySummary[]) => { setCountries(data); setLoadingList(false); })
      .catch(err => { setErrorList(err.message); setLoadingList(false); });
  }, []);

  // ── Auto-show nationality picker
  useEffect(() => {
    if (!pickerDismissed && countries.length > 0) {
      const t = setTimeout(() => {
        if (!hasInteracted.current) setShowPicker(true);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [pickerDismissed, countries.length]);

  // ── Fetch country detail on URL change
  useEffect(() => {
    if (!paysSlug || countries.length === 0) { setDetail(null); return; }
    const found = countries.find(c => c.country_slug === paysSlug);
    if (!found) return;

    setLoadingDetail(true);
    setErrorDetail(null);
    setDetail(null);
    setShowAllEmbassies(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    saveRecent(found);
    setRecent(loadRecent());

    fetch(`${MARKETING_API}/api/public/country-directory/country/${found.country_code}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: CountryDetail) => { setDetail(data); setLoadingDetail(false); })
      .catch(err => { setErrorDetail(err.message); setLoadingDetail(false); });
  }, [paysSlug, countries]);

  // ── Set first available tab
  const availableTabs = useMemo(() => {
    if (!detail) return [];
    return CATEGORY_ORDER.filter(cat => (detail.entries[cat]?.length ?? 0) > 0);
  }, [detail]);

  useEffect(() => {
    if (availableTabs.length > 0) setActiveTab(availableTabs[0]);
  }, [availableTabs]);

  // ── Handlers
  const goToCountry = useCallback((c: CountrySummary) => {
    setSearchParams({ pays: c.country_slug });
  }, [setSearchParams]);

  const goBack = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const handleNatSelect = (code: string, name: string) => {
    setUserNat({ code, name });
    localStorage.setItem(LS_NATIONALITY, code);
    localStorage.setItem(LS_NATIONALITY_NAME, name);
    setShowPicker(false);
  };

  const handleNatSkip = () => {
    setShowPicker(false);
    try { localStorage.setItem(LS_PICKER_DISMISSED, "1"); } catch { /* ignore */ }
  };

  // ── Derived list data
  const totalResources = useMemo(() => countries.reduce((s, c) => s + c.total_links, 0), [countries]);

  const popularCountries = useMemo(() =>
    POPULAR_CODES.map(code => countries.find(c => c.country_code === code)).filter(Boolean) as CountrySummary[],
    [countries]
  );

  const continents = useMemo(() =>
    [...new Set(countries.map(c => c.continent))].sort(),
    [countries]
  );

  const filteredCountries = useMemo(() => {
    const q = normalize(search.trim());
    return countries.filter(c => {
      const matchSearch = !q ||
        normalize(c.country_name).includes(q) ||
        c.country_code.toLowerCase().includes(q) ||
        localizedCountryName(c.country_code, lang).includes(q);
      const matchContinent = continent === "all" || c.continent === continent;
      return matchSearch && matchContinent;
    });
  }, [countries, search, continent, lang]);

  const groupedByContinent = useMemo(() => {
    const g: Record<string, CountrySummary[]> = {};
    for (const c of filteredCountries) {
      (g[c.continent] ??= []).push(c);
    }
    return g;
  }, [filteredCountries]);

  // ── Derived detail data
  const embassyEntries = useMemo(() => {
    const all = detail?.entries?.ambassade ?? [];
    if (!userNat || showAllEmbassies) return all;
    const mine = all.filter(e => e.nationality_code === userNat.code);
    return mine.length > 0 ? mine : all;
  }, [detail, userNat, showAllEmbassies]);

  const currentEntries = useMemo(() => {
    if (!detail || !activeTab) return [];
    if (activeTab === "ambassade") return embassyEntries;
    return detail.entries[activeTab] ?? [];
  }, [detail, activeTab, embassyEntries]);

  // ── SEO
  const annuaireSlug = ANNUAIRE_SLUGS[lang] ?? "annuaire";
  const canonicalUrl = selectedCountry
    ? `${BASE_URL}/${locale}/${annuaireSlug}?pays=${selectedCountry.country_slug}`
    : `${BASE_URL}/${locale}/${annuaireSlug}`;

  const alternateLanguages = SUPPORTED_LANGUAGES.map(lc => ({
    lang: lc === "ch" ? "zh-Hans" : lc,
    url: `${BASE_URL}/${CANONICAL_LOCALES[lc] ?? "fr-fr"}/${ANNUAIRE_SLUGS[lc] ?? "annuaire"}`,
  }));

  const breadcrumbs = [
    { name: "SOS Expat", url: `${BASE_URL}/${locale}` },
    { name: t("pageTitle", lang), url: `${BASE_URL}/${locale}/${annuaireSlug}` },
    ...(selectedCountry ? [{ name: selectedCountry.country_name, url: canonicalUrl }] : []),
  ];

  // ============================================================
  // RENDER — COUNTRY DETAIL
  // ============================================================

  const renderDetail = () => {
    if (!selectedCountry) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-5xl mx-auto px-4 py-6"
      >
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={goBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 mb-6 group transition-colors"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
          {t("backToList", lang)}
        </motion.button>

        {/* Country Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-5"
        >
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-red-400" />

          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <div className="relative">
                <FlagImg code={selectedCountry.country_code} size={72} className="shrink-0 shadow-md rounded" />
                <div className="absolute inset-0 rounded ring-1 ring-black/10" />
              </div>

              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">
                  {selectedCountry.country_name}
                </h1>
                <p className="text-sm text-gray-400 mt-1 capitalize flex items-center gap-1.5">
                  <Globe size={13} />
                  {CONTINENT_LABEL[selectedCountry.continent]?.[lang] ?? selectedCountry.continent}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg font-medium">
                    {selectedCountry.total_links} {t("resources", lang)}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg font-medium">
                    {selectedCountry.official_links} {t("official", lang).toLowerCase()}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg font-medium">
                    {selectedCountry.categories_count} {t("categoriesCovered", lang)}
                  </span>
                </div>

                {/* Nationality chip */}
                <button
                  onClick={() => setShowPicker(true)}
                  className="mt-3 inline-flex items-center gap-2 text-xs border border-gray-200 rounded-full px-3 py-1.5 hover:border-red-300 hover:text-red-600 transition-colors text-gray-500"
                >
                  {userNat ? (
                    <><FlagImg code={userNat.code} size={16} /><span>{userNat.name}</span></>
                  ) : (
                    <><Globe size={13} /><span>{t("myNationality", lang)}</span></>
                  )}
                  <span className="text-red-500 font-medium">{t("changeNat", lang)}</span>
                </button>
              </div>

              {/* Emergency Number */}
              {selectedCountry.emergency_number && (
                <motion.a
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  href={`tel:${selectedCountry.emergency_number}`}
                  className="flex items-center gap-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:scale-95 text-white rounded-2xl px-5 py-4 shadow-lg shadow-red-600/20 transition-all shrink-0 sm:ml-auto"
                >
                  <Siren size={24} className="animate-pulse" />
                  <div>
                    <p className="text-xs text-red-200 font-medium">{t("emergency", lang)}</p>
                    <p className="text-3xl font-black tracking-wide leading-none">{selectedCountry.emergency_number}</p>
                  </div>
                </motion.a>
              )}
            </div>
          </div>
        </motion.div>

        {/* Loading */}
        {loadingDetail && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-3 border-red-200 border-t-red-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Chargement...</p>
          </div>
        )}

        {/* Error */}
        {errorDetail && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 text-red-700 rounded-2xl p-4 mb-5 flex items-center gap-2 text-sm border border-red-100"
          >
            <AlertTriangle size={15} className="shrink-0" />
            {errorDetail}
          </motion.div>
        )}

        {detail && (
          <>
            {/* Personalized Kit */}
            {userNat && (
              <PersonalizedKit nationality={userNat} entries={detail.entries} lang={lang} />
            )}

            {/* Category Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Tab bar */}
              <div className="overflow-x-auto border-b border-gray-100 scrollbar-none bg-gray-50/50">
                <div className="flex min-w-max">
                  {availableTabs.map(cat => {
                    const IconComp = CAT_ICON_COMPONENT[cat] ?? Globe;
                    const count = cat === "ambassade"
                      ? embassyEntries.length
                      : (detail.entries[cat]?.length ?? 0);
                    const isActive = activeTab === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`relative flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-all ${
                          isActive
                            ? "text-red-700 bg-white"
                            : "text-gray-500 hover:text-gray-800 hover:bg-white/50"
                        }`}
                      >
                        <IconComp size={15} className={isActive ? "text-red-500" : ""} />
                        <span>{catLabel(cat, lang)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          isActive ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-400"
                        }`}>
                          {count}
                        </span>
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab content */}
              <div className="p-5">
                {/* Embassy tab — no nationality set */}
                {activeTab === "ambassade" && !userNat && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5 flex flex-col sm:flex-row items-center gap-4"
                  >
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <p className="font-semibold text-amber-900 text-sm">{t("setNatPrompt", lang)}</p>
                      <p className="text-xs text-amber-700 mt-1">{detail.entries.ambassade?.length ?? 0} ambassades</p>
                    </div>
                    <button
                      onClick={() => setShowPicker(true)}
                      className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                    >
                      {t("setNatBtn", lang)}
                    </button>
                  </motion.div>
                )}

                {/* Embassy tab — nationality set: filter toggle */}
                {activeTab === "ambassade" && userNat && (
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <FlagImg code={userNat.code} size={20} />
                      <p className="text-sm text-gray-600 font-medium">
                        {showAllEmbassies
                          ? `${detail.entries.ambassade?.length ?? 0} ambassades`
                          : `${userNat.name} · ${embassyEntries.length} ${embassyEntries.length > 1 ? "entrées" : "entrée"}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAllEmbassies(!showAllEmbassies)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                    >
                      {showAllEmbassies
                        ? t("filterMyNat", lang)
                        : `${t("allEmbassies", lang)} (${detail.entries.ambassade?.length ?? 0})`}
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    {currentEntries.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <Search className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-gray-400 text-sm">{t("noData", lang)}</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {currentEntries.map((entry, i) => (
                          <EntryCard
                            key={entry.id}
                            entry={entry}
                            lang={lang}
                            index={i}
                            highlighted={
                              activeTab === "ambassade" &&
                              userNat !== null &&
                              entry.nationality_code === userNat.code
                            }
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    );
  };

  // ============================================================
  // RENDER — COUNTRY LIST
  // ============================================================

  const renderList = () => (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">

      {/* ── HERO SECTION ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-center mb-10"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 bg-red-50 text-red-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-5 border border-red-100"
        >
          <Globe size={13} />
          200+ {t("countries", lang)}
        </motion.div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight leading-tight">
          {t("pageTitle", lang)}
        </h1>
        <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          {t("pageDesc", lang)}
        </p>

        {/* Nationality pill */}
        <div className="mt-6 flex justify-center">
          {userNat ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-full px-5 py-3 shadow-sm hover:shadow-md hover:border-red-200 transition-all text-sm"
            >
              <FlagImg code={userNat.code} size={22} />
              <span className="text-gray-700">{t("iAmFrom", lang)} <strong className="text-gray-900">{userNat.name}</strong></span>
              <span className="text-red-500 text-xs font-semibold ml-1">{t("changeNat", lang)}</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold text-sm px-6 py-3 rounded-full shadow-lg shadow-red-600/20 transition-all"
            >
              <Sparkles size={15} />
              {t("personalizeExp", lang)}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ── SEARCH BAR ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative max-w-2xl mx-auto mb-8"
      >
        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => { hasInteracted.current = true; setSearch(e.target.value.trimStart()); }}
          placeholder={t("searchPlaceholder", lang)}
          aria-label={t("searchPlaceholder", lang)}
          className="w-full pl-14 pr-12 py-4 border border-gray-200 rounded-2xl text-base shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 p-1 transition-colors">
            <X size={18} />
          </button>
        )}
      </motion.div>

      {/* ── STATS BAR ── */}
      {!loadingList && countries.length > 0 && !search && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center gap-6 sm:gap-10 mb-10"
        >
          {[
            { value: countries.length, label: t("countries", lang), suffix: "+" },
            { value: totalResources, label: t("verifiedResources", lang), suffix: "+" },
            { value: 13, label: t("categoriesCovered", lang), suffix: "" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              </p>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── LOADING STATE ── */}
      {loadingList && (
        <div className="space-y-6">
          <SkeletonHero />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-10">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {/* ── ERROR STATE ── */}
      {errorList && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 text-red-700 rounded-2xl p-5 mb-6 flex items-center gap-3 text-sm border border-red-100 max-w-xl mx-auto"
        >
          <AlertTriangle size={18} className="shrink-0" />
          <div>
            <p className="font-semibold">Erreur de chargement</p>
            <p className="text-red-600 mt-0.5">{errorList}</p>
          </div>
        </motion.div>
      )}

      {!loadingList && countries.length > 0 && (
        <>
          {/* ── RECENTLY VIEWED ── */}
          {!search && recent.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mb-8"
            >
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock size={12} />
                {t("recentlyViewed", lang)}
              </h2>
              <div className="flex flex-wrap gap-2">
                {recent.map(c => (
                  <motion.button
                    key={c.country_code}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => goToCountry(c)}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3.5 py-2 text-sm hover:border-red-200 hover:shadow-sm transition-all"
                  >
                    <FlagImg code={c.country_code} size={20} />
                    <span className="text-gray-700">{c.country_name}</span>
                  </motion.button>
                ))}
              </div>
            </motion.section>
          )}

          {/* ── POPULAR DESTINATIONS ── */}
          {!search && popularCountries.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-10"
            >
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Sparkles size={12} className="text-amber-400" />
                {t("popularDest", lang)}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {popularCountries.map((c, i) => (
                  <motion.button
                    key={c.country_code}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.04 }}
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => goToCountry(c)}
                    className="flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-2xl p-3.5 hover:shadow-lg hover:border-red-100 transition-all duration-300"
                  >
                    <div className="relative">
                      <FlagImg code={c.country_code} size={36} />
                      <div className="absolute inset-0 rounded-sm ring-1 ring-black/5" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2">{c.country_name}</span>
                    {c.emergency_number && (
                      <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full">{c.emergency_number}</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.section>
          )}

          {/* ── CONTINENT FILTERS ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="flex flex-wrap gap-2 mb-7"
          >
            <button
              onClick={() => setContinent("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                continent === "all"
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600"
              }`}
            >
              {t("allCountries", lang)} ({filteredCountries.length})
            </button>
            {continents.map(cont => {
              const count = filteredCountries.filter(c => c.continent === cont).length;
              return (
                <button
                  key={cont}
                  onClick={() => setContinent(cont)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                    continent === cont
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600"
                  }`}
                >
                  {CONTINENT_LABEL[cont]?.[lang] ?? cont} ({count})
                </button>
              );
            })}
          </motion.div>

          {/* ── SEARCH FEEDBACK ── */}
          {search && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-500 mb-5"
            >
              {filteredCountries.length === 0
                ? <span className="text-amber-600">{t("noResults", lang)} &laquo;{search}&raquo;</span>
                : <><strong className="text-gray-800">{filteredCountries.length}</strong> {t("results", lang)} &middot; &laquo;{search}&raquo;</>}
            </motion.p>
          )}

          {/* ── COUNTRY GRID ── */}
          {filteredCountries.length === 0 && search ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 text-base">{t("noResults", lang)} &laquo;{search}&raquo;</p>
            </motion.div>
          ) : (
            <motion.div variants={stagger} initial="initial" animate="animate">
              {Object.entries(groupedByContinent)
                .filter(([, cs]) => cs.length > 0)
                .map(([cont, cs]) => (
                  <section key={cont} className="mb-10">
                    <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 capitalize">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      {CONTINENT_LABEL[cont]?.[lang] ?? cont}
                      <span className="text-xs font-normal text-gray-400 ml-1">
                        ({cs.length} {t("countries", lang)})
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {cs.map((c, i) => (
                        <CountryCard key={c.country_code} country={c} onClick={() => goToCountry(c)} lang={lang} index={i} />
                      ))}
                    </div>
                  </section>
                ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );

  // ============================================================
  // ROOT RENDER
  // ============================================================

  return (
    <Layout>
      <SEOHead
        title={
          selectedCountry
            ? `${selectedCountry.country_name} — ${t("pageTitle", lang)} | SOS Expat`
            : `${t("pageTitle", lang)} | SOS Expat`
        }
        description={t("pageDesc", lang)}
        canonicalUrl={canonicalUrl}
        alternateLanguages={alternateLanguages}
      />
      <BreadcrumbSchema items={breadcrumbs} />

      <AnimatePresence>
        {showPicker && (
          <NationalityPicker
            onSelect={handleNatSelect}
            onSkip={handleNatSkip}
            lang={lang}
          />
        )}
      </AnimatePresence>

      <main className="min-h-screen bg-gradient-to-b from-white via-gray-50/50 to-gray-50">
        <AnimatePresence mode="wait">
          {paysSlug && selectedCountry ? (
            <React.Fragment key="detail">{renderDetail()}</React.Fragment>
          ) : (
            <React.Fragment key="list">{renderList()}</React.Fragment>
          )}
        </AnimatePresence>
      </main>
    </Layout>
  );
};

export default Annuaire;
