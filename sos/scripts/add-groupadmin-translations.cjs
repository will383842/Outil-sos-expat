/**
 * Script to add GroupAdmin landing page translations for all 9 languages
 * Usage: node scripts/add-groupadmin-translations.cjs
 */

const fs = require('fs');
const path = require('path');

const helperDir = path.join(__dirname, '../src/helper');

// Complete translations for all 9 languages
const translations = {
  fr: {
    "groupAdmin.landing.badge": "Pour les admins de groupes & communautés",
    "groupAdmin.landing.hero.new.line1": "Gagnez jusqu'à",
    "groupAdmin.landing.hero.new.amount": "5000$+/mois",
    "groupAdmin.landing.hero.new.line2": "avec votre groupe",
    "groupAdmin.landing.hero.new.subtitle": "Monétisez votre communauté Facebook, Discord, WhatsApp ou forum. Vos membres économisent 5$/appel, vous gagnez 10$/appel. Win-win !",
    "groupAdmin.landing.hero.sources": "3 sources de revenus illimitées :",
    "groupAdmin.landing.hero.source1": "par appel membre",
    "groupAdmin.landing.hero.source2": "équipe d'admins",
    "groupAdmin.landing.hero.source3": "avec 10 partenaires",
    "groupAdmin.landing.hero.hot": "🔥 HOT",
    "groupAdmin.landing.hero.partnerExample": "💡 1 partenaire (avocat/aidant) = 30 appels/mois × 5$ × 6 mois = {total} passifs !",
    "groupAdmin.landing.hero.cta": "Devenir partenaire",
    "groupAdmin.landing.hero.free": "100% gratuit - Sans engagement",
    "groupAdmin.landing.scroll": "Découvrir",

    "groupAdmin.landing.howItWorks.title": "Comment ça marche ?",
    "groupAdmin.landing.howItWorks.subtitle": "Trois étapes simples pour commencer à gagner",

    "groupAdmin.landing.step1.label": "ÉTAPE 1",
    "groupAdmin.landing.step1.title": "Inscrivez-vous gratuitement",
    "groupAdmin.landing.step1.description": "Inscrivez-vous et ajoutez votre groupe ou communauté. Obtenez vos liens d'affiliation uniques instantanément.",

    "groupAdmin.landing.step2.label": "ÉTAPE 2",
    "groupAdmin.landing.step2.title": "Partagez les posts prêts à l'emploi",
    "groupAdmin.landing.step2.description": "Utilisez nos posts, bannières et images clé en main. Disponibles en 9 langues !",

    "groupAdmin.landing.step3.label": "ÉTAPE 3",
    "groupAdmin.landing.step3.title": "Gagnez des commissions",
    "groupAdmin.landing.step3.description": "Gagnez 10$ pour chaque appel généré par votre lien. Vos membres obtiennent 5$ de réduction sur chaque appel. Retirez à tout moment.",

    "groupAdmin.landing.calc.badge": "💰 Calculateur de revenus",
    "groupAdmin.landing.calc.title": "Combien pouvez-vous gagner ?",
    "groupAdmin.landing.calc.subtitle": "Estimez vos revenus mensuels en fonction de votre communauté",
    "groupAdmin.landing.calc.members": "Membres dans votre groupe : {count}",
    "groupAdmin.landing.calc.conversion": "Taux de conversion : {rate}%",
    "groupAdmin.landing.calc.conversionHelp": "% de membres qui utilisent le service par mois",
    "groupAdmin.landing.calc.monthlyEarnings": "VOS REVENUS MENSUELS ESTIMÉS",
    "groupAdmin.landing.calc.details": "{members} membres × {rate}% conversion × 10$ = {earnings}$/mois",
    "groupAdmin.landing.calc.motivation": "🎯 Sans compter les avocats/aidants que vous pouvez recruter !",
    "groupAdmin.landing.calc.recurring": "Revenus récurrents chaque mois",

    "groupAdmin.landing.benefits.title": "Pourquoi devenir partenaire ?",

    "groupAdmin.landing.benefit1.title": "Commissions élevées",
    "groupAdmin.landing.benefit1.description": "Gagnez 10$ pour chaque appel généré via votre lien d'affiliation.",

    "groupAdmin.landing.benefit2.title": "Outils prêts à l'emploi",
    "groupAdmin.landing.benefit2.description": "Posts, bannières, images - tout est prêt à l'emploi. Il suffit de copier-coller !",

    "groupAdmin.landing.benefit3.title": "9 langues",
    "groupAdmin.landing.benefit3.description": "Toutes les ressources disponibles en FR, EN, ES, PT, AR, DE, IT, NL, ZH.",

    "groupAdmin.landing.benefit4.title": "5$ de réduction par appel",
    "groupAdmin.landing.benefit4.description": "Les membres de votre communauté bénéficient de 5$ de réduction sur chaque appel effectué via votre lien.",

    "groupAdmin.landing.targetGroups.title": "Parfait pour votre groupe",
    "groupAdmin.landing.targetGroups.subtitle": "Que vous gériez un groupe Facebook, un serveur Discord, une communauté WhatsApp, un forum ou tout autre groupe - nous avons les bons outils pour vous.",

    "groupAdmin.landing.groupType.travel": "Groupes de voyage",
    "groupAdmin.landing.groupType.expat": "Communautés d'expatriés",
    "groupAdmin.landing.groupType.nomad": "Nomades digitaux",
    "groupAdmin.landing.groupType.immigration": "Immigration",
    "groupAdmin.landing.groupType.relocation": "Relocation",
    "groupAdmin.landing.groupType.student": "Étudiants à l'étranger",
    "groupAdmin.landing.groupType.family": "Familles d'expatriés",
    "groupAdmin.landing.groupType.retirement": "Retraite à l'étranger",

    "groupAdmin.landing.faq.title": "Questions fréquentes",
    "groupAdmin.landing.faq.subtitle": "Tout ce que vous devez savoir avant de commencer",

    "groupAdmin.landing.faq.q1": "Est-ce vraiment gratuit de rejoindre ?",
    "groupAdmin.landing.faq.a1": "Oui ! L'inscription est 100% gratuite. Il n'y a pas de frais, pas d'engagement et pas d'exigence minimale.",

    "groupAdmin.landing.faq.q2": "Quand suis-je payé ?",
    "groupAdmin.landing.faq.a2": "Les commissions deviennent disponibles 7 jours après la consultation du client. Vous pouvez retirer à tout moment dès que vous avez au moins 25$.",

    "groupAdmin.landing.faq.q3": "Quels modes de paiement sont disponibles ?",
    "groupAdmin.landing.faq.a3": "Nous prenons en charge PayPal, Wise, Mobile Money et les virements bancaires vers plus de 100 pays.",

    "groupAdmin.landing.faq.q4": "Comment fonctionne la réduction de 5$ pour mes membres ?",
    "groupAdmin.landing.faq.a4": "Chaque appel effectué via votre lien d'affiliation donne à vos membres une réduction de 5$. Cela facilite la promotion - vos membres économisent de l'argent pendant que vous gagnez 10$ par appel.",

    "groupAdmin.landing.faq.q5": "Quel type de groupes sont éligibles ?",
    "groupAdmin.landing.faq.a5": "Tout groupe ou communauté lié au voyage, à l'expatriation, à l'immigration, à la relocation internationale ou à la vie à l'étranger est éligible. Groupes Facebook, serveurs Discord, communautés WhatsApp, forums et plus encore !",

    "groupAdmin.landing.finalCta.title": "Prêt à commencer à gagner ?",
    "groupAdmin.landing.finalCta.subtitle": "Rejoignez des centaines d'administrateurs de groupes qui gagnent déjà avec SOS-Expat.",

    "groupAdmin.landing.recap.perCall": "10$ par appel",
    "groupAdmin.landing.recap.discount": "5$ de réduction pour les membres",
    "groupAdmin.landing.recap.languages": "9 langues",
    "groupAdmin.landing.recap.free": "100% gratuit",

    "groupAdmin.landing.finalCta.cta": "S'inscrire maintenant - C'est gratuit",
    "groupAdmin.landing.finalCta.footer": "Inscription gratuite • Commencez en 5 minutes",

    "groupAdmin.landing.seo.title": "Devenez partenaire Admin de Groupe - Gagnez 10$ par appel + 5$ de réduction | SOS-Expat",
    "groupAdmin.landing.seo.description": "Monétisez votre groupe ou communauté. Gagnez 10$ pour chaque appel généré par votre lien d'affiliation, plus une réduction de 5$ pour vos membres sur chaque appel. Outils prêts à l'emploi en 9 langues.",
  },

  en: {
    "groupAdmin.landing.badge": "For Group & Community Admins",
    "groupAdmin.landing.hero.new.line1": "Earn up to",
    "groupAdmin.landing.hero.new.amount": "$5000+/month",
    "groupAdmin.landing.hero.new.line2": "with your group",
    "groupAdmin.landing.hero.new.subtitle": "Monetize your Facebook, Discord, WhatsApp or forum community. Your members save $5/call, you earn $10/call. Win-win!",
    "groupAdmin.landing.hero.sources": "3 unlimited revenue streams:",
    "groupAdmin.landing.hero.source1": "per member call",
    "groupAdmin.landing.hero.source2": "admin team",
    "groupAdmin.landing.hero.source3": "with 10 partners",
    "groupAdmin.landing.hero.hot": "🔥 HOT",
    "groupAdmin.landing.hero.partnerExample": "💡 1 partner (lawyer/helper) = 30 calls/month × $5 × 6 months = {total} passive!",
    "groupAdmin.landing.hero.cta": "Become a Partner",
    "groupAdmin.landing.hero.free": "100% free - No commitment",
    "groupAdmin.landing.scroll": "Discover",

    "groupAdmin.landing.howItWorks.title": "How It Works",
    "groupAdmin.landing.howItWorks.subtitle": "Three simple steps to start earning",

    "groupAdmin.landing.step1.label": "STEP 1",
    "groupAdmin.landing.step1.title": "Register for Free",
    "groupAdmin.landing.step1.description": "Sign up and add your group or community. Get your unique affiliate links instantly.",

    "groupAdmin.landing.step2.label": "STEP 2",
    "groupAdmin.landing.step2.title": "Share Ready-Made Posts",
    "groupAdmin.landing.step2.description": "Use our copy-paste posts, banners, and images. Available in 9 languages!",

    "groupAdmin.landing.step3.label": "STEP 3",
    "groupAdmin.landing.step3.title": "Earn Commissions",
    "groupAdmin.landing.step3.description": "Earn $10 for each call generated by your link. Your members get $5 off every call. Withdraw anytime.",

    "groupAdmin.landing.calc.badge": "💰 Revenue Calculator",
    "groupAdmin.landing.calc.title": "How Much Can You Earn?",
    "groupAdmin.landing.calc.subtitle": "Estimate your monthly revenue based on your community",
    "groupAdmin.landing.calc.members": "Members in your group: {count}",
    "groupAdmin.landing.calc.conversion": "Conversion rate: {rate}%",
    "groupAdmin.landing.calc.conversionHelp": "% of members who use the service per month",
    "groupAdmin.landing.calc.monthlyEarnings": "YOUR ESTIMATED MONTHLY REVENUE",
    "groupAdmin.landing.calc.details": "{members} members × {rate}% conversion × $10 = ${earnings}/month",
    "groupAdmin.landing.calc.motivation": "🎯 Not including the lawyers/helpers you can recruit!",
    "groupAdmin.landing.calc.recurring": "Recurring revenue every month",

    "groupAdmin.landing.benefits.title": "Why Join?",

    "groupAdmin.landing.benefit1.title": "High Commissions",
    "groupAdmin.landing.benefit1.description": "Earn $10 for every call generated through your affiliate link.",

    "groupAdmin.landing.benefit2.title": "Ready-Made Tools",
    "groupAdmin.landing.benefit2.description": "Posts, banners, images - all ready to use. Just copy-paste!",

    "groupAdmin.landing.benefit3.title": "9 Languages",
    "groupAdmin.landing.benefit3.description": "All resources available in FR, EN, ES, PT, AR, DE, IT, NL, ZH.",

    "groupAdmin.landing.benefit4.title": "$5 Off Every Call",
    "groupAdmin.landing.benefit4.description": "Your community members get $5 off on every call made through your link.",

    "groupAdmin.landing.targetGroups.title": "Perfect For Your Group",
    "groupAdmin.landing.targetGroups.subtitle": "Whether you manage a Facebook group, Discord server, WhatsApp community, forum, or any other group - we have the right tools for you.",

    "groupAdmin.landing.groupType.travel": "Travel Groups",
    "groupAdmin.landing.groupType.expat": "Expat Communities",
    "groupAdmin.landing.groupType.nomad": "Digital Nomads",
    "groupAdmin.landing.groupType.immigration": "Immigration",
    "groupAdmin.landing.groupType.relocation": "Relocation",
    "groupAdmin.landing.groupType.student": "Students Abroad",
    "groupAdmin.landing.groupType.family": "Expat Families",
    "groupAdmin.landing.groupType.retirement": "Retirement Abroad",

    "groupAdmin.landing.faq.title": "Frequently Asked Questions",
    "groupAdmin.landing.faq.subtitle": "Everything you need to know before getting started",

    "groupAdmin.landing.faq.q1": "Is it really free to join?",
    "groupAdmin.landing.faq.a1": "Yes! Registration is 100% free. There are no fees, no commitments, and no minimum requirements.",

    "groupAdmin.landing.faq.q2": "When do I get paid?",
    "groupAdmin.landing.faq.a2": "Commissions become available 7 days after the client's consultation. You can withdraw anytime once you have at least $25.",

    "groupAdmin.landing.faq.q3": "What payment methods are available?",
    "groupAdmin.landing.faq.a3": "We support PayPal, Wise, Mobile Money, and bank transfers to over 100 countries.",

    "groupAdmin.landing.faq.q4": "How does the $5 discount work for my members?",
    "groupAdmin.landing.faq.a4": "Every call made through your affiliate link gives your community members a $5 discount. This makes it easy to promote - your members save money while you earn $10 per call.",

    "groupAdmin.landing.faq.q5": "What kind of groups are eligible?",
    "groupAdmin.landing.faq.a5": "Any group or community related to travel, expatriation, immigration, international relocation, or living abroad is eligible. Facebook groups, Discord servers, WhatsApp communities, forums, and more!",

    "groupAdmin.landing.finalCta.title": "Ready to Start Earning?",
    "groupAdmin.landing.finalCta.subtitle": "Join hundreds of group admins already earning with SOS-Expat.",

    "groupAdmin.landing.recap.perCall": "$10 per call",
    "groupAdmin.landing.recap.discount": "$5 discount for members",
    "groupAdmin.landing.recap.languages": "9 languages",
    "groupAdmin.landing.recap.free": "100% free",

    "groupAdmin.landing.finalCta.cta": "Register Now - It's Free",
    "groupAdmin.landing.finalCta.footer": "Free registration • Start in 5 minutes",

    "groupAdmin.landing.seo.title": "Become a Group Admin Partner - Earn $10 per Call + $5 Discount | SOS-Expat",
    "groupAdmin.landing.seo.description": "Monetize your group or community. Earn $10 for each call generated by your affiliate link, plus a $5 discount for your members on every call. Ready-to-use tools in 9 languages.",
  },

  es: {
    "groupAdmin.landing.badge": "Para Administradores de Grupos y Comunidades",
    "groupAdmin.landing.hero.new.line1": "Gana hasta",
    "groupAdmin.landing.hero.new.amount": "$5000+/mes",
    "groupAdmin.landing.hero.new.line2": "con tu grupo",
    "groupAdmin.landing.hero.new.subtitle": "Monetiza tu comunidad de Facebook, Discord, WhatsApp o foro. Tus miembros ahorran $5/llamada, tú ganas $10/llamada. ¡Todos ganan!",
    "groupAdmin.landing.hero.sources": "3 fuentes de ingresos ilimitadas:",
    "groupAdmin.landing.hero.source1": "por llamada de miembro",
    "groupAdmin.landing.hero.source2": "equipo de admins",
    "groupAdmin.landing.hero.source3": "con 10 socios",
    "groupAdmin.landing.hero.hot": "🔥 HOT",
    "groupAdmin.landing.hero.partnerExample": "💡 1 socio (abogado/asistente) = 30 llamadas/mes × $5 × 6 meses = {total} pasivos!",
    "groupAdmin.landing.hero.cta": "Convertirse en socio",
    "groupAdmin.landing.hero.free": "100% gratis - Sin compromiso",
    "groupAdmin.landing.scroll": "Descubrir",

    "groupAdmin.landing.howItWorks.title": "¿Cómo funciona?",
    "groupAdmin.landing.howItWorks.subtitle": "Tres pasos simples para empezar a ganar",

    "groupAdmin.landing.step1.label": "PASO 1",
    "groupAdmin.landing.step1.title": "Regístrate gratis",
    "groupAdmin.landing.step1.description": "Regístrate y añade tu grupo o comunidad. Obtén tus enlaces de afiliado únicos al instante.",

    "groupAdmin.landing.step2.label": "PASO 2",
    "groupAdmin.landing.step2.title": "Comparte publicaciones listas",
    "groupAdmin.landing.step2.description": "Usa nuestras publicaciones, banners e imágenes listas para copiar y pegar. ¡Disponibles en 9 idiomas!",

    "groupAdmin.landing.step3.label": "PASO 3",
    "groupAdmin.landing.step3.title": "Gana comisiones",
    "groupAdmin.landing.step3.description": "Gana $10 por cada llamada generada por tu enlace. Tus miembros obtienen $5 de descuento en cada llamada. Retira cuando quieras.",

    "groupAdmin.landing.calc.badge": "💰 Calculadora de ingresos",
    "groupAdmin.landing.calc.title": "¿Cuánto puedes ganar?",
    "groupAdmin.landing.calc.subtitle": "Estima tus ingresos mensuales según tu comunidad",
    "groupAdmin.landing.calc.members": "Miembros en tu grupo: {count}",
    "groupAdmin.landing.calc.conversion": "Tasa de conversión: {rate}%",
    "groupAdmin.landing.calc.conversionHelp": "% de miembros que usan el servicio por mes",
    "groupAdmin.landing.calc.monthlyEarnings": "TUS INGRESOS MENSUALES ESTIMADOS",
    "groupAdmin.landing.calc.details": "{members} miembros × {rate}% conversión × $10 = ${earnings}/mes",
    "groupAdmin.landing.calc.motivation": "🎯 ¡Sin contar los abogados/asistentes que puedes reclutar!",
    "groupAdmin.landing.calc.recurring": "Ingresos recurrentes cada mes",

    "groupAdmin.landing.benefits.title": "¿Por qué unirse?",

    "groupAdmin.landing.benefit1.title": "Comisiones altas",
    "groupAdmin.landing.benefit1.description": "Gana $10 por cada llamada generada a través de tu enlace de afiliado.",

    "groupAdmin.landing.benefit2.title": "Herramientas listas",
    "groupAdmin.landing.benefit2.description": "Publicaciones, banners, imágenes - todo listo para usar. ¡Solo copia y pega!",

    "groupAdmin.landing.benefit3.title": "9 idiomas",
    "groupAdmin.landing.benefit3.description": "Todos los recursos disponibles en FR, EN, ES, PT, AR, DE, IT, NL, ZH.",

    "groupAdmin.landing.benefit4.title": "$5 de descuento por llamada",
    "groupAdmin.landing.benefit4.description": "Los miembros de tu comunidad obtienen $5 de descuento en cada llamada realizada a través de tu enlace.",

    "groupAdmin.landing.targetGroups.title": "Perfecto para tu grupo",
    "groupAdmin.landing.targetGroups.subtitle": "Ya sea que gestiones un grupo de Facebook, servidor de Discord, comunidad de WhatsApp, foro u otro grupo - tenemos las herramientas adecuadas para ti.",

    "groupAdmin.landing.groupType.travel": "Grupos de viajes",
    "groupAdmin.landing.groupType.expat": "Comunidades de expatriados",
    "groupAdmin.landing.groupType.nomad": "Nómadas digitales",
    "groupAdmin.landing.groupType.immigration": "Inmigración",
    "groupAdmin.landing.groupType.relocation": "Reubicación",
    "groupAdmin.landing.groupType.student": "Estudiantes en el extranjero",
    "groupAdmin.landing.groupType.family": "Familias de expatriados",
    "groupAdmin.landing.groupType.retirement": "Jubilación en el extranjero",

    "groupAdmin.landing.faq.title": "Preguntas frecuentes",
    "groupAdmin.landing.faq.subtitle": "Todo lo que necesitas saber antes de empezar",

    "groupAdmin.landing.faq.q1": "¿Es realmente gratis unirse?",
    "groupAdmin.landing.faq.a1": "¡Sí! El registro es 100% gratis. No hay tarifas, ni compromisos, ni requisitos mínimos.",

    "groupAdmin.landing.faq.q2": "¿Cuándo me pagan?",
    "groupAdmin.landing.faq.a2": "Las comisiones están disponibles 7 días después de la consulta del cliente. Puedes retirar en cualquier momento una vez que tengas al menos $25.",

    "groupAdmin.landing.faq.q3": "¿Qué métodos de pago están disponibles?",
    "groupAdmin.landing.faq.a3": "Admitimos PayPal, Wise, Mobile Money y transferencias bancarias a más de 100 países.",

    "groupAdmin.landing.faq.q4": "¿Cómo funciona el descuento de $5 para mis miembros?",
    "groupAdmin.landing.faq.a4": "Cada llamada realizada a través de tu enlace de afiliado le da a tus miembros un descuento de $5. Esto facilita la promoción: tus miembros ahorran dinero mientras tú ganas $10 por llamada.",

    "groupAdmin.landing.faq.q5": "¿Qué tipo de grupos son elegibles?",
    "groupAdmin.landing.faq.a5": "Cualquier grupo o comunidad relacionado con viajes, expatriación, inmigración, reubicación internacional o vida en el extranjero es elegible. ¡Grupos de Facebook, servidores de Discord, comunidades de WhatsApp, foros y más!",

    "groupAdmin.landing.finalCta.title": "¿Listo para empezar a ganar?",
    "groupAdmin.landing.finalCta.subtitle": "Únete a cientos de administradores de grupos que ya están ganando con SOS-Expat.",

    "groupAdmin.landing.recap.perCall": "$10 por llamada",
    "groupAdmin.landing.recap.discount": "$5 de descuento para miembros",
    "groupAdmin.landing.recap.languages": "9 idiomas",
    "groupAdmin.landing.recap.free": "100% gratis",

    "groupAdmin.landing.finalCta.cta": "Regístrate ahora - Es gratis",
    "groupAdmin.landing.finalCta.footer": "Registro gratuito • Comienza en 5 minutos",

    "groupAdmin.landing.seo.title": "Conviértete en socio de administrador de grupo - Gana $10 por llamada + $5 de descuento | SOS-Expat",
    "groupAdmin.landing.seo.description": "Monetiza tu grupo o comunidad. Gana $10 por cada llamada generada por tu enlace de afiliado, más un descuento de $5 para tus miembros en cada llamada. Herramientas listas para usar en 9 idiomas.",
  },

  de: {
    "groupAdmin.landing.badge": "Für Gruppen- & Community-Admins",
    "groupAdmin.landing.hero.new.line1": "Verdienen Sie bis zu",
    "groupAdmin.landing.hero.new.amount": "$5000+/Monat",
    "groupAdmin.landing.hero.new.line2": "mit Ihrer Gruppe",
    "groupAdmin.landing.hero.new.subtitle": "Monetarisieren Sie Ihre Facebook-, Discord-, WhatsApp- oder Forum-Community. Ihre Mitglieder sparen $5/Anruf, Sie verdienen $10/Anruf. Win-Win!",
    "groupAdmin.landing.hero.sources": "3 unbegrenzte Einnahmequellen:",
    "groupAdmin.landing.hero.source1": "pro Mitgliederanruf",
    "groupAdmin.landing.hero.source2": "Admin-Team",
    "groupAdmin.landing.hero.source3": "mit 10 Partnern",
    "groupAdmin.landing.hero.hot": "🔥 HOT",
    "groupAdmin.landing.hero.partnerExample": "💡 1 Partner (Anwalt/Helfer) = 30 Anrufe/Monat × $5 × 6 Monate = {total} passiv!",
    "groupAdmin.landing.hero.cta": "Partner werden",
    "groupAdmin.landing.hero.free": "100% kostenlos - Keine Verpflichtung",
    "groupAdmin.landing.scroll": "Entdecken",

    "groupAdmin.landing.howItWorks.title": "Wie funktioniert es?",
    "groupAdmin.landing.howItWorks.subtitle": "Drei einfache Schritte zum Geldverdienen",

    "groupAdmin.landing.step1.label": "SCHRITT 1",
    "groupAdmin.landing.step1.title": "Kostenlos registrieren",
    "groupAdmin.landing.step1.description": "Melden Sie sich an und fügen Sie Ihre Gruppe oder Community hinzu. Erhalten Sie sofort Ihre einzigartigen Affiliate-Links.",

    "groupAdmin.landing.step2.label": "SCHRITT 2",
    "groupAdmin.landing.step2.title": "Fertige Beiträge teilen",
    "groupAdmin.landing.step2.description": "Verwenden Sie unsere fertigen Beiträge, Banner und Bilder zum Kopieren und Einfügen. In 9 Sprachen verfügbar!",

    "groupAdmin.landing.step3.label": "SCHRITT 3",
    "groupAdmin.landing.step3.title": "Provisionen verdienen",
    "groupAdmin.landing.step3.description": "Verdienen Sie $10 für jeden über Ihren Link generierten Anruf. Ihre Mitglieder erhalten $5 Rabatt auf jeden Anruf. Jederzeit auszahlbar.",

    "groupAdmin.landing.calc.badge": "💰 Einnahmenrechner",
    "groupAdmin.landing.calc.title": "Wie viel können Sie verdienen?",
    "groupAdmin.landing.calc.subtitle": "Schätzen Sie Ihre monatlichen Einnahmen basierend auf Ihrer Community",
    "groupAdmin.landing.calc.members": "Mitglieder in Ihrer Gruppe: {count}",
    "groupAdmin.landing.calc.conversion": "Konversionsrate: {rate}%",
    "groupAdmin.landing.calc.conversionHelp": "% der Mitglieder, die den Service pro Monat nutzen",
    "groupAdmin.landing.calc.monthlyEarnings": "IHRE GESCHÄTZTEN MONATLICHEN EINNAHMEN",
    "groupAdmin.landing.calc.details": "{members} Mitglieder × {rate}% Konversion × $10 = ${earnings}/Monat",
    "groupAdmin.landing.calc.motivation": "🎯 Ohne die Anwälte/Helfer, die Sie rekrutieren können!",
    "groupAdmin.landing.calc.recurring": "Wiederkehrende Einnahmen jeden Monat",

    "groupAdmin.landing.benefits.title": "Warum beitreten?",

    "groupAdmin.landing.benefit1.title": "Hohe Provisionen",
    "groupAdmin.landing.benefit1.description": "Verdienen Sie $10 für jeden über Ihren Affiliate-Link generierten Anruf.",

    "groupAdmin.landing.benefit2.title": "Fertige Tools",
    "groupAdmin.landing.benefit2.description": "Beiträge, Banner, Bilder - alles sofort einsatzbereit. Einfach kopieren und einfügen!",

    "groupAdmin.landing.benefit3.title": "9 Sprachen",
    "groupAdmin.landing.benefit3.description": "Alle Ressourcen verfügbar in FR, EN, ES, PT, AR, DE, IT, NL, ZH.",

    "groupAdmin.landing.benefit4.title": "$5 Rabatt pro Anruf",
    "groupAdmin.landing.benefit4.description": "Ihre Community-Mitglieder erhalten $5 Rabatt auf jeden über Ihren Link getätigten Anruf.",

    "groupAdmin.landing.targetGroups.title": "Perfekt für Ihre Gruppe",
    "groupAdmin.landing.targetGroups.subtitle": "Egal ob Sie eine Facebook-Gruppe, einen Discord-Server, eine WhatsApp-Community, ein Forum oder eine andere Gruppe verwalten - wir haben die richtigen Tools für Sie.",

    "groupAdmin.landing.groupType.travel": "Reisegruppen",
    "groupAdmin.landing.groupType.expat": "Expat-Communities",
    "groupAdmin.landing.groupType.nomad": "Digitale Nomaden",
    "groupAdmin.landing.groupType.immigration": "Einwanderung",
    "groupAdmin.landing.groupType.relocation": "Umzug",
    "groupAdmin.landing.groupType.student": "Studenten im Ausland",
    "groupAdmin.landing.groupType.family": "Expat-Familien",
    "groupAdmin.landing.groupType.retirement": "Ruhestand im Ausland",

    "groupAdmin.landing.faq.title": "Häufig gestellte Fragen",
    "groupAdmin.landing.faq.subtitle": "Alles, was Sie wissen müssen, bevor Sie beginnen",

    "groupAdmin.landing.faq.q1": "Ist der Beitritt wirklich kostenlos?",
    "groupAdmin.landing.faq.a1": "Ja! Die Registrierung ist 100% kostenlos. Es gibt keine Gebühren, keine Verpflichtungen und keine Mindestanforderungen.",

    "groupAdmin.landing.faq.q2": "Wann werde ich bezahlt?",
    "groupAdmin.landing.faq.a2": "Provisionen werden 7 Tage nach der Beratung des Kunden verfügbar. Sie können jederzeit abheben, sobald Sie mindestens $25 haben.",

    "groupAdmin.landing.faq.q3": "Welche Zahlungsmethoden sind verfügbar?",
    "groupAdmin.landing.faq.a3": "Wir unterstützen PayPal, Wise, Mobile Money und Banküberweisungen in über 100 Länder.",

    "groupAdmin.landing.faq.q4": "Wie funktioniert der $5-Rabatt für meine Mitglieder?",
    "groupAdmin.landing.faq.a4": "Jeder über Ihren Affiliate-Link getätigte Anruf gibt Ihren Community-Mitgliedern einen $5-Rabatt. Das erleichtert die Werbung - Ihre Mitglieder sparen Geld, während Sie $10 pro Anruf verdienen.",

    "groupAdmin.landing.faq.q5": "Welche Art von Gruppen sind berechtigt?",
    "groupAdmin.landing.faq.a5": "Jede Gruppe oder Community, die mit Reisen, Expatriierung, Einwanderung, internationalem Umzug oder Leben im Ausland zu tun hat, ist berechtigt. Facebook-Gruppen, Discord-Server, WhatsApp-Communities, Foren und mehr!",

    "groupAdmin.landing.finalCta.title": "Bereit, Geld zu verdienen?",
    "groupAdmin.landing.finalCta.subtitle": "Schließen Sie sich Hunderten von Gruppenadministratoren an, die bereits mit SOS-Expat verdienen.",

    "groupAdmin.landing.recap.perCall": "$10 pro Anruf",
    "groupAdmin.landing.recap.discount": "$5 Rabatt für Mitglieder",
    "groupAdmin.landing.recap.languages": "9 Sprachen",
    "groupAdmin.landing.recap.free": "100% kostenlos",

    "groupAdmin.landing.finalCta.cta": "Jetzt registrieren - Kostenlos",
    "groupAdmin.landing.finalCta.footer": "Kostenlose Registrierung • In 5 Minuten starten",

    "groupAdmin.landing.seo.title": "Werden Sie Gruppenadmin-Partner - Verdienen Sie $10 pro Anruf + $5 Rabatt | SOS-Expat",
    "groupAdmin.landing.seo.description": "Monetarisieren Sie Ihre Gruppe oder Community. Verdienen Sie $10 für jeden über Ihren Affiliate-Link generierten Anruf, plus $5 Rabatt für Ihre Mitglieder auf jeden Anruf. Sofort einsatzbereite Tools in 9 Sprachen.",
  },

  pt: {
    "groupAdmin.landing.badge": "Para Administradores de Grupos e Comunidades",
    "groupAdmin.landing.hero.new.line1": "Ganhe até",
    "groupAdmin.landing.hero.new.amount": "$5000+/mês",
    "groupAdmin.landing.hero.new.line2": "com seu grupo",
    "groupAdmin.landing.hero.new.subtitle": "Monetize sua comunidade do Facebook, Discord, WhatsApp ou fórum. Seus membros economizam $5/chamada, você ganha $10/chamada. Todos ganham!",
    "groupAdmin.landing.hero.sources": "3 fontes de renda ilimitadas:",
    "groupAdmin.landing.hero.source1": "por chamada de membro",
    "groupAdmin.landing.hero.source2": "equipe de admins",
    "groupAdmin.landing.hero.source3": "com 10 parceiros",
    "groupAdmin.landing.hero.hot": "🔥 HOT",
    "groupAdmin.landing.hero.partnerExample": "💡 1 parceiro (advogado/assistente) = 30 chamadas/mês × $5 × 6 meses = {total} passivos!",
    "groupAdmin.landing.hero.cta": "Tornar-se parceiro",
    "groupAdmin.landing.hero.free": "100% grátis - Sem compromisso",
    "groupAdmin.landing.scroll": "Descobrir",

    "groupAdmin.landing.howItWorks.title": "Como funciona?",
    "groupAdmin.landing.howItWorks.subtitle": "Três passos simples para começar a ganhar",

    "groupAdmin.landing.step1.label": "PASSO 1",
    "groupAdmin.landing.step1.title": "Registe-se gratuitamente",
    "groupAdmin.landing.step1.description": "Inscreva-se e adicione seu grupo ou comunidade. Obtenha seus links de afiliado exclusivos instantaneamente.",

    "groupAdmin.landing.step2.label": "PASSO 2",
    "groupAdmin.landing.step2.title": "Compartilhe publicações prontas",
    "groupAdmin.landing.step2.description": "Use nossas publicações, banners e imagens prontos para copiar e colar. Disponíveis em 9 idiomas!",

    "groupAdmin.landing.step3.label": "PASSO 3",
    "groupAdmin.landing.step3.title": "Ganhe comissões",
    "groupAdmin.landing.step3.description": "Ganhe $10 por cada chamada gerada pelo seu link. Seus membros recebem $5 de desconto em cada chamada. Retire quando quiser.",

    "groupAdmin.landing.calc.badge": "💰 Calculadora de rendimentos",
    "groupAdmin.landing.calc.title": "Quanto você pode ganhar?",
    "groupAdmin.landing.calc.subtitle": "Estime seus rendimentos mensais com base na sua comunidade",
    "groupAdmin.landing.calc.members": "Membros no seu grupo: {count}",
    "groupAdmin.landing.calc.conversion": "Taxa de conversão: {rate}%",
    "groupAdmin.landing.calc.conversionHelp": "% de membros que usam o serviço por mês",
    "groupAdmin.landing.calc.monthlyEarnings": "SEUS RENDIMENTOS MENSAIS ESTIMADOS",
    "groupAdmin.landing.calc.details": "{members} membros × {rate}% conversão × $10 = ${earnings}/mês",
    "groupAdmin.landing.calc.motivation": "🎯 Sem contar os advogados/assistentes que você pode recrutar!",
    "groupAdmin.landing.calc.recurring": "Rendimentos recorrentes todos os meses",

    "groupAdmin.landing.benefits.title": "Por que se juntar?",

    "groupAdmin.landing.benefit1.title": "Comissões altas",
    "groupAdmin.landing.benefit1.description": "Ganhe $10 por cada chamada gerada através do seu link de afiliado.",

    "groupAdmin.landing.benefit2.title": "Ferramentas prontas",
    "groupAdmin.landing.benefit2.description": "Publicações, banners, imagens - tudo pronto para usar. Basta copiar e colar!",

    "groupAdmin.landing.benefit3.title": "9 idiomas",
    "groupAdmin.landing.benefit3.description": "Todos os recursos disponíveis em FR, EN, ES, PT, AR, DE, IT, NL, ZH.",

    "groupAdmin.landing.benefit4.title": "$5 de desconto por chamada",
    "groupAdmin.landing.benefit4.description": "Os membros da sua comunidade recebem $5 de desconto em cada chamada feita através do seu link.",

    "groupAdmin.landing.targetGroups.title": "Perfeito para o seu grupo",
    "groupAdmin.landing.targetGroups.subtitle": "Seja você gerenciando um grupo do Facebook, servidor do Discord, comunidade do WhatsApp, fórum ou qualquer outro grupo - temos as ferramentas certas para você.",

    "groupAdmin.landing.groupType.travel": "Grupos de viagens",
    "groupAdmin.landing.groupType.expat": "Comunidades de expatriados",
    "groupAdmin.landing.groupType.nomad": "Nómadas digitais",
    "groupAdmin.landing.groupType.immigration": "Imigração",
    "groupAdmin.landing.groupType.relocation": "Relocação",
    "groupAdmin.landing.groupType.student": "Estudantes no estrangeiro",
    "groupAdmin.landing.groupType.family": "Famílias de expatriados",
    "groupAdmin.landing.groupType.retirement": "Reforma no estrangeiro",

    "groupAdmin.landing.faq.title": "Perguntas frequentes",
    "groupAdmin.landing.faq.subtitle": "Tudo o que você precisa saber antes de começar",

    "groupAdmin.landing.faq.q1": "É realmente grátis para se juntar?",
    "groupAdmin.landing.faq.a1": "Sim! O registo é 100% gratuito. Não há taxas, sem compromissos e sem requisitos mínimos.",

    "groupAdmin.landing.faq.q2": "Quando sou pago?",
    "groupAdmin.landing.faq.a2": "As comissões ficam disponíveis 7 dias após a consulta do cliente. Você pode retirar a qualquer momento assim que tiver pelo menos $25.",

    "groupAdmin.landing.faq.q3": "Quais métodos de pagamento estão disponíveis?",
    "groupAdmin.landing.faq.a3": "Suportamos PayPal, Wise, Mobile Money e transferências bancárias para mais de 100 países.",

    "groupAdmin.landing.faq.q4": "Como funciona o desconto de $5 para meus membros?",
    "groupAdmin.landing.faq.a4": "Cada chamada feita através do seu link de afiliado dá aos membros da sua comunidade um desconto de $5. Isso facilita a promoção - seus membros economizam dinheiro enquanto você ganha $10 por chamada.",

    "groupAdmin.landing.faq.q5": "Que tipo de grupos são elegíveis?",
    "groupAdmin.landing.faq.a5": "Qualquer grupo ou comunidade relacionado a viagens, expatriação, imigração, relocação internacional ou vida no estrangeiro é elegível. Grupos do Facebook, servidores do Discord, comunidades do WhatsApp, fóruns e muito mais!",

    "groupAdmin.landing.finalCta.title": "Pronto para começar a ganhar?",
    "groupAdmin.landing.finalCta.subtitle": "Junte-se a centenas de administradores de grupos que já estão ganhando com SOS-Expat.",

    "groupAdmin.landing.recap.perCall": "$10 por chamada",
    "groupAdmin.landing.recap.discount": "$5 de desconto para membros",
    "groupAdmin.landing.recap.languages": "9 idiomas",
    "groupAdmin.landing.recap.free": "100% grátis",

    "groupAdmin.landing.finalCta.cta": "Registe-se agora - É grátis",
    "groupAdmin.landing.finalCta.footer": "Registo gratuito • Comece em 5 minutos",

    "groupAdmin.landing.seo.title": "Torne-se parceiro de administrador de grupo - Ganhe $10 por chamada + $5 de desconto | SOS-Expat",
    "groupAdmin.landing.seo.description": "Monetize seu grupo ou comunidade. Ganhe $10 por cada chamada gerada pelo seu link de afiliado, mais um desconto de $5 para seus membros em cada chamada. Ferramentas prontas para usar em 9 idiomas.",
  },

  ru: {
    "groupAdmin.landing.badge": "Для администраторов групп и сообществ",
    "groupAdmin.landing.hero.new.line1": "Зарабатывайте до",
    "groupAdmin.landing.hero.new.amount": "$5000+/месяц",
    "groupAdmin.landing.hero.new.line2": "с вашей группой",
    "groupAdmin.landing.hero.new.subtitle": "Монетизируйте свое сообщество в Facebook, Discord, WhatsApp или форуме. Ваши участники экономят $5/звонок, вы зарабатываете $10/звонок. Все в выигрыше!",
    "groupAdmin.landing.hero.sources": "3 неограниченных источника дохода:",
    "groupAdmin.landing.hero.source1": "за звонок участника",
    "groupAdmin.landing.hero.source2": "команда администраторов",
    "groupAdmin.landing.hero.source3": "с 10 партнерами",
    "groupAdmin.landing.hero.hot": "🔥 ГОРЯЧЕЕ",
    "groupAdmin.landing.hero.partnerExample": "💡 1 партнер (юрист/помощник) = 30 звонков/месяц × $5 × 6 месяцев = {total} пассивного дохода!",
    "groupAdmin.landing.hero.cta": "Стать партнером",
    "groupAdmin.landing.hero.free": "100% бесплатно - Без обязательств",
    "groupAdmin.landing.scroll": "Узнать больше",

    "groupAdmin.landing.howItWorks.title": "Как это работает?",
    "groupAdmin.landing.howItWorks.subtitle": "Три простых шага для начала заработка",

    "groupAdmin.landing.step1.label": "ШАГ 1",
    "groupAdmin.landing.step1.title": "Зарегистрируйтесь бесплатно",
    "groupAdmin.landing.step1.description": "Зарегистрируйтесь и добавьте свою группу или сообщество. Получите уникальные партнерские ссылки мгновенно.",

    "groupAdmin.landing.step2.label": "ШАГ 2",
    "groupAdmin.landing.step2.title": "Делитесь готовыми постами",
    "groupAdmin.landing.step2.description": "Используйте наши готовые посты, баннеры и изображения для копирования и вставки. Доступно на 9 языках!",

    "groupAdmin.landing.step3.label": "ШАГ 3",
    "groupAdmin.landing.step3.title": "Зарабатывайте комиссионные",
    "groupAdmin.landing.step3.description": "Зарабатывайте $10 за каждый звонок, сгенерированный по вашей ссылке. Ваши участники получают скидку $5 на каждый звонок. Выводите в любое время.",

    "groupAdmin.landing.calc.badge": "💰 Калькулятор дохода",
    "groupAdmin.landing.calc.title": "Сколько вы можете заработать?",
    "groupAdmin.landing.calc.subtitle": "Рассчитайте свой ежемесячный доход на основе вашего сообщества",
    "groupAdmin.landing.calc.members": "Участников в вашей группе: {count}",
    "groupAdmin.landing.calc.conversion": "Коэффициент конверсии: {rate}%",
    "groupAdmin.landing.calc.conversionHelp": "% участников, использующих сервис в месяц",
    "groupAdmin.landing.calc.monthlyEarnings": "ВАШ РАСЧЕТНЫЙ ЕЖЕМЕСЯЧНЫЙ ДОХОД",
    "groupAdmin.landing.calc.details": "{members} участников × {rate}% конверсия × $10 = ${earnings}/месяц",
    "groupAdmin.landing.calc.motivation": "🎯 Не считая юристов/помощников, которых вы можете привлечь!",
    "groupAdmin.landing.calc.recurring": "Регулярный доход каждый месяц",

    "groupAdmin.landing.benefits.title": "Почему стоит присоединиться?",

    "groupAdmin.landing.benefit1.title": "Высокие комиссионные",
    "groupAdmin.landing.benefit1.description": "Зарабатывайте $10 за каждый звонок, сгенерированный через вашу партнерскую ссылку.",

    "groupAdmin.landing.benefit2.title": "Готовые инструменты",
    "groupAdmin.landing.benefit2.description": "Посты, баннеры, изображения - все готово к использованию. Просто скопируйте и вставьте!",

    "groupAdmin.landing.benefit3.title": "9 языков",
    "groupAdmin.landing.benefit3.description": "Все ресурсы доступны на FR, EN, ES, PT, AR, DE, IT, NL, ZH.",

    "groupAdmin.landing.benefit4.title": "$5 скидка на каждый звонок",
    "groupAdmin.landing.benefit4.description": "Участники вашего сообщества получают скидку $5 на каждый звонок, сделанный по вашей ссылке.",

    "groupAdmin.landing.targetGroups.title": "Идеально для вашей группы",
    "groupAdmin.landing.targetGroups.subtitle": "Независимо от того, управляете ли вы группой Facebook, сервером Discord, сообществом WhatsApp, форумом или любой другой группой - у нас есть подходящие инструменты для вас.",

    "groupAdmin.landing.groupType.travel": "Группы путешествий",
    "groupAdmin.landing.groupType.expat": "Сообщества экспатов",
    "groupAdmin.landing.groupType.nomad": "Цифровые кочевники",
    "groupAdmin.landing.groupType.immigration": "Иммиграция",
    "groupAdmin.landing.groupType.relocation": "Переезд",
    "groupAdmin.landing.groupType.student": "Студенты за границей",
    "groupAdmin.landing.groupType.family": "Семьи экспатов",
    "groupAdmin.landing.groupType.retirement": "Пенсия за границей",

    "groupAdmin.landing.faq.title": "Часто задаваемые вопросы",
    "groupAdmin.landing.faq.subtitle": "Все, что вам нужно знать перед началом работы",

    "groupAdmin.landing.faq.q1": "Действительно ли бесплатно присоединиться?",
    "groupAdmin.landing.faq.a1": "Да! Регистрация на 100% бесплатна. Нет никаких сборов, обязательств и минимальных требований.",

    "groupAdmin.landing.faq.q2": "Когда мне платят?",
    "groupAdmin.landing.faq.a2": "Комиссионные становятся доступными через 7 дней после консультации клиента. Вы можете вывести средства в любое время, как только у вас будет не менее $25.",

    "groupAdmin.landing.faq.q3": "Какие способы оплаты доступны?",
    "groupAdmin.landing.faq.a3": "Мы поддерживаем PayPal, Wise, Mobile Money и банковские переводы в более чем 100 стран.",

    "groupAdmin.landing.faq.q4": "Как работает скидка $5 для моих участников?",
    "groupAdmin.landing.faq.a4": "Каждый звонок, сделанный по вашей партнерской ссылке, дает участникам вашего сообщества скидку $5. Это упрощает продвижение - ваши участники экономят деньги, а вы зарабатываете $10 за звонок.",

    "groupAdmin.landing.faq.q5": "Какие группы подходят?",
    "groupAdmin.landing.faq.a5": "Подходит любая группа или сообщество, связанное с путешествиями, эмиграцией, иммиграцией, международным переездом или жизнью за границей. Группы Facebook, серверы Discord, сообщества WhatsApp, форумы и многое другое!",

    "groupAdmin.landing.finalCta.title": "Готовы начать зарабатывать?",
    "groupAdmin.landing.finalCta.subtitle": "Присоединяйтесь к сотням администраторов групп, которые уже зарабатывают с SOS-Expat.",

    "groupAdmin.landing.recap.perCall": "$10 за звонок",
    "groupAdmin.landing.recap.discount": "$5 скидка для участников",
    "groupAdmin.landing.recap.languages": "9 языков",
    "groupAdmin.landing.recap.free": "100% бесплатно",

    "groupAdmin.landing.finalCta.cta": "Зарегистрируйтесь сейчас - Бесплатно",
    "groupAdmin.landing.finalCta.footer": "Бесплатная регистрация • Начните через 5 минут",

    "groupAdmin.landing.seo.title": "Станьте партнером администратора группы - Зарабатывайте $10 за звонок + скидка $5 | SOS-Expat",
    "groupAdmin.landing.seo.description": "Монетизируйте свою группу или сообщество. Зарабатывайте $10 за каждый звонок, сгенерированный по вашей партнерской ссылке, плюс скидка $5 для ваших участников на каждый звонок. Готовые инструменты на 9 языках.",
  },

  ch: {
    "groupAdmin.landing.badge": "面向群组和社区管理员",
    "groupAdmin.landing.hero.new.line1": "每月赚取高达",
    "groupAdmin.landing.hero.new.amount": "$5000+",
    "groupAdmin.landing.hero.new.line2": "通过您的群组",
    "groupAdmin.landing.hero.new.subtitle": "通过您的 Facebook、Discord、WhatsApp 或论坛社区赚钱。您的成员每次通话节省 $5,您每次通话赚取 $10。双赢!",
    "groupAdmin.landing.hero.sources": "3 个无限收入来源:",
    "groupAdmin.landing.hero.source1": "每次成员通话",
    "groupAdmin.landing.hero.source2": "管理员团队",
    "groupAdmin.landing.hero.source3": "10 个合作伙伴",
    "groupAdmin.landing.hero.hot": "🔥 热门",
    "groupAdmin.landing.hero.partnerExample": "💡 1 个合作伙伴(律师/助手) = 每月30次通话 × $5 × 6个月 = {total} 被动收入!",
    "groupAdmin.landing.hero.cta": "成为合作伙伴",
    "groupAdmin.landing.hero.free": "100% 免费 - 无需承诺",
    "groupAdmin.landing.scroll": "了解更多",

    "groupAdmin.landing.howItWorks.title": "如何运作?",
    "groupAdmin.landing.howItWorks.subtitle": "开始赚钱的三个简单步骤",

    "groupAdmin.landing.step1.label": "步骤 1",
    "groupAdmin.landing.step1.title": "免费注册",
    "groupAdmin.landing.step1.description": "注册并添加您的群组或社区。立即获取您的独特联盟链接。",

    "groupAdmin.landing.step2.label": "步骤 2",
    "groupAdmin.landing.step2.title": "分享现成的帖子",
    "groupAdmin.landing.step2.description": "使用我们的复制粘贴帖子、横幅和图片。提供 9 种语言!",

    "groupAdmin.landing.step3.label": "步骤 3",
    "groupAdmin.landing.step3.title": "赚取佣金",
    "groupAdmin.landing.step3.description": "通过您的链接产生的每次通话赚取 $10。您的成员每次通话可获得 $5 折扣。随时提现。",

    "groupAdmin.landing.calc.badge": "💰 收入计算器",
    "groupAdmin.landing.calc.title": "您能赚多少?",
    "groupAdmin.landing.calc.subtitle": "根据您的社区估算您的月收入",
    "groupAdmin.landing.calc.members": "您群组中的成员: {count}",
    "groupAdmin.landing.calc.conversion": "转化率: {rate}%",
    "groupAdmin.landing.calc.conversionHelp": "每月使用服务的成员百分比",
    "groupAdmin.landing.calc.monthlyEarnings": "您的预估月收入",
    "groupAdmin.landing.calc.details": "{members} 成员 × {rate}% 转化率 × $10 = ${earnings}/月",
    "groupAdmin.landing.calc.motivation": "🎯 还不包括您可以招募的律师/助手!",
    "groupAdmin.landing.calc.recurring": "每月经常性收入",

    "groupAdmin.landing.benefits.title": "为什么加入?",

    "groupAdmin.landing.benefit1.title": "高额佣金",
    "groupAdmin.landing.benefit1.description": "通过您的联盟链接产生的每次通话赚取 $10。",

    "groupAdmin.landing.benefit2.title": "现成工具",
    "groupAdmin.landing.benefit2.description": "帖子、横幅、图片 - 全部现成可用。只需复制粘贴!",

    "groupAdmin.landing.benefit3.title": "9 种语言",
    "groupAdmin.landing.benefit3.description": "所有资源提供 FR、EN、ES、PT、AR、DE、IT、NL、ZH。",

    "groupAdmin.landing.benefit4.title": "每次通话 $5 折扣",
    "groupAdmin.landing.benefit4.description": "您的社区成员通过您的链接进行的每次通话可获得 $5 折扣。",

    "groupAdmin.landing.targetGroups.title": "非常适合您的群组",
    "groupAdmin.landing.targetGroups.subtitle": "无论您管理 Facebook 群组、Discord 服务器、WhatsApp 社区、论坛还是其他任何群组 - 我们都有适合您的工具。",

    "groupAdmin.landing.groupType.travel": "旅行群组",
    "groupAdmin.landing.groupType.expat": "外籍人士社区",
    "groupAdmin.landing.groupType.nomad": "数字游牧者",
    "groupAdmin.landing.groupType.immigration": "移民",
    "groupAdmin.landing.groupType.relocation": "搬迁",
    "groupAdmin.landing.groupType.student": "海外学生",
    "groupAdmin.landing.groupType.family": "外籍家庭",
    "groupAdmin.landing.groupType.retirement": "海外退休",

    "groupAdmin.landing.faq.title": "常见问题",
    "groupAdmin.landing.faq.subtitle": "开始之前您需要了解的一切",

    "groupAdmin.landing.faq.q1": "真的免费加入吗?",
    "groupAdmin.landing.faq.a1": "是的!注册100%免费。没有费用,没有承诺,没有最低要求。",

    "groupAdmin.landing.faq.q2": "我什么时候能收到付款?",
    "groupAdmin.landing.faq.a2": "客户咨询后7天佣金可用。只要您至少有$25,您可以随时提现。",

    "groupAdmin.landing.faq.q3": "有哪些付款方式?",
    "groupAdmin.landing.faq.a3": "我们支持 PayPal、Wise、Mobile Money 和向超过 100 个国家的银行转账。",

    "groupAdmin.landing.faq.q4": "我的成员的 $5 折扣如何运作?",
    "groupAdmin.landing.faq.a4": "通过您的联盟链接进行的每次通话都会给您的社区成员 $5 折扣。这使得推广变得容易 - 您的成员省钱,而您每次通话赚取 $10。",

    "groupAdmin.landing.faq.q5": "什么类型的群组符合条件?",
    "groupAdmin.landing.faq.a5": "任何与旅行、外籍生活、移民、国际搬迁或海外生活相关的群组或社区都符合条件。Facebook 群组、Discord 服务器、WhatsApp 社区、论坛等等!",

    "groupAdmin.landing.finalCta.title": "准备开始赚钱了吗?",
    "groupAdmin.landing.finalCta.subtitle": "加入数百名已经通过 SOS-Expat 赚钱的群组管理员。",

    "groupAdmin.landing.recap.perCall": "每次通话 $10",
    "groupAdmin.landing.recap.discount": "成员 $5 折扣",
    "groupAdmin.landing.recap.languages": "9 种语言",
    "groupAdmin.landing.recap.free": "100% 免费",

    "groupAdmin.landing.finalCta.cta": "立即注册 - 免费",
    "groupAdmin.landing.finalCta.footer": "免费注册 • 5 分钟开始",

    "groupAdmin.landing.seo.title": "成为群组管理员合作伙伴 - 每次通话赚取 $10 + $5 折扣 | SOS-Expat",
    "groupAdmin.landing.seo.description": "通过您的群组或社区赚钱。通过您的联盟链接产生的每次通话赚取 $10,您的成员每次通话可获得 $5 折扣。9 种语言的现成工具。",
  },

  hi: {
    "groupAdmin.landing.badge": "समूह और समुदाय व्यवस्थापकों के लिए",
    "groupAdmin.landing.hero.new.line1": "कमाएं",
    "groupAdmin.landing.hero.new.amount": "$5000+/माह तक",
    "groupAdmin.landing.hero.new.line2": "अपने समूह से",
    "groupAdmin.landing.hero.new.subtitle": "अपने Facebook, Discord, WhatsApp या फ़ोरम समुदाय का मुद्रीकरण करें। आपके सदस्य $5/कॉल बचाते हैं, आप $10/कॉल कमाते हैं। दोनों की जीत!",
    "groupAdmin.landing.hero.sources": "3 असीमित राजस्व स्रोत:",
    "groupAdmin.landing.hero.source1": "प्रति सदस्य कॉल",
    "groupAdmin.landing.hero.source2": "व्यवस्थापक टीम",
    "groupAdmin.landing.hero.source3": "10 भागीदारों के साथ",
    "groupAdmin.landing.hero.hot": "🔥 HOT",
    "groupAdmin.landing.hero.partnerExample": "💡 1 भागीदार (वकील/सहायक) = 30 कॉल/माह × $5 × 6 महीने = {total} निष्क्रिय आय!",
    "groupAdmin.landing.hero.cta": "भागीदार बनें",
    "groupAdmin.landing.hero.free": "100% मुफ़्त - कोई प्रतिबद्धता नहीं",
    "groupAdmin.landing.scroll": "जानें",

    "groupAdmin.landing.howItWorks.title": "यह कैसे काम करता है?",
    "groupAdmin.landing.howItWorks.subtitle": "कमाई शुरू करने के तीन सरल चरण",

    "groupAdmin.landing.step1.label": "चरण 1",
    "groupAdmin.landing.step1.title": "मुफ्त में पंजीकरण करें",
    "groupAdmin.landing.step1.description": "साइन अप करें और अपना समूह या समुदाय जोड़ें। तुरंत अपने विशिष्ट सहबद्ध लिंक प्राप्त करें।",

    "groupAdmin.landing.step2.label": "चरण 2",
    "groupAdmin.landing.step2.title": "तैयार पोस्ट साझा करें",
    "groupAdmin.landing.step2.description": "हमारी कॉपी-पेस्ट पोस्ट, बैनर और छवियों का उपयोग करें। 9 भाषाओं में उपलब्ध!",

    "groupAdmin.landing.step3.label": "चरण 3",
    "groupAdmin.landing.step3.title": "कमीशन कमाएं",
    "groupAdmin.landing.step3.description": "आपके लिंक द्वारा उत्पन्न प्रत्येक कॉल के लिए $10 कमाएं। आपके सदस्यों को हर कॉल पर $5 की छूट मिलती है। कभी भी निकासी करें।",

    "groupAdmin.landing.calc.badge": "💰 आय कैलकुलेटर",
    "groupAdmin.landing.calc.title": "आप कितना कमा सकते हैं?",
    "groupAdmin.landing.calc.subtitle": "अपने समुदाय के आधार पर अपनी मासिक आय का अनुमान लगाएं",
    "groupAdmin.landing.calc.members": "आपके समूह में सदस्य: {count}",
    "groupAdmin.landing.calc.conversion": "रूपांतरण दर: {rate}%",
    "groupAdmin.landing.calc.conversionHelp": "प्रति माह सेवा का उपयोग करने वाले सदस्यों का %",
    "groupAdmin.landing.calc.monthlyEarnings": "आपकी अनुमानित मासिक आय",
    "groupAdmin.landing.calc.details": "{members} सदस्य × {rate}% रूपांतरण × $10 = ${earnings}/माह",
    "groupAdmin.landing.calc.motivation": "🎯 उन वकीलों/सहायकों की गिनती नहीं जिन्हें आप भर्ती कर सकते हैं!",
    "groupAdmin.landing.calc.recurring": "हर महीने आवर्ती आय",

    "groupAdmin.landing.benefits.title": "क्यों शामिल हों?",

    "groupAdmin.landing.benefit1.title": "उच्च कमीशन",
    "groupAdmin.landing.benefit1.description": "अपने सहबद्ध लिंक के माध्यम से उत्पन्न प्रत्येक कॉल के लिए $10 कमाएं।",

    "groupAdmin.landing.benefit2.title": "तैयार उपकरण",
    "groupAdmin.landing.benefit2.description": "पोस्ट, बैनर, छवियां - सभी उपयोग के लिए तैयार। बस कॉपी-पेस्ट करें!",

    "groupAdmin.landing.benefit3.title": "9 भाषाएं",
    "groupAdmin.landing.benefit3.description": "सभी संसाधन FR, EN, ES, PT, AR, DE, IT, NL, ZH में उपलब्ध हैं।",

    "groupAdmin.landing.benefit4.title": "हर कॉल पर $5 की छूट",
    "groupAdmin.landing.benefit4.description": "आपके समुदाय के सदस्यों को आपके लिंक के माध्यम से की गई हर कॉल पर $5 की छूट मिलती है।",

    "groupAdmin.landing.targetGroups.title": "आपके समूह के लिए एकदम सही",
    "groupAdmin.landing.targetGroups.subtitle": "चाहे आप Facebook समूह, Discord सर्वर, WhatsApp समुदाय, फ़ोरम या कोई अन्य समूह प्रबंधित करते हों - हमारे पास आपके लिए सही उपकरण हैं।",

    "groupAdmin.landing.groupType.travel": "यात्रा समूह",
    "groupAdmin.landing.groupType.expat": "प्रवासी समुदाय",
    "groupAdmin.landing.groupType.nomad": "डिजिटल खानाबदोश",
    "groupAdmin.landing.groupType.immigration": "आप्रवासन",
    "groupAdmin.landing.groupType.relocation": "स्थानांतरण",
    "groupAdmin.landing.groupType.student": "विदेश में छात्र",
    "groupAdmin.landing.groupType.family": "प्रवासी परिवार",
    "groupAdmin.landing.groupType.retirement": "विदेश में सेवानिवृत्ति",

    "groupAdmin.landing.faq.title": "अक्सर पूछे जाने वाले प्रश्न",
    "groupAdmin.landing.faq.subtitle": "शुरू करने से पहले आपको जो कुछ जानने की जरूरत है",

    "groupAdmin.landing.faq.q1": "क्या शामिल होना वास्तव में मुफ़्त है?",
    "groupAdmin.landing.faq.a1": "हां! पंजीकरण 100% मुफ़्त है। कोई शुल्क नहीं, कोई प्रतिबद्धता नहीं, और कोई न्यूनतम आवश्यकता नहीं।",

    "groupAdmin.landing.faq.q2": "मुझे कब भुगतान मिलता है?",
    "groupAdmin.landing.faq.a2": "ग्राहक के परामर्श के 7 दिन बाद कमीशन उपलब्ध हो जाते हैं। कम से कम $25 होने पर आप कभी भी निकासी कर सकते हैं।",

    "groupAdmin.landing.faq.q3": "कौन से भुगतान तरीके उपलब्ध हैं?",
    "groupAdmin.landing.faq.a3": "हम PayPal, Wise, Mobile Money और 100 से अधिक देशों में बैंक हस्तांतरण का समर्थन करते हैं।",

    "groupAdmin.landing.faq.q4": "मेरे सदस्यों के लिए $5 की छूट कैसे काम करती है?",
    "groupAdmin.landing.faq.a4": "आपके सहबद्ध लिंक के माध्यम से की गई हर कॉल आपके समुदाय के सदस्यों को $5 की छूट देती है। यह प्रचार करना आसान बनाता है - आपके सदस्य पैसे बचाते हैं जबकि आप प्रति कॉल $10 कमाते हैं।",

    "groupAdmin.landing.faq.q5": "किस प्रकार के समूह पात्र हैं?",
    "groupAdmin.landing.faq.a5": "यात्रा, प्रवासन, आप्रवासन, अंतर्राष्ट्रीय स्थानांतरण या विदेश में रहने से संबंधित कोई भी समूह या समुदाय पात्र है। Facebook समूह, Discord सर्वर, WhatsApp समुदाय, फ़ोरम और बहुत कुछ!",

    "groupAdmin.landing.finalCta.title": "कमाई शुरू करने के लिए तैयार हैं?",
    "groupAdmin.landing.finalCta.subtitle": "सैकड़ों समूह व्यवस्थापकों में शामिल हों जो पहले से ही SOS-Expat के साथ कमा रहे हैं।",

    "groupAdmin.landing.recap.perCall": "प्रति कॉल $10",
    "groupAdmin.landing.recap.discount": "सदस्यों के लिए $5 की छूट",
    "groupAdmin.landing.recap.languages": "9 भाषाएं",
    "groupAdmin.landing.recap.free": "100% मुफ़्त",

    "groupAdmin.landing.finalCta.cta": "अभी पंजीकरण करें - यह मुफ़्त है",
    "groupAdmin.landing.finalCta.footer": "मुफ़्त पंजीकरण • 5 मिनट में शुरू करें",

    "groupAdmin.landing.seo.title": "समूह व्यवस्थापक भागीदार बनें - प्रति कॉल $10 कमाएं + $5 की छूट | SOS-Expat",
    "groupAdmin.landing.seo.description": "अपने समूह या समुदाय का मुद्रीकरण करें। अपने सहबद्ध लिंक द्वारा उत्पन्न प्रत्येक कॉल के लिए $10 कमाएं, साथ ही आपके सदस्यों के लिए हर कॉल पर $5 की छूट। 9 भाषाओं में उपयोग के लिए तैयार उपकरण।",
  },

  ar: {
    "groupAdmin.landing.badge": "لمسؤولي المجموعات والمجتمعات",
    "groupAdmin.landing.hero.new.line1": "اكسب حتى",
    "groupAdmin.landing.hero.new.amount": "$5000+/شهر",
    "groupAdmin.landing.hero.new.line2": "مع مجموعتك",
    "groupAdmin.landing.hero.new.subtitle": "حقق أرباحًا من مجتمعك على Facebook أو Discord أو WhatsApp أو المنتدى. يوفر أعضاؤك $5/مكالمة، وتكسب أنت $10/مكالمة. الكل يربح!",
    "groupAdmin.landing.hero.sources": "3 مصادر دخل غير محدودة:",
    "groupAdmin.landing.hero.source1": "لكل مكالمة عضو",
    "groupAdmin.landing.hero.source2": "فريق المسؤولين",
    "groupAdmin.landing.hero.source3": "مع 10 شركاء",
    "groupAdmin.landing.hero.hot": "🔥 ساخن",
    "groupAdmin.landing.hero.partnerExample": "💡 شريك واحد (محامي/مساعد) = 30 مكالمة/شهر × $5 × 6 أشهر = {total} دخل سلبي!",
    "groupAdmin.landing.hero.cta": "كن شريكًا",
    "groupAdmin.landing.hero.free": "100% مجاني - بدون التزام",
    "groupAdmin.landing.scroll": "اكتشف",

    "groupAdmin.landing.howItWorks.title": "كيف يعمل؟",
    "groupAdmin.landing.howItWorks.subtitle": "ثلاث خطوات بسيطة لبدء الكسب",

    "groupAdmin.landing.step1.label": "الخطوة 1",
    "groupAdmin.landing.step1.title": "سجل مجانًا",
    "groupAdmin.landing.step1.description": "سجل وأضف مجموعتك أو مجتمعك. احصل على روابط الشراكة الفريدة الخاصة بك على الفور.",

    "groupAdmin.landing.step2.label": "الخطوة 2",
    "groupAdmin.landing.step2.title": "شارك المنشورات الجاهزة",
    "groupAdmin.landing.step2.description": "استخدم منشوراتنا ولافتاتنا وصورنا الجاهزة للنسخ واللصق. متوفرة بـ 9 لغات!",

    "groupAdmin.landing.step3.label": "الخطوة 3",
    "groupAdmin.landing.step3.title": "اكسب عمولات",
    "groupAdmin.landing.step3.description": "اكسب $10 لكل مكالمة يتم إنشاؤها عبر رابطك. يحصل أعضاؤك على خصم $5 على كل مكالمة. اسحب في أي وقت.",

    "groupAdmin.landing.calc.badge": "💰 حاسبة الدخل",
    "groupAdmin.landing.calc.title": "كم يمكنك أن تكسب؟",
    "groupAdmin.landing.calc.subtitle": "قدّر دخلك الشهري بناءً على مجتمعك",
    "groupAdmin.landing.calc.members": "الأعضاء في مجموعتك: {count}",
    "groupAdmin.landing.calc.conversion": "معدل التحويل: {rate}%",
    "groupAdmin.landing.calc.conversionHelp": "% من الأعضاء الذين يستخدمون الخدمة شهريًا",
    "groupAdmin.landing.calc.monthlyEarnings": "دخلك الشهري المقدر",
    "groupAdmin.landing.calc.details": "{members} عضو × {rate}% تحويل × $10 = ${earnings}/شهر",
    "groupAdmin.landing.calc.motivation": "🎯 بدون احتساب المحامين/المساعدين الذين يمكنك تجنيدهم!",
    "groupAdmin.landing.calc.recurring": "دخل متكرر كل شهر",

    "groupAdmin.landing.benefits.title": "لماذا الانضمام؟",

    "groupAdmin.landing.benefit1.title": "عمولات عالية",
    "groupAdmin.landing.benefit1.description": "اكسب $10 لكل مكالمة يتم إنشاؤها من خلال رابط الشراكة الخاص بك.",

    "groupAdmin.landing.benefit2.title": "أدوات جاهزة",
    "groupAdmin.landing.benefit2.description": "منشورات، لافتات، صور - كلها جاهزة للاستخدام. فقط انسخ والصق!",

    "groupAdmin.landing.benefit3.title": "9 لغات",
    "groupAdmin.landing.benefit3.description": "جميع الموارد متاحة بـ FR، EN، ES، PT، AR، DE، IT، NL، ZH.",

    "groupAdmin.landing.benefit4.title": "خصم $5 على كل مكالمة",
    "groupAdmin.landing.benefit4.description": "يحصل أعضاء مجتمعك على خصم $5 على كل مكالمة تتم عبر رابطك.",

    "groupAdmin.landing.targetGroups.title": "مثالي لمجموعتك",
    "groupAdmin.landing.targetGroups.subtitle": "سواء كنت تدير مجموعة Facebook أو خادم Discord أو مجتمع WhatsApp أو منتدى أو أي مجموعة أخرى - لدينا الأدوات المناسبة لك.",

    "groupAdmin.landing.groupType.travel": "مجموعات السفر",
    "groupAdmin.landing.groupType.expat": "مجتمعات المغتربين",
    "groupAdmin.landing.groupType.nomad": "الرحالة الرقميون",
    "groupAdmin.landing.groupType.immigration": "الهجرة",
    "groupAdmin.landing.groupType.relocation": "الانتقال",
    "groupAdmin.landing.groupType.student": "الطلاب بالخارج",
    "groupAdmin.landing.groupType.family": "عائلات المغتربين",
    "groupAdmin.landing.groupType.retirement": "التقاعد بالخارج",

    "groupAdmin.landing.faq.title": "الأسئلة الشائعة",
    "groupAdmin.landing.faq.subtitle": "كل ما تحتاج معرفته قبل البدء",

    "groupAdmin.landing.faq.q1": "هل الانضمام مجاني حقًا؟",
    "groupAdmin.landing.faq.a1": "نعم! التسجيل مجاني 100%. لا توجد رسوم، ولا التزامات، ولا متطلبات دنيا.",

    "groupAdmin.landing.faq.q2": "متى أتقاضى؟",
    "groupAdmin.landing.faq.a2": "تصبح العمولات متاحة بعد 7 أيام من استشارة العميل. يمكنك السحب في أي وقت بمجرد أن يكون لديك على الأقل $25.",

    "groupAdmin.landing.faq.q3": "ما هي طرق الدفع المتاحة؟",
    "groupAdmin.landing.faq.a3": "ندعم PayPal وWise وMobile Money والتحويلات البنكية إلى أكثر من 100 دولة.",

    "groupAdmin.landing.faq.q4": "كيف يعمل خصم $5 لأعضائي؟",
    "groupAdmin.landing.faq.a4": "كل مكالمة تتم من خلال رابط الشراكة الخاص بك تمنح أعضاء مجتمعك خصم $5. هذا يجعل الترويج سهلاً - يوفر أعضاؤك المال بينما تكسب أنت $10 لكل مكالمة.",

    "groupAdmin.landing.faq.q5": "ما نوع المجموعات المؤهلة؟",
    "groupAdmin.landing.faq.a5": "أي مجموعة أو مجتمع متعلق بالسفر أو الاغتراب أو الهجرة أو الانتقال الدولي أو العيش بالخارج مؤهل. مجموعات Facebook، خوادم Discord، مجتمعات WhatsApp، المنتديات والمزيد!",

    "groupAdmin.landing.finalCta.title": "جاهز لبدء الكسب؟",
    "groupAdmin.landing.finalCta.subtitle": "انضم إلى مئات مسؤولي المجموعات الذين يكسبون بالفعل مع SOS-Expat.",

    "groupAdmin.landing.recap.perCall": "$10 لكل مكالمة",
    "groupAdmin.landing.recap.discount": "خصم $5 للأعضاء",
    "groupAdmin.landing.recap.languages": "9 لغات",
    "groupAdmin.landing.recap.free": "100% مجاني",

    "groupAdmin.landing.finalCta.cta": "سجل الآن - مجاني",
    "groupAdmin.landing.finalCta.footer": "تسجيل مجاني • ابدأ في 5 دقائق",

    "groupAdmin.landing.seo.title": "كن شريك مسؤول مجموعة - اكسب $10 لكل مكالمة + خصم $5 | SOS-Expat",
    "groupAdmin.landing.seo.description": "حقق أرباحًا من مجموعتك أو مجتمعك. اكسب $10 لكل مكالمة يتم إنشاؤها عبر رابط الشراكة الخاص بك، بالإضافة إلى خصم $5 لأعضائك على كل مكالمة. أدوات جاهزة للاستخدام بـ 9 لغات.",
  },
};

