/**
 * Connection Logging System for SOS-Expat
 *
 * Logs and monitors all connection events:
 * - User logins/logouts
 * - Token refreshes
 * - API access
 * - Admin actions
 *
 * Features:
 * - IP geolocation using ip-api.com
 * - 90-day TTL for automatic cleanup
 * - Aggregated stats for monitoring
 * - Firebase Auth triggers for automatic login/logout logging
 *
 * @version 1.0.0
 */

import * as functions from 'firebase-functions/v1';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { ALLOWED_ORIGINS } from '../lib/functionConfigs';
// fetch is available natively in Node.js 22 - no import needed

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  COLLECTION: 'connection_logs',
  TTL_DAYS: 90,
  IP_API_URL: 'http://ip-api.com/json',
  IP_API_TIMEOUT_MS: 3000,
  MAX_LOGS_PER_QUERY: 500,
  REGION: 'europe-west1'
};

// ============================================================================
// TYPES
// ============================================================================

/**
 * Event types for connection logging
 */
export type ConnectionEventType =
  | 'login'
  | 'logout'
  | 'token_refresh'
  | 'api_access'
  | 'admin_action';

/**
 * Services that can generate connection events
 */
export type ConnectionService =
  | 'firebase_auth'
  | 'admin_console'
  | 'twilio'
  | 'stripe'
  | 'google_cloud'
  | 'api';

/**
 * Geolocation data from IP
 */
export interface GeoLocation {
  country: string | null;
  city: string | null;
  region: string | null;
  countryCode?: string | null;
  timezone?: string | null;
  isp?: string | null;
}

/**
 * Device information
 */
export interface DeviceInfo {
  type?: string;
  os?: string;
  browser?: string;
  version?: string;
}

/**
 * Connection log entry schema
 */
export interface ConnectionLog {
  id: string;
  eventType: ConnectionEventType;
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
  service: ConnectionService;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: DeviceInfo | null;
  geoLocation: GeoLocation | null;
  timestamp: FirebaseFirestore.Timestamp;
  sessionId: string | null;
  metadata: Record<string, unknown>;
  expireAt: FirebaseFirestore.Timestamp;
}

/**
 * Input for logging a connection
 */
export interface LogConnectionInput {
  eventType: ConnectionEventType;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  service: ConnectionService;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: DeviceInfo | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Filters for querying connection logs
 */
export interface ConnectionLogsFilter {
  userId?: string;
  service?: ConnectionService;
  eventType?: ConnectionEventType;
  action?: string;
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  limit?: number;
  offset?: number;
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  period: {
    start: string;
    end: string;
  };
  totalLogins: number;
  totalLogouts: number;
  uniqueUsers: number;
  loginsByDay: Array<{ date: string; count: number }>;
  loginsByService: Record<string, number>;
  topUsers: Array<{ userId: string; email: string | null; count: number }>;
  geoDistribution: Record<string, number>;
  failedLogins: number;
}

// ============================================================================
// IP GEOLOCATION
// ============================================================================

/**
 * Get geolocation data from IP address using ip-api.com (free tier)
 * Rate limit: 45 requests/minute for free tier
 */
async function getGeoLocation(ipAddress: string | null): Promise<GeoLocation | null> {
  if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') {
    return null;
  }

