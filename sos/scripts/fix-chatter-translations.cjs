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
    fr: 'Devenir Chatter - Gagnez jusqu\'à 3000$/mois en aidant les voyageurs',
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
    fr: 'Gagnez jusqu\'à 3000$/mois avec 3 sources de revenus : appels directs (10$/appel), équipe MLM illimitée, et partenaires (avocats/aidants). Rejoignez 1200+ chatters dans 197 pays. 100% gratuit.',
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
    fr: 'Gagnez jusqu\'à',
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
    fr: 'Invitez des avocats ou expatriés aidants. Gagnez 5$ sur CHAQUE appel qu\'ils reçoivent pendant 6 mois !',
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

  // Ajouter les nouvelles clés
  for (const [id, defaultMsg] of messages.entries()) {
    if (translations[id]) {
      skippedCount++;
      continue; // Déjà existant, on ne touche pas
    }

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

    translations[id] = translation;
    addedCount++;
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

  console.log(`  ✅ ${addedCount} clés ajoutées, ${skippedCount} déjà existantes`);
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
