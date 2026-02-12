/**
 * GroupAdminTelegramOnboarding - Page d'onboarding Telegram pour admins de groupe
 * Utilise le composant générique TelegramOnboarding
 */

import React from 'react';
import TelegramOnboarding from '../../components/Telegram/TelegramOnboarding';

const GroupAdminTelegramOnboarding: React.FC = () => {
  return (
    <TelegramOnboarding
      role="groupAdmin"
      dashboardPath="/group-admin/dashboard"
      skipPath="/group-admin/dashboard"
      title="👥 Connectez votre Telegram"
      subtitle="Gérez votre communauté et vos gains depuis Telegram"
    />
  );
};

export default GroupAdminTelegramOnboarding;
