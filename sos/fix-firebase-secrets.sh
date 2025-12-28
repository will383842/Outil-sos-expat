#!/bin/bash
# Script to fix Firebase Secrets for MailWizz

set -e

PROJECT_ID="sos-urgently-ac307"
MAILWIZZ_API_KEY_VALUE="63f17459fa45961cbb742a61ddebc157169bd3c1"

echo "🔧 Fixing Firebase Secrets for project: $PROJECT_ID"
echo ""

# Set the project
gcloud config set project "$PROJECT_ID" 2>/dev/null || echo "Project already set"

# Fix MAILWIZZ_API_KEY
echo "📝 Creating/updating MAILWIZZ_API_KEY..."
if gcloud secrets describe MAILWIZZ_API_KEY --project="$PROJECT_ID" &>/dev/null; then
    echo "   Secret exists, adding new version..."
    echo -n "$MAILWIZZ_API_KEY_VALUE" | \
        gcloud secrets versions add MAILWIZZ_API_KEY --data-file=- --project="$PROJECT_ID"
else
    echo "   Secret doesn't exist, creating it..."
    echo -n "$MAILWIZZ_API_KEY_VALUE" | \
        gcloud secrets create MAILWIZZ_API_KEY --data-file=- \
        --replication-policy="automatic" --project="$PROJECT_ID"
fi

# Create MAILWIZZ_WEBHOOK_SECRET
echo "📝 Creating MAILWIZZ_WEBHOOK_SECRET..."
if gcloud secrets describe MAILWIZZ_WEBHOOK_SECRET --project="$PROJECT_ID" &>/dev/null; then
    echo "   Secret already exists. Skipping..."
else
    WEBHOOK_SECRET=$(openssl rand -hex 32)
    echo "   Generated new webhook secret"
    echo -n "$WEBHOOK_SECRET" | \
        gcloud secrets create MAILWIZZ_WEBHOOK_SECRET --data-file=- \
        --replication-policy="automatic" --project="$PROJECT_ID"
    echo "   ✅ Created MAILWIZZ_WEBHOOK_SECRET"
fi

echo ""
echo "✅ Secrets fixed! You can now deploy with: firebase deploy --only functions"
