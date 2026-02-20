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

4.3. **Prime de recrutement d'un Bloggeur.** Pour chaque Bloggeur recruté via le code de parrainage, le Bloggeur-parrain perçoit une **prime unique de $50** lorsque le Bloggeur recruté cumule **$200 de commissions totales**. Cette prime est versée **une seule fois** par Bloggeur recruté, sans commission récurrente sur les appels futurs de ce Bloggeur.

4.4. **Modèle d'attribution (tracking).** Le suivi des recommandations est basé sur un **cookie Last-Click valable 30 jours** : tout clic sur le widget ou le lien affilié crée un cookie de 30 jours dans le navigateur du visiteur. Si ce visiteur effectue un appel payant dans ce délai, la commission est attribuée au Bloggeur. Un nouveau clic sur un autre lien affilié écrase le cookie précédent. Le Bloggeur reconnaît que la désactivation des cookies par l'utilisateur peut empêcher l'attribution.

4.5. **Période de validation (Hold Period).** Les commissions sont soumises à une période de rétention avant d'être payables :
- Statut **« en attente »** : pendant la **période de rétractation client (14 jours)** suivant l'appel
- Statut **« validée »** : après vérification anti-fraude automatique passée
- Statut **« payable »** : au prochain cycle de paiement mensuel suivant la validation

4.6. **Politique de remboursement et claw-back.** En cas de remboursement d'un appel client ou de chargeback bancaire :
- La commission correspondante est **annulée** si elle est encore en statut « en attente » ou « validée »
- Si la commission a déjà été versée, elle est **déduite du prochain paiement** (claw-back)
- SOS Expat peut récupérer des commissions versées en cas de fraude détectée a posteriori, dans un délai de **12 mois** après versement

4.7. **Absence de garantie de revenus.** SOS Expat ne garantit aucun niveau minimum de trafic, d'appels ou de revenus. Les performances passées ne constituent pas une garantie des revenus futurs.

4.8. **Barèmes de commissions (récapitulatif).**

| Type de commission | Montant | Durée | Conditions |
|---|---|---|---|
| Appel client direct (widget/lien) | $10/appel | Illimitée | Aucune |
| Appel via prestataire recruté | $5/appel | 12 mois max | Aucune |
| Prime recrutement d'un bloggeur | $50 (unique) | Une seule fois | Bloggeur recruté atteint $200 cumulé |

4.9. **Seuil de retrait.** Retrait disponible à partir de **$20** de solde validé.

---

## 5. Règles anti-fraude

5.1. **Fraude au tracking — Interdictions absolues.** Sont formellement interdits, sous peine de résiliation immédiate et de poursuites judiciaires :
- **Cookie stuffing** : injection de cookies affiliés dans le navigateur d'un tiers sans clic réel
- **Clic forcé** : redirection automatique d'un utilisateur vers une page affiliée sans action de sa part
- **Auto-parrainage** : utilisation de son propre code pour générer des appels ou recruter des comptes fictifs
- **Parrainage croisé fictif** : organisation entre plusieurs comptes pour se parrainer mutuellement
- **Trafic artificiel / bots** : utilisation de scripts, robots, fermes de clics ou services d'achat de trafic
- **Intégration du widget sur des sites non déclarés** ou non validés par SOS Expat
- **Création de comptes multiples** sous une même identité ou des identités liées
- **Manipulation de tracking** : toute tentative de modifier, contourner ou exploiter les systèmes d'attribution

5.2. **Contenus interdits.** Le Bloggeur ne peut pas promouvoir SOS Expat via des contenus liés à :
- Contenus pornographiques, violents ou à caractère haineux
- Jeux d'argent illégaux, cryptomonnaies non réglementées
- Drogues, armes, activités illicites
- Contrefaçon ou violation de droits d'auteur
- Contenus visant des mineurs pour des services adultes
- Désinformation, spam SEO, contenu dupliqué

5.3. **Enchères sur la marque.** Il est formellement interdit d'utiliser les termes « SOS Expat », « sos-expat.com » ou variantes orthographiques comme mots-clés dans des campagnes publicitaires payantes sans autorisation écrite préalable.

