/**
 * GroupAdminResources - Resources page (images, banners, texts)
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '@/contexts/AuthContext';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import SEOHead from '@/components/layout/SEOHead';
import {  httpsCallable  } from 'firebase/functions';
import { functionsWest2 } from '@/config/firebase';
import {
  Download,
  Copy,
  CheckCircle,
  Image,
  FileText,
  Filter,
  Loader2,
  AlertCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  GroupAdminResource,
  GroupAdminResourceCategory,
  RESOURCE_CATEGORY_LABELS,
} from '@/types/groupAdmin';

const GroupAdminResources: React.FC = () => {
  const intl = useIntl();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resources, setResources] = useState<GroupAdminResource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<GroupAdminResourceCategory | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processedContent, setProcessedContent] = useState<Record<string, string>>({});
  const [loadingContent, setLoadingContent] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const getResources = httpsCallable(functionsWest2, 'getGroupAdminResources');
      const result = await getResources({});
      const data = result.data as { resources: GroupAdminResource[] };
      setResources(data.resources);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  // Fallback clipboard copy using execCommand for browsers without clipboard API
  const fallbackCopyToClipboard = (text: string): boolean => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }

    document.body.removeChild(textArea);
    return success;
  };

  // Safe clipboard write with fallback and error handling
  const safeClipboardWrite = async (text: string): Promise<boolean> => {
    // Clear any previous error
    setCopyError(null);

    // Check if clipboard API is available
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error('Clipboard API failed:', err);
        // Try fallback method
        if (fallbackCopyToClipboard(text)) {
          return true;
        }
        // Both methods failed
        const errorMessage = intl.formatMessage({
          id: 'groupAdmin.resources.copyError',
          defaultMessage: 'Failed to copy. Please try selecting and copying manually.',
        });
        setCopyError(errorMessage);
        setTimeout(() => setCopyError(null), 4000);
        return false;
      }
    } else {
      // No clipboard API, use fallback
      if (fallbackCopyToClipboard(text)) {
        return true;
      }
      const errorMessage = intl.formatMessage({
        id: 'groupAdmin.resources.clipboardNotSupported',
        defaultMessage: 'Clipboard not supported. Please copy manually.',
      });
      setCopyError(errorMessage);
      setTimeout(() => setCopyError(null), 4000);
      return false;
    }
  };

  const copyContent = async (resource: GroupAdminResource) => {
    if (loadingContent === resource.id) return;

    let contentToCopy: string | null = null;

    // Get processed content
    if (!processedContent[resource.id]) {
      setLoadingContent(resource.id);
      try {
        const getContent = httpsCallable(functionsWest2, 'getGroupAdminProcessedResourceContent');
        const result = await getContent({ resourceId: resource.id, language: user?.preferredLanguage || 'en' });
        const data = result.data as { content: string };
        setProcessedContent((prev) => ({ ...prev, [resource.id]: data.content }));
        contentToCopy = data.content;
      } catch (err) {
        console.error('Failed to get content:', err);
        // Fallback to raw content
        if (resource.content) {
          contentToCopy = resource.content;
        }
      } finally {
        setLoadingContent(null);
      }
    } else {
      contentToCopy = processedContent[resource.id];
    }

    // Attempt to copy to clipboard
    if (!contentToCopy) {
      setCopyError(intl.formatMessage({
        id: 'groupAdmin.resources.noContent',
        defaultMessage: 'No content available to copy.',
      }));
      setTimeout(() => setCopyError(null), 4000);
      return;
    }

    const copySuccess = await safeClipboardWrite(contentToCopy);

    if (!copySuccess) {
      return; // Error already set by safeClipboardWrite
    }

    // Track usage
    try {
      const trackUsage = httpsCallable(functionsWest2, 'trackGroupAdminResourceUsage');
      await trackUsage({ resourceId: resource.id, action: 'copy', language: user?.preferredLanguage || 'en' });
    } catch (err) {
      console.error('Failed to track usage:', err);
    }

    setCopiedId(resource.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadResource = async (resource: GroupAdminResource) => {
    if (!resource.fileUrl) return;

    // Track usage
    try {
      const trackUsage = httpsCallable(functionsWest2, 'trackGroupAdminResourceUsage');
      await trackUsage({ resourceId: resource.id, action: 'download', language: user?.preferredLanguage || 'en' });
    } catch (err) {
      console.error('Failed to track usage:', err);
    }

    // Open in new tab
    window.open(resource.fileUrl, '_blank');
  };

  const filteredResources = selectedCategory === 'all'
    ? resources
    : resources.filter((r) => r.category === selectedCategory);

  const categories: GroupAdminResourceCategory[] = [
    'pinned_posts', 'cover_banners', 'post_images', 'story_images', 'badges', 'welcome_messages'
  ];

  if (loading) {
    return (
      <GroupAdminDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </GroupAdminDashboardLayout>
    );
  }

  if (error) {
    return (
      <GroupAdminDashboardLayout>
        <div className="flex items-center justify-center p-4 py-20">
          <div className="bg-white dark:bg-white/5 rounded-xl p-8 max-w-md w-full text-center shadow-lg dark:shadow-none">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl dark:text-white font-bold mb-2">Error</h2>
            <p className="text-gray-600 dark:text-gray-600 mb-6">{error}</p>
            <button onClick={fetchResources} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">
              Retry
            </button>
          </div>
        </div>
      </GroupAdminDashboardLayout>
    );
  }

  return (
    <GroupAdminDashboardLayout>
      <SEOHead description="Manage your group or community with SOS-Expat" title={intl.formatMessage({ id: 'groupAdmin.resources.title', defaultMessage: 'Resources | SOS-Expat Group Admin' })} />

      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl dark:text-white md:text-3xl font-bold mb-2">
              <FormattedMessage id="groupAdmin.resources.heading" defaultMessage="Resources" />
            </h1>
            <p className="text-gray-600 dark:text-gray-600">
              <FormattedMessage id="groupAdmin.resources.subtitle" defaultMessage="Ready-to-use images, banners, and texts for your group" />
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              <FormattedMessage id="groupAdmin.resources.all" defaultMessage="All" />
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
              >
                {RESOURCE_CATEGORY_LABELS[cat].en}
              </button>
            ))}
          </div>

          {/* Copy Error Toast */}
          {copyError && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border dark:border-red-800/50 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-300">{copyError}</p>
              <button
                onClick={() => setCopyError(null)}
                className="ml-auto p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300 rounded-full hover:bg-red-100 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Resources Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <div key={resource.id} className="bg-white dark:bg-white/5 rounded-xl shadow-sm dark:shadow-none overflow-hidden">
                {/* Preview */}
                {resource.type === 'image' && resource.thumbnailUrl && (
                  <div className="aspect-video bg-gray-100 dark:bg-white/5 relative">
                    <img
                      src={resource.thumbnailUrl}
                      alt={resource.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {(resource.type === 'text' || resource.type === 'template') && (
                  <div className="aspect-video bg-gray-50 dark:bg-white/5 p-4 overflow-hidden">
                    <p className="text-sm dark:text-gray-600 line-clamp-6">{resource.content}</p>
                  </div>
                )}

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">{resource.name}</h3>
                  {resource.description && (
                    <p className="text-sm dark:text-gray-700 mb-3">{resource.description}</p>
                  )}
                  {resource.dimensions && (
                    <p className="text-xs dark:text-gray-400 mb-3">
                      {resource.dimensions.width} x {resource.dimensions.height}px
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {(resource.type === 'text' || resource.type === 'template') && (
                      <button
                        onClick={() => copyContent(resource)}
                        disabled={loadingContent === resource.id}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-4 rounded-lg items-center justify-center gap-2"
                      >
                        {loadingContent === resource.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : copiedId === resource.id ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <FormattedMessage id="groupAdmin.resources.copied" defaultMessage="Copied!" />
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <FormattedMessage id="groupAdmin.resources.copy" defaultMessage="Copy" />
                          </>
                        )}
                      </button>
                    )}
                    {resource.type === 'image' && resource.fileUrl && (
                      <button
                        onClick={() => downloadResource(resource)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <FormattedMessage id="groupAdmin.resources.download" defaultMessage="Download" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredResources.length === 0 && (
            <div className="text-center py-12">
              <Image className="w-12 h-12 text-gray-700 dark:text-gray-300 mx-auto mb-4" />
              <p className="text-gray-700 dark:text-gray-700">
                <FormattedMessage id="groupAdmin.resources.noResources" defaultMessage="No resources in this category yet" />
              </p>
            </div>
          )}
        </div>
      </div>
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminResources;
