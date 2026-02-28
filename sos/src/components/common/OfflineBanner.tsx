import React from 'react';
import { WifiOff } from 'lucide-react';
import { useIntl } from 'react-intl';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Global offline banner - shows when the user loses internet connection.
 * Place this in the root layout so it appears on all pages.
 */
export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const intl = useIntl();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 shadow-lg">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      {intl.formatMessage({
        id: 'common.offline',
        defaultMessage: 'You are offline. Some features may not work.',
      })}
    </div>
  );
};
