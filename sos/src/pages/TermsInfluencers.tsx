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

4.1. **Commissions directes par appel.** L'Influenceur perçoit **$10** pour chaque appel payant généré via son Code Affilié, sans limite de volume ni de durée. Ces commissions directes sont acquises indépendamment de toute condition d'activité.

4.2. **Commissions de parrainage (Filleul N1).** L'Influenceur perçoit une commission sur chaque appel client généré par ses Filleuls Influenceurs N1, pendant **12 mois** à compter de la date d'inscription du Filleul N1. **Conditions cumulatives pour percevoir cette commission :**
- L'Influenceur doit réaliser un minimum de **$50 de commissions directes** (article 4.1) au cours du mois civil concerné
- L'Influenceur doit assurer la formation et le suivi de ses Filleuls N1 : partage des ressources et guidelines de marque, réponse aux questions dans un délai de 48h, accompagnement dans la prise en main du programme
- En l'absence de ces conditions sur un mois donné, les commissions N1 de ce mois sont suspendues (non rétroactives)

4.3. **Commissions de parrainage (Filleul N2).** L'Influenceur perçoit une commission sur chaque appel client généré par ses Filleuls N2, pendant **12 mois** à compter de la date d'inscription du Filleul N2. Les **mêmes conditions cumulatives** qu'en 4.2 s'appliquent.

4.4. **Durée maximale des commissions d'affiliation.** Les commissions sur les Filleuls (N1 et N2) sont versées pendant **12 mois maximum** à compter de la date d'inscription de chaque filleul. Passé ce délai, l'Influenceur conserve uniquement ses commissions directes (article 4.1). Il peut recruter de nouveaux filleuls pour démarrer de nouvelles périodes de 12 mois.

4.5. **Barèmes de commissions (récapitulatif).**

| Type de commission | Montant | Durée | Conditions |
|---|---|---|---|
| Appel client direct (via code affilié) | $10/appel | Illimitée | Aucune |
| Appel via Filleul Influenceur N1 | Variable | 12 mois | $50/mois + formation |
| Appel via Filleul Influenceur N2 | Variable | 12 mois | $50/mois + formation |

4.6. **Seuils de paiement.** Les commissions sont validées après :
- Période de rétractation client (14 jours)
- Validation anti-fraude automatique
- Atteinte du seuil minimum de retrait (**$20**)

4.7. **Bonus de performance.** Des bonus supplémentaires peuvent être accordés en fonction du volume de recommandations et de la qualité de l'audience générée.

---

## 5. Règles anti-fraude

5.1. **Interdictions strictes.** Sont formellement interdits :
- L'auto-parrainage ou parrainage croisé fictif
- L'achat de faux followers ou faux engagement
- L'utilisation de bots ou scripts automatisés
- La génération artificielle d'appels (self-calls, faux clients)
- La création de comptes multiples
- Toute manipulation des systèmes de tracking

5.2. **Détection automatique.** SOS Expat utilise des systèmes de détection incluant :
- Analyse des patterns d'appels suspects
- Vérification de l'authenticité des audiences
- Analyse des taux de conversion anormaux

5.3. **Sanctions.** En cas de fraude avérée ou suspectée :
- **Suspension immédiate** du compte
- **Annulation** de toutes les commissions concernées
- **Bannissement définitif** de la Plateforme
- **Poursuites judiciaires** le cas échéant

5.4. **Recours.** L'Influenceur peut contester une sanction via le formulaire de contact dans un délai de **30 jours**.

---

## 6. Obligations de l'Influenceur

