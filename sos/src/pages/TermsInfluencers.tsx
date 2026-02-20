import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import {
  Users,
  ArrowRight,
  DollarSign,
  Languages,
  Sparkles,
  Gift,
  TrendingUp,
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
 * TermsInfluencers - CGU pour les Influenceurs SOS Expat
 * - Support multilingue (9 langues)
 * - Contenu éditable depuis l'admin (collection `legal_documents` type "terms_influencers")
 * - Design harmonisé avec les autres pages CGU (thème orange/amber)
 */

type SupportedLanguage = "fr" | "en" | "es" | "de" | "ru" | "hi" | "ch" | "pt" | "ar";

const TermsInfluencers: React.FC = () => {
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
          where("type", "==", "terms_influencers"),
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
      title: "CGU Influenceurs SOS Expat",
      subtitle: "Conditions générales d'utilisation pour les influenceurs partenaires SOS Expat",
      lastUpdated: "Version 1.0 – Dernière mise à jour : 1er février 2026",
      loading: "Chargement...",
      joinNetwork: "Devenir Influenceur",
      trustedByHelpers: "Rejoignez notre réseau d'influenceurs partenaires",
      keyFeatures: "Points clés",
      features: [
        "$10 par appel client généré",
        "Commissions à vie sur vos filleuls",
        "Ressources créatives exclusives",
        "Programme de parrainage multi-niveaux",
      ],
      languageToggle: "Changer de langue",
      sections: {
        definitions: "Définitions",
        scope: "Objet et acceptation",
        program: "Programme d'affiliation",
        commissions: "Commissions et rémunération",
        antifraud: "Règles anti-fraude",
        obligations: "Obligations de l'Influenceur",
        payment: "Paiement des commissions",
        suspension: "Suspension et résiliation",
        data: "Données personnelles",
        ip: "Propriété intellectuelle",
        liability: "Responsabilité",
        law: "Droit applicable",
        misc: "Dispositions diverses",
        contact: "Contact",
      },
      readyToJoin: "Prêt à devenir influenceur SOS Expat ?",
      readySubtitle: "Monétisez votre audience en recommandant nos services d'assistance aux expatriés.",
      startNow: "S'inscrire maintenant",
      contactUs: "Nous contacter",
      anchorTitle: "Sommaire",
      editHint: "Document éditable depuis la console admin",
      ctaHero: "Commencer",
      heroBadge: "Programme Influenceurs — Lancé en 2026",
      contactForm: "Formulaire de contact",
    },
    en: {
      title: "SOS Expat Influencer Terms",
      subtitle: "Terms of Use for SOS Expat partner influencers",
      lastUpdated: "Version 1.0 – Last updated: February 1, 2026",
      loading: "Loading...",
      joinNetwork: "Become an Influencer",
      trustedByHelpers: "Join our partner influencer network",
      keyFeatures: "Key features",
      features: [
        "$10 per client call generated",
        "Lifetime commissions on your referrals",
        "Exclusive creative resources",
        "Multi-level referral program",
      ],
      languageToggle: "Switch language",
      sections: {
        definitions: "Definitions",
        scope: "Purpose and Acceptance",
        program: "Affiliate Program",
        commissions: "Commissions and Compensation",
        antifraud: "Anti-fraud Rules",
        obligations: "Influencer Obligations",
        payment: "Commission Payments",
        suspension: "Suspension and Termination",
        data: "Personal Data",
        ip: "Intellectual Property",
        liability: "Liability",
        law: "Governing Law",
        misc: "Miscellaneous",
        contact: "Contact",
      },
      readyToJoin: "Ready to become an SOS Expat influencer?",
      readySubtitle: "Monetize your audience by recommending our expat assistance services.",
      startNow: "Sign up now",
      contactUs: "Contact us",
      anchorTitle: "Overview",
      editHint: "Document editable from admin console",
      ctaHero: "Get started",
      heroBadge: "Influencer Program — Launched 2026",
      contactForm: "Contact Form",
    },
    es: {
      title: "Términos para Influencers SOS Expat",
      subtitle: "Términos de uso para influencers socios de SOS Expat",
      lastUpdated: "Versión 1.0 – Última actualización: 1 de febrero de 2026",
      loading: "Cargando...",
      joinNetwork: "Convertirse en Influencer",
      trustedByHelpers: "Únete a nuestra red de influencers socios",
      keyFeatures: "Características clave",
      features: [
        "$10 por llamada de cliente generada",
        "Comisiones de por vida en tus referidos",
        "Recursos creativos exclusivos",
        "Programa de referidos multinivel",
      ],
      languageToggle: "Cambiar idioma",
      sections: {
        definitions: "Definiciones",
        scope: "Objeto y aceptación",
        program: "Programa de afiliados",
        commissions: "Comisiones y compensación",
        antifraud: "Reglas antifraude",
        obligations: "Obligaciones del Influencer",
        payment: "Pago de comisiones",
        suspension: "Suspensión y terminación",
        data: "Datos personales",
        ip: "Propiedad intelectual",
        liability: "Responsabilidad",
        law: "Ley aplicable",
        misc: "Disposiciones varias",
        contact: "Contacto",
      },
      readyToJoin: "¿Listo para convertirte en influencer de SOS Expat?",
      readySubtitle: "Monetiza tu audiencia recomendando nuestros servicios de asistencia a expatriados.",
      startNow: "Inscribirse ahora",
      contactUs: "Contáctanos",
      anchorTitle: "Resumen",
      editHint: "Documento editable desde la consola de administración",
      ctaHero: "Empezar",
      heroBadge: "Programa de Influencers — Lanzado en 2026",
      contactForm: "Formulario de contacto",
    },
    de: {
      title: "AGB für SOS Expat Influencer",
      subtitle: "Nutzungsbedingungen für SOS Expat Partner-Influencer",
      lastUpdated: "Version 1.0 – Letzte Aktualisierung: 1. Februar 2026",
      loading: "Lädt...",
      joinNetwork: "Influencer werden",
      trustedByHelpers: "Schließen Sie sich unserem Partner-Influencer-Netzwerk an",
      keyFeatures: "Hauptmerkmale",
      features: [
        "$10 pro generiertem Kundengespräch",
        "Lebenslange Provisionen auf Ihre Empfehlungen",
        "Exklusive Kreativressourcen",
        "Mehrstufiges Empfehlungsprogramm",
      ],
      languageToggle: "Sprache wechseln",
      sections: {
        definitions: "Definitionen",
        scope: "Gegenstand und Annahme",
        program: "Partnerprogramm",
        commissions: "Provisionen und Vergütung",
        antifraud: "Anti-Betrugsregeln",
        obligations: "Pflichten des Influencers",
        payment: "Provisionszahlungen",
        suspension: "Aussetzung und Kündigung",
        data: "Personenbezogene Daten",
        ip: "Geistiges Eigentum",
        liability: "Haftung",
        law: "Anwendbares Recht",
        misc: "Sonstiges",
        contact: "Kontakt",
      },
      readyToJoin: "Bereit, SOS Expat Influencer zu werden?",
      readySubtitle: "Monetarisieren Sie Ihr Publikum durch Empfehlung unserer Expatriate-Dienste.",
      startNow: "Jetzt anmelden",
      contactUs: "Kontaktieren Sie uns",
      anchorTitle: "Übersicht",
      editHint: "Dokument über Admin-Konsole bearbeitbar",
      ctaHero: "Loslegen",
      heroBadge: "Influencer-Programm — Gestartet 2026",
      contactForm: "Kontaktformular",
    },
    ru: {
      title: "Условия для Инфлюенсеров SOS Expat",
      subtitle: "Условия использования для партнёров-инфлюенсеров SOS Expat",
      lastUpdated: "Версия 1.0 – Последнее обновление: 1 февраля 2026 г.",
      loading: "Загрузка...",
      joinNetwork: "Стать инфлюенсером",
      trustedByHelpers: "Присоединяйтесь к нашей сети партнёров-инфлюенсеров",
      keyFeatures: "Ключевые особенности",
      features: [
        "$10 за каждый клиентский звонок",
        "Пожизненные комиссии с рефералов",
        "Эксклюзивные креативные ресурсы",
        "Многоуровневая реферальная программа",
      ],
      languageToggle: "Сменить язык",
      sections: {
        definitions: "Определения",
        scope: "Предмет и принятие",
        program: "Партнёрская программа",
        commissions: "Комиссии и вознаграждение",
        antifraud: "Правила против мошенничества",
        obligations: "Обязанности инфлюенсера",
        payment: "Выплата комиссий",
        suspension: "Приостановка и прекращение",
        data: "Персональные данные",
        ip: "Интеллектуальная собственность",
        liability: "Ответственность",
        law: "Применимое право",
        misc: "Разное",
        contact: "Контакт",
      },
      readyToJoin: "Готовы стать инфлюенсером SOS Expat?",
      readySubtitle: "Монетизируйте свою аудиторию, рекомендуя наши услуги для эмигрантов.",
      startNow: "Зарегистрироваться сейчас",
      contactUs: "Свяжитесь с нами",
      anchorTitle: "Обзор",
      editHint: "Документ редактируется из консоли администратора",
      ctaHero: "Начать",
      heroBadge: "Программа для инфлюенсеров — Запущена в 2026 году",
      contactForm: "Контактная форма",
    },
    hi: {
      title: "SOS Expat इन्फ्लुएंसर शर्तें",
      subtitle: "SOS Expat भागीदार इन्फ्लुएंसर के लिए उपयोग की शर्तें",
      lastUpdated: "संस्करण 1.0 – अंतिम अपडेट: 1 फरवरी 2026",
      loading: "लोड हो रहा है...",
      joinNetwork: "इन्फ्लुएंसर बनें",
      trustedByHelpers: "हमारे भागीदार इन्फ्लुएंसर नेटवर्क से जुड़ें",
      keyFeatures: "मुख्य विशेषताएं",
      features: [
        "प्रति क्लाइंट कॉल $10",
        "रेफरल पर आजीवन कमीशन",
        "विशेष रचनात्मक संसाधन",
        "बहु-स्तरीय रेफरल कार्यक्रम",
      ],
      languageToggle: "भाषा बदलें",
      sections: {
        definitions: "परिभाषाएँ",
        scope: "उद्देश्य और स्वीकृति",
        program: "संबद्ध कार्यक्रम",
        commissions: "कमीशन और मुआवज़ा",
        antifraud: "धोखाधड़ी-रोधी नियम",
        obligations: "इन्फ्लुएंसर के दायित्व",
        payment: "कमीशन भुगतान",
        suspension: "निलंबन और समाप्ति",
        data: "व्यक्तिगत डेटा",
        ip: "बौद्धिक संपदा",
        liability: "दायित्व",
        law: "लागू कानून",
        misc: "विविध",
        contact: "संपर्क",
      },
      readyToJoin: "SOS Expat इन्फ्लुएंसर बनने के लिए तैयार हैं?",
      readySubtitle: "प्रवासी सहायता सेवाओं की सिफारिश करके अपनी ऑडियंस को मोनेटाइज़ करें।",
      startNow: "अभी साइन अप करें",
      contactUs: "हमसे संपर्क करें",
      anchorTitle: "अवलोकन",
      editHint: "व्यवस्थापक कंसोल से संपादन योग्य दस्तावेज़",
      ctaHero: "शुरू करें",
      heroBadge: "इन्फ्लुएंसर कार्यक्रम — 2026 में लॉन्च",
      contactForm: "संपर्क फ़ॉर्म",
    },
    ch: {
      title: "SOS Expat 网红条款",
      subtitle: "SOS Expat 合作网红使用条款",
      lastUpdated: "版本 1.0 – 最后更新：2026年2月1日",
      loading: "加载中...",
      joinNetwork: "成为网红",
      trustedByHelpers: "加入我们的合作网红网络",
      keyFeatures: "主要功能",
      features: [
        "每次客户通话 $10",
        "终身佣金推荐",
        "专属创意资源",
        "多级推荐计划",
      ],
      languageToggle: "切换语言",
      sections: {
        definitions: "定义",
        scope: "目的和接受",
        program: "联盟计划",
        commissions: "佣金和报酬",
        antifraud: "反欺诈规则",
        obligations: "网红义务",
        payment: "佣金支付",
        suspension: "暂停和终止",
        data: "个人数据",
        ip: "知识产权",
        liability: "责任",
        law: "适用法律",
        misc: "杂项",
        contact: "联系方式",
      },
      readyToJoin: "准备成为 SOS Expat 网红吗？",
      readySubtitle: "通过推荐我们的海外华人服务为您的受众创造价值。",
      startNow: "立即注册",
      contactUs: "联系我们",
      anchorTitle: "概览",
      editHint: "可从管理控制台编辑文档",
      ctaHero: "开始",
      heroBadge: "网红计划 — 2026年启动",
      contactForm: "联系表单",
    },
    ar: {
      title: "شروط المؤثرين SOS Expat",
      subtitle: "شروط الاستخدام للمؤثرين الشركاء في SOS Expat",
      lastUpdated: "الإصدار 1.0 – آخر تحديث: 1 فبراير 2026",
      loading: "جارٍ التحميل...",
      joinNetwork: "كن مؤثراً",
      trustedByHelpers: "انضم إلى شبكة المؤثرين الشركاء لدينا",
      keyFeatures: "الميزات الرئيسية",
      features: [
        "$10 لكل مكالمة عميل",
        "عمولات مدى الحياة على إحالاتك",
        "موارد إبداعية حصرية",
        "برنامج إحالة متعدد المستويات",
      ],
      languageToggle: "تغيير اللغة",
      sections: {
        definitions: "التعريفات",
        scope: "الهدف والقبول",
        program: "برنامج الشراكة",
        commissions: "العمولات والتعويضات",
        antifraud: "قواعد مكافحة الاحتيال",
        obligations: "التزامات المؤثر",
        payment: "دفع العمولات",
        suspension: "التعليق والإنهاء",
        data: "البيانات الشخصية",
        ip: "الملكية الفكرية",
        liability: "المسؤولية",
        law: "القانون الحاكم",
        misc: "متفرقات",
        contact: "اتصل",
      },
      readyToJoin: "هل أنت مستعد لتصبح مؤثراً في SOS Expat؟",
      readySubtitle: "حقق أرباحاً من جمهورك بالتوصية بخدماتنا للمغتربين.",
      startNow: "سجل الآن",
      contactUs: "اتصل بنا",
      anchorTitle: "نظرة عامة",
      editHint: "مستند قابل للتحرير من وحدة التحكم الإدارية",
      ctaHero: "ابدأ",
      heroBadge: "برنامج المؤثرين — تم الإطلاق 2026",
      contactForm: "نموذج الاتصال",
    },
    pt: {
      title: "Termos para Influenciadores SOS Expat",
      subtitle: "Termos de uso para influenciadores parceiros da SOS Expat",
      lastUpdated: "Versão 1.0 – Última atualização: 1 de fevereiro de 2026",
      loading: "Carregando...",
      joinNetwork: "Torne-se Influenciador",
      trustedByHelpers: "Junte-se à nossa rede de influenciadores parceiros",
      keyFeatures: "Características principais",
      features: [
        "$10 por chamada de cliente gerada",
        "Comissões vitalícias em seus indicados",
        "Recursos criativos exclusivos",
        "Programa de indicação multinível",
      ],
      languageToggle: "Mudar idioma",
      sections: {
        definitions: "Definições",
        scope: "Objetivo e aceitação",
        program: "Programa de afiliados",
        commissions: "Comissões e compensação",
        antifraud: "Regras antifraude",
        obligations: "Obrigações do Influenciador",
        payment: "Pagamento de comissões",
        suspension: "Suspensão e rescisão",
        data: "Dados pessoais",
        ip: "Propriedade intelectual",
        liability: "Responsabilidade",
        law: "Lei aplicável",
        misc: "Diversos",
        contact: "Contato",
      },
      readyToJoin: "Pronto para se tornar influenciador SOS Expat?",
      readySubtitle: "Monetize seu público recomendando nossos serviços de assistência a expatriados.",
      startNow: "Inscreva-se agora",
      contactUs: "Entre em contato",
      anchorTitle: "Resumo",
      editHint: "Documento editável a partir do console de administração",
      ctaHero: "Começar",
      heroBadge: "Programa de Influenciadores — Lançado em 2026",
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
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-orange-500 pb-4"
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
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold shadow-lg">
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
            className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-orange-500 pl-4"
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
            className="bg-gray-50 border-l-4 border-orange-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-orange-600 mr-2">{number}</span>
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
            className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 my-6"
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
            className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg">
                14
              </span>
              Contact
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="https://sos-expat.com/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
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
# Conditions Générales d'Utilisation – Influenceurs SOS Expat

**SOS Expat by WorldExpat OÜ** (la « **Plateforme** », « **SOS** », « **nous** »)

**Version 1.0 – Dernière mise à jour : 1er février 2026**

---

## 1. Définitions

**Influenceur** : toute personne physique inscrite au programme d'affiliation SOS Expat pour promouvoir les services de la Plateforme auprès de sa communauté (abonnés, followers) et percevoir des commissions sur les transactions générées.

**Code Affilié** : identifiant unique attribué à l'Influenceur permettant le tracking des recommandations et des appels clients générés.

**Commission** : rémunération versée à l'Influenceur pour chaque appel payant éligible généré via son Code Affilié.

**Filleul Influenceur** : tout nouvel Influenceur inscrit via le code de parrainage de l'Influenceur.

**Audience** : l'ensemble des abonnés, followers et communauté de l'Influenceur sur ses plateformes (Instagram, TikTok, YouTube, blog, etc.).

**Contenu Sponsorisé** : tout contenu créé par l'Influenceur pour promouvoir SOS Expat, devant être clairement identifié comme partenariat commercial.

---

## 2. Objet et acceptation

2.1. Les présentes CGU régissent la participation au programme d'affiliation Influenceurs de SOS Expat.

2.2. En cochant la case d'acceptation lors de l'inscription, l'Influenceur accepte l'intégralité des présentes CGU. Cette acceptation constitue une **signature électronique valide** au sens du règlement **eIDAS (UE) n° 910/2014**.

2.3. **Traçabilité de l'acceptation.** SOS Expat conserve un journal d'audit horodaté incluant : adresse IP, identifiant de session, user-agent, version des CGU, empreinte numérique du document accepté et identifiant de l'Influenceur. Ces données sont conservées **10 ans**.

2.4. **Modifications.** SOS Expat peut modifier les CGU et/ou les barèmes de commissions avec effet prospectif. L'usage continu après notification vaut acceptation.

2.5. **Capacité.** L'Influenceur déclare être majeur et capable juridiquement. L'inscription est **interdite aux mineurs**.

---

## 3. Programme d'affiliation

3.1. **Inscription.** L'accès au programme nécessite : (i) une inscription valide avec présentation de ses plateformes de diffusion, (ii) l'acceptation des présentes CGU.

3.2. **Code Affilié.** Après validation, l'Influenceur reçoit un Code Affilié unique permettant de tracker les appels clients générés via ses publications.

3.3. **Parrainage.** L'Influenceur peut recruter d'autres Influenceurs via son code de parrainage et percevoir des commissions sur leurs performances.

3.4. **Plateformes éligibles.** Le programme est ouvert aux créateurs actifs sur : Instagram, TikTok, YouTube, Facebook, Twitter/X, LinkedIn, blogs, podcasts, newsletters et autres canaux numériques.

3.5. **Critères d'éligibilité.** L'Influenceur doit disposer d'une audience active et pertinente pour les services d'assistance aux expatriés.

---

## 4. Commissions et rémunération

4.1. **Commissions directes par appel.** L'Influenceur perçoit **$10** pour chaque appel payant généré via son Code Affilié, sans limite de volume ni de durée.

4.2. **Niveaux de progression et bonus.** Le barème des commissions directes est bonifié selon le niveau atteint (déterminé par le volume mensuel d'activité) :
- Niveau 1 : ×1,00 (base $10/appel)
- Niveau 2 : ×1,10 (+10% → $11/appel)
- Niveau 3 : ×1,20 (+20% → $12/appel)
- Niveau 4 : ×1,35 (+35% → $13,50/appel)
- Niveau 5 : ×1,50 (+50% → $15/appel)

**Bonus Top 3 mensuel :** Les 3 meilleurs Influenceurs du mois perçoivent un multiplicateur supplémentaire sur toutes leurs commissions du mois : 1er rang ×2,00 / 2e rang ×1,50 / 3e rang ×1,15.

4.3. **Commission de recrutement prestataire.** L'Influenceur perçoit **$5** pour chaque appel payant réalisé par un prestataire (avocat, expert expatrié) qu'il a recommandé via son code de recrutement, pendant **12 mois** à compter de la date d'inscription du prestataire. Cette commission cesse automatiquement à l'expiration du délai de 12 mois.

4.4. **Prime de recrutement d'Influenceur.** Pour chaque Influenceur recruté via le code de parrainage, l'Influenceur-parrain perçoit une **prime unique de $5** lorsque l'Influenceur recruté cumule **$50 de commissions totales**. Cette prime est versée **une seule fois** par Influenceur recruté, sans commission récurrente sur les appels futurs de cet Influenceur.

4.5. **Modèle d'attribution (tracking).** Le suivi des recommandations est basé sur un **cookie Last-Click valable 30 jours** : tout clic sur le lien affilié de l'Influenceur crée un cookie de 30 jours dans le navigateur du visiteur. Si ce visiteur effectue un appel payant dans ce délai, la commission est attribuée à l'Influenceur. Un nouveau clic sur un autre lien affilié écrase le cookie précédent (modèle Last-Click). L'Influenceur reconnaît que la désactivation des cookies par l'utilisateur peut empêcher l'attribution.

4.6. **Période de validation (Hold Period).** Les commissions sont soumises à une période de rétention avant d'être payables :
- Statut **« en attente »** : pendant la **période de rétractation client (14 jours)** suivant l'appel
- Statut **« validée »** : après vérification anti-fraude automatique passée (délai variable)
- Statut **« payable »** : au prochain cycle de paiement mensuel suivant la validation

4.7. **Politique de remboursement et claw-back.** En cas de remboursement d'un appel client ou de chargeback bancaire :
- La commission correspondante est **annulée** si elle est encore en statut « en attente » ou « validée »
- Si la commission a déjà été versée, elle est **déduite du prochain paiement** (claw-back)
- En cas de chargeback frauduleux avéré imputable à l'Influenceur, des **frais de traitement supplémentaires** peuvent être appliqués
- SOS Expat peut récupérer des commissions versées en cas de fraude détectée a posteriori, dans un délai de **12 mois** après versement

4.8. **Absence de garantie de revenus.** SOS Expat ne garantit aucun niveau minimum de trafic, d'appels ou de revenus. Les performances passées ne constituent pas une garantie des revenus futurs.

4.9. **Barèmes de commissions (récapitulatif).**

| Type de commission | Montant | Durée | Conditions |
|---|---|---|---|
| Appel client direct (via code affilié) | $10/appel (×bonus niveau) | Illimitée | Aucune |
| Appel via prestataire recruté | $5/appel | 12 mois max | Aucune |
| Prime recrutement d'un influenceur | $5 (unique) | Une seule fois | Recruté atteint $50 cumulé |
| Bonus Top 3 mensuel | ×2,00 / ×1,50 / ×1,15 | Mensuel | Top 3 du mois |

4.10. **Seuil de retrait.** Retrait disponible à partir de **$20** de solde validé.

---

## 5. Règles anti-fraude

5.1. **Fraude au tracking — Interdictions absolues.** Sont formellement interdits, sous peine de résiliation immédiate et de poursuites judiciaires :
- **Cookie stuffing** : injection de cookies affiliés dans le navigateur d'un tiers sans clic réel (via pixel caché, iframe, adware)
- **Clic forcé (forced click)** : redirection automatique d'un utilisateur vers une page affiliée sans action de sa part
- **Auto-parrainage** : utilisation de son propre code pour générer des appels ou recruter des comptes fictifs
- **Parrainage croisé fictif** : organisation entre plusieurs comptes pour se parrainer mutuellement
- **Trafic artificiel / bots** : utilisation de scripts, robots, fermes de clics ou services d'achat de trafic
- **Faux followers / faux engagement** : achat ou utilisation d'audiences artificielles
- **Création de comptes multiples** sous une même identité ou des identités liées
- **Manipulation de tracking** : toute tentative de modifier, contourner ou exploiter les systèmes d'attribution

5.2. **Contenus interdits.** L'Influenceur ne peut pas promouvoir SOS Expat via des contenus liés à :
- Contenus pornographiques, violents ou à caractère haineux
- Jeux d'argent illégaux, cryptomonnaies non réglementées
- Drogues, armes, activités illicites
- Contrefaçon ou violation de droits d'auteur
- Contenus visant des mineurs pour des services adultes
- Désinformation ou deepfakes

5.3. **Enchères sur la marque.** Il est formellement interdit d'utiliser les termes « SOS Expat », « sos-expat.com » ou variantes orthographiques comme mots-clés dans des campagnes publicitaires payantes (Google Ads, Meta Ads, TikTok Ads, etc.) sans autorisation écrite préalable.

5.4. **Détection automatique.** SOS Expat utilise des systèmes de détection incluant :
- Analyse des patterns d'appels et de clics suspects
- Vérification de l'authenticité et de l'engagement des audiences
- Analyse des taux de conversion anormaux
- Vérification des adresses IP, empreintes de navigateur et comportements

5.5. **Sanctions graduées.** En cas de violation :
- **Avertissement** pour première violation mineure
- **Suspension temporaire** du compte et gel des commissions
- **Annulation** de toutes les commissions liées à la fraude (claw-back si déjà versées)
- **Bannissement définitif** de la Plateforme
- **Poursuites judiciaires** et demande de dommages et intérêts le cas échéant

5.6. **Recours multi-niveaux.** L'Influenceur peut contester une sanction selon le processus suivant :
- **Niveau 1** : contestation via le formulaire de contact dans un délai de **30 jours** (réponse sous 15 jours ouvrés)
- **Niveau 2** : escalade à l'équipe Compliance si insatisfaction, dans un délai supplémentaire de **15 jours**
- **Niveau 3** : arbitrage CCI (article 12) si aucune résolution amiable n'est trouvée

---

## 6. Obligations de l'Influenceur

6.1. **Transparence publicitaire — Obligations légales par pays.**

*Union Européenne / France :* Conformément à la directive 2005/29/CE et à la **loi française n° 2023-451 du 9 juin 2023**, toute publication commerciale doit mentionner explicitement **« Publicité »** ou **« Collaboration commerciale »** de façon visible, dès le début du contenu, avant tout appel à l'action.

*États-Unis — FTC (16 CFR Part 255) :* La divulgation doit être **claire, visible et compréhensible** par le consommateur moyen. Elle doit apparaître **avant** tout lien ou appel à l'action. Les termes acceptés : « #ad », « #sponsored », « Paid partnership ». Les termes insuffisants seuls : « #sp », « #gifted », simple tag de la marque.

*Australie — ACCC :* Les labels acceptés sont : « #Ad », « Advertising », « Branded Content », « Paid Partnership ». Les labels insuffisants : « #sp », « #spon », « #gifted ».

*Canada — Loi sur la concurrence :* Toute allégation publicitaire doit être véridique, non trompeuse et clairement identifiée comme commerciale.

**L'Influenceur s'engage à respecter la réglementation publicitaire applicable dans chaque pays où il diffuse du contenu.**

6.2. **Qualité du contenu.** L'Influenceur s'engage à :
- Créer des contenus authentiques et pertinents pour son audience
- Ne formuler que des affirmations véridiques et vérifiables sur les services SOS Expat
- Ne pas promettre des résultats garantis
- Respecter les chartes graphiques et guidelines de marque SOS Expat
- Ne pas modifier les messages clés sans validation préalable

6.3. **Conformité aux plateformes tierces.** L'Influenceur s'engage à respecter les CGU de chaque plateforme sur laquelle il opère (Instagram, TikTok, YouTube, etc.). SOS Expat n'est pas responsable des suspensions, restrictions ou pénalités infligées à l'Influenceur par des plateformes tierces.

6.4. **Sous-affiliation interdite.** L'Influenceur ne peut pas déléguer, sous-licencier ou céder ses droits affiliés à des tiers sans accord écrit préalable de SOS Expat. Toute délégation non autorisée entraîne la résiliation immédiate du compte.

6.5. **Exclusivité partielle.** L'Influenceur peut promouvoir d'autres services, à l'exclusion des **concurrents directs de SOS Expat** (plateformes de mise en relation expatriés/avocats ou experts juridiques en ligne proposant des services similaires). En cas de doute, l'Influenceur consulte SOS Expat avant toute promotion.

6.6. **Conformité légale générale.** L'Influenceur respecte toutes les lois applicables :
- Droit de la publicité et du marketing d'influence dans son pays de résidence et dans les pays ciblés
- Protection des données de ses abonnés (RGPD, CCPA le cas échéant)
- Déclaration fiscale de ses revenus d'affiliation
- Réglementations spécifiques à chaque plateforme

6.7. **Indépendance.** L'Influenceur agit en **prestataire indépendant** ; aucun lien d'emploi, contrat de travail, mandat ou relation d'agence n'est créé avec SOS Expat. L'Influenceur est seul responsable de ses cotisations sociales et obligations fiscales.

---

## 7. Paiement des commissions

7.1. **KYC obligatoire.** L'Influenceur doit compléter la vérification d'identité (KYC) **avant** tout retrait. Le KYC doit être initié dans les **90 jours** suivant la première commission validée.

7.2. **Méthodes de paiement.** Les retraits sont disponibles via :
- Virement bancaire (SEPA/International)
- PayPal
- Wise

7.3. **Délais.** Les paiements sont traités sous **7 jours ouvrés** après validation. Les délais d'encaissement dépendent également de la banque de l'Influenceur.

7.4. **Seuil minimum.** Le retrait est possible à partir de **$20** de solde disponible.

7.5. **Devise et conversion.** Tous les paiements sont libellés en **USD**. Si l'Influenceur souhaite être payé dans une autre devise, la conversion s'effectue au taux du jour Wise au moment du virement. Les **frais de conversion sont à la charge de l'Influenceur**.

7.6. **Fonds non réclamés.** En cas de non-complétion du KYC sous **180 jours** après la première commission validée, les fonds sont considérés abandonnés et peuvent être restitués à SOS Expat conformément aux lois applicables sur les propriétés abandonnées.

7.7. **Obligations fiscales — Général.** L'Influenceur est seul responsable de la déclaration et du paiement de ses impôts, taxes et cotisations sociales liés à ses revenus d'affiliation dans son pays de résidence.

7.8. **Obligations fiscales — USA (non-résidents).** Les Influenceurs non-résidents aux États-Unis qui perçoivent des paiements d'un opérateur américain devront fournir le formulaire **W-8BEN** (personnes physiques) ou **W-8BEN-E** (entités) avant tout paiement. Sans ce formulaire, une retenue à la source de **30%** peut être appliquée. Ce formulaire a une durée de validité de **3 ans** et doit être renouvelé.

7.9. **TVA / GST.** Si l'Influenceur est assujetti à la TVA ou à toute taxe sur la valeur ajoutée dans son pays, il est responsable de son application et de sa déclaration. Les commissions versées sont exprimées hors taxes.

7.10. **Justificatifs.** SOS Expat fournit à l'Influenceur un relevé mensuel détaillé des commissions générées, validées et versées, accessible depuis le dashboard.

---

## 8. Suspension et résiliation

8.1. **Suspension temporaire.** SOS Expat peut suspendre un compte en cas de :
- Suspicion de fraude ou de manipulation d'audience
- Violation des CGU ou des règles de transparence publicitaire
- Contenu préjudiciable à l'image de SOS Expat
- Inactivité prolongée (365+ jours sans aucune activité)

8.2. **Résiliation pour cause (for cause).** En cas de violation grave des CGU, fraude avérée, spam, violation de la marque ou violation légale, SOS Expat peut résilier le compte **avec effet immédiat**, sans préavis. Les commissions non encore validées sont annulées. Les commissions versées obtenues frauduleusement font l'objet d'un claw-back.

8.3. **Résiliation sans cause (without cause).** En dehors de toute violation, SOS Expat peut résilier le programme avec un préavis de **30 jours** notifié par email. Les commissions validées avant la date d'effet de la résiliation restent dues et seront payées normalement.

8.4. **Résiliation par l'Influenceur.** L'Influenceur peut clôturer son compte à tout moment, avec un préavis recommandé de **14 jours**. Les commissions validées restent payables.

8.5. **Effets de la résiliation.** À la résiliation :
- Le Code Affilié est désactivé immédiatement
- Les Filleuls et prestataires recrutés sont réattribués à SOS Expat
- L'accès au dashboard est supprimé
- L'Influenceur doit cesser immédiatement tout usage de la marque et des éléments SOS Expat

8.6. **Clauses survivant à la résiliation.** Les articles suivants restent en vigueur après résiliation : confidentialité (art. 13.5), propriété intellectuelle (art. 10), limitation de responsabilité (art. 11), loi applicable (art. 12), et protection des données (art. 9).

---

## 9. Données personnelles

9.1. **Responsable de traitement.** SOS Expat (WorldExpat OÜ, Tallinn, Estonie) est responsable du traitement des données personnelles dans le cadre du programme Influenceurs.

9.2. **Données collectées.** Identité, coordonnées, plateformes de diffusion et audiences, performances affiliées, données de paiement, informations fiscales, logs de connexion, adresse IP.

9.3. **Finalités et base légale (RGPD Art. 6).** Gestion du programme (exécution du contrat), paiement des commissions (exécution du contrat), prévention de la fraude (intérêt légitime), conformité légale et fiscale (obligation légale), amélioration des services (intérêt légitime).

9.4. **Durée de conservation.** Données actives pendant la relation contractuelle ; archives **10 ans** après résiliation pour les données comptables et fiscales (obligation légale estonienne et UE). Droit à l'effacement possible pour les données non soumises à obligation légale de conservation.

9.5. **Droits RGPD.** Accès, rectification, effacement, portabilité, opposition, limitation du traitement via contact@sos-expat.com. Droit de saisir la **CNIL** (France) ou toute autorité de contrôle compétente dans votre pays.

9.6. **Transferts hors UE.** En cas de transfert vers des pays tiers, SOS Expat met en œuvre des **clauses contractuelles types** (SCT) approuvées par la Commission européenne ou s'appuie sur des mécanismes équivalents.

9.7. **Conformité CCPA (Californie, USA).** Les Influenceurs résidents de Californie bénéficient des droits prévus par le California Consumer Privacy Act : droit de savoir, droit de supprimer, droit de refuser la vente/partage des données personnelles. Contactez contact@sos-expat.com pour exercer ces droits.

9.8. **Conformité PIPEDA / Loi 25 (Canada).** Les Influenceurs canadiens bénéficient des protections prévues par PIPEDA et, pour les résidents québécois, par la Loi 25. SOS Expat s'engage à notifier toute violation de données dans un délai de **72 heures** aux autorités compétentes.

9.9. **Conformité LGPD (Brésil).** Les Influenceurs résidents au Brésil bénéficient des droits prévus par la Lei Geral de Proteção de Dados (loi 13.709/2018).

9.10. **Obligations de l'Influenceur.** L'Influenceur qui collecte des données personnelles de ses abonnés dans le cadre de la promotion de SOS Expat est responsable du traitement de ces données et doit disposer d'une politique de confidentialité conforme aux lois applicables.

---

## 10. Propriété intellectuelle

10.1. La marque SOS Expat, logos, et contenus sont protégés. L'Influenceur reçoit une **licence limitée** d'utilisation des éléments marketing fournis (visuels, textes, bannières).

10.2. **Restrictions.** L'Influenceur ne peut pas :
- Modifier les logos ou marques SOS Expat
- Créer des comptes ou sites web imitant SOS Expat
- Enregistrer des noms de domaine ou handles contenant « SOS Expat »

10.3. **Contenu généré.** Les contenus créés par l'Influenceur pour promouvoir SOS Expat restent sa propriété, avec licence d'utilisation non exclusive accordée à SOS Expat à des fins de communication.

---

## 11. Responsabilité

11.1. **Limitation de responsabilité.** La responsabilité totale de SOS Expat envers l'Influenceur, quelle qu'en soit la cause, est limitée au montant total des **commissions versées au cours des 12 derniers mois** précédant la réclamation.

11.2. **Exclusion des dommages indirects.** SOS Expat exclut toute responsabilité pour les dommages indirects, spéciaux, consécutifs ou punitifs, y compris : perte de profits, perte d'opportunités commerciales, atteinte à la réputation, interruption d'activité — même si SOS Expat a été informé de la possibilité de tels dommages.

11.3. **Absence de garanties.** La Plateforme est fournie « en l'état » et « selon disponibilité ». SOS Expat ne garantit pas :
- La disponibilité continue de la plateforme (maintenance, pannes)
- Un niveau minimum de trafic, d'appels ou de revenus pour l'Influenceur
- La pérennité du programme (SOS Expat peut modifier ou fermer le programme avec préavis)

11.4. **Force majeure.** SOS Expat n'est pas responsable des retards ou inexécutions causés par des événements hors de son contrôle : catastrophes naturelles, guerres, cyberattaques, défaillances d'infrastructures Internet, décisions gouvernementales, pandémies.

11.5. **Restrictions géographiques.** Le programme est disponible dans la plupart des pays, à l'exception des pays sous embargo international (Nations Unies, Union Européenne, États-Unis OFAC) ou des pays dont la réglementation locale interdirait la participation à ce type de programme. SOS Expat se réserve le droit de refuser ou de suspendre des comptes provenant de ces territoires.

11.6. **Indemnisation par l'Influenceur.** L'Influenceur s'engage à défendre, indemniser et tenir SOS Expat indemne contre toute réclamation, amende ou frais (y compris honoraires d'avocats) découlant de : (i) la violation des présentes CGU, (ii) ses contenus promotionnels, (iii) la violation de droits de tiers, (iv) la violation de toute loi applicable, notamment en matière de transparence publicitaire.

---

## 12. Droit applicable

12.1. **Droit applicable.** Les présentes CGU sont régies par le **droit estonien**, sans préjudice des dispositions impératives applicables dans le pays de résidence de l'Influenceur (notamment pour les consommateurs européens bénéficiant des protections du Règlement Rome I).

12.2. **Processus de résolution des litiges (multi-niveaux).**
- **Étape 1 — Contact amiable** : toute réclamation doit d'abord être adressée à contact@sos-expat.com. SOS Expat s'engage à répondre sous **15 jours ouvrés**.
- **Étape 2 — Médiation interne** : en cas d'insatisfaction, l'Influenceur peut demander une revue par l'équipe Compliance dans un délai supplémentaire de **15 jours**.
- **Étape 3 — Arbitrage CCI** : tout litige non résolu à l'amiable est soumis à l'arbitrage de la **Chambre de Commerce Internationale (CCI)**, siège à Tallinn (Estonie), en langue française. La sentence arbitrale est définitive et exécutoire.

12.3. **Droits des autorités de contrôle.** La clause d'arbitrage ne prive pas l'Influenceur de son droit de saisir toute **autorité de protection des données** compétente (CNIL, etc.) ou toute autorité de régulation nationale compétente.

12.4. **Renonciation aux actions collectives.** Les parties renoncent à participer à toute action collective ou représentative. Chaque litige est traité individuellement.

12.5. **Langue.** La version française des présentes CGU prévaut en cas de divergence entre les différentes traductions disponibles.

---

## 13. Dispositions diverses

13.1. **Intégralité de l'accord.** Les présentes CGU, avec leurs annexes et tout document incorporé par référence, constituent l'accord complet entre les parties et remplacent tout accord antérieur oral ou écrit.

13.2. **Nullité partielle (Severability).** Si une clause est déclarée nulle ou inapplicable par une juridiction compétente, elle sera reformée au minimum nécessaire pour la rendre applicable. Les autres clauses restent pleinement en vigueur.

13.3. **Non-renonciation.** L'absence d'exercice d'un droit ou l'acceptation d'une situation non conforme dans un cas particulier ne constitue pas une renonciation définitive à ce droit.

13.4. **Cession.** L'Influenceur ne peut céder ses droits ou obligations sans accord écrit préalable de SOS Expat. SOS Expat peut céder ses droits dans le cadre d'une fusion, acquisition ou cession d'activité, avec notification à l'Influenceur.

13.5. **Confidentialité.** L'Influenceur s'engage à ne pas divulguer les informations confidentielles reçues dans le cadre du programme (taux de commissions spéciaux, données techniques de la plateforme, informations stratégiques). Cette obligation de confidentialité survit à la résiliation du contrat pendant **2 ans**.

13.6. **Modifications des CGU.** SOS Expat notifie toute modification significative par email au moins **30 jours** avant son entrée en vigueur. Pour les modifications urgentes imposées par une obligation légale, la notification peut être simultanée à l'entrée en vigueur. La poursuite du programme après la date d'effet vaut acceptation. En cas de refus, l'Influenceur peut résilier sans pénalité avant la date d'effet.

13.7. **Langue.** Le français prévaut en cas de divergence entre les différentes traductions disponibles.

---

## 14. Contact

Pour toute question concernant le programme Influenceurs, contactez-nous via le formulaire de contact ou à l'adresse : influenceurs@sos-expat.com
`;

  // Contenu par défaut EN
  const defaultEn = `
# Terms of Use – SOS Expat Influencer Program

**SOS Expat by WorldExpat OÜ** (the "**Platform**", "**SOS**", "**we**")

**Version 1.0 – Last updated: February 1, 2026**

---

## 1. Definitions

**Influencer**: any individual enrolled in the SOS Expat affiliate program to promote Platform services to their community (subscribers, followers) and earn commissions on generated transactions.

**Affiliate Code**: unique identifier assigned to the Influencer enabling tracking of recommendations and client calls generated through their publications.

**Commission**: compensation paid to the Influencer for each eligible paid call generated via their Affiliate Code.

**Referral Influencer**: any new Influencer registered via the Influencer's referral code.

**Audience**: all subscribers, followers and community of the Influencer across their platforms (Instagram, TikTok, YouTube, blog, etc.).

**Sponsored Content**: any content created by the Influencer to promote SOS Expat, which must be clearly identified as a commercial partnership.

---

## 2. Purpose and Acceptance

2.1. These Terms govern participation in the SOS Expat Influencer affiliate program.

2.2. By checking the acceptance box during registration, the Influencer accepts these Terms in full. This acceptance constitutes a **valid electronic signature** under **eIDAS Regulation (EU) No 910/2014**.

2.3. **Acceptance Traceability.** SOS Expat maintains a timestamped audit log including: IP address, session ID, user-agent, Terms version, document hash, and Influencer ID. This data is retained for **10 years**.

2.4. **Modifications.** SOS Expat may modify the Terms and/or commission rates with prospective effect. Continued use after notification constitutes acceptance.

2.5. **Capacity.** The Influencer declares to be of legal age and legally capable. Registration is **prohibited for minors**.

---

## 3. Affiliate Program

3.1. **Registration.** Program access requires: (i) valid registration with presentation of distribution platforms, (ii) acceptance of these Terms.

3.2. **Affiliate Code.** Upon validation, the Influencer receives a unique Affiliate Code to track client calls generated through their publications.

3.3. **Referrals.** The Influencer may recruit other Influencers via their referral code and earn commissions on their performance.

3.4. **Eligible Platforms.** The program is open to active creators on: Instagram, TikTok, YouTube, Facebook, Twitter/X, LinkedIn, blogs, podcasts, newsletters and other digital channels.

3.5. **Eligibility Criteria.** The Influencer must have an active and relevant audience for expat assistance services.

---

## 4. Commissions and Compensation

4.1. **Direct Call Commissions.** The Influencer earns **$10** for each paid call generated via their Affiliate Code, with no volume or time limits.

4.2. **Progression Levels and Bonuses.** The direct commission rate is enhanced based on the level achieved (determined by monthly activity volume):
- Level 1: ×1.00 (base $10/call)
- Level 2: ×1.10 (+10% → $11/call)
- Level 3: ×1.20 (+20% → $12/call)
- Level 4: ×1.35 (+35% → $13.50/call)
- Level 5: ×1.50 (+50% → $15/call)

**Monthly Top 3 Bonus:** The top 3 Influencers of the month receive an additional multiplier on all their commissions: 1st rank ×2.00 / 2nd rank ×1.50 / 3rd rank ×1.15.

4.3. **Provider Recruitment Commission.** The Influencer earns **$5** for each paid call made by a provider (lawyer, expat expert) they recommended via their recruitment code, for **12 months** from the provider's registration date. This commission ceases automatically upon expiry of the 12-month period.

4.4. **Influencer Recruitment Bonus.** For each Influencer recruited via the referral code, the referring Influencer earns a **one-time bonus of $5** when the recruited Influencer accumulates **$50 in total commissions**. This bonus is paid **once per recruited Influencer**, with no recurring commission on that Influencer's future calls.

4.5. **Attribution Model (Tracking).** Recommendations are tracked using a **Last-Click cookie valid for 30 days**: any click on the Influencer's affiliate link creates a 30-day cookie in the visitor's browser. If that visitor makes a paid call within this period, the commission is attributed to the Influencer. A new click on another affiliate link overwrites the previous cookie (Last-Click model). The Influencer acknowledges that cookie disabling by the user may prevent attribution.

4.6. **Validation Period (Hold Period).** Commissions go through a retention period before becoming payable:
- Status **"pending"**: during the **client withdrawal period (14 days)** following the call
- Status **"validated"**: after automatic anti-fraud verification is passed (variable delay)
- Status **"payable"**: at the next monthly payment cycle following validation

4.7. **Refund and Clawback Policy.** In case of client call refund or bank chargeback:
- The corresponding commission is **cancelled** if still in "pending" or "validated" status
- If the commission has already been paid, it is **deducted from the next payment** (clawback)
- In case of fraudulent chargeback attributable to the Influencer, additional **processing fees** may apply
- SOS Expat may recover paid commissions in case of fraud detected retroactively, within **12 months** of payment

4.8. **No Earnings Guarantee.** SOS Expat does not guarantee any minimum level of traffic, calls, or income. Past performance does not constitute a guarantee of future earnings.

4.9. **Commission Schedule (summary).**

| Commission Type | Amount | Duration | Conditions |
|---|---|---|---|
| Direct client call (via affiliate code) | $10/call (×level bonus) | Unlimited | None |
| Call via recruited provider | $5/call | 12 months max | None |
| Influencer recruitment bonus | $5 (once) | One-time | Recruited reaches $50 cumulative |
| Monthly Top 3 Bonus | ×2.00 / ×1.50 / ×1.15 | Monthly | Top 3 of month |

4.10. **Withdrawal Threshold.** Withdrawal is available from **$20** validated balance.

---

## 5. Anti-fraud Rules

5.1. **Tracking Fraud — Absolute Prohibitions.** The following are strictly prohibited, subject to immediate termination and legal action:
- **Cookie stuffing**: injecting affiliate cookies into a third party's browser without a real click (via hidden pixels, iframes, adware)
- **Forced click**: automatically redirecting a user to an affiliate page without their action
- **Self-referral**: using one's own code to generate calls or recruit fictitious accounts
- **Fictitious cross-referral**: organizing between multiple accounts to mutually refer each other
- **Artificial traffic / bots**: using scripts, robots, click farms, or traffic purchase services
- **Fake followers / fake engagement**: purchasing or using artificial audiences
- **Creating multiple accounts** under the same identity or linked identities
- **Tracking manipulation**: any attempt to modify, circumvent, or exploit attribution systems

5.2. **Prohibited Content.** The Influencer may not promote SOS Expat through content related to:
- Pornographic, violent, or hate content
- Illegal gambling, unregulated cryptocurrencies
- Drugs, weapons, illegal activities
- Counterfeiting or copyright infringement
- Content targeting minors for adult services
- Disinformation or deepfakes

5.3. **Trademark Bidding.** It is strictly prohibited to use the terms "SOS Expat", "sos-expat.com" or spelling variations as keywords in paid advertising campaigns (Google Ads, Meta Ads, TikTok Ads, etc.) without prior written authorization.

5.4. **Automatic Detection.** SOS Expat uses detection systems including:
- Suspicious call and click pattern analysis
- Audience authenticity and engagement verification
- Abnormal conversion rate analysis
- IP address, browser fingerprint, and behavior verification

5.5. **Graduated Sanctions.** In case of violation:
- **Warning** for first minor violation
- **Temporary suspension** and commission freeze
- **Cancellation** of all fraud-related commissions (clawback if already paid)
- **Permanent ban** from the Platform
- **Legal action** and damages claim if applicable

5.6. **Multi-Level Appeals Process.** The Influencer may contest a sanction through the following process:
- **Level 1**: dispute via contact form within **30 days** (response within 15 business days)
- **Level 2**: escalation to the Compliance team if unsatisfied, within an additional **15 days**
- **Level 3**: ICC arbitration (Article 12) if no amicable resolution is reached

---

## 6. Influencer Obligations

6.1. **Advertising Transparency — Legal Obligations by Country.**

*European Union / France:* Pursuant to Directive 2005/29/EC and the **French Act No. 2023-451 of June 9, 2023**, any commercial publication must explicitly mention **"Publicité"** (Advertising) or **"Collaboration commerciale"** (Commercial Collaboration) in a visible manner, at the beginning of the content, before any call to action.

*United States — FTC (16 CFR Part 255):* Disclosure must be **clear, prominent, and understandable** to the average consumer. It must appear **before** any link or call to action. Accepted terms: "#ad", "#sponsored", "Paid partnership". Terms insufficient alone: "#sp", "#gifted", simply tagging the brand.

*Australia — ACCC:* Accepted labels: "#Ad", "Advertising", "Branded Content", "Paid Partnership". Insufficient labels: "#sp", "#spon", "#gifted".

*Canada — Competition Act:* All advertising claims must be truthful, non-deceptive, and clearly identified as commercial.

**The Influencer agrees to comply with the advertising regulations applicable in each country where they distribute content.**

6.2. **Content Quality.** The Influencer agrees to:
- Create authentic and relevant content for their audience
- Only make truthful and verifiable statements about SOS Expat services
- Not promise guaranteed results
- Respect SOS Expat brand guidelines and graphic charters
- Not modify key messages without prior validation

6.3. **Third-Party Platform Compliance.** The Influencer agrees to comply with the terms of service of each platform on which they operate (Instagram, TikTok, YouTube, etc.). SOS Expat is not liable for suspensions, restrictions, or penalties imposed on the Influencer by third-party platforms.

6.4. **Sub-affiliation Prohibited.** The Influencer may not delegate, sub-license, or transfer their affiliate rights to third parties without prior written approval from SOS Expat. Any unauthorized delegation results in immediate account termination.

6.5. **Partial Exclusivity.** The Influencer may promote other services, excluding **direct competitors of SOS Expat** (online platforms connecting expats with lawyers or legal/expat experts offering similar services). In case of doubt, the Influencer consults SOS Expat before any promotion.

6.6. **General Legal Compliance.** The Influencer complies with all applicable laws:
- Advertising and influencer marketing law in their country of residence and in targeted countries
- Protection of subscribers' personal data (GDPR, CCPA as applicable)
- Tax declaration of affiliate income
- Platform-specific regulations

6.7. **Independence.** The Influencer acts as an **independent contractor**; no employment contract, agency, or mandate relationship is created with SOS Expat. The Influencer is solely responsible for their social contributions and tax obligations.

---

## 7. Commission Payments

7.1. **Mandatory KYC.** The Influencer must complete identity verification (KYC) **before** any withdrawal. KYC must be initiated within **90 days** of the first validated commission.

7.2. **Payment Methods.** Withdrawals are available via:
- Bank transfer (SEPA/International)
- PayPal
- Wise

7.3. **Timing.** Payments are processed within **7 business days** after validation. Processing times also depend on the Influencer's bank.

7.4. **Minimum Threshold.** Withdrawal is possible from **$20** available balance.

7.5. **Currency and Conversion.** All payments are denominated in **USD**. If the Influencer wishes to be paid in another currency, conversion is made at the Wise rate on the day of transfer. **Conversion fees are at the Influencer's expense.**

7.6. **Unclaimed Funds.** If KYC is not completed within **180 days** of the first validated commission, funds are considered abandoned and may be returned to SOS Expat pursuant to applicable unclaimed property laws.

7.7. **Tax Obligations — General.** The Influencer is solely responsible for declaring and paying their taxes, levies, and social contributions related to affiliate income in their country of residence.

7.8. **Tax Obligations — USA (non-residents).** Influencers not residing in the United States who receive payments from a US-based operator must provide form **W-8BEN** (individuals) or **W-8BEN-E** (entities) before any payment. Without this form, a **30% withholding tax** may be applied. This form has a **3-year** validity and must be renewed.

7.9. **VAT / GST.** If the Influencer is subject to VAT or any value-added tax in their country, they are responsible for its application and declaration. Commissions paid are expressed exclusive of tax.

7.10. **Statements.** SOS Expat provides the Influencer with a detailed monthly statement of generated, validated, and paid commissions, accessible from the dashboard.

---

## 8. Suspension and Termination

8.1. **Temporary Suspension.** SOS Expat may suspend an account in case of:
- Fraud suspicion or audience manipulation
- Terms violation or advertising transparency rules
- Content harmful to SOS Expat's image
- Extended inactivity (365+ days without any activity)

8.2. **Termination for Cause.** In case of serious Terms violation, proven fraud, spam, trademark infringement, or legal violation, SOS Expat may terminate the account **with immediate effect**, without notice. Unvalidated commissions are cancelled. Paid commissions obtained fraudulently are subject to clawback.

8.3. **Termination without Cause.** Outside of any violation, SOS Expat may terminate the program with **30 days' notice** by email. Commissions validated before the termination effective date remain due and will be paid normally.

8.4. **Termination by Influencer.** The Influencer may close their account at any time, with a recommended notice of **14 days**. Validated commissions remain payable.

8.5. **Effects of Termination.** Upon termination:
- Affiliate Code is immediately deactivated
- Recruited referrals and providers are reassigned to SOS Expat
- Dashboard access is removed
- The Influencer must immediately cease all use of the SOS Expat brand and materials

8.6. **Surviving Clauses.** The following articles remain in force after termination: confidentiality (Art. 13.5), intellectual property (Art. 10), limitation of liability (Art. 11), governing law (Art. 12), and data protection (Art. 9).

---

## 9. Personal Data

9.1. **Data Controller.** SOS Expat (WorldExpat OÜ, Tallinn, Estonia) is the data controller for personal data processed under the Influencer program.

9.2. **Data Collected.** Identity, contact details, distribution platforms and audiences, affiliate performance, payment data, tax information, connection logs, IP address.

9.3. **Purposes and Legal Basis (GDPR Art. 6).** Program management (contract performance), commission payments (contract performance), fraud prevention (legitimate interest), legal and tax compliance (legal obligation), service improvement (legitimate interest).

9.4. **Retention.** Active data during the contractual relationship; **10-year** archives after termination for accounting and tax data (Estonian and EU legal obligation). Right to erasure available for data not subject to mandatory retention.

9.5. **GDPR Rights.** Access, rectification, erasure, portability, objection, restriction of processing via contact@sos-expat.com. Right to lodge a complaint with the competent supervisory authority in your country.

9.6. **International Transfers.** For transfers to third countries, SOS Expat implements **Standard Contractual Clauses** (SCCs) approved by the European Commission or equivalent mechanisms.

9.7. **CCPA Compliance (California, USA).** California-resident Influencers benefit from California Consumer Privacy Act rights: right to know, right to delete, right to opt-out of sale/sharing of personal data. Contact contact@sos-expat.com to exercise these rights.

9.8. **PIPEDA / Law 25 Compliance (Canada).** Canadian Influencers benefit from PIPEDA protections and, for Quebec residents, Law 25. SOS Expat commits to notifying any data breach to the competent authorities within **72 hours**.

9.9. **LGPD Compliance (Brazil).** Brazil-resident Influencers benefit from rights under the Lei Geral de Proteção de Dados (Law 13.709/2018).

9.10. **Influencer Obligations.** The Influencer who collects personal data from their followers in connection with promoting SOS Expat is responsible for that processing and must have a privacy policy compliant with applicable laws.

---

## 10. Intellectual Property

10.1. The SOS Expat brand, logos, and content are protected. The Influencer receives a **limited license** to use provided marketing materials (visuals, texts, banners).

10.2. **Restrictions.** The Influencer may not:
- Modify SOS Expat logos or trademarks
- Create accounts or websites imitating SOS Expat
- Register domain names or handles containing "SOS Expat"

10.3. **Generated Content.** Content created by the Influencer to promote SOS Expat remains their property, with a non-exclusive usage license granted to SOS Expat for communication purposes.

---

## 11. Liability

11.1. **Liability Cap.** SOS Expat's total liability toward the Influencer, regardless of cause, is limited to the total amount of **commissions paid in the last 12 months** preceding the claim.

11.2. **Exclusion of Indirect Damages.** SOS Expat excludes all liability for indirect, special, consequential, or punitive damages, including: loss of profits, loss of business opportunities, reputational harm, business interruption — even if SOS Expat was informed of the possibility of such damages.

11.3. **No Warranties.** The Platform is provided "as is" and "as available". SOS Expat does not guarantee:
- Continuous platform availability (maintenance, outages)
- Any minimum level of traffic, calls, or income for the Influencer
- Program continuity (SOS Expat may modify or close the program with notice)

11.4. **Force Majeure.** SOS Expat is not liable for delays or non-performance caused by events beyond its control: natural disasters, wars, cyberattacks, Internet infrastructure failures, governmental decisions, pandemics.

11.5. **Geographic Restrictions.** The program is available in most countries, except those under international embargo (United Nations, European Union, US OFAC) or countries whose local regulations would prohibit participation in this type of program. SOS Expat reserves the right to reject or suspend accounts from these territories.

11.6. **Indemnification by Influencer.** The Influencer agrees to defend, indemnify, and hold SOS Expat harmless against any claim, fine, or expense (including reasonable attorney's fees) arising from: (i) breach of these Terms, (ii) their promotional content, (iii) infringement of third-party rights, (iv) violation of any applicable law, particularly regarding advertising transparency.

---

## 12. Governing Law

12.1. **Governing Law.** These Terms are governed by **Estonian law**, without prejudice to mandatory provisions applicable in the Influencer's country of residence (particularly for EU consumers benefiting from the protections of Regulation Rome I).

12.2. **Multi-Level Dispute Resolution.**
- **Step 1 — Amicable contact**: all claims must first be submitted to contact@sos-expat.com. SOS Expat commits to responding within **15 business days**.
- **Step 2 — Internal mediation**: if unsatisfied, the Influencer may request a review by the Compliance team within an additional **15 days**.
- **Step 3 — ICC Arbitration**: any unresolved dispute shall be submitted to **International Chamber of Commerce (ICC)** arbitration, seated in Tallinn (Estonia), in French. The arbitral award is final and binding.

12.3. **Supervisory Authority Rights.** The arbitration clause does not deprive the Influencer of their right to lodge a complaint with any competent **data protection authority** (CNIL, etc.) or any competent national regulatory authority.

12.4. **Class Action Waiver.** The parties waive the right to participate in any class or representative action. Each dispute is handled individually.

12.5. **Language.** The French version of these Terms prevails in case of discrepancy between the available translations.

---

## 13. Miscellaneous

13.1. **Entire Agreement.** These Terms, together with any annexes and documents incorporated by reference, constitute the complete agreement between the parties and supersede all prior oral or written agreements.

13.2. **Severability.** If a clause is declared void or unenforceable by a competent court, it shall be reformed to the minimum extent necessary to make it enforceable. Other clauses remain fully in force.

13.3. **No Waiver.** Failure to exercise a right or acceptance of a non-compliant situation in a particular case does not constitute a permanent waiver of that right.

13.4. **Assignment.** The Influencer may not assign their rights or obligations without prior written approval from SOS Expat. SOS Expat may assign its rights in the context of a merger, acquisition, or business transfer, with notification to the Influencer.

13.5. **Confidentiality.** The Influencer agrees not to disclose confidential information received under the program (special commission rates, platform technical data, strategic information). This confidentiality obligation survives termination of the contract for **2 years**.

13.6. **Terms Modifications.** SOS Expat will notify any significant modification by email at least **30 days** before its effective date. For urgent modifications required by a legal obligation, notification may be simultaneous with the effective date. Continued participation after the effective date constitutes acceptance. In case of refusal, the Influencer may terminate without penalty before the effective date.

13.7. **Language.** French prevails in case of discrepancy between the available translations.

---

## 14. Contact

For any questions about the Influencer program, contact us via the contact form or at: influencers@sos-expat.com
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
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-orange-900 to-amber-900 text-white py-16 sm:py-24">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-orange-200 mb-6">
              <Sparkles className="w-4 h-4" />
              {t.heroBadge}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6">
              {t.title}
            </h1>
            <p className="text-lg sm:text-xl text-orange-100 max-w-3xl mx-auto mb-4">
              {t.subtitle}
            </p>
            <p className="text-sm text-orange-200/80">{t.lastUpdated}</p>
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
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100"
              >
                {index === 0 && <DollarSign className="w-6 h-6 text-orange-500 flex-shrink-0" />}
                {index === 1 && <TrendingUp className="w-6 h-6 text-orange-500 flex-shrink-0" />}
                {index === 2 && <Gift className="w-6 h-6 text-orange-500 flex-shrink-0" />}
                {index === 3 && <Users className="w-6 h-6 text-orange-500 flex-shrink-0" />}
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
                      ? "bg-orange-500 text-white shadow-md"
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
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
              <span className="ml-4 text-gray-600">{t.loading}</span>
            </div>
          ) : (
            <div className="prose prose-lg max-w-none">{parsedContent}</div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-gray-900 via-orange-900 to-amber-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <TrendingUp className="w-16 h-16 mx-auto mb-6 text-orange-300" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.readyToJoin}</h2>
          <p className="text-lg text-orange-100 mb-8">{t.readySubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={getLocalePath("/influencer/inscription")}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-all hover:scale-105 shadow-lg"
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
          <p className="mt-8 text-sm text-orange-200">{t.trustedByHelpers}</p>
        </div>
      </section>
    </Layout>
  );
};

export default TermsInfluencers;
