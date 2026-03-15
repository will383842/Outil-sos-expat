/**
 * AdminInfluencersConfig - System settings for Influencer program
 * Commission settings → /admin/commissions?tab=influenceur
 */

import React from 'react';
import AdminRoleSystemConfig from '../Commissions/AdminRoleSystemConfig';
import type { RoleDefinition } from '../Commissions/AdminRoleSystemConfig';

const INFLUENCER_ROLE: RoleDefinition = {
  id: 'influencer',
  title: 'Configuration Influenceurs',
  subtitle: 'Paramètres système du programme influenceurs',
  firestoreCollection: 'influencer_config',
  updateCallable: 'adminUpdateInfluencerConfig',
  commissionHubTab: 'influenceur',
  visibilityField: 'isInfluencerListingPageVisible',
  visibilityLabel: '/nos-influenceurs',
  visibilityUrl: '/nos-influenceurs',
  systemToggles: [
    { field: 'isSystemActive', label: 'Système actif' },
    { field: 'newRegistrationsEnabled', label: 'Inscriptions ouvertes' },
    { field: 'withdrawalsEnabled', label: 'Retraits activés' },
    { field: 'trainingEnabled', label: 'Formation visible' },
  ],
};

const AdminInfluencersConfig: React.FC = () => <AdminRoleSystemConfig role={INFLUENCER_ROLE} />;

export default AdminInfluencersConfig;
