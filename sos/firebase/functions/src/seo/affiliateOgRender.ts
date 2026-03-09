/**
 * Affiliate OG Render — Lightweight HTML for social media previews
 *
 * Returns minimal HTML with Open Graph meta tags for affiliate referral links.
 * No Puppeteer — just a Firestore lookup + HTML template.
 *
 * Handles: /ref/c/CODE, /rec/c/CODE, /prov/c/CODE (and locale variants)
 * Also supports: /ref/b/CODE (blogger), /ref/i/CODE (influencer), /ref/ga/CODE (groupAdmin)
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import type { Request, Response } from 'express';

const REGION = 'europe-west1';
const SITE_URL = 'https://sos-expat.com';
const OG_IMAGE_BASE = `https://${REGION}-sos-urgently-ac307.cloudfunctions.net/generateAffiliateOgImage`;

// Actor type mapping
const ACTOR_MAP: Record<string, { collection: string; label: string }> = {
  c: { collection: 'chatters', label: 'Chatter' },
  b: { collection: 'bloggers', label: 'Blogger' },
  i: { collection: 'influencers', label: 'Influencer' },
  ga: { collection: 'group_admins', label: 'Group Admin' },
};

// Link type config
const LINK_TYPE_CONFIG: Record<string, {
  codeField: string;
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
}> = {
  ref: {
    codeField: 'affiliateCodeClient',
    titleFr: 'Aide juridique & expat 24/7 — SOS Expat',
    titleEn: '24/7 Legal & Expat Help — SOS Expat',
    descFr: 'Parlez à un avocat ou expert local en quelques minutes. Assistance d\'urgence pour expatriés et voyageurs, partout dans le monde.',
    descEn: 'Talk to a lawyer or local expert within minutes. Emergency assistance for expats and travelers worldwide.',
  },
  rec: {
    codeField: 'affiliateCodeRecruitment',
    titleFr: 'Gagne de l\'argent en aidant les expatriés — Rejoins SOS Expat',
    titleEn: 'Earn money helping expats — Join SOS Expat',
    descFr: 'Deviens ambassadeur SOS Expat et gagne $10 par appel. Rejoins une communauté qui aide les expatriés du monde entier.',
    descEn: 'Become an SOS Expat ambassador and earn $10 per call. Join a community helping expats worldwide.',
  },
  prov: {
    codeField: 'affiliateCodeProvider',
    titleFr: 'Rejoins notre réseau de prestataires — SOS Expat',
    titleEn: 'Join our provider network — SOS Expat',
    descFr: 'Offrez vos services juridiques ou d\'expertise aux expatriés. Recevez des appels payants et aidez les gens dans le besoin.',
    descEn: 'Offer your legal or expert services to expats. Receive paid calls and help people in need.',
  },
};

// Parse affiliate path: /ref/c/CODE, /fr-fr/ref/c/CODE, etc.
function parseAffiliatePath(pathname: string): {
  linkType: string;
  actorType: string;
  code: string;
  locale: string | null;
} | null {
  // With locale: /fr-fr/ref/c/CODE
  const localeMatch = pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\/(ref|rec|prov)\/(c|b|i|ga)\/([A-Za-z0-9_-]+)\/?$/i);
  if (localeMatch) {
    return {
      locale: localeMatch[1],
      linkType: localeMatch[2].toLowerCase(),
      actorType: localeMatch[3].toLowerCase(),
      code: localeMatch[4].toUpperCase(),
    };
  }

  // Without locale: /ref/c/CODE
  const directMatch = pathname.match(/^\/(ref|rec|prov)\/(c|b|i|ga)\/([A-Za-z0-9_-]+)\/?$/i);
  if (directMatch) {
    return {
      locale: null,
      linkType: directMatch[1].toLowerCase(),
      actorType: directMatch[2].toLowerCase(),
      code: directMatch[3].toUpperCase(),
    };
  }

  return null;
}

// Lookup affiliate in Firestore by code
async function lookupAffiliate(
  collection: string,
  codeField: string,
  code: string,
): Promise<{ firstName?: string; uid?: string } | null> {
  try {
    const db = admin.firestore();
    const snap = await db
      .collection(collection)
      .where(codeField, '==', code)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return {
      firstName: data.firstName || data.displayName?.split(' ')[0] || null,
      uid: snap.docs[0].id,
    };
  } catch (err) {
    logger.warn('Firestore lookup failed', { collection, codeField, code, error: (err as Error).message });
    return null;
  }
}

// Escape HTML entities
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Generate minimal HTML with OG tags
function generateOgHtml(params: {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  locale: string;
  canonicalUrl: string;
}): string {
  const { title, description, url, imageUrl, locale, canonicalUrl } = params;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/svg+xml" />
  <meta property="og:site_name" content="SOS Expat &amp; Travelers" />
  <meta property="og:locale" content="${locale}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />

  <!-- Canonical -->
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <!-- Redirect for non-bots (safety fallback) -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonicalUrl)}" />
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>${safeDesc}</p>
  <p><a href="${escapeHtml(canonicalUrl)}">Visit SOS Expat</a></p>
</body>
</html>`;
}

/**
 * Lightweight OG renderer for affiliate referral links.
 * Called by Cloudflare Worker when a social media bot visits /ref/, /rec/, /prov/ paths.
 */
