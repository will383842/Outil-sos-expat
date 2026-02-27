/**
 * Crée les documents "terms_affiliate" dans Firestore (collection legal_documents)
 * pour les 9 langues supportées.
 *
 * Usage:
 *   node scripts/create-terms-affiliate.cjs
 *   node scripts/create-terms-affiliate.cjs --dry-run   (prévisualise sans écrire)
 */

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const app = initializeApp({ projectId: "sos-urgently-ac307" });
const db = getFirestore(app);

const DRY_RUN = process.argv.includes("--dry-run");

const LANGUAGES = ["fr", "en", "es", "de", "pt", "ru", "hi", "ch", "ar"];

// ============================================================
// Contenu complet par langue
// ============================================================

const TERMS_AFFILIATE = {
  fr: {
    title: "Conditions Générales du Programme d'Affiliation SOS-Expat",
    content: `<h1>Conditions Générales du Programme d'Affiliation SOS-Expat</h1>

<h2>Article 1 — Objet</h2>
<p>Le présent document définit les conditions générales applicables à l'ensemble des programmes d'affiliation de SOS-Expat (Chatters, Influenceurs, Blogueurs, Administrateurs de Groupe, Programme de Parrainage général). Il complète les CGU spécifiques à chaque rôle.</p>

<h2>Article 2 — Définitions</h2>
<ul>
  <li><strong>Affilié</strong> : toute personne inscrite à l'un des programmes d'affiliation de SOS-Expat.</li>
  <li><strong>Filleul</strong> : personne inscrite sur SOS-Expat via le lien ou le code d'un Affilié.</li>
  <li><strong>Commission</strong> : montant fixe en USD crédité à l'Affilié lorsqu'un événement éligible se produit.</li>
  <li><strong>Rémunération Brute</strong> : total des commissions accumulées avant déduction des frais de retrait.</li>
  <li><strong>Rémunération Nette</strong> : montant effectivement reçu par l'Affilié après déduction des frais de retrait.</li>
  <li><strong>Retrait</strong> : opération par laquelle l'Affilié demande le versement de ses commissions disponibles.</li>
  <li><strong>Code Affilié</strong> : identifiant unique attribué à chaque Affilié pour le suivi des parrainages.</li>
</ul>

<h2>Article 3 — Commissions</h2>
<h3>3.1 Montants fixes</h3>
<p>Les commissions sont des montants FIXES en USD, non soumis à TVA, définis par rôle :</p>
<ul>
  <li>Commission par appel client référé : montant fixe différencié selon le type de prestataire consulté — 5$ (avocat) ou 3$ (expatrié aidant) par appel payant.</li>
  <li>Commission par appel prestataire recruté : montant fixe différencié — 5$ (avocat) ou 3$ (expatrié aidant) par appel reçu.</li>
  <li>Les montants exacts sont paramétrables par SOS-Expat et consultables dans le tableau de bord.</li>
</ul>
<h3>3.2 Gel des taux</h3>
<p>Les taux de commission sont gelés au moment de l'inscription et ne changent pas même si la configuration globale est modifiée.</p>
<h3>3.3 Durée d'appel minimale</h3>
<p>Un appel doit durer au minimum 2 minutes pour être éligible à une commission.</p>
<h3>3.4 Fenêtre de recrutement</h3>
<p>Les commissions de recrutement s'appliquent pendant 6 mois après l'inscription du recruté.</p>
<h3>3.5 Attribution</h3>
<p>L'attribution se fait par cookie Last-Click avec une durée de 30 jours.</p>
<h3>3.6 Non-cumul des commissions</h3>
<p>Si un même Affilié a référé le client ET recruté le prestataire consulté lors d'un même appel, seule la commission de référencement client est versée. Les commissions client et recrutement ne sont pas cumulables sur un même appel pour le même Affilié.</p>

<h2>Article 4 — Paiement des commissions</h2>
<h3>4.1 Seuil minimum de retrait</h3>
<p>Le seuil minimum de retrait est de 30$ (USD).</p>
<h3>4.2 Méthodes de paiement</h3>
<p>Les méthodes de paiement disponibles sont : virement bancaire (Wise, 40+ pays), Mobile Money (Flutterwave, 28 pays africains).</p>
<h3>4.3 Devise</h3>
<p>Les commissions sont libellées en USD. Les frais de conversion de devise lors du virement sont à la charge de l'Affilié.</p>
<h3>4.4 Période de rétention</h3>
<p>Les commissions passent en statut « disponible » après la période de validation (variable selon le rôle, minimum 24h).</p>
<h3>4.5 Confirmation 2FA</h3>
<p>Tout retrait requiert une confirmation via Telegram.</p>
<h3>4.6 Traitement</h3>
<p>Le traitement est hybride : automatique sous 500$, validation admin au-delà.</p>

<h2>Article 5 — Frais de retrait</h2>
<h3>5.1</h3>
<p>Un frais fixe de 3$ (USD) est déduit de chaque retrait.</p>
<h3>5.2</h3>
<p>Ce frais couvre les coûts de traitement et de transfert bancaire international.</p>
<h3>5.3</h3>
<p>Le montant net reçu par l'Affilié = montant du retrait − frais de retrait.</p>
<h3>5.4</h3>
<p>Les frais sont paramétrables et consultables dans l'espace personnel.</p>
<h3>5.5</h3>
<p>SOS-Expat s'engage à informer les Affiliés de toute modification des frais avec un préavis de 30 jours.</p>
<h3>5.6 Exemple</h3>
<p>Retrait de 50$ → frais 3$ → l'Affilié reçoit 47$.</p>

<h2>Article 6 — KYC et coordonnées bancaires</h2>
<h3>6.1</h3>
<p>L'Affilié doit fournir des coordonnées bancaires valides avant tout retrait.</p>
<h3>6.2</h3>
<p>Les informations bancaires sont chiffrées en AES-256-GCM.</p>
<h3>6.3</h3>
<p>L'Affilié doit compléter la vérification d'identité (KYC) dans les 90 jours suivant sa première commission.</p>
<h3>6.4</h3>
<p>Si le KYC n'est pas complété sous 180 jours, les fonds sont considérés comme abandonnés.</p>
<h3>6.5</h3>
<p>Types de comptes bancaires supportés : IBAN (Europe/SEPA), Sort Code (UK), ABA/Routing (USA), BSB (Australie), CLABE (Mexique), IFSC (Inde).</p>

<h2>Article 7 — Anti-fraude</h2>
<h3>7.1</h3>
<p>SOS-Expat utilise un système de détection anti-fraude automatisé.</p>
<h3>7.2</h3>
<p>Comportements interdits : auto-parrainage, emails jetables, manipulation de cookies, inscriptions multiples, trafic artificiel.</p>
<h3>7.3</h3>
<p>Score de risque 0-100 : blocage automatique à partir de 80/100.</p>
<h3>7.4</h3>
<p>SOS-Expat se réserve le droit de récupérer les commissions en cas de fraude avérée (clawback, délai de 12 mois).</p>
<h3>7.5</h3>
<p>Le compte peut être suspendu immédiatement en cas de suspicion de fraude.</p>

<h2>Article 8 — Données personnelles (RGPD)</h2>
<h3>8.1</h3>
<p>SOS-Expat traite les données personnelles conformément au RGPD.</p>
<h3>8.2</h3>
<p>Base juridique : exécution du contrat d'affiliation.</p>
<h3>8.3</h3>
<p>Données collectées : identité, coordonnées bancaires, historique des commissions, adresse IP, identifiant Telegram.</p>
<h3>8.4</h3>
<p>Durée de conservation : 5 ans après la dernière activité (obligations comptables).</p>
<h3>8.5</h3>
<p>Droits : accès, rectification, effacement, portabilité, opposition.</p>
<h3>8.6</h3>
<p>DPO : contact@sos-expat.com</p>

<h2>Article 9 — Propriété intellectuelle</h2>
<h3>9.1</h3>
<p>L'Affilié peut utiliser le nom, le logo et les supports marketing fournis par SOS-Expat uniquement dans le cadre du programme.</p>
<h3>9.2</h3>
<p>Toute utilisation abusive est interdite.</p>

<h2>Article 10 — Suspension et résiliation</h2>
<h3>10.1</h3>
<p>SOS-Expat peut suspendre ou résilier le compte d'un Affilié à tout moment en cas de violation des présentes conditions.</p>
<h3>10.2</h3>
<p>L'Affilié peut se désinscrire à tout moment. Les commissions acquises restent dues.</p>
<h3>10.3</h3>
<p>En cas de résiliation pour fraude, les commissions en attente sont annulées.</p>

<h2>Article 11 — Responsabilité</h2>
<h3>11.1</h3>
<p>SOS-Expat ne garantit pas un volume minimum de commissions.</p>
<h3>11.2</h3>
<p>La plateforme peut être indisponible pour maintenance.</p>
<h3>11.3</h3>
<p>L'Affilié est seul responsable de ses obligations fiscales et sociales.</p>

<h2>Article 12 — Droit applicable</h2>
<h3>12.1</h3>
<p>Les présentes conditions sont soumises au droit français.</p>
<h3>12.2</h3>
<p>Tout litige sera soumis aux tribunaux compétents de Paris.</p>

<h2>Article 13 — Contact</h2>
<p>contact@sos-expat.com</p>`,
  },

  en: {
    title: "SOS-Expat Affiliate Program Terms and Conditions",
    content: `<h1>SOS-Expat Affiliate Program Terms and Conditions</h1>

<h2>Article 1 — Purpose</h2>
<p>This document sets forth the general terms and conditions applicable to all SOS-Expat affiliate programs (Chatters, Influencers, Bloggers, Group Administrators, General Referral Program). It supplements the specific terms and conditions for each role.</p>

<h2>Article 2 — Definitions</h2>
<ul>
  <li><strong>Affiliate</strong>: any person registered in one of the SOS-Expat affiliate programs.</li>
  <li><strong>Referral</strong>: a person who registered on SOS-Expat through an Affiliate's link or code.</li>
  <li><strong>Commission</strong>: a fixed amount in USD credited to the Affiliate when an eligible event occurs.</li>
  <li><strong>Gross Remuneration</strong>: total commissions accumulated before deduction of withdrawal fees.</li>
  <li><strong>Net Remuneration</strong>: amount actually received by the Affiliate after deduction of withdrawal fees.</li>
  <li><strong>Withdrawal</strong>: the operation by which the Affiliate requests payment of available commissions.</li>
  <li><strong>Affiliate Code</strong>: a unique identifier assigned to each Affiliate for referral tracking.</li>
</ul>

<h2>Article 3 — Commissions</h2>
<h3>3.1 Fixed Amounts</h3>
<p>Commissions are FIXED amounts in USD, not subject to VAT, defined per role:</p>
<ul>
  <li>Commission per referred client call: differentiated fixed amount based on provider type — $5 (lawyer) or $3 (expat helper) per paid call.</li>
  <li>Commission per recruited provider call: differentiated fixed amount — $5 (lawyer) or $3 (expat helper) per call received.</li>
  <li>Exact amounts are configurable by SOS-Expat and available in the dashboard.</li>
</ul>
<h3>3.2 Rate Lock</h3>
<p>Commission rates are locked at the time of registration and do not change even if the global configuration is modified.</p>
<h3>3.3 Minimum Call Duration</h3>
<p>A call must last at least 2 minutes to be eligible for a commission.</p>
<h3>3.4 Recruitment Window</h3>
<p>Recruitment commissions apply for 6 months after the recruit's registration.</p>
<h3>3.5 Attribution</h3>
<p>Attribution is based on Last-Click cookie with a 30-day duration.</p>
<h3>3.6 Non-Cumulation of Commissions</h3>
<p>If the same Affiliate referred the client AND recruited the provider consulted during the same call, only the client referral commission is paid. Client and recruitment commissions cannot be combined on the same call for the same Affiliate.</p>

<h2>Article 4 — Commission Payment</h2>
<h3>4.1 Minimum Withdrawal Threshold</h3>
<p>The minimum withdrawal threshold is $30 (USD).</p>
<h3>4.2 Payment Methods</h3>
<p>Available payment methods include: bank transfer (Wise, 40+ countries), Mobile Money (Flutterwave, 28 African countries).</p>
<h3>4.3 Currency</h3>
<p>Commissions are denominated in USD. Currency conversion fees during transfer are borne by the Affiliate.</p>
<h3>4.4 Retention Period</h3>
<p>Commissions become "available" after the validation period (varies by role, minimum 24 hours).</p>
<h3>4.5 2FA Confirmation</h3>
<p>Every withdrawal requires confirmation via Telegram.</p>
<h3>4.6 Processing</h3>
<p>Processing is hybrid: automatic under $500, admin approval above.</p>

<h2>Article 5 — Withdrawal Fees</h2>
<h3>5.1</h3>
<p>A fixed fee of $3 (USD) is deducted from each withdrawal.</p>
<h3>5.2</h3>
<p>This fee covers processing costs and international bank transfer fees.</p>
<h3>5.3</h3>
<p>The net amount received by the Affiliate = withdrawal amount − withdrawal fee.</p>
<h3>5.4</h3>
<p>Fees are configurable and viewable in the personal dashboard.</p>
<h3>5.5</h3>
<p>SOS-Expat undertakes to inform Affiliates of any fee changes with 30 days' notice.</p>
<h3>5.6 Example</h3>
<p>Withdrawal of $50 → fee $3 → the Affiliate receives $47.</p>

<h2>Article 6 — KYC and Banking Details</h2>
<h3>6.1</h3>
<p>The Affiliate must provide valid banking details before any withdrawal.</p>
<h3>6.2</h3>
<p>Banking information is encrypted using AES-256-GCM.</p>
<h3>6.3</h3>
<p>The Affiliate must complete identity verification (KYC) within 90 days of their first commission.</p>
<h3>6.4</h3>
<p>If KYC is not completed within 180 days, funds are considered abandoned.</p>
<h3>6.5</h3>
<p>Supported bank account types: IBAN (Europe/SEPA), Sort Code (UK), ABA/Routing (USA), BSB (Australia), CLABE (Mexico), IFSC (India).</p>

<h2>Article 7 — Anti-Fraud</h2>
<h3>7.1</h3>
<p>SOS-Expat uses an automated anti-fraud detection system.</p>
<h3>7.2</h3>
<p>Prohibited behaviors: self-referral, disposable emails, cookie manipulation, multiple registrations, artificial traffic.</p>
<h3>7.3</h3>
<p>Risk score 0-100: automatic blocking from 80/100.</p>
<h3>7.4</h3>
<p>SOS-Expat reserves the right to recover commissions in case of proven fraud (clawback, 12-month period).</p>
<h3>7.5</h3>
<p>The account may be suspended immediately in case of suspected fraud.</p>

<h2>Article 8 — Personal Data (GDPR)</h2>
<h3>8.1</h3>
<p>SOS-Expat processes personal data in accordance with the GDPR.</p>
<h3>8.2</h3>
<p>Legal basis: performance of the affiliate contract.</p>
<h3>8.3</h3>
<p>Data collected: identity, banking details, commission history, IP address, Telegram identifier.</p>
<h3>8.4</h3>
<p>Retention period: 5 years after last activity (accounting obligations).</p>
<h3>8.5</h3>
<p>Rights: access, rectification, erasure, portability, objection.</p>
<h3>8.6</h3>
<p>DPO: contact@sos-expat.com</p>

<h2>Article 9 — Intellectual Property</h2>
<h3>9.1</h3>
<p>The Affiliate may use the name, logo, and marketing materials provided by SOS-Expat solely within the scope of the program.</p>
<h3>9.2</h3>
<p>Any misuse is prohibited.</p>

<h2>Article 10 — Suspension and Termination</h2>
<h3>10.1</h3>
<p>SOS-Expat may suspend or terminate an Affiliate's account at any time in case of breach of these terms.</p>
<h3>10.2</h3>
<p>The Affiliate may unsubscribe at any time. Earned commissions remain payable.</p>
<h3>10.3</h3>
<p>In case of termination for fraud, pending commissions are cancelled.</p>

<h2>Article 11 — Liability</h2>
<h3>11.1</h3>
<p>SOS-Expat does not guarantee a minimum volume of commissions.</p>
<h3>11.2</h3>
<p>The platform may be unavailable for maintenance.</p>
<h3>11.3</h3>
<p>The Affiliate is solely responsible for their tax and social obligations.</p>

<h2>Article 12 — Governing Law</h2>
<h3>12.1</h3>
<p>These terms are governed by French law.</p>
<h3>12.2</h3>
<p>Any dispute shall be submitted to the competent courts of Paris.</p>

<h2>Article 13 — Contact</h2>
<p>contact@sos-expat.com</p>`,
  },

  es: {
    title: "Condiciones Generales del Programa de Afiliación SOS-Expat",
    content: `<h1>Condiciones Generales del Programa de Afiliación SOS-Expat</h1>

<h2>Artículo 1 — Objeto</h2>
<p>El presente documento establece las condiciones generales aplicables al conjunto de los programas de afiliación de SOS-Expat (Chatters, Influencers, Blogueros, Administradores de Grupo, Programa de Patrocinio general). Complementa las condiciones específicas de cada rol.</p>

<h2>Artículo 2 — Definiciones</h2>
<ul>
  <li><strong>Afiliado</strong>: toda persona inscrita en uno de los programas de afiliación de SOS-Expat.</li>
  <li><strong>Referido</strong>: persona inscrita en SOS-Expat a través del enlace o código de un Afiliado.</li>
  <li><strong>Comisión</strong>: monto fijo en USD acreditado al Afiliado cuando ocurre un evento elegible.</li>
  <li><strong>Remuneración Bruta</strong>: total de comisiones acumuladas antes de la deducción de los gastos de retiro.</li>
  <li><strong>Remuneración Neta</strong>: monto efectivamente recibido por el Afiliado tras la deducción de los gastos de retiro.</li>
  <li><strong>Retiro</strong>: operación mediante la cual el Afiliado solicita el pago de sus comisiones disponibles.</li>
  <li><strong>Código de Afiliado</strong>: identificador único asignado a cada Afiliado para el seguimiento de referencias.</li>
</ul>

<h2>Artículo 3 — Comisiones</h2>
<h3>3.1 Montos fijos</h3>
<p>Las comisiones son montos FIJOS en USD, no sujetos a IVA, definidos por rol:</p>
<ul>
  <li>Comisión por llamada de cliente referido: monto fijo diferenciado según el tipo de prestador consultado — 5$ (abogado) o 3$ (expatriado asistente) por llamada pagada.</li>
  <li>Comisión por llamada de prestador reclutado: monto fijo diferenciado — 5$ (abogado) o 3$ (expatriado asistente) por llamada recibida.</li>
  <li>Los montos exactos son configurables por SOS-Expat y consultables en el panel de control.</li>
</ul>
<h3>3.2 Congelación de tasas</h3>
<p>Las tasas de comisión se congelan en el momento de la inscripción y no cambian aunque se modifique la configuración global.</p>
<h3>3.3 Duración mínima de llamada</h3>
<p>Una llamada debe durar al menos 2 minutos para ser elegible para una comisión.</p>
<h3>3.4 Ventana de reclutamiento</h3>
<p>Las comisiones de reclutamiento se aplican durante 6 meses después de la inscripción del reclutado.</p>
<h3>3.5 Atribución</h3>
<p>La atribución se realiza mediante cookie Last-Click con una duración de 30 días.</p>
<h3>3.6 No acumulación de comisiones</h3>
<p>Si un mismo Afiliado ha referido al cliente Y reclutado al prestador consultado durante una misma llamada, solo se abona la comisión de referencia de cliente. Las comisiones de cliente y de reclutamiento no son acumulables en una misma llamada para el mismo Afiliado.</p>

<h2>Artículo 4 — Pago de comisiones</h2>
<h3>4.1 Umbral mínimo de retiro</h3>
<p>El umbral mínimo de retiro es de 30$ (USD).</p>
<h3>4.2 Métodos de pago</h3>
<p>Los métodos de pago disponibles son: transferencia bancaria (Wise, más de 40 países), Mobile Money (Flutterwave, 28 países africanos).</p>
<h3>4.3 Divisa</h3>
<p>Las comisiones se denominan en USD. Los gastos de conversión de divisas durante la transferencia corren a cargo del Afiliado.</p>
<h3>4.4 Período de retención</h3>
<p>Las comisiones pasan a estado «disponible» después del período de validación (variable según el rol, mínimo 24 horas).</p>
<h3>4.5 Confirmación 2FA</h3>
<p>Todo retiro requiere confirmación mediante Telegram.</p>
<h3>4.6 Procesamiento</h3>
<p>El procesamiento es híbrido: automático por debajo de 500$, validación administrativa por encima.</p>

<h2>Artículo 5 — Gastos de retiro</h2>
<h3>5.1</h3>
<p>Se deduce un gasto fijo de 3$ (USD) de cada retiro.</p>
<h3>5.2</h3>
<p>Este gasto cubre los costes de procesamiento y de transferencia bancaria internacional.</p>
<h3>5.3</h3>
<p>El monto neto recibido por el Afiliado = monto del retiro − gastos de retiro.</p>
<h3>5.4</h3>
<p>Los gastos son configurables y consultables en el espacio personal.</p>
<h3>5.5</h3>
<p>SOS-Expat se compromete a informar a los Afiliados de cualquier modificación de los gastos con un preaviso de 30 días.</p>
<h3>5.6 Ejemplo</h3>
<p>Retiro de 50$ → gastos 3$ → el Afiliado recibe 47$.</p>

<h2>Artículo 6 — KYC y datos bancarios</h2>
<h3>6.1</h3>
<p>El Afiliado debe proporcionar datos bancarios válidos antes de cualquier retiro.</p>
<h3>6.2</h3>
<p>La información bancaria se cifra mediante AES-256-GCM.</p>
<h3>6.3</h3>
<p>El Afiliado debe completar la verificación de identidad (KYC) en los 90 días siguientes a su primera comisión.</p>
<h3>6.4</h3>
<p>Si el KYC no se completa en 180 días, los fondos se consideran abandonados.</p>
<h3>6.5</h3>
<p>Tipos de cuentas bancarias admitidas: IBAN (Europa/SEPA), Sort Code (Reino Unido), ABA/Routing (EE.UU.), BSB (Australia), CLABE (México), IFSC (India).</p>

<h2>Artículo 7 — Antifraude</h2>
<h3>7.1</h3>
<p>SOS-Expat utiliza un sistema de detección de fraude automatizado.</p>
<h3>7.2</h3>
<p>Comportamientos prohibidos: autopatrocinio, correos electrónicos desechables, manipulación de cookies, inscripciones múltiples, tráfico artificial.</p>
<h3>7.3</h3>
<p>Puntuación de riesgo 0-100: bloqueo automático a partir de 80/100.</p>
<h3>7.4</h3>
<p>SOS-Expat se reserva el derecho de recuperar las comisiones en caso de fraude comprobado (clawback, plazo de 12 meses).</p>
<h3>7.5</h3>
<p>La cuenta puede ser suspendida inmediatamente en caso de sospecha de fraude.</p>

<h2>Artículo 8 — Datos personales (RGPD)</h2>
<h3>8.1</h3>
<p>SOS-Expat trata los datos personales conforme al RGPD.</p>
<h3>8.2</h3>
<p>Base jurídica: ejecución del contrato de afiliación.</p>
<h3>8.3</h3>
<p>Datos recopilados: identidad, datos bancarios, historial de comisiones, dirección IP, identificador de Telegram.</p>
<h3>8.4</h3>
<p>Plazo de conservación: 5 años después de la última actividad (obligaciones contables).</p>
<h3>8.5</h3>
<p>Derechos: acceso, rectificación, supresión, portabilidad, oposición.</p>
<h3>8.6</h3>
<p>DPO: contact@sos-expat.com</p>

<h2>Artículo 9 — Propiedad intelectual</h2>
<h3>9.1</h3>
<p>El Afiliado puede utilizar el nombre, el logotipo y los materiales de marketing proporcionados por SOS-Expat únicamente en el marco del programa.</p>
<h3>9.2</h3>
<p>Cualquier uso indebido está prohibido.</p>

<h2>Artículo 10 — Suspensión y resolución</h2>
<h3>10.1</h3>
<p>SOS-Expat puede suspender o resolver la cuenta de un Afiliado en cualquier momento en caso de incumplimiento de las presentes condiciones.</p>
<h3>10.2</h3>
<p>El Afiliado puede darse de baja en cualquier momento. Las comisiones adquiridas siguen siendo exigibles.</p>
<h3>10.3</h3>
<p>En caso de resolución por fraude, las comisiones pendientes se anulan.</p>

<h2>Artículo 11 — Responsabilidad</h2>
<h3>11.1</h3>
<p>SOS-Expat no garantiza un volumen mínimo de comisiones.</p>
<h3>11.2</h3>
<p>La plataforma puede no estar disponible por mantenimiento.</p>
<h3>11.3</h3>
<p>El Afiliado es el único responsable de sus obligaciones fiscales y sociales.</p>

<h2>Artículo 12 — Derecho aplicable</h2>
<h3>12.1</h3>
<p>Las presentes condiciones se rigen por el derecho francés.</p>
<h3>12.2</h3>
<p>Todo litigio se someterá a los tribunales competentes de París.</p>

<h2>Artículo 13 — Contacto</h2>
<p>contact@sos-expat.com</p>`,
  },

  de: {
    title: "Allgemeine Geschäftsbedingungen des Partnerprogramms von SOS-Expat",
    content: `<h1>Allgemeine Geschäftsbedingungen des Partnerprogramms von SOS-Expat</h1>

<h2>Artikel 1 — Gegenstand</h2>
<p>Dieses Dokument legt die allgemeinen Geschäftsbedingungen fest, die für alle Partnerprogramme von SOS-Expat gelten (Chatters, Influencer, Blogger, Gruppenadministratoren, allgemeines Empfehlungsprogramm). Es ergänzt die jeweiligen rollenspezifischen AGB.</p>

<h2>Artikel 2 — Begriffsbestimmungen</h2>
<ul>
  <li><strong>Partner</strong>: jede Person, die in einem der Partnerprogramme von SOS-Expat registriert ist.</li>
  <li><strong>Geworbener</strong>: eine Person, die sich über den Link oder Code eines Partners bei SOS-Expat registriert hat.</li>
  <li><strong>Provision</strong>: ein fester Betrag in USD, der dem Partner gutgeschrieben wird, wenn ein provisionsfähiges Ereignis eintritt.</li>
  <li><strong>Bruttovergütung</strong>: Gesamtbetrag der angesammelten Provisionen vor Abzug der Auszahlungsgebühren.</li>
  <li><strong>Nettovergütung</strong>: tatsächlich vom Partner erhaltener Betrag nach Abzug der Auszahlungsgebühren.</li>
  <li><strong>Auszahlung</strong>: der Vorgang, bei dem der Partner die Auszahlung seiner verfügbaren Provisionen beantragt.</li>
  <li><strong>Partner-Code</strong>: ein eindeutiger Identifikator, der jedem Partner zur Nachverfolgung von Empfehlungen zugewiesen wird.</li>
</ul>

<h2>Artikel 3 — Provisionen</h2>
<h3>3.1 Feste Beträge</h3>
<p>Die Provisionen sind FESTE Beträge in USD, nicht umsatzsteuerpflichtig, definiert pro Rolle:</p>
<ul>
  <li>Provision pro vermitteltem Kundenanruf: differenzierter Festbetrag je nach Dienstleistertyp — 5$ (Anwalt) oder 3$ (Expat-Helfer) pro bezahltem Anruf.</li>
  <li>Provision pro Anruf eines geworbenen Dienstleisters: differenzierter Festbetrag — 5$ (Anwalt) oder 3$ (Expat-Helfer) pro empfangenem Anruf.</li>
  <li>Die genauen Beträge sind von SOS-Expat konfigurierbar und im Dashboard einsehbar.</li>
</ul>
<h3>3.2 Festschreibung der Sätze</h3>
<p>Die Provisionssätze werden zum Zeitpunkt der Registrierung festgeschrieben und ändern sich nicht, auch wenn die globale Konfiguration geändert wird.</p>
<h3>3.3 Mindestanrufdauer</h3>
<p>Ein Anruf muss mindestens 2 Minuten dauern, um provisionsberechtigt zu sein.</p>
<h3>3.4 Rekrutierungsfenster</h3>
<p>Rekrutierungsprovisionen gelten für 6 Monate nach der Registrierung des Geworbenen.</p>
<h3>3.5 Zuordnung</h3>
<p>Die Zuordnung erfolgt über Last-Click-Cookie mit einer Laufzeit von 30 Tagen.</p>
<h3>3.6 Nichtkumulierung von Provisionen</h3>
<p>Wenn derselbe Partner den Kunden empfohlen UND den konsultierten Dienstleister angeworben hat, wird nur die Kundenempfehlungsprovision gezahlt. Kunden- und Rekrutierungsprovisionen können nicht für denselben Anruf desselben Partners kumuliert werden.</p>

<h2>Artikel 4 — Provisionszahlung</h2>
<h3>4.1 Mindestauszahlungsschwelle</h3>
<p>Die Mindestauszahlungsschwelle beträgt 30$ (USD).</p>
<h3>4.2 Zahlungsmethoden</h3>
<p>Verfügbare Zahlungsmethoden: Banküberweisung (Wise, über 40 Länder), Mobile Money (Flutterwave, 28 afrikanische Länder).</p>
<h3>4.3 Währung</h3>
<p>Provisionen werden in USD berechnet. Währungsumrechnungsgebühren bei der Überweisung gehen zu Lasten des Partners.</p>
<h3>4.4 Einbehaltungsfrist</h3>
<p>Provisionen werden nach der Validierungsfrist (je nach Rolle unterschiedlich, mindestens 24 Stunden) als „verfügbar" eingestuft.</p>
<h3>4.5 2FA-Bestätigung</h3>
<p>Jede Auszahlung erfordert eine Bestätigung über Telegram.</p>
<h3>4.6 Verarbeitung</h3>
<p>Die Verarbeitung ist hybrid: automatisch unter 500$, Admin-Genehmigung darüber.</p>

<h2>Artikel 5 — Auszahlungsgebühren</h2>
<h3>5.1</h3>
<p>Von jeder Auszahlung wird eine feste Gebühr von 3$ (USD) abgezogen.</p>
<h3>5.2</h3>
<p>Diese Gebühr deckt die Verarbeitungskosten und internationalen Banküberweisungsgebühren ab.</p>
<h3>5.3</h3>
<p>Der vom Partner erhaltene Nettobetrag = Auszahlungsbetrag − Auszahlungsgebühr.</p>
<h3>5.4</h3>
<p>Die Gebühren sind konfigurierbar und im persönlichen Bereich einsehbar.</p>
<h3>5.5</h3>
<p>SOS-Expat verpflichtet sich, die Partner über jede Änderung der Gebühren mit einer Frist von 30 Tagen zu informieren.</p>
<h3>5.6 Beispiel</h3>
<p>Auszahlung von 50$ → Gebühr 3$ → der Partner erhält 47$.</p>

<h2>Artikel 6 — KYC und Bankdaten</h2>
<h3>6.1</h3>
<p>Der Partner muss vor jeder Auszahlung gültige Bankdaten angeben.</p>
<h3>6.2</h3>
<p>Bankdaten werden mit AES-256-GCM verschlüsselt.</p>
<h3>6.3</h3>
<p>Der Partner muss die Identitätsüberprüfung (KYC) innerhalb von 90 Tagen nach seiner ersten Provision abschließen.</p>
<h3>6.4</h3>
<p>Wird das KYC nicht innerhalb von 180 Tagen abgeschlossen, gelten die Gelder als aufgegeben.</p>
<h3>6.5</h3>
<p>Unterstützte Kontoarten: IBAN (Europa/SEPA), Sort Code (UK), ABA/Routing (USA), BSB (Australien), CLABE (Mexiko), IFSC (Indien).</p>

<h2>Artikel 7 — Betrugsbekämpfung</h2>
<h3>7.1</h3>
<p>SOS-Expat verwendet ein automatisiertes Betrugserkennungssystem.</p>
<h3>7.2</h3>
<p>Verbotenes Verhalten: Selbstempfehlung, Wegwerf-E-Mails, Cookie-Manipulation, Mehrfachregistrierungen, künstlicher Traffic.</p>
<h3>7.3</h3>
<p>Risikobewertung 0-100: automatische Sperrung ab 80/100.</p>
<h3>7.4</h3>
<p>SOS-Expat behält sich das Recht vor, Provisionen bei nachgewiesenem Betrug zurückzufordern (Clawback, Frist von 12 Monaten).</p>
<h3>7.5</h3>
<p>Das Konto kann bei Betrugsverdacht sofort gesperrt werden.</p>

<h2>Artikel 8 — Personenbezogene Daten (DSGVO)</h2>
<h3>8.1</h3>
<p>SOS-Expat verarbeitet personenbezogene Daten gemäß der DSGVO.</p>
<h3>8.2</h3>
<p>Rechtsgrundlage: Erfüllung des Partnervertrags.</p>
<h3>8.3</h3>
<p>Erhobene Daten: Identität, Bankdaten, Provisionshistorie, IP-Adresse, Telegram-Kennung.</p>
<h3>8.4</h3>
<p>Aufbewahrungsfrist: 5 Jahre nach der letzten Aktivität (buchhalterische Pflichten).</p>
<h3>8.5</h3>
<p>Rechte: Auskunft, Berichtigung, Löschung, Datenübertragbarkeit, Widerspruch.</p>
<h3>8.6</h3>
<p>DSB: contact@sos-expat.com</p>

<h2>Artikel 9 — Geistiges Eigentum</h2>
<h3>9.1</h3>
<p>Der Partner darf den Namen, das Logo und die von SOS-Expat bereitgestellten Marketingmaterialien ausschließlich im Rahmen des Programms verwenden.</p>
<h3>9.2</h3>
<p>Jeder Missbrauch ist untersagt.</p>

<h2>Artikel 10 — Suspendierung und Kündigung</h2>
<h3>10.1</h3>
<p>SOS-Expat kann das Konto eines Partners bei Verstoß gegen diese Bedingungen jederzeit sperren oder kündigen.</p>
<h3>10.2</h3>
<p>Der Partner kann sich jederzeit abmelden. Erworbene Provisionen bleiben geschuldet.</p>
<h3>10.3</h3>
<p>Bei Kündigung wegen Betrugs werden ausstehende Provisionen storniert.</p>

<h2>Artikel 11 — Haftung</h2>
<h3>11.1</h3>
<p>SOS-Expat garantiert kein Mindestvolumen an Provisionen.</p>
<h3>11.2</h3>
<p>Die Plattform kann wegen Wartungsarbeiten nicht verfügbar sein.</p>
<h3>11.3</h3>
<p>Der Partner ist allein verantwortlich für seine steuerlichen und sozialversicherungsrechtlichen Pflichten.</p>

<h2>Artikel 12 — Anwendbares Recht</h2>
<h3>12.1</h3>
<p>Diese Bedingungen unterliegen französischem Recht.</p>
<h3>12.2</h3>
<p>Jeder Rechtsstreit wird den zuständigen Gerichten in Paris vorgelegt.</p>

<h2>Artikel 13 — Kontakt</h2>
<p>contact@sos-expat.com</p>`,
  },

  pt: {
    title: "Termos e Condições Gerais do Programa de Afiliação SOS-Expat",
    content: `<h1>Termos e Condições Gerais do Programa de Afiliação SOS-Expat</h1>

<h2>Artigo 1 — Objeto</h2>
<p>O presente documento define os termos e condições gerais aplicáveis ao conjunto dos programas de afiliação da SOS-Expat (Chatters, Influenciadores, Blogueiros, Administradores de Grupo, Programa de Indicação geral). Complementa os termos e condições específicos de cada função.</p>

<h2>Artigo 2 — Definições</h2>
<ul>
  <li><strong>Afiliado</strong>: toda pessoa inscrita em um dos programas de afiliação da SOS-Expat.</li>
  <li><strong>Indicado</strong>: pessoa inscrita na SOS-Expat através do link ou código de um Afiliado.</li>
  <li><strong>Comissão</strong>: montante fixo em USD creditado ao Afiliado quando ocorre um evento elegível.</li>
  <li><strong>Remuneração Bruta</strong>: total de comissões acumuladas antes da dedução das taxas de saque.</li>
  <li><strong>Remuneração Líquida</strong>: montante efetivamente recebido pelo Afiliado após a dedução das taxas de saque.</li>
  <li><strong>Saque</strong>: operação pela qual o Afiliado solicita o pagamento das suas comissões disponíveis.</li>
  <li><strong>Código de Afiliado</strong>: identificador único atribuído a cada Afiliado para rastreamento de indicações.</li>
</ul>

<h2>Artigo 3 — Comissões</h2>
<h3>3.1 Montantes fixos</h3>
<p>As comissões são montantes FIXOS em USD, não sujeitos a IVA, definidos por função:</p>
<ul>
  <li>Comissão por chamada de cliente indicado: montante fixo diferenciado conforme o tipo de prestador consultado — 5$ (advogado) ou 3$ (expatriado auxiliar) por chamada paga.</li>
  <li>Comissão por chamada de prestador recrutado: montante fixo diferenciado — 5$ (advogado) ou 3$ (expatriado auxiliar) por chamada recebida.</li>
  <li>Os montantes exatos são configuráveis pela SOS-Expat e consultáveis no painel de controle.</li>
</ul>
<h3>3.2 Congelamento de taxas</h3>
<p>As taxas de comissão são congeladas no momento da inscrição e não mudam mesmo que a configuração global seja alterada.</p>
<h3>3.3 Duração mínima de chamada</h3>
<p>Uma chamada deve durar no mínimo 2 minutos para ser elegível a uma comissão.</p>
<h3>3.4 Janela de recrutamento</h3>
<p>As comissões de recrutamento aplicam-se durante 6 meses após a inscrição do recrutado.</p>
<h3>3.5 Atribuição</h3>
<p>A atribuição é feita por cookie Last-Click com duração de 30 dias.</p>
<h3>3.6 Não cumulação de comissões</h3>
<p>Se o mesmo Afiliado indicou o cliente E recrutou o prestador consultado durante a mesma chamada, apenas a comissão de indicação de cliente é paga. As comissões de cliente e de recrutamento não são acumuláveis na mesma chamada para o mesmo Afiliado.</p>

<h2>Artigo 4 — Pagamento de comissões</h2>
<h3>4.1 Limite mínimo de saque</h3>
<p>O limite mínimo de saque é de 30$ (USD).</p>
<h3>4.2 Métodos de pagamento</h3>
<p>Os métodos de pagamento disponíveis são: transferência bancária (Wise, mais de 40 países), Mobile Money (Flutterwave, 28 países africanos).</p>
<h3>4.3 Moeda</h3>
<p>As comissões são denominadas em USD. As taxas de conversão de moeda durante a transferência são da responsabilidade do Afiliado.</p>
<h3>4.4 Período de retenção</h3>
<p>As comissões passam ao estado «disponível» após o período de validação (variável conforme a função, mínimo de 24 horas).</p>
<h3>4.5 Confirmação 2FA</h3>
<p>Todo saque requer confirmação via Telegram.</p>
<h3>4.6 Processamento</h3>
<p>O processamento é híbrido: automático abaixo de 500$, validação administrativa acima.</p>

<h2>Artigo 5 — Taxas de saque</h2>
<h3>5.1</h3>
<p>Uma taxa fixa de 3$ (USD) é deduzida de cada saque.</p>
<h3>5.2</h3>
<p>Esta taxa cobre os custos de processamento e de transferência bancária internacional.</p>
<h3>5.3</h3>
<p>O montante líquido recebido pelo Afiliado = montante do saque − taxa de saque.</p>
<h3>5.4</h3>
<p>As taxas são configuráveis e consultáveis no espaço pessoal.</p>
<h3>5.5</h3>
<p>A SOS-Expat compromete-se a informar os Afiliados de qualquer alteração das taxas com um aviso prévio de 30 dias.</p>
<h3>5.6 Exemplo</h3>
<p>Saque de 50$ → taxa 3$ → o Afiliado recebe 47$.</p>

<h2>Artigo 6 — KYC e dados bancários</h2>
<h3>6.1</h3>
<p>O Afiliado deve fornecer dados bancários válidos antes de qualquer saque.</p>
<h3>6.2</h3>
<p>As informações bancárias são cifradas com AES-256-GCM.</p>
<h3>6.3</h3>
<p>O Afiliado deve completar a verificação de identidade (KYC) nos 90 dias seguintes à sua primeira comissão.</p>
<h3>6.4</h3>
<p>Se o KYC não for completado em 180 dias, os fundos são considerados abandonados.</p>
<h3>6.5</h3>
<p>Tipos de contas bancárias suportados: IBAN (Europa/SEPA), Sort Code (Reino Unido), ABA/Routing (EUA), BSB (Austrália), CLABE (México), IFSC (Índia).</p>

<h2>Artigo 7 — Antifraude</h2>
<h3>7.1</h3>
<p>A SOS-Expat utiliza um sistema automatizado de deteção de fraudes.</p>
<h3>7.2</h3>
<p>Comportamentos proibidos: autoindicação, e-mails descartáveis, manipulação de cookies, inscrições múltiplas, tráfego artificial.</p>
<h3>7.3</h3>
<p>Pontuação de risco 0-100: bloqueio automático a partir de 80/100.</p>
<h3>7.4</h3>
<p>A SOS-Expat reserva-se o direito de recuperar comissões em caso de fraude comprovada (clawback, prazo de 12 meses).</p>
<h3>7.5</h3>
<p>A conta pode ser suspensa imediatamente em caso de suspeita de fraude.</p>

<h2>Artigo 8 — Dados pessoais (RGPD)</h2>
<h3>8.1</h3>
<p>A SOS-Expat trata os dados pessoais em conformidade com o RGPD.</p>
<h3>8.2</h3>
<p>Base jurídica: execução do contrato de afiliação.</p>
<h3>8.3</h3>
<p>Dados recolhidos: identidade, dados bancários, histórico de comissões, endereço IP, identificador Telegram.</p>
<h3>8.4</h3>
<p>Prazo de conservação: 5 anos após a última atividade (obrigações contabilísticas).</p>
<h3>8.5</h3>
<p>Direitos: acesso, retificação, apagamento, portabilidade, oposição.</p>
<h3>8.6</h3>
<p>DPO: contact@sos-expat.com</p>

<h2>Artigo 9 — Propriedade intelectual</h2>
<h3>9.1</h3>
<p>O Afiliado pode utilizar o nome, o logotipo e os materiais de marketing fornecidos pela SOS-Expat exclusivamente no âmbito do programa.</p>
<h3>9.2</h3>
<p>Qualquer utilização abusiva é proibida.</p>

<h2>Artigo 10 — Suspensão e resolução</h2>
<h3>10.1</h3>
<p>A SOS-Expat pode suspender ou resolver a conta de um Afiliado a qualquer momento em caso de violação dos presentes termos.</p>
<h3>10.2</h3>
<p>O Afiliado pode cancelar a inscrição a qualquer momento. As comissões adquiridas continuam a ser devidas.</p>
<h3>10.3</h3>
<p>Em caso de resolução por fraude, as comissões pendentes são canceladas.</p>

<h2>Artigo 11 — Responsabilidade</h2>
<h3>11.1</h3>
<p>A SOS-Expat não garante um volume mínimo de comissões.</p>
<h3>11.2</h3>
<p>A plataforma pode estar indisponível para manutenção.</p>
<h3>11.3</h3>
<p>O Afiliado é o único responsável pelas suas obrigações fiscais e sociais.</p>

<h2>Artigo 12 — Direito aplicável</h2>
<h3>12.1</h3>
<p>Os presentes termos são regidos pelo direito francês.</p>
<h3>12.2</h3>
<p>Qualquer litígio será submetido aos tribunais competentes de Paris.</p>

<h2>Artigo 13 — Contacto</h2>
<p>contact@sos-expat.com</p>`,
  },

  ru: {
    title: "Общие условия партнёрской программы SOS-Expat",
    content: `<h1>Общие условия партнёрской программы SOS-Expat</h1>

<h2>Статья 1 — Предмет</h2>
<p>Настоящий документ определяет общие условия, применимые ко всем партнёрским программам SOS-Expat (Чаттеры, Инфлюенсеры, Блогеры, Администраторы групп, Общая реферальная программа). Он дополняет специальные условия для каждой роли.</p>

<h2>Статья 2 — Определения</h2>
<ul>
  <li><strong>Партнёр</strong>: любое лицо, зарегистрированное в одной из партнёрских программ SOS-Expat.</li>
  <li><strong>Реферал</strong>: лицо, зарегистрировавшееся на SOS-Expat по ссылке или коду Партнёра.</li>
  <li><strong>Комиссия</strong>: фиксированная сумма в USD, начисляемая Партнёру при наступлении квалифицирующего события.</li>
  <li><strong>Валовое вознаграждение</strong>: общая сумма накопленных комиссий до вычета комиссии за вывод средств.</li>
  <li><strong>Чистое вознаграждение</strong>: сумма, фактически полученная Партнёром после вычета комиссии за вывод средств.</li>
  <li><strong>Вывод средств</strong>: операция, посредством которой Партнёр запрашивает выплату доступных комиссий.</li>
  <li><strong>Партнёрский код</strong>: уникальный идентификатор, присвоенный каждому Партнёру для отслеживания рефералов.</li>
</ul>

<h2>Статья 3 — Комиссии</h2>
<h3>3.1 Фиксированные суммы</h3>
<p>Комиссии представляют собой ФИКСИРОВАННЫЕ суммы в USD, не облагаемые НДС, определённые для каждой роли:</p>
<ul>
  <li>Комиссия за звонок привлечённого клиента: дифференцированная фиксированная сумма в зависимости от типа поставщика услуг — 5$ (адвокат) или 3$ (экспат-помощник) за оплаченный звонок.</li>
  <li>Комиссия за звонок привлечённого поставщика услуг: дифференцированная фиксированная сумма — 5$ (адвокат) или 3$ (экспат-помощник) за полученный звонок.</li>
  <li>Точные суммы настраиваются SOS-Expat и доступны в личном кабинете.</li>
</ul>
<h3>3.2 Фиксация ставок</h3>
<p>Ставки комиссий фиксируются на момент регистрации и не изменяются даже при изменении глобальной конфигурации.</p>
<h3>3.3 Минимальная продолжительность звонка</h3>
<p>Звонок должен длиться не менее 2 минут для получения права на комиссию.</p>
<h3>3.4 Окно рекрутинга</h3>
<p>Комиссии за рекрутинг действуют в течение 6 месяцев после регистрации привлечённого лица.</p>
<h3>3.5 Атрибуция</h3>
<p>Атрибуция осуществляется по принципу Last-Click cookie сроком действия 30 дней.</p>
<h3>3.6 Некумулятивность комиссий</h3>
<p>Если один и тот же Партнёр привлёк клиента И нанял поставщика услуг, участвовавшего в том же звонке, выплачивается только комиссия за привлечение клиента. Комиссии за клиента и за рекрутинг не могут быть совмещены в рамках одного звонка для одного и того же Партнёра.</p>

<h2>Статья 4 — Выплата комиссий</h2>
<h3>4.1 Минимальный порог вывода</h3>
<p>Минимальный порог вывода составляет 30$ (USD).</p>
<h3>4.2 Способы оплаты</h3>
<p>Доступные способы оплаты: банковский перевод (Wise, более 40 стран), Mobile Money (Flutterwave, 28 африканских стран).</p>
<h3>4.3 Валюта</h3>
<p>Комиссии номинированы в USD. Расходы на конвертацию валют при переводе несёт Партнёр.</p>
<h3>4.4 Период удержания</h3>
<p>Комиссии переходят в статус «доступно» после периода проверки (варьируется в зависимости от роли, минимум 24 часа).</p>
<h3>4.5 Подтверждение 2FA</h3>
<p>Каждый вывод средств требует подтверждения через Telegram.</p>
<h3>4.6 Обработка</h3>
<p>Обработка гибридная: автоматическая при суммах менее 500$, утверждение администратором свыше.</p>

<h2>Статья 5 — Комиссия за вывод средств</h2>
<h3>5.1</h3>
<p>С каждого вывода средств удерживается фиксированная комиссия в размере 3$ (USD).</p>
<h3>5.2</h3>
<p>Эта комиссия покрывает расходы на обработку и международный банковский перевод.</p>
<h3>5.3</h3>
<p>Чистая сумма, полученная Партнёром = сумма вывода − комиссия за вывод.</p>
<h3>5.4</h3>
<p>Комиссии настраиваемы и доступны для просмотра в личном кабинете.</p>
<h3>5.5</h3>
<p>SOS-Expat обязуется уведомлять Партнёров о любых изменениях комиссий с предварительным уведомлением за 30 дней.</p>
<h3>5.6 Пример</h3>
<p>Вывод 50$ → комиссия 3$ → Партнёр получает 47$.</p>

<h2>Статья 6 — KYC и банковские реквизиты</h2>
<h3>6.1</h3>
<p>Партнёр должен предоставить действующие банковские реквизиты до первого вывода средств.</p>
<h3>6.2</h3>
<p>Банковская информация шифруется с использованием AES-256-GCM.</p>
<h3>6.3</h3>
<p>Партнёр обязан пройти верификацию личности (KYC) в течение 90 дней после получения первой комиссии.</p>
<h3>6.4</h3>
<p>Если KYC не пройден в течение 180 дней, средства считаются невостребованными.</p>
<h3>6.5</h3>
<p>Поддерживаемые типы банковских счетов: IBAN (Европа/SEPA), Sort Code (Великобритания), ABA/Routing (США), BSB (Австралия), CLABE (Мексика), IFSC (Индия).</p>

<h2>Статья 7 — Противодействие мошенничеству</h2>
<h3>7.1</h3>
<p>SOS-Expat использует автоматизированную систему обнаружения мошенничества.</p>
<h3>7.2</h3>
<p>Запрещённые действия: самореферал, одноразовые email-адреса, манипуляция cookie, множественные регистрации, искусственный трафик.</p>
<h3>7.3</h3>
<p>Оценка риска 0-100: автоматическая блокировка при показателе от 80/100.</p>
<h3>7.4</h3>
<p>SOS-Expat оставляет за собой право взыскать комиссии в случае доказанного мошенничества (clawback, срок 12 месяцев).</p>
<h3>7.5</h3>
<p>Аккаунт может быть немедленно заблокирован при подозрении на мошенничество.</p>

<h2>Статья 8 — Персональные данные (GDPR)</h2>
<h3>8.1</h3>
<p>SOS-Expat обрабатывает персональные данные в соответствии с GDPR.</p>
<h3>8.2</h3>
<p>Правовое основание: исполнение партнёрского договора.</p>
<h3>8.3</h3>
<p>Собираемые данные: личность, банковские реквизиты, история комиссий, IP-адрес, идентификатор Telegram.</p>
<h3>8.4</h3>
<p>Срок хранения: 5 лет после последней активности (бухгалтерские обязательства).</p>
<h3>8.5</h3>
<p>Права: доступ, исправление, удаление, переносимость, возражение.</p>
<h3>8.6</h3>
<p>DPO: contact@sos-expat.com</p>

<h2>Статья 9 — Интеллектуальная собственность</h2>
<h3>9.1</h3>
<p>Партнёр может использовать название, логотип и маркетинговые материалы, предоставленные SOS-Expat, исключительно в рамках программы.</p>
<h3>9.2</h3>
<p>Любое злоупотребление запрещено.</p>

<h2>Статья 10 — Приостановление и расторжение</h2>
<h3>10.1</h3>
<p>SOS-Expat может приостановить или расторгнуть аккаунт Партнёра в любое время в случае нарушения настоящих условий.</p>
<h3>10.2</h3>
<p>Партнёр может отписаться в любое время. Заработанные комиссии остаются к выплате.</p>
<h3>10.3</h3>
<p>В случае расторжения за мошенничество ожидающие комиссии аннулируются.</p>

<h2>Статья 11 — Ответственность</h2>
<h3>11.1</h3>
<p>SOS-Expat не гарантирует минимального объёма комиссий.</p>
<h3>11.2</h3>
<p>Платформа может быть недоступна в связи с техническим обслуживанием.</p>
<h3>11.3</h3>
<p>Партнёр самостоятельно несёт ответственность за свои налоговые и социальные обязательства.</p>

<h2>Статья 12 — Применимое право</h2>
<h3>12.1</h3>
<p>Настоящие условия регулируются французским правом.</p>
<h3>12.2</h3>
<p>Любой спор подлежит рассмотрению компетентными судами Парижа.</p>

<h2>Статья 13 — Контакты</h2>
<p>contact@sos-expat.com</p>`,
  },

  hi: {
    title: "SOS-Expat सहबद्ध कार्यक्रम के नियम और शर्तें",
    content: `<h1>SOS-Expat सहबद्ध कार्यक्रम के नियम और शर्तें</h1>

<h2>अनुच्छेद 1 — उद्देश्य</h2>
<p>यह दस्तावेज़ SOS-Expat के सभी सहबद्ध कार्यक्रमों (चैटर्स, इन्फ्लुएंसर, ब्लॉगर, ग्रुप एडमिनिस्ट्रेटर, सामान्य रेफरल कार्यक्रम) पर लागू सामान्य नियम और शर्तें निर्धारित करता है। यह प्रत्येक भूमिका के लिए विशिष्ट नियमों और शर्तों का पूरक है।</p>

<h2>अनुच्छेद 2 — परिभाषाएँ</h2>
<ul>
  <li><strong>सहबद्ध (Affiliate)</strong>: SOS-Expat के किसी सहबद्ध कार्यक्रम में पंजीकृत कोई भी व्यक्ति।</li>
  <li><strong>रेफरल</strong>: किसी सहबद्ध के लिंक या कोड के माध्यम से SOS-Expat पर पंजीकृत व्यक्ति।</li>
  <li><strong>कमीशन</strong>: USD में एक निश्चित राशि जो किसी योग्य घटना होने पर सहबद्ध को जमा की जाती है।</li>
  <li><strong>सकल पारिश्रमिक</strong>: निकासी शुल्क की कटौती से पहले संचित कमीशन का कुल योग।</li>
  <li><strong>शुद्ध पारिश्रमिक</strong>: निकासी शुल्क की कटौती के बाद सहबद्ध द्वारा वास्तव में प्राप्त राशि।</li>
  <li><strong>निकासी</strong>: वह संक्रिया जिसके द्वारा सहबद्ध अपने उपलब्ध कमीशन के भुगतान का अनुरोध करता है।</li>
  <li><strong>सहबद्ध कोड</strong>: रेफरल ट्रैकिंग के लिए प्रत्येक सहबद्ध को सौंपा गया एक अद्वितीय पहचानकर्ता।</li>
</ul>

<h2>अनुच्छेद 3 — कमीशन</h2>
<h3>3.1 निश्चित राशियाँ</h3>
<p>कमीशन USD में निश्चित राशियाँ हैं, VAT के अधीन नहीं हैं, प्रत्येक भूमिका के अनुसार परिभाषित:</p>
<ul>
  <li>रेफर किए गए ग्राहक कॉल पर कमीशन: सेवा प्रदाता के प्रकार के अनुसार विभेदित निश्चित राशि — 5$ (वकील) या 3$ (प्रवासी सहायक) प्रति भुगतान किए गए कॉल पर।</li>
  <li>भर्ती किए गए सेवा प्रदाता कॉल पर कमीशन: विभेदित निश्चित राशि — 5$ (वकील) या 3$ (प्रवासी सहायक) प्रति प्राप्त कॉल।</li>
  <li>सटीक राशियाँ SOS-Expat द्वारा कॉन्फ़िगर करने योग्य हैं और डैशबोर्ड में उपलब्ध हैं।</li>
</ul>
<h3>3.2 दरों का स्थिरीकरण</h3>
<p>कमीशन दरें पंजीकरण के समय स्थिर कर दी जाती हैं और वैश्विक कॉन्फ़िगरेशन संशोधित होने पर भी नहीं बदलतीं।</p>
<h3>3.3 न्यूनतम कॉल अवधि</h3>
<p>कमीशन के लिए पात्र होने के लिए कॉल कम से कम 2 मिनट तक चलना चाहिए।</p>
<h3>3.4 भर्ती विंडो</h3>
<p>भर्ती कमीशन भर्ती किए गए व्यक्ति के पंजीकरण के 6 महीने बाद तक लागू होते हैं।</p>
<h3>3.5 एट्रिब्यूशन</h3>
<p>एट्रिब्यूशन Last-Click कुकी पर आधारित है जिसकी अवधि 30 दिन है।</p>
<h3>3.6 कमीशन का गैर-संचयन</h3>
<p>यदि एक ही सहबद्ध ने ग्राहक को रेफर किया और उसी कॉल के दौरान परामर्शित सेवा प्रदाता की भी भर्ती की, तो केवल ग्राहक रेफरल कमीशन का भुगतान किया जाता है। एक ही सहबद्ध के लिए एक ही कॉल पर ग्राहक और भर्ती कमीशन संयोजित नहीं किए जा सकते।</p>

<h2>अनुच्छेद 4 — कमीशन का भुगतान</h2>
<h3>4.1 न्यूनतम निकासी सीमा</h3>
<p>न्यूनतम निकासी सीमा 30$ (USD) है।</p>
<h3>4.2 भुगतान विधियाँ</h3>
<p>उपलब्ध भुगतान विधियाँ: बैंक ट्रांसफर (Wise, 40+ देश), Mobile Money (Flutterwave, 28 अफ्रीकी देश)।</p>
<h3>4.3 मुद्रा</h3>
<p>कमीशन USD में मूल्यवर्गित हैं। ट्रांसफर के दौरान मुद्रा रूपांतरण शुल्क सहबद्ध द्वारा वहन किया जाता है।</p>
<h3>4.4 प्रतिधारण अवधि</h3>
<p>सत्यापन अवधि (भूमिका के अनुसार भिन्न, न्यूनतम 24 घंटे) के बाद कमीशन «उपलब्ध» स्थिति में आ जाते हैं।</p>
<h3>4.5 2FA पुष्टि</h3>
<p>प्रत्येक निकासी के लिए Telegram के माध्यम से पुष्टि आवश्यक है।</p>
<h3>4.6 प्रसंस्करण</h3>
<p>प्रसंस्करण हाइब्रिड है: 500$ से कम पर स्वचालित, उससे अधिक पर व्यवस्थापक अनुमोदन।</p>

<h2>अनुच्छेद 5 — निकासी शुल्क</h2>
<h3>5.1</h3>
<p>प्रत्येक निकासी से 3$ (USD) का एक निश्चित शुल्क काटा जाता है।</p>
<h3>5.2</h3>
<p>यह शुल्क प्रसंस्करण लागत और अंतरराष्ट्रीय बैंक ट्रांसफर शुल्क को कवर करता है।</p>
<h3>5.3</h3>
<p>सहबद्ध द्वारा प्राप्त शुद्ध राशि = निकासी राशि − निकासी शुल्क।</p>
<h3>5.4</h3>
<p>शुल्क कॉन्फ़िगर करने योग्य हैं और व्यक्तिगत डैशबोर्ड में देखे जा सकते हैं।</p>
<h3>5.5</h3>
<p>SOS-Expat 30 दिनों की पूर्व सूचना के साथ शुल्क में किसी भी परिवर्तन के बारे में सहबद्धों को सूचित करने का वचन देता है।</p>
<h3>5.6 उदाहरण</h3>
<p>50$ की निकासी → शुल्क 3$ → सहबद्ध को 47$ प्राप्त होते हैं।</p>

<h2>अनुच्छेद 6 — KYC और बैंकिंग विवरण</h2>
<h3>6.1</h3>
<p>सहबद्ध को किसी भी निकासी से पहले वैध बैंकिंग विवरण प्रदान करना होगा।</p>
<h3>6.2</h3>
<p>बैंकिंग जानकारी AES-256-GCM का उपयोग करके एन्क्रिप्ट की जाती है।</p>
<h3>6.3</h3>
<p>सहबद्ध को अपने पहले कमीशन के 90 दिनों के भीतर पहचान सत्यापन (KYC) पूरा करना होगा।</p>
<h3>6.4</h3>
<p>यदि KYC 180 दिनों के भीतर पूरा नहीं होता है, तो धनराशि को परित्यक्त माना जाता है।</p>
<h3>6.5</h3>
<p>समर्थित बैंक खाता प्रकार: IBAN (यूरोप/SEPA), Sort Code (यूके), ABA/Routing (USA), BSB (ऑस्ट्रेलिया), CLABE (मेक्सिको), IFSC (भारत)।</p>

<h2>अनुच्छेद 7 — धोखाधड़ी-रोधी</h2>
<h3>7.1</h3>
<p>SOS-Expat एक स्वचालित धोखाधड़ी पहचान प्रणाली का उपयोग करता है।</p>
<h3>7.2</h3>
<p>निषिद्ध व्यवहार: स्व-रेफरल, डिस्पोज़ेबल ईमेल, कुकी हेरफेर, एकाधिक पंजीकरण, कृत्रिम ट्रैफ़िक।</p>
<h3>7.3</h3>
<p>जोखिम स्कोर 0-100: 80/100 से स्वचालित अवरोधन।</p>
<h3>7.4</h3>
<p>SOS-Expat सिद्ध धोखाधड़ी के मामले में कमीशन वसूल करने का अधिकार सुरक्षित रखता है (clawback, 12 महीने की अवधि)।</p>
<h3>7.5</h3>
<p>धोखाधड़ी के संदेह में खाता तुरंत निलंबित किया जा सकता है।</p>

<h2>अनुच्छेद 8 — व्यक्तिगत डेटा (GDPR)</h2>
<h3>8.1</h3>
<p>SOS-Expat GDPR के अनुसार व्यक्तिगत डेटा का प्रसंस्करण करता है।</p>
<h3>8.2</h3>
<p>कानूनी आधार: सहबद्ध अनुबंध का निष्पादन।</p>
<h3>8.3</h3>
<p>एकत्रित डेटा: पहचान, बैंकिंग विवरण, कमीशन इतिहास, IP पता, Telegram पहचानकर्ता।</p>
<h3>8.4</h3>
<p>संरक्षण अवधि: अंतिम गतिविधि के बाद 5 वर्ष (लेखांकन दायित्व)।</p>
<h3>8.5</h3>
<p>अधिकार: पहुँच, सुधार, विलोपन, सुवाह्यता, आपत्ति।</p>
<h3>8.6</h3>
<p>DPO: contact@sos-expat.com</p>

<h2>अनुच्छेद 9 — बौद्धिक संपदा</h2>
<h3>9.1</h3>
<p>सहबद्ध SOS-Expat द्वारा प्रदान किए गए नाम, लोगो और विपणन सामग्री का उपयोग केवल कार्यक्रम के दायरे में कर सकता है।</p>
<h3>9.2</h3>
<p>कोई भी दुरुपयोग निषिद्ध है।</p>

<h2>अनुच्छेद 10 — निलंबन और समाप्ति</h2>
<h3>10.1</h3>
<p>SOS-Expat इन शर्तों के उल्लंघन की स्थिति में किसी भी समय सहबद्ध के खाते को निलंबित या समाप्त कर सकता है।</p>
<h3>10.2</h3>
<p>सहबद्ध किसी भी समय सदस्यता रद्द कर सकता है। अर्जित कमीशन देय बने रहते हैं।</p>
<h3>10.3</h3>
<p>धोखाधड़ी के कारण समाप्ति की स्थिति में, लंबित कमीशन रद्द कर दिए जाते हैं।</p>

<h2>अनुच्छेद 11 — दायित्व</h2>
<h3>11.1</h3>
<p>SOS-Expat कमीशन की न्यूनतम मात्रा की गारंटी नहीं देता।</p>
<h3>11.2</h3>
<p>रखरखाव के लिए प्लेटफ़ॉर्म अनुपलब्ध हो सकता है।</p>
<h3>11.3</h3>
<p>सहबद्ध अपने कर और सामाजिक दायित्वों के लिए स्वयं ज़िम्मेदार है।</p>

<h2>अनुच्छेद 12 — लागू कानून</h2>
<h3>12.1</h3>
<p>ये शर्तें फ्रांसीसी कानून द्वारा शासित हैं।</p>
<h3>12.2</h3>
<p>कोई भी विवाद पेरिस के सक्षम न्यायालयों के समक्ष प्रस्तुत किया जाएगा।</p>

<h2>अनुच्छेद 13 — संपर्क</h2>
<p>contact@sos-expat.com</p>`,
  },

  ch: {
    title: "SOS-Expat联盟计划条款和条件",
    content: `<h1>SOS-Expat联盟计划条款和条件</h1>

<h2>第一条 — 目的</h2>
<p>本文件规定了适用于SOS-Expat所有联盟计划（聊天员、网红、博主、群组管理员、一般推荐计划）的一般条款和条件。它是对每个角色特定条款和条件的补充。</p>

<h2>第二条 — 定义</h2>
<ul>
  <li><strong>联盟成员</strong>：在SOS-Expat任一联盟计划中注册的任何人。</li>
  <li><strong>被推荐人</strong>：通过联盟成员的链接或代码在SOS-Expat注册的人。</li>
  <li><strong>佣金</strong>：当发生符合条件的事件时，以美元计的固定金额记入联盟成员账户。</li>
  <li><strong>总薪酬</strong>：扣除提现费用前累计的佣金总额。</li>
  <li><strong>净薪酬</strong>：扣除提现费用后联盟成员实际收到的金额。</li>
  <li><strong>提现</strong>：联盟成员请求支付其可用佣金的操作。</li>
  <li><strong>联盟代码</strong>：分配给每个联盟成员用于推荐追踪的唯一标识符。</li>
</ul>

<h2>第三条 — 佣金</h2>
<h3>3.1 固定金额</h3>
<p>佣金为美元固定金额，不含增值税，按角色定义：</p>
<ul>
  <li>推荐客户来电佣金：根据服务商类型区分的固定金额 — 5美元（律师）或3美元（外籍帮助者）每次付费通话。</li>
  <li>招募服务商来电佣金：区分的固定金额 — 5美元（律师）或3美元（外籍帮助者）每次接听通话。</li>
  <li>具体金额由SOS-Expat配置，可在控制面板中查看。</li>
</ul>
<h3>3.2 费率锁定</h3>
<p>佣金费率在注册时锁定，即使全局配置被修改也不会改变。</p>
<h3>3.3 最低通话时长</h3>
<p>通话必须持续至少2分钟才有资格获得佣金。</p>
<h3>3.4 招募窗口</h3>
<p>招募佣金在被招募者注册后6个月内适用。</p>
<h3>3.5 归因</h3>
<p>归因基于Last-Click cookie，有效期为30天。</p>
<h3>3.6 佣金不可累计</h3>
<p>如果同一联盟成员在同一通话中既推荐了客户又招募了被咨询的服务商，则仅支付客户推荐佣金。同一联盟成员在同一通话中不可同时获得客户佣金和招募佣金。</p>

<h2>第四条 — 佣金支付</h2>
<h3>4.1 最低提现门槛</h3>
<p>最低提现门槛为30美元（USD）。</p>
<h3>4.2 支付方式</h3>
<p>可用支付方式包括：银行转账（Wise，40多个国家）、移动支付（Flutterwave，28个非洲国家）。</p>
<h3>4.3 货币</h3>
<p>佣金以美元计价。转账过程中的货币兑换费由联盟成员承担。</p>
<h3>4.4 保留期</h3>
<p>佣金在验证期（因角色而异，最短24小时）后变为"可用"状态。</p>
<h3>4.5 双重认证确认</h3>
<p>每次提现都需要通过Telegram进行确认。</p>
<h3>4.6 处理</h3>
<p>处理方式为混合模式：500美元以下自动处理，以上需管理员审批。</p>

<h2>第五条 — 提现费用</h2>
<h3>5.1</h3>
<p>每次提现扣除3美元（USD）的固定费用。</p>
<h3>5.2</h3>
<p>该费用涵盖处理成本和国际银行转账费用。</p>
<h3>5.3</h3>
<p>联盟成员收到的净金额 = 提现金额 − 提现费用。</p>
<h3>5.4</h3>
<p>费用可配置，可在个人空间中查看。</p>
<h3>5.5</h3>
<p>SOS-Expat承诺在费用发生任何变化时提前30天通知联盟成员。</p>
<h3>5.6 示例</h3>
<p>提现50美元 → 费用3美元 → 联盟成员收到47美元。</p>

<h2>第六条 — KYC和银行信息</h2>
<h3>6.1</h3>
<p>联盟成员必须在首次提现前提供有效的银行信息。</p>
<h3>6.2</h3>
<p>银行信息使用AES-256-GCM加密。</p>
<h3>6.3</h3>
<p>联盟成员必须在获得首次佣金后90天内完成身份验证（KYC）。</p>
<h3>6.4</h3>
<p>如果KYC在180天内未完成，资金视为放弃。</p>
<h3>6.5</h3>
<p>支持的银行账户类型：IBAN（欧洲/SEPA）、Sort Code（英国）、ABA/Routing（美国）、BSB（澳大利亚）、CLABE（墨西哥）、IFSC（印度）。</p>

<h2>第七条 — 反欺诈</h2>
<h3>7.1</h3>
<p>SOS-Expat使用自动化反欺诈检测系统。</p>
<h3>7.2</h3>
<p>禁止行为：自我推荐、一次性电子邮件、cookie操纵、多次注册、人工流量。</p>
<h3>7.3</h3>
<p>风险评分0-100：80/100以上自动封锁。</p>
<h3>7.4</h3>
<p>SOS-Expat保留在证实欺诈的情况下追回佣金的权利（追回期限为12个月）。</p>
<h3>7.5</h3>
<p>在怀疑欺诈的情况下，账户可能会被立即暂停。</p>

<h2>第八条 — 个人数据（GDPR）</h2>
<h3>8.1</h3>
<p>SOS-Expat根据GDPR处理个人数据。</p>
<h3>8.2</h3>
<p>法律依据：执行联盟合同。</p>
<h3>8.3</h3>
<p>收集的数据：身份、银行信息、佣金历史、IP地址、Telegram标识符。</p>
<h3>8.4</h3>
<p>保留期限：最后活动后5年（会计义务）。</p>
<h3>8.5</h3>
<p>权利：访问、更正、删除、可携带性、异议。</p>
<h3>8.6</h3>
<p>DPO：contact@sos-expat.com</p>

<h2>第九条 — 知识产权</h2>
<h3>9.1</h3>
<p>联盟成员可以仅在计划范围内使用SOS-Expat提供的名称、标志和营销材料。</p>
<h3>9.2</h3>
<p>任何滥用行为均被禁止。</p>

<h2>第十条 — 暂停和终止</h2>
<h3>10.1</h3>
<p>SOS-Expat可在违反本条款的情况下随时暂停或终止联盟成员的账户。</p>
<h3>10.2</h3>
<p>联盟成员可随时取消注册。已赚取的佣金仍应支付。</p>
<h3>10.3</h3>
<p>因欺诈而终止的情况下，待处理的佣金将被取消。</p>

<h2>第十一条 — 责任</h2>
<h3>11.1</h3>
<p>SOS-Expat不保证最低佣金量。</p>
<h3>11.2</h3>
<p>平台可能因维护而不可用。</p>
<h3>11.3</h3>
<p>联盟成员对其税务和社会义务承担全部责任。</p>

<h2>第十二条 — 适用法律</h2>
<h3>12.1</h3>
<p>本条款受法国法律管辖。</p>
<h3>12.2</h3>
<p>任何争议应提交至巴黎管辖法院。</p>

<h2>第十三条 — 联系方式</h2>
<p>contact@sos-expat.com</p>`,
  },

  ar: {
    title: "الشروط والأحكام العامة لبرنامج الشراكة SOS-Expat",
    content: `<h1>الشروط والأحكام العامة لبرنامج الشراكة SOS-Expat</h1>

<h2>المادة 1 — الموضوع</h2>
<p>تحدد هذه الوثيقة الشروط والأحكام العامة المطبقة على جميع برامج الشراكة في SOS-Expat (المحادثون، المؤثرون، المدونون، مديرو المجموعات، برنامج الإحالة العام). وهي تكمل الشروط والأحكام الخاصة بكل دور.</p>

<h2>المادة 2 — التعريفات</h2>
<ul>
  <li><strong>الشريك</strong>: أي شخص مسجل في أحد برامج الشراكة في SOS-Expat.</li>
  <li><strong>المُحال</strong>: شخص سجّل في SOS-Expat من خلال رابط أو رمز الشريك.</li>
  <li><strong>العمولة</strong>: مبلغ ثابت بالدولار الأمريكي يُقيَّد لحساب الشريك عند وقوع حدث مؤهل.</li>
  <li><strong>الأجر الإجمالي</strong>: إجمالي العمولات المتراكمة قبل خصم رسوم السحب.</li>
  <li><strong>الأجر الصافي</strong>: المبلغ الذي يتلقاه الشريك فعلياً بعد خصم رسوم السحب.</li>
  <li><strong>السحب</strong>: العملية التي يطلب بها الشريك دفع عمولاته المتاحة.</li>
  <li><strong>رمز الشريك</strong>: معرّف فريد يُخصص لكل شريك لتتبع الإحالات.</li>
</ul>

<h2>المادة 3 — العمولات</h2>
<h3>3.1 مبالغ ثابتة</h3>
<p>العمولات هي مبالغ ثابتة بالدولار الأمريكي، غير خاضعة لضريبة القيمة المضافة، محددة حسب الدور:</p>
<ul>
  <li>عمولة لكل مكالمة عميل مُحال: مبلغ ثابت مُتمايز حسب نوع مقدم الخدمة — 5$ (محامٍ) أو 3$ (مغترب مساعد) لكل مكالمة مدفوعة.</li>
  <li>عمولة لكل مكالمة مقدم خدمة مُجنَّد: مبلغ ثابت مُتمايز — 5$ (محامٍ) أو 3$ (مغترب مساعد) لكل مكالمة مستلمة.</li>
  <li>المبالغ الدقيقة قابلة للتكوين من قبل SOS-Expat ويمكن الاطلاع عليها في لوحة التحكم.</li>
</ul>
<h3>3.2 تجميد الأسعار</h3>
<p>يتم تجميد معدلات العمولة عند التسجيل ولا تتغير حتى لو تم تعديل التكوين العام.</p>
<h3>3.3 الحد الأدنى لمدة المكالمة</h3>
<p>يجب أن تستمر المكالمة لمدة دقيقتين على الأقل لتكون مؤهلة للحصول على عمولة.</p>
<h3>3.4 نافذة التجنيد</h3>
<p>تسري عمولات التجنيد لمدة 6 أشهر بعد تسجيل المُجنَّد.</p>
<h3>3.5 الإسناد</h3>
<p>يتم الإسناد بناءً على ملف تعريف الارتباط Last-Click بمدة 30 يوماً.</p>
<h3>3.6 عدم تراكم العمولات</h3>
<p>إذا قام نفس الشريك بإحالة العميل وتجنيد مقدم الخدمة المُستشار خلال نفس المكالمة، يتم دفع عمولة إحالة العميل فقط. لا يمكن الجمع بين عمولات العميل والتجنيد في نفس المكالمة لنفس الشريك.</p>

<h2>المادة 4 — دفع العمولات</h2>
<h3>4.1 الحد الأدنى للسحب</h3>
<p>الحد الأدنى للسحب هو 30$ (دولار أمريكي).</p>
<h3>4.2 طرق الدفع</h3>
<p>طرق الدفع المتاحة تشمل: تحويل بنكي (Wise، أكثر من 40 دولة)، الأموال عبر الهاتف المحمول (Flutterwave، 28 دولة أفريقية).</p>
<h3>4.3 العملة</h3>
<p>العمولات مقومة بالدولار الأمريكي. رسوم تحويل العملات أثناء التحويل يتحملها الشريك.</p>
<h3>4.4 فترة الاحتفاظ</h3>
<p>تصبح العمولات «متاحة» بعد فترة التحقق (تختلف حسب الدور، بحد أدنى 24 ساعة).</p>
<h3>4.5 تأكيد المصادقة الثنائية</h3>
<p>يتطلب كل سحب تأكيداً عبر Telegram.</p>
<h3>4.6 المعالجة</h3>
<p>المعالجة هجينة: تلقائية تحت 500$، موافقة المسؤول فوق ذلك.</p>

<h2>المادة 5 — رسوم السحب</h2>
<h3>5.1</h3>
<p>يُخصم رسم ثابت قدره 3$ (دولار أمريكي) من كل عملية سحب.</p>
<h3>5.2</h3>
<p>يغطي هذا الرسم تكاليف المعالجة والتحويل البنكي الدولي.</p>
<h3>5.3</h3>
<p>المبلغ الصافي الذي يتلقاه الشريك = مبلغ السحب − رسوم السحب.</p>
<h3>5.4</h3>
<p>الرسوم قابلة للتكوين ويمكن الاطلاع عليها في المساحة الشخصية.</p>
<h3>5.5</h3>
<p>تلتزم SOS-Expat بإبلاغ الشركاء بأي تغيير في الرسوم مع إشعار مسبق قدره 30 يوماً.</p>
<h3>5.6 مثال</h3>
<p>سحب 50$ → رسوم 3$ → يتلقى الشريك 47$.</p>

<h2>المادة 6 — التحقق من الهوية والبيانات المصرفية</h2>
<h3>6.1</h3>
<p>يجب على الشريك تقديم بيانات مصرفية صالحة قبل أي عملية سحب.</p>
<h3>6.2</h3>
<p>يتم تشفير المعلومات المصرفية باستخدام AES-256-GCM.</p>
<h3>6.3</h3>
<p>يجب على الشريك إكمال التحقق من الهوية (KYC) في غضون 90 يوماً من أول عمولة له.</p>
<h3>6.4</h3>
<p>إذا لم يتم إكمال التحقق من الهوية خلال 180 يوماً، تُعتبر الأموال متروكة.</p>
<h3>6.5</h3>
<p>أنواع الحسابات المصرفية المدعومة: IBAN (أوروبا/SEPA)، Sort Code (المملكة المتحدة)، ABA/Routing (الولايات المتحدة)، BSB (أستراليا)، CLABE (المكسيك)، IFSC (الهند).</p>

<h2>المادة 7 — مكافحة الاحتيال</h2>
<h3>7.1</h3>
<p>تستخدم SOS-Expat نظام كشف احتيال آلي.</p>
<h3>7.2</h3>
<p>السلوكيات المحظورة: الإحالة الذاتية، البريد الإلكتروني المؤقت، التلاعب بملفات تعريف الارتباط، التسجيلات المتعددة، حركة المرور الاصطناعية.</p>
<h3>7.3</h3>
<p>درجة المخاطر 0-100: حجب تلقائي ابتداءً من 80/100.</p>
<h3>7.4</h3>
<p>تحتفظ SOS-Expat بالحق في استرداد العمولات في حالة الاحتيال المثبت (استرداد خلال مهلة 12 شهراً).</p>
<h3>7.5</h3>
<p>يمكن تعليق الحساب فوراً في حالة الاشتباه بالاحتيال.</p>

<h2>المادة 8 — البيانات الشخصية (اللائحة العامة لحماية البيانات)</h2>
<h3>8.1</h3>
<p>تعالج SOS-Expat البيانات الشخصية وفقاً للائحة العامة لحماية البيانات (GDPR).</p>
<h3>8.2</h3>
<p>الأساس القانوني: تنفيذ عقد الشراكة.</p>
<h3>8.3</h3>
<p>البيانات المجمعة: الهوية، البيانات المصرفية، سجل العمولات، عنوان IP، معرّف Telegram.</p>
<h3>8.4</h3>
<p>مدة الاحتفاظ: 5 سنوات بعد آخر نشاط (التزامات محاسبية).</p>
<h3>8.5</h3>
<p>الحقوق: الوصول، التصحيح، المحو، قابلية النقل، الاعتراض.</p>
<h3>8.6</h3>
<p>مسؤول حماية البيانات: contact@sos-expat.com</p>

<h2>المادة 9 — الملكية الفكرية</h2>
<h3>9.1</h3>
<p>يجوز للشريك استخدام الاسم والشعار والمواد التسويقية المقدمة من SOS-Expat حصرياً في إطار البرنامج.</p>
<h3>9.2</h3>
<p>أي استخدام مسيء محظور.</p>

<h2>المادة 10 — التعليق والإنهاء</h2>
<h3>10.1</h3>
<p>يمكن لـ SOS-Expat تعليق أو إنهاء حساب الشريك في أي وقت في حالة انتهاك هذه الشروط.</p>
<h3>10.2</h3>
<p>يمكن للشريك إلغاء اشتراكه في أي وقت. تظل العمولات المكتسبة مستحقة.</p>
<h3>10.3</h3>
<p>في حالة الإنهاء بسبب الاحتيال، يتم إلغاء العمولات المعلقة.</p>

<h2>المادة 11 — المسؤولية</h2>
<h3>11.1</h3>
<p>لا تضمن SOS-Expat حداً أدنى من حجم العمولات.</p>
<h3>11.2</h3>
<p>قد تكون المنصة غير متاحة للصيانة.</p>
<h3>11.3</h3>
<p>الشريك وحده مسؤول عن التزاماته الضريبية والاجتماعية.</p>

<h2>المادة 12 — القانون الواجب التطبيق</h2>
<h3>12.1</h3>
<p>تخضع هذه الشروط للقانون الفرنسي.</p>
<h3>12.2</h3>
<p>يُحال أي نزاع إلى المحاكم المختصة في باريس.</p>

<h2>المادة 13 — الاتصال</h2>
<p>contact@sos-expat.com</p>`,
  },
};

