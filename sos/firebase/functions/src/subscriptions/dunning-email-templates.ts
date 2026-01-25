/**
 * Templates d'emails pour le système de Dunning
 * SOS-Expat Platform
 *
 * Ces templates sont utilisés par le système de dunning pour envoyer
 * des emails automatiques lors des échecs de paiement.
 *
 * À configurer dans MailWizz/SendGrid avec les IDs correspondants.
 *
 * LANGUES SUPPORTÉES: FR, EN, ES, PT, DE, RU, AR, HI, CH (9 langues)
 */

export type SupportedLanguage = 'fr' | 'en' | 'es' | 'pt' | 'de' | 'ru' | 'ar' | 'hi' | 'ch';

export interface DunningEmailContent {
  subject: Record<SupportedLanguage, string>;
  body: Record<SupportedLanguage, string>;
  cta: Record<SupportedLanguage, string>;
}

// ============================================================================
// TEMPLATE 1: Payment Failed (J+1)
// ============================================================================
export const PAYMENT_FAILED_TEMPLATE: DunningEmailContent = {
  subject: {
    fr: '[SOS-Expat] Problème avec votre paiement',
    en: '[SOS-Expat] Issue with your payment',
    es: '[SOS-Expat] Problema con tu pago',
    pt: '[SOS-Expat] Problema com o seu pagamento',
    de: '[SOS-Expat] Problem mit Ihrer Zahlung',
    ru: '[SOS-Expat] Проблема с вашим платежом',
    ar: '[SOS-Expat] مشكلة في دفعتك',
    hi: '[SOS-Expat] आपके भुगतान में समस्या',
    ch: '[SOS-Expat] 您的付款出现问题',
  },
  body: {
    fr: `Bonjour {{FNAME}},

Nous avons rencontré un problème lors du traitement de votre paiement de {{AMOUNT}} {{CURRENCY}} pour votre abonnement SOS-Expat.

Cela peut arriver pour plusieurs raisons :
• Fonds insuffisants sur votre compte
• Carte expirée
• Limite de paiement atteinte

Nous tenterons automatiquement un nouveau prélèvement dans 2 jours.

Pour éviter toute interruption de service, nous vous recommandons de mettre à jour vos informations de paiement dès maintenant.`,
    en: `Hello {{FNAME}},

We encountered an issue processing your payment of {{AMOUNT}} {{CURRENCY}} for your SOS-Expat subscription.

This can happen for several reasons:
• Insufficient funds
• Expired card
• Payment limit reached

We will automatically retry the payment in 2 days.

To avoid any service interruption, we recommend updating your payment information now.`,
    es: `Hola {{FNAME}},

Hemos encontrado un problema al procesar tu pago de {{AMOUNT}} {{CURRENCY}} para tu suscripción a SOS-Expat.

Esto puede suceder por varias razones:
• Fondos insuficientes
• Tarjeta vencida
• Límite de pago alcanzado

Intentaremos automáticamente un nuevo cobro en 2 días.

Para evitar cualquier interrupción del servicio, te recomendamos actualizar tu información de pago ahora.`,
    pt: `Olá {{FNAME}},

Encontramos um problema ao processar seu pagamento de {{AMOUNT}} {{CURRENCY}} para sua assinatura SOS-Expat.

Isso pode acontecer por vários motivos:
• Fundos insuficientes
• Cartão expirado
• Limite de pagamento atingido

Tentaremos automaticamente uma nova cobrança em 2 dias.

Para evitar qualquer interrupção do serviço, recomendamos que atualize suas informações de pagamento agora.`,
    de: `Hallo {{FNAME}},

Bei der Verarbeitung Ihrer Zahlung von {{AMOUNT}} {{CURRENCY}} für Ihr SOS-Expat-Abonnement ist ein Problem aufgetreten.

Dies kann aus mehreren Gründen geschehen:
• Unzureichende Mittel
• Abgelaufene Karte
• Zahlungslimit erreicht

Wir werden in 2 Tagen automatisch einen neuen Versuch unternehmen.

Um Serviceunterbrechungen zu vermeiden, empfehlen wir Ihnen, Ihre Zahlungsinformationen jetzt zu aktualisieren.`,
    ru: `Здравствуйте, {{FNAME}},

Мы столкнулись с проблемой при обработке вашего платежа на сумму {{AMOUNT}} {{CURRENCY}} за подписку SOS-Expat.

Это может произойти по нескольким причинам:
• Недостаточно средств
• Истёк срок действия карты
• Достигнут лимит платежей

Мы автоматически повторим попытку списания через 2 дня.

Чтобы избежать прерывания обслуживания, рекомендуем обновить платёжную информацию прямо сейчас.`,
    ar: `مرحباً {{FNAME}}،

واجهنا مشكلة في معالجة دفعتك بمبلغ {{AMOUNT}} {{CURRENCY}} لاشتراكك في SOS-Expat.

يمكن أن يحدث هذا لعدة أسباب:
• رصيد غير كافٍ
• بطاقة منتهية الصلاحية
• تم الوصول إلى حد الدفع

سنحاول تلقائياً إجراء خصم جديد خلال يومين.

لتجنب أي انقطاع في الخدمة، نوصيك بتحديث معلومات الدفع الخاصة بك الآن.`,
    hi: `नमस्ते {{FNAME}},

आपकी SOS-Expat सदस्यता के लिए {{AMOUNT}} {{CURRENCY}} के भुगतान को संसाधित करने में हमें एक समस्या का सामना करना पड़ा।

यह कई कारणों से हो सकता है:
• अपर्याप्त धनराशि
• कार्ड की समय सीमा समाप्त
• भुगतान सीमा तक पहुंच गई

हम 2 दिनों में स्वचालित रूप से भुगतान का पुनः प्रयास करेंगे।

सेवा में किसी भी रुकावट से बचने के लिए, हम अनुशंसा करते हैं कि आप अभी अपनी भुगतान जानकारी अपडेट करें।`,
    ch: `您好 {{FNAME}}，

在处理您的 SOS-Expat 订阅付款 {{AMOUNT}} {{CURRENCY}} 时遇到问题。

这可能由于以下原因发生：
• 资金不足
• 卡片已过期
• 达到付款限额

我们将在 2 天后自动重试付款。

为避免服务中断，我们建议您立即更新付款信息。`,
  },
  cta: {
    fr: 'Mettre à jour mes informations de paiement',
    en: 'Update my payment information',
    es: 'Actualizar mi información de pago',
    pt: 'Atualizar minhas informações de pagamento',
    de: 'Meine Zahlungsinformationen aktualisieren',
    ru: 'Обновить платёжную информацию',
    ar: 'تحديث معلومات الدفع الخاصة بي',
    hi: 'मेरी भुगतान जानकारी अपडेट करें',
    ch: '更新我的付款信息',
  },
};

