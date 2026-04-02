/**
 * Sondages Listing — SOS-Expat
 * Connected to Blog Laravel API (no mock data).
 */
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  Vote,
  Loader2,
  MessageSquarePlus,
  ChevronRight,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import SEOHead from "@/components/layout/SEOHead";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import FAQPageSchema from "@/components/seo/FAQPageSchema";
import ContentSectionLinks from "@/components/layout/ContentSectionLinks";
import { parseLocaleFromPath, getTranslatedRouteSlug } from "@/multilingual-system";
import { useApp } from "@/contexts/AppContext";

/* ------------------------------------------------------------------ */
/*  i18n                                                               */
/* ------------------------------------------------------------------ */

const T: Record<string, Record<string, string>> = {
  badge: { fr: "Sondages", en: "Surveys", es: "Encuestas", de: "Umfragen", pt: "Sondagens", ru: "Опросы", ch: "调查问卷", hi: "सर्वेक्षण", ar: "الاستطلاعات" },
  heroTitle: { fr: "Votre voix compte", en: "Your voice matters", es: "Tu voz importa", de: "Ihre Stimme zählt", pt: "A sua voz importa", ru: "Ваш голос важен", ch: "您的声音很重要", hi: "आपकी आवाज़ मायने रखती है", ar: "صوتك يُحدث فرقاً" },
  heroSubtitle: { fr: "Participez a nos sondages et contribuez a ameliorer l'experience des expatries.", en: "Take part in our surveys and help improve the expat experience.", es: "Participa en nuestras encuestas y contribuye a mejorar la experiencia de los expatriados.", de: "Nehmen Sie an unseren Umfragen teil und helfen Sie dabei, die Erfahrung von Expats zu verbessern.", pt: "Participe nos nossos sondagens e contribua para melhorar a experiência dos expatriados.", ru: "Участвуйте в наших опросах и помогайте улучшать опыт экспатов.", ch: "参与我们的调查，帮助改善外籍人士的体验。", hi: "हमारे सर्वेक्षणों में भाग लें और प्रवासियों के अनुभव को बेहतर बनाने में योगदान दें।", ar: "شارك في استطلاعاتنا وساهم في تحسين تجربة المغتربين." },
  statActive: { fr: "sondages actifs", en: "active surveys", es: "encuestas activas", de: "aktive Umfragen", pt: "sondagens ativas", ru: "активных опросов", ch: "进行中的调查", hi: "सक्रिय सर्वेक्षण", ar: "استطلاعات نشطة" },
  statParticipants: { fr: "participants", en: "participants", es: "participantes", de: "Teilnehmer", pt: "participantes", ru: "участников", ch: "参与者", hi: "प्रतिभागी", ar: "مشاركون" },
  statCompleted: { fr: "sondages termines", en: "completed surveys", es: "encuestas completadas", de: "abgeschlossene Umfragen", pt: "sondagens concluídas", ru: "завершённых опросов", ch: "已完成的调查", hi: "पूर्ण सर्वेक्षण", ar: "استطلاعات مكتملة" },
  activeSectionTitle: { fr: "Sondages en cours", en: "Active surveys", es: "Encuestas en curso", de: "Laufende Umfragen", pt: "Sondagens em curso", ru: "Текущие опросы", ch: "进行中的调查", hi: "चल रहे सर्वेक्षण", ar: "الاستطلاعات الجارية" },
  activeSectionSub: { fr: "Votre avis facon\u0327ne le futur de SOS-Expat", en: "Your opinion shapes the future of SOS-Expat", es: "Tu opinión moldea el futuro de SOS-Expat", de: "Ihre Meinung gestaltet die Zukunft von SOS-Expat", pt: "A sua opinião molda o futuro do SOS-Expat", ru: "Ваше мнение формирует будущее SOS-Expat", ch: "您的意见塑造SOS-Expat的未来", hi: "आपकी राय SOS-Expat का भविष्य आकार देती है", ar: "رأيك يُشكّل مستقبل SOS-Expat" },
  participate: { fr: "Participer", en: "Participate", es: "Participar", de: "Teilnehmen", pt: "Participar", ru: "Участвовать", ch: "参与", hi: "भाग लें", ar: "شارك" },
  daysLeft: { fr: "jours restants", en: "days left", es: "días restantes", de: "Tage verbleibend", pt: "dias restantes", ru: "дней осталось", ch: "剩余天数", hi: "दिन शेष", ar: "أيام متبقية" },
  votes: { fr: "participants", en: "participants", es: "participantes", de: "Teilnehmer", pt: "participantes", ru: "участников", ch: "参与者", hi: "प्रतिभागी", ar: "مشاركون" },
  completedSectionTitle: { fr: "Resultats des sondages passes", en: "Past survey results", es: "Resultados de encuestas pasadas", de: "Ergebnisse vergangener Umfragen", pt: "Resultados das sondagens anteriores", ru: "Результаты прошедших опросов", ch: "往期调查结果", hi: "पिछले सर्वेक्षणों के परिणाम", ar: "نتائج الاستطلاعات السابقة" },
  completedSectionSub: { fr: "Decouvrez ce que la communaute a repondu", en: "Discover what the community answered", es: "Descubre lo que respondió la comunidad", de: "Entdecken Sie, was die Community geantwortet hat", pt: "Descubra o que a comunidade respondeu", ru: "Узнайте, что ответило сообщество", ch: "了解社区的回答", hi: "जानें कि समुदाय ने क्या उत्तर दिया", ar: "اكتشف ما أجابت به المجتمع" },
  seeResults: { fr: "Voir les resultats", en: "See results", es: "Ver resultados", de: "Ergebnisse ansehen", pt: "Ver resultados", ru: "Посмотреть результаты", ch: "查看结果", hi: "परिणाम देखें", ar: "عرض النتائج" },
  totalVotes: { fr: "reponses", en: "responses", es: "respuestas", de: "Antworten", pt: "respostas", ru: "ответов", ch: "回复数", hi: "जवाब", ar: "إجابات" },
  completedOn: { fr: "Termine le", en: "Completed", es: "Finalizado el", de: "Abgeschlossen am", pt: "Concluído a", ru: "Завершён", ch: "完成于", hi: "पूर्ण तिथि", ar: "اكتمل في" },
  emptyActive: { fr: "Aucun sondage actif pour le moment.", en: "No active surveys at the moment.", es: "No hay encuestas activas por el momento.", de: "Derzeit keine aktiven Umfragen.", pt: "Nenhuma sondagem ativa de momento.", ru: "На данный момент нет активных опросов.", ch: "目前暂无进行中的调查。", hi: "अभी कोई सक्रिय सर्वेक्षण नहीं है।", ar: "لا توجد استطلاعات نشطة في الوقت الحالي." },
  emptyCompleted: { fr: "Aucun sondage termine.", en: "No completed surveys yet.", es: "Aún no hay encuestas completadas.", de: "Noch keine abgeschlossenen Umfragen.", pt: "Ainda não há sondagens concluídas.", ru: "Завершённых опросов пока нет.", ch: "暂无已完成的调查。", hi: "अभी तक कोई पूर्ण सर्वेक्षण नहीं है।", ar: "لا توجد استطلاعات مكتملة بعد." },
  ctaTitle: { fr: "Vous avez une idee de sondage ?", en: "Have a survey idea?", es: "¿Tienes una idea de encuesta?", de: "Haben Sie eine Idee für eine Umfrage?", pt: "Tem uma ideia de sondagem?", ru: "Есть идея для опроса?", ch: "有调查建议吗？", hi: "क्या आपके पास सर्वेक्षण का कोई विचार है?", ar: "هل لديك فكرة لاستطلاع؟" },
  ctaSub: { fr: "Proposez un sujet qui vous tient a coeur et contribuez a notre communaute.", en: "Suggest a topic you care about and contribute to our community.", es: "Sugiere un tema que te importe y contribuye a nuestra comunidad.", de: "Schlagen Sie ein Thema vor, das Ihnen am Herzen liegt, und tragen Sie zu unserer Community bei.", pt: "Sugira um tema que lhe importa e contribua para a nossa comunidade.", ru: "Предложите тему, которая вам важна, и внесите вклад в наше сообщество.", ch: "提出您关心的话题，为我们的社区做出贡献。", hi: "कोई ऐसा विषय सुझाएं जो आपके दिल के करीब हो और हमारे समुदाय में योगदान दें।", ar: "اقترح موضوعاً يهمك وساهم في مجتمعنا." },
  ctaButton: { fr: "Proposer un sondage", en: "Suggest a survey", es: "Proponer una encuesta", de: "Umfrage vorschlagen", pt: "Sugerir uma sondagem", ru: "Предложить опрос", ch: "提交调查建议", hi: "सर्वेक्षण सुझाएं", ar: "اقترح استطلاعاً" },
  seoTitle: { fr: "Sondages Expatries | SOS-Expat", en: "Expat Surveys | SOS-Expat", es: "Encuestas para Expatriados | SOS-Expat", de: "Expat-Umfragen | SOS-Expat", pt: "Sondagens para Expatriados | SOS-Expat", ru: "Опросы для экспатов | SOS-Expat", ch: "外籍人士调查 | SOS-Expat", hi: "प्रवासी सर्वेक्षण | SOS-Expat", ar: "استطلاعات المغتربين | SOS-Expat" },
  seoDesc: { fr: "Participez aux sondages SOS-Expat sur la vie d'expatrie, le droit international et les destinations. Donnez votre avis et aidez des milliers d'expatries dans le monde entier.", en: "Take part in SOS-Expat surveys on expat life, international law and top destinations. Share your opinion and help thousands of expats around the world make better decisions.", es: "Participa en las encuestas de SOS-Expat sobre la vida del expatriado, el derecho internacional y los mejores destinos. Da tu opinión y ayuda a miles de expatriados en todo el mundo.", de: "Nehmen Sie an SOS-Expat-Umfragen zu Expat-Leben, internationalem Recht und Top-Destinationen teil. Teilen Sie Ihre Meinung und helfen Sie tausenden Expats weltweit.", pt: "Participe nos sondagens SOS-Expat sobre a vida de expatriado, direito internacional e os melhores destinos. Dê a sua opinião e ajude milhares de expatriados em todo o mundo.", ru: "Участвуйте в опросах SOS-Expat о жизни экспатов, международном праве и лучших направлениях. Делитесь своим мнением и помогайте тысячам экспатов по всему миру.", ch: "参与SOS-Expat关于外籍人士生活、国际法及热门目的地的调查。分享您的看法，帮助全球数千名外籍人士做出更明智的决策。", hi: "SOS-Expat के प्रवासी जीवन, अंतर्राष्ट्रीय कानून और शीर्ष गंतव्यों पर सर्वेक्षणों में भाग लें। अपनी राय दें और दुनिया भर के हज़ारों प्रवासियों को बेहतर निर्णय लेने में मदद करें।", ar: "شارك في استطلاعات SOS-Expat حول حياة المغتربين والقانون الدولي والوجهات المفضلة. شارك برأيك وساعد آلاف المغتربين حول العالم على اتخاذ قرارات أفضل." },
  home: { fr: "Accueil", en: "Home", es: "Inicio", de: "Startseite", pt: "Início", ru: "Главная", ch: "首页", hi: "होम", ar: "الرئيسية" },
  breadcrumbLabel: { fr: "Sondages", en: "Surveys", es: "Encuestas", de: "Umfragen", pt: "Sondagens", ru: "Опросы", ch: "调查问卷", hi: "सर्वेक्षण", ar: "الاستطلاعات" },
  faqTitle: { fr: "Questions fréquentes sur les sondages", en: "Frequently asked questions about surveys", es: "Preguntas frecuentes sobre encuestas", de: "Häufig gestellte Fragen zu Umfragen", pt: "Perguntas frequentes sobre sondagens", ru: "Часто задаваемые вопросы об опросах", ch: "关于调查的常见问题", hi: "सर्वेक्षणों के बारे में सामान्य प्रश्न", ar: "أسئلة شائعة حول الاستطلاعات" },
  "faq1.q": { fr: "Qui peut participer aux sondages SOS-Expat ?", en: "Who can participate in SOS-Expat surveys?", es: "¿Quién puede participar en las encuestas de SOS-Expat?", de: "Wer kann an SOS-Expat-Umfragen teilnehmen?", pt: "Quem pode participar nas sondagens SOS-Expat?", ru: "Кто может участвовать в опросах SOS-Expat?", ch: "谁可以参与SOS-Expat的调查？", hi: "SOS-Expat सर्वेक्षणों में कौन भाग ले सकता है?", ar: "من يمكنه المشاركة في استطلاعات SOS-Expat؟" },
  "faq1.a": { fr: "Tous les utilisateurs peuvent participer aux sondages SOS-Expat, qu'ils soient expatriés, en cours d'expatriation ou simplement intéressés par les questions de mobilité internationale. L'inscription est gratuite et facultative.", en: "All users can participate in SOS-Expat surveys, whether they are expats, planning to expatriate, or simply interested in international mobility questions. Registration is free and optional.", es: "Todos los usuarios pueden participar en las encuestas de SOS-Expat, ya sean expatriados, en proceso de expatriación o simplemente interesados en cuestiones de movilidad internacional.", de: "Alle Nutzer können an SOS-Expat-Umfragen teilnehmen, ob Expats, Auswanderungswillige oder an internationaler Mobilität Interessierte.", pt: "Todos os utilizadores podem participar nas sondagens SOS-Expat, sejam expatriados, em processo de expatriação ou simplesmente interessados em questões de mobilidade internacional.", ru: "Все пользователи могут участвовать в опросах SOS-Expat — экспаты, планирующие эмиграцию или просто интересующиеся международной мобильностью.", ch: "所有用户都可以参与SOS-Expat的调查，无论是外籍人士、正在计划移居的人，还是对国际流动问题感兴趣的人。", hi: "सभी उपयोगकर्ता SOS-Expat सर्वेक्षणों में भाग ले सकते हैं, चाहे वे प्रवासी हों, प्रवास की योजना बना रहे हों, या अंतर्राष्ट्रीय गतिशीलता के प्रश्नों में रुचि रखते हों।", ar: "يمكن لجميع المستخدمين المشاركة في استطلاعات SOS-Expat، سواء أكانوا مغتربين أم يخططون للهجرة أم مهتمين بقضايا التنقل الدولي." },
  "faq2.q": { fr: "Les résultats des sondages sont-ils publics ?", en: "Are survey results public?", es: "¿Son públicos los resultados de las encuestas?", de: "Sind die Umfrageergebnisse öffentlich?", pt: "Os resultados das sondagens são públicos?", ru: "Являются ли результаты опросов общедоступными?", ch: "调查结果是公开的吗？", hi: "क्या सर्वेक्षण परिणाम सार्वजनिक हैं?", ar: "هل نتائج الاستطلاعات عامة؟" },
  "faq2.a": { fr: "Oui, les résultats de tous les sondages terminés sont accessibles à tous sur la page des sondages SOS-Expat. Vous pouvez voir les statistiques détaillées, les tendances et les analyses par pays ou profil d'expatrié.", en: "Yes, results of all completed surveys are accessible to everyone on the SOS-Expat surveys page. You can see detailed statistics, trends and analyses by country or expat profile.", es: "Sí, los resultados de todas las encuestas completadas son accesibles para todos en la página de encuestas de SOS-Expat.", de: "Ja, die Ergebnisse aller abgeschlossenen Umfragen sind für alle auf der SOS-Expat-Umfrageseite zugänglich.", pt: "Sim, os resultados de todas as sondagens concluídas são acessíveis a todos na página de sondagens SOS-Expat.", ru: "Да, результаты всех завершённых опросов доступны всем на странице опросов SOS-Expat.", ch: "是的，所有已完成调查的结果都可以在SOS-Expat调查页面上访问，可查看详细统计数据、趋势和分析。", hi: "हां, सभी पूर्ण सर्वेक्षणों के परिणाम SOS-Expat सर्वेक्षण पृष्ठ पर सभी के लिए उपलब्ध हैं।", ar: "نعم، نتائج جميع الاستطلاعات المكتملة متاحة للجميع على صفحة استطلاعات SOS-Expat." },
  "faq3.q": { fr: "Comment sont créés les sondages SOS-Expat ?", en: "How are SOS-Expat surveys created?", es: "¿Cómo se crean las encuestas de SOS-Expat?", de: "Wie werden SOS-Expat-Umfragen erstellt?", pt: "Como são criadas as sondagens SOS-Expat?", ru: "Как создаются опросы SOS-Expat?", ch: "SOS-Expat的调查是如何创建的？", hi: "SOS-Expat सर्वेक्षण कैसे बनाए जाते हैं?", ar: "كيف يتم إنشاء استطلاعات SOS-Expat؟" },
  "faq3.a": { fr: "Les sondages sont créés par notre équipe éditoriale en collaboration avec des experts en droit de l'expatriation, des conseillers en mobilité internationale et notre communauté d'expatriés. Vous pouvez également proposer un sujet de sondage via le formulaire de contact.", en: "Surveys are created by our editorial team in collaboration with expat law experts, international mobility advisors and our expat community. You can also suggest a survey topic via the contact form.", es: "Las encuestas son creadas por nuestro equipo editorial en colaboración con expertos en derecho de expatriación, asesores de movilidad internacional y nuestra comunidad de expatriados.", de: "Umfragen werden von unserem Redaktionsteam in Zusammenarbeit mit Experten für Auswanderungsrecht, Beratern für internationale Mobilität und unserer Expat-Community erstellt.", pt: "As sondagens são criadas pela nossa equipa editorial em colaboração com especialistas em direito de expatriação, consultores de mobilidade internacional e a nossa comunidade de expatriados.", ru: "Опросы создаются нашей редакционной командой совместно с экспертами в области права об эмиграции, консультантами по международной мобильности и нашим сообществом экспатов.", ch: "调查由我们的编辑团队与移居法律专家、国际流动顾问和我们的外籍人士社区合作创建。", hi: "सर्वेक्षण हमारी संपादकीय टीम द्वारा प्रवासी कानून विशेषज्ञों, अंतर्राष्ट्रीय गतिशीलता सलाहकारों और हमारे प्रवासी समुदाय के सहयोग से बनाए जाते हैं।", ar: "تُنشأ الاستطلاعات من قِبل فريقنا التحريري بالتعاون مع خبراء في قانون الهجرة ومستشاري التنقل الدولي ومجتمع المغتربين لدينا." },
  "faq4.q": { fr: "Puis-je proposer un sujet de sondage ?", en: "Can I suggest a survey topic?", es: "¿Puedo sugerir un tema de encuesta?", de: "Kann ich ein Umfragethema vorschlagen?", pt: "Posso sugerir um tema de sondagem?", ru: "Могу ли я предложить тему для опроса?", ch: "我可以建议调查主题吗？", hi: "क्या मैं कोई सर्वेक्षण विषय सुझा सकता हूं?", ar: "هل يمكنني اقتراح موضوع استطلاع؟" },
  "faq4.a": { fr: "Oui ! Nous accueillons les suggestions de sujets de sondage de notre communauté. Utilisez le bouton 'Proposer un sondage' en bas de page pour soumettre votre idée. Les meilleures suggestions sont intégrées dans notre calendrier éditorial.", en: "Yes! We welcome survey topic suggestions from our community. Use the 'Suggest a survey' button at the bottom of the page to submit your idea. The best suggestions are incorporated into our editorial calendar.", es: "¡Sí! Damos la bienvenida a sugerencias de temas de encuesta de nuestra comunidad. Usa el botón 'Proponer una encuesta' al final de la página para enviar tu idea.", de: "Ja! Wir begrüßen Vorschläge für Umfragethemen aus unserer Community. Nutzen Sie die Schaltfläche 'Umfrage vorschlagen' am Ende der Seite.", pt: "Sim! Recebemos sugestões de temas de sondagem da nossa comunidade. Use o botão 'Sugerir uma sondagem' no final da página para enviar a sua ideia.", ru: "Да! Мы приветствуем предложения тем для опросов от нашего сообщества. Нажмите кнопку 'Предложить опрос' внизу страницы.", ch: "是的！我们欢迎社区提出调查主题建议。使用页面底部的'提交调查建议'按钮提交您的想法。", hi: "हां! हम अपने समुदाय से सर्वेक्षण विषय सुझाव स्वागत करते हैं। अपना विचार सबमिट करने के लिए पृष्ठ के निचले भाग में 'सर्वेक्षण सुझाएं' बटन का उपयोग करें।", ar: "نعم! نرحب باقتراحات موضوعات الاستطلاع من مجتمعنا. استخدم زر 'اقترح استطلاعاً' في أسفل الصفحة لتقديم فكرتك." },
};

