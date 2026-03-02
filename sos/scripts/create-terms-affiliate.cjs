/**
 * Crée les documents "terms_affiliate" dans Firestore (collection legal_documents)
 * pour les 9 langues supportées.
 *
 * Usage:
 *   node scripts/create-terms-affiliate.cjs
 *   node scripts/create-terms-affiliate.cjs --dry-run   (prévisualise sans écrire)
 *   node scripts/create-terms-affiliate.cjs --force       (force la mise à jour même si le document existe)
 */

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const app = initializeApp({ projectId: "sos-urgently-ac307" });
const db = getFirestore(app);

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

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
<h3>3.2 Révision des taux</h3>
<p>Les taux de commission en vigueur à la date d'inscription constituent les taux applicables par défaut. SOS-Expat se réserve le droit de modifier les taux de commission pour toute raison commerciale légitime, sous réserve d'un préavis de 60 jours communiqué par email et via le tableau de bord. L'Affilié qui n'accepte pas la modification peut résilier sans pénalité dans le délai de préavis.</p>
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
<p>Tout retrait requiert une confirmation à deux facteurs (2FA) : soit via Telegram (bot officiel SOS-Expat), soit via un code OTP envoyé par email. Si Telegram est indisponible, l'email constitue le mode de confirmation de secours.</p>
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
<p>Si le KYC n'est pas complété dans les 180 jours suivant la première commission, le compte est suspendu et les fonds sont conservés pendant 24 mois supplémentaires. L'Affilié peut débloquer son compte à tout moment en complétant le KYC. Au-delà de 24 mois sans réponse malgré deux relances par email, les fonds peuvent être reversés à une association caritative désignée par SOS-Expat, après notification formelle avec un délai de réponse de 30 jours.</p>
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

<h2>Article 8 — Données personnelles</h2>
<h3>8.1</h3>
<p>SOS-Expat traite les données personnelles conformément au RGPD (UE) ainsi qu'aux législations applicables selon le pays de résidence de l'Affilié, notamment : CCPA/CPRA (Californie, USA), LGPD (Brésil), Loi 25 (Québec), PDPA (Thaïlande), PDPL (Arabie Saoudite), POPIA (Afrique du Sud). L'entité responsable du traitement est WorldExpat OÜ, société de droit estonien, immatriculée en Estonie.</p>
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

<h2>Article 12 — Droit applicable et règlement des litiges</h2>
<h3>12.1</h3>
<p>Les présentes conditions sont régies par le droit estonien, sans préjudice des dispositions impératives du droit du pays de résidence de l'Affilié. SOS-Expat est exploitée par WorldExpat OÜ, société de droit estonien immatriculée en Estonie.</p>
<h3>12.2</h3>
<p>En cas de litige, les parties s'engagent à chercher une résolution amiable dans les 30 jours suivant la notification du litige. À défaut d'accord, le litige sera soumis à l'arbitrage de la Chambre de Commerce Internationale (CCI), avec siège à Tallinn (Estonie), conformément au Règlement d'arbitrage CCI en vigueur, par un arbitre unique statuant en français ou en anglais.</p>
<h3>12.3</h3>
<p>L'Affilié consommateur situé dans l'UE conserve le droit de saisir les juridictions de son pays de résidence pour les litiges relatifs à des droits de consommateur impératifs.</p>

<h2>Article 13 — Contact</h2>
<p>contact@sos-expat.com</p>
<h2>Article 14 — Modification des présentes CGU</h2>
<p>SOS-Expat se réserve le droit de modifier les présentes conditions générales pour toute raison légitime (évolution réglementaire, changement de modèle économique, sécurité). Toute modification substantielle est notifiée avec un préavis minimum de 60 jours par email et via le tableau de bord. En l'absence d'opposition écrite dans le délai imparti, les nouvelles conditions sont réputées acceptées. L'Affilié qui n'accepte pas les modifications peut résilier sans pénalité.</p>

<h2>Article 15 — Bonus de bienvenue</h2>
<p>Un bonus de 50 USD est crédité sur la tirelire de l'Affilié lors de la liaison réussie de son compte Telegram via le bot officiel SOS-Expat. Ce bonus est bloqué jusqu'à ce que l'Affilié ait généré au moins 150 USD de commissions organiques cumulées. Il ne peut pas faire l'objet d'un retrait autonome avant déblocage et expire si le compte est résilié pour fraude.</p>

<h2>Article 16 — Attribution et cookies</h2>
<p>Le suivi des conversions repose sur le code affilié unique et un cookie last-click de 30 jours. En cas de conflit d'attribution (liens multiples, codes multiples, conversion cross-device), SOS-Expat applique la règle du dernier clic documenté. L'Affilié peut contester une attribution dans les 30 jours suivant la commission litigieuse en contactant contact@sos-expat.com avec les justificatifs nécessaires.</p>

<h2>Article 17 — Obligations fiscales</h2>
<p>L'Affilié est seul responsable de la déclaration et du paiement des impôts, taxes et cotisations sociales applicables à ses revenus de commission dans son pays de résidence. SOS-Expat se conforme aux obligations de déclaration automatique des plateformes prévues par la Directive DAC7 (UE 2021/514) pour les Affiliés dépassant 2 000 EUR/an ou 25 transactions/an, ainsi qu'au formulaire 1099-K pour les Affiliés américains. SOS-Expat peut procéder à une retenue à la source conformément au droit fiscal applicable.</p>

<h2>Article 18 — Procédure contradictoire</h2>
<p>Avant toute annulation de commissions pour fraude présumée ou tout clawback, SOS-Expat notifie l'Affilié par email avec un exposé motivé des faits reprochés. L'Affilié dispose de 15 jours calendaires pour répondre et fournir les éléments de preuve contraires. La décision finale est communiquée dans les 15 jours suivant la réponse ou l'expiration du délai.</p>

<h2>Article 19 — Structure juridique du programme</h2>
<p>Le programme d'affiliation de SOS-Expat est un programme à un seul niveau (single-tier). Les commissions ne sont versées qu'à l'Affilié direct ayant généré l'événement éligible. Il n'existe pas de commissions multi-niveaux, de structure pyramidale, ni de rémunération liée au recrutement d'autres Affiliés. Seules les commissions liées aux appels payants de clients référés ou de prestataires recrutés par l'Affilié sont éligibles.</p>`,
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
<h3>3.2 Rate Modification</h3>
<p>Commission rates applicable at the date of registration are the default applicable rates. SOS-Expat reserves the right to modify commission rates for legitimate business reasons, subject to 60 days' notice communicated by email and via the dashboard. An Affiliate who does not accept the modification may terminate without penalty within the notice period.</p>
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
<p>Every withdrawal requires two-factor authentication (2FA): either via Telegram (official SOS-Expat bot) or via an OTP code sent by email. If Telegram is unavailable, email serves as the fallback confirmation method.</p>
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
<p>If KYC is not completed within 180 days of the first commission, the account is suspended and funds are held for an additional 24 months. The Affiliate may unblock their account at any time by completing KYC. Beyond 24 months without response despite two email reminders, funds may be donated to a charity designated by SOS-Expat, following formal notification with a 30-day response period.</p>
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

