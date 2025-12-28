import React from 'react';
import { useAuth } from '';
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

  // Si ce n'est pas un prestataire ou s'il est hors ligne, ne rien faire
  if (!user || !isProvider || !isOnline) {
    return <>{children}</>;
  }

  // Hook de tracking d'activité
  const { lastActivity } = useProviderActivityTracker({
    userId: user.uid,
    isOnline: true,
    isProvider: true,
  });

  // Hook de gestion des rappels
  const {
    showModal,
    handleClose,
    handleGoOffline,
    handleDisableToday,
  } = useProviderReminderSystem({
    userId: user.uid,
    isOnline: true,
    isProvider: true,
    lastActivity,
    preferredLanguage: user.preferredLanguage || 'en',
  });

  return (
    <>
      {children}
      {showModal && (
        <ReminderModal
          onClose={handleClose}
          onGoOffline={handleGoOffline}
          onDisableReminderToday={handleDisableToday}
          langCode={user.preferredLanguage || 'en'}
        />
      )}
    </>
  );
};

export default ProviderOnlineManager;
