/**
 * ChatterResources - Resources page for chatters
 *
 * Now uses the unified AffiliateResources component backed by Laravel API.
 */

import React from 'react';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';
import AffiliateResources from '@/components/affiliate/AffiliateResources';

const ChatterResources: React.FC = () => {
  return (
    <ChatterDashboardLayout activeKey="resources">
      <AffiliateResources role="chatter" />
    </ChatterDashboardLayout>
  );
};

export default ChatterResources;
