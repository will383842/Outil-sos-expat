import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Mail,
  Clock,
  GitBranch,
  Users,
  CheckCircle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import {
  useAutomation,
  useUpdateAutomation,
  useAutomationEnrollments,
  useAutomationStats,
} from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Badge from "../components/ui/Badge";
import { LANGUAGES } from "../types";

const STEP_TYPES = [
  { value: "send_message", label: "Send Message", icon: Mail },
  { value: "wait", label: "Wait", icon: Clock },
  { value: "condition", label: "Condition", icon: GitBranch },
] as const;

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Francais",
  es: "Espanol",
  de: "Deutsch",
  pt: "Portugues",
  ru: "Russkiy",
  zh: "Zhongwen",
  hi: "Hindi",
  ar: "Al-Arabiyya",
};

interface StepDraft {
  stepOrder: number;
  type: "send_message" | "wait" | "condition";
  config: Record<string, unknown>;
}

export default function AutomationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const automationId = Number(id);

  const { data: automation, isLoading } = useAutomation(automationId);
  const { data: statsData } = useAutomationStats(automationId);
  const { data: enrollmentsData } = useAutomationEnrollments(automationId, { limit: 20 });
  const updateMutation = useUpdateAutomation();

  const [steps, setSteps] = useState<StepDraft[] | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeLang, setActiveLang] = useState("en");
  const [dirty, setDirty] = useState(false);

  // Initialize steps from automation data
  const currentSteps: StepDraft[] = steps ?? (automation?.steps.map((s) => ({
    stepOrder: s.stepOrder,
    type: s.type as StepDraft["type"],
    config: s.config,
  })) ?? []);

  const handleAddStep = (type: StepDraft["type"]) => {
    const newStep: StepDraft = {
      stepOrder: currentSteps.length,
      type,
      config: type === "send_message"
        ? { messages: { en: "" }, parseMode: "HTML" }
        : type === "wait"
        ? { delayMinutes: 1440 }
        : { field: "role", operator: "eq", value: "" },
    };
    setSteps([...currentSteps, newStep]);
    setDirty(true);
    setShowAddMenu(false);
  };

  const handleRemoveStep = (index: number) => {
    const updated = currentSteps.filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, stepOrder: i }));
    setSteps(updated);
    setDirty(true);
  };

  const handleUpdateStepConfig = (index: number, config: Record<string, unknown>) => {
    const updated = [...currentSteps];
    updated[index] = { ...updated[index], config };
    setSteps(updated);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!automation) return;
    await updateMutation.mutateAsync({
      id: automation.id,
      data: { steps: currentSteps },
    });
    setDirty(false);
  };

  if (isLoading) return <LoadingSpinner />;
  if (!automation) {
    return (
      <div className="p-12 text-center">
        <p className="text-gray-500">{t("automations.notFound")}</p>
      </div>
    );
  }

  const stats = statsData;
  const enrollments = enrollmentsData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/automations")}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{automation.name}</h1>
            <p className="text-sm text-gray-500">
              Trigger: <span className="font-medium">{automation.triggerEvent.replace(/_/g, " ")}</span>
              {automation.conditions && Object.keys(automation.conditions).length > 0 && (
                <span className="ml-2">
                  | Conditions: {JSON.stringify(automation.conditions)}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={automation.isActive ? "active" : "cancelled"}>
            {automation.isActive ? t("automations.active") : t("automations.inactive")}
          </Badge>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? t("common.saving") : t("common.saveChanges")}
            </button>
          )}
        </div>
      </div>

      {/* Re-enrollment Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{t("automations.allowReenrollment")}</p>
          <p className="text-xs text-gray-500">
            {t("automations.allowReenrollmentDesc")}
          </p>
        </div>
        <button
          onClick={async () => {
            await updateMutation.mutateAsync({
              id: automation.id,
              data: { allowReenrollment: !automation.allowReenrollment },
            });
          }}
          disabled={updateMutation.isPending}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            automation.allowReenrollment ? "bg-telegram-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              automation.allowReenrollment ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Stats Panel */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label={t("automations.totalEnrollments")} value={stats.total} icon={Users} />
          <StatCard label={t("automations.activeEnrollments")} value={stats.active} icon={Clock} color="text-blue-600" />
          <StatCard label={t("automations.completedEnrollments")} value={stats.completed} icon={CheckCircle} color="text-green-600" />
          <StatCard label={t("automations.cancelledEnrollments")} value={stats.cancelled} icon={XCircle} color="text-red-500" />
        </div>
      )}

      {/* Steps Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("automations.steps")} ({currentSteps.length})
        </h2>

        <div className="space-y-4">
          {currentSteps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index > 0 && (
                <div className="absolute -top-4 left-6 w-0.5 h-4 bg-gray-300" />
              )}

              <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300">
                {/* Step number */}
                <div className="flex-shrink-0 w-8 h-8 bg-telegram-100 text-telegram-600 rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  {step.type === "send_message" && (
                    <SendMessageEditor
                      config={step.config}
                      onChange={(config) => handleUpdateStepConfig(index, config)}
                      activeLang={activeLang}
                      onLangChange={setActiveLang}
                    />
                  )}
                  {step.type === "wait" && (
                    <WaitEditor
                      config={step.config}
                      onChange={(config) => handleUpdateStepConfig(index, config)}
                    />
                  )}
                  {step.type === "condition" && (
                    <ConditionEditor
                      config={step.config}
                      onChange={(config) => handleUpdateStepConfig(index, config)}
                    />
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleRemoveStep(index)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add step button */}
        <div className="mt-4 relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-telegram-400 hover:text-telegram-600 w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            {t("automations.addStep")}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showAddMenu && (
            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-64">
              {STEP_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleAddStep(value)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Enrollments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("automations.recentEnrollments")}
        </h2>

        {enrollments.length === 0 ? (
          <p className="text-gray-500 text-sm">{t("common.noData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">{t("automations.subscriber")}</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">{t("campaigns.status")}</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">{t("automations.step")}</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">{t("automations.enrolled")}</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4">
                      <span className="font-medium">
                        {enrollment.subscriber.firstName ?? enrollment.subscriber.telegramUsername ?? `#${enrollment.subscriber.id}`}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">
                        {enrollment.subscriber.language.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge
                        variant={
                          enrollment.status === "active" ? "active" :
                          enrollment.status === "completed" ? "completed" :
                          "cancelled"
                        }
                      >
                        {enrollment.status}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {enrollment.currentStep}/{currentSteps.length}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-gray-900",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SendMessageEditor({
  config,
  onChange,
  activeLang,
  onLangChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  activeLang: string;
  onLangChange: (lang: string) => void;
}) {
  const messages = (config["messages"] as Record<string, string>) ?? {};
  const parseMode = (config["parseMode"] as string) ?? "HTML";

  const handleMessageChange = (lang: string, text: string) => {
    onChange({
      ...config,
      messages: { ...messages, [lang]: text },
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Mail className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-semibold text-gray-700">Send Message</span>
        <span className="text-xs text-gray-400 ml-auto">({parseMode})</span>
      </div>

      {/* Language tabs */}
      <div className="flex flex-wrap gap-1 mb-2">
        {LANGUAGES.map((lang) => {
          const hasContent = !!messages[lang]?.trim();
          return (
            <button
              key={lang}
              onClick={() => onLangChange(lang)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                activeLang === lang
                  ? "bg-telegram-500 text-white"
                  : hasContent
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              {lang.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Text editor for active language */}
      <textarea
        value={messages[activeLang] ?? ""}
        onChange={(e) => handleMessageChange(activeLang, e.target.value)}
        placeholder={`Message in ${LANGUAGE_LABELS[activeLang] ?? activeLang}... Use {{firstName}}, {{role}}, etc.`}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono resize-y min-h-[80px]"
        rows={3}
        dir={activeLang === "ar" ? "rtl" : "ltr"}
      />
      <p className="text-xs text-gray-400 mt-1">
        Variables: {"{{firstName}}"}, {"{{lastName}}"}, {"{{role}}"}, {"{{language}}"}, {"{{country}}"}
      </p>
    </div>
  );
}

function WaitEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const delayMinutes = Number(config["delayMinutes"]) || 0;
  const [unit, setUnit] = useState<"minutes" | "hours" | "days">(
    delayMinutes >= 1440 && delayMinutes % 1440 === 0 ? "days" :
    delayMinutes >= 60 && delayMinutes % 60 === 0 ? "hours" : "minutes"
  );

  const displayValue =
    unit === "days" ? delayMinutes / 1440 :
    unit === "hours" ? delayMinutes / 60 :
    delayMinutes;

  const handleChange = (value: number, newUnit: "minutes" | "hours" | "days") => {
    const minutes =
      newUnit === "days" ? value * 1440 :
      newUnit === "hours" ? value * 60 :
      value;
    onChange({ ...config, delayMinutes: minutes });
    setUnit(newUnit);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-semibold text-gray-700">Wait</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={displayValue}
          onChange={(e) => handleChange(Number(e.target.value), unit)}
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <select
          value={unit}
          onChange={(e) => {
            const newUnit = e.target.value as "minutes" | "hours" | "days";
            handleChange(displayValue, newUnit);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
          <option value="days">Days</option>
        </select>
      </div>
    </div>
  );
}

function ConditionEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}) {
  const field = (config["field"] as string) ?? "";
  const operator = (config["operator"] as string) ?? "eq";
  const value = (config["value"] as string) ?? "";

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-semibold text-gray-700">Condition</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={field}
          onChange={(e) => onChange({ ...config, field: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="role">Role</option>
          <option value="language">Language</option>
          <option value="country">Country</option>
          <option value="firstName">First Name</option>
        </select>
        <select
          value={operator}
          onChange={(e) => onChange({ ...config, operator: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="eq">equals</option>
          <option value="neq">not equals</option>
          <option value="contains">contains</option>
          <option value="gt">greater than</option>
          <option value="lt">less than</option>
        </select>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange({ ...config, value: e.target.value })}
          placeholder="Value"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-[120px]"
        />
      </div>
    </div>
  );
}
