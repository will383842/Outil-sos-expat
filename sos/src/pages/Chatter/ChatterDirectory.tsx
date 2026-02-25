/**
 * ChatterDirectory - Public listing page for Chatters
 *
 * Public page (no auth required) listing all visible Chatters.
 * Dark/gradient design: red/orange palette.
 * Firebase callable: getChatterDirectory (us-central1)
 */

import React, { useState, useEffect, useCallback } from "react";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import { httpsCallable } from "firebase/functions";
import { functionsWest2 } from "@/config/firebase";
import {
  Search,
  Globe,
  Users,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type ChatterPlatform =
  | "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok"
  | "youtube" | "whatsapp" | "telegram" | "snapchat" | "reddit"
  | "discord" | "blog" | "website" | "forum" | "podcast" | "newsletter" | "other";

interface PublicChatter {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  country: string;
  language: string;
  platforms: ChatterPlatform[];
  bio?: string;
}

interface DirectoryResponse {
  chatters: PublicChatter[];
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
  { code: "it", label: "Italiano",   flag: "🇮🇹" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "zh", label: "中文",        flag: "🇨🇳" },
];

const PLATFORMS: { code: ChatterPlatform; label: string; emoji: string }[] = [
  { code: "facebook",    label: "Facebook",    emoji: "📘" },
  { code: "instagram",   label: "Instagram",   emoji: "📷" },
  { code: "youtube",     label: "YouTube",     emoji: "▶️" },
  { code: "tiktok",      label: "TikTok",      emoji: "🎵" },
  { code: "twitter",     label: "Twitter/X",   emoji: "🐦" },
  { code: "linkedin",    label: "LinkedIn",    emoji: "💼" },
  { code: "telegram",    label: "Telegram",    emoji: "✈️" },
  { code: "whatsapp",    label: "WhatsApp",    emoji: "💬" },
  { code: "discord",     label: "Discord",     emoji: "🎮" },
  { code: "snapchat",    label: "Snapchat",    emoji: "👻" },
  { code: "reddit",      label: "Reddit",      emoji: "🤖" },
  { code: "blog",        label: "Blog",        emoji: "✍️" },
  { code: "podcast",     label: "Podcast",     emoji: "🎙️" },
  { code: "newsletter",  label: "Newsletter",  emoji: "📧" },
  { code: "other",       label: "Autre",       emoji: "🌐" },
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

function getPlatformInfo(code: ChatterPlatform) {
  return PLATFORMS.find(p => p.code === code) ?? { code, label: code, emoji: "🌐" };
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

const ChatterDirectory: React.FC = () => {
  const [chatters, setChatters] = useState<PublicChatter[]>([]);
  const [filtered, setFiltered] = useState<PublicChatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPageVisible, setIsPageVisible] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<ChatterPlatform | "">("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<
        { country?: string; language?: string; platform?: string },
        DirectoryResponse
      >(functionsWest2, "getChatterDirectory");

      const params: { country?: string; language?: string; platform?: string } = {};
      if (selectedCountry) params.country = selectedCountry;
      if (selectedLanguage) params.language = selectedLanguage;
      if (selectedPlatform) params.platform = selectedPlatform;

      const result = await fn(params);
      setIsPageVisible(result.data.isPageVisible);
      setChatters(result.data.chatters);
      setFiltered(result.data.chatters);
    } catch (err) {
      console.error("[ChatterDirectory] Error:", err);
      setError("Impossible de charger le répertoire. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, selectedLanguage, selectedPlatform]);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Client-side search
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(chatters);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(chatters.filter(c =>
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.bio?.toLowerCase().includes(q)
    ));
  }, [search, chatters]);

  const hasActiveFilters = selectedCountry || selectedLanguage || selectedPlatform;

  const clearFilters = () => {
    setSelectedCountry("");
    setSelectedLanguage("");
    setSelectedPlatform("");
    setSearch("");
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Layout>
      <SEOHead
        title="Nos Chatters | SOS-Expat"
        description="Découvrez notre réseau de chatters — des experts qui recommandent SOS-Expat à leur communauté d'expatriés."
      />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-red-900 via-orange-900 to-red-800 text-white py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-red-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm mb-6">
            <MessageCircle className="w-4 h-4 text-red-300" />
            <span className="text-red-200">Réseau d&apos;ambassadeurs</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nos Chatters
          </h1>
          <p className="text-xl text-red-200 max-w-2xl mx-auto">
            Des ambassadeurs passionnés qui partagent SOS-Expat au sein de leurs communautés d&apos;expatriés.
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
                placeholder="Rechercher un chatter..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
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
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200"
              }`}
            >
              <Globe className="w-4 h-4" />
              Filtres
              {hasActiveFilters && (
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">
                  {[selectedCountry, selectedLanguage, selectedPlatform].filter(Boolean).length}
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
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Pays</label>
                <select
                  value={selectedCountry}
                  onChange={e => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
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
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                >
                  <option value="">Toutes les langues</option>
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Plateforme</label>
                <select
                  value={selectedPlatform}
                  onChange={e => setSelectedPlatform(e.target.value as ChatterPlatform | "")}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                >
                  <option value="">Toutes les plateformes</option>
                  {PLATFORMS.map(p => (
                    <option key={p.code} value={p.code}>{p.emoji} {p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Count */}
          {!loading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {filtered.length} chatter{filtered.length !== 1 ? "s" : ""} trouvé{filtered.length !== 1 ? "s" : ""}
              {search && ` pour "${search}"`}
            </p>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
              <button
                onClick={fetchDirectory}
                className="mt-4 px-5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {hasActiveFilters || search
                  ? "Aucun chatter ne correspond à vos critères."
                  : "Aucun chatter disponible pour le moment."}
              </p>
              {(hasActiveFilters || search) && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-red-600 hover:underline text-sm"
                >
                  Effacer les filtres
                </button>
              )}
            </div>
          )}

          {/* Grid */}
          {!loading && !error && filtered.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(chatter => {
                const langInfo = getLanguageInfo(chatter.language);
                const countryFlag = getCountryFlag(chatter.country);

                return (
                  <div
                    key={chatter.id}
                    className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-md hover:shadow-lg transition-all overflow-hidden"
                  >
                    {/* Top gradient bar */}
                    <div className="h-1.5 bg-gradient-to-r from-red-500 to-orange-500" />

                    <div className="p-5">
                      {/* Avatar + Name */}
                      <div className="flex items-start gap-4 mb-4">
                        {chatter.photoUrl ? (
                          <img
                            src={chatter.photoUrl}
                            alt={`${chatter.firstName} ${chatter.lastName}`}
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-red-500/30 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {getInitials(chatter.firstName, chatter.lastName)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {chatter.firstName} {chatter.lastName}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>{countryFlag}</span>
                            <span>{langInfo ? `${langInfo.flag} ${langInfo.label}` : chatter.language}</span>
                          </div>
                        </div>
                      </div>

                      {/* Platform badges */}
                      {chatter.platforms.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {chatter.platforms.slice(0, 5).map(platform => {
                            const info = getPlatformInfo(platform);
                            return (
                              <span
                                key={platform}
                                className="inline-flex items-center gap-0.5 text-xs px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full"
                                title={info.label}
                              >
                                <span>{info.emoji}</span>
                                <span>{info.label}</span>
                              </span>
                            );
                          })}
                          {chatter.platforms.length > 5 && (
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-full">
                              +{chatter.platforms.length - 5}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bio */}
                      {chatter.bio && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {chatter.bio}
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

export default ChatterDirectory;
