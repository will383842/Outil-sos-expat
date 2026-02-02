/**
 * useGroupAdminResources - Hook for fetching and managing resources
 */

import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  GroupAdminResource,
  GroupAdminResourceCategory,
  GroupAdminResourcesResponse,
  SupportedGroupAdminLanguage,
} from '@/types/groupAdmin';

interface UseGroupAdminResourcesReturn {
  resources: GroupAdminResource[];
  categories: { category: GroupAdminResourceCategory; count: number }[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getProcessedContent: (resourceId: string, language?: SupportedGroupAdminLanguage) => Promise<string>;
  trackUsage: (resourceId: string, action: 'view' | 'download' | 'copy', language?: SupportedGroupAdminLanguage) => Promise<void>;
}

export function useGroupAdminResources(): UseGroupAdminResourcesReturn {
  const { user } = useAuth();
  const [resources, setResources] = useState<GroupAdminResource[]>([]);
  const [categories, setCategories] = useState<{ category: GroupAdminResourceCategory; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const getResources = httpsCallable(functions, 'getGroupAdminResources');
      const result = await getResources({});
      const data = result.data as GroupAdminResourcesResponse;

      setResources(data.resources);
      setCategories(data.categories);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'groupAdmin') {
      fetchResources();
    }
  }, [fetchResources, user]);

  const getProcessedContent = useCallback(async (
    resourceId: string,
    language: SupportedGroupAdminLanguage = 'en'
  ): Promise<string> => {
    try {
      if (!user) {
        console.error('User not authenticated');
        return '';
      }
      const getContent = httpsCallable(functions, 'getGroupAdminProcessedResourceContent');
      const result = await getContent({ resourceId, language });
      const data = result.data as { content: string };
      return data.content;
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Failed to get processed content:', error.message || err);
      return '';
    }
  }, [user]);

  const trackUsage = useCallback(async (
    resourceId: string,
    action: 'view' | 'download' | 'copy',
    language: SupportedGroupAdminLanguage = 'en'
  ): Promise<void> => {
    try {
      const track = httpsCallable(functions, 'trackGroupAdminResourceUsage');
      await track({ resourceId, action, language });
    } catch (err) {
      console.error('Failed to track resource usage:', err);
    }
  }, []);

  return {
    resources,
    categories,
    isLoading,
    error,
    refresh: fetchResources,
    getProcessedContent,
    trackUsage,
  };
}

export default useGroupAdminResources;
