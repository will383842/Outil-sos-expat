// src/utils/utmContentParser.ts
// Utilitaire pour parser et analyser les utm_content par type de contenu publicitaire
// Convention: utm_content={type}_{variante}_{detail}
// Ex: video_testimonial_lawyer, carousel_services_all, image_promo_50off

/* --------------------------------- Types ----------------------------------- */

export type ContentType = 'video' | 'image' | 'carousel' | 'story' | 'reel' | 'collection' | 'unknown';

export interface ParsedUtmContent {
  raw: string;
  contentType: ContentType;
  variant: string;
  detail: string;
  fullLabel: string;
}

export interface ContentTypeStats {
  contentType: ContentType;
  label: string;
  conversions: number;
  revenue: number;
  leads: number;
  purchases: number;
  avgOrderValue: number;
  conversionRate?: number;
  topVariants: Array<{
    variant: string;
    conversions: number;
    revenue: number;
  }>;
}

export interface CreativeStats {
  utmContent: string;
  contentType: ContentType;
  label: string;
  conversions: number;
  revenue: number;
  leads: number;
  purchases: number;
  ctr?: number;
}

/* --------------------------------- Constants ------------------------------- */

// Mapping des prefixes utm_content vers les types de contenu
const CONTENT_TYPE_PREFIXES: Record<string, ContentType> = {
  'video': 'video',
  'vid': 'video',
  'image': 'image',
  'img': 'image',
  'static': 'image',
  'carousel': 'carousel',
  'car': 'carousel',
  'slide': 'carousel',
  'story': 'story',
  'stories': 'story',
  'reel': 'reel',
  'reels': 'reel',
  'collection': 'collection',
  'catalog': 'collection',
  'dpa': 'collection', // Dynamic Product Ads
};

// Labels lisibles pour les types de contenu (par locale)
export const CONTENT_TYPE_LABELS: Record<string, Record<ContentType, string>> = {
  'en': {
    'video': 'Video',
    'image': 'Static Image',
    'carousel': 'Carousel',
    'story': 'Story',
    'reel': 'Reel',
    'collection': 'Collection Ad',
    'unknown': 'Other',
  },
  'fr': {
    'video': 'Vidéo',
    'image': 'Image statique',
    'carousel': 'Carrousel',
    'story': 'Story',
    'reel': 'Reel',
    'collection': 'Collection publicitaire',
    'unknown': 'Autre',
  },
  'es': {
    'video': 'Vídeo',
    'image': 'Imagen estática',
    'carousel': 'Carrusel',
    'story': 'Historia',
    'reel': 'Reel',
    'collection': 'Anuncio de colección',
    'unknown': 'Otro',
  },
  'de': {
    'video': 'Video',
    'image': 'Statisches Bild',
    'carousel': 'Karussell',
    'story': 'Story',
    'reel': 'Reel',
    'collection': 'Sammlungsanzeige',
    'unknown': 'Sonstiges',
  },
  'pt': {
    'video': 'Vídeo',
    'image': 'Imagem estática',
    'carousel': 'Carrossel',
    'story': 'Story',
    'reel': 'Reel',
    'collection': 'Anúncio de coleção',
    'unknown': 'Outro',
  },
};

// Couleurs pour les graphiques
export const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
  'video': '#FF6B6B',      // Rouge corail
  'image': '#4ECDC4',      // Turquoise
  'carousel': '#45B7D1',   // Bleu ciel
  'story': '#96CEB4',      // Vert menthe
  'reel': '#9B59B6',       // Violet
  'collection': '#F39C12', // Orange
  'unknown': '#95A5A6',    // Gris
};

// Icones pour les types (lucide icon names)
export const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  'video': 'play-circle',
  'image': 'image',
  'carousel': 'layers',
  'story': 'smartphone',
  'reel': 'film',
  'collection': 'grid',
  'unknown': 'help-circle',
};

// Emojis pour les types de contenu
export const CONTENT_TYPE_EMOJIS: Record<ContentType, string> = {
  'video': '🎬',
  'image': '🖼️',
  'carousel': '📸',
  'story': '📱',
  'reel': '🎞️',
  'collection': '🗂️',
  'unknown': '❓',
};

/* --------------------------------- Parsing --------------------------------- */

/**
 * Parse un utm_content pour extraire le type, la variante et le detail
 * Format attendu: {type}_{variante}_{detail} ou {type}_{variante}
 *
 * @example
 * parseUtmContent('video_testimonial_lawyer')
 * // => { contentType: 'video', variant: 'testimonial', detail: 'lawyer', ... }
 *
 * parseUtmContent('carousel_services_all')
 * // => { contentType: 'carousel', variant: 'services', detail: 'all', ... }
 */
