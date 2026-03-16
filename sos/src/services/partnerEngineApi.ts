/**
 * Partner Engine API Client
 *
 * Calls the Partner Engine Laravel API for all partner/subscriber operations.
 * Base URL configurable via VITE_PARTNER_ENGINE_URL env variable.
 */

import { auth } from '../config/firebase';

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface Agreement {
  id: number;
  partner_firebase_id: string;
  partner_name: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'expired';
  discount_type: 'none' | 'fixed' | 'percent';
  discount_value: number;
  discount_max_cents: number | null;
  discount_label: string | null;
  commission_per_call_lawyer: number;
  commission_per_call_expat: number;
  commission_type: 'fixed' | 'percent';
  commission_percent: number | null;
  max_subscribers: number | null;
  max_calls_per_subscriber: number | null;
  starts_at: string | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscriber {
  id: number;
  partner_firebase_id: string;
  agreement_id: number | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  language: string;
  firebase_uid: string | null;
  affiliate_code: string | null;
  invite_token: string;
  status: 'invited' | 'registered' | 'active' | 'suspended' | 'expired';
  invited_at: string | null;
  registered_at: string | null;
  last_activity_at: string | null;
  total_calls: number;
  total_spent_cents: number;
  total_discount_cents: number;
  tags: string[];
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SubscriberActivity {
  id: number;
  subscriber_id: number;
  type: string;
  call_session_id: string | null;
  provider_type: string | null;
  call_duration_seconds: number | null;
  amount_paid_cents: number | null;
  discount_applied_cents: number | null;
  commission_earned_cents: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; has_more: boolean; next_cursor: string | null };
}

export interface DashboardStats {
  total_subscribers: number;
  active_subscribers: number;
  total_calls_this_month: number;
  total_revenue_this_month_cents: number;
  conversion_rate: number;
}

export interface EarningsBreakdown {
  affiliate: { total_cents: number; this_month_cents: number };
  subscribers: {
    total_cents: number;
    this_month_cents: number;
    by_agreement: Array<{ agreement_id: number; name: string; total_cents: number }>;
  };
}

export interface CsvImportResult {
  id: number;
  total_rows: number;
  imported: number;
  duplicates: number;
  errors: number;
  error_details: Array<{ row: number; error: string }>;
  status: string;
}

export interface MonthlyStats {
  month: string;
  total_subscribers: number;
  new_subscribers: number;
  active_subscribers: number;
  total_calls: number;
  total_revenue_cents: number;
  total_commissions_cents: number;
  total_discounts_cents: number;
  conversion_rate: number;
}

// ══════════════════════════════════════════════════════════════
// Base URL & Auth
// ══════════════════════════════════════════════════════════════

const BASE_URL =
  import.meta.env.VITE_PARTNER_ENGINE_URL || 'https://partner-engine.life-expat.com';

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Utilisateur non connecté');
  return user.getIdToken();
}

// ══════════════════════════════════════════════════════════════
// Generic API helper
// ══════════════════════════════════════════════════════════════

async function apiCall<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown> | FormData;
    params?: Record<string, string>;
  } = {},
): Promise<T> {
  const { method = 'GET', body, params } = options;
  const token = await getAuthToken();

  let url = `${BASE_URL}/api${endpoint}`;

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
// PARTNER endpoints (auth required, role=partner)
// ══════════════════════════════════════════════════════════════

export function getPartnerDashboard(): Promise<DashboardStats> {
  return apiCall<DashboardStats>('/partner/dashboard');
}

export function getPartnerSubscribers(params?: {
  status?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}): Promise<PaginatedResponse<Subscriber>> {
  const p: Record<string, string> = {};
  if (params?.status) p.status = params.status;
  if (params?.search) p.search = params.search;
  if (params?.cursor) p.cursor = params.cursor;
  if (params?.limit) p.limit = String(params.limit);

  return apiCall<PaginatedResponse<Subscriber>>('/partner/subscribers', { params: p });
}

export function getPartnerSubscriber(
  id: number,
): Promise<{ subscriber: Subscriber; activities: SubscriberActivity[] }> {
  return apiCall(`/partner/subscribers/${id}`);
}

export function createPartnerSubscriber(data: Partial<Subscriber>): Promise<Subscriber> {
  return apiCall<Subscriber>('/partner/subscribers', {
    method: 'POST',
    body: data as unknown as Record<string, unknown>,
  });
}

export function updatePartnerSubscriber(
  id: number,
  data: Partial<Subscriber>,
): Promise<Subscriber> {
  return apiCall<Subscriber>(`/partner/subscribers/${id}`, {
    method: 'PUT',
    body: data as unknown as Record<string, unknown>,
  });
}

export function deletePartnerSubscriber(id: number): Promise<void> {
  return apiCall<void>(`/partner/subscribers/${id}`, { method: 'DELETE' });
}

export function resendSubscriberInvitation(id: number): Promise<void> {
  return apiCall<void>(`/partner/subscribers/${id}/resend-invitation`, { method: 'POST' });
}

export async function importSubscribersCsv(file: File): Promise<CsvImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  return apiCall<CsvImportResult>('/partner/subscribers/import', {
    method: 'POST',
    body: formData,
  });
}

