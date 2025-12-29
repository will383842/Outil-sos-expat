/**
 * =============================================================================
 * PAGE PAYS - Gestion des pays configurés
 * =============================================================================
 *
 * CRUD complet pour la configuration des pays :
 * - Liste avec recherche et filtres
 * - Création / Modification / Suppression
 * - Configuration par pays (préfixe tel, devise, timezone)
 * - Activation/désactivation
 */

import { useEffect, useState, useCallback, memo } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useLanguage } from "../../hooks/useLanguage";
import { useAuth } from "../../contexts/UnifiedUserContext";
import { logAuditEntry } from "../../lib/auditLog";

// UI
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Skeleton } from "../../components/ui/skeleton";

// Icons
import {
  Globe,
  Plus,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Phone,
  DollarSign,
  Clock,
  Flag,
  MoreVertical,
  Filter,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface CountryConfig {
  id: string;
  code: string;
  name: string;
  nameFr: string;
  nameEn: string;
  flag: string;
  phonePrefix: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  active: boolean;
  lawyersAvailable: boolean;
  expertsAvailable: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

interface CountryFormData {
  code: string;
  name: string;
  nameFr: string;
  nameEn: string;
  flag: string;
  phonePrefix: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  active: boolean;
  lawyersAvailable: boolean;
  expertsAvailable: boolean;
}

const EMPTY_FORM: CountryFormData = {
  code: "",
  name: "",
  nameFr: "",
  nameEn: "",
  flag: "",
  phonePrefix: "+",
  currency: "EUR",
  currencySymbol: "€",
  timezone: "Europe/Paris",
  active: true,
  lawyersAvailable: false,
  expertsAvailable: false,
};

// =============================================================================
// COMPOSANTS
// =============================================================================

const CountryCard = memo(function CountryCard({
  country,
  onEdit,
  onDelete,
  onToggleActive,
  t,
}: {
  country: CountryConfig;
  onEdit: (country: CountryConfig) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{country.flag || "🌍"}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{country.name}</h3>
            <p className="text-sm text-gray-500">{country.code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={country.active}
            onCheckedChange={(checked) => onToggleActive(country.id, checked)}
          />
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
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                  <button
                    onClick={() => {
                      onEdit(country);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                    {t("common:actions.edit")}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(t("pays.confirmDelete", { name: country.name }))) {
                        onDelete(country.id);
                      }
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("common:actions.delete")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Phone className="w-4 h-4 text-gray-400" />
          <span>{country.phonePrefix || "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <span>{country.currency} ({country.currencySymbol})</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="truncate">{country.timezone || "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          {country.active ? (
            <span className="inline-flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              {t("common:status.active")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-gray-400">
              <XCircle className="w-4 h-4" />
              {t("common:status.inactive")}
            </span>
          )}
        </div>
      </div>

      {/* Services disponibles */}
      <div className="mt-3 flex gap-2">
        {country.lawyersAvailable && (
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            {t("pays.services.lawyers")}
          </span>
        )}
        {country.expertsAvailable && (
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
            {t("pays.services.experts")}
          </span>
        )}
        {!country.lawyersAvailable && !country.expertsAvailable && (
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">
            {t("pays.services.none")}
          </span>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// MODAL FORMULAIRE
// =============================================================================

function CountryFormModal({
  isOpen,
  onClose,
  country,
  onSave,
  saving,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  country: CountryConfig | null;
  onSave: (data: CountryFormData) => void;
  saving: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [form, setForm] = useState<CountryFormData>(EMPTY_FORM);

  useEffect(() => {
    if (country) {
      setForm({
        code: country.code,
        name: country.name,
        nameFr: country.nameFr || country.name,
        nameEn: country.nameEn || country.name,
        flag: country.flag,
        phonePrefix: country.phonePrefix,
        currency: country.currency,
        currencySymbol: country.currencySymbol,
        timezone: country.timezone,
        active: country.active,
        lawyersAvailable: country.lawyersAvailable,
        expertsAvailable: country.expertsAvailable,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [country, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {country ? t("pays.editCountry") : t("pays.addCountry")}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Code et flag */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("pays.form.code")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                maxLength={3}
                placeholder="FR, TH, US..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={!!country}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("pays.form.flag")}
              </label>
              <input
                type="text"
                value={form.flag}
                onChange={(e) => setForm({ ...form, flag: e.target.value })}
                placeholder="🇫🇷"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-2xl"
              />
            </div>
          </div>

          {/* Noms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("pays.form.name")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="France, Thaïlande..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("pays.form.nameFr")}
              </label>
              <input
                type="text"
                value={form.nameFr}
                onChange={(e) => setForm({ ...form, nameFr: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("pays.form.nameEn")}
              </label>
              <input
                type="text"
                value={form.nameEn}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Téléphone et devise */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("pays.form.phonePrefix")}
              </label>
              <input
                type="text"
                value={form.phonePrefix}
                onChange={(e) => setForm({ ...form, phonePrefix: e.target.value })}
                placeholder="+33"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("pays.form.timezone")}
              </label>
              <input
                type="text"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="Europe/Paris"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("pays.form.currency")}
              </label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                maxLength={3}
                placeholder="EUR, THB..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("pays.form.currencySymbol")}
              </label>
              <input
                type="text"
                value={form.currencySymbol}
                onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                placeholder="€, ฿..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{t("pays.form.active")}</p>
                <p className="text-xs text-gray-500">{t("pays.form.activeDesc")}</p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{t("pays.form.lawyersAvailable")}</p>
                <p className="text-xs text-gray-500">{t("pays.form.lawyersAvailableDesc")}</p>
              </div>
              <Switch
                checked={form.lawyersAvailable}
                onCheckedChange={(checked) => setForm({ ...form, lawyersAvailable: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{t("pays.form.expertsAvailable")}</p>
                <p className="text-xs text-gray-500">{t("pays.form.expertsAvailableDesc")}</p>
              </div>
              <Switch
                checked={form.expertsAvailable}
                onCheckedChange={(checked) => setForm({ ...form, expertsAvailable: checked })}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t("common:actions.cancel")}
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={saving || !form.code || !form.name}
            className="bg-red-600 hover:bg-red-700"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {t("common:actions.saving")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t("common:actions.save")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

export default function Pays() {
  const { t } = useLanguage({ mode: "admin" });
  const { user } = useAuth();
  const [countries, setCountries] = useState<CountryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<CountryConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Charger les pays
  const loadCountries = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, "countryConfigs"), orderBy("name")));
      const rows = snap.docs.map((d) => ({
        id: d.id,
        code: d.id,
        name: d.data().name || d.id,
        nameFr: d.data().nameFr || d.data().name || d.id,
        nameEn: d.data().nameEn || d.data().name || d.id,
        flag: d.data().flag || "",
        phonePrefix: d.data().phonePrefix || "",
        currency: d.data().currency || "EUR",
        currencySymbol: d.data().currencySymbol || "€",
        timezone: d.data().timezone || "",
        active: d.data().active ?? true,
        lawyersAvailable: d.data().lawyersAvailable ?? false,
        expertsAvailable: d.data().expertsAvailable ?? false,
        createdAt: d.data().createdAt,
        updatedAt: d.data().updatedAt,
      })) as CountryConfig[];
      setCountries(rows);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : t("common:errors.generic");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  // Sauvegarder un pays
  const handleSave = async (data: CountryFormData) => {
    setSaving(true);
    try {
      const docId = editingCountry?.id || data.code.toUpperCase();
      await setDoc(doc(db, "countryConfigs", docId), {
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: user?.email || "admin",
        ...(editingCountry ? {} : { createdAt: Timestamp.now() }),
      });

      await logAuditEntry({
        action: editingCountry ? "country.update" : "country.create",
        targetType: "country",
        targetId: docId,
        details: { data },
        severity: "info",
      });

      setIsModalOpen(false);
      setEditingCountry(null);
      loadCountries();
    } catch (e) {
      console.error("Error saving country:", e);
    } finally {
      setSaving(false);
    }
  };

  // Supprimer un pays
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "countryConfigs", id));
      await logAuditEntry({
        action: "country.delete",
        targetType: "country",
        targetId: id,
        severity: "warning",
      });
      loadCountries();
    } catch (e) {
      console.error("Error deleting country:", e);
    }
  };

  // Toggle actif
  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await setDoc(
        doc(db, "countryConfigs", id),
        { active, updatedAt: Timestamp.now() },
        { merge: true }
      );
      setCountries((prev) =>
        prev.map((c) => (c.id === id ? { ...c, active } : c))
      );
    } catch (e) {
      console.error("Error toggling active:", e);
    }
  };

  // Filtrage
  const filteredCountries = countries.filter((country) => {
    const matchesSearch =
      !searchTerm ||
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterActive === "all" ||
      (filterActive === "active" && country.active) ||
      (filterActive === "inactive" && !country.active);

    return matchesSearch && matchesFilter;
  });

  // Stats
  const stats = {
    total: countries.length,
    active: countries.filter((c) => c.active).length,
    withLawyers: countries.filter((c) => c.lawyersAvailable).length,
    withExperts: countries.filter((c) => c.expertsAvailable).length,
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-7 h-7 text-red-600" />
            {t("pays.title")}
          </h1>
          <p className="text-gray-600 mt-1">{t("pays.description")}</p>
        </div>
        <Button
          onClick={() => {
            setEditingCountry(null);
            setIsModalOpen(true);
          }}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("pays.addCountry")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gray-100 text-gray-700">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">{t("pays.stats.total")}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100 text-green-700">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
              <div className="text-sm text-gray-600">{t("pays.stats.active")}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-700">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.withLawyers}</div>
              <div className="text-sm text-gray-600">{t("pays.stats.withLawyers")}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-700">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.withExperts}</div>
              <div className="text-sm text-gray-600">{t("pays.stats.withExperts")}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche et filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("pays.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{t("common:all")}</option>
                <option value="active">{t("pays.filters.activeOnly")}</option>
                <option value="inactive">{t("pays.filters.inactiveOnly")}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des pays */}
      {filteredCountries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {t("pays.empty.title")}
          </h3>
          <p className="text-gray-600">
            {searchTerm || filterActive !== "all"
              ? t("common:empty.modifyFilters")
              : t("pays.empty.addFirst")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCountries.map((country) => (
            <CountryCard
              key={country.id}
              country={country}
              onEdit={(c) => {
                setEditingCountry(c);
                setIsModalOpen(true);
              }}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Modal formulaire */}
      <CountryFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCountry(null);
        }}
        country={editingCountry}
        onSave={handleSave}
        saving={saving}
        t={t}
      />
    </div>
  );
}
