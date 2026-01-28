/**
 * ============================================================================
 * LANDING PAGE - Factory de templates
 * ============================================================================
 *
 * Composant intelligent qui sélectionne automatiquement le bon template
 * en fonction de la propriété `data.template` :
 *
 * - 'minimal'    → Design premium épuré (Hero + Trust + FAQ + CTA)
 * - 'complete'   → Toutes les sections
 * - 'conversion' → Optimisé conversion (urgence, popups, compteurs)
 */

import React, { memo } from 'react';
import { useParams } from 'react-router-dom';

// Templates
import { LandingPageMinimal, LandingPageComplete, LandingPageConversion } from './templates';

// UI Components
import { PageLoader, ErrorPage } from './ui';

// Hooks
import { useLandingData } from '../hooks';

// Types
import type { LandingData, RouteParams, LandingTemplate } from '../types';

export interface LandingPageProps {
  /** Données pré-chargées (SSR ou test) */
  data?: LandingData;
  /** Force le chargement */
  isLoading?: boolean;
  /** Erreur externe */
  error?: Error | null;
  /** Force un template spécifique (override data.template) */
  forceTemplate?: LandingTemplate;
}

/**
 * Factory de Landing Pages - Sélectionne le bon template automatiquement
 *
 * @example
 * ```tsx
 * // Auto-sélection basée sur data.template
 * <Route path="/:lang/:country/:service/:specialty?" element={<LandingPage />} />
 *
 * // Forcer un template spécifique
 * <LandingPage forceTemplate="conversion" />
 * ```
 */
export const LandingPage = memo<LandingPageProps>(({
  data: propsData,
  isLoading: propsLoading,
  error: propsError,
  forceTemplate,
}) => {
  // Get route params
  const params = useParams() as RouteParams;

  // Fetch landing data
  const {
    data: fetchedData,
    isLoading: fetchLoading,
    isError,
    error: fetchError,
    refetch,
  } = useLandingData(params, {
    enabled: !propsData, // Skip fetch if data provided via props
  });

  // Use props data or fetched data
  const data = propsData || fetchedData;
  const isLoading = propsLoading ?? fetchLoading;
  const error = propsError ?? (isError ? fetchError : null);

  // Loading state
  if (isLoading) {
    return <PageLoader />;
  }

  // Error state
  if (error || !data) {
    return (
      <ErrorPage
        error={error}
        title="Page introuvable"
        message="Désolé, cette page n'existe pas ou a été déplacée."
        onRetry={refetch}
        errorCode={404}
      />
    );
  }

  // Determine which template to use
  const templateType = forceTemplate || data.template || 'complete';

  // Render the appropriate template
  switch (templateType) {
    case 'minimal':
      return <LandingPageMinimal data={data} />;

    case 'conversion':
      return <LandingPageConversion data={data} />;

    case 'complete':
    default:
      return <LandingPageComplete data={data} />;
  }
});

LandingPage.displayName = 'LandingPage';
