# LISTE COMPLÈTE D'IMPLÉMENTATION SEO - SOS EXPAT
## Avec Pré-rendu pour indexation Google/Bing/IA
## Site international : 197 pays × 9 langues

---

## CONTEXTE INTERNATIONAL

### Langues supportées (9)
| Code | Langue | Locale principal | Pays principaux |
|------|--------|------------------|-----------------|
| fr | Français | fr-fr | France, Belgique, Suisse, Canada, Maroc |
| en | Anglais | en-us | USA, UK, Australie, Canada, Inde |
| es | Espagnol | es-es | Espagne, Mexique, Argentine, Colombie |
| de | Allemand | de-de | Allemagne, Autriche, Suisse |
| pt | Portugais | pt-pt | Portugal, Brésil |
| ru | Russe | ru-ru | Russie, Ukraine, Kazakhstan |
| zh | Chinois | zh-cn | Chine, Taïwan, Singapour |
| ar | Arabe | ar-sa | Arabie Saoudite, EAU, Égypte |
| hi | Hindi | hi-in | Inde |

### Format des URLs
```
https://sos-expat.com/{langue}-{pays}/{page}

Exemples :
- /fr-fr/tarifs           (Français depuis France)
- /fr-th/tarifs           (Français depuis Thaïlande)
- /en-us/pricing          (Anglais depuis USA)
- /de-de/preise           (Allemand depuis Allemagne)
- /es-mx/precios          (Espagnol depuis Mexique)
```

### Impact sur le pré-rendu
- **Pages fixes** : ~15 pages × 9 langues = **~135 pages pré-rendues**
- **Profils avocats/expats** : Rendu dynamique via Cloud Function
- **Hreflang** : Chaque page doit avoir des liens vers les 9 versions linguistiques

---

## VUE D'ENSEMBLE

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLAN D'IMPLÉMENTATION                        │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 1 : Pré-rendu React-Snap (pages fixes)    │  ~4 heures  │
│  PHASE 2 : Cloud Function (pages dynamiques)     │  ~6 heures  │
│  PHASE 3 : Corrections index.html                │  ~2 heures  │
│  PHASE 4 : Contenu noscript enrichi              │  ~1 heure   │
│  PHASE 5 : SEO pages manquantes                  │  ~4 heures  │
│  PHASE 6 : Schemas additionnels                  │  ~3 heures  │
│  PHASE 7 : Traductions SEO                       │  ~4 heures  │
│  PHASE 8 : Tests et validation                   │  ~2 heures  │
│  PHASE 9 : Déploiement et soumission             │  ~2 heures  │
├─────────────────────────────────────────────────────────────────┤
│  TOTAL ESTIMÉ                                    │  ~28 heures │
│                                                  │  (4 jours)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1 : PRÉ-RENDU REACT-SNAP (Pages fixes)

### 1.1 Installation des dépendances

| #     | Tâche                  | Fichier        | Commande/Détail                     |
|-------|------------------------|----------------|-------------------------------------|
| 1.1.1 | Installer react-snap   | package.json   | `npm install --save-dev react-snap` |
| 1.1.2 | Installer puppeteer    | package.json   | `npm install --save-dev puppeteer`  |

### 1.2 Configuration package.json

| #     | Tâche                           | Fichier        | Détail                                |
|-------|---------------------------------|----------------|---------------------------------------|
| 1.2.1 | Ajouter script postbuild        | package.json   | `"postbuild": "react-snap"`           |
| 1.2.2 | Créer section reactSnap         | package.json   | Voir configuration ci-dessous         |
| 1.2.3 | Définir source/destination      | package.json   | `"source": "dist", "destination": "dist"` |
| 1.2.4 | Configurer puppeteerArgs        | package.json   | `["--no-sandbox", "--disable-setuid-sandbox"]` |
| 1.2.5 | Configurer timeout              | package.json   | `"timeout": 60000`                    |
| 1.2.6 | Activer skipThirdPartyRequests  | package.json   | `"skipThirdPartyRequests": true`      |
| 1.2.7 | Activer inlineCss               | package.json   | `"inlineCss": true`                   |

**Configuration complète à ajouter dans package.json :**

```json
{
  "reactSnap": {
    "source": "dist",
    "destination": "dist",
    "include": [
      "/fr-fr",
      "/en-us",
      "/es-es",
      "/de-de",
      "/pt-pt",
      "/ru-ru",
      "/zh-cn",
      "/ar-sa",
      "/hi-in",
      "/fr-fr/tarifs",
      "/fr-fr/faq",
      "/fr-fr/contact",
      "/fr-fr/comment-ca-marche",
      "/fr-fr/temoignages",
      "/fr-fr/centre-aide",
      "/fr-fr/politique-confidentialite",
      "/fr-fr/cgu-clients",
      "/fr-fr/cgu-avocats",
      "/fr-fr/cgu-expatries",
      "/fr-fr/cookies",
      "/fr-fr/inscription-avocat",
      "/fr-fr/inscription-expat",
      "/fr-fr/inscription-client",
      "/fr-fr/connexion",
      "/en-us/pricing",
      "/en-us/faq",
      "/en-us/contact",
      "/en-us/how-it-works",
      "/en-us/testimonials",
      "/en-us/help-center",
      "/en-us/privacy-policy",
      "/en-us/terms-clients",
      "/en-us/terms-lawyers",
      "/en-us/terms-expats",
      "/en-us/cookies",
      "/en-us/register-lawyer",
      "/en-us/register-expat",
      "/en-us/register-client",
      "/en-us/login",
      "/es-es/precios",
      "/es-es/preguntas-frecuentes",
      "/es-es/contacto",
      "/es-es/como-funciona",
      "/es-es/testimonios",
      "/es-es/centro-ayuda",
      "/de-de/preise",
      "/de-de/faq",
      "/de-de/kontakt",
      "/de-de/wie-es-funktioniert",
      "/de-de/erfahrungsberichte",
      "/de-de/hilfe-center",
      "/pt-pt/precos",
      "/pt-pt/perguntas-frequentes",
      "/pt-pt/contacto",
      "/ru-ru/ceny",
      "/ru-ru/voprosy",
      "/ru-ru/kontakt",
      "/zh-cn/jiage",
      "/zh-cn/changjianwenti",
      "/ar-sa/alasear",
      "/hi-in/muulya"
    ],
    "skipThirdPartyRequests": true,
    "puppeteerArgs": ["--no-sandbox", "--disable-setuid-sandbox"],
    "puppeteerExecutablePath": null,
    "minifyHtml": {
      "collapseWhitespace": true,
      "removeComments": true
    },
    "inlineCss": true,
    "removeStyleTags": false,
    "preloadImages": false,
    "timeout": 60000,
    "cacheAjaxRequests": true
  }
}
```

