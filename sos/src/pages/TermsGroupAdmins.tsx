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

4.1. **Commissions directes par appel client.** L'Admin Groupe perçoit **$10** pour chaque appel payant généré via son lien affilié, sans limite de volume ni de durée.

4.2. **Commission de Recrutement Prestataire.** L'Admin Groupe perçoit **$5** pour chaque appel payant réalisé par un Prestataire Recruté via son code de recrutement, pendant **12 mois** à compter de la date d'inscription dudit prestataire. Ces commissions cessent automatiquement à l'expiration du délai de 12 mois. L'Admin Groupe peut **re-recruter** de nouveaux prestataires pour démarrer de nouvelles périodes de 12 mois.

4.3. **Prime de recrutement d'un Admin Groupe.** Pour chaque Admin Groupe recruté via le code de parrainage, l'Admin-parrain perçoit une **prime unique de $50** lorsque l'Admin Groupe recruté cumule **$200 de commissions totales**. Cette prime est versée **une seule fois** par Admin recruté, sans commission récurrente sur les appels futurs de cet Admin.

4.4. **Modèle d'attribution (tracking).** Le suivi des recommandations utilise un **cookie Last-Click valable 30 jours** : tout clic sur le lien affilié de l'Admin Groupe crée un cookie de 30 jours dans le navigateur du visiteur. Si ce visiteur effectue un appel payant dans ce délai, la commission est attribuée à l'Admin Groupe.

4.5. **Période de validation (Hold Period).** Les commissions sont soumises à une période de rétention :
- Statut **« en attente »** : pendant la **période de rétractation client (14 jours)**
- Statut **« validée »** : après vérification anti-fraude automatique
- Statut **« payable »** : au prochain cycle mensuel de paiement

4.6. **Politique de remboursement et claw-back.** En cas de remboursement client ou chargeback bancaire, la commission est annulée ou récupérée sur le prochain paiement. SOS Expat peut récupérer des commissions versées en cas de fraude détectée a posteriori dans un délai de **12 mois**.

4.7. **Absence de garantie de revenus.** SOS Expat ne garantit aucun niveau minimum de trafic, d'appels ou de revenus.

4.8. **Barèmes de commissions (récapitulatif).**

| Type de commission | Montant | Durée | Conditions |
|---|---|---|---|
| Appel client direct (via lien affilié) | $10/appel | Illimitée | Aucune |
| Appel via prestataire recruté | $5/appel | 12 mois max | Aucune |
| Prime recrutement d'un admin | $50 (unique) | Une seule fois | Admin recruté atteint $200 cumulé |
| Bonus recrutement (10/25/50/100 prestataires) | Variable | Ponctuel | Seuils de recrutement atteints |

4.9. **Seuil de retrait.** Retrait disponible à partir de **$20** de solde validé.

---

## 5. Règles anti-fraude

5.1. **Fraude — Interdictions absolues.** Sont formellement interdits :
- **Cookie stuffing** : injection de cookies affiliés sans clic réel
- **Auto-parrainage** ou parrainage croisé fictif de prestataires ou d'admins
- **Création de faux groupes** ou communautés fictives (non existantes, inactives)
- **Inscription de faux prestataires** ou prestataires inactifs sciemment recrutés pour générer des commissions
- **Génération artificielle d'appels** (faux clients, self-calls, services tiers)
- **Création de comptes multiples** sous une même identité
- **Toute manipulation** des systèmes de tracking ou d'attribution

5.2. **Contenus interdits.** L'Admin Groupe ne peut pas promouvoir SOS Expat via des contenus liés à : contenu haineux, pornographique, jeux illégaux, drogues, armes, désinformation, ou ciblant des mineurs.

5.3. **Enchères sur la marque.** Interdit d'utiliser « SOS Expat » ou variantes comme mots-clés publicitaires payants sans autorisation écrite préalable.

5.4. **Détection automatique.** Analyse des patterns d'activité suspects, vérification de l'existence des groupes déclarés, contrôle qualité des prestataires, analyse des taux de conversion anormaux.

5.5. **Sanctions graduées.** Avertissement → Suspension + gel des commissions → Annulation (claw-back) → Bannissement définitif → Poursuites judiciaires.

5.6. **Recours multi-niveaux.**
- **Niveau 1** : formulaire de contact dans **30 jours** (réponse 15 jours ouvrés)
- **Niveau 2** : escalade équipe Compliance (+15 jours)
- **Niveau 3** : arbitrage CCI (article 12)

