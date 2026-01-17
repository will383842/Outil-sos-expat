/**
 * =============================================================================
 * BOOKING STATS - Grille de statistiques pour les dossiers
 * Affiche total, en attente, en cours et termines avec icones
 * =============================================================================
 */

import { Briefcase, Clock, Phone, CheckCircle } from "lucide-react";
import { StatCard } from "../ui/stat-card";

// =============================================================================
// TYPES
// =============================================================================

export interface BookingStatsData {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export interface BookingStatsProps {
  stats: BookingStatsData;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BookingStats({ stats, className = "" }: BookingStatsProps) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <StatCard
        label="Total"
        value={stats.total}
        icon={Briefcase}
        color="default"
      />
      <StatCard
        label="En attente"
        value={stats.pending}
        icon={Clock}
        color="amber"
      />
      <StatCard
        label="En cours"
        value={stats.inProgress}
        icon={Phone}
        color="blue"
      />
      <StatCard
        label="Termines"
        value={stats.completed}
        icon={CheckCircle}
        color="green"
      />
    </div>
  );
}

/**
 * Hook utilitaire pour calculer les stats a partir d'une liste de bookings
 */
export function useBookingStats<
  T extends { status: "pending" | "in_progress" | "completed" | "cancelled" }
>(bookings: T[]): BookingStatsData {
  return {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    inProgress: bookings.filter((b) => b.status === "in_progress").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };
}

export default BookingStats;
