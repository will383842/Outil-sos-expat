/**
 * PartnerTelegramOnboarding - Page d'onboarding Telegram pour partenaires
 * Utilise le composant générique TelegramOnboarding
 */

import React from 'react';
import TelegramOnboarding from '../../components/Telegram/TelegramOnboarding';

const PartnerTelegramOnboarding: React.FC = () => {
  return (
    <TelegramOnboarding
      role="partner"
      dashboardPath="/partner/tableau-de-bord"
      skipPath="/partner/tableau-de-bord"
      title="🤝 Connectez votre Telegram"
      subtitle="Suivez vos revenus partenaire et confirmez vos retraits en toute sécurité"
    />
  );
};

export default PartnerTelegramOnboarding;
