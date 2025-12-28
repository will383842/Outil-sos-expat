# Running Autoresponder Scripts

## Node.js Version Requirement

These scripts require **Node.js 14+** (the project specifies Node 20). The TypeScript compiler itself uses modern JavaScript features that older Node versions don't support.

## Current Node Version

Check your Node version:
```bash
node --version
```

If you see Node 12 or below, you need to upgrade.

## Solutions

### Option 1: Use Node Version Manager (nvm) - Recommended

If you have `nvm` installed:

```bash
# Install and use Node 20
nvm install 20
nvm use 20

# Verify version
node --version  # Should show v20.x.x

# Now you can run the scripts
cd firebase/functions
npm run build
npm run verify-autoresponders
```

### Option 2: Compile First, Then Run (If Node 20 is available)

If you have Node 20 available but not as default:

```bash
cd firebase/functions

# Compile TypeScript
npm run build

# Run compiled JavaScript
npm run verify-autoresponders
# OR
node lib/emailMarketing/scripts/verify-autoresponders.js
```

### Option 3: Use Docker or Cloud Environment

If you can't upgrade Node locally, you can:
1. Use a Docker container with Node 20
2. Run the scripts in a cloud environment (Cloud Shell, etc.)
3. Deploy to Firebase Functions and run them there

## Available Scripts

After compiling with `npm run build`, you can use:

```bash
# Verify all autoresponders in MailWizz
npm run verify-autoresponders

# Test autoresponder triggers
npm run test-autoresponders

# With options
node lib/emailMarketing/scripts/test-autoresponder-triggers.js --type nurture-profile
node lib/emailMarketing/scripts/test-autoresponder-triggers.js --lang en
node lib/emailMarketing/scripts/test-autoresponder-triggers.js --user <userId>
```

## Troubleshooting

### Error: "Unexpected token '?'"

This means your Node version is too old. You need Node 14+ (preferably Node 20).

**Solution**: Upgrade Node.js using nvm or download from nodejs.org

### Error: "Cannot find module"

Make sure you've compiled the TypeScript:
```bash
npm run build
```

### Error: "Module not found: '../utils/autoresponderConfig'"

Make sure you're running from the `firebase/functions` directory:
```bash
cd firebase/functions
npm run verify-autoresponders
```

## Quick Start (Node 20)

```bash
# 1. Navigate to functions directory
cd firebase/functions

# 2. Ensure Node 20 is active
node --version  # Should be v20.x.x

# 3. Install dependencies (if needed)
npm install

# 4. Compile TypeScript
npm run build

# 5. Run verification script
npm run verify-autoresponders
```

## Alternative: Manual Configuration

If you can't run the scripts, you can manually verify using the configuration guide:

1. Open `AUTORESPONDER_SEGMENT_CONFIG.md`
2. Follow the configuration steps for each autoresponder
3. Verify in MailWizz UI that all 99 autoresponders exist
4. Check segments, templates, and stop conditions manually

---

**Last Updated**: 2024

