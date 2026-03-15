/**
 * AdminGroupAdminsConfig - System settings for GroupAdmin program
 * Commission settings → /admin/commissions?tab=groupadmin
 */

import React from 'react';
import AdminRoleSystemConfig from '../Commissions/AdminRoleSystemConfig';
import type { RoleDefinition } from '../Commissions/AdminRoleSystemConfig';
import { Settings } from 'lucide-react';

// GroupAdmin-specific extra fields: payment mode + leaderboard
const GroupAdminExtras: React.FC<{ config?: Record<string, any>; onChange?: (f: string, v: any) => void; ui?: any }> = ({ config = {}, onChange = () => {}, ui }) => (
  <div>
    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
      <Settings className="w-5 h-5 text-gray-500" /> Autres paramètres
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode de paiement</label>
        <div className="flex gap-4 mt-2">
          {(['manual', 'automatic'] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="paymentMode" value={mode}
                checked={config.paymentMode === mode}
                onChange={() => onChange('paymentMode', mode)}
                className="w-4 h-4 text-red-500 focus:ring-red-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {mode === 'manual' ? 'Manuel' : 'Automatique'}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taille du classement</label>
        <input type="number" value={config.leaderboardSize ?? 10}
          onChange={(e) => onChange('leaderboardSize', parseInt(e.target.value) || 0)}
          className={ui?.input || ''} min={1} />
      </div>
    </div>
  </div>
);

const GROUPADMIN_ROLE: RoleDefinition = {
  id: 'groupAdmin',
  title: 'Configuration Admin Groupe',
  subtitle: 'Paramètres système du programme admin groupe',
  firestoreCollection: 'group_admin_config',
  updateCallable: 'adminUpdateGroupAdminConfig',
  commissionHubTab: 'groupadmin',
  visibilityField: 'isGroupAdminListingPageVisible',
  visibilityLabel: '/groupes-communaute',
  visibilityUrl: '/groupes-communaute',
  systemToggles: [
    { field: 'isSystemActive', label: 'Système actif' },
    { field: 'newRegistrationsEnabled', label: 'Inscriptions ouvertes' },
    { field: 'withdrawalsEnabled', label: 'Retraits activés' },
  ],
  extraFields: <GroupAdminExtras />,
};

const AdminGroupAdminsConfig: React.FC = () => <AdminRoleSystemConfig role={GROUPADMIN_ROLE} />;

export default AdminGroupAdminsConfig;