export function parseUtmContent(utmContent: string | undefined | null): ParsedUtmContent {
  const defaultResult: ParsedUtmContent = {
    raw: utmContent || '',
    contentType: 'unknown',
    variant: '',
    detail: '',
    fullLabel: utmContent || 'Non spécifié',
  };

  if (!utmContent || typeof utmContent !== 'string') {
    return defaultResult;
  }

  // Nettoyer et normaliser
  const cleaned = utmContent.trim().toLowerCase();
  const parts = cleaned.split(/[_-]/); // Supporte _ et -

  if (parts.length === 0) {
    return { ...defaultResult, raw: utmContent };
  }

  // Identifier le type de contenu
  const prefix = parts[0];
  const contentType = CONTENT_TYPE_PREFIXES[prefix] || 'unknown';

  // Extraire variante et detail
  const variant = parts[1] || '';
  const detail = parts.slice(2).join('_') || '';

  // Créer un label lisible
  const fullLabel = createReadableLabel(contentType, variant, detail);

  return {
    raw: utmContent,
    contentType,
    variant,
    detail,
    fullLabel,
  };
}

/**
 * Crée un label lisible à partir des composants
 */
function createReadableLabel(contentType: ContentType, variant: string, detail: string, locale = 'en'): string {
  const typeLabel = getContentTypeLabel(contentType, locale);

  if (!variant) {
    return typeLabel;
  }

  // Formater la variante (capitalize)
  const variantFormatted = variant.charAt(0).toUpperCase() + variant.slice(1);

  if (!detail) {
    return `${typeLabel} - ${variantFormatted}`;
  }

  // Formater le detail
  const detailFormatted = detail.replace(/_/g, ' ');

  return `${typeLabel} - ${variantFormatted} (${detailFormatted})`;
}

/**
 * Détecte le type de contenu depuis un utm_content
 */
export function detectContentType(utmContent: string | undefined | null): ContentType {
  return parseUtmContent(utmContent).contentType;
}

/**
 * Retourne la couleur associée à un type de contenu
 */
export function getContentTypeColor(contentType: ContentType): string {
  return CONTENT_TYPE_COLORS[contentType] || CONTENT_TYPE_COLORS.unknown;
}

/**
 * Retourne le label lisible d'un type de contenu (avec support i18n)
 * @param type - Le type de contenu (ou ContentType)
 * @param locale - La locale (en, fr, es, de, pt). Par défaut 'en'
 */
export function getContentTypeLabel(type: string | ContentType, locale = 'en'): string {
  const contentType = type as ContentType;
  const labels = CONTENT_TYPE_LABELS[locale] || CONTENT_TYPE_LABELS['en'];
  return labels[contentType] || labels['unknown'];
}

/**
 * Retourne l'emoji/icône associé à un type de contenu
 * @param type - Le type de contenu (video, image, carousel, story, reel, collection)
 */
export function getContentTypeIcon(type: string): string {
  const contentType = type as ContentType;
  return CONTENT_TYPE_EMOJIS[contentType] || CONTENT_TYPE_EMOJIS['unknown'];
}

/* --------------------------------- Analytics ------------------------------- */

/**
 * Agrège les conversions par type de contenu
 */
export function aggregateByContentType(
  conversions: Array<{
    utmContent?: string;
    conversionType?: string;
    value?: number;
  }>
): ContentTypeStats[] {
  const statsMap = new Map<ContentType, {
    conversions: number;
    revenue: number;
    leads: number;
    purchases: number;
    variants: Map<string, { conversions: number; revenue: number }>;
  }>();

  // Initialiser tous les types
  const allTypes: ContentType[] = ['video', 'image', 'carousel', 'story', 'reel', 'collection', 'unknown'];
  allTypes.forEach(type => {
    statsMap.set(type, {
      conversions: 0,
      revenue: 0,
      leads: 0,
      purchases: 0,
      variants: new Map(),
    });
  });

  // Agréger les données
  conversions.forEach(conv => {
    const parsed = parseUtmContent(conv.utmContent);
    const stats = statsMap.get(parsed.contentType)!;

    stats.conversions++;

    if (conv.conversionType === 'purchase' && conv.value) {
      stats.revenue += conv.value;
      stats.purchases++;
    }

    if (conv.conversionType === 'lead') {
      stats.leads++;
    }

    // Tracker les variantes
    if (parsed.variant) {
      const variantKey = `${parsed.variant}_${parsed.detail}`;
      const variantStats = stats.variants.get(variantKey) || { conversions: 0, revenue: 0 };
      variantStats.conversions++;
      if (conv.conversionType === 'purchase' && conv.value) {
        variantStats.revenue += conv.value;
      }
      stats.variants.set(variantKey, variantStats);
    }
  });

  // Convertir en tableau et calculer les métriques
  return Array.from(statsMap.entries())
    .map(([contentType, data]) => {
      // Top 3 variantes
      const topVariants = Array.from(data.variants.entries())
        .map(([variant, stats]) => ({ variant, ...stats }))
        .sort((a, b) => b.conversions - a.conversions)
        .slice(0, 3);

      return {
        contentType,
        label: getContentTypeLabel(contentType, 'en'),
        conversions: data.conversions,
        revenue: data.revenue,
        leads: data.leads,
        purchases: data.purchases,
        avgOrderValue: data.purchases > 0 ? data.revenue / data.purchases : 0,
        topVariants,
      };
    })
    .filter(stat => stat.conversions > 0) // Exclure les types sans conversions
    .sort((a, b) => b.conversions - a.conversions);
}

