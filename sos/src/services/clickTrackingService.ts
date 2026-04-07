/**
 * Server-side affiliate click tracking service.
 *
 * Sends affiliate link clicks to the `trackAffiliateClick` callable
 * so the click is recorded server-side even if localStorage is later cleared.
 * This is a fire-and-forget call — it never blocks navigation or UI.
 */

import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import { getCurrentTrafficSource, getFirstTouchSource } from '@/utils/trafficSource';
import { getStoredMetaIdentifiers } from '@/utils/fbpCookie';

type ActorType = 'chatter' | 'influencer' | 'blogger' | 'groupAdmin';
type CodeType = 'client' | 'recruitment' | 'provider';

/**
 * Track an affiliate link click server-side.
 * Non-blocking: errors are swallowed (localStorage tracking is the primary fallback).
 */
export async function trackAffiliateClickServer(
  affiliateCode: string,
  actorType: ActorType,
  codeType: CodeType,
): Promise<string | null> {
  try {
    const ts = getCurrentTrafficSource() || getFirstTouchSource();
    const meta = getStoredMetaIdentifiers();

    const fn = httpsCallable(functionsAffiliate, 'trackAffiliateClick');
    const result = await fn({
      affiliateCode,
      actorType,
      codeType,
      userAgent: navigator.userAgent,
      referrerUrl: document.referrer || undefined,
      landingPage: window.location.pathname,
      sessionId: ts?.session_id,
      // UTM
      utmSource: ts?.utm_source,
      utmMedium: ts?.utm_medium,
      utmCampaign: ts?.utm_campaign,
      utmContent: ts?.utm_content,
      utmTerm: ts?.utm_term,
      // Meta
      fbclid: ts?.fbclid,
      fbp: meta.fbp || ts?.fbp,
      fbc: meta.fbc || ts?.fbc,
      // Google
      gclid: ts?.gclid,
      gadSource: ts?.gad_source,
      // TikTok
      ttclid: ts?.ttclid,
      // Geo
      userCountry: ts?.user_country,
      userTimezone: ts?.user_timezone,
      userLanguage: ts?.user_language,
    });

    return (result.data as { clickId: string }).clickId;
  } catch (err) {
    // Non-critical: localStorage tracking remains the primary fallback
    console.warn('[clickTracking] Server tracking failed:', err);
    return null;
  }
}

/**
 * Build trafficSource payload for registration callables.
 * Returns undefined if no traffic data is available.
 */
export function getTrafficSourceForRegistration(): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  gclid?: string;
  ttclid?: string;
  sessionId?: string;
  userCountry?: string;
} | undefined {
  const ts = getCurrentTrafficSource() || getFirstTouchSource();
  const meta = getStoredMetaIdentifiers();

  if (!ts && !meta.fbp && !meta.fbc) return undefined;

  return {
    utmSource: ts?.utm_source,
    utmMedium: ts?.utm_medium,
    utmCampaign: ts?.utm_campaign,
    utmContent: ts?.utm_content,
    utmTerm: ts?.utm_term,
    fbclid: ts?.fbclid,
    fbp: meta.fbp || ts?.fbp,
    fbc: meta.fbc || ts?.fbc,
    gclid: ts?.gclid,
    ttclid: ts?.ttclid,
    sessionId: ts?.session_id,
    userCountry: ts?.user_country,
  };
}
