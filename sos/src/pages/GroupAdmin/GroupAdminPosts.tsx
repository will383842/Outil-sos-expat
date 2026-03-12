/**
 * GroupAdminPosts - Ready-to-use Facebook posts page
 *
 * Migrated to unified AffiliateResources backed by Laravel API.
 * Previously used Firebase callables (getGroupAdminPosts, getGroupAdminProcessedPost).
 */

import React from 'react';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import AffiliateResources from '@/components/affiliate/AffiliateResources';

const GroupAdminPosts: React.FC = () => {
  return (
    <GroupAdminDashboardLayout>
      <AffiliateResources role="group_admin" />
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminPosts;
