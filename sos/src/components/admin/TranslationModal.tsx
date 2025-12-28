import React, { useState, useEffect } from "react";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useProviderTranslation } from "../../hooks/useProviderTranslation";
import { SupportedLanguage } from "@/services/providerTranslationService";
import {
  Languages as LanguagesIcon,
  Eye,
  Pencil,
  Snowflake,
  Unlock,
  RefreshCw,
  Ban,
  Loader2,
  CircleSlash, // added
} from "lucide-react";
import ViewEditLanguageTranslationModal from "./ViewEditLanguageTranslationModal";

type Lang = "fr" | "en";
const detectLang = (): Lang => {
  const ls = (localStorage.getItem("admin_lang") || "").toLowerCase();
  if (ls === "fr" || ls === "en") return ls as Lang;
  return navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en";
};
// Extend i18n strings with confirmation labels
const STRINGS: Record<Lang, Record<string, string>> = {
  fr: {
    translation: "Traduction",
    languageDashboard: "Tableau des langues",
    loading: "Chargement…",
    translateAll: "Traduire tout",
    tableActions: "Actions",
    cancel: "Annuler",
    translateNow: "Traduire maintenant",
    view: "Voir",
    edit: "Modifier manuellement",
    freeze: "Geler",
    update: "Mettre à jour",
    viewCurrent: "Voir version actuelle",
    ignore: "Ignorer",
    unfreeze: "Dégeler",
    disableLanguage: "Désactiver langue",
    needsUpdate: "Mise à jour nécessaire",
    modifiedFields: "Champs modifiés",
    createdAt: "Créé",
    updatedAt: "Mis à jour",
    actions: "Actions",
    confirmTitle: "Confirmation",
    confirmDisableMsg: "Êtes-vous sûr de vouloir désactiver cette langue ?",
    confirmFreezeMsg: "Êtes-vous sûr de vouloir geler cette langue ?",
    confirmTranslateMsg: "Voulez-vous traduire cette langue maintenant ?",
    confirmTranslateAllMsg: "Cette action va créer des traductions pour toutes les langues manquantes. Continuer ?",
    confirm: "Confirmer",
    proceed: "Continuer",
  },
  en: {
    translation: "Translation",
    languageDashboard: "Language Dashboard",
    loading: "Loading…",
    translateAll: "Translate all",
    tableActions: "Actions",
    cancel: "Cancel",
    translateNow: "Translate Now",
    view: "View",
    edit: "Manually edit",
    freeze: "Freeze",
    update: "Update",
    viewCurrent: "View current version",
    ignore: "Ignore",
    unfreeze: "Unfreeze",
    disableLanguage: "Disable Language",
    needsUpdate: "Needs Update",
    modifiedFields: "Modified fields",
    createdAt: "Created",
    updatedAt: "Updated",
    actions: "Actions",
    confirmTitle: "Confirmation",
    confirmDisableMsg: "Are you sure you want to disable this language?",
    confirmFreezeMsg: "Are you sure you want to freeze this language?",
    confirmTranslateMsg: "Do you want to translate this language now?",
    confirmTranslateAllMsg: "This will create translations for all missing languages. Continue?",
    confirm: "Confirm",
    proceed: "Proceed",
  },
};
const useI18n = () => {
  const [lang, setLang] = useState<Lang>(detectLang());
  useEffect(() => localStorage.setItem("admin_lang", lang), [lang]);
  const tLocal = (k: keyof typeof STRINGS["fr"]) => STRINGS[lang][k] ?? (k as string);
  return { tLocal, lang, setLang };
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  providerId: string | null;
  t: (k: string) => string;
};

// Convertit le code de langue interne 'ch' vers le code Firebase 'zh'
const toFirebaseKey = (lang: SupportedLanguage): string => lang === 'ch' ? 'zh' : lang;