---

## 6. Obligations de l'Administrateur de Groupe

6.1. **Gestion des groupes.** L'Admin Groupe s'engage à :
- Administrer activement ses groupes/communautés déclarés
- Partager régulièrement des contenus relatifs aux services SOS Expat
- Modérer son groupe conformément aux règles de la plateforme hébergeant le groupe
- Signaler tout changement de statut de ses groupes (fermeture, changement de thématique)
- Mettre à jour son profil en cas de fermeture ou de changement d'un groupe déclaré

6.2. **Recrutement de prestataires.** L'Admin Groupe s'engage à :
- Ne recruter que des professionnels légitimes et vérifiables (avocats réels, conseillers, experts)
- Informer honnêtement les prestataires des conditions du programme sans promesses trompeuses
- Partager les ressources de formation fournies par SOS Expat
- Accompagner les prestataires dans leur intégration sur la Plateforme

6.3. **Suivi des Admins recrutés.** L'Admin Groupe qui recrute d'autres Admins s'engage à :
- Partager les guides et ressources fournis par SOS Expat
- Répondre aux questions de ses filleuls dans un délai de **48 heures**
- Assurer un suivi minimum pour garantir leur succès dans le programme

6.4. **Transparence publicitaire.** Tout contenu promotionnel doit respecter les obligations locales de divulgation : **#Publicité** / **#CollaborationCommerciale** (France), **#ad** / **Paid Partnership** (USA, ARPP, FTC), **#Ad** / **Advertising** (Australie, ACCC). **L'Admin Groupe est responsable de la conformité dans chaque pays ciblé.**

6.5. **Conformité aux plateformes tierces.** L'Admin Groupe s'engage à respecter les CGU de chaque plateforme hébergeant ses groupes (Facebook, WhatsApp, Telegram, etc.). SOS Expat n'est pas responsable des suspensions de groupes par des plateformes tierces.

6.6. **Sous-affiliation interdite.** L'Admin Groupe ne peut pas déléguer ses droits affiliés à des tiers sans accord écrit préalable de SOS Expat.

6.7. **Conformité légale générale.** L'Admin Groupe respecte :
- Les règles des plateformes hébergeant ses groupes
- La protection des données des membres de ses groupes (RGPD, et lois locales applicables)
- La déclaration fiscale de ses revenus d'affiliation
- Les réglementations locales sur le démarchage commercial

6.8. **Indépendance.** L'Admin Groupe agit en **prestataire indépendant** ; aucun lien d'emploi, contrat de travail, mandat ou relation d'agence n'est créé avec SOS Expat. Il est seul responsable de ses cotisations sociales et obligations fiscales.

---

## 7. Paiement des commissions

7.1. **KYC obligatoire.** L'Admin Groupe doit compléter la vérification d'identité (KYC) **avant** tout retrait. Le KYC doit être initié dans les **90 jours** suivant la première commission validée.

7.2. **Méthodes de paiement.** Virement bancaire (SEPA/International), PayPal, Wise.

7.3. **Délais.** Paiements traités sous **7 jours ouvrés** après validation (délais bancaires supplémentaires possibles).

7.4. **Seuil minimum.** Retrait possible à partir de **$20** de solde disponible.

7.5. **Devise et conversion.** Tous les paiements sont libellés en **USD**. Conversion au taux Wise du jour si demandée ; **frais de conversion à la charge de l'Admin Groupe**.

7.6. **Fonds non réclamés.** Si KYC non complété sous **180 jours**, fonds considérés abandonnés.

7.7. **Obligations fiscales — Général.** L'Admin Groupe est seul responsable de la déclaration et du paiement de ses impôts et charges dans son pays de résidence.

7.8. **Obligations fiscales — USA (non-résidents).** Formulaire **W-8BEN** (personnes physiques) ou **W-8BEN-E** (entités) requis avant tout paiement. Sans ce formulaire : retenue à la source de **30%** applicable. Validité : 3 ans.

7.9. **TVA / GST.** Commissions exprimées hors taxes. L'Admin Groupe assujetti à la TVA gère lui-même ses obligations fiscales.

7.10. **Justificatifs.** Relevé mensuel détaillé accessible depuis le dashboard.

---

## 8. Suspension et résiliation

