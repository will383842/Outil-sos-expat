/**
 * AdminGroupAdminsResources — Legacy page, now delegates to unified AdminMarketingResources
 * with group_admin role pre-filter.
 */

import AdminMarketingResources from '../marketing/AdminMarketingResources';

const AdminGroupAdminsResources = () => (
  <AdminMarketingResources initialRole="group_admin" />
);

export default AdminGroupAdminsResources;