/**
 * Agrège les conversions par type de contenu et retourne une Map
 * Format simplifié avec count et revenue uniquement
 */
export function aggregateByContentTypeAsMap(
  conversions: Array<{
    utmContent?: string;
    conversionType?: string;
    value?: number;
  }>
): Map<string, { count: number; revenue: number }> {
  const resultMap = new Map<string, { count: number; revenue: number }>();

  conversions.forEach(conv => {
    const parsed = parseUtmContent(conv.utmContent);
    const key = parsed.contentType;

    const existing = resultMap.get(key) || { count: 0, revenue: 0 };
    existing.count++;

    if (conv.conversionType === 'purchase' && conv.value) {
      existing.revenue += conv.value;
    }

    resultMap.set(key, existing);
  });

  return resultMap;
}

/**
 * Retourne les top créatifs (utm_content) par performance
 */
export function getTopCreatives(
  conversions: Array<{
    utmContent?: string;
    conversionType?: string;
    value?: number;
  }>,
  limit = 10
): CreativeStats[] {
  const creativeMap = new Map<string, {
    conversions: number;
    revenue: number;
    leads: number;
    purchases: number;
  }>();

  conversions.forEach(conv => {
    const key = conv.utmContent || '(not set)';
    const stats = creativeMap.get(key) || {
      conversions: 0,
      revenue: 0,
      leads: 0,
      purchases: 0,
    };

    stats.conversions++;

    if (conv.conversionType === 'purchase' && conv.value) {
      stats.revenue += conv.value;
      stats.purchases++;
    }

    if (conv.conversionType === 'lead') {
      stats.leads++;
    }

    creativeMap.set(key, stats);
  });

  return Array.from(creativeMap.entries())
    .map(([utmContent, stats]) => {
      const parsed = parseUtmContent(utmContent);
      return {
        utmContent,
        contentType: parsed.contentType,
        label: parsed.fullLabel,
        ...stats,
      };
    })
    .filter(stat => stat.utmContent !== '(not set)')
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, limit);
}

/* --------------------------------- Helpers --------------------------------- */

/**
 * Génère des exemples d'utm_content conformes à la convention
 */
export function getUtmContentExamples(): Array<{ value: string; description: string }> {
  return [
    { value: 'video_testimonial_lawyer', description: 'Vidéo témoignage avocat' },
    { value: 'video_demo_product', description: 'Vidéo démonstration produit' },
    { value: 'carousel_services_all', description: 'Carousel tous les services' },
    { value: 'carousel_lawyers_top', description: 'Carousel top avocats' },
    { value: 'image_promo_50off', description: 'Image promo -50%' },
    { value: 'image_hero_expat', description: 'Image hero expat' },
    { value: 'story_swipeup_booking', description: 'Story swipe-up réservation' },
    { value: 'story_poll_question', description: 'Story sondage' },
    { value: 'reel_viral_expat', description: 'Reel viral expat' },
    { value: 'reel_tips_lawyer', description: 'Reel conseils avocat' },
    { value: 'collection_lawyers_paris', description: 'Collection avocats Paris' },
    { value: 'dpa_retargeting_viewed', description: 'Dynamic retargeting' },
  ];
}

/**
 * Valide un utm_content selon la convention
 */
export function validateUtmContent(utmContent: string): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (!utmContent) {
    return { isValid: false, warnings: ['utm_content est vide'], suggestions: [] };
  }

  const parsed = parseUtmContent(utmContent);

  // Vérifier le type
  if (parsed.contentType === 'unknown') {
    warnings.push(`Type de contenu non reconnu: "${utmContent.split(/[_-]/)[0]}"`);
    suggestions.push('Utilisez un prefix reconnu: video, image, carousel, story, reel, collection');
  }

  // Vérifier la présence d'une variante
  if (!parsed.variant) {
    warnings.push('Aucune variante spécifiée');
    suggestions.push('Ajoutez une variante après le type: video_testimonial');
  }

  // Vérifier les caractères
  if (/[A-Z]/.test(utmContent)) {
    warnings.push('Majuscules détectées - utilisez des minuscules pour la cohérence');
  }

  if (/\s/.test(utmContent)) {
    warnings.push('Espaces détectés - utilisez des underscores');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
  };
}

export default {
  parseUtmContent,
  detectContentType,
  getContentTypeColor,
  getContentTypeLabel,
  getContentTypeIcon,
  aggregateByContentType,
  aggregateByContentTypeAsMap,
  getTopCreatives,
  getUtmContentExamples,
  validateUtmContent,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
  CONTENT_TYPE_ICONS,
  CONTENT_TYPE_EMOJIS,
};
