/**
 * Calls Chart Component
 * Stacked bar chart showing calls received vs missed
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { ProviderMonthlyStats } from '../../types';

interface CallsChartProps {
  stats: ProviderMonthlyStats[];
}

export default function CallsChart({ stats }: CallsChartProps) {
  const { t } = useTranslation();
  // Prepare data - sort by total calls descending
  const data = stats
    .map((s) => ({
      name: s.providerName.split(' ')[0],
      fullName: s.providerName,
      answered: s.callsAnswered,
      missed: s.callsMissed,
      total: s.callsReceived,
    }))
    .sort((a, b) => b.total - a.total);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">{t('calls_chart.title')}</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">{t('common.no_data')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{t('calls_chart.per_provider')}</h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => [
                value,
                name === 'answered' ? t('calls_chart.answered') : t('calls_chart.missed'),
              ]}
              labelFormatter={(label) =>
                data.find((d) => d.name === label)?.fullName || label
              }
            />
            <Legend
              formatter={(value) =>
                value === 'answered' ? t('calls_chart.answered') : t('calls_chart.missed')
              }
            />
            <Bar
              dataKey="answered"
              stackId="calls"
              fill="#22c55e"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="missed"
              stackId="calls"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-900">
            {data.reduce((sum, d) => sum + d.total, 0)}
          </p>
          <p className="text-xs text-gray-500">{t('calls_chart.total')}</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-green-600">
            {data.reduce((sum, d) => sum + d.answered, 0)}
          </p>
          <p className="text-xs text-gray-500">{t('calls_chart.answered')}</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-red-600">
            {data.reduce((sum, d) => sum + d.missed, 0)}
          </p>
          <p className="text-xs text-gray-500">{t('calls_chart.missed')}</p>
        </div>
      </div>
    </div>
  );
}
