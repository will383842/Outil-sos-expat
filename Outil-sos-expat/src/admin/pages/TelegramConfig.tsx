/**
 * =============================================================================
 * TELEGRAM CONFIG - Configuration des notifications Telegram
 * =============================================================================
 *
 * Page d'administration pour configurer les notifications Telegram :
 * - Validation du bot token
 * - Configuration du Chat ID
 * - Parametres de notifications par type
 * - Test des notifications
 *
 * =============================================================================
 */

import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../lib/firebase";
import { logAuditEntry } from "../../lib/auditLog";
import { useAuth } from "../../contexts/UnifiedUserContext";
import { useLanguage } from "../../hooks/useLanguage";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";

// Icons
import {
  Send,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Bot,
  MessageSquare,
  Bell,
  TestTube,
  Copy,
  ExternalLink,
  Users,
  Phone,
  CreditCard,
  FileText,
  Settings,
  ChevronDown,
} from "lucide-react";

// =============================================================================
// FIREBASE FUNCTIONS SETUP
// =============================================================================

const functions = getFunctions(undefined, "europe-west1");

// Callable functions - names must match the exports from firebase functions
const validateTelegramBot = httpsCallable<
  Record<string, never>,
  { ok: boolean; botUsername?: string; error?: string }
>(functions, "telegram_validateBot");

const getTelegramChatId = httpsCallable<
  Record<string, never>,
  { ok: boolean; chatId?: string; username?: string; firstName?: string; error?: string }
>(functions, "telegram_getChatId");

const sendTelegramTestNotification = httpsCallable<
  { eventType: string; chatId?: string },
  { success: boolean; messageId?: string; error?: string }
>(functions, "telegram_sendTestNotification");

// =============================================================================
// TYPES
// =============================================================================

interface TelegramSettings {
  // Bot status
  botValidated: boolean;
  botUsername: string;
  chatId: string;

  // Notification settings
  notifications: {
    newSignups: {
      enabled: boolean;
      roles: {
        client: boolean;
        lawyer: boolean;
        expert: boolean;
      };
    };
    callsCompleted: {
      enabled: boolean;
      minDurationMinutes: number;
    };
    paymentsReceived: {
      enabled: boolean;
      minAmountEur: number;
    };
    dailyReport: {
      enabled: boolean;
    };
  };

