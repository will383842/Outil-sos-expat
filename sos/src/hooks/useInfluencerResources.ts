/**
 * useInfluencerResources Hook
 *
 * Hook for influencer resources (logos, images, texts by category).
 */

import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsWest2 } from '../config/firebase';
import {
  InfluencerResourcesData,
  InfluencerResourceCategory,
} from '../types/influencer';

interface UseInfluencerResourcesReturn {
  resources: InfluencerResourcesData | null;
  isLoading: boolean;
  error: string | null;
  fetchResources: (category?: InfluencerResourceCategory) => Promise<void>;
  downloadResource: (resourceId: string) => Promise<{ success: boolean; downloadUrl?: string; error?: string }>;
  copyText: (textId: string) => Promise<{ success: boolean; content?: string; error?: string }>;
}

export function useInfluencerResources(): UseInfluencerResourcesReturn {
  const [resources, setResources] = useState<InfluencerResourcesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async (category?: InfluencerResourceCategory) => {
    setIsLoading(true);
    setError(null);

    try {
      const getInfluencerResources = httpsCallable<
        { category?: InfluencerResourceCategory },
        { resources: InfluencerResourcesData['files']; texts: InfluencerResourcesData['texts'] }
      >(functionsWest2, 'getInfluencerResources');

      const result = await getInfluencerResources({ category });
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
      const downloadInfluencerResource = httpsCallable<
        { resourceId: string },
        { success: boolean; downloadUrl: string }
      >(functionsWest2, 'downloadInfluencerResource');

      const result = await downloadInfluencerResource({ resourceId });
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
      const copyInfluencerResourceText = httpsCallable<
        { textId: string },
        { success: boolean; content: string }
      >(functionsWest2, 'copyInfluencerResourceText');

      const result = await copyInfluencerResourceText({ textId });

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

export default useInfluencerResources;
