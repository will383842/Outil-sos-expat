/**
 * Annuaire Expatriés — Redesign 2026
 * UX: personalised by nationality, smart category ordering, emergency-first
 * Route: /fr-fr/annuaire, /en-us/expat-directory, etc.
 * URL: ?pays=france  →  country detail view (bookmarkable)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import {
  Search, MapPin, Phone, Mail, Clock, ExternalLink, Shield,
  Loader2, ArrowLeft, X, AlertTriangle,
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

const LS_NATIONALITY      = "annuaire_nationality";       // "FR"
const LS_NATIONALITY_NAME = "annuaire_nationality_name";  // "France"
const LS_RECENT           = "annuaire_recent";            // JSON CountrySummary[]
const LS_PICKER_DISMISSED = "annuaire_picker_dismissed";
const MAX_RECENT          = 6;

// Destinations featured at the top
const POPULAR_CODES = ["FR", "ES", "PT", "MA", "CA", "AU", "DE", "BE", "CH", "GB", "US", "AE"];

// Tab order: most critical first
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

const CAT_ICON: Record<string, string> = {
  ambassade: "🏛️", immigration: "📋", sante: "🏥", logement: "🏠",
  emploi: "💼", banque: "🏦", fiscalite: "📊", education: "🎓",
  transport: "🚂", telecom: "📡", urgences: "🚨", communaute: "🌐", juridique: "⚖️",
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
// HELPERS
// ============================================================

function flag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return code.toUpperCase().split("").map(c =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  ).join("");
}

function catLabel(cat: string, lang: string): string {
  return CAT_LABEL[cat]?.[lang] ?? CAT_LABEL[cat]?.["fr"] ?? cat;
}

function entryTitle(e: DirectoryEntry, lang: string): string {
  if (lang !== "fr" && e.translations?.[lang]?.title) return e.translations[lang].title!;
  return e.title;
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
  countries: CountrySummary[];
  onSelect: (code: string, name: string) => void;
  onSkip: () => void;
  lang: string;
}> = ({ countries, onSelect, onSkip, lang }) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ code: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-detect from browser
  useEffect(() => {
    const detected = (navigator.language || "").split("-")[1]?.toUpperCase();
    if (detected) {
      const match = countries.find(c => c.country_code === detected);
      if (match) setSelected({ code: match.country_code, name: match.country_name });
    }
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [countries]);

  const filtered = useMemo(() => {
    if (!search) return countries.slice(0, 40);
    const q = search.toLowerCase();
    return countries.filter(c =>
      c.country_name.toLowerCase().includes(q) || c.country_code.toLowerCase().includes(q)
    ).slice(0, 25);
  }, [countries, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative">
        <button onClick={onSkip} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors">
          <X size={20} />
        </button>

        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🌍</div>
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
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-100 mb-5">
          {filtered.map(c => (
            <button
              key={c.country_code}
              onClick={() => setSelected({ code: c.country_code, name: c.country_name })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                selected?.code === c.country_code
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-700"
              }`}
            >
              <span className="text-xl leading-none">{flag(c.country_code)}</span>
              <span className="flex-1 text-left">{c.country_name}</span>
              {selected?.code === c.country_code && <span className="text-blue-500 text-base">✓</span>}
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
            className="flex-1 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("confirm", lang)}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ENTRY CARD
// ============================================================

const EntryCard: React.FC<{
  entry: DirectoryEntry;
  lang: string;
  highlighted?: boolean;
}> = ({ entry, lang, highlighted }) => {
  const title = entryTitle(entry, lang);
  return (
    <div className={`bg-white rounded-2xl border p-4 hover:shadow-md transition-all ${
      highlighted
        ? "border-blue-200 ring-1 ring-blue-100 bg-blue-50/20"
        : "border-gray-100 hover:border-gray-200"
    }`}>
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-700 hover:text-blue-800 hover:underline text-sm leading-snug inline-flex items-center gap-1 group"
          >
            <span>{title}</span>
            <ExternalLink size={11} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
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
          <a href={`tel:${entry.phone}`} className="flex items-center gap-1 hover:text-blue-600 font-medium">
            <Phone size={10} />{entry.phone}
          </a>
        )}
        {entry.email && (
          <a href={`mailto:${entry.email}`} className="flex items-center gap-1 hover:text-blue-600 max-w-[180px] truncate">
            <Mail size={10} />{entry.email}
          </a>
        )}
        {entry.opening_hours && (
          <span className="flex items-center gap-1"><Clock size={10} />{entry.opening_hours}</span>
        )}
      </div>
    </div>
  );
};

// ============================================================
// COUNTRY CARD (list)
// ============================================================

const CountryCard: React.FC<{
  country: CountrySummary;
  onClick: () => void;
  lang: string;
}> = ({ country, onClick, lang }) => (
  <button
    onClick={onClick}
    className="group w-full bg-white border border-gray-100 rounded-2xl p-4 text-left hover:shadow-lg hover:border-blue-100 hover:-translate-y-0.5 transition-all"
  >
    <div className="flex items-center gap-3">
      <span className="text-3xl leading-none shrink-0">{flag(country.country_code)}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm truncate">{country.country_name}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {country.total_links} {t("resources", lang)} · {country.official_links} officiels
        </div>
      </div>
      {country.emergency_number && (
        <span className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-bold">
          🆘 {country.emergency_number}
        </span>
      )}
    </div>
  </button>
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
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white mb-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl leading-none">{flag(nationality.code)}</span>
        <div>
          <p className="font-bold text-base leading-tight">{t("myKit", lang)}</p>
          <p className="text-xs text-blue-200 mt-0.5">{t("myKitDesc", lang)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {myEmbassy ? (
          <a
            href={myEmbassy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-colors"
          >
            <span className="text-xl shrink-0">🏛️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{entryTitle(myEmbassy, lang)}</p>
              {myEmbassy.phone && <p className="text-xs text-blue-200 mt-0.5">{myEmbassy.phone}</p>}
            </div>
            <ExternalLink size={14} className="text-blue-200 shrink-0" />
          </a>
        ) : (
          <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 text-blue-200 text-sm">
            <span className="text-xl shrink-0">🏛️</span>
            {t("noEmbassy", lang)}
          </div>
        )}

        {immigLinks.map(e => (
          <a
            key={e.id}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-colors"
          >
            <span className="text-xl shrink-0">📋</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entryTitle(e, lang)}</p>
              <p className="text-xs text-blue-200 mt-0.5">{catLabel("immigration", lang)}</p>
            </div>
            <ExternalLink size={14} className="text-blue-200 shrink-0" />
          </a>
        ))}
      </div>
    </div>
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

  // ── Nationality (persistent) ──────────────────────────────────────────────
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

  // ── Data ─────────────────────────────────────────────────────────────────
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [errorList, setErrorList] = useState<string | null>(null);

  const [detail, setDetail] = useState<CountryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  // ── List UI ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [continent, setContinent] = useState("all");
  const [recent, setRecent] = useState<CountrySummary[]>(loadRecent);

  // ── Detail UI ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>("");
  const [showAllEmbassies, setShowAllEmbassies] = useState(false);

  // ── URL param ─────────────────────────────────────────────────────────────
  const paysSlug = searchParams.get("pays");
  const selectedCountry = paysSlug ? countries.find(c => c.country_slug === paysSlug) ?? null : null;

  // ── Fetch countries list ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${MARKETING_API}/api/public/country-directory/countries`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: CountrySummary[]) => { setCountries(data); setLoadingList(false); })
      .catch(err => { setErrorList(err.message); setLoadingList(false); });
  }, []);

  // ── Auto-show nationality picker ──────────────────────────────────────────
  useEffect(() => {
    if (!pickerDismissed && countries.length > 0) {
      const t = setTimeout(() => setShowPicker(true), 1400);
      return () => clearTimeout(t);
    }
  }, [pickerDismissed, countries.length]);

  // ── Fetch country detail on URL change ───────────────────────────────────
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

  // ── Set first available tab ───────────────────────────────────────────────
  const availableTabs = useMemo(() => {
    if (!detail) return [];
    return CATEGORY_ORDER.filter(cat => (detail.entries[cat]?.length ?? 0) > 0);
  }, [detail]);

  useEffect(() => {
    if (availableTabs.length > 0) setActiveTab(availableTabs[0]);
  }, [availableTabs]);

  // ── Handlers ──────────────────────────────────────────────────────────────
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

  // ── Derived list data ─────────────────────────────────────────────────────
  const popularCountries = useMemo(() =>
    POPULAR_CODES.map(code => countries.find(c => c.country_code === code)).filter(Boolean) as CountrySummary[],
    [countries]
  );

  const continents = useMemo(() =>
    [...new Set(countries.map(c => c.continent))].sort(),
    [countries]
  );

  const filteredCountries = useMemo(() =>
    countries.filter(c => {
      const q = search.toLowerCase();
      return (
        (!search || c.country_name.toLowerCase().includes(q) || c.country_code.toLowerCase().includes(q)) &&
        (continent === "all" || c.continent === continent)
      );
    }),
    [countries, search, continent]
  );

  const groupedByContinent = useMemo(() => {
    const g: Record<string, CountrySummary[]> = {};
    for (const c of filteredCountries) {
      (g[c.continent] ??= []).push(c);
    }
    return g;
  }, [filteredCountries]);

  // ── Derived detail data ───────────────────────────────────────────────────
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

  // ── SEO ───────────────────────────────────────────────────────────────────
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
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6 group transition-colors"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
          {t("backToList", lang)}
        </button>

        {/* Country Hero */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <span className="text-7xl leading-none shrink-0">{flag(selectedCountry.country_code)}</span>

            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {selectedCountry.country_name}
              </h1>
              <p className="text-sm text-gray-400 mt-1 capitalize">
                {CONTINENT_LABEL[selectedCountry.continent]?.[lang] ?? selectedCountry.continent}
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                {selectedCountry.total_links} {t("resources", lang)} · {selectedCountry.official_links} officiels · {selectedCountry.categories_count} catégories
              </p>

              {/* Nationality chip */}
              <button
                onClick={() => setShowPicker(true)}
                className="mt-3 inline-flex items-center gap-2 text-xs border border-gray-200 rounded-full px-3 py-1.5 hover:border-blue-300 hover:text-blue-600 transition-colors text-gray-500"
              >
                {userNat ? (
                  <><span>{flag(userNat.code)}</span><span>{userNat.name}</span></>
                ) : (
                  <><span>🌍</span><span>{t("myNationality", lang)}</span></>
                )}
                <span className="text-blue-500 font-medium">{t("changeNat", lang)}</span>
              </button>
            </div>

            {/* Emergency Number — big red CTA */}
            {selectedCountry.emergency_number && (
              <a
                href={`tel:${selectedCountry.emergency_number}`}
                className="flex items-center gap-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-2xl px-5 py-4 shadow-lg transition-all shrink-0 sm:ml-auto"
              >
                <span className="text-2xl leading-none">🆘</span>
                <div>
                  <p className="text-xs text-red-200 font-medium">{t("emergency", lang)}</p>
                  <p className="text-3xl font-black tracking-wide leading-none">{selectedCountry.emergency_number}</p>
                </div>
              </a>
            )}
          </div>
        </div>

        {loadingDetail && (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        )}

        {errorDetail && (
          <div className="bg-red-50 text-red-700 rounded-2xl p-4 mb-5 flex items-center gap-2 text-sm">
            <AlertTriangle size={15} className="shrink-0" />
            {errorDetail}
          </div>
        )}

        {detail && (
          <>
            {/* Personalized Kit */}
            {userNat && (
              <PersonalizedKit
                nationality={userNat}
                entries={detail.entries}
                lang={lang}
              />
            )}

            {/* Category Tabs */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Tab bar */}
              <div className="overflow-x-auto border-b border-gray-100 scrollbar-none">
                <div className="flex min-w-max">
                  {availableTabs.map(cat => {
                    const count = cat === "ambassade"
                      ? embassyEntries.length
                      : (detail.entries[cat]?.length ?? 0);
                    const isActive = activeTab === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveTab(cat)}
                        className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                          isActive
                            ? "border-blue-600 text-blue-700 bg-blue-50/50"
                            : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-base leading-none">{CAT_ICON[cat] ?? "📌"}</span>
                        <span>{catLabel(cat, lang)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab content */}
              <div className="p-5">
                {/* Embassy tab — no nationality set */}
                {activeTab === "ambassade" && !userNat && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5 flex flex-col sm:flex-row items-center gap-4">
                    <span className="text-4xl shrink-0">🏛️</span>
                    <div className="flex-1 text-center sm:text-left">
                      <p className="font-semibold text-amber-900 text-sm">{t("setNatPrompt", lang)}</p>
                      <p className="text-xs text-amber-700 mt-1">{detail.entries.ambassade?.length ?? 0} ambassades répertoriées dans ce pays</p>
                    </div>
                    <button
                      onClick={() => setShowPicker(true)}
                      className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                    >
                      {t("setNatBtn", lang)}
                    </button>
                  </div>
                )}

                {/* Embassy tab — nationality set: filter toggle */}
                {activeTab === "ambassade" && userNat && (
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none">{flag(userNat.code)}</span>
                      <p className="text-sm text-gray-600 font-medium">
                        {showAllEmbassies
                          ? `${detail.entries.ambassade?.length ?? 0} ambassades au total`
                          : `${userNat.name} · ${embassyEntries.length} ${embassyEntries.length > 1 ? "entrées" : "entrée"}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAllEmbassies(!showAllEmbassies)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      {showAllEmbassies
                        ? t("filterMyNat", lang)
                        : `${t("allEmbassies", lang)} (${detail.entries.ambassade?.length ?? 0})`}
                    </button>
                  </div>
                )}

                {currentEntries.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-10">{t("noData", lang)}</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {currentEntries.map(entry => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        lang={lang}
                        highlighted={
                          activeTab === "ambassade" &&
                          userNat !== null &&
                          entry.nationality_code === userNat.code
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDER — COUNTRY LIST
  // ============================================================

  const renderList = () => (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{t("pageTitle", lang)}</h1>
        <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto">{t("pageDesc", lang)}</p>

        {/* Nationality pill */}
        <div className="mt-5 flex justify-center">
          {userNat ? (
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-2 bg-white border border-blue-100 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md transition-all text-sm"
            >
              <span className="text-xl leading-none">{flag(userNat.code)}</span>
              <span className="text-gray-700">{t("iAmFrom", lang)} <strong>{userNat.name}</strong></span>
              <span className="text-blue-500 text-xs font-medium">{t("changeNat", lang)}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-full shadow-md transition-colors"
            >
              🌍 {t("personalizeExp", lang)}
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mx-auto mb-8">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder", lang)}
          className="w-full pl-12 pr-10 py-4 border border-gray-200 rounded-2xl text-base shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      {loadingList && (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      )}

      {errorList && (
        <div className="bg-red-50 text-red-700 rounded-2xl p-4 mb-6 flex items-center gap-2 text-sm">
          <AlertTriangle size={15} className="shrink-0" />
          {errorList}
        </div>
      )}

      {!loadingList && countries.length > 0 && (
        <>
          {/* Recently viewed — only when no active search */}
          {!search && recent.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                {t("recentlyViewed", lang)}
              </h2>
              <div className="flex flex-wrap gap-2">
                {recent.map(c => (
                  <button
                    key={c.country_code}
                    onClick={() => goToCountry(c)}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-2 text-sm hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <span className="text-lg leading-none">{flag(c.country_code)}</span>
                    <span className="text-gray-700">{c.country_name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Popular destinations — only when no active search */}
          {!search && popularCountries.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                {t("popularDest", lang)}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {popularCountries.map(c => (
                  <button
                    key={c.country_code}
                    onClick={() => goToCountry(c)}
                    className="flex flex-col items-center gap-1.5 bg-white border border-gray-100 rounded-2xl p-3 hover:shadow-md hover:border-blue-100 hover:-translate-y-0.5 transition-all"
                  >
                    <span className="text-3xl leading-none">{flag(c.country_code)}</span>
                    <span className="text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2">{c.country_name}</span>
                    {c.emergency_number && (
                      <span className="text-xs text-red-500 font-bold">{c.emergency_number}</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Continent filters — always visible */}
          <div className="flex flex-wrap gap-2 mb-7">
            <button
              onClick={() => setContinent("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                continent === "all" ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-200"
              }`}
            >
              🌍 {t("allCountries", lang)} ({filteredCountries.length})
            </button>
            {continents.map(cont => {
              const count = filteredCountries.filter(c => c.continent === cont).length;
              return (
                <button
                  key={cont}
                  onClick={() => setContinent(cont)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                    continent === cont ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-200"
                  }`}
                >
                  {CONTINENT_LABEL[cont]?.[lang] ?? cont} ({count})
                </button>
              );
            })}
          </div>

          {/* Search result feedback */}
          {search && (
            <p className="text-sm text-gray-500 mb-5">
              {filteredCountries.length === 0
                ? <span className="text-amber-600">{t("noResults", lang)} «{search}»</span>
                : <><strong className="text-gray-800">{filteredCountries.length}</strong> {t("results", lang)} · «{search}»</>}
            </p>
          )}

          {/* Country grid — always grouped by continent, filtered in real time */}
          {filteredCountries.length === 0 && search ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🔍</div>
              <p>{t("noResults", lang)} «{search}»</p>
            </div>
          ) : (
            Object.entries(groupedByContinent)
              .filter(([, cs]) => cs.length > 0)
              .map(([cont, cs]) => (
                <section key={cont} className="mb-10">
                  <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2 capitalize">
                    {CONTINENT_LABEL[cont]?.[lang] ?? cont}
                    <span className="text-sm font-normal text-gray-400">
                      ({cs.length} {t("countries", lang)})
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cs.map(c => (
                      <CountryCard key={c.country_code} country={c} onClick={() => goToCountry(c)} lang={lang} />
                    ))}
                  </div>
                </section>
              ))
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

      {showPicker && (
        <NationalityPicker
          countries={countries}
          onSelect={handleNatSelect}
          onSkip={handleNatSkip}
          lang={lang}
        />
      )}

      <main className="min-h-screen bg-gray-50">
        {paysSlug && selectedCountry ? renderDetail() : renderList()}
      </main>
    </Layout>
  );
};

export default Annuaire;
