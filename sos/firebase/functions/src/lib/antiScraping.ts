/**
 * Anti-Scraping Middleware pour Cloud Functions HTTP (onRequest)
 *
 * Protections appliquées :
 * 1. Blocage des user-agents de scrapers connus
 * 2. Rate limiting par IP via Firestore
 * 3. Headers anti-scraping dans la réponse
 *
 * Usage :
 *   import { withAntiScraping } from '../lib/antiScraping';
 *   export const myEndpoint = onRequest(config, withAntiScraping(handler, 'PUBLIC_API'));
 */

import { Request, Response } from "express";
import { checkIpRateLimit, getClientIp, RATE_LIMITS } from "./rateLimiter";

// Scrapers agressifs connus (lowercase)
const BLOCKED_USER_AGENTS = [
  "scrapy",
  "python-requests",
  "go-http-client",
  "java/",
  "httpclient",
  "wget",
  "curl",
  "libwww-perl",
  "mechanize",
  "phantom",
  "headlesschrome",
  "httrack",
  "harvest",
  "extract",
  "sucker",
  "nikto",
  "sqlmap",
  "nmap",
  "masscan",
  "zgrab",
  "ahrefsbot",
  "mj12bot",
  "dotbot",
  "blexbot",
  "dataforseobot",
  "serpstatbot",
  "bytespider",
  "seekport",
  "semanticbot",
  "megaindex",
  "rogerbot",
  "linkfluence",
];

// User-agents légitimes (bots sociaux / search engines / IA autorisés)
const LEGITIMATE_BOT_PATTERNS = [
  "googlebot",
  "bingbot",
  "yandex",
  "duckduckbot",
  "baiduspider",
  "applebot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "telegrambot",
  "whatsapp",
  "gptbot",
  "chatgpt",
  "claudebot",
  "anthropic",
  "perplexitybot",
  "google-extended",
];

type RateLimitPreset = keyof typeof RATE_LIMITS;
type HttpHandler = (req: Request, res: Response) => void | Promise<void>;

/**
 * Ajoute les headers anti-scraping à la réponse.
 */
function setAntiScrapingHeaders(res: Response): void {
  // Empêcher le caching par les proxies/scrapers
  res.set("X-Robots-Tag", "noarchive");
  // Empêcher l'inclusion en iframe (déjà dans _headers, mais aussi côté function)
  res.set("X-Frame-Options", "SAMEORIGIN");
  // Indiquer que la ressource ne doit pas être mise en cache par les CDN tiers
  res.set("CDN-Cache-Control", "private");
  // Pas de sniffing du content-type
  res.set("X-Content-Type-Options", "nosniff");
}

/**
 * Vérifie si le user-agent est un scraper bloqué.
 * Retourne true si bloqué.
 */
function isBlockedUserAgent(ua: string): boolean {
  if (!ua) return false; // pas de UA = potentiellement légitime (curl sans UA)
  const lower = ua.toLowerCase();

  // Si c'est un bot légitime, ne pas bloquer
  for (const pattern of LEGITIMATE_BOT_PATTERNS) {
    if (lower.includes(pattern)) return false;
  }

  // Vérifier les scrapers bloqués
  for (const blocked of BLOCKED_USER_AGENTS) {
    if (lower.includes(blocked)) return true;
  }

  return false;
}

/**
 * Wrapper anti-scraping pour les handlers HTTP (onRequest).
 *
 * @param handler - Le handler Express original
 * @param rateLimitPreset - Le preset de rate limiting à utiliser (défaut: PUBLIC_API)
 * @param skipRateLimit - Si true, ne fait que le check UA + headers (pour les endpoints très fréquentés)
 */
export function withAntiScraping(
  handler: HttpHandler,
  rateLimitPreset: RateLimitPreset = "PUBLIC_API",
  skipRateLimit = false
): HttpHandler {
  return async (req: Request, res: Response) => {
    // 1. Headers anti-scraping systématiques
    setAntiScrapingHeaders(res);

    // 2. Blocage user-agents scrapers
    const ua = req.headers["user-agent"] || "";
    if (isBlockedUserAgent(ua as string)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // 3. Rate limiting par IP (sauf si désactivé)
    if (!skipRateLimit) {
      try {
        const ip = getClientIp(req);
        const config = RATE_LIMITS[rateLimitPreset];
        await checkIpRateLimit(ip, rateLimitPreset, config);
      } catch (error: unknown) {
        if (error && typeof error === "object" && "code" in error) {
          const httpError = error as { code: string };
          if (httpError.code === "resource-exhausted") {
            res.status(429).json({
              error: "Too many requests. Please slow down.",
            });
            return;
          }
        }
        // Rate limiter down → fail-open pour ne pas bloquer les vrais users
        console.warn("[antiScraping] Rate limiter error, allowing request:", error);
      }
    }

    // 4. Appel du handler original
    return handler(req, res);
  };
}
