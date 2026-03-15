/**
 * AdminClientsConfig - System settings for Client affiliate program
 * Commission settings → /admin/commissions?tab=client
 */

import React from 'react';
import AdminRoleSystemConfig from '../Commissions/AdminRoleSystemConfig';
import type { RoleDefinition } from '../Commissions/AdminRoleSystemConfig';

const CLIENT_ROLE: RoleDefinition = {
  id: 'client',
  title: 'Configuration Clients (Affiliation)',
  subtitle: 'Paramètres système du programme d\'affiliation clients',
  firestoreCollection: 'client_config',
  updateCallable: 'adminUpdateClientConfig',
  commissionHubTab: 'client',
  visibilityField: undefined,
  visibilityLabel: undefined,
  visibilityUrl: undefined,
  systemToggles: [
    { field: 'isSystemActive', label: 'Système actif' },
    { field: 'newRegistrationsEnabled', label: 'Inscriptions ouvertes' },
    { field: 'withdrawalsEnabled', label: 'Retraits activés' },
  ],
};

const AdminClientsConfig: React.FC = () => <AdminRoleSystemConfig role={CLIENT_ROLE} />;

export default AdminClientsConfig;
