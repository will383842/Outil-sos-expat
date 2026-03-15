/**
 * AdminBloggersConfig - System settings for Blogger program
 * Commission settings → /admin/commissions?tab=blogueur
 */

import React from 'react';
import AdminRoleSystemConfig from '../Commissions/AdminRoleSystemConfig';
import type { RoleDefinition } from '../Commissions/AdminRoleSystemConfig';

const BLOGGER_ROLE: RoleDefinition = {
  id: 'blogger',
  title: 'Configuration Blogueurs',
  subtitle: 'Paramètres système du programme blogueurs',
  firestoreCollection: 'blogger_config',
  updateCallable: 'adminUpdateBloggerConfig',
  commissionHubTab: 'blogueur',
  visibilityField: 'isBloggerListingPageVisible',
  visibilityLabel: '/nos-blogueurs',
  visibilityUrl: '/nos-blogueurs',
  systemToggles: [
    { field: 'isSystemActive', label: 'Système actif' },
    { field: 'newRegistrationsEnabled', label: 'Inscriptions ouvertes' },
    { field: 'withdrawalsEnabled', label: 'Retraits activés' },
  ],
};

const AdminBloggersConfig: React.FC = () => <AdminRoleSystemConfig role={BLOGGER_ROLE} />;

export default AdminBloggersConfig;
