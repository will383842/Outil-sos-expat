import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { useIntl } from "react-intl";
import {
  Star,
  Globe,
  Users,
  Zap,
  Eye,
  ArrowRight,
  Wifi,
  WifiOff,
  MapPin,
  Clock,
} from "lucide-react";

// Import des utilitaires d'internationalisation
import {
  getCountryName,
  getLanguageName,
} from "../../utils/formatters";

import { formatSpecialties, mapLanguageToLocale } from "../../utils/specialtyMapper";

// Types
import type { Provider } from '@/types/provider';

interface ModernProfileCardProps {
  provider: Provider;
  onProfileClick: (provider: Provider) => void;
  isUserConnected: boolean;
  index?: number;
  language?: "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";
  showSpecialties?: boolean;
}

// Constants - Centralisées pour éviter les recreations - Mobile First
const CARD_DIMENSIONS = {
  mobileWidth: 300, // Mobile: plus grand et lisible
  desktopWidth: 320,
  mobileHeight: 500,
  desktopHeight: 520,
  mobileImageHeight: 260,
  desktopImageHeight: 288,
  mobileContentHeight: 240,
  desktopContentHeight: 232,
} as const;

const TOUCH_TARGETS = {
  minimum: 44, // WCAG AA minimum
  button: 48,
  badge: 36,
} as const;

const _LANGUAGE_MAP: Record<string, string> = {
  Français: "Français",
  French: "Français",
  fr: "Français",
  FR: "Français",
  Anglais: "Anglais",
  English: "Anglais",
  en: "Anglais",
  EN: "Anglais",
  Espagnol: "Espagnol",
  Spanish: "Espagnol",
  Español: "Espagnol",
  es: "Espagnol",
  ES: "Espagnol",
  Português: "Portugais",
  Portuguese: "Portugais",
  pt: "Portugais",
  PT: "Portugais",
  Deutsch: "Allemand",
  German: "Allemand",
  de: "Allemand",
  DE: "Allemand",
  Italiano: "Italien",
  Italian: "Italien",
  it: "Italien",
  IT: "Italien",
  Nederlands: "Néerlandais",
  Dutch: "Néerlandais",
  nl: "Néerlandais",
  NL: "Néerlandais",
  Русский: "Russe",
  Russian: "Russe",
  ru: "Russe",
  RU: "Russe",
  中文: "Chinois",
  Chinese: "Chinois",
  ch: "Chinois",
  CH: "Chinois",
  zh: "Chinois", // Keep for backward compatibility
  ZH: "Chinois", // Keep for backward compatibility
  العربية: "Arabe",
  Arabic: "Arabe",
  ar: "Arabe",
  AR: "Arabe",
} as const;

// TODO: remplacer par srcset WebP/AVIF pour de meilleures performances
const DEFAULT_AVATAR =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"%3E%3Crect width="400" height="400" fill="%23f1f5f9"/%3E%3Ccircle cx="200" cy="160" r="60" fill="%23cbd5e1"/%3E%3Cpath d="M100 350c0-55 45-100 100-100s100 45 100 100" fill="%23cbd5e1"/%3E%3C/svg%3E';

// Icônes métiers avec couleurs optimisées pour le contraste
const PROFESSION_ICONS: Record<
  string,
  { icon: string; bgColor: string; textColor: string }
> = {
  lawyer: {
    icon: "⚖️",
    bgColor: "bg-slate-100",
    textColor: "text-slate-800",
  },
  expat: {
    icon: "🌍",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
  },
  accountant: {
    icon: "🧮",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
  },
  notary: {
    icon: "📜",
    bgColor: "bg-amber-100",
    textColor: "text-amber-800",
  },
  tax_consultant: {
    icon: "💰",
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
  },
  real_estate: {
    icon: "🏠",
    bgColor: "bg-orange-100",
    textColor: "text-orange-800",
  },
  translator: {
    icon: "📝",
    bgColor: "bg-purple-100",
    textColor: "text-purple-800",
  },
  hr_consultant: {
    icon: "👥",
    bgColor: "bg-pink-100",
    textColor: "text-pink-800",
  },
  financial_advisor: {
    icon: "📊",
    bgColor: "bg-indigo-100",
    textColor: "text-indigo-800",
  },
  insurance_broker: {
    icon: "🛡️",
    bgColor: "bg-cyan-100",
    textColor: "text-cyan-800",
  },
};

