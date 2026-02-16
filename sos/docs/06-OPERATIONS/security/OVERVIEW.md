# Securite - SOS Expat

> **Version**: 2.0
> **Date**: 27 Janvier 2026
> **Score Global**: 85/100

---

## Vue d'Ensemble

La securite de SOS Expat repose sur plusieurs couches:

1. **Firebase Security Rules** - Protection des donnees
2. **Authentication** - Firebase Auth avec custom claims
3. **Backend Validation** - Zod schemas + rate limiting
4. **Encryption** - AES-256 pour donnees sensibles
5. **Monitoring** - Sentry + Cloud Logging

---

## Firestore Security Rules

### Score: 85/100

**Points Forts:**
- Authentification bien implementee (custom claims)
- Protection escalade privileges (champs immutables)
- Toutes finances en Cloud Functions only
- Catch-all deny par defaut
- 40+ collections protegees

### Structure des Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // === HELPERS ===
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() &&
             request.auth.token.role == 'admin';
    }

    function isOwner(userId) {
      return isAuthenticated() &&
             request.auth.uid == userId;
    }

    // === USERS ===
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) &&
                       !request.resource.data.diff(resource.data).affectedKeys()
                        .hasAny(['role', 'isAdmin', 'affiliateCommissionRate']);
      allow delete: if false;
    }

    // === PAYMENTS (Cloud Functions only) ===
    match /payments/{paymentId} {
      allow read: if isAdmin() ||
                    resource.data.userId == request.auth.uid;
      allow write: if false; // Cloud Functions only
    }

    // === CATCH-ALL ===
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Collections Protegees

| Collection | Read | Write | Notes |
|------------|------|-------|-------|
| `users` | Owner/Admin | Owner (limite) | Champs role immutables |
| `sos_profiles` | Public | Owner | Profile prestataire |
| `payments` | Owner/Admin | Functions only | - |
| `invoices` | Owner/Admin | Functions only | - |
| `transfers` | Admin | Functions only | - |
| `call_sessions` | Participants | Functions only | - |
| `subscriptions` | Owner/Admin | Functions only | - |

---

## Authentication

### Firebase Auth Configuration

- **Providers**: Email/Password, Google, Apple
- **Custom Claims**: `role`, `isAdmin`, `providerId`
- **Session**: Token refresh automatique

### Roles et Permissions

```typescript
type UserRole = 'client' | 'lawyer' | 'expat' | 'admin';

const PERMISSIONS = {
  client: ['read:own', 'create:booking', 'create:payment'],
  lawyer: ['read:own', 'read:bookings', 'update:availability'],
  expat: ['read:own', 'read:bookings', 'update:availability'],
  admin: ['*']
};
```

### Protection des Routes

```typescript
// ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole | UserRole[];
  requireKYC?: boolean;
}

// Verification
if (!user) return <Navigate to="/login" />;
if (allowedRoles && !allowedRoles.includes(user.role)) {
  return <Navigate to="/unauthorized" />;
}
```

---

## Backend Security

### Rate Limiting

```typescript
const RATE_LIMITS = {
  AI_CHAT: { limit: 50, windowSeconds: 3600 },
  AI_CHAT_PROVIDER: { limit: 200, windowSeconds: 3600 },
  WEBHOOK_INGEST: { limit: 100, windowSeconds: 60 },
  BOOKING_CREATE: { limit: 20, windowSeconds: 3600 },
  MESSAGE_SEND: { limit: 100, windowSeconds: 3600 }
};
```

### Validation avec Zod

```typescript
import { z } from 'zod';

const EmailSchema = z.string().email().toLowerCase().trim();
const PhoneSchema = z.string().regex(/^\+[1-9]\d{1,14}$/);

const BookingSchema = z.object({
  providerId: z.string().min(1),
  duration: z.number().min(5).max(120),
  serviceType: z.enum(['lawyer_call', 'expat_call']),
  clientPhone: PhoneSchema
});
```

### Headers Securite

```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; ...",
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
```

---

## Encryption

### Donnees Chiffrees

| Donnee | Algorithme | Usage |
|--------|------------|-------|
| IBAN/Comptes bancaires | AES-256-CBC | Affiliation |
| Telephones (backup) | AES-256-GCM | GDPR |
| Tokens SSO | JWT RS256 | Auth |

### Implementation

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes hex

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## Webhooks Security

### Stripe Webhook Verification

```typescript
const event = stripe.webhooks.constructEvent(
  req.rawBody,
  req.headers['stripe-signature'],
  STRIPE_WEBHOOK_SECRET
);
```

### Wise Webhook Verification

```typescript
function verifyWiseSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## Problemes Identifies et Corrections

### Haute Priorite (Corriges)

| Probleme | Status | Correction |
|----------|--------|------------|
| IDOR DossierDetail.tsx | CORRIGE | Verification userId |
| Dashboard sans filtrage | CORRIGE | Filtrage par provider |
| Messages exposes | CORRIGE | Filtrage par participant |
| Routes admin non protegees | CORRIGE | ProtectedRoute + role check |

### Moyenne Priorite (A faire)

| Probleme | Priorite | Action |
|----------|----------|--------|
| Public read sos_profiles | P2 | Restreindre aux profiles visibles |
| MFA admin manquant | P2 | Implementer TOTP |
| Audit npm dependances | P3 | npm audit fix |

---

## Checklist Securite Pre-Production

### Authentication
- [x] Email/password + rate limiting Firebase
- [x] Custom claims pour roles
- [ ] MFA pour admins
- [x] Session timeout configure

### Protection des Donnees
- [x] HTTPS + HSTS
- [x] Chiffrement AES-256 donnees sensibles
- [x] Firestore rules deployees
- [x] Storage rules deployees

### GDPR Compliance
- [x] Audit trail pour modifications
- [x] Export donnees utilisateur
- [x] Suppression compte possible
- [x] Consentement cookies

### API Security
- [x] Verification signature webhooks
- [x] Rate limiting
- [x] Validation inputs (Zod)
- [x] Headers securite

### Monitoring
- [x] Sentry error tracking
- [x] Cloud Logging
- [x] Alertes anomalies
- [ ] SIEM integration

---

## Tests de Securite Recommandes

### Tests Manuels

1. **Escalade de privileges**
   - Tenter d'acceder aux routes admin sans role
   - Modifier le role dans le localStorage
   - Appeler des Cloud Functions admin sans permission

2. **IDOR (Insecure Direct Object Reference)**
   - Acceder aux documents d'autres utilisateurs
   - Modifier des IDs dans les URLs
   - Manipuler les payloads API

3. **Injection**
   - SQL injection (N/A - NoSQL)
   - XSS dans les champs de formulaire
   - Command injection

4. **Authentication**
   - Brute force login
   - Token manipulation
   - Session hijacking

### Outils Recommandes

- OWASP ZAP (scan automatise)
- Burp Suite (tests manuels)
- Firebase Security Rules Playground

---

## Voir Aussi

- [Regles Firestore](./FIRESTORE_RULES.md)
- [Checklist Complete](./CHECKLIST.md)
- [Audit Detaille](./AUDIT.md)
