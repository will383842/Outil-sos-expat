import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import {
  Users,
  FileText,
  ArrowRight,
  DollarSign,
  Languages,
  Sparkles,
  Gift,
  Layout as LayoutIcon,
} from "lucide-react";
import Layout from "../components/layout/Layout";
import { useApp } from "../contexts/AppContext";
import { useLocalePath } from "../multilingual-system";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * TermsBloggers - CGU pour les Bloggeurs SOS Expat
 * - Support multilingue (9 langues)
 * - Contenu éditable depuis l'admin (collection `legal_documents` type "terms_bloggers")
 * - Design harmonisé avec les autres pages CGU (thème violet/purple)
 */

type SupportedLanguage = "fr" | "en" | "es" | "de" | "ru" | "hi" | "ch" | "pt" | "ar";

const TermsBloggers: React.FC = () => {
  const { language } = useApp();
  const getLocalePath = useLocalePath();

  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    (language as SupportedLanguage) || "fr"
  );

  useEffect(() => {
    if (language) {
      setSelectedLanguage(language as SupportedLanguage);
    }
  }, [language]);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, "legal_documents"),
          where("type", "==", "terms_bloggers"),
          where("language", "==", selectedLanguage),
          where("isActive", "==", true),
          orderBy("updatedAt", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setContent((doc.data() as { content: string }).content);
        } else {
          setContent("");
        }
      } catch (error) {
        console.error("Error fetching terms:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTerms();
  }, [selectedLanguage]);

  const translations = {
    fr: {
      title: "CGU Bloggeurs SOS Expat",
      subtitle: "Conditions générales d'utilisation pour les bloggeurs et créateurs de contenu partenaires SOS Expat",
      lastUpdated: "Version 1.0 – Dernière mise à jour : 1er février 2026",
      loading: "Chargement...",
      joinNetwork: "Devenir Bloggeur Partenaire",
      trustedByHelpers: "Rejoignez notre réseau de bloggeurs partenaires",
      keyFeatures: "Points clés",
      features: [
        "$10 par appel client via widget/lien",
        "$5 par appel des prestataires recrutés",
        "Widget d'intégration fourni",
        "Ressources HD : logos, bannières, textes",
      ],
      languageToggle: "Changer de langue",
      sections: {
        definitions: "Définitions",
        scope: "Objet et acceptation",
        program: "Programme d'affiliation",
        commissions: "Commissions et rémunération",
        antifraud: "Règles anti-fraude",
        obligations: "Obligations du Bloggeur",
        payment: "Paiement des commissions",
        suspension: "Suspension et résiliation",
        data: "Données personnelles",
        ip: "Propriété intellectuelle",
        liability: "Responsabilité",
        law: "Droit applicable",
        misc: "Dispositions diverses",
        contact: "Contact",
      },
      readyToJoin: "Prêt à devenir bloggeur partenaire SOS Expat ?",
      readySubtitle: "Monétisez votre blog en intégrant notre widget et en recommandant nos services aux expatriés.",
      startNow: "S'inscrire maintenant",
      contactUs: "Nous contacter",
      anchorTitle: "Sommaire",
      editHint: "Document éditable depuis la console admin",
      ctaHero: "Commencer",
      heroBadge: "Programme Bloggeurs — Lancé en 2026",
      contactForm: "Formulaire de contact",
    },
    en: {
      title: "SOS Expat Blogger Terms",
      subtitle: "Terms of Use for SOS Expat partner bloggers and content creators",
      lastUpdated: "Version 1.0 – Last updated: February 1, 2026",
      loading: "Loading...",
      joinNetwork: "Become a Partner Blogger",
      trustedByHelpers: "Join our partner blogger network",
      keyFeatures: "Key features",
      features: [
        "$10 per client call via widget/link",
        "$5 per call from recruited providers",
        "Integration widget provided",
        "HD resources: logos, banners, texts",
      ],
      languageToggle: "Switch language",
      sections: {
        definitions: "Definitions",
        scope: "Purpose and Acceptance",
        program: "Affiliate Program",
        commissions: "Commissions and Compensation",
        antifraud: "Anti-fraud Rules",
        obligations: "Blogger Obligations",
        payment: "Commission Payments",
        suspension: "Suspension and Termination",
        data: "Personal Data",
        ip: "Intellectual Property",
        liability: "Liability",
        law: "Governing Law",
        misc: "Miscellaneous",
        contact: "Contact",
      },
      readyToJoin: "Ready to become an SOS Expat partner blogger?",
      readySubtitle: "Monetize your blog by integrating our widget and recommending our expat services.",
      startNow: "Sign up now",
      contactUs: "Contact us",
      anchorTitle: "Overview",
      editHint: "Document editable from admin console",
      ctaHero: "Get started",
      heroBadge: "Blogger Program — Launched 2026",
      contactForm: "Contact Form",
    },
    es: {
      title: "Términos para Bloggers SOS Expat",
      subtitle: "Términos de uso para bloggers y creadores de contenido socios de SOS Expat",
      lastUpdated: "Versión 1.0 – Última actualización: 1 de febrero de 2026",
      loading: "Cargando...",
      joinNetwork: "Convertirse en Blogger Socio",
      trustedByHelpers: "Únete a nuestra red de bloggers socios",
      keyFeatures: "Características clave",
      features: [
        "$10 por llamada de cliente via widget/enlace",
        "$5 por llamada de proveedores reclutados",
        "Widget de integración incluido",
        "Recursos HD: logos, banners, textos",
      ],
      languageToggle: "Cambiar idioma",
      sections: {
        definitions: "Definiciones",
        scope: "Objeto y aceptación",
        program: "Programa de afiliados",
        commissions: "Comisiones y compensación",
        antifraud: "Reglas antifraude",
        obligations: "Obligaciones del Blogger",
        payment: "Pago de comisiones",
        suspension: "Suspensión y terminación",
        data: "Datos personales",
        ip: "Propiedad intelectual",
        liability: "Responsabilidad",
        law: "Ley aplicable",
        misc: "Disposiciones varias",
        contact: "Contacto",
      },
      readyToJoin: "¿Listo para convertirte en blogger socio de SOS Expat?",
      readySubtitle: "Monetiza tu blog integrando nuestro widget y recomendando nuestros servicios a expatriados.",
      startNow: "Inscribirse ahora",
      contactUs: "Contáctanos",
      anchorTitle: "Resumen",
      editHint: "Documento editable desde la consola de administración",
      ctaHero: "Empezar",
      heroBadge: "Programa de Bloggers — Lanzado en 2026",
      contactForm: "Formulario de contacto",
    },
    de: {
      title: "AGB für SOS Expat Blogger",
      subtitle: "Nutzungsbedingungen für SOS Expat Partner-Blogger und Content-Ersteller",
      lastUpdated: "Version 1.0 – Letzte Aktualisierung: 1. Februar 2026",
      loading: "Lädt...",
      joinNetwork: "Partner-Blogger werden",
      trustedByHelpers: "Schließen Sie sich unserem Partner-Blogger-Netzwerk an",
      keyFeatures: "Hauptmerkmale",
      features: [
        "$10 pro Kundengespräch via Widget/Link",
        "$5 pro Gespräch der geworbenen Anbieter",
        "Integrations-Widget inklusive",
        "HD-Ressourcen: Logos, Banner, Texte",
      ],
      languageToggle: "Sprache wechseln",
      sections: {
        definitions: "Definitionen",
        scope: "Gegenstand und Annahme",
        program: "Partnerprogramm",
        commissions: "Provisionen und Vergütung",
        antifraud: "Anti-Betrugsregeln",
        obligations: "Pflichten des Bloggers",
        payment: "Provisionszahlungen",
        suspension: "Aussetzung und Kündigung",
        data: "Personenbezogene Daten",
        ip: "Geistiges Eigentum",
        liability: "Haftung",
        law: "Anwendbares Recht",
        misc: "Sonstiges",
        contact: "Kontakt",
      },
      readyToJoin: "Bereit, SOS Expat Partner-Blogger zu werden?",
      readySubtitle: "Monetarisieren Sie Ihren Blog durch Integration unseres Widgets und Empfehlung unserer Dienste.",
      startNow: "Jetzt anmelden",
      contactUs: "Kontaktieren Sie uns",
      anchorTitle: "Übersicht",
      editHint: "Dokument über Admin-Konsole bearbeitbar",
      ctaHero: "Loslegen",
      heroBadge: "Blogger-Programm — Gestartet 2026",
      contactForm: "Kontaktformular",
    },
    ru: {
      title: "Условия для Блоггеров SOS Expat",
      subtitle: "Условия использования для партнёров-блоггеров и создателей контента SOS Expat",
      lastUpdated: "Версия 1.0 – Последнее обновление: 1 февраля 2026 г.",
      loading: "Загрузка...",
      joinNetwork: "Стать блоггером-партнёром",
      trustedByHelpers: "Присоединяйтесь к нашей сети партнёров-блоггеров",
      keyFeatures: "Ключевые особенности",
      features: [
        "$10 за каждый клиентский звонок через виджет/ссылку",
        "$5 за звонки привлечённых провайдеров",
        "Интеграционный виджет в комплекте",
        "HD-ресурсы: логотипы, баннеры, тексты",
      ],
      languageToggle: "Сменить язык",
      sections: {
        definitions: "Определения",
        scope: "Предмет и принятие",
        program: "Партнёрская программа",
        commissions: "Комиссии и вознаграждение",
        antifraud: "Правила против мошенничества",
        obligations: "Обязанности блоггера",
        payment: "Выплата комиссий",
        suspension: "Приостановка и прекращение",
        data: "Персональные данные",
        ip: "Интеллектуальная собственность",
        liability: "Ответственность",
        law: "Применимое право",
        misc: "Разное",
        contact: "Контакт",
      },
      readyToJoin: "Готовы стать блоггером-партнёром SOS Expat?",
      readySubtitle: "Монетизируйте свой блог, интегрировав наш виджет и рекомендуя наши услуги для эмигрантов.",
      startNow: "Зарегистрироваться сейчас",
      contactUs: "Свяжитесь с нами",
      anchorTitle: "Обзор",
      editHint: "Документ редактируется из консоли администратора",
      ctaHero: "Начать",
      heroBadge: "Программа для блоггеров — Запущена в 2026 году",
      contactForm: "Контактная форма",
    },
    hi: {
      title: "SOS Expat ब्लॉगर शर्तें",
      subtitle: "SOS Expat भागीदार ब्लॉगर्स और कंटेंट क्रिएटर्स के लिए उपयोग की शर्तें",
      lastUpdated: "संस्करण 1.0 – अंतिम अपडेट: 1 फरवरी 2026",
      loading: "लोड हो रहा है...",
      joinNetwork: "भागीदार ब्लॉगर बनें",
      trustedByHelpers: "हमारे भागीदार ब्लॉगर नेटवर्क से जुड़ें",
      keyFeatures: "मुख्य विशेषताएं",
      features: [
        "विजेट/लिंक के माध्यम से $10 प्रति क्लाइंट कॉल",
        "भर्ती प्रदाताओं के कॉल पर $5",
        "एकीकरण विजेट प्रदान किया गया",
        "HD संसाधन: लोगो, बैनर, टेक्स्ट",
      ],
      languageToggle: "भाषा बदलें",
      sections: {
        definitions: "परिभाषाएँ",
        scope: "उद्देश्य और स्वीकृति",
        program: "संबद्ध कार्यक्रम",
        commissions: "कमीशन और मुआवज़ा",
        antifraud: "धोखाधड़ी-रोधी नियम",
        obligations: "ब्लॉगर के दायित्व",
        payment: "कमीशन भुगतान",
        suspension: "निलंबन और समाप्ति",
        data: "व्यक्तिगत डेटा",
        ip: "बौद्धिक संपदा",
        liability: "दायित्व",
        law: "लागू कानून",
        misc: "विविध",
        contact: "संपर्क",
      },
      readyToJoin: "SOS Expat भागीदार ब्लॉगर बनने के लिए तैयार हैं?",
      readySubtitle: "हमारा विजेट एकीकृत करके और प्रवासी सेवाओं की सिफारिश करके अपने ब्लॉग को मोनेटाइज़ करें।",
      startNow: "अभी साइन अप करें",
      contactUs: "हमसे संपर्क करें",
      anchorTitle: "अवलोकन",
      editHint: "व्यवस्थापक कंसोल से संपादन योग्य दस्तावेज़",
      ctaHero: "शुरू करें",
      heroBadge: "ब्लॉगर कार्यक्रम — 2026 में लॉन्च",
      contactForm: "संपर्क फ़ॉर्म",
    },
    ch: {
      title: "SOS Expat 博客作者条款",
      subtitle: "SOS Expat 合作博主和内容创作者使用条款",
      lastUpdated: "版本 1.0 – 最后更新：2026年2月1日",
      loading: "加载中...",
      joinNetwork: "成为合作博主",
      trustedByHelpers: "加入我们的合作博主网络",
      keyFeatures: "主要功能",
      features: [
        "通过小工具/链接每次客户通话 $10",
        "每次招募提供商通话 $5",
        "提供集成小工具",
        "高清资源：标志、横幅、文字",
      ],
      languageToggle: "切换语言",
      sections: {
        definitions: "定义",
        scope: "目的和接受",
        program: "联盟计划",
        commissions: "佣金和报酬",
        antifraud: "反欺诈规则",
        obligations: "博主义务",
        payment: "佣金支付",
        suspension: "暂停和终止",
        data: "个人数据",
        ip: "知识产权",
        liability: "责任",
        law: "适用法律",
        misc: "杂项",
        contact: "联系方式",
      },
      readyToJoin: "准备成为 SOS Expat 合作博主吗？",
      readySubtitle: "通过集成我们的小工具和推荐海外华人服务来从您的博客中获利。",
      startNow: "立即注册",
      contactUs: "联系我们",
      anchorTitle: "概览",
      editHint: "可从管理控制台编辑文档",
      ctaHero: "开始",
      heroBadge: "博主计划 — 2026年启动",
      contactForm: "联系表单",
    },
    ar: {
      title: "شروط المدونين SOS Expat",
      subtitle: "شروط الاستخدام لمدوني وصانعي المحتوى الشركاء في SOS Expat",
      lastUpdated: "الإصدار 1.0 – آخر تحديث: 1 فبراير 2026",
      loading: "جارٍ التحميل...",
      joinNetwork: "كن مدوناً شريكاً",
      trustedByHelpers: "انضم إلى شبكة المدونين الشركاء لدينا",
      keyFeatures: "الميزات الرئيسية",
      features: [
        "$10 لكل مكالمة عميل عبر الأداة/الرابط",
        "$5 لكل مكالمة للمزودين المجندين",
        "أداة التكامل مرفقة",
        "موارد عالية الدقة: شعارات، لافتات، نصوص",
      ],
      languageToggle: "تغيير اللغة",
      sections: {
        definitions: "التعريفات",
        scope: "الهدف والقبول",
        program: "برنامج الشراكة",
        commissions: "العمولات والتعويضات",
        antifraud: "قواعد مكافحة الاحتيال",
        obligations: "التزامات المدون",
        payment: "دفع العمولات",
        suspension: "التعليق والإنهاء",
        data: "البيانات الشخصية",
        ip: "الملكية الفكرية",
        liability: "المسؤولية",
        law: "القانون الحاكم",
        misc: "متفرقات",
        contact: "اتصل",
      },
      readyToJoin: "هل أنت مستعد لتصبح مدوناً شريكاً في SOS Expat؟",
      readySubtitle: "حقق أرباحاً من مدونتك بدمج أداتنا والتوصية بخدماتنا للمغتربين.",
      startNow: "سجل الآن",
      contactUs: "اتصل بنا",
      anchorTitle: "نظرة عامة",
      editHint: "مستند قابل للتحرير من وحدة التحكم الإدارية",
      ctaHero: "ابدأ",
      heroBadge: "برنامج المدونين — تم الإطلاق 2026",
      contactForm: "نموذج الاتصال",
    },
    pt: {
      title: "Termos para Bloggers SOS Expat",
      subtitle: "Termos de uso para bloggers e criadores de conteúdo parceiros da SOS Expat",
      lastUpdated: "Versão 1.0 – Última atualização: 1 de fevereiro de 2026",
      loading: "Carregando...",
      joinNetwork: "Torne-se Blogger Parceiro",
      trustedByHelpers: "Junte-se à nossa rede de bloggers parceiros",
      keyFeatures: "Características principais",
      features: [
        "$10 por chamada de cliente via widget/link",
        "$5 por chamada dos provedores recrutados",
        "Widget de integração fornecido",
        "Recursos HD: logos, banners, textos",
      ],
      languageToggle: "Mudar idioma",
      sections: {
        definitions: "Definições",
        scope: "Objetivo e aceitação",
        program: "Programa de afiliados",
        commissions: "Comissões e compensação",
        antifraud: "Regras antifraude",
        obligations: "Obrigações do Blogger",
        payment: "Pagamento de comissões",
        suspension: "Suspensão e rescisão",
        data: "Dados pessoais",
        ip: "Propriedade intelectual",
        liability: "Responsabilidade",
        law: "Lei aplicável",
        misc: "Diversos",
        contact: "Contato",
      },
      readyToJoin: "Pronto para se tornar blogger parceiro da SOS Expat?",
      readySubtitle: "Monetize seu blog integrando nosso widget e recomendando nossos serviços a expatriados.",
      startNow: "Inscreva-se agora",
      contactUs: "Entre em contato",
      anchorTitle: "Resumo",
      editHint: "Documento editável a partir do console de administração",
      ctaHero: "Começar",
      heroBadge: "Programa de Bloggers — Lançado em 2026",
      contactForm: "Formulário de contato",
    },
  };

  const t = translations[selectedLanguage];

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setSelectedLanguage(newLang);
  };

  // Parser Markdown
  const parseMarkdownContent = (text: string) => {
    const lines = text.split("\n");
    const elements: JSX.Element[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === "") continue;

      if (line.trim() === "---") {
        elements.push(
          <hr key={currentIndex++} className="my-8 border-t-2 border-gray-200" />
        );
        continue;
      }

      if (line.startsWith("# ")) {
        const title = line.substring(2).replace(/\*\*/g, "");
        elements.push(
          <h1
            key={currentIndex++}
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-purple-600 pb-4"
          >
            {title}
          </h1>
        );
        continue;
      }

      if (line.startsWith("## ")) {
        const title = line.substring(3).trim();
        const match = title.match(/^(\d+)\.\s*(.*)$/);
        if (match) {
          const sectionNumber = match[1];
          const sectionTitle = match[2].replace(/\*\*/g, "");
          elements.push(
            <h2
              id={`section-${sectionNumber}`}
              key={currentIndex++}
              className="scroll-mt-28 text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6 flex items-center gap-3"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-bold shadow-lg">
                {sectionNumber}
              </span>
              <span>{sectionTitle}</span>
            </h2>
          );
        } else {
          elements.push(
            <h2
              key={currentIndex++}
              className="text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6"
            >
              {title.replace(/\*\*/g, "")}
            </h2>
          );
        }
        continue;
      }

      if (line.startsWith("### ")) {
        const title = line.substring(4).replace(/\*\*/g, "");
        elements.push(
          <h3
            key={currentIndex++}
            className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-purple-600 pl-4"
          >
            {title}
          </h3>
        );
        continue;
      }

      const numberedMatch = line.match(/^(\d+\.\d+\.?)\s+(.*)$/);
      if (numberedMatch) {
        const number = numberedMatch[1];
        const numberContent = numberedMatch[2];
        const formattedContent = numberContent.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-semibold text-gray-900">$1</strong>'
        );
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gray-50 border-l-4 border-purple-600 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-purple-600 mr-2">{number}</span>
              <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedContent) }} />
            </p>
          </div>
        );
        continue;
      }

      if (line.startsWith("**") && line.endsWith("**")) {
        const boldText = line.slice(2, -2);
        elements.push(
          <div
            className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-6 my-6"
            key={currentIndex++}
          >
            <p className="font-bold text-gray-900 text-lg">{boldText}</p>
          </div>
        );
        continue;
      }

      if (line.includes("Pour toute question") || line.includes("For any questions")) {
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-300 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold shadow-lg">
                14
              </span>
              Contact
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="https://sos-expat.com/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              {t.contactForm}
            </a>
          </div>
        );
        continue;
      }

      if (line.trim()) {
        const formattedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
          .replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');
        elements.push(
          <p
            key={currentIndex++}
            className="mb-4 text-gray-800 leading-relaxed text-base"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedLine) }}
          />
        );
      }
    }

    return elements;
  };

  const defaultFr = `
# Conditions Générales d'Utilisation – Bloggeurs & Créateurs de Contenu SOS Expat

**SOS Expat by WorldExpat OÜ** (la « **Plateforme** », « **SOS** », « **nous** »)

**Version 1.0 – Dernière mise à jour : 1er février 2026**

---

## 1. Définitions

**Bloggeur** (ou « **Créateur de Contenu** ») : toute personne physique ou morale inscrite au programme d'affiliation SOS Expat pour intégrer le widget SOS Expat sur son site/blog et percevoir des commissions sur les appels clients générés, ainsi que sur les prestataires recrutés.

**Widget SOS Expat** : composant web fourni par SOS Expat à intégrer sur le site/blog du Bloggeur, permettant aux visiteurs d'accéder directement aux services d'assistance aux expatriés.

**Code Affilié Client** : identifiant unique permettant le tracking des appels clients générés via le lien ou le widget du Bloggeur.

**Code de Recrutement Prestataire** : identifiant permettant au Bloggeur de recruter des prestataires (avocats, experts expatriés) et de percevoir des commissions sur leurs appels.

**Code de Recrutement Bloggeur** : identifiant permettant de parrainer d'autres Bloggeurs et de percevoir des commissions sur leurs performances.

**Commission Directe** : rémunération versée pour chaque appel payant client généré via le widget ou le lien affilié du Bloggeur.

**Commission de Recrutement Prestataire** : rémunération versée pour chaque appel payant réalisé par un prestataire recruté par le Bloggeur, pendant une période de **12 mois** à compter de l'inscription dudit prestataire.

**Commission de Recrutement Bloggeur** : rémunération versée pour chaque appel généré par un Bloggeur recruté (Filleul N1) ou par les filleuls de ce Bloggeur (Filleul N2), pendant une période de **12 mois** à compter de l'inscription.

**Filleul N1** : Bloggeur ou prestataire directement recruté par le Bloggeur.

**Filleul N2** : Bloggeur recruté par un Filleul N1 du Bloggeur.

---

## 2. Objet et acceptation

2.1. Les présentes CGU régissent la participation au programme d'affiliation Bloggeurs de SOS Expat.

2.2. En cochant la case d'acceptation lors de l'inscription, le Bloggeur accepte l'intégralité des présentes CGU. Cette acceptation constitue une **signature électronique valide** au sens du règlement **eIDAS (UE) n° 910/2014**.

2.3. **Traçabilité de l'acceptation.** SOS Expat conserve un journal d'audit horodaté incluant : adresse IP, identifiant de session, user-agent, version des CGU acceptée, empreinte numérique du document accepté et identifiant du Bloggeur. Ces données sont conservées **10 ans** conformément aux obligations légales.

2.4. **Modifications.** SOS Expat peut modifier les CGU et/ou les barèmes de commissions avec effet prospectif. Une notification est adressée au Bloggeur (email ou dashboard) au moins **15 jours** avant l'entrée en vigueur. L'usage continu après notification vaut acceptation.

2.5. **Capacité.** Le Bloggeur déclare être majeur et capable juridiquement. L'inscription est **interdite aux mineurs**.

---

## 3. Programme d'affiliation

3.1. **Inscription.** L'accès au programme nécessite : (i) une inscription valide avec indication de l'URL du site/blog, (ii) l'acceptation des présentes CGU.

3.2. **Codes attribués.** Après validation, le Bloggeur reçoit :
- Un **Code Affilié Client** : à intégrer dans le widget ou les liens vers SOS Expat
- Un **Code de Recrutement Prestataire** : pour recruter des avocats/experts expatriés
- Un **Code de Recrutement Bloggeur** : pour parrainer d'autres bloggeurs

3.3. **Widget SOS Expat.** SOS Expat fournit au Bloggeur un widget d'intégration (code HTML/JavaScript) à insérer sur son site. Le widget doit être intégré de manière visible et fonctionnelle.

3.4. **Ressources marketing.** SOS Expat met à disposition :
- Logos HD (plusieurs formats et couleurs)
- Bannières publicitaires (différentes tailles)
- Textes prêts à l'emploi (articles, descriptions)
- Guide d'intégration technique
- QR codes personnalisés

3.5. **Validation du site.** SOS Expat se réserve le droit de vérifier et valider l'intégration du widget avant activation des commissions.

---

## 4. Commissions et rémunération

4.1. **Commission Directe – Appels Clients.** Le Bloggeur perçoit **$10** pour chaque appel payant généré via son widget ou son lien affilié client, sans limite de volume ni de durée.

4.2. **Commission de Recrutement Prestataire.** Le Bloggeur perçoit **$5** pour chaque appel payant réalisé par un prestataire qu'il a recruté, pendant **12 mois** à compter de la date d'inscription du prestataire. Passé ce délai, les commissions de recrutement prestataire cessent automatiquement.

4.3. **Commission de Recrutement Bloggeur (Filleul N1).** Le Bloggeur perçoit une commission sur chaque appel client généré par ses Filleuls Bloggeurs N1, pendant **12 mois** à compter de la date d'inscription du Filleul N1. **Conditions cumulatives pour percevoir cette commission :**
- Le Bloggeur doit réaliser un minimum de **$50 de commissions directes** (article 4.1) au cours du mois civil concerné
- Le Bloggeur doit s'assurer de la formation et du suivi de ses Filleuls N1 (au minimum : partage du guide d'intégration, réponse aux questions dans un délai de 48h)
- En l'absence de ces conditions sur un mois donné, les commissions N1 de ce mois sont suspendues (non rétroactives)

4.4. **Commission de Recrutement Bloggeur (Filleul N2).** Le Bloggeur perçoit une commission sur chaque appel généré par ses Filleuls N2, pendant **12 mois** à compter de la date d'inscription du Filleul N2. Les **mêmes conditions cumulatives** qu'en 4.3 s'appliquent.

4.5. **Durée maximale des commissions d'affiliation.** Les commissions sur les Filleuls (N1 et N2) et sur les prestataires recrutés sont versées pendant **12 mois maximum** à compter de la date d'inscription de chaque filleul/prestataire. Passé ce délai, le Bloggeur conserve uniquement ses commissions directes (article 4.1).

4.6. **Seuils de paiement.** Les commissions sont validées après :
- Période de rétractation client (14 jours)
- Validation anti-fraude automatique
- Atteinte du seuil minimum de retrait (**$20**)

4.7. **Barèmes de commissions (récapitulatif).**

| Type de commission | Montant | Durée |
|---|---|---|
| Appel client direct (widget/lien) | $10/appel | Illimitée |
| Appel d'un prestataire recruté | $5/appel | 12 mois |
| Appel généré par Filleul Bloggeur N1 | Variable | 12 mois |
| Appel généré par Filleul Bloggeur N2 | Variable | 12 mois |

4.8. **Bonus de performance.** Des bonus supplémentaires peuvent être accordés pour les Bloggeurs générant un volume élevé d'appels ou de recrutements.

---

## 5. Règles anti-fraude

5.1. **Interdictions strictes.** Sont formellement interdits :
- L'auto-parrainage ou parrainage croisé fictif
- La génération artificielle d'appels (faux clients, self-calls)
- L'utilisation de bots ou scripts automatisés
- La création de comptes multiples
- L'intégration du widget sur des sites non déclarés
- Toute manipulation des systèmes de tracking

5.2. **Détection automatique.** SOS Expat utilise des systèmes de détection incluant :
- Analyse des patterns d'appels suspects
- Vérification de l'authenticité du trafic web
- Analyse des taux de conversion anormaux

5.3. **Sanctions.** En cas de fraude avérée ou suspectée :
- **Suspension immédiate** du compte
- **Annulation** de toutes les commissions concernées
- **Bannissement définitif** de la Plateforme
- **Poursuites judiciaires** le cas échéant

5.4. **Recours.** Le Bloggeur peut contester une sanction via le formulaire de contact dans un délai de **30 jours**.

---

## 6. Obligations du Bloggeur

6.1. **Intégration du Widget.** Le Bloggeur s'engage à :
- Intégrer le widget SOS Expat de manière visible sur son site
- Ne pas modifier le code du widget sans autorisation
- Maintenir le widget fonctionnel et à jour
- Signaler tout problème technique à SOS Expat

6.2. **Qualité du contenu.** Le Bloggeur s'engage à :
- Promouvoir SOS Expat de manière honnête et éthique
- Ne pas faire de promesses ou affirmations trompeuses sur les services
- Identifier clairement les contenus sponsorisés ou partenariaux
- Respecter les chartes graphiques et guidelines de marque SOS Expat

6.3. **Suivi des filleuls.** Le Bloggeur qui recrute d'autres Bloggeurs s'engage à :
- Partager le guide d'intégration et les ressources fournies par SOS Expat
- Répondre aux questions de ses Filleuls dans un délai de **48 heures**
- Assurer un suivi minimum pour garantir une intégration correcte du widget

6.4. **Conformité légale.** Le Bloggeur respecte toutes les lois applicables :
- Règles de publicité et de mention des partenariats commerciaux
- Protection des données de ses visiteurs (RGPD, mentions légales)
- Déclaration fiscale de ses revenus d'affiliation
- Respect des droits d'auteur et de propriété intellectuelle

6.5. **Indépendance.** Le Bloggeur agit en **indépendant** ; aucun lien d'emploi, mandat ou agence n'est créé avec SOS Expat.

---

## 7. Paiement des commissions

7.1. **KYC obligatoire.** Le Bloggeur doit compléter la vérification d'identité (KYC) **avant** tout retrait.

7.2. **Méthodes de paiement.** Les retraits sont disponibles via :
- Virement bancaire (SEPA/International)
- PayPal
- Wise

7.3. **Délais.** Les paiements sont traités sous **7 jours ouvrés** après validation.

7.4. **Seuil minimum.** Le retrait est possible à partir de **$20** de solde disponible.

7.5. **Fonds non réclamés.** En cas de non-complétion du KYC sous **180 jours**, les fonds sont considérés abandonnés conformément à l'article 8.7 des CGU générales.

7.6. **Taxes.** Le Bloggeur est seul responsable de la déclaration et du paiement de ses impôts et charges liés à ses revenus d'affiliation.

---

## 8. Suspension et résiliation

8.1. **Suspension temporaire.** SOS Expat peut suspendre un compte en cas de :
- Suspicion de fraude ou de manipulation de trafic
- Violation des CGU
- Retrait du widget du site sans information préalable
- Inactivité prolongée (365+ jours sans aucune activité)

8.2. **Résiliation par le Bloggeur.** Le Bloggeur peut clôturer son compte à tout moment. Les commissions validées restent payables.

8.3. **Résiliation par SOS Expat.** En cas de violation grave, SOS Expat peut résilier le compte avec effet immédiat. Les commissions non validées sont annulées.

8.4. **Effets de la résiliation.** À la résiliation :
- Les Codes Affiliés sont désactivés
- Les Filleuls et prestataires recrutés sont réattribués à SOS Expat
- L'accès au dashboard est supprimé
- Le Bloggeur doit retirer le widget de son site dans un délai de **30 jours**

---

## 9. Données personnelles

9.1. **Responsable de traitement.** SOS Expat (WorldExpat OÜ) pour les données du programme Bloggeurs.

9.2. **Données collectées.** Identité, URL du site, coordonnées, performances, données de paiement, logs de connexion.

9.3. **Finalités.** Gestion du programme, paiement des commissions, prévention de la fraude, amélioration des services.

9.4. **Durée de conservation.** Données actives pendant la relation ; archives 10 ans après résiliation (obligations légales).

9.5. **Droits.** Accès, rectification, effacement, portabilité, opposition via contact@sos-expat.com.

9.6. **Transferts.** Avec garanties appropriées (clauses contractuelles types) si hors UE.

---

## 10. Propriété intellectuelle

10.1. La marque SOS Expat, logos, widget et contenus sont protégés. Le Bloggeur reçoit une **licence limitée, non exclusive et révocable** d'utilisation des éléments marketing fournis (logos HD, bannières, textes prêts à l'emploi, widget).

10.2. **Restrictions.** Le Bloggeur ne peut pas :
- Modifier les logos, le widget ou les marques SOS Expat
- Créer des sites web imitant SOS Expat
- Enregistrer des noms de domaine contenant « SOS Expat »
- Sous-licencier les éléments reçus à des tiers

10.3. **Contenu généré.** Les articles et contenus créés par le Bloggeur pour promouvoir SOS Expat restent sa propriété, avec licence d'utilisation non exclusive accordée à SOS Expat.

---

## 11. Responsabilité

11.1. **Limitation.** La responsabilité de SOS Expat est limitée aux **commissions dues** au titre des 12 derniers mois.

11.2. **Exclusions.** SOS Expat n'est pas responsable des :
- Dommages indirects (perte de revenus, d'opportunités)
- Actions des Filleuls, prestataires recrutés ou utilisateurs
- Problèmes techniques liés à l'intégration du widget sur le site du Bloggeur

11.3. **Indemnisation.** Le Bloggeur indemnise SOS Expat contre toute réclamation liée à ses activités de promotion ou à l'usage du widget.

---

## 12. Droit applicable

12.1. **Droit estonien.** Les présentes CGU sont régies par le droit estonien.

12.2. **Arbitrage CCI.** Tout litige est résolu par arbitrage CCI, siège à Tallinn, en français.

12.3. **Renonciation aux actions collectives.** Toute action collective est exclue ; réclamations individuelles uniquement.

---

## 13. Dispositions diverses

13.1. **Intégralité.** Les CGU constituent l'accord complet entre les parties.

13.2. **Nullité partielle.** Si une clause est nulle, les autres restent en vigueur.

13.3. **Non-renonciation.** L'absence d'exercice d'un droit n'emporte pas renonciation.

13.4. **Langue.** Le français prévaut en cas de divergence entre traductions.

---

## 14. Contact

Pour toute question concernant le programme Bloggeurs, contactez-nous via le formulaire de contact ou à l'adresse : bloggers@sos-expat.com
`;

  const defaultEn = `
# Terms of Use – SOS Expat Blogger & Content Creator Program

**SOS Expat by WorldExpat OÜ** (the "**Platform**", "**SOS**", "**we**")

**Version 1.0 – Last updated: February 1, 2026**

---

## 1. Definitions

**Blogger** (or "**Content Creator**"): any individual or entity enrolled in the SOS Expat affiliate program to integrate the SOS Expat widget on their website/blog and earn commissions on generated client calls and recruited providers.

**SOS Expat Widget**: web component provided by SOS Expat to integrate on the Blogger's website/blog, enabling visitors to directly access expat assistance services.

**Client Affiliate Code**: unique identifier enabling tracking of client calls generated via the Blogger's link or widget.

**Provider Recruitment Code**: identifier enabling the Blogger to recruit service providers (lawyers, expat experts) and earn commissions on their calls.

**Blogger Recruitment Code**: identifier enabling the Blogger to sponsor other Bloggers and earn commissions on their performance.

**Direct Commission**: compensation paid for each paid client call generated via the Blogger's widget or affiliate link.

**Provider Recruitment Commission**: compensation paid for each paid call made by a provider recruited by the Blogger, for a period of **12 months** from said provider's registration date.

**Blogger Recruitment Commission**: compensation paid for each call generated by a recruited Blogger (N1 Referral) or by that Blogger's referrals (N2 Referral), for a period of **12 months** from registration.

**N1 Referral**: Blogger or provider directly recruited by the Blogger.

**N2 Referral**: Blogger recruited by an N1 Referral of the Blogger.

---

## 2. Purpose and Acceptance

2.1. These Terms govern participation in the SOS Expat Blogger affiliate program.

2.2. By checking the acceptance box during registration, the Blogger accepts these Terms in full. This acceptance constitutes a **valid electronic signature** under **eIDAS Regulation (EU) No 910/2014**.

2.3. **Acceptance Traceability.** SOS Expat maintains a timestamped audit log including: IP address, session ID, user-agent, Terms version accepted, document hash, and Blogger ID. This data is retained for **10 years** in compliance with legal obligations.

2.4. **Modifications.** SOS Expat may modify the Terms and/or commission rates with prospective effect. Notification is sent to the Blogger (email or dashboard) at least **15 days** before taking effect. Continued use after notification constitutes acceptance.

2.5. **Capacity.** The Blogger declares to be of legal age and legally capable. Registration is **prohibited for minors**.

---

## 3. Affiliate Program

3.1. **Registration.** Program access requires: (i) valid registration with indication of website/blog URL, (ii) acceptance of these Terms.

3.2. **Assigned Codes.** Upon validation, the Blogger receives:
- A **Client Affiliate Code**: to integrate in the widget or links to SOS Expat
- A **Provider Recruitment Code**: to recruit lawyers/expat experts
- A **Blogger Recruitment Code**: to sponsor other bloggers

3.3. **SOS Expat Widget.** SOS Expat provides the Blogger with an integration widget (HTML/JavaScript code) to insert on their website. The widget must be integrated visibly and functionally.

3.4. **Marketing Resources.** SOS Expat provides:
- HD Logos (multiple formats and colors)
- Advertising banners (different sizes)
- Ready-to-use texts (articles, descriptions)
- Technical integration guide
- Personalized QR codes

3.5. **Site Validation.** SOS Expat reserves the right to verify and validate widget integration before activating commissions.

---

## 4. Commissions and Compensation

4.1. **Direct Commission – Client Calls.** The Blogger earns **$10** for each paid call generated via their widget or client affiliate link, with no volume or time limits.

4.2. **Provider Recruitment Commission.** The Blogger earns **$5** for each paid call made by a provider they recruited, for **12 months** from the provider's registration date. After this period, provider recruitment commissions cease automatically.

4.3. **Blogger Recruitment Commission (N1 Referral).** The Blogger earns a commission on each client call generated by their N1 Blogger Referrals, for **12 months** from the N1 Referral's registration date. **Cumulative conditions to earn this commission:**
- The Blogger must achieve a minimum of **$50 in direct commissions** (Article 4.1) during the calendar month concerned
- The Blogger must ensure training and follow-up of their N1 Referrals (minimum: sharing the integration guide, responding to questions within 48 hours)
- In the absence of these conditions in a given month, N1 commissions for that month are suspended (non-retroactive)

4.4. **Blogger Recruitment Commission (N2 Referral).** The Blogger earns a commission on each call generated by their N2 Referrals, for **12 months** from the N2 Referral's registration date. The **same cumulative conditions** as in 4.3 apply.

4.5. **Maximum Affiliate Commission Duration.** Commissions on Referrals (N1 and N2) and recruited providers are paid for a **maximum of 12 months** from each referral/provider's registration date. After this period, the Blogger retains only their direct commissions (Article 4.1).

4.6. **Payment Thresholds.** Commissions are validated after:
- Client withdrawal period (14 days)
- Automatic anti-fraud validation
- Reaching minimum withdrawal threshold (**$20**)

4.7. **Commission Schedule (summary).**

| Commission Type | Amount | Duration |
|---|---|---|
| Direct client call (widget/link) | $10/call | Unlimited |
| Recruited provider call | $5/call | 12 months |
| Call generated by N1 Blogger Referral | Variable | 12 months |
| Call generated by N2 Blogger Referral | Variable | 12 months |

4.8. **Performance Bonuses.** Additional bonuses may be granted to Bloggers generating high volumes of calls or recruitments.

---

## 5. Anti-fraud Rules

5.1. **Strict Prohibitions.** The following are strictly prohibited:
- Self-referral or fictitious cross-referral
- Artificially generating calls (fake clients, self-calls)
- Using bots or automated scripts
- Creating multiple accounts
- Integrating the widget on undeclared sites
- Any manipulation of tracking systems

5.2. **Automatic Detection.** SOS Expat uses detection systems including:
- Suspicious call pattern analysis
- Web traffic authenticity verification
- Abnormal conversion rate analysis

5.3. **Sanctions.** In case of proven or suspected fraud:
- **Immediate suspension** of account
- **Cancellation** of all affected commissions
- **Permanent ban** from the Platform
- **Legal action** if applicable

5.4. **Appeals.** The Blogger may contest a sanction via the contact form within **30 days**.

---

## 6. Blogger Obligations

6.1. **Widget Integration.** The Blogger agrees to:
- Integrate the SOS Expat widget visibly on their website
- Not modify the widget code without authorization
- Keep the widget functional and updated
- Report any technical issues to SOS Expat

6.2. **Content Quality.** The Blogger agrees to:
- Promote SOS Expat honestly and ethically
- Not make misleading promises about services
- Clearly identify sponsored or partnership content
- Respect SOS Expat brand guidelines and graphic charters

6.3. **Referral Follow-up.** Bloggers who recruit other Bloggers agree to:
- Share the integration guide and resources provided by SOS Expat
- Respond to Referral questions within **48 hours**
- Ensure minimum follow-up to guarantee correct widget integration

6.4. **Legal Compliance.** The Blogger complies with all applicable laws:
- Advertising and commercial partnership disclosure rules
- Visitor data protection (GDPR, legal notices on their site)
- Tax declaration of affiliate income
- Copyright and intellectual property compliance

6.5. **Independence.** The Blogger acts as an **independent contractor**; no employment, agency, or mandate relationship is created with SOS Expat.

---

## 7. Commission Payments

7.1. **Mandatory KYC.** The Blogger must complete identity verification (KYC) **before** any withdrawal.

7.2. **Payment Methods.** Withdrawals are available via:
- Bank transfer (SEPA/International)
- PayPal
- Wise

7.3. **Timing.** Payments are processed within **7 business days** after validation.

7.4. **Minimum Threshold.** Withdrawal is possible from **$20** available balance.

7.5. **Unclaimed Funds.** If KYC is not completed within **180 days**, funds are considered abandoned per Article 8.7 of the general Terms.

7.6. **Taxes.** The Blogger is solely responsible for declaring and paying their taxes and charges related to affiliate income.

---

## 8. Suspension and Termination

8.1. **Temporary Suspension.** SOS Expat may suspend an account in case of:
- Fraud suspicion or traffic manipulation
- Terms violation
- Widget removal from site without prior notice
- Extended inactivity (365+ days without any activity)

8.2. **Termination by Blogger.** The Blogger may close their account at any time. Validated commissions remain payable.

8.3. **Termination by SOS Expat.** In case of serious violation, SOS Expat may terminate the account with immediate effect. Unvalidated commissions are cancelled.

8.4. **Effects of Termination.** Upon termination:
- Affiliate Codes are deactivated
- Recruited referrals and providers are reassigned to SOS Expat
- Dashboard access is removed
- The Blogger must remove the widget from their site within **30 days**

---

## 9. Personal Data

9.1. **Data Controller.** SOS Expat (WorldExpat OÜ) for Blogger program data.

9.2. **Data Collected.** Identity, website URL, contact details, performance, payment data, connection logs.

9.3. **Purposes.** Program management, commission payments, fraud prevention, service improvement.

9.4. **Retention.** Active data during relationship; archives 10 years after termination (legal obligations).

9.5. **Rights.** Access, rectification, erasure, portability, objection via contact@sos-expat.com.

9.6. **Transfers.** With appropriate safeguards (standard contractual clauses) if outside EU.

---

## 10. Intellectual Property

10.1. The SOS Expat brand, logos, widget, and content are protected. The Blogger receives a **limited, non-exclusive, revocable license** to use provided marketing materials (HD logos, banners, ready-to-use texts, widget).

10.2. **Restrictions.** The Blogger may not:
- Modify SOS Expat logos, widget, or trademarks
- Create websites imitating SOS Expat
- Register domain names containing "SOS Expat"
- Sub-license received materials to third parties

10.3. **Generated Content.** Articles and content created by the Blogger to promote SOS Expat remain their property, with a non-exclusive usage license granted to SOS Expat.

---

## 11. Liability

11.1. **Limitation.** SOS Expat's liability is limited to **commissions due** for the last 12 months.

11.2. **Exclusions.** SOS Expat is not liable for:
- Indirect damages (loss of revenue, opportunities)
- Actions of Referrals, recruited providers, or users
- Technical issues related to widget integration on the Blogger's site

11.3. **Indemnification.** The Blogger indemnifies SOS Expat against any claims related to their promotion activities or widget usage.

---

## 12. Governing Law

12.1. **Estonian Law.** These Terms are governed by Estonian law.

12.2. **ICC Arbitration.** Any dispute is resolved by ICC arbitration, seated in Tallinn, in French.

12.3. **Class Action Waiver.** Class actions are excluded; individual claims only.

---

## 13. Miscellaneous

13.1. **Entire Agreement.** These Terms constitute the complete agreement between parties.

13.2. **Severability.** If a clause is void, others remain in effect.

13.3. **No Waiver.** Failure to exercise a right does not constitute waiver.

13.4. **Language.** French prevails in case of translation discrepancies.

---

## 14. Contact

For any questions about the Blogger program, contact us via the contact form or at: bloggers@sos-expat.com
`;

  const defaultContent = selectedLanguage === "en" ? defaultEn : defaultFr;
  const parsedContent = useMemo(() => {
    const textToRender = content || defaultContent;
    return parseMarkdownContent(textToRender);
  }, [content, selectedLanguage]);

  const languageOptions: { code: SupportedLanguage; label: string; flag: string }[] = [
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "es", label: "Español", flag: "🇪🇸" },
    { code: "de", label: "Deutsch", flag: "🇩🇪" },
    { code: "pt", label: "Português", flag: "🇵🇹" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
    { code: "ch", label: "中文", flag: "🇨🇳" },
    { code: "ar", label: "العربية", flag: "🇸🇦" },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white py-16 sm:py-24">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-purple-200 mb-6">
              <Sparkles className="w-4 h-4" />
              {t.heroBadge}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6">
              {t.title}
            </h1>
            <p className="text-lg sm:text-xl text-purple-100 max-w-3xl mx-auto mb-4">
              {t.subtitle}
            </p>
            <p className="text-sm text-purple-200/80">{t.lastUpdated}</p>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{t.keyFeatures}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {t.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100"
              >
                {index === 0 && <DollarSign className="w-6 h-6 text-purple-600 flex-shrink-0" />}
                {index === 1 && <Users className="w-6 h-6 text-purple-600 flex-shrink-0" />}
                {index === 2 && <LayoutIcon className="w-6 h-6 text-purple-600 flex-shrink-0" />}
                {index === 3 && <Gift className="w-6 h-6 text-purple-600 flex-shrink-0" />}
                <span className="text-sm font-medium text-gray-800">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Language Selector */}
      <section className="py-6 bg-gray-50 border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{t.languageToggle}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {languageOptions.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedLanguage === lang.code
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="hidden sm:inline">{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
              <span className="ml-4 text-gray-600">{t.loading}</span>
            </div>
          ) : (
            <div className="prose prose-lg max-w-none">{parsedContent}</div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FileText className="w-16 h-16 mx-auto mb-6 text-purple-300" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.readyToJoin}</h2>
          <p className="text-lg text-purple-100 mb-8">{t.readySubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={getLocalePath("/blogger/inscription")}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-all hover:scale-105 shadow-lg"
            >
              {t.startNow}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to={getLocalePath("/contact")}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all border border-white/30"
            >
              {t.contactUs}
            </Link>
          </div>
          <p className="mt-8 text-sm text-purple-200">{t.trustedByHelpers}</p>
        </div>
      </section>
    </Layout>
  );
};

export default TermsBloggers;
