/**
 * Seed script for Chatter Training Modules
 *
 * FUN & ENGAGING VERSION 🎉
 * Focus on: Natural conversation, helping people, placing links after 2-3 exchanges
 * The Chatter's role: Find people with problems, engage naturally, help first, then share SOS-Expat
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { ChatterTrainingModule } from "../types";

/**
 * Fun training modules for chatters
 */
export const CHATTER_TRAINING_MODULES: Omit<ChatterTrainingModule, "id" | "createdAt" | "updatedAt" | "createdBy">[] = [
  // ============================================================================
  // MODULE 1: Bienvenue chez les Chatters ! 🚀
  // ============================================================================
  {
    order: 1,
    title: "Bienvenue chez les Chatters ! 🚀",
    titleTranslations: {
      en: "Welcome to the Chatters! 🚀",
      es: "¡Bienvenido a los Chatters! 🚀",
    },
    description: "Découvre ton rôle : aider les gens naturellement et gagner de l'argent en même temps ! 💬",
    descriptionTranslations: {
      en: "Discover your role: help people naturally and earn money at the same time! 💬",
    },
    category: "onboarding",
    coverImageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800",
    estimatedMinutes: 3,
    isRequired: true,
    prerequisites: [],
    status: "published",
    passingScore: 70,
    slides: [
      {
        order: 1,
        type: "text",
        title: "C'est quoi un Chatter ? 🤔",
        titleTranslations: { en: "What's a Chatter? 🤔" },
        content: `Bienvenue dans l'équipe ! 🎉

Tu vas devenir un **Chatter** - quelqu'un qui aide les expatriés de manière naturelle.

**C'est quoi SOS-Expat exactement ?**
Une plateforme qui met en relation les expatriés avec un **avocat** ou un **expatrié aidant** en **moins de 5 minutes** par téléphone ! 📞

🌍 **Couverture mondiale :**
- Tous les pays du monde
- Toutes les langues
- Toutes les nationalités

📋 **Tous types de problèmes :**
Visa, papiers administratifs, impôts, police, travaux, déménagement, stockage, litiges, contrats... Même juste pour une question simple ou être rassuré !

💰 **Prix accessibles :**
- **Avocat** : ~49€ / 55$ pour 20 min
- **Expatrié aidant** : ~19€ / 25$ pour 20 min

**Pourquoi ce rôle est PARFAIT ?**
Chaque jour, des milliers d'expatriés posent des questions dans des groupes Facebook, WhatsApp, forums... Ils cherchent de l'aide ! Toi, tu es là pour leur répondre et leur montrer la solution 🎯

**Ton rôle en résumé :**
Tu vas dans des groupes où il y a des expatriés (dans la langue et le pays que tu as choisis). Quand quelqu'un a un problème (visa, admin, proprio, employeur...), tu engages la conversation, tu l'aides, et après 2-3 échanges tu lui parles de SOS-Expat.

**C'est comme si...**
Tu étais dans un café, quelqu'un à côté galère avec ses papiers, tu lui parles, tu compatis, et tu lui files un bon plan. Naturel ! ☕

**Ce que tu ES :**
- ✅ Une personne sympa qui aide
- ✅ Un conseiller bienveillant
- ✅ Quelqu'un qui connaît un bon plan

**Ce que tu n'es SURTOUT PAS :**
- ❌ Un spammeur de liens
- ❌ Un vendeur agressif
- ❌ Un robot qui copie-colle

⚠️ **IMPORTANT - À lire absolument :**
Le spam, le forcing, ou le non-respect de notre charte = **BAN DÉFINITIF** de la plateforme. Pas d'avertissement, pas de seconde chance. On veut des gens bienveillants, pas des spammeurs !`,
        contentTranslations: {
          en: `Welcome to the team! 🎉

You're going to become a **Chatter** - someone who helps expats naturally.

**Your role in a nutshell:**
You hang out in Facebook groups, forums, WhatsApp where there are expats. When someone has a problem (visa, admin, legal...), you start a conversation, help them, and after 2-3 exchanges you tell them about SOS-Expat.

**It's like...**
You're in a café, someone next to you is struggling with their paperwork, you talk to them, empathize, and share a good tip. Natural! ☕

**What you're NOT:**
- ❌ A link spammer
- ❌ An aggressive salesperson
- ❌ A copy-paste bot

**What you ARE:**
- ✅ A nice person who helps
- ✅ A caring advisor
- ✅ Someone who knows a good deal`,
        },
      },
      {
        order: 2,
        type: "text",
        title: "SOS-Expat en 1 minute ⚡",
        titleTranslations: { en: "SOS-Expat in 1 minute ⚡" },
        content: `Voici ce que tu dois savoir pour bien expliquer le service :

**📞 Mise en relation en moins de 5 minutes**
L'utilisateur appelle et parle directement à un pro !

**👥 Deux types d'experts :**
- **Avocats** : Pour les questions juridiques complexes
- **Expatriés aidants** : Expats expérimentés qui connaissent les galères

**💰 Prix clairs :**
| Expert | Durée | Prix |
|--------|-------|------|
| Avocat | 20 min | ~49€ / 55$ |
| Expat aidant | 20 min | ~19€ / 25$ |

**🌍 Couverture MONDIALE :**
- ✅ Tous les pays du monde
- ✅ Toutes les langues
- ✅ Toutes les nationalités

**📋 TOUS les sujets :**
Visa, permis de séjour, impôts, police, contrats, propriétaire, employeur, déménagement, stockage, travaux, litiges... Même juste pour une question simple ou être rassuré !

**C'est ça que tu recommandes. Un vrai service utile !** 💪`,
        contentTranslations: {
          en: `Here's what you need to know to explain the service well:

**📞 Connection in less than 5 minutes**
The user calls and speaks directly to a pro!

**👥 Two types of experts:**
- **Lawyers**: For complex legal questions
- **Expat helpers**: Experienced expats who know the struggles

**💰 Clear pricing:**
| Expert | Duration | Price |
|--------|----------|-------|
| Lawyer | 20 min | ~49€ / $55 |
| Expat helper | 20 min | ~19€ / $25 |

**🌍 WORLDWIDE coverage:**
- ✅ All countries in the world
- ✅ All languages
- ✅ All nationalities

**📋 ALL topics:**
Visa, residence permit, taxes, police, contracts, landlord, employer, moving, storage, work, disputes... Even just for a simple question or reassurance!

**That's what you're recommending. A truly useful service!** 💪`,
        },
      },
      {
        order: 3,
        type: "text",
        title: "Comment ça marche concrètement ? 🎯",
        titleTranslations: { en: "How does it work in practice? 🎯" },
        content: `Voici ta journée type de Chatter :

**1️⃣ Tu observes** 👀
Tu vas sur des groupes Facebook d'expatriés, des forums, des groupes WhatsApp... dans TA langue ou celle que tu maîtrises.

**2️⃣ Tu repères** 🔍
Quelqu'un poste : "J'ai un problème avec mon visa, quelqu'un peut m'aider ?" ou "Mon proprio me vire, je fais quoi ?"

**3️⃣ Tu engages** 💬
Tu réponds de manière sympa et utile :
> "Oh mince, c'est galère ça ! Tu es dans quelle situation exactement ?"

**4️⃣ Tu échanges** 🤝
2-3 messages en public, tu montres que tu t'intéresses vraiment.

**5️⃣ Tu places le lien** 🎁
Après ces échanges :
> "Tu sais quoi, y'a un service où tu peux parler à un avocat ou un expatrié qui connaît bien le sujet en moins de 5 min par téléphone. C'est genre 49€ pour 20 min avec un avocat, ou 19€ avec un expat aidant. Regarde : [ton lien]"

**C'est une CONVERSATION, pas une pub !** 🗣️`,
        contentTranslations: {
          en: `Here's your typical Chatter day:

**1️⃣ You observe** 👀
You go on expat Facebook groups, forums, WhatsApp groups... in YOUR language or one you master.

**2️⃣ You spot** 🔍
Someone posts: "I have a visa problem, can anyone help?" or "My landlord is kicking me out, what do I do?"

**3️⃣ You engage** 💬
You respond in a friendly, helpful way:
> "Oh no, that's tough! What's your exact situation?"

**4️⃣ You exchange** 🤝
2-3 public messages, showing you really care.

**5️⃣ You place the link** 🎁
After these exchanges:
> "You know what, I used a great service for this. You can talk directly to a lawyer. Check it out: [your link]"

**It's a CONVERSATION, not an ad!** 🗣️`,
        },
      },
      {
        order: 4,
        type: "text",
        title: "Et tu gagnes combien ? 💰",
        titleTranslations: { en: "And how much do you earn? 💰" },
        content: `Parlons argent ! 🤑

**Pour chaque personne que tu aides et qui appelle :**
# 💵 $5 par appel avocat / $3 par appel expatrié

**Si tu recrutes un avocat ou expatrié aidant :**
# 💵 $5 par appel qu'il reçoit (pendant 6 mois !)

**Info bonus - Ce que gagnent les providers :**
- Avocat : ~30€ / 30$ par appel de 20 min
- Expatrié aidant : ~10€ / 10$ par appel de 30 min

→ C'est intéressant pour eux aussi, donc facile à recruter !

**Exemple concret :**
- Tu aides 3 personnes cette semaine
- 1 appelle un avocat ($5) + 1 appelle un expatrié ($3)
- **Tu gagnes $8** 🎉

**En un mois actif :**
- ~10-15 conversations par semaine
- ~5-8 conversions
- **$30-50/mois** en direct + revenus passifs de ton réseau !

Et plus tu deviens bon dans l'art de la conversation, plus tes stats montent ! 📈`,
        contentTranslations: {
          en: `Let's talk money! 🤑

**For each person you help who makes a call:**
# 💵 $5 per lawyer call / $3 per expat call

**If you recruit a lawyer to the platform:**
# 💵 $5 per call they receive (for 6 months!)

**Real example:**
- You help 3 people this week
- 1 calls a lawyer ($5) + 1 calls an expat ($3)
- **You earn $8** 🎉

**In an active month:**
- ~10-15 conversations per week
- ~5-8 conversions
- **$30-50/month** direct + passive income from your network!

And the better you get at conversation, the more your stats go up! 📈`,
        },
      },
    ],
    quizQuestions: [
      {
        id: "m1_q1",
        question: "C'est quoi le rôle principal d'un Chatter ? 🎯",
        questionTranslations: { en: "What's the main role of a Chatter? 🎯" },
        options: [
          { id: "a", text: "Spammer des liens partout", textTranslations: { en: "Spam links everywhere" } },
          { id: "b", text: "Engager des conversations naturelles et aider les gens 💬", textTranslations: { en: "Engage in natural conversations and help people 💬" } },
          { id: "c", text: "Envoyer des messages privés non sollicités", textTranslations: { en: "Send unsolicited private messages" } },
          { id: "d", text: "Poster des pubs dans tous les groupes", textTranslations: { en: "Post ads in all groups" } },
        ],
        correctAnswerId: "b",
        explanation: "Exactement ! Tu engages des conversations naturelles, tu aides d'abord, et ensuite tu partages le bon plan SOS-Expat 🙌",
        explanationTranslations: { en: "Exactly! You engage in natural conversations, help first, then share the SOS-Expat deal 🙌" },
      },
      {
        id: "m1_q2",
        question: "Après combien d'échanges tu places ton lien ? 🤝",
        questionTranslations: { en: "After how many exchanges do you place your link? 🤝" },
        options: [
          { id: "a", text: "Tout de suite, dès le premier message", textTranslations: { en: "Right away, from the first message" } },
          { id: "b", text: "Jamais, c'est interdit", textTranslations: { en: "Never, it's forbidden" } },
          { id: "c", text: "Après 2-3 échanges naturels ✅", textTranslations: { en: "After 2-3 natural exchanges ✅" } },
          { id: "d", text: "Après 50 messages minimum", textTranslations: { en: "After 50 messages minimum" } },
        ],
        correctAnswerId: "c",
        explanation: "2-3 échanges, c'est le sweet spot ! Tu montres que tu t'intéresses vraiment, puis tu partages naturellement 💡",
        explanationTranslations: { en: "2-3 exchanges is the sweet spot! You show you really care, then share naturally 💡" },
      },
    ],
  },

  // ============================================================================
  // MODULE 2: L'art de la conversation 💬
  // ============================================================================
  {
    order: 2,
    title: "L'art de la conversation 💬",
    titleTranslations: {
      en: "The Art of Conversation 💬",
      es: "El arte de la conversación 💬",
    },
    description: "Comment engager naturellement et aider les gens sans jamais forcer. C'est un vrai skill ! 🎨",
    descriptionTranslations: {
      en: "How to engage naturally and help people without ever forcing. It's a real skill! 🎨",
    },
    category: "conversion",
    coverImageUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800",
    estimatedMinutes: 4,
    isRequired: true,
    prerequisites: [],
    status: "published",
    passingScore: 70,
    slides: [
      {
        order: 1,
        type: "text",
        title: "La règle d'or : JAMAIS forcer 🚫",
        titleTranslations: { en: "The golden rule: NEVER force 🚫" },
        content: `Grave ça dans ta tête :

# Tu n'es pas un vendeur. Tu es quelqu'un qui aide.

# ⚠️ SPAM / FORCING = BAN DÉFINITIF ⚠️

C'est dans notre **charte** et c'est non négociable. Si tu spammes, si tu forces la main, si tu ne respectes pas les règles → **ton compte est banni définitivement**. Pas d'avertissement, pas de seconde chance.

**Ce qui est STRICTEMENT INTERDIT :**
- 🚫 Placer ton lien dès le premier message
- 🚫 Insister si la personne n'est pas intéressée
- 🚫 Envoyer des MP non sollicités
- 🚫 Copier-coller le même message partout
- 🚫 Mentir ou exagérer sur le service
- 🚫 Harceler ou relancer plusieurs fois

**Ce qui est ENCOURAGÉ :**
- ✅ Poser des questions sincères
- ✅ Montrer de l'empathie
- ✅ Donner des conseils gratuits d'abord
- ✅ Partager ton expérience personnelle
- ✅ Laisser la personne décider librement

**Pense "ami qui conseille", pas "vendeur qui pousse"** 🤝

Si quelqu'un ne veut pas, tu dis "pas de souci, bonne chance !" et tu passes à autre chose. C'est aussi simple que ça !`,
        contentTranslations: {
          en: `Engrave this in your mind:

# You're not a salesperson. You're someone who helps.

**What's FORBIDDEN:**
- ❌ Placing your link in the first message
- ❌ Insisting if the person isn't interested
- ❌ Sending unsolicited DMs
- ❌ Copy-pasting the same message everywhere
- ❌ Lying or exaggerating

**What's ENCOURAGED:**
- ✅ Asking sincere questions
- ✅ Showing empathy
- ✅ Giving free advice first
- ✅ Sharing your personal experience
- ✅ Letting the person decide

**Think "friend who advises", not "salesperson who pushes"** 🤝

If someone doesn't want it, you say "no worries, good luck!" and move on.`,
        },
      },
      {
        order: 2,
        type: "text",
        title: "Exemple de conversation parfaite ✨",
        titleTranslations: { en: "Example of a perfect conversation ✨" },
        content: `Voici comment ça se passe en vrai :

**🔴 Post de Marie dans un groupe Facebook :**
> "Bonjour, mon proprio veut me virer de mon appart à Madrid mais j'ai un contrat de 1 an. Il a le droit ? Je suis perdue 😢"

**💬 Ton premier message (Échange 1) :**
> "Oh non Marie, c'est vraiment stressant comme situation 😔 Tu as le contrat sous la main ? Il dit quoi exactement sur les conditions de résiliation ?"

**💬 Marie répond :**
> "Oui j'ai le contrat, il dit 1 an minimum mais le proprio dit qu'il s'en fiche..."

**💬 Ton deuxième message (Échange 2) :**
> "Ok donc si c'est écrit 1 an, normalement il peut pas te virer comme ça. Tu as essayé de lui montrer le contrat ? Des fois ils tentent le coup mais reculent quand on connaît ses droits."

**💬 Marie répond :**
> "Il veut rien entendre, je sais pas quoi faire..."

**💬 Ton troisième message (Échange 3) - TU PLACES LE LIEN :**
> "Écoute, dans ce cas tu aurais vraiment besoin d'un avis juridique. Y'a un service, SOS-Expat, où tu peux parler à un avocat en moins de 5 min par téléphone. C'est genre 49€ pour 20 min, ou si tu veux juste un avis d'un expat qui connaît bien le sujet c'est 19€. Ils couvrent tous les pays et toutes les langues. Tiens : [ton lien]. Ça pourrait vraiment t'aider ! 💪"

**Naturel, utile, bienveillant !** ✅`,
        contentTranslations: {
          en: `Here's how it works in real life:

**🔴 Marie's post in a Facebook group:**
> "Hi, my landlord wants to kick me out of my apartment in Madrid but I have a 1-year contract. Can he do that? I'm lost 😢"

**💬 Your first message (Exchange 1):**
> "Oh no Marie, that's really stressful 😔 Do you have the contract handy? What exactly does it say about termination conditions?"

**💬 Marie replies:**
> "Yes I have the contract, it says 1 year minimum but the landlord says he doesn't care..."

**💬 Your second message (Exchange 2):**
> "Ok so if it says 1 year, normally he can't kick you out like that. Have you tried showing him the contract? Sometimes they try their luck but back off when you know your rights."

**💬 Marie replies:**
> "He won't listen, I don't know what to do..."

**💬 Your third message (Exchange 3) - YOU PLACE THE LINK:**
> "Listen, in this case you'd really need legal advice. There's a service I used, SOS-Expat, you can talk directly to a specialized lawyer. It's quick and affordable. Here: [your link]. It could help you know exactly what to say to your landlord! 💪"

**Natural, helpful, caring!** ✅`,
        },
      },
      {
        order: 3,
        type: "text",
        title: "Les phrases magiques 🪄",
        titleTranslations: { en: "Magic phrases 🪄" },
        content: `Des phrases toutes faites pour chaque étape :

**🎯 Pour engager (Échange 1) :**
- "Oh là, c'est compliqué ça ! Tu peux m'en dire plus ?"
- "Aïe, je compatis vraiment. C'est quoi la situation exacte ?"
- "Je connais ce genre de galère... Tu as déjà essayé quoi ?"

**🎯 Pour creuser (Échange 2) :**
- "Ok je vois mieux. Et du côté de [X], t'as regardé ?"
- "Hmm, c'est pas simple. Tu as pensé à contacter [Y] ?"
- "Je comprends ta frustration. Le truc c'est que..."

**🎯 Pour placer le lien (Échange 3) :**
- "Y'a un service où tu peux parler à un avocat en 5 min par téléphone, c'est ~49€ pour 20 min. Tous pays, toutes langues. Tiens : [lien]"
- "Si tu veux juste un avis rapide, y'a des expatriés aidants pour ~19€. Sinon avocat à ~49€. Regarde : [lien]"
- "Pour être sûr de tes droits, le mieux c'est de demander à un pro. SOS-Expat fait ça : [lien]"

**🎯 Si la personne n'est pas intéressée :**
- "Pas de souci, je comprends ! Bonne chance pour la suite 🙂"
- "Ok, j'espère que tu trouveras une solution ! Courage !"

**Adapte toujours à TON style et à la conversation !** 🎨`,
        contentTranslations: {
          en: `Ready-made phrases for each step:

**🎯 To engage (Exchange 1):**
- "Oh wow, that's complicated! Can you tell me more?"
- "Ouch, I really feel for you. What's the exact situation?"
- "I know this kind of struggle... What have you already tried?"

**🎯 To dig deeper (Exchange 2):**
- "Ok I see better. And on the [X] side, have you looked?"
- "Hmm, not easy. Have you thought about contacting [Y]?"
- "I understand your frustration. The thing is..."

**🎯 To place the link (Exchange 3):**
- "Listen, there's a service I discovered that could help you..."
- "You know what, in your case I'd advise talking to a pro. I used [link]..."
- "To be sure of your rights, the best is to ask a lawyer. Check this: [link]"

**🎯 If the person isn't interested:**
- "No worries, I understand! Good luck! 🙂"
- "Ok, hope you find a solution! Hang in there!"

**Always adapt to YOUR style and the conversation!** 🎨`,
        },
      },
      {
        order: 4,
        type: "text",
        title: "S'adapter au support 📱",
        titleTranslations: { en: "Adapt to the platform 📱" },
        content: `Chaque plateforme a ses codes. Adapte-toi !

**📘 Groupes Facebook**
- Ton plus formel mais toujours sympa
- Réponses en public (visible par tous)
- Tu peux taguer la personne avec @
- Évite les messages trop longs

**📱 Groupes WhatsApp**
- Plus casual, comme avec des potes
- Emojis bienvenus 😊
- Messages courts et directs
- Tu peux répondre en privé après l'échange public

**🌐 Forums (Reddit, forums expats...)**
- Ton peut être plus détaillé
- Les gens apprécient les réponses complètes
- Cite les messages précédents
- Ajoute des sources si possible

**💼 LinkedIn (si tu y es)**
- Ton professionnel
- Réponses structurées
- Moins d'emojis

**La clé : observe comment les autres parlent et fais pareil !** 👀`,
        contentTranslations: {
          en: `Each platform has its own rules. Adapt!

**📘 Facebook Groups**
- More formal tone but still friendly
- Public responses (visible to all)
- You can tag the person with @
- Avoid messages that are too long

**📱 WhatsApp Groups**
- More casual, like with friends
- Emojis welcome 😊
- Short and direct messages
- You can reply privately after the public exchange

**🌐 Forums (Reddit, expat forums...)**
- Tone can be more detailed
- People appreciate complete answers
- Quote previous messages
- Add sources if possible

**💼 LinkedIn (if you're there)**
- Professional tone
- Structured responses
- Fewer emojis

**The key: observe how others talk and do the same!** 👀`,
        },
      },
    ],
    quizQuestions: [
      {
        id: "m2_q1",
        question: "Quelle est la bonne approche quand tu vois quelqu'un avec un problème ? 🤔",
        questionTranslations: { en: "What's the right approach when you see someone with a problem? 🤔" },
        options: [
          { id: "a", text: "Envoyer direct ton lien en message privé", textTranslations: { en: "Send your link directly in a private message" } },
          { id: "b", text: "Poster ton lien en réponse sans rien d'autre", textTranslations: { en: "Post your link as a reply without anything else" } },
          { id: "c", text: "Engager la conversation, aider d'abord, placer le lien après 2-3 échanges 💬", textTranslations: { en: "Start a conversation, help first, place the link after 2-3 exchanges 💬" } },
          { id: "d", text: "Ignorer et attendre qu'il te contacte", textTranslations: { en: "Ignore and wait for them to contact you" } },
        ],
        correctAnswerId: "c",
        explanation: "C'est ça ! Tu engages, tu aides, tu montres que tu t'intéresses, et ENSUITE tu partages le bon plan 🎯",
        explanationTranslations: { en: "That's it! You engage, help, show you care, and THEN share the deal 🎯" },
      },
      {
        id: "m2_q2",
        question: "Si quelqu'un n'est pas intéressé par SOS-Expat, tu fais quoi ? 🙂",
        questionTranslations: { en: "If someone isn't interested in SOS-Expat, what do you do? 🙂" },
        options: [
          { id: "a", text: "Tu insistes encore et encore", textTranslations: { en: "You insist again and again" } },
          { id: "b", text: "Tu leur envoies 10 MP pour les convaincre", textTranslations: { en: "You send them 10 DMs to convince them" } },
          { id: "c", text: "Tu dis 'pas de souci, bonne chance !' et tu passes à autre chose ✅", textTranslations: { en: "You say 'no worries, good luck!' and move on ✅" } },
          { id: "d", text: "Tu te fâches et tu les insultes", textTranslations: { en: "You get angry and insult them" } },
        ],
        correctAnswerId: "c",
        explanation: "Exactement ! On reste cool, on souhaite bonne chance, et on passe à la prochaine personne. Zero forcing ! 🙌",
        explanationTranslations: { en: "Exactly! Stay cool, wish them luck, and move on to the next person. Zero forcing! 🙌" },
      },
    ],
  },

  // ============================================================================
  // MODULE 3: Où trouver les gens à aider ? 🔍
  // ============================================================================
  {
    order: 3,
    title: "Où trouver les gens à aider ? 🔍",
    titleTranslations: {
      en: "Where to Find People to Help? 🔍",
      es: "¿Dónde encontrar gente para ayudar? 🔍",
    },
    description: "Les meilleurs endroits pour repérer des expatriés qui ont besoin d'aide. C'est la chasse au trésor ! 🗺️",
    descriptionTranslations: {
      en: "The best places to spot expats who need help. It's a treasure hunt! 🗺️",
    },
    category: "promotion",
    coverImageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800",
    estimatedMinutes: 4,
    isRequired: true,
    prerequisites: [],
    status: "published",
    passingScore: 70,
    slides: [
      {
        order: 1,
        type: "text",
        title: "Facebook : ta mine d'or 💎",
        titleTranslations: { en: "Facebook: your goldmine 💎" },
        content: `Facebook, c'est LE spot pour les expatriés. Ils y sont tous !

**Exemples de groupes selon ton pays :**

🇪🇸 **Espagne :** "Français en Espagne", "Expats Barcelona", "Madrid Expats", "Vivre en Espagne"
🇩🇪 **Allemagne :** "Français à Berlin", "Expats Munich", "French in Germany"
🇬🇧 **UK :** "Français de Londres", "French in London", "Expats UK"
🇺🇸 **USA :** "Français aux USA", "NYC Expats", "French in California"
🇦🇪 **Dubai :** "Français à Dubai", "Dubai Expats", "French in UAE"
🇵🇹 **Portugal :** "Français au Portugal", "Lisbon Expats", "Vivre au Portugal"
🇹🇭 **Thaïlande :** "Français en Thaïlande", "Bangkok Expats", "Retraités en Thaïlande"

**Types de groupes à chercher :**
- "Français à [ville/pays]"
- "Expatriés [pays]"
- "[Nationalité] in [pays]"
- "Aide administrative [pays]"
- "Vivre à [ville/pays]"
- "S'installer en [pays]"

**🎯 Astuce pro :**
Rejoins des groupes dans TA langue ! Si tu parles espagnol, va dans des groupes hispanophones. Tu seras plus à l'aise pour converser.

**Les questions typiques que tu vas voir :**
- "Quelqu'un connaît un avocat pas cher ?"
- "J'ai un problème avec mon visa, help !"
- "Mon employeur refuse de me payer, je fais quoi ?"
- "Problème avec mon proprio, des conseils ?"`,
        contentTranslations: {
          en: `Facebook is THE spot for expats. They're all there!

**Groups to join:**
- "French in [city]" (London, Dubai, NYC, Barcelona...)
- "Expats in [country]" (Spain, Germany, USA...)
- "[Nationality] in [country]" (French in Spain, Germans in UK...)
- "Administrative help [country]"
- "Expats [city]"

**How to search:**
1. Type in the Facebook search bar
2. Filter by "Groups"
3. Join those with 1000+ members
4. Introduce yourself if asked (just your first name and situation)

**🎯 Pro tip:**
Join groups in YOUR language! If you speak Spanish, go to Spanish-speaking groups. You'll be more comfortable chatting.

**Typical questions you'll see:**
- "Does anyone know an affordable lawyer?"
- "I have a visa problem, help!"
- "My employer refuses to pay me, what do I do?"
- "Problem with my landlord, any advice?"`,
        },
      },
      {
        order: 2,
        type: "text",
        title: "WhatsApp & Telegram 📱",
        titleTranslations: { en: "WhatsApp & Telegram 📱" },
        content: `Les groupes WhatsApp d'expatriés, c'est de la dynamite ! 💥

**Pourquoi c'est top :**
- Messages lus à 90% (vs 10% sur Facebook)
- Ambiance plus intime, plus de confiance
- Les gens demandent souvent des conseils
- Réponses plus rapides

**Comment trouver ces groupes :**
- Demande dans les groupes Facebook : "Y'a un groupe WhatsApp ?"
- Cherche sur Google : "groupe whatsapp expatriés [pays]"
- Les gens partagent souvent des liens d'invitation dans les forums

**Exemples de groupes WhatsApp/Telegram :**
- "Français [ville] WhatsApp"
- "Entraide expats [pays]"
- "Nouveaux arrivants [ville]"
- "Communauté française [pays]"

**⚠️ ATTENTION - Règle absolue sur WhatsApp :**
- Ne spam JAMAIS (tu te feras virer direct ET banni de SOS-Expat)
- Attends de voir le ton du groupe avant de participer
- Commence par aider sans rien demander en retour
- Respecte notre charte : bienveillance toujours !

**Telegram** fonctionne pareil :
- Groupes plus gros possibles
- Cherche "expats [pays]" dans la recherche Telegram
- Même approche : observe, engage, aide, partage`,
        contentTranslations: {
          en: `Expat WhatsApp groups are dynamite! 💥

**Why it's great:**
- 90% of messages are read (vs 10% on Facebook)
- More intimate atmosphere, more trust
- People often ask for advice
- Faster responses

**How to find these groups:**
- Ask in Facebook groups: "Is there a WhatsApp group?"
- Search on Google: "whatsapp group expats [country]"
- People often share invitation links

**⚠️ Warning on WhatsApp:**
- NEVER spam (you'll get kicked out immediately)
- Wait to see the group's tone before participating
- Start by helping without asking for anything in return

**Telegram** works the same:
- Larger groups possible
- Search "expats [country]" in Telegram search
- Same approach: observe, engage, help, share`,
        },
      },
      {
        order: 3,
        type: "text",
        title: "Forums et Reddit 🌐",
        titleTranslations: { en: "Forums and Reddit 🌐" },
        content: `Les forums, c'est old school mais ça marche toujours !

**Forums d'expatriés :**
- **Expat.com** - LE forum de référence (par pays)
- **InterNations** - Communauté mondiale d'expats
- **EasyExpat** - Forums par destination
- **Expatriation.com** - Conseils et témoignages

**Forums voyage & long séjour :**
- **Routard.com** - Section "Expatriation"
- **Lonely Planet** - Forums par pays
- **VoyageForum** - Discussions voyage long terme
- **TripAdvisor** - Forums communautaires

**Forums spécialisés :**
- **Retraite à l'étranger** - Pour les retraités expatriés
- **PVT/WHV** - Working Holiday Visa
- **Forums fiscalité internationale**
- **Forums immobilier à l'étranger**

**Reddit :**
- r/expats, r/IWantOut
- r/[pays] (r/spain, r/germany, r/france...)
- r/immigration, r/legaladvice

**Sur les forums :**
- Les gens posent des questions détaillées
- Tu peux faire des réponses plus longues
- Ton lien peut rester visible longtemps
- ⚠️ Respecte les règles de chaque forum !

**Cherche ces mots-clés :**
- "problème visa", "help visa"
- "avocat expatrié", "conseil juridique"
- "problème propriétaire", "landlord issue"
- "litige employeur", "contrat travail"`,
        contentTranslations: {
          en: `Forums are old school but still work!

**Reddit:**
- r/expats
- r/IWantOut
- r/[country] (r/spain, r/germany, r/france...)
- r/[city] (r/barcelona, r/berlin...)
- r/immigration
- r/legaladvice (for the US)

**Classic forums:**
- Expat.com (forum by country)
- InterNations
- Local forums for each country

**On forums:**
- People ask detailed questions
- You can give longer answers
- Your link can stay visible for a long time
- Watch out for each forum's rules!

**🎯 Reddit tip:**
Earn karma first by participating normally. A brand new account posting links = suspicious.

**Search for these keywords:**
- "help" + "visa"
- "need advice" + "legal"
- "problem" + "landlord"
- "what to do" + "employer"`,
        },
      },
      {
        order: 4,
        type: "text",
        title: "Organisation de ta journée 📅",
        titleTranslations: { en: "Organizing your day 📅" },
        content: `Pour être efficace sans y passer ta vie :

**🌅 Le matin (15-20 min) :**
1. Ouvre tes 3-4 groupes Facebook principaux
2. Scroll les nouveaux posts de la nuit
3. Repère 2-3 personnes à aider
4. Engage les premières conversations

**🌙 Le soir (15-20 min) :**
1. Vérifie les réponses à tes messages
2. Continue les conversations en cours
3. Place tes liens quand c'est le moment
4. Scroll pour trouver de nouvelles opportunités

**📊 Objectifs réalistes :**
- 2-3 nouvelles conversations par jour
- 1-2 liens placés par jour
- ~30 min total par jour maximum

**🎯 Pro tips :**
- Active les notifications pour tes groupes préférés
- Utilise Facebook sur mobile pour répondre vite
- Note les groupes où tu as le plus de succès
- Qualité > Quantité : mieux vaut 2 bonnes conversations que 10 spam

**C'est pas un job à plein temps, c'est un side hustle ! 💪**`,
        contentTranslations: {
          en: `To be effective without spending your whole life on it:

**🌅 Morning (15-20 min):**
1. Open your 3-4 main Facebook groups
2. Scroll through overnight posts
3. Spot 2-3 people to help
4. Start the first conversations

**🌙 Evening (15-20 min):**
1. Check replies to your messages
2. Continue ongoing conversations
3. Place your links when it's time
4. Scroll to find new opportunities

**📊 Realistic goals:**
- 2-3 new conversations per day
- 1-2 links placed per day
- ~30 min total per day maximum

**🎯 Pro tips:**
- Turn on notifications for your favorite groups
- Use Facebook on mobile to respond quickly
- Note which groups you have the most success in
- Quality > Quantity: 2 good conversations better than 10 spam

**It's not a full-time job, it's a side hustle! 💪**`,
        },
      },
    ],
    quizQuestions: [
      {
        id: "m3_q1",
        question: "Quel est le meilleur endroit pour trouver des expatriés à aider ? 🔍",
        questionTranslations: { en: "What's the best place to find expats to help? 🔍" },
        options: [
          { id: "a", text: "Les sites de rencontres 💕", textTranslations: { en: "Dating sites 💕" } },
          { id: "b", text: "Les groupes Facebook, WhatsApp et forums d'expatriés 🎯", textTranslations: { en: "Facebook groups, WhatsApp and expat forums 🎯" } },
          { id: "c", text: "Les commentaires YouTube", textTranslations: { en: "YouTube comments" } },
          { id: "d", text: "Les jeux vidéo en ligne", textTranslations: { en: "Online video games" } },
        ],
        correctAnswerId: "b",
        explanation: "Les groupes d'expatriés sur Facebook, WhatsApp et les forums = ton terrain de jeu ! C'est là que les gens posent leurs questions 🎯",
        explanationTranslations: { en: "Expat groups on Facebook, WhatsApp and forums = your playground! That's where people ask their questions 🎯" },
      },
      {
        id: "m3_q2",
        question: "Combien de temps par jour pour être un bon Chatter ? ⏰",
        questionTranslations: { en: "How much time per day to be a good Chatter? ⏰" },
        options: [
          { id: "a", text: "8 heures non-stop", textTranslations: { en: "8 hours non-stop" } },
          { id: "b", text: "30 minutes max, matin et soir 👌", textTranslations: { en: "30 minutes max, morning and evening 👌" } },
          { id: "c", text: "Seulement 2 minutes par semaine", textTranslations: { en: "Only 2 minutes per week" } },
          { id: "d", text: "Toute la nuit", textTranslations: { en: "All night" } },
        ],
        correctAnswerId: "b",
        explanation: "~30 minutes par jour suffisent ! Un peu le matin, un peu le soir. C'est un side hustle, pas un job 😎",
        explanationTranslations: { en: "~30 minutes per day is enough! A bit in the morning, a bit in the evening. It's a side hustle, not a job 😎" },
      },
    ],
  },

  // ============================================================================
  // MODULE 4: Devenir un pro du Chatter 🏆
  // ============================================================================
  {
    order: 4,
    title: "Devenir un pro du Chatter 🏆",
    titleTranslations: {
      en: "Becoming a Chatter Pro 🏆",
      es: "Convertirse en un Chatter profesional 🏆",
    },
    description: "Les techniques avancées pour maximiser tes conversions. Level up ! 📈",
    descriptionTranslations: {
      en: "Advanced techniques to maximize your conversions. Level up! 📈",
    },
    category: "best_practices",
    coverImageUrl: "https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=800",
    estimatedMinutes: 4,
    isRequired: false,
    prerequisites: [],
    status: "published",
    passingScore: 70,
    slides: [
      {
        order: 1,
        type: "text",
        title: "Les erreurs qui tuent tes conversions ⚠️",
        titleTranslations: { en: "Mistakes that kill your conversions ⚠️" },
        content: `Apprends des erreurs des autres (c'est moins douloureux 😅)

# ⚠️ Ces erreurs = BAN DÉFINITIF de SOS-Expat !

**🚫 Erreur #1 : Le robot**
Copier-coller le même message à tout le monde.
→ Les gens voient que c'est automatique = 0 confiance = BAN.

**🚫 Erreur #2 : Le pressé**
Placer son lien dès le premier message.
→ Tu passes pour un spammeur = ignored/bloqué = BAN.

**🚫 Erreur #3 : L'insistant**
"Tu as regardé mon lien ?" "Et alors ?" "Tu vas essayer ?"
→ C'est du forcing = violation de la charte = BAN.

**🚫 Erreur #4 : Le menteur**
"C'est gratuit !" "C'est le meilleur avocat du monde !"
→ Quand ils découvrent la vérité = signalement = BAN.

**🚫 Erreur #5 : Le harceleur**
Envoyer des MP non sollicités ou relancer plusieurs fois.
→ Harcèlement = violation grave de la charte = BAN IMMÉDIAT.

**❌ Erreur #6 : L'absent**
Tu réponds 3 jours après leur message.
→ Ils ont déjà trouvé une solution ailleurs (pas grave, mais pas de conversion).

**La vraie stratégie : être humain, sincère, bienveillant et réactif ! 💯**`,
        contentTranslations: {
          en: `Learn from others' mistakes (it's less painful 😅)

**❌ Mistake #1: The robot**
Copy-pasting the same message to everyone.
→ People see it's automated = 0 trust.

**❌ Mistake #2: The rusher**
Placing your link in the first message.
→ You look like a spammer = ignored/blocked.

**❌ Mistake #3: The pushy one**
"Did you check my link?" "So?" "Are you going to try?"
→ You scare people away = bad reputation.

**❌ Mistake #4: The liar**
"It's free!" "It's the best lawyer in the world!"
→ When they find out the truth = 0 conversion.

**❌ Mistake #5: The absent one**
You reply 3 days after their message.
→ They've already found a solution elsewhere.

**The real strategy: be human, sincere and responsive! 💯**`,
        },
      },
      {
        order: 2,
        type: "text",
        title: "Les techniques qui convertissent 🎯",
        titleTranslations: { en: "Techniques that convert 🎯" },
        content: `Ce que font les Chatters qui réussissent :

**🎯 Technique #1 : L'empathie d'abord**
Avant de proposer quoi que ce soit, montre que tu comprends :
> "Je suis passé par là aussi, c'est vraiment frustrant..."

**🎯 Technique #2 : La question ouverte**
Au lieu de donner une solution direct, pose des questions :
> "Tu as déjà essayé de contacter X ?"
Ça montre que tu t'intéresses vraiment.

**🎯 Technique #3 : Le conseil gratuit**
Donne un vrai conseil utile AVANT de parler de SOS-Expat :
> "En général dans ces cas-là, le mieux c'est de garder toutes les preuves écrites..."

**🎯 Technique #4 : L'expérience personnelle**
Raconte (vraiment ou de façon plausible) ta propre expérience :
> "Moi j'avais eu un problème similaire et j'ai trouvé ce service..."

**🎯 Technique #5 : Le soft CTA**
Ne dis pas "CLIQUE ICI !!!" mais plutôt :
> "Si jamais ça peut t'aider, y'a ça : [lien] 😊"

**Pense AIDE d'abord, conversion ensuite !** 💡`,
        contentTranslations: {
          en: `What successful Chatters do:

**🎯 Technique #1: Empathy first**
Before suggesting anything, show you understand:
> "I've been there too, it's really frustrating..."

**🎯 Technique #2: Open questions**
Instead of giving a direct solution, ask questions:
> "Have you already tried contacting X?"
This shows you really care.

**🎯 Technique #3: Free advice**
Give real useful advice BEFORE mentioning SOS-Expat:
> "Generally in these cases, the best thing is to keep all written evidence..."

**🎯 Technique #4: Personal experience**
Tell (really or plausibly) your own experience:
> "I had a similar problem and I found this service..."

**🎯 Technique #5: Soft CTA**
Don't say "CLICK HERE!!!" but rather:
> "If it can help, there's this: [link] 😊"

**Think HELP first, conversion second!** 💡`,
        },
      },
      {
        order: 3,
        type: "text",
        title: "Suivre tes résultats 📊",
        titleTranslations: { en: "Track your results 📊" },
        content: `Pour t'améliorer, tu dois mesurer !

**Dans ton dashboard Chatter, tu vois :**
- 📈 Nombre de clics sur ton lien
- 👥 Nombre d'inscrits via ton lien
- 💰 Commissions gagnées
- 📅 Historique jour par jour

**Analyse tes stats :**
- Quel groupe te rapporte le plus ?
- Quel type de conversation convertit le mieux ?
- À quelle heure les gens répondent le plus ?

**Optimise en fonction :**
- Double down sur ce qui marche
- Abandonne les groupes qui ne convertissent pas
- Adapte ton timing

**🎯 KPIs à suivre :**
- Taux de réponse (combien répondent à ton premier message)
- Taux de conversion (combien cliquent sur ton lien)
- Revenus par conversation

**Un bon Chatter analyse et s'adapte ! 🧠**`,
        contentTranslations: {
          en: `To improve, you need to measure!

**In your Chatter dashboard, you see:**
- 📈 Number of clicks on your link
- 👥 Number of sign-ups via your link
- 💰 Commissions earned
- 📅 Day by day history

**Analyze your stats:**
- Which group brings you the most?
- What type of conversation converts best?
- What time do people respond the most?

**Optimize accordingly:**
- Double down on what works
- Abandon groups that don't convert
- Adapt your timing

**🎯 KPIs to track:**
- Response rate (how many respond to your first message)
- Conversion rate (how many click your link)
- Revenue per conversation

**A good Chatter analyzes and adapts! 🧠**`,
        },
      },
      {
        order: 4,
        type: "text",
        title: "Le bonus : recruter des avocats 💼",
        titleTranslations: { en: "The bonus: recruiting lawyers 💼" },
        content: `En plus d'aider les expatriés, tu peux recruter des providers !

**Tu peux recruter 2 types de personnes :**

**👨‍⚖️ Les AVOCATS :**
- Tout avocat en exercice
- Ils gagnent ~30€/30$ par appel de 20 min
- Argument : "Des clients expatriés sans prospection !"

**🌍 Les EXPATRIÉS AIDANTS :**
- Tout expatrié peut devenir aidant !
- Ils gagnent ~10€/10$ par appel de 30 min
- Argument : "Aide d'autres expats et gagne de l'argent !"

**Comment ça marche pour toi :**
1. Tu recrutes quelqu'un avec ton code
2. Pendant **6 mois**, tu touches **$5 par appel** qu'il reçoit !

**Où les trouver :**
- LinkedIn (avocats immigration/droit international)
- Groupes d'expatriés (pour les expats aidants)
- Ton réseau personnel

**Le calcul qui fait rêver :**
- 1 provider actif = ~20 appels/mois
- 20 × $5 = **$100/mois**
- × 6 mois = **$600** pour UN recrutement ! 🤯

**C'est le passive income ultime ! 💤💰**`,
        contentTranslations: {
          en: `In addition to helping expats, you can recruit lawyers!

**How it works:**
1. You know a lawyer (or find one on LinkedIn)
2. You tell them about SOS-Expat
3. They sign up with your code
4. For 6 months, you get **$5 per call** they receive!

**The pitch for lawyers:**
> "Want expat clients without prospecting effort? There's a platform where they come directly to you..."

**Where to find lawyers:**
- LinkedIn ("immigration lawyer")
- Your personal network
- Lawyers mentioned in expat groups

**The dream calculation:**
- 1 lawyer = ~20 calls/month
- 20 × $5 = **$100/month**
- × 6 months = **$600** for ONE recruitment! 🤯

**It's the ultimate passive income! 💤💰**`,
        },
      },
    ],
    quizQuestions: [
      {
        id: "m4_q1",
        question: "C'est quoi la pire erreur d'un Chatter ? (= BAN DÉFINITIF) 😬",
        questionTranslations: { en: "What's the worst mistake for a Chatter? (= PERMANENT BAN) 😬" },
        options: [
          { id: "a", text: "Poser des questions pour comprendre le problème", textTranslations: { en: "Asking questions to understand the problem" } },
          { id: "b", text: "Spammer, copier-coller ou forcer la main 🚫", textTranslations: { en: "Spamming, copy-pasting or forcing 🚫" } },
          { id: "c", text: "Donner des conseils gratuits avant de parler de SOS-Expat", textTranslations: { en: "Giving free advice before mentioning SOS-Expat" } },
          { id: "d", text: "Être patient et bienveillant", textTranslations: { en: "Being patient and caring" } },
        ],
        correctAnswerId: "b",
        explanation: "Spam, copier-coller, forcing = violation de la charte = BAN DÉFINITIF ! Sois humain, aide d'abord, puis partage naturellement 🙌",
        explanationTranslations: { en: "Spam, copy-paste, forcing = charter violation = PERMANENT BAN! Be human, help first, then share naturally 🙌" },
      },
      {
        id: "m4_q2",
        question: "Combien tu gagnes par appel si tu recrutes un avocat ? 💼",
        questionTranslations: { en: "How much do you earn per call if you recruit a lawyer? 💼" },
        options: [
          { id: "a", text: "$1", textTranslations: { en: "$1" } },
          { id: "b", text: "$5 pendant 6 mois ! 🎉", textTranslations: { en: "$5 for 6 months! 🎉" } },
          { id: "c", text: "$50", textTranslations: { en: "$50" } },
          { id: "d", text: "Rien du tout", textTranslations: { en: "Nothing at all" } },
        ],
        correctAnswerId: "b",
        explanation: "$5 par appel pendant 6 mois ! Un avocat actif = revenu passif garanti 💰",
        explanationTranslations: { en: "$5 per call for 6 months! An active lawyer = guaranteed passive income 💰" },
      },
    ],
  },

  // ============================================================================
  // MODULE 5: Ta checklist de lancement 🚀
  // ============================================================================
  {
    order: 5,
    title: "Ta checklist de lancement 🚀",
    titleTranslations: {
      en: "Your Launch Checklist 🚀",
      es: "Tu lista de verificación de lanzamiento 🚀",
    },
    description: "Tout ce que tu dois faire pour démarrer. Prêt ? Go ! 🏁",
    descriptionTranslations: {
      en: "Everything you need to do to get started. Ready? Go! 🏁",
    },
    category: "best_practices",
    coverImageUrl: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800",
    estimatedMinutes: 3,
    isRequired: false,
    prerequisites: [],
    status: "published",
    passingScore: 70,
    slides: [
      {
        order: 1,
        type: "text",
        title: "Avant de commencer ✅",
        titleTranslations: { en: "Before you start ✅" },
        content: `Vérifie que tu as tout !

**📱 Ton setup :**
□ Ton compte Chatter est actif
□ Tu as copié ton lien d'affiliation
□ Tu as l'app Facebook sur ton téléphone
□ Les notifications sont activées

**🧠 Tu as compris :**
□ Ton rôle : aider naturellement, pas spammer
□ La règle des 2-3 échanges avant le lien
□ L'importance de l'empathie
□ Comment adapter ton ton au support

**🎯 Tes objectifs de départ :**
□ Rejoindre 5 groupes d'expatriés cette semaine
□ Engager 3 conversations par jour
□ Placer 1-2 liens par jour (après les échanges !)
□ Atteindre ta première commission ! 🎉

**Tu es prêt(e) !** Let's go 🚀`,
        contentTranslations: {
          en: `Check you have everything!

**📱 Your setup:**
□ Your Chatter account is active
□ You've copied your affiliate link
□ You have the Facebook app on your phone
□ Notifications are on

**🧠 You understand:**
□ Your role: help naturally, don't spam
□ The 2-3 exchanges rule before the link
□ The importance of empathy
□ How to adapt your tone to the platform

**🎯 Your starting goals:**
□ Join 5 expat groups this week
□ Start 3 conversations per day
□ Place 1-2 links per day (after exchanges!)
□ Get your first commission! 🎉

**You're ready!** Let's go 🚀`,
        },
      },
      {
        order: 2,
        type: "text",
        title: "Ta première semaine 📅",
        titleTranslations: { en: "Your first week 📅" },
        content: `Plan d'action pour ta première semaine :

**📆 Jour 1-2 : Préparation**
- Rejoins 5-10 groupes Facebook d'expatriés
- Observe comment les gens parlent
- Note les questions fréquentes
- Ne poste RIEN encore !

**📆 Jour 3-4 : Premiers pas**
- Réponds à 2-3 questions sans lien
- Fais-toi connaître comme quelqu'un d'utile
- Gagne la confiance du groupe

**📆 Jour 5-6 : Premières conversations complètes**
- Identifie 2-3 personnes à aider
- Engage les conversations (Échange 1)
- Continue les échanges (Échange 2)
- Place tes premiers liens (Échange 3)

**📆 Jour 7 : Analyse**
- Regarde tes stats dans le dashboard
- Qu'est-ce qui a marché ?
- Qu'est-ce que tu peux améliorer ?

**Patience + Régularité = Résultats ! 📈**`,
        contentTranslations: {
          en: `Action plan for your first week:

**📆 Day 1-2: Preparation**
- Join 5-10 expat Facebook groups
- Observe how people talk
- Note frequent questions
- Don't post ANYTHING yet!

**📆 Day 3-4: First steps**
- Answer 2-3 questions without a link
- Make yourself known as someone helpful
- Earn the group's trust

**📆 Day 5-6: First complete conversations**
- Identify 2-3 people to help
- Start conversations (Exchange 1)
- Continue exchanges (Exchange 2)
- Place your first links (Exchange 3)

**📆 Day 7: Analysis**
- Check your stats in the dashboard
- What worked?
- What can you improve?

**Patience + Consistency = Results! 📈**`,
        },
      },
      {
        order: 3,
        type: "text",
        title: "Rappel des règles d'or 👑",
        titleTranslations: { en: "Golden rules reminder 👑" },
        content: `Grave ça dans ta mémoire :

# ⚠️ RAPPEL IMPORTANT ⚠️
**Spam, forcing, non-respect de la charte = BAN DÉFINITIF**
On veut des Chatters bienveillants, pas des spammeurs !

**🥇 Règle #1 : Aide d'abord**
Tu n'es pas un vendeur. Tu es quelqu'un qui aide et qui connaît un bon plan.

**🥈 Règle #2 : 2-3 échanges minimum**
JAMAIS de lien au premier message. Toujours après avoir engagé une vraie conversation.

**🥉 Règle #3 : Zero forcing**
Si quelqu'un n'est pas intéressé → "Pas de souci, bonne chance !" et tu passes à autre chose. JAMAIS insister.

**🏅 Règle #4 : Sois humain**
Pas de copier-coller. Chaque conversation est unique. Adapte-toi à la personne et au support.

**🏅 Règle #5 : Reste authentique**
Ne mens pas, n'exagère pas. La confiance est la clé de tout.

**📌 Le processus parfait :**
> Observer → Repérer → Engager → Échanger (2-3x) → Aider → Partager le lien

**Tu vas cartonner ! 🚀**

Maintenant, va aider des gens et gagne de l'argent ! 💪💰`,
        contentTranslations: {
          en: `Engrave this in your memory:

**🥇 Rule #1: Help first**
You're not a salesperson. You're someone who helps and knows a good deal.

**🥈 Rule #2: 2-3 exchanges minimum**
NEVER a link in the first message. Always after engaging in a real conversation.

**🥉 Rule #3: Zero forcing**
If someone isn't interested → "No worries, good luck!" and move on.

**🏅 Rule #4: Be human**
No copy-pasting. Each conversation is unique. Adapt.

**🏅 Rule #5: Stay authentic**
Don't lie, don't exaggerate. Trust is key.

**📌 In summary:**
> Observe → Spot → Engage → Exchange → Help → Share

**You're going to crush it! 🚀**

Now go help people and make money! 💪💰`,
        },
      },
    ],
    quizQuestions: [
      {
        id: "m5_q1",
        question: "Dans quel ordre tu dois faire les choses ? 📋",
        questionTranslations: { en: "In what order should you do things? 📋" },
        options: [
          { id: "a", text: "Lien → Conversation → Aide", textTranslations: { en: "Link → Conversation → Help" } },
          { id: "b", text: "Spam → Insister → Forcer", textTranslations: { en: "Spam → Insist → Force" } },
          { id: "c", text: "Observer → Engager → Échanger → Aider → Partager le lien ✅", textTranslations: { en: "Observe → Engage → Exchange → Help → Share link ✅" } },
          { id: "d", text: "Ignorer → Attendre → Espérer", textTranslations: { en: "Ignore → Wait → Hope" } },
        ],
        correctAnswerId: "c",
        explanation: "C'est ça ! Observer, engager, échanger, aider, et ENSUITE partager. Dans cet ordre ! 🎯",
        explanationTranslations: { en: "That's it! Observe, engage, exchange, help, and THEN share. In that order! 🎯" },
      },
      {
        id: "m5_q2",
        question: "Tu es prêt(e) à devenir un super Chatter ? 🦸",
        questionTranslations: { en: "Are you ready to become a super Chatter? 🦸" },
        options: [
          { id: "a", text: "Euh... je sais pas", textTranslations: { en: "Uh... I don't know" } },
          { id: "b", text: "Non, c'est trop dur", textTranslations: { en: "No, it's too hard" } },
          { id: "c", text: "OUI ! LET'S GO ! 🚀🔥", textTranslations: { en: "YES! LET'S GO! 🚀🔥" } },
          { id: "d", text: "Peut-être demain", textTranslations: { en: "Maybe tomorrow" } },
        ],
        correctAnswerId: "c",
        explanation: "YESSSS ! T'as tout compris, t'es motivé(e), maintenant GO faire des $$$ ! 💪🎉",
        explanationTranslations: { en: "YESSSS! You got it all, you're motivated, now GO make $$$! 💪🎉" },
      },
    ],
  },

  // ============================================================================
  // MODULE 6: Devenir Capitaine — Recruter efficacement 🎯
  // ============================================================================
  {
    order: 6,
    title: "Devenir Capitaine : Recruter efficacement 🎯",
    titleTranslations: {
      en: "Becoming a Captain: Recruiting Effectively 🎯",
    },
    description: "Apprends à trouver, convaincre et recruter les meilleurs chatters pour ton équipe !",
    descriptionTranslations: {
      en: "Learn how to find, convince and recruit the best chatters for your team!",
    },
    category: "recruitment",
    coverImageUrl: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800",
    estimatedMinutes: 5,
    isRequired: false,
    prerequisites: [],
    status: "published",
    passingScore: 70,
    slides: [
      {
        order: 1,
        type: "text",
        title: "Pourquoi recruter ? 🤔",
        titleTranslations: { en: "Why recruit? 🤔" },
        content: `En tant que Capitaine, ta mission #1 c'est **construire une équipe solide** !

**Pourquoi c'est si important :**

💰 **Revenus passifs** — Tu gagnes $3 par appel avocat et $2 par appel expatrié de TOUTE ton équipe
📈 **Effet boule de neige** — Plus ton équipe grandit, plus tes gains augmentent sans effort
🏆 **Bonus paliers** — 20 appels = Bronze, 50 = Argent, 100 = Or... jusqu'à Diamant !
⭐ **Bonus qualité** — Atteins 10 recrues actives + $100 de commissions mensuelles = bonus mensuel !

**Le calcul magique :**
- 10 recrues actives × 5 appels/mois chacune = 50 appels
- 50 appels × $2-3 = **$100-150/mois de revenu passif** 💪

**C'est LE levier qui fait la différence !**`,
        contentTranslations: {
          en: `As a Captain, your #1 mission is to **build a solid team**!

**Why it matters:**

💰 **Passive income** — You earn $3 per lawyer call and $2 per expat call from your ENTIRE team
📈 **Snowball effect** — The bigger your team, the more you earn effortlessly
🏆 **Tier bonuses** — 20 calls = Bronze, 50 = Silver, 100 = Gold... up to Diamond!
⭐ **Quality bonus** — Reach 10 active recruits + $100 monthly commissions = monthly bonus!

**The magic math:**
- 10 active recruits × 5 calls/month each = 50 calls
- 50 calls × $2-3 = **$100-150/month passive income** 💪

**This is THE lever that makes the difference!**`,
        },
      },
      {
        order: 2,
        type: "text",
        title: "Où trouver des recrues ? 🔍",
        titleTranslations: { en: "Where to find recruits? 🔍" },
        content: `Les meilleurs chatters sont partout autour de toi !

**🌍 Réseaux sociaux :**
- Groupes Facebook d'expatriés, voyageurs, vacanciers (il y en a des centaines !)
- Forums Reddit r/expats, r/iwantout, r/travel, r/solotravel
- Groupes WhatsApp/Telegram de communautés expat et voyage
- LinkedIn — profils intéressés par le freelance/remote work
- Instagram/TikTok — commente les posts voyage et expatriation

**📢 Annonces et offres d'emploi :**
- Sites de petites annonces (Leboncoin, Craigslist, Gumtree...)
- Sites d'offres d'emploi freelance (Indeed, Fiverr, Upwork — section "remote")
- Forums de discussion (forums expat, forums voyage, forums par pays)
- Groupes Facebook "jobs remote" / "travail à domicile" / "complément de revenu"

**👥 Ton réseau personnel (le plus efficace !) :**
- Parle à tes amis, ta famille, tes connaissances — le bouche à oreille est roi !
- Collègues qui cherchent un revenu complémentaire
- Étudiants en langues, droit ou tourisme
- Anciens camarades de classe, voisins, contacts de sport...

**💡 Le profil idéal :**
- Quelqu'un qui parle bien (empathique, à l'écoute)
- Actif sur les réseaux sociaux ou à l'aise en ligne
- Motivé par un revenu complémentaire
- Pas besoin d'expérience — on les forme !

**Astuce pro** : Les meilleurs recruteurs partagent leur propre histoire de succès et parlent à TOUT LE MONDE 📖`,
        contentTranslations: {
          en: `The best chatters are everywhere around you!

**🌍 Social media:**
- Facebook groups for expats, travelers, vacationers (hundreds of them!)
- Reddit forums r/expats, r/iwantout, r/travel, r/solotravel
- WhatsApp/Telegram expat and travel community groups
- LinkedIn — profiles interested in freelance/remote work
- Instagram/TikTok — comment on travel and expatriation posts

**📢 Ads and job boards:**
- Classified ad sites (Craigslist, Gumtree, local equivalents...)
- Freelance job sites (Indeed, Fiverr, Upwork — "remote" section)
- Discussion forums (expat forums, travel forums, country-specific forums)
- Facebook groups "remote jobs" / "work from home" / "side income"

**👥 Your personal network (most effective!):**
- Talk to friends, family, acquaintances — word of mouth is king!
- Colleagues looking for side income
- Language, law or tourism students
- Old classmates, neighbors, sports contacts...

**💡 The ideal profile:**
- Someone who communicates well (empathetic, good listener)
- Active on social media or comfortable online
- Motivated by side income
- No experience needed — we train them!

**Pro tip**: The best recruiters share their own success story and talk to EVERYONE 📖`,
        },
      },
      {
        order: 3,
        type: "text",
        title: "Les arguments qui marchent 🎤",
        titleTranslations: { en: "Arguments that work 🎤" },
        content: `Voici les phrases qui convertissent le mieux :

**🔥 L'argument liberté :**
> "Tu peux gagner de l'argent depuis ton canapé, en aidant des gens. Pas de patron, pas d'horaires."

**💰 L'argument concret :**
> "J'ai gagné $X le mois dernier juste en discutant sur les réseaux. Tu veux que je t'explique ?"

**❤️ L'argument impact :**
> "Tu connais des expatriés ou des voyageurs qui galèrent ? Il y a un moyen de les aider ET d'être rémunéré."

**⚡ L'argument simplicité :**
> "C'est gratuit, ça prend 2 min de s'inscrire, et tu as une formation complète. Zéro risque."

**📊 L'argument preuve :**
Partage une capture d'écran de tes gains (floutée si tu veux) — rien de plus convaincant !`,
        contentTranslations: {
          en: `Here are the phrases that convert best:

**🔥 The freedom argument:**
> "You can earn money from your couch, helping people. No boss, no schedule."

**💰 The concrete argument:**
> "I earned $X last month just chatting on social media. Want me to explain?"

**❤️ The impact argument:**
> "Know expats or travelers who are struggling? There's a way to help them AND get paid."

**⚡ The simplicity argument:**
> "It's free, takes 2 min to sign up, and you get full training. Zero risk."

**📊 The proof argument:**
Share a screenshot of your earnings (blurred if you want) — nothing more convincing!`,
        },
      },
      {
        order: 4,
        type: "text",
        title: "Les erreurs à éviter 🚫",
        titleTranslations: { en: "Mistakes to avoid 🚫" },
        content: `Ce qui fait fuir les recrues potentielles :

❌ **Spammer** — N'envoie pas le même message à 50 personnes. Personnalise !
❌ **Promettre la lune** — "Tu vas gagner $10K/mois" → Sois réaliste, ça construit la confiance
❌ **Forcer** — Si quelqu'un dit non, respecte. Il reviendra peut-être plus tard
❌ **Négliger le suivi** — Recruter c'est bien, accompagner c'est MIEUX
❌ **Recruter n'importe qui** — Quelqu'un de pas motivé = perte de temps pour tout le monde

✅ **À la place, fais ça :**
- Cible les personnes qui ont déjà un intérêt (groupes expat, voyage, freelance)
- Explique honnêtement les gains réalistes
- Propose d'aider personnellement les premiers jours
- Partage ta propre expérience authentique`,
        contentTranslations: {
          en: `What scares away potential recruits:

❌ **Spamming** — Don't send the same message to 50 people. Personalize!
❌ **Overpromising** — "You'll earn $10K/month" → Be realistic, it builds trust
❌ **Forcing** — If someone says no, respect it. They may come back later
❌ **Neglecting follow-up** — Recruiting is good, supporting is BETTER
❌ **Recruiting anyone** — Someone unmotivated = waste of time for everyone

✅ **Instead, do this:**
- Target people who already have interest (expat groups, travel groups, freelance)
- Honestly explain realistic earnings
- Offer to personally help in the first days
- Share your own authentic experience`,
        },
      },
      {
        order: 5,
        type: "text",
        title: "Scripts prêts à copier-coller 📋✂️",
        titleTranslations: { en: "Ready-to-copy scripts 📋✂️" },
        content: `Copie et personnalise ces messages ! Remplace [TON_PRÉNOM] et [TON_LIEN].

**📱 WhatsApp / Telegram — Message personnel :**

"Salut [PRÉNOM] ! 😊 J'ai trouvé un truc sympa que je voulais te partager. C'est une plateforme qui aide les expatriés, voyageurs et vacanciers à trouver un avocat ou un aidant en 5 min par téléphone. Le truc c'est qu'on peut gagner de l'argent en les aidant à nous trouver — moi je gagne déjà [TON_MONTANT] par mois juste en discutant sur les réseaux. C'est gratuit, pas de boss, tu gères comme tu veux. Tu veux que je t'explique ? 😊"

**📘 Facebook — Post dans un groupe :**

"🌍 Tu connais des expatriés, voyageurs ou vacanciers qui ont besoin d'aide ? SOS-Expat rémunère des ambassadeurs (chatters) pour aider ces personnes à trouver de l'aide juridique ou pratique. Pas besoin d'expérience, formation gratuite incluse. Tu choisis tes horaires et tu gagnes à chaque appel généré. DM moi si ça t'intéresse ! 💬"

**💼 LinkedIn — Message ciblé :**

"Bonjour [PRÉNOM], j'ai vu que tu étais [expat / voyageur / intéressé par le remote work]. Je fais partie d'un programme d'ambassadeurs chez SOS-Expat. On aide les expatriés, voyageurs et vacanciers et on est rémunéré à la performance. Si tu cherches un complément de revenu flexible, je serais ravi de t'en dire plus."

**⚡ Relance douce (J+3 sans réponse) :**

"Hey [PRÉNOM] ! Juste un petit coucou — je voulais savoir si tu avais eu le temps de regarder ce dont je t'ai parlé ? Pas de pression hein, mais si tu as des questions je suis là ! 😊"`,
        contentTranslations: {
          en: `Copy and personalize these messages! Replace [YOUR_NAME] and [YOUR_LINK].

**📱 WhatsApp / Telegram — Personal message:**

"Hey [NAME]! 😊 I found something cool I wanted to share. It's a platform that helps expats, travelers and vacationers find a lawyer or helper in 5 min by phone. The thing is, you can earn money by helping people find us — I'm already earning [YOUR_AMOUNT] per month just chatting on social media. It's free, no boss, you work whenever you want. Want me to explain? 😊"

**📘 Facebook — Post in a group:**

"🌍 Know expats, travelers or vacationers who need help? SOS-Expat pays ambassadors (chatters) to help these people find legal or practical assistance. No experience needed, free training included. You choose your hours and earn for each call generated. DM me if interested! 💬"

**💼 LinkedIn — Targeted message:**

"Hi [NAME], I saw you were [an expat / traveler / interested in remote work]. I'm part of an ambassador program at SOS-Expat. We help expats, travelers and vacationers and get paid per performance. If you're looking for flexible side income, I'd love to tell you more."

**⚡ Gentle follow-up (Day 3, no reply):**

"Hey [NAME]! Just a quick check-in — did you have a chance to look at what I mentioned? No pressure at all, but if you have questions I'm here! 😊"`,
        },
      },
    ],
    quizQuestions: [
      {
        id: "m6_q1",
        question: "Quel est l'argument le plus efficace pour recruter ? 🎯",
        questionTranslations: { en: "What's the most effective argument for recruiting? 🎯" },
        options: [
          { id: "a", text: "\"Tu vas devenir millionnaire !\"", textTranslations: { en: "\"You'll become a millionaire!\"" } },
          { id: "b", text: "Partager ton expérience réelle et des gains concrets", textTranslations: { en: "Share your real experience and concrete earnings" } },
          { id: "c", text: "Spammer les groupes avec ton lien", textTranslations: { en: "Spam groups with your link" } },
          { id: "d", text: "Mentir sur les montants", textTranslations: { en: "Lie about the amounts" } },
        ],
        correctAnswerId: "b",
        explanation: "L'authenticité gagne toujours ! Partage tes vrais résultats et ton histoire — c'est ce qui convainc le plus 🙌",
        explanationTranslations: { en: "Authenticity always wins! Share your real results and story — that's what convinces the most 🙌" },
      },
      {
        id: "m6_q2",
        question: "Combien gagnes-tu par appel avocat de ton équipe en tant que Capitaine ? 💰",
        questionTranslations: { en: "How much do you earn per lawyer call from your team as Captain? 💰" },
        options: [
          { id: "a", text: "$1", textTranslations: { en: "$1" } },
          { id: "b", text: "$3 🎉", textTranslations: { en: "$3 🎉" } },
          { id: "c", text: "$10", textTranslations: { en: "$10" } },
          { id: "d", text: "$0.50", textTranslations: { en: "$0.50" } },
        ],
        correctAnswerId: "b",
        explanation: "$3 par appel avocat ! Et $2 par appel expatrié. Avec 10 recrues actives, ça monte vite ! 🚀",
        explanationTranslations: { en: "$3 per lawyer call! And $2 per expat call. With 10 active recruits, it adds up fast! 🚀" },
      },
    ],
  },

  // ============================================================================
  // MODULE 7: Capitaine — Onboarder et former vos recrues 🎓
  // ============================================================================
  {
    order: 7,
    title: "Capitaine : Onboarder et former vos recrues 🎓",
    titleTranslations: {
      en: "Captain: Onboarding and Training Your Recruits 🎓",
    },
    description: "Les premiers jours sont critiques ! Apprends à bien accueillir et former tes nouvelles recrues.",
    descriptionTranslations: {
      en: "The first days are critical! Learn how to properly welcome and train your new recruits.",
    },
    category: "best_practices",
    coverImageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800",
    estimatedMinutes: 5,
    isRequired: false,
    prerequisites: [],
    status: "published",
    passingScore: 70,
    slides: [
      {
        order: 1,
        type: "text",
        title: "Les premiers jours sont critiques ⚡",
        titleTranslations: { en: "The first days are critical ⚡" },
        content: `**80% des abandons** se produisent dans les 7 premiers jours !

**Pourquoi ?**
- La recrue ne sait pas par où commencer
- Elle n'a pas de résultats rapides → perd la motivation
- Elle se sent seule face à ses questions

**Ton rôle de Capitaine :**
Tu es leur **mentor**. Les premiers jours, sois ULTRA disponible !

**L'objectif des 7 premiers jours :**
1. ✅ Inscription terminée
2. ✅ Formation modules 1-5 complétée
3. ✅ Premier message posté dans un groupe
4. ✅ Premier client référé (même si pas d'appel)
5. ✅ Telegram lié pour les notifications

**Une recrue qui fait son premier $$$ dans la première semaine → reste pour toujours ! 💎**`,
        contentTranslations: {
          en: `**80% of dropouts** happen in the first 7 days!

**Why?**
- The recruit doesn't know where to start
- No quick results → loses motivation
- Feels alone with their questions

**Your role as Captain:**
You're their **mentor**. In the first days, be ULTRA available!

**The 7-day goal:**
1. ✅ Registration completed
2. ✅ Training modules 1-5 completed
3. ✅ First message posted in a group
4. ✅ First client referred (even if no call)
5. ✅ Telegram linked for notifications

**A recruit who makes their first $$$ in the first week → stays forever! 💎**`,
        },
      },
      {
        order: 2,
        type: "text",
        title: "Checklist d'onboarding 📋",
        titleTranslations: { en: "Onboarding checklist 📋" },
        content: `Dès qu'une recrue s'inscrit, suis cette checklist :

**📱 Jour 1 — Accueil :**
- Envoie un message de bienvenue personnalisé
- Propose un appel rapide (5 min) pour te présenter
- Explique les 3 étapes : Formation → Pratique → Gains
- Partage 1-2 tips concrets pour démarrer

**📚 Jours 2-3 — Formation :**
- Vérifie qu'il/elle a commencé les modules
- Réponds à ses questions en temps réel
- Partage des exemples de messages qui marchent

**🚀 Jours 4-7 — Lancement :**
- Encourage à poster dans 2-3 groupes
- Aide à formuler ses premiers messages
- Célèbre chaque petit succès ("Bravo, ton 1er clic !")
- Si pas d'activité → relance gentiment

**🔄 Semaine 2+ — Suivi :**
- Check hebdo rapide : "Comment ça va ?"
- Partage les succès de l'équipe pour motiver
- Propose des astuces personnalisées`,
        contentTranslations: {
          en: `As soon as a recruit signs up, follow this checklist:

**📱 Day 1 — Welcome:**
- Send a personalized welcome message
- Offer a quick call (5 min) to introduce yourself
- Explain the 3 steps: Training → Practice → Earnings
- Share 1-2 concrete tips to get started

**📚 Days 2-3 — Training:**
- Check they've started the modules
- Answer their questions in real time
- Share examples of messages that work

**🚀 Days 4-7 — Launch:**
- Encourage posting in 2-3 groups
- Help formulate first messages
- Celebrate every small win ("Congrats, your 1st click!")
- If no activity → gently follow up

**🔄 Week 2+ — Follow-up:**
- Quick weekly check: "How's it going?"
- Share team successes to motivate
- Offer personalized tips`,
        },
      },
      {
        order: 3,
        type: "text",
        title: "Aider tes recrues à performer 📈",
        titleTranslations: { en: "Help your recruits perform 📈" },
        content: `Les capitaines qui réussissent font ces choses :

**💬 Communication régulière :**
- Crée un groupe WhatsApp/Telegram pour ton équipe
- Partage un "tip du jour" chaque matin
- Mets en avant les succès de chacun

**📊 Suivi des performances :**
- Consulte ton dashboard capitaine régulièrement
- Identifie qui est actif et qui ne l'est pas
- Contacte les inactifs après 3 jours de silence

**🎯 Fixe des objectifs :**
- "Cette semaine, on vise 5 appels en équipe !"
- Petits objectifs = victoires fréquentes = motivation !

**🏆 Crée de la compétition saine :**
- "Qui fera le plus de clics cette semaine ?"
- Petit défi entre recrues (bienveillant !)

**❤️ Sois humain avant tout :**
- Félicite en public, corrige en privé
- Comprends les situations personnelles
- Un capitaine bienveillant → équipe fidèle`,
        contentTranslations: {
          en: `Successful captains do these things:

**💬 Regular communication:**
- Create a WhatsApp/Telegram group for your team
- Share a "tip of the day" every morning
- Highlight everyone's successes

**📊 Performance tracking:**
- Check your captain dashboard regularly
- Identify who's active and who's not
- Contact inactive members after 3 days of silence

**🎯 Set goals:**
- "This week, we're aiming for 5 team calls!"
- Small goals = frequent wins = motivation!

**🏆 Create healthy competition:**
- "Who'll get the most clicks this week?"
- Friendly challenges between recruits!

**❤️ Be human above all:**
- Praise publicly, correct privately
- Understand personal situations
- A caring captain → loyal team`,
        },
      },
      {
        order: 4,
        type: "text",
        title: "Lire le dashboard capitaine 📊",
        titleTranslations: { en: "Reading the captain dashboard 📊" },
        content: `Ton dashboard capitaine est ton **outil #1** pour gérer ton équipe !

**📌 Ce que tu y trouves :**

**🎯 Jauge des appels équipe :**
- Nombre total d'appels ce mois
- Progression vers le prochain palier (Bronze → Argent → Or → Platine → Diamant)
- Plus d'appels = plus gros bonus mensuel !

**👥 Liste des recrues N1 :**
- Chaque recrue avec son nombre d'appels et ses gains totaux
- Identifie qui performe et qui a besoin d'aide

**👥👥 Liste des recrues N2 :**
- Les recrues de tes recrues — l'effet réseau !
- Tu gagnes aussi sur leurs appels

**💰 Commissions :**
- Historique détaillé de tous tes gains capitaine
- Distinction appels / bonus palier / bonus qualité

**⭐ Bonus qualité :**
- Barre de progression vers les critères
- 10 recrues actives + $100 commissions = bonus mensuel !

**Consulte-le au moins 1 fois par jour ! 👀**`,
        contentTranslations: {
          en: `Your captain dashboard is your **#1 tool** for managing your team!

**📌 What you'll find:**

**🎯 Team calls gauge:**
- Total calls this month
- Progress to next tier (Bronze → Silver → Gold → Platinum → Diamond)
- More calls = bigger monthly bonus!

**👥 N1 recruits list:**
- Each recruit with their call count and total earnings
- Identify who's performing and who needs help

**👥👥 N2 recruits list:**
- Your recruits' recruits — the network effect!
- You earn from their calls too

**💰 Commissions:**
- Detailed history of all your captain earnings
- Distinction between calls / tier bonus / quality bonus

**⭐ Quality bonus:**
- Progress bar toward criteria
- 10 active recruits + $100 commissions = monthly bonus!

**Check it at least once a day! 👀**`,
        },
      },
      {
        order: 5,
        type: "text",
        title: "Messages d'onboarding prêts à envoyer 📲",
        titleTranslations: { en: "Ready-to-send onboarding messages 📲" },
        content: `Copie ces messages et envoie-les à chaque nouvelle recrue ! Remplace [PRÉNOM].

**🎉 Jour 1 — Bienvenue :**

"Bienvenue dans l'équipe [PRÉNOM] ! 🎉 Je suis ton capitaine et je suis là pour t'aider à réussir. Voici les 3 étapes pour bien démarrer :
1️⃣ Complète les modules de formation (onglet Formation)
2️⃣ Lie ton Telegram pour recevoir les notifications 💰
3️⃣ Poste ton premier message dans un groupe expat/voyage
Des questions ? Je suis dispo ! 😊"

**📚 Jour 2 — Suivi formation :**

"Hey [PRÉNOM] ! Tu as pu avancer sur les modules de formation ? 📚 Les modules 1 à 3 sont les plus importants pour bien comprendre le fonctionnement. Si tu bloques sur quoi que ce soit, n'hésite pas ! Je suis passé par là aussi 😄"

**🚀 Jour 4 — Premier message :**

"[PRÉNOM] ! C'est le moment de passer à l'action 💪 Rejoins 2-3 groupes Facebook ou WhatsApp d'expatriés ou de voyageurs et poste un premier message. Pas besoin d'un truc parfait — l'important c'est de commencer ! Voici un exemple :
'Expatriés, voyageurs, besoin d'aide juridique ou pratique ? SOS-Expat vous met en relation avec un avocat ou un aidant en 5 min par téléphone 📞 [TON_LIEN]'
Montre-moi ton message quand c'est fait, je te donnerai des tips ! 🎯"

**⚠️ Jour 7 — Relance si inactif :**

"Hey [PRÉNOM], ça fait quelques jours que j'ai pas de nouvelles ! 😊 Tout va bien ? Si tu as des doutes ou des questions, on peut en parler. Beaucoup de chatters ont mis quelques jours avant de se lancer et maintenant ils gagnent régulièrement. Je suis là pour t'aider ! 💪"

**🏆 Après le 1er appel — Célébration :**

"[PRÉNOM] !!! 🎉🎉🎉 Tu as généré ton premier appel ! C'est ÉNORME — beaucoup s'arrêtent avant. Tu fais partie des meilleurs ! Le prochain sera encore plus facile, tu verras 💰🚀"`,
        contentTranslations: {
          en: `Copy these messages and send them to every new recruit! Replace [NAME].

**🎉 Day 1 — Welcome:**

"Welcome to the team [NAME]! 🎉 I'm your captain and I'm here to help you succeed. Here are the 3 steps to get started:
1️⃣ Complete the training modules (Training tab)
2️⃣ Link your Telegram for notifications 💰
3️⃣ Post your first message in an expat/travel group
Questions? I'm available! 😊"

**📚 Day 2 — Training follow-up:**

"Hey [NAME]! Were you able to work on the training modules? 📚 Modules 1 to 3 are the most important to understand how things work. If you get stuck on anything, don't hesitate! I went through it too 😄"

**🚀 Day 4 — First message:**

"[NAME]! Time to take action 💪 Join 2-3 Facebook or WhatsApp expat or travel groups and post a first message. Doesn't need to be perfect — just start! Here's an example:
'Expats, travelers, need legal or practical help? SOS-Expat connects you with a lawyer or helper in 5 min by phone 📞 [YOUR_LINK]'
Show me your message when done, I'll give you tips! 🎯"

**⚠️ Day 7 — Follow-up if inactive:**

"Hey [NAME], haven't heard from you in a few days! 😊 Everything okay? If you have doubts or questions, let's talk. Many chatters took a few days before getting started and now they earn regularly. I'm here to help! 💪"

**🏆 After 1st call — Celebration:**

"[NAME]!!! 🎉🎉🎉 You generated your first call! That's HUGE — many stop before that. You're one of the best! The next one will be even easier, you'll see 💰🚀"`,
        },
      },
    ],
    quizQuestions: [
      {
        id: "m7_q1",
        question: "Quand se produisent 80% des abandons de recrues ? ⏰",
        questionTranslations: { en: "When do 80% of recruit dropouts happen? ⏰" },
        options: [
          { id: "a", text: "Après 1 mois", textTranslations: { en: "After 1 month" } },
          { id: "b", text: "Dans les 7 premiers jours !", textTranslations: { en: "In the first 7 days!" } },
          { id: "c", text: "Après 3 mois", textTranslations: { en: "After 3 months" } },
          { id: "d", text: "Jamais, personne n'abandonne", textTranslations: { en: "Never, nobody quits" } },
        ],
        correctAnswerId: "b",
        explanation: "Les 7 premiers jours sont CRITIQUES ! C'est pour ça que ton rôle de mentor est si important au début 🎯",
        explanationTranslations: { en: "The first 7 days are CRITICAL! That's why your mentor role is so important at the start 🎯" },
      },
      {
        id: "m7_q2",
        question: "Quelle est la meilleure chose à faire quand une recrue s'inscrit ? 🤝",
        questionTranslations: { en: "What's the best thing to do when a recruit signs up? 🤝" },
        options: [
          { id: "a", text: "Attendre qu'elle se débrouille seule", textTranslations: { en: "Wait for them to figure it out alone" } },
          { id: "b", text: "Envoyer un message de bienvenue et proposer un appel rapide", textTranslations: { en: "Send a welcome message and offer a quick call" } },
          { id: "c", text: "Lui envoyer 10 messages d'affilée", textTranslations: { en: "Send them 10 messages in a row" } },
          { id: "d", text: "Ne rien faire", textTranslations: { en: "Do nothing" } },
        ],
        correctAnswerId: "b",
        explanation: "Un accueil chaleureux + un appel rapide = la recrue se sent soutenue et démarre bien ! 🚀",
        explanationTranslations: { en: "A warm welcome + a quick call = the recruit feels supported and starts well! 🚀" },
      },
    ],
  },

  // ============================================================================
  // MODULE 8: Capitaine — Motiver et faire grandir votre équipe 🌟
  // ============================================================================
  {
    order: 8,
    title: "Capitaine : Motiver et faire grandir votre équipe 🌟",
    titleTranslations: {
      en: "Captain: Motivating and Growing Your Team 🌟",
    },
    description: "Deviens un leader inspirant ! Techniques de motivation et gestion d'équipe au quotidien.",
    descriptionTranslations: {
      en: "Become an inspiring leader! Motivation techniques and daily team management.",
    },
    category: "best_practices",
    coverImageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800",
    estimatedMinutes: 5,
    isRequired: false,
    prerequisites: [],
    status: "published",
    passingScore: 70,
    slides: [
      {
        order: 1,
        type: "text",
        title: "La motivation au quotidien 🔥",
        titleTranslations: { en: "Daily motivation 🔥" },
        content: `Un capitaine qui motive = une équipe qui performe !

**🌅 Routine quotidienne du Capitaine :**

**Le matin :**
- Message d'encouragement dans le groupe ("Allez l'équipe, on attaque ! 💪")
- Partage un objectif du jour ("Objectif : 3 appels aujourd'hui !")

**En journée :**
- Réponds aux questions rapidement
- Partage les bonnes nouvelles ("Marie vient de faire son 1er appel ! 🎉")
- Envoie un tip pratique

**Le soir :**
- Récap de la journée ("Super journée ! 4 appels générés 🎯")
- Remercie ceux qui ont été actifs

**💡 Les 3 piliers de la motivation :**
1. **Reconnaissance** — Félicite CHAQUE succès, même petit
2. **Progression** — Montre les chiffres qui montent
3. **Communauté** — L'équipe, c'est une famille !`,
        contentTranslations: {
          en: `A captain who motivates = a team that performs!

**🌅 Captain's daily routine:**

**Morning:**
- Encouragement message in the group ("Let's go team! 💪")
- Share a daily goal ("Goal: 3 calls today!")

**During the day:**
- Answer questions quickly
- Share good news ("Marie just made her 1st call! 🎉")
- Send a practical tip

**Evening:**
- Day recap ("Great day! 4 calls generated 🎯")
- Thank those who were active

**💡 The 3 pillars of motivation:**
1. **Recognition** — Celebrate EVERY success, even small ones
2. **Progress** — Show the rising numbers
3. **Community** — The team is a family!`,
        },
      },
      {
        order: 2,
        type: "text",
        title: "Techniques de motivation avancées 🧠",
        titleTranslations: { en: "Advanced motivation techniques 🧠" },
        content: `Passe au niveau supérieur avec ces techniques :

**🎯 Micro-objectifs :**
- "Qui fait 2 clics aujourd'hui ?" plutôt que "Faites plus de ventes"
- Petit = atteignable = satisfaction = motivation pour la suite !

**🏅 Système de reconnaissance :**
- "Chatter de la semaine" dans le groupe
- Mentionne les progrès individuels publiquement
- Envoie un message privé pour les gros succès

**📈 Partage les chiffres :**
- "L'équipe a généré 23 appels ce mois ! On vise 30 !"
- Les gens aiment voir les progrès collectifs

**🎮 Gamification :**
- Crée des défis hebdomadaires ("Défi : 3 nouveaux groupes rejoints")
- Petits classements entre recrues (bienveillant !)

**💬 Les messages qui motivent :**
- "Tu es à 2 appels du prochain palier !" (urgence positive)
- "Regarde tes gains ce mois vs le mois dernier !" (progression)
- "On est 3ème au classement, on peut être 1er !" (esprit d'équipe)`,
        contentTranslations: {
          en: `Level up with these techniques:

**🎯 Micro-goals:**
- "Who gets 2 clicks today?" rather than "Make more sales"
- Small = achievable = satisfaction = motivation for what's next!

**🏅 Recognition system:**
- "Chatter of the week" in the group
- Mention individual progress publicly
- Send a private message for big successes

**📈 Share the numbers:**
- "The team generated 23 calls this month! Let's aim for 30!"
- People love seeing collective progress

**🎮 Gamification:**
- Create weekly challenges ("Challenge: 3 new groups joined")
- Friendly rankings between recruits!

**💬 Messages that motivate:**
- "You're 2 calls away from the next tier!" (positive urgency)
- "Look at your earnings this month vs last month!" (progress)
- "We're 3rd in the ranking, we can be 1st!" (team spirit)`,
        },
      },
      {
        order: 3,
        type: "text",
        title: "Détecter et résoudre les problèmes 🔧",
        titleTranslations: { en: "Detecting and solving problems 🔧" },
        content: `Un bon capitaine voit les problèmes AVANT qu'ils n'explosent !

**🚨 Signaux d'alerte :**

**⚠️ Recrue inactive (0 activité depuis 3+ jours) :**
→ Message privé : "Hey ! Tout va bien ? Je suis là si tu as des questions 😊"
→ Propose un appel rapide pour remotiver

**⚠️ Recrue frustrée (se plaint de pas de résultats) :**
→ Analyse : où poste-t-elle ? Quels messages ? Quels groupes ?
→ Propose des ajustements concrets
→ Rappelle que les premiers résultats prennent 1-2 semaines

**⚠️ Recrue qui veut abandonner :**
→ Écoute d'abord (ne juge pas !)
→ Rappelle les succès passés, même petits
→ Propose un objectif ultra-simple pour relancer

**⚠️ Conflit dans l'équipe :**
→ Médiation privée, jamais en public
→ Rappelle les règles de bienveillance

**La règle d'or : Ne laisse JAMAIS une recrue sans réponse pendant plus de 24h !**`,
        contentTranslations: {
          en: `A good captain spots problems BEFORE they explode!

**🚨 Warning signs:**

**⚠️ Inactive recruit (0 activity for 3+ days):**
→ Private message: "Hey! Everything okay? I'm here if you have questions 😊"
→ Offer a quick call to re-motivate

**⚠️ Frustrated recruit (complaining about no results):**
→ Analyze: where do they post? What messages? Which groups?
→ Suggest concrete adjustments
→ Remind that first results take 1-2 weeks

**⚠️ Recruit wanting to quit:**
→ Listen first (don't judge!)
→ Remind of past successes, even small ones
→ Suggest an ultra-simple goal to restart

**⚠️ Team conflict:**
→ Private mediation, never public
→ Remind of kindness rules

**Golden rule: NEVER leave a recruit without a response for more than 24h!**`,
        },
      },
      {
        order: 4,
        type: "text",
        title: "Viser les paliers ensemble 🏆",
        titleTranslations: { en: "Reaching tiers together 🏆" },
        content: `Les paliers sont la clé pour des **bonus massifs** !

**🎯 Rappel des paliers :**
- 🥉 **Bronze** (20 appels) — Bonus mensuel garanti
- 🥈 **Argent** (50 appels) — Bonus ×2
- 🥇 **Or** (100 appels) — Bonus ×4
- 💎 **Platine** (200 appels) — Bonus ×8
- 👑 **Diamant** (400 appels) — Bonus maximum !

**Comment atteindre les paliers :**

**Stratégie "10×5" :**
- 10 recrues actives × 5 appels/mois = 50 appels = **Palier Argent** !
- C'est très atteignable avec un bon suivi

**Stratégie d'accélération :**
- Recrute 2-3 nouvelles personnes par semaine
- Aide les recrues existantes à augmenter leurs appels
- Les N2 comptent aussi ! Encourage tes N1 à recruter

**Le bonus qualité en plus :**
- 10 recrues actives + $100 commissions = bonus qualité mensuel
- C'est le combo gagnant : palier + qualité = revenus maximums ! 🤑

**Partagez le tableau de progression dans le groupe chaque semaine !**`,
        contentTranslations: {
          en: `Tiers are the key to **massive bonuses**!

**🎯 Tier reminder:**
- 🥉 **Bronze** (20 calls) — Guaranteed monthly bonus
- 🥈 **Silver** (50 calls) — Bonus ×2
- 🥇 **Gold** (100 calls) — Bonus ×4
- 💎 **Platinum** (200 calls) — Bonus ×8
- 👑 **Diamond** (400 calls) — Maximum bonus!

**How to reach tiers:**

**"10×5" strategy:**
- 10 active recruits × 5 calls/month = 50 calls = **Silver Tier**!
- Very achievable with good follow-up

**Acceleration strategy:**
- Recruit 2-3 new people per week
- Help existing recruits increase their calls
- N2s count too! Encourage your N1s to recruit

**Quality bonus on top:**
- 10 active recruits + $100 commissions = monthly quality bonus
- The winning combo: tier + quality = maximum earnings! 🤑

**Share the progression board in the group every week!**`,
        },
      },
    ],
    quizQuestions: [
      {
        id: "m8_q1",
        question: "Quelle est la meilleure façon de motiver une recrue inactive ? 💬",
        questionTranslations: { en: "What's the best way to motivate an inactive recruit? 💬" },
        options: [
          { id: "a", text: "L'ignorer — elle reviendra toute seule", textTranslations: { en: "Ignore them — they'll come back on their own" } },
          { id: "b", text: "Lui envoyer un message bienveillant et proposer de l'aide", textTranslations: { en: "Send a caring message and offer help" } },
          { id: "c", text: "La critiquer publiquement dans le groupe", textTranslations: { en: "Publicly criticize them in the group" } },
          { id: "d", text: "La supprimer de l'équipe", textTranslations: { en: "Remove them from the team" } },
        ],
        correctAnswerId: "b",
        explanation: "Un message bienveillant + une offre d'aide = la meilleure façon de remotiver ! La bienveillance, toujours 💛",
        explanationTranslations: { en: "A caring message + offer of help = the best way to re-motivate! Kindness, always 💛" },
      },
      {
        id: "m8_q2",
        question: "Combien de recrues actives + combien de commissions pour le bonus qualité ? ⭐",
        questionTranslations: { en: "How many active recruits + how much in commissions for the quality bonus? ⭐" },
        options: [
          { id: "a", text: "5 recrues + $50", textTranslations: { en: "5 recruits + $50" } },
          { id: "b", text: "10 recrues + $100 🎯", textTranslations: { en: "10 recruits + $100 🎯" } },
          { id: "c", text: "20 recrues + $500", textTranslations: { en: "20 recruits + $500" } },
          { id: "d", text: "100 recrues + $1000", textTranslations: { en: "100 recruits + $1000" } },
        ],
        correctAnswerId: "b",
        explanation: "10 recrues actives + $100 de commissions mensuelles = tu es qualifié pour le bonus qualité mensuel ! 🏆",
        explanationTranslations: { en: "10 active recruits + $100 monthly commissions = you qualify for the monthly quality bonus! 🏆" },
      },
    ],
  },
];

