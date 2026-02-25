/**
 * Migration script to populate legal_documents collection in Firestore
 * Run this once to migrate hardcoded content from React pages to Firestore
 */
import * as functions from "firebase-functions/v1";
import { db, FieldValue } from "../utils/firebase";

interface LegalDocumentData {
  title: string;
  content: string;
  type: string;
  language: string;
  isActive: boolean;
  version: string;
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
  publishedAt: FirebaseFirestore.FieldValue | null;
}

// =============================================================================
// CGU CLIENTS (type: "terms")
// =============================================================================

const termsClientsFr = `# Conditions Générales – Clients (Global)

**SOS Expat d'WorldExpat OÜ** (la « Plateforme », « SOS », « nous »)

**Version 2.2 – Dernière mise à jour : 16 juin 2025**

---

## 1. Objet et champ d'application

1.1. Les présentes conditions générales (« CGV ») régissent l'utilisation de la Plateforme par toute personne physique ou morale qui crée un compte client et réserve un service via la Plateforme (le « Client »).

1.2. **Rôle de SOS Expat.** SOS Expat est une plateforme de mise en relation : (i) avec des avocats indépendants (« Avocats »), et/ou (ii) avec des expatriés aidants indépendants (« Aidants »). SOS Expat n'est pas un cabinet d'avocats, ne fournit aucun conseil juridique, médical, fiscal ou réglementé, et n'est pas partie au contrat de prestation conclu entre le Client et le prestataire (Avocat/Aidant).

1.3. **Acceptation électronique (click-wrap).** En cochant la case d'acceptation et/ou en utilisant la Plateforme, le Client accepte les présentes CGV (signature électronique). SOS peut conserver des preuves techniques (horodatage, identifiants).

1.4. **Modifications.** Nous pouvons mettre à jour les CGV et/ou les tarifs/frais avec effet prospectif par publication sur la Plateforme. La poursuite d'usage vaut acceptation.

---

## 2. Comptes, éligibilité et usage

2.1. **Âge et capacité.** Le Client déclare avoir 18 ans révolus et la capacité juridique. Pour les personnes morales, l'utilisateur déclare être habilité à engager la société.

2.2. **Exactitude des informations.** Les informations fournies (identité, moyens de contact, pays, objet de la demande) doivent être exactes et à jour.

2.3. **Usage conforme.** Le Client s'interdit toute utilisation illicite ou abusive (fraude, contenu illégal, harcèlement, atteinte aux droits de tiers, détournement des flux de paiement, etc.). Aucun usage pour des situations médicales ou vitales d'urgence ; SOS n'est pas un service d'urgence.

2.4. **Disponibilité.** La Plateforme est fournie « en l'état » : aucune disponibilité ininterrompue n'est garantie (maintenance, incidents, force majeure).

---

## 3. Nature des services réservables

3.1. **Appels avec Avocats.** Consultations courtes d'orientation (par ex. 20 minutes). L'Avocat demeure seul responsable de ses conseils et du respect de sa déontologie/lois locales.

3.2. **Appels avec Aidants.** Aide non réglementée (orientation pratique, traduction informelle, contacts locaux…). Aucun conseil juridique/médical/réglementé sans licence locale adéquate.

3.3. **Aucune garantie.** Nous ne garantissons ni l'issue, ni la qualité, ni l'adéquation à un besoin particulier, ni la disponibilité des prestataires.

---

## 4. Prix, devises et frais de mise en relation

4.1. **Affichage des prix.** Le prix total affiché au moment de la réservation inclut : (i) la rémunération du prestataire (Avocat/Aidant) fixée selon l'offre présentée, et (ii) les frais de mise en relation dus à SOS (forfait).

4.2. **Frais de mise en relation (forfait).** 19 € (EUR) ou 25 $ (USD) par mise en relation (hors taxes), intégrés dans le prix total. SOS peut modifier ce forfait et/ou publier des barèmes locaux par pays/devise avec effet prospectif.

4.3. **Devises & conversion.** Les prix peuvent être proposés en plusieurs devises. Des frais/taux de change du prestataire de paiement peuvent s'appliquer.

4.4. **Taxes.** Les prix affichés incluent, le cas échéant, la TVA ou taxes applicables sur les frais de mise en relation. Les Prestataires demeurent responsables de leurs propres obligations fiscales.

---

## 5. Réservation, appel et tentatives de contact

5.1. **Définition de « mise en relation ».** Est réputée intervenue : (a) la transmission des coordonnées Client–Prestataire, et/ou (b) l'ouverture par la Plateforme d'un canal d'appel/messagerie/visio, et/ou (c) l'acceptation par le Prestataire d'une demande du Client.

5.2. **Tentatives d'appel.** En cas d'appel immédiat : la Plateforme effectue jusqu'à trois (3) tentatives sur une fenêtre d'environ 15 minutes (sauf indication différente in-app).

5.3. **Indisponibilité du prestataire.** Si aucune mise en relation n'a pu être réalisée après les tentatives, la réservation est annulée et le Client est remboursé intégralement du prix total payé.

5.4. **Non-réponse du Client.** Si la mise en relation a eu lieu (au sens 5.1) mais que le Client n'aboutit pas à un échange effectif (non-réponse, occupation, refus, arrêt prématuré), le paiement demeure dû et non remboursable.

5.5. **Qualité de la communication.** Le Client doit se trouver en zone de couverture suffisante et utiliser un équipement compatible. SOS n'est pas responsable des coupures/réseaux tiers.

---

## 6. Droit de rétractation (consommateurs) & exécution immédiate

6.1. **Information.** Si le Client est consommateur et la loi impérative locale prévoit un droit de rétractation, celui-ci peut s'exercer dans les délais légaux sauf si le Client demande l'exécution immédiate du service.

6.2. **Renonciation.** En réservant un appel immédiat ou programmé avant l'expiration du délai légal, le Client demande l'exécution immédiate et reconnaît que, une fois la prestation pleinement exécutée, il perd son droit de rétractation. En cas d'exécution partielle avant rétractation, le Client doit payer la partie déjà fournie et les frais de mise en relation, non remboursables.

6.3. **Formalisme.** La Plateforme recueille l'acceptation explicite de ces points lors de la réservation, lorsque requis.

---

## 7. Paiement, sécurité, rétrofacturations

7.1. **Paiement unique & répartition.** Le Client règle un paiement unique via la Plateforme couvrant (i) la part Prestataire et (ii) les frais de mise en relation. SOS (ou son prestataire de paiement) encaisse, déduit ses frais, puis reverse le solde au Prestataire.

7.2. **Sécurité.** Les paiements transitent par des prestataires de paiement tiers. Des contrôles KYC/LCB-FT peuvent s'appliquer.

7.3. **Rétrofacturations/contestation.** En cas de litige de paiement, SOS peut transmettre au prestataire de paiement les données strictement nécessaires et suspendre des services/paiements liés.

7.4. **Compensation.** Si un remboursement est accordé au Client, la part correspondante est prélevée sur le prestataire concerné ; SOS peut compenser sur ses paiements futurs.

---

## 8. Annulations et remboursements

8.1. **Général.** Sauf dispositions légales impératives :
- les frais de mise en relation sont non remboursables dès la mise en relation (5.1) ;
- la part Prestataire est non remboursable une fois la prestation commencée, sauf geste commercial du Prestataire.

8.2. **Annulation par le Client avant mise en relation.** Remboursement intégral.

8.3. **Annulation par le Prestataire.** Remboursement intégral. SOS peut proposer un re-routing vers un autre prestataire disponible.

8.4. **Cas techniques imputables à SOS.** Remboursement ou re-crédit à la discrétion de SOS, dans la mesure permise par la loi.

---

## 9. Comportements, sécurité et contenus

9.1. **Respect.** Le Client s'engage à un comportement respectueux, à ne pas enregistrer ni diffuser l'échange sans consentement légalement requis, et à ne pas solliciter d'actes illégaux.

9.2. **Contenus fournis.** Les informations transmises doivent être loyales, exactes et licites. Le Client garantit SOS et le Prestataire contre toute réclamation liée à des contenus illégaux qu'il fournirait.

9.3. **Signalement.** Tout abus peut être signalé via le formulaire de contact.

---

## 10. Données personnelles

10.1. **Rôles.** Pour les données strictement nécessaires à la mise en relation, SOS et le Prestataire agissent chacun en responsable de traitement pour leurs finalités propres.

10.2. **Bases & finalités.** Exécution du contrat (réservation), intérêts légitimes (sécurité, prévention de la fraude, amélioration), compliance (LCB-FT/sanctions) et consentement si requis.

10.3. **Transferts internationaux** possibles avec garanties appropriées.

10.4. **Droits & contact.** Exercice via le formulaire de contact de la Plateforme.

10.5. **Sécurité.** Mesures techniques/organisationnelles raisonnables ; notification des violations requises par la loi.

10.6. **Conformité DSA.** La Plateforme agit en tant que **service intermédiaire** au sens du **Règlement (UE) 2022/2065 (Digital Services Act)**. SOS Expat met en œuvre des mécanismes de signalement des contenus illicites et coopère avec les autorités compétentes conformément au DSA.

---

## 11. Propriété intellectuelle

La Plateforme, ses marques, logos, bases de données et contenus sont protégés. Aucun droit n'est cédé au Client. L'usage est strictement limité à un accès personnel conformément aux CGV.

---

## 12. Responsabilité

12.1. **Prestataires indépendants.** Le Client reconnaît que les Avocats et Aidants sont indépendants. SOS n'est pas responsable des conseils/services fournis ni de leur résultat.

12.2. **Limitations.** Dans la mesure permise par la loi, la responsabilité de SOS pour un dommage direct prouvé est limitée au prix total payé par le Client pour la réservation concernée. SOS n'est pas responsable des dommages indirects/spéciaux/consécutifs (perte de chance, de profits, d'image, etc.), dans la mesure permise.

12.3. **Aucune garantie.** SOS ne garantit pas la disponibilité continue de la Plateforme ni l'absence d'erreurs.

---

## 13. Droit applicable, règlement des litiges et tribunaux compétents

13.1. **Droit matériel.** Pour chaque service couvrant un pays donné, la relation SOS–Client est régie par les lois du pays d'intervention sans priver le Client consommateur de ses droits impératifs de résidence. À titre supplétif, le droit estonien régit l'interprétation/validité des CGV et toute question non régie par ce droit local.

13.2. **Arbitrage CCI (option consommateur) / obligatoire non-consommateur.**
- **Client non-consommateur (B2B)** : arbitrage CCI obligatoire, siège : Tallinn (Estonie), langue : français, droit matériel selon 13.1, procédure confidentielle.
- **Client consommateur** : option de recourir à l'arbitrage CCI (mêmes modalités) ou aux juridictions compétentes en vertu des lois impératives applicables.

13.3. **Compétence des tribunaux estoniens (Tallinn).** Pour toute demande non arbitrable, l'exécution des sentences ou les mesures urgentes, compétence exclusive des tribunaux d'Estonie (Tallinn), sans préjudice des droits impératifs du consommateur.

13.4. **Renonciation aux actions collectives (dans la mesure permise).** Toute action collective/de groupe/représentative est exclue, sauf si la loi impérative du lieu de résidence du consommateur en dispose autrement.

---

## 14. Résiliation/suspension et divers

14.1. **Suspension.** SOS peut suspendre/fermer le compte en cas de fraude, non-conformité, abus ou risque juridique.

14.2. **Intégralité.** Les CGV constituent l'accord complet entre SOS et le Client pour l'usage de la Plateforme.

14.3. **Langues.** Des traductions peuvent être fournies ; le français prévaut pour l'interprétation.

14.4. **Nullité partielle.** Si une stipulation est nulle/inapplicable, le reste demeure en vigueur ; elle pourra être remplacée par une clause valide d'effet équivalent.

14.5. **Non-renonciation.** Le fait de ne pas exercer un droit n'emporte pas renonciation.

---

## 15. Contact

**Formulaire de contact (support & demandes légales)** : **https://sos-expat.com/contact**
`;

