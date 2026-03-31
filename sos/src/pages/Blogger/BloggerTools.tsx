/**
 * BloggerTools - Marketing tools page for bloggers
 * Uses shared AffiliateToolsContent with BloggerDashboardLayout
 */

import React from 'react';
import { BloggerDashboardLayout } from '@/components/Blogger';
import AffiliateToolsContent from '@/pages/Affiliate/AffiliateToolsContent';

const BloggerTools: React.FC = () => {
  return (
    <BloggerDashboardLayout>
      <AffiliateToolsContent />
    </BloggerDashboardLayout>
  );
};

export default BloggerTools;
