/**
 * =============================================================================
 * PAGE UTILISATEURS — Gestion de l'équipe admin
 * Création/modification des comptes admin, agent
 * =============================================================================
 */

import { useEffect, useState } from "react";
import { useLanguage } from "../../hooks/useLanguage";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  Users,
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Calendar,
  MoreVertical,
  Trash2,
  Edit2,
  RefreshCw,
  AlertCircle,
  Search,
  UserPlus,
  ChevronRight,
  UsersRound,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Switch } from "../../components/ui/switch";

// =============================================================================
// TYPES
// =============================================================================

interface UserAccount {
  id: string;
  email?: string;
  displayName?: string;
  role?: "admin" | "agent" | "provider";
  isMultiProvider?: boolean; // Peut gérer plusieurs prestataires
  photoURL?: string;
  lastLogin?: Timestamp;
  createdAt?: Timestamp;
  disabled?: boolean;
}

const ROLE_CONFIG = {
  admin: {
    labelKey: "utilisateurs.roles.admin",
    color: "bg-purple-100 text-purple-800",
    icon: ShieldCheck,
    descriptionKey: "utilisateurs.roleDescriptions.admin",
  },
  agent: {
    labelKey: "utilisateurs.roles.agent",
    color: "bg-blue-100 text-blue-800",
    icon: Shield,
    descriptionKey: "utilisateurs.roleDescriptions.agent",
  },
  provider: {
    labelKey: "utilisateurs.roles.provider",
    color: "bg-green-100 text-green-800",
    icon: User,
    descriptionKey: "utilisateurs.roleDescriptions.provider",
  },
};

// =============================================================================
// COMPOSANTS
// =============================================================================