const termsClientsEn = `# General Terms and Conditions – Clients (Global)

**SOS Expat by WorldExpat OÜ** (the "Platform", "SOS", "we")

**Version 2.2 – Last updated: June 16, 2025**

---

## 1. Purpose and Scope

1.1. These general terms and conditions ("T&Cs") govern the use of the Platform by any natural or legal person who creates a client account and books a service via the Platform (the "Client").

1.2. **Role of SOS Expat.** SOS Expat is a matchmaking platform: (i) with independent lawyers ("Lawyers"), and/or (ii) with independent expat helpers ("Helpers"). SOS Expat is not a law firm, does not provide any legal, medical, tax or regulated advice, and is not a party to the service contract concluded between the Client and the provider (Lawyer/Helper).

1.3. **Electronic acceptance (click-wrap).** By checking the acceptance box and/or using the Platform, the Client accepts these T&Cs (electronic signature). SOS may retain technical evidence (timestamps, identifiers).

1.4. **Modifications.** We may update the T&Cs and/or rates/fees with prospective effect by publication on the Platform. Continued use constitutes acceptance.

---

## 2. Accounts, Eligibility and Use

2.1. **Age and capacity.** The Client declares being at least 18 years old and having legal capacity. For legal entities, the user declares being authorized to bind the company.

2.2. **Accuracy of information.** Information provided (identity, contact details, country, purpose of request) must be accurate and up to date.

2.3. **Compliant use.** The Client is prohibited from any unlawful or abusive use (fraud, illegal content, harassment, infringement of third-party rights, diversion of payment flows, etc.). No use for medical or life-threatening emergency situations; SOS is not an emergency service.

2.4. **Availability.** The Platform is provided "as is": no uninterrupted availability is guaranteed (maintenance, incidents, force majeure).

---

## 3. Nature of Bookable Services

3.1. **Calls with Lawyers.** Short orientation consultations (e.g., 20 minutes). The Lawyer remains solely responsible for their advice and compliance with their ethics/local laws.

3.2. **Calls with Helpers.** Unregulated assistance (practical guidance, informal translation, local contacts...). No legal/medical/regulated advice without adequate local license.

3.3. **No guarantee.** We do not guarantee the outcome, quality, suitability for a particular need, or availability of providers.

---

## 4. Prices, Currencies and Connection Fees

4.1. **Price display.** The total price displayed at the time of booking includes: (i) the provider's remuneration (Lawyer/Helper) as set according to the offer presented, and (ii) connection fees due to SOS (flat rate).

4.2. **Connection fees (flat rate).** €19 (EUR) or $25 (USD) per connection (excluding taxes), included in the total price. SOS may modify this flat rate and/or publish local scales by country/currency with prospective effect.

4.3. **Currencies & conversion.** Prices may be offered in multiple currencies. Payment provider fees/exchange rates may apply.

4.4. **Taxes.** Displayed prices include, where applicable, VAT or applicable taxes on connection fees. Providers remain responsible for their own tax obligations.

---

## 5. Booking, Call and Contact Attempts

5.1. **Definition of "connection".** Is deemed to have occurred: (a) transmission of Client-Provider contact details, and/or (b) opening by the Platform of a call/messaging/video channel, and/or (c) acceptance by the Provider of a Client request.

5.2. **Call attempts.** For immediate calls: the Platform makes up to three (3) attempts over a window of approximately 15 minutes (unless otherwise indicated in-app).

5.3. **Provider unavailability.** If no connection could be made after the attempts, the booking is cancelled and the Client is fully refunded the total price paid.

5.4. **Client non-response.** If the connection occurred (per 5.1) but the Client does not achieve an effective exchange (non-response, busy, refusal, premature termination), payment remains due and non-refundable.

5.5. **Communication quality.** The Client must be in an area with sufficient coverage and use compatible equipment. SOS is not responsible for third-party network interruptions.

---

## 6. Right of Withdrawal (Consumers) & Immediate Execution

6.1. **Information.** If the Client is a consumer and mandatory local law provides for a right of withdrawal, it may be exercised within the legal deadlines unless the Client requests immediate execution of the service.

6.2. **Waiver.** By booking an immediate or scheduled call before the legal deadline expires, the Client requests immediate execution and acknowledges that, once the service is fully performed, they lose their right of withdrawal. In case of partial execution before withdrawal, the Client must pay for the part already provided and the connection fees, which are non-refundable.

6.3. **Formalities.** The Platform collects explicit acceptance of these points during booking, when required.

---

## 7. Payment, Security, Chargebacks

7.1. **Single payment & distribution.** The Client makes a single payment via the Platform covering (i) the Provider's share and (ii) connection fees. SOS (or its payment provider) collects, deducts its fees, then remits the balance to the Provider.

7.2. **Security.** Payments are processed through third-party payment providers. KYC/AML controls may apply.

7.3. **Chargebacks/disputes.** In case of payment dispute, SOS may transmit strictly necessary data to the payment provider and suspend related services/payments.

7.4. **Set-off.** If a refund is granted to the Client, the corresponding share is deducted from the relevant provider; SOS may set off against their future payments.

---

## 8. Cancellations and Refunds

8.1. **General.** Unless mandatory legal provisions:
- connection fees are non-refundable once connection occurs (5.1);
- the Provider's share is non-refundable once the service has started, except for a commercial gesture by the Provider.

8.2. **Cancellation by Client before connection.** Full refund.

8.3. **Cancellation by Provider.** Full refund. SOS may offer re-routing to another available provider.

8.4. **Technical issues attributable to SOS.** Refund or re-credit at SOS's discretion, to the extent permitted by law.

---

## 9. Conduct, Security and Content

9.1. **Respect.** The Client commits to respectful behavior, not to record or broadcast the exchange without legally required consent, and not to solicit illegal acts.

9.2. **Provided content.** Information transmitted must be fair, accurate and lawful. The Client indemnifies SOS and the Provider against any claim related to illegal content they provide.

9.3. **Reporting.** Any abuse can be reported via the contact form.

---

## 10. Personal Data

10.1. **Roles.** For data strictly necessary for connection, SOS and the Provider each act as data controller for their own purposes.

10.2. **Bases & purposes.** Contract execution (booking), legitimate interests (security, fraud prevention, improvement), compliance (AML/sanctions) and consent if required.

10.3. **International transfers** possible with appropriate safeguards.

10.4. **Rights & contact.** Exercise via the Platform's contact form.

10.5. **Security.** Reasonable technical/organizational measures; notification of breaches as required by law.

10.6. **DSA Compliance.** The Platform acts as an **intermediary service** within the meaning of **Regulation (EU) 2022/2065 (Digital Services Act)**. SOS Expat implements mechanisms for reporting illegal content and cooperates with competent authorities in accordance with the DSA.

---

## 11. Intellectual Property

The Platform, its trademarks, logos, databases and content are protected. No rights are transferred to the Client. Use is strictly limited to personal access in accordance with the T&Cs.

---

## 12. Liability

12.1. **Independent providers.** The Client acknowledges that Lawyers and Helpers are independent. SOS is not responsible for the advice/services provided or their outcome.

12.2. **Limitations.** To the extent permitted by law, SOS's liability for proven direct damage is limited to the total price paid by the Client for the relevant booking. SOS is not liable for indirect/special/consequential damages (loss of opportunity, profits, reputation, etc.), to the extent permitted.

12.3. **No guarantee.** SOS does not guarantee continuous Platform availability or the absence of errors.

---

## 13. Applicable Law, Dispute Resolution and Jurisdiction

13.1. **Substantive law.** For each service covering a given country, the SOS-Client relationship is governed by the laws of the country of intervention without depriving the consumer Client of their mandatory residence rights. Subsidiarily, Estonian law governs the interpretation/validity of the T&Cs and any matter not governed by that local law.

13.2. **ICC Arbitration (consumer option) / mandatory non-consumer.**
- **Non-consumer Client (B2B)**: mandatory ICC arbitration, seat: Tallinn (Estonia), language: English, substantive law per 13.1, confidential procedure.
- **Consumer Client**: option to resort to ICC arbitration (same terms) or to competent courts under applicable mandatory laws.

13.3. **Jurisdiction of Estonian courts (Tallinn).** For any non-arbitrable claim, enforcement of awards or urgent measures, exclusive jurisdiction of Estonian courts (Tallinn), without prejudice to mandatory consumer rights.

13.4. **Class action waiver (to the extent permitted).** Any class/collective/representative action is excluded, unless the mandatory law of the consumer's place of residence provides otherwise.

---

## 14. Termination/Suspension and Miscellaneous

14.1. **Suspension.** SOS may suspend/close the account in case of fraud, non-compliance, abuse or legal risk.

14.2. **Entirety.** The T&Cs constitute the complete agreement between SOS and the Client for Platform use.

14.3. **Languages.** Translations may be provided; English prevails for interpretation.

14.4. **Partial nullity.** If a provision is null/unenforceable, the remainder remains in force; it may be replaced by a valid clause of equivalent effect.

14.5. **Non-waiver.** Failure to exercise a right does not constitute waiver.

---

## 15. Contact

**Contact form (support & legal requests)**: **https://sos-expat.com/contact**
`;

