/**
 * Script pour ajouter la clause de frais de change aux CGV prestataires
 * Exécuter avec: node scripts/add-fx-clause.js
 */

const fs = require('fs');
const path = require('path');

// Clauses FX dans toutes les langues
const fxClauses = {
  fr: `
<h2>ARTICLE - FRAIS DE CHANGE ET DEVISES</h2>
<p><strong>1.</strong> Les paiements des clients peuvent être effectués en euros (EUR) ou en dollars américains (USD), selon le choix du client.</p>
<p><strong>2.</strong> Le prestataire reconnaît et accepte que si la devise du paiement diffère de la devise de son compte bancaire Stripe, des frais de conversion de change (environ 2% du montant) seront automatiquement appliqués par Stripe.</p>
<p><strong>3.</strong> Ces frais de conversion sont intégralement à la charge du prestataire et sont déduits du montant qui lui est versé.</p>
<p><strong>4.</strong> Le montant net perçu par le prestataire peut donc varier en fonction des taux de change en vigueur au moment du règlement.</p>
<p><strong>5.</strong> SOS-Expat ne peut être tenu responsable des fluctuations de change ni des frais appliqués par les prestataires de paiement (Stripe, PayPal).</p>
`,

  en: `
<h2>ARTICLE - CURRENCY EXCHANGE FEES</h2>
<p><strong>1.</strong> Client payments may be made in euros (EUR) or US dollars (USD), at the client's discretion.</p>
<p><strong>2.</strong> The provider acknowledges and accepts that if the payment currency differs from their Stripe bank account currency, currency conversion fees (approximately 2% of the amount) will be automatically applied by Stripe.</p>
<p><strong>3.</strong> These conversion fees are entirely borne by the provider and are deducted from the amount paid to them.</p>
<p><strong>4.</strong> The net amount received by the provider may therefore vary depending on the exchange rates in effect at the time of settlement.</p>
<p><strong>5.</strong> SOS-Expat cannot be held responsible for currency fluctuations or fees applied by payment service providers (Stripe, PayPal).</p>
`,

  es: `
<h2>ARTÍCULO - TASAS DE CAMBIO DE DIVISAS</h2>
<p><strong>1.</strong> Los pagos de los clientes pueden realizarse en euros (EUR) o dólares estadounidenses (USD), a elección del cliente.</p>
<p><strong>2.</strong> El proveedor reconoce y acepta que si la moneda del pago difiere de la moneda de su cuenta bancaria Stripe, se aplicarán automáticamente comisiones de conversión de divisas (aproximadamente el 2% del importe) por parte de Stripe.</p>
<p><strong>3.</strong> Estas comisiones de conversión corren íntegramente a cargo del proveedor y se deducen del importe que se le abona.</p>
<p><strong>4.</strong> El importe neto percibido por el proveedor puede variar en función de los tipos de cambio vigentes en el momento de la liquidación.</p>
<p><strong>5.</strong> SOS-Expat no se hace responsable de las fluctuaciones de los tipos de cambio ni de las comisiones aplicadas por los proveedores de servicios de pago (Stripe, PayPal).</p>
`,

  de: `
<h2>ARTIKEL - WÄHRUNGSUMTAUSCHGEBÜHREN</h2>
<p><strong>1.</strong> Kundenzahlungen können in Euro (EUR) oder US-Dollar (USD) nach Wahl des Kunden erfolgen.</p>
<p><strong>2.</strong> Der Anbieter erkennt an und akzeptiert, dass bei Abweichung der Zahlungswährung von der Währung seines Stripe-Bankkontos automatisch Währungsumrechnungsgebühren (ca. 2% des Betrags) von Stripe erhoben werden.</p>
<p><strong>3.</strong> Diese Umrechnungsgebühren gehen vollständig zu Lasten des Anbieters und werden vom ausgezahlten Betrag abgezogen.</p>
<p><strong>4.</strong> Der vom Anbieter erhaltene Nettobetrag kann daher je nach den zum Zeitpunkt der Abrechnung geltenden Wechselkursen variieren.</p>
<p><strong>5.</strong> SOS-Expat kann nicht für Wechselkursschwankungen oder von Zahlungsdienstleistern (Stripe, PayPal) erhobene Gebühren verantwortlich gemacht werden.</p>
`,

  pt: `
<h2>ARTIGO - TAXAS DE CÂMBIO</h2>
<p><strong>1.</strong> Os pagamentos dos clientes podem ser efetuados em euros (EUR) ou dólares americanos (USD), à escolha do cliente.</p>
<p><strong>2.</strong> O prestador reconhece e aceita que, se a moeda do pagamento diferir da moeda da sua conta bancária Stripe, serão automaticamente aplicadas taxas de conversão de câmbio (aproximadamente 2% do montante) pela Stripe.</p>
<p><strong>3.</strong> Estas taxas de conversão são inteiramente suportadas pelo prestador e são deduzidas do montante que lhe é pago.</p>
<p><strong>4.</strong> O montante líquido recebido pelo prestador pode, portanto, variar em função das taxas de câmbio em vigor no momento da liquidação.</p>
<p><strong>5.</strong> A SOS-Expat não pode ser responsabilizada pelas flutuações cambiais nem pelas taxas aplicadas pelos prestadores de serviços de pagamento (Stripe, PayPal).</p>
`,

  ru: `
<h2>СТАТЬЯ - КОМИССИЯ ЗА КОНВЕРТАЦИЮ ВАЛЮТЫ</h2>
<p><strong>1.</strong> Платежи клиентов могут осуществляться в евро (EUR) или долларах США (USD) по выбору клиента.</p>
<p><strong>2.</strong> Поставщик признает и соглашается с тем, что если валюта платежа отличается от валюты его банковского счета Stripe, комиссия за конвертацию валюты (примерно 2% от суммы) будет автоматически применена Stripe.</p>
<p><strong>3.</strong> Эти комиссии за конвертацию полностью несет поставщик и вычитаются из выплачиваемой ему суммы.</p>
<p><strong>4.</strong> Чистая сумма, получаемая поставщиком, может варьироваться в зависимости от обменных курсов, действующих на момент расчета.</p>
<p><strong>5.</strong> SOS-Expat не несет ответственности за колебания курсов валют или комиссии, взимаемые поставщиками платежных услуг (Stripe, PayPal).</p>
`,

  hi: `
<h2>अनुच्छेद - मुद्रा विनिमय शुल्क</h2>
<p><strong>1.</strong> ग्राहक भुगतान यूरो (EUR) या अमेरिकी डॉलर (USD) में किया जा सकता है, ग्राहक की पसंद के अनुसार।</p>
<p><strong>2.</strong> प्रदाता स्वीकार करता है कि यदि भुगतान मुद्रा उनके Stripe बैंक खाते की मुद्रा से भिन्न है, तो मुद्रा रूपांतरण शुल्क (लगभग 2%) Stripe द्वारा स्वचालित रूप से लागू किया जाएगा।</p>
<p><strong>3.</strong> ये रूपांतरण शुल्क पूरी तरह से प्रदाता द्वारा वहन किए जाते हैं और उन्हें भुगतान की गई राशि से काट लिए जाते हैं।</p>
<p><strong>4.</strong> प्रदाता को प्राप्त शुद्ध राशि निपटान के समय प्रभावी विनिमय दरों के आधार पर भिन्न हो सकती है।</p>
<p><strong>5.</strong> SOS-Expat मुद्रा उतार-चढ़ाव या भुगतान सेवा प्रदाताओं (Stripe, PayPal) द्वारा लागू शुल्क के लिए जिम्मेदार नहीं है।</p>
`,

  ar: `
<h2>المادة - رسوم صرف العملات</h2>
<p><strong>1.</strong> يمكن إجراء مدفوعات العملاء باليورو (EUR) أو بالدولار الأمريكي (USD)، حسب اختيار العميل.</p>
<p><strong>2.</strong> يقر مقدم الخدمة ويوافق على أنه إذا كانت عملة الدفع مختلفة عن عملة حسابه المصرفي في Stripe، فسيتم تطبيق رسوم تحويل العملات تلقائياً (حوالي 2% من المبلغ) من قبل Stripe.</p>
<p><strong>3.</strong> رسوم التحويل هذه يتحملها مقدم الخدمة بالكامل ويتم خصمها من المبلغ المدفوع له.</p>
<p><strong>4.</strong> قد يختلف صافي المبلغ الذي يتلقاه مقدم الخدمة اعتماداً على أسعار الصرف السارية وقت التسوية.</p>
<p><strong>5.</strong> لا يمكن تحميل SOS-Expat مسؤولية تقلبات العملة أو الرسوم المطبقة من قبل مقدمي خدمات الدفع (Stripe، PayPal).</p>
`,

  ch: `
<h2>条款 - 货币兑换费用</h2>
<p><strong>1.</strong> 客户付款可以使用欧元 (EUR) 或美元 (USD)，由客户自行选择。</p>
<p><strong>2.</strong> 服务提供商承认并接受，如果付款货币与其 Stripe 银行账户货币不同，Stripe 将自动收取货币兑换费（约为金额的 2%）。</p>
<p><strong>3.</strong> 这些兑换费用完全由服务提供商承担，并从支付给他们的金额中扣除。</p>
<p><strong>4.</strong> 服务提供商收到的净额可能会根据结算时的汇率而有所不同。</p>
<p><strong>5.</strong> SOS-Expat 不对货币波动或支付服务提供商（Stripe、PayPal）收取的费用负责。</p>
`
};