8.1. **Suspension temporaire.** SOS Expat peut suspendre un compte en cas de : suspicion de fraude (faux prestataires, faux groupes), violation des CGU, comportement préjudiciable envers les prestataires recrutés, inactivité prolongée (365+ jours).

8.2. **Résiliation pour cause (for cause).** En cas de violation grave, fraude avérée, recrutement de faux prestataires, violation légale ou de la marque : résiliation **avec effet immédiat** sans préavis. Commissions non validées annulées ; commissions obtenues frauduleusement font l'objet d'un claw-back.

8.3. **Résiliation sans cause (without cause).** Hors toute violation, SOS Expat peut résilier avec un préavis de **30 jours** par email. Les commissions validées avant la date d'effet restent dues.

8.4. **Résiliation par l'Admin Groupe.** À tout moment, avec préavis recommandé de **14 jours**. Les commissions validées restent payables.

8.5. **Effets de la résiliation.** Codes de recrutement désactivés ; filleuls et prestataires réattribués à SOS Expat ; accès dashboard supprimé ; usage de la marque SOS Expat doit cesser immédiatement.

8.6. **Clauses survivant à la résiliation.** Confidentialité (art. 13.5), propriété intellectuelle (art. 10), responsabilité (art. 11), droit applicable (art. 12), protection des données (art. 9).

---

## 9. Données personnelles

9.1. **Responsable de traitement.** SOS Expat (WorldExpat OÜ, Tallinn, Estonie).

9.2. **Données collectées.** Identité, coordonnées, groupes déclarés et leurs statistiques, performances affiliées, données de paiement, informations fiscales, logs de connexion, adresse IP.

9.3. **Finalités et base légale (RGPD Art. 6).** Exécution du contrat, obligations légales, intérêt légitime (prévention fraude, amélioration services).

9.4. **Durée de conservation.** Données actives pendant la relation ; **10 ans** pour données comptables/fiscales. Droit à l'effacement disponible pour les autres données.

9.5. **Droits RGPD.** Accès, rectification, effacement, portabilité, opposition via contact@sos-expat.com. Droit de saisir l'autorité de contrôle compétente (CNIL, etc.).

9.6. **Transferts hors UE.** Clauses contractuelles types (SCT) UE applicables.

9.7. **Conformité CCPA (Californie).** Droits CCPA disponibles pour résidents californiens. Contact : contact@sos-expat.com.

9.8. **Conformité PIPEDA / Loi 25 (Canada).** Résidents canadiens protégés par PIPEDA ; Québécois par la Loi 25.

9.9. **Conformité LGPD (Brésil).** Droits LGPD pour résidents brésiliens.

9.10. **Obligations de l'Admin Groupe.** L'Admin Groupe est responsable du traitement des données des membres de ses groupes et doit respecter les lois applicables (RGPD, etc.).

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

11.1. **Limitation de responsabilité.** La responsabilité totale de SOS Expat est limitée aux **commissions versées au cours des 12 derniers mois** précédant la réclamation.

11.2. **Exclusion des dommages indirects.** SOS Expat exclut toute responsabilité pour dommages indirects, spéciaux, consécutifs ou punitifs.

11.3. **Absence de garanties.** SOS Expat ne garantit pas : disponibilité continue de la Plateforme, niveau minimum de revenus, pérennité du programme, maintien des groupes sur les plateformes tierces.

11.4. **Force majeure.** SOS Expat non responsable des événements hors de son contrôle.

11.5. **Fermeture de groupes par plateformes tierces.** SOS Expat n'est pas responsable de la fermeture ou restriction de groupes décidée par Facebook, WhatsApp, Telegram ou toute autre plateforme tierce.

11.6. **Restrictions géographiques.** Programme indisponible dans les pays sous embargo international (ONU, UE, OFAC USA).

11.7. **Indemnisation par l'Admin Groupe.** L'Admin Groupe indemnise SOS Expat contre toute réclamation découlant de : violation des CGU, activités de recrutement, contenu promotionnel, violation de droits de tiers, ou violation de toute loi applicable.

---

## 12. Droit applicable

12.1. **Droit applicable.** Droit estonien, sans préjudice des dispositions impératives du pays de résidence de l'Admin Groupe.

12.2. **Processus de résolution des litiges (multi-niveaux).**
- **Étape 1** : contact amiable à contact@sos-expat.com (réponse sous **15 jours ouvrés**)
- **Étape 2** : revue Compliance (+15 jours si insatisfaction)
- **Étape 3** : **arbitrage CCI** (Chambre de Commerce Internationale), siège Tallinn, en français, sentence définitive et exécutoire

