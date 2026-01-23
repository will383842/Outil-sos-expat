import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import {
  Scale,
  FileText,
  Shield,
  Check,
  Globe,
  Clock,
  ArrowRight,
  Briefcase,
  DollarSign,
  Users,
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
 * TermsLawyers
 * - Logique métier conservée : Firestore (legal_documents / terms_lawyers), sélection de langue locale.
 * - Design harmonisé avec Home / TermsExpats (gradients, chips, sommaire, cartes).
 * - 100% éditable depuis l’admin ; fallback FR/EN intégré.
 * - Aucune utilisation de `any`.
 */

const TermsLawyers: React.FC = () => {
  const { language } = useApp();

  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLanguage, setSelectedLanguage] = useState<
    "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar"
  >((language as "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar") || "fr");

  // Rester aligné avec la langue globale si elle change
  useEffect(() => {
    if (language)
      setSelectedLanguage(
        language as "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar"
      );
  }, [language]);

  // Fetch dernier document actif
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, "legal_documents"),
          where("type", "==", "terms_lawyers"),
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
      title: "CGU Avocats",
      subtitle:
        "Conditions générales d'utilisation pour les avocats prestataires",
      lastUpdated: "Version 2.2 – Dernière mise à jour : 16 juin 2025",
      loading: "Chargement...",
      joinNetwork: "Rejoindre le réseau",
      trustedByExperts: "Déjà 2K+ avocats nous font confiance",
      keyFeatures: "Points clés",
      features: [
        "Paiement garanti sous 7 jours",
        "Support technique 24/7",
        "Interface mobile optimisée",
        "Clients vérifiés",
      ],
      languageToggle: "Changer de langue",
      sections: {
        definitions: "Définitions",
        scope: "Objet, champ et acceptation",
        status: "Statut de l'Avocat – Indépendance et conformité",
        account: "Création de compte, vérifications et sécurité",
        rules: "Règles d'usage – Conflits, confidentialité, non-contournement",
        relationship: "Relation Avocat–Utilisateur (hors Plateforme)",
        fees: "Frais, paiement unique et taxes",
        payments: "Paiements – KYC/LCB-FT – Sanctions",
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
        "Développez votre activité à l'international et aidez des milliers d'expatriés.",
      startNow: "Commencer maintenant",
      contactUs: "Nous contacter",
      anchorTitle: "Sommaire",
      editHint: "Document éditable depuis la console admin",
      heroBadge: "Nouveau — Conditions mises à jour",
      ctaHero: "Rejoindre les avocats",
      contactForm: "Formulaire de contact",
    },
    en: {
      title: "Lawyer Terms",
      subtitle: "Terms of Use for lawyer providers",
      lastUpdated: "Version 2.2 – Last updated: 16 June 2025",
      loading: "Loading...",
      joinNetwork: "Join the network",
      trustedByExperts: "Already 2K+ lawyers trust us",
      keyFeatures: "Key features",
      features: [
        "Guaranteed payment within 7 days",
        "24/7 technical support",
        "Mobile-optimized interface",
        "Verified clients",
      ],
      languageToggle: "Switch language",
      sections: {
        definitions: "Definitions",
        scope: "Purpose, Scope and Acceptance",
        status: "Lawyer Status – Independence and Compliance",
        account: "Account, Checks and Security",
        rules: "Use Rules – Conflicts, Confidentiality, No Circumvention",
        relationship: "Lawyer–User Relationship (Off-Platform)",
        fees: "Fees, Single Payment and Taxes",
        payments: "Payments – AML/KYC – Sanctions",
        data: "Data Protection (Global Framework)",
        ip: "Intellectual Property",
        liability: "Warranties, Liability and Indemnity",
        law: "Governing Law – ICC Arbitration – Estonian Courts",
        protection: "International Protection Clauses",
        misc: "Miscellaneous",
        contact: "Contact",
      },
      readyToJoin: "Ready to join SOS Expat?",
      readySubtitle:
        "Develop your international practice and help thousands of expats.",
      startNow: "Start now",
      contactUs: "Contact us",
      anchorTitle: "Overview",
      editHint: "Document editable from the admin console",
      heroBadge: "New — Terms updated",
      ctaHero: "Join as a lawyer",
      contactForm: "Contact Form",
    },
    es: {
      title: "Términos para Abogados",
      subtitle: "Condiciones generales de uso para abogados proveedores",
      lastUpdated: "Versión 2.2 – Última actualización: 16 de junio de 2025",
      loading: "Cargando...",
      joinNetwork: "Únete a la red",
      trustedByExperts: "Más de 2.000 abogados ya confían en nosotros",
      keyFeatures: "Características principales",
      features: [
        "Pago garantizado en 7 días",
        "Soporte técnico 24/7",
        "Interfaz móvil optimizada",
        "Clientes verificados",
      ],
      languageToggle: "Cambiar idioma",
      sections: {
        definitions: "Definiciones",
        scope: "Propósito, alcance y aceptación",
        status: "Estado del abogado - Independencia y cumplimiento",
        account: "Creación de cuenta, verificaciones y seguridad",
        rules: "Reglas de uso - Conflictos, confidencialidad, sin evasión",
        relationship: "Relación abogado-usuario (fuera de la plataforma)",
        fees: "Honorarios, pago único e impuestos",
        payments: "Pagos - KYC/AML - Sanciones",
        data: "Protección de datos (marco global)",
        ip: "Propiedad intelectual",
        liability: "Garantías, responsabilidad e indemnización",
        law: "Ley aplicable - Arbitraje - Tribunales estonios",
        protection: "Cláusulas de protección internacional",
        misc: "Diversos",
        contact: "Contacto",
      },
      readyToJoin: "¿Listo para unirte a SOS Expat?",
      readySubtitle:
        "Desarrolla tu práctica internacional y ayuda a miles de expatriados.",
      startNow: "Comenzar ahora",
      contactUs: "Contáctanos",
      anchorTitle: "Resumen",
      editHint: "Documento editable desde la consola de administración",
      heroBadge: "Nuevo — Términos actualizados",
      ctaHero: "Únete como abogado",
      contactForm: "Formulario de contacto",
    },
    ru: {
      title: "Условия для адвокатов",
      subtitle: "Условия использования для адвокатов-поставщиков услуг",
      lastUpdated: "Версия 2.2 – Последнее обновление: 16 июня 2025",
      loading: "Загрузка...",
      joinNetwork: "Присоединиться к сети",
      trustedByExperts: "Уже более 2000+ адвокатов доверяют нам",
      keyFeatures: "Ключевые особенности",
      features: [
        "Гарантированный платеж в течение 7 дней",
        "Техническая поддержка 24/7",
        "Оптимизированный мобильный интерфейс",
        "Проверенные клиенты",
      ],
      languageToggle: "Сменить язык",
      sections: {
        definitions: "Определения",
        scope: "Цель, область применения и принятие",
        status: "Статус адвоката - Независимость и соответствие",
        account: "Учетная запись, проверки и безопасность",
        rules:
          "Правила использования - Конфликты, конфиденциальность, без обхода",
        relationship: "Отношения адвокат-пользователь (вне платформы)",
        fees: "Гонорары, единовременный платеж и налоги",
        payments: "Платежи - KYC/AML - Санкции",
        data: "Защита данных (глобальная база)",
        ip: "Интеллектуальная собственность",
        liability: "Гарантии, ответственность и возмещение убытков",
        law: "Применимое право - Арбитраж ICC - Эстонские суды",
        protection: "Международные защитные положения",
        misc: "Прочее",
        contact: "Контакт",
      },
      readyToJoin: "Готовы присоединиться к SOS Expat?",
      readySubtitle:
        "Развивайте свою международную практику и помогите тысячам эмигрантов.",
      startNow: "Начать сейчас",
      contactUs: "Свяжитесь с нами",
      anchorTitle: "Обзор",
      editHint: "Документ редактируется через консоль администратора",
      heroBadge: "Новое — Условия обновлены",
      ctaHero: "Присоединиться как адвокат",
      contactForm: "Контактная форма",
    },
    de: {
      title: "Anwaltsbedingungen",
      subtitle: "Allgemeine Nutzungsbedingungen für Anwaltsdienstleister",
      lastUpdated: "Version 2.2 – Letzte Aktualisierung: 16. Juni 2025",
      loading: "Wird geladen...",
      joinNetwork: "Netzwerk beitreten",
      trustedByExperts: "Bereits 2000+ Anwälte vertrauen uns",
      keyFeatures: "Wichtige Merkmale",
      features: [
        "Garantierte Zahlung innerhalb von 7 Tagen",
        "24/7 technischer Support",
        "Optimierte mobile Benutzeroberfläche",
        "Überprüfte Kunden",
      ],
      languageToggle: "Sprache wechseln",
      sections: {
        definitions: "Definitionen",
        scope: "Zweck, Geltungsbereich und Annahme",
        status: "Anwaltsstatus - Unabhängigkeit und Compliance",
        account: "Konto, Überprüfungen und Sicherheit",
        rules: "Nutzungsregeln - Konflikte, Vertraulichkeit, keine Umgehung",
        relationship: "Anwalts-Benutzer-Beziehung (außerhalb der Plattform)",
        fees: "Gebühren, Einmalzahlung und Steuern",
        payments: "Zahlungen - KYC/AML - Sanktionen",
        data: "Datenschutz (globaler Rahmen)",
        ip: "Geistiges Eigentum",
        liability: "Gewährleistungen, Haftung und Schadensersatz",
        law: "Anwendbares Recht - ICC-Schiedsverfahren - Estnische Gerichte",
        protection: "Internationale Schutzklauseln",
        misc: "Sonstiges",
        contact: "Kontakt",
      },
      readyToJoin: "Bereit, SOS Expat beizutreten?",
      readySubtitle:
        "Entwickeln Sie Ihre internationale Tätigkeit und helfen Sie Tausenden von Expats.",
      startNow: "Jetzt starten",
      contactUs: "Kontaktieren Sie uns",
      anchorTitle: "Übersicht",
      editHint: "Dokument bearbeitbar über die Admin-Konsole",
      heroBadge: "Neu — Bedingungen aktualisiert",
      ctaHero: "Als Anwalt beitreten",
      contactForm: "Kontaktformular",
    },
    hi: {
      title: "वकील शर्तें",
      subtitle: "वकील सेवा प्रदाताओं के लिए सामान्य उपयोग की शर्तें",
      lastUpdated: "संस्करण 2.2 – अंतिम अपडेट: 16 जून 2025",
      loading: "लोड हो रहा है...",
      joinNetwork: "नेटवर्क में शामिल हों",
      trustedByExperts: "पहले से 2000+ वकील हमारे पर विश्वास करते हैं",
      keyFeatures: "मुख्य विशेषताएं",
      features: [
        "7 दिनों में गारंटीकृत भुगतान",
        "24/7 तकनीकी समर्थन",
        "अनुकूलित मोबाइल इंटरफेस",
        "सत्यापित ग्राहक",
      ],
      languageToggle: "भाषा बदलें",
      sections: {
        definitions: "परिभाषाएं",
        scope: "उद्देश्य, दायरा और स्वीकृति",
        status: "वकील स्थिति - स्वतंत्रता और अनुपालन",
        account: "खाता, सत्यापन और सुरक्षा",
        rules: "उपयोग के नियम - संघर्ष, गोपनीयता, कोई बायपास नहीं",
        relationship: "वकील-उपयोगकर्ता संबंध (प्लेटफॉर्म के बाहर)",
        fees: "शुल्क, एकल भुगतान और कर",
        payments: "भुगतान - KYC/AML - प्रतिबंध",
        data: "डेटा सुरक्षा (वैश्विक ढांचा)",
        ip: "बौद्धिक संपदा",
        liability: "वारंटी, दायित्व और क्षतिपूर्ति",
        law: "लागू कानून - ICC मध्यस्थता - एस्टोनियाई अदालतें",
        protection: "अंतर्राष्ट्रीय सुरक्षा खंड",
        misc: "विविध",
        contact: "संपर्क",
      },
      readyToJoin: "SOS Expat में शामिल होने के लिए तैयार हैं?",
      readySubtitle:
        "अपने अंतर्राष्ट्रीय अभ्यास को विकसित करें और हजारों प्रवासियों की मदद करें।",
      startNow: "अभी शुरू करें",
      contactUs: "हमसे संपर्क करें",
      anchorTitle: "सारांश",
      editHint: "एडमिन कंसोल से संपादन योग्य दस्तावेज़",
      heroBadge: "नया — शर्तें अपडेट की गईं",
      ctaHero: "वकील के रूप में शामिल हों",
      contactForm: "संपर्क फॉर्म",
    },
    pt: {
      title: "Termos para Advogados",
      subtitle:
        "Condições gerais de uso para advogados prestadores de serviços",
      lastUpdated: "Versão 2.2 – Última atualização: 16 de junho de 2025",
      loading: "Carregando...",
      joinNetwork: "Junte-se à rede",
      trustedByExperts: "Já 2000+ advogados confiam em nós",
      keyFeatures: "Características principais",
      features: [
        "Pagamento garantido em 7 dias",
        "Suporte técnico 24/7",
        "Interface móvel otimizada",
        "Clientes verificados",
      ],
      languageToggle: "Mudar idioma",
      sections: {
        definitions: "Definições",
        scope: "Propósito, escopo e aceitação",
        status: "Status do advogado - Independência e conformidade",
        account: "Conta, verificações e segurança",
        rules: "Regras de uso - Conflitos, confidencialidade, sem desvio",
        relationship: "Relacionamento advogado-usuário (fora da plataforma)",
        fees: "Honorários, pagamento único e impostos",
        payments: "Pagamentos - KYC/AML - Sanções",
        data: "Proteção de dados (marco global)",
        ip: "Propriedade intelectual",
        liability: "Garantias, responsabilidade e indenização",
        law: "Lei aplicável - Arbitragem ICC - Tribunais estonios",
        protection: "Cláusulas de proteção internacional",
        misc: "Diversos",
        contact: "Contato",
      },
      readyToJoin: "Pronto para se juntar ao SOS Expat?",
      readySubtitle:
        "Desenvolva sua prática internacional e ajude milhares de expatriados.",
      startNow: "Comece agora",
      contactUs: "Entre em contato conosco",
      anchorTitle: "Resumo",
      editHint: "Documento editável no console do administrador",
      heroBadge: "Novo — Termos atualizados",
      ctaHero: "Junte-se como advogado",
      contactForm: "Formulário de contato",
    },
    ch: {
      title: "律师使用条款",
      subtitle: "为律师服务提供者制定的一般使用条款",
      lastUpdated: "版本 2.2 – 最近更新：2025年6月16日",
      loading: "加载中...",
      joinNetwork: "加入网络",
      trustedByExperts: "已有超过2,000名律师信任我们",
      keyFeatures: "主要特点",
      features: [
        "7天内保证付款",
        "全天候24/7技术支持",
        "优化的移动界面",
        "经过验证的客户",
      ],
      languageToggle: "切换语言",
      sections: {
        definitions: "定义",
        scope: "目的、范围与接受",
        status: "律师状态 – 独立性与合规性",
        account: "账户创建、验证与安全",
        rules: "使用规则 – 冲突、隐私、禁止规避",
        relationship: "律师–用户关系（平台外）",
        fees: "费用、一次性付款及税费",
        payments: "支付 – KYC/反洗钱 – 制裁",
        data: "个人数据（全球框架）",
        ip: "知识产权",
        liability: "保证、责任与赔偿",
        law: "适用法律 – 仲裁 – 爱沙尼亚司法管辖",
        protection: "国际保护条款",
        misc: "其他事项",
        contact: "联系方式",
      },
      readyToJoin: "准备加入SOS Expat吗？",
      readySubtitle: "拓展您的国际业务，帮助数千名外籍人士。",
      startNow: "立即开始",
      contactUs: "联系我们",
      anchorTitle: "目录",
      editHint: "可通过管理控制台编辑文档",
      heroBadge: "新 — 条款已更新",
      ctaHero: "加入律师行列",
      contactForm: "联系表单",
    },
    ar: {
      title: "شروط استخدام المحامين",
      subtitle: "الشروط العامة لاستخدام مقدمي خدمات المحاماة",
      lastUpdated: "الإصدار 2.2 – آخر تحديث: 16 يونيو 2025",
      loading: "جارٍ التحميل...",
      joinNetwork: "انضم إلى الشبكة",
      trustedByExperts: "أكثر من 2000 محامٍ يثقون بنا",
      keyFeatures: "الميزات الرئيسية",
      features: [
        "دفع مضمون خلال 7 أيام",
        "دعم فني على مدار الساعة طوال أيام الأسبوع",
        "واجهة محمولة محسّنة",
        "عملاء تم التحقق منهم",
      ],
      languageToggle: "تغيير اللغة",
      sections: {
        definitions: "التعريفات",
        scope: "الغرض والنطاق والموافقة",
        status: "حالة المحامي – الاستقلالية والامتثال",
        account: "إنشاء الحساب، التحقق والأمان",
        rules: "قواعد الاستخدام – النزاعات، الخصوصية، منع التحايل",
        relationship: "علاقة المحامي بالمستخدم (خارج المنصة)",
        fees: "الرسوم، الدفع الواحد والضرائب",
        payments: "المدفوعات – KYC/مكافحة غسل الأموال – العقوبات",
        data: "البيانات الشخصية (الإطار العام)",
        ip: "الملكية الفكرية",
        liability: "الضمانات والمسؤولية والتعويض",
        protection: "بنود الحماية الدولية",
        law: "القانون المطبق – التحكيم – الاختصاص القضائي الإستوني",
        misc: "متفرقات",
        contact: "الاتصال",
      },
      readyToJoin: "هل أنت مستعد للانضمام إلى SOS Expat؟",
      readySubtitle: "نمّ نشاطك التجاري دوليًا وساعد آلاف المغتربين.",
      startNow: "ابدأ الآن",
      contactUs: "اتصل بنا",
      anchorTitle: "المحتويات",
      editHint: "يمكن تحرير المستند من خلال لوحة الإدارة",
      heroBadge: "جديد — تم تحديث الشروط",
      ctaHero: "انضم إلى المحامين",
      contactForm: "نموذج الاتصال",
    }
  };

  const t = translations[selectedLanguage];

  const handleLanguageChange = (
    newLang: "fr" | "en" | "es" | "de" | "ru" | "hi" | "pt" | "ch" | "ar"
  ) => {
    setSelectedLanguage(newLang); // Changement local (n'affecte pas la langue globale)
  };

  // --- Parser Markdown (mêmes règles que TermsExpats) ---
  const parseMarkdownContent = (text: string) => {
    const lines = text.split("\n");
    const elements: JSX.Element[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === "") continue;

      // Séparateur
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
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-red-500 pb-4"
          >
            {title}
          </h1>
        );
        continue;
      }

      // H2 (avec numéro optionnel au début)
      if (line.startsWith("## ")) {
        const title = line.substring(3).trim();
        const match = title.match(/^(\d+)\.\s*(.*)$/);
        if (match) {
          elements.push(
            <h2
              id={`section-${match[1]}`}
              key={currentIndex++}
              className="scroll-mt-28 text-xl sm:text-2xl font-bold text-gray-900 mt-10 mb-6 flex items-center gap-3"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-bold shadow-lg">
                {match[1]}
              </span>
              <span>{match[2].replace(/\*\*/g, "")}</span>
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
            className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-blue-500 pl-4"
          >
            {title}
          </h3>
        );
        continue;
      }

      // Points numérotés 2.1 / 3.2 …
      const numberedMatch = line.match(/^(\d+\.\d+\.?)\s+(.*)$/);
      if (numberedMatch) {
        const number = numberedMatch[1];
        const inner = numberedMatch[2];
        const formatted = inner.replace(
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
              <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatted) }} />
            </p>
          </div>
        );
        continue;
      }

      // Ligne full bold
      if (line.startsWith("**") && line.endsWith("**")) {
        const boldText = line.slice(2, -2);
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 my-6"
          >
            <p className="font-bold text-gray-900 text-lg">{boldText}</p>
          </div>
        );
        continue;
      }

      // Bloc Contact dédié
      if (
        line.includes("Pour toute question") ||
        line.includes("Contact form") ||
        line.includes("For any questions")
      ) {
        elements.push(
          <div
            key={currentIndex++}
            className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-8 my-8 shadow-lg"
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

      // Paragraphe normal
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

  // --- Contenu par défaut (séparé FR / EN) ---
  const defaultFr = `
# Conditions Générales d'Utilisation – Avocats (Global)

**SOS Expat d'WorldExpat OÜ** (la « **Plateforme** », « **SOS** », « **nous** »)

**Version 2.2 – Dernière mise à jour : 16 juin 2025**

---

## 1. Définitions

**Application / Site / Plateforme** : services numériques exploités par **WorldExpat OÜ** permettant la mise en relation entre des utilisateurs (les « **Utilisateurs** ») et des avocats (les « **Avocats** »).

**Mise en relation** : l'introduction technique/opérationnelle réalisée par la Plateforme entre un Utilisateur et un Avocat, matérialisée par (i) la transmission de coordonnées, (ii) l'ouverture d'un canal de communication (appel, message, visio), ou (iii) l'acceptation par l'Avocat d'une demande émise via la Plateforme.

**Pays d'Intervention** : la juridiction principalement visée par la Requête au moment de la Mise en relation. À défaut, le pays de résidence de l'Utilisateur au moment de la demande ; en cas de pluralité, la juridiction la plus étroitement liée à l'objet de la Requête.

**Frais de Mise en relation** : frais dus à SOS pour chaque Mise en relation (art. 7) : **19 €** si payés en **EUR** ou **25 $ USD** si payés en **USD**, étant précisé qu'SOS Expat peut modifier ces montants et/ou publier des barèmes locaux par pays/devise, avec effet prospectif.

**Requête** : la situation/projet juridique exposé par l'Utilisateur.

**Prestataire(s) de paiement** : services tiers utilisés pour percevoir le paiement unique de l'Utilisateur et répartir les fonds.

---

## 2. Objet, champ et acceptation

2.1. Les présentes CGU régissent l'accès et l'utilisation de la Plateforme par les Avocats.

2.2. SOS Expat agit uniquement en tant qu'intermédiaire technique de mise en relation. SOS Expat n'exerce pas la profession d'avocat, ne fournit pas de conseil juridique et n'est pas partie à la relation Avocat-Utilisateur.

2.3. **Acceptation électronique (click-wrap).** L'Avocat accepte les CGU en cochant la case dédiée lors de l'inscription et/ou en utilisant la Plateforme. Cet acte vaut signature électronique et consentement contractuel. SOS peut conserver des journaux de preuve (horodatage, identifiants techniques).

2.4. **Modifications.** SOS peut mettre à jour les CGU et/ou le barème des frais (par pays/devise) à tout moment, avec effet prospectif après publication sur la Plateforme. L'usage continu vaut acceptation.

2.5. Durée : indéterminée.

---

## 3. Statut de l'Avocat – Indépendance et conformité

3.1. L'Avocat agit en professionnel indépendant ; aucune relation d'emploi, mandat, agence, partenariat ou coentreprise n'est créée avec SOS Expat.

3.2. L'Avocat est seul responsable : (i) de ses diplômes, titres, inscriptions au barreau/équivalents et autorisations d'exercer ; (ii) de son assurance responsabilité civile professionnelle en vigueur et adaptée aux Pays d'Intervention ; (iii) du respect des lois et règles professionnelles locales (déontologie, publicité/démarchage, conflits d'intérêts, secret professionnel, LCB-FT/KYC, fiscalité, protection des consommateurs, etc.).

3.3. SOS Expat ne supervise pas et n'évalue pas le contenu ni la qualité des conseils de l'Avocat et n'endosse aucune responsabilité à ce titre.

3.4. **Capacité professionnelle (B2B).** L'Avocat déclare agir exclusivement à des fins professionnelles. Les régimes protecteurs des consommateurs ne s'appliquent pas à la relation SOS Expat–Avocat.

---

## 4. Création de compte, vérifications et sécurité

4.1. Conditions : droit d'exercer valide dans au moins une juridiction, justificatifs d'identité et de qualification, assurance RCP en cours de validité.

4.2. Processus : création de compte, fourniture des documents, validation manuelle pouvant inclure un entretien visio et des contrôles KYC/LCB-FT via des Prestataires.

4.3. Exactitude & mise à jour : l'Avocat garantit l'exactitude/actualité des informations ; un (1) compte par Avocat.

4.4. Sécurité : l'Avocat protège ses identifiants ; toute activité via le compte est réputée effectuée par lui ; signalement immédiat de toute compromission.

4.5. **Inactivité & résiliation.** En cas d'**inactivité supérieure à 365 jours**, le compte peut être désactivé automatiquement après notification. L'Avocat peut fermer son compte à tout moment après avoir honoré ses obligations en cours. SOS Expat peut suspendre ou résilier un compte pour violation des CGU, sans préjudice d'autres recours.

4.6. **Communications électroniques.** L'Avocat consent à recevoir toute notification relative aux CGU par voie électronique (email, notification in-app, publication sur la Plateforme).

---

## 5. Règles d'usage – Conflits, confidentialité, non-contournement

5.1. **Conflits d'intérêts.** L'Avocat effectue un screening approprié avant tout conseil. En cas de conflit, il se retire et en informe l'Utilisateur.

5.2. **Secret professionnel & confidentialité.** L'Avocat respecte la confidentialité/secret professionnel selon le droit applicable du Pays d'Intervention. Les échanges ne sont pas enregistrés par SOS, sauf obligations légales.

5.3. **Non-contournement.** SOS Expat ne perçoit aucune commission sur les honoraires. Chaque nouvelle Mise en relation avec un nouvel Utilisateur via la Plateforme donne lieu aux Frais de Mise en relation. Il est interdit de contourner la Plateforme pour éviter ces frais lors d'une nouvelle introduction.

5.4. **Comportements interdits.** Usurpation d'identité/titre, contenus illicites, manipulation, collusion/boycott visant à nuire à la Plateforme, violation de lois sur sanctions/export, ou toute activité illégale.

5.5. **Disponibilité.** La Plateforme est fournie « en l'état » ; aucune disponibilité ininterrompue n'est garantie (maintenance, incidents, force majeure). L'accès peut être restreint si la loi l'impose.

---

## 6. Relation Avocat–Utilisateur (hors Plateforme)

6.1. Après la Mise en relation, l'Avocat et l'Utilisateur peuvent contractualiser hors Plateforme (SOS Expat n'intervient pas dans la fixation ni l'encaissement des honoraires, sauf mécanisme de paiement unique décrit ci-dessous).

6.2. L'Avocat remet ses conventions d'honoraires selon le droit local, collecte/reverse les taxes applicables et respecte les règles locales (publicité, démarchage, conflits d'intérêts, consommateurs).

6.3. SOS Expat n'est pas responsable de la qualité, de l'exactitude ou du résultat des conseils de l'Avocat.

---

## 7. Frais, paiement unique et taxes

7.1. **Frais de Mise en relation (forfait).** 19 € (EUR) ou 25 $ (USD) par Mise en relation, hors taxes et hors frais du Prestataire de paiement. SOS Expat peut modifier ces montants et/ou publier des barèmes locaux par pays/devise, avec effet prospectif.

7.2. **Paiement unique et répartition.** L'Utilisateur effectue un paiement unique via la Plateforme couvrant (i) les honoraires de l'Avocat (tels que convenus entre l'Avocat et l'Utilisateur) et (ii) les Frais de Mise en relation d'SOS Expat. SOS Expat (ou son Prestataire) encaisse ce paiement, déduit ses Frais de Mise en relation, puis reverse le solde à l'Avocat. L'Avocat autorise SOS Expat à procéder à ces déductions et répartitions.

7.3. **Exigibilité & non-remboursement.** Les Frais de Mise en relation sont dus dès la Mise en relation et sont non remboursables (sauf geste commercial discrétionnaire d'SOS Expat en cas d'échec exclusivement imputable à la Plateforme et dans la mesure permise par la loi).

7.4. **Remboursement à l'Utilisateur.** Si un remboursement est accordé à l'Utilisateur, il est imputé sur la part de l'Avocat : SOS Expat peut retenir/compenser le montant correspondant sur les versements futurs de l'Avocat, ou en demander le remboursement si aucun versement n'est à venir. Aucun remboursement des Frais de Mise en relation n'est dû, sauf décision discrétionnaire d'SOS Expat.

7.5. **Devises & conversion.** Plusieurs devises peuvent être proposées ; des taux/frais de conversion du Prestataire peuvent s'appliquer.

7.6. **Taxes.** L'Avocat demeure responsable de ses obligations fiscales. SOS Expat collecte et reverse, lorsque requis, la TVA/équivalent local sur les Frais de Mise en relation.

7.7. **Compensation.** SOS Expat peut compenser tout montant que l'Avocat lui doit (au titre d'un remboursement Utilisateur ou autre) avec toute somme due à l'Avocat.

---

## 8. Paiements – KYC/LCB-FT – Sanctions

8.1. Les paiements sont traités par des Prestataires tiers. L'Avocat accepte leurs conditions et processus KYC/LCB-FT.

8.2. SOS Expat peut différer, retenir ou annuler des paiements en cas de soupçon de fraude, de non-conformité ou d'injonction légale.

8.3. L'accès peut être restreint dans des territoires soumis à sanctions/embargos si la loi l'exige. L'Avocat déclare ne figurer sur aucune liste de sanctions et respecter les contrôles export applicables.

### Fonds non réclamés et vérification KYC

8.4. **Obligation de compléter le processus de vérification (KYC).** Pour recevoir les paiements issus des prestations réalisées via la Plateforme, l'Avocat s'engage à compléter le processus de vérification d'identité (KYC - Know Your Customer) auprès de notre partenaire de paiement Stripe dans les meilleurs délais suivant son inscription. L'Avocat reconnaît que l'absence de vérification KYC complète empêche techniquement le versement des fonds sur son compte bancaire.

8.5. **Conservation des fonds en attente.** Lorsqu'un paiement est effectué par un Utilisateur pour une prestation réalisée par un Avocat n'ayant pas complété sa vérification KYC, les fonds correspondant à la part de l'Avocat (déduction faite des frais de mise en relation de la Plateforme) sont conservés en attente sur un compte séquestre. La Plateforme s'engage à :
- Notifier l'Avocat par email de l'existence de fonds en attente ;
- Envoyer des rappels réguliers (à 7 jours, 30 jours, 60 jours, 90 jours, 120 jours et 150 jours) ;
- Fournir à l'Avocat tous les moyens nécessaires pour compléter sa vérification KYC.

8.6. **Fonds non réclamés et déchéance.** À défaut de vérification KYC complète dans un délai de **cent quatre-vingts (180) jours** à compter du premier paiement mis en attente, et malgré les notifications prévues à l'article 8.5, les fonds seront considérés comme **abandonnés** par l'Avocat. L'Avocat reconnaît et accepte expressément que :
- (a) Les fonds non réclamés dans ce délai seront définitivement acquis à la Plateforme à titre d'indemnité forfaitaire pour frais de gestion, conservation et tentatives de contact ;
- (b) Cette acquisition est la contrepartie des coûts administratifs supportés par la Plateforme pour la gestion des fonds non réclamés ;
- (c) Il renonce expressément à toute réclamation sur ces fonds passé le délai de 180 jours.

8.7. **Réclamation exceptionnelle.** Par dérogation à l'article 8.6, l'Avocat peut adresser une demande de réclamation motivée dans un délai maximum de **douze (12) mois** suivant l'expiration du délai de 180 jours, uniquement dans les cas suivants : incapacité médicale documentée, force majeure dûment justifiée, ou erreur technique imputable à la Plateforme. La Plateforme examinera la demande sous 30 jours et se réserve le droit d'accepter ou de refuser la réclamation. En cas d'acceptation, des frais de traitement de **vingt pour cent (20%)** seront retenus sur le montant restitué.

8.8. **Acceptation expresse.** En s'inscrivant sur la Plateforme en tant qu'Avocat, celui-ci déclare avoir pris connaissance des présentes conditions relatives aux fonds non réclamés et les accepte expressément. Cette acceptation constitue une condition essentielle et déterminante de l'accès au statut de prestataire sur la Plateforme.

---

## 9. Données personnelles (cadre global – GDPR/DSA)

9.1. **Rôles.** Pour les données des Utilisateurs reçues aux fins de Mise en relation, SOS Expat et l'Avocat agissent chacun en responsable de traitement pour leurs finalités respectives, conformément au **Règlement (UE) 2016/679 (GDPR)**.

9.2. **Bases & finalités.** Exécution du contrat (Mise en relation), intérêts légitimes (sécurité, prévention de la fraude, amélioration), conformité légale (LCB-FT, sanctions), et, le cas échéant, consentement.

9.3. **Transferts internationaux** avec garanties appropriées lorsque requis (clauses contractuelles types, décision d'adéquation, etc.).

9.4. **Droits & contact.** Exercice des droits (accès, rectification, effacement, portabilité, opposition) via le formulaire de contact de la Plateforme.

9.5. **Sécurité.** Mesures techniques/organisationnelles raisonnables ; notification des violations selon les lois applicables (72 heures conformément au GDPR).

9.6. L'Avocat traite les données reçues conformément au droit du Pays d'Intervention et à sa déontologie (secret professionnel).

9.7. **Conformité DSA.** La Plateforme opère en tant que **service intermédiaire** au sens du **Règlement (UE) 2022/2065 (Digital Services Act)**. SOS Expat met en place des mécanismes de signalement de contenus illicites et coopère avec les autorités compétentes conformément au DSA.

---

## 10. Propriété intellectuelle

La Plateforme, ses marques, logos, bases de données et contenus sont protégés. Aucun droit n'est cédé à l'Avocat, hormis un droit personnel, non exclusif, non transférable d'accès pendant la durée des CGU. Les contenus fournis par l'Avocat (profil, photo, descriptifs) font l'objet d'une licence mondiale, non exclusive en faveur d'SOS Expat pour l'hébergement et l'affichage dans la Plateforme.

---

## 11. Garanties, responsabilité et indemnisation

11.1. Aucune garantie quant aux services juridiques ; SOS Expat n'assure ni l'issue, ni la qualité, ni le volume d'affaires.

11.2. Plateforme « en l'état » ; aucune garantie d'accessibilité continue.

11.3. **Limitation de responsabilité** : dans la mesure permise, la responsabilité totale d'SOS Expat envers l'Avocat est limitée aux dommages directs et ne peut excéder le total des Frais de Mise en relation perçus par SOS Expat au titre de la transaction à l'origine de la réclamation.

11.4. **Exclusions** : aucun dommage indirect/consécutif/spécial/punitif (perte de profits, clientèle, réputation, etc.).

11.5. **Indemnisation** : l'Avocat indemnise et garantit SOS Expat (et ses affiliés, dirigeants, employés, agents) contre toute réclamation/préjudice/frais (dont honoraires d'avocat) liés à (i) ses manquements aux CGU/lois, (ii) ses contenus, (iii) ses conseils/omissions.

11.6. **Renonciation aux recours.** L'Avocat **renonce expressément et irrévocablement** à tout recours contre SOS Expat au titre (i) des dommages résultant de la prestation de services juridiques, (ii) des pertes indirectes, (iii) des litiges contractuels avec les Utilisateurs, (iv) de toute défaillance des services fournis par l'Avocat. Cette renonciation s'applique dans la mesure maximale permise par la loi.

11.7. Aucune représentation : rien n'emporte mandat, emploi, partenariat ou coentreprise entre SOS Expat et l'Avocat.

11.8. **Force majeure.** SOS Expat n'est pas responsable des retards ou défaillances causés par des événements de **force majeure** (catastrophe naturelle, guerre, pandémie, cyberattaque, panne électrique ou internet, décision gouvernementale, grève, etc.).

11.9. **Survie** : les articles 5, 7, 8, 9, 10, 11, 12, 13 et 14 survivent à la résiliation.

---

## 12. Droit applicable – Arbitrage – Juridiction estonienne – Actions collectives

12.1. **Droit matériel** : pour chaque Mise en relation, la relation SOS Expat–Avocat est régie par les lois du Pays d'Intervention, sous réserve des règles d'ordre public locales et des normes internationales impératives. **À titre supplétif et pour l'interprétation/validité des présentes CGU ainsi que pour toute question non régie par le droit du Pays d'Intervention, le droit estonien s'applique.**

12.2. **Arbitrage CCI obligatoire** : tout litige SOS Expat/Avocat est résolu définitivement selon le Règlement d'Arbitrage de la CCI. **Siège : Tallinn (Estonie)**. **Langue : français**. Le tribunal applique le droit matériel défini à l'art. 12.1. Procédure confidentielle.

12.3. **Renonciation aux actions collectives** : dans la mesure permise, toute action collective/de groupe/représentative est exclue ; réclamations individuelles uniquement.

12.4. **Compétence exclusive des tribunaux d'Estonie** : pour toute demande non arbitrable et pour l'exécution des sentences ou mesures urgentes, les **tribunaux estoniens** (compétents à Tallinn) ont **compétence exclusive**. L'Avocat renonce à toute objection de forum ou de non-convenance.

12.5. **Médiation préalable.** Avant tout arbitrage, les parties s'engagent à tenter de résoudre le litige à l'amiable par **négociation de bonne foi** pendant un délai de **trente (30) jours** à compter de la notification écrite du différend.

---

## 13. Clauses de protection internationale

13.1. **Anti-corruption.** L'Avocat s'engage à ne pas offrir, promettre ou verser de pots-de-vin ou avantages indus à des agents publics ou privés. Il respecte les lois anti-corruption applicables (FCPA, UK Bribery Act, loi Sapin II, etc.).

13.2. **Confidentialité des échanges.** Les échanges réalisés via la Plateforme (messages, appels téléphoniques) sont **confidentiels**. L'Avocat s'interdit de les enregistrer, divulguer ou utiliser à d'autres fins que la prestation convenue, sauf autorisation écrite ou obligation légale.

13.3. **Non-sollicitation.** Pendant la durée des CGU et **douze (12) mois** après leur résiliation, l'Avocat s'interdit de solliciter directement les Utilisateurs rencontrés via la Plateforme pour éviter les Frais de Mise en relation.

13.4. **Responsabilité exclusive de l'Avocat.** L'Avocat est **seul responsable** de la qualité, de l'exactitude et de la légalité des conseils et services qu'il fournit. L'Avocat est **entièrement responsable** du respect des dispositions légales et réglementaires du pays où il exerce. SOS Expat **ne garantit pas** les conseils juridiques délivrés par l'Avocat et **décline toute responsabilité** pour tout préjudice subi par un Utilisateur du fait des services de l'Avocat.

13.5. **Absence de relation de conseil.** SOS Expat n'est **pas un cabinet d'avocats**, ni un prestataire de services juridiques. La Plateforme se limite à la **mise en relation**. Toute relation de conseil juridique est établie **exclusivement** entre l'Avocat et l'Utilisateur, **hors** de SOS Expat. **Tout dossier** qui serait conclu avec un client se fera **hors de SOS Expat**.

13.6. **Litiges Avocat-Utilisateur.** Tout litige entre un Avocat et un Utilisateur relève **exclusivement** de leur relation directe. SOS Expat **n'intervient pas** dans ces litiges et **ne peut être mis en cause** comme partie, garant ou médiateur. SOS Expat n'est **en aucun cas responsable** des litiges entre Avocat et client.

---

## 14. Divers

14.1. **Cession** : SOS Expat peut céder les CGU à une entité de son groupe ou à un successeur ; l'Avocat ne peut céder sans accord écrit d'SOS Expat.

14.2. **Intégralité** : les CGU constituent l'accord complet et remplacent tout accord antérieur relatif au même objet.

14.3. **Notifications** : par publication sur la Plateforme, notification in-app ou via le formulaire de contact.

14.4. **Interprétation** : les intitulés sont indicatifs. Aucune règle contra proferentem.

14.5. **Langues** : des traductions peuvent être fournies ; l'anglais prévaut pour l'interprétation.

14.6. **Nullité partielle** : si une stipulation est nulle/inapplicable, le reste demeure en vigueur ; remplacement par une stipulation valide d'effet équivalent lorsque possible.

14.7. **Non-renonciation** : l'absence d'exercice d'un droit n'emporte pas renonciation.

---

## 15. Contact

Pour toute question ou demande légale : **https://sos-expat.com/contact**
`;

  const defaultEn = `
# Terms of Use – Lawyers (Global)

**SOS Expat by WorldExpat OÜ** (the "**Platform**", "**SOS**", "**we**")

**Version 2.2 – Last updated: June 16, 2025**

---

## 1. Definitions

**Application / Site / Platform**: digital services operated by **WorldExpat OÜ** enabling the connection between users (the "**Users**") and lawyers (the "**Lawyers**").

**Connection**: the technical/operational introduction made by the Platform between a User and a Lawyer, represented by (i) the transmission of contact details, (ii) opening a communication channel (call, message, video), or (iii) the Lawyer accepting a request submitted via the Platform.

**Country of Intervention**: the jurisdiction primarily targeted by the Request at the time of the Connection. Failing that, the country of residence of the User at the time of the request; in case of multiple jurisdictions, the one most closely related to the subject of the Request.

**Connection Fee**: fees owed to SOS for each Connection (art. 7): **€19** if paid in **EUR** or **$25 USD** if paid in **USD**, provided that SOS Expat may modify these amounts and/or publish local scales per country/currency, with prospective effect.

**Request**: the legal situation/project presented by the User.

**Payment Provider(s)**: third-party services used to collect the User's single payment and distribute funds.

---

## 2. Purpose, Scope, and Acceptance

2.1. These Terms govern access to and use of the Platform by Lawyers.

2.2. SOS Expat acts solely as a technical intermediary for connections. SOS Expat does not practice law, provide legal advice, or participate in the Lawyer–User relationship.

2.3. **Electronic Acceptance (click-wrap).** The Lawyer accepts the Terms by checking the dedicated box during registration and/or by using the Platform. This constitutes an electronic signature and contractual consent. SOS may retain proof logs (timestamps, technical identifiers).

2.4. **Changes.** SOS may update the Terms and/or fee schedules (per country/currency) at any time, with prospective effect after publication on the Platform. Continued use constitutes acceptance.

2.5. Duration: indefinite.

---

## 3. Lawyer Status – Independence and Compliance

3.1. The Lawyer acts as an independent professional; no employment, mandate, agency, partnership, or joint venture is created with SOS Expat.

3.2. The Lawyer is solely responsible for: (i) their degrees, titles, bar/equivalent registrations, and practice authorizations; (ii) their professional liability insurance valid and appropriate for the Countries of Intervention; (iii) compliance with local laws and professional rules (ethics, advertising/solicitation, conflicts of interest, professional secrecy, AML/KYC, taxation, consumer protection, etc.).

3.3. SOS Expat does not supervise or evaluate the content or quality of the Lawyer’s advice and assumes no responsibility in this regard.

3.4. **Professional capacity (B2B).** The Lawyer declares acting exclusively for professional purposes. Consumer protection regimes do not apply to the SOS Expat–Lawyer relationship.

---

## 4. Account Creation, Verification, and Security

4.1. Requirements: valid right to practice in at least one jurisdiction, proof of identity and qualifications, valid professional liability insurance.

4.2. Process: account creation, document submission, manual validation which may include a video interview and KYC/AML checks via Providers.

4.3. Accuracy & Updates: the Lawyer guarantees the accuracy and currency of information; one (1) account per Lawyer.

4.4. Security: the Lawyer protects their credentials; any activity via the account is deemed performed by them; immediate reporting of any compromise.

4.5. **Inactivity & termination.** After **365 days of inactivity**, the account may be automatically deactivated following notification. The Lawyer may close their account at any time after fulfilling their outstanding obligations. SOS Expat may suspend or terminate an account for violation of the Terms, without prejudice to other remedies.

4.6. **Electronic communications.** The Lawyer consents to receive any notifications related to the Terms by electronic means (email, in-app notification, publication on the Platform).

---

## 5. Rules of Use – Conflicts, Confidentiality, Non-Circumvention

5.1. **Conflicts of interest.** The Lawyer conducts appropriate screening before any advice. In case of conflict, they withdraw and inform the User.

5.2. **Professional secrecy & confidentiality.** The Lawyer respects confidentiality/professional secrecy according to the applicable law of the Country of Intervention. Exchanges are not recorded by SOS, except as required by law.

5.3. **Non-circumvention.** SOS Expat does not receive any commission on fees. Each new Connection with a new User via the Platform incurs Connection Fees. Circumventing the Platform to avoid these fees for a new introduction is prohibited.

5.4. **Prohibited behavior.** Identity/title impersonation, illegal content, manipulation, collusion/boicotting to harm the Platform, violation of sanctions/export laws, or any illegal activity.

5.5. **Availability.** The Platform is provided "as is"; uninterrupted availability is not guaranteed (maintenance, incidents, force majeure). Access may be restricted if required by law.

---

## 6. Lawyer–User Relationship (off-Platform)

6.1. After the Connection, the Lawyer and User may contract off-Platform (SOS Expat does not intervene in fee setting or collection, except for the single payment mechanism described below).

6.2. The Lawyer issues fee agreements according to local law, collects/remits applicable taxes, and complies with local rules (advertising, solicitation, conflicts of interest, consumer law).

6.3. SOS Expat is not responsible for the quality, accuracy, or outcome of the Lawyer's advice.

---

## 7. Fees, Single Payment, and Taxes

7.1. **Connection Fees (flat rate).** €19 (EUR) or $25 (USD) per Connection, excluding taxes and Payment Provider fees. SOS Expat may modify these amounts and/or publish local scales per country/currency, with prospective effect.

7.2. **Single payment and distribution.** The User makes a single payment via the Platform covering (i) the Lawyer’s fees (as agreed between Lawyer and User) and (ii) SOS Expat’s Connection Fees. SOS Expat (or its Provider) collects this payment, deducts its Connection Fees, then transfers the balance to the Lawyer. The Lawyer authorizes SOS Expat to make these deductions and distributions.

7.3. **Due & non-refundable.** Connection Fees are due upon Connection and are non-refundable (except at SOS Expat's discretion in case of failure solely attributable to the Platform, to the extent allowed by law).

7.4. **User refunds.** If a refund is granted to the User, it is charged to the Lawyer’s share: SOS Expat may withhold/offset the corresponding amount from future payments to the Lawyer or request repayment if no payments are forthcoming. No refund of Connection Fees is due, except at SOS Expat's discretion.

7.5. **Currencies & conversion.** Multiple currencies may be offered; Provider conversion rates/fees may apply.

7.6. **Taxes.** The Lawyer remains responsible for their tax obligations. SOS Expat collects and remits, where required, VAT/local equivalent on Connection Fees.

7.7. **Offset.** SOS Expat may offset any amount the Lawyer owes (for a User refund or other) against any amount owed to the Lawyer.

---

## 8. Payments – KYC/AML – Sanctions

8.1. Payments are processed by third-party Providers. The Lawyer agrees to their KYC/AML terms and processes.

8.2. SOS Expat may defer, withhold, or cancel payments in case of suspected fraud, non-compliance, or legal order.

8.3. Access may be restricted in sanctioned/embargoed territories if required by law. The Lawyer declares not to appear on any sanctions list and to comply with applicable export controls.

### Unclaimed Funds and KYC Verification

8.4. **Obligation to complete the verification process (KYC).** To receive payments from services provided through the Platform, the Lawyer agrees to complete the identity verification process (KYC - Know Your Customer) with our payment partner Stripe as soon as possible following registration. The Lawyer acknowledges that failure to complete KYC verification technically prevents the transfer of funds to their bank account.

8.5. **Holding of pending funds.** When a payment is made by a User for a service provided by a Lawyer who has not completed KYC verification, the funds corresponding to the Lawyer's share (after deduction of the Platform's connection fees) are held in escrow. The Platform commits to:
- Notify the Lawyer by email of the existence of pending funds;
- Send regular reminders (at 7 days, 30 days, 60 days, 90 days, 120 days, and 150 days);
- Provide the Lawyer with all necessary means to complete their KYC verification.

8.6. **Unclaimed funds and forfeiture.** If KYC verification is not completed within **one hundred and eighty (180) days** from the first payment placed on hold, and despite the notifications provided in article 8.5, the funds shall be considered **abandoned** by the Lawyer. The Lawyer expressly acknowledges and accepts that:
- (a) Unclaimed funds within this period shall be definitively acquired by the Platform as a lump-sum indemnity for management, custody, and contact attempt costs;
- (b) This acquisition compensates for the administrative costs borne by the Platform for managing unclaimed funds;
- (c) They expressly waive any claim to these funds after the 180-day period.

8.7. **Exceptional claim.** Notwithstanding article 8.6, the Lawyer may submit a substantiated claim within a maximum of **twelve (12) months** following the expiration of the 180-day period, only in the following cases: documented medical incapacity, duly justified force majeure, or technical error attributable to the Platform. The Platform will review the request within 30 days and reserves the right to accept or reject the claim. If accepted, a processing fee of **twenty percent (20%)** will be deducted from the refunded amount.

8.8. **Express acceptance.** By registering on the Platform as a Lawyer, they declare that they have read these conditions relating to unclaimed funds and expressly accept them. This acceptance constitutes an essential and determining condition for access to provider status on the Platform.

---

## 9. Personal Data (Global Framework – GDPR/DSA)

9.1. **Roles.** For User data received for Connections, SOS Expat and the Lawyer each act as data controllers for their respective purposes, in accordance with **Regulation (EU) 2016/679 (GDPR)**.

9.2. **Bases & purposes.** Contract performance (Connection), legitimate interests (security, fraud prevention, improvement), legal compliance (AML, sanctions), and, if applicable, consent.

9.3. **International transfers** with appropriate safeguards where required (standard contractual clauses, adequacy decisions, etc.).

9.4. **Rights & contact.** Exercise of rights (access, rectification, erasure, portability, objection) via the Platform contact form.

9.5. **Security.** Reasonable technical/organizational measures; breach notification according to applicable laws (72 hours under GDPR).

9.6. The Lawyer processes received data in accordance with the law of the Country of Intervention and professional secrecy.

9.7. **DSA Compliance.** The Platform operates as an **intermediary service** within the meaning of **Regulation (EU) 2022/2065 (Digital Services Act)**. SOS Expat implements mechanisms for reporting illegal content and cooperates with competent authorities in accordance with the DSA.

---

## 10. Intellectual Property

The Platform, its trademarks, logos, databases, and content are protected. No rights are granted to the Lawyer except a personal, non-exclusive, non-transferable right to access during the Terms. Content provided by the Lawyer (profile, photo, descriptions) is licensed globally, non-exclusively, to SOS Expat for hosting and display on the Platform.

---

## 11. Warranties, Liability, and Indemnification

11.1. No guarantee regarding legal services; SOS Expat does not ensure outcome, quality, or volume of business.

11.2. Platform "as is"; no guarantee of continuous availability.

11.3. **Limitation of liability**: to the extent permitted, SOS Expat’s total liability to the Lawyer is limited to direct damages and may not exceed the total Connection Fees received by SOS Expat for the transaction giving rise to the claim.

11.4. **Exclusions**: no indirect/consequential/special/punitive damages (loss of profits, clients, reputation, etc.).

11.5. **Indemnification**: the Lawyer indemnifies and holds SOS Expat (and its affiliates, officers, employees, agents) harmless from any claim/damage/costs (including attorney fees) related to (i) breaches of the Terms/laws, (ii) their content, (iii) their advice/omissions.

11.6. **Waiver of recourse.** The Lawyer **expressly and irrevocably waives** any recourse against SOS Expat for (i) damages arising from the provision of legal services, (ii) indirect losses, (iii) contractual disputes with Users, (iv) any failure of services provided by the Lawyer. This waiver applies to the maximum extent permitted by law.

11.7. No representation: nothing creates mandate, employment, partnership, or joint venture between SOS Expat and the Lawyer.

11.8. **Force majeure.** SOS Expat is not liable for delays or failures caused by **force majeure** events (natural disaster, war, pandemic, cyberattack, power or internet outage, government decision, strike, etc.).

11.9. **Survival**: articles 5, 7, 8, 9, 10, 11, 12, 13, and 14 survive termination.

---

## 12. Governing Law – Arbitration – Estonian Jurisdiction – Class Actions

12.1. **Substantive law**: for each Connection, the SOS Expat–Lawyer relationship is governed by the laws of the Country of Intervention, subject to local public policy rules and mandatory international norms. **Supplementarily and for interpretation/validity of these Terms and for any matter not governed by the Country of Intervention's law, Estonian law applies.**

12.2. **Mandatory ICC Arbitration**: any dispute between SOS Expat/Lawyer is finally resolved under the ICC Arbitration Rules. **Seat: Tallinn, Estonia**. **Language: French.** The tribunal applies the substantive law defined in 12.1. Confidential procedure.

12.3. **Waiver of class actions**: to the extent permitted, all collective/group/representative actions are excluded; individual claims only.

12.4. **Exclusive jurisdiction of Estonian courts**: for any non-arbitrable claims and for enforcement of awards or urgent measures, the **Estonian courts** (with jurisdiction in Tallinn) have **exclusive jurisdiction**. The Lawyer waives any forum or inconvenience objection.

12.5. **Pre-arbitration mediation.** Before any arbitration, the parties agree to attempt to resolve the dispute amicably through **good faith negotiation** for a period of **thirty (30) days** from written notice of the dispute.

---

## 13. International Protection Clauses

13.1. **Anti-corruption.** The Lawyer agrees not to offer, promise, or pay bribes or undue benefits to public or private officials. The Lawyer complies with applicable anti-corruption laws (FCPA, UK Bribery Act, Sapin II Act, etc.).

13.2. **Confidentiality of communications.** Communications made through the Platform (messages, calls, videos) are **confidential**. The Lawyer shall not record, disclose, or use them for purposes other than the agreed service, except with written authorization or legal obligation.

13.3. **Non-solicitation.** During the term of these Terms and **twelve (12) months** after termination, the Lawyer shall not directly solicit Users met through the Platform to avoid Connection Fees.

13.4. **Exclusive responsibility of the Lawyer.** The Lawyer is **solely responsible** for the quality, accuracy, and legality of the advice and services provided. The Lawyer is **entirely responsible** for compliance with legal and regulatory provisions of the country where they practice. SOS Expat **does not guarantee** the legal advice delivered by the Lawyer and **disclaims any liability** for any harm suffered by a User due to the Lawyer's services.

13.5. **No legal advisory relationship.** SOS Expat is **not a law firm**, nor a legal services provider. The Platform is limited to **connection services**. Any legal advisory relationship is established **exclusively** between the Lawyer and the User, **outside** of SOS Expat. **Any case** concluded with a client shall be handled **outside of SOS Expat**.

13.6. **Lawyer-User disputes.** Any dispute between a Lawyer and a User falls **exclusively** within their direct relationship. SOS Expat **does not intervene** in such disputes and **cannot be held liable** as a party, guarantor, or mediator. SOS Expat is **in no way responsible** for disputes between Lawyer and client.

---

## 14. Miscellaneous

14.1. **Assignment**: SOS Expat may assign the Terms to a group entity or successor; the Lawyer may not assign without SOS Expat's written consent.

14.2. **Entire agreement**: the Terms constitute the complete agreement and replace any prior agreement regarding the same subject.

14.3. **Notices**: by publication on the Platform, in-app notification, or via the contact form.

14.4. **Interpretation**: headings are indicative. No contra proferentem rule.

14.5. **Languages**: translations may be provided; English prevails for interpretation.

14.6. **Partial invalidity**: if a provision is invalid/unenforceable, the remainder remains in effect; replacement by a valid provision of equivalent effect where possible.

14.7. **Non-waiver**: failure to exercise a right does not constitute a waiver.

---

## 15. Contact

For any legal question or request: **https://sos-expat.com/contact**
`;

  const defaultEs = `
# Condiciones Generales de Uso – Abogados (Global)

**SOS Expat de WorldExpat OÜ** (la « **Plataforma** », « **SOS** », « **nosotros** »)

**Versión 2.2 – Última actualización: 16 de junio de 2025**

---

## 1. Definiciones

**Aplicación / Sitio / Plataforma**: servicios digitales operados por **WorldExpat OÜ** que permiten la conexión entre usuarios (los « **Usuarios** ») y abogados (los « **Abogados** »).

**Conexión**: la introducción técnica/operativa realizada por la Plataforma entre un Usuario y un Abogado, materializada mediante (i) la transmisión de datos de contacto, (ii) la apertura de un canal de comunicación (llamada, mensaje, videoconferencia), o (iii) la aceptación por parte del Abogado de una solicitud realizada a través de la Plataforma.

**País de Intervención**: la jurisdicción principal a la que se dirige la Solicitud en el momento de la Conexión. En su defecto, el país de residencia del Usuario en el momento de la solicitud; en caso de pluralidad, la jurisdicción más estrechamente vinculada al objeto de la Solicitud.

**Tarifa de Conexión**: tarifa debida a SOS por cada Conexión (art. 7): **19 €** si se paga en **EUR** o **25 $ USD** si se paga en **USD**, precisando que SOS Expat puede modificar estos montos y/o publicar tarifas locales por país/moneda, con efecto prospectivo.

**Solicitud**: la situación/proyecto legal presentado por el Usuario.

**Proveedor(es) de pago**: servicios de terceros utilizados para recibir el pago único del Usuario y distribuir los fondos.

---

## 2. Objeto, alcance y aceptación

2.1. Estas CGU regulan el acceso y uso de la Plataforma por parte de los Abogados.

2.2. SOS Expat actúa únicamente como intermediario técnico de conexión. SOS Expat no ejerce la profesión de abogado, no ofrece asesoramiento legal y no es parte de la relación Abogado-Usuario.

2.3. **Aceptación electrónica (click-wrap).** El Abogado acepta las CGU marcando la casilla correspondiente durante el registro y/o utilizando la Plataforma. Este acto equivale a firma electrónica y consentimiento contractual. SOS puede conservar registros de prueba (marcas de tiempo, identificadores técnicos).

2.4. **Modificaciones.** SOS puede actualizar las CGU y/o la tarifa (por país/moneda) en cualquier momento, con efecto prospectivo tras su publicación en la Plataforma. El uso continuado implica aceptación.

2.5. Duración: indefinida.

---

## 3. Estatus del Abogado – Independencia y cumplimiento

3.1. El Abogado actúa como profesional independiente; no se crea ninguna relación laboral, mandato, agencia, asociación o joint venture con SOS Expat.

3.2. El Abogado es el único responsable de: (i) sus títulos, inscripciones en colegios de abogados/equivalentes y autorizaciones para ejercer; (ii) su seguro de responsabilidad civil profesional vigente y adecuado para los Países de Intervención; (iii) cumplir con las leyes y normas profesionales locales (ética, publicidad/contacto, conflictos de interés, secreto profesional, AML/KYC, fiscalidad, protección del consumidor, etc.).

3.3. SOS Expat no supervisa ni evalúa el contenido o la calidad del asesoramiento del Abogado y no asume ninguna responsabilidad al respecto.

3.4. **Capacidad profesional (B2B).** El Abogado declara actuar exclusivamente con fines profesionales. Las protecciones de consumidores no se aplican a la relación SOS Expat–Abogado.

---

## 4. Creación de cuenta, verificaciones y seguridad

4.1. Condiciones: derecho válido a ejercer en al menos una jurisdicción, comprobantes de identidad y calificaciones, seguro de responsabilidad civil vigente.

4.2. Proceso: creación de cuenta, envío de documentos, validación manual que puede incluir entrevista por videoconferencia y controles KYC/AML mediante Proveedores.

4.3. Exactitud y actualización: el Abogado garantiza la exactitud y actualidad de la información; una (1) cuenta por Abogado.

4.4. Seguridad: el Abogado protege sus credenciales; cualquier actividad realizada a través de la cuenta se considera hecha por él; notificación inmediata de cualquier compromiso.

4.5. **Inactividad y terminación.** Después de **365 días de inactividad**, la cuenta puede desactivarse automáticamente tras notificación. El Abogado puede cerrar su cuenta en cualquier momento después de cumplir sus obligaciones pendientes. SOS Expat puede suspender o terminar una cuenta por violación de los Términos, sin perjuicio de otros recursos.

4.6. **Comunicaciones electrónicas.** El Abogado consiente recibir notificaciones relativas a los Términos por medios electrónicos (email, notificación in-app, publicación en la Plataforma).

---

## 5. Reglas de uso – Conflictos, confidencialidad, no elusión

5.1. **Conflictos de interés.** El Abogado realiza un examen adecuado antes de cualquier asesoramiento. En caso de conflicto, se retira e informa al Usuario.

5.2. **Secreto profesional y confidencialidad.** El Abogado respeta la confidencialidad/secreto profesional según la ley aplicable del País de Intervención. Los intercambios no son grabados por SOS, salvo obligaciones legales.

5.3. **No elusión.** SOS Expat no recibe comisión sobre honorarios. Cada nueva Conexión con un Usuario nuevo mediante la Plataforma genera Tarifa de Conexión. Está prohibido eludir la Plataforma para evitar estas tarifas.

5.4. **Conductas prohibidas.** Suplantación de identidad/título, contenidos ilícitos, manipulación, colusión/boicot contra la Plataforma, violación de leyes de sanciones/exportación o cualquier actividad ilegal.

5.5. **Disponibilidad.** La Plataforma se proporciona “tal cual”; no se garantiza disponibilidad continua (mantenimiento, incidentes, fuerza mayor). El acceso puede ser restringido si la ley lo requiere.

---

## 6. Relación Abogado–Usuario (fuera de la Plataforma)

6.1. Tras la Conexión, Abogado y Usuario pueden contratar fuera de la Plataforma (SOS Expat no interviene en la fijación ni cobro de honorarios, salvo el mecanismo de pago único descrito a continuación).

6.2. El Abogado entrega sus acuerdos de honorarios según la ley local, recauda/reembolsa impuestos aplicables y cumple normas locales (publicidad, contacto, conflictos de interés, consumidores).

6.3. SOS Expat no es responsable de la calidad, exactitud o resultado del asesoramiento del Abogado.

---

## 7. Tarifas, pago único e impuestos

7.1. **Tarifa de Conexión (tarifa fija).** 19 € (EUR) o 25 $ (USD) por Conexión, sin impuestos ni tarifas de Proveedor de pago. SOS Expat puede modificar estos montos y/o publicar tarifas locales por país/moneda, con efecto prospectivo.

7.2. **Pago único y distribución.** El Usuario realiza un pago único mediante la Plataforma cubriendo (i) honorarios del Abogado (según lo acordado entre Abogado y Usuario) y (ii) la Tarifa de Conexión de SOS Expat. SOS Expat (o su Proveedor) recibe el pago, deduce la Tarifa de Conexión y transfiere el saldo al Abogado. El Abogado autoriza a SOS Expat a realizar estas deducciones y distribuciones.

7.3. **Exigibilidad y no reembolso.** La Tarifa de Conexión se debe desde la Conexión y no es reembolsable (salvo gesto comercial discrecional de SOS Expat en caso de fallo atribuible exclusivamente a la Plataforma y permitido por ley).

7.4. **Reembolso al Usuario.** Si se concede un reembolso al Usuario, se imputa a la parte del Abogado: SOS Expat puede retener/compensar la cantidad correspondiente de pagos futuros del Abogado, o solicitar reembolso si no hay pagos pendientes. Ningún reembolso de la Tarifa de Conexión es obligatorio salvo decisión discrecional de SOS Expat.

7.5. **Monedas y conversión.** Se pueden ofrecer varias monedas; pueden aplicarse tasas/cargos de conversión del Proveedor.

7.6. **Impuestos.** El Abogado sigue siendo responsable de sus obligaciones fiscales. SOS Expat recauda y remite, cuando se requiera, IVA/equivalente local sobre la Tarifa de Conexión.

7.7. **Compensación.** SOS Expat puede compensar cualquier cantidad que el Abogado le deba (por reembolso a Usuario u otro) con cualquier monto adeudado al Abogado.

---

## 8. Pagos – KYC/AML – Sanciones

8.1. Los pagos son procesados por Proveedores externos. El Abogado acepta sus condiciones y procesos KYC/AML.

8.2. SOS Expat puede diferir, retener o cancelar pagos en caso de sospecha de fraude, incumplimiento o mandato legal.

8.3. El acceso puede ser restringido en territorios sujetos a sanciones/embargos si la ley lo exige. El Abogado declara no figurar en listas de sanciones y cumplir controles de exportación aplicables.

---

## 9. Datos personales (marco global – GDPR/DSA)

9.1. **Roles.** Para datos de Usuarios recibidos para la Conexión, SOS Expat y el Abogado actúan cada uno como responsables de tratamiento para sus fines respectivos, conforme al **Reglamento (UE) 2016/679 (GDPR)**.

9.2. **Bases y finalidades.** Ejecución del contrato (Conexión), intereses legítimos (seguridad, prevención de fraude, mejora), cumplimiento legal (AML, sanciones), y, cuando aplique, consentimiento.

9.3. **Transferencias internacionales** con garantías adecuadas cuando se requiera (cláusulas contractuales tipo, decisión de adecuación, etc.).

9.4. **Derechos y contacto.** Ejercicio de derechos (acceso, rectificación, supresión, portabilidad, oposición) mediante el formulario de contacto de la Plataforma.

9.5. **Seguridad.** Medidas técnicas/organizativas razonables; notificación de violaciones según la ley aplicable (72 horas conforme al GDPR).

9.6. El Abogado procesa los datos recibidos conforme a la ley del País de Intervención y su ética profesional (secreto profesional).

9.7. **Cumplimiento DSA.** La Plataforma opera como **servicio intermediario** según el **Reglamento (UE) 2022/2065 (Ley de Servicios Digitales)**. SOS Expat implementa mecanismos para reportar contenido ilegal y coopera con las autoridades competentes conforme al DSA.

---

## 10. Propiedad intelectual

La Plataforma, sus marcas, logotipos, bases de datos y contenidos están protegidos. Ningún derecho se transfiere al Abogado, excepto un derecho personal, no exclusivo e intransferible de acceso durante la vigencia de las CGU. Los contenidos proporcionados por el Abogado (perfil, foto, descripciones) están licenciados mundialmente, de manera no exclusiva, a favor de SOS Expat para alojamiento y visualización en la Plataforma.

---

## 11. Garantías, responsabilidad e indemnización

11.1. No hay garantía sobre servicios legales; SOS Expat no asegura resultados, calidad ni volumen de negocios.

11.2. Plataforma “tal cual”; no hay garantía de acceso continuo.

11.3. **Limitación de responsabilidad:** en la medida permitida, la responsabilidad total de SOS Expat hacia el Abogado se limita a daños directos y no puede exceder el total de la Tarifa de Conexión recibida por SOS Expat por la transacción que originó la reclamación.

11.4. **Exclusiones:** no hay responsabilidad por daños indirectos, consecuentes, especiales o punitivos (pérdida de ganancias, clientela, reputación, etc.).

11.5. **Indemnización:** el Abogado indemniza y protege a SOS Expat (y sus afiliados, directivos, empleados, agentes) frente a cualquier reclamación/daño/gasto (incluidos honorarios legales) relacionados con (i) incumplimientos de CGU/leyes, (ii) sus contenidos, (iii) sus consejos/omisiones.

11.6. **Renuncia a recursos.** El Abogado **renuncia expresa e irrevocablemente** a cualquier recurso contra SOS Expat por (i) daños derivados de la prestación de servicios jurídicos, (ii) pérdidas indirectas, (iii) disputas contractuales con Usuarios, (iv) cualquier deficiencia de los servicios prestados por el Abogado. Esta renuncia aplica en la medida máxima permitida por la ley.

11.7. Ninguna representación: nada genera mandato, empleo, asociación o joint venture entre SOS Expat y el Abogado.

11.8. **Fuerza mayor.** SOS Expat no es responsable de retrasos o fallos causados por eventos de **fuerza mayor** (desastre natural, guerra, pandemia, ciberataque, corte eléctrico o de internet, decisión gubernamental, huelga, etc.).

11.9. **Supervivencia:** los artículos 5, 7, 8, 9, 10, 11, 12 y 13 sobreviven a la terminación.

---

## 12. Ley aplicable – Arbitraje – Jurisdicción estonia – Acciones colectivas

12.1. **Derecho material:** para cada Conexión, la relación SOS Expat–Abogado se rige por las leyes del País de Intervención, sujetas a normas imperativas y orden público local. **Suplementariamente y para la interpretación/validez de estas CGU o cuestiones no reguladas por el derecho del País de Intervención, se aplica la ley estonia.**

12.2. **Arbitraje obligatorio CCI:** cualquier disputa SOS Expat/Abogado se resuelve de manera definitiva según el Reglamento de Arbitraje de la CCI. **Sede: Tallinn (Estonia)**. **Idioma: francés.** El tribunal aplica el derecho material definido en el art. 12.1. Procedimiento confidencial.

12.3. **Renuncia a acciones colectivas:** en la medida permitida, se excluyen acciones colectivas/grupales/representativas; solo reclamaciones individuales.

12.4. **Competencia exclusiva tribunales de Estonia:** para cualquier demanda no arbitral y ejecución de laudos o medidas urgentes, los **tribunales estonios** (competentes en Tallinn) tienen **competencia exclusiva**. El Abogado renuncia a cualquier objeción de foro o inconveniencia.

---

## 13. Varios

13.1. **Cesión:** SOS Expat puede ceder las CGU a una entidad de su grupo o a un sucesor; el Abogado no puede ceder sin consentimiento escrito de SOS Expat.

13.2. **Integralidad:** las CGU constituyen el acuerdo completo y reemplazan cualquier acuerdo previo sobre el mismo objeto.

13.3. **Notificaciones:** mediante publicación en la Plataforma, notificación in-app o formulario de contacto.

13.4. **Interpretación:** los títulos son indicativos. No se aplica regla contra proferente.

13.5. **Idiomas:** se pueden proporcionar traducciones; prevalece el inglés para interpretación.

13.6. **Nulidad parcial:** si una cláusula es nula/inaplicable, el resto sigue vigente; reemplazo por cláusula válida de efecto equivalente cuando sea posible.

13.7. **No renuncia:** la falta de ejercicio de un derecho no implica renuncia.

---

## 14. Contacto

Para cualquier pregunta o solicitud legal: **[https://sos-expat.com/contact](https://sos-expat.com/contact)**
`;

  const defaultRu = `
# Общие условия использования – Юристы (Глобально)

**SOS Expat от WorldExpat OÜ** (далее « **Платформа** », « **SOS** », « **мы** »)

**Версия 2.2 – Последнее обновление: 16 июня 2025 г.**

---

## 1. Определения

**Приложение / Сайт / Платформа**: цифровые сервисы, управляемые **WorldExpat OÜ**, позволяющие соединять пользователей (« **Пользователи** ») с юристами (« **Юристы** »).

**Соединение (Connection)**: техническое/операционное действие, осуществляемое Платформой для связи Пользователя с Юристом, включая: (i) передачу контактных данных, (ii) открытие канала связи (звонок, сообщение, видеоконференция), или (iii) принятие Юристом запроса через Платформу.

**Страна вмешательства (Country of Intervention)**: основная юрисдикция, к которой относится Запрос в момент Соединения. Если не указано, страна проживания Пользователя в момент запроса; при множественности – юрисдикция, наиболее тесно связанная с предметом Запроса.

**Плата за Соединение (Connection Fee)**: плата, подлежащая уплате SOS за каждое Соединение (п. 7): **19 €** при оплате в **EUR** или **25 $ USD** при оплате в **USD**, с возможностью изменения SOS Expat с уведомлением о новых тарифах по странам/валютам с перспективным действием.

**Запрос (Request)**: правовая ситуация/проект, представленный Пользователем.

**Поставщики платежей (Payment Providers)**: сторонние сервисы, используемые для получения единовременной оплаты от Пользователя и распределения средств.

---

## 2. Цель, область применения и акцепт

2.1. Настоящие Условия регулируют доступ и использование Платформы Юристами.

2.2. SOS Expat выступает только как технический посредник. SOS Expat не оказывает юридических услуг, не даёт правовых советов и не является стороной отношений Юрист–Пользователь.

2.3. **Электронное согласие (click-wrap).** Юрист принимает Условия, устанавливая галочку при регистрации и/или используя Платформу. Это считается эквивалентом электронной подписи. SOS может сохранять доказательства (временные метки, идентификаторы).

2.4. **Изменения.** SOS может обновлять Условия и/или тарифы (по странам/валютам) в любое время, с перспективным действием после публикации на Платформе. Продолжение использования означает согласие.

2.5. Срок действия: бессрочно.

---

## 3. Статус Юриста – Независимость и соблюдение норм

3.1. Юрист действует как независимый профессионал; никакие трудовые, агентские, ассоциированные или совместные отношения с SOS Expat не создаются.

3.2. Юрист несет полную ответственность за: (i) свои квалификации и регистрацию в профессиональных органах; (ii) наличие действующей профессиональной страховки; (iii) соблюдение местного законодательства и правил профессии (этика, реклама, конфликт интересов, тайна, AML/KYC, налоги, защита потребителей и т.д.).

3.3. SOS Expat не контролирует качество или содержание консультаций Юриста и не несет ответственности за это.

3.4. **Профессиональная деятельность (B2B).** Юрист заявляет, что действует исключительно в профессиональных целях. Права потребителей не применяются к отношениям SOS Expat–Юрист.

---

## 4. Создание аккаунта, проверки и безопасность

4.1. Условия: право на профессиональную практику в хотя бы одной юрисдикции, подтверждение личности и квалификации, действующая страховка.

4.2. Процесс: регистрация, отправка документов, ручная проверка, включая видеособеседование и KYC/AML проверки через Поставщиков.

4.3. Точность и актуальность: Юрист гарантирует правильность и актуальность информации; один аккаунт на Юриста.

4.4. Безопасность: Юрист защищает свои данные доступа; любая активность через аккаунт считается совершенной им; немедленное уведомление при компрометации.

4.5. **Неактивность и прекращение.** При **неактивности более 365 дней** аккаунт может быть автоматически деактивирован после уведомления. Юрист может закрыть аккаунт в любое время после выполнения своих обязательств. SOS Expat может приостановить или прекратить аккаунт за нарушение Условий.

4.6. **Электронные коммуникации.** Юрист соглашается получать уведомления по электронным каналам (email, уведомления в приложении, публикации на Платформе).

---

## 5. Правила использования – Конфликты, конфиденциальность, недопущение обхода

5.1. **Конфликты интересов.** Юрист проверяет наличие конфликтов перед консультацией. При конфликте он отказывается от работы и информирует Пользователя.

5.2. **Конфиденциальность.** Юрист соблюдает профессиональную тайну в соответствии с законом страны вмешательства. SOS не записывает обмены, за исключением случаев, требуемых законом.

5.3. **Недопущение обхода.** SOS Expat получает плату только за новые Соединения через Платформу. Запрещено обходить Платформу для уклонения от платы.

5.4. **Запрещенное поведение.** Выдача себя за кого-либо, незаконный контент, манипуляции, сговор/бойкот Платформы, нарушение санкций/экспорта или любая незаконная деятельность.

5.5. **Доступность.** Платформа предоставляется «как есть»; непрерывность работы не гарантируется (техническое обслуживание, сбои, форс-мажор). Доступ может быть ограничен по закону.

---

## 6. Отношения Юрист–Пользователь (вне Платформы)

6.1. После Соединения Юрист и Пользователь могут заключать соглашения вне Платформы. SOS Expat не участвует в согласовании или оплате гонораров, кроме описанного единовременного платежа.

6.2. Юрист обеспечивает соблюдение местного законодательства при заключении соглашений о гонорарах, собирает налоги и соблюдает местные нормы (реклама, конфликты интересов, защита потребителей).

6.3. SOS Expat не несет ответственности за качество, точность или результат консультаций.

---

## 7. Тарифы, единоразовый платеж и налоги

7.1. **Плата за Соединение.** 19 € (EUR) или 25 $ (USD) за Соединение, без налогов и комиссий Поставщика платежей. SOS Expat может менять тарифы по странам/валютам с перспективным действием.

7.2. **Единоразовый платеж и распределение.** Пользователь оплачивает единоразово через Платформу, покрывая (i) гонорары Юриста и (ii) Плату за Соединение SOS Expat. SOS Expat (или Поставщик) удерживает Плату за Соединение и перечисляет остаток Юристу.

7.3. **Неотзывность.** Плата за Соединение подлежит уплате с момента Соединения и не возвращается, кроме как по усмотрению SOS Expat при сбое, вызванном Платформой.

7.4. **Возврат Пользователю.** Если возврат предоставлен, он компенсируется из суммы, причитающейся Юристу; SOS Expat может удержать сумму из будущих выплат.

7.5. **Валюты и конвертация.** Возможна оплата в разных валютах; могут применяться комиссии за конвертацию.

7.6. **Налоги.** Юрист отвечает за свои налоговые обязательства. SOS Expat может собирать и перечислять НДС/аналогичные налоги на Плату за Соединение.

7.7. **Компенсация.** SOS Expat может компенсировать любые долги Юриста суммами, причитающимися ему.

---

## 8. Платежи – KYC/AML – Санкции

8.1. Платежи обрабатываются сторонними Поставщиками. Юрист принимает их условия и процессы KYC/AML.

8.2. SOS Expat может задерживать или отменять платежи при подозрении на мошенничество, нарушение или по закону.

8.3. Доступ может быть ограничен в странах, подпадающих под санкции. Юрист заявляет, что не находится в санкционных списках и соблюдает экспортные ограничения.

---

## 9. Персональные данные (глобальная рамка – GDPR/DSA)

9.1. **Роли.** Для данных Пользователей, полученных для Соединения, SOS Expat и Юрист действуют как независимые контролеры данных в соответствии с **Регламентом (ЕС) 2016/679 (GDPR)**.

9.2. **Цели.** Выполнение контракта (Соединение), законные интересы (безопасность, предотвращение мошенничества, улучшение), соблюдение закона (AML, санкции), согласие, если требуется.

9.3. **Международные передачи** с адекватными гарантиями, если необходимо (стандартные договорные условия, решение об адекватности и т.д.).

9.4. **Права и контакт.** Реализация прав (доступ, исправление, удаление, переносимость, возражение) через форму контакта на Платформе.

9.5. **Безопасность.** Разумные технические и организационные меры; уведомление о нарушениях согласно закону (72 часа по GDPR).

9.6. Юрист обрабатывает данные в соответствии с законодательством страны вмешательства и профессиональной этикой.

9.7. **Соответствие DSA.** Платформа действует как **посреднический сервис** согласно **Регламенту (ЕС) 2022/2065 (Закон о цифровых услугах)**. SOS Expat внедряет механизмы сообщения о незаконном контенте и сотрудничает с компетентными органами.

---

## 10. Интеллектуальная собственность

Платформа, бренды, логотипы, базы данных и контент защищены. Юрист получает только личное, неисключительное, непередаваемое право на доступ во время действия Условий. Контент Юриста (профиль, фото, описание) лицензируется SOS Expat для размещения и отображения на Платформе.

---

## 11. Гарантии, ответственность и возмещение

11.1. Юридические услуги предоставляются без гарантий; SOS Expat не гарантирует результат, качество или объем работы.

11.2. Платформа «как есть»; непрерывность работы не гарантируется.

11.3. **Ограничение ответственности:** максимальная ответственность SOS Expat перед Юристом ограничена суммой Платы за Соединение, полученной за транзакцию, вызвавшую претензию.

11.4. **Исключения:** нет ответственности за косвенные, особые, штрафные убытки.

11.5. **Возмещение:** Юрист компенсирует SOS Expat любые убытки, претензии, расходы (включая юридические), связанные с нарушением Условий, контента или консультаций.

11.6. **Отказ от претензий.** Юрист **прямо и безотзывно отказывается** от любых претензий к SOS Expat за (i) ущерб от предоставления юридических услуг, (ii) косвенные убытки, (iii) договорные споры с Пользователями, (iv) любые недостатки услуг Юриста. Этот отказ применяется в максимальной степени, разрешенной законом.

11.7. Никаких агентских или партнерских отношений не возникает.

11.8. **Форс-мажор.** SOS Expat не несет ответственности за задержки или сбои, вызванные **форс-мажорными** обстоятельствами (стихийное бедствие, война, пандемия, кибератака, отключение электричества или интернета, решение правительства, забастовка и т.д.).

11.9. **Сохранение действия:** пп. 5, 7–13 остаются в силе после прекращения.

---

## 12. Применимое право – Арбитраж – Эстония – Коллективные иски

12.1. **Материальное право:** для каждого Соединения отношения SOS Expat–Юрист регулируются правом страны вмешательства, с учетом императивных норм. **В дополнение и для толкования настоящих Условий применяется право Эстонии.**

12.2. **Обязательный арбитраж ICC:** любые споры решаются окончательно по правилам ICC. **Место: Таллинн, Эстония.** **Язык: французский.** Арбитраж применяет материальное право, указанное в п.12.1. Конфиденциально.

12.3. **Отказ от коллективных исков:** допускаются только индивидуальные претензии.

12.4. **Исключительная юрисдикция судов Эстонии:** для неарбитражных дел и исполнения арбитражных решений. Юрист отказывается от возражений по поводу неудобства форума.

---

## 13. Разное

13.1. **Передача прав:** SOS Expat может передавать Условия аффилированной компании или правопреемнику; Юрист не может без письменного согласия.

13.2. **Полнота соглашения:** Условия являются полным соглашением и заменяют предыдущие.

13.3. **Уведомления:** публикация на Платформе, через приложение или контактную форму.

13.4. **Толкование:** заголовки справочные. Не применяется правило против составителя.

13.5. **Языки:** переводы возможны; приоритет – английский.

13.6. **Частичная недействительность:** недействительная статья не влияет на остальные; заменяется допустимой.

13.7. **Отсутствие отказа:** неиспользование права не означает отказ.

---

## 14. Контакты

По вопросам (поддержка и юридические запросы): **[https://sos-expat.com/contact](https://sos-expat.com/contact)**
`;

  const defaultDe = `
# Allgemeine Nutzungsbedingungen – Anwälte (Global)

**SOS Expat von WorldExpat OÜ** (die « **Plattform** », « **SOS** », « **wir** »)

**Version 2.2 – Letzte Aktualisierung: 16. Juni 2025**

---

## 1. Definitionen

**Anwendung / Website / Plattform**: Digitale Dienste, die von **WorldExpat OÜ** betrieben werden und die Vernetzung zwischen Nutzern (den « **Nutzern** ») und Anwälten (den « **Anwälten** ») ermöglichen.

**Vermittlung**: Die technische/operative Einführung, die von der Plattform zwischen einem Nutzer und einem Anwalt vorgenommen wird, die sich manifestiert durch (i) die Übermittlung von Kontaktdaten, (ii) die Eröffnung eines Kommunikationskanals (Anruf, Nachricht, Video), oder (iii) die Annahme einer über die Plattform gestellten Anfrage durch den Anwalt.

**Einsatzland**: Die Rechtsordnung, die zum Zeitpunkt der Vermittlung hauptsächlich von der Anfrage betroffen ist. Fehlt eine solche, gilt das Wohnsitzland des Nutzers zum Zeitpunkt der Anfrage; bei mehreren Jurisdiktionen gilt diejenige, die dem Gegenstand der Anfrage am engsten verbunden ist.

**Vermittlungsgebühr**: Gebühr, die SOS für jede Vermittlung geschuldet wird (Art. 7): **19 €** bei Zahlung in **EUR** oder **25 $ USD** bei Zahlung in **USD**; SOS Expat kann diese Beträge ändern und/oder lokale Tarife nach Land/Währung veröffentlichen, mit prospektiver Wirkung.

**Anfrage**: Die vom Nutzer dargestellte rechtliche Situation oder das rechtliche Projekt.

**Zahlungsdienstleister**: Dritte, die für den Einzug der einmaligen Zahlung des Nutzers und die Verteilung der Gelder genutzt werden.

---

## 2. Zweck, Geltungsbereich und Annahme

2.1. Diese AGB regeln den Zugang und die Nutzung der Plattform durch Anwälte.

2.2. SOS Expat agiert ausschließlich als technischer Vermittler. SOS Expat übt den Anwaltsberuf nicht aus, erbringt keine Rechtsberatung und ist nicht Partei der Beziehung zwischen Anwalt und Nutzer.

2.3. **Elektronische Zustimmung (Click-Wrap).** Der Anwalt akzeptiert die AGB durch Anklicken des entsprechenden Feldes bei der Registrierung und/oder durch Nutzung der Plattform. Diese Handlung gilt als elektronische Unterschrift und vertragliche Zustimmung. SOS kann Nachweisprotokolle (Zeitstempel, technische Kennungen) speichern.

2.4. **Änderungen.** SOS kann die AGB und/oder die Gebührenordnung (nach Land/Währung) jederzeit mit prospektiver Wirkung nach Veröffentlichung auf der Plattform aktualisieren. Die fortgesetzte Nutzung gilt als Zustimmung.

2.5. Laufzeit: unbefristet.

---

## 3. Status des Anwalts – Unabhängigkeit und Compliance

3.1. Der Anwalt handelt als unabhängiger Berufsträger; es entsteht kein Arbeits-, Agentur-, Mandats-, Partnerschafts- oder Joint-Venture-Verhältnis mit SOS Expat.

3.2. Der Anwalt ist allein verantwortlich für: (i) seine Abschlüsse, Titel, Zulassungen zur Rechtsanwaltschaft/Äquivalente und Berufsausübungsberechtigungen; (ii) seine gültige Berufshaftpflichtversicherung, angepasst an die Einsatzländer; (iii) die Einhaltung der lokalen Gesetze und Berufsregeln (Berufsordnung, Werbung/Mandantenakquise, Interessenkonflikte, Berufsgeheimnis, Geldwäscheprävention/KYC, Steuern, Verbraucherschutz usw.).

3.3. SOS Expat überwacht oder bewertet weder den Inhalt noch die Qualität der Beratung des Anwalts und übernimmt hierfür keinerlei Verantwortung.

3.4. **Berufliche Kapazität (B2B).** Der Anwalt erklärt, ausschließlich zu beruflichen Zwecken zu handeln. Verbraucherschutzregelungen gelten nicht für die Beziehung zwischen SOS Expat und dem Anwalt.

---

## 4. Kontoerstellung, Überprüfungen und Sicherheit

4.1. Voraussetzungen: gültige Zulassung zur Berufsausübung in mindestens einer Jurisdiktion, Identitäts- und Qualifikationsnachweise, gültige Berufshaftpflichtversicherung.

4.2. Verfahren: Kontoerstellung, Vorlage der Dokumente, manuelle Validierung, die ein Videointerview und KYC/AML-Prüfungen über Dienstleister umfassen kann.

4.3. Richtigkeit & Aktualisierung: Der Anwalt garantiert die Richtigkeit und Aktualität der Angaben; ein (1) Konto pro Anwalt.

4.4. Sicherheit: Der Anwalt schützt seine Zugangsdaten; jede Aktivität über das Konto gilt als von ihm vorgenommen; jede Kompromittierung ist unverzüglich zu melden.

4.5. **Inaktivität & Kündigung.** Nach **365 Tagen Inaktivität** kann das Konto nach Benachrichtigung automatisch deaktiviert werden. Der Anwalt kann sein Konto jederzeit schließen, nachdem er seine ausstehenden Verpflichtungen erfüllt hat. SOS Expat kann ein Konto wegen Verstoßes gegen die AGB aussetzen oder kündigen.

4.6. **Elektronische Kommunikation.** Der Anwalt erklärt sich damit einverstanden, Mitteilungen zu den AGB auf elektronischem Wege zu erhalten (E-Mail, In-App-Benachrichtigung, Veröffentlichung auf der Plattform).

---

## 5. Nutzungsregeln – Interessenkonflikte, Vertraulichkeit, Umgehungsverbot

5.1. **Interessenkonflikte.** Der Anwalt führt vor jeder Beratung eine angemessene Konfliktprüfung durch. Im Falle eines Konflikts zieht er sich zurück und informiert den Nutzer.

5.2. **Berufsgeheimnis & Vertraulichkeit.** Der Anwalt wahrt Vertraulichkeit und Berufsgeheimnis gemäß dem im Einsatzland geltenden Recht. Gespräche werden von SOS nicht aufgezeichnet, außer wenn gesetzlich vorgeschrieben.

5.3. **Umgehungsverbot.** SOS Expat erhält keine Provision auf Honorare. Jede neue Vermittlung mit einem neuen Nutzer über die Plattform löst die Vermittlungsgebühr aus. Es ist verboten, die Plattform zu umgehen, um diese Gebühren bei einer neuen Einführung zu vermeiden.

5.4. **Verbotene Handlungen.** Identitäts-/Titelmissbrauch, illegale Inhalte, Manipulation, Kollusion/Boykott zum Nachteil der Plattform, Verstöße gegen Sanktions- oder Exportgesetze oder jegliche illegale Aktivität.

5.5. **Verfügbarkeit.** Die Plattform wird „wie besehen“ bereitgestellt; keine Garantie für ununterbrochene Verfügbarkeit (Wartung, Störungen, höhere Gewalt). Der Zugang kann gesetzlich eingeschränkt werden.

---

## 6. Beziehung Anwalt–Nutzer (außerhalb der Plattform)

6.1. Nach der Vermittlung können Anwalt und Nutzer außerhalb der Plattform einen Vertrag schließen (SOS Expat ist nicht an der Festsetzung oder dem Einzug der Honorare beteiligt, außer beim unten beschriebenen Einmalzahlungsmechanismus).

6.2. Der Anwalt übermittelt seine Honorarvereinbarung gemäß dem lokalen Recht, erhebt/entrichtet anfallende Steuern und hält die lokalen Vorschriften (Werbung, Akquise, Interessenkonflikte, Verbraucherschutz) ein.

6.3. SOS Expat ist nicht verantwortlich für die Qualität, Richtigkeit oder das Ergebnis der Beratung des Anwalts.

---

## 7. Gebühren, Einmalzahlung und Steuern

7.1. **Vermittlungsgebühr (Pauschalbetrag).** 19 € (EUR) oder 25 $ (USD) pro Vermittlung, exkl. Steuern und Zahlungsdienstleistergebühren. SOS Expat kann diese Beträge ändern und/oder lokale Tarife veröffentlichen, mit prospektiver Wirkung.

7.2. **Einmalzahlung und Verteilung.** Der Nutzer leistet über die Plattform eine Einmalzahlung, die (i) das Honorar des Anwalts (wie zwischen Anwalt und Nutzer vereinbart) und (ii) die Vermittlungsgebühr von SOS Expat umfasst. SOS Expat (oder sein Dienstleister) zieht die Zahlung ein, behält die Vermittlungsgebühr ein und überweist den Restbetrag an den Anwalt. Der Anwalt ermächtigt SOS Expat zu diesen Abzügen und Verteilungen.

7.3. **Fälligkeit & Nicht-Erstattung.** Die Vermittlungsgebühr wird mit der Vermittlung fällig und ist nicht erstattungsfähig (außer aus Kulanz, wenn der Fehler ausschließlich der Plattform zuzuschreiben ist und soweit gesetzlich zulässig).

7.4. **Rückzahlung an den Nutzer.** Wird einem Nutzer eine Rückzahlung gewährt, wird diese vom Anteil des Anwalts abgezogen: SOS Expat kann den Betrag mit zukünftigen Auszahlungen an den Anwalt verrechnen oder die Rückzahlung verlangen, falls keine weiteren Zahlungen anstehen. Eine Rückzahlung der Vermittlungsgebühr erfolgt nur nach Ermessen von SOS Expat.

7.5. **Währungen & Umrechnung.** Mehrere Währungen können angeboten werden; Konversionskurse/-gebühren des Zahlungsdienstleisters können anfallen.

7.6. **Steuern.** Der Anwalt bleibt für seine steuerlichen Verpflichtungen verantwortlich. SOS Expat erhebt und führt, sofern erforderlich, die Mehrwertsteuer/entsprechende lokale Steuer auf die Vermittlungsgebühr ab.

7.7. **Verrechnung.** SOS Expat kann Beträge, die der Anwalt schuldet (z. B. wegen Nutzererstattung), mit jeglichen Beträgen, die dem Anwalt zustehen, verrechnen.

---

## 8. Zahlungen – KYC/AML – Sanktionen

8.1. Zahlungen werden über Drittanbieter abgewickelt. Der Anwalt akzeptiert deren Bedingungen und KYC/AML-Verfahren.

8.2. SOS Expat kann Zahlungen bei Verdacht auf Betrug, Nichtkonformität oder aufgrund gesetzlicher Anordnung zurückhalten, verzögern oder stornieren.

8.3. Der Zugang kann in sanktionierten/embargo-belegten Gebieten eingeschränkt werden, falls gesetzlich erforderlich. Der Anwalt erklärt, auf keiner Sanktionsliste zu stehen und geltende Exportkontrollen einzuhalten.

---

## 9. Personenbezogene Daten (globaler Rahmen – GDPR/DSA)

9.1. **Rollen.** Für Nutzerdaten, die zum Zweck der Vermittlung verarbeitet werden, handeln SOS Expat und der Anwalt jeweils als eigenständige Verantwortliche für ihre jeweiligen Zwecke, gemäß der **Verordnung (EU) 2016/679 (DSGVO/GDPR)**.

9.2. **Rechtsgrundlagen & Zwecke.** Vertragserfüllung (Vermittlung), berechtigte Interessen (Sicherheit, Betrugsprävention, Verbesserung), gesetzliche Verpflichtungen (AML, Sanktionen) und ggf. Einwilligung.

9.3. **Internationale Übermittlungen** mit angemessenen Garantien, sofern erforderlich (Standardvertragsklauseln, Angemessenheitsbeschluss usw.).

9.4. **Rechte & Kontakt.** Ausübung der Rechte (Auskunft, Berichtigung, Löschung, Übertragbarkeit, Widerspruch) über das Kontaktformular der Plattform.

9.5. **Sicherheit.** Angemessene technische/organisatorische Maßnahmen; Meldung von Datenschutzverletzungen gemäß geltendem Recht (72 Stunden gemäß DSGVO).

9.6. Der Anwalt verarbeitet die erhaltenen Daten gemäß dem Recht des Einsatzlandes und seiner Berufsordnung (Berufsgeheimnis).

9.7. **DSA-Konformität.** Die Plattform fungiert als **Vermittlungsdienst** im Sinne der **Verordnung (EU) 2022/2065 (Gesetz über digitale Dienste)**. SOS Expat implementiert Mechanismen zur Meldung illegaler Inhalte und kooperiert mit den zuständigen Behörden gemäß dem DSA.

---

## 10. Geistiges Eigentum

Die Plattform, ihre Marken, Logos, Datenbanken und Inhalte sind geschützt. Es werden keine Rechte an den Anwalt übertragen, außer einem persönlichen, nicht exklusiven, nicht übertragbaren Zugangsrecht während der Laufzeit dieser AGB. Inhalte, die vom Anwalt bereitgestellt werden (Profil, Foto, Beschreibungen), werden SOS Expat mit einer weltweiten, nicht exklusiven Lizenz zur Speicherung und Anzeige auf der Plattform eingeräumt.

---

## 11. Garantien, Haftung und Freistellung

11.1. Keine Garantie in Bezug auf juristische Dienstleistungen; SOS Expat garantiert weder Ergebnis, Qualität noch Geschäftsvolumen.

11.2. Plattform „wie besehen“; keine Garantie für ständige Verfügbarkeit.

11.3. **Haftungsbeschränkung**: Soweit gesetzlich zulässig, ist die Gesamthaftung von SOS Expat gegenüber dem Anwalt auf direkte Schäden beschränkt und darf den Gesamtbetrag der von SOS Expat im Zusammenhang mit der betreffenden Transaktion erhobenen Vermittlungsgebühren nicht überschreiten.

11.4. **Ausschlüsse**: keine Haftung für indirekte/folgende/besondere/punitive Schäden (z. B. entgangener Gewinn, Kundenverlust, Rufschaden usw.).

11.5. **Freistellung**: Der Anwalt stellt SOS Expat (und dessen verbundene Unternehmen, Führungskräfte, Mitarbeiter, Vertreter) von allen Ansprüchen/Schäden/Kosten (einschließlich Anwaltskosten) frei, die sich aus (i) Verstößen gegen die AGB/Gesetze, (ii) seinen Inhalten, (iii) seinen Beratungen oder Unterlassungen ergeben.

11.6. **Verzicht auf Ansprüche.** Der Anwalt **verzichtet ausdrücklich und unwiderruflich** auf alle Ansprüche gegen SOS Expat wegen (i) Schäden aus der Erbringung von Rechtsdienstleistungen, (ii) indirekter Verluste, (iii) vertraglicher Streitigkeiten mit Nutzern, (iv) jeglicher Mängel der vom Anwalt erbrachten Leistungen. Dieser Verzicht gilt im gesetzlich zulässigen Umfang.

11.7. Keine Vertretung: Nichts hierin begründet ein Mandats-, Arbeits-, Partner- oder Joint-Venture-Verhältnis zwischen SOS Expat und dem Anwalt.

11.8. **Höhere Gewalt.** SOS Expat haftet nicht für Verzögerungen oder Ausfälle aufgrund von **höherer Gewalt** (Naturkatastrophe, Krieg, Pandemie, Cyberangriff, Strom- oder Internetausfall, behördliche Anordnung, Streik usw.).

11.9. **Fortbestand**: Die Artikel 5, 7, 8, 9, 10, 11, 12 und 13 bleiben nach Beendigung in Kraft.

---

## 12. Anwendbares Recht – Schiedsgerichtsbarkeit – Estnische Gerichtsbarkeit – Sammelklagen

12.1. **Sachrecht**: Für jede Vermittlung gilt, dass die Beziehung SOS Expat–Anwalt dem Recht des Einsatzlandes unterliegt, vorbehaltlich zwingender lokaler Normen und international zwingender Bestimmungen. **Ergänzend und für die Auslegung/Gültigkeit dieser AGB sowie für alle nicht vom Recht des Einsatzlandes geregelten Fragen gilt estnisches Recht.**

12.2. **Verbindliche ICC-Schiedsgerichtsbarkeit**: Jeder Streit zwischen SOS Expat und dem Anwalt wird endgültig gemäß der ICC-Schiedsgerichtsordnung entschieden. **Sitz: Tallinn (Estland)**. **Sprache: Französisch.** Das Schiedsgericht wendet das in Art. 12.1 genannte materielle Recht an. Das Verfahren ist vertraulich.

12.3. **Verzicht auf Sammelklagen**: Soweit gesetzlich zulässig, sind alle Sammel-, Gruppen- oder Vertretungsklagen ausgeschlossen; nur individuelle Ansprüche sind zulässig.

12.4. **Ausschließliche Zuständigkeit estnischer Gerichte**: Für nicht schiedsfähige Ansprüche und die Vollstreckung von Schiedssprüchen oder Eilmaßnahmen sind ausschließlich die **Gerichte Estlands** (zuständig in Tallinn) zuständig. Der Anwalt verzichtet auf jede Einrede des unzuständigen oder ungeeigneten Gerichts.

---

## 13. Verschiedenes

13.1. **Abtretung**: SOS Expat kann die AGB an ein Konzernunternehmen oder einen Rechtsnachfolger übertragen; der Anwalt darf dies nur mit schriftlicher Zustimmung von SOS Expat.

13.2. **Gesamtheit**: Diese AGB stellen die vollständige Vereinbarung dar und ersetzen alle früheren Vereinbarungen zum selben Gegenstand.

13.3. **Mitteilungen**: Durch Veröffentlichung auf der Plattform, In-App-Benachrichtigung oder über das Kontaktformular.

13.4. **Auslegung**: Überschriften dienen nur der Übersicht. Keine Auslegungsregel contra proferentem.

13.5. **Sprachen**: Übersetzungen können bereitgestellt werden; für die Auslegung ist die englische Fassung maßgeblich.

13.6. **Teilnichtigkeit**: Sollte eine Bestimmung ungültig/nicht durchsetzbar sein, bleibt der Rest in Kraft; sie wird, soweit möglich, durch eine gültige Bestimmung mit ähnlicher Wirkung ersetzt.

13.7. **Nichtverzicht**: Das Unterlassen der Ausübung eines Rechts stellt keinen Verzicht dar.

---

## 14. Kontakt

Für rechtliche oder sonstige Anfragen: **[https://sos-expat.com/contact](https://sos-expat.com/contact)**
`;

  const defaultHi = `
# उपयोग की सामान्य शर्तें – वकील (वैश्विक)

**WorldExpat OÜ द्वारा SOS Expat** ( " **प्लेटफ़ॉर्म** ", " **SOS** ", " **हम** " )

**संस्करण 2.2 – अंतिम अद्यतन: 16 जून 2025**

---

## 1. परिभाषाएँ

**एप्लिकेशन / साइट / प्लेटफ़ॉर्म**: **WorldExpat OÜ** द्वारा संचालित डिजिटल सेवाएँ जो उपयोगकर्ताओं ( " **उपयोगकर्ता** " ) और वकीलों ( " **वकील** " ) के बीच संपर्क स्थापित करती हैं।

**संपर्क स्थापना (मिलान)**: तकनीकी/संचालनात्मक परिचय जो प्लेटफ़ॉर्म उपयोगकर्ता और वकील के बीच करता है, जो निम्न रूपों में हो सकता है:
(i) संपर्क विवरण साझा करना,
(ii) संचार चैनल खोलना (कॉल, संदेश, वीडियो), या
(iii) प्लेटफ़ॉर्म पर भेजे गए अनुरोध को वकील द्वारा स्वीकार करना।

**सेवा देश**: वह न्याय क्षेत्र जो अनुरोध के समय सबसे अधिक प्रासंगिक है। यदि यह स्पष्ट नहीं है, तो उपयोगकर्ता के निवास देश को माना जाएगा; यदि एक से अधिक हों, तो वह क्षेत्र जो अनुरोध के विषय से सबसे अधिक जुड़ा हुआ हो।

**संपर्क शुल्क (Frais de Mise en relation)**: प्रत्येक संपर्क के लिए SOS को देय शुल्क (अनुच्छेद 7):
**19 €** यदि **EUR** में भुगतान किया गया हो या **25 $ USD** यदि **USD** में भुगतान किया गया हो।
SOS Expat इन राशियों या देश/मुद्रा के अनुसार स्थानीय दरों को भविष्य में बदल सकता है।

**अनुरोध (Requête)**: वह कानूनी स्थिति या परियोजना जिसे उपयोगकर्ता द्वारा प्रस्तुत किया गया है।

**भुगतान सेवा प्रदाता**: वे तृतीय पक्ष जो भुगतान प्राप्त करने और धनराशि के वितरण के लिए उपयोग किए जाते हैं।

---

## 2. उद्देश्य, दायरा और स्वीकृति

2.1. ये शर्तें प्लेटफ़ॉर्म तक वकीलों की पहुँच और उपयोग को नियंत्रित करती हैं।

2.2. SOS Expat केवल तकनीकी मध्यस्थ के रूप में कार्य करता है। यह न तो कानूनी सलाह देता है और न ही वकील-उपयोगकर्ता संबंध में पक्ष है।

2.3. **इलेक्ट्रॉनिक स्वीकृति (Click-Wrap)।** वकील पंजीकरण के समय या प्लेटफ़ॉर्म के उपयोग से इन शर्तों को स्वीकार करता है। यह क्रिया इलेक्ट्रॉनिक हस्ताक्षर के समान है। SOS सत्यापन के लिए लॉग (समय, तकनीकी पहचान) सुरक्षित रख सकता है।

2.4. **संशोधन।** SOS इन शर्तों या शुल्कों को कभी भी भविष्य में लागू करने के लिए बदल सकता है। निरंतर उपयोग को स्वीकृति माना जाएगा।

2.5. **अवधि:** अनिश्चितकालीन।

---

## 3. वकील की स्थिति – स्वतंत्रता और अनुपालन

3.1. वकील स्वतंत्र पेशेवर के रूप में कार्य करता है; SOS Expat के साथ कोई नौकरी, एजेंसी, साझेदारी या संयुक्त उद्यम संबंध नहीं बनता।

3.2. वकील अकेले जिम्मेदार है:
(i) अपने डिग्री, योग्यता और बार पंजीकरण के लिए;
(ii) उचित पेशेवर बीमा बनाए रखने के लिए;
(iii) स्थानीय कानूनों और व्यावसायिक आचार संहिता (विज्ञापन, गोपनीयता, हित संघर्ष, कर, उपभोक्ता संरक्षण आदि) के पालन के लिए।

3.3. SOS Expat वकील की सलाह की सामग्री या गुणवत्ता की निगरानी नहीं करता और इसके लिए जिम्मेदार नहीं है।

3.4. **व्यावसायिक (B2B) संबंध।** वकील यह घोषित करता है कि वह केवल व्यावसायिक उद्देश्यों के लिए कार्य कर रहा है; उपभोक्ता सुरक्षा नियम लागू नहीं होंगे।

---

## 4. खाता निर्माण, सत्यापन और सुरक्षा

4.1. आवश्यकताएँ: कम से कम एक अधिकार क्षेत्र में वैध अभ्यास लाइसेंस, पहचान और योग्यता दस्तावेज़, और वैध बीमा।

4.2. प्रक्रिया: खाता निर्माण, दस्तावेज़ जमा, मैनुअल सत्यापन (जिसमें वीडियो इंटरव्यू या KYC/AML जांच शामिल हो सकती है)।

4.3. सटीकता और अद्यतन: वकील अपने डेटा की सटीकता और अद्यतन बनाए रखेगा; प्रत्येक वकील के लिए केवल एक खाता अनुमत है।

4.4. सुरक्षा: वकील अपने लॉगिन डेटा की सुरक्षा करेगा; उसके खाते से होने वाली सभी गतिविधियाँ उसी की मानी जाएँगी।

4.5. **निष्क्रियता और समाप्ति।** **365 दिनों की निष्क्रियता** के बाद, खाता स्वचालित रूप से निष्क्रिय किया जा सकता है। वकील किसी भी समय अपने दायित्वों को पूरा करने के बाद अपना खाता बंद कर सकता है। SOS Expat शर्तों के उल्लंघन के लिए खाता निलंबित या समाप्त कर सकता है।

4.6. **इलेक्ट्रॉनिक संचार।** वकील इलेक्ट्रॉनिक माध्यमों (ईमेल, इन-ऐप अधिसूचना, प्लेटफ़ॉर्म पर प्रकाशन) से सूचनाएँ प्राप्त करने के लिए सहमत है।

---

## 5. उपयोग के नियम – हित संघर्ष, गोपनीयता, प्लेटफ़ॉर्म की अवहेलना नहीं

5.1. **हित संघर्ष।** वकील किसी भी परामर्श से पहले संभावित हित संघर्ष की जाँच करेगा। संघर्ष की स्थिति में, वह उपयोगकर्ता को सूचित करेगा और पीछे हटेगा।

5.2. **गोपनीयता।** वकील स्थानीय कानून के अनुसार गोपनीयता और पेशेवर रहस्य बनाए रखेगा। SOS बातचीत रिकॉर्ड नहीं करता जब तक कि कानून द्वारा आवश्यक न हो।

5.3. **प्लेटफ़ॉर्म का अवरोध/परिहार निषिद्ध।** SOS Expat वकील के शुल्क पर कोई कमीशन नहीं लेता। प्रत्येक नया उपयोगकर्ता संपर्क नई शुल्क देयता उत्पन्न करता है। वकील को इन शुल्कों से बचने हेतु प्लेटफ़ॉर्म को दरकिनार करने की अनुमति नहीं है।

5.4. **निषिद्ध गतिविधियाँ।** पहचान की चोरी, झूठी जानकारी, अवैध सामग्री, साजिश या प्लेटफ़ॉर्म को नुकसान पहुँचाने के प्रयास, या किसी भी अवैध गतिविधि की मनाही है।

5.5. **उपलब्धता।** प्लेटफ़ॉर्म "जैसा है" के आधार पर उपलब्ध कराया गया है; निरंतर उपलब्धता की कोई गारंटी नहीं है।

---

## 6. वकील–उपयोगकर्ता संबंध (प्लेटफ़ॉर्म के बाहर)

6.1. संपर्क के बाद, वकील और उपयोगकर्ता स्वतंत्र रूप से अनुबंध कर सकते हैं (SOS Expat केवल भुगतान वितरण तक सीमित है)।

6.2. वकील अपने स्थानीय कानून के अनुसार शुल्क समझौता प्रदान करेगा, करों का पालन करेगा और उपभोक्ता सुरक्षा नियमों का पालन करेगा।

6.3. SOS Expat किसी भी कानूनी सलाह की गुणवत्ता या परिणाम के लिए जिम्मेदार नहीं है।

---

## 7. शुल्क, एकमुश्त भुगतान और कर

7.1. **संपर्क शुल्क।** 19 € (EUR) या 25 $ (USD) प्रति संपर्क (कर और भुगतान प्रदाता शुल्क अतिरिक्त)। SOS Expat इन्हें भविष्य में संशोधित कर सकता है।

7.2. **एकमुश्त भुगतान और वितरण।** उपयोगकर्ता एक ही भुगतान करता है जिसमें (i) वकील की फीस और (ii) SOS Expat की शुल्क शामिल होती है। SOS Expat शुल्क घटाकर शेष वकील को भेजता है।

7.3. **भुगतान देय और गैर-वापसी योग्य।** संपर्क के समय शुल्क देय होता है और वापस नहीं किया जाएगा।

7.4. **उपयोगकर्ता को धनवापसी।** यदि उपयोगकर्ता को धनवापसी दी जाती है, तो यह वकील के हिस्से से समायोजित होगी।

7.5. **मुद्राएँ और रूपांतरण।** विभिन्न मुद्राएँ उपलब्ध हो सकती हैं; रूपांतरण शुल्क लागू हो सकते हैं।

7.6. **कर।** वकील अपने कर दायित्वों के लिए जिम्मेदार है। SOS Expat केवल अपने शुल्क पर लागू VAT/कर एकत्र करेगा।

7.7. **समायोजन।** SOS Expat वकील से बकाया राशि को भविष्य के भुगतान से समायोजित कर सकता है।

---

## 8. भुगतान – KYC/AML – प्रतिबंध

8.1. भुगतान तृतीय-पक्ष प्रदाताओं द्वारा संसाधित किए जाते हैं। वकील उनके नियमों और KYC प्रक्रियाओं को स्वीकार करता है।

8.2. धोखाधड़ी या गैर-अनुपालन की स्थिति में SOS Expat भुगतान रोक सकता है या रद्द कर सकता है।

8.3. वकील पुष्टि करता है कि वह किसी भी प्रतिबंध सूची में नहीं है और सभी निर्यात नियंत्रणों का पालन करता है।

---

## 9. व्यक्तिगत डेटा (वैश्विक ढांचा – GDPR/DSA)

9.1. **भूमिकाएँ।** उपयोगकर्ता डेटा के संबंध में SOS Expat और वकील प्रत्येक स्वतंत्र रूप से नियंत्रक हैं, **विनियमन (EU) 2016/679 (GDPR)** के अनुसार।

9.2. **आधार और उद्देश्य।** अनुबंध निष्पादन, वैध हित (सुरक्षा, धोखाधड़ी रोकथाम), कानूनी अनुपालन, और आवश्यकता पड़ने पर सहमति।

9.3. **अंतर्राष्ट्रीय स्थानांतरण** उपयुक्त सुरक्षा उपायों के साथ (मानक अनुबंध खंड, पर्याप्तता निर्णय, आदि)।

9.4. **अधिकार और संपर्क।** अधिकारों का प्रयोग (पहुँच, सुधार, विलोपन, पोर्टेबिलिटी, आपत्ति) प्लेटफ़ॉर्म के संपर्क फ़ॉर्म के माध्यम से।

9.5. **सुरक्षा।** उचित तकनीकी और संगठनात्मक उपाय; GDPR के अनुसार 72 घंटों के भीतर उल्लंघन की सूचना।

9.6. वकील स्थानीय कानून और पेशेवर गोपनीयता नियमों के अनुसार डेटा का उपयोग करेगा।

9.7. **DSA अनुपालन।** प्लेटफ़ॉर्म **विनियमन (EU) 2022/2065 (डिजिटल सेवा अधिनियम)** के अनुसार **मध्यस्थ सेवा** के रूप में कार्य करता है। SOS Expat अवैध सामग्री की रिपोर्टिंग के लिए तंत्र लागू करता है।

---

## 10. बौद्धिक संपदा

प्लेटफ़ॉर्म, इसके लोगो, ब्रांड और डेटाबेस संरक्षित हैं। वकील को केवल सीमित, व्यक्तिगत और गैर-हस्तांतरणीय पहुँच अधिकार प्राप्त है।
वकील द्वारा प्रदान की गई सामग्री (प्रोफ़ाइल, चित्र, विवरण) के लिए SOS Expat को वैश्विक, गैर-विशिष्ट उपयोग की अनुमति दी जाती है।

---

## 11. गारंटी, दायित्व और क्षतिपूर्ति

11.1. SOS Expat किसी भी कानूनी सेवा के परिणाम या गुणवत्ता की गारंटी नहीं देता।

11.2. प्लेटफ़ॉर्म "जैसा है" प्रदान किया गया है।

11.3. **दायित्व की सीमा:** SOS Expat की कुल जिम्मेदारी केवल उसी लेन-देन से संबंधित शुल्क तक सीमित है जिसने दावा उत्पन्न किया।

11.4. **अपवर्जन:** अप्रत्यक्ष, विशेष या परिणामी क्षति (जैसे लाभ या प्रतिष्ठा की हानि) के लिए कोई दायित्व नहीं।

11.5. **क्षतिपूर्ति:** वकील SOS Expat को अपने किसी भी उल्लंघन, सामग्री या कार्य से उत्पन्न दावों से मुक्त रखेगा।

11.6. **दावों का त्याग।** वकील **स्पष्ट और अपरिवर्तनीय रूप से** SOS Expat के विरुद्ध किसी भी दावे का त्याग करता है: (i) कानूनी सेवाओं से उत्पन्न क्षति, (ii) अप्रत्यक्ष हानि, (iii) उपयोगकर्ताओं के साथ विवाद, (iv) वकील की सेवाओं में कोई कमी।

11.7. कोई साझेदारी, एजेंसी या रोजगार संबंध नहीं माना जाएगा।

11.8. **अप्रत्याशित घटना।** SOS Expat **अप्रत्याशित घटनाओं** (प्राकृतिक आपदा, युद्ध, महामारी, साइबर हमला, बिजली या इंटरनेट विफलता, सरकारी निर्णय, हड़ताल, आदि) के कारण देरी या विफलता के लिए जिम्मेदार नहीं है।

11.9. **जीवित रहना:** अनुच्छेद 5, 7, 8, 9, 10, 11, 12 और 13 समाप्ति के बाद भी लागू रहेंगे।

---

## 12. लागू कानून – मध्यस्थता – एस्टोनियाई अधिकार क्षेत्र – सामूहिक कार्रवाई

12.1. **प्रासंगिक कानून:** प्रत्येक संपर्क के लिए वकील–SOS Expat संबंध उस देश के कानून के अधीन होगा जहाँ सेवा दी गई है।
यदि कुछ विषय वहाँ से नियंत्रित नहीं हैं, तो **एस्टोनियाई कानून** लागू होगा।

12.2. **अनिवार्य ICC मध्यस्थता:** किसी भी विवाद का अंतिम समाधान ICC मध्यस्थता नियमों के अनुसार होगा।
**स्थान:** टालिन (एस्टोनिया)
**भाषा:** फ्रेंच
कार्यवाही गोपनीय रहेगी।

12.3. **सामूहिक दावे का त्याग:** जहाँ कानून अनुमति देता है, केवल व्यक्तिगत दावे स्वीकार्य होंगे।

12.4. **एस्टोनिया के न्यायालयों का विशेषाधिकार:** मध्यस्थता से बाहर के मामलों या निर्णयों के प्रवर्तन के लिए केवल टालिन की अदालतें सक्षम होंगी।

---

## 13. विविध

13.1. **हस्तांतरण:** SOS Expat इन शर्तों को अपने समूह या उत्तराधिकारी को स्थानांतरित कर सकता है; वकील नहीं।

13.2. **पूर्ण समझौता:** ये शर्तें पूरे समझौते का गठन करती हैं और किसी भी पूर्व समझौते को प्रतिस्थापित करती हैं।

13.3. **सूचनाएँ:** प्लेटफ़ॉर्म, ऐप या संपर्क फ़ॉर्म के माध्यम से दी जाएँगी।

13.4. **व्याख्या:** शीर्षक केवल संदर्भ हेतु हैं। कोई “contra proferentem” नियम लागू नहीं होगा।

13.5. **भाषाएँ:** अनुवाद प्रदान किए जा सकते हैं; व्याख्या के लिए अंग्रेज़ी संस्करण प्राथमिक होगा।

13.6. **आंशिक अमान्यता:** यदि कोई धारा अमान्य है, तो शेष प्रभावी रहेगा।

13.7. **अधिकारों का परित्याग नहीं।**

---

## 14. संपर्क

किसी भी प्रश्न या कानूनी अनुरोध के लिए: **[https://sos-expat.com/contact](https://sos-expat.com/contact)**
`;

  const defaultPt = `
# Termos e Condições de Utilização – Advogados (Global)

**SOS Expat da WorldExpat OÜ** (a « **Plataforma** », « **SOS** », « **nós** »)

**Versão 2.2 – Última atualização: 16 de junho de 2025**

---

## 1. Definições

**Aplicativo / Site / Plataforma**: serviços digitais operados pela **WorldExpat OÜ** que permitem a ligação entre utilizadores (os « **Utilizadores** ») e advogados (os « **Advogados** »).

**Ligação (Correspondência)**: a introdução técnica/operacional realizada pela Plataforma entre um Utilizador e um Advogado, concretizada por (i) transmissão de contactos, (ii) abertura de canal de comunicação (chamada, mensagem, vídeo) ou (iii) aceitação, pelo Advogado, de um pedido feito através da Plataforma.

**País de Atuação**: a jurisdição principalmente visada pelo Pedido no momento da Ligação. Na falta de indicação, considera-se o país de residência do Utilizador; em caso de pluralidade, o país mais estreitamente ligado ao objeto do Pedido.

**Taxa de Ligação**: valor devido à SOS por cada Ligação (art. 7): **19 €** se pagos em **EUR** ou **25 $ USD** se pagos em **USD**.
A SOS Expat pode modificar estes valores e/ou publicar tabelas locais por país/moeda, com efeito apenas futuro.

**Pedido (Requête)**: a situação ou projeto jurídico apresentado pelo Utilizador.

**Prestadores de Pagamento**: serviços de terceiros usados para receber o pagamento único do Utilizador e distribuir os fundos.

---

## 2. Objeto, âmbito e aceitação

2.1. Os presentes Termos regulam o acesso e a utilização da Plataforma pelos Advogados.

2.2. A SOS Expat atua unicamente como intermediário técnico. A SOS Expat não exerce a advocacia, não presta consultoria jurídica e não é parte da relação entre Advogado e Utilizador.

2.3. **Aceitação eletrónica (Click-Wrap).** O Advogado aceita os Termos ao marcar a caixa correspondente durante o registo e/ou ao usar a Plataforma. Este ato equivale a assinatura eletrónica e consentimento contratual. A SOS pode manter registos (timestamp, identificadores técnicos).

2.4. **Modificações.** A SOS pode atualizar os Termos e/ou a tabela de taxas (por país/moeda) a qualquer momento, com efeito futuro após publicação na Plataforma. O uso contínuo implica aceitação.

2.5. **Duração:** indeterminada.

---

## 3. Estatuto do Advogado – Independência e conformidade

3.1. O Advogado atua como profissional independente; não existe vínculo de emprego, agência, mandato, parceria ou joint venture com a SOS Expat.

3.2. O Advogado é o único responsável por: (i) seus diplomas, títulos, inscrição na ordem dos advogados ou equivalentes e autorizações profissionais; (ii) sua apólice de responsabilidade civil profissional válida e adequada aos Países de Atuação; (iii) o cumprimento das leis e regras profissionais locais (deontologia, publicidade, conflitos de interesse, sigilo profissional, AML/KYC, fiscalidade, proteção do consumidor, etc.).

3.3. A SOS Expat não supervisiona nem avalia o conteúdo ou a qualidade dos serviços jurídicos do Advogado e não assume qualquer responsabilidade a esse respeito.

3.4. **Capacidade profissional (B2B).** O Advogado declara atuar exclusivamente para fins profissionais. Não se aplicam os regimes de proteção do consumidor.

---

## 4. Criação de conta, verificações e segurança

4.1. **Requisitos:** direito válido de exercer em pelo menos uma jurisdição, documentos de identidade e qualificação, e seguro de responsabilidade civil profissional vigente.

4.2. **Processo:** criação de conta, envio de documentos, validação manual que pode incluir entrevista por vídeo e verificações KYC/AML via Prestadores.

4.3. **Exatidão e atualização:** o Advogado garante a veracidade e atualização das informações; um (1) único conta por Advogado.

4.4. **Segurança:** o Advogado deve proteger suas credenciais; toda atividade realizada através da conta é considerada de sua responsabilidade.

4.5. **Inatividade e rescisão.** Após **365 dias de inatividade**, a conta pode ser desativada automaticamente após notificação. O Advogado pode encerrar sua conta a qualquer momento após cumprir suas obrigações pendentes. SOS Expat pode suspender ou rescindir uma conta por violação dos Termos.

4.6. **Comunicações eletrônicas.** O Advogado consente em receber notificações por meios eletrônicos (e-mail, notificação in-app, publicação na Plataforma).

---

## 5. Regras de utilização – Conflitos, confidencialidade, não contorno

5.1. **Conflitos de interesse.** O Advogado deve verificar eventuais conflitos antes de prestar qualquer serviço. Em caso de conflito, deve se retirar e informar o Utilizador.

5.2. **Sigilo profissional e confidencialidade.** O Advogado deve respeitar o sigilo profissional e a confidencialidade segundo a lei aplicável no País de Atuação. As comunicações não são gravadas pela SOS, salvo exigência legal.

5.3. **Proibição de contorno.** A SOS Expat não recebe comissão sobre honorários. Cada nova Ligação com um novo Utilizador gera uma nova Taxa de Ligação. É proibido contornar a Plataforma para evitar o pagamento de taxas em novas introduções.

5.4. **Comportamentos proibidos.** Falsificação de identidade/título, conteúdos ilícitos, manipulação, conluio/boycott visando prejudicar a Plataforma, violação de leis de sanções/exportação ou qualquer atividade ilegal.

5.5. **Disponibilidade.** A Plataforma é fornecida “tal como está”; não há garantia de disponibilidade contínua (manutenção, falhas, força maior). O acesso pode ser restringido se exigido por lei.

---

## 6. Relação Advogado–Utilizador (fora da Plataforma)

6.1. Após a Ligação, o Advogado e o Utilizador podem celebrar contrato fora da Plataforma (a SOS Expat não participa na definição ou cobrança dos honorários, salvo no mecanismo de pagamento único descrito abaixo).

6.2. O Advogado deve fornecer seu contrato de honorários segundo a lei local, recolher/repassar os impostos aplicáveis e respeitar as regras locais (publicidade, conflitos de interesse, consumidores).

6.3. A SOS Expat não é responsável pela qualidade, exatidão ou resultado dos serviços jurídicos prestados pelo Advogado.

---

## 7. Taxas, pagamento único e impostos

7.1. **Taxa de Ligação (fixa):** 19 € (EUR) ou 25 $ (USD) por Ligação, sem incluir impostos ou taxas do prestador de pagamento. A SOS Expat pode modificar estes valores ou publicar tarifas locais, com efeito futuro.

7.2. **Pagamento único e distribuição.** O Utilizador efetua um único pagamento via Plataforma, cobrindo (i) os honorários do Advogado (acordados entre Advogado e Utilizador) e (ii) a Taxa de Ligação da SOS Expat. A SOS Expat (ou seu Prestador) recebe o pagamento, deduz sua taxa e transfere o restante ao Advogado, que autoriza essas deduções.

7.3. **Exigibilidade e não reembolso.** A Taxa de Ligação é devida no momento da Ligação e não é reembolsável (salvo decisão de boa vontade da SOS Expat, quando o fracasso for exclusivamente imputável à Plataforma e permitido por lei).

7.4. **Reembolso ao Utilizador.** Caso um reembolso seja concedido ao Utilizador, ele será descontado da parte do Advogado: a SOS Expat pode compensar o valor em pagamentos futuros ou solicitar reembolso direto. Nenhum reembolso da Taxa de Ligação é devido, salvo decisão da SOS Expat.

7.5. **Moedas e conversão.** Podem ser oferecidas várias moedas; taxas de conversão podem aplicar-se.

7.6. **Impostos.** O Advogado é responsável por suas obrigações fiscais. A SOS Expat recolhe e remete, quando aplicável, o IVA/imposto local sobre suas próprias taxas.

7.7. **Compensação.** A SOS Expat pode compensar quaisquer valores devidos pelo Advogado (ex.: reembolso de Utilizador) com montantes a pagar-lhe.

---

## 8. Pagamentos – KYC/AML – Sanções

8.1. Os pagamentos são processados por Prestadores terceiros. O Advogado aceita seus termos e processos de verificação (KYC/AML).

8.2. A SOS Expat pode reter, atrasar ou cancelar pagamentos em caso de suspeita de fraude, não conformidade ou ordem legal.

8.3. O acesso pode ser restrito em territórios sob sanções/embargos, conforme exigido por lei. O Advogado declara não estar em listas de sanções e cumprir as regras de exportação aplicáveis.

---

## 9. Dados pessoais (quadro global – GDPR/DSA)

9.1. **Funções.** Para os dados de Utilizadores recebidos para efeitos de Ligação, SOS Expat e Advogado atuam como controladores independentes para suas finalidades específicas, em conformidade com o **Regulamento (UE) 2016/679 (GDPR)**.

9.2. **Bases legais e finalidades.** Execução contratual (Ligação), interesses legítimos (segurança, prevenção de fraude, melhoria), obrigações legais (AML, sanções) e, quando aplicável, consentimento.

9.3. **Transferências internacionais** com garantias adequadas, quando exigido (cláusulas contratuais padrão, decisão de adequação, etc.).

9.4. **Direitos e contato.** Exercício de direitos (acesso, retificação, apagamento, portabilidade, oposição) via formulário de contato da Plataforma.

9.5. **Segurança.** Medidas técnicas e organizacionais adequadas; notificação de violações conforme leis aplicáveis (72 horas segundo o GDPR).

9.6. O Advogado deve tratar os dados em conformidade com a lei do País de Atuação e com o seu dever profissional de sigilo.

9.7. **Conformidade DSA.** A Plataforma opera como **serviço de intermediação** nos termos do **Regulamento (UE) 2022/2065 (Lei dos Serviços Digitais)**. SOS Expat implementa mecanismos para denúncia de conteúdos ilegais e coopera com as autoridades competentes.

---

## 10. Propriedade intelectual

A Plataforma, suas marcas, logotipos, bases de dados e conteúdos são protegidos. Nenhum direito é concedido ao Advogado, exceto o direito pessoal, não exclusivo e intransferível de acesso durante a vigência dos Termos.
Os conteúdos fornecidos pelo Advogado (perfil, foto, descrições) são licenciados à SOS Expat de forma mundial, não exclusiva, para hospedagem e exibição na Plataforma.

---

## 11. Garantias, responsabilidade e indenização

11.1. Nenhuma garantia quanto aos serviços jurídicos; a SOS Expat não assegura resultado, qualidade ou volume de negócios.

11.2. Plataforma fornecida “no estado em que se encontra”; sem garantia de disponibilidade contínua.

11.3. **Limitação de responsabilidade:** na medida do permitido, a responsabilidade total da SOS Expat perante o Advogado é limitada aos danos diretos e não excede o total das Taxas de Ligação recebidas pela SOS Expat na transação que originou a reclamação.

11.4. **Exclusões:** sem responsabilidade por danos indiretos/consequenciais/especiais/punitivos (perda de lucros, clientela, reputação etc.).

11.5. **Indenização:** o Advogado indeniza e isenta a SOS Expat (e suas afiliadas, diretores, empregados, agentes) de qualquer reclamação/dano/custo (incluindo honorários advocatícios) resultante de (i) violações destes Termos ou da lei, (ii) seus conteúdos, (iii) seus atos ou omissões profissionais.

11.6. **Renúncia a recursos.** O Advogado **renuncia expressa e irrevogavelmente** a qualquer recurso contra SOS Expat por (i) danos decorrentes da prestação de serviços jurídicos, (ii) perdas indiretas, (iii) disputas contratuais com Utilizadores, (iv) qualquer falha dos serviços prestados pelo Advogado. Esta renúncia aplica-se na máxima extensão permitida por lei.

11.7. Nenhuma relação de agência, parceria ou emprego é criada entre SOS Expat e o Advogado.

11.8. **Força maior.** SOS Expat não é responsável por atrasos ou falhas causados por **força maior** (desastre natural, guerra, pandemia, ciberataque, falha elétrica ou de internet, decisão governamental, greve, etc.).

11.9. **Sobrevivência:** os artigos 5, 7, 8, 9, 10, 11, 12 e 13 permanecem em vigor após o término.

---

## 12. Lei aplicável – Arbitragem – Jurisdição da Estônia – Ações coletivas

12.1. **Lei material:** para cada Ligação, a relação SOS Expat–Advogado é regida pela lei do País de Atuação, sujeita às normas imperativas locais. **De forma supletiva, e para interpretação/validade destes Termos, aplica-se a lei da Estônia.**

12.2. **Arbitragem obrigatória CCI:** qualquer litígio SOS Expat/Advogado será resolvido de forma definitiva conforme o Regulamento de Arbitragem da CCI. **Sede:** Tallinn (Estônia) **Idioma:** francês O tribunal aplica a lei material referida no art. 12.1. O procedimento é confidencial.

12.3. **Renúncia a ações coletivas:** na medida permitida, ficam excluídas ações coletivas, representativas ou de grupo; apenas ações individuais são admitidas.

12.4. **Competência exclusiva dos tribunais da Estônia:** para questões não arbitráveis e execução de sentenças ou medidas urgentes, os **tribunais de Tallinn (Estônia)** têm **competência exclusiva**. O Advogado renuncia a objeções de foro ou inconveniência.

---

## 13. Diversos

13.1. **Cessão:** a SOS Expat pode ceder estes Termos a uma entidade do seu grupo ou sucessora; o Advogado não pode fazê-lo sem consentimento escrito da SOS Expat.

13.2. **Integralidade:** os Termos constituem o acordo completo e substituem qualquer acordo anterior sobre o mesmo objeto.

13.3. **Notificações:** por publicação na Plataforma, aviso in-app ou via formulário de contato.

13.4. **Interpretação:** títulos são meramente indicativos. Nenhuma regra contra proferentem.

13.5. **Idiomas:** podem ser fornecidas traduções; prevalece a versão em inglês para interpretação.

13.6. **Nulidade parcial:** se qualquer cláusula for inválida/inexequível, o restante permanece válido; substituição por cláusula válida equivalente sempre que possível.

13.7. **Não renúncia:** a omissão no exercício de um direito não implica renúncia.

---

## 14. Contato

Para qualquer questão ou solicitação legal: **[https://sos-expat.com/contact](https://sos-expat.com/contact)**
`;

  const defaultCh = `
# 使用条款 – 律师（全球）

**WorldExpat OÜ 的 SOS Expat**（“**平台**”、“**SOS**”、“**我们**”）

**版本 2.2 – 最后更新日期：2025 年 6 月 16 日**

---

## 1. 定义

**应用程序 / 网站 / 平台**：由 **WorldExpat OÜ** 运营的数字服务，用于连接用户（“**用户**”）与律师（“**律师**”）。

**对接（匹配）**：平台在用户与律师之间进行的技术或操作性引荐，包括：(i) 提供联系方式，(ii) 开通沟通渠道（电话、消息、视频），或 (iii) 律师接受通过平台发出的请求。

**执业国家**：与用户请求最相关的司法辖区。如无法确定，则为用户在请求时的居住国；如涉及多个司法辖区，则为与案件最密切相关的国家。

**对接费用**：律师每次通过平台获得对接时需向 SOS 支付的费用（第 7 条）：**19 欧元（EUR）** 或 **25 美元（USD）**。
SOS Expat 可根据国家/货币发布本地费率表或调整金额，自公布之日起生效。

**请求（Requête）**：用户描述的法律问题或项目。

**支付服务提供商**：用于收取用户一次性付款并分配资金的第三方支付服务。

---

## 2. 目的、适用范围与接受

2.1. 本条款规范律师对平台的访问与使用。

2.2. SOS Expat 仅作为技术中介提供对接服务。SOS Expat 不从事律师业务，不提供法律意见，也不是律师与用户之间合同关系的当事方。

2.3. **电子接受（Click-Wrap）**：律师在注册或使用平台时勾选同意，即视为已签署电子合同并同意条款。SOS 可保存时间戳与技术日志作为证据。

2.4. **修改**：SOS 可随时更新本条款及费用标准，并在平台发布后生效。继续使用平台视为接受更新。

2.5. **有效期**：不限期。

---

## 3. 律师身份 – 独立性与合规

3.1. 律师以独立专业人士身份行事，SOS Expat 与其之间不存在雇佣、代理、委托、合伙或联合关系。

3.2. 律师独立负责：(i) 自身的学历、资格、律师协会注册及执业许可；(ii) 有效且适用于执业国家的职业责任保险；(iii) 遵守当地法律与职业规则（包括职业道德、广告与招揽、利益冲突、保密义务、反洗钱/客户识别、税务与消费者保护等）。

3.3. SOS Expat 不监督或评估律师提供的法律服务内容或质量，对此不承担任何责任。

3.4. **专业主体（B2B）**：律师确认仅以专业身份使用平台，不适用消费者保护制度。

---

## 4. 账户创建、验证与安全

4.1. **条件**：律师必须具备至少一个司法辖区的合法执业资格，提供身份证明、资质文件及有效的职业责任保险。

4.2. **流程**：注册账户 → 上传文件 → 手动审核（可能包含视频面试及 KYC/反洗钱核查）。

4.3. **信息准确性**：律师保证其资料真实、准确且保持更新；每位律师仅限一个账户。

4.4. **安全**：律师须妥善保管账户凭证。通过账户进行的任何操作均视为本人行为；若发现被盗用应立即报告。

4.5. **停用与终止**：账户**超过365天不活跃**后，可能在通知后被自动停用。律师在履行完所有义务后可随时关闭账户。SOS Expat可因违反条款而暂停或终止账户。

4.6. **电子通信**：律师同意通过电子方式接收与条款相关的通知（电子邮件、应用内通知、平台公告）。

---

## 5. 使用规则 – 利益冲突、保密与禁止规避

5.1. **利益冲突**：律师在提供任何建议前应进行利益冲突检查。如发现冲突，应退出并通知用户。

5.2. **保密与职业秘密**：律师应根据执业国家的法律严格遵守职业保密义务。除法律要求外，SOS 不会录制交流内容。

5.3. **禁止规避**：SOS Expat 不从律师费用中抽成。但每次新的用户对接均需支付对接费用。禁止绕过平台以规避支付。

5.4. **禁止行为**：包括但不限于身份/资格伪造、发布非法内容、操纵系统、恶意串通、违反制裁与出口管制、或其他非法活动。

5.5. **服务可用性**：平台按“现状”提供，不保证持续运行（可能因维护、技术故障或不可抗力中断）。必要时可依法限制访问。

---

## 6. 律师与用户的关系（平台外）

6.1. 对接完成后，律师与用户可在线下签订独立合同。SOS Expat 不参与律师费用的设定或收取，除非适用“一次性支付机制”。

6.2. 律师应根据当地法律签订收费协议，收取与缴纳税款，并遵守广告、利益冲突及消费者保护规则。

6.3. SOS Expat 不对律师提供的建议质量、准确性或结果承担责任。

---

## 7. 费用、支付与税务

7.1. **对接费用（固定）**：每次对接 19 欧元（EUR）或 25 美元（USD），不含税及支付服务费。SOS Expat 可发布本地价格表并调整金额。

7.2. **一次性支付与分配**：用户通过平台一次性支付金额，涵盖：(i) 律师费用（由律师与用户约定）及 (ii) SOS Expat 的对接费。SOS Expat（或支付服务商）代收款项，扣除对接费后将余额转给律师。律师授权 SOS Expat 执行此扣款及分配。

7.3. **费用生效与不退款**：对接费用在对接时即产生，不可退款（除非 SOS Expat 自主决定在平台技术原因导致失败的情况下退款）。

7.4. **用户退款**：若向用户退款，相关金额从律师份额中扣除。SOS Expat 可从未来付款中抵扣或要求返还。对接费用不予退还，除非 SOS Expat 自行决定。

7.5. **货币与汇率**：平台可支持多币种，支付服务商可能收取汇率或转换费。

7.6. **税务**：律师自行负责履行纳税义务。SOS Expat 将根据法律要求就其对接费用征收与缴纳增值税（或等效税）。

7.7. **抵销**：SOS Expat 可将律师应付的任何金额（如退款）与待支付金额进行抵销。

---

## 8. 支付 – KYC / 反洗钱 – 制裁

8.1. 支付由第三方服务商处理。律师须同意其条款与 KYC/AML 程序。

8.2. 如有欺诈、违规或法律命令嫌疑，SOS Expat 可暂停、保留或取消付款。

8.3. 若法律要求，SOS Expat 可限制受制裁或禁运地区的访问。律师声明未列入任何制裁名单，并遵守出口管制法规。

---

## 9. 个人数据（全球框架 – GDPR/DSA）

9.1. **数据控制者身份**：就为对接目的收集的用户数据，SOS Expat 与律师各自为独立的数据控制者，遵循 **欧盟第2016/679号条例（GDPR）**。

9.2. **法律依据与目的**：合同履行（对接）、合法利益（安全、防欺诈、改进）、法律合规（反洗钱、制裁）及必要时的同意。

9.3. **跨境传输**：如有需要，将在具备适当保障的前提下进行（标准合同条款、充分性决定等）。

9.4. **用户权利与联系方式**：用户可通过平台联系表行使数据权利（访问、更正、删除、可携性、异议）。

9.5. **安全**：采取合理的技术与组织措施；根据GDPR于72小时内报告数据泄露事件。

9.6. 律师须依执业国家法律与职业道德（保密义务）处理所获个人数据。

9.7. **DSA合规**：平台按 **欧盟第2022/2065号条例（数字服务法）** 规定作为**中介服务**运营。SOS Expat实施非法内容举报机制并与相关主管机构合作。

---

## 10. 知识产权

平台的品牌、标识、数据库及内容均受法律保护。除在本条款有效期内的个人、非独占、不可转让访问权外，律师不享有任何权利。
律师上传的内容（资料、头像、描述等）授权 SOS Expat 全球范围内以非独占方式用于托管与展示。

---

## 11. 保证、责任与赔偿

11.1. SOS Expat 不对律师服务的质量或结果作出任何保证。

11.2. 平台按“现状”提供，不保证持续或无故障运行。

11.3. **责任限制**：在法律允许范围内，SOS Expat 对律师的总赔偿责任限于直接损失，且最高不超过相关交易中 SOS Expat 所收取的对接费用总额。

11.4. **免责**：SOS Expat 不承担间接、连带、特殊或惩罚性损害（包括利润、客户或声誉损失）。

11.5. **赔偿义务**：律师须就 (i) 违反本条款或法律、(ii) 提供的内容、(iii) 专业行为或疏忽，向 SOS Expat（及其附属公司、员工、代理）赔偿由此产生的索赔、损失或费用（含律师费）。

11.6. **放弃追索权**：律师**明确且不可撤销地放弃**对SOS Expat的任何追索权，包括：(i) 法律服务导致的损害、(ii) 间接损失、(iii) 与用户的合同纠纷、(iv) 律师提供服务的任何缺陷。此放弃在法律允许的最大范围内适用。

11.7. 本条款不构成雇佣、代理、合作或合资关系。

11.8. **不可抗力**：SOS Expat不对因**不可抗力**事件（自然灾害、战争、疫情、网络攻击、电力或网络故障、政府决定、罢工等）导致的延迟或失败承担责任。

11.9. **存续条款**：第 5、7、8、9、10、11、12、13 条在合同终止后继续有效。

---

## 12. 适用法律 – 仲裁 – 爱沙尼亚司法管辖 – 集体诉讼放弃

12.1. **实质法律**：每次对接中，SOS Expat 与律师关系受执业国家法律管辖，并受当地强制性法律约束。若无相关规定或为解释本条款之目的，适用 **爱沙尼亚法律**。

12.2. **强制仲裁（ICC）**：所有争议按国际商会（ICC）仲裁规则最终解决。**仲裁地：**爱沙尼亚塔林（Tallinn）**仲裁语言：**法语 仲裁庭依据第 12.1 条规定的法律审理，程序保密。

12.3. **放弃集体诉讼**：在法律允许范围内，排除任何集体、代表或群体诉讼；仅可提起个人诉求。

12.4. **爱沙尼亚法院专属管辖**：对非仲裁事项或仲裁裁决执行及紧急救济，**塔林法院**享有**专属管辖权**。律师放弃异议或不便管辖抗辩。

---

## 13. 其他条款

13.1. **转让**：SOS Expat 可将本条款转让予集团公司或继任者；律师不得未经书面同意转让。

13.2. **完整协议**：本条款构成双方完整协议，取代任何先前协议。

13.3. **通知**：通过平台公告、应用内消息或联系表进行。

13.4. **解释规则**：标题仅供参考，不影响解释；不适用对起草方不利的解释规则。

13.5. **语言**：可提供翻译版本；若有歧义，以英文版本为准。

13.6. **可分割性**：如任何条款无效或不可执行，其余条款仍有效；SOS Expat 可以合法条款替代。

13.7. **权利不弃权**：未行使任何权利不视为放弃。

---

## 14. 联系方式

如有法律问题或请求，请访问：**[https://sos-expat.com/contact](https://sos-expat.com/contact)**
`;
  const defaultAr = `
# شروط الاستخدام – للمحامين (عالمي)

**SOS Expat التابعة لشركة WorldExpat OÜ** (المشار إليها بـ «**المنصّة**»، «**SOS**»، «**نحن**»)

**الإصدار 2.2 – آخر تحديث: 16 يونيو 2025**

---

## 1. التعريفات

**التطبيق / الموقع / المنصّة**: الخدمات الرقمية التي تديرها **WorldExpat OÜ**، والتي تتيح التواصل بين المستخدمين («**المستخدمون**») والمحامين («**المحامون**»).

**الربط (المطابقة)**: عملية الاتصال الفني/العملي التي تُجريها المنصّة بين المستخدم والمحامي، والمتمثلة في:
(i) نقل بيانات الاتصال، أو (ii) فتح قناة تواصل (مكالمة، رسالة، فيديو)، أو (iii) قبول المحامي لطلب قُدّم عبر المنصّة.

**بلد التدخّل**: الدولة أو الاختصاص القضائي الذي يتعلق به الطلب أساسًا. وفي حال عدم التحديد، يُعتبر بلد إقامة المستخدم وقت الطلب؛ وإذا وُجد أكثر من بلد، فيُختار البلد الأكثر ارتباطًا بالطلب.

**رسوم الربط**: الرسوم المستحقة لـ SOS عن كل عملية ربط (المادة 7): **19 يورو (EUR)** أو **25 دولارًا أمريكيًا (USD)**.
يجوز لـ SOS Expat تعديل هذه الرسوم و/أو نشر جداول أسعار محلية حسب الدولة أو العملة، وتكون سارية بأثر مستقبلي فقط.

**الطلب (Requête)**: الحالة أو المشروع القانوني الذي يقدمه المستخدم.

**مزوّدو خدمات الدفع**: أطراف ثالثة تتولى تحصيل الدفعة الواحدة من المستخدم وتوزيع الأموال.

---

## 2. الهدف والنطاق والقبول

2.1. تحكم هذه الشروط وصول المحامين إلى المنصّة واستخدامهم لها.

2.2. تعمل SOS Expat فقط كوسيط تقني في عملية الربط. ولا تمارس مهنة المحاماة، ولا تقدم استشارات قانونية، وليست طرفًا في العلاقة بين المحامي والمستخدم.

2.3. **القبول الإلكتروني (Click-Wrap):** يوافق المحامي على هذه الشروط عند تحديد خانة القبول أثناء التسجيل و/أو باستخدام المنصّة. هذا الفعل يُعد توقيعًا إلكترونيًا وموافقةً تعاقدية. يجوز لـ SOS الاحتفاظ بسجلات إثبات (الوقت، المعرفات التقنية).

2.4. **التعديلات:** يجوز لـ SOS تحديث هذه الشروط و/أو جدول الرسوم في أي وقت، وتُطبّق التعديلات مستقبلاً بعد نشرها على المنصّة. الاستمرار في الاستخدام يُعتبر قبولًا.

2.5. **المدة:** غير محددة.

---

## 3. وضع المحامي – الاستقلال والامتثال

3.1. يعمل المحامي كمهني مستقل، ولا تنشأ بينه وبين SOS Expat أي علاقة عمل أو وكالة أو شراكة أو مشروع مشترك.

3.2. يكون المحامي وحده مسؤولاً عن: (i) شهاداته ومؤهلاته وتسجيله في نقابة المحامين/الهيئات المعادلة وترخيصه المهني؛ (ii) تأمين المسؤولية المهنية الساري والمناسب لبلد التدخّل؛ (iii) الامتثال للقوانين والأنظمة المهنية المحلية (الأخلاقيات، الإعلان، تضارب المصالح، السرية المهنية، مكافحة غسل الأموال، الضرائب، حماية المستهلك، إلخ).

3.3. لا تقوم SOS Expat بالإشراف على محتوى الخدمات القانونية التي يقدمها المحامي أو تقييمها، ولا تتحمل أي مسؤولية عنها.

3.4. **صفة مهنية (B2B):** يقرّ المحامي بأنه يتصرف لأغراض مهنية بحتة، ولا تسري عليه أحكام حماية المستهلك.

---

## 4. إنشاء الحساب، التحقق والأمان

4.1. **الشروط:** وجود ترخيص ساري في إحدى الولايات القضائية، وتقديم مستندات الهوية والمؤهلات، وتأمين مهني ساري.

4.2. **الإجراءات:** إنشاء حساب، تقديم المستندات، تحقق يدوي قد يشمل مقابلة بالفيديو وفحص الهوية ومكافحة غسل الأموال عبر مزودي الخدمة.

4.3. **الدقة والتحديث:** يضمن المحامي دقة وحداثة المعلومات المقدّمة؛ يُسمح بحساب واحد فقط لكل محامٍ.

4.4. **الأمان:** يتعين على المحامي حماية بيانات دخوله؛ وتُعتبر أي نشاطات من الحساب صادرة عنه؛ ويجب الإبلاغ فورًا عن أي خرق أمني.

4.5. **عدم النشاط والإنهاء:** بعد **365 يومًا من عدم النشاط**، قد يتم إلغاء تنشيط الحساب تلقائيًا بعد الإخطار. يمكن للمحامي إغلاق حسابه في أي وقت بعد الوفاء بالتزاماته. يجوز لـ SOS Expat تعليق أو إنهاء الحساب لانتهاك الشروط.

4.6. **الاتصالات الإلكترونية:** يوافق المحامي على تلقي الإخطارات المتعلقة بالشروط عبر الوسائل الإلكترونية (البريد الإلكتروني، إشعارات التطبيق، النشر على المنصة).

---

## 5. قواعد الاستخدام – تضارب المصالح، السرية، عدم التحايل

5.1. **تضارب المصالح:** يتعيّن على المحامي التحقق من أي تضارب قبل تقديم أي استشارة. وفي حال وجود تضارب، عليه الانسحاب وإخطار المستخدم.

5.2. **السرية المهنية:** يلتزم المحامي بالسرية وفق القوانين المطبقة في بلد التدخّل. ولا تسجل SOS المحادثات إلا إذا تطلب القانون ذلك.

5.3. **عدم التحايل:** لا تتقاضى SOS Expat عمولة على أتعاب المحامين. ويجب دفع رسوم الربط عن كل مستخدم جديد يتم التعرف عليه عبر المنصّة. يُحظر التحايل على المنصّة لتفادي دفع هذه الرسوم.

5.4. **السلوكيات المحظورة:** انتحال الهوية أو المؤهلات، نشر محتوى غير قانوني، التلاعب أو التواطؤ أو المقاطعة للإضرار بالمنصّة، مخالفة أنظمة العقوبات أو التصدير، أو أي نشاط غير قانوني.

5.5. **التوافر:** تُقدَّم المنصّة "كما هي" دون ضمان تشغيل مستمر. وقد يُقيّد الوصول لأسباب قانونية أو تقنية أو في حالات القوة القاهرة.

---

## 6. العلاقة بين المحامي والمستخدم (خارج المنصّة)

6.1. بعد عملية الربط، يمكن للمحامي والمستخدم إبرام اتفاق منفصل خارج المنصّة.
ولا تتدخل SOS Expat في تحديد أو تحصيل الأتعاب، إلا في حال استخدام نظام الدفع الموحد الموضح أدناه.

6.2. يلتزم المحامي بتقديم اتفاق الأتعاب وفق القانون المحلي، وجمع الضرائب المستحقة وسدادها، والامتثال للقواعد المهنية (الإعلان، تضارب المصالح، المستهلكين).

6.3. لا تتحمل SOS Expat أي مسؤولية عن جودة أو دقة أو نتائج الخدمات القانونية المقدّمة من المحامي.

---

## 7. الرسوم، الدفع والضرائب

7.1. **رسوم الربط (ثابتة):** 19 يورو (EUR) أو 25 دولارًا أمريكيًا (USD) لكل ربط، غير شاملة الضرائب ورسوم مزوّد الدفع. يجوز لـ SOS Expat تعديلها أو نشر جداول أسعار محلية بتأثير مستقبلي فقط.

7.2. **الدفع الموحد وتوزيع المبالغ:** يقوم المستخدم بدفع مبلغ واحد عبر المنصّة يشمل: (i) أتعاب المحامي (حسب الاتفاق بينه وبين المستخدم) و (ii) رسوم الربط الخاصة بـ SOS Expat. تقوم SOS Expat (أو مزوّد الدفع) بتحصيل المبلغ، واقتطاع رسومها، ثم تحويل الرصيد المتبقي للمحامي، الذي يفوض SOS Expat بذلك.

7.3. **الاستحقاق وعدم الاسترداد:** تستحق رسوم الربط عند تنفيذ عملية الربط ولا تُردّ، إلا في حال تقصير تقني مثبت من المنصّة وبقرار تقديري من SOS Expat.

7.4. **استرداد المستخدم:** في حال ردّ مبلغ للمستخدم، يُخصم من حصة المحامي. يجوز لـ SOS Expat اقتطاع المبلغ من الدفعات المستقبلية أو المطالبة بردّه. لا تُسترد رسوم الربط إلا بقرار تقديري من SOS Expat.

7.5. **العملات والتحويل:** يمكن الدفع بعملات متعددة، وقد تُطبَّق رسوم تحويل من مزوّد الخدمة.

7.6. **الضرائب:** المحامي مسؤول عن التزاماته الضريبية. تقوم SOS Expat بتحصيل وتحويل ضريبة القيمة المضافة (أو ما يعادلها محليًا) على رسومها فقط.

7.7. **المقاصة:** يجوز لـ SOS Expat مقاصة أي مبالغ مستحقة لها مع ما تدين به للمحامي.

---

## 8. المدفوعات – التحقق (KYC) – مكافحة غسل الأموال – العقوبات

8.1. تُنفَّذ المدفوعات عبر مزوّدي خدمات طرف ثالث. ويوافق المحامي على شروطهم وإجراءات التحقق (KYC/AML).

8.2. يجوز لـ SOS Expat تعليق أو حجز أو إلغاء أي مدفوعات في حال الاشتباه بالاحتيال أو المخالفة أو صدور أوامر قانونية.

8.3. قد يُقيَّد الوصول في المناطق الخاضعة للعقوبات أو الحظر بموجب القانون. ويقرّ المحامي بأنه غير مدرج على أي قوائم عقوبات ويلتزم بلوائح التصدير ذات الصلة.

---

## 9. البيانات الشخصية (إطار عالمي – GDPR/DSA)

9.1. **الأطراف المتحكمة بالبيانات:** بالنسبة لبيانات المستخدمين المستلمة لغرض الربط، تُعد SOS Expat والمحامي كلٌّ منهما مسؤولاً مستقلاً عن المعالجة لأغراضه الخاصة.

9.2. **الأسس والأغراض القانونية:** تنفيذ العقد (الربط)، المصالح المشروعة (الأمن، منع الاحتيال، التحسين)، الالتزام القانوني (مكافحة غسل الأموال، العقوبات)، أو بموافقة المستخدم عند الحاجة.

9.3. **النقل الدولي للبيانات:** يتم مع الضمانات اللازمة عند الاقتضاء.

9.4. **حقوق المستخدم والتواصل:** يمكن للمستخدم ممارسة حقوقه عبر نموذج الاتصال في المنصّة.

9.5. **الأمن:** اتخاذ تدابير تقنية وتنظيمية مناسبة؛ والإبلاغ عن أي خرق للبيانات وفق القوانين المعمول بها.

9.6. يلتزم المحامي بمعالجة البيانات وفق قوانين بلد التدخّل وأخلاقيات المهنة (السرية المهنية).

9.7. **الامتثال لـ DSA:** تعمل المنصّة كـ**خدمة وسيطة** بموجب **اللائحة (الاتحاد الأوروبي) 2022/2065 (قانون الخدمات الرقمية)**. تنفذ SOS Expat آليات للإبلاغ عن المحتوى غير القانوني وتتعاون مع السلطات المختصة.

---

## 10. الملكية الفكرية

المنصّة وعلاماتها وشعاراتها وقواعد بياناتها ومحتواها محمية قانونيًا.
ولا يُمنح المحامي سوى حق وصول شخصي غير حصري وغير قابل للتحويل طوال مدة الشروط.
ويمنح المحامي SOS Expat ترخيصًا عالميًا غير حصري لاستضافة وعرض محتواه (الملف الشخصي، الصورة، الوصف) ضمن المنصّة.

---

## 11. الضمان والمسؤولية والتعويض

11.1. لا تقدم SOS Expat أي ضمانات بخصوص الخدمات القانونية أو نتائجها.

11.2. تُقدَّم المنصّة «كما هي» دون أي ضمان لاستمرارية الوصول أو الجاهزية.

11.3. **تحديد المسؤولية:** في حدود القانون، لا تتجاوز مسؤولية SOS Expat تجاه المحامي عن أي ضرر مباشر إجمالي رسوم الربط المستلمة عن المعاملة محل النزاع.

11.4. **الاستثناءات:** لا تتحمل SOS Expat أي أضرار غير مباشرة أو تبعية أو خاصة أو تأديبية (مثل فقدان الأرباح أو السمعة).

11.5. **التعويض:** يتعهد المحامي بتعويض SOS Expat (وشركاتها التابعة وموظفيها ووكلائها) عن أي دعاوى أو أضرار أو تكاليف (بما في ذلك أتعاب المحاماة) ناتجة عن (i) خرق هذه الشروط أو القوانين، (ii) محتواه، أو (iii) أفعاله أو إغفالاته المهنية.

11.6. **التنازل عن حق الرجوع:** يتنازل المحامي صراحةً وبشكل غير قابل للإلغاء عن أي حق في الرجوع على SOS Expat عن أي أضرار ناتجة عن الخدمات القانونية المقدمة، أو الخسائر غير المباشرة، أو النزاعات مع المستخدمين، أو أي قصور في الخدمة.

11.7. لا تُفسَّر هذه الشروط على أنها تنشئ علاقة توظيف أو وكالة أو شراكة بين SOS Expat والمحامي.

11.8. **القوة القاهرة:** لا تتحمل SOS Expat أي مسؤولية عن التأخير أو الإخفاق في تنفيذ التزاماتها الناتج عن أحداث القوة القاهرة (كوارث طبيعية، حرب، جائحة، هجوم إلكتروني، انقطاع الكهرباء أو الإنترنت، قرار حكومي، إضراب، إلخ).

11.9. **البقاء بعد الإنهاء:** تظل المواد 5 و7 و8 و9 و10 و11 و12 و13 سارية بعد انتهاء العقد.

---

## 12. القانون الواجب التطبيق – التحكيم – الاختصاص في إستونيا – الدعاوى الجماعية

12.1. **القانون الموضوعي:** تخضع علاقة SOS Expat–المحامي لقانون بلد التدخّل، مع مراعاة القواعد الإلزامية المحلية. وعند غيابها أو لتفسير الشروط، يُطبّق **القانون الإستوني** تكميليًا.

12.2. **التحكيم الإلزامي (ICC):** تُحلّ جميع النزاعات نهائيًا وفق قواعد التحكيم لغرفة التجارة الدولية (ICC). **مقر التحكيم:** تالين (إستونيا) **اللغة:** الفرنسية يُطبّق المحكّم القانون المنصوص عليه في المادة 12.1، وتُجرى الإجراءات بسرية.

12.3. **التنازل عن الدعاوى الجماعية:** في حدود القانون، تُستبعد الدعاوى الجماعية أو التمثيلية؛ ويُسمح فقط بالدعاوى الفردية.

12.4. **الاختصاص الحصري للمحاكم الإستونية:** في المسائل غير القابلة للتحكيم أو لتنفيذ الأحكام أو التدابير العاجلة، تختص **محاكم تالين (إستونيا)** حصريًا. ويتنازل المحامي عن أي اعتراض على الاختصاص أو مكان التقاضي.

---

## 13. أحكام عامة

13.1. **التحويل:** يجوز لـ SOS Expat نقل هذه الشروط إلى كيان تابع أو خلف قانوني؛ ولا يجوز للمحامي نقلها دون موافقة مكتوبة.

13.2. **الاتفاق الكامل:** تمثل هذه الشروط الاتفاق الكامل بين الطرفين وتُلغي أي اتفاقات سابقة.

13.3. **الإشعارات:** تُقدَّم عبر نشرها على المنصّة أو إشعارات داخل التطبيق أو نموذج الاتصال.

13.4. **التفسير:** العناوين لغرض التوضيح فقط ولا تؤثر على التفسير؛ ولا تُطبَّق قاعدة التفسير ضد الصائغ.

13.5. **اللغة:** قد تتوفر ترجمات، وتُعتبر النسخة الإنجليزية المرجع في حال التعارض.

13.6. **قابلية الفصل:** إذا كانت أي مادة باطلة أو غير قابلة للتنفيذ، تبقى باقي المواد سارية؛ ويُستبدل النص بآخر قانوني مكافئ قدر الإمكان.

13.7. **عدم التنازل:** عدم ممارسة أي حق لا يُعد تنازلاً عنه.

---

## 14. الاتصال

لأي استفسار قانوني أو طلب، يُرجى زيارة: **[https://sos-expat.com/contact](https://sos-expat.com/contact)**
`;

  // const defaultContent = selectedLanguage === 'fr' ? defaultFr : defaultEn;
  const defaultContent =
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

  // Sections du sommaire (UI)
  const anchorMap = useMemo(
    () => [
      { num: 1, label: t.sections.definitions },
      { num: 2, label: t.sections.scope },
      { num: 3, label: t.sections.status },
      { num: 4, label: t.sections.account },
      { num: 5, label: t.sections.rules },
      { num: 6, label: t.sections.relationship },
      { num: 7, label: t.sections.fees },
      { num: 8, label: t.sections.payments },
      { num: 9, label: t.sections.data },
      { num: 10, label: t.sections.ip },
      { num: 11, label: t.sections.liability },
      { num: 12, label: t.sections.law },
      { num: 13, label: t.sections.misc },
      { num: 14, label: t.sections.contact },
    ],
    [selectedLanguage]
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

              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-1">
                <button
                  type="button"
                  onClick={() => handleLanguageChange("fr")}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedLanguage === "fr"
                      ? "bg-white text-gray-900"
                      : "text-white hover:bg-white/10"
                  }`}
                  aria-pressed={selectedLanguage === "fr"}
                >
                  <Languages className="w-4 h-4" />
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange("en")}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    selectedLanguage === "en"
                      ? "bg-white text-gray-900"
                      : "text-white hover:bg-white/10"
                  }`}
                  aria-pressed={selectedLanguage === "en"}
                >
                  <Languages className="w-4 h-4" />
                  EN
                </button>
              </div>
            </div>

            <header className="text-center">
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Scale className="w-12 h-12 text-white" />
                </div>
              </div>

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
                  <span>{t.trustedByExperts}</span>
                </span>
                {/* Aucune note/avis affichés */}
              </div>

              <div className="mt-8 flex items-center justify-center gap-4">
                <Link
                  to="/register/lawyer"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 transition-all duration-300 hover:scale-105 backdrop-blur-sm font-semibold"
                >
                  <Briefcase className="w-5 h-5" />
                  <span>{t.ctaHero}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="https://sos-expat.com/contact"
                  className="group inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white font-bold border-2 border-red-400/50 hover:scale-105 transition-all"
                >
                  <Globe className="w-5 h-5" />
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
                  icon: <Users className="w-6 h-6" />,
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
                  <FileText className="w-5 h-5" />
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
                <Globe className="w-4 h-4" /> Global
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <Link
                to="/register/lawyer"
                className="group relative overflow-hidden bg-white text-red-600 hover:text-red-700 px-10 py-5 rounded-3xl font-black text-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl flex items-center gap-3"
              >
                <Briefcase className="w-5 h-5" />
                <span>{t.startNow}</span>
                {/* Flèche retirée sur ce CTA comme demandé */}
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-black/5" />
              </Link>

              <a
                href="https://sos-expat.com/contact"
                className="group relative overflow-hidden border-2 border-white bg-transparent text-white px-10 py-5 rounded-3xl font-bold text-lg transition-all duration-300 hover:scale-105 hover:bg-white/10 flex items-center gap-3"
              >
                <Globe className="w-5 h-5" />
                <span>{t.contactUs}</span>
                <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/30" />
              </a>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default TermsLawyers;
