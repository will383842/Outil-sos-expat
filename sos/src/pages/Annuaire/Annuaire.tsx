/**
 * Annuaire — Public directory of official resources for expats
 * Route: /fr-fr/annuaire, /en-us/expat-directory, etc.
 * Data: Mission Control API (influenceurs.life-expat.com)
 * Public endpoints: GET /api/public/country-directory/countries
 *                   GET /api/public/country-directory/country/{code}
 */

import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import {
  Search, Globe, MapPin, Phone, Mail, Clock, ExternalLink,
  Shield, AlertCircle, Loader2, ChevronRight, Building2,
  ArrowLeft,
} from "lucide-react";

// ============================================================================
// CONFIG
// ============================================================================

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

// ============================================================================
// TYPES
// ============================================================================

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
  global: Record<string, DirectoryEntry[]>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  ambassade:   { fr: "Ambassades & Consulats", en: "Embassies & Consulates", es: "Embajadas & Consulados", de: "Botschaften & Konsulate", ru: "Посольства", pt: "Embaixadas", ar: "السفارات", ch: "大使馆", hi: "दूतावास" },
  immigration: { fr: "Immigration & Visa",     en: "Immigration & Visa",     es: "Inmigración & Visa",    de: "Einwanderung",           ru: "Иммиграция", pt: "Imigração",   ar: "الهجرة",   ch: "移民",   hi: "आव्रजन" },
  sante:       { fr: "Santé",                  en: "Health",                 es: "Salud",                 de: "Gesundheit",             ru: "Здоровье",   pt: "Saúde",       ar: "الصحة",    ch: "健康",   hi: "स्वास्थ्य" },
  logement:    { fr: "Logement",               en: "Housing",                es: "Vivienda",              de: "Wohnen",                 ru: "Жильё",      pt: "Habitação",   ar: "السكن",    ch: "住房",   hi: "आवास" },
  emploi:      { fr: "Emploi",                 en: "Employment",             es: "Empleo",                de: "Beschäftigung",          ru: "Работа",     pt: "Emprego",     ar: "التوظيف",  ch: "就业",   hi: "रोजगार" },
  banque:      { fr: "Banque & Finance",       en: "Banking & Finance",      es: "Banca & Finanzas",      de: "Banken",                 ru: "Банки",      pt: "Bancos",      ar: "البنوك",   ch: "银行",   hi: "बैंक" },
  fiscalite:   { fr: "Fiscalité & Impôts",     en: "Tax & Fiscal",           es: "Impuestos",             de: "Steuern",                ru: "Налоги",     pt: "Impostos",    ar: "الضرائب",  ch: "税务",   hi: "कर" },
  education:   { fr: "Éducation",              en: "Education",              es: "Educación",             de: "Bildung",                ru: "Образование",pt: "Educação",    ar: "التعليم",  ch: "教育",   hi: "शिक्षा" },
  transport:   { fr: "Transport",              en: "Transport",              es: "Transporte",            de: "Transport",              ru: "Транспорт",  pt: "Transporte",  ar: "النقل",    ch: "交通",   hi: "परिवहन" },
  telecom:     { fr: "Télécom & Internet",     en: "Telecom & Internet",     es: "Telecom & Internet",    de: "Telekommunikation",      ru: "Телеком",    pt: "Telecom",     ar: "الاتصالات", ch: "通讯",  hi: "दूरसंचार" },
  urgences:    { fr: "Urgences",               en: "Emergency",              es: "Emergencias",           de: "Notfall",                ru: "Экстренные", pt: "Emergência",  ar: "الطوارئ",  ch: "紧急",   hi: "आपातकाल" },
  communaute:  { fr: "Communauté Expat",       en: "Expat Community",        es: "Comunidad Expat",       de: "Expat-Gemeinschaft",     ru: "Сообщество", pt: "Comunidade",  ar: "المجتمع",  ch: "社区",   hi: "समुदाय" },
  juridique:   { fr: "Juridique",              en: "Legal",                  es: "Legal",                 de: "Rechtliches",            ru: "Юридические", pt: "Jurídico",   ar: "القانوني", ch: "法律",   hi: "कानूनी" },
};