<h2>Article 8 — Personal Data</h2>
<h3>8.1</h3>
<p>SOS-Expat processes personal data in accordance with the GDPR (EU) and applicable laws based on the Affiliate's country of residence, including: CCPA/CPRA (California, USA), LGPD (Brazil), Law 25 (Québec), PDPA (Thailand), PDPL (Saudi Arabia), POPIA (South Africa). The data controller is WorldExpat OÜ, a company incorporated under Estonian law.</p>
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

<h2>Article 12 — Governing Law and Dispute Resolution</h2>
<h3>12.1</h3>
<p>These terms are governed by Estonian law, without prejudice to the mandatory provisions of the law of the Affiliate's country of residence. SOS-Expat is operated by WorldExpat OÜ, a company incorporated under Estonian law.</p>
<h3>12.2</h3>
<p>In the event of a dispute, the parties agree to seek an amicable resolution within 30 days of the dispute notification. Failing agreement, the dispute shall be submitted to arbitration by the International Chamber of Commerce (ICC), seated in Tallinn (Estonia), pursuant to the ICC Arbitration Rules in force, before a sole arbitrator conducting proceedings in English or French.</p>
<h3>12.3</h3>
<p>Affiliate consumers located in the EU retain the right to bring proceedings before the courts of their country of residence for disputes relating to mandatory consumer rights.</p>

<h2>Article 13 — Contact</h2>
<p>contact@sos-expat.com</p>
<h2>Article 14 — Modification of these Terms</h2>
<p>SOS-Expat reserves the right to modify these general terms for any legitimate reason (regulatory changes, business model changes, security). Any material modification is notified with a minimum 60-day notice by email and via the dashboard. In the absence of written objection within the specified period, the new terms are deemed accepted. An Affiliate who does not accept the modifications may terminate without penalty.</p>

<h2>Article 15 — Welcome Bonus</h2>
<p>A bonus of $50 USD is credited to the Affiliate's wallet upon successful linking of their Telegram account via the official SOS-Expat bot. This bonus is locked until the Affiliate has generated at least $150 USD in cumulative organic commissions. It cannot be independently withdrawn before unlocking and expires if the account is terminated for fraud.</p>

<h2>Article 16 — Attribution and Cookies</h2>
<p>Conversion tracking relies on the unique affiliate code and a 30-day last-click cookie. In case of attribution conflict (multiple links, multiple codes, cross-device conversion), SOS-Expat applies the last documented click rule. The Affiliate may dispute an attribution within 30 days of the disputed commission by contacting contact@sos-expat.com with supporting evidence.</p>

<h2>Article 17 — Tax Obligations</h2>
<p>The Affiliate is solely responsible for declaring and paying taxes, levies, and social contributions applicable to their commission income in their country of residence. SOS-Expat complies with automatic platform reporting obligations under the DAC7 Directive (EU 2021/514) for Affiliates exceeding €2,000/year or 25 transactions/year, as well as Form 1099-K for US Affiliates. SOS-Expat may withhold tax in accordance with applicable tax law.</p>

<h2>Article 18 — Adversarial Procedure</h2>
<p>Before any cancellation of commissions for alleged fraud or any clawback, SOS-Expat notifies the Affiliate by email with a reasoned account of the alleged facts. The Affiliate has 15 calendar days to respond and provide counter-evidence. The final decision is communicated within 15 days of the response or expiry of the period.</p>