// Fonctions utilitaires mémoïsées
const getProfessionInfo = (type: string) => {
  return PROFESSION_ICONS[type] || PROFESSION_ICONS["expat"];
};

// Type pour le statut de disponibilité
type AvailabilityStatus = 'available' | 'busy' | 'offline';

// Hook pour les couleurs de statut (mémoïsé) - Supporte available, busy, offline
const useStatusColors = (availability: AvailabilityStatus) => {
  return useMemo(() => {
    switch (availability) {
      case 'available':
        return {
          border: "border-green-300",
          shadow: "shadow-green-100",
          glow: "shadow-green-200/50",
          borderShadow: "drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]",
          badge: "bg-green-100 text-green-800 border-green-300",
          button:
            "bg-green-700 hover:bg-green-800 active:bg-green-900 border-green-700",
          accent: "text-green-700",
        };
      case 'busy':
        return {
          border: "border-orange-300",
          shadow: "shadow-orange-100",
          glow: "shadow-orange-200/50",
          borderShadow: "drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]",
          badge: "bg-orange-100 text-orange-800 border-orange-300",
          button:
            "bg-orange-600 hover:bg-orange-700 active:bg-orange-800 border-orange-600",
          accent: "text-orange-600",
        };
      case 'offline':
      default:
        return {
          border: "border-red-300",
          shadow: "shadow-red-100",
          glow: "shadow-red-200/50",
          borderShadow: "drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]",
          badge: "bg-red-100 text-red-800 border-red-300",
          button:
            "bg-red-700 hover:bg-red-800 active:bg-red-900 border-red-700",
          accent: "text-red-700",
        };
    }
  }, [availability]);
};

