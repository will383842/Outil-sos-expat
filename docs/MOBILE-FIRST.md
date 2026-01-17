# Mobile-First Architecture - SOS-Expat Tools

## Vue d'ensemble

Cette documentation décrit l'architecture mobile-first implémentée pour l'application SOS-Expat Tools. L'application est conçue pour fonctionner parfaitement sur tous les appareils, avec une priorité mobile (80% des utilisateurs).

## Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Vite** | 5.4.10 | Build tool ultra-rapide |
| **React** | 18.3.1 | Framework UI |
| **TypeScript** | 5.6.3 | Typage statique |
| **Tailwind CSS** | 3.4.14 | Styles mobile-first |
| **Sentry** | 10.30.0 | Monitoring erreurs |
| **i18next** | - | 9 langues supportées |

## Architecture des Fichiers

```
src/
├── admin/
│   └── AppAdmin.tsx          # Layout principal avec navigation mobile
├── components/
│   ├── navigation/
│   │   ├── MobileDrawer.tsx  # Tiroir de navigation mobile
│   │   ├── BottomNavigation.tsx # Barre de nav fixe en bas
│   │   └── index.ts
│   ├── Chat/
│   │   ├── AIChat.tsx        # Container du chat
│   │   ├── ChatInput.tsx     # Input mobile-optimisé
│   │   └── ChatMessage.tsx   # Messages avec touch targets
│   └── ui/
│       └── touch-target.tsx  # Wrapper pour touch targets
├── hooks/
│   ├── useMediaQuery.ts      # Hook responsive (breakpoints)
│   ├── useUnreadMessages.ts  # Hook pour badges notifications
│   └── index.ts
├── styles/
│   ├── design-tokens.css     # Variables CSS
│   ├── design-tokens.ts      # Tokens TypeScript
│   └── animations.css        # Animations mobile-first
└── lib/
    └── sentry.ts             # Configuration Sentry
```

## Breakpoints

Nous utilisons une approche **mobile-first** : les styles par défaut sont pour mobile, puis on ajoute des styles pour les écrans plus grands.

| Breakpoint | Taille | Usage |
|------------|--------|-------|
| `xs` | 0px+ | Mobile portrait (défaut) |
| `sm` | 640px+ | Mobile landscape, petites tablettes |
| `md` | 768px+ | Tablettes |
| `lg` | 1024px+ | Laptops, desktops |
| `xl` | 1280px+ | Grands desktops |
| `2xl` | 1536px+ | Ultra-wide |

### Exemple d'utilisation

```tsx
// Dans le CSS (Tailwind)
<div className="px-4 sm:px-6 lg:px-8">
  {/* Padding: 16px mobile, 24px tablette, 32px desktop */}
</div>

// Dans le code
import { useBreakpoint, useIsMobile } from '@/hooks';

function MyComponent() {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const isMobileOnly = useIsMobile();

  return isMobile ? <MobileView /> : <DesktopView />;
}
```

## Navigation Mobile

### MobileDrawer

Tiroir de navigation qui glisse depuis la gauche.

```tsx
import { MobileDrawer } from '@/components/navigation';

<MobileDrawer
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  isAdmin={isAdmin}
  previewMode={previewMode}
  onTogglePreviewMode={togglePreview}
/>
```

**Fonctionnalités :**
- Slide-in animation fluide
- Avatar et info utilisateur
- Provider Switcher intégré
- Language Selector intégré
- Toggle Admin/Provider view
- Fermeture au clic backdrop
- Fermeture sur Escape
- Safe area iOS (notch)

### BottomNavigation

Barre de navigation fixe en bas de l'écran.

```tsx
import { BottomNavigation } from '@/components/navigation';

<BottomNavigation unreadMessages={unreadCount} />
```

**Fonctionnalités :**
- Visible uniquement sur mobile (< 1024px)
- Badge de notification animé
- Indicateur d'état actif
- Touch targets 44px minimum
- Safe area iOS (home indicator)
- Support i18n complet

## Touch Targets

Apple et Google recommandent des zones tactiles d'au moins **44x44 pixels**.

### Dans le CSS

```css
/* Classe utilitaire */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

### Dans Tailwind

```tsx
<button className="min-h-[44px] min-w-[44px] p-3">
  Click me
</button>
```

## Design Tokens

### CSS Variables

Les tokens sont définis dans `src/styles/design-tokens.css` et disponibles globalement.

```css
:root {
  /* Colors */
  --color-brand-primary: #dc2626;
  --color-success: #22c55e;

  /* Spacing */
  --spacing-sm: 0.5rem;
  --spacing-md: 0.75rem;

  /* Touch */
  --touch-target-min: 44px;

  /* Safe areas */
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
}
```

### TypeScript

```tsx
import { colors, spacing, breakpoints } from '@/styles/design-tokens';