5.4. **Pratiques SEO interdites.** Sont interdits : l'achat de liens vers les pages affiliées, le cloaking, le contenu dupliqué (scraping) pour multiplier les pages de promotion.

5.5. **Détection automatique.** SOS Expat utilise des systèmes de détection incluant :
- Analyse des patterns d'appels et de clics suspects
- Vérification de l'authenticité et de l'origine du trafic web
- Analyse des taux de conversion anormaux
- Vérification des sites déclarés vs sites réels d'intégration du widget

5.6. **Sanctions graduées.** En cas de violation :
- **Avertissement** pour première violation mineure
- **Suspension temporaire** du compte et gel des commissions
- **Annulation** de toutes les commissions liées à la fraude (claw-back si déjà versées)
- **Bannissement définitif** de la Plateforme
- **Poursuites judiciaires** et demande de dommages et intérêts le cas échéant

5.7. **Recours multi-niveaux.** Le Bloggeur peut contester une sanction selon le processus suivant :
- **Niveau 1** : contestation via le formulaire de contact dans un délai de **30 jours** (réponse sous 15 jours ouvrés)
- **Niveau 2** : escalade à l'équipe Compliance si insatisfaction, dans un délai supplémentaire de **15 jours**
- **Niveau 3** : arbitrage CCI (article 12) si aucune résolution amiable n'est trouvée

---

## 6. Obligations du Bloggeur

6.1. **Intégration du Widget.** Le Bloggeur s'engage à :
- Intégrer le widget SOS Expat de manière visible et fonctionnelle sur son site déclaré
- Ne pas modifier le code du widget sans autorisation écrite préalable
- Maintenir le widget fonctionnel et à jour (dernière version fournie par SOS Expat)
- Signaler tout problème technique à SOS Expat dans un délai raisonnable
- Retirer le widget dans les **30 jours** suivant la résiliation du compte

6.2. **Transparence publicitaire — Obligations légales.**

*Union Européenne / France :* Tout contenu promotionnel pour SOS Expat doit mentionner **« Publicité »** ou **« Collaboration commerciale »** (loi française n° 2023-451 du 9 juin 2023). Mention obligatoire en début d'article ou de contenu.

*États-Unis — FTC :* Divulgation claire et visible avant tout lien affilié : "#ad", "#sponsored", ou "Ce post contient des liens affiliés".

*Australie — ACCC :* Labels acceptés : "#Ad", "Advertising", "Branded Content", "Paid Partnership".

**Le Bloggeur est responsable du respect des réglementations publicitaires applicables dans chaque pays ciblé par son site.**

6.3. **Qualité du contenu.** Le Bloggeur s'engage à :
- Promouvoir SOS Expat de manière honnête et éthique
- Ne formuler que des affirmations véridiques et vérifiables sur les services
- Ne pas promettre de résultats garantis à ses visiteurs
- Respecter les chartes graphiques et guidelines de marque SOS Expat

6.4. **Suivi des Bloggeurs recrutés.** Le Bloggeur qui recrute d'autres Bloggeurs s'engage à :
- Partager le guide d'intégration et les ressources fournies par SOS Expat
- Répondre aux questions de ses Filleuls dans un délai de **48 heures**
- Assurer un suivi minimum pour garantir une intégration correcte du widget

6.5. **Sous-affiliation interdite.** Le Bloggeur ne peut pas déléguer, sous-licencier ou céder ses droits affiliés à des tiers sans accord écrit préalable de SOS Expat.

6.6. **Exclusivité partielle.** Le Bloggeur peut intégrer d'autres widgets ou liens affiliés, à l'exclusion des **concurrents directs de SOS Expat** (plateformes de mise en relation expatriés/avocats ou experts juridiques en ligne proposant des services similaires).

6.7. **Conformité légale générale.** Le Bloggeur respecte toutes les lois applicables :
- Règles de publicité et de mention des partenariats commerciaux (selon pays ciblés)
- Protection des données de ses visiteurs (RGPD, mentions légales, politique cookies)
- Déclaration fiscale de ses revenus d'affiliation
- Respect des droits d'auteur et de propriété intellectuelle

