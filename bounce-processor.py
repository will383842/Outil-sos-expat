#!/usr/bin/env python3
"""
Bounce Processor — reads presse-*/Maildir/new/ for bounce notifications
Extracts failed recipient addresses and logs them
Runs every 10 minutes via cron
"""
import os
import re
import email
import shutil
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

MAILDIR_ROOT = Path('/var/mail')
STATE_DIR = Path('/var/lib/mail-security/bounces')
LOG_FILE = '/var/log/bounce-processor.log'
TG_BOT = '8349162167:AAGlhfoIZx7cUk40ebLypjEbpK6SG_f-rAM'
TG_CHAT = '7560535072'

STATE_DIR.mkdir(parents=True, exist_ok=True)
BOUNCES_CSV = STATE_DIR / 'bounces.csv'


def log(msg):
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    line = '[' + ts + '] ' + msg
    print(line)
    with open(LOG_FILE, 'a') as f:
        f.write(line + '\n')


def tg(text):
    url = 'https://api.telegram.org/bot' + TG_BOT + '/sendMessage'
    data = urllib.parse.urlencode({'chat_id': TG_CHAT, 'text': text}).encode()
    try:
        urllib.request.urlopen(url, data, timeout=10)
    except Exception:
        pass


# Patterns that identify bounce notifications
BOUNCE_SUBJECTS = [
    r'delivery status notification',
    r'failure notice',
    r'undeliverable',
    r'mail delivery failed',
    r'returned mail',
    r'could not be delivered',
    r'delivery failure',
    r'mail delivery system',
]

BOUNCE_FROM = [
    r'mailer-daemon',
    r'postmaster@',
    r'mail delivery',
]

# Extract failed recipients + status codes
RCPT_PATTERNS = [
    r'Original-Recipient:\s*(?:rfc822;)?\s*([\w.+-]+@[\w.-]+)',
    r'Final-Recipient:\s*(?:rfc822;)?\s*([\w.+-]+@[\w.-]+)',
    r'<([\w.+-]+@[\w.-]+)>:.*(?:550|551|552|553|554)',
    r'failed.*?([\w.+-]+@[\w.-]+)',
]

STATUS_PATTERNS = [
    r'Status:\s*(\d\.\d\.\d)',
    r'Diagnostic-Code:.*?(\d\.\d\.\d)',
    r'(\d{3})\s+(?:\d\.\d\.\d\s+)?[^\n]+',
]


def is_bounce(msg):
    subj = (msg.get('Subject') or '').lower()
    sender = (msg.get('From') or '').lower()
    for p in BOUNCE_SUBJECTS:
        if re.search(p, subj):
            return True
    for p in BOUNCE_FROM:
        if re.search(p, sender):
            return True
    return False


def extract_bounce_info(msg):
    body_parts = []
    for part in msg.walk():
        if part.get_content_type() in ('text/plain', 'message/delivery-status', 'message/rfc822'):
            try:
                payload = part.get_payload(decode=True)
                if payload:
                    body_parts.append(payload.decode('utf-8', errors='ignore'))
            except Exception:
                pass

    body = '\n'.join(body_parts)

    # Extract failed recipient
    failed_rcpt = None
    for pattern in RCPT_PATTERNS:
        m = re.search(pattern, body, re.IGNORECASE)
        if m:
            failed_rcpt = m.group(1).lower().strip()
            break

    # Extract status / reason
    status = 'unknown'
    for pattern in STATUS_PATTERNS:
        m = re.search(pattern, body)
        if m:
            status = m.group(1)
            break

    # Classify hard vs soft bounce
    bounce_type = 'unknown'
    if status.startswith('5.'):
        bounce_type = 'hard'
    elif status.startswith('4.'):
        bounce_type = 'soft'
    elif re.search(r'\b55[0-9]\b', body):
        bounce_type = 'hard'
    elif re.search(r'\b45[0-9]\b', body):
        bounce_type = 'soft'

    return {
        'failed_rcpt': failed_rcpt,
        'status': status,
        'type': bounce_type,
    }


def save_bounce(inbox, info, msg_id):
    write_header = not BOUNCES_CSV.exists()
    with open(BOUNCES_CSV, 'a') as f:
        if write_header:
            f.write('timestamp,inbox,failed_rcpt,status,type,msg_id\n')
        ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
        f.write('"{}","{}","{}","{}","{}","{}"\n'.format(
            ts, inbox,
            info.get('failed_rcpt') or '',
            info.get('status') or '',
            info.get('type') or '',
            msg_id
        ))


def process_inbox(inbox_path):
    new_dir = inbox_path / 'Maildir' / 'new'
    processed_dir = inbox_path / 'Maildir' / '.processed-bounces'
    processed_dir.mkdir(parents=True, exist_ok=True)

    inbox_name = inbox_path.name
    new_bounces = 0

    if not new_dir.exists():
        return 0, 0

    for msg_file in new_dir.iterdir():
        if not msg_file.is_file():
            continue

        try:
            with open(msg_file, 'rb') as f:
                msg = email.message_from_bytes(f.read())
        except Exception as e:
            log('Error reading ' + str(msg_file) + ': ' + str(e))
            continue

        if not is_bounce(msg):
            continue

        info = extract_bounce_info(msg)
        if not info.get('failed_rcpt'):
            # Cannot extract, move to unknown for manual review
            continue

        save_bounce(inbox_name, info, msg_file.name)
        new_bounces += 1

        # Move to processed folder to avoid reprocessing
        try:
            shutil.move(str(msg_file), str(processed_dir / msg_file.name))
        except Exception:
            pass

    return new_bounces, 0


def main():
    if not MAILDIR_ROOT.exists():
        log('No /var/mail directory')
        return

    total_bounces = 0
    inbox_stats = {}

    for inbox in MAILDIR_ROOT.iterdir():
        if not inbox.is_dir():
            continue
        if not inbox.name.startswith('presse-'):
            continue

        count, _ = process_inbox(inbox)
        inbox_stats[inbox.name] = count
        total_bounces += count

    if total_bounces > 0:
        log('Processed ' + str(total_bounces) + ' new bounces: ' + str(inbox_stats))

        # Alert on significant bounces (>= 5 in one run)
        if total_bounces >= 5:
            tg('Bounce processor: ' + str(total_bounces) + ' new bounces detected\n' +
               '\n'.join(k + ': ' + str(v) for k, v in inbox_stats.items() if v > 0))
    else:
        log('No new bounces')


if __name__ == '__main__':
    main()
