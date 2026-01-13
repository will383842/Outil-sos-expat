// src/components/admin/RealtimeSuspendedBanner.tsx
// Bannière affichée quand le temps réel est suspendu pour économiser les coûts
// =============================================================================

import React from 'react';
import { useIntl } from 'react-intl';
import { WifiOff, RefreshCw, Zap } from 'lucide-react';

interface RealtimeSuspendedBannerProps {
  onResume: () => void;
  reason?: 'inactivity' | 'manual';
}

const RealtimeSuspendedBanner: React.FC<RealtimeSuspendedBannerProps> = ({
  onResume,
  reason = 'inactivity',
}) => {
  const intl = useIntl();
  const t = (id: string) => intl.formatMessage({ id });

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-100 rounded-full">
            <WifiOff className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">
              Temps réel en pause
            </p>
            <p className="text-xs text-amber-600">
              {reason === 'inactivity'
                ? t('admin.realtime.suspendedAuto')
                : t('admin.realtime.suspendedManual')}
            </p>
          </div>
        </div>
        <button
          onClick={onResume}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('admin.realtime.resume')}</span>
        </button>
      </div>
    </div>
  );
};

// Petit indicateur discret montrant le temps restant avant suspension
interface RealtimeCountdownProps {
  seconds: number;
  isActive: boolean;
}

export const RealtimeCountdown: React.FC<RealtimeCountdownProps> = ({
  seconds,
  isActive,
}) => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values);

  if (!isActive || seconds > 60) return null; // N'afficher que dans la dernière minute

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-500">
      <Zap className="w-3 h-3" />
      {t('admin.realtime.pauseIn', { seconds })}
    </div>
  );
};

export default RealtimeSuspendedBanner;
