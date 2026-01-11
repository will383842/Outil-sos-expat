// src/utils/fbpCookie.ts
// Utilitaires pour la capture des identifiants Meta (fbp/fbc) pour CAPI
// fbp = Facebook Browser ID (cookie _fbp cree par Meta Pixel)
// fbc = Facebook Click ID (conversion de fbclid au format Meta)

/**
 * Recupere la valeur du cookie _fbp cree automatiquement par Meta Pixel
 * Format attendu: fb.1.{timestamp}.{random_id}
 * Exemple: fb.1.1704067234567.1234567890
 *
 * @returns La valeur du cookie _fbp ou null si non trouve
 */
export const getFbpCookie = (): string | null => {
  if (typeof document === 'undefined') return null;

  try {
    const name = '_fbp=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (const cookie of cookieArray) {
      const trimmedCookie = cookie.trim();
      if (trimmedCookie.startsWith(name)) {
        const fbpValue = trimmedCookie.substring(name.length);
        // Valider le format fb.X.XXXX.XXXX
        if (fbpValue && fbpValue.startsWith('fb.')) {
          return fbpValue;
        }
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[FbpCookie] Error reading _fbp cookie:', e);
    }
  }

  return null;
};

/**
 * Recupere la valeur du cookie _fbc cree par Meta Pixel lors d'un clic publicitaire
 * Format attendu: fb.1.{timestamp}.{fbclid}
 *
 * @returns La valeur du cookie _fbc ou null si non trouve
 */
export const getFbcCookie = (): string | null => {
  if (typeof document === 'undefined') return null;

  try {
    const name = '_fbc=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (const cookie of cookieArray) {
      const trimmedCookie = cookie.trim();
      if (trimmedCookie.startsWith(name)) {
        const fbcValue = trimmedCookie.substring(name.length);
        if (fbcValue && fbcValue.startsWith('fb.')) {
          return fbcValue;
        }
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[FbpCookie] Error reading _fbc cookie:', e);
    }
  }

  return null;
};

/**
 * Convertit un fbclid (parametre URL) en format fbc (format Meta CAPI)
 * Format fbc: fb.1.{timestamp_ms}.{fbclid}
 *
 * @param fbclid Le Facebook Click ID depuis l'URL
 * @returns Le fbc au format Meta ou une chaine vide si fbclid invalide
 */
export const fbclidToFbc = (fbclid: string | undefined | null): string => {
  if (!fbclid || typeof fbclid !== 'string' || fbclid.trim() === '') {
    return '';
  }
  const timestamp = Date.now();
  return `fb.1.${timestamp}.${fbclid.trim()}`;
};

/**
 * Recupere les identifiants Meta (fbp et fbc) pour CAPI
 * Essaie d'abord les cookies, puis genere fbc depuis fbclid si disponible
 *
 * @param fbclid Optionnel - Le fbclid depuis l'URL pour generer fbc
 * @returns Object avec fbp et fbc (peuvent etre undefined)
 */
export const getMetaIdentifiers = (fbclid?: string | null): { fbp?: string; fbc?: string } => {
  const result: { fbp?: string; fbc?: string } = {};

  // 1. Essayer de recuperer fbp depuis le cookie _fbp
  const fbp = getFbpCookie();
  if (fbp) {
    result.fbp = fbp;
  }

  // 2. Essayer de recuperer fbc depuis le cookie _fbc
  const fbcFromCookie = getFbcCookie();
  if (fbcFromCookie) {
    result.fbc = fbcFromCookie;
  }
  // 3. Sinon, generer fbc depuis fbclid si disponible
  else if (fbclid) {
    const generatedFbc = fbclidToFbc(fbclid);
    if (generatedFbc) {
      result.fbc = generatedFbc;
    }
  }

  if (process.env.NODE_ENV === 'development' && (result.fbp || result.fbc)) {
    console.log('%c[FbpCookie] Meta identifiers:', 'color: #1877F2', {
      fbp: result.fbp ? 'captured' : 'missing',
      fbc: result.fbc ? 'captured' : 'missing',
    });
  }

  return result;
};

/**
 * Stocke les identifiants Meta en localStorage pour acces ulterieur
 * Utile pour transmettre a Stripe metadata lors du paiement
 */
export const storeMetaIdentifiers = (fbp?: string, fbc?: string): void => {
  if (typeof localStorage === 'undefined') return;

  try {
    if (fbp) {
      localStorage.setItem('meta_fbp', fbp);
    }
    if (fbc) {
      localStorage.setItem('meta_fbc', fbc);
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[FbpCookie] Error storing Meta identifiers:', e);
    }
  }
};

/**
 * Recupere les identifiants Meta stockes en localStorage
 */
export const getStoredMetaIdentifiers = (): { fbp?: string; fbc?: string } => {
  if (typeof localStorage === 'undefined') {
    return {};
  }

  try {
    const fbp = localStorage.getItem('meta_fbp');
    const fbc = localStorage.getItem('meta_fbc');
    return {
      fbp: fbp || undefined,
      fbc: fbc || undefined,
    };
  } catch (e) {
    return {};
  }
};

/**
 * Capture et stocke les identifiants Meta au chargement de la page
 * A appeler au demarrage de l'application
 *
 * @param fbclid Optionnel - Le fbclid depuis l'URL
 */
export const captureAndStoreMetaIdentifiers = (fbclid?: string | null): { fbp?: string; fbc?: string } => {
  const identifiers = getMetaIdentifiers(fbclid);

  if (identifiers.fbp || identifiers.fbc) {
    storeMetaIdentifiers(identifiers.fbp, identifiers.fbc);
  }

  return identifiers;
};

/**
 * Efface les identifiants Meta stockes (a appeler lors de la deconnexion si necessaire)
 */
export const clearStoredMetaIdentifiers = (): void => {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.removeItem('meta_fbp');
    localStorage.removeItem('meta_fbc');
  } catch (e) {
    // Ignore errors
  }
};

export default {
  getFbpCookie,
  getFbcCookie,
  fbclidToFbc,
  getMetaIdentifiers,
  storeMetaIdentifiers,
  getStoredMetaIdentifiers,
  captureAndStoreMetaIdentifiers,
  clearStoredMetaIdentifiers,
};
