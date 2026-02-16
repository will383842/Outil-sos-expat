# 🔍 AUDIT TRADUCTIONS - BloggerLanding.tsx

**Date:** 2026-02-13
**Fichier analysé:** `sos/src/pages/Blogger/BloggerLanding.tsx`
**Langues vérifiées:** 9 (fr, en, es, de, pt, ru, ch, hi, ar)

---

## 📊 RÉSUMÉ

| Métrique | Valeur |
|----------|--------|
| **Total de clés utilisées** | 139 |
| **Clés présentes** | 127 (91.4%) |
| **Clés manquantes** | **12** (8.6%) |
| **Statut global** | ❌ Incomplet |

---

## 🌍 STATUT PAR LANGUE

Toutes les langues ont **exactement les mêmes 12 clés manquantes** :

| Langue | Code | Couverture | Clés manquantes |
|--------|------|------------|-----------------|
| 🇫🇷 Français | `fr` | 127/139 (91.4%) | 12 |
| 🇬🇧 English | `en` | 127/139 (91.4%) | 12 |
| 🇪🇸 Español | `es` | 127/139 (91.4%) | 12 |
| 🇩🇪 Deutsch | `de` | 127/139 (91.4%) | 12 |
| 🇵🇹 Português | `pt` | 127/139 (91.4%) | 12 |
| 🇷🇺 Русский | `ru` | 127/139 (91.4%) | 12 |
| 🇨🇳 中文 | `ch` | 127/139 (91.4%) | 12 |
| 🇮🇳 हिन्दी | `hi` | 127/139 (91.4%) | 12 |
| 🇸🇦 العربية | `ar` | 127/139 (91.4%) | 12 |

---

## ⚠️ CLÉS MANQUANTES (12 clés)

### 1. `blogger.aria.cta.main`
**Contexte:** Attribut `aria-label` pour le bouton CTA principal (accessibilité)
**Valeur EN par défaut:**
```
Start earning money with your blog - Register as a Blogger Partner for free
```

---

### 2. `blogger.hero.new.line1`
**Contexte:** Première ligne du titre H1 (Hero section)
**Valeur EN par défaut:**
```
Gagnez jusqu'à
```
**⚠️ Note:** La valeur par défaut est en français. Pour EN, utiliser: `Earn up to`

---

### 3. `blogger.hero.new.amount`
**Contexte:** Montant affiché dans le titre H1 (Hero section)
**Valeur EN par défaut:**
```
5000$+/mois
```
**⚠️ Note:** Adapter selon la langue (ex: EN = `$5000+/month`)

---

### 4. `blogger.hero.new.line2`
**Contexte:** Deuxième ligne du titre H1 (Hero section)
**Valeur EN par défaut:**
```
avec votre blog
```
**⚠️ Note:** Pour EN, utiliser: `with your blog`

---

### 5. `blogger.hero.new.subtitle`
**Contexte:** Sous-titre du Hero
**Valeur EN par défaut:**
```
Écrivez sur la vie d'expatrié. Intégrez votre lien. Vos lecteurs appellent. Vous gagnez 10$/appel. SEO = revenus passifs !
```
**⚠️ Note:** Pour EN, utiliser:
```
Write about expat life. Add your link. Your readers call. You earn $10/call. SEO = passive income!
```

---

### 6. `blogger.hero.sources`
**Contexte:** Titre de la section "3 sources de revenus"
**Valeur EN par défaut:**
```
3 sources de revenus illimitées :
```
**⚠️ Note:** Pour EN: `3 unlimited revenue streams:`

---

### 7. `blogger.hero.source1`
**Contexte:** Description source de revenu #1
**Valeur EN par défaut:**
```
par appel lecteur
```
**⚠️ Note:** Pour EN: `per reader call`

---

### 8. `blogger.hero.source2`
**Contexte:** Description source de revenu #2
**Valeur EN par défaut:**
```
trafic SEO passif
```
**⚠️ Note:** Pour EN: `passive SEO traffic`

---

### 9. `blogger.hero.hot`
**Contexte:** Badge "HOT" sur la source #3
**Valeur EN par défaut:**
```
🔥 HOT
```
**⚠️ Note:** Universel, peut rester identique dans toutes les langues

---

### 10. `blogger.hero.source3`
**Contexte:** Description source de revenu #3
**Valeur EN par défaut:**
```
avec 10 partenaires
```
**⚠️ Note:** Pour EN: `with 10 partners`