const CATEGORY_ICONS: Record<string, string> = {
  ambassade: "🏛️", immigration: "📋", sante: "🏥", logement: "🏠",
  emploi: "💼", banque: "🏦", fiscalite: "📊", education: "🎓",
  transport: "🚂", telecom: "📡", urgences: "🚨", communaute: "🌐", juridique: "⚖️",
};

const CONTINENT_LABELS: Record<string, Record<string, string>> = {
  EU: { fr: "Europe", en: "Europe", es: "Europa", de: "Europa", ru: "Европа", pt: "Europa", ar: "أوروبا", ch: "欧洲", hi: "यूरोप" },
  AS: { fr: "Asie", en: "Asia", es: "Asia", de: "Asien", ru: "Азия", pt: "Ásia", ar: "آسيا", ch: "亚洲", hi: "एशिया" },
  AF: { fr: "Afrique", en: "Africa", es: "África", de: "Afrika", ru: "Африка", pt: "África", ar: "أفريقيا", ch: "非洲", hi: "अफ्रीका" },
  NA: { fr: "Amérique du Nord", en: "North America", es: "América del Norte", de: "Nordamerika", ru: "Сев. Америка", pt: "América do Norte", ar: "أمريكا الشمالية", ch: "北美", hi: "उत्तरी अमेरिका" },
  SA: { fr: "Amérique du Sud", en: "South America", es: "América del Sur", de: "Südamerika", ru: "Юж. Америка", pt: "América do Sul", ar: "أمريكا الجنوبية", ch: "南美", hi: "दक्षिण अमेरिका" },
  OC: { fr: "Océanie", en: "Oceania", es: "Oceanía", de: "Ozeanien", ru: "Океания", pt: "Oceania", ar: "أوقيانوسيا", ch: "大洋洲", hi: "ओशिनिया" },
  ME: { fr: "Moyen-Orient", en: "Middle East", es: "Oriente Medio", de: "Naher Osten", ru: "Ближний Восток", pt: "Médio Oriente", ar: "الشرق الأوسط", ch: "中东", hi: "मध्य पूर्व" },
};

// ============================================================================
// HELPERS
// ============================================================================

function getCategoryLabel(category: string, lang: string): string {
  return CATEGORY_LABELS[category]?.[lang] || CATEGORY_LABELS[category]?.["fr"] || category;
}

function getContinentLabel(continent: string, lang: string): string {
  return CONTINENT_LABELS[continent]?.[lang] || CONTINENT_LABELS[continent]?.["fr"] || continent;
}

function getEntryTitle(entry: DirectoryEntry, lang: string): string {
  if (lang !== "fr" && entry.translations?.[lang]?.title) {
    return entry.translations[lang].title!;
  }
  return entry.title;
}

function getEntryDescription(entry: DirectoryEntry, lang: string): string | null {
  if (lang !== "fr" && entry.translations?.[lang]?.description) {
    return entry.translations[lang].description!;
  }
  return entry.description;
}

// ============================================================================
// ENTRY CARD
// ============================================================================

