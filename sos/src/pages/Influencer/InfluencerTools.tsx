/**
 * InfluencerTools - Marketing tools page for influencers
 * Uses shared AffiliateToolsContent with InfluencerDashboardLayout
 */

import React from 'react';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import AffiliateToolsContent from '@/pages/Affiliate/AffiliateToolsContent';

const InfluencerTools: React.FC = () => {
  return (
    <InfluencerDashboardLayout>
      <AffiliateToolsContent />
    </InfluencerDashboardLayout>
  );
};

export default InfluencerTools;