<h2>Article 19 — Legal Structure of the Program</h2>
<p>The SOS-Expat affiliate program is a single-tier program. Commissions are only paid to the direct Affiliate who generated the eligible event. There are no multi-level commissions, pyramid structures, or remuneration linked to the recruitment of other Affiliates. Only commissions related to paid calls from referred clients or providers recruited by the Affiliate are eligible.</p>`,
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
<h3>3.2 Modificación de tasas</h3>
<p>Las tasas de comisión vigentes en la fecha de inscripción son las tasas aplicables por defecto. SOS-Expat se reserva el derecho de modificar las tasas de comisión por motivos comerciales legítimos, con un preaviso de 60 días comunicado por correo electrónico y a través del panel de control. El Afiliado que no acepte la modificación puede rescindir sin penalización dentro del plazo de preaviso.</p>
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
<p>Todo retiro requiere autenticación de dos factores (2FA): bien mediante Telegram (bot oficial de SOS-Expat), bien mediante un código OTP enviado por correo electrónico. Si Telegram no está disponible, el correo electrónico actúa como método de confirmación alternativo.</p>
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
<p>Si el KYC no se completa en los 180 días siguientes a la primera comisión, la cuenta queda suspendida y los fondos se conservan durante 24 meses adicionales. El Afiliado puede desbloquear su cuenta en cualquier momento completando el KYC. Pasados 24 meses sin respuesta a pesar de dos recordatorios por correo electrónico, los fondos podrán donarse a una organización benéfica designada por SOS-Expat, previa notificación formal con un plazo de respuesta de 30 días.</p>
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

<h2>Artículo 8 — Datos personales</h2>
<h3>8.1</h3>
<p>SOS-Expat trata los datos personales conforme al RGPD (UE) y a las legislaciones aplicables según el país de residencia del Afiliado, incluyendo: CCPA/CPRA (California, EE.UU.), LGPD (Brasil), Ley 25 (Québec), PDPA (Tailandia), PDPL (Arabia Saudita), POPIA (Sudáfrica). El responsable del tratamiento es WorldExpat OÜ, empresa constituida bajo la ley estonia.</p>
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

<h2>Artículo 12 — Derecho aplicable y resolución de litigios</h2>
<h3>12.1</h3>
<p>Las presentes condiciones se rigen por el derecho estonio, sin perjuicio de las disposiciones imperativas del derecho del país de residencia del Afiliado. SOS-Expat es operada por WorldExpat OÜ, sociedad constituida bajo la ley estonia.</p>
<h3>12.2</h3>
<p>En caso de litigio, las partes se comprometen a buscar una resolución amistosa en los 30 días siguientes a la notificación del litigio. Si no se llega a un acuerdo, el litigio se someterá al arbitraje de la Cámara de Comercio Internacional (CCI), con sede en Tallin (Estonia), conforme al Reglamento de Arbitraje de la CCI en vigor, ante un árbitro único que actuará en español, francés o inglés.</p>
<h3>12.3</h3>
<p>El Afiliado consumidor situado en la UE conserva el derecho de acudir a los tribunales de su país de residencia para los litigios relacionados con derechos de consumidor imperativos.</p>

<h2>Artículo 13 — Contacto</h2>
<p>contact@sos-expat.com</p>
<h2>Artículo 14 — Modificación de los presentes Términos</h2>
<p>SOS-Expat se reserva el derecho de modificar las presentes condiciones generales por cualquier motivo legítimo (cambios normativos, cambios en el modelo de negocio, seguridad). Cualquier modificación sustancial se notifica con un preaviso mínimo de 60 días por correo electrónico y a través del panel de control. En ausencia de oposición escrita dentro del plazo establecido, las nuevas condiciones se consideran aceptadas. El Afiliado que no acepte las modificaciones puede rescindir sin penalización.</p>

<h2>Artículo 15 — Bono de bienvenida</h2>
<p>Se acredita un bono de 50 USD en la hucha del Afiliado al enlazar exitosamente su cuenta de Telegram mediante el bot oficial de SOS-Expat. Este bono permanece bloqueado hasta que el Afiliado haya generado al menos 150 USD en comisiones orgánicas acumuladas. No puede retirarse de forma independiente antes del desbloqueo y caduca si la cuenta se rescinde por fraude.</p>

<h2>Artículo 16 — Atribución y cookies</h2>
<p>El seguimiento de conversiones se basa en el código de afiliado único y una cookie last-click de 30 días. En caso de conflicto de atribución (múltiples enlaces, múltiples códigos, conversión cross-device), SOS-Expat aplica la regla del último clic documentado. El Afiliado puede impugnar una atribución en los 30 días siguientes a la comisión disputada contactando con contact@sos-expat.com y aportando la documentación necesaria.</p>

<h2>Artículo 17 — Obligaciones fiscales</h2>
<p>El Afiliado es el único responsable de declarar y pagar los impuestos, tasas y cotizaciones sociales aplicables a sus ingresos por comisiones en su país de residencia. SOS-Expat cumple con las obligaciones de declaración automática de plataformas previstas por la Directiva DAC7 (UE 2021/514) para Afiliados que superen los 2.000 EUR/año o 25 transacciones/año, así como el formulario 1099-K para Afiliados estadounidenses. SOS-Expat puede practicar retenciones fiscales conforme al derecho tributario aplicable.</p>

<h2>Artículo 18 — Procedimiento contradictorio</h2>
<p>Antes de cualquier cancelación de comisiones por presunto fraude o cualquier clawback, SOS-Expat notifica al Afiliado por correo electrónico con una exposición motivada de los hechos imputados. El Afiliado dispone de 15 días naturales para responder y aportar pruebas contrarias. La decisión final se comunica en los 15 días siguientes a la respuesta o al vencimiento del plazo.</p>

<h2>Artículo 19 — Estructura jurídica del programa</h2>
<p>El programa de afiliación de SOS-Expat es un programa de un solo nivel (single-tier). Las comisiones solo se abonan al Afiliado directo que haya generado el evento elegible. No existen comisiones multinivel, estructuras piramidales ni remuneración vinculada al reclutamiento de otros Afiliados. Solo son elegibles las comisiones relacionadas con llamadas pagadas de clientes referidos o prestadores reclutados por el Afiliado.</p>`,
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
<h3>3.2 Änderung der Provisionssätze</h3>
<p>Die zum Zeitpunkt der Registrierung geltenden Provisionssätze sind die standardmäßig anwendbaren Sätze. SOS-Expat behält sich das Recht vor, die Provisionssätze aus legitimen geschäftlichen Gründen zu ändern, mit einer Frist von 60 Tagen, die per E-Mail und über das Dashboard mitgeteilt wird. Ein Partner, der die Änderung nicht akzeptiert, kann innerhalb der Kündigungsfrist ohne Strafe kündigen.</p>
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
<p>Jede Auszahlung erfordert eine Zwei-Faktor-Authentifizierung (2FA): entweder über Telegram (offizieller SOS-Expat-Bot) oder über einen per E-Mail gesendeten OTP-Code. Wenn Telegram nicht verfügbar ist, dient E-Mail als alternative Bestätigungsmethode.</p>
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
<p>Wird das KYC nicht innerhalb von 180 Tagen nach der ersten Provision abgeschlossen, wird das Konto gesperrt und die Gelder werden für weitere 24 Monate aufbewahrt. Der Partner kann sein Konto jederzeit durch Abschluss des KYC entsperren. Nach 24 Monaten ohne Reaktion trotz zweier E-Mail-Erinnerungen können die Gelder nach formeller Benachrichtigung mit einer Antwortfrist von 30 Tagen an eine von SOS-Expat benannte gemeinnützige Organisation gespendet werden.</p>
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

<h2>Artikel 8 — Personenbezogene Daten</h2>
<h3>8.1</h3>
<p>SOS-Expat verarbeitet personenbezogene Daten gemäß der DSGVO (EU) und den je nach Wohnsitzland des Partners geltenden Gesetzen, einschließlich: CCPA/CPRA (Kalifornien, USA), LGPD (Brasilien), Gesetz 25 (Québec), PDPA (Thailand), PDPL (Saudi-Arabien), POPIA (Südafrika). Der Verantwortliche für die Datenverarbeitung ist WorldExpat OÜ, eine nach estnischem Recht gegründete Gesellschaft.</p>
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

<h2>Artikel 12 — Anwendbares Recht und Streitbeilegung</h2>
<h3>12.1</h3>
<p>Diese Bedingungen unterliegen estnischem Recht, unbeschadet der zwingenden Bestimmungen des Rechts des Wohnsitzlandes des Partners. SOS-Expat wird von WorldExpat OÜ betrieben, einer nach estnischem Recht gegründeten Gesellschaft.</p>
<h3>12.2</h3>
<p>Im Streitfall verpflichten sich die Parteien, innerhalb von 30 Tagen nach Bekanntmachung des Streits eine gütliche Lösung zu suchen. Scheitert eine Einigung, wird der Streit der Schiedsgerichtsbarkeit der Internationalen Handelskammer (ICC) mit Sitz in Tallinn (Estland) gemäß den geltenden ICC-Schiedsregeln vor einem Einzelschiedsrichter, der das Verfahren auf Englisch oder Deutsch führt, vorgelegt.</p>
<h3>12.3</h3>
<p>Verbraucher-Partner mit Wohnsitz in der EU behalten das Recht, die Gerichte ihres Wohnsitzlandes für Streitigkeiten im Zusammenhang mit zwingenden Verbraucherrechten anzurufen.</p>

<h2>Artikel 13 — Kontakt</h2>
<p>contact@sos-expat.com</p>
<h2>Artikel 14 — Änderung dieser Bedingungen</h2>
<p>SOS-Expat behält sich das Recht vor, diese allgemeinen Bedingungen aus legitimen Gründen zu ändern (regulatorische Änderungen, Änderungen des Geschäftsmodells, Sicherheit). Jede wesentliche Änderung wird mit einer Mindestfrist von 60 Tagen per E-Mail und über das Dashboard mitgeteilt. In Ermangelung eines schriftlichen Widerspruchs innerhalb der angegebenen Frist gelten die neuen Bedingungen als akzeptiert. Ein Partner, der die Änderungen nicht akzeptiert, kann ohne Strafe kündigen.</p>

