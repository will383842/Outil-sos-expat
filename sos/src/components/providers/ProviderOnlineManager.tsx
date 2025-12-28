import React from 'react';
import { useAuth } from '../../contexts/useAuth';
import { useProviderActivityTracker } from '../../hooks/useProviderActivityTracker';
import { useProviderReminderSystem } from '../../hooks/useProviderReminderSystem';
import ReminderModal from '../../notificationsonline/ReminderModal';

interface ProviderOnlineManagerProps {
  children: React.ReactNode;
}

const ProviderOnlineManager: React.FC<ProviderOnlineManagerProps> = ({ children }) => {
  const { user } = useAuth();

  // Vérifier si l'utilisateur est un prestataire
  const isProvider = user?.type === 'lawyer' || user?.type === 'expat' || user?.role === 'lawyer' || user?.role === 'expat';
  const isOnline = user?.isOnline === true;
  const shouldTrack = Boolean(user && isProvider && isOnline);

  // Hook de tracking d'activité - toujours appelé mais désactivé si pas prestataire
  const { lastActivity } = useProviderActivityTracker({
    userId: user?.uid || '',
    isOnline: shouldTrack,
    isProvider: shouldTrack,
  });

  // Hook de gestion des rappels - toujours appelé mais désactivé si pas prestataire
  const {
    showModal,
    handleClose,
    handleGoOffline,
    handleDisableToday,
  } = useProviderReminderSystem({
    userId: user?.uid || '',
    isOnline: shouldTrack,
    isProvider: shouldTrack,
    lastActivity,
    preferredLanguage: user?.preferredLanguage || 'en',
  });

  return (
    <>
      {children}
      {shouldTrack && showModal && (
        <ReminderModal
          isOpen={showModal}
          onClose={handleClose}
          onGoOffline={handleGoOffline}
          onDisableReminderToday={handleDisableToday}
          langCode={user?.preferredLanguage || 'en'}
        />
      )}
    </>
  );
};

export default ProviderOnlineManager;