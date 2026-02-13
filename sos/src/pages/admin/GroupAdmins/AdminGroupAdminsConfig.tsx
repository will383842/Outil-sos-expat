/**
 * AdminGroupAdminsConfig - System configuration for GroupAdmin program
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Settings,
  DollarSign,
  Clock,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Users,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
} as const;

interface GroupAdminConfig {
  isSystemActive: boolean;
  newRegistrationsEnabled: boolean;
  withdrawalsEnabled: boolean;
  commissionClientAmount: number;
  commissionRecruitmentAmount: number;
  clientDiscountAmount: number;
  recruitmentCommissionThreshold: number;
  paymentMode: "manual" | "automatic";
  recruitmentWindowMonths: number;
  minimumWithdrawalAmount: number;
  validationHoldPeriodDays: number;
  releaseDelayHours: number;
  attributionWindowDays: number;
  leaderboardSize: number;
  version: number;
}

const AdminGroupAdminsConfig: React.FC = () => {
  const functions = getFunctions(undefined, 'europe-west2');
  const intl = useIntl();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState<GroupAdminConfig | null>(null);

  // Fetch config
  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const getConfig = httpsCallable(functions, 'adminGetGroupAdminConfig');
      const result = await getConfig({});
      setConfig(result.data as GroupAdminConfig);
    } catch (err) {
      console.error('Error fetching config:', err);
      setError(intl.formatMessage({ id: 'groupAdmin.admin.config.error' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Save config
  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updateConfig = httpsCallable(functions, 'adminUpdateGroupAdminConfig');
      await updateConfig(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      fetchConfig();
    } catch (err) {
      console.error('Error saving config:', err);
      setError(intl.formatMessage({ id: 'groupAdmin.admin.config.saveError' }));
    } finally {
      setSaving(false);
    }
  };

  // Update config field
  const updateField = (field: keyof GroupAdminConfig, value: number | boolean | string) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </AdminLayout>
    );
  }

  if (!config) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-screen text-red-500">
          <AlertTriangle className="w-12 h-12 mb-4" />
          <p>{error || intl.formatMessage({ id: 'groupAdmin.admin.config.error' })}</p>
          <button onClick={fetchConfig} className={`${UI.button.secondary} px-4 py-2 mt-4`}>
            {intl.formatMessage({ id: 'groupAdmin.admin.config.retry' })}
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-500" />
              <FormattedMessage id="groupAdmin.admin.config" defaultMessage="GroupAdmin Configuration" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {intl.formatMessage({ id: 'groupAdmin.admin.config.description' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchConfig} className={`${UI.button.secondary} p-2`}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {intl.formatMessage({ id: 'groupAdmin.admin.config.saveChanges' })}
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            {intl.formatMessage({ id: 'groupAdmin.admin.config.savedSuccess' })}
          </div>
        )}

        {/* System Status */}
        <div className={UI.card + " p-6"}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {intl.formatMessage({ id: 'groupAdmin.admin.config.systemStatus' })}
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.isSystemActive}
                onChange={(e) => updateField('isSystemActive', e.target.checked)}
                className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">{intl.formatMessage({ id: 'groupAdmin.admin.config.systemActive' })}</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.newRegistrationsEnabled}
                onChange={(e) => updateField('newRegistrationsEnabled', e.target.checked)}
                className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">{intl.formatMessage({ id: 'groupAdmin.admin.config.newRegistrations' })}</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.withdrawalsEnabled}
                onChange={(e) => updateField('withdrawalsEnabled', e.target.checked)}
                className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">{intl.formatMessage({ id: 'groupAdmin.admin.config.withdrawalsEnabled' })}</span>
            </label>
          </div>
        </div>

        {/* Commission Settings */}
        <div className={UI.card + " p-6"}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            {intl.formatMessage({ id: 'groupAdmin.admin.config.commissionSettings' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.config.clientCommission' })}</label>
              <input
                type="number"
                value={config.commissionClientAmount}
                onChange={(e) => updateField('commissionClientAmount', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'groupAdmin.admin.config.currentPerClient' }, { amount: (config.commissionClientAmount / 100).toFixed(2) })}
              </p>
            </div>
            <div>
              <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.config.recruitmentCommission' })}</label>
              <input
                type="number"
                value={config.commissionRecruitmentAmount}
                onChange={(e) => updateField('commissionRecruitmentAmount', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'groupAdmin.admin.config.currentPerRecruit' }, { amount: (config.commissionRecruitmentAmount / 100).toFixed(2) })}
              </p>
            </div>
            <div>
              <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.config.clientDiscount' })}</label>
              <input
                type="number"
                value={config.clientDiscountAmount}
                onChange={(e) => updateField('clientDiscountAmount', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'groupAdmin.admin.config.currentDiscount' }, { amount: (config.clientDiscountAmount / 100).toFixed(2) })}
              </p>
            </div>
            <div>
              <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.config.recruitmentThreshold' })}</label>
              <input
                type="number"
                value={config.recruitmentCommissionThreshold}
                onChange={(e) => updateField('recruitmentCommissionThreshold', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'groupAdmin.admin.config.thresholdDesc' }, { amount: (config.recruitmentCommissionThreshold / 100).toFixed(2) })}
              </p>
            </div>
            <div>
              <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.config.recruitmentWindow' })}</label>
              <input
                type="number"
                value={config.recruitmentWindowMonths}
                onChange={(e) => updateField('recruitmentWindowMonths', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'groupAdmin.admin.config.recruitmentWindowDesc' })}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className={UI.card + " p-6"}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            {intl.formatMessage({ id: 'groupAdmin.admin.config.paymentSettings' })}
          </h2>
          <div className="space-y-4 mb-4">
            <div>
              <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.config.paymentMode' })}</label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="manual"
                    checked={config.paymentMode === 'manual'}
                    onChange={() => updateField('paymentMode', 'manual')}
                    className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{intl.formatMessage({ id: 'groupAdmin.admin.config.manual' })}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="automatic"
                    checked={config.paymentMode === 'automatic'}
                    onChange={() => updateField('paymentMode', 'automatic')}
                    className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{intl.formatMessage({ id: 'groupAdmin.admin.config.automatic' })}</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'groupAdmin.admin.config.automaticNote' })}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.config.minWithdrawal' })}</label>
              <input
                type="number"
                value={config.minimumWithdrawalAmount}
                onChange={(e) => updateField('minimumWithdrawalAmount', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'groupAdmin.admin.config.currentMinimum' }, { amount: (config.minimumWithdrawalAmount / 100).toFixed(2) })}
              </p>
            </div>
            <div>
              <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.config.validationHold' })}</label>
              <input
                type="number"
                value={config.validationHoldPeriodDays}
                onChange={(e) => updateField('validationHoldPeriodDays', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'groupAdmin.admin.config.validationHoldDesc' })}
              </p>
            </div>
            <div>
              <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.config.releaseDelay' })}</label>
              <input
                type="number"
                value={config.releaseDelayHours}
                onChange={(e) => updateField('releaseDelayHours', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'groupAdmin.admin.config.releaseDelayDesc' })}
              </p>
            </div>
            <div>
              <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.config.attributionWindow' })}</label>
              <input
                type="number"
                value={config.attributionWindowDays}
                onChange={(e) => updateField('attributionWindowDays', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'groupAdmin.admin.config.attributionWindowDesc' })}
              </p>
            </div>
          </div>
        </div>

        {/* Other Settings */}
        <div className={UI.card + " p-6"}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {intl.formatMessage({ id: 'groupAdmin.admin.config.otherSettings' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.config.leaderboardSize' })}</label>
              <input
                type="number"
                value={config.leaderboardSize}
                onChange={(e) => updateField('leaderboardSize', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'groupAdmin.admin.config.leaderboardSizeDesc' })}
              </p>
            </div>
            <div>
              <label className={UI.label}>{intl.formatMessage({ id: 'groupAdmin.admin.config.configVersion' })}</label>
              <input
                type="number"
                value={config.version}
                disabled
                className={UI.input + " opacity-50"}
              />
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'groupAdmin.admin.config.versionDesc' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminGroupAdminsConfig;
