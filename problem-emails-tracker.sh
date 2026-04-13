#!/bin/bash
# Problem Emails Tracker — analyzes PMTA logs for issues, sends summary to Telegram
# Runs every 4 hours via cron

set -euo pipefail

TG_BOT='8349162167:AAGlhfoIZx7cUk40ebLypjEbpK6SG_f-rAM'
TG_CHAT='7560535072'
LOG='/var/log/problem-emails-tracker.log'

TODAY=$(date -u +%Y-%m-%d)
YESTERDAY=$(date -u -d 'yesterday' +%Y-%m-%d)
ACCT_TODAY="/var/log/pmta/acct-${TODAY}-0000.csv"
ACCT_YESTERDAY="/var/log/pmta/acct-${YESTERDAY}-0000.csv"
BOUNCES_CSV='/var/lib/mail-security/bounces/bounces.csv'

TS=$(date -u '+%Y-%m-%d %H:%M:%S')
echo "[$TS] Running tracker" >> "$LOG"

# Collect stats over last 48h
DELIVERED_TODAY=0
BOUNCED_TODAY=0
DELIVERED_Y=0
BOUNCED_Y=0

if [ -f "$ACCT_TODAY" ]; then
  DELIVERED_TODAY=$(grep -c '^d,' "$ACCT_TODAY" 2>/dev/null || echo 0)
  BOUNCED_TODAY=$(grep -c '^b,' "$ACCT_TODAY" 2>/dev/null || echo 0)
fi

if [ -f "$ACCT_YESTERDAY" ]; then
  DELIVERED_Y=$(grep -c '^d,' "$ACCT_YESTERDAY" 2>/dev/null || echo 0)
  BOUNCED_Y=$(grep -c '^b,' "$ACCT_YESTERDAY" 2>/dev/null || echo 0)
fi

TOTAL_48H=$((DELIVERED_TODAY + BOUNCED_TODAY + DELIVERED_Y + BOUNCED_Y))
BOUNCES_48H=$((BOUNCED_TODAY + BOUNCED_Y))

if [ "$TOTAL_48H" = "0" ]; then
  echo "[$TS] No activity in 48h, skip report" >> "$LOG"
  exit 0
fi

BR=$(echo "scale=2; $BOUNCES_48H * 100 / $TOTAL_48H" | bc)

# Top bouncing recipients (from PMTA logs today)
TOP_BOUNCES=""
if [ -f "$ACCT_TODAY" ] && [ "$BOUNCED_TODAY" -gt 0 ]; then
  TOP_BOUNCES=$(awk -F',' 'NR>1 && $1=="b" {print $5}' "$ACCT_TODAY" 2>/dev/null | sort | uniq -c | sort -rn | head -5 | awk '{print "  " $2 " (" $1 "x)"}')
fi

# Bounces by sender domain
SENDER_STATS=""
if [ -f "$ACCT_TODAY" ] && [ "$BOUNCED_TODAY" -gt 0 ]; then
  SENDER_STATS=$(awk -F',' 'NR>1 && $1=="b" {print $4}' "$ACCT_TODAY" 2>/dev/null | awk -F'@' '{print $2}' | sort | uniq -c | sort -rn | head -5 | awk '{print "  " $2 ": " $1}')
fi

# Bounce processor stats
PROCESSED_BOUNCES=0
if [ -f "$BOUNCES_CSV" ]; then
  PROCESSED_BOUNCES=$(($(wc -l < "$BOUNCES_CSV") - 1))
  [ "$PROCESSED_BOUNCES" -lt 0 ] && PROCESSED_BOUNCES=0
fi

# Spamhaus state
SH=$(cat /var/lib/mail-security/spamhaus-state 2>/dev/null || echo "unknown")

# Build message
MSG="Problem Emails Tracker ($TS UTC)

Last 48h volume:
- Delivered: $((DELIVERED_TODAY + DELIVERED_Y))
- Bounced: $BOUNCES_48H
- Bounce rate: ${BR}%

Spamhaus: $SH
Processed bounces (total): $PROCESSED_BOUNCES"

if [ -n "$TOP_BOUNCES" ]; then
  MSG="$MSG

Top bouncing recipients (today):
$TOP_BOUNCES"
fi

if [ -n "$SENDER_STATS" ]; then
  MSG="$MSG

Bounces by sender domain (today):
$SENDER_STATS"
fi

# Only send if there's something to report (bounces > 0 OR new day)
if [ "$BOUNCES_48H" -gt 0 ] || [ "$(date -u +%H)" = "09" ]; then
  curl -s -X POST "https://api.telegram.org/bot${TG_BOT}/sendMessage" \
    -d "chat_id=${TG_CHAT}" \
    --data-urlencode "text=${MSG}" >/dev/null
  echo "[$TS] Report sent: $BOUNCES_48H bounces, ${BR}% rate" >> "$LOG"
fi