// ============================================================================
// TEMPLATE 2: Action Required (J+3)
// ============================================================================
export const ACTION_REQUIRED_TEMPLATE: DunningEmailContent = {
  subject: {
    fr: '[SOS-Expat] Action requise - Mise à jour de paiement',
    en: '[SOS-Expat] Action required - Payment update needed',
    es: '[SOS-Expat] Acción requerida - Actualización de pago necesaria',
    pt: '[SOS-Expat] Ação necessária - Atualização de pagamento necessária',
    de: '[SOS-Expat] Aktion erforderlich - Zahlungsaktualisierung erforderlich',
    ru: '[SOS-Expat] Требуется действие - Необходимо обновить платёж',
    ar: '[SOS-Expat] إجراء مطلوب - يجب تحديث الدفع',
    hi: '[SOS-Expat] कार्रवाई आवश्यक - भुगतान अपडेट की आवश्यकता',
    ch: '[SOS-Expat] 需要操作 - 需要更新付款',
  },
  body: {
    fr: `Bonjour {{FNAME}},

Malgré notre nouvelle tentative, nous n'avons toujours pas pu prélever le paiement de {{AMOUNT}} {{CURRENCY}} pour votre abonnement.

⚠️ Votre accès à l'outil IA pourrait être suspendu si le problème n'est pas résolu.

Veuillez mettre à jour vos informations de paiement dans les 48 heures pour continuer à bénéficier de :
• L'assistant IA Claude/GPT-4o
• La recherche web Perplexity
• Toutes les fonctionnalités de votre abonnement

Une dernière tentative sera effectuée dans 2 jours.`,
    en: `Hello {{FNAME}},

Despite our retry attempt, we still couldn't process your payment of {{AMOUNT}} {{CURRENCY}} for your subscription.

⚠️ Your access to the AI tool may be suspended if this issue is not resolved.

Please update your payment information within 48 hours to continue enjoying:
• Claude/GPT-4o AI assistant
• Perplexity web search
• All your subscription features

A final attempt will be made in 2 days.`,
    es: `Hola {{FNAME}},

A pesar de nuestro nuevo intento, todavía no pudimos procesar tu pago de {{AMOUNT}} {{CURRENCY}} para tu suscripción.

⚠️ Tu acceso a la herramienta de IA puede ser suspendido si no se resuelve este problema.

Por favor, actualiza tu información de pago en las próximas 48 horas para seguir disfrutando de:
• Asistente de IA Claude/GPT-4o
• Búsqueda web Perplexity
• Todas las funcionalidades de tu suscripción

Se realizará un último intento en 2 días.`,
    pt: `Olá {{FNAME}},

Apesar de nossa nova tentativa, ainda não conseguimos processar seu pagamento de {{AMOUNT}} {{CURRENCY}} para sua assinatura.

⚠️ Seu acesso à ferramenta de IA pode ser suspenso se esse problema não for resolvido.

Por favor, atualize suas informações de pagamento nas próximas 48 horas para continuar aproveitando:
• Assistente de IA Claude/GPT-4o
• Pesquisa web Perplexity
• Todas as funcionalidades da sua assinatura

Uma última tentativa será feita em 2 dias.`,
    de: `Hallo {{FNAME}},

Trotz unseres erneuten Versuchs konnten wir Ihre Zahlung von {{AMOUNT}} {{CURRENCY}} für Ihr Abonnement immer noch nicht verarbeiten.

⚠️ Ihr Zugang zum KI-Tool könnte gesperrt werden, wenn dieses Problem nicht gelöst wird.

Bitte aktualisieren Sie Ihre Zahlungsinformationen innerhalb von 48 Stunden, um weiterhin Folgendes nutzen zu können:
• Claude/GPT-4o KI-Assistent
• Perplexity Websuche
• Alle Funktionen Ihres Abonnements

Ein letzter Versuch wird in 2 Tagen unternommen.`,
    ru: `Здравствуйте, {{FNAME}},

Несмотря на повторную попытку, мы всё ещё не смогли обработать ваш платёж на сумму {{AMOUNT}} {{CURRENCY}} за подписку.

⚠️ Ваш доступ к инструменту ИИ может быть приостановлен, если эта проблема не будет решена.

Пожалуйста, обновите платёжную информацию в течение 48 часов, чтобы продолжить пользоваться:
• ИИ-ассистентом Claude/GPT-4o
• Веб-поиском Perplexity
• Всеми функциями вашей подписки

Последняя попытка будет предпринята через 2 дня.`,
    ar: `مرحباً {{FNAME}}،

على الرغم من محاولتنا الجديدة، لم نتمكن من معالجة دفعتك بمبلغ {{AMOUNT}} {{CURRENCY}} لاشتراكك.

⚠️ قد يتم تعليق وصولك إلى أداة الذكاء الاصطناعي إذا لم يتم حل هذه المشكلة.

يرجى تحديث معلومات الدفع الخاصة بك خلال 48 ساعة للاستمرار في الاستفادة من:
• مساعد الذكاء الاصطناعي Claude/GPT-4o
• بحث الويب Perplexity
• جميع ميزات اشتراكك

سيتم إجراء محاولة أخيرة خلال يومين.`,
    hi: `नमस्ते {{FNAME}},

हमारे पुनः प्रयास के बावजूद, हम अभी भी आपकी सदस्यता के लिए {{AMOUNT}} {{CURRENCY}} का भुगतान संसाधित नहीं कर सके।

⚠️ यदि इस समस्या का समाधान नहीं किया गया तो AI टूल तक आपकी पहुंच निलंबित हो सकती है।

कृपया निम्नलिखित का आनंद लेना जारी रखने के लिए 48 घंटों के भीतर अपनी भुगतान जानकारी अपडेट करें:
• Claude/GPT-4o AI सहायक
• Perplexity वेब खोज
• आपकी सदस्यता की सभी सुविधाएं

2 दिनों में अंतिम प्रयास किया जाएगा।`,
    ch: `您好 {{FNAME}}，

尽管我们进行了重试，但仍无法处理您的订阅付款 {{AMOUNT}} {{CURRENCY}}。

⚠️ 如果此问题未解决，您对 AI 工具的访问可能会被暂停。

请在 48 小时内更新您的付款信息，以继续享受：
• Claude/GPT-4o AI 助手
• Perplexity 网络搜索
• 您订阅的所有功能

我们将在 2 天后进行最后一次尝试。`,
  },
  cta: {
    fr: 'Résoudre maintenant',
    en: 'Resolve now',
    es: 'Resolver ahora',
    pt: 'Resolver agora',
    de: 'Jetzt lösen',
    ru: 'Решить сейчас',
    ar: 'حل المشكلة الآن',
    hi: 'अभी समाधान करें',
    ch: '立即解决',
  },
};