---

### 11. `blogger.hero.partnerExample`
**Contexte:** Exemple de calcul de revenus partenaires (contient une variable `{total}`)
**Valeur EN par défaut:**
```
💡 1 partenaire (avocat/expatrié aidant) = 30 appels/mois × 5$ × 6 mois = {total} passifs !
```
**⚠️ Note:** Contient une variable `{total}` qui affiche le montant calculé. Pour EN:
```
💡 1 partner (lawyer/expat helper) = 30 calls/month × $5 × 6 months = {total} passive!
```

---

### 12. `blogger.hero.scroll`
**Contexte:** Label du scroll indicator (flèche en bas du Hero)
**Valeur EN par défaut:**
```
Discover more
```

---

## 📝 NOTES IMPORTANTES

### ⚠️ Valeurs par défaut en français
Certaines clés ont des `defaultMessage` en **français** dans le code TypeScript au lieu d'anglais :
- `blogger.hero.new.line1`
- `blogger.hero.new.amount`
- `blogger.hero.new.line2`
- `blogger.hero.new.subtitle`
- `blogger.hero.sources`
- `blogger.hero.source1`
- `blogger.hero.source2`
- `blogger.hero.source3`
- `blogger.hero.partnerExample`

**Recommandation:** Les `defaultMessage` devraient être en anglais par convention. Cependant, pour la traduction, utilisez les valeurs françaises comme référence et adaptez-les à chaque langue.

---

### ❌ Faux positifs éliminés
Les 7 clés suivantes ont été **retirées** de la liste car ce sont des **attributs HTML `id`**, pas des clés de traduction :
- `blogger-steps-title`
- `blogger-profiles-title`
- `blogger-existing-title`
- `blogger-topics-title`
- `blogger-resources-title`
- `blogger-passive-title`
- `blogger-faq-title`

Ces attributs servent à l'accessibilité (`aria-labelledby`) et ne doivent **PAS** être ajoutés aux fichiers JSON de traduction.

---

## 🔧 ACTION REQUISE

### Ajouter ces 12 clés dans **9 fichiers** :

1. `sos/src/helper/fr.json`
2. `sos/src/helper/en.json`
3. `sos/src/helper/es.json`
4. `sos/src/helper/de.json`
5. `sos/src/helper/pt.json`
6. `sos/src/helper/ru.json`
7. `sos/src/helper/ch.json`
8. `sos/src/helper/hi.json`
9. `sos/src/helper/ar.json`

---

## 📋 TEMPLATE JSON (à adapter pour chaque langue)

### Français (fr.json)
```json
{
  "blogger.aria.cta.main": "Commencez à gagner de l'argent avec votre blog - Inscrivez-vous gratuitement comme Blogueur Partenaire",
  "blogger.hero.new.line1": "Gagnez jusqu'à",
  "blogger.hero.new.amount": "5000$+/mois",
  "blogger.hero.new.line2": "avec votre blog",
  "blogger.hero.new.subtitle": "Écrivez sur la vie d'expatrié. Intégrez votre lien. Vos lecteurs appellent. Vous gagnez 10$/appel. SEO = revenus passifs !",
  "blogger.hero.sources": "3 sources de revenus illimitées :",
  "blogger.hero.source1": "par appel lecteur",
  "blogger.hero.source2": "trafic SEO passif",
  "blogger.hero.hot": "🔥 HOT",
  "blogger.hero.source3": "avec 10 partenaires",
  "blogger.hero.partnerExample": "💡 1 partenaire (avocat/expatrié aidant) = 30 appels/mois × 5$ × 6 mois = {total} passifs !",
  "blogger.hero.scroll": "Découvrir plus"
}
```

### English (en.json)
```json
{
  "blogger.aria.cta.main": "Start earning money with your blog - Register as a Blogger Partner for free",
  "blogger.hero.new.line1": "Earn up to",
  "blogger.hero.new.amount": "$5000+/month",
  "blogger.hero.new.line2": "with your blog",
  "blogger.hero.new.subtitle": "Write about expat life. Add your link. Your readers call. You earn $10/call. SEO = passive income!",
  "blogger.hero.sources": "3 unlimited revenue streams:",
  "blogger.hero.source1": "per reader call",
  "blogger.hero.source2": "passive SEO traffic",
  "blogger.hero.hot": "🔥 HOT",
  "blogger.hero.source3": "with 10 partners",
  "blogger.hero.partnerExample": "💡 1 partner (lawyer/expat helper) = 30 calls/month × $5 × 6 months = {total} passive!",
  "blogger.hero.scroll": "Discover more"
}
```

