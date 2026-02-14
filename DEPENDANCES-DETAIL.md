# Détail des Dépendances par Package

Generated: 2026-02-14

## Frontend - Core Framework

### react & react-dom
- Version: 18.3.1
- Latest: 19.2.4
- Status: Stable LTS
- Priority: Low (stay on 18 until Q3 2026)
- Notes: Hooks API changes major in v19

### vite
- Version: 5.4.21
- Latest: 7.3.1 (2 majeures)
- Status: Outdated major
- Priority: Medium
- Effort: 2-3 days

### typescript
- Version: 5.9.2
- Latest: 5.9.2
- Status: Up-to-date
- Build flags: Use --skipLibCheck

### react-router-dom
- Version: 6.30.2
- Latest: 7.13.0 (1 majeure)
- Status: Outdated major
- Priority: Medium
- Notes: Nested routes audit needed

## Frontend - Forms & Input

### react-hook-form
- Version: 7.70.0
- Latest: 7.71.1
- Status: Up-to-date
- Priority: Low
- Usage: All registration forms

### libphonenumber-js
- Version: 1.12.33
- Latest: 1.12.36 (patch)
- Status: Patch available
- Priority: Low
- Upgrade: Safe

### react-dropzone
- Version: 14.3.8
- Latest: 15.0.0 (majeure)
- Status: Outdated major
- Priority: Medium
- Impact: CV/document upload

### zod
- Version: 4.3.5
- Latest: 4.3.6
- Status: Patch available
- Priority: Low
- Upgrade: Safe

## Frontend - UI & Styling

### tailwindcss
- Version: 3.4.19
- Latest: 4.1.18 (1 majeure)
- Status: Outdated major
- Priority: Medium
- Effort: 1-2 days

### @mui/material
- Version: 7.3.6
- Latest: 7.3.8 (patch)
- Status: Patch available
- Priority: Low

### framer-motion
- Version: 11.18.2
- Latest: 12.34.0 (1 majeure)
- Status: Outdated major
- Priority: Low
- Notes: Secondary animations

### lucide-react
- Version: 0.539.0
- Latest: 0.564.0
- Status: Minor update
- Priority: Low
- Upgrade: Safe (icons only)

## Frontend - Data & Visualization

### recharts
- Version: 3.6.0
- Latest: 3.7.0 (patch)
- Status: Patch available
- Priority: Low
- Usage: Dashboard charts

### date-fns
- Version: 4.1.0
- Latest: 4.1.0
- Status: Up-to-date
- Priority: Low

### fuse.js
- Version: 7.1.0
- Latest: 7.1.0
- Status: Up-to-date
- Priority: Low

## Frontend - PDF & Export

### jspdf
- Version: 3.0.4
- Latest: 4.1.0 (1 majeure)
- Status: Outdated major
- Priority: Low
- Effort: 1 day
- Usage: Quote/invoice exports

### html2canvas
- Version: 1.4.1
- Latest: 1.4.1
- Status: Up-to-date
- Priority: Low

### xlsx
- Version: 0.18.5
- Latest: 0.18.5
- Status: Up-to-date
- Priority: Low

## Frontend - Payments & Finance

### @stripe/stripe-js
- Version: 7.9.0
- Latest: 8.7.0 (majeure)
- Status: FROZEN
- Priority: Critical
- Risk: VERY HIGH
- Plan: Q2 2026 (full audit required)

### @stripe/react-stripe-js
- Version: 3.10.0
- Latest: 5.6.0 (2 majeures)
- Status: FROZEN
- Priority: Critical
- Risk: VERY HIGH
- Impact: Payment Element components

### @paypal/react-paypal-js
- Version: 8.9.2
- Latest: 8.9.2
- Status: Up-to-date
- Priority: Low

## Frontend - i18n & Localization

### react-intl
- Version: 7.1.14
- Latest: 8.1.3 (1 majeure)
- Status: Outdated major
- Priority: Medium
- Effort: 3-4 days
- Impact: 2931 translations review needed

## Frontend - Analytics & Monitoring

### @sentry/react
- Version: 10.34.0
- Latest: 10.38.0 (4 patches)
- Status: Patches available
- Priority: HIGH
- Action: Update this week (security)

### dompurify
- Version: 3.3.1
- Latest: 3.3.1
- Status: Up-to-date
- Priority: Low
- Security: Important for XSS prevention

## Frontend - Utilities

### uuid
- Version: 11.1.0
- Latest: 13.0.0 (majeure)
- Status: Outdated major
- Priority: Low
- Upgrade: Safe (simple UUID generation)

### react-hot-toast
- Version: 2.6.0
- Latest: 2.6.0
- Status: Up-to-date
- Priority: Low

### react-confetti
- Version: 6.4.0
- Latest: 6.4.0
- Status: Up-to-date
- Priority: Low

### @tanstack/react-query
- Version: 5.90.20
- Latest: 5.90.21
- Status: Patch available
- Priority: Low
- Upgrade: Safe

### react-toastify
- Version: 11.0.5
- Latest: 11.0.5
- Status: Up-to-date
- Priority: Low

## Backend - Firebase Ecosystem

### firebase-admin
- Version: 12.7.0
- Latest: 13.6.1 (1 majeure)
- Status: Outdated major
- Priority: Critical
- Risk: MEDIUM
- Effort: 2-3 days
- Plan: Q2 2026

### firebase-functions
- Version: 7.0.5
- Latest: 8.10.0 (1 majeure)
- Status: Outdated major
- Priority: Critical
- Risk: MEDIUM-HIGH
- Effort: 2-3 days
- Plan: Q2 2026

## Backend - Payments & Integrations

### stripe
- Version: 14.25.0
- Latest: 20.3.1 (5 majeures)
- Status: FROZEN
- Priority: Critical
- Risk: VERY HIGH
- Plan: Q2 2026 (full audit)

### twilio
- Version: 4.23.0
- Latest: 5.12.1 (1 majeure)
- Status: FROZEN
- Priority: Critical
- Risk: VERY HIGH
- Plan: Q3 2026
- Files: TwilioCallManager.ts, twilioWebhooks.ts

### nodemailer
- Version: 6.10.1
- Latest: 8.0.1 (1 majeure)
- Status: Outdated major
- Priority: Medium
- Impact: Email marketing system

## Backend - Cloud Services

### googleapis
- Version: 144.0.0
- Latest: 171.4.0 (1 majeure)
- Status: Outdated major
- Priority: Low
- Notes: Non-critical Google services

## Backend - Utilities

### axios
- Version: 1.13.2
- Latest: 1.13.5 (patch)
- Status: Patch available
- Priority: Low

### puppeteer-core
- Version: 23.6.0
- Latest: 24.37.3 (1 majeure)
- Status: Outdated major
- Priority: Low

---

Generated: 2026-02-14 | Revision: 1.0
