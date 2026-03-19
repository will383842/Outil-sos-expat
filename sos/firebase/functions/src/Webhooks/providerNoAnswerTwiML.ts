import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'express';
import { twilioCallManager } from '../TwilioCallManager';
import { logError } from '../utils/logs/logError';
// P0 FIX: Import call region from centralized config - dedicated region for call functions
import { CALL_FUNCTIONS_REGION } from '../configs/callRegion';
import { validateTwilioWebhookSignature, TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET } from '../lib/twilio';

// Helper to escape XML
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Voice messages for provider no-answer in different languages (19 — aligned with voicePrompts.json)
const PROVIDER_NO_ANSWER_MESSAGES: Record<string, string> = {
  fr: "Le prestataire n'a pas répondu, nos excuses. Vous serez remboursé immédiatement. Vous pouvez choisir un autre prestataire.",
  en: "The service provider did not answer, our apologies. You will be instantly refunded. You may choose another provider.",
  es: "El proveedor de servicios no respondió, nuestras disculpas. Será reembolsado de inmediato. Puede elegir otro proveedor.",
  de: "Der Dienstleister hat nicht geantwortet, unsere Entschuldigung. Sie werden sofort erstattet. Sie können einen anderen Anbieter wählen.",
  ru: "Поставщик услуг не ответил, наши извинения. Вам будет немедленно возвращена оплата. Вы можете выбрать другого поставщика.",
  hi: "सेवा प्रदाता ने जवाब नहीं दिया, हमारी क्षमा याचना। आपको तुरंत धनवापसी की जाएगी। आप दूसरा प्रदाता चुन सकते हैं।",
  pt: "O prestador de serviços não respondeu, nossas desculpas. Você será reembolsado instantaneamente. Você pode escolher outro prestador.",
  ar: "لم يرد مقدم الخدمة، اعتذارنا. سيتم استرداد أموالك على الفور. يمكنك اختيار مقدم خدمة آخر.",
  zh: "服务提供商没有接听，我们深表歉意。您将立即获得退款。您可以选择其他提供商。",
  bn: "সেবা প্রদানকারী উত্তর দেননি, আমরা দুঃখিত। আপনাকে তাৎক্ষণিকভাবে ফেরত দেওয়া হবে। আপনি অন্য প্রদানকারী বেছে নিতে পারেন।",
  ur: "سروس فراہم کنندہ نے جواب نہیں دیا، ہمیں افسوس ہے۔ آپ کو فوری طور پر رقم واپس کر دی جائے گی۔ آپ دوسرا فراہم کنندہ منتخب کر سکتے ہیں۔",
  id: "Penyedia layanan tidak menjawab, maaf atas ketidaknyamanan ini. Anda akan segera mendapat pengembalian dana. Anda dapat memilih penyedia lain.",
  ja: "サービス提供者が応答しませんでした。申し訳ございません。すぐに返金されます。別の提供者をお選びいただけます。",
  tr: "Hizmet sağlayıcı yanıt vermedi, özür dileriz. Ücretiniz hemen iade edilecektir. Başka bir sağlayıcı seçebilirsiniz.",
  it: "Il fornitore del servizio non ha risposto, ci scusiamo. Riceverai un rimborso immediato. Puoi scegliere un altro fornitore.",
  ko: "서비스 제공자가 응답하지 않았습니다. 죄송합니다. 즉시 환불됩니다. 다른 제공자를 선택하실 수 있습니다.",
  vi: "Nhà cung cấp dịch vụ không trả lời, chúng tôi xin lỗi. Bạn sẽ được hoàn tiền ngay lập tức. Bạn có thể chọn nhà cung cấp khác.",
  fa: "ارائه‌دهنده خدمات پاسخ نداد، پوزش ما را بپذیرید. مبلغ شما فوراً بازگردانده خواهد شد. می‌توانید ارائه‌دهنده دیگری انتخاب کنید.",
  pl: "Usługodawca nie odpowiedział, przepraszamy. Otrzymasz natychmiastowy zwrot pieniędzy. Możesz wybrać innego usługodawcę.",
  ch: "服务提供商没有接听，我们深表歉意。您将立即获得退款。您可以选择其他提供商。",
  // 31 new languages (50 total)
  nl: "De dienstverlener heeft niet geantwoord, onze excuses. U wordt onmiddellijk terugbetaald. U kunt een andere dienstverlener kiezen.",
  sv: "Tjänsteleverantören svarade inte, vi ber om ursäkt. Du kommer att återbetalas omedelbart. Du kan välja en annan leverantör.",
  da: "Tjenesteudbyderen svarede ikke, vi beklager. Du vil blive refunderet øjeblikkeligt. Du kan vælge en anden udbyder.",
  nb: "Tjenesteleverandøren svarte ikke, vi beklager. Du vil bli refundert umiddelbart. Du kan velge en annen leverandør.",
  fi: "Palveluntarjoaja ei vastannut, pahoittelumme. Saat välittömän hyvityksen. Voit valita toisen palveluntarjoajan.",
  el: "Ο πάροχος υπηρεσιών δεν απάντησε, ζητούμε συγγνώμη. Θα λάβετε άμεση επιστροφή χρημάτων. Μπορείτε να επιλέξετε άλλον πάροχο.",
  he: "נותן השירות לא ענה, אנו מתנצלים. תקבלו החזר מיידי. תוכלו לבחור נותן שירות אחר.",
  th: "ผู้ให้บริการไม่ได้รับสาย ขออภัยในความไม่สะดวก คุณจะได้รับเงินคืนทันที คุณสามารถเลือกผู้ให้บริการรายอื่นได้",
  ms: "Penyedia perkhidmatan tidak menjawab, maaf atas kesulitan ini. Anda akan dikembalikan wang dengan segera. Anda boleh memilih penyedia lain.",
  cs: "Poskytovatel služby neodpověděl, omlouváme se. Peníze vám budou okamžitě vráceny. Můžete si vybrat jiného poskytovatele.",
  hu: "A szolgáltató nem válaszolt, elnézést kérünk. Azonnal visszatérítjük az összeget. Választhat másik szolgáltatót.",
  ro: "Furnizorul de servicii nu a răspuns, ne cerem scuze. Veți fi rambursat imediat. Puteți alege un alt furnizor.",
  uk: "Постачальник послуг не відповів, вибачте. Вам буде негайно повернено кошти. Ви можете обрати іншого постачальника.",
  sk: "Poskytovateľ služby neodpovedal, ospravedlňujeme sa. Peniaze vám budú okamžite vrátené. Môžete si vybrať iného poskytovateľa.",
  bg: "Доставчикът на услуги не отговори, извиняваме се. Ще получите незабавно възстановяване на сумата. Можете да изберете друг доставчик.",
  hr: "Pružatelj usluga nije odgovorio, ispričavamo se. Bit ćete odmah refundirani. Možete odabrati drugog pružatelja.",
  sr: "Пружалац услуга није одговорио, извињавамо се. Биће вам одмах враћен новац. Можете изабрати другог пружаоца.",
  sl: "Ponudnik storitev se ni odzval, opravičujemo se. Takoj boste prejeli povračilo. Izberete lahko drugega ponudnika.",
  lt: "Paslaugų teikėjas neatsakė, atsiprašome. Jums bus nedelsiant grąžinti pinigai. Galite pasirinkti kitą teikėją.",
  lv: "Pakalpojumu sniedzējs neatbildēja, atvainojamies. Jums tiks nekavējoties atmaksāta nauda. Varat izvēlēties citu pakalpojumu sniedzēju.",
  et: "Teenusepakkuja ei vastanud, vabandame. Teile tagastatakse raha kohe. Saate valida teise teenusepakkuja.",
  ca: "El proveïdor de serveis no ha respost, disculpeu. Se us retornarà l'import immediatament. Podeu triar un altre proveïdor.",
  tl: "Hindi sumagot ang tagapagbigay ng serbisyo, humihingi kami ng paumanhin. Agad na maibabalik ang inyong bayad. Maaari kayong pumili ng ibang tagapagbigay ng serbisyo.",
  sw: "Mtoa huduma hakujibu, tunakuomba radhi. Utarudishiwa pesa mara moja. Unaweza kuchagua mtoa huduma mwingine.",
  af: "Die diensverskaffer het nie geantwoord nie, ons verskoning. U sal onmiddellik terugbetaal word. U kan 'n ander verskaffer kies.",
  ta: "சேவை வழங்குநர் பதிலளிக்கவில்லை, மன்னிக்கவும். உங்களுக்கு உடனடியாக பணம் திரும்பப்படும். மற்றொரு வழங்குநரை தேர்வு செய்யலாம்.",
  ka: "სერვისის მიმწოდებელმა არ უპასუხა, ბოდიშს გიხდით. თანხა დაუყოვნებლივ დაგიბრუნდებათ. შეგიძლიათ აირჩიოთ სხვა მიმწოდებელი.",
  sq: "Ofruesi i shërbimit nuk u përgjigj, na vjen keq. Do të rimbursoheni menjëherë. Mund të zgjidhni një ofrues tjetër.",
  ne: "सेवा प्रदायकले जवाफ दिएनन्, हामी माफी चाहन्छौं। तपाईंलाई तुरुन्तै फिर्ता गरिनेछ। तपाईं अर्को प्रदायक छनौट गर्न सक्नुहुन्छ।",
  gu: "સેવા પ્રદાતાએ જવાબ આપ્યો નથી, અમે માફી માગીએ છીએ. તમને તાત્કાલિક રિફંડ મળશે. તમે અન્ય પ્રદાતા પસંદ કરી શકો છો.",
  mk: "Давателот на услуги не одговори, се извинуваме. Ќе ви бидат вратени парите веднаш. Можете да изберете друг давател.",
};

