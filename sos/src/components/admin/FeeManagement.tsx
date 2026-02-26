import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { Save, RotateCcw, Percent, CreditCard, Wallet, AlertTriangle, ArrowDown } from "lucide-react";

/* =========================================
 * Types
 * ========================================= */

interface ProcessorFeeRate {
  percentageFee: number;
  fixedFee: number;
  fxFeePercent: number;
}

interface PayoutFeeRate {
  percentageFee: number;
  fixedFee: number;
  maxFee: number;
}

interface FeeConfig {
  stripe: { eur: ProcessorFeeRate; usd: ProcessorFeeRate };
  paypal: { eur: ProcessorFeeRate; usd: ProcessorFeeRate; payoutFee: PayoutFeeRate };
}

const DEFAULT_FEE_CONFIG: FeeConfig = {
  stripe: {
    eur: { percentageFee: 0.029, fixedFee: 0.25, fxFeePercent: 0.01 },
    usd: { percentageFee: 0.029, fixedFee: 0.30, fxFeePercent: 0.01 },
  },
  paypal: {
    eur: { percentageFee: 0.029, fixedFee: 0.35, fxFeePercent: 0.03 },
    usd: { percentageFee: 0.029, fixedFee: 0.49, fxFeePercent: 0.03 },
    payoutFee: { percentageFee: 0.02, fixedFee: 0, maxFee: 20 },
  },
};

/* =========================================
 * Helpers
 * ========================================= */

const toPercent = (v: number) => +(v * 100).toFixed(2);
const fromPercent = (v: number) => +(v / 100).toFixed(6);

function simulateFees(
  gateway: "stripe" | "paypal",
  currency: "eur" | "usd",
  totalAmount: number,
  providerAmount: number,
  config: FeeConfig
) {
  const rate = config[gateway][currency] as ProcessorFeeRate;
  const processingFee = +(totalAmount * rate.percentageFee + rate.fixedFee).toFixed(2);
  let payoutFee = 0;
  if (gateway === "paypal") {
    const pr = config.paypal.payoutFee;
    payoutFee = +Math.min(providerAmount * pr.percentageFee + pr.fixedFee, pr.maxFee).toFixed(2);
  }
  const totalFees = +(processingFee + payoutFee).toFixed(2);
  const providerNet = +(providerAmount - totalFees).toFixed(2);
  return { processingFee, payoutFee, totalFees, providerNet };
}

/* =========================================
 * Component
 * ========================================= */

