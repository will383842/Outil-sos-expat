// src/pages/ExpatCall.tsx
import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useLocalizedRedirect } from '../hooks/useLocalizedRedirect';

/**
 * Cette page redirige automatiquement vers /sos-appel?type=expat
 * La redirection prend en compte la langue courante
 */
const ExpatCall: React.FC = () => {
  const intl = useIntl();
  const { redirectToSosCall } = useLocalizedRedirect();

  useEffect(() => {
    redirectToSosCall('expat');
  }, [redirectToSosCall]);

  // Affichage minimal pendant la redirection (quasi invisible)
  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gray-50"
      role="status"
      aria-live="polite"
      aria-label={intl.formatMessage({ id: 'redirect.loading' })}
    >
      <div className="text-center">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"
          aria-hidden="true"
        />
        <p className="text-gray-600">
          {intl.formatMessage({ id: 'redirect.redirecting' })}
        </p>
      </div>
    </div>
  );
};

export default ExpatCall;