6.8. **Indépendance.** Le Bloggeur agit en **prestataire indépendant** ; aucun lien d'emploi, contrat de travail, mandat ou relation d'agence n'est créé avec SOS Expat. Le Bloggeur est seul responsable de ses cotisations sociales et obligations fiscales.

---

## 7. Paiement des commissions

7.1. **KYC obligatoire.** Le Bloggeur doit compléter la vérification d'identité (KYC) **avant** tout retrait. Le KYC doit être initié dans les **90 jours** suivant la première commission validée.

7.2. **Méthodes de paiement.** Les retraits sont disponibles via :
- Virement bancaire (SEPA/International)
- PayPal
- Wise

7.3. **Délais.** Les paiements sont traités sous **7 jours ouvrés** après validation. Les délais d'encaissement dépendent également de la banque du Bloggeur.

7.4. **Seuil minimum.** Le retrait est possible à partir de **$20** de solde disponible.

7.5. **Devise et conversion.** Tous les paiements sont libellés en **USD**. Si le Bloggeur souhaite être payé dans une autre devise, la conversion s'effectue au taux du jour Wise au moment du virement. Les **frais de conversion sont à la charge du Bloggeur**.

7.6. **Fonds non réclamés.** En cas de non-complétion du KYC sous **180 jours** après la première commission validée, les fonds sont considérés abandonnés et peuvent être restitués à SOS Expat conformément aux lois applicables.

7.7. **Obligations fiscales — Général.** Le Bloggeur est seul responsable de la déclaration et du paiement de ses impôts, taxes et cotisations sociales liés à ses revenus d'affiliation dans son pays de résidence.

7.8. **Obligations fiscales — USA (non-résidents).** Les Bloggeurs non-résidents aux États-Unis percevant des paiements d'un opérateur américain doivent fournir le formulaire **W-8BEN** (personnes physiques) ou **W-8BEN-E** (entités) avant tout paiement. Sans ce formulaire, une retenue à la source de **30%** peut être appliquée.

7.9. **TVA / GST.** Les commissions versées sont exprimées hors taxes. Le Bloggeur assujetti à la TVA est responsable de son application et de sa déclaration.

7.10. **Justificatifs.** SOS Expat fournit au Bloggeur un relevé mensuel détaillé des commissions générées, validées et versées, accessible depuis le dashboard.

---

## 8. Suspension et résiliation

8.1. **Suspension temporaire.** SOS Expat peut suspendre un compte en cas de :
- Suspicion de fraude ou de manipulation de trafic
- Violation des CGU ou des règles de transparence publicitaire
- Retrait du widget du site sans information préalable à SOS Expat
- Inactivité prolongée (365+ jours sans aucune activité)

8.2. **Résiliation pour cause (for cause).** En cas de violation grave des CGU, fraude avérée, manipulation de trafic, violation de la marque ou violation légale, SOS Expat peut résilier le compte **avec effet immédiat**, sans préavis. Les commissions non encore validées sont annulées. Les commissions versées obtenues frauduleusement font l'objet d'un claw-back.

8.3. **Résiliation sans cause (without cause).** En dehors de toute violation, SOS Expat peut résilier le programme avec un préavis de **30 jours** notifié par email. Les commissions validées avant la date d'effet restent dues et seront payées normalement.

8.4. **Résiliation par le Bloggeur.** Le Bloggeur peut clôturer son compte à tout moment, avec un préavis recommandé de **14 jours**. Les commissions validées restent payables.

8.5. **Effets de la résiliation.** À la résiliation :
- Les Codes Affiliés sont désactivés immédiatement
- Les Filleuls et prestataires recrutés sont réattribués à SOS Expat
- L'accès au dashboard est supprimé
- Le Bloggeur doit **retirer le widget de son site dans un délai de 30 jours** et cesser tout usage de la marque SOS Expat

8.6. **Clauses survivant à la résiliation.** Les articles suivants restent en vigueur après résiliation : confidentialité (art. 13.5), propriété intellectuelle (art. 10), limitation de responsabilité (art. 11), loi applicable (art. 12), et protection des données (art. 9).

---

## 9. Données personnelles

9.1. **Responsable de traitement.** SOS Expat (WorldExpat OÜ, Tallinn, Estonie) est responsable du traitement des données personnelles dans le cadre du programme Bloggeurs.

