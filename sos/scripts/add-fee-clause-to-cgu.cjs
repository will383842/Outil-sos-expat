/**
 * Ajoute la clause "Frais de traitement et de versement" aux CGU Avocats et Expatriés
 * dans Firestore (collection legal_documents) — 9 langues.
 *
 * Usage:
 *   node scripts/add-fee-clause-to-cgu.cjs
 *   node scripts/add-fee-clause-to-cgu.cjs --dry-run   (prévisualise sans écrire)
 *
 * Le script APPEND la clause au contenu HTML existant de chaque document.
 * Si la clause est déjà présente (détection par marqueur), elle est ignorée.
 */

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const app = initializeApp({ projectId: "sos-urgently-ac307" });
const db = getFirestore(app);

const DRY_RUN = process.argv.includes("--dry-run");

// Marqueur unique pour détecter si la clause est déjà ajoutée
const CLAUSE_MARKER = '<!-- FEE_CLAUSE_V1 -->';

// ============================================================
// Clauses dans les 9 langues
// ============================================================
const FEE_CLAUSES = {
  fr: {
    title: "Frais de traitement et de versement",
    html: `
${CLAUSE_MARKER}
<h2>Frais de traitement et de versement</h2>

<h3>1. Principe général</h3>
<p>Le Client paie le prix affiché pour la consultation. SOS-Expat perçoit une commission de mise en relation (« Frais de mise en relation »). Le solde, déduction faite de cette commission, constitue la rémunération brute du Prestataire (« Rémunération Brute »).</p>

<h3>2. Frais de traitement des paiements</h3>
<p>Les paiements sont traités par des prestataires de services de paiement tiers (Stripe, PayPal ou tout autre prestataire sélectionné par SOS-Expat). Ces prestataires facturent des frais de traitement qui incluent :</p>
<ul>
  <li><strong>Frais de transaction</strong> : un pourcentage du montant de la transaction, majoré d'un montant fixe par opération (par exemple : 2,9 % + 0,25 € pour les paiements par carte en euros).</li>
  <li><strong>Frais de conversion de devise</strong> : lorsque la devise de paiement du Client diffère de la devise de versement du Prestataire, des frais de conversion peuvent s'appliquer (généralement entre 1 % et 3 % selon le prestataire de paiement).</li>
  <li><strong>Frais de versement</strong> (PayPal uniquement) : des frais supplémentaires peuvent s'appliquer lors du transfert des fonds vers le compte du Prestataire.</li>
</ul>

<h3>3. Imputation des frais</h3>
<p>Conformément à la pratique standard des plateformes de mise en relation professionnelle, <strong>les frais de traitement et de versement sont déduits de la Rémunération Brute du Prestataire</strong>. Le montant effectivement versé au Prestataire (« Rémunération Nette ») correspond à la Rémunération Brute diminuée de l'ensemble des frais de traitement applicables.</p>
<p>La commission de mise en relation perçue par SOS-Expat n'est pas impactée par ces frais.</p>

<h3>4. Transparence</h3>
<p>Les taux de frais applicables sont consultables à tout moment dans l'espace personnel du Prestataire. Un détail des frais déduits est fourni pour chaque transaction dans l'historique des paiements. SOS-Expat s'engage à informer les Prestataires de toute modification significative des taux de frais avec un préavis raisonnable de trente (30) jours.</p>

<h3>5. Exemple illustratif</h3>
<p>Pour une consultation facturée 49 € au Client :</p>
<ul>
  <li>Commission SOS-Expat : 19 € (fixe)</li>
  <li>Rémunération Brute du Prestataire : 30 €</li>
  <li>Frais de traitement estimés (Stripe, carte EUR) : ≈ 1,67 €</li>
  <li><strong>Rémunération Nette versée au Prestataire : ≈ 28,33 €</strong></li>
</ul>
<p><em>Les montants ci-dessus sont donnés à titre indicatif. Les frais réels peuvent varier selon le mode de paiement, la devise et le prestataire de paiement utilisés.</em></p>
`,
  },

  en: {
    title: "Payment Processing and Disbursement Fees",
    html: `
${CLAUSE_MARKER}
<h2>Payment Processing and Disbursement Fees</h2>

<h3>1. General Principle</h3>
<p>The Client pays the displayed price for the consultation. SOS-Expat receives a referral commission ("Referral Fee"). The balance, after deducting this commission, constitutes the Provider's gross remuneration ("Gross Remuneration").</p>

<h3>2. Payment Processing Fees</h3>
<p>Payments are processed by third-party payment service providers (Stripe, PayPal, or any other provider selected by SOS-Expat). These providers charge processing fees that include:</p>
<ul>
  <li><strong>Transaction fees</strong>: a percentage of the transaction amount plus a fixed amount per transaction (for example: 2.9% + €0.25 for card payments in euros).</li>
  <li><strong>Currency conversion fees</strong>: when the Client's payment currency differs from the Provider's disbursement currency, conversion fees may apply (typically between 1% and 3% depending on the payment provider).</li>
  <li><strong>Disbursement fees</strong> (PayPal only): additional fees may apply when transferring funds to the Provider's account.</li>
</ul>

<h3>3. Fee Allocation</h3>
<p>In accordance with standard practice on professional matchmaking platforms, <strong>processing and disbursement fees are deducted from the Provider's Gross Remuneration</strong>. The amount actually paid to the Provider ("Net Remuneration") equals the Gross Remuneration minus all applicable processing fees.</p>
<p>The referral commission received by SOS-Expat is not affected by these fees.</p>

<h3>4. Transparency</h3>
<p>Applicable fee rates are available at any time in the Provider's personal dashboard. A detailed breakdown of fees deducted is provided for each transaction in the payment history. SOS-Expat commits to informing Providers of any significant change in fee rates with reasonable notice of thirty (30) days.</p>

<h3>5. Illustrative Example</h3>
<p>For a consultation billed at €49 to the Client:</p>
<ul>
  <li>SOS-Expat commission: €19 (fixed)</li>
  <li>Provider's Gross Remuneration: €30</li>
  <li>Estimated processing fees (Stripe, EUR card): ≈ €1.67</li>
  <li><strong>Net Remuneration paid to the Provider: ≈ €28.33</strong></li>
</ul>
<p><em>The amounts above are provided for illustrative purposes only. Actual fees may vary depending on the payment method, currency, and payment provider used.</em></p>
`,
  },

  es: {
    title: "Gastos de procesamiento y desembolso de pagos",
    html: `
${CLAUSE_MARKER}
<h2>Gastos de procesamiento y desembolso de pagos</h2>

<h3>1. Principio general</h3>
<p>El Cliente paga el precio indicado por la consulta. SOS-Expat recibe una comisión de intermediación (« Gastos de intermediación »). El saldo, una vez deducida esta comisión, constituye la remuneración bruta del Prestador (« Remuneración Bruta »).</p>

<h3>2. Gastos de procesamiento de pagos</h3>
<p>Los pagos son procesados por proveedores de servicios de pago de terceros (Stripe, PayPal u otro proveedor seleccionado por SOS-Expat). Estos proveedores cobran gastos de procesamiento que incluyen:</p>
<ul>
  <li><strong>Gastos de transacción</strong>: un porcentaje del importe de la transacción más un importe fijo por operación (por ejemplo: 2,9 % + 0,25 € para pagos con tarjeta en euros).</li>
  <li><strong>Gastos de conversión de divisas</strong>: cuando la divisa de pago del Cliente difiere de la divisa de desembolso del Prestador, pueden aplicarse gastos de conversión (generalmente entre el 1 % y el 3 % según el proveedor de pago).</li>
  <li><strong>Gastos de desembolso</strong> (solo PayPal): pueden aplicarse gastos adicionales al transferir fondos a la cuenta del Prestador.</li>
</ul>

<h3>3. Imputación de gastos</h3>
<p>De conformidad con la práctica estándar de las plataformas de intermediación profesional, <strong>los gastos de procesamiento y desembolso se deducen de la Remuneración Bruta del Prestador</strong>. El importe efectivamente abonado al Prestador (« Remuneración Neta ») corresponde a la Remuneración Bruta menos todos los gastos de procesamiento aplicables.</p>
<p>La comisión de intermediación percibida por SOS-Expat no se ve afectada por estos gastos.</p>

<h3>4. Transparencia</h3>
<p>Las tasas de gastos aplicables están disponibles en cualquier momento en el espacio personal del Prestador. Se proporciona un desglose detallado de los gastos deducidos para cada transacción en el historial de pagos. SOS-Expat se compromete a informar a los Prestadores de cualquier modificación significativa de las tasas de gastos con un preaviso razonable de treinta (30) días.</p>

<h3>5. Ejemplo ilustrativo</h3>
<p>Para una consulta facturada a 49 € al Cliente:</p>
<ul>
  <li>Comisión SOS-Expat: 19 € (fija)</li>
  <li>Remuneración Bruta del Prestador: 30 €</li>
  <li>Gastos de procesamiento estimados (Stripe, tarjeta EUR): ≈ 1,67 €</li>
  <li><strong>Remuneración Neta abonada al Prestador: ≈ 28,33 €</strong></li>
</ul>
<p><em>Los importes anteriores se proporcionan a título indicativo. Los gastos reales pueden variar según el método de pago, la divisa y el proveedor de pago utilizado.</em></p>
`,
  },

  de: {
    title: "Zahlungsabwicklungs- und Auszahlungsgebühren",
    html: `
${CLAUSE_MARKER}
<h2>Zahlungsabwicklungs- und Auszahlungsgebühren</h2>

<h3>1. Grundprinzip</h3>
<p>Der Kunde zahlt den angezeigten Preis für die Beratung. SOS-Expat erhält eine Vermittlungsprovision (« Vermittlungsgebühr »). Der Restbetrag nach Abzug dieser Provision bildet die Bruttovergütung des Dienstleisters (« Bruttovergütung »).</p>

<h3>2. Zahlungsabwicklungsgebühren</h3>
<p>Die Zahlungen werden von Drittanbietern für Zahlungsdienste verarbeitet (Stripe, PayPal oder ein anderer von SOS-Expat ausgewählter Anbieter). Diese Anbieter erheben Bearbeitungsgebühren, die Folgendes umfassen:</p>
<ul>
  <li><strong>Transaktionsgebühren</strong>: ein Prozentsatz des Transaktionsbetrags zuzüglich eines Festbetrags pro Vorgang (zum Beispiel: 2,9 % + 0,25 € für Kartenzahlungen in Euro).</li>
  <li><strong>Währungsumrechnungsgebühren</strong>: Wenn die Zahlungswährung des Kunden von der Auszahlungswährung des Dienstleisters abweicht, können Umrechnungsgebühren anfallen (in der Regel zwischen 1 % und 3 %, je nach Zahlungsanbieter).</li>
  <li><strong>Auszahlungsgebühren</strong> (nur PayPal): Bei der Überweisung von Geldern auf das Konto des Dienstleisters können zusätzliche Gebühren anfallen.</li>
</ul>

<h3>3. Zurechnung der Gebühren</h3>
<p>Gemäß der Standardpraxis professioneller Vermittlungsplattformen werden <strong>die Bearbeitungs- und Auszahlungsgebühren von der Bruttovergütung des Dienstleisters abgezogen</strong>. Der tatsächlich an den Dienstleister ausgezahlte Betrag (« Nettovergütung ») entspricht der Bruttovergütung abzüglich aller anfallenden Bearbeitungsgebühren.</p>
<p>Die von SOS-Expat erhaltene Vermittlungsprovision wird durch diese Gebühren nicht beeinträchtigt.</p>

<h3>4. Transparenz</h3>
<p>Die geltenden Gebührensätze sind jederzeit im persönlichen Bereich des Dienstleisters einsehbar. Für jede Transaktion wird eine detaillierte Aufschlüsselung der abgezogenen Gebühren im Zahlungsverlauf bereitgestellt. SOS-Expat verpflichtet sich, die Dienstleister über jede wesentliche Änderung der Gebührensätze mit einer angemessenen Frist von dreißig (30) Tagen zu informieren.</p>

<h3>5. Veranschaulichendes Beispiel</h3>
<p>Für eine dem Kunden mit 49 € in Rechnung gestellte Beratung:</p>
<ul>
  <li>SOS-Expat-Provision: 19 € (fest)</li>
  <li>Bruttovergütung des Dienstleisters: 30 €</li>
  <li>Geschätzte Bearbeitungsgebühren (Stripe, EUR-Karte): ≈ 1,67 €</li>
  <li><strong>An den Dienstleister ausgezahlte Nettovergütung: ≈ 28,33 €</strong></li>
</ul>
<p><em>Die oben genannten Beträge dienen nur zur Veranschaulichung. Die tatsächlichen Gebühren können je nach Zahlungsmethode, Währung und verwendetem Zahlungsanbieter variieren.</em></p>
`,
  },

  pt: {
    title: "Taxas de processamento e desembolso de pagamentos",
    html: `
${CLAUSE_MARKER}
<h2>Taxas de processamento e desembolso de pagamentos</h2>

<h3>1. Princípio geral</h3>
<p>O Cliente paga o preço apresentado pela consulta. A SOS-Expat recebe uma comissão de intermediação (« Taxa de intermediação »). O saldo, após dedução desta comissão, constitui a remuneração bruta do Prestador (« Remuneração Bruta »).</p>

<h3>2. Taxas de processamento de pagamentos</h3>
<p>Os pagamentos são processados por prestadores terceiros de serviços de pagamento (Stripe, PayPal ou outro prestador selecionado pela SOS-Expat). Esses prestadores cobram taxas de processamento que incluem:</p>
<ul>
  <li><strong>Taxas de transação</strong>: uma percentagem do valor da transação acrescida de um valor fixo por operação (por exemplo: 2,9 % + 0,25 € para pagamentos com cartão em euros).</li>
  <li><strong>Taxas de conversão de moeda</strong>: quando a moeda de pagamento do Cliente difere da moeda de desembolso do Prestador, podem aplicar-se taxas de conversão (geralmente entre 1 % e 3 % dependendo do prestador de pagamento).</li>
  <li><strong>Taxas de desembolso</strong> (apenas PayPal): podem aplicar-se taxas adicionais na transferência de fundos para a conta do Prestador.</li>
</ul>

<h3>3. Imputação das taxas</h3>
<p>Em conformidade com a prática padrão das plataformas de intermediação profissional, <strong>as taxas de processamento e desembolso são deduzidas da Remuneração Bruta do Prestador</strong>. O montante efetivamente pago ao Prestador (« Remuneração Líquida ») corresponde à Remuneração Bruta menos todas as taxas de processamento aplicáveis.</p>
<p>A comissão de intermediação recebida pela SOS-Expat não é afetada por estas taxas.</p>

<h3>4. Transparência</h3>
<p>As taxas aplicáveis estão disponíveis a qualquer momento no espaço pessoal do Prestador. Um detalhamento das taxas deduzidas é fornecido para cada transação no histórico de pagamentos. A SOS-Expat compromete-se a informar os Prestadores de qualquer alteração significativa das taxas com um aviso prévio razoável de trinta (30) dias.</p>

<h3>5. Exemplo ilustrativo</h3>
<p>Para uma consulta faturada a 49 € ao Cliente:</p>
<ul>
  <li>Comissão SOS-Expat: 19 € (fixa)</li>
  <li>Remuneração Bruta do Prestador: 30 €</li>
  <li>Taxas de processamento estimadas (Stripe, cartão EUR): ≈ 1,67 €</li>
  <li><strong>Remuneração Líquida paga ao Prestador: ≈ 28,33 €</strong></li>
</ul>
<p><em>Os valores acima são apresentados a título indicativo. As taxas reais podem variar consoante o método de pagamento, a moeda e o prestador de pagamento utilizado.</em></p>
`,
  },

  ru: {
    title: "Комиссия за обработку платежей и выплату средств",
    html: `
${CLAUSE_MARKER}
<h2>Комиссия за обработку платежей и выплату средств</h2>

<h3>1. Общий принцип</h3>
<p>Клиент оплачивает указанную стоимость консультации. SOS-Expat получает комиссию за посредничество (« Комиссия за посредничество »). Остаток после вычета этой комиссии составляет валовое вознаграждение Исполнителя (« Валовое вознаграждение »).</p>

<h3>2. Комиссии за обработку платежей</h3>
<p>Платежи обрабатываются сторонними платёжными системами (Stripe, PayPal или другим провайдером, выбранным SOS-Expat). Эти провайдеры взимают комиссии за обработку, которые включают:</p>
<ul>
  <li><strong>Комиссия за транзакцию</strong>: процент от суммы транзакции плюс фиксированная сумма за операцию (например: 2,9 % + 0,25 € для платежей картой в евро).</li>
  <li><strong>Комиссия за конвертацию валюты</strong>: если валюта платежа Клиента отличается от валюты выплаты Исполнителю, могут применяться комиссии за конвертацию (обычно от 1 % до 3 % в зависимости от платёжного провайдера).</li>
  <li><strong>Комиссия за выплату</strong> (только PayPal): при переводе средств на счёт Исполнителя могут применяться дополнительные комиссии.</li>
</ul>

<h3>3. Распределение комиссий</h3>
<p>В соответствии со стандартной практикой профессиональных платформ посредничества, <strong>комиссии за обработку и выплату вычитаются из Валового вознаграждения Исполнителя</strong>. Сумма, фактически выплаченная Исполнителю (« Чистое вознаграждение »), равна Валовому вознаграждению за вычетом всех применимых комиссий за обработку.</p>
<p>Комиссия за посредничество, полученная SOS-Expat, не затрагивается этими комиссиями.</p>

<h3>4. Прозрачность</h3>
<p>Применимые ставки комиссий доступны в любое время в личном кабинете Исполнителя. Подробная разбивка удержанных комиссий предоставляется для каждой транзакции в истории платежей. SOS-Expat обязуется уведомлять Исполнителей о любом существенном изменении ставок комиссий с разумным предварительным уведомлением за тридцать (30) дней.</p>

<h3>5. Иллюстративный пример</h3>
<p>Для консультации, выставленной Клиенту по цене 49 €:</p>
<ul>
  <li>Комиссия SOS-Expat: 19 € (фиксированная)</li>
  <li>Валовое вознаграждение Исполнителя: 30 €</li>
  <li>Ориентировочные комиссии за обработку (Stripe, карта EUR): ≈ 1,67 €</li>
  <li><strong>Чистое вознаграждение, выплаченное Исполнителю: ≈ 28,33 €</strong></li>
</ul>
<p><em>Указанные суммы приведены в иллюстративных целях. Фактические комиссии могут варьироваться в зависимости от способа оплаты, валюты и используемого платёжного провайдера.</em></p>
`,
  },

  hi: {
    title: "भुगतान प्रसंस्करण और संवितरण शुल्क",
    html: `
${CLAUSE_MARKER}
<h2>भुगतान प्रसंस्करण और संवितरण शुल्क</h2>

<h3>1. सामान्य सिद्धांत</h3>
<p>ग्राहक परामर्श के लिए प्रदर्शित मूल्य का भुगतान करता है। SOS-Expat एक रेफरल कमीशन प्राप्त करता है (« रेफरल शुल्क »)। इस कमीशन की कटौती के बाद शेष राशि सेवा प्रदाता का सकल पारिश्रमिक (« सकल पारिश्रमिक ») बनती है।</p>

<h3>2. भुगतान प्रसंस्करण शुल्क</h3>
<p>भुगतान तृतीय-पक्ष भुगतान सेवा प्रदाताओं (Stripe, PayPal या SOS-Expat द्वारा चयनित अन्य प्रदाता) द्वारा संसाधित किए जाते हैं। ये प्रदाता प्रसंस्करण शुल्क लेते हैं जिनमें शामिल हैं:</p>
<ul>
  <li><strong>लेनदेन शुल्क</strong>: लेनदेन राशि का एक प्रतिशत और प्रति संचालन एक निश्चित राशि (उदाहरण: यूरो में कार्ड भुगतान के लिए 2.9% + €0.25)।</li>
  <li><strong>मुद्रा रूपांतरण शुल्क</strong>: जब ग्राहक की भुगतान मुद्रा सेवा प्रदाता की संवितरण मुद्रा से भिन्न होती है, तो रूपांतरण शुल्क लागू हो सकते हैं (आमतौर पर भुगतान प्रदाता के आधार पर 1% से 3% के बीच)।</li>
  <li><strong>संवितरण शुल्क</strong> (केवल PayPal): सेवा प्रदाता के खाते में धनराशि स्थानांतरित करते समय अतिरिक्त शुल्क लागू हो सकते हैं।</li>
</ul>

<h3>3. शुल्क आवंटन</h3>
<p>पेशेवर मध्यस्थता प्लेटफार्मों की मानक प्रथा के अनुसार, <strong>प्रसंस्करण और संवितरण शुल्क सेवा प्रदाता के सकल पारिश्रमिक से काटे जाते हैं</strong>। सेवा प्रदाता को वास्तव में भुगतान की गई राशि (« शुद्ध पारिश्रमिक ») सकल पारिश्रमिक से सभी लागू प्रसंस्करण शुल्क घटाकर बराबर होती है।</p>
<p>SOS-Expat द्वारा प्राप्त रेफरल कमीशन इन शुल्कों से प्रभावित नहीं होता है।</p>

<h3>4. पारदर्शिता</h3>
<p>लागू शुल्क दरें सेवा प्रदाता के व्यक्तिगत डैशबोर्ड में किसी भी समय उपलब्ध हैं। भुगतान इतिहास में प्रत्येक लेनदेन के लिए काटे गए शुल्कों का विस्तृत विवरण प्रदान किया जाता है। SOS-Expat शुल्क दरों में किसी भी महत्वपूर्ण परिवर्तन की सूचना तीस (30) दिनों की उचित अग्रिम सूचना के साथ देने का वचन देता है।</p>

<h3>5. उदाहरण</h3>
<p>ग्राहक को 49 € में बिल की गई परामर्श के लिए:</p>
<ul>
  <li>SOS-Expat कमीशन: 19 € (निश्चित)</li>
  <li>सेवा प्रदाता का सकल पारिश्रमिक: 30 €</li>
  <li>अनुमानित प्रसंस्करण शुल्क (Stripe, EUR कार्ड): ≈ 1.67 €</li>
  <li><strong>सेवा प्रदाता को भुगतान किया गया शुद्ध पारिश्रमिक: ≈ 28.33 €</strong></li>
</ul>
<p><em>ऊपर दी गई राशियाँ केवल उदाहरण के लिए हैं। वास्तविक शुल्क भुगतान विधि, मुद्रा और उपयोग किए गए भुगतान प्रदाता के आधार पर भिन्न हो सकते हैं।</em></p>
`,
  },

  ch: {
    title: "支付处理和付款费用",
    html: `
${CLAUSE_MARKER}
<h2>支付处理和付款费用</h2>

<h3>1. 一般原则</h3>
<p>客户支付咨询的标示价格。SOS-Expat收取介绍佣金（"介绍费"）。扣除此佣金后的余额构成服务提供者的总报酬（"总报酬"）。</p>

<h3>2. 支付处理费用</h3>
<p>付款由第三方支付服务提供商（Stripe、PayPal或SOS-Expat选择的其他提供商）处理。这些提供商收取的处理费用包括：</p>
<ul>
  <li><strong>交易费</strong>：交易金额的一定百分比加上每次操作的固定金额（例如：欧元卡支付为2.9% + €0.25）。</li>
  <li><strong>货币转换费</strong>：当客户的支付货币与服务提供者的付款货币不同时，可能会产生转换费（通常为1%至3%，具体取决于支付提供商）。</li>
  <li><strong>付款费</strong>（仅限PayPal）：将资金转入服务提供者账户时可能会产生额外费用。</li>
</ul>

<h3>3. 费用分配</h3>
<p>根据专业中介平台的标准做法，<strong>处理和付款费用从服务提供者的总报酬中扣除</strong>。实际支付给服务提供者的金额（"净报酬"）等于总报酬减去所有适用的处理费用。</p>
<p>SOS-Expat收取的介绍佣金不受这些费用的影响。</p>

<h3>4. 透明度</h3>
<p>适用的费率随时可在服务提供者的个人仪表板中查看。每笔交易的费用扣除明细均在付款历史记录中提供。SOS-Expat承诺在费率发生重大变化时，提前三十（30）天通知服务提供者。</p>

<h3>5. 说明性示例</h3>
<p>对于向客户收费49€的咨询：</p>
<ul>
  <li>SOS-Expat佣金：19€（固定）</li>
  <li>服务提供者的总报酬：30€</li>
  <li>估计处理费用（Stripe，欧元卡）：≈ 1.67€</li>
  <li><strong>支付给服务提供者的净报酬：≈ 28.33€</strong></li>
</ul>
<p><em>以上金额仅供参考。实际费用可能因支付方式、货币和使用的支付提供商而异。</em></p>
`,
  },

  ar: {
    title: "رسوم معالجة الدفع والصرف",
    html: `
${CLAUSE_MARKER}
<h2>رسوم معالجة الدفع والصرف</h2>

<h3>1. المبدأ العام</h3>
<p>يدفع العميل السعر المعروض للاستشارة. تحصل SOS-Expat على عمولة وساطة ("رسوم الوساطة"). يشكّل الرصيد بعد خصم هذه العمولة الأجر الإجمالي لمقدم الخدمة ("الأجر الإجمالي").</p>

<h3>2. رسوم معالجة المدفوعات</h3>
<p>تتم معالجة المدفوعات بواسطة مزودي خدمات دفع من أطراف ثالثة (Stripe أو PayPal أو أي مزود آخر تختاره SOS-Expat). يفرض هؤلاء المزودون رسوم معالجة تشمل:</p>
<ul>
  <li><strong>رسوم المعاملات</strong>: نسبة مئوية من مبلغ المعاملة بالإضافة إلى مبلغ ثابت لكل عملية (مثال: 2.9% + 0.25€ للمدفوعات بالبطاقة باليورو).</li>
  <li><strong>رسوم تحويل العملات</strong>: عندما تختلف عملة دفع العميل عن عملة صرف مقدم الخدمة، قد تُطبق رسوم تحويل (عادةً بين 1% و3% حسب مزود الدفع).</li>
  <li><strong>رسوم الصرف</strong> (PayPal فقط): قد تُطبق رسوم إضافية عند تحويل الأموال إلى حساب مقدم الخدمة.</li>
</ul>

<h3>3. توزيع الرسوم</h3>
<p>وفقاً للممارسة المعتادة في منصات الوساطة المهنية، <strong>تُخصم رسوم المعالجة والصرف من الأجر الإجمالي لمقدم الخدمة</strong>. المبلغ المدفوع فعلياً لمقدم الخدمة ("الأجر الصافي") يساوي الأجر الإجمالي مطروحاً منه جميع رسوم المعالجة المطبقة.</p>
<p>عمولة الوساطة التي تحصل عليها SOS-Expat لا تتأثر بهذه الرسوم.</p>

<h3>4. الشفافية</h3>
<p>معدلات الرسوم المطبقة متاحة في أي وقت في لوحة التحكم الشخصية لمقدم الخدمة. يُقدَّم تفصيل مفصل للرسوم المخصومة لكل معاملة في سجل المدفوعات. تلتزم SOS-Expat بإبلاغ مقدمي الخدمات بأي تغيير جوهري في معدلات الرسوم مع إشعار مسبق معقول قدره ثلاثون (30) يوماً.</p>

<h3>5. مثال توضيحي</h3>
<p>لاستشارة مفوترة بمبلغ 49€ للعميل:</p>
<ul>
  <li>عمولة SOS-Expat: 19€ (ثابتة)</li>
  <li>الأجر الإجمالي لمقدم الخدمة: 30€</li>
  <li>رسوم المعالجة التقديرية (Stripe، بطاقة EUR): ≈ 1.67€</li>
  <li><strong>الأجر الصافي المدفوع لمقدم الخدمة: ≈ 28.33€</strong></li>
</ul>
<p><em>المبالغ المذكورة أعلاه مقدمة لأغراض التوضيح فقط. قد تختلف الرسوم الفعلية حسب طريقة الدفع والعملة ومزود الدفع المستخدم.</em></p>
`,
  },
};

