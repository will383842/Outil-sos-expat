/**
 * Marketing Resources API Client
 *
 * Calls the Laravel engine for all marketing resource operations.
 * Replaces Firebase callables (getChatterResources, getBloggerResources, etc.)
 */

import { auth } from '../config/firebase';
import type {
  MarketingRole,
  MarketingCategory,
  MarketingResourceType,
  ResourcesListResponse,
  AdminResourcesListResponse,
  DownloadResponse,
  CopyResponse,
  ProcessedResponse,
  UploadResponse,
  StatsResponse,
  CreateResourcePayload,
  UpdateResourcePayload,
  BulkActionPayload,
  ReorderPayload,
} from '../types/marketingResources';

const ENGINE_BASE_URL = 'https://engine-telegram-sos-expat.life-expat.com';

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Utilisateur non connecté');
  return user.getIdToken();
}

async function apiCall<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown> | FormData;
    params?: Record<string, string>;
    isAdmin?: boolean;
  } = {},
): Promise<T> {
  const { method = 'GET', body, params, isAdmin = false } = options;
  const token = await getAuthToken();

  const prefix = isAdmin ? '/api/admin' : '/api';
  let url = `${ENGINE_BASE_URL}${prefix}${endpoint}`;

  if (params) {
    const sp = new URLSearchParams(params);
    url += `?${sp.toString()}`;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  let reqBody: string | FormData | undefined;
  if (body instanceof FormData) {
    reqBody = body;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers, body: reqBody });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// ══════════════════════════════════════════════════════════════
// PUBLIC endpoints (no auth required)
// ══════════════════════════════════════════════════════════════

export interface PublicPressResource {
  id: string;
  category: string;
  type: string;
  name: string;
  description: string | null;
  file_url: string | null;
  file_format: string | null;
  file_size: number | null;
  sort_order: number;
}

export async function getPublicPressResources(
  lang?: string,
  category?: string,
): Promise<{ success: boolean; resources: PublicPressResource[] }> {
  const params = new URLSearchParams();
  if (lang) params.set('lang', lang);
  if (category) params.set('category', category);

  const qs = params.toString();
  const url = `${ENGINE_BASE_URL}/api/press/resources${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Press API error (${res.status})`);
  }

  return res.json();
}

// ══════════════════════════════════════════════════════════════
// AFFILIATE endpoints (firebase.affiliate middleware)
// ══════════════════════════════════════════════════════════════

export function getResources(params?: {
  category?: MarketingCategory;
  type?: MarketingResourceType;
  search?: string;
  as_role?: MarketingRole;
}): Promise<ResourcesListResponse> {
  const p: Record<string, string> = {};
  if (params?.category) p.category = params.category;
  if (params?.type) p.type = params.type;
  if (params?.search) p.search = params.search;
  if (params?.as_role) p.as_role = params.as_role;

  return apiCall<ResourcesListResponse>('/marketing/resources', { params: p });
}

export function downloadResource(id: string): Promise<DownloadResponse> {
  return apiCall<DownloadResponse>(`/marketing/resources/${id}/download`, {
    method: 'POST',
  });
}

export function copyResource(
  id: string,
  replacements?: Record<string, string>,
): Promise<CopyResponse> {
  return apiCall<CopyResponse>(`/marketing/resources/${id}/copy`, {
    method: 'POST',
    body: replacements ? ({ replacements } as Record<string, unknown>) : undefined,
  });
}

export function getProcessedContent(id: string): Promise<ProcessedResponse> {
  return apiCall<ProcessedResponse>(`/marketing/resources/${id}/processed`);
}

// ══════════════════════════════════════════════════════════════
// ADMIN endpoints (firebase.admin middleware)
// ══════════════════════════════════════════════════════════════

export function adminGetResources(params?: {
  role?: MarketingRole;
  category?: MarketingCategory;
  type?: MarketingResourceType;
  active?: boolean;
  search?: string;
}): Promise<AdminResourcesListResponse> {
  const p: Record<string, string> = {};
  if (params?.role) p.role = params.role;
  if (params?.category) p.category = params.category;
  if (params?.type) p.type = params.type;
  if (params?.active !== undefined) p.active = String(params.active);
  if (params?.search) p.search = params.search;

  return apiCall<AdminResourcesListResponse>('/marketing/resources', {
    params: p,
    isAdmin: true,
  });
}

export function adminCreateResource(
  payload: CreateResourcePayload,
): Promise<{ success: boolean; resource: unknown }> {
  return apiCall('/marketing/resources', {
    method: 'POST',
    body: payload as unknown as Record<string, unknown>,
    isAdmin: true,
  });
}

export function adminUpdateResource(
  id: string,
  payload: UpdateResourcePayload,
): Promise<{ success: boolean; resource: unknown }> {
  return apiCall(`/marketing/resources/${id}`, {
    method: 'PUT',
    body: payload as unknown as Record<string, unknown>,
    isAdmin: true,
  });
}

export function adminDeleteResource(
  id: string,
): Promise<{ success: boolean }> {
  return apiCall(`/marketing/resources/${id}`, {
    method: 'DELETE',
    isAdmin: true,
  });
}

export function adminUploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return apiCall<UploadResponse>('/marketing/resources/upload', {
    method: 'POST',
    body: formData,
    isAdmin: true,
  });
}

export function adminBulkAction(
  payload: BulkActionPayload,
): Promise<{ success: boolean; affected: number }> {
  return apiCall('/marketing/resources/bulk', {
    method: 'PATCH',
    body: payload as unknown as Record<string, unknown>,
    isAdmin: true,
  });
}

export function adminReorder(
  payload: ReorderPayload,
): Promise<{ success: boolean }> {
  return apiCall('/marketing/resources/reorder', {
    method: 'PATCH',
    body: payload as unknown as Record<string, unknown>,
    isAdmin: true,
  });
}

export function adminGetStats(): Promise<StatsResponse> {
  return apiCall<StatsResponse>('/marketing/resources/stats', {
    isAdmin: true,
  });
}
