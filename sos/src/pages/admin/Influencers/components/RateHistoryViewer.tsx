/**
 * RateHistoryViewer - View history of rate changes
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { InfluencerRateHistoryEntry, InfluencerCommissionRule } from '@/types/influencer';
import { History, ChevronDown, ChevronUp, Clock, User } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6",
};

interface RateHistoryViewerProps {
  onClose?: () => void;
}

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  client_referral: 'Client référé',
  recruitment: 'Recrutement',
  signup_bonus: 'Bonus inscription',
  first_call: 'Premier appel',
  recurring_call: 'Appels récurrents',
  subscription: 'Souscription',
  renewal: 'Renouvellement',
  provider_bonus: 'Bonus prestataire',
};

const RateHistoryViewer: React.FC<RateHistoryViewerProps> = ({ onClose }) => {
  const intl = useIntl();
  const functions = getFunctions(undefined, 'europe-west1');
  const [history, setHistory] = useState<InfluencerRateHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetRateHistory = httpsCallable<{ limit?: number }, { history: InfluencerRateHistoryEntry[] }>(
        functions,
        'adminGetRateHistory'
      );
      const result = await adminGetRateHistory({ limit: 20 });
      setHistory(result.data.history);
    } catch (err: any) {
      console.error('Error fetching rate history:', err);
      setError(err.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(intl.locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatRule = (rule: InfluencerCommissionRule) => {
    const parts = [];
    if (rule.calculationType === 'fixed' || rule.calculationType === 'hybrid') {
      parts.push(formatAmount(rule.fixedAmount));
    }
    if (rule.calculationType === 'percentage' || rule.calculationType === 'hybrid') {
      parts.push(`${(rule.percentageRate * 100).toFixed(1)}%`);
    }
    return parts.join(' + ') || '-';
  };

  if (loading) {
    return (
      <div className={UI.card}>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="medium" color="red" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={UI.card}>
        <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchHistory}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={UI.card}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
            <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.influencers.history.title" defaultMessage="Historique des taux" />
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.influencers.history.subtitle"
                defaultMessage="Dernières modifications des règles de commission"
              />
            </p>
          </div>
        </div>
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucune modification enregistrée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div
              key={index}
              className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
            >
              {/* Entry Header */}
              <button
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    {formatDate(entry.changedAt)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    {entry.changedBy}
                  </div>
                </div>
                {expandedIndex === index ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Entry Details */}
              {expandedIndex === index && (
                <div className="px-4 py-4 bg-white dark:bg-gray-900">
                  {/* Reason */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Raison:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">{entry.reason}</p>
                  </div>

                  {/* Previous Rules */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Règles précédentes:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs text-gray-500 uppercase">
                          <tr>
                            <th className="pb-2">Type</th>
                            <th className="pb-2">Activé</th>
                            <th className="pb-2">Calcul</th>
                            <th className="pb-2">Montant</th>
                            <th className="pb-2">Hold</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {entry.previousRules.map((rule) => (
                            <tr key={rule.id}>
                              <td className="py-2 text-gray-900 dark:text-white">
                                {COMMISSION_TYPE_LABELS[rule.type] || rule.type}
                              </td>
                              <td className="py-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs ${
                                    rule.enabled
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                                  }`}
                                >
                                  {rule.enabled ? 'Oui' : 'Non'}
                                </span>
                              </td>
                              <td className="py-2 text-gray-600 dark:text-gray-400">
                                {rule.calculationType}
                              </td>
                              <td className="py-2 text-gray-600 dark:text-gray-400">
                                {formatRule(rule)}
                              </td>
                              <td className="py-2 text-gray-600 dark:text-gray-400">
                                {rule.holdPeriodDays}j + {rule.releaseDelayHours}h
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RateHistoryViewer;
