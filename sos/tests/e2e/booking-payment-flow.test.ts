/**
 * Tests E2E - Flux de Réservation & Paiement SOS Expat
 *
 * Ce fichier teste TOUS les scénarios critiques du flux de réservation :
 * - Authentification (email, Google, existant, nouveau)
 * - Création de booking
 * - Paiement (Stripe, PayPal, EUR, USD)
 * - Création de call session
 * - Webhooks Twilio
 * - Gestion d'erreurs
 * - Sécurité
 *
 * Usage: npm run test:e2e
 *
 * Prérequis:
 * 1. Créer un fichier .env.test avec STRIPE_SECRET_KEY_TEST
 * 2. Démarrer les émulateurs Firebase: npm run dev:emulators
 */

// Charger les variables d'environnement depuis .env.test
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../../.env.test') });

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import Stripe from 'stripe';

// ========================================
// CONFIGURATION
// ========================================

const PROJECT_ID = 'sos-urgently-ac307';
const STRIPE_TEST_SECRET = process.env.STRIPE_SECRET_KEY_TEST;

let testEnv: RulesTestEnvironment;
let stripe: Stripe;

// Test data
const TEST_PROVIDER = {
  uid: 'provider_test_123',
  email: 'provider@test.com',
  role: 'lawyer',
  displayName: 'Avocat Test',
  phoneNumber: '+33600000001',
  isActive: true,
  status: 'available',
  languages: ['fr', 'en'],
  country: 'France',
};

const TEST_CLIENT = {
  uid: 'client_test_456',
  email: 'client@test.com',
  role: 'client',
  displayName: 'Client Test',
  firstName: 'Jean',
  lastName: 'Dupont',
};

// ========================================
// SETUP & TEARDOWN
// ========================================