const t = (key: string, lang: string) => T[key]?.[lang] || T[key]?.fr || key;

/* ------------------------------------------------------------------ */
/*  Types & API                                                        */
/* ------------------------------------------------------------------ */

const BLOG_API = "https://blog.life-expat.com/api/v1/public";

// Segments blog (correspondent aux routes Laravel proxifiées par le Worker)
const EXPAT_SEGMENT: Record<string, string> = {
  fr: "sondages-expatries", en: "expat-surveys", es: "encuestas-expatriados",
  de: "expat-umfragen", pt: "pesquisas-expatriados", ru: "oprosy-expatov",
  zh: "expat-diaocha", ch: "expat-diaocha", hi: "pravasi-sarvekshan", ar: "istitalaat-mughtaribeen",
};
const VACANCIER_SEGMENT: Record<string, string> = {
  fr: "sondages-vacanciers", en: "holiday-surveys", es: "encuestas-vacaciones",
  de: "urlaubsumfragen", pt: "pesquisas-ferias", ru: "oprosy-otpusk",
  zh: "jiaqi-diaocha", ch: "jiaqi-diaocha", hi: "chhutti-sarvekshan", ar: "istitalaat-ijaza",
};
const LANG_LOCALE: Record<string, string> = {
  fr: "fr-fr", en: "en-us", es: "es-es", de: "de-de",
  ru: "ru-ru", pt: "pt-pt", zh: "zh-cn", ch: "zh-cn", hi: "hi-in", ar: "ar-sa",
};