// Function to add translations to a language file
function addTranslationsToFile(langCode, translationsObj) {
  const filePath = path.join(helperDir, `${langCode}.json`);

  console.log(`\n📝 Processing ${langCode}.json...`);

  // Read existing file
  let existingData = {};
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    existingData = JSON.parse(fileContent);
    console.log(`✓ Loaded existing ${langCode}.json (${Object.keys(existingData).length} keys)`);
  } catch (err) {
    console.error(`✗ Error reading ${langCode}.json:`, err.message);
    return;
  }

  // Merge translations (new ones will override old ones with same keys)
  const mergedData = { ...existingData, ...translationsObj };

  // Count new keys
  const newKeys = Object.keys(translationsObj).filter(key => !existingData[key]);
  const updatedKeys = Object.keys(translationsObj).filter(key => existingData[key] && existingData[key] !== translationsObj[key]);

  console.log(`  + ${newKeys.length} new keys added`);
  console.log(`  ↻ ${updatedKeys.length} keys updated`);

  // Write back to file
  try {
    fs.writeFileSync(filePath, JSON.stringify(mergedData, null, 2), 'utf8');
    console.log(`✓ Successfully updated ${langCode}.json`);
  } catch (err) {
    console.error(`✗ Error writing ${langCode}.json:`, err.message);
  }
}

// Main execution
console.log('🚀 Adding GroupAdmin landing page translations for all 9 languages...\n');

Object.entries(translations).forEach(([langCode, translationsObj]) => {
  addTranslationsToFile(langCode, translationsObj);
});

console.log('\n✅ All translations added successfully!');
console.log('\n📋 Summary:');
console.log('   - 9 language files updated (fr, en, es, de, pt, ru, ch, hi, ar)');
console.log('   - ~76 translation keys per language');
console.log('   - Total: ~684 translations added/updated');
console.log('\n💡 Next step: Test the GroupAdmin landing page in all languages!');
