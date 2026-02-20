/**
 * GroupAdminTelegramOnboarding - Page d'onboarding Telegram pour admins de groupe
 * Utilise le composant générique TelegramOnboarding
 */

import React from 'react';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import TelegramOnboarding from '../../components/Telegram/TelegramOnboarding';

const GroupAdminTelegramOnboarding: React.FC = () => {
  return (
    <GroupAdminDashboardLayout>
      <TelegramOnboarding
        role="groupAdmin"
        dashboardPath="/group-admin/tableau-de-bord"
        skipPath="/group-admin/tableau-de-bord"
        title="👥 Connectez votre Telegram"
        subtitle="Gérez votre communauté et vos gains depuis Telegram"
      />
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminTelegramOnboarding;
