import React, { useMemo } from "react";
import { Trash2, Mail, Clock, Shield, AlertCircle, CheckCircle } from "lucide-react";
import Layout from "../components/layout/Layout";
import SEOHead from "../components/layout/SEOHead";
import BreadcrumbSchema from "../components/seo/BreadcrumbSchema";
import { useApp } from "../contexts/AppContext";

/**
 * Public Data Deletion page.
 *
 * Required by Meta Developer (Facebook Login / Instagram API / Threads API)
 * to obtain App Review approval. Also satisfies GDPR Article 17 (right to
 * erasure) for any user — not just Meta-connected ones.
 *
 * Available in all 9 languages supported by SOS-Expat
 * (fr / en / es / de / ru / pt / ch / hi / ar).
 *
 * URL: /data-deletion (alias /suppression-donnees, /eliminacion-datos, etc.)
 *
 * Static content (no Firestore lookup) so the page always loads instantly.
 */

type Lang = "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";

interface Content {
  title: string;
  subtitle: string;
  intro: string;
  whatDataTitle: string;
  whatDataItems: string[];
  howToDeleteTitle: string;
  howToDeleteIntro: string;
  methods: { title: string; body: string }[];
  metaTitle: string;
  metaBody: string;
  timelineTitle: string;
  timelineBody: string;
  rightsTitle: string;
  rightsBody: string;
  contactTitle: string;
  contactBody: string;
  contactEmail: string;
  lastUpdatedLabel: string;
  slug: string;
}

const EMAIL = "privacy@sos-expat.com";

