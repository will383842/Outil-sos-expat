'use strict';

/**
 * Script de génération CP4 (Bloggers) + CP5 (GroupAdmin)
 * Génère 9 HTML × 2 CP = 18 fichiers, upload Firebase Storage, crée Firestore docs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ─── Firebase init ────────────────────────────────────────────────────────────
const sa = require('C:/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/serviceAccount.json');
admin.initializeApp({
  credential: admin.credential.cert(sa),
  storageBucket: 'sos-urgently-ac307.firebasestorage.app',
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

// ─── Config ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR = 'C:/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/CP blogguers et admingroup/html';
const SOURCE_CP4 = 'C:/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/CP blogguers et admingroup/SOS-Expat_CP4_Blogueurs_FR.html';
const SOURCE_CP5 = 'C:/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/CP blogguers et admingroup/SOS-Expat_CP5_Communautes_FR.html';

const LANGS = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'hi', 'ar'];

// Firestore key pour ZH est 'ch'
function firestoreKey(lang) {
  return lang === 'zh' ? 'ch' : lang;
}

// ─── Canonical URLs CP4 ───────────────────────────────────────────────────────
const CANONICAL_CP4 = {
  fr: 'https://sos-expat.com/fr-fr/devenir-blogger',
  en: 'https://sos-expat.com/en-us/become-blogger',
  es: 'https://sos-expat.com/es-es/convertirse-blogger',
  de: 'https://sos-expat.com/de-de/blogger-werden',
  pt: 'https://sos-expat.com/pt-pt/tornar-se-blogger',
  ru: 'https://sos-expat.com/ru-ru/stat-blogerom',
  zh: 'https://sos-expat.com/zh-cn/chengwei-boke',
  hi: 'https://sos-expat.com/hi-in/blogger-bane',
  ar: 'https://sos-expat.com/ar-sa/kun-mudawwinan',
};

// ─── Canonical URLs CP5 ───────────────────────────────────────────────────────
const CANONICAL_CP5 = {
  fr: 'https://sos-expat.com/fr-fr/devenir-admin-groupe',
  en: 'https://sos-expat.com/en-us/become-group-admin',
  es: 'https://sos-expat.com/es-es/convertirse-admin-grupo',
  de: 'https://sos-expat.com/de-de/gruppenadmin-werden',
  pt: 'https://sos-expat.com/pt-pt/tornar-se-admin-grupo',
  ru: 'https://sos-expat.com/ru-ru/stat-admin-gruppy',
  zh: 'https://sos-expat.com/zh-cn/chengwei-qunzhu',
  hi: 'https://sos-expat.com/hi-in/group-admin-bane',
  ar: 'https://sos-expat.com/ar-sa/kun-masul-majmuaa',
};

// ─── SEO Descriptions CP4 ────────────────────────────────────────────────────
const SEO_DESC_CP4 = {
  fr: "SOS-Expat lance son programme partenaires blogueurs — $10/appel, lien d'affiliation, kit visuel HD, accès démo. 304M d'expatriés à cibler.",
  en: "SOS-Expat launches its blogger partner program — $10/call, affiliate link, HD visual kit, demo access. 304M expats to target.",
  es: "SOS-Expat lanza su programa de socios bloggers — $10/llamada, enlace de afiliación, kit visual HD. 304M expatriados.",
  de: "SOS-Expat startet sein Blogger-Partnerprogramm — $10/Anruf, Affiliate-Link, HD-Visual-Kit. 304M Expatriates.",
  pt: "SOS-Expat lança programa de parceiros bloggers — $10/chamada, link de afiliação, kit visual HD. 304M expatriados.",
  ru: "SOS-Expat запускает партнёрскую программу для блогеров — $10/звонок, партнёрская ссылка, HD-комплект. 304 млн экспатов.",
  zh: "SOS-Expat推出博主合作计划——每次通话10美元，联盟链接，高清视觉套件。3.04亿海外用户。",
  hi: "SOS-Expat ब्लॉगर पार्टनर प्रोग्राम — $10/कॉल, एफिलिएट लिंक, एचडी विजुअल किट। 304M प्रवासी।",
  ar: "SOS-Expat تطلق برنامج شركاء المدونين — 10$/مكالمة، رابط انتساب، مجموعة بصرية HD. 304 مليون مغترب.",
};

// ─── SEO Descriptions CP5 ────────────────────────────────────────────────────
const SEO_DESC_CP5 = {
  fr: "SOS-Expat donne aux admins de groupes expat la ressource qu'attendaient leurs membres : avocat local, rappel garanti < 5 min, 197 pays.",
  en: "SOS-Expat gives expat group admins the resource their members needed: local lawyer, guaranteed callback < 5 min, 197 countries.",
  es: "SOS-Expat da a los administradores de grupos expat el recurso que esperaban sus miembros: abogado local, < 5 min, 197 países.",
  de: "SOS-Expat gibt Expat-Gruppenadmins die Ressource, auf die ihre Mitglieder gewartet haben: lokaler Anwalt, < 5 Min, 197 Länder.",
  pt: "SOS-Expat dá aos admins de grupos expat o recurso que os membros esperavam: advogado local, < 5 min, 197 países.",
  ru: "SOS-Expat даёт администраторам групп экспатов ресурс, которого ждали их участники: местный адвокат, < 5 мин, 197 стран.",
  zh: "SOS-Expat为外籍人士群组管理员提供成员所需资源：本地律师，5分钟内保证回电，197个国家。",
  hi: "SOS-Expat ग्रुप एडमिन्स को वह संसाधन देता है जिसका उनके सदस्य इंतजार कर रहे थे: स्थानीय वकील, <5 मिनट, 197 देश।",
  ar: "SOS-Expat يمنح مديري مجموعات المغتربين المورد الذي ينتظره أعضاؤهم: محامٍ محلي، < 5 دقائق، 197 دولة.",
};

// ─── Traductions CP4 ─────────────────────────────────────────────────────────
const T_CP4 = {
  fr: {
    html_lang: 'fr',
    dir: 'ltr',
    title: 'SOS-Expat.com — Communiqué Blogueurs & Créateurs',
    tagline: "Service d'urgence mondial · 197 pays · 24h/7j",
    badge: 'Partenariat Créateurs',
    date: '5 avril 2026',
    kicker: 'Communiqué — Blogueurs, Créateurs &amp; Influenceurs Voyage',
    h1: 'Parlez de ce qui compte —<br><em>et soyez payés pour ça.</em>',
    deck: "SOS-Expat.com connecte tout voyageur ou expatrié avec un expert qu'il a choisi — rappel garanti en moins de 5 minutes, 197 pays, toutes langues, 24h/7j. <strong>Votre audience en a besoin. Nous avons un programme pour vous.</strong>",
    stat1_lbl: 'Expatriés dans le monde',
    stat2_lbl: 'Par appel via votre lien',
    stat3_lbl: 'Pays couverts 24h/7j',
    stat4_lbl: 'Concurrent existant',
    sec1_h2: 'Votre audience est exactement la cible',
    sec1_p: "Voyageurs, expatriés, vacanciers, digital nomades, étudiants à l'étranger — <strong>chacun de vos lecteurs a vécu ou risque de vivre une urgence loin de chez lui.</strong> Accident, arrestation, expulsion, hospitalisation. Aucune solution n'existait avant aujourd'hui.",
    card1_h4: 'Blog voyage &amp; vacanciers',
    card1_p: "Vol, accident, hospitalisation — SOS-Expat.com est la réponse concrète à ce risque invisible.",
    card2_h4: 'Expatriation &amp; déménagement',
    card2_p: "Votre niche est au cœur de la cible. Vos lecteurs ont besoin de ce service en permanence.",
    card3_h4: 'Digital nomade',
    card3_p: "35 millions de nomades sans filet de sécurité local. Le premier service pensé pour eux.",
    card4_h4: 'Étudiants &amp; familles à l\'étranger',
    card4_p: "Erasmus, échanges, enfants en séjour. Urgences sans réseau ni langue locale.",
    sec2_h2: 'Le programme affiliation',
    amount_label: 'par appel généré via votre lien — <strong>versé dès le premier appel</strong>',
    affil1: 'Aucun plafond de commissions',
    affil2: 'Fenêtre de tracking cookie',
    affil3: 'Tableau de bord temps réel',
    sec3_h2: 'Idées de contenus clés en main',
    ctag1: 'Article / Blog',
    ch4_1: '"Ce que j\'aurais voulu avoir lors de ma pire urgence à l\'étranger"',
    cp1: 'Storytelling + présentation naturelle de la solution.',
    ctag2: 'Vidéo / Reel',
    ch4_2: '"Que faire si tu te fais arrêter à l\'étranger ?"',
    cp2: 'Contenu sécurité voyageurs + démo rapide de la plateforme.',
    ctag3: 'Newsletter',
    ch4_3: '"Le service que j\'aurais voulu connaître avant de m\'expatrier"',
    cp3: 'Recommandation sincère — très bon taux de conversion.',
    ctag4: 'Article Vacances',
    ch4_4: '"Que faire si ça tourne mal pendant vos vacances ?"',
    cp4: "Vol, accident, litige hôtel — ultra-partageable, evergreen.",
    ctag5: 'Guide',
    ch4_5: '"Checklist sécurité avant de partir à l\'étranger"',
    cp5: "Contenu evergreen très partagé — SOS-Expat.com en ressource centrale.",
    ctag6: 'Podcast / Interview',
    ch4_6: 'Interview exclusive du fondateur',
    cp6: "Williams Jullin disponible — entrepreneuriat, expat, impact social.",
    sec4_h2: 'Ce que vous recevez',
    perk1: "<strong>Lien d'affiliation personnalisé</strong> + tableau de bord temps réel",
    perk2: "<strong>Accès compte démo complet</strong> — testez la plateforme comme un vrai utilisateur",
    perk3: "<strong>Kit visuel HD</strong> — screenshots, vidéos, infographies prêtes à publier",
    perk4: "<strong>Interview fondateur</strong> — tout format, tout fuseau horaire",
    perk5: "<strong>Réponse sous 24h</strong> — pas de minimum d'audience requis",
    quote: "Nous ne cherchons pas des publicités. Nous cherchons des partenaires qui croient en ce qu'ils recommandent.",
    attr_title: 'Fondateur &amp; CEO, SOS-Expat.com — Tallinn, Estonie',
    cta_h3: 'Rejoindre le programme',
    cta_p: "Un email suffit. Réponse sous 24h. Pas de minimum d'audience.",
    cta_email_subject: "Partenariat Créateur — [Votre blog/chaîne]",
    cta_subject_label: 'Objet :',
    contact_h3: 'Contact partenariats',
    contact1_val: 'Williams Jullin — Fondateur &amp; CEO',
    contact4_lbl: 'Disponibilité',
    contact4_val: 'Immédiate — tout fuseau horaire',
    kit1: '🔗 Lien affiliation',
    kit2: '🖥 Accès démo',
    kit3: '📸 Kit visuel HD',
    kit4: '🎙 Interview fondateur',
    kit5: '⚡ Réponse 24h',
    footer_legal: 'SOS-Expat.com — Société enregistrée en Estonie — Tallinn, Estonie',
  },
  en: {
    html_lang: 'en',
    dir: 'ltr',
    title: 'SOS-Expat.com — Press Release — Bloggers & Content Creators',
    tagline: 'Global emergency service · 197 countries · 24/7',
    badge: 'Creator Partnership',
    date: 'April 5, 2026',
    kicker: 'Press Release — Travel Bloggers, Content Creators &amp; Influencers',
    h1: 'Talk about what matters —<br><em>and get paid for it.</em>',
    deck: 'SOS-Expat.com connects every traveler or expat with an expert they chose — guaranteed callback in under 5 minutes, 197 countries, all languages, 24/7. <strong>Your audience needs this. We have a program for you.</strong>',
    stat1_lbl: 'Expats worldwide',
    stat2_lbl: 'Per call via your link',
    stat3_lbl: 'Countries covered 24/7',
    stat4_lbl: 'Existing competitor',
    sec1_h2: 'Your audience is exactly the target',
    sec1_p: 'Travelers, expats, vacationers, digital nomads, students abroad — <strong>every one of your readers has experienced or risks experiencing an emergency far from home.</strong> Accident, arrest, deportation, hospitalization. No solution existed before today.',
    card1_h4: 'Travel blog &amp; vacationers',
    card1_p: 'Theft, accident, hospitalization — SOS-Expat.com is the concrete answer to this invisible risk.',
    card2_h4: 'Expatriation &amp; relocation',
    card2_p: 'Your niche is at the heart of the target. Your readers need this service permanently.',
    card3_h4: 'Digital nomad',
    card3_p: '35 million nomads without a local safety net. The first service designed for them.',
    card4_h4: 'Students &amp; families abroad',
    card4_p: 'Erasmus, exchanges, children on stays. Emergencies without local network or language.',
    sec2_h2: 'The affiliate program',
    amount_label: 'per call generated via your link — <strong>paid from the first call</strong>',
    affil1: 'No commission cap',
    affil2: 'Cookie tracking window',
    affil3: 'Real-time dashboard',
    sec3_h2: 'Ready-to-use content ideas',
    ctag1: 'Article / Blog',
    ch4_1: '"What I wish I had during my worst emergency abroad"',
    cp1: 'Storytelling + natural presentation of the solution.',
    ctag2: 'Video / Reel',
    ch4_2: '"What to do if you get arrested abroad?"',
    cp2: 'Traveler safety content + quick platform demo.',
    ctag3: 'Newsletter',
    ch4_3: '"The service I wish I knew before moving abroad"',
    cp3: 'Sincere recommendation — very good conversion rate.',
    ctag4: 'Holiday Article',
    ch4_4: '"What to do if things go wrong during your vacation?"',
    cp4: 'Theft, accident, hotel dispute — ultra-shareable, evergreen.',
    ctag5: 'Guide',
    ch4_5: '"Safety checklist before traveling abroad"',
    cp5: 'Widely shared evergreen content — SOS-Expat.com as central resource.',
    ctag6: 'Podcast / Interview',
    ch4_6: 'Exclusive founder interview',
    cp6: 'Williams Jullin available — entrepreneurship, expat life, social impact.',
    sec4_h2: 'What you receive',
    perk1: '<strong>Personalized affiliate link</strong> + real-time dashboard',
    perk2: '<strong>Full demo account access</strong> — test the platform like a real user',
    perk3: '<strong>HD visual kit</strong> — screenshots, videos, infographics ready to publish',
    perk4: '<strong>Founder interview</strong> — any format, any timezone',
    perk5: '<strong>24h response</strong> — no minimum audience required',
    quote: "We don't look for advertisers. We look for partners who believe in what they recommend.",
    attr_title: 'Founder &amp; CEO, SOS-Expat.com — Tallinn, Estonia',
    cta_h3: 'Join the program',
    cta_p: 'One email is enough. 24h response. No minimum audience.',
    cta_email_subject: 'Creator Partnership — [Your blog/channel]',
    cta_subject_label: 'Subject:',
    contact_h3: 'Partnership contact',
    contact1_val: 'Williams Jullin — Founder &amp; CEO',
    contact4_lbl: 'Availability',
    contact4_val: 'Immediate — any timezone',
    kit1: '🔗 Affiliate link',
    kit2: '🖥 Demo access',
    kit3: '📸 HD visual kit',
    kit4: '🎙 Founder interview',
    kit5: '⚡ 24h response',
    footer_legal: 'SOS-Expat.com — Registered company in Estonia — Tallinn, Estonia',
  },
  es: {
    html_lang: 'es',
    dir: 'ltr',
    title: 'SOS-Expat.com — Comunicado — Bloggers y Creadores de Contenido',
    tagline: 'Servicio de emergencia mundial · 197 países · 24h/7j',
    badge: 'Asociación Creadores',
    date: '5 de abril de 2026',
    kicker: 'Comunicado — Bloggers de Viaje, Creadores de Contenido &amp; Influencers',
    h1: 'Habla de lo que importa —<br><em>y cobra por ello.</em>',
    deck: 'SOS-Expat.com conecta a cada viajero o expatriado con el experto que eligió — devolución de llamada garantizada en menos de 5 minutos, 197 países, todos los idiomas, 24/7. <strong>Tu audiencia lo necesita. Tenemos un programa para ti.</strong>',
    stat1_lbl: 'Expatriados en el mundo',
    stat2_lbl: 'Por llamada via tu enlace',
    stat3_lbl: 'Países cubiertos 24/7',
    stat4_lbl: 'Competidor existente',
    sec1_h2: 'Tu audiencia es exactamente el objetivo',
    sec1_p: 'Viajeros, expatriados, vacacionistas, nómadas digitales, estudiantes en el extranjero — <strong>cada uno de tus lectores ha vivido o corre el riesgo de vivir una emergencia lejos de casa.</strong> Accidente, arresto, expulsión, hospitalización. Ninguna solución existía antes de hoy.',
    card1_h4: 'Blog de viajes &amp; vacacionistas',
    card1_p: 'Robo, accidente, hospitalización — SOS-Expat.com es la respuesta concreta a este riesgo invisible.',
    card2_h4: 'Expatriación &amp; mudanza',
    card2_p: 'Tu nicho está en el corazón del objetivo. Tus lectores necesitan este servicio permanentemente.',
    card3_h4: 'Nómada digital',
    card3_p: '35 millones de nómadas sin red de seguridad local. El primer servicio pensado para ellos.',
    card4_h4: 'Estudiantes &amp; familias en el extranjero',
    card4_p: 'Erasmus, intercambios, niños de estancia. Emergencias sin red ni idioma local.',
    sec2_h2: 'El programa de afiliación',
    amount_label: 'por llamada generada a través de tu enlace — <strong>pagado desde la primera llamada</strong>',
    affil1: 'Sin límite de comisiones',
    affil2: 'Ventana de seguimiento cookie',
    affil3: 'Panel en tiempo real',
    sec3_h2: 'Ideas de contenido listas para usar',
    ctag1: 'Artículo / Blog',
    ch4_1: '"Lo que desearía haber tenido en mi peor emergencia en el extranjero"',
    cp1: 'Storytelling + presentación natural de la solución.',
    ctag2: 'Vídeo / Reel',
    ch4_2: '"¿Qué hacer si te arrestan en el extranjero?"',
    cp2: 'Contenido de seguridad para viajeros + demo rápida de la plataforma.',
    ctag3: 'Newsletter',
    ch4_3: '"El servicio que desearía haber conocido antes de expatriarme"',
    cp3: 'Recomendación sincera — muy buena tasa de conversión.',
    ctag4: 'Artículo de vacaciones',
    ch4_4: '"¿Qué hacer si algo sale mal durante tus vacaciones?"',
    cp4: 'Robo, accidente, disputa de hotel — ultra-compartible, evergreen.',
    ctag5: 'Guía',
    ch4_5: '"Lista de seguridad antes de viajar al extranjero"',
    cp5: 'Contenido evergreen muy compartido — SOS-Expat.com como recurso central.',
    ctag6: 'Podcast / Entrevista',
    ch4_6: 'Entrevista exclusiva con el fundador',
    cp6: 'Williams Jullin disponible — emprendimiento, vida expat, impacto social.',
    sec4_h2: 'Lo que recibes',
    perk1: '<strong>Enlace de afiliación personalizado</strong> + panel en tiempo real',
    perk2: '<strong>Acceso completo a cuenta demo</strong> — prueba la plataforma como un usuario real',
    perk3: '<strong>Kit visual HD</strong> — capturas, vídeos, infografías listas para publicar',
    perk4: '<strong>Entrevista con el fundador</strong> — cualquier formato, cualquier zona horaria',
    perk5: '<strong>Respuesta en 24h</strong> — sin mínimo de audiencia requerido',
    quote: 'No buscamos anunciantes. Buscamos socios que crean en lo que recomiendan.',
    attr_title: 'Fundador &amp; CEO, SOS-Expat.com — Tallin, Estonia',
    cta_h3: 'Unirse al programa',
    cta_p: 'Un correo electrónico es suficiente. Respuesta en 24h. Sin mínimo de audiencia.',
    cta_email_subject: 'Asociación Creador — [Tu blog/canal]',
    cta_subject_label: 'Asunto:',
    contact_h3: 'Contacto de asociaciones',
    contact1_val: 'Williams Jullin — Fundador &amp; CEO',
    contact4_lbl: 'Disponibilidad',
    contact4_val: 'Inmediata — cualquier zona horaria',
    kit1: '🔗 Enlace afiliación',
    kit2: '🖥 Acceso demo',
    kit3: '📸 Kit visual HD',
    kit4: '🎙 Entrevista fundador',
    kit5: '⚡ Respuesta 24h',
    footer_legal: 'SOS-Expat.com — Empresa registrada en Estonia — Tallin, Estonia',
  },
  de: {
    html_lang: 'de',
    dir: 'ltr',
    title: 'SOS-Expat.com — Pressemitteilung — Blogger & Content-Ersteller',
    tagline: 'Globaler Notfalldienst · 197 Länder · 24/7',
    badge: 'Creator-Partnerschaft',
    date: '5. April 2026',
    kicker: 'Pressemitteilung — Reiseblogger, Content-Ersteller &amp; Influencer',
    h1: 'Schreib über das Wesentliche —<br><em>und werde dafür bezahlt.</em>',
    deck: 'SOS-Expat.com verbindet jeden Reisenden oder Expatriate mit einem selbst gewählten Experten — garantierter Rückruf in unter 5 Minuten, 197 Länder, alle Sprachen, 24/7. <strong>Deine Zielgruppe braucht das. Wir haben ein Programm für dich.</strong>',
    stat1_lbl: 'Expatriates weltweit',
    stat2_lbl: 'Pro Anruf über deinen Link',
    stat3_lbl: 'Länder 24/7 abgedeckt',
    stat4_lbl: 'Bestehender Wettbewerber',
    sec1_h2: 'Deine Zielgruppe ist genau das Ziel',
    sec1_p: 'Reisende, Expatriates, Urlauber, digitale Nomaden, Studenten im Ausland — <strong>jeder deiner Leser hat erlebt oder riskiert, einen Notfall fern der Heimat zu erleben.</strong> Unfall, Verhaftung, Ausweisung, Krankenhausaufenthalt. Keine Lösung existierte vor heute.',
    card1_h4: 'Reiseblog &amp; Urlauber',
    card1_p: 'Diebstahl, Unfall, Krankenhausaufenthalt — SOS-Expat.com ist die konkrete Antwort auf dieses unsichtbare Risiko.',
    card2_h4: 'Auswanderung &amp; Umzug',
    card2_p: 'Deine Nische ist im Herzen der Zielgruppe. Deine Leser brauchen diesen Service dauerhaft.',
    card3_h4: 'Digitaler Nomade',
    card3_p: '35 Millionen Nomaden ohne lokales Sicherheitsnetz. Der erste Service, der für sie gedacht ist.',
    card4_h4: 'Studenten &amp; Familien im Ausland',
    card4_p: 'Erasmus, Austausch, Kinder im Auslandsaufenthalt. Notfälle ohne lokales Netzwerk oder Sprache.',
    sec2_h2: 'Das Affiliate-Programm',
    amount_label: 'pro Anruf über deinen Link — <strong>bezahlt ab dem ersten Anruf</strong>',
    affil1: 'Kein Provisionslimit',
    affil2: 'Cookie-Tracking-Fenster',
    affil3: 'Echtzeit-Dashboard',
    sec3_h2: 'Fertige Content-Ideen',
    ctag1: 'Artikel / Blog',
    ch4_1: '"Was ich mir bei meinem schlimmsten Notfall im Ausland gewünscht hätte"',
    cp1: 'Storytelling + natürliche Präsentation der Lösung.',
    ctag2: 'Video / Reel',
    ch4_2: '"Was tun, wenn du im Ausland verhaftet wirst?"',
    cp2: 'Sicherheitscontent für Reisende + schnelle Plattform-Demo.',
    ctag3: 'Newsletter',
    ch4_3: '"Der Service, den ich vor meiner Auswanderung kennen wollte"',
    cp3: 'Aufrichtige Empfehlung — sehr gute Konversionsrate.',
    ctag4: 'Urlaubsartikel',
    ch4_4: '"Was tun, wenn im Urlaub etwas schiefläuft?"',
    cp4: 'Diebstahl, Unfall, Hotelstreit — ultra-teilbar, Evergreen.',
    ctag5: 'Ratgeber',
    ch4_5: '"Sicherheits-Checkliste vor der Auslandsreise"',
    cp5: 'Viel geteilter Evergreen-Content — SOS-Expat.com als zentrale Ressource.',
    ctag6: 'Podcast / Interview',
    ch4_6: 'Exklusives Gründerinterview',
    cp6: 'Williams Jullin verfügbar — Unternehmertum, Expat-Leben, sozialer Impact.',
    sec4_h2: 'Was du erhältst',
    perk1: '<strong>Persönlicher Affiliate-Link</strong> + Echtzeit-Dashboard',
    perk2: '<strong>Vollständiger Demo-Kontozugang</strong> — teste die Plattform wie ein echter Nutzer',
    perk3: '<strong>HD-Visual-Kit</strong> — Screenshots, Videos, Infografiken zum Veröffentlichen',
    perk4: '<strong>Gründerinterview</strong> — jedes Format, jede Zeitzone',
    perk5: '<strong>24h-Antwort</strong> — kein Mindestpublikum erforderlich',
    quote: 'Wir suchen keine Werbepartner. Wir suchen Partner, die an das glauben, was sie empfehlen.',
    attr_title: 'Gründer &amp; CEO, SOS-Expat.com — Tallinn, Estland',
    cta_h3: 'Dem Programm beitreten',
    cta_p: 'Eine E-Mail reicht aus. 24h-Antwort. Kein Mindestpublikum.',
    cta_email_subject: 'Creator-Partnerschaft — [Dein Blog/Kanal]',
    cta_subject_label: 'Betreff:',
    contact_h3: 'Partnerschaftskontakt',
    contact1_val: 'Williams Jullin — Gründer &amp; CEO',
    contact4_lbl: 'Verfügbarkeit',
    contact4_val: 'Sofort — jede Zeitzone',
    kit1: '🔗 Affiliate-Link',
    kit2: '🖥 Demo-Zugang',
    kit3: '📸 HD-Visual-Kit',
    kit4: '🎙 Gründerinterview',
    kit5: '⚡ 24h-Antwort',
    footer_legal: 'SOS-Expat.com — Registriertes Unternehmen in Estland — Tallinn, Estland',
  },
  pt: {
    html_lang: 'pt',
    dir: 'ltr',
    title: 'SOS-Expat.com — Comunicado — Bloggers e Criadores de Conteúdo',
    tagline: 'Serviço de emergência global · 197 países · 24h/7j',
    badge: 'Parceria Criadores',
    date: '5 de abril de 2026',
    kicker: 'Comunicado — Bloggers de Viagem, Criadores de Conteúdo &amp; Influenciadores',
    h1: 'Fala do que importa —<br><em>e recebe por isso.</em>',
    deck: 'SOS-Expat.com liga cada viajante ou expatriado ao especialista que escolheu — retorno de chamada garantido em menos de 5 minutos, 197 países, todos os idiomas, 24/7. <strong>O seu público precisa disto. Temos um programa para si.</strong>',
    stat1_lbl: 'Expatriados no mundo',
    stat2_lbl: 'Por chamada via o seu link',
    stat3_lbl: 'Países cobertos 24/7',
    stat4_lbl: 'Concorrente existente',
    sec1_h2: 'O seu público é exatamente o alvo',
    sec1_p: 'Viajantes, expatriados, férias, nómadas digitais, estudantes no estrangeiro — <strong>cada um dos seus leitores viveu ou corre o risco de viver uma emergência longe de casa.</strong> Acidente, detenção, expulsão, hospitalização. Nenhuma solução existia antes de hoje.',
    card1_h4: 'Blog de viagem &amp; férias',
    card1_p: 'Roubo, acidente, hospitalização — SOS-Expat.com é a resposta concreta a este risco invisível.',
    card2_h4: 'Expatriação &amp; mudança',
    card2_p: 'O seu nicho está no coração do alvo. Os seus leitores precisam deste serviço permanentemente.',
    card3_h4: 'Nómada digital',
    card3_p: '35 milhões de nómadas sem rede de segurança local. O primeiro serviço pensado para eles.',
    card4_h4: 'Estudantes &amp; famílias no estrangeiro',
    card4_p: 'Erasmus, intercâmbios, crianças em estadias. Emergências sem rede nem idioma local.',
    sec2_h2: 'O programa de afiliação',
    amount_label: 'por chamada gerada através do seu link — <strong>pago desde a primeira chamada</strong>',
    affil1: 'Sem limite de comissões',
    affil2: 'Janela de rastreamento cookie',
    affil3: 'Painel em tempo real',
    sec3_h2: 'Ideias de conteúdo prontas a usar',
    ctag1: 'Artigo / Blog',
    ch4_1: '"O que desejaria ter tido na minha pior emergência no estrangeiro"',
    cp1: 'Storytelling + apresentação natural da solução.',
    ctag2: 'Vídeo / Reel',
    ch4_2: '"O que fazer se for detido no estrangeiro?"',
    cp2: 'Conteúdo de segurança para viajantes + demo rápida da plataforma.',
    ctag3: 'Newsletter',
    ch4_3: '"O serviço que desejaria ter conhecido antes de me expatriar"',
    cp3: 'Recomendação sincera — muito boa taxa de conversão.',
    ctag4: 'Artigo de férias',
    ch4_4: '"O que fazer se algo correr mal durante as suas férias?"',
    cp4: 'Roubo, acidente, disputa de hotel — ultra-partilhável, evergreen.',
    ctag5: 'Guia',
    ch4_5: '"Lista de segurança antes de viajar para o estrangeiro"',
    cp5: 'Conteúdo evergreen muito partilhado — SOS-Expat.com como recurso central.',
    ctag6: 'Podcast / Entrevista',
    ch4_6: 'Entrevista exclusiva com o fundador',
    cp6: 'Williams Jullin disponível — empreendedorismo, vida expat, impacto social.',
    sec4_h2: 'O que recebe',
    perk1: '<strong>Link de afiliação personalizado</strong> + painel em tempo real',
    perk2: '<strong>Acesso completo a conta demo</strong> — teste a plataforma como um utilizador real',
    perk3: '<strong>Kit visual HD</strong> — capturas, vídeos, infografias prontas a publicar',
    perk4: '<strong>Entrevista com o fundador</strong> — qualquer formato, qualquer fuso horário',
    perk5: '<strong>Resposta em 24h</strong> — sem mínimo de audiência necessário',
    quote: 'Não procuramos anunciantes. Procuramos parceiros que acreditam no que recomendam.',
    attr_title: 'Fundador &amp; CEO, SOS-Expat.com — Tallinn, Estónia',
    cta_h3: 'Aderir ao programa',
    cta_p: 'Um e-mail é suficiente. Resposta em 24h. Sem mínimo de audiência.',
    cta_email_subject: 'Parceria Criador — [O seu blog/canal]',
    cta_subject_label: 'Assunto:',
    contact_h3: 'Contacto de parcerias',
    contact1_val: 'Williams Jullin — Fundador &amp; CEO',
    contact4_lbl: 'Disponibilidade',
    contact4_val: 'Imediata — qualquer fuso horário',
    kit1: '🔗 Link afiliação',
    kit2: '🖥 Acesso demo',
    kit3: '📸 Kit visual HD',
    kit4: '🎙 Entrevista fundador',
    kit5: '⚡ Resposta 24h',
    footer_legal: 'SOS-Expat.com — Empresa registada na Estónia — Tallinn, Estónia',
  },
  ru: {
    html_lang: 'ru',
    dir: 'ltr',
    title: 'SOS-Expat.com — Пресс-релиз — Блогеры и Создатели Контента',
    tagline: 'Глобальная служба экстренной помощи · 197 стран · 24/7',
    badge: 'Партнёрство Создателей',
    date: '5 апреля 2026',
    kicker: 'Пресс-релиз — Тревел-блогеры, Создатели контента &amp; Инфлюенсеры',
    h1: 'Говорите о том, что важно —<br><em>и получайте за это деньги.</em>',
    deck: 'SOS-Expat.com соединяет каждого путешественника или экспата с выбранным им экспертом — гарантированный обратный звонок менее чем за 5 минут, 197 стран, все языки, 24/7. <strong>Ваша аудитория нуждается в этом. У нас есть программа для вас.</strong>',
    stat1_lbl: 'Экспатов по всему миру',
    stat2_lbl: 'За звонок по вашей ссылке',
    stat3_lbl: 'Стран охвачено 24/7',
    stat4_lbl: 'Существующих конкурентов',
    sec1_h2: 'Ваша аудитория — именно наша целевая группа',
    sec1_p: 'Путешественники, экспаты, отдыхающие, цифровые кочевники, студенты за рубежом — <strong>каждый из ваших читателей пережил или рискует пережить экстренную ситуацию вдали от дома.</strong> Авария, арест, депортация, госпитализация. До сегодняшнего дня решения не существовало.',
    card1_h4: 'Тревел-блог &amp; отдыхающие',
    card1_p: 'Кража, авария, госпитализация — SOS-Expat.com — конкретный ответ на этот невидимый риск.',
    card2_h4: 'Эмиграция &amp; переезд',
    card2_p: 'Ваша ниша — в самом сердце целевой аудитории. Ваши читатели постоянно нуждаются в этом сервисе.',
    card3_h4: 'Цифровой кочевник',
    card3_p: '35 миллионов кочевников без местной страховки. Первый сервис, созданный для них.',
    card4_h4: 'Студенты &amp; семьи за рубежом',
    card4_p: 'Эразмус, обмены, дети на стажировках. Экстренные ситуации без местной сети и языка.',
    sec2_h2: 'Партнёрская программа',
    amount_label: 'за звонок по вашей ссылке — <strong>оплата с первого звонка</strong>',
    affil1: 'Без лимита комиссий',
    affil2: 'Окно отслеживания cookie',
    affil3: 'Дашборд в реальном времени',
    sec3_h2: 'Готовые идеи контента',
    ctag1: 'Статья / Блог',
    ch4_1: '"Что я хотел бы иметь во время своей худшей экстренной ситуации за рубежом"',
    cp1: 'Сторителлинг + естественная презентация решения.',
    ctag2: 'Видео / Reel',
    ch4_2: '"Что делать, если вас задержали за рубежом?"',
    cp2: 'Контент о безопасности путешественников + быстрая демонстрация платформы.',
    ctag3: 'Рассылка',
    ch4_3: '"Сервис, о котором я хотел бы знать до эмиграции"',
    cp3: 'Искренняя рекомендация — очень хорошая конверсия.',
    ctag4: 'Статья об отпуске',
    ch4_4: '"Что делать, если отпуск пошёл не по плану?"',
    cp4: 'Кража, авария, спор с отелем — виральный, вечнозелёный.',
    ctag5: 'Руководство',
    ch4_5: '"Чеклист безопасности перед поездкой за рубеж"',
    cp5: 'Очень популярный вечнозелёный контент — SOS-Expat.com как центральный ресурс.',
    ctag6: 'Подкаст / Интервью',
    ch4_6: 'Эксклюзивное интервью с основателем',
    cp6: 'Williams Jullin доступен — предпринимательство, жизнь экспата, социальное воздействие.',
    sec4_h2: 'Что вы получаете',
    perk1: '<strong>Персональная партнёрская ссылка</strong> + дашборд в реальном времени',
    perk2: '<strong>Полный доступ к демо-аккаунту</strong> — протестируйте платформу как настоящий пользователь',
    perk3: '<strong>HD-визуальный комплект</strong> — скриншоты, видео, инфографика для публикации',
    perk4: '<strong>Интервью с основателем</strong> — любой формат, любой часовой пояс',
    perk5: '<strong>Ответ в течение 24ч</strong> — без минимальной аудитории',
    quote: 'Мы ищем не рекламодателей. Мы ищем партнёров, которые верят в то, что рекомендуют.',
    attr_title: 'Основатель &amp; CEO, SOS-Expat.com — Таллин, Эстония',
    cta_h3: 'Присоединиться к программе',
    cta_p: 'Одного письма достаточно. Ответ в течение 24ч. Без минимальной аудитории.',
    cta_email_subject: 'Партнёрство Создателя — [Ваш блог/канал]',
    cta_subject_label: 'Тема:',
    contact_h3: 'Партнёрский контакт',
    contact1_val: 'Уильямс Джуллин — Основатель &amp; CEO',
    contact4_lbl: 'Доступность',
    contact4_val: 'Немедленная — любой часовой пояс',
    kit1: '🔗 Партнёрская ссылка',
    kit2: '🖥 Доступ к демо',
    kit3: '📸 HD-визуальный кит',
    kit4: '🎙 Интервью с основателем',
    kit5: '⚡ Ответ в 24ч',
    footer_legal: 'SOS-Expat.com — Компания, зарегистрированная в Эстонии — Таллин, Эстония',
  },
  zh: {
    html_lang: 'zh',
    dir: 'ltr',
    title: 'SOS-Expat.com — 新闻稿 — 博主与内容创作者',
    tagline: '全球紧急服务 · 197个国家 · 24小时全天候',
    badge: '创作者合作',
    date: '2026年4月5日',
    kicker: '新闻稿 — 旅行博主、内容创作者 &amp; 网络红人',
    h1: '谈论重要的事情 —<br><em>并因此获得报酬。</em>',
    deck: 'SOS-Expat.com将每位旅行者或海外华人与其选择的专家联系起来——5分钟内保证回电，197个国家，所有语言，24/7全天候。<strong>您的受众需要这个服务。我们为您准备了合作计划。</strong>',
    stat1_lbl: '全球外籍人士',
    stat2_lbl: '通过您的链接每次通话',
    stat3_lbl: '24/7覆盖国家',
    stat4_lbl: '现有竞争对手',
    sec1_h2: '您的受众正是目标群体',
    sec1_p: '旅行者、海外华人、度假者、数字游民、海外学生——<strong>您的每位读者都曾经历或面临在异国他乡遭遇紧急情况的风险。</strong>事故、拘留、驱逐、住院。今天之前没有任何解决方案。',
    card1_h4: '旅游博客 &amp; 度假者',
    card1_p: '盗窃、事故、住院——SOS-Expat.com是这一不可见风险的具体解答。',
    card2_h4: '海外移居 &amp; 搬迁',
    card2_p: '您的细分市场正是目标核心。您的读者始终需要这项服务。',
    card3_h4: '数字游民',
    card3_p: '3500万游民没有本地安全网。第一个专为他们设计的服务。',
    card4_h4: '海外学生 &amp; 家庭',
    card4_p: '伊拉斯谟、交流、孩子的海外之旅。在没有本地网络和语言的情况下遭遇紧急事件。',
    sec2_h2: '联盟计划',
    amount_label: '通过您的链接产生的每次通话——<strong>从第一次通话开始支付</strong>',
    affil1: '无佣金上限',
    affil2: 'Cookie追踪窗口',
    affil3: '实时仪表盘',
    sec3_h2: '即用内容创意',
    ctag1: '文章 / 博客',
    ch4_1: '"我在国外最糟糕的紧急情况中希望拥有的东西"',
    cp1: '故事叙述+自然呈现解决方案。',
    ctag2: '视频 / Reel',
    ch4_2: '"如果在国外被捕怎么办？"',
    cp2: '旅行者安全内容+平台快速演示。',
    ctag3: '邮件通讯',
    ch4_3: '"我希望在出国前就了解的服务"',
    cp3: '真诚推荐——转化率非常高。',
    ctag4: '假期文章',
    ch4_4: '"如果假期出了问题怎么办？"',
    cp4: '盗窃、事故、酒店纠纷——极易传播，常青内容。',
    ctag5: '指南',
    ch4_5: '"出国前的安全清单"',
    cp5: '广泛传播的常青内容——SOS-Expat.com作为核心资源。',
    ctag6: '播客 / 访谈',
    ch4_6: '创始人独家专访',
    cp6: 'Williams Jullin随时可约——创业、海外生活、社会影响。',
    sec4_h2: '您将获得什么',
    perk1: '<strong>个性化联盟链接</strong> + 实时仪表盘',
    perk2: '<strong>完整演示账户访问</strong> — 像真实用户一样测试平台',
    perk3: '<strong>高清视觉套件</strong> — 截图、视频、信息图，可立即发布',
    perk4: '<strong>创始人采访</strong> — 任何格式，任何时区',
    perk5: '<strong>24小时回复</strong> — 无最低受众要求',
    quote: '我们不寻找广告商。我们寻找相信自己所推荐产品的合作伙伴。',
    attr_title: '创始人 &amp; CEO，SOS-Expat.com — 爱沙尼亚塔林',
    cta_h3: '加入计划',
    cta_p: '一封电子邮件就足够了。24小时内回复。无最低受众要求。',
    cta_email_subject: '创作者合作 — [您的博客/频道]',
    cta_subject_label: '主题：',
    contact_h3: '合作联系',
    contact1_val: 'Williams Jullin — 创始人 &amp; CEO',
    contact4_lbl: '可用性',
    contact4_val: '即时——任何时区',
    kit1: '🔗 联盟链接',
    kit2: '🖥 演示访问',
    kit3: '📸 高清视觉套件',
    kit4: '🎙 创始人采访',
    kit5: '⚡ 24小时回复',
    footer_legal: 'SOS-Expat.com — 在爱沙尼亚注册的公司 — 塔林，爱沙尼亚',
  },
  hi: {
    html_lang: 'hi',
    dir: 'ltr',
    title: 'SOS-Expat.com — प्रेस विज्ञप्ति — ब्लॉगर और कंटेंट क्रिएटर',
    tagline: 'वैश्विक आपातकालीन सेवा · 197 देश · 24/7',
    badge: 'क्रिएटर पार्टनरशिप',
    date: '5 अप्रैल 2026',
    kicker: 'प्रेस विज्ञप्ति — ट्रैवल ब्लॉगर, कंटेंट क्रिएटर &amp; इन्फ्लुएंसर',
    h1: 'जो मायने रखता है उसके बारे में लिखें —<br><em>और उसके लिए पैसे पाएं।</em>',
    deck: 'SOS-Expat.com हर यात्री या प्रवासी को उनके चुने हुए विशेषज्ञ से जोड़ता है — 5 मिनट से कम में गारंटीड कॉलबैक, 197 देश, सभी भाषाएं, 24/7। <strong>आपके दर्शकों को इसकी जरूरत है। हमारे पास आपके लिए एक प्रोग्राम है।</strong>',
    stat1_lbl: 'दुनिया भर में प्रवासी',
    stat2_lbl: 'आपके लिंक से प्रति कॉल',
    stat3_lbl: '24/7 कवर देश',
    stat4_lbl: 'मौजूदा प्रतियोगी',
    sec1_h2: 'आपके दर्शक बिल्कुल सही लक्ष्य हैं',
    sec1_p: 'यात्री, प्रवासी, छुट्टीमनाने वाले, डिजिटल नोमेड, विदेश में छात्र — <strong>आपके हर पाठक ने घर से दूर आपातकाल का सामना किया है या उसका जोखिम है।</strong> दुर्घटना, गिरफ्तारी, निर्वासन, अस्पताल में भर्ती। आज से पहले कोई समाधान नहीं था।',
    card1_h4: 'ट्रैवल ब्लॉग &amp; छुट्टीमनाने वाले',
    card1_p: 'चोरी, दुर्घटना, अस्पताल में भर्ती — SOS-Expat.com इस अदृश्य जोखिम का ठोस जवाब है।',
    card2_h4: 'प्रवासी जीवन &amp; स्थानांतरण',
    card2_p: 'आपका निश खतरे के केंद्र में है। आपके पाठकों को इस सेवा की हमेशा जरूरत होती है।',
    card3_h4: 'डिजिटल नोमेड',
    card3_p: '35 मिलियन नोमेड बिना स्थानीय सुरक्षा जाल के। उनके लिए डिजाइन की गई पहली सेवा।',
    card4_h4: 'विदेश में छात्र &amp; परिवार',
    card4_p: 'इरास्मस, एक्सचेंज, विदेश में बच्चे। स्थानीय नेटवर्क या भाषा के बिना आपातकाल।',
    sec2_h2: 'एफिलिएट प्रोग्राम',
    amount_label: 'आपके लिंक से उत्पन्न प्रति कॉल — <strong>पहली कॉल से भुगतान</strong>',
    affil1: 'कमीशन पर कोई सीमा नहीं',
    affil2: 'कुकी ट्रैकिंग विंडो',
    affil3: 'रियल-टाइम डैशबोर्ड',
    sec3_h2: 'तैयार कंटेंट आइडियाज',
    ctag1: 'लेख / ब्लॉग',
    ch4_1: '"विदेश में मेरे सबसे बुरे आपातकाल के दौरान मैं क्या चाहता था"',
    cp1: 'स्टोरीटेलिंग + समाधान की स्वाभाविक प्रस्तुति।',
    ctag2: 'वीडियो / Reel',
    ch4_2: '"अगर आपको विदेश में गिरफ्तार किया जाए तो क्या करें?"',
    cp2: 'यात्री सुरक्षा सामग्री + प्लेटफॉर्म का त्वरित डेमो।',
    ctag3: 'न्यूजलेटर',
    ch4_3: '"वह सेवा जो मैं विदेश जाने से पहले जानना चाहता था"',
    cp3: 'ईमानदार सिफारिश — बहुत अच्छी रूपांतरण दर।',
    ctag4: 'छुट्टी लेख',
    ch4_4: '"अगर छुट्टियों में कुछ गलत हो जाए तो क्या करें?"',
    cp4: 'चोरी, दुर्घटना, होटल विवाद — अत्यधिक शेयर करने योग्य, सदाबहार।',
    ctag5: 'गाइड',
    ch4_5: '"विदेश यात्रा से पहले सुरक्षा चेकलिस्ट"',
    cp5: 'व्यापक रूप से साझा किया गया सदाबहार सामग्री — केंद्रीय संसाधन के रूप में SOS-Expat.com।',
    ctag6: 'पॉडकास्ट / साक्षात्कार',
    ch4_6: 'संस्थापक का विशेष साक्षात्कार',
    cp6: 'Williams Jullin उपलब्ध — उद्यमिता, प्रवासी जीवन, सामाजिक प्रभाव।',
    sec4_h2: 'आपको क्या मिलता है',
    perk1: '<strong>व्यक्तिगत एफिलिएट लिंक</strong> + रियल-टाइम डैशबोर्ड',
    perk2: '<strong>पूर्ण डेमो खाता एक्सेस</strong> — प्लेटफॉर्म को वास्तविक उपयोगकर्ता की तरह टेस्ट करें',
    perk3: '<strong>एचडी विजुअल किट</strong> — स्क्रीनशॉट, वीडियो, इन्फोग्राफिक्स प्रकाशन के लिए तैयार',
    perk4: '<strong>संस्थापक साक्षात्कार</strong> — कोई भी फॉर्मेट, कोई भी टाइमज़ोन',
    perk5: '<strong>24 घंटे में जवाब</strong> — न्यूनतम दर्शक संख्या की कोई आवश्यकता नहीं',
    quote: 'हम विज्ञापनदाता नहीं ढूंढते। हम ऐसे भागीदार ढूंढते हैं जो जो वे अनुशंसा करते हैं उस पर विश्वास करते हैं।',
    attr_title: 'संस्थापक &amp; CEO, SOS-Expat.com — टालिन, एस्टोनिया',
    cta_h3: 'प्रोग्राम में शामिल हों',
    cta_p: 'एक ईमेल काफी है। 24 घंटे में जवाब। न्यूनतम दर्शक की जरूरत नहीं।',
    cta_email_subject: 'क्रिएटर पार्टनरशिप — [आपका ब्लॉग/चैनल]',
    cta_subject_label: 'विषय:',
    contact_h3: 'पार्टनरशिप संपर्क',
    contact1_val: 'Williams Jullin — संस्थापक &amp; CEO',
    contact4_lbl: 'उपलब्धता',
    contact4_val: 'तत्काल — कोई भी टाइमज़ोन',
    kit1: '🔗 एफिलिएट लिंक',
    kit2: '🖥 डेमो एक्सेस',
    kit3: '📸 एचडी विजुअल किट',
    kit4: '🎙 संस्थापक साक्षात्कार',
    kit5: '⚡ 24 घंटे जवाब',
    footer_legal: 'SOS-Expat.com — एस्टोनिया में पंजीकृत कंपनी — टालिन, एस्टोनिया',
  },
  ar: {
    html_lang: 'ar',
    dir: 'rtl',
    title: 'SOS-Expat.com — بيان صحفي — المدونون ومنشئو المحتوى',
    tagline: 'خدمة الطوارئ العالمية · 197 دولة · 24/7',
    badge: 'شراكة المبدعين',
    date: '5 أبريل 2026',
    kicker: 'بيان صحفي — مدونو السفر، منشئو المحتوى &amp; المؤثرون',
    h1: 'تحدث عما يهم —<br><em>واحصل على أجر على ذلك.</em>',
    deck: 'يربط SOS-Expat.com كل مسافر أو مغترب بخبير اختاره — مكالمة عودة مضمونة في أقل من 5 دقائق، 197 دولة، جميع اللغات، 24/7. <strong>جمهورك يحتاج هذا. لدينا برنامج لك.</strong>',
    stat1_lbl: 'مغترب حول العالم',
    stat2_lbl: 'لكل مكالمة عبر رابطك',
    stat3_lbl: 'دولة مغطاة 24/7',
    stat4_lbl: 'منافس موجود',
    sec1_h2: 'جمهورك هو المستهدف بالضبط',
    sec1_p: 'المسافرون، المغتربون، المصطافون، الرحالة الرقميون، الطلاب في الخارج — <strong>كل قارئ من قرائك عاش أو يخاطر بمواجهة طارئ بعيداً عن وطنه.</strong> حادث، اعتقال، ترحيل، استشفاء. لم يكن ثمة حل قبل اليوم.',
    card1_h4: 'مدونة السفر &amp; المصطافون',
    card1_p: 'سرقة، حادث، استشفاء — SOS-Expat.com هو الإجابة الملموسة على هذه المخاطر غير المرئية.',
    card2_h4: 'الاغتراب &amp; الانتقال',
    card2_p: 'مجال تخصصك في صميم الهدف. قراؤك بحاجة دائمة إلى هذه الخدمة.',
    card3_h4: 'الرحّالة الرقمي',
    card3_p: '35 مليون رحّالة بلا شبكة أمان محلية. أول خدمة مصممة لهم.',
    card4_h4: 'الطلاب &amp; العائلات في الخارج',
    card4_p: 'إيراسموس، البرامج التبادلية، الأطفال في الرحلات الدراسية. طوارئ بلا شبكة محلية أو لغة.',
    sec2_h2: 'برنامج الانتساب',
    amount_label: 'لكل مكالمة تولّدت عبر رابطك — <strong>مدفوع من المكالمة الأولى</strong>',
    affil1: 'لا حد للعمولات',
    affil2: 'نافذة تتبع الكوكيز',
    affil3: 'لوحة تحكم في الوقت الفعلي',
    sec3_h2: 'أفكار محتوى جاهزة للاستخدام',
    ctag1: 'مقال / مدونة',
    ch4_1: '"ما الذي كنت أتمنى امتلاكه خلال أسوأ طارئ واجهته في الخارج"',
    cp1: 'سرد القصص + تقديم طبيعي للحل.',
    ctag2: 'فيديو / ريل',
    ch4_2: '"ماذا تفعل إذا اعتُقلت في الخارج؟"',
    cp2: 'محتوى أمان المسافرين + عرض توضيحي سريع للمنصة.',
    ctag3: 'نشرة إخبارية',
    ch4_3: '"الخدمة التي كنت أتمنى معرفتها قبل الاغتراب"',
    cp3: 'توصية صادقة — معدل تحويل ممتاز.',
    ctag4: 'مقال إجازة',
    ch4_4: '"ماذا تفعل إذا ساءت أحوال إجازتك؟"',
    cp4: 'سرقة، حادث، نزاع فندق — قابل للمشاركة الواسعة، محتوى دائم.',
    ctag5: 'دليل',
    ch4_5: '"قائمة الأمان قبل السفر إلى الخارج"',
    cp5: 'محتوى دائم يُشارك على نطاق واسع — SOS-Expat.com كمورد مركزي.',
    ctag6: 'بودكاست / مقابلة',
    ch4_6: 'مقابلة حصرية مع المؤسس',
    cp6: 'Williams Jullin متاح — ريادة الأعمال، الحياة كمغترب، التأثير الاجتماعي.',
    sec4_h2: 'ما الذي تحصل عليه',
    perk1: '<strong>رابط انتساب شخصي</strong> + لوحة تحكم في الوقت الفعلي',
    perk2: '<strong>وصول كامل لحساب تجريبي</strong> — اختبر المنصة كمستخدم حقيقي',
    perk3: '<strong>مجموعة بصرية عالية الدقة</strong> — لقطات شاشة، فيديوهات، رسوم بيانية جاهزة للنشر',
    perk4: '<strong>مقابلة المؤسس</strong> — أي تنسيق، أي منطقة زمنية',
    perk5: '<strong>رد خلال 24 ساعة</strong> — لا يُشترط حد أدنى للجمهور',
    quote: 'لا نبحث عن معلنين. نبحث عن شركاء يؤمنون بما يوصون به.',
    attr_title: 'المؤسس &amp; الرئيس التنفيذي، SOS-Expat.com — تالين، إستونيا',
    cta_h3: 'الانضمام إلى البرنامج',
    cta_p: 'يكفي بريد إلكتروني واحد. رد خلال 24 ساعة. لا حد أدنى للجمهور.',
    cta_email_subject: 'شراكة المبدع — [مدونتك/قناتك]',
    cta_subject_label: 'الموضوع:',
    contact_h3: 'تواصل بشأن الشراكات',
    contact1_val: 'ويليامز جولان — المؤسس &amp; الرئيس التنفيذي',
    contact4_lbl: 'التوفر',
    contact4_val: 'فوري — أي منطقة زمنية',
    kit1: '🔗 رابط الانتساب',
    kit2: '🖥 الوصول التجريبي',
    kit3: '📸 مجموعة بصرية عالية الدقة',
    kit4: '🎙 مقابلة المؤسس',
    kit5: '⚡ رد 24 ساعة',
    footer_legal: 'SOS-Expat.com — شركة مسجلة في إستونيا — تالين، إستونيا',
  },
};

// ─── Traductions CP5 ─────────────────────────────────────────────────────────
const T_CP5 = {
  fr: {
    html_lang: 'fr',
    dir: 'ltr',
    title: 'SOS-Expat.com — Communiqué Administrateurs de Communautés',
    tagline: "Service d'urgence mondial · 197 pays · 24h/7j",
    badge: 'Communautés &amp; Admins',
    date: '5 avril 2026',
    kicker: 'Communiqué — Administrateurs de Groupes &amp; Forums',
    h1: 'Vos membres posent des urgences —<br><em>voici la réponse.</em>',
    deck: 'Dans votre groupe, chaque semaine, quelqu\'un écrit : <strong>"Besoin d\'un avocat urgent à Dubaï"</strong>, <strong>"Mon fils arrêté en Thaïlande"</strong>, <strong>"Accident à Bali, assurance injoignable"</strong>. SOS-Expat.com est enfin la ressource concrète à donner.',
    stat1_lbl: 'Expatriés dans le monde',
    stat2_lbl: 'Pays couverts 24h/7j',
    stat3_lbl: 'Rappel garanti expert choisi',
    stat4_lbl: "Service équivalent avant aujourd'hui",
    sec1_h2: 'Ces posts que vous voyez chaque semaine',
    sec1_p: "Dans tout groupe expat ou voyage actif, les urgences sont une réalité. Vos membres vous font confiance — mais jusqu'à aujourd'hui, <strong>aucune ressource universelle et immédiate n'existait.</strong>",
    urgence1_tag: 'FACEBOOK',
    urgence1_text: '<strong>"URGENT — Avocat francophone à Kuala Lumpur MAINTENANT"</strong> — 47 commentaires, aucune solution concrète.',
    urgence2_tag: 'FORUM',
    urgence2_text: '<strong>"Accident en Turquie, assurance muette, police demande un traducteur"</strong> — 3 pages, redirections inutiles.',
    urgence3_tag: 'WHATSAPP',
    urgence3_text: '<strong>"Expulsée de mon appart à Bangkok à minuit. Consulat fermé. Aide svp"</strong> — bonne volonté, pas d\'expert.',
    urgence4_tag: 'TELEGRAM',
    urgence4_text: '<strong>"Visa refusé à la frontière thaï, bloqué à l\'aéroport, vol dans 2h"</strong> — panique, conseils contradictoires.',
    urgence5_tag: 'REDDIT',
    urgence5_text: '<strong>"Hospitalisation à Medellín, famille non-hispanophone, besoin traduction médicale"</strong> — upvotes, pas de solution.',
    after_urgences_p: '<strong>À partir d\'aujourd\'hui, vous avez une réponse concrète à épingler.</strong>',
    sec2_h2: 'Comment ça fonctionne — en 3 étapes',
    step1_h4: 'Le membre décrit sa situation',
    step1_p: "Depuis sos-expat.com — pays, langue, type d'urgence. En quelques secondes, 24h/24.",
    step2_h4: 'Il choisit son expert',
    step2_p: "Avocats certifiés ou expatriés aidants vérifiés — filtrés par pays, langue, spécialité et avis clients.",
    step3_h4: "L'expert rappelle — garanti en moins de 5 minutes",
    step3_p: "Dans sa langue. Partout dans le monde. Nuit et jour. Paiement direct à l'expert.",
    sec3_h2: 'Pour quels groupes',
    card1_platform: '📘 Facebook',
    card1_h4: 'Groupes expat par pays',
    card1_p: '"Français à Bangkok", "Expats à Dubaï"... La ressource permanente à épingler en haut du groupe.',
    card1_members: '5 000 à 500 000+ membres',
    card2_platform: '🌐 Forums',
    card2_h4: 'Forums voyage &amp; routards',
    card2_p: "Les urgences représentent une part majeure des fils actifs — sans jamais avoir de réponse opérationnelle.",
    card2_members: 'Des millions de visiteurs / mois',
    card3_platform: '💬 WhatsApp / Telegram',
    card3_h4: 'Groupes de messagerie',
    card3_p: "Premier réflexe en urgence — mais aucun membre n'est expert juridique. Un lien épinglé change tout.",
    card3_members: '50 à 5 000 membres actifs',
    card4_platform: '🎮 Reddit / Discord',
    card4_h4: 'Communautés numériques',
    card4_p: "r/expats, r/digitalnomad, r/solotravel — audiences jeunes, mobiles, très exposées aux urgences.",
    card4_members: '100K à 1M+ membres',
    sec4_h2: 'Post clé en main — à épingler maintenant',
    cp_label: '📌 À copier-coller directement dans votre groupe',
    cp_strong: 'RESSOURCE ÉPINGLÉE — Urgences à l\'étranger',
    cp_text1: "Besoin d'un avocat, d'un traducteur ou d'une aide urgente dans un pays étranger ?",
    cp_text3: 'Partagez ce lien à tout membre qui en a besoin.',
    sec5_h2: 'Ce que nous vous fournissons',
    perk1: '<strong>Posts prêts à publier</strong> — Facebook, forum, WhatsApp, Telegram, Reddit, Discord',
    perk2: '<strong>Visuels et bannières</strong> adaptés à chaque plateforme — formats HD fournis',
    perk3: '<strong>Guide "Urgences à l\'étranger"</strong> personnalisable par pays — document complet à partager',
    perk4: '<strong>Lien de suivi dédié</strong> — tableau de bord temps réel, 10$ par appel généré',
    perk5: '<strong>Intervention du fondateur</strong> dans votre groupe — live, Q&amp;A, post de présentation',
    quote: "Les admins de groupes expat sont en première ligne quand leurs membres vivent une urgence. Ils méritent une vraie réponse — pas juste de la bonne volonté.",
    attr_title: 'Fondateur &amp; CEO, SOS-Expat.com — Tallinn, Estonie',
    cta_h3: 'Obtenez le kit communauté gratuit',
    cta_p: 'Posts prêts, visuels, guide urgences, lien de suivi — tout gratuit. Réponse sous 24h.',
    cta_email_subject: 'Kit Communauté — [Nom de votre groupe]',
    cta_subject_label: 'Objet :',
    contact_h3: 'Contact partenariats communautés',
    contact1_val: 'Williams Jullin — Fondateur &amp; CEO',
    contact4_lbl: 'Disponibilité',
    contact4_val: 'Immédiate — tout fuseau horaire',
    kit1: '📌 Posts prêts',
    kit2: '🖼 Visuels HD',
    kit3: '📋 Guide urgences',
    kit4: '🔗 Lien de suivi',
    kit5: '🎙 Intervention fondateur',
    footer_legal: 'SOS-Expat.com — Société enregistrée en Estonie — Tallinn, Estonie',
  },
  en: {
    html_lang: 'en',
    dir: 'ltr',
    title: 'SOS-Expat.com — Press Release — Community Administrators',
    tagline: 'Global emergency service · 197 countries · 24/7',
    badge: 'Communities &amp; Admins',
    date: 'April 5, 2026',
    kicker: 'Press Release — Group &amp; Forum Administrators',
    h1: 'Your members post emergencies —<br><em>here is the answer.</em>',
    deck: 'Every week in your group, someone writes: <strong>"Need an urgent lawyer in Dubai"</strong>, <strong>"My son arrested in Thailand"</strong>, <strong>"Accident in Bali, insurance unreachable"</strong>. SOS-Expat.com is finally the concrete resource to give.',
    stat1_lbl: 'Expats worldwide',
    stat2_lbl: 'Countries covered 24/7',
    stat3_lbl: 'Guaranteed callback chosen expert',
    stat4_lbl: 'Equivalent service before today',
    sec1_h2: 'These posts you see every week',
    sec1_p: 'In any active expat or travel group, emergencies are a reality. Your members trust you — but until today, <strong>no universal and immediate resource existed.</strong>',
    urgence1_tag: 'FACEBOOK',
    urgence1_text: '<strong>"URGENT — French-speaking lawyer in Kuala Lumpur NOW"</strong> — 47 comments, no concrete solution.',
    urgence2_tag: 'FORUM',
    urgence2_text: '<strong>"Accident in Turkey, insurance silent, police needs a translator"</strong> — 3 pages, useless redirections.',
    urgence3_tag: 'WHATSAPP',
    urgence3_text: '<strong>"Evicted from my apartment in Bangkok at midnight. Consulate closed. Help please"</strong> — goodwill, no expert.',
    urgence4_tag: 'TELEGRAM',
    urgence4_text: '<strong>"Visa refused at Thai border, stuck at airport, flight in 2h"</strong> — panic, contradictory advice.',
    urgence5_tag: 'REDDIT',
    urgence5_text: '<strong>"Hospitalization in Medellín, non-Spanish-speaking family, need medical translation"</strong> — upvotes, no solution.',
    after_urgences_p: '<strong>From today, you have a concrete answer to pin.</strong>',
    sec2_h2: 'How it works — in 3 steps',
    step1_h4: 'The member describes their situation',
    step1_p: 'From sos-expat.com — country, language, type of emergency. In seconds, 24/7.',
    step2_h4: 'They choose their expert',
    step2_p: 'Certified lawyers or verified expat helpers — filtered by country, language, specialty and reviews.',
    step3_h4: 'The expert calls back — guaranteed in under 5 minutes',
    step3_p: 'In their language. Anywhere in the world. Day and night. Direct payment to the expert.',
    sec3_h2: 'For which groups',
    card1_platform: '📘 Facebook',
    card1_h4: 'Expat groups by country',
    card1_p: '"French in Bangkok", "Expats in Dubai"... The permanent resource to pin at the top of the group.',
    card1_members: '5,000 to 500,000+ members',
    card2_platform: '🌐 Forums',
    card2_h4: 'Travel &amp; backpacker forums',
    card2_p: 'Emergencies represent a major part of active threads — without ever having an operational answer.',
    card2_members: 'Millions of visitors / month',
    card3_platform: '💬 WhatsApp / Telegram',
    card3_h4: 'Messaging groups',
    card3_p: 'First reflex in an emergency — but no member is a legal expert. A pinned link changes everything.',
    card3_members: '50 to 5,000 active members',
    card4_platform: '🎮 Reddit / Discord',
    card4_h4: 'Digital communities',
    card4_p: 'r/expats, r/digitalnomad, r/solotravel — young, mobile audiences, highly exposed to emergencies.',
    card4_members: '100K to 1M+ members',
    sec4_h2: 'Ready-to-pin post — pin it now',
    cp_label: '📌 Copy-paste directly to your group',
    cp_strong: 'PINNED RESOURCE — Emergencies abroad',
    cp_text1: 'Need a lawyer, translator or urgent help in a foreign country?',
    cp_text3: 'Share this link with any member who needs it.',
    sec5_h2: 'What we provide you',
    perk1: '<strong>Ready-to-publish posts</strong> — Facebook, forum, WhatsApp, Telegram, Reddit, Discord',
    perk2: '<strong>Visuals and banners</strong> adapted to each platform — HD formats provided',
    perk3: '<strong>Guide "Emergencies Abroad"</strong> customizable by country — complete document to share',
    perk4: '<strong>Dedicated tracking link</strong> — real-time dashboard, $10 per call generated',
    perk5: '<strong>Founder intervention</strong> in your group — live, Q&amp;A, presentation post',
    quote: "Expat group admins are on the front line when their members face an emergency. They deserve a real answer — not just goodwill.",
    attr_title: 'Founder &amp; CEO, SOS-Expat.com — Tallinn, Estonia',
    cta_h3: 'Get the free community kit',
    cta_p: 'Ready posts, visuals, emergency guide, tracking link — all free. 24h response.',
    cta_email_subject: 'Community Kit — [Your group name]',
    cta_subject_label: 'Subject:',
    contact_h3: 'Community partnerships contact',
    contact1_val: 'Williams Jullin — Founder &amp; CEO',
    contact4_lbl: 'Availability',
    contact4_val: 'Immediate — any timezone',
    kit1: '📌 Ready posts',
    kit2: '🖼 HD visuals',
    kit3: '📋 Emergency guide',
    kit4: '🔗 Tracking link',
    kit5: '🎙 Founder intervention',
    footer_legal: 'SOS-Expat.com — Registered company in Estonia — Tallinn, Estonia',
  },
  es: {
    html_lang: 'es',
    dir: 'ltr',
    title: 'SOS-Expat.com — Comunicado — Administradores de Comunidades',
    tagline: 'Servicio de emergencia mundial · 197 países · 24h/7j',
    badge: 'Comunidades &amp; Admins',
    date: '5 de abril de 2026',
    kicker: 'Comunicado — Administradores de Grupos &amp; Foros',
    h1: 'Tus miembros publican emergencias —<br><em>aquí está la respuesta.</em>',
    deck: 'Cada semana en tu grupo, alguien escribe: <strong>"Necesito un abogado urgente en Dubái"</strong>, <strong>"Mi hijo detenido en Tailandia"</strong>, <strong>"Accidente en Bali, seguro inaccesible"</strong>. SOS-Expat.com es finalmente el recurso concreto a dar.',
    stat1_lbl: 'Expatriados en el mundo',
    stat2_lbl: 'Países cubiertos 24/7',
    stat3_lbl: 'Devolución garantizada experto elegido',
    stat4_lbl: 'Servicio equivalente antes de hoy',
    sec1_h2: 'Estas publicaciones que ves cada semana',
    sec1_p: 'En cualquier grupo activo de expats o viajes, las emergencias son una realidad. Tus miembros confían en ti — pero hasta hoy, <strong>no existía ningún recurso universal e inmediato.</strong>',
    urgence1_tag: 'FACEBOOK',
    urgence1_text: '<strong>"URGENTE — Abogado hispanohablante en Kuala Lumpur AHORA"</strong> — 47 comentarios, ninguna solución concreta.',
    urgence2_tag: 'FORO',
    urgence2_text: '<strong>"Accidente en Turquía, seguro mudo, policía pide un traductor"</strong> — 3 páginas, redirecciones inútiles.',
    urgence3_tag: 'WHATSAPP',
    urgence3_text: '<strong>"Desalojada de mi apartamento en Bangkok a medianoche. Consulado cerrado. Ayuda por favor"</strong> — buena voluntad, sin experto.',
    urgence4_tag: 'TELEGRAM',
    urgence4_text: '<strong>"Visa rechazada en la frontera tailandesa, atascado en el aeropuerto, vuelo en 2h"</strong> — pánico, consejos contradictorios.',
    urgence5_tag: 'REDDIT',
    urgence5_text: '<strong>"Hospitalización en Medellín, familia no hispanohablante, necesita traducción médica"</strong> — upvotes, sin solución.',
    after_urgences_p: '<strong>A partir de hoy, tienes una respuesta concreta para fijar.</strong>',
    sec2_h2: 'Cómo funciona — en 3 pasos',
    step1_h4: 'El miembro describe su situación',
    step1_p: 'Desde sos-expat.com — país, idioma, tipo de emergencia. En segundos, 24/7.',
    step2_h4: 'Elige su experto',
    step2_p: 'Abogados certificados o auxiliares expat verificados — filtrados por país, idioma, especialidad y reseñas.',
    step3_h4: 'El experto llama de vuelta — garantizado en menos de 5 minutos',
    step3_p: 'En su idioma. En cualquier parte del mundo. Noche y día. Pago directo al experto.',
    sec3_h2: 'Para qué grupos',
    card1_platform: '📘 Facebook',
    card1_h4: 'Grupos expat por país',
    card1_p: '"Españoles en Bangkok", "Expats en Dubái"... El recurso permanente a fijar en la parte superior del grupo.',
    card1_members: '5.000 a 500.000+ miembros',
    card2_platform: '🌐 Foros',
    card2_h4: 'Foros de viaje &amp; mochileros',
    card2_p: 'Las emergencias representan una parte importante de los hilos activos — sin tener nunca una respuesta operacional.',
    card2_members: 'Millones de visitantes / mes',
    card3_platform: '💬 WhatsApp / Telegram',
    card3_h4: 'Grupos de mensajería',
    card3_p: 'Primer reflejo en una emergencia — pero ningún miembro es experto jurídico. Un enlace fijado lo cambia todo.',
    card3_members: '50 a 5.000 miembros activos',
    card4_platform: '🎮 Reddit / Discord',
    card4_h4: 'Comunidades digitales',
    card4_p: 'r/expats, r/digitalnomad, r/solotravel — audiencias jóvenes, móviles, muy expuestas a emergencias.',
    card4_members: '100K a 1M+ miembros',
    sec4_h2: 'Post listo para fijar — fíjalo ahora',
    cp_label: '📌 Copia y pega directamente en tu grupo',
    cp_strong: 'RECURSO FIJADO — Emergencias en el extranjero',
    cp_text1: '¿Necesitas un abogado, traductor o ayuda urgente en un país extranjero?',
    cp_text3: 'Comparte este enlace con cualquier miembro que lo necesite.',
    sec5_h2: 'Lo que te proporcionamos',
    perk1: '<strong>Posts listos para publicar</strong> — Facebook, foro, WhatsApp, Telegram, Reddit, Discord',
    perk2: '<strong>Visuales y banners</strong> adaptados a cada plataforma — formatos HD proporcionados',
    perk3: '<strong>Guía "Emergencias en el extranjero"</strong> personalizable por país — documento completo para compartir',
    perk4: '<strong>Enlace de seguimiento dedicado</strong> — panel en tiempo real, $10 por llamada generada',
    perk5: '<strong>Intervención del fundador</strong> en tu grupo — en vivo, Q&amp;A, post de presentación',
    quote: "Los admins de grupos expat están en primera línea cuando sus miembros viven una emergencia. Merecen una respuesta real — no solo buena voluntad.",
    attr_title: 'Fundador &amp; CEO, SOS-Expat.com — Tallin, Estonia',
    cta_h3: 'Obtén el kit comunidad gratuito',
    cta_p: 'Posts listos, visuales, guía de emergencias, enlace de seguimiento — todo gratis. Respuesta en 24h.',
    cta_email_subject: 'Kit Comunidad — [Nombre de tu grupo]',
    cta_subject_label: 'Asunto:',
    contact_h3: 'Contacto de asociaciones comunitarias',
    contact1_val: 'Williams Jullin — Fundador &amp; CEO',
    contact4_lbl: 'Disponibilidad',
    contact4_val: 'Inmediata — cualquier zona horaria',
    kit1: '📌 Posts listos',
    kit2: '🖼 Visuales HD',
    kit3: '📋 Guía emergencias',
    kit4: '🔗 Enlace seguimiento',
    kit5: '🎙 Intervención fundador',
    footer_legal: 'SOS-Expat.com — Empresa registrada en Estonia — Tallin, Estonia',
  },
  de: {
    html_lang: 'de',
    dir: 'ltr',
    title: 'SOS-Expat.com — Pressemitteilung — Gemeinschaftsadministratoren',
    tagline: 'Globaler Notfalldienst · 197 Länder · 24/7',
    badge: 'Gemeinschaften &amp; Admins',
    date: '5. April 2026',
    kicker: 'Pressemitteilung — Gruppen- &amp; Forumsadministratoren',
    h1: 'Deine Mitglieder posten Notfälle —<br><em>hier ist die Antwort.</em>',
    deck: 'Jede Woche schreibt jemand in deiner Gruppe: <strong>"Brauche dringend Anwalt in Dubai"</strong>, <strong>"Mein Sohn in Thailand verhaftet"</strong>, <strong>"Unfall auf Bali, Versicherung nicht erreichbar"</strong>. SOS-Expat.com ist endlich die konkrete Ressource zu geben.',
    stat1_lbl: 'Expatriates weltweit',
    stat2_lbl: 'Länder 24/7 abgedeckt',
    stat3_lbl: 'Garantierter Rückruf gewählter Experte',
    stat4_lbl: 'Gleichwertiger Service vor heute',
    sec1_h2: 'Diese Beiträge, die du jede Woche siehst',
    sec1_p: 'In jeder aktiven Expat- oder Reisegruppe sind Notfälle Realität. Deine Mitglieder vertrauen dir — aber bis heute <strong>existierte keine universelle und sofortige Ressource.</strong>',
    urgence1_tag: 'FACEBOOK',
    urgence1_text: '<strong>"DRINGEND — Deutschsprachiger Anwalt in Kuala Lumpur JETZT"</strong> — 47 Kommentare, keine konkrete Lösung.',
    urgence2_tag: 'FORUM',
    urgence2_text: '<strong>"Unfall in der Türkei, Versicherung schweigt, Polizei braucht Übersetzer"</strong> — 3 Seiten, nutzlose Weiterleitungen.',
    urgence3_tag: 'WHATSAPP',
    urgence3_text: '<strong>"Mitten in der Nacht aus meiner Wohnung in Bangkok geworfen. Konsulat geschlossen. Hilfe bitte"</strong> — Guter Wille, kein Experte.',
    urgence4_tag: 'TELEGRAM',
    urgence4_text: '<strong>"Visum an der thailändischen Grenze verweigert, am Flughafen festgehalten, Flug in 2h"</strong> — Panik, widersprüchliche Ratschläge.',
    urgence5_tag: 'REDDIT',
    urgence5_text: '<strong>"Krankenhausaufenthalt in Medellín, nicht-spanischsprachige Familie, braucht medizinische Übersetzung"</strong> — Upvotes, keine Lösung.',
    after_urgences_p: '<strong>Ab heute hast du eine konkrete Antwort zum Anpinnen.</strong>',
    sec2_h2: 'Wie es funktioniert — in 3 Schritten',
    step1_h4: 'Das Mitglied beschreibt seine Situation',
    step1_p: 'Über sos-expat.com — Land, Sprache, Art des Notfalls. In Sekunden, 24/7.',
    step2_h4: 'Es wählt seinen Experten',
    step2_p: 'Zertifizierte Anwälte oder verifizierte Expat-Helfer — gefiltert nach Land, Sprache, Fachgebiet und Bewertungen.',
    step3_h4: 'Der Experte ruft zurück — garantiert in unter 5 Minuten',
    step3_p: 'In seiner Sprache. Überall auf der Welt. Tag und Nacht. Direkte Zahlung an den Experten.',
    sec3_h2: 'Für welche Gruppen',
    card1_platform: '📘 Facebook',
    card1_h4: 'Expat-Gruppen nach Land',
    card1_p: '"Deutsche in Bangkok", "Expats in Dubai"... Die permanente Ressource, die oben in der Gruppe angepinnt wird.',
    card1_members: '5.000 bis 500.000+ Mitglieder',
    card2_platform: '🌐 Foren',
    card2_h4: 'Reise- &amp; Rucksacktouristen-Foren',
    card2_p: 'Notfälle machen einen großen Teil der aktiven Threads aus — ohne je eine einsatzbereite Antwort zu haben.',
    card2_members: 'Millionen Besucher / Monat',
    card3_platform: '💬 WhatsApp / Telegram',
    card3_h4: 'Messaging-Gruppen',
    card3_p: 'Erster Reflex im Notfall — aber kein Mitglied ist Rechtsexperte. Ein angepinnter Link verändert alles.',
    card3_members: '50 bis 5.000 aktive Mitglieder',
    card4_platform: '🎮 Reddit / Discord',
    card4_h4: 'Digitale Gemeinschaften',
    card4_p: 'r/expats, r/digitalnomad, r/solotravel — junge, mobile Zielgruppen, stark Notfällen ausgesetzt.',
    card4_members: '100K bis 1M+ Mitglieder',
    sec4_h2: 'Fertiger Beitrag — jetzt anpinnen',
    cp_label: '📌 Direkt in deine Gruppe kopieren und einfügen',
    cp_strong: 'ANGEPINNTE RESSOURCE — Notfälle im Ausland',
    cp_text1: 'Brauchst du einen Anwalt, Übersetzer oder dringende Hilfe in einem fremden Land?',
    cp_text3: 'Teile diesen Link mit jedem Mitglied, das ihn braucht.',
    sec5_h2: 'Was wir dir bereitstellen',
    perk1: '<strong>Veröffentlichungsfertige Beiträge</strong> — Facebook, Forum, WhatsApp, Telegram, Reddit, Discord',
    perk2: '<strong>Grafiken und Banner</strong> für jede Plattform angepasst — HD-Formate bereitgestellt',
    perk3: '<strong>Leitfaden "Notfälle im Ausland"</strong> nach Land anpassbar — vollständiges Dokument zum Teilen',
    perk4: '<strong>Dedizierter Tracking-Link</strong> — Echtzeit-Dashboard, $10 pro generiertem Anruf',
    perk5: '<strong>Gründereintritt</strong> in deine Gruppe — live, Q&amp;A, Vorstellungspost',
    quote: "Admins von Expat-Gruppen stehen an vorderster Front, wenn ihre Mitglieder einen Notfall erleben. Sie verdienen eine echte Antwort — nicht nur guten Willen.",
    attr_title: 'Gründer &amp; CEO, SOS-Expat.com — Tallinn, Estland',
    cta_h3: 'Hol dir das kostenlose Community-Kit',
    cta_p: 'Fertige Beiträge, Grafiken, Notfallratgeber, Tracking-Link — alles kostenlos. 24h-Antwort.',
    cta_email_subject: 'Community-Kit — [Name deiner Gruppe]',
    cta_subject_label: 'Betreff:',
    contact_h3: 'Community-Partnerschaftskontakt',
    contact1_val: 'Williams Jullin — Gründer &amp; CEO',
    contact4_lbl: 'Verfügbarkeit',
    contact4_val: 'Sofort — jede Zeitzone',
    kit1: '📌 Fertige Beiträge',
    kit2: '🖼 HD-Grafiken',
    kit3: '📋 Notfallratgeber',
    kit4: '🔗 Tracking-Link',
    kit5: '🎙 Gründereintritt',
    footer_legal: 'SOS-Expat.com — Registriertes Unternehmen in Estland — Tallinn, Estland',
  },
  pt: {
    html_lang: 'pt',
    dir: 'ltr',
    title: 'SOS-Expat.com — Comunicado — Administradores de Comunidades',
    tagline: 'Serviço de emergência global · 197 países · 24h/7j',
    badge: 'Comunidades &amp; Admins',
    date: '5 de abril de 2026',
    kicker: 'Comunicado — Administradores de Grupos &amp; Fóruns',
    h1: 'Os seus membros publicam emergências —<br><em>aqui está a resposta.</em>',
    deck: 'Todas as semanas no seu grupo, alguém escreve: <strong>"Preciso de um advogado urgente no Dubai"</strong>, <strong>"O meu filho detido na Tailândia"</strong>, <strong>"Acidente em Bali, seguro incontactável"</strong>. SOS-Expat.com é finalmente o recurso concreto a dar.',
    stat1_lbl: 'Expatriados no mundo',
    stat2_lbl: 'Países cobertos 24/7',
    stat3_lbl: 'Retorno garantido especialista escolhido',
    stat4_lbl: 'Serviço equivalente antes de hoje',
    sec1_h2: 'Estas publicações que vê todas as semanas',
    sec1_p: 'Em qualquer grupo ativo de expats ou viagens, as emergências são uma realidade. Os seus membros confiam em si — mas até hoje, <strong>não existia nenhum recurso universal e imediato.</strong>',
    urgence1_tag: 'FACEBOOK',
    urgence1_text: '<strong>"URGENTE — Advogado lusófono em Kuala Lumpur AGORA"</strong> — 47 comentários, nenhuma solução concreta.',
    urgence2_tag: 'FÓRUM',
    urgence2_text: '<strong>"Acidente na Turquia, seguro mudo, polícia pede um tradutor"</strong> — 3 páginas, redirecionamentos inúteis.',
    urgence3_tag: 'WHATSAPP',
    urgence3_text: '<strong>"Despejada do meu apartamento em Bangkok à meia-noite. Consulado fechado. Ajuda por favor"</strong> — boa vontade, sem especialista.',
    urgence4_tag: 'TELEGRAM',
    urgence4_text: '<strong>"Visto recusado na fronteira tailandesa, preso no aeroporto, voo em 2h"</strong> — pânico, conselhos contraditórios.',
    urgence5_tag: 'REDDIT',
    urgence5_text: '<strong>"Hospitalização em Medellín, família não hispanófona, precisa de tradução médica"</strong> — upvotes, sem solução.',
    after_urgences_p: '<strong>A partir de hoje, tem uma resposta concreta para fixar.</strong>',
    sec2_h2: 'Como funciona — em 3 passos',
    step1_h4: 'O membro descreve a sua situação',
    step1_p: 'A partir de sos-expat.com — país, idioma, tipo de emergência. Em segundos, 24/7.',
    step2_h4: 'Escolhe o seu especialista',
    step2_p: 'Advogados certificados ou auxiliares expat verificados — filtrados por país, idioma, especialidade e avaliações.',
    step3_h4: 'O especialista liga de volta — garantido em menos de 5 minutos',
    step3_p: 'No seu idioma. Em qualquer parte do mundo. Dia e noite. Pagamento direto ao especialista.',
    sec3_h2: 'Para que grupos',
    card1_platform: '📘 Facebook',
    card1_h4: 'Grupos expat por país',
    card1_p: '"Portugueses em Bangkok", "Expats em Dubai"... O recurso permanente a fixar no topo do grupo.',
    card1_members: '5 000 a 500 000+ membros',
    card2_platform: '🌐 Fóruns',
    card2_h4: 'Fóruns de viagem &amp; mochileiros',
    card2_p: 'As emergências representam uma parte importante dos fios ativos — sem nunca ter uma resposta operacional.',
    card2_members: 'Milhões de visitantes / mês',
    card3_platform: '💬 WhatsApp / Telegram',
    card3_h4: 'Grupos de mensagens',
    card3_p: 'Primeiro reflexo numa emergência — mas nenhum membro é especialista jurídico. Um link fixado muda tudo.',
    card3_members: '50 a 5 000 membros ativos',
    card4_platform: '🎮 Reddit / Discord',
    card4_h4: 'Comunidades digitais',
    card4_p: 'r/expats, r/digitalnomad, r/solotravel — públicos jovens, móveis, muito expostos a emergências.',
    card4_members: '100K a 1M+ membros',
    sec4_h2: 'Publicação pronta a fixar — fixe agora',
    cp_label: '📌 Copiar e colar diretamente no seu grupo',
    cp_strong: 'RECURSO FIXADO — Emergências no estrangeiro',
    cp_text1: 'Precisa de um advogado, tradutor ou ajuda urgente num país estrangeiro?',
    cp_text3: 'Partilhe este link com qualquer membro que precise.',
    sec5_h2: 'O que lhe fornecemos',
    perk1: '<strong>Publicações prontas a publicar</strong> — Facebook, fórum, WhatsApp, Telegram, Reddit, Discord',
    perk2: '<strong>Visuais e banners</strong> adaptados a cada plataforma — formatos HD fornecidos',
    perk3: '<strong>Guia "Emergências no Estrangeiro"</strong> personalizável por país — documento completo para partilhar',
    perk4: '<strong>Link de rastreamento dedicado</strong> — painel em tempo real, $10 por chamada gerada',
    perk5: '<strong>Intervenção do fundador</strong> no seu grupo — ao vivo, Q&amp;A, post de apresentação',
    quote: "Os admins de grupos expat estão na linha da frente quando os seus membros vivem uma emergência. Merecem uma resposta real — não apenas boa vontade.",
    attr_title: 'Fundador &amp; CEO, SOS-Expat.com — Tallinn, Estónia',
    cta_h3: 'Obtenha o kit comunidade gratuito',
    cta_p: 'Publicações prontas, visuais, guia de emergências, link de rastreamento — tudo gratuito. Resposta em 24h.',
    cta_email_subject: 'Kit Comunidade — [Nome do seu grupo]',
    cta_subject_label: 'Assunto:',
    contact_h3: 'Contacto de parcerias comunitárias',
    contact1_val: 'Williams Jullin — Fundador &amp; CEO',
    contact4_lbl: 'Disponibilidade',
    contact4_val: 'Imediata — qualquer fuso horário',
    kit1: '📌 Publicações prontas',
    kit2: '🖼 Visuais HD',
    kit3: '📋 Guia emergências',
    kit4: '🔗 Link rastreamento',
    kit5: '🎙 Intervenção fundador',
    footer_legal: 'SOS-Expat.com — Empresa registada na Estónia — Tallinn, Estónia',
  },
  ru: {
    html_lang: 'ru',
    dir: 'ltr',
    title: 'SOS-Expat.com — Пресс-релиз — Администраторы Сообществ',
    tagline: 'Глобальная служба экстренной помощи · 197 стран · 24/7',
    badge: 'Сообщества &amp; Администраторы',
    date: '5 апреля 2026',
    kicker: 'Пресс-релиз — Администраторы Групп &amp; Форумов',
    h1: 'Ваши участники публикуют экстренные случаи —<br><em>вот ответ.</em>',
    deck: 'Каждую неделю в вашей группе кто-то пишет: <strong>"Срочно нужен адвокат в Дубае"</strong>, <strong>"Мой сын задержан в Таиланде"</strong>, <strong>"Авария на Бали, страховка недоступна"</strong>. SOS-Expat.com — наконец-то конкретный ресурс для предоставления.',
    stat1_lbl: 'Экспатов по всему миру',
    stat2_lbl: 'Стран охвачено 24/7',
    stat3_lbl: 'Гарантированный обратный звонок выбранного эксперта',
    stat4_lbl: 'Аналогичных сервисов до сегодня',
    sec1_h2: 'Эти публикации, которые вы видите каждую неделю',
    sec1_p: 'В любой активной группе экспатов или путешественников экстренные ситуации — реальность. Ваши участники доверяют вам — но до сегодняшнего дня <strong>не существовало универсального и немедленного ресурса.</strong>',
    urgence1_tag: 'FACEBOOK',
    urgence1_text: '<strong>"СРОЧНО — Русскоговорящий адвокат в Куала-Лумпуре СЕЙЧАС"</strong> — 47 комментариев, ни одного конкретного решения.',
    urgence2_tag: 'ФОРУМ',
    urgence2_text: '<strong>"Авария в Турции, страховка молчит, полиция просит переводчика"</strong> — 3 страницы, бесполезные перенаправления.',
    urgence3_tag: 'WHATSAPP',
    urgence3_text: '<strong>"Выгнали из квартиры в Бангкоке в полночь. Консульство закрыто. Помогите"</strong> — добрая воля, никакого эксперта.',
    urgence4_tag: 'TELEGRAM',
    urgence4_text: '<strong>"Отказали в визе на тайской границе, застрял в аэропорту, рейс через 2ч"</strong> — паника, противоречивые советы.',
    urgence5_tag: 'REDDIT',
    urgence5_text: '<strong>"Госпитализация в Медельине, семья не говорит по-испански, нужен медицинский перевод"</strong> — лайки, решения нет.',
    after_urgences_p: '<strong>Начиная с сегодняшнего дня, у вас есть конкретный ответ для закрепления.</strong>',
    sec2_h2: 'Как это работает — в 3 шага',
    step1_h4: 'Участник описывает свою ситуацию',
    step1_p: 'Через sos-expat.com — страна, язык, тип экстренной ситуации. За секунды, 24/7.',
    step2_h4: 'Он выбирает своего эксперта',
    step2_p: 'Сертифицированные юристы или проверенные помощники-экспаты — отфильтрованные по стране, языку, специальности и отзывам.',
    step3_h4: 'Эксперт перезванивает — гарантированно менее чем за 5 минут',
    step3_p: 'На его языке. Везде в мире. Днём и ночью. Прямая оплата эксперту.',
    sec3_h2: 'Для каких групп',
    card1_platform: '📘 Facebook',
    card1_h4: 'Группы экспатов по странам',
    card1_p: '"Русские в Бангкоке", "Экспаты в Дубае"... Постоянный ресурс для закрепления вверху группы.',
    card1_members: 'от 5 000 до 500 000+ участников',
    card2_platform: '🌐 Форумы',
    card2_h4: 'Туристические форумы &amp; форумы бэкпекеров',
    card2_p: 'Экстренные ситуации составляют значительную часть активных тем — без какого-либо операционного ответа.',
    card2_members: 'Миллионы посетителей / месяц',
    card3_platform: '💬 WhatsApp / Telegram',
    card3_h4: 'Мессенджер-группы',
    card3_p: 'Первый рефлекс в экстренной ситуации — но ни один участник не является юридическим экспертом. Закреплённая ссылка меняет всё.',
    card3_members: 'от 50 до 5 000 активных участников',
    card4_platform: '🎮 Reddit / Discord',
    card4_h4: 'Цифровые сообщества',
    card4_p: 'r/expats, r/digitalnomad, r/solotravel — молодые, мобильные аудитории, активно сталкивающиеся с экстренными ситуациями.',
    card4_members: 'от 100K до 1M+ участников',
    sec4_h2: 'Готовый пост — закрепите сейчас',
    cp_label: '📌 Скопируйте и вставьте прямо в вашу группу',
    cp_strong: 'ЗАКРЕПЛЁННЫЙ РЕСУРС — Экстренные ситуации за рубежом',
    cp_text1: 'Нужен адвокат, переводчик или срочная помощь в иностранном государстве?',
    cp_text3: 'Поделитесь этой ссылкой с любым участником, которому это нужно.',
    sec5_h2: 'Что мы предоставляем вам',
    perk1: '<strong>Готовые к публикации посты</strong> — Facebook, форум, WhatsApp, Telegram, Reddit, Discord',
    perk2: '<strong>Визуальные материалы и баннеры</strong> для каждой платформы — HD-форматы предоставлены',
    perk3: '<strong>Руководство "Экстренные ситуации за рубежом"</strong> с настройкой по стране — полный документ для распространения',
    perk4: '<strong>Выделенная ссылка отслеживания</strong> — дашборд в реальном времени, $10 за каждый звонок',
    perk5: '<strong>Участие основателя</strong> в вашей группе — прямой эфир, Q&amp;A, вступительный пост',
    quote: "Администраторы групп экспатов стоят на передовой, когда их участники сталкиваются с экстренной ситуацией. Они заслуживают реального ответа — а не просто доброй воли.",
    attr_title: 'Основатель &amp; CEO, SOS-Expat.com — Таллин, Эстония',
    cta_h3: 'Получите бесплатный комьюнити-кит',
    cta_p: 'Готовые посты, визуальные материалы, руководство по экстренным ситуациям, ссылка отслеживания — всё бесплатно. Ответ в течение 24ч.',
    cta_email_subject: 'Комьюнити-кит — [Название вашей группы]',
    cta_subject_label: 'Тема:',
    contact_h3: 'Контакт по партнёрству с сообществами',
    contact1_val: 'Уильямс Джуллин — Основатель &amp; CEO',
    contact4_lbl: 'Доступность',
    contact4_val: 'Немедленная — любой часовой пояс',
    kit1: '📌 Готовые посты',
    kit2: '🖼 HD-визуальные материалы',
    kit3: '📋 Руководство по ЧС',
    kit4: '🔗 Ссылка отслеживания',
    kit5: '🎙 Участие основателя',
    footer_legal: 'SOS-Expat.com — Компания, зарегистрированная в Эстонии — Таллин, Эстония',
  },
  zh: {
    html_lang: 'zh',
    dir: 'ltr',
    title: 'SOS-Expat.com — 新闻稿 — 社区管理员',
    tagline: '全球紧急服务 · 197个国家 · 24小时全天候',
    badge: '社区 &amp; 管理员',
    date: '2026年4月5日',
    kicker: '新闻稿 — 群组 &amp; 论坛管理员',
    h1: '您的成员发布紧急情况 —<br><em>这就是答案。</em>',
    deck: '每周在您的群组中，有人写道：<strong>"紧急需要在迪拜的律师"</strong>，<strong>"我儿子在泰国被捕"</strong>，<strong>"在巴厘岛发生事故，保险无法联系"</strong>。SOS-Expat.com终于是可以给出的具体资源。',
    stat1_lbl: '全球外籍人士',
    stat2_lbl: '24/7覆盖国家',
    stat3_lbl: '保证回电所选专家',
    stat4_lbl: '今天之前的同等服务',
    sec1_h2: '这些您每周都能看到的帖子',
    sec1_p: '在任何活跃的海外华人或旅游群组中，紧急情况都是现实。您的成员信任您——但直到今天，<strong>没有任何普遍且即时的资源存在。</strong>',
    urgence1_tag: 'FACEBOOK',
    urgence1_text: '<strong>"紧急——吉隆坡现在需要中文律师"</strong> — 47条评论，没有具体解决方案。',
    urgence2_tag: '论坛',
    urgence2_text: '<strong>"土耳其发生事故，保险沉默，警察需要翻译"</strong> — 3页，无用的重定向。',
    urgence3_tag: 'WHATSAPP',
    urgence3_text: '<strong>"午夜被赶出曼谷的公寓。领事馆关闭。求救"</strong> — 好意，没有专家。',
    urgence4_tag: 'TELEGRAM',
    urgence4_text: '<strong>"在泰国边境被拒签，被困在机场，还有2小时起飞"</strong> — 恐慌，建议相互矛盾。',
    urgence5_tag: 'REDDIT',
    urgence5_text: '<strong>"在麦德林住院，家人不会西班牙语，需要医疗翻译"</strong> — 点赞，没有解决方案。',
    after_urgences_p: '<strong>从今天起，您有了一个可以置顶的具体答案。</strong>',
    sec2_h2: '工作原理——3个步骤',
    step1_h4: '成员描述其情况',
    step1_p: '通过sos-expat.com——国家、语言、紧急情况类型。几秒钟内，24/7全天候。',
    step2_h4: '选择专家',
    step2_p: '认证律师或已验证的海外侨民助手——按国家、语言、专业和客户评价筛选。',
    step3_h4: '专家回电——保证5分钟内',
    step3_p: '用他们的语言。全球任何地方。日夜不间断。直接向专家付款。',
    sec3_h2: '适合哪些群组',
    card1_platform: '📘 Facebook',
    card1_h4: '按国家划分的海外华人群组',
    card1_p: '"曼谷华人"，"迪拜外籍人士"...永久置顶在群组顶部的资源。',
    card1_members: '5000至500,000+成员',
    card2_platform: '🌐 论坛',
    card2_h4: '旅游 &amp; 背包客论坛',
    card2_p: '紧急情况占活跃帖子的很大比例——从未有过可操作的答案。',
    card2_members: '每月数百万访客',
    card3_platform: '💬 WhatsApp / Telegram',
    card3_h4: '即时通讯群组',
    card3_p: '紧急情况的第一反应——但没有成员是法律专家。一个置顶链接改变一切。',
    card3_members: '50至5,000活跃成员',
    card4_platform: '🎮 Reddit / Discord',
    card4_h4: '数字社区',
    card4_p: 'r/expats, r/digitalnomad, r/solotravel——年轻、移动受众，极易遭遇紧急情况。',
    card4_members: '10万至100万+成员',
    sec4_h2: '即用型帖子——现在置顶',
    cp_label: '📌 直接复制粘贴到您的群组',
    cp_strong: '置顶资源——海外紧急情况',
    cp_text1: '需要在外国获得律师、翻译或紧急帮助？',
    cp_text3: '将此链接分享给任何需要的成员。',
    sec5_h2: '我们提供什么',
    perk1: '<strong>即发帖子</strong> — Facebook、论坛、WhatsApp、Telegram、Reddit、Discord',
    perk2: '<strong>视觉素材和横幅</strong>适配各平台——提供高清格式',
    perk3: '<strong>《海外紧急情况》指南</strong>可按国家定制——完整文档供分享',
    perk4: '<strong>专属追踪链接</strong> — 实时仪表盘，每次通话$10',
    perk5: '<strong>创始人介入</strong>您的群组——直播、Q&amp;A、介绍帖',
    quote: "海外华人群组管理员在成员面临紧急情况时处于最前线。他们值得一个真正的答案——而不仅仅是好意。",
    attr_title: '创始人 &amp; CEO，SOS-Expat.com — 爱沙尼亚塔林',
    cta_h3: '获取免费社区套件',
    cta_p: '即用帖子、视觉素材、紧急情况指南、追踪链接——全部免费。24小时内回复。',
    cta_email_subject: '社区套件 — [您的群组名称]',
    cta_subject_label: '主题：',
    contact_h3: '社区合作联系',
    contact1_val: 'Williams Jullin — 创始人 &amp; CEO',
    contact4_lbl: '可用性',
    contact4_val: '即时——任何时区',
    kit1: '📌 即用帖子',
    kit2: '🖼 高清视觉素材',
    kit3: '📋 紧急情况指南',
    kit4: '🔗 追踪链接',
    kit5: '🎙 创始人介入',
    footer_legal: 'SOS-Expat.com — 在爱沙尼亚注册的公司 — 塔林，爱沙尼亚',
  },
  hi: {
    html_lang: 'hi',
    dir: 'ltr',
    title: 'SOS-Expat.com — प्रेस विज्ञप्ति — समुदाय प्रशासक',
    tagline: 'वैश्विक आपातकालीन सेवा · 197 देश · 24/7',
    badge: 'समुदाय &amp; एडमिन',
    date: '5 अप्रैल 2026',
    kicker: 'प्रेस विज्ञप्ति — ग्रुप &amp; फोरम एडमिनिस्ट्रेटर',
    h1: 'आपके सदस्य आपात स्थिति पोस्ट करते हैं —<br><em>यह रहा जवाब।</em>',
    deck: 'आपके ग्रुप में हर हफ्ते कोई न कोई लिखता है: <strong>"दुबई में तत्काल वकील चाहिए"</strong>, <strong>"थाईलैंड में मेरा बेटा गिरफ्तार"</strong>, <strong>"बाली में दुर्घटना, बीमा संपर्क में नहीं"</strong>। SOS-Expat.com अंततः एक ठोस संसाधन है जो देना संभव है।',
    stat1_lbl: 'दुनिया भर में प्रवासी',
    stat2_lbl: '24/7 कवर देश',
    stat3_lbl: 'चुने हुए विशेषज्ञ का गारंटीड कॉलबैक',
    stat4_lbl: 'आज से पहले समकक्ष सेवा',
    sec1_h2: 'ये पोस्ट जो आप हर हफ्ते देखते हैं',
    sec1_p: 'किसी भी सक्रिय प्रवासी या यात्रा ग्रुप में, आपात स्थितियां एक वास्तविकता हैं। आपके सदस्य आप पर भरोसा करते हैं — लेकिन आज तक, <strong>कोई सार्वभौमिक और तत्काल संसाधन नहीं था।</strong>',
    urgence1_tag: 'FACEBOOK',
    urgence1_text: '<strong>"तत्काल — कुआलालंपुर में हिंदी बोलने वाला वकील अभी चाहिए"</strong> — 47 टिप्पणियां, कोई ठोस समाधान नहीं।',
    urgence2_tag: 'फोरम',
    urgence2_text: '<strong>"तुर्की में दुर्घटना, बीमा चुप, पुलिस अनुवादक मांग रही है"</strong> — 3 पेज, बेकार पुनर्निर्देशन।',
    urgence3_tag: 'WHATSAPP',
    urgence3_text: '<strong>"आधी रात को बैंकॉक के अपार्टमेंट से निकाला। दूतावास बंद। मदद करें"</strong> — अच्छी इच्छा, कोई विशेषज्ञ नहीं।',
    urgence4_tag: 'TELEGRAM',
    urgence4_text: '<strong>"थाई सीमा पर वीजा अस्वीकार, हवाई अड्डे पर फंसा, 2 घंटे में उड़ान"</strong> — घबराहट, परस्पर विरोधी सलाह।',
    urgence5_tag: 'REDDIT',
    urgence5_text: '<strong>"मेडेलिन में अस्पताल में भर्ती, गैर-हिंदी परिवार, चिकित्सा अनुवाद चाहिए"</strong> — अपवोट, कोई समाधान नहीं।',
    after_urgences_p: '<strong>आज से, आपके पास पिन करने के लिए एक ठोस जवाब है।</strong>',
    sec2_h2: 'यह कैसे काम करता है — 3 चरणों में',
    step1_h4: 'सदस्य अपनी स्थिति बताता है',
    step1_p: 'sos-expat.com से — देश, भाषा, आपातकाल का प्रकार। कुछ सेकंड में, 24/7।',
    step2_h4: 'वह अपना विशेषज्ञ चुनता है',
    step2_p: 'प्रमाणित वकील या सत्यापित प्रवासी सहायक — देश, भाषा, विशेषता और ग्राहक समीक्षाओं के आधार पर फ़िल्टर किए गए।',
    step3_h4: 'विशेषज्ञ वापस कॉल करता है — 5 मिनट से कम में गारंटीड',
    step3_p: 'उनकी भाषा में। दुनिया में कहीं भी। दिन और रात। विशेषज्ञ को सीधे भुगतान।',
    sec3_h2: 'किस ग्रुप के लिए',
    card1_platform: '📘 Facebook',
    card1_h4: 'देश के हिसाब से प्रवासी ग्रुप',
    card1_p: '"बैंकॉक में भारतीय", "दुबई में प्रवासी"... ग्रुप के शीर्ष पर पिन करने के लिए स्थायी संसाधन।',
    card1_members: '5,000 से 500,000+ सदस्य',
    card2_platform: '🌐 फोरम',
    card2_h4: 'यात्रा &amp; बैकपैकर फोरम',
    card2_p: 'आपात स्थितियां सक्रिय थ्रेड का एक बड़ा हिस्सा बनाती हैं — कभी भी कोई ऑपरेशनल जवाब नहीं मिला।',
    card2_members: 'लाखों आगंतुक / महीना',
    card3_platform: '💬 WhatsApp / Telegram',
    card3_h4: 'मैसेजिंग ग्रुप',
    card3_p: 'आपात स्थिति में पहली प्रतिक्रिया — लेकिन कोई सदस्य कानूनी विशेषज्ञ नहीं है। एक पिन किया गया लिंक सब कुछ बदल देता है।',
    card3_members: '50 से 5,000 सक्रिय सदस्य',
    card4_platform: '🎮 Reddit / Discord',
    card4_h4: 'डिजिटल समुदाय',
    card4_p: 'r/expats, r/digitalnomad, r/solotravel — युवा, मोबाइल दर्शक, आपात स्थितियों के प्रति अत्यधिक संवेदनशील।',
    card4_members: '1 लाख से 10 लाख+ सदस्य',
    sec4_h2: 'तैयार पोस्ट — अभी पिन करें',
    cp_label: '📌 अपने ग्रुप में सीधे कॉपी-पेस्ट करें',
    cp_strong: 'पिन संसाधन — विदेश में आपात स्थितियां',
    cp_text1: 'किसी विदेशी देश में वकील, अनुवादक या तत्काल सहायता चाहिए?',
    cp_text3: 'इस लिंक को किसी भी जरूरतमंद सदस्य के साथ साझा करें।',
    sec5_h2: 'हम आपको क्या प्रदान करते हैं',
    perk1: '<strong>प्रकाशन के लिए तैयार पोस्ट</strong> — Facebook, फोरम, WhatsApp, Telegram, Reddit, Discord',
    perk2: '<strong>विजुअल और बैनर</strong> प्रत्येक प्लेटफॉर्म के अनुसार अनुकूलित — HD फॉर्मेट प्रदान किए गए',
    perk3: '<strong>गाइड "विदेश में आपात स्थितियां"</strong> देश के अनुसार अनुकूलनीय — साझा करने के लिए पूरा दस्तावेज़',
    perk4: '<strong>समर्पित ट्रैकिंग लिंक</strong> — रियल-टाइम डैशबोर्ड, प्रति उत्पन्न कॉल $10',
    perk5: '<strong>संस्थापक का हस्तक्षेप</strong> आपके ग्रुप में — लाइव, Q&amp;A, परिचय पोस्ट',
    quote: "प्रवासी ग्रुप के एडमिन सबसे आगे होते हैं जब उनके सदस्य आपात स्थिति से गुजरते हैं। वे एक वास्तविक जवाब के हकदार हैं — न कि सिर्फ अच्छी इच्छा।",
    attr_title: 'संस्थापक &amp; CEO, SOS-Expat.com — टालिन, एस्टोनिया',
    cta_h3: 'मुफ्त कम्युनिटी किट प्राप्त करें',
    cta_p: 'तैयार पोस्ट, विजुअल, आपात गाइड, ट्रैकिंग लिंक — सब मुफ्त। 24 घंटे में जवाब।',
    cta_email_subject: 'कम्युनिटी किट — [आपके ग्रुप का नाम]',
    cta_subject_label: 'विषय:',
    contact_h3: 'कम्युनिटी पार्टनरशिप संपर्क',
    contact1_val: 'Williams Jullin — संस्थापक &amp; CEO',
    contact4_lbl: 'उपलब्धता',
    contact4_val: 'तत्काल — कोई भी टाइमज़ोन',
    kit1: '📌 तैयार पोस्ट',
    kit2: '🖼 एचडी विजुअल',
    kit3: '📋 आपात गाइड',
    kit4: '🔗 ट्रैकिंग लिंक',
    kit5: '🎙 संस्थापक का हस्तक्षेप',
    footer_legal: 'SOS-Expat.com — एस्टोनिया में पंजीकृत कंपनी — टालिन, एस्टोनिया',
  },
  ar: {
    html_lang: 'ar',
    dir: 'rtl',
    title: 'SOS-Expat.com — بيان صحفي — مديرو المجتمعات',
    tagline: 'خدمة الطوارئ العالمية · 197 دولة · 24/7',
    badge: 'مجتمعات &amp; المشرفون',
    date: '5 أبريل 2026',
    kicker: 'بيان صحفي — مشرفو المجموعات &amp; المنتديات',
    h1: 'يتداول أعضاؤك حالات طارئة —<br><em>إليك الإجابة.</em>',
    deck: 'كل أسبوع في مجموعتك يكتب شخص ما: <strong>"أحتاج محامياً عاجلاً في دبي"</strong>، <strong>"ابني محتجز في تايلاند"</strong>، <strong>"حادث في بالي، التأمين لا يرد"</strong>. SOS-Expat.com هو أخيراً المورد الملموس الذي يمكن تقديمه.',
    stat1_lbl: 'مغترب حول العالم',
    stat2_lbl: 'دولة مغطاة 24/7',
    stat3_lbl: 'معاودة اتصال مضمونة مع الخبير المختار',
    stat4_lbl: 'خدمة مماثلة قبل اليوم',
    sec1_h2: 'هذه المنشورات التي تراها كل أسبوع',
    sec1_p: 'في أي مجموعة نشطة للمغتربين أو السفر، حالات الطوارئ حقيقة. أعضاؤك يثقون بك — لكن حتى اليوم، <strong>لم يكن ثمة مورد شامل وفوري.</strong>',
    urgence1_tag: 'فيسبوك',
    urgence1_text: '<strong>"عاجل — محامٍ ناطق بالعربية في كوالالمبور الآن"</strong> — 47 تعليقاً، لا حل ملموس.',
    urgence2_tag: 'منتدى',
    urgence2_text: '<strong>"حادث في تركيا، التأمين صامت، الشرطة تطلب مترجماً"</strong> — 3 صفحات، إعادة توجيه عديمة الفائدة.',
    urgence3_tag: 'واتساب',
    urgence3_text: '<strong>"طُردت من شقتي في بانكوك منتصف الليل. القنصلية مغلقة. المساعدة رجاءً"</strong> — حسن نية، لا خبير.',
    urgence4_tag: 'تيليغرام',
    urgence4_text: '<strong>"رُفض التأشيرة على الحدود التايلاندية، عالق في المطار، الرحلة بعد ساعتين"</strong> — ذعر، نصائح متضاربة.',
    urgence5_tag: 'ريديت',
    urgence5_text: '<strong>"استشفاء في ميديين، عائلة لا تتحدث الإسبانية، تحتاج ترجمة طبية"</strong> — إعجابات، لا حل.',
    after_urgences_p: '<strong>من اليوم، لديك إجابة ملموسة لتثبيتها.</strong>',
    sec2_h2: 'كيف يعمل — في 3 خطوات',
    step1_h4: 'يصف العضو وضعه',
    step1_p: 'من sos-expat.com — البلد، اللغة، نوع الطارئ. في ثوانٍ، 24/7.',
    step2_h4: 'يختار خبيره',
    step2_p: 'محامون معتمدون أو مساعدون مغتربون موثقون — مفلترون حسب البلد واللغة والتخصص وآراء العملاء.',
    step3_h4: 'يعاود الخبير الاتصال — مضمون في أقل من 5 دقائق',
    step3_p: 'بلغته. في أي مكان في العالم. ليلاً ونهاراً. دفع مباشر للخبير.',
    sec3_h2: 'لأي مجموعات',
    card1_platform: '📘 فيسبوك',
    card1_h4: 'مجموعات المغتربين حسب البلد',
    card1_p: '"العرب في بانكوك"، "المغتربون في دبي"... المورد الدائم للتثبيت أعلى المجموعة.',
    card1_members: '5,000 إلى 500,000+ عضو',
    card2_platform: '🌐 المنتديات',
    card2_h4: 'منتديات السفر &amp; حاملي الحقيبة',
    card2_p: 'تمثل حالات الطوارئ جزءاً كبيراً من الموضوعات النشطة — دون أن تكون هناك إجابة عملية قط.',
    card2_members: 'ملايين الزوار / شهر',
    card3_platform: '💬 واتساب / تيليغرام',
    card3_h4: 'مجموعات المراسلة',
    card3_p: 'ردّ الفعل الأول في حالة الطوارئ — لكن لا يوجد عضو خبير قانوني. رابط مثبّت يغير كل شيء.',
    card3_members: '50 إلى 5,000 عضو نشط',
    card4_platform: '🎮 ريديت / ديسكورد',
    card4_h4: 'المجتمعات الرقمية',
    card4_p: 'r/expats, r/digitalnomad, r/solotravel — جمهور شاب ومتنقل، معرّض بشدة لحالات الطوارئ.',
    card4_members: '100 ألف إلى مليون+ عضو',
    sec4_h2: 'منشور جاهز للتثبيت — ثبّته الآن',
    cp_label: '📌 انسخ والصق مباشرة في مجموعتك',
    cp_strong: 'مورد مثبّت — حالات الطوارئ في الخارج',
    cp_text1: 'هل تحتاج محامياً أو مترجماً أو مساعدة عاجلة في بلد أجنبي؟',
    cp_text3: 'شارك هذا الرابط مع أي عضو يحتاجه.',
    sec5_h2: 'ما الذي نوفره لك',
    perk1: '<strong>منشورات جاهزة للنشر</strong> — فيسبوك، منتدى، واتساب، تيليغرام، ريديت، ديسكورد',
    perk2: '<strong>مرئيات ولافتات</strong> مكيّفة لكل منصة — صيغ HD متوفرة',
    perk3: '<strong>دليل "حالات الطوارئ في الخارج"</strong> قابل للتخصيص حسب البلد — وثيقة كاملة للمشاركة',
    perk4: '<strong>رابط تتبع مخصص</strong> — لوحة تحكم في الوقت الفعلي، 10$ لكل مكالمة مولّدة',
    perk5: '<strong>تدخل المؤسس</strong> في مجموعتك — مباشر، Q&amp;A، منشور تعريفي',
    quote: "مشرفو مجموعات المغتربين في الخط الأول عندما يواجه أعضاؤهم حالة طارئة. يستحقون إجابة حقيقية — وليس مجرد حسن نية.",
    attr_title: 'المؤسس &amp; الرئيس التنفيذي، SOS-Expat.com — تالين، إستونيا',
    cta_h3: 'احصل على مجموعة المجتمع المجانية',
    cta_p: 'منشورات جاهزة، مرئيات، دليل الطوارئ، رابط تتبع — كل ذلك مجاناً. رد خلال 24 ساعة.',
    cta_email_subject: 'مجموعة المجتمع — [اسم مجموعتك]',
    cta_subject_label: 'الموضوع:',
    contact_h3: 'تواصل بشأن شراكات المجتمعات',
    contact1_val: 'ويليامز جولان — المؤسس &amp; الرئيس التنفيذي',
    contact4_lbl: 'التوفر',
    contact4_val: 'فوري — أي منطقة زمنية',
    kit1: '📌 منشورات جاهزة',
    kit2: '🖼 مرئيات HD',
    kit3: '📋 دليل الطوارئ',
    kit4: '🔗 رابط التتبع',
    kit5: '🎙 تدخل المؤسس',
    footer_legal: 'SOS-Expat.com — شركة مسجلة في إستونيا — تالين، إستونيا',
  },
};

// ─── Générateur HTML CP4 ──────────────────────────────────────────────────────
function generateCP4(lang, seoDesc, canonical) {
  const t = T_CP4[lang];
  const dirAttr = t.dir === 'rtl' ? ' dir="rtl"' : '';
  const seoBlock = `
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="${seoDesc}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${t.title}">
<meta property="og:description" content="${seoDesc}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="https://sos-expat.com/sos-logo.webp">
<meta property="og:site_name" content="SOS-Expat">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${t.title}">
<meta name="twitter:description" content="${seoDesc}">`;

  return `<!DOCTYPE html>
<html lang="${t.html_lang}"${dirAttr}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${seoBlock}
<title>${t.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --red:        #B91C1C;
    --red-dim:    rgba(185,28,28,0.22);
    --red-border: rgba(185,28,28,0.50);
    --black:      #0D0D0D;
    --black-soft: #323232;
    --white:      #FFFFFF;
    --off-white:  #EEEEEE;
    --grey:       #ABABAB;
    --grey-light: #D2D2D2;
    --gold:       #D4A017;
    --gold-dim:   rgba(212,160,23,0.18);
    --gold-border:rgba(212,160,23,0.45);
    --divider:    rgba(255,255,255,0.14);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0D0D0D; color: var(--white); font-family: 'DM Sans', sans-serif; font-size: 15px; line-height: 1.7; -webkit-font-smoothing: antialiased; }
  .page-wrapper { max-width: 900px; margin: 0 auto; padding: 32px 20px; }
  .header { display: flex; flex-direction: column; gap: 14px; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid var(--divider); }
  .logo { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 26px; color: var(--white); }
  .logo span { color: var(--red); }
  .tagline { font-size: 10px; color: var(--grey); font-weight: 300; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; }
  .badge { display: inline-block; background: var(--gold); color: #0D0D0D; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 4px 10px; border-radius: 2px; }
  .date { font-size: 12px; color: var(--grey); margin-top: 4px; }
  .hero { margin-bottom: 40px; }
  .kicker { font-size: 10px; font-weight: 600; color: var(--gold); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; }
  .hero h1 { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 900; line-height: 1.1; color: var(--white); margin-bottom: 20px; letter-spacing: -1px; }
  .hero h1 em { font-style: italic; color: var(--red); }
  .deck { font-size: 16px; font-weight: 300; color: var(--off-white); line-height: 1.7; border-left: 3px solid var(--gold); padding-left: 18px; }
  .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--divider); border: 1px solid var(--divider); border-radius: 8px; overflow: hidden; margin-bottom: 48px; }
  .stat-cell { background: linear-gradient(160deg, #2E2E2E, #222222); padding: 20px 14px; text-align: center; }
  .stat-cell .num { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: var(--gold); line-height: 1; margin-bottom: 6px; }
  .stat-cell .lbl { font-size: 10px; color: var(--grey); font-weight: 300; line-height: 1.4; text-transform: uppercase; letter-spacing: 0.5px; }
  .section { margin-bottom: 44px; }
  .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .section-num { width: 30px; height: 30px; border-radius: 50%; background: var(--red-dim); border: 1px solid var(--red-border); display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--red); font-weight: 600; flex-shrink: 0; }
  .section-num.gold { background: var(--gold-dim); border-color: var(--gold-border); color: var(--gold); }
  .section h2 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: var(--white); }
  .section p { font-size: 15px; color: var(--off-white); font-weight: 300; line-height: 1.75; margin-bottom: 14px; }
  .section p strong { color: var(--white); font-weight: 600; }
  .affiliation-hero { background: linear-gradient(135deg, #1a0a0a, #2a1010); border: 1px solid var(--red-border); border-radius: 10px; padding: 28px 20px; margin: 20px 0; }
  .amount { font-family: 'Playfair Display', serif; font-size: 64px; font-weight: 900; color: var(--red); line-height: 1; letter-spacing: -2px; }
  .amount span { font-size: 32px; vertical-align: top; margin-top: 10px; display: inline-block; }
  .amount-label { font-size: 14px; color: var(--off-white); font-weight: 300; margin: 8px 0 20px; }
  .amount-label strong { color: var(--white); font-weight: 600; }
  .affil-grid { display: flex; flex-direction: column; gap: 8px; }
  .affil-item { background: rgba(255,255,255,0.04); border: 1px solid var(--divider); border-radius: 6px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .affil-num { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: var(--white); flex-shrink: 0; }
  .affil-lbl { font-size: 12px; color: var(--grey); font-weight: 300; line-height: 1.4; }
  .cards { display: flex; flex-direction: column; gap: 10px; margin: 20px 0; }
  .card { background: linear-gradient(160deg, #2E2E2E, #222222); border-radius: 6px; padding: 18px; border-left: 3px solid var(--red); }
  .card.gold { border-left-color: var(--gold); }
  .card-tag { font-size: 10px; font-weight: 700; color: var(--gold); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
  .card h4 { font-size: 14px; font-weight: 600; color: var(--white); margin-bottom: 4px; line-height: 1.4; }
  .card p { font-size: 13px; color: var(--grey-light); font-weight: 300; line-height: 1.55; margin: 0; }
  .perks { display: flex; flex-direction: column; gap: 8px; margin: 20px 0; }
  .perk { display: flex; gap: 14px; align-items: flex-start; padding: 14px 16px; background: linear-gradient(160deg, #2E2E2E, #222222); border-radius: 6px; border-left: 2px solid var(--gold); }
  .perk-icon { font-size: 18px; flex-shrink: 0; width: 24px; text-align: center; }
  .perk-text { font-size: 14px; color: var(--off-white); font-weight: 300; line-height: 1.55; }
  .perk-text strong { color: var(--white); font-weight: 600; }
  .quote-block { background: linear-gradient(160deg, #2E2E2E, #222222); border: 1px solid var(--red-border); border-radius: 10px; padding: 28px 24px; margin: 36px 0; position: relative; }
  .quote-block::before { content: '\\201C'; font-family: 'Playfair Display', serif; font-size: 80px; color: var(--red); opacity: 0.12; position: absolute; top: -10px; left: 20px; line-height: 1; }
  .quote-block blockquote { font-family: 'Playfair Display', serif; font-size: 17px; font-style: italic; color: var(--off-white); line-height: 1.65; margin-bottom: 18px; position: relative; z-index: 1; }
  .quote-attribution { display: flex; align-items: center; gap: 12px; }
  .avatar { width: 40px; height: 40px; background: var(--red); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 700; color: var(--white); flex-shrink: 0; }
  .attr-text .name { font-size: 13px; font-weight: 600; color: var(--white); }
  .attr-text .title { font-size: 11px; color: var(--grey); font-weight: 300; }
  .cta-block { background: linear-gradient(135deg, #1a0d00, #2a1800); border: 1px solid var(--gold-border); border-radius: 10px; padding: 32px 20px; margin: 36px 0; text-align: center; }
  .cta-block h3 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 900; color: var(--white); margin-bottom: 10px; }
  .cta-block p { font-size: 14px; color: var(--grey-light); font-weight: 300; margin-bottom: 22px; }
  .cta-email { display: inline-block; font-size: 15px; font-weight: 600; color: var(--gold); border: 1px solid var(--gold-border); border-radius: 6px; padding: 12px 24px; text-decoration: none; word-break: break-all; }
  .cta-subject { margin-top: 12px; font-size: 12px; color: var(--grey); }
  .cta-subject code { color: var(--off-white); background: rgba(255,255,255,0.07); padding: 2px 6px; border-radius: 3px; }
  .contact-block { background: linear-gradient(160deg, #2E2E2E, #222222); border: 1px solid var(--divider); border-radius: 10px; padding: 28px 20px; margin-top: 36px; }
  .contact-block h3 { font-family: 'Playfair Display', serif; font-size: 17px; color: var(--white); padding-bottom: 14px; border-bottom: 1px solid var(--divider); margin-bottom: 18px; }
  .contact-items { display: flex; flex-direction: column; gap: 12px; }
  .contact-item .lbl { font-size: 9px; color: var(--red); font-weight: 600; text-transform: uppercase; letter-spacing: 2px; }
  .contact-item .val { font-size: 14px; color: var(--white); }
  .contact-item .val a { color: var(--off-white); text-decoration: none; }
  .kit-press { background: var(--black-soft); border-radius: 6px; padding: 14px; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .kit-item { font-size: 11px; color: var(--grey-light); background: linear-gradient(160deg, #2E2E2E, #222222); padding: 4px 10px; border-radius: 4px; border: 1px solid var(--divider); }
  .divider { width: 100%; height: 1px; background: var(--divider); margin: 32px 0; }
  .footer { margin-top: 36px; padding-top: 20px; border-top: 1px solid var(--divider); display: flex; flex-direction: column; gap: 8px; }
  .footer .legal { font-size: 11px; color: var(--grey); font-weight: 300; }
  .footer .end-mark { font-family: 'Playfair Display', serif; font-size: 12px; color: var(--grey); letter-spacing: 3px; }
  @media (min-width: 640px) {
    .page-wrapper { padding: 56px 48px; }
    .header { flex-direction: row; justify-content: space-between; align-items: flex-start; }
    .hero h1 { font-size: 52px; }
    .stats-row { grid-template-columns: repeat(4, 1fr); }
    .affil-grid { flex-direction: row; }
    .cards { display: grid; grid-template-columns: 1fr 1fr; }
    .contact-items { display: grid; grid-template-columns: 1fr 1fr; }
    .footer { flex-direction: row; justify-content: space-between; align-items: center; }
    .amount { font-size: 80px; }
  }
</style>
</head>
<body>
<div class="page-wrapper">

  <header class="header">
    <div>
      <div class="logo">SOS-Expat<span>.com</span></div>
      <div class="tagline">${t.tagline}</div>
    </div>
    <div>
      <div><span class="badge">${t.badge}</span></div>
      <div class="date">${t.date}</div>
    </div>
  </header>

  <section class="hero">
    <div class="kicker">${t.kicker}</div>
    <h1>${t.h1}</h1>
    <p class="deck">${t.deck}</p>
  </section>

  <div class="stats-row">
    <div class="stat-cell"><div class="num">304M</div><div class="lbl">${t.stat1_lbl}</div></div>
    <div class="stat-cell"><div class="num">10$</div><div class="lbl">${t.stat2_lbl}</div></div>
    <div class="stat-cell"><div class="num">197</div><div class="lbl">${t.stat3_lbl}</div></div>
    <div class="stat-cell"><div class="num">0</div><div class="lbl">${t.stat4_lbl}</div></div>
  </div>

  <section class="section">
    <div class="section-header"><div class="section-num">01</div><h2>${t.sec1_h2}</h2></div>
    <p>${t.sec1_p}</p>
    <div class="cards">
      <div class="card"><h4>${t.card1_h4}</h4><p>${t.card1_p}</p></div>
      <div class="card gold"><h4>${t.card2_h4}</h4><p>${t.card2_p}</p></div>
      <div class="card"><h4>${t.card3_h4}</h4><p>${t.card3_p}</p></div>
      <div class="card gold"><h4>${t.card4_h4}</h4><p>${t.card4_p}</p></div>
    </div>
  </section>

  <div class="divider"></div>

  <section class="section">
    <div class="section-header"><div class="section-num gold">02</div><h2>${t.sec2_h2}</h2></div>
    <div class="affiliation-hero">
      <div class="amount"><span>$</span>10</div>
      <div class="amount-label">${t.amount_label}</div>
      <div class="affil-grid">
        <div class="affil-item"><div class="affil-num">∞</div><div class="affil-lbl">${t.affil1}</div></div>
        <div class="affil-item"><div class="affil-num">30j</div><div class="affil-lbl">${t.affil2}</div></div>
        <div class="affil-item"><div class="affil-num">Live</div><div class="affil-lbl">${t.affil3}</div></div>
      </div>
    </div>
  </section>

  <div class="divider"></div>

  <section class="section">
    <div class="section-header"><div class="section-num">03</div><h2>${t.sec3_h2}</h2></div>
    <div class="cards">
      <div class="card"><div class="card-tag">${t.ctag1}</div><h4>${t.ch4_1}</h4><p>${t.cp1}</p></div>
      <div class="card"><div class="card-tag">${t.ctag2}</div><h4>${t.ch4_2}</h4><p>${t.cp2}</p></div>
      <div class="card"><div class="card-tag">${t.ctag3}</div><h4>${t.ch4_3}</h4><p>${t.cp3}</p></div>
      <div class="card"><div class="card-tag">${t.ctag4}</div><h4>${t.ch4_4}</h4><p>${t.cp4}</p></div>
      <div class="card"><div class="card-tag">${t.ctag5}</div><h4>${t.ch4_5}</h4><p>${t.cp5}</p></div>
      <div class="card"><div class="card-tag">${t.ctag6}</div><h4>${t.ch4_6}</h4><p>${t.cp6}</p></div>
    </div>
  </section>

  <div class="divider"></div>

  <section class="section">
    <div class="section-header"><div class="section-num gold">04</div><h2>${t.sec4_h2}</h2></div>
    <div class="perks">
      <div class="perk"><div class="perk-icon">🔗</div><div class="perk-text">${t.perk1}</div></div>
      <div class="perk"><div class="perk-icon">🖥</div><div class="perk-text">${t.perk2}</div></div>
      <div class="perk"><div class="perk-icon">📸</div><div class="perk-text">${t.perk3}</div></div>
      <div class="perk"><div class="perk-icon">🎙</div><div class="perk-text">${t.perk4}</div></div>
      <div class="perk"><div class="perk-icon">⚡</div><div class="perk-text">${t.perk5}</div></div>
    </div>
  </section>

  <div class="quote-block">
    <blockquote>${t.quote}</blockquote>
    <div class="quote-attribution">
      <div class="avatar">WJ</div>
      <div class="attr-text">
        <div class="name">Williams Jullin</div>
        <div class="title">${t.attr_title}</div>
      </div>
    </div>
  </div>

  <div class="cta-block">
    <h3>${t.cta_h3}</h3>
    <p>${t.cta_p}</p>
    <a class="cta-email" href="mailto:williamsjullin@sos-expat.com?subject=${encodeURIComponent(t.cta_email_subject)}">williamsjullin@sos-expat.com</a>
    <div class="cta-subject">${t.cta_subject_label} <code>${t.cta_email_subject}</code></div>
  </div>

  <div class="contact-block">
    <h3>${t.contact_h3}</h3>
    <div class="contact-items">
      <div class="contact-item"><div class="lbl">Contact</div><div class="val">${t.contact1_val}</div></div>
      <div class="contact-item"><div class="lbl">Email</div><div class="val"><a href="mailto:williamsjullin@sos-expat.com">williamsjullin@sos-expat.com</a></div></div>
      <div class="contact-item"><div class="lbl">Site web</div><div class="val"><a href="https://sos-expat.com">sos-expat.com</a></div></div>
      <div class="contact-item"><div class="lbl">${t.contact4_lbl}</div><div class="val">${t.contact4_val}</div></div>
    </div>
    <div class="kit-press">
      <div class="kit-item">${t.kit1}</div>
      <div class="kit-item">${t.kit2}</div>
      <div class="kit-item">${t.kit3}</div>
      <div class="kit-item">${t.kit4}</div>
      <div class="kit-item">${t.kit5}</div>
    </div>
  </div>

  <footer class="footer">
    <div class="legal">${t.footer_legal}</div>
    <div class="end-mark">— ### —</div>
  </footer>

</div>
</body>
</html>`;
}

// ─── Générateur HTML CP5 ──────────────────────────────────────────────────────
function generateCP5(lang, seoDesc, canonical) {
  const t = T_CP5[lang];
  const dirAttr = t.dir === 'rtl' ? ' dir="rtl"' : '';
  const seoBlock = `
<meta name="robots" content="noindex, nofollow">
<meta name="description" content="${seoDesc}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${t.title}">
<meta property="og:description" content="${seoDesc}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="https://sos-expat.com/sos-logo.webp">
<meta property="og:site_name" content="SOS-Expat">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${t.title}">
<meta name="twitter:description" content="${seoDesc}">`;

  return `<!DOCTYPE html>
<html lang="${t.html_lang}"${dirAttr}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${seoBlock}
<title>${t.title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --red:        #B91C1C;
    --red-dim:    rgba(185,28,28,0.22);
    --red-border: rgba(185,28,28,0.50);
    --black:      #0D0D0D;
    --black-soft: #323232;
    --white:      #FFFFFF;
    --off-white:  #EEEEEE;
    --grey:       #ABABAB;
    --grey-light: #D2D2D2;
    --blue:       #0EA5E9;
    --blue-dim:   rgba(14,165,233,0.15);
    --blue-border:rgba(14,165,233,0.40);
    --divider:    rgba(255,255,255,0.14);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0D0D0D; color: var(--white); font-family: 'DM Sans', sans-serif; font-size: 15px; line-height: 1.7; -webkit-font-smoothing: antialiased; }
  .page-wrapper { max-width: 900px; margin: 0 auto; padding: 32px 20px; }
  .header { display: flex; flex-direction: column; gap: 14px; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid var(--divider); }
  .logo { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 26px; color: var(--white); }
  .logo span { color: var(--red); }
  .tagline { font-size: 10px; color: var(--grey); font-weight: 300; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; }
  .badge { display: inline-block; background: var(--blue); color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 4px 10px; border-radius: 2px; }
  .date { font-size: 12px; color: var(--grey); margin-top: 4px; }
  .hero { margin-bottom: 40px; }
  .kicker { font-size: 10px; font-weight: 600; color: var(--blue); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; }
  .hero h1 { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 900; line-height: 1.1; color: var(--white); margin-bottom: 20px; letter-spacing: -1px; }
  .hero h1 em { font-style: italic; color: var(--red); }
  .deck { font-size: 16px; font-weight: 300; color: var(--off-white); line-height: 1.7; border-left: 3px solid var(--blue); padding-left: 18px; }
  .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--divider); border: 1px solid var(--divider); border-radius: 8px; overflow: hidden; margin-bottom: 48px; }
  .stat-cell { background: linear-gradient(160deg, #2E2E2E, #222222); padding: 20px 14px; text-align: center; }
  .stat-cell .num { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 700; color: var(--blue); line-height: 1; margin-bottom: 6px; }
  .stat-cell .lbl { font-size: 10px; color: var(--grey); font-weight: 300; line-height: 1.4; text-transform: uppercase; letter-spacing: 0.5px; }
  .section { margin-bottom: 44px; }
  .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .section-num { width: 30px; height: 30px; border-radius: 50%; background: var(--red-dim); border: 1px solid var(--red-border); display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--red); font-weight: 600; flex-shrink: 0; }
  .section-num.blue { background: var(--blue-dim); border-color: var(--blue-border); color: var(--blue); }
  .section h2 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: var(--white); }
  .section p { font-size: 15px; color: var(--off-white); font-weight: 300; line-height: 1.75; margin-bottom: 14px; }
  .section p strong { color: var(--white); font-weight: 600; }
  .urgence-list { display: flex; flex-direction: column; gap: 8px; margin: 20px 0; }
  .urgence-item { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; background: linear-gradient(160deg, #2E2E2E, #222222); border-radius: 6px; border-left: 2px solid var(--blue); }
  .urgence-tag { font-size: 9px; font-weight: 700; color: var(--blue); background: var(--blue-dim); border: 1px solid var(--blue-border); padding: 3px 8px; border-radius: 3px; white-space: nowrap; letter-spacing: 1px; flex-shrink: 0; margin-top: 2px; }
  .urgence-text { font-size: 13px; color: var(--off-white); font-weight: 300; line-height: 1.55; }
  .urgence-text strong { color: var(--white); font-weight: 600; font-style: normal; }
  .steps { display: flex; flex-direction: column; margin: 20px 0; }
  .step { display: flex; gap: 18px; align-items: flex-start; padding: 18px 0; border-bottom: 1px solid var(--divider); }
  .step:last-child { border-bottom: none; }
  .step-num { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 900; color: var(--black-soft); line-height: 1; flex-shrink: 0; width: 44px; text-align: center; }
  .step-content h4 { font-size: 14px; font-weight: 600; color: var(--white); margin-bottom: 4px; }
  .step-content p { font-size: 13px; color: var(--grey-light); font-weight: 300; margin: 0; line-height: 1.55; }
  .cards { display: flex; flex-direction: column; gap: 10px; margin: 20px 0; }
  .card { background: linear-gradient(160deg, #2E2E2E, #222222); border-radius: 6px; padding: 18px; border-top: 3px solid var(--blue); }
  .card-platform { font-size: 10px; font-weight: 700; color: var(--blue); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
  .card h4 { font-size: 14px; font-weight: 600; color: var(--white); margin-bottom: 4px; }
  .card p { font-size: 13px; color: var(--grey-light); font-weight: 300; line-height: 1.55; margin: 0; }
  .card .members { font-size: 11px; color: var(--grey); margin-top: 8px; font-style: italic; }
  .copypaste-block { background: #111; border: 1px solid var(--divider); border-radius: 8px; padding: 22px 18px; margin: 20px 0; }
  .cp-label { font-size: 9px; font-weight: 700; color: var(--blue); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 14px; }
  .cp-text { font-size: 14px; color: var(--off-white); font-weight: 300; line-height: 1.75; padding: 18px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid var(--divider); font-style: italic; }
  .cp-text strong { color: var(--white); font-weight: 600; font-style: normal; }
  .perks { display: flex; flex-direction: column; gap: 8px; margin: 20px 0; }
  .perk { display: flex; gap: 14px; align-items: flex-start; padding: 14px 16px; background: linear-gradient(160deg, #2E2E2E, #222222); border-radius: 6px; border-left: 2px solid var(--blue); }
  .perk-icon { font-size: 18px; flex-shrink: 0; width: 24px; text-align: center; }
  .perk-text { font-size: 14px; color: var(--off-white); font-weight: 300; line-height: 1.55; }
  .perk-text strong { color: var(--white); font-weight: 600; }
  .quote-block { background: linear-gradient(160deg, #2E2E2E, #222222); border: 1px solid var(--red-border); border-radius: 10px; padding: 28px 24px; margin: 36px 0; position: relative; }
  .quote-block::before { content: '\\201C'; font-family: 'Playfair Display', serif; font-size: 80px; color: var(--red); opacity: 0.12; position: absolute; top: -10px; left: 20px; line-height: 1; }
  .quote-block blockquote { font-family: 'Playfair Display', serif; font-size: 17px; font-style: italic; color: var(--off-white); line-height: 1.65; margin-bottom: 18px; position: relative; z-index: 1; }
  .quote-attribution { display: flex; align-items: center; gap: 12px; }
  .avatar { width: 40px; height: 40px; background: var(--red); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 700; color: var(--white); flex-shrink: 0; }
  .attr-text .name { font-size: 13px; font-weight: 600; color: var(--white); }
  .attr-text .title { font-size: 11px; color: var(--grey); font-weight: 300; }
  .cta-block { background: linear-gradient(135deg, #050d14, #0a1a24); border: 1px solid var(--blue-border); border-radius: 10px; padding: 32px 20px; margin: 36px 0; text-align: center; }
  .cta-block h3 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 900; color: var(--white); margin-bottom: 10px; }
  .cta-block p { font-size: 14px; color: var(--grey-light); font-weight: 300; margin-bottom: 22px; }
  .cta-email { display: inline-block; font-size: 15px; font-weight: 600; color: var(--blue); border: 1px solid var(--blue-border); border-radius: 6px; padding: 12px 24px; text-decoration: none; word-break: break-all; }
  .cta-subject { margin-top: 12px; font-size: 12px; color: var(--grey); }
  .cta-subject code { color: var(--off-white); background: rgba(255,255,255,0.07); padding: 2px 6px; border-radius: 3px; }
  .contact-block { background: linear-gradient(160deg, #2E2E2E, #222222); border: 1px solid var(--divider); border-radius: 10px; padding: 28px 20px; margin-top: 36px; }
  .contact-block h3 { font-family: 'Playfair Display', serif; font-size: 17px; color: var(--white); padding-bottom: 14px; border-bottom: 1px solid var(--divider); margin-bottom: 18px; }
  .contact-items { display: flex; flex-direction: column; gap: 12px; }
  .contact-item .lbl { font-size: 9px; color: var(--red); font-weight: 600; text-transform: uppercase; letter-spacing: 2px; }
  .contact-item .val { font-size: 14px; color: var(--white); }
  .contact-item .val a { color: var(--off-white); text-decoration: none; }
  .kit-press { background: var(--black-soft); border-radius: 6px; padding: 14px; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .kit-item { font-size: 11px; color: var(--grey-light); background: linear-gradient(160deg, #2E2E2E, #222222); padding: 4px 10px; border-radius: 4px; border: 1px solid var(--divider); }
  .divider { width: 100%; height: 1px; background: var(--divider); margin: 32px 0; }
  .footer { margin-top: 36px; padding-top: 20px; border-top: 1px solid var(--divider); display: flex; flex-direction: column; gap: 8px; }
  .footer .legal { font-size: 11px; color: var(--grey); font-weight: 300; }
  .footer .end-mark { font-family: 'Playfair Display', serif; font-size: 12px; color: var(--grey); letter-spacing: 3px; }
  @media (min-width: 640px) {
    .page-wrapper { padding: 56px 48px; }
    .header { flex-direction: row; justify-content: space-between; align-items: flex-start; }
    .hero h1 { font-size: 50px; }
    .stats-row { grid-template-columns: repeat(4, 1fr); }
    .cards { display: grid; grid-template-columns: 1fr 1fr; }
    .contact-items { display: grid; grid-template-columns: 1fr 1fr; }
    .footer { flex-direction: row; justify-content: space-between; align-items: center; }
  }
</style>
</head>
<body>
<div class="page-wrapper">

  <header class="header">
    <div>
      <div class="logo">SOS-Expat<span>.com</span></div>
      <div class="tagline">${t.tagline}</div>
    </div>
    <div>
      <div><span class="badge">${t.badge}</span></div>
      <div class="date">${t.date}</div>
    </div>
  </header>

  <section class="hero">
    <div class="kicker">${t.kicker}</div>
    <h1>${t.h1}</h1>
    <p class="deck">${t.deck}</p>
  </section>

  <div class="stats-row">
    <div class="stat-cell"><div class="num">304M</div><div class="lbl">${t.stat1_lbl}</div></div>
    <div class="stat-cell"><div class="num">197</div><div class="lbl">${t.stat2_lbl}</div></div>
    <div class="stat-cell"><div class="num">&lt;5min</div><div class="lbl">${t.stat3_lbl}</div></div>
    <div class="stat-cell"><div class="num">0</div><div class="lbl">${t.stat4_lbl}</div></div>
  </div>

  <section class="section">
    <div class="section-header"><div class="section-num">01</div><h2>${t.sec1_h2}</h2></div>
    <p>${t.sec1_p}</p>
    <div class="urgence-list">
      <div class="urgence-item"><div class="urgence-tag">${t.urgence1_tag}</div><div class="urgence-text">${t.urgence1_text}</div></div>
      <div class="urgence-item"><div class="urgence-tag">${t.urgence2_tag}</div><div class="urgence-text">${t.urgence2_text}</div></div>
      <div class="urgence-item"><div class="urgence-tag">${t.urgence3_tag}</div><div class="urgence-text">${t.urgence3_text}</div></div>
      <div class="urgence-item"><div class="urgence-tag">${t.urgence4_tag}</div><div class="urgence-text">${t.urgence4_text}</div></div>
      <div class="urgence-item"><div class="urgence-tag">${t.urgence5_tag}</div><div class="urgence-text">${t.urgence5_text}</div></div>
    </div>
    <p>${t.after_urgences_p}</p>
  </section>

  <div class="divider"></div>

  <section class="section">
    <div class="section-header"><div class="section-num">02</div><h2>${t.sec2_h2}</h2></div>
    <div class="steps">
      <div class="step"><div class="step-num">01</div><div class="step-content"><h4>${t.step1_h4}</h4><p>${t.step1_p}</p></div></div>
      <div class="step"><div class="step-num">02</div><div class="step-content"><h4>${t.step2_h4}</h4><p>${t.step2_p}</p></div></div>
      <div class="step"><div class="step-num">03</div><div class="step-content"><h4>${t.step3_h4}</h4><p>${t.step3_p}</p></div></div>
    </div>
  </section>

  <div class="divider"></div>

  <section class="section">
    <div class="section-header"><div class="section-num blue">03</div><h2>${t.sec3_h2}</h2></div>
    <div class="cards">
      <div class="card"><div class="card-platform">${t.card1_platform}</div><h4>${t.card1_h4}</h4><p>${t.card1_p}</p><div class="members">${t.card1_members}</div></div>
      <div class="card"><div class="card-platform">${t.card2_platform}</div><h4>${t.card2_h4}</h4><p>${t.card2_p}</p><div class="members">${t.card2_members}</div></div>
      <div class="card"><div class="card-platform">${t.card3_platform}</div><h4>${t.card3_h4}</h4><p>${t.card3_p}</p><div class="members">${t.card3_members}</div></div>
      <div class="card"><div class="card-platform">${t.card4_platform}</div><h4>${t.card4_h4}</h4><p>${t.card4_p}</p><div class="members">${t.card4_members}</div></div>
    </div>
  </section>

  <div class="divider"></div>

  <section class="section">
    <div class="section-header"><div class="section-num blue">04</div><h2>${t.sec4_h2}</h2></div>
    <div class="copypaste-block">
      <div class="cp-label">${t.cp_label}</div>
      <div class="cp-text">
        📌 <strong>${t.cp_strong}</strong><br><br>
        ${t.cp_text1}<br><br>
        👉 <strong>SOS-Expat.com</strong> — choisissez votre expert selon votre pays, votre langue et la spécialité. Rappel en moins de 5 minutes. Garanti. 24h/7j. 197 pays.<br><br>
        ${t.cp_text3}
      </div>
    </div>
  </section>

  <div class="divider"></div>

  <section class="section">
    <div class="section-header"><div class="section-num">05</div><h2>${t.sec5_h2}</h2></div>
    <div class="perks">
      <div class="perk"><div class="perk-icon">📌</div><div class="perk-text">${t.perk1}</div></div>
      <div class="perk"><div class="perk-icon">🖼</div><div class="perk-text">${t.perk2}</div></div>
      <div class="perk"><div class="perk-icon">📋</div><div class="perk-text">${t.perk3}</div></div>
      <div class="perk"><div class="perk-icon">🔗</div><div class="perk-text">${t.perk4}</div></div>
      <div class="perk"><div class="perk-icon">🎙</div><div class="perk-text">${t.perk5}</div></div>
    </div>
  </section>

  <div class="quote-block">
    <blockquote>${t.quote}</blockquote>
    <div class="quote-attribution">
      <div class="avatar">WJ</div>
      <div class="attr-text">
        <div class="name">Williams Jullin</div>
        <div class="title">${t.attr_title}</div>
      </div>
    </div>
  </div>

  <div class="cta-block">
    <h3>${t.cta_h3}</h3>
    <p>${t.cta_p}</p>
    <a class="cta-email" href="mailto:williamsjullin@sos-expat.com?subject=${encodeURIComponent(t.cta_email_subject)}">williamsjullin@sos-expat.com</a>
    <div class="cta-subject">${t.cta_subject_label} <code>${t.cta_email_subject}</code></div>
  </div>

  <div class="contact-block">
    <h3>${t.contact_h3}</h3>
    <div class="contact-items">
      <div class="contact-item"><div class="lbl">Contact</div><div class="val">${t.contact1_val}</div></div>
      <div class="contact-item"><div class="lbl">Email</div><div class="val"><a href="mailto:williamsjullin@sos-expat.com">williamsjullin@sos-expat.com</a></div></div>
      <div class="contact-item"><div class="lbl">Site web</div><div class="val"><a href="https://sos-expat.com">sos-expat.com</a></div></div>
      <div class="contact-item"><div class="lbl">${t.contact4_lbl}</div><div class="val">${t.contact4_val}</div></div>
    </div>
    <div class="kit-press">
      <div class="kit-item">${t.kit1}</div>
      <div class="kit-item">${t.kit2}</div>
      <div class="kit-item">${t.kit3}</div>
      <div class="kit-item">${t.kit4}</div>
      <div class="kit-item">${t.kit5}</div>
    </div>
  </div>

  <footer class="footer">
    <div class="legal">${t.footer_legal}</div>
    <div class="end-mark">— ### —</div>
  </footer>

</div>
</body>
</html>`;
}

// ─── Upload vers Firebase Storage ────────────────────────────────────────────
async function uploadToStorage(localPath, storagePath) {
  await bucket.upload(localPath, {
    destination: storagePath,
    metadata: { contentType: 'text/html; charset=utf-8' },
  });
  const file = bucket.file(storagePath);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: '03-01-2030',
  });
  return url;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Créer le dossier de sortie si nécessaire
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Dossier créé : ${OUTPUT_DIR}`);
  }

  const cp4HtmlUrls = {};
  const cp5HtmlUrls = {};

  // ── CP4 : générer, sauver, uploader ────────────────────────────────────────
  console.log('\n=== CP4 : Génération des 9 fichiers HTML ===');
  for (const lang of LANGS) {
    const seoDesc = SEO_DESC_CP4[lang];
    const canonical = CANONICAL_CP4[lang];
    const html = generateCP4(lang, seoDesc, canonical);
    const filename = `CP4_blogger_${lang}.html`;
    const localPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(localPath, html, 'utf8');
    console.log(`  [CP4] Fichier écrit : ${filename}`);

    const storagePath = `blogger/releases/cp4/html/${lang === 'zh' ? 'ch' : lang}.html`;
    console.log(`  [CP4] Upload Storage : ${storagePath}`);
    const url = await uploadToStorage(localPath, storagePath);
    cp4HtmlUrls[firestoreKey(lang)] = url;
    console.log(`  [CP4][${lang}] URL : ${url.substring(0, 80)}...`);
  }

  // ── CP5 : générer, sauver, uploader ────────────────────────────────────────
  console.log('\n=== CP5 : Génération des 9 fichiers HTML ===');
  for (const lang of LANGS) {
    const seoDesc = SEO_DESC_CP5[lang];
    const canonical = CANONICAL_CP5[lang];
    const html = generateCP5(lang, seoDesc, canonical);
    const filename = `CP5_group_admin_${lang}.html`;
    const localPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(localPath, html, 'utf8');
    console.log(`  [CP5] Fichier écrit : ${filename}`);

    const storagePath = `group_admin/releases/cp5/html/${lang === 'zh' ? 'ch' : lang}.html`;
    console.log(`  [CP5] Upload Storage : ${storagePath}`);
    const url = await uploadToStorage(localPath, storagePath);
    cp5HtmlUrls[firestoreKey(lang)] = url;
    console.log(`  [CP5][${lang}] URL : ${url.substring(0, 80)}...`);
  }

  // ── Firestore CP4 ───────────────────────────────────────────────────────────
  console.log('\n=== CP4 : Création document Firestore ===');
  const cp4DocRef = db.collection('blogger_releases').doc('cp4');
  const publishedAt = admin.firestore.Timestamp.fromDate(new Date('2026-04-05T00:00:00Z'));
  const now = admin.firestore.Timestamp.now();

  await cp4DocRef.set({
    title: {
      fr: 'SOS-Expat — Communiqué Blogueurs & Créateurs de Contenu',
      en: 'SOS-Expat — Press Release — Bloggers & Content Creators',
      es: 'SOS-Expat — Comunicado — Bloggers y Creadores de Contenido',
      de: 'SOS-Expat — Pressemitteilung — Blogger & Content-Ersteller',
      pt: 'SOS-Expat — Comunicado — Bloggers e Criadores de Conteúdo',
      ru: 'SOS-Expat — Пресс-релиз — Блогеры и Создатели Контента',
      ch: 'SOS-Expat — 新闻稿 — 博主与内容创作者',
      hi: 'SOS-Expat — प्रेस विज्ञप्ति — ब्लॉगर और कंटेंट क्रिएटर',
      ar: 'SOS-Expat — بيان صحفي — المدونون ومنشئو المحتوى',
    },
    summary: {
      fr: "Programme partenaires pour blogueurs et créateurs — $10 par appel, lien d'affiliation, kit visuel HD, accès démo complet. Audience de 304M d'expatriés.",
      en: 'Blogger partner program — $10 per call, affiliate link, HD visual kit, full demo access. Audience of 304M expats.',
      es: 'Programa de socios para bloggers — $10 por llamada, enlace de afiliación, kit visual HD. 304M expatriados.',
      de: 'Blogger-Partnerprogramm — $10 pro Anruf, Affiliate-Link, HD-Visual-Kit. 304M Expatriates.',
      pt: 'Programa de parceiros para bloggers — $10 por chamada, link de afiliação, kit visual HD. 304M expatriados.',
      ru: 'Партнёрская программа для блогеров — $10 за звонок, ссылка, HD-комплект. 304 млн экспатов.',
      ch: '博主合作计划 — 每次通话$10，联盟链接，高清视觉套件。3.04亿外籍用户。',
      hi: 'ब्लॉगर पार्टनर प्रोग्राम — $10 प्रति कॉल, एफिलिएट लिंक, एचडी किट। 304M प्रवासी।',
      ar: 'برنامج شركاء المدونين — 10$/مكالمة، رابط انتساب، مجموعة HD. 304 مليون مغترب.',
    },
    content: { fr: '', en: '', es: '', de: '', pt: '', ru: '', ch: '', hi: '', ar: '' },
    slug: 'cp4-blogger-creators-2026',
    htmlUrl: cp4HtmlUrls,
    pdfUrl: {},
    tags: ['Blogueurs', 'Affiliation', 'Créateurs'],
    isActive: true,
    publishedAt,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`  [CP4] Document Firestore créé : blogger_releases/cp4`);

  // ── Firestore CP5 ───────────────────────────────────────────────────────────
  console.log('\n=== CP5 : Création document Firestore ===');
  const cp5DocRef = db.collection('group_admin_releases').doc('cp5');

  await cp5DocRef.set({
    title: {
      fr: 'SOS-Expat — Communiqué Administrateurs de Groupes & Communautés',
      en: 'SOS-Expat — Press Release — Group & Community Administrators',
      es: 'SOS-Expat — Comunicado — Administradores de Grupos y Comunidades',
      de: 'SOS-Expat — Pressemitteilung — Gruppen- & Community-Administratoren',
      pt: 'SOS-Expat — Comunicado — Administradores de Grupos e Comunidades',
      ru: 'SOS-Expat — Пресс-релиз — Администраторы Групп и Сообществ',
      ch: 'SOS-Expat — 新闻稿 — 群组和社区管理员',
      hi: 'SOS-Expat — प्रेस विज्ञप्ति — ग्रुप और कम्युनिटी एडमिन',
      ar: 'SOS-Expat — بيان صحفي — مديرو المجموعات والمجتمعات',
    },
    summary: {
      fr: "SOS-Expat donne aux admins de groupes expat la ressource qu'attendaient leurs membres : avocat local, rappel garanti < 5 min, 197 pays.",
      en: "SOS-Expat gives expat group admins the resource their members needed: local lawyer, guaranteed callback < 5 min, 197 countries.",
      es: "SOS-Expat da a los administradores de grupos expat el recurso que esperaban sus miembros: abogado local, < 5 min, 197 países.",
      de: "SOS-Expat gibt Expat-Gruppenadmins die Ressource, auf die ihre Mitglieder gewartet haben: lokaler Anwalt, < 5 Min, 197 Länder.",
      pt: "SOS-Expat dá aos admins de grupos expat o recurso que os membros esperavam: advogado local, < 5 min, 197 países.",
      ru: "SOS-Expat даёт администраторам групп экспатов ресурс, которого ждали их участники: местный адвокат, < 5 мин, 197 стран.",
      ch: "SOS-Expat为外籍人士群组管理员提供成员所需资源：本地律师，5分钟内保证回电，197个国家。",
      hi: "SOS-Expat ग्रुप एडमिन्स को वह संसाधन देता है जिसका उनके सदस्य इंतजार कर रहे थे: स्थानीय वकील, <5 मिनट, 197 देश।",
      ar: "SOS-Expat يمنح مديري مجموعات المغتربين المورد الذي ينتظره أعضاؤهم: محامٍ محلي، < 5 دقائق، 197 دولة.",
    },
    content: { fr: '', en: '', es: '', de: '', pt: '', ru: '', ch: '', hi: '', ar: '' },
    slug: 'cp5-group-admin-communities-2026',
    htmlUrl: cp5HtmlUrls,
    pdfUrl: {},
    tags: ['Communautés', 'Admins Groupes', 'Facebook', 'WhatsApp'],
    isActive: true,
    publishedAt,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`  [CP5] Document Firestore créé : group_admin_releases/cp5`);

  console.log('\n✅ Script terminé avec succès !');
  console.log(`   18 fichiers HTML générés dans : ${OUTPUT_DIR}`);
  console.log('   2 documents Firestore créés : blogger_releases/cp4 + group_admin_releases/cp5');
  console.log('   18 fichiers uploadés sur Firebase Storage');
}

main().catch((err) => {
  console.error('ERREUR :', err);
  process.exit(1);
});
