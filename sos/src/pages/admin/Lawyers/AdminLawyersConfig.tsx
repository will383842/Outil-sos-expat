/**
 * AdminLawyersConfig - System settings for Lawyer affiliate program
 * Commission settings → /admin/commissions?tab=lawyer
 */

import React from 'react';
import AdminRoleSystemConfig from '../Commissions/AdminRoleSystemConfig';
import type { RoleDefinition } from '../Commissions/AdminRoleSystemConfig';

const LAWYER_ROLE: RoleDefinition = {
  id: 'lawyer',
  title: 'Configuration Avocats (Affiliation)',
  subtitle: 'Paramètres système du programme d\'affiliation avocats',
  firestoreCollection: 'lawyer_config',
  updateCallable: 'adminUpdateLawyerConfig',
  commissionHubTab: 'avocat',
  visibilityField: 'isLawyerListingPageVisible',
  visibilityLabel: '/nos-avocats',
  visibilityUrl: '/nos-avocats',
  systemToggles: [
    { field: 'isSystemActive', label: 'Système actif' },
    { field: 'newRegistrationsEnabled', label: 'Inscriptions ouvertes' },
    { field: 'withdrawalsEnabled', label: 'Retraits activés' },
  ],
};

const AdminLawyersConfig: React.FC = () => <AdminRoleSystemConfig role={LAWYER_ROLE} />;

export default AdminLawyersConfig;