const CONTENT: Record<Lang, Content> = {
  fr: {
    title: "Suppression de vos données personnelles",
    subtitle: "Procédure pour demander l'effacement de toutes vos données conservées par SOS-Expat (RGPD Art. 17).",
    intro: "Conformément au Règlement Général sur la Protection des Données (RGPD), vous avez le droit de demander à tout moment la suppression complète de vos données personnelles enregistrées sur SOS-Expat.com et nos applications connectées.",
    whatDataTitle: "Quelles données sont concernées ?",
    whatDataItems: [
      "Profil utilisateur (nom, prénom, email, téléphone, pays)",
      "Historique d'appels et conversations avec les prestataires",
      "Documents téléversés (justificatifs, KYC)",
      "Avis et témoignages publiés",
      "Données de paiement (Stripe / PayPal)",
      "Cookies et identifiants de session",
      "Si connexion via Facebook / Instagram / Threads / LinkedIn / Google : nom, email, photo et identifiant social",
    ],
    howToDeleteTitle: "Comment demander la suppression",
    howToDeleteIntro: "Vous pouvez utiliser l'une des 3 méthodes suivantes :",
    methods: [
      { title: "1. Depuis votre compte (recommandé)", body: "Connectez-vous → Mon profil → Paramètres → Supprimer mon compte. Suppression immédiate." },
      { title: "2. Par email", body: `Envoyez un email à ${EMAIL} avec en objet « Demande de suppression de données ». Accusé de réception sous 48h ouvrées.` },
      { title: "3. Par courrier postal", body: `Adresse postale disponible sur demande à ${EMAIL}. Joignez une copie d'une pièce d'identité.` },
    ],
    metaTitle: "Si vous vous êtes connecté via Facebook, Instagram, Threads ou LinkedIn",
    metaBody: "Lors d'une connexion sociale, nous récupérons uniquement nom, email, photo et identifiant social. Pour supprimer ces données, suivez la procédure ci-dessus. Vous pouvez ÉGALEMENT révoquer l'accès à SOS-Expat depuis les paramètres de votre compte Facebook / Instagram / LinkedIn (« Applications connectées ») — cela supprime votre token immédiatement mais ne supprime pas votre compte SOS-Expat.",
    timelineTitle: "Délais de traitement",
    timelineBody: "Conformément à l'article 12 du RGPD, nous traitons toute demande dans un délai maximum de 30 jours. La suppression est généralement effective sous 7 jours ouvrés. Confirmation par email.",
    rightsTitle: "Vos droits annexes",
    rightsBody: `Outre la suppression, vous disposez des droits d'accès, de rectification, de portabilité, de limitation et d'opposition. Pour les exercer, écrivez à ${EMAIL}. En cas de désaccord, vous pouvez saisir la CNIL.`,
    contactTitle: "Délégué à la Protection des Données",
    contactBody: "Pour toute question, contactez notre DPO :",
    contactEmail: EMAIL,
    lastUpdatedLabel: "Dernière mise à jour",
    slug: "suppression-donnees",
  },
  en: {
    title: "Personal Data Deletion",
    subtitle: "Procedure to request the erasure of all data we hold about you (GDPR Art. 17).",
    intro: "In accordance with the General Data Protection Regulation (GDPR), you have the right to request at any time the complete deletion of your personal data stored on SOS-Expat.com and connected applications.",
    whatDataTitle: "What data is concerned?",
    whatDataItems: [
      "User profile (first name, last name, email, phone, country)",
      "Call history and conversations with providers",
      "Uploaded documents (proofs, KYC)",
      "Reviews and testimonials published",
      "Payment data (Stripe / PayPal)",
      "Cookies and session identifiers",
      "If logged in via Facebook / Instagram / Threads / LinkedIn / Google: name, email, picture, social ID",
    ],
    howToDeleteTitle: "How to request deletion",
    howToDeleteIntro: "You can use any of the 3 methods below:",
    methods: [
      { title: "1. From your account (recommended)", body: "Sign in → My profile → Settings → Delete my account. Immediate deletion." },
      { title: "2. By email", body: `Send an email to ${EMAIL} with subject \"Data deletion request\". Acknowledged within 48 working hours.` },
      { title: "3. By postal mail", body: `Postal address on request at ${EMAIL}. Include a copy of an ID for verification.` },
    ],
    metaTitle: "If you logged in via Facebook, Instagram, Threads, or LinkedIn",
    metaBody: "On social login we only retrieve: name, email, picture, social ID. To delete this data, follow the procedure above. You can ALSO revoke SOS-Expat's access from your Facebook / Instagram / LinkedIn settings (\"Connected apps\") — this removes your token immediately but does not delete your SOS-Expat account.",
    timelineTitle: "Processing timeline",
    timelineBody: "Per Article 12 GDPR, we process any request within max 30 days. Deletion is usually effective within 7 working days. Email confirmation.",
    rightsTitle: "Additional rights",
    rightsBody: `Besides deletion: access, rectification, portability, restriction, objection. To exercise: ${EMAIL}. In case of disagreement, lodge a complaint with the relevant data protection authority.`,
    contactTitle: "Data Protection Officer",
    contactBody: "For any question, contact our DPO:",
    contactEmail: EMAIL,
    lastUpdatedLabel: "Last updated",
    slug: "data-deletion",
  },
  es: {
    title: "Eliminación de datos personales",
    subtitle: "Procedimiento para solicitar la eliminación de todos los datos que conservamos sobre usted (RGPD Art. 17).",
    intro: "De acuerdo con el Reglamento General de Protección de Datos (RGPD), tiene derecho a solicitar en cualquier momento la eliminación completa de sus datos personales almacenados en SOS-Expat.com y aplicaciones conectadas.",
    whatDataTitle: "¿Qué datos están afectados?",
    whatDataItems: [
      "Perfil de usuario (nombre, apellido, email, teléfono, país)",
      "Historial de llamadas y conversaciones con proveedores",
      "Documentos subidos (justificantes, KYC)",
      "Reseñas y testimonios publicados",
      "Datos de pago (Stripe / PayPal)",
      "Cookies e identificadores de sesión",
      "Si inicia sesión vía Facebook / Instagram / Threads / LinkedIn / Google: nombre, email, foto, ID social",
    ],
    howToDeleteTitle: "Cómo solicitar la eliminación",
    howToDeleteIntro: "Puede usar uno de los 3 métodos siguientes:",
    methods: [
      { title: "1. Desde su cuenta (recomendado)", body: "Inicie sesión → Mi perfil → Configuración → Eliminar mi cuenta. Eliminación inmediata." },
      { title: "2. Por email", body: `Envíe un email a ${EMAIL} con asunto \"Solicitud de eliminación de datos\". Confirmación en 48h laborables.` },
      { title: "3. Por correo postal", body: `Dirección postal disponible bajo solicitud a ${EMAIL}. Incluya copia de identificación.` },
    ],
    metaTitle: "Si se conectó vía Facebook, Instagram, Threads o LinkedIn",
    metaBody: "En el inicio de sesión social solo recuperamos: nombre, email, foto, ID social. Para eliminar estos datos, siga el procedimiento anterior. TAMBIÉN puede revocar el acceso de SOS-Expat desde su Facebook / Instagram / LinkedIn (\"Aplicaciones conectadas\") — esto elimina el token inmediatamente.",
    timelineTitle: "Plazos de procesamiento",
    timelineBody: "Según el Artículo 12 del RGPD, procesamos toda solicitud en máximo 30 días. La eliminación es efectiva en 7 días laborables. Confirmación por email.",
    rightsTitle: "Derechos adicionales",
    rightsBody: `Además de eliminación: acceso, rectificación, portabilidad, restricción, oposición. Para ejercer: ${EMAIL}. En caso de desacuerdo, presente una queja a la AEPD u autoridad nacional.`,
    contactTitle: "Delegado de Protección de Datos",
    contactBody: "Para cualquier pregunta, contacte nuestro DPO:",
    contactEmail: EMAIL,
    lastUpdatedLabel: "Última actualización",
    slug: "eliminacion-datos",
  },
  de: {
    title: "Löschung Ihrer personenbezogenen Daten",
    subtitle: "Verfahren zur Anforderung der Löschung aller über Sie gespeicherten Daten (DSGVO Art. 17).",
    intro: "Gemäß der Datenschutz-Grundverordnung (DSGVO) haben Sie das Recht, jederzeit die vollständige Löschung Ihrer auf SOS-Expat.com und verbundenen Anwendungen gespeicherten personenbezogenen Daten zu beantragen.",
    whatDataTitle: "Welche Daten sind betroffen?",
    whatDataItems: [
      "Benutzerprofil (Vor- und Nachname, E-Mail, Telefon, Land)",
      "Anrufverlauf und Konversationen mit Anbietern",
      "Hochgeladene Dokumente (Nachweise, KYC)",
      "Veröffentlichte Bewertungen und Erfahrungsberichte",
      "Zahlungsdaten (Stripe / PayPal)",
      "Cookies und Sitzungs-IDs",
      "Bei Anmeldung via Facebook / Instagram / Threads / LinkedIn / Google: Name, E-Mail, Foto, Social-ID",
    ],
    howToDeleteTitle: "So beantragen Sie die Löschung",
    howToDeleteIntro: "Sie können eine der 3 folgenden Methoden verwenden:",
    methods: [
      { title: "1. Über Ihr Konto (empfohlen)", body: "Anmelden → Mein Profil → Einstellungen → Konto löschen. Sofortige Löschung." },
      { title: "2. Per E-Mail", body: `Senden Sie eine E-Mail an ${EMAIL} mit Betreff \"Löschungsantrag\". Bestätigung innerhalb 48 Std.` },
      { title: "3. Per Post", body: `Postadresse auf Anfrage an ${EMAIL}. Bitte Ausweiskopie beifügen.` },
    ],
    metaTitle: "Wenn Sie sich über Facebook, Instagram, Threads oder LinkedIn angemeldet haben",
    metaBody: "Bei Social Login erfassen wir nur: Name, E-Mail, Foto, Social-ID. Zur Löschung dieser Daten folgen Sie dem obigen Verfahren. Sie können den Zugriff von SOS-Expat AUCH in Ihren Facebook / Instagram / LinkedIn-Einstellungen widerrufen.",
    timelineTitle: "Bearbeitungsfristen",
    timelineBody: "Gemäß Artikel 12 DSGVO bearbeiten wir jeden Antrag innerhalb max. 30 Tagen. Die Löschung erfolgt in der Regel innerhalb 7 Werktagen. E-Mail-Bestätigung.",
    rightsTitle: "Weitere Rechte",
    rightsBody: `Neben Löschung: Auskunft, Berichtigung, Übertragbarkeit, Einschränkung, Widerspruch. Ausübung: ${EMAIL}. Bei Streitigkeiten Beschwerde bei der zuständigen Datenschutzbehörde.`,
    contactTitle: "Datenschutzbeauftragter",
    contactBody: "Bei Fragen kontaktieren Sie unseren DSB:",
    contactEmail: EMAIL,
    lastUpdatedLabel: "Letzte Aktualisierung",
    slug: "datenloeschung",
  },
  ru: {
    title: "Удаление ваших персональных данных",
    subtitle: "Процедура запроса удаления всех данных о вас (GDPR Ст. 17).",
    intro: "В соответствии с Общим регламентом по защите данных (GDPR) вы имеете право в любое время запросить полное удаление ваших персональных данных, хранящихся на SOS-Expat.com и связанных приложениях.",
    whatDataTitle: "Какие данные затронуты?",
    whatDataItems: [
      "Профиль пользователя (имя, фамилия, email, телефон, страна)",
      "История звонков и разговоров с поставщиками",
      "Загруженные документы (подтверждения, KYC)",
      "Отзывы и свидетельства",
      "Платёжные данные (Stripe / PayPal)",
      "Cookies и идентификаторы сессии",
      "При входе через Facebook / Instagram / Threads / LinkedIn / Google: имя, email, фото, соц. ID",
    ],
    howToDeleteTitle: "Как запросить удаление",
    howToDeleteIntro: "Вы можете использовать один из 3 методов:",
    methods: [
      { title: "1. Из вашего аккаунта (рекомендуется)", body: "Войти → Мой профиль → Настройки → Удалить аккаунт. Немедленное удаление." },
      { title: "2. По email", body: `Отправьте email на ${EMAIL} с темой \"Запрос на удаление данных\". Подтверждение в течение 48ч.` },
      { title: "3. Почтой", body: `Почтовый адрес по запросу на ${EMAIL}. Приложите копию удостоверения личности.` },
    ],
    metaTitle: "Если вы вошли через Facebook, Instagram, Threads или LinkedIn",
    metaBody: "При социальном входе мы получаем только: имя, email, фото, соц. ID. Для удаления этих данных следуйте процедуре выше. ТАКЖЕ можете отозвать доступ SOS-Expat в настройках Facebook / Instagram / LinkedIn.",
    timelineTitle: "Сроки обработки",
    timelineBody: "Согласно Статье 12 GDPR, мы обрабатываем любой запрос в течение макс. 30 дней. Удаление обычно эффективно за 7 рабочих дней. Подтверждение по email.",
    rightsTitle: "Дополнительные права",
    rightsBody: `Помимо удаления: доступ, исправление, переносимость, ограничение, возражение. Для реализации: ${EMAIL}. При несогласии можете подать жалобу в надзорный орган.`,
    contactTitle: "Сотрудник по защите данных",
    contactBody: "По любым вопросам обращайтесь к нашему DPO:",
    contactEmail: EMAIL,
    lastUpdatedLabel: "Последнее обновление",
    slug: "udalenie-dannykh",
  },
  pt: {
    title: "Eliminação dos seus dados pessoais",
    subtitle: "Procedimento para solicitar a eliminação de todos os dados que mantemos sobre você (RGPD Art. 17).",
    intro: "De acordo com o Regulamento Geral de Proteção de Dados (RGPD), você tem o direito de solicitar a qualquer momento a eliminação completa dos seus dados pessoais armazenados no SOS-Expat.com e aplicações conectadas.",
    whatDataTitle: "Quais dados são afetados?",
    whatDataItems: [
      "Perfil de usuário (nome, sobrenome, email, telefone, país)",
      "Histórico de chamadas e conversas com prestadores",
      "Documentos enviados (comprovantes, KYC)",
      "Avaliações e depoimentos publicados",
      "Dados de pagamento (Stripe / PayPal)",
      "Cookies e identificadores de sessão",
      "Se logado via Facebook / Instagram / Threads / LinkedIn / Google: nome, email, foto, ID social",
    ],
    howToDeleteTitle: "Como solicitar a eliminação",
    howToDeleteIntro: "Você pode usar um dos 3 métodos abaixo:",
    methods: [
      { title: "1. Da sua conta (recomendado)", body: "Faça login → Meu perfil → Configurações → Excluir minha conta. Eliminação imediata." },
      { title: "2. Por email", body: `Envie um email para ${EMAIL} com assunto \"Solicitação de exclusão de dados\". Confirmação em 48h úteis.` },
      { title: "3. Por correio", body: `Endereço postal sob solicitação a ${EMAIL}. Inclua cópia de identidade.` },
    ],
    metaTitle: "Se você entrou via Facebook, Instagram, Threads ou LinkedIn",
    metaBody: "No login social só recuperamos: nome, email, foto, ID social. Para excluir, siga o procedimento acima. TAMBÉM pode revogar o acesso de SOS-Expat nas configurações do Facebook / Instagram / LinkedIn.",
    timelineTitle: "Prazos de processamento",
    timelineBody: "Conforme Artigo 12 do RGPD, processamos qualquer solicitação em máx. 30 dias. Eliminação geralmente em 7 dias úteis. Confirmação por email.",
    rightsTitle: "Direitos adicionais",
    rightsBody: `Além da exclusão: acesso, retificação, portabilidade, restrição, oposição. Para exercer: ${EMAIL}. Em caso de desacordo, queixa à autoridade nacional de proteção de dados.`,
    contactTitle: "Encarregado de Proteção de Dados",
    contactBody: "Para qualquer questão, contacte nosso DPO:",
    contactEmail: EMAIL,
    lastUpdatedLabel: "Última atualização",
    slug: "exclusao-dados",
  },
  ch: {
    title: "删除您的个人数据",
    subtitle: "申请删除我们关于您所有数据的程序（GDPR 第17条）。",
    intro: "根据《通用数据保护条例》(GDPR)，您有权随时要求完全删除存储在 SOS-Expat.com 及相关应用程序中的个人数据。",
    whatDataTitle: "涉及哪些数据？",
    whatDataItems: [
      "用户资料（姓名、邮箱、电话、国家）",
      "通话记录及与服务商的对话",
      "上传的文件（证明、KYC）",
      "已发布的评论和证言",
      "支付数据（Stripe / PayPal）",
      "Cookies 及会话标识",
      "如通过 Facebook / Instagram / Threads / LinkedIn / Google 登录：姓名、邮箱、照片、社交ID",
    ],
    howToDeleteTitle: "如何申请删除",
    howToDeleteIntro: "您可以使用以下3种方法之一：",
    methods: [
      { title: "1. 从您的账户（推荐）", body: "登录 → 我的资料 → 设置 → 删除我的账户。立即删除。" },
      { title: "2. 通过邮件", body: `发送邮件至 ${EMAIL}，主题为「数据删除请求」。48工作小时内确认。` },
      { title: "3. 通过邮政", body: `邮政地址应要求 ${EMAIL} 提供。请附身份证件副本。` },
    ],
    metaTitle: "如果您通过 Facebook、Instagram、Threads 或 LinkedIn 登录",
    metaBody: "社交登录时我们仅获取：姓名、邮箱、照片、社交ID。要删除这些数据，请按上述程序操作。您也可以从 Facebook / Instagram / LinkedIn 设置中撤销 SOS-Expat 访问权限。",
    timelineTitle: "处理时限",
    timelineBody: "根据 GDPR 第12条，我们在最长30天内处理任何请求。删除通常在7个工作日内生效。邮件确认。",
    rightsTitle: "其他权利",
    rightsBody: `除删除外：访问、更正、可携带性、限制、反对。行使权利：${EMAIL}。如有异议，可向相关数据保护机构投诉。`,
    contactTitle: "数据保护官",
    contactBody: "如有任何问题，请联系我们的DPO：",
    contactEmail: EMAIL,
    lastUpdatedLabel: "最后更新",
    slug: "shanchu-shuju",
  },
  hi: {
    title: "आपके व्यक्तिगत डेटा का विलोपन",
    subtitle: "आपके बारे में हमारे पास मौजूद सभी डेटा को मिटाने का अनुरोध करने की प्रक्रिया (GDPR अनुच्छेद 17)।",
    intro: "सामान्य डेटा संरक्षण विनियमन (GDPR) के अनुसार, आपको SOS-Expat.com और संबंधित ऐप्लिकेशन में संग्रहीत अपने व्यक्तिगत डेटा को किसी भी समय पूरी तरह से हटाने का अनुरोध करने का अधिकार है।",
    whatDataTitle: "कौन से डेटा प्रभावित हैं?",
    whatDataItems: [
      "उपयोगकर्ता प्रोफ़ाइल (नाम, ईमेल, फ़ोन, देश)",
      "कॉल इतिहास और सेवा प्रदाताओं से बातचीत",
      "अपलोड किए गए दस्तावेज़ (प्रमाण, KYC)",
      "प्रकाशित समीक्षाएँ और प्रशंसापत्र",
      "भुगतान डेटा (Stripe / PayPal)",
      "कुकीज़ और सत्र पहचानकर्ता",
      "Facebook / Instagram / Threads / LinkedIn / Google के माध्यम से लॉगिन करने पर: नाम, ईमेल, फ़ोटो, सामाजिक ID",
    ],
    howToDeleteTitle: "विलोपन का अनुरोध कैसे करें",
    howToDeleteIntro: "आप नीचे दिए गए 3 तरीकों में से किसी का भी उपयोग कर सकते हैं:",
    methods: [
      { title: "1. अपने खाते से (अनुशंसित)", body: "साइन इन करें → मेरी प्रोफ़ाइल → सेटिंग्स → मेरा खाता हटाएँ। तत्काल विलोपन।" },
      { title: "2. ईमेल द्वारा", body: `विषय \"डेटा विलोपन अनुरोध\" के साथ ${EMAIL} पर ईमेल भेजें। 48 कार्य घंटों में पावती।` },
      { title: "3. डाक द्वारा", body: `डाक पता ${EMAIL} पर अनुरोध पर उपलब्ध। पहचान पत्र की प्रति संलग्न करें।` },
    ],
    metaTitle: "यदि आपने Facebook, Instagram, Threads या LinkedIn के माध्यम से लॉगिन किया है",
    metaBody: "सामाजिक लॉगिन पर हम केवल नाम, ईमेल, फ़ोटो, सामाजिक ID प्राप्त करते हैं। इन्हें हटाने के लिए, ऊपर की प्रक्रिया का पालन करें। आप Facebook / Instagram / LinkedIn सेटिंग्स से SOS-Expat की पहुँच भी रद्द कर सकते हैं।",
    timelineTitle: "प्रसंस्करण समयसीमा",
    timelineBody: "GDPR अनुच्छेद 12 के अनुसार, हम अधिकतम 30 दिनों के भीतर किसी भी अनुरोध को संसाधित करते हैं। विलोपन आमतौर पर 7 कार्य दिवसों के भीतर प्रभावी होता है।",
    rightsTitle: "अतिरिक्त अधिकार",
    rightsBody: `विलोपन के अलावा: पहुँच, सुधार, पोर्टेबिलिटी, प्रतिबंध, आपत्ति। उपयोग करने के लिए: ${EMAIL}। असहमति के मामले में, संबंधित डेटा संरक्षण प्राधिकरण को शिकायत करें।`,
    contactTitle: "डेटा संरक्षण अधिकारी",
    contactBody: "किसी भी प्रश्न के लिए, हमारे DPO से संपर्क करें:",
    contactEmail: EMAIL,
    lastUpdatedLabel: "अंतिम अपडेट",
    slug: "data-vilopan",
  },
  ar: {
    title: "حذف بياناتك الشخصية",
    subtitle: "إجراء طلب حذف جميع البيانات التي نحتفظ بها عنك (المادة 17 من اللائحة العامة لحماية البيانات).",
    intro: "وفقًا للائحة العامة لحماية البيانات (GDPR)، يحق لك في أي وقت طلب الحذف الكامل لبياناتك الشخصية المخزنة على SOS-Expat.com والتطبيقات المتصلة.",
    whatDataTitle: "ما هي البيانات المعنية؟",
    whatDataItems: [
      "ملف المستخدم (الاسم، البريد الإلكتروني، الهاتف، البلد)",
      "سجل المكالمات والمحادثات مع مقدمي الخدمات",
      "المستندات المحملة (الإثباتات، KYC)",
      "المراجعات والشهادات المنشورة",
      "بيانات الدفع (Stripe / PayPal)",
      "ملفات تعريف الارتباط ومعرفات الجلسة",
      "إذا قمت بتسجيل الدخول عبر Facebook / Instagram / Threads / LinkedIn / Google: الاسم، البريد، الصورة، المعرف الاجتماعي",
    ],
    howToDeleteTitle: "كيفية طلب الحذف",
    howToDeleteIntro: "يمكنك استخدام إحدى الطرق الثلاث التالية:",
    methods: [
      { title: "1. من حسابك (موصى به)", body: "تسجيل الدخول → ملفي الشخصي → الإعدادات → حذف حسابي. حذف فوري." },
      { title: "2. عبر البريد الإلكتروني", body: `أرسل بريدًا إلى ${EMAIL} بعنوان \"طلب حذف البيانات\". تأكيد خلال 48 ساعة عمل.` },
      { title: "3. عبر البريد العادي", body: `العنوان البريدي متاح عند الطلب على ${EMAIL}. أرفق نسخة من بطاقة الهوية.` },
    ],
    metaTitle: "إذا قمت بتسجيل الدخول عبر Facebook أو Instagram أو Threads أو LinkedIn",
    metaBody: "عند تسجيل الدخول الاجتماعي نسترجع فقط: الاسم، البريد، الصورة، المعرف الاجتماعي. لحذف هذه البيانات، اتبع الإجراء أعلاه. يمكنك أيضًا إلغاء وصول SOS-Expat من إعدادات Facebook / Instagram / LinkedIn.",
    timelineTitle: "مهلة المعالجة",
    timelineBody: "وفقًا للمادة 12 من GDPR، نعالج أي طلب خلال 30 يومًا كحد أقصى. الحذف عادة فعال خلال 7 أيام عمل. تأكيد بالبريد الإلكتروني.",
    rightsTitle: "الحقوق الإضافية",
    rightsBody: `بالإضافة إلى الحذف: الوصول، التصحيح، النقل، التقييد، الاعتراض. للممارسة: ${EMAIL}. في حال الخلاف، يمكنك تقديم شكوى للسلطة المختصة بحماية البيانات.`,
    contactTitle: "مسؤول حماية البيانات",
    contactBody: "لأي سؤال، اتصل بمسؤول حماية البيانات لدينا:",
    contactEmail: EMAIL,
    lastUpdatedLabel: "آخر تحديث",
    slug: "hadhf-albayanat",
  },
};