### 1.3 Modification du code React

| #     | Tâche                              | Fichier        | Détail                                          |
|-------|------------------------------------|-----------------|-------------------------------------------------|
| 1.3.1 | Modifier main.tsx pour hydratation | src/main.tsx    | Détecter si pré-rendu et utiliser hydrateRoot   |
| 1.3.2 | Ajouter marqueur de rendu terminé  | src/App.tsx     | `data-react-snap-ready` attribute               |
| 1.3.3 | Émettre événement app-mounted      | src/App.tsx     | `window.dispatchEvent(new Event('app-mounted'))` |

**Code pour main.tsx :**

```tsx
import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container not found');
}

// Vérifier si c'est une page pré-rendue (react-snap)
const isPrerendered = container.hasChildNodes();

if (isPrerendered) {
  // Hydratation : réutiliser le HTML existant
  hydrateRoot(container, <App />);
} else {
  // Rendu client normal
  createRoot(container).render(<App />);
}
```

**Code à ajouter dans App.tsx :**

```tsx
import { useEffect } from 'react';

// Dans le composant App, ajouter :
useEffect(() => {
  // Signal pour react-snap que le rendu est terminé
  document.body.setAttribute('data-react-snap-ready', 'true');

  // Signal pour le loading screen
  window.dispatchEvent(new Event('app-mounted'));
}, []);
```

### 1.4 Liste complète des pages à pré-rendre (par langue)

**Pour CHAQUE langue (fr, en, es, de, pt, ru, zh, ar, hi) :**

```
Pages principales :
├── /{lang}-{country}/                    (Accueil)
├── /{lang}-{country}/tarifs              (Pricing)
├── /{lang}-{country}/faq                 (FAQ)
├── /{lang}-{country}/comment-ca-marche   (How it works)
├── /{lang}-{country}/contact             (Contact)
├── /{lang}-{country}/temoignages         (Testimonials)
├── /{lang}-{country}/centre-aide         (Help center)

Pages légales :
├── /{lang}-{country}/politique-confidentialite
├── /{lang}-{country}/cgu-clients
├── /{lang}-{country}/cgu-avocats
├── /{lang}-{country}/cgu-expatries
├── /{lang}-{country}/cookies

Pages inscription :
├── /{lang}-{country}/inscription-avocat
├── /{lang}-{country}/inscription-expat
├── /{lang}-{country}/inscription-client
├── /{lang}-{country}/connexion

TOTAL : ~15 pages × 9 langues = ~135 pages pré-rendues
```

---

## PHASE 2 : CLOUD FUNCTION (Pages dynamiques)

### 2.1 Création de la fonction

| #     | Tâche                        | Fichier                              | Détail                                         |
|-------|------------------------------|--------------------------------------|------------------------------------------------|
| 2.1.1 | Créer fichier de fonction    | functions/src/seo/dynamicRender.ts   | Nouveau fichier                                |
| 2.1.2 | Installer puppeteer-core     | functions/package.json               | `npm install puppeteer-core @sparticuz/chromium` |
| 2.1.3 | Installer types              | functions/package.json               | `npm install -D @types/puppeteer-core`         |
| 2.1.4 | Configurer la fonction       | dynamicRender.ts                     | Memory 1GB, timeout 60s, region europe-west1   |
| 2.1.5 | Implémenter détection de bot | dynamicRender.ts                     | User-agent regex pour 20+ bots                 |
| 2.1.6 | Implémenter rendu Puppeteer  | dynamicRender.ts                     | Lancer Chrome, naviguer, capturer HTML         |
| 2.1.7 | Implémenter cache mémoire    | dynamicRender.ts                     | Map avec TTL 24h                               |
| 2.1.8 | Exporter la fonction         | functions/src/index.ts               | `export { renderForBots }`                     |
| 2.1.9 | Créer trigger invalidation   | dynamicRender.ts                     | Invalider cache sur update profil              |

**Code complet pour dynamicRender.ts :**

```typescript
import * as functions from 'firebase-functions';
import * as puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Cache en mémoire
const htmlCache = new Map<string, { html: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h

// Bots à détecter
const BOT_USER_AGENTS = [
  'googlebot', 'bingbot', 'yandex', 'baiduspider', 'duckduckbot',
  'slurp', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
  'whatsapp', 'telegrambot', 'discordbot', 'gptbot', 'chatgpt',
  'claudebot', 'perplexitybot', 'applebot', 'amazonbot', 'ccbot'
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot));
}

export const renderForBots = functions
  .region('europe-west1')
  .runWith({ memory: '1GB', timeoutSeconds: 60 })
  .https.onRequest(async (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const url = `https://sos-expat.com${req.path}`;

    // Si pas un bot, rediriger vers le site normal
    if (!isBot(userAgent)) {
      res.redirect(url);
      return;
    }

    // Vérifier le cache
    const cached = htmlCache.get(req.path);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      res.set('Content-Type', 'text/html');
      res.set('X-Prerender-Cache', 'HIT');
      res.send(cached.html);
      return;
    }

    try {
      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });

      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Attendre React
      await page.waitForSelector('[data-react-snap-ready="true"]', { timeout: 10000 })
        .catch(() => page.waitForTimeout(3000));

      const html = await page.content();
      await browser.close();

      // Mettre en cache
      htmlCache.set(req.path, { html, timestamp: Date.now() });

      res.set('Content-Type', 'text/html');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(html);
    } catch (error) {
      console.error('Prerender error:', error);
      res.redirect(url);
    }
  });

// Invalider le cache quand un profil change
export const invalidateRenderCache = functions
  .region('europe-west1')
  .firestore.document('providers/{providerId}')
  .onUpdate(async (change) => {
    const provider = change.after.data();
    if (provider.slug) {
      const langs = ['fr-fr', 'en-us', 'es-es', 'de-de', 'pt-pt', 'ru-ru', 'zh-cn', 'ar-sa', 'hi-in'];
      langs.forEach(lang => htmlCache.delete(`/${lang}/${provider.slug}`));
    }
  });
