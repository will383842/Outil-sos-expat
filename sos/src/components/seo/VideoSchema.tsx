/**
 * VideoSchema Component
 * Generates JSON-LD structured data for Video objects.
 * Helps Google display video rich results in search.
 *
 * @see https://schema.org/VideoObject
 * @see https://developers.google.com/search/docs/appearance/structured-data/video
 */

import React, { useMemo } from 'react';

export interface VideoSchemaProps {
  /** Video title */
  name: string;
  /** Video description */
  description: string;
  /** Thumbnail image URL (must be 60×30 to 1920×1080) */
  thumbnailUrl: string | string[];
  /** Date the video was first published (ISO 8601) */
  uploadDate: string;
  /** Video content URL (direct link to video file) */
  contentUrl?: string;
  /** URL of the page hosting the video */
  embedUrl?: string;
  /** Video duration in ISO 8601 format (e.g. "PT1M30S") */
  duration?: string;
  /** Expiration date (ISO 8601), omit if no expiration */
  expires?: string;
  /** Whether the video requires a paid subscription */
  hasPart?: boolean;
  /** Interaction statistics */
  interactionCount?: number;
  /** Region restrictions (ISO 3166-1 alpha-2 codes) */
  regionsAllowed?: string[];
  /** Author / publisher of the video */
  author?: string;
}

/**
 * Generate VideoObject schema
 */
export function generateVideoSchema(props: VideoSchemaProps): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: props.name,
    description: props.description,
    thumbnailUrl: props.thumbnailUrl,
    uploadDate: props.uploadDate,
  };

  if (props.contentUrl) schema.contentUrl = props.contentUrl;
  if (props.embedUrl) schema.embedUrl = props.embedUrl;
  if (props.duration) schema.duration = props.duration;
  if (props.expires) schema.expires = props.expires;
  if (props.interactionCount != null) {
    schema.interactionStatistic = {
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'WatchAction' },
      userInteractionCount: props.interactionCount,
    };
  }
  if (props.regionsAllowed) {
    schema.regionsAllowed = props.regionsAllowed;
  }
  if (props.author) {
    schema.author = {
      '@type': 'Organization',
      name: props.author,
    };
  }

  return schema;
}

/**
 * VideoSchema component — renders a JSON-LD script tag for a video.
 *
 * @example
 * <VideoSchema
 *   name="How SOS Expat Works"
 *   description="Learn how to get emergency legal help abroad in under 5 minutes"
 *   thumbnailUrl="https://sos-expat.com/images/video-thumb.jpg"
 *   uploadDate="2025-06-01"
 *   duration="PT2M15S"
 *   embedUrl="https://www.youtube.com/embed/xyz"
 * />
 */
const VideoSchema: React.FC<VideoSchemaProps> = (props) => {
  const schema = useMemo(() => generateVideoSchema(props), [props]);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
    />
  );
};

export default VideoSchema;