9.2. **Données collectées.** Identité, URL du site/blog, coordonnées, statistiques de trafic déclarées, performances affiliées, données de paiement, informations fiscales, logs de connexion, adresse IP.

9.3. **Finalités et base légale (RGPD Art. 6).** Gestion du programme (exécution du contrat), paiement des commissions (exécution du contrat), prévention de la fraude (intérêt légitime), conformité légale et fiscale (obligation légale), amélioration des services (intérêt légitime).

9.4. **Durée de conservation.** Données actives pendant la relation contractuelle ; archives **10 ans** après résiliation pour les données comptables et fiscales. Droit à l'effacement disponible pour les données non soumises à obligation légale.

9.5. **Droits RGPD.** Accès, rectification, effacement, portabilité, opposition, limitation du traitement via contact@sos-expat.com. Droit de saisir la **CNIL** (France) ou toute autorité de contrôle compétente.

9.6. **Transferts hors UE.** En cas de transfert vers des pays tiers, SOS Expat met en œuvre des **clauses contractuelles types** (SCT) approuvées par la Commission européenne.

9.7. **Conformité CCPA (Californie, USA).** Les Bloggeurs résidents de Californie bénéficient des droits prévus par le CCPA : droit de savoir, supprimer, refuser la vente/partage des données. Contactez contact@sos-expat.com.

9.8. **Conformité PIPEDA / Loi 25 (Canada).** Les Bloggeurs canadiens bénéficient des protections PIPEDA et, pour les résidents québécois, de la Loi 25.

9.9. **Conformité LGPD (Brésil).** Les Bloggeurs résidents au Brésil bénéficient des droits prévus par la Lei Geral de Proteção de Dados (loi 13.709/2018).

9.10. **Obligations du Bloggeur.** Le Bloggeur doit disposer sur son site d'une **politique de confidentialité** conforme aux lois applicables (RGPD, CCPA…) informant ses visiteurs de l'utilisation des cookies de tracking affilié SOS Expat et obtenir leur consentement si requis.

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

11.1. **Limitation de responsabilité.** La responsabilité totale de SOS Expat envers le Bloggeur est limitée au montant total des **commissions versées au cours des 12 derniers mois** précédant la réclamation.

11.2. **Exclusion des dommages indirects.** SOS Expat exclut toute responsabilité pour les dommages indirects, spéciaux, consécutifs ou punitifs, y compris : perte de profits, d'opportunités, atteinte à la réputation, interruption d'activité.

11.3. **Absence de garanties.** La Plateforme est fournie « en l'état ». SOS Expat ne garantit pas :
- La disponibilité continue de la plateforme et du widget
- Un niveau minimum de trafic, d'appels ou de revenus
- La pérennité du programme
- Le fonctionnement du widget sur tous les environnements d'hébergement

11.4. **Force majeure.** SOS Expat n'est pas responsable des retards ou inexécutions causés par des événements hors de son contrôle.

11.5. **Restrictions géographiques.** Le programme est disponible dans la plupart des pays, à l'exception des pays sous embargo international (ONU, UE, OFAC USA). SOS Expat se réserve le droit de refuser ou suspendre des comptes provenant de ces territoires.

11.6. **Indemnisation par le Bloggeur.** Le Bloggeur s'engage à défendre et indemniser SOS Expat contre toute réclamation, amende ou frais découlant de : (i) la violation des présentes CGU, (ii) ses activités de promotion, (iii) l'usage du widget, (iv) la violation de droits de tiers, (v) la violation de toute loi applicable.

---

## 12. Droit applicable

12.1. **Droit applicable.** Les présentes CGU sont régies par le **droit estonien**, sans préjudice des dispositions impératives applicables dans le pays de résidence du Bloggeur.

12.2. **Processus de résolution des litiges (multi-niveaux).**
- **Étape 1 — Contact amiable** : toute réclamation doit d'abord être adressée à contact@sos-expat.com (réponse sous **15 jours ouvrés**).
- **Étape 2 — Médiation interne** : en cas d'insatisfaction, demande de revue par l'équipe Compliance dans un délai supplémentaire de **15 jours**.
- **Étape 3 — Arbitrage CCI** : tout litige non résolu est soumis à la **Chambre de Commerce Internationale (CCI)**, siège à Tallinn (Estonie), en langue française.

