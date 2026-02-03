/**
 * =============================================================================
 * PAGE PRESTATAIRES — Gestion des accès à l'outil
 * Liste des prestataires avec bouton pour activer/désactiver l'accès
 * 
 * Quand on active l'accès :
 * 1. Met à jour hasToolAccess dans sos_profiles
 * 2. Crée/met à jour le document dans la collection "providers"
 *    → Permet au prestataire de se connecter avec son email Google
 * =============================================================================
 */

import { useEffect, useState } from "react";
import { useLanguage } from "../../hooks/useLanguage";
import { useAuth } from "../../contexts/UnifiedUserContext";
import { logAuditEntry } from "../../lib/auditLog";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { showSuccess, showError } from "../../lib/toast";
import {
  Search,
  Filter,
  Scale,
  Globe,
  MapPin,
  Mail,
  Phone,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  User,
  Star,
  Languages,
  ToggleLeft,
  ToggleRight,
  Shield,
  Plus,
  ChevronRight,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface Provider {
  id: string;
  // Infos de base
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  
  // Type et spécialités
  type?: "lawyer" | "expat";
  role?: "lawyer" | "expat";
  specialties?: string[];
  
  // Localisation
  country?: string;
  currentCountry?: string;
  languages?: string[];
  languagesSpoken?: string[];
  
  // Stats
  rating?: number;
  reviewCount?: number;
  
  // Accès outil
  hasToolAccess?: boolean;
  toolAccessGrantedAt?: Timestamp;
  toolAccessGrantedBy?: string;
  active?: boolean;
  
  // Status
  isActive?: boolean;
  isVerified?: boolean;
  
  // Timestamps
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

type TypeFilter = "all" | "lawyer" | "expat";
type AccessFilter = "all" | "granted" | "denied";

// =============================================================================
// COMPOSANTS
// =============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
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

function ProviderCard({
  provider,
  onToggleAccess,
  isUpdating,
  t,
}: {
  provider: Provider;
  onToggleAccess: (provider: Provider) => void;
  isUpdating: boolean;
  t: (key: string) => string;
}) {
  const isLawyer = provider.type === "lawyer" || provider.role === "lawyer";
  const hasAccess = provider.hasToolAccess === true;
  const languages = provider.languages || provider.languagesSpoken || [];
  const country = provider.country || provider.currentCountry;
  const displayName = provider.name || `${provider.firstName || ""} ${provider.lastName || ""}`.trim() || t("empty.noData");

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isLawyer ? "bg-blue-100" : "bg-green-100"
            }`}
          >
            {isLawyer ? (
              <Scale className="w-6 h-6 text-blue-600" />
            ) : (
              <Globe className="w-6 h-6 text-green-600" />
            )}
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">{displayName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  isLawyer
                    ? "bg-blue-100 text-blue-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {isLawyer ? t("types.lawyer") : t("types.expat")}
              </span>
              {provider.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                  <CheckCircle className="w-3 h-3" />
                  {t("status.verified")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toggle accès */}
        <button
          onClick={() => onToggleAccess(provider)}
          disabled={isUpdating || !provider.email}
          title={!provider.email ? t("admin:prestataires.emailMissing") : ""}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
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
              {t("admin:prestataires.actions.activeAccess")}
            </>
          ) : (
            <>
              <ToggleLeft className="w-5 h-5" />
              {t("admin:prestataires.actions.grantAccess")}
            </>
          )}
        </button>
      </div>

      {/* Infos */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Email */}
        {provider.email ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="truncate">{provider.email}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-500">
            <Mail className="w-4 h-4" />
            <span className="text-xs">{t("admin:prestataires.emailMissing")}</span>
          </div>
        )}
        
        {/* Téléphone */}
        {provider.phone && (
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{provider.phone}</span>
          </div>
        )}
        
        {/* Pays */}
        {country && (
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{country}</span>
          </div>
        )}
        
        {/* Rating */}
        {provider.rating && (
          <div className="flex items-center gap-2 text-gray-600">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>
              {provider.rating.toFixed(1)} ({provider.reviewCount || 0})
            </span>
          </div>
        )}
      </div>

      {/* Langues */}
      {languages.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <Languages className="w-4 h-4 text-gray-400" />
            {languages.slice(0, 5).map((lang) => (
              <span
                key={lang}
                className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {typeof lang === 'string' ? lang.toUpperCase() : lang}
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

      {/* Badge accès actif */}
      {hasAccess && provider.toolAccessGrantedAt && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Shield className="w-3.5 h-3.5" />
            <span>
              {t("admin:auditLogs.actions.accessGranted")} - {provider.toolAccessGrantedAt.toDate().toLocaleDateString("fr-FR")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MODAL AJOUT MANUEL
// =============================================================================

function AddProviderModal({
  isOpen,
  onClose,
  onAdd,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { email: string; name: string; type: "lawyer" | "expat"; country: string }) => Promise<void>;
  t: (key: string) => string;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"lawyer" | "expat">("lawyer");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      setError(t("errors.generic"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onAdd({ email: email.toLowerCase(), name, type, country });
      setEmail("");
      setName("");
      setType("lawyer");
      setCountry("");
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("errors.generic");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {t("admin:prestataires.addProvider")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("admin:prestataires.form.email")} *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("admin:prestataires.form.emailPlaceholder")}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("admin:prestataires.form.fullName")} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("admin:prestataires.form.type")}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "lawyer" | "expat")}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="lawyer">{t("types.lawyer")}</option>
              <option value="expat">{t("types.expat")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("admin:prestataires.form.country")}
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {t("actions.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {t("actions.add")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

export default function Prestataires() {
  const { t } = useLanguage({ mode: "admin" });
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Pagination - PERFORMANCE: Limite à 50 éléments par page
  const PAGE_SIZE = 50;
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Charger les prestataires depuis sos_profiles
  // PERFORMANCE: Limité à PAGE_SIZE éléments pour éviter surcharge
  useEffect(() => {
    setLoading(true);
    setProviders([]);
    setLastDoc(null);
    setHasMore(true);

    const q = query(
      collection(db, "sos_profiles"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Provider[];
        setProviders(data);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        setLoading(false);
        setUsingFallback(false);
      },
      () => {
        // Fallback sur providers collection
        setUsingFallback(true);
        const fallbackQuery = query(
          collection(db, "providers"),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );

        const unsubFallback = onSnapshot(fallbackQuery, (snap) => {
          const data = snap.docs.map((doc) => ({
            id: doc.id,
            hasToolAccess: doc.data().active !== false,
            ...doc.data(),
          })) as Provider[];
          setProviders(data);
          setLastDoc(snap.docs[snap.docs.length - 1] || null);
          setHasMore(snap.docs.length === PAGE_SIZE);
          setLoading(false);
        });

        return () => unsubFallback();
      }
    );

    return () => unsubscribe();
  }, []);

  // Charger plus de prestataires (pagination)
  const loadMore = async () => {
    if (!lastDoc || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const collectionName = usingFallback ? "providers" : "sos_profiles";
      const q = query(
        collection(db, collectionName),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const newData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(usingFallback ? { hasToolAccess: doc.data().active !== false } : {}),
        ...doc.data(),
      })) as Provider[];

      setProviders((prev) => [...prev, ...newData]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch {
      // Erreur silencieuse - les données restent inchangées
    } finally {
      setLoadingMore(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Toggle accès - Crée/supprime le provider dans la collection "providers"
  // ═══════════════════════════════════════════════════════════════════════════
  const handleToggleAccess = async (provider: Provider) => {
    if (!provider.email) {
      showError(t("admin:prestataires.emailMissing"));
      return;
    }

    setUpdatingId(provider.id);
    const newAccessState = !provider.hasToolAccess;
    const displayName = provider.name || `${provider.firstName || ""} ${provider.lastName || ""}`.trim();
    const providerType = provider.type || provider.role || "lawyer";
    const country = provider.country || provider.currentCountry || "";

    try {
      // 1. Mettre à jour dans sos_profiles
      try {
        await updateDoc(doc(db, "sos_profiles", provider.id), {
          hasToolAccess: newAccessState,
          toolAccessGrantedAt: newAccessState ? serverTimestamp() : null,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // sos_profiles update skipped - collection peut ne pas exister
      }

      // 2. Créer ou supprimer dans la collection "providers"
      // On utilise l'ID du sos_profile comme ID du provider
      const providerDocRef = doc(db, "providers", provider.id);

      if (newAccessState) {
        // Activer l'accès → Créer/mettre à jour le provider
        await setDoc(providerDocRef, {
          email: provider.email.toLowerCase(),
          name: displayName || t("empty.noData"),
          type: providerType,
          country: country,
          active: true,
          sosProfileId: provider.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        // Désactiver l'accès → Marquer comme inactif (ne pas supprimer pour garder l'historique)
        await setDoc(providerDocRef, {
          active: false,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      // 3. Audit log
      await logAuditEntry({
        action: newAccessState ? "provider.access_grant" : "provider.access_revoke",
        targetType: "provider",
        targetId: provider.id,
        details: {
          email: provider.email,
          name: displayName,
          type: providerType,
          country: country,
          adminEmail: user?.email || "unknown",
        },
        severity: "info",
      });

      // 4. Mise à jour locale
      setProviders((prev) =>
        prev.map((p) =>
          p.id === provider.id
            ? { ...p, hasToolAccess: newAccessState, toolAccessGrantedAt: newAccessState ? Timestamp.now() : undefined }
            : p
        )
      );

      showSuccess(t("success.saved"));
    } catch {
      showError(t("errors.generic"));
    } finally {
      setUpdatingId(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Ajouter un provider manuellement
  // ═══════════════════════════════════════════════════════════════════════════
  const handleAddProvider = async (data: { email: string; name: string; type: "lawyer" | "expat"; country: string }) => {
    // Générer un ID unique
    const providerId = `manual_${Date.now()}`;

    // Créer dans providers
    await setDoc(doc(db, "providers", providerId), {
      email: data.email.toLowerCase(),
      name: data.name,
      type: data.type,
      country: data.country,
      active: true,
      manual: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Audit log
    await logAuditEntry({
      action: "provider.create",
      targetType: "provider",
      targetId: providerId,
      details: {
        email: data.email.toLowerCase(),
        name: data.name,
        type: data.type,
        country: data.country,
        manual: true,
        adminEmail: user?.email || "unknown",
      },
      severity: "info",
    });

    // Ajouter à la liste locale
    setProviders((prev) => [
      {
        id: providerId,
        email: data.email,
        name: data.name,
        type: data.type,
        country: data.country,
        hasToolAccess: true,
        toolAccessGrantedAt: Timestamp.now(),
      } as Provider,
      ...prev,
    ]);
  };

  // Filtrage
  const filteredProviders = providers.filter((provider) => {
    // Recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const name = (provider.name || `${provider.firstName} ${provider.lastName}`).toLowerCase();
      const email = provider.email?.toLowerCase() || "";
      const country = (provider.country || provider.currentCountry || "").toLowerCase();
      
      if (!name.includes(search) && !email.includes(search) && !country.includes(search)) {
        return false;
      }
    }
    
    // Type
    if (typeFilter !== "all") {
      const isLawyer = provider.type === "lawyer" || provider.role === "lawyer";
      if (typeFilter === "lawyer" && !isLawyer) return false;
      if (typeFilter === "expat" && isLawyer) return false;
    }
    
    // Accès
    if (accessFilter !== "all") {
      if (accessFilter === "granted" && !provider.hasToolAccess) return false;
      if (accessFilter === "denied" && provider.hasToolAccess) return false;
    }
    
    return true;
  });

  // Stats
  const stats = {
    total: providers.length,
    lawyers: providers.filter((p) => p.type === "lawyer" || p.role === "lawyer").length,
    expats: providers.filter((p) => p.type !== "lawyer" && p.role !== "lawyer").length,
    withAccess: providers.filter((p) => p.hasToolAccess).length,
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{t("errors.loading")}</span>
        </div>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("admin:prestataires.title")}</h1>
          <p className="text-gray-600 mt-1">
            {t("admin:prestataires.description")}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("admin:prestataires.addManually")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("admin:prestataires.stats.total")}
          value={stats.total}
          icon={User}
          color="bg-gray-100 text-gray-700"
        />
        <StatCard
          label={t("admin:prestataires.stats.lawyers")}
          value={stats.lawyers}
          icon={Scale}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          label={t("admin:prestataires.stats.expats")}
          value={stats.expats}
          icon={Globe}
          color="bg-green-100 text-green-700"
        />
        <StatCard
          label={t("admin:prestataires.stats.withAccess")}
          value={stats.withAccess}
          icon={Shield}
          color="bg-purple-100 text-purple-700"
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
              placeholder={t("admin:prestataires.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Bouton filtres */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters || typeFilter !== "all" || accessFilter !== "all"
                ? "border-red-500 text-red-600 bg-red-50"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            {t("actions.filters")}
          </button>
        </div>

        {/* Filtres étendus */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t("admin:prestataires.filters.type")}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{t("admin:prestataires.filters.all")}</option>
                <option value="lawyer">{t("admin:prestataires.stats.lawyers")}</option>
                <option value="expat">{t("admin:prestataires.stats.expats")}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t("admin:prestataires.filters.access")}
              </label>
              <select
                value={accessFilter}
                onChange={(e) => setAccessFilter(e.target.value as AccessFilter)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{t("admin:prestataires.filters.all")}</option>
                <option value="granted">{t("admin:prestataires.filters.withAccess")}</option>
                <option value="denied">{t("admin:prestataires.filters.withoutAccess")}</option>
              </select>
            </div>

            {(typeFilter !== "all" || accessFilter !== "all") && (
              <button
                onClick={() => {
                  setTypeFilter("all");
                  setAccessFilter("all");
                }}
                className="self-end px-3 py-1.5 text-sm text-red-600 hover:text-red-700"
              >
                {t("actions.reset")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Liste */}
      {filteredProviders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {t("admin:prestataires.empty.title")}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || typeFilter !== "all" || accessFilter !== "all"
              ? t("admin:prestataires.empty.description")
              : t("empty.modifyFilters")}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Plus className="w-4 h-4" />
            {t("admin:prestataires.addProvider")}
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onToggleAccess={handleToggleAccess}
                isUpdating={updatingId === provider.id}
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
                    {t("loading")}
                  </>
                ) : (
                  <>
                    {t("admin:prestataires.loadMore")}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && providers.length >= PAGE_SIZE && (
            <p className="text-center text-sm text-gray-500 mt-6">
              {providers.length}
            </p>
          )}
        </>
      )}

      {/* Modal ajout */}
      <AddProviderModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddProvider}
        t={t}
      />
    </div>
  );
}