// URL sur sos-expat.com — Worker proxifie vers le blog
function sondageUrl(lang: string, slug: string, type: string, localeSlug: string): string {
  const seg = type === "vacancier"
    ? (VACANCIER_SEGMENT[lang] ?? "sondages-vacanciers")
    : (EXPAT_SEGMENT[lang] ?? "sondages-expatries");
  return `/${localeSlug}/${seg}/${slug}`;
}

// Flat interface used internally
interface Sondage {
  id: number;
  external_id: string;
  type: string;
  slug: string;
  title: string;
  description: string;
  status: "active" | "closed";
  closes_at: string | null;
  published_at: string | null;
  responses_count: number;
}

// Raw shape returned by the API (fields nested under translation)
interface RawSondage {
  id: number;
  external_id: string;
  type?: string;
  status: "active" | "closed";
  closes_at: string | null;
  published_at: string | null;
  responses_count: number;
  translation?: { title: string; slug: string; description: string };
  // legacy flat fallback fields
  title?: string;
  slug?: string;
  description?: string;
}

function normalizeSondage(raw: RawSondage): Sondage {
  return {
    id:              raw.id,
    external_id:     raw.external_id,
    type:            raw.type ?? "expat",
    slug:            raw.translation?.slug        ?? raw.slug        ?? "",
    title:           raw.translation?.title       ?? raw.title       ?? "",
    description:     raw.translation?.description ?? raw.description ?? "",
    status:          raw.status,
    closes_at:       raw.closes_at    ?? null,
    published_at:    raw.published_at ?? null,
    responses_count: raw.responses_count ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers & Animations                                               */
/* ------------------------------------------------------------------ */

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const SondagesListing: React.FC = () => {
  const location = useLocation();
  const { language } = useApp();
  const lang = (language || parseLocaleFromPath(location.pathname)?.lang || "fr") as string;
  const localeSlug = location.pathname.match(/^\/([a-z]{2}-[a-z]{2})/)?.[1] ?? "fr-fr";
  const _urlLang = lang === "ch" ? "zh" : lang;
  const _localeRegion: Record<string, string> = { fr:"fr", en:"us", es:"es", de:"de", ru:"ru", pt:"pt", ch:"cn", hi:"in", ar:"sa" };
  const canonical = `https://sos-expat.com/${_urlLang}-${_localeRegion[lang] ?? lang}/${getTranslatedRouteSlug("sondages-listing" as any, lang as any) || "nos-sondages"}`;

  const [activeSurveys, setActiveSurveys]       = useState<Sondage[]>([]);
  const [completedSurveys, setCompletedSurveys] = useState<Sondage[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [openFaq, setOpenFaq]                   = useState<number | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    Promise.all([
      fetch(`${BLOG_API}/sondages?lang=${lang}&status=active`,  { signal: ctrl.signal, headers: { Accept: "application/json" } }).then(r => r.json()),
      fetch(`${BLOG_API}/sondages?lang=${lang}&status=closed`,  { signal: ctrl.signal, headers: { Accept: "application/json" } }).then(r => r.json()),
    ])
      .then(([activeRes, closedRes]) => {
        // API returns a raw array [], not { data: [] } — handle both shapes
        const activeRaw: RawSondage[]  = Array.isArray(activeRes)  ? activeRes  : (activeRes.data  ?? []);
        const closedRaw: RawSondage[]  = Array.isArray(closedRes)  ? closedRes  : (closedRes.data  ?? []);
        setActiveSurveys(activeRaw.map(normalizeSondage));
        setCompletedSurveys(closedRaw.map(normalizeSondage));
      })
      .catch(() => {/* network error → empty state */})
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [lang]);

  const totalParticipants = [...activeSurveys, ...completedSurveys]
    .reduce((sum, s) => sum + (s.responses_count ?? 0), 0);

  return (
    <Layout>
      <SEOHead title={t("seoTitle", lang)} description={t("seoDesc", lang)} canonicalUrl={canonical} ogType="website" />
      <BreadcrumbSchema items={[
        { name: t("home", lang), url: `/${localeSlug}` },
        { name: t("breadcrumbLabel", lang) },
      ]} />
      <FAQPageSchema
        faqs={[1,2,3,4].map(i => ({
          question: t(`faq${i}.q`, lang),
          answer: t(`faq${i}.a`, lang),
        }))}
        pageUrl={canonical}
        inLanguage={lang === "ch" ? "zh" : lang}
      />

      {/* ── BREADCRUMB VISUEL ── */}
      <nav aria-label="breadcrumb" className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <li>
              <a href={`/${localeSlug}`} className="hover:text-red-600 transition-colors">
                {t("home", lang)}
              </a>
            </li>
            <li><ChevronRight size={14} className="text-gray-300 shrink-0" /></li>
            <li className="text-gray-900 font-medium">{t("breadcrumbLabel", lang)}</li>
          </ol>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16 pb-12 sm:pt-28 sm:pb-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-600/30 bg-red-600/10 px-5 py-1.5 text-sm font-semibold text-red-400"
          >
            <Vote className="h-4 w-4" />
            {t("badge", lang)}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            {t("heroTitle", lang)}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mx-auto mt-5 max-w-2xl text-lg text-slate-400"
          >
            {t("heroSubtitle", lang)}
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-8 sm:gap-14"
          >
            {[
              { value: loading ? "…" : activeSurveys.length,    label: t("statActive", lang),       icon: BarChart3 },
              { value: loading ? "…" : totalParticipants || "—", label: t("statParticipants", lang), icon: Users },
              { value: loading ? "…" : completedSurveys.length, label: t("statCompleted", lang),     icon: CheckCircle2 },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-left">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/15">
                  <s.icon className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-sm text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ========== ACTIVE SURVEYS ========== */}
      <section className="bg-white py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp} custom={0}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {t("activeSectionTitle", lang)}
            </h2>
            <p className="mt-3 text-slate-500">{t("activeSectionSub", lang)}</p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            </div>
          ) : activeSurveys.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-12 text-center text-slate-400"
            >
              {t("emptyActive", lang)}
            </motion.p>
          ) : (
            <motion.div
              initial="hidden" whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={stagger}
              className="grid gap-6 sm:grid-cols-2"
            >
              {activeSurveys.map((survey, idx) => {
                const days   = daysUntil(survey.closes_at);
                const urgent = days > 0 && days <= 3;
                return (
                  <motion.div
                    key={survey.id}
                    variants={fadeUp} custom={idx}
                    className={`group relative flex flex-col rounded-2xl border bg-white p-6 shadow-md transition-shadow hover:shadow-xl ${
                      urgent ? "border-red-400" : "border-slate-200"
                    }`}
                    style={{ borderTopWidth: "4px", borderTopColor: "#DC2626" }}
                  >
                    <h3 className="text-lg font-bold text-slate-900">{survey.title}</h3>
                    {survey.description && (
                      <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-3">
                        {survey.description}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      {survey.closes_at && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span className={urgent ? "font-semibold text-red-600" : ""}>
                            {days} {t("daysLeft", lang)}
                          </span>
                        </span>
                      )}
                      {survey.responses_count > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {survey.responses_count} {t("votes", lang)}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto pt-5">
                      <a
                        href={sondageUrl(lang, survey.slug, survey.type, localeSlug)}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all hover:bg-red-700 hover:shadow-red-600/30 active:scale-[0.97]"
                      >
                        {t("participate", lang)}
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* ========== COMPLETED SURVEYS ========== */}
      {(loading || completedSurveys.length > 0) && (
        <section className="bg-slate-50 py-12 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <motion.div
              initial="hidden" whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeUp} custom={0}
              className="mb-12 text-center"
            >
              <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                {t("completedSectionTitle", lang)}
              </h2>
              <p className="mt-3 text-slate-500">{t("completedSectionSub", lang)}</p>
            </motion.div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
              </div>
            ) : (
              <motion.div
                initial="hidden" whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
                variants={stagger}
                className="grid gap-6 sm:grid-cols-2"
              >
                {completedSurveys.map((survey, idx) => (
                  <motion.div
                    key={survey.id}
                    variants={fadeUp} custom={idx}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
                  >
                    <h3 className="text-lg font-bold text-slate-900">{survey.title}</h3>
                    {survey.description && (
                      <p className="mt-2 text-sm text-slate-500 line-clamp-3">{survey.description}</p>
                    )}
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
                      {survey.responses_count > 0 && (
                        <span>{survey.responses_count.toLocaleString()} {t("totalVotes", lang)}</span>
                      )}
                      {survey.closes_at && (
                        <span>
                          {t("completedOn", lang)}{" "}
                          {new Date(survey.closes_at).toLocaleDateString(
                            lang === "fr" ? "fr-FR" : "en-US"
                          )}
                        </span>
                      )}
                    </div>
                    <a
                      href={sondageUrl(lang, survey.slug, survey.type, localeSlug)}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 transition-colors hover:text-red-700"
                    >
                      {t("seeResults", lang)}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ========== CTA ========== */}
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 sm:py-20">
        <motion.div
          initial="hidden" whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp} custom={0}
          className="mx-auto max-w-3xl px-4 text-center"
        >
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/15">
            <MessageSquarePlus className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            {t("ctaTitle", lang)}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">{t("ctaSub", lang)}</p>
          <a
            href="/contact"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition-all hover:bg-red-700 hover:shadow-red-600/35 active:scale-[0.97]"
          >
            {t("ctaButton", lang)}
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
      </section>

      <style>{`
        @keyframes pulseBorder {
          0%, 100% { border-color: #f87171; box-shadow: 0 0 0 0 rgba(220,38,38,0.15); }
          50% { border-color: #dc2626; box-shadow: 0 0 12px 2px rgba(220,38,38,0.2); }
        }
        .animate-pulse-border { animation: pulseBorder 2s ease-in-out infinite; }
      `}</style>

      {/* ── FAQ ── */}
      <section className="bg-white py-14 border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">{t("faqTitle", lang)}</h2>
          <div className="space-y-3">
            {[1,2,3,4].map((i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="text-sm font-medium text-gray-900">{t(`faq${i}.q`, lang)}</span>
                    <ChevronRight className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                  {isOpen && (
                    <p className="px-5 pb-4 text-sm leading-relaxed text-gray-600">
                      {t(`faq${i}.a`, lang)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ContentSectionLinks currentSection="sondages-listing" lang={lang} localeSlug={localeSlug} />
    </Layout>
  );
};

export default SondagesListing;
