// src/components/admin/DomainAuthorityWidget.tsx
// Widget affichant l'autorite de domaine SEO avec historique (saisie manuelle)
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIntl } from 'react-intl';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Globe,
  AlertTriangle,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Types
interface DomainAuthorityResponse {
  domain: string;
  currentScore: number;
  previousScore: number;
  pageAuthority?: number;
  trend: number;
  lastUpdated: string | null;
  history: Array<{
    month: string;
    score: number;
    pageAuthority?: number;
    date: string;
  }>;
}

interface AddManualScoreResponse {
  success: boolean;
  message: string;
}

interface DomainAuthorityWidgetProps {
  compact?: boolean;
}

const DomainAuthorityWidget: React.FC<DomainAuthorityWidgetProps> = ({
  compact = false,
}) => {
  const intl = useIntl();
  const mountedRef = useRef(true);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DomainAuthorityResponse | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualScore, setManualScore] = useState('');
  const [manualPageAuthority, setManualPageAuthority] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Format month label for chart
  const formatMonthLabel = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString(intl.locale, { month: 'short', year: '2-digit' });
  };

  // Load data
  const loadData = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const getDomainAuthority = httpsCallable<void, DomainAuthorityResponse>(
        functions,
        'getDomainAuthority'
      );

      const result = await getDomainAuthority();

      if (!mountedRef.current) return;

      setData(result.data);
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('[DomainAuthorityWidget] Erreur chargement:', err);
      setError(intl.formatMessage({ id: 'admin.domainAuthority.error.loadFailed' }));
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [intl]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  // Handle manual score submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const score = parseInt(manualScore, 10);
    if (isNaN(score) || score < 0 || score > 100) {
      setError(intl.formatMessage({ id: 'admin.domainAuthority.error.invalidScore' }));
      return;
    }

    const pageAuthority = manualPageAuthority ? parseInt(manualPageAuthority, 10) : undefined;
    if (pageAuthority !== undefined && (isNaN(pageAuthority) || pageAuthority < 0 || pageAuthority > 100)) {
      setError(intl.formatMessage({ id: 'admin.domainAuthority.error.invalidPageAuthority' }));
      return;
    }

    setIsSubmittingManual(true);
    setError(null);

    try {
      const addManualDomainAuthority = httpsCallable<
        { score: number; pageAuthority?: number },
        AddManualScoreResponse
      >(functions, 'addManualDomainAuthority');

      await addManualDomainAuthority({ score, pageAuthority });

      if (!mountedRef.current) return;

      // Reset form and reload data
      setManualScore('');
      setManualPageAuthority('');
      setShowManualForm(false);
      await loadData();
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('[DomainAuthorityWidget] Erreur ajout:', err);
      setError(intl.formatMessage({ id: 'admin.domainAuthority.error.addFailed' }));
    } finally {
      if (mountedRef.current) {
        setIsSubmittingManual(false);
      }
    }
  };

  // Get trend icon
  const getTrendIcon = (trend: number) => {
    if (trend > 0) {
      return <TrendingUp size={16} className="text-green-600" />;
    } else if (trend < 0) {
      return <TrendingDown size={16} className="text-red-600" />;
    }
    return <Minus size={16} className="text-gray-400" />;
  };

  // Get trend color
  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 50) return 'text-green-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Format last updated
  const formatLastUpdated = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(intl.locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Prepare chart data
  const chartData = data?.history.map((h) => ({
    month: formatMonthLabel(h.month),
    score: h.score,
    pageAuthority: h.pageAuthority,
  })) || [];

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div className="h-6 w-48 bg-gray-200 rounded"></div>
          </div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-100">
              <Globe size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {intl.formatMessage({ id: 'admin.domainAuthority.title' })}
              </h3>
              <p className="text-xs text-gray-500">
                {data?.domain || 'sos-expat.com'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Last updated */}
            {data?.lastUpdated && (
              <div className="text-xs text-gray-500 hidden sm:block">
                {intl.formatMessage({ id: 'admin.domainAuthority.lastUpdated' })}:{' '}
                {formatLastUpdated(data.lastUpdated)}
              </div>
            )}

            {/* Manual entry button */}
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                showManualForm
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={intl.formatMessage({ id: 'admin.domainAuthority.addManual' })}
            >
              <Plus size={16} className="mr-1" />
              {intl.formatMessage({ id: 'admin.domainAuthority.addManual' })}
            </button>

            {/* Reload button */}
            <button
              onClick={loadData}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Recharger"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-100">
          <div className="flex items-center text-red-700 text-sm">
            <AlertTriangle size={16} className="mr-2" />
            {error}
          </div>
        </div>
      )}

      {/* Manual entry form */}
      {showManualForm && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <p className="text-xs text-blue-700 mb-3">
            Verifie le DA sur{' '}
            <a
              href="https://www.seoreviewtools.com/moz-da-checker/?url=sos-expat.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              SEO Review Tools
            </a>
            {' '}puis entre le score ici.
          </p>
          <form onSubmit={handleManualSubmit} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {intl.formatMessage({ id: 'admin.domainAuthority.form.score' })} *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={manualScore}
                onChange={(e) => setManualScore(e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {intl.formatMessage({ id: 'admin.domainAuthority.form.pageAuthority' })}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={manualPageAuthority}
                onChange={(e) => setManualPageAuthority(e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0-100"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingManual}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isSubmittingManual
                ? intl.formatMessage({ id: 'admin.domainAuthority.form.saving' })
                : intl.formatMessage({ id: 'admin.domainAuthority.form.add' })}
            </button>
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm"
            >
              {intl.formatMessage({ id: 'admin.domainAuthority.form.cancel' })}
            </button>
          </form>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {data && data.currentScore > 0 ? (
          <div className={compact ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
            {/* Score card */}
            <div className={compact ? '' : 'lg:col-span-1'}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {intl.formatMessage({ id: 'admin.domainAuthority.currentScore' })}
                </span>
                <a
                  href="https://www.seoreviewtools.com/moz-da-checker/?url=sos-expat.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  {intl.formatMessage({ id: 'admin.domainAuthority.checkOnline' })}
                  <ExternalLink size={12} className="ml-1" />
                </a>
              </div>

              <div className="flex items-baseline space-x-3">
                <span className={`text-5xl font-bold ${getScoreColor(data.currentScore)}`}>
                  {data.currentScore}
                </span>
                <div className="flex items-center">
                  {getTrendIcon(data.trend)}
                  <span className={`ml-1 text-sm font-medium ${getTrendColor(data.trend)}`}>
                    {data.trend > 0 ? '+' : ''}
                    {data.trend}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage(
                  { id: 'admin.domainAuthority.previousScore' },
                  { score: data.previousScore }
                )}
              </p>

              {data.pageAuthority !== undefined && data.pageAuthority > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-600">
                    {intl.formatMessage({ id: 'admin.domainAuthority.pageAuthority' })}
                  </span>
                  <div className="text-2xl font-semibold text-gray-700 mt-1">
                    {data.pageAuthority}
                  </div>
                </div>
              )}

              {/* Score scale */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      data.currentScore >= 50
                        ? 'bg-green-500'
                        : data.currentScore >= 30
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${data.currentScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Chart */}
            {!compact && chartData.length > 1 && (
              <div className="lg:col-span-2">
                <span className="text-sm font-medium text-gray-600 mb-3 block">
                  {intl.formatMessage({ id: 'admin.domainAuthority.evolution' })}
                </span>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number, name: string) => [
                          value,
                          name === 'score'
                            ? intl.formatMessage({ id: 'admin.domainAuthority.da' })
                            : intl.formatMessage({ id: 'admin.domainAuthority.pa' }),
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#6366f1"
                        fill="#e0e7ff"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#6366f1' }}
                        activeDot={{ r: 5, fill: '#6366f1' }}
                      />
                      {chartData.some((d) => d.pageAuthority !== undefined) && (
                        <Area
                          type="monotone"
                          dataKey="pageAuthority"
                          stroke="#10b981"
                          fill="#d1fae5"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#10b981' }}
                          activeDot={{ r: 5, fill: '#10b981' }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Globe size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="mb-2">{intl.formatMessage({ id: 'admin.domainAuthority.noData' })}</p>
            <p className="text-sm">
              Clique sur "<strong>+ Ajouter manuellement</strong>" pour entrer ton premier score DA.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Verifier le DA sur{' '}
            <a
              href="https://www.seoreviewtools.com/moz-da-checker/?url=sos-expat.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800"
            >
              SEO Review Tools
            </a>
            {' '}(gratuit)
          </span>
          <span>
            Saisie manuelle recommandee 1x/mois
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DomainAuthorityWidget);
