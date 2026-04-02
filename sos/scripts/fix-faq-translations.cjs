#!/usr/bin/env node
/**
 * fix-faq-translations.cjs
 *
 * Corrige les traductions FAQ corrompues dans la collection `app_faq`.
 * Traductions écrites directement (pas d'API externe).
 *
 * Usage:
 *   node fix-faq-translations.cjs            (live)
 *   node fix-faq-translations.cjs --dry-run  (aperçu)
 */

'use strict';

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const app = initializeApp({ projectId: 'sos-urgently-ac307' });
const db = getFirestore(app);

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Traductions complètes ───────────────────────────────────────────────────

const TRANSLATIONS = {

  // ── 1. Comment fonctionne la plateforme ? ────────────────────────────────
  lAmf1KxzUBjblqoT8g2j: {
    en: {
      question: 'How does the SOS-Expat platform work?',
      answer: `SOS-Expat connects you with providers for a quick initial consultation:

1. Create your free account
2. Choose a provider (lawyer at €49/20min or expat helper at €19/30min)
3. Make a one-time payment (provider fee + connection service fee)
4. Get connected immediately by phone
5. Rate your provider after the call

These calls are designed to provide initial assistance. Any further case management or collaboration continues directly with the provider, outside the platform.`,
      slug: 'how-does-sos-expat-platform-work',
    },
    es: {
      question: '¿Cómo funciona la plataforma SOS-Expat?',
      answer: `SOS-Expat te conecta con proveedores para un primer contacto de ayuda rápida:

1. Crea tu cuenta gratis
2. Elige un proveedor (abogado a 49€/20min o expat colaborador a 19€/30min)
3. Realiza un pago único (remuneración del proveedor + tarifa de intermediación)
4. Conéctate inmediatamente por teléfono
5. Valora a tu proveedor después de la llamada

Estas llamadas están diseñadas para brindar una primera ayuda. Cualquier apertura de expediente o colaboración continúa directamente con el proveedor, fuera de la plataforma.`,
      slug: 'como-funciona-la-plataforma-sos-expat',
    },
    de: {
      question: 'Wie funktioniert die SOS-Expat-Plattform?',
      answer: `SOS-Expat verbindet Sie mit Anbietern für eine schnelle erste Kontaktaufnahme:

1. Erstellen Sie kostenlos Ihr Konto
2. Wählen Sie einen Anbieter (Anwalt für 49€/20min oder Expat-Helfer für 19€/30min)
3. Leisten Sie eine einmalige Zahlung (Vergütung des Anbieters + Vermittlungsgebühr)
4. Werden Sie sofort telefonisch verbunden
5. Bewerten Sie Ihren Anbieter nach dem Gespräch

Diese Anrufe sind darauf ausgelegt, erste Hilfe zu leisten. Jede weitere Fallbearbeitung oder Zusammenarbeit erfolgt direkt mit dem Anbieter, außerhalb der Plattform.`,
      slug: 'wie-funktioniert-die-sos-expat-plattform',
    },
    pt: {
      question: 'Como funciona a plataforma SOS-Expat?',
      answer: `A SOS-Expat conecta você com prestadores para um primeiro contato de ajuda rápida:

1. Crie sua conta gratuitamente
2. Escolha um prestador (advogado a 49€/20min ou expat assistente a 19€/30min)
3. Faça um pagamento único (remuneração do prestador + taxa de intermediação)
4. Seja conectado imediatamente por telefone
5. Avalie seu prestador após a chamada

Essas chamadas são projetadas para fornecer uma primeira assistência. Qualquer abertura de processo ou colaboração continua diretamente com o prestador, fora da plataforma.`,
      slug: 'como-funciona-a-plataforma-sos-expat',
    },
    ru: {
      question: 'Как работает платформа SOS-Expat?',
      answer: `SOS-Expat соединяет вас с провайдерами для быстрой первичной консультации:

1. Создайте бесплатную учётную запись
2. Выберите провайдера (юрист за 49€/20мин или экспат-помощник за 19€/30мин)
3. Совершите единовременный платёж (вознаграждение провайдера + сервисный сбор)
4. Мгновенно свяжитесь по телефону
5. Оцените провайдера после звонка

Эти звонки предназначены для первичной помощи. Любое дальнейшее ведение дела или сотрудничество продолжается непосредственно с провайдером, за пределами платформы.`,
      slug: 'ru-kak-rabotaet-platforma-sos-expat',
    },
    ch: {
      question: 'SOS-Expat平台是如何运作的？',
      answer: `SOS-Expat将您与服务提供商联系，提供快速的初步咨询：

1. 免费创建您的账户
2. 选择服务提供商（律师49€/20分钟，或海外华人助手19€/30分钟）
3. 进行一次性付款（服务提供商报酬+中介费）
4. 立即通过电话建立联系
5. 通话结束后对您的服务提供商进行评价

这些通话旨在提供初步帮助。任何进一步的案件处理或合作均直接与服务提供商进行，在平台之外完成。`,
      slug: 'zh-how-does-sos-expat-platform-work',
    },
    hi: {
      question: 'SOS-Expat प्लेटफ़ॉर्म कैसे काम करता है?',
      answer: `SOS-Expat आपको त्वरित प्रारंभिक सहायता के लिए सेवा प्रदाताओं से जोड़ता है:

1. अपना निःशुल्क खाता बनाएं
2. एक सेवा प्रदाता चुनें (वकील 49€/20मिनट या प्रवासी सहायक 19€/30मिनट)
3. एकमुश्त भुगतान करें (सेवा प्रदाता शुल्क + संयोजन शुल्क)
4. तुरंत फोन पर जुड़ें
5. कॉल के बाद अपने सेवा प्रदाता को रेट करें

ये कॉल प्रारंभिक सहायता प्रदान करने के लिए डिज़ाइन की गई हैं। किसी भी आगे की कार्यवाही या सहयोग सीधे सेवा प्रदाता के साथ, प्लेटफ़ॉर्म के बाहर जारी रहती है।`,
      slug: 'hi-sos-expat-platform-kaise-kaam-karta-hai',
    },
    ar: {
      question: 'كيف تعمل منصة SOS-Expat؟',
      answer: `تربطك SOS-Expat بمقدمي الخدمات للحصول على مساعدة سريعة في أول اتصال:

1. أنشئ حسابك مجاناً
2. اختر مقدم الخدمة (محامٍ بسعر 49€/20دقيقة أو مساعد مغترب بسعر 19€/30دقيقة)
3. أجرِ دفعة واحدة (أتعاب مقدم الخدمة + رسوم الوساطة)
4. تواصل فوراً عبر الهاتف
5. قيّم مقدم الخدمة بعد المكالمة

صُمِّمت هذه المكالمات لتقديم مساعدة أولية سريعة. أي متابعة أو فتح ملف تُجرى مباشرةً مع مقدم الخدمة، خارج المنصة.`,
      slug: 'ar-how-does-sos-expat-platform-work',
    },
  },

  // ── 2. Quelle différence entre avocat et expat aidant ? ──────────────────
  LR7rmq5ZzCXXeM8sZYOQ: {
    en: {
      question: 'What is the difference between a lawyer and an expat helper?',
      answer: `SOS-Expat offers a quick first contact with two types of providers:

• Lawyer (€49 / 20 min): Licensed legal professional registered with the bar. Initial legal advice on contracts, disputes, immigration, labor law...

• Expat Helper (€19 / 30 min): An experienced expat living in your destination country. Practical advice on administrative procedures, housing, local culture...

These calls provide initial rapid assistance. If follow-up or case management is needed, this is handled directly between you and the provider, outside the SOS-Expat platform.`,
      slug: 'difference-between-lawyer-and-expat-helper',
    },
    es: {
      question: '¿Qué diferencia hay entre un abogado y un expat colaborador?',
      answer: `SOS-Expat ofrece un primer contacto rápido con dos tipos de proveedores:

• Abogado (49€ / 20 min): Profesional del derecho titulado, colegiado. Primer consejo jurídico sobre contratos, litigios, inmigración, derecho laboral...

• Expat Colaborador (19€ / 30 min): Expatriado con experiencia viviendo en tu país de destino. Primeros consejos prácticos sobre trámites administrativos, vivienda, cultura local...

Estas llamadas constituyen una primera ayuda rápida. Si se necesita seguimiento o apertura de expediente, se realiza directamente entre usted y el proveedor, fuera de la plataforma SOS-Expat.`,
      slug: 'diferencia-abogado-expat-colaborador',
    },
    de: {
      question: 'Was ist der Unterschied zwischen einem Anwalt und einem Expat-Helfer?',
      answer: `SOS-Expat bietet einen schnellen Erstkontakt mit zwei Arten von Anbietern:

• Anwalt (49€ / 20 Min.): Zugelassener Rechtsanwalt, Mitglied der Anwaltskammer. Erste Rechtsberatung zu Verträgen, Streitigkeiten, Einwanderung, Arbeitsrecht...

• Expat-Helfer (19€ / 30 Min.): Erfahrener Expat, der in Ihrem Zielland lebt. Erste praktische Ratschläge zu Behördengängen, Wohnungssuche, lokaler Kultur...

Diese Gespräche sind eine erste schnelle Hilfe. Falls eine weitere Begleitung oder Fallbearbeitung nötig ist, erfolgt dies direkt zwischen Ihnen und dem Anbieter, außerhalb der SOS-Expat-Plattform.`,
      slug: 'unterschied-anwalt-expat-helfer',
    },
    pt: {
      question: 'Qual é a diferença entre um advogado e um expat assistente?',
      answer: `A SOS-Expat oferece um primeiro contato rápido com dois tipos de prestadores:

• Advogado (49€ / 20 min): Profissional do direito diplomado, inscrito na ordem. Primeiro conselho jurídico sobre contratos, litígios, imigração, direito do trabalho...

• Expat Assistente (19€ / 30 min): Expatriado experiente vivendo no seu país de destino. Primeiros conselhos práticos sobre procedimentos administrativos, habitação, cultura local...

Essas chamadas constituem uma primeira ajuda rápida. Se for necessário acompanhamento ou abertura de processo, isso é feito diretamente entre você e o prestador, fora da plataforma SOS-Expat.`,
      slug: 'diferenca-advogado-expat-assistente',
    },
    ru: {
      question: 'В чём разница между юристом и экспат-помощником?',
      answer: `SOS-Expat предлагает быстрый первый контакт с двумя типами провайдеров:

• Юрист (49€ / 20 мин): дипломированный правовой специалист, член адвокатской коллегии. Первичная юридическая консультация по контрактам, спорам, иммиграции, трудовому праву...

• Экспат-помощник (19€ / 30 мин): опытный экспатриант, живущий в стране вашего назначения. Практические советы по административным процедурам, жилью, местной культуре...

Эти звонки являются первичной быстрой помощью. Если требуется дальнейшее ведение дела, это осуществляется напрямую между вами и провайдером, вне платформы SOS-Expat.`,
      slug: 'ru-raznitsa-yurist-ekspat-pomoshnik',
    },
    ch: {
      question: '律师和海外华人助手有什么区别？',
      answer: `SOS-Expat提供与两种类型服务提供商的快速初次联系：

• 律师（49€ / 20分钟）：持有执照的法律专业人士，已在律师协会注册。关于合同、纠纷、移民、劳动法等的初步法律建议...

• 海外华人助手（19€ / 30分钟）：居住在您目的地国家的有经验的海外华人。关于行政手续、住房、当地文化的实用建议...

这些通话构成快速的初步帮助。如果需要进一步的跟进或开立案件，这将直接在您与服务提供商之间进行，在SOS-Expat平台之外。`,
      slug: 'zh-difference-lawyer-expat-helper',
    },
    hi: {
      question: 'वकील और प्रवासी सहायक में क्या अंतर है?',
      answer: `SOS-Expat दो प्रकार के सेवा प्रदाताओं के साथ त्वरित पहली संपर्क प्रदान करता है:

• वकील (49€ / 20 मिनट): डिप्लोमा प्राप्त कानूनी पेशेवर, बार में पंजीकृत। अनुबंध, विवाद, आव्रजन, श्रम कानून पर प्रारंभिक कानूनी सलाह...

• प्रवासी सहायक (19€ / 30 मिनट): आपके गंतव्य देश में रहने वाला अनुभवी प्रवासी। प्रशासनिक प्रक्रियाओं, आवास, स्थानीय संस्कृति पर व्यावहारिक सलाह...

ये कॉल प्रारंभिक त्वरित सहायता के रूप में कार्य करती हैं। यदि किसी मामले की आगे की जरूरत हो, तो यह सीधे आपके और सेवा प्रदाता के बीच, SOS-Expat प्लेटफ़ॉर्म के बाहर किया जाता है।`,
      slug: 'hi-vakil-aur-pravasi-sahayak-mein-antar',
    },
    ar: {
      question: 'ما الفرق بين المحامي والمساعد المغترب؟',
      answer: `تقدم SOS-Expat أول اتصال سريع مع نوعين من مقدمي الخدمات:

• محامٍ (49€ / 20 دقيقة): متخصص قانوني مؤهَّل، مسجَّل في نقابة المحامين. استشارة قانونية أولية حول العقود والنزاعات والهجرة وقانون العمل...

• مساعد مغترب (19€ / 30 دقيقة): مغترب ذو خبرة يقيم في بلد وجهتك. نصائح عملية حول الإجراءات الإدارية والسكن والثقافة المحلية...

تشكّل هذه المكالمات مساعدة أولية سريعة. إن احتجت إلى متابعة أو فتح ملف، يتم ذلك مباشرةً بينك وبين مقدم الخدمة، خارج منصة SOS-Expat.`,
      slug: 'ar-difference-lawyer-expat-helper',
    },
  },

  // ── 3. Comment devenir prestataire ? ────────────────────────────────────
  n5ZC58RwHnJ8htcYgQVs: {
    en: {
      question: 'How do I become a provider on SOS-Expat?',
      answer: `SOS-Expat is a platform connecting expats, travelers, and vacationers from around the world with providers for quick initial consultations.

1. Click "Become a provider"
2. Choose your profile: Lawyer or Expat Helper
3. Fill in the form with your information
4. Upload the required documents (diploma for lawyers, proof of residence for expats)
5. Complete identity verification (KYC)
6. Wait for validation (usually 24–48h)

Important: Rates are set by SOS-Expat (€49/20min for lawyers, €19/30min for expats). You don't set your own rates.`,
      slug: 'how-to-become-a-provider-on-sos-expat',
    },
    es: {
      question: '¿Cómo convertirme en proveedor en SOS-Expat?',
      answer: `SOS-Expat es una plataforma de intermediación para primeros contactos rápidos con expatriados, viajeros y turistas de todo el mundo.

1. Haz clic en "Convertirme en proveedor"
2. Elige tu perfil: Abogado o Expat Colaborador
3. Rellena el formulario con tus datos
4. Sube los documentos requeridos (título para abogados, prueba de residencia para expats)
5. Completa la verificación de identidad (KYC)
6. Espera la validación (generalmente 24–48h)

Nota importante: Las tarifas son fijadas por SOS-Expat (49€/20min para abogados, 19€/30min para expats). No tienes que fijar tus propias tarifas.`,
      slug: 'como-convertirme-en-proveedor-sos-expat',
    },
    de: {
      question: 'Wie werde ich Anbieter bei SOS-Expat?',
      answer: `SOS-Expat ist eine Vermittlungsplattform für schnelle erste Kontakte mit Expatriates, Reisenden und Urlaubern aus aller Welt.

1. Klicken Sie auf „Anbieter werden"
2. Wählen Sie Ihr Profil: Anwalt oder Expat-Helfer
3. Füllen Sie das Formular mit Ihren Daten aus
4. Laden Sie die erforderlichen Dokumente hoch (Abschluss für Anwälte, Wohnsitznachweis für Expats)
5. Schließen Sie die Identitätsprüfung (KYC) ab
6. Warten Sie auf die Freischaltung (in der Regel 24–48h)

Wichtiger Hinweis: Die Preise werden von SOS-Expat festgelegt (49€/20min für Anwälte, 19€/30min für Expats). Sie legen keine eigenen Preise fest.`,
      slug: 'wie-werde-ich-anbieter-bei-sos-expat',
    },
    pt: {
      question: 'Como me tornar prestador no SOS-Expat?',
      answer: `A SOS-Expat é uma plataforma de intermediação para primeiros contatos rápidos com expatriados, viajantes e turistas de todo o mundo.

1. Clique em "Tornar-me prestador"
2. Escolha seu perfil: Advogado ou Expat Assistente
3. Preencha o formulário com suas informações
4. Faça o upload dos documentos necessários (diploma para advogados, comprovante de residência para expats)
5. Complete a verificação de identidade (KYC)
6. Aguarde a validação (geralmente 24–48h)

Nota importante: As tarifas são definidas pela SOS-Expat (49€/20min para advogados, 19€/30min para expats). Você não define suas próprias tarifas.`,
      slug: 'como-tornar-se-prestador-sos-expat',
    },
    ru: {
      question: 'Как стать провайдером на SOS-Expat?',
      answer: `SOS-Expat — платформа посредничества для быстрых первых контактов с экспатриантами, путешественниками и туристами со всего мира.

1. Нажмите «Стать провайдером»
2. Выберите свой профиль: Юрист или Экспат-помощник
3. Заполните форму со своими данными
4. Загрузите необходимые документы (диплом для юристов, подтверждение места жительства для экспатриантов)
5. Пройдите проверку личности (KYC)
6. Дождитесь подтверждения (обычно 24–48ч)

Важное примечание: тарифы устанавливаются SOS-Expat (49€/20мин для юристов, 19€/30мин для экспатриантов). Вы не устанавливаете собственные тарифы.`,
      slug: 'ru-kak-stat-provajderom-sos-expat',
    },
    ch: {
      question: '如何在SOS-Expat上成为服务提供商？',
      answer: `SOS-Expat是一个将来自世界各地的海外华人、旅行者和度假者与服务提供商进行快速初次联系的中介平台。

1. 点击"成为服务提供商"
2. 选择您的身份：律师或海外华人助手
3. 填写包含您信息的表格
4. 上传所需文件（律师需要文凭，海外华人需要居住证明）
5. 完成身份验证（KYC）
6. 等待审核通过（通常24–48小时）

重要提示：费率由SOS-Expat设定（律师49€/20分钟，海外华人19€/30分钟）。您无需设定自己的费率。`,
      slug: 'zh-how-to-become-provider-sos-expat',
    },
    hi: {
      question: 'SOS-Expat पर सेवा प्रदाता कैसे बनें?',
      answer: `SOS-Expat दुनिया भर के प्रवासियों, यात्रियों और पर्यटकों के साथ त्वरित प्रारंभिक संपर्क के लिए एक मध्यस्थ प्लेटफ़ॉर्म है।

1. "सेवा प्रदाता बनें" पर क्लिक करें
2. अपना प्रोफाइल चुनें: वकील या प्रवासी सहायक
3. अपनी जानकारी के साथ फ़ॉर्म भरें
4. आवश्यक दस्तावेज़ अपलोड करें (वकीलों के लिए डिप्लोमा, प्रवासियों के लिए निवास प्रमाण)
5. पहचान सत्यापन (KYC) पूरा करें
6. अनुमोदन की प्रतीक्षा करें (आमतौर पर 24–48 घंटे)

महत्वपूर्ण: दरें SOS-Expat द्वारा निर्धारित की जाती हैं (वकीलों के लिए 49€/20मिनट, प्रवासियों के लिए 19€/30मिनट)। आप अपनी दरें नहीं निर्धारित करते।`,
      slug: 'hi-sos-expat-par-seva-pradaata-kaise-bane',
    },
    ar: {
      question: 'كيف أصبح مقدم خدمة على SOS-Expat؟',
      answer: `SOS-Expat منصة وساطة لأول اتصالات سريعة مع المغتربين والمسافرين والسياح من جميع أنحاء العالم.

1. انقر على "أصبح مقدم خدمة"
2. اختر ملفك الشخصي: محامٍ أو مساعد مغترب
3. املأ النموذج بمعلوماتك
4. ارفع المستندات المطلوبة (شهادة للمحامين، إثبات إقامة للمغتربين)
5. أكمل التحقق من الهوية (KYC)
6. انتظر التحقق (عادةً 24–48 ساعة)

ملاحظة مهمة: تُحدَّد الأسعار من قِبَل SOS-Expat (49€/20دقيقة للمحامين، 19€/30دقيقة للمغتربين). لا تحتاج إلى تحديد أسعارك الخاصة.`,
      slug: 'ar-how-to-become-provider-sos-expat',
    },
  },

  // ── 4. Comment suis-je payé ? ─────────────────────────────────────────────
  // Note: questions ES, AR, CH étaient aussi corrompues → toutes recréées
  djFVhpxAeNQDSE0YZ5SG: {
    en: {
      question: 'How do I get paid on SOS-Expat?',
      answer: `Payments are processed via Stripe Connect:
• After each successful call, your earnings are credited to your Stripe account
• Rates are set by SOS-Expat: €49 (20 min) for lawyers, €19 (30 min) for expat helpers
• The client makes a single payment, split between your earnings and SOS-Expat's connection fee
• Only Stripe fees (~2.9%) are deducted from your share
• Automatic transfers to your bank account (daily, weekly, or monthly)
• Track your earnings in your dashboard`,
      slug: 'how-do-i-get-paid-sos-expat',
    },
    es: {
      question: '¿Cómo me pagan en SOS-Expat?',
      answer: `Los pagos se realizan a través de Stripe Connect:
• Después de cada llamada exitosa, tu remuneración se acredita en tu cuenta Stripe
• Las tarifas son fijadas por SOS-Expat: 49€ (20 min) para abogados, 19€ (30 min) para expats colaboradores
• El cliente realiza un pago único, dividido entre tu remuneración y las comisiones de intermediación de SOS-Expat
• Solo se deducen las comisiones de Stripe (~2,9%) de tu parte
• Transferencias automáticas a tu cuenta bancaria (diaria, semanal o mensual)
• Seguimiento de tus ingresos en tu panel de control`,
      slug: 'como-me-pagan-sos-expat',
    },
    de: {
      question: 'Wie werde ich bei SOS-Expat bezahlt?',
      answer: `Zahlungen werden über Stripe Connect abgewickelt:
• Nach jedem erfolgreichen Gespräch wird Ihre Vergütung Ihrem Stripe-Konto gutgeschrieben
• Die Preise werden von SOS-Expat festgelegt: 49€ (20 Min.) für Anwälte, 19€ (30 Min.) für Expat-Helfer
• Der Kunde leistet eine einmalige Zahlung, aufgeteilt zwischen Ihrer Vergütung und der Vermittlungsgebühr von SOS-Expat
• Nur die Stripe-Gebühren (~2,9%) werden von Ihrem Anteil abgezogen
• Automatische Überweisungen auf Ihr Bankkonto (täglich, wöchentlich oder monatlich)
• Einnahmen im Dashboard verfolgen`,
      slug: 'wie-werde-ich-bei-sos-expat-bezahlt',
    },
    pt: {
      question: 'Como recebo o pagamento no SOS-Expat?',
      answer: `Os pagamentos são processados via Stripe Connect:
• Após cada chamada bem-sucedida, sua remuneração é creditada em sua conta Stripe
• As tarifas são definidas pela SOS-Expat: 49€ (20 min) para advogados, 19€ (30 min) para expats assistentes
• O cliente faz um pagamento único, dividido entre sua remuneração e a taxa de intermediação da SOS-Expat
• Apenas as taxas do Stripe (~2,9%) são deduzidas da sua parte
• Transferências automáticas para sua conta bancária (diária, semanal ou mensal)
• Acompanhe seus ganhos no seu painel`,
      slug: 'como-recebo-o-pagamento-sos-expat',
    },
    ru: {
      question: 'Как я получаю оплату на SOS-Expat?',
      answer: `Платежи обрабатываются через Stripe Connect:
• После каждого успешного звонка ваше вознаграждение зачисляется на ваш счёт Stripe
• Тарифы установлены SOS-Expat: 49€ (20 мин) для юристов, 19€ (30 мин) для экспат-помощников
• Клиент совершает единовременный платёж, разделённый между вашим вознаграждением и комиссией SOS-Expat
• Из вашей доли вычитаются только комиссии Stripe (~2,9%)
• Автоматические переводы на ваш банковский счёт (ежедневно, еженедельно или ежемесячно)
• Отслеживайте свои доходы в личном кабинете`,
      slug: 'ru-kak-poluchayu-oplatu-sos-expat',
    },
    ch: {
      question: '我在SOS-Expat上如何收到报酬？',
      answer: `付款通过Stripe Connect处理：
• 每次成功通话后，您的报酬将计入您的Stripe账户
• 费率由SOS-Expat设定：律师49€（20分钟），海外华人助手19€（30分钟）
• 客户进行一次性付款，分配于您的报酬和SOS-Expat的中介费之间
• 您的份额中仅扣除Stripe费用（约2.9%）
• 自动转账至您的银行账户（每日、每周或每月）
• 在您的仪表板中跟踪您的收入`,
      slug: 'zh-how-do-i-get-paid-sos-expat',
    },
    hi: {
      question: 'SOS-Expat पर मुझे भुगतान कैसे मिलता है?',
      answer: `भुगतान Stripe Connect के माध्यम से संसाधित किए जाते हैं:
• प्रत्येक सफल कॉल के बाद, आपका पारिश्रमिक आपके Stripe खाते में जमा किया जाता है
• दरें SOS-Expat द्वारा निर्धारित की जाती हैं: वकीलों के लिए 49€ (20 मिनट), प्रवासी सहायकों के लिए 19€ (30 मिनट)
• ग्राहक एक एकमुश्त भुगतान करता है, जो आपके पारिश्रमिक और SOS-Expat के मध्यस्थता शुल्क के बीच विभाजित होता है
• आपके हिस्से से केवल Stripe शुल्क (~2.9%) काटा जाता है
• आपके बैंक खाते में स्वचालित स्थानांतरण (दैनिक, साप्ताहिक या मासिक)
• अपने डैशबोर्ड में अपनी आय ट्रैक करें`,
      slug: 'hi-sos-expat-par-bhugtaan-kaise-milta-hai',
    },
    ar: {
      question: 'كيف أتقاضى أجري على SOS-Expat؟',
      answer: `تتم معالجة المدفوعات عبر Stripe Connect:
• بعد كل مكالمة ناجحة، يُضاف أجرك إلى حسابك في Stripe
• تُحدَّد الأسعار من قِبَل SOS-Expat: 49€ (20 دقيقة) للمحامين، و19€ (30 دقيقة) للمساعدين المغتربين
• يدفع العميل مبلغاً واحداً، مقسَّماً بين أجرك ورسوم وساطة SOS-Expat
• لا يُخصَم من حصتك إلا رسوم Stripe (حوالي 2.9%)
• تحويلات تلقائية إلى حسابك البنكي (يومياً أو أسبوعياً أو شهرياً)
• تابع أرباحك من لوحة التحكم الخاصة بك`,
      slug: 'ar-how-do-i-get-paid-sos-expat',
    },
  },

  // ── 5. Comment fonctionne la rémunération sur SOS-Expat ? ────────────────
  PVTFuA2TaBVc1IosZiYK: {
    en: {
      question: 'How does compensation work on SOS-Expat?',
      answer: `SOS-Expat is a platform for quick initial connections. The model is simple:

• Fixed rates set by SOS-Expat: €49 (20 min lawyer), €19 (30 min expat helper)
• The client makes a SINGLE payment which includes:
  - Your provider compensation
  - SOS-Expat connection fee (covering Twilio, platform, features)
• Only Stripe transaction fees (~2.9%) are deducted from your share

Important: These calls are a quick initial contact. If the client wants to open a case or continue the collaboration, this is done directly with you, outside the SOS-Expat platform.`,
      slug: 'how-does-compensation-work-on-sos-expat',
    },
    es: {
      question: '¿Cómo funciona la remuneración en SOS-Expat?',
      answer: `SOS-Expat es una plataforma de intermediación para primeros contactos rápidos. El modelo es sencillo:

• Tarifas fijas definidas por SOS-Expat: 49€ (20 min abogado), 19€ (30 min expat colaborador)
• El cliente realiza UN SOLO pago que incluye:
  - Tu remuneración como proveedor
  - Las comisiones de intermediación de SOS-Expat (que cubren Twilio, plataforma, funcionalidades)
• Solo se deducen las comisiones de transacción de Stripe (~2,9%) de tu parte

Importante: Estas llamadas son un primer contacto rápido. Si el cliente desea abrir un expediente o continuar la colaboración, esto se realiza directamente contigo, fuera de la plataforma SOS-Expat.`,
      slug: 'como-funciona-la-remuneracion-en-sos-expat',
    },
    de: {
      question: 'Wie funktioniert die Vergütung bei SOS-Expat?',
      answer: `SOS-Expat ist eine Vermittlungsplattform für schnelle erste Kontakte. Das Modell ist einfach:

• Feste Preise, von SOS-Expat festgelegt: 49€ (20 Min. Anwalt), 19€ (30 Min. Expat-Helfer)
• Der Kunde leistet EINE EINZIGE Zahlung, die umfasst:
  - Ihre Anbietervergütung
  - Die Vermittlungsgebühr von SOS-Expat (für Twilio, Plattform, Funktionen)
• Nur Stripe-Transaktionsgebühren (~2,9%) werden von Ihrem Anteil abgezogen

Wichtig: Diese Gespräche sind ein erster schneller Kontakt. Wenn der Kunde ein Verfahren eröffnen oder die Zusammenarbeit fortsetzen möchte, geschieht dies direkt mit Ihnen, außerhalb der SOS-Expat-Plattform.`,
      slug: 'wie-funktioniert-verguetung-bei-sos-expat',
    },
    pt: {
      question: 'Como funciona a remuneração no SOS-Expat?',
      answer: `A SOS-Expat é uma plataforma de intermediação para primeiros contatos rápidos. O modelo é simples:

• Tarifas fixas definidas pela SOS-Expat: 49€ (20 min advogado), 19€ (30 min expat assistente)
• O cliente faz UM ÚNICO pagamento que inclui:
  - Sua remuneração como prestador
  - A taxa de intermediação da SOS-Expat (cobrindo Twilio, plataforma, funcionalidades)
• Apenas as taxas de transação do Stripe (~2,9%) são deduzidas da sua parte

Importante: Essas chamadas são um primeiro contato rápido. Se o cliente desejar abrir um processo ou continuar a colaboração, isso é feito diretamente com você, fora da plataforma SOS-Expat.`,
      slug: 'como-funciona-remuneracao-sos-expat',
    },
    ru: {
      question: 'Как работает система вознаграждения на SOS-Expat?',
      answer: `SOS-Expat — платформа посредничества для быстрых первых контактов. Модель проста:

• Фиксированные тарифы, установленные SOS-Expat: 49€ (20 мин. юрист), 19€ (30 мин. экспат-помощник)
• Клиент совершает ОДИН платёж, который включает:
  - Ваше вознаграждение как провайдера
  - Комиссию SOS-Expat (покрывает Twilio, платформу, функции)
• Из вашей доли вычитаются только транзакционные сборы Stripe (~2,9%)

Важно: эти звонки — первый быстрый контакт. Если клиент хочет открыть дело или продолжить сотрудничество, это происходит напрямую с вами, вне платформы SOS-Expat.`,
      slug: 'ru-kak-rabotaet-sistema-voznagrazhdeniya-sos-expat',
    },
    ch: {
      question: 'SOS-Expat上的报酬体系是如何运作的？',
      answer: `SOS-Expat是一个快速初次联系的中介平台。模式很简单：

• SOS-Expat设定的固定费率：49€（20分钟律师），19€（30分钟海外华人助手）
• 客户进行单次付款，包括：
  - 您作为服务提供商的报酬
  - SOS-Expat的中介费（涵盖Twilio、平台和功能）
• 您的份额中仅扣除Stripe交易费用（约2.9%）

重要提示：这些通话是快速的初次联系。如果客户希望开立案件或继续合作，这将直接在您和客户之间进行，在SOS-Expat平台之外。`,
      slug: 'zh-how-does-compensation-work-sos-expat',
    },
    hi: {
      question: 'SOS-Expat पर पारिश्रमिक प्रणाली कैसे काम करती है?',
      answer: `SOS-Expat त्वरित प्रारंभिक संपर्कों के लिए एक मध्यस्थ प्लेटफ़ॉर्म है। मॉडल सरल है:

• SOS-Expat द्वारा निर्धारित निश्चित दरें: 49€ (20 मिनट वकील), 19€ (30 मिनट प्रवासी सहायक)
• ग्राहक एकल भुगतान करता है जिसमें शामिल हैं:
  - सेवा प्रदाता के रूप में आपका पारिश्रमिक
  - SOS-Expat का मध्यस्थता शुल्क (Twilio, प्लेटफ़ॉर्म, सुविधाओं को कवर करना)
• आपके हिस्से से केवल Stripe लेनदेन शुल्क (~2.9%) काटा जाता है

महत्वपूर्ण: ये कॉल त्वरित प्रारंभिक संपर्क हैं। यदि ग्राहक कोई मामला खोलना या सहयोग जारी रखना चाहता है, तो यह SOS-Expat प्लेटफ़ॉर्म के बाहर, सीधे आपके साथ किया जाता है।`,
      slug: 'hi-parishramik-pranali-kaise-kaam-karti-hai',
    },
    ar: {
      question: 'كيف يعمل نظام المكافآت على SOS-Expat؟',
      answer: `SOS-Expat منصة وساطة لأول اتصالات سريعة. النموذج بسيط:

• أسعار ثابتة تُحدَّد من قِبَل SOS-Expat: 49€ (20 دقيقة محامٍ)، 19€ (30 دقيقة مساعد مغترب)
• يدفع العميل مبلغاً واحداً فقط يشمل:
  - أتعابك كمقدم خدمة
  - رسوم وساطة SOS-Expat (تغطي Twilio والمنصة والميزات)
• لا يُخصَم من حصتك إلا رسوم معاملات Stripe (حوالي 2.9%)

مهم: هذه المكالمات هي أول اتصال سريع. إن أراد العميل فتح ملف أو الاستمرار في التعاون، يتم ذلك مباشرةً معك، خارج منصة SOS-Expat.`,
      slug: 'ar-how-does-compensation-work-sos-expat',
    },
  },

  // ── 6. Comment fonctionne le paiement ? ─────────────────────────────────
  c9ezdEpxqDFOd6RIsTds: {
    en: {
      question: 'How does payment work on SOS-Expat?',
      answer: `Payment is made before the connection, 100% secure via Stripe:

1. Choose your provider (lawyer or expat helper)
2. Make a single payment (€19 or €49) which includes:
   - The provider's compensation
   - SOS-Expat connection fee (Twilio, platform)
3. You are connected immediately by phone
4. If the call doesn't go through, automatic 100% refund

This first contact allows you to get quick assistance. Any follow-up (case, collaboration) is done directly with the provider, outside SOS-Expat.`,
      slug: 'how-does-payment-work-sos-expat',
    },
    es: {
      question: '¿Cómo funciona el pago en SOS-Expat?',
      answer: `El pago se realiza antes de la intermediación, de forma 100% segura a través de Stripe:

1. Elige tu proveedor (abogado o expat colaborador)
2. Realiza un pago único (19€ o 49€) que incluye:
   - La remuneración del proveedor
   - Las comisiones de intermediación de SOS-Expat (Twilio, plataforma)
3. Te conectan inmediatamente por teléfono
4. Si la llamada no se establece, reembolso automático al 100%

Este primer contacto te permite obtener una ayuda rápida. Cualquier continuación (expediente, colaboración) se realiza directamente con el proveedor, fuera de SOS-Expat.`,
      slug: 'como-funciona-el-pago-sos-expat',
    },
    de: {
      question: 'Wie funktioniert die Zahlung bei SOS-Expat?',
      answer: `Die Zahlung erfolgt vor der Vermittlung, 100% sicher über Stripe:

1. Wählen Sie Ihren Anbieter (Anwalt oder Expat-Helfer)
2. Leisten Sie eine einmalige Zahlung (19€ oder 49€), die umfasst:
   - Die Vergütung des Anbieters
   - Die Vermittlungsgebühr von SOS-Expat (Twilio, Plattform)
3. Sie werden sofort telefonisch verbunden
4. Falls das Gespräch nicht zustande kommt, automatische 100%-Rückerstattung

Dieser erste Kontakt ermöglicht es Ihnen, schnelle Hilfe zu erhalten. Jede weitere Zusammenarbeit (Fall, Projekt) erfolgt direkt mit dem Anbieter, außerhalb von SOS-Expat.`,
      slug: 'wie-funktioniert-zahlung-bei-sos-expat',
    },
    pt: {
      question: 'Como funciona o pagamento no SOS-Expat?',
      answer: `O pagamento é feito antes da conexão, 100% seguro via Stripe:

1. Escolha seu prestador (advogado ou expat assistente)
2. Faça um pagamento único (19€ ou 49€) que inclui:
   - A remuneração do prestador
   - A taxa de intermediação da SOS-Expat (Twilio, plataforma)
3. Você é conectado imediatamente por telefone
4. Se a chamada não for estabelecida, reembolso automático de 100%

Este primeiro contato permite que você obtenha ajuda rápida. Qualquer continuação (processo, colaboração) é feita diretamente com o prestador, fora da SOS-Expat.`,
      slug: 'como-funciona-pagamento-sos-expat',
    },
    ru: {
      question: 'Как работает оплата на SOS-Expat?',
      answer: `Оплата производится до соединения, 100% безопасно через Stripe:

1. Выберите провайдера (юрист или экспат-помощник)
2. Совершите единовременный платёж (19€ или 49€), который включает:
   - Вознаграждение провайдера
   - Комиссию SOS-Expat за посредничество (Twilio, платформа)
3. Вы мгновенно соединяетесь по телефону
4. Если звонок не состоялся — автоматический возврат 100%

Этот первый контакт позволяет получить быструю помощь. Любое продолжение (дело, сотрудничество) осуществляется напрямую с провайдером, вне SOS-Expat.`,
      slug: 'ru-kak-rabotaet-oplata-sos-expat',
    },
    ch: {
      question: 'SOS-Expat上的付款是如何运作的？',
      answer: `付款在联系建立之前进行，通过Stripe 100%安全：

1. 选择您的服务提供商（律师或海外华人助手）
2. 进行一次性付款（19€或49€），包括：
   - 服务提供商的报酬
   - SOS-Expat的中介费（Twilio、平台）
3. 您将立即通过电话建立联系
4. 如果通话未接通，自动100%退款

这次初次联系让您能够获得快速帮助。任何进一步的跟进（案件、合作）均直接与服务提供商进行，在SOS-Expat之外。`,
      slug: 'zh-how-does-payment-work-sos-expat',
    },
    hi: {
      question: 'SOS-Expat पर भुगतान कैसे काम करता है?',
      answer: `भुगतान संपर्क से पहले किया जाता है, Stripe के माध्यम से 100% सुरक्षित:

1. अपना सेवा प्रदाता चुनें (वकील या प्रवासी सहायक)
2. एकमुश्त भुगतान करें (19€ या 49€) जिसमें शामिल हैं:
   - सेवा प्रदाता का पारिश्रमिक
   - SOS-Expat का मध्यस्थता शुल्क (Twilio, प्लेटफ़ॉर्म)
3. आप तुरंत फोन से जुड़ जाते हैं
4. यदि कॉल नहीं लगती, तो 100% स्वचालित रिफंड

यह प्रारंभिक संपर्क आपको त्वरित सहायता प्राप्त करने की अनुमति देता है। कोई भी आगे की कार्यवाही (मामला, सहयोग) सीधे सेवा प्रदाता के साथ, SOS-Expat के बाहर की जाती है।`,
      slug: 'hi-sos-expat-par-bhugtaan-kaise-kaam-karta-hai',
    },
    ar: {
      question: 'كيف يعمل نظام الدفع على SOS-Expat؟',
      answer: `يتم الدفع قبل الاتصال، بأمان 100% عبر Stripe:

1. اختر مقدم الخدمة (محامٍ أو مساعد مغترب)
2. أجرِ دفعة واحدة (19€ أو 49€) تشمل:
   - أتعاب مقدم الخدمة
   - رسوم وساطة SOS-Expat (Twilio والمنصة)
3. تتواصل فوراً عبر الهاتف
4. إن لم تتم المكالمة، استرداد تلقائي بنسبة 100%

يتيح لك هذا الاتصال الأول الحصول على مساعدة سريعة. أي متابعة (ملف، تعاون) تُجرى مباشرةً مع مقدم الخدمة، خارج SOS-Expat.`,
      slug: 'ar-how-does-payment-work-sos-expat',
    },
  },
};

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== Fix FAQ Translations (app_faq) ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  let totalUpdated = 0;

  for (const [docId, langs] of Object.entries(TRANSLATIONS)) {
    const docRef = db.collection('app_faq').doc(docId);
    const snap = await docRef.get();

    if (!snap.exists) {
      console.log(`❌ ${docId} introuvable — skip`);
      continue;
    }

    const faq = snap.data();
    const frQ = faq.question?.fr || '(pas de question FR)';
    console.log(`\n📋 "${frQ}" (${docId})`);

    const updatePayload = {};

    for (const [lang, t] of Object.entries(langs)) {
      updatePayload[`question.${lang}`] = t.question;
      updatePayload[`answer.${lang}`] = t.answer;
      updatePayload[`slug.${lang}`] = t.slug;
      console.log(`  ✓ ${lang}: "${t.question.substring(0, 55)}..."`);
    }

    updatePayload['updatedAt'] = FieldValue.serverTimestamp();

    if (!DRY_RUN) {
      await docRef.update(updatePayload);
      console.log(`  💾 ${Object.keys(langs).length} langues enregistrées`);
      totalUpdated++;
    } else {
      console.log(`  [DRY RUN] ${Object.keys(langs).length} langues seraient mises à jour`);
    }
  }

  console.log(`\n=== Résumé ===`);
  if (DRY_RUN) {
    console.log(`${Object.keys(TRANSLATIONS).length} documents seraient mis à jour (dry-run)`);
  } else {
    console.log(`${totalUpdated} / ${Object.keys(TRANSLATIONS).length} documents mis à jour dans Firestore ✅`);
  }
  console.log('');
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
