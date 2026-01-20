import React, { useState, useCallback, memo } from 'react';

/**
 * OptimizedImage - Composant d'image responsive avec srcset et picture
 *
 * Fonctionnalités:
 * - Lazy loading natif
 * - srcset pour différentes résolutions (1x, 2x, 3x)
 * - Element <picture> pour formats modernes (WebP, AVIF)
 * - Placeholder de chargement
 * - Gestion des erreurs avec fallback
 * - Support aspect-ratio pour éviter CLS
 */

interface ImageSource {
  srcSet: string;
  type: 'image/avif' | 'image/webp' | 'image/jpeg' | 'image/png';
}

interface OptimizedImageProps {
  /** URL de base de l'image (sans extension pour multi-format) ou URL complète */
  src: string;
  /** Texte alternatif pour l'accessibilité (obligatoire) */
  alt: string;
  /** Largeur en pixels */
  width?: number;
  /** Hauteur en pixels */
  height?: number;
  /** Classes CSS additionnelles */
  className?: string;
  /** Sources alternatives en différents formats (WebP, AVIF) */
  sources?: ImageSource[];
  /** srcset pour images responsive (ex: "image-320w.jpg 320w, image-640w.jpg 640w") */
  srcSet?: string;
  /** Attribut sizes pour indiquer la taille d'affichage selon viewport */
  sizes?: string;
  /** Type de chargement (lazy par défaut, eager pour above-the-fold) */
  loading?: 'lazy' | 'eager';
  /** Priorité de fetch (high pour LCP images) */
  fetchPriority?: 'high' | 'low' | 'auto';
  /** Aspect ratio pour éviter CLS (ex: "16/9", "4/3", "1/1") */
  aspectRatio?: string;
  /** Image de fallback en cas d'erreur */
  fallbackSrc?: string;
  /** Callback quand l'image est chargée */
  onLoad?: () => void;
  /** Callback en cas d'erreur */
  onError?: (error: React.SyntheticEvent<HTMLImageElement>) => void;
  /** Style inline */
  style?: React.CSSProperties;
  /** Décoration: true si l'image est purement décorative (alt="" approprié) */
  decorative?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  src,
  alt,
  width,
  height,
  className = '',
  sources = [],
  srcSet,
  sizes,
  loading = 'lazy',
  fetchPriority = 'auto',
  aspectRatio,
  fallbackSrc = '/images/placeholder.svg',
  onLoad,
  onError,
  style,
  decorative = false,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
      e.currentTarget.src = fallbackSrc;
    }
    onError?.(e);
  }, [fallbackSrc, onError]);

  // Générer srcSet automatiquement si non fourni et src pointe vers une image locale
  const generateSrcSet = useCallback((baseSrc: string): string | undefined => {
    if (srcSet) return srcSet;

    // Ne pas générer automatiquement pour les URLs externes
    if (baseSrc.startsWith('http') || baseSrc.startsWith('data:')) {
      return undefined;
    }

    // Pour les images locales, générer srcset avec densité de pixels
    const ext = baseSrc.substring(baseSrc.lastIndexOf('.'));
    const base = baseSrc.substring(0, baseSrc.lastIndexOf('.'));

    // Vérifier si des variantes existent (convention: image@2x.jpg, image@3x.jpg)
    return `${baseSrc} 1x, ${base}@2x${ext} 2x, ${base}@3x${ext} 3x`;
  }, [srcSet]);

  const containerStyle: React.CSSProperties = {
    ...style,
    ...(aspectRatio && {
      aspectRatio,
      width: width ? `${width}px` : '100%',
    }),
  };

  const imageStyle: React.CSSProperties = {
    ...(aspectRatio && {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
    }),
  };

  // Si l'image a des sources alternatives (WebP, AVIF), utiliser <picture>
  if (sources.length > 0) {
    return (
      <picture
        className={`${className} ${!isLoaded ? 'animate-pulse bg-gray-200' : ''}`}
        style={containerStyle}
      >
        {/* Sources alternatives dans l'ordre de priorité (AVIF > WebP > fallback) */}
        {sources.map((source, index) => (
          <source
            key={index}
            srcSet={source.srcSet}
            type={source.type}
          />
        ))}

        {/* Image de fallback */}
        <img
          src={hasError ? fallbackSrc : src}
          alt={decorative ? '' : alt}
          width={width}
          height={height}
          loading={loading}
          // @ts-expect-error fetchpriority is a valid HTML attribute
          fetchpriority={fetchPriority}
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={imageStyle}
          decoding="async"
          {...(decorative && { 'aria-hidden': true })}
        />
      </picture>
    );
  }

  // Image simple avec srcset
  return (
    <img
      src={hasError ? fallbackSrc : src}
      alt={decorative ? '' : alt}
      width={width}
      height={height}
      srcSet={generateSrcSet(src)}
      sizes={sizes}
      loading={loading}
      // @ts-expect-error fetchpriority is a valid HTML attribute
      fetchpriority={fetchPriority}
      onLoad={handleLoad}
      onError={handleError}
      className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${!isLoaded ? 'animate-pulse bg-gray-200' : ''}`}
      style={{ ...containerStyle, ...imageStyle }}
      decoding="async"
      {...(decorative && { 'aria-hidden': true })}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;

/**
 * Hook utilitaire pour générer des sources responsive
 */
export const useResponsiveImageSources = (
  basePath: string,
  widths: number[] = [320, 640, 960, 1280]
): { srcSet: string; sizes: string } => {
  const ext = basePath.substring(basePath.lastIndexOf('.'));
  const base = basePath.substring(0, basePath.lastIndexOf('.'));

  const srcSet = widths
    .map(w => `${base}-${w}w${ext} ${w}w`)
    .join(', ');

  const sizes = `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw`;

  return { srcSet, sizes };
};

/**
 * Exemple d'utilisation:
 *
 * // Simple avec lazy loading
 * <OptimizedImage
 *   src="/images/hero.jpg"
 *   alt="Hero image"
 *   width={1200}
 *   height={600}
 *   aspectRatio="2/1"
 * />
 *
 * // Avec formats modernes (WebP, AVIF)
 * <OptimizedImage
 *   src="/images/photo.jpg"
 *   alt="Photo de profil"
 *   width={400}
 *   height={400}
 *   sources={[
 *     { srcSet: "/images/photo.avif", type: "image/avif" },
 *     { srcSet: "/images/photo.webp", type: "image/webp" },
 *   ]}
 * />
 *
 * // Hero image avec priorité haute (LCP)
 * <OptimizedImage
 *   src="/images/hero.jpg"
 *   alt="Bannière principale"
 *   loading="eager"
 *   fetchPriority="high"
 *   width={1920}
 *   height={1080}
 * />
 *
 * // Responsive avec srcset
 * <OptimizedImage
 *   src="/images/product.jpg"
 *   alt="Produit"
 *   srcSet="/images/product-320w.jpg 320w, /images/product-640w.jpg 640w, /images/product-1280w.jpg 1280w"
 *   sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
 * />
 */
