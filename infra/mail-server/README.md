# Mail Server Infrastructure — VPS Hetzner 204.168.180.175

Configs de référence pour le serveur mail Postfix + Dovecot + PMTA + Nginx hébergeant les 5 inboxes `presse@*` utilisées pour le warmup Mailflow et les campagnes cold via PowerMTA.

## Stack

- **Postfix** (submission 587 + smtp 25) → Dovecot (IMAP 993 + LMTP)
- **PMTA v5.0r8** (relay 127.0.0.1:2525) → délivrance externe via 5 VMTA dédiées
- **Nginx** (80/443) → vhosts `mta-sts.<domain>` pour policy MTA-STS
- **DKIM** via OpenDKIM (milter) + clés 2048-bit par domaine

## 5 domaines gérés

1. hub-travelers.com
2. plane-liberty.com
3. planevilain.com
4. emilia-mullerd.com
5. providers-expat.com (hostname principal du VPS)

## Fichiers de ce dossier

- `pmta/config` — configuration PMTA (5 VMTA + rate limits ISP + patterns routage)
- `nginx/mta-sts.conf` — vhosts HTTP pour MTA-STS policy
- `mta-sts-policies/<domain>.txt` — fichiers policy MTA-STS (mode testing)

## Déploiement depuis ce dossier

```bash
# PMTA
scp infra/mail-server/pmta/config root@204.168.180.175:/etc/pmta/config
ssh root@204.168.180.175 'systemctl restart pmta'

# Nginx MTA-STS
scp infra/mail-server/nginx/mta-sts.conf root@204.168.180.175:/etc/nginx/sites-available/mta-sts
ssh root@204.168.180.175 'ln -sf /etc/nginx/sites-available/mta-sts /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx'

# Policies MTA-STS
for d in hub-travelers.com plane-liberty.com planevilain.com emilia-mullerd.com providers-expat.com; do
  scp infra/mail-server/mta-sts-policies/$d.txt root@204.168.180.175:/var/www/mta-sts/$d/.well-known/mta-sts.txt
done
```

## DNS requis (Spaceship)

Pour chaque domaine :
- `A mta-sts.<domain>` → `204.168.180.175` (nécessaire pour Let's Encrypt avant HTTPS)
- `TXT _mta-sts.<domain>` → `"v=STSv1; id=2026041701"`
- `TXT _smtp._tls.<domain>` → `"v=TLSRPTv1; rua=mailto:tlsrpt@<domain>"`
- `TXT _dmarc.<domain>` → `"v=DMARC1; p=none; sp=none; rua=mailto:dmarc@<domain>; adkim=r; aspf=r; pct=100"` (pendant warmup, puis `p=quarantine`)

DNSSEC à activer dans Spaceship sur `planevilain.com`, `emilia-mullerd.com`, `providers-expat.com` (les 2 autres déjà activés).

## Credentials IMAP/SMTP

**Ne sont PAS commités ici.** Voir `/root/mailflow-credentials/credentials.txt` sur le VPS.

## Bugs historiques fixés

- **2026-04-11** : Postfix `relayhost=[127.0.0.1]:2525` global → timeout Mailflow. Fix dans `/etc/postfix/master.cf` bloc submission.
- **2026-04-14** : fail2ban bannissait les IPs Mailflow AWS. Fix : `ignoreip` étendu avec CIDRs AWS us-east-1.
- **2026-04-17** : Dossiers `.processed-bounces` créés en root par mail-forwarder → Dovecot plantait quand Mailflow tentait d'y créer `cur/new/tmp`. Fix : `chown -R <user>:<user>` + création explicite des sous-dossiers Maildir.
- **2026-04-17** : Messages `planevilain.com → hotmail.fr` stuck en queue PMTA (erreur "Unable to parse serial number"). Fix : ajout règles `<domain hotmail.fr>` / `outlook.fr` / `live.fr` / `live.com` dans PMTA config + restart.