const VOICE_LOCALES: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
  de: "de-DE",
  ru: "ru-RU",
  zh: "zh-CN",
  ar: "ar-SA",
  hi: "hi-IN",
  bn: "bn-IN",
  ur: "hi-IN", // Urdu → Hindi TTS (mutually intelligible spoken)
  id: "id-ID",
  ja: "ja-JP",
  tr: "tr-TR",
  it: "it-IT",
  ko: "ko-KR",
  vi: "vi-VN",
  fa: "ar-XA", // Persian → Arabic TTS (closest supported)
  pl: "pl-PL",
  ch: "zh-CN",
  // 31 new languages (50 total)
  nl: "nl-NL", sv: "sv-SE", da: "da-DK", nb: "nb-NO", fi: "fi-FI",
  el: "el-GR", he: "he-IL", th: "th-TH", ms: "ms-MY", cs: "cs-CZ",
  hu: "hu-HU", ro: "ro-RO", uk: "uk-UA", sk: "sk-SK", bg: "bg-BG",
  hr: "hr-HR", sr: "sr-RS", sl: "sl-SI", lt: "lt-LT", lv: "lv-LV",
  et: "et-EE", ca: "ca-ES", tl: "fil-PH", sw: "sw-KE", af: "af-ZA",
  ta: "ta-IN", gu: "gu-IN",
  ka: "ru-RU", // Georgian → Russian TTS
  sq: "it-IT", // Albanian → Italian TTS
  ne: "hi-IN", // Nepali → Hindi TTS
  mk: "bg-BG", // Macedonian → Bulgarian TTS
};

