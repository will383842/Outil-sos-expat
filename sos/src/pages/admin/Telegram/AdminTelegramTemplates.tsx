import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../config/firebase";
import AdminLayout from "../../../components/admin/AdminLayout";
import TelegramNav from "../../../components/telegram/TelegramNav";
import {
  Save,
  RefreshCw,
  Eye,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface TemplateData {
  eventId: string;
  enabled: boolean;
  template: string;
  variables: string[];
  updatedAt: string | null;
  isDefault: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  new_registration: "Nouvelle inscription",
  call_completed: "Appel terminé",
  payment_received: "Paiement reçu",
  daily_report: "Rapport quotidien",
  new_provider: "Nouveau prestataire",
  new_contact_message: "Nouveau message contact",
  negative_review: "Avis négatif",
  security_alert: "Alerte sécurité",
  withdrawal_request: "Demande de retrait",
};

const AdminTelegramTemplates: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Record<string, TemplateData>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await httpsCallable(functions, "telegram_getTemplates")({});
      const data = res.data as { templates: Record<string, TemplateData> };
      setTemplates(data.templates);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleExpand = (eventId: string) => {
    if (expandedId === eventId) {
      setExpandedId(null);
    } else {
      setExpandedId(eventId);
      setEditingTemplate(templates[eventId]?.template || "");
    }
  };

  const handleSaveTemplate = async (eventId: string) => {
    setSaving(eventId);
    setMessage(null);
    try {
      await httpsCallable(functions, "telegram_updateTemplate")({
        eventId,
        template: editingTemplate,
        enabled: templates[eventId]?.enabled ?? true,
      });
      setTemplates((prev) => ({
        ...prev,
        [eventId]: {
          ...prev[eventId],
          template: editingTemplate,
          isDefault: false,
        },
      }));
      setMessage({ type: "success", text: "Template sauvegardé" });
    } catch (err) {
      console.error("Save template failed:", err);
      setMessage({ type: "error", text: "Erreur lors de la sauvegarde" });
    } finally {
      setSaving(null);
    }
  };

  const handleToggleEnabled = async (eventId: string) => {
    const current = templates[eventId];
    if (!current) return;
    try {
      await httpsCallable(functions, "telegram_updateTemplate")({
        eventId,
        enabled: !current.enabled,
      });
      setTemplates((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], enabled: !current.enabled },
      }));
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  const handleTestSend = async (eventId: string) => {
    setTesting(eventId);
    setMessage(null);
    try {
      const res = await httpsCallable(functions, "telegram_sendTestNotification")({
        eventType: eventId,
      });
      const data = res.data as { success: boolean; error?: string };
      if (data.success) {
        setMessage({ type: "success", text: "Message test envoyé" });
      } else {
        setMessage({ type: "error", text: data.error || "Échec de l'envoi test" });
      }
    } catch (err) {
      console.error("Test send failed:", err);
      setMessage({ type: "error", text: "Échec de l'envoi test" });
    } finally {
      setTesting(null);
    }
  };

  const previewMessage = (template: string, variables: string[]): string => {
    let preview = template;
    const sampleValues: Record<string, string> = {
      ROLE_FR: "Avocat", EMAIL: "test@example.com", PHONE: "+33612345678",
      COUNTRY: "France", DATE: "11/02/2026", TIME: "14:30",
      CLIENT_NAME: "Jean Dupont", PROVIDER_NAME: "Marie Martin",
      PROVIDER_TYPE_FR: "Avocat", DURATION_MINUTES: "15",
      TOTAL_AMOUNT: "50", COMMISSION_AMOUNT: "10",
      DAILY_CA: "500", DAILY_COMMISSION: "100",
      REGISTRATION_COUNT: "5", CALL_COUNT: "10",
      SENDER_NAME: "Sophie L.", SENDER_EMAIL: "sophie@example.com",
      SUBJECT: "Info request", MESSAGE_PREVIEW: "Hello...",
      RATING: "2", COMMENT_PREVIEW: "Could be better...",
      ALERT_TYPE_FR: "Suspicious login", USER_EMAIL: "user@test.com",
      IP_ADDRESS: "192.168.1.1", DETAILS: "Unusual location",
      USER_NAME: "Julie M.", USER_TYPE_FR: "Influencer",
      AMOUNT: "150", PAYMENT_METHOD: "Bank Transfer",
    };
    for (const v of variables) {
      const regex = new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, "g");
      preview = preview.replace(regex, sampleValues[v] || v);
    }
    return preview;
  };

  if (loading) {
    return (
    <div className="space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        </div>
    );
  }

  const eventIds = Object.keys(templates);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <TelegramNav />

        <div>
          <h2 className="text-xl font-bold text-gray-900">Templates</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez vos modèles de notifications Telegram</p>
        </div>

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

        <div className="space-y-3">
          {eventIds.map((eventId) => {
            const tmpl = templates[eventId];
            const isExpanded = expandedId === eventId;

            return (
              <div key={eventId} className="bg-white rounded-xl border overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleExpand(eventId)}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        tmpl.enabled ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <span className="font-medium text-gray-900">
                      {EVENT_LABELS[eventId] || eventId}
                    </span>
                    {tmpl.isDefault && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Par défaut
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleEnabled(eventId);
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        tmpl.enabled ? "bg-sky-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          tmpl.enabled ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Variables disponibles
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {tmpl.variables.map((v) => (
                          <span
                            key={v}
                            className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-mono cursor-pointer hover:bg-sky-100"
                            onClick={() => {
                              setEditingTemplate((prev) => prev + `{{${v}}}`);
                            }}
                          >
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    </div>

                    <textarea
                      value={editingTemplate}
                      onChange={(e) => setEditingTemplate(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none resize-y"
                    />

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                        <Eye className="h-3 w-3" />
                        Aperçu
                      </div>
                      <pre className="text-sm whitespace-pre-wrap text-gray-700">
                        {previewMessage(editingTemplate, tmpl.variables)}
                      </pre>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleTestSend(eventId)}
                        disabled={testing === eventId}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 disabled:opacity-50"
                      >
                        <Send className={`h-3.5 w-3.5 ${testing === eventId ? "animate-spin" : ""}`} />
                        Tester
                      </button>
                      <button
                        onClick={() => handleSaveTemplate(eventId)}
                        disabled={saving === eventId}
                        className="flex items-center gap-2 px-4 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {saving === eventId ? "Sauvegarde..." : "Sauvegarder"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTelegramTemplates;
