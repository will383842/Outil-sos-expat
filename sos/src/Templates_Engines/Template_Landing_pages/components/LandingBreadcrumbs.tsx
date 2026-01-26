/**
 * ============================================================================
 * LANDING BREADCRUMBS - Fil d'Ariane
 * ============================================================================
 *
 * Fil d'Ariane accessible et SEO-friendly.
 */

import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import type { Breadcrumb } from '../types';

export interface LandingBreadcrumbsProps {
  items: Breadcrumb[];
}

/**
 * Composant fil d'Ariane
 */
export const LandingBreadcrumbs = memo<LandingBreadcrumbsProps>(({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav
      className="bg-gray-50 border-b border-gray-100"
      aria-label="Fil d'Ariane"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ol
          className="flex items-center gap-2 py-3 text-sm overflow-x-auto scrollbar-hide"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li
                key={item.position}
                className="flex items-center gap-2 whitespace-nowrap"
                itemScope
                itemProp="itemListElement"
                itemType="https://schema.org/ListItem"
              >
                {/* Separator (not for first item) */}
                {index > 0 && (
                  <ChevronRight
                    className="w-4 h-4 text-gray-400 flex-shrink-0"
                    aria-hidden="true"
                  />
                )}

                {isLast ? (
                  // Current page (not a link)
                  <span
                    className="text-gray-600 font-medium"
                    itemProp="name"
                    aria-current="page"
                  >
                    {index === 0 && <Home className="w-4 h-4 inline mr-1" />}
                    {item.name}
                  </span>
                ) : (
                  // Link to parent
                  <Link
                    to={item.url}
                    className="text-gray-500 hover:text-red-600 transition-colors flex items-center"
                    itemProp="item"
                  >
                    {index === 0 && <Home className="w-4 h-4 mr-1" />}
                    <span itemProp="name">{item.name}</span>
                  </Link>
                )}

                <meta itemProp="position" content={String(item.position)} />
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
});

LandingBreadcrumbs.displayName = 'LandingBreadcrumbs';
