/**
 * InfluencerResources - Resources page for influencers
 *
 * Now uses the unified AffiliateResources component backed by Laravel API.
 */

import React from 'react';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import AffiliateResources from '@/components/affiliate/AffiliateResources';

const InfluencerResources: React.FC = () => {
  return (
    <InfluencerDashboardLayout>
      <AffiliateResources role="influencer" />
    </InfluencerDashboardLayout>
  );
};

export default InfluencerResources;
