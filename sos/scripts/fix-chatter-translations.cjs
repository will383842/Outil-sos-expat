#!/usr/bin/env node

/**
 * fix-chatter-translations.cjs
 *
 * Extrait TOUS les defaultMessage de ChatterLanding.tsx et les ajoute
 * dans les 9 fichiers de traduction (fr, en, de, ru, ch, es, pt, ar, hi)
 *
 * Usage: node sos/scripts/fix-chatter-translations.cjs
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIG
// ============================================================================
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CHATTER_LANDING_TSX = path.join(PROJECT_ROOT, 'sos/src/pages/Chatter/ChatterLanding.tsx');
const HELPER_DIR = path.join(PROJECT_ROOT, 'sos/src/helper');

const LANGUAGES = ['fr', 'en', 'de', 'ru', 'ch', 'es', 'pt', 'ar', 'hi'];

// ============================================================================
// ÉTAPE 1 : EXTRACTION DES defaultMessage
// ============================================================================
function extractDefaultMessages(tsxFilePath) {
  console.log(`📖 Lecture de ${tsxFilePath}...`);
  const content = fs.readFileSync(tsxFilePath, 'utf-8');

  const messages = new Map(); // id => defaultMessage

  // Regex pour capturer <FormattedMessage id="..." defaultMessage="..." />
  // Supporte les messages sur plusieurs lignes et avec values
  const regex = /<FormattedMessage\s+id=["']([^"']+)["']\s+defaultMessage=["']([^"']+)["']/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = match[1];
    const defaultMsg = match[2];
    messages.set(id, defaultMsg);
  }

  // Regex pour intl.formatMessage({ id: '...', defaultMessage: '...' })
  const intlRegex = /formatMessage\(\s*\{\s*id:\s*["']([^"']+)["'],?\s*defaultMessage:\s*["']([^"']+)["']/g;

  while ((match = intlRegex.exec(content)) !== null) {
    const id = match[1];
    const defaultMsg = match[2];
    messages.set(id, defaultMsg);
  }

  console.log(`✅ ${messages.size} messages extraits`);
  return messages;
}

// ============================================================================
// ÉTAPE 2 : TRADUCTIONS PAR LANGUE
// ============================================================================

// Traductions manuelles des clés principales (en attendant les traductions complètes)
const TRANSLATIONS = {
  // SEO
  'chatter.landing.seo.title': {
    fr: "Devenir Chatter - Gagnez jusqu'à 3000$/mois en aidant les voyageurs",
    en: 'Become a Chatter - Earn up to $3000+/month helping travelers',
    es: 'Conviértete en Chatter - Gana hasta $3000+/mes ayudando a viajeros',
    de: 'Chatter werden - Verdienen Sie bis zu $3000+/Monat mit Hilfe für Reisende',
    ru: 'Стать чаттером - Зарабатывайте до $3000+/месяц помогая путешественникам',
    pt: 'Tornar-se Chatter - Ganhe até $3000+/mês ajudando viajantes',
    ch: '成为 Chatter - 帮助旅行者每月赚取高达 $3000+',
    hi: 'चैटर बनें - यात्रियों की मदद करके $3000+/महीने तक कमाएं',
    ar: 'كن مسوقًا - اكسب حتى 3000 دولار شهريًا بمساعدة المسافرين'
  },
  'chatter.landing.seo.description': {
    fr: "Gagnez jusqu'à 3000$/mois avec 3 sources de revenus : appels directs (10$/appel), équipe MLM illimitée, et partenaires (avocats/aidants). Rejoignez 1200+ chatters dans 197 pays. 100% gratuit.",
    en: 'Earn up to $3000/month with 3 revenue streams: direct calls ($10/call), unlimited MLM team, and partners (lawyers/helpers). Join 1200+ chatters in 197 countries. 100% free.',
    es: 'Gana hasta $3000/mes con 3 fuentes de ingresos: llamadas directas ($10/llamada), equipo MLM ilimitado y socios (abogados/ayudantes). Únete a 1200+ chatters en 197 países. 100% gratis.',
    de: 'Verdienen Sie bis zu $3000/Monat mit 3 Einnahmequellen: Direktanrufe ($10/Anruf), unbegrenztes MLM-Team und Partner (Anwälte/Helfer). Schließen Sie sich 1200+ Chattern in 197 Ländern an. 100% kostenlos.',
    ru: 'Зарабатывайте до $3000/месяц с 3 источниками дохода: прямые звонки ($10/звонок), неограниченная MLM-команда и партнеры (юристы/помощники). Присоединяйтесь к 1200+ чаттерам в 197 странах. 100% бесплатно.',
    pt: 'Ganhe até $3000/mês com 3 fontes de renda: chamadas diretas ($10/chamada), equipe MLM ilimitada e parceiros (advogados/ajudantes). Junte-se a 1200+ chatters em 197 países. 100% grátis.',
    ch: '通过3种收入来源每月赚取高达$3000：直接通话（$10/通话）、无限MLM团队和合作伙伴（律师/助手）。加入197个国家的1200+聊天员。100%免费。',
    hi: '3 राजस्व धाराओं के साथ प्रति माह $3000 तक कमाएं: सीधी कॉलें ($10/कॉल), असीमित MLM टीम, और साझेदार (वकील/सहायक)। 197 देशों में 1200+ चैटर्स में शामिल हों। 100% मुफ्त।',
    ar: 'اكسب حتى 3000 دولار شهريًا من 3 مصادر دخل: مكالمات مباشرة (10 دولار/مكالمة)، فريق MLM غير محدود، وشركاء (محامون/مساعدون). انضم إلى 1200+ مسوق في 197 دولة. مجاني 100%.'
  },
  'chatter.landing.seo.ogTitle': {
    fr: 'Devenir Chatter',
    en: 'Become a Chatter',
    es: 'Ser Chatter',
    de: 'Chatter werden',
    ru: 'Стать чаттером',
    pt: 'Tornar-se Chatter',
    ch: '成为 Chatter',
    hi: 'चैटर बनें',
    ar: 'كن مسوقًا'
  },

  // Hero Section
  'chatter.landing.hero.new.line1': {
    fr: "Gagnez jusqu'à",
    en: 'Earn up to',
    es: 'Gana hasta',
    de: 'Verdienen Sie bis zu',
    ru: 'Зарабатывайте до',
    pt: 'Ganhe até',
    ch: '赚取高达',
    hi: 'तक कमाएं',
    ar: 'اكسب حتى'
  },
  'chatter.landing.hero.new.amount': {
    fr: '3000$+/mois',
    en: '$3000+/month',
    es: '$3000+/mes',
    de: '$3000+/Monat',
    ru: '$3000+/месяц',
    pt: '$3000+/mês',
    ch: '$3000+/月',
    hi: '$3000+/महीना',
    ar: '3000 دولار+/شهر'
  },
  'chatter.landing.hero.new.line2': {
    fr: 'en aidant les voyageurs',
    en: 'helping travelers',
    es: 'ayudando a viajeros',
    de: 'Reisenden helfen',
    ru: 'помогая путешественникам',
    pt: 'ajudando viajantes',
    ch: '帮助旅行者',
    hi: 'यात्रियों की मदद करके',
    ar: 'بمساعدة المسافرين'
  },
  'chatter.landing.hero.sources': {
    fr: '3 sources de revenus illimitées :',
    en: '3 unlimited revenue streams:',
    es: '3 fuentes de ingresos ilimitadas:',
    de: '3 unbegrenzte Einnahmequellen:',
    ru: '3 неограниченных источника дохода:',
    pt: '3 fontes de renda ilimitadas:',
    ch: '3种无限收入来源：',
    hi: '3 असीमित राजस्व धाराएं:',
    ar: '3 مصادر دخل غير محدودة:'
  },
  'chatter.landing.hero.source1': {
    fr: 'par appel direct',
    en: 'per direct call',
    es: 'por llamada directa',
    de: 'pro Direktanruf',
    ru: 'за прямой звонок',
    pt: 'por chamada direta',
    ch: '每次直接通话',
    hi: 'प्रति सीधी कॉल',
    ar: 'لكل مكالمة مباشرة'
  },
  'chatter.landing.hero.source2': {
    fr: 'passifs/mois équipe',
    en: 'passive/month team',
    es: 'pasivos/mes equipo',
    de: 'passiv/Monat Team',
    ru: 'пассивно/месяц команда',
    pt: 'passivos/mês equipe',
    ch: '被动/月团队',
    hi: 'निष्क्रिय/महीना टीम',
    ar: 'سلبي/شهر فريق'
  },
  'chatter.landing.hero.hot': {
    fr: '🔥 HOT',
    en: '🔥 HOT',
    es: '🔥 POPULAR',
    de: '🔥 HEISS',
    ru: '🔥 ГОРЯЧО',
    pt: '🔥 QUENTE',
    ch: '🔥 热门',
    hi: '🔥 गर्म',
    ar: '🔥 ساخن'
  },
  'chatter.landing.hero.source3': {
    fr: 'avec 10 partenaires',
    en: 'with 10 partners',
    es: 'con 10 socios',
    de: 'mit 10 Partnern',
    ru: 'с 10 партнерами',
    pt: 'com 10 parceiros',
    ch: '与10个合作伙伴',
    hi: '10 साझेदारों के साथ',
    ar: 'مع 10 شركاء'
  },
  'chatter.landing.hero.partnerExample': {
    fr: '💡 1 partenaire (avocat/aidant) = 30 appels/mois × 5$ × 6 mois = {total} passifs !',
    en: '💡 1 partner (lawyer/helper) = 30 calls/month × $5 × 6 months = {total} passive!',
    es: '💡 1 socio (abogado/ayudante) = 30 llamadas/mes × $5 × 6 meses = {total} pasivos!',
    de: '💡 1 Partner (Anwalt/Helfer) = 30 Anrufe/Monat × $5 × 6 Monate = {total} passiv!',
    ru: '💡 1 партнер (юрист/помощник) = 30 звонков/месяц × $5 × 6 месяцев = {total} пассивно!',
    pt: '💡 1 parceiro (advogado/ajudante) = 30 chamadas/mês × $5 × 6 meses = {total} passivos!',
    ch: '💡 1个合作伙伴（律师/助手）= 30次通话/月 × $5 × 6个月 = {total} 被动收入！',
    hi: '💡 1 साझेदार (वकील/सहायक) = 30 कॉलें/महीना × $5 × 6 महीने = {total} निष्क्रिय!',
    ar: '💡 شريك واحد (محامي/مساعد) = 30 مكالمة/شهر × 5 دولار × 6 أشهر = {total} سلبي!'
  },
  'chatter.landing.hero.new.desc': {
    fr: 'Partagez votre lien sur les réseaux sociaux + Construisez votre équipe = Revenus illimités. Les top chatters gagnent 500-5000$/mois !',
    en: 'Share your link on social media + Build your team = Unlimited income. Top chatters earn $500-5000/month!',
    es: 'Comparte tu enlace en redes sociales + Construye tu equipo = Ingresos ilimitados. ¡Los mejores chatters ganan $500-5000/mes!',
    de: 'Teilen Sie Ihren Link in sozialen Medien + Bauen Sie Ihr Team auf = Unbegrenztes Einkommen. Top-Chatter verdienen $500-5000/Monat!',
    ru: 'Поделитесь ссылкой в социальных сетях + Создайте команду = Неограниченный доход. Лучшие чаттеры зарабатывают $500-5000/месяц!',
    pt: 'Compartilhe seu link nas redes sociais + Construa sua equipe = Renda ilimitada. Top chatters ganham $500-5000/mês!',
    ch: '在社交媒体上分享您的链接 + 建立您的团队 = 无限收入。顶级聊天员每月赚取$500-5000！',
    hi: 'सोशल मीडिया पर अपना लिंक साझा करें + अपनी टीम बनाएं = असीमित आय। शीर्ष चैटर $500-5000/महीना कमाते हैं!',
    ar: 'شارك رابطك على وسائل التواصل الاجتماعي + ابنِ فريقك = دخل غير محدود. أفضل المسوقين يكسبون 500-5000 دولار شهريًا!'
  },
  'chatter.landing.cta.start': {
    fr: 'Commencer gratuitement',
    en: 'Start for free',
    es: 'Comenzar gratis',
    de: 'Kostenlos starten',
    ru: 'Начать бесплатно',
    pt: 'Começar gratuitamente',
    ch: '免费开始',
    hi: 'मुफ्त शुरू करें',
    ar: 'ابدأ مجانًا'
  },
  'chatter.landing.reassurance': {
    fr: '100% gratuit • Aucun investissement • 197 pays',
    en: '100% free • No investment • 197 countries',
    es: '100% gratis • Sin inversión • 197 países',
    de: '100% kostenlos • Keine Investition • 197 Länder',
    ru: '100% бесплатно • Без вложений • 197 стран',
    pt: '100% grátis • Sem investimento • 197 países',
    ch: '100%免费 • 无需投资 • 197个国家',
    hi: '100% मुफ्त • कोई निवेश नहीं • 197 देश',
    ar: 'مجاني 100% • بدون استثمار • 197 دولة'
  },
  'chatter.landing.scroll': {
    fr: 'Découvrir',
    en: 'Discover',
    es: 'Descubrir',
    de: 'Entdecken',
    ru: 'Узнать',
    pt: 'Descobrir',
    ch: '发现',
    hi: 'खोजें',
    ar: 'اكتشف'
  },

  // Revenue Section
  'chatter.landing.revenue.title.highlight': {
    fr: '3 façons',
    en: '3 ways',
    es: '3 formas',
    de: '3 Wege',
    ru: '3 способа',
    pt: '3 maneiras',
    ch: '3种方式',
    hi: '3 तरीके',
    ar: '3 طرق'
  },
  'chatter.landing.revenue.title': {
    fr: 'de gagner',
    en: 'to earn',
    es: 'de ganar',
    de: 'zu verdienen',
    ru: 'заработать',
    pt: 'de ganhar',
    ch: '赚钱',
    hi: 'कमाने के',
    ar: 'للكسب'
  },
  'chatter.landing.revenue.subtitle': {
    fr: 'Cumulez vos revenus. Sans limite.',
    en: 'Stack your income. No limits.',
    es: 'Acumula tus ingresos. Sin límites.',
    de: 'Stapeln Sie Ihr Einkommen. Keine Grenzen.',
    ru: 'Суммируйте свой доход. Без ограничений.',
    pt: 'Acumule sua renda. Sem limites.',
    ch: '累积您的收入。无限制。',
    hi: 'अपनी आय जमा करें। कोई सीमा नहीं।',
    ar: 'جمع دخلك. بلا حدود.'
  },
  'chatter.landing.source1.title': {
    fr: 'Scrollez, aidez, gagnez',
    en: 'Scroll, help, earn',
    es: 'Desplázate, ayuda, gana',
    de: 'Scrollen, helfen, verdienen',
    ru: 'Листайте, помогайте, зарабатывайте',
    pt: 'Role, ajude, ganhe',
    ch: '滚动、帮助、赚钱',
    hi: 'स्क्रॉल करें, मदद करें, कमाएं',
    ar: 'مرر، ساعد، اكسب'
  },
  'chatter.landing.source1.desc': {
    fr: 'Parcourez les groupes Facebook et forums. Aidez ceux qui ont besoin en partageant votre lien.',
    en: 'Browse Facebook groups and forums. Help those in need by sharing your link.',
    es: 'Navega por grupos de Facebook y foros. Ayuda a los necesitados compartiendo tu enlace.',
    de: 'Durchsuchen Sie Facebook-Gruppen und Foren. Helfen Sie Bedürftigen, indem Sie Ihren Link teilen.',
    ru: 'Просматривайте группы Facebook и форумы. Помогайте нуждающимся, делясь своей ссылкой.',
    pt: 'Navegue em grupos do Facebook e fóruns. Ajude quem precisa compartilhando seu link.',
    ch: '浏览 Facebook 群组和论坛。通过分享您的链接帮助有需要的人。',
    hi: 'Facebook समूहों और मंचों को ब्राउज़ करें। अपना लिंक साझा करके जरूरतमंदों की मदद करें।',
    ar: 'تصفح مجموعات فيسبوك والمنتديات. ساعد المحتاجين بمشاركة رابطك.'
  },
  'chatter.landing.perCall': {
    fr: 'appel',
    en: 'call',
    es: 'llamada',
    de: 'Anruf',
    ru: 'звонок',
    pt: 'chamada',
    ch: '通话',
    hi: 'कॉल',
    ar: 'مكالمة'
  },
  'chatter.landing.source2.title': {
    fr: 'Recrutez des chatters',
    en: 'Recruit chatters',
    es: 'Recluta chatters',
    de: 'Chatter rekrutieren',
    ru: 'Нанимайте чаттеров',
    pt: 'Recrute chatters',
    ch: '招募聊天员',
    hi: 'चैटर्स भर्ती करें',
    ar: 'جند مسوقين'
  },
  'chatter.landing.source2.desc': {
    fr: 'Créez une équipe ILLIMITÉE. Sur chaque appel de vos recrues :',
    en: 'Build an UNLIMITED team. On each call from your recruits:',
    es: 'Construye un equipo ILIMITADO. En cada llamada de tus reclutas:',
    de: 'Bauen Sie ein UNBEGRENZTES Team auf. Bei jedem Anruf Ihrer Rekruten:',
    ru: 'Создайте НЕОГРАНИЧЕННУЮ команду. За каждый звонок ваших рекрутов:',
    pt: 'Construa uma equipe ILIMITADA. Em cada chamada de seus recrutas:',
    ch: '建立无限团队。您招募的每次通话：',
    hi: 'असीमित टीम बनाएं। आपके भर्तियों की प्रत्येक कॉल पर:',
    ar: 'ابنِ فريقًا غير محدود. على كل مكالمة من مجنديك:'
  },
  'chatter.landing.source2.level1': {
    fr: 'niveau 1',
    en: 'level 1',
    es: 'nivel 1',
    de: 'Stufe 1',
    ru: 'уровень 1',
    pt: 'nível 1',
    ch: '级别 1',
    hi: 'स्तर 1',
    ar: 'المستوى 1'
  },
  'chatter.landing.source2.level2': {
    fr: 'niveau 2',
    en: 'level 2',
    es: 'nivel 2',
    de: 'Stufe 2',
    ru: 'уровень 2',
    pt: 'nível 2',
    ch: '级别 2',
    hi: 'स्तर 2',
    ar: 'المستوى 2'
  },
  'chatter.landing.source3.hot': {
    fr: 'LE PLUS RENTABLE',
    en: 'MOST PROFITABLE',
    es: 'MÁS RENTABLE',
    de: 'AM RENTABELSTEN',
    ru: 'САМОЕ ВЫГОДНОЕ',
    pt: 'MAIS RENTÁVEL',
    ch: '最赚钱',
    hi: 'सबसे लाभदायक',
    ar: 'الأكثر ربحية'
  },
  'chatter.landing.source3.title.new': {
    fr: 'Trouvez des partenaires',
    en: 'Find partners',
    es: 'Encuentra socios',
    de: 'Partner finden',
    ru: 'Найти партнеров',
    pt: 'Encontre parceiros',
    ch: '寻找合作伙伴',
    hi: 'साझेदार खोजें',
    ar: 'ابحث عن شركاء'
  },
  'chatter.landing.source3.desc.new': {
    fr: "Invitez des avocats ou expatriés aidants. Gagnez 5$ sur CHAQUE appel qu'ils reçoivent pendant 6 mois !",
    en: 'Invite lawyers or expat helpers. Earn $5 on EVERY call they receive for 6 months!',
    es: 'Invita abogados o expatriados ayudantes. ¡Gana $5 en CADA llamada que reciban durante 6 meses!',
    de: 'Laden Sie Anwälte oder Expat-Helfer ein. Verdienen Sie $5 bei JEDEM Anruf, den sie 6 Monate lang erhalten!',
    ru: 'Приглашайте юристов или помощников-экспатов. Зарабатывайте $5 за КАЖДЫЙ звонок, который они получают в течение 6 месяцев!',
    pt: 'Convide advogados ou ajudantes expatriados. Ganhe $5 em CADA chamada que eles receberem por 6 meses!',
    ch: '邀请律师或外籍助手。在他们收到的每次通话中赚取 $5，持续 6 个月！',
    hi: 'वकीलों या प्रवासी सहायकों को आमंत्रित करें। 6 महीने तक उनकी प्रत्येक कॉल पर $5 कमाएं!',
    ar: 'ادعُ محامين أو مساعدي مغتربين. اكسب 5 دولارات على كل مكالمة يتلقونها لمدة 6 أشهر!'
  },
  'chatter.landing.source3.calc1': {
    fr: '1 partenaire (30 appels/mois)',
    en: '1 partner (30 calls/month)',
    es: '1 socio (30 llamadas/mes)',
    de: '1 Partner (30 Anrufe/Monat)',
    ru: '1 партнер (30 звонков/месяц)',
    pt: '1 parceiro (30 chamadas/mês)',
    ch: '1个合作伙伴（30次通话/月）',
    hi: '1 साझेदार (30 कॉलें/महीना)',
    ar: 'شريك واحد (30 مكالمة/شهر)'
  },
  'chatter.landing.source3.calc2': {
    fr: '× 6 mois =',
    en: '× 6 months =',
    es: '× 6 meses =',
    de: '× 6 Monate =',
    ru: '× 6 месяцев =',
    pt: '× 6 meses =',
    ch: '× 6个月 =',
    hi: '× 6 महीने =',
    ar: '× 6 أشهر ='
  },
  'chatter.landing.source3.calc3': {
    fr: '10 partenaires =',
    en: '10 partners =',
    es: '10 socios =',
    de: '10 Partner =',
    ru: '10 партнеров =',
    pt: '10 parceiros =',
    ch: '10个合作伙伴 =',
    hi: '10 साझेदार =',
    ar: '10 شركاء ='
  },
  'chatter.landing.source3.tip': {
    fr: 'Astuce : Les partenaires (avocats/aidants) reçoivent 20-60 appels/mois. Un seul bon partenaire peut vous rapporter 300-900$/mois !',
    en: 'Tip: Partners (lawyers/helpers) receive 20-60 calls/month. A single good partner can bring you $300-900/month!',
    es: 'Consejo: Los socios (abogados/ayudantes) reciben 20-60 llamadas/mes. ¡Un solo buen socio puede traerte $300-900/mes!',
    de: 'Tipp: Partner (Anwälte/Helfer) erhalten 20-60 Anrufe/Monat. Ein einziger guter Partner kann Ihnen $300-900/Monat bringen!',
    ru: 'Совет: Партнеры (юристы/помощники) получают 20-60 звонков/месяц. Один хороший партнер может приносить вам $300-900/месяц!',
    pt: 'Dica: Parceiros (advogados/ajudantes) recebem 20-60 chamadas/mês. Um único bom parceiro pode trazer $300-900/mês!',
    ch: '提示：合作伙伴（律师/助手）每月接听20-60次通话。一个好的合作伙伴每月可以为您带来$300-900！',
    hi: 'टिप: साझेदार (वकील/सहायक) 20-60 कॉलें/महीना प्राप्त करते हैं। एक अच्छा साझेदार आपको $300-900/महीना ला सकता है!',
    ar: 'نصيحة: يتلقى الشركاء (محامون/مساعدون) 20-60 مكالمة/شهر. يمكن لشريك جيد واحد أن يجلب لك 300-900 دولار شهريًا!'
  },

  // Proof Section
  'chatter.landing.proof.title': {
    fr: 'Ils gagnent',
    en: 'They earn',
    es: 'Ellos ganan',
    de: 'Sie verdienen',
    ru: 'Они зарабатывают',
    pt: 'Eles ganham',
    ch: '他们赚',
    hi: 'वे कमाते हैं',
    ar: 'هم يكسبون'
  },
  'chatter.landing.proof.highlight': {
    fr: 'vraiment',
    en: 'really',
    es: 'realmente',
    de: 'wirklich',
    ru: 'действительно',
    pt: 'realmente',
    ch: '真的',
    hi: 'वास्तव में',
    ar: 'حقًا'
  },
  'chatter.landing.proof.subtitle': {
    fr: 'Chatters vérifiés ce mois',
    en: 'Verified chatters this month',
    es: 'Chatters verificados este mes',
    de: 'Verifizierte Chatter diesen Monat',
    ru: 'Проверенные чаттеры в этом месяце',
    pt: 'Chatters verificados este mês',
    ch: '本月验证的聊天员',
    hi: 'इस महीने सत्यापित चैटर्स',
    ar: 'المسوقون المعتمدون هذا الشهر'
  },
  'chatter.landing.proof.podium': {
    fr: 'Top earners',
    en: 'Top earners',
    es: 'Mejores ganadores',
    de: 'Top-Verdiener',
    ru: 'Лучшие заработки',
    pt: 'Maiores ganhadores',
    ch: '顶级收入者',
    hi: 'शीर्ष कमाने वाले',
    ar: 'أفضل الكاسبين'
  },
  'chatter.landing.topEarnerBadge': {
    fr: 'TOP EARNER',
    en: 'TOP EARNER',
    es: 'MEJOR GANADOR',
    de: 'TOP-VERDIENER',
    ru: 'ЛУЧШИЙ ЗАРАБОТОК',
    pt: 'MELHOR GANHADOR',
    ch: '顶级收入者',
    hi: 'शीर्ष कमाने वाला',
    ar: 'أفضل كاسب'
  },
  'chatter.landing.stats.chatters': {
    fr: 'Chatters actifs',
    en: 'Active chatters',
    es: 'Chatters activos',
    de: 'Aktive Chatter',
    ru: 'Активные чаттеры',
    pt: 'Chatters ativos',
    ch: '活跃聊天员',
    hi: 'सक्रिय चैटर्स',
    ar: 'المسوقون النشطون'
  },
  'chatter.landing.stats.countries': {
    fr: 'Pays',
    en: 'Countries',
    es: 'Países',
    de: 'Länder',
    ru: 'Страны',
    pt: 'Países',
    ch: '国家',
    hi: 'देश',
    ar: 'دول'
  },

  // Success Stories
  'chatter.landing.success.badge': {
    fr: '⭐ Histoires de réussite',
    en: '⭐ Success stories',
    es: '⭐ Historias de éxito',
    de: '⭐ Erfolgsgeschichten',
    ru: '⭐ Истории успеха',
    pt: '⭐ Histórias de sucesso',
    ch: '⭐ 成功故事',
    hi: '⭐ सफलता की कहानियां',
    ar: '⭐ قصص نجاح'
  },
  'chatter.landing.success.title': {
    fr: 'Ils ont transformé',
    en: 'They transformed',
    es: 'Ellos transformaron',
    de: 'Sie haben verwandelt',
    ru: 'Они изменили',
    pt: 'Eles transformaram',
    ch: '他们改变了',
    hi: 'उन्होंने बदल दिया',
    ar: 'لقد غيروا'
  },
  'chatter.landing.success.highlight': {
    fr: 'leur vie',
    en: 'their life',
    es: 'su vida',
    de: 'ihr Leben',
    ru: 'свою жизнь',
    pt: 'suas vidas',
    ch: '他们的生活',
    hi: 'अपनी जिंदगी',
    ar: 'حياتهم'
  },
  'chatter.landing.success.subtitle': {
    fr: 'Exemples réels de chatters actifs',
    en: 'Real examples of active chatters',
    es: 'Ejemplos reales de chatters activos',
    de: 'Echte Beispiele aktiver Chatter',
    ru: 'Реальные примеры активных чаттеров',
    pt: 'Exemplos reais de chatters ativos',
    ch: '活跃聊天员的真实例子',
    hi: 'सक्रिय चैटर्स के वास्तविक उदाहरण',
    ar: 'أمثلة حقيقية للمسوقين النشطين'
  },
  'chatter.landing.success.location1': {
    fr: 'Dakar, Sénégal',
    en: 'Dakar, Senegal',
    es: 'Dakar, Senegal',
    de: 'Dakar, Senegal',
    ru: 'Дакар, Сенегал',
    pt: 'Dakar, Senegal',
    ch: '达喀尔，塞内加尔',
    hi: 'दकार, सेनेगल',
    ar: 'داكار، السنغال'
  },
  'chatter.landing.success.time1': {
    fr: 'Après 8 mois',
    en: 'After 8 months',
    es: 'Después de 8 meses',
    de: 'Nach 8 Monaten',
    ru: 'Через 8 месяцев',
    pt: 'Após 8 meses',
    ch: '8个月后',
    hi: '8 महीने बाद',
    ar: 'بعد 8 أشهر'
  },
  'chatter.landing.success.detail1a': {
    fr: '65 chatters N1',
    en: '65 level 1 chatters',
    es: '65 chatters N1',
    de: '65 Chatter Stufe 1',
    ru: '65 чаттеров уровня 1',
    pt: '65 chatters nível 1',
    ch: '65个1级聊天员',
    hi: '65 स्तर 1 चैटर्स',
    ar: '65 مسوقًا من المستوى 1'
  },
  'chatter.landing.success.detail1b': {
    fr: '130 chatters N2',
    en: '130 level 2 chatters',
    es: '130 chatters N2',
    de: '130 Chatter Stufe 2',
    ru: '130 чаттеров уровня 2',
    pt: '130 chatters nível 2',
    ch: '130个2级聊天员',
    hi: '130 स्तर 2 चैटर्स',
    ar: '130 مسوقًا من المستوى 2'
  },
  'chatter.landing.success.detail1c': {
    fr: '20-30 appels directs/mois',
    en: '20-30 direct calls/month',
    es: '20-30 llamadas directas/mes',
    de: '20-30 Direktanrufe/Monat',
    ru: '20-30 прямых звонков/месяц',
    pt: '20-30 chamadas diretas/mês',
    ch: '20-30次直接通话/月',
    hi: '20-30 सीधी कॉलें/महीना',
    ar: '20-30 مكالمة مباشرة/شهر'
  },
  'chatter.landing.success.quote1': {
    fr: "J'ai quitté mon job de taxi. Maintenant je gère mon agence depuis mon canapé !",
    en: 'I quit my taxi job. Now I manage my agency from my couch!',
    es: '¡Dejé mi trabajo de taxi. Ahora gestiono mi agencia desde mi sofá!',
    de: 'Ich habe meinen Taxi-Job gekündigt. Jetzt verwalte ich meine Agentur von meiner Couch aus!',
    ru: 'Я бросил работу таксиста. Теперь я управляю своим агентством с дивана!',
    pt: 'Larguei meu trabalho de táxi. Agora gerencio minha agência do meu sofá!',
    ch: '我辞掉了出租车工作。现在我从沙发上管理我的代理！',
    hi: 'मैंने अपनी टैक्सी की नौकरी छोड़ दी। अब मैं अपने सोफे से अपनी एजेंसी चलाता हूं!',
    ar: 'تركت وظيفتي كسائق تاكسي. الآن أدير وكالتي من أريكتي!'
  },
  'chatter.landing.success.location2': {
    fr: "Abidjan, Côte d'Ivoire",
    en: 'Abidjan, Ivory Coast',
    es: 'Abidjan, Costa de Marfil',
    de: 'Abidjan, Elfenbeinküste',
    ru: "Абиджан, Кот-д'Ивуар",
    pt: 'Abidjan, Costa do Marfim',
    ch: '阿比让，科特迪瓦',
    hi: 'अबिदजान, आइवरी कोस्ट',
    ar: 'أبيدجان، ساحل العاج'
  },
  'chatter.landing.success.time2': {
    fr: 'Après 5 mois',
    en: 'After 5 months',
    es: 'Después de 5 meses',
    de: 'Nach 5 Monaten',
    ru: 'Через 5 месяцев',
    pt: 'Após 5 meses',
    ch: '5个月后',
    hi: '5 महीने बाद',
    ar: 'بعد 5 أشهر'
  },
  'chatter.landing.success.detail2a': {
    fr: '28 chatters N1',
    en: '28 level 1 chatters',
    es: '28 chatters N1',
    de: '28 Chatter Stufe 1',
    ru: '28 чаттеров уровня 1',
    pt: '28 chatters nível 1',
    ch: '28个1级聊天员',
    hi: '28 स्तर 1 चैटर्स',
    ar: '28 مسوقًا من المستوى 1'
  },
  'chatter.landing.success.detail2b': {
    fr: '45 chatters N2',
    en: '45 level 2 chatters',
    es: '45 chatters N2',
    de: '45 Chatter Stufe 2',
    ru: '45 чаттеров уровня 2',
    pt: '45 chatters nível 2',
    ch: '45个2级聊天员',
    hi: '45 स्तर 2 चैटर्स',
    ar: '45 مسوقًا من المستوى 2'
  },
  'chatter.landing.success.detail2c': {
    fr: '2h/jour sur Facebook',
    en: '2h/day on Facebook',
    es: '2h/día en Facebook',
    de: '2h/Tag auf Facebook',
    ru: '2 часа/день на Facebook',
    pt: '2h/dia no Facebook',
    ch: '每天2小时在Facebook',
    hi: 'Facebook पर 2 घंटे/दिन',
    ar: 'ساعتان/يوم على فيسبوك'
  },
  'chatter.landing.success.quote2': {
    fr: "J'ai payé mes études ET aidé ma famille. Merci SOS-Expat !",
    en: 'I paid for my studies AND helped my family. Thank you SOS-Expat!',
    es: '¡Pagué mis estudios Y ayudé a mi familia. ¡Gracias SOS-Expat!',
    de: 'Ich habe mein Studium bezahlt UND meiner Familie geholfen. Danke SOS-Expat!',
    ru: 'Я оплатил учебу И помог семье. Спасибо SOS-Expat!',
    pt: 'Paguei meus estudos E ajudei minha família. Obrigado SOS-Expat!',
    ch: '我支付了学费并帮助了我的家人。感谢 SOS-Expat！',
    hi: 'मैंने अपनी पढ़ाई का भुगतान किया और अपने परिवार की मदद की। धन्यवाद SOS-Expat!',
    ar: 'دفعت ثمن دراستي وساعدت عائلتي. شكرًا SOS-Expat!'
  },
  'chatter.landing.success.location3': {
    fr: 'Bamako, Mali',
    en: 'Bamako, Mali',
    es: 'Bamako, Malí',
    de: 'Bamako, Mali',
    ru: 'Бамако, Мали',
    pt: 'Bamako, Mali',
    ch: '巴马科，马里',
    hi: 'बमाको, माली',
    ar: 'باماكو، مالي'
  },
  'chatter.landing.success.time3': {
    fr: 'Après 2 mois seulement !',
    en: 'After only 2 months!',
    es: '¡Después de solo 2 meses!',
    de: 'Nach nur 2 Monaten!',
    ru: 'Всего через 2 месяца!',
    pt: 'Após apenas 2 meses!',
    ch: '仅2个月后！',
    hi: 'केवल 2 महीने बाद!',
    ar: 'بعد شهرين فقط!'
  },
  'chatter.landing.success.detail3a': {
    fr: '12 chatters N1',
    en: '12 level 1 chatters',
    es: '12 chatters N1',
    de: '12 Chatter Stufe 1',
    ru: '12 чаттеров уровня 1',
    pt: '12 chatters nível 1',
    ch: '12个1级聊天员',
    hi: '12 स्तर 1 चैटर्स',
    ar: '12 مسوقًا من المستوى 1'
  },
  'chatter.landing.success.detail3b': {
    fr: '18 chatters N2',
    en: '18 level 2 chatters',
    es: '18 chatters N2',
    de: '18 Chatter Stufe 2',
    ru: '18 чаттеров уровня 2',
    pt: '18 chatters nível 2',
    ch: '18个2级聊天员',
    hi: '18 स्तर 2 चैटर्स',
    ar: '18 مسوقًا من المستوى 2'
  },
  'chatter.landing.success.detail3c': {
    fr: 'Temps partiel (soir)',
    en: 'Part-time (evening)',
    es: 'Tiempo parcial (noche)',
    de: 'Teilzeit (Abend)',
    ru: 'Неполный рабочий день (вечер)',
    pt: 'Meio período (noite)',
    ch: '兼职（晚上）',
    hi: 'अंशकालिक (शाम)',
    ar: 'دوام جزئي (مساءً)'
  },
  'chatter.landing.success.quote3': {
    fr: "Je suis juste étudiante, et je gagne plus que mes parents ! Incroyable.",
    en: "I'm just a student, and I earn more than my parents! Incredible.",
    es: '¡Solo soy estudiante y gano más que mis padres! Increíble.',
    de: 'Ich bin nur eine Studentin und verdiene mehr als meine Eltern! Unglaublich.',
    ru: 'Я всего лишь студентка, а зарабатываю больше родителей! Невероятно.',
    pt: 'Sou apenas uma estudante e ganho mais que meus pais! Incrível.',
    ch: '我只是一名学生，赚得比我父母还多！难以置信。',
    hi: 'मैं सिर्फ एक छात्रा हूं, और मैं अपने माता-पिता से अधिक कमाती हूं! अविश्वसनीय।',
    ar: 'أنا مجرد طالبة، وأكسب أكثر من والدي! لا يصدق.'
  },
  'chatter.landing.success.cta.title': {
    fr: "Et si c'était VOUS le prochain ?",
    en: 'What if YOU were next?',
    es: '¿Y si TÚ fueras el siguiente?',
    de: 'Was wäre, wenn SIE der Nächste wären?',
    ru: 'А что, если следующим будете ВЫ?',
    pt: 'E se VOCÊ fosse o próximo?',
    ch: '如果下一个是您呢？',
    hi: 'अगर अगले आप होते तो?',
    ar: 'ماذا لو كنت أنت التالي؟'
  },
  'chatter.landing.success.cta.desc': {
    fr: 'Ces chatters ont commencé avec 0$. Ils ont juste partagé leur lien et recruté leur équipe. Vous pouvez faire pareil !',
    en: 'These chatters started with $0. They just shared their link and recruited their team. You can do the same!',
    es: 'Estos chatters comenzaron con $0. Simplemente compartieron su enlace y reclutaron su equipo. ¡Tú puedes hacer lo mismo!',
    de: 'Diese Chatter haben mit $0 angefangen. Sie haben einfach ihren Link geteilt und ihr Team rekrutiert. Sie können dasselbe tun!',
    ru: 'Эти чаттеры начинали с $0. Они просто делились ссылкой и набирали команду. Вы можете сделать то же самое!',
    pt: 'Esses chatters começaram com $0. Eles apenas compartilharam seu link e recrutaram sua equipe. Você pode fazer o mesmo!',
    ch: '这些聊天员从0美元开始。他们只是分享了链接并招募了团队。你也可以做到！',
    hi: 'ये चैटर्स $0 से शुरू हुए। उन्होंने बस अपना लिंक साझा किया और अपनी टीम की भर्ती की। आप भी ऐसा कर सकते हैं!',
    ar: 'بدأ هؤلاء المسوقون بـ 0 دولار. لقد شاركوا رابطهم فقط وجندوا فريقهم. يمكنك أن تفعل الشيء نفسه!'
  },
  'chatter.landing.success.cta.button': {
    fr: 'Je démarre maintenant',
    en: 'I start now',
    es: 'Empiezo ahora',
    de: 'Ich starte jetzt',
    ru: 'Я начинаю сейчас',
    pt: 'Eu começo agora',
    ch: '我现在开始',
    hi: 'मैं अभी शुरू करता हूं',
    ar: 'أبدأ الآن'
  },

  // Agency Section
  'chatter.landing.agency.badge': {
    fr: '🏢 Modèle Agence',
    en: '🏢 Agency Model',
    es: '🏢 Modelo de Agencia',
    de: '🏢 Agentur-Modell',
    ru: '🏢 Агентская модель',
    pt: '🏢 Modelo de Agência',
    ch: '🏢 代理模式',
    hi: '🏢 एजेंसी मॉडल',
    ar: '🏢 نموذج الوكالة'
  },
  'chatter.landing.agency.title': {
    fr: 'De chatter solo à',
    en: 'From solo chatter to',
    es: 'De chatter solo a',
    de: 'Vom Solo-Chatter zur',
    ru: 'От одиночного чаттера к',
    pt: 'De chatter solo a',
    ch: '从单独聊天员到',
    hi: 'एकल चैटर से',
    ar: 'من مسوق منفرد إلى'
  },
  'chatter.landing.agency.highlight': {
    fr: 'agence',
    en: 'agency',
    es: 'agencia',
    de: 'Agentur',
    ru: 'агентство',
    pt: 'agência',
    ch: '代理',
    hi: 'एजेंसी',
    ar: 'وكالة'
  },
  'chatter.landing.agency.subtitle': {
    fr: 'Recrutez des chatters. Gagnez sur leur activité. Sans limite.',
    en: 'Recruit chatters. Earn on their activity. No limit.',
    es: 'Recluta chatters. Gana con su actividad. Sin límite.',
    de: 'Chatter rekrutieren. Verdienen Sie mit ihrer Aktivität. Keine Grenzen.',
    ru: 'Нанимайте чаттеров. Зарабатывайте на их активности. Без ограничений.',
    pt: 'Recrute chatters. Ganhe com a atividade deles. Sem limite.',
    ch: '招募聊天员。通过他们的活动赚钱。无限制。',
    hi: 'चैटर्स भर्ती करें। उनकी गतिविधि पर कमाएं। कोई सीमा नहीं।',
    ar: 'جند مسوقين. اكسب من نشاطهم. بلا حدود.'
  },
  'chatter.landing.agency.structure': {
    fr: 'Structure de votre agence',
    en: 'Your agency structure',
    es: 'Estructura de tu agencia',
    de: 'Ihre Agenturstruktur',
    ru: 'Структура вашего агентства',
    pt: 'Estrutura da sua agência',
    ch: '您的代理结构',
    hi: 'आपकी एजेंसी संरचना',
    ar: 'هيكل وكالتك'
  },
  'chatter.landing.bossBadge': {
    fr: 'BOSS',
    en: 'BOSS',
    es: 'JEFE',
    de: 'CHEF',
    ru: 'БОСС',
    pt: 'CHEFE',
    ch: '老板',
    hi: 'बॉस',
    ar: 'رئيس'
  },
  'chatter.landing.agency.you': {
    fr: 'Vous = Le directeur',
    en: 'You = The director',
    es: 'Tú = El director',
    de: 'Sie = Der Direktor',
    ru: 'Вы = Директор',
    pt: 'Você = O diretor',
    ch: '您 = 总监',
    hi: 'आप = निदेशक',
    ar: 'أنت = المدير'
  },
  'chatter.landing.agency.persoCall': {
    fr: 'appel perso',
    en: 'personal call',
    es: 'llamada personal',
    de: 'persönlicher Anruf',
    ru: 'личный звонок',
    pt: 'chamada pessoal',
    ch: '个人通话',
    hi: 'व्यक्तिगत कॉल',
    ar: 'مكالمة شخصية'
  },
  'chatter.landing.agency.team': {
    fr: 'Votre équipe',
    en: 'Your team',
    es: 'Tu equipo',
    de: 'Ihr Team',
    ru: 'Ваша команда',
    pt: 'Sua equipe',
    ch: '您的团队',
    hi: 'आपकी टीम',
    ar: 'فريقك'
  },
  'chatter.landing.unlimited': {
    fr: 'illimitée',
    en: 'unlimited',
    es: 'ilimitada',
    de: 'unbegrenzt',
    ru: 'неограниченная',
    pt: 'ilimitada',
    ch: '无限',
    hi: 'असीमित',
    ar: 'غير محدودة'
  },
  'chatter.landing.agency.perCall': {
    fr: 'sur chaque appel',
    en: 'on each call',
    es: 'en cada llamada',
    de: 'bei jedem Anruf',
    ru: 'за каждый звонок',
    pt: 'em cada chamada',
    ch: '每次通话',
    hi: 'प्रत्येक कॉल पर',
    ar: 'على كل مكالمة'
  },
  'chatter.landing.agency.recruits': {
    fr: 'Leurs recrues',
    en: 'Their recruits',
    es: 'Sus reclutas',
    de: 'Ihre Rekruten',
    ru: 'Их рекруты',
    pt: 'Seus recrutas',
    ch: '他们的招募',
    hi: 'उनकी भर्तियां',
    ar: 'مجنديهم'
  },
  'chatter.landing.calc.badge': {
    fr: '💰 Calculateur de revenus',
    en: '💰 Income calculator',
    es: '💰 Calculadora de ingresos',
    de: '💰 Einkommensrechner',
    ru: '💰 Калькулятор дохода',
    pt: '💰 Calculadora de renda',
    ch: '💰 收入计算器',
    hi: '💰 आय कैलकुलेटर',
    ar: '💰 حاسبة الدخل'
  },
  'chatter.landing.calc.title.new': {
    fr: 'Découvrez VOTRE potentiel',
    en: 'Discover YOUR potential',
    es: 'Descubre TU potencial',
    de: 'Entdecken Sie IHR Potenzial',
    ru: 'Откройте СВОЙ потенциал',
    pt: 'Descubra SEU potencial',
    ch: '发现您的潜力',
    hi: 'अपनी क्षमता खोजें',
    ar: 'اكتشف إمكاناتك'
  },
  'chatter.landing.calc.level1': {
    fr: 'Vos chatters N1 : {count}',
    en: 'Your level 1 chatters: {count}',
    es: 'Tus chatters N1: {count}',
    de: 'Ihre Stufe 1 Chatter: {count}',
    ru: 'Ваши чаттеры уровня 1: {count}',
    pt: 'Seus chatters nível 1: {count}',
    ch: '您的1级聊天员：{count}',
    hi: 'आपके स्तर 1 चैटर्स: {count}',
    ar: 'مسوقوك من المستوى 1: {count}'
  },
  'chatter.landing.calc.level2': {
    fr: 'Leurs recrues N2 : {count}',
    en: 'Their level 2 recruits: {count}',
    es: 'Sus reclutas N2: {count}',
    de: 'Ihre Stufe 2 Rekruten: {count}',
    ru: 'Их рекруты уровня 2: {count}',
    pt: 'Seus recrutas nível 2: {count}',
    ch: '他们的2级招募：{count}',
    hi: 'उनकी स्तर 2 भर्तियां: {count}',
    ar: 'مجنديهم من المستوى 2: {count}'
  },
  'chatter.landing.calc.calls': {
    fr: 'Appels/mois par chatter : {count}',
    en: 'Calls/month per chatter: {count}',
    es: 'Llamadas/mes por chatter: {count}',
    de: 'Anrufe/Monat pro Chatter: {count}',
    ru: 'Звонков/месяц на чаттера: {count}',
    pt: 'Chamadas/mês por chatter: {count}',
    ch: '每个聊天员的通话数/月：{count}',
    hi: 'प्रति चैटर कॉलें/महीना: {count}',
    ar: 'مكالمات/شهر لكل مسوق: {count}'
  },
  'chatter.landing.calc.yourPassive': {
    fr: 'VOS REVENUS PASSIFS MENSUELS',
    en: 'YOUR MONTHLY PASSIVE INCOME',
    es: 'TUS INGRESOS PASIVOS MENSUALES',
    de: 'IHR MONATLICHES PASSIVES EINKOMMEN',
    ru: 'ВАШ ЕЖЕМЕСЯЧНЫЙ ПАССИВНЫЙ ДОХОД',
    pt: 'SUA RENDA PASSIVA MENSAL',
    ch: '您的每月被动收入',
    hi: 'आपकी मासिक निष्क्रिय आय',
    ar: 'دخلك السلبي الشهري'
  },
  'chatter.landing.calc.motivation': {
    fr: '🎯 Sans compter VOS appels directs à 10$ !',
    en: '🎯 Not counting YOUR direct calls at $10!',
    es: '🎯 ¡Sin contar TUS llamadas directas a $10!',
    de: '🎯 Ohne Ihre direkten Anrufe zu $10!',
    ru: '🎯 Не считая ВАШИХ прямых звонков по $10!',
    pt: '🎯 Sem contar SUAS chamadas diretas a $10!',
    ch: '🎯 不包括您的 $10 直接通话！',
    hi: '🎯 $10 की आपकी सीधी कॉलों की गिनती नहीं!',
    ar: '🎯 لا تحسب مكالماتك المباشرة بسعر 10 دولارات!'
  },
  'chatter.landing.calc.forever': {
    fr: 'À vie. Tant que votre agence tourne.',
    en: 'For life. As long as your agency runs.',
    es: 'De por vida. Mientras tu agencia funcione.',
    de: 'Lebenslang. Solange Ihre Agentur läuft.',
    ru: 'На всю жизнь. Пока работает ваше агентство.',
    pt: 'Para sempre. Enquanto sua agência funcionar.',
    ch: '终身。只要您的代理运营。',
    hi: 'जीवन भर। जब तक आपकी एजेंसी चलती है।',
    ar: 'مدى الحياة. طالما وكالتك تعمل.'
  },

  // Risk Section
  'chatter.landing.risk.title': {
    fr: 'Zéro risque.',
    en: 'Zero risk.',
    es: 'Cero riesgo.',
    de: 'Null Risiko.',
    ru: 'Нулевой риск.',
    pt: 'Zero risco.',
    ch: '零风险。',
    hi: 'शून्य जोखिम।',
    ar: 'صفر مخاطرة.'
  },
  'chatter.landing.risk.highlight': {
    fr: 'Zéro limite.',
    en: 'Zero limit.',
    es: 'Cero límite.',
    de: 'Null Grenze.',
    ru: 'Без ограничений.',
    pt: 'Zero limite.',
    ch: '零限制。',
    hi: 'शून्य सीमा।',
    ar: 'صفر حد.'
  },
  'chatter.landing.risk.countries': {
    fr: '197 pays',
    en: '197 countries',
    es: '197 países',
    de: '197 Länder',
    ru: '197 стран',
    pt: '197 países',
    ch: '197个国家',
    hi: '197 देश',
    ar: '197 دولة'
  },
  'chatter.landing.risk.countries.desc': {
    fr: 'Mondial',
    en: 'Worldwide',
    es: 'Mundial',
    de: 'Weltweit',
    ru: 'По всему миру',
    pt: 'Mundial',
    ch: '全球',
    hi: 'विश्वव्यापी',
    ar: 'عالمي'
  },
  'chatter.landing.risk.languages': {
    fr: '9 langues',
    en: '9 languages',
    es: '9 idiomas',
    de: '9 Sprachen',
    ru: '9 языков',
    pt: '9 idiomas',
    ch: '9种语言',
    hi: '9 भाषाएं',
    ar: '9 لغات'
  },
  'chatter.landing.risk.languages.desc': {
    fr: 'Support multilingue',
    en: 'Multilingual support',
    es: 'Soporte multilingüe',
    de: 'Mehrsprachiger Support',
    ru: 'Многоязычная поддержка',
    pt: 'Suporte multilíngue',
    ch: '多语言支持',
    hi: 'बहुभाषी सहायता',
    ar: 'دعم متعدد اللغات'
  },
  'chatter.landing.risk.free': {
    fr: '100% gratuit',
    en: '100% free',
    es: '100% gratis',
    de: '100% kostenlos',
    ru: '100% бесплатно',
    pt: '100% grátis',
    ch: '100%免费',
    hi: '100% मुफ्त',
    ar: 'مجاني 100%'
  },
  'chatter.landing.risk.free.desc': {
    fr: 'Aucun investissement',
    en: 'No investment',
    es: 'Sin inversión',
    de: 'Keine Investition',
    ru: 'Без вложений',
    pt: 'Sem investimento',
    ch: '无需投资',
    hi: 'कोई निवेश नहीं',
    ar: 'بدون استثمار'
  },
  'chatter.landing.risk.phone': {
    fr: 'Juste un smartphone',
    en: 'Just a smartphone',
    es: 'Solo un smartphone',
    de: 'Nur ein Smartphone',
    ru: 'Только смартфон',
    pt: 'Apenas um smartphone',
    ch: '只需一部智能手机',
    hi: 'बस एक स्मार्टफोन',
    ar: 'هاتف ذكي فقط'
  },
  'chatter.landing.risk.phone.desc': {
    fr: "C'est tout !",
    en: "That's it!",
    es: '¡Eso es todo!',
    de: 'Das ist alles!',
    ru: 'Вот и все!',
    pt: 'É isso!',
    ch: '就是这样！',
    hi: 'बस इतना ही!',
    ar: 'هذا كل شيء!'
  },
  'chatter.landing.risk.noCommit': {
    fr: 'Aucun engagement',
    en: 'No commitment',
    es: 'Sin compromiso',
    de: 'Keine Verpflichtung',
    ru: 'Без обязательств',
    pt: 'Sem compromisso',
    ch: '无承诺',
    hi: 'कोई प्रतिबद्धता नहीं',
    ar: 'بدون التزام'
  },
  'chatter.landing.risk.noCommit.desc': {
    fr: 'Travaillez quand vous voulez',
    en: 'Work whenever you want',
    es: 'Trabaja cuando quieras',
    de: 'Arbeiten Sie, wann Sie wollen',
    ru: 'Работайте когда хотите',
    pt: 'Trabalhe quando quiser',
    ch: '随时工作',
    hi: 'जब चाहें काम करें',
    ar: 'اعمل متى تشاء'
  },
  'chatter.landing.payment.info': {
    fr: 'Retrait dès 25$ • Reçu en 48h',
    en: 'Withdrawal from $25 • Received in 48h',
    es: 'Retiro desde $25 • Recibido en 48h',
    de: 'Auszahlung ab $25 • Erhalten in 48h',
    ru: 'Вывод от $25 • Получено за 48 часов',
    pt: 'Saque a partir de $25 • Recebido em 48h',
    ch: '从 $25 提款 • 48小时内收到',
    hi: '$25 से निकासी • 48 घंटे में प्राप्त',
    ar: 'السحب من 25 دولارًا • يتم الاستلام خلال 48 ساعة'
  },

  // FAQ
  'chatter.faq.title': {
    fr: 'Questions ?',
    en: 'Questions?',
    es: '¿Preguntas?',
    de: 'Fragen?',
    ru: 'Вопросы?',
    pt: 'Perguntas?',
    ch: '问题？',
    hi: 'प्रश्न?',
    ar: 'أسئلة؟'
  },
  'chatter.faq.subtitle': {
    fr: 'Tout ce que vous devez savoir avant de commencer',
    en: 'Everything you need to know before getting started',
    es: 'Todo lo que necesitas saber antes de empezar',
    de: 'Alles, was Sie wissen müssen, bevor Sie anfangen',
    ru: 'Все, что вам нужно знать перед началом',
    pt: 'Tudo o que você precisa saber antes de começar',
    ch: '开始之前您需要了解的一切',
    hi: 'शुरू करने से पहले आपको जो कुछ भी जानना चाहिए',
    ar: 'كل ما تحتاج معرفته قبل البدء'
  },

  // CTA Final
  'chatter.landing.cta.join': {
    fr: 'Rejoignez 1 200+ chatters dans 197 pays',
    en: 'Join 1,200+ chatters in 197 countries',
    es: 'Únete a 1,200+ chatters en 197 países',
    de: 'Treten Sie 1.200+ Chattern in 197 Ländern bei',
    ru: 'Присоединяйтесь к 1200+ чаттерам в 197 странах',
    pt: 'Junte-se a 1.200+ chatters em 197 países',
    ch: '加入197个国家的1200+聊天员',
    hi: '197 देशों में 1,200+ चैटर्स से जुड़ें',
    ar: 'انضم إلى 1200+ مسوق في 197 دولة'
  },
  'chatter.landing.cta.title': {
    fr: 'Commencez à gagner',
    en: 'Start earning',
    es: 'Comienza a ganar',
    de: 'Beginnen Sie zu verdienen',
    ru: 'Начните зарабатывать',
    pt: 'Comece a ganhar',
    ch: '开始赚钱',
    hi: 'कमाना शुरू करें',
    ar: 'ابدأ الكسب'
  },
  'chatter.landing.cta.highlight': {
    fr: "aujourd'hui",
    en: 'today',
    es: 'hoy',
    de: 'heute',
    ru: 'сегодня',
    pt: 'hoje',
    ch: '今天',
    hi: 'आज',
    ar: 'اليوم'
  },
  'chatter.landing.recap.revenue': {
    fr: '3 sources de revenus',
    en: '3 revenue streams',
    es: '3 fuentes de ingresos',
    de: '3 Einnahmequellen',
    ru: '3 источника дохода',
    pt: '3 fontes de renda',
    ch: '3种收入来源',
    hi: '3 राजस्व धाराएं',
    ar: '3 مصادر دخل'
  },
  'chatter.landing.recap.team': {
    fr: 'Équipe illimitée',
    en: 'Unlimited team',
    es: 'Equipo ilimitado',
    de: 'Unbegrenztes Team',
    ru: 'Неограниченная команда',
    pt: 'Equipe ilimitada',
    ch: '无限团队',
    hi: 'असीमित टीम',
    ar: 'فريق غير محدود'
  },
  'chatter.landing.recap.countries': {
    fr: '197 pays',
    en: '197 countries',
    es: '197 países',
    de: '197 Länder',
    ru: '197 стран',
    pt: '197 países',
    ch: '197个国家',
    hi: '197 देश',
    ar: '197 دولة'
  },
  'chatter.landing.recap.free': {
    fr: '100% gratuit',
    en: '100% free',
    es: '100% gratis',
    de: '100% kostenlos',
    ru: '100% бесплатно',
    pt: '100% grátis',
    ch: '100%免费',
    hi: '100% मुफ्त',
    ar: 'مجاني 100%'
  },
  'chatter.landing.cta.final': {
    fr: 'Devenir Chatter maintenant',
    en: 'Become a Chatter now',
    es: 'Conviértete en Chatter ahora',
    de: 'Jetzt Chatter werden',
    ru: 'Стать чаттером сейчас',
    pt: 'Tornar-se Chatter agora',
    ch: '立即成为 Chatter',
    hi: 'अभी चैटर बनें',
    ar: 'كن مسوقًا الآن'
  },
  'chatter.landing.cta.footer': {
    fr: 'Inscription gratuite • Démarrez en 5 minutes',
    en: 'Free registration • Start in 5 minutes',
    es: 'Registro gratuito • Empieza en 5 minutos',
    de: 'Kostenlose Registrierung • Start in 5 Minuten',
    ru: 'Бесплатная регистрация • Начните через 5 минут',
    pt: 'Registro gratuito • Comece em 5 minutos',
    ch: '免费注册 • 5分钟开始',
    hi: 'मुफ्त पंजीकरण • 5 मिनट में शुरू करें',
    ar: 'تسجيل مجاني • ابدأ خلال 5 دقائق'
  },
  'chatter.landing.ctaAriaLabel': {
    fr: "Appel à l'action - Inscrivez-vous maintenant",
    en: 'Call to action - Register now',
    es: 'Llamado a la acción - Regístrate ahora',
    de: 'Handlungsaufforderung - Jetzt registrieren',
    ru: 'Призыв к действию - Зарегистрируйтесь сейчас',
    pt: 'Chamada para ação - Registre-se agora',
    ch: '行动号召 - 立即注册',
    hi: 'कार्रवाई के लिए कॉल - अभी पंजीकरण करें',
    ar: 'دعوة للعمل - سجل الآن'
  },
  'chatter.aria.cta.main': {
    fr: "Commencez à gagner de l'argent maintenant - Inscrivez-vous gratuitement en tant que Chatter",
    en: 'Start earning money now - Register as a Chatter for free',
    es: 'Comienza a ganar dinero ahora - Regístrate como Chatter gratis',
    de: 'Beginnen Sie jetzt Geld zu verdienen - Registrieren Sie sich kostenlos als Chatter',
    ru: 'Начните зарабатывать сейчас - Зарегистрируйтесь бесплатно как чаттер',
    pt: 'Comece a ganhar dinheiro agora - Registre-se como Chatter gratuitamente',
    ch: '现在开始赚钱 - 免费注册为 Chatter',
    hi: 'अभी पैसे कमाना शुरू करें - मुफ्त में चैटर के रूप में पंजीकरण करें',
    ar: 'ابدأ في كسب المال الآن - سجل كمسوق مجانًا'
  },

  // Pour toutes les autres clés, utiliser le defaultMessage français comme fallback
};

// ============================================================================
// ÉTAPE 3 : MISE À JOUR DES FICHIERS DE TRADUCTION
// ============================================================================
function updateTranslationFile(lang, messages) {
  const filePath = path.join(HELPER_DIR, `${lang}.json`);

  console.log(`\n📝 Mise à jour de ${lang}.json...`);

  // Lire le fichier existant
  let translations = {};
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    translations = JSON.parse(content);
  }

  let addedCount = 0;
  let skippedCount = 0;

  let updatedCount = 0;

  // Ajouter/Mettre à jour les clés
  for (const [id, defaultMsg] of messages.entries()) {
    const existingValue = translations[id];
    const hasAutoPrefix = existingValue && existingValue.startsWith('[AUTO]');

    // Utiliser la traduction manuelle si disponible, sinon le defaultMessage
    let translation = defaultMsg;
    if (TRANSLATIONS[id] && TRANSLATIONS[id][lang]) {
      translation = TRANSLATIONS[id][lang];
    } else if (lang === 'fr') {
      translation = defaultMsg; // Français = defaultMessage
    } else {
      // Pour les autres langues, préfixer avec [AUTO] pour indiquer qu'il faut traduire
      translation = `[AUTO] ${defaultMsg}`;
    }

    // Si la clé existe déjà
    if (existingValue) {
      // Mettre à jour si :
      // 1. C'est une traduction manuelle disponible
      // 2. OU si c'est AUTO
      // 3. OU si la valeur actuelle est différente de la nouvelle
      if (TRANSLATIONS[id] && TRANSLATIONS[id][lang]) {
        // Toujours mettre à jour avec la traduction manuelle
        translations[id] = translation;
        updatedCount++;
      } else if (hasAutoPrefix) {
        translations[id] = translation;
        updatedCount++;
      } else if (existingValue !== translation) {
        translations[id] = translation;
        updatedCount++;
      } else {
        skippedCount++;
      }
    } else {
      // Nouvelle clé
      translations[id] = translation;
      addedCount++;
    }
  }

  // Trier les clés alphabétiquement
  const sorted = Object.keys(translations)
    .sort()
    .reduce((acc, key) => {
      acc[key] = translations[key];
      return acc;
    }, {});

  // Écrire le fichier
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');

  console.log(`  ✅ ${addedCount} clés ajoutées, ${updatedCount} mises à jour, ${skippedCount} inchangées`);
}

// ============================================================================
// MAIN
// ============================================================================
function main() {
  console.log('🚀 Fix Chatter Translations\n');
  console.log('='.repeat(60));

  // 1. Extraction
  const messages = extractDefaultMessages(CHATTER_LANDING_TSX);

  // 2. Mise à jour pour chaque langue
  console.log('\n📚 Mise à jour des fichiers de traduction...');
  for (const lang of LANGUAGES) {
    updateTranslationFile(lang, messages);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ TERMINÉ !');
  console.log('\n📌 NOTES :');
  console.log('  - Les clés préfixées [AUTO] dans les langues autres que FR nécessitent une traduction manuelle');
  console.log('  - Le français (FR) utilise directement les defaultMessage');
  console.log('  - Les traductions manuelles (SEO, hero, etc.) ont été appliquées');
  console.log('\n🔍 NEXT STEPS :');
  console.log('  1. Vérifier les fichiers de traduction générés');
  console.log('  2. Remplacer les [AUTO] par les vraies traductions');
  console.log('  3. Tester ChatterLanding dans toutes les langues');
}

main();