12.3. **Droits des autorités.** La clause d'arbitrage ne prive pas l'Admin Groupe de ses droits auprès des autorités de protection des données.

12.4. **Renonciation aux actions collectives.** Réclamations individuelles uniquement.

12.5. **Langue.** Le français prévaut en cas de divergence entre traductions.

---

## 13. Dispositions diverses

13.1. **Intégralité de l'accord.** Les présentes CGU constituent l'accord complet entre les parties et remplacent tout accord antérieur.

13.2. **Nullité partielle.** Clause nulle reformée au minimum nécessaire ; autres clauses inchangées.

13.3. **Non-renonciation.** Absence d'exercice d'un droit dans un cas particulier ≠ renonciation définitive.

13.4. **Cession.** Droits non cessibles sans accord écrit préalable de SOS Expat.

13.5. **Confidentialité.** L'Admin Groupe ne divulgue pas les informations confidentielles du programme. Cette obligation survit **2 ans** après résiliation.

13.6. **Modifications des CGU.** Notification par email **30 jours** avant toute modification significative. Poursuite du programme = acceptation. Résiliation sans pénalité disponible avant la date d'effet.

13.7. **Langue.** Le français prévaut en cas de divergence entre les traductions disponibles.

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

4.1. **Direct Client Call Commissions.** The Group Admin earns **$10** for each paid call generated via their affiliate link, with no volume or time limits.

4.2. **Provider Recruitment Commission.** The Group Admin earns **$5** for each paid call made by a Recruited Provider via their recruitment code, for **12 months** from the provider's registration date. Commissions cease automatically after 12 months. The Group Admin may **re-recruit** new providers to start new 12-month periods.

4.3. **Admin Recruitment Bonus.** For each Group Admin recruited via the referral code, the referring Admin earns a **one-time bonus of $50** when the recruited Admin accumulates **$200 in total commissions**. This bonus is paid **once per recruited Admin**, with no recurring commission on that Admin's future calls.

4.4. **Attribution Model (Tracking).** A **Last-Click cookie valid for 30 days** tracks recommendations. Any click on the affiliate link creates a 30-day cookie; a paid call within this period credits the commission.

4.5. **Validation Period (Hold Period).** Commissions: "pending" (14-day client withdrawal period) → "validated" (after anti-fraud check) → "payable" (next monthly cycle).

4.6. **Refund and Clawback Policy.** Client refund or bank chargeback: commission cancelled or deducted from next payment. Fraudulently obtained commissions recoverable within **12 months**.

4.7. **No Earnings Guarantee.** No minimum traffic, calls, or income guaranteed.

4.8. **Commission Schedule (summary).**

| Commission Type | Amount | Duration | Conditions |
|---|---|---|---|
| Direct client call (via affiliate link) | $10/call | Unlimited | None |
| Recruited provider call | $5/call | 12 months max | None |
| Admin recruitment bonus | $50 (once) | One-time | Recruited reaches $200 cumulative |
| Recruitment bonus (10/25/50/100 providers) | Variable | One-time | Recruitment thresholds |

4.9. **Withdrawal Threshold.** Withdrawal from **$20** validated balance.

---

## 5. Anti-fraud Rules

5.1. **Strict Prohibitions.** The following are absolutely prohibited:
- **Cookie stuffing**: injecting affiliate cookies without a real click
- **Self-referral** or fictitious cross-referral of providers or admins
- **Creating fake groups** or fictitious/inactive communities
- **Registering fake or inactive providers** knowingly to generate commissions
- **Artificially generating calls** (fake clients, self-calls, third-party services)
- **Creating multiple accounts** under the same identity
- **Any manipulation** of tracking or attribution systems

5.2. **Prohibited Content.** The Group Admin may not promote SOS Expat via content related to: hate speech, pornography, illegal gambling, drugs, weapons, disinformation, or content targeting minors.

5.3. **Trademark Bidding.** Using "SOS Expat" or variants as paid advertising keywords is prohibited without prior written authorization.

5.4. **Automatic Detection.** SOS Expat uses automated systems including: suspicious activity pattern analysis, verification of declared groups' actual existence and activity, provider quality controls, and abnormal conversion rate analysis.

