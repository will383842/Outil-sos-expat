/**
 * AdminInfluencersResources — Legacy page, now delegates to unified AdminMarketingResources
 * with influencer role pre-filter.
 */

import AdminMarketingResources from '../marketing/AdminMarketingResources';

const AdminInfluencersResources = () => (
  <AdminMarketingResources initialRole="influencer" />
);

export default AdminInfluencersResources;