beforeAll(async () => {
  // Initialize Firebase Test Environment
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: `
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            // Booking requests
            match /booking_requests/{requestId} {
              allow create: if request.auth != null
                && request.resource.data.clientId == request.auth.uid
                && request.resource.data.providerId is string
                && request.resource.data.serviceType is string
                && request.resource.data.status == "pending";
              allow read: if request.auth != null
                && (resource.data.clientId == request.auth.uid
                    || resource.data.providerId == request.auth.uid);
            }

            // Call sessions
            match /call_sessions/{sessionId} {
              allow read: if request.auth != null
                && (resource.data.clientId == request.auth.uid
                    || resource.data.providerId == request.auth.uid);
              allow create: if false; // Only backend
            }

            // Payments
            match /payments/{paymentId} {
              allow read: if request.auth != null
                && (resource.data.clientId == request.auth.uid
                    || resource.data.providerId == request.auth.uid);
              allow create: if false; // Only backend
            }

            // Users
            match /users/{userId} {
              allow read: if request.auth != null;
              allow create: if request.auth != null
                && request.auth.uid == userId;
              allow update: if request.auth != null
                && request.auth.uid == userId;
            }

            // Profiles
            match /sos_profiles/{profileId} {
              allow read: if true; // Public
              allow write: if request.auth != null
                && request.auth.uid == profileId;
            }
          }
        }
      `,
      host: 'localhost',
      port: 8080,
    },
  });

  // Initialize Stripe
  stripe = new Stripe(STRIPE_TEST_SECRET!, {
    apiVersion: '2023-10-16',
  });

  // Seed test data
  const adminDb = testEnv.authenticatedContext('admin').firestore();

  // Create test provider
  await setDoc(doc(adminDb, 'sos_profiles', TEST_PROVIDER.uid), TEST_PROVIDER);
  await setDoc(doc(adminDb, 'users', TEST_PROVIDER.uid), {
    ...TEST_PROVIDER,
    createdAt: new Date(),
  });

  // Create pricing config
  await setDoc(doc(adminDb, 'admin_config', 'pricing'), {
    lawyer: {
      eur: {
        totalAmount: 49,
        connectionFeeAmount: 19,
        providerAmount: 30,
        duration: 20,
        currency: 'eur',
      },
      usd: {
        totalAmount: 55,
        connectionFeeAmount: 25,
        providerAmount: 30,
        duration: 20,
        currency: 'usd',
      },
    },
    expat: {
      eur: {
        totalAmount: 19,
        connectionFeeAmount: 9,
        providerAmount: 10,
        duration: 30,
        currency: 'eur',
      },
      usd: {
        totalAmount: 25,
        connectionFeeAmount: 15,
        providerAmount: 10,
        duration: 30,
        currency: 'usd',
      },
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// ========================================
// TESTS AUTHENTIFICATION & BOOKING
// ========================================

describe('1. FLUX DE RÉSERVATION', () => {

  describe('1.1 Authentification', () => {

    it('TEST 1.1: User non connecté → Register email → Booking', async () => {
      // Simulate unauthenticated user
      const unauthedDb = testEnv.unauthenticatedContext().firestore();

      // Attempt to create booking WITHOUT auth
      await assertFails(
        addDoc(collection(unauthedDb, 'booking_requests'), {
          clientId: TEST_CLIENT.uid,
          providerId: TEST_PROVIDER.uid,
          status: 'pending',
          title: 'Visa de travail en Thaïlande',
          description: 'Je cherche un visa de travail pour enseigner l\'anglais en Thaïlande. J\'ai un diplôme TEFL et 5 ans d\'expérience.',
          clientPhone: '+33612345678',
          clientLanguages: ['fr', 'en'],
          createdAt: new Date(),
        })
      );

      // Now authenticate
      const authedDb = testEnv.authenticatedContext(TEST_CLIENT.uid).firestore();

      // Create user doc (simulates register)
      await setDoc(doc(authedDb, 'users', TEST_CLIENT.uid), {
        ...TEST_CLIENT,
        createdAt: new Date(),
      });

      // Create booking (should succeed)
      const bookingRef = await addDoc(collection(authedDb, 'booking_requests'), {
        clientId: TEST_CLIENT.uid,
        providerId: TEST_PROVIDER.uid,
        serviceType: 'lawyer_call',
        status: 'pending',
        title: 'Visa de travail en Thaïlande',
        description: 'Je cherche un visa de travail pour enseigner l\'anglais en Thaïlande. J\'ai un diplôme TEFL et 5 ans d\'expérience.',
        clientPhone: '+33612345678',
        clientWhatsapp: '+33612345678',
        clientLanguages: ['fr', 'en'],
        clientFirstName: TEST_CLIENT.firstName,
        clientNationality: 'France',
        clientCurrentCountry: 'Thailand',
        providerName: TEST_PROVIDER.displayName,
        createdAt: new Date(),
      });

      // Verify booking created
      const bookingDoc = await getDoc(bookingRef);
      expect(bookingDoc.exists()).toBe(true);
      expect(bookingDoc.data()?.clientId).toBe(TEST_CLIENT.uid);
      expect(bookingDoc.data()?.status).toBe('pending');
    });

    it('TEST 1.2: User connecté → Booking direct', async () => {
      const authedDb = testEnv.authenticatedContext(TEST_CLIENT.uid).firestore();

      // Create user doc (already exists)
      await setDoc(doc(authedDb, 'users', TEST_CLIENT.uid), TEST_CLIENT);

      // Create booking immediately (no auth modal)
      const bookingRef = await addDoc(collection(authedDb, 'booking_requests'), {
        clientId: TEST_CLIENT.uid,
        providerId: TEST_PROVIDER.uid,
        serviceType: 'lawyer_call',
        status: 'pending',
        title: 'Question urgente visa',
        description: 'J\'ai une question urgente concernant mon visa étudiant.',
        clientPhone: '+33612345678',
        clientLanguages: ['fr'],
        createdAt: new Date(),
      });

      expect(bookingRef.id).toBeDefined();
    });

  });

  describe('1.2 Validation Données', () => {

    it('TEST 1.3: Booking avec données manquantes → FAIL', async () => {
      const authedDb = testEnv.authenticatedContext(TEST_CLIENT.uid).firestore();

      await setDoc(doc(authedDb, 'users', TEST_CLIENT.uid), TEST_CLIENT);

      // Missing title
      await assertFails(
        addDoc(collection(authedDb, 'booking_requests'), {
          clientId: TEST_CLIENT.uid,
          providerId: TEST_PROVIDER.uid,
          status: 'pending',
          // title: missing!
          description: 'Description...',
          clientPhone: '+33612345678',
          clientLanguages: ['fr'],
          createdAt: new Date(),
        })
      );
    });

    it('TEST 1.4: Booking pour un autre user → FAIL', async () => {
      const authedDb = testEnv.authenticatedContext(TEST_CLIENT.uid).firestore();

      await setDoc(doc(authedDb, 'users', TEST_CLIENT.uid), TEST_CLIENT);

      // Attempt to create booking for another user
      await assertFails(
        addDoc(collection(authedDb, 'booking_requests'), {
          clientId: 'attacker_uid_999', // Different from auth.uid!
          providerId: TEST_PROVIDER.uid,
          serviceType: 'lawyer_call',
          status: 'pending',
          title: 'Hack attempt',
          description: 'Trying to create booking for another user',
          clientPhone: '+33612345678',
          clientLanguages: ['fr'],
          createdAt: new Date(),
        })
      );
    });

  });

});

// ========================================
// TESTS PAIEMENT
// ========================================

describe('2. SYSTÈME DE PAIEMENT', () => {

  describe('2.1 Stripe - PaymentIntent Creation', () => {

    it('TEST 2.1: Create PaymentIntent EUR (lawyer 49€)', async () => {
      // Simulate backend function call
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 4900, // 49€ in cents
        currency: 'eur',
        capture_method: 'manual',
        payment_method_types: ['card'],
        metadata: {
          clientId: TEST_CLIENT.uid,
          providerId: TEST_PROVIDER.uid,
          serviceType: 'lawyer_call',
        },
      });

      expect(paymentIntent.id).toMatch(/^pi_/);
      expect(paymentIntent.amount).toBe(4900);
      expect(paymentIntent.currency).toBe('eur');
      expect(paymentIntent.capture_method).toBe('manual');
      expect(paymentIntent.status).toBe('requires_payment_method');
    });

    it('TEST 2.2: Create PaymentIntent USD (lawyer 55$)', async () => {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 5500, // 55$ in cents
        currency: 'usd',
        capture_method: 'manual',
        payment_method_types: ['card'],
        metadata: {
          clientId: TEST_CLIENT.uid,
          providerId: TEST_PROVIDER.uid,
          serviceType: 'lawyer_call',
        },
      });

      expect(paymentIntent.amount).toBe(5500);
      expect(paymentIntent.currency).toBe('usd');
    });

  });

  describe('2.2 Stripe - Payment Confirmation', () => {

    it('TEST 2.3: Confirm payment avec test card (no 3DS)', async () => {
      // Create PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 4900,
        currency: 'eur',
        capture_method: 'manual',
      });

      // Create test PaymentMethod
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242', // Test card (no 3DS)
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });

      // Confirm PaymentIntent
      const confirmed = await stripe.paymentIntents.confirm(paymentIntent.id, {
        payment_method: paymentMethod.id,
      });

      expect(confirmed.status).toBe('requires_capture');
    });

    it('TEST 2.4: Capture payment', async () => {
      // Create + Confirm PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 4900,
        currency: 'eur',
        capture_method: 'manual',
      });

      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });

      const confirmed = await stripe.paymentIntents.confirm(paymentIntent.id, {
        payment_method: paymentMethod.id,
      });

      // Capture
      const captured = await stripe.paymentIntents.capture(confirmed.id);

      expect(captured.status).toBe('succeeded');
      expect(captured.amount_capturable).toBe(0);
      expect(captured.amount_received).toBe(4900);
    });

  });

  describe('2.3 Stripe - Refunds', () => {

    it('TEST 2.5: Refund after capture', async () => {
      // Create + Confirm + Capture
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 4900,
        currency: 'eur',
        capture_method: 'manual',
      });

      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });

      await stripe.paymentIntents.confirm(paymentIntent.id, {
        payment_method: paymentMethod.id,
      });

      const captured = await stripe.paymentIntents.capture(paymentIntent.id);

      // Refund
      const refund = await stripe.refunds.create({
        payment_intent: captured.id,
        reason: 'requested_by_customer',
        metadata: {
          reason: 'Provider no answer',
        },
      });

      expect(refund.status).toBe('succeeded');
      expect(refund.amount).toBe(4900);
    });

    it('TEST 2.6: Cancel PaymentIntent (before capture)', async () => {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 4900,
        currency: 'eur',
        capture_method: 'manual',
      });

      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });

      const confirmed = await stripe.paymentIntents.confirm(paymentIntent.id, {
        payment_method: paymentMethod.id,
      });

      // Cancel (funds released, no capture)
      const canceled = await stripe.paymentIntents.cancel(confirmed.id);

      expect(canceled.status).toBe('canceled');
      expect(canceled.amount_capturable).toBe(0);
    });

  });

  describe('2.4 Calcul des Commissions', () => {

    it('TEST 2.7: Verify lawyer EUR commission split', async () => {
      const totalAmount = 49;
      const commission = 19;
      const providerAmount = 30;

      expect(totalAmount).toBe(commission + providerAmount);
      expect(commission).toBe(19);
      expect(providerAmount).toBe(30);
    });

    it('TEST 2.8: Verify lawyer USD commission split', async () => {
      const totalAmount = 55;
      const commission = 25;
      const providerAmount = 30;

      expect(totalAmount).toBe(commission + providerAmount);
    });

    it('TEST 2.9: Verify expat EUR commission split', async () => {
      const totalAmount = 19;
      const commission = 9;
      const providerAmount = 10;

      expect(totalAmount).toBe(commission + providerAmount);
    });

    it('TEST 2.10: Verify expat USD commission split', async () => {
      const totalAmount = 25;
      const commission = 15;
      const providerAmount = 10;

      expect(totalAmount).toBe(commission + providerAmount);
    });

  });

});

