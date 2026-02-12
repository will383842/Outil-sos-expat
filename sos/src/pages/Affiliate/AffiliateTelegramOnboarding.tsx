/**
 * AffiliateTelegramOnboarding - Page d'onboarding Telegram pour affiliés
 * Utilisé par: client, lawyer, expat (tous les rôles qui utilisent /affiliate)
 * Utilise le composant générique TelegramOnboarding
 */

import React from 'react';
import TelegramOnboarding from '../../components/Telegram/TelegramOnboarding';

const AffiliateTelegramOnboarding: React.FC = () => {
  return (
    <TelegramOnboarding
      role="affiliate"
      dashboardPath="/affiliate"
      skipPath="/affiliate"
      title="🔒 Sécurisez vos retraits avec Telegram"
      subtitle="Vérification en 2 étapes + notifications en temps réel de vos commissions"
    />
  );
};

export default AffiliateTelegramOnboarding;
