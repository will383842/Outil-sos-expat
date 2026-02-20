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
  UserCheck,
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
 * TermsGroupAdmins - CGU pour les Administrateurs de Groupe SOS Expat
 * - Support multilingue (9 langues)
 * - Contenu éditable depuis l'admin (collection `legal_documents` type "terms_group_admins")
 * - Design harmonisé avec les autres pages CGU (thème emerald/teal)
 */

type SupportedLanguage = "fr" | "en" | "es" | "de" | "ru" | "hi" | "ch" | "pt" | "ar";

const TermsGroupAdmins: React.FC = () => {
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
          where("type", "==", "terms_group_admins"),
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
      title: "CGU Administrateurs de Groupe SOS Expat",
      subtitle: "Conditions générales d'utilisation pour les administrateurs de groupes communautaires SOS Expat",
      lastUpdated: "Version 1.0 – Dernière mise à jour : 1er février 2026",
      loading: "Chargement...",
      joinNetwork: "Devenir Admin de Groupe",
      trustedByHelpers: "Rejoignez notre réseau d'administrateurs de groupes expatriés",
      keyFeatures: "Points clés",
      features: [
        "Commissions sur chaque appel des prestataires recrutés",
        "Recrutez d'autres admins et prestataires",
        "Ressources exclusives pour animer vos groupes",
        "Programme d'affiliation multi-niveaux",
      ],
      languageToggle: "Changer de langue",
      sections: {
        definitions: "Définitions",
        scope: "Objet et acceptation",
        program: "Programme d'affiliation",
        commissions: "Commissions et rémunération",
        antifraud: "Règles anti-fraude",
        obligations: "Obligations de l'Admin Groupe",
        payment: "Paiement des commissions",
        suspension: "Suspension et résiliation",
        data: "Données personnelles",
        ip: "Propriété intellectuelle",
        liability: "Responsabilité",
        law: "Droit applicable",
        misc: "Dispositions diverses",
        contact: "Contact",
      },
      readyToJoin: "Prêt à devenir administrateur de groupe SOS Expat ?",
      readySubtitle: "Monétisez votre communauté en recrutant des prestataires et en promouvant nos services aux expatriés.",
      startNow: "S'inscrire maintenant",
      contactUs: "Nous contacter",
      anchorTitle: "Sommaire",
      editHint: "Document éditable depuis la console admin",
      ctaHero: "Commencer",
      heroBadge: "Programme Admin Groupe — Lancé en 2026",
      contactForm: "Formulaire de contact",
    },
    en: {
      title: "SOS Expat Group Admin Terms",
      subtitle: "Terms of Use for SOS Expat community group administrators",
      lastUpdated: "Version 1.0 – Last updated: February 1, 2026",
      loading: "Loading...",
      joinNetwork: "Become a Group Admin",
      trustedByHelpers: "Join our expat group administrator network",
      keyFeatures: "Key features",
      features: [
        "Commissions on every recruited provider call",
        "Recruit other admins and providers",
        "Exclusive resources to animate your groups",
        "Multi-level affiliate program",
      ],
      languageToggle: "Switch language",
      sections: {
        definitions: "Definitions",
        scope: "Purpose and Acceptance",
        program: "Affiliate Program",
        commissions: "Commissions and Compensation",
        antifraud: "Anti-fraud Rules",
        obligations: "Group Admin Obligations",
        payment: "Commission Payments",
        suspension: "Suspension and Termination",
        data: "Personal Data",
        ip: "Intellectual Property",
        liability: "Liability",
        law: "Governing Law",
        misc: "Miscellaneous",
        contact: "Contact",
      },
      readyToJoin: "Ready to become an SOS Expat group administrator?",
      readySubtitle: "Monetize your community by recruiting providers and promoting our expat services.",
      startNow: "Sign up now",
      contactUs: "Contact us",
      anchorTitle: "Overview",
      editHint: "Document editable from admin console",
      ctaHero: "Get started",
      heroBadge: "Group Admin Program — Launched 2026",
      contactForm: "Contact Form",
    },
    es: {
      title: "Términos para Administradores de Grupo SOS Expat",
      subtitle: "Términos de uso para administradores de grupos comunitarios SOS Expat",
      lastUpdated: "Versión 1.0 – Última actualización: 1 de febrero de 2026",
      loading: "Cargando...",
      joinNetwork: "Convertirse en Admin de Grupo",
      trustedByHelpers: "Únete a nuestra red de administradores de grupos de expatriados",
      keyFeatures: "Características clave",
      features: [
        "Comisiones por cada llamada de proveedores reclutados",
        "Recluta otros admins y proveedores",
        "Recursos exclusivos para animar tus grupos",
        "Programa de afiliados multinivel",
      ],
      languageToggle: "Cambiar idioma",
      sections: {
        definitions: "Definiciones",
        scope: "Objeto y aceptación",
        program: "Programa de afiliados",
        commissions: "Comisiones y compensación",
        antifraud: "Reglas antifraude",
        obligations: "Obligaciones del Admin de Grupo",
        payment: "Pago de comisiones",
        suspension: "Suspensión y terminación",
        data: "Datos personales",
        ip: "Propiedad intelectual",
        liability: "Responsabilidad",
        law: "Ley aplicable",
        misc: "Disposiciones varias",
        contact: "Contacto",
      },
      readyToJoin: "¿Listo para convertirte en administrador de grupo SOS Expat?",
      readySubtitle: "Monetiza tu comunidad reclutando proveedores y promoviendo nuestros servicios a expatriados.",
      startNow: "Inscribirse ahora",
      contactUs: "Contáctanos",
      anchorTitle: "Resumen",
      editHint: "Documento editable desde la consola de administración",
      ctaHero: "Empezar",
      heroBadge: "Programa Admin de Grupo — Lanzado en 2026",
      contactForm: "Formulario de contacto",
    },
    de: {
      title: "AGB für SOS Expat Gruppenadministratoren",
      subtitle: "Nutzungsbedingungen für SOS Expat Community-Gruppenadministratoren",
      lastUpdated: "Version 1.0 – Letzte Aktualisierung: 1. Februar 2026",
      loading: "Lädt...",
      joinNetwork: "Gruppenadmin werden",
      trustedByHelpers: "Schließen Sie sich unserem Expat-Gruppenadmin-Netzwerk an",
      keyFeatures: "Hauptmerkmale",
      features: [
        "Provisionen für jeden Anruf des geworbenen Anbieters",
        "Weitere Admins und Anbieter werben",
        "Exklusive Ressourcen zur Gruppenanimation",
        "Mehrstufiges Partnerprogramm",
      ],
      languageToggle: "Sprache wechseln",
      sections: {
        definitions: "Definitionen",
        scope: "Gegenstand und Annahme",
        program: "Partnerprogramm",
        commissions: "Provisionen und Vergütung",
        antifraud: "Anti-Betrugsregeln",
        obligations: "Pflichten des Gruppenadmins",
        payment: "Provisionszahlungen",
        suspension: "Aussetzung und Kündigung",
        data: "Personenbezogene Daten",
        ip: "Geistiges Eigentum",
        liability: "Haftung",
        law: "Anwendbares Recht",
        misc: "Sonstiges",
        contact: "Kontakt",
      },
      readyToJoin: "Bereit, SOS Expat Gruppenadmin zu werden?",
      readySubtitle: "Monetarisieren Sie Ihre Community durch Anwerbung von Anbietern und Werbung für unsere Expatriate-Dienste.",
      startNow: "Jetzt anmelden",
      contactUs: "Kontaktieren Sie uns",
      anchorTitle: "Übersicht",
      editHint: "Dokument über Admin-Konsole bearbeitbar",
      ctaHero: "Loslegen",
      heroBadge: "Gruppenadmin-Programm — Gestartet 2026",
      contactForm: "Kontaktformular",
    },
    ru: {
      title: "Условия для Администраторов Групп SOS Expat",
      subtitle: "Условия использования для администраторов сообществ SOS Expat",
      lastUpdated: "Версия 1.0 – Последнее обновление: 1 февраля 2026 г.",
      loading: "Загрузка...",
      joinNetwork: "Стать администратором группы",
      trustedByHelpers: "Присоединяйтесь к нашей сети администраторов групп эмигрантов",
      keyFeatures: "Ключевые особенности",
      features: [
        "Комиссии за каждый звонок привлечённых провайдеров",
        "Привлекайте других админов и провайдеров",
        "Эксклюзивные ресурсы для ведения групп",
        "Многоуровневая партнёрская программа",
      ],
      languageToggle: "Сменить язык",
      sections: {
        definitions: "Определения",
        scope: "Предмет и принятие",
        program: "Партнёрская программа",
        commissions: "Комиссии и вознаграждение",
        antifraud: "Правила против мошенничества",
        obligations: "Обязанности администратора группы",
        payment: "Выплата комиссий",
        suspension: "Приостановка и прекращение",
        data: "Персональные данные",
        ip: "Интеллектуальная собственность",
        liability: "Ответственность",
        law: "Применимое право",
        misc: "Разное",
        contact: "Контакт",
      },
      readyToJoin: "Готовы стать администратором группы SOS Expat?",
      readySubtitle: "Монетизируйте своё сообщество, привлекая провайдеров и продвигая наши услуги для эмигрантов.",
      startNow: "Зарегистрироваться сейчас",
      contactUs: "Свяжитесь с нами",
      anchorTitle: "Обзор",
      editHint: "Документ редактируется из консоли администратора",
      ctaHero: "Начать",
      heroBadge: "Программа для администраторов групп — Запущена в 2026 году",
      contactForm: "Контактная форма",
    },
    hi: {
      title: "SOS Expat ग्रुप एडमिन शर्तें",
      subtitle: "SOS Expat सामुदायिक ग्रुप प्रशासकों के लिए उपयोग की शर्तें",
      lastUpdated: "संस्करण 1.0 – अंतिम अपडेट: 1 फरवरी 2026",
      loading: "लोड हो रहा है...",
      joinNetwork: "ग्रुप एडमिन बनें",
      trustedByHelpers: "हमारे प्रवासी ग्रुप एडमिन नेटवर्क से जुड़ें",
      keyFeatures: "मुख्य विशेषताएं",
      features: [
        "भर्ती प्रदाताओं के प्रत्येक कॉल पर कमीशन",
        "अन्य एडमिन और प्रदाताओं की भर्ती करें",
        "ग्रुप संचालन के लिए विशेष संसाधन",
        "बहु-स्तरीय संबद्ध कार्यक्रम",
      ],
      languageToggle: "भाषा बदलें",
      sections: {
        definitions: "परिभाषाएँ",
        scope: "उद्देश्य और स्वीकृति",
        program: "संबद्ध कार्यक्रम",
        commissions: "कमीशन और मुआवज़ा",
        antifraud: "धोखाधड़ी-रोधी नियम",
        obligations: "ग्रुप एडमिन के दायित्व",
        payment: "कमीशन भुगतान",
        suspension: "निलंबन और समाप्ति",
        data: "व्यक्तिगत डेटा",
        ip: "बौद्धिक संपदा",
        liability: "दायित्व",
        law: "लागू कानून",
        misc: "विविध",
        contact: "संपर्क",
      },
      readyToJoin: "SOS Expat ग्रुप एडमिन बनने के लिए तैयार हैं?",
      readySubtitle: "प्रदाताओं की भर्ती करके और प्रवासी सेवाओं को बढ़ावा देकर अपने समुदाय को मोनेटाइज़ करें।",
      startNow: "अभी साइन अप करें",
      contactUs: "हमसे संपर्क करें",
      anchorTitle: "अवलोकन",
      editHint: "व्यवस्थापक कंसोल से संपादन योग्य दस्तावेज़",
      ctaHero: "शुरू करें",
      heroBadge: "ग्रुप एडमिन कार्यक्रम — 2026 में लॉन्च",
      contactForm: "संपर्क फ़ॉर्म",
    },
    ch: {
      title: "SOS Expat 群组管理员条款",
      subtitle: "SOS Expat 社区群组管理员使用条款",
      lastUpdated: "版本 1.0 – 最后更新：2026年2月1日",
      loading: "加载中...",
      joinNetwork: "成为群组管理员",
      trustedByHelpers: "加入我们的海外华人群组管理员网络",
      keyFeatures: "主要功能",
      features: [
        "每次招募服务商通话佣金",
        "招募其他管理员和服务商",
        "管理群组的专属资源",
        "多级联盟计划",
      ],
      languageToggle: "切换语言",
      sections: {
        definitions: "定义",
        scope: "目的和接受",
        program: "联盟计划",
        commissions: "佣金和报酬",
        antifraud: "反欺诈规则",
        obligations: "群组管理员义务",
        payment: "佣金支付",
        suspension: "暂停和终止",
        data: "个人数据",
        ip: "知识产权",
        liability: "责任",
        law: "适用法律",
        misc: "杂项",
        contact: "联系方式",
      },
      readyToJoin: "准备成为 SOS Expat 群组管理员吗？",
      readySubtitle: "通过招募服务商和推广我们的海外华人服务来从您的社区中获利。",
      startNow: "立即注册",
      contactUs: "联系我们",
      anchorTitle: "概览",
      editHint: "可从管理控制台编辑文档",
      ctaHero: "开始",
      heroBadge: "群组管理员计划 — 2026年启动",
      contactForm: "联系表单",
    },
    ar: {
      title: "شروط مشرفي المجموعات SOS Expat",
      subtitle: "شروط الاستخدام لمشرفي المجموعات المجتمعية في SOS Expat",
      lastUpdated: "الإصدار 1.0 – آخر تحديث: 1 فبراير 2026",
      loading: "جارٍ التحميل...",
      joinNetwork: "كن مشرف مجموعة",
      trustedByHelpers: "انضم إلى شبكة مشرفي مجموعات المغتربين لدينا",
      keyFeatures: "الميزات الرئيسية",
      features: [
        "عمولات على كل مكالمة لمزودي الخدمات المجندين",
        "تجنيد مشرفين ومزودين آخرين",
        "موارد حصرية لإدارة مجموعاتك",
        "برنامج إحالة متعدد المستويات",
      ],
      languageToggle: "تغيير اللغة",
      sections: {
        definitions: "التعريفات",
        scope: "الهدف والقبول",
        program: "برنامج الشراكة",
        commissions: "العمولات والتعويضات",
        antifraud: "قواعد مكافحة الاحتيال",
        obligations: "التزامات مشرف المجموعة",
        payment: "دفع العمولات",
        suspension: "التعليق والإنهاء",
        data: "البيانات الشخصية",
        ip: "الملكية الفكرية",
        liability: "المسؤولية",
        law: "القانون الحاكم",
        misc: "متفرقات",
        contact: "اتصل",
      },
      readyToJoin: "هل أنت مستعد لتصبح مشرف مجموعة SOS Expat؟",
      readySubtitle: "حقق أرباحاً من مجتمعك بتجنيد المزودين والترويج لخدماتنا للمغتربين.",
      startNow: "سجل الآن",
      contactUs: "اتصل بنا",
      anchorTitle: "نظرة عامة",
      editHint: "مستند قابل للتحرير من وحدة التحكم الإدارية",
      ctaHero: "ابدأ",
      heroBadge: "برنامج مشرفي المجموعات — تم الإطلاق 2026",
      contactForm: "نموذج الاتصال",
    },
    pt: {
      title: "Termos para Administradores de Grupo SOS Expat",
      subtitle: "Termos de uso para administradores de grupos comunitários SOS Expat",
      lastUpdated: "Versão 1.0 – Última atualização: 1 de fevereiro de 2026",
      loading: "Carregando...",
      joinNetwork: "Torne-se Admin de Grupo",
      trustedByHelpers: "Junte-se à nossa rede de administradores de grupos de expatriados",
      keyFeatures: "Características principais",
      features: [
        "Comissões por cada chamada de provedores recrutados",
        "Recrute outros admins e provedores",
        "Recursos exclusivos para animar seus grupos",
        "Programa de afiliados multinível",
      ],
      languageToggle: "Mudar idioma",
      sections: {
        definitions: "Definições",
        scope: "Objetivo e aceitação",
        program: "Programa de afiliados",
        commissions: "Comissões e compensação",
        antifraud: "Regras antifraude",
        obligations: "Obrigações do Admin de Grupo",
        payment: "Pagamento de comissões",
        suspension: "Suspensão e rescisão",
        data: "Dados pessoais",
        ip: "Propriedade intelectual",
        liability: "Responsabilidade",
        law: "Lei aplicável",
        misc: "Diversos",
        contact: "Contato",
      },
      readyToJoin: "Pronto para se tornar administrador de grupo SOS Expat?",
      readySubtitle: "Monetize sua comunidade recrutando provedores e promovendo nossos serviços a expatriados.",
      startNow: "Inscreva-se agora",
      contactUs: "Entre em contato",
      anchorTitle: "Resumo",
      editHint: "Documento editável a partir do console de administração",
      ctaHero: "Começar",
      heroBadge: "Programa Admin de Grupo — Lançado em 2026",
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
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-emerald-600 pb-4"
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
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow-lg">
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
            className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-emerald-600 pl-4"
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
            className="bg-gray-50 border-l-4 border-emerald-600 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-emerald-600 mr-2">{number}</span>
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
            className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 my-6"
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
            className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg">
                14
              </span>
              Contact
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="https://sos-expat.com/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
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
# Conditions Générales d'Utilisation – Administrateurs de Groupe SOS Expat

**SOS Expat by WorldExpat OÜ** (la « **Plateforme** », « **SOS** », « **nous** »)

**Version 1.0 – Dernière mise à jour : 1er février 2026**

---

## 1. Définitions

**Administrateur de Groupe** (ou « **Admin Groupe** ») : toute personne physique inscrite au programme d'affiliation SOS Expat pour gérer une ou plusieurs communautés en ligne (groupes Facebook, WhatsApp, Telegram, etc.) d'expatriés, recruter des prestataires de services (avocats, experts expatriés) ou d'autres Administrateurs de Groupe, et percevoir des commissions sur les activités générées.

**Groupe Affilié** : tout groupe ou communauté en ligne administré par l'Admin Groupe, déclaré et validé dans son profil SOS Expat.

**Prestataire Recruté** : tout professionnel (avocat, expert expatrié, conseiller juridique, etc.) recruté par l'Admin Groupe et inscrit sur la Plateforme SOS Expat.

**Admin Filleul** : tout autre Administrateur de Groupe recruté par l'Admin Groupe via son code de parrainage.

**Commission de Recrutement Prestataire** : rémunération versée pour chaque appel payant réalisé par un Prestataire Recruté, pendant **12 mois** à compter de l'inscription dudit prestataire.

**Commission de Recrutement Admin** : rémunération versée pour chaque appel généré grâce aux Admins Filleuls (N1) ou leurs propres filleuls (N2), pendant **12 mois** à compter de l'inscription.

**Code de Recrutement Prestataire** : identifiant unique permettant à l'Admin Groupe de recruter des prestataires.

**Code de Recrutement Admin** : identifiant permettant de parrainer d'autres Administrateurs de Groupe.

---

## 2. Objet et acceptation

2.1. Les présentes CGU régissent la participation au programme d'affiliation Administrateurs de Groupe de SOS Expat.

2.2. En cochant la case d'acceptation lors de l'inscription, l'Admin Groupe accepte l'intégralité des présentes CGU. Cette acceptation constitue une **signature électronique valide** au sens du règlement **eIDAS (UE) n° 910/2014**.

2.3. **Traçabilité de l'acceptation.** SOS Expat conserve un journal d'audit horodaté incluant : adresse IP, identifiant de session, user-agent, version des CGU acceptée, empreinte numérique du document accepté et identifiant de l'Admin Groupe. Ces données sont conservées **10 ans** conformément aux obligations légales.

2.4. **Modifications.** SOS Expat peut modifier les CGU et/ou les barèmes de commissions avec effet prospectif. Une notification est adressée à l'Admin Groupe au moins **15 jours** avant l'entrée en vigueur. L'usage continu après notification vaut acceptation.

2.5. **Capacité.** L'Admin Groupe déclare être majeur et capable juridiquement. L'inscription est **interdite aux mineurs**.

---

## 3. Programme d'affiliation

3.1. **Inscription.** L'accès au programme nécessite : (i) une inscription valide avec déclaration des groupes/communautés administrés, (ii) l'acceptation des présentes CGU.

3.2. **Codes attribués.** Après validation, l'Admin Groupe reçoit :
- Un **Code de Recrutement Prestataire** : pour recruter des avocats/experts expatriés
- Un **Code de Recrutement Admin** : pour parrainer d'autres Administrateurs de Groupe

3.3. **Groupes déclarés.** L'Admin Groupe déclare les URL/noms de ses groupes administrés dans son profil. SOS Expat peut vérifier l'existence et la pertinence de ces groupes (thématique expatriation).

3.4. **Ressources fournies.** SOS Expat met à disposition :
- Visuels et posts prêts à partager dans les groupes
- Guide de présentation des services SOS Expat
- Kit de recrutement de prestataires
- Supports de formation pour les prestataires recrutés
- Accès à un dashboard de suivi des performances

3.5. **Validation.** SOS Expat se réserve le droit de valider ou refuser l'inscription d'un Admin Groupe dont les communautés ne correspondent pas à la cible expatriés.

---

## 4. Commissions et rémunération

4.1. **Commission de Recrutement Prestataire.** L'Admin Groupe perçoit une commission sur chaque appel payant réalisé par un Prestataire Recruté, pendant **12 mois** à compter de la date d'inscription dudit prestataire. Passé ce délai, les commissions sur ce prestataire cessent automatiquement.

4.2. **Commission de Recrutement Admin (Filleul N1).** L'Admin Groupe perçoit une commission sur chaque appel généré grâce à ses Admins Filleuls N1, pendant **12 mois** à compter de la date d'inscription du Filleul N1. **Conditions cumulatives pour percevoir cette commission :**
- L'Admin Groupe doit réaliser un minimum de **$50 de commissions directes** (article 4.1) au cours du mois civil concerné
- L'Admin Groupe doit assurer la formation et le suivi de ses Filleuls N1 : partage des guides et ressources, réponse aux questions dans un délai de 48h, accompagnement dans le recrutement de prestataires
- En l'absence de ces conditions sur un mois donné, les commissions N1 de ce mois sont suspendues (non rétroactives)

4.3. **Commission de Recrutement Admin (Filleul N2).** L'Admin Groupe perçoit une commission sur chaque appel généré par les Filleuls N2, pendant **12 mois** à compter de la date d'inscription du Filleul N2. Les **mêmes conditions cumulatives** qu'en 4.2 s'appliquent.

4.4. **Durée maximale des commissions d'affiliation.** Les commissions sur les Prestataires Recrutés et les Admins Filleuls (N1 et N2) sont versées pendant **12 mois maximum** à compter de la date d'inscription de chaque prestataire/filleul. Passé ce délai, l'Admin Groupe peut re-recruter et enregistrer de nouveaux prestataires pour bénéficier de nouvelles périodes de 12 mois.

4.5. **Barèmes de commissions (récapitulatif).**

| Type de commission | Montant | Durée |
|---|---|---|
| Appel d'un prestataire recruté | Variable | 12 mois |
| Appel via Admin Filleul N1 | Variable | 12 mois |
| Appel via Admin Filleul N2 | Variable | 12 mois |

4.6. **Seuils de paiement.** Les commissions sont validées après :
- Période de rétractation client (14 jours)
- Validation anti-fraude automatique
- Atteinte du seuil minimum de retrait (**$20**)

4.7. **Bonus de performance.** Des bonus supplémentaires peuvent être accordés pour les Admins Groupe atteignant des seuils de recrutement élevés (10, 25, 50, 100 prestataires recrutés actifs).

---

## 5. Règles anti-fraude

5.1. **Interdictions strictes.** Sont formellement interdits :
- L'auto-parrainage ou parrainage croisé fictif de prestataires ou d'admins
- La création de faux groupes ou communautés fictives
- L'inscription de faux prestataires ou prestataires inactifs sciemment
- La génération artificielle d'appels
- La création de comptes multiples
- Toute manipulation des systèmes de tracking

5.2. **Détection automatique.** SOS Expat utilise des systèmes de détection incluant :
- Analyse des patterns d'activité suspects
- Vérification de l'existence et de l'activité réelle des groupes déclarés
- Contrôle de la qualité des prestataires recrutés

5.3. **Sanctions.** En cas de fraude avérée ou suspectée :
- **Suspension immédiate** du compte
- **Annulation** de toutes les commissions concernées
- **Bannissement définitif** de la Plateforme
- **Poursuites judiciaires** le cas échéant

5.4. **Recours.** L'Admin Groupe peut contester une sanction via le formulaire de contact dans un délai de **30 jours**.

---

## 6. Obligations de l'Administrateur de Groupe

6.1. **Gestion des groupes.** L'Admin Groupe s'engage à :
- Administrer activement ses groupes/communautés déclarés
- Partager régulièrement des contenus relatifs aux services SOS Expat
- Modérer son groupe conformément aux règles de la plateforme hébergeant le groupe
- Signaler tout changement de statut de ses groupes (fermeture, changement de thématique)

6.2. **Recrutement de prestataires.** L'Admin Groupe s'engage à :
- Ne recruter que des professionnels légitimes (avocats, conseillers, experts réels)
- Informer honnêtement les prestataires des conditions du programme
- Partager les ressources de formation fournies par SOS Expat
- Accompagner les prestataires dans leur intégration sur la Plateforme

6.3. **Suivi des filleuls admins.** L'Admin Groupe qui recrute d'autres Admins s'engage à :
- Partager les guides et ressources fournis par SOS Expat
- Répondre aux questions de ses Filleuls dans un délai de **48 heures**
- Assurer un suivi minimum pour garantir leur succès dans le programme

6.4. **Qualité du contenu.** L'Admin Groupe s'engage à :
- Promouvoir SOS Expat de manière honnête et éthique
- Ne pas faire de promesses trompeuses sur les services ou commissions
- Identifier les contenus partenariaux le cas échéant
- Respecter les chartes graphiques et guidelines de marque SOS Expat

6.5. **Conformité légale.** L'Admin Groupe respecte toutes les lois applicables :
- Règles des plateformes où ses groupes sont hébergés (Facebook, WhatsApp, etc.)
- Protection des données des membres de ses groupes (RGPD)
- Déclaration fiscale de ses revenus d'affiliation
- Réglementations locales sur le démarchage commercial

6.6. **Indépendance.** L'Admin Groupe agit en **indépendant** ; aucun lien d'emploi, mandat ou agence n'est créé avec SOS Expat.

---

## 7. Paiement des commissions

7.1. **KYC obligatoire.** L'Admin Groupe doit compléter la vérification d'identité (KYC) **avant** tout retrait.

7.2. **Méthodes de paiement.** Les retraits sont disponibles via :
- Virement bancaire (SEPA/International)
- PayPal
- Wise

7.3. **Délais.** Les paiements sont traités sous **7 jours ouvrés** après validation.

7.4. **Seuil minimum.** Le retrait est possible à partir de **$20** de solde disponible.

7.5. **Fonds non réclamés.** En cas de non-complétion du KYC sous **180 jours**, les fonds sont considérés abandonnés conformément à l'article 8.7 des CGU générales.

7.6. **Taxes.** L'Admin Groupe est seul responsable de la déclaration et du paiement de ses impôts et charges liés à ses revenus d'affiliation.

---

## 8. Suspension et résiliation

8.1. **Suspension temporaire.** SOS Expat peut suspendre un compte en cas de :
- Suspicion de fraude (faux prestataires, faux groupes)
- Violation des CGU
- Comportement préjudiciable envers les prestataires recrutés
- Inactivité prolongée (365+ jours sans aucune activité)

8.2. **Résiliation par l'Admin Groupe.** L'Admin Groupe peut clôturer son compte à tout moment. Les commissions validées restent payables.

8.3. **Résiliation par SOS Expat.** En cas de violation grave, SOS Expat peut résilier le compte avec effet immédiat. Les commissions non validées sont annulées.

8.4. **Effets de la résiliation.** À la résiliation :
- Les Codes de Recrutement sont désactivés
- Les Filleuls et prestataires recrutés sont réattribués à SOS Expat
- L'accès au dashboard est supprimé

---

## 9. Données personnelles

9.1. **Responsable de traitement.** SOS Expat (WorldExpat OÜ) pour les données du programme Administrateurs de Groupe.

9.2. **Données collectées.** Identité, coordonnées, groupes déclarés, performances, données de paiement, logs de connexion.

9.3. **Finalités.** Gestion du programme, paiement des commissions, prévention de la fraude, amélioration des services.

9.4. **Durée de conservation.** Données actives pendant la relation ; archives 10 ans après résiliation (obligations légales).

9.5. **Droits.** Accès, rectification, effacement, portabilité, opposition via contact@sos-expat.com.

9.6. **Transferts.** Avec garanties appropriées (clauses contractuelles types) si hors UE.

---

## 10. Propriété intellectuelle

10.1. La marque SOS Expat, logos et contenus sont protégés. L'Admin Groupe reçoit une **licence limitée, non exclusive et révocable** d'utilisation des éléments marketing fournis (visuels, textes, kits de recrutement).

10.2. **Restrictions.** L'Admin Groupe ne peut pas :
- Modifier les logos ou marques SOS Expat
- Créer des groupes ou sites web imitant SOS Expat
- Enregistrer des noms de domaine ou handles contenant « SOS Expat »

10.3. **Contenu généré.** Les contenus créés par l'Admin Groupe pour promouvoir SOS Expat restent sa propriété, avec licence d'utilisation accordée à SOS Expat.

---

## 11. Responsabilité

11.1. **Limitation.** La responsabilité de SOS Expat est limitée aux **commissions dues** au titre des 12 derniers mois.

11.2. **Exclusions.** SOS Expat n'est pas responsable des :
- Dommages indirects (perte de revenus, d'opportunités)
- Actions des prestataires recrutés ou des membres des groupes
- Fermeture ou restriction de groupes par les plateformes tierces

11.3. **Indemnisation.** L'Admin Groupe indemnise SOS Expat contre toute réclamation liée à ses activités de recrutement ou de promotion.

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

Pour toute question concernant le programme Administrateurs de Groupe, contactez-nous via le formulaire de contact ou à l'adresse : groupadmins@sos-expat.com
`;

  const defaultEn = `
# Terms of Use – SOS Expat Group Administrator Program

**SOS Expat by WorldExpat OÜ** (the "**Platform**", "**SOS**", "**we**")

**Version 1.0 – Last updated: February 1, 2026**

---

## 1. Definitions

**Group Administrator** (or "**Group Admin**"): any individual enrolled in the SOS Expat affiliate program to manage one or more online communities (Facebook, WhatsApp, Telegram groups, etc.) for expats, recruit service providers (lawyers, expat experts) or other Group Administrators, and earn commissions on generated activities.

**Affiliated Group**: any online group or community administered by the Group Admin, declared and validated in their SOS Expat profile.

**Recruited Provider**: any professional (lawyer, expat expert, legal advisor, etc.) recruited by the Group Admin and registered on the SOS Expat Platform.

**Admin Referral**: any other Group Administrator recruited by the Group Admin via their referral code.

**Provider Recruitment Commission**: compensation paid for each paid call made by a Recruited Provider, for **12 months** from said provider's registration date.

**Admin Recruitment Commission**: compensation paid for each call generated by Admin Referrals (N1) or their own referrals (N2), for **12 months** from registration.

**Provider Recruitment Code**: unique identifier enabling the Group Admin to recruit providers.

**Admin Recruitment Code**: identifier enabling the sponsorship of other Group Administrators.

---

## 2. Purpose and Acceptance

2.1. These Terms govern participation in the SOS Expat Group Administrator affiliate program.

2.2. By checking the acceptance box during registration, the Group Admin accepts these Terms in full. This acceptance constitutes a **valid electronic signature** under **eIDAS Regulation (EU) No 910/2014**.

2.3. **Acceptance Traceability.** SOS Expat maintains a timestamped audit log including: IP address, session ID, user-agent, Terms version accepted, document hash, and Group Admin ID. This data is retained for **10 years** in compliance with legal obligations.

2.4. **Modifications.** SOS Expat may modify the Terms and/or commission rates with prospective effect. Notification is sent to the Group Admin at least **15 days** before taking effect. Continued use after notification constitutes acceptance.

2.5. **Capacity.** The Group Admin declares to be of legal age and legally capable. Registration is **prohibited for minors**.

---

## 3. Affiliate Program

3.1. **Registration.** Program access requires: (i) valid registration with declaration of administered groups/communities, (ii) acceptance of these Terms.

3.2. **Assigned Codes.** Upon validation, the Group Admin receives:
- A **Provider Recruitment Code**: to recruit lawyers/expat experts
- An **Admin Recruitment Code**: to sponsor other Group Administrators

3.3. **Declared Groups.** The Group Admin declares the URLs/names of their administered groups in their profile. SOS Expat may verify the existence and relevance of these groups (expat theme).

3.4. **Provided Resources.** SOS Expat provides:
- Visuals and posts ready to share in groups
- SOS Expat service presentation guide
- Provider recruitment kit
- Training materials for recruited providers
- Access to a performance tracking dashboard

3.5. **Validation.** SOS Expat reserves the right to validate or reject a Group Admin registration whose communities do not correspond to the expat target audience.

---

## 4. Commissions and Compensation

4.1. **Provider Recruitment Commission.** The Group Admin earns a commission on each paid call made by a Recruited Provider, for **12 months** from said provider's registration date. After this period, commissions on that provider cease automatically.

4.2. **Admin Recruitment Commission (N1 Referral).** The Group Admin earns a commission on each call generated by their N1 Admin Referrals, for **12 months** from the N1 Referral's registration date. **Cumulative conditions to earn this commission:**
- The Group Admin must achieve a minimum of **$50 in direct commissions** (Article 4.1) during the calendar month concerned
- The Group Admin must ensure training and follow-up of their N1 Referrals: sharing guides and resources, responding to questions within 48 hours, accompanying them in provider recruitment
- In the absence of these conditions in a given month, N1 commissions for that month are suspended (non-retroactive)

4.3. **Admin Recruitment Commission (N2 Referral).** The Group Admin earns a commission on each call generated by N2 Referrals, for **12 months** from the N2 Referral's registration date. The **same cumulative conditions** as in 4.2 apply.

4.4. **Maximum Affiliate Commission Duration.** Commissions on Recruited Providers and Admin Referrals (N1 and N2) are paid for a **maximum of 12 months** from each provider/referral's registration date. After this period, the Group Admin can re-recruit and register new providers to benefit from new 12-month periods.

4.5. **Commission Schedule (summary).**

| Commission Type | Amount | Duration |
|---|---|---|
| Recruited provider call | Variable | 12 months |
| Call via N1 Admin Referral | Variable | 12 months |
| Call via N2 Admin Referral | Variable | 12 months |

4.6. **Payment Thresholds.** Commissions are validated after:
- Client withdrawal period (14 days)
- Automatic anti-fraud validation
- Reaching minimum withdrawal threshold (**$20**)

4.7. **Performance Bonuses.** Additional bonuses may be granted to Group Admins reaching high recruitment thresholds (10, 25, 50, 100 active recruited providers).

---

## 5. Anti-fraud Rules

5.1. **Strict Prohibitions.** The following are strictly prohibited:
- Self-referral or fictitious cross-referral of providers or admins
- Creating fake groups or fictitious communities
- Knowingly registering fake or inactive providers
- Artificially generating calls
- Creating multiple accounts
- Any manipulation of tracking systems

5.2. **Automatic Detection.** SOS Expat uses detection systems including:
- Suspicious activity pattern analysis
- Verification of declared groups' existence and actual activity
- Quality control of recruited providers

5.3. **Sanctions.** In case of proven or suspected fraud:
- **Immediate suspension** of account
- **Cancellation** of all affected commissions
- **Permanent ban** from the Platform
- **Legal action** if applicable

5.4. **Appeals.** The Group Admin may contest a sanction via the contact form within **30 days**.

---

## 6. Group Administrator Obligations

6.1. **Group Management.** The Group Admin agrees to:
- Actively administer their declared groups/communities
- Regularly share content related to SOS Expat services
- Moderate their group in accordance with the hosting platform's rules
- Report any changes in group status (closure, change of theme)

6.2. **Provider Recruitment.** The Group Admin agrees to:
- Only recruit legitimate professionals (real lawyers, advisors, experts)
- Honestly inform providers about program conditions
- Share training resources provided by SOS Expat
- Support providers in their integration on the Platform

6.3. **Admin Referral Follow-up.** Group Admins who recruit other Admins agree to:
- Share guides and resources provided by SOS Expat
- Respond to Referral questions within **48 hours**
- Ensure minimum follow-up to guarantee their success in the program

6.4. **Content Quality.** The Group Admin agrees to:
- Promote SOS Expat honestly and ethically
- Not make misleading promises about services or commissions
- Identify partnership content as appropriate
- Respect SOS Expat brand guidelines and graphic charters

6.5. **Legal Compliance.** The Group Admin complies with all applicable laws:
- Rules of platforms where groups are hosted (Facebook, WhatsApp, etc.)
- Data protection of group members (GDPR)
- Tax declaration of affiliate income
- Local commercial solicitation regulations

6.6. **Independence.** The Group Admin acts as an **independent contractor**; no employment, agency, or mandate relationship is created with SOS Expat.

---

## 7. Commission Payments

7.1. **Mandatory KYC.** The Group Admin must complete identity verification (KYC) **before** any withdrawal.

7.2. **Payment Methods.** Withdrawals are available via:
- Bank transfer (SEPA/International)
- PayPal
- Wise

7.3. **Timing.** Payments are processed within **7 business days** after validation.

7.4. **Minimum Threshold.** Withdrawal is possible from **$20** available balance.

7.5. **Unclaimed Funds.** If KYC is not completed within **180 days**, funds are considered abandoned per Article 8.7 of the general Terms.

7.6. **Taxes.** The Group Admin is solely responsible for declaring and paying their taxes and charges related to affiliate income.

---

## 8. Suspension and Termination

8.1. **Temporary Suspension.** SOS Expat may suspend an account in case of:
- Fraud suspicion (fake providers, fake groups)
- Terms violation
- Harmful behavior toward recruited providers
- Extended inactivity (365+ days without any activity)

8.2. **Termination by Group Admin.** The Group Admin may close their account at any time. Validated commissions remain payable.

8.3. **Termination by SOS Expat.** In case of serious violation, SOS Expat may terminate the account with immediate effect. Unvalidated commissions are cancelled.

8.4. **Effects of Termination.** Upon termination:
- Recruitment Codes are deactivated
- Recruited referrals and providers are reassigned to SOS Expat
- Dashboard access is removed

---

## 9. Personal Data

9.1. **Data Controller.** SOS Expat (WorldExpat OÜ) for Group Administrator program data.

9.2. **Data Collected.** Identity, contact details, declared groups, performance, payment data, connection logs.

9.3. **Purposes.** Program management, commission payments, fraud prevention, service improvement.

9.4. **Retention.** Active data during relationship; archives 10 years after termination (legal obligations).

9.5. **Rights.** Access, rectification, erasure, portability, objection via contact@sos-expat.com.

9.6. **Transfers.** With appropriate safeguards (standard contractual clauses) if outside EU.

---

## 10. Intellectual Property

10.1. The SOS Expat brand, logos, and content are protected. The Group Admin receives a **limited, non-exclusive, revocable license** to use provided marketing materials (visuals, texts, recruitment kits).

10.2. **Restrictions.** The Group Admin may not:
- Modify SOS Expat logos or trademarks
- Create groups or websites imitating SOS Expat
- Register domain names or handles containing "SOS Expat"

10.3. **Generated Content.** Content created by the Group Admin to promote SOS Expat remains their property, with a usage license granted to SOS Expat.

---

## 11. Liability

11.1. **Limitation.** SOS Expat's liability is limited to **commissions due** for the last 12 months.

11.2. **Exclusions.** SOS Expat is not liable for:
- Indirect damages (loss of revenue, opportunities)
- Actions of recruited providers or group members
- Group closure or restriction by third-party platforms

11.3. **Indemnification.** The Group Admin indemnifies SOS Expat against any claims related to their recruitment or promotion activities.

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

For any questions about the Group Administrator program, contact us via the contact form or at: groupadmins@sos-expat.com
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
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-emerald-900 to-teal-900 text-white py-16 sm:py-24">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-emerald-200 mb-6">
              <Sparkles className="w-4 h-4" />
              {t.heroBadge}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6">
              {t.title}
            </h1>
            <p className="text-lg sm:text-xl text-emerald-100 max-w-3xl mx-auto mb-4">
              {t.subtitle}
            </p>
            <p className="text-sm text-emerald-200/80">{t.lastUpdated}</p>
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
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100"
              >
                {index === 0 && <DollarSign className="w-6 h-6 text-emerald-600 flex-shrink-0" />}
                {index === 1 && <UserCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />}
                {index === 2 && <Gift className="w-6 h-6 text-emerald-600 flex-shrink-0" />}
                {index === 3 && <TrendingUp className="w-6 h-6 text-emerald-600 flex-shrink-0" />}
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
                      ? "bg-emerald-600 text-white shadow-md"
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
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent" />
              <span className="ml-4 text-gray-600">{t.loading}</span>
            </div>
          ) : (
            <div className="prose prose-lg max-w-none">{parsedContent}</div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-gray-900 via-emerald-900 to-teal-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Users className="w-16 h-16 mx-auto mb-6 text-emerald-300" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.readyToJoin}</h2>
          <p className="text-lg text-emerald-100 mb-8">{t.readySubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={getLocalePath("/group-admin/inscription")}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-all hover:scale-105 shadow-lg"
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
          <p className="mt-8 text-sm text-emerald-200">{t.trustedByHelpers}</p>
        </div>
      </section>
    </Layout>
  );
};

export default TermsGroupAdmins;
