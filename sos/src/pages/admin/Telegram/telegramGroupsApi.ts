/**
 * Telegram Groups & Bots - API Service
 * Wraps telegramEngineApi for group and bot management endpoints.
 * All requests are authenticated via Firebase ID token.
 */

import { telegramEngineApi } from '../../../config/telegramEngine';
import type { TelegramGroup, TelegramBot, TelegramGroupManager } from './types';

// ---------------------------------------------------------------------------
// Groups API
// ---------------------------------------------------------------------------

/** Fetch all groups, optionally filtered by role */
export async function fetchTelegramGroups(role?: string): Promise<TelegramGroup[]> {
  const params = role ? { role } : undefined;
  const res = await telegramEngineApi<{ groups: TelegramGroup[] }>('/groups', { params });
  return res.groups;
}

/** Create a new Telegram group */
export async function createTelegramGroup(
  data: Omit<TelegramGroup, 'id' | 'managers' | 'created_at' | 'updated_at'>
): Promise<TelegramGroup> {
  return telegramEngineApi<TelegramGroup>('/groups', {
    method: 'POST',
    body: data as unknown as Record<string, unknown>,
  });
}

/** Update an existing Telegram group */
export async function updateTelegramGroup(
  id: number,
  data: Partial<TelegramGroup>
): Promise<TelegramGroup> {
  return telegramEngineApi<TelegramGroup>(`/groups/${id}`, {
    method: 'PUT',
    body: data as unknown as Record<string, unknown>,
  });
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
  return telegramEngineApi<TelegramGroup>(`/groups/${groupId}/managers`, {
    method: 'POST',
    body: manager as unknown as Record<string, unknown>,
  });
}

/** Remove a manager from a group */
export async function removeGroupManager(
  groupId: number,
  managerId: string
): Promise<TelegramGroup> {
  return telegramEngineApi<TelegramGroup>(`/groups/${groupId}/managers/${managerId}`, {
    method: 'DELETE',
  });
}

/** Seed groups from the default configuration */
export async function seedTelegramGroups(): Promise<{ count: number }> {
  return telegramEngineApi<{ count: number }>('/groups/seed', { method: 'POST' });
}

/** Generate continent-based groups for a given role */
export async function generateContinentGroups(role: string): Promise<{ count: number }> {
  return telegramEngineApi<{ count: number }>('/groups/generate-continent', {
    method: 'POST',
    body: { role },
  });
}

/** Generate language-based groups for a given role */
export async function generateLanguageGroups(role: string): Promise<{ count: number }> {
  return telegramEngineApi<{ count: number }>('/groups/generate-language', {
    method: 'POST',
    body: { role },
  });
}

// ---------------------------------------------------------------------------
// Bots API
// ---------------------------------------------------------------------------

/** Fetch all configured bots */
export async function fetchTelegramBots(): Promise<TelegramBot[]> {
  const res = await telegramEngineApi<{ bots: TelegramBot[] }>('/bots');
  return res.bots;
}

/** Update a bot's configuration */
export async function updateTelegramBot(
  id: number,
  data: Partial<TelegramBot>
): Promise<TelegramBot> {
  return telegramEngineApi<TelegramBot>(`/bots/${id}`, {
    method: 'PUT',
    body: data as unknown as Record<string, unknown>,
  });
}

/** Validate a bot's token with the Telegram API */
export async function validateTelegramBot(
  id: number
): Promise<{ valid: boolean; username?: string; first_name?: string }> {
  return telegramEngineApi(`/bots/${id}/validate`, { method: 'POST' });
}

/** Send a test message through a bot */
export async function testTelegramBot(
  id: number
): Promise<{ success: boolean }> {
  return telegramEngineApi(`/bots/${id}/test`, { method: 'POST' });
}
