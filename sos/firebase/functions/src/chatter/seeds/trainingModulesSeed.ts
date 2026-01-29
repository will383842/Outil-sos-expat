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
# 💵 $10 par appel

**Si tu recrutes un avocat ou expatrié aidant :**
# 💵 $5 par appel qu'il reçoit (pendant 6 mois !)

**Info bonus - Ce que gagnent les providers :**
- Avocat : ~30€ / 30$ par appel de 20 min
- Expatrié aidant : ~10€ / 10$ par appel de 30 min

→ C'est intéressant pour eux aussi, donc facile à recruter !

**Exemple concret :**
- Tu aides 3 personnes cette semaine
- 2 finissent par appeler
- **Tu gagnes $20** 🎉

**En un mois actif :**
- ~10-15 conversations par semaine
- ~5-8 conversions
- **$50-80/mois** sans te prendre la tête !

Et plus tu deviens bon dans l'art de la conversation, plus tes stats montent ! 📈`,
        contentTranslations: {
          en: `Let's talk money! 🤑

**For each person you help who calls a lawyer:**
# 💵 $10

**If you recruit a lawyer to the platform:**
# 💵 $5 per call they receive (for 6 months!)

**Real example:**
- You help 3 people this week
- 2 end up calling a lawyer
- **You earn $20** 🎉

**In an active month:**
- ~10-15 conversations per week
- ~5-8 conversions
- **$50-80/month** without stressing!

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
