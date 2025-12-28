# Phase 2: Autoresponders Configuration

## Overview

Phase 2 focuses on configuring and verifying the 99 autoresponders in MailWizz (11 types × 9 languages). Autoresponders are configured in the MailWizz UI, not in code, but this phase provides tools and documentation to ensure proper setup.

---

## Completion Checklist

### Documentation
- [x] **AUTORESPONDER_CONFIG_GUIDE.md** - Complete configuration guide for all 99 autoresponders
- [x] **README_PHASE2.md** - This file (completion checklist and procedures)

### Code & Utilities
- [x] **utils/autoresponderConfig.ts** - TypeScript definitions and helpers for all autoresponder types
- [x] **scripts/verify-autoresponders.ts** - Script to validate MailWizz configuration
- [x] **scripts/test-autoresponder-triggers.ts** - Script to test autoresponder triggers and stop conditions

### MailWizz Configuration (Manual)
- [ ] **All 99 autoresponders created** in MailWizz UI
- [ ] **Segments configured** correctly for each autoresponder
- [ ] **Templates assigned** to email sequences
- [ ] **Stop conditions configured** in MailWizz
- [ ] **Rate limiting set** (5 emails/day, 4 hours between)
- [ ] **Quiet hours enabled** (22:00 - 08:00)
- [ ] **All autoresponders activated**

### Verification
- [ ] **Run verification script** to check all autoresponders
- [ ] **Run testing script** to verify triggers work
- [ ] **Test stop conditions** for each type
- [ ] **Test language-specific** autoresponders
- [ ] **Verify email delivery** in all 9 languages

---

## Autoresponder Types

### Summary (11 Types × 9 Languages = 99 Total)

1. **Nurture Profile** (9) - Help providers complete profile
2. **Nurture No Calls** (9) - Encourage first call
3. **Nurture Login Clients** (9) - Encourage first login (clients)
4. **Nurture Login Providers** (9) - Encourage first login (providers)
5. **Nurture KYC** (9) - Help complete KYC verification
6. **Nurture Offline** (9) - Remind providers to go online
7. **Nurture PayPal** (9) - Help configure PayPal
8. **Nurture Action** (9) - Encourage first action (clients)
9. **Reactivation Clients** (9) - Re-engage inactive clients
10. **Reactivation Providers** (9) - Re-engage inactive providers
11. **Request Review** (9) - Request reviews from clients

### Languages Supported

- FR (French)
- EN (English)
- DE (German)
- ES (Spanish)
- PT (Portuguese)
- RU (Russian)
- ZH (Chinese)
- AR (Arabic) - RTL support enabled
- HI (Hindi)

---

## Configuration Steps

### Step 1: Review Configuration Guide

Read `AUTORESPONDER_CONFIG_GUIDE.md` for detailed instructions on:
- Segment combinations
- Template sequences
- Stop conditions
- Rate limiting settings

### Step 2: Configure in MailWizz UI

For each of the 99 autoresponders:

1. Navigate to **Lists** → **SOS-Expat** → **Autoresponders**
2. Click **Create new autoresponder**
3. Configure:
   - Name (e.g., "Nurture Profile EN")
   - Include segments (base + language)
   - Exclude segments (stop conditions)
   - Trigger type
   - Email sequence (templates + delays)
   - Stop conditions
   - Rate limiting
   - Quiet hours
4. Save and activate

### Step 3: Verify Configuration

Run the verification script:

```bash
cd firebase/functions
npx ts-node src/emailMarketing/scripts/verify-autoresponders.ts
```

This will check:
- All autoresponders exist
- Segments are correct
- Templates are assigned
- Stop conditions are configured

### Step 4: Test Triggers

Run the testing script:

```bash
npx ts-node src/emailMarketing/scripts/test-autoresponder-triggers.ts
```

Options:
- `--type <type>` - Test specific type
- `--lang <lang>` - Test specific language
- `--user <userId>` - Test with specific user
- `--stop-conditions` - Test stop conditions only

---

## Testing Procedures

### 1. Unit Tests

Test the configuration utilities:

```typescript
import { getAllAutoresponderConfigs, verifyAutoresponderCount } from './utils/autoresponderConfig';

// Verify count
const countCheck = verifyAutoresponderCount();
console.log(countCheck); // Should show 99 autoresponders

// Get all configs
const configs = getAllAutoresponderConfigs();
console.log(configs.length); // Should be 99
```

### 2. Integration Tests

Test autoresponder triggers with real user data:

```bash
# Test all autoresponders
npx ts-node scripts/test-autoresponder-triggers.ts

# Test specific type
npx ts-node scripts/test-autoresponder-triggers.ts --type nurture-profile

# Test specific language
npx ts-node scripts/test-autoresponder-triggers.ts --lang en

# Test with specific user
npx ts-node scripts/test-autoresponder-triggers.ts --user <userId>
```

### 3. Stop Condition Tests

Test that stop conditions work correctly:

```bash
npx ts-node scripts/test-autoresponder-triggers.ts --stop-conditions
```

This will:
- Show current user field values
- Analyze which autoresponders should be stopped
- Verify stop condition logic

### 4. Manual Verification

1. **Create test users** in different segments
2. **Trigger autoresponders** by meeting conditions
3. **Verify emails are sent** in correct language
4. **Test stop conditions** by updating user fields
5. **Verify emails stop** when conditions are met

---

## Troubleshooting Guide

### Autoresponder Not Triggering

**Symptoms:**
- User meets conditions but no email is sent
- Autoresponder exists but is inactive

**Solutions:**
1. Check subscriber is in correct segments
2. Verify trigger conditions are met
3. Check if subscriber is excluded by stop conditions
4. Verify autoresponder is Active in MailWizz
5. Check rate limiting hasn't been exceeded
6. Review MailWizz logs for errors

### Emails Not Sending

**Symptoms:**
- Autoresponder triggers but emails don't send
- Templates not found errors

**Solutions:**
1. Verify templates exist and are published in MailWizz
2. Check delivery server is active
3. Verify subscriber email is valid
4. Check bounce/complaint status
5. Review MailWizz delivery logs
6. Verify template names match exactly (case-sensitive)

### Stop Conditions Not Working

**Symptoms:**
- User meets stop condition but emails continue
- Autoresponder doesn't stop

**Solutions:**
1. Verify Cloud Functions are updating custom fields
2. Check custom field values in MailWizz subscriber data
3. Verify exclude segments are configured correctly
4. Check MailWizz logs for errors
5. Verify stop condition syntax in MailWizz
6. Test stop condition manually by updating field

### Language Mismatch

**Symptoms:**
- User receives emails in wrong language
- Language-specific autoresponders not triggering

**Solutions:**
1. Verify user's LANGUAGE field is set correctly
2. Check language segment exists (e.g., `language_en`)
3. Verify autoresponder includes correct language segment
4. Check user's language preference in Firebase
5. Verify language code format (lowercase: `en`, not `EN`)

### Segment Issues

**Symptoms:**
- User not in expected segment
- Autoresponder not triggering due to segment

**Solutions:**
1. Verify segments exist in MailWizz
2. Check segment conditions are correct
3. Verify user meets segment criteria
4. Check segment is assigned to autoresponder
5. Review segment membership in MailWizz

---

## Verification Script Usage

### Basic Usage

```bash
npx ts-node scripts/verify-autoresponders.ts
```

### Output

The script will:
1. Verify autoresponder count (should be 99)
2. Check each autoresponder exists in MailWizz
3. Validate segment assignments
4. Verify template sequences
5. Check stop conditions
6. Generate a detailed report

### Expected Output

```
🔍 Starting autoresponder verification...

✅ Autoresponder count correct: 99

📋 Verifying 99 autoresponders...
⏳ Verifying 1/99: Nurture Profile EN...
...

📊 AUTORESPONDER VERIFICATION REPORT
================================================================================
Total Autoresponders: 99
✅ Valid: 99
❌ Invalid: 0
⚠️  Missing: 0

✅ All autoresponders are properly configured!
```

---

## Testing Script Usage

### Basic Usage

```bash
npx ts-node scripts/test-autoresponder-triggers.ts
```

### Options

```bash
# Test specific type
npx ts-node scripts/test-autoresponder-triggers.ts --type nurture-profile

# Test specific language
npx ts-node scripts/test-autoresponder-triggers.ts --lang en

# Test with specific user
npx ts-node scripts/test-autoresponder-triggers.ts --user <userId>

# Test stop conditions only
npx ts-node scripts/test-autoresponder-triggers.ts --stop-conditions
```

### Expected Output

```
🧪 Starting autoresponder trigger tests...

👤 Using test user: abc123

📋 User fields: 61 fields

📋 Testing 99 autoresponders...
⏳ Testing 1/99: Nurture Profile EN...

📊 AUTORESPONDER TRIGGER TEST REPORT
================================================================================
Total Tests: 99
✅ Passed: 95
❌ Failed: 4

📋 Results by Type:
✅ nurture-profile: 9/9 passed
✅ nurture-no-calls: 9/9 passed
...
```

---

## Integration with Phase 1

Phase 2 autoresponders integrate with Phase 1 Cloud Functions:

### Stop Condition Triggers

| Cloud Function | Updates Field | Stops Autoresponder |
|----------------|---------------|---------------------|
| `handleProfileCompleted` | `PROFILE_STATUS` | Nurture Profile |
| `handleUserLogin` | `LAST_LOGIN`, `ACTIVITY_STATUS` | Nurture Login |
| `handleCallCompleted` | `TOTAL_CALLS` | Nurture No Calls, Nurture Action |
| `handleProviderOnlineStatus` | `IS_ONLINE` | Nurture Offline |
| `handleKYCVerification` | `KYC_STATUS` | Nurture KYC |
| `handlePayPalConfiguration` | `PAYPAL_STATUS` | Nurture PayPal |
| `stopAutoresponders` | Multiple fields | All (scheduled check) |

### Field Updates

All Cloud Functions update MailWizz custom fields, which automatically:
1. Update subscriber data
2. Trigger segment recalculation
3. Remove subscribers from autoresponders (if stop conditions met)
4. Log events for analytics

---

## Success Criteria

Phase 2 is complete when:

- [x] All documentation created
- [x] All utilities and scripts implemented
- [ ] All 99 autoresponders configured in MailWizz
- [ ] Verification script passes (all autoresponders valid)
- [ ] Testing script passes (all triggers work)
- [ ] Stop conditions tested and working
- [ ] Language support verified (all 9 languages)
- [ ] Email delivery tested in production
- [ ] Rate limiting configured and working
- [ ] Quiet hours configured and working

---

## Next Steps

After Phase 2 completion:

1. **Phase 3: Configuration & Testing**
   - Complete MailWizz configuration
   - GA4 setup and dashboards
   - Comprehensive testing

2. **Phase 4: Deployment**
   - Final preparation
   - Production deployment
   - Monitoring and optimization

---

## Support & Resources

- **Configuration Guide**: `AUTORESPONDER_CONFIG_GUIDE.md`
- **Utilities**: `utils/autoresponderConfig.ts`
- **Verification Script**: `scripts/verify-autoresponders.ts`
- **Testing Script**: `scripts/test-autoresponder-triggers.ts`
- **Phase 1 Status**: `PHASE1_STATUS.md`

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: In Progress