const EntryCard: React.FC<{ entry: DirectoryEntry; lang: string }> = ({ entry, lang }) => {
  const title = getEntryTitle(entry, lang);
  const description = getEntryDescription(entry, lang);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-700 hover:text-blue-800 hover:underline text-sm leading-snug flex items-center gap-1 group"
          >
            <span className="truncate">{title}</span>
            <ExternalLink size={12} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <p className="text-xs text-gray-400 mt-0.5">{entry.domain}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {entry.is_official && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-100">
              <Shield size={10} />
              {lang === "en" ? "Official" : lang === "es" ? "Oficial" : lang === "de" ? "Offiziell" : lang === "ar" ? "رسمي" : "Officiel"}
            </span>
          )}
          {entry.trust_score >= 90 && !entry.is_official && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
              ★
            </span>
          )}
        </div>
      </div>

      {description && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{description}</p>
      )}

      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        {entry.city && (
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {entry.city}
          </span>
        )}
        {entry.phone && (
          <a href={`tel:${entry.phone}`} className="flex items-center gap-1 hover:text-blue-600">
            <Phone size={11} />
            {entry.phone}
          </a>
        )}
        {entry.email && (
          <a href={`mailto:${entry.email}`} className="flex items-center gap-1 hover:text-blue-600 truncate max-w-[180px]">
            <Mail size={11} />
            {entry.email}
          </a>
        )}
        {entry.opening_hours && (
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {entry.opening_hours}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Annuaire: React.FC = () => {
  const location = useLocation();
  const { language } = useApp();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;
  const locale = CANONICAL_LOCALES[lang] || "fr-fr";

  // States
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [errorCountries, setErrorCountries] = useState<string | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<CountrySummary | null>(null);
  const [countryDetail, setCountryDetail] = useState<CountryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedContinent, setSelectedContinent] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // ── Fetch countries list ──────────────────────────────────────────────────

  useEffect(() => {
    setLoadingCountries(true);
    fetch(`${MARKETING_API}/api/public/country-directory/countries`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: CountrySummary[]) => {
        setCountries(data);
        setLoadingCountries(false);
      })
      .catch(err => {
        setErrorCountries(err.message);
        setLoadingCountries(false);
      });
  }, []);

  // ── Fetch country detail ──────────────────────────────────────────────────

  const fetchCountry = useCallback((code: string) => {
    setLoadingDetail(true);
    setErrorDetail(null);
    setCountryDetail(null);
    setSelectedCategory("all");
    fetch(`${MARKETING_API}/api/public/country-directory/country/${code}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: CountryDetail) => {
        setCountryDetail(data);
        setLoadingDetail(false);
      })
      .catch(err => {
        setErrorDetail(err.message);
        setLoadingDetail(false);
      });
  }, []);

  const handleSelectCountry = useCallback((c: CountrySummary) => {
    setSelectedCountry(c);
    fetchCountry(c.country_code);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [fetchCountry]);

  const handleBack = useCallback(() => {
    setSelectedCountry(null);
    setCountryDetail(null);
    setSelectedCategory("all");
  }, []);

  // ── Filtered countries ────────────────────────────────────────────────────

  const filteredCountries = countries.filter(c => {
    const matchSearch = search.length < 2 || c.country_name.toLowerCase().includes(search.toLowerCase());
    const matchContinent = selectedContinent === "all" || c.continent === selectedContinent;
    return matchSearch && matchContinent;
  });

  const continents = Array.from(new Set(countries.map(c => c.continent).filter(Boolean))).sort();

  // ── SEO ───────────────────────────────────────────────────────────────────

  const canonicalUrl = `${BASE_URL}/${locale}/${ANNUAIRE_SLUGS[lang] || "annuaire"}`;
  const hreflangLinks = SUPPORTED_LANGUAGES.map(lc => ({
    lang: lc === "ch" ? "zh-Hans" : lc,
    url: `${BASE_URL}/${CANONICAL_LOCALES[lc] || "fr-fr"}/${ANNUAIRE_SLUGS[lc] || "annuaire"}`,
  }));

  const seoTitle = {
    fr: "Annuaire des expatriés — Ressources officielles par pays | SOS Expat",
    en: "Expat Directory — Official Resources by Country | SOS Expat",
    es: "Directorio Expat — Recursos Oficiales por País | SOS Expat",
    de: "Expat-Verzeichnis — Offizielle Ressourcen nach Land | SOS Expat",
    ru: "Справочник экспатов — официальные ресурсы по странам | SOS Expat",
    pt: "Diretório Expat — Recursos Oficiais por País | SOS Expat",
    ar: "دليل المغتربين — موارد رسمية حسب الدولة | SOS Expat",
    ch: "海外人员指南 — 按国家分类的官方资源 | SOS Expat",
    hi: "प्रवासी निर्देशिका — देश के अनुसार आधिकारिक संसाधन | SOS Expat",
  }[lang] || "Expat Directory | SOS Expat";

  const seoDescription = {
    fr: "Trouvez les ambassades, services d'immigration, hôpitaux, banques et ressources officielles pour les expatriés dans 197 pays. Annuaire vérifié par SOS Expat.",
    en: "Find embassies, immigration services, hospitals, banks and official resources for expats in 197 countries. Verified directory by SOS Expat.",
    es: "Encuentre embajadas, servicios de inmigración, hospitales, bancos y recursos oficiales para expatriados en 197 países.",
    de: "Finden Sie Botschaften, Einwanderungsbehörden, Krankenhäuser, Banken und offizielle Ressourcen für Expats in 197 Ländern.",
  }[lang] || "Find official resources for expats in 197 countries | SOS Expat";

  // ── Render: Country detail view ──────────────────────────────────────────

  if (selectedCountry) {
    const allCategories = countryDetail
      ? [...new Set([...Object.keys(countryDetail.entries), ...Object.keys(countryDetail.global)])]
      : [];

    const currentEntries = countryDetail && selectedCategory !== "all"
      ? countryDetail.entries[selectedCategory] || []
      : countryDetail ? Object.values(countryDetail.entries).flat() : [];

    const currentGlobal = countryDetail && selectedCategory !== "all"
      ? countryDetail.global[selectedCategory] || []
      : countryDetail ? Object.values(countryDetail.global).flat() : [];

    return (
      <Layout>
        <SEOHead
          title={`${selectedCountry.country_name} — ${seoTitle}`}
          description={seoDescription}
          canonicalUrl={canonicalUrl}
          alternateLanguages={hreflangLinks}
        />
        <BreadcrumbSchema items={[
          { name: lang === "en" ? "Home" : "Accueil", url: `${BASE_URL}/${locale}` },
          { name: lang === "en" ? "Expat Directory" : "Annuaire", url: canonicalUrl },
          { name: selectedCountry.country_name },
        ]} />

        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
          {/* Header */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors text-sm mb-6"
            >
              <ArrowLeft size={16} />
              {lang === "en" ? "Back to countries" : lang === "es" ? "Volver" : lang === "de" ? "Zurück" : lang === "ar" ? "رجوع" : "Retour aux pays"}
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl">
                🌍
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  {selectedCountry.country_name}
                </h1>
                {countryDetail?.country.emergency_number && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-red-400 text-sm font-semibold flex items-center gap-1">
                      🚨 {lang === "en" ? "Emergency" : lang === "es" ? "Emergencia" : lang === "de" ? "Notruf" : lang === "ar" ? "طوارئ" : "Urgence"} : {countryDetail.country.emergency_number}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-3 text-xs text-blue-200">
              <span className="bg-white/10 rounded-full px-3 py-1">
                {selectedCountry.total_links} {lang === "en" ? "resources" : "ressources"}
              </span>
              <span className="bg-white/10 rounded-full px-3 py-1">
                {selectedCountry.official_links} {lang === "en" ? "official" : lang === "es" ? "oficiales" : "officielles"}
              </span>
              {selectedCountry.with_address > 0 && (
                <span className="bg-white/10 rounded-full px-3 py-1">
                  {selectedCountry.with_address} {lang === "en" ? "with address" : "avec adresse"}
                </span>
              )}
            </div>
          </div>

          {/* Category tabs */}
          <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-white/10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
              <div className="flex gap-1 py-2 min-w-max">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === "all"
                      ? "bg-blue-600 text-white"
                      : "text-blue-300 hover:bg-white/10"
                  }`}
                >
                  {lang === "en" ? "All" : lang === "es" ? "Todo" : lang === "de" ? "Alle" : lang === "ar" ? "الكل" : "Tout"}
                </button>
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
                      selectedCategory === cat
                        ? "bg-blue-600 text-white"
                        : "text-blue-300 hover:bg-white/10"
                    }`}
                  >
                    <span>{CATEGORY_ICONS[cat] || "📌"}</span>
                    <span>{getCategoryLabel(cat, lang)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {loadingDetail && (
              <div className="flex items-center justify-center py-16 text-blue-300">
                <Loader2 size={28} className="animate-spin mr-3" />
                <span>{lang === "en" ? "Loading..." : "Chargement..."}</span>
              </div>
            )}
            {errorDetail && (
              <div className="flex items-center gap-3 p-4 bg-red-900/30 rounded-xl text-red-300 border border-red-800">
                <AlertCircle size={20} />
                <span>{errorDetail}</span>
              </div>
            )}

            {countryDetail && !loadingDetail && (
              <div className="space-y-8">
                {/* Country-specific entries */}
                {currentEntries.length > 0 && (
                  <div>
                    {selectedCategory === "all" ? (
                      // Group by category
                      Object.entries(countryDetail.entries).map(([cat, entries]) => (
                        <div key={cat} className="mb-6">
                          <h2 className="flex items-center gap-2 text-white font-semibold text-sm mb-3">
                            <span>{CATEGORY_ICONS[cat] || "📌"}</span>
                            <span>{getCategoryLabel(cat, lang)}</span>
                            <span className="text-blue-400 font-normal">({entries.length})</span>
                          </h2>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {entries.map(e => <EntryCard key={e.id} entry={e} lang={lang} />)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {currentEntries.map(e => <EntryCard key={e.id} entry={e} lang={lang} />)}
                      </div>
                    )}
                  </div>
                )}

                {/* Global resources */}
                {currentGlobal.length > 0 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-blue-300 font-semibold text-sm mb-3 border-t border-white/10 pt-6">
                      <Globe size={16} />
                      <span>
                        {lang === "en" ? "Global Resources" : lang === "es" ? "Recursos globales" : lang === "de" ? "Globale Ressourcen" : lang === "ar" ? "موارد عالمية" : "Ressources mondiales"}
                      </span>
                    </h2>
                    {selectedCategory === "all" ? (
                      Object.entries(countryDetail.global).map(([cat, entries]) => (
                        <div key={`g-${cat}`} className="mb-6">
                          <h3 className="flex items-center gap-2 text-white/70 font-medium text-xs mb-2">
                            <span>{CATEGORY_ICONS[cat] || "📌"}</span>
                            <span>{getCategoryLabel(cat, lang)}</span>
                          </h3>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {entries.map(e => <EntryCard key={e.id} entry={e} lang={lang} />)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {currentGlobal.map(e => <EntryCard key={e.id} entry={e} lang={lang} />)}
                      </div>
                    )}
                  </div>
                )}

                {currentEntries.length === 0 && currentGlobal.length === 0 && (
                  <div className="text-center py-12 text-blue-300">
                    {lang === "en" ? "No resources for this category" : "Aucune ressource pour cette catégorie"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ── Render: Countries list ────────────────────────────────────────────────

  return (
    <Layout>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={canonicalUrl}
        alternateLanguages={hreflangLinks}
      />
      <BreadcrumbSchema items={[
        { name: lang === "en" ? "Home" : "Accueil", url: `${BASE_URL}/${locale}` },
        { name: lang === "en" ? "Expat Directory" : "Annuaire" },
      ]} />

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        {/* Hero */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-blue-500/30">
            <Globe size={16} />
            {lang === "en" ? "197 countries covered" : lang === "es" ? "197 países cubiertos" : lang === "de" ? "197 Länder" : lang === "ar" ? "197 دولة" : "197 pays couverts"}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {lang === "en" ? "Expat Directory" : lang === "es" ? "Directorio Expat" : lang === "de" ? "Expat-Verzeichnis" : lang === "ar" ? "دليل المغتربين" : lang === "pt" ? "Diretório Expat" : lang === "ru" ? "Справочник экспатов" : "Annuaire des Expatriés"}
          </h1>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto mb-8">
            {lang === "en"
              ? "Official resources for expats: embassies, immigration, health, banking, housing and more — in 197 countries."
              : lang === "es"
              ? "Recursos oficiales para expatriados: embajadas, inmigración, salud, banca, vivienda y más — en 197 países."
              : lang === "de"
              ? "Offizielle Ressourcen für Expats: Botschaften, Einwanderung, Gesundheit, Banken, Wohnen und mehr — in 197 Ländern."
              : lang === "ar"
              ? "موارد رسمية للمغتربين: سفارات، هجرة، صحة، بنوك، سكن والمزيد — في 197 دولة."
              : "Ressources officielles pour les expatriés : ambassades, immigration, santé, banque, logement et plus — dans 197 pays."}
          </p>

          {/* Search */}
          <div className="max-w-md mx-auto relative mb-6">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === "en" ? "Search a country..." : lang === "es" ? "Buscar un país..." : lang === "de" ? "Land suchen..." : lang === "ar" ? "ابحث عن دولة..." : "Rechercher un pays..."}
              className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Continent filter */}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setSelectedContinent("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedContinent === "all" ? "bg-blue-600 text-white" : "bg-white/10 text-blue-300 hover:bg-white/20"}`}
            >
              {lang === "en" ? "All" : lang === "es" ? "Todo" : lang === "de" ? "Alle" : lang === "ar" ? "الكل" : "Tous"}
            </button>
            {continents.map(c => (
              <button
                key={c}
                onClick={() => setSelectedContinent(c)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedContinent === c ? "bg-blue-600 text-white" : "bg-white/10 text-blue-300 hover:bg-white/20"}`}
              >
                {getContinentLabel(c, lang)}
              </button>
            ))}
          </div>
        </div>

        {/* Countries grid */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {loadingCountries && (
            <div className="flex items-center justify-center py-16 text-blue-300">
              <Loader2 size={28} className="animate-spin mr-3" />
              <span>{lang === "en" ? "Loading countries..." : "Chargement des pays..."}</span>
            </div>
          )}

          {errorCountries && (
            <div className="flex items-center gap-3 p-4 bg-red-900/30 rounded-xl text-red-300 border border-red-800 max-w-lg mx-auto">
              <AlertCircle size={20} />
              <div>
                <p className="font-medium">{lang === "en" ? "Unable to load directory" : "Impossible de charger l'annuaire"}</p>
                <p className="text-sm opacity-75">{errorCountries}</p>
              </div>
            </div>
          )}

          {!loadingCountries && !errorCountries && (
            <>
              <p className="text-blue-400 text-sm mb-4">
                {filteredCountries.length} {lang === "en" ? "countries" : lang === "es" ? "países" : lang === "de" ? "Länder" : lang === "ar" ? "دولة" : "pays"}
                {search && ` · "${search}"`}
              </p>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredCountries.map(country => (
                  <button
                    key={country.country_code}
                    onClick={() => handleSelectCountry(country)}
                    className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-xl p-4 text-left transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors">
                          {country.country_name}
                        </p>
                        <p className="text-blue-400 text-xs">{getContinentLabel(country.continent, lang)}</p>
                      </div>
                      <ChevronRight size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                        {country.total_links} liens
                      </span>
                      {country.emergency_number && (
                        <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          🚨 {country.emergency_number}
                        </span>
                      )}
                      {country.official_links > 0 && (
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Shield size={10} />
                          {country.official_links}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {filteredCountries.length === 0 && (
                <div className="text-center py-16 text-blue-400">
                  <Search size={40} className="mx-auto mb-3 opacity-50" />
                  <p>{lang === "en" ? "No country found" : lang === "es" ? "No se encontró país" : "Aucun pays trouvé"}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Annuaire;
