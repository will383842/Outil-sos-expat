/**
 * AdminBloggersResources — Legacy page, now delegates to unified AdminMarketingResources
 * with blogger role pre-filter.
 */

import AdminMarketingResources from '../marketing/AdminMarketingResources';

const AdminBloggersResources = () => (
  <AdminMarketingResources initialRole="blogger" />
);

export default AdminBloggersResources;
