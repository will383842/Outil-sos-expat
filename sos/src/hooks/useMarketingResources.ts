/**
 * useMarketingResources — Unified hook for affiliate resources
 *
 * Replaces: useChatterResources, useInfluencerResources,
 *           useBloggerResources, useGroupAdminResources
 *
 * Calls the Laravel engine API instead of Firebase callables.
 * Filters resources by the user's affiliate role.
 */

import { useState, useCallback, useRef } from 'react';
import { copyToClipboard } from '@/utils/clipboard';
import type {
  MarketingResource,
  MarketingRole,
  MarketingCategory,
  MarketingResourceType,
} from '@/types/marketingResources';
import {
  getResources,
  downloadResource as apiDownload,
  copyResource as apiCopy,
  getProcessedContent as apiProcessed,
} from '@/services/marketingResourcesApi';

const CACHE_TTL = 600_000; // 10 min

interface CacheEntry {
  data: MarketingResource[];
  timestamp: number;
  key: string;
}

export interface UseMarketingResourcesReturn {
  resources: MarketingResource[];
  isLoading: boolean;
  error: string | null;
  role: MarketingRole | null;
  language: string | null;
  fetchResources: (filters?: {
    category?: MarketingCategory;
    type?: MarketingResourceType;
    search?: string;
  }) => Promise<void>;
  download: (resourceId: string) => Promise<{ success: boolean; fileUrl?: string; error?: string }>;
  copy: (resourceId: string, replacements?: Record<string, string>) => Promise<{ success: boolean; content?: string; error?: string }>;
  getProcessed: (resourceId: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  refresh: () => Promise<void>;
}

export function useMarketingResources(
  asRole?: MarketingRole,
): UseMarketingResourcesReturn {
  const [resources, setResources] = useState<MarketingResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<MarketingRole | null>(null);
  const [language, setLanguage] = useState<string | null>(null);

  const cacheRef = useRef<CacheEntry | null>(null);
  const lastFiltersRef = useRef<{
    category?: MarketingCategory;
    type?: MarketingResourceType;
    search?: string;
  }>({});

  const fetchResources = useCallback(
    async (filters?: {
      category?: MarketingCategory;
      type?: MarketingResourceType;
      search?: string;
    }) => {
      const cacheKey = JSON.stringify({ ...filters, asRole });

      // Check cache
      if (
        cacheRef.current &&
        cacheRef.current.key === cacheKey &&
        Date.now() - cacheRef.current.timestamp < CACHE_TTL
      ) {
        setResources(cacheRef.current.data);
        return;
      }

      setIsLoading(true);
      setError(null);
      lastFiltersRef.current = filters || {};

      try {
        const result = await getResources({
          category: filters?.category,
          type: filters?.type,
          search: filters?.search,
          as_role: asRole,
        });

        setResources(result.resources);
        setRole(result.role);
        setLanguage(result.language);
        cacheRef.current = {
          data: result.resources,
          timestamp: Date.now(),
          key: cacheKey,
        };
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e.message || 'Failed to load resources');
      } finally {
        setIsLoading(false);
      }
    },
    [asRole],
  );

  const refresh = useCallback(async () => {
    cacheRef.current = null;
    await fetchResources(lastFiltersRef.current);
  }, [fetchResources]);

  const download = useCallback(
    async (
      resourceId: string,
    ): Promise<{ success: boolean; fileUrl?: string; error?: string }> => {
      try {
        const result = await apiDownload(resourceId);
        return { success: true, fileUrl: result.file_url };
      } catch (err: unknown) {
        const e = err as { message?: string };
        return { success: false, error: e.message || 'Download failed' };
      }
    },
    [],
  );

  const copy = useCallback(
    async (
      resourceId: string,
      replacements?: Record<string, string>,
    ): Promise<{ success: boolean; content?: string; error?: string }> => {
      try {
        const result = await apiCopy(resourceId, replacements);
        if (result.content) {
          await copyToClipboard(result.content);
        }
        return { success: true, content: result.content };
      } catch (err: unknown) {
        const e = err as { message?: string };
        return { success: false, error: e.message || 'Copy failed' };
      }
    },
    [],
  );

  const getProcessed = useCallback(
    async (
      resourceId: string,
    ): Promise<{ success: boolean; content?: string; error?: string }> => {
      try {
        const result = await apiProcessed(resourceId);
        return { success: true, content: result.content };
      } catch (err: unknown) {
        const e = err as { message?: string };
        return { success: false, error: e.message || 'Failed to get content' };
      }
    },
    [],
  );

  return {
    resources,
    isLoading,
    error,
    role,
    language,
    fetchResources,
    download,
    copy,
    getProcessed,
    refresh,
  };
}

export default useMarketingResources;