### Español (es.json)
```json
{
  "blogger.aria.cta.main": "Empieza a ganar dinero con tu blog - Regístrate gratis como Blogger Asociado",
  "blogger.hero.new.line1": "Gana hasta",
  "blogger.hero.new.amount": "$5000+/mes",
  "blogger.hero.new.line2": "con tu blog",
  "blogger.hero.new.subtitle": "Escribe sobre la vida de expatriado. Añade tu enlace. Tus lectores llaman. Ganas $10/llamada. SEO = ingresos pasivos!",
  "blogger.hero.sources": "3 fuentes de ingresos ilimitadas:",
  "blogger.hero.source1": "por llamada de lector",
  "blogger.hero.source2": "tráfico SEO pasivo",
  "blogger.hero.hot": "🔥 HOT",
  "blogger.hero.source3": "con 10 socios",
  "blogger.hero.partnerExample": "💡 1 socio (abogado/ayudante expatriado) = 30 llamadas/mes × $5 × 6 meses = {total} pasivos!",
  "blogger.hero.scroll": "Descubre más"
}
```

### Deutsch (de.json)
```json
{
  "blogger.aria.cta.main": "Verdienen Sie Geld mit Ihrem Blog - Registrieren Sie sich kostenlos als Blogger-Partner",
  "blogger.hero.new.line1": "Verdienen Sie bis zu",
  "blogger.hero.new.amount": "$5000+/Monat",
  "blogger.hero.new.line2": "mit Ihrem Blog",
  "blogger.hero.new.subtitle": "Schreiben Sie über das Expat-Leben. Fügen Sie Ihren Link hinzu. Ihre Leser rufen an. Sie verdienen $10/Anruf. SEO = passives Einkommen!",
  "blogger.hero.sources": "3 unbegrenzte Einkommensquellen:",
  "blogger.hero.source1": "pro Leseranruf",
  "blogger.hero.source2": "passiver SEO-Traffic",
  "blogger.hero.hot": "🔥 HOT",
  "blogger.hero.source3": "mit 10 Partnern",
  "blogger.hero.partnerExample": "💡 1 Partner (Anwalt/Expat-Helfer) = 30 Anrufe/Monat × $5 × 6 Monate = {total} passiv!",
  "blogger.hero.scroll": "Mehr entdecken"
}
```

### Português (pt.json)
```json
{
  "blogger.aria.cta.main": "Comece a ganhar dinheiro com seu blog - Registre-se gratuitamente como Blogueiro Parceiro",
  "blogger.hero.new.line1": "Ganhe até",
  "blogger.hero.new.amount": "$5000+/mês",
  "blogger.hero.new.line2": "com seu blog",
  "blogger.hero.new.subtitle": "Escreva sobre a vida de expatriado. Adicione seu link. Seus leitores ligam. Você ganha $10/chamada. SEO = renda passiva!",
  "blogger.hero.sources": "3 fontes de renda ilimitadas:",
  "blogger.hero.source1": "por chamada do leitor",
  "blogger.hero.source2": "tráfego SEO passivo",
  "blogger.hero.hot": "🔥 HOT",
  "blogger.hero.source3": "com 10 parceiros",
  "blogger.hero.partnerExample": "💡 1 parceiro (advogado/ajudante expatriado) = 30 chamadas/mês × $5 × 6 meses = {total} passivos!",
  "blogger.hero.scroll": "Descubra mais"
}
```

### Русский (ru.json)
```json
{
  "blogger.aria.cta.main": "Начните зарабатывать деньги со своим блогом - Зарегистрируйтесь бесплатно как Блогер-Партнёр",
  "blogger.hero.new.line1": "Зарабатывайте до",
  "blogger.hero.new.amount": "$5000+/месяц",
  "blogger.hero.new.line2": "со своим блогом",
  "blogger.hero.new.subtitle": "Пишите о жизни экспатов. Добавьте свою ссылку. Ваши читатели звонят. Вы зарабатываете $10/звонок. SEO = пассивный доход!",
  "blogger.hero.sources": "3 неограниченных источника дохода:",
  "blogger.hero.source1": "за звонок читателя",
  "blogger.hero.source2": "пассивный SEO-трафик",
  "blogger.hero.hot": "🔥 HOT",
  "blogger.hero.source3": "с 10 партнёрами",
  "blogger.hero.partnerExample": "💡 1 партнёр (адвокат/помощник экспата) = 30 звонков/месяц × $5 × 6 месяцев = {total} пассивно!",
  "blogger.hero.scroll": "Узнать больше"
}
```

