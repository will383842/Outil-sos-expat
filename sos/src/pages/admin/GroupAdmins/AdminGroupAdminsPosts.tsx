/**
 * AdminGroupAdminsPosts — Legacy page, now delegates to unified AdminMarketingResources
 * with group_admin role pre-filter (posts are resources of category "pinned_posts").
 */

import AdminMarketingResources from '../marketing/AdminMarketingResources';

const AdminGroupAdminsPosts = () => (
  <AdminMarketingResources initialRole="group_admin" />
);

export default AdminGroupAdminsPosts;
