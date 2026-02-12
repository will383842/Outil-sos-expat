/**
 * BloggerTelegramOnboarding - Page d'onboarding Telegram pour blogueurs
 * Utilise le composant générique TelegramOnboarding
 */

import React from 'react';
import TelegramOnboarding from '../../components/Telegram/TelegramOnboarding';

const BloggerTelegramOnboarding: React.FC = () => {
  return (
    <TelegramOnboarding
      role="blogger"
      dashboardPath="/blogger/dashboard"
      skipPath="/blogger/dashboard"
      title="📝 Liez votre compte Telegram"
      subtitle="Notifications en temps réel et retraits sécurisés pour vos articles"
    />
  );
};

export default BloggerTelegramOnboarding;
