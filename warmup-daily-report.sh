#!/bin/bash
# Daily warmup report — runs at 23:55 UTC, reports yesterday's volume + today's plan
set -euo pipefail

TG_BOT='8349162167:AAGlhfoIZx7cUk40ebLypjEbpK6SG_f-rAM'
TG_CHAT='7560535072'

YESTERDAY=$(date -u -d 'yesterday' +%Y-%m-%d)
TODAY=$(date -u +%Y-%m-%d)
TOMORROW=$(date -u -d 'tomorrow' +%Y-%m-%d)

# Actual sent yesterday (PMTA acct logs)
ACCT_FILE="/var/log/pmta/acct-${YESTERDAY}-0000.csv"
if [ -f "$ACCT_FILE" ]; then
  SENT=$(grep -c '^d,' "$ACCT_FILE" || echo 0)
  BOUNCED=$(grep -c '^b,' "$ACCT_FILE" || echo 0)
else
  SENT=0
  BOUNCED=0
fi

# Quotas from schedule
YESTERDAY_QUOTA=$(python3 -c "import json; d=json.load(open('/opt/mail-security/warmup/schedule.json')); print(d['schedule'].get('${YESTERDAY}', 0))")
TODAY_QUOTA=$(python3 -c "import json; d=json.load(open('/opt/mail-security/warmup/schedule.json')); print(d['schedule'].get('${TODAY}', 0))")
TOMORROW_QUOTA=$(python3 -c "import json; d=json.load(open('/opt/mail-security/warmup/schedule.json')); print(d['schedule'].get('${TOMORROW}', 0))")

# Bounce rate
if [ "$SENT" -gt 0 ]; then
  BR=$(echo "scale=2; $BOUNCED * 100 / ($SENT + $BOUNCED)" | bc)
else
  BR=0
fi

# Spamhaus
SH_STATE=$(cat /var/lib/mail-security/spamhaus-state 2>/dev/null || echo "unknown")

MSG="Warmup Daily Report — ${YESTERDAY}

Sent: ${SENT}
Bounced: ${BOUNCED}
Bounce rate: ${BR}%
Quota was: ${YESTERDAY_QUOTA}

Spamhaus: ${SH_STATE}

Today (${TODAY}): ${TODAY_QUOTA} emails
Tomorrow (${TOMORROW}): ${TOMORROW_QUOTA} emails"

curl -s -X POST "https://api.telegram.org/bot${TG_BOT}/sendMessage" \
  -d "chat_id=${TG_CHAT}" \
  --data-urlencode "text=${MSG}" >/dev/null

echo "[$(date -u)] Daily report sent: ${SENT}/${YESTERDAY_QUOTA} quota, ${BR}% bounce"