6.1. **Transparence publicitaire.** L'Influenceur s'engage à :
- Identifier clairement tout contenu sponsorisé (#partenariat, #publicité, #sponsored, #ad)
- Respecter les règles de la plateforme ARPP et les directives de chaque réseau social
- Ne pas présenter SOS Expat de façon trompeuse
- Mentionner honnêtement les tarifs et conditions des services

6.2. **Qualité du contenu.** L'Influenceur s'engage à :
- Créer des contenus authentiques et pertinents pour son audience
- Ne pas dénigrer la concurrence
- Respecter les chartes graphiques et guidelines de marque SOS Expat
- Ne pas modifier les messages clés sans validation préalable

6.3. **Conformité légale.** L'Influenceur respecte toutes les lois applicables :
- Droit de la publicité et du marketing d'influence
- Protection des données (RGPD)
- Déclaration fiscale de ses revenus d'influence
- Réglementations spécifiques à chaque plateforme

6.4. **Indépendance.** L'Influenceur agit en **indépendant** ; aucun lien d'emploi, mandat ou agence n'est créé avec SOS Expat.

---

## 7. Paiement des commissions

7.1. **KYC obligatoire.** L'Influenceur doit compléter la vérification d'identité (KYC) **avant** tout retrait.

7.2. **Méthodes de paiement.** Les retraits sont disponibles via :
- Virement bancaire (SEPA/International)
- PayPal
- Wise

7.3. **Délais.** Les paiements sont traités sous **7 jours ouvrés** après validation.

7.4. **Seuil minimum.** Le retrait est possible à partir de **$20** de solde disponible.

7.5. **Fonds non réclamés.** En cas de non-complétion du KYC sous **180 jours**, les fonds sont considérés abandonnés conformément à l'article 8.7 des CGU générales.

7.6. **Taxes.** L'Influenceur est seul responsable de la déclaration et du paiement de ses impôts et charges sociales liés à ses revenus d'influence.

---

## 8. Suspension et résiliation

8.1. **Suspension temporaire.** SOS Expat peut suspendre un compte en cas de :
- Suspicion de fraude ou de manipulation d'audience
- Violation des CGU ou des règles de transparence publicitaire
- Contenu préjudiciable à l'image de SOS Expat
- Inactivité prolongée (365+ jours)

8.2. **Résiliation par l'Influenceur.** L'Influenceur peut clôturer son compte à tout moment. Les commissions validées restent payables.

8.3. **Résiliation par SOS Expat.** En cas de violation grave, SOS Expat peut résilier le compte avec effet immédiat. Les commissions non validées sont annulées.

8.4. **Effets de la résiliation.** À la résiliation :
- Le Code Affilié est désactivé
- Les Filleuls sont réattribués à SOS Expat
- L'accès au dashboard est supprimé

---

## 9. Données personnelles

9.1. **Responsable de traitement.** SOS Expat (WorldExpat OÜ) pour les données du programme Influenceurs.

9.2. **Données collectées.** Identité, coordonnées, plateformes de diffusion, performances, données de paiement, logs de connexion.

9.3. **Finalités.** Gestion du programme, paiement des commissions, prévention de la fraude, amélioration des services.

9.4. **Durée de conservation.** Données actives pendant la relation ; archives 10 ans après résiliation (obligations légales).

9.5. **Droits.** Accès, rectification, effacement, portabilité, opposition via contact@sos-expat.com.

9.6. **Transferts.** Avec garanties appropriées (clauses contractuelles types) si hors UE.

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

11.1. **Limitation.** La responsabilité de SOS Expat est limitée aux **commissions dues** au titre des 12 derniers mois.

11.2. **Exclusions.** SOS Expat n'est pas responsable des :
- Dommages indirects (perte de revenus, d'opportunités, atteinte à la réputation)
- Actions des Filleuls ou utilisateurs
- Problèmes techniques des plateformes tierces (réseaux sociaux)

11.3. **Indemnisation.** L'Influenceur indemnise SOS Expat contre toute réclamation liée à ses contenus, notamment en cas de non-respect des règles de transparence publicitaire.

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

4.1. **Direct Call Commissions.** The Influencer earns **$10** for each paid call generated via their Affiliate Code, with no volume or time limits. These direct commissions are earned independently of any activity conditions.

4.2. **Referral Commissions (N1 Referral).** The Influencer earns a commission on each client call generated by their N1 Influencer Referrals, for **12 months** from the N1 Referral's registration date. **Cumulative conditions to earn this commission:**
- The Influencer must achieve a minimum of **$50 in direct commissions** (Article 4.1) during the calendar month concerned
- The Influencer must ensure training and follow-up of their N1 Referrals: sharing resources and brand guidelines, responding to questions within 48 hours, assisting with program onboarding
- In the absence of these conditions in a given month, N1 commissions for that month are suspended (non-retroactive)

4.3. **Referral Commissions (N2 Referral).** The Influencer earns a commission on each client call generated by their N2 Referrals, for **12 months** from the N2 Referral's registration date. The **same cumulative conditions** as in 4.2 apply.

4.4. **Maximum Affiliate Commission Duration.** Commissions on Referrals (N1 and N2) are paid for a **maximum of 12 months** from each referral's registration date. After this period, the Influencer retains only their direct commissions (Article 4.1). They may recruit new referrals to start new 12-month periods.

4.5. **Commission Schedule (summary).**

| Commission Type | Amount | Duration | Conditions |
|---|---|---|---|
| Direct client call (via affiliate code) | $10/call | Unlimited | None |
| Call via N1 Influencer Referral | Variable | 12 months | $50/month + training |
| Call via N2 Influencer Referral | Variable | 12 months | $50/month + training |

4.6. **Payment Thresholds.** Commissions are validated after:
- Client withdrawal period (14 days)
- Automatic anti-fraud validation
- Reaching minimum withdrawal threshold (**$20**)

4.7. **Performance Bonuses.** Additional bonuses may be granted based on recommendation volume and quality of generated audience.

---

## 5. Anti-fraud Rules

5.1. **Strict Prohibitions.** The following are strictly prohibited:
- Self-referral or fictitious cross-referral
- Purchasing fake followers or fake engagement
- Using bots or automated scripts
- Artificially generating calls (self-calls, fake clients)
- Creating multiple accounts
- Any manipulation of tracking systems

5.2. **Automatic Detection.** SOS Expat uses detection systems including:
- Suspicious call pattern analysis
- Audience authenticity verification
- Abnormal conversion rate analysis

5.3. **Sanctions.** In case of proven or suspected fraud:
- **Immediate suspension** of account
- **Cancellation** of all affected commissions
- **Permanent ban** from the Platform
- **Legal action** if applicable

5.4. **Appeals.** The Influencer may contest a sanction via the contact form within **30 days**.

---

## 6. Influencer Obligations

6.1. **Advertising Transparency.** The Influencer agrees to:
- Clearly identify all sponsored content (#partnership, #ad, #sponsored)
- Comply with platform rules and each social network's guidelines
- Not misrepresent SOS Expat
- Honestly mention service pricing and conditions

6.2. **Content Quality.** The Influencer agrees to:
- Create authentic and relevant content for their audience
- Not disparage competitors
- Respect SOS Expat brand guidelines and graphic charters
- Not modify key messages without prior validation

6.3. **Legal Compliance.** The Influencer complies with all applicable laws:
- Advertising and influencer marketing law
- Data protection (GDPR)
- Tax declaration of influencer income
- Platform-specific regulations

6.4. **Independence.** The Influencer acts as an **independent contractor**; no employment, agency, or mandate relationship is created with SOS Expat.

---

## 7. Commission Payments

7.1. **Mandatory KYC.** The Influencer must complete identity verification (KYC) **before** any withdrawal.

7.2. **Payment Methods.** Withdrawals are available via:
- Bank transfer (SEPA/International)
- PayPal
- Wise

7.3. **Timing.** Payments are processed within **7 business days** after validation.

7.4. **Minimum Threshold.** Withdrawal is possible from **$20** available balance.

7.5. **Unclaimed Funds.** If KYC is not completed within **180 days**, funds are considered abandoned per Article 8.7 of the general Terms.

7.6. **Taxes.** The Influencer is solely responsible for declaring and paying their taxes and social charges related to influencer income.

---

## 8. Suspension and Termination

8.1. **Temporary Suspension.** SOS Expat may suspend an account in case of:
- Fraud suspicion or audience manipulation
- Terms violation or advertising transparency rules
- Content harmful to SOS Expat's image
- Extended inactivity (365+ days)

8.2. **Termination by Influencer.** The Influencer may close their account at any time. Validated commissions remain payable.

8.3. **Termination by SOS Expat.** In case of serious violation, SOS Expat may terminate the account with immediate effect. Unvalidated commissions are cancelled.

8.4. **Effects of Termination.** Upon termination:
- Affiliate Code is deactivated
- Referrals are reassigned to SOS Expat
- Dashboard access is removed

---

## 9. Personal Data

9.1. **Data Controller.** SOS Expat (WorldExpat OÜ) for Influencer program data.

9.2. **Data Collected.** Identity, contact details, distribution platforms, performance, payment data, connection logs.

9.3. **Purposes.** Program management, commission payments, fraud prevention, service improvement.

9.4. **Retention.** Active data during relationship; archives 10 years after termination (legal obligations).

9.5. **Rights.** Access, rectification, erasure, portability, objection via contact@sos-expat.com.

9.6. **Transfers.** With appropriate safeguards (standard contractual clauses) if outside EU.

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

11.1. **Limitation.** SOS Expat's liability is limited to **commissions due** for the last 12 months.

11.2. **Exclusions.** SOS Expat is not liable for:
- Indirect damages (loss of revenue, opportunities, reputational harm)
- Actions of Referrals or users
- Technical issues with third-party platforms (social networks)

11.3. **Indemnification.** The Influencer indemnifies SOS Expat against any claims related to their content, particularly in case of non-compliance with advertising transparency rules.

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

For any questions about the Influencer program, contact us via the contact form or at: influencers@sos-expat.com
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