<h2>Artikel 15 — Willkommensbonus</h2>
<p>Ein Bonus von 50 USD wird dem Sparschwein des Partners gutgeschrieben, wenn sein Telegram-Konto erfolgreich über den offiziellen SOS-Expat-Bot verknüpft wird. Dieser Bonus ist gesperrt, bis der Partner mindestens 150 USD an kumulierten organischen Provisionen generiert hat. Er kann vor der Freischaltung nicht eigenständig ausgezahlt werden und verfällt, wenn das Konto wegen Betrugs gekündigt wird.</p>

<h2>Artikel 16 — Attribution und Cookies</h2>
<p>Das Conversion-Tracking basiert auf dem eindeutigen Partner-Code und einem 30-Tage-Last-Click-Cookie. Bei Attributionskonflikten (mehrere Links, mehrere Codes, geräteübergreifende Conversion) wendet SOS-Expat die Regel des letzten dokumentierten Klicks an. Der Partner kann eine Attribution innerhalb von 30 Tagen nach der strittigen Provision anfechten, indem er contact@sos-expat.com mit den erforderlichen Belegen kontaktiert.</p>

<h2>Artikel 17 — Steuerliche Pflichten</h2>
<p>Der Partner ist allein verantwortlich für die Erklärung und Zahlung von Steuern, Abgaben und Sozialversicherungsbeiträgen auf seine Provisionseinnahmen in seinem Wohnsitzland. SOS-Expat erfüllt die automatischen Meldepflichten für Plattformen gemäß der DAC7-Richtlinie (EU 2021/514) für Partner, die 2.000 EUR/Jahr oder 25 Transaktionen/Jahr überschreiten, sowie das Formular 1099-K für US-Partner. SOS-Expat kann gemäß geltendem Steuerrecht Quellensteuern einbehalten.</p>

<h2>Artikel 18 — Kontradiktorisches Verfahren</h2>
<p>Vor jeder Stornierung von Provisionen wegen mutmaßlichem Betrug oder einem Clawback benachrichtigt SOS-Expat den Partner per E-Mail mit einer begründeten Darstellung der vorgeworfenen Sachverhalte. Der Partner hat 15 Kalendertage Zeit, zu antworten und Gegenbeweise vorzulegen. Die endgültige Entscheidung wird innerhalb von 15 Tagen nach der Antwort oder dem Ablauf der Frist mitgeteilt.</p>

<h2>Artikel 19 — Rechtliche Struktur des Programms</h2>
<p>Das Partnerprogramm von SOS-Expat ist ein einstufiges Programm (Single-Tier). Provisionen werden nur an den direkten Partner ausgezahlt, der das provisionsfähige Ereignis generiert hat. Es gibt keine mehrstufigen Provisionen, Pyramidenstrukturen oder Vergütungen, die mit der Anwerbung anderer Partner verbunden sind. Nur Provisionen im Zusammenhang mit bezahlten Anrufen von vermittelten Kunden oder vom Partner angeworbenen Dienstleistern sind provisionsfähig.</p>`,
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
<h3>3.2 Modificação de taxas</h3>
<p>As taxas de comissão em vigor na data de inscrição são as taxas aplicáveis por defeito. A SOS-Expat reserva-se o direito de modificar as taxas de comissão por motivos comerciais legítimos, mediante aviso prévio de 60 dias comunicado por e-mail e através do painel de controle. O Afiliado que não aceitar a modificação pode rescindir sem penalidade dentro do prazo de aviso.</p>
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
<p>Todo saque requer autenticação de dois fatores (2FA): seja via Telegram (bot oficial da SOS-Expat), seja via código OTP enviado por e-mail. Se o Telegram estiver indisponível, o e-mail serve como método de confirmação alternativo.</p>
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
<p>Se o KYC não for completado nos 180 dias seguintes à primeira comissão, a conta fica suspensa e os fundos são conservados por mais 24 meses. O Afiliado pode desbloquear a sua conta a qualquer momento completando o KYC. Após 24 meses sem resposta apesar de dois lembretes por e-mail, os fundos poderão ser doados a uma instituição de caridade designada pela SOS-Expat, mediante notificação formal com prazo de resposta de 30 dias.</p>
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

<h2>Artigo 8 — Dados pessoais</h2>
<h3>8.1</h3>
<p>A SOS-Expat trata os dados pessoais em conformidade com o RGPD (UE) e com as legislações aplicáveis em função do país de residência do Afiliado, incluindo: CCPA/CPRA (Califórnia, EUA), LGPD (Brasil), Lei 25 (Québec), PDPA (Tailândia), PDPL (Arábia Saudita), POPIA (África do Sul). O responsável pelo tratamento é a WorldExpat OÜ, sociedade constituída ao abrigo da lei estoniana.</p>
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

<h2>Artigo 12 — Direito aplicável e resolução de litígios</h2>
<h3>12.1</h3>
<p>Os presentes termos são regidos pelo direito estoniano, sem prejuízo das disposições imperativas do direito do país de residência do Afiliado. A SOS-Expat é operada pela WorldExpat OÜ, sociedade constituída ao abrigo da lei estoniana.</p>
<h3>12.2</h3>
<p>Em caso de litígio, as partes comprometem-se a procurar uma resolução amigável nos 30 dias seguintes à notificação do litígio. Na falta de acordo, o litígio será submetido à arbitragem da Câmara de Comércio Internacional (CCI), com sede em Tallinn (Estónia), nos termos do Regulamento de Arbitragem da CCI em vigor, perante um árbitro único que conduzirá o processo em inglês ou português.</p>
<h3>12.3</h3>
<p>O Afiliado consumidor situado na UE conserva o direito de recorrer aos tribunais do seu país de residência para litígios relacionados com direitos de consumidor imperativos.</p>

<h2>Artigo 13 — Contacto</h2>
<p>contact@sos-expat.com</p>
<h2>Artigo 14 — Modificação dos presentes Termos</h2>
<p>A SOS-Expat reserva-se o direito de modificar os presentes termos gerais por qualquer motivo legítimo (alterações regulatórias, mudanças no modelo de negócio, segurança). Qualquer modificação substancial é notificada com um aviso prévio mínimo de 60 dias por e-mail e através do painel de controle. Na ausência de oposição escrita dentro do prazo estabelecido, os novos termos são considerados aceites. O Afiliado que não aceitar as modificações pode rescindir sem penalidade.</p>

<h2>Artigo 15 — Bónus de boas-vindas</h2>
<p>Um bónus de 50 USD é creditado no mealheiro do Afiliado ao ligar com sucesso a sua conta Telegram através do bot oficial da SOS-Expat. Este bónus fica bloqueado até que o Afiliado tenha gerado pelo menos 150 USD em comissões orgânicas acumuladas. Não pode ser levantado de forma independente antes do desbloqueio e caduca se a conta for rescindida por fraude.</p>

<h2>Artigo 16 — Atribuição e cookies</h2>
<p>O rastreamento de conversões baseia-se no código de afiliado único e num cookie last-click de 30 dias. Em caso de conflito de atribuição (múltiplos links, múltiplos códigos, conversão cross-device), a SOS-Expat aplica a regra do último clique documentado. O Afiliado pode contestar uma atribuição nos 30 dias seguintes à comissão disputada contactando contact@sos-expat.com com a documentação necessária.</p>

<h2>Artigo 17 — Obrigações fiscais</h2>
<p>O Afiliado é o único responsável pela declaração e pagamento de impostos, taxas e contribuições sociais aplicáveis aos seus rendimentos de comissões no seu país de residência. A SOS-Expat cumpre as obrigações de declaração automática das plataformas previstas pela Diretiva DAC7 (UE 2021/514) para Afiliados que excedam 2.000 EUR/ano ou 25 transações/ano, bem como o formulário 1099-K para Afiliados norte-americanos. A SOS-Expat pode efetuar retenção na fonte em conformidade com o direito fiscal aplicável.</p>

<h2>Artigo 18 — Procedimento contraditório</h2>
<p>Antes de qualquer cancelamento de comissões por fraude presumida ou qualquer clawback, a SOS-Expat notifica o Afiliado por e-mail com uma exposição fundamentada dos factos imputados. O Afiliado dispõe de 15 dias de calendário para responder e apresentar elementos de prova contrários. A decisão final é comunicada nos 15 dias seguintes à resposta ou ao termo do prazo.</p>

<h2>Artigo 19 — Estrutura jurídica do programa</h2>
<p>O programa de afiliação da SOS-Expat é um programa de nível único (single-tier). As comissões só são pagas ao Afiliado direto que gerou o evento elegível. Não existem comissões multinível, estruturas piramidais nem remuneração associada ao recrutamento de outros Afiliados. Apenas são elegíveis as comissões relacionadas com chamadas pagas de clientes indicados ou prestadores recrutados pelo Afiliado.</p>`,
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
<h3>3.2 Изменение ставок</h3>
<p>Ставки комиссий, действующие на дату регистрации, являются ставками по умолчанию. SOS-Expat оставляет за собой право изменять ставки комиссий по обоснованным коммерческим причинам с предварительным уведомлением за 60 дней, направляемым по электронной почте и через личный кабинет. Партнёр, не принявший изменение, вправе расторгнуть договор без штрафа в течение срока уведомления.</p>
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
<p>Каждый вывод средств требует двухфакторной аутентификации (2FA): либо через Telegram (официальный бот SOS-Expat), либо через OTP-код, отправленный по электронной почте. Если Telegram недоступен, электронная почта служит резервным методом подтверждения.</p>
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
<p>Если KYC не завершён в течение 180 дней после первой комиссии, аккаунт приостанавливается, а средства хранятся ещё 24 месяца. Партнёр может разблокировать аккаунт в любое время, пройдя KYC. По истечении 24 месяцев без ответа, несмотря на два напоминания по электронной почте, средства могут быть перечислены в благотворительную организацию, определённую SOS-Expat, после официального уведомления с 30-дневным сроком ответа.</p>
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

