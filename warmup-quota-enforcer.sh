#!/bin/bash
# Quota Enforcer — pauses BL Engine BullMQ queues when daily quota reached
# Runs every 5 min via cron

set -euo pipefail

SCHEDULE="/opt/mail-security/warmup/schedule.json"
STATE_DIR="/var/lib/mail-security/warmup"
LOG="/var/log/warmup-quota.log"
TG_BOT='8349162167:AAGlhfoIZx7cUk40ebLypjEbpK6SG_f-rAM'
TG_CHAT='7560535072'

mkdir -p "$STATE_DIR"

TODAY=$(date -u +%Y-%m-%d)
ACCT="/var/log/pmta/acct-${TODAY}-0000.csv"

# Count delivered today
if [ -f "$ACCT" ]; then
  DELIVERED=$(grep -c '^d,' "$ACCT" 2>/dev/null || echo 0)
else
  DELIVERED=0
fi

# Get daily quota from schedule (with post-schedule fallback)
QUOTA=$(python3 -c "
import json
d = json.load(open('$SCHEDULE'))
end_date = d.get('end_date', '2026-08-17')
if '$TODAY' < '2026-04-21':
    print(0)  # P0 mode
elif '$TODAY' > end_date:
    # Post-schedule: use steady state
    print(d.get('post_schedule_steady_state', {}).get('daily_quota', 1000))
else:
    print(d['schedule'].get('$TODAY', 0))
")

# During P0 (quota=0), don't pause anything (Mailflow + warmup continues freely)
if [ "$QUOTA" = "0" ]; then
  STATE_KEY="p0"
  ACTION="no-op (P0 phase)"
else
  if [ "$DELIVERED" -ge "$QUOTA" ]; then
    STATE_KEY="paused"
    ACTION="PAUSE BL Engine queues (${DELIVERED}/${QUOTA} reached)"
  else
    STATE_KEY="active"
    REMAINING=$((QUOTA - DELIVERED))
    ACTION="RESUME BL Engine queues (${DELIVERED}/${QUOTA}, ${REMAINING} remaining)"
  fi
fi

# Pause/Resume BL Engine queues via Node.js executed in container
if [ "$STATE_KEY" = "paused" ]; then
  docker exec bl-app node -e "
const { Queue } = require('bullmq');
const conn = { host: 'bl-redis', port: 6379, password: process.env.REDIS_PASSWORD || 'redis_default_password' };
(async () => {
  for (const name of ['broadcast', 'outreach', 'sequence']) {
    const q = new Queue(name, { connection: conn });
    await q.pause();
    await q.close();
  }
  console.log('paused');
})().catch(e => { console.error(e.message); process.exit(1); });
" 2>&1 | tail -3
elif [ "$STATE_KEY" = "active" ]; then
  docker exec bl-app node -e "
const { Queue } = require('bullmq');
const conn = { host: 'bl-redis', port: 6379, password: process.env.REDIS_PASSWORD || 'redis_default_password' };
(async () => {
  for (const name of ['broadcast', 'outreach', 'sequence']) {
    const q = new Queue(name, { connection: conn });
    await q.resume();
    await q.close();
  }
  console.log('resumed');
})().catch(e => { console.error(e.message); process.exit(1); });
" 2>&1 | tail -3
fi

# Log
TS=$(date -u '+%Y-%m-%d %H:%M:%S')
echo "[$TS] quota=$QUOTA delivered=$DELIVERED state=$STATE_KEY action=$ACTION" >> "$LOG"

# Save state + notify on transitions
PREV_STATE_FILE="$STATE_DIR/quota-state"
PREV=$(cat "$PREV_STATE_FILE" 2>/dev/null || echo "unknown")
echo "$STATE_KEY" > "$PREV_STATE_FILE"

if [ "$STATE_KEY" != "$PREV" ] && [ "$STATE_KEY" != "p0" ] && [ "$PREV" != "unknown" ]; then
  if [ "$STATE_KEY" = "paused" ]; then
    MSG="Quota enforcer — PAUSED%0A%0ADaily quota reached: ${DELIVERED}/${QUOTA}%0A%0ABL Engine queues paused until tomorrow midnight UTC.%0A%0ATime: $TS"
  elif [ "$STATE_KEY" = "active" ]; then
    MSG="Quota enforcer — RESUMED%0A%0ANew day, new quota: ${QUOTA} emails%0ADelivered so far: ${DELIVERED}%0A%0ABL Engine queues resumed.%0A%0ATime: $TS"
  fi
  curl -s -X POST "https://api.telegram.org/bot${TG_BOT}/sendMessage" \
    -d "chat_id=${TG_CHAT}" \
    --data-urlencode "text=${MSG}" >/dev/null
fi
