/**
 * =============================================================================
 * CLIENT INFO PANEL - Panneau d'informations client pour DossierDetail
 * Affiche statut, infos client, demande, service et prestataire
 * =============================================================================
 */

import { Timestamp } from "firebase/firestore";
import {
  User,
  MapPin,
  Calendar,
  Clock,
  Scale,
  Globe,
  Flag,
  Timer,
  FileText,
} from "lucide-react";
import { STATUS_CONFIG, type BookingStatus } from "../../lib/constants";
import { formatDate, type DateInput } from "../../utils/formatDate";
import { StatusActions } from "./StatusActions";

// =============================================================================
// TYPES
// =============================================================================

export interface BookingData {
  id: string;
  title?: string;
  description?: string;
  status: BookingStatus;
  priority?: "low" | "medium" | "high" | "urgent";

  // Client
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientEmail?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];

  // Prestataire
  providerId?: string;
  providerName?: string;
  providerType?: "lawyer" | "expat";
  providerCountry?: string;
  providerEmail?: string;
  providerPhone?: string;
  providerSpecialties?: string[];

  // Service
  serviceType?: string;
  price?: number;
  duration?: number;

  // IA
  aiProcessed?: boolean;
  aiError?: string;

  // Timestamps
  createdAt?: Timestamp | Date | DateInput;
  updatedAt?: Timestamp | Date | DateInput;
  completedAt?: Timestamp | Date | DateInput;
}

export interface ClientInfoPanelProps {
  booking: BookingData;
  onUpdateStatus?: (status: BookingStatus) => void;
  statusUpdating?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ClientInfoPanel({
  booking,
  onUpdateStatus,
  statusUpdating = false,
}: ClientInfoPanelProps) {
  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const isLawyer = booking.providerType === "lawyer";

  return (
    <div className="space-y-4 overflow-y-auto">
      {/* Statut et actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${status.color}`}
          >
            <StatusIcon className="w-4 h-4" />
            {status.label}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              isLawyer
                ? "bg-blue-100 text-blue-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {isLawyer ? <Scale className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            {isLawyer ? "Avocat" : "Expert"}
          </span>
        </div>

        {/* Boutons d'action */}
        {onUpdateStatus && (
          <StatusActions
            currentStatus={booking.status}
            onUpdateStatus={onUpdateStatus}
            isUpdating={statusUpdating}
          />
        )}
      </div>

      {/* Infos Client */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-red-600" />
          Client
        </h3>

        <div className="space-y-3 text-sm">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Nom
            </span>
            <p className="font-medium text-gray-900">
              {booking.clientFirstName}{" "}
              {(booking.clientLastName || booking.clientName || "")
                .charAt(0)
                .toUpperCase()}
              .
            </p>
          </div>

          {booking.clientNationality && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Nationalite
              </span>
              <p className="font-medium text-gray-900 flex items-center gap-2">
                <Flag className="w-4 h-4 text-gray-400" />
                {booking.clientNationality}
              </p>
            </div>
          )}

          {booking.clientCurrentCountry && (
            <div className="bg-red-50 -mx-4 px-4 py-3 border-y border-red-100">
              <span className="text-xs text-red-600 uppercase tracking-wide font-medium">
                Pays d'intervention
              </span>
              <p className="font-bold text-red-700 text-lg">
                {booking.clientCurrentCountry}
              </p>
            </div>
          )}

          {booking.clientLanguages && booking.clientLanguages.length > 0 && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Langues
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {booking.clientLanguages.map((lang) => (
                  <span
                    key={lang}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full font-medium"
                  >
                    {lang.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Demande du client */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-red-600" />
          Demande
        </h3>

        <div className="space-y-3">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Titre
            </span>
            <p className="font-medium text-gray-900">
              {booking.title || "Sans titre"}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Description
            </span>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {booking.description || "Pas de description"}
            </div>
          </div>
        </div>
      </div>

      {/* Infos service */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
          <Timer className="w-4 h-4 text-red-600" />
          Service
        </h3>

        {booking.duration && (
          <div className="bg-gray-50 rounded-lg p-3 text-center mb-3">
            <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <span className="font-bold text-gray-900 text-lg">
              {booking.duration} min
            </span>
            <p className="text-xs text-gray-500">Duree de consultation</p>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Cree le {formatDate(booking.createdAt)}
          </div>
        </div>
      </div>

      {/* Prestataire (conditionnel) */}
      {booking.providerName && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
            {isLawyer ? (
              <Scale className="w-4 h-4 text-blue-600" />
            ) : (
              <Globe className="w-4 h-4 text-green-600" />
            )}
            Prestataire
          </h3>

          <div className="space-y-2 text-sm">
            <p className="font-medium text-gray-900">{booking.providerName}</p>
            {booking.providerCountry && (
              <p className="text-gray-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {booking.providerCountry}
              </p>
            )}
            {booking.providerSpecialties && booking.providerSpecialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {booking.providerSpecialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientInfoPanel;