  // Skip private/local IPs
  if (
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('172.16.') ||
    ipAddress.startsWith('172.17.') ||
    ipAddress.startsWith('172.18.') ||
    ipAddress.startsWith('172.19.') ||
    ipAddress.startsWith('172.2') ||
    ipAddress.startsWith('172.30.') ||
    ipAddress.startsWith('172.31.')
  ) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.IP_API_TIMEOUT_MS);

    const response = await fetch(`${CONFIG.IP_API_URL}/${ipAddress}?fields=status,country,countryCode,region,regionName,city,timezone,isp`, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn('[ConnectionLogs] IP geolocation API returned non-OK status', {
        status: response.status,
        ipAddress
      });
      return null;
    }

    const data = await response.json() as {
      status: string;
      country?: string;
      countryCode?: string;
      region?: string;
      regionName?: string;
      city?: string;
      timezone?: string;
      isp?: string;
    };

    if (data.status !== 'success') {
      return null;
    }

    return {
      country: data.country || null,
      countryCode: data.countryCode || null,
      city: data.city || null,
      region: data.regionName || data.region || null,
      timezone: data.timezone || null,
      isp: data.isp || null
    };
  } catch (error) {
    // Don't log aborted requests (timeout)
    if (error instanceof Error && error.name !== 'AbortError') {
      logger.warn('[ConnectionLogs] Failed to get IP geolocation', {
        error: error.message,
        ipAddress
      });
    }
    return null;
  }
}

/**
 * Parse user agent string for device info
 */
function parseUserAgent(userAgent: string | null): DeviceInfo | null {
  if (!userAgent) return null;

  const deviceInfo: DeviceInfo = {};

  // Detect OS
  if (userAgent.includes('Windows')) {
    deviceInfo.os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    deviceInfo.os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    deviceInfo.os = 'Linux';
  } else if (userAgent.includes('Android')) {
    deviceInfo.os = 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    deviceInfo.os = 'iOS';
  }

  // Detect browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    deviceInfo.browser = 'Chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    deviceInfo.browser = 'Safari';
  } else if (userAgent.includes('Firefox')) {
    deviceInfo.browser = 'Firefox';
  } else if (userAgent.includes('Edg')) {
    deviceInfo.browser = 'Edge';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    deviceInfo.browser = 'Opera';
  }

  // Detect device type
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    deviceInfo.type = 'mobile';
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    deviceInfo.type = 'tablet';
  } else {
    deviceInfo.type = 'desktop';
  }

  return Object.keys(deviceInfo).length > 0 ? deviceInfo : null;
}

// ============================================================================
// CORE LOGGING FUNCTION
// ============================================================================

/**
 * Calculate expiration date for TTL
 */
function calculateExpireAt(): FirebaseFirestore.Timestamp {
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + CONFIG.TTL_DAYS);
  return admin.firestore.Timestamp.fromDate(expireDate);
}

/**
 * Generate unique log ID
 */
function generateLogId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Internal function to create a connection log entry
 */
async function createConnectionLog(input: LogConnectionInput): Promise<string> {
  const db = admin.firestore();
  const logId = generateLogId();

  // Get geolocation in parallel with creating the log
  const geoLocationPromise = getGeoLocation(input.ipAddress || null);
  const deviceInfo = parseUserAgent(input.userAgent || null);

  const geoLocation = await geoLocationPromise;

  const logEntry: ConnectionLog = {
    id: logId,
    eventType: input.eventType,
    userId: input.userId || null,
    userEmail: input.userEmail || null,
    userRole: input.userRole || null,
    service: input.service,
    action: input.action,
    ipAddress: input.ipAddress || null,
    userAgent: input.userAgent || null,
    deviceInfo: deviceInfo || input.deviceInfo || null,
    geoLocation,
    timestamp: admin.firestore.Timestamp.now(),
    sessionId: input.sessionId || null,
    metadata: input.metadata || {},
    expireAt: calculateExpireAt()
  };

  await db.collection(CONFIG.COLLECTION).doc(logId).set(logEntry);

  logger.info('[ConnectionLogs] Created connection log', {
    logId,
    eventType: input.eventType,
    service: input.service,
    action: input.action,
    userId: input.userId
  });

  return logId;
}

// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================

/**
 * Log a connection event (callable from client or server)
 */
