/**
 * ============================================================================
 * LANDING PAGE - Composant principal
 * ============================================================================
 *
 * Composant racine qui assemble toutes les sections d'une landing page.
 * Gère le chargement, les erreurs et le rendu conditionnel des sections.
 */

import React, { memo, Suspense, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

// Components
import { LandingHero } from './LandingHero';
import { LandingProblem } from './LandingProblem';
import { LandingSolution } from './LandingSolution';
import { LandingProcess } from './LandingProcess';
import { LandingBenefits } from './LandingBenefits';
import { LandingTestimonials } from './LandingTestimonials';
import { LandingFAQ } from './LandingFAQ';
import { LandingCTA } from './LandingCTA';
import { LandingTrust } from './LandingTrust';
import { LandingSchema } from './LandingSchema';
import { LandingMeta } from './LandingMeta';
import { LandingBreadcrumbs } from './LandingBreadcrumbs';
import { StickyCTAMobile } from './StickyCTAMobile';
import { ReadingProgressBar } from './ReadingProgressBar';
import { PageLoader, ErrorPage } from './ui';

// Hooks
import { useLandingData, useIsMobile, useReducedMotion } from '../hooks';

// Types
import type { LandingData, RouteParams } from '../types';

// Layout (imported from main app)
import Layout from '@/components/layout/Layout';

export interface LandingPageProps {
  /** Données pré-chargées (SSR ou test) */
  data?: LandingData;
  /** Force le chargement */
  isLoading?: boolean;
  /** Erreur externe */
  error?: Error | null;
}

/**
 * Composant principal Landing Page
 *
 * @example
 * ```tsx
 * // Route: /fr/de/lawyers/family-law
 * <Route path="/:lang/:country/:service/:specialty?" element={<LandingPage />} />
 * ```
 */
export const LandingPage = memo<LandingPageProps>(({
  data: propsData,
  isLoading: propsLoading,
  error: propsError,
}) => {
  // Get route params
  const params = useParams<RouteParams>();

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

  // Hooks
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  // Animation props
  const animationProps = useMemo(() => ({
    initial: prefersReducedMotion ? false : { opacity: 0 },
    animate: prefersReducedMotion ? false : { opacity: 1 },
    transition: { duration: 0.4 },
  }), [prefersReducedMotion]);

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

  // Extract sections
  const { sections, cta, seo, schema, breadcrumbs, conversion, targeting } = data;

  return (
    <Layout>
      {/* SEO Meta Tags */}
      <LandingMeta data={data} />

      {/* Schema.org JSON-LD */}
      <LandingSchema data={data} />

      {/* Reading Progress Bar (if enabled) */}
      {conversion?.progressBar?.enabled && (
        <ReadingProgressBar />
      )}

      {/* Main Content */}
      <motion.div
        className="min-h-screen overflow-x-hidden"
        {...animationProps}
      >
        {/* Hero Section */}
        <LandingHero
          hero={sections.hero}
          cta={cta}
          targeting={targeting}
        />

        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <LandingBreadcrumbs items={breadcrumbs} />
        )}

        {/* Trust Section (si badges de confiance) */}
        {data.trustBadges && data.trustBadges.length > 0 && (
          <LandingTrust
            badges={data.trustBadges}
            socialProof={data.socialProof}
            eeat={data.eeat}
          />
        )}

        {/* Problem Section */}
        {sections.problem && (
          <LandingProblem problem={sections.problem} />
        )}

        {/* Solution Section */}
        {sections.solution && (
          <LandingSolution solution={sections.solution} />
        )}

        {/* How It Works Section */}
        {sections.howItWorks && (
          <LandingProcess process={sections.howItWorks} />
        )}

        {/* Benefits Section */}
        {sections.advantages && (
          <LandingBenefits benefits={sections.advantages} />
        )}

        {/* Testimonials Section */}
        {sections.testimonials && (
          <LandingTestimonials
            testimonials={sections.testimonials}
            socialProof={data.socialProof}
          />
        )}

        {/* FAQ Section */}
        {sections.faq && (
          <LandingFAQ faq={sections.faq} />
        )}

        {/* Final CTA Section */}
        <LandingCTA
          ctaSection={sections.cta}
          globalCta={cta}
          guarantee={conversion?.guarantee}
        />
      </motion.div>

      {/* Sticky CTA Mobile (if enabled) */}
      {isMobile && conversion?.stickyCta?.enabled && (
        <StickyCTAMobile
          cta={cta}
          showAfterScroll={conversion.stickyCta.showAfterScroll}
        />
      )}
    </Layout>
  );
});

LandingPage.displayName = 'LandingPage';
