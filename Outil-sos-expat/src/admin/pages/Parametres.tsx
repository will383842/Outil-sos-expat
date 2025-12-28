/**
 * =============================================================================
 * PAGE PARAMETRES - Paramètres généraux de la plateforme
 * =============================================================================
 *
 * Configuration générale :
 * - Informations de la plateforme
 * - Mode maintenance
 * - Paramètres de notification
 * - Intégrations externes
 * - Liens de support
 */

import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useLanguage } from "../../hooks/useLanguage";
import { useAuth } from "../../contexts/UnifiedUserContext";
import { logAuditEntry } from "../../lib/auditLog";

// UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Skeleton } from "../../components/ui/skeleton";

// Icons
import {
  Settings,
  Save,
  RefreshCw,
  Building2,
  Mail,
  Bell,
  Link2,
  Shield,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Globe,
  Phone,
  MapPin,
  Clock,
  Info,
  Wrench,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface PlatformSettings {
  // Infos plateforme
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  mainWebsite: string;

  // Mode maintenance
  maintenanceMode: boolean;
  maintenanceMessage: string;

  // Notifications
  emailNotificationsEnabled: boolean;
  notifyOnNewDossier: boolean;
  notifyOnNewMessage: boolean;
  notifyOnProviderSignup: boolean;

  // Intégrations
  laravelApiEnabled: boolean;
  laravelApiUrl: string;
  stripeEnabled: boolean;

  // Dernière mise à jour
  updatedAt?: Timestamp;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: "SOS-Expat",
  supportEmail: "support@sos-expat.com",
  supportPhone: "+33 1 00 00 00 00",
  mainWebsite: "https://sos-expat.com",
  maintenanceMode: false,
  maintenanceMessage: "La plateforme est en maintenance. Nous serons de retour bientot.",
  emailNotificationsEnabled: true,
  notifyOnNewDossier: true,
  notifyOnNewMessage: true,
  notifyOnProviderSignup: true,
  laravelApiEnabled: true,
  laravelApiUrl: "https://sos-expat.com/api",
  stripeEnabled: true,
};

// =============================================================================
// COMPOSANTS
// =============================================================================

function SettingCard({
  title,
  description,
  icon: Icon,
  iconColor,
  children,
  loading,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

function InputSetting({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "url" | "tel";
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
}

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

export default function Parametres() {
  const { t } = useLanguage({ mode: "admin" });
  const { user } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Charger les parametres
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const docRef = doc(db, "settings", "platform");
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Mettre a jour un parametre
  const updateSetting = <K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Sauvegarder
  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "platform"), {
        ...settings,
        updatedAt: Timestamp.now(),
        updatedBy: user?.email || "admin",
      });

      await logAuditEntry({
        action: "settings.update",
        targetType: "platform_settings",
        targetId: "platform",
        details: { settings },
        severity: "info",
      });

      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-gray-600" />
            {t("parametres.title")}
          </h1>
          <p className="text-gray-600 mt-1">{t("parametres.description")}</p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              Enregistre
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-red-600 hover:bg-red-700"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Mode Maintenance Warning */}
      {settings.maintenanceMode && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Mode maintenance actif</p>
              <p className="text-sm text-amber-700 mt-1">
                Les utilisateurs voient le message de maintenance au lieu de la plateforme.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informations plateforme */}
        <SettingCard
          title="Informations plateforme"
          description="Nom et coordonnees de contact"
          icon={Building2}
          iconColor="text-blue-600"
          loading={loading}
        >
          <div className="space-y-4">
            <InputSetting
              label="Nom de la plateforme"
              value={settings.platformName}
              onChange={(v) => updateSetting("platformName", v)}
              placeholder="SOS-Expat"
            />
            <InputSetting
              label="Email de support"
              value={settings.supportEmail}
              onChange={(v) => updateSetting("supportEmail", v)}
              type="email"
              placeholder="support@sos-expat.com"
            />
            <InputSetting
              label="Telephone de support"
              value={settings.supportPhone}
              onChange={(v) => updateSetting("supportPhone", v)}
              type="tel"
              placeholder="+33 1 00 00 00 00"
            />
            <InputSetting
              label="Site web principal"
              value={settings.mainWebsite}
              onChange={(v) => updateSetting("mainWebsite", v)}
              type="url"
              placeholder="https://sos-expat.com"
            />
          </div>
        </SettingCard>

        {/* Mode maintenance */}
        <SettingCard
          title="Mode maintenance"
          description="Suspendre l'acces a la plateforme"
          icon={Wrench}
          iconColor="text-amber-600"
          loading={loading}
        >
          <div className="space-y-4">
            <ToggleSetting
              label="Activer le mode maintenance"
              description="Affiche un message de maintenance aux utilisateurs"
              checked={settings.maintenanceMode}
              onChange={(v) => updateSetting("maintenanceMode", v)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message de maintenance
              </label>
              <textarea
                value={settings.maintenanceMessage}
                onChange={(e) => updateSetting("maintenanceMessage", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="La plateforme est en maintenance..."
              />
            </div>
          </div>
        </SettingCard>

        {/* Notifications */}
        <SettingCard
          title="Notifications"
          description="Configurer les notifications par email"
          icon={Bell}
          iconColor="text-purple-600"
          loading={loading}
        >
          <div className="space-y-3">
            <ToggleSetting
              label="Notifications email"
              description="Activer les notifications par email"
              checked={settings.emailNotificationsEnabled}
              onChange={(v) => updateSetting("emailNotificationsEnabled", v)}
            />
            <ToggleSetting
              label="Nouveau dossier"
              description="Notifier quand un nouveau dossier est cree"
              checked={settings.notifyOnNewDossier}
              onChange={(v) => updateSetting("notifyOnNewDossier", v)}
              disabled={!settings.emailNotificationsEnabled}
            />
            <ToggleSetting
              label="Nouveau message"
              description="Notifier quand un message est recu"
              checked={settings.notifyOnNewMessage}
              onChange={(v) => updateSetting("notifyOnNewMessage", v)}
              disabled={!settings.emailNotificationsEnabled}
            />
            <ToggleSetting
              label="Inscription prestataire"
              description="Notifier quand un prestataire s'inscrit"
              checked={settings.notifyOnProviderSignup}
              onChange={(v) => updateSetting("notifyOnProviderSignup", v)}
              disabled={!settings.emailNotificationsEnabled}
            />
          </div>
        </SettingCard>

        {/* Integrations */}
        <SettingCard
          title="Integrations"
          description="Connexions aux services externes"
          icon={Link2}
          iconColor="text-green-600"
          loading={loading}
        >
          <div className="space-y-4">
            <ToggleSetting
              label="API Laravel (sos-expat.com)"
              description="Synchronisation avec le site principal"
              checked={settings.laravelApiEnabled}
              onChange={(v) => updateSetting("laravelApiEnabled", v)}
            />

            {settings.laravelApiEnabled && (
              <InputSetting
                label="URL de l'API Laravel"
                value={settings.laravelApiUrl}
                onChange={(v) => updateSetting("laravelApiUrl", v)}
                type="url"
                placeholder="https://sos-expat.com/api"
              />
            )}

            <ToggleSetting
              label="Stripe (paiements)"
              description="Gestion des abonnements via Stripe"
              checked={settings.stripeEnabled}
              onChange={(v) => updateSetting("stripeEnabled", v)}
            />

            <div className="pt-2">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Les cles API sont configurees via les variables d'environnement
              </p>
            </div>
          </div>
        </SettingCard>
      </div>

      {/* Liens utiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="w-5 h-5 text-gray-600" />
            Liens utiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Firebase Console</p>
                <p className="text-xs text-gray-500">Base de donnees</p>
              </div>
            </a>

            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <Globe className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Stripe Dashboard</p>
                <p className="text-xs text-gray-500">Paiements</p>
              </div>
            </a>

            <a
              href="https://sos-expat.com/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">SOS-Expat Admin</p>
                <p className="text-xs text-gray-500">Site principal</p>
              </div>
            </a>

            <a
              href="https://cloud.google.com/console"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Google Cloud</p>
                <p className="text-xs text-gray-500">Functions & API</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Info derniere mise a jour */}
      {settings.updatedAt && (
        <p className="text-sm text-gray-500 text-center">
          Derniere mise a jour: {settings.updatedAt.toDate().toLocaleString("fr-FR")}
          {settings.updatedBy && ` par ${settings.updatedBy}`}
        </p>
      )}
    </div>
  );
}
