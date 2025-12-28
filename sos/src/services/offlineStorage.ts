// src/services/offlineStorage.ts
/**
 * Offline Storage Service using IndexedDB
 *
 * Provides persistent offline storage for:
 * - User profile data
 * - Cached messages
 * - Favorite providers
 * - Pending actions queue
 * - App settings
 */

const DB_NAME = 'sos-expat-offline';
const DB_VERSION = 2;

// Store names
export const STORES = {
  USER_PROFILE: 'userProfile',
  MESSAGES: 'messages',
  FAVORITES: 'favorites',
  PROVIDERS: 'providers',
  PENDING_ACTIONS: 'pendingActions',
  SETTINGS: 'settings',
  CACHE_METADATA: 'cacheMetadata',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

// Types for stored data
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: string;
  phone?: string;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  read: boolean;
  synced: boolean;
}

export interface FavoriteProvider {
  id: string;
  providerId: string;
  providerName: string;
  providerType: string;
  providerPhoto?: string;
  addedAt: number;
}

export interface ProviderCache {
  id: string;
  data: Record<string, unknown>;
  cachedAt: number;
  expiresAt: number;
}

export interface PendingAction {
  id: string;
  type: 'message' | 'favorite' | 'profile' | 'review' | 'booking';
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface AppSettings {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface CacheMetadata {
  key: string;
  store: StoreName;
  cachedAt: number;
  expiresAt: number;
  size: number;
}

// Database instance
let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize IndexedDB database
 */
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('IndexedDB initialized successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // User Profile store
      if (!db.objectStoreNames.contains(STORES.USER_PROFILE)) {
        db.createObjectStore(STORES.USER_PROFILE, { keyPath: 'id' });
      }

      // Messages store with indexes
      if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
        const messagesStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
        messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
        messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        messagesStore.createIndex('synced', 'synced', { unique: false });
      }

      // Favorites store
      if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
        const favoritesStore = db.createObjectStore(STORES.FAVORITES, { keyPath: 'id' });
        favoritesStore.createIndex('providerId', 'providerId', { unique: true });
      }

      // Providers cache store
      if (!db.objectStoreNames.contains(STORES.PROVIDERS)) {
        const providersStore = db.createObjectStore(STORES.PROVIDERS, { keyPath: 'id' });
        providersStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      // Pending actions queue
      if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
        const pendingStore = db.createObjectStore(STORES.PENDING_ACTIONS, { keyPath: 'id' });
        pendingStore.createIndex('type', 'type', { unique: false });
        pendingStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      // Cache metadata store
      if (!db.objectStoreNames.contains(STORES.CACHE_METADATA)) {
        const metaStore = db.createObjectStore(STORES.CACHE_METADATA, { keyPath: 'key' });
        metaStore.createIndex('store', 'store', { unique: false });
        metaStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      console.log('IndexedDB schema upgraded to version', DB_VERSION);
    };
  });

  return dbInitPromise;
}

/**
 * Get a transaction for a store
 */
