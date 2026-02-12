import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Edit2, Send, Check, X, Trash2, Plus } from "lucide-react";
import { useTemplates, useCreateTemplate, useUpdateTemplate, useTestSend, useDeleteTemplate } from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Badge from "../components/ui/Badge";
import { EVENT_TYPES, LANGUAGES } from "../types";

export default function TemplatesPage() {
  const { t } = useTranslation();
  const { data: grouped, isLoading } = useTemplates();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const testSendMutation = useTestSend();
  const deleteMutation = useDeleteTemplate();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [testChatId, setTestChatId] = useState("");
  const [testContent, setTestContent] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterLang, setFilterLang] = useState("");

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEventType, setNewEventType] = useState<string>(EVENT_TYPES[0]);
  const [newLanguage, setNewLanguage] = useState<string>(LANGUAGES[0]);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newVariables, setNewVariables] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newContent.trim()) return;
    await createMutation.mutateAsync({
      eventType: newEventType,
      language: newLanguage,
      name: newName.trim(),
      content: newContent.trim(),
      variables: newVariables ? newVariables.split(",").map((v) => v.trim()).filter(Boolean) : [],
    });
    setNewName("");
    setNewContent("");
    setNewVariables("");
    setShowCreateForm(false);
  };

  if (isLoading) return <LoadingSpinner />;
  if (!grouped) return null;

  const events = filterEvent ? [filterEvent] : Object.keys(grouped);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("templates.title")}</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600"
        >
          {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreateForm ? t("common.cancel") : t("templates.create")}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("templates.eventType")}</label>
              <select
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {EVENT_TYPES.map((ev) => (
                  <option key={ev} value={ev}>{ev.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("templates.language")}</label>
              <select
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.name")}</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Welcome FR"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("templates.content")}</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              placeholder={`Hello {{firstName}}, welcome to SOS Expat!`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("templates.variables")}</label>
            <input
              type="text"
              value={newVariables}
              onChange={(e) => setNewVariables(e.target.value)}
              placeholder="firstName, role, amount"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">{t("templates.variablesHint")}</p>
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending || !newName.trim() || !newContent.trim()}
            className="px-4 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600 disabled:opacity-50"
          >
            {createMutation.isPending ? t("common.loading") : t("common.create")}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">{t("common.all")} events</option>
          {EVENT_TYPES.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
        </select>
        <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">{t("common.all")} languages</option>
          {LANGUAGES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </div>

      {/* Test Send */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t("templates.testSend")}</h3>
        <div className="flex gap-3">
          <input type="text" placeholder={t("templates.testChatId")} value={testChatId} onChange={(e) => setTestChatId(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <textarea placeholder={t("templates.content")} value={testContent} onChange={(e) => setTestContent(e.target.value)} rows={2} className="flex-[2] px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono" />
          <button
            onClick={() => testSendMutation.mutate({ chatId: testChatId, content: testContent })}
            disabled={!testChatId || !testContent || testSendMutation.isPending}
            className="px-4 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> {t("templates.sendTest")}
          </button>
        </div>
      </div>

      {/* Templates by event */}
      {events.map((eventType) => {
        const templates = (grouped[eventType] ?? []).filter(
          (tpl) => !filterLang || tpl.language === filterLang
        );
        if (templates.length === 0) return null;

        return (
          <div key={eventType} className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">{eventType.replace(/_/g, " ")}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {templates.map((tpl) => (
                <div key={tpl.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge>{tpl.language.toUpperCase()}</Badge>
                      <Badge variant={tpl.isActive ? "active" : "cancelled"}>
                        {tpl.isActive ? t("templates.active") : t("templates.inactive")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId === tpl.id ? (
                        <>
                          <button onClick={() => { updateMutation.mutate({ id: tpl.id, data: { content: editContent } }); setEditingId(null); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(tpl.id); setEditContent(tpl.content); }} className="p-1.5 text-gray-400 hover:text-telegram-500">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(tpl.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {editingId === tpl.id ? (
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} className="w-full px-3 py-2 border border-telegram-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-telegram-500 outline-none" />
                  ) : (
                    <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded">{tpl.content}</pre>
                  )}
                  {tpl.variables.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {(tpl.variables as string[]).map((v) => (
                        <span key={v} className="text-xs bg-telegram-50 text-telegram-600 px-2 py-0.5 rounded">{`{{${v}}}`}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
