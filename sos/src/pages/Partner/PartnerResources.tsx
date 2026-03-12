/**
 * PartnerResources - Resources page for partners
 *
 * Uses the unified AffiliateResources component backed by Laravel API.
 */

import React from 'react';
import PartnerDashboardLayout from '@/components/Partner/Layout/PartnerDashboardLayout';
import AffiliateResources from '@/components/affiliate/AffiliateResources';

const PartnerResources: React.FC = () => {
  return (
    <PartnerDashboardLayout>
      <AffiliateResources role="partner" />
    </PartnerDashboardLayout>
  );
};

export default PartnerResources;