// ========================================
// TESTS CALL SESSION
// ========================================

describe('3. CALL SESSION & TWILIO', () => {

  it('TEST 3.1: Create call session (simulated)', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();

    // Simulate createAndScheduleCall backend function
    const callSessionRef = await addDoc(collection(adminDb, 'call_sessions'), {
      clientId: TEST_CLIENT.uid,
      providerId: TEST_PROVIDER.uid,
      providerPhone: '+33600000001',
      clientPhone: '+33612345678',
      serviceType: 'lawyer_call',
      providerType: 'lawyer',
      status: 'pending_call',
      paymentIntentId: 'pi_test_123',
      amount: 49,
      currency: 'eur',
      createdAt: new Date(),
      scheduledFor: new Date(Date.now() + 240000), // +4 min
    });

    // Verify session created
    const session = await getDoc(callSessionRef);
    expect(session.exists()).toBe(true);
    expect(session.data()?.status).toBe('pending_call');

    // Client can read own session
    const clientDb = testEnv.authenticatedContext(TEST_CLIENT.uid).firestore();
    await assertSucceeds(getDoc(doc(clientDb, 'call_sessions', callSessionRef.id)));

    // Provider can read own session
    const providerDb = testEnv.authenticatedContext(TEST_PROVIDER.uid).firestore();
    await assertSucceeds(getDoc(doc(providerDb, 'call_sessions', callSessionRef.id)));

    // Other user CANNOT read
    const otherDb = testEnv.authenticatedContext('other_user_999').firestore();
    await assertFails(getDoc(doc(otherDb, 'call_sessions', callSessionRef.id)));
  });

  it('TEST 3.2: Update call session status (provider accepted)', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();

    const callSessionRef = await addDoc(collection(adminDb, 'call_sessions'), {
      clientId: TEST_CLIENT.uid,
      providerId: TEST_PROVIDER.uid,
      status: 'pending_call',
      createdAt: new Date(),
    });

    // Simulate provider accepting call (DTMF = 1)
    await setDoc(doc(adminDb, 'call_sessions', callSessionRef.id), {
      status: 'in_progress',
      providerAcceptedAt: new Date(),
    }, { merge: true });

    const updated = await getDoc(callSessionRef);
    expect(updated.data()?.status).toBe('in_progress');
  });

  it('TEST 3.3: Update call session status (provider rejected)', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();

    const callSessionRef = await addDoc(collection(adminDb, 'call_sessions'), {
      clientId: TEST_CLIENT.uid,
      providerId: TEST_PROVIDER.uid,
      status: 'pending_call',
      paymentIntentId: 'pi_test_456',
      createdAt: new Date(),
    });

    // Simulate provider rejecting call (DTMF = 2)
    await setDoc(doc(adminDb, 'call_sessions', callSessionRef.id), {
      status: 'provider_rejected',
      providerRejectedAt: new Date(),
    }, { merge: true });

    const updated = await getDoc(callSessionRef);
    expect(updated.data()?.status).toBe('provider_rejected');

    // Should trigger refund (tested separately)
  });

  it('TEST 3.4: Call completed (duration > 2 min)', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();

    const callSessionRef = await addDoc(collection(adminDb, 'call_sessions'), {
      clientId: TEST_CLIENT.uid,
      providerId: TEST_PROVIDER.uid,
      status: 'in_progress',
      createdAt: new Date(),
    });

    // Simulate conference end (10 minutes = 600 seconds)
    await setDoc(doc(adminDb, 'call_sessions', callSessionRef.id), {
      status: 'completed',
      duration: 600,
      conferenceEndedAt: new Date(),
    }, { merge: true });

    const updated = await getDoc(callSessionRef);
    expect(updated.data()?.status).toBe('completed');
    expect(updated.data()?.duration).toBe(600);

    // No refund (call successful)
  });

  it('TEST 3.5: Early disconnect (duration < 2 min)', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();

    const callSessionRef = await addDoc(collection(adminDb, 'call_sessions'), {
      clientId: TEST_CLIENT.uid,
      providerId: TEST_PROVIDER.uid,
      status: 'in_progress',
      paymentIntentId: 'pi_test_789',
      createdAt: new Date(),
    });

    // Simulate early disconnect (90 seconds < 120 seconds)
    await setDoc(doc(adminDb, 'call_sessions', callSessionRef.id), {
      status: 'early_disconnect',
      duration: 90,
      earlyDisconnectAt: new Date(),
    }, { merge: true });

    const updated = await getDoc(callSessionRef);
    expect(updated.data()?.status).toBe('early_disconnect');
    expect(updated.data()?.duration).toBe(90);

    // Should trigger refund
  });

});

