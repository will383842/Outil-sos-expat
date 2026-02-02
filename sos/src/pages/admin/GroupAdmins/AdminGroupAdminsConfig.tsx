/**
 * AdminGroupAdminsConfig - System configuration for GroupAdmin program
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
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
  Facebook,
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
  clientDiscountPercent: number;
  recruitmentWindowMonths: number;
  minimumWithdrawalAmount: number;
  validationHoldPeriodDays: number;
  releaseDelayHours: number;
  attributionWindowDays: number;
  leaderboardSize: number;
  version: number;
}

const AdminGroupAdminsConfig: React.FC = () => {
  const functions = getFunctions(undefined, 'europe-west1');

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
      setError('Failed to load configuration');
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
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Update config field
  const updateField = (field: keyof GroupAdminConfig, value: number | boolean) => {
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
          <p>{error || 'Failed to load configuration'}</p>
          <button onClick={fetchConfig} className={`${UI.button.secondary} px-4 py-2 mt-4`}>
            Retry
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
              <Facebook className="w-6 h-6 text-blue-500" />
              <FormattedMessage id="groupAdmin.admin.config" defaultMessage="GroupAdmin Configuration" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              System settings for the GroupAdmin program
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
              Save Changes
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
            Configuration saved successfully
          </div>
        )}

        {/* System Status */}
        <div className={UI.card + " p-6"}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Status
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.isSystemActive}
                onChange={(e) => updateField('isSystemActive', e.target.checked)}
                className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">System Active</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.newRegistrationsEnabled}
                onChange={(e) => updateField('newRegistrationsEnabled', e.target.checked)}
                className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">New Registrations Enabled</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.withdrawalsEnabled}
                onChange={(e) => updateField('withdrawalsEnabled', e.target.checked)}
                className="w-5 h-5 rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">Withdrawals Enabled</span>
            </label>
          </div>
        </div>

        {/* Commission Settings */}
        <div className={UI.card + " p-6"}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Commission Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={UI.label}>Client Commission (cents)</label>
              <input
                type="number"
                value={config.commissionClientAmount}
                onChange={(e) => updateField('commissionClientAmount', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                Current: ${(config.commissionClientAmount / 100).toFixed(2)} per client
              </p>
            </div>
            <div>
              <label className={UI.label}>Recruitment Commission (cents)</label>
              <input
                type="number"
                value={config.commissionRecruitmentAmount}
                onChange={(e) => updateField('commissionRecruitmentAmount', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                Current: ${(config.commissionRecruitmentAmount / 100).toFixed(2)} per recruit
              </p>
            </div>
            <div>
              <label className={UI.label}>Client Discount (%)</label>
              <input
                type="number"
                value={config.clientDiscountPercent}
                onChange={(e) => updateField('clientDiscountPercent', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                Discount given to clients using affiliate link
              </p>
            </div>
            <div>
              <label className={UI.label}>Recruitment Window (months)</label>
              <input
                type="number"
                value={config.recruitmentWindowMonths}
                onChange={(e) => updateField('recruitmentWindowMonths', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                How long recruiter earns from recruit's activity
              </p>
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className={UI.card + " p-6"}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Payment Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={UI.label}>Minimum Withdrawal (cents)</label>
              <input
                type="number"
                value={config.minimumWithdrawalAmount}
                onChange={(e) => updateField('minimumWithdrawalAmount', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                Current: ${(config.minimumWithdrawalAmount / 100).toFixed(2)} minimum
              </p>
            </div>
            <div>
              <label className={UI.label}>Validation Hold Period (days)</label>
              <input
                type="number"
                value={config.validationHoldPeriodDays}
                onChange={(e) => updateField('validationHoldPeriodDays', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                Days before pending commission becomes validated
              </p>
            </div>
            <div>
              <label className={UI.label}>Release Delay (hours)</label>
              <input
                type="number"
                value={config.releaseDelayHours}
                onChange={(e) => updateField('releaseDelayHours', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                Hours after validation before funds become available
              </p>
            </div>
            <div>
              <label className={UI.label}>Attribution Window (days)</label>
              <input
                type="number"
                value={config.attributionWindowDays}
                onChange={(e) => updateField('attributionWindowDays', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                Days a click is attributed to the GroupAdmin
              </p>
            </div>
          </div>
        </div>

        {/* Other Settings */}
        <div className={UI.card + " p-6"}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Other Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={UI.label}>Leaderboard Size</label>
              <input
                type="number"
                value={config.leaderboardSize}
                onChange={(e) => updateField('leaderboardSize', parseInt(e.target.value) || 0)}
                className={UI.input}
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of top performers shown
              </p>
            </div>
            <div>
              <label className={UI.label}>Config Version</label>
              <input
                type="number"
                value={config.version}
                disabled
                className={UI.input + " opacity-50"}
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-incremented on save
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminGroupAdminsConfig;
