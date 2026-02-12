/**
 * InfluencerTelegramOnboarding - Page d'onboarding Telegram pour influenceurs
 * Utilise le composant générique TelegramOnboarding
 */

import React from 'react';
import TelegramOnboarding from '../../components/Telegram/TelegramOnboarding';

const InfluencerTelegramOnboarding: React.FC = () => {
  return (
    <TelegramOnboarding
      role="influencer"
      dashboardPath="/influencer/dashboard"
      skipPath="/influencer/dashboard"
      title="🚀 Connectez votre compte Telegram"
      subtitle="Recevez vos alertes de gains et gérez vos retraits facilement"
    />
  );
};

export default InfluencerTelegramOnboarding;
