/**
 * useChatterResources Hook
 *
 * Hook for chatter resources (logos, images, texts by category).
 */

import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '../config/firebase';
import {
  ChatterResourcesData,
  ChatterResourceCategory,
} from '../types/chatter';

interface UseChatterResourcesReturn {
  resources: ChatterResourcesData | null;
  isLoading: boolean;
  error: string | null;
  fetchResources: (category?: ChatterResourceCategory) => Promise<void>;
  downloadResource: (resourceId: string) => Promise<{ success: boolean; downloadUrl?: string; error?: string }>;
  copyText: (textId: string) => Promise<{ success: boolean; content?: string; error?: string }>;
}

export function useChatterResources(): UseChatterResourcesReturn {
  const [resources, setResources] = useState<ChatterResourcesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async (category?: ChatterResourceCategory) => {
    setIsLoading(true);
    setError(null);

    try {
      const getChatterResources = httpsCallable<
        { category?: ChatterResourceCategory },
        { resources: ChatterResourcesData['files']; texts: ChatterResourcesData['texts'] }
      >(functionsAffiliate, 'getChatterResources');

      const result = await getChatterResources({ category });
      setResources({
        files: result.data.resources || [],
        texts: result.data.texts || [],
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const downloadResource = useCallback(async (resourceId: string): Promise<{
    success: boolean;
    downloadUrl?: string;
    error?: string;
  }> => {
    try {
      const downloadChatterResource = httpsCallable<
        { resourceId: string },
        { success: boolean; downloadUrl: string }
      >(functionsAffiliate, 'downloadChatterResource');

      const result = await downloadChatterResource({ resourceId });
      return {
        success: true,
        downloadUrl: result.data.downloadUrl,
      };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return {
        success: false,
        error: e.message || 'Failed to download resource',
      };
    }
  }, []);

  const copyText = useCallback(async (textId: string): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> => {
    try {
      const copyChatterResourceText = httpsCallable<
        { textId: string },
        { success: boolean; content: string }
      >(functionsAffiliate, 'copyChatterResourceText');

      const result = await copyChatterResourceText({ textId });

      if (result.data.content) {
        await navigator.clipboard.writeText(result.data.content);
      }

      return {
        success: true,
        content: result.data.content,
      };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return {
        success: false,
        error: e.message || 'Failed to copy text',
      };
    }
  }, []);

  return {
    resources,
    isLoading,
    error,
    fetchResources,
    downloadResource,
    copyText,
  };
}

export default useChatterResources;
