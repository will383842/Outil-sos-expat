/**
 * AdminChatterConfig - System settings for Chatter program
 * Commission settings → /admin/commissions?tab=chatter
 */

import React from 'react';
import AdminRoleSystemConfig from '../Commissions/AdminRoleSystemConfig';
import type { RoleDefinition } from '../Commissions/AdminRoleSystemConfig';
import { Calendar } from 'lucide-react';

// Quiz settings — Chatter-specific extra fields
const ChatterExtras: React.FC<{ config?: Record<string, any>; onChange?: (f: string, v: any) => void; ui?: any }> = ({ config = {}, onChange = () => {}, ui }) => (
  <div>
    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
      <Calendar className="w-5 h-5 text-green-500" /> Paramètres du quiz
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Score de réussite (%)</label>
        <input type="number" value={config.quizPassingScore ?? 85}
          onChange={(e) => onChange('quizPassingScore', parseInt(e.target.value))}
          className={ui?.input || ''} min={0} max={100} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Délai nouvel essai (heures)</label>
        <input type="number" value={config.quizRetryDelayHours ?? 24}
          onChange={(e) => onChange('quizRetryDelayHours', parseInt(e.target.value))}
          className={ui?.input || ''} min={0} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de questions</label>
        <input type="number" value={config.quizQuestionsCount ?? 5}
          onChange={(e) => onChange('quizQuestionsCount', parseInt(e.target.value))}
          className={ui?.input || ''} min={1} />
      </div>
    </div>
  </div>
);

const CHATTER_ROLE: RoleDefinition = {
  id: 'chatter',
  title: 'Configuration Chatter',
  subtitle: 'Paramètres système du programme chatter',
  firestoreCollection: 'chatter_config',
  updateCallable: 'adminUpdateChatterConfig',
  commissionHubTab: 'chatter',
  visibilityField: 'isChatterListingPageVisible',
  visibilityLabel: '/nos-chatters',
  visibilityUrl: '/nos-chatters',
  systemToggles: [
    { field: 'isSystemActive', label: 'Système actif' },
    { field: 'newRegistrationsEnabled', label: 'Inscriptions ouvertes' },
    { field: 'withdrawalsEnabled', label: 'Retraits activés' },
    { field: 'trainingEnabled', label: 'Formation visible' },
  ],
  extraFields: <ChatterExtras />,
};

const AdminChatterConfig: React.FC = () => <AdminRoleSystemConfig role={CHATTER_ROLE} />;

export default AdminChatterConfig;
