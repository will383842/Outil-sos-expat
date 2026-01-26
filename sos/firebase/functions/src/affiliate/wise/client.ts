/**
 * Wise API Client
 *
 * HTTP client for Wise (TransferWise) API with authentication and error handling.
 */

import { logger } from "firebase-functions/v2";
import {
  getWiseApiToken,
  getWiseProfileId,
  getWiseBaseUrl,
  getWiseMode,
} from "../../lib/secrets";
import { WiseError } from "./types";

/**
 * Wise API configuration
 */
export interface WiseConfig {
  apiToken: string;
  profileId: string;
  baseUrl: string;
  sandbox: boolean;
}

/**
 * Get Wise configuration from secrets
 * Returns safe defaults during deployment (when secrets are not available)
 */
export function getWiseConfig(): WiseConfig {
  try {
    const mode = getWiseMode();
    return {
      apiToken: getWiseApiToken(),
      profileId: getWiseProfileId(),
      baseUrl: getWiseBaseUrl(),
      sandbox: mode === "sandbox",
    };
  } catch {
    // Return empty config during deployment - will be checked by isWiseConfigured
    return {
      apiToken: "",
      profileId: "",
      baseUrl: "https://api.sandbox.transferwise.tech",
      sandbox: true,
    };
  }
}

/**
 * Check if Wise is properly configured
 */
export function isWiseConfigured(): boolean {
  const config = getWiseConfig();
  return !!(config.apiToken && config.profileId);
}

/**
 * Custom error class for Wise API errors
 */
export class WiseApiError extends Error {
  public statusCode: number;
  public wiseError?: WiseError;

  constructor(message: string, statusCode: number, wiseError?: WiseError) {
    super(message);
    this.name = "WiseApiError";
    this.statusCode = statusCode;
    this.wiseError = wiseError;
  }
}

/**
 * Make a request to the Wise API
 */
export async function wiseRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  endpoint: string,
  body?: unknown,
  config?: WiseConfig
): Promise<T> {
  const wiseConfig = config || getWiseConfig();

  if (!wiseConfig.apiToken) {
    throw new WiseApiError("Wise API token not configured", 500);
  }

  const url = `${wiseConfig.baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${wiseConfig.apiToken}`,
    "Content-Type": "application/json",
  };

  logger.info("[WiseClient] Making request", {
    method,
    endpoint,
    sandbox: wiseConfig.sandbox,
  });

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    let responseData: unknown;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (!response.ok) {
      const wiseError = responseData as WiseError;
      logger.error("[WiseClient] API error", {
        statusCode: response.status,
        endpoint,
        error: wiseError,
      });

      throw new WiseApiError(
        wiseError.error_description || wiseError.error || `HTTP ${response.status}`,
        response.status,
        wiseError
      );
    }

    logger.info("[WiseClient] Request successful", {
      endpoint,
      statusCode: response.status,
    });

    return responseData as T;
  } catch (error) {
    if (error instanceof WiseApiError) {
      throw error;
    }

    logger.error("[WiseClient] Network error", {
      endpoint,
      error,
    });

    throw new WiseApiError(
      `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
      500
    );
  }
}

/**
 * Get Wise profile ID as number
 */
export function getProfileIdNumber(): number {
  const profileId = getWiseProfileId();
  const parsed = parseInt(profileId, 10);

  if (isNaN(parsed)) {
    throw new WiseApiError("Invalid Wise profile ID", 500);
  }

  return parsed;
}