```

### 2.2 Configuration Firebase Hosting

| #     | Tâche                                | Fichier         | Détail                      |
|-------|--------------------------------------|-----------------|----------------------------|
| 2.2.1 | Ajouter rewrite pour avocat-*        | firebase.json   | `/*/avocat-*/**` → fonction |
| 2.2.2 | Ajouter rewrite pour lawyer-*        | firebase.json   | `/*/lawyer-*/**` → fonction |
| 2.2.3 | Ajouter rewrite pour abogado-*       | firebase.json   | `/*/abogado-*/**` → fonction |
| 2.2.4 | Ajouter rewrite pour anwalt-*        | firebase.json   | `/*/anwalt-*/**` → fonction |
| 2.2.5 | Ajouter rewrite pour advogado-*      | firebase.json   | `/*/advogado-*/**` → fonction |
| 2.2.6 | Ajouter rewrite pour advokat-*       | firebase.json   | `/*/advokat-*/**` → fonction |
| 2.2.7 | Ajouter rewrite pour expat-*         | firebase.json   | `/*/expat-*/**` → fonction |
| 2.2.8 | Conserver fallback SPA               | firebase.json   | `**` → `/index.html`        |

**Configuration firebase.json :**

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "/*/avocat-*/**", "function": "renderForBots" },
      { "source": "/*/lawyer-*/**", "function": "renderForBots" },
      { "source": "/*/abogado-*/**", "function": "renderForBots" },
      { "source": "/*/anwalt-*/**", "function": "renderForBots" },
      { "source": "/*/advogado-*/**", "function": "renderForBots" },
      { "source": "/*/advokat-*/**", "function": "renderForBots" },
      { "source": "/*/expat-*/**", "function": "renderForBots" },
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

---

## PHASE 3 : CORRECTIONS INDEX.HTML

| #     | Tâche                        | Fichier       | Détail                                    |
|-------|------------------------------|---------------|-------------------------------------------|
| 3.1   | Corriger image OG            | index.html    | Ligne 187 : créer ou corriger référence   |
| 3.2   | Corriger GTM placeholder     | index.html    | Ligne 395 : remplacer GTM-XXXXXXX         |
| 3.3   | Corriger attribut lang       | index.html    | Ligne 2 : `lang="en"` → `lang="fr"`       |
| 3.4   | Créer og-image-1200x630.jpg  | public/       | Image 1200×630 pixels                     |

**Modifications à faire :**

```html
<!-- Ligne 2 : AVANT -->
<html lang="en">
<!-- Ligne 2 : APRÈS -->
<html lang="fr">

<!-- Ligne 187 : Vérifier que le fichier existe -->
<meta property="og:image" content="https://sos-expat.com/og-image-1200x630.jpg" />

<!-- Ligne 395 : AVANT -->
<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
<!-- Ligne 395 : APRÈS (remplacer ou supprimer) -->
<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-VOTRE-VRAI-ID"
```

---

## PHASE 4 : CONTENU NOSCRIPT ENRICHI

| #     | Tâche                      | Fichier       | Détail                              |
|-------|----------------------------|---------------|-------------------------------------|
| 4.1   | Remplacer noscript actuel  | index.html    | Lignes 494-498                      |
| 4.2   | Ajouter structure HTML     | index.html    | Header, services, navigation        |
| 4.3   | Ajouter liens de navigation| index.html    | Liens vers pages principales        |
| 4.4   | Ajouter footer             | index.html    | Contact, mentions légales           |

**Nouveau contenu noscript complet :**

```html
<noscript>
  <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: -apple-system, sans-serif;">
    <header style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #dc2626; font-size: 32px;">🆘 SOS Expat</h1>
      <p style="font-size: 18px; color: #666;">Assistance juridique 24/7 pour expatriés et voyageurs</p>
    </header>

    <main>
      <section style="margin-bottom: 30px;">
        <h2>Nos Services</h2>
        <ul style="line-height: 2;">
          <li><strong>Consultation avocat</strong> - 49€ pour 20 minutes avec un avocat spécialisé</li>
          <li><strong>Expert expatriation</strong> - 19€ pour 30 minutes avec un expert local</li>
          <li><strong>Urgences 24/7</strong> - Assistance immédiate dans 197 pays</li>
        </ul>
      </section>

      <section style="margin-bottom: 30px;">
        <h2>Couverture mondiale</h2>
        <p>197 pays couverts, 9 langues d'interface, tous les fuseaux horaires.</p>
        <p>Nos avocats parlent votre langue et connaissent la législation locale.</p>
      </section>

      <section style="margin-bottom: 30px;">
        <h2>Comment ça marche</h2>
        <ol style="line-height: 2;">
          <li>Décrivez votre situation</li>
          <li>Choisissez un avocat ou expert</li>
          <li>Payez en ligne de façon sécurisée</li>
          <li>Recevez votre consultation par téléphone ou vidéo</li>
        </ol>
      </section>

      <section style="margin-bottom: 30px;">
        <h2>Spécialités juridiques</h2>
        <p>Immigration, visas, fiscalité internationale, droit du travail, droit de la famille,
           droit immobilier, droit des affaires, droit pénal international.</p>
      </section>

      <nav style="margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <h3>Navigation</h3>
        <ul style="list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 20px;">
          <li><a href="/fr-fr">Accueil (FR)</a></li>
          <li><a href="/en-us">Home (EN)</a></li>
          <li><a href="/es-es">Inicio (ES)</a></li>
          <li><a href="/de-de">Startseite (DE)</a></li>
          <li><a href="/fr-fr/tarifs">Tarifs</a></li>
          <li><a href="/fr-fr/faq">FAQ</a></li>
          <li><a href="/fr-fr/contact">Contact</a></li>
          <li><a href="/fr-fr/inscription-avocat">Devenir avocat partenaire</a></li>
          <li><a href="/fr-fr/inscription-expat">Devenir expert expatrié</a></li>
        </ul>
      </nav>
    </main>

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666;">
      <p>© 2024 SOS Expat - <a href="mailto:contact@sos-expat.com">contact@sos-expat.com</a></p>
      <p>
        <a href="/fr-fr/politique-confidentialite">Politique de confidentialité</a> |
        <a href="/fr-fr/cgu-clients">CGU</a> |
        <a href="/fr-fr/cookies">Cookies</a>
      </p>
    </footer>
  </div>

  <div style="background: #fee2e2; color: #991b1b; padding: 20px; text-align: center; margin-top: 20px;">
    Pour une meilleure expérience, veuillez activer JavaScript dans votre navigateur.
  </div>