/**
 * Seed function to populate training modules
 */
export async function seedChatterTrainingModules(
  createdBy: string
): Promise<{ success: boolean; modulesCreated: number; errors: string[] }> {
  const db = getFirestore();
  const errors: string[] = [];
  let modulesCreated = 0;

  for (const moduleData of CHATTER_TRAINING_MODULES) {
    try {
      // Check if module with same title already exists
      const existingQuery = await db
        .collection("chatter_training_modules")
        .where("title", "==", moduleData.title)
        .limit(1)
        .get();

      if (!existingQuery.empty) {
        console.log(`Module "${moduleData.title}" already exists, skipping...`);
        continue;
      }

      // Create new module
      const moduleRef = db.collection("chatter_training_modules").doc();
      const module: ChatterTrainingModule = {
        id: moduleRef.id,
        ...moduleData,
        slides: moduleData.slides.map((slide, index) => ({
          id: `slide_${index + 1}`,
          ...slide,
        })),
        quizQuestions: moduleData.quizQuestions.map((q, index) => ({
          order: index + 1,
          ...q,
        })),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy,
      };

      await moduleRef.set(module);
      modulesCreated++;
      console.log(`Created module: ${moduleData.title}`);
    } catch (error) {
      const errorMsg = `Failed to create module "${moduleData.title}": ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return {
    success: errors.length === 0,
    modulesCreated,
    errors,
  };
}
