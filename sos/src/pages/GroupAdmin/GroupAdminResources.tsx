/**
 * GroupAdminResources - Resources page for group admins
 *
 * Now uses the unified AffiliateResources component backed by Laravel API.
 */

import React from 'react';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import AffiliateResources from '@/components/affiliate/AffiliateResources';

const GroupAdminResources: React.FC = () => {
  return (
    <GroupAdminDashboardLayout>
      <AffiliateResources role="group_admin" />
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminResources;
