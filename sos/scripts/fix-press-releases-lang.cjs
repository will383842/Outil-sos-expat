/**
 * Correction linguistique des 24 fichiers HTML non-français
 * Corrige tous les fragments français oubliés dans EN, ES, DE, PT, RU, ZH, HI, AR
 *
 * Usage : node scripts/fix-press-releases-lang.cjs [--dry-run]
 *
 * Puis re-upload vers Firebase Storage + update URLs Firestore
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const HTML_DIR = path.join(__dirname, '../../communiqués de presse/SOS-Expat_HTML_27fichiers/press_kit_html');
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../../serviceAccount.json');
const STORAGE_BUCKET = 'sos-urgently-ac307.firebasestorage.app';

// ─────────────────────────────────────────────────────────────────
// TABLE DE TRADUCTIONS PAR LANGUE
// Chaque clé = texte français à remplacer (exact match HTML)
// Chaque valeur = traduction correcte
// ─────────────────────────────────────────────────────────────────

const TRANSLATIONS = {

  // ══════════════════════════════════════════════════════════════
  EN: {
    // ── Universel (tous CPs)
    'Fondateur &amp; CEO, SOS-Expat.com — Tallinn, Estonie':
      'Founder &amp; CEO, SOS-Expat.com — Tallinn, Estonia',
    'Williams Jullin — Fondateur &amp; CEO':
      'Williams Jullin — Founder &amp; CEO',
    '<div class="lbl">Site web</div>':
      '<div class="lbl">Website</div>',
    '<div class="lbl">Disponibilité</div>':
      '<div class="lbl">Availability</div>',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie — 197 pays':
      'Company registered in Estonia — Headquarters: Tallinn, Estonia — 197 countries',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie':
      'Company registered in Estonia — Headquarters: Tallinn, Estonia',

    // ── CP1
    '<span class="badge">Diffusion immédiate</span>':
      '<span class="badge">Immediate Release</span>',
    '<span class="date">5 avril 2026</span>':
      '<span class="date">April 5, 2026</span>',
    'Communiqué de presse — Grand Public &amp; Médias':
      'Press Release — General Public &amp; Media',
    '<div class="lbl">Voyageurs internationaux / an</div>':
      '<div class="lbl">International travelers / year</div>',
    '<div class="lbl">Incidents étrangers en 3 ans (ONU)</div>':
      '<div class="lbl">Foreign incidents in 3 years (UN)</div>',
    "Jusqu'à aujourd'hui.":
      'Until today.',
    '<div class="result">Assurance : formulaire en ligne, 48h</div>':
      '<div class="result">Insurance: online form, 48h</div>',
    '<h4>Je décris mon besoin</h4>':
      '<h4>I describe my need</h4>',
    '<h4>Je choisis mon expert</h4>':
      '<h4>I choose my expert</h4>',
    '<div class="loc">Bangkok — Même situation</div>':
      '<div class="loc">Bangkok — Same situation</div>',
    '<div class="loc">Medellín — Même situation</div>':
      '<div class="loc">Medellín — Same situation</div>',
    '<div class="result">✓ Aidant bilingue — 3 min 10</div>':
      '<div class="result">✓ Bilingual helper — 3 min 10</div>',
    '<div class="loc">Dubaï — Même situation</div>':
      '<div class="loc">Dubai — Same situation</div>',
    '<h4>Voyageurs &amp; vacanciers</h4>':
      '<h4>Travelers &amp; tourists</h4>',
    "<h4>Étudiants à l'étranger</h4>":
      '<h4>Students abroad</h4>',
    "<p>En programme d'échange, stage ou année universitaire — confrontés à des urgences sans réseau ni connaissance de la langue locale.</p>":
      '<p>On exchange programs, internships or gap years — facing emergencies without a local network or knowledge of the local language.</p>',
    '<h4>Investisseurs &amp; entrepreneurs</h4>':
      '<h4>Investors &amp; entrepreneurs</h4>',
    '<strong>choisit lui-même son expert</strong>':
      '<strong>chooses their own expert</strong>',

    // ── CP2
    '<span class="date">5 avril 2026 — Diffusion immédiate</span>':
      '<span class="date">April 5, 2026 — For Immediate Release</span>',
    'Communiqué de presse — Économie, Innovation &amp; Impact Social':
      'Press Release — Economy, Innovation &amp; Social Impact',
    '<td>Disponibilité 24h/7j</td>':
      '<td>Availability 24/7</td>',
    '<h3>Contact presse — Économie &amp; Innovation</h3>':
      '<h3>Press Contact — Economy &amp; Innovation</h3>',
    '<div class="kit-item">📊 Données marché complètes</div>':
      '<div class="kit-item">📊 Complete market data</div>',
    '<div class="kit-item">🖥 Démo live disponible</div>':
      '<div class="kit-item">🖥 Live demo available</div>',
    '<div class="kit-item">📸 Visuels HD</div>':
      '<div class="kit-item">📸 HD Visuals</div>',
    '<h3>Côté offre — revenus directs</h3>':
      '<h3>Supply side — direct revenue</h3>',

    // ── CP3
    '<span class="badge">Appel à partenaires</span>':
      '<span class="badge">Partner Application</span>',
    'Communiqué de presse — Partenaires &amp; Réseau Prestataires':
      'Press Release — Partners &amp; Provider Network',
    '<div class="lbl">Revenus immédiats</div>':
      '<div class="lbl">Immediate revenue</div>',
    '<div class="lbl">Liberté totale</div>':
      '<div class="lbl">Total freedom</div>',
    '<th>Élément</th>':
      '<th>Item</th>',
    '<td>Inscription</td>':
      '<td>Registration</td>',
    '<td>✓ Gratuit</td>':
      '<td>✓ Free</td>',
    '<td>Vos honoraires</td>':
      '<td>Your fees</td>',
    '<td>Paiement</td>':
      '<td>Payment</td>',
    '<td>✓ Immédiat</td>':
      '<td>✓ Immediate</td>',
    '<td>Si appel</td>':
      '<td>Per call</td>',
    '<td>Dossiers suivants</td>':
      '<td>Follow-up cases</td>',
    '<td>✓ 100% à vous</td>':
      '<td>✓ 100% yours</td>',
    '<h2>Rejoignez SOS-Expat.com</h2>':
      '<h2>Join SOS-Expat.com</h2>',
    '<div class="cta-benefit"><span class="check">✓</span>Gratuit</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Free</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Paiement immédiat</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Immediate payment</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Liberté totale</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Total freedom</div>',
    '<div class="cta-url">sos-expat.com → Devenir partenaire</div>':
      '<div class="cta-url">sos-expat.com → Become a partner</div>',
    '<h3>Contact partenariats</h3>':
      '<h3>Partnership contact</h3>',
    '<div class="lbl">Email partenariats</div>':
      '<div class="lbl">Partnership email</div>',
  },

  // ══════════════════════════════════════════════════════════════
  ES: {
    'Fondateur &amp; CEO, SOS-Expat.com — Tallinn, Estonie':
      'Fundador &amp; CEO, SOS-Expat.com — Tallin, Estonia',
    'Williams Jullin — Fondateur &amp; CEO':
      'Williams Jullin — Fundador &amp; CEO',
    '<div class="lbl">Site web</div>':
      '<div class="lbl">Sitio web</div>',
    '<div class="lbl">Disponibilité</div>':
      '<div class="lbl">Disponibilidad</div>',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie — 197 pays':
      'Empresa registrada en Estonia — Sede central: Tallin, Estonia — 197 países',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie':
      'Empresa registrada en Estonia — Sede central: Tallin, Estonia',
    '<span class="badge">Diffusion immédiate</span>':
      '<span class="badge">Distribución inmediata</span>',
    '<span class="date">5 avril 2026</span>':
      '<span class="date">5 de abril de 2026</span>',
    'Communiqué de presse — Grand Public &amp; Médias':
      'Comunicado de prensa — Gran Público &amp; Medios',
    '<div class="lbl">Voyageurs internationaux / an</div>':
      '<div class="lbl">Viajeros internacionales / año</div>',
    '<div class="lbl">Incidents étrangers en 3 ans (ONU)</div>':
      '<div class="lbl">Incidentes en el extranjero en 3 años (ONU)</div>',
    "Jusqu'à aujourd'hui.": 'Hasta hoy.',
    '<div class="result">Assurance : formulaire en ligne, 48h</div>':
      '<div class="result">Seguro: formulario en línea, 48h</div>',
    '<h4>Je décris mon besoin</h4>': '<h4>Describo mi necesidad</h4>',
    '<h4>Je choisis mon expert</h4>': '<h4>Elijo mi experto</h4>',
    '<div class="loc">Bangkok — Même situation</div>':
      '<div class="loc">Bangkok — Misma situación</div>',
    '<div class="loc">Medellín — Même situation</div>':
      '<div class="loc">Medellín — Misma situación</div>',
    '<div class="result">✓ Aidant bilingue — 3 min 10</div>':
      '<div class="result">✓ Asistente bilingüe — 3 min 10</div>',
    '<div class="loc">Dubaï — Même situation</div>':
      '<div class="loc">Dubái — Misma situación</div>',
    '<h4>Voyageurs &amp; vacanciers</h4>': '<h4>Viajeros &amp; turistas</h4>',
    "<h4>Étudiants à l'étranger</h4>": '<h4>Estudiantes en el extranjero</h4>',
    "<p>En programme d'échange, stage ou année universitaire — confrontés à des urgences sans réseau ni connaissance de la langue locale.</p>":
      '<p>En programas de intercambio, prácticas o año universitario — enfrentando emergencias sin red local ni conocimiento del idioma local.</p>',
    '<h4>Investisseurs &amp; entrepreneurs</h4>': '<h4>Inversores &amp; emprendedores</h4>',
    '<strong>choisit lui-même son expert</strong>': '<strong>elige su propio experto</strong>',
    '<span class="date">5 avril 2026 — Diffusion immédiate</span>':
      '<span class="date">5 de abril de 2026 — Distribución inmediata</span>',
    'Communiqué de presse — Économie, Innovation &amp; Impact Social':
      'Comunicado de prensa — Economía, Innovación &amp; Impacto Social',
    '<td>Disponibilité 24h/7j</td>': '<td>Disponibilidad 24/7</td>',
    '<h3>Contact presse — Économie &amp; Innovation</h3>':
      '<h3>Contacto de prensa — Economía &amp; Innovación</h3>',
    '<div class="kit-item">📊 Données marché complètes</div>':
      '<div class="kit-item">📊 Datos completos de mercado</div>',
    '<div class="kit-item">🖥 Démo live disponible</div>':
      '<div class="kit-item">🖥 Demo en vivo disponible</div>',
    '<div class="kit-item">📸 Visuels HD</div>':
      '<div class="kit-item">📸 Visuales HD</div>',
    '<h3>Côté offre — revenus directs</h3>':
      '<h3>Lado oferta — ingresos directos</h3>',
    '<span class="badge">Appel à partenaires</span>':
      '<span class="badge">Convocatoria de socios</span>',
    'Communiqué de presse — Partenaires &amp; Réseau Prestataires':
      'Comunicado de prensa — Socios &amp; Red de Proveedores',
    '<div class="lbl">Revenus immédiats</div>': '<div class="lbl">Ingresos inmediatos</div>',
    '<div class="lbl">Liberté totale</div>': '<div class="lbl">Libertad total</div>',
    '<th>Élément</th>': '<th>Elemento</th>',
    '<td>Inscription</td>': '<td>Registro</td>',
    '<td>✓ Gratuit</td>': '<td>✓ Gratuito</td>',
    '<td>Vos honoraires</td>': '<td>Sus honorarios</td>',
    '<td>Paiement</td>': '<td>Pago</td>',
    '<td>✓ Immédiat</td>': '<td>✓ Inmediato</td>',
    '<td>Si appel</td>': '<td>Por llamada</td>',
    '<td>Dossiers suivants</td>': '<td>Casos siguientes</td>',
    '<td>✓ 100% à vous</td>': '<td>✓ 100% suyo</td>',
    '<h2>Rejoignez SOS-Expat.com</h2>': '<h2>Únase a SOS-Expat.com</h2>',
    '<div class="cta-benefit"><span class="check">✓</span>Gratuit</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Gratuito</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Paiement immédiat</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Pago inmediato</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Liberté totale</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Libertad total</div>',
    '<div class="cta-url">sos-expat.com → Devenir partenaire</div>':
      '<div class="cta-url">sos-expat.com → Convertirse en socio</div>',
    '<h3>Contact partenariats</h3>': '<h3>Contacto de asociaciones</h3>',
    '<div class="lbl">Email partenariats</div>': '<div class="lbl">Email de asociaciones</div>',
  },

  // ══════════════════════════════════════════════════════════════
  DE: {
    'Fondateur &amp; CEO, SOS-Expat.com — Tallinn, Estonie':
      'Gründer &amp; CEO, SOS-Expat.com — Tallinn, Estland',
    'Williams Jullin — Fondateur &amp; CEO':
      'Williams Jullin — Gründer &amp; CEO',
    '<div class="lbl">Site web</div>': '<div class="lbl">Website</div>',
    '<div class="lbl">Disponibilité</div>': '<div class="lbl">Verfügbarkeit</div>',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie — 197 pays':
      'Eingetragenes Unternehmen in Estland — Hauptsitz: Tallinn, Estland — 197 Länder',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie':
      'Eingetragenes Unternehmen in Estland — Hauptsitz: Tallinn, Estland',
    '<span class="badge">Diffusion immédiate</span>':
      '<span class="badge">Sofortveröffentlichung</span>',
    '<span class="date">5 avril 2026</span>':
      '<span class="date">5. April 2026</span>',
    'Communiqué de presse — Grand Public &amp; Médias':
      'Pressemitteilung — Allgemeine Öffentlichkeit &amp; Medien',
    '<div class="lbl">Voyageurs internationaux / an</div>':
      '<div class="lbl">Internationale Reisende / Jahr</div>',
    '<div class="lbl">Incidents étrangers en 3 ans (ONU)</div>':
      '<div class="lbl">Auslandsvorfälle in 3 Jahren (UN)</div>',
    "Jusqu'à aujourd'hui.": 'Bis heute.',
    '<div class="result">Assurance : formulaire en ligne, 48h</div>':
      '<div class="result">Versicherung: Online-Formular, 48h</div>',
    '<h4>Je décris mon besoin</h4>': '<h4>Ich beschreibe meinen Bedarf</h4>',
    '<h4>Je choisis mon expert</h4>': '<h4>Ich wähle meinen Experten</h4>',
    '<div class="loc">Bangkok — Même situation</div>':
      '<div class="loc">Bangkok — Gleiche Situation</div>',
    '<div class="loc">Medellín — Même situation</div>':
      '<div class="loc">Medellín — Gleiche Situation</div>',
    '<div class="result">✓ Aidant bilingue — 3 min 10</div>':
      '<div class="result">✓ Zweisprachiger Helfer — 3 min 10</div>',
    '<div class="loc">Dubaï — Même situation</div>':
      '<div class="loc">Dubai — Gleiche Situation</div>',
    '<h4>Voyageurs &amp; vacanciers</h4>': '<h4>Reisende &amp; Urlauber</h4>',
    "<h4>Étudiants à l'étranger</h4>": '<h4>Studenten im Ausland</h4>',
    "<p>En programme d'échange, stage ou année universitaire — confrontés à des urgences sans réseau ni connaissance de la langue locale.</p>":
      '<p>Im Austauschprogramm, Praktikum oder Studienjahr — mit Notfällen konfrontiert, ohne lokales Netzwerk oder Sprachkenntnisse.</p>',
    '<h4>Investisseurs &amp; entrepreneurs</h4>': '<h4>Investoren &amp; Unternehmer</h4>',
    '<strong>choisit lui-même son expert</strong>': '<strong>wählt selbst seinen Experten</strong>',
    '<span class="date">5 avril 2026 — Diffusion immédiate</span>':
      '<span class="date">5. April 2026 — Sofortveröffentlichung</span>',
    'Communiqué de presse — Économie, Innovation &amp; Impact Social':
      'Pressemitteilung — Wirtschaft, Innovation &amp; Sozialer Impact',
    '<td>Disponibilité 24h/7j</td>': '<td>Verfügbarkeit 24/7</td>',
    '<h3>Contact presse — Économie &amp; Innovation</h3>':
      '<h3>Pressekontakt — Wirtschaft &amp; Innovation</h3>',
    '<div class="kit-item">📊 Données marché complètes</div>':
      '<div class="kit-item">📊 Vollständige Marktdaten</div>',
    '<div class="kit-item">🖥 Démo live disponible</div>':
      '<div class="kit-item">🖥 Live-Demo verfügbar</div>',
    '<div class="kit-item">📸 Visuels HD</div>':
      '<div class="kit-item">📸 HD-Bilder</div>',
    '<h3>Côté offre — revenus directs</h3>':
      '<h3>Angebotsseite — direkte Einnahmen</h3>',
    '<span class="badge">Appel à partenaires</span>':
      '<span class="badge">Partneraufruf</span>',
    'Communiqué de presse — Partenaires &amp; Réseau Prestataires':
      'Pressemitteilung — Partner &amp; Dienstleisternetzwerk',
    '<div class="lbl">Revenus immédiats</div>': '<div class="lbl">Sofortige Einnahmen</div>',
    '<div class="lbl">Liberté totale</div>': '<div class="lbl">Totale Freiheit</div>',
    '<th>Élément</th>': '<th>Element</th>',
    '<td>Inscription</td>': '<td>Registrierung</td>',
    '<td>✓ Gratuit</td>': '<td>✓ Kostenlos</td>',
    '<td>Vos honoraires</td>': '<td>Ihre Honorare</td>',
    '<td>Paiement</td>': '<td>Zahlung</td>',
    '<td>✓ Immédiat</td>': '<td>✓ Sofort</td>',
    '<td>Si appel</td>': '<td>Pro Anruf</td>',
    '<td>Dossiers suivants</td>': '<td>Folgeaufträge</td>',
    '<td>✓ 100% à vous</td>': '<td>✓ 100% für Sie</td>',
    '<h2>Rejoignez SOS-Expat.com</h2>': '<h2>Treten Sie SOS-Expat.com bei</h2>',
    '<div class="cta-benefit"><span class="check">✓</span>Gratuit</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Kostenlos</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Paiement immédiat</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Sofortzahlung</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Liberté totale</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Totale Freiheit</div>',
    '<div class="cta-url">sos-expat.com → Devenir partenaire</div>':
      '<div class="cta-url">sos-expat.com → Partner werden</div>',
    '<h3>Contact partenariats</h3>': '<h3>Partnerkontakt</h3>',
    '<div class="lbl">Email partenariats</div>': '<div class="lbl">Partner-E-Mail</div>',
  },

  // ══════════════════════════════════════════════════════════════
  PT: {
    'Fondateur &amp; CEO, SOS-Expat.com — Tallinn, Estonie':
      'Fundador &amp; CEO, SOS-Expat.com — Tallinn, Estônia',
    'Williams Jullin — Fondateur &amp; CEO': 'Williams Jullin — Fundador &amp; CEO',
    '<div class="lbl">Site web</div>': '<div class="lbl">Site</div>',
    '<div class="lbl">Disponibilité</div>': '<div class="lbl">Disponibilidade</div>',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie — 197 pays':
      'Empresa registrada na Estônia — Sede: Tallinn, Estônia — 197 países',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie':
      'Empresa registrada na Estônia — Sede: Tallinn, Estônia',
    '<span class="badge">Diffusion immédiate</span>':
      '<span class="badge">Distribuição imediata</span>',
    '<span class="date">5 avril 2026</span>':
      '<span class="date">5 de abril de 2026</span>',
    'Communiqué de presse — Grand Public &amp; Médias':
      'Comunicado de imprensa — Grande Público &amp; Mídia',
    '<div class="lbl">Voyageurs internationaux / an</div>':
      '<div class="lbl">Viajantes internacionais / ano</div>',
    '<div class="lbl">Incidents étrangers en 3 ans (ONU)</div>':
      '<div class="lbl">Incidentes no exterior em 3 anos (ONU)</div>',
    "Jusqu'à aujourd'hui.": 'Até hoje.',
    '<div class="result">Assurance : formulaire en ligne, 48h</div>':
      '<div class="result">Seguro: formulário online, 48h</div>',
    '<h4>Je décris mon besoin</h4>': '<h4>Descrevo minha necessidade</h4>',
    '<h4>Je choisis mon expert</h4>': '<h4>Escolho meu especialista</h4>',
    '<div class="loc">Bangkok — Même situation</div>':
      '<div class="loc">Bangkok — Mesma situação</div>',
    '<div class="loc">Medellín — Même situation</div>':
      '<div class="loc">Medellín — Mesma situação</div>',
    '<div class="result">✓ Aidant bilingue — 3 min 10</div>':
      '<div class="result">✓ Assistente bilíngue — 3 min 10</div>',
    '<div class="loc">Dubaï — Même situation</div>':
      '<div class="loc">Dubai — Mesma situação</div>',
    '<h4>Voyageurs &amp; vacanciers</h4>': '<h4>Viajantes &amp; turistas</h4>',
    "<h4>Étudiants à l'étranger</h4>": '<h4>Estudantes no exterior</h4>',
    "<p>En programme d'échange, stage ou année universitaire — confrontés à des urgences sans réseau ni connaissance de la langue locale.</p>":
      '<p>Em programas de intercâmbio, estágios ou ano universitário — enfrentando emergências sem rede local ou conhecimento do idioma local.</p>',
    '<h4>Investisseurs &amp; entrepreneurs</h4>': '<h4>Investidores &amp; empreendedores</h4>',
    '<strong>choisit lui-même son expert</strong>': '<strong>escolhe o seu próprio especialista</strong>',
    '<span class="date">5 avril 2026 — Diffusion immédiate</span>':
      '<span class="date">5 de abril de 2026 — Distribuição imediata</span>',
    'Communiqué de presse — Économie, Innovation &amp; Impact Social':
      'Comunicado de imprensa — Economia, Inovação &amp; Impacto Social',
    '<td>Disponibilité 24h/7j</td>': '<td>Disponibilidade 24/7</td>',
    '<h3>Contact presse — Économie &amp; Innovation</h3>':
      '<h3>Contato de imprensa — Economia &amp; Inovação</h3>',
    '<div class="kit-item">📊 Données marché complètes</div>':
      '<div class="kit-item">📊 Dados completos de mercado</div>',
    '<div class="kit-item">🖥 Démo live disponible</div>':
      '<div class="kit-item">🖥 Demo ao vivo disponível</div>',
    '<div class="kit-item">📸 Visuels HD</div>':
      '<div class="kit-item">📸 Visuais HD</div>',
    '<h3>Côté offre — revenus directs</h3>':
      '<h3>Lado oferta — receitas diretas</h3>',
    '<span class="badge">Appel à partenaires</span>':
      '<span class="badge">Chamada de parceiros</span>',
    'Communiqué de presse — Partenaires &amp; Réseau Prestataires':
      'Comunicado de imprensa — Parceiros &amp; Rede de Prestadores',
    '<div class="lbl">Revenus immédiats</div>': '<div class="lbl">Receitas imediatas</div>',
    '<div class="lbl">Liberté totale</div>': '<div class="lbl">Liberdade total</div>',
    '<th>Élément</th>': '<th>Elemento</th>',
    '<td>Inscription</td>': '<td>Inscrição</td>',
    '<td>✓ Gratuit</td>': '<td>✓ Gratuito</td>',
    '<td>Vos honoraires</td>': '<td>Seus honorários</td>',
    '<td>Paiement</td>': '<td>Pagamento</td>',
    '<td>✓ Immédiat</td>': '<td>✓ Imediato</td>',
    '<td>Si appel</td>': '<td>Por chamada</td>',
    '<td>Dossiers suivants</td>': '<td>Processos seguintes</td>',
    '<td>✓ 100% à vous</td>': '<td>✓ 100% seu</td>',
    '<h2>Rejoignez SOS-Expat.com</h2>': '<h2>Junte-se ao SOS-Expat.com</h2>',
    '<div class="cta-benefit"><span class="check">✓</span>Gratuit</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Gratuito</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Paiement immédiat</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Pagamento imediato</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Liberté totale</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Liberdade total</div>',
    '<div class="cta-url">sos-expat.com → Devenir partenaire</div>':
      '<div class="cta-url">sos-expat.com → Tornar-se parceiro</div>',
    '<h3>Contact partenariats</h3>': '<h3>Contato de parcerias</h3>',
    '<div class="lbl">Email partenariats</div>': '<div class="lbl">Email de parcerias</div>',
  },

  // ══════════════════════════════════════════════════════════════
  RU: {
    'Fondateur &amp; CEO, SOS-Expat.com — Tallinn, Estonie':
      'Основатель &amp; CEO, SOS-Expat.com — Таллин, Эстония',
    'Williams Jullin — Fondateur &amp; CEO': 'Williams Jullin — Основатель &amp; CEO',
    '<div class="lbl">Site web</div>': '<div class="lbl">Веб-сайт</div>',
    '<div class="lbl">Disponibilité</div>': '<div class="lbl">Доступность</div>',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie — 197 pays':
      'Компания зарегистрирована в Эстонии — Головной офис: Таллин, Эстония — 197 стран',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie':
      'Компания зарегистрирована в Эстонии — Головной офис: Таллин, Эстония',
    '<span class="badge">Diffusion immédiate</span>':
      '<span class="badge">Немедленное распространение</span>',
    '<span class="date">5 avril 2026</span>':
      '<span class="date">5 апреля 2026</span>',
    'Communiqué de presse — Grand Public &amp; Médias':
      'Пресс-релиз — Широкая публика &amp; СМИ',
    '<div class="lbl">Voyageurs internationaux / an</div>':
      '<div class="lbl">Международных туристов / год</div>',
    '<div class="lbl">Incidents étrangers en 3 ans (ONU)</div>':
      '<div class="lbl">Инцидентов за рубежом за 3 года (ООН)</div>',
    "Jusqu'à aujourd'hui.": 'До сегодняшнего дня.',
    '<div class="result">Assurance : formulaire en ligne, 48h</div>':
      '<div class="result">Страховка: онлайн-форма, 48ч</div>',
    '<h4>Je décris mon besoin</h4>': '<h4>Я описываю свою потребность</h4>',
    '<h4>Je choisis mon expert</h4>': '<h4>Я выбираю своего эксперта</h4>',
    '<div class="loc">Bangkok — Même situation</div>':
      '<div class="loc">Бангкок — Та же ситуация</div>',
    '<div class="loc">Medellín — Même situation</div>':
      '<div class="loc">Медельин — Та же ситуация</div>',
    '<div class="result">✓ Aidant bilingue — 3 min 10</div>':
      '<div class="result">✓ Двуязычный помощник — 3 мин 10</div>',
    '<div class="loc">Dubaï — Même situation</div>':
      '<div class="loc">Дубай — Та же ситуация</div>',
    '<h4>Voyageurs &amp; vacanciers</h4>': '<h4>Путешественники &amp; туристы</h4>',
    "<h4>Étudiants à l'étranger</h4>": '<h4>Студенты за рубежом</h4>',
    "<p>En programme d'échange, stage ou année universitaire — confrontés à des urgences sans réseau ni connaissance de la langue locale.</p>":
      '<p>В программах обмена, стажировках или учебном году — сталкивающиеся с чрезвычайными ситуациями без местной сети или знания местного языка.</p>',
    '<h4>Investisseurs &amp; entrepreneurs</h4>': '<h4>Инвесторы &amp; предприниматели</h4>',
    '<strong>choisit lui-même son expert</strong>': '<strong>сам выбирает своего эксперта</strong>',
    '<span class="date">5 avril 2026 — Diffusion immédiate</span>':
      '<span class="date">5 апреля 2026 — Для немедленного распространения</span>',
    'Communiqué de presse — Économie, Innovation &amp; Impact Social':
      'Пресс-релиз — Экономика, Инновации &amp; Социальное воздействие',
    '<td>Disponibilité 24h/7j</td>': '<td>Доступность 24/7</td>',
    '<h3>Contact presse — Économie &amp; Innovation</h3>':
      '<h3>Контакты для прессы — Экономика &amp; Инновации</h3>',
    '<div class="kit-item">📊 Données marché complètes</div>':
      '<div class="kit-item">📊 Полные данные рынка</div>',
    '<div class="kit-item">🖥 Démo live disponible</div>':
      '<div class="kit-item">🖥 Живая демо доступна</div>',
    '<div class="kit-item">📸 Visuels HD</div>':
      '<div class="kit-item">📸 Фото в HD</div>',
    '<h3>Côté offre — revenus directs</h3>':
      '<h3>Сторона предложения — прямой доход</h3>',
    '<span class="badge">Appel à partenaires</span>':
      '<span class="badge">Набор партнёров</span>',
    'Communiqué de presse — Partenaires &amp; Réseau Prestataires':
      'Пресс-релиз — Партнёры &amp; Сеть поставщиков',
    '<div class="lbl">Revenus immédiats</div>': '<div class="lbl">Немедленный доход</div>',
    '<div class="lbl">Liberté totale</div>': '<div class="lbl">Полная свобода</div>',
    '<th>Élément</th>': '<th>Элемент</th>',
    '<td>Inscription</td>': '<td>Регистрация</td>',
    '<td>✓ Gratuit</td>': '<td>✓ Бесплатно</td>',
    '<td>Vos honoraires</td>': '<td>Ваши гонорары</td>',
    '<td>Paiement</td>': '<td>Оплата</td>',
    '<td>✓ Immédiat</td>': '<td>✓ Мгновенно</td>',
    '<td>Si appel</td>': '<td>За звонок</td>',
    '<td>Dossiers suivants</td>': '<td>Последующие дела</td>',
    '<td>✓ 100% à vous</td>': '<td>✓ 100% ваши</td>',
    '<h2>Rejoignez SOS-Expat.com</h2>': '<h2>Присоединяйтесь к SOS-Expat.com</h2>',
    '<div class="cta-benefit"><span class="check">✓</span>Gratuit</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Бесплатно</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Paiement immédiat</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Мгновенная оплата</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Liberté totale</div>':
      '<div class="cta-benefit"><span class="check">✓</span>Полная свобода</div>',
    '<div class="cta-url">sos-expat.com → Devenir partenaire</div>':
      '<div class="cta-url">sos-expat.com → Стать партнёром</div>',
    '<h3>Contact partenariats</h3>': '<h3>Контакты по партнёрству</h3>',
    '<div class="lbl">Email partenariats</div>': '<div class="lbl">Email по партнёрству</div>',
  },

  // ══════════════════════════════════════════════════════════════
  ZH: {
    'Fondateur &amp; CEO, SOS-Expat.com — Tallinn, Estonie':
      '创始人 &amp; CEO，SOS-Expat.com — 爱沙尼亚塔林',
    'Williams Jullin — Fondateur &amp; CEO': 'Williams Jullin — 创始人 &amp; CEO',
    '<div class="lbl">Site web</div>': '<div class="lbl">网站</div>',
    '<div class="lbl">Disponibilité</div>': '<div class="lbl">可用性</div>',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie — 197 pays':
      '注册于爱沙尼亚 — 总部：爱沙尼亚塔林 — 197个国家',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie':
      '注册于爱沙尼亚 — 总部：爱沙尼亚塔林',
    '<span class="badge">Diffusion immédiate</span>':
      '<span class="badge">立即发布</span>',
    '<span class="date">5 avril 2026</span>':
      '<span class="date">2026年4月5日</span>',
    'Communiqué de presse — Grand Public &amp; Médias':
      '新闻稿 — 大众公众 &amp; 媒体',
    '<div class="lbl">Voyageurs internationaux / an</div>':
      '<div class="lbl">国际旅行者 / 年</div>',
    '<div class="lbl">Incidents étrangers en 3 ans (ONU)</div>':
      '<div class="lbl">3年内海外事故（联合国）</div>',
    "Jusqu'à aujourd'hui.": '直到今天。',
    '<div class="result">Assurance : formulaire en ligne, 48h</div>':
      '<div class="result">保险：在线表格，48小时</div>',
    '<h4>Je décris mon besoin</h4>': '<h4>我描述我的需求</h4>',
    '<h4>Je choisis mon expert</h4>': '<h4>我选择我的专家</h4>',
    '<div class="loc">Bangkok — Même situation</div>':
      '<div class="loc">曼谷 — 相同情况</div>',
    '<div class="loc">Medellín — Même situation</div>':
      '<div class="loc">麦德林 — 相同情况</div>',
    '<div class="result">✓ Aidant bilingue — 3 min 10</div>':
      '<div class="result">✓ 双语助手 — 3分10秒</div>',
    '<div class="loc">Dubaï — Même situation</div>':
      '<div class="loc">迪拜 — 相同情况</div>',
    '<h4>Voyageurs &amp; vacanciers</h4>': '<h4>旅行者 &amp; 度假者</h4>',
    "<h4>Étudiants à l'étranger</h4>": '<h4>海外留学生</h4>',
    "<p>En programme d'échange, stage ou année universitaire — confrontés à des urgences sans réseau ni connaissance de la langue locale.</p>":
      '<p>参加交流项目、实习或留学期间——在没有当地网络或语言知识的情况下面临紧急情况。</p>',
    '<h4>Investisseurs &amp; entrepreneurs</h4>': '<h4>投资者 &amp; 企业家</h4>',
    '<strong>choisit lui-même son expert</strong>': '<strong>自己选择专家</strong>',
    '<span class="date">5 avril 2026 — Diffusion immédiate</span>':
      '<span class="date">2026年4月5日 — 立即发布</span>',
    'Communiqué de presse — Économie, Innovation &amp; Impact Social':
      '新闻稿 — 经济、创新 &amp; 社会影响',
    '<td>Disponibilité 24h/7j</td>': '<td>全天候可用</td>',
    '<h3>Contact presse — Économie &amp; Innovation</h3>':
      '<h3>新闻联系 — 经济 &amp; 创新</h3>',
    '<div class="kit-item">📊 Données marché complètes</div>':
      '<div class="kit-item">📊 完整市场数据</div>',
    '<div class="kit-item">🖥 Démo live disponible</div>':
      '<div class="kit-item">🖥 现场演示可用</div>',
    '<div class="kit-item">📸 Visuels HD</div>':
      '<div class="kit-item">📸 高清图片</div>',
    '<h3>Côté offre — revenus directs</h3>':
      '<h3>供给侧 — 直接收入</h3>',
    '<span class="badge">Appel à partenaires</span>':
      '<span class="badge">合作伙伴招募</span>',
    'Communiqué de presse — Partenaires &amp; Réseau Prestataires':
      '新闻稿 — 合作伙伴 &amp; 服务商网络',
    '<div class="lbl">Revenus immédiats</div>': '<div class="lbl">即时收入</div>',
    '<div class="lbl">Liberté totale</div>': '<div class="lbl">完全自由</div>',
    '<th>Élément</th>': '<th>项目</th>',
    '<td>Inscription</td>': '<td>注册</td>',
    '<td>✓ Gratuit</td>': '<td>✓ 免费</td>',
    '<td>Vos honoraires</td>': '<td>您的收费</td>',
    '<td>Paiement</td>': '<td>付款</td>',
    '<td>✓ Immédiat</td>': '<td>✓ 即时</td>',
    '<td>Si appel</td>': '<td>每次通话</td>',
    '<td>Dossiers suivants</td>': '<td>后续案件</td>',
    '<td>✓ 100% à vous</td>': '<td>✓ 100% 属于您</td>',
    '<h2>Rejoignez SOS-Expat.com</h2>': '<h2>加入 SOS-Expat.com</h2>',
    '<div class="cta-benefit"><span class="check">✓</span>Gratuit</div>':
      '<div class="cta-benefit"><span class="check">✓</span>免费</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Paiement immédiat</div>':
      '<div class="cta-benefit"><span class="check">✓</span>即时付款</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Liberté totale</div>':
      '<div class="cta-benefit"><span class="check">✓</span>完全自由</div>',
    '<div class="cta-url">sos-expat.com → Devenir partenaire</div>':
      '<div class="cta-url">sos-expat.com → 成为合作伙伴</div>',
    '<h3>Contact partenariats</h3>': '<h3>合作联系</h3>',
    '<div class="lbl">Email partenariats</div>': '<div class="lbl">合作邮箱</div>',
  },

  // ══════════════════════════════════════════════════════════════
  HI: {
    'Fondateur &amp; CEO, SOS-Expat.com — Tallinn, Estonie':
      'संस्थापक &amp; CEO, SOS-Expat.com — टालिन, एस्टोनिया',
    'Williams Jullin — Fondateur &amp; CEO': 'Williams Jullin — संस्थापक &amp; CEO',
    '<div class="lbl">Site web</div>': '<div class="lbl">वेबसाइट</div>',
    '<div class="lbl">Disponibilité</div>': '<div class="lbl">उपलब्धता</div>',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie — 197 pays':
      'एस्टोनिया में पंजीकृत — मुख्यालय: टालिन, एस्टोनिया — 197 देश',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie':
      'एस्टोनिया में पंजीकृत — मुख्यालय: टालिन, एस्टोनिया',
    '<span class="badge">Diffusion immédiate</span>':
      '<span class="badge">तत्काल विज्ञप्ति</span>',
    '<span class="date">5 avril 2026</span>':
      '<span class="date">5 अप्रैल 2026</span>',
    'Communiqué de presse — Grand Public &amp; Médias':
      'प्रेस विज्ञप्ति — आम जनता &amp; मीडिया',
    '<div class="lbl">Voyageurs internationaux / an</div>':
      '<div class="lbl">अंतर्राष्ट्रीय यात्री / वर्ष</div>',
    '<div class="lbl">Incidents étrangers en 3 ans (ONU)</div>':
      '<div class="lbl">3 वर्षों में विदेशी घटनाएं (संयुक्त राष्ट्र)</div>',
    "Jusqu'à aujourd'hui.": 'आज तक।',
    '<div class="result">Assurance : formulaire en ligne, 48h</div>':
      '<div class="result">बीमा: ऑनलाइन फॉर्म, 48 घंटे</div>',
    '<h4>Je décris mon besoin</h4>': '<h4>मैं अपनी जरूरत बताता हूं</h4>',
    '<h4>Je choisis mon expert</h4>': '<h4>मैं अपना विशेषज्ञ चुनता हूं</h4>',
    '<div class="loc">Bangkok — Même situation</div>':
      '<div class="loc">बैंकॉक — वही स्थिति</div>',
    '<div class="loc">Medellín — Même situation</div>':
      '<div class="loc">मेडेलिन — वही स्थिति</div>',
    '<div class="result">✓ Aidant bilingue — 3 min 10</div>':
      '<div class="result">✓ द्विभाषी सहायक — 3 मिनट 10</div>',
    '<div class="loc">Dubaï — Même situation</div>':
      '<div class="loc">दुबई — वही स्थिति</div>',
    '<h4>Voyageurs &amp; vacanciers</h4>': '<h4>यात्री &amp; पर्यटक</h4>',
    "<h4>Étudiants à l'étranger</h4>": '<h4>विदेश में छात्र</h4>',
    "<p>En programme d'échange, stage ou année universitaire — confrontés à des urgences sans réseau ni connaissance de la langue locale.</p>":
      '<p>विनिमय कार्यक्रमों, इंटर्नशिप या विश्वविद्यालय वर्ष में — स्थानीय नेटवर्क या भाषा ज्ञान के बिना आपात स्थितियों का सामना करना।</p>',
    '<h4>Investisseurs &amp; entrepreneurs</h4>': '<h4>निवेशक &amp; उद्यमी</h4>',
    '<strong>choisit lui-même son expert</strong>': '<strong>स्वयं अपना विशेषज्ञ चुनता है</strong>',
    '<span class="date">5 avril 2026 — Diffusion immédiate</span>':
      '<span class="date">5 अप्रैल 2026 — तत्काल विज्ञप्ति</span>',
    'Communiqué de presse — Économie, Innovation &amp; Impact Social':
      'प्रेस विज्ञप्ति — अर्थव्यवस्था, नवाचार &amp; सामाजिक प्रभाव',
    '<td>Disponibilité 24h/7j</td>': '<td>24/7 उपलब्ध</td>',
    '<h3>Contact presse — Économie &amp; Innovation</h3>':
      '<h3>प्रेस संपर्क — अर्थव्यवस्था &amp; नवाचार</h3>',
    '<div class="kit-item">📊 Données marché complètes</div>':
      '<div class="kit-item">📊 पूर्ण बाज़ार डेटा</div>',
    '<div class="kit-item">🖥 Démo live disponible</div>':
      '<div class="kit-item">🖥 लाइव डेमो उपलब्ध</div>',
    '<div class="kit-item">📸 Visuels HD</div>':
      '<div class="kit-item">📸 HD तस्वीरें</div>',
    '<h3>Côté offre — revenus directs</h3>':
      '<h3>आपूर्ति पक्ष — प्रत्यक्ष आय</h3>',
    '<span class="badge">Appel à partenaires</span>':
      '<span class="badge">साझेदार आमंत्रण</span>',
    'Communiqué de presse — Partenaires &amp; Réseau Prestataires':
      'प्रेस विज्ञप्ति — साझेदार &amp; सेवा प्रदाता नेटवर्क',
    '<div class="lbl">Revenus immédiats</div>': '<div class="lbl">तत्काल आय</div>',
    '<div class="lbl">Liberté totale</div>': '<div class="lbl">पूर्ण स्वतंत्रता</div>',
    '<th>Élément</th>': '<th>तत्व</th>',
    '<td>Inscription</td>': '<td>पंजीकरण</td>',
    '<td>✓ Gratuit</td>': '<td>✓ निःशुल्क</td>',
    '<td>Vos honoraires</td>': '<td>आपकी फीस</td>',
    '<td>Paiement</td>': '<td>भुगतान</td>',
    '<td>✓ Immédiat</td>': '<td>✓ तत्काल</td>',
    '<td>Si appel</td>': '<td>प्रति कॉल</td>',
    '<td>Dossiers suivants</td>': '<td>बाद के मामले</td>',
    '<td>✓ 100% à vous</td>': '<td>✓ 100% आपका</td>',
    '<h2>Rejoignez SOS-Expat.com</h2>': '<h2>SOS-Expat.com से जुड़ें</h2>',
    '<div class="cta-benefit"><span class="check">✓</span>Gratuit</div>':
      '<div class="cta-benefit"><span class="check">✓</span>निःशुल्क</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Paiement immédiat</div>':
      '<div class="cta-benefit"><span class="check">✓</span>तत्काल भुगतान</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Liberté totale</div>':
      '<div class="cta-benefit"><span class="check">✓</span>पूर्ण स्वतंत्रता</div>',
    '<div class="cta-url">sos-expat.com → Devenir partenaire</div>':
      '<div class="cta-url">sos-expat.com → साझेदार बनें</div>',
    '<h3>Contact partenariats</h3>': '<h3>साझेदारी संपर्क</h3>',
    '<div class="lbl">Email partenariats</div>': '<div class="lbl">साझेदारी ईमेल</div>',
  },

  // ══════════════════════════════════════════════════════════════
  AR: {
    'Fondateur &amp; CEO, SOS-Expat.com — Tallinn, Estonie':
      'المؤسس &amp; الرئيس التنفيذي، SOS-Expat.com — تالين، إستونيا',
    'Williams Jullin — Fondateur &amp; CEO':
      'Williams Jullin — المؤسس &amp; الرئيس التنفيذي',
    '<div class="lbl">Site web</div>': '<div class="lbl">الموقع الإلكتروني</div>',
    '<div class="lbl">Disponibilité</div>': '<div class="lbl">التوفر</div>',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie — 197 pays':
      'شركة مسجلة في إستونيا — المقر الرئيسي: تالين، إستونيا — 197 دولة',
    'Société enregistrée en Estonie — Siège social : Tallinn, Estonie':
      'شركة مسجلة في إستونيا — المقر الرئيسي: تالين، إستونيا',
    '<span class="badge">Diffusion immédiate</span>':
      '<span class="badge">للنشر الفوري</span>',
    '<span class="date">5 avril 2026</span>':
      '<span class="date">5 أبريل 2026</span>',
    'Communiqué de presse — Grand Public &amp; Médias':
      'بيان صحفي — عموم الجمهور &amp; الإعلام',
    '<div class="lbl">Voyageurs internationaux / an</div>':
      '<div class="lbl">مسافرون دوليون / سنة</div>',
    '<div class="lbl">Incidents étrangers en 3 ans (ONU)</div>':
      '<div class="lbl">حوادث خارجية في 3 سنوات (الأمم المتحدة)</div>',
    "Jusqu'à aujourd'hui.": 'حتى اليوم.',
    '<div class="result">Assurance : formulaire en ligne, 48h</div>':
      '<div class="result">التأمين: نموذج إلكتروني، 48 ساعة</div>',
    '<h4>Je décris mon besoin</h4>': '<h4>أصف حاجتي</h4>',
    '<h4>Je choisis mon expert</h4>': '<h4>أختار خبيري</h4>',
    '<div class="loc">Bangkok — Même situation</div>':
      '<div class="loc">بانكوك — نفس الموقف</div>',
    '<div class="loc">Medellín — Même situation</div>':
      '<div class="loc">ميديين — نفس الموقف</div>',
    '<div class="result">✓ Aidant bilingue — 3 min 10</div>':
      '<div class="result">✓ مساعد ثنائي اللغة — 3 د 10</div>',
    '<div class="loc">Dubaï — Même situation</div>':
      '<div class="loc">دبي — نفس الموقف</div>',
    '<h4>Voyageurs &amp; vacanciers</h4>': '<h4>المسافرون &amp; السياح</h4>',
    "<h4>Étudiants à l'étranger</h4>": '<h4>الطلاب في الخارج</h4>',
    "<p>En programme d'échange, stage ou année universitaire — confrontés à des urgences sans réseau ni connaissance de la langue locale.</p>":
      '<p>في برامج التبادل أو التدريب أو السنة الجامعية — يواجهون حالات طوارئ دون شبكة محلية أو معرفة باللغة المحلية.</p>',
    '<h4>Investisseurs &amp; entrepreneurs</h4>': '<h4>المستثمرون &amp; رواد الأعمال</h4>',
    '<strong>choisit lui-même son expert</strong>': '<strong>يختار خبيره بنفسه</strong>',
    '<span class="date">5 avril 2026 — Diffusion immédiate</span>':
      '<span class="date">5 أبريل 2026 — للنشر الفوري</span>',
    'Communiqué de presse — Économie, Innovation &amp; Impact Social':
      'بيان صحفي — الاقتصاد، الابتكار &amp; التأثير الاجتماعي',
    '<td>Disponibilité 24h/7j</td>': '<td>التوفر 24/7</td>',
    '<h3>Contact presse — Économie &amp; Innovation</h3>':
      '<h3>الاتصال الصحفي — الاقتصاد &amp; الابتكار</h3>',
    '<div class="kit-item">📊 Données marché complètes</div>':
      '<div class="kit-item">📊 بيانات السوق الكاملة</div>',
    '<div class="kit-item">🖥 Démo live disponible</div>':
      '<div class="kit-item">🖥 عرض توضيحي مباشر متاح</div>',
    '<div class="kit-item">📸 Visuels HD</div>':
      '<div class="kit-item">📸 صور عالية الدقة</div>',
    '<h3>Côté offre — revenus directs</h3>':
      '<h3>جانب العرض — دخل مباشر</h3>',
    '<span class="badge">Appel à partenaires</span>':
      '<span class="badge">دعوة للشركاء</span>',
    'Communiqué de presse — Partenaires &amp; Réseau Prestataires':
      'بيان صحفي — الشركاء &amp; شبكة مزودي الخدمة',
    '<div class="lbl">Revenus immédiats</div>': '<div class="lbl">دخل فوري</div>',
    '<div class="lbl">Liberté totale</div>': '<div class="lbl">حرية كاملة</div>',
    '<th>Élément</th>': '<th>العنصر</th>',
    '<td>Inscription</td>': '<td>التسجيل</td>',
    '<td>✓ Gratuit</td>': '<td>✓ مجاني</td>',
    '<td>Vos honoraires</td>': '<td>أتعابك</td>',
    '<td>Paiement</td>': '<td>الدفع</td>',
    '<td>✓ Immédiat</td>': '<td>✓ فوري</td>',
    '<td>Si appel</td>': '<td>لكل مكالمة</td>',
    '<td>Dossiers suivants</td>': '<td>الملفات اللاحقة</td>',
    '<td>✓ 100% à vous</td>': '<td>✓ 100% لك</td>',
    '<h2>Rejoignez SOS-Expat.com</h2>': '<h2>انضم إلى SOS-Expat.com</h2>',
    '<div class="cta-benefit"><span class="check">✓</span>Gratuit</div>':
      '<div class="cta-benefit"><span class="check">✓</span>مجاني</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Paiement immédiat</div>':
      '<div class="cta-benefit"><span class="check">✓</span>دفع فوري</div>',
    '<div class="cta-benefit"><span class="check">✓</span>Liberté totale</div>':
      '<div class="cta-benefit"><span class="check">✓</span>حرية كاملة</div>',
    '<div class="cta-url">sos-expat.com → Devenir partenaire</div>':
      '<div class="cta-url">sos-expat.com → أصبح شريكاً</div>',
    '<h3>Contact partenariats</h3>': '<h3>اتصال الشراكة</h3>',
    '<div class="lbl">Email partenariats</div>': '<div class="lbl">بريد الشراكة</div>',
  },
};

// Mapping suffixe fichier → clé dans TRANSLATIONS
const LANG_MAP = { EN: 'EN', ES: 'ES', DE: 'DE', PT: 'PT', RU: 'RU', ZH: 'ZH', HI: 'HI', AR: 'AR' };
const LANG_CODE_MAP = { EN: 'en', ES: 'es', DE: 'de', PT: 'pt', RU: 'ru', ZH: 'ch', HI: 'hi', AR: 'ar' };

const COMMUNIQUES = [
  { key: 'CP1', prefix: 'SOS-Expat_CP1_Grand_Public' },
  { key: 'CP2', prefix: 'SOS-Expat_CP2_Economie_Innovation' },
  { key: 'CP3', prefix: 'SOS-Expat_CP3_Partenaires' },
];

// IDs Firestore des documents créés par import-press-releases.cjs
const FIRESTORE_IDS = {
  CP1: 'uikhjACKxs078QrHHyps',
  CP2: 'kEo4A0SnJPPxf7lBhXZC',
  CP3: 'hIODtFZQYzFLhVpvEduS',
};

// ─────────────────────────────────────────────────────────────────
// FIREBASE INIT
// ─────────────────────────────────────────────────────────────────

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ serviceAccount.json introuvable');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
  storageBucket: STORAGE_BUCKET,
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

// ─────────────────────────────────────────────────────────────────
// CORRECTION HTML
// ─────────────────────────────────────────────────────────────────

function applyTranslations(html, translations) {
  let result = html;
  let count = 0;
  for (const [fr, translated] of Object.entries(translations)) {
    if (result.includes(fr)) {
      result = result.split(fr).join(translated);
      count++;
    }
  }
  return { html: result, count };
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   CORRECTION LINGUISTIQUE — 24 fichiers HTML                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  if (DRY_RUN) console.log('\n⚠️  MODE DRY-RUN\n');

  const newHtmlUrls = {
    CP1: {}, CP2: {}, CP3: {}
  };

  let totalFixes = 0;
  let totalFiles = 0;

  for (const { key, prefix } of COMMUNIQUES) {
    const docId = FIRESTORE_IDS[key];
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📰 ${key} (Firestore: ${docId})`);
    console.log(`${'─'.repeat(60)}`);

    for (const [fileLang, transKey] of Object.entries(LANG_MAP)) {
      const langCode = LANG_CODE_MAP[fileLang];
      const filename = `${prefix}_${fileLang}.html`;
      const filepath = path.join(HTML_DIR, filename);

      if (!fs.existsSync(filepath)) {
        console.warn(`  ⚠️  [${fileLang}] Fichier manquant`);
        continue;
      }

      const original = fs.readFileSync(filepath, 'utf8');
      const translations = TRANSLATIONS[transKey];
      const { html: corrected, count } = applyTranslations(original, translations);

      console.log(`  [${fileLang}→${langCode}] ${count} correction${count !== 1 ? 's' : ''} appliquée${count !== 1 ? 's' : ''}`);

      if (count === 0) {
        // Récupérer l'URL existante
        const storageRef = bucket.file(`press/releases/${docId}/html/${langCode}.html`);
        try {
          const [url] = await storageRef.getSignedUrl({ action: 'read', expires: '03-01-2030' });
          newHtmlUrls[key][langCode] = url;
        } catch (e) {
          console.warn(`     ⚠️  URL existante non récupérée`);
        }
        continue;
      }

      totalFixes += count;
      totalFiles++;

      if (!DRY_RUN) {
        // Sauvegarder le fichier corrigé localement
        fs.writeFileSync(filepath, corrected, 'utf8');

        // Re-uploader vers Firebase Storage
        const storagePath = `press/releases/${docId}/html/${langCode}.html`;
        const storageRef = bucket.file(storagePath);
        await storageRef.save(Buffer.from(corrected, 'utf8'), {
          contentType: 'text/html; charset=utf-8',
          metadata: { 'x-robots-tag': 'noindex', cacheControl: 'public, max-age=86400' },
        });
        const [url] = await storageRef.getSignedUrl({ action: 'read', expires: '03-01-2030' });
        newHtmlUrls[key][langCode] = url;
        console.log(`     ✓ Re-uploadé → Storage OK`);
      }
    }

    // Mettre à jour Firestore avec les nouvelles URLs
    if (!DRY_RUN && Object.keys(newHtmlUrls[key]).length > 0) {
      const updateData = {};
      for (const [langCode, url] of Object.entries(newHtmlUrls[key])) {
        updateData[`htmlUrl.${langCode}`] = url;
      }
      updateData['updatedAt'] = admin.firestore.FieldValue.serverTimestamp();
      await db.collection('press_releases').doc(docId).update(updateData);
      console.log(`\n  ✅ Firestore mis à jour : htmlUrl pour ${Object.keys(newHtmlUrls[key]).length} langues`);
    }
  }

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   RÉSUMÉ                                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  📝 ${totalFixes} corrections appliquées dans ${totalFiles} fichiers`);
  console.log(`  📁 Fichiers HTML locaux mis à jour`);
  console.log(`  ☁️  Re-uploadés vers Firebase Storage`);
  console.log(`  🔥 Firestore URLs mises à jour\n`);

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Erreur fatale:', err.message);
  process.exit(1);
});