### 中文 (ch.json)
```json
{
  "blogger.aria.cta.main": "开始用您的博客赚钱 - 免费注册成为博主合作伙伴",
  "blogger.hero.new.line1": "赚取高达",
  "blogger.hero.new.amount": "$5000+/月",
  "blogger.hero.new.line2": "通过您的博客",
  "blogger.hero.new.subtitle": "撰写关于外派生活的文章。添加您的链接。您的读者打电话。您每通电话赚取$10。SEO = 被动收入！",
  "blogger.hero.sources": "3个无限收入来源：",
  "blogger.hero.source1": "每个读者电话",
  "blogger.hero.source2": "被动SEO流量",
  "blogger.hero.hot": "🔥 HOT",
  "blogger.hero.source3": "与10个合作伙伴",
  "blogger.hero.partnerExample": "💡 1个合作伙伴（律师/外派助手）= 30通电话/月 × $5 × 6个月 = {total} 被动收入！",
  "blogger.hero.scroll": "了解更多"
}
```

### हिन्दी (hi.json)
```json
{
  "blogger.aria.cta.main": "अपने ब्लॉग से पैसे कमाना शुरू करें - ब्लॉगर पार्टनर के रूप में मुफ्त में रजिस्टर करें",
  "blogger.hero.new.line1": "कमाएं",
  "blogger.hero.new.amount": "$5000+/महीना",
  "blogger.hero.new.line2": "अपने ब्लॉग से",
  "blogger.hero.new.subtitle": "प्रवासी जीवन के बारे में लिखें। अपना लिंक जोड़ें। आपके पाठक कॉल करते हैं। आप $10/कॉल कमाते हैं। SEO = निष्क्रिय आय!",
  "blogger.hero.sources": "3 असीमित राजस्व स्रोत:",
  "blogger.hero.source1": "प्रति पाठक कॉल",
  "blogger.hero.source2": "निष्क्रिय SEO ट्रैफ़िक",
  "blogger.hero.hot": "🔥 HOT",
  "blogger.hero.source3": "10 साझेदारों के साथ",
  "blogger.hero.partnerExample": "💡 1 साझेदार (वकील/प्रवासी सहायक) = 30 कॉल/महीना × $5 × 6 महीने = {total} निष्क्रिय!",
  "blogger.hero.scroll": "और जानें"
}
```

### العربية (ar.json)
```json
{
  "blogger.aria.cta.main": "ابدأ في كسب المال من مدونتك - سجل مجانًا كشريك مدون",
  "blogger.hero.new.line1": "اكسب حتى",
  "blogger.hero.new.amount": "$5000+/شهر",
  "blogger.hero.new.line2": "مع مدونتك",
  "blogger.hero.new.subtitle": "اكتب عن حياة المغتربين. أضف رابطك. قراؤك يتصلون. تكسب $10/مكالمة. SEO = دخل سلبي!",
  "blogger.hero.sources": "3 مصادر دخل غير محدودة:",
  "blogger.hero.source1": "لكل مكالمة قارئ",
  "blogger.hero.source2": "حركة SEO سلبية",
  "blogger.hero.hot": "🔥 HOT",
  "blogger.hero.source3": "مع 10 شركاء",
  "blogger.hero.partnerExample": "💡 1 شريك (محامي/مساعد مغترب) = 30 مكالمة/شهر × $5 × 6 أشهر = {total} سلبي!",
  "blogger.hero.scroll": "اكتشف المزيد"
}
```

---

## ✅ PROCHAINES ÉTAPES

1. **Valider les traductions** avec un locuteur natif pour chaque langue
2. **Ajouter les clés** dans les 9 fichiers JSON
3. **Tester** la landing page dans chaque langue
4. **Vérifier** qu'aucun texte n'affiche les `defaultMessage` au lieu des traductions
5. **Re-exécuter** le script `check-blogger-keys.js` pour confirmer 100% de couverture

---

**Généré le:** 2026-02-13
**Par:** Script d'audit automatique
