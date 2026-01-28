/**
 * ============================================================================
 * DYNAMIC ICON - Charge les icônes Lucide dynamiquement
 * ============================================================================
 */

import React, { memo } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

export interface DynamicIconProps extends LucideProps {
  /** Nom de l'icône Lucide (ex: "Shield", "Check", "Star") */
  name: string;
  /** Fallback si l'icône n'existe pas */
  fallback?: string;
}

/**
 * Composant pour afficher une icône Lucide dynamiquement
 *
 * @example
 * ```tsx
 * <DynamicIcon name="Shield" className="w-6 h-6 text-green-500" />
 * <DynamicIcon name="Check" size={24} />
 * ```
 */
export const DynamicIcon = memo<DynamicIconProps>(({
  name,
  fallback = 'HelpCircle',
  ...props
}) => {
  // Normaliser le nom (PascalCase)
  const normalizedName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  // Chercher l'icône dans Lucide
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>;
  const IconComponent = icons[normalizedName] || icons[fallback] || LucideIcons.HelpCircle;

  return <IconComponent {...props} />;
});

DynamicIcon.displayName = 'DynamicIcon';