// Composant ModernProfileCard - Version Production avec Internationalisation
export const ModernProfileCard = React.memo<ModernProfileCardProps>(
  ({
    provider,
    onProfileClick,
    isUserConnected: _isUserConnected,
    index = 0,
    language = 'fr',
    showSpecialties = false // Par défaut, ne pas afficher les spécialités
  }) => {
    const intl = useIntl();
    const [isHovered, setIsHovered] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Déterminer le statut de disponibilité
    const availability: AvailabilityStatus = useMemo(() => {
      if (provider.availability === 'busy') return 'busy';
      if (provider.isOnline && provider.availability !== 'offline') return 'available';
      return 'offline';
    }, [provider.availability, provider.isOnline]);

    const statusColors = useStatusColors(availability);
    const professionInfo = useMemo(
      () => getProfessionInfo(provider.type),
      [provider.type]
    );

    // ========================================
    // INTERNATIONALISATION DES LANGUES
    // ========================================
    const formattedLanguages = useMemo(() => {
      if (!provider.languages || provider.languages.length === 0) {
        return '';
      }
      
      // Convertir les codes ISO en noms traduits
      const translatedLanguages = provider.languages
        .slice(0, 3)
        .map(langCode => getLanguageName(langCode, language))
        .filter(name => name !== '');
      
      let result = translatedLanguages.join(' • ');
      
      if (provider.languages.length > 3) {
        result += ` +${provider.languages.length - 3}`;
      }
      
      return result;
    }, [provider.languages, language]);

    // ========================================
    // INTERNATIONALISATION DES PAYS D'INTERVENTION
    // ========================================
    const formattedCountries = useMemo(() => {
      // Utiliser practiceCountries si disponible, sinon country
      const countries = provider.practiceCountries && provider.practiceCountries.length > 0
        ? provider.practiceCountries
        : provider.country ? [provider.country] : [];
      
      if (countries.length === 0) {
        return '';
      }
      
      // Convertir les codes ISO en noms traduits
      const translatedCountries = countries
        .slice(0, 2)
        .map(countryCode => getCountryName(countryCode, language))
        .filter(name => name !== '');
      
      let result = translatedCountries.join(' • ');
      
      if (countries.length > 2) {
        result += ` +${countries.length - 2}`;
      }
      
      return result;
    }, [provider.practiceCountries, provider.country, language]);

    // ========================================
    // SPÉCIALITÉS (optionnel) avec traductions
    // ========================================
    const formattedSpecialties = useMemo(() => {
      if (!showSpecialties || !provider.specialties || provider.specialties.length === 0) {
        return null;
      }

      const locale = mapLanguageToLocale(language || 'fr');
      return formatSpecialties(provider.specialties, locale, 2);
    }, [provider.specialties, showSpecialties, language]);

    const handleImageError = useCallback(
      (e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.currentTarget;
        if (target.src !== DEFAULT_AVATAR && !imageError) {
          setImageError(true);
          target.src = DEFAULT_AVATAR;
        }
      },
      [imageError]
    );

    const handleClick = useCallback(() => {
      onProfileClick(provider);
    }, [provider, onProfileClick]);

    const handleMouseEnter = useCallback(() => {
      if (window.matchMedia("(hover: hover)").matches) {
        setIsHovered(true);
      }
    }, []);

    const handleMouseLeave = useCallback(() => {
      setIsHovered(false);
    }, []);

    // Fonction helper pour obtenir le texte du statut traduit
    const getStatusText = useCallback(() => {
      switch (availability) {
        case 'available':
          return intl.formatMessage({ id: "card.online" });
        case 'busy':
          return intl.formatMessage({ id: "card.busy", defaultMessage: "Occupé" });
        case 'offline':
        default:
          return intl.formatMessage({ id: "card.offline" });
      }
    }, [availability, intl]);

    const ariaLabels = useMemo(
      () => ({
        card: intl.formatMessage(
          { id: "card.aria.profileCard" },
          { name: provider.name }
        ),
        status: intl.formatMessage(
          { id: "card.aria.onlineStatus" },
          { status: getStatusText() }
        ),
        rating: intl.formatMessage(
          { id: "card.aria.rating" },
          { rating: provider.rating.toFixed(1) }
        ),
        viewProfile: intl.formatMessage(
          { id: "card.aria.viewProfileAction" },
          { name: provider.name }
        ),
      }),
      [intl, provider.name, provider.rating, getStatusText]
    );

    return (
      <div className="flex-shrink-0 flex justify-center">
        <article
          className={`
            relative bg-white rounded-2xl overflow-hidden cursor-pointer
            transition-all duration-300 ease-out border-2 shadow-lg
            w-[300px] sm:w-[320px] h-[500px] sm:h-[520px]
            ${statusColors.border} ${statusColors.shadow} ${statusColors.borderShadow}
            ${isHovered ? `scale-[1.02] ${statusColors.glow} shadow-xl` : ""}
            focus:outline-none focus:ring-4 focus:ring-blue-500/50
            hover:shadow-xl
            touch-manipulation
          `}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={ariaLabels.card}
          style={{
            animationDelay: `${index * 100}ms`,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* Header avec photo et statut - Dimensions explicites pour éviter layout shift */}
          <div
            className="relative overflow-hidden bg-slate-100 h-[260px] sm:h-[288px]"
          >
            <img
              src={provider.avatar || provider.profilePhoto || DEFAULT_AVATAR}
              alt={`Photo de profil de ${provider.name}`}
              className={`
              w-full h-full object-cover transition-all duration-300
              ${imageLoaded ? "opacity-100" : "opacity-0"}
              ${isHovered ? "scale-105" : ""}
            `}
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
              loading="lazy"
              decoding="async"
              width={CARD_DIMENSIONS.desktopWidth}
              height={CARD_DIMENSIONS.desktopImageHeight}
            />

            {/* Overlay gradient amélioré */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

            {/* Statut en ligne - Taille tactile optimisée */}
            <div className="absolute top-3 left-3">
              <div
                className={`
                inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium
                backdrop-blur-sm border shadow-sm transition-colors
                ${statusColors.badge}
              `}
                style={{ minHeight: `${TOUCH_TARGETS.badge}px` }}
                aria-label={ariaLabels.status}
              >
                {availability === 'available' ? (
                  <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                ) : availability === 'busy' ? (
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                )}
                <span>{getStatusText()}</span>
              </div>
            </div>

            {/* Badge métier avec contraste amélioré */}
            <div className="absolute top-3 right-3">
              <div
                className={`
              inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full
              backdrop-blur-sm border shadow-sm border-white/30
              ${professionInfo.bgColor} ${professionInfo.textColor}
            `}
                style={{ minHeight: `${TOUCH_TARGETS.badge}px` }}
              >
                <span className="text-xs sm:text-sm font-medium">
                  <span aria-hidden="true">{professionInfo.icon}</span>{" "}
                  {intl.formatMessage({
                    id: `card.profession.${provider.type}`,
                  })}
                </span>
              </div>
            </div>

            {/* Note avec accessibilité améliorée */}
            <div className="absolute bottom-3 right-3">
              <div
                className="flex items-center gap-1.5 sm:gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm"
                aria-label={ariaLabels.rating}
              >
                <Star
                  className="w-4 h-4 sm:w-4 sm:h-4 text-amber-500 fill-current"
                  aria-hidden="true"
                />
                <span className="text-slate-800 text-sm font-medium">
                  {provider.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Contenu principal - Structure flex robuste pour mobile */}
          <div
            className="p-3 sm:p-4 flex flex-col h-[240px] sm:h-[232px]"
          >
            {/* Partie haute: infos (grow pour remplir l'espace) */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Nom et expérience */}
              <div className="mb-2 sm:mb-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 truncate flex-1">
                    {provider.name}
                  </h3>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 border border-teal-200 flex-shrink-0">
                    <Zap className="w-3 h-3 text-teal-600" aria-hidden="true" />
                    <span className="text-teal-600 text-xs font-medium">
                      {provider.yearsOfExperience}{" "}
                      {intl.formatMessage({ id: "card.years" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informations organisées - Flex-1 avec overflow */}
              <div className="flex-1 space-y-2 overflow-hidden min-h-0">
                {/* Pays d'intervention */}
                {formattedCountries && (
                  <div className="flex items-start gap-2">
                    <MapPin
                      className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="text-blue-600 text-xs leading-tight line-clamp-2">
                      {formattedCountries}
                    </span>
                  </div>
                )}

                {/* Langues */}
                {formattedLanguages && (
                  <div className="flex items-start gap-2">
                    <Globe
                      className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="text-indigo-600 text-xs leading-tight line-clamp-2">
                      {formattedLanguages}
                    </span>
                  </div>
                )}

                {/* Spécialités - SEULEMENT SI showSpecialties=true */}
                {formattedSpecialties && (
                  <div className="flex items-start gap-2">
                    <Zap
                      className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span className="text-purple-600 text-xs leading-tight line-clamp-2">
                      {formattedSpecialties}
                    </span>
                  </div>
                )}
              </div>

              {/* Stats - séparé du reste */}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                  <span className="text-amber-600 text-xs font-medium">
                    {provider.reviewCount}{" "}
                    {intl.formatMessage({ id: "card.reviews" })}
                  </span>
                </div>
                <div className="text-slate-500 text-xs">
                  {intl.formatMessage({ id: `card.profession.${provider.type}` })}
                </div>
              </div>
            </div>

            {/* Bouton CTA - TOUJOURS EN BAS, séparé et centré */}
            <div className="flex-shrink-0 pt-3 mt-auto">
              <button
                className={`
                  w-full rounded-xl font-bold text-white
                  transition-all duration-200 flex items-center justify-center gap-2
                  border-2 shadow-lg
                  ${statusColors.button}
                  active:scale-[0.98]
                  focus:outline-none focus:ring-4 focus:ring-blue-500/50
                  touch-manipulation
                `}
                style={{
                  minHeight: `${TOUCH_TARGETS.button}px`,
                  padding: "12px 16px",
                  WebkitTapHighlightColor: 'transparent',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                type="button"
                aria-label={ariaLabels.viewProfile}
              >
                <Eye className="w-4 h-4" aria-hidden="true" />
                <span className="font-bold text-sm">
                  {intl.formatMessage({ id: "card.viewProfile" })}
                </span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </article>

        {/* Styles optimisés avec prefers-reduced-motion */}
        <style>{`
        article {
          animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        
        @keyframes slideInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          article {
            animation: none;
            opacity: 1;
            transform: none;
          }
          
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        
        /* Optimisation focus pour navigation clavier */
        article:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
      </div>
    );
  }
);

ModernProfileCard.displayName = "ModernProfileCard";

export default ModernProfileCard;
export type { ModernProfileCardProps };
export type { Provider } from '@/types/provider';