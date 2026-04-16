/**
 * 🎣 Hook pour générer les snippets dans les composants React
 */

import { useMemo } from 'react';
import { generateSnippets, generateJSONLD, type SnippetProvider, type SnippetConfig } from '../utils/snippetGenerator';

export function useSnippetGenerator(
  provider: SnippetProvider | null,
  locale: string,
  priceEur?: number
) {
  return useMemo(() => {
    if (!provider) return null;

    const config: SnippetConfig = {
      locale,
      includePrice: true,
      includeFAQ: true,
      includeHowTo: false,
      includeReviews: true,
      priceEur,
    };

    const snippets = generateSnippets(provider, config);
    const jsonLD = generateJSONLD(provider, config);

    return {
      snippets,
      jsonLD
    };
  }, [provider, locale, priceEur]);
}