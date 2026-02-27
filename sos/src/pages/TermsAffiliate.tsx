import React, { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import {
  DollarSign,
  Shield,
  Users,
  FileText,
  Globe,
  Clock,
  ArrowRight,
  Languages,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Gift,
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
 * TermsAffiliate - CGU centralisees du Programme d'Affiliation
 * - Support multilingue (9 langues)
 * - Contenu editable depuis l'admin (collection `legal_documents` type "terms_affiliate")
 * - Design vert/emerald pour differencier des autres pages CGU
 */

type SupportedLanguage = "fr" | "en" | "es" | "de" | "ru" | "hi" | "ch" | "pt" | "ar";

const TermsAffiliate: React.FC = () => {
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
          where("type", "==", "terms_affiliate"),
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
        console.error("Error fetching affiliate terms:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTerms();
  }, [selectedLanguage]);

  const translations = {
    fr: {
      title: "Conditions Generales du Programme d'Affiliation",
      subtitle: "Conditions communes applicables a tous les affilies SOS Expat (Chatters, Influenceurs, Blogueurs, Admins Groupe)",
      lastUpdated: "Version 1.0 -- Derniere mise a jour : 27 fevrier 2026",
      loading: "Chargement...",
      joinNetwork: "Rejoindre le programme",
      trustedByHelpers: "Rejoignez des milliers d'affilies actifs",
      keyFeatures: "Points cles",
      features: [
        "Commissions transparentes",
        "Retraits securises",
        "Frais clairement affiches",
        "Conformite KYC & RGPD",
      ],
      languageToggle: "Changer de langue",
      sections: {
        commissions: "Commissions",
        withdrawals: "Retraits",
        fees: "Frais",
        kyc: "KYC / Verification",
        antifraud: "Anti-fraude",
        gdpr: "RGPD / Donnees personnelles",
      },
      readyToJoin: "Pret a rejoindre le programme d'affiliation ?",
      readySubtitle: "Gagnez des commissions en recommandant nos services.",
      startNow: "S'inscrire maintenant",
      contactUs: "Nous contacter",
      anchorTitle: "Sommaire",
      editHint: "Document editable depuis la console admin",
      ctaHero: "Commencer",
      heroBadge: "Nouveau -- Programme d'affiliation unifie 2026",
      contactForm: "Formulaire de contact",
    },
    en: {
      title: "Affiliate Program Terms and Conditions",
      subtitle: "Common terms applicable to all SOS Expat affiliates (Chatters, Influencers, Bloggers, Group Admins)",
      lastUpdated: "Version 1.0 -- Last updated: February 27, 2026",
      loading: "Loading...",
      joinNetwork: "Join the program",
      trustedByHelpers: "Join thousands of active affiliates",
      keyFeatures: "Key features",
      features: [
        "Transparent commissions",
        "Secure withdrawals",
        "Clearly displayed fees",
        "KYC & GDPR compliance",
      ],
      languageToggle: "Switch language",
      sections: {
        commissions: "Commissions",
        withdrawals: "Withdrawals",
        fees: "Fees",
        kyc: "KYC / Verification",
        antifraud: "Anti-fraud",
        gdpr: "GDPR / Personal Data",
      },
      readyToJoin: "Ready to join the affiliate program?",
      readySubtitle: "Earn commissions by recommending our services.",
      startNow: "Sign up now",
      contactUs: "Contact us",
      anchorTitle: "Overview",
      editHint: "Document editable from admin console",
      ctaHero: "Get started",
      heroBadge: "New -- Unified Affiliate Program 2026",
      contactForm: "Contact Form",
    },
    es: {
      title: "Terminos y Condiciones del Programa de Afiliados",
      subtitle: "Terminos comunes aplicables a todos los afiliados de SOS Expat (Chatters, Influencers, Bloggers, Admins de Grupo)",
      lastUpdated: "Version 1.0 -- Ultima actualizacion: 27 de febrero de 2026",
      loading: "Cargando...",
      joinNetwork: "Unirse al programa",
      trustedByHelpers: "Unete a miles de afiliados activos",
      keyFeatures: "Caracteristicas clave",
      features: [
        "Comisiones transparentes",
        "Retiros seguros",
        "Tarifas claramente mostradas",
        "Cumplimiento KYC y RGPD",
      ],
      languageToggle: "Cambiar idioma",
      sections: {
        commissions: "Comisiones",
        withdrawals: "Retiros",
        fees: "Tarifas",
        kyc: "KYC / Verificacion",
        antifraud: "Antifraude",
        gdpr: "RGPD / Datos personales",
      },
      readyToJoin: "Listo para unirte al programa de afiliados?",
      readySubtitle: "Gana comisiones recomendando nuestros servicios.",
      startNow: "Inscribirse ahora",
      contactUs: "Contactanos",
      anchorTitle: "Resumen",
      editHint: "Documento editable desde la consola de administracion",
      ctaHero: "Empezar",
      heroBadge: "Nuevo -- Programa de afiliados unificado 2026",
      contactForm: "Formulario de contacto",
    },
    de: {
      title: "Allgemeine Geschaftsbedingungen des Partnerprogramms",
      subtitle: "Gemeinsame Bedingungen fur alle SOS Expat-Partner (Chatters, Influencer, Blogger, Gruppenadmins)",
      lastUpdated: "Version 1.0 -- Letzte Aktualisierung: 27. Februar 2026",
      loading: "Ladt...",
      joinNetwork: "Dem Programm beitreten",
      trustedByHelpers: "Schliessen Sie sich Tausenden aktiver Partner an",
      keyFeatures: "Hauptmerkmale",
      features: [
        "Transparente Provisionen",
        "Sichere Auszahlungen",
        "Klar angezeigte Gebuhren",
        "KYC- und DSGVO-Konformitat",
      ],
      languageToggle: "Sprache wechseln",
      sections: {
        commissions: "Provisionen",
        withdrawals: "Auszahlungen",
        fees: "Gebuhren",
        kyc: "KYC / Verifizierung",
        antifraud: "Anti-Betrug",
        gdpr: "DSGVO / Personenbezogene Daten",
      },
      readyToJoin: "Bereit, dem Partnerprogramm beizutreten?",
      readySubtitle: "Verdienen Sie Provisionen, indem Sie unsere Dienste empfehlen.",
      startNow: "Jetzt anmelden",
      contactUs: "Kontaktieren Sie uns",
      anchorTitle: "Ubersicht",
      editHint: "Dokument uber Admin-Konsole bearbeitbar",
      ctaHero: "Loslegen",
      heroBadge: "Neu -- Einheitliches Partnerprogramm 2026",
      contactForm: "Kontaktformular",
    },
    ru: {
      title: "Условия партнерской программы",
      subtitle: "Общие условия для всех партнеров SOS Expat (Чаттеры, Инфлюенсеры, Блогеры, Админы групп)",
      lastUpdated: "Версия 1.0 -- Последнее обновление: 27 февраля 2026 г.",
      loading: "Загрузка...",
      joinNetwork: "Присоединиться к программе",
      trustedByHelpers: "Присоединяйтесь к тысячам активных партнеров",
      keyFeatures: "Ключевые особенности",
      features: [
        "Прозрачные комиссии",
        "Безопасные выплаты",
        "Четко отображаемые сборы",
        "Соответствие KYC и GDPR",
      ],
      languageToggle: "Сменить язык",
      sections: {
        commissions: "Комиссии",
        withdrawals: "Выплаты",
        fees: "Сборы",
        kyc: "KYC / Верификация",
        antifraud: "Антимошенничество",
        gdpr: "GDPR / Персональные данные",
      },
      readyToJoin: "Готовы присоединиться к партнерской программе?",
      readySubtitle: "Зарабатывайте комиссии, рекомендуя наши услуги.",
      startNow: "Зарегистрироваться сейчас",
      contactUs: "Свяжитесь с нами",
      anchorTitle: "Обзор",
      editHint: "Документ редактируется из консоли администратора",
      ctaHero: "Начать",
      heroBadge: "Новое -- Единая партнерская программа 2026",
      contactForm: "Контактная форма",
    },
    hi: {
      title: "संबद्ध कार्यक्रम के नियम और शर्तें",
      subtitle: "सभी SOS Expat संबद्धों पर लागू सामान्य शर्तें (चैटर्स, इन्फ्लुएंसर्स, ब्लॉगर्स, ग्रुप एडमिन)",
      lastUpdated: "संस्करण 1.0 -- अंतिम अपडेट: 27 फरवरी 2026",
      loading: "लोड हो रहा है...",
      joinNetwork: "कार्यक्रम में शामिल हों",
      trustedByHelpers: "हजारों सक्रिय संबद्धों से जुड़ें",
      keyFeatures: "मुख्य विशेषताएं",
      features: [
        "पारदर्शी कमीशन",
        "सुरक्षित निकासी",
        "स्पष्ट रूप से प्रदर्शित शुल्क",
        "KYC और GDPR अनुपालन",
      ],
      languageToggle: "भाषा बदलें",
      sections: {
        commissions: "कमीशन",
        withdrawals: "निकासी",
        fees: "शुल्क",
        kyc: "KYC / सत्यापन",
        antifraud: "धोखाधड़ी-रोधी",
        gdpr: "GDPR / व्यक्तिगत डेटा",
      },
      readyToJoin: "संबद्ध कार्यक्रम में शामिल होने के लिए तैयार हैं?",
      readySubtitle: "हमारी सेवाओं की सिफारिश करके कमीशन कमाएं।",
      startNow: "अभी साइन अप करें",
      contactUs: "हमसे संपर्क करें",
      anchorTitle: "अवलोकन",
      editHint: "व्यवस्थापक कंसोल से संपादन योग्य दस्तावेज़",
      ctaHero: "शुरू करें",
      heroBadge: "नया -- एकीकृत संबद्ध कार्यक्रम 2026",
      contactForm: "संपर्क फ़ॉर्म",
    },
    ch: {
      title: "联盟计划条款和条件",
      subtitle: "适用于所有 SOS Expat 联盟成员的通用条款（聊天员、网红、博主、群管理员）",
      lastUpdated: "版本 1.0 -- 最后更新：2026年2月27日",
      loading: "加载中...",
      joinNetwork: "加入计划",
      trustedByHelpers: "加入数千名活跃联盟成员",
      keyFeatures: "主要功能",
      features: [
        "透明的佣金",
        "安全的提款",
        "清晰显示的费用",
        "KYC 和 GDPR 合规",
      ],
      languageToggle: "切换语言",
      sections: {
        commissions: "佣金",
        withdrawals: "提款",
        fees: "费用",
        kyc: "KYC / 验证",
        antifraud: "反欺诈",
        gdpr: "GDPR / 个人数据",
      },
      readyToJoin: "准备加入联盟计划吗？",
      readySubtitle: "通过推荐我们的服务赚取佣金。",
      startNow: "立即注册",
      contactUs: "联系我们",
      anchorTitle: "概览",
      editHint: "可从管理控制台编辑文档",
      ctaHero: "开始",
      heroBadge: "新内容 -- 统一联盟计划 2026",
      contactForm: "联系表单",
    },
    ar: {
      title: "شروط وأحكام برنامج الشراكة",
      subtitle: "شروط مشتركة تنطبق على جميع شركاء SOS Expat (المحادثين، المؤثرين، المدونين، مديري المجموعات)",
      lastUpdated: "الإصدار 1.0 -- آخر تحديث: 27 فبراير 2026",
      loading: "جارٍ التحميل...",
      joinNetwork: "انضم إلى البرنامج",
      trustedByHelpers: "انضم إلى آلاف الشركاء النشطين",
      keyFeatures: "الميزات الرئيسية",
      features: [
        "عمولات شفافة",
        "سحوبات آمنة",
        "رسوم معروضة بوضوح",
        "الامتثال لـ KYC و GDPR",
      ],
      languageToggle: "تغيير اللغة",
      sections: {
        commissions: "العمولات",
        withdrawals: "السحوبات",
        fees: "الرسوم",
        kyc: "KYC / التحقق",
        antifraud: "مكافحة الاحتيال",
        gdpr: "GDPR / البيانات الشخصية",
      },
      readyToJoin: "هل أنت مستعد للانضمام إلى برنامج الشراكة؟",
      readySubtitle: "اكسب عمولات من خلال التوصية بخدماتنا.",
      startNow: "سجل الآن",
      contactUs: "اتصل بنا",
      anchorTitle: "نظرة عامة",
      editHint: "مستند قابل للتحرير من وحدة التحكم الإدارية",
      ctaHero: "ابدأ",
      heroBadge: "جديد -- برنامج شراكة موحد 2026",
      contactForm: "نموذج الاتصال",
    },
    pt: {
      title: "Termos e Condicoes do Programa de Afiliados",
      subtitle: "Termos comuns aplicaveis a todos os afiliados SOS Expat (Chatters, Influencers, Bloggers, Admins de Grupo)",
      lastUpdated: "Versao 1.0 -- Ultima atualizacao: 27 de fevereiro de 2026",
      loading: "Carregando...",
      joinNetwork: "Participar do programa",
      trustedByHelpers: "Junte-se a milhares de afiliados ativos",
      keyFeatures: "Caracteristicas principais",
      features: [
        "Comissoes transparentes",
        "Saques seguros",
        "Taxas claramente exibidas",
        "Conformidade KYC e RGPD",
      ],
      languageToggle: "Mudar idioma",
      sections: {
        commissions: "Comissoes",
        withdrawals: "Saques",
        fees: "Taxas",
        kyc: "KYC / Verificacao",
        antifraud: "Antifraude",
        gdpr: "RGPD / Dados pessoais",
      },
      readyToJoin: "Pronto para participar do programa de afiliados?",
      readySubtitle: "Ganhe comissoes recomendando nossos servicos.",
      startNow: "Inscreva-se agora",
      contactUs: "Entre em contato",
      anchorTitle: "Resumo",
      editHint: "Documento editavel a partir do console de administracao",
      ctaHero: "Comecar",
      heroBadge: "Novo -- Programa de afiliados unificado 2026",
      contactForm: "Formulario de contato",
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
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 mt-8 border-b-2 border-emerald-500 pb-4"
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
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-bold shadow-lg">
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
            className="text-lg font-bold text-gray-800 mt-6 mb-4 border-l-4 border-emerald-500 pl-4"
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
            className="bg-gray-50 border-l-4 border-emerald-500 rounded-r-xl p-5 my-4 hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold text-emerald-600 mr-2">{number}</span>
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
            className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6 my-6"
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
            className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-8 my-8 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold shadow-lg">
                <FileText className="w-5 h-5" />
              </span>
              Contact
            </h3>
            <p className="text-gray-800 leading-relaxed mb-6 text-lg">{line}</p>
            <a
              href="https://sos-expat.com/contact"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
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

  // Contenu par defaut FR
  const defaultFr = `
# Conditions Generales du Programme d'Affiliation -- SOS Expat

**SOS Expat by WorldExpat OU** (la "**Plateforme**", "**SOS**", "**nous**")

**Version 1.0 -- Derniere mise a jour : 27 fevrier 2026**

---

## 1. Objet

1.1 Les presentes conditions generales regissent le programme d'affiliation de SOS Expat, commun a tous les roles : Chatters, Influenceurs, Blogueurs et Admins Groupe.

1.2 En acceptant ces conditions lors de votre inscription, vous acceptez l'integralite des presentes CGU. Pour les conditions specifiques a votre role, veuillez consulter les CGU correspondantes.

---

## 2. Commissions

2.1 **Calcul.** Les commissions sont calculees sur chaque transaction eligible generee via votre code affilie ou lien de tracking.

2.2 **Bareme.** Le bareme des commissions est defini pour chaque role (Chatter, Influenceur, Blogueur, Admin Groupe) dans leurs CGU respectives.

2.3 **Validation.** Les commissions sont validees apres la periode de retractation client (14 jours) et la verification anti-fraude automatique.

2.4 **Devise.** Les commissions sont exprimees en USD. La conversion est effectuee au taux du jour lors du retrait.

---

## 3. Retraits

3.1 **Seuil minimum.** Le retrait est possible a partir de **30$** de solde disponible.

3.2 **Methodes de paiement.** Stripe (virement bancaire), PayPal, Mobile Money (selon le pays).

3.3 **Delais.** Les paiements sont traites sous **7 jours ouvres** apres validation.

3.4 **KYC obligatoire.** La verification d'identite (KYC) doit etre completee avant tout retrait.

---

## 4. Frais

4.1 **Frais de retrait.** Des frais de traitement s'appliquent a chaque retrait, selon la methode choisie. Les frais sont affiches avant confirmation du retrait.

4.2 **Frais de conversion.** Les frais de conversion de devise sont a la charge de l'affilie.

4.3 **Transparence.** Tous les frais sont clairement indiques dans le tableau de bord avant toute operation.

---

## 5. KYC / Verification d'identite

5.1 **Obligation.** Tout affilie doit completer la verification d'identite (KYC) avant son premier retrait.

5.2 **Delai.** Le KYC doit etre initie dans les **90 jours** suivant la premiere commission validee.

5.3 **Documents.** Piece d'identite valide (passeport, carte d'identite ou permis de conduire) et justificatif de domicile.

5.4 **Fonds non reclames.** Si le KYC n'est pas complete sous **180 jours**, les fonds sont consideres comme abandonnes.

---

## 6. Anti-fraude

6.1 **Interdictions.** Sont formellement interdits : l'auto-parrainage, le cookie stuffing, la creation de comptes multiples, l'utilisation de bots, le spam, et la falsification de donnees.

6.2 **Detection.** SOS Expat utilise des systemes de detection automatique incluant : analyse des patterns IP, verification des emails jetables, et controle des taux de conversion anormaux.

6.3 **Sanctions.** Avertissement, suspension temporaire, annulation des commissions (claw-back), bannissement definitif, poursuites judiciaires.

---

## 7. RGPD / Donnees personnelles

7.1 **Responsable de traitement.** SOS Expat (WorldExpat OU, Tallinn, Estonie).

7.2 **Donnees collectees.** Identite, coordonnees, performances affiliees, donnees de paiement, informations fiscales, logs de connexion.

7.3 **Droits.** Acces, rectification, effacement, portabilite, opposition via contact@sos-expat.com.

7.4 **Conservation.** Donnees actives pendant la relation ; **10 ans** pour les donnees comptables/fiscales.

7.5 **Transferts hors UE.** Clauses contractuelles types (SCT) UE applicables.

---

## 8. Dispositions generales

8.1 **Droit applicable.** Droit estonien, sans prejudice des dispositions imperatives du pays de residence de l'affilie.

8.2 **Modifications.** SOS Expat peut modifier les CGU avec un preavis de **30 jours** par email.

8.3 **Resiliation.** L'affilie peut resilier a tout moment. Les commissions validees restent payables.

---

## 9. Contact

Pour toute question concernant le programme d'affiliation, contactez-nous via le formulaire de contact ou a l'adresse : affiliate@sos-expat.com
`;

  // Contenu par defaut EN
  const defaultEn = `
# Affiliate Program Terms and Conditions -- SOS Expat

**SOS Expat by WorldExpat OU** (the "**Platform**", "**SOS**", "**we**")

**Version 1.0 -- Last updated: February 27, 2026**

---

## 1. Purpose

1.1 These terms and conditions govern the SOS Expat affiliate program, common to all roles: Chatters, Influencers, Bloggers, and Group Admins.

1.2 By accepting these terms during registration, you accept all of these Terms. For role-specific conditions, please refer to the respective Terms.

---

## 2. Commissions

2.1 **Calculation.** Commissions are calculated on each eligible transaction generated via your affiliate code or tracking link.

2.2 **Rates.** Commission rates are defined for each role (Chatter, Influencer, Blogger, Group Admin) in their respective Terms.

2.3 **Validation.** Commissions are validated after the client withdrawal period (14 days) and automatic anti-fraud verification.

2.4 **Currency.** Commissions are expressed in USD. Conversion is performed at the daily rate upon withdrawal.

---

## 3. Withdrawals

3.1 **Minimum threshold.** Withdrawal is possible from **$30** available balance.

3.2 **Payment methods.** Stripe (bank transfer), PayPal, Mobile Money (depending on country).

3.3 **Timing.** Payments are processed within **7 business days** after validation.

3.4 **Mandatory KYC.** Identity verification (KYC) must be completed before any withdrawal.

---

## 4. Fees

4.1 **Withdrawal fees.** Processing fees apply to each withdrawal, depending on the chosen method. Fees are displayed before withdrawal confirmation.

4.2 **Conversion fees.** Currency conversion fees are at the affiliate's expense.

4.3 **Transparency.** All fees are clearly indicated in the dashboard before any operation.

---

## 5. KYC / Identity Verification

5.1 **Requirement.** All affiliates must complete identity verification (KYC) before their first withdrawal.

5.2 **Timeline.** KYC must be initiated within **90 days** of the first validated commission.

5.3 **Documents.** Valid ID (passport, national ID card, or driver's license) and proof of address.

5.4 **Unclaimed funds.** If KYC is not completed within **180 days**, funds are considered abandoned.

---

## 6. Anti-fraud

6.1 **Prohibitions.** The following are strictly prohibited: self-referral, cookie stuffing, creating multiple accounts, using bots, spam, and data falsification.

6.2 **Detection.** SOS Expat uses automatic detection systems including: IP pattern analysis, disposable email verification, and abnormal conversion rate monitoring.

6.3 **Sanctions.** Warning, temporary suspension, commission cancellation (clawback), permanent ban, legal proceedings.

---

## 7. GDPR / Personal Data

7.1 **Data controller.** SOS Expat (WorldExpat OU, Tallinn, Estonia).

7.2 **Data collected.** Identity, contact details, affiliate performance, payment data, tax information, connection logs.

7.3 **Rights.** Access, rectification, erasure, portability, objection via contact@sos-expat.com.

7.4 **Retention.** Active data during the relationship; **10 years** for accounting/tax data.

7.5 **Non-EU transfers.** EU standard contractual clauses (SCC) apply.

---

## 8. General Provisions

8.1 **Governing law.** Estonian law, without prejudice to mandatory provisions of the affiliate's country of residence.

8.2 **Modifications.** SOS Expat may modify the Terms with **30 days' notice** by email.

8.3 **Termination.** The affiliate may terminate at any time. Validated commissions remain payable.

---

## 9. Contact

For any questions about the affiliate program, contact us via the contact form or at: affiliate@sos-expat.com
`;

  const defaultContent = selectedLanguage === "fr" ? defaultFr : defaultEn;
  const parsedContent = useMemo(() => {
    const textToRender = content || defaultContent;
    return parseMarkdownContent(textToRender);
  }, [content, selectedLanguage]);

  const languageOptions: { code: SupportedLanguage; label: string; flag: string }[] = [
    { code: "fr", label: "Francais", flag: "\uD83C\uDDEB\uD83C\uDDF7" },
    { code: "en", label: "English", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
    { code: "es", label: "Espanol", flag: "\uD83C\uDDEA\uD83C\uDDF8" },
    { code: "de", label: "Deutsch", flag: "\uD83C\uDDE9\uD83C\uDDEA" },
    { code: "pt", label: "Portugues", flag: "\uD83C\uDDF5\uD83C\uDDF9" },
    { code: "ru", label: "Русский", flag: "\uD83C\uDDF7\uD83C\uDDFA" },
    { code: "hi", label: "हिन्दी", flag: "\uD83C\uDDEE\uD83C\uDDF3" },
    { code: "ch", label: "中文", flag: "\uD83C\uDDE8\uD83C\uDDF3" },
    { code: "ar", label: "العربية", flag: "\uD83C\uDDF8\uD83C\uDDE6" },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-emerald-900 to-green-900 text-white py-16 sm:py-24">
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
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100"
              >
                {index === 0 && <DollarSign className="w-6 h-6 text-emerald-600 flex-shrink-0" />}
                {index === 1 && <Shield className="w-6 h-6 text-emerald-600 flex-shrink-0" />}
                {index === 2 && <FileText className="w-6 h-6 text-emerald-600 flex-shrink-0" />}
                {index === 3 && <Users className="w-6 h-6 text-emerald-600 flex-shrink-0" />}
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
      <section className="py-16 bg-gradient-to-br from-gray-900 via-emerald-900 to-green-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Gift className="w-16 h-16 mx-auto mb-6 text-emerald-300" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.readyToJoin}</h2>
          <p className="text-lg text-emerald-100 mb-8">{t.readySubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={getLocalePath("/chatter/register")}
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

export default TermsAffiliate;
