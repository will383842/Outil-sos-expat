/**
 * PartnerClicks - Click statistics with period selector and charts
 */

import React, { useState, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { usePartner } from '@/hooks/usePartner';
import { PartnerDashboardLayout, PartnerClicksChart, PartnerStatsCard } from '@/components/Partner';
import { MousePointerClick, Phone, Percent, Loader2 } from 'lucide-react';

type Period = '30d' | '6m' | '12m';

const PartnerClicks: React.FC = () => {
  const intl = useIntl();
  const { dashboardData, partner, isLoading } = usePartner();
  const [period, setPeriod] = useState<Period>('30d');

  // Filter click data based on period
  const clickData = useMemo(() => {
    if (!dashboardData?.recentClicks) return [];

    const now = new Date();
    let cutoff: Date;

    switch (period) {
      case '30d':
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '6m':
        cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '12m':
        cutoff = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        break;
    }

    return dashboardData.recentClicks.filter((click) => {
      const clickDate = new Date(click.date);
      return clickDate >= cutoff;
    });
  }, [dashboardData?.recentClicks, period]);

  // Compute stats from click data
  const stats = useMemo(() => {
    const totalClicks = clickData.reduce((sum, d) => sum + d.count, 0);
    const totalCalls = partner?.currentMonthStats?.calls || 0;
    const conversionRate = totalClicks > 0 ? ((totalCalls / totalClicks) * 100).toFixed(1) : '0.0';

    return {
      totalClicks,
      totalCalls,
      conversionRate,
    };
  }, [clickData, partner]);

  const periods: { value: Period; label: string }[] = [
    { value: '30d', label: intl.formatMessage({ id: 'partner.clicks.period.30d', defaultMessage: '30 jours' }) },
    { value: '6m', label: intl.formatMessage({ id: 'partner.clicks.period.6m', defaultMessage: '6 mois' }) },
    { value: '12m', label: intl.formatMessage({ id: 'partner.clicks.period.12m', defaultMessage: '12 mois' }) },
  ];

  if (isLoading) {
    return (
      <PartnerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </PartnerDashboardLayout>
    );
  }

  return (
    <PartnerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl dark:text-white font-bold">
              <FormattedMessage id="partner.clicks.title" defaultMessage="Statistiques" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="partner.clicks.subtitle" defaultMessage="Suivi de vos clics et conversions" />
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex gap-1 bg-gray-100 dark:bg-white/10 rounded-xl p-1">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-2 min-h-[48px] rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                  period === p.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PartnerStatsCard
            icon={<MousePointerClick className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            label={<FormattedMessage id="partner.clicks.totalClicks" defaultMessage="Total clics" />}
            value={partner?.totalClicks || 0}
            subtitle={
              <FormattedMessage
                id="partner.clicks.periodClicks"
                defaultMessage="{count} sur la p\u00e9riode"
                values={{ count: stats.totalClicks }}
              />
            }
          />
          <PartnerStatsCard
            icon={<Phone className="w-5 h-5 text-green-600 dark:text-green-400" />}
            label={<FormattedMessage id="partner.clicks.conversions" defaultMessage="Conversions" />}
            value={partner?.totalCalls || 0}
            subtitle={
              <FormattedMessage
                id="partner.clicks.totalCalls"
                defaultMessage="{count} appels totaux"
                values={{ count: partner?.totalCalls || 0 }}
              />
            }
          />
          <PartnerStatsCard
            icon={<Percent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            label={<FormattedMessage id="partner.clicks.conversionRate" defaultMessage="Taux de conversion" />}
            value={`${stats.conversionRate}%`}
            subtitle={
              <FormattedMessage
                id="partner.clicks.global"
                defaultMessage="Global: {rate}%"
                values={{ rate: partner?.conversionRate?.toFixed(1) || '0.0' }}
              />
            }
          />
        </div>

        {/* Clicks Chart */}
        <PartnerClicksChart
          data={clickData}
          title={
            <FormattedMessage
              id="partner.clicks.chartTitle"
              defaultMessage="Clics ({period})"
              values={{ period: periods.find((p) => p.value === period)?.label || '' }}
            />
          }
        />

        {/* Monthly Breakdown */}
        {dashboardData?.monthlyStats && dashboardData.monthlyStats.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border dark:border-gray-700">
            <h3 className="text-lg dark:text-white font-semibold mb-4">
              <FormattedMessage id="partner.clicks.monthlyBreakdown" defaultMessage="D\u00e9tail mensuel" />
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">
                      <FormattedMessage id="partner.clicks.table.month" defaultMessage="Mois" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">
                      <FormattedMessage id="partner.clicks.table.clicks" defaultMessage="Clics" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">
                      <FormattedMessage id="partner.clicks.table.calls" defaultMessage="Appels" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">
                      <FormattedMessage id="partner.clicks.table.rate" defaultMessage="Taux" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">
                      <FormattedMessage id="partner.clicks.table.earnings" defaultMessage="Gains" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {dashboardData.monthlyStats.map((stat) => (
                    <tr key={stat.month} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm dark:text-white font-medium">{stat.month}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{stat.clicks}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{stat.calls}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                        {stat.clicks > 0 ? ((stat.calls / stat.clicks) * 100).toFixed(1) : '0.0'}%
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 font-medium text-right">
                        ${(stat.earnings / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PartnerDashboardLayout>
  );
};

export default PartnerClicks;
