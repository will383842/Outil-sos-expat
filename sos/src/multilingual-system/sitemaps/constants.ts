/**
 * Constants for sitemap generation
 */

import { Language, StaticRoute } from './types';
import countriesConfig from '../config/countries.json';

export const SITE_URL = 'https://sos-expat.com';

// Valid language-country pairs (only the 9 supported locales)
export const LANGUAGES: Language[] = countriesConfig.languages.map(locale => {
  const [lang, country] = locale.split('-');
  return { code: lang, country: country.toLowerCase() };
});

// LANGUAGE_COUNTRY_COMBINATIONS now equals LANGUAGES (only valid locales)
// Previously this was a cartesian product of 9 languages × 197 countries = 1773 invalid combos
export const LANGUAGE_COUNTRY_COMBINATIONS: Language[] = LANGUAGES;

// All unique countries from config
export const COUNTRIES: string[] = countriesConfig.countries.map(c => c.toLowerCase());

// Static public routes (exclude protected routes)
export const STATIC_ROUTES: StaticRoute[] = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/login', translated: 'login', priority: 0.5, changefreq: 'monthly' },
  { path: '/register', translated: 'register', priority: 0.6, changefreq: 'monthly' },
  { path: '/register/client', translated: 'register-client', priority: 0.5, changefreq: 'monthly' },
  { path: '/register/lawyer', translated: 'register-lawyer', priority: 0.6, changefreq: 'monthly' },
  { path: '/register/expat', translated: 'register-expat', priority: 0.6, changefreq: 'monthly' },
  { path: '/password-reset', translated: 'password-reset', priority: 0.3, changefreq: 'yearly' },
  { path: '/tarifs', translated: 'pricing', priority: 0.8, changefreq: 'monthly' },
  { path: '/contact', translated: 'contact', priority: 0.7, changefreq: 'monthly' },
  { path: '/how-it-works', translated: 'how-it-works', priority: 0.8, changefreq: 'monthly' },
  { path: '/faq', translated: 'faq', priority: 0.7, changefreq: 'weekly' },
  { path: '/centre-aide', translated: 'help-center', priority: 0.6, changefreq: 'weekly' },
  { path: '/testimonials', translated: 'testimonials', priority: 0.7, changefreq: 'weekly' },
  { path: '/terms-clients', translated: 'terms-clients', priority: 0.4, changefreq: 'yearly' },
  { path: '/terms-lawyers', translated: 'terms-lawyers', priority: 0.4, changefreq: 'yearly' },
  { path: '/terms-expats', translated: 'terms-expats', priority: 0.4, changefreq: 'yearly' },
  { path: '/terms-chatters', translated: 'terms-chatters', priority: 0.4, changefreq: 'yearly' },
  { path: '/privacy-policy', translated: 'privacy-policy', priority: 0.5, changefreq: 'yearly' },
  { path: '/cookies', translated: 'cookies', priority: 0.3, changefreq: 'yearly' },
  { path: '/consumers', translated: 'consumers', priority: 0.5, changefreq: 'monthly' },
  { path: '/statut-service', translated: 'service-status', priority: 0.6, changefreq: 'daily' },
  { path: '/seo', translated: 'seo', priority: 0.5, changefreq: 'monthly' },
  { path: '/sos-appel', translated: 'sos-call', priority: 0.9, changefreq: 'daily' },
  { path: '/appel-expatrie', translated: 'expat-call', priority: 0.9, changefreq: 'daily' },
  { path: '/providers', translated: 'providers', priority: 0.8, changefreq: 'daily' },
];