5.5. **Graduated Sanctions.** Warning → Suspension + commission freeze → Cancellation (clawback) → Permanent ban → Legal proceedings.

5.6. **Multi-level Appeals.**
- **Level 1**: contact form within **30 days** (response within 15 business days)
- **Level 2**: escalation to Compliance team (+15 days)
- **Level 3**: ICC arbitration (Article 12)

---

## 6. Group Administrator Obligations

6.1. **Group Management.** The Group Admin agrees to:
- Actively administer their declared groups/communities
- Regularly share content related to SOS Expat services
- Moderate their group in accordance with the hosting platform's rules
- Report any changes in group status (closure, change of theme)
- Update their profile upon closure or change of a declared group

6.2. **Provider Recruitment.** The Group Admin agrees to:
- Only recruit legitimate, verifiable professionals (real lawyers, advisors, experts)
- Honestly inform providers about program conditions without misleading promises
- Share training resources provided by SOS Expat
- Support providers in their integration on the Platform

6.3. **Admin Referral Follow-up.** Group Admins who recruit other Admins agree to:
- Share guides and resources provided by SOS Expat
- Respond to referral questions within **48 hours**
- Provide minimum follow-up to ensure their success in the program

6.4. **Advertising Transparency.** All promotional content must comply with local disclosure requirements: **#ad** / **Paid Partnership** (USA — FTC 16 CFR Part 255, ARPP), **#Publicité** / **#CollaborationCommerciale** (France — Law No. 2023-451 of June 9, 2023), **#Ad** / **Advertising** (Australia — ACCC). **The Group Admin is responsible for compliance in each country targeted.**

6.5. **Third-party Platform Compliance.** The Group Admin agrees to comply with the terms of service of each platform hosting their groups (Facebook, WhatsApp, Telegram, etc.). SOS Expat is not responsible for group suspensions by third-party platforms.

6.6. **Sub-affiliation Prohibited.** The Group Admin may not delegate their affiliate rights to third parties without prior written consent from SOS Expat.

6.7. **General Legal Compliance.** The Group Admin complies with:
- Rules of platforms hosting their groups
- Protection of group members' personal data (GDPR and applicable local laws)
- Tax declaration of affiliate income
- Local commercial solicitation regulations

6.8. **Independence.** The Group Admin acts as an **independent contractor**; no employment, work contract, mandate, or agency relationship is created with SOS Expat. They are solely responsible for their social contributions and tax obligations.

---

## 7. Commission Payments

7.1. **Mandatory KYC.** The Group Admin must complete identity verification (KYC) **before** any withdrawal. KYC must be initiated within **90 days** of the first validated commission.

7.2. **Payment Methods.** Bank transfer (SEPA/International), PayPal, Wise.

7.3. **Timing.** Payments processed within **7 business days** after validation (additional bank delays possible).

7.4. **Minimum Threshold.** Withdrawal from **$20** available balance.

7.5. **Currency and Conversion.** All payments are denominated in **USD**. Conversion at the daily Wise rate if requested; **conversion fees are at the Group Admin's expense**.

7.6. **Unclaimed Funds.** If KYC is not completed within **180 days**, funds are considered abandoned.

7.7. **Tax Obligations — General.** The Group Admin is solely responsible for declaring and paying taxes and charges in their country of residence.

7.8. **Tax Obligations — USA (non-residents).** Form **W-8BEN** (individuals) or **W-8BEN-E** (entities) required before any payment. Without this form: **30% withholding** applies. Validity: 3 years.

7.9. **VAT / GST.** Commissions expressed exclusive of tax. VAT-registered Group Admins manage their own tax obligations.

7.10. **Statements.** Detailed monthly statement accessible from the dashboard.

---

## 8. Suspension and Termination

8.1. **Temporary Suspension.** SOS Expat may suspend an account in case of: fraud suspicion (fake providers, fake groups), Terms violation, harmful behavior toward recruited providers, or extended inactivity (365+ days).

8.2. **Termination for Cause.** In case of serious violation, proven fraud, fake provider recruitment, legal or brand violation: termination **with immediate effect** and no notice. Unvalidated commissions are cancelled; fraudulently obtained commissions are subject to clawback.

8.3. **Termination without Cause.** Without any violation, SOS Expat may terminate with **30 days' notice** by email. Commissions validated before the effective date remain due.

