# Firestore Security Rules Audit Report

**Date:** 2026-01-17
**Auditor:** Claude AI
**Version:** P1-6
**Total Lines:** ~1,100+
**Collections:** 75+

---

## Executive Summary

| Metric | Score | Status |
|--------|-------|--------|
| Overall Security | **85/100** | GOOD |
| Authentication | 95/100 | EXCELLENT |
| Authorization | 85/100 | GOOD |
| Data Validation | 75/100 | ACCEPTABLE |
| Financial Protection | 95/100 | EXCELLENT |
| Admin Controls | 90/100 | EXCELLENT |

**Verdict:** The Firestore rules are well-designed with strong security patterns. A few improvements are recommended before production.

---

## Positive Findings

### 1. Strong Authentication Patterns
- Helper functions (`isAuthenticated()`, `isOwner()`, `isAdmin()`) are well-designed
- Role-based access via custom claims (`request.auth.token.role`)
- Dev role disabled in production (line 27-31)

### 2. Excellent Financial Protection
```
payments, refunds, transfers, payouts, journal_entries
```
- All financial collections use `allow write: if false` (Cloud Functions only)
- Prevents client-side manipulation of financial data
- Audit trail collections are immutable

### 3. Privilege Escalation Prevention
```javascript
// users collection (line 72-78)
!request.resource.data.diff(resource.data).affectedKeys()
  .hasAny(['role', 'isApproved', 'isBanned', 'forcedAiAccess', 'stripeCustomerId'])
```
- Users cannot modify their own role, approval status, or financial IDs
- Same pattern applied to `sos_profiles` for Stripe/PayPal IDs

### 4. Input Validation
```javascript
// reviews collection (line 126-135)
request.resource.data.rating >= 1 && request.resource.data.rating <= 5
request.resource.data.comment.size() <= 2000
```
- Reviews have proper validation for rating range and comment length
- Booking requests validate required fields

### 5. Consistent Cloud Functions Pattern
- 40+ collections use `allow write: if false`
- All sensitive operations delegated to Admin SDK
- Idempotency locks protected (`call_execution_locks`, `invoice_locks`)

---

## Issues Found

### HIGH PRIORITY

#### H1: Public Read on sos_profiles (Line 90)
```javascript
allow read: if true;  // Anyone can read all profiles
```
**Risk:** Exposes all provider data including email addresses.
**Recommendation:** Add field-level restrictions or use Cloud Functions for public data.

```javascript
// SUGGESTED FIX:
allow read: if resource.data.isVisible == true
            || isAuthenticated() && resource.data.uid == request.auth.uid
            || isAdmin();
```

#### H2: Missing Rate Limiting Context
The rules don't prevent rapid-fire reads/writes within allowed operations.
**Recommendation:** Implement App Check and rate limiting via Cloud Functions.

### MEDIUM PRIORITY

#### M1: Notifications Allow Create by Any Auth User (Line 284)
```javascript
allow create: if isAuthenticated() || isAdmin();
```
**Risk:** Any authenticated user can create notifications for any other user.
**Recommendation:** Validate `userId` matches `request.auth.uid`.

```javascript
// SUGGESTED FIX:
allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
```

#### M2: Ad Conversions Allow Anonymous Create (Line 1099)
```javascript
// Même non-auth pour permettre le tracking des visiteurs anonymes
```
**Risk:** Potential for spam/fake conversion data.
**Recommendation:** Use App Check or reCAPTCHA validation.

#### M3: Broad Update Permissions on booking_requests (Line 959-962)
```javascript
allow update: if isAuthenticated() &&
              (resource.data.clientId == request.auth.uid ||
               resource.data.providerId == request.auth.uid || ...)
```
**Risk:** No restriction on which fields can be updated.
**Recommendation:** Add `affectedKeys().hasOnly()` for allowed fields.

### LOW PRIORITY

#### L1: Redundant Dev Role Checks
`isDev()` always returns `false` but is checked in 50+ rules.
**Recommendation:** Remove `|| isDev()` checks or use single `isAdminOrDev()`.

#### L2: Large Rules File
1,100+ lines in single file makes maintenance difficult.
**Recommendation:** Consider splitting into logical modules (if Firebase supports).

---

## Collections Security Matrix

### Fully Protected (Cloud Functions Only)
| Collection | Read | Write | Status |
|------------|------|-------|--------|
| payments | Owner/Admin | CF Only | SECURE |
| refunds | Owner/Admin | CF Only | SECURE |
| transfers | Owner/Admin | CF Only | SECURE |
| journal_entries | Admin | CF Only | SECURE |
| disputes | Admin | CF Only | SECURE |
| audit_logs | Admin | CF Only | SECURE |
| rate_limits | Admin | CF Only | SECURE |

### User-Accessible with Restrictions
| Collection | Read | Write | Status |
|------------|------|-------|--------|
| users | Auth | Owner (limited) | SECURE |
| sos_profiles | Public | Owner (limited) | REVIEW |
| call_sessions | Participants | Participants | SECURE |
| reviews | Public (published) | Client (create) | SECURE |
| subscriptions | Owner | CF Only | SECURE |

### Public Collections
| Collection | Read | Write | Status |
|------------|------|-------|--------|
| faqs | Active only | Admin | SECURE |
| helpCenter | Public | Admin | SECURE |
| legal_documents | Public | Admin | SECURE |
| subscription_plans | Public | Admin | SECURE |

---

## Recommended Actions

### Before Production (P0)
1. **H1:** Restrict public read on `sos_profiles` to visible profiles only
2. Add Firebase App Check for additional security layer

### Short Term (P1)
3. **M1:** Fix notification create validation
4. **M3:** Add field restrictions to `booking_requests` update
5. Add structured tests for security rules

### Medium Term (P2)
6. **M2:** Add rate limiting/validation for analytics collections
7. Refactor to remove redundant `isDev()` checks
8. Document all collections and their access patterns

---

## Test Coverage Recommendations

```javascript
// Example test cases needed:
describe('payments collection', () => {
  it('should deny client-side create', async () => {
    await assertFails(setDoc(doc(db, 'payments/test'), { amount: 100 }));
  });

  it('should allow owner to read their payment', async () => {
    await assertSucceeds(getDoc(doc(db, 'payments/test')));
  });
});

describe('privilege escalation', () => {
  it('should deny user self-promotion to admin', async () => {
    await assertFails(updateDoc(doc(db, 'users/user1'), { role: 'admin' }));
  });
});
```

---

## Conclusion

The Firestore Security Rules demonstrate **mature security practices** with:
- Strong separation between client and server operations
- Comprehensive privilege escalation prevention
- Excellent financial data protection
- Good use of helper functions for consistency

The main areas for improvement are:
- Tightening public read access on `sos_profiles`
- Adding field-level restrictions on some update operations
- Implementing additional anti-abuse measures (App Check, rate limiting)

**Production Readiness: 85% - Ready with minor fixes**
