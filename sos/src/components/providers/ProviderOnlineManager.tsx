import React from 'react';
import { useAuth } from '../../contexts/useAuth';
import { useProviderActivityTracker } from '../../hooks/useProviderActivityTracker';
import { useProviderReminderSystem } from '../../hooks/useProviderReminderSystem';
import { useIncomingCallSound } from '../../hooks/useIncomingCallSound';
import ReminderModal from '../../notificationsonline/ReminderModal';
import IncomingCallNotification from './IncomingCallNotification';

interface ProviderOnlineManagerProps {
  children: React.ReactNode;
}

const ProviderOnlineManager: React.FC<ProviderOnlineManagerProps> = ({ children }) => {
  const { user } = useAuth();

  // Vérifier si l'utilisateur est un prestataire
  const isProvider = user?.type === 'lawyer' || user?.type === 'expat' || user?.role === 'lawyer' || user?.role === 'expat';
  const isOnline = user?.isOnline === true;
  const shouldTrack = Boolean(user && isProvider && isOnline);

  // 🔍 DEBUG: Log état du tracking
  console.log(`[ProviderOnlineManager] 🔍 user=${user?.uid}, type=${user?.type}, role=${user?.role}, isOnline=${user?.isOnline}, isProvider=${isProvider}, shouldTrack=${shouldTrack}`);

  // Hook de tracking d'activité - toujours appelé mais désactivé si pas prestataire
  const { lastActivity } = useProviderActivityTracker({
    userId: user?.uid || '',
    isOnline: shouldTrack,
    isProvider: shouldTrack,
  });

  // Hook de gestion des rappels - toujours appelé mais désactivé si pas prestataire
  const {
    showModal,
    reminderType,
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

  // Hook de gestion des appels entrants avec sonnerie
  const {
    hasIncomingCall,
    incomingCall,
    isSoundEnabled,
    isVibrationEnabled,
    toggleSound,
    toggleVibration,
  } = useIncomingCallSound({
    userId: user?.uid,
    isOnline: shouldTrack,
    isProvider,
    enabled: shouldTrack,
  });

  return (
    <>
      {children}

      {/* Modal de rappel d'inactivité */}
      {shouldTrack && showModal && !hasIncomingCall && (
        <ReminderModal
          isOpen={showModal}
          onClose={handleClose}
          onGoOffline={handleGoOffline}
          onDisableReminderToday={handleDisableToday}
          langCode={user?.preferredLanguage || 'en'}
          reminderType={reminderType}
        />
      )}

      {/* Notification d'appel entrant */}
      {shouldTrack && hasIncomingCall && incomingCall && (
        <IncomingCallNotification
          call={incomingCall}
          isSoundEnabled={isSoundEnabled}
          isVibrationEnabled={isVibrationEnabled}
          onToggleSound={toggleSound}
          onToggleVibration={toggleVibration}
        />
      )}
    </>
  );
};

export default ProviderOnlineManager;