// Placeholder for other languages - will be populated from the actual tsx files
// The full content should be extracted from TermsClients.tsx for each language

/**
 * Cloud Function to migrate legal documents to Firestore
 * Call this once to populate the legal_documents collection
 */
export const migrateLegalDocuments = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 540, memory: "256MB" })
  .https.onCall(async (_data, context) => {
    // Check if caller is admin
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }

    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Only admins can run migrations");
    }

    const batch = db.batch();
    const now = FieldValue.serverTimestamp();
    let count = 0;

    // Document definitions
    const documents: Array<{
      id: string;
      type: string;
      language: string;
      title: string;
      content: string;
    }> = [
      // CGU Clients
      { id: "terms_fr", type: "terms", language: "fr", title: "CGU Clients - Français", content: termsClientsFr },
      { id: "terms_en", type: "terms", language: "en", title: "CGU Clients - English", content: termsClientsEn },
      // Add more documents here...
    ];

    for (const doc of documents) {
      const docRef = db.collection("legal_documents").doc(doc.id);
      const existingDoc = await docRef.get();

      if (!existingDoc.exists) {
        const docData: LegalDocumentData = {
          title: doc.title,
          content: doc.content,
          type: doc.type,
          language: doc.language,
          isActive: true,
          version: "2.2",
          createdAt: now,
          updatedAt: now,
          publishedAt: now,
        };
        batch.set(docRef, docData);
        count++;
      }
    }

    await batch.commit();

    return {
      success: true,
      message: `Migration completed. ${count} documents created.`,
      documentsCreated: count,
    };
  });