<h2>Статья 8 — Персональные данные</h2>
<h3>8.1</h3>
<p>SOS-Expat обрабатывает персональные данные в соответствии с GDPR (ЕС) и применимым законодательством в зависимости от страны проживания Партнёра, включая: CCPA/CPRA (Калифорния, США), LGPD (Бразилия), Закон 25 (Квебек), PDPA (Таиланд), PDPL (Саудовская Аравия), POPIA (ЮАР). Контролёром данных является WorldExpat OÜ, компания, зарегистрированная по эстонскому праву.</p>
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

<h2>Статья 12 — Применимое право и разрешение споров</h2>
<h3>12.1</h3>
<p>Настоящие условия регулируются эстонским правом без ущерба для обязательных норм права страны проживания Партнёра. SOS-Expat управляется компанией WorldExpat OÜ, зарегистрированной по эстонскому праву.</p>
<h3>12.2</h3>
<p>В случае спора стороны обязуются предпринять попытку урегулирования в течение 30 дней с момента уведомления о споре. При отсутствии договорённости спор передаётся на рассмотрение арбитража Международной торговой палаты (МТП) с местом проведения в Таллине (Эстония) в соответствии с действующим Регламентом арбитража МТП, единственным арбитром, ведущим разбирательство на русском, английском или французском языке.</p>
<h3>12.3</h3>
<p>Партнёры-потребители, проживающие в ЕС, сохраняют право обращаться в суды своей страны проживания по спорам, связанным с обязательными правами потребителей.</p>

<h2>Статья 13 — Контакты</h2>
<p>contact@sos-expat.com</p>
<h2>Статья 14 — Изменение настоящих условий</h2>
<p>SOS-Expat оставляет за собой право изменять настоящие общие условия по любым законным причинам (изменения в законодательстве, изменение бизнес-модели, безопасность). О любом существенном изменении уведомляется с минимальным предупреждением за 60 дней по электронной почте и через личный кабинет. В отсутствие письменных возражений в установленный срок новые условия считаются принятыми. Партнёр, не принявший изменения, вправе расторгнуть договор без штрафа.</p>

<h2>Статья 15 — Приветственный бонус</h2>
<p>Бонус в размере 50 USD начисляется на кошелёк Партнёра при успешной привязке аккаунта Telegram через официальный бот SOS-Expat. Этот бонус заблокирован до тех пор, пока Партнёр не накопит не менее 150 USD органических комиссий. Он не может быть самостоятельно выведен до разблокировки и аннулируется в случае расторжения аккаунта за мошенничество.</p>

<h2>Статья 16 — Атрибуция и куки</h2>
<p>Отслеживание конверсий основано на уникальном партнёрском коде и 30-дневном last-click cookie. При конфликте атрибуции (несколько ссылок, несколько кодов, кросс-устройственная конверсия) SOS-Expat применяет правило последнего задокументированного клика. Партнёр может оспорить атрибуцию в течение 30 дней после спорной комиссии, обратившись на contact@sos-expat.com с необходимыми подтверждающими документами.</p>

<h2>Статья 17 — Налоговые обязательства</h2>
<p>Партнёр несёт единоличную ответственность за декларирование и уплату налогов, сборов и взносов на социальное страхование с доходов от комиссий в стране своего проживания. SOS-Expat выполняет обязательства по автоматической отчётности платформ согласно Директиве DAC7 (ЕС 2021/514) для Партнёров, превышающих 2 000 EUR/год или 25 транзакций/год, а также требования Формы 1099-K для Партнёров из США. SOS-Expat может удерживать налог у источника в соответствии с применимым налоговым законодательством.</p>

<h2>Статья 18 — Состязательная процедура</h2>
<p>До любой отмены комиссий за предполагаемое мошенничество или любого clawback SOS-Expat уведомляет Партнёра по электронной почте с обоснованным изложением предъявляемых фактов. Партнёр имеет 15 календарных дней для ответа и предоставления опровергающих доказательств. Окончательное решение сообщается в течение 15 дней после получения ответа или истечения срока.</p>

