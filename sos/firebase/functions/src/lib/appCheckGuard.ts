/**
 * Firebase App Check Guard pour Cloud Functions callables.
 *
 * Vérifie que la requête provient de l'app légitime (pas un scraper/API directe).
 * App Check doit être activé dans Firebase Console → App Check.
 *
 * Usage dans un callable :
 *   import { enforceAppCheck } from '../lib/appCheckGuard';
 *
 *   export const myFunction = onCall({ ...config, enforceAppCheck: true }, async (request) => {
 *     // App Check est automatiquement enforced par Firebase avec enforceAppCheck: true
 *     // Pour un check manuel (si enforceAppCheck n'est pas dans le config) :
 *     // requireAppCheck(request);
 *   });
 *
 * NOTE: `enforceAppCheck: true` dans la config onCall est la méthode recommandée.
 *       Ce module fournit un check manuel pour les cas où on veut un contrôle fin
 *       (ex: warn au lieu de block pendant la migration).
 */

import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

/**
 * Vérifie que la requête a un token App Check valide.
 * Lève HttpsError("unauthenticated") si le token est absent.
 *
 * @param request - La requête callable Firebase
 * @param strict - Si false, log un warning au lieu de bloquer (mode migration)
 */
export function requireAppCheck(
  request: CallableRequest,
  strict = false
): void {
  if (!request.app) {
    const message = "App Check token missing — possible scraper or direct API call";
    if (strict) {
      logger.warn(`[AppCheck] BLOCKED: ${message}`, {
        auth: request.auth?.uid || "anonymous",
      });
      throw new HttpsError("unauthenticated", "Unauthorized client.");
    } else {
      // Mode migration : on log mais on laisse passer
      logger.warn(`[AppCheck] WARN (non-strict): ${message}`, {
        auth: request.auth?.uid || "anonymous",
      });
    }
  }
}
