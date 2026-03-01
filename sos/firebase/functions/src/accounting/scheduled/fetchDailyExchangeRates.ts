/**
 * Cron quotidien - Taux de change ECB
 *
 * Lundi-vendredi a 16h CET (apres publication ECB ~15h45)
 * Region: europe-west3 (Frankfurt) pour coherence avec le module payments
 *
 * @module accounting/scheduled/fetchDailyExchangeRates
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { fetchAndStoreDailyRates } from '../ecbExchangeRateService';

export const fetchDailyExchangeRates = onSchedule(
  {
    schedule: '0 16 * * 1-5', // Lun-Ven 16h CET
    timeZone: 'Europe/Berlin',
    region: 'europe-west3',
    memory: '256MiB',
    timeoutSeconds: 60,
    retryCount: 2,
  },
  async () => {
    try {
      const result = await fetchAndStoreDailyRates();
      logger.info('fetchDailyExchangeRates: Success', result);
    } catch (error) {
      logger.error('fetchDailyExchangeRates: Failed', {
        error: error instanceof Error ? error.message : error,
      });
      throw error; // Retry
    }
  }
);