<h2>Статья 19 — Правовая структура программы</h2>
<p>Партнёрская программа SOS-Expat является одноуровневой программой (single-tier). Комиссии выплачиваются только прямому Партнёру, сгенерировавшему квалифицирующее событие. Не существует многоуровневых комиссий, пирамидных структур или вознаграждения, связанного с привлечением других Партнёров. Право на комиссию имеют только выплаты, связанные с оплаченными звонками привлечённых клиентов или поставщиков услуг, завербованных Партнёром.</p>`,
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
<h3>3.2 दरों का संशोधन</h3>
<p>पंजीकरण की तिथि पर लागू कमीशन दरें डिफ़ॉल्ट लागू दरें हैं। SOS-Expat को वैध व्यावसायिक कारणों से कमीशन दरें संशोधित करने का अधिकार सुरक्षित है, जिसके लिए ईमेल और डैशबोर्ड के माध्यम से 60 दिन का पूर्व नोटिस दिया जाएगा। संशोधन स्वीकार न करने वाला सहबद्ध नोटिस अवधि के भीतर बिना दंड के अनुबंध समाप्त कर सकता है।</p>
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
<p>प्रत्येक निकासी के लिए दो-कारक प्रमाणीकरण (2FA) आवश्यक है: या तो Telegram (आधिकारिक SOS-Expat बॉट) के माध्यम से, या ईमेल द्वारा भेजे गए OTP कोड के माध्यम से। यदि Telegram अनुपलब्ध है, तो ईमेल वैकल्पिक पुष्टि विधि के रूप में कार्य करता है।</p>
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
<p>यदि पहले कमीशन के 180 दिनों के भीतर KYC पूरा नहीं होता है, तो खाता निलंबित कर दिया जाता है और धनराशि अतिरिक्त 24 महीनों के लिए संरक्षित रखी जाती है। सहबद्ध किसी भी समय KYC पूरा करके अपना खाता अनब्लॉक कर सकता है। दो ईमेल अनुस्मारक के बावजूद 24 महीने बिना प्रतिक्रिया के गुजरने पर, 30 दिन के जवाबी समय के साथ औपचारिक सूचना के बाद धनराशि SOS-Expat द्वारा निर्दिष्ट किसी धर्मार्थ संस्था को दान की जा सकती है।</p>
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

<h2>अनुच्छेद 8 — व्यक्तिगत डेटा</h2>
<h3>8.1</h3>
<p>SOS-Expat GDPR (EU) के अनुसार और सहबद्ध के निवास देश के अनुसार लागू कानूनों के तहत व्यक्तिगत डेटा का प्रसंस्करण करता है, जिनमें शामिल हैं: CCPA/CPRA (कैलिफ़ोर्निया, USA), LGPD (ब्राज़ील), कानून 25 (क्यूबेक), PDPA (थाईलैंड), PDPL (सऊदी अरब), POPIA (दक्षिण अफ्रीका)। डेटा नियंत्रक WorldExpat OÜ है, जो एस्टोनियाई कानून के तहत पंजीकृत कंपनी है।</p>
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

<h2>अनुच्छेद 12 — लागू कानून और विवाद समाधान</h2>
<h3>12.1</h3>
<p>ये शर्तें एस्टोनियाई कानून द्वारा शासित हैं, बिना सहबद्ध के निवास देश के अनिवार्य प्रावधानों पर प्रतिकूल प्रभाव डाले। SOS-Expat का संचालन WorldExpat OÜ द्वारा किया जाता है, जो एस्टोनियाई कानून के तहत पंजीकृत कंपनी है।</p>
<h3>12.2</h3>
<p>विवाद की स्थिति में, पक्ष विवाद की अधिसूचना के 30 दिनों के भीतर सौहार्दपूर्ण समाधान खोजने का प्रयास करने के लिए सहमत हैं। समझौते के अभाव में, विवाद अंतर्राष्ट्रीय वाणिज्य चैंबर (ICC) के मध्यस्थता के अधीन होगा, जिसका मुख्यालय तालिन (एस्टोनिया) में है, प्रभावी ICC मध्यस्थता नियमों के अनुसार, एक एकल मध्यस्थ के समक्ष जो अंग्रेजी या हिंदी में कार्यवाही संचालित करेगा।</p>
<h3>12.3</h3>
<p>EU में स्थित सहबद्ध उपभोक्ता अनिवार्य उपभोक्ता अधिकारों से संबंधित विवादों के लिए अपने निवास देश के न्यायालयों में जाने का अधिकार सुरक्षित रखते हैं।</p>

<h2>अनुच्छेद 13 — संपर्क</h2>
<p>contact@sos-expat.com</p>
<h2>अनुच्छेद 14 — इन शर्तों का संशोधन</h2>
<p>SOS-Expat किसी भी वैध कारण (नियामक परिवर्तन, व्यवसाय मॉडल में बदलाव, सुरक्षा) के लिए इन सामान्य शर्तों को संशोधित करने का अधिकार सुरक्षित रखता है। किसी भी महत्वपूर्ण संशोधन की सूचना ईमेल और डैशबोर्ड के माध्यम से न्यूनतम 60 दिन पहले दी जाती है। निर्धारित अवधि के भीतर लिखित आपत्ति न होने पर नई शर्तें स्वीकृत मानी जाती हैं। संशोधन स्वीकार न करने वाला सहबद्ध बिना दंड के अनुबंध समाप्त कर सकता है।</p>

<h2>अनुच्छेद 15 — स्वागत बोनस</h2>
<p>आधिकारिक SOS-Expat बॉट के माध्यम से Telegram खाता सफलतापूर्वक लिंक करने पर सहबद्ध के वॉलेट में 50 USD बोनस जमा किया जाता है। यह बोनस तब तक लॉक रहता है जब तक सहबद्ध कम से कम 150 USD संचित जैविक कमीशन अर्जित नहीं कर लेता। इसे अनलॉक होने से पहले स्वतंत्र रूप से नहीं निकाला जा सकता और धोखाधड़ी के कारण खाता बंद होने पर यह समाप्त हो जाता है।</p>

<h2>अनुच्छेद 16 — एट्रिब्यूशन और कुकीज़</h2>
<p>रूपांतरण ट्रैकिंग अद्वितीय सहबद्ध कोड और 30-दिन के last-click कुकी पर आधारित है। एट्रिब्यूशन विवाद (एकाधिक लिंक, एकाधिक कोड, क्रॉस-डिवाइस रूपांतरण) की स्थिति में, SOS-Expat अंतिम दस्तावेज़ीकृत क्लिक नियम लागू करता है। सहबद्ध विवादित कमीशन के 30 दिनों के भीतर आवश्यक प्रमाणों के साथ contact@sos-expat.com से संपर्क करके एट्रिब्यूशन पर आपत्ति कर सकता है।</p>

<h2>अनुच्छेद 17 — कर दायित्व</h2>
<p>सहबद्ध अपने निवास देश में कमीशन आय पर लागू करों, शुल्कों और सामाजिक योगदानों की घोषणा और भुगतान के लिए पूरी तरह जिम्मेदार है। SOS-Expat DAC7 निर्देश (EU 2021/514) के तहत प्लेटफॉर्म की स्वचालित रिपोर्टिंग दायित्वों का पालन करता है जो 2,000 EUR/वर्ष या 25 लेनदेन/वर्ष से अधिक सहबद्धों के लिए है, साथ ही अमेरिकी सहबद्धों के लिए Form 1099-K। SOS-Expat लागू कर कानून के अनुसार स्रोत पर कर कटौती कर सकता है।</p>

<h2>अनुच्छेद 18 — विरोधी प्रक्रिया</h2>
<p>कथित धोखाधड़ी के लिए कमीशन रद्द करने या किसी भी clawback से पहले, SOS-Expat सहबद्ध को ईमेल द्वारा आरोपित तथ्यों का एक तर्कसंगत विवरण प्रदान करता है। सहबद्ध के पास जवाब देने और प्रति-साक्ष्य प्रस्तुत करने के लिए 15 कैलेंडर दिन होते हैं। अंतिम निर्णय जवाब या समय-सीमा समाप्ति के 15 दिनों के भीतर सूचित किया जाता है।</p>

<h2>अनुच्छेद 19 — कार्यक्रम की कानूनी संरचना</h2>
<p>SOS-Expat का सहबद्ध कार्यक्रम एक एकल-स्तरीय कार्यक्रम (single-tier) है। कमीशन केवल उस प्रत्यक्ष सहबद्ध को दिया जाता है जिसने योग्य घटना उत्पन्न की। कोई बहु-स्तरीय कमीशन, पिरामिड संरचना, या अन्य सहबद्धों की भर्ती से जुड़ा पारिश्रमिक नहीं है। केवल संदर्भित ग्राहकों के भुगतान किए गए कॉल या सहबद्ध द्वारा भर्ती किए गए प्रदाताओं से संबंधित कमीशन ही पात्र हैं।</p>`,
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
<h3>3.2 费率修改</h3>
<p>注册日期适用的佣金费率为默认适用费率。SOS-Expat保留以合理商业理由修改佣金费率的权利，须通过电子邮件和控制面板提前60天通知。不接受修改的联盟成员可在通知期内无罚款终止合同。</p>
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
<p>每次提现都需要双重身份验证（2FA）：可通过Telegram（官方SOS-Expat机器人）或通过电子邮件发送的OTP代码。如果Telegram不可用，电子邮件将作为备用确认方式。</p>
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
<p>如果首次佣金后180天内未完成KYC，账户将被暂停，资金将再保留24个月。联盟成员可随时完成KYC解除账户冻结。超过24个月，在两次电子邮件提醒后仍无回应的，经正式通知（含30天答复期）后，资金可捐赠给SOS-Expat指定的慈善机构。</p>
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

