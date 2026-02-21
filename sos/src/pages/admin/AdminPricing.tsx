// src/pages/admin/AdminPricing.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useIntl } from "react-intl";
import {
  Settings,
  Save,
  Euro,
  DollarSign,
  Calendar,
  Check,
  X,
  RefreshCw,
  Eye,
} from "lucide-react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import AdminLayout from "../../components/admin/AdminLayout";
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { clearPricingCache } from "../../services/pricingService";
import { refreshAdminClaims } from "../../utils/auth";

/* ---------------- Types ---------------- */

type Currency = "eur" | "usd";
type ServiceKind = "expat" | "lawyer";
type ServiceLabelKey = "admin.pricing.serviceExpat" | "admin.pricing.serviceLawyer";

interface PricingNode {
  connectionFeeAmount: number; // notre marge
  providerAmount: number; // reversé prestataire
  totalAmount: number; // total client
  currency: Currency;
  duration: number; // minutes
}

interface PricingOverrideNode {
  enabled: boolean;
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
  connectionFeeAmount: number;
  providerAmount: number;
  totalAmount: number;
  stackableWithCoupons: boolean;
  label: string;
  labels: Record<string, string>;
  strikeTargets: string; // pour l’affichage "prix barré" si tu l’utilises au front
}

interface PricingDoc {
  expat?: Partial<Record<Currency, PricingNode>>;
  lawyer?: Partial<Record<Currency, PricingNode>>;
  overrides?: {
    settings?: { stackableDefault?: boolean };
    expat?: Partial<Record<Currency, Partial<PricingOverrideNode>>>;
    lawyer?: Partial<Record<Currency, Partial<PricingOverrideNode>>>;
  };
  updatedAt?: Timestamp;
  updatedBy?: string;
}

interface CouponDoc {
  code: string;
  type: "fixed" | "percentage";
  amount: number;
  active?: boolean;
  services?: Array<"expat_call" | "lawyer_call">;
  min_order_amount?: number;
  valid_from?: Timestamp;
  valid_until?: Timestamp;
  maxDiscount?: number;
}

/* ------------- Helpers ------------- */

const isSumOk = (a: number, b: number, total: number) =>
  Math.abs(a + b - total) < 0.001;

const toDate = (t: Timestamp | null | undefined): Date | null =>
  t && typeof t.toDate === "function" ? t.toDate() : null;

const SERVICE_LABEL_KEY: Record<ServiceKind, ServiceLabelKey> = {
  expat: "admin.pricing.serviceExpat",
  lawyer: "admin.pricing.serviceLawyer",
};

const SUPPORTED_LANGS = ["fr", "en", "es", "de", "pt", "ru", "hi", "ar", "ch"] as const;
const EMPTY_LABELS: Record<string, string> = Object.fromEntries(SUPPORTED_LANGS.map(l => [l, ""]));
type LangCode = typeof SUPPORTED_LANGS[number];

// Formater un prix avec 2 décimales et virgule (format français)
const formatPrice = (value: number): string => {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/* ------------- Composants réutilisables ------------- */

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-emerald-500" : "bg-gray-300"}`}
    aria-pressed={checked}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
    />
  </button>
);

/* ------------- Page ------------- */

