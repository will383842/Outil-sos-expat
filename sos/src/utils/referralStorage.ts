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

export type ActorType = 'client' | 'influencer' | 'chatter' | 'blogger' | 'groupAdmin' | 'partner';
export type ReferralCodeType = 'client' | 'recruitment' | 'provider';

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

/** Default attribution window: 30 days in milliseconds (overridable via setAttributionWindowDays) */
const DEFAULT_ATTRIBUTION_WINDOW_DAYS = 30;
let _attributionWindowDays = DEFAULT_ATTRIBUTION_WINDOW_DAYS;

/** Current attribution window in milliseconds (reads from admin config if set) */
export function getAttributionWindowMs(): number {
  return _attributionWindowDays * 24 * 60 * 60 * 1000;
}

/**
 * Set the attribution window from admin config.
 * Call this once at app startup after fetching config from Firestore.
 */
export function setAttributionWindowDays(days: number): void {
  if (days > 0 && days <= 365) {
    _attributionWindowDays = days;
  }
}

/** @deprecated Use getAttributionWindowMs() instead — kept for backward compat */
export const ATTRIBUTION_WINDOW_MS = DEFAULT_ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

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

function getStorageKey(actorType: ActorType, codeType?: ReferralCodeType): string {
  if (codeType && codeType !== 'client') {
    return `${STORAGE_KEY_PREFIX}${actorType}_${codeType}`;
  }
  return `${STORAGE_KEY_PREFIX}${actorType}`;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

/**
 * P3-05 FIX: Obfuscate stored data to prevent casual reading via XSS.
 * Not encryption (codes are public), just prevents plain-text exposure.
 */
function obfuscate(data: string): string {
  try {
    return btoa(encodeURIComponent(data));
  } catch {
    return data;
  }
}

function deobfuscate(data: string): string {
  try {
    return decodeURIComponent(atob(data));
  } catch {
    // Fallback: try parsing as plain JSON (backward compat with old entries)
    return data;
  }
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Store a referral code in localStorage with configurable expiration.
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
    expiresAt: new Date(now.getTime() + getAttributionWindowMs()).toISOString(),
    ...tracking,
  };

  try {
    localStorage.setItem(getStorageKey(actorType, codeType), obfuscate(JSON.stringify(stored)));
  } catch (err) {
    console.warn('[referralStorage] Failed to store referral code:', err);
  }
}

/**
 * Get the stored referral for a given actor type and optional code type.
 * If codeType is specified, looks for that specific key first.
 * If codeType is omitted, checks 'provider' first, then 'recruitment', then legacy (no suffix).
 * Returns null if not found or expired (auto-cleans expired entries).
 */
export function getStoredReferral(actorType: ActorType, codeType?: ReferralCodeType): StoredReferral | null {
  if (typeof window === 'undefined') return null;

  // If specific codeType requested, look only there
  if (codeType) {
    return _getFromKey(getStorageKey(actorType, codeType));
  }

  // Otherwise check all keys: provider → recruitment → legacy (client/no suffix)
  return _getFromKey(getStorageKey(actorType, 'provider'))
    || _getFromKey(getStorageKey(actorType, 'recruitment'))
    || _getFromKey(getStorageKey(actorType));
}

function _getFromKey(key: string): StoredReferral | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const stored: StoredReferral = JSON.parse(deobfuscate(raw));

    if (isExpired(stored.expiresAt)) {
      localStorage.removeItem(key);
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
 * Clear the stored referral for a given actor type (all codeType variants).
 */
export function clearStoredReferral(actorType: ActorType): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getStorageKey(actorType));
  localStorage.removeItem(getStorageKey(actorType, 'recruitment'));
  localStorage.removeItem(getStorageKey(actorType, 'provider'));
}

/**
 * Clear all stored referrals for all actor types.
 */
export function clearAllStoredReferrals(): void {
  if (typeof window === 'undefined') return;
  const actorTypes: ActorType[] = ['client', 'influencer', 'chatter', 'blogger', 'groupAdmin', 'partner'];
  actorTypes.forEach((type) => clearStoredReferral(type));
}

// ============================================================================
// REFERRAL EXPIRATION STATUS — P1-2: Inform users when their referral link expired
// ============================================================================

/**
 * Check if a referral code has expired or is about to expire.
 * Returns status + days remaining for UI display.
 */
