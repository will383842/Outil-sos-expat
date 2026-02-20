import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import {
  Users,
  FileText,
  Shield,
  Globe,
  Clock,
  ArrowRight,
  Heart,
  UserCheck,
  DollarSign,
  Languages,
  Sparkles,
  Gift,
  TrendingUp,
  AlertTriangle,
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
 * TermsChatters - CGU pour les Chatters/Ambassadeurs
 * - Support multilingue (9 langues)
 * - Contenu éditable depuis l'admin (collection `legal_documents` type "terms_chatters")
 * - Design harmonisé avec les autres pages CGU
 */

type SupportedLanguage = "fr" | "en" | "es" | "de" | "ru" | "hi" | "ch" | "pt" | "ar";

const TermsChatters: React.FC = () => {
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
          where("type", "==", "terms_chatters"),
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
      title: "CGU Chatters & Ambassadeurs",
      subtitle: "Conditions générales d'utilisation pour les chatters et ambassadeurs SOS Expat",
      lastUpdated: "Version 3.0 – Dernière mise à jour : 1er février 2026",
      loading: "Chargement...",
      joinNetwork: "Devenir Ambassadeur",
      trustedByHelpers: "Rejoignez 5K+ ambassadeurs actifs",
      keyFeatures: "Points clés",
      features: [
        "Commissions attractives jusqu'à 50%",
        "Paiements rapides sous 7 jours",
        "Programme de parrainage multi-niveaux",
        "Bonus early adopter +50%",
      ],
      languageToggle: "Changer de langue",
      sections: {
        definitions: "Définitions",
        scope: "Objet et acceptation",
        program: "Programme d'affiliation",
        commissions: "Commissions et rémunération",
        antifraud: "Règles anti-fraude",
        obligations: "Obligations du Chatter",
        payment: "Paiement des commissions",
        suspension: "Suspension et résiliation",
        data: "Données personnelles",
        ip: "Propriété intellectuelle",
        liability: "Responsabilité",
        law: "Droit applicable",
        misc: "Dispositions diverses",
        contact: "Contact",
      },
      readyToJoin: "Prêt à devenir ambassadeur SOS Expat ?",
      readySubtitle: "Gagnez des commissions en recommandant nos services.",
      startNow: "S'inscrire maintenant",
      contactUs: "Nous contacter",
      anchorTitle: "Sommaire",
      editHint: "Document éditable depuis la console admin",
      ctaHero: "Commencer",
      heroBadge: "Nouveau — Programme mis à jour 2026",
      contactForm: "Formulaire de contact",
    },
    en: {
      title: "Chatters & Ambassadors Terms",
      subtitle: "Terms of Use for SOS Expat chatters and ambassadors",
      lastUpdated: "Version 3.0 – Last updated: February 1, 2026",
      loading: "Loading...",
      joinNetwork: "Become an Ambassador",
      trustedByHelpers: "Join 5K+ active ambassadors",
      keyFeatures: "Key features",
      features: [
        "Attractive commissions up to 50%",
        "Fast payments within 7 days",
        "Multi-level referral program",
        "Early adopter +50% bonus",
      ],
      languageToggle: "Switch language",
      sections: {
        definitions: "Definitions",
        scope: "Purpose and Acceptance",
        program: "Affiliate Program",
        commissions: "Commissions and Compensation",
        antifraud: "Anti-fraud Rules",
        obligations: "Chatter Obligations",
        payment: "Commission Payments",
        suspension: "Suspension and Termination",
        data: "Personal Data",
        ip: "Intellectual Property",
        liability: "Liability",
        law: "Governing Law",
        misc: "Miscellaneous",
        contact: "Contact",
      },
      readyToJoin: "Ready to become an SOS Expat ambassador?",
      readySubtitle: "Earn commissions by recommending our services.",
      startNow: "Sign up now",
      contactUs: "Contact us",
      anchorTitle: "Overview",
      editHint: "Document editable from admin console",
      ctaHero: "Get started",
      heroBadge: "New — 2026 Program Update",
      contactForm: "Contact Form",
    },
    es: {
      title: "Términos para Chatters y Embajadores",
      subtitle: "Términos de uso para chatters y embajadores de SOS Expat",
      lastUpdated: "Versión 3.0 – Última actualización: 1 de febrero de 2026",
      loading: "Cargando...",
      joinNetwork: "Convertirse en Embajador",
      trustedByHelpers: "Únete a más de 5K embajadores activos",
      keyFeatures: "Características clave",
      features: [
        "Comisiones atractivas hasta el 50%",
        "Pagos rápidos en 7 días",
        "Programa de referidos multinivel",
        "Bono early adopter +50%",
      ],
      languageToggle: "Cambiar idioma",
      sections: {
        definitions: "Definiciones",
        scope: "Objeto y aceptación",
        program: "Programa de afiliados",
        commissions: "Comisiones y compensación",
        antifraud: "Reglas antifraude",
        obligations: "Obligaciones del Chatter",
        payment: "Pago de comisiones",
        suspension: "Suspensión y terminación",
        data: "Datos personales",
        ip: "Propiedad intelectual",
        liability: "Responsabilidad",
        law: "Ley aplicable",
        misc: "Disposiciones varias",
        contact: "Contacto",
      },
      readyToJoin: "¿Listo para convertirte en embajador de SOS Expat?",
      readySubtitle: "Gana comisiones recomendando nuestros servicios.",
      startNow: "Inscribirse ahora",
      contactUs: "Contáctanos",
      anchorTitle: "Resumen",
      editHint: "Documento editable desde la consola de administración",
      ctaHero: "Empezar",
      heroBadge: "Nuevo — Actualización del programa 2026",
      contactForm: "Formulario de contacto",
    },
    de: {
      title: "AGB für Chatters & Botschafter",
      subtitle: "Nutzungsbedingungen für SOS Expat Chatters und Botschafter",
      lastUpdated: "Version 3.0 – Letzte Aktualisierung: 1. Februar 2026",
      loading: "Lädt...",
      joinNetwork: "Botschafter werden",
      trustedByHelpers: "Schließen Sie sich über 5K aktiven Botschaftern an",
      keyFeatures: "Hauptmerkmale",
      features: [
        "Attraktive Provisionen bis zu 50%",
        "Schnelle Zahlungen innerhalb von 7 Tagen",
        "Mehrstufiges Empfehlungsprogramm",
        "Early Adopter +50% Bonus",
      ],
      languageToggle: "Sprache wechseln",
      sections: {
        definitions: "Definitionen",
        scope: "Gegenstand und Annahme",
        program: "Partnerprogramm",
        commissions: "Provisionen und Vergütung",
        antifraud: "Anti-Betrugsregeln",
        obligations: "Pflichten des Chatters",
        payment: "Provisionszahlungen",
        suspension: "Aussetzung und Kündigung",
        data: "Personenbezogene Daten",
        ip: "Geistiges Eigentum",
        liability: "Haftung",
        law: "Anwendbares Recht",
        misc: "Sonstiges",
        contact: "Kontakt",
      },
      readyToJoin: "Bereit, SOS Expat Botschafter zu werden?",
      readySubtitle: "Verdienen Sie Provisionen, indem Sie unsere Dienste empfehlen.",
      startNow: "Jetzt anmelden",
      contactUs: "Kontaktieren Sie uns",
      anchorTitle: "Übersicht",
      editHint: "Dokument über Admin-Konsole bearbeitbar",
      ctaHero: "Loslegen",
      heroBadge: "Neu — 2026 Programm-Update",
      contactForm: "Kontaktformular",
    },
    ru: {
      title: "Условия для Чаттеров и Амбассадоров",
      subtitle: "Условия использования для чаттеров и амбассадоров SOS Expat",
      lastUpdated: "Версия 3.0 – Последнее обновление: 1 февраля 2026 г.",
      loading: "Загрузка...",
      joinNetwork: "Стать амбассадором",
      trustedByHelpers: "Присоединяйтесь к 5000+ активных амбассадоров",
      keyFeatures: "Ключевые особенности",
      features: [
        "Привлекательные комиссии до 50%",
        "Быстрые выплаты в течение 7 дней",
        "Многоуровневая реферальная программа",
        "Бонус для первых +50%",
      ],
      languageToggle: "Сменить язык",
      sections: {
        definitions: "Определения",
        scope: "Предмет и принятие",
        program: "Партнёрская программа",
        commissions: "Комиссии и вознаграждение",
        antifraud: "Правила против мошенничества",
        obligations: "Обязанности Чаттера",
        payment: "Выплата комиссий",
        suspension: "Приостановка и прекращение",
        data: "Персональные данные",
        ip: "Интеллектуальная собственность",
        liability: "Ответственность",
        law: "Применимое право",
        misc: "Разное",
        contact: "Контакт",
      },
      readyToJoin: "Готовы стать амбассадором SOS Expat?",
      readySubtitle: "Зарабатывайте комиссии, рекомендуя наши услуги.",
      startNow: "Зарегистрироваться сейчас",
      contactUs: "Свяжитесь с нами",
      anchorTitle: "Обзор",
      editHint: "Документ редактируется из консоли администратора",
      ctaHero: "Начать",
      heroBadge: "Новое — Обновление программы 2026",
      contactForm: "Контактная форма",
    },
    hi: {
      title: "चैटर्स और एंबेसडर शर्तें",
      subtitle: "SOS Expat चैटर्स और एंबेसडर के लिए उपयोग की शर्तें",
      lastUpdated: "संस्करण 3.0 – अंतिम अपडेट: 1 फरवरी 2026",
      loading: "लोड हो रहा है...",
      joinNetwork: "एंबेसडर बनें",
      trustedByHelpers: "5K+ सक्रिय एंबेसडर से जुड़ें",
      keyFeatures: "मुख्य विशेषताएं",
      features: [
        "50% तक आकर्षक कमीशन",
        "7 दिनों में तेज़ भुगतान",
        "बहु-स्तरीय रेफरल कार्यक्रम",
        "अर्ली एडॉप्टर +50% बोनस",
      ],
      languageToggle: "भाषा बदलें",
      sections: {
        definitions: "परिभाषाएँ",
        scope: "उद्देश्य और स्वीकृति",
        program: "संबद्ध कार्यक्रम",
        commissions: "कमीशन और मुआवज़ा",
        antifraud: "धोखाधड़ी-रोधी नियम",
        obligations: "चैटर के दायित्व",
        payment: "कमीशन भुगतान",
        suspension: "निलंबन और समाप्ति",
        data: "व्यक्तिगत डेटा",
        ip: "बौद्धिक संपदा",
        liability: "दायित्व",
        law: "लागू कानून",
        misc: "विविध",
        contact: "संपर्क",
      },
      readyToJoin: "SOS Expat एंबेसडर बनने के लिए तैयार हैं?",
      readySubtitle: "हमारी सेवाओं की सिफारिश करके कमीशन कमाएं।",
      startNow: "अभी साइन अप करें",
      contactUs: "हमसे संपर्क करें",
      anchorTitle: "अवलोकन",
      editHint: "व्यवस्थापक कंसोल से संपादन योग्य दस्तावेज़",
      ctaHero: "शुरू करें",
      heroBadge: "नया — 2026 कार्यक्रम अपडेट",
      contactForm: "संपर्क फ़ॉर्म",
    },
    ch: {
      title: "聊天员和大使条款",
      subtitle: "SOS Expat 聊天员和大使使用条款",
      lastUpdated: "版本 3.0 – 最后更新：2026年2月1日",
      loading: "加载中...",
      joinNetwork: "成为大使",
      trustedByHelpers: "加入 5,000+ 活跃大使",
      keyFeatures: "主要功能",
      features: [
        "高达 50% 的诱人佣金",
        "7 天内快速付款",
        "多级推荐计划",
        "早期采用者 +50% 奖金",
      ],
      languageToggle: "切换语言",
      sections: {
        definitions: "定义",
        scope: "目的和接受",
        program: "联盟计划",
        commissions: "佣金和报酬",
        antifraud: "反欺诈规则",
        obligations: "聊天员义务",
        payment: "佣金支付",
        suspension: "暂停和终止",
        data: "个人数据",
        ip: "知识产权",
        liability: "责任",
        law: "适用法律",
        misc: "杂项",
        contact: "联系方式",
      },
      readyToJoin: "准备成为 SOS Expat 大使吗？",
      readySubtitle: "通过推荐我们的服务赚取佣金。",
      startNow: "立即注册",
      contactUs: "联系我们",
      anchorTitle: "概览",
      editHint: "可从管理控制台编辑文档",
      ctaHero: "开始",
      heroBadge: "新内容 — 2026 计划更新",
      contactForm: "联系表单",
    },
    ar: {
      title: "شروط الدردشة والسفراء",
      subtitle: "شروط الاستخدام لمحادثي وسفراء SOS Expat",
      lastUpdated: "الإصدار 3.0 – آخر تحديث: 1 فبراير 2026",
      loading: "جارٍ التحميل...",
      joinNetwork: "كن سفيراً",
      trustedByHelpers: "انضم إلى أكثر من 5000 سفير نشط",
      keyFeatures: "الميزات الرئيسية",
      features: [
        "عمولات جذابة تصل إلى 50%",
        "دفعات سريعة خلال 7 أيام",
        "برنامج إحالة متعدد المستويات",
        "مكافأة المتبنين الأوائل +50%",
      ],
      languageToggle: "تغيير اللغة",
      sections: {
        definitions: "التعريفات",
        scope: "الهدف والقبول",
        program: "برنامج الشراكة",
        commissions: "العمولات والتعويضات",
        antifraud: "قواعد مكافحة الاحتيال",
        obligations: "التزامات المحادث",
        payment: "دفع العمولات",
        suspension: "التعليق والإنهاء",
        data: "البيانات الشخصية",
        ip: "الملكية الفكرية",
        liability: "المسؤولية",
        law: "القانون الحاكم",
        misc: "متفرقات",
        contact: "اتصل",
      },
      readyToJoin: "هل أنت مستعد لتصبح سفير SOS Expat؟",
      readySubtitle: "اكسب عمولات من خلال التوصية بخدماتنا.",
      startNow: "سجل الآن",
      contactUs: "اتصل بنا",
      anchorTitle: "نظرة عامة",
      editHint: "مستند قابل للتحرير من وحدة التحكم الإدارية",
      ctaHero: "ابدأ",
      heroBadge: "جديد — تحديث برنامج 2026",
      contactForm: "نموذج الاتصال",
    },
    pt: {
      title: "Termos para Chatters e Embaixadores",
      subtitle: "Termos de uso para chatters e embaixadores SOS Expat",
      lastUpdated: "Versão 3.0 – Última atualização: 1 de fevereiro de 2026",
      loading: "Carregando...",
      joinNetwork: "Torne-se Embaixador",
      trustedByHelpers: "Junte-se a mais de 5K embaixadores ativos",
      keyFeatures: "Características principais",
      features: [
        "Comissões atrativas até 50%",
        "Pagamentos rápidos em 7 dias",
        "Programa de indicação multinível",
        "Bônus early adopter +50%",
      ],
      languageToggle: "Mudar idioma",
      sections: {
        definitions: "Definições",
        scope: "Objetivo e aceitação",
        program: "Programa de afiliados",
        commissions: "Comissões e compensação",
        antifraud: "Regras antifraude",
        obligations: "Obrigações do Chatter",
        payment: "Pagamento de comissões",
        suspension: "Suspensão e rescisão",
        data: "Dados pessoais",
        ip: "Propriedade intelectual",
        liability: "Responsabilidade",
        law: "Lei aplicável",
        misc: "Diversos",
        contact: "Contato",
      },
      readyToJoin: "Pronto para se tornar embaixador SOS Expat?",
      readySubtitle: "Ganhe comissões recomendando nossos serviços.",
      startNow: "Inscreva-se agora",
      contactUs: "Entre em contato",
      anchorTitle: "Resumo",
      editHint: "Documento editável a partir do console de administração",
      ctaHero: "Começar",
      heroBadge: "Novo — Atualização do programa 2026",
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

      // H1
      if (line.startsWith("# ")) {
        const title = line.substring(2).replace(/\*\*/g, "");
        elements.push(
          <h1
            key={currentIndex++}
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-red-500 pb-4"
          >
            {title}
          </h1>
        );
        continue;
      }

      // H2
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
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-bold shadow-lg">
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

      // H3
      if (line.startsWith("### ")) {
        const title = line.substring(4).replace(/\*\*/g, "");
        elements.push(
          <h3
            key={currentIndex++}
            className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-red-500 pl-4"
          >
            {title}
          </h3>
        );
        continue;
      }

      // Numbered items (2.1, 3.2, etc.)
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
            className="bg-gray-50 border-l-4 border-red-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-red-600 mr-2">{number}</span>
              <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedContent) }} />
            </p>
          </div>
        );
        continue;
      }

      // Bold line
      if (line.startsWith("**") && line.endsWith("**")) {
        const boldText = line.slice(2, -2);
        elements.push(
          <div
            className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6 my-6"
            key={currentIndex++}
          >
            <p className="font-bold text-gray-900 text-lg">{boldText}</p>
          </div>
        );
        continue;
      }

      // Contact block
      if (line.includes("Pour toute question") || line.includes("For any questions")) {
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold shadow-lg">
                14
              </span>
              Contact
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="https://sos-expat.com/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
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

      // Paragraph
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

  // Contenu par défaut FR
  const defaultFr = `
# Conditions Générales d'Utilisation – Chatters & Ambassadeurs SOS Expat

**SOS Expat by WorldExpat OÜ** (la « **Plateforme** », « **SOS** », « **nous** »)

**Version 3.0 – Dernière mise à jour : 1er février 2026**

---

## 1. Définitions

**Chatter** (ou « **Ambassadeur** ») : toute personne physique inscrite au programme d'affiliation SOS Expat pour promouvoir les services de la Plateforme et percevoir des commissions sur les transactions générées.

**Code Affilié** : identifiant unique attribué au Chatter (ex : « JEAN123 ») permettant le tracking des recommandations.

**Code de Recrutement** : identifiant spécial (ex : « REC-JEAN123 ») permettant de parrainer de nouveaux Chatters.

**Commission** : rémunération versée au Chatter pour chaque transaction éligible générée via son Code Affilié.

**Filleul** : tout nouvel utilisateur (client, prestataire ou chatter) inscrit via le Code du Chatter.

**Early Adopter** : Chatter parmi les 100 premiers inscrits dans un pays, bénéficiant d'un bonus de +50% à vie.

**Niveau 1 (N1)** : Filleuls directs du Chatter.

**Niveau 2 (N2)** : Filleuls des Filleuls N1 (parrainage indirect).

---

## 2. Objet et acceptation

2.1. Les présentes CGU régissent la participation au programme d'affiliation Chatters de SOS Expat.

2.2. En cochant la case d'acceptation lors de l'inscription, le Chatter accepte l'intégralité des présentes CGU. Cette acceptation constitue une **signature électronique valide** au sens du règlement **eIDAS (UE) n° 910/2014**.

2.3. **Traçabilité de l'acceptation.** SOS Expat conserve un journal d'audit horodaté incluant : adresse IP, identifiant de session, user-agent, version des CGU, empreinte numérique du document accepté et identifiant du Chatter. Ces données sont conservées **10 ans**.

2.4. **Modifications.** SOS Expat peut modifier les CGU et/ou les barèmes de commissions avec effet prospectif. L'usage continu après notification vaut acceptation.

2.5. **Capacité.** Le Chatter déclare être majeur et capable juridiquement. L'inscription est **interdite aux mineurs**.

---

## 3. Programme d'affiliation

3.1. **Inscription.** L'accès au programme nécessite : (i) une inscription valide, (ii) la réussite du quiz de formation, (iii) l'acceptation des présentes CGU.

3.2. **Codes Affiliés.** Après validation, le Chatter reçoit :
- Un **Code Client** pour recommander des utilisateurs
- Un **Code Recrutement** pour parrainer de nouveaux Chatters

3.3. **Activation.** Le compte Chatter est « activé » après **2 appels clients** générés. L'activation déclenche le bonus de parrainage au recruteur.

3.4. **Niveaux.** Le Chatter peut progresser du niveau 1 à 5 selon ses performances, débloquant des avantages supplémentaires.

3.5. **Early Adopter.** Les 100 premiers Chatters inscrits par pays bénéficient d'un bonus permanent de **+50%** sur toutes leurs commissions.

---

## 4. Commissions et rémunération

4.1. **Commissions Clients.** Le Chatter perçoit une commission sur chaque appel payant généré via son Code Affilié :
- Niveau 1-2 : **15%** du montant de la transaction
- Niveau 3 : **20%**
- Niveau 4 : **25%**
- Niveau 5 : **30%**
- Early Adopter : **+50%** bonus permanent

4.2. **Commissions de Recrutement (Filleul N1).** Le Chatter perçoit des commissions sur les performances de ses Filleuls N1, pendant **12 mois** à compter de la date d'inscription de chaque Filleul N1. **Conditions cumulatives pour percevoir cette commission :**
- Le Chatter doit réaliser un minimum de **$50 de commissions directes** (article 4.1) au cours du mois civil concerné
- Le Chatter doit assurer la formation et le suivi de ses Filleuls N1 : partage des ressources du programme, réponse aux questions dans un délai de 48h, accompagnement dans la prise en main du dashboard
- En l'absence de ces conditions sur un mois donné, les commissions N1 de ce mois sont suspendues (non rétroactives)
- **5€** par Chatter N1 activé (2+ appels, versé à l'activation, sans condition de seuil)
- **1$** par appel client de vos filleuls N1 (pendant 12 mois, soumis aux conditions ci-dessus)

4.3. **Commissions de Recrutement (Filleul N2).** Le Chatter perçoit des commissions sur les performances de ses Filleuls N2, pendant **12 mois** à compter de la date d'inscription de chaque Filleul N2. Les **mêmes conditions cumulatives** qu'en 4.2 s'appliquent.
- **0.50$** par appel client de vos filleuls N2 (pendant 12 mois, soumis aux conditions ci-dessus)

4.4. **Durée maximale des commissions d'affiliation.** Les commissions sur les Filleuls (N1 et N2) sont versées pendant **12 mois maximum** à compter de la date d'inscription de chaque filleul. Passé ce délai, le Chatter conserve uniquement ses commissions directes (article 4.1). Il peut recruter de nouveaux filleuls pour démarrer de nouvelles périodes de 12 mois.

4.5. **Barèmes de commissions (récapitulatif).**

| Type de commission | Montant | Durée | Conditions |
|---|---|---|---|
| Appel client direct (via code affilié) | 15-30% | Illimitée | Aucune |
| Activation Filleul Chatter N1 | 5€ | Unique | À l'activation |
| Appel client via Filleul N1 | 1$/appel | 12 mois | $50/mois + formation |
| Appel client via Filleul N2 | 0.50$/appel | 12 mois | $50/mois + formation |

4.6. **Seuils de paiement.** Les commissions sont validées après :
- Période de rétractation client (14 jours)
- Validation anti-fraude automatique
- Atteinte du seuil minimum de retrait (**20€**)

4.7. **Bonus et défis.** Des bonus supplémentaires peuvent être accordés via :
- Défis hebdomadaires
- Paliers de recrutement (5, 10, 20, 50, 100, 500 filleuls)
- Événements spéciaux

---

## 5. Règles anti-fraude

5.1. **Interdictions strictes.** Sont formellement interdits :
- **Cookie stuffing** : injection de cookies affiliés sans clic réel de l'utilisateur
- L'**auto-parrainage** ou parrainage croisé fictif
- La création de **comptes multiples** sous une même identité
- L'utilisation de **bots, scripts ou intelligences artificielles** pour générer des clics ou inscriptions
- Le **spam** ou démarchage agressif (emails non sollicités, messages répétitifs)
- La **falsification** de données d'inscription ou de performance
- Le contournement des systèmes de tracking ou d'attribution

5.2. **Contenus interdits.** Le Chatter ne peut pas promouvoir SOS Expat via des contenus liés à : contenu haineux, pornographique, jeux illégaux, drogues, armes, désinformation, ou ciblant des mineurs.

5.3. **Enchères sur la marque.** Interdit d'utiliser « SOS Expat » ou variantes comme mots-clés publicitaires payants sans autorisation écrite préalable.

5.4. **Détection automatique.** SOS Expat utilise des systèmes incluant : analyse des patterns IP, vérification des emails jetables, détection des inscriptions rapides suspectes, analyse du ratio filleuls/clients, contrôle des taux de conversion anormaux.

5.5. **Sanctions graduées.** Avertissement → Suspension temporaire + gel des commissions → Annulation des commissions (claw-back) → Bannissement définitif → Poursuites judiciaires.

5.6. **Recours multi-niveaux.**
- **Niveau 1** : formulaire de contact dans **30 jours** (réponse 15 jours ouvrés)
- **Niveau 2** : escalade équipe Compliance (+15 jours)
- **Niveau 3** : arbitrage CCI (article 12)

---

## 6. Obligations du Chatter

6.1. **Qualité du contenu.** Le Chatter s'engage à :
- Promouvoir SOS Expat de manière honnête et éthique
- Ne pas faire de promesses trompeuses sur les revenus ou les services
- Respecter les règles des plateformes tierces (réseaux sociaux, messageries)
- Ne pas dénigrer la concurrence

6.2. **Transparence publicitaire.** Tout contenu promotionnel doit mentionner clairement le lien d'affiliation ou la nature commerciale de la recommandation : **#Publicité** / **#CollaborationCommerciale** (France — Loi n°2023-451), **#ad** / **Paid Partnership** (USA — FTC 16 CFR Part 255, ARPP), **#Ad** / **Advertising** (Australie — ACCC). **Le Chatter est responsable de la conformité dans chaque pays ciblé.**

6.3. **Conformité légale.** Le Chatter respecte toutes les lois applicables :
- Règles de publicité et démarchage
- Protection des données (RGPD et lois locales)
- Déclaration fiscale de ses revenus d'affiliation
- Interdiction du spam (directive ePrivacy)

6.4. **Sous-affiliation interdite.** Le Chatter ne peut pas déléguer ses droits affiliés à des tiers sans accord écrit préalable de SOS Expat.

6.5. **Indépendance.** Le Chatter agit en **prestataire indépendant** ; aucun lien d'emploi, mandat ou agence n'est créé avec SOS Expat. Il est seul responsable de ses cotisations sociales et obligations fiscales.

6.6. **Exclusivité partielle.** Le Chatter peut promouvoir d'autres services, sauf concurrents directs de SOS Expat (plateformes de mise en relation avec des avocats ou experts expatriés).

---

## 7. Paiement des commissions

7.1. **KYC obligatoire.** Le Chatter doit compléter la vérification d'identité (KYC) **avant** tout retrait. Le KYC doit être initié dans les **90 jours** suivant la première commission validée.

7.2. **Méthodes de paiement.** Virement bancaire (SEPA/International), PayPal, Wise.

7.3. **Délais.** Paiements traités sous **7 jours ouvrés** après validation (délais bancaires supplémentaires possibles).

7.4. **Seuil minimum.** Retrait possible à partir de **20€** de solde disponible.

7.5. **Devise et conversion.** Les commissions directes (4.1) sont exprimées en pourcentage de la transaction. Les commissions N1/N2 sont exprimées en USD. Conversion au taux Wise du jour si demandée ; **frais de conversion à la charge du Chatter**.

7.6. **Fonds non réclamés.** Si KYC non complété sous **180 jours**, fonds considérés abandonnés.

7.7. **Obligations fiscales — Général.** Le Chatter est seul responsable de la déclaration et du paiement de ses impôts dans son pays de résidence.

7.8. **Obligations fiscales — USA (non-résidents).** Formulaire **W-8BEN** (personnes physiques) ou **W-8BEN-E** (entités) requis avant tout paiement. Sans ce formulaire : retenue à la source de **30%** applicable. Validité : 3 ans.

7.9. **TVA / GST.** Commissions exprimées hors taxes. Le Chatter assujetti à la TVA gère lui-même ses obligations fiscales.

7.10. **Justificatifs.** Relevé mensuel détaillé accessible depuis le dashboard.

---

## 8. Suspension et résiliation

8.1. **Suspension temporaire.** SOS Expat peut suspendre un compte en cas de : suspicion de fraude (enquête en cours), violation des CGU, inactivité prolongée (365+ jours sans activité).

8.2. **Résiliation pour cause (for cause).** En cas de violation grave, fraude avérée, violation légale ou de la marque : résiliation **avec effet immédiat** sans préavis. Commissions non validées annulées ; commissions obtenues frauduleusement font l'objet d'un claw-back dans un délai de **12 mois**.

8.3. **Résiliation sans cause (without cause).** Hors toute violation, SOS Expat peut résilier avec un préavis de **30 jours** par email. Les commissions validées avant la date d'effet restent dues.

8.4. **Résiliation par le Chatter.** À tout moment, avec préavis recommandé de **14 jours**. Les commissions validées restent payables.

8.5. **Effets de la résiliation.** Codes Affiliés désactivés ; Filleuls réattribués à SOS Expat ; accès dashboard supprimé ; usage de la marque SOS Expat doit cesser immédiatement.

8.6. **Clauses survivant à la résiliation.** Confidentialité (art. 13.5), propriété intellectuelle (art. 10), responsabilité (art. 11), droit applicable (art. 12), protection des données (art. 9).

---

## 9. Données personnelles

9.1. **Responsable de traitement.** SOS Expat (WorldExpat OÜ, Tallinn, Estonie).

9.2. **Données collectées.** Identité, coordonnées, performances affiliées, données de paiement, informations fiscales, logs de connexion, adresse IP.

9.3. **Finalités et base légale (RGPD Art. 6).** Exécution du contrat, obligations légales, intérêt légitime (prévention fraude, amélioration services).

9.4. **Durée de conservation.** Données actives pendant la relation ; **10 ans** pour données comptables/fiscales. Droit à l'effacement disponible pour les autres données.

9.5. **Droits RGPD.** Accès, rectification, effacement, portabilité, opposition via contact@sos-expat.com. Droit de saisir l'autorité de contrôle compétente (CNIL, etc.).

9.6. **Transferts hors UE.** Clauses contractuelles types (SCT) UE applicables.

9.7. **Conformité CCPA (Californie).** Droits CCPA disponibles pour résidents californiens. Contact : contact@sos-expat.com.

9.8. **Conformité PIPEDA / Loi 25 (Canada).** Résidents canadiens protégés par PIPEDA ; Québécois par la Loi 25.

9.9. **Conformité LGPD (Brésil).** Droits LGPD pour résidents brésiliens.

---

## 10. Propriété intellectuelle

10.1. La marque SOS Expat, logos et contenus sont protégés. Le Chatter reçoit une **licence limitée, non exclusive et révocable** d'utilisation des éléments marketing fournis.

10.2. **Restrictions.** Le Chatter ne peut pas :
- Modifier les logos ou marques SOS Expat
- Créer des sites web imitant SOS Expat
- Enregistrer des noms de domaine contenant « SOS Expat »

10.3. **Contenu généré.** Les contenus créés par le Chatter restent sa propriété, avec licence d'utilisation accordée à SOS Expat.

---

## 11. Responsabilité

11.1. **Limitation de responsabilité.** La responsabilité totale de SOS Expat est limitée aux **commissions versées au cours des 12 derniers mois** précédant la réclamation.

11.2. **Exclusion des dommages indirects.** SOS Expat exclut toute responsabilité pour dommages indirects, spéciaux, consécutifs ou punitifs.

11.3. **Absence de garanties.** SOS Expat ne garantit pas : disponibilité continue de la Plateforme, niveau minimum de revenus ou de filleuls, pérennité du programme, maintien des niveaux de commission.

11.4. **Force majeure.** SOS Expat non responsable des événements hors de son contrôle.

11.5. **Restrictions géographiques.** Programme indisponible dans les pays sous embargo international (ONU, UE, OFAC USA).

11.6. **Indemnisation par le Chatter.** Le Chatter indemnise SOS Expat contre toute réclamation découlant de : violation des CGU, activités promotionnelles, contenu publié, ou violation de toute loi applicable.

---

## 12. Droit applicable

12.1. **Droit applicable.** Droit estonien, sans préjudice des dispositions impératives du pays de résidence du Chatter.

12.2. **Processus de résolution des litiges (multi-niveaux).**
- **Étape 1** : contact amiable à contact@sos-expat.com (réponse sous **15 jours ouvrés**)
- **Étape 2** : revue Compliance (+15 jours si insatisfaction)
- **Étape 3** : **arbitrage CCI** (Chambre de Commerce Internationale), siège Tallinn, en français, sentence définitive et exécutoire

12.3. **Droits des autorités.** La clause d'arbitrage ne prive pas le Chatter de ses droits auprès des autorités de protection des données.

12.4. **Renonciation aux actions collectives.** Réclamations individuelles uniquement.

12.5. **Langue.** Le français prévaut en cas de divergence entre traductions.

---

## 13. Dispositions diverses

13.1. **Intégralité de l'accord.** Les présentes CGU constituent l'accord complet entre les parties.

13.2. **Nullité partielle.** Clause nulle reformée au minimum nécessaire ; autres clauses inchangées.

13.3. **Non-renonciation.** Absence d'exercice d'un droit dans un cas particulier ≠ renonciation définitive.

13.4. **Cession.** Droits non cessibles sans accord écrit préalable de SOS Expat.

13.5. **Confidentialité.** Le Chatter ne divulgue pas les informations confidentielles du programme. Cette obligation survit **2 ans** après résiliation.

13.6. **Modifications des CGU.** Notification par email **30 jours** avant toute modification significative. Poursuite du programme = acceptation. Résiliation sans pénalité disponible avant la date d'effet.

13.7. **Langue.** Le français prévaut en cas de divergence entre les traductions disponibles.

---

## 14. Contact

Pour toute question concernant le programme Chatters, contactez-nous via le formulaire de contact ou à l'adresse : chatters@sos-expat.com
`;

  // Contenu par défaut EN
  const defaultEn = `
# Terms of Use – SOS Expat Chatters & Ambassadors

**SOS Expat by WorldExpat OÜ** (the "**Platform**", "**SOS**", "**we**")

**Version 3.0 – Last updated: February 1, 2026**

---

## 1. Definitions

**Chatter** (or "**Ambassador**"): any individual enrolled in the SOS Expat affiliate program to promote Platform services and earn commissions on generated transactions.

**Affiliate Code**: unique identifier assigned to the Chatter (e.g., "JEAN123") enabling referral tracking.

**Recruitment Code**: special identifier (e.g., "REC-JEAN123") for sponsoring new Chatters.

**Commission**: compensation paid to the Chatter for each eligible transaction generated via their Affiliate Code.

**Referral**: any new user (client, provider, or chatter) registered via the Chatter's Code.

**Early Adopter**: Chatter among the first 100 registered in a country, benefiting from a permanent +50% bonus.

**Level 1 (N1)**: Direct referrals of the Chatter.

**Level 2 (N2)**: Referrals of N1 referrals (indirect sponsorship).

---

## 2. Purpose and Acceptance

2.1. These Terms govern participation in the SOS Expat Chatters affiliate program.

2.2. By checking the acceptance box during registration, the Chatter accepts these Terms in full. This acceptance constitutes a **valid electronic signature** under **eIDAS Regulation (EU) No 910/2014**.

2.3. **Acceptance Traceability.** SOS Expat maintains a timestamped audit log including: IP address, session ID, user-agent, Terms version, document hash, and Chatter ID. This data is retained for **10 years**.

2.4. **Modifications.** SOS Expat may modify the Terms and/or commission rates with prospective effect. Continued use after notification constitutes acceptance.

2.5. **Capacity.** The Chatter declares to be of legal age and legally capable. Registration is **prohibited for minors**.

---

## 3. Affiliate Program

3.1. **Registration.** Program access requires: (i) valid registration, (ii) passing the training quiz, (iii) acceptance of these Terms.

3.2. **Affiliate Codes.** Upon validation, the Chatter receives:
- A **Client Code** to recommend users
- A **Recruitment Code** to sponsor new Chatters

3.3. **Activation.** The Chatter account is "activated" after **2 client calls** generated. Activation triggers the referral bonus to the recruiter.

3.4. **Levels.** The Chatter can progress from level 1 to 5 based on performance, unlocking additional benefits.

3.5. **Early Adopter.** The first 100 Chatters registered per country receive a permanent **+50%** bonus on all commissions.

---

## 4. Commissions and Compensation

4.1. **Client Commissions.** The Chatter earns a commission on each paid call generated via their Affiliate Code:
- Level 1-2: **15%** of transaction amount
- Level 3: **20%**
- Level 4: **25%**
- Level 5: **30%**
- Early Adopter: **+50%** permanent bonus

4.2. **Recruitment Commissions (N1 Referral).** The Chatter earns commissions on N1 Referral performance, for **12 months** from each N1 Referral's registration date. **Cumulative conditions to earn this commission:**
- The Chatter must achieve a minimum of **$50 in direct commissions** (Article 4.1) during the calendar month concerned
- The Chatter must ensure training and follow-up of their N1 Referrals: sharing program resources, responding to questions within 48 hours, assisting with dashboard onboarding
- In the absence of these conditions in a given month, N1 commissions for that month are suspended (non-retroactive)
- **€5** per activated N1 Chatter (2+ calls, paid at activation, no threshold condition)
- **$1** per client call from your N1 referrals (for 12 months, subject to conditions above)

4.3. **Recruitment Commissions (N2 Referral).** The Chatter earns commissions on N2 Referral performance, for **12 months** from each N2 Referral's registration date. The **same cumulative conditions** as in 4.2 apply.
- **$0.50** per client call from your N2 referrals (for 12 months, subject to conditions above)

4.4. **Maximum Affiliate Commission Duration.** Commissions on Referrals (N1 and N2) are paid for a **maximum of 12 months** from each referral's registration date. After this period, the Chatter retains only their direct commissions (Article 4.1). They may recruit new referrals to start new 12-month periods.

4.5. **Commission Schedule (summary).**

| Commission Type | Amount | Duration | Conditions |
|---|---|---|---|
| Direct client call (via affiliate code) | 15-30% | Unlimited | None |
| N1 Chatter Referral activation | €5 | One-time | At activation |
| Client call via N1 Referral | $1/call | 12 months | $50/month + training |
| Client call via N2 Referral | $0.50/call | 12 months | $50/month + training |

4.6. **Payment Thresholds.** Commissions are validated after:
- Client withdrawal period (14 days)
- Automatic anti-fraud validation
- Reaching minimum withdrawal threshold (**€20**)

4.7. **Bonuses and Challenges.** Additional bonuses may be granted through:
- Weekly challenges
- Recruitment milestones (5, 10, 20, 50, 100, 500 referrals)
- Special events

---

## 5. Anti-fraud Rules

5.1. **Strict Prohibitions.** The following are absolutely prohibited:
- **Cookie stuffing**: injecting affiliate cookies without a real user click
- **Self-referral** or fictitious cross-referral
- **Creating multiple accounts** under the same identity
- Using **bots, scripts, or AI tools** to generate clicks or registrations
- **Spam** or aggressive marketing (unsolicited emails, repetitive messages)
- **Data falsification** (registration data, performance metrics)
- Circumventing tracking or attribution systems

5.2. **Prohibited Content.** The Chatter may not promote SOS Expat via content related to: hate speech, pornography, illegal gambling, drugs, weapons, disinformation, or content targeting minors.

5.3. **Trademark Bidding.** Using "SOS Expat" or variants as paid advertising keywords is prohibited without prior written authorization.

5.4. **Automatic Detection.** SOS Expat uses detection systems including: IP pattern analysis, disposable email verification, suspicious rapid registration detection, referral/client ratio analysis, abnormal conversion rate monitoring.

5.5. **Graduated Sanctions.** Warning → Temporary suspension + commission freeze → Commission cancellation (clawback) → Permanent ban → Legal proceedings.

5.6. **Multi-level Appeals.**
- **Level 1**: contact form within **30 days** (response within 15 business days)
- **Level 2**: escalation to Compliance team (+15 days)
- **Level 3**: ICC arbitration (Article 12)

---

## 6. Chatter Obligations

6.1. **Content Quality.** The Chatter agrees to:
- Promote SOS Expat honestly and ethically
- Not make misleading promises about earnings or services
- Respect third-party platform rules (social networks, messaging apps)
- Not disparage competitors

6.2. **Advertising Transparency.** All promotional content must clearly disclose the affiliate link or commercial nature of the recommendation: **#ad** / **Paid Partnership** (USA — FTC 16 CFR Part 255, ARPP), **#Publicité** / **#CollaborationCommerciale** (France — Law No. 2023-451 of June 9, 2023), **#Ad** / **Advertising** (Australia — ACCC). **The Chatter is responsible for compliance in each country targeted.**

6.3. **Legal Compliance.** The Chatter complies with all applicable laws:
- Advertising and marketing regulations
- Data protection (GDPR and local laws)
- Tax declaration of affiliate income
- Anti-spam regulations (ePrivacy Directive)

6.4. **Sub-affiliation Prohibited.** The Chatter may not delegate their affiliate rights to third parties without prior written consent from SOS Expat.

6.5. **Independence.** The Chatter acts as an **independent contractor**; no employment, agency, or mandate relationship is created with SOS Expat. They are solely responsible for their social contributions and tax obligations.

6.6. **Partial Exclusivity.** The Chatter may promote other services, except direct SOS Expat competitors (platforms connecting clients to lawyers or expat experts).

---

## 7. Commission Payments

7.1. **Mandatory KYC.** The Chatter must complete identity verification (KYC) **before** any withdrawal. KYC must be initiated within **90 days** of the first validated commission.

7.2. **Payment Methods.** Bank transfer (SEPA/International), PayPal, Wise.

7.3. **Timing.** Payments processed within **7 business days** after validation (additional bank delays possible).

7.4. **Minimum Threshold.** Withdrawal from **€20** available balance.

7.5. **Currency and Conversion.** Direct commissions (4.1) are expressed as a percentage of the transaction. N1/N2 commissions are expressed in USD. Conversion at the daily Wise rate if requested; **conversion fees are at the Chatter's expense**.

7.6. **Unclaimed Funds.** If KYC is not completed within **180 days**, funds are considered abandoned.

7.7. **Tax Obligations — General.** The Chatter is solely responsible for declaring and paying taxes in their country of residence.

7.8. **Tax Obligations — USA (non-residents).** Form **W-8BEN** (individuals) or **W-8BEN-E** (entities) required before any payment. Without this form: **30% withholding** applies. Validity: 3 years.

7.9. **VAT / GST.** Commissions expressed exclusive of tax. VAT-registered Chatters manage their own tax obligations.

7.10. **Statements.** Detailed monthly statement accessible from the dashboard.

---

## 8. Suspension and Termination

8.1. **Temporary Suspension.** SOS Expat may suspend an account in case of: fraud suspicion (investigation ongoing), Terms violation, or extended inactivity (365+ days without activity).

8.2. **Termination for Cause.** In case of serious violation, proven fraud, legal or brand violation: termination **with immediate effect** and no notice. Unvalidated commissions are cancelled; fraudulently obtained commissions are subject to clawback within **12 months**.

8.3. **Termination without Cause.** Without any violation, SOS Expat may terminate with **30 days' notice** by email. Commissions validated before the effective date remain due.

8.4. **Termination by Chatter.** At any time, with a recommended **14-day notice**. Validated commissions remain payable.

8.5. **Effects of Termination.** Affiliate Codes deactivated; Referrals reassigned to SOS Expat; dashboard access removed; use of the SOS Expat brand must cease immediately.

8.6. **Surviving Clauses.** Confidentiality (Art. 13.5), intellectual property (Art. 10), liability (Art. 11), governing law (Art. 12), data protection (Art. 9).

---

## 9. Personal Data

9.1. **Data Controller.** SOS Expat (WorldExpat OÜ, Tallinn, Estonia).

9.2. **Data Collected.** Identity, contact details, affiliate performance, payment data, tax information, connection logs, IP address.

9.3. **Purposes and Legal Basis (GDPR Art. 6).** Contract performance, legal obligations, legitimate interest (fraud prevention, service improvement).

9.4. **Retention.** Active data during the relationship; **10 years** for accounting/tax data. Right to erasure available for other data.

9.5. **GDPR Rights.** Access, rectification, erasure, portability, objection via contact@sos-expat.com. Right to lodge a complaint with the competent supervisory authority.

9.6. **Non-EU Transfers.** EU standard contractual clauses (SCC) apply.

9.7. **CCPA Compliance (California).** CCPA rights available for California residents. Contact: contact@sos-expat.com.

9.8. **PIPEDA / Law 25 Compliance (Canada).** Canadian residents are protected by PIPEDA; Quebec residents by Law 25.

9.9. **LGPD Compliance (Brazil).** LGPD rights available for Brazilian residents.

---

## 10. Intellectual Property

10.1. The SOS Expat brand, logos, and content are protected. The Chatter receives a **limited, non-exclusive, revocable license** to use provided marketing materials.

10.2. **Restrictions.** The Chatter may not:
- Modify SOS Expat logos or trademarks
- Create websites imitating SOS Expat
- Register domain names containing "SOS Expat"

10.3. **Generated Content.** Content created by the Chatter remains their property, with a usage license granted to SOS Expat.

---

## 11. Liability

11.1. **Liability Cap.** SOS Expat's total liability is limited to **commissions paid over the last 12 months** preceding the claim.

11.2. **Exclusion of Indirect Damages.** SOS Expat excludes all liability for indirect, special, consequential, or punitive damages.

11.3. **No Warranties.** SOS Expat does not guarantee: continuous Platform availability, minimum revenue or referral levels, program continuity, or maintenance of commission levels.

11.4. **Force Majeure.** SOS Expat is not liable for events beyond its control.

11.5. **Geographic Restrictions.** Program unavailable in countries under international embargo (UN, EU, US OFAC).

11.6. **Indemnification by Chatter.** The Chatter indemnifies SOS Expat against any claim arising from: Terms violation, promotional activities, published content, or violation of applicable law.

---

## 12. Governing Law

12.1. **Governing Law.** Estonian law, without prejudice to mandatory provisions of the Chatter's country of residence.

12.2. **Multi-level Dispute Resolution.**
- **Step 1**: amicable contact at contact@sos-expat.com (response within **15 business days**)
- **Step 2**: Compliance review (+15 days if unsatisfied)
- **Step 3**: **ICC Arbitration** (International Chamber of Commerce), seat Tallinn, in French, final and binding award

12.3. **Regulatory Rights.** The arbitration clause does not deprive the Chatter of rights before data protection authorities.

12.4. **Class Action Waiver.** Individual claims only.

12.5. **Language.** French prevails in case of discrepancy between translations.

---

## 13. Miscellaneous

13.1. **Entire Agreement.** These Terms constitute the complete agreement between parties and supersede any prior agreement.

13.2. **Severability.** A void clause is reformulated to the minimum necessary; other clauses remain unchanged.

13.3. **No Waiver.** Failure to exercise a right in a specific case does not constitute permanent waiver.

13.4. **Assignment.** Rights are non-transferable without prior written consent from SOS Expat.

13.5. **Confidentiality.** The Chatter does not disclose confidential program information. This obligation survives **2 years** after termination.

13.6. **Modifications to Terms.** Email notification **30 days** before any significant modification. Continued use of the program = acceptance. Termination without penalty available before the effective date.

13.7. **Language.** French prevails in case of discrepancy between available translations.

---

## 14. Contact

For any questions about the Chatters program, contact us via the contact form or at: chatters@sos-expat.com
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
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-red-900 to-orange-900 text-white py-16 sm:py-24">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-red-200 mb-6">
              <Sparkles className="w-4 h-4" />
              {t.heroBadge}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6">
              {t.title}
            </h1>
            <p className="text-lg sm:text-xl text-red-100 max-w-3xl mx-auto mb-4">
              {t.subtitle}
            </p>
            <p className="text-sm text-red-200/80">{t.lastUpdated}</p>
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
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-100"
              >
                {index === 0 && <DollarSign className="w-6 h-6 text-red-600 flex-shrink-0" />}
                {index === 1 && <Clock className="w-6 h-6 text-red-600 flex-shrink-0" />}
                {index === 2 && <Users className="w-6 h-6 text-red-600 flex-shrink-0" />}
                {index === 3 && <TrendingUp className="w-6 h-6 text-red-600 flex-shrink-0" />}
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
                      ? "bg-red-600 text-white shadow-md"
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
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent" />
              <span className="ml-4 text-gray-600">{t.loading}</span>
            </div>
          ) : (
            <div className="prose prose-lg max-w-none">{parsedContent}</div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-gray-900 via-red-900 to-orange-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Gift className="w-16 h-16 mx-auto mb-6 text-red-300" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.readyToJoin}</h2>
          <p className="text-lg text-red-100 mb-8">{t.readySubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={getLocalePath("/chatter/register")}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-red-600 font-bold rounded-xl hover:bg-red-50 transition-all hover:scale-105 shadow-lg"
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
          <p className="mt-8 text-sm text-red-200">{t.trustedByHelpers}</p>
        </div>
      </section>
    </Layout>
  );
};

export default TermsChatters;