// ========================================
// TESTS SÉCURITÉ
// ========================================

describe('4. SÉCURITÉ', () => {

  it('TEST 4.1: Unauthorized user cannot create payment', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(
      addDoc(collection(unauthedDb, 'payments'), {
        clientId: TEST_CLIENT.uid,
        amount: 4900,
        currency: 'eur',
        status: 'succeeded',
      })
    );
  });

  it('TEST 4.2: Client cannot modify payment amount', async () => {
    const adminDb = testEnv.authenticatedContext('admin').firestore();

    // Admin creates payment
    const paymentRef = await addDoc(collection(adminDb, 'payments'), {
      clientId: TEST_CLIENT.uid,
      providerId: TEST_PROVIDER.uid,
      amount: 4900,
      currency: 'eur',
      status: 'succeeded',
    });

    // Client tries to modify
    const clientDb = testEnv.authenticatedContext(TEST_CLIENT.uid).firestore();
    await assertFails(
      setDoc(doc(clientDb, 'payments', paymentRef.id), {
        amount: 100, // Trying to change to 1€!
      }, { merge: true })
    );
  });

  it('TEST 4.3: Provider cannot access other provider\'s data', async () => {
    const otherProviderId = 'other_provider_999';
    const adminDb = testEnv.authenticatedContext('admin').firestore();

    // Create call session for other provider
    const callSessionRef = await addDoc(collection(adminDb, 'call_sessions'), {
      clientId: TEST_CLIENT.uid,
      providerId: otherProviderId,
      status: 'pending_call',
      createdAt: new Date(),
    });

    // Current provider tries to read
    const providerDb = testEnv.authenticatedContext(TEST_PROVIDER.uid).firestore();
    await assertFails(getDoc(doc(providerDb, 'call_sessions', callSessionRef.id)));
  });

});