export function getReferralExpirationStatus(actorType: ActorType): {
  hasReferral: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number | null;
} {
  if (typeof window === 'undefined') {
    return { hasReferral: false, isExpired: false, isExpiringSoon: false, daysRemaining: null };
  }

  // Check all keys for this actor type
  const keys = [
    getStorageKey(actorType),
    getStorageKey(actorType, 'recruitment'),
    getStorageKey(actorType, 'provider'),
  ];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const stored: StoredReferral = JSON.parse(deobfuscate(raw));
      const expiresAt = new Date(stored.expiresAt).getTime();
      const now = Date.now();
      const daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)));

      if (isExpired(stored.expiresAt)) {
        localStorage.removeItem(key);
        return { hasReferral: true, isExpired: true, isExpiringSoon: false, daysRemaining: 0 };
      }

      return {
        hasReferral: true,
        isExpired: false,
        isExpiringSoon: daysRemaining <= 3,
        daysRemaining,
      };
    } catch {
      continue;
    }
  }

  return { hasReferral: false, isExpired: false, isExpiringSoon: false, daysRemaining: null };
}

// ============================================================================
// CROSS-TRACKING: Find ANY stored referral code across all roles
// ============================================================================

/**
 * Derive the client referral code from a recruitment or provider code.
 * Convention: REC-XXXX → XXXX, PROV-XXXX → XXXX (strips prefix).
 * If code has no prefix, returns as-is (already a client code).
 */
export function deriveClientCode(code: string): string {
  const upper = code.toUpperCase();
  // Influencer provider: PROV-INF-MARIE123 → MARIE123 (must check before generic PROV-)
  if (upper.startsWith('PROV-INF-')) return upper.slice(9);
  // Generic: REC-XXX → XXX, PROV-XXX → XXX
  // Works for chatter (REC-JEAN456), blogger (REC-BLOG-JEAN456 → BLOG-JEAN456),
  // groupAdmin (REC-GROUP-JEAN456 → GROUP-JEAN456) because BLOG-/GROUP- is part of client code
  if (upper.startsWith('REC-')) return upper.slice(4);
  if (upper.startsWith('PROV-')) return upper.slice(5);
  return upper;
}

/**
 * Cross-tracking: scan ALL stored referral codes across ALL roles and code types.
 * Returns the best available referral code (client-derived) regardless of which
 * link the user originally clicked.
 *
 * Use case: User clicks /rec/c/REC-ALICE123 (chatter recruitment link) but
 * registers as a client instead. Without cross-tracking, the affiliate gets
 * no commission. This function finds the stored recruitment code and derives
 * the client code (ALICE123) so the affiliate is still credited.
 *
 * Priority: exact role match first, then any role; client > recruitment > provider.
 */
export function getBestAvailableReferralCode(preferredActorType?: ActorType): string | null {
  if (typeof window === 'undefined') return null;

  const allActors: ActorType[] = ['client', 'chatter', 'blogger', 'influencer', 'groupAdmin', 'partner'];
  const allCodeTypes: (ReferralCodeType | undefined)[] = [undefined, 'client', 'recruitment', 'provider'];

  // 1. Preferred actor first (exact match)
  if (preferredActorType) {
    const stored = getStoredReferral(preferredActorType);
    if (stored) return deriveClientCode(stored.code);
  }

  // 2. Scan all actors and code types
  for (const actor of allActors) {
    if (actor === preferredActorType) continue; // already checked
    for (const codeType of allCodeTypes) {
      const stored = getStoredReferral(actor, codeType);
      if (stored) return deriveClientCode(stored.code);
    }
  }

  return null;
}

// ============================================================================
// UNIFIED REFERRAL SYSTEM (Phase 7)
// ============================================================================

/** Single unified localStorage key — role-agnostic */
const UNIFIED_STORAGE_KEY = 'sos_referral';

/**
 * Store a referral code in the unified format.
 * Also stores in legacy role-specific keys for backward compatibility.
 * Also stores in sessionStorage under 'pendingReferralCode' for RegisterClient.
 *
 * @param code - The referral code (any format: client, recruitment, provider)
 * @param tracking - Optional UTM and landing page data
 */
export function storeUnifiedReferral(
  code: string,
  tracking?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    landingPage?: string;
  }
): void {
  if (typeof window === 'undefined') return;

  const upperCode = code.toUpperCase();
  const clientCode = deriveClientCode(upperCode);
  const now = new Date();

  const stored: StoredReferral = {
    code: upperCode,
    actorType: 'client', // unified = role-agnostic, stored as 'client'
    codeType: 'client',
    capturedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + getAttributionWindowMs()).toISOString(),
    ...tracking,
  };

  try {
    localStorage.setItem(UNIFIED_STORAGE_KEY, obfuscate(JSON.stringify(stored)));

    // Backward compatibility: also store in legacy 'client' key
    storeReferralCode(clientCode, 'client', 'client', tracking);

    // sessionStorage for RegisterClient Google Auth flow
    sessionStorage.setItem('pendingReferralCode', clientCode);
  } catch (err) {
    console.warn('[referralStorage] Failed to store unified referral:', err);
  }
}