async function getTransaction(
  storeName: StoreName,
  mode: IDBTransactionMode = 'readonly'
): Promise<IDBObjectStore> {
  const db = await initDB();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

/**
 * Generic get operation
 */
export async function get<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  const store = await getTransaction(storeName);
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic getAll operation
 */
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const store = await getTransaction(storeName);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic put operation
 */
export async function put<T extends { id?: string; key?: string }>(
  storeName: StoreName,
  data: T
): Promise<string> {
  const store = await getTransaction(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result as string);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic delete operation
 */
export async function remove(storeName: StoreName, key: string): Promise<void> {
  const store = await getTransaction(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear a store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const store = await getTransaction(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// High-level API functions
// ============================================

/**
 * Save user profile for offline access
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await put(STORES.USER_PROFILE, { ...profile, updatedAt: Date.now() });
}

/**
 * Get cached user profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | undefined> {
  return get<UserProfile>(STORES.USER_PROFILE, userId);
}

/**
 * Save messages for offline access
 */
export async function saveMessages(messages: Message[]): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(STORES.MESSAGES, 'readwrite');
  const store = transaction.objectStore(STORES.MESSAGES);

  for (const message of messages) {
    store.put({ ...message, synced: true });
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get messages for a conversation
 */
export async function getMessagesByConversation(conversationId: string): Promise<Message[]> {
  const store = await getTransaction(STORES.MESSAGES);
  const index = store.index('conversationId');

  return new Promise((resolve, reject) => {
    const request = index.getAll(conversationId);
    request.onsuccess = () => {
      const messages = request.result as Message[];
      resolve(messages.sort((a, b) => a.timestamp - b.timestamp));
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Queue a pending action for later sync
 */
export async function queuePendingAction(
  type: PendingAction['type'],
  action: PendingAction['action'],
  data: Record<string, unknown>
): Promise<string> {
  const pendingAction: PendingAction = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    action,
    data,
    createdAt: Date.now(),
    retryCount: 0,
  };

  await put(STORES.PENDING_ACTIONS, pendingAction);

  // Register for background sync if available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-pending-actions');
    } catch (e) {
      console.warn('Background sync registration failed:', e);
    }
  }

  return pendingAction.id;
}

/**
 * Get all pending actions
 */
export async function getPendingActions(): Promise<PendingAction[]> {
  return getAll<PendingAction>(STORES.PENDING_ACTIONS);
}

/**
 * Remove a pending action after successful sync
 */
export async function removePendingAction(id: string): Promise<void> {
  await remove(STORES.PENDING_ACTIONS, id);
}

/**
 * Update pending action with error
 */
export async function updatePendingActionError(id: string, error: string): Promise<void> {
  const action = await get<PendingAction>(STORES.PENDING_ACTIONS, id);
  if (action) {
    action.retryCount++;
    action.lastError = error;
    await put(STORES.PENDING_ACTIONS, action);
  }
}

/**
 * Save/update a favorite provider
 */
export async function saveFavorite(favorite: FavoriteProvider): Promise<void> {
  await put(STORES.FAVORITES, favorite);
}

/**
 * Get all favorites
 */
export async function getFavorites(): Promise<FavoriteProvider[]> {
  return getAll<FavoriteProvider>(STORES.FAVORITES);
}

/**
 * Remove a favorite
 */
export async function removeFavorite(id: string): Promise<void> {
  await remove(STORES.FAVORITES, id);
}

/**
 * Cache a provider for offline access
 */
export async function cacheProvider(
  providerId: string,
  data: Record<string, unknown>,
  ttlMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): Promise<void> {
  const now = Date.now();
  const cached: ProviderCache = {
    id: providerId,
    data,
    cachedAt: now,
    expiresAt: now + ttlMs,
  };
  await put(STORES.PROVIDERS, cached);
}

/**
 * Get cached provider
 */
export async function getCachedProvider(providerId: string): Promise<Record<string, unknown> | undefined> {
  const cached = await get<ProviderCache>(STORES.PROVIDERS, providerId);
  if (!cached) return undefined;

  // Check expiration
  if (cached.expiresAt < Date.now()) {
    await remove(STORES.PROVIDERS, providerId);
    return undefined;
  }

  return cached.data;
}

/**
 * Save a setting
 */
export async function saveSetting(key: string, value: unknown): Promise<void> {
  await put(STORES.SETTINGS, { key, value, updatedAt: Date.now() });
}

/**
 * Get a setting
 */
export async function getSetting<T>(key: string): Promise<T | undefined> {
  const setting = await get<AppSettings>(STORES.SETTINGS, key);
  return setting?.value as T | undefined;
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  const db = await initDB();
  const now = Date.now();
  let cleaned = 0;

  // Clean providers cache
  const providersStore = db.transaction(STORES.PROVIDERS, 'readwrite').objectStore(STORES.PROVIDERS);
  const providersIndex = providersStore.index('expiresAt');
  const expiredRange = IDBKeyRange.upperBound(now);

  await new Promise<void>((resolve, reject) => {
    const request = providersIndex.openCursor(expiredRange);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cleaned++;
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });

  console.log(`Cleaned up ${cleaned} expired cache entries`);
  return cleaned;
}

/**
 * Get database storage estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percent: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percent: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
    };
  }
  return { usage: 0, quota: 0, percent: 0 };
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    return navigator.storage.persist();
  }
  return false;
}

/**
 * Clear all offline data (for logout)
 */
export async function clearAllOfflineData(): Promise<void> {
  await clearStore(STORES.USER_PROFILE);
  await clearStore(STORES.MESSAGES);
  await clearStore(STORES.FAVORITES);
  await clearStore(STORES.PROVIDERS);
  await clearStore(STORES.PENDING_ACTIONS);
  // Keep settings as they may be device-specific
  console.log('All offline data cleared');
}

// Export the init function for app startup
export { initDB as initOfflineStorage };
