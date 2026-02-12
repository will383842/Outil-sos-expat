import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, Loader2, Search } from "lucide-react";
import { useSettings, useValidateBot, useDetectChatId, useUpdateSetting } from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useSettings();
  const validateBotMutation = useValidateBot();
  const detectChatIdMutation = useDetectChatId();
  const updateSettingMutation = useUpdateSetting();

  const [botResult, setBotResult] = useState<{ ok: boolean; username?: string } | null>(null);

  const handleValidateBot = async () => {
    const result = await validateBotMutation.mutateAsync();
    setBotResult(result);
    if (result.ok) {
      toast.success(`${t("settings.botValid")}: @${result.username}`);
    } else {
      toast.error(t("settings.botInvalid"));
    }
  };

  const handleDetectChatId = async () => {
    const result = await detectChatIdMutation.mutateAsync();
    if (result.chats.length > 0) {
      toast.success(`Found ${result.chats.length} chat(s)`);
    } else {
      toast.error("No recent chats found. Send a message to the bot first.");
    }
  };

  const handleToggleNotification = (key: string, current: boolean) => {
    const notifications = (settings?.["notifications"] as Record<string, boolean>) ?? {};
    updateSettingMutation.mutate({
      key: "notifications",
      value: { ...notifications, [key]: !current },
    });
  };

  if (isLoading) return <LoadingSpinner />;

  const notifications = (settings?.["notifications"] as Record<string, boolean>) ?? {};

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("settings.title")}</h1>

      {/* Bot Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{t("settings.botConfig")}</h2>

        <div className="flex gap-3">
          <button
            onClick={handleValidateBot}
            disabled={validateBotMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600 disabled:opacity-50"
          >
            {validateBotMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : botResult?.ok ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {t("settings.validateBot")}
          </button>

          <button
            onClick={handleDetectChatId}
            disabled={detectChatIdMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {detectChatIdMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {t("settings.detectChatId")}
          </button>
        </div>

        {botResult?.ok && (
          <p className="text-sm text-green-600">Bot: @{botResult.username}</p>
        )}

        {detectChatIdMutation.data && (
          <div className="space-y-2">
            {detectChatIdMutation.data.chats.map((chat) => (
              <div key={chat.chatId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                <span className="font-mono font-medium">{chat.chatId}</span>
                {chat.username && <span className="text-gray-500">@{chat.username}</span>}
                {chat.firstName && <span className="text-gray-500">{chat.firstName}</span>}
                <span className="text-gray-400">{chat.chatType}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification Toggles */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{t("settings.notifications")}</h2>
        <div className="space-y-3">
          {Object.entries(notifications).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">{key.replace(/_/g, " ")}</span>
              <button
                type="button"
                onClick={() => handleToggleNotification(key, enabled)}
                className={`w-10 h-6 rounded-full relative transition-colors ${enabled ? "bg-telegram-500" : "bg-gray-300"}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${enabled ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