// Types de CGU ciblés : avocats + expatriés
const TARGET_TYPES = ["terms_lawyers", "terms_expats"];
const LANGUAGES = ["fr", "en", "es", "de", "pt", "ru", "hi", "ch", "ar"];

async function main() {
  console.log(DRY_RUN ? "🔍 Mode DRY-RUN — aucune écriture\n" : "✏️  Mode ÉCRITURE\n");

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const type of TARGET_TYPES) {
    for (const lang of LANGUAGES) {
      const docId = `${type}_${lang}`;
      const ref = db.collection("legal_documents").doc(docId);
      const snap = await ref.get();

      if (!snap.exists) {
        console.log(`  ⚠️  ${docId} — document inexistant, ignoré`);
        notFound++;
        continue;
      }

      const data = snap.data();
      const currentContent = data.content || "";

      // Vérifie si la clause est déjà présente
      if (currentContent.includes(CLAUSE_MARKER)) {
        console.log(`  ✅ ${docId} — clause déjà présente, ignoré`);
        skipped++;
        continue;
      }

      const clause = FEE_CLAUSES[lang];
      if (!clause) {
        console.log(`  ⚠️  ${docId} — pas de clause pour la langue "${lang}", ignoré`);
        notFound++;
        continue;
      }

      const newContent = currentContent + "\n" + clause.html;

      if (DRY_RUN) {
        console.log(`  📝 ${docId} — AJOUTERAIT la clause "${clause.title}" (${clause.html.length} chars)`);
      } else {
        await ref.update({
          content: newContent,
          updatedAt: FieldValue.serverTimestamp(),
          version: incrementVersion(data.version || "1.0"),
        });
        console.log(`  ✅ ${docId} — clause "${clause.title}" ajoutée (v${incrementVersion(data.version || "1.0")})`);
      }
      updated++;
    }
  }

  console.log(`\n📊 Résumé: ${updated} mis à jour, ${skipped} déjà à jour, ${notFound} non trouvés`);
  process.exit(0);
}

function incrementVersion(version) {
  const parts = version.split(".");
  const minor = parseInt(parts[1] || "0", 10) + 1;
  return `${parts[0]}.${minor}`;
}

main().catch((err) => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});