export const logConnection = onCall(
  {
    region: CONFIG.REGION,
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    const data = request.data as LogConnectionInput;

    // Validate required fields
    if (!data.eventType || !data.service || !data.action) {
      throw new HttpsError(
        'invalid-argument',
        'eventType, service, and action are required'
      );
    }

    // Validate event type
    const validEventTypes: ConnectionEventType[] = [
      'login', 'logout', 'token_refresh', 'api_access', 'admin_action'
    ];
    if (!validEventTypes.includes(data.eventType)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}`
      );
    }

    // Validate service
    const validServices: ConnectionService[] = [
      'firebase_auth', 'admin_console', 'twilio', 'stripe', 'google_cloud', 'api'
    ];
    if (!validServices.includes(data.service)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid service. Must be one of: ${validServices.join(', ')}`
      );
    }

    // If authenticated, use auth context
    const auth = request.auth;
    const userId = data.userId || auth?.uid || null;
    const userEmail = data.userEmail || auth?.token?.email || null;

    // Get user role if not provided
    let userRole = data.userRole;
    if (!userRole && userId) {
      try {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        userRole = userDoc.data()?.role || null;
      } catch {
        userRole = null;
      }
    }

    try {
      const logId = await createConnectionLog({
        ...data,
        userId,
        userEmail,
        userRole
      });

      return { success: true, logId };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[ConnectionLogs] Failed to create connection log', {
        error: err.message,
        data
      });
      throw new HttpsError('internal', 'Failed to create connection log');
    }
  }
);

/**
 * Get connection logs with filters (admin only)
 */
export const getConnectionLogs = onCall(
  {
    region: CONFIG.REGION,
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Check admin role
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const filters = request.data as ConnectionLogsFilter;
    const db = admin.firestore();
    const limit = Math.min(filters.limit || 100, CONFIG.MAX_LOGS_PER_QUERY);

    try {
      let query: FirebaseFirestore.Query = db.collection(CONFIG.COLLECTION);

      // Apply filters
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      if (filters.service) {
        query = query.where('service', '==', filters.service);
      }
      if (filters.eventType) {
        query = query.where('eventType', '==', filters.eventType);
      }
      if (filters.action) {
        query = query.where('action', '==', filters.action);
      }
      if (filters.startDate) {
        const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(filters.startDate));
        query = query.where('timestamp', '>=', startTimestamp);
      }
      if (filters.endDate) {
        const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(filters.endDate));
        query = query.where('timestamp', '<=', endTimestamp);
      }

      // Order and limit
      query = query.orderBy('timestamp', 'desc').limit(limit);

      // Apply offset if provided (using startAfter with cursor would be better for large datasets)
      if (filters.offset && filters.offset > 0) {
        // For simplicity, we fetch offset + limit and skip offset items
        // In production, consider using cursor-based pagination
        query = query.limit(limit + filters.offset);
      }

      const snapshot = await query.get();

      let logs = snapshot.docs.map(doc => ({
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString(),
        expireAt: doc.data().expireAt?.toDate?.()?.toISOString()
      }));

      // Apply offset
      if (filters.offset && filters.offset > 0) {
        logs = logs.slice(filters.offset);
      }

      return {
        logs,
        count: logs.length,
        hasMore: logs.length === limit
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[ConnectionLogs] Failed to get connection logs', {
        error: err.message,
        filters
      });
      throw new HttpsError('internal', err.message);
    }
  }
);

/**
 * Get aggregated connection statistics (admin only)
 */
