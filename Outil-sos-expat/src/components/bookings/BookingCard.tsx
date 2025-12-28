/**
 * =============================================================================
 * BOOKING CARD - Carte d'un dossier pour les listes
 * Affiche les informations principales d'un booking avec badges et meta-infos
 * =============================================================================
 */

import { Timestamp } from "firebase/firestore";
import {
  Scale,
  Globe,
  Sparkles,
  User,
  MapPin,
  Briefcase,
  Calendar,
  ChevronRight,
} from "lucide-react";
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  type BookingStatus,
  type BookingPriority,
} from "../../lib/constants";
import { formatDateShort, type DateInput } from "../../utils/formatDate";
import { useLanguage } from "../../hooks/useLanguage";

// =============================================================================
// TYPES
// =============================================================================

export interface BookingCardData {
  id: string;
  title?: string;
  description?: string;
  clientName?: string;
  clientFirstName?: string;
  clientEmail?: string;
  clientCurrentCountry?: string;
  category?: string;
  status: BookingStatus;
  priority?: BookingPriority;
  providerType?: "lawyer" | "expat";
  providerName?: string;
  createdAt?: Date | Timestamp | DateInput;
  aiProcessed?: boolean;
  price?: number;
  duration?: number;
}

export interface BookingCardProps {
  booking: BookingCardData;
  onClick?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BookingCard({ booking, onClick }: BookingCardProps) {
  const { t } = useLanguage({ mode: "provider" });
  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const priority = booking.priority ? PRIORITY_CONFIG[booking.priority] : null;
  const isLawyer = booking.providerType === "lawyer";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-red-300 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* Type badge (avocat/expat) */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isLawyer
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {isLawyer ? <Scale className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {isLawyer ? t("provider:bookingCard.lawyer") : t("provider:dossiers.filters.expat")}
            </span>

            {/* Priority badge */}
            {priority && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.color}`}
              >
                {priority.icon} {priority.label}
              </span>
            )}

            {/* AI badge */}
            {booking.aiProcessed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <Sparkles className="w-3 h-3" />
                {t("provider:bookingCard.aiProcessed")}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 truncate group-hover:text-red-600 transition-colors">
            {booking.title || t("provider:dossiers.noTitle")}
          </h3>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${status.color}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
        {booking.description || t("provider:dossiers.noDescription")}
      </p>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
        {/* Client */}
        <div className="flex items-center gap-1">
          <User className="w-3.5 h-3.5" />
          <span>
            {booking.clientFirstName || booking.clientName || t("provider:bookingCard.client")}
          </span>
        </div>

        {/* Pays */}
        {booking.clientCurrentCountry && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{booking.clientCurrentCountry}</span>
          </div>
        )}

        {/* Category */}
        {booking.category && (
          <div className="flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5" />
            <span>{booking.category}</span>
          </div>
        )}

        {/* Prestataire */}
        {booking.providerName && (
          <div className="flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5" />
            <span>{booking.providerName}</span>
          </div>
        )}

        {/* Date */}
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDateShort(booking.createdAt)}</span>
        </div>
      </div>

      {/* Footer with arrow */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {booking.price && (
            <span className="text-sm font-semibold text-gray-900">
              {booking.price}$
            </span>
          )}
          {booking.duration && (
            <span className="text-xs text-gray-500">
              {booking.price ? "- " : ""}{booking.duration} min
            </span>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}

export default BookingCard;