/**
 * Webhook endpoint that returns TwiML for provider no-answer message
 * This is called when redirecting the client's call after provider doesn't answer
 */
export const providerNoAnswerTwiML = onRequest(
  {
    // P0 FIX 2026-02-04: Migrated to dedicated region for call functions to avoid quota issues
    region: CALL_FUNCTIONS_REGION,
    // P0 CRITICAL FIX 2026-02-04: Allow unauthenticated access for Twilio webhooks (Cloud Run requires explicit public access)
    invoker: "public",
    memory: '256MiB',
    cpu: 0.083,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1,
    // P0 FIX: Add secrets for Twilio signature validation
    secrets: [TWILIO_AUTH_TOKEN_SECRET, TWILIO_ACCOUNT_SID_SECRET]
  },
  async (req: Request, res: Response) => {
    try {
      // P0 SECURITY: Validate Twilio signature
      if (!validateTwilioWebhookSignature(req as any, res as any)) {
        console.error("[providerNoAnswerTwiML] Invalid Twilio signature - rejecting request");
        return;
      }

      // P1 SECURITY: CallSid guard - reject requests without a valid CallSid
      // Note: CallSid may be in query (GET redirect) or body (POST webhook)
      const callSid = req.body?.CallSid || req.query.CallSid as string;
      const lang = (req.query.lang as string) || 'en';

      if (!callSid || typeof callSid !== 'string' || !callSid.startsWith('CA')) {
        console.error(`[providerNoAnswerTwiML] Missing or invalid CallSid: ${callSid} — returning TwiML fallback`);
        // Return TwiML instead of HTTP error so Twilio doesn't play default English "Good bye"
        const msg = PROVIDER_NO_ANSWER_MESSAGES[lang] || PROVIDER_NO_ANSWER_MESSAGES['en'];
        const loc = VOICE_LOCALES[lang] || VOICE_LOCALES['en'];
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice="alice" language="${loc}">${escapeXml(msg)}</Say>\n  <Hangup/>\n</Response>`);
        return;
      }

      const sessionId = req.query.sessionId as string;

      if (!sessionId) {
        console.warn('providerNoAnswerTwiML: Missing sessionId — returning TwiML fallback');
        const msg = PROVIDER_NO_ANSWER_MESSAGES[lang] || PROVIDER_NO_ANSWER_MESSAGES['en'];
        const loc = VOICE_LOCALES[lang] || VOICE_LOCALES['en'];
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice="alice" language="${loc}">${escapeXml(msg)}</Say>\n  <Hangup/>\n</Response>`);
        return;
      }

      // Get the session to verify it exists
      const session = await twilioCallManager.getCallSession(sessionId);
      if (!session) {
        console.warn(`providerNoAnswerTwiML: Session not found: ${sessionId} — returning TwiML fallback`);
        const msg = PROVIDER_NO_ANSWER_MESSAGES[lang] || PROVIDER_NO_ANSWER_MESSAGES['en'];
        const loc = VOICE_LOCALES[lang] || VOICE_LOCALES['en'];
        res.type('text/xml');
        res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice="alice" language="${loc}">${escapeXml(msg)}</Say>\n  <Hangup/>\n</Response>`);
        return;
      }

      // Get message in the appropriate language
      const message = PROVIDER_NO_ANSWER_MESSAGES[lang] || PROVIDER_NO_ANSWER_MESSAGES['en'];
      const ttsLocale = VOICE_LOCALES[lang] || VOICE_LOCALES['en'];

      // Generate TwiML
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${ttsLocale}">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;

      res.type('text/xml');
      res.send(twiml);

    } catch (error) {
      console.error('❌ Erreur providerNoAnswerTwiML:', error);
      await logError('providerNoAnswerTwiML:error', error);

      // Return fallback TwiML — preserve user's language from query param
      const fallbackLang = (req.query.lang as string) || 'en';
      const fallbackMessage = PROVIDER_NO_ANSWER_MESSAGES[fallbackLang] || PROVIDER_NO_ANSWER_MESSAGES['en'];
      const fallbackLocale = VOICE_LOCALES[fallbackLang] || VOICE_LOCALES['en'];
      const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${fallbackLocale}">${escapeXml(fallbackMessage)}</Say>
  <Hangup/>
</Response>`;

      res.type('text/xml');
      res.status(200).send(fallbackTwiml);
    }
  }
);