export const getConnectionStats = onCall(
  {
    region: CONFIG.REGION,
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 120,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Check admin role
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { days = 7 } = request.data as { days?: number };
    const db = admin.firestore();

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
      const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

      // Get all logs in the period
      const logsSnapshot = await db.collection(CONFIG.COLLECTION)
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<=', endTimestamp)
        .get();

      // Process logs
      const logs = logsSnapshot.docs.map(doc => doc.data() as ConnectionLog);

      // Calculate statistics
      const uniqueUsers = new Set<string>();
      const loginsByDay: Record<string, number> = {};
      const loginsByService: Record<string, number> = {};
      const userLoginCounts: Record<string, { email: string | null; count: number }> = {};
      const geoDistribution: Record<string, number> = {};
      let totalLogins = 0;
      let totalLogouts = 0;
      let failedLogins = 0;

      for (const log of logs) {
        // Count unique users
        if (log.userId) {
          uniqueUsers.add(log.userId);
        }

        // Count logins/logouts
        if (log.eventType === 'login') {
          totalLogins++;

          if (log.action === 'login_failed') {
            failedLogins++;
          }

          // Logins by day
          const dayKey = log.timestamp.toDate().toISOString().split('T')[0];
          loginsByDay[dayKey] = (loginsByDay[dayKey] || 0) + 1;

          // Logins by service
          loginsByService[log.service] = (loginsByService[log.service] || 0) + 1;

          // User login counts
          if (log.userId) {
            if (!userLoginCounts[log.userId]) {
              userLoginCounts[log.userId] = { email: log.userEmail, count: 0 };
            }
            userLoginCounts[log.userId].count++;
          }

          // Geo distribution
          if (log.geoLocation?.country) {
            geoDistribution[log.geoLocation.country] = (geoDistribution[log.geoLocation.country] || 0) + 1;
          }
        } else if (log.eventType === 'logout') {
          totalLogouts++;
        }
      }

      // Sort logins by day
      const loginsByDayArray = Object.entries(loginsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      // Get top users (by login count)
      const topUsers = Object.entries(userLoginCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 10)
        .map(([userId, data]) => ({ userId, email: data.email, count: data.count }));

      const stats: ConnectionStats = {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        totalLogins,
        totalLogouts,
        uniqueUsers: uniqueUsers.size,
        loginsByDay: loginsByDayArray,
        loginsByService,
        topUsers,
        geoDistribution,
        failedLogins
      };

      return stats;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[ConnectionLogs] Failed to get connection stats', {
        error: err.message
      });
      throw new HttpsError('internal', err.message);
    }
  }
);

// ============================================================================
// FIREBASE AUTH TRIGGERS
// ============================================================================

/**
 * Automatically log successful user sign-ins
 */
export const onUserSignIn = functions
  .region(CONFIG.REGION)
  .auth.user()
  .beforeSignIn(async (user, context) => {
    try {
      // Get user role from Firestore
      let userRole: string | null = null;
      try {
        const userDoc = await admin.firestore().collection('users').doc(user.uid).get();
        userRole = userDoc.data()?.role || null;
      } catch {
        // User might not exist in Firestore yet
      }

      // Extract IP from context if available
      const ipAddress = context.ipAddress || null;
      const userAgent = context.userAgent || null;

      await createConnectionLog({
        eventType: 'login',
        userId: user.uid,
        userEmail: user.email || null,
        userRole,
        service: 'firebase_auth',
        action: 'login_success',
        ipAddress,
        userAgent,
        sessionId: null,
        metadata: {
          provider: context.credential?.providerId || 'password',
          signInMethod: context.credential?.signInMethod || 'email',
          isNewUser: context.additionalUserInfo?.isNewUser || false
        }
      });
    } catch (error) {
      // Don't block sign-in if logging fails
      logger.error('[ConnectionLogs] Failed to log sign-in', {
        error: error instanceof Error ? error.message : String(error),
        userId: user.uid
      });
    }

    // Return undefined to allow sign-in to proceed
    return;
  });

/**
 * Log when a user is deleted (acts as logout indicator)
 * Note: Firebase doesn't have a direct signOut trigger, so we use user deletion
 * For actual logout tracking, clients should call logConnection with eventType='logout'
 */
