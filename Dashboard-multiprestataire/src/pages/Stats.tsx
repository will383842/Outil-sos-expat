/**
 * Stats Page
 * Detailed statistics with charts and CSV export
 */
import { Calendar, Download } from 'lucide-react';
import { useProviderStats } from '../hooks';
import { ComplianceChart, HoursChart, CallsChart } from '../components/stats';
import { Button, LoadingSpinner, StatusBadge } from '../components/ui';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';
import type { ProviderMonthlyStats } from '../types';

/**
 * Generate CSV content from stats data
 */
function generateCSV(stats: ProviderMonthlyStats[]): string {
  const headers = [
    i18n.t('stats.csv_provider'),
    i18n.t('stats.csv_email'),
    i18n.t('stats.csv_hours_online'),
    i18n.t('stats.csv_hours_target'),
    i18n.t('stats.csv_hours_compliant'),
    i18n.t('stats.csv_calls_received'),
    i18n.t('stats.csv_calls_missed'),
    i18n.t('stats.csv_missed_target'),
    i18n.t('stats.csv_missed_compliant'),
    i18n.t('stats.csv_compliant_global'),
  ];

  const rows = stats.map((s) => [
    `"${s.providerName}"`,
    `"${s.providerEmail}"`,
    String(Math.round(s.hoursOnline * 10) / 10),
    String(s.hoursOnlineTarget),
    s.hoursCompliant ? i18n.t('common.yes') : i18n.t('common.no'),
    String(s.callsReceived),
    String(s.callsMissed),
    String(s.missedCallsTarget),
    s.missedCallsCompliant ? i18n.t('common.yes') : i18n.t('common.no'),
    s.isCompliant ? i18n.t('common.yes') : i18n.t('common.no'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  return '\uFEFF' + csvContent; // BOM for Excel UTF-8
}

/**
 * Download CSV file
 */
function downloadCSV(stats: ProviderMonthlyStats[], month: string) {
  if (stats.length === 0) {
    toast.error(i18n.t('stats.csv_no_data'));
    return;
  }

  const csv = generateCSV(stats);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stats-${month}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(i18n.t('stats.csv_downloaded'));
}

export default function Stats() {
  const { t } = useTranslation();
  const {
    stats,
    agencyStats,
    isLoading,
    error,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
  } = useProviderStats();

  // Format month for display
  const formatMonth = (monthStr: string) => {
    try {
      const date = parse(monthStr, 'yyyy-MM', new Date());
      return format(date, 'MMMM yyyy', { locale: fr });
    } catch {
      return monthStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-1">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        {/* Month selector */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white capitalize"
          >
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonth(month)}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="outline"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={() => downloadCSV(stats, selectedMonth)}
          disabled={stats.length === 0}
        >
          {t('stats.export_csv')}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : stats.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('stats.no_data_title', { month: formatMonth(selectedMonth) })}
          </h3>
          <p className="text-gray-500">
            {t('stats.no_data_hint')}
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {agencyStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">{t('stats.providers')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {agencyStats.totalProviders}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">{t('stats.total_hours')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(agencyStats.totalHoursOnline)}h
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">{t('stats.calls_received')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {agencyStats.totalCallsReceived}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500">{t('stats.avg_duration')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(agencyStats.avgCallDuration / 60)}min
                </p>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {agencyStats && <ComplianceChart stats={agencyStats} />}
            <CallsChart stats={stats} />
          </div>

          <div className="mb-8">
            <HoursChart stats={stats} />
          </div>

          {/* Detailed table */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('stats.details_title')}
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('stats.th_provider')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('stats.th_hours')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('stats.th_calls')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('stats.th_missed')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('stats.th_compliance')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {s.providerName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {s.providerEmail}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            s.hoursCompliant
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {Math.round(s.hoursOnline * 10) / 10}h
                        </span>
                        <span className="text-gray-400 text-sm">
                          {' '}
                          / {s.hoursOnlineTarget}h
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {s.callsReceived}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={
                            s.missedCallsCompliant
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {s.callsMissed}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {' '}
                          / {s.missedCallsTarget} max
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={s.isCompliant ? 'compliant' : 'non-compliant'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