</noscript>
```

---

## PHASE 5 : SEO PAGES MANQUANTES

### 5.1 Ajouter SEOHead aux pages sans SEO

| #     | Page                 | Fichier                      | Action                    |
|-------|----------------------|------------------------------|---------------------------|
| 5.1.1 | HelpCenter           | src/pages/HelpCenter.tsx     | Ajouter SEOHead           |
| 5.1.2 | PrivacyPolicy        | src/pages/PrivacyPolicy.tsx  | Ajouter SEOHead           |
| 5.1.3 | TermsClients         | src/pages/TermsClients.tsx   | Ajouter SEOHead           |
| 5.1.4 | TermsExpats          | src/pages/TermsExpats.tsx    | Ajouter SEOHead           |
| 5.1.5 | TermsLawyers         | src/pages/TermsLawyers.tsx   | Ajouter SEOHead           |
| 5.1.6 | Cookies              | src/pages/Cookies.tsx        | Ajouter SEOHead           |
| 5.1.7 | TestimonialDetail    | src/pages/TestimonialDetail.tsx | Ajouter SEOHead        |

### 5.2 Ajouter noindex aux pages d'authentification

| #     | Page                 | Fichier                         | Action                    |
|-------|----------------------|---------------------------------|---------------------------|
| 5.2.1 | Login                | src/pages/Login.tsx             | SEOHead avec noindex=true |
| 5.2.2 | Register             | src/pages/Register.tsx          | SEOHead avec noindex=true |
| 5.2.3 | RegisterExpat        | src/pages/RegisterExpat.tsx     | SEOHead avec noindex=true |
| 5.2.4 | RegisterLawyer       | src/pages/RegisterLawyer.tsx    | SEOHead avec noindex=true |
| 5.2.5 | RegisterClient       | src/pages/RegisterClient.tsx    | SEOHead avec noindex=true |
| 5.2.6 | PasswordReset        | src/pages/PasswordReset.tsx     | SEOHead avec noindex=true |
| 5.2.7 | PasswordResetConfirm | src/pages/PasswordResetConfirm.tsx | SEOHead avec noindex=true |

**Template pour pages légales :**

```tsx
import SEOHead from '@/components/layout/SEOHead';

// Ajouter dans le composant :
<SEOHead
  title="[Titre] - SOS Expat"
  description="[Description de la page]"
  canonicalUrl="/[url-page]"
/>
```

**Template pour pages auth (noindex) :**

```tsx
import SEOHead from '@/components/layout/SEOHead';

// Ajouter dans le composant :
<SEOHead
  title="Connexion - SOS Expat"
  description="Connectez-vous à votre compte SOS Expat"
  noindex={true}
/>
```

---

## PHASE 6 : SCHEMAS ADDITIONNELS

### 6.1 Créer les nouveaux schemas

| #     | Schema           | Fichier                              | Détail                     |
|-------|------------------|--------------------------------------|----------------------------|
| 6.1.1 | ArticleSchema    | src/components/seo/ArticleSchema.tsx | Pour articles blog/aide    |
| 6.1.2 | ServiceSchema    | src/components/seo/ServiceSchema.tsx | Pour page tarifs           |
| 6.1.3 | FAQPageSchema    | src/components/seo/FAQPageSchema.tsx | Composant réutilisable     |

### 6.2 Mettre à jour les exports

| #     | Tâche                | Fichier                    | Détail                         |
|-------|----------------------|----------------------------|--------------------------------|
| 6.2.1 | Ajouter exports      | src/components/seo/index.ts | Exporter les 3 nouveaux schemas |

### 6.3 Intégrer les schemas dans les pages

| #     | Page         | Fichier                       | Schema à ajouter     |
|-------|--------------|-------------------------------|----------------------|
| 6.3.1 | HelpArticle  | src/pages/HelpArticle.tsx     | ArticleSchema        |
| 6.3.2 | Pricing      | src/pages/Pricing.tsx         | ServiceSchema        |

**Code ArticleSchema.tsx :**

```tsx
import { Helmet } from 'react-helmet-async';

interface ArticleSchemaProps {
  title: string;
  description: string;
  author?: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  url: string;
}

export const ArticleSchema: React.FC<ArticleSchemaProps> = ({
  title, description, author = "SOS Expat", datePublished, dateModified, image, url
}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": description,
    "author": { "@type": "Organization", "name": author },
    "publisher": {
      "@type": "Organization",
      "name": "SOS Expat",
      "logo": { "@type": "ImageObject", "url": "https://sos-expat.com/logo.png" }
    },
    "datePublished": datePublished,
    "dateModified": dateModified || datePublished,
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    ...(image && { "image": image })
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

export default ArticleSchema;
```

**Code ServiceSchema.tsx :**

```tsx
import { Helmet } from 'react-helmet-async';

interface ServiceOffer {
  name: string;
  description: string;
  price: number;
  priceCurrency: string;
  duration?: string;
}

interface ServiceSchemaProps {
  serviceName: string;
  serviceDescription: string;
  offers: ServiceOffer[];
}

export const ServiceSchema: React.FC<ServiceSchemaProps> = ({
  serviceName, serviceDescription, offers
}) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": serviceName,
    "description": serviceDescription,
    "provider": { "@type": "Organization", "name": "SOS Expat" },
    "areaServed": { "@type": "Place", "name": "Worldwide" },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Services SOS Expat",
      "itemListElement": offers.map(offer => ({
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": offer.name,
          "description": offer.description
        },
        "price": offer.price,
        "priceCurrency": offer.priceCurrency,
        ...(offer.duration && { "duration": offer.duration })
      }))
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

