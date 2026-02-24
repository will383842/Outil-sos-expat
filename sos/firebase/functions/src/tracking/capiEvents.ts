/**
 * Meta CAPI Event Tracking HTTP Endpoints
 *
 * Server-side tracking for client events that need CAPI correlation:
 * - Search (when users search/filter providers)
 * - ViewContent (when users view provider profiles)
 * - AddToCart (when users select a service/plan)
 *
 * These endpoints receive events from the frontend and forward them to Meta CAPI
 * with proper server-side data (IP, User-Agent) for better attribution.
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import {
  META_CAPI_TOKEN,
  trackCAPISearch,
  trackCAPIViewContent,
  trackCAPIAddToCart,
  trackCAPIAddPaymentInfo,
  trackCAPILead,
  UserData,
} from '../metaConversionsApi';
import { ALLOWED_ORIGINS } from '../lib/functionConfigs';

const REGION = 'europe-west1';

// Rate limiting: max 30 events per minute per IP
const RATE_LIMIT = {
  MAX_EVENTS: 30,
  WINDOW_MS: 60 * 1000, // 1 minute
};

/**
 * Validate event data from frontend
 */
function validateEventData(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const body = data as Record<string, unknown>;

  if (!body.eventType || typeof body.eventType !== 'string') {
    return { valid: false, error: 'eventType is required' };
  }

  const validEventTypes = ['Search', 'ViewContent', 'AddToCart', 'AddPaymentInfo', 'Contact', 'Lead'];
  if (!validEventTypes.includes(body.eventType)) {
    return { valid: false, error: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Simple rate limit check using in-memory cache
 */
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitCache.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT.WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT.MAX_EVENTS) {
    return false;
  }

  entry.count++;
  return true;
}

// Note: Cache cleanup happens automatically in checkRateLimit when entries expire
// No setInterval needed - Cloud Functions cold start resets the cache anyway

/**
 * HTTP endpoint to track CAPI events from frontend
 *
 * POST /trackCAPIEvent
 * Body: {
 *   eventType: 'Search' | 'ViewContent' | 'AddToCart',
 *   userId?: string,          // Firebase Auth UID if authenticated
 *   email?: string,           // User email
 *   phone?: string,           // User phone
 *   firstName?: string,
 *   lastName?: string,
 *   country?: string,
 *   fbp?: string,             // Facebook Browser ID
 *   fbc?: string,             // Facebook Click ID
 *   // Event-specific data:
 *   searchString?: string,    // For Search events
 *   contentName?: string,     // Provider name or plan name
 *   contentCategory?: string, // 'lawyer', 'expat', 'subscription'
 *   contentIds?: string[],    // Provider IDs or plan IDs
 *   value?: number,           // Price value
 *   currency?: string,        // EUR, USD
 *   eventSourceUrl?: string,  // Page URL
 * }
 */
export const trackCAPIEvent = onRequest(
  {
    region: REGION,
    cpu: 0.083,
    cors: ALLOWED_ORIGINS,
    maxInstances: 10,
    secrets: [META_CAPI_TOKEN],
  },
  async (req, res) => {
    // Only POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Get client IP
    const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] ||
                     req.headers['x-real-ip']?.toString() ||
                     req.ip ||
                     'unknown';

    // Rate limit check
    if (!checkRateLimit(clientIp)) {
      logger.warn(`[trackCAPIEvent] Rate limit exceeded for IP: ${clientIp.slice(0, 10)}...`);
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    // Validate request
    const validation = validateEventData(req.body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const eventType = body.eventType as string;

    try {
      // Build user data with server-side info
      const userData: UserData = {
        client_ip_address: clientIp !== 'unknown' ? clientIp : undefined,
        client_user_agent: req.headers['user-agent']?.toString(),
      };

      // Add user identifiers if provided
      if (body.userId) userData.external_id = String(body.userId);
      if (body.email) userData.em = String(body.email).toLowerCase().trim();
      if (body.phone) userData.ph = String(body.phone).replace(/[^0-9+]/g, '');
      if (body.firstName) userData.fn = String(body.firstName).toLowerCase().trim();
      if (body.lastName) userData.ln = String(body.lastName).toLowerCase().trim();
      if (body.country) userData.country = String(body.country).toLowerCase().trim();
      if (body.fbp) userData.fbp = String(body.fbp);
      if (body.fbc) userData.fbc = String(body.fbc);

      let result;
      const eventSourceUrl = body.eventSourceUrl ? String(body.eventSourceUrl) : undefined;

      switch (eventType) {
        case 'Search':
          result = await trackCAPISearch({
            userData,
            searchString: body.searchString ? String(body.searchString) : undefined,
            contentCategory: body.contentCategory ? String(body.contentCategory) : 'provider',
            contentIds: Array.isArray(body.contentIds) ? body.contentIds.map(String) : undefined,
            eventSourceUrl: eventSourceUrl || 'https://sos-expat.com/sos-call',
          });
          break;

        case 'ViewContent':
          result = await trackCAPIViewContent({
            userData,
            contentName: body.contentName ? String(body.contentName) : undefined,
            contentCategory: body.contentCategory ? String(body.contentCategory) : 'provider',
            contentIds: Array.isArray(body.contentIds) ? body.contentIds.map(String) : undefined,
            contentType: body.contentType ? String(body.contentType) : 'product',
            value: typeof body.value === 'number' ? body.value : undefined,
            currency: body.currency ? String(body.currency) : undefined,
            eventSourceUrl: eventSourceUrl || 'https://sos-expat.com/provider',
          });
          break;

        case 'AddToCart':
          result = await trackCAPIAddToCart({
            userData,
            contentName: body.contentName ? String(body.contentName) : undefined,
            contentCategory: body.contentCategory ? String(body.contentCategory) : 'service',
            contentIds: Array.isArray(body.contentIds) ? body.contentIds.map(String) : undefined,
            value: typeof body.value === 'number' ? body.value : undefined,
            currency: body.currency ? String(body.currency) : undefined,
            numItems: typeof body.numItems === 'number' ? body.numItems : 1,
            eventSourceUrl: eventSourceUrl || 'https://sos-expat.com/pricing',
          });
          break;

        case 'AddPaymentInfo':
          result = await trackCAPIAddPaymentInfo({
            userData,
            contentName: body.contentName ? String(body.contentName) : undefined,
            contentCategory: body.contentCategory ? String(body.contentCategory) : 'payment',
            contentIds: Array.isArray(body.contentIds) ? body.contentIds.map(String) : undefined,
            value: typeof body.value === 'number' ? body.value : undefined,
            currency: body.currency ? String(body.currency) : undefined,
            eventSourceUrl: eventSourceUrl || 'https://sos-expat.com/checkout',
            eventId: body.eventId ? String(body.eventId) : undefined,
          });
          break;

        case 'Contact':
          result = await trackCAPILead({
            userData,
            contentName: body.contentName ? String(body.contentName) : 'contact_form',
            contentCategory: body.contentCategory ? String(body.contentCategory) : 'support',
            serviceType: 'contact',
            eventSourceUrl: eventSourceUrl || 'https://sos-expat.com/contact',
            eventId: body.eventId ? String(body.eventId) : undefined,
          });
          break;

        case 'Lead':
          result = await trackCAPILead({
            userData,
            contentName: body.contentName ? String(body.contentName) : 'lead',
            contentCategory: body.contentCategory ? String(body.contentCategory) : 'service',
            serviceType: body.serviceType ? String(body.serviceType) : 'consultation',
            value: typeof body.value === 'number' ? body.value : undefined,
            currency: body.currency ? String(body.currency) : undefined,
            eventSourceUrl: eventSourceUrl || 'https://sos-expat.com',
            eventId: body.eventId ? String(body.eventId) : undefined,
          });
          break;

        default:
          res.status(400).json({ error: `Unsupported event type: ${eventType}` });
          return;
      }

      if (result.success) {
        logger.info(`✅ [CAPI ${eventType}] Event tracked successfully`, {
          eventId: result.eventId,
          eventType,
          userId: body.userId || 'anonymous',
        });

        // Log ALL events to Firestore for analytics dashboard
        try {
          const db = admin.firestore();

          // Calculate user data quality score (0-100)
          let qualityScore = 0;
          if (body.email) qualityScore += 30;
          if (body.phone) qualityScore += 25;
          if (body.firstName) qualityScore += 15;
          if (body.lastName) qualityScore += 10;
          if (body.country) qualityScore += 10;
          if (body.fbp) qualityScore += 5;
          if (body.fbc) qualityScore += 5;

          await db.collection('capi_events').add({
            // Event identification
            eventType,
            eventId: result.eventId,
            source: 'http_endpoint',

            // User identification
            userId: body.userId || null,
            isAnonymous: !body.userId,

            // User data quality
            hasEmail: !!body.email,
            hasPhone: !!body.phone,
            hasFirstName: !!body.firstName,
            hasLastName: !!body.lastName,
            hasCountry: !!body.country,
            hasFbp: !!body.fbp,
            hasFbc: !!body.fbc,
            qualityScore,

            // Event content
            contentName: body.contentName || null,
            contentCategory: body.contentCategory || null,
            contentIds: Array.isArray(body.contentIds) ? body.contentIds : null,
            searchString: body.searchString || null,

            // Value tracking
            value: typeof body.value === 'number' ? body.value : null,
            currency: body.currency || 'EUR',

            // Source tracking
            eventSourceUrl: eventSourceUrl || null,
            utmSource: body.utm_source || null,
            utmMedium: body.utm_medium || null,
            utmCampaign: body.utm_campaign || null,

            // Meta response
            metaEventsReceived: result.eventsReceived || 1,

            // Timestamps
            trackedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } catch (dbError) {
          // Non-critical, just log
          logger.warn('[trackCAPIEvent] Failed to log event to Firestore:', dbError);
        }

        res.status(200).json({
          success: true,
          eventId: result.eventId,
          eventType,
        });
      } else {
        logger.warn(`⚠️ [CAPI ${eventType}] Failed to track event:`, result.error);
        res.status(500).json({
          success: false,
          error: 'Failed to track event',
        });
      }
    } catch (error) {
      logger.error(`❌ [trackCAPIEvent] Error:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
