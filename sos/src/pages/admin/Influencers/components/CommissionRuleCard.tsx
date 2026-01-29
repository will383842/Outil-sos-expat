/**
 * CommissionRuleCard - Single commission rule editor card
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { InfluencerCommissionRule, CommissionCalculationType } from '@/types/influencer';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const UI = {
  card: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4",
  input: "w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500",
  select: "w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500",
  label: "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1",
};

interface CommissionRuleCardProps {
  rule: InfluencerCommissionRule;
  onChange: (rule: InfluencerCommissionRule) => void;
  onDelete: (ruleId: string) => void;
  canDelete?: boolean;
}

const COMMISSION_TYPE_LABELS: Record<string, string> = {
  client_referral: 'Client référé',
  recruitment: 'Recrutement prestataire',
  signup_bonus: 'Bonus inscription',
  first_call: 'Premier appel',
  recurring_call: 'Appels récurrents',
  subscription: 'Souscription',
  renewal: 'Renouvellement',
  provider_bonus: 'Bonus prestataire',
  manual_adjustment: 'Ajustement manuel',
};

const CommissionRuleCard: React.FC<CommissionRuleCardProps> = ({
  rule,
  onChange,
  onDelete,
  canDelete = true,
}) => {
  const intl = useIntl();
  const [expanded, setExpanded] = React.useState(rule.enabled);

  const handleFieldChange = <K extends keyof InfluencerCommissionRule>(
    field: K,
    value: InfluencerCommissionRule[K]
  ) => {
    onChange({ ...rule, [field]: value });
  };

  const handleConditionChange = (
    field: keyof InfluencerCommissionRule['conditions'],
    value: any
  ) => {
    onChange({
      ...rule,
      conditions: { ...rule.conditions, [field]: value },
    });
  };

  return (
    <div className={`${UI.card} ${!rule.enabled ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {COMMISSION_TYPE_LABELS[rule.type] || rule.type}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {rule.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {rule.enabled ? 'Activé' : 'Désactivé'}
            </span>
            <input
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) => handleFieldChange('enabled', e.target.checked)}
              className="w-4 h-4 text-red-500 rounded focus:ring-red-500"
            />
          </label>

          {canDelete && (
            <button
              onClick={() => onDelete(rule.id)}
              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {/* Calculation Type & Amounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={UI.label}>Type de calcul</label>
              <select
                value={rule.calculationType}
                onChange={(e) =>
                  handleFieldChange('calculationType', e.target.value as CommissionCalculationType)
                }
                className={UI.select}
              >
                <option value="fixed">Montant fixe</option>
                <option value="percentage">Pourcentage</option>
                <option value="hybrid">Hybride (fixe + %)</option>
              </select>
            </div>

            {(rule.calculationType === 'fixed' || rule.calculationType === 'hybrid') && (
              <div>
                <label className={UI.label}>Montant fixe ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(rule.fixedAmount / 100).toFixed(2)}
                    onChange={(e) =>
                      handleFieldChange('fixedAmount', Math.round(parseFloat(e.target.value || '0') * 100))
                    }
                    className={`${UI.input} pl-7`}
                  />
                </div>
              </div>
            )}

            {(rule.calculationType === 'percentage' || rule.calculationType === 'hybrid') && (
              <div>
                <label className={UI.label}>Pourcentage (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={(rule.percentageRate * 100).toFixed(1)}
                    onChange={(e) =>
                      handleFieldChange('percentageRate', parseFloat(e.target.value || '0') / 100)
                    }
                    className={`${UI.input} pr-7`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                </div>
              </div>
            )}
          </div>

          {/* Apply To (for percentage) */}
          {(rule.calculationType === 'percentage' || rule.calculationType === 'hybrid') && (
            <div className="max-w-xs">
              <label className={UI.label}>Appliquer sur</label>
              <select
                value={rule.applyTo || 'connection_fee'}
                onChange={(e) =>
                  handleFieldChange('applyTo', e.target.value as 'connection_fee' | 'total_amount')
                }
                className={UI.select}
              >
                <option value="connection_fee">Frais de connexion</option>
                <option value="total_amount">Montant total</option>
              </select>
            </div>
          )}

          {/* Hold Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={UI.label}>Période de rétention (jours)</label>
              <input
                type="number"
                min="0"
                max="90"
                value={rule.holdPeriodDays}
                onChange={(e) => handleFieldChange('holdPeriodDays', parseInt(e.target.value || '7'))}
                className={UI.input}
              />
            </div>

            <div>
              <label className={UI.label}>Délai de déblocage (heures)</label>
              <input
                type="number"
                min="0"
                max="168"
                value={rule.releaseDelayHours}
                onChange={(e) => handleFieldChange('releaseDelayHours', parseInt(e.target.value || '24'))}
                className={UI.input}
              />
            </div>
          </div>

          {/* Conditions */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Conditions</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={UI.label}>Durée min. appel (sec)</label>
                <input
                  type="number"
                  min="0"
                  value={rule.conditions.minCallDuration || 0}
                  onChange={(e) => handleConditionChange('minCallDuration', parseInt(e.target.value || '0'))}
                  className={UI.input}
                  placeholder="0 = pas de limite"
                />
              </div>

              <div>
                <label className={UI.label}>Max par mois</label>
                <input
                  type="number"
                  min="0"
                  value={rule.conditions.maxPerMonth || 0}
                  onChange={(e) => handleConditionChange('maxPerMonth', parseInt(e.target.value || '0'))}
                  className={UI.input}
                  placeholder="0 = illimité"
                />
              </div>

              <div>
                <label className={UI.label}>Limite totale</label>
                <input
                  type="number"
                  min="0"
                  value={rule.conditions.lifetimeLimit || 0}
                  onChange={(e) => handleConditionChange('lifetimeLimit', parseInt(e.target.value || '0'))}
                  className={UI.input}
                  placeholder="0 = illimité"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rule.conditions.requireEmailVerification || false}
                  onChange={(e) => handleConditionChange('requireEmailVerification', e.target.checked)}
                  className="w-4 h-4 text-red-500 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Requiert email vérifié
                </span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={UI.label}>Description (interne)</label>
            <input
              type="text"
              value={rule.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className={UI.input}
              placeholder="Description pour l'admin"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionRuleCard;
