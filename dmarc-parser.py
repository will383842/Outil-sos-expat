#!/usr/bin/env python3
"""
DMARC Aggregate Report Parser
- Connects to IMAP inbox
- Downloads new DMARC reports (XML/XML.gz/ZIP)
- Parses and aggregates stats
- Sends summary to Telegram
- Alerts on anomalies (unknown IPs, DKIM/SPF fails, spoofing)
"""

import os
import sys
import imaplib
import email
import gzip
import zipfile
import io
import xml.etree.ElementTree as ET
import urllib.request
import urllib.parse
from collections import defaultdict


def load_env(path='/etc/mail-security/imap.env'):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k] = v.strip().strip('"').strip("'")
    return env


TG_BOT = '8349162167:AAGlhfoIZx7cUk40ebLypjEbpK6SG_f-rAM'
TG_CHAT = '7560535072'


def tg_send(text):
    url = 'https://api.telegram.org/bot' + TG_BOT + '/sendMessage'
    data = urllib.parse.urlencode({'chat_id': TG_CHAT, 'text': text}).encode()
    try:
        urllib.request.urlopen(url, data, timeout=10)
    except Exception as e:
        print('Telegram error: ' + str(e))


def parse_dmarc_xml(xml_bytes):
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return None

    report = {
        'org': root.findtext('.//org_name', ''),
        'domain': root.findtext('.//policy_published/domain', ''),
        'date_begin': int(root.findtext('.//date_range/begin', '0') or 0),
        'date_end': int(root.findtext('.//date_range/end', '0') or 0),
        'records': [],
    }

    for record in root.findall('.//record'):
        row = {
            'source_ip': record.findtext('.//source_ip', ''),
            'count': int(record.findtext('.//count', '0') or 0),
            'disposition': record.findtext('.//disposition', ''),
            'dkim': record.findtext('.//policy_evaluated/dkim', ''),
            'spf': record.findtext('.//policy_evaluated/spf', ''),
        }
        report['records'].append(row)

    return report


def extract_xml(filename, data):
    fname = filename.lower()
    if fname.endswith('.xml.gz') or fname.endswith('.gz'):
        try:
            return gzip.decompress(data)
        except Exception:
            return None
    if fname.endswith('.zip'):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                for name in z.namelist():
                    if name.endswith('.xml'):
                        return z.read(name)
        except Exception:
            return None
    if fname.endswith('.xml'):
        return data
    return None


def main():
    env = load_env()
    state_dir = '/var/lib/mail-security/dmarc-reports'
    os.makedirs(state_dir, exist_ok=True)
    seen_file = os.path.join(state_dir, 'seen.txt')
    seen = set()
    if os.path.exists(seen_file):
        with open(seen_file) as f:
            seen = {line.strip() for line in f if line.strip()}

    try:
        M = imaplib.IMAP4_SSL(env['IMAP_HOST'], int(env['IMAP_PORT']))
        M.login(env['IMAP_USER'], env['IMAP_PASS'])
        M.select(env.get('IMAP_FOLDER', 'INBOX'))
    except Exception as e:
        print('IMAP connection failed: ' + str(e))
        tg_send('DMARC parser: IMAP connection failed - ' + str(e))
        sys.exit(1)

    typ, data = M.search(None, 'SUBJECT', '"Report Domain"')
    if typ != 'OK' or not data[0]:
        typ, data = M.search(None, 'SUBJECT', '"report domain"')
    if typ != 'OK' or not data[0]:
        typ, data = M.search(None, 'SUBJECT', '"DMARC"')

    msg_ids = data[0].split() if data[0] else []

    total_emails = 0
    by_org = defaultdict(int)
    by_domain = defaultdict(int)
    by_ip = defaultdict(int)
    dkim_pass = 0
    dkim_fail = 0
    spf_pass = 0
    spf_fail = 0
    reports_processed = 0

    for msg_id in msg_ids:
        msg_id_str = msg_id.decode()
        if msg_id_str in seen:
            continue

        typ, msg_data = M.fetch(msg_id, '(RFC822)')
        if typ != 'OK':
            continue

        msg = email.message_from_bytes(msg_data[0][1])

        for part in msg.walk():
            if part.get_content_maintype() == 'multipart':
                continue
            filename = part.get_filename()
            if not filename:
                continue

            attachment = part.get_payload(decode=True)
            if not attachment:
                continue

            xml_bytes = extract_xml(filename, attachment)
            if not xml_bytes:
                continue

            report = parse_dmarc_xml(xml_bytes)
            if not report:
                continue

            reports_processed += 1
            by_org[report['org']] += 1
            by_domain[report['domain']] += sum(r['count'] for r in report['records'])

            for r in report['records']:
                total_emails += r['count']
                by_ip[r['source_ip']] += r['count']
                if r['dkim'] == 'pass':
                    dkim_pass += r['count']
                else:
                    dkim_fail += r['count']
                if r['spf'] == 'pass':
                    spf_pass += r['count']
                else:
                    spf_fail += r['count']

        seen.add(msg_id_str)

    M.logout()

    with open(seen_file, 'w') as f:
        for s in seen:
            f.write(s + '\n')

    if reports_processed == 0:
        print('No new reports to process')
        return

    KNOWN_IPS = {
        '178.18.243.7', '84.247.168.78',
        '204.168.180.175',
        '109.234.162.210',
    }

    unknown_ips = {ip: count for ip, count in by_ip.items() if ip not in KNOWN_IPS}

    dkim_rate = (dkim_pass / total_emails * 100) if total_emails else 0
    spf_rate = (spf_pass / total_emails * 100) if total_emails else 0

    lines = []
    lines.append('DMARC Report — ' + str(reports_processed) + ' new reports')
    lines.append('')
    lines.append('Total emails: ' + format(total_emails, ','))
    lines.append('DKIM pass: ' + format(dkim_pass, ',') + ' (' + format(dkim_rate, '.1f') + '%)')
    lines.append('SPF pass: ' + format(spf_pass, ',') + ' (' + format(spf_rate, '.1f') + '%)')
    lines.append('')
    lines.append('By domain:')
    for domain, count in sorted(by_domain.items(), key=lambda x: -x[1])[:5]:
        lines.append('  ' + domain + ': ' + format(count, ','))
    lines.append('')
    lines.append('By reporter:')
    for org, count in sorted(by_org.items(), key=lambda x: -x[1])[:5]:
        lines.append('  ' + org + ': ' + str(count))
    lines.append('')
    lines.append('Top IPs:')
    for ip, count in sorted(by_ip.items(), key=lambda x: -x[1])[:5]:
        marker = 'OK' if ip in KNOWN_IPS else '!!'
        lines.append('  [' + marker + '] ' + ip + ': ' + format(count, ','))

    if unknown_ips:
        lines.append('')
        lines.append('UNKNOWN IPs sending as your domain:')
        for ip, count in sorted(unknown_ips.items(), key=lambda x: -x[1])[:10]:
            lines.append('  ' + ip + ': ' + format(count, ',') + ' emails')

    if dkim_rate < 95 and total_emails > 10:
        lines.append('')
        lines.append('WARNING: DKIM rate low (' + format(dkim_rate, '.1f') + '%)')
    if spf_rate < 95 and total_emails > 10:
        lines.append('')
        lines.append('WARNING: SPF rate low (' + format(spf_rate, '.1f') + '%)')

    summary = '\n'.join(lines)
    print(summary)
    tg_send(summary)


if __name__ == '__main__':
    main()
