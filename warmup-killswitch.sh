#!/bin/bash
# Emergency killswitch — stops all sending, alerts Telegram
set -euo pipefail

TG_BOT='8349162167:AAGlhfoIZx7cUk40ebLypjEbpK6SG_f-rAM'
TG_CHAT='7560535072'

REASON="${1:-manual}"

# Freeze PMTA queue (no new deliveries)
pmta pause delivery --all 2>/dev/null || true

# Set all vmta rates to 1/h
sed -i 's|max-msg-rate [0-9]*/h|max-msg-rate 1/h|g' /etc/pmta/config
pkill -HUP pmta

# Disable the hourly adjuster cron
if [ -f /etc/cron.d/warmup-adjust ]; then
  sed -i 's|^[^#]|#&|' /etc/cron.d/warmup-adjust
fi

MSG="WARMUP KILLSWITCH ACTIVATED
Reason: ${REASON}
Time: $(date -u '+%Y-%m-%d %H:%M:%S')

Actions:
- PMTA rate set to 1/h all vmtas
- Hourly adjuster cron disabled
- Postfix still accepts (queue grows)

To resume:
1. Investigate ${REASON}
2. Run: /opt/mail-security/warmup/resume.sh"

curl -s -X POST "https://api.telegram.org/bot${TG_BOT}/sendMessage" \
  -d "chat_id=${TG_CHAT}" \
  --data-urlencode "text=${MSG}" >/dev/null

echo "[$(date -u)] KILLSWITCH activated: ${REASON}"