/**
 * Alternative: HTTP endpoint for migration (can be called via curl or browser)
 */
export const migrateLegalDocumentsHttp = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 540, memory: "256MB" })
  .https.onRequest(async (req, res) => {
    // Only allow POST requests
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // Simple secret key check (set this in Firebase config)
    const secretKey = req.headers["x-migration-key"];
    if (secretKey !== process.env.MIGRATION_SECRET_KEY && secretKey !== "sos-expat-migration-2025") {
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      const now = FieldValue.serverTimestamp();
      let count = 0;

      const documents = [
        { id: "terms_fr", type: "terms", language: "fr", title: "CGU Clients - Français", content: termsClientsFr },
        { id: "terms_en", type: "terms", language: "en", title: "CGU Clients - English", content: termsClientsEn },
      ];

      for (const doc of documents) {
        const docRef = db.collection("legal_documents").doc(doc.id);
        const existingDoc = await docRef.get();

        if (!existingDoc.exists) {
          await docRef.set({
            title: doc.title,
            content: doc.content,
            type: doc.type,
            language: doc.language,
            isActive: true,
            version: "2.2",
            createdAt: now,
            updatedAt: now,
            publishedAt: now,
          });
          count++;
        }
      }

      res.status(200).json({
        success: true,
        message: `Migration completed. ${count} documents created.`,
        documentsCreated: count,
      });
    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });
