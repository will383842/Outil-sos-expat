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
} from "lucide-react";
import Layout from "../components/layout/Layout";
import { useApp } from "../contexts/AppContext";
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
 * Important :
 * - Logique métier conservée (Firestore, parsing, sélection langue via useApp).
 * - Design refondu pour matcher Home (gradients, cards, badges, CTA), mobile-first.
 * - 100% éditable depuis l'admin (collection `legal_documents`).
 * - Aucun `any`.
 */

const TermsExpats: React.FC = () => {
  const { language } = useApp();

  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<
    "fr" | "en" | "es" | "de" | "ru" | "hi" | "ch" | "pt" | "ar"
  >(
    (language as
      | "fr"
      | "en"
      | "es"
      | "de"
      | "ru"
      | "hi"
      | "ch"
      | "pt"
      | "ar") || "fr"
  );

  useEffect(() => {
    if (language) {
      setSelectedLanguage(
        language as "fr" | "en" | "es" | "de" | "ru" | "hi" | "ch" | "pt" | "ar"
      );
    }
  }, [language]);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, "legal_documents"),
          where("type", "==", "terms_expats"),
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
      title: "CGU Expatriés Aidants",
      subtitle: "Conditions générales d'utilisation pour les expatriés aidants",
      lastUpdated: "Version 2.2 – Dernière mise à jour : 16 juin 2025",
      loading: "Chargement...",
      joinNetwork: "Rejoindre le réseau",
      trustedByHelpers: "Déjà 1K+ expatriés aidants nous font confiance",
      keyFeatures: "Points clés",
      features: [
        "Paiement garanti sous 7 jours",
        "Support technique 24/7",
        "Interface mobile optimisée",
        "Utilisateurs vérifiés",
      ],
      languageToggle: "Changer de langue",
      sections: {
        definitions: "Définitions",
        scope: "Objet, champ et acceptation",
        status: "Statut de l'Expatrié Aidant – Conformité et responsabilités",
        account: "Compte, vérifications et sécurité",
        rules: "Règles d'usage – Qualité, interdits, non-contournement",
        relationship: "Relation Aidant–Utilisateur (hors Plateforme)",
        fees: "Frais, paiement unique et taxes",
        kyc: "Paiements – KYC/LCB-FT – Sanctions",
        data: "Données personnelles (cadre global)",
        ip: "Propriété intellectuelle",
        liability: "Garanties, responsabilité et indemnisation",
        law: "Droit applicable – Arbitrage – Juridiction estonienne",
        protection: "Clauses de protection internationale",
        misc: "Divers",
        contact: "Contact",
      },
      readyToJoin: "Prêt à rejoindre SOS Expat ?",
      readySubtitle:
        "Aidez des expatriés et développez votre activité de conseil.",
      startNow: "Commencer maintenant",
      contactUs: "Nous contacter",
      anchorTitle: "Sommaire",
      editHint: "Document éditable depuis la console admin",
      ctaHero: "Voir les experts",
      heroBadge: "Nouveau — Conditions mises à jour",
      contactForm: "Formulaire de contact",
    },
    en: {
      title: "Expat Helper Terms",
      subtitle: "Terms of Use for expatriate helpers",
      lastUpdated: "Version 2.2 – Last updated: 16 June 2025",
      loading: "Loading...",
      joinNetwork: "Join the network",
      trustedByHelpers: "Already 1K+ expat helpers trust us",
      keyFeatures: "Key features",
      features: [
        "Guaranteed payment within 7 days",
        "24/7 technical support",
        "Mobile-optimized interface",
        "Verified users",
      ],
      languageToggle: "Switch language",
      sections: {
        definitions: "Definitions",
        scope: "Purpose, Scope and Acceptance",
        status: "Helper Status – Compliance and Responsibilities",
        account: "Account, Checks and Security",
        rules: "Use Rules – Quality, Prohibited Conduct, No Circumvention",
        relationship: "Helper–User Relationship (Off-Platform)",
        fees: "Fees, Single Payment and Taxes",
        kyc: "Payments – KYC/AML – Sanctions",
        data: "Data Protection (Global Framework)",
        ip: "Intellectual Property",
        liability: "Warranties, Liability and Indemnity",
        law: "Governing Law – ICC Arbitration – Estonian Courts",
        protection: "International Protection Clauses",
        misc: "Miscellaneous",
        contact: "Contact",
      },
      readyToJoin: "Ready to join SOS Expat?",
      readySubtitle: "Help expats and develop your consulting activity.",
      startNow: "Start now",
      contactUs: "Contact us",
      anchorTitle: "Overview",
      editHint: "Document editable from the admin console",
      ctaHero: "See experts",
      heroBadge: "New — Terms updated",
      contactForm: "Contact Form",
    },
    es: {
      title: "Términos para Ayudantes Expat",
      subtitle: "Términos de uso para ayudantes de expatriados",
      lastUpdated: "Versión 2.2 – Última actualización: 16 de junio de 2025",
      loading: "Cargando...",
      joinNetwork: "Únete a la red",
      trustedByHelpers: "Ya más de 1K+ ayudantes expat confían en nosotros",
      keyFeatures: "Características clave",
      features: [
        "Pago garantizado en 7 días",
        "Soporte técnico 24/7",
        "Interfaz optimizada para móvil",
        "Usuarios verificados",
      ],
      languageToggle: "Cambiar idioma",
      sections: {
        definitions: "Definiciones",
        scope: "Objeto, alcance y aceptación",
        status: "Estado del Ayudante – Cumplimiento y responsabilidades",
        account: "Cuenta, verificaciones y seguridad",
        rules: "Reglas de uso – Calidad, prohibiciones, no evasión",
        relationship: "Relación Ayudante–Usuario (fuera de la plataforma)",
        fees: "Tarifas, pago único e impuestos",
        kyc: "Pagos – KYC/AML – Sanciones",
        data: "Datos personales (marco global)",
        ip: "Propiedad intelectual",
        liability: "Garantías, responsabilidad e indemnización",
        law: "Ley aplicable – Arbitraje – Jurisdicción estonia",
        protection: "Cláusulas de protección internacional",
        misc: "Varios",
        contact: "Contacto",
      },
      readyToJoin: "¿Listo para unirte a SOS Expat?",
      readySubtitle:
        "Ayuda a expatriados y desarrolla tu actividad de consultoría.",
      startNow: "Empezar ahora",
      contactUs: "Contáctanos",
      anchorTitle: "Resumen",
      editHint: "Documento editable desde la consola de administración",
      ctaHero: "Ver expertos",
      heroBadge: "Nuevo — Términos actualizados",
      contactForm: "Formulario de contacto",
    },
    de: {
      title: "Expat-Helfer Bedingungen",
      subtitle: "Nutzungsbedingungen für Expatriate-Helfer",
      lastUpdated: "Version 3.0 – Letzte Aktualisierung: 1. Februar 2026",
      loading: "Lädt...",
      joinNetwork: "Dem Netzwerk beitreten",
      trustedByHelpers: "Bereits über 1K+ Expat-Helfer vertrauen uns",
      keyFeatures: "Hauptmerkmale",
      features: [
        "Garantierte Zahlung innerhalb von 7 Tagen",
        "24/7 technischer Support",
        "Mobiloptimierte Oberfläche",
        "Verifizierte Benutzer",
      ],
      languageToggle: "Sprache wechseln",
      sections: {
        definitions: "Definitionen",
        scope: "Gegenstand, Umfang und Annahme",
        status: "Helferstatus – Compliance und Verantwortlichkeiten",
        account: "Konto, Überprüfungen und Sicherheit",
        rules: "Nutzungsregeln – Qualität, Verbote, keine Umgehung",
        relationship: "Helfer–Benutzer-Beziehung (außerhalb der Plattform)",
        fees: "Gebühren, Einzelzahlung und Steuern",
        kyc: "Zahlungen – KYC/AML – Sanktionen",
        data: "Personenbezogene Daten (globaler Rahmen)",
        ip: "Geistiges Eigentum",
        liability: "Garantien, Haftung und Entschädigung",
        law: "Anwendbares Recht – Schiedsverfahren – Estnische Gerichtsbarkeit",
        protection: "Internationale Schutzklauseln",
        misc: "Verschiedenes",
        contact: "Kontakt",
      },
      readyToJoin: "Bereit, SOS Expat beizutreten?",
      readySubtitle:
        "Helfen Sie Expats und entwickeln Sie Ihre Beratungstätigkeit.",
      startNow: "Jetzt starten",
      contactUs: "Kontaktieren Sie uns",
      anchorTitle: "Übersicht",
      editHint: "Dokument über die Admin-Konsole bearbeitbar",
      ctaHero: "Experten ansehen",
      heroBadge: "Neu — Bedingungen aktualisiert",
      contactForm: "Kontaktformular",
    },
    ru: {
      title: "Условия для помощников эмигрантов",
      subtitle: "Условия использования для помощников эмигрантов",
      lastUpdated: "Версия 2.2 – Последнее обновление: 16 июня 2025 г.",
      loading: "Загрузка...",
      joinNetwork: "Присоединиться к сети",
      trustedByHelpers: "Уже более 1K+ помощников эмигрантов доверяют нам",
      keyFeatures: "Ключевые особенности",
      features: [
        "Гарантированная оплата в течение 7 дней",
        "Техническая поддержка 24/7",
        "Мобильно-оптимизированный интерфейс",
        "Проверенные пользователи",
      ],
      languageToggle: "Сменить язык",
      sections: {
        definitions: "Определения",
        scope: "Предмет, сфера применения и принятие",
        status: "Статус помощника – Соответствие и обязанности",
        account: "Учётная запись, проверки и безопасность",
        rules: "Правила использования – Качество, запреты, отсутствие обхода",
        relationship: "Отношения помощник–пользователь (вне платформы)",
        fees: "Сборы, единый платёж и налоги",
        kyc: "Платежи – KYC/AML – Санкции",
        data: "Персональные данные (глобальная структура)",
        ip: "Интеллектуальная собственность",
        liability: "Гарантии, ответственность и возмещение ущерба",
        law: "Применимое право – Арбитраж – Эстонская юрисдикция",
        protection: "Международные защитные положения",
        misc: "Разное",
        contact: "Контакт",
      },
      readyToJoin: "Готовы присоединиться к SOS Expat?",
      readySubtitle:
        "Помогайте эмигрантам и развивайте свою консалтинговую деятельность.",
      startNow: "Начать сейчас",
      contactUs: "Свяжитесь с нами",
      anchorTitle: "Обзор",
      editHint: "Документ редактируется из консоли администратора",
      ctaHero: "Посмотреть экспертов",
      heroBadge: "Новое — Условия обновлены",
      contactForm: "Контактная форма",
    },
    hi: {
      title: "एक्सपैट हेल्पर शर्तें",
      subtitle: "प्रवासी सहायकों के लिए उपयोग की शर्तें",
      lastUpdated: "संस्करण 2.2 – अंतिम अपडेट: 16 जून 2025",
      loading: "लोड हो रहा है...",
      joinNetwork: "नेटवर्क में शामिल हों",
      trustedByHelpers: "पहले से ही 1K+ एक्सपैट हेल्पर्स हम पर भरोसा करते हैं",
      keyFeatures: "मुख्य विशेषताएं",
      features: [
        "7 दिनों के भीतर गारंटीकृत भुगतान",
        "24/7 तकनीकी सहायता",
        "मोबाइल-अनुकूलित इंटरफ़ेस",
        "सत्यापित उपयोगकर्ता",
      ],
      languageToggle: "भाषा बदलें",
      sections: {
        definitions: "परिभाषाएँ",
        scope: "उद्देश्य, दायरा और स्वीकृति",
        status: "सहायक स्थिति – अनुपालन और जिम्मेदारियाँ",
        account: "खाता, सत्यापन और सुरक्षा",
        rules: "उपयोग नियम – गुणवत्ता, निषेध, कोई परिहार नहीं",
        relationship: "सहायक–उपयोगकर्ता संबंध (प्लेटफ़ॉर्म के बाहर)",
        fees: "शुल्क, एकल भुगतान और कर",
        kyc: "भुगतान – KYC/AML – प्रतिबंध",
        data: "व्यक्तिगत डेटा (वैश्विक ढांचा)",
        ip: "बौद्धिक संपदा",
        liability: "वारंटी, दायित्व और क्षतिपूर्ति",
        law: "लागू कानून – मध्यस्थता – एस्टोनियाई अधिकार क्षेत्र",
        protection: "अंतर्राष्ट्रीय सुरक्षा खंड",
        misc: "विविध",
        contact: "संपर्क",
      },
      readyToJoin: "SOS Expat में शामिल होने के लिए तैयार हैं?",
      readySubtitle:
        "प्रवासियों की मदद करें और अपनी परामर्श गतिविधि विकसित करें।",
      startNow: "अभी शुरू करें",
      contactUs: "हमसे संपर्क करें",
      anchorTitle: "अवलोकन",
      editHint: "व्यवस्थापक कंसोल से संपादन योग्य दस्तावेज़",
      ctaHero: "विशेषज्ञ देखें",
      heroBadge: "नया — शर्तें अपडेट की गईं",
      contactForm: "संपर्क फ़ॉर्म",
    },
    ch: {
      title: "外籍助手服务条款",
      subtitle: "外籍助手使用条款",
      lastUpdated: "版本 2.2 – 最后更新：2025年6月16日",
      loading: "加载中...",
      joinNetwork: "加入网络",
      trustedByHelpers: "已有超过 1,000 名外籍助手信任我们",
      keyFeatures: "主要功能",
      features: [
        "7 天内保证付款",
        "全天候（24/7）技术支持",
        "移动端优化界面",
        "已验证用户",
      ],
      languageToggle: "切换语言",
      sections: {
        definitions: "定义",
        scope: "目的、适用范围与接受",
        status: "助手身份 – 合规与责任",
        account: "账户、审核与安全",
        rules: "使用规则 – 质量、禁止行为与禁止规避",
        relationship: "助手与用户关系（平台外）",
        fees: "费用、单次付款与税务",
        kyc: "支付 – KYC/AML – 制裁",
        data: "数据保护（全球框架）",
        ip: "知识产权",
        liability: "保证、责任与赔偿",
        law: "适用法律 – ICC 仲裁 – 爱沙尼亚法院",
        protection: "国际保护条款",
        misc: "其他条款",
        contact: "联系方式",
      },
      readyToJoin: "准备加入 SOS Expat 吗？",
      readySubtitle: "帮助外籍人士并发展您的咨询业务。",
      startNow: "立即开始",
      contactUs: "联系我们",
      anchorTitle: "概览",
      editHint: "可从管理控制台编辑文档",
      ctaHero: "查看专家",
      heroBadge: "新内容 — 条款已更新",
      contactForm: "联系表单",
    },
    ar: {
      title: "شروط مساعدي المغتربين",
      subtitle: "شروط الاستخدام لمساعدي المغتربين",
      lastUpdated: "الإصدار 2.2 – آخر تحديث: 16 يونيو 2025",
      loading: "جارٍ التحميل...",
      joinNetwork: "انضم إلى الشبكة",
      trustedByHelpers: "يثق بنا بالفعل أكثر من 1000+ مساعد مغترب",
      keyFeatures: "الميزات الرئيسية",
      features: [
        "دفع مضمون خلال 7 أيام",
        "دعم فني على مدار الساعة (24/7)",
        "واجهة محسّنة للأجهزة المحمولة",
        "مستخدمون موثقون",
      ],
      languageToggle: "تغيير اللغة",
      sections: {
        definitions: "التعريفات",
        scope: "الهدف والنطاق والقبول",
        status: "حالة المساعد – الامتثال والمسؤوليات",
        account: "الحساب والفحوصات والأمان",
        rules: "قواعد الاستخدام – الجودة والسلوك المحظور وبدون التفافية",
        relationship: "علاقة المساعد والمستخدم (خارج المنصة)",
        fees: "الرسوم والدفع الواحد والضرائب",
        kyc: "المدفوعات – KYC/AML – العقوبات",
        data: "حماية البيانات (الإطار العالمي)",
        ip: "الملكية الفكرية",
        liability: "الضمانات والمسؤولية والتعويض",
        law: "القانون الحاكم – التحكيم ICC – المحاكم الإستونية",
        protection: "بنود الحماية الدولية",
        misc: "متفرقات",
        contact: "اتصل",
      },
      readyToJoin: "هل أنت مستعد للانضمام إلى SOS Expat؟",
      readySubtitle: "ساعد المغتربين وطوّر نشاطك الاستشاري.",
      startNow: "ابدأ الآن",
      contactUs: "اتصل بنا",
      anchorTitle: "نظرة عامة",
      editHint: "مستند قابل للتحرير من وحدة التحكم الإدارية",
      ctaHero: "عرض الخبراء",
      heroBadge: "جديد – تم تحديث الشروط",
      contactForm: "نموذج الاتصال",
    },
    pt: {
      title: "Termos para Ajudantes Expat",
      subtitle: "Termos de uso para ajudantes de expatriados",
      lastUpdated: "Versão 2.2 – Última atualização: 16 de junho de 2025",
      loading: "Carregando...",
      joinNetwork: "Junte-se à rede",
      trustedByHelpers: "Já mais de 1K+ ajudantes expat confiam em nós",
      keyFeatures: "Características principais",
      features: [
        "Pagamento garantido em 7 dias",
        "Suporte técnico 24/7",
        "Interface otimizada para dispositivos móveis",
        "Usuários verificados",
      ],
      languageToggle: "Mudar idioma",
      sections: {
        definitions: "Definições",
        scope: "Objetivo, âmbito e aceitação",
        status: "Status do Ajudante – Conformidade e responsabilidades",
        account: "Conta, verificações e segurança",
        rules: "Regras de uso – Qualidade, condutas proibidas, sem contornamento",
        relationship: "Relação Ajudante–Usuário (fora da plataforma)",
        fees: "Taxas, pagamento único e impostos",
        kyc: "Pagamentos – KYC/AML – Sanções",
        data: "Proteção de dados (estrutura global)",
        ip: "Propriedade intelectual",
        liability: "Garantias, responsabilidade e indenização",
        law: "Lei aplicável – Arbitragem ICC – Tribunais estonianos",
        protection: "Cláusulas de proteção internacional",
        misc: "Diversos",
        contact: "Contato",
      },
      readyToJoin: "Pronto para se juntar ao SOS Expat?",
      readySubtitle: "Ajude expatriados e desenvolva sua atividade de consultoria.",
      startNow: "Começar agora",
      contactUs: "Entre em contato conosco",
      anchorTitle: "Resumo",
      editHint: "Documento editável a partir do console de administração",
      ctaHero: "Ver especialistas",
      heroBadge: "Novo — Termos atualizados",
      contactForm: "Formulário de contato",
    },
  };

  const t = translations[selectedLanguage];

  const handleLanguageChange = (
    newLang: "fr" | "en" | "es" | "de" | "ru" | "hi" | "ch" | "pt" | "ar"
  ) => {
    setSelectedLanguage(newLang);
  };

  // Parser Markdown (logique d’origine conservée)
  const parseMarkdownContent = (text: string) => {
    const lines = text.split("\n");
    const elements: JSX.Element[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === "") continue;

      if (line.trim() === "---") {
        elements.push(
          <hr
            key={currentIndex++}
            className="my-8 border-t-2 border-gray-200"
          />
        );
        continue;
      }

      // H1
      if (line.startsWith("# ")) {
        const title = line.substring(2).replace(/\*\*/g, "");
        elements.push(
          <h1
            key={currentIndex++}
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-green-500 pb-4"
          >
            {title}
          </h1>
        );
        continue;
      }

      // H2 (+ id pour ancre)
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
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-bold shadow-lg">
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
            className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-green-500 pl-4"
          >
            {title}
          </h3>
        );
        continue;
      }

      // 2.1 / 3.2 …
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
            className="bg-gray-50 border-l-4 border-green-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-green-600 mr-2">{number}</span>
              <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedContent) }} />
            </p>
          </div>
        );
        continue;
      }

      // Ligne entièrement en gras
      if (line.startsWith("**") && line.endsWith("**")) {
        const boldText = line.slice(2, -2);
        elements.push(
          <div
            className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 my-6"
            key={currentIndex++}
          >
            <p className="font-bold text-gray-900 text-lg">{boldText}</p>
          </div>
        );
        continue;
      }

      // Bloc Contact
      if (
        line.includes("Pour toute question") ||
        line.includes("For any questions")
      ) {
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold shadow-lg">
                13
              </span>
              Contact
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="https://sos-expat.com/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              {selectedLanguage === "fr"
                ? "Formulaire de contact"
                : "Contact Form"}
            </a>
          </div>
        );
        continue;
      }

      // Paragraphe
      if (line.trim()) {
        const formattedLine = line
          .replace(
            /\*\*(.*?)\*\*/g,
            '<strong class="font-semibold text-gray-900">$1</strong>'
          )
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

  // Contenu par défaut FR (une seule paire de ** pour éviter le parsing foireux)
  const defaultFr = `
# Conditions Générales d'Utilisation – Expatriés Aidants (Global)

**SOS Expat d'WorldExpat OÜ** (la « **Plateforme** », « **SOS** », « **nous** »)

**Version 2.2 – Dernière mise à jour : 16 juin 2025**

---

## 1. Définitions

**Expatrié Aidant** (« **Aidant** ») : toute personne inscrite sur la Plateforme pour proposer, à titre indépendant, des services d'assistance non juridiques et non médicaux à des Utilisateurs (orientation, démarches pratiques, accompagnement, traduction informelle, mise en relation locale, etc.).

**Utilisateur** : toute personne utilisant la Plateforme pour contacter un Aidant.

**Mise en relation** : l'introduction technique/opérationnelle réalisée par la Plateforme entre un Utilisateur et un Aidant (transmission de coordonnées et/ou ouverture d'un canal de communication et/ou acceptation par l'Aidant d'une demande émise via la Plateforme).

**Pays d'Intervention** : la juridiction principalement visée par la demande de l'Utilisateur au moment de la Mise en relation ; à défaut, le pays de résidence de l'Utilisateur à la date de la demande.

**Frais de Mise en relation** : frais fixes dus à SOS par Mise en relation (art. 7) : **19 €** si paiement en **EUR** ou **25 $ USD** si paiement en **USD**, susceptibles d'évolution et/ou de **barèmes locaux** par pays/devise, avec effet prospectif.

**Prestataire(s) de paiement** : services tiers traitant les encaissements et la répartition des fonds.

---

## 2. Objet, champ et acceptation

2.1. Les présentes CGU régissent l'accès et l'utilisation de la Plateforme par les Aidants.

2.2. **SOS Expat agit exclusivement comme intermédiaire technique de Mise en relation.** SOS Expat n'est pas employeur, mandataire ou partenaire des Aidants, ne fournit aucun conseil juridique, médical, fiscal, comptable ou réglementé, et n'est pas partie aux contrats entre Aidants et Utilisateurs.

2.3. **Acceptation électronique (click-wrap).** L'inscription et/ou l'usage de la Plateforme valent acceptation des CGU, signature électronique et consentement contractuel. SOS peut conserver des preuves techniques (horodatage, identifiants).

2.4. **Modifications.** SOS peut mettre à jour les CGU et/ou les barèmes de frais (par pays/devise) avec **effet prospectif** par publication sur la Plateforme. L'usage continu vaut acceptation.

2.5. **Capacité professionnelle (B2B).** L'Aidant déclare agir **exclusivement à des fins professionnelles** ; les régimes de protection des consommateurs ne s'appliquent pas à la relation SOS Expat–Aidant.

---

## 3. Statut de l'Aidant – Conformité, autorisations et responsabilités

3.1. **Indépendance.** L'Aidant agit en **professionnel indépendant** ; aucun lien d'emploi, mandat, agence, partenariat ou coentreprise n'est créé avec SOS Expat.

3.2. **Autorisation de travail & statut d'immigration.** L'Aidant est **seul responsable** d'obtenir et de maintenir **toutes autorisations** requises dans chaque Pays d'Intervention (visa, permis de travail, enregistrement d'activité/auto-entreprise, assurances, licences locales, etc.). SOS Expat **ne vérifie pas** ces autorisations et **n'assume aucune responsabilité** à ce titre.

3.3. **Services non réglementés.** L'Aidant s'engage à **ne pas fournir de services réglementés** (ex. conseil juridique, médical, financier, d'expert-comptable, d'agent immobilier, etc.) **sans** détenir les **autorisations/licences** nécessaires **et** sans se conformer pleinement aux lois locales. À défaut, il s'abstient de tels services et redirige l'Utilisateur vers un professionnel dûment habilité (ex. avocat inscrit).

3.4. **Conformité générale.** L'Aidant respecte les lois/règlements applicables (consommation, e-commerce, publicité/démarchage, concurrence loyale, LCB-FT/KYC le cas échéant, fiscalité, protection des données, sanctions/export, sécurité des personnes).

3.5. **Assurances.** L'Aidant déclare disposer des assurances nécessaires (responsabilité civile pro, le cas échéant) couvrant ses activités et territoires d'intervention.

3.6. **Confidentialité.** L'Aidant protège les informations des Utilisateurs et s'abstient de les divulguer, sauf obligation légale ou consentement.

---

## 4. Compte, vérifications et sécurité

4.1. **Inscription.** Un (1) compte par Aidant ; informations exactes, complètes et à jour (identité, moyens de contact, description des services, zones d'intervention, etc.).

4.2. **Vérifications.** SOS Expat peut procéder à des contrôles raisonnables (identité, cohérence du profil, screenings sanctions/KYC via Prestataires) et refuser/suspendre/retirer l'accès pour motif de sécurité, conformité ou qualité de service.

4.3. **Sécurité des accès.** L'Aidant protège ses identifiants. Toute activité via le compte est réputée effectuée par lui.

4.4. **Inactivité & résiliation.** En cas d'**inactivité supérieure à 365 jours**, le compte peut être désactivé automatiquement après notification. L'Aidant peut fermer son compte à tout moment après avoir honoré ses obligations en cours. SOS Expat peut suspendre ou résilier un compte pour violation des CGU, sans préjudice d'autres recours.

4.5. **Communications électroniques.** L'Aidant consent à recevoir toute notification relative aux CGU par voie électronique (email, notification in-app, publication sur la Plateforme).

---

## 5. Règles d'usage – Qualité, interdits, non-contournement

5.1. **Qualité & description fidèle.** L'Aidant décrit ses services de façon exacte, sans promesse de résultat. Il ne présente **aucune fausse qualité** (ex. profession réglementée non détenue).

5.2. **Interdits.** Contenus illicites, discriminatoires ou trompeurs ; pratiques déloyales ; collecte ou usage abusif de données ; contournement/ingénierie inverse de la Plateforme ; collusion/boycott visant à nuire ; violations sanctions/export ; toute activité illégale.

5.3. **Non-contournement.** Chaque **nouvelle Mise en relation** avec un **nouvel Utilisateur** via la Plateforme donne lieu aux **Frais de Mise en relation** (art. 7). Il est **interdit** d'éviter ces frais en contournant la Plateforme pour une nouvelle introduction.

5.4. **Disponibilité.** La Plateforme est fournie **« en l'état »** ; aucune disponibilité ininterrompue n'est garantie (maintenance, incidents, force majeure). L'accès peut être restreint si la loi l'exige.

---

## 6. Relation Aidant–Utilisateur (hors Plateforme)

6.1. Après la Mise en relation, l'Aidant et l'Utilisateur peuvent contractualiser **hors Plateforme**. Les **honoraires** et modalités sont fixés librement par eux, dans le respect des lois locales.

6.2. L'Aidant remet des **conditions/confirmations de service** conformes au droit local, gère sa **facturation** et ses **obligations fiscales**.

6.3. SOS Expat **n'est pas responsable** de la qualité, de l'exactitude ou du résultat des services de l'Aidant, ni des engagements pris entre l'Aidant et l'Utilisateur.

---

## 7. Frais, paiement unique et taxes

7.1. **Frais de Mise en relation (forfait).** **19 € (EUR)** **ou** **25 $ (USD)** **par Mise en relation**, hors taxes et hors frais du Prestataire de paiement. SOS Expat peut modifier ces montants et/ou publier des **barèmes locaux** par pays/devise, avec effet prospectif.

7.2. **Paiement unique & répartition.** L'Utilisateur effectue **un paiement unique** via la Plateforme couvrant (i) la **rémunération de l'Aidant** (telle que convenue) et (ii) les **Frais de Mise en relation** d'SOS Expat. SOS Expat (ou son Prestataire) encaisse, **déduit** ses frais, puis **reverse** le solde à l'Aidant. L'Aidant **autorise** ces déductions et répartitions.

7.3. **Exigibilité & non-remboursement.** Les Frais de Mise en relation sont **dus dès** la Mise en relation et sont **non remboursables** (sauf geste commercial discrétionnaire d'SOS Expat en cas d'échec exclusivement imputable à la Plateforme et **dans la mesure permise par la loi**).

7.4. **Remboursements Utilisateur.** Si un remboursement est accordé à l'Utilisateur, il est **imputé sur la part de l'Aidant** : SOS Expat peut **retenir/compenser** le montant correspondant sur les versements futurs de l'Aidant ou en demander le remboursement si aucun versement n'est à venir. **Aucun remboursement** des Frais de Mise en relation n'est dû, sauf décision discrétionnaire d'SOS Expat.

7.5. **Devises & conversion.** Plusieurs devises peuvent être proposées ; des taux/frais de conversion du Prestataire peuvent s'appliquer.

7.6. **Taxes.** L'Aidant demeure responsable de **toutes taxes** applicables (TVA, impôt sur le revenu, sécurité sociale, etc.). SOS Expat collecte/reverse, lorsque requis, la TVA/équivalent local sur les Frais de Mise en relation.

7.7. **Compensation.** SOS Expat peut compenser toute somme due par l'Aidant avec toute somme payable à l'Aidant.

---

## 8. Paiements – KYC/LCB-FT – Sanctions

8.1. **Prestataires de paiement.** Les paiements sont traités par des **Prestataires tiers** (Stripe, etc.). L'Aidant accepte leurs conditions générales et leurs processus de vérification **KYC/LCB-FT** (Know Your Customer / Lutte contre le Blanchiment et le Financement du Terrorisme).

8.2. **KYC obligatoire pour recevoir les versements.** L'Aidant **doit compléter avec succès** la procédure de vérification d'identité (KYC) auprès du Prestataire de paiement **avant** de pouvoir recevoir tout versement. **Aucun paiement ne sera effectué** tant que le KYC n'est pas validé. SOS Expat décline toute responsabilité pour les retards de paiement liés à un KYC incomplet ou refusé.

8.3. **Rétention et annulation.** SOS Expat peut **différer, retenir ou annuler** des paiements en cas de : (i) soupçon de fraude, (ii) non-conformité aux CGU ou aux lois, (iii) injonction légale ou administrative, (iv) défaut de KYC, (v) violation des règles de sanctions internationales.

8.4. **Sanctions et embargos.** L'accès à la Plateforme et aux services de paiement peut être **restreint** dans des territoires soumis à **sanctions ou embargos** (UE, USA, ONU, OFAC). L'Aidant déclare **ne figurer sur aucune liste de sanctions** et respecter les **contrôles export** applicables.

8.5. **Coopération légale.** L'Aidant s'engage à coopérer avec SOS Expat et les autorités compétentes en cas d'enquête relative au blanchiment d'argent, au financement du terrorisme ou à toute autre infraction financière.

### Fonds non réclamés et vérification KYC

8.6. **Conservation des fonds en attente.** Lorsqu'un paiement est effectué par un Utilisateur pour une prestation réalisée par un Aidant n'ayant pas complété sa vérification KYC, les fonds correspondant à la part de l'Aidant (déduction faite des frais de mise en relation de la Plateforme) sont conservés en attente sur un compte séquestre. La Plateforme s'engage à :
- Notifier l'Aidant par email de l'existence de fonds en attente ;
- Envoyer des rappels réguliers (à 7 jours, 30 jours, 60 jours, 90 jours, 120 jours et 150 jours) ;
- Fournir à l'Aidant tous les moyens nécessaires pour compléter sa vérification KYC.

8.7. **Fonds non réclamés et déchéance.** À défaut de vérification KYC complète dans un délai de **cent quatre-vingts (180) jours** à compter du premier paiement mis en attente, et malgré les notifications prévues à l'article 8.6, les fonds seront considérés comme **abandonnés** par l'Aidant. L'Aidant reconnaît et accepte expressément que :
- (a) Les fonds non réclamés dans ce délai seront définitivement acquis à la Plateforme à titre d'indemnité forfaitaire pour frais de gestion, conservation et tentatives de contact ;
- (b) Cette acquisition est la contrepartie des coûts administratifs supportés par la Plateforme pour la gestion des fonds non réclamés ;
- (c) Il renonce expressément à toute réclamation sur ces fonds passé le délai de 180 jours.

8.8. **Réclamation exceptionnelle.** Par dérogation à l'article 8.7, l'Aidant peut adresser une demande de réclamation motivée dans un délai maximum de **douze (12) mois** suivant l'expiration du délai de 180 jours, uniquement dans les cas suivants : incapacité médicale documentée, force majeure dûment justifiée, ou erreur technique imputable à la Plateforme. La Plateforme examinera la demande sous 30 jours et se réserve le droit d'accepter ou de refuser la réclamation. En cas d'acceptation, des frais de traitement de **vingt pour cent (20%)** seront retenus sur le montant restitué.

8.9. **Acceptation expresse.** En s'inscrivant sur la Plateforme en tant qu'Aidant, celui-ci déclare avoir pris connaissance des présentes conditions relatives aux fonds non réclamés et les accepte expressément. Cette acceptation constitue une condition essentielle et déterminante de l'accès au statut de prestataire sur la Plateforme.

---

## 9. Données personnelles (cadre global – GDPR/DSA)

9.1. **Rôles.** Pour les données d'Utilisateurs reçues aux fins de Mise en relation, **SOS Expat et l'Aidant** agissent **chacun** en **responsable de traitement** pour leurs propres finalités, conformément au **Règlement (UE) 2016/679 (GDPR)**.

9.2. **Bases & finalités.** Exécution du contrat (Mise en relation), intérêts légitimes (sécurité, prévention de la fraude, amélioration), conformité légale (LCB-FT, sanctions), et consentement lorsque requis.

9.3. **Transferts internationaux** avec **garanties appropriées** lorsque requis (clauses contractuelles types, décision d'adéquation, etc.).

9.4. **Droits & contact.** Exercice des droits (accès, rectification, effacement, portabilité, opposition) via le **formulaire de contact** de la Plateforme.

9.5. **Sécurité.** Mesures techniques/organisationnelles raisonnables ; notification des violations selon les lois applicables (72 heures conformément au GDPR).

9.6. L'Aidant traite les données conformément au droit du **Pays d'Intervention**.

9.7. **Conformité DSA.** La Plateforme opère en tant que **service intermédiaire** au sens du **Règlement (UE) 2022/2065 (Digital Services Act)**. SOS Expat met en place des mécanismes de signalement de contenus illicites et coopère avec les autorités compétentes conformément au DSA.

---

## 10. Propriété intellectuelle

La Plateforme, ses marques, logos, bases de données et contenus sont protégés. Aucun droit n'est cédé à l'Aidant, hormis un droit **personnel, non exclusif, non transférable** d'accès pendant la durée des CGU. Les contenus fournis par l'Aidant font l'objet d'une **licence mondiale, non exclusive** au profit d'SOS Expat pour l'hébergement et l'affichage dans la Plateforme.

---

## 11. Garanties, responsabilité et indemnisation

11.1. **Aucune garantie** quant aux résultats/qualité/volume d'affaires ; la Plateforme est fournie **« en l'état »**.

11.2. **Limitation de responsabilité** : dans la mesure permise, la responsabilité totale d'SOS Expat envers l'Aidant est limitée aux **dommages directs** et **ne peut excéder** le total des **Frais de Mise en relation** perçus par SOS Expat au titre de la **transaction** à l'origine de la réclamation.

11.3. **Exclusions** : aucun dommage indirect/consécutif/spécial/punitif (perte de profits, d'opportunités, de clientèle, atteinte à la réputation, coûts de remplacement, etc.).

11.4. **Indemnisation** : l'Aidant **indemnise et garantit** SOS Expat (ainsi que ses affiliés, dirigeants, employés, agents) contre toute réclamation, perte, dommage, pénalité et frais (dont honoraires d'avocat) liés à (i) son manquement aux CGU/lois, (ii) ses contenus, (iii) ses services/omissions, (iv) l'absence d'autorisations de travail/immigration/licences.

11.5. **Renonciation aux recours.** L'Aidant **renonce expressément et irrévocablement** à tout recours contre SOS Expat au titre (i) des dommages résultant de la prestation de services, (ii) des pertes indirectes, (iii) des litiges contractuels avec les Utilisateurs, (iv) de toute défaillance des services fournis par l'Aidant. Cette renonciation s'applique dans la mesure maximale permise par la loi.

11.6. **Aucune représentation.** Rien n'emporte mandat, emploi, partenariat ou coentreprise entre SOS Expat et l'Aidant.

11.7. **Force majeure.** SOS Expat n'est pas responsable des retards ou défaillances causés par des événements de **force majeure** (catastrophe naturelle, guerre, pandémie, cyberattaque, panne électrique ou internet, décision gouvernementale, grève, etc.).

11.8. **Survie.** Les art. 5, 7, 8, 9, 10, 11, 12 et 13 survivent à la résiliation.

---

## 12. Droit applicable – Arbitrage – Juridiction estonienne – Actions collectives

12.1. **Droit matériel** : pour chaque Mise en relation, la relation **SOS Expat–Aidant** est régie par les **lois du Pays d'Intervention**, sous réserve des règles d'ordre public locales et des normes internationales impératives. **À titre supplétif et pour l'interprétation/validité des présentes CGU ainsi que pour toute question non régie par le droit du Pays d'Intervention, le droit estonien s'applique.**

12.2. **Arbitrage CCI obligatoire** : tout litige SOS Expat/Aidant est résolu **définitivement** selon le Règlement d'Arbitrage de la **CCI**. **Siège : Tallinn (Estonie)**. **Langue : français.** Le tribunal applique le **droit matériel** défini à l'art. 12.1. Procédure **confidentielle**.

12.3. **Renonciation aux actions collectives** : dans la mesure permise, toute action **collective/de groupe/représentative** est exclue ; réclamations **individuelles uniquement**.

12.4. **Compétence exclusive des tribunaux d'Estonie** : pour toute demande **non arbitrable**, l'**exécution** des sentences ou les **mesures urgentes**, les tribunaux estoniens (compétents à Tallinn) ont compétence **exclusive**. L'Aidant renonce à toute objection de forum/non-convenance.

12.5. **Médiation préalable.** Avant tout arbitrage, les parties s'engagent à tenter de résoudre le litige à l'amiable par **négociation de bonne foi** pendant un délai de **trente (30) jours** à compter de la notification écrite du différend.

---

## 13. Clauses de protection internationale

13.1. **Anti-corruption.** L'Aidant s'engage à ne pas offrir, promettre ou verser de pots-de-vin ou avantages indus à des agents publics ou privés. Il respecte les lois anti-corruption applicables (FCPA, UK Bribery Act, loi Sapin II, etc.).

13.2. **Confidentialité des échanges.** Les échanges réalisés via la Plateforme (messages, appels téléphoniques) sont **confidentiels**. L'Aidant s'interdit de les enregistrer, divulguer ou utiliser à d'autres fins que la prestation convenue, sauf autorisation écrite ou obligation légale.

13.3. **Non-sollicitation.** Pendant la durée des CGU et **douze (12) mois** après leur résiliation, l'Aidant s'interdit de solliciter directement les Utilisateurs rencontrés via la Plateforme pour éviter les Frais de Mise en relation.

13.4. **Responsabilité exclusive de l'Aidant.** L'Aidant est **seul responsable** de la qualité, de l'exactitude et de la légalité des services qu'il fournit. SOS Expat **ne garantit pas** les conseils, informations ou services délivrés par l'Aidant et **décline toute responsabilité** pour tout préjudice subi par un Utilisateur du fait des services de l'Aidant.

13.5. **Absence de relation de conseil.** SOS Expat n'est **pas un cabinet de conseil**, ni un prestataire de services juridiques, fiscaux, médicaux ou réglementés. La Plateforme se limite à la **mise en relation**. Toute relation de conseil est établie **exclusivement** entre l'Aidant et l'Utilisateur, **hors** de SOS Expat.

13.6. **Litiges Aidant-Utilisateur.** Tout litige entre un Aidant et un Utilisateur relève **exclusivement** de leur relation directe. SOS Expat **n'intervient pas** dans ces litiges et **ne peut être mis en cause** comme partie, garant ou médiateur.

---

## 14. Divers

14.1. **Cession.** SOS Expat peut céder les CGU à une entité de son groupe ou à un successeur ; l'Aidant ne peut céder sans accord écrit d'SOS Expat.

14.2. **Intégralité.** Les CGU constituent l'accord complet et remplacent tout accord antérieur relatif au même objet.

14.3. **Notifications.** Par publication sur la Plateforme, notification in-app ou via le **formulaire de contact**.

14.4. **Interprétation.** Les intitulés sont indicatifs. Aucune règle **contra proferentem**.

14.5. **Langues.** Des traductions peuvent être fournies ; **le français prévaut** pour l'interprétation.

14.6. **Nullité partielle.** Si une stipulation est nulle/inapplicable, le reste demeure en vigueur ; remplaçable par une stipulation valide d'effet équivalent lorsque possible.

14.7. **Non-renonciation.** L'absence d'exercice d'un droit n'emporte pas renonciation.

---

## 15. Contact

Pour toute question ou demande légale, contactez-nous :
`;

  // Contenu par défaut EN (une seule paire de **)
  const defaultEn = `
# Terms of Use – Expatriate Helpers (Global)

**SOS Expat by WorldExpat OÜ** (the "**Platform**", "**SOS**", "**we**")

**Version 2.2 – Last updated: 16 June 2025**

---

## 1. Definitions

**Expatriate Helper (“Helper”):** any person registered on the Platform to offer, on an independent basis, non-legal and non-medical assistance services to Users (guidance, practical support, informal translation, local networking, etc.).

**User:** any person using the Platform to contact a Helper.

**Connection:** the technical/operational introduction made by the Platform between a User and a Helper (transmission of contact details and/or opening of a communication channel and/or acceptance by the Helper of a request submitted through the Platform).

**Country of Operation:** the jurisdiction primarily targeted by the User’s request at the time of Connection; failing that, the User’s country of residence at the date of the request.

**Connection Fee:** fixed fee payable to SOS per Connection (art. 7): **€19** if paid in EUR or **$25 USD** if paid in USD, subject to change and/or **local rate schedules** by country/currency, with prospective effect.

**Payment Service Providers:** third-party services processing payments and fund distribution.

---

## 2. Purpose, Scope and Acceptance

2.1. These Terms of Use govern access to and use of the Platform by Helpers.

2.2. SOS Expat acts solely as a technical intermediary for Connections. SOS Expat is not the employer, agent, or partner of Helpers, provides no legal, medical, tax, accounting, or other regulated advice, and is not a party to contracts between Helpers and Users.

2.3. **Electronic acceptance (click-wrap):** Registration and/or use of the Platform constitutes acceptance of these Terms, electronic signature, and contractual consent. SOS may retain technical evidence (timestamps, identifiers).

2.4. **Modifications:** SOS may update the Terms and/or fee schedules (by country/currency) with prospective effect by publishing them on the Platform. Continued use constitutes acceptance.

2.5. **Professional capacity (B2B):** The Helper declares to act solely for professional purposes; consumer protection regimes do not apply to the SOS Expat–Helper relationship.

---

## 3. Helper status – Compliance, authorizations, and responsibilities

3.1. **Independence:** The Helper acts as an independent professional; no employment, agency, partnership, or joint venture relationship is created with SOS Expat.

3.2. **Work authorization & immigration status:** The Helper is solely responsible for obtaining and maintaining all required authorizations in each Country of Operation (visa, work permit, business registration/self-employment, insurance, local licenses, etc.). SOS Expat does not verify such authorizations and assumes no responsibility in this regard.

3.3. **Unregulated services:** The Helper agrees not to provide regulated services (e.g. legal, medical, financial, accounting, or real estate advice, etc.) without holding the required authorizations/licenses and full compliance with local laws. Otherwise, the Helper must refrain from such services and refer the User to a duly licensed professional (e.g. a registered lawyer).

3.4. **General compliance:** The Helper complies with applicable laws/regulations (consumer protection, e-commerce, advertising/solicitation, fair competition, AML/KYC where applicable, taxation, data protection, sanctions/export, and personal safety).

3.5. **Insurance:** The Helper declares to hold necessary insurance (e.g., professional liability) covering their activities and territories of operation.

3.6. **Confidentiality:** The Helper protects Users’ information and shall not disclose it except where legally required or with consent.

---

## 4. Account, verification, and security

4.1. **Registration** One (1) account per Helper; information must be accurate, complete, and up to date (identity, contact details, service descriptions, operational areas, etc.).

4.2. **Verification** SOS Expat may perform reasonable checks (identity, profile consistency, sanctions/KYC screenings via Providers) and may refuse/suspend/remove access for reasons of security, compliance, or service quality.

4.3. **Access security** The Helper protects their login credentials. Any activity under the account is deemed to have been performed by them.

4.4. **Inactivity & termination.** After **365 days of inactivity**, the account may be automatically deactivated following notification. The Helper may close their account at any time after fulfilling their outstanding obligations. SOS Expat may suspend or terminate an account for violation of the Terms, without prejudice to other remedies.

4.5. **Electronic communications.** The Helper consents to receive any notifications related to the Terms by electronic means (email, in-app notification, publication on the Platform).

---

## 5. Use Rules – Quality, Prohibited Conduct, No Circumvention

5.1. **Quality & accurate description** The Helper must describe services accurately, without promising results. The Helper must not claim false professional status (e.g., regulated profession not held).

5.2. **Prohibitions** Illegal, discriminatory, or misleading content; unfair practices; abusive data collection or use; circumvention or reverse-engineering of the Platform; collusion/boycott intended to harm; sanctions/export violations; any unlawful activity.

5.3. **Non-circumvention** Each new Connection with a new User through the Platform gives rise to Connection Fees (art. 7). It is forbidden to avoid such fees by bypassing the Platform for a new introduction.

5.4. **Availability** The Platform is provided “as is”; uninterrupted availability is not guaranteed (maintenance, incidents, force majeure). Access may be restricted where required by law.

---

## 6. Helper–User Relationship (Off-Platform)

6.1. After the Connection, the Helper and User may enter into an agreement off-platform. Fees and terms are freely determined between them, in compliance with local laws.

6.2. The Helper provides service confirmations/terms compliant with local law, manages their own billing and tax obligations.

6.3. SOS Expat is not responsible for the quality, accuracy, or outcome of the Helper’s services, nor for any commitments made between Helper and User.

---

## 7. Fees, Single Payment and Taxes

7.1. **Connection Fee (flat rate): €19 (EUR) or $25 (USD)** per Connection, excluding taxes and Payment Provider fees. SOS Expat may modify these amounts and/or publish local rate schedules by country/currency, with prospective effect.

7.2. **Single payment & distribution:** The User makes a single payment via the Platform covering (i) the Helper’s remuneration (as agreed) and (ii) SOS Expat’s Connection Fee. SOS Expat (or its Provider) collects, deducts its fee, and transfers the remaining balance to the Helper. The Helper authorizes such deductions and allocations.

7.3. **Due and non-refundable:** The Connection Fee is due as soon as the Connection is made and non-refundable (except at SOS Expat’s discretionary goodwill in case of a failure solely attributable to the Platform and to the extent permitted by law).

7.4. **User refunds:** If a refund is granted to a User, it is deducted from the Helper’s share: SOS Expat may withhold/offset the corresponding amount from future payments to the Helper or request repayment if no payment is pending. No refund of Connection Fees is due, except at SOS Expat’s discretion.

7.5. **Currencies & conversion:** Multiple currencies may be offered; Provider exchange rates/fees may apply.

7.6. **Taxes** The Helper remains responsible for all applicable taxes (VAT, income tax, social security, etc.). SOS Expat collects/remits, where required, VAT/equivalent on Connection Fees.

7.7. **Set-off** SOS Expat may offset any amount owed by the Helper against any amount payable to the Helper.

---

## 8. Payments – KYC/AML – Sanctions

8.1. **Payment Providers.** Payments are processed by **third-party Providers** (Stripe, etc.). The Helper agrees to their terms and conditions and their **KYC/AML** (Know Your Customer / Anti-Money Laundering) verification processes.

8.2. **KYC required to receive payments.** The Helper **must successfully complete** the identity verification process (KYC) with the Payment Provider **before** receiving any payment. **No payment will be made** until KYC is validated. SOS Expat disclaims any responsibility for payment delays related to incomplete or rejected KYC.

8.3. **Retention and cancellation.** SOS Expat may **defer, withhold, or cancel** payments in case of: (i) suspected fraud, (ii) non-compliance with Terms or laws, (iii) legal or administrative order, (iv) KYC failure, (v) violation of international sanctions rules.

8.4. **Sanctions and embargoes.** Access to the Platform and payment services may be **restricted** in territories subject to **sanctions or embargoes** (EU, USA, UN, OFAC). The Helper declares **not to appear on any sanctions list** and to comply with applicable **export controls**.

8.5. **Legal cooperation.** The Helper agrees to cooperate with SOS Expat and competent authorities in case of investigation related to money laundering, terrorist financing, or any other financial offense.

### Unclaimed Funds and KYC Verification

8.6. **Holding of pending funds.** When a payment is made by a User for a service provided by a Helper who has not completed KYC verification, the funds corresponding to the Helper's share (after deduction of the Platform's connection fees) are held in escrow. The Platform commits to:
- Notify the Helper by email of the existence of pending funds;
- Send regular reminders (at 7 days, 30 days, 60 days, 90 days, 120 days, and 150 days);
- Provide the Helper with all necessary means to complete their KYC verification.

8.7. **Unclaimed funds and forfeiture.** If KYC verification is not completed within **one hundred and eighty (180) days** from the first payment placed on hold, and despite the notifications provided in article 8.6, the funds shall be considered **abandoned** by the Helper. The Helper expressly acknowledges and accepts that:
- (a) Unclaimed funds within this period shall be definitively acquired by the Platform as a lump-sum indemnity for management, custody, and contact attempt costs;
- (b) This acquisition compensates for the administrative costs borne by the Platform for managing unclaimed funds;
- (c) They expressly waive any claim to these funds after the 180-day period.

8.8. **Exceptional claim.** Notwithstanding article 8.7, the Helper may submit a substantiated claim within a maximum of **twelve (12) months** following the expiration of the 180-day period, only in the following cases: documented medical incapacity, duly justified force majeure, or technical error attributable to the Platform. The Platform will review the request within 30 days and reserves the right to accept or reject the claim. If accepted, a processing fee of **twenty percent (20%)** will be deducted from the refunded amount.

8.9. **Express acceptance.** By registering on the Platform as a Helper, they declare that they have read these conditions relating to unclaimed funds and expressly accept them. This acceptance constitutes an essential and determining condition for access to provider status on the Platform.

---

## 9. Data Protection (Global Framework – GDPR/DSA)

9.1. **Roles** For User data received for Connection purposes, SOS Expat and the Helper each act as independent data controllers for their own purposes, in accordance with **Regulation (EU) 2016/679 (GDPR)**.

9.2. **Legal bases & purposes** Contract performance (Connection), legitimate interests (security, fraud prevention, improvement), legal compliance (AML, sanctions), and consent where required.

9.3. International transfers with appropriate safeguards where required (standard contractual clauses, adequacy decisions, etc.).

9.4. **Rights & contact** Exercise of rights (access, rectification, erasure, portability, objection) via the Platform's contact form.

9.5. **Security** Reasonable technical/organizational measures; breach notifications according to applicable law (72 hours under GDPR).

9.6. The Helper processes data in accordance with the law of the Country of Operation.

9.7. **DSA Compliance.** The Platform operates as an **intermediary service** within the meaning of **Regulation (EU) 2022/2065 (Digital Services Act)**. SOS Expat implements mechanisms for reporting illegal content and cooperates with competent authorities in accordance with the DSA.

---

## 10. Intellectual Property

The Platform, its trademarks, logos, databases, and content are protected. No rights are transferred to the Helper, except for a personal, non-exclusive, non-transferable right of access during the term of these Terms. Content provided by the Helper is subject to a worldwide, non-exclusive license in favor of SOS Expat for hosting and display on the Platform.

---

## 11. Warranties, Liability and Indemnity

11.1. No guarantee regarding results/quality/business volume; the Platform is provided "as is".

11.2. **Liability limitation:** to the extent permitted, SOS Expat's total liability to the Helper is limited to direct damages and shall not exceed the total Connection Fees received by SOS Expat for the transaction giving rise to the claim.

11.3. **Exclusions:** no indirect/consequential/special/punitive damages (loss of profits, opportunities, clients, reputation, replacement costs, etc.).

11.4. **Indemnification:** the Helper indemnifies and holds harmless SOS Expat (and its affiliates, officers, employees, agents) from any claim, loss, damage, penalty, and expense (including attorney fees) arising from (i) breach of these Terms/laws, (ii) their content, (iii) their services/omissions, (iv) lack of work/immigration/license authorization.

11.5. **Waiver of recourse.** The Helper **expressly and irrevocably waives** any recourse against SOS Expat for (i) damages arising from the provision of services, (ii) indirect losses, (iii) contractual disputes with Users, (iv) any failure of services provided by the Helper. This waiver applies to the maximum extent permitted by law.

11.6. No representation. Nothing herein creates agency, employment, partnership, or joint venture between SOS Expat and the Helper.

11.7. **Force majeure.** SOS Expat is not liable for delays or failures caused by **force majeure** events (natural disaster, war, pandemic, cyberattack, power or internet outage, government decision, strike, etc.).

11.8. Survival. Articles 5, 7, 8, 9, 10, 11, 12, and 13 survive termination.

---

## 12. Governing law – Arbitration – Estonian jurisdiction – Class action waiver

12.1. **Substantive law:** for each Connection, the SOS Expat–Helper relationship is governed by the **laws of the Country of Operation**, subject to local public policy and mandatory international norms. Supplementarily, and for interpretation/validity of these Terms as well as any issue not governed by the law of the Country of Operation, Estonian law applies.

12.2. **Mandatory ICC arbitration:** any dispute between SOS Expat and the Helper shall be finally resolved under the ICC Arbitration Rules. Seat: Tallinn (Estonia). Language: French. The tribunal shall apply the substantive law defined in art. 12.1. Proceedings are confidential.

12.3. **Class action waiver:** to the extent permitted, any collective/group/representative action is excluded; individual claims only are allowed.

12.4. **Exclusive jurisdiction of Estonian courts:** for any non-arbitrable matters, enforcement of awards, or urgent measures, Estonian courts (competent in Tallinn) have exclusive jurisdiction. The Helper waives any objection of forum or non-convenience.

12.5. **Pre-arbitration mediation.** Before any arbitration, the parties agree to attempt to resolve the dispute amicably through **good faith negotiation** for a period of **thirty (30) days** from written notice of the dispute.

---

## 13. International Protection Clauses

13.1. **Anti-corruption.** The Helper agrees not to offer, promise, or pay bribes or undue benefits to public or private officials. The Helper complies with applicable anti-corruption laws (FCPA, UK Bribery Act, Sapin II Act, etc.).

13.2. **Confidentiality of communications.** Communications made through the Platform (messages, calls, videos) are **confidential**. The Helper shall not record, disclose, or use them for purposes other than the agreed service, except with written authorization or legal obligation.

13.3. **Non-solicitation.** During the term of these Terms and **twelve (12) months** after termination, the Helper shall not directly solicit Users met through the Platform to avoid Connection Fees.

13.4. **Exclusive responsibility of the Helper.** The Helper is **solely responsible** for the quality, accuracy, and legality of the services provided. SOS Expat **does not guarantee** the advice, information, or services delivered by the Helper and **disclaims any liability** for any harm suffered by a User due to the Helper's services.

13.5. **No advisory relationship.** SOS Expat is **not a consulting firm**, nor a provider of legal, tax, medical, or regulated services. The Platform is limited to **connection services**. Any advisory relationship is established **exclusively** between the Helper and the User, **outside** of SOS Expat.

13.6. **Helper-User disputes.** Any dispute between a Helper and a User falls **exclusively** within their direct relationship. SOS Expat **does not intervene** in such disputes and **cannot be held liable** as a party, guarantor, or mediator.

---

## 14. Miscellaneous

14.1. **Assignment**: SOS Expat may assign these Terms to an affiliate or successor; the Helper may not assign without SOS Expat's written consent.

14.2. **Entire Agreement**: These Terms constitute the entire agreement and supersede all prior agreements relating to the same subject matter.

14.3. **Notices**: By publication on the Platform, in-app notification, or via the contact form.

14.4. **Interpretation**: Headings are for convenience only. No **contra proferentem** rule applies.

14.5. **Languages**: Translations may be provided; French prevails for interpretation.

14.6. **Severability**: If any provision is invalid/unenforceable, the remainder remains effective; it may be replaced by a valid provision of equivalent effect where possible.

14.7. **No waiver**: Failure to exercise a right does not constitute waiver thereof.

---

## 15. Contact

For any question or legal request, please contact us:
`;

  const defaultRu = `
# Общие условия использования – Эмигранты-помощники (Global)

**SOS Expat d'WorldExpat OÜ** (далее « **Платформа** », « **SOS** », « **мы** »)

**Версия 2.2 – Последнее обновление: 16 июня 2025 года**

---

## 1. Определения

**Эмигрант-помощник** (« **Помощник** »): любое лицо, зарегистрированное на Платформе для предоставления на независимой основе услуг непрофессиональной юридической и медицинской помощи Пользователям (ориентация, практическая поддержка, сопровождение, неформальный перевод, локальные контакты и т.д.).

**Пользователь**: любое лицо, использующее Платформу для связи с Помощником.

**Связь**: техническое/операционное соединение, осуществляемое Платформой между Пользователем и Помощником (передача контактных данных и/или открытие канала связи и/или согласие Помощника на запрос, сделанный через Платформу).

**Страна деятельности**: юрисдикция, преимущественно затрагиваемая запросом Пользователя в момент Связи; в противном случае – страна проживания Пользователя на дату запроса.

**Плата за Связь**: фиксированная плата, подлежащая уплате SOS за Связь (ст. 7): **19 €**, если оплата в **EUR**, или **25 $ USD**, если оплата в **USD**, с возможной корректировкой и/или **локальными тарифами** по странам/валютам с перспективным действием.

**Поставщик(и) платежей**: сторонние сервисы, обрабатывающие платежи и распределение средств.

---

## 2. Цель, сфера применения и принятие

2.1. Настоящие ОУС регулируют доступ и использование Платформы Помощниками.

2.2. **SOS Expat действует исключительно как технический посредник по Связи.** SOS Expat не является работодателем, агентом или партнером Помощников, не предоставляет юридические, медицинские, налоговые, бухгалтерские или регулируемые консультации и не является стороной контрактов между Помощниками и Пользователями.

2.3. **Электронное согласие (click-wrap).** Регистрация и/или использование Платформы означает принятие ОУС, электронную подпись и контрактное согласие. SOS может сохранять технические доказательства (отметки времени, идентификаторы).

2.4. **Изменения.** SOS может обновлять ОУС и/или тарифы (по странам/валютам) с **перспективным действием**, публикуя их на Платформе. Продолжение использования означает согласие.

2.5. **Профессиональная компетенция (B2B).** Помощник заявляет, что действует **исключительно в профессиональных целях**; нормы защиты потребителей не применяются к отношениям SOS Expat–Помощник.

---

## 3. Статус Помощника – Соответствие, разрешения и ответственность

3.1. **Независимость.** Помощник действует как **независимый профессионал**; никакая связь трудовых отношений, агентства, партнерства или совместного предприятия с SOS Expat не создается.

3.2. **Разрешение на работу и иммиграционный статус.** Помощник **сам несет ответственность** за получение и поддержание **всех необходимых разрешений** в каждой Стране деятельности (визы, разрешения на работу, регистрация деятельности/самозанятость, страховки, местные лицензии и т.д.). SOS Expat **не проверяет** эти разрешения и **не несет никакой ответственности** в этом отношении.

3.3. **Нерегулируемые услуги.** Помощник обязуется **не предоставлять регулируемые услуги** (например, юридические, медицинские, финансовые, бухгалтерские, риелторские и т.д.) **без наличия соответствующих лицензий** и **без полного соблюдения местного законодательства**. В противном случае он воздерживается от таких услуг и направляет Пользователя к квалифицированному специалисту (например, зарегистрированному адвокату).

3.4. **Общее соответствие.** Помощник соблюдает применимые законы/регламенты (потребление, электронная коммерция, реклама/продажи, честная конкуренция, AML/KYC при необходимости, налогообложение, защита данных, санкции/экспорт, безопасность людей).

3.5. **Страхование.** Помощник заявляет, что имеет необходимые страховки (например, профессиональная ответственность), охватывающие его деятельность и территории работы.

3.6. **Конфиденциальность.** Помощник защищает информацию Пользователей и воздерживается от ее раскрытия, за исключением случаев, предусмотренных законом или с согласия.

---

## 4. Аккаунт, проверки и безопасность

4.1. **Регистрация.** Один (1) аккаунт на Помощника; точная, полная и актуальная информация (личность, контактные данные, описание услуг, зоны работы и т.д.).

4.2. **Проверки.** SOS Expat может проводить разумные проверки (идентификация, согласованность профиля, проверки санкций/KYC через Поставщиков) и отказать/приостановить/удалить доступ по причинам безопасности, соответствия или качества обслуживания.

4.3. **Безопасность доступа.** Помощник защищает свои идентификаторы. Любая деятельность через аккаунт считается выполненной им самим.

4.4. **Неактивность и расторжение.** После **365 дней неактивности** аккаунт может быть автоматически деактивирован после уведомления. Помощник может закрыть свой аккаунт в любое время после выполнения своих текущих обязательств. SOS Expat может приостановить или расторгнуть аккаунт за нарушение Условий, без ущерба для других средств правовой защиты.

4.5. **Электронные сообщения.** Помощник соглашается получать любые уведомления, связанные с Условиями, электронными средствами (электронная почта, уведомление в приложении, публикация на Платформе).

---

## 5. Правила использования – Качество, запреты, обход

5.1. **Качество и точное описание.** Помощник описывает свои услуги точно, без обещания результата. Он не заявляет **о недостоверных квалификациях** (например, несуществующая регулируемая профессия).

5.2. **Запреты.** Незаконный, дискриминационный или вводящий в заблуждение контент; недобросовестные практики; сбор или злоупотребление данными; обход/обратная разработка Платформы; сговор/бойкот с целью вреда; нарушение санкций/экспорта; любая незаконная деятельность.

5.3. **Необходность обращения через Платформу.** Каждая **новая Связь** с **новым Пользователем** через Платформу подлежит **Плате за Связь** (ст. 7). **Запрещается** избегать этой платы, обходя Платформу для нового контакта.

5.4. **Доступность.** Платформа предоставляется **«как есть»**; непрерывная доступность не гарантируется (техническое обслуживание, инциденты, форс-мажор). Доступ может быть ограничен, если это требует закон.

---

## 6. Отношения Помощник–Пользователь (вне Платформы)

6.1. После Связи Помощник и Пользователь могут заключать договор **вне Платформы**. **Гонорары** и условия устанавливаются ими самостоятельно, с соблюдением местного законодательства.

6.2. Помощник предоставляет **условия/подтверждения услуг**, соответствующие местному праву, ведет **счет-фактуру** и выполняет **налоговые обязательства**.

6.3. SOS Expat **не несет ответственности** за качество, точность или результат услуг Помощника, а также за обязательства между Помощником и Пользователем.

---

## 7. Плата, единоразовая оплата и налоги

7.1. **Плата за Связь (фиксированная).** **19 € (EUR)** **или** **25 $ (USD)** **за Связь**, без учета налогов и комиссии Поставщика платежей. SOS Expat может изменять эти суммы и/или публиковать **локальные тарифы** по странам/валютам с перспективным действием.

7.2. **Единоразовая оплата и распределение.** Пользователь осуществляет **единый платеж** через Платформу, включающий (i) **вознаграждение Помощника** (согласованное) и (ii) **Плату за Связь** SOS Expat. SOS Expat (или его Поставщик) получает платеж, **вычитает** свои комиссии, а оставшееся **переводит Помощнику**. Помощник **согласен** с этими вычетами и распределением.

7.3. **Сроки и невозвратность.** Плата за Связь **должна быть уплачена сразу** при Связи и **не подлежит возврату** (за исключением дискреционных действий SOS Expat в случае неудачи, полностью связанной с Платформой и **в пределах, разрешенных законом**).

7.4. **Возвраты Пользователю.** Если возврат предоставляется Пользователю, он **считается вычетом из доли Помощника**: SOS Expat может **удерживать/компенсировать** сумму с будущих выплат или требовать возврат, если будущих выплат нет. **Возврат Платы за Связь не предусмотрен**, кроме как по дискреционному решению SOS Expat.

7.5. **Валюты и конвертация.** Возможны различные валюты; могут применяться курсы/комиссии Поставщика.

7.6. **Налоги.** Помощник остается ответственным за **все применимые налоги** (НДС, подоходный налог, социальное страхование и т.д.). SOS Expat собирает/перечисляет, если требуется, НДС/местный эквивалент с Платы за Связь.

7.7. **Компенсация.** SOS Expat может компенсировать любую сумму, подлежащую Помощником, с любой суммы, подлежащей выплате Помощнику.

---

## 8. Персональные данные (глобальные рамки – GDPR/DSA)

8.1. **Роли.** Для данных Пользователей, полученных для Связи, **SOS Expat и Помощник** действуют **каждый** как **контролер обработки** для своих целей, в соответствии с **Регламентом (ЕС) 2016/679 (GDPR)**.

8.2. **Основания и цели.** Исполнение договора (Связь), законные интересы (безопасность, предотвращение мошенничества, улучшение), юридическое соответствие (AML/KYC, санкции), согласие, когда требуется.

8.3. **Международные передачи** с **соответствующими гарантиями**, если требуется.

8.4. **Права и контакт.** Осуществляются через **контактную форму** на Платформе.

8.5. **Безопасность.** Разумные технические и организационные меры; уведомление о нарушениях в соответствии с применимым законодательством.

8.6. Помощник обрабатывает данные в соответствии с законодательством **Страны деятельности**.

8.7. **Соответствие DSA.** Платформа функционирует как **посреднический сервис** в понимании **Регламента (ЕС) 2022/2065 (Закон о цифровых услугах)**. SOS Expat внедряет механизмы для сообщения о незаконном контенте и сотрудничает с компетентными органами в соответствии с DSA.

---

## 9. Интеллектуальная собственность

Платформа, её бренды, логотипы, базы данных и контент защищены. Помощнику не передаются права, кроме **личного, неисключительного, непередаваемого** права на доступ на срок действия ОУС. Контент, предоставленный Помощником, лицензируется **всемирно, неисключительно** в пользу SOS Expat для размещения и отображения на Платформе.

---

## 10. Гарантии, ответственность и возмещение

10.1. **Нет гарантии** по результатам/качеству/объему бизнеса; Платформа предоставляется **«как есть»**.

10.2. **Ограничение ответственности**: в пределах разрешенного законом, общая ответственность SOS Expat перед Помощником ограничивается **прямым ущербом** и **не может превышать** сумму **Платы за Связь**, полученной SOS Expat по **транзакции**, послужившей причиной претензии.

10.3. **Исключения**: никакой косвенный/последующий/специальный/штрафной ущерб (потеря прибыли, возможностей, клиентов, репутации, расходы на замену и т.д.).

10.4. **Возмещение**: Помощник **возмещает и гарантирует** SOS Expat (а также его аффилированным лицам, руководителям, сотрудникам, агентам) против любых претензий, потерь, ущерба, штрафов и расходов (включая адвокатские гонорары), связанных с (i) его нарушением ОУС/законов, (ii) его контентом, (iii) его услугами/упущениями, (iv) отсутствием разрешений на работу/иммиграцию/лицензий.

10.5. **Отказ от регресса.** Помощник **прямо и безотзывно отказывается** от любого регресса против SOS Expat за (i) ущерб, возникший в результате оказания услуг, (ii) косвенные убытки, (iii) договорные споры с Пользователями, (iv) любые недостатки услуг, оказанных Помощником. Этот отказ применяется в максимальной степени, разрешенной законом.

10.6. **Нет представительства.** Ничто не создает мандат, трудовые отношения, партнерство или совместное предприятие между SOS Expat и Помощником.

10.7. **Форс-мажор.** SOS Expat не несет ответственности за задержки или сбои, вызванные **форс-мажорными обстоятельствами** (стихийное бедствие, война, пандемия, кибератака, отключение электроэнергии или интернета, решение правительства, забастовка и т.д.).

10.8. **Сохранение.** Ст. 5, 7, 8, 9, 10, 11 и 12 сохраняются после прекращения действия.

---

## 11. Применимое право – Арбитраж – Эстонская юрисдикция – Коллективные иски

11.1. **Материальное право**: для каждой Связи отношения **SOS Expat–Помощник** регулируются **законами Страны деятельности**, с учетом местного публичного порядка и обязательных международных норм. **В качестве дополняющего права и для толкования/действительности настоящих ОУС, а также для вопросов, не регулируемых правом Страны деятельности, применяется право Эстонии.**

11.2. **Обязательный арбитраж ICC**: любые споры между SOS Expat и Помощником решаются **окончательно** в соответствии с Регламентом арбитража **ICC**. **Место: Таллинн (Эстония)**. **Язык: французский.** Суд применяет **материальное право**, указанное в ст. 11.1. Процедура **конфиденциальная**.

11.3. **Отказ от коллективных исков**: в пределах разрешенного законом любые коллективные/групповые/представительные иски исключены; только **индивидуальные претензии**.

11.4. **Исключительная юрисдикция судов Эстонии**: для любых требований **не подлежащих арбитражу**, исполнения решений или срочных мер, эстонские суды (компетентные в Таллине) имеют **исключительную** юрисдикцию. Помощник отказывается от любых возражений о неподходящем форуме.

---

## 12. Разное

12.1. **Передача.** SOS Expat может передать ОУС любой компании своей группы или правопреемнику; Помощник не может передавать без письменного согласия SOS Expat.

12.2. **Полнота.** ОУС составляют полное соглашение и заменяют все предыдущие соглашения по тому же объекту.

12.3. **Уведомления.** Через публикацию на Платформе, уведомление в приложении или через **контактную форму**.

12.4. **Толкование.** Заголовки справочные. Нет правила **contra proferentem**.

12.5. **Языки.** Могут предоставляться переводы; **французский язык имеет преимущественную силу** при толковании.

12.6. **Частичная недействительность.** Если положение недействительно/неприменимо, остальное остается в силе; может быть заменено действительным положением с аналогичным эффектом, если возможно.

12.7. **Неотказ от прав.** Неприменение права не означает отказ от него.

---

## 13. Контакт

Для любых вопросов или юридических запросов свяжитесь с нами:
`;
  const defaultHi = `
# सामान्य उपयोग शर्तें – Expatriates Aidants (वैश्विक)

**SOS Expat by WorldExpat OÜ** (यहाँ “**प्लेटफ़ॉर्म**”, “**SOS**”, “**हम**” के रूप में संदर्भित है)

**संस्करण 2.2 – अंतिम अद्यतन: 16 जून 2025**

---

## 1. परिभाषाएँ

**Expatrié Aidant** (“**Aidant**”): प्लेटफ़ॉर्म पर पंजीकृत कोई भी व्यक्ति जो स्वतंत्र रूप से **गैर-कानूनी और गैर-चिकित्सीय समर्थन सेवाएँ** प्रदान करता है (जैसे मार्गदर्शन, व्यावहारिक सहायता, साथ चलना, अनौपचारिक अनुवाद, स्थानीय नेटवर्क आदि)।

**उपयोगकर्ता**: कोई भी व्यक्ति जो Aidant से संपर्क करने के लिए प्लेटफ़ॉर्म का उपयोग करता है।

**नेटवर्किंग / मिलान**: प्लेटफ़ॉर्म द्वारा उपयोगकर्ता और Aidant के बीच तकनीकी/संचालन परिचय (संपर्क विवरण साझा करना, संचार चैनल खोलना, या प्लेटफ़ॉर्म के माध्यम से अनुरोध को स्वीकार करना)।

**स्थान/देश**: वह कानूनी क्षेत्र जिस पर उपयोगकर्ता का अनुरोध नेटवर्किंग के समय मुख्य रूप से आधारित है; यदि निर्दिष्ट नहीं है, तो अनुरोध के समय उपयोगकर्ता का निवास देश मान्य होगा।

**नेटवर्किंग शुल्क**: प्लेटफ़ॉर्म द्वारा प्रत्येक नेटवर्किंग पर SOS को देय निश्चित शुल्क (धारा 7): **19 €** (EUR) या **25 $ USD**, स्थानीय मुद्रा/देश के अनुसार बदलाव संभव।

**भुगतान सेवा प्रदाता**: तृतीय पक्ष जो भुगतान प्रबंधित करता है और धन वितरित करता है।

---

## 2. उद्देश्य, क्षेत्र और सहमति

2.1. ये शर्तें Aidants द्वारा प्लेटफ़ॉर्म तक पहुँच और उपयोग को नियंत्रित करती हैं।

2.2. **SOS Expat केवल तकनीकी मध्यस्थ के रूप में कार्य करता है।** SOS Expat न तो Aidants का नियोक्ता है, न प्रतिनिधि या साझेदार, न कानूनी/चिकित्सीय/कर/लेखांकन सेवाएं प्रदान करता है और न ही Aidant और उपयोगकर्ता के बीच किसी अनुबंध का पक्ष है।

2.3. **इलेक्ट्रॉनिक सहमति (Click-wrap)।** पंजीकरण या प्लेटफ़ॉर्म का उपयोग शर्तों की स्वीकृति के रूप में माना जाएगा। SOS तकनीकी प्रमाण (समय-स्टैम्प, ID) रख सकता है।

2.4. **परिवर्तन।** SOS भविष्य में प्रभावी रूप से शर्तें और शुल्क अद्यतन कर सकता है। प्लेटफ़ॉर्म का उपयोग जारी रखना स्वीकृति माना जाएगा।

2.5. **पेशेवर क्षमता (B2B)।** Aidant घोषित करता है कि वह **केवल पेशेवर रूप से** कार्य कर रहा है; उपभोक्ता संरक्षण नियम लागू नहीं होंगे।

---

## 3. Aidant की स्थिति – अनुपालन, अनुमतियाँ और जिम्मेदारी

3.1. **स्वतंत्रता।** Aidant **स्वतंत्र पेशेवर** के रूप में कार्य करता है; SOS Expat के साथ कोई रोजगार, एजेंसी, साझेदारी या जॉइंट वेंचर संबंध नहीं बनता।

3.2. **कार्य अनुमति और प्रवास स्थिति।** Aidant स्वयं जिम्मेदार है कि वह हर देश में आवश्यक अनुमतियाँ प्राप्त और बनाए रखे (वीज़ा, कार्य अनुमति, व्यवसाय पंजीकरण, बीमा, स्थानीय लाइसेंस)। SOS Expat इन अनुमतियों की जांच नहीं करता।

3.3. **गैर-नियंत्रित सेवाएँ।** Aidant बिना उचित लाइसेंस के किसी भी नियंत्रित सेवा (कानूनी, चिकित्सा, वित्त, कर आदि) प्रदान नहीं करेगा।

3.4. **सामान्य अनुपालन।** Aidant सभी लागू कानूनों/नियमों का पालन करेगा (उपभोक्ता संरक्षण, ई-कॉमर्स, विज्ञापन, प्रतिस्पर्धा, AML/KYC, कर, डेटा सुरक्षा, सुरक्षा, प्रतिबंध आदि)।

3.5. **बीमा।** Aidant पुष्टि करता है कि उसने अपनी गतिविधियों के लिए आवश्यक बीमा (व्यावसायिक जिम्मेदारी) कर रखा है।

3.6. **गोपनीयता।** Aidant उपयोगकर्ता डेटा सुरक्षित रखेगा और केवल कानूनी आवश्यकता या सहमति पर साझा करेगा।

---

## 4. खाता, सत्यापन और सुरक्षा

4.1. **पंजीकरण।** प्रत्येक Aidant का केवल एक खाता होगा; सभी विवरण सटीक और अद्यतन होंगे।

4.2. **सत्यापन।** SOS Expat सुरक्षा, अनुपालन या गुणवत्ता कारणों से पहुँच अस्वीकृत, निलंबित या हटाने का अधिकार रखता है।

4.3. **सुरक्षा।** खाता गतिविधि को Aidant की ओर से किया गया माना जाएगा।

4.4. **निष्क्रियता।** 365 दिनों की निष्क्रियता के बाद, खाता स्वचालित रूप से निष्क्रिय किया जा सकता है। Aidant अपने दायित्वों को पूरा करने के बाद किसी भी समय अपना खाता बंद कर सकता है। SOS Expat शर्तों के उल्लंघन के लिए खाता निलंबित या समाप्त कर सकता है।

4.5. **इलेक्ट्रॉनिक संचार।** Aidant इलेक्ट्रॉनिक माध्यमों (ईमेल, इन-ऐप अधिसूचनाएँ, प्लेटफ़ॉर्म पर प्रकाशन) के माध्यम से अधिसूचनाएँ प्राप्त करने की सहमति देता है।

---

## 5. उपयोग नियम – गुणवत्ता, निषेध और नेटवर्किंग शुल्क

5.1. **गुणवत्ता और विवरण।** Aidant अपनी सेवाओं का सही विवरण देगा; कोई गलत दावा नहीं।

5.2. **निषेध।** अवैध, भेदभावपूर्ण या भ्रामक सामग्री; डेटा का दुरुपयोग; प्लेटफ़ॉर्म की अनधिकृत पहुँच; सांठगांठ या प्रतिबंध; अवैध गतिविधियाँ।

5.3. **नेटवर्किंग शुल्क अवरोध।** प्रत्येक नई नेटवर्किंग पर **नेटवर्किंग शुल्क लागू** होगा।

5.4. **उपलब्धता।** प्लेटफ़ॉर्म **“जैसा है”** आधार पर उपलब्ध है; निरंतरता की कोई गारंटी नहीं।

---

## 6. Aidant–उपयोगकर्ता संबंध (प्लेटफ़ॉर्म के बाहर)

6.1. नेटवर्किंग के बाद, दोनों स्वतंत्र रूप से अनुबंध कर सकते हैं।

6.2. Aidant स्थानीय कानून के अनुसार **सेवा शर्तें और चालान** प्रबंधित करेगा।

6.3. SOS Expat **सेवा की गुणवत्ता या परिणामों के लिए जिम्मेदार नहीं** है।

---

## 7. शुल्क, एकल भुगतान और कर

7.1. **नेटवर्किंग शुल्क।** 19 € (EUR) या 25 $ (USD) प्रति नेटवर्किंग।

7.2. **एकल भुगतान और वितरण।** भुगतान प्लेटफ़ॉर्म के माध्यम से किया जाता है; SOS Expat शुल्क काटकर शेष राशि Aidant को भेजेगा।

7.3. **वापसी योग्य नहीं।** नेटवर्किंग शुल्क गैर-वापसी योग्य।

7.4. **वापसी पर काटौती।** कोई वापसी Aidant के हिस्से से की जा सकती है।

7.5. **मुद्रा और रूपांतरण।** कई मुद्राएँ संभव; सेवा प्रदाता शुल्क लागू कर सकते हैं।

7.6. **कर।** Aidant सभी लागू करों के लिए जिम्मेदार है।

7.7. **मुआवजा।** SOS Expat दावे काटकर भुगतान समायोजित कर सकता है।

---

## 8. व्यक्तिगत डेटा (वैश्विक – GDPR/DSA)

8.1. **भूमिकाएँ।** नेटवर्किंग के लिए प्राप्त उपयोगकर्ता डेटा के लिए, SOS Expat और Aidant प्रत्येक **विनियमन (EU) 2016/679 (GDPR)** के अनुसार अपने स्वयं के उद्देश्यों के लिए स्वतंत्र डेटा नियंत्रक के रूप में कार्य करते हैं।

8.2. **उद्देश्य।** नेटवर्किंग, सुरक्षा, धोखाधड़ी रोकथाम, कानूनी आवश्यकताएँ।

8.3. **अंतरराष्ट्रीय स्थानांतरण।** उचित सुरक्षा उपायों के साथ।

8.4. **अधिकार और संपर्क।** प्लेटफ़ॉर्म संपर्क फ़ॉर्म के माध्यम से।

8.5. **सुरक्षा।** उचित तकनीकी/संगठनात्मक उपाय।

8.6. Aidant डेटा का प्रसंस्करण **स्थान/देश कानून** के अनुसार करेगा।

8.7. **DSA अनुपालन।** प्लेटफ़ॉर्म **विनियमन (EU) 2022/2065 (डिजिटल सेवा अधिनियम)** के तहत एक **मध्यस्थ सेवा** के रूप में कार्य करता है। SOS Expat अवैध सामग्री की रिपोर्टिंग के लिए तंत्र लागू करता है और DSA के अनुसार सक्षम अधिकारियों के साथ सहयोग करता है।

---

## 9. बौद्धिक संपदा

प्लेटफ़ॉर्म, ट्रेडमार्क, लोगो, डेटाबेस और सामग्री सुरक्षित हैं। Aidant को केवल व्यक्तिगत, गैर-विशेष, गैर-हस्तांतरित अधिकार मिलेगा। Aidant द्वारा दी गई सामग्री SOS Expat को प्लेटफ़ॉर्म पर होस्टिंग और प्रदर्शन के लिए गैर-विशेष लाइसेंस देती है।

---

## 10. गारंटी, दायित्व और मुआवजा

10.1. परिणाम या गुणवत्ता की कोई गारंटी नहीं।

10.2. **दायित्व सीमा:** कुल दायित्व नेटवर्किंग शुल्क तक सीमित।

10.3. **बहिष्कार:** अप्रत्यक्ष, परिणामी, दंडात्मक नुकसान शामिल नहीं।

10.4. **मुआवजा:** Aidant SOS Expat को किसी भी दावे, नुकसान या कानूनी शुल्क से मुक्त रखेगा।

10.5. **पुनर्प्राप्ति का त्याग।** Aidant **स्पष्ट और अपरिवर्तनीय रूप से** SOS Expat के विरुद्ध किसी भी पुनर्प्राप्ति का त्याग करता है: (i) सेवाओं के प्रावधान से उत्पन्न क्षति, (ii) अप्रत्यक्ष हानि, (iii) उपयोगकर्ताओं के साथ संविदात्मक विवाद, (iv) Aidant द्वारा प्रदान की गई सेवाओं की कोई भी विफलता। यह त्याग कानून द्वारा अनुमत अधिकतम सीमा तक लागू होता है।

10.6. **कोई प्रतिनिधित्व नहीं।** यहाँ कुछ भी SOS Expat और Aidant के बीच एजेंसी, रोजगार, साझेदारी या संयुक्त उद्यम नहीं बनाता।

10.7. **अप्रत्याशित घटना।** SOS Expat **अप्रत्याशित घटना** के कारण होने वाली देरी या विफलताओं के लिए उत्तरदायी नहीं है (प्राकृतिक आपदा, युद्ध, महामारी, साइबर हमला, बिजली या इंटरनेट आउटेज, सरकारी निर्णय, हड़ताल, आदि)।

10.8. ये प्रावधान समाप्ति के बाद भी लागू रहेंगे।

---

## 11. लागू कानून – पंचाट – एस्टोनियाई अधिकार क्षेत्र – सामूहिक मुकदमे

11.1. **सामग्रीक कानून:** प्रत्येक नेटवर्किंग के लिए स्थान/देश का कानून लागू।

11.2. **ICC पंचाट:** सभी विवाद अंतिम रूप से ICC नियमों के अनुसार। स्थान: टालिन, एस्टोनिया; भाषा: फ्रेंच।

11.3. **सामूहिक मुकदमे का त्याग।**

11.4. **एस्टोनियाई अदालती अधिकार।**

---

## 12. विविध

12.1. **हस्तांतरण।** SOS Expat अधिकारों का हस्तांतरण कर सकता है।

12.2. **पूर्ण समझौता।**

12.3. **सूचनाएँ।** प्लेटफ़ॉर्म पर प्रकाशन या संपर्क फ़ॉर्म द्वारा।

12.4. **व्याख्या।**

12.5. **भाषाएँ।** फ्रेंच मूल है।

12.6. **आंशिक अमान्यता।**

12.7. **अस्वीकृति नहीं।**

---

## 13. संपर्क

सवाल या कानूनी मुद्दों के लिए हमसे संपर्क करें:
`;

  const defaultEs = `
# Términos de Uso – Ayudantes de Expatriados (Global)


**SOS Expat por WorldExpat OÜ** (la "**Plataforma**", "**SOS**", "**nosotros**")


**Versión 2.2 – Última actualización: 16 de junio de 2025**


---


## 1. Definiciones


**Ayudante** significa cualquier persona registrada en la Plataforma para ofrecer, de forma independiente, servicios de asistencia no legal y no médica a los Usuarios (orientación, trámites prácticos, traducción informal, introducciones locales, etc.).


**Usuario** significa cualquier persona que utiliza la Plataforma para contactar con un Ayudante.


**Conexión** significa la introducción técnica/operacional que permite contacto (compartir detalles y/o iniciar llamada/mensaje/vídeo y/o aceptación por parte del Ayudante).


**País de Intervención** significa la jurisdicción principalmente dirigida por la solicitud del Usuario en el momento de la Conexión.


**Tarifa de Conexión** significa **EUR 19** (si se paga en EUR) o **USD 25** (si se paga en USD), sujeta a cambios y/o **horarios locales** por país/moneda con efecto prospectivo.


**Procesadores de Pago** son servicios de terceros que manejan recaudaciones y pagos.


---


## 2. Propósito, Alcance y Aceptación

2.1. Las presentes CGU regulan el acceso y el uso de la Plataforma por parte de los Asistentes.

2.2. **SOS Expat actúa exclusivamente como intermediario técnico de la puesta en contacto** SOS Expat no es empleador, mandatario ni socio de los Asistentes, no proporciona ningún tipo de asesoramiento jurídico, médico, fiscal, contable ni de otra índole regulada, y no forma parte de los contratos entre Asistentes y Usuarios.

2.3. **Aceptación electrónica (click-wrap)** El registro y/o el uso de la Plataforma constituyen la aceptación de las CGU, la firma electrónica y el consentimiento contractual. SOS puede conservar pruebas técnicas (marca de tiempo, identificadores).

2.4. **Modificaciones** SOS puede actualizar las CGU y/o las tablas de tarifas (por país/divisa) con efecto prospectivo mediante su publicación en la Plataforma. El uso continuado implica aceptación.

2.5. **Capacidad profesional (B2B)** El Asistente declara actuar exclusivamente con fines profesionales; los regímenes de protección al consumidor no se aplican a la relación entre SOS Expat y el Asistente.


---


## 3. Estado del Ayudante – Cumplimiento, Autorizaciones y Responsabilidades


3.1. **Independencia** El Asistente actúa como profesional independiente; no se crea ningún vínculo de empleo, mandato, agencia, asociación o empresa conjunta con SOS Expat.

3.2. **Autorización de trabajo y estatus migratorio** El Asistente es únicamente responsable de obtener y mantener todas las autorizaciones necesarias en cada País de Intervención (visado, permiso de trabajo, registro de actividad/autónomo, seguros, licencias locales, etc.). SOS Expat no verifica dichas autorizaciones y no asume ninguna responsabilidad al respecto.

3.3. **Servicios no regulados** El Asistente se compromete a no prestar servicios regulados (por ejemplo, asesoramiento jurídico, médico, financiero, contable o inmobiliario, etc.) sin poseer las autorizaciones/licencias necesarias y sin cumplir plenamente con las leyes locales. En caso contrario, deberá abstenerse de ofrecer dichos servicios y redirigir al Usuario hacia un profesional debidamente autorizado (por ejemplo, un abogado colegiado).

3.4. **Cumplimiento general** El Asistente debe respetar todas las leyes y reglamentos aplicables (consumo, comercio electrónico, publicidad/promoción, competencia leal, LCB-FT/KYC cuando proceda, fiscalidad, protección de datos, sanciones/exportaciones, seguridad de las personas).

3.5. **Seguros** El Asistente declara contar con los seguros necesarios (responsabilidad civil profesional, cuando corresponda) que cubran sus actividades y territorios de intervención.

3.6. **Confidencialidad** El Asistente debe proteger la información de los Usuarios y abstenerse de divulgarla, salvo obligación legal o consentimiento expreso.

---


## 4. Cuenta, Verificaciones y Seguridad

4.1. **Registro** Un (1) cuenta por Asistente; la información debe ser exacta, completa y actualizada (identidad, medios de contacto, descripción de los servicios, zonas de intervención, etc.).

4.2. **Verificaciones** SOS Expat puede realizar controles razonables (identidad, coherencia del perfil, revisiones de sanciones/KYC a través de Proveedores) y puede rechazar, suspender o retirar el acceso por motivos de seguridad, cumplimiento o calidad del servicio.

4.3. **Seguridad de acceso** El Asistente debe proteger sus credenciales. Toda actividad realizada a través de la cuenta se considerará efectuada por él mismo.

4.4. **Inactividad y rescisión.** Tras **365 días de inactividad**, la cuenta podrá ser desactivada automáticamente previo aviso. El Asistente puede cerrar su cuenta en cualquier momento una vez cumplidas sus obligaciones pendientes. SOS Expat puede suspender o rescindir una cuenta por incumplimiento de los Términos, sin perjuicio de otros recursos.

4.5. **Comunicaciones electrónicas.** El Asistente consiente en recibir cualquier notificación relacionada con los Términos por medios electrónicos (correo electrónico, notificación in-app, publicación en la Plataforma).

---


## 5. Reglas de Uso – Calidad, Conducta Prohibida, Sin Evasión

5.1. **Calidad y descripción fiel** El Asistente debe describir sus servicios de manera precisa, sin prometer resultados. No debe presentarse con **cualificaciones falsas** (por ejemplo, profesiones reguladas que no posea).

5.2. **Prohibiciones** Contenidos ilícitos, discriminatorios o engañosos; prácticas desleales; recopilación o uso indebido de datos; elusión o ingeniería inversa de la Plataforma; colusión o boicot con el fin de perjudicar; infracción de sanciones o normas de exportación; y cualquier otra actividad ilegal.

5.3. **Prohibición de elusión** Cada **nuevo contacto** con un **nuevo Usuario** a través de la Plataforma da lugar al cobro de los **Gastos de Puesta en Contacto** (art. 7). Está **prohibido** evitar estos gastos eludiendo la Plataforma para realizar una nueva introducción.

5.4. **Disponibilidad** La Plataforma se proporciona **“tal cual”**; no se garantiza su disponibilidad ininterrumpida (mantenimiento, incidentes, fuerza mayor). El acceso puede restringirse si así lo exige la ley.

---


## 6. Relación Ayudante–Usuario (Fuera de la Plataforma)


6.1. **Tras la puesta en contacto,** el Asistente y el Usuario pueden formalizar un contrato **fuera de la Plataforma.** Los **honorarios** y las condiciones se establecen libremente entre ellos, respetando las leyes locales.

6.2. El Asistente debe proporcionar **condiciones o confirmaciones de servicio** conformes con la legislación local, gestionar su **facturación** y cumplir con sus **obligaciones fiscales.**

6.3. **SOS Expat no es responsable** de la calidad, exactitud o resultado de los servicios del Asistente, ni de los compromisos asumidos entre el Asistente y el Usuario.

---


## 7. Tarifas, Pago Único e Impuestos


7.1. **Gastos de Puesta en Contacto (tarifa fija).** **19 € (EUR)** o **25 $ (USD)** por cada Puesta en Contacto, sin incluir impuestos ni las comisiones del Proveedor de pagos. SOS Expat puede modificar estos importes y/o publicar **tarifas locales** por país o moneda, con **efecto prospectivo.**

7.2. **Pago único y distribución.** El Usuario realiza **un solo pago** a través de la Plataforma que cubre (i) la **remuneración del Asistente** (según lo acordado) y (ii) los **Gastos de Puesta en Contacto** de SOS Expat. SOS Expat (o su Proveedor) recibe el pago, **deduce** sus comisiones y luego **transfiere** el saldo al Asistente. El Asistente **autoriza** dichas deducciones y distribuciones.

7.3. **Exigibilidad y no reembolso.** Los Gastos de Puesta en Contacto son **exigibles desde** el momento de la Puesta en Contacto y **no son reembolsables** (salvo por decisión comercial discrecional de SOS Expat en caso de fallo exclusivamente atribuible a la Plataforma y **dentro de los límites permitidos por la ley**).

7.4. **Reembolsos al Usuario.** Si se concede un reembolso al Usuario, este se **deducirá de la parte correspondiente al Asistente**: SOS Expat podrá **retener o compensar** dicho importe con futuros pagos al Asistente, o **reclamar su devolución** si no hay pagos pendientes. **No se reembolsarán** los Gastos de Puesta en Contacto, salvo decisión discrecional de SOS Expat.

7.5. **Monedas y conversión.** Pueden ofrecerse varias monedas; se pueden aplicar tasas o comisiones de conversión del Proveedor de pagos.

7.6. **Impuestos.** El Asistente sigue siendo responsable de **todos los impuestos aplicables** (IVA, impuesto sobre la renta, seguridad social, etc.). SOS Expat recaudará y/o remitirá, cuando sea necesario, el IVA o su **equivalente local** correspondiente a los Gastos de Puesta en Contacto.

7.7. **Compensación.** SOS Expat podrá compensar cualquier suma debida por el Asistente con cualquier suma pagadera al mismo.

---


## 8. Protección de Datos (Marco Global – RGPD/DSA)

8.1. **Funciones.** Con respecto a los datos de los Usuarios recibidos con el fin de la Puesta en Contacto, **SOS Expat y el Asistente** actúan **cada uno** como **responsable del tratamiento** para sus propias finalidades, de conformidad con el **Reglamento (UE) 2016/679 (RGPD)**.

8.2. **Bases y finalidades.** Ejecución del contrato (Puesta en Contacto), intereses legítimos (seguridad, prevención del fraude, mejora del servicio), cumplimiento legal (LCB-FT, sanciones) y consentimiento cuando sea requerido.

8.3. **Transferencias internacionales** con **garantías adecuadas** cuando sea necesario.

8.4. **Derechos y contacto.** El ejercicio de derechos se realiza a través del **formulario de contacto** disponible en la Plataforma.

8.5. **Seguridad.** Se aplican medidas técnicas y organizativas razonables; las violaciones de datos se notificarán conforme a la legislación aplicable.

8.6. El Asistente tratará los datos de acuerdo con la legislación del **País de Intervención.**

8.7. **Conformidad con la DSA.** La Plataforma opera como **servicio intermediario** en el sentido del **Reglamento (UE) 2022/2065 (Ley de Servicios Digitales)**. SOS Expat implementa mecanismos para la notificación de contenidos ilícitos y coopera con las autoridades competentes de conformidad con la DSA.

---


## 9. Propiedad Intelectual


La **Plataforma**, sus **marcas, logotipos, bases de datos y contenidos** están protegidos. **Ningún derecho** se cede al Asistente, salvo un derecho **personal, no exclusivo y no transferible** de acceso durante la vigencia de los Términos y Condiciones. Los **contenidos proporcionados por el Asistente** están sujetos a una **licencia mundial, no exclusiva** a favor de SOS Expat para su **alojamiento y exhibición en la Plataforma**.

---


## 10. Garantías, Responsabilidad e Indemnización

10.1. Ninguna garantía sobre resultados, calidad o volumen de negocio; la Plataforma se proporciona "**tal cual**".

10.2. Limitación de responsabilidad:** en la medida permitida, la responsabilidad total de SOS Expat frente al Asistente se limita a los **daños directos** y no puede exceder el total de los **Gastos de Conexión** percibidos por SOS Expat por la transacción que dio origen a la reclamación.

10.3. Exclusiones:** no se cubren daños **indirectos, consecuentes, especiales o punitivos** (pérdida de beneficios, oportunidades, clientela, daño a la reputación, costes de reemplazo, etc.).

10.4. Indemnización:** el Asistente **indemniza y garantiza** a SOS Expat (así como a sus afiliados, directivos, empleados y agentes) frente a cualquier reclamación, pérdida, daño, penalidad y gastos (incluidos honorarios de abogados) relacionados con: (i) su incumplimiento de los Términos y Condiciones o de la ley,(ii) sus contenidos,(iii) sus servicios u omisiones, (iv) la falta de autorizaciones de trabajo, inmigración o licencias.

10.5. **Renuncia a recursos.** El Asistente **renuncia expresa e irrevocablemente** a cualquier recurso contra SOS Expat por (i) daños derivados de la prestación de servicios, (ii) pérdidas indirectas, (iii) disputas contractuales con los Usuarios, (iv) cualquier fallo de los servicios prestados por el Asistente. Esta renuncia se aplica en la máxima medida permitida por la ley.

10.6. Ninguna representación:** nada implica mandato, empleo, asociación, sociedad o empresa conjunta entre SOS Expat y el Asistente.

10.7. **Fuerza mayor.** SOS Expat no será responsable de retrasos o fallos causados por eventos de **fuerza mayor** (catástrofe natural, guerra, pandemia, ciberataque, corte de electricidad o internet, decisión gubernamental, huelga, etc.).

10.8. Vigencia tras la terminación:** los arts. 5, 7, 8, 9, 10, 11 y 12 **sobreviven a la terminación**.

---


## 11. Ley Aplicable – Arbitraje – Tribunales Estonios – Acciones Colectivas

11.1. **Derecho sustantivo:** para cada Conexión, la relación SOS Expat–Asistente se rige por las leyes del **País de Intervención**, sin perjuicio de las normas de orden público locales y de las normas internacionales imperativas. A modo supletorio y para la interpretación/validez de estos Términos y Condiciones, así como para cualquier cuestión no regulada por la ley del País de Intervención, se aplica el **derecho estonio**.

11.2. **Arbitraje obligatorio de la CCI:** cualquier disputa entre SOS Expat y el Asistente se resolverá **definitivamente** conforme al **Reglamento de Arbitraje de la CCI**. Sede: **Tallin (Estonia)**. Idioma: **francés**. El tribunal aplicará el derecho sustantivo definido en el art. 11.1. Procedimiento confidencial.

11.3. **Renuncia a acciones colectivas:** en la medida permitida, se excluyen todas las acciones colectivas/de grupo/representativas; únicamente se admiten reclamaciones individuales.

11.4. **Jurisdicción exclusiva de los tribunales de Estonia:** para cualquier asunto no arbitrable, ejecución de laudos o medidas urgentes, los tribunales estonios (**competentes en Tallin**) tendrán jurisdicción exclusiva. El Asistente renuncia a cualquier objeción por foro o inconveniencia de jurisdicción.

---


## 12. Diverso


12.1. **Cesión:** SOS Expat puede ceder los Términos y Condiciones a una entidad de su grupo o a un sucesor; el Asistente no puede cederlos sin el acuerdo escrito de SOS Expat.

12.2. **Integridad:** Los Términos y Condiciones constituyen el acuerdo completo y reemplazan cualquier acuerdo previo relativo al mismo objeto.

12.3. **Notificaciones:** Se realizarán mediante publicación en la Plataforma, notificación dentro de la aplicación o a través del formulario de contacto.

12.4. **Interpretación:** Los títulos son indicativos. No se aplica la regla *contra proferentem*.

12.5. **Idiomas:** Pueden proporcionarse traducciones; el francés prevalece para fines de interpretación.

12.6. **Nulidad parcial:** Si alguna disposición es nula o inaplicable, el resto permanece vigente; podrá reemplazarse por una disposición válida de efecto equivalente siempre que sea posible.

12.7. **No renuncia:** La falta de ejercicio de un derecho no constituye renuncia al mismo.

---


## 13. Contacto


Para cualquier pregunta o solicitud legal, contáctenos:
`;
  const defaultDe = `
# Allgemeine Nutzungsbedingungen – Expatriierte Helfer (Global)

**SOS Expat von WorldExpat OÜ** (estnische Gesellschaft, Registernr. 16885621, Sitz: Harju maakond, Tallinn, Kesklinna linnaosa, Tornimäe tn 3/5/7, 10145, Estland) – nachfolgend die « **Plattform** », « **SOS** », « **wir** »

**Version 3.0 – Letzte Aktualisierung: 1. Februar 2026**

---

## 1. Definitionen

**Anwendung / Website / Plattform**: Digitale Dienste, die von **WorldExpat OÜ** (estnische Gesellschaft, Registernr. 16885621, Sitz: Tallinn, Estland) betrieben werden und die Vernetzung zwischen Nutzern (den « **Nutzern** ») und expatriierten Helfern (den « **Helfern** ») ermöglichen.

**Expatriierter Helfer** („**Helfer**"): jede auf der Plattform registrierte Person, die eigenständig **nicht-juristische und nicht-medizinische Unterstützungsleistungen** für Nutzer anbietet (Orientierung, praktische Hilfe, Begleitung, informelle Übersetzungen, lokale Vernetzung usw.).

**Nutzer**: jede Person, die die Plattform verwendet, um einen Helfer zu kontaktieren.

**Vermittlung**: die technische/operative Einführung, die von der Plattform zwischen einem Nutzer und einem Helfer vorgenommen wird, die sich manifestiert durch (i) die Übermittlung von Kontaktdaten, (ii) die Eröffnung eines Kommunikationskanals (Anruf, Nachricht, Video), oder (iii) die Annahme einer über die Plattform gestellten Anfrage durch den Helfer.

**Einsatzland**: die Rechtsordnung, auf die sich die Nutzeranfrage zum Zeitpunkt der Vermittlung hauptsächlich bezieht. Fehlt eine solche, gilt das Wohnsitzland des Nutzers zum Zeitpunkt der Anfrage; bei mehreren Jurisdiktionen gilt diejenige, die dem Gegenstand der Anfrage am engsten verbunden ist.

**Vermittlungsgebühr**: Gebühr, die SOS für jede Vermittlung geschuldet wird (Art. 7): **19 €** bei Zahlung in **EUR** oder **25 $ USD** bei Zahlung in **USD**; SOS Expat kann diese Beträge ändern und/oder lokale Tarife nach Land/Währung veröffentlichen, mit prospektiver Wirkung.

**Zahlungsdienstleister**: Dritte, die für den Einzug der einmaligen Zahlung des Nutzers und die Verteilung der Gelder genutzt werden.

**Sanktionslisten**: Listen von Personen, Einrichtungen oder Ländern, die Wirtschaftssanktionen oder Embargos unterliegen, insbesondere die Listen der OFAC (Vereinigte Staaten), der Europäischen Union, der Vereinten Nationen, des britischen Finanzministeriums (HMT) und jeder anderen zuständigen Behörde.

---

## 2. Zweck, Geltungsbereich und Annahme

2.1. Diese AGB regeln den Zugang und die Nutzung der Plattform durch Helfer.

2.2. SOS Expat agiert ausschließlich als technischer Vermittler. SOS Expat ist weder Arbeitgeber, Vertreter noch Partner der Helfer, bietet keine rechtlichen, medizinischen, steuerlichen, buchhalterischen oder regulierten Beratungen an und ist nicht Partei von Verträgen zwischen Helfern und Nutzern.

2.3. **Elektronische Zustimmung (Click-Wrap) und Nachverfolgbarkeit.** Der Helfer akzeptiert die AGB durch Anklicken des entsprechenden Feldes bei der Registrierung und/oder durch Nutzung der Plattform. Diese Handlung gilt als elektronische Unterschrift und vertragliche Zustimmung gemäß der Verordnung (EU) Nr. 910/2014 (eIDAS). SOS Expat führt **zeitgestempelte Auditprotokolle**, die Folgendes enthalten: (i) das genaue Datum und die Uhrzeit (UTC) der Annahme, (ii) die IP-Adresse des Helfers, (iii) die eindeutige Sitzungskennung, (iv) den User-Agent des Browsers, (v) die Version der akzeptierten AGB, (vi) den kryptografischen Hash des akzeptierten Dokuments und (vii) die eindeutige Kennung des Helfers. Diese Protokolle stellen einen **rechtlich durchsetzbaren Nachweis** der Annahme der AGB dar.

2.4. **Aufbewahrung der Annahmenachweise.** Gemäß DSGVO und den gesetzlichen Aufbewahrungspflichten bewahrt SOS Expat die Nachweise der AGB-Annahme für einen Zeitraum von **zehn (10) Jahren** ab dem Datum der Annahme auf, oder bis zum Abschluss eines laufenden Rechtsstreits, je nachdem, was zutrifft. Der Helfer kann auf schriftliche Anfrage über das Kontaktformular eine **Annahmebestätigung** mit den oben genannten Nachweiselementen erhalten. Diese Aufbewahrung beruht auf dem berechtigten Interesse von SOS Expat, im Streitfall über Beweise zu verfügen (Art. 6 Abs. 1 lit. f DSGVO), sowie auf der gesetzlichen Pflicht zur Aufbewahrung von Handelsverträgen.

2.5. **Änderungen.** SOS kann die AGB und/oder die Gebührenordnung (nach Land/Währung) jederzeit mit prospektiver Wirkung nach Veröffentlichung auf der Plattform aktualisieren. Die fortgesetzte Nutzung gilt als Zustimmung. Bei wesentlichen Änderungen wird der Helfer aufgefordert, seine Annahme erneut zu bestätigen, die dann gemäß Artikel 2.3 erneut protokolliert wird.

2.6. **Berufliche Kapazität (B2B).** Der Helfer erklärt, ausschließlich zu beruflichen Zwecken zu handeln. Verbraucherschutzregelungen gelten nicht für die Beziehung zwischen SOS Expat und dem Helfer.

2.7. Laufzeit: unbefristet.

2.8. **Ergänzende Hinweise zur Annahme.** Der Helfer nimmt zur Kenntnis, dass die Annahme dieser AGB: (i) die Übertragung der hierin genannten Rechte und Pflichten beinhaltet, (ii) eine wesentliche Voraussetzung für den Zugang zu den Diensten der Plattform darstellt, und (iii) jederzeit durch SOS Expat technisch nachgewiesen werden kann.

---

## 3. Status des Helfers – Unabhängigkeit, Compliance und Erklärungen

3.1. Der Helfer handelt als unabhängiger Dienstleister; es entsteht kein Arbeits-, Agentur-, Mandats-, Partnerschafts- oder Joint-Venture-Verhältnis mit SOS Expat.

3.2. Der Helfer ist allein verantwortlich für: (i) die Beschaffung und Aufrechterhaltung aller erforderlichen Genehmigungen in jedem Einsatzland (Visum, Arbeitserlaubnis, Gewerbeanmeldung/Selbständigkeit, Versicherungen, lokale Lizenzen usw.); (ii) seine gültige Haftpflichtversicherung, angepasst an die Einsatzländer; (iii) die Einhaltung der lokalen Gesetze und Vorschriften (Verbraucherschutz, E-Commerce, Werbung, fairer Wettbewerb, Geldwäscheprävention/KYC falls zutreffend, Steuern, Datenschutz, Sanktionen/Export, Personensicherheit usw.).

3.3. SOS Expat überwacht oder bewertet weder den Inhalt noch die Qualität der Leistungen des Helfers und übernimmt hierfür keinerlei Verantwortung.

3.4. **Nicht regulierte Dienstleistungen.** Der Helfer verpflichtet sich, **keine regulierten Dienstleistungen** (z. B. Rechts-, Medizin-, Finanz-, Steuerberater-, Immobilienmaklerdienstleistungen etc.) **ohne** erforderliche **Genehmigungen/Lizenzen** und **ohne vollständige Einhaltung der lokalen Gesetze** anzubieten. Andernfalls verzichtet er auf diese Dienste und verweist den Nutzer an einen ordnungsgemäß befugten Fachmann.

3.5. **Versicherungen.** Der Helfer erklärt, die erforderlichen Versicherungen (berufliche Haftpflicht, falls zutreffend) für seine Tätigkeiten und Einsatzgebiete zu haben.

3.6. **Einhaltung der Gesetzgebung des Einsatzlandes.** Der Helfer verpflichtet sich, bei jeder Vermittlung die im Einsatzland geltenden Gesetze und Vorschriften zu kennen und einzuhalten, insbesondere hinsichtlich: (i) der Ausübung seiner Tätigkeit (Genehmigungen, Lizenzen, Zulassungen), (ii) des Verbraucherschutzes, (iii) des Datenschutzes, (iv) der steuerlichen Verpflichtungen, und (v) aller anderen anwendbaren zwingenden Vorschriften. Die Verantwortung für die Einhaltung dieser Vorschriften liegt ausschließlich beim Helfer.

3.7. **Erklärungen und Garantien des Helfers.** Mit der Registrierung auf der Plattform erklärt und garantiert der Helfer ausdrücklich, dass:
- (a) Er nach dem Recht seines Wohnsitz- und/oder Tätigkeitslandes **volljährig** ist;
- (b) Er die **volle Geschäftsfähigkeit** besitzt, um Verträge abzuschließen und seine Tätigkeit auszuüben;
- (c) Er nicht unter Vormundschaft, Betreuung, gerichtlichem Schutz oder einem gleichwertigen Schutzregime steht;
- (d) Gegen ihn kein **Berufs- oder Tätigkeitsverbot** besteht, weder vorübergehend noch dauerhaft;
- (e) Er auf **keiner Sanktionsliste** (OFAC, EU, UN, HMT oder andere) steht;
- (f) Er nicht wegen Straftaten **strafrechtlich verurteilt** wurde, die mit der Ausübung seiner Tätigkeit unvereinbar sind;
- (g) Alle bei der Registrierung angegebenen Informationen **korrekt, vollständig und aktuell** sind;
- (h) Er sich verpflichtet, SOS Expat **unverzüglich über Änderungen** zu informieren, die diese Erklärungen betreffen;
- (i) Er das **tatsächliche Recht hat, seine Tätigkeit** in jedem der Länder auszuüben, die er bei der Registrierung oder später in seinem Profil als "Einsatzländer" ausgewählt hat. Die Auswahl eines Einsatzlandes, in dem der Helfer nicht zur Tätigkeitsausübung berechtigt ist, stellt einen **schwerwiegenden Verstoß** gegen diese AGB dar.
Jede falsche Erklärung stellt einen schwerwiegenden Verstoß gegen die AGB dar, der zu einem sofortigen und endgültigen Ausschluss führen kann, unbeschadet etwaiger Schadensersatzansprüche.

---

## 4. Kontoerstellung, Überprüfungen und Sicherheit

4.1. Voraussetzungen: gültige Berechtigung zur Tätigkeitsausübung in mindestens einer Jurisdiktion, Identitätsnachweise, gültige Haftpflichtversicherung (falls zutreffend).

4.2. Verfahren: Kontoerstellung, Vorlage der Dokumente, manuelle Validierung, die KYC/AML-Prüfungen über Dienstleister umfassen kann.

4.3. Richtigkeit & Aktualisierung: Der Helfer garantiert die Richtigkeit und Aktualität der Angaben; ein (1) Konto pro Helfer.

4.4. Sicherheit: Der Helfer schützt seine Zugangsdaten; jede Aktivität über das Konto gilt als von ihm vorgenommen; jede Kompromittierung ist unverzüglich zu melden.

4.5. **Zusätzliche Überprüfungen jederzeit.** SOS Expat behält sich das Recht vor, vom Helfer **jederzeit und ohne Begründung** die Vorlage oder Aktualisierung von Dokumenten zu verlangen, die seine Identität, seine Berechtigung zur Tätigkeitsausübung, seine Haftpflichtversicherung oder andere relevante Nachweise belegen. Der Helfer verpflichtet sich, auf solche Anfragen innerhalb von **sieben (7) Werktagen** zu antworten. Das Ausbleiben einer Antwort oder die Vorlage nicht konformer Dokumente kann zur sofortigen Kontosperrung führen.

4.6. **Moderation und Qualitätskontrolle.** SOS Expat setzt eine Moderationsrichtlinie um, die darauf abzielt, die Qualität und Konformität der auf der Plattform angebotenen Dienstleistungen sicherzustellen. Diese Moderation kann umfassen: (i) Überprüfung von Profilen und veröffentlichten Inhalten, (ii) Analyse von Nutzerbewertungen und Beschwerden, (iii) Kontrolle der Einhaltung der AGB und anwendbarer Gesetze, (iv) alle anderen angemessenen Qualitätskontrollmaßnahmen. Der Helfer erklärt sich mit dieser Moderation einverstanden.

4.7. **Vorübergehende Kontosperrung.** SOS Expat kann das Konto des Helfers in folgenden Fällen **sofort und ohne Vorankündigung sperren**:
- (a) Verdacht auf Betrug, Identitätsdiebstahl oder falsche Angaben;
- (b) Mehrfache oder schwerwiegende Beschwerden von Nutzern;
- (c) Nichtvorlage der gemäß Artikel 4.5 angeforderten Dokumente;
- (d) Nachgewiesener oder vermuteter Verstoß gegen die AGB oder anwendbare Gesetze;
- (e) Verhalten, das dem Image oder dem Ruf der Plattform schadet;
- (f) Anordnung einer Justiz- oder Verwaltungsbehörde;
- (g) Jeder andere berechtigte Grund nach alleinigem Ermessen von SOS Expat.
Während der Sperrung kann der Helfer nicht auf sein Konto zugreifen und keine neuen Vermittlungen erhalten. Ausstehende Zahlungen können bis zur Klärung der Situation einbehalten werden.

4.8. **Dauerhafter Ausschluss (Kündigung wegen Vertragsverletzung).** SOS Expat kann das Konto des Helfers in folgenden Fällen **dauerhaft und ohne Vorankündigung kündigen** ("Ausschluss"):
- (a) Schwerer oder wiederholter Verstoß gegen die AGB;
- (b) Nachgewiesener Betrug, vorsätzlich falsche Angaben oder Identitätsdiebstahl;
- (c) Verlust des Rechts zur Tätigkeitsausübung;
- (d) Strafrechtliche Verurteilung, die mit der Tätigkeitsausübung unvereinbar ist;
- (e) Verhalten, das Nutzern oder der Plattform schwerwiegend schadet;
- (f) Wiederholung nach einer vorübergehenden Sperrung;
- (g) Nachgewiesene Umgehung der Plattform zur Vermeidung von Vermittlungsgebühren;
- (h) Nichteinhaltung der KYC-Verifizierungspflichten trotz Mahnungen;
- (i) Jeder andere schwerwiegende Grund nach alleinigem Ermessen von SOS Expat.
Der Ausschluss ist **endgültig und unwiderruflich**. Ein ausgeschlossener Helfer kann kein neues Konto erstellen. Ausstehende Gelder können als pauschaler Schadensersatz einbehalten werden, unbeschadet weiterer Schadensersatzansprüche.

4.9. **Verfahren und Benachrichtigung.** Im Falle einer Sperrung oder eines Ausschlusses benachrichtigt SOS Expat den Helfer per E-Mail an die registrierte Adresse. Diese Benachrichtigung gibt den Grund der Maßnahme an (es sei denn, eine gesetzliche Vertraulichkeitspflicht besteht). Der Helfer hat **fünfzehn (15) Tage** Zeit, um schriftliche Stellungnahmen über das Kontaktformular einzureichen. SOS Expat prüft diese Stellungnahmen, ist aber nicht verpflichtet, die Maßnahme aufzuheben. Die Entscheidung von SOS Expat ist **nach eigenem Ermessen und endgültig**.

4.10. **Auswirkungen der Sperrung oder des Ausschlusses.** Im Falle einer Sperrung oder eines Ausschlusses:
- (a) Der Kontozugang wird sofort gesperrt;
- (b) Das Profil des Helfers wird aus den Suchergebnissen entfernt;
- (c) Laufende Vermittlungen können storniert werden;
- (d) Ausstehende Zahlungen können einbehalten oder mit Beträgen verrechnet werden, die SOS Expat geschuldet werden;
- (e) Der Helfer bleibt gemäß den Fortgeltungsklauseln an seine Verpflichtungen (Vertraulichkeit, Nicht-Abwerbung usw.) gebunden.

4.11. **Inaktivität.** Bei **Inaktivität von mehr als 365 Tagen** kann das Konto nach Benachrichtigung automatisch deaktiviert werden. Der Helfer kann sein Konto auf Anfrage reaktivieren, sofern er die erforderlichen Verifizierungsdokumente vorlegt.

4.12. **Freiwillige Kündigung.** Der Helfer kann sein Konto jederzeit schließen, nachdem er seine ausstehenden Verpflichtungen erfüllt hat. Der Schließungsantrag erfolgt über das Kontaktformular. SOS Expat führt die Schließung innerhalb von **dreißig (30) Tagen** durch.

4.13. **Elektronische Kommunikation.** Der Helfer erklärt sich damit einverstanden, alle Benachrichtigungen bezüglich der AGB, der Moderation und der Sperr-/Ausschlussmaßnahmen auf elektronischem Wege zu erhalten (E-Mail, In-App-Benachrichtigung, Veröffentlichung auf der Plattform). Der Helfer verpflichtet sich, eine gültige E-Mail-Adresse zu führen und seine Benachrichtigungen regelmäßig zu prüfen.

---

## 5. Nutzungsregeln – Qualität, Verbote, Umgehungsverbot

5.1. **Qualität & zutreffende Beschreibung.** Der Helfer beschreibt seine Dienstleistungen korrekt, ohne Erfolgsgarantie. Keine falschen Angaben über Qualifikationen oder Berufsbezeichnungen.

5.2. **Verbote.** Illegale, diskriminierende oder irreführende Inhalte; unfaire Praktiken; missbräuchliche Datennutzung; Umgehung/Reverse-Engineering der Plattform; Kollusion/Boykott zum Nachteil der Plattform; Verstöße gegen Sanktions- oder Exportgesetze; jegliche illegale Aktivitäten.

5.3. **Umgehungsverbot.** Jede neue Vermittlung mit einem neuen Nutzer über die Plattform löst die Vermittlungsgebühr aus. Es ist verboten, die Plattform zu umgehen, um diese Gebühren bei einer neuen Einführung zu vermeiden.

5.4. **Verfügbarkeit.** Die Plattform wird „wie besehen" bereitgestellt; keine Garantie für ununterbrochene Verfügbarkeit (Wartung, Störungen, höhere Gewalt). Der Zugang kann gesetzlich eingeschränkt werden.

5.5. **Vertraulichkeit.** Der Helfer schützt die Informationen der Nutzer und gibt sie nicht weiter, außer bei gesetzlicher Verpflichtung oder mit Einwilligung.

---

## 6. Beziehung Helfer–Nutzer (außerhalb der Plattform)

6.1. Nach der Vermittlung können Helfer und Nutzer außerhalb der Plattform einen Vertrag schließen. Honorare und Bedingungen werden von beiden frei festgelegt, unter Einhaltung der lokalen Gesetze.

6.2. Der Helfer stellt Leistungsbestätigungen gemäß dem lokalen Recht aus, erhebt/entrichtet anfallende Steuern und verwaltet seine Rechnungen sowie steuerlichen Verpflichtungen.

6.3. SOS Expat ist nicht verantwortlich für die Qualität, Richtigkeit oder das Ergebnis der Leistungen des Helfers oder für Vereinbarungen zwischen Helfer und Nutzer.

---

## 7. Gebühren, Einmalzahlung und Steuern

7.1. **Vermittlungsgebühr (Pauschalbetrag).** Die Vermittlungsgebühr beträgt derzeit **19 € (EUR)** oder **25 $ (USD)** pro Vermittlung, exkl. Steuern und Zahlungsdienstleistergebühren. **Diese Beträge sind indikativ und können jederzeit geändert werden.** SOS Expat behält sich das Recht vor, diese Beträge zu ändern und/oder lokale Tarife nach Land/Währung zu veröffentlichen, mit prospektiver Wirkung nach Veröffentlichung auf der Plattform. Dem Helfer wird empfohlen, regelmäßig die aktuelle Gebührenordnung in seinem persönlichen Dashboard einzusehen.

7.2. **Preisstruktur für den Nutzer und Mittelverteilung.** Der dem Nutzer auf der Plattform angezeigte Preis **enthält** die Vermittlungsgebühr von SOS Expat. Der Nutzer leistet eine Einmalzahlung über die Plattform. **Die Mittelverteilung erfolgt wie folgt:**
- (a) **Vom Nutzer gezahlter Betrag** = Vergütung des Helfers + Vermittlungsgebühr von SOS Expat;
- (b) **An den Helfer überwiesener Nettobetrag** = Vom Nutzer gezahlter Betrag − Vermittlungsgebühr von SOS Expat − Bankgebühren des Zahlungsdienstleisters − Währungsumrechnungsgebühren (falls zutreffend).

Der Helfer ermächtigt SOS Expat ausdrücklich, diese Abzüge vor jeder Überweisung vorzunehmen. **Der genaue Betrag, der an den Helfer überwiesen wird, wird in seinem Dashboard vor und nach jeder Transaktion angezeigt.**

7.3. **Bankgebühren des Zahlungsdienstleisters.** Der Zahlungsdienstleister (Stripe oder Äquivalent) erhebt Bearbeitungsgebühren für jede Transaktion. **Diese Bankgebühren gehen vollständig zulasten des Helfers** und werden automatisch von dem ihm überwiesenen Betrag abgezogen. Details zu diesen Gebühren sind in den Bedingungen des Zahlungsdienstleisters und im Dashboard des Helfers für jede Transaktion verfügbar.

7.4. **Wechselkurs- und Währungsumrechnungsgebühren.** Wenn die Zahlungswährung des Nutzers von der Währung des Bankkontos des Helfers abweicht, werden vom Zahlungsdienstleister **Währungsumrechnungsgebühren** erhoben. **Diese Wechselgebühren gehen vollständig zulasten des Helfers** und werden von dem ihm überwiesenen Betrag abgezogen. Die angewandten Wechselkurse sind die des Zahlungsdienstleisters zum Zeitpunkt der Überweisung. Der Helfer erkennt an und akzeptiert ausdrücklich, dass SOS Expat keine Kontrolle über diese Wechselkurse hat und jede Haftung für Währungsschwankungen oder vom Dienstleister erhobene Gebühren ablehnt.

7.5. **Berechnung des überwiesenen Nettobetrags.** Der an den Helfer überwiesene Nettobetrag wird nach folgender Formel berechnet: **Vom Nutzer gezahlter Betrag − Vermittlungsgebühr − Bankgebühren des Dienstleisters − Wechselgebühren (falls zutreffend)**. Der genaue Betrag variiert je nach den zum Zeitpunkt der Transaktion geltenden Gebühren. **Der Helfer wird vor jeder Leistung in seinem Dashboard über den genauen Betrag informiert, den er erhalten wird, und kann so eine fundierte Entscheidung treffen, ob er die Vermittlung annimmt oder nicht.**

7.6. **Fälligkeit & Nicht-Erstattung.** Die Vermittlungsgebühr wird mit der effektiven Vermittlung fällig und ist **nicht erstattungsfähig** (außer aus Kulanz von SOS Expat bei einem Fehler, der ausschließlich der Plattform zuzuschreiben ist, soweit gesetzlich zulässig).

7.7. **Rückzahlung an den Nutzer.** Wird einem Nutzer eine Rückzahlung gewährt, wird diese vom Anteil des Helfers abgezogen: SOS Expat kann den entsprechenden Betrag mit zukünftigen Zahlungen an den Helfer verrechnen oder eine direkte Rückzahlung verlangen, falls keine Zahlungen ausstehen. Die Vermittlungsgebühr verbleibt bei SOS Expat, sofern nicht nach eigenem Ermessen anders entschieden.

7.8. **Zahlungsfristen.** Vorbehaltlich des Abschlusses des KYC-Prozesses (Artikel 8) werden die Gelder innerhalb von **sieben (7) Werktagen** nach der Leistung an den Helfer überwiesen, es sei denn, es liegt ein Streitfall, eine Nutzerbeschwerde oder eine laufende Compliance-Prüfung vor.

7.9. **Steuern.** Der Helfer bleibt **allein verantwortlich** für alle seine steuerlichen Verpflichtungen (Einkommensteuer, Umsatzsteuer, Sozialabgaben usw.) in seiner Wohnsitz- und/oder Tätigkeitsjurisdiktion. Die an den Helfer überwiesenen Beträge sind **Bruttobeträge**; der Helfer ist für die Anmeldung und Zahlung aller anfallenden Steuern verantwortlich. SOS Expat erhebt und führt, soweit gesetzlich vorgeschrieben, Umsatzsteuer/lokales Äquivalent nur auf die Vermittlungsgebühr ab.

7.10. **Verrechnung.** SOS Expat kann jeden Betrag, den der Helfer schuldet (aufgrund einer Nutzererstattung, Strafe oder anderer Verpflichtung), mit jedem dem Helfer geschuldeten Betrag verrechnen.

7.11. **Gebührentransparenz und Historie.** Der Helfer kann jederzeit in seinem persönlichen Dashboard einsehen: (i) vollständige Details zu jeder Transaktion, (ii) den vom Nutzer gezahlten Bruttobetrag, (iii) die abgezogene Vermittlungsgebühr, (iv) die Bankgebühren des Zahlungsdienstleisters, (v) ggf. Wechselgebühren, (vi) den überwiesenen oder zu überweisenden Nettobetrag und (vii) die Historie aller seiner Transaktionen. Diese Informationen werden während der gesamten Kontolaufzeit und **fünf (5) Jahre** nach dessen Schließung aufbewahrt und sind zugänglich.

---

## 8. Zahlungen – KYC/AML – Sanktionen

8.1. Zahlungen werden über Drittanbieter abgewickelt. Der Helfer akzeptiert deren Bedingungen und KYC/AML-Verfahren.

8.2. SOS Expat kann Zahlungen bei Verdacht auf Betrug, Nichtkonformität oder aufgrund gesetzlicher Anordnung zurückhalten, verzögern oder stornieren.

8.3. **Internationale Sanktionen und Embargos.** Der Helfer erklärt und garantiert:
- (a) Nicht direkt oder indirekt auf einer **Sanktionsliste** zu stehen (OFAC/SDN, EU, UN, HMT oder jede andere anwendbare Sanktionsliste);
- (b) Nicht direkt oder indirekt im Eigentum oder unter der Kontrolle einer Person oder Einrichtung zu stehen, die auf einer Sanktionsliste steht;
- (c) Kein Einwohner, Staatsangehöriger zu sein oder sich nicht in einem Land zu befinden, das einem **umfassenden Embargo** unterliegt (derzeit: Nordkorea, Iran, Syrien, Kuba, Regionen Krim/Donezk/Luhansk oder jedes andere später hinzugefügte Gebiet);
- (d) Die Plattform nicht für Transaktionen zu nutzen, die sanktionierte Personen, Einrichtungen oder Länder betreffen;
- (e) Alle geltenden **Exportkontrollgesetze** einzuhalten.
SOS Expat behält sich das Recht vor, den Zugang zur Plattform in jedem von Sanktionen oder Embargos betroffenen Gebiet oder für jeden Helfer, der verdächtigt wird, gegen diese Bestimmungen zu verstoßen, **sofort zu beschränken oder zu sperren**, ohne Vorankündigung oder Entschädigung. SOS Expat kann auch verpflichtet sein, die Gelder des Helfers auf Anordnung einer zuständigen Behörde **einzufrieren**.

8.4. **Ausführliche Liste der Sanktionsbehörden.** Die von SOS Expat berücksichtigten Sanktionslisten umfassen insbesondere:
- (a) **OFAC** (Office of Foreign Assets Control, Vereinigte Staaten) – einschließlich der SDN-Liste (Specially Designated Nationals);
- (b) **Europäische Union** – konsolidierte Sanktionsliste;
- (c) **Vereinte Nationen** – Sicherheitsrats-Sanktionslisten;
- (d) **HMT** (His Majesty's Treasury, Vereinigtes Königreich) – Konsolidierte Liste;
- (e) Jede andere von einer zuständigen Behörde veröffentlichte Liste.
Die aktuell von umfassenden Embargos betroffenen Länder sind: Nordkorea, Iran, Syrien, Kuba sowie die Regionen Krim, Donezk und Luhansk. Diese Liste kann sich entsprechend den internationalen Entwicklungen ändern.

### Nicht beanspruchte Gelder und KYC-Verifizierung

8.5. **Pflicht zur Vervollständigung des Verifizierungsprozesses (KYC).** Um Zahlungen aus über die Plattform erbrachten Leistungen zu erhalten, verpflichtet sich der Helfer, den Identitätsverifizierungsprozess (KYC - Know Your Customer) bei unserem Zahlungspartner Stripe schnellstmöglich nach der Registrierung abzuschließen. Der Helfer erkennt an, dass das Fehlen einer vollständigen KYC-Verifizierung die Überweisung von Geldern auf sein Bankkonto technisch verhindert.

8.6. **Verwahrung ausstehender Gelder.** Wenn ein Nutzer eine Zahlung für eine Leistung leistet, die von einem Helfer erbracht wurde, der seine KYC-Verifizierung nicht abgeschlossen hat, werden die dem Anteil des Helfers entsprechenden Gelder (nach Abzug der Vermittlungsgebühr der Plattform) auf einem Treuhandkonto verwahrt. Die Plattform verpflichtet sich:
- Den Helfer per E-Mail über das Vorhandensein ausstehender Gelder zu benachrichtigen;
- Regelmäßige Erinnerungen zu senden (nach 7, 30, 60, 90, 120 und 150 Tagen);
- Dem Helfer alle erforderlichen Mittel zur Verfügung zu stellen, um seine KYC-Verifizierung abzuschließen.

8.7. **Nicht beanspruchte Gelder und Verfall.** Wird die KYC-Verifizierung nicht innerhalb von **einhundertachtzig (180) Tagen** ab der ersten zurückgehaltenen Zahlung abgeschlossen, und trotz der in Artikel 8.6 vorgesehenen Benachrichtigungen, gelten die Gelder als vom Helfer **aufgegeben**. Der Helfer erkennt ausdrücklich an und akzeptiert, dass:
- (a) Nicht beanspruchte Gelder innerhalb dieser Frist endgültig von der Plattform als pauschale Entschädigung für Verwaltungs-, Aufbewahrungs- und Kontaktierungskosten erworben werden;
- (b) Dieser Erwerb die von der Plattform für die Verwaltung nicht beanspruchter Gelder getragenen Verwaltungskosten kompensiert;
- (c) Er ausdrücklich auf jeden Anspruch auf diese Gelder nach Ablauf der 180-Tage-Frist verzichtet.

8.8. **Ausnahmsweiser Anspruch.** Abweichend von Artikel 8.7 kann der Helfer innerhalb von maximal **zwölf (12) Monaten** nach Ablauf der 180-Tage-Frist einen begründeten Anspruch geltend machen, nur in folgenden Fällen: dokumentierte medizinische Arbeitsunfähigkeit, ordnungsgemäß begründete höhere Gewalt oder technischer Fehler, der der Plattform zuzuschreiben ist. Die Plattform prüft den Antrag innerhalb von 30 Tagen und behält sich das Recht vor, den Anspruch anzunehmen oder abzulehnen. Im Falle der Annahme wird eine Bearbeitungsgebühr von **zwanzig Prozent (20%)** vom erstatteten Betrag einbehalten.

8.9. **Ausdrückliche Annahme.** Mit der Registrierung auf der Plattform als Helfer erklärt dieser, die vorliegenden Bedingungen bezüglich nicht beanspruchter Gelder zur Kenntnis genommen zu haben und akzeptiert sie ausdrücklich. Diese Annahme stellt eine wesentliche und bestimmende Bedingung für den Zugang zum Anbieterstatus auf der Plattform dar.

---

## 9. Personenbezogene Daten (globaler Rahmen – GDPR/DSA)

9.1. **Rollen.** Für Nutzerdaten, die zum Zweck der Vermittlung verarbeitet werden, handeln SOS Expat und der Helfer jeweils als eigenständige Verantwortliche für ihre jeweiligen Zwecke, gemäß der **Verordnung (EU) 2016/679 (DSGVO/GDPR)**.

9.2. **Rechtsgrundlagen & Zwecke.** Vertragserfüllung (Vermittlung), berechtigte Interessen (Sicherheit, Betrugsprävention, Verbesserung), gesetzliche Verpflichtungen (AML, Sanktionen) und ggf. Einwilligung.

9.3. **Internationale Übermittlungen** mit angemessenen Garantien, sofern erforderlich (Standardvertragsklauseln, Angemessenheitsbeschluss usw.).

9.4. **Rechte & Kontakt.** Ausübung der Rechte (Auskunft, Berichtigung, Löschung, Übertragbarkeit, Widerspruch) über das Kontaktformular der Plattform.

9.5. **Sicherheit.** Angemessene technische/organisatorische Maßnahmen; Meldung von Datenschutzverletzungen gemäß geltendem Recht (72 Stunden gemäß DSGVO).

9.6. Der Helfer verarbeitet die erhaltenen Daten gemäß dem Recht des Einsatzlandes.

9.7. **DSA-Konformität.** Die Plattform fungiert als **Vermittlungsdienst** im Sinne der **Verordnung (EU) 2022/2065 (Gesetz über digitale Dienste)**. SOS Expat implementiert Mechanismen zur Meldung illegaler Inhalte und kooperiert mit den zuständigen Behörden gemäß dem DSA.

---

## 10. Geistiges Eigentum

Die Plattform, ihre Marken, Logos, Datenbanken und Inhalte sind geschützt. Es werden keine Rechte an den Helfer übertragen, außer einem persönlichen, nicht exklusiven, nicht übertragbaren Zugangsrecht während der Laufzeit dieser AGB. Inhalte, die vom Helfer bereitgestellt werden (Profil, Foto, Beschreibungen), werden SOS Expat mit einer weltweiten, nicht exklusiven Lizenz zur Speicherung und Anzeige auf der Plattform eingeräumt.

---

## 11. Garantien, Haftung und Freistellung

11.1. Keine Garantie in Bezug auf Dienstleistungen; SOS Expat garantiert weder Ergebnis, Qualität noch Geschäftsvolumen.

11.2. Plattform „wie besehen"; keine Garantie für ständige Verfügbarkeit.

11.3. **Haftungsbeschränkung**: Soweit gesetzlich zulässig, ist die Gesamthaftung von SOS Expat gegenüber dem Helfer auf direkte Schäden beschränkt und darf den Gesamtbetrag der von SOS Expat im Zusammenhang mit der betreffenden Transaktion erhobenen Vermittlungsgebühren nicht überschreiten.

11.4. **Ausschlüsse**: keine Haftung für indirekte/folgende/besondere/punitive Schäden (z. B. entgangener Gewinn, Kundenverlust, Rufschaden usw.).

11.5. **Freistellung**: Der Helfer stellt SOS Expat (und dessen verbundene Unternehmen, Führungskräfte, Mitarbeiter, Vertreter) von allen Ansprüchen/Schäden/Kosten (einschließlich Anwaltskosten) frei, die sich aus (i) Verstößen gegen die AGB/Gesetze, (ii) seinen Inhalten, (iii) seinen Leistungen oder Unterlassungen, (iv) fehlenden Arbeitserlaubnissen/Immigration/Lizenzen ergeben.

11.6. **Verzicht auf Ansprüche.** Der Helfer **verzichtet ausdrücklich und unwiderruflich** auf alle Ansprüche gegen SOS Expat wegen (i) Schäden aus der Erbringung von Dienstleistungen, (ii) indirekter Verluste, (iii) vertraglicher Streitigkeiten mit Nutzern, (iv) jeglicher Mängel der vom Helfer erbrachten Leistungen. Dieser Verzicht gilt im gesetzlich zulässigen Umfang.

11.7. Keine Vertretung: Nichts hierin begründet ein Mandats-, Arbeits-, Partner- oder Joint-Venture-Verhältnis zwischen SOS Expat und dem Helfer.

11.8. **Höhere Gewalt.** SOS Expat haftet nicht für Verzögerungen oder Ausfälle aufgrund von **höherer Gewalt** (Naturkatastrophe, Krieg, Pandemie, Cyberangriff, Strom- oder Internetausfall, behördliche Anordnung, Streik usw.).

11.9. **Fortbestand von Klauseln.** Die folgenden Artikel bleiben nach Beendigung oder Ablauf der AGB unabhängig von der Ursache in Kraft: Artikel 2 (Annahmenachweise), 3.7 (Erklärungen), 5 (Nutzungsregeln), 7 (Gebühren und Zahlungen), 8 (KYC und Sanktionen), 9 (personenbezogene Daten), 10 (geistiges Eigentum), 11 (Haftung und Freistellung), 12 (anwendbares Recht und Schiedsgerichtsbarkeit), 13 (Schutzklauseln) und 14 (Verschiedenes). Diese Klauseln bleiben so lange in Kraft, wie es zur Entfaltung ihrer Wirkung erforderlich ist.

---

## 12. Anwendbares Recht – Schiedsgerichtsbarkeit – Estnische Gerichtsbarkeit – Sammelklagen

12.1. **Anwendbares Recht.** Diese AGB, ihre Auslegung, Gültigkeit und Durchführung unterliegen ausschließlich dem **estnischen Recht** unter Ausschluss seiner Kollisionsnormen. Für Fragen bezüglich der Erbringung von Dienstleistungen in einem bestimmten Einsatzland gelten die dortigen zwingenden Vorschriften und öffentlichen Ordnung ergänzend, soweit sie zwingend sind.

12.2. **Verbindliches internationales Schiedsverfahren.** Jeder Streit, jede Meinungsverschiedenheit oder jeder Anspruch, der sich aus diesen AGB ergibt oder damit zusammenhängt, einschließlich ihrer Gültigkeit, Auslegung, Durchführung oder Beendigung, wird endgültig durch **Schiedsverfahren** gemäß der Schiedsgerichtsordnung der **Internationalen Handelskammer (ICC)** entschieden.
- **Sitz des Schiedsverfahrens**: Tallinn, Estland;
- **Sprache des Schiedsverfahrens**: **Englisch**;
- **Anzahl der Schiedsrichter**: ein (1) Einzelschiedsrichter, es sei denn, der Streitwert übersteigt 100.000 €, in welchem Fall drei (3) Schiedsrichter;
- **Materielles Recht**: estnisches Recht (Art. 12.1);
- **Verfahren**: vertraulich. Die Parteien verpflichten sich, die Existenz, den Inhalt oder das Ergebnis des Schiedsverfahrens nicht offenzulegen, es sei denn, dies ist gesetzlich vorgeschrieben oder zur Vollstreckung des Schiedsspruchs erforderlich.
Der Schiedsspruch ist für die Parteien **endgültig und bindend**. Die Parteien verzichten im gesetzlich zulässigen Umfang auf jeden Aufhebungsantrag.

12.3. **Verzicht auf Sammelklagen und Geschworenengerichte.** Im größtmöglichen gesetzlich zulässigen Umfang:
- (a) Der Helfer verzichtet auf die Teilnahme an **Sammelklagen, Gruppenklagen oder Vertretungsklagen** gegen SOS Expat;
- (b) Jeder Streit wird **ausschließlich individuell** beigelegt;
- (c) Der Helfer verzichtet ausdrücklich auf jedes **Recht auf ein Geschworenengericht** (Jury Trial Waiver);
- (d) Der Helfer verzichtet auf **Class Actions, Consolidated Actions oder Representative Actions** nach US-amerikanischem Recht oder gleichwertigem Recht.

12.4. **Ausschließliche Zuständigkeit estnischer Gerichte.** Für nicht schiedsfähige Ansprüche nach anwendbarem Recht, für dringende einstweilige Maßnahmen vor Konstituierung des Schiedsgerichts und für die Vollstreckung von Schiedssprüchen sind die **Gerichte in Tallinn (Estland)** **ausschließlich zuständig**. Der Helfer:
- (a) Stimmt dieser Zuständigkeit unwiderruflich zu;
- (b) Verzichtet auf jede Einrede des **Forum non conveniens**;
- (c) Verzichtet auf jede Einrede der fehlenden persönlichen Zuständigkeit;
- (d) Akzeptiert, dass jede Zustellung an die auf der Plattform registrierte E-Mail-Adresse erfolgen kann.

12.5. **Obligatorische vorherige Mediation.** Vor jedem Schiedsverfahren verpflichten sich die Parteien, zu versuchen, den Streit gütlich durch **Verhandlung in gutem Glauben** für einen Zeitraum von **dreißig (30) Tagen** ab schriftlicher Benachrichtigung über den Streit beizulegen. Diese Benachrichtigung muss per E-Mail mit Empfangsbestätigung an die Kontaktadresse der anderen Partei gesendet werden. Das Scheitern der Mediation ist Voraussetzung für die Einreichung eines Schiedsantrags.

12.6. **Verjährung.** Jede Klage oder jeder Anspruch des Helfers gegen SOS Expat muss innerhalb von **einem (1) Jahr** ab dem Eintritt des auslösenden Ereignisses erhoben werden, andernfalls ist er endgültig verjährt, soweit nach anwendbarem Recht zulässig.

---

## 13. Internationale Schutzklauseln

13.1. **Antikorruption.** Der Helfer verpflichtet sich, keine Bestechungsgelder oder unzulässige Vorteile an öffentliche oder private Amtsträger anzubieten, zu versprechen oder zu zahlen. Er hält die geltenden Antikorruptionsgesetze ein (FCPA, UK Bribery Act, Sapin-II-Gesetz usw.).

13.2. **Vertraulichkeit der Kommunikation.** Die über die Plattform geführte Kommunikation (Nachrichten, Telefonate) ist **vertraulich**. Der Helfer verpflichtet sich, diese nicht aufzuzeichnen, offenzulegen oder für andere Zwecke als die vereinbarte Leistung zu verwenden, es sei denn, es liegt eine schriftliche Genehmigung oder eine gesetzliche Verpflichtung vor.

13.3. **Abwerbeverbot.** Während der Laufzeit dieser AGB und **zwölf (12) Monate** nach deren Beendigung darf der Helfer Nutzer, die er über die Plattform kennengelernt hat, nicht direkt abwerben, um die Vermittlungsgebühren zu umgehen.

13.4. **Alleinige Verantwortung des Helfers.** Der Helfer ist **allein verantwortlich** für die Qualität, Richtigkeit und Rechtmäßigkeit der von ihm erbrachten Leistungen. Der Helfer ist **vollständig verantwortlich** für die Einhaltung der gesetzlichen und regulatorischen Bestimmungen des Landes, in dem er tätig ist. SOS Expat **garantiert nicht** die vom Helfer erbrachten Leistungen und **lehnt jede Haftung** für Schäden ab, die einem Nutzer aufgrund der Leistungen des Helfers entstehen.

13.5. **Kein Beratungsverhältnis.** SOS Expat ist **kein Beratungsunternehmen** und kein Anbieter von rechtlichen, steuerlichen, medizinischen oder regulierten Dienstleistungen. Die Plattform beschränkt sich auf die **Vermittlung**. Jedes Beratungsverhältnis wird **ausschließlich** zwischen dem Helfer und dem Nutzer **außerhalb** von SOS Expat begründet.

13.6. **Streitigkeiten zwischen Helfer und Nutzer.** Jede Streitigkeit zwischen einem Helfer und einem Nutzer fällt **ausschließlich** in deren direkte Beziehung. SOS Expat **greift nicht** in solche Streitigkeiten ein und **kann nicht** als Partei, Garant oder Vermittler in Anspruch genommen werden. SOS Expat ist **in keinem Fall verantwortlich** für Streitigkeiten zwischen Helfer und Nutzer.

---

## 14. Verschiedenes

14.1. **Abtretung**: SOS Expat kann die AGB an ein Konzernunternehmen oder einen Rechtsnachfolger übertragen; der Helfer darf dies nur mit schriftlicher Zustimmung von SOS Expat.

14.2. **Gesamtheit**: Diese AGB stellen die vollständige Vereinbarung dar und ersetzen alle früheren Vereinbarungen zum selben Gegenstand.

14.3. **Mitteilungen**: Durch Veröffentlichung auf der Plattform, In-App-Benachrichtigung oder über das Kontaktformular.

14.4. **Auslegung**: Überschriften dienen nur der Übersicht. Keine Auslegungsregel contra proferentem.

14.5. **Sprachen**: Übersetzungen können bereitgestellt werden; für die Auslegung ist die **englische Fassung maßgeblich**.

14.6. **Teilnichtigkeit und Trennbarkeit.** Wird eine Bestimmung dieser AGB von einem zuständigen Gericht oder Schiedsrichter für nichtig, ungültig oder nicht durchsetzbar erklärt:
- (a) Berührt diese Nichtigkeit nicht die Gültigkeit der übrigen Bestimmungen, die in Kraft bleiben;
- (b) Die nichtige Bestimmung wird, soweit möglich, durch eine gültige Bestimmung mit gleichwertiger wirtschaftlicher Wirkung ersetzt;
- (c) Die Parteien verhandeln in gutem Glauben, um eine Ersatzbestimmung zu vereinbaren.

14.7. **Geografische Trennbarkeit.** Ist eine Bestimmung dieser AGB in einer bestimmten Jurisdiktion nicht durchsetzbar oder rechtswidrig:
- (a) Gilt diese Bestimmung nur in dieser Jurisdiktion nicht;
- (b) Sie bleibt in allen anderen Jurisdiktionen vollständig anwendbar;
- (c) Die lokale Nichtdurchsetzbarkeit berührt nicht die globale Gültigkeit der AGB.

14.8. **Kein Verzicht.** Das Unterlassen oder die Verzögerung der Ausübung eines Rechts durch SOS Expat stellt keinen Verzicht auf dieses Recht dar. Jeder Verzicht muss ausdrücklich und schriftlich erfolgen. Ein einmaliger Verzicht stellt keinen allgemeinen Verzicht dar.

14.9. **Unabhängigkeit der Klauseln.** Jede Klausel dieser AGB ist unabhängig. Die Unwirksamkeit einer Klausel führt nicht zur Unwirksamkeit der Klauseln über Haftungsbeschränkung, Freistellung, Schiedsgerichtsbarkeit oder Zuständigkeit, die im größtmöglichen gesetzlich zulässigen Umfang anwendbar bleiben.

14.10. **Dritte.** Diese AGB gewähren Dritten keine Rechte (mit Ausnahme der ausdrücklich genannten verbundenen Unternehmen von SOS Expat). Kein Dritter kann sich auf die Bestimmungen der AGB berufen.

---

## 15. Kontakt

Für rechtliche oder sonstige Anfragen: **https://sos-expat.com/contact**
`;
  const defaultCh = `
# 使用条款 – 海外互助者（全球版）

**SOS Expat by WorldExpat OÜ（“**平台**”、“**SOS**”、“**我们**”） 

**版本 2.2 – 最后更新：2025 年 6 月 16 日**

## 1. 定义

**海外互助者（“互助者”）：** 任何在平台上注册、以独立身份向用户提供非法律、非医疗的协助服务的个人（如指导、实际帮助、非正式翻译、当地联系等）。

**用户：** 使用平台联系互助者的任何人。

**匹配（联系）：** 平台在用户与互助者之间进行的技术/操作层面的引介（包括联系方式传递、沟通渠道开启、或互助者通过平台接受请求）。

**服务国家：** 在匹配时用户需求主要涉及的司法辖区；若无明确，则以请求日期的用户居住国为准。

**匹配费用：** 每次匹配须向 SOS 支付的固定费用（见第 7 条）：以 欧元支付为 **€19**，以 美元支付为 **$25 USD**，金额可调整，或按国家/货币制定本地费率表，并具有前瞻性效力。

**支付服务提供商：** 处理收款及资金分配的第三方服务。

---

## 2. 目的、适用范围与接受

2.1. 本使用条款规范互助者对平台的访问与使用。

2.2. SOS Expat 仅作为技术性匹配中介。 SOS Expat 不是互助者的雇主、代理或合作伙伴，不提供任何法律、医疗、税务、会计或其他受监管的建议，也不是互助者与用户之间合同的当事方。

2.3. **电子接受（点击同意):** 注册和/或使用平台即表示接受本条款，构成电子签署与合同同意。SOS 可保留技术性证据（时间戳、标识符等）。

2.4. **修改:** SOS 可通过在平台上发布方式更新条款和/或费率表（按国家/货币），更新具有前瞻性效力。继续使用即视为接受。

2.5. **专业身份（B2B):** 互助者声明其仅为职业目的行事；消费者保护法律不适用于 SOS Expat–互助者关系。

---

## 3. 互助者身份 – 合规、许可与责任

3.1. **独立性:** 互助者以独立专业人士身份行事；SOS Expat 与互助者之间不构成雇佣、代理、合作或合资关系。

3.2. **工作许可与移民身份** 互助者全权负责在每个服务国家获得并保持所有必要许可（签证、工作许可证、商业登记/个体经营、保险、当地执照等）。SOS Expat 不核实这些许可，也不承担任何责任。

3.3. **非受监管服务:** 互助者承诺不得提供受监管的服务（如法律、医疗、金融、会计、房地产咨询等），除非持有必要的许可/执照并完全遵守当地法律。否则，互助者应避免此类服务，并将用户转介给具有合法资质的专业人士（如注册律师）。

3.4. **一般合规** 互助者遵守适用法律/法规（消费者保护、电子商务、广告/营销、公平竞争、反洗钱/客户尽调（如适用）、税务、数据保护、制裁/出口管制、人员安全等）。

3.5. **保险** 互助者声明已持有必要保险（如职业责任险），涵盖其业务活动及服务地区。

3.6. **保密性** 互助者应保护用户信息，除法律要求或经同意外，不得泄露。

---

## 4. 账户、审查与安全

4.1. **注册:** 每位互助者仅可拥有一个账户；所填信息必须准确、完整并保持更新（身份、联系方式、服务描述、地区范围等）。

4.2. **验证:** SOS Expat 可进行合理检查（身份验证、资料一致性、制裁/尽调筛查等），并可因安全、合规或服务质量原因拒绝/暂停/撤销访问。

4.3. **账户安全:** 互助者须保护其登录凭证。任何账户下的操作均视为互助者本人行为。

4.4. **不活动。** 账户在365天不活动后可能会被自动停用。互助者可在履行义务后随时关闭其账户。SOS Expat 可因违反条款而暂停或终止账户。

4.5. **电子通信。** 互助者同意通过电子方式（电子邮件、应用内通知、平台发布）接收通知。

---

## 5. 使用规则 – 质量、禁止行为、禁止规避

5.1. **质量与真实描述:** 互助者必须准确描述服务内容，不得承诺结果。不得虚假宣称专业身份（如未具备受监管职业资格）。

5.2. **禁止事项。** 禁止违法、歧视或误导性内容；不正当竞争；滥用数据；规避或逆向工程平台；恶意合谋/抵制；违反制裁或出口限制；任何非法活动。

5.3. **禁止规避。** 每次通过平台与新用户建立的新匹配均须支付匹配费用（第 7 条）。严禁为避免该费用而绕过平台进行新引介。

5.4. **可用性。** 平台按**“原样”**提供；不保证持续可用（维护、事故、不可抗力等）。在法律要求下可限制访问。

---

## 6. 协助者–用户关系（平台外）

6.1. 匹配后，互助者与用户可在平台外自行签订合同。服务费与条款由双方自由约定，须符合当地法律。

6.2. 互助者应提供符合当地法律的服务确认/条款，并自行处理开票与纳税义务。

6.3. SOS Expat 不对互助者服务的质量、准确性或结果负责，也不对互助者与用户之间的任何承诺承担责任。

---

## 7. 费用、单次付款与税务

7.1. **匹配费用（固定费率）。 每次匹配收费 €19（欧元） 或 $25（美元）**，不含税及支付服务费用。SOS Expat 可调整金额及/或按国家/货币发布本地费率表，具前瞻性效力。

7.2. **一次性支付与分配。** 用户通过平台进行一次性支付，涵盖 (i) 互助者报酬（双方约定）及 (ii) SOS Expat 的匹配费用。SOS Expat（或其服务商）收款后，扣除费用并将余额转给互助者。互助者授权此类扣除与分配。

7.3. **应付且不退款。** 匹配费用自匹配达成即应付且不可退还（除非 SOS Expat 出于善意、且在法律允许范围内、因平台自身原因造成失败而决定退款）。

7.4. **用户退款。** 若用户获批退款，该金额从互助者份额中扣除：SOS Expat 可抵扣/保留未来支付款，或在无未来支付时要求返还。匹配费用不退，除非 SOS Expat 自主决定。

7.5. **货币与兑换。** 平台可支持多种货币；可能适用服务商汇率及手续费。

7.6. **税费。** 互助者自行承担所有适用税费（增值税、所得税、社保等）。SOS Expat 在必要时收取/代缴匹配费用相关增值税或同等税项。

7.7. **抵销。** SOS Expat 可将互助者所欠款项与其应收款项相互抵销。

---

## 8. 个人数据（全球框架 – GDPR/DSA）

8.1. **角色。** 就为匹配目的接收的用户数据而言，SOS Expat 与互助者各自依据**欧盟法规 2016/679 (GDPR)** 为其自身目的担任独立的数据控制者。

8.2. **法律依据与目的。** 合同履行（匹配）、合法利益（安全、防欺诈、改进）、法律合规（反洗钱、制裁）及必要时的同意。

8.3. 国际传输在必要时附带适当保障措施。

8.4. **权利与联系。** 用户可通过平台的联系表单行使相关权利。

8.5. **安全。** 采取合理的技术和组织措施；数据泄露将依照适用法律通报。

8.6. 互助者根据服务国家法律处理数据。

8.7. **DSA 合规。** 平台作为**欧盟法规 2022/2065（数字服务法）**下的**中介服务**运营。SOS Expat 实施非法内容举报机制，并依据 DSA 与主管当局合作。

---

## 9. 知识产权

平台及其商标、标识、数据库和内容受保护。除在条款有效期内享有个人的、非独占、不可转让的访问权外，互助者不获得任何权利。互助者提供的内容授予 SOS Expat 全球性、非独占许可，用于平台的托管与展示。

---

## 10. 免责声明、责任与赔偿

10.1. 不作任何保证，包括成果、质量或业务量；平台按**“原样”**提供。

10.2. **责任限制：** 在法律允许范围内，SOS Expat 对互助者的总责任仅限于直接损失，且不得超过 SOS Expat 在引发索赔的匹配交易中所收取的匹配费用总额。

10.3. **排除责任：** SOS Expat 不承担任何间接、连带、特殊或惩罚性损失（包括利润损失、机会损失、客户流失、声誉损害、替代成本等）。

10.4. **赔偿义务：** 互助者应赔偿并保障 SOS Expat（及其关联方、管理人员、员工、代理）免受因以下情况产生的任何索赔、损害、罚款或费用（包括律师费）：(i) 违反本条款/法律，(ii) 提供的内容，(iii) 服务或疏忽行为，(iv) 无合法工作/移民/执照许可。

10.5. **追索权放弃。** 互助者**明确且不可撤销地放弃**对 SOS Expat 的任何追索权，包括：(i) 因提供服务产生的损害，(ii) 间接损失，(iii) 与用户的合同纠纷，(iv) 互助者所提供服务的任何缺陷。此放弃在法律允许的最大范围内适用。

10.6. **无代表关系。** 本条款不构成 SOS Expat 与互助者之间的代理、雇佣、合作或合资关系。

10.7. **不可抗力。** SOS Expat 不对因**不可抗力**事件（自然灾害、战争、流行病、网络攻击、电力或互联网中断、政府决定、罢工等）造成的延迟或故障承担责任。

10.8. **存续条款。** 第 5、7、8、9、10、11、12 条在终止后仍有效。

---

## 11. 适用法律 – 仲裁 – 爱沙尼亚司法管辖 – 集体诉讼放弃

11.1. **实体法：** 每次匹配中，SOS Expat–互助者关系受服务国家法律管辖，受当地强制性法律及国际强制规范约束。补充适用及本条款的解释/效力或任何未被服务国家法律规制的事项，适用爱沙尼亚法。

11.2. **强制 ICC 仲裁：** SOS Expat 与互助者的任何争议应根据国际商会仲裁规则（ICC）最终解决。仲裁地：爱沙尼亚塔林。 语言：法语。 仲裁庭适用第 11.1 条所述实体法。程序保密。

11.3. **集体诉讼放弃：** 在法律允许范围内，任何集体/代表性诉讼均被排除；仅允许个人索赔。

11.4. **爱沙尼亚法院专属管辖：** 对于不可仲裁事项、裁决执行或紧急措施，爱沙尼亚法院（塔林有管辖权）享有专属管辖权。互助者放弃任何关于法院选择或不便法院的异议。

---

## 12. 其他条款

12.1. **转让。** SOS Expat 可将本条款转让给其关联实体或继承方；互助者未经书面同意不得转让。

12.2. **完整协议。** 本条款构成完整协议，取代此前关于同一主题的任何协议。

12.3. **通知。** 通过平台公告、应用内通知或联系表单发出。

12.4. **解释。** 标题仅为方便阅读，不具法律效力；不适用**“不利起草方解释”**规则。

12.5. **语言。** 可能提供翻译版本；如有歧义，以法语版为准。

12.6. **可分割性。** 若任何条款无效/不可执行，其余条款仍有效；可在可能范围内以具有等效效力的有效条款替代。

12.7. **权利不弃。** 未行使权利不构成放弃。

---

## 13. 联系方式

如有任何问题或法律请求，请联系我们：
`;

  const defaultAr = `
# شروط وأحكام الاستخدام العامة – المغتربون المساعدون (عالمي)

**SOS Expat** هي خدمة تديرها **WorldExpat OÜ**، شركة مسجلة وفق القانون الإستوني (سجل الشركات رقم 16885621)، ومقرها الرئيسي في Harju maakond, Tallinn, Kesklinna linnaosa, Tornimäe tn 3/5/7, 10145، إستونيا (يُشار إليها فيما يلي بـ"**المنصة**" أو "**SOS**" أو "**SOS Expat**" أو "**نحن**").

**الإصدار 3.0 – آخر تحديث: 1 فبراير 2026**

---

## 1. التعريفات

**المغترب المساعد** ("**المساعد**"): أي شخص طبيعي مسجل على المنصة لتقديم خدمات مساعدة **غير قانونية وغير طبية** بصفة مستقلة للمستخدمين (التوجيه، الإجراءات العملية، المرافقة، الترجمة غير الرسمية، التواصل المحلي، إلخ).

**المستخدم**: أي شخص يستخدم المنصة للتواصل مع مساعد.

**التوصيل / الربط**: التقديم التقني والتشغيلي الذي تقوم به المنصة بين المستخدم والمساعد، ويتمثل في: (أ) نقل بيانات الاتصال، و/أو (ب) فتح قناة اتصال (مكالمة، رسالة، مكالمة فيديو)، و/أو (ج) قبول المساعد لطلب مقدم عبر المنصة.

**بلد التدخل**: الولاية القضائية المستهدفة بشكل رئيسي بطلب المستخدم وقت التوصيل. في حال عدم التحديد، يُعتبر بلد إقامة المستخدم في تاريخ الطلب؛ وفي حالة تعدد الولايات القضائية، تُعتبر الولاية الأوثق صلة بموضوع الطلب.

**رسوم التوصيل**: الرسوم الثابتة المستحقة لـ SOS عن كل توصيل (المادة 7): **19 يورو** إذا تم الدفع بـ **اليورو** أو **25 دولار أمريكي** إذا تم الدفع بـ **الدولار الأمريكي**، مع إمكانية تعديل هذه المبالغ و/أو نشر جداول تعرفة محلية حسب البلد/العملة، بأثر مستقبلي.

**مزود(و) الدفع**: الخدمات الخارجية المستخدمة لتحصيل الدفعة الموحدة من المستخدم وتوزيع الأموال.

**قوائم العقوبات**: قوائم الأشخاص والكيانات والدول الخاضعة لعقوبات اقتصادية أو حظر، بما في ذلك قوائم مكتب مراقبة الأصول الأجنبية (OFAC) الأمريكي، والاتحاد الأوروبي، والأمم المتحدة، وخزانة صاحب الجلالة البريطانية (HMT)، وأي سلطة مختصة أخرى.

---

## 2. الموضوع والنطاق والقبول

2.1. تحكم هذه الشروط والأحكام العامة الوصول إلى المنصة واستخدامها من قبل المساعدين.

2.2. **تعمل SOS Expat حصرياً كوسيط تقني للتوصيل.** SOS Expat ليست صاحب عمل أو وكيل أو شريك للمساعدين، ولا تقدم أي استشارات قانونية أو طبية أو ضريبية أو محاسبية أو منظمة، وليست طرفاً في العقود المبرمة بين المساعدين والمستخدمين.

2.3. **القبول الإلكتروني (Click-wrap) والتتبع.** يقبل المساعد هذه الشروط بوضع علامة في المربع المخصص عند التسجيل و/أو باستخدام المنصة. يُعد هذا الفعل توقيعاً إلكترونياً وموافقة تعاقدية وفقاً للائحة (الاتحاد الأوروبي) رقم 910/2014 (eIDAS). تحتفظ SOS Expat بـ **سجلات تدقيق مختومة زمنياً** تتضمن: (أ) التاريخ والوقت الدقيقين (بالتوقيت العالمي المنسق) للقبول، (ب) عنوان IP الخاص بالمساعد، (ج) معرف الجلسة الفريد، (د) وكيل مستخدم المتصفح، (هـ) إصدار الشروط المقبولة، (و) البصمة التشفيرية للوثيقة المقبولة، (ز) المعرف الفريد للمساعد. تُشكل هذه السجلات **دليلاً قانونياً قابلاً للاحتجاج به** على قبول الشروط.

2.4. **حفظ أدلة القبول.** وفقاً للائحة العامة لحماية البيانات (GDPR) والالتزامات القانونية للحفظ، تحتفظ SOS Expat بأدلة قبول الشروط لمدة **عشر (10) سنوات** من تاريخ القبول، أو حتى انتهاء أي نزاع قائم حسب الاقتضاء. يمكن للمساعد، بناءً على طلب كتابي عبر نموذج الاتصال، الحصول على **شهادة قبول** تتضمن عناصر الإثبات المذكورة أعلاه. يستند هذا الحفظ إلى المصلحة المشروعة لـ SOS Expat في امتلاك أدلة في حالة النزاع (المادة 6.1.و من GDPR) وإلى الالتزام القانوني بحفظ العقود التجارية.

2.5. **التعديلات.** يجوز لـ SOS تحديث هذه الشروط و/أو جداول الرسوم (حسب البلد/العملة) في أي وقت، بأثر مستقبلي بعد النشر على المنصة. يُعد الاستمرار في الاستخدام قبولاً. في حالة إجراء تعديل جوهري، سيُدعى المساعد لإعادة تأكيد قبوله، والذي سيُتتبع مرة أخرى وفقاً لأحكام المادة 2.3.

2.6. **الأهلية المهنية (B2B).** يُقر المساعد بأنه يتصرف **حصرياً لأغراض مهنية**؛ ولا تنطبق أنظمة حماية المستهلك على العلاقة بين SOS Expat والمساعد.

2.7. **المدة.** غير محددة.

---

## 3. وضع المساعد – الاستقلالية والامتثال والإقرارات

3.1. **الاستقلالية.** يعمل المساعد بصفته **مهنياً مستقلاً**؛ ولا تُنشأ أي علاقة توظيف أو وكالة أو شراكة أو مشروع مشترك مع SOS Expat.

3.2. **تصريح العمل ووضع الهجرة.** المساعد هو **المسؤول الوحيد** عن الحصول على جميع التصاريح اللازمة في كل بلد تدخل والحفاظ عليها (تأشيرة، تصريح عمل، تسجيل نشاط/عمل حر، تأمينات، تراخيص محلية، إلخ). **لا تتحقق** SOS Expat من هذه التصاريح و**لا تتحمل أي مسؤولية** في هذا الشأن.

3.3. **الخدمات غير المنظمة.** يلتزم المساعد بـ **عدم تقديم خدمات منظمة** (مثل الاستشارات القانونية أو الطبية أو المالية أو المحاسبية أو العقارية، إلخ) **دون** امتلاك **التصاريح/التراخيص** اللازمة **و** دون الامتثال الكامل للقوانين المحلية. وإلا، يمتنع عن تقديم مثل هذه الخدمات ويحيل المستخدم إلى متخصص مرخص حسب الأصول (مثل محامٍ مسجل).

3.4. **الامتثال العام.** يلتزم المساعد بالقوانين واللوائح المعمول بها (حماية المستهلك، التجارة الإلكترونية، الإعلان/التسويق، المنافسة العادلة، مكافحة غسل الأموال/اعرف عميلك عند الاقتضاء، الضرائب، حماية البيانات، العقوبات/الرقابة على الصادرات، سلامة الأشخاص).

3.5. **التأمينات.** يُقر المساعد بامتلاكه التأمينات اللازمة (المسؤولية المدنية المهنية، عند الاقتضاء) التي تغطي أنشطته ومناطق تدخله.

3.6. **الامتثال لتشريعات بلد التدخل.** يلتزم المساعد بالامتثال لجميع القوانين واللوائح المعمول بها في كل بلد تدخل يقدم فيه خدماته، بما في ذلك على سبيل المثال لا الحصر: قوانين العمل، واللوائح الضريبية، وقواعد حماية المستهلك، ومتطلبات التراخيص المهنية، وأي إطار تنظيمي محلي آخر معمول به. يُقر المساعد بأن SOS Expat **لا تضمن** امتثال المساعد للقوانين المحلية و**لا تتحمل أي مسؤولية** عن أي انتهاك يرتكبه المساعد.

3.7. **إقرارات وضمانات المساعد.** بالتسجيل على المنصة، يُقر المساعد ويضمن صراحةً أنه:
- (أ) **بالغ** وفقاً لقانون بلد إقامته و/أو ممارسته؛
- (ب) يتمتع بـ **الأهلية القانونية الكاملة** للتعاقد وممارسة نشاطه؛
- (ج) ليس خاضعاً للوصاية أو القوامة أو الحماية القضائية أو أي نظام حماية مماثل؛
- (د) ليس ممنوعاً من **ممارسة** نشاطه، سواء مؤقتاً أو نهائياً؛
- (هـ) لم يتم شطبه أو إيقافه أو استبعاده من أي هيئة مهنية ذات صلة؛
- (و) ليس خاضعاً لأي **إجراء تأديبي جارٍ** قد يؤدي إلى التعليق أو الشطب (أو يلتزم بإبلاغ SOS Expat فوراً في حال حدوث ذلك)؛
- (ز) لا يظهر على **أي قائمة عقوبات** (OFAC، الاتحاد الأوروبي، الأمم المتحدة، HMT، أو غيرها)؛
- (ح) لم تتم **إدانته جنائياً** بأفعال تتعارض مع ممارسة نشاطه؛
- (ط) جميع المعلومات المقدمة عند التسجيل **دقيقة وكاملة ومحدثة**؛
- (ي) يلتزم بـ **إبلاغ SOS Expat فوراً** بأي تغيير يؤثر على هذه الإقرارات.
يُعد أي إقرار كاذب انتهاكاً جسيماً لهذه الشروط قد يؤدي إلى الحظر الفوري والنهائي، دون الإخلال بأي دعوى تعويضية.

3.8. **السرية.** يحمي المساعد معلومات المستخدمين ويمتنع عن إفشائها، إلا بموجب التزام قانوني أو موافقة.

---

## 4. إنشاء الحساب والتحقق والأمان

4.1. **التسجيل.** حساب واحد (1) لكل مساعد؛ يجب أن تكون المعلومات دقيقة وكاملة ومحدثة (الهوية، وسائل الاتصال، وصف الخدمات، مناطق التدخل، إلخ).

4.2. **التحقق.** يجوز لـ SOS Expat إجراء فحوصات معقولة (الهوية، اتساق الملف الشخصي، فحوصات العقوبات/اعرف عميلك عبر مزودي الخدمة) ورفض/تعليق/إزالة الوصول لأسباب تتعلق بالأمان أو الامتثال أو جودة الخدمة.

4.3. **أمان الدخول.** يحمي المساعد بيانات اعتماده. أي نشاط عبر الحساب يُعتبر منفذاً من قبله.

4.4. **إجراءات التحقق التكميلي في أي وقت.** تحتفظ SOS Expat بالحق في طلب من المساعد، **في أي وقت ودون الحاجة لتبرير طلبها**، تقديم أو تحديث أي وثيقة تثبت حقه في الممارسة، أو تسجيله المهني أو ما يعادله، أو تأمين المسؤولية المدنية المهنية، أو هويته، أو أي إثبات آخر ذي صلة. يلتزم المساعد بالرد على هذه الطلبات خلال **سبعة (7) أيام عمل**. قد يؤدي عدم الرد أو تقديم وثائق غير مطابقة إلى التعليق الفوري للحساب.

4.5. **الإشراف ومراقبة الجودة.** تنفذ SOS Expat سياسة إشراف تهدف إلى ضمان جودة وامتثال الخدمات المقدمة على المنصة. قد يشمل هذا الإشراف: (أ) التحقق من الملفات الشخصية والمحتوى المنشور، (ب) تحليل تقييمات وشكاوى المستخدمين، (ج) مراقبة الامتثال للشروط والقوانين المعمول بها، (د) أي إجراء معقول آخر لمراقبة الجودة. يقبل المساعد الخضوع لهذا الإشراف.

4.6. **التعليق المؤقت للحساب.** يجوز لـ SOS Expat **تعليق حساب المساعد فوراً ودون إشعار مسبق** في الحالات التالية:
- (أ) الاشتباه في الاحتيال أو انتحال الهوية أو الإقرار الكاذب؛
- (ب) الشكاوى المتعددة أو الجسيمة من المستخدمين؛
- (ج) عدم تقديم الوثائق المطلوبة بموجب المادة 4.4؛
- (د) الانتهاك المؤكد أو المشتبه به للشروط أو القوانين المعمول بها؛
- (هـ) السلوك الذي يضر بصورة أو سمعة المنصة؛
- (و) أمر من سلطة قضائية أو إدارية أو مهنية؛
- (ز) أي سبب مشروع آخر تقدره SOS Expat وفق تقديرها المطلق.
خلال فترة التعليق، لا يمكن للمساعد الوصول إلى حسابه أو استلام توصيلات جديدة. يجوز حجز المدفوعات المعلقة حتى توضيح الوضع.

4.7. **الحظر النهائي (الإنهاء بسبب المخالفة).** يجوز لـ SOS Expat **إنهاء حساب المساعد نهائياً ودون إشعار مسبق** ("الحظر") في الحالات التالية:
- (أ) الانتهاك الجسيم أو المتكرر للشروط؛
- (ب) الاحتيال المؤكد أو الإقرار الكاذب المتعمد أو انتحال الهوية/الصفة؛
- (ج) فقدان الحق في الممارسة (الشطب، التعليق المهني، عدم تجديد التسجيل)؛
- (د) الإدانة الجنائية التي تتعارض مع ممارسة النشاط؛
- (هـ) السلوك الضار بشكل جسيم بالمستخدمين أو المنصة؛
- (و) العودة للمخالفة بعد تعليق مؤقت؛
- (ز) التحايل المؤكد على المنصة لتجنب رسوم التوصيل؛
- (ح) عدم الامتثال لالتزامات التحقق من الهوية (KYC) رغم التذكيرات؛
- (ط) أي سبب جسيم آخر تقدره SOS Expat وفق تقديرها المطلق.
الحظر **نهائي وغير قابل للإلغاء**. لا يمكن للمساعد المحظور إنشاء حساب جديد. يجوز حجز الأموال المعلقة كتعويضات جزافية، دون الإخلال بأي دعوى تعويضية أخرى.

4.8. **الإجراءات والإشعار.** في حالة التعليق أو الحظر، تُخطر SOS Expat المساعد بالبريد الإلكتروني على العنوان المسجل. يوضح هذا الإشعار سبب الإجراء (ما لم يكن هناك التزام قانوني بالسرية). يحق للمساعد تقديم ملاحظاته كتابياً عبر نموذج الاتصال خلال **خمسة عشر (15) يوماً**. تدرس SOS Expat هذه الملاحظات لكنها غير ملزمة برفع الإجراء. قرار SOS Expat **تقديري ونهائي**.

4.9. **آثار التعليق أو الحظر.** في حالة التعليق أو الحظر:
- (أ) يُحظر الوصول إلى الحساب فوراً؛
- (ب) يُزال ملف المساعد من نتائج البحث؛
- (ج) يجوز إلغاء التوصيلات الجارية؛
- (د) يجوز حجز المدفوعات المعلقة أو مقاصتها مع أي مبلغ مستحق لـ SOS Expat؛
- (هـ) يظل المساعد ملزماً بالتزاماته (السرية، عدم الاستقطاب، إلخ) وفقاً لبنود البقاء.

4.10. **عدم النشاط.** في حالة **عدم النشاط لأكثر من 365 يوماً**، يجوز تعطيل الحساب تلقائياً بعد الإشعار. يمكن للمساعد إعادة تنشيط حسابه عند الطلب، بشرط تقديم وثائق التحقق المطلوبة.

4.11. **الإنهاء الطوعي.** يمكن للمساعد إغلاق حسابه في أي وقت بعد الوفاء بالتزاماته الجارية (الخدمات المقبولة، المبالغ المستردة المحتملة). يتم طلب الإغلاق عبر نموذج الاتصال. تقوم SOS Expat بالإغلاق خلال **ثلاثين (30) يوماً**.

4.12. **الاتصالات الإلكترونية.** يوافق المساعد على تلقي أي إشعار يتعلق بالشروط والإشراف وإجراءات التعليق/الحظر عبر الوسائل الإلكترونية (البريد الإلكتروني، الإشعارات داخل التطبيق، النشر على المنصة). يلتزم المساعد بالحفاظ على عنوان بريد إلكتروني صالح ومراجعة إشعاراته بانتظام.

---

## 5. قواعد الاستخدام – الجودة، المحظورات، عدم التحايل

5.1. **الجودة والوصف الدقيق.** يصف المساعد خدماته بدقة، دون وعد بنتائج. لا يدعي **أي صفة زائفة** (مثل مهنة منظمة لا يحملها).

5.2. **المحظورات.** المحتوى غير القانوني أو التمييزي أو المضلل؛ الممارسات غير العادلة؛ الجمع أو الاستخدام التعسفي للبيانات؛ التحايل/الهندسة العكسية للمنصة؛ التواطؤ/المقاطعة بهدف الإضرار؛ انتهاكات العقوبات/الرقابة على الصادرات؛ أي نشاط غير قانوني.

5.3. **عدم التحايل.** كل **توصيل جديد** مع **مستخدم جديد** عبر المنصة يترتب عليه **رسوم التوصيل** (المادة 7). **يُحظر** تجنب هذه الرسوم بالتحايل على المنصة لتقديم جديد.

5.4. **التوافر.** المنصة مقدمة **"كما هي"**؛ لا ضمان للتوافر المستمر (الصيانة، الحوادث، القوة القاهرة). قد يُقيد الوصول إذا تطلب القانون ذلك.

---

## 6. العلاقة بين المساعد والمستخدم (خارج المنصة)

6.1. بعد التوصيل، يمكن للمساعد والمستخدم التعاقد **خارج المنصة**. **الأتعاب** والشروط تُحدد بحرية بينهما، مع مراعاة القوانين المحلية.

6.2. يقدم المساعد **شروط/تأكيدات الخدمة** المتوافقة مع القانون المحلي، ويدير **فواتيره** و**التزاماته الضريبية**.

6.3. SOS Expat **ليست مسؤولة** عن جودة أو دقة أو نتيجة خدمات المساعد، ولا عن الالتزامات المتخذة بين المساعد والمستخدم.

---

## 7. الرسوم والدفعة الموحدة والضرائب

7.1. **رسوم التوصيل (السعر الثابت).** تبلغ رسوم التوصيل حالياً **19 يورو (EUR)** أو **25 دولار أمريكي (USD)** لكل توصيل، باستثناء الضرائب ورسوم مزود الدفع. **هذه المبالغ إرشادية وقابلة للتعديل في أي وقت.** تحتفظ SOS Expat بالحق في تعديل هذه المبالغ و/أو نشر جداول تعرفة محلية حسب البلد/العملة، بأثر مستقبلي بعد النشر على المنصة. يُدعى المساعد للاطلاع بانتظام على جدول التعرفة المعمول به المتاح في مساحته الشخصية.

7.2. **هيكل السعر المعروض للعميل وتوزيع الأموال.** السعر المعروض للمستخدم على المنصة **يتضمن** رسوم التوصيل الخاصة بـ SOS Expat. يقوم المستخدم بدفعة موحدة عبر المنصة. **يتم توزيع الأموال كما يلي:**
- (أ) **المبلغ المدفوع من المستخدم** = أتعاب المساعد + رسوم التوصيل لـ SOS Expat؛
- (ب) **المبلغ الصافي المحول للمساعد** = المبلغ المدفوع من المستخدم − رسوم التوصيل لـ SOS Expat − الرسوم البنكية لمزود الدفع − رسوم تحويل العملة (عند الاقتضاء).

يفوض المساعد صراحةً SOS Expat بإجراء هذه الخصومات قبل أي تحويل. **يُعرض المبلغ الدقيق الذي سيُحول للمساعد في لوحة التحكم قبل وبعد كل معاملة.**

7.3. **الرسوم البنكية لمزود الدفع.** يحصّل مزود الدفع (Stripe أو ما يعادله) رسوم معالجة على كل معاملة. **هذه الرسوم البنكية تقع بالكامل على عاتق المساعد** وتُخصم تلقائياً من المبلغ المحول إليه. تفاصيل هذه الرسوم متاحة في شروط مزود الدفع وفي لوحة تحكم المساعد لكل معاملة.

7.4. **رسوم الصرف وتحويل العملات.** عندما تختلف عملة دفع المستخدم عن عملة الحساب البنكي للمساعد، تُطبق **رسوم تحويل عملات** من قبل مزود الدفع. **رسوم الصرف هذه تقع بالكامل على عاتق المساعد** وتُخصم من المبلغ المحول إليه. أسعار الصرف المطبقة هي تلك الخاصة بمزود الدفع وقت التحويل. يُقر المساعد ويقبل صراحةً أن SOS Expat ليس لها أي سيطرة على أسعار الصرف هذه وتُخلي مسؤوليتها عن تقلبات العملات أو الرسوم المطبقة من قبل المزود.

7.5. **حساب المبلغ الصافي المحول.** يُحسب المبلغ الصافي المحول للمساعد وفق الصيغة: **المبلغ المدفوع من المستخدم − رسوم التوصيل − الرسوم البنكية للمزود − رسوم الصرف (عند الاقتضاء)**. يختلف المبلغ الدقيق حسب الرسوم المعمول بها وقت المعاملة. **يُعلم المساعد بالمبلغ الدقيق الذي سيحصل عليه في لوحة التحكم قبل كل خدمة ويمكنه بالتالي اتخاذ قرار مستنير بقبول أو رفض التوصيل.**

7.6. **الاستحقاق وعدم الاسترداد.** رسوم التوصيل مستحقة فور التوصيل الفعلي و**غير قابلة للاسترداد** (إلا بموجب بادرة حسن نية تقديرية من SOS Expat في حالة فشل يُعزى حصرياً للمنصة وبالقدر الذي يسمح به القانون).

7.7. **استرداد المستخدم.** إذا مُنح استرداد للمستخدم، فإنه يُحسم من حصة المساعد: يجوز لـ SOS Expat حجز/مقاصة المبلغ المقابل من المدفوعات المستقبلية للمساعد، أو طلب السداد المباشر إذا لم تكن هناك مدفوعات مستحقة. تظل رسوم التوصيل مكتسبة لـ SOS Expat، إلا بموجب قرار تقديري مخالف.

7.8. **مواعيد الدفع.** بشرط إكمال عملية التحقق من الهوية (KYC) (المادة 8)، تُحول الأموال للمساعد خلال **سبعة (7) أيام عمل** بعد تقديم الخدمة، إلا في حالة وجود نزاع أو شكوى من المستخدم أو التحقق من الامتثال الجاري.

7.9. **الضرائب.** يظل المساعد **المسؤول الوحيد** عن جميع التزاماته الضريبية (ضريبة الدخل، ضريبة القيمة المضافة، الاشتراكات الاجتماعية، الرسوم المهنية، إلخ) في ولايته القضائية للإقامة و/أو الممارسة. المبالغ المحولة للمساعد هي **مبالغ إجمالية**؛ والمساعد مسؤول عن التصريح بجميع الضرائب المستحقة ودفعها. تحصّل SOS Expat وتحول، عند الاقتضاء بموجب القانون، ضريبة القيمة المضافة/ما يعادلها محلياً على رسوم التوصيل فقط.

7.10. **المقاصة.** يجوز لـ SOS Expat مقاصة أي مبلغ مستحق عليها للمساعد (بموجب استرداد للمستخدم أو غرامة أو التزام آخر) مع أي مبلغ مستحق للمساعد.

7.11. **الشفافية في التعرفة والسجل.** يمكن للمساعد في أي وقت الاطلاع في لوحة التحكم الشخصية على: (أ) التفاصيل الكاملة لكل معاملة، (ب) المبلغ الإجمالي المدفوع من المستخدم، (ج) رسوم التوصيل المخصومة، (د) الرسوم البنكية لمزود الدفع، (هـ) رسوم الصرف عند الاقتضاء، (و) المبلغ الصافي المحول أو المستحق التحويل، (ز) سجل جميع معاملاته. تُحفظ هذه المعلومات وتبقى متاحة طوال مدة الحساب و**خمس (5) سنوات** بعد إغلاقه.

---

## 8. المدفوعات – KYC/مكافحة غسل الأموال – العقوبات

8.1. **مزودو الدفع.** تتم معالجة المدفوعات بواسطة **مزودين خارجيين** (Stripe، إلخ). يقبل المساعد شروطهم وإجراءات التحقق **KYC/مكافحة غسل الأموال** الخاصة بهم.

8.2. يجوز لـ SOS Expat تأجيل أو حجز أو إلغاء المدفوعات في حالة الاشتباه في الاحتيال أو عدم الامتثال أو الأمر القانوني.

8.3. **العقوبات الدولية والحظر.** يُقر المساعد ويضمن:
- (أ) عدم ظهوره، مباشرة أو غير مباشرة، على **قائمة عقوبات** (OFAC/SDN، الاتحاد الأوروبي، الأمم المتحدة، HMT، أو أي قائمة عقوبات أخرى معمول بها)؛
- (ب) عدم امتلاكه أو سيطرته، مباشرة أو غير مباشرة، من قبل شخص أو كيان يظهر على قائمة عقوبات؛
- (ج) عدم كونه مقيماً أو مواطناً أو متواجداً في بلد خاضع لـ **حظر شامل** (حالياً: كوريا الشمالية، إيران، سوريا، كوبا، مناطق القرم/دونيتسك/لوهانسك، أو أي إقليم آخر يُضاف لاحقاً)؛
- (د) عدم استخدام المنصة لمعاملات تشمل أشخاصاً أو كيانات أو دولاً خاضعة للعقوبات؛
- (هـ) الامتثال لجميع **قوانين الرقابة على الصادرات** المعمول بها.
تحتفظ SOS Expat بالحق في **تقييد أو حظر الوصول فوراً** إلى المنصة في أي إقليم خاضع للعقوبات أو الحظر، أو لأي مساعد يُشتبه في انتهاكه لهذه الأحكام، دون إشعار مسبق أو تعويض. يجوز لـ SOS Expat أيضاً أن تكون ملزمة بـ **تجميد أموال** المساعد في حالة صدور أمر من سلطة مختصة.

8.4. **التزام إكمال عملية التحقق (KYC).** لاستلام المدفوعات الناتجة عن الخدمات المقدمة عبر المنصة، يلتزم المساعد بإكمال عملية التحقق من الهوية (KYC - اعرف عميلك) لدى شريكنا في الدفع Stripe في أقرب وقت ممكن بعد التسجيل. يُقر المساعد بأن عدم إكمال التحقق من الهوية يمنع تقنياً تحويل الأموال إلى حسابه البنكي.

### الأموال غير المطالب بها والتحقق من الهوية KYC

8.5. **حفظ الأموال المعلقة.** عندما يتم دفع مبلغ من قبل مستخدم مقابل خدمة قدمها مساعد لم يُكمل التحقق من هويته، تُحفظ الأموال المقابلة لحصة المساعد (بعد خصم رسوم التوصيل للمنصة) في حساب ضمان. تلتزم المنصة بـ:
- إشعار المساعد بالبريد الإلكتروني بوجود أموال معلقة؛
- إرسال تذكيرات منتظمة (في 7 أيام، 30 يوماً، 60 يوماً، 90 يوماً، 120 يوماً، و150 يوماً)؛
- تزويد المساعد بجميع الوسائل اللازمة لإكمال التحقق من هويته.

8.6. **الأموال غير المطالب بها والسقوط.** في حال عدم إكمال التحقق من الهوية خلال **مائة وثمانين (180) يوماً** من تاريخ أول دفعة معلقة، ورغم الإشعارات المنصوص عليها في المادة 8.5، تُعتبر الأموال **متخلى عنها** من قبل المساعد. يُقر المساعد ويقبل صراحةً أن:
- (أ) الأموال غير المطالب بها خلال هذه الفترة ستؤول نهائياً للمنصة كتعويض جزافي عن تكاليف الإدارة والحفظ ومحاولات الاتصال؛
- (ب) هذا الاكتساب هو مقابل التكاليف الإدارية التي تتحملها المنصة لإدارة الأموال غير المطالب بها؛
- (ج) يتنازل صراحةً عن أي مطالبة بهذه الأموال بعد انقضاء فترة 180 يوماً.

8.7. **المطالبة الاستثنائية.** استثناءً من المادة 8.6، يجوز للمساعد تقديم طلب مطالبة مسبب خلال مدة أقصاها **اثنا عشر (12) شهراً** بعد انقضاء فترة 180 يوماً، فقط في الحالات التالية: عدم القدرة الطبية الموثقة، القوة القاهرة المبررة حسب الأصول، أو الخطأ التقني المنسوب للمنصة. ستدرس المنصة الطلب خلال 30 يوماً وتحتفظ بالحق في قبول أو رفض المطالبة. في حالة القبول، ستُحتجز رسوم معالجة قدرها **عشرون بالمائة (20%)** من المبلغ المسترد.

8.8. **القبول الصريح.** بالتسجيل على المنصة كمساعد، يُقر بأنه اطلع على هذه الشروط المتعلقة بالأموال غير المطالب بها ويقبلها صراحةً. يُشكل هذا القبول شرطاً جوهرياً وحاسماً للوصول إلى وضع مقدم الخدمة على المنصة.

8.9. **التعاون القانوني.** يلتزم المساعد بالتعاون مع SOS Expat والسلطات المختصة في حالة التحقيق المتعلق بغسل الأموال أو تمويل الإرهاب أو أي جريمة مالية أخرى.

---

## 9. البيانات الشخصية (الإطار العالمي – GDPR/DSA)

9.1. **الأدوار.** فيما يتعلق ببيانات المستخدمين المستلمة لأغراض التوصيل، يعمل كل من **SOS Expat والمساعد** **كل منهما** بصفته **مسؤول معالجة** لأغراضه الخاصة، وفقاً لـ **اللائحة (الاتحاد الأوروبي) 2016/679 (GDPR)**.

9.2. **الأسس والأغراض.** تنفيذ العقد (التوصيل)، المصالح المشروعة (الأمان، منع الاحتيال، التحسين)، الامتثال القانوني (مكافحة غسل الأموال، العقوبات)، والموافقة عند الاقتضاء.

9.3. **النقل الدولي** مع **ضمانات مناسبة** عند الاقتضاء (البنود التعاقدية النموذجية، قرارات الملاءمة، إلخ).

9.4. **الحقوق والاتصال.** ممارسة الحقوق (الوصول، التصحيح، المحو، قابلية النقل، الاعتراض) عبر **نموذج الاتصال** الخاص بالمنصة.

9.5. **الأمان.** تدابير تقنية/تنظيمية معقولة؛ الإخطار بالانتهاكات وفقاً للقوانين المعمول بها (72 ساعة وفقاً لـ GDPR).

9.6. يعالج المساعد البيانات وفقاً لقانون **بلد التدخل**.

9.7. **الامتثال لـ DSA.** تعمل المنصة بصفتها **خدمة وسيطة** بموجب **اللائحة (الاتحاد الأوروبي) 2022/2065 (قانون الخدمات الرقمية)**. تنفذ SOS Expat آليات للإبلاغ عن المحتوى غير القانوني وتتعاون مع السلطات المختصة وفقاً لـ DSA.

---

## 10. الملكية الفكرية

المنصة وعلاماتها التجارية وشعاراتها وقواعد بياناتها ومحتوياتها محمية. لا تُنقل أي حقوق للمساعد، باستثناء حق **شخصي وغير حصري وغير قابل للتحويل** للوصول خلال مدة هذه الشروط. المحتوى المقدم من المساعد يخضع لـ **ترخيص عالمي وغير حصري** لصالح SOS Expat للاستضافة والعرض على المنصة.

---

## 11. الضمانات والمسؤولية والتعويض

11.1. **لا ضمان** فيما يتعلق بالنتائج/الجودة/حجم الأعمال؛ المنصة مقدمة **"كما هي"**.

11.2. **تحديد المسؤولية**: بالقدر المسموح به، تقتصر المسؤولية الإجمالية لـ SOS Expat تجاه المساعد على **الأضرار المباشرة** و**لا يمكن أن تتجاوز** إجمالي **رسوم التوصيل** التي حصلت عليها SOS Expat بموجب **المعاملة** محل المطالبة.

11.3. **الاستثناءات**: لا أضرار غير مباشرة/تبعية/خاصة/عقابية (خسارة الأرباح، الفرص، العملاء، الإضرار بالسمعة، تكاليف الاستبدال، إلخ).

11.4. **التعويض**: **يعوض المساعد ويضمن** SOS Expat (وكذلك الشركات التابعة لها ومديريها وموظفيها ووكلائها) ضد أي مطالبة أو خسارة أو ضرر أو عقوبة أو مصاريف (بما في ذلك أتعاب المحاماة) تتعلق بـ (أ) مخالفته للشروط/القوانين، (ب) محتوياته، (ج) خدماته/إغفالاته، (د) عدم امتلاك تصاريح العمل/الهجرة/التراخيص.

11.5. **التنازل عن حق الرجوع.** يتنازل المساعد **صراحةً وبشكل لا رجعة فيه** عن أي حق رجوع ضد SOS Expat بموجب (أ) الأضرار الناتجة عن تقديم الخدمات، (ب) الخسائر غير المباشرة، (ج) النزاعات التعاقدية مع المستخدمين، (د) أي قصور في الخدمات المقدمة من المساعد. يسري هذا التنازل بأقصى حد يسمح به القانون.

11.6. **لا تمثيل.** لا شيء يُنشئ علاقة وكالة أو توظيف أو شراكة أو مشروع مشترك بين SOS Expat والمساعد.

11.7. **القوة القاهرة.** لا تتحمل SOS Expat المسؤولية عن التأخيرات أو الإخفاقات الناتجة عن أحداث **القوة القاهرة** (كارثة طبيعية، حرب، وباء، هجوم إلكتروني، انقطاع الكهرباء أو الإنترنت، قرار حكومي، إضراب، إلخ).

11.8. **البقاء.** تبقى المواد التالية سارية بعد إنهاء أو انتهاء هذه الشروط، أياً كان السبب: المواد 2 (أدلة القبول)، 3.7 (الإقرارات)، 5 (قواعد الاستخدام)، 7 (الرسوم والمدفوعات)، 8 (KYC والعقوبات)، 9 (البيانات الشخصية)، 10 (الملكية الفكرية)، 11 (المسؤولية والتعويض)، 12 (القانون المطبق والتحكيم)، 13 (بنود الحماية) و14 (متفرقات). تظل هذه البنود سارية طالما كان ذلك ضرورياً لإنتاج آثارها.

---

## 12. القانون المطبق – التحكيم – الاختصاص القضائي الإستوني – الدعاوى الجماعية

12.1. **القانون المطبق.** تخضع هذه الشروط وتفسيرها وصحتها وتنفيذها حصرياً لـ **القانون الإستوني**، باستثناء قواعد تنازع القوانين. بالنسبة للمسائل المتعلقة بتقديم الخدمات في بلد تدخل محدد، تُطبق القواعد المهنية وقواعد النظام العام المحلية لذلك البلد بشكل تكميلي بالقدر الذي تكون فيه آمرة.

12.2. **التحكيم الدولي الإلزامي.** أي نزاع أو خلاف أو مطالبة ناشئة عن هذه الشروط أو متعلقة بها، بما في ذلك صحتها وتفسيرها وتنفيذها أو إنهائها، يُفصل فيها نهائياً بـ **التحكيم** وفقاً لنظام التحكيم لـ **غرفة التجارة الدولية (ICC)**.
- **مقر التحكيم**: تالين، إستونيا؛
- **لغة التحكيم**: **الإنجليزية**؛
- **عدد المحكمين**: محكم واحد (1)، إلا إذا تجاوز المبلغ محل النزاع 100,000 يورو، وفي هذه الحالة ثلاثة (3) محكمين؛
- **القانون المطبق على الموضوع**: القانون الإستوني (المادة 12.1)؛
- **الإجراءات**: سرية. يلتزم الطرفان بعدم الإفصاح عن وجود أو محتوى أو نتيجة التحكيم، إلا بموجب التزام قانوني أو لتنفيذ الحكم.
حكم التحكيم **نهائي وملزم** للطرفين. يتنازل الطرفان عن أي طعن بالإلغاء بالقدر الذي يسمح به القانون.

12.3. **التنازل عن الدعاوى الجماعية وهيئة المحلفين.** بأقصى حد يسمح به القانون المعمول به:
- (أ) يتنازل المساعد عن المشاركة في أي **دعوى جماعية أو دعوى مجموعة أو دعوى تمثيلية** ضد SOS Expat؛
- (ب) يُحل أي نزاع على **أساس فردي فقط**؛
- (ج) يتنازل المساعد صراحةً عن أي **حق في المحاكمة أمام هيئة محلفين** (التنازل عن هيئة المحلفين)؛
- (د) يتنازل المساعد عن أي دعوى جماعية أو دعوى موحدة أو دعوى تمثيلية بموجب القانون الأمريكي أو أي قانون مماثل.

12.4. **الاختصاص الحصري للمحاكم الإستونية.** لأي مطالبة غير قابلة للتحكيم وفقاً للقانون المعمول به، وللتدابير المؤقتة أو التحفظية العاجلة قبل تشكيل هيئة التحكيم، ولتنفيذ أحكام التحكيم، تكون **لمحاكم تالين (إستونيا)** **الاختصاص الحصري**. المساعد:
- (أ) يوافق بشكل لا رجعة فيه على هذا الاختصاص؛
- (ب) يتنازل عن أي اعتراض على أساس **المحكمة غير الملائمة**؛
- (ج) يتنازل عن أي اعتراض مبني على انعدام الاختصاص الشخصي؛
- (د) يقبل أن أي تبليغ يمكن أن يتم على عنوان البريد الإلكتروني المسجل على المنصة.

12.5. **الوساطة المسبقة الإلزامية.** قبل أي تحكيم، يلتزم الطرفان بمحاولة حل النزاع ودياً عن طريق **التفاوض بحسن نية** لمدة **ثلاثين (30) يوماً** من الإخطار الكتابي بالنزاع. يجب إرسال هذا الإخطار بالبريد الإلكتروني مع إشعار بالاستلام إلى عنوان الاتصال الخاص بالطرف الآخر. فشل الوساطة شرط مسبق لتقديم طلب التحكيم.

12.6. **التقادم.** يجب تقديم أي دعوى أو مطالبة من المساعد ضد SOS Expat خلال **سنة واحدة (1)** من تاريخ الواقعة المنشئة، وإلا سقط الحق نهائياً، بالقدر الذي يسمح به القانون المعمول به.

---

## 13. بنود الحماية الدولية

13.1. **مكافحة الفساد.** يلتزم المساعد بعدم تقديم أو وعد أو دفع رشاوى أو مزايا غير مشروعة لموظفين عموميين أو خاصين. يلتزم بقوانين مكافحة الفساد المعمول بها (FCPA، قانون الرشوة البريطاني، قانون سابان الثاني، إلخ).

13.2. **سرية الاتصالات.** الاتصالات التي تتم عبر المنصة (الرسائل، المكالمات الهاتفية) **سرية**. يمتنع المساعد عن تسجيلها أو إفشائها أو استخدامها لأغراض أخرى غير الخدمة المتفق عليها، إلا بإذن كتابي أو التزام قانوني.

13.3. **عدم الاستقطاب.** خلال مدة هذه الشروط و**اثني عشر (12) شهراً** بعد إنهائها، يمتنع المساعد عن استقطاب المستخدمين الذين تعرف عليهم عبر المنصة مباشرةً لتجنب رسوم التوصيل.

13.4. **المسؤولية الحصرية للمساعد.** المساعد هو **المسؤول الوحيد** عن جودة ودقة ومشروعية الخدمات التي يقدمها. SOS Expat **لا تضمن** النصائح أو المعلومات أو الخدمات المقدمة من المساعد و**تُخلي مسؤوليتها** عن أي ضرر يلحق بالمستخدم بسبب خدمات المساعد.

13.5. **انعدام علاقة الاستشارة.** SOS Expat **ليست شركة استشارات**، ولا مقدم خدمات قانونية أو ضريبية أو طبية أو منظمة. تقتصر المنصة على **التوصيل**. أي علاقة استشارية تُقام **حصرياً** بين المساعد والمستخدم، **خارج** SOS Expat.

13.6. **النزاعات بين المساعد والمستخدم.** أي نزاع بين المساعد والمستخدم يقع **حصرياً** ضمن علاقتهما المباشرة. SOS Expat **لا تتدخل** في هذه النزاعات و**لا يمكن إشراكها** كطرف أو ضامن أو وسيط.

---

## 14. متفرقات

14.1. **التنازل.** يجوز لـ SOS Expat التنازل عن هذه الشروط لكيان من مجموعتها أو لخلف؛ لا يجوز للمساعد التنازل دون موافقة كتابية من SOS Expat.

14.2. **الاتفاق الكامل.** تُشكل هذه الشروط الاتفاق الكامل وتحل محل أي اتفاق سابق يتعلق بنفس الموضوع.

14.3. **الإشعارات.** عبر النشر على المنصة أو الإشعار داخل التطبيق أو عبر نموذج الاتصال.

14.4. **التفسير.** العناوين إرشادية فقط. لا تُطبق قاعدة **التفسير ضد المحرر**.

14.5. **اللغات.** قد تُقدم ترجمات؛ **الإنجليزية هي السائدة** للتفسير.

14.6. **البطلان الجزئي والقابلية للتجزئة.** إذا أُعلن بطلان أو عدم نفاذ أي حكم من هذه الشروط من قبل محكمة أو محكم مختص:
- (أ) لا يؤثر هذا البطلان على صحة الأحكام الأخرى التي تظل سارية؛
- (ب) يُستبدل الحكم الباطل بحكم صحيح ذي أثر اقتصادي مماثل، قدر الإمكان؛
- (ج) يتفاوض الطرفان بحسن نية للاتفاق على حكم بديل.

14.7. **القابلية للتجزئة الجغرافية.** إذا كان حكم من هذه الشروط غير قابل للتطبيق أو غير قانوني في ولاية قضائية محددة:
- (أ) لا يُطبق هذا الحكم في تلك الولاية القضائية فقط؛
- (ب) يظل قابلاً للتطبيق بالكامل في جميع الولايات القضائية الأخرى؛
- (ج) لا يؤثر عدم قابلية التطبيق المحلي على الصحة العامة للشروط.

14.8. **عدم التنازل.** إن عدم ممارسة أو التأخر في ممارسة حق من قبل SOS Expat لا يُعد تنازلاً عن هذا الحق. يجب أن يكون أي تنازل صريحاً وكتابياً. التنازل المحدد لا يُشكل تنازلاً عاماً.

14.9. **استقلالية البنود.** كل بند من هذه الشروط مستقل. بطلان أي بند لا يؤدي إلى بطلان بنود تحديد المسؤولية أو التعويض أو التحكيم أو الاختصاص القضائي، التي تظل قابلة للتطبيق بأقصى حد يسمح به القانون.

14.10. **الغير.** لا تمنح هذه الشروط أي حقوق للغير (باستثناء الشركات التابعة لـ SOS Expat المذكورة صراحةً). لا يجوز لأي طرف ثالث الاستفادة من أحكام هذه الشروط.

---

## 15. الاتصال

لأي سؤال أو طلب قانوني: **https://sos-expat.com/contact**
`;

  const defaultPt = `
# Termos e Condições de Uso – Expatriates Aidants (Global)

**SOS Expat by WorldExpat OÜ** (doravante denominado “**Plataforma**”, “**SOS**” ou “**nós**”)

**Versão 2.2 – Última atualização: 16 de junho de 2025**

---

## 1. Definições

**Expatrié Aidant** (“**Aidant**”): qualquer pessoa registrada na Plataforma que fornece serviços de apoio **não legais e não médicos** de forma independente (ex.: orientação, ajuda prática, acompanhamento, tradução informal, rede local, etc.).

**Usuário**: qualquer pessoa que utilize a Plataforma para contatar um Aidant.

**Networking / Matchmaking**: a apresentação técnica/operacional realizada pela Plataforma entre Usuário e Aidant (compartilhamento de informações de contato, abertura de canais de comunicação ou aceitação de solicitação via Plataforma).

**Local / País**: a jurisdição legal à qual a solicitação do usuário se refere principalmente no momento do networking; se não especificado, será considerado o país de residência do usuário.

**Taxa de Networking**: taxa fixa devida à SOS por cada ação de networking (Seção 7): **19 €** (EUR) ou **25 $ USD**, com possibilidade de ajustes conforme a moeda/local.

**Provedor de Pagamento**: terceiro responsável pelo processamento do pagamento e distribuição de fundos.

---

## 2. Objetivo, escopo e consentimento

2.1. Estes termos regem o acesso e uso da Plataforma por Aidants.

2.2. **SOS Expat atua apenas como intermediário técnico.** SOS Expat não é empregador, representante ou parceiro do Aidant, não fornece serviços legais, médicos, fiscais ou contábeis, nem é parte de qualquer contrato entre Aidant e Usuário.

2.3. **Consentimento eletrônico (Click-wrap).** O registro ou uso da Plataforma constitui aceitação destes Termos. A SOS pode manter provas técnicas (timestamp, ID, etc.).

2.4. **Alterações.** A SOS pode atualizar termos e taxas no futuro; o uso continuado da Plataforma será considerado aceitação.

2.5. **Capacidade profissional (B2B).** O Aidant declara atuar **exclusivamente de forma profissional**; proteção ao consumidor não se aplica.

---

## 3. Status do Aidant – Conformidade, permissões e responsabilidades

3.1. **Independência.** O Aidant atua como **profissional independente**; nenhum vínculo empregatício, agência ou joint venture é criado com SOS Expat.

3.2. **Autorização de trabalho e status migratório.** O Aidant é responsável por obter e manter todas as autorizações necessárias em cada país (visto, permissão de trabalho, registro comercial, seguro, licenças locais). A SOS Expat não verifica essas autorizações.

3.3. **Serviços não regulamentados.** O Aidant não fornecerá serviços regulamentados sem licenciamento adequado (legal, médico, financeiro, fiscal, etc.).

3.4. **Conformidade geral.** O Aidant cumprirá todas as leis aplicáveis (proteção do consumidor, e-commerce, publicidade, concorrência, AML/KYC, fiscal, proteção de dados, segurança, sanções etc.).

3.5. **Seguro.** O Aidant confirma que possui seguro profissional adequado para suas atividades.

3.6. **Confidencialidade.** O Aidant protegerá os dados do usuário e só os compartilhará mediante obrigação legal ou consentimento.

---

## 4. Conta, verificação e segurança

4.1. **Registro.** Cada Aidant terá apenas uma conta; todas as informações devem ser precisas e atualizadas.

4.2. **Verificação.** A SOS Expat pode recusar, suspender ou excluir o acesso por motivos de segurança, conformidade ou qualidade.

4.3. **Segurança.** Atividades na conta são consideradas realizadas pelo Aidant.

4.4. **Inatividade.** Após 365 dias de inatividade, a conta poderá ser automaticamente desativada. O Aidant pode encerrar sua conta a qualquer momento após cumprir suas obrigações. A SOS Expat pode suspender ou encerrar contas por violação dos Termos.

4.5. **Comunicações eletrônicas.** O Aidant consente em receber notificações por meios eletrônicos (e-mail, notificações no aplicativo, publicação na plataforma).

---

## 5. Regras de uso – qualidade, proibições e taxa de networking

5.1. **Qualidade e descrição.** O Aidant fornecerá descrições precisas de seus serviços; não serão feitas declarações falsas.

5.2. **Proibições.** Conteúdo ilegal, discriminatório ou enganoso; uso indevido de dados; acesso não autorizado à Plataforma; conluio; atividades ilícitas.

5.3. **Taxa de networking.** Cada nova conexão está sujeita à **taxa de networking**.

5.4. **Disponibilidade.** A Plataforma é fornecida **“no estado em que se encontra”**; não há garantia de continuidade.

---

## 6. Relação Aidant–Usuário (fora da Plataforma)

6.1. Após o networking, ambos podem celebrar contratos de forma independente.

6.2. O Aidant gerenciará condições de serviço e faturamento conforme a legislação local.

6.3. A SOS Expat **não é responsável pela qualidade ou resultados do serviço**.

---

## 7. Taxas, pagamento único e impostos

7.1. **Taxa de networking:** 19 € (EUR) ou 25 $ (USD) por conexão.

7.2. **Pagamento único e distribuição.** Pagamentos são feitos via Plataforma; SOS Expat deduz a taxa e repassa o saldo ao Aidant.

7.3. **Não reembolsável.** A taxa de networking não é reembolsável.

7.4. **Dedução em reembolso.** Qualquer reembolso pode ser deduzido da parte do Aidant.

7.5. **Moeda e conversão.** Diversas moedas são possíveis; taxas do provedor de pagamento podem se aplicar.

7.6. **Impostos.** O Aidant é responsável por todos os impostos aplicáveis.

7.7. **Indenização.** SOS Expat pode ajustar pagamentos para compensar reivindicações.

---

## 8. Dados pessoais (global – GDPR/DSA)

8.1. **Papéis.** Para dados de usuários recebidos para fins de networking, SOS Expat e o Aidant atuam como controladores de dados independentes para seus próprios fins, em conformidade com o **Regulamento (UE) 2016/679 (GDPR)**.

8.2. **Finalidade.** Networking, segurança, prevenção de fraude, conformidade legal.

8.3. **Transferência internacional.** Medidas de segurança adequadas são aplicadas.

8.4. **Direitos e contato.** Via formulário de contato da Plataforma.

8.5. **Segurança.** Medidas técnicas e organizacionais apropriadas.

8.6. O Aidant processará dados conforme leis do país/local.

8.7. **Conformidade DSA.** A Plataforma opera como um **serviço intermediário** nos termos do **Regulamento (UE) 2022/2065 (Digital Services Act)**. A SOS Expat implementa mecanismos para denúncia de conteúdo ilegal e coopera com as autoridades competentes em conformidade com o DSA.

---

## 9. Propriedade intelectual

A Plataforma, marcas, logotipos, banco de dados e conteúdo são protegidos. O Aidant recebe apenas direito limitado, pessoal e não transferível. O conteúdo fornecido pelo Aidant concede à SOS Expat licença não exclusiva para hospedagem e exibição na Plataforma.

---

## 10. Garantia, responsabilidade e indenização

10.1. Sem garantia de resultados ou qualidade.

10.2. **Limite de responsabilidade:** responsabilidade total limitada à taxa de networking.

10.3. **Exclusão:** danos indiretos, consequenciais ou punitivos não aplicáveis.

10.4. **Indenização:** Aidant indenizará SOS Expat por quaisquer reivindicações, danos ou custos legais.

10.5. **Renúncia ao recurso.** O Aidant **renuncia expressa e irrevogavelmente** a qualquer recurso contra a SOS Expat por: (i) danos decorrentes da prestação de serviços, (ii) perdas indiretas, (iii) disputas contratuais com Usuários, (iv) qualquer falha nos serviços prestados pelo Aidant. Esta renúncia aplica-se na máxima extensão permitida por lei.

10.6. **Sem representação.** Nada aqui cria relação de agência, emprego, parceria ou joint venture entre a SOS Expat e o Aidant.

10.7. **Força maior.** A SOS Expat não é responsável por atrasos ou falhas causados por eventos de **força maior** (desastre natural, guerra, pandemia, ciberataque, interrupção de energia ou internet, decisão governamental, greve, etc.).

10.8. Estas disposições permanecem válidas após término.

---

## 11. Lei aplicável – Arbitragem – Jurisdição estoniana – Ação coletiva

11.1. **Lei aplicável:** para cada conexão, aplica-se a lei do país/local.

11.2. **Arbitragem ICC:** todas as disputas resolvidas conforme regras ICC. Local: Tallinn, Estônia; idioma: francês.

11.3. **Renúncia à ação coletiva.**

11.4. **Jurisdicional estoniana.**

---

## 12. Diversos

12.1. **Transferência.** SOS Expat pode transferir seus direitos.

12.2. **Acordo completo.**

12.3. **Notificações.** Via publicação na Plataforma ou formulário de contato.

12.4. **Interpretação.**

12.5. **Idiomas.** O francês é a versão original.

12.6. **Separabilidade.**

12.7. **Não renúncia.**

---

## 13. Contato

Para perguntas ou questões legais, entre em contato conosco:

`;

  // Fallback de contenu par langue
  // const defaultContent: string = selectedLanguage === 'fr' ? defaultFr : defaultEn;
  const defaultContent: string =
    selectedLanguage === "fr"
      ? defaultFr
      : selectedLanguage === "es"
        ? defaultEs
        : selectedLanguage === "de"
          ? defaultDe
          : selectedLanguage === "ru"
            ? defaultRu
            : selectedLanguage === "hi"
              ? defaultHi
              : selectedLanguage === "ch"
                ? defaultCh
                : selectedLanguage === "ar"
                  ? defaultAr
                  : selectedLanguage === "pt"
                    ? defaultPt
                    : defaultEn;

  // Ancrage UI
  const anchorMap = useMemo(
    () => [
      { num: 1, label: t.sections.definitions },
      { num: 2, label: t.sections.scope },
      { num: 3, label: t.sections.status },
      { num: 4, label: t.sections.account },
      { num: 5, label: t.sections.rules },
      { num: 6, label: t.sections.relationship },
      { num: 7, label: t.sections.fees },
      { num: 8, label: t.sections.data },
      { num: 9, label: t.sections.ip },
      { num: 10, label: t.sections.liability },
      { num: 11, label: t.sections.law },
      { num: 12, label: t.sections.misc },
      { num: 13, label: t.sections.contact },
    ],
    [t.sections]
  );

  const body = content || defaultContent;

  return (
    <Layout>
      <main className="min-h-screen bg-gray-950">
        {/* HERO */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-blue-500/10 pointer-events-none" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto px-6">
            {/* Badge + langues */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full pl-5 pr-4 py-2.5 border border-white/20 text-white">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span className="text-sm font-semibold">{t.heroBadge}</span>
                <span className="mx-1 text-white/40">•</span>
                <span className="text-sm text-white/90">{t.lastUpdated}</span>
              </div>

              {/* <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-1">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('fr')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedLanguage === 'fr' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/10'
                  }`}
                  aria-pressed={selectedLanguage === 'fr'}
                >
                  <Languages className="w-4 h-4" />
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedLanguage === 'en' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/10'
                  }`}
                  aria-pressed={selectedLanguage === 'en'}
                >
                  <Languages className="w-4 h-4" />
                  EN
                </button>
              </div> */}
            </div>

            <header className="text-center">
              <h1 className="text-4xl sm:text-6xl font-black mb-4 leading-tight">
                <span className="bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                  {t.title}
                </span>
              </h1>
              <p className="text-lg sm:text-2xl text-gray-300 max-w-3xl mx-auto">
                {t.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-white/90">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                  <Shield className="w-4 h-4" /> <span>{t.keyFeatures}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                  <Users className="w-4 h-4" />{" "}
                  <span>{t.trustedByHelpers}</span>
                </span>
                {/* Avis retirés sur demande */}
              </div>

              <div className="mt-8 flex items-center justify-center gap-4">
                <Link
                  to="/sos-appel"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm font-semibold"
                >
                  <FileText className="w-5 h-5" />
                  <span>{t.ctaHero}</span>
                </Link>
                <a
                  href="https://sos-expat.com/contact"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white font-bold border-2 border-red-400/50 hover:scale-105 transition-all"
                >
                  <Heart className="w-5 h-5" />
                  <span>{t.contactUs}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </header>
          </div>
        </section>

        {/* Bandeau points clés */}
        <section className="py-10 bg-gray-950">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: <DollarSign className="w-6 h-6" />,
                  text: t.features[0],
                  gradient: "from-green-500 to-emerald-500",
                },
                {
                  icon: <Clock className="w-6 h-6" />,
                  text: t.features[1],
                  gradient: "from-yellow-500 to-orange-500",
                },
                {
                  icon: <Globe className="w-6 h-6" />,
                  text: t.features[2],
                  gradient: "from-blue-500 to-purple-500",
                },
                {
                  icon: <UserCheck className="w-6 h-6" />,
                  text: t.features[3],
                  gradient: "from-red-500 to-orange-500",
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-3 p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.01]"
                >
                  <span
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r ${f.gradient} text-white`}
                  >
                    {f.icon}
                  </span>
                  <span className="text-white/90 font-semibold">{f.text}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t.editHint}
            </p>
          </div>
        </section>

        {/* Sommaire */}
        <section className="py-8 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white">
                  <Globe className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                  {t.anchorTitle}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {anchorMap.map((s) => (
                  <a
                    key={s.num}
                    href={`#section-${s.num}`}
                    className="group flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gray-900 text-white text-xs font-bold">
                      {s.num}
                    </span>
                    <span className="text-gray-700 group-hover:text-gray-900">
                      {s.label}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contenu principal */}
        <section className="py-10 sm:py-14 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-5xl mx-auto px-6">
            {isLoading ? (
              <div className="space-y-4" aria-live="polite" aria-busy="true">
                <div className="h-8 w-2/3 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-6 w-1/2 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-5 w-full bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-5 w-11/12 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-5 w-10/12 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-5 w-9/12 bg-gray-200 rounded-xl animate-pulse" />
              </div>
            ) : (
              <article className="prose max-w-none">
                <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm">
                  {parseMarkdownContent(body)}
                </div>
              </article>
            )}
          </div>
        </section>

        {/* Bandeau final */}
        <section className="py-20 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20 pointer-events-none" />
          <div className="relative z-10 max-w-5xl mx-auto text-center px-6">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4">
              {t.readyToJoin}
            </h2>
            <p className="text-lg sm:text-2xl text-white/95 mb-10 leading-relaxed">
              {t.readySubtitle}
            </p>

            <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-white/90">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Shield className="w-4 h-4" /> Sécurisé
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Clock className="w-4 h-4" />{" "}
                <span>Moins de 5&nbsp;minutes</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 border border-white/20 backdrop-blur-sm">
                <Globe className="w-4 h-4" /> Mondial
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <Link
                to="/register"
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-10 py-5 rounded-3xl font-black text-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center gap-3"
              >
                <span>{t.startNow}</span>
                {/* Flèche retirée sur demande */}
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-black/5" />
              </Link>

              <a
                href="https://sos-expat.com/contact"
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-10 py-5 rounded-3xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:bg-white/10 flex items-center gap-3"
              >
                <Heart className="w-5 h-5" />
                <span>{t.contactUs}</span>
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/30" />
              </a>
            </div>

            {/* Ligne avis retirée */}
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default TermsExpats;
