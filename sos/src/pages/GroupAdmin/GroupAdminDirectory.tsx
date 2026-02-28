/**
 * GroupAdminDirectory - Public listing page for Group Admins / Expat Communities
 *
 * Public page (no auth required) listing all visible Group Admins.
 * Dark/gradient design: slate/indigo/emerald palette.
 * Firebase callable: getGroupAdminDirectory (us-central1)
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import { httpsCallable } from "firebase/functions";
import { functionsAffiliate } from "@/config/firebase";
import {
  Search,
  Globe,
  Users,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  X,
  Loader2,
  MapPin,
  AlertCircle,
} from "lucide-react";
import {
  type GroupType,
  type GroupSizeTier,
  type SupportedGroupAdminLanguage,
  GROUP_TYPE_LABELS,
  GROUP_SIZE_LABELS,
} from "@/types/groupAdmin";

// ============================================================================
// TYPES
// ============================================================================

interface PublicGroupAdmin {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  groupName: string;
  groupType: GroupType;
  groupSize: GroupSizeTier;
  groupCountry: string;
  groupLanguage: SupportedGroupAdminLanguage;
  groupUrl: string;
  groupDescription?: string;
  isGroupVerified: boolean;
  country: string;
  language: SupportedGroupAdminLanguage;
}

interface DirectoryResponse {
  groupAdmins: PublicGroupAdmin[];
  total: number;
  isPageVisible: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LANGUAGES: { code: SupportedGroupAdminLanguage; label: string; countryCode: string }[] = [
  { code: "fr", label: "Francais",   countryCode: "FR" },
  { code: "en", label: "English",    countryCode: "GB" },
  { code: "es", label: "Espanol",    countryCode: "ES" },
  { code: "pt", label: "Portugues",  countryCode: "PT" },
  { code: "ar", label: "Arabe",      countryCode: "SA" },
  { code: "de", label: "Deutsch",    countryCode: "DE" },
  { code: "it", label: "Italiano",   countryCode: "IT" },
  { code: "nl", label: "Nederlands", countryCode: "NL" },
  { code: "zh", label: "Chinois",    countryCode: "CN" },
];

const COUNTRIES: { code: string; name: string }[] = [
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
  { code: "CH", name: "Suisse" },
  { code: "CA", name: "Canada" },
  { code: "US", name: "Etats-Unis" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "DE", name: "Allemagne" },
  { code: "ES", name: "Espagne" },
  { code: "IT", name: "Italie" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Pays-Bas" },
  { code: "LU", name: "Luxembourg" },
  { code: "AE", name: "Emirats Arabes Unis" },
  { code: "MA", name: "Maroc" },
  { code: "TN", name: "Tunisie" },
  { code: "DZ", name: "Algerie" },
  { code: "SN", name: "Senegal" },
  { code: "CI", name: "Cote d Ivoire" },
  { code: "CM", name: "Cameroun" },
  { code: "MG", name: "Madagascar" },
  { code: "MU", name: "Maurice" },
  { code: "SG", name: "Singapour" },
  { code: "AU", name: "Australie" },
  { code: "NZ", name: "Nouvelle-Zelande" },
  { code: "JP", name: "Japon" },
  { code: "TH", name: "Thailande" },
  { code: "VN", name: "Vietnam" },
  { code: "BR", name: "Bresil" },
  { code: "AR", name: "Argentine" },
  { code: "MX", name: "Mexique" },
  { code: "ZA", name: "Afrique du Sud" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "QA", name: "Qatar" },
  { code: "SA", name: "Arabie Saoudite" },
  { code: "RE", name: "La Reunion" },
  { code: "GP", name: "Guadeloupe" },
  { code: "MQ", name: "Martinique" },
  { code: "NC", name: "Nouvelle-Caledonie" },
  { code: "PF", name: "Polynesie Francaise" },
  { code: "GF", name: "Guyane" },
  { code: "IN", name: "Inde" },
  { code: "CN", name: "Chine" },
  { code: "HK", name: "Hong Kong" },
  { code: "LB", name: "Liban" },
  { code: "SE", name: "Suede" },
  { code: "NO", name: "Norvege" },
  { code: "DK", name: "Danemark" },
  { code: "FI", name: "Finlande" },
  { code: "PL", name: "Pologne" },
];

// Group type color mapping
const GROUP_TYPE_COLORS: Record<GroupType, { bg: string; text: string; border: string }> = {
  expat:            { bg: "bg-indigo-500/20",  text: "text-indigo-300",  border: "border-indigo-500/40" },
  travel:           { bg: "bg-sky-500/20",     text: "text-sky-300",     border: "border-sky-500/40" },
  digital_nomad:    { bg: "bg-violet-500/20",  text: "text-violet-300",  border: "border-violet-500/40" },
  immigration:      { bg: "bg-amber-500/20",   text: "text-amber-300",   border: "border-amber-500/40" },
  relocation:       { bg: "bg-orange-500/20",  text: "text-orange-300",  border: "border-orange-500/40" },
  language:         { bg: "bg-teal-500/20",    text: "text-teal-300",    border: "border-teal-500/40" },
  country_specific: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/40" },
  profession:       { bg: "bg-blue-500/20",    text: "text-blue-300",    border: "border-blue-500/40" },
  family:           { bg: "bg-pink-500/20",    text: "text-pink-300",    border: "border-pink-500/40" },
  student:          { bg: "bg-lime-500/20",    text: "text-lime-300",    border: "border-lime-500/40" },
  retirement:       { bg: "bg-yellow-500/20",  text: "text-yellow-300",  border: "border-yellow-500/40" },
  affiliation:      { bg: "bg-purple-500/20",  text: "text-purple-300",  border: "border-purple-500/40" },
  press:            { bg: "bg-red-500/20",     text: "text-red-300",     border: "border-red-500/40" },
  media:            { bg: "bg-rose-500/20",    text: "text-rose-300",    border: "border-rose-500/40" },
  lawyers:          { bg: "bg-slate-500/20",   text: "text-slate-300",   border: "border-slate-500/40" },
  translators:      { bg: "bg-cyan-500/20",    text: "text-cyan-300",    border: "border-cyan-500/40" },
  movers:           { bg: "bg-stone-500/20",   text: "text-stone-300",   border: "border-stone-500/40" },
  real_estate:      { bg: "bg-green-500/20",   text: "text-green-300",   border: "border-green-500/40" },
  insurance:        { bg: "bg-blue-600/20",    text: "text-blue-200",    border: "border-blue-600/40" },
  finance:          { bg: "bg-emerald-600/20", text: "text-emerald-200", border: "border-emerald-600/40" },
  healthcare:       { bg: "bg-red-600/20",     text: "text-red-200",     border: "border-red-600/40" },
  education:        { bg: "bg-indigo-600/20",  text: "text-indigo-200",  border: "border-indigo-600/40" },
  other:            { bg: "bg-slate-600/20",   text: "text-slate-400",   border: "border-slate-600/40" },
};

// ============================================================================
// HELPERS
// ============================================================================

/** Convert ISO 3166-1 alpha-2 code to flag emoji */
function getFlagEmoji(countryCode: string): string {
  const base = 0x1F1E6 - 65;
  const chars = countryCode.toUpperCase().split("");
  if (chars.length !== 2) return String.fromCodePoint(0x1F30D);
  return (
    String.fromCodePoint(base + chars[0].charCodeAt(0)) +
    String.fromCodePoint(base + chars[1].charCodeAt(0))
  );
}

function getCountryInfo(code: string): { name: string; flag: string } {
  const upper = code.toUpperCase();
  const found = COUNTRIES.find((c) => c.code === upper);
  return { name: found ? found.name : code, flag: getFlagEmoji(upper) };
}

function getLanguageLabel(code: SupportedGroupAdminLanguage): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

function getLanguageFlag(code: SupportedGroupAdminLanguage): string {
  const lang = LANGUAGES.find((l) => l.code === code);
  return lang ? getFlagEmoji(lang.countryCode) : getFlagEmoji("UN");
}

function getInitials(firstName: string, lastName: string): string {
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

/** Deterministic avatar gradient from a seed string */
function getAvatarGradient(seed: string): string {
  const gradients = [
    "from-indigo-600 to-purple-700",
    "from-emerald-600 to-teal-700",
    "from-blue-600 to-indigo-700",
    "from-violet-600 to-purple-700",
    "from-sky-600 to-blue-700",
    "from-teal-600 to-emerald-700",
    "from-rose-600 to-pink-700",
    "from-amber-600 to-orange-700",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
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
      <div className="h-6 bg-slate-700 rounded-full w-24" />
      <div className="h-6 bg-slate-700 rounded-full w-20" />
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-slate-700 rounded w-full" />
      <div className="h-3 bg-slate-700 rounded w-5/6" />
    </div>
    <div className="h-10 bg-slate-700 rounded-xl w-full" />
  </div>
);

// ============================================================================
// GROUP ADMIN CARD
// ============================================================================

interface GroupAdminCardProps {
  group: PublicGroupAdmin;
}

const GroupAdminCard: React.FC<GroupAdminCardProps> = ({ group }) => {
  const [imgError, setImgError] = useState(false);
  const info      = getCountryInfo(group.groupCountry);
  const colors    = GROUP_TYPE_COLORS[group.groupType] ?? GROUP_TYPE_COLORS.other;
  const typeLabel = GROUP_TYPE_LABELS[group.groupType]?.fr ?? group.groupType;
  const sizeLabel = GROUP_SIZE_LABELS[group.groupSize] ?? group.groupSize;
  const langLabel = getLanguageLabel(group.groupLanguage);
  const langFlag  = getLanguageFlag(group.groupLanguage);
  const gradient  = getAvatarGradient(group.groupName);

  return (
    <div className="group/card bg-slate-800/60 border border-slate-700/40 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 hover:bg-slate-800/80 hover:shadow-xl hover:shadow-indigo-500/10">

      {/* Header: avatar + name */}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          {group.photoUrl && !imgError ? (
            <img
              src={group.photoUrl}
              alt={group.firstName + " " + group.lastName}
              className="w-14 h-14 rounded-full object-cover border-2 border-slate-600/50"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className={"w-14 h-14 rounded-full bg-gradient-to-br " + gradient + " flex items-center justify-center border-2 border-slate-600/50"}
            >
              <span className="text-white font-bold text-base">
                {getInitials(group.firstName, group.lastName)}
              </span>
            </div>
          )}
          {/* Language flag indicator */}
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs leading-none select-none"
            title={langLabel}
          >
            {langFlag}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-white font-semibold text-base leading-tight truncate flex-1">
              {group.groupName}
            </h3>
            {group.isGroupVerified && (
              <CheckCircle
                className="w-4 h-4 text-emerald-400 flex-shrink-0"
                aria-label="Groupe verifie"
              />
            )}
          </div>
          <p className="text-slate-400 text-sm mt-0.5 truncate">
            par {group.firstName} {group.lastName}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className={
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border " +
            colors.bg + " " + colors.text + " " + colors.border
          }
        >
          {typeLabel}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/60 text-slate-300 border border-slate-600/50">
          <Users className="w-3 h-3" />
          {sizeLabel}
        </span>
        {group.isGroupVerified && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" />
            Verifie
          </span>
        )}
      </div>

      {/* Location + Language */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="truncate">{info.flag} {info.name}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          {langLabel}
        </span>
      </div>

      {/* Description */}
      {group.groupDescription && (
        <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
          {group.groupDescription}
        </p>
      )}

      {/* CTA */}
      <a
        href={group.groupUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 hover:border-indigo-400/60 text-indigo-300 hover:text-indigo-200 text-sm font-medium transition-all duration-200"
      >
        Voir le groupe
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
};

// ============================================================================
// CUSTOM SELECT FIELD
// ============================================================================

interface SelectFieldProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  icon?: React.ReactNode;
  className?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  value,
  onChange,
  options,
  placeholder,
  icon,
  className = "",
}) => (
  <div className={"relative " + className}>
    {icon && (
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        {icon}
      </span>
    )}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={
        "w-full appearance-none bg-slate-800/80 border border-slate-600/60 hover:border-slate-500/80 " +
        "text-slate-200 rounded-xl py-2.5 pr-9 text-sm transition-colors " +
        "focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/60 " +
        (icon ? "pl-9" : "pl-3")
      }
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
  </div>
);

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

const GroupAdminDirectory: React.FC = () => {
  // Filters
  const [searchTerm,       setSearchTerm]       = useState("");
  const [selectedCountry,  setSelectedCountry]  = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");

  // Data state
  const [groups,        setGroups]        = useState<PublicGroupAdmin[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [hasMore,       setHasMore]       = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);

  // Debounced search (350 ms)
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Fetch groups from Firebase
  const fetchGroups = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const fn = httpsCallable<
          {
            country?: string;
            language?: string;
            search?: string;
            page: number;
            limit: number;
          },
          DirectoryResponse
        >(functionsAffiliate, "getGroupAdminDirectory");

        const pageToFetch = reset ? 1 : currentPage;

        const result = await fn({
          country:  selectedCountry  || undefined,
          language: (selectedLanguage as SupportedGroupAdminLanguage) || undefined,
          search:   debouncedSearch  || undefined,
          page:     pageToFetch,
          limit:    20,
        });

        const data = result.data;

        // Gérer la visibilité globale de la page (contrôlée par l'admin)
        setIsPageVisible(data.isPageVisible !== false);

        const incoming = data.groupAdmins ?? [];

        if (reset) {
          setGroups(incoming);
          setCurrentPage(2);
        } else {
          setGroups((prev) => [...prev, ...incoming]);
          setCurrentPage((p) => p + 1);
        }
        // hasMore = il reste des résultats à charger
        setHasMore(incoming.length === 20 && data.total > (reset ? incoming.length : groups.length + incoming.length));
      } catch (err) {
        console.error("[GroupAdminDirectory] fetch error:", err);
        setError("Impossible de charger les groupes. Veuillez reessayer.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCountry, selectedLanguage, debouncedSearch, currentPage],
  );

  // Re-fetch whenever filters change
  useEffect(() => {
    fetchGroups(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, selectedLanguage, debouncedSearch]);

  const hasActiveFilters =
    selectedCountry !== "" || selectedLanguage !== "" || searchTerm !== "";

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCountry("");
    setSelectedLanguage("");
  };

  // Group results by country, sorted alphabetically
  const groupedByCountry = useMemo(() => {
    const map = new Map<string, PublicGroupAdmin[]>();
    for (const g of groups) {
      const key = g.groupCountry || "OTHER";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      getCountryInfo(a).name.localeCompare(getCountryInfo(b).name, "fr"),
    );
  }, [groups]);

  // Memoized select options
  const countryOptions = useMemo(
    () =>
      COUNTRIES.map((c) => ({
        value: c.code,
        label: getFlagEmoji(c.code) + " " + c.name,
      })),
    [],
  );

  const languageOptions = useMemo(
    () =>
      LANGUAGES.map((l) => ({
        value: l.code,
        label: getFlagEmoji(l.countryCode) + " " + l.label,
      })),
    [],
  );

  return (
    <Layout>
      <SEOHead
        title="Groupes et Communautes Expatries | SOS Expat"
        description="Decouvrez des groupes et communautes d expatries du monde entier. Trouvez votre communaute selon votre pays, langue et centres d interet."
        keywords="groupes expatries, communaute expat, Facebook groupe expatrie, reseau international"
      />

      {/* ================================================================ */}
      {/* HERO SECTION */}
      {/* ================================================================ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute -top-20 right-1/3 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-20 w-64 h-64 bg-emerald-600/8 rounded-full blur-3xl" />
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)," +
                "linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
          {/* Category tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-6">
            <Globe className="w-4 h-4" />
            Communautes Expatries
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight">
            Groupes &amp;{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent">
              Communautes
            </span>
            {" "}Expatries
          </h1>

          <p className="text-slate-300 text-lg sm:text-xl max-w-2xl mx-auto mb-2 leading-relaxed">
            Trouvez votre communaute selon votre pays, votre langue et vos centres d interet.
          </p>
          <p className="text-slate-500 text-sm">
            Groupes verifies et moderes par nos administrateurs partenaires.
          </p>

          {/* Live count badge */}
          {!isLoading && !error && groups.length > 0 && (
            <div className="mt-8 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-800/70 border border-slate-700/60 text-slate-300 text-sm">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>
                <strong className="text-white font-semibold">{groups.length}</strong>
                {" "}groupe{groups.length > 1 ? "s" : ""} disponible{groups.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Wave separator */}
        <div className="relative z-10 w-full leading-none">
          <svg
            viewBox="0 0 1440 48"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full block"
            style={{ height: "48px" }}
            preserveAspectRatio="none"
          >
            <path d="M0 48 L0 24 Q360 0 720 24 Q1080 48 1440 16 L1440 48 Z" fill="#020617" />
          </svg>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MAIN CONTENT */}
      {/* ================================================================ */}
      <div className="bg-slate-950 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Filter bar (sticky) */}
          <div className="sticky top-0 z-20 mb-8">
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-2xl p-4 shadow-2xl shadow-black/40">
              <div className="flex flex-col sm:flex-row gap-3">

                {/* Search input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Rechercher un groupe..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-600/60 hover:border-slate-500/80 focus:border-indigo-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors"
                  />
                </div>

                {/* Country filter */}
                <SelectField
                  value={selectedCountry}
                  onChange={setSelectedCountry}
                  options={countryOptions}
                  placeholder="Tous les pays"
                  icon={<MapPin className="w-4 h-4" />}
                  className="sm:w-52"
                />

                {/* Language filter */}
                <SelectField
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                  options={languageOptions}
                  placeholder="Toutes les langues"
                  icon={<Globe className="w-4 h-4" />}
                  className="sm:w-48"
                />

                {/* Clear filters button */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 text-slate-300 hover:text-white text-sm font-medium transition-all duration-200 whitespace-nowrap"
                  >
                    <X className="w-4 h-4" />
                    Effacer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Page masquée par l'admin */}
          {!isLoading && !error && !isPageVisible && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-700/60 flex items-center justify-center mb-4">
                <Globe className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">Répertoire temporairement indisponible</h3>
              <p className="text-slate-400 text-sm max-w-sm">
                Cette page est momentanément hors ligne. Revenez bientôt.
              </p>
            </div>
          )}

          {/* Loading skeletons */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">Une erreur est survenue</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-sm">{error}</p>
              <button
                onClick={() => fetchGroups(true)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                Reessayer
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && groups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700/50 flex items-center justify-center mb-6">
                <Users className="w-9 h-9 text-slate-500" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-3">Aucun groupe trouve</h3>
              <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
                {hasActiveFilters
                  ? "Aucun groupe ne correspond a vos criteres. Modifiez ou supprimez vos filtres."
                  : "Aucun groupe n est encore disponible. Revenez bientot !"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-indigo-200 text-sm font-medium transition-all"
                >
                  <X className="w-4 h-4" />
                  Effacer les filtres
                </button>
              )}
            </div>
          )}

          {/* Groups grouped by country */}
          {!isLoading && !error && groups.length > 0 && (
            <div className="space-y-12">
              {groupedByCountry.map(([countryCode, countryGroups]) => {
                const cInfo = getCountryInfo(countryCode);
                return (
                  <section key={countryCode}>
                    {/* Country heading */}
                    <div className="flex items-center gap-3 mb-5">
                      <span className="text-2xl leading-none select-none" aria-hidden="true">
                        {cInfo.flag}
                      </span>
                      <h2 className="text-white font-semibold text-xl">{cInfo.name}</h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-slate-400 text-xs font-medium">
                        {countryGroups.length} groupe{countryGroups.length > 1 ? "s" : ""}
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-slate-700/60 to-transparent" />
                    </div>

                    {/* Cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {countryGroups.map((group) => (
                        <GroupAdminCard key={group.id} group={group} />
                      ))}
                    </div>
                  </section>
                );
              })}

              {/* Load more button */}
              {hasMore && (
                <div className="flex justify-center pt-4 pb-8">
                  <button
                    onClick={() => fetchGroups(false)}
                    disabled={isLoadingMore}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 hover:border-slate-600 text-slate-300 hover:text-white text-sm font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        Voir plus de groupes
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ============================================================== */}
        {/* FOOTER CTA - Become a Group Admin partner */}
        {/* ============================================================== */}
        <div className="border-t border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 mt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-6">
              <Users className="w-4 h-4" />
              Vous administrez un groupe ?
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Rejoignez notre reseau de{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                partenaires
              </span>
            </h2>

            <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Vous gerez un groupe Facebook ou une communaute d expatries ? Rejoignez notre programme
              et gagnez des commissions en aidant votre communaute a acceder a nos services d assistance.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/group-admin/inscription"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-all duration-200 hover:shadow-lg hover:shadow-indigo-600/30"
              >
                Devenir partenaire
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="/group-admin"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 hover:border-slate-600 text-slate-300 hover:text-white font-medium text-base transition-all duration-200"
              >
                En savoir plus
              </a>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default GroupAdminDirectory;