8.4. **Termination by the Group Admin.** At any time, with a recommended **14-day notice**. Validated commissions remain payable.

8.5. **Effects of Termination.** Recruitment Codes deactivated; referrals and providers reassigned to SOS Expat; dashboard access removed; use of the SOS Expat brand must cease immediately.

8.6. **Surviving Clauses.** Confidentiality (Art. 13.5), intellectual property (Art. 10), liability (Art. 11), governing law (Art. 12), data protection (Art. 9).

---

## 9. Personal Data

9.1. **Data Controller.** SOS Expat (WorldExpat OÜ, Tallinn, Estonia).

9.2. **Data Collected.** Identity, contact details, declared groups and their statistics, affiliate performance, payment data, tax information, connection logs, IP address.

9.3. **Purposes and Legal Basis (GDPR Art. 6).** Contract performance, legal obligations, legitimate interest (fraud prevention, service improvement).

9.4. **Retention.** Active data during the relationship; **10 years** for accounting/tax data. Right to erasure available for other data.

9.5. **GDPR Rights.** Access, rectification, erasure, portability, objection via contact@sos-expat.com. Right to lodge a complaint with the competent supervisory authority.

9.6. **Non-EU Transfers.** EU standard contractual clauses (SCC) apply.

9.7. **CCPA Compliance (California).** CCPA rights available for California residents. Contact: contact@sos-expat.com.

9.8. **PIPEDA / Law 25 Compliance (Canada).** Canadian residents are protected by PIPEDA; Quebec residents by Law 25.

9.9. **LGPD Compliance (Brazil).** LGPD rights available for Brazilian residents.

9.10. **Group Admin Obligations.** The Group Admin is responsible for processing group members' personal data and must comply with applicable laws (GDPR, etc.).

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

11.1. **Liability Cap.** SOS Expat's total liability is limited to **commissions paid over the last 12 months** preceding the claim.

11.2. **Exclusion of Indirect Damages.** SOS Expat excludes all liability for indirect, special, consequential, or punitive damages.

11.3. **No Warranties.** SOS Expat does not guarantee: continuous Platform availability, minimum revenue levels, program continuity, or maintenance of groups on third-party platforms.

11.4. **Force Majeure.** SOS Expat is not liable for events beyond its control (technical failures, platform changes by Facebook/WhatsApp/Telegram, regulatory changes, etc.).

11.5. **Third-party Platform Closures.** SOS Expat is not responsible for group closures or restrictions decided by Facebook, WhatsApp, Telegram, or any other third-party platform.

11.6. **Geographic Restrictions.** Program unavailable in countries under international embargo (UN, EU, US OFAC).

11.7. **Indemnification by Group Admin.** The Group Admin indemnifies SOS Expat against any claim arising from: Terms violation, recruitment activities, promotional content, violation of third-party rights, or violation of applicable law.

---

## 12. Governing Law

12.1. **Governing Law.** Estonian law, without prejudice to mandatory provisions of the Group Admin's country of residence.

12.2. **Multi-level Dispute Resolution.**
- **Step 1**: amicable contact at contact@sos-expat.com (response within **15 business days**)
- **Step 2**: Compliance review (+15 days if unsatisfied)
- **Step 3**: **ICC Arbitration** (International Chamber of Commerce), seat Tallinn, in French, final and binding award

12.3. **Regulatory Rights.** The arbitration clause does not deprive the Group Admin of rights before data protection authorities.

12.4. **Class Action Waiver.** Individual claims only.

12.5. **Language.** French prevails in case of discrepancy between translations.

---

## 13. Miscellaneous

13.1. **Entire Agreement.** These Terms constitute the complete agreement between parties and supersede any prior agreement.

13.2. **Severability.** A void clause is reformulated to the minimum necessary; other clauses remain unchanged.

13.3. **No Waiver.** Failure to exercise a right in a specific case does not constitute permanent waiver.

13.4. **Assignment.** Rights are non-transferable without prior written consent from SOS Expat.

13.5. **Confidentiality.** The Group Admin does not disclose confidential program information. This obligation survives **2 years** after termination.

13.6. **Modifications to Terms.** Email notification **30 days** before any significant modification. Continued use of the program = acceptance. Termination without penalty available before the effective date.

13.7. **Language.** French prevails in case of discrepancy between available translations.

---

## 14. Contact

For any questions about the Group Administrator program, contact us via the contact form or at: groupadmins@sos-expat.com
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
