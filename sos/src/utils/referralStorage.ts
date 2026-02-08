/**
 * referralStorage.ts
 *
 * Shared utility for storing and retrieving referral codes in localStorage
 * with 30-day expiration. Replaces the various ad-hoc localStorage patterns
 * used across client, influencer, chatter, blogger, and groupAdmin flows.
 */

// ============================================================================
// TYPES
// ============================================================================

export type ActorType = 'client' | 'influencer' | 'chatter' | 'blogger' | 'groupAdmin';
export type ReferralCodeType = 'client' | 'recruitment';

export interface StoredReferral {
  code: string;
  actorType: ActorType;
  codeType: ReferralCodeType;
  capturedAt: string; // ISO date
  expiresAt: string;  // ISO date
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** 30 days in milliseconds */
export const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** localStorage key prefix per actor type */
const STORAGE_KEY_PREFIX = 'sos_referral_';

/** Legacy keys used before this utility was created */
const LEGACY_KEYS = {
  clientCode: 'sos_referral_code',
  clientUtm: 'sos_referral_utm',
  influencerCode: 'sos_influencer_code',
  influencerCodeType: 'sos_influencer_code_type',
} as const;

// ============================================================================
// HELPERS
// ============================================================================

function getStorageKey(actorType: ActorType): string {
  return `${STORAGE_KEY_PREFIX}${actorType}`;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Store a referral code in localStorage with 30-day expiration.
 */
export function storeReferralCode(
  code: string,
  actorType: ActorType,
  codeType: ReferralCodeType = 'client',
  tracking?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    landingPage?: string;
  }
): void {
  if (typeof window === 'undefined') return;

  const now = new Date();
  const stored: StoredReferral = {
    code: code.toUpperCase(),
    actorType,
    codeType,
    capturedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ATTRIBUTION_WINDOW_MS).toISOString(),
    ...tracking,
  };

  try {
    localStorage.setItem(getStorageKey(actorType), JSON.stringify(stored));
  } catch (err) {
    console.warn('[referralStorage] Failed to store referral code:', err);
  }
}

/**
 * Get the stored referral for a given actor type.
 * Returns null if not found or expired (auto-cleans expired entries).
 */
export function getStoredReferral(actorType: ActorType): StoredReferral | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(getStorageKey(actorType));
    if (!raw) return null;

    const stored: StoredReferral = JSON.parse(raw);

    if (isExpired(stored.expiresAt)) {
      // Auto-clean expired entry
      localStorage.removeItem(getStorageKey(actorType));
      return null;
    }

    return stored;
  } catch {
    return null;
  }
}

/**
 * Shortcut: get just the referral code string for a given actor type.
 * Returns null if not found or expired.
 */
export function getStoredReferralCode(actorType: ActorType): string | null {
  const stored = getStoredReferral(actorType);
  return stored?.code ?? null;
}

/**
 * Clear the stored referral for a given actor type.
 */
export function clearStoredReferral(actorType: ActorType): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getStorageKey(actorType));
}

/**
 * Clear all stored referrals for all actor types.
 */
export function clearAllStoredReferrals(): void {
  if (typeof window === 'undefined') return;
  const actorTypes: ActorType[] = ['client', 'influencer', 'chatter', 'blogger', 'groupAdmin'];
  actorTypes.forEach((type) => localStorage.removeItem(getStorageKey(type)));
}

// ============================================================================
// LEGACY MIGRATION
// ============================================================================

/**
 * Migrate old localStorage keys to the new format.
 * Should be called once at app startup.
 *
 * Legacy keys:
 * - `sos_referral_code` + `sos_referral_utm` → client referral
 * - `sos_influencer_code` + `sos_influencer_code_type` → influencer referral
 */
export function migrateFromLegacyStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    // --- Migrate client referral ---
    const legacyClientCode = localStorage.getItem(LEGACY_KEYS.clientCode);
    if (legacyClientCode && !localStorage.getItem(getStorageKey('client'))) {
      let capturedAt = new Date().toISOString();
      let utmSource: string | undefined;
      let utmMedium: string | undefined;
      let utmCampaign: string | undefined;
      let landingPage: string | undefined;

      const legacyUtm = localStorage.getItem(LEGACY_KEYS.clientUtm);
      if (legacyUtm) {
        try {
          const parsed = JSON.parse(legacyUtm);
          capturedAt = parsed.capturedAt || capturedAt;
          utmSource = parsed.utmSource;
          utmMedium = parsed.utmMedium;
          utmCampaign = parsed.utmCampaign;
          landingPage = parsed.landingPage;
        } catch {
          // ignore invalid JSON
        }
      }

      storeReferralCode(legacyClientCode, 'client', 'client', {
        utmSource,
        utmMedium,
        utmCampaign,
        landingPage,
      });

      // Override capturedAt from legacy data if available
      const stored = localStorage.getItem(getStorageKey('client'));
      if (stored) {
        try {
          const parsed: StoredReferral = JSON.parse(stored);
          parsed.capturedAt = capturedAt;
          localStorage.setItem(getStorageKey('client'), JSON.stringify(parsed));
        } catch {
          // ignore
        }
      }

      // Remove legacy keys
      localStorage.removeItem(LEGACY_KEYS.clientCode);
      localStorage.removeItem(LEGACY_KEYS.clientUtm);
    }

    // --- Migrate influencer referral ---
    const legacyInfluencerCode = localStorage.getItem(LEGACY_KEYS.influencerCode);
    if (legacyInfluencerCode && !localStorage.getItem(getStorageKey('influencer'))) {
      const legacyType = localStorage.getItem(LEGACY_KEYS.influencerCodeType) as ReferralCodeType | null;

      storeReferralCode(
        legacyInfluencerCode,
        'influencer',
        legacyType || 'client'
      );

      // Remove legacy keys
      localStorage.removeItem(LEGACY_KEYS.influencerCode);
      localStorage.removeItem(LEGACY_KEYS.influencerCodeType);
    }
  } catch (err) {
    console.warn('[referralStorage] Legacy migration failed:', err);
  }
}