const TranslationModal: React.FC<Props> = ({ isOpen, onClose, providerId /*, t */ }) => {
  const { tLocal } = useI18n();

  const [loading, setLoading] = useState(false);
  const [translationsDoc, setTranslationsDoc] = useState<any | null>(null);
  const [langLoading, setLangLoading] = useState<Record<SupportedLanguage, boolean>>({} as Record<SupportedLanguage, boolean>);
  const [langError, setLangError] = useState<Record<SupportedLanguage, string>>({} as Record<SupportedLanguage, string>);
  const [translateAllMode, setTranslateAllMode] = useState(false);
  const [langModal, setLangModal] = useState<{ lang: SupportedLanguage; mode: "view" | "edit" } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "disable" | "freeze" | "translate" | "translateAll"; lang?: SupportedLanguage } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [updating, setUpdating] = useState(false);

  const {
    translate,
    reloadForLanguage,
    availableLanguages,
    isLoading: translationLoading,
    error: translationError,
  } = useProviderTranslation(providerId, null);

  const dashboardLanguages: SupportedLanguage[] = ["en", "es", "fr", "de", "ru", "pt", "hi", "ch", "ar"];
  const anyLangBusy = Object.values(langLoading).some(Boolean);

  useEffect(() => {
    if (!isOpen) {
      setTranslationsDoc(null);
      setLangLoading({} as Record<SupportedLanguage, boolean>);
      setLangError({} as Record<SupportedLanguage, string>);
      return;
    }
    if (!providerId) return;

    const fetchTranslations = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "providers_translations", providerId);
        const snap = await getDoc(ref);
        setTranslationsDoc(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.error("[TranslationModal] fetch providers_translations error", e);
        setTranslationsDoc(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTranslations();
  }, [isOpen, providerId]);

  const formatTimestamp = (ts: any): string => {
    if (!ts) return "";
    let date: Date | null = null;
    if (typeof ts?.toDate === "function") date = ts.toDate();
    else if (typeof ts?._seconds === "number") {
      const ms = ts._seconds * 1000 + Math.floor((ts._nanoseconds || 0) / 1e6);
      date = new Date(ms);
    }
    if (!date) return "";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Read status ONLY from metadata.translations[lang].status
  // Note: Firebase uses 'zh' key for Chinese, frontend uses 'ch'
  const getLangStatus = (lang: SupportedLanguage, tdoc: any):
    "missing" | "created" | "outdated" | "frozen" | "disable" => {
    const metaTrans = tdoc?.metadata?.translations || {};
    const fbKey = toFirebaseKey(lang);
    const status = metaTrans?.[fbKey]?.status;
    if (!status) return "missing";
    // allow known statuses
    if (status === "outdated") return "outdated";
    if (status === "disable") return "disable";
    if (status === "frozen") return "frozen";
    return "created";
  };

  // After translate, set metadata.translations[lang].status = "created"
  const translateLanguage = async (lang: SupportedLanguage) => {
    if (!providerId) return;
    setUpdating(true);
    setLangError((prev) => ({ ...prev, [lang]: "" }));
    setLangLoading((prev) => ({ ...prev, [lang]: true }));
    const fbKey = toFirebaseKey(lang);
    try {
      await translate(lang);
      if (reloadForLanguage) await reloadForLanguage(lang);

      const ref = doc(db, "providers_translations", providerId);
      const snap = await getDoc(ref);
      const current = snap.exists() ? snap.data() : {};
      const nextMetadataTranslations = {
        ...(current.metadata?.translations || {}),
        [fbKey]: {
          ...(current.metadata?.translations?.[fbKey] || {}),
          status: "created",
          updatedAt: new Date(),
        },
      };
      await updateDoc(ref, {
        metadata: {
          ...(current.metadata || {}),
          translations: nextMetadataTranslations,
        },
      });
      const refreshed = await getDoc(ref);
      setTranslationsDoc(refreshed.exists() ? refreshed.data() : null);
    } catch (e) {
      console.error("[TranslationModal] translateLanguage error", e);
      setLangError((prev) => ({
        ...prev,
        [lang]: tLocal("updatedAt") || "Update failed.",
      }));
    } finally {
      setLangLoading((prev) => ({ ...prev, [lang]: false }));
      setUpdating(false);
    }
  };

  // Disable language: set metadata.translations[lang].status = "disable"
  const disableLanguage = async (lang: SupportedLanguage) => {
    if (!providerId) return;
    setUpdating(true);
    setLangError((prev) => ({ ...prev, [lang]: "" }));
    setLangLoading((prev) => ({ ...prev, [lang]: true }));
    const fbKey = toFirebaseKey(lang);
    try {
      const ref = doc(db, "providers_translations", providerId);
      const snap = await getDoc(ref);
      const current = snap.exists() ? snap.data() : {};
      const nextMetadataTranslations = {
        ...(current.metadata?.translations || {}),
        [fbKey]: {
          ...(current.metadata?.translations?.[fbKey] || {}),
          status: "disable",
          updatedAt: new Date(),
        },
      };
      await updateDoc(ref, {
        metadata: {
          ...(current.metadata || {}),
          translations: nextMetadataTranslations,
        },
      });
      const refreshed = await getDoc(ref);
      setTranslationsDoc(refreshed.exists() ? refreshed.data() : null);
    } catch (e) {
      console.error("[TranslationModal] disableLanguage error", e);
      setLangError((prev) => ({
        ...prev,
        [lang]: tLocal("updatedAt") || "Update failed.",
      }));
    } finally {
      setLangLoading((prev) => ({ ...prev, [lang]: false }));
      setUpdating(false);
    }
  };

  // Freeze language: set metadata.translations[lang].status = "frozen"
  const freezeLanguage = async (lang: SupportedLanguage) => {
    if (!providerId) return;
    setUpdating(true);
    setLangError((prev) => ({ ...prev, [lang]: "" }));
    setLangLoading((prev) => ({ ...prev, [lang]: true }));
    const fbKey = toFirebaseKey(lang);
    try {
      const ref = doc(db, "providers_translations", providerId);
      const snap = await getDoc(ref);
      const current = snap.exists() ? snap.data() : {};
      const nextMetadataTranslations = {
        ...(current.metadata?.translations || {}),
        [fbKey]: {
          ...(current.metadata?.translations?.[fbKey] || {}),
          status: "frozen",
          updatedAt: new Date(),
        },
      };
      await updateDoc(ref, {
        metadata: {
          ...(current.metadata || {}),
          translations: nextMetadataTranslations,
        },
      });
      const refreshed = await getDoc(ref);
      setTranslationsDoc(refreshed.exists() ? refreshed.data() : null);
    } catch (e) {
      console.error("[TranslationModal] freezeLanguage error", e);
      setLangError((prev) => ({
        ...prev,
        [lang]: "Freeze failed.",
      }));
    } finally {
      setLangLoading((prev) => ({ ...prev, [lang]: false }));
      setUpdating(false);
    }
  };

  // Unfreeze language: set metadata.translations[lang].status = "created"
  const unfreezeLanguage = async (lang: SupportedLanguage) => {
    if (!providerId) return;
    setUpdating(true);
    setLangError((prev) => ({ ...prev, [lang]: "" }));
    setLangLoading((prev) => ({ ...prev, [lang]: true }));
    const fbKey = toFirebaseKey(lang);
    try {
      const ref = doc(db, "providers_translations", providerId);
      const snap = await getDoc(ref);
      const current = snap.exists() ? snap.data() : {};
      const nextMetadataTranslations = {
        ...(current.metadata?.translations || {}),
        [fbKey]: {
          ...(current.metadata?.translations?.[fbKey] || {}),
          status: "created",
          updatedAt: new Date(),
        },
      };
      await updateDoc(ref, {
        metadata: {
          ...(current.metadata || {}),
          translations: nextMetadataTranslations,
        },
      });
      const refreshed = await getDoc(ref);
      setTranslationsDoc(refreshed.exists() ? refreshed.data() : null);
    } catch (e) {
      console.error("[TranslationModal] unfreezeLanguage error", e);
      setLangError((prev) => ({
        ...prev,
        [lang]: "Unfreeze failed.",
      }));
    } finally {
      setLangLoading((prev) => ({ ...prev, [lang]: false }));
      setUpdating(false);
    }
  };

  const ActionIcon = ({
    titleText,
    onClick,
    disabled,
    children,
  }: {
    titleText: string;
    onClick?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      title={titleText}
      aria-label={titleText}
      className={`p-2 rounded border hover:bg-gray-50 text-gray-700 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );

  const renderStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      missing: "bg-red-100 text-red-700",
      created: "bg-green-100 text-green-700",
      outdated: "bg-yellow-100 text-yellow-700",
      frozen: "bg-gray-200 text-gray-800",
      disable: "bg-gray-100 text-gray-600",
    };
    const labels: Record<string, string> = {
      missing: "❌ missing",
      created: "✅ created",
      outdated: "⚠️ outdated",
      frozen: "🔒 frozen",
      disable: "⛔ disabled",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[status] || "bg-slate-100"}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Normalize initial data for the edit/view modal to contain only allowed keys.
  const getLanguageData = (lang: SupportedLanguage) => {
    const fbKey = toFirebaseKey(lang);
    const primary = translationsDoc?.translations?.[fbKey] || {};
    const raw = typeof primary === "object" && primary ? primary : (translationsDoc?.[fbKey] || translationsDoc?.metadata?.translations?.[fbKey] || {});
    return {
      bio: typeof raw.bio === "string" ? raw.bio : "",
      specialties: Array.isArray(raw.specialties) ? raw.specialties : [],
      motivation: typeof raw.motivation === "string" ? raw.motivation : "",
    };
  };

  // Save edited fields (only allowed keys) into translations[lang] and bump metadata.translations[lang].updatedAt.
  const saveLanguageEdits = async (
    lang: SupportedLanguage,
    updates: { bio?: string; specialties?: string[]; motivation?: string }
  ) => {
    if (!providerId) return;
    setUpdating(true);
    setLangError((prev) => ({ ...prev, [lang]: "" }));
    setLangLoading((prev) => ({ ...prev, [lang]: true }));
    const fbKey = toFirebaseKey(lang);
    try {
      const ref = doc(db, "providers_translations", providerId);
      const snap = await getDoc(ref);
      const current = snap.exists() ? snap.data() : {};

      const currentLangTrans = current?.translations?.[fbKey] || {};
      const nextLangTrans = {
        ...currentLangTrans,
        ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
        ...(Array.isArray(updates.specialties) ? { specialties: updates.specialties } : {}),
        ...(updates.motivation !== undefined ? { motivation: updates.motivation } : {}),
        updatedAt: new Date(),
      };

      const nextTranslations = {
        ...(current.translations || {}),
        [fbKey]: nextLangTrans,
      };

      const nextMetadataTranslations = {
        ...(current.metadata?.translations || {}),
        [fbKey]: {
          ...(current.metadata?.translations?.[fbKey] || {}),
          status: (current.metadata?.translations?.[fbKey]?.status as string) || "created",
          updatedAt: new Date(),
        },
      };

      await updateDoc(ref, {
        translations: nextTranslations,
        metadata: {
          ...(current.metadata || {}),
          translations: nextMetadataTranslations,
        },
      });

      const refreshed = await getDoc(ref);
      setTranslationsDoc(refreshed.exists() ? refreshed.data() : null);
      setLangModal(null); // close edit modal and return to dashboard
    } catch (e) {
      console.error("[TranslationModal] saveLanguageEdits error", e);
      setLangError((prev) => ({
        ...prev,
        [lang]: "Save failed.",
      }));
    } finally {
      setLangLoading((prev) => ({ ...prev, [lang]: false }));
      setUpdating(false);
    }
  };

  // Open confirm modal for actions
  const requestConfirm = (
    type: "disable" | "freeze" | "translate" | "translateAll",
    lang?: SupportedLanguage
  ) => {
    setConfirmAction({ type, lang });
  };

  // Execute confirmed action
  const performConfirmedAction = async () => {
    if (!confirmAction) return;
    setConfirmBusy(true);
    setUpdating(true);
    try {
      if (confirmAction.type === "disable" && confirmAction.lang) {
        await disableLanguage(confirmAction.lang);
      } else if (confirmAction.type === "freeze" && confirmAction.lang) {
        await freezeLanguage(confirmAction.lang);
      } else if (confirmAction.type === "translate" && confirmAction.lang) {
        await translateLanguage(confirmAction.lang);
      } else if (confirmAction.type === "translateAll") {
        // translate missing languages only
        const missingLangs = dashboardLanguages.filter(
          (l) => getLangStatus(l, translationsDoc) === "missing"
        );
        for (const l of missingLangs) {
          // mark individual language busy
          setLangLoading((prev) => ({ ...prev, [l]: true }));
          try {
            await translateLanguage(l);
          } finally {
            setLangLoading((prev) => ({ ...prev, [l]: false }));
          }
        }
      }
      setConfirmAction(null);
    } finally {
      setConfirmBusy(false);
      setUpdating(false);
    }
  };

  const renderActions = (lang: SupportedLanguage, status: string) => {
    const busy = !!langLoading[lang];
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
          {status === "missing" ? (
            <ActionIcon
              titleText={tLocal("translateNow")}
              onClick={() => requestConfirm("translate", lang)}
              disabled={busy || loading}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LanguagesIcon className="w-4 h-4" />}
            </ActionIcon>
          ) : null}

          {status === "created" && (
            <>
              <ActionIcon titleText={tLocal("view")} disabled={busy || loading} onClick={() => setLangModal({ lang, mode: "view" })}>
                <Eye className="w-4 h-4" />
              </ActionIcon>
              <ActionIcon titleText={tLocal("edit")} disabled={busy || loading} onClick={() => setLangModal({ lang, mode: "edit" })}>
                <Pencil className="w-4 h-4" />
              </ActionIcon>
              <ActionIcon
                titleText={tLocal("freeze")}
                disabled={busy || loading}
                onClick={() => requestConfirm("freeze", lang)}
              >
                <Snowflake className="w-4 h-4" />
              </ActionIcon>
            </>
          )}

          {status === "outdated" && (
            <>
              <ActionIcon titleText={tLocal("update")} disabled={busy || loading}>
                <RefreshCw className="w-4 h-4" />
              </ActionIcon>
              <ActionIcon titleText={tLocal("viewCurrent")} disabled={busy || loading} onClick={() => setLangModal({ lang, mode: "view" })}>
                <Eye className="w-4 h-4" />
              </ActionIcon>
              <ActionIcon titleText={tLocal("ignore")} disabled={busy || loading}>
                <Ban className="w-4 h-4" />
              </ActionIcon>
            </>
          )}

          {status === "frozen" && (
            <>
              <ActionIcon titleText={tLocal("view")} disabled={busy || loading} onClick={() => setLangModal({ lang, mode: "view" })}>
                <Eye className="w-4 h-4" />
              </ActionIcon>
              <ActionIcon titleText={tLocal("edit")} disabled={busy || loading} onClick={() => setLangModal({ lang, mode: "edit" })}>
                <Pencil className="w-4 h-4" />
              </ActionIcon>
              <ActionIcon
                titleText={tLocal("unfreeze")}
                disabled={busy || loading}
                onClick={() => unfreezeLanguage(lang)}
              >
                <Unlock className="w-4 h-4" />
              </ActionIcon>
            </>
          )}

          <ActionIcon
            titleText={tLocal("disableLanguage")}
            disabled={!!langLoading[lang] || loading}
            onClick={() => requestConfirm("disable", lang)}
          >
            <CircleSlash className="w-4 h-4" />
          </ActionIcon>
        </div>
        {langError[lang] && <div className="text-xs text-red-600 mt-1">{langError[lang]}</div>}
      </div>
    );
  };

  const LANG_LABELS: Record<SupportedLanguage, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    ru: "Russian",
    pt: "Portuguese",
    hi: "Hindi",
    ch: "Chinese",
    ar: "Arabic",
    zh: "Chinese",
  };
  const formatLanguageLabel = (lang: SupportedLanguage) =>
    `${LANG_LABELS[lang] || lang.toUpperCase()} (${lang.toUpperCase()})`;

  // Confirmation modal content builder
  const confirmMessage = () => {
    if (!confirmAction) return "";
    if (confirmAction.type === "disable") return `${tLocal("confirmDisableMsg")} (${confirmAction.lang!.toUpperCase()})`;
    if (confirmAction.type === "freeze") return `${tLocal("confirmFreezeMsg")} (${confirmAction.lang!.toUpperCase()})`;
    if (confirmAction.type === "translate") return `${tLocal("confirmTranslateMsg")} (${confirmAction.lang!.toUpperCase()})`;
    return tLocal("confirmTranslateAllMsg");
  };

  // If a confirmation is pending, show it (one modal at a time)
  if (confirmAction) {
    return (
      <Modal
        isOpen={true}
        onClose={() => (confirmBusy ? null : setConfirmAction(null))}
        title={tLocal("confirmTitle")}
      >
        <div className="p-4 space-y-3">
          <div className="text-sm">{confirmMessage()}</div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmAction(null)} disabled={confirmBusy}>
              {tLocal("cancel")}
            </Button>
            <Button onClick={performConfirmedAction} disabled={confirmBusy}>
              {confirmBusy ? tLocal("loading") : tLocal("confirm")}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Render: one modal at a time (view/edit > confirm > dashboard)
  if (langModal) {
    return (
      <ViewEditLanguageTranslationModal
        isOpen={true}
        mode={langModal.mode}
        lang={langModal.lang}
        initialData={getLanguageData(langModal.lang)}
        onClose={() => setLangModal(null)}
        onSave={langModal.mode === "edit" ? (data) => saveLanguageEdits(langModal.lang, data) : undefined}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tLocal("translation")}>
      <div className="pb-4 w-full">
        {/* Translate-all controls BEFORE dashboard */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={translateAllMode}
                onChange={(e) => setTranslateAllMode(e.target.checked)}
                disabled={updating}
              />
              <span>{tLocal("translateAll")}</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            {(loading || updating) && <span className="text-xs text-gray-500">{tLocal("loading")}</span>}
            {/* <span className="text-xs text-gray-600">{tLocal("tableActions")}</span> */}
          </div>
        </div>

        {/* Optional translate-all button shown before dashboard when enabled */}
        {translateAllMode && (
          <div className="flex justify-start mb-3">
            <Button
              variant="secondary"
              onClick={() => requestConfirm("translateAll")}
              disabled={loading || updating || anyLangBusy}
            >
              {tLocal("translateAll")}
            </Button>
          </div>
        )}

        {/* Language Dashboard */}
        <div className="border rounded p-2 sm:p-3">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold">{tLocal("languageDashboard")}</h3>
            </div>
            <div className="flex items-center gap-3">
              {(loading || updating) && <span className="text-xs text-gray-500">{tLocal("loading")}</span>}
              <span className="s text-gray-600">{tLocal("tableActions")}</span>
            </div>
          </div>

          {loading ? (
            <div className="divide-y">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="py-3 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                  </div>
                  <div className="mt-2 h-3 w-2/3 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {dashboardLanguages.map((lang) => {
                const status = getLangStatus(lang as SupportedLanguage, translationsDoc);
                const fbKey = toFirebaseKey(lang);
                const details = translationsDoc?.translations?.[fbKey] || null;
                const modifiedFields = Array.isArray(details?.lastFieldsUpdated) ? details.lastFieldsUpdated : [];
                const updatedAt = details?.updatedAt;
                const createdAt = details?.createdAt;

                return (
                  <div key={lang} className="py-2 sm:py-3 flex items-start justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">
                          {formatLanguageLabel(lang as SupportedLanguage)}
                        </div>
                        {renderStatusBadge(status)}
                      </div>

                      {/* Removed extra metadata/translation status lines; show only main status icon */}
                      {status === "outdated" && (
                        <div className="mt-1 text-xs text-gray-700">
                          <div className="font-semibold">{tLocal("needsUpdate")}</div>
                          {modifiedFields.length > 0 && (
                            <div className="mt-1">
                              <span className="text-gray-600">{tLocal("modifiedFields")}: </span>
                              <span className="text-gray-800">
                                {modifiedFields.slice(0, 5).join(", ")}
                                {modifiedFields.length > 5 ? " ..." : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {status !== "missing" && (
                        <div className="mt-1 text-xs text-gray-500">
                          {createdAt && (
                            <div>
                              {tLocal("createdAt")}: {formatTimestamp(createdAt)}
                            </div>
                          )}
                          {updatedAt && (
                            <div>
                              {tLocal("updatedAt")}: {formatTimestamp(updatedAt)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 whitespace-nowrap">
                      {renderActions(lang as SupportedLanguage, status)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading || updating || anyLangBusy}>
            {tLocal("cancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TranslationModal;