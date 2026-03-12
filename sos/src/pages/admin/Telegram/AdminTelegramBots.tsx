import React, { useState, useEffect, useCallback } from "react";
import {
  Bot,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Send,
  Save,
  Loader2,
} from "lucide-react";
import type { TelegramBot } from "./types";
import { EVENT_TYPES, EVENT_LABELS } from "./types";
import {
  fetchTelegramBots,
  updateTelegramBot,
  validateTelegramBot,
  testTelegramBot,
} from "./telegramGroupsApi";
import AdminLayout from "../../../components/admin/AdminLayout";

/** Mask a token: show first 4 and last 3 chars */
function maskToken(token: string): string {
  if (!token || token.length < 10) return token || "";
  return `${token.slice(0, 4)}****${token.slice(-3)}`;
}

/** Bot slug display names and colors */
const BOT_META: Record<string, { label: string; color: string; description: string }> = {
  main: {
    label: "Principal",
    color: "bg-blue-100 text-blue-700",
    description: "Inscriptions, appels, paiements, prestataires, avis, alertes",
  },
  inbox: {
    label: "Inbox",
    color: "bg-green-100 text-green-700",
    description: "Messages contacts, feedbacks, candidatures captains et partenaires",
  },
  withdrawals: {
    label: "Retraits",
    color: "bg-orange-100 text-orange-700",
    description: "Demandes de retrait uniquement",
  },
};

interface BotCardState {
  chatId: string;
  notifications: Record<string, boolean>;
  showToken: boolean;
  validating: boolean;
  testing: boolean;
  saving: boolean;
  validationResult: { valid: boolean; username?: string } | null;
  testResult: { success: boolean } | null;
  dirty: boolean;
}

