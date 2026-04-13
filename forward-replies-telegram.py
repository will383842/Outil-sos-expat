#!/usr/bin/env python3
"""
Forwards replies@life-expat.com inbox to Telegram.
Sends notification for every NEW email arriving in /var/mail/replies/Maildir/new/
"""
import os
import email
import urllib.request
import urllib.parse
from pathlib import Path
from datetime import datetime, timezone

TG_BOT = '8349162167:AAGlhfoIZx7cUk40ebLypjEbpK6SG_f-rAM'
TG_CHAT = '7560535072'

MAILDIR = Path('/var/mail/replies/Maildir/new')
STATE_FILE = Path('/var/lib/mail-security/replies-seen.txt')
LOG_FILE = '/var/log/mail-forwarder-replies.log'

STATE_FILE.parent.mkdir(parents=True, exist_ok=True)


def log(msg):
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    with open(LOG_FILE, 'a') as f:
        f.write('[' + ts + '] ' + msg + '\n')


def tg_send(text):
    url = 'https://api.telegram.org/bot' + TG_BOT + '/sendMessage'
    data = urllib.parse.urlencode({
        'chat_id': TG_CHAT,
        'text': text,
    }).encode()
    try:
        urllib.request.urlopen(url, data, timeout=10)
        return True
    except Exception as e:
        log('TG error: ' + str(e))
        return False


def load_seen():
    if not STATE_FILE.exists():
        return set()
    with open(STATE_FILE) as f:
        return {line.strip() for line in f if line.strip()}


def save_seen(seen):
    with open(STATE_FILE, 'w') as f:
        for s in sorted(seen):
            f.write(s + '\n')


def get_header(msg, name, default='(empty)'):
    value = msg.get(name, default)
    if value and len(value) > 200:
        value = value[:200] + '...'
    return value or default


def get_body_preview(msg, max_len=500):
    """Extract first plaintext body snippet."""
    for part in msg.walk():
        if part.get_content_type() == 'text/plain':
            try:
                payload = part.get_payload(decode=True)
                if payload:
                    text = payload.decode('utf-8', errors='ignore').strip()
                    # Remove quoted lines (prospect replies often quote original)
                    clean_lines = [l for l in text.split('\n') if not l.strip().startswith('>')]
                    clean = '\n'.join(clean_lines).strip()
                    if clean:
                        return clean[:max_len] + ('...' if len(clean) > max_len else '')
            except Exception:
                pass
    return '(no text body)'


def is_auto_bounce(msg):
    """Skip automated bounce notifications (handled by bounce-processor)."""
    sender = (msg.get('From') or '').lower()
    subject = (msg.get('Subject') or '').lower()
    if 'mailer-daemon' in sender or 'postmaster@' in sender:
        return True
    for kw in ['delivery status', 'undeliverable', 'returned mail', 'failure notice']:
        if kw in subject:
            return True
    return False


def is_dmarc_report(msg):
    """Skip DMARC aggregate reports (handled separately)."""
    subject = (msg.get('Subject') or '').lower()
    sender = (msg.get('From') or '').lower()
    return 'report domain' in subject or 'dmarc' in sender


def main():
    if not MAILDIR.exists():
        log('No maildir: ' + str(MAILDIR))
        return

    seen = load_seen()
    new_count = 0

    # Sort by mtime so oldest first
    msg_files = sorted(MAILDIR.iterdir(), key=lambda p: p.stat().st_mtime if p.is_file() else 0)

    for msg_file in msg_files:
        if not msg_file.is_file():
            continue

        msg_id = msg_file.name
        if msg_id in seen:
            continue

        seen.add(msg_id)

        try:
            with open(msg_file, 'rb') as f:
                msg = email.message_from_bytes(f.read())
        except Exception as e:
            log('Parse error ' + msg_id + ': ' + str(e))
            continue

        # Skip bounces and DMARC reports
        if is_auto_bounce(msg) or is_dmarc_report(msg):
            continue

        sender = get_header(msg, 'From')
        subject = get_header(msg, 'Subject')
        to = get_header(msg, 'To')
        delivered_to = get_header(msg, 'Delivered-To', '(catchall)')
        date = get_header(msg, 'Date', '(no date)')
        preview = get_body_preview(msg, 400)

        # Build telegram message
        text = '📬 NEW REPLY on replies@life-expat.com\n'
        text += '━━━━━━━━━━━━━━━━━━━━━━\n'
        text += 'From: ' + sender + '\n'
        text += 'To: ' + to + '\n'
        text += 'Delivered-To: ' + delivered_to + '\n'
        text += 'Date: ' + date + '\n'
        text += 'Subject: ' + subject + '\n'
        text += '━━━━━━━━━━━━━━━━━━━━━━\n'
        text += 'Preview:\n'
        text += preview

        if tg_send(text):
            new_count += 1
            log('Forwarded: ' + sender + ' | ' + subject[:80])

    save_seen(seen)

    if new_count > 0:
        log('Total forwarded: ' + str(new_count))


if __name__ == '__main__':
    main()
