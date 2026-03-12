/**
 * AdminChattersResources — Legacy page, now delegates to unified AdminMarketingResources
 * with chatter role pre-filter.
 */

import AdminMarketingResources from '../marketing/AdminMarketingResources';

const AdminChattersResources = () => (
  <AdminMarketingResources initialRole="chatter" />
);

export default AdminChattersResources;