function UserCard({
  user,
  onChangeRole,
  onToggleMultiProvider,
  onDelete,
  isUpdating,
}: {
  user: UserAccount;
  onChangeRole: (userId: string, newRole: UserAccount["role"]) => void;
  onToggleMultiProvider: (userId: string, isMulti: boolean) => void;
  onDelete: (userId: string) => void;
  isUpdating: boolean;
}) {
  const { t } = useLanguage({ mode: "admin" });
  const [showMenu, setShowMenu] = useState(false);
  const role = user.role || "agent";
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.agent;
  const RoleIcon = roleConfig.icon;

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return "—";
    return timestamp.toDate().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-gray-400" />
            )}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              {user.displayName || t("utilisateurs.noName")}
            </h3>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              {user.email || "—"}
            </p>
          </div>
        </div>

        {/* Menu actions */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                <button
                  onClick={() => {
                    onChangeRole(user.id, "admin");
                    setShowMenu(false);
                  }}
                  disabled={isUpdating || role === "admin"}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  {t("utilisateurs.setAdmin")}
                </button>
                <button
                  onClick={() => {
                    onChangeRole(user.id, "agent");
                    setShowMenu(false);
                  }}
                  disabled={isUpdating || role === "agent"}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-blue-600" />
                  {t("utilisateurs.setAgent")}
                </button>
                <button
                  onClick={() => {
                    onChangeRole(user.id, "provider");
                    setShowMenu(false);
                  }}
                  disabled={isUpdating || role === "provider"}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-green-600" />
                  {t("utilisateurs.setProvider")}
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    if (window.confirm(t("utilisateurs.confirmDelete"))) {
                      onDelete(user.id);
                    }
                    setShowMenu(false);
                  }}
                  disabled={isUpdating}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t("common:actions.delete")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Role badge et infos */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${roleConfig.color}`}
          >
            <RoleIcon className="w-3.5 h-3.5" />
            {t(roleConfig.labelKey)}
          </span>
          {user.isMultiProvider && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              <UsersRound className="w-3 h-3" />
              Multi
            </span>
          )}
        </div>

        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {t("utilisateurs.createdOn", { date: formatDate(user.createdAt) })}
        </span>
      </div>

      {/* Multi-provider toggle - only for provider role */}
      {role === "provider" && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UsersRound className="w-4 h-4 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {t("utilisateurs.multiProvider")}
                </p>
                <p className="text-xs text-gray-500">
                  {t("utilisateurs.multiProviderDescription")}
                </p>
              </div>
            </div>
            <Switch
              checked={user.isMultiProvider || false}
              onCheckedChange={(checked) => onToggleMultiProvider(user.id, checked)}
              disabled={isUpdating}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

export default function Utilisateurs() {
  const { t } = useLanguage({ mode: "admin" });
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination - PERFORMANCE: Limite à 50 éléments par page
  const PAGE_SIZE = 50;
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Charger les utilisateurs
  // PERFORMANCE: Limité à PAGE_SIZE éléments pour éviter surcharge
  useEffect(() => {
    setLoading(true);
    setError(null);
    setUsers([]);
    setLastDoc(null);
    setHasMore(true);

    const q = query(
      collection(db, "users"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserAccount[];
        setUsers(data);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        setLoading(false);
      },
      (err) => {
        console.error("Erreur chargement utilisateurs:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Charger plus d'utilisateurs (pagination)
  const loadMore = async () => {
    if (!lastDoc || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "users"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const newData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserAccount[];

      setUsers((prev) => [...prev, ...newData]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Erreur chargement supplémentaire:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Changer le rôle
  const handleChangeRole = async (userId: string, newRole: UserAccount["role"]) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Erreur changement rôle:", err);
    } finally {
      setUpdating(false);
    }
  };

  // Toggle multi-provider
  const handleToggleMultiProvider = async (userId: string, isMulti: boolean) => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        isMultiProvider: isMulti,
        updatedAt: serverTimestamp(),
      });
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isMultiProvider: isMulti } : u))
      );
    } catch (err) {
      console.error("Erreur toggle multi-provider:", err);
    } finally {
      setUpdating(false);
    }
  };

  // Supprimer un utilisateur
  const handleDelete = async (userId: string) => {
    setUpdating(true);
    try {
      await deleteDoc(doc(db, "users", userId));
    } catch (err) {
      console.error("Erreur suppression:", err);
    } finally {
      setUpdating(false);
    }
  };

  // Filtrage
  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(search) ||
      user.displayName?.toLowerCase().includes(search)
    );
  });

  // Stats
  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    agents: users.filter((u) => u.role === "agent").length,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("utilisateurs.title")}</h1>
          <p className="text-gray-600 mt-1">
            {t("utilisateurs.description")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gray-100 text-gray-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">{t("utilisateurs.stats.total")}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-100 text-purple-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.admins}</div>
            <div className="text-sm text-gray-600">{t("utilisateurs.stats.admins")}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-100 text-blue-700">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.agents}</div>
            <div className="text-sm text-gray-600">{t("utilisateurs.stats.agents")}</div>
          </div>
        </div>
      </div>

      {/* Info rôles */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">{t("utilisateurs.availableRoles")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(ROLE_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div key={key} className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${config.color.replace("text-", "bg-").replace("800", "100")}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{t(config.labelKey)}</p>
                  <p className="text-xs text-gray-600">{t(config.descriptionKey)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("utilisateurs.search")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Liste */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {t("utilisateurs.empty.title")}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? t("utilisateurs.empty.modifySearch")
              : t("utilisateurs.empty.usersWillAppear")}
          </p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            {t("utilisateurs.note")}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onChangeRole={handleChangeRole}
                onToggleMultiProvider={handleToggleMultiProvider}
                onDelete={handleDelete}
                isUpdating={updating}
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
                    {t("utilisateurs.loadMore")}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && users.length >= PAGE_SIZE && (
            <p className="text-center text-sm text-gray-500 mt-6">
              {t("utilisateurs.allLoaded", { count: users.length })}
            </p>
          )}
        </>
      )}

      {/* Note d'info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">{t("utilisateurs.important")}</h4>
            <p
              className="text-sm text-amber-700 mt-1"
              dangerouslySetInnerHTML={{ __html: t("utilisateurs.importantNote") }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