export async function exportSubscribersCsv(): Promise<Blob> {
  const token = await getAuthToken();
  const url = `${BASE_URL}/api/partner/subscribers/export`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error (${res.status}): ${text}`);
  }

  return res.blob();
}

export function getPartnerAgreement(): Promise<Agreement | null> {
  return apiCall<Agreement | null>('/partner/agreement');
}

export function getPartnerActivity(params?: {
  cursor?: string;
  limit?: number;
}): Promise<PaginatedResponse<SubscriberActivity>> {
  const p: Record<string, string> = {};
  if (params?.cursor) p.cursor = params.cursor;
  if (params?.limit) p.limit = String(params.limit);

  return apiCall<PaginatedResponse<SubscriberActivity>>('/partner/activity', { params: p });
}

export function getPartnerStats(
  period?: '30d' | '6m' | '12m',
): Promise<MonthlyStats[]> {
  const p: Record<string, string> = {};
  if (period) p.period = period;

  return apiCall<MonthlyStats[]>('/partner/stats', { params: p });
}

export function getPartnerEarningsBreakdown(): Promise<EarningsBreakdown> {
  return apiCall<EarningsBreakdown>('/partner/earnings');
}

// ══════════════════════════════════════════════════════════════
// SUBSCRIBER endpoints (auth required, user is a subscriber)
// ══════════════════════════════════════════════════════════════

export function getSubscriberMe(): Promise<{
  subscriber: Subscriber;
  discount_label: string;
  affiliate_link: string;
}> {
  return apiCall('/subscriber/me');
}

export function getSubscriberActivity(params?: {
  cursor?: string;
}): Promise<PaginatedResponse<SubscriberActivity>> {
  const p: Record<string, string> = {};
  if (params?.cursor) p.cursor = params.cursor;

  return apiCall<PaginatedResponse<SubscriberActivity>>('/subscriber/activity', { params: p });
}

// ══════════════════════════════════════════════════════════════
// ADMIN endpoints (auth required, role=admin)
// ══════════════════════════════════════════════════════════════

export function adminGetPartners(params?: {
  cursor?: string;
  search?: string;
}): Promise<PaginatedResponse<any>> {
  const p: Record<string, string> = {};
  if (params?.cursor) p.cursor = params.cursor;
  if (params?.search) p.search = params.search;

  return apiCall<PaginatedResponse<any>>('/admin/partners', { params: p });
}

export function adminGetPartner(firebaseId: string): Promise<any> {
  return apiCall(`/admin/partners/${firebaseId}`);
}

export function adminCreateAgreement(
  partnerId: string,
  data: Partial<Agreement>,
): Promise<Agreement> {
  return apiCall<Agreement>(`/admin/partners/${partnerId}/agreements`, {
    method: 'POST',
    body: data as unknown as Record<string, unknown>,
  });
}

export function adminUpdateAgreement(
  partnerId: string,
  agreementId: number,
  data: Partial<Agreement>,
): Promise<Agreement> {
  return apiCall<Agreement>(`/admin/partners/${partnerId}/agreements/${agreementId}`, {
    method: 'PUT',
    body: data as unknown as Record<string, unknown>,
  });
}

export function adminDeleteAgreement(
  partnerId: string,
  agreementId: number,
): Promise<void> {
  return apiCall<void>(`/admin/partners/${partnerId}/agreements/${agreementId}`, {
    method: 'DELETE',
  });
}

export function adminRenewAgreement(
  partnerId: string,
  agreementId: number,
): Promise<Agreement> {
  return apiCall<Agreement>(`/admin/partners/${partnerId}/agreements/${agreementId}/renew`, {
    method: 'POST',
  });
}

export function adminGetPartnerSubscribers(
  partnerId: string,
  params?: Record<string, string>,
): Promise<PaginatedResponse<Subscriber>> {
  return apiCall<PaginatedResponse<Subscriber>>(`/admin/partners/${partnerId}/subscribers`, {
    params: params || undefined,
  });
}

export async function adminImportSubscribers(
  partnerId: string,
  file: File,
): Promise<CsvImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  return apiCall<CsvImportResult>(`/admin/partners/${partnerId}/subscribers/import`, {
    method: 'POST',
    body: formData,
  });
}

export function adminSuspendSubscriber(
  partnerId: string,
  subscriberId: number,
): Promise<void> {
  return apiCall<void>(`/admin/partners/${partnerId}/subscribers/${subscriberId}/suspend`, {
    method: 'POST',
  });
}

export function adminReactivateSubscriber(
  partnerId: string,
  subscriberId: number,
): Promise<void> {
  return apiCall<void>(`/admin/partners/${partnerId}/subscribers/${subscriberId}/reactivate`, {
    method: 'POST',
  });
}

export function adminBulkDeleteSubscribers(
  partnerId: string,
  ids: number[],
): Promise<void> {
  return apiCall<void>(`/admin/partners/${partnerId}/subscribers/bulk-delete`, {
    method: 'POST',
    body: { ids } as Record<string, unknown>,
  });
}

export function adminGetCsvImports(params?: {
  cursor?: string;
}): Promise<PaginatedResponse<CsvImportResult>> {
  const p: Record<string, string> = {};
  if (params?.cursor) p.cursor = params.cursor;

  return apiCall<PaginatedResponse<CsvImportResult>>('/admin/csv-imports', { params: p });
}

export function adminGetGlobalStats(): Promise<any> {
  return apiCall('/admin/stats');
}

export function adminGetAuditLog(params?: {
  partner_id?: string;
  cursor?: string;
}): Promise<PaginatedResponse<any>> {
  const p: Record<string, string> = {};
  if (params?.partner_id) p.partner_id = params.partner_id;
  if (params?.cursor) p.cursor = params.cursor;

  return apiCall<PaginatedResponse<any>>('/admin/audit-log', { params: p });
}
