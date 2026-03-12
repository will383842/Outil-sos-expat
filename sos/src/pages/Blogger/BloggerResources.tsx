/**
 * BloggerResources - Resources page for bloggers
 *
 * Now uses the unified AffiliateResources component backed by Laravel API.
 */

import React from 'react';
import { BloggerDashboardLayout } from '@/components/Blogger';
import AffiliateResources from '@/components/affiliate/AffiliateResources';

const BloggerResources: React.FC = () => {
  return (
    <BloggerDashboardLayout>
      <AffiliateResources role="blogger" />
    </BloggerDashboardLayout>
  );
};

export default BloggerResources;