/**
 * Get the referral code from the unified system with 3-level fallback:
 * 1. Unified key (sos_referral) — new format
 * 2. Legacy role-specific keys — old format via getBestAvailableReferralCode()
 * 3. sessionStorage (pendingReferralCode) — last resort
 *
 * Returns the derived client code (prefixes stripped) or null if not found/expired.
 */
export function getUnifiedReferralCode(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Unified key
  try {
    const raw = localStorage.getItem(UNIFIED_STORAGE_KEY);
    if (raw) {
      const stored: StoredReferral = JSON.parse(deobfuscate(raw));
      if (!isExpired(stored.expiresAt)) {
        return deriveClientCode(stored.code);
      }
      // Auto-clean expired
      localStorage.removeItem(UNIFIED_STORAGE_KEY);
    }
  } catch {
    // continue to fallback
  }

  // 2. Legacy role-specific keys (cross-tracking scan)
  const legacyCode = getBestAvailableReferralCode();
  if (legacyCode) return legacyCode;

  // 3. sessionStorage (pendingReferralCode)
  try {
    const pending = sessionStorage.getItem('pendingReferralCode');
    if (pending) return pending.toUpperCase();
  } catch {
    // sessionStorage not available
  }

  return null;
}

/**
 * Get the full unified StoredReferral object (with tracking data).
 * Same 3-level fallback as getUnifiedReferralCode() but returns the full object.
 */
export function getUnifiedReferral(): StoredReferral | null {
  if (typeof window === 'undefined') return null;

  // 1. Unified key
  try {
    const raw = localStorage.getItem(UNIFIED_STORAGE_KEY);
    if (raw) {
      const stored: StoredReferral = JSON.parse(deobfuscate(raw));
      if (!isExpired(stored.expiresAt)) return stored;
      localStorage.removeItem(UNIFIED_STORAGE_KEY);
    }
  } catch {
    // continue to fallback
  }

  // 2. Legacy role-specific keys
  const allActors: ActorType[] = ['client', 'chatter', 'blogger', 'influencer', 'groupAdmin', 'partner'];
  for (const actor of allActors) {
    const stored = getStoredReferral(actor);
    if (stored) return stored;
  }

  return null;
}

/**
 * Clear the unified referral + all legacy keys.
 * Call after successful registration.
 */
export function clearUnifiedReferral(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(UNIFIED_STORAGE_KEY);
    sessionStorage.removeItem('pendingReferralCode');
  } catch {
    // ignore
  }
  clearAllStoredReferrals();
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
          const parsed: StoredReferral = JSON.parse(deobfuscate(stored));
          parsed.capturedAt = capturedAt;
          localStorage.setItem(getStorageKey('client'), obfuscate(JSON.stringify(parsed)));
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

// ============================================================================
// DYNAMIC CONFIG INITIALIZATION
// ============================================================================

let _configInitialized = false;

/**
 * Load attribution window from Firestore affiliate_config/current.
 * Call once at app startup. Uses a local cache key to avoid fetching on every page load.
 * Falls back to 30 days if fetch fails.
 */
export async function initAttributionWindowFromConfig(): Promise<void> {
  if (_configInitialized) return;
  _configInitialized = true;

  try {
    // Check localStorage cache first (refreshed every 1 hour)
    const cached = localStorage.getItem('sos_attribution_window_cache');
    if (cached) {
      const { days, cachedAt } = JSON.parse(cached);
      const ONE_HOUR = 60 * 60 * 1000;
      if (Date.now() - cachedAt < ONE_HOUR && days > 0) {
        setAttributionWindowDays(days);
        return;
      }
    }

    // Fetch from Firestore
    const { getFirestore, doc, getDoc } = await import('firebase/firestore');
    const { getApp } = await import('firebase/app');
    const db = getFirestore(getApp());
    const configDoc = await getDoc(doc(db, 'affiliate_config', 'current'));

    if (configDoc.exists()) {
      const windowDays = configDoc.data()?.attribution?.windowDays;
      if (typeof windowDays === 'number' && windowDays > 0) {
        setAttributionWindowDays(windowDays);
        localStorage.setItem('sos_attribution_window_cache', JSON.stringify({
          days: windowDays,
          cachedAt: Date.now(),
        }));
      }
    }
  } catch (err) {
    // Silent fail — uses default 30 days
    console.warn('[referralStorage] Failed to load attribution window from config:', err);
  }
}