export default ServiceSchema;
```

---

## PHASE 7 : TRADUCTIONS SEO

### 7.1 Créer les fichiers seo.json

| #     | Langue     | Fichier                      |
|-------|------------|------------------------------|
| 7.1.1 | Français   | src/locales/fr-fr/seo.json   |
| 7.1.2 | Anglais    | src/locales/en/seo.json      |
| 7.1.3 | Espagnol   | src/locales/es-es/seo.json   |
| 7.1.4 | Allemand   | src/locales/de-de/seo.json   |
| 7.1.5 | Portugais  | src/locales/pt-pt/seo.json   |
| 7.1.6 | Russe      | src/locales/ru-ru/seo.json   |
| 7.1.7 | Chinois    | src/locales/zh-cn/seo.json   |
| 7.1.8 | Arabe      | src/locales/ar-sa/seo.json   |
| 7.1.9 | Hindi      | src/locales/hi-in/seo.json   |

### 7.2 Créer le hook useSEOTranslations

| #     | Tâche                | Fichier                          |
|-------|----------------------|----------------------------------|
| 7.2.1 | Créer le hook        | src/hooks/useSEOTranslations.ts  |

**Template seo.json (Français) :**

```json
{
  "meta": {
    "home": {
      "title": "SOS Expat - Assistance Juridique 24/7 pour Expatriés",
      "description": "Parlez à un avocat ou expert local en moins de 5 min. 197 pays, toutes langues. Assistance 24/7."
    },
    "pricing": {
      "title": "Tarifs - SOS Expat | Consultations à partir de 19€",
      "description": "Consultations juridiques : 49€/20min avocat, 19€/30min expert expatriation."
    },
    "faq": {
      "title": "FAQ - Questions Fréquentes | SOS Expat",
      "description": "Réponses aux questions sur l'expatriation, visas, fiscalité internationale."
    },
    "contact": {
      "title": "Contact - SOS Expat | Nous Contacter",
      "description": "Contactez notre équipe disponible 24/7 pour toute question."
    },
    "helpCenter": {
      "title": "Centre d'Aide - SOS Expat",
      "description": "Guides et articles pour votre expatriation."
    },
    "howItWorks": {
      "title": "Comment ça Marche - SOS Expat",
      "description": "Découvrez comment obtenir une consultation juridique en moins de 5 minutes."
    },
    "testimonials": {
      "title": "Témoignages - Avis Clients | SOS Expat",
      "description": "Avis de nos clients expatriés et voyageurs."
    },
    "privacyPolicy": {
      "title": "Politique de Confidentialité - SOS Expat",
      "description": "Comment SOS Expat protège vos données personnelles (RGPD)."
    },
    "terms": {
      "title": "CGU - SOS Expat",
      "description": "Conditions générales d'utilisation de SOS Expat."
    },
    "cookies": {
      "title": "Politique des Cookies - SOS Expat",
      "description": "Utilisation des cookies sur SOS Expat."
    }
  }
}
```

**Hook useSEOTranslations.ts :**

```tsx
import { useTranslation } from 'react-i18next';

export const useSEOTranslations = (page: string) => {
  const { t, i18n } = useTranslation('seo');

  return {
    title: t(`meta.${page}.title`),
    description: t(`meta.${page}.description`),
    locale: i18n.language
  };
};

export default useSEOTranslations;
```

---

## PHASE 8 : TESTS ET VALIDATION

### 8.1 Tests du pré-rendu

| #     | Test                           | Commande/Outil              | Résultat attendu                  |
|-------|--------------------------------|-----------------------------|---------------------------------|
| 8.1.1 | Build avec react-snap          | `npm run build`             | Pas d'erreurs                   |
| 8.1.2 | Vérifier HTML généré           | `cat dist/fr-fr/index.html` | Contenu visible, pas juste root |
| 8.1.3 | Compter les fichiers HTML      | `find dist -name "*.html"`  | ~135 fichiers                   |
| 8.1.4 | Test Cloud Function locale     | `firebase emulators:start`  | Fonction répond                 |

### 8.2 Tests de simulation de bot

| #     | Test                | Commande                                              |
|-------|---------------------|-------------------------------------------------------|
| 8.2.1 | Simuler Googlebot   | `curl -A "Googlebot" https://sos-expat.com/fr-fr`     |
| 8.2.2 | Simuler Bingbot     | `curl -A "Bingbot" https://sos-expat.com/fr-fr`       |
| 8.2.3 | Simuler GPTBot      | `curl -A "GPTBot" https://sos-expat.com/fr-fr`        |
| 8.2.4 | Simuler ClaudeBot   | `curl -A "ClaudeBot" https://sos-expat.com/fr-fr`     |

### 8.3 Tests SEO en ligne

| #     | Test              | Outil                                         | Pages à tester |
|-------|-------------------|-----------------------------------------------|----------------|
| 8.3.1 | Schema.org        | https://validator.schema.org                  | 5 pages        |
| 8.3.2 | Rich Results      | https://search.google.com/test/rich-results   | 5 pages        |
| 8.3.3 | Mobile-Friendly   | https://search.google.com/test/mobile-friendly | Home          |
| 8.3.4 | Open Graph        | https://developers.facebook.com/tools/debug/  | 3 pages        |
| 8.3.5 | Twitter Cards     | https://cards-dev.twitter.com/validator       | 3 pages        |
| 8.3.6 | Hreflang          | https://technicalseo.com/tools/hreflang/      | 3 pages        |
| 8.3.7 | PageSpeed         | https://pagespeed.web.dev/                    | Home, Pricing  |

### 8.4 Tests fonctionnels (non-régression)

| #     | Test                  | Action                                  |
|-------|-----------------------|-----------------------------------------|
| 8.4.1 | Navigation            | Parcourir toutes les pages principales  |
| 8.4.2 | Changement de langue  | Tester sur 5 pages                      |
| 8.4.3 | Formulaires           | Tester inscription, connexion           |
| 8.4.4 | Mobile                | Tester sur iPhone/Android               |
| 8.4.5 | Paiement (mode test)  | Vérifier Stripe fonctionne              |

---

## PHASE 9 : DÉPLOIEMENT ET SOUMISSION

### 9.1 Déploiement

| #     | Tâche                      | Commande                                    |
|-------|----------------------------|---------------------------------------------|
| 9.1.1 | Merge vers main            | `git checkout main && git merge feature/seo-prerender` |
| 9.1.2 | Build final                | `npm run build`                             |
| 9.1.3 | Déployer hosting           | `firebase deploy --only hosting`            |
| 9.1.4 | Déployer functions         | `firebase deploy --only functions`          |
| 9.1.5 | Vérifier en production     | Tester https://sos-expat.com                |

### 9.2 Soumission aux moteurs

