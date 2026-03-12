/**
 * BloggerGuide - Guide d'intégration exclusif pour blogueurs
 *
 * Migrated to unified AffiliateResources backed by Laravel API.
 * Previously used Firebase callables (getBloggerGuide, copyBloggerGuideText).
 */

import React from 'react';
import { BloggerDashboardLayout } from '@/components/Blogger';
import AffiliateResources from '@/components/affiliate/AffiliateResources';

const BloggerGuide: React.FC = () => {
  return (
    <BloggerDashboardLayout>
      <AffiliateResources role="blogger" />
    </BloggerDashboardLayout>
  );
};

export default BloggerGuide;
