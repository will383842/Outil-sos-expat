/**
 * InfluencerTelegramOnboarding - Page d'onboarding Telegram pour influenceurs
 * Utilise le composant générique TelegramOnboarding
 */

import React from 'react';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import TelegramOnboarding from '../../components/Telegram/TelegramOnboarding';

const InfluencerTelegramOnboarding: React.FC = () => {
  return (
    <InfluencerDashboardLayout>
      <TelegramOnboarding
        role="influencer"
        dashboardPath="/influencer/dashboard"
        skipPath="/influencer/dashboard"
        title="🚀 Connectez votre compte Telegram"
        subtitle="Recevez vos alertes de gains et gérez vos retraits facilement"
      />
    </InfluencerDashboardLayout>
  );
};

export default InfluencerTelegramOnboarding;
