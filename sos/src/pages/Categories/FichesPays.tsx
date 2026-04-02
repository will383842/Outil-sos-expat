/**
 * Fiches Pays — Category Page Premium 2026
 * Palette: Rouge #DC2626 / Noir #0F172A / Blanc
 * Guides complets par pays de destination pour expatries
 */

import React, { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { parseLocaleFromPath } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import {
  Search,
  Globe,
  MapPin,
  BookOpen,
  ArrowRight,
  Clock,
  Layers,
  Map,
  Flag,
} from "lucide-react";

// ============================================================
// i18n
// ============================================================

const T: Record<string, Record<string, string>> = {
  badge: { fr: "Fiches Pays", en: "Country Sheets" },
  title: { fr: "Guides par pays de destination", en: "Guides by destination country" },
  subtitle: {
    fr: "Retrouvez toutes les informations essentielles pour votre expatriation : demarches administratives, cout de la vie, sante, logement, fiscalite et bien plus.",
    en: "Find all essential information for your expatriation: administrative procedures, cost of living, healthcare, housing, taxes and more.",
  },
  statSheets: { fr: "fiches pays", en: "country sheets" },
  statContinents: { fr: "continents", en: "continents" },
  statCountries: { fr: "pays couverts", en: "countries covered" },
  filterAll: { fr: "Tous", en: "All" },
  filterEurope: { fr: "Europe", en: "Europe" },
  filterAfrica: { fr: "Afrique", en: "Africa" },
  filterAsia: { fr: "Asie", en: "Asia" },
  filterAmericas: { fr: "Ameriques", en: "Americas" },
  filterMiddleEast: { fr: "Moyen-Orient", en: "Middle East" },
  filterOceania: { fr: "Oceanie", en: "Oceania" },
  searchPlaceholder: { fr: "Rechercher un pays...", en: "Search a country..." },
  rubriques: { fr: "rubriques disponibles", en: "sections available" },
  updatedOn: { fr: "Mis a jour le", en: "Updated on" },
  comingSoon: { fr: "Bientot disponible", en: "Coming soon" },
  ctaTitle: { fr: "Un pays manque a l'appel ?", en: "A country missing?" },
  ctaSubtitle: {
    fr: "Suggerez un pays et notre equipe preparera une fiche complete pour vous.",
    en: "Suggest a country and our team will prepare a complete sheet for you.",
  },
  ctaButton: { fr: "Suggerer un pays", en: "Suggest a country" },
  noResults: { fr: "Aucun pays ne correspond a votre recherche.", en: "No country matches your search." },
  seoTitle: { fr: "Fiches Pays Expatriation | SOS-Expat", en: "Country Expatriation Sheets | SOS-Expat" },
  seoDescription: {
    fr: "Guides complets par pays de destination : demarches, cout de la vie, sante, logement, fiscalite. Plus de 200 pays couverts sur 7 continents.",
    en: "Complete guides by destination country: procedures, cost of living, healthcare, housing, taxes. Over 200 countries covered across 7 continents.",
  },
};

// ============================================================
// CONTINENTS
// ============================================================

type Continent = "Europe" | "Afrique" | "Asie" | "Ameriques" | "Moyen-Orient" | "Oceanie";

const CONTINENT_KEYS: Continent[] = [
  "Europe",
  "Afrique",
  "Asie",
  "Ameriques",
  "Moyen-Orient",
  "Oceanie",
];

const CONTINENT_FILTER_KEYS: Record<Continent, string> = {
  Europe: "filterEurope",
  Afrique: "filterAfrica",
  Asie: "filterAsia",
  Ameriques: "filterAmericas",
  "Moyen-Orient": "filterMiddleEast",
  Oceanie: "filterOceania",
};

// ============================================================
// MOCK DATA
// ============================================================

interface CountrySheet {
  code: string;
  name: Record<string, string>;
  continent: Continent;
  rubriqueCount: number;
  lastUpdated?: string;
}

const COUNTRIES: CountrySheet[] = [
  { code: "FR", name: { fr: "France", en: "France" }, continent: "Europe", rubriqueCount: 12, lastUpdated: "2026-03-28" },
  { code: "ES", name: { fr: "Espagne", en: "Spain" }, continent: "Europe", rubriqueCount: 10, lastUpdated: "2026-03-25" },
  { code: "DE", name: { fr: "Allemagne", en: "Germany" }, continent: "Europe", rubriqueCount: 11, lastUpdated: "2026-03-20" },
  { code: "PT", name: { fr: "Portugal", en: "Portugal" }, continent: "Europe", rubriqueCount: 9 },
  { code: "IT", name: { fr: "Italie", en: "Italy" }, continent: "Europe", rubriqueCount: 8 },
  { code: "BE", name: { fr: "Belgique", en: "Belgium" }, continent: "Europe", rubriqueCount: 7 },
  { code: "MA", name: { fr: "Maroc", en: "Morocco" }, continent: "Afrique", rubriqueCount: 8, lastUpdated: "2026-03-15" },
  { code: "SN", name: { fr: "Senegal", en: "Senegal" }, continent: "Afrique", rubriqueCount: 6 },
  { code: "CI", name: { fr: "Cote d'Ivoire", en: "Ivory Coast" }, continent: "Afrique", rubriqueCount: 5 },
  { code: "JP", name: { fr: "Japon", en: "Japan" }, continent: "Asie", rubriqueCount: 9, lastUpdated: "2026-03-22" },
  { code: "TH", name: { fr: "Thailande", en: "Thailand" }, continent: "Asie", rubriqueCount: 8 },
  { code: "SG", name: { fr: "Singapour", en: "Singapore" }, continent: "Asie", rubriqueCount: 7 },
  { code: "CA", name: { fr: "Canada", en: "Canada" }, continent: "Ameriques", rubriqueCount: 11, lastUpdated: "2026-03-27" },
  { code: "BR", name: { fr: "Bresil", en: "Brazil" }, continent: "Ameriques", rubriqueCount: 7 },
  { code: "MX", name: { fr: "Mexique", en: "Mexico" }, continent: "Ameriques", rubriqueCount: 6 },
  { code: "AE", name: { fr: "Emirats arabes unis", en: "United Arab Emirates" }, continent: "Moyen-Orient", rubriqueCount: 10, lastUpdated: "2026-03-18" },
  { code: "AU", name: { fr: "Australie", en: "Australia" }, continent: "Oceanie", rubriqueCount: 10, lastUpdated: "2026-03-26" },
  { code: "NZ", name: { fr: "Nouvelle-Zelande", en: "New Zealand" }, continent: "Oceanie", rubriqueCount: 6 },
];

const COMING_SOON: { code: string; name: Record<string, string>; continent: Continent }[] = [
  { code: "KR", name: { fr: "Coree du Sud", en: "South Korea" }, continent: "Asie" },
  { code: "CO", name: { fr: "Colombie", en: "Colombia" }, continent: "Ameriques" },
  { code: "ZA", name: { fr: "Afrique du Sud", en: "South Africa" }, continent: "Afrique" },
];

// ============================================================
// ANIMATIONS
// ============================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ============================================================
// HELPERS
// ============================================================

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function t(key: string, lang: string): string {
  return T[key]?.[lang] ?? T[key]?.["fr"] ?? key;
}

// ============================================================
// COMPONENT
// ============================================================

const FichesPays: React.FC = () => {
  const location = useLocation();
  const { language } = useApp();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;

  const [activeContinent, setActiveContinent] = useState<Continent | null>(null);
  const [search, setSearch] = useState("");

  // ----- Filtered & grouped countries -----
  const filtered = useMemo(() => {
    let list = COUNTRIES;
    if (activeContinent) {
      list = list.filter((c) => c.continent === activeContinent);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.fr.toLowerCase().includes(q) ||
          c.name.en.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeContinent, search]);

  const grouped = useMemo(() => {
    const map = new Map<Continent, CountrySheet[]>();
    for (const c of filtered) {
      if (!map.has(c.continent)) map.set(c.continent, []);
      map.get(c.continent)!.push(c);
    }
    // Sort by CONTINENT_KEYS order
    const sorted: [Continent, CountrySheet[]][] = [];
    for (const key of CONTINENT_KEYS) {
      const items = map.get(key);
      if (items && items.length > 0) sorted.push([key, items]);
    }
    return sorted;
  }, [filtered]);

  const stats = [
    { icon: BookOpen, value: COUNTRIES.length, label: t("statSheets", lang) },
    { icon: Map, value: 7, label: t("statContinents", lang) },
    { icon: Globe, value: "200+", label: t("statCountries", lang) },
  ];

  // ----- Filter pills -----
  const filters: { key: Continent | null; label: string }[] = [
    { key: null, label: t("filterAll", lang) },
    ...CONTINENT_KEYS.map((c) => ({
      key: c as Continent,
      label: t(CONTINENT_FILTER_KEYS[c], lang),
    })),
  ];

  return (
    <Layout>
      <SEOHead
        title={t("seoTitle", lang)}
        description={t("seoDescription", lang)}
      />

      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-red-50/40 pt-20 pb-16 sm:pt-28 sm:pb-20">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #DC2626 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }} />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            {/* Badge */}
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600/10 px-4 py-1.5 text-sm font-semibold text-red-600 mb-6">
              <Flag className="h-4 w-4" />
              {t("badge", lang)}
            </span>

            {/* H1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-5 leading-[1.1]">
              {t("title", lang)}
            </h1>

            {/* Subtitle */}
            <p className="mx-auto max-w-2xl text-lg text-gray-500 leading-relaxed mb-10">
              {t("subtitle", lang)}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/10">
                    <s.icon className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== FILTERS + SEARCH ====== */}
      <section className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 space-y-4">
          {/* Continent pills */}
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const active = activeContinent === f.key;
              return (
                <button
                  key={f.label}
                  onClick={() => setActiveContinent(f.key)}
                  className={`
                    rounded-full px-4 py-2 text-sm font-medium transition-all duration-200
                    ${active
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-red-200 hover:text-gray-900"
                    }
                  `}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder", lang)}
              aria-label={t("searchPlaceholder", lang)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/60 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-red-300 focus:ring-2 focus:ring-red-600/10 focus:bg-white outline-none transition"
            />
          </div>
        </div>
      </section>

      {/* ====== COUNTRY CARDS ====== */}
      <section className="bg-gray-50/50 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {grouped.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-400 py-20 text-lg"
            >
              {t("noResults", lang)}
            </motion.p>
          )}

          {grouped.map(([continent, countries]) => (
            <motion.div
              key={continent}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeInUp}
              className="mb-14 last:mb-0"
            >
              {/* Continent header */}
              <div className="flex items-center gap-3 mb-6">
                <Layers className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  {t(CONTINENT_FILTER_KEYS[continent], lang)}
                </h2>
                <span className="text-sm text-gray-400 font-medium">
                  ({countries.length})
                </span>
              </div>

              {/* Cards grid */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {countries.map((country) => (
                  <motion.article
                    key={country.code}
                    variants={cardVariant}
                    whileHover={{ y: -4, scale: 1.01 }}
                    className="group relative bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:border-red-100 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      {/* Flag */}
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        <img
                          src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                          alt={country.name[lang] || country.name.fr}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Country name */}
                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-red-600 transition-colors truncate">
                          {country.name[lang] || country.name.fr}
                        </h3>

                        {/* Continent badge */}
                        <span className="inline-block mt-1 text-xs font-medium text-gray-400 bg-gray-50 rounded-full px-2.5 py-0.5">
                          {t(CONTINENT_FILTER_KEYS[country.continent], lang)}
                        </span>

                        {/* Rubrique count */}
                        <p className="mt-2.5 text-sm text-gray-500 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-gray-400" />
                          {country.rubriqueCount} {t("rubriques", lang)}
                        </p>

                        {/* Updated badge */}
                        {country.lastUpdated && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-0.5 font-medium">
                            <Clock className="h-3 w-3" />
                            {t("updatedOn", lang)} {formatDate(country.lastUpdated, lang)}
                          </span>
                        )}
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all mt-1 flex-shrink-0" />
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            </motion.div>
          ))}

          {/* ====== COMING SOON ====== */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeInUp}
            className="mt-16"
          >
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="h-5 w-5 text-gray-400" />
              <h2 className="text-xl font-bold text-gray-400">
                {t("comingSoon", lang)}
              </h2>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {COMING_SOON.map((country) => (
                <motion.div
                  key={country.code}
                  variants={cardVariant}
                  className="relative bg-white/60 rounded-2xl border border-dashed border-gray-200 p-5 opacity-60"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center grayscale">
                      <img
                        src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                        alt={country.name[lang] || country.name.fr}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-400 truncate">
                        {country.name[lang] || country.name.fr}
                      </h3>
                      <span className="inline-block mt-1 text-xs font-medium text-gray-300 bg-gray-50 rounded-full px-2.5 py-0.5">
                        {t(CONTINENT_FILTER_KEYS[country.continent], lang)}
                      </span>
                    </div>
                  </div>

                  {/* Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/40 backdrop-blur-[1px]">
                    <span className="rounded-full bg-gray-100 px-4 py-1.5 text-xs font-semibold text-gray-500 shadow-sm">
                      {t("comingSoon", lang)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ====== CTA BOTTOM ====== */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
        className="bg-white py-16 sm:py-20"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-10 sm:p-14 shadow-2xl">
            <Globe className="mx-auto h-10 w-10 text-red-500 mb-5" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              {t("ctaTitle", lang)}
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
              {t("ctaSubtitle", lang)}
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 hover:shadow-red-600/30 transition-all duration-200"
            >
              {t("ctaButton", lang)}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </motion.section>
    </Layout>
  );
};

export default FichesPays;
