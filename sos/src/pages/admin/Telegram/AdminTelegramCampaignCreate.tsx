import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../config/firebase";
import { useNavigate } from "react-router-dom";
import {
  Send,
  ArrowLeft,
  Users,
  Calendar,
  MessageSquare,
} from "lucide-react";

const AUDIENCES = [
  { value: "all", label: "Tous" },
  { value: "chatters", label: "Chatters" },
  { value: "influencers", label: "Influenceurs" },
  { value: "bloggers", label: "Blogueurs" },
  { value: "groupAdmins", label: "Group Admins" },
];

const AdminTelegramCampaignCreate: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Le nom de la campagne est requis");
      return;
    }
    if (!message.trim()) {
      setError("Le message est requis");
      return;
    }

    setSubmitting(true);
    try {
      const params: Record<string, unknown> = {
        name: name.trim(),
        message: message.trim(),
        targetAudience,
      };

      if (scheduleType === "later" && scheduledDate && scheduledTime) {
        params.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      const res = await httpsCallable(functions, "telegram_createCampaign")(params);
      const data = res.data as { ok: boolean; campaignId: string; targetCount: number };

      if (data.ok) {
        navigate("/admin/toolbox/telegram/campaigns");
      }
    } catch (err) {
      console.error("Campaign creation failed:", err);
      setError("Échec de la création de la campagne");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

        <div className="max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate("/admin/toolbox/telegram/campaigns")}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nouvelle campagne</h2>
              <p className="text-sm text-gray-500 mt-1">Créer et envoyer une campagne Telegram</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campaign Name */}
            <div className="bg-white rounded-xl border p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la campagne
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Promo Février 2026"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
            </div>

            {/* Message */}
            <div className="bg-white rounded-xl border p-5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="h-4 w-4" />
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Votre message Telegram..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">
                Markdown supporté (*gras*, _italique_, [lien](url))
              </p>
            </div>

            {/* Target Audience */}
            <div className="bg-white rounded-xl border p-5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Users className="h-4 w-4" />
                Audience cible
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AUDIENCES.map((aud) => (
                  <button
                    key={aud.value}
                    type="button"
                    onClick={() => setTargetAudience(aud.value)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      targetAudience === aud.value
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-xl border p-5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Calendar className="h-4 w-4" />
                Programmation
              </label>
              <div className="flex gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setScheduleType("now")}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    scheduleType === "now"
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Envoyer maintenant
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType("later")}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    scheduleType === "later"
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Programmer
                </button>
              </div>
              {scheduleType === "later" && (
                <div className="flex gap-3">
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/admin/toolbox/telegram/campaigns")}
                className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 font-medium text-sm"
              >
                <Send className="h-4 w-4" />
                {submitting
                  ? "Création..."
                  : scheduleType === "now"
                  ? "Créer la campagne"
                  : "Programmer la campagne"}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
};

export default AdminTelegramCampaignCreate;