// ============================================================================
// TEMPLATE 3: Final Attempt (J+5)
// ============================================================================
export const FINAL_ATTEMPT_TEMPLATE: DunningEmailContent = {
  subject: {
    fr: '[SOS-Expat] Dernière tentative de paiement',
    en: '[SOS-Expat] Final payment attempt',
    es: '[SOS-Expat] Último intento de pago',
    pt: '[SOS-Expat] Última tentativa de pagamento',
    de: '[SOS-Expat] Letzter Zahlungsversuch',
    ru: '[SOS-Expat] Последняя попытка оплаты',
    ar: '[SOS-Expat] محاولة الدفع الأخيرة',
    hi: '[SOS-Expat] अंतिम भुगतान प्रयास',
    ch: '[SOS-Expat] 最后一次付款尝试',
  },
  body: {
    fr: `Bonjour {{FNAME}},

🚨 DERNIÈRE TENTATIVE DE PAIEMENT

C'est notre dernière tentative pour prélever {{AMOUNT}} {{CURRENCY}} sur votre compte.

Si ce paiement échoue, votre compte sera suspendu dans 48 heures et vous perdrez l'accès à :
• L'outil IA SOS-Expat
• Vos conversations en cours
• Toutes les fonctionnalités premium

Pour éviter cela, mettez à jour vos informations de paiement MAINTENANT.`,
    en: `Hello {{FNAME}},

🚨 FINAL PAYMENT ATTEMPT

This is our last attempt to process {{AMOUNT}} {{CURRENCY}} from your account.

If this payment fails, your account will be suspended within 48 hours and you will lose access to:
• SOS-Expat AI tool
• Your ongoing conversations
• All premium features

To avoid this, update your payment information NOW.`,
    es: `Hola {{FNAME}},

🚨 ÚLTIMO INTENTO DE PAGO

Este es nuestro último intento para procesar {{AMOUNT}} {{CURRENCY}} de tu cuenta.

Si este pago falla, tu cuenta será suspendida en 48 horas y perderás acceso a:
• Herramienta de IA SOS-Expat
• Tus conversaciones en curso
• Todas las funcionalidades premium

Para evitar esto, actualiza tu información de pago AHORA.`,
    pt: `Olá {{FNAME}},

🚨 ÚLTIMA TENTATIVA DE PAGAMENTO

Esta é nossa última tentativa de processar {{AMOUNT}} {{CURRENCY}} da sua conta.

Se este pagamento falhar, sua conta será suspensa em 48 horas e você perderá acesso a:
• Ferramenta de IA SOS-Expat
• Suas conversas em andamento
• Todas as funcionalidades premium

Para evitar isso, atualize suas informações de pagamento AGORA.`,
    de: `Hallo {{FNAME}},

🚨 LETZTER ZAHLUNGSVERSUCH

Dies ist unser letzter Versuch, {{AMOUNT}} {{CURRENCY}} von Ihrem Konto abzubuchen.

Wenn diese Zahlung fehlschlägt, wird Ihr Konto innerhalb von 48 Stunden gesperrt und Sie verlieren den Zugang zu:
• SOS-Expat KI-Tool
• Ihren laufenden Gesprächen
• Allen Premium-Funktionen

Um dies zu vermeiden, aktualisieren Sie Ihre Zahlungsinformationen JETZT.`,
    ru: `Здравствуйте, {{FNAME}},

🚨 ПОСЛЕДНЯЯ ПОПЫТКА ОПЛАТЫ

Это наша последняя попытка списать {{AMOUNT}} {{CURRENCY}} с вашего счёта.

Если этот платёж не пройдёт, ваш аккаунт будет приостановлен в течение 48 часов и вы потеряете доступ к:
• Инструменту ИИ SOS-Expat
• Вашим текущим разговорам
• Всем премиум-функциям

Чтобы этого избежать, обновите платёжную информацию СЕЙЧАС.`,
    ar: `مرحباً {{FNAME}}،

🚨 محاولة الدفع الأخيرة

هذه آخر محاولة لنا لمعالجة {{AMOUNT}} {{CURRENCY}} من حسابك.

إذا فشل هذا الدفع، سيتم تعليق حسابك خلال 48 ساعة وستفقد الوصول إلى:
• أداة الذكاء الاصطناعي SOS-Expat
• محادثاتك الجارية
• جميع الميزات المميزة

لتجنب ذلك، قم بتحديث معلومات الدفع الخاصة بك الآن.`,
    hi: `नमस्ते {{FNAME}},

🚨 अंतिम भुगतान प्रयास

यह आपके खाते से {{AMOUNT}} {{CURRENCY}} संसाधित करने का हमारा अंतिम प्रयास है।

यदि यह भुगतान विफल हो जाता है, तो आपका खाता 48 घंटों के भीतर निलंबित कर दिया जाएगा और आप निम्नलिखित तक पहुंच खो देंगे:
• SOS-Expat AI टूल
• आपकी चल रही बातचीत
• सभी प्रीमियम सुविधाएं

इससे बचने के लिए, अभी अपनी भुगतान जानकारी अपडेट करें।`,
    ch: `您好 {{FNAME}}，

🚨 最后一次付款尝试

这是我们从您的账户处理 {{AMOUNT}} {{CURRENCY}} 的最后一次尝试。

如果此次付款失败，您的账户将在 48 小时内被暂停，您将失去以下访问权限：
• SOS-Expat AI 工具
• 您正在进行的对话
• 所有高级功能

为避免这种情况，请立即更新您的付款信息。`,
  },
  cta: {
    fr: 'Mettre à jour maintenant',
    en: 'Update now',
    es: 'Actualizar ahora',
    pt: 'Atualizar agora',
    de: 'Jetzt aktualisieren',
    ru: 'Обновить сейчас',
    ar: 'التحديث الآن',
    hi: 'अभी अपडेट करें',
    ch: '立即更新',
  },
};