// Route translations mapping
export const ROUTE_TRANSLATIONS: Record<string, Record<string, string>> = {
  'login': { fr: 'connexion', en: 'login', es: 'iniciar-sesion', ru: 'вход', de: 'anmeldung', hi: 'लॉगिन', pt: 'entrar', ch: '登录', ar: 'تسجيل-الدخول' },
  'register': { fr: 'inscription', en: 'register', es: 'registro', ru: 'регистрация', de: 'registrierung', hi: 'पंजीकरण', pt: 'cadastro', ch: '注册', ar: 'التسجيل' },
  'register-client': { fr: 'inscription/client', en: 'register/client', es: 'registro/cliente', ru: 'регистрация/клиент', de: 'registrierung/kunde', hi: 'पंजीकरण/ग्राहक', pt: 'registro/cliente', ch: '注册/客户', ar: 'تسجيل/عميل' },
  'register-lawyer': { fr: 'inscription/avocat', en: 'register/lawyer', es: 'registro/abogado', ru: 'регистрация/юрист', de: 'registrierung/anwalt', hi: 'पंजीकरण/वकील', pt: 'registro/advogado', ch: '注册/律师', ar: 'تسجيل/محام' },
  'register-expat': { fr: 'inscription/expatrie', en: 'register/expat', es: 'registro/expatriado', ru: 'регистрация/эмигрант', de: 'registrierung/expatriate', hi: 'पंजीकरण/प्रवासी', pt: 'registro/expatriado', ch: '注册/外籍人士', ar: 'تسجيل/مغترب' },
  'password-reset': { fr: 'reinitialisation-mot-de-passe', en: 'password-reset', es: 'restablecer-contrasena', ru: 'сброс-пароля', de: 'passwort-zurucksetzen', hi: 'पासवर्ड-रीसेट', pt: 'redefinir-senha', ch: '重置密码', ar: 'إعادة-تعيين-كلمة-المرور' },
  'pricing': { fr: 'tarifs', en: 'pricing', es: 'precios', ru: 'цены', de: 'preise', hi: 'मूल्य-निर्धारण', pt: 'precos', ch: '价格', ar: 'الأسعار' },
  'contact': { fr: 'contact', en: 'contact', es: 'contacto', ru: 'контакты', de: 'kontakt', hi: 'संपर्क', pt: 'contato', ch: '联系', ar: 'اتصل-بنا' },
  'how-it-works': { fr: 'comment-ca-marche', en: 'how-it-works', es: 'como-funciona', ru: 'как-это-работает', de: 'wie-es-funktioniert', hi: 'यह-कैसे-काम-करता-है', pt: 'como-funciona', ch: '工作原理', ar: 'كيف-يعمل' },
  'faq': { fr: 'faq', en: 'faq', es: 'preguntas-frecuentes', ru: 'часто-задаваемые-вопросы', de: 'faq', hi: 'सामान्य-प्रश्न', pt: 'perguntas-frequentes', ch: '常见问题', ar: 'الأسئلة-الشائعة' },
  'help-center': { fr: 'centre-aide', en: 'help-center', es: 'centro-ayuda', ru: 'центр-помощи', de: 'hilfezentrum', hi: 'सहायता-केंद्र', pt: 'centro-ajuda', ch: '帮助中心', ar: 'مركز-المساعدة' },
  'testimonials': { fr: 'temoignages', en: 'testimonials', es: 'testimonios', ru: 'отзывы', de: 'testimonials', hi: 'प्रशंसापत्र', pt: 'depoimentos', ch: '客户评价', ar: 'الشهادات' },
  'terms-clients': { fr: 'cgu-clients', en: 'terms-clients', es: 'terminos-clientes', ru: 'условия-для-клиентов', de: 'agb-kunden', hi: 'ग्राहक-शर्तें', pt: 'termos-clientes', ch: '客户条款', ar: 'شروط-العملاء' },
  'terms-lawyers': { fr: 'cgu-avocats', en: 'terms-lawyers', es: 'terminos-abogados', ru: 'условия-для-юристов', de: 'agb-anwaelte', hi: 'वकील-शर्तें', pt: 'termos-advogados', ch: '律师条款', ar: 'شروط-المحامون' },
  'terms-expats': { fr: 'cgu-expatries', en: 'terms-expats', es: 'terminos-expatriados', ru: 'условия-для-эмигрантов', de: 'agb-expatriates', hi: 'प्रवासी-शर्तें', pt: 'termos-expatriados', ch: '外籍人士条款', ar: 'شروط-المغتربين' },
  'terms-chatters': { fr: 'cgu-chatters', en: 'terms-chatters', es: 'terminos-chatters', ru: 'условия-для-чаттеров', de: 'agb-chatters', hi: 'चैटर-शर्तें', pt: 'termos-chatters', ch: '聊天员条款', ar: 'شروط-المروجين' },
  'privacy-policy': { fr: 'politique-confidentialite', en: 'privacy-policy', es: 'politica-privacidad', ru: 'политика-конфиденциальности', de: 'datenschutzrichtlinie', hi: 'गोपनीयता-नीति', pt: 'politica-privacidade', ch: '隐私政策', ar: 'سياسة-الخصوصية' },
  'cookies': { fr: 'cookies', en: 'cookies', es: 'cookies', ru: 'куки', de: 'cookies', hi: 'कुकीज़', pt: 'cookies', ch: 'Cookie政策', ar: 'ملفات-التعريف' },
  'consumers': { fr: 'consommateurs', en: 'consumers', es: 'consumidores', ru: 'потребители', de: 'verbraucher', hi: 'उपभोक्ता', pt: 'consumidores', ch: '消费者', ar: 'المستهلكين' },
  'service-status': { fr: 'statut-service', en: 'service-status', es: 'estado-servicio', ru: 'статус-сервиса', de: 'dienststatus', hi: 'सेवा-स्थिति', pt: 'status-servico', ch: '服务状态', ar: 'حالة-الخدمة' },
  'seo': { fr: 'referencement', en: 'seo', es: 'seo', ru: 'seo', de: 'seo', hi: 'एसईओ', pt: 'seo', ch: 'SEO', ar: 'تحسين-محركات-البحث' },
  'sos-call': { fr: 'sos-appel', en: 'emergency-call', es: 'llamada-emergencia', ru: 'экстренный-звонок', de: 'notruf', hi: 'आपात-कॉल', pt: 'chamada-emergencia', ch: '紧急呼叫', ar: 'مكالمة-طوارئ' },
  'expat-call': { fr: 'appel-expatrie', en: 'expat-call', es: 'llamada-expatriado', ru: 'звонок-эмигранту', de: 'expatriate-anruf', hi: 'प्रवासी-कॉल', pt: 'chamada-expatriado', ch: '外籍人士呼叫', ar: 'مكالمة-المغترب' },
  'providers': { fr: 'prestataires', en: 'providers', es: 'proveedores', ru: 'поставщики', de: 'anbieter', hi: 'प्रदाता', pt: 'prestadores', ch: '服务提供商', ar: 'مقدمي-الخدمات' },
};

