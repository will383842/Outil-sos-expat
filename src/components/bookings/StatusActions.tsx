/**
 * =============================================================================
 * STATUS ACTIONS - Boutons d'action contextuels selon le statut du dossier
 * Gestion des transitions d'etat: pending -> in_progress -> completed/cancelled
 * =============================================================================
 */

import { PhoneCall, CheckCircle, PhoneOff, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import type { BookingStatus } from "../../lib/constants";
import { useLanguage } from "../../hooks/useLanguage";

// =============================================================================
// TYPES
// =============================================================================

export interface StatusActionsProps {
  currentStatus: BookingStatus;
  onUpdateStatus: (status: BookingStatus) => void;
  isUpdating?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function StatusActions({
  currentStatus,
  onUpdateStatus,
  isUpdating = false,
}: StatusActionsProps) {
  const { t } = useLanguage({ mode: "provider" });

  return (
    <div className="space-y-2">
      {/* pending -> Demarrer l'appel */}
      {currentStatus === "pending" && (
        <Button
          onClick={() => onUpdateStatus("in_progress")}
          disabled={isUpdating}
          className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <PhoneCall className="w-4 h-4 mr-2" />
          {t("provider:statusActions.startCall")}
        </Button>
      )}

      {/* in_progress -> Terminer */}
      {currentStatus === "in_progress" && (
        <Button
          onClick={() => onUpdateStatus("completed")}
          disabled={isUpdating}
          className="w-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {t("provider:statusActions.finish")}
        </Button>
      )}

      {/* pending ou in_progress -> Annuler */}
      {(currentStatus === "pending" || currentStatus === "in_progress") && (
        <Button
          variant="outline"
          onClick={() => onUpdateStatus("cancelled")}
          disabled={isUpdating}
          className="w-full border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <PhoneOff className="w-4 h-4 mr-2" />
          {t("provider:statusActions.cancel")}
        </Button>
      )}

      {/* completed ou cancelled -> Reouvrir */}
      {(currentStatus === "completed" || currentStatus === "cancelled") && (
        <Button
          onClick={() => onUpdateStatus("in_progress")}
          disabled={isUpdating}
          className="w-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {t("provider:statusActions.reopenConversation")}
        </Button>
      )}
    </div>
  );
}

export default StatusActions;
