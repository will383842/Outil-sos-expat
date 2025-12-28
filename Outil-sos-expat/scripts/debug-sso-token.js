/**
 * =============================================================================
 * DEBUG SSO TOKEN - Script to decode and analyze Firebase Custom Tokens
 * =============================================================================
 *
 * This script helps debug SSO authentication issues by:
 * 1. Decoding a JWT custom token (without verification)
 * 2. Extracting the project ID from the token
 * 3. Comparing with the expected Firebase project
 *
 * Usage: node scripts/debug-sso-token.js <token>
 *
 * =============================================================================
 */

// Firebase Custom Token format:
// - It's a JWT signed with the Firebase Admin SDK's service account private key
// - The token header contains:
//   - alg: "RS256"
//   - typ: "JWT"
// - The payload contains:
//   - iss (issuer): The service account email
//   - sub (subject): Same as iss
//   - aud (audience): "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit"
//   - uid: The user's UID
//   - iat: Issued at timestamp
//   - exp: Expiration timestamp
//   - claims: Custom claims added by your code

/**
 * Decode a base64url string (used in JWT)
 */
function base64UrlDecode(str) {
  // Replace URL-safe characters with standard base64 characters
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Decode a JWT token without verification
 * WARNING: This does NOT verify the signature - only use for debugging!
 */
function decodeJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format - expected 3 parts separated by dots');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const header = JSON.parse(base64UrlDecode(headerB64));
    const payload = JSON.parse(base64UrlDecode(payloadB64));

    return {
      header,
      payload,
      signature: signatureB64,
    };
  } catch (error) {
    throw new Error(`Failed to decode JWT: ${error.message}`);
  }
}

/**
 * Extract project ID from the issuer (service account email)
 */
function extractProjectId(issuer) {
  // Issuer format: firebase-adminsdk-xxx@PROJECT_ID.iam.gserviceaccount.com
  // Or: PROJECT_ID@appspot.gserviceaccount.com
  const match = issuer.match(/@([^.]+)/);
  return match ? match[1] : null;
}

/**
 * Format a Unix timestamp to human-readable date
 */
function formatTimestamp(ts) {
  if (!ts) return 'N/A';
  const date = new Date(ts * 1000);
  return date.toISOString();
}

/**
 * Check if token is expired
 */
function isExpired(exp) {
  if (!exp) return null;
  return Date.now() / 1000 > exp;
}

// =============================================================================
// MAIN
// =============================================================================

console.log('\n=== Firebase Custom Token Debugger ===\n');

// Get token from command line or use a test token
const token = process.argv[2];

if (!token) {
  console.log('Usage: node scripts/debug-sso-token.js <token>');
  console.log('\nExample:');
  console.log('  node scripts/debug-sso-token.js eyJhbGciOiJS...');
  console.log('\nTo get the token:');
  console.log('  1. Open browser DevTools on the SOS platform');
  console.log('  2. Go to Network tab');
  console.log('  3. Click on "Assistant IA" button');
  console.log('  4. Find the generateOutilToken function call');
  console.log('  5. Copy the token from the response');
  console.log('\nExpected configuration:');
  console.log('  - Firebase Project: sos-urgently-ac307');
  console.log('  - Service Account: sos-urgently-ac307@appspot.gserviceaccount.com');
  console.log('  - API Key (correct): AIzaSyCLp02v_ywBw67d4VD7rQ2tCQUdKp83CT8');
  console.log('  - API Key (WRONG/old): AIzaSyDLYZsw-2d5gy1XQRYvd5A8umQ8PKCC8FQ');
  process.exit(1);
}

try {
  const decoded = decodeJWT(token);

  console.log('--- TOKEN HEADER ---');
  console.log(JSON.stringify(decoded.header, null, 2));

  console.log('\n--- TOKEN PAYLOAD ---');
  console.log(JSON.stringify(decoded.payload, null, 2));

  console.log('\n--- ANALYSIS ---');

  const { payload } = decoded;

  // Extract issuer info
  const issuer = payload.iss;
  const projectId = extractProjectId(issuer);

  console.log(`Issuer (iss): ${issuer}`);
  console.log(`Extracted Project ID: ${projectId || 'UNKNOWN'}`);
  console.log(`User UID: ${payload.uid}`);
  console.log(`Issued At (iat): ${formatTimestamp(payload.iat)}`);
  console.log(`Expires (exp): ${formatTimestamp(payload.exp)}`);

  const expired = isExpired(payload.exp);
  if (expired !== null) {
    console.log(`Token Status: ${expired ? 'EXPIRED' : 'Valid'}`);
  }

  // Check if project matches expected
  const EXPECTED_PROJECT = 'sos-urgently-ac307';
  const OLD_PROJECT = 'outils-sos-expat';

  console.log('\n--- PROJECT CHECK ---');
  if (projectId === EXPECTED_PROJECT) {
    console.log(`[OK] Token is from correct project: ${projectId}`);
  } else if (projectId === OLD_PROJECT) {
    console.log(`[ERROR] Token is from OLD/WRONG project: ${projectId}`);
    console.log(`        Expected: ${EXPECTED_PROJECT}`);
    console.log(`        This explains the "auth/custom-token-mismatch" error!`);
    console.log('\n        The token was signed by a different Firebase project than');
    console.log('        the one the Outil app is configured to use.');
  } else {
    console.log(`[WARNING] Unknown project: ${projectId}`);
    console.log(`          Expected: ${EXPECTED_PROJECT}`);
  }

  // Check custom claims
  if (payload.claims) {
    console.log('\n--- CUSTOM CLAIMS ---');
    console.log(JSON.stringify(payload.claims, null, 2));
  }

  console.log('\n--- DIAGNOSIS ---');
  console.log('If you see "auth/custom-token-mismatch" error:');
  console.log('  1. The token was signed by project:', projectId || 'UNKNOWN');
  console.log('  2. But the Outil app is trying to use it with a DIFFERENT project');
  console.log('  3. Check which API key the browser is using (see Network tab)');
  console.log('  4. The API key should be: AIzaSyCLp02v_ywBw67d4VD7rQ2tCQUdKp83CT8');
  console.log('  5. NOT: AIzaSyDLYZsw-2d5gy1XQRYvd5A8umQ8PKCC8FQ (this is the OLD key)');

} catch (error) {
  console.error('Error decoding token:', error.message);
  process.exit(1);
}

console.log('\n');