const AdminPricing: React.FC = () => {
  const intl = useIntl();
  const { user } = useAuth();

  // filtres de travail
  const [service, setService] = useState<ServiceKind>("expat");
  const [currency, setCurrency] = useState<Currency>("eur");

  // réglage global
  const [stackableDefault, setStackableDefault] = useState<boolean>(true);

  // base
  const [base, setBase] = useState<
    Record<ServiceKind, Record<Currency, PricingNode>>
  >({
    expat: {
      eur: {
        connectionFeeAmount: 9,
        providerAmount: 30,
        totalAmount: 39,
        currency: "eur",
        duration: 30,
      },
      usd: {
        connectionFeeAmount: 15,
        providerAmount: 34,
        totalAmount: 49,
        currency: "usd",
        duration: 30,
      },
    },
    lawyer: {
      eur: {
        connectionFeeAmount: 19,
        providerAmount: 36,
        totalAmount: 55,
        currency: "eur",
        duration: 20,
      },
      usd: {
        connectionFeeAmount: 25,
        providerAmount: 35,
        totalAmount: 60,
        currency: "usd",
        duration: 20,
      },
    },
  });

  // promo
  const [promo, setPromo] = useState<
    Record<ServiceKind, Record<Currency, PricingOverrideNode>>
  >({
    expat: {
      eur: {
        enabled: true,
        startsAt: null,
        endsAt: null,
        connectionFeeAmount: 19,
        providerAmount: 30,
        totalAmount: 49,
        stackableWithCoupons: true,
        label: "Promo Expat EUR",
        labels: { ...EMPTY_LABELS },
        strikeTargets: "default",
      },
      usd: {
        enabled: true,
        startsAt: null,
        endsAt: null,
        connectionFeeAmount: 19,
        providerAmount: 30,
        totalAmount: 49,
        stackableWithCoupons: true,
        label: "Promo Expat USD",
        labels: { ...EMPTY_LABELS },
        strikeTargets: "default",
      },
    },
    lawyer: {
      eur: {
        enabled: true,
        startsAt: null,
        endsAt: null,
        connectionFeeAmount: 19,
        providerAmount: 20,
        totalAmount: 39,
        stackableWithCoupons: true,
        label: "Promo Avocat EUR",
        labels: { ...EMPTY_LABELS },
        strikeTargets: "default",
      },
      usd: {
        enabled: true,
        startsAt: null,
        endsAt: null,
        connectionFeeAmount: 19,
        providerAmount: 20,
        totalAmount: 39,
        stackableWithCoupons: true,
        label: "Promo Avocat USD",
        labels: { ...EMPTY_LABELS },
        strikeTargets: "default",
      },
    },
  });

  // Tab langue active pour les labels promo
  const [labelTab, setLabelTab] = useState<LangCode>("fr");

  // preview
  const [previewCoupon, setPreviewCoupon] = useState<string>("");
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);
  const [previewDetails, setPreviewDetails] = useState<string>("");

  const selBase = base[service][currency];
  const selPromo = promo[service][currency];

  /* ----------- Load Firestore ----------- */

  const loadConfig = useCallback(async () => {
    const snap = await getDoc(doc(db, "admin_config", "pricing"));
    if (!snap.exists()) return;

    const data = snap.data() as PricingDoc;

    // Base
    const b = { ...base };
    (["expat", "lawyer"] as ServiceKind[]).forEach((s) => {
      (["eur", "usd"] as Currency[]).forEach((c) => {
        const node = data?.[s]?.[c];
        if (node) {
          b[s][c] = {
            connectionFeeAmount: Number(node.connectionFeeAmount ?? 0),
            providerAmount: Number(node.providerAmount ?? 0),
            totalAmount: Number(node.totalAmount ?? 0),
            currency: c,
            duration: Number(node.duration ?? 0),
          };
        }
      });
    });
    setBase(b);

    // Promo
    const p = { ...promo };
    (["expat", "lawyer"] as ServiceKind[]).forEach((s) => {
      (["eur", "usd"] as Currency[]).forEach((c) => {
        const o = data?.overrides?.[s]?.[c];
        if (o) {
          const rawLabels = (o as any).labels as Record<string, string> | undefined;
          p[s][c] = {
            enabled: Boolean(o.enabled),
            startsAt: o.startsAt ?? null,
            endsAt: o.endsAt ?? null,
            connectionFeeAmount: Number(o.connectionFeeAmount ?? 0),
            providerAmount: Number(o.providerAmount ?? 0),
            totalAmount: Number(o.totalAmount ?? 0),
            stackableWithCoupons: Boolean(o.stackableWithCoupons ?? true),
            label: String(o.label ?? ""),
            labels: { ...EMPTY_LABELS, ...(rawLabels || {}) },
            strikeTargets: String(o.strikeTargets ?? "default"),
          };
        }
      });
    });
    setPromo(p);

    // Global default
    setStackableDefault(
      Boolean(data?.overrides?.settings?.stackableDefault ?? true)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  /* ----------- Save Firestore ----------- */

  const saveBase = async (): Promise<void> => {
    if (
      !isSumOk(
        selBase.connectionFeeAmount,
        selBase.providerAmount,
        selBase.totalAmount
      )
    ) {
      toast.error(intl.formatMessage({ id: "admin.pricing.alertSumError" }));
      return;
    }

    const performSave = async () => {
      await setDoc(
        doc(db, "admin_config", "pricing"),
        {
          [service]: {
            [currency]: {
              connectionFeeAmount: Number(selBase.connectionFeeAmount),
              providerAmount: Number(selBase.providerAmount),
              totalAmount: Number(selBase.totalAmount),
              currency,
              duration: Number(selBase.duration),
            },
          },
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid ?? "admin",
        },
        { merge: true }
      );
    };

    try {
      await performSave();
      // Invalidate frontend cache so changes reflect immediately
      clearPricingCache();
      toast.success(intl.formatMessage({ id: "admin.pricing.alertBasePriceSaved" }));
    } catch (error: unknown) {
      // If permission denied, try refreshing admin claims and retry
      const err = error as { code?: string; message?: string };
      if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
        const claimsRefreshed = await refreshAdminClaims();
        if (claimsRefreshed) {
          try {
            await performSave();
            clearPricingCache();
            toast.success(intl.formatMessage({ id: "admin.pricing.alertBasePriceSaved" }));
            return;
          } catch (retryError) {
            console.error("[AdminPricing] Save failed after claims refresh:", retryError);
          }
        }
        toast.error(intl.formatMessage({ id: "admin.pricing.alertPermissionError" }));
      } else {
        console.error("[AdminPricing] Save error:", error);
        toast.error(intl.formatMessage({ id: "admin.pricing.alertSaveError" }) + " " + (err?.message || intl.formatMessage({ id: "admin.pricing.alertUnknownError" })));
      }
    }
  };

  const savePromo = async (): Promise<void> => {
    if (selPromo.enabled) {
      if (selPromo.startsAt && selPromo.endsAt) {
        const s = toDate(selPromo.startsAt)!;
        const e = toDate(selPromo.endsAt)!;
        if (s >= e) {
          toast.error(intl.formatMessage({ id: "admin.pricing.alertDateError" }));
          return;
        }
      }
      if (
        !isSumOk(
          selPromo.connectionFeeAmount,
          selPromo.providerAmount,
          selPromo.totalAmount
        )
      ) {
        toast.error(intl.formatMessage({ id: "admin.pricing.alertSumErrorPromo" }));
        return;
      }
    }

    const performSave = async () => {
      // Filtrer les labels vides pour ne pas stocker des clés inutiles
      const cleanLabels: Record<string, string> = {};
      for (const [lang, val] of Object.entries(selPromo.labels)) {
        if (val.trim()) cleanLabels[lang] = val.trim();
      }
      // Backward compat: label = labels.en (ou premier label non-vide)
      const backwardLabel = cleanLabels.en || Object.values(cleanLabels)[0] || selPromo.label || "";

      await setDoc(
        doc(db, "admin_config", "pricing"),
        {
          overrides: {
            [service]: {
              [currency]: {
                enabled: selPromo.enabled,
                startsAt: selPromo.startsAt ?? null,
                endsAt: selPromo.endsAt ?? null,
                connectionFeeAmount: Number(selPromo.connectionFeeAmount),
                providerAmount: Number(selPromo.providerAmount),
                totalAmount: Number(selPromo.totalAmount),
                stackableWithCoupons: Boolean(selPromo.stackableWithCoupons),
                label: backwardLabel,
                labels: cleanLabels,
                strikeTargets: selPromo.strikeTargets || "default",
              },
            },
          },
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid ?? "admin",
        },
        { merge: true }
      );
    };

    try {
      await performSave();
      // Invalidate frontend cache so changes reflect immediately
      clearPricingCache();
      toast.success(intl.formatMessage({ id: "admin.pricing.alertPromoPriceSaved" }));
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
        const claimsRefreshed = await refreshAdminClaims();
        if (claimsRefreshed) {
          try {
            await performSave();
            clearPricingCache();
            toast.success(intl.formatMessage({ id: "admin.pricing.alertPromoPriceSaved" }));
            return;
          } catch (retryError) {
            console.error("[AdminPricing] Promo save failed after claims refresh:", retryError);
          }
        }
        toast.error(intl.formatMessage({ id: "admin.pricing.alertPermissionError" }));
      } else {
        console.error("[AdminPricing] Promo save error:", error);
        toast.error(intl.formatMessage({ id: "admin.pricing.alertSaveError" }) + " " + (err?.message || intl.formatMessage({ id: "admin.pricing.alertUnknownError" })));
      }
    }
  };

  const saveGlobalStackable = async (value: boolean): Promise<void> => {
    try {
      await setDoc(
        doc(db, "admin_config", "pricing"),
        {
          overrides: { settings: { stackableDefault: value } },
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid ?? "admin",
        },
        { merge: true }
      );
      setStackableDefault(value);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
        const claimsRefreshed = await refreshAdminClaims();
        if (claimsRefreshed) {
          try {
            await setDoc(
              doc(db, "admin_config", "pricing"),
              {
                overrides: { settings: { stackableDefault: value } },
                updatedAt: serverTimestamp(),
                updatedBy: user?.uid ?? "admin",
              },
              { merge: true }
            );
            setStackableDefault(value);
            return;
          } catch (retryError) {
            console.error("[AdminPricing] Stackable save failed after claims refresh:", retryError);
          }
        }
        toast.error(intl.formatMessage({ id: "admin.pricing.alertPermissionError" }));
      } else {
        console.error("[AdminPricing] Stackable save error:", error);
        toast.error(intl.formatMessage({ id: "admin.pricing.alertSaveError" }));
      }
    }
  };

  /* ----------- Preview (logique back) ----------- */

  const isPromoActiveNow = useMemo(() => {
    const o = selPromo;
    if (!o.enabled) return false;
    const now = new Date();
    const s = toDate(o.startsAt);
    const e = toDate(o.endsAt);
    return (s ? now >= s : true) && (e ? now <= e : true);
  }, [selPromo]);

  const runPreview = useCallback(async () => {
    let total = selBase.totalAmount;
    let explanation = intl.formatMessage(
      { id: "admin.pricing.previewBasePrice" },
      { price: formatPrice(total), currency: currency.toUpperCase() }
    );

    if (isPromoActiveNow) {
      total = selPromo.totalAmount;
      explanation += ` → ${intl.formatMessage(
        { id: "admin.pricing.previewPromoActive" },
        { price: formatPrice(total), currency: currency.toUpperCase() }
      )}`;
    }

    // coupon si empilable (vérification légère, comme le back)
    if (previewCoupon.trim()) {
      const canStack = isPromoActiveNow
        ? selPromo.stackableWithCoupons
        : stackableDefault;

      if (!canStack && isPromoActiveNow) {
        explanation += ` • ${intl.formatMessage({ id: "admin.pricing.previewCouponIgnored" })}`;
      } else {
        const q = query(
          collection(db, "coupons"),
          where("code", "==", previewCoupon.trim().toUpperCase()),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const c = snap.docs[0].data() as CouponDoc;
          const now = new Date();
          const from = c.valid_from ? c.valid_from.toDate() : undefined;
          const until = c.valid_until ? c.valid_until.toDate() : undefined;
          const okDate =
            (from ? now >= from : true) && (until ? now <= until : true);
          const okActive = c.active !== false;
          const okService = Array.isArray(c.services)
            ? c.services.includes(
                service === "lawyer" ? "lawyer_call" : "expat_call"
              )
            : true;
          const okMin =
            typeof c.min_order_amount === "number"
              ? total >= c.min_order_amount
              : true;

          if (okDate && okActive && okService && okMin) {
            let discount = 0;
            if (c.type === "fixed") discount = c.amount;
            if (c.type === "percentage")
              discount = Math.round(((total * c.amount) / 100) * 100) / 100;
            if (typeof c.maxDiscount === "number")
              discount = Math.min(discount, c.maxDiscount);
            discount = Math.min(discount, total);
            total = Math.max(0, Math.round((total - discount) * 100) / 100);
            explanation += ` • ${intl.formatMessage(
              { id: "admin.pricing.previewCouponApplied" },
              { code: previewCoupon.toUpperCase(), discount: formatPrice(discount) }
            )}`;
          } else {
            explanation += ` • ${intl.formatMessage({ id: "admin.pricing.previewCouponNotApplicable" })}`;
          }
        } else {
          explanation += ` • ${intl.formatMessage({ id: "admin.pricing.previewCouponNotFound" })}`;
        }
      }
    }

    setPreviewTotal(total);
    setPreviewDetails(explanation);
  }, [
    selBase,
    selPromo,
    isPromoActiveNow,
    previewCoupon,
    service,
    currency,
    stackableDefault,
    intl,
  ]);

  /* ----------- UI ----------- */

  const errorSumBase = !isSumOk(
    selBase.connectionFeeAmount,
    selBase.providerAmount,
    selBase.totalAmount
  );
  const errorSumPromo =
    selPromo.enabled &&
    !isSumOk(
      selPromo.connectionFeeAmount,
      selPromo.providerAmount,
      selPromo.totalAmount
    );
  const errorDates =
    selPromo.enabled &&
    selPromo.startsAt &&
    selPromo.endsAt &&
    toDate(selPromo.startsAt)! >= toDate(selPromo.endsAt)!;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header moderne avec gradient */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <Settings className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{intl.formatMessage({ id: "admin.pricing.title" })}</h1>
                  <p className="text-blue-100 text-sm mt-1">
                    {intl.formatMessage({ id: "admin.pricing.subtitle" })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => void loadConfig()}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                {intl.formatMessage({ id: "admin.pricing.refresh" })}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Service / Devise / Options */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
            {/* Service selector */}
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{intl.formatMessage({ id: "admin.pricing.service" })}</div>
              <div className="flex gap-2">
                {(["expat", "lawyer"] as ServiceKind[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setService(s)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      service === s
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {intl.formatMessage({ id: SERVICE_LABEL_KEY[s] })}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency selector */}
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{intl.formatMessage({ id: "admin.pricing.currency" })}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrency("eur")}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    currency === "eur"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <Euro className="w-4 h-4" /> EUR
                </button>
                <button
                  onClick={() => setCurrency("usd")}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    currency === "usd"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <DollarSign className="w-4 h-4" /> USD
                </button>
              </div>
            </div>

            {/* Stackable option */}
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{intl.formatMessage({ id: "admin.pricing.globalOptions" })}</div>
              <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200">
                <Toggle
                  checked={stackableDefault}
                  onChange={(v) => void saveGlobalStackable(v)}
                />
                <span className="text-sm text-gray-700">{intl.formatMessage({ id: "admin.pricing.stackableCoupons" })}</span>
              </div>
            </div>
          </div>

          {/* Context indicator */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">{intl.formatMessage({ id: "admin.pricing.activeConfiguration" })}</span>
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                {intl.formatMessage({ id: SERVICE_LABEL_KEY[service] })} - {currency.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Bloc Prix de base - Design moderne */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          {/* Header de section */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <Euro className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{intl.formatMessage({ id: "admin.pricing.basePrice" })}</h2>
                  <p className="text-xs text-gray-500">
                    {intl.formatMessage({ id: SERVICE_LABEL_KEY[service] })} • {currency.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => void saveBase()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
              >
                <Save className="w-4 h-4" /> {intl.formatMessage({ id: "admin.pricing.save" })}
              </button>
            </div>
          </div>

          {/* Contenu */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Marge */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {intl.formatMessage({ id: "admin.pricing.sosMargin" })}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={selBase.connectionFeeAmount}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value || "0");
                      setBase((prev) => {
                        const next = { ...prev };
                        const provider = next[service][currency].providerAmount;
                        next[service][currency].connectionFeeAmount = v;
                        next[service][currency].totalAmount =
                          Math.round((v + provider) * 100) / 100;
                        return next;
                      });
                    }}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {currency.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Part prestataire */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {intl.formatMessage({ id: "admin.pricing.providerShare" })}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={selBase.providerAmount}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value || "0");
                      setBase((prev) => {
                        const next = { ...prev };
                        const connection =
                          next[service][currency].connectionFeeAmount;
                        next[service][currency].providerAmount = v;
                        next[service][currency].totalAmount =
                          Math.round((connection + v) * 100) / 100;
                        return next;
                      });
                    }}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {currency.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Total client */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <label className="block text-xs font-medium text-blue-600 uppercase tracking-wider mb-2">
                  {intl.formatMessage({ id: "admin.pricing.clientTotal" })}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={selBase.totalAmount}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value || "0");
                      setBase((prev) => {
                        const next = { ...prev };
                        const connection =
                          next[service][currency].connectionFeeAmount;
                        next[service][currency].totalAmount = v;
                        next[service][currency].providerAmount = Math.max(
                          0,
                          Math.round((v - connection) * 100) / 100
                        );
                        return next;
                      });
                    }}
                    className="w-full bg-white border border-blue-200 rounded-lg px-4 py-3 text-lg font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 text-sm font-medium">
                    {currency.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Durée */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {intl.formatMessage({ id: "admin.pricing.callDuration" })}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={selBase.duration}
                    onChange={(e) => {
                      const v = parseInt(e.target.value || "0", 10);
                      setBase((prev) => {
                        const next = { ...prev };
                        next[service][currency].duration = Math.max(0, v);
                        return next;
                      });
                    }}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {intl.formatMessage({ id: "admin.pricing.durationUnit" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Validation status */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{intl.formatMessage({ id: "admin.pricing.formula" })}</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {intl.formatMessage({ id: "admin.pricing.formulaDescription" })}
                </code>
              </div>
              {errorSumBase ? (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                  <X className="w-4 h-4" />
                  <span className="text-sm font-medium">{intl.formatMessage({ id: "admin.pricing.sumInconsistent" })}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">{intl.formatMessage({ id: "admin.pricing.calculationValidated" })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bloc Prix promotionnel - Design moderne */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          {/* Header de section avec toggle */}
          <div className={`px-6 py-4 border-b ${selPromo.enabled ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100' : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-2 ${selPromo.enabled ? 'bg-orange-100' : 'bg-gray-200'}`}>
                  <Calendar className={`w-5 h-5 ${selPromo.enabled ? 'text-orange-600' : 'text-gray-500'}`} />
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">{intl.formatMessage({ id: "admin.pricing.promoPrice" })}</h2>
                    <p className="text-xs text-gray-500">{intl.formatMessage({ id: "admin.pricing.promoPriceDescription" })}</p>
                  </div>
                  {/* Toggle intégré au header */}
                  <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-lg border border-gray-200">
                    <Toggle
                      checked={selPromo.enabled}
                      onChange={(v) =>
                        setPromo((prev) => {
                          const next = { ...prev };
                          next[service][currency].enabled = v;
                          return next;
                        })
                      }
                    />
                    <span className={`text-sm font-medium ${selPromo.enabled ? 'text-orange-600' : 'text-gray-500'}`}>
                      {selPromo.enabled ? intl.formatMessage({ id: "admin.pricing.active" }) : intl.formatMessage({ id: "admin.pricing.inactive" })}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => void savePromo()}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors shadow-sm ${
                  selPromo.enabled
                    ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                    : 'bg-gray-400 hover:bg-gray-500 shadow-gray-200'
                }`}
              >
                <Save className="w-4 h-4" /> {intl.formatMessage({ id: "admin.pricing.save" })}
              </button>
            </div>
          </div>

          {/* Contenu */}
          <div className={`p-6 ${!selPromo.enabled ? 'opacity-50' : ''}`}>
            {/* Période */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {intl.formatMessage({ id: "admin.pricing.startDate" })}
                </label>
                <input
                  type="datetime-local"
                  value={
                    toDate(selPromo.startsAt)
                      ? new Date(
                          toDate(selPromo.startsAt)!.getTime() -
                            toDate(selPromo.startsAt)!.getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setPromo((prev) => {
                      const next = { ...prev };
                      next[service][currency].startsAt = e.target.value
                        ? Timestamp.fromDate(new Date(e.target.value))
                        : null;
                      return next;
                    })
                  }
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {intl.formatMessage({ id: "admin.pricing.endDate" })}
                </label>
                <input
                  type="datetime-local"
                  value={
                    toDate(selPromo.endsAt)
                      ? new Date(
                          toDate(selPromo.endsAt)!.getTime() -
                            toDate(selPromo.endsAt)!.getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setPromo((prev) => {
                      const next = { ...prev };
                      next[service][currency].endsAt = e.target.value
                        ? Timestamp.fromDate(new Date(e.target.value))
                        : null;
                      return next;
                    })
                  }
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Prix promo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {intl.formatMessage({ id: "admin.pricing.promoMargin" })}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={selPromo.connectionFeeAmount}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value || "0");
                      setPromo((prev) => {
                        const next = { ...prev };
                        const prov = next[service][currency].providerAmount;
                        next[service][currency].connectionFeeAmount = v;
                        next[service][currency].totalAmount =
                          Math.round((v + prov) * 100) / 100;
                        return next;
                      });
                    }}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {currency.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {intl.formatMessage({ id: "admin.pricing.providerShare" })}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={selPromo.providerAmount}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value || "0");
                      setPromo((prev) => {
                        const next = { ...prev };
                        const con = next[service][currency].connectionFeeAmount;
                        next[service][currency].providerAmount = v;
                        next[service][currency].totalAmount =
                          Math.round((con + v) * 100) / 100;
                        return next;
                      });
                    }}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {currency.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <label className="block text-xs font-medium text-orange-600 uppercase tracking-wider mb-2">
                  {intl.formatMessage({ id: "admin.pricing.promoClientTotal" })}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={selPromo.totalAmount}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value || "0");
                      setPromo((prev) => {
                        const next = { ...prev };
                        const con = next[service][currency].connectionFeeAmount;
                        next[service][currency].totalAmount = v;
                        next[service][currency].providerAmount = Math.max(
                          0,
                          Math.round((v - con) * 100) / 100
                        );
                        return next;
                      });
                    }}
                    className="w-full bg-white border border-orange-200 rounded-lg px-4 py-3 text-lg font-bold text-orange-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-400 text-sm font-medium">
                    {currency.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Labels multilingues (9 langues) */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                {intl.formatMessage({ id: "admin.pricing.promoLabel" })} — {intl.formatMessage({ id: "admin.pricing.promoLabelMultilang" }, { defaultMessage: "Multilingue" })}
              </label>
              {/* Tabs langues */}
              <div className="flex flex-wrap gap-1 mb-3">
                {SUPPORTED_LANGS.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLabelTab(lang)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                      labelTab === lang
                        ? "bg-orange-500 text-white shadow-sm"
                        : selPromo.labels[lang]?.trim()
                          ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                          : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              {/* Input pour la langue sélectionnée */}
              <input
                type="text"
                value={selPromo.labels[labelTab] ?? ""}
                onChange={(e) =>
                  setPromo((prev) => {
                    const next = { ...prev };
                    next[service][currency] = {
                      ...next[service][currency],
                      labels: { ...next[service][currency].labels, [labelTab]: e.target.value },
                    };
                    return next;
                  })
                }
                placeholder={`Label ${labelTab.toUpperCase()} — ex: ${labelTab === "fr" ? "Offre de lancement" : labelTab === "en" ? "Launch offer" : labelTab === "es" ? "Oferta de lanzamiento" : "..."}`}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              {labelTab === "en" && (
                <p className="text-xs text-gray-400 mt-1">
                  EN = label par défaut (fallback pour les langues non renseignées)
                </p>
              )}
            </div>

            {/* Strike target */}
            <div className="mb-6">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {intl.formatMessage({ id: "admin.pricing.strikeTarget" })}
                </label>
                <input
                  type="text"
                  value={selPromo.strikeTargets}
                  onChange={(e) =>
                    setPromo((prev) => {
                      const next = { ...prev };
                      next[service][currency].strikeTargets =
                        e.target.value || "default";
                      return next;
                    })
                  }
                  placeholder="default"
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Validation */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {errorSumPromo ? (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                  <X className="w-4 h-4" />
                  <span className="text-sm font-medium">{intl.formatMessage({ id: "admin.pricing.sumInconsistent" })}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">{intl.formatMessage({ id: "admin.pricing.calculationValidated" })}</span>
                </div>
              )}
              {errorDates && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">{intl.formatMessage({ id: "admin.pricing.invalidPeriod" })}</span>
                </div>
              )}
            </div>

            {/* Comparaison visuelle */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">{intl.formatMessage({ id: "admin.pricing.priceComparison" })}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                  <div className="text-xs text-gray-500 mb-1">{intl.formatMessage({ id: "admin.pricing.basePrice" })}</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatPrice(selBase.totalAmount)}
                    <span className="text-sm font-normal text-gray-500 ml-1">{currency.toUpperCase()}</span>
                  </div>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 text-center">
                  <div className="text-xs text-orange-600 mb-1">{intl.formatMessage({ id: "admin.pricing.promoPriceShort" })}</div>
                  <div className="text-2xl font-bold text-orange-600">
                    <span className="line-through text-gray-400 text-lg mr-2">{formatPrice(selBase.totalAmount)}</span>
                    {formatPrice(selPromo.totalAmount)}
                    <span className="text-sm font-normal text-orange-400 ml-1">{currency.toUpperCase()}</span>
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center">
                  <div className="text-xs text-emerald-600 mb-1">{intl.formatMessage({ id: "admin.pricing.discount" })}</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    -{formatPrice(selBase.totalAmount - selPromo.totalAmount)}
                    <span className="text-sm font-normal text-emerald-400 ml-1">{currency.toUpperCase()}</span>
                  </div>
                  <div className="text-xs text-emerald-500 mt-1">
                    ({intl.formatMessage({ id: "admin.pricing.discountPercentage" }, { percentage: selBase.totalAmount > 0 ? Math.round((1 - selPromo.totalAmount / selBase.totalAmount) * 100) : 0 })})
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prévisualisation - Design moderne */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 rounded-lg p-2">
                  <Eye className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{intl.formatMessage({ id: "admin.pricing.priceSimulator" })}</h2>
                  <p className="text-xs text-gray-500">{intl.formatMessage({ id: "admin.pricing.priceSimulatorDescription" })}</p>
                </div>
              </div>
              {/* Statut promo */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                isPromoActiveNow
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                {isPromoActiveNow ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {isPromoActiveNow ? intl.formatMessage({ id: "admin.pricing.promoActive" }) : intl.formatMessage({ id: "admin.pricing.promoInactive" })}
                </span>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {/* Coupon input */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {intl.formatMessage({ id: "admin.pricing.couponCode" })}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={previewCoupon}
                    onChange={(e) =>
                      setPreviewCoupon(e.target.value.toUpperCase())
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-mono text-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder={intl.formatMessage({ id: "admin.pricing.couponPlaceholder" })}
                  />
                  {previewCoupon && (
                    <button
                      onClick={() => setPreviewCoupon("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bouton calculer */}
              <div>
                <button
                  onClick={() => void runPreview()}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md shadow-emerald-200"
                >
                  <RefreshCw className="w-5 h-5" />
                  {intl.formatMessage({ id: "admin.pricing.calculatePrice" })}
                </button>
              </div>
            </div>

            {/* Résultat */}
            {previewTotal !== null && (
              <div className="mt-6">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
                  {/* Détails du calcul */}
                  <div className="text-sm text-gray-600 mb-4 flex items-start gap-2">
                    <div className="bg-gray-200 rounded-full p-1 mt-0.5">
                      <Check className="w-3 h-3 text-gray-600" />
                    </div>
                    <span>{previewDetails}</span>
                  </div>

                  {/* Prix final */}
                  <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
                    <span className="text-gray-700 font-medium">{intl.formatMessage({ id: "admin.pricing.finalClientPrice" })}</span>
                    <div className="text-3xl font-bold text-emerald-600">
                      {formatPrice(previewTotal)}
                      <span className="text-lg font-normal text-emerald-400 ml-1">
                        {currency.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Aide rapide - Design moderne */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-lg p-2 flex-shrink-0">
              <Settings className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong className="text-gray-800">{intl.formatMessage({ id: "admin.pricing.helpPromoTitle" })}</strong> {intl.formatMessage({ id: "admin.pricing.helpPromoDescription" })}
              </p>
              <p>
                <strong className="text-gray-800">{intl.formatMessage({ id: "admin.pricing.helpCouponsTitle" })}</strong> {intl.formatMessage({ id: "admin.pricing.helpCouponsDescription" })}{" "}
                <code className="bg-white px-2 py-0.5 rounded text-blue-600 border border-blue-200">{intl.formatMessage({ id: "admin.pricing.helpCouponsPath" })}</code>
                {" "} • {intl.formatMessage({ id: "admin.pricing.helpCouponsStackable" })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPricing;