# Plan de Migrations des Dépendances

Date: 2026-02-14

## Week 1: Immediate Actions (This Week)

### High Priority Patches (Security)

Task 1: Update Sentry (4 patches)
bash
cd sos
npm update @sentry/react @sentry/node
npm run typecheck
npm run build
npm run test:run
bash

Expected Time: 30 minutes
Risk: LOW

Task 2: Update Zod patch
bash
cd sos
npm update zod
npm run typecheck
npm run build
bash

Expected Time: 15 minutes
Risk: LOW

---

## February 2026: Minor & Patch Updates

### Safe Updates

Task 1: Update Firebase (minor)
bash
cd sos
npm update firebase
npm run dev:emulators &
npm run dev &
bash

Expected Time: 2 hours
Risk: LOW

Task 2: Update Phone Validation
bash
cd sos
npm update libphonenumber-js
npm run test:run
bash

Expected Time: 1 hour
Risk: LOW

---

## Q1 2026: Major Version Upgrades (Planning Phase)

### Firebase Major Version Upgrade Sprint

Duration: 3-4 days
Risk: MEDIUM

Pre-Planning:
bash
cd sos/firebase/functions
npm list firebase-admin firebase-functions
npm outdated
npm audit
bash

Day 2: Upgrade & Refactor
bash
npm install firebase-admin@13 firebase-functions@8
npm run build
bash

Day 3: Testing
bash
npm run test:coverage
npm run dev:emulators
bash

Day 4: Deployment
bash
npm run build
firebase deploy --only functions
bash

---

## Q2 2026: Critical Payment Systems Audit

### Stripe Upgrade Sprint (Very High Risk)

Duration: 2 weeks
Risk: VERY HIGH

Phase 1: Audit (3 days)
- Document current Stripe implementation
- Review stripe@14.25.0 vs stripe@20.3.1
- Document breaking changes
- Create comprehensive test plan

Phase 2: Refactor (4 days)
bash
git checkout -b feat/stripe-v20-upgrade
npm install stripe@20
npm run build
bash

Phase 3: Testing (4 days)
- Unit & integration tests
- E2E testing (payment flow, webhooks)
- Staging deployment

Phase 4: Production Deployment (2 days)
bash
firebase deploy --only functions --project=sos-urgently-ac307
bash

---

## Q3 2026: Twilio Call System Audit

### Twilio Upgrade Sprint (Very High Risk)

Duration: 2-3 weeks
Risk: VERY HIGH

Key Files:
- TwilioCallManager.ts
- twilioWebhooks.ts
- TwilioConferenceWebhook.ts

Phase 1: Audit (3-4 days)
- Document conference creation
- Analyze webhook handling
- Review DTMF gathering
- Plan test scenarios

Phase 2: Implementation (5-7 days)
bash
git checkout -b feat/twilio-v5-upgrade
npm install twilio@5
npm run build
bash

Phase 3: Testing (5-7 days)
- Create call between two parties
- Add third party to conference
- Handle DTMF input
- Test webhook delivery
- Test error recovery

Phase 4: Deployment (3-5 days)
bash
firebase deploy --only functions
bash

---

## Items to NEVER Upgrade Without Full Audit

FROZEN (Production Critical):
- stripe@14.25.0 (backend payments)
- @stripe/stripe-js@7.9.0 (frontend)
- @stripe/react-stripe-js@3.10.0 (frontend)
- twilio@4.23.0 (backend calls)

---

## Recommended Timeline Summary

Week 1 (This Week):
  - Sentry patches
  - Zod patch
  - Run full tests

February:
  - Firebase minor
  - Phone validation
  - UI components

Q1 2026:
  - Firebase major (3-4 days)

Q2 2026:
  - Stripe audit & upgrade (2 weeks)

Q3 2026:
  - Twilio audit & upgrade (2-3 weeks)

Q4 2026:
  - React 19 migration (2-3 weeks)
  - Vite 7 migration
  - Tailwind 4 migration

---

Generated: 2026-02-14 | Revision: 1.0
