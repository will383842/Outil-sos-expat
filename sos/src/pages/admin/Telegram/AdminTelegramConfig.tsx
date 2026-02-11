import React, { useState, useEffect } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import AdminLayout from "../../../components/admin/AdminLayout";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../config/firebase";
import {
  Bot,
  CheckCircle,
  AlertTriangle,
  Save,
  RefreshCw,
  Search,
  Settings,
} from "lucide-react";

interface NotificationSettings {
  newRegistration: boolean;
  callCompleted: boolean;
  paymentReceived: boolean;
  dailyReport: boolean;
  newProvider: boolean;
  newContactMessage: boolean;
  negativeReview: boolean;
  securityAlert: boolean;
  withdrawalRequest: boolean;
}

interface ConfigData {
  recipientPhoneNumber: string;
  recipientChatId: string | null;
  notifications: NotificationSettings;
  updatedAt: string | null;
  updatedBy: string | null;
}

const TOGGLE_LABELS: Array<{ key: keyof NotificationSettings; labelKey: string }> = [
  { key: "newRegistration", labelKey: "admin.telegram.toggle.newRegistration" },
  { key: "callCompleted", labelKey: "admin.telegram.toggle.callCompleted" },
  { key: "paymentReceived", labelKey: "admin.telegram.toggle.paymentReceived" },
  { key: "dailyReport", labelKey: "admin.telegram.toggle.dailyReport" },
  { key: "newProvider", labelKey: "admin.telegram.toggle.newProvider" },
  { key: "newContactMessage", labelKey: "admin.telegram.toggle.newContactMessage" },
  { key: "negativeReview", labelKey: "admin.telegram.toggle.negativeReview" },
  { key: "securityAlert", labelKey: "admin.telegram.toggle.securityAlert" },
  { key: "withdrawalRequest", labelKey: "admin.telegram.toggle.withdrawalRequest" },
];

const AdminTelegramConfig: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [botStatus, setBotStatus] = useState<{
    ok: boolean;
    botUsername?: string;
    error?: string;
  } | null>(null);
  const [chatIdSearching, setChatIdSearching] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const [configRes, botRes] = await Promise.all([
        httpsCallable(functions, "telegram_getConfig")({}),
        httpsCallable(functions, "telegram_validateBot")({}),
      ]);
      const data = configRes.data as { exists: boolean; data: ConfigData };
      setConfig(data.data);
      setBotStatus(botRes.data as { ok: boolean; botUsername?: string });
    } catch (err) {
      console.error("Failed to load config:", err);
      setMessage({ type: "error", text: t("admin.telegram.loadError") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      await httpsCallable(functions, "telegram_updateConfig")({
        recipientChatId: config.recipientChatId || undefined,
        notifications: config.notifications,
      });
      setMessage({ type: "success", text: t("admin.telegram.configSaved") });
    } catch (err) {
      console.error("Save failed:", err);
      setMessage({ type: "error", text: t("admin.telegram.saveError") });
    } finally {
      setSaving(false);
    }
  };

  const handleDetectChatId = async () => {
    setChatIdSearching(true);
    setMessage(null);
    try {
      const res = await httpsCallable(functions, "telegram_getChatId")({});
      const data = res.data as { ok: boolean; chatId?: string; error?: string };
      if (data.ok && data.chatId) {
        setConfig((prev) => (prev ? { ...prev, recipientChatId: data.chatId! } : prev));
        setMessage({ type: "success", text: `Chat ID: ${data.chatId}` });
      } else {
        setMessage({ type: "error", text: data.error || t("admin.telegram.noChatId") });
      }
    } catch (err) {
      console.error("Chat ID detection failed:", err);
      setMessage({ type: "error", text: t("admin.telegram.detectError") });
    } finally {
      setChatIdSearching(false);
    }
  };

  const toggleNotification = (key: keyof NotificationSettings) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        notifications: {
          ...prev.notifications,
          [key]: !prev.notifications[key],
        },
      };
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Settings className="h-7 w-7 text-sky-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("admin.telegram.config.title")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t("admin.telegram.config.subtitle")}
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Bot Validation */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t("admin.telegram.config.botSection")}
          </h2>
          {botStatus?.ok ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span>
                {t("admin.telegram.config.botConnected")} @{botStatus.botUsername}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
              <span>{t("admin.telegram.config.botDisconnected")}</span>
            </div>
          )}
        </div>

        {/* Chat ID */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-3">
            {t("admin.telegram.config.chatId")}
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={config?.recipientChatId || ""}
              onChange={(e) =>
                setConfig((prev) =>
                  prev ? { ...prev, recipientChatId: e.target.value } : prev
                )
              }
              placeholder="123456789"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
            <button
              onClick={handleDetectChatId}
              disabled={chatIdSearching}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-sky-50 text-sky-700 border border-sky-200 rounded-lg hover:bg-sky-100 disabled:opacity-50"
            >
              <Search className={`h-4 w-4 ${chatIdSearching ? "animate-spin" : ""}`} />
              {t("admin.telegram.config.detectChatId")}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {t("admin.telegram.config.chatIdHelp")}
          </p>
        </div>

        {/* Notification Toggles */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            {t("admin.telegram.config.notifications")}
          </h2>
          <div className="space-y-3">
            {TOGGLE_LABELS.map(({ key, labelKey }) => (
              <label
                key={key}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm text-gray-700">{t(labelKey)}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config?.notifications[key] ?? true}
                  onClick={() => toggleNotification(key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config?.notifications[key] ? "bg-sky-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config?.notifications[key] ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 font-medium text-sm"
          >
            <Save className="h-4 w-4" />
            {saving ? t("admin.telegram.saving") : t("admin.telegram.save")}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTelegramConfig;
