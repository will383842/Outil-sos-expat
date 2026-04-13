#!/usr/bin/env python3
"""
PMTA Warmup Rate Limiter — Hourly Adjuster
Reads schedule.json, computes current hour quota, updates PMTA max-msg-rate
"""
import json
import re
import random
import subprocess
import os
from datetime import datetime, timezone

SCHEDULE_FILE = '/opt/mail-security/warmup/schedule.json'
PMTA_CONFIG = '/etc/pmta/config'
STATE_DIR = '/var/lib/mail-security/warmup'
LOG_FILE = '/var/log/warmup-rate.log'


def log(msg):
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    line = '[' + ts + '] ' + msg
    print(line)
    with open(LOG_FILE, 'a') as f:
        f.write(line + '\n')


def load_schedule():
    with open(SCHEDULE_FILE) as f:
        return json.load(f)


def get_daily_quota(cfg, date_str):
    return cfg['schedule'].get(date_str, 0)


def get_hour_pct(cfg, hour, is_weekend):
    key = 'hourly_weekend' if is_weekend else 'hourly_weekday'
    return cfg[key].get(str(hour), 0)


def compute_hourly_quota(daily_quota, hour_pct, variation_pct):
    base = daily_quota * hour_pct
    if variation_pct > 0 and base > 0:
        delta = random.uniform(-variation_pct, variation_pct) / 100.0
        base = base * (1.0 + delta)
    return max(0, round(base))


def compute_pmta_rate(hourly_quota, num_vmtas=5):
    per_vmta = max(1, round((hourly_quota / num_vmtas) * 1.2))
    return per_vmta


def update_pmta_config(rate_per_vmta):
    with open(PMTA_CONFIG) as f:
        content = f.read()

    pattern = r'(<virtual-mta vmta-\w+>[\s\S]*?<domain \*>[\s\S]*?)max-msg-rate \d+/h'
    new_content = re.sub(
        pattern,
        lambda m: m.group(1) + 'max-msg-rate ' + str(rate_per_vmta) + '/h',
        content,
    )

    if new_content == content:
        return False

    with open(PMTA_CONFIG, 'w') as f:
        f.write(new_content)
    return True


def reload_pmta():
    try:
        subprocess.run(['pkill', '-HUP', 'pmta'], check=False)
        return True
    except Exception as e:
        log('PMTA reload failed: ' + str(e))
        return False


def check_killswitch(cfg):
    try:
        with open('/var/lib/mail-security/spamhaus-state') as f:
            state = f.read().strip()
        if state == 'listed':
            return 'spamhaus-listed'
    except Exception:
        pass
    return None


def save_state(state):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(os.path.join(STATE_DIR, 'current-state.json'), 'w') as f:
        json.dump(state, f, indent=2)


def main():
    cfg = load_schedule()
    now = datetime.now(timezone.utc)
    date_str = now.strftime('%Y-%m-%d')
    hour = now.hour
    is_weekend = now.weekday() >= 5

    daily_quota = get_daily_quota(cfg, date_str)
    hour_pct = get_hour_pct(cfg, hour, is_weekend)
    variation = cfg.get('daily_variation_percent', 15)

    # Determine mode
    end_date = cfg.get('end_date', '2026-08-17')
    start_date = cfg.get('start_date', '2026-04-13')
    steady = cfg.get('post_schedule_steady_state', {})
    p1_start = '2026-04-21'  # First day of real campaigns

    if date_str < p1_start:
        # P0: before real campaigns, PMTA untouched
        log('date=' + date_str + ' P0 mode (pre-campaign) — PMTA untouched')
        save_state({
            'date': date_str, 'hour': hour, 'daily_quota': 0,
            'hour_pct': hour_pct, 'rate_per_vmta': 'untouched',
            'killswitch': None, 'mode': 'P0',
            'last_update': now.isoformat()
        })
        return

    if date_str > end_date:
        # Post-schedule: use steady state daily quota as fallback
        daily_quota = steady.get('daily_quota', 1000)
        log('date=' + date_str + ' POST-SCHEDULE steady state: ' + str(daily_quota) + '/day')

    kill_reason = check_killswitch(cfg)
    if kill_reason:
        rate = 1
        log('KILLSWITCH ACTIVE: ' + kill_reason + ' - forcing 1/h minimum')
    else:
        hourly_quota = compute_hourly_quota(daily_quota, hour_pct, variation)
        rate = compute_pmta_rate(hourly_quota)
        if hour_pct == 0:
            # Off-hours (night, weekend outside work hours): keep very low
            rate = 1

    log('date=' + date_str + ' hour=' + str(hour) + ' weekend=' + str(is_weekend) +
        ' daily=' + str(daily_quota) + ' hour_pct=' + format(hour_pct, '.2f') +
        ' rate_per_vmta=' + str(rate) + '/h')

    if update_pmta_config(rate):
        reload_pmta()
        log('PMTA config updated: ' + str(rate) + '/h per vmta')

    save_state({
        'date': date_str,
        'hour': hour,
        'daily_quota': daily_quota,
        'hour_pct': hour_pct,
        'rate_per_vmta': rate,
        'killswitch': kill_reason,
        'last_update': now.isoformat()
    })


if __name__ == '__main__':
    main()