12.3. **Droits des autorités de contrôle.** La clause d'arbitrage ne prive pas le Bloggeur de son droit de saisir toute autorité de protection des données compétente.

12.4. **Renonciation aux actions collectives.** Les parties renoncent à participer à toute action collective. Chaque litige est traité individuellement.

12.5. **Langue.** La version française des présentes CGU prévaut en cas de divergence.

---

## 13. Dispositions diverses

13.1. **Intégralité de l'accord.** Les présentes CGU constituent l'accord complet entre les parties et remplacent tout accord antérieur oral ou écrit.

13.2. **Nullité partielle.** Si une clause est déclarée nulle ou inapplicable, elle sera reformée au minimum nécessaire. Les autres clauses restent en vigueur.

13.3. **Non-renonciation.** L'absence d'exercice d'un droit dans un cas particulier ne constitue pas une renonciation définitive.

13.4. **Cession.** Le Bloggeur ne peut céder ses droits ou obligations sans accord écrit préalable de SOS Expat.

13.5. **Confidentialité.** Le Bloggeur s'engage à ne pas divulguer les informations confidentielles reçues dans le cadre du programme. Cette obligation survit à la résiliation pendant **2 ans**.

13.6. **Modifications des CGU.** SOS Expat notifie toute modification significative par email au moins **30 jours** avant son entrée en vigueur. La poursuite du programme vaut acceptation. En cas de refus, résiliation possible sans pénalité avant la date d'effet.

13.7. **Langue.** Le français prévaut en cas de divergence entre les traductions disponibles.

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

4.3. **Blogger Recruitment Bonus.** For each Blogger recruited via the referral code, the referring Blogger earns a **one-time bonus of $50** when the recruited Blogger accumulates **$200 in total commissions**. This bonus is paid **once per recruited Blogger**, with no recurring commission on that Blogger's future calls.

4.4. **Attribution Model (Tracking).** Recommendations are tracked using a **Last-Click cookie valid for 30 days**: any click on the widget or affiliate link creates a 30-day cookie in the visitor's browser. If that visitor makes a paid call within this period, the commission is attributed to the Blogger. A new click on another affiliate link overwrites the previous cookie. The Blogger acknowledges that cookie disabling may prevent attribution.

4.5. **Validation Period (Hold Period).** Commissions go through a retention period before becoming payable:
- Status **"pending"**: during the **client withdrawal period (14 days)** following the call
- Status **"validated"**: after automatic anti-fraud verification
- Status **"payable"**: at the next monthly payment cycle following validation

4.6. **Refund and Clawback Policy.** In case of client call refund or bank chargeback:
- The corresponding commission is **cancelled** if still in "pending" or "validated" status
- If already paid, it is **deducted from the next payment** (clawback)
- SOS Expat may recover paid commissions in case of fraud detected retroactively, within **12 months** of payment

4.7. **No Earnings Guarantee.** SOS Expat does not guarantee any minimum level of traffic, calls, or income.

4.8. **Commission Schedule (summary).**

| Commission Type | Amount | Duration | Conditions |
|---|---|---|---|
| Direct client call (widget/link) | $10/call | Unlimited | None |
| Recruited provider call | $5/call | 12 months max | None |
| Blogger recruitment bonus | $50 (once) | One-time | Recruited reaches $200 cumulative |

4.9. **Withdrawal Threshold.** Withdrawal is available from **$20** validated balance.

---

## 5. Anti-fraud Rules

5.1. **Tracking Fraud — Absolute Prohibitions.** The following are strictly prohibited, subject to immediate termination:
- **Cookie stuffing**: injecting affiliate cookies without a real click
- **Forced click**: automatically redirecting users to an affiliate page
- **Self-referral** and fictitious cross-referral
- **Artificial traffic / bots**: click farms, traffic purchase services
- **Widget integration on undeclared sites** not validated by SOS Expat
- **Creating multiple accounts** under the same identity
- Any **tracking manipulation**