// ============================================================================
// TEMPLATE 4: Account Suspended (J+7)
// ============================================================================
export const ACCOUNT_SUSPENDED_TEMPLATE: DunningEmailContent = {
  subject: {
    fr: '[SOS-Expat] Votre compte a été suspendu',
    en: '[SOS-Expat] Your account has been suspended',
    es: '[SOS-Expat] Tu cuenta ha sido suspendida',
    pt: '[SOS-Expat] Sua conta foi suspensa',
    de: '[SOS-Expat] Ihr Konto wurde gesperrt',
    ru: '[SOS-Expat] Ваш аккаунт приостановлен',
    ar: '[SOS-Expat] تم تعليق حسابك',
    hi: '[SOS-Expat] आपका खाता निलंबित कर दिया गया है',
    ch: '[SOS-Expat] 您的账户已被暂停',
  },
  body: {
    fr: `Bonjour {{FNAME}},

Nous sommes désolés de vous informer que votre compte SOS-Expat a été suspendu suite à l'échec répété des paiements.

Montant impayé : {{AMOUNT}} {{CURRENCY}}

Ce que cela signifie :
❌ Accès à l'outil IA désactivé
❌ Nouvelles conversations impossibles
❌ Fonctionnalités premium indisponibles

Bonne nouvelle : Vous pouvez réactiver votre compte à tout moment en régularisant votre paiement. Vos données et conversations sont conservées.

Si vous souhaitez annuler définitivement votre abonnement, aucune action n'est requise.`,
    en: `Hello {{FNAME}},

We regret to inform you that your SOS-Expat account has been suspended due to repeated payment failures.

Outstanding amount: {{AMOUNT}} {{CURRENCY}}

What this means:
❌ AI tool access disabled
❌ New conversations unavailable
❌ Premium features inaccessible

Good news: You can reactivate your account at any time by completing your payment. Your data and conversations are preserved.

If you wish to permanently cancel your subscription, no action is required.`,
    es: `Hola {{FNAME}},

Lamentamos informarte que tu cuenta de SOS-Expat ha sido suspendida debido a fallos repetidos en los pagos.

Monto pendiente: {{AMOUNT}} {{CURRENCY}}

Esto significa que:
❌ Acceso a la herramienta de IA desactivado
❌ No es posible iniciar nuevas conversaciones
❌ Funcionalidades premium no disponibles

Buenas noticias: Puedes reactivar tu cuenta en cualquier momento completando tu pago. Tus datos y conversaciones están conservados.

Si deseas cancelar definitivamente tu suscripción, no se requiere ninguna acción.`,
    pt: `Olá {{FNAME}},

Lamentamos informar que sua conta SOS-Expat foi suspensa devido a falhas repetidas de pagamento.

Valor pendente: {{AMOUNT}} {{CURRENCY}}

O que isso significa:
❌ Acesso à ferramenta de IA desativado
❌ Novas conversas indisponíveis
❌ Funcionalidades premium inacessíveis

Boa notícia: Você pode reativar sua conta a qualquer momento completando seu pagamento. Seus dados e conversas estão preservados.

Se você deseja cancelar definitivamente sua assinatura, nenhuma ação é necessária.`,
    de: `Hallo {{FNAME}},

Es tut uns leid, Ihnen mitteilen zu müssen, dass Ihr SOS-Expat-Konto aufgrund wiederholter Zahlungsfehlschläge gesperrt wurde.

Ausstehender Betrag: {{AMOUNT}} {{CURRENCY}}

Was das bedeutet:
❌ Zugang zum KI-Tool deaktiviert
❌ Neue Gespräche nicht möglich
❌ Premium-Funktionen nicht verfügbar

Gute Nachricht: Sie können Ihr Konto jederzeit reaktivieren, indem Sie Ihre Zahlung abschließen. Ihre Daten und Gespräche werden aufbewahrt.

Wenn Sie Ihr Abonnement endgültig kündigen möchten, ist keine Aktion erforderlich.`,
    ru: `Здравствуйте, {{FNAME}},

К сожалению, мы вынуждены сообщить, что ваш аккаунт SOS-Expat был приостановлен из-за повторяющихся неудачных попыток оплаты.

Неоплаченная сумма: {{AMOUNT}} {{CURRENCY}}

Что это означает:
❌ Доступ к инструменту ИИ отключён
❌ Новые разговоры недоступны
❌ Премиум-функции недоступны

Хорошая новость: Вы можете восстановить свой аккаунт в любое время, завершив оплату. Ваши данные и разговоры сохранены.

Если вы хотите окончательно отменить подписку, никаких действий не требуется.`,
    ar: `مرحباً {{FNAME}}،

يؤسفنا إبلاغك بأن حسابك في SOS-Expat قد تم تعليقه بسبب فشل متكرر في الدفع.

المبلغ المستحق: {{AMOUNT}} {{CURRENCY}}

ماذا يعني هذا:
❌ تم تعطيل الوصول إلى أداة الذكاء الاصطناعي
❌ لا يمكن بدء محادثات جديدة
❌ الميزات المميزة غير متاحة

خبر سار: يمكنك إعادة تفعيل حسابك في أي وقت بإكمال الدفع. بياناتك ومحادثاتك محفوظة.

إذا كنت ترغب في إلغاء اشتراكك نهائياً، لا يلزم اتخاذ أي إجراء.`,
    hi: `नमस्ते {{FNAME}},

हमें यह सूचित करते हुए खेद है कि बार-बार भुगतान विफल होने के कारण आपका SOS-Expat खाता निलंबित कर दिया गया है।

बकाया राशि: {{AMOUNT}} {{CURRENCY}}

इसका मतलब है:
❌ AI टूल तक पहुंच अक्षम
❌ नई बातचीत उपलब्ध नहीं
❌ प्रीमियम सुविधाएं अनुपलब्ध

अच्छी खबर: आप किसी भी समय अपना भुगतान पूरा करके अपना खाता पुनः सक्रिय कर सकते हैं। आपका डेटा और बातचीत सुरक्षित हैं।

यदि आप अपनी सदस्यता स्थायी रूप से रद्द करना चाहते हैं, तो किसी कार्रवाई की आवश्यकता नहीं है।`,
    ch: `您好 {{FNAME}}，

很遗憾地通知您，由于多次付款失败，您的 SOS-Expat 账户已被暂停。

未付金额：{{AMOUNT}} {{CURRENCY}}

这意味着：
❌ AI 工具访问已禁用
❌ 无法开始新对话
❌ 高级功能不可用

好消息：您可以随时通过完成付款来重新激活您的账户。您的数据和对话已被保留。

如果您希望永久取消订阅，则无需采取任何操作。`,
  },
  cta: {
    fr: 'Réactiver mon compte',
    en: 'Reactivate my account',
    es: 'Reactivar mi cuenta',
    pt: 'Reativar minha conta',
    de: 'Mein Konto reaktivieren',
    ru: 'Восстановить мой аккаунт',
    ar: 'إعادة تفعيل حسابي',
    hi: 'मेरा खाता पुनः सक्रिय करें',
    ch: '重新激活我的账户',
  },
};

