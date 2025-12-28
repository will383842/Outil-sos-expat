/**
 * =============================================================================
 * PROVIDER CARD - Carte d'affichage d'un prestataire
 * =============================================================================
 */

import { Timestamp } from "firebase/firestore";
import {
  Scale,
  Globe,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  RefreshCw,
  Star,
  Languages,
  ToggleLeft,
  ToggleRight,
  Shield,
  Calendar,
} from "lucide-react";
import { PROVIDER_TYPE_CONFIG } from "../../lib/constants";

// =============================================================================
// TYPES
// =============================================================================

export interface Provider {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  type?: "lawyer" | "expat";
  role?: "lawyer" | "expat";
  specialties?: string[];
  country?: string;
  currentCountry?: string;
  languages?: string[];
  languagesSpoken?: string[];
  rating?: number;
  reviewCount?: number;
  hasToolAccess?: boolean;
  toolAccessGrantedAt?: Timestamp;
  isVerified?: boolean;
  createdAt?: Date | Timestamp;
}

export interface ProviderCardProps {
  provider: Provider;
  onToggleAccess?: (provider: Provider) => void;
  isUpdating?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProviderCard({
  provider,
  onToggleAccess,
  isUpdating = false,
}: ProviderCardProps) {
  const isLawyer = provider.type === "lawyer" || provider.role === "lawyer";
  const providerType = isLawyer ? "lawyer" : "expat";
  const typeConfig = PROVIDER_TYPE_CONFIG[providerType];
  const hasAccess = provider.hasToolAccess === true;
  const languages = provider.languages || provider.languagesSpoken || [];
  const country = provider.country || provider.currentCountry;
  const displayName =
    provider.name ||
    `${provider.firstName || ""} ${provider.lastName || ""}`.trim() ||
    "Sans nom";

  // Initiales pour l'avatar
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Formatage date
  const formatDate = (date?: Date | Timestamp): string => {
    if (!date) return "";
    const d = date instanceof Timestamp ? date.toDate() : date;
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${typeConfig.bgColor}`}
          >
            {isLawyer ? (
              <Scale className={`w-6 h-6 ${typeConfig.color}`} />
            ) : (
              <Globe className={`w-6 h-6 ${typeConfig.color}`} />
            )}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">{displayName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}
              >
                {typeConfig.label}
              </span>
              {provider.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                  <CheckCircle className="w-3 h-3" />
                  Verifie
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toggle acces */}
        {onToggleAccess && (
          <button
            onClick={() => onToggleAccess(provider)}
            disabled={isUpdating || !provider.email}
            title={!provider.email ? "Email requis pour donner acces" : ""}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
              hasAccess
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isUpdating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : hasAccess ? (
              <>
                <ToggleRight className="w-5 h-5" />
                Acces actif
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5" />
                Donner acces
              </>
            )}
          </button>
        )}
      </div>

      {/* Infos */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Email */}
        {provider.email ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{provider.email}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-500">
            <Mail className="w-4 h-4" />
            <span className="text-xs">Email manquant</span>
          </div>
        )}

        {/* Telephone */}
        {provider.phone && (
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{provider.phone}</span>
          </div>
        )}

        {/* Pays */}
        {country && (
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{country}</span>
          </div>
        )}

        {/* Rating */}
        {provider.rating && (
          <div className="flex items-center gap-2 text-gray-600">
            <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span>
              {provider.rating.toFixed(1)} ({provider.reviewCount || 0} avis)
            </span>
          </div>
        )}
      </div>

      {/* Langues */}
      {languages.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <Languages className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {languages.slice(0, 5).map((lang) => (
              <span
                key={lang}
                className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {typeof lang === "string" ? lang.toUpperCase() : lang}
              </span>
            ))}
            {languages.length > 5 && (
              <span className="text-xs text-gray-500">
                +{languages.length - 5}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Specialites */}
      {provider.specialties && provider.specialties.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <Scale className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {provider.specialties.slice(0, 4).map((specialty) => (
              <span
                key={specialty}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
              >
                {specialty}
              </span>
            ))}
            {provider.specialties.length > 4 && (
              <span className="text-xs text-gray-500">
                +{provider.specialties.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Badge acces actif */}
      {hasAccess && provider.toolAccessGrantedAt && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Shield className="w-3.5 h-3.5" />
            <span>
              Acces accorde le {formatDate(provider.toolAccessGrantedAt)}
            </span>
          </div>
        </div>
      )}

      {/* Date d'ajout */}
      {provider.createdAt && !hasAccess && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Ajoute le {formatDate(provider.createdAt)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProviderCard;