| #     | Tâche                      | Outil                   | Action                        |
|-------|----------------------------|-------------------------|-------------------------------|
| 9.2.1 | Soumettre sitemap Google   | Google Search Console   | Sitemaps → Ajouter            |
| 9.2.2 | URL Inspection             | Google Search Console   | Inspecter 5 pages principales |
| 9.2.3 | Request Indexing           | Google Search Console   | Demander indexation           |
| 9.2.4 | Soumettre sitemap Bing     | Bing Webmaster Tools    | Sitemaps → Submit             |
| 9.2.5 | URL Submission Bing        | Bing Webmaster Tools    | URL Submission                |
| 9.2.6 | Vérifier IndexNow          | Logs Cloud Functions    | Vérifier les pings            |

### 9.3 Monitoring post-déploiement

| #     | Tâche                      | Fréquence   | Outil                   |
|-------|----------------------------|-------------|-------------------------|
| 9.3.1 | Vérifier erreurs           | Quotidien   | Firebase Console        |
| 9.3.2 | Vérifier couverture        | Hebdomadaire| Google Search Console   |
| 9.3.3 | Vérifier indexation        | Hebdomadaire| `site:sos-expat.com`    |
| 9.3.4 | Vérifier positions         | Hebdomadaire| Google Search Console   |

---

## PHASE 10 : SEO INTERNATIONAL (197 pays × 9 langues)

### 10.1 Vérification Hreflang (Déjà implémenté - à vérifier)

| #      | Tâche                              | Fichier                     | Détail                           |
|--------|------------------------------------|-----------------------------|----------------------------------|
| 10.1.1 | Vérifier HreflangLinks.tsx         | src/multilingual-system/... | Génère liens pour 9 langues      |
| 10.1.2 | Vérifier mapping ch → zh-Hans      | HrefLangConstants.ts        | Code chinois correct             |
| 10.1.3 | Vérifier x-default                 | HreflangLinks.tsx           | Pointe vers en-us                |
| 10.1.4 | Tester sur 5 pages                 | -                           | Valider avec hreflang checker    |

### 10.2 Sitemaps internationaux (Déjà implémenté - à vérifier)

| #      | Tâche                              | Fichier/URL                 | Détail                           |
|--------|------------------------------------|-----------------------------|----------------------------------|
| 10.2.1 | Vérifier sitemap-static.xml        | public/sitemap-static.xml   | Contient hreflang pour 9 langues |
| 10.2.2 | Vérifier sitemapProfiles           | Cloud Function              | Profils avec toutes les langues  |
| 10.2.3 | Vérifier sitemapBlog               | Cloud Function              | Articles avec toutes les langues |
| 10.2.4 | Vérifier sitemap index             | public/sitemap.xml          | Pointe vers tous les sitemaps    |

### 10.3 Soumission internationale

| #      | Tâche                              | Outil                       | Détail                           |
|--------|------------------------------------|-----------------------------|----------------------------------|
| 10.3.1 | Soumettre à Google                 | Google Search Console       | Sitemap principal                |
| 10.3.2 | Soumettre à Bing                   | Bing Webmaster Tools        | Sitemap principal                |
| 10.3.3 | Soumettre à Yandex                 | Yandex Webmaster            | Pour marché russe                |
| 10.3.4 | Soumettre à Baidu                  | Baidu Webmaster             | Pour marché chinois              |

### 10.4 Ciblage géographique (Google Search Console)

| #      | Tâche                              | Outil                       | Détail                           |
|--------|------------------------------------|-----------------------------|----------------------------------|
| 10.4.1 | Vérifier ciblage international     | Google Search Console       | Settings > International targeting |
| 10.4.2 | NE PAS cibler un seul pays         | -                           | Site mondial = pas de ciblage    |

### 10.5 Liste complète des pages à pré-rendre (135 pages)

**Français (fr-fr) - 15 pages**
```
/fr-fr
/fr-fr/tarifs
/fr-fr/faq
/fr-fr/contact
/fr-fr/comment-ca-marche
/fr-fr/temoignages
/fr-fr/centre-aide
/fr-fr/politique-confidentialite
/fr-fr/cgu-clients
/fr-fr/cgu-avocats
/fr-fr/cgu-expatries
/fr-fr/cookies
/fr-fr/inscription-avocat
/fr-fr/inscription-expat
/fr-fr/inscription-client
/fr-fr/connexion
```

**Anglais (en-us) - 15 pages**
```
/en-us
/en-us/pricing
/en-us/faq
/en-us/contact
/en-us/how-it-works
/en-us/testimonials
/en-us/help-center
/en-us/privacy-policy
/en-us/terms-clients
/en-us/terms-lawyers
/en-us/terms-expats
/en-us/cookies
/en-us/register-lawyer
/en-us/register-expat
/en-us/register-client
/en-us/login
```

**Espagnol (es-es) - 15 pages**
```
/es-es
/es-es/precios
/es-es/preguntas-frecuentes
/es-es/contacto
/es-es/como-funciona
/es-es/testimonios
/es-es/centro-ayuda
/es-es/politica-privacidad
/es-es/terminos-clientes
/es-es/terminos-abogados
/es-es/terminos-expats
/es-es/cookies
/es-es/registro-abogado
/es-es/registro-expat
/es-es/registro-cliente
/es-es/iniciar-sesion
```

**Allemand (de-de) - 15 pages**
```
/de-de
/de-de/preise
/de-de/faq
/de-de/kontakt
/de-de/wie-es-funktioniert
/de-de/erfahrungsberichte
/de-de/hilfe-center
/de-de/datenschutz
/de-de/agb-kunden
/de-de/agb-anwaelte
/de-de/agb-expats
/de-de/cookies
/de-de/anwalt-registrierung
/de-de/expat-registrierung
/de-de/kunde-registrierung
/de-de/anmelden
```

**Portugais (pt-pt) - 15 pages**
```
/pt-pt
/pt-pt/precos
/pt-pt/perguntas-frequentes
/pt-pt/contacto
/pt-pt/como-funciona
/pt-pt/testemunhos
/pt-pt/centro-ajuda
/pt-pt/politica-privacidade
/pt-pt/termos-clientes
/pt-pt/termos-advogados
/pt-pt/termos-expats
/pt-pt/cookies
/pt-pt/registo-advogado
/pt-pt/registo-expat
/pt-pt/registo-cliente
/pt-pt/entrar
```