<h2>第八条 — 个人数据</h2>
<h3>8.1</h3>
<p>SOS-Expat根据GDPR（欧盟）以及联盟成员所在国的适用法律处理个人数据，包括：CCPA/CPRA（美国加利福尼亚州）、LGPD（巴西）、第25号法律（魁北克）、PDPA（泰国）、PDPL（沙特阿拉伯）、POPIA（南非）。数据控制者为WorldExpat OÜ，一家依爱沙尼亚法律注册成立的公司。</p>
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

<h2>第十二条 — 适用法律和争议解决</h2>
<h3>12.1</h3>
<p>本条款受爱沙尼亚法律管辖，但不影响联盟成员居住国法律的强制性规定。SOS-Expat由WorldExpat OÜ运营，WorldExpat OÜ是依爱沙尼亚法律注册成立的公司。</p>
<h3>12.2</h3>
<p>发生争议时，双方同意在争议通知后30天内寻求友好解决方案。如未能达成协议，争议应提交国际商会（ICC）仲裁，仲裁地为爱沙尼亚塔林，依据现行ICC仲裁规则，由一名仲裁员以英语或中文进行仲裁程序。</p>
<h3>12.3</h3>
<p>位于欧盟的联盟成员消费者保留就强制性消费者权利相关争议向其居住国法院提起诉讼的权利。</p>

<h2>第十三条 — 联系方式</h2>
<p>contact@sos-expat.com</p>
<h2>第十四条 — 修改本条款</h2>
<p>SOS-Expat保留出于任何合法原因（法规变更、商业模式变更、安全性）修改本一般条款的权利。任何实质性修改将通过电子邮件和控制面板提前至少60天通知。在规定期限内未提出书面异议的，新条款视为已接受。不接受修改的联盟成员可无罚款终止合同。</p>

<h2>第十五条 — 欢迎奖励</h2>
<p>通过官方SOS-Expat机器人成功关联Telegram账户后，联盟成员的钱包将获得50美元奖励。该奖励将被锁定，直到联盟成员累计获得至少150美元的有机佣金。在解锁前不能独立提现，如账户因欺诈被终止则奖励将失效。</p>

<h2>第十六条 — 归因与Cookies</h2>
<p>转化追踪基于唯一联盟代码和30天最后点击Cookie。发生归因冲突（多个链接、多个代码、跨设备转化）时，SOS-Expat适用最后记录点击规则。联盟成员可在争议佣金发生后30天内联系contact@sos-expat.com并提供必要证明文件，对归因提出异议。</p>

<h2>第十七条 — 税务义务</h2>
<p>联盟成员全权负责在其居住国申报并缴纳适用于其佣金收入的税款、税费和社会保险费。SOS-Expat遵守DAC7指令（EU 2021/514）规定的平台自动报告义务，适用于年收入超过2,000欧元或年交易超过25笔的联盟成员，以及适用于美国联盟成员的1099-K表格。SOS-Expat可根据适用税法进行预扣税。</p>

<h2>第十八条 — 对抗性程序</h2>
<p>在因涉嫌欺诈取消任何佣金或任何追回之前，SOS-Expat将通过电子邮件向联盟成员发出通知，说明所指控事实的理由。联盟成员有15个日历日的时间回复并提供反驳证据。最终决定将在收到回复或期限届满后15天内告知。</p>

