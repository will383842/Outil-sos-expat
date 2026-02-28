/**
 * DashboardGDPR.tsx
 *
 * Self-service GDPR panel (Articles 15, 17, 20).
 * Calls backend callables: requestDataExport, requestAccountDeletion, getMyDataAccessHistory.
 */

import React, { useState, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useIntl } from "react-intl";
import {
  Download,
  Trash2,
  FileSearch,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────
interface GdprResponse {
  success: boolean;
  requestId?: string;
  message?: string;
  hasLegalRetention?: boolean;
}

interface AccessLogEntry {
  id: string;
  eventType: string;
  timestamp: string | { _seconds: number };
  details?: string;
  adminUid?: string;
}

interface AccessHistoryResponse {
  logs: AccessLogEntry[];
  total: number;
}

// ── Component ────────────────────────────────────────────────
const DashboardGDPR: React.FC = () => {
  const { user } = useAuth();
  const intl = useIntl();
  const language = (user?.preferredLanguage || intl.locale || "en") as string;

  // State
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<GdprResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteResult, setDeleteResult] = useState<GdprResponse | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyResult, setHistoryResult] = useState<AccessHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Translations (inline, 9 languages) ──
  const t = useCallback(
    (key: string): string => {
      const translations: Record<string, Record<string, string>> = {
        title: {
          fr: "Confidentialité & Données personnelles",
          en: "Privacy & Personal Data",
          es: "Privacidad y Datos Personales",
          de: "Datenschutz & Persönliche Daten",
          pt: "Privacidade e Dados Pessoais",
          ru: "Конфиденциальность и Личные Данные",
          hi: "गोपनीयता और व्यक्तिगत डेटा",
          ch: "隐私和个人数据",
          ar: "الخصوصية والبيانات الشخصية",
        },
        subtitle: {
          fr: "Gérez vos données conformément au GDPR (Articles 15, 17, 20)",
          en: "Manage your data in compliance with GDPR (Articles 15, 17, 20)",
          es: "Gestione sus datos conforme al GDPR (Artículos 15, 17, 20)",
          de: "Verwalten Sie Ihre Daten gemäß DSGVO (Artikel 15, 17, 20)",
          pt: "Gerencie seus dados em conformidade com o GDPR (Artigos 15, 17, 20)",
          ru: "Управляйте данными в соответствии с GDPR (Статьи 15, 17, 20)",
          hi: "GDPR के अनुसार अपने डेटा का प्रबंधन करें (अनुच्छेद 15, 17, 20)",
          ch: "根据GDPR管理您的数据（第15、17、20条）",
          ar: "إدارة بياناتك وفقًا للائحة GDPR (المواد 15، 17، 20)",
        },
        exportTitle: {
          fr: "Exporter mes données",
          en: "Export my data",
          es: "Exportar mis datos",
          de: "Meine Daten exportieren",
          pt: "Exportar meus dados",
          ru: "Экспортировать мои данные",
          hi: "मेरा डेटा निर्यात करें",
          ch: "导出我的数据",
          ar: "تصدير بياناتي",
        },
        exportDesc: {
          fr: "Recevez une copie de toutes vos données personnelles (Article 20 — Portabilité).",
          en: "Receive a copy of all your personal data (Article 20 — Portability).",
          es: "Reciba una copia de todos sus datos personales (Artículo 20 — Portabilidad).",
          de: "Erhalten Sie eine Kopie aller persönlichen Daten (Artikel 20 — Datenportabilität).",
          pt: "Receba uma cópia de todos os seus dados pessoais (Artigo 20 — Portabilidade).",
          ru: "Получите копию всех ваших персональных данных (Статья 20 — Переносимость).",
          hi: "अपने सभी व्यक्तिगत डेटा की प्रति प्राप्त करें (अनुच्छेद 20 — पोर्टेबिलिटी)।",
          ch: "获取您所有个人数据的副本（第20条——数据可携带性）。",
          ar: "احصل على نسخة من جميع بياناتك الشخصية (المادة 20 — قابلية النقل).",
        },
        exportBtn: {
          fr: "Demander l'export",
          en: "Request export",
          es: "Solicitar exportación",
          de: "Export anfordern",
          pt: "Solicitar exportação",
          ru: "Запросить экспорт",
          hi: "निर्यात का अनुरोध करें",
          ch: "请求导出",
          ar: "طلب التصدير",
        },
        deleteTitle: {
          fr: "Supprimer mon compte",
          en: "Delete my account",
          es: "Eliminar mi cuenta",
          de: "Mein Konto löschen",
          pt: "Excluir minha conta",
          ru: "Удалить мой аккаунт",
          hi: "मेरा खाता हटाएं",
          ch: "删除我的账户",
          ar: "حذف حسابي",
        },
        deleteDesc: {
          fr: "Demandez la suppression définitive de votre compte et données (Article 17 — Droit à l'oubli). Cette action est irréversible.",
          en: "Request permanent deletion of your account and data (Article 17 — Right to erasure). This action is irreversible.",
          es: "Solicite la eliminación permanente de su cuenta y datos (Artículo 17 — Derecho al olvido). Esta acción es irreversible.",
          de: "Fordern Sie die dauerhafte Löschung Ihres Kontos und Ihrer Daten an (Artikel 17 — Recht auf Löschung). Diese Aktion ist unwiderruflich.",
          pt: "Solicite a exclusão permanente de sua conta e dados (Artigo 17 — Direito ao esquecimento). Esta ação é irreversível.",
          ru: "Запросите окончательное удаление аккаунта и данных (Статья 17 — Право на удаление). Это необратимо.",
          hi: "अपने खाते और डेटा को स्थायी रूप से हटाने का अनुरोध करें (अनुच्छेद 17 — भूल जाने का अधिकार)। यह क्रिया अपरिवर्तनीय है।",
          ch: "请求永久删除您的账户和数据（第17条——被遗忘权）。此操作不可逆。",
          ar: "اطلب الحذف الدائم لحسابك وبياناتك (المادة 17 — الحق في النسيان). هذا الإجراء لا رجعة فيه.",
        },
        deleteReasonLabel: {
          fr: "Raison (optionnel)",
          en: "Reason (optional)",
          es: "Motivo (opcional)",
          de: "Grund (optional)",
          pt: "Motivo (opcional)",
          ru: "Причина (необязательно)",
          hi: "कारण (वैकल्पिक)",
          ch: "原因（可选）",
          ar: "السبب (اختياري)",
        },
        deleteConfirmLabel: {
          fr: "Tapez votre email pour confirmer :",
          en: "Type your email to confirm:",
          es: "Escriba su email para confirmar:",
          de: "Geben Sie Ihre E-Mail zur Bestätigung ein:",
          pt: "Digite seu email para confirmar:",
          ru: "Введите email для подтверждения:",
          hi: "पुष्टि के लिए अपना ईमेल टाइप करें:",
          ch: "输入您的邮箱确认：",
          ar: "اكتب بريدك الإلكتروني للتأكيد:",
        },
        deleteConfirmCheck: {
          fr: "Je comprends que cette action est irréversible",
          en: "I understand this action is irreversible",
          es: "Entiendo que esta acción es irreversible",
          de: "Ich verstehe, dass diese Aktion unwiderruflich ist",
          pt: "Entendo que esta ação é irreversível",
          ru: "Я понимаю, что это действие необратимо",
          hi: "मैं समझता/समझती हूं कि यह क्रिया अपरिवर्तनीय है",
          ch: "我理解此操作不可逆",
          ar: "أفهم أن هذا الإجراء لا رجعة فيه",
        },
        deleteBtn: {
          fr: "Demander la suppression",
          en: "Request deletion",
          es: "Solicitar eliminación",
          de: "Löschung anfordern",
          pt: "Solicitar exclusão",
          ru: "Запросить удаление",
          hi: "हटाने का अनुरोध करें",
          ch: "请求删除",
          ar: "طلب الحذف",
        },
        historyTitle: {
          fr: "Historique d'accès à mes données",
          en: "My data access history",
          es: "Historial de acceso a mis datos",
          de: "Zugriffsverlauf meiner Daten",
          pt: "Histórico de acesso aos meus dados",
          ru: "История доступа к моим данным",
          hi: "मेरे डेटा एक्सेस का इतिहास",
          ch: "我的数据访问记录",
          ar: "سجل الوصول إلى بياناتي",
        },
        historyDesc: {
          fr: "Consultez qui a accédé à vos données (Article 15 — Droit d'accès).",
          en: "See who accessed your data (Article 15 — Right of access).",
          es: "Vea quién accedió a sus datos (Artículo 15 — Derecho de acceso).",
          de: "Sehen Sie, wer auf Ihre Daten zugegriffen hat (Artikel 15 — Auskunftsrecht).",
          pt: "Veja quem acessou seus dados (Artigo 15 — Direito de acesso).",
          ru: "Посмотрите, кто получал доступ к вашим данным (Статья 15 — Право доступа).",
          hi: "देखें कि आपके डेटा तक किसने पहुंचा (अनुच्छेद 15 — पहुंच का अधिकार)।",
          ch: "查看谁访问了您的数据（第15条——访问权）。",
          ar: "اطلع على من وصل إلى بياناتك (المادة 15 — حق الوصول).",
        },
        historyBtn: {
          fr: "Consulter l'historique",
          en: "View history",
          es: "Ver historial",
          de: "Verlauf anzeigen",
          pt: "Ver histórico",
          ru: "Просмотреть историю",
          hi: "इतिहास देखें",
          ch: "查看记录",
          ar: "عرض السجل",
        },
        historyEmpty: {
          fr: "Aucun accès enregistré.",
          en: "No access recorded.",
          es: "Sin accesos registrados.",
          de: "Kein Zugriff aufgezeichnet.",
          pt: "Nenhum acesso registrado.",
          ru: "Доступ не зарегистрирован.",
          hi: "कोई एक्सेस रिकॉर्ड नहीं।",
          ch: "无访问记录。",
          ar: "لا يوجد سجل وصول.",
        },
        loading: {
          fr: "Chargement...",
          en: "Loading...",
          es: "Cargando...",
          de: "Laden...",
          pt: "Carregando...",
          ru: "Загрузка...",
          hi: "लोड हो रहा है...",
          ch: "加载中...",
          ar: "جار التحميل...",
        },
        successGeneric: {
          fr: "Demande enregistrée avec succès.",
          en: "Request submitted successfully.",
          es: "Solicitud enviada con éxito.",
          de: "Anfrage erfolgreich gesendet.",
          pt: "Solicitação enviada com sucesso.",
          ru: "Запрос успешно отправлен.",
          hi: "अनुरोध सफलतापूर्वक भेजा गया।",
          ch: "请求已成功提交。",
          ar: "تم إرسال الطلب بنجاح.",
        },
      };
      const entry = translations[key];
      if (!entry) return key;
      return entry[language] || entry.en || key;
    },
    [language]
  );

  // ── Handlers ──

  const handleExport = async () => {
    setError(null);
    setExportResult(null);
    setExportLoading(true);
    try {
      const fn = httpsCallable<{ language: string }, GdprResponse>(functions, "requestDataExport");
      const result = await fn({ language });
      setExportResult(result.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setDeleteResult(null);
    setDeleteLoading(true);
    try {
      const fn = httpsCallable<{ reason?: string; language: string }, GdprResponse>(
        functions,
        "requestAccountDeletion"
      );
      const result = await fn({ reason: deleteReason || undefined, language });
      setDeleteResult(result.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleHistory = async () => {
    setError(null);
    setHistoryResult(null);
    setHistoryLoading(true);
    try {
      const fn = httpsCallable<{ limit?: number }, AccessHistoryResponse>(
        functions,
        "getMyDataAccessHistory"
      );
      const result = await fn({ limit: 50 });
      setHistoryResult(result.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setHistoryLoading(false);
    }
  };

  const canDelete =
    deleteConfirm && deleteConfirmEmail.toLowerCase().trim() === (user?.email || "").toLowerCase().trim();

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-white/[0.02] dark:to-transparent border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("title")}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="p-6 space-y-8">
          {/* ── Section 1: Export Data (Article 20) ── */}
          <section className="border border-gray-100 dark:border-white/10 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <Download className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t("exportTitle")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("exportDesc")}</p>
              </div>
            </div>

            {exportResult?.success ? (
              <div className="mt-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  {exportResult.message || t("successGeneric")}
                </p>
              </div>
            ) : (
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl transition disabled:opacity-50"
              >
                {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exportLoading ? t("loading") : t("exportBtn")}
              </button>
            )}
          </section>

          {/* ── Section 2: Access History (Article 15) ── */}
          <section className="border border-gray-100 dark:border-white/10 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <FileSearch className="h-5 w-5 text-indigo-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t("historyTitle")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("historyDesc")}</p>
              </div>
            </div>

            <button
              onClick={handleHistory}
              disabled={historyLoading}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl transition disabled:opacity-50"
            >
              {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
              {historyLoading ? t("loading") : t("historyBtn")}
            </button>

            {historyResult && (
              <div className="mt-4">
                {historyResult.logs.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t("historyEmpty")}</p>
                ) : (
                  <div className="border border-gray-100 dark:border-white/10 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-white/[0.03]">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Date</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                            {language === "fr" ? "Type" : "Type"}
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                            {language === "fr" ? "Détails" : "Details"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                        {historyResult.logs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {log.timestamp
                                ? new Date(
                                    typeof log.timestamp === "string"
                                      ? log.timestamp
                                      : log.timestamp._seconds * 1000
                                  ).toLocaleDateString(language, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </td>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{log.eventType}</td>
                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{log.details || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Section 3: Delete Account (Article 17) ── */}
          <section className="border border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-900/10 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-700 dark:text-red-300">{t("deleteTitle")}</h3>
                <p className="text-sm text-red-600/70 dark:text-red-400/70 mt-1">{t("deleteDesc")}</p>
              </div>
            </div>

            {deleteResult?.success ? (
              <div className="mt-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div className="text-sm text-green-700 dark:text-green-300">
                  <p>{deleteResult.message || t("successGeneric")}</p>
                  {deleteResult.hasLegalRetention && (
                    <p className="mt-1 text-xs opacity-80">
                      {language === "fr"
                        ? "Certaines données seront conservées pour obligations légales (factures : 10 ans)."
                        : "Some data will be retained for legal obligations (invoices: 10 years)."}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("deleteReasonLabel")}
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition resize-none text-sm"
                  />
                </div>

                {/* Email confirmation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("deleteConfirmLabel")} <span className="font-mono text-xs opacity-60">{user?.email}</span>
                  </label>
                  <input
                    type="email"
                    value={deleteConfirmEmail}
                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-white/70 dark:bg-white/[0.03] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition text-sm"
                    autoComplete="off"
                  />
                </div>

                {/* Checkbox */}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t("deleteConfirmCheck")}</span>
                </label>

                {/* Button */}
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading || !canDelete}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl transition"
                >
                  {deleteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {deleteLoading ? t("loading") : t("deleteBtn")}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardGDPR;
