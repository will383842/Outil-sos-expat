/**
 * useBloggerResources Hook
 *
 * Hook for blogger-exclusive resources and integration guide.
 */

import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '../config/firebase';
import {
  BloggerResourcesData,
  BloggerGuideData,
  BloggerResourceCategory,
} from '../types/blogger';

// ============================================================================
// RESOURCES HOOK
// ============================================================================

interface UseBloggerResourcesReturn {
  resources: BloggerResourcesData | null;
  isLoading: boolean;
  error: string | null;
  fetchResources: (category?: BloggerResourceCategory) => Promise<void>;
  downloadResource: (resourceId: string) => Promise<{ success: boolean; downloadUrl?: string; error?: string }>;
  copyText: (textId: string) => Promise<{ success: boolean; content?: string; error?: string }>;
}

export function useBloggerResources(): UseBloggerResourcesReturn {
  const [resources, setResources] = useState<BloggerResourcesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async (category?: BloggerResourceCategory) => {
    setIsLoading(true);
    setError(null);

    try {
      const getBloggerResources = httpsCallable<
        { category?: BloggerResourceCategory },
        BloggerResourcesData
      >(functionsAffiliate, 'getBloggerResources');

      const result = await getBloggerResources({ category });
      setResources(result.data);
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
      const downloadBloggerResource = httpsCallable<
        { resourceId: string },
        { success: boolean; downloadUrl: string }
      >(functionsAffiliate, 'downloadBloggerResource');

      const result = await downloadBloggerResource({ resourceId });
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
      const copyBloggerResourceText = httpsCallable<
        { textId: string },
        { success: boolean; content: string }
      >(functionsAffiliate, 'copyBloggerResourceText');

      const result = await copyBloggerResourceText({ textId });

      // Copy to clipboard
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

// ============================================================================
// GUIDE HOOK
// ============================================================================

interface UseBloggerGuideReturn {
  guide: BloggerGuideData | null;
  isLoading: boolean;
  error: string | null;
  fetchGuide: () => Promise<void>;
  copyWithLink: (
    textId: string,
    textType: 'template' | 'copy_text',
    affiliateLink: string
  ) => Promise<{ success: boolean; content?: string; error?: string }>;
}

export function useBloggerGuide(): UseBloggerGuideReturn {
  const [guide, setGuide] = useState<BloggerGuideData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGuide = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const getBloggerGuide = httpsCallable<unknown, BloggerGuideData>(
        functionsAffiliate,
        'getBloggerGuide'
      );

      const result = await getBloggerGuide({});
      setGuide(result.data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load integration guide');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const copyWithLink = useCallback(async (
    textId: string,
    textType: 'template' | 'copy_text',
    affiliateLink: string
  ): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> => {
    try {
      const copyBloggerGuideText = httpsCallable<
        { textId: string; textType: 'template' | 'copy_text'; affiliateLink: string },
        { success: boolean; content: string }
      >(functionsAffiliate, 'copyBloggerGuideText');

      const result = await copyBloggerGuideText({ textId, textType, affiliateLink });

      // Copy to clipboard
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
    guide,
    isLoading,
    error,
    fetchGuide,
    copyWithLink,
  };
}

// ============================================================================
// ARTICLES HOOK
// ============================================================================

export interface BloggerArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  seoTitle?: string;
  seoKeywords?: string[];
  estimatedWordCount?: number;
}

interface UseBloggerArticlesReturn {
  articles: BloggerArticle[] | null;
  isLoading: boolean;
  error: string | null;
  fetchArticles: () => Promise<void>;
  copyArticle: (articleId: string) => Promise<{ success: boolean; content?: string; error?: string }>;
}

export function useBloggerArticles(): UseBloggerArticlesReturn {
  const [articles, setArticles] = useState<BloggerArticle[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const getBloggerArticles = httpsCallable<unknown, { articles: BloggerArticle[] }>(
        functionsAffiliate,
        'getBloggerArticles'
      );

      const result = await getBloggerArticles({});
      setArticles(result.data.articles || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const copyArticle = useCallback(async (articleId: string): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> => {
    try {
      const copyBloggerArticle = httpsCallable<
        { articleId: string },
        { success: boolean; content: string }
      >(functionsAffiliate, 'copyBloggerArticle');

      const result = await copyBloggerArticle({ articleId });

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
        error: e.message || 'Failed to copy article',
      };
    }
  }, []);

  return {
    articles,
    isLoading,
    error,
    fetchArticles,
    copyArticle,
  };
}

export default useBloggerResources;
