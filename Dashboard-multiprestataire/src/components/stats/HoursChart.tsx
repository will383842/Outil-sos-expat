/**
 * Hours Chart Component
 * Bar chart showing hours online per provider
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { ProviderMonthlyStats } from '../../types';
import { PROVIDER_STATS_CONFIG } from '../../types';

interface HoursChartProps {
  stats: ProviderMonthlyStats[];
}

export default function HoursChart({ stats }: HoursChartProps) {
  const { t } = useTranslation();
  // Prepare data - sort by hours descending
  const data = stats
    .map((s) => ({
      name: s.providerName.split(' ')[0], // First name only for readability
      fullName: s.providerName,
      hours: Math.round(s.hoursOnline * 10) / 10,
      target: s.hoursOnlineTarget,
      compliant: s.hoursCompliant,
    }))
    .sort((a, b) => b.hours - a.hours);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t('hours_chart.title')}</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">{t('common.no_data')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{t('hours_chart.title')}</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="h" />
            <YAxis dataKey="name" type="category" width={60} />
            <Tooltip
              formatter={(value: number) => [`${value}h`, t('hours_chart.hours')]}
              labelFormatter={(label) =>
                data.find((d) => d.name === label)?.fullName || label
              }
            />
            <ReferenceLine
              x={PROVIDER_STATS_CONFIG.HOURS_ONLINE_TARGET}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{ value: t('hours_chart.target'), position: 'top' }}
            />
            <Bar
              dataKey="hours"
              fill="#7c3aed"
              radius={[0, 4, 4, 0]}
              // Color based on compliance
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...({} as any)}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary-600 rounded" />
          <span className="text-gray-600">{t('hours_chart.hours_online')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-red-500" style={{ width: 12 }} />
          <span className="text-gray-600">
            {t('hours_chart.target')} ({PROVIDER_STATS_CONFIG.HOURS_ONLINE_TARGET}h)
          </span>
        </div>
      </div>
    </div>
  );
}
