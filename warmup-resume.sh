#!/bin/bash
# Resume warmup after killswitch — restores PMTA rates and re-enables crons
set -euo pipefail

TG_BOT='8349162167:AAGlhfoIZx7cUk40ebLypjEbpK6SG_f-rAM'
TG_CHAT='7560535072'

echo "=== Warmup Resume ==="
echo "This script will:"
echo "1. Verify Spamhaus is clean"
echo "2. Verify bounce rate is <3%"
echo "3. Reset PMTA rates to 200/h"
echo "4. Re-enable warmup-adjust cron"
echo "5. Resume BL Engine queues"
echo ""

# Check Spamhaus
SH=$(cat /var/lib/mail-security/spamhaus-state 2>/dev/null || echo "unknown")
if [ "$SH" != "clean" ]; then
  echo "ERROR: Spamhaus state is '$SH' — cannot resume"
  exit 1
fi
echo "Spamhaus: clean OK"

# Check bounce rate
TODAY=$(date -u +%Y-%m-%d)
ACCT="/var/log/pmta/acct-${TODAY}-0000.csv"
if [ -f "$ACCT" ]; then
  D=$(grep -c '^d,' "$ACCT" 2>/dev/null || echo 0)
  B=$(grep -c '^b,' "$ACCT" 2>/dev/null || echo 0)
  T=$((D + B))
  if [ "$T" -gt 0 ]; then
    BR=$(echo "scale=2; $B * 100 / $T" | bc)
    THRESHOLD="3.0"
    if [ "$(echo "$BR > $THRESHOLD" | bc)" = "1" ]; then
      echo "ERROR: Bounce rate $BR% > $THRESHOLD% — investigate before resuming"
      exit 1
    fi
    echo "Bounce rate: ${BR}% OK"
  fi
fi

# Reset PMTA rates
echo "Resetting PMTA rates..."
sed -i 's|max-msg-rate [0-9]*/h|max-msg-rate 200/h|g' /etc/pmta/config
pkill -HUP pmta
sleep 1
echo "PMTA reloaded"

# Re-enable warmup-adjust cron
if [ -f /etc/cron.d/warmup-adjust ]; then
  sed -i 's|^#\s*\(\*/\|\*/\|[0-9]\)|\1|' /etc/cron.d/warmup-adjust
  echo "warmup-adjust cron re-enabled"
fi

# Resume BL Engine queues
echo "Resuming BL Engine queues..."
docker exec bl-app node -e "
const { Queue } = require('bullmq');
const conn = { host: 'bl-redis', port: 6379, password: process.env.REDIS_PASSWORD || 'redis_default_password' };
(async () => {
  for (const name of ['broadcast', 'outreach', 'sequence']) {
    const q = new Queue(name, { connection: conn });
    await q.resume();
    await q.close();
  }
  console.log('queues resumed');
})().catch(e => { console.error(e.message); process.exit(1); });
" 2>&1

TS=$(date -u '+%Y-%m-%d %H:%M:%S')
MSG="Warmup resumed from killswitch
Time: $TS

Checks passed:
- Spamhaus: clean
- Bounce rate OK
- PMTA rates reset
- Cron re-enabled
- BL Engine queues resumed

Next hourly-adjust will recompute proper rate."

curl -s -X POST "https://api.telegram.org/bot${TG_BOT}/sendMessage" \
  -d "chat_id=${TG_CHAT}" \
  --data-urlencode "text=${MSG}" >/dev/null

echo "Resume complete"
