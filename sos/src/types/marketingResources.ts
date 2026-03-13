/**
 * Marketing Resources — Unified Types
 *
 * Shared types for the Laravel-backed marketing resources system.
 * Replaces role-specific types (chatter, influencer, blogger, groupAdmin).
 */

// ── Roles & Categories ──

export type MarketingRole =
  | 'chatter'
  | 'captain'
  | 'influencer'
  | 'blogger'
  | 'group_admin'
  | 'partner'
  | 'press';

export type MarketingCategory =
  // Shared
  | 'sos_expat'
  // Affiliate
  | 'promotional'
  | 'social_media'
  | 'templates'
  | 'seo'
  | 'recruitment'
  // Group admin
  | 'pinned_posts'
  | 'cover_banners'
  | 'post_images'
  | 'story_images'
  | 'badges'
  | 'welcome_messages'
  // Partner
  | 'partner_kit'
  // Press
  | 'press_logos'
  | 'press_releases'
  | 'press_kit'
  | 'press_photos'
  | 'press_data';

export type MarketingResourceType =
  | 'logo'
  | 'image'
  | 'banner'
  | 'text'
  | 'template'
  | 'article'
  | 'video'
  | 'document'
  | 'widget';

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'pt', 'ar', 'de', 'zh', 'ru', 'hi'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// ── API Response Types (from Laravel) ──

/** Translated resource (returned by affiliate endpoint) */
export interface MarketingResource {
  id: string;
  target_roles: MarketingRole[];
  category: MarketingCategory;
  type: MarketingResourceType;
  name: string;
  description: string | null;
  content: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  file_format: string | null;
  file_size: number | null;
  placeholders: string[] | null;
  download_count: number;
  copy_count: number;
  sort_order: number;
}

/** Full resource with all translations (returned by admin endpoint) */
export interface MarketingResourceAdmin {
  id: string;
  target_roles: MarketingRole[];
  category: MarketingCategory;
  type: MarketingResourceType;
  name: Record<string, string>;
  description: Record<string, string> | null;
  content: Record<string, string> | null;
  file_path: string | null;
  thumbnail_path: string | null;
  file_format: string | null;
  file_size: number | null;
  placeholders: string[] | null;
  seo_keywords: string[] | null;
  word_count: number | null;
  is_active: boolean;
  sort_order: number;
  download_count: number;
  copy_count: number;
  created_at: string;
  updated_at: string;
}

// ── API Request Types ──

export interface CreateResourcePayload {
  target_roles: MarketingRole[];
  category: MarketingCategory;
  type: MarketingResourceType;
  name: Record<string, string>;
  description?: Record<string, string>;
  content?: Record<string, string>;
  file_path?: string;
  thumbnail_path?: string;
  file_format?: string;
  file_size?: number;
  placeholders?: string[];
  seo_keywords?: string[];
  word_count?: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateResourcePayload extends Partial<CreateResourcePayload> {}

export interface BulkActionPayload {
  ids: string[];
  action: 'activate' | 'deactivate' | 'delete';
}

export interface ReorderPayload {
  items: { id: string; sort_order: number }[];
}

// ── API Response Wrappers ──

export interface ResourcesListResponse {
  success: boolean;
  resources: MarketingResource[];
  role: MarketingRole;
  language: SupportedLanguage;
}

export interface AdminResourcesListResponse {
  success: boolean;
  resources: MarketingResourceAdmin[];
  count: number;
}

export interface DownloadResponse {
  success: boolean;
  file_url: string;
  file_format: string;
  file_size: number;
}

export interface CopyResponse {
  success: boolean;
  content: string;
  name: string;
}

export interface ProcessedResponse {
  success: boolean;
  content: string;
  name: string;
  placeholders: string[] | null;
}

export interface UploadResponse {
  success: boolean;
  file_path: string;
  thumbnail_path: string | null;
  file_format: string;
  file_size: number;
  mime_type: string;
}

export interface StatsResponse {
  success: boolean;
  top_downloads: MarketingResourceAdmin[];
  usage_by_role: { user_role: string; action: string; count: number }[];
  usage_trend: { date: string; action: string; count: number }[];
  count_by_category: { category: string; count: number }[];
  total_resources: number;
  active_resources: number;
}
