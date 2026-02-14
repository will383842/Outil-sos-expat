/**
 * Script pour ajouter les clés de traduction manquantes pour les erreurs d'inscription
 * Ajoute 10 clés × 3 types (Client, Lawyer, Expat) = 30 clés par langue
 * Total: 30 × 9 langues = 270 nouvelles clés
 */

const fs = require('fs');
const path = require('path');

const HELPER_DIR = path.join(__dirname, '..', 'src', 'helper');

// Définir les nouvelles clés par langue
const NEW_KEYS = {
  fr: {
    // Client errors
    'registerClient.errors.generic': 'Une erreur est survenue. Veuillez réessayer.',
    'registerClient.errors.emailAlreadyInUse': 'Cette adresse email est déjà utilisée. Essayez la connexion.',
    'registerClient.errors.emailLinkedToGoogle': 'Cet email est lié à un compte Google. Utilisez "Continuer avec Google".',
    'registerClient.errors.weakPassword': 'Mot de passe trop faible. Utilisez au moins 8 caractères.',
    'registerClient.errors.invalidEmail': 'Adresse email invalide.',
    'registerClient.errors.network': 'Erreur réseau. Vérifiez votre connexion.',
    'registerClient.errors.timeout': 'Délai d\'attente dépassé. Réessayez.',
    'registerClient.errors.permissions': 'Permissions insuffisantes.',
    'registerClient.errors.stripeUnsupported': 'Votre pays n\'est pas encore supporté par notre système de paiement.',
    'registerClient.errors.stripe': 'Erreur du système de paiement.',

    // Lawyer errors
    'registerLawyer.errors.generic': 'Une erreur est survenue. Veuillez réessayer.',
    'registerLawyer.errors.emailAlreadyInUse': 'Cette adresse email est déjà utilisée. Essayez la connexion.',
    'registerLawyer.errors.emailLinkedToGoogle': 'Cet email est lié à un compte Google. Utilisez "Continuer avec Google".',
    'registerLawyer.errors.weakPassword': 'Mot de passe trop faible. Utilisez au moins 8 caractères.',
    'registerLawyer.errors.invalidEmail': 'Adresse email invalide.',
    'registerLawyer.errors.network': 'Erreur réseau. Vérifiez votre connexion.',
    'registerLawyer.errors.timeout': 'Délai d\'attente dépassé. Réessayez.',
    'registerLawyer.errors.permissions': 'Permissions insuffisantes.',
    'registerLawyer.errors.stripeUnsupported': 'Votre pays n\'est pas encore supporté par notre système de paiement.',
    'registerLawyer.errors.stripe': 'Erreur du système de paiement.',

    // Expat errors
    'registerExpat.errors.generic': 'Une erreur est survenue. Veuillez réessayer.',
    'registerExpat.errors.emailAlreadyInUse': 'Cette adresse email est déjà utilisée. Essayez la connexion.',
    'registerExpat.errors.emailLinkedToGoogle': 'Cet email est lié à un compte Google. Utilisez "Continuer avec Google".',
    'registerExpat.errors.weakPassword': 'Mot de passe trop faible. Utilisez au moins 8 caractères.',
    'registerExpat.errors.invalidEmail': 'Adresse email invalide.',
    'registerExpat.errors.network': 'Erreur réseau. Vérifiez votre connexion.',
    'registerExpat.errors.timeout': 'Délai d\'attente dépassé. Réessayez.',
    'registerExpat.errors.permissions': 'Permissions insuffisantes.',
    'registerExpat.errors.stripeUnsupported': 'Votre pays n\'est pas encore supporté par notre système de paiement.',
    'registerExpat.errors.stripe': 'Erreur du système de paiement.',
  },

  en: {
    // Client errors
    'registerClient.errors.generic': 'An error occurred. Please try again.',
    'registerClient.errors.emailAlreadyInUse': 'This email address is already in use. Try logging in.',
    'registerClient.errors.emailLinkedToGoogle': 'This email is linked to a Google account. Use "Continue with Google".',
    'registerClient.errors.weakPassword': 'Password too weak. Use at least 8 characters.',
    'registerClient.errors.invalidEmail': 'Invalid email address.',
    'registerClient.errors.network': 'Network error. Check your connection.',
    'registerClient.errors.timeout': 'Request timeout. Please try again.',
    'registerClient.errors.permissions': 'Insufficient permissions.',
    'registerClient.errors.stripeUnsupported': 'Your country is not yet supported by our payment system.',
    'registerClient.errors.stripe': 'Payment system error.',

    // Lawyer errors
    'registerLawyer.errors.generic': 'An error occurred. Please try again.',
    'registerLawyer.errors.emailAlreadyInUse': 'This email address is already in use. Try logging in.',
    'registerLawyer.errors.emailLinkedToGoogle': 'This email is linked to a Google account. Use "Continue with Google".',
    'registerLawyer.errors.weakPassword': 'Password too weak. Use at least 8 characters.',
    'registerLawyer.errors.invalidEmail': 'Invalid email address.',
    'registerLawyer.errors.network': 'Network error. Check your connection.',
    'registerLawyer.errors.timeout': 'Request timeout. Please try again.',
    'registerLawyer.errors.permissions': 'Insufficient permissions.',
    'registerLawyer.errors.stripeUnsupported': 'Your country is not yet supported by our payment system.',
    'registerLawyer.errors.stripe': 'Payment system error.',

    // Expat errors
    'registerExpat.errors.generic': 'An error occurred. Please try again.',
    'registerExpat.errors.emailAlreadyInUse': 'This email address is already in use. Try logging in.',
    'registerExpat.errors.emailLinkedToGoogle': 'This email is linked to a Google account. Use "Continue with Google".',
    'registerExpat.errors.weakPassword': 'Password too weak. Use at least 8 characters.',
    'registerExpat.errors.invalidEmail': 'Invalid email address.',
    'registerExpat.errors.network': 'Network error. Check your connection.',
    'registerExpat.errors.timeout': 'Request timeout. Please try again.',
    'registerExpat.errors.permissions': 'Insufficient permissions.',
    'registerExpat.errors.stripeUnsupported': 'Your country is not yet supported by our payment system.',
    'registerExpat.errors.stripe': 'Payment system error.',
  },

  es: {
    // Client errors
    'registerClient.errors.generic': 'Ha ocurrido un error. Por favor, inténtelo de nuevo.',
    'registerClient.errors.emailAlreadyInUse': 'Esta dirección de correo ya está en uso. Intente iniciar sesión.',
    'registerClient.errors.emailLinkedToGoogle': 'Este correo está vinculado a una cuenta de Google. Use "Continuar con Google".',
    'registerClient.errors.weakPassword': 'Contraseña demasiado débil. Use al menos 8 caracteres.',
    'registerClient.errors.invalidEmail': 'Dirección de correo inválida.',
    'registerClient.errors.network': 'Error de red. Verifique su conexión.',
    'registerClient.errors.timeout': 'Tiempo de espera agotado. Inténtelo de nuevo.',
    'registerClient.errors.permissions': 'Permisos insuficientes.',
    'registerClient.errors.stripeUnsupported': 'Su país aún no está soportado por nuestro sistema de pagos.',
    'registerClient.errors.stripe': 'Error del sistema de pagos.',

    // Lawyer errors
    'registerLawyer.errors.generic': 'Ha ocurrido un error. Por favor, inténtelo de nuevo.',
    'registerLawyer.errors.emailAlreadyInUse': 'Esta dirección de correo ya está en uso. Intente iniciar sesión.',
    'registerLawyer.errors.emailLinkedToGoogle': 'Este correo está vinculado a una cuenta de Google. Use "Continuar con Google".',
    'registerLawyer.errors.weakPassword': 'Contraseña demasiado débil. Use al menos 8 caracteres.',
    'registerLawyer.errors.invalidEmail': 'Dirección de correo inválida.',
    'registerLawyer.errors.network': 'Error de red. Verifique su conexión.',
    'registerLawyer.errors.timeout': 'Tiempo de espera agotado. Inténtelo de nuevo.',
    'registerLawyer.errors.permissions': 'Permisos insuficientes.',
    'registerLawyer.errors.stripeUnsupported': 'Su país aún no está soportado por nuestro sistema de pagos.',
    'registerLawyer.errors.stripe': 'Error del sistema de pagos.',

    // Expat errors
    'registerExpat.errors.generic': 'Ha ocurrido un error. Por favor, inténtelo de nuevo.',
    'registerExpat.errors.emailAlreadyInUse': 'Esta dirección de correo ya está en uso. Intente iniciar sesión.',
    'registerExpat.errors.emailLinkedToGoogle': 'Este correo está vinculado a una cuenta de Google. Use "Continuar con Google".',
    'registerExpat.errors.weakPassword': 'Contraseña demasiado débil. Use al menos 8 caracteres.',
    'registerExpat.errors.invalidEmail': 'Dirección de correo inválida.',
    'registerExpat.errors.network': 'Error de red. Verifique su conexión.',
    'registerExpat.errors.timeout': 'Tiempo de espera agotado. Inténtelo de nuevo.',
    'registerExpat.errors.permissions': 'Permisos insuficientes.',
    'registerExpat.errors.stripeUnsupported': 'Su país aún no está soportado por nuestro sistema de pagos.',
    'registerExpat.errors.stripe': 'Error del sistema de pagos.',
  },

  de: {
    // Client errors
    'registerClient.errors.generic': 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    'registerClient.errors.emailAlreadyInUse': 'Diese E-Mail-Adresse wird bereits verwendet. Versuchen Sie sich anzumelden.',
    'registerClient.errors.emailLinkedToGoogle': 'Diese E-Mail ist mit einem Google-Konto verknüpft. Verwenden Sie "Mit Google fortfahren".',
    'registerClient.errors.weakPassword': 'Passwort zu schwach. Verwenden Sie mindestens 8 Zeichen.',
    'registerClient.errors.invalidEmail': 'Ungültige E-Mail-Adresse.',
    'registerClient.errors.network': 'Netzwerkfehler. Überprüfen Sie Ihre Verbindung.',
    'registerClient.errors.timeout': 'Zeitüberschreitung. Bitte versuchen Sie es erneut.',
    'registerClient.errors.permissions': 'Unzureichende Berechtigungen.',
    'registerClient.errors.stripeUnsupported': 'Ihr Land wird von unserem Zahlungssystem noch nicht unterstützt.',
    'registerClient.errors.stripe': 'Zahlungssystemfehler.',

    // Lawyer errors
    'registerLawyer.errors.generic': 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    'registerLawyer.errors.emailAlreadyInUse': 'Diese E-Mail-Adresse wird bereits verwendet. Versuchen Sie sich anzumelden.',
    'registerLawyer.errors.emailLinkedToGoogle': 'Diese E-Mail ist mit einem Google-Konto verknüpft. Verwenden Sie "Mit Google fortfahren".',
    'registerLawyer.errors.weakPassword': 'Passwort zu schwach. Verwenden Sie mindestens 8 Zeichen.',
    'registerLawyer.errors.invalidEmail': 'Ungültige E-Mail-Adresse.',
    'registerLawyer.errors.network': 'Netzwerkfehler. Überprüfen Sie Ihre Verbindung.',
    'registerLawyer.errors.timeout': 'Zeitüberschreitung. Bitte versuchen Sie es erneut.',
    'registerLawyer.errors.permissions': 'Unzureichende Berechtigungen.',
    'registerLawyer.errors.stripeUnsupported': 'Ihr Land wird von unserem Zahlungssystem noch nicht unterstützt.',
    'registerLawyer.errors.stripe': 'Zahlungssystemfehler.',

    // Expat errors
    'registerExpat.errors.generic': 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    'registerExpat.errors.emailAlreadyInUse': 'Diese E-Mail-Adresse wird bereits verwendet. Versuchen Sie sich anzumelden.',
    'registerExpat.errors.emailLinkedToGoogle': 'Diese E-Mail ist mit einem Google-Konto verknüpft. Verwenden Sie "Mit Google fortfahren".',
    'registerExpat.errors.weakPassword': 'Passwort zu schwach. Verwenden Sie mindestens 8 Zeichen.',
    'registerExpat.errors.invalidEmail': 'Ungültige E-Mail-Adresse.',
    'registerExpat.errors.network': 'Netzwerkfehler. Überprüfen Sie Ihre Verbindung.',
    'registerExpat.errors.timeout': 'Zeitüberschreitung. Bitte versuchen Sie es erneut.',
    'registerExpat.errors.permissions': 'Unzureichende Berechtigungen.',
    'registerExpat.errors.stripeUnsupported': 'Ihr Land wird von unserem Zahlungssystem noch nicht unterstützt.',
    'registerExpat.errors.stripe': 'Zahlungssystemfehler.',
  },

  pt: {
    // Client errors
    'registerClient.errors.generic': 'Ocorreu um erro. Por favor, tente novamente.',
    'registerClient.errors.emailAlreadyInUse': 'Este endereço de email já está em uso. Tente fazer login.',
    'registerClient.errors.emailLinkedToGoogle': 'Este email está vinculado a uma conta Google. Use "Continuar com Google".',
    'registerClient.errors.weakPassword': 'Senha muito fraca. Use pelo menos 8 caracteres.',
    'registerClient.errors.invalidEmail': 'Endereço de email inválido.',
    'registerClient.errors.network': 'Erro de rede. Verifique sua conexão.',
    'registerClient.errors.timeout': 'Tempo limite excedido. Tente novamente.',
    'registerClient.errors.permissions': 'Permissões insuficientes.',
    'registerClient.errors.stripeUnsupported': 'Seu país ainda não é suportado pelo nosso sistema de pagamento.',
    'registerClient.errors.stripe': 'Erro do sistema de pagamento.',

    // Lawyer errors
    'registerLawyer.errors.generic': 'Ocorreu um erro. Por favor, tente novamente.',
    'registerLawyer.errors.emailAlreadyInUse': 'Este endereço de email já está em uso. Tente fazer login.',
    'registerLawyer.errors.emailLinkedToGoogle': 'Este email está vinculado a uma conta Google. Use "Continuar com Google".',
    'registerLawyer.errors.weakPassword': 'Senha muito fraca. Use pelo menos 8 caracteres.',
    'registerLawyer.errors.invalidEmail': 'Endereço de email inválido.',
    'registerLawyer.errors.network': 'Erro de rede. Verifique sua conexão.',
    'registerLawyer.errors.timeout': 'Tempo limite excedido. Tente novamente.',
    'registerLawyer.errors.permissions': 'Permissões insuficientes.',
    'registerLawyer.errors.stripeUnsupported': 'Seu país ainda não é suportado pelo nosso sistema de pagamento.',
    'registerLawyer.errors.stripe': 'Erro do sistema de pagamento.',

    // Expat errors
    'registerExpat.errors.generic': 'Ocorreu um erro. Por favor, tente novamente.',
    'registerExpat.errors.emailAlreadyInUse': 'Este endereço de email já está em uso. Tente fazer login.',
    'registerExpat.errors.emailLinkedToGoogle': 'Este email está vinculado a uma conta Google. Use "Continuar com Google".',
    'registerExpat.errors.weakPassword': 'Senha muito fraca. Use pelo menos 8 caracteres.',
    'registerExpat.errors.invalidEmail': 'Endereço de email inválido.',
    'registerExpat.errors.network': 'Erro de rede. Verifique sua conexão.',
    'registerExpat.errors.timeout': 'Tempo limite excedido. Tente novamente.',
    'registerExpat.errors.permissions': 'Permissões insuficientes.',
    'registerExpat.errors.stripeUnsupported': 'Seu país ainda não é suportado pelo nosso sistema de pagamento.',
    'registerExpat.errors.stripe': 'Erro do sistema de pagamento.',
  },

  ru: {
    // Client errors
    'registerClient.errors.generic': 'Произошла ошибка. Пожалуйста, попробуйте снова.',
    'registerClient.errors.emailAlreadyInUse': 'Этот адрес электронной почты уже используется. Попробуйте войти.',
    'registerClient.errors.emailLinkedToGoogle': 'Эта почта привязана к аккаунту Google. Используйте "Продолжить с Google".',
    'registerClient.errors.weakPassword': 'Пароль слишком слабый. Используйте минимум 8 символов.',
    'registerClient.errors.invalidEmail': 'Неверный адрес электронной почты.',
    'registerClient.errors.network': 'Ошибка сети. Проверьте подключение.',
    'registerClient.errors.timeout': 'Превышено время ожидания. Попробуйте снова.',
    'registerClient.errors.permissions': 'Недостаточно прав.',
    'registerClient.errors.stripeUnsupported': 'Ваша страна пока не поддерживается нашей платежной системой.',
    'registerClient.errors.stripe': 'Ошибка платежной системы.',

    // Lawyer errors
    'registerLawyer.errors.generic': 'Произошла ошибка. Пожалуйста, попробуйте снова.',
    'registerLawyer.errors.emailAlreadyInUse': 'Этот адрес электронной почты уже используется. Попробуйте войти.',
    'registerLawyer.errors.emailLinkedToGoogle': 'Эта почта привязана к аккаунту Google. Используйте "Продолжить с Google".',
    'registerLawyer.errors.weakPassword': 'Пароль слишком слабый. Используйте минимум 8 символов.',
    'registerLawyer.errors.invalidEmail': 'Неверный адрес электронной почты.',
    'registerLawyer.errors.network': 'Ошибка сети. Проверьте подключение.',
    'registerLawyer.errors.timeout': 'Превышено время ожидания. Попробуйте снова.',
    'registerLawyer.errors.permissions': 'Недостаточно прав.',
    'registerLawyer.errors.stripeUnsupported': 'Ваша страна пока не поддерживается нашей платежной системой.',
    'registerLawyer.errors.stripe': 'Ошибка платежной системы.',

    // Expat errors
    'registerExpat.errors.generic': 'Произошла ошибка. Пожалуйста, попробуйте снова.',
    'registerExpat.errors.emailAlreadyInUse': 'Этот адрес электронной почты уже используется. Попробуйте войти.',
    'registerExpat.errors.emailLinkedToGoogle': 'Эта почта привязана к аккаунту Google. Используйте "Продолжить с Google".',
    'registerExpat.errors.weakPassword': 'Пароль слишком слабый. Используйте минимум 8 символов.',
    'registerExpat.errors.invalidEmail': 'Неверный адрес электронной почты.',
    'registerExpat.errors.network': 'Ошибка сети. Проверьте подключение.',
    'registerExpat.errors.timeout': 'Превышено время ожидания. Попробуйте снова.',
    'registerExpat.errors.permissions': 'Недостаточно прав.',
    'registerExpat.errors.stripeUnsupported': 'Ваша страна пока не поддерживается нашей платежной системой.',
    'registerExpat.errors.stripe': 'Ошибка платежной системы.',
  },

  ch: {
    // Client errors
    'registerClient.errors.generic': '发生错误。请重试。',
    'registerClient.errors.emailAlreadyInUse': '该电子邮件地址已被使用。尝试登录。',
    'registerClient.errors.emailLinkedToGoogle': '此电子邮件已链接到 Google 帐户。使用"继续使用 Google"。',
    'registerClient.errors.weakPassword': '密码太弱。至少使用 8 个字符。',
    'registerClient.errors.invalidEmail': '电子邮件地址无效。',
    'registerClient.errors.network': '网络错误。检查您的连接。',
    'registerClient.errors.timeout': '请求超时。请重试。',
    'registerClient.errors.permissions': '权限不足。',
    'registerClient.errors.stripeUnsupported': '我们的支付系统尚不支持您的国家。',
    'registerClient.errors.stripe': '支付系统错误。',

    // Lawyer errors
    'registerLawyer.errors.generic': '发生错误。请重试。',
    'registerLawyer.errors.emailAlreadyInUse': '该电子邮件地址已被使用。尝试登录。',
    'registerLawyer.errors.emailLinkedToGoogle': '此电子邮件已链接到 Google 帐户。使用"继续使用 Google"。',
    'registerLawyer.errors.weakPassword': '密码太弱。至少使用 8 个字符。',
    'registerLawyer.errors.invalidEmail': '电子邮件地址无效。',
    'registerLawyer.errors.network': '网络错误。检查您的连接。',
    'registerLawyer.errors.timeout': '请求超时。请重试。',
    'registerLawyer.errors.permissions': '权限不足。',
    'registerLawyer.errors.stripeUnsupported': '我们的支付系统尚不支持您的国家。',
    'registerLawyer.errors.stripe': '支付系统错误。',

    // Expat errors
    'registerExpat.errors.generic': '发生错误。请重试。',
    'registerExpat.errors.emailAlreadyInUse': '该电子邮件地址已被使用。尝试登录。',
    'registerExpat.errors.emailLinkedToGoogle': '此电子邮件已链接到 Google 帐户。使用"继续使用 Google"。',
    'registerExpat.errors.weakPassword': '密码太弱。至少使用 8 个字符。',
    'registerExpat.errors.invalidEmail': '电子邮件地址无效。',
    'registerExpat.errors.network': '网络错误。检查您的连接。',
    'registerExpat.errors.timeout': '请求超时。请重试。',
    'registerExpat.errors.permissions': '权限不足。',
    'registerExpat.errors.stripeUnsupported': '我们的支付系统尚不支持您的国家。',
    'registerExpat.errors.stripe': '支付系统错误。',
  },

  hi: {
    // Client errors
    'registerClient.errors.generic': 'एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
    'registerClient.errors.emailAlreadyInUse': 'यह ईमेल पता पहले से उपयोग में है। लॉगिन करने का प्रयास करें।',
    'registerClient.errors.emailLinkedToGoogle': 'यह ईमेल एक Google खाते से जुड़ा है। "Google के साथ जारी रखें" का उपयोग करें।',
    'registerClient.errors.weakPassword': 'पासवर्ड बहुत कमज़ोर है। कम से कम 8 वर्ण उपयोग करें।',
    'registerClient.errors.invalidEmail': 'अमान्य ईमेल पता।',
    'registerClient.errors.network': 'नेटवर्क त्रुटि। अपना कनेक्शन जांचें।',
    'registerClient.errors.timeout': 'अनुरोध समय समाप्त। कृपया पुनः प्रयास करें।',
    'registerClient.errors.permissions': 'अपर्याप्त अनुमतियां।',
    'registerClient.errors.stripeUnsupported': 'आपका देश अभी हमारे भुगतान सिस्टम द्वारा समर्थित नहीं है।',
    'registerClient.errors.stripe': 'भुगतान सिस्टम त्रुटि।',

    // Lawyer errors
    'registerLawyer.errors.generic': 'एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
    'registerLawyer.errors.emailAlreadyInUse': 'यह ईमेल पता पहले से उपयोग में है। लॉगिन करने का प्रयास करें।',
    'registerLawyer.errors.emailLinkedToGoogle': 'यह ईमेल एक Google खाते से जुड़ा है। "Google के साथ जारी रखें" का उपयोग करें।',
    'registerLawyer.errors.weakPassword': 'पासवर्ड बहुत कमज़ोर है। कम से कम 8 वर्ण उपयोग करें।',
    'registerLawyer.errors.invalidEmail': 'अमान्य ईमेल पता।',
    'registerLawyer.errors.network': 'नेटवर्क त्रुटि। अपना कनेक्शन जांचें।',
    'registerLawyer.errors.timeout': 'अनुरोध समय समाप्त। कृपया पुनः प्रयास करें।',
    'registerLawyer.errors.permissions': 'अपर्याप्त अनुमतियां।',
    'registerLawyer.errors.stripeUnsupported': 'आपका देश अभी हमारे भुगतान सिस्टम द्वारा समर्थित नहीं है।',
    'registerLawyer.errors.stripe': 'भुगतान सिस्टम त्रुटि।',

    // Expat errors
    'registerExpat.errors.generic': 'एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
    'registerExpat.errors.emailAlreadyInUse': 'यह ईमेल पता पहले से उपयोग में है। लॉगिन करने का प्रयास करें।',
    'registerExpat.errors.emailLinkedToGoogle': 'यह ईमेल एक Google खाते से जुड़ा है। "Google के साथ जारी रखें" का उपयोग करें।',
    'registerExpat.errors.weakPassword': 'पासवर्ड बहुत कमज़ोर है। कम से कम 8 वर्ण उपयोग करें।',
    'registerExpat.errors.invalidEmail': 'अमान्य ईमेल पता।',
    'registerExpat.errors.network': 'नेटवर्क त्रुटि। अपना कनेक्शन जांचें।',
    'registerExpat.errors.timeout': 'अनुरोध समय समाप्त। कृपया पुनः प्रयास करें।',
    'registerExpat.errors.permissions': 'अपर्याप्त अनुमतियां।',
    'registerExpat.errors.stripeUnsupported': 'आपका देश अभी हमारे भुगतान सिस्टम द्वारा समर्थित नहीं है।',
    'registerExpat.errors.stripe': 'भुगतान सिस्टम त्रुटि।',
  },

  ar: {
    // Client errors
    'registerClient.errors.generic': 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    'registerClient.errors.emailAlreadyInUse': 'عنوان البريد الإلكتروني هذا مستخدم بالفعل. حاول تسجيل الدخول.',
    'registerClient.errors.emailLinkedToGoogle': 'هذا البريد الإلكتروني مرتبط بحساب Google. استخدم "متابعة مع Google".',
    'registerClient.errors.weakPassword': 'كلمة المرور ضعيفة جدًا. استخدم 8 أحرف على الأقل.',
    'registerClient.errors.invalidEmail': 'عنوان البريد الإلكتروني غير صالح.',
    'registerClient.errors.network': 'خطأ في الشبكة. تحقق من اتصالك.',
    'registerClient.errors.timeout': 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
    'registerClient.errors.permissions': 'أذونات غير كافية.',
    'registerClient.errors.stripeUnsupported': 'بلدك غير مدعوم حاليًا من قبل نظام الدفع لدينا.',
    'registerClient.errors.stripe': 'خطأ في نظام الدفع.',

    // Lawyer errors
    'registerLawyer.errors.generic': 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    'registerLawyer.errors.emailAlreadyInUse': 'عنوان البريد الإلكتروني هذا مستخدم بالفعل. حاول تسجيل الدخول.',
    'registerLawyer.errors.emailLinkedToGoogle': 'هذا البريد الإلكتروني مرتبط بحساب Google. استخدم "متابعة مع Google".',
    'registerLawyer.errors.weakPassword': 'كلمة المرور ضعيفة جدًا. استخدم 8 أحرف على الأقل.',
    'registerLawyer.errors.invalidEmail': 'عنوان البريد الإلكتروني غير صالح.',
    'registerLawyer.errors.network': 'خطأ في الشبكة. تحقق من اتصالك.',
    'registerLawyer.errors.timeout': 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
    'registerLawyer.errors.permissions': 'أذونات غير كافية.',
    'registerLawyer.errors.stripeUnsupported': 'بلدك غير مدعوم حاليًا من قبل نظام الدفع لدينا.',
    'registerLawyer.errors.stripe': 'خطأ في نظام الدفع.',

    // Expat errors
    'registerExpat.errors.generic': 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    'registerExpat.errors.emailAlreadyInUse': 'عنوان البريد الإلكتروني هذا مستخدم بالفعل. حاول تسجيل الدخول.',
    'registerExpat.errors.emailLinkedToGoogle': 'هذا البريد الإلكتروني مرتبط بحساب Google. استخدم "متابعة مع Google".',
    'registerExpat.errors.weakPassword': 'كلمة المرور ضعيفة جدًا. استخدم 8 أحرف على الأقل.',
    'registerExpat.errors.invalidEmail': 'عنوان البريد الإلكتروني غير صالح.',
    'registerExpat.errors.network': 'خطأ في الشبكة. تحقق من اتصالك.',
    'registerExpat.errors.timeout': 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.',
    'registerExpat.errors.permissions': 'أذونات غير كافية.',
    'registerExpat.errors.stripeUnsupported': 'بلدك غير مدعوم حاليًا من قبل نظام الدفع لدينا.',
    'registerExpat.errors.stripe': 'خطأ في نظام الدفع.',
  },
};

// Langues à traiter
const LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'ch', 'hi', 'ar'];

function addKeys() {
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const lang of LANGUAGES) {
    const filePath = path.join(HELPER_DIR, `${lang}.json`);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      continue;
    }

    // Lire le fichier JSON existant
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    let added = 0;
    let skipped = 0;

    // Ajouter les nouvelles clés
    const newKeys = NEW_KEYS[lang] || {};
    for (const [key, value] of Object.entries(newKeys)) {
      if (data[key]) {
        skipped++;
      } else {
        data[key] = value;
        added++;
      }
    }

    // Trier les clés alphabétiquement
    const sortedData = Object.keys(data)
      .sort()
      .reduce((acc, key) => {
        acc[key] = data[key];
        return acc;
      }, {});

    // Écrire le fichier avec indentation de 2 espaces
    fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2) + '\n', 'utf8');

    console.log(`✅ ${lang}.json: ${added} clés ajoutées, ${skipped} existantes`);
    totalAdded += added;
    totalSkipped += skipped;
  }

  console.log(`\n📊 Total: ${totalAdded} clés ajoutées, ${totalSkipped} clés déjà existantes`);
  console.log(`✨ Migration terminée !`);
}

// Exécuter le script
addKeys();
