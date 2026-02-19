/**
 * Centralized Firebase Admin instances
 * Used by securityAlerts module for consistent db/messaging access
 */

import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export const db = getFirestore();
export const messaging = getMessaging();