**Russe (ru-ru) - 15 pages**
```
/ru-ru
/ru-ru/ceny
/ru-ru/voprosy
/ru-ru/kontakt
/ru-ru/kak-eto-rabotaet
/ru-ru/otzyvy
/ru-ru/centr-pomoschi
/ru-ru/politika-konfidencialnosti
/ru-ru/usloviya-klienty
/ru-ru/usloviya-advokaty
/ru-ru/usloviya-expaty
/ru-ru/cookies
/ru-ru/registracia-advokat
/ru-ru/registracia-expat
/ru-ru/registracia-klient
/ru-ru/vhod
```

**Chinois (zh-cn) - 15 pages**
```
/zh-cn
/zh-cn/jiage
/zh-cn/changjianwenti
/zh-cn/lianxi
/zh-cn/ruhe-yunzuo
/zh-cn/pingjia
/zh-cn/bangzhu-zhongxin
/zh-cn/yinsi-zhengce
/zh-cn/kehu-tiaokuan
/zh-cn/lvshi-tiaokuan
/zh-cn/yimin-tiaokuan
/zh-cn/cookies
/zh-cn/lvshi-zhuce
/zh-cn/yimin-zhuce
/zh-cn/kehu-zhuce
/zh-cn/denglu
```

**Arabe (ar-sa) - 15 pages**
```
/ar-sa
/ar-sa/alasear
/ar-sa/alasila-alshaiea
/ar-sa/alaatisal
/ar-sa/kayf-yamal
/ar-sa/alshahadat
/ar-sa/markaz-almusaeada
/ar-sa/siyasat-alkhususiya
/ar-sa/shurut-alumalaa
/ar-sa/shurut-almuhamin
/ar-sa/shurut-almughtaribin
/ar-sa/cookies
/ar-sa/tasjil-muhami
/ar-sa/tasjil-mughtarib
/ar-sa/tasjil-amil
/ar-sa/dakhul
```

**Hindi (hi-in) - 15 pages**
```
/hi-in
/hi-in/muulya
/hi-in/aksar-puuchhe-jaane-vaale-prashn
/hi-in/sampark
/hi-in/yah-kaise-kaam-karta-hai
/hi-in/prashansapatrak
/hi-in/sahaayata-kendr
/hi-in/gopaneeyata-neeti
/hi-in/graahak-sharten
/hi-in/vakeel-sharten
/hi-in/pravasi-sharten
/hi-in/cookies
/hi-in/vakeel-panjeekaran
/hi-in/pravasi-panjeekaran
/hi-in/graahak-panjeekaran
/hi-in/login
```

### 10.6 Configuration react-snap complète pour 135 pages

Ajouter dans package.json > reactSnap > include :

```json
{
  "reactSnap": {
    "include": [
      "/fr-fr", "/fr-fr/tarifs", "/fr-fr/faq", "/fr-fr/contact", "/fr-fr/comment-ca-marche",
      "/fr-fr/temoignages", "/fr-fr/centre-aide", "/fr-fr/politique-confidentialite",
      "/fr-fr/cgu-clients", "/fr-fr/cgu-avocats", "/fr-fr/cgu-expatries", "/fr-fr/cookies",
      "/fr-fr/inscription-avocat", "/fr-fr/inscription-expat", "/fr-fr/inscription-client", "/fr-fr/connexion",

      "/en-us", "/en-us/pricing", "/en-us/faq", "/en-us/contact", "/en-us/how-it-works",
      "/en-us/testimonials", "/en-us/help-center", "/en-us/privacy-policy",
      "/en-us/terms-clients", "/en-us/terms-lawyers", "/en-us/terms-expats", "/en-us/cookies",
      "/en-us/register-lawyer", "/en-us/register-expat", "/en-us/register-client", "/en-us/login",

      "/es-es", "/es-es/precios", "/es-es/preguntas-frecuentes", "/es-es/contacto", "/es-es/como-funciona",
      "/es-es/testimonios", "/es-es/centro-ayuda", "/es-es/politica-privacidad",
      "/es-es/terminos-clientes", "/es-es/terminos-abogados", "/es-es/terminos-expats", "/es-es/cookies",
      "/es-es/registro-abogado", "/es-es/registro-expat", "/es-es/registro-cliente", "/es-es/iniciar-sesion",

      "/de-de", "/de-de/preise", "/de-de/faq", "/de-de/kontakt", "/de-de/wie-es-funktioniert",
      "/de-de/erfahrungsberichte", "/de-de/hilfe-center", "/de-de/datenschutz",
      "/de-de/agb-kunden", "/de-de/agb-anwaelte", "/de-de/agb-expats", "/de-de/cookies",
      "/de-de/anwalt-registrierung", "/de-de/expat-registrierung", "/de-de/kunde-registrierung", "/de-de/anmelden",

      "/pt-pt", "/pt-pt/precos", "/pt-pt/perguntas-frequentes", "/pt-pt/contacto", "/pt-pt/como-funciona",
      "/pt-pt/testemunhos", "/pt-pt/centro-ajuda", "/pt-pt/politica-privacidade",
      "/pt-pt/termos-clientes", "/pt-pt/termos-advogados", "/pt-pt/termos-expats", "/pt-pt/cookies",
      "/pt-pt/registo-advogado", "/pt-pt/registo-expat", "/pt-pt/registo-cliente", "/pt-pt/entrar",

      "/ru-ru", "/ru-ru/ceny", "/ru-ru/voprosy", "/ru-ru/kontakt", "/ru-ru/kak-eto-rabotaet",
      "/ru-ru/otzyvy", "/ru-ru/centr-pomoschi", "/ru-ru/politika-konfidencialnosti",
      "/ru-ru/usloviya-klienty", "/ru-ru/usloviya-advokaty", "/ru-ru/usloviya-expaty", "/ru-ru/cookies",
      "/ru-ru/registracia-advokat", "/ru-ru/registracia-expat", "/ru-ru/registracia-klient", "/ru-ru/vhod",

      "/zh-cn", "/zh-cn/jiage", "/zh-cn/changjianwenti", "/zh-cn/lianxi", "/zh-cn/ruhe-yunzuo",
      "/zh-cn/pingjia", "/zh-cn/bangzhu-zhongxin", "/zh-cn/yinsi-zhengce",
      "/zh-cn/kehu-tiaokuan", "/zh-cn/lvshi-tiaokuan", "/zh-cn/yimin-tiaokuan", "/zh-cn/cookies",
      "/zh-cn/lvshi-zhuce", "/zh-cn/yimin-zhuce", "/zh-cn/kehu-zhuce", "/zh-cn/denglu",

      "/ar-sa", "/ar-sa/alasear", "/ar-sa/alasila-alshaiea", "/ar-sa/alaatisal", "/ar-sa/kayf-yamal",
      "/ar-sa/alshahadat", "/ar-sa/markaz-almusaeada", "/ar-sa/siyasat-alkhususiya",
      "/ar-sa/shurut-alumalaa", "/ar-sa/shurut-almuhamin", "/ar-sa/shurut-almughtaribin", "/ar-sa/cookies",
      "/ar-sa/tasjil-muhami", "/ar-sa/tasjil-mughtarib", "/ar-sa/tasjil-amil", "/ar-sa/dakhul",

      "/hi-in", "/hi-in/muulya", "/hi-in/aksar-puuchhe-jaane-vaale-prashn", "/hi-in/sampark",
      "/hi-in/yah-kaise-kaam-karta-hai", "/hi-in/prashansapatrak", "/hi-in/sahaayata-kendr",
      "/hi-in/gopaneeyata-neeti", "/hi-in/graahak-sharten", "/hi-in/vakeel-sharten",
      "/hi-in/pravasi-sharten", "/hi-in/cookies", "/hi-in/vakeel-panjeekaran",
      "/hi-in/pravasi-panjeekaran", "/hi-in/graahak-panjeekaran", "/hi-in/login"
    ]
  }
}
```

