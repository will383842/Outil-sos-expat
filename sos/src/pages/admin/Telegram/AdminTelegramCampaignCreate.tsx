import React, { useState } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import AdminLayout from "../../../components/admin/AdminLayout";
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
  { value: "all", labelKey: "admin.telegram.audience.all" },
  { value: "chatters", labelKey: "admin.telegram.audience.chatters" },
  { value: "influencers", labelKey: "admin.telegram.audience.influencers" },
  { value: "bloggers", labelKey: "admin.telegram.audience.bloggers" },
  { value: "groupAdmins", labelKey: "admin.telegram.audience.groupAdmins" },
];

const AdminTelegramCampaignCreate: React.FC = () => {
  const { t } = useTranslation();
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
      setError(t("admin.telegram.campaignCreate.nameRequired"));
      return;
    }
    if (!message.trim()) {
      setError(t("admin.telegram.campaignCreate.messageRequired"));
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
        navigate("/admin/telegram/campaigns");
      }
    } catch (err) {
      console.error("Campaign creation failed:", err);
      setError(t("admin.telegram.campaignCreate.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/admin/telegram/campaigns")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("admin.telegram.campaignCreate.title")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t("admin.telegram.campaignCreate.subtitle")}
            </p>
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
              {t("admin.telegram.campaignCreate.name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("admin.telegram.campaignCreate.namePlaceholder")}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>

          {/* Message */}
          <div className="bg-white rounded-xl border p-5">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="h-4 w-4" />
              {t("admin.telegram.campaignCreate.message")}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder={t("admin.telegram.campaignCreate.messagePlaceholder")}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t("admin.telegram.campaignCreate.markdownHint")}
            </p>
          </div>

          {/* Target Audience */}
          <div className="bg-white rounded-xl border p-5">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Users className="h-4 w-4" />
              {t("admin.telegram.campaignCreate.audience")}
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
                  {t(aud.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-xl border p-5">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <Calendar className="h-4 w-4" />
              {t("admin.telegram.campaignCreate.schedule")}
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
                {t("admin.telegram.campaignCreate.sendNow")}
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
                {t("admin.telegram.campaignCreate.scheduleLater")}
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
              onClick={() => navigate("/admin/telegram/campaigns")}
              className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {t("admin.telegram.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 font-medium text-sm"
            >
              <Send className="h-4 w-4" />
              {submitting
                ? t("admin.telegram.campaignCreate.creating")
                : scheduleType === "now"
                ? t("admin.telegram.campaignCreate.createDraft")
                : t("admin.telegram.campaignCreate.scheduleCampaign")}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminTelegramCampaignCreate;