<h2>第十九条 — 计划的法律结构</h2>
<p>SOS-Expat联盟计划为单层计划（single-tier）。佣金仅支付给产生合格事件的直接联盟成员。不存在多层佣金、传销结构或与招募其他联盟成员相关的报酬。只有与联盟成员推荐的客户的付费通话或联盟成员招募的服务提供商相关的佣金才有资格获得。</p>`,
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
<h3>3.2 تعديل الأسعار</h3>
<p>معدلات العمولة السارية في تاريخ التسجيل هي المعدلات الافتراضية المطبقة. تحتفظ SOS-Expat بالحق في تعديل معدلات العمولة لأسباب تجارية مشروعة، مع إشعار مسبق مدته 60 يوماً يُبلَّغ به عبر البريد الإلكتروني ولوحة التحكم. يحق للشريك الذي لا يقبل التعديل إنهاء العقد دون غرامة خلال فترة الإشعار.</p>
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
<p>يتطلب كل سحب مصادقة ثنائية (2FA): إما عبر Telegram (بوت SOS-Expat الرسمي) أو عبر رمز OTP المُرسَل بالبريد الإلكتروني. إذا كان Telegram غير متاح، يعمل البريد الإلكتروني كوسيلة تأكيد بديلة.</p>
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
<p>إذا لم يتم إكمال التحقق من الهوية خلال 180 يوماً من أول عمولة، يُوقَّف الحساب وتُحتفظ بالأموال لمدة 24 شهراً إضافية. يمكن للشريك إلغاء تجميد حسابه في أي وقت بإكمال التحقق من الهوية. بعد 24 شهراً دون رد رغم إرسال تذكيرَين بالبريد الإلكتروني، يجوز التبرع بالأموال إلى مؤسسة خيرية تحددها SOS-Expat، بعد إشعار رسمي مع منح مهلة رد 30 يوماً.</p>
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

<h2>المادة 8 — البيانات الشخصية</h2>
<h3>8.1</h3>
<p>تعالج SOS-Expat البيانات الشخصية وفقاً للائحة العامة لحماية البيانات (GDPR) وللقوانين المطبقة حسب بلد إقامة الشريك، بما في ذلك: CCPA/CPRA (كاليفورنيا، الولايات المتحدة)، LGPD (البرازيل)، القانون 25 (كيبيك)، PDPA (تايلاند)، PDPL (المملكة العربية السعودية)، POPIA (جنوب أفريقيا). المتحكم في البيانات هو WorldExpat OÜ، شركة مؤسسة بموجب القانون الإستوني.</p>
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

<h2>المادة 12 — القانون الواجب التطبيق وتسوية النزاعات</h2>
<h3>12.1</h3>
<p>تخضع هذه الشروط للقانون الإستوني، دون الإخلال بالأحكام الآمرة لقانون بلد إقامة الشريك. تُشغَّل SOS-Expat من قِبَل WorldExpat OÜ، شركة مؤسسة بموجب القانون الإستوني.</p>
<h3>12.2</h3>
<p>في حالة نزاع، تلتزم الأطراف بالسعي إلى التسوية الودية خلال 30 يوماً من إخطار النزاع. في غياب اتفاق، يُحال النزاع إلى التحكيم أمام غرفة التجارة الدولية (ICC)، مقرها تالين (إستونيا)، وفقاً لقواعد التحكيم المعمول بها لدى ICC، أمام محكم وحيد يُدير الإجراءات باللغة العربية أو الإنجليزية.</p>
<h3>12.3</h3>
<p>يحتفظ الشركاء المستهلكون المقيمون في الاتحاد الأوروبي بالحق في اللجوء إلى محاكم بلد إقامتهم بشأن النزاعات المتعلقة بحقوق المستهلك الآمرة.</p>

<h2>المادة 13 — الاتصال</h2>
<p>contact@sos-expat.com</p>
<h2>المادة 14 — تعديل هذه الشروط</h2>
<p>تحتفظ SOS-Expat بالحق في تعديل هذه الشروط العامة لأي سبب مشروع (تغييرات تنظيمية، تغييرات في نموذج الأعمال، الأمان). يتم إخطار أي تعديل جوهري بإشعار مسبق لا يقل عن 60 يوماً عبر البريد الإلكتروني ولوحة التحكم. في غياب اعتراض كتابي خلال المهلة المحددة، تُعتبر الشروط الجديدة مقبولة. يحق للشريك الذي لا يقبل التعديلات إنهاء العقد دون غرامة.</p>

<h2>المادة 15 — مكافأة الترحيب</h2>
<p>تُضاف مكافأة قدرها 50 دولاراً أمريكياً إلى محفظة الشريك عند ربط حسابه على Telegram بنجاح عبر بوت SOS-Expat الرسمي. تظل هذه المكافأة مجمّدة حتى يكسب الشريك ما لا يقل عن 150 دولاراً أمريكياً من العمولات العضوية التراكمية. لا يمكن سحبها بصورة مستقلة قبل إلغاء التجميد، وتنتهي صلاحيتها في حال إنهاء الحساب بسبب الاحتيال.</p>

<h2>المادة 16 — الإسناد وملفات تعريف الارتباط</h2>
<p>يعتمد تتبع التحويلات على رمز الشريك الفريد وملف تعريف ارتباط last-click مدته 30 يوماً. في حالة نزاع الإسناد (روابط متعددة، رموز متعددة، تحويل عبر أجهزة مختلفة)، تطبق SOS-Expat قاعدة آخر نقرة موثقة. يمكن للشريك الطعن في الإسناد خلال 30 يوماً من العمولة المتنازع عليها بالتواصل مع contact@sos-expat.com مع تقديم المستندات اللازمة.</p>

<h2>المادة 17 — الالتزامات الضريبية</h2>
<p>يتحمل الشريك وحده مسؤولية الإقرار بعمولاته ودفع الضرائب والرسوم والاشتراكات الاجتماعية المطبقة على دخله من العمولات في بلد إقامته. تمتثل SOS-Expat لالتزامات الإبلاغ التلقائي للمنصات المنصوص عليها في توجيه DAC7 (EU 2021/514) للشركاء الذين يتجاوزون 2,000 يورو/السنة أو 25 معاملة/السنة، فضلاً عن نموذج 1099-K للشركاء الأمريكيين. يجوز لـ SOS-Expat إجراء الاستقطاع من المصدر وفقاً للقانون الضريبي المطبق.</p>

<h2>المادة 18 — الإجراء التداولي</h2>
<p>قبل أي إلغاء للعمولات بسبب الاحتيال المزعوم أو أي استرداد، تُخطر SOS-Expat الشريك عبر البريد الإلكتروني بعرض مسبّب للوقائع المنسوبة إليه. يتاح للشريك 15 يوماً تقويمياً للرد وتقديم أدلة دحض. يُبلَّغ بالقرار النهائي في غضون 15 يوماً من تلقي الرد أو انتهاء المهلة.</p>

<h2>المادة 19 — الهيكل القانوني للبرنامج</h2>
<p>برنامج الشراكة في SOS-Expat هو برنامج أحادي المستوى (single-tier). تُدفع العمولات فقط للشريك المباشر الذي أنشأ الحدث المؤهل. لا توجد عمولات متعددة المستويات، ولا هياكل هرمية، ولا مكافآت مرتبطة بتجنيد شركاء آخرين. فقط العمولات المتعلقة بالمكالمات المدفوعة من العملاء المُحالين أو مقدمي الخدمات الذين جنّدهم الشريك هي المؤهلة.</p>`,
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

    if (snap.exists && !FORCE) {
      console.log(`  [SKIP] ${docId} — document existe deja (utiliser --force pour ecraser)`);
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
      version: "2.0",
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
