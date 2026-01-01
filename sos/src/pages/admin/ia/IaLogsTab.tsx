/**
 * IaLogsTab - Logs d'utilisation IA
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminTranslations, useIaAdminTranslations } from '../../../utils/adminTranslations';
import { useApp } from '../../../contexts/AppContext';
import { getDateLocale } from '../../../utils/formatters';
import {
  Activity,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { cn } from '../../../utils/cn';
import { AiUsageLog } from './types';

export const IaLogsTab: React.FC = () => {
  const adminT = useAdminTranslations();
  const iaT = useIaAdminTranslations();
  const { language } = useApp();

  const [logs, setLogs] = useState<AiUsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'custom'>('7days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [logsDateRange, setLogsDateRange] = useState<{ start: Date; end: Date }>(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  });

  const loadLogs = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const logsQuery = query(
        collection(db, 'ai_usage_logs'),
        where('createdAt', '>=', Timestamp.fromDate(start)),
        where('createdAt', '<=', Timestamp.fromDate(end)),
        orderBy('createdAt', 'desc'),
        limit(500)
      );

      const snapshot = await getDocs(logsQuery);
      const newLogs: AiUsageLog[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || '',
          prestataireId: data.prestataireId || '',
          provider: data.provider || 'unknown',
          model: data.model || '',
          promptTokens: data.promptTokens || 0,
          completionTokens: data.completionTokens || 0,
          totalTokens: data.totalTokens || 0,
          costUsd: data.costUsd || 0,
          feature: data.feature || '',
          success: data.success ?? true,
          errorMessage: data.errorMessage,
          responseTimeMs: data.responseTimeMs || 0,
          createdAt: data.createdAt?.toDate() || new Date()
        };
      });

      setLogs(newLogs);
    } catch (err) {
      console.error('Error loading AI logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs(logsDateRange.start, logsDateRange.end);
  }, []);

  const handleDateRangeChange = (range: 'today' | '7days' | '30days' | 'custom') => {
    setDateRange(range);
    const now = new Date();
    let start: Date;
    const end = new Date(now.setHours(23, 59, 59, 999));

    switch (range) {
      case 'today':
        start = new Date();
        start.setHours(0, 0, 0, 0);
        break;
      case '7days':
        start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case '30days':
        start = new Date();
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        return;
    }

    setLogsDateRange({ start, end });
    loadLogs(start, end);
  };

  const handleCustomDateChange = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      setLogsDateRange({ start, end });
      loadLogs(start, end);
    }
  };

  // Calculate summary stats
  const stats = {
    total: logs.length,
    success: logs.filter(l => l.success).length,
    failed: logs.filter(l => !l.success).length,
    avgResponseTime: logs.length > 0
      ? Math.round(logs.reduce((acc, l) => acc + l.responseTimeMs, 0) / logs.length)
      : 0,
    totalCost: logs.reduce((acc, l) => acc + l.costUsd, 0),
    byProvider: logs.reduce((acc, l) => {
      acc[l.provider] = (acc[l.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User ID', 'Provider', 'Model', 'Tokens', 'Cost ($)', 'Response Time (ms)', 'Success', 'Error'];
    const rows = logs.map(log => [
      log.createdAt.toISOString(),
      log.userId,
      log.provider,
      log.model,
      log.totalTokens,
      log.costUsd.toFixed(4),
      log.responseTimeMs,
      log.success ? 'Yes' : 'No',
      log.errorMessage || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Logs d'utilisation IA
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadLogs(logsDateRange.start, logsDateRange.end)}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={exportToCSV}
            disabled={logs.length === 0}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['today', '7days', '30days'] as const).map((range) => (
            <button
              key={range}
              onClick={() => handleDateRangeChange(range)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                dateRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              {range === 'today' && iaT.today}
              {range === '7days' && iaT.last7Days}
              {range === '30days' && iaT.last30Days}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleCustomDateChange}
            disabled={!startDate || !endDate}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {iaT.apply}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">{iaT.totalCalls}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">{stats.success}</div>
          <div className="text-xs text-gray-500">{iaT.successfulCalls}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-xs text-gray-500">{iaT.failedCalls}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{stats.avgResponseTime}ms</div>
          <div className="text-xs text-gray-500">{iaT.avgResponseTime}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-amber-600">${stats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-500">{iaT.totalCost}</div>
        </div>
      </div>

      {/* Provider Distribution */}
      {Object.keys(stats.byProvider).length > 0 && (
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm text-gray-500">{iaT.byProvider}:</span>
          {Object.entries(stats.byProvider).map(([provider, count]) => (
            <span key={provider} className="px-2 py-1 bg-gray-100 rounded text-sm">
              {provider}: <strong>{count}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tokens</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Temps</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  {adminT.loading}
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  {iaT.noLogsFound}
                </td>
              </tr>
            ) : (
              logs.slice(0, 100).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600">
                    {log.createdAt.toLocaleDateString(getDateLocale(language))} {log.createdAt.toLocaleTimeString(getDateLocale(language), { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2 text-gray-900 font-mono text-xs">
                    {log.userId.slice(0, 8)}...
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      log.provider === 'claude' && 'bg-purple-100 text-purple-700',
                      log.provider === 'gpt4o' && 'bg-green-100 text-green-700',
                      log.provider === 'perplexity' && 'bg-blue-100 text-blue-700'
                    )}>
                      {log.provider}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{log.totalTokens}</td>
                  <td className="px-3 py-2 text-gray-600">{log.responseTimeMs}ms</td>
                  <td className="px-3 py-2">
                    {log.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="flex items-center gap-1">
                        <XCircle className="w-4 h-4 text-red-500" />
                        {log.errorMessage && (
                          <span className="text-xs text-red-600 truncate max-w-[100px]" title={log.errorMessage}>
                            {log.errorMessage}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {logs.length > 100 && (
          <div className="text-center py-2 text-sm text-gray-500">
            Affichage limité aux 100 premiers résultats ({logs.length} au total)
          </div>
        )}
      </div>
    </div>
  );
};

export default IaLogsTab;