---

## RÉCAPITULATIF DES FICHIERS

### Fichiers à CRÉER (15 fichiers)

```
firebase/functions/src/seo/dynamicRender.ts
src/components/seo/ArticleSchema.tsx
src/components/seo/ServiceSchema.tsx
src/components/seo/FAQPageSchema.tsx
src/hooks/useSEOTranslations.ts
src/locales/fr-fr/seo.json
src/locales/en/seo.json
src/locales/es-es/seo.json
src/locales/de-de/seo.json
src/locales/pt-pt/seo.json
src/locales/ru-ru/seo.json
src/locales/zh-cn/seo.json
src/locales/ar-sa/seo.json
src/locales/hi-in/seo.json
public/og-image-1200x630.jpg (si création)
```

### Fichiers à MODIFIER (20 fichiers)

```
sos/package.json              (react-snap config)
sos/index.html                (corrections + noscript)
sos/firebase.json             (rewrites)
src/main.tsx                  (hydratation)
src/App.tsx                   (marqueur rendu)
firebase/functions/src/index.ts
firebase/functions/package.json
src/components/seo/index.ts   (exports)
src/pages/HelpCenter.tsx
src/pages/HelpArticle.tsx
src/pages/PrivacyPolicy.tsx
src/pages/TermsClients.tsx
src/pages/TermsExpats.tsx
src/pages/TermsLawyers.tsx
src/pages/Cookies.tsx
src/pages/Pricing.tsx
src/pages/Login.tsx
src/pages/Register.tsx
src/pages/RegisterExpat.tsx
src/pages/RegisterLawyer.tsx
src/pages/RegisterClient.tsx
src/pages/PasswordReset.tsx
```

---

## CHECKLIST FINALE

### Phase 1 : Pré-rendu React-Snap
- [ ] react-snap installé
- [ ] puppeteer installé
- [ ] package.json configuré avec reactSnap
- [ ] main.tsx modifié pour hydratation
- [ ] App.tsx avec marqueur de rendu
- [ ] Build génère ~135 fichiers HTML avec contenu

### Phase 2 : Cloud Function
- [ ] dynamicRender.ts créé
- [ ] puppeteer-core et @sparticuz/chromium installés
- [ ] Fonction exportée dans index.ts
- [ ] firebase.json rewrites configurés
- [ ] Fonction déployée et testée

### Phase 3 : Corrections index.html
- [ ] Image OG corrigée (fichier existe)
- [ ] GTM placeholder corrigé/supprimé
- [ ] Attribut lang="fr" défini

### Phase 4 : Contenu noscript
- [ ] Noscript enrichi avec contenu complet
- [ ] Navigation avec liens
- [ ] Informations services

### Phase 5 : SEO pages manquantes
- [ ] HelpCenter avec SEOHead
- [ ] Pages légales avec SEOHead (5 pages)
- [ ] Pages auth avec noindex (7 pages)

### Phase 6 : Schemas
- [ ] ArticleSchema créé
- [ ] ServiceSchema créé
- [ ] FAQPageSchema créé
- [ ] Exports mis à jour
- [ ] Intégrés dans les pages

### Phase 7 : Traductions SEO
- [ ] 9 fichiers seo.json créés
- [ ] Hook useSEOTranslations créé

### Phase 8 : Tests
- [ ] Build réussi avec pré-rendu
- [ ] curl -A "Googlebot" retourne du contenu
- [ ] Schemas validés
- [ ] Tests fonctionnels OK

### Phase 9 : Déploiement
- [ ] Hosting déployé
- [ ] Functions déployées
- [ ] Sitemap soumis à Google
- [ ] Sitemap soumis à Bing
- [ ] Indexation demandée

---

## PLANNING RECOMMANDÉ

```
JOUR 1 (8h)
├── 09:00-09:30 : Préparation (branche Git, backup)
├── 09:30-12:00 : Phase 1 - React-Snap installation et config
├── 12:00-13:00 : Pause
├── 13:00-15:00 : Phase 1 - Tests et debug pré-rendu
├── 15:00-18:00 : Phase 2 - Cloud Function (début)

JOUR 2 (8h)
├── 09:00-12:00 : Phase 2 - Cloud Function (fin) + tests
├── 12:00-13:00 : Pause
├── 13:00-14:00 : Phase 3 - Corrections index.html
├── 14:00-15:00 : Phase 4 - Contenu noscript
├── 15:00-18:00 : Phase 5 - SEO pages manquantes

JOUR 3 (8h)
├── 09:00-12:00 : Phase 6 - Schemas additionnels
├── 12:00-13:00 : Pause
├── 13:00-17:00 : Phase 7 - Traductions SEO (9 langues)
├── 17:00-18:00 : Revue et préparation tests

JOUR 4 (4h)
├── 09:00-11:00 : Phase 8 - Tests et validation
├── 11:00-13:00 : Phase 9 - Déploiement et soumission
├── 14:00+ : Monitoring
```

---

*Document complet généré le 12/01/2026*
*Total : ~95 tâches individuelles réparties en 9 phases*
*Temps estimé : 28 heures (4 jours de travail)*
