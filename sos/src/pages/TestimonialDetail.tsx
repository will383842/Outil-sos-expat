import React, { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useLocaleNavigate } from "../multilingual-system";
import {
  Star,
  MapPin,
  Calendar,
  ArrowLeft,
  Share2,
  Facebook,
  Mail,
  Briefcase,
  User,
  Check,
  Clock,
  Shield,
  Globe,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import { useApp } from "../contexts/AppContext";
import { useIntl } from "react-intl";
import { createMockReviewsData, Review } from "@/constants/testimonials";
import { getAllReviews } from "../utils/firestore";
import { getDateLocale, getCountryName as getCountryNameFromCode } from "../utils/formatters";

interface TestimonialData {
  id: string;
  name: string;
  type: "lawyer" | "expat";
  country: string;
  language: "francophone" | "anglophone";
  rating: number;
  date: string;
  title: {
    fr: string;
    en: string;
    es: string;
    de: string;
    ru: string;
    hi: string;
    ch: string;
    pt: string;
    ar: string;
  };
  fullContent: {
    fr: string;
    en: string;
    es: string;
    de: string;
    ru: string;
    hi: string;
    ch: string;
    pt: string;
    ar: string;
  };
  avatar: string;
  verified: boolean;
  serviceUsed: {
    fr: string;
    en: string;
    es: string;
    de: string;
    ru: string;
    hi: string;
    ch: string;
    pt: string;
    ar: string;
  };
  duration: string;
  helpType: {
    fr: string[];
    en: string[];
    es: string[];
    de: string[];
    ru: string[];
    hi: string[];
    ch: string[];
    pt: string[];
    ar: string[];
  };
  year: number;
}

// ✅ DONNÉES HARMONISÉES AVEC TESTIMONIALS.TSX

// const TESTIMONIALS_DATA: Record<string, TestimonialData> = {
//   "1": {
//     id: "1",
//     name: "Aisha M.",
//     type: "expat",
//     country: "Thaïlande",
//     language: "francophone",
//     rating: 5,
//     date: "2025-10-05",
//     year: 2025,
//     title: {
//       fr: "Service exceptionnel en Thaïlande",
//       en: "Exceptional Service in Thailand",
//       es: "Servicio excepcional en Tailandia",
//       de: "Außergewöhnlicher Service in Thailand",
//       ru: "Исключительный сервис в Таиланде",
//       hi: "थाईलैंड में असाधारण सेवा",
//       ch: "泰国卓越服务",
//       pt: "Serviço excepcional na Tailândia",
//         ar: "خدمة استثنائية في تايلاند"

//     },
//     fullContent: {
//       fr: "Incroyable ! En 3 minutes j'avais un expatrié français au bout du fil depuis Bangkok. Il m'a expliqué toute la procédure visa Thaïlandais, les pièges à éviter et m'a même donné les contacts de son agent immobilier. Service qui change la vie !",
//       en: "Incredible! In 3 minutes I had a French expat on the phone from Bangkok. He explained the entire Thai visa procedure, pitfalls to avoid, and even gave me his real estate agent's contacts. Life-changing service!",
//       es: "¡Increíble! En 3 minutos tenía un expatriado francés al teléfono desde Bangkok. Me explicó todo el procedimiento de visa tailandesa, las trampas a evitar e incluso me dio los contactos de su agente inmobiliario. ¡Servicio que cambia la vida!",
//       de: "Unglaublich! In 3 Minuten hatte ich einen französischen Expat am Telefon aus Bangkok. Er erklärte mir das gesamte thailändische Visumverfahren, Fallstricke, die es zu vermeiden gilt, und gab mir sogar die Kontakte seines Immobilienmaklers. Lebensverändernder Service!",
//       ru: "Невероятно! За 3 минуты я связался с французским экспатом по телефону из Бангкока. Он объяснил всю процедуру получения тайской визы, подводные камни, которых следует избегать, и даже дал контакты своего агента по недвижимости. Сервис, меняющий жизнь!",
//       hi: "अविश्वसनीय! 3 मिनट में मेरे पास बैंकॉक से फोन पर एक फ्रांसीसी प्रवासी था। उन्होंने थाई वीजा प्रक्रिया, बचने योग्य नुकसान की पूरी व्याख्या की और यहां तक कि अपने रियल एस्टेट एजेंट के संपर्क भी दिए। जीवन बदलने वाली सेवा!",
//       ch: "太棒了！短短三分钟，我就联系上了一位身在曼谷的法国侨民。他详细地给我讲解了整个泰国签证流程，包括需要避免的陷阱，甚至还给了我他房产经纪人的联系方式。这项服务简直改变了我的人生！",
//       pt: "Incrível! Em 3 minutos eu tinha um expatriado francês ao telefone desde Bangkok. Ele me explicou todo o procedimento de visto tailandês, as armadilhas a evitar e até me deu os contatos de seu corretor de imóveis. Serviço que muda vidas!",
//       ar: "لا يصدق! في 3 دقائق كان لدي مغترب فرنسي على الهاتف من بانكوك. شرح لي كامل إجراءات التأشيرة التايلاندية، المخاطر التي يجب تجنبها وأعطاني حتى جهات اتصال وكيله العقاري. خدمة تغير الحياة!"
//     },
//     avatar: "https://images.unsplash.com/photo-1643842730000-db266bbc1b28?q=80&w=400&h=400&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Expatrié",
//       en: "Expat Consultation",
//       es: "Consulta de Expatriado",
//       de: "Expat-Beratung",
//       ru: "Консультация эмигранта",
//       hi: "प्रवासी परामर्श",
//       ch: "外籍人士咨询",
//       pt: "Consulta de Expatriado",
//         ar: "استشارة مغترب"
//     },
//     duration: "30 min",
//     helpType: {
//       fr: ["Visa", "Immobilier", "Installation"],
//       en: ["Visa", "Real Estate", "Relocation"],
//       es: ["Visa", "Inmobiliaria", "Reubicación"],
//       de: ["Visum", "Immobilien", "Umzug"],
//       ru: ["Виза", "Недвижимость", "Переезд"],
//       hi: ["वीजा", "रियल एस्टेट", "स्थानांतरण"],
//       ch: ["签证", "房地产", "搬迁"],
//       pt: ["Visto", "Imobiliário", "Mudança"],
//       ar: ["تأشيرة", "عقارات", "التثبيت"]
//     },
//   },
//   "2": {
//     id: "2",
//     name: "Chen L.",
//     type: "expat",
//     country: "Canada",
//     language: "francophone",
//     rating: 5,
//     date: "2025-10-02",
//     year: 2025,
//     title: {
//       fr: "Installation à Vancouver facilitée",
//       en: "Vancouver Setup Made Easy",
//       es: "Instalación en Vancouver simplificada",
//       de: "Vancouver-Setup leicht gemacht",
//       ru: "Установка в Ванкувере упрощена",
//       hi: "वैंकूवर सेटअप आसान बनाया गया",
//       ch: "温哥华设置变得简单",
//       pt: "Instalação em Vancouver facilitada",
//       ar: "تثبيت في فانكوفر سهل"
//     },
//     fullContent: {
//       fr: "Génial ! L'expatrié m'a aidé avec mon installation à Vancouver. Banque, logement, assurance santé, transport... tout en 30 minutes ! Il connaissait tous les bons plans et m'a évité des mois de galère administrative.",
//       en: "Brilliant! The expat helped me with my Vancouver setup. Banking, housing, health insurance, transport... everything in 30 minutes! He knew all the insider tips and saved me months of administrative hassle.",
//       es: "¡Brillante! El expatriado me ayudó con mi instalación en Vancouver. Banco, vivienda, seguro de salud, transporte... ¡todo en 30 minutos! Conocía todos los trucos internos y me ahorró meses de problemas administrativos.",
//       de: "Großartig! Der Expat half mir bei meiner Vancouver-Einrichtung. Banking, Wohnung, Krankenversicherung, Transport... alles in 30 Minuten! Er kannte alle Insider-Tipps und sparte mir Monate administrativer Probleme.",
//       ru: "Блестяще! Эмигрант помог мне с установкой в Ванкувере. Банк, жилье, медицинское страхование, транспорт... все за 30 минут! Он знал все инсайдерские советы и спасил меня от месяцев административных хлопот.",
//       hi: "शानदार! प्रवासी ने मुझे वैंकूवर सेटअप में मदद की। बैंकिंग, आवास, स्वास्थ्य बीमा, परिवहन... सब कुछ 30 मिनट में! उन्हें सभी अंदरूनी सुझाव पता थे और मुझे महीनों की प्रशासनिक परेशानी से बचाया।",
//       ch: "太棒了！这位外籍人士帮我安顿好了在温哥华的一切。银行、住房、医疗保险、交通……所有事情30分钟就搞定了！他知道所有内幕消息，帮我省去了几个月的行政麻烦。",
//       pt: "Fantástico! O expatriado me ajudou com minha instalação em Vancouver. Banco, moradia, seguro de saúde, transporte... tudo em 30 minutos! Ele conhecia todas as dicas e me poupou meses de problemas administrativos.",
//       ar: "رائع! ساعدني المغترب في تثبيت أموري في فانكوفر. البنك والسكن والتأمين الصحي والنقل... كل شيء في 30 دقيقة! كان يعرف جميع الحيل الداخلية وأنقذني من أشهر من الإزعاج الإداري."
//     },
//     avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Expatrié",
//       en: "Expat Consultation",
//       es: "Consulta de Expatriado",
//       de: "Expat-Beratung",
//       ru: "Консультация эмигранта",
//       hi: "प्रवासी परामर्श",
//       ch: "外籍人士咨询",
//       pt: "Consulta de Expatriado",
//       ar: "استشارة مغترب"
//     },
//     duration: "30 min",
//     helpType: {
//       fr: ["Banque", "Logement", "Assurance"],
//       en: ["Banking", "Housing", "Insurance"],
//       es: ["Banco", "Vivienda", "Seguro"],
//       de: ["Banking", "Wohnung", "Versicherung"],
//       ru: ["Банк", "Жилье", "Страхование"],
//       hi: ["बैंकिंग", "आवास", "बीमा"],
//       ch: ["银行业", "住房", "保险"],
//       pt: ["Banco", "Moradia", "Seguro"],
//       ar: ["البنك", "السكن", "التأمين"]
//     },
//   },
//   "3": {
//     id: "3",
//     name: "Emma K.",
//     type: "expat",
//     country: "Australie",
//     language: "francophone",
//     rating: 4,
//     date: "2025-09-29",
//     year: 2025,
//     title: {
//       fr: "Conseils précieux pour Melbourne",
//       en: "Valuable Advice for Melbourne",
//       es: "Consejos valiosos para Melbourne",
//       de: "Wertvolle Tipps für Melbourne",
//       ru: "Ценные советы для Мельбурна",
//       hi: "मेलबर्न के लिए मूल्यवान सुझाव",
//       ch: "对墨尔本的宝贵建议",
//       pt: "Conselhos valiosos para Melbourne",
//       ar: "نصائح قيمة لملبورن"
//     },
//     fullContent: {
//       fr: "Super expérience ! Expatrié à Melbourne depuis 8 ans, il m'a donné tous les conseils pour mon working holiday visa. Écoles, quartiers, jobs... Une mine d'or d'informations pratiques !",
//       en: "Great experience! Expat in Melbourne for 8 years, he gave me all the advice for my working holiday visa. Schools, neighborhoods, jobs... A goldmine of practical information!",
//       es: "¡Gran experiencia! Expatriado en Melbourne durante 8 años, me dio todos los consejos para mi visa de vacaciones de trabajo. Escuelas, barrios, trabajos... ¡Una mina de información práctica!",
//       de: "Großartige Erfahrung! Expat in Melbourne seit 8 Jahren gab mir alle Tipps für mein Working-Holiday-Visum. Schulen, Viertel, Jobs... Eine Goldgrube praktischer Informationen!",
//       ru: "Отличный опыт! Эмигрант в Мельбурне уже 8 лет дал мне все советы для моей рабочей визы отпуска. Школы, районы, работа... Кладезь практической информации!",
//       hi: "शानदार अनुभव! मेलबर्न में 8 साल से प्रवासी, उन्होंने मुझे अपने वर्किंग होलिडे वीजा के लिए सभी सुझाव दिए। स्कूल, पड़ोस, नौकरियां... व्यावहारिक जानकारी का खजाना!",
//       ch: "非常棒的体验！我在墨尔本生活了8年，他为我的打工度假签证提供了所有建议。学校、社区、工作……简直是实用信息的宝库！",
//       pt: "Ótima experiência! Expatriado em Melbourne há 8 anos, ele me deu todos os conselhos para meu visto de trabalho e férias. Escolas, bairros, empregos... Uma mina de ouro de informações práticas!",
//        ar: "تجربة رائعة! المغترب الذي يعيش في ملبورن منذ 8 سنوات أعطاني كل النصائح: تأشيرة عطلة العمل، المدارس، الأحياء، الوظائف... كنز من المعلومات العملية!"
//     },
//     avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Expatrié",
//       en: "Expat Consultation",
//       es: "Consulta de Expatriado",
//       de: "Expat-Beratung",
//       ru: "Консультация эмигранта",
//       hi: "प्रवासी परामर्श",
//       ch: "外籍人士咨询",
//       pt: "Consulta de Expatriado",
//       ar: "استشارة مغترب"
//     },
//     duration: "25 min",
//     helpType: {
//       fr: ["Visa", "Emploi", "Quartiers"],
//       en: ["Visa", "Employment", "Neighborhoods"],
//       es: ["Visa", "Empleo", "Barrios"],
//       de: ["Visum", "Beschäftigung", "Viertel"],
//       ru: ["Виза", "Занятость", "Районы"],
//       hi: ["वीजा", "रोजगार", "पड़ोस"],
//       ch: ["签证","就业","社区"],
//       pt: ["Visto", "Emprego", "Bairros"],
//       ar: ["تأشيرة", "توظيف", "أحياء"]
//     },
//   },
//   "4": {
//     id: "4",
//     name: "Kwame A.",
//     type: "expat",
//     country: "Émirats Arabes Unis",
//     language: "francophone",
//     rating: 5,
//     date: "2025-09-25",
//     year: 2025,
//     title: {
//       fr: "Guide complet pour Dubaï",
//       en: "Complete Guide for Dubai",
//       es: "Guía completa para Dubái",
//       de: "Kompletter Leitfaden für Dubai",
//       ru: "Полное руководство для Дубая",
//       hi: "दुबई के लिए संपूर्ण गाइड",
//       ch: "迪拜完整指南",
//       pt: "Guia completo para Dubai",
//       ar: "دليل شامل لدبي"
//     },
//     fullContent: {
//       fr: "Excellent ! L'expatrié vivant à Dubaï depuis 5 ans m'a tout expliqué : visa, compte bancaire, logement, culture locale. Il m'a même mis en contact avec sa communauté d'expats français !",
//       en: "Excellent! The expat living in Dubai for 5 years explained everything: visa, bank account, housing, local culture. He even connected me with his French expat community!",
//       es: "¡Excelente! El expatriado que vive en Dubái desde hace 5 años me lo explicó todo: visa, cuenta bancaria, vivienda, cultura local. ¡Incluso me conectó con su comunidad de expatriados franceses!",
//       de: "Ausgezeichnet! Der Expat, der seit 5 Jahren in Dubai lebt, erklärte mir alles: Visum, Bankkonto, Wohnung, lokale Kultur. Er verband mich sogar mit seiner französischen Expat-Gemeinde!",
//       ru: "Отлично! Эмигрант, живущий в Дубае 5 лет, объяснил мне все: виза, банковский счет, жилье, местная культура. Он даже связал меня со своей французской общиной эмигрантов!",
//       hi: "उत्कृष्ट! दुबई में 5 साल से रहने वाले प्रवासी ने मुझे सब कुछ समझाया: वीजा, बैंक खाता, आवास, स्थानीय संस्कृति। वह मुझे अपने फ्रांसीसी प्रवासी समुदाय से भी जोड़ते हैं!",
//       ch: "太棒了！这位在迪拜生活了五年的外籍人士给我讲解了一切：签证、银行账户、住房、当地文化等等。他甚至还帮我联系了他的法国外籍人士社群！",
//       pt: "Excelente! O expatriado que vive em Dubai há 5 anos me explicou tudo: visto, conta bancária, moradia, cultura local. Ele até me conectou com sua comunidade de expatriados franceses!",
//       ar: "ممتاز! المغترب الذي يعيش في دبي منذ 5 سنوات شرح لي كل شيء: التأشيرة وفتح حساب بنكي والسكن والثقافة المحلية. حتى ربطني بمجتمع المغتربين الفرنسيين!"
//     },
//     avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Expatrié",
//       en: "Expat Consultation",
//       es: "Consulta de Expatriado",
//       de: "Expat-Beratung",
//       ru: "Консультация эмигранта",
//       hi: "प्रवासी परामर्श",
//       ch: "外籍人士咨询",
//       pt: "Consulta de Expatriado",
//       ar: "استشارة مغترب"
//     },
//     duration: "40 min",
//     helpType: {
//       fr: ["Visa", "Banque", "Réseau"],
//       en: ["Visa", "Banking", "Network"],
//       es: ["Visa", "Banco", "Red"],
//       de: ["Visum", "Banking", "Netzwerk"],
//       ru: ["Виза", "Банк", "Сеть"],
//       hi: ["वीजा", "बैंकिंग", "नेटवर्क"],
//       ch: ["签证", "银行业", "网络"],
//       pt: ["Visto", "Banco", "Rede"],
//       ar: ["تأشيرة", "بنوك", "شبكة"]
//     },
//   },
//   "5": {
//     id: "5",
//     name: "Yuki T.",
//     type: "expat",
//     country: "Japon",
//     language: "francophone",
//     rating: 5,
//     date: "2025-09-22",
//     year: 2025,
//     title: {
//       fr: "Aide rapide depuis Tokyo",
//       en: "Quick Help from Tokyo",
//       es: "Ayuda rápida desde Tokio",
//       de: "Schnelle Hilfe aus Tokio",
//       ru: "Быстрая помощь из Токио",
//       hi: "टोक्यो से तेजी से मदद",
//       ch: "来自东京的快速帮助",
//       pt: "Ajuda rápida de Tóquio",
//       ar: "مساعدة سريعة من طوكيو"
//     },
//     fullContent: {
//       fr: "Parfait ! En urgence depuis Tokyo, j'ai eu un expatrié en 2 minutes. Il m'a aidé avec la paperasse japonaise complexe et m'a orienté vers les bonnes administrations. Très rassurant !",
//       en: "Perfect! In urgent situation from Tokyo, I got an expat in 2 minutes. He helped me with complex Japanese paperwork and directed me to the right administrations. Very reassuring!",
//       es: "¡Perfecto! En situación urgente desde Tokio, obtuve un expatriado en 2 minutos. Me ayudó con trámites complejos de Japón y me dirigió a las administraciones correctas. ¡Muy tranquilizador!",
//       de: "Perfekt! In dringender Situation aus Tokio bekam ich in 2 Minuten einen Expat. Er half mir mit komplexen japanischen Unterlagen und wies mich auf die richtigen Behörden hin. Sehr beruhigend!",
//       ru: "Идеально! В срочной ситуации из Токио я получил эмигранта за 2 минуты. Он помог мне со сложной японской документацией и направил меня в правильные администрации. Очень обнадеживает!",
//       hi: "बिल्कुल सही! टोक्यो से जरूरी स्थिति में, मुझे 2 मिनट में एक प्रवासी मिला। उन्होंने मुझे जटिल जापानी कागजी कार्रवाई में मदद की और सही प्रशासन की ओर निर्देशित किया। बहुत आश्वस्त करने वाला!",
//       ch: "太好了！我当时身在东京，情况紧急，两分钟之内就联系到了一位外籍人士。他帮我处理了复杂的日本文件，并指引我去了正确的部门。真是太让人放心了！",
//       pt: "Perfeito! Em situação urgente de Tóquio, consegui um expatriado em 2 minutos. Ele me ajudou com a papelada japonesa complexa e me direcionou às administrações certas. Muito tranquilizador!",
//       ar: "مثالي! في حالة طارئة من طوكيو، حصلت على مغترب في دقيقتين. ساعدني مع الأوراق اليابانية المعقدة وأرشدني إلى الإدارات الصحيحة. مطمئن جداً!"
//     },
//     avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Expatrié",
//       en: "Expat Consultation",
//       es: "Consulta de Expatriado",
//       de: "Expat-Beratung",
//       ru: "Консультация эмигранта",
//       hi: "प्रवासी परामर्श",
//       ch: "外籍人士咨询",
//       pt: "Consulta de Expatriado",
//       ar: "استشارة مغترب"
//     },
//     duration: "20 min",
//     helpType: {
//       fr: ["Administration", "Documents", "Urgence"],
//       en: ["Administration", "Documents", "Emergency"],
//       es: ["Administración", "Documentos", "Emergencia"],
//       de: ["Verwaltung", "Dokumente", "Notfall"],
//       ru: ["Администрация", "Документы", "Чрезвычайная ситуация"],
//       hi: ["प्रशासन", "दस्तावेज़", "आपातकाल"],
//       ch: ["行政", "文件", "Emergency"],
//       pt: ["Administração", "Documentos", "Emergência"],
//       ar: ["إدارة", "وثائق", "طوارئ"]
//     },
//   },
//   "6": {
//     id: "6",
//     name: "Fatima R.",
//     type: "expat",
//     country: "Norvège",
//     language: "francophone",
//     rating: 4,
//     date: "2025-09-19",
//     year: 2025,
//     title: {
//       fr: "Conseils étudiants à Oslo",
//       en: "Student Tips in Oslo",
//       es: "Consejos para estudiantes en Oslo",
//       de: "Studentenratschläge in Oslo",
//       ru: "Студенческие советы в Осло",
//       hi: "ओस्लो में छात्र सुझाव",
//       ch: "奥斯陆学生小贴士",
//       pt: "Dicas para estudantes em Oslo",
//       ar: "نصائح للطلاب في أوسلو"
//     },
//     fullContent: {
//       fr: "Très utile ! L'expatrié français en Norvège m'a donné tous les tips pour Oslo : logement étudiant, jobs d'appoint, transports. Il m'a fait gagner un temps précieux pour mes études !",
//       en: "Very useful! The French expat in Norway gave me all the tips for Oslo: student housing, part-time jobs, transport. He saved me precious time for my studies!",
//       es: "¡Muy útil! El expatriado francés en Noruega me dio todos los consejos para Oslo: vivienda estudiantil, trabajos a tiempo parcial, transporte. ¡Me ahorró tiempo valioso para mis estudios!",
//       de: "Sehr nützlich! Der französische Expat in Norwegen gab mir alle Tipps für Oslo: Studentenwohnheim, Teilzeitarbeit, Transport. Er sparte mir kostbare Zeit für mein Studium!",
//       ru: "Очень полезно! Французский эмигрант в Норвегии дал мне все советы для Осло: студенческое жилье, подработки, транспорт. Он сэкономил мне драгоценное время на учебу!",
//       hi: "बहुत उपयोगी! नॉर्वे में फ्रांसीसी प्रवासी ने मुझे ओस्लो के लिए सभी सुझाव दिए: छात्र आवास, अंशकालिक नौकरियां, परिवहन। उन्होंने मुझे मेरी पढ़ाई के लिए कीमती समय बचाया!",
//       ch: "太有用了！那位在挪威的法国侨民给了我很多关于奥斯陆的建议：学生公寓、兼职工作、交通等等。他帮我节省了宝贵的学习时间！",
//       pt: "Muito útil! O expatriado francês na Noruega me deu todas as dicas para Oslo: moradia estudantil, trabalhos de meio período, transporte. Ele me economizou tempo precioso para meus estudos!",
//       ar: "مفيد جداً! المغترب الفرنسي في النرويج أعطاني كل النصائح لأوسلو: السكن الطلابي والعمل بدوام جزئي والنقل. وفر لي وقتاً قيماً للدراسة!"
//     },
//     avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Expatrié",
//       en: "Expat Consultation",
//       es: "Consulta de Expatriado",
//       de: "Expat-Beratung",
//       ru: "Консультация эмигранта",
//       hi: "प्रवासी परामर्श",
//       ch: "外籍人士咨询",
//       pt: "Consulta de Expatriado",
//       ar: "استشارة مغترب"
//     },
//     duration: "25 min",
//     helpType: {
//       fr: ["Logement", "Études", "Emploi"],
//       en: ["Housing", "Studies", "Employment"],
//       es: ["Vivienda", "Estudios", "Empleo"],
//       de: ["Wohnung", "Studium", "Beschäftigung"],
//       ru: ["Жилье", "Учеба", "Занятость"],
//       hi: ["आवास", "अध्ययन", "रोजगार"],
//       ch: ["住房", "研究", "就业"],
//       pt: ["Moradia", "Estudos", "Emprego"],
//       ar: ["سكن", "دراسات", "توظيف"]
//     },
//   },
//   "7": {
//     id: "7",
//     name: "Carlos M.",
//     type: "expat",
//     country: "Brésil",
//     language: "francophone",
//     rating: 5,
//     date: "2025-09-15",
//     year: 2025,
//     title: {
//       fr: "Installation familiale à São Paulo",
//       en: "Family Relocation to São Paulo",
//       es: "Reubicación familiar a São Paulo",
//       de: "Familienumsiedlung nach São Paulo",
//       ru: "Семейный переезд в Сан-Паулу",
//       hi: "सांव पाउलो में पारिवारिक पुनर्स्थापन",
//       ch: "家庭搬迁到圣保罗",
//       pt: "Mudança familiar para São Paulo",
//       ar: "انتقال عائلي إلى ساو باولو"
//     },
//     fullContent: {
//       fr: "Formidable ! Depuis le Brésil, l'expatrié m'a tout expliqué sur São Paulo : quartiers sûrs, carte de transports, meilleures écoles pour mes enfants. Une aide inestimable !",
//       en: "Wonderful! From Brazil, the expat explained everything about São Paulo: safe neighborhoods, transport cards, best schools for my children. Invaluable help!",
//       es: "¡Maravilloso! Desde Brasil, el expatriado me explicó todo sobre São Paulo: vecindarios seguros, tarjetas de transporte, mejores escuelas para mis hijos. ¡Ayuda invaluable!",
//       de: "Wunderbar! Aus Brasilien erklärte mir der Expat alles über São Paulo: sichere Viertel, Fahrkarten, beste Schulen für meine Kinder. Unschätzbare Hilfe!",
//       ru: "Чудесно! Из Бразилии эмигрант объяснил мне все о Сан-Паулу: безопасные районы, проездные билеты, лучшие школы для моих детей. Бесценная помощь!",
//       hi: "शानदार! ब्राजील से, प्रवासी ने मुझे सांव पाउलो के बारे में सब कुछ समझाया: सुरक्षित पड़ोस, परिवहन कार्ड, मेरे बच्चों के लिए सर्वोत्तम स्कूल। अमूल्य सहायता!",
//       ch: "太棒了！这位来自巴西的外国人详细地介绍了圣保罗的情况：安全的街区、交通卡、适合我孩子的好学校等等。真是帮了我大忙！",
//       pt: "Formidável! Do Brasil, o expatriado me explicou tudo sobre São Paulo: bairros seguros, cartão de transporte, melhores escolas para meus filhos. Ajuda inestimável!",
//       ar: "رائع! من البرازيل شرح لي المغترب كل شيء عن ساو باولو: الأحياء الآمنة وبطاقات النقل والمدارس الأفضل لأطفالي. مساعدة لا تقدر بثمن!"
//     },
//     avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Expatrié",
//       en: "Expat Consultation",
//       es: "Consulta de Expatriado",
//       de: "Expat-Beratung",
//       ru: "Консультация эмигранта",
//       hi: "प्रवासी परामर्श",
//       ch: "外籍人士咨询",
//       pt: "Consulta de Expatriado",
//       ar: "استشارة مغترب"
//     },
//     duration: "35 min",
//     helpType: {
//       fr: ["Famille", "Écoles", "Quartiers"],
//       en: ["Family", "Schools", "Neighborhoods"],
//       es: ["Familia", "Escuelas", "Barrios"],
//       de: ["Familie", "Schulen", "Viertel"],
//       ru: ["Семья", "Школы", "Районы"],
//       hi: ["परिवार", "स्कूल", "पड़ोस"],
//       ch: ["家庭", "学校", "社区"],
//       pt: ["Família", "Escolas", "Bairros"],
//       ar: ["عائلة", "مدارس", "أحياء"]
//     },
//   },
//   "8": {
//     id: "8",
//     name: "Priya S.",
//     type: "expat",
//     country: "Singapour",
//     language: "francophone",
//     rating: 5,
//     date: "2025-09-12",
//     year: 2025,
//     title: {
//       fr: "Guide complet Singapour",
//       en: "Complete Singapore Guide",
//       es: "Guía completa de Singapur",
//       de: "Kompletter Singapore-Leitfaden",
//       ru: "Полное руководство по Сингапуру",
//       hi: "सिंगापुर पूर्ण गाइड",
//       ch: "完整的新加坡指南",
//       pt: "Guia completo de Singapura",
//       ar: "دليل سنغافورة الكامل"
//     },
//     fullContent: {
//       fr: "Extraordinaire ! L'expatrié à Singapour m'a guidé pas à pas pour mon installation. Permis de travail, logement, banque locale... Tout était clair et détaillé. Service top !",
//       en: "Extraordinary! The expat in Singapore guided me step by step for my installation. Work permit, housing, local bank... Everything was clear and detailed. Top service!",
//       es: "¡Extraordinario! El expatriado en Singapur me guió paso a paso para mi instalación. Permiso de trabajo, vivienda, banco local... Todo fue claro y detallado. ¡Servicio de primera!",
//       de: "Außergewöhnlich! Der Expat in Singapur führte mich Schritt für Schritt durch meine Installation. Arbeitserlaubnis, Wohnung, lokale Bank... Alles war klar und detailliert. Spitzenservice!",
//       ru: "Необычайно! Эмигрант в Сингапуре шаг за шагом провел меня через установку. Рабочий статус, жилье, местный банк... Все было ясно и подробно. Отличный сервис!",
//       hi: "असाधारण! सिंगापुर में प्रवासी ने मुझे मेरी स्थापना के लिए चरण दर चरण मार्गदर्शन दिया। कार्य अनुमति, आवास, स्थानीय बैंक... सब कुछ स्पष्ट और विस्तृत था। शीर्ष सेवा!",
//       ch: "太棒了！这位在新加坡的外国人一步一步地指导我完成所有手续。工作许可、住房、当地银行……一切都清晰明了、讲解详尽。一流的服务！",
//       pt: "Extraordinário! O expatriado em Singapura me guiou passo a passo para minha instalação. Permissão de trabalho, moradia, banco local... Tudo estava claro e detalhado. Serviço de primeira!",
//       ar: "استثنائي! المغترب في سنغافورة أرشدني خطوة بخطوة للتثبيت. تصريح العمل والسكن والبنك المحلي... كل شيء كان واضحاً ومفصلاً. خدمة من الدرجة الأولى!"
//     },
//     avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Expatrié",
//       en: "Expat Consultation",
//       es: "Consulta de Expatriado",
//       de: "Expat-Beratung",
//       ru: "Консультация эмигранта",
//       hi: "प्रवासी परामर्श",
//       ch: "外籍人士咨询",
//       pt: "Consulta de Expatriado",
//       ar: "استشارة مغترب"
//     },
//     duration: "45 min",
//     helpType: {
//       fr: ["Permis", "Logement", "Banque"],
//       en: ["Permit", "Housing", "Banking"],
//       es: ["Permiso", "Vivienda", "Banco"],
//       de: ["Erlaubnis", "Wohnung", "Banking"],
//       ru: ["Разрешение", "Жилье", "Банк"],
//       hi: ["अनुमति", "आवास", "बैंकिंग"],
//       ch: ["允许", "住房", "银行业"],
//       pt: ["Permissão", "Moradia", "Banco"],
//       ar: ["تصريح", "سكن", "بنوك"]
//     },
//   },
//   "9": {
//     id: "9",
//     name: "Jin W.",
//     type: "expat",
//     country: "Corée du Sud",
//     language: "francophone",
//     rating: 4,
//     date: "2025-09-09",
//     year: 2025,
//     title: {
//       fr: "Échange universitaire à Séoul",
//       en: "University Exchange in Seoul",
//       es: "Intercambio universitario en Seúl",
//       de: "Universitätsaustausch in Seoul",
//       ru: "Студенческий обмен в Сеуле",
//       hi: "सियोल में विश्वविद्यालय विनिमय",
//       ch: "首尔大学交流",
//       pt: "Intercâmbio universitário em Seul",
//       ar: "تبادل جامعي في سيول"
//     },
//     fullContent: {
//       fr: "Très professionnel ! L'expatrié français en Corée du Sud m'a donné tous les conseils pour Séoul : visa étudiant, logement universitaire, culture coréenne. Parfait pour mon échange !",
//       en: "Very professional! The French expat in South Korea gave me all the advice for Seoul: student visa, university housing, Korean culture. Perfect for my exchange!",
//       es: "¡Muy profesional! El expatriado francés en Corea del Sur me dio todos los consejos para Seúl: visa de estudiante, alojamiento universitario, cultura coreana. ¡Perfecto para mi intercambio!",
//       de: "Sehr professionell! Der französische Expat in Südkorea gab mir alle Tipps für Seoul: Studentenvisum, Studentenwohnheim, koreanische Kultur. Perfekt für meinen Austausch!",
//       ru: "Очень профессионально! Французский эмигрант в Южной Корее дал мне все советы для Сеула: студенческая виза, студенческое жилье, корейская культура. Идеально для моего обмена!",
//       hi: "बहुत पेशेवर! दक्षिण कोरिया में फ्रांसीसी प्रवासी ने मुझे सियोल के लिए सभी सुझाव दिए: छात्र वीजा, विश्वविद्यालय आवास, कोरियाई संस्कृति। मेरे विनिमय के लिए बिल्कुल सही!",
//       ch: "非常专业！这位在韩国的法国侨民给了我很多关于首尔的建议：学生签证、大学住宿、韩国文化等等。对我的交换学习来说简直完美！",
//       pt: "Muito profissional! O expatriado francês na Coreia do Sul me deu todos os conselhos para Seul: visto de estudante, moradia universitária, cultura coreana. Perfeito para meu intercâmbio!",
//       ar: "احترافي جداً! المغترب الفرنسي في كوريا الجنوبية أعطاني كل النصائح لسيول: تأشيرة الطالب والإسكان الجامعي والثقافة الكورية. مثالي لتبادلي!"
//     },
//     avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Expatrié",
//       en: "Expat Consultation",
//       es: "Consulta de Expatriado",
//       de: "Expat-Beratung",
//       ru: "Консультация эмигранта",
//       hi: "प्रवासी परामर्श",
//       ch: "外籍人士咨询",
//       pt: "Consulta de Expatriado",
//       ar: "استشارة مغترب"
//     },
//     duration: "30 min",
//     helpType: {
//       fr: ["Visa", "Université", "Culture"],
//       en: ["Visa", "University", "Culture"],
//       es: ["Visa", "Universidad", "Cultura"],
//       de: ["Visum", "Universität", "Kultur"],
//       ru: ["Виза", "Университет", "Культура"],
//       hi: ["वीजा", "विश्वविद्यालय", "संस्कृति"],
//       ch: ["签证", "大学", "文化"],
//       pt: ["Visto", "Universidade", "Cultura"],
//       ar: ["تأشيرة", "جامعة", "ثقافة"]
//     },
//   },

//   // LAWYER TESTIMONIALS
//   "10": {
//     id: "10",
//     name: "James P.",
//     type: "lawyer",
//     country: "Royaume-Uni",
//     language: "francophone",
//     rating: 5,
//     date: "2025-10-04",
//     year: 2025,
//     title: {
//       fr: "Expertise juridique à Londres",
//       en: "Legal Expertise in London",
//       es: "Experiencia jurídica en Londres",
//       de: "Rechtsfachkompetenz in London",
//       ru: "Юридическая экспертиза в Лондоне",
//       hi: "लंदन में कानूनी विशेषज्ञता",
//       ch: "伦敦的法律专业知识",
//       pt: "Expertise jurídica em Londres",
//       ar: "خبرة قانونية في لندن"
//     },
//     fullContent: {
//       fr: `Avocat exceptionnel ! Depuis Londres, problème urgent avec mon propriétaire. L'avocat m'a expliqué mes droits en droit anglais, les démarches à suivre et m'a orienté vers un solicitor local. Précis et efficace !`,
//       en: `Exceptional lawyer! From London, urgent problem with my landlord. The lawyer explained my rights in English law, the steps to follow and directed me to a local solicitor. Precise and efficient!`,
//       es: "¡Abogado excepcional! Desde Londres, problema urgente con mi casero. El abogado me explicó mis derechos según la ley inglesa, los pasos a seguir y me dirigió a un abogado local. ¡Preciso y eficiente!",
//       de: "Außergewöhnlicher Anwalt! Aus London, dringendes Problem mit meinem Vermieter. Der Anwalt erklärte mir meine Rechte nach englischem Recht, die zu befolgenden Schritte und wies mich auf einen lokalen Anwalt hin. Präzise und effizient!",
//       ru: "Исключительный адвокат! Из Лондона срочная проблема с моим арендодателем. Адвокат объяснил мои права по английскому праву, шаги, которые нужно предпринять, и направил меня к местному адвокату. Точно и эффективно!",
//       hi: "असाधारण वकील! लंदन से, मेरे मकान मालिक के साथ जरूरी समस्या। वकील ने मुझे अंग्रेजी कानून में मेरे अधिकारों की व्याख्या की, अनुसरण करने के कदम और मुझे एक स्थानीय वकील की ओर निर्देशित किया। सटीक और कुशल!",
//       ar: "محامٍ استثنائي! من لندن، مشكلة عاجلة مع صاحب منزلي. شرح المحامي حقوقي بموجب القانون الإنجليزي والخطوات المطلوبة وأرشدني إلى محام محلي. دقيق وفعال!",
//       ch: `这位律师太棒了！我住在伦敦，遇到了房东的紧急纠纷。律师详细解释了我在英国法律下的权利、需要采取的步骤，并推荐了一位当地的律师。他办事精准高效！
// `,
//       pt: `Advogado excepcional! De Londres, problema urgente com meu senhorio. O advogado me explicou meus direitos sob a lei inglesa, os passos a seguir e me direcionou a um solicitor local. Preciso e eficiente!`
//     },
//     avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Appel Avocat",
//       en: "Lawyer Call",
//       es: "Consulta de Abogado",
//       de: "Rechtsberatung",
//       ru: "Консультация адвоката",
//       hi: "वकील परामर्श",
//       ch: "律师电话",
//       pt: "Chamada de Advogado",
//       ar: "مكالمة محامي"
//     },
//     duration: "25 minutes",
//     helpType: {
//       fr: ["Droit immobilier", "Droit des baux", "Conseil juridique", "Contentieux"],
//       en: ["Property law", "Tenancy law", "Legal advice", "Litigation"],
//       es: ["Derecho de propiedad", "Disputa", "Asesoramiento"],
//       de: ["Immobilienrecht", "Streit", "Beratung"],
//       ru: ["Имущественное право", "Спор", "Совет"],
//       hi: ["संपत्ति कानून", "विवाद", "सलाह"],
//       ch: ["物权法", "租赁法", "法律咨询", "诉讼"],
//       pt: ["Direito imobiliário", "Lei de arrendamento", "Aconselhamento jurídico", "Litígio"],
//       ar: ["قانون الملكية", "قانون الإيجار", "استشارة قانونية", "نزاعات"]
//     },
//   },
//   "11": {
//     id: "11",
//     name: "Anya V.",
//     type: "lawyer",
//     country: "Allemagne",
//     language: "francophone",
//     rating: 5,
//     date: "2025-09-30",
//     year: 2025,
//     title: {
//       fr: "Accident en Allemagne",
//       en: "Accident in Germany",
//       es: "Accidente en Alemania",
//       de: "Unfall in Deutschland",
//       ru: "Авария в Германии",
//       hi: "जर्मनी में दुर्घटना",
//       ch: "德国发生事故",
//       pt: "Acidente na Alemanha",
//       ar: "حادث في ألمانيا"

//     },
//     fullContent: {
//       fr: "Consultation remarquable ! Accident de voiture en Allemagne, l'avocat spécialisé en droit international m'a tout expliqué : assurances, procédures, droits. Il m'a évité des erreurs coûteuses !",
//       en: "Remarkable consultation! Car accident in Germany, the lawyer specialized in international law explained everything: insurance, procedures, rights. He saved me from costly mistakes!",
//       es: "¡Consulta notable! Accidente de coche en Alemania, el abogado especializado en derecho internacional me explicó todo: seguros, procedimientos, derechos. ¡Me ahorró cometer errores costosos!",
//       de: "Bemerkenswerte Beratung! Autounfall in Deutschland, der auf Internationales Recht spezialisierte Anwalt erklärte mir alles: Versicherung, Verfahren, Rechte. Er sparte mich vor kostspieligen Fehlern!",
//       ru: "Примечательная консультация! Автомобильная авария в Германии, адвокат, специализирующийся на международном праве, объяснил мне все: страховка, процедуры, права. Он спасл меня от дорогостоящих ошибок!",
//       hi: "उल्लेखनीय परामर्श! जर्मनी में कार दुर्घटना, अंतर्राष्ट्रीय कानून में विशेषज्ञ वकील ने मुझे सब कुछ समझाया: बीमा, प्रक्रियाएं, अधिकार। उन्होंने मुझे महंगी गलतियों से बचाया!",
//       ch: "咨询效果极佳！我在德国出了车祸，这位精通国际法的律师详细解释了所有问题：保险、程序、我的权利。他帮我避免了代价高昂的错误！",
//       pt: "Consulta notável! Acidente de carro na Alemanha, o advogado especializado em direito internacional me explicou tudo: seguro, procedimentos, direitos. Ele me poupou de erros custosos!",
//        ar: "استشارة رائعة! حادث سيارة في ألمانيا، شرح المحامي المتخصص في القانون الدولي كل شيء: التأمين والإجراءات والحقوق. أنقذني من أخطاء مكلفة!"
//     },
//     avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Avocat",
//       en: "Lawyer Consultation",
//       es: "Consulta de Abogado",
//       de: "Rechtsberatung",
//       ru: "Консультация адвоката",
//       hi: "वकील परामर्श",
//       ch: "律师咨询",
//       pt: "Consulta de Advogado",
//        ar: "استشارة محامي"
//     },
//     duration: "40 min",
//     helpType: {
//       fr: ["Accident", "Assurance", "Droit international"],
//       en: ["Accident", "Insurance", "International Law"],
//       es: ["Accidente", "Seguros", "Derecho internacional"],
//       de: ["Unfall", "Versicherung", "Internationales Recht"],
//       ru: ["Авария", "Страховка", "Международное право"],
//       hi: ["दुर्घटना", "बीमा", "अंतर्राष्ट्रीय कानून"],
//       ch: ["事故", "保险", "国际法"],
//       pt: ["Acidente", "Seguro", "Direito internacional"],
//       ar: ["حادث", "تأمين", "قانون دولي"]
//     },
//   },
//   "12": {
//     id: "12",
//     name: "Giuseppe L.",
//     type: "lawyer",
//     country: "Italie",
//     language: "francophone",
//     rating: 4,
//     date: "2025-09-27",
//     year: 2025,
//     title: {
//       fr: "Litige commercial en Italie",
//       en: "Commercial Dispute in Italy",
//       es: "Disputa comercial en Italia",
//       de: "Handelsstreit in Italien",
//       ru: "Коммерческий спор в Италии",
//       hi: "इटली में व्यावसायिक विवाद",
//       ch: "意大利商业纠纷",
//       pt: "Disputa comercial na Itália",
//        ar: "نزاع تجاري في إيطاليا"
//     },
//     fullContent: {
//       fr: "Très compétent ! Litige commercial en Italie, l'avocat m'a donné une analyse claire de ma situation juridique et les options disponibles. Conseil précieux pour mon business !",
//       en: "Very competent! Commercial dispute in Italy, the lawyer gave me a clear analysis of my legal situation and available options. Valuable advice for my business!",
//       es: "¡Muy competente! Disputa comercial en Italia, el abogado me dio un análisis claro de mi situación legal y opciones disponibles. ¡Asesoramiento valioso para mi negocio!",
//       de: "Sehr kompetent! Handelsstreit in Italien gab mir der Anwalt eine klare Analyse meiner Rechtslage und der verfügbaren Optionen. Wertvoller Rat für mein Geschäft!",
//       ru: "Очень компетентно! Коммерческий спор в Италии адвокат дал мне четкий анализ моей правовой ситуации и доступных вариантов. Ценный совет для моего бизнеса!",
//       hi: "बहुत सक्षम! इटली में व्यावसायिक विवाद, वकील ने मुझे मेरी कानूनी स्थिति का स्पष्ट विश्लेषण और उपलब्ध विकल्प दिए। मेरे व्यवसाय के लिए मूल्यवान सलाह!",
//       ch: "非常专业！我遇到意大利的商业纠纷，这位律师清晰地分析了我的法律处境和可行的方案。对我的业务来说，这是非常宝贵的建议！",
//       pt: "Muito competente! Disputa comercial na Itália, o advogado me deu uma análise clara da minha situação jurídica e opções disponíveis. Conselho valioso para meu negócio!",
//        ar: "كفء جداً! نزاع تجاري في إيطاليا أعطاني المحامي تحليلاً واضحاً لحالتي القانونية والخيارات المتاحة. نصيحة قيمة لعملي!"
//     },
//     avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDB8fGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Avocat",
//       en: "Lawyer Consultation",
//       es: "Consulta de Abogado",
//       de: "Rechtsberatung",
//       ru: "Консультация адвоката",
//       hi: "वकील परामर्श",
//       ch: "律师咨询",
//       pt: "Consulta de Advogado",
//        ar: "استشارة محامي"
//     },
//     duration: "30 min",
//     helpType: {
//       fr: ["Droit commercial", "Litige", "Business"],
//       en: ["Commercial Law", "Dispute", "Business"],
//       es: ["Derecho comercial", "Disputa", "Negocios"],
//       de: ["Handelsrecht", "Streit", "Geschäft"],
//       ru: ["Коммерческое право", "Спор", "Бизнес"],
//       hi: ["व्यावसायिक कानून", "विवाद", "व्यापार"],
//       ch: ["商法", "争议", "商业"],
//       pt: ["Direito comercial", "Disputa", "Negócios"],
//       ar: ["قانون تجاري", "نزاع", "أعمال"]
//     },
//   },
//   "13": {
//     id: "13",
//     name: "Maria G.",
//     type: "lawyer",
//     country: "États-Unis",
//     language: "francophone",
//     rating: 5,
//     date: "2025-09-23",
//     year: 2025,
//     title: {
//       fr: "Problème de visa aux USA",
//       en: "Visa Issue in USA",
//       es: "Problema de visa en EE. UU.",
//       de: "Visumproblem in den USA",
//       ru: "Проблема с визой в США",
//       hi: "यूएसए में वीजा समस्या",
//       ch: "美国签证问题",
//       pt: "Problema de visto nos EUA",
//       ar: "مشكلة تأشيرة في الولايات المتحدة"
//     },
//     fullContent: {
//       fr: "Avocat brillant ! Problème de visa aux États-Unis, il m'a expliqué toutes les procédures d'immigration, les risques et solutions. Grâce à lui, j'ai évité l'expulsion !",
//       en: "Brilliant lawyer! Visa problem in the United States, he explained all immigration procedures, risks and solutions. Thanks to him, I avoided deportation!",
//       es: "¡Abogado brillante! Problema de visa en Estados Unidos, me explicó todos los procedimientos de inmigración, riesgos y soluciones. ¡Gracias a él, evité la deportación!",
//       de: "Glänzender Anwalt! Visumproblem in den USA erklärte mir alle Einwanderungsverfahren, Risiken und Lösungen. Dank ihm habe ich Abschiebung vermieden!",
//       ru: "Блестящий адвокат! Проблема с визой в США, он объяснил мне все процедуры иммиграции, риски и решения. Благодаря ему я избежал депортации!",
//       hi: "शानदार वकील! यूएसए में वीजा समस्या, उन्होंने मुझे सभी आप्रवासन प्रक्रियाएं, जोखिम और समाधान समझाए। उनके कारण मुझे निष्कासन से बचना पड़ा!",
//       ch: "这位律师太棒了！我在美国遇到了签证问题，他详细解释了所有移民程序、风险和解决方案。多亏了他，我才避免了被遣返！",
//       pt: "Advogado brilhante! Problema de visto nos Estados Unidos, ele me explicou todos os procedimentos de imigração, riscos e soluções. Graças a ele, evitei a deportação!",
//       ar: "محامٍ رائع! مشكلة تأشيرة في الولايات المتحدة شرح لي جميع إجراءات الهجرة والمخاطر والحلول. بفضله تجنبت الترحيل!"
//     },
//     avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Appel Avocat",
//       en: "Lawyer Call",
//       es: "Consulta de Abogado",
//       de: "Rechtsberatung",
//       ru: "Консультация адвоката",
//       hi: "वकील परामर्श",
//       ch: "律师电话",
//       pt: "Chamada de Advogado",
//       ar: "مكالمة محامي"
//     },
//     duration: "50 min",
//     helpType: {
//       fr: ["Immigration", "Visa", "Urgence"],
//       en: ["Immigration", "Visa", "Emergency"],
//       es: ["Inmigración", "Visa", "Emergencia"],
//       de: ["Einwanderung", "Visum", "Notfall"],
//       ru: ["Иммиграция", "Виза", "Чрезвычайная ситуация"],
//       hi: ["आप्रवासन", "वीजा", "आपातकाल"],
//       ch: ["移民", "签证", "紧急情况"],
//       pt: ["Imigração", "Visto", "Emergência"],
//       ar: ["هجرة", "تأشيرة", "طوارئ"]
//     },
//   },
//   "14": {
//     id: "14",
//     name: "Ahmed B.",
//     type: "lawyer",
//     country: "Espagne",
//     language: "francophone",
//     rating: 5,
//     date: "2025-09-20",
//     year: 2025,
//     title: {
//       fr: "Divorce international",
//       en: "International Divorce",
//       es: "Divorcio internacional",
//       de: "Internationale Ehescheidung",
//       ru: "Международный развод",
//       hi: "अंतर्राष्ट्रीय तलाक",
//       ch: "国际离婚",
//       pt: "Divórcio internacional",
//       ar: "طلاق دولي"
//     },
//     fullContent: {
//       fr: "Service juridique excellent ! Divorce international complexe, l'avocat a su naviguer entre droit français et espagnol. Conseil clair, stratégie efficace. Je recommande vivement !",
//       en: "Excellent legal service! Complex international divorce, the lawyer navigated between French and Spanish law. Clear advice, effective strategy. Highly recommend!",
//       es: "¡Excelente servicio legal! Divorcio internacional complejo, el abogado navegó entre derecho francés y español. Consejo claro, estrategia efectiva. ¡Altamente recomendado!",
//       de: "Ausgezeichneter Rechtsdienst! Komplexe internationale Ehescheidung, der Anwalt navigierte zwischen französischem und spanischem Recht. Klarer Rat, wirksame Strategie. Sehr empfohlen!",
//       ru: "Отличное юридическое обслуживание! Сложный международный развод, адвокат сориентировался между французским и испанским правом. Четкий совет, эффективная стратегия. Настоятельно рекомендую!",
//       hi: "उत्कृष्ट कानूनी सेवा! जटिल अंतर्राष्ट्रीय तलाक, वकील फ्रांसीसी और स्पेनिश कानून के बीच नेविगेट करते हैं। स्पष्ट सलाह, प्रभावी रणनीति। अत्यधिक अनुशंसित!",
//       ch: "卓越的法律服务！复杂的国际离婚案件，律师精通法国和西班牙法律。建议清晰明了，策略有效。强烈推荐！",
//       pt: "Excelente serviço jurídico! Divórcio internacional complexo, o advogado navegou entre a lei francesa e espanhola. Conselho claro, estratégia eficaz. Recomendo fortemente!",
//       ar: "خدمة قانونية ممتازة! طلاق دولي معقد تمكن المحامي من التنقل بين القانون الفرنسي والإسباني. نصيحة واضحة واستراتيجية فعالة. أوصي به بشدة!"
//     },
//     avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Avocat",
//       en: "Lawyer Consultation",
//       es: "Consulta de Abogado",
//       de: "Rechtsberatung",
//       ru: "Консультация адвоката",
//       hi: "वकील परामर्श",
//       ch: "律师咨询",
//       pt: "Consulta de Advogado",
//        ar: "استشارة محامي"
//     },
//     duration: "60 min",
//     helpType: {
//       fr: ["Divorce", "Droit international", "Famille"],
//       en: ["Divorce", "International Law", "Family"],
//       es: ["Divorcio", "Derecho internacional", "Familia"],
//       de: ["Ehescheidung", "Internationales Recht", "Familie"],
//       ru: ["Развод", "Международное право", "Семья"],
//       hi: ["तलाक", "अंतर्राष्ट्रीय कानून", "परिवार"],
//       ch: ["离婚", "国际法", "家庭"],
//       pt: ["Divórcio", "Direito internacional", "Família"],
//       ar: ["طلاق", "قانون دولي", "عائلة"]
//     },
//   },
//   "15": {
//     id: "15",
//     name: "Sofia R.",
//     type: "lawyer",
//     country: "Mexique",
//     language: "francophone",
//     rating: 4,
//     date: "2025-09-17",
//     year: 2025,
//     title: {
//       fr: "Contrat de travail au Mexique",
//       en: "Employment Contract in Mexico",
//       es: "Contrato de empleo en México",
//       de: "Arbeitsvertrag in Mexiko",
//       ru: "Трудовой договор в Мексике",
//       hi: "मेक्सिको में रोजगार अनुबंध",
//       ch: "墨西哥的雇佣合同",
//       pt: "Contrato de trabalho no México",
//        ar: "عقد عمل في المكسيك"
//     },
//     fullContent: {
//       fr: "Très professionnel ! Contrat de travail au Mexique, l'avocat m'a expliqué toutes les clauses, mes droits et obligations. Il m'a aidé à négocier de meilleures conditions !",
//       en: "Very professional! Employment contract in Mexico, the lawyer explained all clauses, my rights and obligations. He helped me negotiate better conditions!",
//       es: "¡Muy profesional! Contrato de empleo en México, el abogado me explicó todas las cláusulas, mis derechos y obligaciones. ¡Me ayudó a negociar mejores condiciones!",
//       de: "Sehr professionell! Arbeitsvertrag in Mexiko, der Anwalt erklärte mir alle Klauseln, meine Rechte und Pflichten. Er half mir, bessere Bedingungen auszuhandeln!",
//       ru: "Очень профессионально! Трудовой договор в Мексике адвокат объяснил мне все пункты, мои права и обязанности. Он помог мне договориться о лучших условиях!",
//       hi: "बहुत पेशेवर! मेक्सिको में रोजगार अनुबंध, वकील ने मुझे सभी खंड, मेरे अधिकार और कर्तव्य समझाए। उन्होंने मुझे बेहतर शर्तों पर सहमति प्राप्त करने में मदद की!",
//       ch: "非常专业！墨西哥的雇佣合同，律师详细解释了所有条款、我的权利和义务。他还帮我争取到了更好的待遇！",
//       pt: "Muito profissional! Contrato de trabalho no México, o advogado me explicou todas as cláusulas, meus direitos e obrigações. Ele me ajudou a negociar melhores condições!",
//        ar: "احترافي جداً! عقد العمل في المكسيك شرح المحامي جميع البنود وحقوقي والتزاماتي. ساعدني في التفاوض على ظروف أفضل!"
//     },
//     avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=400&h=400&q=80",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Avocat",
//       en: "Lawyer Consultation",
//       es: "Consulta de Abogado",
//       de: "Rechtsberatung",
//       ru: "Консультация адвоката",
//       hi: "वकील परामर्श",
//       ch: "律师咨询",
//       pt: "Consulta de Advogado",
//        ar: "استشارة محامي"
//     },
//     duration: "35 min",
//     helpType: {
//       fr: ["Droit du travail", "Contrat", "Négociation"],
//       en: ["Labor Law", "Contract", "Negotiation"],
//       es: ["Derecho laboral", "Contrato", "Negociación"],
//       de: ["Arbeitsrecht", "Vertrag", "Verhandlung"],
//       ru: ["Трудовое право", "Контракт", "Переговоры"],
//       hi: ["श्रम कानून", "अनुबंध", "वार्तालाप"],
//       ch: ["劳动法", "合同", "谈判"],
//       pt: ["Direito do trabalho", "Contrato", "Negociação"],
//       ar: ["قانون العمل", "عقد", "تفاوض"]
//     },
//   },
//   "16": {
//     id: "16",
//     name: "Lars H.",
//     type: "lawyer",
//     country: "Suisse",
//     language: "francophone",
//     rating: 5,
//     date: "2025-09-13",
//     year: 2025,
//     title: {
//       fr: "Problème fiscal en Suisse",
//       en: "Tax Issue in Switzerland",
//       es: "Problema fiscal en Suiza",
//       de: "Steuerproblem in der Schweiz",
//       ru: "Налоговая проблема в Швейцарии",
//       hi: "स्विटजरलैंड में कर समस्या",
//       ch: "瑞士的税务问题",
//       pt: "Problema fiscal na Suíça",
//       ar: "مشكلة ضريبية في سويسرا"
//     },
//     fullContent: {
//       fr: "Avocat remarquable ! Problème fiscal en Suisse, il m'a expliqué les implications légales, les démarches et m'a orienté vers un fiscaliste local. Service impeccable !",
//       en: "Remarkable lawyer! Tax issue in Switzerland, he explained legal implications, procedures and directed me to a local tax specialist. Impeccable service!",
//       es: "¡Abogado notable! Problema fiscal en Suiza, me explicó las implicaciones legales, procedimientos y me dirigió a un especialista fiscal local. ¡Servicio impecable!",
//       de: "Bemerkenswerter Anwalt! Steuerproblem in der Schweiz erklärte mir die Rechtsfolgen, Verfahren und leitete mich an einen lokalen Steuerspezialisten weiter. Tadelloses Service!",
//       ru: "Замечательный адвокат! Налоговая проблема в Швейцарии, он объяснил мне правовые последствия, процедуры и направил меня к местному налоговому специалисту. Безупречный сервис!",
//       hi: "उल्लेखनीय वकील! स्विटजरलैंड में कर समस्या, उन्होंने मुझे कानूनी निहितार्थ, प्रक्रियाएं समझाईं और मुझे स्थानीय कर विशेषज्ञ की ओर निर्देशित किया। निर्दोष सेवा!",
//       ch: "这位律师太棒了！我遇到了瑞士的税务问题，他详细解释了相关的法律规定和程序，并推荐了一位当地的税务专家。服务无可挑剔！",
//       pt: "Advogado notável! Problema fiscal na Suíça, ele me explicou as implicações legais, os procedimentos e me direcionou a um especialista fiscal local. Serviço impecável!",
//       ar: "محامٍ ملحوظ! مشكلة ضريبية في سويسرا شرح الآثار القانونية والإجراءات وأرشدني إلى متخصص ضريبي محلي. خدمة لا تشوبها شائبة!"
//     },
//     avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8YXZhdGFyfGVufDB8fDB8fHww",
//     verified: true,
//     serviceUsed: {
//       fr: "Consultation Avocat",
//       en: "Lawyer Consultation",
//       es: "Consulta de Abogado",
//       de: "Rechtsberatung",
//       ru: "Консультация адвоката",
//       hi: "वकील परामर्श",
//       ch: "律师咨询",
//       pt: "Consulta de Advogado",
//        ar: "استشارة محامي"
//     },
//     duration: "45 min",
//     helpType: {
//       fr: ["Fiscal", "Droit", "Conseil"],
//       en: ["Tax", "Law", "Advice"],
//       es: ["Fiscal", "Ley", "Asesoramiento"],
//       de: ["Steuern", "Recht", "Beratung"],
//       ru: ["Налог", "Закон", "Совет"],
//       hi: ["कर", "कानून", "सलाह"],
//       ch: ["税", "法律", "建议"],
//       pt: ["Fiscal", "Direito", "Aconselhamento"],
//       ar: ["ضرائب", "قانون", "استشارة"]
//     },
//   },
// };

// Country translations / Traductions des pays

const COUNTRY_TRANSLATIONS: Record<
  string,
  {
    fr: string;
    en: string;
    es: string;
    de: string;
    ru: string;
    hi: string;
    ch: string;
    pt: string;
    ar: string;
  }
> = {
  thailande: {
    fr: "Thaïlande",
    en: "Thailand",
    es: "Tailandia",
    de: "Thailand",
    ru: "Таиланд",
    hi: "थाईलैंड",
    ch: "泰国",
    pt: "Tailândia",
    ar: "تايلاند",
  },
  espagne: {
    fr: "Espagne",
    en: "Spain",
    es: "España",
    de: "Spanien",
    ru: "Испания",
    hi: "स्पेन",
    ch: "西班牙",
    pt: "Espanha",
    ar: "إسبانيا",
  },
  canada: {
    fr: "Canada",
    en: "Canada",
    es: "Canadá",
    de: "Kanada",
    ru: "Канада",
    hi: "कनाडा",
    ch: "加拿大",
    pt: "Canadá",
    ar: "كندا",
  },
  france: {
    fr: "France",
    en: "France",
    es: "Francia",
    de: "Frankreich",
    ru: "Франция",
    hi: "फ्रांस",
    ch: "法国",
    pt: "França",
    ar: "فرنسا",
  },
  allemagne: {
    fr: "Allemagne",
    en: "Germany",
    es: "Alemania",
    de: "Deutschland",
    ru: "Германия",
    hi: "जर्मनी",
    ch: "德国",
    pt: "Alemanha",
    ar: "ألمانيا",
  },
  italie: {
    fr: "Italie",
    en: "Italy",
    es: "Italia",
    de: "Italien",
    ru: "Италия",
    hi: "इटली",
    ch: "意大利",
    pt: "Itália",
    ar: "إيطاليا",
  },
  portugal: {
    fr: "Portugal",
    en: "Portugal",
    es: "Portugal",
    de: "Portugal",
    ru: "Португалия",
    hi: "पुर्तगाल",
    ch: "葡萄牙",
    pt: "Portugal",
    ar: "البرتغال",
  },
  belgique: {
    fr: "Belgique",
    en: "Belgium",
    es: "Bélgica",
    de: "Belgien",
    ru: "Бельгия",
    hi: "बेल्जियम",
    ch: "比利时",
    pt: "Bélgica",
    ar: "بلجيكا",
  },
  suisse: {
    fr: "Suisse",
    en: "Switzerland",
    es: "Suiza",
    de: "Schweiz",
    ru: "Швейцария",
    hi: "स्विट्जरलैंड",
    ch: "瑞士",
    pt: "Suíça",
    ar: "سويسرا",
  },
  "royaume-uni": {
    fr: "Royaume-Uni",
    en: "United Kingdom",
    es: "Reino Unido",
    de: "Vereinigtes Königreich",
    ru: "Соединенное Королевство",
    hi: "यूनाइटेड किंगडम",
    ch: "英国",
    pt: "Reino Unido",
    ar: "المملكة المتحدة",
  },
  "etats-unis": {
    fr: "États-Unis",
    en: "United States",
    es: "Estados Unidos",
    de: "Vereinigte Staaten",
    ru: "Соединённые Штаты",
    hi: "संयुक्त राज्य",
    ch: "美国",
    pt: "Estados Unidos",
    ar: "الولايات المتحدة",
  },
  australie: {
    fr: "Australie",
    en: "Australia",
    es: "Australia",
    de: "Australien",
    ru: "Австралия",
    hi: "ऑस्ट्रेलिया",
    ch: "澳大利亚",
    pt: "Austrália",
    ar: "أستراليا",
  },
  japon: {
    fr: "Japon",
    en: "Japan",
    es: "Japón",
    de: "Japan",
    ru: "Япония",
    hi: "जापान",
    ch: "日本",
    pt: "Japão",
    ar: "اليابان",
  },
  bresil: {
    fr: "Brésil",
    en: "Brazil",
    es: "Brasil",
    de: "Brasilien",
    ru: "Бразилия",
    hi: "ब्राजील",
    ch: "巴西",
    pt: "Brasil",
    ar: "البرازيل",
  },
  mexique: {
    fr: "Mexique",
    en: "Mexico",
    es: "México",
    de: "Mexiko",
    ru: "Мексика",
    hi: "मेक्सिको",
    ch: "墨西哥",
    pt: "México",
    ar: "المكسيك",
  },
  argentine: {
    fr: "Argentine",
    en: "Argentina",
    es: "Argentina",
    de: "Argentinien",
    ru: "Аргентина",
    hi: "अर्जेंटीना",
    ch: "阿根廷",
    pt: "Argentina",
    ar: "الأرجنتين",
  },
  chili: {
    fr: "Chili",
    en: "Chile",
    es: "Chile",
    de: "Chile",
    ru: "Чили",
    hi: "चिली",
    ch: "智利",
    pt: "Chile",
    ar: "تشيلي",
  },
  colombie: {
    fr: "Colombie",
    en: "Colombia",
    es: "Colombia",
    de: "Kolumbien",
    ru: "Колумбия",
    hi: "कोलंबिया",
    ch: "哥伦比亚",
    pt: "Colômbia",
    ar: "كولومبيا",
  },
  perou: {
    fr: "Pérou",
    en: "Peru",
    es: "Perú",
    de: "Peru",
    ru: "Перу",
    hi: "पेरू",
    ch: "秘鲁",
    pt: "Peru",
    ar: "بيرو",
  },
  maroc: {
    fr: "Maroc",
    en: "Morocco",
    es: "Marruecos",
    de: "Marokko",
    ru: "Марокко",
    hi: "मोरक्को",
    ch: "摩洛哥",
    pt: "Marrocos",
    ar: "المغرب",
  },
  tunisie: {
    fr: "Tunisie",
    en: "Tunisia",
    es: "Túnez",
    de: "Tunesien",
    ru: "Тунис",
    hi: "ट्यूनीशिया",
    ch: "突尼斯",
    pt: "Tunísia",
    ar: "تونس",
  },
  senegal: {
    fr: "Sénégal",
    en: "Senegal",
    es: "Senegal",
    de: "Senegal",
    ru: "Сенегал",
    hi: "सेनेगल",
    ch: "塞内加尔",
    pt: "Senegal",
    ar: "السنغال",
  },
  "cote-divoire": {
    fr: "Côte d'Ivoire",
    en: "Ivory Coast",
    es: "Costa de Marfil",
    de: "Elfenbeinküste",
    ru: "Кот-д'Ивуар",
    hi: "आइवरी कोस्ट",
    ch: "象牙海岸",
    pt: "Costa do Marfim",
    ar: "ساحل العاج",
  },
  vietnam: {
    fr: "Vietnam",
    en: "Vietnam",
    es: "Vietnam",
    de: "Vietnam",
    ru: "Вьетнам",
    hi: "वियतनाम",
    ch: "越南",
    pt: "Vietnã",
    ar: "فيتنام",
  },
  cambodge: {
    fr: "Cambodge",
    en: "Cambodia",
    es: "Camboya",
    de: "Kambodscha",
    ru: "Камбоджа",
    hi: "कंबोडिया",
    ch: "柬埔寨",
    pt: "Camboja",
    ar: "كمبوديا",
  },
  inde: {
    fr: "Inde",
    en: "India",
    es: "India",
    de: "Indien",
    ru: "Индия",
    hi: "भारत",
    ch: "印度",
    pt: "Índia",
    ar: "الهند",
  },
  chine: {
    fr: "Chine",
    en: "China",
    es: "China",
    de: "China",
    ru: "Китай",
    hi: "चीन",
    ch: "中国",
    pt: "China",
    ar: "الصين",
  },
  singapour: {
    fr: "Singapour",
    en: "Singapore",
    es: "Singapur",
    de: "Singapur",
    ru: "Сингапур",
    hi: "सिंगापुर",
    ch: "新加坡",
    pt: "Singapura",
    ar: "سنغافورة",
  },
  malaisie: {
    fr: "Malaisie",
    en: "Malaysia",
    es: "Malasia",
    de: "Malaysia",
    ru: "Малайзия",
    hi: "मलेशिया",
    ch: "马来西亚",
    pt: "Malásia",
    ar: "ماليزيا",
  },
  indonesie: {
    fr: "Indonésie",
    en: "Indonesia",
    es: "Indonesia",
    de: "Indonesien",
    ru: "Индонезия",
    hi: "इंडोनेशिया",
    ch: "印度尼西亚",
    pt: "Indonésia",
    ar: "إندونيسيا",
  },
  philippines: {
    fr: "Philippines",
    en: "Philippines",
    es: "Filipinas",
    de: "Philippinen",
    ru: "Филиппины",
    hi: "फिलीपीन",
    ch: "菲律宾",
    pt: "Filipinas",
    ar: "الفلبين",
  },
  "coree-du-sud": {
    fr: "Corée du Sud",
    en: "South Korea",
    es: "Corea del Sur",
    de: "Südkorea",
    ru: "Южная Корея",
    hi: "दक्षिण कोरिया",
    ch: "韩国",
    pt: "Coreia do Sul",
    ar: "كوريا الجنوبية",
  },
  "nouvelle-zelande": {
    fr: "Nouvelle-Zélande",
    en: "New Zealand",
    es: "Nueva Zelanda",
    de: "Neuseeland",
    ru: "Новая Зеландия",
    hi: "न्यूजीलैंड",
    ch: "新西兰",
    pt: "Nova Zelândia",
    ar: "نيوزيلندا",
  },
  "afrique-du-sud": {
    fr: "Afrique du Sud",
    en: "South Africa",
    es: "Sudáfrica",
    de: "Südafrika",
    ru: "Южная Африка",
    hi: "दक्षिण अफ्रीका",
    ch: "南非",
    pt: "África do Sul",
    ar: "جنوب أفريقيا",
  },
  "emirats-arabes-unis": {
    fr: "Émirats Arabes Unis",
    en: "United Arab Emirates",
    es: "Emiratos Árabes Unidos",
    de: "Vereinigte Arabische Emirate",
    ru: "Объединённые Арабские Эмираты",
    hi: "संयुक्त अरब अमीरात",
    ch: "阿联酋",
    pt: "Emirados Árabes Unidos",
    ar: "الإمارات العربية المتحدة",
  },
  qatar: {
    fr: "Qatar",
    en: "Qatar",
    es: "Catar",
    de: "Katar",
    ru: "Катар",
    hi: "कतर",
    ch: "卡塔尔",
    pt: "Catar",
    ar: "قطر",
  },
  "arabie-saoudite": {
    fr: "Arabie Saoudite",
    en: "Saudi Arabia",
    es: "Arabia Saudita",
    de: "Saudi-Arabien",
    ru: "Саудовская Аравия",
    hi: "सऊदी अरब",
    ch: "沙特阿拉伯",
    pt: "Arábia Saudita",
    ar: "المملكة العربية السعودية",
  },
  turquie: {
    fr: "Turquie",
    en: "Turkey",
    es: "Turquía",
    de: "Türkei",
    ru: "Турция",
    hi: "तुर्की",
    ch: "土耳其",
    pt: "Turquia",
    ar: "تركيا",
  },
  grece: {
    fr: "Grèce",
    en: "Greece",
    es: "Grecia",
    de: "Griechenland",
    ru: "Греция",
    hi: "ग्रीस",
    ch: "希腊",
    pt: "Grécia",
    ar: "اليونان",
  },
  croatie: {
    fr: "Croatie",
    en: "Croatia",
    es: "Croacia",
    de: "Kroatien",
    ru: "Хорватия",
    hi: "क्रोएशिया",
    ch: "克罗地亚",
    pt: "Croácia",
    ar: "كرواتيا",
  },
  pologne: {
    fr: "Pologne",
    en: "Poland",
    es: "Polonia",
    de: "Polen",
    ru: "Польша",
    hi: "पोलैंड",
    ch: "波兰",
    pt: "Polônia",
    ar: "بولندا",
  },
  "republique-tcheque": {
    fr: "République Tchèque",
    en: "Czech Republic",
    es: "República Checa",
    de: "Tschechische Republik",
    ru: "Чешская Республика",
    hi: "चेक गणराज्य",
    ch: "捷克共和国",
    pt: "República Tcheca",
    ar: "جمهورية التشيك",
  },
  hongrie: {
    fr: "Hongrie",
    en: "Hungary",
    es: "Hungría",
    de: "Ungarn",
    ru: "Венгрия",
    hi: "हंगरी",
    ch: "匈牙利",
    pt: "Hungria",
    ar: "المجر",
  },
  roumanie: {
    fr: "Roumanie",
    en: "Romania",
    es: "Rumania",
    de: "Rumänien",
    ru: "Румыния",
    hi: "रोमानिया",
    ch: "罗马尼亚",
    pt: "Romênia",
    ar: "رومانيا",
  },
  bulgarie: {
    fr: "Bulgarie",
    en: "Bulgaria",
    es: "Bulgaria",
    de: "Bulgarien",
    ru: "Болгария",
    hi: "बुल्गारिया",
    ch: "保加利亚",
    pt: "Bulgária",
    ar: "بلغاريا",
  },
  russie: {
    fr: "Russie",
    en: "Russia",
    es: "Rusia",
    de: "Russland",
    ru: "Россия",
    hi: "रूस",
    ch: "俄罗斯",
    pt: "Rússia",
    ar: "روسيا",
  },
  ukraine: {
    fr: "Ukraine",
    en: "Ukraine",
    es: "Ucrania",
    de: "Ukraine",
    ru: "Украина",
    hi: "यूक्रेन",
    ch: "乌克兰",
    pt: "Ucrânia",
    ar: "أوكرانيا",
  },
  norvege: {
    fr: "Norvège",
    en: "Norway",
    es: "Noruega",
    de: "Norwegen",
    ru: "Норвегия",
    hi: "नॉर्वे",
    ch: "挪威",
    pt: "Noruega",
    ar: "النرويج",
  },
  suede: {
    fr: "Suède",
    en: "Sweden",
    es: "Suecia",
    de: "Schweden",
    ru: "Швеция",
    hi: "स्वीडन",
    ch: "瑞典",
    pt: "Suécia",
    ar: "السويد",
  },
  danemark: {
    fr: "Danemark",
    en: "Denmark",
    es: "Dinamarca",
    de: "Dänemark",
    ru: "Дания",
    hi: "डेनमार्क",
    ch: "丹麦",
    pt: "Dinamarca",
    ar: "الدنمارك",
  },
  finlande: {
    fr: "Finlande",
    en: "Finland",
    es: "Finlandia",
    de: "Finnland",
    ru: "Финляндия",
    hi: "फिनलैंड",
    ch: "芬兰",
    pt: "Finlândia",
    ar: "فنلندا",
  },
  islande: {
    fr: "Islande",
    en: "Iceland",
    es: "Islandia",
    de: "Island",
    ru: "Исландия",
    hi: "आइसलैंड",
    ch: "冰岛",
    pt: "Islândia",
    ar: "آيسلندا",
  },
  irlande: {
    fr: "Irlande",
    en: "Ireland",
    es: "Irlanda",
    de: "Irland",
    ru: "Ирландия",
    hi: "आयरलैंड",
    ch: "爱尔兰",
    pt: "Irlanda",
    ar: "أيرلندا",
  },
  "pays-bas": {
    fr: "Pays-Bas",
    en: "Netherlands",
    es: "Países Bajos",
    de: "Niederlande",
    ru: "Нидерланды",
    hi: "नीदरलैंड",
    ch: "荷兰",
    pt: "Países Baixos",
    ar: "هولندا",
  },
  luxembourg: {
    fr: "Luxembourg",
    en: "Luxembourg",
    es: "Luxemburgo",
    de: "Luxemburg",
    ru: "Люксембург",
    hi: "लक्समबर्ग",
    ch: "卢森堡",
    pt: "Luxemburgo",
    ar: "لوكسمبورغ",
  },
  autriche: {
    fr: "Autriche",
    en: "Austria",
    es: "Austria",
    de: "Österreich",
    ru: "Австрия",
    hi: "ऑस्ट्रिया",
    ch: "奥地利",
    pt: "Áustria",
    ar: "النمسا",
  },
};

const TestimonialDetail: React.FC = () => {
  const intl = useIntl();
  // ✅ NEW: Parse URL params
  const { country, language: urlLanguage, reviewType } = useParams<{ 
    country: string;
    language: string;
    reviewType: string;
  }>();

  const navigate = useLocaleNavigate();
  const { language } = useApp();
  
  // ✅ Check if current language is RTL
  const isRTL = language === 'ar';

  // Extract testimonial ID from sessionStorage (set during navigation)
  const testimonialId = useMemo(() => {
    const storedId = sessionStorage.getItem('testimonialId');
    const storedCountry = sessionStorage.getItem('testimonialCountry');
    const storedLanguage = sessionStorage.getItem('testimonialLanguage');
    
    // Verify URL params match stored data (in case of direct URL access)
    if (storedCountry === country && storedLanguage === urlLanguage && storedId) {
      return storedId;
    }
    
    // If direct URL access, fallback to first testimonial
    return storedId || '1';
  }, [country, urlLanguage]);

  // Helper: pick a localized value from objects that have keys like { fr, en, es, de, ru, hi }
  const pickLang = <T extends Record<string, unknown> | undefined>(obj: T): unknown => {
    if (!obj) return undefined;
    const record = obj as Record<string, unknown>;
    // prefer exact language, then en, then fr, then first available entry
    return (
      record[language] ??
      record["en"] ??
      record["fr"] ??
      // fallback to first property value if nothing above matches
      Object.values(record)[0]
    );
  };

  // ✅ FIND TESTIMONIAL BY ID - Try Firestore first, fallback to mock
  const [testimonialData, setTestimonialData] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTestimonial = async () => {
      setIsLoading(true);
      try {
        // Try to fetch from Firestore first
        const firestoreReviews = await getAllReviews({
          status: "published",
          limit: 100,
        });

        // Find the review by ID
        const firestoreReview = firestoreReviews.find((r) => r.id === testimonialId);

        if (firestoreReview && firestoreReview.isPublic) {
          // Map Firestore review to Review type
          setTestimonialData({
            id: firestoreReview.id,
            callId: firestoreReview.callId || "",
            clientId: firestoreReview.clientId || "",
            providerId: firestoreReview.providerId || "",
            rating: firestoreReview.rating || 5,
            comment: firestoreReview.comment || "",
            isPublic: firestoreReview.isPublic ?? true,
            createdAt: firestoreReview.createdAt instanceof Date
              ? firestoreReview.createdAt
              : new Date(firestoreReview.createdAt),
            clientName: firestoreReview.clientName || "Client",
            clientCountry: firestoreReview.clientCountry || "",
            serviceType: firestoreReview.serviceType || "expat_call",
            status: firestoreReview.status || "published",
            helpfulVotes: firestoreReview.helpfulVotes || 0,
            clientAvatar: firestoreReview.clientAvatar,
            verified: firestoreReview.verified ?? true,
            title: firestoreReview.title || "",
            fullcontent: firestoreReview.fullcontent || firestoreReview.comment || "",
            service_used: firestoreReview.service_used || "",
            // Durée: utiliser celle du review ou calculer selon le type de service
            // lawyer_call = 20 min, expat_call = 30 min
            duration: firestoreReview.duration || (
              firestoreReview.serviceType === "lawyer_call" ? "20 min" :
              firestoreReview.serviceType === "expat_call" ? "30 min" : ""
            ),
            help_type: firestoreReview.help_type || [],
          });
          return;
        }
      } catch (error) {
        console.warn("Could not fetch review from Firestore:", error);
      }

      // Fallback to mock data
      const mockReviews = createMockReviewsData(language);
      const mockReview = mockReviews.find((review) => review.id === testimonialId);
      setTestimonialData(mockReview || mockReviews[0]);
      setIsLoading(false);
    };

    loadTestimonial().finally(() => setIsLoading(false));
  }, [testimonialId, language]);

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Memoization of date formatting / Mémoisation du formatage de date
  const formattedDate = useMemo(() => {
    if (!testimonialData) return '';
    const date = new Date(testimonialData.createdAt);
    return date.toLocaleDateString(getDateLocale(language), {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [testimonialData, language]);

  // Memoization of stars / Mémoisation des étoiles
  const stars = useMemo(() => {
    if (!testimonialData) return [];
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={20}
        className={
          i < testimonialData.rating
            ? "text-yellow-400 fill-current"
            : "text-gray-300"
        }
      />
    ));
  }, [testimonialData]);

  // SEO Effect - must be called before early return
  // Note: Uses language for translation lookup
  const textsForSeo = {
    fr: { testimonialPageTitle: "Témoignage de", testimonialPageDescription: "Découvrez l'expérience de nos utilisateurs avec nos avocats et expatriés experts. Conseils juridiques et pratiques pour les expatriés.", helpDescription: "Obtenez de l'aide d'un expert vérifié en moins de 5 minutes" },
    en: { testimonialPageTitle: "Testimonial from", testimonialPageDescription: "Discover the experience of our users with our expert lawyers and expats. Legal and practical advice for expats.", helpDescription: "Get help from a verified expert in less than 5 minutes" },
    es: { testimonialPageTitle: "Testimonio de", testimonialPageDescription: "Descubre la experiencia de nuestros usuarios con nuestros abogados y expatriados expertos.", helpDescription: "Obtén ayuda de un experto verificado en menos de 5 minutos" },
    de: { testimonialPageTitle: "Erfahrungsbericht von", testimonialPageDescription: "Entdecken Sie die Erfahrungen unserer Nutzer mit unseren Experten-Anwälten und Expats.", helpDescription: "Erhalten Sie Hilfe von einem verifizierten Experten in weniger als 5 Minuten" },
    ru: { testimonialPageTitle: "Отзыв от", testimonialPageDescription: "Откройте для себя опыт наших пользователей с нашими экспертами-юристами и экспатами.", helpDescription: "Получите помощь от проверенного эксперта менее чем за 5 минут" },
    hi: { testimonialPageTitle: "प्रशंसापत्र से", testimonialPageDescription: "हमारे विशेषज्ञ वकीलों और प्रवासियों के साथ हमारे उपयोगकर्ताओं के अनुभव की खोज करें।", helpDescription: "5 मिनट से कम समय में सत्यापित विशेषज्ञ से सहायता प्राप्त करें" },
    ch: { testimonialPageTitle: "来自的评价", testimonialPageDescription: "了解我们的用户与我们的专家律师和外籍人士的经验。", helpDescription: "在不到5分钟内从经验证的专家那里获得帮助" },
    pt: { testimonialPageTitle: "Depoimento de", testimonialPageDescription: "Descubra a experiência de nossos usuários com nossos advogados e expatriados especialistas.", helpDescription: "Obtenha ajuda de um especialista verificado em menos de 5 minutos" },
    ar: { testimonialPageTitle: "شهادة من", testimonialPageDescription: "اكتشف تجربة مستخدمينا مع خبرائنا المحامين والمغتربين.", helpDescription: "احصل على مساعدة من خبير معتمد في أقل من 5 دقائق" },
  };
  const tSeo = textsForSeo[language as keyof typeof textsForSeo] || textsForSeo.en;

  React.useEffect(() => {
    if (!testimonialData) return;

    const currentTitle = testimonialData.title;
    const currentContent = testimonialData.fullcontent;
    const pageTitle = `${tSeo.testimonialPageTitle} ${testimonialData.clientName} - ${currentTitle}`;
    const pageDescription = `${tSeo.testimonialPageDescription} ${currentContent.substring(0, 160)}...`;

    document.title = pageTitle;

    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", pageDescription);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = pageDescription;
      document.head.appendChild(meta);
    }

    // Set Open Graph meta tags
    const setOrCreateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (meta) {
        meta.setAttribute("content", content);
      } else {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        meta.setAttribute("content", content);
        document.head.appendChild(meta);
      }
    };

    setOrCreateMeta("og:title", pageTitle);
    setOrCreateMeta("og:description", pageDescription);
    setOrCreateMeta("og:type", "article");
    setOrCreateMeta("og:url", window.location.href);
    setOrCreateMeta("og:image", testimonialData.clientAvatar || '');

    // Set structured data for better SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Review",
      itemReviewed: {
        "@type": "Service",
        name: "SOS Expat & Travelers",
        description: tSeo.helpDescription,
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: testimonialData.rating,
        bestRating: 5,
      },
      author: {
        "@type": "Person",
        name: testimonialData.clientName,
      },
      reviewBody: currentContent,
      datePublished: testimonialData.createdAt,
      publisher: {
        "@type": "Organization",
        name: "SOS Expat & Travelers",
      },
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [testimonialData, tSeo, language]);

  // Loading state - early return after all hooks
  if (isLoading || !testimonialData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
        </div>
      </Layout>
    );
  }

  // Get country translation / Obtenir la traduction du pays
  const getCountryName = (countryKey: string): string => {
    // Use the centralized formatter utility for 9-language support
    const translated = getCountryNameFromCode(countryKey, language);
    if (translated && translated !== countryKey) {
      return translated;
    }
    // Fallback to local translations
    const translation = COUNTRY_TRANSLATIONS[countryKey];
    if (translation) {
      return translation[language as 'fr' | 'en'] || translation.en;
    }
    return countryKey.charAt(0).toUpperCase() + countryKey.slice(1);
  };

  // Optimized share function / Fonction de partage optimisée
  const handleShare = (platform: string) => {
    const currentUrl = window.location.href;
    const serviceLabel = testimonialData.serviceType === "lawyer_call"
      ? t.solicitedLawyer
      : t.solicitedExpat;
    const titleText = `${testimonialData.clientName} - ${serviceLabel} - ${testimonialData.title}`;
    const contentText = testimonialData.fullcontent;
    const description = `${contentText.substring(0, 100)}...`;

    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}&quote=${encodeURIComponent(`${titleText}\n\n${description}`)}`,
      email: `mailto:?subject=${encodeURIComponent(titleText)}&body=${encodeURIComponent(`${description}\n\n${currentUrl}`)}`,
    };

    if (platform === "copy") {
      navigator.clipboard
        ?.writeText(currentUrl)
        .then(() => {
          alert(intl.formatMessage({ id: "testimonial.linkCopied" }));
        })
        .catch(() => {
          // Fallback for unsupported browsers / Fallback pour les navigateurs non supportés
          const textArea = document.createElement("textarea");
          textArea.value = currentUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
          alert(intl.formatMessage({ id: "testimonial.linkCopied" }));
        });
    } else if (shareUrls[platform as keyof typeof shareUrls]) {
      if (platform === "email") {
        window.location.href = shareUrls[platform as keyof typeof shareUrls];
      } else {
        window.open(
          shareUrls[platform as keyof typeof shareUrls],
          "_blank",
          "noopener,noreferrer"
        );
      }
    }
  };

  // Optimized texts according to language / Textes optimisés selon la langue
  const texts = {
    fr: {
      backToTestimonials: "Retour aux témoignages",
      verified: "Vérifié",
      solicitedLawyer: "A sollicité un avocat",
      solicitedExpat: "A sollicité un expatrié",
      shareTestimonial: "Partager ce témoignage",
      serviceDetails: "Détails du service",
      serviceUsed: "Service utilisé",
      duration: "Durée",
      helpType: "Type d'aide",
      needHelp: "Besoin d'aide aussi ?",
      helpDescription:
        "Obtenez de l'aide d'un expert vérifié en moins de 5 minutes",
      findExpert: "Trouver un expert",
      otherTestimonials: "Autres témoignages",
      viewAllTestimonials: "Voir tous les témoignages",
      shareOnFacebook: "Partager sur Facebook",
      shareByEmail: "Partager par email",
      copyLink: "Copier le lien",
      secured: "Sécurisé",
      lessThan5Min: "Moins de 5 min",
      worldwide: "Mondial",
      reviews: "avis",
      minutesAbbrev: "minutes",
      testimonialPageTitle: "Témoignage de",
      testimonialPageDescription:
        "Découvrez l'expérience de nos utilisateurs avec nos experts avocats et expatriés. Conseils juridiques et pratiques pour expatriés.",
      lawyerConsultation: "Consultation d'avocat",
      expatConsultation: "Consultation d'expatrié",
      readTestimonial: "Lire le témoignage de",
      userExperience: "Expérience utilisateur",
      expertAdvice: "Conseils d'expert",
      customerSatisfaction: "Satisfaction client",
      internationalSupport: "Support international",
      starsOutOf5: "étoiles sur 5",
    },
    en: {
      backToTestimonials: "Back to testimonials",
      verified: "Verified",
      solicitedLawyer: "Consulted a lawyer",
      solicitedExpat: "Consulted an expat",
      shareTestimonial: "Share this testimonial",
      serviceDetails: "Service details",
      serviceUsed: "Service used",
      duration: "Duration",
      helpType: "Help type",
      needHelp: "Need help too?",
      helpDescription: "Get help from a verified expert in less than 5 minutes",
      findExpert: "Find an expert",
      otherTestimonials: "Other testimonials",
      viewAllTestimonials: "View all testimonials",
      shareOnFacebook: "Share on Facebook",
      shareByEmail: "Share by email",
      copyLink: "Copy link",
      secured: "Secured",
      lessThan5Min: "Less than 5 min",
      worldwide: "Worldwide",
      reviews: "reviews",
      minutesAbbrev: "minutes",
      testimonialPageTitle: "Testimonial from",
      testimonialPageDescription:
        "Discover the experience of our users with our expert lawyers and expats. Legal and practical advice for expats.",
      lawyerConsultation: "Lawyer consultation",
      expatConsultation: "Expat consultation",
      readTestimonial: "Read testimonial from",
      userExperience: "User experience",
      expertAdvice: "Expert advice",
      customerSatisfaction: "Customer satisfaction",
      internationalSupport: "International support",
      starsOutOf5: "stars out of 5",
    },
    es: {
      backToTestimonials: "Volver a testimonios",
      verified: "Verificado",
      solicitedLawyer: "Consultó a un abogado",
      solicitedExpat: "Consultó a un expatriado",
      shareTestimonial: "Compartir este testimonio",
      serviceDetails: "Detalles del servicio",
      serviceUsed: "Servicio utilizado",
      duration: "Duración",
      helpType: "Tipo de ayuda",
      needHelp: "¿Necesitas ayuda también?",
      helpDescription:
        "Obtén ayuda de un experto verificado en menos de 5 minutos",
      findExpert: "Encontrar un experto",
      otherTestimonials: "Otros testimonios",
      viewAllTestimonials: "Ver todos los testimonios",
      shareOnFacebook: "Compartir en Facebook",
      shareByEmail: "Compartir por correo",
      copyLink: "Copiar enlace",
      secured: "Seguro",
      lessThan5Min: "Menos de 5 min",
      worldwide: "Mundial",
      reviews: "reseñas",
      minutesAbbrev: "minutos",
      testimonialPageTitle: "Testimonio de",
      testimonialPageDescription:
        "Descubre la experiencia de nuestros usuarios con nuestros abogados y expatriados expertos. Consejos legales y prácticos para expatriados.",
      lawyerConsultation: "Consulta con abogado",
      expatConsultation: "Consulta con expatriado",
      readTestimonial: "Leer testimonio de",
      userExperience: "Experiencia de usuario",
      expertAdvice: "Consejos de expertos",
      customerSatisfaction: "Satisfacción del cliente",
      internationalSupport: "Soporte internacional",
      starsOutOf5: "estrellas de 5",
    },
    de: {
      backToTestimonials: "Zurück zu Erfahrungsberichten",
      verified: "Verifiziert",
      solicitedLawyer: "Hat einen Anwalt konsultiert",
      solicitedExpat: "Hat einen Expat konsultiert",
      shareTestimonial: "Diesen Erfahrungsbericht teilen",
      serviceDetails: "Servicedetails",
      serviceUsed: "Verwendeter Service",
      duration: "Dauer",
      helpType: "Art der Hilfe",
      needHelp: "Brauchen Sie auch Hilfe?",
      helpDescription:
        "Erhalten Sie Hilfe von einem verifizierten Experten in weniger als 5 Minuten",
      findExpert: "Experten finden",
      otherTestimonials: "Andere Erfahrungsberichte",
      viewAllTestimonials: "Alle Erfahrungsberichte ansehen",
      shareOnFacebook: "Auf Facebook teilen",
      shareByEmail: "Per E-Mail teilen",
      copyLink: "Link kopieren",
      secured: "Gesichert",
      lessThan5Min: "Weniger als 5 Min",
      worldwide: "Weltweit",
      reviews: "Bewertungen",
      minutesAbbrev: "Minuten",
      testimonialPageTitle: "Erfahrungsbericht von",
      testimonialPageDescription:
        "Entdecken Sie die Erfahrungen unserer Nutzer mit unseren Experten-Anwälten und Expats. Rechtliche und praktische Beratung für Expats.",
      lawyerConsultation: "Anwaltsberatung",
      expatConsultation: "Expat-Beratung",
      readTestimonial: "Erfahrungsbericht lesen von",
      userExperience: "Benutzererfahrung",
      expertAdvice: "Expertenrat",
      customerSatisfaction: "Kundenzufriedenheit",
      internationalSupport: "Internationale Unterstützung",
      starsOutOf5: "Sterne von 5",
    },
    ru: {
      backToTestimonials: "Вернуться к отзывам",
      verified: "Проверено",
      solicitedLawyer: "Консультировался с юристом",
      solicitedExpat: "Консультировался с экспатом",
      shareTestimonial: "Поделиться этим отзывом",
      serviceDetails: "Детали услуги",
      serviceUsed: "Использованная услуга",
      duration: "Продолжительность",
      helpType: "Тип помощи",
      needHelp: "Нужна помощь тоже?",
      helpDescription:
        "Получите помощь от проверенного эксперта менее чем за 5 минут",
      findExpert: "Найти эксперта",
      otherTestimonials: "Другие отзывы",
      viewAllTestimonials: "Посмотреть все отзывы",
      shareOnFacebook: "Поделиться в Facebook",
      shareByEmail: "Поделиться по электронной почте",
      copyLink: "Скопировать ссылку",
      secured: "Защищено",
      lessThan5Min: "Менее 5 мин",
      worldwide: "По всему миру",
      reviews: "отзывов",
      minutesAbbrev: "минут",
      testimonialPageTitle: "Отзыв от",
      testimonialPageDescription:
        "Откройте для себя опыт наших пользователей с нашими экспертами-юристами и экспатами. Юридические и практические советы для экспатов.",
      lawyerConsultation: "Консультация юриста",
      expatConsultation: "Консультация экспата",
      readTestimonial: "Читать отзыв от",
      userExperience: "Опыт пользователя",
      expertAdvice: "Советы экспертов",
      customerSatisfaction: "Удовлетворенность клиентов",
      internationalSupport: "Международная поддержка",
      starsOutOf5: "звезд из 5",
    },
    hi: {
      backToTestimonials: "प्रशंसापत्रों पर वापस जाएं",
      verified: "सत्यापित",
      solicitedLawyer: "एक वकील से परामर्श लिया",
      solicitedExpat: "एक प्रवासी से परामर्श लिया",
      shareTestimonial: "इस प्रशंसापत्र को साझा करें",
      serviceDetails: "सेवा विवरण",
      serviceUsed: "उपयोग की गई सेवा",
      duration: "अवधि",
      helpType: "सहायता का प्रकार",
      needHelp: "आपको भी सहायता चाहिए?",
      helpDescription:
        "5 मिनट से कम समय में सत्यापित विशेषज्ञ से सहायता प्राप्त करें",
      findExpert: "विशेषज्ञ खोजें",
      otherTestimonials: "अन्य प्रशंसापत्र",
      viewAllTestimonials: "सभी प्रशंसापत्र देखें",
      shareOnFacebook: "फेसबुक पर साझा करें",
      shareByEmail: "ईमेल द्वारा साझा करें",
      copyLink: "लिंक कॉपी करें",
      secured: "सुरक्षित",
      lessThan5Min: "5 मिनट से कम",
      worldwide: "विश्वव्यापी",
      reviews: "समीक्षाएं",
      minutesAbbrev: "मिनट",
      testimonialPageTitle: "प्रशंसापत्र से",
      testimonialPageDescription:
        "हमारे विशेषज्ञ वकीलों और प्रवासियों के साथ हमारे उपयोगकर्ताओं के अनुभव की खोज करें। प्रवासियों के लिए कानूनी और व्यावहारिक सलाह।",
      lawyerConsultation: "वकील परामर्श",
      expatConsultation: "प्रवासी परामर्श",
      readTestimonial: "प्रशंसापत्र पढ़ें",
      userExperience: "उपयोगकर्ता अनुभव",
      expertAdvice: "विशेषज्ञ सलाह",
      customerSatisfaction: "ग्राहक संतुष्टि",
      internationalSupport: "अंतर्राष्ट्रीय समर्थन",
      starsOutOf5: "5 में से सितारे",
    },
    ch: {
      backToTestimonials: "返回评价",
      verified: "已验证",
      solicitedLawyer: "咨询了律师",
      solicitedExpat: "咨询了外籍人士",
      shareTestimonial: "分享此评价",
      serviceDetails: "服务详情",
      serviceUsed: "使用的服务",
      duration: "时长",
      helpType: "帮助类型",
      needHelp: "也需要帮助吗？",
      helpDescription: "在不到5分钟内从经验证的专家那里获得帮助",
      findExpert: "查找专家",
      otherTestimonials: "其他评价",
      viewAllTestimonials: "查看所有评价",
      shareOnFacebook: "在Facebook上分享",
      shareByEmail: "通过电子邮件分享",
      copyLink: "复制链接",
      secured: "安全",
      lessThan5Min: "少于5分钟",
      worldwide: "全球",
      reviews: "评论",
      minutesAbbrev: "分钟",
      testimonialPageTitle: "来自的评价",
      testimonialPageDescription:
        "了解我们的用户与我们的专家律师和外籍人士的经验。为外籍人士提供法律和实用建议。",
      lawyerConsultation: "律师咨询",
      expatConsultation: "外籍人士咨询",
      readTestimonial: "阅读评价来自",
      userExperience: "用户体验",
      expertAdvice: "专家建议",
      customerSatisfaction: "客户满意度",
      internationalSupport: "国际支持",
      starsOutOf5: "5星中的星",
    },
    pt: {
      backToTestimonials: "Voltar aos depoimentos",
      verified: "Verificado",
      solicitedLawyer: "Consultou um advogado",
      solicitedExpat: "Consultou um expatriado",
      shareTestimonial: "Compartilhar este depoimento",
      serviceDetails: "Detalhes do serviço",
      serviceUsed: "Serviço utilizado",
      duration: "Duração",
      helpType: "Tipo de ajuda",
      needHelp: "Precisa de ajuda também?",
      helpDescription:
        "Obtenha ajuda de um especialista verificado em menos de 5 minutos",
      findExpert: "Encontrar um especialista",
      otherTestimonials: "Outros depoimentos",
      viewAllTestimonials: "Ver todos os depoimentos",
      shareOnFacebook: "Compartilhar no Facebook",
      shareByEmail: "Compartilhar por e-mail",
      copyLink: "Copiar link",
      secured: "Seguro",
      lessThan5Min: "Menos de 5 min",
      worldwide: "Mundial",
      reviews: "avaliações",
      minutesAbbrev: "minutos",
      testimonialPageTitle: "Depoimento de",
      testimonialPageDescription:
        "Descubra a experiência de nossos usuários com nossos advogados e expatriados especialistas. Conselhos jurídicos e práticos para expatriados.",
      lawyerConsultation: "Consulta com advogado",
      expatConsultation: "Consulta com expatriado",
      readTestimonial: "Ler depoimento de",
      userExperience: "Experiência do usuário",
      expertAdvice: "Conselhos de especialistas",
      customerSatisfaction: "Satisfação do cliente",
      internationalSupport: "Suporte internacional",
      starsOutOf5: "estrelas de 5",
    },
    ar: {
      backToTestimonials: "العودة إلى الشهادات",
      verified: "تم التحقق",
      solicitedLawyer: "استشار محامياً",
      solicitedExpat: "استشار مغترباً",
      shareTestimonial: "شارك هذه الشهادة",
      serviceDetails: "تفاصيل الخدمة",
      serviceUsed: "الخدمة المستخدمة",
      duration: "المدة",
      helpType: "نوع المساعدة",
      needHelp: "هل تحتاج إلى مساعدة أيضاً؟",
      helpDescription: "احصل على مساعدة من خبير معتمد في أقل من 5 دقائق",
      findExpert: "ابحث عن خبير",
      otherTestimonials: "شهادات أخرى",
      viewAllTestimonials: "عرض جميع الشهادات",
      shareOnFacebook: "شارك على فيسبوك",
      shareByEmail: "شارك عبر البريد الإلكتروني",
      copyLink: "نسخ الرابط",
      secured: "مؤمّن",
      lessThan5Min: "أقل من 5 دقائق",
      worldwide: "عالمي",
      reviews: "مراجعات",
      minutesAbbrev: "دقائق",
      testimonialPageTitle: "شهادة من",
      testimonialPageDescription:
        "اكتشف تجربة مستخدمينا مع خبرائنا المحامين والمغتربين. نصائح قانونية وعملية للمغتربين.",
      lawyerConsultation: "استشارة محامي",
      expatConsultation: "استشارة مغترب",
      readTestimonial: "اقرأ شهادة من",
      userExperience: "تجربة المستخدم",
      expertAdvice: "نصيحة الخبير",
      customerSatisfaction: "رضا العملاء",
      internationalSupport: "دعم دولي",
      starsOutOf5: "نجوم من أصل 5",
    },
  };

  const t = texts[language as keyof typeof texts] || texts.en;

  // SEO variables used in JSX - SEO effect is handled before early return
  const currentTitle = testimonialData.title;
  const currentContent = testimonialData.fullcontent;
  const pageTitle = `${t.testimonialPageTitle} ${testimonialData.clientName} - ${currentTitle}`;
  const pageDescription = `${t.testimonialPageDescription} ${currentContent.substring(0, 160)}...`;
  const countryName = getCountryName(testimonialData.clientCountry);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Modern header with gradient and visual effects / Header moderne avec gradient et effets visuels */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 pointer-events-none"></div>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <button
              onClick={() => navigate("/testimonials")}
              className="group flex items-center space-x-3 text-white/80 hover:text-white mb-8 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-xl p-3 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20"
              aria-label={t.backToTestimonials}
            >
              <ArrowLeft
                size={20}
                className="group-hover:-translate-x-1 transition-transform duration-300"
              />
              <span className="font-semibold">
                {/* {t.backToTestimonials} */}
                {intl.formatMessage({ id: "testimonial.backToTestimonials" })}
              </span>
            </button>

            <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-8 space-y-6 lg:space-y-0">
              {/* Avatar with modern design / Avatar avec design moderne */}
              <div className="flex-shrink-0 mx-auto lg:mx-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-white/20 rounded-3xl blur-xl"></div>
                  <div className="relative w-32 h-32 rounded-3xl overflow-hidden border-4 border-white/30 shadow-2xl">
                    <img
                      src={testimonialData.clientAvatar}
                      alt={`${t.readTestimonial} ${testimonialData.clientName}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 text-center lg:text-left">
                {/* Modern exchange type badge / Badge type d'échange moderne */}
                <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white">
                  {testimonialData.serviceType === "lawyer_call" ? (
                    <Briefcase size={16} className="text-red-400" />
                  ) : (
                    <User size={16} className="text-blue-400" />
                  )}

                  <span className="font-semibold text-sm">
                    {testimonialData.serviceType === "lawyer_call"
                      ? intl.formatMessage({
                          id: "testimonial.solicitedLawyer",
                        })
                      : intl.formatMessage({
                          id: "testimonial.solicitedExpat",
                        })}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap mb-4">
                  <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight">
                    {testimonialData.clientName}
                  </h1>
                  {/* Early Beta User Badge */}
                  <span className="inline-flex items-center px-3 py-1 text-xs sm:text-sm font-semibold rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg whitespace-nowrap">
                    Early Beta User
                  </span>
                  {testimonialData.verified && (
                    <span className="inline-flex items-center gap-2 bg-green-500/20 border border-green-400/30 text-green-300 text-xs sm:text-sm px-3 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap">
                      <Shield size={14} />
                      {intl.formatMessage({ id: "testimonial.verified" })}
                    </span>
                  )}
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-6 text-white/80 mb-6">
                  <div className="flex items-center justify-center lg:justify-start space-x-2">
                    <MapPin size={18} className="text-blue-400" />
                    <span className="font-medium">{countryName}</span>
                  </div>
                  <div className="flex items-center justify-center lg:justify-start space-x-2">
                    <Calendar size={18} className="text-purple-400" />
                    <span className="font-medium">{formattedDate}</span>
                  </div>
                  <div className="flex items-center justify-center lg:justify-start space-x-2">
                    <Clock size={18} className="text-orange-400" />
                    <span className="font-medium">
                      {testimonialData.duration}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
                  <div
                    className="flex"
                    role="img"
                    aria-label={`${testimonialData.rating} ${t.starsOutOf5}`}
                  >
                    {stars}
                  </div>
                  <span className="text-white/90 font-semibold">
                    ({testimonialData.rating}/5)
                  </span>
                </div>

                <h2 className="text-2xl lg:text-3xl font-bold text-white/95 leading-relaxed">
                  {testimonialData.title}
                </h2>
              </div>
            </div>
          </div>
        </section>

        {/* Main content with modern design / Contenu principal avec design moderne */}
        <main className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Main content / Contenu principal */}
            <article className="xl:col-span-2">
              <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
                {/* Subtle gradient effect / Effet de gradient subtil */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/30 pointer-events-none"></div>

                <div className="relative z-10 p-8 lg:p-12">
                  <div className="prose prose-lg max-w-none">
                    {(testimonialData.fullcontent || "")
                      .split("\n\n")
                      .map((paragraph: string, index: number) => (
                        <p
                          key={index}
                          className="text-gray-700 leading-8 mb-6 last:mb-0 text-lg"
                        >
                          {paragraph.trim()}
                        </p>
                      ))}
                  </div>

                  {/* Modern sharing section / Section de partage moderne */}
                  <div className="border-t border-gray-200 pt-8 mt-12">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                      <Share2 size={24} className="text-blue-500" />
                      {/* {t.shareTestimonial} */}
                      {intl.formatMessage({
                        id: "testimonial.shareTestimonial",
                      })}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {[
                        

                        {
                          platform: "facebook",
                          icon: Facebook,
                          title: intl.formatMessage({
                            id: "testimonial.shareOnFacebook",
                          }),
                          bg: "bg-blue-600 hover:bg-blue-700",
                        },
                        {
                          platform: "email",
                          icon: Mail,
                        
                          title: intl.formatMessage({
                            id: "testimonial.shareByEmail",
                          }),
                          bg: "bg-gray-600 hover:bg-gray-700",
                        },
                        {
                          platform: "copy",
                          icon: Share2,
                       
                          title: intl.formatMessage({
                            id: "testimonial.copyLink",
                          }),
                          bg: "bg-green-600 hover:bg-green-700",
                        },
                      ].map(({ platform, icon: Icon, title, bg }) => (
                        <button
                          key={platform}
                          onClick={() => handleShare(platform)}
                          className={`group flex items-center gap-3 ${bg} text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                          title={title}
                          aria-label={title}
                        >
                          <Icon size={20} />
                          <span className="hidden sm:inline">{title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Modern sidebar / Sidebar moderne */}
            <aside className="xl:col-span-1 space-y-8">
              {/* Service details with modern design / Détails du service avec design moderne */}
              <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white pointer-events-none"></div>

                <div className="relative z-10 p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${testimonialData.serviceType === "lawyer_call" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}
                    >
                      {testimonialData.serviceType === "lawyer_call" ? (
                        <Briefcase size={20} />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                
                    {intl.formatMessage({
                      id: "testimonial.serviceDetails",
                    })}
                  </h3>

                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-sm text-gray-500 block font-medium mb-1">
                      
                        {intl.formatMessage({
                          id: "testimonial.serviceUsed",
                        })}
                      </span>
                      <div className="font-bold text-gray-900 text-lg">
                        {testimonialData.service_used}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-sm text-gray-500 block font-medium mb-1">
                      
                        {intl.formatMessage({
                          id: "testimonial.duration",
                        })}
                      </span>
                      <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        <Clock size={18} className="text-orange-500" />
                        {testimonialData.duration}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-sm text-gray-500 block font-medium mb-3">
                     
                        {intl.formatMessage({
                          id: "testimonial.helpType",
                        })}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {(testimonialData.help_type as string[]).map(
                          (type: string, index: number) => (
                            <span
                              key={index}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                                testimonialData.serviceType === "lawyer_call"
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : "bg-blue-100 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {type}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern CTA / CTA moderne */}
              <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 pointer-events-none"></div>

                <div className="relative z-10 p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white mb-4 shadow-lg">
                    <Shield size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                
                    {intl.formatMessage({
                      id: "testimonial.needHelp",
                    })}
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                 
                    {intl.formatMessage({
                      id: "testimonial.helpDescription",
                    })}
                  </p>

                  {/* Reassurance points / Points de réassurance */}
                  <div className="flex flex-wrap justify-center gap-3 mb-6 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
                      <Check size={14} />
                  
                      {intl.formatMessage({
                        id: "testimonial.secured",
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-blue-600 font-medium">
                      <Clock size={14} />
                  
                      {intl.formatMessage({
                        id: "testimonial.lessThan5Min",
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-purple-600 font-medium">
                      <Globe size={14} />
                 
                      {intl.formatMessage({
                        id: "testimonial.worldwide",
                      })}
                    </span>
                  </div>

                  <a
                    href="/sos-appel"
                    className="group inline-flex items-center justify-center w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-lg hover:from-red-700 hover:to-orange-700 transition-all duration-300 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                
                    {intl.formatMessage({
                      id: "testimonial.findExpert",
                    })}
                    <ChevronRightIcon
                      size={20}
                      className="ml-2 group-hover:translate-x-1 transition-transform duration-300"
                    />
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* Related testimonials section with modern design / Section témoignages connexes avec design moderne */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 pointer-events-none"></div>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20 mb-6">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-bold">
                4,9/5 • +2 500 {" "}
            
                {intl.formatMessage({
                  id: "testimonial.reviews",
                })}
              </span>
            </div>

            <h3 className="text-4xl lg:text-5xl font-black text-white mb-4">
           
              {intl.formatMessage({
                id: "testimonial.otherTestimonials",
              })}
            </h3>
            <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">

               {intl.formatMessage({
                id: "testimonialOtherReviews",
              })}
             
            </p>

            <a
              href="/testimonials"
              className="group inline-flex items-center gap-3 bg-white text-gray-900 hover:bg-gray-100 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-white/50"
            >
         
              {intl.formatMessage({
                id: "testimonial.viewAllTestimonials",
              })}
              <ChevronRightIcon
                size={20}
                className="group-hover:translate-x-1 transition-transform duration-300"
              />
            </a>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default TestimonialDetail;