5.2. **Prohibited Content.** The Blogger may not promote SOS Expat through content related to pornography, illegal gambling, drugs, weapons, counterfeiting, disinformation, or content targeting minors for adult services.

5.3. **Trademark Bidding.** Prohibited: using "SOS Expat" or variants as keywords in paid advertising without prior written authorization.

5.4. **Prohibited SEO Practices.** Prohibited: buying backlinks to affiliate pages, cloaking, duplicate/scraped content to multiply affiliate pages.

5.5. **Automatic Detection.** SOS Expat uses detection systems including suspicious pattern analysis, web traffic verification, and conversion rate analysis.

5.6. **Graduated Sanctions.** Warning → Temporary suspension → Commission cancellation (clawback if already paid) → Permanent ban → Legal action.

5.7. **Multi-Level Appeals Process.** Level 1: contact form within 30 days (15 business days response). Level 2: Compliance team review (+15 days). Level 3: ICC arbitration (Article 12).

---

## 6. Blogger Obligations

6.1. **Widget Integration.** The Blogger agrees to integrate the SOS Expat widget visibly on their declared site, not modify its code without authorization, keep it functional and updated, report technical issues, and remove it within **30 days** of account termination.

6.2. **Advertising Transparency.** *EU/France:* Mention "Publicité" or "Collaboration commerciale" before any commercial content. *USA — FTC:* "#ad" or "Sponsored" before any affiliate link. *Australia — ACCC:* "#Ad", "Advertising", "Paid Partnership". **The Blogger is responsible for complying with advertising regulations in each country where their site operates.**

6.3. **Content Quality.** Honest promotion only; no misleading claims; no guaranteed results promises; respect SOS Expat brand guidelines.

6.4. **Referral Follow-up.** Share integration guide; respond to questions within **48 hours**; ensure correct widget integration.

6.5. **Sub-affiliation Prohibited.** Affiliate rights may not be delegated or sub-licensed without prior written approval.

6.6. **Partial Exclusivity.** Bloggers may use other affiliate widgets, excluding SOS Expat direct competitors.

6.7. **Legal Compliance.** Comply with advertising and partnership disclosure rules, visitor data protection (GDPR/CCPA), tax declarations, and intellectual property.

6.8. **Independence.** The Blogger is an **independent contractor**; no employment relationship exists with SOS Expat. The Blogger is solely responsible for their social contributions and tax obligations.

---

## 7. Commission Payments

7.1. **Mandatory KYC.** Complete identity verification before any withdrawal. Must be initiated within **90 days** of first validated commission.

7.2. **Payment Methods.** Bank transfer (SEPA/International), PayPal, Wise.

7.3. **Timing.** Payments processed within **7 business days** after validation (plus bank processing time).

7.4. **Minimum Threshold.** Withdrawal from **$20** validated balance.

7.5. **Currency.** All payments in **USD**. Conversion to other currencies at Wise daily rate; **conversion fees at Blogger's expense**.

7.6. **Unclaimed Funds.** If KYC not completed within **180 days** of first validated commission, funds considered abandoned.

7.7. **Tax Obligations — General.** Blogger solely responsible for tax declarations and payments in their country of residence.

7.8. **Tax — USA Non-Residents.** Form **W-8BEN** (individuals) or **W-8BEN-E** (entities) required before payment. Without it, **30% withholding** applies. Valid for 3 years.

7.9. **VAT/GST.** Commissions expressed exclusive of tax. Blogger responsible for their VAT obligations.

7.10. **Statements.** Monthly commission statement available on dashboard.

---

## 8. Suspension and Termination

8.1. **Temporary Suspension.** SOS Expat may suspend for: fraud suspicion, Terms violation, widget removal without notice, extended inactivity (365+ days).

8.2. **Termination for Cause.** Immediate termination without notice for serious violations, proven fraud, traffic manipulation, or legal breaches. Unvalidated commissions cancelled; fraudulently obtained commissions subject to clawback.

8.3. **Termination without Cause.** **30 days' notice** by email outside any violation. Validated commissions remain due.

8.4. **Termination by Blogger.** At any time with recommended **14 days' notice**. Validated commissions remain payable.