// ============================================================================
// TEMPLATE IDs for MailWizz/SendGrid
// ============================================================================
export const DUNNING_TEMPLATE_IDS: Record<string, Record<SupportedLanguage, string>> = {
  payment_failed: {
    fr: 'TR_PRV_dunning-payment-failed_fr',
    en: 'TR_PRV_dunning-payment-failed_en',
    es: 'TR_PRV_dunning-payment-failed_es',
    pt: 'TR_PRV_dunning-payment-failed_pt',
    de: 'TR_PRV_dunning-payment-failed_de',
    ru: 'TR_PRV_dunning-payment-failed_ru',
    ar: 'TR_PRV_dunning-payment-failed_ar',
    hi: 'TR_PRV_dunning-payment-failed_hi',
    ch: 'TR_PRV_dunning-payment-failed_ch',
  },
  action_required: {
    fr: 'TR_PRV_dunning-action-required_fr',
    en: 'TR_PRV_dunning-action-required_en',
    es: 'TR_PRV_dunning-action-required_es',
    pt: 'TR_PRV_dunning-action-required_pt',
    de: 'TR_PRV_dunning-action-required_de',
    ru: 'TR_PRV_dunning-action-required_ru',
    ar: 'TR_PRV_dunning-action-required_ar',
    hi: 'TR_PRV_dunning-action-required_hi',
    ch: 'TR_PRV_dunning-action-required_ch',
  },
  final_attempt: {
    fr: 'TR_PRV_dunning-final-attempt_fr',
    en: 'TR_PRV_dunning-final-attempt_en',
    es: 'TR_PRV_dunning-final-attempt_es',
    pt: 'TR_PRV_dunning-final-attempt_pt',
    de: 'TR_PRV_dunning-final-attempt_de',
    ru: 'TR_PRV_dunning-final-attempt_ru',
    ar: 'TR_PRV_dunning-final-attempt_ar',
    hi: 'TR_PRV_dunning-final-attempt_hi',
    ch: 'TR_PRV_dunning-final-attempt_ch',
  },
  account_suspended: {
    fr: 'TR_PRV_dunning-account-suspended_fr',
    en: 'TR_PRV_dunning-account-suspended_en',
    es: 'TR_PRV_dunning-account-suspended_es',
    pt: 'TR_PRV_dunning-account-suspended_pt',
    de: 'TR_PRV_dunning-account-suspended_de',
    ru: 'TR_PRV_dunning-account-suspended_ru',
    ar: 'TR_PRV_dunning-account-suspended_ar',
    hi: 'TR_PRV_dunning-account-suspended_hi',
    ch: 'TR_PRV_dunning-account-suspended_ch',
  },
};

// ============================================================================
// Variables disponibles dans les templates
// ============================================================================
export const DUNNING_TEMPLATE_VARIABLES = {
  FNAME: 'Prénom du prestataire',
  LNAME: 'Nom du prestataire',
  AMOUNT: 'Montant dû (ex: 49.00)',
  CURRENCY: 'Devise (EUR ou USD)',
  INVOICE_URL: 'URL de la facture Stripe',
  UPDATE_PAYMENT_URL: 'URL pour mettre à jour le paiement',
  SUBSCRIPTION_PLAN: 'Nom du plan (Basic, Standard, Pro, Illimité)',
  NEXT_RETRY_DATE: 'Date de la prochaine tentative',
};