export const affiliateOgRender = onRequest(
  {
    region: REGION,
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 15,
    minInstances: 0,
    maxInstances: 20,
  },
  async (req: Request, res: Response) => {
    const getQuery = (name: string): string => {
      const val = req.query[name];
      if (Array.isArray(val)) return String(val[0] || '');
      if (typeof val === 'object') return '';
      return (val as string) || '';
    };

    const requestPath = getQuery('path') || req.path || '/';
    const originalUrl = getQuery('url') || `${SITE_URL}${requestPath}`;

    logger.info('Affiliate OG render', { path: requestPath, url: originalUrl });

    // Parse the affiliate path
    const parsed = parseAffiliatePath(requestPath);
    if (!parsed) {
      // Not a valid affiliate path — redirect to SPA
      res.redirect(302, originalUrl);
      return;
    }

    const { linkType, actorType, code, locale } = parsed;
    const config = LINK_TYPE_CONFIG[linkType];
    const actorInfo = ACTOR_MAP[actorType];

    if (!config || !actorInfo) {
      res.redirect(302, originalUrl);
      return;
    }

    // Determine language from locale
    const lang = locale ? locale.split('-')[0] : 'en';
    const isFr = lang === 'fr';

    // Lookup affiliate to personalize title
    const affiliate = await lookupAffiliate(actorInfo.collection, config.codeField, code);

    // Build title (personalized if affiliate found)
    let title = isFr ? config.titleFr : config.titleEn;
    if (affiliate?.firstName && linkType === 'rec') {
      title = isFr
        ? `${affiliate.firstName} t'invite à rejoindre SOS Expat — Gagne $10/appel`
        : `${affiliate.firstName} invites you to join SOS Expat — Earn $10/call`;
    } else if (affiliate?.firstName && linkType === 'ref') {
      title = isFr
        ? `${affiliate.firstName} te recommande SOS Expat — Aide juridique 24/7`
        : `${affiliate.firstName} recommends SOS Expat — 24/7 Legal Help`;
    } else if (affiliate?.firstName && linkType === 'prov') {
      title = isFr
        ? `${affiliate.firstName} vous invite à rejoindre le réseau SOS Expat`
        : `${affiliate.firstName} invites you to join the SOS Expat network`;
    }

    const description = isFr ? config.descFr : config.descEn;

    // OG image URL
    const imageUrl = `${OG_IMAGE_BASE}?type=${linkType}&lang=${lang}&name=${encodeURIComponent(affiliate?.firstName || '')}`;

    // Canonical URL (always use the clean affiliate link)
    const canonicalUrl = originalUrl;

    const html = generateOgHtml({
      title,
      description,
      url: originalUrl,
      imageUrl,
      locale: locale || (isFr ? 'fr-FR' : 'en-US'),
      canonicalUrl,
    });

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400'); // 1h client, 24h CDN
    res.set('X-Rendered-By', 'affiliate-og-render');
    res.status(200).send(html);

    logger.info('Affiliate OG rendered', {
      linkType,
      actorType,
      code,
      personalized: !!affiliate?.firstName,
    });
  },
);

/**
 * Generate a branded SVG OG image for affiliate links.
 * Params: ?type=ref|rec|prov&lang=fr|en&name=John
 */
