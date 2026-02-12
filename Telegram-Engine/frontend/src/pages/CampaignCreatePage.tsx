import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useCreateCampaign, useTags } from "../hooks/useApi";
import { ROLES, LANGUAGES } from "../types";

interface MessageVariant {
  language: string;
  content: string;
  parseMode: string;
  mediaType: string;
  mediaUrl: string;
}

export default function CampaignCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createMutation = useCreateCampaign();
  const { data: tags } = useTags();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("broadcast");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetTagIds, setTargetTagIds] = useState<number[]>([]);
  const [targetLanguages, setTargetLanguages] = useState<string[]>([]);
  const [triggerAction, setTriggerAction] = useState("");
  const [triggerDelay, setTriggerDelay] = useState(0);
  const [scheduledAt, setScheduledAt] = useState("");
  const [messages, setMessages] = useState<MessageVariant[]>([
    { language: "en", content: "", parseMode: "HTML", mediaType: "", mediaUrl: "" },
  ]);

  const addMessage = () => {
    const usedLangs = new Set(messages.map((m) => m.language));
    const next = LANGUAGES.find((l) => !usedLangs.has(l));
    if (next) {
      setMessages([...messages, { language: next, content: "", parseMode: "HTML", mediaType: "", mediaUrl: "" }]);
    }
  };

  const removeMessage = (index: number) => {
    if (messages.length > 1) {
      setMessages(messages.filter((_, i) => i !== index));
    }
  };

  const updateMessage = (index: number, field: keyof MessageVariant, value: string) => {
    const updated = [...messages];
    updated[index] = { ...updated[index], [field]: value };
    setMessages(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      name,
      description: description || undefined,
      type,
      targetRoles: targetRoles.length ? targetRoles : undefined,
      targetTags: targetTagIds.length ? targetTagIds : undefined,
      targetLanguages: targetLanguages.length ? targetLanguages : undefined,
      triggerAction: type === "action_triggered" ? triggerAction : undefined,
      triggerDelay: type === "action_triggered" ? triggerDelay : undefined,
      scheduledAt: scheduledAt || undefined,
      messages: messages.map((m) => ({
        language: m.language,
        content: m.content,
        parseMode: m.parseMode,
        mediaType: m.mediaType || null,
        mediaUrl: m.mediaUrl || null,
      })),
    });
    navigate("/campaigns");
  };

  const toggleInArray = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/campaigns")} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{t("campaigns.create")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("campaigns.name")}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-telegram-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("campaigns.description")}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-telegram-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("campaigns.type")}</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="broadcast">{t("campaigns.broadcast")}</option>
                <option value="action_triggered">{t("campaigns.actionTriggered")}</option>
                <option value="scheduled">{t("campaigns.scheduled")}</option>
              </select>
            </div>
            {(type === "scheduled" || type === "broadcast") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("campaigns.scheduledAt")}</label>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            )}
          </div>
          {type === "action_triggered" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("campaigns.triggerAction")}</label>
                <select value={triggerAction} onChange={(e) => setTriggerAction(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">Select...</option>
                  {["registration", "first_call", "first_payment", "referral", "inactivity_7d", "inactivity_30d"].map((a) => (
                    <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("campaigns.triggerDelay")}</label>
                <input type="number" min={0} value={triggerDelay} onChange={(e) => setTriggerDelay(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
          )}
        </div>

        {/* Targeting */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t("campaigns.targeting")}</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("campaigns.targetRoles")}</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <button key={role} type="button" onClick={() => setTargetRoles(toggleInArray(targetRoles, role))}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${targetRoles.includes(role) ? "bg-telegram-500 text-white border-telegram-500" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  {role}
                </button>
              ))}
              {targetRoles.length === 0 && <span className="text-sm text-gray-400">{t("campaigns.allRoles")}</span>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("campaigns.targetTags")}</label>
            <div className="flex flex-wrap gap-2">
              {tags?.map((tag) => (
                <button key={tag.id} type="button" onClick={() => setTargetTagIds(toggleInArray(targetTagIds, tag.id))}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${targetTagIds.includes(tag.id) ? "bg-telegram-500 text-white border-telegram-500" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("campaigns.targetLanguages")}</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button key={lang} type="button" onClick={() => setTargetLanguages(toggleInArray(targetLanguages, lang))}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${targetLanguages.includes(lang) ? "bg-telegram-500 text-white border-telegram-500" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  {lang.toUpperCase()}
                </button>
              ))}
              {targetLanguages.length === 0 && <span className="text-sm text-gray-400">{t("campaigns.allLanguages")}</span>}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t("campaigns.messages")}</h2>
            <button type="button" onClick={addMessage} className="flex items-center gap-1 text-sm text-telegram-500 hover:text-telegram-600">
              <Plus className="w-4 h-4" /> {t("campaigns.addMessage")}
            </button>
          </div>
          {messages.map((msg, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <select value={msg.language} onChange={(e) => updateMessage(idx, "language", e.target.value)} className="px-2 py-1 border border-gray-300 rounded text-sm">
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
                {messages.length > 1 && (
                  <button type="button" onClick={() => removeMessage(idx)} className="p-1 text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <textarea
                value={msg.content}
                onChange={(e) => updateMessage(idx, "content", e.target.value)}
                rows={4}
                placeholder={t("campaigns.messageContent")}
                dir={msg.language === "ar" ? "rtl" : "ltr"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-telegram-500 outline-none text-sm font-mono"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Media type (optional)</label>
                  <select
                    value={msg.mediaType}
                    onChange={(e) => updateMessage(idx, "mediaType", e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Text only</option>
                    <option value="photo">Photo</option>
                    <option value="document">Document</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>
                {msg.mediaType && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Media URL</label>
                    <input
                      type="url"
                      value={msg.mediaUrl}
                      onChange={(e) => updateMessage(idx, "mediaUrl", e.target.value)}
                      placeholder="https://..."
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-sm text-gray-500">{t("campaigns.noMessages")}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate("/campaigns")} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600 disabled:opacity-50">
            {t("common.create")}
          </button>
        </div>
      </form>
    </div>
  );
}
