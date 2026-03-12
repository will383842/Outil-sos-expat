/**
 * AdminBloggersGuide — Legacy page, now delegates to unified AdminMarketingResources
 * with blogger role pre-filter (guides are resources of type "template"/"text").
 */

import AdminMarketingResources from '../marketing/AdminMarketingResources';

const AdminBloggersGuide = () => (
  <AdminMarketingResources initialRole="blogger" />
);

export default AdminBloggersGuide;