const AdminTelegramBots: React.FC = () => {
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardStates, setCardStates] = useState<Record<number, BotCardState>>({});

  const loadBots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTelegramBots();
      setBots(data);
      // Initialize card states
      const states: Record<number, BotCardState> = {};
      for (const bot of data) {
        states[bot.id] = {
          chatId: bot.recipient_chat_id || "",
          notifications: { ...bot.notifications },
          showToken: false,
          validating: false,
          testing: false,
          saving: false,
          validationResult: null,
          testResult: null,
          dirty: false,
        };
      }
      setCardStates(states);
    } catch (err) {
      console.error("Failed to load bots:", err);
      setError("Impossible de charger les bots. Verifiez la connexion au Telegram Engine.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  const updateCardState = (botId: number, patch: Partial<BotCardState>) => {
    setCardStates((prev) => ({
      ...prev,
      [botId]: { ...prev[botId], ...patch },
    }));
  };

  const handleChatIdChange = (botId: number, value: string) => {
    updateCardState(botId, { chatId: value, dirty: true });
  };

  const handleNotificationToggle = (botId: number, eventType: string) => {
    setCardStates((prev) => {
      const current = prev[botId];
      return {
        ...prev,
        [botId]: {
          ...current,
          notifications: {
            ...current.notifications,
            [eventType]: !current.notifications[eventType],
          },
          dirty: true,
        },
      };
    });
  };

  const handleValidate = async (bot: TelegramBot) => {
    updateCardState(bot.id, { validating: true, validationResult: null });
    try {
      const result = await validateTelegramBot(bot.id);
      updateCardState(bot.id, { validating: false, validationResult: result });
    } catch {
      updateCardState(bot.id, {
        validating: false,
        validationResult: { valid: false },
      });
    }
  };

  const handleTest = async (bot: TelegramBot) => {
    updateCardState(bot.id, { testing: true, testResult: null });
    try {
      const result = await testTelegramBot(bot.id);
      updateCardState(bot.id, { testing: false, testResult: result });
      // Clear test result after 5 seconds
      setTimeout(() => {
        updateCardState(bot.id, { testResult: null });
      }, 5000);
    } catch {
      updateCardState(bot.id, {
        testing: false,
        testResult: { success: false },
      });
    }
  };

  const handleSave = async (bot: TelegramBot) => {
    const state = cardStates[bot.id];
    if (!state) return;

    updateCardState(bot.id, { saving: true });
    try {
      const updated = await updateTelegramBot(bot.id, {
        recipient_chat_id: state.chatId || null,
        notifications: state.notifications,
      });
      // Update the bot in the list
      setBots((prev) => prev.map((b) => (b.id === bot.id ? updated : b)));
      updateCardState(bot.id, { saving: false, dirty: false });
    } catch (err) {
      console.error("Failed to save bot:", err);
      updateCardState(bot.id, { saving: false });
    }
  };

  const handleToggleActive = async (bot: TelegramBot) => {
    try {
      const updated = await updateTelegramBot(bot.id, {
        is_active: !bot.is_active,
      });
      setBots((prev) => prev.map((b) => (b.id === bot.id ? updated : b)));
    } catch (err) {
      console.error("Failed to toggle bot:", err);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500">Chargement des bots...</span>
      </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-700 font-medium">{error}</p>
        <button
          onClick={loadBots}
          className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
        >
          Reessayer
        </button>
      </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Configurez les bots Telegram et leurs notifications par type d'evenement.
          </p>
        </div>
        <button
          onClick={loadBots}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Rafraichir
        </button>
      </div>

      {/* Bot Cards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {bots.map((bot) => {
          const state = cardStates[bot.id];
          if (!state) return null;

          const meta = BOT_META[bot.slug] || {
            label: bot.slug,
            color: "bg-gray-100 text-gray-700",
            description: "",
          };

          return (
            <div
              key={bot.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Card Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Bot className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{bot.name}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
                  </div>
                </div>

                {/* Active toggle */}
                <button
                  onClick={() => handleToggleActive(bot)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    bot.is_active ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      bot.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Card Body */}
              <div className="px-6 py-4 space-y-4">
                {/* Token */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Token API
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 font-mono text-sm text-gray-700">
                      {state.showToken ? bot.token : maskToken(bot.token)}
                    </div>
                    <button
                      onClick={() =>
                        updateCardState(bot.id, { showToken: !state.showToken })
                      }
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title={state.showToken ? "Masquer" : "Afficher"}
                    >
                      {state.showToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Chat ID */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Chat ID destinataire
                  </label>
                  <input
                    type="text"
                    value={state.chatId}
                    onChange={(e) => handleChatIdChange(bot.id, e.target.value)}
                    placeholder="Ex: 7560535072"
                    className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Validate & Test buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleValidate(bot)}
                    disabled={state.validating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {state.validating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" />
                    )}
                    Valider
                  </button>
                  <button
                    onClick={() => handleTest(bot)}
                    disabled={state.testing || !state.chatId}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    {state.testing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Tester
                  </button>

                  {/* Validation result */}
                  {state.validationResult && (
                    <span
                      className={`text-xs font-medium ${
                        state.validationResult.valid
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {state.validationResult.valid
                        ? `@${state.validationResult.username}`
                        : "Token invalide"}
                    </span>
                  )}

                  {/* Test result */}
                  {state.testResult && (
                    <span
                      className={`text-xs font-medium ${
                        state.testResult.success
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {state.testResult.success
                        ? "Message envoye !"
                        : "Echec de l'envoi"}
                    </span>
                  )}
                </div>

                {/* Notification toggles */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Notifications actives
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {EVENT_TYPES.map((eventType) => {
                      const isActive = state.notifications[eventType] ?? false;
                      return (
                        <label
                          key={eventType}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() =>
                              handleNotificationToggle(bot.id, eventType)
                            }
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-700">
                            {EVENT_LABELS[eventType] || eventType}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
                <button
                  onClick={() => handleSave(bot)}
                  disabled={!state.dirty || state.saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Enregistrer
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {bots.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Bot className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun bot configure</p>
          <p className="text-sm text-gray-400 mt-1">
            Les bots sont configures dans le Telegram Engine (Laravel).
          </p>
        </div>
      )}
    </div>
    </AdminLayout>
  );
};

export default AdminTelegramBots;
