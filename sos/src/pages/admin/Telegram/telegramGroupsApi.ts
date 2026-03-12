/**
 * Telegram Groups & Bots - API Service
 * Wraps telegramEngineApi for group and bot management endpoints.
 * All requests are authenticated via Firebase ID token.
 *
 * Laravel API returns: { success: bool, data: ... }
 */

import { telegramEngineApi } from '../../../config/telegramEngine';
import type { TelegramGroup, TelegramBot, TelegramGroupManager } from './types';

/** Standard Laravel API response wrapper */
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ---------------------------------------------------------------------------
// Groups API
// ---------------------------------------------------------------------------

/** Fetch all groups, optionally filtered by role */
export async function fetchTelegramGroups(role?: string): Promise<TelegramGroup[]> {
  const params = role ? { role } : undefined;
  const res = await telegramEngineApi<ApiResponse<TelegramGroup[]>>('/groups', { params });
  return res.data ?? [];
}

/** Create a new Telegram group */
export async function createTelegramGroup(
  data: Omit<TelegramGroup, 'id' | 'managers' | 'created_at' | 'updated_at'>
): Promise<TelegramGroup> {
  const res = await telegramEngineApi<ApiResponse<TelegramGroup>>('/groups', {
    method: 'POST',
    body: data as unknown as Record<string, unknown>,
  });
  return res.data;
}

/** Update an existing Telegram group */
export async function updateTelegramGroup(
  id: number,
  data: Partial<TelegramGroup>
): Promise<TelegramGroup> {
  const res = await telegramEngineApi<ApiResponse<TelegramGroup>>(`/groups/${id}`, {
    method: 'PUT',
    body: data as unknown as Record<string, unknown>,
  });
  return res.data;
}

/** Delete a Telegram group */
export async function deleteTelegramGroup(id: number): Promise<void> {
  await telegramEngineApi(`/groups/${id}`, { method: 'DELETE' });
}

/** Add a manager to a group */
export async function addGroupManager(
  groupId: number,
  manager: Omit<TelegramGroupManager, 'assignedAt' | 'assignedBy'>
): Promise<TelegramGroup> {
  const res = await telegramEngineApi<{ success: boolean; group: TelegramGroup }>(`/groups/${groupId}/managers`, {
    method: 'POST',
    body: manager as unknown as Record<string, unknown>,
  });
  return res.group;
}

/** Remove a manager from a group */
export async function removeGroupManager(
  groupId: number,
  managerId: string
): Promise<TelegramGroup> {
  const res = await telegramEngineApi<{ success: boolean; group: TelegramGroup }>(`/groups/${groupId}/managers/${managerId}`, {
    method: 'DELETE',
  });
  return res.group;
}

/** Seed groups from the default configuration */
export async function seedTelegramGroups(): Promise<{ count: number }> {
  const res = await telegramEngineApi<{ success: boolean; created: number; total: number }>('/groups/seed', { method: 'POST' });
  return { count: res.created };
}

/** Generate continent-based groups for a given role */
export async function generateContinentGroups(role: string): Promise<{ count: number }> {
  const res = await telegramEngineApi<{ success: boolean; created: number }>('/groups/generate-continent', {
    method: 'POST',
    body: { role },
  });
  return { count: res.created };
}

/** Generate language-based groups for a given role */
export async function generateLanguageGroups(role: string): Promise<{ count: number }> {
  const res = await telegramEngineApi<{ success: boolean; created: number }>('/groups/generate-language', {
    method: 'POST',
    body: { role },
  });
  return { count: res.created };
}

// ---------------------------------------------------------------------------
// Bots API
// ---------------------------------------------------------------------------

/** Raw bot shape from the Laravel API (token is masked) */
interface ApiBotData {
  id: number;
  slug: string;
  name: string;
  token_masked: string;
  recipient_chat_id: string | null;
  notifications: Record<string, boolean>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Map API bot data to frontend TelegramBot shape */
function mapBot(raw: ApiBotData): TelegramBot {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    token: raw.token_masked,
    recipient_chat_id: raw.recipient_chat_id,
    notifications: raw.notifications ?? {},
    is_active: raw.is_active,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

/** Fetch all configured bots */
export async function fetchTelegramBots(): Promise<TelegramBot[]> {
  const res = await telegramEngineApi<ApiResponse<ApiBotData[]>>('/bots');
  return (res.data ?? []).map(mapBot);
}

/** Update a bot's configuration */
export async function updateTelegramBot(
  id: number,
  data: Partial<TelegramBot>
): Promise<TelegramBot> {
  const res = await telegramEngineApi<ApiResponse<ApiBotData>>(`/bots/${id}`, {
    method: 'PUT',
    body: data as unknown as Record<string, unknown>,
  });
  return mapBot(res.data);
}

/** Validate a bot's token with the Telegram API */
export async function validateTelegramBot(
  id: number
): Promise<{ valid: boolean; username?: string; first_name?: string }> {
  const res = await telegramEngineApi<{ ok: boolean; botUsername?: string; botFirstName?: string }>(`/bots/${id}/validate`, { method: 'POST' });
  return {
    valid: res.ok,
    username: res.botUsername,
    first_name: res.botFirstName,
  };
}

/** Send a test message through a bot */
export async function testTelegramBot(
  id: number
): Promise<{ success: boolean }> {
  return telegramEngineApi(`/bots/${id}/test`, { method: 'POST' });
}
