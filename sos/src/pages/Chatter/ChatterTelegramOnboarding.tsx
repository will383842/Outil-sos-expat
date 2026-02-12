/**
 * ChatterTelegramOnboarding - Page d'onboarding Telegram pour chatters
 * Utilise le composant générique TelegramOnboarding
 * Migration: Version simplifiée utilisant le composant réutilisable
 */

import React from 'react';
import TelegramOnboarding from '../../components/Telegram/TelegramOnboarding';

const ChatterTelegramOnboarding: React.FC = () => {
  return (
    <TelegramOnboarding
      role="chatter"
      dashboardPath="/chatter/dashboard"
      skipPath="/chatter/dashboard"
      title="🎉 Dernière étape : Liez votre Telegram"
      subtitle="Recevez $50 de bonus + notifications de commissions + messages de motivation quotidiens"
    />
  );
};

export default ChatterTelegramOnboarding;