export const generateAffiliateOgImage = onRequest(
  {
    region: REGION,
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 10,
    maxInstances: 20,
  },
  async (req: Request, res: Response) => {
    const type = (req.query.type as string) || 'ref';
    const lang = (req.query.lang as string) || 'en';
    const name = (req.query.name as string) || '';
    const isFr = lang === 'fr';

    // Type-specific config
    const typeConfig: Record<string, {
      gradientStart: string;
      gradientEnd: string;
      emoji: string;
      headlineFr: string;
      headlineEn: string;
      subtitleFr: string;
      subtitleEn: string;
      badgeFr: string;
      badgeEn: string;
    }> = {
      ref: {
        gradientStart: '#6366F1', // Indigo
        gradientEnd: '#8B5CF6', // Violet
        emoji: '🆘',
        headlineFr: 'Aide juridique & expat\n24h/24, 7j/7',
        headlineEn: 'Legal & Expat Help\n24/7 Worldwide',
        subtitleFr: 'Parlez à un avocat en quelques minutes',
        subtitleEn: 'Talk to a lawyer within minutes',
        badgeFr: 'Recommandé par',
        badgeEn: 'Recommended by',
      },
      rec: {
        gradientStart: '#10B981', // Emerald
        gradientEnd: '#059669',
        emoji: '💰',
        headlineFr: 'Gagne $10\npar appel',
        headlineEn: 'Earn $10\nper call',
        subtitleFr: 'Deviens ambassadeur SOS Expat',
        subtitleEn: 'Become an SOS Expat ambassador',
        badgeFr: 'Invitation de',
        badgeEn: 'Invited by',
      },
      prov: {
        gradientStart: '#F59E0B', // Amber
        gradientEnd: '#D97706',
        emoji: '⚖️',
        headlineFr: 'Rejoignez notre\nréseau d\'experts',
        headlineEn: 'Join our\nexpert network',
        subtitleFr: 'Recevez des appels payants d\'expatriés',
        subtitleEn: 'Receive paid calls from expats',
        badgeFr: 'Invitation de',
        badgeEn: 'Invited by',
      },
    };

    const cfg = typeConfig[type] || typeConfig.ref;
    const headline = isFr ? cfg.headlineFr : cfg.headlineEn;
    const subtitle = isFr ? cfg.subtitleFr : cfg.subtitleEn;
    const headlineLines = headline.split('\n');

    // Build referrer badge
    let referrerBadge = '';
    if (name) {
      const badgeLabel = isFr ? cfg.badgeFr : cfg.badgeEn;
      const safeName = escapeXml(name);
      const badgeWidth = Math.max(200, (badgeLabel.length + safeName.length) * 11 + 60);
      referrerBadge = `
      <g transform="translate(80, 480)">
        <rect width="${badgeWidth}" height="44" rx="22" fill="rgba(255,255,255,0.2)" />
        <text x="22" y="29" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)">
          ${escapeXml(badgeLabel)} <tspan font-weight="bold" fill="white">${safeName}</tspan>
        </text>
      </g>`;
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${cfg.gradientStart}" />
      <stop offset="100%" style="stop-color:${cfg.gradientEnd}" />
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.15)" />
      <stop offset="100%" style="stop-color:rgba(255,255,255,0)" />
    </linearGradient>
  </defs>

  <!-- Background gradient -->
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="315" fill="url(#shine)" />

  <!-- Decorative circles -->
  <circle cx="1050" cy="120" r="200" fill="rgba(255,255,255,0.05)" />
  <circle cx="1100" cy="500" r="150" fill="rgba(255,255,255,0.03)" />
  <circle cx="150" cy="550" r="100" fill="rgba(255,255,255,0.04)" />

  <!-- Logo area -->
  <g transform="translate(80, 50)">
    <rect width="200" height="48" rx="24" fill="rgba(255,255,255,0.2)" />
    <text x="16" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" fill="white">
      <tspan fill="#FCA5A5">SOS</tspan> Expat
    </text>
  </g>

  <!-- Emoji -->
  <text x="80" y="200" font-size="72">${cfg.emoji}</text>

  <!-- Headline -->
  <text x="80" y="${headlineLines.length > 1 ? 290 : 320}" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="bold" fill="white" letter-spacing="-1">
    ${headlineLines.map((line, i) => `<tspan x="80" dy="${i === 0 ? 0 : 72}">${escapeXml(line)}</tspan>`).join('')}
  </text>

  <!-- Subtitle -->
  <text x="80" y="${headlineLines.length > 1 ? 430 : 390}" font-family="system-ui, -apple-system, sans-serif" font-size="26" fill="rgba(255,255,255,0.85)">
    ${escapeXml(subtitle)}
  </text>

  <!-- Referrer badge -->
  ${referrerBadge}

  <!-- Bottom URL -->
  <text x="1120" y="600" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="rgba(255,255,255,0.5)">
    sos-expat.com
  </text>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800'); // 24h client, 7d CDN
    res.status(200).send(svg);
  },
);

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
