/**
 * Test CAPI Connection Function
 *
 * HTTP endpoint to test the Meta Conversions API connection.
 * Sends a test event and returns the result.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import {
  META_CAPI_TOKEN,
  sendCAPIEvent,
  hashUserData,
  generateEventId,
} from '../metaConversionsApi';

const REGION = 'europe-west1';

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    eventId: string;
    eventsReceived?: number;
    fbtraceId?: string;
    error?: string;
    tokenConfigured: boolean;
    pixelId: string;
  };
}

/**
 * Test CAPI Connection
 *
 * GET /testCAPIConnection
 *
 * Returns:
 * - success: boolean
 * - message: string
 * - details: object with event details
 */
export const testCAPIConnection = onRequest(
  {
    region: REGION,
    cors: true,
    maxInstances: 5,
    secrets: [META_CAPI_TOKEN],
  },
  async (req, res) => {
    // Only GET and POST
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    logger.info('[testCAPIConnection] Starting CAPI connection test');

    try {
      // Check if token is configured
      let tokenConfigured = false;
      try {
        const token = META_CAPI_TOKEN.value();
        tokenConfigured = !!token && token.length > 0;
      } catch {
        tokenConfigured = false;
      }

      if (!tokenConfigured) {
        const result: TestResult = {
          success: false,
          message: 'META_CAPI_TOKEN non configure',
          details: {
            eventId: '',
            tokenConfigured: false,
            pixelId: '2204016713738311',
            error: 'Le secret META_CAPI_TOKEN n\'est pas configure dans Firebase',
          },
        };
        res.status(500).json(result);
        return;
      }

      // Generate a test event ID
      const eventId = generateEventId('test');

      // Create a minimal test event
      const testEvent = {
        event_name: 'TestEvent',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'system_generated' as const,
        user_data: hashUserData({
          external_id: 'test_user_sos_expat',
        }),
        custom_data: {
          content_name: 'CAPI Connection Test',
          content_category: 'system_test',
        },
      };

      // Use test event code for debugging (won't appear in real analytics)
      const testEventCode = 'TEST_' + Date.now().toString().slice(-6);

      logger.info('[testCAPIConnection] Sending test event', {
        eventId,
        testEventCode,
      });

      // Send the test event
      const result = await sendCAPIEvent(testEvent, testEventCode);

      if (result.success) {
        const response: TestResult = {
          success: true,
          message: 'Connexion CAPI reussie! L\'evenement de test a ete envoye.',
          details: {
            eventId: result.eventId,
            eventsReceived: result.eventsReceived,
            fbtraceId: result.fbtraceId,
            tokenConfigured: true,
            pixelId: '2204016713738311',
          },
        };

        logger.info('[testCAPIConnection] Test successful', response.details);
        res.status(200).json(response);
      } else {
        const response: TestResult = {
          success: false,
          message: 'Echec de l\'envoi de l\'evenement de test',
          details: {
            eventId: result.eventId,
            error: result.error,
            fbtraceId: result.fbtraceId,
            tokenConfigured: true,
            pixelId: '2204016713738311',
          },
        };

        logger.warn('[testCAPIConnection] Test failed', response.details);
        res.status(500).json(response);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[testCAPIConnection] Exception:', error);

      const response: TestResult = {
        success: false,
        message: 'Erreur lors du test de connexion',
        details: {
          eventId: '',
          error: errorMessage,
          tokenConfigured: false,
          pixelId: '2204016713738311',
        },
      };

      res.status(500).json(response);
    }
  }
);