const FeeManagement: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<FeeConfig>(DEFAULT_FEE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Simulation
  const [simGateway, setSimGateway] = useState<"stripe" | "paypal">("stripe");
  const [simCurrency, setSimCurrency] = useState<"eur" | "usd">("eur");
  const [simTotal, setSimTotal] = useState(49);
  const [simProvider, setSimProvider] = useState(30);

  /* ---------- Load ---------- */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "admin_config", "fees"));
        if (snap.exists()) {
          const data = snap.data() as FeeConfig;
          if (data.stripe && data.paypal) setConfig(data);
        }
      } catch (err) {
        console.error("Erreur chargement config fees:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- Save ---------- */
  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "admin_config", "fees"), {
        ...config,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setDirty(false);
      toast.success("Frais de traitement sauvegardés");
    } catch (err) {
      console.error("Erreur sauvegarde fees:", err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }, [config, user]);

  /* ---------- Update helpers ---------- */
  const updateStripe = (currency: "eur" | "usd", field: keyof ProcessorFeeRate, value: number) => {
    setConfig((prev) => ({
      ...prev,
      stripe: { ...prev.stripe, [currency]: { ...prev.stripe[currency], [field]: value } },
    }));
    setDirty(true);
  };

  const updatePaypal = (currency: "eur" | "usd", field: keyof ProcessorFeeRate, value: number) => {
    setConfig((prev) => ({
      ...prev,
      paypal: { ...prev.paypal, [currency]: { ...prev.paypal[currency], [field]: value } },
    }));
    setDirty(true);
  };

  const updatePaypalPayout = (field: keyof PayoutFeeRate, value: number) => {
    setConfig((prev) => ({
      ...prev,
      paypal: { ...prev.paypal, payoutFee: { ...prev.paypal.payoutFee, [field]: value } },
    }));
    setDirty(true);
  };

  const handleReset = () => {
    setConfig(DEFAULT_FEE_CONFIG);
    setDirty(true);
  };

  /* ---------- Simulation ---------- */
  const sim = simulateFees(simGateway, simCurrency, simTotal, simProvider, config);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Frais de traitement Stripe / PayPal</h2>
          <p className="text-sm text-gray-500">
            Configurez les taux appliqués par les processeurs de paiement.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Valeurs par défaut
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* Encadré explicatif — BIEN VISIBLE */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 space-y-2">
            <p className="font-semibold">
              Ces frais sont automatiquement déduits du versement au prestataire.
            </p>
            <p>
              Le client paie toujours le prix affiché (ex: 49€). SOS-Expat conserve sa commission intacte.
              Les frais Stripe/PayPal sont absorbés par le prestataire, qui reçoit un montant net inférieur.
            </p>
            <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 text-xs font-mono">
              <span className="text-gray-600">Client: 49EUR</span>
              <ArrowDown className="w-3 h-3 text-gray-400 rotate-[-90deg]" />
              <span className="text-blue-700">SOS-Expat: 19EUR (commission fixe)</span>
              <ArrowDown className="w-3 h-3 text-gray-400 rotate-[-90deg]" />
              <span className="text-red-600">Frais: ~1.67EUR</span>
              <ArrowDown className="w-3 h-3 text-gray-400 rotate-[-90deg]" />
              <span className="text-emerald-700 font-bold">Prestataire: ~28.33EUR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-3 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Stripe</h3>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(["eur", "usd"] as const).map((cur) => (
              <div key={`stripe-${cur}`} className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wider">
                  {cur === "eur" ? "EUR" : "USD"}
                </h4>
                <FeeRateInputs
                  rate={config.stripe[cur]}
                  onChange={(field, value) => updateStripe(cur, field, value)}
                  currencySymbol={cur === "eur" ? "€" : "$"}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PayPal Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-5 py-3 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">PayPal</h3>
          </div>
        </div>
        <div className="p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(["eur", "usd"] as const).map((cur) => (
              <div key={`paypal-${cur}`} className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wider">
                  {cur === "eur" ? "EUR" : "USD"}
                </h4>
                <FeeRateInputs
                  rate={config.paypal[cur]}
                  onChange={(field, value) => updatePaypal(cur, field, value)}
                  currencySymbol={cur === "eur" ? "€" : "$"}
                />
              </div>
            ))}
          </div>

          {/* Payout fees */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Frais de Payout</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Commission (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={toPercent(config.paypal.payoutFee.percentageFee)}
                    onChange={(e) => updatePaypalPayout("percentageFee", fromPercent(parseFloat(e.target.value || "0")))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Frais fixe</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={config.paypal.payoutFee.fixedFee}
                  onChange={(e) => updatePaypalPayout("fixedFee", parseFloat(e.target.value || "0"))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Plafond max</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={config.paypal.payoutFee.maxFee}
                  onChange={(e) => updatePaypalPayout("maxFee", parseFloat(e.target.value || "0"))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulateur */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3 border-b border-emerald-100">
          <h3 className="font-semibold text-gray-900">Simulateur d'impact sur le versement prestataire</h3>
          <p className="text-xs text-gray-500">Visualisez combien le prestataire reçoit réellement après déduction des frais</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Passerelle</label>
              <select
                value={simGateway}
                onChange={(e) => setSimGateway(e.target.value as "stripe" | "paypal")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Devise</label>
              <select
                value={simCurrency}
                onChange={(e) => setSimCurrency(e.target.value as "eur" | "usd")}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="eur">EUR</option>
                <option value="usd">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Total client</label>
              <input
                type="number"
                min={0}
                step={1}
                value={simTotal}
                onChange={(e) => setSimTotal(parseFloat(e.target.value || "0"))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Part prestataire (brut)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={simProvider}
                onChange={(e) => setSimProvider(parseFloat(e.target.value || "0"))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Flux visuel */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg font-medium">
                Client paie {simTotal.toFixed(2)} {simCurrency === "eur" ? "€" : "$"}
              </span>
              <ArrowDown className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
              <span className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg font-medium">
                SOS-Expat garde {(simTotal - simProvider).toFixed(2)} {simCurrency === "eur" ? "€" : "$"}
              </span>
              <ArrowDown className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
              <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-medium">
                Frais déduits : -{sim.totalFees.toFixed(2)} {simCurrency === "eur" ? "€" : "$"}
              </span>
              <ArrowDown className="w-4 h-4 text-gray-400 rotate-[-90deg]" />
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg font-bold">
                Prestataire reçoit {sim.providerNet.toFixed(2)} {simCurrency === "eur" ? "€" : "$"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SimCard label="Part brute prestataire" value={simProvider} color="gray" symbol={simCurrency === "eur" ? "€" : "$"} />
            <SimCard label="Frais traitement" value={sim.processingFee} color="red" symbol={simCurrency === "eur" ? "€" : "$"} />
            <SimCard label="Frais payout" value={sim.payoutFee} color="orange" symbol={simCurrency === "eur" ? "€" : "$"} />
            <SimCard label="Prestataire NET" value={sim.providerNet} color="green" symbol={simCurrency === "eur" ? "€" : "$"} />
          </div>

          <div className="mt-3 text-xs text-gray-500 text-center font-medium">
            Commission SOS-Expat : {(simTotal - simProvider).toFixed(2)} {simCurrency === "eur" ? "€" : "$"} (inchangée, jamais impactée par les frais)
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================
 * Sub-components
 * ========================================= */

const FeeRateInputs: React.FC<{
  rate: ProcessorFeeRate;
  onChange: (field: keyof ProcessorFeeRate, value: number) => void;
  currencySymbol: string;
}> = ({ rate, onChange, currencySymbol }) => (
  <div className="grid grid-cols-3 gap-3">
    <div>
      <label className="block text-xs text-gray-500 mb-1">Commission (%)</label>
      <div className="relative">
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={toPercent(rate.percentageFee)}
          onChange={(e) => onChange("percentageFee", fromPercent(parseFloat(e.target.value || "0")))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
      </div>
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">Fixe ({currencySymbol})</label>
      <input
        type="number"
        min={0}
        step={0.01}
        value={rate.fixedFee}
        onChange={(e) => onChange("fixedFee", parseFloat(e.target.value || "0"))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
    <div>
      <label className="block text-xs text-gray-500 mb-1">FX (%)</label>
      <div className="relative">
        <input
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={toPercent(rate.fxFeePercent)}
          onChange={(e) => onChange("fxFeePercent", fromPercent(parseFloat(e.target.value || "0")))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
      </div>
    </div>
  </div>
);

const SimCard: React.FC<{ label: string; value: number; color: string; symbol: string }> = ({
  label,
  value,
  color,
  symbol,
}) => {
  const colorMap: Record<string, string> = {
    red: "bg-red-50 text-red-700 border-red-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return (
    <div className={`rounded-xl p-3 border text-center ${colorMap[color] || colorMap.red}`}>
      <div className="text-xs opacity-70 mb-1">{label}</div>
      <div className="text-lg font-bold">
        {value.toFixed(2)} {symbol}
      </div>
    </div>
  );
};

export default FeeManagement;
