/**
 * Telegram Engine API Client
 *
 * Replaces Firebase callables for the Telegram admin console.
 * All calls go directly to the Laravel engine API.
 */

import { auth } from "./firebase";

const ENGINE_BASE_URL = "https://engine-telegram-sos-expat.life-expat.com";

/**
 * Get Firebase ID token for authenticated requests
 */
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Utilisateur non connecté");
  }
  return user.getIdToken();
}

/**
 * Make an authenticated request to the Telegram Engine API
 */
export async function telegramEngineApi<T = unknown>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: Record<string, unknown>;
    params?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = "GET", body, params } = options;

  const token = await getAuthToken();

  let url = `${ENGINE_BASE_URL}/api/admin${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram Engine API error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  return json as T;
}
