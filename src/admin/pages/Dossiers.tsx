/**
 * =============================================================================
 * PAGE DOSSIERS — Liste des demandes clients
 * Affiche tous les bookings avec filtres, statuts et accès au détail
 * =============================================================================
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  Timestamp,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useProvider } from "../../contexts/UnifiedUserContext";
import { useLanguage } from "../../hooks/useLanguage";
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  MapPin,
  User,
  Calendar,
  ChevronRight,
  RefreshCw,
  Briefcase,
  Scale,
  Globe,
  Sparkles,
} from "lucide-react";
import ExportButton, { ExportFormat } from "../components/ExportButton";
import { exportBookingsToCsv, exportBookingsToJson } from "../../lib/exportData";

// =============================================================================
// TYPES
// =============================================================================

interface Booking {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high" | "urgent";

  // Client
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];

  // Prestataire
  providerId?: string;
  providerName?: string;
  providerType?: "lawyer" | "expat";
  providerCountry?: string;

  // Service
  serviceType?: string;
  price?: number;
  duration?: number;

  // IA
  aiProcessed?: boolean;
  aiError?: string;

  // Timestamps
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  completedAt?: Timestamp;
}

type StatusFilter = "all" | "pending" | "in_progress" | "completed" | "cancelled";
type TypeFilter = "all" | "lawyer" | "expat";

// =============================================================================
// COMPOSANTS
// =============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
    </div>
  );
}

function BookingCard({ booking, onClick, t }: { booking: Booking; onClick: () => void; t: (key: string) => string }) {
  const STATUS_CONFIG = {
    pending: {
      label: t("common:status.pending"),
      color: "bg-amber-100 text-amber-800 border-amber-200",
      icon: Clock,
      dotColor: "bg-amber-500",
    },
    in_progress: {
      label: t("common:status.inProgress"),
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Phone,
      dotColor: "bg-blue-500",
    },
    completed: {
      label: t("common:status.completed"),
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
      dotColor: "bg-green-500",
    },
    cancelled: {
      label: t("common:status.cancelled"),
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: AlertCircle,
      dotColor: "bg-gray-500",
    },
  };

  const PRIORITY_CONFIG = {
    urgent: { label: t("common:priority.urgent"), color: "bg-red-100 text-red-800", icon: "🚨" },
    high: { label: t("common:priority.high"), color: "bg-orange-100 text-orange-800", icon: "⚡" },
    medium: { label: t("common:priority.medium"), color: "bg-blue-100 text-blue-800", icon: "📋" },
    low: { label: t("common:priority.low"), color: "bg-gray-100 text-gray-700", icon: "📝" },
  };

  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const priority = booking.priority ? PRIORITY_CONFIG[booking.priority] : null;
  const isLawyer = booking.providerType === "lawyer";

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-red-300 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* Type badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isLawyer
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {isLawyer ? <Scale className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {isLawyer ? t("bookingCard.lawyer") : t("bookingCard.expat")}
            </span>

            {/* Priority badge */}
            {priority && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.color}`}>
                {priority.icon} {priority.label}
              </span>
            )}

            {/* AI badge */}
            {booking.aiProcessed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <Sparkles className="w-3 h-3" />
                {t("bookingCard.aiProcessed")}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 truncate group-hover:text-red-600 transition-colors">
            {booking.title || t("dossiers.noTitle")}
          </h3>
        </div>

        {/* Status badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${status.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
        {booking.description || t("dossiers.noDescription")}
      </p>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
        {/* Client */}
        <div className="flex items-center gap-1">
          <User className="w-3.5 h-3.5" />
          <span>{booking.clientFirstName || booking.clientName || t("bookingCard.client")}</span>
        </div>

        {/* Pays */}
        {booking.clientCurrentCountry && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{booking.clientCurrentCountry}</span>
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
          <span>{formatDate(booking.createdAt)}</span>
        </div>
      </div>

      {/* Footer with arrow */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {booking.price && (
            <span className="text-sm font-semibold text-gray-900">
              {booking.price}€
            </span>
          )}
          {booking.duration && (
            <span className="text-xs text-gray-500">
              • {booking.duration} min
            </span>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

export default function Dossiers() {
  const navigate = useNavigate();
  const { activeProvider } = useProvider();
  const { t } = useLanguage({ mode: "provider" });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination - PERFORMANCE: Limite à 50 éléments par page
  const PAGE_SIZE = 50;
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Chargement des bookings en temps réel (filtrés par prestataire actif)
  // PERFORMANCE: Limité à PAGE_SIZE éléments pour éviter surcharge
  useEffect(() => {
    setLoading(true);
    setError(null);
    setBookings([]);
    setLastDoc(null);
    setHasMore(true);

    // Si un prestataire est actif, filtrer par son ID
    // Sinon, charger tous les bookings (pour les admins)
    let q;
    if (activeProvider?.id) {
      q = query(
        collection(db, "bookings"),
        where("providerId", "==", activeProvider.id),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
    } else {
      q = query(
        collection(db, "bookings"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Booking[];
        setBookings(data);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        setLoading(false);
      },
      (err) => {
        console.error("Erreur chargement bookings:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeProvider?.id]);

  // Charger plus de dossiers (pagination)
  const loadMore = async () => {
    if (!lastDoc || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      let q;
      if (activeProvider?.id) {
        q = query(
          collection(db, "bookings"),
          where("providerId", "==", activeProvider.id),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, "bookings"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      const newData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];

      setBookings((prev) => [...prev, ...newData]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Erreur chargement supplémentaire:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Filtrage des bookings
  const filteredBookings = bookings.filter((booking) => {
    // Filtre recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchTitle = booking.title?.toLowerCase().includes(search);
      const matchClient = booking.clientName?.toLowerCase().includes(search) ||
        booking.clientFirstName?.toLowerCase().includes(search);
      const matchCountry = booking.clientCurrentCountry?.toLowerCase().includes(search);
      const matchProvider = booking.providerName?.toLowerCase().includes(search);

      if (!matchTitle && !matchClient && !matchCountry && !matchProvider) {
        return false;
      }
    }

    // Filtre statut
    if (statusFilter !== "all" && booking.status !== statusFilter) {
      return false;
    }

    // Filtre type
    if (typeFilter !== "all" && booking.providerType !== typeFilter) {
      return false;
    }

    return true;
  });

  // Statistiques
  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    inProgress: bookings.filter((b) => b.status === "in_progress").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  // Navigation vers le détail
  const handleOpenBooking = (booking: Booking) => {
    navigate(`/admin/dossier/${booking.id}`);
  };

  // Export des dossiers
  const handleExport = async (format: ExportFormat) => {
    const dataToExport = filteredBookings.map((b) => ({
      ...b,
      // Convertir les Timestamps pour l'export
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      completedAt: b.completedAt,
    })) as Record<string, unknown>[];

    if (format === "csv") {
      await exportBookingsToCsv(dataToExport);
    } else {
      await exportBookingsToJson(dataToExport);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>{t("common:loading")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{t("common:errors.loading")}</span>
        </div>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("dossiers.title")}</h1>
          <p className="text-gray-600 mt-1">
            {filteredBookings.length} {filteredBookings.length > 1 ? t("dossiers.count_other", { count: filteredBookings.length }).replace(`${filteredBookings.length} `, "") : t("dossiers.count", { count: filteredBookings.length }).replace(`${filteredBookings.length} `, "")}
            {searchTerm || statusFilter !== "all" || typeFilter !== "all" ? ` ${t("dossiers.found")}` : ""}
          </p>
        </div>

        {/* Bouton export */}
        <ExportButton
          onExport={handleExport}
          disabled={filteredBookings.length === 0}
          label={t("common:actions.export")}
          count={filteredBookings.length}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("common:all")}
          value={stats.total}
          icon={Briefcase}
          color="bg-gray-100 text-gray-700"
        />
        <StatCard
          label={t("common:status.pending")}
          value={stats.pending}
          icon={Clock}
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          label={t("common:status.inProgress")}
          value={stats.inProgress}
          icon={Phone}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          label={t("common:status.completed")}
          value={stats.completed}
          icon={CheckCircle}
          color="bg-green-100 text-green-700"
        />
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("dossiers.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Bouton filtres */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] border rounded-lg transition-colors touch-scale-down ${
              showFilters || statusFilter !== "all" || typeFilter !== "all"
                ? "border-red-500 text-red-600 bg-red-50"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            {t("common:actions.filters")}
            {(statusFilter !== "all" || typeFilter !== "all") && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {(statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Filtres étendus */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
            {/* Filtre statut */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t("dossiers.filters.status")}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2.5 min-h-[44px] text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{t("dossiers.filters.all")}</option>
                <option value="pending">{t("common:status.pending")}</option>
                <option value="in_progress">{t("common:status.inProgress")}</option>
                <option value="completed">{t("common:status.completed")}</option>
                <option value="cancelled">{t("common:status.cancelled")}</option>
              </select>
            </div>

            {/* Filtre type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t("dossiers.filters.type")}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                className="px-3 py-2.5 min-h-[44px] text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{t("dossiers.filters.all")}</option>
                <option value="lawyer">{t("dossiers.filters.lawyer")}</option>
                <option value="expat">{t("dossiers.filters.expat")}</option>
              </select>
            </div>

            {/* Reset filtres */}
            {(statusFilter !== "all" || typeFilter !== "all") && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                className="self-end px-3 py-1.5 text-sm text-red-600 hover:text-red-700"
              >
                {t("common:actions.reset")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Liste des dossiers */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {t("dossiers.empty.title")}
          </h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== "all" || typeFilter !== "all"
              ? t("dossiers.empty.modifyFilters")
              : t("dossiers.empty.newRequestsHere")}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onClick={() => handleOpenBooking(booking)}
                t={t}
              />
            ))}
          </div>

          {/* Bouton charger plus - PERFORMANCE */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t("common:loading")}
                  </>
                ) : (
                  <>
                    {t("dossiers.loadMore")}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && bookings.length >= PAGE_SIZE && (
            <p className="text-center text-sm text-gray-500 mt-6">
              {t("dossiers.allLoaded", { count: bookings.length })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
