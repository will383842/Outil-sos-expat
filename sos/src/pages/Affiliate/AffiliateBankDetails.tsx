/**
 * AffiliateBankDetails - Bank details management page
 * Allows users to add or update their bank details for withdrawals
 */

import React, { useState, useMemo, useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Building2,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Globe,
  CreditCard,
  User,
  MapPin,
  Smartphone,
} from "lucide-react";
import { useLocaleNavigate } from "@/multilingual-system";
import { getTranslatedRouteSlug, type RouteKey } from "@/multilingual-system/core/routing/localeRoutes";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAffiliate } from "@/hooks/useAffiliate";
import { usePaymentMethods } from "@/hooks/usePayment";
import { PaymentMethodForm } from "@/components/payment";
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { BankDetailsInput, BankAccountType } from "@/types/affiliate";
import type { PaymentDetails } from "@/hooks/usePayment";

// Countries supported by Flutterwave Mobile Money
const FLUTTERWAVE_COUNTRIES = new Set([
  'SN', 'CI', 'ML', 'GH', 'KE', 'UG', 'TZ', 'RW', 'BJ', 'TG', 'CM', 'ZA', 'NG',
  'MG', 'ZM', 'MZ', 'EG', 'MW', 'ET', 'SD', 'DZ', 'MA', 'TN', 'CD', 'AO',
]);

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    ghost: "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5",
  error: "text-xs text-red-500 dark:text-red-400 mt-1",
} as const;

const accountTypes: { value: BankAccountType; labelId: string }[] = [
  { value: "iban", labelId: "affiliate.bankDetails.type.iban" },
  { value: "uk_sort_code", labelId: "affiliate.bankDetails.type.uk" },
  { value: "us_aba", labelId: "affiliate.bankDetails.type.us" },
  { value: "other", labelId: "affiliate.bankDetails.type.other" },
];

interface FormErrors {
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  country?: string;
  currency?: string;
}