export const onUserDeletedConnectionLog = functions
  .region(CONFIG.REGION)
  .auth.user()
  .onDelete(async (user) => {
    try {
      await createConnectionLog({
        eventType: 'logout',
        userId: user.uid,
        userEmail: user.email || null,
        userRole: null,
        service: 'firebase_auth',
        action: 'account_deleted',
        ipAddress: null,
        userAgent: null,
        sessionId: null,
        metadata: {
          deletedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('[ConnectionLogs] Failed to log user deletion', {
        error: error instanceof Error ? error.message : String(error),
        userId: user.uid
      });
    }
  });

// ============================================================================
// HTTP MIDDLEWARE HELPER
// ============================================================================

/**
 * Express middleware helper for logging API access
 * Use this in your HTTP functions to automatically log API requests
 *
 * @example
 * const app = express();
 * app.use(createApiAccessLogger('my_api'));
 */
export function createApiAccessLogger(serviceName: ConnectionService = 'api') {
  return async (
    req: { headers: Record<string, string | string[] | undefined>; method?: string; path?: string; ip?: string },
    _res: unknown,
    next: () => void
  ) => {
    try {
      // Extract headers
      const forwardedFor = req.headers['x-forwarded-for'];
      const ipAddress = typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0].trim()
        : req.ip || null;

      const userAgent = typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : null;

      // Extract user ID from authorization header if present
      let userId: string | null = null;
      const authHeader = req.headers['authorization'];
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split('Bearer ')[1];
          const decodedToken = await admin.auth().verifyIdToken(token);
          userId = decodedToken.uid;
        } catch {
          // Invalid token, proceed without userId
        }
      }

      // Log asynchronously (don't block the request)
      createConnectionLog({
        eventType: 'api_access',
        userId,
        userEmail: null,
        userRole: null,
        service: serviceName,
        action: `${req.method || 'UNKNOWN'} ${req.path || '/'}`,
        ipAddress,
        userAgent,
        sessionId: null,
        metadata: {
          method: req.method,
          path: req.path
        }
      }).catch(error => {
        logger.warn('[ConnectionLogs] Failed to log API access', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    } catch (error) {
      logger.warn('[ConnectionLogs] Error in API access logger middleware', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    next();
  };
}

/**
 * Helper function for logging admin actions
 * Use this to log administrative operations
 */
export async function logAdminAction(
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {},
  context?: {
    ipAddress?: string | null;
    userAgent?: string | null;
    userEmail?: string | null;
    userRole?: string | null;
  }
): Promise<string> {
  return createConnectionLog({
    eventType: 'admin_action',
    userId,
    userEmail: context?.userEmail || null,
    userRole: context?.userRole || 'admin',
    service: 'admin_console',
    action,
    ipAddress: context?.ipAddress || null,
    userAgent: context?.userAgent || null,
    sessionId: null,
    metadata
  });
}

/**
 * Helper function for logging API/service connections
 * Use this to log connections to external services
 */
export async function logServiceConnection(
  service: ConnectionService,
  action: string,
  metadata: Record<string, unknown> = {},
  userId?: string | null
): Promise<string> {
  return createConnectionLog({
    eventType: 'api_access',
    userId: userId || null,
    userEmail: null,
    userRole: null,
    service,
    action,
    ipAddress: null,
    userAgent: null,
    sessionId: null,
    metadata
  });
}

// ============================================================================
// V1 CALLABLE WRAPPERS (for compatibility)
// ============================================================================

/**
 * V1 wrapper for logConnection
 */
export const logConnectionV1 = functions
  .region(CONFIG.REGION)
  .https.onCall(async (data: LogConnectionInput, context) => {
    // Validate required fields
    if (!data.eventType || !data.service || !data.action) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'eventType, service, and action are required'
      );
    }

    const userId = data.userId || context.auth?.uid || null;
    const userEmail = data.userEmail || context.auth?.token?.email || null;

    try {
      const logId = await createConnectionLog({
        ...data,
        userId,
        userEmail
      });

      return { success: true, logId };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

// ============================================================================
// EXPORTS
// ============================================================================

export {
  createConnectionLog,
  getGeoLocation,
  parseUserAgent,
  CONFIG as CONNECTION_LOGS_CONFIG
};
