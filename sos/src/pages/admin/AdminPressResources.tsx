/**
 * AdminPressResources — Redirects to unified AdminMarketingResources
 *
 * Press resources are now managed via the unified marketing resources system (Laravel).
 * This wrapper pre-filters by role="press" for backward-compatible routing.
 *
 * Route: /admin/press/resources
 */

import React from "react";
import AdminMarketingResources from "./marketing/AdminMarketingResources";

const AdminPressResources: React.FC = () => {
  return <AdminMarketingResources initialRole="press" />;
};

export default AdminPressResources;