  // Metadata
  updatedAt?: Timestamp;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: TelegramSettings = {
  botValidated: false,
  botUsername: "",
  chatId: "",
  notifications: {
    newSignups: {
      enabled: true,
      roles: {
        client: false,
        lawyer: true,
        expert: true,
      },
    },
    callsCompleted: {
      enabled: true,
      minDurationMinutes: 5,
    },
    paymentsReceived: {
      enabled: true,
      minAmountEur: 10,
    },
    dailyReport: {
      enabled: true,
    },
  },
};

type NotificationType = "newSignup" | "callCompleted" | "paymentReceived" | "dailyReport";

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
        {description && <CardDescription>{description}</CardDescription>}
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
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function CheckboxSetting({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
      />
      <span className={`text-sm ${disabled ? "text-gray-400" : "text-gray-700"}`}>{label}</span>
    </label>
  );
}

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

export default function TelegramConfig() {
  const { user } = useAuth();
  const { t } = useLanguage({ mode: "admin" });

  // State
  const [settings, setSettings] = useState<TelegramSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Bot validation state
  const [validatingBot, setValidatingBot] = useState(false);
  const [botValidationError, setBotValidationError] = useState<string | null>(null);

  // Chat ID state
  const [fetchingChatId, setFetchingChatId] = useState(false);
  const [chatIdError, setChatIdError] = useState<string | null>(null);

  // Test notification state
  const [testType, setTestType] = useState<NotificationType>("newSignup");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // =============================================================================
  // CHARGEMENT DES PARAMETRES
  // =============================================================================

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const docRef = doc(db, "settings", "telegram");
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
          notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...data.notifications,
            newSignups: {
              ...DEFAULT_SETTINGS.notifications.newSignups,
              ...data.notifications?.newSignups,
              roles: {
                ...DEFAULT_SETTINGS.notifications.newSignups.roles,
                ...data.notifications?.newSignups?.roles,
              },
            },
            callsCompleted: {
              ...DEFAULT_SETTINGS.notifications.callsCompleted,
              ...data.notifications?.callsCompleted,
            },
            paymentsReceived: {
              ...DEFAULT_SETTINGS.notifications.paymentsReceived,
              ...data.notifications?.paymentsReceived,
            },
            dailyReport: {
              ...DEFAULT_SETTINGS.notifications.dailyReport,
              ...data.notifications?.dailyReport,
            },
          },
        });
      }
    } catch (error) {
      console.error("[TelegramConfig] Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // =============================================================================
  // MISE A JOUR DES PARAMETRES
  // =============================================================================

  const updateSetting = <K extends keyof TelegramSettings>(
    key: K,
    value: TelegramSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const updateNotificationSetting = <K extends keyof TelegramSettings["notifications"]>(
    key: K,
    value: TelegramSettings["notifications"][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // =============================================================================
  // SAUVEGARDE
  // =============================================================================

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "telegram"), {
        ...settings,
        updatedAt: Timestamp.now(),
        updatedBy: user?.email || "admin",
      });

      await logAuditEntry({
        action: "settings.update",
        targetType: "telegram_settings",
        targetId: "telegram",
        details: { settings },
        severity: "info",
      });

      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("[TelegramConfig] Erreur sauvegarde:", error);
    } finally {
      setSaving(false);
    }
  };

  // =============================================================================
  // VALIDATION DU BOT
  // =============================================================================

  const handleValidateBot = async () => {
    setValidatingBot(true);
    setBotValidationError(null);

    try {
      const result = await validateTelegramBot({});

      if (result.data.ok && result.data.botUsername) {
        setSettings((prev) => ({
          ...prev,
          botValidated: true,
          botUsername: result.data.botUsername || "",
        }));
        setHasChanges(true);
      } else {
        setBotValidationError(result.data.error || "Erreur de validation du bot");
      }
    } catch (error) {
      console.error("[TelegramConfig] Erreur validation bot:", error);
      setBotValidationError(
        error instanceof Error ? error.message : "Erreur inconnue"
      );
    } finally {
      setValidatingBot(false);
    }
  };

  // =============================================================================
  // RECUPERATION DU CHAT ID
  // =============================================================================

  const handleGetChatId = async () => {
    setFetchingChatId(true);
    setChatIdError(null);

    try {
      const result = await getTelegramChatId({});

      if (result.data.ok && result.data.chatId) {
        setSettings((prev) => ({
          ...prev,
          chatId: result.data.chatId || "",
        }));
        setHasChanges(true);
      } else {
        setChatIdError(
          result.data.error || "Aucun message trouve. Envoyez /start au bot d'abord."
        );
      }
    } catch (error) {
      console.error("[TelegramConfig] Erreur recuperation Chat ID:", error);
      setChatIdError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setFetchingChatId(false);
    }
  };

  // =============================================================================
  // ENVOI DE TEST
  // =============================================================================

  const handleSendTest = async () => {
    setSendingTest(true);
    setTestResult(null);

    try {
      const result = await sendTelegramTestNotification({ eventType: testType });

      if (result.data.success) {
        setTestResult({
          success: true,
          message: `Notification envoyee avec succes (ID: ${result.data.messageId})`,
        });
      } else {
        setTestResult({
          success: false,
          message: result.data.error || "Erreur d'envoi",
        });
      }
    } catch (error) {
      console.error("[TelegramConfig] Erreur envoi test:", error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Erreur inconnue",
      });
    } finally {
      setSendingTest(false);
    }
  };

  // =============================================================================
  // COPIER DANS LE PRESSE-PAPIER
  // =============================================================================

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // =============================================================================
  // RENDU
  // =============================================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Send className="w-7 h-7 text-blue-500" />
            Configuration Telegram
          </h1>
          <p className="text-gray-600 mt-1">
            Configurez les notifications Telegram pour l'equipe d'administration
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              Enregistre
            </span>
          )}
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Modifications non enregistrees
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-blue-600 hover:bg-blue-700"
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

      {/* Bot Status Card */}
      <SettingCard
        title="Statut du Bot"
        description="Validez la connexion avec votre bot Telegram"
        icon={Bot}
        iconColor="text-blue-600"
      >
        <div className="space-y-4">
          {/* Status indicator */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  settings.botValidated ? "bg-green-500 animate-pulse" : "bg-gray-300"
                }`}
              />
              <div>
                <p className="font-medium text-gray-900">
                  {settings.botValidated ? "Bot valide" : "Bot non valide"}
                </p>
                {settings.botValidated && settings.botUsername && (
                  <p className="text-sm text-gray-500">@{settings.botUsername}</p>
                )}
              </div>
            </div>
            <Button
              onClick={handleValidateBot}
              disabled={validatingBot}
              variant="outline"
              size="sm"
            >
              {validatingBot ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Valider le bot
            </Button>
          </div>

          {/* Validation error */}
          {botValidationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {botValidationError}
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800 mb-2">
                  Configuration du Bot Token
                </p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>
                    Creez un bot avec{" "}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      @BotFather
                    </a>{" "}
                    sur Telegram
                  </li>
                  <li>Copiez le token du bot</li>
                  <li>
                    Ajoutez-le aux Firebase Secrets :<br />
                    <code className="bg-blue-100 px-2 py-1 rounded text-xs">
                      firebase functions:secrets:set TELEGRAM_BOT_TOKEN
                    </code>
                  </li>
                  <li>Redeployez les fonctions Cloud</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </SettingCard>

      {/* Chat ID Configuration Card */}
      <SettingCard
        title="Configuration du Chat ID"
        description="Identifiant du chat ou groupe qui recevra les notifications"
        icon={MessageSquare}
        iconColor="text-green-600"
      >
        <div className="space-y-4">
          {/* Current Chat ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chat ID actuel
            </label>
            <div className="flex gap-2">
              <Input
                value={settings.chatId}
                onChange={(e) => updateSetting("chatId", e.target.value)}
                placeholder="Ex: -1001234567890"
                className="flex-1"
              />
              {settings.chatId && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(settings.chatId)}
                  title="Copier"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Fetch Chat ID button */}
          <Button
            onClick={handleGetChatId}
            disabled={fetchingChatId || !settings.botValidated}
            variant="outline"
            className="w-full"
          >
            {fetchingChatId ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4 mr-2" />
            )}
            Recuperer Chat ID
          </Button>

          {/* Chat ID error */}
          {chatIdError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {chatIdError}
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 mb-2">
                  Comment obtenir le Chat ID
                </p>
                <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                  <li>Ouvrez Telegram</li>
                  <li>
                    Recherchez{" "}
                    <strong>@{settings.botUsername || "sosexpat_admin_bot"}</strong>
                  </li>
                  <li>
                    Envoyez <code className="bg-green-100 px-1 rounded">/start</code>
                  </li>
                  <li>Cliquez sur "Recuperer Chat ID" ci-dessus</li>
                </ol>
                <p className="text-xs text-green-600 mt-2">
                  Pour un groupe, ajoutez le bot au groupe et envoyez /start dans le
                  groupe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SettingCard>

      {/* Notifications Settings Card */}
      <SettingCard
        title="Parametres des notifications"
        description="Choisissez les evenements qui declenchent une notification"
        icon={Bell}
        iconColor="text-purple-600"
      >
        <div className="space-y-6">
          {/* Nouvelles inscriptions */}
          <div className="space-y-3">
            <ToggleSetting
              label="Nouvelles inscriptions"
              description="Recevoir une notification pour chaque nouvelle inscription"
              checked={settings.notifications.newSignups.enabled}
              onChange={(checked) =>
                updateNotificationSetting("newSignups", {
                  ...settings.notifications.newSignups,
                  enabled: checked,
                })
              }
            />
            {settings.notifications.newSignups.enabled && (
              <div className="ml-6 p-3 bg-gray-50 rounded-lg space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Types d'utilisateurs :
                </p>
                <div className="flex flex-wrap gap-4">
                  <CheckboxSetting
                    label="Clients"
                    checked={settings.notifications.newSignups.roles.client}
                    onChange={(checked) =>
                      updateNotificationSetting("newSignups", {
                        ...settings.notifications.newSignups,
                        roles: {
                          ...settings.notifications.newSignups.roles,
                          client: checked,
                        },
                      })
                    }
                  />
                  <CheckboxSetting
                    label="Avocats"
                    checked={settings.notifications.newSignups.roles.lawyer}
                    onChange={(checked) =>
                      updateNotificationSetting("newSignups", {
                        ...settings.notifications.newSignups,
                        roles: {
                          ...settings.notifications.newSignups.roles,
                          lawyer: checked,
                        },
                      })
                    }
                  />
                  <CheckboxSetting
                    label="Experts"
                    checked={settings.notifications.newSignups.roles.expert}
                    onChange={(checked) =>
                      updateNotificationSetting("newSignups", {
                        ...settings.notifications.newSignups,
                        roles: {
                          ...settings.notifications.newSignups.roles,
                          expert: checked,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Appels termines */}
          <div className="space-y-3">
            <ToggleSetting
              label="Appels termines"
              description="Recevoir une notification apres chaque appel"
              checked={settings.notifications.callsCompleted.enabled}
              onChange={(checked) =>
                updateNotificationSetting("callsCompleted", {
                  ...settings.notifications.callsCompleted,
                  enabled: checked,
                })
              }
            />
            {settings.notifications.callsCompleted.enabled && (
              <div className="ml-6 p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duree minimale (minutes)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={settings.notifications.callsCompleted.minDurationMinutes}
                  onChange={(e) =>
                    updateNotificationSetting("callsCompleted", {
                      ...settings.notifications.callsCompleted,
                      minDurationMinutes: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-32"
                />
                <p className="text-xs text-gray-500 mt-1">
                  0 = tous les appels, quel que soit la duree
                </p>
              </div>
            )}
          </div>

          {/* Paiements recus */}
          <div className="space-y-3">
            <ToggleSetting
              label="Paiements recus"
              description="Recevoir une notification pour chaque paiement"
              checked={settings.notifications.paymentsReceived.enabled}
              onChange={(checked) =>
                updateNotificationSetting("paymentsReceived", {
                  ...settings.notifications.paymentsReceived,
                  enabled: checked,
                })
              }
            />
            {settings.notifications.paymentsReceived.enabled && (
              <div className="ml-6 p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant minimum (EUR)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={settings.notifications.paymentsReceived.minAmountEur}
                  onChange={(e) =>
                    updateNotificationSetting("paymentsReceived", {
                      ...settings.notifications.paymentsReceived,
                      minAmountEur: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-32"
                />
                <p className="text-xs text-gray-500 mt-1">
                  0 = tous les paiements, quel que soit le montant
                </p>
              </div>
            )}
          </div>

          {/* Rapport quotidien */}
          <ToggleSetting
            label="Rapport quotidien"
            description="Recevoir un resume quotidien des activites (envoye a 9h)"
            checked={settings.notifications.dailyReport.enabled}
            onChange={(checked) =>
              updateNotificationSetting("dailyReport", {
                ...settings.notifications.dailyReport,
                enabled: checked,
              })
            }
          />
        </div>
      </SettingCard>

      {/* Test Notifications Card */}
      <SettingCard
        title="Tester les notifications"
        description="Envoyez une notification de test pour verifier la configuration"
        icon={TestTube}
        iconColor="text-amber-600"
      >
        <div className="space-y-4">
          {/* Test type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de notification
            </label>
            <div className="relative">
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as NotificationType)}
                className="w-full h-11 px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="newSignup">Nouvelle inscription</option>
                <option value="callCompleted">Appel termine</option>
                <option value="paymentReceived">Paiement recu</option>
                <option value="dailyReport">Rapport quotidien</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Send test button */}
          <Button
            onClick={handleSendTest}
            disabled={sendingTest || !settings.chatId || !settings.botValidated}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            {sendingTest ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Envoyer un test
          </Button>

          {/* Disabled state message */}
          {(!settings.chatId || !settings.botValidated) && (
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {!settings.botValidated
                ? "Validez d'abord le bot"
                : "Configurez d'abord le Chat ID"}
            </p>
          )}

          {/* Test result */}
          {testResult && (
            <div
              className={`p-3 rounded-lg ${
                testResult.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={`text-sm flex items-center gap-2 ${
                  testResult.success ? "text-green-700" : "text-red-700"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                {testResult.message}
              </p>
            </div>
          )}
        </div>
      </SettingCard>

      {/* Useful links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="w-5 h-5 text-gray-600" />
            Liens utiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">BotFather</p>
                <p className="text-xs text-gray-500">Creer et gerer les bots</p>
              </div>
            </a>

            <a
              href="https://core.telegram.org/bots/api"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Documentation API</p>
                <p className="text-xs text-gray-500">Reference de l'API Telegram</p>
              </div>
            </a>

            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="p-2 bg-orange-100 rounded-lg">
                <Settings className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Firebase Console</p>
                <p className="text-xs text-gray-500">Gerer les secrets</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Last update info */}
      {settings.updatedAt && (
        <p className="text-sm text-gray-500 text-center">
          Derniere mise a jour : {settings.updatedAt.toDate().toLocaleString("fr-FR")}
          {settings.updatedBy && ` par ${settings.updatedBy}`}
        </p>
      )}
    </div>
  );
}
