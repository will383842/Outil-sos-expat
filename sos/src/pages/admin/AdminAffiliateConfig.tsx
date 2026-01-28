/**
 * AdminAffiliateConfig - Configuration du système d'affiliation
 *
 * Page admin pour :
 * - Activer/désactiver le système
 * - Configurer les taux de commission par action
 * - Définir les règles de retrait (seuil minimum 30€)
 * - Configurer l'anti-fraude
 * - Voir l'historique des modifications
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Save,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Shield,
  Clock,
  History,
  ToggleLeft,
  ToggleRight,
  Percent,
  Users,
  Phone,
  CreditCard,
  Award,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import {
  getFirestore,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { useAuth } from "../../contexts/AuthContext";
import {
  formatCents,
  type AffiliateConfig,
  type CommissionRule,
  type CommissionActionType,
  getCommissionActionTypeLabel,
} from "../../types/affiliate";

// ============================================================================
// TYPES
// ============================================================================

type ConfigSection = "system" | "rates" | "rules" | "withdrawal" | "attribution" | "antiFraud" | "history";

interface RateHistoryEntry {
  changedAt: { seconds: number };
  changedBy: string;
  changedByEmail: string;
  previousRates: Record<string, unknown>;
  newRates: Record<string, unknown>;
  reason: string;
}

// Default config matching backend DEFAULT_AFFILIATE_CONFIG
// CONFIGURATION SIMPLIFIÉE : 10€ fixe par appel, tout le reste à 0
const DEFAULT_CONFIG: AffiliateConfig = {
  id: "current",
  isSystemActive: true,
  withdrawalsEnabled: true,
  newAffiliatesEnabled: true,
  defaultRates: {
    signupBonus: 0, // Pas de bonus inscription
    callCommissionRate: 0, // Pas de pourcentage
    callFixedBonus: 1000, // 10€ fixe par appel
    subscriptionRate: 0, // Pas de commission abonnement
    subscriptionFixedBonus: 0,
    providerValidationBonus: 0, // Pas de bonus prestataire
  },
  commissionRules: {
    referral_signup: {
      enabled: false,
      type: "fixed",
      fixedAmount: 0,
      percentageRate: 0,
      baseAmount: null,
      conditions: {
        requireEmailVerification: true,
        minAccountAgeDays: 0,
        onlyFirstTime: true,
      },
      description: "Pas de commission à l'inscription",
    },
    referral_first_call: {
      enabled: true,
      type: "fixed",
      fixedAmount: 1000, // 10$
      percentageRate: 0,
      baseAmount: null,
      applyTo: "connection_fee",
      conditions: {
        minCallDuration: 120,
        providerTypes: ["lawyer", "expat"],
      },
      description: "10$ par appel",
    },
    referral_recurring_call: {
      enabled: true,
      type: "fixed",
      fixedAmount: 1000, // 10$
      percentageRate: 0,
      baseAmount: null,
      applyTo: "connection_fee",
      conditions: {
        minCallDuration: 120,
        providerTypes: ["lawyer", "expat"],
        maxCallsPerMonth: 0,
        lifetimeLimit: 0,
      },
      description: "10$ par appel",
    },
    referral_subscription: {
      enabled: false,
      type: "percentage",
      fixedAmount: 0,
      percentageRate: 0,
      baseAmount: null,
      applyTo: "first_month",
      conditions: {
        planTypes: ["solo", "multi", "enterprise"],
        onlyFirstSubscription: true,
      },
      description: "Pas de commission sur les abonnements",
    },
    referral_subscription_renewal: {
      enabled: false,
      type: "percentage",
      fixedAmount: 0,
      percentageRate: 0,
      baseAmount: null,
      conditions: {
        maxMonths: 12,
      },
      description: "Pas de commission sur les renouvellements",
    },
    referral_provider_validated: {
      enabled: false,
      type: "fixed",
      fixedAmount: 0,
      percentageRate: 0,
      baseAmount: null,
      conditions: {
        requireKYCComplete: true,
        requireFirstCall: false,
      },
      description: "Pas de bonus prestataire",
    },
  },
  withdrawal: {
    minimumAmount: 3000,
    holdPeriodHours: 24,
    maxWithdrawalsPerMonth: 0,
    maxAmountPerMonth: 0,
  },
  attribution: {
    windowDays: 30,
    model: "first_click",
  },
  antiFraud: {
    requireEmailVerification: true,
    minAccountAgeDays: 0,
    maxReferralsPerDay: 50,
    blockSameIPReferrals: true,
    blockedEmailDomains: [
      "tempmail.com",
      "throwaway.email",
      "guerrillamail.com",
      "10minutemail.com",
      "mailinator.com",
      "yopmail.com",
    ],
    maxSignupsPerIPPerHour: 10,
    autoFlagThreshold: 5,
  },
  version: 1,
  updatedAt: "",
  updatedBy: "",
};

// ============================================================================
// TOGGLE COMPONENT
// ============================================================================

const Toggle: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}> = ({ enabled, onChange, disabled }) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
};

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

const SectionHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  description?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}> = ({ title, icon, description, isOpen, onToggle }) => {
  const Wrapper = onToggle ? "button" : "div";

  return (
    <Wrapper
      onClick={onToggle}
      className={`w-full flex items-center justify-between ${
        onToggle ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" : ""
      } p-4 border-b border-gray-200 dark:border-gray-700`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg">
          {icon}
        </div>
        <div className="text-left">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
      {onToggle && (
        <span className="text-gray-400">
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      )}
    </Wrapper>
  );
};

// ============================================================================
// INPUT COMPONENTS
// ============================================================================

const NumberInput: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  isCents?: boolean;
}> = ({ label, value, onChange, suffix, min = 0, max, step = 1, hint, isCents }) => {
  const displayValue = isCents ? value / 100 : value;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={displayValue}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            onChange(isCents ? Math.round(val * 100) : val);
          }}
          min={isCents ? min / 100 : min}
          max={max !== undefined ? (isCents ? max / 100 : max) : undefined}
          step={isCents ? 0.01 : step}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        {suffix && (
          <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
};

const PercentInput: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}> = ({ label, value, onChange, hint }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={Math.round(value * 100)}
          onChange={(e) => onChange((parseFloat(e.target.value) || 0) / 100)}
          min={0}
          max={100}
          step={1}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
};

// ============================================================================
// COMMISSION RULE EDITOR
// ============================================================================

const CommissionRuleEditor: React.FC<{
  actionType: CommissionActionType;
  rule: CommissionRule;
  onChange: (rule: CommissionRule) => void;
}> = ({ actionType, rule, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = () => {
    switch (actionType) {
      case "referral_signup":
        return <Users className="h-4 w-4" />;
      case "referral_first_call":
      case "referral_recurring_call":
        return <Phone className="h-4 w-4" />;
      case "referral_subscription":
      case "referral_subscription_renewal":
        return <CreditCard className="h-4 w-4" />;
      case "referral_provider_validated":
        return <Award className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const updateRule = (updates: Partial<CommissionRule>) => {
    onChange({ ...rule, ...updates });
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${rule.enabled ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}>
            {getIcon()}
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-900 dark:text-white">
              {getCommissionActionTypeLabel(actionType)}
            </p>
            <p className="text-sm text-gray-500">{rule.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            rule.enabled
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500"
          }`}>
            {rule.enabled ? "Actif" : "Inactif"}
          </span>
          {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4 bg-gray-50 dark:bg-gray-800/50">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Règle activée
            </label>
            <Toggle enabled={rule.enabled} onChange={(enabled) => updateRule({ enabled })} />
          </div>

          {/* Commission type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type de commission
            </label>
            <select
              value={rule.type}
              onChange={(e) => updateRule({ type: e.target.value as CommissionRule["type"] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="fixed">Fixe</option>
              <option value="percentage">Pourcentage</option>
              <option value="hybrid">Hybride (fixe + %)</option>
            </select>
          </div>

          {/* Fixed amount */}
          {(rule.type === "fixed" || rule.type === "hybrid") && (
            <NumberInput
              label="Montant fixe"
              value={rule.fixedAmount}
              onChange={(fixedAmount) => updateRule({ fixedAmount })}
              suffix="€"
              isCents
            />
          )}

          {/* Percentage rate */}
          {(rule.type === "percentage" || rule.type === "hybrid") && (
            <PercentInput
              label="Taux de pourcentage"
              value={rule.percentageRate}
              onChange={(percentageRate) => updateRule({ percentageRate })}
            />
          )}

          {/* Apply to (for percentage) */}
          {(rule.type === "percentage" || rule.type === "hybrid") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Appliquer sur
              </label>
              <select
                value={rule.applyTo || "connection_fee"}
                onChange={(e) => updateRule({ applyTo: e.target.value as CommissionRule["applyTo"] })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="connection_fee">Frais de connexion</option>
                <option value="total_amount">Montant total</option>
                <option value="first_month">Premier mois</option>
                <option value="annual_value">Valeur annuelle</option>
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (affichée aux affiliés)
            </label>
            <input
              type="text"
              value={rule.description}
              onChange={(e) => updateRule({ description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Conditions summary */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Conditions actuelles:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  {rule.conditions.requireEmailVerification && (
                    <li>Email vérifié requis</li>
                  )}
                  {rule.conditions.minAccountAgeDays !== undefined && rule.conditions.minAccountAgeDays > 0 && (
                    <li>Compte âgé de {rule.conditions.minAccountAgeDays}+ jours</li>
                  )}
                  {rule.conditions.minCallDuration && (
                    <li>Durée min. appel: {rule.conditions.minCallDuration}s</li>
                  )}
                  {rule.conditions.maxCallsPerMonth !== undefined && rule.conditions.maxCallsPerMonth > 0 && (
                    <li>Max {rule.conditions.maxCallsPerMonth} appels/mois</li>
                  )}
                  {rule.conditions.maxMonths !== undefined && rule.conditions.maxMonths > 0 && (
                    <li>Max {rule.conditions.maxMonths} mois</li>
                  )}
                  {rule.conditions.onlyFirstTime && <li>Première fois uniquement</li>}
                  {rule.conditions.onlyFirstSubscription && <li>Premier abonnement uniquement</li>}
                  {rule.conditions.requireKYCComplete && <li>KYC complété requis</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SAVE MODAL
// ============================================================================

const SaveModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmer les modifications">
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium">Attention</p>
              <p>
                Les modifications des taux de commission n'affectent que les nouveaux affiliés.
                Les affiliés existants conservent leurs taux gelés (capturedRates).
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Raison de la modification (obligatoire)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ex: Mise à jour des taux suite à la révision trimestrielle..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={isLoading || !reason.trim()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminAffiliateConfig: React.FC = () => {
  const { user } = useAuth();
  const db = getFirestore();
  const functions = getFunctions(undefined, "europe-west1");

  // State
  const [config, setConfig] = useState<AffiliateConfig>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<AffiliateConfig>(DEFAULT_CONFIG);
  const [rateHistory, setRateHistory] = useState<RateHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [configExists, setConfigExists] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ConfigSection>("system");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Check if config has changed
  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  // Fetch config
  const fetchConfig = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      const configDoc = await getDoc(doc(db, "affiliate_config", "current"));

      if (configDoc.exists()) {
        const data = configDoc.data() as AffiliateConfig & { rateHistory?: RateHistoryEntry[] };
        // Handle Firestore Timestamp conversion
        const updatedAtValue = data.updatedAt as unknown;
        const updatedAtString = updatedAtValue && typeof updatedAtValue === "object" && "toDate" in updatedAtValue
          ? (updatedAtValue as Timestamp).toDate().toISOString()
          : (typeof data.updatedAt === "string" ? data.updatedAt : "");
        const configData: AffiliateConfig = {
          ...DEFAULT_CONFIG,
          ...data,
          updatedAt: updatedAtString,
        };
        setConfig(configData);
        setOriginalConfig(configData);
        setRateHistory(data.rateHistory || []);
        setConfigExists(true);
      } else {
        // Config doesn't exist yet - show initialization prompt
        setConfig(DEFAULT_CONFIG);
        setOriginalConfig(DEFAULT_CONFIG);
        setConfigExists(false);
      }
    } catch (err) {
      console.error("[AdminAffiliateConfig] Error fetching config:", err);
      setError("Erreur lors du chargement de la configuration");
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, db]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Initialize config (first time setup)
  const handleInitializeConfig = async () => {
    if (!user?.uid) return;

    setIsInitializing(true);
    setError(null);

    try {
      const initConfig = httpsCallable<
        Record<string, never>,
        { success: boolean; message: string; config: AffiliateConfig; alreadyExists: boolean }
      >(functions, "initializeAffiliateConfig");

      const result = await initConfig({});

      if (result.data.success) {
        setSuccess(result.data.message);
        setConfigExists(true);
        // Reload config
        await fetchConfig();
      }
    } catch (err) {
      console.error("[AdminAffiliateConfig] Error initializing config:", err);
      setError("Erreur lors de l'initialisation de la configuration");
    } finally {
      setIsInitializing(false);
    }
  };

  // Save config
  const handleSave = async (reason: string) => {
    if (!user?.uid) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updateConfig = httpsCallable<
        { config: Partial<AffiliateConfig>; reason: string },
        { success: boolean; config: AffiliateConfig }
      >(functions, "adminUpdateAffiliateConfig");

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, version, updatedAt, updatedBy, ...configToSave } = config;

      const result = await updateConfig({
        config: configToSave,
        reason,
      });

      if (result.data.success) {
        // Handle Firestore Timestamp conversion
        const updatedAtValue = result.data.config.updatedAt as unknown;
        const updatedAtStr = updatedAtValue && typeof updatedAtValue === "object" && "toDate" in updatedAtValue
          ? (updatedAtValue as Timestamp).toDate().toISOString()
          : (typeof result.data.config.updatedAt === "string" ? result.data.config.updatedAt : "");
        const newConfig = {
          ...result.data.config,
          updatedAt: updatedAtStr,
        };
        setConfig(newConfig);
        setOriginalConfig(newConfig);
        setSuccess("Configuration enregistrée avec succès");
        setShowSaveModal(false);

        // Refresh to get updated history
        setTimeout(() => fetchConfig(), 1000);
      }
    } catch (err) {
      console.error("[AdminAffiliateConfig] Error saving config:", err);
      setError("Erreur lors de l'enregistrement de la configuration");
    } finally {
      setIsSaving(false);
    }
  };

  // Update config helper
  const updateConfig = (updates: Partial<AffiliateConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  // Clear messages after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Loading state
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Chargement de la configuration...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Config doesn't exist - show initialization prompt
  if (!configExists) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Configuration Affiliation
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Le système d'affiliation n'est pas encore configuré. Cliquez sur le bouton ci-dessous pour initialiser la configuration avec les valeurs par défaut.
            </p>

            {error && (
              <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Configuration par défaut :
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span><strong>Appels :</strong> 10$ par appel (premier et suivants)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400"><strong>Inscription :</strong> Désactivé (0$)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400"><strong>Abonnement :</strong> Désactivé (0%)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400"><strong>Renouvellement :</strong> Désactivé (0%)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400"><strong>Bonus prestataire :</strong> Désactivé (0$)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span><strong>Seuil retrait :</strong> 30$ minimum</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={handleInitializeConfig}
              disabled={isInitializing}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-3"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Initialisation en cours...
                </>
              ) : (
                <>
                  <Settings className="h-5 w-5 mr-2" />
                  Initialiser la configuration
                </>
              )}
            </Button>

            <p className="text-xs text-gray-400 mt-4">
              Vous pourrez modifier tous ces paramètres après l'initialisation.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Configuration Affiliation
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gérez les paramètres du programme d'affiliation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => fetchConfig()}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button
              onClick={() => setShowSaveModal(true)}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
          </div>
        )}

        {hasChanges && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Vous avez des modifications non enregistrées.
            </p>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          {[
            { id: "system" as const, label: "Système", icon: <Settings className="h-4 w-4" /> },
            { id: "rules" as const, label: "Règles", icon: <Percent className="h-4 w-4" /> },
            { id: "withdrawal" as const, label: "Retraits", icon: <DollarSign className="h-4 w-4" /> },
            { id: "antiFraud" as const, label: "Anti-fraude", icon: <Shield className="h-4 w-4" /> },
            { id: "history" as const, label: "Historique", icon: <History className="h-4 w-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === tab.id
                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* System Section */}
        {activeSection === "system" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              title="Paramètres Système"
              icon={<Settings className="h-5 w-5" />}
              description="Activer ou désactiver les fonctionnalités du programme"
            />
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                <div className="flex items-center gap-3">
                  {config.isSystemActive ? (
                    <ToggleRight className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Système d'affiliation</p>
                    <p className="text-sm text-gray-500">Active ou désactive tout le programme</p>
                  </div>
                </div>
                <Toggle
                  enabled={config.isSystemActive}
                  onChange={(isSystemActive) => updateConfig({ isSystemActive })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className={`h-6 w-6 ${config.withdrawalsEnabled ? "text-emerald-500" : "text-gray-400"}`} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Retraits autorisés</p>
                    <p className="text-sm text-gray-500">Permet aux affiliés de demander des retraits</p>
                  </div>
                </div>
                <Toggle
                  enabled={config.withdrawalsEnabled}
                  onChange={(withdrawalsEnabled) => updateConfig({ withdrawalsEnabled })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className={`h-6 w-6 ${config.newAffiliatesEnabled ? "text-emerald-500" : "text-gray-400"}`} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Nouveaux affiliés</p>
                    <p className="text-sm text-gray-500">Accepte les nouvelles inscriptions d'affiliés</p>
                  </div>
                </div>
                <Toggle
                  enabled={config.newAffiliatesEnabled}
                  onChange={(newAffiliatesEnabled) => updateConfig({ newAffiliatesEnabled })}
                />
              </div>

              {/* Config info */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Version: {config.version}</span>
                  {config.updatedAt && (
                    <span>
                      Dernière modification: {new Date(config.updatedAt).toLocaleString("fr-FR")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Commission Rules Section */}
        {activeSection === "rules" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              title="Règles de Commission"
              icon={<Percent className="h-5 w-5" />}
              description="Configurer les commissions par type d'action"
            />
            <div className="p-6 space-y-4">
              {(Object.keys(config.commissionRules) as CommissionActionType[])
                .filter((key) => key !== "manual_adjustment")
                .map((actionType) => (
                  <CommissionRuleEditor
                    key={actionType}
                    actionType={actionType}
                    rule={config.commissionRules[actionType as keyof typeof config.commissionRules]}
                    onChange={(rule) =>
                      updateConfig({
                        commissionRules: {
                          ...config.commissionRules,
                          [actionType]: rule,
                        },
                      })
                    }
                  />
                ))}
            </div>
          </div>
        )}

        {/* Withdrawal Section */}
        {activeSection === "withdrawal" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              title="Paramètres de Retrait"
              icon={<DollarSign className="h-5 w-5" />}
              description="Tirelire et conditions de retrait"
            />
            <div className="p-6 space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">Système de Tirelire</p>
                    <p>
                      Les commissions s'accumulent dans la "tirelire" de l'affilié.
                      Le retrait n'est possible qu'à partir du seuil minimum défini ci-dessous.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NumberInput
                  label="Seuil minimum de retrait"
                  value={config.withdrawal.minimumAmount}
                  onChange={(minimumAmount) =>
                    updateConfig({
                      withdrawal: { ...config.withdrawal, minimumAmount },
                    })
                  }
                  suffix="€"
                  isCents
                  hint={`Les affiliés doivent avoir au moins ${formatCents(config.withdrawal.minimumAmount)} pour retirer`}
                />

                <NumberInput
                  label="Période de rétention"
                  value={config.withdrawal.holdPeriodHours}
                  onChange={(holdPeriodHours) =>
                    updateConfig({
                      withdrawal: { ...config.withdrawal, holdPeriodHours },
                    })
                  }
                  suffix="heures"
                  hint="Temps avant qu'une commission ne devienne disponible"
                />

                <NumberInput
                  label="Max retraits par mois"
                  value={config.withdrawal.maxWithdrawalsPerMonth}
                  onChange={(maxWithdrawalsPerMonth) =>
                    updateConfig({
                      withdrawal: { ...config.withdrawal, maxWithdrawalsPerMonth },
                    })
                  }
                  hint="0 = illimité"
                />

                <NumberInput
                  label="Max montant par mois"
                  value={config.withdrawal.maxAmountPerMonth}
                  onChange={(maxAmountPerMonth) =>
                    updateConfig({
                      withdrawal: { ...config.withdrawal, maxAmountPerMonth },
                    })
                  }
                  suffix="€"
                  isCents
                  hint="0 = illimité"
                />
              </div>

              {/* Attribution */}
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Attribution des parrainages
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <NumberInput
                    label="Fenêtre d'attribution"
                    value={config.attribution.windowDays}
                    onChange={(windowDays) =>
                      updateConfig({
                        attribution: { ...config.attribution, windowDays },
                      })
                    }
                    suffix="jours"
                    hint="Durée pendant laquelle le cookie de parrainage est valide"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Modèle d'attribution
                    </label>
                    <select
                      value={config.attribution.model}
                      onChange={(e) =>
                        updateConfig({
                          attribution: {
                            ...config.attribution,
                            model: e.target.value as "first_click" | "last_click",
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="first_click">Premier clic</option>
                      <option value="last_click">Dernier clic</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      Détermine quel affilié est crédité si plusieurs liens sont utilisés
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Anti-Fraud Section */}
        {activeSection === "antiFraud" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              title="Protection Anti-Fraude"
              icon={<Shield className="h-5 w-5" />}
              description="Paramètres de sécurité et détection de fraude"
            />
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email vérifié requis</p>
                    <p className="text-sm text-gray-500">Pour gagner des commissions</p>
                  </div>
                  <Toggle
                    enabled={config.antiFraud.requireEmailVerification}
                    onChange={(requireEmailVerification) =>
                      updateConfig({
                        antiFraud: { ...config.antiFraud, requireEmailVerification },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Bloquer même IP</p>
                    <p className="text-sm text-gray-500">Refuse les parrainages depuis la même IP</p>
                  </div>
                  <Toggle
                    enabled={config.antiFraud.blockSameIPReferrals}
                    onChange={(blockSameIPReferrals) =>
                      updateConfig({
                        antiFraud: { ...config.antiFraud, blockSameIPReferrals },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NumberInput
                  label="Âge minimum du compte"
                  value={config.antiFraud.minAccountAgeDays}
                  onChange={(minAccountAgeDays) =>
                    updateConfig({
                      antiFraud: { ...config.antiFraud, minAccountAgeDays },
                    })
                  }
                  suffix="jours"
                  hint="Avant de pouvoir parrainer"
                />

                <NumberInput
                  label="Max parrainages par jour"
                  value={config.antiFraud.maxReferralsPerDay}
                  onChange={(maxReferralsPerDay) =>
                    updateConfig({
                      antiFraud: { ...config.antiFraud, maxReferralsPerDay },
                    })
                  }
                  hint="Par affilié"
                />

                <NumberInput
                  label="Max inscriptions par IP/heure"
                  value={config.antiFraud.maxSignupsPerIPPerHour}
                  onChange={(maxSignupsPerIPPerHour) =>
                    updateConfig({
                      antiFraud: { ...config.antiFraud, maxSignupsPerIPPerHour },
                    })
                  }
                />

                <NumberInput
                  label="Seuil d'auto-flag"
                  value={config.antiFraud.autoFlagThreshold}
                  onChange={(autoFlagThreshold) =>
                    updateConfig({
                      antiFraud: { ...config.antiFraud, autoFlagThreshold },
                    })
                  }
                  hint="Nombre de parrainages suspects avant signalement auto"
                />
              </div>

              {/* Blocked domains */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Domaines email bloqués
                </label>
                <textarea
                  value={config.antiFraud.blockedEmailDomains.join("\n")}
                  onChange={(e) =>
                    updateConfig({
                      antiFraud: {
                        ...config.antiFraud,
                        blockedEmailDomains: e.target.value
                          .split("\n")
                          .map((d) => d.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  rows={5}
                  placeholder="tempmail.com&#10;guerrillamail.com&#10;..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">Un domaine par ligne (emails jetables)</p>
              </div>
            </div>
          </div>
        )}

        {/* History Section */}
        {activeSection === "history" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <SectionHeader
              title="Historique des Modifications"
              icon={<History className="h-5 w-5" />}
              description="Journal des changements de configuration"
            />
            <div className="p-6">
              {rateHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Aucun historique disponible</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rateHistory
                    .slice()
                    .reverse()
                    .slice(0, 20)
                    .map((entry, index) => (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {entry.changedByEmail}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.changedAt.seconds * 1000).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{entry.reason}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Modal */}
        <SaveModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onConfirm={handleSave}
          isLoading={isSaving}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminAffiliateConfig;
