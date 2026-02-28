/**
 * InfluencerDirectory - Public listing page for Influencers
 *
 * Public page (no auth required) listing all visible Influencers.
 * Dark/gradient design: red/orange/purple palette.
 * Firebase callable: getInfluencerDirectory (us-central1)
 */

import React, { useState, useEffect, useCallback } from "react";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import { httpsCallable } from "firebase/functions";
import { functionsAffiliate } from "@/config/firebase";
import {
  Search,
  Globe,
  Users,
  ChevronDown,
  X,
  Loader2,
  AlertCircle,
  Star,
  Megaphone,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type InfluencerPlatform =
  | "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok"
  | "youtube" | "whatsapp" | "telegram" | "snapchat" | "reddit"
  | "discord" | "blog" | "website" | "forum" | "podcast" | "newsletter" | "other";

interface PublicInfluencer {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  country: string;
  language: string;
  platforms: InfluencerPlatform[];
  bio?: string;
  communitySize?: number;
  communityNiche?: string;
}

interface DirectoryResponse {
  influencers: PublicInfluencer[];
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

const PLATFORMS: { code: InfluencerPlatform; label: string; emoji: string }[] = [
  { code: "facebook",    label: "Facebook",    emoji: "📘" },
  { code: "instagram",   label: "Instagram",   emoji: "📷" },
  { code: "youtube",     label: "YouTube",     emoji: "▶️" },
  { code: "tiktok",      label: "TikTok",      emoji: "🎵" },
  { code: "twitter",     label: "Twitter/X",   emoji: "🐦" },
  { code: "linkedin",    label: "LinkedIn",    emoji: "💼" },
  { code: "telegram",    label: "Telegram",    emoji: "✈️" },
  { code: "whatsapp",    label: "WhatsApp",    emoji: "💬" },
  { code: "blog",        label: "Blog",        emoji: "✍️" },
  { code: "podcast",     label: "Podcast",     emoji: "🎙️" },
  { code: "newsletter",  label: "Newsletter",  emoji: "📧" },
  { code: "youtube",     label: "YouTube",     emoji: "▶️" },
  { code: "discord",     label: "Discord",     emoji: "🎮" },
  { code: "website",     label: "Website",     emoji: "🌐" },
  { code: "other",       label: "Autre",       emoji: "🔗" },
];

const COUNTRIES: { code: string; name: string }[] = [
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
  { code: "CH", name: "Suisse" },
  { code: "CA", name: "Canada" },
  { code: "US", name: "États-Unis" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "DE", name: "Allemagne" },
  { code: "ES", name: "Espagne" },
  { code: "IT", name: "Italie" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Pays-Bas" },
  { code: "LU", name: "Luxembourg" },
  { code: "MA", name: "Maroc" },
  { code: "TN", name: "Tunisie" },
  { code: "DZ", name: "Algérie" },
  { code: "SN", name: "Sénégal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "CM", name: "Cameroun" },
  { code: "AE", name: "Émirats Arabes Unis" },
  { code: "SG", name: "Singapour" },
  { code: "AU", name: "Australie" },
  { code: "BR", name: "Brésil" },
  { code: "MX", name: "Mexique" },
  { code: "IN", name: "Inde" },
];

// ============================================================================
// HELPERS
// ============================================================================

function getFlagEmoji(code: string): string {
  const base = 0x1F1E6 - 65;
  const chars = code.toUpperCase().split("");
  if (chars.length !== 2) return "🌍";
  return (
    String.fromCodePoint(base + chars[0].charCodeAt(0)) +
    String.fromCodePoint(base + chars[1].charCodeAt(0))
  );
}

function getCountryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code.toUpperCase())?.name ?? code;
}

function formatCommunitySize(size: number): string {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)}M`;
  if (size >= 1_000) return `${(size / 1_000).toFixed(0)}k`;
  return size.toString();
}

function getInitials(firstName: string, lastName: string): string {
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

function getAvatarGradient(seed: string): string {
  const gradients = [
    "from-red-600 to-orange-700",
    "from-orange-600 to-amber-700",
    "from-pink-600 to-rose-700",
    "from-purple-600 to-violet-700",
    "from-rose-600 to-pink-700",
    "from-amber-600 to-yellow-700",
    "from-fuchsia-600 to-purple-700",
    "from-red-700 to-rose-800",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function getPlatformEmoji(platform: InfluencerPlatform): string {
  return PLATFORMS.find((p) => p.code === platform)?.emoji ?? "🔗";
}

function getPlatformLabel(platform: InfluencerPlatform): string {
  return PLATFORMS.find((p) => p.code === platform)?.label ?? platform;
}

// ============================================================================
// SKELETON CARD
// ============================================================================

const SkeletonCard: React.FC = () => (
  <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 animate-pulse">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-14 h-14 rounded-full bg-slate-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-slate-700 rounded w-1/2" />
      </div>
    </div>
    <div className="flex gap-2 mb-3">
      <div className="h-6 bg-slate-700 rounded-full w-20" />
      <div className="h-6 bg-slate-700 rounded-full w-16" />
      <div className="h-6 bg-slate-700 rounded-full w-24" />
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-slate-700 rounded w-full" />
      <div className="h-3 bg-slate-700 rounded w-4/5" />
    </div>
  </div>
);

// ============================================================================
// INFLUENCER CARD
// ============================================================================

interface InfluencerCardProps {
  influencer: PublicInfluencer;
}

const InfluencerCard: React.FC<InfluencerCardProps> = ({ influencer }) => {
  const [imgError, setImgError] = useState(false);
  const gradient  = getAvatarGradient(influencer.firstName + influencer.lastName);
  const flag      = getFlagEmoji(influencer.country);
  const country   = getCountryName(influencer.country);
  const langInfo  = LANGUAGES.find((l) => l.code === influencer.language);

  return (
    <div className="bg-slate-800/60 border border-slate-700/40 hover:border-red-500/50 rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 hover:bg-slate-800/80 hover:shadow-xl hover:shadow-red-500/10">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          {influencer.photoUrl && !imgError ? (
            <img
              src={influencer.photoUrl}
              alt={influencer.firstName + " " + influencer.lastName}
              className="w-14 h-14 rounded-full object-cover border-2 border-slate-600/50"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className={"w-14 h-14 rounded-full bg-gradient-to-br " + gradient + " flex items-center justify-center border-2 border-slate-600/50"}
            >
              <span className="text-white font-bold text-base">
                {getInitials(influencer.firstName, influencer.lastName)}
              </span>
            </div>
          )}
          {/* Language flag */}
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs leading-none select-none"
            title={langInfo?.label}
          >
            {langInfo?.flag ?? "🌍"}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base leading-tight truncate">
            {influencer.firstName} {influencer.lastName}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-lg leading-none">{flag}</span>
            <span className="text-slate-400 text-sm">{country}</span>
          </div>
          {influencer.communitySize && (
            <div className="flex items-center gap-1 mt-1">
              <Users className="w-3 h-3 text-red-400" />
              <span className="text-red-300 text-xs font-medium">
                {formatCommunitySize(influencer.communitySize)} abonnés
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Platforms */}
      {influencer.platforms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {influencer.platforms.slice(0, 5).map((p) => (
            <span
              key={p}
              title={getPlatformLabel(p)}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700/60 border border-slate-600/40 rounded-full text-xs text-slate-300"
            >
              <span className="text-sm leading-none">{getPlatformEmoji(p)}</span>
              <span className="hidden sm:inline">{getPlatformLabel(p)}</span>
            </span>
          ))}
          {influencer.platforms.length > 5 && (
            <span className="px-2 py-0.5 bg-slate-700/40 rounded-full text-xs text-slate-500">
              +{influencer.platforms.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Niche */}
      {influencer.communityNiche && (
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-slate-300 text-sm truncate">{influencer.communityNiche}</span>
        </div>
      )}

      {/* Bio */}
      {influencer.bio && (
        <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
          {influencer.bio}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// MAIN PAGE
// ============================================================================

const PAGE_SIZE = 20;

const InfluencerDirectory: React.FC = () => {
  const [influencers, setInfluencers] = useState<PublicInfluencer[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [hasMore, setHasMore]         = useState(false);
  const [page, setPage]               = useState(1);
  const [isPageVisible, setIsPageVisible] = useState(true);

  // Filters
  const [countryFilter,  setCountryFilter]  = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [search, setSearch]                 = useState("");
  const [searchInput, setSearchInput]       = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchInfluencers = useCallback(async (reset: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<unknown, DirectoryResponse>(
        functionsAffiliate,
        "getInfluencerDirectory"
      );
      const currentPage = reset ? 1 : page;
      const result = await fn({
        page: currentPage,
        limit: PAGE_SIZE,
        country:  countryFilter  || undefined,
        language: languageFilter || undefined,
        platform: platformFilter || undefined,
      });
      const data = result.data;

      setIsPageVisible(data.isPageVisible !== false);

      const incoming = data.influencers ?? [];
      if (reset) {
        setInfluencers(incoming);
        setPage(2);
      } else {
        setInfluencers((prev) => [...prev, ...incoming]);
        setPage((p) => p + 1);
      }
      setHasMore(incoming.length === PAGE_SIZE && data.total > (reset ? incoming.length : influencers.length + incoming.length));
    } catch (err) {
      console.error("[InfluencerDirectory] Error:", err);
      setError("Impossible de charger le répertoire. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  }, [countryFilter, languageFilter, platformFilter, page, influencers.length]);

  // Initial load + filter reset
  useEffect(() => {
    fetchInfluencers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryFilter, languageFilter, platformFilter, search]);

  // Client-side search filter
  const displayed = search
    ? influencers.filter((inf) =>
        (inf.firstName + " " + inf.lastName).toLowerCase().includes(search.toLowerCase()) ||
        inf.communityNiche?.toLowerCase().includes(search.toLowerCase()) ||
        inf.bio?.toLowerCase().includes(search.toLowerCase())
      )
    : influencers;

  const hasFilters = countryFilter || languageFilter || platformFilter || search;

  const clearFilters = () => {
    setCountryFilter("");
    setLanguageFilter("");
    setPlatformFilter("");
    setSearchInput("");
    setSearch("");
  };

  return (
    <>
      <SEOHead
        title="Nos Influenceurs Expat | SOS-Expat"
        description="Découvrez nos influenceurs partenaires spécialisés dans la communauté expatriée internationale."
      />
      <Layout>
        <div className="min-h-screen bg-slate-900">

          {/* HERO */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-red-950/30 to-slate-900 border-b border-slate-800/50">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl" />
            </div>
            <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-20 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-300 text-sm font-medium mb-6">
                <Megaphone className="w-4 h-4" />
                <span>Répertoire des Influenceurs</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                Nos <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Influenceurs</span> Partenaires
              </h1>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
                Découvrez les créateurs de contenu et influenceurs qui font partie de la communauté SOS-Expat.
              </p>
              <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-400" />
                  <span>{influencers.length > 0 ? `${influencers.length}+ influenceurs` : "Répertoire global"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-orange-400" />
                  <span>Présence mondiale</span>
                </div>
              </div>
            </div>
          </div>

          {/* FILTERS */}
          <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 shadow-lg shadow-slate-900/50">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher un influenceur..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                />
              </div>

              {/* Country */}
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 bg-slate-800/80 border border-slate-700/50 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 appearance-none cursor-pointer"
                >
                  <option value="">Tous les pays</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{getFlagEmoji(c.code)} {c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>

              {/* Language */}
              <div className="relative">
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="pl-4 pr-8 py-2 bg-slate-800/80 border border-slate-700/50 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 appearance-none cursor-pointer"
                >
                  <option value="">Toutes les langues</option>
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>

              {/* Platform */}
              <div className="relative">
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="pl-4 pr-8 py-2 bg-slate-800/80 border border-slate-700/50 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 appearance-none cursor-pointer"
                >
                  <option value="">Toutes les plateformes</option>
                  {PLATFORMS.filter((p, idx, arr) => arr.findIndex(x => x.code === p.code) === idx).map((p) => (
                    <option key={p.code} value={p.code}>{p.emoji} {p.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>

              {/* Clear */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-700/60 hover:bg-slate-700 border border-slate-600/40 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Effacer</span>
                </button>
              )}
            </div>
          </div>

          {/* CONTENT */}
          <div className="max-w-6xl mx-auto px-4 py-10">

            {/* Page hidden by admin */}
            {!isLoading && !error && !isPageVisible && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Globe className="w-12 h-12 text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">
                  Répertoire temporairement indisponible
                </h3>
                <p className="text-slate-500 max-w-md">
                  Cette page est momentanément hors ligne. Revenez bientôt.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Une erreur est survenue</h3>
                <p className="text-slate-400 mb-6">{error}</p>
                <button
                  onClick={() => fetchInfluencers(true)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Loading skeletons */}
            {isLoading && influencers.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* Grid */}
            {!error && isPageVisible && displayed.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayed.map((inf) => (
                  <InfluencerCard key={inf.id} influencer={inf} />
                ))}
              </div>
            )}

            {/* Empty */}
            {!isLoading && !error && isPageVisible && displayed.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Megaphone className="w-12 h-12 text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">
                  {hasFilters ? "Aucun influenceur trouvé" : "Aucun influenceur disponible"}
                </h3>
                <p className="text-slate-500 max-w-md">
                  {hasFilters
                    ? "Essayez d'autres filtres."
                    : "Le répertoire sera bientôt disponible."}
                </p>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors text-sm"
                  >
                    Effacer les filtres
                  </button>
                )}
              </div>
            )}

            {/* Load more */}
            {!isLoading && hasMore && !search && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => fetchInfluencers(false)}
                  className="flex items-center gap-2 px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 font-medium rounded-xl transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  Charger plus
                </button>
              </div>
            )}

            {/* Loading more spinner */}
            {isLoading && influencers.length > 0 && (
              <div className="mt-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-red-400" />
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default InfluencerDirectory;
