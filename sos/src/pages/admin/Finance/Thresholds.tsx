/**
 * Threshold Dashboard Component
 * Admin interface for monitoring international tax thresholds
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import AdminLayout from '../../../components/admin/AdminLayout';
import Modal from '../../../components/common/Modal';
import ErrorBoundary from '../../../components/common/ErrorBoundary';
import {
  AlertTriangle,
  Globe,
  TrendingUp,
  CheckCircle,
  XCircle,
  Bell,
  Download,
  RefreshCw,
  Settings,
  ExternalLink,
  Eye,
  Check,
  Clock,
  Filter,
  ChevronRight,
  AlertCircle,
  Shield,
  DollarSign,
  BarChart3,
  FileText,
  MapPin,
} from 'lucide-react';
import {
  ThresholdTracking,
  ThresholdAlert,
  ThresholdConfig,
  ThresholdFilters,
  ThresholdStatus,
  THRESHOLD_CONFIGS,
  THRESHOLD_STATUS_LABELS,
  THRESHOLD_STATUS_COLORS,
  COUNTRY_REGIONS,
  formatThresholdCurrency,
} from '../../../types/thresholds';
import {
  fetchThresholdTrackings,
  fetchRecentAlerts,
  fetchThresholdDashboardSummary,
  markCountryAsRegistered,
  acknowledgeAlert as acknowledgeAlertService,
  initializeAllThresholds,
  triggerRecalculation,
  exportThresholdsToCSV,
  downloadCSV,
  subscribeToThresholds,
  subscribeToAlerts,
} from '../../../services/thresholdService';

// ============================================================================
// TYPES
// ============================================================================

type TabType = 'overview' | 'countries' | 'alerts' | 'settings';

interface RegistrationModalData {
  countryCode: string;
  countryName: string;
  registrationNumber: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function Thresholds() {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [trackings, setTrackings] = useState<ThresholdTracking[]>([]);
  const [alerts, setAlerts] = useState<ThresholdAlert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [filters, setFilters] = useState<ThresholdFilters>({
    status: 'all',
    region: 'all',
    search: '',
  });

  // Modals
  const [registrationModal, setRegistrationModal] = useState<RegistrationModalData | null>(null);
  const [viewingTracking, setViewingTracking] = useState<ThresholdTracking | null>(null);
  const [viewingAlert, setViewingAlert] = useState<ThresholdAlert | null>(null);
  const [acknowledgeNotes, setAcknowledgeNotes] = useState('');

  // Confirmation and Error modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [trackingsData, alertsData] = await Promise.all([
        fetchThresholdTrackings(),
        fetchRecentAlerts(30),
      ]);

      setTrackings(trackingsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Error loading threshold data:', err);
      setError(t('admin.thresholds.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscriptions
  useEffect(() => {
    const unsubscribeTrackings = subscribeToThresholds(setTrackings);
    const unsubscribeAlerts = subscribeToAlerts(setAlerts);

    return () => {
      unsubscribeTrackings();
      unsubscribeAlerts();
    };
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await triggerRecalculation();
      await loadData();
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleInitialize = async () => {
    setConfirmModal({
      isOpen: true,
      title: t('admin.thresholds.initializeTitle'),
      message: t('admin.thresholds.initializeConfirm'),
      onConfirm: async () => {
        setConfirmModal(null);
        setIsRefreshing(true);
        try {
          await initializeAllThresholds();
          await loadData();
        } catch (err) {
          console.error('Error initializing:', err);
          setErrorModal(t('admin.thresholds.initializeError'));
        } finally {
          setIsRefreshing(false);
        }
      },
    });
  };

  const handleMarkAsRegistered = async () => {
    if (!registrationModal || !registrationModal.registrationNumber) {
      setErrorModal(t('admin.thresholds.enterRegistrationNumber'));
      return;
    }

    try {
      const success = await markCountryAsRegistered(
        registrationModal.countryCode,
        registrationModal.registrationNumber
      );

      if (success) {
        setRegistrationModal(null);
        await loadData();
      } else {
        setErrorModal(t('admin.thresholds.registrationError'));
      }
    } catch (err) {
      console.error('Error marking as registered:', err);
      setErrorModal(t('admin.thresholds.registrationError'));
    }
  };

  const handleAcknowledgeAlert = async () => {
    if (!viewingAlert) return;

    try {
      const success = await acknowledgeAlertService(viewingAlert.id, acknowledgeNotes);

      if (success) {
        setViewingAlert(null);
        setAcknowledgeNotes('');
        await loadData();
      } else {
        setErrorModal(t('admin.thresholds.acknowledgeError'));
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setErrorModal(t('admin.thresholds.acknowledgeError'));
    }
  };

  const handleExport = () => {
    const csv = exportThresholdsToCSV(filteredTrackings);
    const filename = `seuils-fiscaux-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const filteredTrackings = useMemo(() => {
    let result = trackings;

    if (filters.status && filters.status !== 'all') {
      result = result.filter(t => t.status === filters.status);
    }

    if (filters.region && filters.region !== 'all') {
      result = result.filter(t => COUNTRY_REGIONS[t.countryCode] === filters.region);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        t =>
          t.countryName.toLowerCase().includes(searchLower) ||
          t.countryCode.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [trackings, filters]);

  const summary = useMemo(() => {
    return {
      total: trackings.length,
      safe: trackings.filter(t => t.status === 'SAFE').length,
      warning: trackings.filter(t => t.status === 'WARNING_70' || t.status === 'WARNING_90').length,
      exceeded: trackings.filter(t => t.status === 'EXCEEDED').length,
      registered: trackings.filter(t => t.status === 'REGISTERED').length,
      totalRevenueEUR: trackings.reduce((sum, t) => sum + t.currentAmountEUR, 0),
      criticalCount: trackings.filter(t => t.status === 'WARNING_90' || t.status === 'EXCEEDED').length,
      unacknowledgedAlerts: alerts.filter(a => !a.acknowledgedBy).length,
    };
  }, [trackings, alerts]);

  const criticalThresholds = useMemo(() => {
    return trackings
      .filter(t => t.status === 'WARNING_90' || t.status === 'EXCEEDED')
      .sort((a, b) => b.percentageUsed - a.percentageUsed);
  }, [trackings]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getStatusIcon = (status: ThresholdStatus) => {
    switch (status) {
      case 'SAFE':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'WARNING_70':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'WARNING_90':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'EXCEEDED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'REGISTERED':
        return <Shield className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getProgressBarColor = (percentage: number, status: ThresholdStatus) => {
    if (status === 'REGISTERED') return 'bg-blue-500';
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 90) return 'bg-orange-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getCountryFlag = (countryCode: string) => {
    const config = THRESHOLD_CONFIGS.find(c => c.countryCode === countryCode);
    return config?.flag || '🏳️';
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return intl.formatDate(date, { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return intl.formatNumber(amount, { style: 'currency', currency: 'EUR' });
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Globe className="h-8 w-8 animate-spin text-red-600" />
            <p className="text-gray-600">{t('admin.thresholds.loading')}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              {t('admin.common.retry')}
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <ErrorBoundary>
      <AdminLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Globe className="w-8 h-8 mr-3 text-red-600" />
                {t('admin.thresholds.title')}
              </h1>
              <p className="text-gray-600 mt-2">
                {t('admin.thresholds.description')}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {t('admin.common.refresh')}
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                {t('admin.common.export')}
              </button>
            </div>
          </div>

          {/* Critical Alert Banner */}
          {summary.criticalCount > 0 && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-6 h-6 text-red-500 mr-3" />
                <div>
                  <h3 className="text-red-800 font-semibold">
                    {t('admin.thresholds.criticalThresholds', { count: summary.criticalCount })}
                  </h3>
                  <p className="text-red-700 text-sm mt-1">
                    {criticalThresholds.map(ct => ct.countryName).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: t('admin.thresholds.tabs.overview'), icon: BarChart3 },
                { id: 'countries', label: t('admin.thresholds.tabs.countries'), icon: MapPin },
                { id: 'alerts', label: `${t('admin.thresholds.tabs.alerts')}${summary.unacknowledgedAlerts > 0 ? ` (${summary.unacknowledgedAlerts})` : ''}`, icon: Bell },
                { id: 'settings', label: t('admin.thresholds.tabs.settings'), icon: Settings },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{t('admin.thresholds.kpi.countriesMonitored')}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{summary.total}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {t('admin.thresholds.kpi.safe', { count: summary.safe })}
                      </p>
                    </div>
                    <Globe className="w-8 h-8 text-gray-400" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{t('admin.thresholds.kpi.totalRevenue')}</p>
                      <p className="text-3xl font-bold text-blue-600 mt-1">
                        {formatCurrency(summary.totalRevenueEUR)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('admin.thresholds.kpi.currentPeriod')}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-400" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{t('admin.thresholds.kpi.activeAlerts')}</p>
                      <p className={`text-3xl font-bold mt-1 ${
                        summary.warning > 0 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {summary.warning}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('admin.thresholds.kpi.exceeded', { count: summary.exceeded })}
                      </p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-orange-400" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{t('admin.thresholds.kpi.registrations')}</p>
                      <p className="text-3xl font-bold text-blue-600 mt-1">{summary.registered}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('admin.thresholds.kpi.vatActive')}
                      </p>
                    </div>
                    <Shield className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    {t('admin.thresholds.progressByCountry')}
                  </h2>
                </div>
                <div className="p-6">
                  {trackings.length === 0 ? (
                    <div className="text-center py-8">
                      <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">{t('admin.thresholds.noThresholds')}</p>
                      <button
                        onClick={handleInitialize}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        {t('admin.thresholds.initializeThresholds')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trackings.slice(0, 10).map(tracking => (
                        <div
                          key={`${tracking.countryCode}_${tracking.period}`}
                          className="flex items-center cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded"
                          onClick={() => setViewingTracking(tracking)}
                        >
                          <div className="w-48 flex items-center">
                            <span className="text-2xl mr-2">{getCountryFlag(tracking.countryCode)}</span>
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                {tracking.countryName}
                              </span>
                              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                THRESHOLD_STATUS_COLORS[tracking.status]
                              }`}>
                                {THRESHOLD_STATUS_LABELS[tracking.status]}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 mx-4">
                            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getProgressBarColor(tracking.percentageUsed, tracking.status)} transition-all duration-300`}
                                style={{ width: `${Math.min(tracking.percentageUsed, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-24 text-right">
                            <span className="text-sm font-semibold text-gray-900">
                              {tracking.percentageUsed.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-32 text-right">
                            <span className="text-sm text-gray-600">
                              {formatThresholdCurrency(tracking.currentAmount, tracking.thresholdCurrency)}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 ml-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Critical Thresholds */}
              {criticalThresholds.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-red-200">
                  <div className="px-6 py-4 border-b border-red-200 bg-red-50">
                    <h2 className="text-lg font-semibold text-red-800 flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      {t('admin.thresholds.actionsRequired')}
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {criticalThresholds.map(tracking => {
                      const config = THRESHOLD_CONFIGS.find(c => c.countryCode === tracking.countryCode);
                      return (
                        <div
                          key={`${tracking.countryCode}_${tracking.period}`}
                          className="p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">{getCountryFlag(tracking.countryCode)}</span>
                              <div>
                                <h3 className="font-semibold text-gray-900">{tracking.countryName}</h3>
                                <p className="text-sm text-red-600">
                                  {t('admin.thresholds.thresholdReached', { percent: tracking.percentageUsed.toFixed(1) })}
                                </p>
                                {config && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {config.consequence}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {config?.registrationUrl && (
                                <a
                                  href={config.registrationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  {t('admin.thresholds.portal')}
                                </a>
                              )}
                              <button
                                onClick={() => setRegistrationModal({
                                  countryCode: tracking.countryCode,
                                  countryName: tracking.countryName,
                                  registrationNumber: tracking.registrationNumber || '',
                                })}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                <Shield className="w-4 h-4" />
                                {t('admin.thresholds.markAsRegistered')}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Countries Tab */}
          {activeTab === 'countries' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{t('admin.thresholds.filters.label')}:</span>
                  </div>
                  <select
                    value={filters.status || 'all'}
                    onChange={e => setFilters({ ...filters, status: e.target.value as ThresholdStatus | 'all' })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">{t('admin.thresholds.filters.allStatuses')}</option>
                    <option value="SAFE">{t('admin.thresholds.status.safe')}</option>
                    <option value="WARNING_70">{t('admin.thresholds.status.warning70')}</option>
                    <option value="WARNING_90">{t('admin.thresholds.status.warning90')}</option>
                    <option value="EXCEEDED">{t('admin.thresholds.status.exceeded')}</option>
                    <option value="REGISTERED">{t('admin.thresholds.status.registered')}</option>
                  </select>
                  <select
                    value={filters.region || 'all'}
                    onChange={e => setFilters({ ...filters, region: e.target.value as 'EU' | 'APAC' | 'AMERICAS' | 'OTHER' | 'all' })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">{t('admin.thresholds.filters.allRegions')}</option>
                    <option value="EU">{t('admin.thresholds.regions.europe')}</option>
                    <option value="APAC">{t('admin.thresholds.regions.apac')}</option>
                    <option value="AMERICAS">{t('admin.thresholds.regions.americas')}</option>
                  </select>
                  <input
                    type="text"
                    placeholder={t('admin.thresholds.filters.search')}
                    value={filters.search || ''}
                    onChange={e => setFilters({ ...filters, search: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Countries Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.thresholds.table.countryZone')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.thresholds.table.progress')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.thresholds.table.currentAmount')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.thresholds.table.threshold')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.thresholds.table.transactions')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.thresholds.table.status')}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('admin.thresholds.table.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTrackings.map(tracking => (
                        <tr
                          key={`${tracking.countryCode}_${tracking.period}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">{getCountryFlag(tracking.countryCode)}</span>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {tracking.countryName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {tracking.countryCode} - {tracking.period}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-32">
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>{tracking.percentageUsed.toFixed(1)}%</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getProgressBarColor(tracking.percentageUsed, tracking.status)}`}
                                  style={{ width: `${Math.min(tracking.percentageUsed, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatThresholdCurrency(tracking.currentAmount, tracking.thresholdCurrency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatThresholdCurrency(tracking.thresholdAmount, tracking.thresholdCurrency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {tracking.transactionCount}
                            <span className="text-xs text-gray-400 ml-1">
                              (B2C: {tracking.b2cCount})
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              THRESHOLD_STATUS_COLORS[tracking.status]
                            }`}>
                              {getStatusIcon(tracking.status)}
                              {THRESHOLD_STATUS_LABELS[tracking.status]}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setViewingTracking(tracking)}
                                className="text-blue-600 hover:text-blue-800 p-1"
                                title={t('admin.thresholds.viewDetails')}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {!tracking.isRegistered && (
                                <button
                                  onClick={() => setRegistrationModal({
                                    countryCode: tracking.countryCode,
                                    countryName: tracking.countryName,
                                    registrationNumber: '',
                                  })}
                                  className="text-green-600 hover:text-green-800 p-1"
                                  title={t('admin.thresholds.markAsRegistered')}
                                >
                                  <Shield className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-orange-600" />
                    {t('admin.thresholds.alertsHistory')}
                  </h2>
                </div>
                {alerts.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                    <p className="text-gray-500">{t('admin.thresholds.noRecentAlerts')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {alerts.map(alert => (
                      <div
                        key={alert.id}
                        className={`p-4 hover:bg-gray-50 ${!alert.acknowledgedBy ? 'bg-orange-50' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {alert.alertType === 'EXCEEDED' ? (
                              <XCircle className="w-6 h-6 text-red-500 mr-3" />
                            ) : alert.alertType === 'WARNING_90' ? (
                              <AlertTriangle className="w-6 h-6 text-orange-500 mr-3" />
                            ) : (
                              <AlertCircle className="w-6 h-6 text-yellow-500 mr-3" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{getCountryFlag(alert.countryCode)}</span>
                                <h3 className="font-semibold text-gray-900">
                                  {THRESHOLD_CONFIGS.find(c => c.countryCode === alert.countryCode)?.name || alert.countryCode}
                                </h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  alert.alertType === 'EXCEEDED'
                                    ? 'bg-red-100 text-red-800'
                                    : alert.alertType === 'WARNING_90'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {alert.alertType.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {alert.percentageAtAlert.toFixed(1)}% du seuil -
                                {formatThresholdCurrency(alert.amountAtAlert, alert.currency)} /
                                {formatThresholdCurrency(alert.thresholdAmount, alert.currency)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {formatDate(alert.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {alert.acknowledgedBy ? (
                              <span className="flex items-center gap-1 text-sm text-green-600">
                                <Check className="w-4 h-4" />
                                {t('admin.thresholds.acknowledged')}
                              </span>
                            ) : (
                              <button
                                onClick={() => setViewingAlert(alert)}
                                className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                              >
                                {t('admin.thresholds.acknowledge')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Configured Thresholds */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-gray-600" />
                    {t('admin.thresholds.configuredThresholds')}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('admin.thresholds.table.countryZone')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('admin.thresholds.table.threshold')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('admin.thresholds.settingsTable.period')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('admin.thresholds.settingsTable.type')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('admin.thresholds.settingsTable.consequence')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {t('admin.thresholds.settingsTable.blocking')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {THRESHOLD_CONFIGS.map(config => (
                        <tr key={config.countryCode}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-xl mr-2">{config.flag}</span>
                              <span className="text-sm font-medium text-gray-900">{config.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {config.thresholdAmount === 0
                              ? t('admin.thresholds.firstSale')
                              : formatThresholdCurrency(config.thresholdAmount, config.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {config.periodType === 'CALENDAR_YEAR'
                              ? t('admin.thresholds.periodTypes.calendarYear')
                              : config.periodType === 'ROLLING_12M'
                              ? t('admin.thresholds.periodTypes.rolling12m')
                              : t('admin.thresholds.periodTypes.quarter')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {config.b2cOnly ? t('admin.thresholds.b2cOnly') : t('admin.thresholds.b2cB2b')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {config.consequence}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {config.enableBlocking ? (
                              <span className="text-red-600">{t('admin.common.yes')}</span>
                            ) : (
                              <span className="text-gray-400">{t('admin.common.no')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">{t('admin.thresholds.adminActions')}</h3>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={handleInitialize}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    {t('admin.thresholds.initializeThresholds')}
                  </button>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {t('admin.thresholds.recalculateThresholds')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Registration Modal */}
        {registrationModal && (
          <Modal
            isOpen={true}
            onClose={() => setRegistrationModal(null)}
            title={t('admin.thresholds.modal.registerTitle', { country: registrationModal.countryName })}
            size="medium"
          >
            <div className="space-y-4">
              <p className="text-gray-600">
                {t('admin.thresholds.modal.registerDesc', { country: registrationModal.countryName })}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.thresholds.modal.registrationNumber')}
                </label>
                <input
                  type="text"
                  value={registrationModal.registrationNumber}
                  onChange={e =>
                    setRegistrationModal({
                      ...registrationModal,
                      registrationNumber: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder={t('admin.thresholds.modal.registrationPlaceholder')}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setRegistrationModal(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  {t('admin.common.cancel')}
                </button>
                <button
                  onClick={handleMarkAsRegistered}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {t('admin.thresholds.modal.confirmRegistration')}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Tracking Details Modal */}
        {viewingTracking && (
          <Modal
            isOpen={true}
            onClose={() => setViewingTracking(null)}
            title={`${getCountryFlag(viewingTracking.countryCode)} ${viewingTracking.countryName}`}
            size="large"
          >
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center gap-4">
                {getStatusIcon(viewingTracking.status)}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  THRESHOLD_STATUS_COLORS[viewingTracking.status]
                }`}>
                  {THRESHOLD_STATUS_LABELS[viewingTracking.status]}
                </span>
                <span className="text-gray-500">
                  {t('admin.thresholds.modal.period')}: {viewingTracking.period}
                </span>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t('admin.thresholds.modal.progressToThreshold')}</span>
                  <span className="text-lg font-bold">
                    {viewingTracking.percentageUsed.toFixed(1)}%
                  </span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressBarColor(viewingTracking.percentageUsed, viewingTracking.status)}`}
                    style={{ width: `${Math.min(viewingTracking.percentageUsed, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                  <span>
                    {formatThresholdCurrency(viewingTracking.currentAmount, viewingTracking.thresholdCurrency)}
                  </span>
                  <span>
                    {formatThresholdCurrency(viewingTracking.thresholdAmount, viewingTracking.thresholdCurrency)}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">{t('admin.thresholds.modal.transactions')}</p>
                  <p className="text-xl font-bold">{viewingTracking.transactionCount}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">B2C</p>
                  <p className="text-xl font-bold">{viewingTracking.b2cCount}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">B2B</p>
                  <p className="text-xl font-bold">{viewingTracking.b2bCount}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">{t('admin.thresholds.modal.amountEur')}</p>
                  <p className="text-xl font-bold">{formatCurrency(viewingTracking.currentAmountEUR)}</p>
                </div>
              </div>

              {/* Alerts Status */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">{t('admin.thresholds.modal.alertsSent')}</h4>
                <div className="flex gap-4">
                  <div className={`flex items-center gap-2 ${viewingTracking.alertsSent.alert70 ? 'text-yellow-600' : 'text-gray-400'}`}>
                    {viewingTracking.alertsSent.alert70 ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    70%
                  </div>
                  <div className={`flex items-center gap-2 ${viewingTracking.alertsSent.alert90 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {viewingTracking.alertsSent.alert90 ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    90%
                  </div>
                  <div className={`flex items-center gap-2 ${viewingTracking.alertsSent.alert100 ? 'text-red-600' : 'text-gray-400'}`}>
                    {viewingTracking.alertsSent.alert100 ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    100%
                  </div>
                </div>
              </div>

              {/* Registration Status */}
              {viewingTracking.isRegistered && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">{t('admin.thresholds.modal.registeredForVat')}</span>
                  </div>
                  {viewingTracking.registrationNumber && (
                    <p className="text-sm text-blue-600 mt-1">
                      {t('admin.thresholds.modal.number')}: {viewingTracking.registrationNumber}
                    </p>
                  )}
                  {viewingTracking.registrationDate && (
                    <p className="text-sm text-blue-600">
                      {t('admin.thresholds.modal.date')}: {formatDate(viewingTracking.registrationDate)}
                    </p>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div className="text-sm text-gray-500 border-t pt-4">
                <p>{t('admin.thresholds.modal.lastTransaction')}: {formatDate(viewingTracking.lastTransactionAt)}</p>
                <p>{t('admin.thresholds.modal.lastUpdate')}: {formatDate(viewingTracking.updatedAt)}</p>
              </div>
            </div>
          </Modal>
        )}

        {/* Acknowledge Alert Modal */}
        {viewingAlert && (
          <Modal
            isOpen={true}
            onClose={() => {
              setViewingAlert(null);
              setAcknowledgeNotes('');
            }}
            title={t('admin.thresholds.modal.acknowledgeAlert')}
            size="medium"
          >
            <div className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{getCountryFlag(viewingAlert.countryCode)}</span>
                  <span className="font-medium">
                    {THRESHOLD_CONFIGS.find(c => c.countryCode === viewingAlert.countryCode)?.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    viewingAlert.alertType === 'EXCEEDED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {viewingAlert.alertType.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {t('admin.thresholds.thresholdReached', { percent: viewingAlert.percentageAtAlert.toFixed(1) })}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.thresholds.modal.notesOptional')}
                </label>
                <textarea
                  value={acknowledgeNotes}
                  onChange={e => setAcknowledgeNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder={t('admin.thresholds.modal.notesPlaceholder')}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setViewingAlert(null);
                    setAcknowledgeNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  {t('admin.common.cancel')}
                </button>
                <button
                  onClick={handleAcknowledgeAlert}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {t('admin.thresholds.acknowledge')}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Confirmation Modal */}
        {confirmModal && (
          <Modal
            isOpen={confirmModal.isOpen}
            onClose={() => setConfirmModal(null)}
            title={confirmModal.title}
            size="medium"
          >
            <div className="space-y-4">
              <p className="text-gray-600">{confirmModal.message}</p>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  {t('admin.common.cancel')}
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {t('admin.thresholds.confirm')}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Error Modal */}
        {errorModal && (
          <Modal
            isOpen={!!errorModal}
            onClose={() => setErrorModal(null)}
            title={t('admin.common.error')}
            size="medium"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-sm text-gray-700">{errorModal}</p>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setErrorModal(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  {t('admin.common.close')}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AdminLayout>
    </ErrorBoundary>
  );
}
