/**
 * AdminBloggersArticles — Legacy page, now delegates to unified AdminMarketingResources
 * with blogger role pre-filter (articles are resources of type "article").
 */

import AdminMarketingResources from '../marketing/AdminMarketingResources';

const AdminBloggersArticles = () => (
  <AdminMarketingResources initialRole="blogger" />
);

export default AdminBloggersArticles;
