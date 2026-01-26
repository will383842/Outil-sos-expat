/**
 * ============================================================================
 * PAGE LOADER - Squelette de chargement pour landing page
 * ============================================================================
 */

import React, { memo } from 'react';

/**
 * Loader squelette pendant le chargement de la landing page
 * Design aligné sur SOS Expat avec animations subtiles
 */
export const PageLoader = memo(() => {
  return (
    <div className="min-h-screen bg-gray-950 animate-pulse">
      {/* Hero skeleton */}
      <div className="relative pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-6">
            {/* Badge skeleton */}
            <div className="h-10 w-48 bg-white/10 rounded-full mx-auto" />

            {/* Title skeleton */}
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="h-16 bg-white/10 rounded-lg" />
              <div className="h-16 w-3/4 bg-white/10 rounded-lg mx-auto" />
            </div>

            {/* Subtitle skeleton */}
            <div className="h-8 w-2/3 bg-white/10 rounded-lg mx-auto" />

            {/* CTA skeleton */}
            <div className="flex justify-center gap-4 pt-4">
              <div className="h-14 w-48 bg-white/20 rounded-2xl" />
              <div className="h-14 w-48 bg-white/10 rounded-2xl hidden md:block" />
            </div>
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-16">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-8 rounded-3xl bg-white/5 border border-white/10"
              >
                <div className="h-16 w-16 bg-white/10 rounded-2xl mx-auto mb-4" />
                <div className="h-10 bg-white/10 rounded-lg mb-2" />
                <div className="h-6 w-3/4 bg-white/10 rounded-lg mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section skeleton */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="h-12 w-2/3 bg-gray-200 rounded-lg mx-auto mb-4" />
            <div className="h-6 w-1/2 bg-gray-100 rounded-lg mx-auto" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-8 rounded-3xl bg-gray-50 border border-gray-200"
              >
                <div className="h-14 w-14 bg-gray-200 rounded-2xl mb-6" />
                <div className="h-8 bg-gray-200 rounded-lg mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded" />
                  <div className="h-4 w-4/5 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accessibility: announce loading state */}
      <div className="sr-only" role="status" aria-live="polite">
        Chargement de la page en cours...
      </div>
    </div>
  );
});

PageLoader.displayName = 'PageLoader';
