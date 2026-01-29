/**
 * CommissionRulesEditor - Editor for all commission rules
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { InfluencerCommissionRule, InfluencerCommissionType } from '@/types/influencer';
import CommissionRuleCard from './CommissionRuleCard';
import { Plus, Save, AlertTriangle } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
};

interface CommissionRulesEditorProps {
  rules: InfluencerCommissionRule[];
  onChange: (rules: InfluencerCommissionRule[]) => void;
  onSave: (rules: InfluencerCommissionRule[], reason: string) => Promise<void>;
  isSaving: boolean;
}

// Core types that should always exist
const CORE_COMMISSION_TYPES: InfluencerCommissionType[] = ['client_referral', 'recruitment'];

// All available commission types
const ALL_COMMISSION_TYPES: InfluencerCommissionType[] = [
  'client_referral',
  'recruitment',
  'signup_bonus',
  'first_call',
  'recurring_call',
  'subscription',
  'renewal',
  'provider_bonus',
];

const DEFAULT_NEW_RULE = (type: InfluencerCommissionType): InfluencerCommissionRule => ({
  id: type,
  type,
  enabled: false,
  calculationType: 'fixed',
  fixedAmount: 0,
  percentageRate: 0,
  conditions: {},
  holdPeriodDays: 7,
  releaseDelayHours: 24,
  description: '',
});

const CommissionRulesEditor: React.FC<CommissionRulesEditorProps> = ({
  rules,
  onChange,
  onSave,
  isSaving,
}) => {
  const intl = useIntl();
  const [saveReason, setSaveReason] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Get types that can still be added
  const existingTypes = rules.map((r) => r.type);
  const availableTypes = ALL_COMMISSION_TYPES.filter((t) => !existingTypes.includes(t));

  const handleRuleChange = (updatedRule: InfluencerCommissionRule) => {
    const newRules = rules.map((r) => (r.id === updatedRule.id ? updatedRule : r));
    onChange(newRules);
  };

  const handleRuleDelete = (ruleId: string) => {
    // Don't allow deleting core types
    const rule = rules.find((r) => r.id === ruleId);
    if (rule && CORE_COMMISSION_TYPES.includes(rule.type)) {
      alert("Les règles 'Client référé' et 'Recrutement' ne peuvent pas être supprimées.");
      return;
    }
    const newRules = rules.filter((r) => r.id !== ruleId);
    onChange(newRules);
  };

  const handleAddRule = (type: InfluencerCommissionType) => {
    const newRule = DEFAULT_NEW_RULE(type);
    onChange([...rules, newRule]);
  };

  const handleSave = async () => {
    if (!saveReason.trim()) {
      alert('Veuillez indiquer une raison pour cette modification.');
      return;
    }
    await onSave(rules, saveReason.trim());
    setSaveReason('');
    setShowSaveDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            <FormattedMessage id="admin.influencers.rules.title" defaultMessage="Règles de commission" />
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="admin.influencers.rules.subtitle"
              defaultMessage="Configurez les taux et conditions de chaque type de commission"
            />
          </p>
        </div>

        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={isSaving}
          className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}
        >
          <Save className="w-4 h-4" />
          <FormattedMessage id="common.save" defaultMessage="Enregistrer" />
        </button>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-700 dark:text-yellow-300">
          <p className="font-medium">Note importante</p>
          <p className="mt-1">
            Les modifications de taux n'affectent que les <strong>nouveaux influenceurs</strong>.
            Les taux des influenceurs existants sont figés à leur inscription.
          </p>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <CommissionRuleCard
            key={rule.id}
            rule={rule}
            onChange={handleRuleChange}
            onDelete={handleRuleDelete}
            canDelete={!CORE_COMMISSION_TYPES.includes(rule.type)}
          />
        ))}
      </div>

      {/* Add Rule Button */}
      {availableTypes.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Ajouter une règle:</span>
          <div className="flex flex-wrap gap-2">
            {availableTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleAddRule(type)}
                className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1`}
              >
                <Plus className="w-3 h-3" />
                {type.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Enregistrer les modifications
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Veuillez indiquer la raison de cette modification (pour l'historique).
            </p>
            <textarea
              value={saveReason}
              onChange={(e) => setSaveReason(e.target.value)}
              placeholder="Ex: Augmentation des commissions pour campagne Q1"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowSaveDialog(false)}
                className={`${UI.button.secondary} px-4 py-2`}
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !saveReason.trim()}
                className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}
              >
                {isSaving ? (
                  <span className="animate-spin">...</span>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionRulesEditor;
