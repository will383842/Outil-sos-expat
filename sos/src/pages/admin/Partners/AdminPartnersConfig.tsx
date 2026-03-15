/**
 * AdminPartnersConfig - System settings for Partner program
 * Commission settings → /admin/commissions?tab=partenaire
 */

import React from 'react';
import AdminRoleSystemConfig from '../Commissions/AdminRoleSystemConfig';
import type { RoleDefinition } from '../Commissions/AdminRoleSystemConfig';

const PARTNER_ROLE: RoleDefinition = {
  id: 'partner',
  title: 'Configuration Partenaires',
  subtitle: 'Paramètres système du programme partenaire',
  firestoreCollection: 'partner_config',
  updateCallable: 'adminUpdatePartnerConfig',
  commissionHubTab: 'partenaire',
  visibilityField: 'isPartnerListingPageVisible',
  visibilityLabel: '/nos-partenaires',
  visibilityUrl: '/nos-partenaires',
  systemToggles: [
    { field: 'isSystemActive', label: 'Système actif' },
    { field: 'withdrawalsEnabled', label: 'Retraits activés' },
    { field: 'isPartnerFooterLinkVisible', label: 'Lien footer visible' },
  ],
};

const AdminPartnersConfig: React.FC = () => <AdminRoleSystemConfig role={PARTNER_ROLE} />;

export default AdminPartnersConfig;