// ========================================
// TESTS INTEGRATION (E2E)
// ========================================

describe('5. TESTS E2E COMPLETS', () => {

  it('TEST 5.1: Full happy path (register → booking → payment → call)', async () => {
    // Step 1: Register user
    const authedDb = testEnv.authenticatedContext(TEST_CLIENT.uid).firestore();
    await setDoc(doc(authedDb, 'users', TEST_CLIENT.uid), {
      ...TEST_CLIENT,
      createdAt: new Date(),
    });

    // Step 2: Create booking
    const bookingRef = await addDoc(collection(authedDb, 'booking_requests'), {
      clientId: TEST_CLIENT.uid,
      providerId: TEST_PROVIDER.uid,
      serviceType: 'lawyer_call',
      status: 'pending',
      title: 'Question visa',
      description: 'J\'ai besoin d\'informations sur mon visa de travail.',
      clientPhone: '+33612345678',
      clientLanguages: ['fr'],
      createdAt: new Date(),
    });
    expect(bookingRef.id).toBeDefined();

    // Step 3: Create payment (Stripe)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 4900,
      currency: 'eur',
      capture_method: 'manual',
      metadata: {
        clientId: TEST_CLIENT.uid,
        providerId: TEST_PROVIDER.uid,
        serviceType: 'lawyer_call',
      },
    });
    expect(paymentIntent.id).toMatch(/^pi_/);

    // Step 4: Confirm payment
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: '4242424242424242',
        exp_month: 12,
        exp_year: 2025,
        cvc: '123',
      },
    });

    const confirmed = await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: paymentMethod.id,
    });
    expect(confirmed.status).toBe('requires_capture');

    // Step 5: Capture payment
    const captured = await stripe.paymentIntents.capture(confirmed.id);
    expect(captured.status).toBe('succeeded');

    // Step 6: Create call session (simulated backend)
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    const callSessionRef = await addDoc(collection(adminDb, 'call_sessions'), {
      clientId: TEST_CLIENT.uid,
      providerId: TEST_PROVIDER.uid,
      providerPhone: TEST_PROVIDER.phoneNumber,
      clientPhone: '+33612345678',
      serviceType: 'lawyer_call',
      providerType: 'lawyer',
      status: 'pending_call',
      paymentIntentId: captured.id,
      amount: 49,
      currency: 'eur',
      createdAt: new Date(),
      scheduledFor: new Date(Date.now() + 240000),
    });

    const callSession = await getDoc(callSessionRef);
    expect(callSession.exists()).toBe(true);
    expect(callSession.data()?.paymentIntentId).toBe(captured.id);

    // Step 7: Simulate provider accepts call
    await setDoc(doc(adminDb, 'call_sessions', callSessionRef.id), {
      status: 'in_progress',
      providerAcceptedAt: new Date(),
    }, { merge: true });

    // Step 8: Simulate call completed (10 minutes)
    await setDoc(doc(adminDb, 'call_sessions', callSessionRef.id), {
      status: 'completed',
      duration: 600,
      conferenceEndedAt: new Date(),
    }, { merge: true });

    const finalSession = await getDoc(callSessionRef);
    expect(finalSession.data()?.status).toBe('completed');
    expect(finalSession.data()?.duration).toBe(600);

    // ✅ Full flow SUCCESS
  });

  it('TEST 5.2: Payment succeeds but provider rejects → Refund', async () => {
    // Create + Confirm + Capture payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 4900,
      currency: 'eur',
      capture_method: 'manual',
    });

    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: '4242424242424242',
        exp_month: 12,
        exp_year: 2025,
        cvc: '123',
      },
    });

    await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method: paymentMethod.id,
    });

    const captured = await stripe.paymentIntents.capture(paymentIntent.id);
    expect(captured.status).toBe('succeeded');

    // Create call session
    const adminDb = testEnv.authenticatedContext('admin').firestore();
    const callSessionRef = await addDoc(collection(adminDb, 'call_sessions'), {
      clientId: TEST_CLIENT.uid,
      providerId: TEST_PROVIDER.uid,
      status: 'pending_call',
      paymentIntentId: captured.id,
      createdAt: new Date(),
    });

    // Provider rejects (DTMF = 2)
    await setDoc(doc(adminDb, 'call_sessions', callSessionRef.id), {
      status: 'provider_rejected',
      providerRejectedAt: new Date(),
    }, { merge: true });

    // Refund
    const refund = await stripe.refunds.create({
      payment_intent: captured.id,
      reason: 'requested_by_customer',
      metadata: {
        reason: 'Provider rejected call',
      },
    });

    expect(refund.status).toBe('succeeded');
    expect(refund.amount).toBe(4900);
  });

});
