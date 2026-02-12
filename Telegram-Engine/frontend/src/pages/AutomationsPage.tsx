import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Power, X, ChevronRight } from "lucide-react";
import { useAutomations, useToggleAutomation, useDeleteAutomation, useCreateAutomation } from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Badge from "../components/ui/Badge";
import { EVENT_TYPES } from "../types";

export default function AutomationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: automations, isLoading } = useAutomations();
  const toggleMutation = useToggleAutomation();
  const deleteMutation = useDeleteAutomation();
  const createMutation = useCreateAutomation();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState<string>(EVENT_TYPES[0]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const result = await createMutation.mutateAsync({
      name: name.trim(),
      triggerEvent,
      steps: [],
    });
    setName("");
    setTriggerEvent(EVENT_TYPES[0]);
    setShowForm(false);
    // Navigate to the new automation detail page
    navigate(`/automations/${result.id}`);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("automations.title")}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? t("common.cancel") : t("automations.create")}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("common.name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Welcome new chatters"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Event</label>
            <select
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {EVENT_TYPES.map((ev) => (
                <option key={ev} value={ev}>{ev.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim()}
            className="px-4 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600 disabled:opacity-50"
          >
            {createMutation.isPending ? t("common.loading") : t("common.create")}
          </button>
        </form>
      )}

      {!automations?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">{t("common.noData")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {automations.map((auto) => (
            <div
              key={auto.id}
              className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-telegram-300 transition-colors"
              onClick={() => navigate(`/automations/${auto.id}`)}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{auto.name}</h3>
                  <p className="text-sm text-gray-500">
                    Trigger: <span className="font-medium">{auto.triggerEvent.replace(/_/g, " ")}</span>
                    <span className="mx-2">|</span>
                    <span className="text-gray-400">{auto.steps.length} step{auto.steps.length !== 1 ? "s" : ""}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={auto.isActive ? "active" : "cancelled"}>
                    {auto.isActive ? t("automations.active") : t("automations.inactive")}
                  </Badge>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(auto.id); }}
                    className={`p-2 rounded-lg ${auto.isActive ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(auto.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
              {auto.steps.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  {auto.steps.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <div className={`px-3 py-1.5 rounded text-xs font-medium ${
                        step.type === "send_message" ? "bg-blue-50 text-blue-700" :
                        step.type === "wait" ? "bg-amber-50 text-amber-700" :
                        "bg-purple-50 text-purple-700"
                      }`}>
                        {step.type.replace(/_/g, " ")}
                      </div>
                      {i < auto.steps.length - 1 && (
                        <span className="text-gray-300">&rarr;</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