const AffiliateBankDetails: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || "en") as "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";

  const { user } = useAuth();
  const { affiliateData, isLoading, updateBankDetails } = useAffiliate();
  const { saveMethod, loading: methodsLoading, refresh: refreshMethods } = usePaymentMethods();

  // Detect Mobile Money eligibility from user country
  const userCountry = (user?.country || '').toUpperCase();
  const isMobileMoneyCountry = FLUTTERWAVE_COUNTRIES.has(userCountry);

  const [showMobileMoneyForm, setShowMobileMoneyForm] = useState(false);
  const [mobileMoneySuccess, setMobileMoneySuccess] = useState(false);
  const [mobileMoneyError, setMobileMoneyError] = useState<string | null>(null);
  const [savingMobileMoney, setSavingMobileMoney] = useState(false);

  const handleSaveMobileMoney = async (details: PaymentDetails) => {
    setSavingMobileMoney(true);
    setMobileMoneyError(null);
    try {
      await saveMethod(details, true);
      await refreshMethods();
      setMobileMoneySuccess(true);
      setShowMobileMoneyForm(false);
    } catch (err) {
      setMobileMoneyError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSavingMobileMoney(false);
    }
  };

  const [formData, setFormData] = useState<BankDetailsInput>({
    accountType: "iban",
    accountHolderName: "",
    accountNumber: "",
    bankName: "",
    country: "",
    currency: "EUR",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Translated routes
  const routes = useMemo(
    () => ({
      dashboard: `/${getTranslatedRouteSlug("affiliate-dashboard" as RouteKey, langCode)}`,
      withdraw: `/${getTranslatedRouteSlug("affiliate-withdraw" as RouteKey, langCode)}`,
    }),
    [langCode]
  );

  // Pre-fill form if bank details exist
  useEffect(() => {
    if (affiliateData?.maskedBankAccount) {
      // Only pre-fill non-sensitive data
      setFormData((prev) => ({
        ...prev,
        accountType: affiliateData.bankAccountType || "iban",
        currency: affiliateData.bankCurrency || "EUR",
      }));
    }
  }, [affiliateData]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = intl.formatMessage({
        id: "affiliate.bankDetails.error.accountHolderName",
        defaultMessage: "Le nom du titulaire est requis",
      });
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = intl.formatMessage({
        id: "affiliate.bankDetails.error.accountNumber",
        defaultMessage: "Le numéro de compte est requis",
      });
    } else {
      // Basic validation based on account type
      if (formData.accountType === "iban") {
        const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/;
        if (!ibanRegex.test(formData.accountNumber.replace(/\s/g, "").toUpperCase())) {
          newErrors.accountNumber = intl.formatMessage({
            id: "affiliate.bankDetails.error.invalidIban",
            defaultMessage: "Format IBAN invalide",
          });
        }
      } else if (formData.accountType === "uk_sort_code") {
        if (!formData.sortCode?.match(/^\d{6}$/)) {
          newErrors.accountNumber = intl.formatMessage({
            id: "affiliate.bankDetails.error.invalidSortCode",
            defaultMessage: "Sort code invalide (6 chiffres)",
          });
        }
      }
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = intl.formatMessage({
        id: "affiliate.bankDetails.error.bankName",
        defaultMessage: "Le nom de la banque est requis",
      });
    }

    if (!formData.country.trim()) {
      newErrors.country = intl.formatMessage({
        id: "affiliate.bankDetails.error.country",
        defaultMessage: "Le pays est requis",
      });
    }

    if (!formData.currency.trim()) {
      newErrors.currency = intl.formatMessage({
        id: "affiliate.bankDetails.error.currency",
        defaultMessage: "La devise est requise",
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await updateBankDetails(formData);
      if (result.success) {
        setSuccess(true);
      } else {
        setSubmitError(result.message);
      }
    } catch (err) {
      console.error("Bank details update error:", err);
      // Map backend errors to user-friendly messages
      const errorCode = err instanceof Error ? err.message : "";
      if (errorCode.includes("pending")) {
        setSubmitError(intl.formatMessage({ id: "affiliate.bankDetails.error.pending", defaultMessage: "Impossible de modifier pendant un retrait en cours." }));
      } else if (errorCode.includes("Invalid bank details")) {
        setSubmitError(intl.formatMessage({ id: "affiliate.bankDetails.error.invalid", defaultMessage: "Les coordonnees bancaires sont invalides. Verifiez et reessayez." }));
      } else {
        setSubmitError(intl.formatMessage({ id: "affiliate.bankDetails.error.generic", defaultMessage: "Erreur lors de la mise a jour. Veuillez reessayer." }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input change
  const handleChange = (field: keyof BankDetailsInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Success state
  if (success) {
    return (
      <DashboardLayout activeKey="affiliate-bank-details">
        <div className="max-w-lg mx-auto py-12">
          <div className={`${UI.card} p-8 text-center`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              <FormattedMessage id="affiliate.bankDetails.success.title" defaultMessage="Coordonnées enregistrées !" />
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              <FormattedMessage
                id="affiliate.bankDetails.success.description"
                defaultMessage="Vos coordonnées bancaires ont été enregistrées de manière sécurisée."
              />
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(routes.dashboard)}
                className={`${UI.button.secondary} px-6 py-3 flex-1`}
              >
                <FormattedMessage id="affiliate.bankDetails.backToDashboard" defaultMessage="Tableau de bord" />
              </button>
              <button
                onClick={() => navigate(routes.withdraw)}
                className={`${UI.button.primary} px-6 py-3 flex-1`}
              >
                <FormattedMessage id="affiliate.bankDetails.goToWithdraw" defaultMessage="Faire un retrait" />
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeKey="affiliate-bank-details">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(routes.dashboard)} className={`${UI.button.ghost} p-2`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="affiliate.bankDetails.title" defaultMessage="Coordonnées bancaires" />
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              <FormattedMessage id="affiliate.bankDetails.subtitle" defaultMessage="Pour recevoir vos paiements" />
            </p>
          </div>
        </div>

        {/* Mobile Money Section (Africa countries only) */}
        {isMobileMoneyCountry && (
          <div className={`${UI.card} p-5`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Smartphone className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Mobile Money disponible</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Orange Money, Wave, MTN MoMo, M-Pesa et plus encore
                </p>
              </div>
            </div>
            {mobileMoneySuccess ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Méthode Mobile Money enregistrée !</span>
              </div>
            ) : showMobileMoneyForm ? (
              <div className="space-y-4">
                <PaymentMethodForm
                  onSubmit={handleSaveMobileMoney}
                  loading={savingMobileMoney}
                  error={mobileMoneyError}
                  initialCountry={userCountry}
                />
                <button
                  onClick={() => setShowMobileMoneyForm(false)}
                  className={`${UI.button.secondary} px-4 py-2 text-sm`}
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowMobileMoneyForm(true)}
                className={`${UI.button.primary} px-4 py-2 text-sm flex items-center gap-2`}
              >
                <Smartphone className="w-4 h-4" />
                Ajouter Mobile Money
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className={`${UI.card} p-6`}>
              {/* Current status */}
              {affiliateData?.hasBankDetails && (
                <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-medium text-emerald-800 dark:text-emerald-300">
                        <FormattedMessage id="affiliate.bankDetails.existing" defaultMessage="Coordonnées enregistrées" />
                      </p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">
                        <FormattedMessage
                          id="affiliate.bankDetails.existingAccount"
                          defaultMessage="Compte : {account}"
                          values={{ account: affiliateData.maskedBankAccount || "****" }}
                        />
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {submitError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
                  </div>
                </div>
              )}

              {/* Account Type */}
              <div className="mb-6">
                <label className={UI.label}>
                  <FormattedMessage id="affiliate.bankDetails.accountType" defaultMessage="Type de compte" />
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {accountTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleChange("accountType", type.value)}
                      className={`px-4 py-3 text-sm rounded-xl border transition-all ${
                        formData.accountType === type.value
                          ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 font-medium"
                          : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
                      }`}
                    >
                      <FormattedMessage id={type.labelId} defaultMessage={type.value} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Holder Name */}
              <div className="mb-4">
                <label className={UI.label}>
                  <User className="w-4 h-4 inline mr-1.5" />
                  <FormattedMessage id="affiliate.bankDetails.accountHolderName" defaultMessage="Nom du titulaire" />
                </label>
                <input
                  type="text"
                  value={formData.accountHolderName}
                  onChange={(e) => handleChange("accountHolderName", e.target.value)}
                  placeholder={intl.formatMessage({
                    id: "affiliate.bankDetails.accountHolderName.placeholder",
                    defaultMessage: "Jean Dupont",
                  })}
                  className={`${UI.input} ${errors.accountHolderName ? "border-red-500" : ""}`}
                />
                {errors.accountHolderName && <p className={UI.error}>{errors.accountHolderName}</p>}
              </div>

              {/* Account Number / IBAN */}
              <div className="mb-4">
                <label className={UI.label}>
                  <CreditCard className="w-4 h-4 inline mr-1.5" />
                  {formData.accountType === "iban" ? (
                    <FormattedMessage id="affiliate.bankDetails.iban" defaultMessage="IBAN" />
                  ) : (
                    <FormattedMessage id="affiliate.bankDetails.accountNumber" defaultMessage="Numéro de compte" />
                  )}
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => handleChange("accountNumber", e.target.value.toUpperCase())}
                  placeholder={
                    formData.accountType === "iban"
                      ? "FR76 1234 5678 9012 3456 7890 123"
                      : "12345678"
                  }
                  className={`${UI.input} font-mono ${errors.accountNumber ? "border-red-500" : ""}`}
                />
                {errors.accountNumber && <p className={UI.error}>{errors.accountNumber}</p>}
              </div>

              {/* UK Sort Code / US Routing Number */}
              {formData.accountType === "uk_sort_code" && (
                <div className="mb-4">
                  <label className={UI.label}>
                    <FormattedMessage id="affiliate.bankDetails.sortCode" defaultMessage="Sort Code" />
                  </label>
                  <input
                    type="text"
                    value={formData.sortCode || ""}
                    onChange={(e) => handleChange("sortCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className={`${UI.input} font-mono`}
                  />
                </div>
              )}

              {formData.accountType === "us_aba" && (
                <div className="mb-4">
                  <label className={UI.label}>
                    <FormattedMessage id="affiliate.bankDetails.routingNumber" defaultMessage="Routing Number (ABA)" />
                  </label>
                  <input
                    type="text"
                    value={formData.routingNumber || ""}
                    onChange={(e) => handleChange("routingNumber", e.target.value.replace(/\D/g, "").slice(0, 9))}
                    placeholder="123456789"
                    maxLength={9}
                    className={`${UI.input} font-mono`}
                  />
                </div>
              )}

              {/* BIC/SWIFT (for IBAN) */}
              {formData.accountType === "iban" && (
                <div className="mb-4">
                  <label className={UI.label}>
                    <FormattedMessage id="affiliate.bankDetails.bic" defaultMessage="BIC / SWIFT (optionnel)" />
                  </label>
                  <input
                    type="text"
                    value={formData.swiftBic || ""}
                    onChange={(e) => handleChange("swiftBic", e.target.value.toUpperCase())}
                    placeholder="BNPAFRPP"
                    className={`${UI.input} font-mono`}
                  />
                </div>
              )}

              {/* Bank Name */}
              <div className="mb-4">
                <label className={UI.label}>
                  <Building2 className="w-4 h-4 inline mr-1.5" />
                  <FormattedMessage id="affiliate.bankDetails.bankName" defaultMessage="Nom de la banque" />
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleChange("bankName", e.target.value)}
                  placeholder={intl.formatMessage({
                    id: "affiliate.bankDetails.bankName.placeholder",
                    defaultMessage: "BNP Paribas",
                  })}
                  className={`${UI.input} ${errors.bankName ? "border-red-500" : ""}`}
                />
                {errors.bankName && <p className={UI.error}>{errors.bankName}</p>}
              </div>

              {/* Country & Currency */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={UI.label}>
                    <MapPin className="w-4 h-4 inline mr-1.5" />
                    <FormattedMessage id="affiliate.bankDetails.country" defaultMessage="Pays" />
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    placeholder="France"
                    className={`${UI.input} ${errors.country ? "border-red-500" : ""}`}
                  />
                  {errors.country && <p className={UI.error}>{errors.country}</p>}
                </div>
                <div>
                  <label className={UI.label}>
                    <Globe className="w-4 h-4 inline mr-1.5" />
                    <FormattedMessage id="affiliate.bankDetails.currency" defaultMessage="Devise" />
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    className={UI.input}
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF (CHF)</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`${UI.button.primary} w-full py-4 flex items-center justify-center gap-2`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <FormattedMessage id="affiliate.bankDetails.saving" defaultMessage="Enregistrement..." />
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <FormattedMessage id="affiliate.bankDetails.save" defaultMessage="Enregistrer les coordonnées" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column - Security Info */}
          <div className="space-y-6">
            {/* Security Card */}
            <div className={`${UI.card} p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  <FormattedMessage id="affiliate.bankDetails.security.title" defaultMessage="Sécurité" />
                </h3>
              </div>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <FormattedMessage
                    id="affiliate.bankDetails.security.encrypted"
                    defaultMessage="Données chiffrées avec AES-256"
                  />
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <FormattedMessage
                    id="affiliate.bankDetails.security.pci"
                    defaultMessage="Conforme aux normes PCI-DSS"
                  />
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <FormattedMessage
                    id="affiliate.bankDetails.security.wise"
                    defaultMessage="Transferts sécurisés via Wise"
                  />
                </p>
              </div>
            </div>

            {/* Supported Banks Info */}
            <div className={`${UI.card} p-6`}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="affiliate.bankDetails.supported.title" defaultMessage="Banques supportées" />
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <FormattedMessage
                  id="affiliate.bankDetails.supported.description"
                  defaultMessage="Nous supportons les virements vers la plupart des banques dans plus de 80 pays via Wise."
                />
              </p>
              <div className="flex flex-wrap gap-2">
                {["🇫🇷", "🇩🇪", "🇪🇸", "🇮🇹", "🇬🇧", "🇺🇸", "🇨🇭", "🇧🇪"].map((flag, i) => (
                  <span key={i} className="text-2xl">
                    {flag}
                  </span>
                ))}
                <span className="text-sm text-gray-500 dark:text-gray-400 self-center">+80</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AffiliateBankDetails;
