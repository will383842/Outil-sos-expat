/**
 * ProviderEarnings.tsx
 * Composant d'affichage des revenus pour le dashboard provider
 */

import React, { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/config/firebase";
import { FormattedMessage, useIntl } from "react-intl";
import {
  TrendingUp,
  Clock,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Phone,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  ExternalLink
} from "lucide-react";
import { LocaleLink } from "@/multilingual-system/components/LocaleLink";

interface EarningsSummary {
  totalEarnings: number;
  totalEarningsFormatted: string;
  pendingEarnings: number;
  pendingEarningsFormatted: string;
  availableBalance: number;
  availableBalanceFormatted: string;
  totalPayouts: number;
  totalPayoutsFormatted: string;
  reservedAmount: number;
  reservedAmountFormatted: string;
  pendingKycAmount: number;
  pendingKycAmountFormatted: string;
  totalCalls: number;
  successfulCalls: number;
  averageEarningPerCall: number;
  currency: string;
  lastUpdated: string;
  kycComplete: boolean;
}

interface Transaction {
  id: string;
  type: "earning" | "payout" | "adjustment" | "refund";
  amount: number;
  amountFormatted: string;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

interface ProviderEarningsProps {
  className?: string;
  compact?: boolean;
}

export default function ProviderEarnings({ className = "", compact = false }: ProviderEarningsProps) {
  const intl = useIntl();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadEarnings = async () => {
    setLoading(true);
    setError(null);

    try {
      const getProviderDashboard = httpsCallable(functions, "getProviderDashboard");
      const result = await getProviderDashboard({});
      const data = result.data as { success: boolean; data: { summary: EarningsSummary; recentTransactions: Transaction[] } };

      if (data.success) {
        setSummary(data.data.summary);
        setTransactions(data.data.recentTransactions || []);
      } else {
        setError("Erreur lors du chargement des revenus");
      }
    } catch (err) {
      console.error("Error loading earnings:", err);
      setError("Impossible de charger les revenus");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earning":
        return <Phone className="w-4 h-4 text-green-500" />;
      case "payout":
        return <ArrowUpRight className="w-4 h-4 text-blue-500" />;
      case "refund":
        return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      case "adjustment":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <DollarSign className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadEarnings}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
          >
            <RefreshCw className="w-4 h-4" />
            <FormattedMessage id="common.retry" defaultMessage="Réessayer" />
          </button>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-500" />
          <FormattedMessage id="dashboard.earnings.title" defaultMessage="Mes revenus" />
        </h3>
        <button
          onClick={loadEarnings}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Actualiser les revenus"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" aria-hidden="true" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        {/* Alert: Pending KYC Amount */}
        {summary.pendingKycAmount > 0 && !summary.kycComplete && (
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-700 rounded-xl">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-800 dark:text-orange-300">
                  <FormattedMessage
                    id="dashboard.earnings.pendingKycTitle"
                    defaultMessage="{amount} en attente de vérification"
                    values={{ amount: summary.pendingKycAmountFormatted }}
                  />
                </h4>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                  <FormattedMessage
                    id="dashboard.earnings.pendingKycDescription"
                    defaultMessage="Complétez votre vérification d'identité pour recevoir vos gains. Ce montant vous sera transféré automatiquement."
                  />
                </p>
                <LocaleLink
                  to="/dashboard/kyc"
                  className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <FormattedMessage
                    id="dashboard.earnings.completeKyc"
                    defaultMessage="Compléter ma vérification"
                  />
                  <ExternalLink className="w-4 h-4" />
                </LocaleLink>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Solde disponible */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              <FormattedMessage id="dashboard.earnings.available" defaultMessage="Disponible" />
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {summary.availableBalanceFormatted}
            </div>
          </div>

          {/* En attente */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-sm mb-1">
              <Clock className="w-4 h-4" />
              <FormattedMessage id="dashboard.earnings.pending" defaultMessage="En attente" />
            </div>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
              {summary.pendingEarningsFormatted}
            </div>
          </div>

          {/* Total gagné */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              <FormattedMessage id="dashboard.earnings.total" defaultMessage="Total gagné" />
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {summary.totalEarningsFormatted}
            </div>
          </div>

          {/* Appels réussis */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm mb-1">
              <Phone className="w-4 h-4" />
              <FormattedMessage id="dashboard.earnings.calls" defaultMessage="Appels réussis" />
            </div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {summary.successfulCalls}
            </div>
            <div className="text-xs text-purple-500 dark:text-purple-400">
              ~{summary.averageEarningPerCall.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {summary.currency}/appel
            </div>
          </div>
        </div>

        {/* Transactions récentes (si pas compact) */}
        {!compact && transactions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <FormattedMessage id="dashboard.earnings.recentTransactions" defaultMessage="Transactions récentes" />
            </h4>
            <div className="space-y-2">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(tx.type)}
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {tx.description}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(tx.createdAt).toLocaleDateString(intl.locale)}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`font-semibold ${
                      tx.amount >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}{tx.amountFormatted}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Infos supplémentaires */}
        {(summary.totalPayouts > 0 || summary.reservedAmount > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4 text-sm">
            <div className="text-gray-600 dark:text-gray-400">
              <FormattedMessage id="dashboard.earnings.totalPayouts" defaultMessage="Total versé" />
              : <span className="font-medium text-gray-900 dark:text-white">{summary.totalPayoutsFormatted}</span>
            </div>
            {summary.reservedAmount > 0 && (
              <div className="text-gray-600 dark:text-gray-400">
                <FormattedMessage id="dashboard.earnings.reserved" defaultMessage="Montant réservé" />
                : <span className="font-medium text-orange-600">{summary.reservedAmountFormatted}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