// Utilisation
const primaryColor = colors.brand.primary; // '#dc2626'
const isDesktop = window.innerWidth >= breakpoints.lg; // 1024
```

## Animations

Les animations sont définies dans `src/styles/animations.css` et respectent `prefers-reduced-motion`.

### Classes disponibles

| Classe | Description |
|--------|-------------|
| `.animate-fade-in` | Fade in simple |
| `.animate-fade-in-up` | Fade in avec translation vers le haut |
| `.animate-slide-in-left` | Slide depuis la gauche |
| `.animate-slide-in-bottom` | Slide depuis le bas |
| `.animate-scale-in` | Zoom in |
| `.animate-pulse` | Pulsation (notifications) |
| `.animate-spin` | Rotation (loading) |
| `.animate-shimmer` | Effet skeleton |
| `.touch-scale-down` | Feedback tactile (scale) |
| `.stagger-animation` | Animation décalée pour listes |

### Respect de prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Sentry - Monitoring

### Configuration

Sentry est configuré dans `src/lib/sentry.ts` avec :
- Error tracking (100% en prod)
- Performance monitoring (10%)
- Session Replay sur erreur (100%)
- Filtrage intelligent des erreurs

### Utilisation

```tsx
import { captureError, setUserContext, addBreadcrumb } from '@/lib/sentry';

// À la connexion
setUserContext({
  id: user.uid,
  email: user.email,
  role: 'provider',
  providerId: activeProvider.id,
});

// Capture d'erreur
try {
  await riskyOperation();
} catch (error) {
  captureError(error, { bookingId: '123' }, { feature: 'booking' });
}

// Breadcrumbs
addBreadcrumb('Ouverture dossier', 'booking', { id: '123' });
```

### Variables d'environnement requises

```env
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_APP_VERSION=1.0.0
```

## Hooks Responsive

### useBreakpoint

```tsx
const { isMobile, isTablet, isDesktop, current, width } = useBreakpoint();
```

### useIsMobile

```tsx
const isMobile = useIsMobile(); // < 768px
```

### useIsTabletOrBelow

```tsx
const isTabletOrBelow = useIsTabletOrBelow(); // < 1024px
```

### usePrefersReducedMotion

```tsx
const prefersReducedMotion = usePrefersReducedMotion();
```

## Accessibilité Mobile

### Checklist

- [ ] Touch targets ≥ 44x44 px
- [ ] Texte minimum 16px sur mobile (évite zoom iOS)
- [ ] Contraste suffisant (4.5:1)
- [ ] Labels sur tous les inputs
- [ ] Focus visible
- [ ] Support clavier
- [ ] ARIA labels sur les icônes seules
- [ ] Support RTL (arabe)

### Font Size Minimum

```tsx
// Pour éviter le zoom automatique sur iOS
<input className="text-base" /> // 16px minimum
```

### Safe Areas iOS

```css
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.safe-area-top {
  padding-top: env(safe-area-inset-top, 0);
}
```

## Tests Mobile

### Devices à tester

| Device | Résolution | OS |
|--------|------------|-----|
| iPhone SE | 375x667 | iOS |
| iPhone 12/13 | 390x844 | iOS |
| iPhone 14 Pro Max | 430x932 | iOS |
| Samsung Galaxy S21 | 360x800 | Android |
| iPad | 768x1024 | iPadOS |

### Checklist de tests

```markdown
## Navigation
- [ ] Menu hamburger ouvre le drawer
- [ ] Fermeture au clic backdrop
- [ ] Fermeture sur Escape
- [ ] Bottom navigation visible
- [ ] Badge notifications affiché
- [ ] Navigation entre pages fluide

## Chat
- [ ] Input visible au-dessus du clavier
- [ ] Envoi message fonctionne
- [ ] Messages scrollables
- [ ] Bouton copier fonctionnel
- [ ] Timer visible

## Général
- [ ] Pas de scroll horizontal
- [ ] Texte lisible sans zoom
- [ ] Boutons cliquables facilement
- [ ] Images non déformées
- [ ] Safe area respectée
```

## Performance

### Optimisations appliquées

1. **Lazy Loading** : Toutes les pages sont chargées à la demande
2. **Code Splitting** : Séparation vendor/app
3. **Image Optimization** : WebP, lazy loading
4. **Memoization** : `memo()` sur les composants lourds
5. **CSS** : Tailwind avec purge, animations GPU

### Métriques cibles (Lighthouse)

| Métrique | Cible |
|----------|-------|
| Performance | > 90 |
| Accessibility | > 90 |
| Best Practices | > 90 |
| SEO | > 90 |

## Commandes

```bash
# Développement
npm run dev

# Build production
npm run build

# Preview du build
npm run preview

# Tests
npm run test

# Lint
npm run lint
```

## Support i18n

9 langues supportées :
- Français (FR)
- Anglais (EN)
- Allemand (DE)
- Russe (RU)
- Chinois (ZH)
- Espagnol (ES)
- Portugais (PT)
- Arabe (AR) - avec support RTL
- Hindi (HI)

Les traductions sont dans `src/i18n/locales/`.