// Types de documents à mettre à jour
const docTypes = ['terms_lawyers', 'terms_expats'];

// Charger le fichier JSON
const jsonPath = path.join(__dirname, '../src/services/legalDocumentsData.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let updatedCount = 0;

// Mettre à jour chaque document
data.forEach((doc) => {
  if (docTypes.includes(doc.type) && fxClauses[doc.language]) {
    // Vérifier si la clause n'est pas déjà présente
    if (!doc.content.includes('FRAIS DE CHANGE') &&
        !doc.content.includes('CURRENCY EXCHANGE') &&
        !doc.content.includes('TASAS DE CAMBIO') &&
        !doc.content.includes('WÄHRUNGSUMTAUSCH') &&
        !doc.content.includes('TAXAS DE CÂMBIO') &&
        !doc.content.includes('КОНВЕРТАЦИЮ ВАЛЮТЫ') &&
        !doc.content.includes('मुद्रा विनिमय') &&
        !doc.content.includes('صرف العملات') &&
        !doc.content.includes('货币兑换')) {

      // Ajouter la clause à la fin du contenu
      doc.content = doc.content.trim() + fxClauses[doc.language];
      doc.version = '2.3'; // Incrémenter la version
      updatedCount++;
      console.log(`✅ Updated: ${doc.id}`);
    } else {
      console.log(`⏭️ Skipped (already has clause): ${doc.id}`);
    }
  }
});

// Sauvegarder le fichier
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');

console.log(`\n🎉 Done! Updated ${updatedCount} documents.`);
console.log(`\n📌 Next steps:`);
console.log(`1. Run migration: npm run migrate:legal-docs`);
console.log(`2. Or update directly in Admin → Documents Légaux`);
