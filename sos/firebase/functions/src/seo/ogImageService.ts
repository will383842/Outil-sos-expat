/**
 * OG Image Service - Génère des images Open Graph dynamiques
 *
 * Crée des images optimisées pour le partage sur les réseaux sociaux
 * avec overlay texte (nom, rôle, pays) sur la photo du prestataire.
 *
 * Utilise Canvas pour la génération côté serveur.
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const REGION = 'europe-west1';

// Dimensions standard OG Image (1200x630)
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Couleurs de la marque SOS Expat
const BRAND_COLORS = {
  primary: '#DC2626', // Rouge
  secondary: '#1F2937', // Gris foncé
  text: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

// Traductions des rôles
const ROLE_LABELS: Record<string, Record<string, string>> = {
  lawyer: {
    fr: 'Avocat',
    en: 'Lawyer',
    es: 'Abogado',
    de: 'Anwalt',
    pt: 'Advogado',
    ru: 'Адвокат',
    zh: '律师',
    ar: 'محامي',
    hi: 'वकील',
  },
  expat: {
    fr: 'Expert Expatrié',
    en: 'Expat Expert',
    es: 'Experto Expatriado',
    de: 'Expat-Experte',
    pt: 'Especialista Expatriado',
    ru: 'Эксперт по экспатриации',
    zh: '外派专家',
    ar: 'خبير المغتربين',
    hi: 'प्रवासी विशेषज्ञ',
  },
};

// Traductions de "en" / "in"
const IN_LABELS: Record<string, string> = {
  fr: 'en',
  en: 'in',
  es: 'en',
  de: 'in',
  pt: 'em',
  ru: 'в',
  zh: '在',
  ar: 'في',
  hi: 'में',
};

/**
 * Génère une URL d'image OG pour un profil
 * Format: /og-image/{profileId}?lang=fr
 */
export const generateOgImage = onRequest(
  {
    region: REGION,
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
      // Extraire les paramètres
      const pathParts = req.path.split('/').filter(Boolean);
      const profileId = pathParts[pathParts.length - 1] || req.query.id as string;
      const lang = (req.query.lang as string) || 'fr';

      if (!profileId) {
        res.status(400).json({ error: 'Profile ID required' });
        return;
      }

      // Récupérer les données du profil
      const db = admin.firestore();
      const profileDoc = await db.collection('sos_profiles').doc(profileId).get();

      if (!profileDoc.exists) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      const profile = profileDoc.data()!;

      // Générer les métadonnées de l'image
      const firstName = profile.firstName || profile.fullName?.split(' ')[0] || 'Expert';
      const lastName = profile.lastName || '';
      const displayName = lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;
      const role = profile.role || profile.type || 'lawyer';
      const roleLabel = ROLE_LABELS[role]?.[lang] || ROLE_LABELS[role]?.['en'] || 'Expert';
      const country = profile.country || 'France';
      const inLabel = IN_LABELS[lang] || 'in';
      const photoUrl = profile.profilePhoto || profile.photoURL || profile.avatar;
      const rating = profile.rating || 5.0;
      const reviewCount = profile.reviewCount || 0;

      // Générer le SVG de l'image OG
      const svgContent = generateOgSvg({
        displayName,
        roleLabel,
        country,
        inLabel,
        photoUrl,
        rating,
        reviewCount,
        lang,
      });

      // Retourner l'image SVG
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // Cache 24h
      res.status(200).send(svgContent);

    } catch (error: any) {
      console.error('Error generating OG image:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Génère un SVG pour l'image OG
 * SVG est supporté par la plupart des plateformes et est léger
 */
function generateOgSvg(params: {
  displayName: string;
  roleLabel: string;
  country: string;
  inLabel: string;
  photoUrl?: string;
  rating: number;
  reviewCount: number;
  lang: string;
}): string {
  const { displayName, roleLabel, country, inLabel, photoUrl, rating, reviewCount } = params;

  // Générer les étoiles
  const stars = generateStarsSvg(rating);

  // Image de fond ou placeholder
  const backgroundImage = photoUrl
    ? `<image href="${photoUrl}" x="0" y="0" width="${OG_WIDTH}" height="${OG_HEIGHT}" preserveAspectRatio="xMidYMid slice" />`
    : `<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="${BRAND_COLORS.secondary}" />`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(0,0,0,0);stop-opacity:0" />
      <stop offset="50%" style="stop-color:rgba(0,0,0,0.3);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.8);stop-opacity:1" />
    </linearGradient>
    <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#DC2626" />
      <stop offset="100%" style="stop-color:#F97316" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.5)"/>
    </filter>
  </defs>

  <!-- Background image or placeholder -->
  ${backgroundImage}

  <!-- Gradient overlay -->
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#overlay)" />

  <!-- Top bar with logo -->
  <rect x="0" y="0" width="${OG_WIDTH}" height="80" fill="rgba(0,0,0,0.5)" />
  <text x="40" y="52" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="${BRAND_COLORS.text}">
    <tspan fill="${BRAND_COLORS.primary}">SOS</tspan> Expat &amp; Travelers
  </text>

  <!-- Main content area -->
  <g transform="translate(60, ${OG_HEIGHT - 200})">
    <!-- Role badge -->
    <rect x="0" y="0" width="${roleLabel.length * 14 + 40}" height="40" rx="20" fill="url(#brandGradient)" filter="url(#shadow)" />
    <text x="20" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="${BRAND_COLORS.text}">
      ${escapeXml(roleLabel)}
    </text>

    <!-- Name -->
    <text x="0" y="90" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="bold" fill="${BRAND_COLORS.text}" filter="url(#shadow)">
      ${escapeXml(displayName)}
    </text>

    <!-- Location -->
    <text x="0" y="130" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="rgba(255,255,255,0.9)">
      ${escapeXml(inLabel)} ${escapeXml(country)}
    </text>

    <!-- Rating -->
    <g transform="translate(0, 150)">
      ${stars}
      <text x="130" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="rgba(255,255,255,0.8)">
        ${rating.toFixed(1)} (${reviewCount} avis)
      </text>
    </g>
  </g>

  <!-- CTA hint -->
  <text x="${OG_WIDTH - 60}" y="${OG_HEIGHT - 30}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="rgba(255,255,255,0.6)">
    sos-expat.com
  </text>
</svg>`;
}

/**
 * Génère les étoiles de rating en SVG
 */
function generateStarsSvg(rating: number): string {
  let stars = '';
  const spacing = 26;

  for (let i = 0; i < 5; i++) {
    const x = i * spacing;
    const fill = i < Math.floor(rating)
      ? '#FBBF24' // Jaune pour étoile pleine
      : (i < rating ? 'url(#halfStar)' : '#6B7280'); // Demi ou vide

    stars += `
      <path d="M${x + 12},${2} L${x + 14.5},${8.5} L${x + 22},${9} L${x + 16.5},${14} L${x + 18},${21} L${x + 12},${17.5} L${x + 6},${21} L${x + 7.5},${14} L${x + 2},${9} L${x + 9.5},${8.5} Z"
            fill="${fill}" />`;
  }

  return `<g>${stars}</g>`;
}

/**
 * Échappe les caractères XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Génère l'URL de l'image OG pour un profil
 * Utilisée dans les meta tags
 */
export function getOgImageUrl(profileId: string, lang: string = 'fr'): string {
  return `https://europe-west1-sos-urgently-ac307.cloudfunctions.net/generateOgImage/${profileId}?lang=${lang}`;
}
