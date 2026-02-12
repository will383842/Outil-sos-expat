# Chatter Drip Messages

Ce dossier contient les **60+ messages de motivation** pour les chatters SOS Expat.

## 📋 Description

Système de **drip campaign** automatique qui envoie des messages de motivation et de formation aux chatters via Telegram sur une période de **90 jours**.

## 📁 Fichiers

- `chatterDripMessages.ts` - 62 messages multilingues (9 langues)

## 🌍 Langues supportées

- 🇫🇷 Français (fr)
- 🇬🇧 Anglais (en)
- 🇪🇸 Espagnol (es)
- 🇩🇪 Allemand (de)
- 🇵🇹 Portugais (pt)
- 🇷🇺 Russe (ru)
- 🇨🇳 Chinois (zh)
- 🇮🇳 Hindi (hi)
- 🇸🇦 Arabe (ar)

## 📅 Structure des messages

Chaque message contient :
- `day` : Jour d'envoi (0-90)
- `messages` : Object avec traductions pour chaque langue

## 🔄 Seed dans Firestore

Pour insérer ces messages dans Firestore :

```bash
cd sos/firebase/functions
node scripts/seedChatterDripMessages.js
```

Collection Firestore : `chatter_drip_messages`

## 📊 Phases de la campagne

1. **Jours 0-7** : Bienvenue & Premiers pas (8 messages)
2. **Jours 8-30** : Activation & Formation (15 messages)
3. **Jours 31-60** : Croissance & Optimisation (20 messages)
4. **Jours 61-90** : Rétention & Advanced tips (19 messages)

## 🎯 Objectifs

- Onboarding progressif des nouveaux chatters
- Formation continue sur les meilleures pratiques
- Motivation et engagement
- Maximisation des revenus ($10 client, $5 recrutement, $1 filleul)