const ICONS = [Trash2, Mail, Shield];

const DataDeletion: React.FC = () => {
  const { language } = useApp();
  const lang: Lang = (Object.keys(CONTENT) as Lang[]).includes(language as Lang)
    ? (language as Lang)
    : "fr";
  const c = CONTENT[lang];
  const lastUpdated = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isRtl = lang === "ar";

  return (
    <Layout>
      <SEOHead
        title={`${c.title} | SOS-Expat`}
        description={c.subtitle}
        canonicalUrl={`https://sos-expat.com/${c.slug}`}
      />
      <BreadcrumbSchema
        items={[
          { name: "SOS-Expat", url: "https://sos-expat.com/" },
          { name: c.title, url: `https://sos-expat.com/${c.slug}` },
        ]}
      />

      <div className="bg-gradient-to-b from-red-50 to-white py-12 sm:py-16" dir={isRtl ? "rtl" : "ltr"}>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{c.title}</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{c.subtitle}</p>
            <p className="text-xs text-gray-400 mt-3 inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {c.lastUpdatedLabel} : {lastUpdated}
            </p>
          </div>

          {/* Intro */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
            <p className="text-gray-700 leading-relaxed">{c.intro}</p>
          </div>

          {/* Data concerned */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" /> {c.whatDataTitle}
            </h2>
            <ul className="space-y-2">
              {c.whatDataItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* How to delete */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{c.howToDeleteTitle}</h2>
            <p className="text-gray-600 mb-6">{c.howToDeleteIntro}</p>
            <div className="space-y-4">
              {c.methods.map((m, i) => {
                const Icon = ICONS[i] ?? Mail;
                return (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 hover:border-red-200 transition-colors">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Icon className="w-5 h-5 text-red-600" /> {m.title}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{m.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Meta-specific note */}
          <section className="bg-blue-50 border border-blue-200 rounded-xl p-6 sm:p-8 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> {c.metaTitle}
            </h2>
            <p className="text-sm text-blue-800 leading-relaxed">{c.metaBody}</p>
          </section>

          {/* Timeline */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" /> {c.timelineTitle}
            </h2>
            <p className="text-gray-700 leading-relaxed">{c.timelineBody}</p>
          </section>

          {/* Other rights */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{c.rightsTitle}</h2>
            <p className="text-gray-700 leading-relaxed">{c.rightsBody}</p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl p-6 sm:p-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5" /> {c.contactTitle}
            </h2>
            <p className="mb-4 text-red-50">{c.contactBody}</p>
            <a
              href={`mailto:${c.contactEmail}`}
              className="inline-flex items-center gap-2 bg-white text-red-600 font-semibold px-5 py-2.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Mail className="w-4 h-4" /> {c.contactEmail}
            </a>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default DataDeletion;