8.5. **Effects of Termination.** Affiliate Codes deactivated; referrals and providers reassigned to SOS Expat; dashboard access removed; **widget must be removed within 30 days**; all SOS Expat brand use must cease.

8.6. **Surviving Clauses.** Confidentiality (Art. 13.5), intellectual property (Art. 10), liability (Art. 11), governing law (Art. 12), and data protection (Art. 9) survive termination.

---

## 9. Personal Data

9.1. **Data Controller.** SOS Expat (WorldExpat OÜ, Tallinn, Estonia).

9.2. **Data Collected.** Identity, website URL, declared traffic statistics, affiliate performance, payment data, tax information, connection logs, IP address.

9.3. **Purposes and Legal Basis.** Program management (contract), commission payments (contract), fraud prevention (legitimate interest), legal/tax compliance (legal obligation).

9.4. **Retention.** Active data during contract; **10-year** archives for accounting/tax data. Erasure right available for other data.

9.5. **GDPR Rights.** Access, rectification, erasure, portability, objection via contact@sos-expat.com. Right to lodge complaint with competent supervisory authority.

9.6. **International Transfers.** Standard Contractual Clauses (SCCs) for transfers outside EU.

9.7. **CCPA (California).** California residents: right to know, delete, opt-out of sale/sharing. Contact contact@sos-expat.com.

9.8. **PIPEDA / Law 25 (Canada).** Canadian Bloggers benefit from PIPEDA protections; Quebec residents from Law 25.

9.9. **LGPD (Brazil).** Brazil-resident Bloggers benefit from rights under Lei Geral de Proteção de Dados.

9.10. **Blogger Obligations.** The Blogger must have a **privacy policy** on their site compliant with applicable laws, informing visitors of the SOS Expat affiliate tracking cookie and obtaining their consent where required.

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

11.1. **Liability Cap.** SOS Expat's total liability is limited to **commissions paid in the last 12 months** preceding the claim.

11.2. **Exclusion of Indirect Damages.** SOS Expat excludes all liability for indirect, special, consequential, or punitive damages.

11.3. **No Warranties.** Platform provided "as is". No guarantee of: continuous availability, minimum traffic/calls/income, widget compatibility with all hosting environments, or program continuity.

11.4. **Force Majeure.** SOS Expat not liable for delays due to events beyond its control.

11.5. **Geographic Restrictions.** Program unavailable in countries under international embargo (UN, EU, US OFAC).

11.6. **Indemnification by Blogger.** The Blogger agrees to indemnify SOS Expat against any claim arising from: Terms breach, promotional activities, widget usage, third-party rights infringement, or violation of applicable law.

---

## 12. Governing Law

12.1. **Governing Law.** These Terms are governed by **Estonian law**, without prejudice to mandatory provisions in the Blogger's country of residence.

12.2. **Multi-Level Dispute Resolution.** Step 1: amicable contact at contact@sos-expat.com (15 business days response). Step 2: Compliance team review (additional 15 days). Step 3: **ICC arbitration** seated in Tallinn, in French (final and binding).

12.3. **Supervisory Authority Rights.** Arbitration clause does not prevent lodging a complaint with data protection authorities.

12.4. **Class Action Waiver.** Individual claims only; class actions excluded.

12.5. **Language.** French version prevails in case of discrepancy.

---

## 13. Miscellaneous

13.1. **Entire Agreement.** These Terms supersede all prior agreements between the parties.

13.2. **Severability.** Invalid clauses shall be reformed; remaining clauses unaffected.

13.3. **No Waiver.** Failure to exercise a right in one instance does not waive it permanently.

13.4. **Assignment.** Blogger rights may not be assigned without prior written approval from SOS Expat.

13.5. **Confidentiality.** Blogger agrees not to disclose confidential program information. This survives termination for **2 years**.

13.6. **Terms Modifications.** Significant changes notified by email **30 days** before effective date. Continued participation = acceptance. Exit without penalty available before effective date.

13.7. **Language.** French prevails in case of translation discrepancies.

---

## 14. Contact

For any questions about the Blogger program, contact us via the contact form or at: bloggers@sos-expat.com
`;

  const defaultContent = selectedLanguage === "fr" ? defaultFr : defaultEn;
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
