/**
 * Twilio Balance Monitoring
 *
 * Cloud Function pour recuperer le solde du compte Twilio.
 * Utilise l'API Twilio Balance pour obtenir les informations de credit.
 *
 * @version 1.0.0
 * @admin-only Cette fonction est reservee aux administrateurs
 */

import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { ALLOWED_ORIGINS } from '../lib/functionConfigs';
import {
  TWILIO_ACCOUNT_SID_SECRET,
  TWILIO_AUTH_TOKEN_SECRET,
  getTwilioAccountSid,
  getTwilioAuthToken,
} from '../lib/twilio';

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

if (!admin.apps.length) {
  admin.initializeApp();
}

// ============================================================================
// TYPES
// ============================================================================

interface TwilioBalanceResponse {
  balance: number;
  currency: string;
  accountSid: string;
  timestamp: Date;
}

interface TwilioApiBalanceResponse {
  account_sid: string;
  balance: string;
  currency: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const db = () => admin.firestore();

/**
 * Verifie que l'utilisateur est admin
 */
async function verifyAdminAccess(uid: string): Promise<boolean> {
  try {
    const userDoc = await db().collection('users').doc(uid).get();
    const userData = userDoc.data();
    return userData?.role === 'admin';
  } catch (error) {
    logger.error('[TwilioBalance] Error verifying admin access:', error);
    return false;
  }
}

/**
 * Fetch balance from Twilio API
 * @see https://www.twilio.com/docs/usage/api/account-balance
 */
async function fetchTwilioBalance(accountSid: string, authToken: string): Promise<TwilioApiBalanceResponse> {
  // AUDIT FIX 2026-02-26: Trim credentials to remove trailing CRLF/whitespace
  const trimmedSid = accountSid.trim();
  const trimmedToken = authToken.trim();
  const url = `https://api.twilio.com/2010-04-01/Accounts/${trimmedSid}/Balance.json`;

  const credentials = Buffer.from(`${trimmedSid}:${trimmedToken}`).toString('base64');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[TwilioBalance] Twilio API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(`Twilio API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<TwilioApiBalanceResponse>;
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

/**
 * getTwilioBalance - Cloud Function onCall (admin only)
 *
 * Recupere le solde actuel du compte Twilio.
 *
 * @returns TwilioBalanceResponse - Objet contenant le solde, devise et timestamp
 */
export const getTwilioBalance = functions.onCall(
  {
    region: 'europe-west1',
    cpu: 0.083,
    memory: '256MiB',
    timeoutSeconds: 30,
    secrets: [TWILIO_ACCOUNT_SID_SECRET, TWILIO_AUTH_TOKEN_SECRET],
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<TwilioBalanceResponse> => {
    // Verification d'authentification
    if (!request.auth) {
      throw new functions.HttpsError(
        'unauthenticated',
        'Authentication required'
      );
    }

    // Verification admin
    const isAdmin = await verifyAdminAccess(request.auth.uid);
    if (!isAdmin) {
      throw new functions.HttpsError(
        'permission-denied',
        'Admin access required'
      );
    }

    logger.info('[TwilioBalance] Fetching Twilio account balance', {
      uid: request.auth.uid,
    });

    try {
      // Get Twilio credentials
      const accountSid = getTwilioAccountSid();
      const authToken = getTwilioAuthToken();

      if (!accountSid || !authToken) {
        logger.error('[TwilioBalance] Missing Twilio credentials');
        throw new functions.HttpsError(
          'failed-precondition',
          'Twilio credentials not configured'
        );
      }

      // Fetch balance from Twilio API
      const balanceData = await fetchTwilioBalance(accountSid, authToken);

      const result: TwilioBalanceResponse = {
        balance: parseFloat(balanceData.balance),
        currency: balanceData.currency,
        accountSid: balanceData.account_sid,
        timestamp: new Date(),
      };

      logger.info('[TwilioBalance] Balance fetched successfully', {
        balance: result.balance,
        currency: result.currency,
        accountSidPrefix: result.accountSid.substring(0, 6) + '...',
      });

      return result;
    } catch (error) {
      logger.error('[TwilioBalance] Error fetching balance:', error);

      if (error instanceof functions.HttpsError) {
        throw error;
      }

      throw new functions.HttpsError(
        'internal',
        'Failed to fetch Twilio account balance'
      );
    }
  }
);
