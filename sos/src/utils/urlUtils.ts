/**
 * Utility functions for URL handling, especially for signed URLs
 */

/**
 * Checks if a Google Cloud Storage signed URL is expired
 * @param url - The signed URL to check
 * @returns true if the URL is expired or will expire within the next minute, false otherwise
 */
export const isUrlExpired = (url: string): boolean => {
  try {
    // Extract the Expires parameter from the URL
    const urlObj = new URL(url);
    const expiresParam = urlObj.searchParams.get('Expires');
    
    if (!expiresParam) {
      // If there's no Expires parameter, assume it's expired to be safe
      return true;
    }
    
    // Convert expires timestamp (Unix timestamp in seconds) to milliseconds
    const parsedExpires = parseInt(expiresParam, 10);
    // NaN check - if parsing fails, treat as expired
    if (Number.isNaN(parsedExpires)) {
      return true;
    }
    const expiresTimestamp = parsedExpires * 1000;
    const now = Date.now();
    
    // Check if expired (with 1 minute buffer to account for clock skew)
    const bufferMs = 60 * 1000; // 1 minute buffer
    return expiresTimestamp <= (now + bufferMs);
  } catch (error) {
    console.error('Error checking URL expiration:', error);
    // If we can't parse the URL, assume it's expired to be safe
    return true;
  }
};

/**
 * Extracts the expiration timestamp from a signed URL
 * @param url - The signed URL
 * @returns The expiration timestamp in milliseconds, or null if not found
 */
export const getUrlExpiration = (url: string): number | null => {
  try {
    const urlObj = new URL(url);
    const expiresParam = urlObj.searchParams.get('Expires');
    
    if (!expiresParam) {
      return null;
    }

    const parsedExpires = parseInt(expiresParam, 10);
    // NaN check - if parsing fails, return null
    if (Number.isNaN(parsedExpires)) {
      return null;
    }
    return parsedExpires * 1000;
  } catch (error) {
    console.error('Error extracting URL expiration:', error);
    return null;
  }
};
