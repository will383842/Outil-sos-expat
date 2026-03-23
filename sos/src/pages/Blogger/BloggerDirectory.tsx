/**
 * BloggerDirectory - Public listing page for Bloggers
 *
 * Public page (no auth required) listing all visible Bloggers.
 * Dark/gradient design: purple/indigo palette.
 * Firebase callable: getBloggerDirectory (us-central1)
 */

import React, { useState, useEffect, useCallback } from "react";
import { useIntl } from "react-intl";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import { httpsCallable } from "firebase/functions";
import { functionsAffiliate } from "@/config/firebase";
import {
  Search,
  Globe,
  FileText,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  PenTool,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type BlogTheme =
  | "expatriation" | "travel" | "legal" | "finance" | "lifestyle"
  | "tech" | "family" | "career" | "education" | "other";

type BlogTrafficTier =
  | "lt1k" | "1k-5k" | "5k-10k" | "10k-50k" | "50k-100k" | "gt100k";

interface PublicBlogger {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  country: string;
  language: string;
  blogName: string;
  blogUrl: string;
  blogTheme: BlogTheme;
  blogTraffic: BlogTrafficTier;
  blogLanguage: string;
  blogCountry: string;
  bio?: string;
  blogDescription?: string;
}

interface DirectoryResponse {
  bloggers: PublicBlogger[];
  total: number;
  isPageVisible: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LANGUAGES: { code: string; label: string; flag: string }[] = [
  { code: "fr", label: "Français",   flag: "🇫🇷" },
  { code: "en", label: "English",    flag: "🇬🇧" },
  { code: "es", label: "Español",    flag: "🇪🇸" },
  { code: "pt", label: "Português",  flag: "🇵🇹" },
  { code: "ar", label: "عربي",       flag: "🇸🇦" },
  { code: "de", label: "Deutsch",    flag: "🇩🇪" },
  { code: "zh", label: "中文",        flag: "🇨🇳" },
  { code: "ru", label: "Русский",    flag: "🇷🇺" },
  { code: "hi", label: "हिन्दी",      flag: "🇮🇳" },
];

const BLOG_THEMES: { code: BlogTheme; label: string; emoji: string }[] = [
  { code: "expatriation", label: "Expatriation", emoji: "✈️" },
  { code: "travel",       label: "Voyage",        emoji: "🌍" },
  { code: "legal",        label: "Juridique",     emoji: "⚖️" },
  { code: "finance",      label: "Finance",       emoji: "💰" },
  { code: "lifestyle",    label: "Lifestyle",     emoji: "🌟" },
  { code: "tech",         label: "Tech",          emoji: "💻" },
  { code: "family",       label: "Famille",       emoji: "👨‍👩‍👧" },
  { code: "career",       label: "Carrière",      emoji: "💼" },
  { code: "education",    label: "Éducation",     emoji: "📚" },
  { code: "other",        label: "Autre",         emoji: "📌" },
];

const TRAFFIC_TIERS: { code: BlogTrafficTier; label: string }[] = [
  { code: "lt1k",     label: "< 1K visiteurs/mois" },
  { code: "1k-5k",   label: "1K – 5K/mois" },
  { code: "5k-10k",  label: "5K – 10K/mois" },
  { code: "10k-50k", label: "10K – 50K/mois" },
  { code: "50k-100k", label: "50K – 100K/mois" },
  { code: "gt100k",  label: "> 100K visiteurs/mois" },
];

const COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: "FR", name: "France",         flag: "🇫🇷" },
  { code: "BE", name: "Belgique",       flag: "🇧🇪" },
  { code: "CH", name: "Suisse",         flag: "🇨🇭" },
  { code: "CA", name: "Canada",         flag: "🇨🇦" },
  { code: "MA", name: "Maroc",          flag: "🇲🇦" },
  { code: "DZ", name: "Algérie",        flag: "🇩🇿" },
  { code: "TN", name: "Tunisie",        flag: "🇹🇳" },
  { code: "SN", name: "Sénégal",        flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire",  flag: "🇨🇮" },
  { code: "GB", name: "Royaume-Uni",    flag: "🇬🇧" },
  { code: "DE", name: "Allemagne",      flag: "🇩🇪" },
  { code: "ES", name: "Espagne",        flag: "🇪🇸" },
  { code: "IT", name: "Italie",         flag: "🇮🇹" },
  { code: "PT", name: "Portugal",       flag: "🇵🇹" },
  { code: "US", name: "États-Unis",     flag: "🇺🇸" },
  { code: "BR", name: "Brésil",         flag: "🇧🇷" },
  { code: "AE", name: "Émirats Arabes", flag: "🇦🇪" },
];

// ============================================================================
// HELPERS
// ============================================================================

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function getThemeInfo(theme: BlogTheme) {
  return BLOG_THEMES.find(t => t.code === theme) ?? { code: theme, label: theme, emoji: "📌" };
}

function getTrafficLabel(traffic: BlogTrafficTier) {
  return TRAFFIC_TIERS.find(t => t.code === traffic)?.label ?? traffic;
}

function getCountryFlag(countryCode: string) {
  return COUNTRIES.find(c => c.code === countryCode)?.flag ?? "🌐";
}

function getLanguageInfo(langCode: string) {
  return LANGUAGES.find(l => l.code === langCode);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BloggerDirectory: React.FC = () => {
  const intl = useIntl();
  const [bloggers, setBloggers] = useState<PublicBlogger[]>([]);
  const [filtered, setFiltered] = useState<PublicBlogger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPageVisible, setIsPageVisible] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<BlogTheme | "">("");
  const [selectedTraffic, setSelectedTraffic] = useState<BlogTrafficTier | "">("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<
        { country?: string; language?: string; blogTheme?: BlogTheme; blogTraffic?: BlogTrafficTier },
        DirectoryResponse
      >(functionsAffiliate, "getBloggerDirectory");

      const params: { country?: string; language?: string; blogTheme?: BlogTheme; blogTraffic?: BlogTrafficTier } = {};
      if (selectedCountry) params.country = selectedCountry;
      if (selectedLanguage) params.language = selectedLanguage;
      if (selectedTheme) params.blogTheme = selectedTheme;
      if (selectedTraffic) params.blogTraffic = selectedTraffic;

      const result = await fn(params);
      setIsPageVisible(result.data.isPageVisible);
      setBloggers(result.data.bloggers);
      setFiltered(result.data.bloggers);
    } catch (err) {
      console.error("[BloggerDirectory] Error:", err);
      setError("Impossible de charger le répertoire. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, selectedLanguage, selectedTheme, selectedTraffic]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Client-side search
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(bloggers);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(bloggers.filter(b =>
      b.firstName.toLowerCase().includes(q) ||
      b.lastName.toLowerCase().includes(q) ||
      b.blogName.toLowerCase().includes(q) ||
      b.blogDescription?.toLowerCase().includes(q) ||
      b.bio?.toLowerCase().includes(q)
    ));
  }, [search, bloggers]);

  const hasActiveFilters = selectedCountry || selectedLanguage || selectedTheme || selectedTraffic;

  const clearFilters = () => {
    setSelectedCountry("");
    setSelectedLanguage("");
    setSelectedTheme("");
    setSelectedTraffic("");
    setSearch("");
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Layout>
      <SEOHead
        title={intl.formatMessage({ id: 'directory.bloggers.seo.title', defaultMessage: 'Our Partner Bloggers | SOS-Expat' })}
        description={intl.formatMessage({ id: 'directory.bloggers.seo.description', defaultMessage: 'Discover our network of bloggers specialized in expatriation, travel and life abroad.' })}
      />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-purple-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm mb-6">
            <PenTool className="w-4 h-4 text-purple-300" />
            <span className="text-purple-200">Réseau de blogueurs</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nos Blogueurs Partenaires
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Découvrez notre réseau de blogueurs spécialisés dans l&apos;expatriation et la vie à l&apos;étranger.
          </p>
        </div>
      </div>

      {/* Not visible state */}
      {!isPageVisible && !loading && (
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Répertoire temporairement indisponible
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Cette page sera bientôt disponible. Revenez plus tard.
          </p>
        </div>
      )}

      {/* Content */}
      {isPageVisible && (
        <div className="max-w-7xl mx-auto px-4 py-10">
          {/* Search + filter bar */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un blogueur, un blog..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl border font-medium transition-all ${
                hasActiveFilters
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200"
              }`}
            >
              <Globe className="w-4 h-4" />
              Filtres
              {hasActiveFilters && (
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">
                  {[selectedCountry, selectedLanguage, selectedTheme, selectedTraffic].filter(Boolean).length}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
                Effacer
              </button>
            )}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Pays</label>
                <select
                  value={selectedCountry}
                  onChange={e => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                >
                  <option value="">Tous les pays</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Langue</label>
                <select
                  value={selectedLanguage}
                  onChange={e => setSelectedLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                >
                  <option value="">Toutes les langues</option>
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Thématique</label>
                <select
                  value={selectedTheme}
                  onChange={e => setSelectedTheme(e.target.value as BlogTheme | "")}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                >
                  <option value="">Toutes les thématiques</option>
                  {BLOG_THEMES.map(t => (
                    <option key={t.code} value={t.code}>{t.emoji} {t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Trafic</label>
                <select
                  value={selectedTraffic}
                  onChange={e => setSelectedTraffic(e.target.value as BlogTrafficTier | "")}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                >
                  <option value="">Tout trafic</option>
                  {TRAFFIC_TIERS.map(t => (
                    <option key={t.code} value={t.code}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Count */}
          {!loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {filtered.length} blogueur{filtered.length !== 1 ? "s" : ""} trouvé{filtered.length !== 1 ? "s" : ""}
              {search && ` pour "${search}"`}
            </p>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
              <button
                onClick={fetchDirectory}
                className="mt-4 px-5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {hasActiveFilters || search
                  ? "Aucun blogueur ne correspond à vos critères."
                  : "Aucun blogueur disponible pour le moment."}
              </p>
              {(hasActiveFilters || search) && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-purple-600 hover:underline text-sm"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          )}

          {/* Grid */}
          {!loading && !error && filtered.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(blogger => {
                const themeInfo = getThemeInfo(blogger.blogTheme);
                const langInfo = getLanguageInfo(blogger.language);
                const countryFlag = getCountryFlag(blogger.country);
                const description = blogger.blogDescription || blogger.bio;

                return (
                  <div
                    key={blogger.id}
                    className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-md hover:shadow-lg transition-all overflow-hidden"
                  >
                    {/* Top gradient bar */}
                    <div className="h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500" />

                    <div className="p-5">
                      {/* Avatar + Name */}
                      <div className="flex items-start gap-4 mb-4">
                        {blogger.photoUrl ? (
                          <img
                            src={blogger.photoUrl}
                            alt={`${blogger.firstName} ${blogger.lastName}`}
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-purple-500/30 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {getInitials(blogger.firstName, blogger.lastName)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {blogger.firstName} {blogger.lastName}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>{countryFlag}</span>
                            <span>{langInfo ? `${langInfo.flag} ${langInfo.label}` : blogger.language}</span>
                          </div>
                        </div>
                      </div>

                      {/* Blog link */}
                      <div className="mb-3">
                        <a
                          href={blogger.blogUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium hover:underline truncate text-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{blogger.blogName}</span>
                        </a>
                      </div>

                      {/* Theme + Traffic badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                          {themeInfo.emoji} {themeInfo.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
                          📊 {getTrafficLabel(blogger.blogTraffic)}
                        </span>
                      </div>

                      {/* Description */}
                      {description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default BloggerDirectory;
