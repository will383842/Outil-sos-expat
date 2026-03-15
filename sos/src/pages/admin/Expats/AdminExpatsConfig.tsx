/**
 * AdminExpatsConfig - System settings for Expat affiliate program
 * Commission settings → /admin/commissions?tab=expat
 */

import React from 'react';
import AdminRoleSystemConfig from '../Commissions/AdminRoleSystemConfig';
import type { RoleDefinition } from '../Commissions/AdminRoleSystemConfig';

const EXPAT_ROLE: RoleDefinition = {
  id: 'expat',
  title: 'Configuration Expatriés Aidants (Affiliation)',
  subtitle: 'Paramètres système du programme d\'affiliation expatriés',
  firestoreCollection: 'expat_config',
  updateCallable: 'adminUpdateExpatConfig',
  commissionHubTab: 'expatrie',
  visibilityField: 'isExpatListingPageVisible',
  visibilityLabel: '/nos-expatries',
  visibilityUrl: '/nos-expatries',
  systemToggles: [
    { field: 'isSystemActive', label: 'Système actif' },
    { field: 'newRegistrationsEnabled', label: 'Inscriptions ouvertes' },
    { field: 'withdrawalsEnabled', label: 'Retraits activés' },
  ],
};

const AdminExpatsConfig: React.FC = () => <AdminRoleSystemConfig role={EXPAT_ROLE} />;

export default AdminExpatsConfig;
