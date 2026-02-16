# Systeme de Paiement - SOS Expat

> **Version**: 2.0
> **Date**: 27 Janvier 2026

---

## Vue d'Ensemble

Le systeme de paiement SOS Expat supporte deux passerelles:

| Passerelle | Usage | Commission |
|------------|-------|------------|
| **Stripe Connect** | Principal, cartes bancaires | Variable |
| **PayPal** | Alternatif | Variable |

---

## Architecture

```
┌─────────────────┐
│     CLIENT      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│          CHECKOUT (Frontend)            │
│  CallCheckout.tsx / BookingRequest.tsx  │
└────────┬────────────────────┬───────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│  STRIPE CONNECT │  │     PAYPAL      │
│  @stripe/react  │  │ @paypal/react   │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
┌─────────────────────────────────────────┐
│           CLOUD FUNCTIONS               │
│  createPaymentIntent / processPayment   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│    FIRESTORE    │
│   payments/     │
│   invoices/     │
│   transfers/    │
└─────────────────┘
```

---

## Flux de Paiement Stripe

### 1. Creation du Payment Intent

```typescript
// Cloud Function: createPaymentIntent
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInCents,
  currency: 'eur',
  customer: customerId,
  metadata: {
    userId,
    providerId,
    callDuration,
    serviceType
  },
  transfer_data: {
    destination: providerStripeAccountId,
    amount: providerShareInCents
  }
});
```

### 2. Confirmation Frontend

```typescript
// CallCheckout.tsx
const { error, paymentIntent } = await stripe.confirmCardPayment(
  clientSecret,
  { payment_method: paymentMethodId }
);
```

### 3. Webhook de Confirmation

```typescript
// stripeWebhook Cloud Function
switch (event.type) {
  case 'payment_intent.succeeded':
    await handleSuccessfulPayment(paymentIntent);
    break;
  case 'payment_intent.payment_failed':
    await handleFailedPayment(paymentIntent);
    break;
}
```

---

## Flux de Paiement PayPal

### 1. Creation de l'Ordre

```typescript
// PayPalPaymentForm.tsx
createOrder: async () => {
  const response = await createPayPalOrder({
    amount,
    currency: 'EUR',
    description: `Appel SOS - ${duration} min`
  });
  return response.orderId;
}
```

### 2. Capture du Paiement

```typescript
// onApprove callback
onApprove: async (data) => {
  const result = await capturePayPalOrder(data.orderID);
  if (result.status === 'COMPLETED') {
    await createCallSession();
  }
}
```

---

## Collections Firestore

### payments

```typescript
interface Payment {
  id: string;
  userId: string;
  providerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  gateway: 'stripe' | 'paypal';
  stripePaymentIntentId?: string;
  paypalOrderId?: string;
  metadata: {
    callDuration: number;
    serviceType: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### transfers

```typescript
interface Transfer {
  id: string;
  paymentId: string;
  providerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  stripeTransferId?: string;
  scheduledFor?: Timestamp;
  completedAt?: Timestamp;
}
```

### invoices

```typescript
interface Invoice {
  id: string;
  number: string;
  userId: string;
  paymentId: string;
  amount: number;
  tax: number;
  total: number;
  pdfUrl?: string;
  status: 'draft' | 'issued' | 'paid';
  issuedAt: Timestamp;
}
```

---

## Transferts Differes

Le systeme supporte des transferts differes pour la securite:

```typescript
// Configuration
const TRANSFER_DELAY_HOURS = 72; // 3 jours

// Scheduled Function: processDelayedTransfers
export const processDelayedTransfers = onSchedule(
  { schedule: 'every 1 hours' },
  async () => {
    const pendingTransfers = await getPendingTransfers();
    for (const transfer of pendingTransfers) {
      if (isReadyForTransfer(transfer)) {
        await executeTransfer(transfer);
      }
    }
  }
);
```

---

## Configuration Stripe Connect

### Onboarding des Prestataires

```typescript
// createStripeAccount Cloud Function
const account = await stripe.accounts.create({
  type: 'express',
  country: providerCountry,
  email: providerEmail,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true }
  }
});

// Lien d'onboarding
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${BASE_URL}/dashboard/kyc`,
  return_url: `${BASE_URL}/dashboard/kyc/complete`,
  type: 'account_onboarding'
});
```

### Webhooks Stripe Requis

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `account.updated` (Connect)
- `transfer.created`
- `payout.paid`

---

## Tarification

| Service | Prix | Commission Plateforme |
|---------|------|----------------------|
| Appel Avocat (15 min) | 35 EUR | 30% |
| Appel Expatrie (15 min) | 25 EUR | 30% |
| Abonnement IA (mensuel) | 29 EUR | 100% |
| Abonnement IA (annuel) | 290 EUR | 100% |

---

## Remboursements

### Conditions de Remboursement

- Appel de moins de 2 minutes: remboursement automatique
- Probleme technique: remboursement sur demande
- Annulation avant l'appel: remboursement integral

### Processus

```typescript
// refundPayment Cloud Function
const refund = await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: refundAmount, // Partiel ou total
  reason: 'requested_by_customer'
});

await updatePaymentStatus(paymentId, 'refunded');
await notifyUserOfRefund(userId, refundAmount);
```

---

## Securite

### Validation des Montants

```typescript
// Verification cote serveur
const validatePaymentAmount = (
  serviceType: string,
  duration: number,
  amount: number
): boolean => {
  const expectedAmount = calculateExpectedAmount(serviceType, duration);
  return Math.abs(amount - expectedAmount) < 0.01;
};
```

### Protection Webhook

```typescript
// Verification signature Stripe
const event = stripe.webhooks.constructEvent(
  req.rawBody,
  sig,
  webhookSecret
);
```

---

## Voir Aussi

- [Workflow Complet](./WORKFLOW.md)
- [Configuration](./CONFIGURATION.md)
- [Integration Stripe](../09_INTEGRATIONS/STRIPE.md)
- [Integration PayPal](../09_INTEGRATIONS/PAYPAL.md)