// ============================================================
// Script principal
// ============================================================

async function main() {
  console.log(DRY_RUN ? "Mode DRY-RUN — aucune ecriture\n" : "Mode ECRITURE\n");

  let created = 0;
  let skipped = 0;

  for (const lang of LANGUAGES) {
    const docId = `terms_affiliate_${lang}`;
    const ref = db.collection("legal_documents").doc(docId);
    const snap = await ref.get();

    if (snap.exists) {
      console.log(`  [SKIP] ${docId} — document existe deja`);
      skipped++;
      continue;
    }

    const data = TERMS_AFFILIATE[lang];
    if (!data) {
      console.log(`  [WARN] ${docId} — pas de contenu pour la langue "${lang}"`);
      continue;
    }

    const doc = {
      id: docId,
      title: data.title,
      content: data.content,
      type: "terms_affiliate",
      language: lang,
      isActive: true,
      version: "1.1",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      publishedAt: FieldValue.serverTimestamp(),
    };

    if (DRY_RUN) {
      console.log(`  [DRY] ${docId} — CREERAIT "${data.title}" (${data.content.length} chars)`);
    } else {
      await ref.set(doc);
      console.log(`  [OK] ${docId} — "${data.title}" cree`);
    }
    created++;
  }

  console.log(`\nResume: ${created} crees, ${skipped} deja existants`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
